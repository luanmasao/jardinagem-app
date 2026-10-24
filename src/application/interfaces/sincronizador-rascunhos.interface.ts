/**
 * Envio ao servidor dos rascunhos guardados no aparelho (RF85, RF86).
 */
export interface FalhaSincronizacao {
  orcamentoId: string;
  numero: string;
  mensagem: string;
  /** Falta de conexão: o rascunho continua pendente e será enviado na próxima tentativa. */
  semConexao: boolean;
}

export interface RascunhoDescartado {
  orcamentoId: string;
  numero: string;
  mensagem: string;
}

export interface RascunhoRenumerado {
  orcamentoId: string;
  numeroAnterior: string;
  numeroNovo: string;
}

export interface ResultadoSincronizacao {
  enviados: number;
  falhas: FalhaSincronizacao[];
  descartados: RascunhoDescartado[];
  renumerados: RascunhoRenumerado[];
}

export interface SincronizadorRascunhos {
  contarPendentes(): Promise<number>;
  sincronizar(): Promise<ResultadoSincronizacao>;
}
