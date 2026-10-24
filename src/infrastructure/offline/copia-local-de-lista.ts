import {
  ArmazenamentoLocal,
  CHAVE_IDENTIDADE_LOCAL,
  prefixoLocalDoUsuario,
} from '../../application/interfaces/armazenamento-local.interface';
import {
  MENSAGEM_ESCRITA_SEM_CONEXAO,
  MENSAGEM_LEITURA_SEM_COPIA,
  SemConexaoError,
} from '../../application/errors/sem-conexao.error';
import { ConectividadeProvider } from '../../application/interfaces/conectividade-provider.interface';
import { ehFalhaDeConexao } from './falha-de-conexao';

interface EntidadeDoUsuario {
  id: string;
  usuarioId: string;
}

/**
 * Cópia local da lista de uma entidade do usuário (catálogo e clientes, RNF36/RF83).
 *
 * - Leitura com conexão: busca no servidor e guarda a lista como "última cópia obtida".
 * - Leitura sem conexão: devolve a cópia; sem cópia, informa o usuário.
 * - Escrita: continua exigindo conexão; sem conexão, a falha vira uma mensagem clara.
 *   Após uma escrita bem-sucedida, a cópia é atualizada para não ficar defasada.
 * - Erros do servidor que não são de conexão são repassados sem alteração.
 * - Quando o sistema já informa que não há rede, as leituras vão direto à cópia, sem esperar
 *   a requisição falhar (num celular sem sinal, a falha pode demorar até o timeout).
 */
export class CopiaLocalDeLista<T extends EntidadeDoUsuario> {
  constructor(
    private readonly armazenamento: ArmazenamentoLocal,
    private readonly recurso: string,
    private readonly reconstruir: (salvo: any) => T,
    private readonly conectividade?: ConectividadeProvider
  ) {}

  /** true quando o sistema informa que não há rede. */
  async semRede(): Promise<boolean> {
    return this.conectividade ? !(await this.conectividade.estaOnline()) : false;
  }

  async listar(usuarioId: string, buscarOnline: () => Promise<T[]>): Promise<T[]> {
    if (await this.semRede()) {
      const copia = await this.lerCopia(usuarioId);
      if (copia) return copia;
    }
    try {
      const lista = await buscarOnline();
      await this.gravarCopia(usuarioId, lista);
      return lista;
    } catch (err) {
      if (!ehFalhaDeConexao(err)) throw err;
      const copia = await this.lerCopia(usuarioId);
      if (!copia) throw new SemConexaoError(MENSAGEM_LEITURA_SEM_COPIA);
      return copia;
    }
  }

  async buscarPorId(id: string, buscarOnline: () => Promise<T | null>): Promise<T | null> {
    if (await this.semRede()) {
      const copia = await this.copiaDoUsuarioAtual();
      if (copia) return copia.find((item) => item.id === id) ?? null;
    }
    try {
      const item = await buscarOnline();
      if (item) await this.guardarItem(item);
      return item;
    } catch (err) {
      if (!ehFalhaDeConexao(err)) throw err;
      const copia = await this.copiaDoUsuarioAtual();
      if (!copia) throw new SemConexaoError(MENSAGEM_LEITURA_SEM_COPIA);
      return copia.find((item) => item.id === id) ?? null;
    }
  }

  /** Executa uma escrita no servidor, traduzindo a falta de conexão para uma mensagem clara. */
  async escrever<R>(operacao: () => Promise<R>): Promise<R> {
    try {
      return await operacao();
    } catch (err) {
      if (ehFalhaDeConexao(err)) throw new SemConexaoError(MENSAGEM_ESCRITA_SEM_CONEXAO);
      throw err;
    }
  }

  /** Insere ou substitui o item na cópia local, se ela já existir. */
  async guardarItem(item: T): Promise<void> {
    const copia = await this.lerCopia(item.usuarioId);
    if (!copia) return;
    const indice = copia.findIndex((atual) => atual.id === item.id);
    if (indice >= 0) copia[indice] = item;
    else copia.push(item);
    await this.gravarCopia(item.usuarioId, copia);
  }

  /** Aplica uma alteração já confirmada pelo servidor ao item da cópia local. */
  async alterarItem(id: string, alterar: (item: T) => void): Promise<void> {
    const usuarioId = await this.usuarioAtual();
    if (!usuarioId) return;
    const copia = await this.lerCopia(usuarioId);
    const item = copia?.find((atual) => atual.id === id);
    if (!copia || !item) return;
    alterar(item);
    await this.gravarCopia(usuarioId, copia);
  }

  private chave(usuarioId: string): string {
    return `${prefixoLocalDoUsuario(usuarioId)}${this.recurso}`;
  }

  private async lerCopia(usuarioId: string): Promise<T[] | null> {
    try {
      const salvos = await this.armazenamento.ler<unknown[]>(this.chave(usuarioId));
      return salvos ? salvos.map(this.reconstruir) : null;
    } catch (err) {
      console.warn(`[CopiaLocalDeLista] Cópia local de "${this.recurso}" ilegível:`, err);
      return null;
    }
  }

  /** A cópia é uma melhoria de disponibilidade: falhar ao gravá-la não interrompe a operação online. */
  private async gravarCopia(usuarioId: string, lista: T[]): Promise<void> {
    try {
      await this.armazenamento.gravar(this.chave(usuarioId), lista);
    } catch (err) {
      console.warn(`[CopiaLocalDeLista] Falha ao gravar a cópia local de "${this.recurso}":`, err);
    }
  }

  private async copiaDoUsuarioAtual(): Promise<T[] | null> {
    const usuarioId = await this.usuarioAtual();
    return usuarioId ? this.lerCopia(usuarioId) : null;
  }

  private async usuarioAtual(): Promise<string | null> {
    try {
      const identidade = await this.armazenamento.ler<{ id: string }>(CHAVE_IDENTIDADE_LOCAL);
      return identidade?.id ?? null;
    } catch {
      return null;
    }
  }
}
