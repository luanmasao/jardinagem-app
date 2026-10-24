import { SupabaseClient } from '@supabase/supabase-js';
import {
  ResultadoSincronizacao,
  SincronizadorRascunhos,
} from '../../application/interfaces/sincronizador-rascunhos.interface';
import { OrcamentoRepository } from '../../domain/repositories/orcamento.repository.interface';
import { StatusOrcamento } from '../../domain/enums/status-orcamento';
import { arredondarMoeda } from '../../domain/calculations/moeda';
import { supabase } from '../supabase/supabase-client';
import { supabaseOrcamentoRepository } from '../repositories/supabase-orcamento.repository';
import { dominioParaGeoJson } from '../mappers/area-geojson.mapper';
import { ehFalhaDeConexao } from './falha-de-conexao';
import { AgregadoLocal, RascunhosLocais, rascunhosLocais } from './rascunhos-locais';
import { OrcamentoSalvo } from './orcamento-local.mapper';

const VIOLACAO_DE_UNICIDADE = '23505';

class ErroSupabase extends Error {
  constructor(
    operacao: string,
    erro: { message: string; code?: string },
    readonly codigo = erro.code
  ) {
    super(`${operacao}: ${erro.message}`);
  }
}

function verificar(operacao: string, erro: { message: string; code?: string } | null): void {
  if (erro) throw new ErroSupabase(operacao, erro);
}

/** Lista para o filtro "in" do PostgREST. Os ids são UUIDs gerados pelo app ou pelo banco. */
function listaPostgrest(ids: string[]): string {
  return `(${ids.join(',')})`;
}

function linhaOrcamento(o: OrcamentoSalvo, numero: string) {
  return {
    id: o.id,
    usuario_id: o.usuarioId,
    cliente_id: o.clienteId,
    numero,
    data_criacao: o.dataCriacao,
    data_validade: o.dataValidade,
    status: StatusOrcamento.RASCUNHO,
    subtotal: o.subtotal,
    tipo_desconto: o.tipoDesconto,
    valor_desconto: o.valorDesconto,
    total: o.total,
    observacoes: o.observacoes,
    condicoes_pagamento: o.condicoesPagamento,
  };
}

type Desfecho =
  | { tipo: 'enviado'; renumerado?: { de: string; para: string } }
  | { tipo: 'descartado'; numero: string };

/**
 * Envia ao Supabase os rascunhos pendentes do aparelho (seção 4 do adendo de arquitetura).
 *
 * Cada rascunho é enviado como um agregado: o orçamento, seus itens e suas áreas no servidor
 * passam a ser exatamente os do aparelho (itens e áreas removidos no aparelho são apagados).
 * Tudo é gravado pelo id gerado no app, então repetir um envio interrompido não duplica nada (RNF39).
 * As policies RLS continuam valendo: o envio usa a sessão do próprio usuário.
 */
export class SupabaseSincronizadorRascunhos implements SincronizadorRascunhos {
  constructor(
    private readonly client: SupabaseClient = supabase,
    private readonly rascunhos: RascunhosLocais = rascunhosLocais,
    private readonly orcamentos: OrcamentoRepository = supabaseOrcamentoRepository
  ) {}

  async contarPendentes(): Promise<number> {
    return (await this.rascunhos.listarPendentes()).length;
  }

  async sincronizar(): Promise<ResultadoSincronizacao> {
    const resultado: ResultadoSincronizacao = { enviados: 0, falhas: [], descartados: [], renumerados: [] };
    const pendentes = (await this.rascunhos.listarPendentes()).sort((a, b) =>
      a.orcamento.dataCriacao.localeCompare(b.orcamento.dataCriacao)
    );

    for (const agregado of pendentes) {
      const { id, numero } = agregado.orcamento;
      try {
        const desfecho = await this.enviar(agregado);
        if (desfecho.tipo === 'descartado') {
          resultado.descartados.push({
            orcamentoId: id,
            numero: desfecho.numero,
            mensagem: `O orçamento ${desfecho.numero} não é mais um rascunho no servidor. As alterações feitas no aparelho foram descartadas, porque só rascunhos podem ser editados.`,
          });
          continue;
        }
        resultado.enviados++;
        if (desfecho.renumerado) {
          resultado.renumerados.push({
            orcamentoId: id,
            numeroAnterior: desfecho.renumerado.de,
            numeroNovo: desfecho.renumerado.para,
          });
        }
      } catch (err) {
        const semConexao = ehFalhaDeConexao(err);
        resultado.falhas.push({
          orcamentoId: id,
          numero,
          semConexao,
          mensagem: err instanceof Error ? err.message : String(err),
        });
        // Sem conexão, os demais também falhariam; ficam para a próxima tentativa.
        if (semConexao) break;
      }
    }
    return resultado;
  }

