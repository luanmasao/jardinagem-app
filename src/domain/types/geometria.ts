export interface Coordenada {
  latitude: number;
  longitude: number;
}

export interface GeometriaPoligono {
  tipo: 'Polygon';
  coordenadas: Coordenada[];
}

/**
 * Compara se duas coordenadas geográficas possuem os mesmos valores de latitude e longitude.
 */
export function coordenadasIguais(c1: Coordenada, c2: Coordenada): boolean {
  return c1.latitude === c2.latitude && c1.longitude === c2.longitude;
}

/**
 * Valida se uma coordenada possui valores numéricos finitos dentro dos limites geográficos válidos:
 * - Latitude: [-90, +90]
 * - Longitude: [-180, +180]
 */
export function validarCoordenada(coordenada: Coordenada): boolean {
  if (!coordenada || typeof coordenada !== 'object') {
    return false;
  }
  const { latitude, longitude } = coordenada;
  return (
    typeof latitude === 'number' &&
    Number.isFinite(latitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    typeof longitude === 'number' &&
    Number.isFinite(longitude) &&
    longitude >= -180 &&
    longitude <= 180
  );
}

/**
 * Verifica se o polígono possui fechamento explícito, onde a primeira e a última coordenada são idênticas.
 */
export function isPoligonoFechado(geometria: GeometriaPoligono): boolean {
  if (!geometria || !Array.isArray(geometria.coordenadas) || geometria.coordenadas.length === 0) {
    return false;
  }
  const coords = geometria.coordenadas;
  return coords.length >= 4 && coordenadasIguais(coords[0], coords[coords.length - 1]);
}

/**
 * Retorna os vértices únicos do polígono na ordem de delimitação.
 * Se o polígono for explicitamente fechado (último ponto igual ao primeiro), o último ponto redundante é omitido.
 */
export function obterVerticesPoligono(geometria: GeometriaPoligono): Coordenada[] {
  if (!geometria || !Array.isArray(geometria.coordenadas)) {
    return [];
  }
  if (isPoligonoFechado(geometria)) {
    return geometria.coordenadas.slice(0, -1);
  }
  return [...geometria.coordenadas];
}

/**
 * Validação rigorosa de GeometriaPoligono (RN40).
 *
 * Convenção de Polígono no Domínio:
 * 1. Fechamento implícito (padrão mobile react-native-maps): sequência ordenada de vértices com no mínimo 3 pontos distintos.
 * 2. Fechamento explícito (padrão GeoJSON / PostGIS LinearRing): sequência com no mínimo 4 pontos, onde o primeiro e o último ponto são idênticos e há no mínimo 3 vértices distintos.
 */
export function validarGeometriaPoligono(geometria: GeometriaPoligono): boolean {
  if (!geometria || geometria.tipo !== 'Polygon' || !Array.isArray(geometria.coordenadas)) {
    return false;
  }

  const coords = geometria.coordenadas;

  // Rejeita geometria vazia ou com menos de 3 coordenadas
  if (coords.length < 3) {
    return false;
  }

  // Todas as coordenadas devem ser válidas (finitas e dentro dos limites geográficos)
  const todasValidas = coords.every(validarCoordenada);
  if (!todasValidas) {
    return false;
  }

  // Se o polígono tem fechamento explícito (primeiro igual ao último), requer pelo menos 4 pontos
  const fechamentoExplicito = coordenadasIguais(coords[0], coords[coords.length - 1]);
  if (fechamentoExplicito && coords.length < 4) {
    return false;
  }

  // Obtém os vértices sem a repetição final para verificar pontos distintos
  const vertices = fechamentoExplicito ? coords.slice(0, -1) : coords;

  // Verifica se há pelo menos 3 vértices distintos (evita formas degeneradas como pontos colapsados)
  const verticesDistintos: Coordenada[] = [];
  for (const v of vertices) {
    if (!verticesDistintos.some((existente) => coordenadasIguais(existente, v))) {
      verticesDistintos.push(v);
    }
  }

  return verticesDistintos.length >= 3;
}
