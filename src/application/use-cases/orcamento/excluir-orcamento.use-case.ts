import { OrcamentoRepository } from '../../../domain/repositories/orcamento.repository.interface';
import { StatusOrcamento } from '../../../domain/enums/status-orcamento';
import { RegraNegocioError } from '../../../domain/errors/dominio-error';

export interface ExcluirOrcamentoInput {
  id: string;
  usuarioId: string;
}

/**
 * Caso de uso: Excluir orçamento fisicamente.
 * Permitido exclusivamente para o status RASCUNHO.
 * Para outros status, o cancelamento ou arquivamento é gerenciado pela máquina de estados.
 */
export class ExcluirOrcamentoUseCase {
  constructor(private readonly orcamentoRepository: OrcamentoRepository) {}

  async execute(input: ExcluirOrcamentoInput): Promise<void> {
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

    if (resultado.orcamento.status !== StatusOrcamento.RASCUNHO) {
      throw new RegraNegocioError(
        `Orçamentos no status '${resultado.orcamento.status}' não podem ser excluídos. Somente propostas em RASCUNHO podem ser excluídas.`
      );
    }

    await this.orcamentoRepository.excluir(input.id);
  }
}
