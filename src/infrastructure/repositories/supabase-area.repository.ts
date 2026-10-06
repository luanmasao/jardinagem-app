import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../supabase/supabase-client';
import {
  AreaRepository,
  CriarAreaDados,
  AtualizarAreaDados,
} from '../../domain/repositories/area.repository.interface';
import { Area } from '../../domain/entities/area';
import { arredondarMoeda } from '../../domain/calculations/moeda';
import {
  dominioParaGeoJson,
  mapAreaRow,
} from '../mappers/area-geojson.mapper';

/**
 * Implementação do repositório de áreas de serviço utilizando Supabase PostgREST (GAP-AREA-04).
 *
 * Princípios de arquitetura e segurança:
 * 1. DECISÃO-AREA-02: Geometrias espaciais transportadas via GeoJSON (RFC 7946, SRID 4326).
 * 2. Isolamento RLS: Nunca utiliza service_role; opera estritamente sob o contexto autenticado (auth.uid()).
 * 3. Integridade referencial: public.area está atrelada a public.item_orcamento (CASCADE).
 * 4. Cálculo de área: O repositório persiste o valor fornecido pelo contrato, sem criar segundo algoritmo de cálculo.
 */
export class SupabaseAreaRepository implements AreaRepository {
  constructor(private readonly client: SupabaseClient = supabase) {}

  /**
   * Mapeia erros do Supabase / PostgREST para erros compreensíveis com preservação de detalhes.
   */
  private handleError(operacao: string, error: any): Error {
    const code = error?.code;
    const message = error?.message || 'Erro desconhecido';

    if (code === '23503') {
      return new Error(
        `Erro ao ${operacao} área: item de orçamento associado não encontrado ou inválido (${message}).`
      );
    }
    if (code === '23514') {
      return new Error(
        `Erro ao ${operacao} área: violação de constraint de validação (${message}).`
      );
    }
    if (code === '42501') {
      return new Error(
        `Erro ao ${operacao} área: permissão negada por política de segurança RLS (${message}).`
      );
    }
    if (code === 'PGRST116') {
      return new Error(
        `Erro ao ${operacao} área: registro não encontrado ou não acessível.`
      );
    }

    return new Error(`Erro ao ${operacao} área: ${message}`);
  }

  /**
   * Lista todas as áreas pertencentes a um item de orçamento.
   * Sujeito à policy RLS: area_select_policy (via item_orcamento -> orcamento -> usuario_id = auth.uid()).
   */
  async listarPorItem(itemOrcamentoId: string): Promise<Area[]> {
    const { data, error } = await this.client
      .from('area')
      .select('*')
      .eq('item_orcamento_id', itemOrcamentoId);

    if (error) {
      throw this.handleError('listar', error);
    }

    return (data || []).map(mapAreaRow);
  }

  /**
   * Busca uma área específica pelo seu UUID.
   * Sujeito à policy RLS: area_select_policy.
   */
  async buscarPorId(id: string): Promise<Area | null> {
    const { data, error } = await this.client
      .from('area')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw this.handleError('buscar por ID', error);
    }

    if (!data) return null;
    return mapAreaRow(data);
  }

  /**
   * Insere uma nova área associada a um item de orçamento.
   * A geometria é serializada em GeoJSON com anel explicitamente fechado (DECISÃO-AREA-02).
   * O valor de area_calculada é persistido conforme fornecido no contrato (arredondado).
   * Sujeito à policy RLS: area_insert_policy.
   */
  async criar(dados: CriarAreaDados): Promise<Area> {
    const geoJsonGeometria = dominioParaGeoJson(dados.geometria);

    const payload: Record<string, any> = {
      item_orcamento_id: dados.itemOrcamentoId,
      nome: dados.nome ? dados.nome.trim() : null,
      geometria: geoJsonGeometria,
      area_calculada: arredondarMoeda(dados.areaCalculada),
      unidade: dados.unidade ? dados.unidade.trim() : 'm²',
      observacoes: dados.observacoes ? dados.observacoes.trim() : null,
    };

    if (dados.id) {
      payload.id = dados.id;
    }

    const { data, error } = await this.client
      .from('area')
      .insert(payload)
      .select()
      .single();

    if (error) {
      throw this.handleError('criar', error);
    }

    return mapAreaRow(data);
  }

  /**
   * Atualiza dados de uma área existente.
   * Sujeito à policy RLS: area_update_policy.
   */
  async atualizar(id: string, dados: AtualizarAreaDados): Promise<Area> {
    const payload: Record<string, any> = {};

    if (dados.nome !== undefined) {
      payload.nome = dados.nome ? dados.nome.trim() : null;
    }
    if (dados.geometria !== undefined) {
      payload.geometria = dominioParaGeoJson(dados.geometria);
    }
    if (dados.areaCalculada !== undefined) {
      payload.area_calculada = arredondarMoeda(dados.areaCalculada);
    }
    if (dados.unidade !== undefined) {
      payload.unidade = dados.unidade.trim();
    }
    if (dados.observacoes !== undefined) {
      payload.observacoes = dados.observacoes ? dados.observacoes.trim() : null;
    }

    // Se nenhum campo foi modificado, retorna a área atual
    if (Object.keys(payload).length === 0) {
      const atual = await this.buscarPorId(id);
      if (!atual) {
        throw new Error(`Erro ao atualizar área: registro com ID ${id} não encontrado.`);
      }
      return atual;
    }

    const { data, error } = await this.client
      .from('area')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw this.handleError('atualizar', error);
    }

    return mapAreaRow(data);
  }

  /**
   * Exclui fisicamente uma área.
   * Sujeito à policy RLS: area_delete_policy (orçamento pai deve estar em status 'RASCUNHO').
   */
  async excluir(id: string): Promise<void> {
    const { error } = await this.client
      .from('area')
      .delete()
      .eq('id', id);

    if (error) {
      throw this.handleError('excluir', error);
    }
  }

  /**
   * Alias de excluir para satisfazer o contrato canônico de remoção.
   */
  async remover(id: string): Promise<void> {
    return this.excluir(id);
  }
}

/**
 * Instância singleton padrão do repositório de áreas para a aplicação.
 */
export const supabaseAreaRepository = new SupabaseAreaRepository();
