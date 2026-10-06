import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Cliente } from '../../src/domain/entities/cliente';
import { Endereco } from '../../src/domain/entities/endereco';
import { RegraNegocioError } from '../../src/domain/errors/dominio-error';
import {
  ClienteRepository,
  CriarClienteDados,
  AtualizarClienteDados,
  SalvarEnderecoDados,
} from '../../src/domain/repositories/cliente.repository.interface';
import { AuthService, AuthUser } from '../../src/application/services/auth.service';
import {
  ListarClientesUseCase,
  ObterClienteUseCase,
  CriarClienteUseCase,
  AtualizarClienteUseCase,
  AlterarAtivoClienteUseCase,
  ObterEnderecoClienteUseCase,
  SalvarEnderecoClienteUseCase,
} from '../../src/application/use-cases/cliente';
import { ClienteService } from '../../src/application/services/cliente.service';

/**
 * Mock em memória do ClienteRepository para testes controlados dos casos de uso.
 */
class InMemoryClienteRepository implements ClienteRepository {
  public clientes: Map<string, Cliente> = new Map();
  public enderecos: Map<string, Endereco> = new Map(); // key: clienteId
  public deveFalharComErro: Error | null = null;

  async listar(usuarioId: string): Promise<Cliente[]> {
    if (this.deveFalharComErro) throw this.deveFalharComErro;
    const lista: Cliente[] = [];
    for (const cli of this.clientes.values()) {
      if (cli.usuarioId === usuarioId) {
        const end = this.enderecos.get(cli.id) ?? null;
        cli.endereco = end;
        lista.push(cli);
      }
    }
    return lista.sort((a, b) => a.nome.localeCompare(b.nome));
  }

  async buscarPorId(id: string): Promise<Cliente | null> {
    if (this.deveFalharComErro) throw this.deveFalharComErro;
    const cli = this.clientes.get(id);
    if (!cli) return null;
    const end = this.enderecos.get(cli.id) ?? null;
    cli.endereco = end;
    return cli;
  }

  async criar(dados: CriarClienteDados): Promise<Cliente> {
    if (this.deveFalharComErro) throw this.deveFalharComErro;
    const id = `cli-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const novoCliente = new Cliente({
      id,
      usuarioId: dados.usuarioId,
      nome: dados.nome,
      telefone: dados.telefone,
      email: dados.email,
      documento: dados.documento,
      observacoes: dados.observacoes,
      ativo: dados.ativo ?? true,
    });
    this.clientes.set(id, novoCliente);
    return novoCliente;
  }

  async atualizar(id: string, dados: AtualizarClienteDados): Promise<Cliente> {
    if (this.deveFalharComErro) throw this.deveFalharComErro;
    const cli = this.clientes.get(id);
    if (!cli) throw new Error('Cliente não encontrado.');
    cli.atualizarDados(dados);
    return cli;
  }

  async alterarAtivo(id: string, ativo: boolean): Promise<void> {
    if (this.deveFalharComErro) throw this.deveFalharComErro;
    const cli = this.clientes.get(id);
    if (!cli) throw new Error('Cliente não encontrado.');
    if (ativo) cli.ativar();
    else cli.desativar();
  }

  async obterEndereco(clienteId: string): Promise<Endereco | null> {
    if (this.deveFalharComErro) throw this.deveFalharComErro;
    return this.enderecos.get(clienteId) ?? null;
  }

  async salvarEndereco(clienteId: string, dados: SalvarEnderecoDados): Promise<Endereco> {
    if (this.deveFalharComErro) throw this.deveFalharComErro;
    const existente = this.enderecos.get(clienteId);
    if (existente) {
      existente.atualizar(dados);
      return existente;
    }
    const id = `end-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const novoEndereco = new Endereco({
      id,
      clienteId,
      ...dados,
    });
    this.enderecos.set(clienteId, novoEndereco);
    return novoEndereco;
  }
}

/**
 * Cria mock do AuthService retornando o usuário especificado.
 */
function createMockAuthService(currentUser: AuthUser | null = { id: 'usr-1', email: 'user1@teste.com' }): AuthService {
  return {
    getCurrentUser: async () => currentUser,
  } as unknown as AuthService;
}

