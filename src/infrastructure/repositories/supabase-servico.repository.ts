import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../supabase/supabase-client';
import {
  ServicoRepository,
  CriarServicoDados,
  AtualizarServicoDados,
} from '../../domain/repositories/servico.repository.interface';
import { Servico } from '../../domain/entities/servico';

/**
 * Mapeia o registro da tabela public.servico para a entidade de domínio Servico.
 */
function mapServico(data: any): Servico {
  return new Servico({
    id: data.id,
    usuarioId: data.usuario_id,
    nome: data.nome,
    descricao: data.descricao ?? null,
    unidade: data.unidade,
    precoBase: Number(data.preco_base),
    usaMedicaoArea: Boolean(data.usa_medicao_area),
    ativo: data.ativo ?? true,
  });
}

/**
 * Implementação do repositório de serviços utilizando Supabase PostgREST.
 * Centraliza o acesso aos dados em conformidade com as policies RLS homologadas.
 * Nunca utiliza service_role.
 */
export class SupabaseServicoRepository implements ServicoRepository {
  constructor(private readonly client: SupabaseClient = supabase) {}

  /**
   * Lista todos os serviços do usuário autenticado ordenados por nome.
   */
  async listar(usuarioId: string): Promise<Servico[]> {
    const { data, error } = await this.client
      .from('servico')
      .select('*')
      .eq('usuario_id', usuarioId)
      .order('nome', { ascending: true });

    if (error) {
      throw new Error(`Erro ao listar serviços: ${error.message}`);
    }

    return (data || []).map(mapServico);
  }

  /**
   * Busca um serviço pelo identificador único.
   * Retorna null se não encontrado ou se pertencer a outro usuário (via RLS).
   */
  async buscarPorId(id: string): Promise<Servico | null> {
    const { data, error } = await this.client
      .from('servico')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new Error(`Erro ao buscar serviço por ID: ${error.message}`);
    }

    if (!data) return null;
    return mapServico(data);
  }

  /**
   * Cria um novo serviço associado ao usuário autenticado.
   */
  async criar(dados: CriarServicoDados): Promise<Servico> {
    const payload = {
      usuario_id: dados.usuarioId,
      nome: dados.nome.trim(),
      descricao: dados.descricao ? dados.descricao.trim() : null,
      unidade: dados.usaMedicaoArea ? 'm²' : dados.unidade.trim(),
      preco_base: dados.precoBase,
      usa_medicao_area: dados.usaMedicaoArea,
      ativo: dados.ativo ?? true,
    };

    const { data, error } = await this.client
      .from('servico')
      .insert(payload)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao criar serviço: ${error.message}`);
    }

    return mapServico(data);
  }

  /**
   * Atualiza dados de um serviço existente.
   */
  async atualizar(id: string, dados: AtualizarServicoDados): Promise<Servico> {
    const payload: Record<string, any> = {};

    if (dados.nome !== undefined) {
      payload.nome = dados.nome.trim();
    }
    if (dados.descricao !== undefined) {
      payload.descricao = dados.descricao ? dados.descricao.trim() : null;
    }
    if (dados.usaMedicaoArea !== undefined) {
      payload.usa_medicao_area = dados.usaMedicaoArea;
      if (dados.usaMedicaoArea) {
        payload.unidade = 'm²';
      }
    }
    if (dados.unidade !== undefined && !payload.usa_medicao_area) {
      payload.unidade = dados.unidade.trim();
    }
    if (dados.precoBase !== undefined) {
      payload.preco_base = dados.precoBase;
    }

    const { data, error } = await this.client
      .from('servico')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar serviço: ${error.message}`);
    }

    return mapServico(data);
  }

  /**
   * Altera logicamente o status ativo do serviço (ativo = true/false).
   */
  async alterarAtivo(id: string, ativo: boolean): Promise<void> {
    const { error } = await this.client
      .from('servico')
      .update({ ativo })
      .eq('id', id);

    if (error) {
      throw new Error(`Erro ao alterar status do serviço: ${error.message}`);
    }
  }
}

/**
 * Singleton padrão do repositório de serviços para a aplicação.
 */
export const supabaseServicoRepository = new SupabaseServicoRepository();

