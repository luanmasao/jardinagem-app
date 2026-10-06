import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Cliente } from '../../src/domain/entities/cliente';
import { Endereco } from '../../src/domain/entities/endereco';
import {
  ClienteRepository,
  CriarClienteDados,
  AtualizarClienteDados,
  SalvarEnderecoDados,
} from '../../src/domain/repositories/cliente.repository.interface';
import { AuthService, AuthUser } from '../../src/application/services/auth.service';
import { ClienteService } from '../../src/application/services/cliente.service';

/**
 * Repositório simulando o comportamento estrito de Row Level Security (RLS) do Supabase:
 * Toda query executa sob o contexto de um cliente autenticado (auth.uid()).
 * As policies cliente_select_policy, cliente_insert_policy, cliente_update_policy
 * e cliente_delete_policy filtram por auth.uid() = usuario_id.
 */
class RlsSimulatedClienteRepository implements ClienteRepository {
  // Armazenamento central compartilhado (tabela 'public.cliente' e 'public.endereco')
  private tabelaCliente: Map<string, {
    id: string;
    usuarioId: string;
    nome: string;
    telefone: string | null;
    email: string | null;
    documento: string | null;
    observacoes: string | null;
    ativo: boolean;
  }> = new Map();

  private tabelaEndereco: Map<string, {
    id: string;
    clienteId: string;
    cep: string | null;
    logradouro: string | null;
    numero: string | null;
    complemento: string | null;
    bairro: string | null;
    cidade: string | null;
    estado: string | null;
    latitude: number | null;
    longitude: number | null;
  }> = new Map();

  constructor(private getAuthUserId: () => string | null) {}

  private checkAuth(): string {
    const uid = this.getAuthUserId();
    if (!uid) throw new Error('RLS: Violação de acesso - Sessão não autenticada');
    return uid;
  }

  // SELECT ... WHERE auth.uid() = usuario_id
  async listar(usuarioId: string): Promise<Cliente[]> {
    const authUid = this.checkAuth();
    const resultados: Cliente[] = [];

    for (const row of this.tabelaCliente.values()) {
      // Simulação fiel do RLS no banco: auth.uid() = usuario_id
      if (row.usuarioId === authUid && row.usuarioId === usuarioId) {
        const endRow = this.tabelaEndereco.get(row.id);
        const endereco = endRow
          ? new Endereco({
              id: endRow.id,
              clienteId: endRow.clienteId,
              cep: endRow.cep,
              logradouro: endRow.logradouro,
              numero: endRow.numero,
              complemento: endRow.complemento,
              bairro: endRow.bairro,
              cidade: endRow.cidade,
              estado: endRow.estado,
              latitude: endRow.latitude,
              longitude: endRow.longitude,
            })
          : null;

        resultados.push(
          new Cliente({
            id: row.id,
            usuarioId: row.usuarioId,
            nome: row.nome,
            telefone: row.telefone,
            email: row.email,
            documento: row.documento,
            observacoes: row.observacoes,
            ativo: row.ativo,
            endereco,
          })
        );
      }
    }
    return resultados.sort((a, b) => a.nome.localeCompare(b.nome));
  }

  // SELECT ... WHERE id = :id AND auth.uid() = usuario_id
  async buscarPorId(id: string): Promise<Cliente | null> {
    const authUid = this.checkAuth();
    const row = this.tabelaCliente.get(id);

    // Se o cliente não existir ou pertencer a outro usuário, o RLS não retorna linhas
    if (!row || row.usuarioId !== authUid) {
      return null;
    }

    const endRow = this.tabelaEndereco.get(row.id);
    const endereco = endRow
      ? new Endereco({
          id: endRow.id,
          clienteId: endRow.clienteId,
          cep: endRow.cep,
          logradouro: endRow.logradouro,
          numero: endRow.numero,
          complemento: endRow.complemento,
          bairro: endRow.bairro,
          cidade: endRow.cidade,
          estado: endRow.estado,
          latitude: endRow.latitude,
          longitude: endRow.longitude,
        })
      : null;

    return new Cliente({
      id: row.id,
      usuarioId: row.usuarioId,
      nome: row.nome,
      telefone: row.telefone,
      email: row.email,
      documento: row.documento,
      observacoes: row.observacoes,
      ativo: row.ativo,
      endereco,
    });
  }