  private async enviar(agregado: AgregadoLocal): Promise<Desfecho> {
    const o = agregado.orcamento;
    const alteradoNoInicio = agregado.alteradoEm;

    const { data: noServidor, error: erroConsulta } = await this.client
      .from('orcamento')
      .select('id, status, numero')
      .eq('id', o.id)
      .maybeSingle();
    verificar('Erro ao consultar o orçamento no servidor', erroConsulta);

    // RN65: um orçamento que saiu de RASCUNHO no servidor não pode ser editado; prevalece o servidor.
    if (noServidor && noServidor.status !== StatusOrcamento.RASCUNHO) {
      await this.substituirPelaVersaoDoServidor(o.id);
      return { tipo: 'descartado', numero: noServidor.numero };
    }

    // RN82: o número definitivo é atribuído agora. Se um envio anterior já gravou o orçamento,
    // reaproveita o número que ele recebeu.
    let numero = o.numero;
    if (agregado.numeroProvisorio) {
      numero = noServidor?.numero ?? (await this.orcamentos.obterProximoNumero(o.usuarioId));
    }

    let renumerado: { de: string; para: string } | undefined;
    try {
      await this.gravarOrcamento(o, numero);
    } catch (err) {
      if (!(err instanceof ErroSupabase && err.codigo === VIOLACAO_DE_UNICIDADE)) throw err;
      // RN22: o número já existe para o usuário (informado offline ou atribuído em paralelo).
      const novo = await this.orcamentos.obterProximoNumero(o.usuarioId);
      await this.gravarOrcamento(o, novo);
      if (!agregado.numeroProvisorio) renumerado = { de: numero, para: novo };
      numero = novo;
    }

    await this.gravarItensEAreas(o);

    const atual = await this.rascunhos.obter(o.id);
    if (atual && atual.alteradoEm !== alteradoNoInicio) {
      // Editado durante o envio: mantém pendente para enviar a nova versão na próxima vez.
      atual.orcamento.numero = numero;
      atual.numeroProvisorio = false;
      atual.criadoOffline = false;
      await this.rascunhos.salvar(atual);
    } else {
      await this.substituirPelaVersaoDoServidor(o.id);
    }
    return { tipo: 'enviado', renumerado };
  }

  private async gravarOrcamento(o: OrcamentoSalvo, numero: string): Promise<void> {
    const { error } = await this.client.from('orcamento').upsert(linhaOrcamento(o, numero), { onConflict: 'id' });
    verificar('Erro ao enviar o orçamento', error);
  }

  private async gravarItensEAreas(o: OrcamentoSalvo): Promise<void> {
    const idsItens = o.itens.map((i) => i.id);

    // Itens removidos no aparelho (as áreas deles caem em cascata).
    let removerItens = this.client.from('item_orcamento').delete().eq('orcamento_id', o.id);
    if (idsItens.length > 0) removerItens = removerItens.not('id', 'in', listaPostgrest(idsItens));
    verificar('Erro ao remover itens do orçamento', (await removerItens).error);

    if (idsItens.length === 0) return;

    const { error: erroItens } = await this.client.from('item_orcamento').upsert(
      o.itens.map((i) => ({
        id: i.id,
        orcamento_id: o.id,
        tipo: i.tipo,
        servico_id: i.servicoId,
        produto_id: i.produtoId,
        descricao: i.descricao,
        quantidade: i.quantidade,
        unidade: i.unidade,
        valor_unitario: i.valorUnitario,
        valor_total: i.valorTotal,
        usa_medicao_area: i.usaMedicaoArea,
      })),
      { onConflict: 'id' }
    );
    verificar('Erro ao enviar os itens do orçamento', erroItens);

    // Áreas removidas no aparelho, nos itens que continuam no orçamento.
    const areas = o.itens.flatMap((i) => i.areas);
    let removerAreas = this.client.from('area').delete().in('item_orcamento_id', idsItens);
    if (areas.length > 0) removerAreas = removerAreas.not('id', 'in', listaPostgrest(areas.map((a) => a.id)));
    verificar('Erro ao remover áreas do orçamento', (await removerAreas).error);

    if (areas.length === 0) return;

    const { error: erroAreas } = await this.client.from('area').upsert(
      areas.map((a) => ({
        id: a.id,
        item_orcamento_id: a.itemOrcamentoId,
        nome: a.nome,
        geometria: dominioParaGeoJson(a.geometria),
        area_calculada: arredondarMoeda(a.areaCalculada),
        unidade: a.unidade,
        observacoes: a.observacoes,
      })),
      { onConflict: 'id' }
    );
    verificar('Erro ao enviar as áreas do orçamento', erroAreas);
  }

  /** Troca o rascunho local pela versão do servidor, que passa a ser a cópia para consulta. */
  private async substituirPelaVersaoDoServidor(orcamentoId: string): Promise<void> {
    const doServidor = await this.orcamentos.buscarPorId(orcamentoId);
    await this.rascunhos.remover(orcamentoId);
    if (doServidor) {
      await this.rascunhos.guardarCopia(doServidor.orcamento, {
        nome: doServidor.clienteNome,
        telefone: doServidor.clienteTelefone,
        email: doServidor.clienteEmail,
      });
    }
  }
}

export const supabaseSincronizadorRascunhos = new SupabaseSincronizadorRascunhos();
