import { isAuthRetryableFetchError } from '@supabase/supabase-js';

/**
 * Trechos das mensagens de erro de rede vistas no Android e no supabase-js.
 * Os repositórios Supabase repassam essas mensagens dentro do próprio erro
 * (ex.: "Erro ao listar serviços: TypeError: Network request failed").
 */
const PADROES_FALHA_DE_CONEXAO = [
  'network request failed',
  'failed to fetch',
  'fetch failed',
  'connectexception',
  'unknownhostexception',
  'sockettimeoutexception',
  'unable to resolve host',
  'network is unreachable',
  'connection refused',
];

/**
 * Indica se o erro é falta de conexão com o servidor, e não um erro do próprio servidor
 * (RLS, validação, registro inexistente), que nunca deve ser mascarado pela cópia local.
 */
export function ehFalhaDeConexao(err: unknown): boolean {
  if (isAuthRetryableFetchError(err)) return true;
  const mensagem = err instanceof Error ? err.message : String(err ?? '');
  const texto = mensagem.toLowerCase();
  return PADROES_FALHA_DE_CONEXAO.some((padrao) => texto.includes(padrao));
}
