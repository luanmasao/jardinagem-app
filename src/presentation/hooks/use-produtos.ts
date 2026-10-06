import { useState, useEffect, useCallback, useMemo } from 'react';
import { Produto } from '../../domain/entities/produto';
import { produtoService } from '../../application/services/produto.service';

/**
 * Hook para gerenciar o estado da listagem de produtos com busca local em tempo real por nome.
 */
export function useProdutos() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const loadProdutos = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const lista = await produtoService.listarProdutos();
      setProdutos(lista);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao carregar lista de produtos.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProdutos();
  }, [loadProdutos]);

  // Busca local instantânea por nome em memória
  const filteredProdutos = useMemo(() => {
    if (!searchQuery || searchQuery.trim() === '') {
      return produtos;
    }
    const termo = searchQuery.trim().toLowerCase();
    return produtos.filter((p) =>
      p.nome.toLowerCase().includes(termo) ||
      (p.descricao && p.descricao.toLowerCase().includes(termo))
    );
  }, [produtos, searchQuery]);

  return {
    produtos,
    filteredProdutos,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    reload: loadProdutos,
  };
}
