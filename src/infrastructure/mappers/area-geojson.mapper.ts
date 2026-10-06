import {
  Coordenada,
  GeometriaPoligono,
  obterVerticesPoligono,
  validarGeometriaPoligono,
} from '../../domain/types/geometria';
import { Area } from '../../domain/entities/area';
import { RegraNegocioError } from '../../domain/errors/dominio-error';

/**
 * Representação GeoJSON RFC 7946 para geometria do tipo Polygon.
 * O anel exterior (linear ring) é um array fechado de posições [longitude, latitude].
 */
export interface GeoJsonPolygon {
  type: 'Polygon';
  coordinates: number[][][];
}

/**
 * Converte a geometria do domínio (GeometriaPoligono com { latitude, longitude })
 * para o formato GeoJSON RFC 7946 (DECISÃO-AREA-02).
 *
 * Características essenciais:
 * 1. Ordem de coordenadas GeoJSON: [longitude, latitude] (eixo x primeiro, depois y).
 * 2. Anel explicitamente fechado: o primeiro vértice é repetido no final da sequência.
 * 3. Opera tanto com polígonos de fechamento implícito [A, B, C] quanto explícito [A, B, C, A].
 */
export function dominioParaGeoJson(geometria: GeometriaPoligono): GeoJsonPolygon {
  if (!geometria || !validarGeometriaPoligono(geometria)) {
    throw new RegraNegocioError(
      'A geometria do domínio deve ser um polígono válido com pelo menos 3 coordenadas.'
    );
  }

  const vertices = obterVerticesPoligono(geometria);
  if (vertices.length < 3) {
    throw new RegraNegocioError('Polígono deve conter ao menos 3 vértices distintos.');
  }

  // Mapeia [longitude, latitude] em conformidade com RFC 7946
  const ring: number[][] = vertices.map((v) => [v.longitude, v.latitude]);

  // Garante o fechamento explícito do anel (LinearRing PostGIS / GeoJSON)
  ring.push([vertices[0].longitude, vertices[0].latitude]);

  return {
    type: 'Polygon',
    coordinates: [ring],
  };
}

/**
 * Converte representação GeoJSON recebida do PostgREST / PostGIS para GeometriaPoligono do domínio.
 *
 * Características essenciais:
 * 1. Mapeia [longitude, latitude] de volta para { latitude, longitude }.
 * 2. Aceita objeto GeoJSON estruturado ou string JSON serializada.
 * 3. Também suporta fallback seguro para formato WKT caso configurado no banco.
 * 4. Normaliza o fechamento via obterVerticesPoligono para evitar duplicação semântica no domínio.
 */
export function geoJsonParaDominio(raw: any): GeometriaPoligono {
  if (!raw) {
    throw new RegraNegocioError('Geometria não fornecida para desserialização.');
  }

  let parsed = raw;

  // Se recebido como string, tenta parsear como JSON ou tratar WKT
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed.startsWith('{')) {
      try {
        parsed = JSON.parse(trimmed);
      } catch (err: any) {
        throw new RegraNegocioError(`Falha ao parsear string GeoJSON: ${err.message}`);
      }
    } else if (trimmed.toUpperCase().includes('POLYGON')) {
      return parseWktPolygon(trimmed);
    } else {
      throw new RegraNegocioError('Formato de geometria espacial desconhecido ou inválido.');
    }
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new RegraNegocioError('Objeto GeoJSON inválido.');
  }

  if (parsed.type !== 'Polygon') {
    throw new RegraNegocioError(
      `Tipo de geometria não suportado: esperado 'Polygon', recebido '${parsed.type}'.`
    );
  }

  if (!Array.isArray(parsed.coordinates) || parsed.coordinates.length === 0) {
    throw new RegraNegocioError('Coordenadas de GeoJSON Polygon ausentes ou vazias.');
  }

  const exteriorRing = parsed.coordinates[0];
  if (!Array.isArray(exteriorRing) || exteriorRing.length < 4) {
    throw new RegraNegocioError(
      'Anel exterior GeoJSON deve conter ao menos 4 posições (anel fechado com no mínimo 3 vértices).'
    );
  }

  const coordenadasDominio: Coordenada[] = [];

  for (let i = 0; i < exteriorRing.length; i++) {
    const ponto = exteriorRing[i];
    if (!Array.isArray(ponto) || ponto.length < 2) {
      throw new RegraNegocioError(`Posição inválida no índice ${i} do anel GeoJSON.`);
    }

    const lon = Number(ponto[0]);
    const lat = Number(ponto[1]);

    if (!Number.isFinite(lon) || !Number.isFinite(lat)) {
      throw new RegraNegocioError(`Coordenadas não-numéricas encontradas no índice ${i}.`);
    }

    coordenadasDominio.push({ latitude: lat, longitude: lon });
  }

  // Normaliza o polígono no domínio através de obterVerticesPoligono
  const verticesNormalizados = obterVerticesPoligono({
    tipo: 'Polygon',
    coordenadas: coordenadasDominio,
  });

  const dominio: GeometriaPoligono = {
    tipo: 'Polygon',
    coordenadas: verticesNormalizados,
  };

  if (!validarGeometriaPoligono(dominio)) {
    throw new RegraNegocioError(
      'Geometria desserializada não satisfaz os critérios de validação do domínio.'
    );
  }

  return dominio;
}

/**
 * Fallback utilitário para parsear formato WKT: POLYGON((lon lat, ...))
 */
function parseWktPolygon(wkt: string): GeometriaPoligono {
  const match = wkt.match(/\(\((.*?)\)\)/);
  if (!match || !match[1]) {
    throw new RegraNegocioError(`Formato WKT inválido: '${wkt}'.`);
  }

  const pares = match[1].split(',').map((p) => p.trim());
  if (pares.length < 4) {
    throw new RegraNegocioError('WKT POLYGON deve conter ao menos 4 pares de coordenadas.');
  }

  const coords: Coordenada[] = [];
  for (const par of pares) {
    const partes = par.split(/\s+/).filter(Boolean);
    if (partes.length < 2) {
      throw new RegraNegocioError(`Par de coordenadas WKT inválido: '${par}'.`);
    }
    const lon = Number(partes[0]);
    const lat = Number(partes[1]);
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) {
      throw new RegraNegocioError(`Coordenada não-numérica no WKT: '${par}'.`);
    }
    coords.push({ latitude: lat, longitude: lon });
  }

  const vertices = obterVerticesPoligono({ tipo: 'Polygon', coordenadas: coords });
  const dominio: GeometriaPoligono = { tipo: 'Polygon', coordenadas: vertices };

  if (!validarGeometriaPoligono(dominio)) {
    throw new RegraNegocioError('WKT desserializado não produziu um polígono válido.');
  }

  return dominio;
}

/**
 * Mapeia registro bruto retornado pela tabela public.area para a entidade de domínio Area.
 */
export function mapAreaRow(data: any): Area {
  if (!data) {
    throw new Error('Registro de área não fornecido para mapeamento.');
  }

  const geometria = geoJsonParaDominio(data.geometria);

  return new Area({
    id: data.id,
    itemOrcamentoId: data.item_orcamento_id,
    nome: data.nome ?? null,
    geometria,
    areaCalculada: Number(data.area_calculada),
    unidade: data.unidade ?? 'm²',
    observacoes: data.observacoes ?? null,
  });
}
