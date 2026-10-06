import { Area } from '../../../domain/entities/area';
import { RegraNegocioError } from '../../../domain/errors/dominio-error';
import { AreaRepository } from '../../../domain/repositories/area.repository.interface';
import { ItemOrcamentoRepository } from '../../../domain/repositories/item-orcamento.repository.interface';
import { OrcamentoRepository } from '../../../domain/repositories/orcamento.repository.interface';

export interface ListarAreasPorItemInput {
  usuarioId: string;
  itemOrcamentoId: string;
}

/**
 * Caso de Uso: ListarAreasPorItemUseCase (GAP-AREA-07).
 *
 * Responsabilidades:
 * - Receber itemOrcamentoId e usuarioId;
 * - Validar acesso e isolamento multi-tenant através da árvore item -> orcamento -> usuario_id;
 * - Retornar áreas ordenadas de maneira determinística (por ID);
 * - Não recalcular metragem de área desnecessariamente.
 */
export class ListarAreasPorItemUseCase {
  constructor(
    private readonly areaRepository: AreaRepository,
    private readonly itemOrcamentoRepository: ItemOrcamentoRepository,
    private readonly orcamentoRepository: OrcamentoRepository
  ) {}

  async execute(input: ListarAreasPorItemInput): Promise<Area[]> {
    if (!input.usuarioId || input.usuarioId.trim() === '') {
      throw new RegraNegocioError('Usuário não autenticado.');
    }
    if (!input.itemOrcamentoId || input.itemOrcamentoId.trim() === '') {
      throw new RegraNegocioError('O ID do item de orçamento é obrigatório.');
    }

    // 1. Validar existência do item
    const item = await this.itemOrcamentoRepository.buscarPorId(input.itemOrcamentoId);
    if (!item) {
      throw new RegraNegocioError('Item de orçamento não encontrado.');
    }

    // 2. Validar que o orçamento pertence ao usuário
    const resultadoOrcamento = await this.orcamentoRepository.buscarPorId(item.orcamentoId);
    if (!resultadoOrcamento || resultadoOrcamento.orcamento.usuarioId !== input.usuarioId) {
      throw new RegraNegocioError('Orçamento associado não encontrado ou não pertence ao usuário.');
    }

    // 3. Buscar áreas através do repositório
    const areas = await this.areaRepository.listarPorItem(input.itemOrcamentoId);

    // 4. Retornar áreas ordenadas deterministicamente por ID (sem recalcular)
    return [...areas].sort((a, b) => a.id.localeCompare(b.id));
  }
}
