import { useState, useEffect, useCallback } from 'react';
import { Cliente } from '../../domain/entities/cliente';
import { clienteService } from '../../application/services/cliente.service';

/**
 * Hook para gerenciar a visualização e ações em um cliente específico.
 */
export function useClienteDetalhe(id: string | undefined) {
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isTogglingAtivo, setIsTogglingAtivo] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadCliente = useCallback(async () => {
    if (!id || id.trim() === '') {
      setError('ID de cliente inválido.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await clienteService.obterCliente(id);
      if (!data) {
        setError('Cliente não encontrado.');
      } else {
        setCliente(data);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao carregar cliente.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadCliente();
  }, [loadCliente]);

  const toggleAtivo = async (): Promise<boolean> => {
    if (!cliente) return false;
    setIsTogglingAtivo(true);
    setError(null);
    try {
      const novoStatus = !cliente.ativo;
      await clienteService.alterarAtivoCliente(cliente.id, novoStatus);
      // Atualiza o estado local
      setCliente(new Cliente({
        id: cliente.id,
        usuarioId: cliente.usuarioId,
        nome: cliente.nome,
        telefone: cliente.telefone,
        email: cliente.email,
        documento: cliente.documento,
        observacoes: cliente.observacoes,
        ativo: novoStatus,
        endereco: cliente.endereco,
      }));
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao alterar status do cliente.';
      setError(msg);
      return false;
    } finally {
      setIsTogglingAtivo(false);
    }
  };

  return {
    cliente,
    isLoading,
    isTogglingAtivo,
    error,
    reload: loadCliente,
    toggleAtivo,
  };
}
