import { GeometriaPoligono, validarGeometriaPoligono } from '../types/geometria';
import { RegraNegocioError } from '../errors/dominio-error';
import { arredondarMoeda } from '../calculations/moeda';
import { CalculadorAreaService } from '../services/calculador-area.service';

export interface AreaProps {
  id: string;
  itemOrcamentoId: string;
  nome?: string | null;
  geometria: GeometriaPoligono;
  areaCalculada: number;
  unidade?: string;
  observacoes?: string | null;
}

export class Area {
  public readonly id: string;
  public readonly itemOrcamentoId: string;
  public nome: string | null;
  public geometria: GeometriaPoligono;
  public areaCalculada: number;
  public unidade: string;
  public observacoes: string | null;

  constructor(props: AreaProps) {
    if (!props.id || props.id.trim() === '') {
      throw new RegraNegocioError('O ID da área é obrigatório.');
    }
    if (!props.itemOrcamentoId || props.itemOrcamentoId.trim() === '') {
      throw new RegraNegocioError('O ID do item de orçamento associado à área é obrigatório.');
    }
    if (!validarGeometriaPoligono(props.geometria)) {
      throw new RegraNegocioError('A geometria da área deve ser um polígono válido com pelo menos 3 coordenadas.');
    }
    if (typeof props.areaCalculada !== 'number' || props.areaCalculada <= 0) {
      throw new RegraNegocioError('A área calculada deve ser um valor numérico estritamente maior que zero.');
    }

    this.id = props.id;
    this.itemOrcamentoId = props.itemOrcamentoId;
    this.nome = props.nome ? props.nome.trim() : null;
    this.geometria = props.geometria;
    this.areaCalculada = arredondarMoeda(props.areaCalculada);
    this.unidade = props.unidade ? props.unidade.trim() : 'm²';
    this.observacoes = props.observacoes ? props.observacoes.trim() : null;
  }

  /**
   * RN41 / UML v3.1: Calcula a área em m² da geometria delimitada através do contrato CalculadorAreaService.
   */
  public calcularArea(calculador: CalculadorAreaService): number {
    if (!calculador || typeof calculador.calcularArea !== 'function') {
      throw new RegraNegocioError('Calculador de área válido deve ser fornecido.');
    }
    const area = calculador.calcularArea(this.geometria);
    if (typeof area !== 'number' || Number.isNaN(area) || area <= 0) {
      throw new RegraNegocioError('A área calculada deve ser um valor numérico estritamente maior que zero.');
    }
    return arredondarMoeda(area);
  }

  /**
   * UML v3.1: Atualiza o valor numérico da área calculada.
   */
  public atualizarArea(novaAreaCalculada: number): void {
    if (typeof novaAreaCalculada !== 'number' || Number.isNaN(novaAreaCalculada) || novaAreaCalculada <= 0) {
      throw new RegraNegocioError('A nova área calculada deve ser um valor numérico estritamente maior que zero.');
    }
    this.areaCalculada = arredondarMoeda(novaAreaCalculada);
  }

  /**
   * RN42, RN43 / UML v3.1: Atualiza a geometria da área e recalcula a área em m².
   * Aceita diretamente o valor calculado (number) ou um CalculadorAreaService para cálculo automático da geometria.
   */
  public atualizarGeometria(
    novaGeometria: GeometriaPoligono,
    calculadorOuArea: CalculadorAreaService | number
  ): void {
    if (!validarGeometriaPoligono(novaGeometria)) {
      throw new RegraNegocioError('A nova geometria deve ser um polígono válido com pelo menos 3 coordenadas.');
    }

    let novaArea: number;
    if (typeof calculadorOuArea === 'number') {
      novaArea = calculadorOuArea;
    } else if (calculadorOuArea && typeof calculadorOuArea.calcularArea === 'function') {
      novaArea = calculadorOuArea.calcularArea(novaGeometria);
    } else {
      throw new RegraNegocioError('Um valor numérico de área ou um CalculadorAreaService válido deve ser fornecido.');
    }

    if (typeof novaArea !== 'number' || Number.isNaN(novaArea) || novaArea <= 0) {
      throw new RegraNegocioError('A nova área calculada deve ser um valor numérico estritamente maior que zero.');
    }

    this.geometria = novaGeometria;
    this.areaCalculada = arredondarMoeda(novaArea);
  }

  public atualizarDados(dados: { nome?: string | null; observacoes?: string | null }): void {
    if (dados.nome !== undefined) this.nome = dados.nome ? dados.nome.trim() : null;
    if (dados.observacoes !== undefined) this.observacoes = dados.observacoes ? dados.observacoes.trim() : null;
  }
}
