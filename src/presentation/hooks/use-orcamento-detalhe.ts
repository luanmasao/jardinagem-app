import { useState, useEffect, useCallback } from 'react';
import { Orcamento } from '../../domain/entities/orcamento';
import { StatusOrcamento } from '../../domain/enums/status-orcamento';
import { orcamentoService, AdicionarItemServiceInput, AtualizarItemServiceInput } from '../../application/services/orcamento.service';

/**
 * Hook para gerenciar detalhes, itens e ciclo de vida de um orçamento.
 */
export function useOrcamentoDetalhe(id: string) {
  const [orcamento, setOrcamento] = useState<Orcamento | null>(null);
  const [clienteNome, setClienteNome] = useState<string | undefined>(undefined);
  const [clienteTelefone, setClienteTelefone] = useState<string | null | undefined>(undefined);
  const [clienteEmail, setClienteEmail] = useState<string | null | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadOrcamento = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await orcamentoService.obterOrcamento(id);
      if (res) {
        setOrcamento(res.orcamento);
        setClienteNome(res.clienteNome);
        setClienteTelefone(res.clienteTelefone);
        setClienteEmail(res.clienteEmail);
      } else {
        setOrcamento(null);
        setError('Orçamento não encontrado.');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao carregar orçamento.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadOrcamento();
  }, [loadOrcamento]);

  const alterarStatus = async (novoStatus: StatusOrcamento): Promise<boolean> => {
    setIsSaving(true);
    setError(null);
    try {
      const atualizado = await orcamentoService.alterarStatusOrcamento(id, novoStatus);
      setOrcamento(atualizado);
      await loadOrcamento();
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao alterar status.';
      setError(msg);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const duplicar = async (novoNumero?: string): Promise<Orcamento | null> => {
    setIsSaving(true);
    setError(null);
    try {
      const copia = await orcamentoService.duplicarOrcamento(id, novoNumero);
      return copia;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao duplicar orçamento.';
      setError(msg);
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const excluir = async (): Promise<boolean> => {
    setIsSaving(true);
    setError(null);
    try {
      await orcamentoService.excluirOrcamento(id);
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao excluir orçamento.';
      setError(msg);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const adicionarItem = async (dados: Omit<AdicionarItemServiceInput, 'orcamentoId'>): Promise<boolean> => {
    setIsSaving(true);
    setError(null);
    try {
      await orcamentoService.adicionarItem({ ...dados, orcamentoId: id });
      await loadOrcamento();
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao adicionar item.';
      setError(msg);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const atualizarItem = async (
    itemId: string,
    dados: Omit<AtualizarItemServiceInput, 'orcamentoId' | 'itemId'>
  ): Promise<boolean> => {
    setIsSaving(true);
    setError(null);
    try {
      await orcamentoService.atualizarItem({ ...dados, orcamentoId: id, itemId });
      await loadOrcamento();
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao atualizar item.';
      setError(msg);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const removerItem = async (itemId: string): Promise<boolean> => {
    setIsSaving(true);
    setError(null);
    try {
      await orcamentoService.removerItem(id, itemId);
      await loadOrcamento();
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao remover item.';
      setError(msg);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  return {
    orcamento,
    clienteNome,
    clienteTelefone,
    clienteEmail,
    itens: orcamento ? orcamento.itens : [],
    isLoading,
    isSaving,
    error,
    reload: loadOrcamento,
    alterarStatus,
    duplicar,
    excluir,
    adicionarItem,
    atualizarItem,
    removerItem,
  };
}