  // INSERT ... WITH CHECK (auth.uid() = usuario_id)
  async criar(dados: CriarClienteDados): Promise<Cliente> {
    const authUid = this.checkAuth();
    if (dados.usuarioId !== authUid) {
      throw new Error('RLS: Violação de INSERT - usuario_id não confere com auth.uid()');
    }

    const id = `cli-uuid-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const row = {
      id,
      usuarioId: dados.usuarioId,
      nome: dados.nome,
      telefone: dados.telefone ?? null,
      email: dados.email ?? null,
      documento: dados.documento ?? null,
      observacoes: dados.observacoes ?? null,
      ativo: dados.ativo ?? true,
    };
    this.tabelaCliente.set(id, row);

    return new Cliente({
      ...row,
      endereco: null,
    });
  }

  // UPDATE ... USING (auth.uid() = usuario_id) WITH CHECK (auth.uid() = usuario_id)
  async atualizar(id: string, dados: AtualizarClienteDados): Promise<Cliente> {
    const authUid = this.checkAuth();
    const row = this.tabelaCliente.get(id);

    if (!row || row.usuarioId !== authUid) {
      throw new Error('RLS: Violação de UPDATE - registro não encontrado ou sem permissão de titularidade');
    }

    if (dados.nome !== undefined) row.nome = dados.nome;
    if (dados.telefone !== undefined) row.telefone = dados.telefone ?? null;
    if (dados.email !== undefined) row.email = dados.email ?? null;
    if (dados.documento !== undefined) row.documento = dados.documento ?? null;
    if (dados.observacoes !== undefined) row.observacoes = dados.observacoes ?? null;

    return (await this.buscarPorId(id))!;
  }

  async alterarAtivo(id: string, ativo: boolean): Promise<void> {
    const authUid = this.checkAuth();
    const row = this.tabelaCliente.get(id);

    if (!row || row.usuarioId !== authUid) {
      throw new Error('RLS: Violação de UPDATE status - registro não encontrado ou sem permissão de titularidade');
    }

    row.ativo = ativo;
  }

  async obterEndereco(clienteId: string): Promise<Endereco | null> {
    const authUid = this.checkAuth();
    const cliRow = this.tabelaCliente.get(clienteId);
    if (!cliRow || cliRow.usuarioId !== authUid) {
      return null;
    }

    const endRow = this.tabelaEndereco.get(clienteId);
    if (!endRow) return null;

    return new Endereco({
      id: endRow.id,
      clienteId: endRow.clienteId,
      cep: endRow.cep,
      logradouro: endRow.logradouro,
      numero: endRow.numero,
      complemento: endRow.complemento,
      bairro: endRow.bairro,
      cidade: endRow.cidade,
      estado: endRow.estado,
      latitude: endRow.latitude,
      longitude: endRow.longitude,
    });
  }

  async salvarEndereco(clienteId: string, dados: SalvarEnderecoDados): Promise<Endereco> {
    const authUid = this.checkAuth();
    const cliRow = this.tabelaCliente.get(clienteId);
    if (!cliRow || cliRow.usuarioId !== authUid) {
      throw new Error('RLS: Violação de endereco - cliente não pertence ao usuário autenticado');
    }

    const existente = this.tabelaEndereco.get(clienteId);
    if (existente) {
      if (dados.cep !== undefined) existente.cep = dados.cep ?? null;
      if (dados.logradouro !== undefined) existente.logradouro = dados.logradouro ?? null;
      if (dados.numero !== undefined) existente.numero = dados.numero ?? null;
      if (dados.complemento !== undefined) existente.complemento = dados.complemento ?? null;
      if (dados.bairro !== undefined) existente.bairro = dados.bairro ?? null;
      if (dados.cidade !== undefined) existente.cidade = dados.cidade ?? null;
      if (dados.estado !== undefined) existente.estado = dados.estado ?? null;
      if (dados.latitude !== undefined) existente.latitude = dados.latitude ?? null;
      if (dados.longitude !== undefined) existente.longitude = dados.longitude ?? null;
      return (await this.obterEndereco(clienteId))!;
    }

    const id = `end-uuid-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const endRow = {
      id,
      clienteId,
      cep: dados.cep ?? null,
      logradouro: dados.logradouro ?? null,
      numero: dados.numero ?? null,
      complemento: dados.complemento ?? null,
      bairro: dados.bairro ?? null,
      cidade: dados.cidade ?? null,
      estado: dados.estado ?? null,
      latitude: dados.latitude ?? null,
      longitude: dados.longitude ?? null,
    };
    this.tabelaEndereco.set(clienteId, endRow);

    return new Endereco(endRow);
  }
}

