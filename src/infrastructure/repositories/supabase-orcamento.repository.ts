import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../supabase/supabase-client';
import {
  OrcamentoRepository,
  CriarOrcamentoDados,
  AtualizarOrcamentoDados,
  OrcamentoResumo,
  OrcamentoComCliente,
} from '../../domain/repositories/orcamento.repository.interface';
import { Orcamento } from '../../domain/entities/orcamento';
import { ItemOrcamento } from '../../domain/entities/item-orcamento';
import { Area } from '../../domain/entities/area';
import { StatusOrcamento } from '../../domain/enums/status-orcamento';
import { TipoDesconto } from '../../domain/enums/tipo-desconto';
import { TipoItem } from '../../domain/enums/tipo-item';
import { mapAreaRow } from '../mappers/area-geojson.mapper';

/**
 * Mapeia registro de item_orcamento para a entidade ItemOrcamento.
 * Hidrata item.areas automaticamente quando registros de área forem retornados pelo PostgREST (DECISÃO-AREA-04).
 */
function mapItem(data: any): ItemOrcamento {
  const areas: Area[] = Array.isArray(data.area)
    ? data.area
        .map(mapAreaRow)
        .sort((a: Area, b: Area) => a.id.localeCompare(b.id))
    : [];

  return new ItemOrcamento({
    id: data.id,
    orcamentoId: data.orcamento_id,
    tipo: data.tipo as TipoItem,
    servicoId: data.servico_id ?? null,
    produtoId: data.produto_id ?? null,
    descricao: data.descricao,
    quantidade: Number(data.quantidade),
    unidade: data.unidade,
    valorUnitario: Number(data.valor_unitario),
    valorTotal: Number(data.valor_total),
    usaMedicaoArea: Boolean(data.usa_medicao_area),
    areas,
  });
}

/**
 * Mapeia registro da tabela orcamento para a entidade Orcamento.
 */
function mapOrcamento(data: any, itensData: any[] = []): Orcamento {
  const itens = itensData.map(mapItem);
  return new Orcamento({
    id: data.id,
    usuarioId: data.usuario_id,
    clienteId: data.cliente_id,
    numero: data.numero,
    dataCriacao: new Date(data.data_criacao),
    dataValidade: data.data_validade ? new Date(data.data_validade + 'T00:00:00') : null,
    status: data.status as StatusOrcamento,
    subtotal: Number(data.subtotal),
    tipoDesconto: (data.tipo_desconto as TipoDesconto) ?? null,
    valorDesconto: Number(data.valor_desconto),
    total: Number(data.total),
    observacoes: data.observacoes ?? null,
    condicoesPagamento: data.condicoes_pagamento ?? null,
    itens,
  });
}

/**
 * Implementação do repositório de orçamentos utilizando Supabase PostgREST.
 * Centraliza o acesso aos dados em conformidade com as policies RLS homologadas.
 * Nunca utiliza service_role.
 */
export class SupabaseOrcamentoRepository implements OrcamentoRepository {
  constructor(private readonly client: SupabaseClient = supabase) {}