describe('Casos de Uso — Módulo de Clientes v1.0', () => {
  // =========================================================================
  // 1. Listar Clientes
  // =========================================================================
  describe('ListarClientesUseCase', () => {
    it('deve listar todos os clientes do usuário autenticado', async () => {
      const repo = new InMemoryClienteRepository();
      const auth = createMockAuthService({ id: 'usr-1', email: 'user1@teste.com' });
      const useCase = new ListarClientesUseCase(repo, auth);

      await repo.criar({ usuarioId: 'usr-1', nome: 'Beto Jardins' });
      await repo.criar({ usuarioId: 'usr-1', nome: 'Ana Flores' });
      await repo.criar({ usuarioId: 'usr-outro', nome: 'Carlos de Outro Usuário' });

      const lista = await useCase.execute();

      assert.strictEqual(lista.length, 2);
      assert.strictEqual(lista[0].nome, 'Ana Flores');
      assert.strictEqual(lista[1].nome, 'Beto Jardins');
    });

    it('deve rejeitar listagem quando usuário não estiver autenticado', async () => {
      const repo = new InMemoryClienteRepository();
      const auth = createMockAuthService(null);
      const useCase = new ListarClientesUseCase(repo, auth);

      await assert.rejects(
        async () => await useCase.execute(),
        /Usuário não autenticado/
      );
    });

    it('deve propagar erro lançado pelo Supabase/repositório', async () => {
      const repo = new InMemoryClienteRepository();
      repo.deveFalharComErro = new Error('Falha de conexão com o banco de dados');
      const auth = createMockAuthService({ id: 'usr-1', email: 'user1@teste.com' });
      const useCase = new ListarClientesUseCase(repo, auth);

      await assert.rejects(
        async () => await useCase.execute(),
        /Falha de conexão com o banco de dados/
      );
    });
  });

  // =========================================================================
  // 2. Obter Cliente
  // =========================================================================
  describe('ObterClienteUseCase', () => {
    it('deve retornar cliente existente com endereço ausente', async () => {
      const repo = new InMemoryClienteRepository();
      const auth = createMockAuthService({ id: 'usr-1', email: 'user1@teste.com' });
      const useCase = new ObterClienteUseCase(repo, auth);

      const criado = await repo.criar({ usuarioId: 'usr-1', nome: 'Marcos Silva' });
      const obtido = await useCase.execute(criado.id);

      assert.ok(obtido);
      assert.strictEqual(obtido.id, criado.id);
      assert.strictEqual(obtido.nome, 'Marcos Silva');
      assert.strictEqual(obtido.endereco, null);
    });

    it('deve retornar cliente existente com endereço associado', async () => {
      const repo = new InMemoryClienteRepository();
      const auth = createMockAuthService({ id: 'usr-1', email: 'user1@teste.com' });
      const useCase = new ObterClienteUseCase(repo, auth);

      const criado = await repo.criar({ usuarioId: 'usr-1', nome: 'Luciana Ramos' });
      await repo.salvarEndereco(criado.id, {
        cidade: 'Campinas',
        estado: 'SP',
        logradouro: 'Rua das Palmeiras',
      });

      const obtido = await useCase.execute(criado.id);

      assert.ok(obtido);
      assert.ok(obtido.endereco);
      assert.strictEqual(obtido.endereco.cidade, 'Campinas');
      assert.strictEqual(obtido.endereco.estado, 'SP');
    });

    it('deve retornar null para cliente inexistente', async () => {
      const repo = new InMemoryClienteRepository();
      const auth = createMockAuthService({ id: 'usr-1', email: 'user1@teste.com' });
      const useCase = new ObterClienteUseCase(repo, auth);

      const obtido = await useCase.execute('cli-id-inexistente');
      assert.strictEqual(obtido, null);
    });

    it('deve retornar null para cliente pertencente a outro usuário (isolamento multi-tenant)', async () => {
      const repo = new InMemoryClienteRepository();
      const auth = createMockAuthService({ id: 'usr-1', email: 'user1@teste.com' });
      const useCase = new ObterClienteUseCase(repo, auth);

      const clienteOutro = await repo.criar({ usuarioId: 'usr-2', nome: 'Cliente do Usuário 2' });
      const obtido = await useCase.execute(clienteOutro.id);

      assert.strictEqual(obtido, null);
    });

    it('deve lançar erro se ID for vazio', async () => {
      const repo = new InMemoryClienteRepository();
      const auth = createMockAuthService({ id: 'usr-1', email: 'user1@teste.com' });
      const useCase = new ObterClienteUseCase(repo, auth);

      await assert.rejects(
        async () => await useCase.execute('   '),
        RegraNegocioError
      );
    });
  });

  // =========================================================================
  // 3. Criar Cliente
  // =========================================================================
  describe('CriarClienteUseCase', () => {
    it('deve criar cliente com dados válidos e endereço ausente', async () => {
      const repo = new InMemoryClienteRepository();
      const auth = createMockAuthService({ id: 'usr-1', email: 'user1@teste.com' });
      const useCase = new CriarClienteUseCase(repo, auth);

      const novo = await useCase.execute({
        nome: 'Juliana Costa',
        telefone: '(11) 98765-4321',
        email: 'juliana@empresa.com',
        documento: '123.456.789-00',
        observacoes: 'Cliente preferencial',
      });

      assert.ok(novo.id);
      assert.strictEqual(novo.usuarioId, 'usr-1');
      assert.strictEqual(novo.nome, 'Juliana Costa');
      assert.strictEqual(novo.telefone, '(11) 98765-4321');
      assert.strictEqual(novo.email, 'juliana@empresa.com');
      assert.strictEqual(novo.documento, '123.456.789-00');
      assert.strictEqual(novo.observacoes, 'Cliente preferencial');
      assert.strictEqual(novo.ativo, true);
      assert.strictEqual(novo.endereco, null);
    });

    it('deve criar cliente e persistir endereço quando fornecido', async () => {
      const repo = new InMemoryClienteRepository();
      const auth = createMockAuthService({ id: 'usr-1', email: 'user1@teste.com' });
      const useCase = new CriarClienteUseCase(repo, auth);

      const novo = await useCase.execute({
        nome: 'Fernando Mendes',
        endereco: {
          cep: '01310-100',
          logradouro: 'Av. Paulista',
          numero: '1000',
          complemento: 'Apto 42',
          bairro: 'Bela Vista',
          cidade: 'São Paulo',
          estado: 'SP',
          latitude: -23.565,
          longitude: -46.652,
        },
      });

      assert.ok(novo.id);
      assert.ok(novo.endereco);
      assert.strictEqual(novo.endereco.cidade, 'São Paulo');
      assert.strictEqual(novo.endereco.estado, 'SP');
      assert.strictEqual(novo.endereco.cep, '01310-100');
      assert.strictEqual(novo.endereco.latitude, -23.565);
    });

    it('deve rejeitar criação com nome vazio', async () => {
      const repo = new InMemoryClienteRepository();
      const auth = createMockAuthService({ id: 'usr-1', email: 'user1@teste.com' });
      const useCase = new CriarClienteUseCase(repo, auth);

      await assert.rejects(
        async () => await useCase.execute({ nome: '   ' }),
        RegraNegocioError
      );
    });

    it('deve rejeitar criação com nome excedendo 150 caracteres', async () => {
      const repo = new InMemoryClienteRepository();
      const auth = createMockAuthService({ id: 'usr-1', email: 'user1@teste.com' });
      const useCase = new CriarClienteUseCase(repo, auth);

      await assert.rejects(
        async () => await useCase.execute({ nome: 'A'.repeat(151) }),
        RegraNegocioError
      );
    });

    it('deve rejeitar email inválido quando informado', async () => {
      const repo = new InMemoryClienteRepository();
      const auth = createMockAuthService({ id: 'usr-1', email: 'user1@teste.com' });
      const useCase = new CriarClienteUseCase(repo, auth);

      await assert.rejects(
        async () => await useCase.execute({ nome: 'Teste', email: 'email-sem-arroba' }),
        RegraNegocioError
      );
    });

    it('deve rejeitar telefone excedendo 30 caracteres', async () => {
      const repo = new InMemoryClienteRepository();
      const auth = createMockAuthService({ id: 'usr-1', email: 'user1@teste.com' });
      const useCase = new CriarClienteUseCase(repo, auth);

      await assert.rejects(
        async () => await useCase.execute({ nome: 'Teste', telefone: '1'.repeat(31) }),
        RegraNegocioError
      );
    });

    it('deve rejeitar latitude fora dos limites [-90, 90]', async () => {
      const repo = new InMemoryClienteRepository();
      const auth = createMockAuthService({ id: 'usr-1', email: 'user1@teste.com' });
      const useCase = new CriarClienteUseCase(repo, auth);

      await assert.rejects(
        async () =>
          await useCase.execute({
            nome: 'Teste',
            endereco: { latitude: 95.0 },
          }),
        RegraNegocioError
      );
    });

    it('deve rejeitar longitude fora dos limites [-180, 180]', async () => {
      const repo = new InMemoryClienteRepository();
      const auth = createMockAuthService({ id: 'usr-1', email: 'user1@teste.com' });
      const useCase = new CriarClienteUseCase(repo, auth);

      await assert.rejects(
        async () =>
          await useCase.execute({
            nome: 'Teste',
            endereco: { longitude: -190.0 },
          }),
        RegraNegocioError
      );
    });

    it('deve rejeitar criação se usuário não estiver autenticado', async () => {
      const repo = new InMemoryClienteRepository();
      const auth = createMockAuthService(null);
      const useCase = new CriarClienteUseCase(repo, auth);

      await assert.rejects(
        async () => await useCase.execute({ nome: 'Sem Auth' }),
        /Usuário não autenticado/
      );
    });
  });

  // =========================================================================
  // 4. Atualizar Cliente
  // =========================================================================
  describe('AtualizarClienteUseCase', () => {
    it('deve atualizar dados do cliente e preservar usuario_id', async () => {
      const repo = new InMemoryClienteRepository();
      const auth = createMockAuthService({ id: 'usr-1', email: 'user1@teste.com' });
      const useCase = new AtualizarClienteUseCase(repo, auth);

      const cliente = await repo.criar({ usuarioId: 'usr-1', nome: 'Nome Antigo', telefone: '111' });

      const atualizado = await useCase.execute(cliente.id, {
        nome: 'Nome Novo',
        telefone: '222',
        observacoes: 'Atualizado com sucesso',
      });

      assert.strictEqual(atualizado.id, cliente.id);
      assert.strictEqual(atualizado.usuarioId, 'usr-1'); // Não alterado
      assert.strictEqual(atualizado.nome, 'Nome Novo');
      assert.strictEqual(atualizado.telefone, '222');
      assert.strictEqual(atualizado.observacoes, 'Atualizado com sucesso');
    });

    it('deve atualizar ou salvar endereço durante atualização do cliente', async () => {
      const repo = new InMemoryClienteRepository();
      const auth = createMockAuthService({ id: 'usr-1', email: 'user1@teste.com' });
      const useCase = new AtualizarClienteUseCase(repo, auth);

      const cliente = await repo.criar({ usuarioId: 'usr-1', nome: 'Cliente Com Endereço' });

      const atualizado = await useCase.execute(cliente.id, {
        endereco: {
          logradouro: 'Rua Nova',
          cidade: 'Curitiba',
          estado: 'PR',
        },
      });

      assert.ok(atualizado.endereco);
      assert.strictEqual(atualizado.endereco.cidade, 'Curitiba');
      assert.strictEqual(atualizado.endereco.estado, 'PR');
    });

    it('deve rejeitar atualização se cliente pertencer a outro usuário', async () => {
      const repo = new InMemoryClienteRepository();
      const auth = createMockAuthService({ id: 'usr-1', email: 'user1@teste.com' });
      const useCase = new AtualizarClienteUseCase(repo, auth);

      const clienteOutro = await repo.criar({ usuarioId: 'usr-2', nome: 'Cliente do Outro' });

      await assert.rejects(
        async () => await useCase.execute(clienteOutro.id, { nome: 'Tentativa Hacker' }),
        /Cliente não encontrado ou não pertence ao usuário/
      );
    });

    it('deve rejeitar atualização com nome vazio', async () => {
      const repo = new InMemoryClienteRepository();
      const auth = createMockAuthService({ id: 'usr-1', email: 'user1@teste.com' });
      const useCase = new AtualizarClienteUseCase(repo, auth);

      const cliente = await repo.criar({ usuarioId: 'usr-1', nome: 'Cliente Válido' });

      await assert.rejects(
        async () => await useCase.execute(cliente.id, { nome: '' }),
        RegraNegocioError
      );
    });
  });

  // =========================================================================
  // 5. Ativar e Inativar Cliente
  // =========================================================================
  describe('AlterarAtivoClienteUseCase', () => {
    it('deve inativar cliente logicamente (ativo = false)', async () => {
      const repo = new InMemoryClienteRepository();
      const auth = createMockAuthService({ id: 'usr-1', email: 'user1@teste.com' });
      const useCase = new AlterarAtivoClienteUseCase(repo, auth);

      const cliente = await repo.criar({ usuarioId: 'usr-1', nome: 'Cliente Ativo', ativo: true });
      assert.strictEqual(cliente.ativo, true);

      await useCase.execute(cliente.id, false);
      const buscado = await repo.buscarPorId(cliente.id);
      assert.strictEqual(buscado?.ativo, false);
    });

    it('deve reativar cliente logicamente (ativo = true)', async () => {
      const repo = new InMemoryClienteRepository();
      const auth = createMockAuthService({ id: 'usr-1', email: 'user1@teste.com' });
      const useCase = new AlterarAtivoClienteUseCase(repo, auth);

      const cliente = await repo.criar({ usuarioId: 'usr-1', nome: 'Cliente Inativo', ativo: false });
      assert.strictEqual(cliente.ativo, false);

      await useCase.execute(cliente.id, true);
      const buscado = await repo.buscarPorId(cliente.id);
      assert.strictEqual(buscado?.ativo, true);
    });

    it('deve rejeitar alteração de status para cliente de outro usuário', async () => {
      const repo = new InMemoryClienteRepository();
      const auth = createMockAuthService({ id: 'usr-1', email: 'user1@teste.com' });
      const useCase = new AlterarAtivoClienteUseCase(repo, auth);

      const clienteOutro = await repo.criar({ usuarioId: 'usr-2', nome: 'Cliente Outro', ativo: true });

      await assert.rejects(
        async () => await useCase.execute(clienteOutro.id, false),
        /Cliente não encontrado ou não pertence ao usuário/
      );
    });
  });

  // =========================================================================
  // 6. Endereço do Cliente
  // =========================================================================
  describe('Obter e Salvar Endereço', () => {
    it('deve obter null quando cliente não possui endereço', async () => {
      const repo = new InMemoryClienteRepository();
      const auth = createMockAuthService({ id: 'usr-1', email: 'user1@teste.com' });
      const useCase = new ObterEnderecoClienteUseCase(repo, auth);

      const cliente = await repo.criar({ usuarioId: 'usr-1', nome: 'Sem Endereço' });
      const end = await useCase.execute(cliente.id);

      assert.strictEqual(end, null);
    });

    it('deve salvar e depois obter endereço do cliente', async () => {
      const repo = new InMemoryClienteRepository();
      const auth = createMockAuthService({ id: 'usr-1', email: 'user1@teste.com' });
      const salvarUseCase = new SalvarEnderecoClienteUseCase(repo, auth);
      const obterUseCase = new ObterEnderecoClienteUseCase(repo, auth);

      const cliente = await repo.criar({ usuarioId: 'usr-1', nome: 'Com Endereço' });

      const salvo = await salvarUseCase.execute(cliente.id, {
        cep: '13000-000',
        logradouro: 'Rua das Acácias',
        cidade: 'Campinas',
        estado: 'SP',
      });

      assert.ok(salvo.id);
      assert.strictEqual(salvo.cidade, 'Campinas');

      const obtido = await obterUseCase.execute(cliente.id);
      assert.ok(obtido);
      assert.strictEqual(obtido.cidade, 'Campinas');
      assert.strictEqual(obtido.logradouro, 'Rua das Acácias');
    });
  });

  // =========================================================================
  // 7. ClienteService Facade
  // =========================================================================
  describe('ClienteService (Fachada)', () => {
    it('deve orquestrar criação, listagem e inativação através do serviço', async () => {
      const repo = new InMemoryClienteRepository();
      const auth = createMockAuthService({ id: 'usr-1', email: 'user1@teste.com' });
      const service = new ClienteService(repo, auth);

      const criado = await service.criarCliente({ nome: 'Cliente Via Service' });
      assert.ok(criado.id);

      const lista = await service.listarClientes();
      assert.strictEqual(lista.length, 1);
      assert.strictEqual(lista[0].nome, 'Cliente Via Service');

      await service.alterarAtivoCliente(criado.id, false);
      const obtido = await service.obterCliente(criado.id);
      assert.strictEqual(obtido?.ativo, false);
    });
  });
});
