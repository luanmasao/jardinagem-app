/**
 * Armazenamento local de dados para operação sem conexão (RNF36–RNF39).
 * Os valores são serializados em JSON. Falhas de gravação são propagadas ao chamador,
 * para que um rascunho nunca seja perdido em silêncio (RNF39).
 */
export interface ArmazenamentoLocal {
  ler<T>(chave: string): Promise<T | null>;
  gravar<T>(chave: string, valor: T): Promise<void>;
  remover(chave: string): Promise<void>;
  /** Remove todas as entradas cuja chave começa com o prefixo informado. */
  removerPorPrefixo(prefixo: string): Promise<void>;
}

/** Chave da última identidade autenticada no dispositivo (D-OFF-07). */
export const CHAVE_IDENTIDADE_LOCAL = 'offline.identidade';

/**
 * Prefixo das chaves de dados locais de um usuário.
 * Separar por usuário permite apagar tudo dele no logout (RNF38).
 */
export function prefixoLocalDoUsuario(usuarioId: string): string {
  return `offline.${usuarioId}.`;
}
