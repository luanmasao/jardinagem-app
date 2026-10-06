import * as Crypto from 'expo-crypto';
import { Area } from '../../../domain/entities/area';
import { GeometriaPoligono, validarGeometriaPoligono } from '../../../domain/types/geometria';
import { TipoItem } from '../../../domain/enums/tipo-item';
import { RegraNegocioError } from '../../../domain/errors/dominio-error';
import { arredondarMoeda } from '../../../domain/calculations/moeda';
import { AreaRepository } from '../../../domain/repositories/area.repository.interface';
import { ItemOrcamentoRepository } from '../../../domain/repositories/item-orcamento.repository.interface';
import { OrcamentoRepository } from '../../../domain/repositories/orcamento.repository.interface';
import { CalculadorAreaService } from '../../../domain/services/calculador-area.service';
import { geodesicCalculadorAreaService } from '../../../infrastructure/services/geodesic-calculador-area.service';

export interface CriarAreaInput {
  id?: string;
  usuarioId: string;
  itemOrcamentoId: string;
  geometria: GeometriaPoligono;
  nome?: string | null;
  observacoes?: string | null;
  unidade?: string;
}

/**
 * Caso de Uso: CriarAreaUseCase (GAP-AREA-07).
 *
 * Responsabilidades:
 * - Validar parâmetros de entrada e geometria espacial;
 * - Validar existência e tipo do ItemOrcamento (exclusivamente SERVICO com usaMedicaoArea = true - RN45);
 * - Validar titularidade e estado do Orçamento (mutação exclusiva em RASCUNHO - RN64, RN65);
 * - Calcular metragem cúbica/quadrada em m² utilizando exclusivamente CalculadorAreaService (DECISÃO-AREA-01);
 * - Criar entidade Area e persistir via AreaRepository;
 * - Recalcular quantidade do ItemOrcamento derivada da soma das áreas (RN33, RN34);
 * - Atualizar ItemOrcamento preservando rigorosamente snapshots históricos de catálogo (RN29, RN31);
 * - Recalcular subtotal, desconto e total do Orçamento proprietário (RN48, RN56).
 */
export class CriarAreaUseCase {
  constructor(
    private readonly areaRepository: AreaRepository,
    private readonly itemOrcamentoRepository: ItemOrcamentoRepository,
    private readonly orcamentoRepository: OrcamentoRepository,
    private readonly calculadorAreaService: CalculadorAreaService = geodesicCalculadorAreaService
  ) {}

  async execute(input: CriarAreaInput): Promise<Area> {
    if (!input.usuarioId || input.usuarioId.trim() === '') {
      throw new RegraNegocioError('Usuário não autenticado.');
    }
    if (!input.itemOrcamentoId || input.itemOrcamentoId.trim() === '') {
      throw new RegraNegocioError('O ID do item de orçamento é obrigatório.');
    }
    if (!validarGeometriaPoligono(input.geometria)) {
      throw new RegraNegocioError('A geometria da área deve ser um polígono válido com pelo menos 3 coordenadas.');
    }

    // 1. Carregar ItemOrcamento
    const item = await this.itemOrcamentoRepository.buscarPorId(input.itemOrcamentoId);
    if (!item) {
      throw new RegraNegocioError('Item de orçamento não encontrado.');
    }

    // 2. Validar que o item é de serviço
    if (item.tipo !== TipoItem.SERVICO) {
      throw new RegraNegocioError('Áreas só podem ser associadas a itens do tipo SERVICO.');
    }

    // 3. Validar que usa_medicao_area = true (RN45)
    if (!item.usaMedicaoArea) {
      throw new RegraNegocioError('Não é permitido adicionar áreas a um item que não utiliza medição de área.');
    }

    // 4. Carregar Orçamento e validar titularidade multi-tenant
    const resultadoOrcamento = await this.orcamentoRepository.buscarPorId(item.orcamentoId);
    if (!resultadoOrcamento || resultadoOrcamento.orcamento.usuarioId !== input.usuarioId) {
      throw new RegraNegocioError('Orçamento associado não encontrado ou não pertence ao usuário.');
    }

    const orcamento = resultadoOrcamento.orcamento;

    // 5. Validar ciclo de vida: mutação permitida exclusivamente em RASCUNHO (RN64, RN65)
    if (!orcamento.editavel) {
      throw new RegraNegocioError(
        `Áreas não podem ser criadas em orçamentos no status '${orcamento.status}'. Somente orçamentos em RASCUNHO são editáveis.`
      );
    }

    // 6. Calcular área utilizando CalculadorAreaService (nunca aceita valor manual externo)
    const areaCalculada = this.calculadorAreaService.calcularArea(input.geometria);

    // 7. Criar entidade Area
    const areaId = input.id ?? Crypto.randomUUID();
    const novaArea = new Area({
      id: areaId,
      itemOrcamentoId: item.id,
      nome: input.nome,
      geometria: input.geometria,
      areaCalculada,
      unidade: input.unidade ?? 'm²',
      observacoes: input.observacoes,
    });

    // 8. Persistir via AreaRepository
    const areaPersistida = await this.areaRepository.criar({
      id: novaArea.id,
      itemOrcamentoId: novaArea.itemOrcamentoId,
      nome: novaArea.nome,
      geometria: novaArea.geometria,
      areaCalculada: novaArea.areaCalculada,
      unidade: novaArea.unidade,
      observacoes: novaArea.observacoes,
    });

    // 9. Recalcular quantidade do ItemOrcamento (soma das áreas)
    const todasAreas = await this.areaRepository.listarPorItem(item.id);
    const novaQuantidade = arredondarMoeda(
      todasAreas.reduce((acc, a) => acc + a.areaCalculada, 0)
    );
    const novoValorTotal = arredondarMoeda(novaQuantidade * item.valorUnitario);

    // 10. Atualizar ItemOrcamento no repositório preservando snapshots históricos
    await this.itemOrcamentoRepository.atualizar(item.id, {
      quantidade: novaQuantidade,
      valorTotal: novoValorTotal,
    });

    // 11. Recalcular valores do Orçamento (subtotal, desconto, total)
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

    return areaPersistida;
  }
}
