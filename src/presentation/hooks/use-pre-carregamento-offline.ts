import { useEffect } from 'react';
import { servicoService } from '../../application/services/servico.service';
import { produtoService } from '../../application/services/produto.service';
import { clienteService } from '../../application/services/cliente.service';

/**
 * Atualiza a cópia local do catálogo e dos clientes sempre que o app está online (RNF36),
 * para que estejam disponíveis offline mesmo que o usuário não tenha aberto essas telas.
 * Roda ao entrar no app e a cada vez que a conexão volta.
 */
export function usePreCarregamentoOffline(online: boolean): void {
  useEffect(() => {
    if (!online) return;
    Promise.allSettled([
      servicoService.listarServicos(),
      produtoService.listarProdutos(),
      clienteService.listarClientes(),
    ]).then((resultados) => {
      const falhas = resultados.filter((r) => r.status === 'rejected');
      if (falhas.length > 0) {
        console.warn('[PreCarregamentoOffline] Algumas cópias locais não foram atualizadas:', falhas);
      }
    });
  }, [online]);
}
