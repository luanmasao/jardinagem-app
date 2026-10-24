import * as Crypto from 'expo-crypto';
import {
  AtualizarOrcamentoDados,
  CriarOrcamentoDados,
  OrcamentoComCliente,
  OrcamentoRepository,
  OrcamentoResumo,
} from '../../domain/repositories/orcamento.repository.interface';
import { ClienteRepository } from '../../domain/repositories/cliente.repository.interface';
import { Orcamento } from '../../domain/entities/orcamento';
import { StatusOrcamento } from '../../domain/enums/status-orcamento';
import { RegraNegocioError } from '../../domain/errors/dominio-error';
import { MENSAGEM_LEITURA_SEM_COPIA, SemConexaoError } from '../../application/errors/sem-conexao.error';
import { supabaseOrcamentoRepository } from '../repositories/supabase-orcamento.repository';
import { clienteRepositoryComCopiaLocal } from './cliente-repository-com-copia-local';
import { ehFalhaDeConexao } from './falha-de-conexao';
import { AgregadoLocal, RascunhosLocais, rascunhosLocais } from './rascunhos-locais';
import { dataValidadeParaSalvar, orcamentoDeSalvo, orcamentoParaSalvar } from './orcamento-local.mapper';

export const MENSAGEM_RN83 =
  'Este rascunho tem alterações guardadas só neste aparelho. Sincronize-o com o servidor antes de alterar o status ou excluí-lo.';

/** Número provisório de um orçamento criado sem conexão (RN82). Nunca é gravado no servidor. */
export function numeroProvisorio(orcamentoId: string): string {
  return `PROV-${orcamentoId.slice(0, 8).toUpperCase()}`;
}

/**
 * Repositório de orçamentos com rascunhos no aparelho (RNF37, RF84).
 * Criação e edição de rascunhos funcionam sem conexão; mudança de status, exclusão,
 * numeração definitiva e expiração continuam exigindo o servidor.
 */
export class OrcamentoRepositoryOffline implements OrcamentoRepository {
  constructor(
    private readonly online: OrcamentoRepository = supabaseOrcamentoRepository,
    private readonly rascunhos: RascunhosLocais = rascunhosLocais,
    private readonly clientes: ClienteRepository = clienteRepositoryComCopiaLocal
  ) {}

  async listar(usuarioId: string, filtroStatus?: StatusOrcamento): Promise<OrcamentoResumo[]> {
    const doFiltro = (r: OrcamentoResumo) => !filtroStatus || r.status === filtroStatus;
    const pendentes = (await this.rascunhos.listarPendentes()).filter((ag) => ag.orcamento.usuarioId === usuarioId);
    const copia = async () => (await this.rascunhos.lerResumos(usuarioId))?.filter(doFiltro) ?? null;

    let resumos: OrcamentoResumo[] | null = (await this.rascunhos.semRede()) ? await copia() : null;
    if (!resumos) {
      try {
        resumos = await this.online.listar(usuarioId, filtroStatus);
        if (!filtroStatus) {
          await this.rascunhos.guardarResumos(usuarioId, resumos);
          // A lista completa do servidor mostra quais cópias locais deixaram de valer.
          await this.rascunhos.removerCopiasAusentes(new Set(resumos.map((r) => r.id)));
        }
      } catch (err) {
        if (!ehFalhaDeConexao(err)) throw err;
        resumos = await copia();
        if (!resumos && pendentes.length === 0) throw new SemConexaoError(MENSAGEM_LEITURA_SEM_COPIA);
      }
    }

    // Rascunhos pendentes substituem a versão do servidor, que ainda não tem as alterações.
    const locais = pendentes.map((ag) => this.rascunhos.resumo(ag)).filter(doFiltro);
    const idsLocais = new Set(locais.map((r) => r.id));
    return [...locais, ...(resumos ?? []).filter((r) => !idsLocais.has(r.id))].sort(
      (a, b) => b.dataCriacao.getTime() - a.dataCriacao.getTime()
    );
  }

  async buscarPorId(id: string): Promise<OrcamentoComCliente | null> {
    const agregado = await this.rascunhos.obter(id);
    return this.rascunhos.ler(
      agregado ? this.rascunhos.comCliente(agregado) : undefined,
      !!agregado?.pendente,
      async () => {
        const resultado = await this.online.buscarPorId(id);
        if (resultado) {
          await this.rascunhos.guardarCopia(resultado.orcamento, {
            nome: resultado.clienteNome,
            telefone: resultado.clienteTelefone,
            email: resultado.clienteEmail,
          });
        } else if (agregado) {
          // Não existe mais no servidor (excluído em outro lugar): a cópia local deixa de valer.
          await this.removerCopia(id);
        }
        return resultado;
      }
    );
  }

  obterProximoNumero(usuarioId: string): Promise<string> {
    return this.rascunhos.somenteOnline(() => this.online.obterProximoNumero(usuarioId));
  }

