import {
  ArmazenamentoLocal,
  CHAVE_IDENTIDADE_LOCAL,
  prefixoLocalDoUsuario,
} from '../../application/interfaces/armazenamento-local.interface';
import { ConectividadeProvider } from '../../application/interfaces/conectividade-provider.interface';
import {
  MENSAGEM_ESCRITA_SEM_CONEXAO,
  MENSAGEM_LEITURA_SEM_COPIA,
  SemConexaoError,
} from '../../application/errors/sem-conexao.error';
import { OrcamentoComCliente, OrcamentoResumo } from '../../domain/repositories/orcamento.repository.interface';
import { Orcamento } from '../../domain/entities/orcamento';
import { ehFalhaDeConexao } from './falha-de-conexao';
import { armazenamentoLocal } from './armazenamento-local-cifrado';
import { conectividadeProvider } from './expo-network-conectividade.provider';
import { AreaSalva, ItemSalvo, OrcamentoSalvo, orcamentoDeSalvo, orcamentoParaSalvar } from './orcamento-local.mapper';

/**
 * Orçamento completo (itens e áreas) guardado no aparelho (D-OFF-02).
 *
 * - `pendente: false`: cópia do que veio do servidor, usada para consulta e como ponto de
 *   partida de edições sem conexão.
 * - `pendente: true`: rascunho com alterações feitas no aparelho, ainda não enviadas (RNF37).
 *   A marca é técnica e não é um status do orçamento (RN84).
 */
export interface AgregadoLocal {
  orcamento: OrcamentoSalvo;
  clienteNome?: string;
  clienteTelefone?: string | null;
  clienteEmail?: string | null;
  pendente: boolean;
  /** Criado sem conexão: ainda não existe no servidor. */
  criadoOffline: boolean;
  /** O número é provisório e o definitivo será atribuído na sincronização (RN82). */
  numeroProvisorio: boolean;
  alteradoEm: string;
}

export const MENSAGEM_SEM_COPIA_DO_ORCAMENTO =
  'Sem conexão com o servidor e este orçamento ainda não foi aberto com conexão neste aparelho.';

/**
 * Armazena os orçamentos no aparelho e decide, a cada operação, entre o servidor e a cópia local:
 *
 * - rascunho com pendências: tudo acontece no aparelho, até a sincronização;
 * - sem rede (ou falha de conexão no meio da operação): a alteração é aplicada sobre a cópia
 *   local, que passa a ser um rascunho pendente;
 * - com rede: a operação vai ao servidor e a mesma alteração é aplicada à cópia local,
 *   para que ela não fique defasada caso a conexão caia em seguida.
 */
export class RascunhosLocais {
  constructor(
    private readonly armazenamento: ArmazenamentoLocal,
    private readonly conectividade?: ConectividadeProvider
  ) {}

  async semRede(): Promise<boolean> {
    return this.conectividade ? !(await this.conectividade.estaOnline()) : false;
  }

  // ---------------------------------------------------------------------------
  // Leitura e gravação dos agregados
  // ---------------------------------------------------------------------------

  async obter(orcamentoId: string): Promise<AgregadoLocal | null> {
    const usuarioId = await this.usuarioAtual();
    if (!usuarioId) return null;
    try {
      return await this.armazenamento.ler<AgregadoLocal>(this.chaveAgregado(usuarioId, orcamentoId));
    } catch (err) {
      console.warn('[RascunhosLocais] Orçamento local ilegível:', err);
      return null;
    }
  }

  async listar(): Promise<AgregadoLocal[]> {
    const usuarioId = await this.usuarioAtual();
    if (!usuarioId) return [];
    const ids = (await this.lerIndice(usuarioId)) ?? [];
    const agregados = await Promise.all(ids.map((id) => this.obter(id)));
    return agregados.filter((ag): ag is AgregadoLocal => ag !== null);
  }

  async listarPendentes(): Promise<AgregadoLocal[]> {
    return (await this.listar()).filter((ag) => ag.pendente);
  }

  /** Grava um rascunho pendente. Falhas são propagadas, para nunca perder um rascunho em silêncio (RNF39). */
  async salvar(agregado: AgregadoLocal): Promise<void> {
    const usuarioId = agregado.orcamento.usuarioId;
    await this.armazenamento.gravar(this.chaveAgregado(usuarioId, agregado.orcamento.id), agregado);
    const ids = (await this.lerIndice(usuarioId)) ?? [];
    if (!ids.includes(agregado.orcamento.id)) {
      await this.armazenamento.gravar(this.chaveIndice(usuarioId), [...ids, agregado.orcamento.id]);
    }
  }