describe('Teste Multi-Tenant no Aplicativo (Seção 16)', () => {
  it('USER_A e USER_B: isolamento completo em listagem, visualização e edição', async () => {
    // Estado global de sessão mutável simulando login alternado
    let currentAuthUser: AuthUser | null = null;

    const authMock: AuthService = {
      getCurrentUser: async () => currentAuthUser,
    } as unknown as AuthService;

    // Repositório compartilhado com RLS ativo simulado
    const rlsRepo = new RlsSimulatedClienteRepository(() => currentAuthUser?.id ?? null);
    const service = new ClienteService(rlsRepo, authMock);

    // -----------------------------------------------------------------------
    // PASSO 1: Sessão do USER_A cria CLIENTE_A
    // -----------------------------------------------------------------------
    currentAuthUser = { id: 'usr-a-uuid', email: 'user_a@empresa.com', nome: 'Usuário A' };

    const clienteA = await service.criarCliente({
      nome: 'Cliente Alpha (USER_A)',
      telefone: '(11) 91111-1111',
      email: 'alpha@cliente.com',
      endereco: {
        cidade: 'São Paulo',
        estado: 'SP',
      },
    });

    assert.ok(clienteA.id);
    assert.strictEqual(clienteA.usuarioId, 'usr-a-uuid');
    assert.strictEqual(clienteA.nome, 'Cliente Alpha (USER_A)');

    // -----------------------------------------------------------------------
    // PASSO 2: Sessão do USER_B cria CLIENTE_B
    // -----------------------------------------------------------------------
    currentAuthUser = { id: 'usr-b-uuid', email: 'user_b@empresa.com', nome: 'Usuário B' };

    const clienteB = await service.criarCliente({
      nome: 'Cliente Beta (USER_B)',
      telefone: '(21) 92222-2222',
      email: 'beta@cliente.com',
      endereco: {
        cidade: 'Rio de Janeiro',
        estado: 'RJ',
      },
    });

    assert.ok(clienteB.id);
    assert.strictEqual(clienteB.usuarioId, 'usr-b-uuid');
    assert.strictEqual(clienteB.nome, 'Cliente Beta (USER_B)');

    // -----------------------------------------------------------------------
    // PASSO 3: Validação sob contexto de USER_A
    // -----------------------------------------------------------------------
    currentAuthUser = { id: 'usr-a-uuid', email: 'user_a@empresa.com', nome: 'Usuário A' };

    // USER_A lista clientes: deve ver apenas CLIENTE_A e NUNCA CLIENTE_B
    const listaUserA = await service.listarClientes();
    assert.strictEqual(listaUserA.length, 1);
    assert.strictEqual(listaUserA[0].id, clienteA.id);
    assert.strictEqual(listaUserA[0].nome, 'Cliente Alpha (USER_A)');

    // USER_A visualiza CLIENTE_A: obtém os dados com sucesso
    const buscaClienteA = await service.obterCliente(clienteA.id);
    assert.ok(buscaClienteA);
    assert.strictEqual(buscaClienteA.nome, 'Cliente Alpha (USER_A)');

    // USER_A tenta visualizar CLIENTE_B: deve receber null (invisível via RLS)
    const buscaClienteBPorA = await service.obterCliente(clienteB.id);
    assert.strictEqual(buscaClienteBPorA, null);

    // USER_A edita CLIENTE_A: sucesso
    const editadoA = await service.atualizarCliente(clienteA.id, {
      nome: 'Cliente Alpha Atualizado',
    });
    assert.strictEqual(editadoA.nome, 'Cliente Alpha Atualizado');

    // USER_A tenta editar CLIENTE_B: deve ser expressamente bloqueado
    await assert.rejects(
      async () => await service.atualizarCliente(clienteB.id, { nome: 'Invasão' }),
      /Cliente não encontrado ou não pertence ao usuário/
    );

    // USER_A tenta inativar CLIENTE_B: deve ser bloqueado
    await assert.rejects(
      async () => await service.alterarAtivoCliente(clienteB.id, false),
      /Cliente não encontrado ou não pertence ao usuário/
    );

    // -----------------------------------------------------------------------
    // PASSO 4: Validação sob contexto de USER_B
    // -----------------------------------------------------------------------
    currentAuthUser = { id: 'usr-b-uuid', email: 'user_b@empresa.com', nome: 'Usuário B' };

    // USER_B lista clientes: deve ver apenas CLIENTE_B e NUNCA CLIENTE_A
    const listaUserB = await service.listarClientes();
    assert.strictEqual(listaUserB.length, 1);
    assert.strictEqual(listaUserB[0].id, clienteB.id);
    assert.strictEqual(listaUserB[0].nome, 'Cliente Beta (USER_B)');

    // USER_B visualiza CLIENTE_B: obtém os dados
    const buscaClienteB = await service.obterCliente(clienteB.id);
    assert.ok(buscaClienteB);
    assert.strictEqual(buscaClienteB.nome, 'Cliente Beta (USER_B)');

    // USER_B tenta visualizar CLIENTE_A: deve receber null (invisível via RLS)
    const buscaClienteAPorB = await service.obterCliente(clienteA.id);
    assert.strictEqual(buscaClienteAPorB, null);

    // USER_B tenta editar CLIENTE_A: bloqueado
    await assert.rejects(
      async () => await service.atualizarCliente(clienteA.id, { nome: 'Invasão de B' }),
      /Cliente não encontrado ou não pertence ao usuário/
    );
  });
});
