import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../supabase/supabase-client';
import {
  ItemOrcamentoRepository,
  CriarItemOrcamentoDados,
  AtualizarItemOrcamentoDados,
} from '../../domain/repositories/item-orcamento.repository.interface';
import { ItemOrcamento } from '../../domain/entities/item-orcamento';
import { Area } from '../../domain/entities/area';
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
 * Implementação do repositório de itens de orçamento utilizando Supabase PostgREST.
 * Centraliza o acesso aos dados em conformidade com as policies RLS homologadas.
 * Nunca utiliza service_role.
 */
export class SupabaseItemOrcamentoRepository implements ItemOrcamentoRepository {
  constructor(private readonly client: SupabaseClient = supabase) {}

  /**
   * Lista todos os itens de um determinado orçamento.
   */
  async listarPorOrcamento(orcamentoId: string): Promise<ItemOrcamento[]> {
    const { data, error } = await this.client
      .from('item_orcamento')
      .select('*, area (*)')
      .eq('orcamento_id', orcamentoId);

    if (error) {
      throw new Error(`Erro ao listar itens do orçamento: ${error.message}`);
    }

    return (data || []).map(mapItem);
  }

  /**
   * Busca um item específico pelo seu ID.
   */
  async buscarPorId(id: string): Promise<ItemOrcamento | null> {
    const { data, error } = await this.client
      .from('item_orcamento')
      .select('*, area (*)')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new Error(`Erro ao buscar item de orçamento por ID: ${error.message}`);
    }

    if (!data) return null;
    return mapItem(data);
  }

  /**
   * Insere um novo item no orçamento.
   */
  async criar(dados: CriarItemOrcamentoDados): Promise<ItemOrcamento> {
    const payload: any = {
      orcamento_id: dados.orcamentoId,
      tipo: dados.tipo,
      servico_id: dados.tipo === TipoItem.SERVICO ? (dados.servicoId ?? null) : null,
      produto_id: dados.tipo === TipoItem.PRODUTO ? (dados.produtoId ?? null) : null,
      descricao: dados.descricao.trim(),
      quantidade: dados.quantidade,
      unidade: dados.unidade.trim(),
      valor_unitario: dados.valorUnitario,
      valor_total: dados.valorTotal,
      usa_medicao_area: dados.usaMedicaoArea,
    };

    if (dados.id) {
      payload.id = dados.id;
    }

    const { data, error } = await this.client
      .from('item_orcamento')
      .insert(payload)
      .select('*, area (*)')
      .single();

    if (error) {
      throw new Error(`Erro ao criar item de orçamento: ${error.message}`);
    }

    return mapItem(data);
  }

  /**
   * Atualiza dados de um item existente.
   */
  async atualizar(id: string, dados: AtualizarItemOrcamentoDados): Promise<ItemOrcamento> {
    const payload: any = {};
    if (dados.descricao !== undefined) payload.descricao = dados.descricao.trim();
    if (dados.quantidade !== undefined) payload.quantidade = dados.quantidade;
    if (dados.valorUnitario !== undefined) payload.valor_unitario = dados.valorUnitario;
    if (dados.valorTotal !== undefined) payload.valor_total = dados.valorTotal;

    const { data, error } = await this.client
      .from('item_orcamento')
      .update(payload)
      .eq('id', id)
      .select('*, area (*)')
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar item de orçamento: ${error.message}`);
    }

    return mapItem(data);
  }

  /**
   * Exclui um item de orçamento.
   * Sujeito à policy RLS: apenas itens cujo orçamento pai está em 'RASCUNHO' podem ser excluídos.
   */
  async excluir(id: string): Promise<void> {
    const { error } = await this.client
      .from('item_orcamento')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Erro ao excluir item de orçamento: ${error.message}`);
    }
  }
}

export const supabaseItemOrcamentoRepository = new SupabaseItemOrcamentoRepository();
