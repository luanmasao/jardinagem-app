import { useState, useEffect, useCallback, useMemo } from 'react';
import { Cliente } from '../../domain/entities/cliente';
import { clienteService } from '../../application/services/cliente.service';

/**
 * Hook para gerenciar o estado da listagem de clientes com busca local em tempo real.
 */
export function useClientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const loadClientes = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const lista = await clienteService.listarClientes();
      setClientes(lista);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao carregar lista de clientes.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClientes();
  }, [loadClientes]);

  // Busca local por nome em memória (normalizando acentuação e caixa)
  const filteredClientes = useMemo(() => {
    if (!searchQuery || searchQuery.trim() === '') {
      return clientes;
    }
    const termo = searchQuery.trim().toLowerCase();
    return clientes.filter((c) =>
      c.nome.toLowerCase().includes(termo) ||
      (c.documento && c.documento.toLowerCase().includes(termo)) ||
      (c.telefone && c.telefone.toLowerCase().includes(termo))
    );
  }, [clientes, searchQuery]);

  return {
    clientes,
    filteredClientes,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    reload: loadClientes,
  };
}