  /**
   * Lista todos os orçamentos do usuário autenticado com dados resumidos do cliente.
   */
  async listar(usuarioId: string, filtroStatus?: StatusOrcamento): Promise<OrcamentoResumo[]> {
    let query = this.client
      .from('orcamento')
      .select(`
        id,
        usuario_id,
        cliente_id,
        numero,
        data_criacao,
        data_validade,
        status,
        subtotal,
        tipo_desconto,
        valor_desconto,
        total,
        cliente:cliente_id (id, nome),
        item_orcamento (id)
      `)
      .eq('usuario_id', usuarioId)
      .order('data_criacao', { ascending: false });

    if (filtroStatus) {
      query = query.eq('status', filtroStatus);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Erro ao listar orçamentos: ${error.message}`);
    }

    return (data || []).map((row: any) => {
      const clienteNome = row.cliente?.nome ?? 'Cliente não identificado';
      const totalItens = Array.isArray(row.item_orcamento) ? row.item_orcamento.length : 0;
      return {
        id: row.id,
        usuarioId: row.usuario_id,
        clienteId: row.cliente_id,
        clienteNome,
        numero: row.numero,
        dataCriacao: new Date(row.data_criacao),
        dataValidade: row.data_validade ? new Date(row.data_validade + 'T00:00:00') : null,
        status: row.status as StatusOrcamento,
        subtotal: Number(row.subtotal),
        tipoDesconto: (row.tipo_desconto as TipoDesconto) ?? null,
        valorDesconto: Number(row.valor_desconto),
        total: Number(row.total),
        totalItens,
      };
    });
  }

  /**
   * Busca um orçamento pelo ID com seus itens e dados do cliente.
   */
  async buscarPorId(id: string): Promise<OrcamentoComCliente | null> {
    const { data, error } = await this.client
      .from('orcamento')
      .select(`
        *,
        cliente:cliente_id (id, nome, telefone, email),
        item_orcamento (*, area (*))
      `)
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new Error(`Erro ao buscar orçamento por ID: ${error.message}`);
    }

    if (!data) return null;

    const itensData = Array.isArray(data.item_orcamento) ? data.item_orcamento : [];
    const orcamento = mapOrcamento(data, itensData);

    return {
      orcamento,
      clienteNome: data.cliente?.nome,
      clienteTelefone: data.cliente?.telefone,
      clienteEmail: data.cliente?.email,
    };
  }

  /**
   * Gera o próximo número único sequencial para o usuário (ex: ORC-2026-001).
   */
  async obterProximoNumero(usuarioId: string): Promise<string> {
    const ano = new Date().getFullYear();
    const { count, error } = await this.client
      .from('orcamento')
      .select('id', { count: 'exact', head: true })
      .eq('usuario_id', usuarioId);

    if (error) {
      throw new Error(`Erro ao obter contagem de orçamentos: ${error.message}`);
    }

    const seq = (count ?? 0) + 1;
    let candidato = `ORC-${ano}-${String(seq).padStart(3, '0')}`;

    // Verificação defensiva de colisão
    const { data: existente } = await this.client
      .from('orcamento')
      .select('id')
      .eq('usuario_id', usuarioId)
      .eq('numero', candidato)
      .maybeSingle();

    if (!existente) {
      return candidato;
    }

    let s = seq + 1;
    while (true) {
      const num = `ORC-${ano}-${String(s).padStart(3, '0')}`;
      const { data: ex } = await this.client
        .from('orcamento')
        .select('id')
        .eq('usuario_id', usuarioId)
        .eq('numero', num)
        .maybeSingle();
      if (!ex) return num;
      s++;
    }
  }

  /**
   * Cria um novo orçamento no status RASCUNHO.
   */
  async criar(dados: CriarOrcamentoDados): Promise<Orcamento> {
    const numero = dados.numero ? dados.numero.trim() : await this.obterProximoNumero(dados.usuarioId);

    const payload = {
      ...(dados.id ? { id: dados.id } : {}),
      usuario_id: dados.usuarioId,
      cliente_id: dados.clienteId,
      numero,
      data_validade: dados.dataValidade ? dados.dataValidade.toISOString().split('T')[0] : null,
      status: StatusOrcamento.RASCUNHO,
      subtotal: 0,
      tipo_desconto: dados.tipoDesconto ?? null,
      valor_desconto: dados.valorDesconto ?? 0,
      total: 0,
      observacoes: dados.observacoes ? dados.observacoes.trim() : null,
      condicoes_pagamento: dados.condicoesPagamento ? dados.condicoesPagamento.trim() : null,
    };

    const { data, error } = await this.client
      .from('orcamento')
      .insert(payload)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao criar orçamento: ${error.message}`);
    }

    return mapOrcamento(data, []);
  }

  /**
   * Atualiza dados de um orçamento (permitido somente em RASCUNHO pelo domínio).
   */
  async atualizar(id: string, dados: AtualizarOrcamentoDados): Promise<Orcamento> {
    const payload: any = {};
    if (dados.clienteId !== undefined) payload.cliente_id = dados.clienteId;
    if (dados.dataValidade !== undefined) {
      payload.data_validade = dados.dataValidade ? dados.dataValidade.toISOString().split('T')[0] : null;
    }
    if (dados.tipoDesconto !== undefined) payload.tipo_desconto = dados.tipoDesconto;
    if (dados.valorDesconto !== undefined) payload.valor_desconto = dados.valorDesconto;
    if (dados.subtotal !== undefined) payload.subtotal = dados.subtotal;
    if (dados.total !== undefined) payload.total = dados.total;
    if (dados.observacoes !== undefined) payload.observacoes = dados.observacoes ? dados.observacoes.trim() : null;
    if (dados.condicoesPagamento !== undefined) payload.condicoes_pagamento = dados.condicoesPagamento ? dados.condicoesPagamento.trim() : null;

    const { data, error } = await this.client
      .from('orcamento')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar orçamento: ${error.message}`);
    }

    // Busca itens para retornar a entidade íntegra
    const { data: itensData } = await this.client
      .from('item_orcamento')
      .select('*, area (*)')
      .eq('orcamento_id', id);

    return mapOrcamento(data, itensData || []);
  }

  /**
   * Altera o status do orçamento no banco.
   */
  async alterarStatus(id: string, novoStatus: StatusOrcamento): Promise<void> {
    const { error } = await this.client
      .from('orcamento')
      .update({ status: novoStatus })
      .eq('id', id);

    if (error) {
      throw new Error(`Erro ao alterar status do orçamento: ${error.message}`);
    }
  }

  /**
   * Exclui um orçamento fisicamente.
   * Sujeito à policy RLS: apenas status 'RASCUNHO' do próprio usuário pode ser excluído.
   */
  async excluir(id: string): Promise<void> {
    // Exclui itens associados primeiro
    await this.client
      .from('item_orcamento')
      .delete()
      .eq('orcamento_id', id);

    const { error } = await this.client
      .from('orcamento')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Erro ao excluir orçamento: ${error.message}`);
    }
  }

  /**
   * Invoca a RPC tenant-scoped public.expirar_meus_orcamentos_rpc para expiração JIT.
   * Atua como mecanismo complementar de defesa em profundidade.
   */
  async expirarMeusOrcamentos(): Promise<number> {
    const { data, error } = await this.client.rpc('expirar_meus_orcamentos_rpc');

    if (error) {
      throw new Error(`Erro ao executar RPC de expiração de orçamentos: ${error.message}`);
    }

    return Number(data?.linhas_expiradas ?? 0);
  }
}


export const supabaseOrcamentoRepository = new SupabaseOrcamentoRepository();
