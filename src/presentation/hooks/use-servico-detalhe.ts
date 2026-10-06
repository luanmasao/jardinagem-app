import { useState, useEffect, useCallback } from 'react';
import { Servico } from '../../domain/entities/servico';
import { servicoService } from '../../application/services/servico.service';

/**
 * Hook para gerenciar a visualização e ações em um serviço específico.
 */
export function useServicoDetalhe(id: string | undefined) {
  const [servico, setServico] = useState<Servico | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isTogglingAtivo, setIsTogglingAtivo] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadServico = useCallback(async () => {
    if (!id || id.trim() === '') {
      setError('ID de serviço inválido.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await servicoService.obterServico(id);
      if (!data) {
        setError('Serviço não encontrado.');
      } else {
        setServico(data);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao carregar serviço.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadServico();
  }, [loadServico]);

  const toggleAtivo = async (): Promise<boolean> => {
    if (!servico) return false;
    setIsTogglingAtivo(true);
    setError(null);
    try {
      const novoStatus = !servico.ativo;
      await servicoService.alterarAtivoServico(servico.id, novoStatus);
      servico.ativo = novoStatus;
      setServico(new Servico({
        id: servico.id,
        usuarioId: servico.usuarioId,
        nome: servico.nome,
        descricao: servico.descricao,
        unidade: servico.unidade,
        precoBase: servico.precoBase,
        usaMedicaoArea: servico.usaMedicaoArea,
        ativo: novoStatus,
      }));
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao alterar status do serviço.';
      setError(msg);
      return false;
    } finally {
      setIsTogglingAtivo(false);
    }
  };

  return {
    servico,
    isLoading,
    isTogglingAtivo,
    error,
    reload: loadServico,
    toggleAtivo,
  };
}
