import { useState, useCallback, useMemo } from 'react';
import { useFocusEffect } from 'expo-router';
import { OrcamentoResumo } from '../../domain/repositories/orcamento.repository.interface';
import { StatusOrcamento } from '../../domain/enums/status-orcamento';
import { orcamentoService } from '../../application/services/orcamento.service';

/**
 * Hook para gerenciar o estado da listagem de orçamentos com filtro por status e busca local em memória.
 */
export function useOrcamentos() {
  const [orcamentos, setOrcamentos] = useState<OrcamentoResumo[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filtroStatus, setFiltroStatus] = useState<StatusOrcamento | 'TODOS'>('TODOS');

  const loadOrcamentos = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const statusParam = filtroStatus === 'TODOS' ? undefined : filtroStatus;
    try {
      const lista = await orcamentoService.listarOrcamentos(statusParam);
      setOrcamentos(lista);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao carregar lista de orçamentos.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }

    // Defesa em profundidade JIT complementar (não-bloqueante da renderização inicial)
    orcamentoService
      .expirarVencidosJit()
      .then((linhasExpiradas: number) => {
        if (linhasExpiradas > 0) {

          orcamentoService
            .listarOrcamentos(statusParam)
            .then((novaLista) => setOrcamentos(novaLista))
            .catch(() => {});
        }
      })
      .catch(() => {});
  }, [filtroStatus]);


  useFocusEffect(
    useCallback(() => {
      loadOrcamentos();
    }, [loadOrcamentos])
  );

  // Busca local instantânea em memória por número ou nome do cliente
  const filteredOrcamentos = useMemo(() => {
    let result = orcamentos;

    if (filtroStatus !== 'TODOS') {
      result = result.filter((o) => o.status === filtroStatus);
    }

    if (!searchQuery || searchQuery.trim() === '') {
      return result;
    }

    const termo = searchQuery.trim().toLowerCase();
    return result.filter(
      (o) =>
        o.numero.toLowerCase().includes(termo) ||
        (o.clienteNome && o.clienteNome.toLowerCase().includes(termo))
    );
  }, [orcamentos, searchQuery, filtroStatus]);

  return {
    orcamentos,
    filteredOrcamentos,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    filtroStatus,
    setFiltroStatus,
    reload: loadOrcamentos,
  };
}
