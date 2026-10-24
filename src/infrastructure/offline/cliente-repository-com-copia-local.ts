import {
  AtualizarClienteDados,
  ClienteRepository,
  CriarClienteDados,
  SalvarEnderecoDados,
} from '../../domain/repositories/cliente.repository.interface';
import { Cliente } from '../../domain/entities/cliente';
import { Endereco } from '../../domain/entities/endereco';
import { ArmazenamentoLocal } from '../../application/interfaces/armazenamento-local.interface';
import { ConectividadeProvider } from '../../application/interfaces/conectividade-provider.interface';
import { supabaseClienteRepository } from '../repositories/supabase-cliente.repository';
import { armazenamentoLocal } from './armazenamento-local-cifrado';
import { conectividadeProvider } from './expo-network-conectividade.provider';
import { CopiaLocalDeLista } from './copia-local-de-lista';
import { ehFalhaDeConexao } from './falha-de-conexao';

function reconstruirCliente(salvo: any): Cliente {
  return new Cliente({ ...salvo, endereco: salvo.endereco ? new Endereco(salvo.endereco) : null });
}

/**
 * Repositório de clientes com a última cópia guardada no aparelho (RNF36/RF83).
 * Os clientes são necessários offline porque todo rascunho de orçamento pertence a um cliente (RN21).
 * Leituras funcionam sem conexão a partir da cópia; cadastros continuam exigindo conexão.
 */
export class ClienteRepositoryComCopiaLocal implements ClienteRepository {
  private readonly copia: CopiaLocalDeLista<Cliente>;

  constructor(
    private readonly online: ClienteRepository = supabaseClienteRepository,
    armazenamento: ArmazenamentoLocal = armazenamentoLocal,
    conectividade: ConectividadeProvider = conectividadeProvider
  ) {
    this.copia = new CopiaLocalDeLista(armazenamento, 'clientes', reconstruirCliente, conectividade);
  }

  listar(usuarioId: string): Promise<Cliente[]> {
    return this.copia.listar(usuarioId, () => this.online.listar(usuarioId));
  }

  buscarPorId(id: string): Promise<Cliente | null> {
    return this.copia.buscarPorId(id, () => this.online.buscarPorId(id));
  }

  async criar(dados: CriarClienteDados): Promise<Cliente> {
    const cliente = await this.copia.escrever(() => this.online.criar(dados));
    await this.copia.guardarItem(cliente);
    return cliente;
  }

  async atualizar(id: string, dados: AtualizarClienteDados): Promise<Cliente> {
    const cliente = await this.copia.escrever(() => this.online.atualizar(id, dados));
    await this.copia.guardarItem(cliente);
    return cliente;
  }

  async alterarAtivo(id: string, ativo: boolean): Promise<void> {
    await this.copia.escrever(() => this.online.alterarAtivo(id, ativo));
    await this.copia.alterarItem(id, (cliente) => (ativo ? cliente.ativar() : cliente.desativar()));
  }

  /** O endereço vem junto do cliente na listagem, então a cópia do cliente também o contém. */
  async obterEndereco(clienteId: string): Promise<Endereco | null> {
    if (await this.copia.semRede()) {
      const cliente = await this.copia.buscarPorId(clienteId, () => this.online.buscarPorId(clienteId));
      return cliente?.endereco ?? null;
    }
    try {
      return await this.online.obterEndereco(clienteId);
    } catch (err) {
      if (!ehFalhaDeConexao(err)) throw err;
      const cliente = await this.copia.buscarPorId(clienteId, () => Promise.reject(err));
      return cliente?.endereco ?? null;
    }
  }

  async salvarEndereco(clienteId: string, dados: SalvarEnderecoDados): Promise<Endereco> {
    const endereco = await this.copia.escrever(() => this.online.salvarEndereco(clienteId, dados));
    await this.copia.alterarItem(clienteId, (cliente) => cliente.definirEndereco(endereco));
    return endereco;
  }
}

export const clienteRepositoryComCopiaLocal = new ClienteRepositoryComCopiaLocal();
