import { Area } from '../../../domain/entities/area';
import { GeometriaPoligono, validarGeometriaPoligono } from '../../../domain/types/geometria';
import { RegraNegocioError } from '../../../domain/errors/dominio-error';
import { arredondarMoeda } from '../../../domain/calculations/moeda';
import { AreaRepository, AtualizarAreaDados } from '../../../domain/repositories/area.repository.interface';
import { ItemOrcamentoRepository } from '../../../domain/repositories/item-orcamento.repository.interface';
import { OrcamentoRepository } from '../../../domain/repositories/orcamento.repository.interface';
import { CalculadorAreaService } from '../../../domain/services/calculador-area.service';
import { geodesicCalculadorAreaService } from '../../../infrastructure/services/geodesic-calculador-area.service';

export interface AtualizarAreaInput {
  usuarioId: string;
  id: string;
  nome?: string | null;
  geometria?: GeometriaPoligono;
  observacoes?: string | null;
  unidade?: string;
}

/**
 * Caso de Uso: AtualizarAreaUseCase (GAP-AREA-07).
 *
 * Responsabilidades:
 * - Carregar área atual e validar existência;
 * - Validar ItemOrcamento e Orçamento proprietário;
 * - Bloquear qualquer mutação fora de RASCUNHO (RN64, RN65);
 * - Atualizar metadados (nome, observações, unidade) sem recalcular metragem desnecessariamente;
 * - Quando a geometria for alterada:
 *   - Validar polígono espacial;
 *   - Recalcular areaCalculada exclusivamente com GeodesicCalculadorAreaService;
 *   - Não aceitar areaCalculada arbitrária externa;
 *   - Atualizar a área no repositório;
 *   - Recalcular a quantidade do ItemOrcamento pela soma das áreas (RN33, RN34);
 *   - Preservar rigorosamente os snapshots históricos do item (RN29, RN31);
 *   - Recalcular valores financeiros do Orçamento (subtotal, desconto, total).
 */
export class AtualizarAreaUseCase {
  constructor(
    private readonly areaRepository: AreaRepository,
    private readonly itemOrcamentoRepository: ItemOrcamentoRepository,
    private readonly orcamentoRepository: OrcamentoRepository,
    private readonly calculadorAreaService: CalculadorAreaService = geodesicCalculadorAreaService
  ) {}

  async execute(input: AtualizarAreaInput): Promise<Area> {
    if (!input.usuarioId || input.usuarioId.trim() === '') {
      throw new RegraNegocioError('Usuário não autenticado.');
    }
    if (!input.id || input.id.trim() === '') {
      throw new RegraNegocioError('O ID da área é obrigatório.');
    }

    // 1. Carregar Área atual
    const areaAtual = await this.areaRepository.buscarPorId(input.id);
    if (!areaAtual) {
      throw new RegraNegocioError('Área não encontrada.');
    }

    // 2. Carregar ItemOrcamento associado
    const item = await this.itemOrcamentoRepository.buscarPorId(areaAtual.itemOrcamentoId);
    if (!item) {
      throw new RegraNegocioError('Item de orçamento associado à área não encontrado.');
    }

    // 3. Carregar Orçamento e validar titularidade
    const resultadoOrcamento = await this.orcamentoRepository.buscarPorId(item.orcamentoId);
    if (!resultadoOrcamento || resultadoOrcamento.orcamento.usuarioId !== input.usuarioId) {
      throw new RegraNegocioError('Orçamento associado não encontrado ou não pertence ao usuário.');
    }

    const orcamento = resultadoOrcamento.orcamento;

    // 4. Validar ciclo de vida: mutação exclusiva em RASCUNHO (RN64, RN65)
    if (!orcamento.editavel) {
      throw new RegraNegocioError(
        `Áreas não podem ser editadas em orçamentos no status '${orcamento.status}'. Somente orçamentos em RASCUNHO são editáveis.`
      );
    }

    const dadosAtualizacao: AtualizarAreaDados = {};
    let geometriaAlterada = false;

    if (input.nome !== undefined) {
      dadosAtualizacao.nome = input.nome ? input.nome.trim() : null;
    }
    if (input.observacoes !== undefined) {
      dadosAtualizacao.observacoes = input.observacoes ? input.observacoes.trim() : null;
    }
    if (input.unidade !== undefined) {
      dadosAtualizacao.unidade = input.unidade ? input.unidade.trim() : 'm²';
    }

    // 5. Se a geometria for alterada, recalcular via CalculadorAreaService
    if (input.geometria !== undefined) {
      if (!validarGeometriaPoligono(input.geometria)) {
        throw new RegraNegocioError('A nova geometria deve ser um polígono válido com pelo menos 3 coordenadas.');
      }
      geometriaAlterada = true;
      const novaAreaCalculada = this.calculadorAreaService.calcularArea(input.geometria);
      dadosAtualizacao.geometria = input.geometria;
      dadosAtualizacao.areaCalculada = novaAreaCalculada;
    }

    // 6. Persistir atualização no repositório
    const areaAtualizada = await this.areaRepository.atualizar(input.id, dadosAtualizacao);

    // 7. Se a geometria mudou, sincronizar quantidade e recálculos financeiros
    if (geometriaAlterada) {
      const todasAreas = await this.areaRepository.listarPorItem(item.id);
      const novaQuantidade = arredondarMoeda(
        todasAreas.reduce((acc, a) => acc + a.areaCalculada, 0)
      );
      const novoValorTotal = arredondarMoeda(novaQuantidade * item.valorUnitario);

      // Atualizar ItemOrcamento preservando snapshots históricos (descricao, valorUnitario, unidade)
      await this.itemOrcamentoRepository.atualizar(item.id, {
        quantidade: novaQuantidade,
        valorTotal: novoValorTotal,
      });

      // Recalcular totais do Orçamento
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

    return areaAtualizada;
  }
}
