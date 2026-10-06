import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../supabase/supabase-client';
import {
  ClienteRepository,
  CriarClienteDados,
  AtualizarClienteDados,
  SalvarEnderecoDados,
} from '../../domain/repositories/cliente.repository.interface';
import { Cliente } from '../../domain/entities/cliente';
import { Endereco } from '../../domain/entities/endereco';

/**
 * Função utilitária para mapear o retorno de endereço do PostgREST para a entidade Endereco.
 */
function mapEndereco(raw: any, clienteId: string): Endereco | null {
  if (!raw) return null;
  const item = Array.isArray(raw) ? raw[0] : raw;
  if (!item || !item.id) return null;

  return new Endereco({
    id: item.id,
    clienteId: item.cliente_id ?? clienteId,
    cep: item.cep ?? null,
    logradouro: item.logradouro ?? null,
    numero: item.numero ?? null,
    complemento: item.complemento ?? null,
    bairro: item.bairro ?? null,
    cidade: item.cidade ?? null,
    estado: item.estado ?? null,
    latitude: item.latitude != null ? Number(item.latitude) : null,
    longitude: item.longitude != null ? Number(item.longitude) : null,
  });
}

/**
 * Função utilitária para mapear o retorno de cliente do PostgREST para a entidade Cliente.
 */
function mapCliente(data: any): Cliente {
  const endereco = mapEndereco(data.endereco, data.id);

  return new Cliente({
    id: data.id,
    usuarioId: data.usuario_id,
    nome: data.nome,
    telefone: data.telefone ?? null,
    email: data.email ?? null,
    documento: data.documento ?? null,
    observacoes: data.observacoes ?? null,
    ativo: data.ativo ?? true,
    endereco,
  });
}

/**
 * Implementação do repositório de clientes utilizando Supabase PostgREST.
 * Centraliza o acesso aos dados em conformidade com as policies RLS homologadas.
 * Nunca utiliza service_role.
 */
export class SupabaseClienteRepository implements ClienteRepository {
  constructor(private readonly client: SupabaseClient = supabase) {}

  /**
   * Lista todos os clientes do usuário autenticado ordenados por nome.
   */
  async listar(usuarioId: string): Promise<Cliente[]> {
    const { data, error } = await this.client
      .from('cliente')
      .select('*, endereco(*)')
      .eq('usuario_id', usuarioId)
      .order('nome', { ascending: true });

    if (error) {
      throw new Error(`Erro ao listar clientes: ${error.message}`);
    }

    if (!data) return [];

    return data.map(mapCliente);
  }

  /**
   * Busca um cliente pelo ID, trazendo o endereço se existir.
   * Respeita a policy RLS (cliente_select_policy: auth.uid() = usuario_id).
   */
  async buscarPorId(id: string): Promise<Cliente | null> {
    const { data, error } = await this.client
      .from('cliente')
      .select('*, endereco(*)')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new Error(`Erro ao buscar cliente por ID: ${error.message}`);
    }

    if (!data) return null;

