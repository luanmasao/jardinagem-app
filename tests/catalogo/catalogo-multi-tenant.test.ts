import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Servico } from '../../src/domain/entities/servico';
import { Produto } from '../../src/domain/entities/produto';
import {
  ServicoRepository,
  CriarServicoDados,
  AtualizarServicoDados,
} from '../../src/domain/repositories/servico.repository.interface';
import {
  ProdutoRepository,
  CriarProdutoDados,
  AtualizarProdutoDados,
} from '../../src/domain/repositories/produto.repository.interface';
import { AuthService, AuthUser } from '../../src/application/services/auth.service';
import { ServicoService } from '../../src/application/services/servico.service';
import { ProdutoService } from '../../src/application/services/produto.service';

/**
 * Repositório simulando o comportamento de RLS estrito do Supabase para public.servico:
 * policies: servico_select_policy, servico_insert_policy, servico_update_policy, servico_delete_policy.
 */
class RlsSimulatedServicoRepository implements ServicoRepository {
  private tabelaServico: Map<string, {
    id: string;
    usuarioId: string;
    nome: string;
    descricao: string | null;
    unidade: string;
    precoBase: number;
    usaMedicaoArea: boolean;
    ativo: boolean;
  }> = new Map();

  constructor(private getAuthUserId: () => string | null) {}

  private checkAuth(): string {
    const uid = this.getAuthUserId();
    if (!uid) throw new Error('RLS: Violação de acesso - Sessão não autenticada');
    return uid;
  }

  async listar(usuarioId: string): Promise<Servico[]> {
    const authUid = this.checkAuth();
    const resultados: Servico[] = [];
    for (const row of this.tabelaServico.values()) {
      if (row.usuarioId === authUid && row.usuarioId === usuarioId) {
        resultados.push(new Servico(row));
      }
    }
    return resultados.sort((a, b) => a.nome.localeCompare(b.nome));
  }

  async buscarPorId(id: string): Promise<Servico | null> {
    const authUid = this.checkAuth();
    const row = this.tabelaServico.get(id);
    if (!row || row.usuarioId !== authUid) {
      return null;
    }
    return new Servico(row);
  }

  async criar(dados: CriarServicoDados): Promise<Servico> {
    const authUid = this.checkAuth();
    if (dados.usuarioId !== authUid) {
      throw new Error('RLS: Violação de INSERT - usuario_id não confere com auth.uid()');
    }
    const id = `srv-uuid-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const row = {
      id,
      usuarioId: dados.usuarioId,
      nome: dados.nome,
      descricao: dados.descricao ?? null,
      unidade: dados.unidade,
      precoBase: dados.precoBase,
      usaMedicaoArea: dados.usaMedicaoArea ?? false,
      ativo: dados.ativo ?? true,
    };
    this.tabelaServico.set(id, row);
    return new Servico(row);
  }

  async atualizar(id: string, dados: AtualizarServicoDados): Promise<Servico> {
    const authUid = this.checkAuth();
    const row = this.tabelaServico.get(id);
    if (!row || row.usuarioId !== authUid) {
      throw new Error('RLS: Violação de UPDATE - registro não encontrado ou sem permissão de titularidade');
    }
    if (dados.nome !== undefined) row.nome = dados.nome;
    if (dados.descricao !== undefined) row.descricao = dados.descricao ?? null;
    if (dados.unidade !== undefined) row.unidade = dados.unidade;
    if (dados.precoBase !== undefined) row.precoBase = dados.precoBase;
    if (dados.usaMedicaoArea !== undefined) row.usaMedicaoArea = dados.usaMedicaoArea;
    return new Servico(row);
  }

  async alterarAtivo(id: string, ativo: boolean): Promise<void> {
    const authUid = this.checkAuth();
    const row = this.tabelaServico.get(id);
    if (!row || row.usuarioId !== authUid) {
      throw new Error('RLS: Violação de UPDATE status - registro não encontrado ou sem permissão de titularidade');
    }
    row.ativo = ativo;
  }
}

/**
 * Repositório simulando o comportamento de RLS estrito do Supabase para public.produto:
 * policies: produto_select_policy, produto_insert_policy, produto_update_policy, produto_delete_policy.
 */
class RlsSimulatedProdutoRepository implements ProdutoRepository {
  private tabelaProduto: Map<string, {
    id: string;
    usuarioId: string;
    nome: string;
    descricao: string | null;
    unidade: string;
    precoBase: number;
    ativo: boolean;
  }> = new Map();

  constructor(private getAuthUserId: () => string | null) {}

  private checkAuth(): string {
    const uid = this.getAuthUserId();
    if (!uid) throw new Error('RLS: Violação de acesso - Sessão não autenticada');
    return uid;
  }

  async listar(usuarioId: string): Promise<Produto[]> {
    const authUid = this.checkAuth();
    const resultados: Produto[] = [];
    for (const row of this.tabelaProduto.values()) {
      if (row.usuarioId === authUid && row.usuarioId === usuarioId) {
        resultados.push(new Produto(row));
      }
    }
    return resultados.sort((a, b) => a.nome.localeCompare(b.nome));
  }

  async buscarPorId(id: string): Promise<Produto | null> {
    const authUid = this.checkAuth();
    const row = this.tabelaProduto.get(id);
    if (!row || row.usuarioId !== authUid) {
      return null;
    }
    return new Produto(row);
  }

  async criar(dados: CriarProdutoDados): Promise<Produto> {
    const authUid = this.checkAuth();
    if (dados.usuarioId !== authUid) {
      throw new Error('RLS: Violação de INSERT - usuario_id não confere com auth.uid()');
    }
    const id = `prd-uuid-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const row = {
      id,
      usuarioId: dados.usuarioId,
      nome: dados.nome,
      descricao: dados.descricao ?? null,
      unidade: dados.unidade,
      precoBase: dados.precoBase,
      ativo: dados.ativo ?? true,
    };
    this.tabelaProduto.set(id, row);
    return new Produto(row);
  }

