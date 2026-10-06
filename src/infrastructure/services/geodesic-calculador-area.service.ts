import { CalculadorAreaService } from '../../domain/services/calculador-area.service';
import {
  GeometriaPoligono,
  validarGeometriaPoligono,
  obterVerticesPoligono,
  Coordenada,
} from '../../domain/types/geometria';
import { RegraNegocioError } from '../../domain/errors/dominio-error';
import { arredondarMoeda } from '../../domain/calculations/moeda';

/**
 * Raio equatorial/médio da Terra em metros adotado pelo sistema geodésico WGS 84 (EPSG:4326).
 */
const RAIO_TERRA_METROS = 6378137;

/**
 * Converte um valor em graus para radianos.
 */
function grausParaRadianos(graus: number): number {
  return (graus * Math.PI) / 180;
}

/**
 * Adaptador concreto de CalculadorAreaService para cálculo geodésico esférico de área (GAP-AREA-06).
 *
 * Implementa a DECISÃO-AREA-01 ("Cálculo geodésico esférico puro em TypeScript"):
 * - Utiliza o algoritmo esférico de Chamberlain & Duquette (2007) sobre a esfera WGS 84 (R = 6.378.137 m);
 * - Compatível com TypeScript e runtime React Native / Hermes (zero APIs externas ou de Node.js);
 * - 100% determinístico e testável de forma unitária isolada;
 * - Suporta polígonos fechados explícitos ([A, B, C, A]) e implícitos ([A, B, C]);
 * - Independente da orientação dos vértices (horário ou anti-horário), garantindo sempre área positiva;
 * - Normaliza a transição de longitude sobre o antimeridiano (-180° / +180°);
 * - Preserva a separação entre cálculo matemático da área e persistência/regras de negócio do domínio;
 * - Reutiliza os contratos e validações já existentes no domínio.
 */
export class GeodesicCalculadorAreaService implements CalculadorAreaService {
  private readonly raioTerraMetros: number = RAIO_TERRA_METROS;

  /**
   * Calcula a área em metros quadrados (m²) de um polígono com coordenadas geográficas.
   *
   * @param geometria Geometria do tipo Polygon contendo coordenadas geográficas (latitude, longitude).
   * @returns Área calculada em m² com precisão canônica comercial de duas casas decimais.
   * @throws RegraNegocioError se a geometria for inválida, possuir menos de 3 vértices distintos ou resultar em área degenerada (<= 0).
   */
  public calcularArea(geometria: GeometriaPoligono): number {
    if (!validarGeometriaPoligono(geometria)) {
      throw new RegraNegocioError(
        'A geometria da área deve ser um polígono válido com pelo menos 3 coordenadas.'
      );
    }

    const vertices: Coordenada[] = obterVerticesPoligono(geometria);

    if (vertices.length < 3) {
      throw new RegraNegocioError('O polígono deve possuir no mínimo 3 vértices distintos.');
    }

    let total = 0;
    const n = vertices.length;

    for (let i = 0; i < n; i++) {
      const p1 = vertices[i];
      const p2 = vertices[(i + 1) % n];

      const lam1 = grausParaRadianos(p1.longitude);
      const phi1 = grausParaRadianos(p1.latitude);
      const lam2 = grausParaRadianos(p2.longitude);
      const phi2 = grausParaRadianos(p2.latitude);

      let dLon = lam2 - lam1;

      // Normaliza a diferença de longitude para o intervalo (-PI, PI] (cruzamento do antimeridiano)
      while (dLon > Math.PI) {
        dLon -= 2 * Math.PI;
      }
      while (dLon < -Math.PI) {
        dLon += 2 * Math.PI;
      }

      total += dLon * (2 + Math.sin(phi1) + Math.sin(phi2));
    }

    const areaBrutaMetrosQuadrados = Math.abs(
      (total * this.raioTerraMetros * this.raioTerraMetros) / 2.0
    );

    const areaFinal = arredondarMoeda(areaBrutaMetrosQuadrados);

    if (areaFinal <= 0) {
      throw new RegraNegocioError(
        'A área calculada deve ser um valor numérico estritamente maior que zero.'
      );
    }

    return areaFinal;
  }
}

/**
 * Instância singleton padrão do calculador geodésico de área.
 */
export const geodesicCalculadorAreaService = new GeodesicCalculadorAreaService();
