import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Produto } from '../../src/domain/entities/produto';
import { RegraNegocioError } from '../../src/domain/errors/dominio-error';
import {
  ProdutoRepository,
  CriarProdutoDados,
  AtualizarProdutoDados,
} from '../../src/domain/repositories/produto.repository.interface';
import { AuthService, AuthUser } from '../../src/application/services/auth.service';
import {
  ListarProdutosUseCase,
  ObterProdutoUseCase,
  CriarProdutoUseCase,
  AtualizarProdutoUseCase,
  AlterarAtivoProdutoUseCase,
} from '../../src/application/use-cases/produto';
import { ProdutoService } from '../../src/application/services/produto.service';

/**
 * Mock em memória do ProdutoRepository para testes unitários dos casos de uso.
 */
class InMemoryProdutoRepository implements ProdutoRepository {
  public produtos: Map<string, Produto> = new Map();
  public deveFalharComErro: Error | null = null;

  async listar(usuarioId: string): Promise<Produto[]> {
    if (this.deveFalharComErro) throw this.deveFalharComErro;
    const lista: Produto[] = [];
    for (const p of this.produtos.values()) {
      if (p.usuarioId === usuarioId) {
        lista.push(p);
      }
    }
    return lista.sort((a, b) => a.nome.localeCompare(b.nome));
  }

  async buscarPorId(id: string): Promise<Produto | null> {
    if (this.deveFalharComErro) throw this.deveFalharComErro;
    return this.produtos.get(id) ?? null;
  }

