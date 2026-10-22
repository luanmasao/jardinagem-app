import { useState, useCallback, useMemo } from 'react';
import { CoordenadaMapa, ModoMapa } from '../../infrastructure/maps/map-provider.interface';
import { GeometriaPoligono } from '../../domain/types/geometria';
import { geodesicCalculadorAreaService } from '../../infrastructure/services/geodesic-calculador-area.service';
import { moverVertice as moverVerticeNaLista } from '../utils/mapa-vertices.utils';

interface UseMapaDelimitacaoReturn {
  vertices: CoordenadaMapa[];
  modoMapa: ModoMapa;
  areaEstimada: number;
  isPoligonoValido: boolean;
  adicionarVertice: (coord: CoordenadaMapa) => void;
  moverVertice: (indice: number, coord: CoordenadaMapa) => void;
  desfazerUltimoVertice: () => void;
  limparVertices: () => void;
  alternarModoMapa: () => void;
  converterParaGeometriaDominio: () => GeometriaPoligono;
}

/**
 * Hook para gerenciamento do estado interativo de desenho e delimitação de polígonos no mapa.
 * Na edição de uma área salva, recebe os vértices dela como ponto de partida.
 */
export function useMapaDelimitacao(verticesIniciais?: CoordenadaMapa[]): UseMapaDelimitacaoReturn {
  const [vertices, setVertices] = useState<CoordenadaMapa[]>(() => verticesIniciais ?? []);
  const [modoMapa, setModoMapa] = useState<ModoMapa>('satellite');

  const adicionarVertice = useCallback((coord: CoordenadaMapa) => {
    // Evita adicionar coordenadas nulas ou duplicadas consecutivas
    setVertices((prev) => {
      if (prev.length > 0) {
        const ultimo = prev[prev.length - 1];
        if (
          Math.abs(ultimo.latitude - coord.latitude) < 0.000001 &&
          Math.abs(ultimo.longitude - coord.longitude) < 0.000001
        ) {
          return prev;
        }
      }
      return [...prev, coord];
    });
  }, []);

  // Ajuste fino: reposiciona um vértice já marcado (arrastado no mapa)
  const moverVertice = useCallback((indice: number, coord: CoordenadaMapa) => {
    setVertices((prev) => moverVerticeNaLista(prev, indice, coord));
  }, []);

  const desfazerUltimoVertice = useCallback(() => {
    setVertices((prev) => (prev.length > 0 ? prev.slice(0, -1) : prev));
  }, []);

  const limparVertices = useCallback(() => {
    setVertices([]);
  }, []);

  const alternarModoMapa = useCallback(() => {
    setModoMapa((prev) => (prev === 'satellite' ? 'standard' : 'satellite'));
  }, []);

  const isPoligonoValido = vertices.length >= 3;

  // Cálculo geodésico da área em tempo real para feedback do usuário
  const areaEstimada = useMemo(() => {
    if (vertices.length < 3) return 0;
    try {
      const geo: GeometriaPoligono = {
        tipo: 'Polygon',
        coordenadas: vertices.map((v) => ({
          latitude: v.latitude,
          longitude: v.longitude,
        })),
      };
      return geodesicCalculadorAreaService.calcularArea(geo);
    } catch {
      // Se houver erro de topologia ou colinearidade no desenho em andamento, retorna 0
      return 0;
    }
  }, [vertices]);

  const converterParaGeometriaDominio = useCallback((): GeometriaPoligono => {
    if (vertices.length < 3) {
      throw new Error('O polígono deve possuir no mínimo 3 vértices para formar uma área.');
    }
    return {
      tipo: 'Polygon',
      coordenadas: vertices.map((v) => ({
        latitude: v.latitude,
        longitude: v.longitude,
      })),
    };
  }, [vertices]);

  return {
    vertices,
    modoMapa,
    areaEstimada,
    isPoligonoValido,
    adicionarVertice,
    moverVertice,
    desfazerUltimoVertice,
    limparVertices,
    alternarModoMapa,
    converterParaGeometriaDominio,
  };
}
