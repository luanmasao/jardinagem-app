/**
 * Estado de conexão do dispositivo (D-OFF-08).
 * Serve para avisar o usuário (RNF40) e disparar a sincronização ao reconectar (RF85).
 * É uma indicação: a falha real de uma requisição continua sendo tratada por quem a faz.
 */
export interface ConectividadeProvider {
  estaOnline(): Promise<boolean>;
  /** Notifica cada mudança de estado. Devolve a função que cancela a observação. */
  observar(callback: (online: boolean) => void): () => void;
}