  async criar(dados: CriarProdutoDados): Promise<Produto> {
    if (this.deveFalharComErro) throw this.deveFalharComErro;
    const id = `prd-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const novo = new Produto({
      id,
      usuarioId: dados.usuarioId,
      nome: dados.nome,
      descricao: dados.descricao,
      unidade: dados.unidade,
      precoBase: dados.precoBase,
      ativo: dados.ativo ?? true,
    });
    this.produtos.set(id, novo);
    return novo;
  }

  async atualizar(id: string, dados: AtualizarProdutoDados): Promise<Produto> {
    if (this.deveFalharComErro) throw this.deveFalharComErro;
    const p = this.produtos.get(id);
    if (!p) throw new Error('Produto não encontrado.');
    p.atualizar(dados);
    return p;
  }

  async alterarAtivo(id: string, ativo: boolean): Promise<void> {
    if (this.deveFalharComErro) throw this.deveFalharComErro;
    const p = this.produtos.get(id);
    if (!p) throw new Error('Produto não encontrado.');
    if (ativo) p.ativar();
    else p.desativar();
  }
}

function createMockAuthService(currentUser: AuthUser | null = { id: 'usr-1', email: 'user1@teste.com' }): AuthService {
  return {
    getCurrentUser: async () => currentUser,
  } as unknown as AuthService;
}

describe('Casos de Uso — Módulo de Produtos v1.0', () => {
  // =========================================================================
  // 1. Listar Produtos
  // =========================================================================
  describe('ListarProdutosUseCase', () => {
    it('deve listar todos os produtos do usuário autenticado', async () => {
      const repo = new InMemoryProdutoRepository();
      const auth = createMockAuthService({ id: 'usr-1', email: 'user1@teste.com' });
      const useCase = new ListarProdutosUseCase(repo, auth);

      await repo.criar({ usuarioId: 'usr-1', nome: 'Terra Vegetal 20kg', unidade: 'saco', precoBase: 22 });
      await repo.criar({ usuarioId: 'usr-1', nome: 'Adubo NPK 10-10-10', unidade: 'kg', precoBase: 15 });
      await repo.criar({ usuarioId: 'usr-outro', nome: 'Muda de Palmeira de Outro', unidade: 'un', precoBase: 120 });

      const lista = await useCase.execute();

      assert.strictEqual(lista.length, 2);
      assert.strictEqual(lista[0].nome, 'Adubo NPK 10-10-10');
      assert.strictEqual(lista[1].nome, 'Terra Vegetal 20kg');
    });

    it('deve rejeitar listagem quando usuário não estiver autenticado', async () => {
      const repo = new InMemoryProdutoRepository();
      const auth = createMockAuthService(null);
      const useCase = new ListarProdutosUseCase(repo, auth);

      await assert.rejects(
        async () => await useCase.execute(),
        /Usuário não autenticado/
      );
    });

    it('deve propagar erro de repositório', async () => {
      const repo = new InMemoryProdutoRepository();
      repo.deveFalharComErro = new Error('Erro no Postgres');
      const auth = createMockAuthService({ id: 'usr-1', email: 'user1@teste.com' });
      const useCase = new ListarProdutosUseCase(repo, auth);

      await assert.rejects(
        async () => await useCase.execute(),
        /Erro no Postgres/
      );
    });
  });

  // =========================================================================
  // 2. Obter Produto
  // =========================================================================
  describe('ObterProdutoUseCase', () => {
    it('deve retornar produto existente', async () => {
      const repo = new InMemoryProdutoRepository();
      const auth = createMockAuthService({ id: 'usr-1', email: 'user1@teste.com' });
      const useCase = new ObterProdutoUseCase(repo, auth);

      const criado = await repo.criar({
        usuarioId: 'usr-1',
        nome: 'Gramado Esmeralda',
        descricao: 'Placas de grama esmeralda 40x40cm',
        unidade: 'm²',
        precoBase: 9.8,
      });

      const obtido = await useCase.execute(criado.id);

      assert.ok(obtido);
      assert.strictEqual(obtido.id, criado.id);
      assert.strictEqual(obtido.nome, 'Gramado Esmeralda');
      assert.strictEqual(obtido.precoBase, 9.8);
      // Confirma que Produto NÃO possui usaMedicaoArea
      assert.strictEqual((obtido as any).usaMedicaoArea, undefined);
    });

    it('deve retornar null para produto inexistente', async () => {
      const repo = new InMemoryProdutoRepository();
      const auth = createMockAuthService({ id: 'usr-1', email: 'user1@teste.com' });
      const useCase = new ObterProdutoUseCase(repo, auth);

      const obtido = await useCase.execute('prd-inexistente');
      assert.strictEqual(obtido, null);
    });

    it('deve retornar null para produto de outro usuário', async () => {
      const repo = new InMemoryProdutoRepository();
      const auth = createMockAuthService({ id: 'usr-1', email: 'user1@teste.com' });
      const useCase = new ObterProdutoUseCase(repo, auth);

      const criadoOutro = await repo.criar({
        usuarioId: 'usr-2',
        nome: 'Produto Secreto de B',
        unidade: 'un',
        precoBase: 30,
      });

      const obtido = await useCase.execute(criadoOutro.id);
      assert.strictEqual(obtido, null);
    });

    it('deve rejeitar se ID for vazio', async () => {
      const repo = new InMemoryProdutoRepository();
      const auth = createMockAuthService({ id: 'usr-1', email: 'user1@teste.com' });
      const useCase = new ObterProdutoUseCase(repo, auth);

      await assert.rejects(
        async () => await useCase.execute('   '),
        RegraNegocioError
      );
    });
  });

  // =========================================================================
  // 3. Criar Produto
  // =========================================================================
  describe('CriarProdutoUseCase', () => {
    it('deve criar produto com dados válidos', async () => {
      const repo = new InMemoryProdutoRepository();
      const auth = createMockAuthService({ id: 'usr-1', email: 'user1@teste.com' });
      const useCase = new CriarProdutoUseCase(repo, auth);

      const novoProduto = await useCase.execute({
        nome: 'Pedra Branca Decorativa',
        descricao: 'Saco de 25kg de pedra branca dolomita',
        unidade: 'saco',
        precoBase: 38.9,
      });

      assert.ok(novoProduto.id);
      assert.strictEqual(novoProduto.usuarioId, 'usr-1');
      assert.strictEqual(novoProduto.nome, 'Pedra Branca Decorativa');
      assert.strictEqual(novoProduto.unidade, 'saco');
      assert.strictEqual(novoProduto.precoBase, 38.9);
      assert.strictEqual(novoProduto.ativo, true);
      // Produto não possui medição de área
      assert.strictEqual((novoProduto as any).usaMedicaoArea, undefined);
    });

    it('deve rejeitar nome vazio', async () => {
      const repo = new InMemoryProdutoRepository();
      const auth = createMockAuthService({ id: 'usr-1', email: 'user1@teste.com' });
      const useCase = new CriarProdutoUseCase(repo, auth);

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
      const repo = new InMemoryProdutoRepository();
      const auth = createMockAuthService({ id: 'usr-1', email: 'user1@teste.com' });
      const useCase = new CriarProdutoUseCase(repo, auth);

      await assert.rejects(
        async () =>
          await useCase.execute({
            nome: 'X'.repeat(151),
            unidade: 'un',
            precoBase: 10,
          }),
        RegraNegocioError
      );
    });

    it('deve rejeitar preço base negativo', async () => {
      const repo = new InMemoryProdutoRepository();
      const auth = createMockAuthService({ id: 'usr-1', email: 'user1@teste.com' });
      const useCase = new CriarProdutoUseCase(repo, auth);

      await assert.rejects(
        async () =>
          await useCase.execute({
            nome: 'Vaso',
            unidade: 'un',
            precoBase: -10,
          }),
        RegraNegocioError
      );
    });

    it('deve rejeitar unidade vazia', async () => {
      const repo = new InMemoryProdutoRepository();
      const auth = createMockAuthService({ id: 'usr-1', email: 'user1@teste.com' });
      const useCase = new CriarProdutoUseCase(repo, auth);

      await assert.rejects(
        async () =>
          await useCase.execute({
            nome: 'Vaso',
            unidade: '  ',
            precoBase: 10,
          }),
        RegraNegocioError
      );
    });

    it('deve rejeitar sem autenticação', async () => {
      const repo = new InMemoryProdutoRepository();
      const auth = createMockAuthService(null);
      const useCase = new CriarProdutoUseCase(repo, auth);

      await assert.rejects(
        async () =>
          await useCase.execute({
            nome: 'Vaso',
            unidade: 'un',
            precoBase: 10,
          }),
        /Usuário não autenticado/
      );
    });
  });

  // =========================================================================
  // 4. Atualizar Produto
  // =========================================================================
  describe('AtualizarProdutoUseCase', () => {
    it('deve atualizar dados do produto preservando titularidade (usuario_id)', async () => {
      const repo = new InMemoryProdutoRepository();
      const auth = createMockAuthService({ id: 'usr-1', email: 'user1@teste.com' });
      const useCase = new AtualizarProdutoUseCase(repo, auth);

      const criado = await repo.criar({
        usuarioId: 'usr-1',
        nome: 'Casca de Pinus P',
        unidade: 'saco',
        precoBase: 18,
      });

      const atualizado = await useCase.execute(criado.id, {
        nome: 'Casca de Pinus Polida G',
        precoBase: 24,
      });

      assert.strictEqual(atualizado.id, criado.id);
      assert.strictEqual(atualizado.usuarioId, 'usr-1');
      assert.strictEqual(atualizado.nome, 'Casca de Pinus Polida G');
      assert.strictEqual(atualizado.precoBase, 24);
    });

    it('deve rejeitar atualização se produto pertencer a outro usuário', async () => {
      const repo = new InMemoryProdutoRepository();
      const auth = createMockAuthService({ id: 'usr-1', email: 'user1@teste.com' });
      const useCase = new AtualizarProdutoUseCase(repo, auth);

      const criadoOutro = await repo.criar({
        usuarioId: 'usr-2',
        nome: 'Produto de B',
        unidade: 'un',
        precoBase: 10,
      });

      await assert.rejects(
        async () => await useCase.execute(criadoOutro.id, { nome: 'Hacker' }),
        /Produto não encontrado ou não pertence ao usuário/
      );
    });

    it('deve rejeitar atualização com nome vazio', async () => {
      const repo = new InMemoryProdutoRepository();
      const auth = createMockAuthService({ id: 'usr-1', email: 'user1@teste.com' });
      const useCase = new AtualizarProdutoUseCase(repo, auth);

      const criado = await repo.criar({
        usuarioId: 'usr-1',
        nome: 'Válido',
        unidade: 'un',
        precoBase: 10,
      });

      await assert.rejects(
        async () => await useCase.execute(criado.id, { nome: '   ' }),
        RegraNegocioError
      );
    });
  });

  // =========================================================================
  // 5. Ativar / Inativar Produto
  // =========================================================================
  describe('AlterarAtivoProdutoUseCase', () => {
    it('deve inativar produto logicamente (ativo = false)', async () => {
      const repo = new InMemoryProdutoRepository();
      const auth = createMockAuthService({ id: 'usr-1', email: 'user1@teste.com' });
      const useCase = new AlterarAtivoProdutoUseCase(repo, auth);

      const criado = await repo.criar({ usuarioId: 'usr-1', nome: 'Ativo', unidade: 'un', precoBase: 10, ativo: true });
      await useCase.execute(criado.id, false);

      const buscado = await repo.buscarPorId(criado.id);
      assert.strictEqual(buscado?.ativo, false);
    });

    it('deve reativar produto logicamente (ativo = true)', async () => {
      const repo = new InMemoryProdutoRepository();
      const auth = createMockAuthService({ id: 'usr-1', email: 'user1@teste.com' });
      const useCase = new AlterarAtivoProdutoUseCase(repo, auth);

      const criado = await repo.criar({ usuarioId: 'usr-1', nome: 'Inativo', unidade: 'un', precoBase: 10, ativo: false });
      await useCase.execute(criado.id, true);

      const buscado = await repo.buscarPorId(criado.id);
      assert.strictEqual(buscado?.ativo, true);
    });

    it('deve rejeitar alteração de status de produto de outro usuário', async () => {
      const repo = new InMemoryProdutoRepository();
      const auth = createMockAuthService({ id: 'usr-1', email: 'user1@teste.com' });
      const useCase = new AlterarAtivoProdutoUseCase(repo, auth);

      const criadoOutro = await repo.criar({ usuarioId: 'usr-2', nome: 'Outro', unidade: 'un', precoBase: 10, ativo: true });

      await assert.rejects(
        async () => await useCase.execute(criadoOutro.id, false),
        /Produto não encontrado ou não pertence ao usuário/
      );
    });
  });

  // =========================================================================
  // 6. ProdutoService Fachada
  // =========================================================================
  describe('ProdutoService (Fachada)', () => {
    it('deve integrar criação, listagem e inativação de produto', async () => {
      const repo = new InMemoryProdutoRepository();
      const auth = createMockAuthService({ id: 'usr-1', email: 'user1@teste.com' });
      const service = new ProdutoService(repo, auth);

      const criado = await service.criarProduto({
        nome: 'Mudas de Hera',
        unidade: 'muda',
        precoBase: 8.5,
      });
      assert.ok(criado.id);

      const lista = await service.listarProdutos();
      assert.strictEqual(lista.length, 1);
      assert.strictEqual(lista[0].nome, 'Mudas de Hera');

      await service.alterarAtivoProduto(criado.id, false);
      const obtido = await service.obterProduto(criado.id);
      assert.strictEqual(obtido?.ativo, false);
    });
  });
});
