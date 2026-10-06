import { useState, useEffect, useCallback, useMemo } from 'react';
import { Servico } from '../../domain/entities/servico';
import { servicoService } from '../../application/services/servico.service';

/**
 * Hook para gerenciar o estado da listagem de serviços com busca local em tempo real por nome.
 */
export function useServicos() {
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const loadServicos = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const lista = await servicoService.listarServicos();
      setServicos(lista);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao carregar lista de serviços.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadServicos();
  }, [loadServicos]);

  // Busca local instantânea por nome em memória
  const filteredServicos = useMemo(() => {
    if (!searchQuery || searchQuery.trim() === '') {
      return servicos;
    }
    const termo = searchQuery.trim().toLowerCase();
    return servicos.filter((s) =>
      s.nome.toLowerCase().includes(termo) ||
      (s.descricao && s.descricao.toLowerCase().includes(termo))
    );
  }, [servicos, searchQuery]);

  return {
    servicos,
    filteredServicos,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    reload: loadServicos,
  };
}
