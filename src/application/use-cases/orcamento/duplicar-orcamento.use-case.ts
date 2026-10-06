import * as Crypto from 'expo-crypto';
import { OrcamentoRepository } from '../../../domain/repositories/orcamento.repository.interface';
import { ItemOrcamentoRepository } from '../../../domain/repositories/item-orcamento.repository.interface';
import { Orcamento } from '../../../domain/entities/orcamento';
import { TipoDesconto } from '../../../domain/enums/tipo-desconto';
import { RegraNegocioError } from '../../../domain/errors/dominio-error';

export interface DuplicarOrcamentoInput {
  id: string;
  usuarioId: string;
  novoNumero?: string;
}

/**
 * Caso de uso: Duplicar orçamento (RN72 a RN77).
 * Cria uma nova proposta comercial independente com status RASCUNHO,
 * preservando dados essenciais e snapshots históricos de itens.
 * O orçamento original permanece completamente inalterado.
 */
export class DuplicarOrcamentoUseCase {
  constructor(
    private readonly orcamentoRepository: OrcamentoRepository,
    private readonly itemOrcamentoRepository: ItemOrcamentoRepository
  ) {}

  async execute(input: DuplicarOrcamentoInput): Promise<Orcamento> {
    if (!input.id || input.id.trim() === '') {
      throw new RegraNegocioError('O ID do orçamento de origem é obrigatório.');
    }
    if (!input.usuarioId || input.usuarioId.trim() === '') {
      throw new RegraNegocioError('Usuário não autenticado.');
    }

    const resultado = await this.orcamentoRepository.buscarPorId(input.id);
    if (!resultado) {
      throw new RegraNegocioError('Orçamento de origem não encontrado.');
    }

    if (resultado.orcamento.usuarioId !== input.usuarioId) {
      throw new RegraNegocioError('Orçamento de origem não pertence ao usuário.');
    }

    const original = resultado.orcamento;
    const novoId = Crypto.randomUUID();
    const novoNumero = input.novoNumero?.trim() || (await this.orcamentoRepository.obterProximoNumero(input.usuarioId));

    // Utiliza o método de domínio homologado para clonar entidades e snapshots
    const orcamentoCopia = original.duplicar(
      novoId,
      novoNumero,
      () => Crypto.randomUUID(),
      () => Crypto.randomUUID(),
      new Date()
    );

    // Se o desconto original for FIXO e positivo, criamos o orçamento inicialmente com desconto neutro,
    // pois a constraint do banco (orcamento_desconto_check) exige subtotal >= valor_desconto quando tipo_desconto = 'FIXO'
    const precisaAdiarDescontoFixo =
      orcamentoCopia.tipoDesconto === TipoDesconto.FIXO && orcamentoCopia.valorDesconto > 0;

    // 1. Persiste o novo orçamento
    const novoOrcamentoCriado = await this.orcamentoRepository.criar({
      usuarioId: input.usuarioId,
      clienteId: orcamentoCopia.clienteId,
      numero: novoNumero,
      dataValidade: null,
      tipoDesconto: precisaAdiarDescontoFixo ? null : orcamentoCopia.tipoDesconto,
      valorDesconto: precisaAdiarDescontoFixo ? 0 : orcamentoCopia.valorDesconto,
      observacoes: orcamentoCopia.observacoes,
      condicoesPagamento: orcamentoCopia.condicoesPagamento,
    });

    // 2. Persiste os snapshots dos itens de forma independente
    for (const item of orcamentoCopia.itens) {
      await this.itemOrcamentoRepository.criar({
        orcamentoId: novoOrcamentoCriado.id,
        tipo: item.tipo,
        servicoId: item.servicoId,
        produtoId: item.produtoId,
        descricao: item.descricao,
        quantidade: item.quantidade,
        unidade: item.unidade,
        valorUnitario: item.valorUnitario,
        valorTotal: item.valorTotal,
        usaMedicaoArea: item.usaMedicaoArea,
      });
    }

    // 3. Atualiza os totais recalculados da cópia e aplica o desconto fixo após a persistência dos itens
    if (precisaAdiarDescontoFixo) {
      if (orcamentoCopia.subtotal >= orcamentoCopia.valorDesconto) {
        await this.orcamentoRepository.atualizar(novoOrcamentoCriado.id, {
          tipoDesconto: orcamentoCopia.tipoDesconto,
          valorDesconto: orcamentoCopia.valorDesconto,
          subtotal: orcamentoCopia.subtotal,
          total: orcamentoCopia.total,
        });
      } else {
        await this.orcamentoRepository.atualizar(novoOrcamentoCriado.id, {
          subtotal: orcamentoCopia.subtotal,
          total: orcamentoCopia.subtotal,
        });
      }
    } else {
      await this.orcamentoRepository.atualizar(novoOrcamentoCriado.id, {
        subtotal: orcamentoCopia.subtotal,
        total: orcamentoCopia.total,
      });
    }

    const copiaPersistida = await this.orcamentoRepository.buscarPorId(novoOrcamentoCriado.id);
    return copiaPersistida ? copiaPersistida.orcamento : orcamentoCopia;
  }
}
