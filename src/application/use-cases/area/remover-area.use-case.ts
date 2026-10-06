import { RegraNegocioError } from '../../../domain/errors/dominio-error';
import { arredondarMoeda } from '../../../domain/calculations/moeda';
import { AreaRepository } from '../../../domain/repositories/area.repository.interface';
import { ItemOrcamentoRepository } from '../../../domain/repositories/item-orcamento.repository.interface';
import { OrcamentoRepository } from '../../../domain/repositories/orcamento.repository.interface';

export interface RemoverAreaInput {
  usuarioId: string;
  id: string;
}

/**
 * Caso de Uso: RemoverAreaUseCase (GAP-AREA-07).
 *
 * Responsabilidades:
 * - Carregar área e validar existência;
 * - Validar ItemOrcamento associado e Orçamento proprietário;
 * - Respeitar status RASCUNHO (bloqueio fora de rascunho - RN64, RN65);
 * - Remover área via AreaRepository;
 * - Recalcular quantidade do ItemOrcamento pela soma das áreas restantes (0 se nenhuma - RN33, RN44);
 * - Atualizar ItemOrcamento preservando rigorosamente snapshots históricos de catálogo (RN29, RN31);
 * - Recalcular valores financeiros do Orçamento (subtotal, desconto, total).
 */
export class RemoverAreaUseCase {
  constructor(
    private readonly areaRepository: AreaRepository,
    private readonly itemOrcamentoRepository: ItemOrcamentoRepository,
    private readonly orcamentoRepository: OrcamentoRepository
  ) {}

  async execute(input: RemoverAreaInput): Promise<void> {
    if (!input.usuarioId || input.usuarioId.trim() === '') {
      throw new RegraNegocioError('Usuário não autenticado.');
    }
    if (!input.id || input.id.trim() === '') {
      throw new RegraNegocioError('O ID da área é obrigatório.');
    }

    // 1. Carregar Área
    const area = await this.areaRepository.buscarPorId(input.id);
    if (!area) {
      throw new RegraNegocioError('Área não encontrada.');
    }

    // 2. Carregar ItemOrcamento associado
    const item = await this.itemOrcamentoRepository.buscarPorId(area.itemOrcamentoId);
    if (!item) {
      throw new RegraNegocioError('Item de orçamento associado à área não encontrado.');
    }

    // 3. Carregar Orçamento e validar titularidade multi-tenant
    const resultadoOrcamento = await this.orcamentoRepository.buscarPorId(item.orcamentoId);
    if (!resultadoOrcamento || resultadoOrcamento.orcamento.usuarioId !== input.usuarioId) {
      throw new RegraNegocioError('Orçamento associado não encontrado ou não pertence ao usuário.');
    }

    const orcamento = resultadoOrcamento.orcamento;

    // 4. Validar ciclo de vida: mutação exclusiva em RASCUNHO (RN64, RN65)
    if (!orcamento.editavel) {
      throw new RegraNegocioError(
        `Áreas não podem ser removidas de orçamentos no status '${orcamento.status}'. Somente orçamentos em RASCUNHO são editáveis.`
      );
    }

    // 5. Remover a área via repositório
    await this.areaRepository.remover(input.id);

    // 6. Recalcular quantidade do item com base nas áreas restantes
    const areasRestantes = await this.areaRepository.listarPorItem(item.id);
    const novaQuantidade = arredondarMoeda(
      areasRestantes.reduce((acc, a) => acc + a.areaCalculada, 0)
    );
    const novoValorTotal = arredondarMoeda(novaQuantidade * item.valorUnitario);

    // 7. Atualizar ItemOrcamento mantendo snapshot histórico inalterado
    await this.itemOrcamentoRepository.atualizar(item.id, {
      quantidade: novaQuantidade,
      valorTotal: novoValorTotal,
    });

    // 8. Recalcular totais do Orçamento
    const itemNoOrcamento = orcamento.itens.find((i) => i.id === item.id);
    if (itemNoOrcamento) {
      itemNoOrcamento.quantidade = novaQuantidade;
      itemNoOrcamento.valorTotal = novoValorTotal;
    }
    orcamento.recalcularValores();

    await this.orcamentoRepository.atualizar(orcamento.id, {
      tipoDesconto: orcamento.tipoDesconto,
      valorDesconto: orcamento.valorDesconto,
      subtotal: orcamento.subtotal,
      total: orcamento.total,
    });
  }
}
