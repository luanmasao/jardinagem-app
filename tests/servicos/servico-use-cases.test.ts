import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Servico } from '../../src/domain/entities/servico';
import { RegraNegocioError } from '../../src/domain/errors/dominio-error';
import {
  ServicoRepository,
  CriarServicoDados,
  AtualizarServicoDados,
} from '../../src/domain/repositories/servico.repository.interface';
import { AuthService, AuthUser } from '../../src/application/services/auth.service';
import {
  ListarServicosUseCase,
  ObterServicoUseCase,
  CriarServicoUseCase,
  AtualizarServicoUseCase,
  AlterarAtivoServicoUseCase,
} from '../../src/application/use-cases/servico';
import { ServicoService } from '../../src/application/services/servico.service';

/**
 * Mock em memória do ServicoRepository para testes unitários dos casos de uso.
 */
class InMemoryServicoRepository implements ServicoRepository {
  public servicos: Map<string, Servico> = new Map();
  public deveFalharComErro: Error | null = null;

  async listar(usuarioId: string): Promise<Servico[]> {
    if (this.deveFalharComErro) throw this.deveFalharComErro;
    const lista: Servico[] = [];
    for (const s of this.servicos.values()) {
      if (s.usuarioId === usuarioId) {
        lista.push(s);
      }
    }
    return lista.sort((a, b) => a.nome.localeCompare(b.nome));
  }

  async buscarPorId(id: string): Promise<Servico | null> {
    if (this.deveFalharComErro) throw this.deveFalharComErro;
    return this.servicos.get(id) ?? null;
  }

