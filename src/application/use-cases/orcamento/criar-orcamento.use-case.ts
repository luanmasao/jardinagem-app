import { OrcamentoRepository, CriarOrcamentoDados } from '../../../domain/repositories/orcamento.repository.interface';
import { ClienteRepository } from '../../../domain/repositories/cliente.repository.interface';
import { Orcamento } from '../../../domain/entities/orcamento';
import { validarDadosOrcamento } from '../../validation/orcamento.validator';
import { RegraNegocioError } from '../../../domain/errors/dominio-error';

export type CriarOrcamentoInput = CriarOrcamentoDados;

/**
 * Caso de uso: Criar novo orçamento.
 * Inicializa em status RASCUNHO com valores zerados e associa a um cliente do próprio usuário.
 */
export class CriarOrcamentoUseCase {
  constructor(
    private readonly orcamentoRepository: OrcamentoRepository,
    private readonly clienteRepository: ClienteRepository
  ) {}

  async execute(input: CriarOrcamentoInput): Promise<Orcamento> {
    if (!input.usuarioId || input.usuarioId.trim() === '') {
      throw new RegraNegocioError('Usuário não autenticado.');
    }

    validarDadosOrcamento({
      clienteId: input.clienteId,
      numero: input.numero,
      dataValidade: input.dataValidade,
      tipoDesconto: input.tipoDesconto,
      valorDesconto: input.valorDesconto,
    });

    // Validação de pertinência do cliente ao mesmo usuário (multi-tenant)
    const cliente = await this.clienteRepository.buscarPorId(input.clienteId);
    if (!cliente || cliente.usuarioId !== input.usuarioId) {
      throw new RegraNegocioError('O cliente informado não existe ou não pertence ao usuário.');
    }

    return this.orcamentoRepository.criar({
      usuarioId: input.usuarioId,
      clienteId: input.clienteId,
      numero: input.numero,
      dataValidade: input.dataValidade,
      tipoDesconto: input.tipoDesconto,
      valorDesconto: input.valorDesconto,
      observacoes: input.observacoes,
      condicoesPagamento: input.condicoesPagamento,
    });
  }
}
