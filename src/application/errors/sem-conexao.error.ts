/**
 * Operação que precisa do servidor foi tentada sem conexão (RNF40: informar o usuário).
 * A mensagem é exibida diretamente nas telas.
 */
export class SemConexaoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SemConexaoError';
  }
}

export const MENSAGEM_LEITURA_SEM_COPIA =
  'Sem conexão com o servidor e ainda não há uma cópia destes dados no aparelho. Conecte-se à internet para carregá-los pela primeira vez.';

export const MENSAGEM_ESCRITA_SEM_CONEXAO =
  'Sem conexão com o servidor. Esta alteração precisa de internet; tente novamente quando a conexão voltar.';