    return mapCliente(data);
  }

  /**
   * Cria um novo cliente no banco. O ID é gerado pelo banco via gen_random_uuid().
   * Respeita a policy cliente_insert_policy (WITH CHECK auth.uid() = usuario_id).
   */
  async criar(dados: CriarClienteDados): Promise<Cliente> {
    const { data, error } = await this.client
      .from('cliente')
      .insert({
        usuario_id: dados.usuarioId,
        nome: dados.nome.trim(),
        telefone: dados.telefone ? dados.telefone.trim() : null,
        email: dados.email ? dados.email.trim() : null,
        documento: dados.documento ? dados.documento.trim() : null,
        observacoes: dados.observacoes ? dados.observacoes.trim() : null,
        ativo: dados.ativo ?? true,
      })
      .select('*, endereco(*)')
      .single();

    if (error) {
      throw new Error(`Erro ao criar cliente: ${error.message}`);
    }

    return mapCliente(data);
  }

  /**
   * Atualiza os dados cadastrais do cliente.
   * Não altera usuario_id para prevenir transferência de titularidade.
   * Respeita a policy cliente_update_policy.
   */
  async atualizar(id: string, dados: AtualizarClienteDados): Promise<Cliente> {
    const updatePayload: Record<string, any> = {};

    if (dados.nome !== undefined) updatePayload.nome = dados.nome.trim();
    if (dados.telefone !== undefined) updatePayload.telefone = dados.telefone ? dados.telefone.trim() : null;
    if (dados.email !== undefined) updatePayload.email = dados.email ? dados.email.trim() : null;
    if (dados.documento !== undefined) updatePayload.documento = dados.documento ? dados.documento.trim() : null;
    if (dados.observacoes !== undefined) updatePayload.observacoes = dados.observacoes ? dados.observacoes.trim() : null;

    const { data, error } = await this.client
      .from('cliente')
      .update(updatePayload)
      .eq('id', id)
      .select('*, endereco(*)')
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar cliente: ${error.message}`);
    }

    return mapCliente(data);
  }

  /**
   * Altera o status ativo/inativo de forma lógica (não exclui fisicamente).
   */
  async alterarAtivo(id: string, ativo: boolean): Promise<void> {
    const { error } = await this.client
      .from('cliente')
      .update({ ativo })
      .eq('id', id);

    if (error) {
      throw new Error(`Erro ao alterar status do cliente: ${error.message}`);
    }
  }

  /**
   * Obtém o endereço cadastrado para o cliente.
   */
  async obterEndereco(clienteId: string): Promise<Endereco | null> {
    const { data, error } = await this.client
      .from('endereco')
      .select('*')
      .eq('cliente_id', clienteId)
      .maybeSingle();

    if (error) {
      throw new Error(`Erro ao obter endereço do cliente: ${error.message}`);
    }

    return mapEndereco(data, clienteId);
  }

  /**
   * Salva o endereço de um cliente (criação ou atualização).
   * Respeita a constraint UNIQUE(cliente_id) e as policies RLS de endereco.
   */
  async salvarEndereco(clienteId: string, dados: SalvarEnderecoDados): Promise<Endereco> {
    const enderecoExistente = await this.obterEndereco(clienteId);

    const payload = {
      cliente_id: clienteId,
      cep: dados.cep ? dados.cep.trim() : null,
      logradouro: dados.logradouro ? dados.logradouro.trim() : null,
      numero: dados.numero ? dados.numero.trim() : null,
      complemento: dados.complemento ? dados.complemento.trim() : null,
      bairro: dados.bairro ? dados.bairro.trim() : null,
      cidade: dados.cidade ? dados.cidade.trim() : null,
      estado: dados.estado ? dados.estado.trim().toUpperCase() : null,
      latitude: dados.latitude ?? null,
      longitude: dados.longitude ?? null,
    };

    if (enderecoExistente) {
      const { data, error } = await this.client
        .from('endereco')
        .update(payload)
        .eq('cliente_id', clienteId)
        .select('*')
        .single();

      if (error) {
        throw new Error(`Erro ao atualizar endereço: ${error.message}`);
      }

      const atualizado = mapEndereco(data, clienteId);
      if (!atualizado) throw new Error('Falha ao mapear endereço atualizado.');
      return atualizado;
    } else {
      const { data, error } = await this.client
        .from('endereco')
        .insert(payload)
        .select('*')
        .single();

      if (error) {
        throw new Error(`Erro ao cadastrar endereço: ${error.message}`);
      }

      const criado = mapEndereco(data, clienteId);
      if (!criado) throw new Error('Falha ao mapear endereço criado.');
      return criado;
    }
  }
}

/**
 * Singleton padrão do repositório de clientes para a aplicação.
 */
export const supabaseClienteRepository = new SupabaseClienteRepository();
