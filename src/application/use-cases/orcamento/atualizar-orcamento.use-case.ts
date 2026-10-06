import { OrcamentoRepository } from '../../../domain/repositories/orcamento.repository.interface';
import { ClienteRepository } from '../../../domain/repositories/cliente.repository.interface';
import { Orcamento } from '../../../domain/entities/orcamento';
import { TipoDesconto } from '../../../domain/enums/tipo-desconto';
import { validarDadosOrcamento } from '../../validation/orcamento.validator';
import { RegraNegocioError } from '../../../domain/errors/dominio-error';

export interface AtualizarOrcamentoInput {
  id: string;
  usuarioId: string;
  clienteId?: string;
  dataValidade?: Date | null;
  tipoDesconto?: TipoDesconto | null;
  valorDesconto?: number;
  observacoes?: string | null;
  condicoesPagamento?: string | null;
}

/**
 * Caso de uso: Atualizar dados de um orçamento.
 * RN64 / RN65: Bloqueia qualquer edição direta caso o orçamento não esteja em RASCUNHO.
 */
export class AtualizarOrcamentoUseCase {
  constructor(
    private readonly orcamentoRepository: OrcamentoRepository,
    private readonly clienteRepository: ClienteRepository
  ) {}

  async execute(input: AtualizarOrcamentoInput): Promise<Orcamento> {
    if (!input.id || input.id.trim() === '') {
      throw new RegraNegocioError('O ID do orçamento é obrigatório.');
    }
    if (!input.usuarioId || input.usuarioId.trim() === '') {
      throw new RegraNegocioError('Usuário não autenticado.');
    }

    const resultado = await this.orcamentoRepository.buscarPorId(input.id);
    if (!resultado) {
      throw new RegraNegocioError('Orçamento não encontrado.');
    }

    if (resultado.orcamento.usuarioId !== input.usuarioId) {
      throw new RegraNegocioError('Orçamento não encontrado ou não pertence ao usuário.');
    }

    const orcamento = resultado.orcamento;

    // RN64 / RN65: Bloqueio estrito de edição direta fora de RASCUNHO
    if (!orcamento.editavel) {
      throw new RegraNegocioError(
        `Orçamentos no status '${orcamento.status}' não podem ser editados diretamente. Somente orçamentos em RASCUNHO são editáveis.`
      );
    }

    // Se cliente foi alterado, validar
    let novoClienteId = orcamento.clienteId;
    if (input.clienteId && input.clienteId !== orcamento.clienteId) {
      const cliente = await this.clienteRepository.buscarPorId(input.clienteId);
      if (!cliente || cliente.usuarioId !== input.usuarioId) {
        throw new RegraNegocioError('O cliente informado não existe ou não pertence ao usuário.');
      }
      novoClienteId = input.clienteId;
    }

    // Atualização de validade
    if (input.dataValidade !== undefined) {
      orcamento.definirValidade(input.dataValidade);
    }

    // Atualização de observações e condições
    if (input.observacoes !== undefined) {
      orcamento.definirObservacoes(input.observacoes);
    }
    if (input.condicoesPagamento !== undefined) {
      orcamento.definirCondicoesPagamento(input.condicoesPagamento);
    }

    // Atualização de desconto
    if (input.tipoDesconto !== undefined || input.valorDesconto !== undefined) {
      const tipo = input.tipoDesconto !== undefined ? input.tipoDesconto : orcamento.tipoDesconto;
      const valor = input.valorDesconto !== undefined ? input.valorDesconto : orcamento.valorDesconto;
      orcamento.aplicarDesconto(tipo, valor);
    }

    validarDadosOrcamento({
      clienteId: novoClienteId,
      dataValidade: orcamento.dataValidade,
      dataCriacao: orcamento.dataCriacao,
      tipoDesconto: orcamento.tipoDesconto,
      valorDesconto: orcamento.valorDesconto,
      subtotal: orcamento.subtotal,
    });

    return this.orcamentoRepository.atualizar(input.id, {
      clienteId: novoClienteId,
      dataValidade: orcamento.dataValidade,
      tipoDesconto: orcamento.tipoDesconto,
      valorDesconto: orcamento.valorDesconto,
      subtotal: orcamento.subtotal,
      total: orcamento.total,
      observacoes: orcamento.observacoes,
      condicoesPagamento: orcamento.condicoesPagamento,
    });
  }
}
