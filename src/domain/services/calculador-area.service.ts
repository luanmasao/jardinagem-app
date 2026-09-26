import { GeometriaPoligono } from '../types/geometria';

/**
 * Contrato arquitetural para cálculo externo de área a partir de uma geometria (RN41).
 *
 * A responsabilidade de realizar o cálculo geodésico/espacial concreto (Google Maps, PostGIS ST_Area,
 * biblioteca geoespacial ou fórmula matemática esférica) pertence às camadas de Infraestrutura
 * e Apresentação/Mobile.
 *
 * O domínio define esta interface/porta para permitir:
 * 1. Desacoplamento de qualquer biblioteca ou serviço externo de mapas;
 * 2. Orquestração agnóstica na entidade Area;
 * 3. Testes unitários totalmente determinísticos através de dublês de teste (mocks/stubs).
 */
export interface CalculadorAreaService {
  /**
   * Calcula a área em metros quadrados (m²) de um polígono delimitado.
   * @param geometria Geometria válida do tipo Polygon com coordenadas geográficas.
   * @returns Área calculada em m² (valor estritamente maior que zero).
   */
  calcularArea(geometria: GeometriaPoligono): number;
}
