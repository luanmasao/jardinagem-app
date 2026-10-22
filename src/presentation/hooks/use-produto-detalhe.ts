import { useState, useEffect, useCallback } from 'react';
import { Produto } from '../../domain/entities/produto';
import { produtoService } from '../../application/services/produto.service';

/**
 * Hook para gerenciar a visualização e ações em um produto específico.
 */
export function useProdutoDetalhe(id: string | undefined) {
  const [produto, setProduto] = useState<Produto | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isTogglingAtivo, setIsTogglingAtivo] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadProduto = useCallback(async () => {
    if (!id || id.trim() === '') {
      setError('ID de produto inválido.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await produtoService.obterProduto(id);
      if (!data) {
        setError('Produto não encontrado.');
      } else {
        setProduto(data);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao carregar produto.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadProduto();
  }, [loadProduto]);

  const toggleAtivo = async (): Promise<boolean> => {
    if (!produto) return false;
    setIsTogglingAtivo(true);
    setError(null);
    try {
      const novoStatus = !produto.ativo;
      await produtoService.alterarAtivoProduto(produto.id, novoStatus);
      setProduto(new Produto({
        id: produto.id,
        usuarioId: produto.usuarioId,
        nome: produto.nome,
        descricao: produto.descricao,
        unidade: produto.unidade,
        precoBase: produto.precoBase,
        ativo: novoStatus,
      }));
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao alterar status do produto.';
      setError(msg);
      return false;
    } finally {
      setIsTogglingAtivo(false);
    }
  };

  return {
    produto,
    isLoading,
    isTogglingAtivo,
    error,
    reload: loadProduto,
    toggleAtivo,
  };
}
