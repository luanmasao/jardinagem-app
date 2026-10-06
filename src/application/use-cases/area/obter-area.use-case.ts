import { Area } from '../../../domain/entities/area';
import { RegraNegocioError } from '../../../domain/errors/dominio-error';
import { AreaRepository } from '../../../domain/repositories/area.repository.interface';
import { ItemOrcamentoRepository } from '../../../domain/repositories/item-orcamento.repository.interface';
import { OrcamentoRepository } from '../../../domain/repositories/orcamento.repository.interface';

export interface ObterAreaInput {
  usuarioId: string;
  id: string;
}

/**
 * Caso de Uso: ObterAreaUseCase (GAP-AREA-07).
 *
 * Responsabilidades:
 * - Buscar área específica pelo ID via AreaRepository;
 * - Validar isolamento multi-tenant (área -> item -> orçamento -> usuario_id);
 * - Retornar null caso a área não exista ou pertença a outro usuário;
 * - Não realizar consultas SQL diretamente.
 */
export class ObterAreaUseCase {
  constructor(
    private readonly areaRepository: AreaRepository,
    private readonly itemOrcamentoRepository: ItemOrcamentoRepository,
    private readonly orcamentoRepository: OrcamentoRepository
  ) {}

  async execute(input: ObterAreaInput): Promise<Area | null> {
    if (!input.id || input.id.trim() === '') {
      throw new RegraNegocioError('O ID da área é obrigatório.');
    }
    if (!input.usuarioId || input.usuarioId.trim() === '') {
      throw new RegraNegocioError('Usuário não autenticado.');
    }

    const area = await this.areaRepository.buscarPorId(input.id);
    if (!area) {
      return null;
    }

    // Validar titularidade através da árvore de agregação
    const item = await this.itemOrcamentoRepository.buscarPorId(area.itemOrcamentoId);
    if (!item) {
      return null;
    }

    const resultadoOrcamento = await this.orcamentoRepository.buscarPorId(item.orcamentoId);
    if (!resultadoOrcamento || resultadoOrcamento.orcamento.usuarioId !== input.usuarioId) {
      return null;
    }

    return area;
  }
}