  async atualizar(id: string, dados: AtualizarProdutoDados): Promise<Produto> {
    const authUid = this.checkAuth();
    const row = this.tabelaProduto.get(id);
    if (!row || row.usuarioId !== authUid) {
      throw new Error('RLS: Violação de UPDATE - registro não encontrado ou sem permissão de titularidade');
    }
    if (dados.nome !== undefined) row.nome = dados.nome;
    if (dados.descricao !== undefined) row.descricao = dados.descricao ?? null;
    if (dados.unidade !== undefined) row.unidade = dados.unidade;
    if (dados.precoBase !== undefined) row.precoBase = dados.precoBase;
    return new Produto(row);
  }

  async alterarAtivo(id: string, ativo: boolean): Promise<void> {
    const authUid = this.checkAuth();
    const row = this.tabelaProduto.get(id);
    if (!row || row.usuarioId !== authUid) {
      throw new Error('RLS: Violação de UPDATE status - registro não encontrado ou sem permissão de titularidade');
    }
    row.ativo = ativo;
  }
}

describe('Testes Multi-Tenant — Catálogo (Serviços e Produtos)', () => {
  it('USER_A e USER_B: isolamento completo em Serviços e Produtos', async () => {
    let currentAuthUser: AuthUser | null = null;

    const authMock: AuthService = {
      getCurrentUser: async () => currentAuthUser,
    } as unknown as AuthService;

    const servicoRepo = new RlsSimulatedServicoRepository(() => currentAuthUser?.id ?? null);
    const produtoRepo = new RlsSimulatedProdutoRepository(() => currentAuthUser?.id ?? null);

    const servicoService = new ServicoService(servicoRepo, authMock);
    const produtoService = new ProdutoService(produtoRepo, authMock);

    // =======================================================================
    // PASSO 1: Sessão USER_A cria SERVIÇO_A e PRODUTO_A
    // =======================================================================
    currentAuthUser = { id: 'usr-a-uuid', email: 'user_a@empresa.com', nome: 'Usuário A' };

    const servicoA = await servicoService.criarServico({
      nome: 'Poda de Cerca Viva (USER_A)',
      unidade: 'm²',
      precoBase: 8.5,
      usaMedicaoArea: true,
    });
    assert.strictEqual(servicoA.usuarioId, 'usr-a-uuid');

    const produtoA = await produtoService.criarProduto({
      nome: 'Fertilizante Mineral (USER_A)',
      unidade: 'kg',
      precoBase: 45,
    });
    assert.strictEqual(produtoA.usuarioId, 'usr-a-uuid');

    // =======================================================================
    // PASSO 2: Sessão USER_B cria SERVIÇO_B e PRODUTO_B
    // =======================================================================
    currentAuthUser = { id: 'usr-b-uuid', email: 'user_b@empresa.com', nome: 'Usuário B' };

    const servicoB = await servicoService.criarServico({
      nome: 'Limpeza de Calhas (USER_B)',
      unidade: 'h',
      precoBase: 90,
      usaMedicaoArea: false,
    });
    assert.strictEqual(servicoB.usuarioId, 'usr-b-uuid');

    const produtoB = await produtoService.criarProduto({
      nome: 'Grama São Carlos (USER_B)',
      unidade: 'm²',
      precoBase: 12,
    });
    assert.strictEqual(produtoB.usuarioId, 'usr-b-uuid');

    // =======================================================================
    // PASSO 3: Validações sob contexto de USER_A
    // =======================================================================
    currentAuthUser = { id: 'usr-a-uuid', email: 'user_a@empresa.com', nome: 'Usuário A' };

    // USER_A lista apenas seus próprios registros
    const servicosA = await servicoService.listarServicos();
    assert.strictEqual(servicosA.length, 1);
    assert.strictEqual(servicosA[0].id, servicoA.id);

    const produtosA = await produtoService.listarProdutos();
    assert.strictEqual(produtosA.length, 1);
    assert.strictEqual(produtosA[0].id, produtoA.id);

    // USER_A tenta obter registros de USER_B -> recebe null
    assert.strictEqual(await servicoService.obterServico(servicoB.id), null);
    assert.strictEqual(await produtoService.obterProduto(produtoB.id), null);

    // USER_A tenta atualizar registros de USER_B -> bloqueio
    await assert.rejects(
      async () => await servicoService.atualizarServico(servicoB.id, { nome: 'Ataque Servico' }),
      /Serviço não encontrado ou não pertence ao usuário/
    );
    await assert.rejects(
      async () => await produtoService.atualizarProduto(produtoB.id, { nome: 'Ataque Produto' }),
      /Produto não encontrado ou não pertence ao usuário/
    );

    // USER_A tenta inativar registros de USER_B -> bloqueio
    await assert.rejects(
      async () => await servicoService.alterarAtivoServico(servicoB.id, false),
      /Serviço não encontrado ou não pertence ao usuário/
    );
    await assert.rejects(
      async () => await produtoService.alterarAtivoProduto(produtoB.id, false),
      /Produto não encontrado ou não pertence ao usuário/
    );

    // =======================================================================
    // PASSO 4: Validações sob contexto de USER_B
    // =======================================================================
    currentAuthUser = { id: 'usr-b-uuid', email: 'user_b@empresa.com', nome: 'Usuário B' };

    // USER_B lista apenas seus próprios registros
    const servicosB = await servicoService.listarServicos();
    assert.strictEqual(servicosB.length, 1);
    assert.strictEqual(servicosB[0].id, servicoB.id);

    const produtosB = await produtoService.listarProdutos();
    assert.strictEqual(produtosB.length, 1);
    assert.strictEqual(produtosB[0].id, produtoB.id);

    // USER_B tenta obter registros de USER_A -> recebe null
    assert.strictEqual(await servicoService.obterServico(servicoA.id), null);
    assert.strictEqual(await produtoService.obterProduto(produtoA.id), null);

    // USER_B tenta atualizar registros de USER_A -> bloqueio
    await assert.rejects(
      async () => await servicoService.atualizarServico(servicoA.id, { nome: 'Ataque de B' }),
      /Serviço não encontrado ou não pertence ao usuário/
    );
    await assert.rejects(
      async () => await produtoService.atualizarProduto(produtoA.id, { nome: 'Ataque de B' }),
      /Produto não encontrado ou não pertence ao usuário/
    );
  });
});
