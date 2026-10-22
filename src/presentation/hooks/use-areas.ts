import { useState, useCallback } from 'react';
import { Area } from '../../domain/entities/area';
import { areaService, CriarAreaServiceInput } from '../../application/services/area.service';

interface UseAreasReturn {
  areas: Area[];
  loading: boolean;
  error: string | null;
  metragemTotal: number;
  carregarAreas: () => Promise<void>;
  criarArea: (dados: CriarAreaServiceInput) => Promise<Area>;
  removerArea: (areaId: string) => Promise<void>;
}

/**
 * Hook para gerenciamento do ciclo de vida das Áreas de um Item de Orçamento na camada de apresentação.
 * Não carrega sozinho: a tela chama `carregarAreas` no foco (ao abrir e ao voltar do mapa).
 */
export function useAreas(itemOrcamentoId: string): UseAreasReturn {
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const carregarAreas = useCallback(async () => {
    if (!itemOrcamentoId) return;
    setLoading(true);
    setError(null);
    try {
      const lista = await areaService.listarAreasPorItem(itemOrcamentoId);
      setAreas(lista);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao carregar áreas do item.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [itemOrcamentoId]);

  const criarArea = useCallback(
    async (dados: CriarAreaServiceInput): Promise<Area> => {
      setError(null);
      try {
        const novaArea = await areaService.criarArea(dados);
        await carregarAreas();
        return novaArea;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Falha ao criar área.';
        setError(msg);
        throw err;
      }
    },
    [carregarAreas]
  );

  const removerArea = useCallback(
    async (areaId: string): Promise<void> => {
      setError(null);
      try {
        await areaService.removerArea(areaId);
        await carregarAreas();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Falha ao remover área.';
        setError(msg);
        throw err;
      }
    },
    [carregarAreas]
  );

  const metragemTotal = areas.reduce((acc, curr) => acc + (curr.areaCalculada || 0), 0);

  return {
    areas,
    loading,
    error,
    metragemTotal: Number(metragemTotal.toFixed(2)),
    carregarAreas,
    criarArea,
    removerArea,
  };
}
