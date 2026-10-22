import { CoordenadaMapa, RegiaoMapa } from '../../infrastructure/maps/map-provider.interface';
import { GeometriaPoligono, obterVerticesPoligono } from '../../domain/types/geometria';

/** Margem em volta da área ao centralizar o mapa (1.6 = a área ocupa ~60% da tela). */
const MARGEM_REGIAO = 1.6;
/** Zoom máximo ao centralizar (~90 m de largura), para áreas muito pequenas não ficarem coladas na borda. */
const DELTA_MINIMO = 0.0008;

/**
 * Converte a geometria salva de uma área nos vértices editáveis do mapa.
 * Remove o fechamento explícito (último ponto igual ao primeiro), se houver, para não exibir ponto duplicado.
 */
export function verticesDaGeometria(geometria: GeometriaPoligono): CoordenadaMapa[] {
  return obterVerticesPoligono(geometria).map((c) => ({ latitude: c.latitude, longitude: c.longitude }));
}

/**
 * Região do mapa que enquadra todos os vértices, com margem. Retorna null para lista vazia.
 */
export function regiaoDosVertices(vertices: CoordenadaMapa[]): RegiaoMapa | null {
  if (vertices.length === 0) return null;

  const lats = vertices.map((v) => v.latitude);
  const lngs = vertices.map((v) => v.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max((maxLat - minLat) * MARGEM_REGIAO, DELTA_MINIMO),
    longitudeDelta: Math.max((maxLng - minLng) * MARGEM_REGIAO, DELTA_MINIMO),
  };
}

/**
 * Retorna uma nova lista com o vértice do índice informado movido para a nova coordenada.
 * Índice fora da lista ou coordenada inválida mantém a lista original (mesma referência),
 * para não disparar recálculo nem redesenho sem necessidade.
 */
export function moverVertice(
  vertices: CoordenadaMapa[],
  indice: number,
  coordenada: CoordenadaMapa
): CoordenadaMapa[] {
  if (!Number.isInteger(indice) || indice < 0 || indice >= vertices.length) {
    return vertices;
  }
  if (!Number.isFinite(coordenada.latitude) || !Number.isFinite(coordenada.longitude)) {
    return vertices;
  }

  const atual = vertices[indice];
  if (atual.latitude === coordenada.latitude && atual.longitude === coordenada.longitude) {
    return vertices;
  }

  const novos = [...vertices];
  novos[indice] = { latitude: coordenada.latitude, longitude: coordenada.longitude };
  return novos;
}
