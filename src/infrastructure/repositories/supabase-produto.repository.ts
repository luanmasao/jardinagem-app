import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../supabase/supabase-client';
import {
  ProdutoRepository,
  CriarProdutoDados,
  AtualizarProdutoDados,
} from '../../domain/repositories/produto.repository.interface';
import { Produto } from '../../domain/entities/produto';

/**
 * Mapeia o registro da tabela public.produto para a entidade de domínio Produto.
 */
function mapProduto(data: any): Produto {
  return new Produto({
    id: data.id,
    usuarioId: data.usuario_id,
    nome: data.nome,
    descricao: data.descricao ?? null,
    unidade: data.unidade,
    precoBase: Number(data.preco_base),
    ativo: data.ativo ?? true,
  });
}

/**
 * Implementação do repositório de produtos utilizando Supabase PostgREST.
 * Centraliza o acesso aos dados em conformidade com as policies RLS homologadas.
 * Nunca utiliza service_role.
 */
export class SupabaseProdutoRepository implements ProdutoRepository {
  constructor(private readonly client: SupabaseClient = supabase) {}

  /**
   * Lista todos os produtos do usuário autenticado ordenados por nome.
   */
  async listar(usuarioId: string): Promise<Produto[]> {
    const { data, error } = await this.client
      .from('produto')
      .select('*')
      .eq('usuario_id', usuarioId)
      .order('nome', { ascending: true });

    if (error) {
      throw new Error(`Erro ao listar produtos: ${error.message}`);
    }

    return (data || []).map(mapProduto);
  }

  /**
   * Busca um produto pelo identificador único.
   * Retorna null se não encontrado ou se pertencer a outro usuário (via RLS).
   */
  async buscarPorId(id: string): Promise<Produto | null> {
    const { data, error } = await this.client
      .from('produto')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new Error(`Erro ao buscar produto por ID: ${error.message}`);
    }

    if (!data) return null;
    return mapProduto(data);
  }

  /**
   * Cria um novo produto associado ao usuário autenticado.
   */
  async criar(dados: CriarProdutoDados): Promise<Produto> {
    const payload = {
      usuario_id: dados.usuarioId,
      nome: dados.nome.trim(),
      descricao: dados.descricao ? dados.descricao.trim() : null,
      unidade: dados.unidade.trim(),
      preco_base: dados.precoBase,
      ativo: dados.ativo ?? true,
    };

    const { data, error } = await this.client
      .from('produto')
      .insert(payload)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao criar produto: ${error.message}`);
    }

    return mapProduto(data);
  }

  /**
   * Atualiza dados de um produto existente.
   */
  async atualizar(id: string, dados: AtualizarProdutoDados): Promise<Produto> {
    const payload: Record<string, any> = {};

    if (dados.nome !== undefined) {
      payload.nome = dados.nome.trim();
    }
    if (dados.descricao !== undefined) {
      payload.descricao = dados.descricao ? dados.descricao.trim() : null;
    }
    if (dados.unidade !== undefined) {
      payload.unidade = dados.unidade.trim();
    }
    if (dados.precoBase !== undefined) {
      payload.preco_base = dados.precoBase;
    }

    const { data, error } = await this.client
      .from('produto')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar produto: ${error.message}`);
    }

    return mapProduto(data);
  }

  /**
   * Altera logicamente o status ativo do produto (ativo = true/false).
   */
  async alterarAtivo(id: string, ativo: boolean): Promise<void> {
    const { error } = await this.client
      .from('produto')
      .update({ ativo })
      .eq('id', id);

    if (error) {
      throw new Error(`Erro ao alterar status do produto: ${error.message}`);
    }
  }
}

/**
 * Singleton padrão do repositório de produtos para a aplicação.
 */
export const supabaseProdutoRepository = new SupabaseProdutoRepository();