  async criar(dados: CriarOrcamentoDados): Promise<Orcamento> {
    const id = dados.id ?? Crypto.randomUUID();

    if (!(await this.rascunhos.semRede())) {
      try {
        const criado = await this.online.criar({ ...dados, id });
        await this.rascunhos.guardarCopia(criado, await this.dadosDoCliente(criado.clienteId));
        return criado;
      } catch (err) {
        if (!ehFalhaDeConexao(err)) throw err;
      }
    }

    // Sem conexão: o rascunho nasce no aparelho, com o mesmo id que terá no servidor (D-OFF-03).
    const numeroInformado = dados.numero?.trim();
    const orcamento = new Orcamento({
      id,
      usuarioId: dados.usuarioId,
      clienteId: dados.clienteId,
      numero: numeroInformado || numeroProvisorio(id),
      dataValidade: dados.dataValidade ?? null,
      status: StatusOrcamento.RASCUNHO,
      tipoDesconto: dados.tipoDesconto ?? null,
      valorDesconto: dados.valorDesconto ?? 0,
      observacoes: dados.observacoes ?? null,
      condicoesPagamento: dados.condicoesPagamento ?? null,
    });
    const cliente = await this.dadosDoCliente(dados.clienteId);
    await this.rascunhos.salvar({
      orcamento: orcamentoParaSalvar(orcamento),
      clienteNome: cliente.nome,
      clienteTelefone: cliente.telefone,
      clienteEmail: cliente.email,
      pendente: true,
      criadoOffline: true,
      numeroProvisorio: !numeroInformado,
      alteradoEm: new Date().toISOString(),
    });
    return orcamento;
  }

  async atualizar(id: string, dados: AtualizarOrcamentoDados): Promise<Orcamento> {
    const resultado = await this.rascunhos.aplicar(
      id,
      () => this.online.atualizar(id, dados),
      (o, doServidor) => {
        if (doServidor) {
          Object.assign(o, orcamentoParaSalvar(doServidor));
          return;
        }
        if (dados.clienteId !== undefined) o.clienteId = dados.clienteId;
        if (dados.dataValidade !== undefined) o.dataValidade = dataValidadeParaSalvar(dados.dataValidade);
        if (dados.tipoDesconto !== undefined) o.tipoDesconto = dados.tipoDesconto;
        if (dados.valorDesconto !== undefined) o.valorDesconto = dados.valorDesconto;
        if (dados.observacoes !== undefined) o.observacoes = dados.observacoes ? dados.observacoes.trim() : null;
        if (dados.condicoesPagamento !== undefined) {
          o.condicoesPagamento = dados.condicoesPagamento ? dados.condicoesPagamento.trim() : null;
        }
        // Subtotal e total são recalculados pela entidade a partir dos itens.
      }
    );
    if (resultado.online) return resultado.resultado;

    if (dados.clienteId !== undefined) await this.atualizarDadosDoCliente(resultado.agregado);
    return orcamentoDeSalvo(resultado.agregado.orcamento);
  }

  async alterarStatus(id: string, novoStatus: StatusOrcamento): Promise<void> {
    const agregado = await this.rascunhos.obter(id);
    if (agregado?.pendente) throw new RegraNegocioError(MENSAGEM_RN83);
    await this.rascunhos.somenteOnline(() => this.online.alterarStatus(id, novoStatus));
    if (agregado) {
      await this.rascunhos.atualizarCopia(agregado, (o) => {
        o.status = novoStatus;
      });
    }
  }

  async excluir(id: string): Promise<void> {
    const agregado = await this.rascunhos.obter(id);
    if (agregado?.pendente) throw new RegraNegocioError(MENSAGEM_RN83);
    await this.rascunhos.somenteOnline(() => this.online.excluir(id));
    if (agregado) await this.removerCopia(id);
  }

  /** A cópia é só para consulta: falhar ao removê-la não interrompe a operação. */
  private async removerCopia(id: string): Promise<void> {
    try {
      await this.rascunhos.remover(id);
    } catch (err) {
      console.warn('[OrcamentoRepositoryOffline] Falha ao remover a cópia local do orçamento:', err);
    }
  }

  async expirarMeusOrcamentos(): Promise<number> {
    if (await this.rascunhos.semRede()) return 0;
    return this.online.expirarMeusOrcamentos ? this.online.expirarMeusOrcamentos() : 0;
  }

  async contarPendentesSincronizacao(): Promise<number> {
    return (await this.rascunhos.listarPendentes()).length;
  }

  private async dadosDoCliente(
    clienteId: string
  ): Promise<{ nome?: string; telefone?: string | null; email?: string | null }> {
    try {
      const cliente = await this.clientes.buscarPorId(clienteId);
      return cliente ? { nome: cliente.nome, telefone: cliente.telefone, email: cliente.email } : {};
    } catch {
      return {};
    }
  }

  private async atualizarDadosDoCliente(agregado: AgregadoLocal): Promise<void> {
    const cliente = await this.dadosDoCliente(agregado.orcamento.clienteId);
    agregado.clienteNome = cliente.nome;
    agregado.clienteTelefone = cliente.telefone;
    agregado.clienteEmail = cliente.email;
    await this.rascunhos.salvar(agregado);
  }
}

export const orcamentoRepositoryOffline = new OrcamentoRepositoryOffline();
