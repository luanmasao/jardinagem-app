import { OrcamentoRepository, OrcamentoResumo } from '../../../domain/repositories/orcamento.repository.interface';
import { StatusOrcamento } from '../../../domain/enums/status-orcamento';
import { RegraNegocioError } from '../../../domain/errors/dominio-error';

export interface ListarOrcamentosInput {
  usuarioId: string;
  filtroStatus?: StatusOrcamento;
}

/**
 * Caso de uso: Listar orçamentos do usuário autenticado.
 * Suporta filtro opcional por status.
 */
export class ListarOrcamentosUseCase {
  constructor(private readonly orcamentoRepository: OrcamentoRepository) {}

  async execute(input: ListarOrcamentosInput): Promise<OrcamentoResumo[]> {
    if (!input.usuarioId || input.usuarioId.trim() === '') {
      throw new RegraNegocioError('Usuário não autenticado.');
    }

    return this.orcamentoRepository.listar(input.usuarioId, input.filtroStatus);
  }
}