  /** Guarda a cópia do servidor, sem sobrescrever um rascunho pendente. Falhas apenas são registradas. */
  async guardarCopia(
    orcamento: Orcamento,
    cliente: { nome?: string; telefone?: string | null; email?: string | null } = {}
  ): Promise<void> {
    try {
      const atual = await this.obter(orcamento.id);
      if (atual?.pendente) return;
      await this.salvar({
        orcamento: orcamentoParaSalvar(orcamento),
        clienteNome: cliente.nome ?? atual?.clienteNome,
        clienteTelefone: cliente.telefone ?? atual?.clienteTelefone,
        clienteEmail: cliente.email ?? atual?.clienteEmail,
        pendente: false,
        criadoOffline: false,
        numeroProvisorio: false,
        alteradoEm: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('[RascunhosLocais] Falha ao guardar a cópia local do orçamento:', err);
    }
  }

  async remover(orcamentoId: string): Promise<void> {
    const usuarioId = await this.usuarioAtual();
    if (!usuarioId) return;
    await this.armazenamento.remover(this.chaveAgregado(usuarioId, orcamentoId));
    const ids = (await this.lerIndice(usuarioId)) ?? [];
    await this.armazenamento.gravar(
      this.chaveIndice(usuarioId),
      ids.filter((id) => id !== orcamentoId)
    );
  }

  /**
   * Remove as cópias de consulta de orçamentos que não estão mais no servidor
   * (excluídos em outro lugar). Rascunhos pendentes nunca são removidos aqui.
   */
  async removerCopiasAusentes(idsNoServidor: Set<string>): Promise<void> {
    try {
      for (const agregado of await this.listar()) {
        if (!agregado.pendente && !idsNoServidor.has(agregado.orcamento.id)) {
          await this.remover(agregado.orcamento.id);
        }
      }
    } catch (err) {
      console.warn('[RascunhosLocais] Falha ao limpar cópias locais de orçamentos excluídos:', err);
    }
  }

  async localizarItem(itemId: string): Promise<{ agregado: AgregadoLocal; item: ItemSalvo } | null> {
    for (const agregado of await this.listar()) {
      const item = agregado.orcamento.itens.find((i) => i.id === itemId);
      if (item) return { agregado, item };
    }
    return null;
  }

  async localizarArea(
    areaId: string
  ): Promise<{ agregado: AgregadoLocal; item: ItemSalvo; area: AreaSalva } | null> {
    for (const agregado of await this.listar()) {
      for (const item of agregado.orcamento.itens) {
        const area = item.areas.find((a) => a.id === areaId);
        if (area) return { agregado, item, area };
      }
    }
    return null;
  }

  // ---------------------------------------------------------------------------
  // Resumos da listagem (orçamentos já carregados, para consulta sem conexão)
  // ---------------------------------------------------------------------------

  async guardarResumos(usuarioId: string, resumos: OrcamentoResumo[]): Promise<void> {
    try {
      await this.armazenamento.gravar(this.chaveResumos(usuarioId), resumos);
    } catch (err) {
      console.warn('[RascunhosLocais] Falha ao guardar a lista local de orçamentos:', err);
    }
  }

  async lerResumos(usuarioId: string): Promise<OrcamentoResumo[] | null> {
    try {
      const salvos = await this.armazenamento.ler<any[]>(this.chaveResumos(usuarioId));
      return salvos
        ? salvos.map((r) => ({
            ...r,
            dataCriacao: new Date(r.dataCriacao),
            dataValidade: r.dataValidade ? new Date(r.dataValidade) : null,
          }))
        : null;
    } catch (err) {
      console.warn('[RascunhosLocais] Lista local de orçamentos ilegível:', err);
      return null;
    }
  }

  // ---------------------------------------------------------------------------
  // Decisão entre servidor e aparelho
  // ---------------------------------------------------------------------------

  /**
   * Leitura: rascunho pendente ou sem rede usam a cópia local; com rede, o servidor;
   * falha de conexão volta para a cópia local, se houver.
   */
  async ler<R>(local: R | undefined, pendente: boolean, online: () => Promise<R>): Promise<R> {
    if (local !== undefined && (pendente || (await this.semRede()))) return local;
    try {
      return await online();
    } catch (err) {
      if (!ehFalhaDeConexao(err)) throw err;
      if (local !== undefined) return local;
      throw new SemConexaoError(MENSAGEM_LEITURA_SEM_COPIA);
    }
  }

  /**
   * Alteração de um orçamento editável.
   * `mutar` aplica a alteração aos dados guardados; recebe o resultado do servidor quando a
   * operação foi online, para manter a cópia local igual ao servidor.
   * Devolve o resultado do servidor (online) ou o agregado local já alterado (offline).
   */
  async aplicar<R>(
    orcamentoId: string,
    online: () => Promise<R>,
    mutar: (orcamento: OrcamentoSalvo, resultadoOnline?: R) => void
  ): Promise<{ online: true; resultado: R } | { online: false; agregado: AgregadoLocal }> {
    const agregado = await this.obter(orcamentoId);

    if (!agregado?.pendente && !(await this.semRede())) {
      try {
        const resultado = await online();
        if (agregado) await this.atualizarCopia(agregado, (o) => mutar(o, resultado));
        return { online: true, resultado };
      } catch (err) {
        if (!ehFalhaDeConexao(err)) throw err;
      }
    }

    if (!agregado) throw new SemConexaoError(MENSAGEM_SEM_COPIA_DO_ORCAMENTO);
    mutar(agregado.orcamento);
    agregado.orcamento = this.normalizar(agregado.orcamento);
    agregado.pendente = true;
    agregado.alteradoEm = new Date().toISOString();
    await this.salvar(agregado);
    return { online: false, agregado };
  }

  /** Operação que só existe no servidor: sem rede, falha logo com mensagem clara. */
  async somenteOnline<R>(online: () => Promise<R>): Promise<R> {
    if (await this.semRede()) throw new SemConexaoError(MENSAGEM_ESCRITA_SEM_CONEXAO);
    try {
      return await online();
    } catch (err) {
      if (ehFalhaDeConexao(err)) throw new SemConexaoError(MENSAGEM_ESCRITA_SEM_CONEXAO);
      throw err;
    }
  }

  /** Aplica à cópia local uma alteração já confirmada pelo servidor. Falhas apenas são registradas. */
  async atualizarCopia(agregado: AgregadoLocal, mutar: (orcamento: OrcamentoSalvo) => void): Promise<void> {
    try {
      mutar(agregado.orcamento);
      agregado.orcamento = this.normalizar(agregado.orcamento);
      agregado.alteradoEm = new Date().toISOString();
      await this.salvar(agregado);
    } catch (err) {
      console.warn('[RascunhosLocais] Falha ao atualizar a cópia local do orçamento:', err);
    }
  }

  // ---------------------------------------------------------------------------
  // Conversões
  // ---------------------------------------------------------------------------

  comCliente(agregado: AgregadoLocal): OrcamentoComCliente {
    return {
      orcamento: orcamentoDeSalvo(agregado.orcamento),
      clienteNome: agregado.clienteNome,
      clienteTelefone: agregado.clienteTelefone,
      clienteEmail: agregado.clienteEmail,
      pendenteSincronizacao: agregado.pendente,
    };
  }

  resumo(agregado: AgregadoLocal): OrcamentoResumo {
    const o = orcamentoDeSalvo(agregado.orcamento);
    return {
      id: o.id,
      usuarioId: o.usuarioId,
      clienteId: o.clienteId,
      clienteNome: agregado.clienteNome ?? 'Cliente não identificado',
      numero: o.numero,
      dataCriacao: o.dataCriacao,
      dataValidade: o.dataValidade,
      status: o.status,
      subtotal: o.subtotal,
      tipoDesconto: o.tipoDesconto,
      valorDesconto: o.valorDesconto,
      total: o.total,
      totalItens: o.itens.length,
      pendenteSincronizacao: agregado.pendente,
    };
  }

  /** Reconstrói pela entidade: valida a alteração e recalcula quantidades e totais (RNF19). */
  private normalizar(orcamento: OrcamentoSalvo): OrcamentoSalvo {
    return orcamentoParaSalvar(orcamentoDeSalvo(orcamento));
  }

  private async lerIndice(usuarioId: string): Promise<string[] | null> {
    try {
      return await this.armazenamento.ler<string[]>(this.chaveIndice(usuarioId));
    } catch (err) {
      console.warn('[RascunhosLocais] Índice local de orçamentos ilegível:', err);
      return null;
    }
  }

  private chaveAgregado(usuarioId: string, orcamentoId: string): string {
    return `${prefixoLocalDoUsuario(usuarioId)}orcamento.${orcamentoId}`;
  }

  private chaveIndice(usuarioId: string): string {
    return `${prefixoLocalDoUsuario(usuarioId)}orcamentos.indice`;
  }

  private chaveResumos(usuarioId: string): string {
    return `${prefixoLocalDoUsuario(usuarioId)}orcamentos.resumo`;
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

/** Instância única: orçamento, item e área precisam enxergar os mesmos rascunhos. */
export const rascunhosLocais = new RascunhosLocais(armazenamentoLocal, conectividadeProvider);
