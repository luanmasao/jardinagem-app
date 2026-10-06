import * as Crypto from 'expo-crypto';
import { OrcamentoRepository } from '../../../domain/repositories/orcamento.repository.interface';
import { ItemOrcamentoRepository } from '../../../domain/repositories/item-orcamento.repository.interface';
import { ServicoRepository } from '../../../domain/repositories/servico.repository.interface';
import { ProdutoRepository } from '../../../domain/repositories/produto.repository.interface';
import { ItemOrcamento } from '../../../domain/entities/item-orcamento';
import { TipoItem } from '../../../domain/enums/tipo-item';
import { validarDadosItemOrcamento } from '../../validation/item-orcamento.validator';
import { RegraNegocioError } from '../../../domain/errors/dominio-error';

export interface AdicionarItemOrcamentoInput {
  usuarioId: string;
  orcamentoId: string;
  tipo: TipoItem;
  servicoId?: string | null;
  produtoId?: string | null;
  quantidade?: number;
}

/**
 * Caso de uso: Adicionar item ao orçamento (RN25, RN27, RN28, RN29, RN30).
 * Captura o snapshot histórico de catálogo e calcula subtotal e total.
 * Garante que alterações futuras no catálogo não afetem o item existente.
 */
export class AdicionarItemOrcamentoUseCase {
  constructor(
    private readonly orcamentoRepository: OrcamentoRepository,
    private readonly itemOrcamentoRepository: ItemOrcamentoRepository,
    private readonly servicoRepository: ServicoRepository,
    private readonly produtoRepository: ProdutoRepository
  ) {}

  async execute(input: AdicionarItemOrcamentoInput): Promise<ItemOrcamento> {
    if (!input.usuarioId || input.usuarioId.trim() === '') {
      throw new RegraNegocioError('Usuário não autenticado.');
    }
    if (!input.orcamentoId || input.orcamentoId.trim() === '') {
      throw new RegraNegocioError('O ID do orçamento é obrigatório.');
    }

    const resultado = await this.orcamentoRepository.buscarPorId(input.orcamentoId);
    if (!resultado) {
      throw new RegraNegocioError('Orçamento não encontrado.');
    }

    if (resultado.orcamento.usuarioId !== input.usuarioId) {
      throw new RegraNegocioError('Orçamento não encontrado ou não pertence ao usuário.');
    }

    const orcamento = resultado.orcamento;

    // RN64 / RN65: Modificações de itens são exclusivas do status RASCUNHO
    if (!orcamento.editavel) {
      throw new RegraNegocioError(
        `Itens não podem ser adicionados a orçamentos no status '${orcamento.status}'. Somente orçamentos em RASCUNHO são editáveis.`
      );
    }

    let item: ItemOrcamento;
    const novoItemId = Crypto.randomUUID();

    if (input.tipo === TipoItem.SERVICO) {
      if (!input.servicoId) {
        throw new RegraNegocioError('O serviço deve ser selecionado para itens do tipo SERVICO.');
      }
      const servico = await this.servicoRepository.buscarPorId(input.servicoId);
      if (!servico || servico.usuarioId !== input.usuarioId) {
        throw new RegraNegocioError('O serviço selecionado não foi encontrado ou não pertence ao usuário.');
      }
      if (!servico.ativo) {
        throw new RegraNegocioError('Não é permitido adicionar serviços inativos do catálogo.');
      }

      // Snapshot a partir de Serviço (RN29: cópia histórica)
      item = ItemOrcamento.criarDeServico(
        novoItemId,
        input.orcamentoId,
        servico,
        input.quantidade ?? 1
      );
    } else if (input.tipo === TipoItem.PRODUTO) {
      if (!input.produtoId) {
        throw new RegraNegocioError('O produto deve ser selecionado para itens do tipo PRODUTO.');
      }
      const produto = await this.produtoRepository.buscarPorId(input.produtoId);
      if (!produto || produto.usuarioId !== input.usuarioId) {
        throw new RegraNegocioError('O produto selecionado não foi encontrado ou não pertence ao usuário.');
      }
      if (!produto.ativo) {
        throw new RegraNegocioError('Não é permitido adicionar produtos inativos do catálogo.');
      }

      // Snapshot a partir de Produto (RN30: cópia histórica)
      item = ItemOrcamento.criarDeProduto(
        novoItemId,
        input.orcamentoId,
        produto,
        input.quantidade ?? 1
      );
    } else {
      throw new RegraNegocioError(`Tipo de item inválido: '${input.tipo}'.`);
    }

    validarDadosItemOrcamento({
      orcamentoId: item.orcamentoId,
      tipo: item.tipo,
      servicoId: item.servicoId,
      produtoId: item.produtoId,
      descricao: item.descricao,
      quantidade: item.quantidade,
      unidade: item.unidade,
      valorUnitario: item.valorUnitario,
      usaMedicaoArea: item.usaMedicaoArea,
    });

    // 1. Persiste o item no banco de dados com snapshot histórico
    const itemPersistido = await this.itemOrcamentoRepository.criar({
      id: item.id,
      orcamentoId: item.orcamentoId,
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

    // 2. Adiciona o item persistido na entidade de domínio para recálculo consistente dos totais
    orcamento.adicionarItem(itemPersistido);

    // 3. Atualiza os totais recalculados do orçamento
    await this.orcamentoRepository.atualizar(orcamento.id, {
      subtotal: orcamento.subtotal,
      total: orcamento.total,
    });

    return itemPersistido;
  }
}