  async criar(dados: CriarServicoDados): Promise<Servico> {
    if (this.deveFalharComErro) throw this.deveFalharComErro;
    const id = `srv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const novo = new Servico({
      id,
      usuarioId: dados.usuarioId,
      nome: dados.nome,
      descricao: dados.descricao,
      unidade: dados.unidade,
      precoBase: dados.precoBase,
      usaMedicaoArea: dados.usaMedicaoArea ?? false,
      ativo: dados.ativo ?? true,
    });
    this.servicos.set(id, novo);
    return novo;
  }

  async atualizar(id: string, dados: AtualizarServicoDados): Promise<Servico> {
    if (this.deveFalharComErro) throw this.deveFalharComErro;
    const s = this.servicos.get(id);
    if (!s) throw new Error('Serviço não encontrado.');
    s.atualizar(dados);
    return s;
  }

  async alterarAtivo(id: string, ativo: boolean): Promise<void> {
    if (this.deveFalharComErro) throw this.deveFalharComErro;
    const s = this.servicos.get(id);
    if (!s) throw new Error('Serviço não encontrado.');
    if (ativo) s.ativar();
    else s.desativar();
  }
}

function createMockAuthService(currentUser: AuthUser | null = { id: 'usr-1', email: 'user1@teste.com' }): AuthService {
  return {
    getCurrentUser: async () => currentUser,
  } as unknown as AuthService;
}

describe('Casos de Uso — Módulo de Serviços v1.0', () => {
  // =========================================================================
  // 1. Listar Serviços
  // =========================================================================
  describe('ListarServicosUseCase', () => {
    it('deve listar todos os serviços do usuário autenticado', async () => {
      const repo = new InMemoryServicoRepository();
      const auth = createMockAuthService({ id: 'usr-1', email: 'user1@teste.com' });
      const useCase = new ListarServicosUseCase(repo, auth);

      await repo.criar({ usuarioId: 'usr-1', nome: 'Poda de Árvores', unidade: 'un', precoBase: 150 });
      await repo.criar({ usuarioId: 'usr-1', nome: 'Corte de Grama', unidade: 'm²', precoBase: 2.5, usaMedicaoArea: true });
      await repo.criar({ usuarioId: 'usr-outro', nome: 'Serviço de Outro', unidade: 'h', precoBase: 80 });

      const lista = await useCase.execute();

      assert.strictEqual(lista.length, 2);
      assert.strictEqual(lista[0].nome, 'Corte de Grama');
      assert.strictEqual(lista[1].nome, 'Poda de Árvores');
    });

    it('deve rejeitar listagem quando usuário não estiver autenticado', async () => {
      const repo = new InMemoryServicoRepository();
      const auth = createMockAuthService(null);
      const useCase = new ListarServicosUseCase(repo, auth);

      await assert.rejects(
        async () => await useCase.execute(),
        /Usuário não autenticado/
      );
    });

    it('deve propagar erro lançado pelo repositório', async () => {
      const repo = new InMemoryServicoRepository();
      repo.deveFalharComErro = new Error('Falha de conexão PostgREST');
      const auth = createMockAuthService({ id: 'usr-1', email: 'user1@teste.com' });
      const useCase = new ListarServicosUseCase(repo, auth);

      await assert.rejects(
        async () => await useCase.execute(),
        /Falha de conexão PostgREST/
      );
    });
  });

  // =========================================================================
  // 2. Obter Serviço
  // =========================================================================
  describe('ObterServicoUseCase', () => {
    it('deve retornar serviço existente', async () => {
      const repo = new InMemoryServicoRepository();
      const auth = createMockAuthService({ id: 'usr-1', email: 'user1@teste.com' });
      const useCase = new ObterServicoUseCase(repo, auth);

      const criado = await repo.criar({
        usuarioId: 'usr-1',
        nome: 'Adubação',
        unidade: 'm²',
        precoBase: 5,
        usaMedicaoArea: true,
      });

      const obtido = await useCase.execute(criado.id);

      assert.ok(obtido);
      assert.strictEqual(obtido.id, criado.id);
      assert.strictEqual(obtido.nome, 'Adubação');
      assert.strictEqual(obtido.usaMedicaoArea, true);
    });

    it('deve retornar null para serviço inexistente', async () => {
      const repo = new InMemoryServicoRepository();
      const auth = createMockAuthService({ id: 'usr-1', email: 'user1@teste.com' });
      const useCase = new ObterServicoUseCase(repo, auth);

      const obtido = await useCase.execute('srv-inexistente');
      assert.strictEqual(obtido, null);
    });

    it('deve retornar null para serviço pertencente a outro usuário', async () => {
      const repo = new InMemoryServicoRepository();
      const auth = createMockAuthService({ id: 'usr-1', email: 'user1@teste.com' });
      const useCase = new ObterServicoUseCase(repo, auth);

      const criadoOutro = await repo.criar({
        usuarioId: 'usr-2',
        nome: 'Serviço Privado de B',
        unidade: 'un',
        precoBase: 100,
      });

      const obtido = await useCase.execute(criadoOutro.id);
      assert.strictEqual(obtido, null);
    });

    it('deve rejeitar se ID for vazio', async () => {
      const repo = new InMemoryServicoRepository();
      const auth = createMockAuthService({ id: 'usr-1', email: 'user1@teste.com' });
      const useCase = new ObterServicoUseCase(repo, auth);

      await assert.rejects(
        async () => await useCase.execute('  '),
        RegraNegocioError
      );
    });
  });

  // =========================================================================
  // 3. Criar Serviço
  // =========================================================================
  describe('CriarServicoUseCase', () => {
    it('deve criar serviço com usaMedicaoArea = true e unidade m² (RN16)', async () => {
      const repo = new InMemoryServicoRepository();
      const auth = createMockAuthService({ id: 'usr-1', email: 'user1@teste.com' });
      const useCase = new CriarServicoUseCase(repo, auth);

      const novo = await useCase.execute({
        nome: 'Limpeza de Terreno',
        descricao: 'Remoção de ervas daninhas e entulho leve',
        unidade: 'm²',
        precoBase: 12.5,
        usaMedicaoArea: true,
      });

      assert.ok(novo.id);
      assert.strictEqual(novo.usuarioId, 'usr-1');
      assert.strictEqual(novo.nome, 'Limpeza de Terreno');
      assert.strictEqual(novo.unidade, 'm²');
      assert.strictEqual(novo.precoBase, 12.5);
      assert.strictEqual(novo.usaMedicaoArea, true);
      assert.strictEqual(novo.ativo, true);
    });

    it('deve criar serviço com usaMedicaoArea = false e unidade h', async () => {
      const repo = new InMemoryServicoRepository();
      const auth = createMockAuthService({ id: 'usr-1', email: 'user1@teste.com' });
      const useCase = new CriarServicoUseCase(repo, auth);

      const novo = await useCase.execute({
        nome: 'Consultoria Paisagística',
        unidade: 'h',
        precoBase: 150,
        usaMedicaoArea: false,
      });

      assert.ok(novo.id);
      assert.strictEqual(novo.unidade, 'h');
      assert.strictEqual(novo.usaMedicaoArea, false);
    });

    it('deve rejeitar serviço com usaMedicaoArea = true e unidade diferente de m² (RN16)', async () => {
      const repo = new InMemoryServicoRepository();
      const auth = createMockAuthService({ id: 'usr-1', email: 'user1@teste.com' });
      const useCase = new CriarServicoUseCase(repo, auth);

      await assert.rejects(
        async () =>
          await useCase.execute({
            nome: 'Serviço Inválido',
            unidade: 'un',
            precoBase: 10,
            usaMedicaoArea: true,
          }),
        /medição de área/i
      );
    });

    it('deve rejeitar nome vazio', async () => {
      const repo = new InMemoryServicoRepository();
      const auth = createMockAuthService({ id: 'usr-1', email: 'user1@teste.com' });
      const useCase = new CriarServicoUseCase(repo, auth);

      await assert.rejects(
        async () =>
          await useCase.execute({
            nome: '   ',
            unidade: 'un',
            precoBase: 10,
          }),
        RegraNegocioError
      );
    });

    it('deve rejeitar nome maior que 150 caracteres', async () => {
      const repo = new InMemoryServicoRepository();
      const auth = createMockAuthService({ id: 'usr-1', email: 'user1@teste.com' });
      const useCase = new CriarServicoUseCase(repo, auth);

      await assert.rejects(
        async () =>
          await useCase.execute({
            nome: 'A'.repeat(151),
            unidade: 'un',
            precoBase: 10,
          }),
        RegraNegocioError
      );
    });

    it('deve rejeitar preço base negativo', async () => {
      const repo = new InMemoryServicoRepository();
      const auth = createMockAuthService({ id: 'usr-1', email: 'user1@teste.com' });
      const useCase = new CriarServicoUseCase(repo, auth);

      await assert.rejects(
        async () =>
          await useCase.execute({
            nome: 'Poda',
            unidade: 'un',
            precoBase: -5,
          }),
        RegraNegocioError
      );
    });

    it('deve rejeitar quando usuário não autenticado', async () => {
      const repo = new InMemoryServicoRepository();
      const auth = createMockAuthService(null);
      const useCase = new CriarServicoUseCase(repo, auth);

      await assert.rejects(
        async () =>
          await useCase.execute({
            nome: 'Poda',
            unidade: 'un',
            precoBase: 50,
          }),
        /Usuário não autenticado/
      );
    });
  });

  // =========================================================================
  // 4. Atualizar Serviço
  // =========================================================================
  describe('AtualizarServicoUseCase', () => {
    it('deve atualizar serviço preservando titularidade (usuario_id)', async () => {
      const repo = new InMemoryServicoRepository();
      const auth = createMockAuthService({ id: 'usr-1', email: 'user1@teste.com' });
      const useCase = new AtualizarServicoUseCase(repo, auth);

      const criado = await repo.criar({
        usuarioId: 'usr-1',
        nome: 'Nome Antigo',
        unidade: 'un',
        precoBase: 50,
        usaMedicaoArea: false,
      });

      const atualizado = await useCase.execute(criado.id, {
        nome: 'Nome Novo',
        precoBase: 75.5,
      });

      assert.strictEqual(atualizado.id, criado.id);
      assert.strictEqual(atualizado.usuarioId, 'usr-1');
      assert.strictEqual(atualizado.nome, 'Nome Novo');
      assert.strictEqual(atualizado.precoBase, 75.5);
    });

    it('deve rejeitar atualização se serviço pertencer a outro usuário', async () => {
      const repo = new InMemoryServicoRepository();
      const auth = createMockAuthService({ id: 'usr-1', email: 'user1@teste.com' });
      const useCase = new AtualizarServicoUseCase(repo, auth);

      const criadoOutro = await repo.criar({
        usuarioId: 'usr-2',
        nome: 'De Outro Usuário',
        unidade: 'un',
        precoBase: 50,
      });

      await assert.rejects(
        async () => await useCase.execute(criadoOutro.id, { nome: 'Hacker' }),
        /Serviço não encontrado ou não pertence ao usuário/
      );
    });

    it('deve rejeitar atualização com usaMedicaoArea = true e unidade incompatível', async () => {
      const repo = new InMemoryServicoRepository();
      const auth = createMockAuthService({ id: 'usr-1', email: 'user1@teste.com' });
      const useCase = new AtualizarServicoUseCase(repo, auth);

      const criado = await repo.criar({
        usuarioId: 'usr-1',
        nome: 'Serviço Teste',
        unidade: 'un',
        precoBase: 50,
        usaMedicaoArea: false,
      });

      await assert.rejects(
        async () =>
          await useCase.execute(criado.id, {
            usaMedicaoArea: true,
            unidade: 'kg',
          }),
        /medição de área/i
      );
    });
  });

  // =========================================================================
  // 5. Ativar / Inativar Serviço
  // =========================================================================
  describe('AlterarAtivoServicoUseCase', () => {
    it('deve inativar serviço logicamente (ativo = false)', async () => {
      const repo = new InMemoryServicoRepository();
      const auth = createMockAuthService({ id: 'usr-1', email: 'user1@teste.com' });
      const useCase = new AlterarAtivoServicoUseCase(repo, auth);

      const criado = await repo.criar({ usuarioId: 'usr-1', nome: 'Ativo', unidade: 'un', precoBase: 10, ativo: true });
      await useCase.execute(criado.id, false);

      const buscado = await repo.buscarPorId(criado.id);
      assert.strictEqual(buscado?.ativo, false);
    });

    it('deve reativar serviço logicamente (ativo = true)', async () => {
      const repo = new InMemoryServicoRepository();
      const auth = createMockAuthService({ id: 'usr-1', email: 'user1@teste.com' });
      const useCase = new AlterarAtivoServicoUseCase(repo, auth);

      const criado = await repo.criar({ usuarioId: 'usr-1', nome: 'Inativo', unidade: 'un', precoBase: 10, ativo: false });
      await useCase.execute(criado.id, true);

      const buscado = await repo.buscarPorId(criado.id);
      assert.strictEqual(buscado?.ativo, true);
    });

    it('deve rejeitar alteração de status para serviço de outro usuário', async () => {
      const repo = new InMemoryServicoRepository();
      const auth = createMockAuthService({ id: 'usr-1', email: 'user1@teste.com' });
      const useCase = new AlterarAtivoServicoUseCase(repo, auth);

      const criadoOutro = await repo.criar({ usuarioId: 'usr-2', nome: 'Outro', unidade: 'un', precoBase: 10, ativo: true });

      await assert.rejects(
        async () => await useCase.execute(criadoOutro.id, false),
        /Serviço não encontrado ou não pertence ao usuário/
      );
    });
  });

  // =========================================================================
  // 6. ServicoService Fachada
  // =========================================================================
  describe('ServicoService (Fachada)', () => {
    it('deve integrar criação, listagem e inativação de serviço', async () => {
      const repo = new InMemoryServicoRepository();
      const auth = createMockAuthService({ id: 'usr-1', email: 'user1@teste.com' });
      const service = new ServicoService(repo, auth);

      const criado = await service.criarServico({
        nome: 'Roçagem de Gramado',
        unidade: 'm²',
        precoBase: 1.8,
        usaMedicaoArea: true,
      });
      assert.ok(criado.id);

      const lista = await service.listarServicos();
      assert.strictEqual(lista.length, 1);
      assert.strictEqual(lista[0].nome, 'Roçagem de Gramado');

      await service.alterarAtivoServico(criado.id, false);
      const obtido = await service.obterServico(criado.id);
      assert.strictEqual(obtido?.ativo, false);
    });
  });
});
