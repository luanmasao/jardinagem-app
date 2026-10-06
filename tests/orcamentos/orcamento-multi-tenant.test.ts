import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Orcamento } from '../../src/domain/entities/orcamento';
import { ItemOrcamento } from '../../src/domain/entities/item-orcamento';
import { Cliente } from '../../src/domain/entities/cliente';
import { Servico } from '../../src/domain/entities/servico';
import { Produto } from '../../src/domain/entities/produto';
import { StatusOrcamento } from '../../src/domain/enums/status-orcamento';
import { TipoItem } from '../../src/domain/enums/tipo-item';
import {
  OrcamentoRepository,
  CriarOrcamentoDados,
  AtualizarOrcamentoDados,
  OrcamentoResumo,
  OrcamentoComCliente,
} from '../../src/domain/repositories/orcamento.repository.interface';
import {
  ItemOrcamentoRepository,
  CriarItemOrcamentoDados,
  AtualizarItemOrcamentoDados,
} from '../../src/domain/repositories/item-orcamento.repository.interface';
import { ClienteRepository, CriarClienteDados, AtualizarClienteDados, SalvarEnderecoDados } from '../../src/domain/repositories/cliente.repository.interface';
import { ServicoRepository, CriarServicoDados, AtualizarServicoDados } from '../../src/domain/repositories/servico.repository.interface';
import { ProdutoRepository, CriarProdutoDados, AtualizarProdutoDados } from '../../src/domain/repositories/produto.repository.interface';
import { AuthService, AuthUser } from '../../src/application/services/auth.service';
import { OrcamentoService } from '../../src/application/services/orcamento.service';

/**
 * Repositórios com simulação estrita de Row Level Security (RLS) do Supabase:
 * Toda operação verifica se auth.uid() coincide com o usuario_id do registro,
 * replicando fielmente as políticas orcamento_*_policy e item_orcamento_*_policy.
 */
class RlsSimulatedClienteRepository implements ClienteRepository {
  public tabela: Map<string, { id: string; usuarioId: string; nome: string }> = new Map();
  constructor(private getAuthUid: () => string | null) {}

  private checkAuth(): string {
    const uid = this.getAuthUid();
    if (!uid) throw new Error('RLS: Violação de autenticação');
    return uid;
  }

  async listar(usuarioId: string): Promise<Cliente[]> {
    const uid = this.checkAuth();
    const res: Cliente[] = [];
    for (const r of this.tabela.values()) {
      if (r.usuarioId === uid && r.usuarioId === usuarioId) {
        res.push(new Cliente({ id: r.id, usuarioId: r.usuarioId, nome: r.nome, ativo: true }));
      }
    }
    return res;
  }

  async buscarPorId(id: string): Promise<Cliente | null> {
    const uid = this.checkAuth();
    const r = this.tabela.get(id);
    if (!r || r.usuarioId !== uid) return null;
    return new Cliente({ id: r.id, usuarioId: r.usuarioId, nome: r.nome, ativo: true });
  }

  async criar(dados: CriarClienteDados): Promise<Cliente> {
    const uid = this.checkAuth();
    if (dados.usuarioId !== uid) throw new Error('RLS: Violação de INSERT cliente');
    const id = `cli-${Math.random().toString(36).substring(2, 7)}`;
    this.tabela.set(id, { id, usuarioId: dados.usuarioId, nome: dados.nome });
    return new Cliente({ id, usuarioId: dados.usuarioId, nome: dados.nome, ativo: true });
  }

  async atualizar(id: string, dados: AtualizarClienteDados): Promise<Cliente> {
    const uid = this.checkAuth();
    const r = this.tabela.get(id);
    if (!r || r.usuarioId !== uid) throw new Error('RLS: Violação de UPDATE cliente');
    if (dados.nome) r.nome = dados.nome;
    return new Cliente({ id: r.id, usuarioId: r.usuarioId, nome: r.nome, ativo: true });
  }

  async alterarAtivo(): Promise<void> {}
  async obterEndereco(): Promise<any> { return null; }
  async salvarEndereco(): Promise<any> {}
}

class RlsSimulatedServicoRepository implements ServicoRepository {
  public tabela: Map<string, { id: string; usuarioId: string; nome: string; unidade: string; precoBase: number; usaMedicaoArea: boolean; ativo: boolean }> = new Map();
  constructor(private getAuthUid: () => string | null) {}

  private checkAuth(): string {
    const uid = this.getAuthUid();
    if (!uid) throw new Error('RLS: Violação de autenticação');
    return uid;
  }

  async listar(usuarioId: string): Promise<Servico[]> {
    const uid = this.checkAuth();
    const res: Servico[] = [];
    for (const r of this.tabela.values()) {
      if (r.usuarioId === uid && r.usuarioId === usuarioId) {
        res.push(new Servico(r));
      }
    }
    return res;
  }

  async buscarPorId(id: string): Promise<Servico | null> {
    const uid = this.checkAuth();
    const r = this.tabela.get(id);
    if (!r || r.usuarioId !== uid) return null;
    return new Servico(r);
  }

  async criar(dados: CriarServicoDados): Promise<Servico> {
    const uid = this.checkAuth();
    if (dados.usuarioId !== uid) throw new Error('RLS: Violação de INSERT servico');
    const id = `srv-${Math.random().toString(36).substring(2, 7)}`;
    const row = {
      id,
      usuarioId: dados.usuarioId,
      nome: dados.nome,
      unidade: dados.unidade,
      precoBase: dados.precoBase,
      usaMedicaoArea: dados.usaMedicaoArea ?? false,
      ativo: dados.ativo ?? true,
    };
    this.tabela.set(id, row);
    return new Servico(row);
  }

  async atualizar(id: string, dados: AtualizarServicoDados): Promise<Servico> {
    const uid = this.checkAuth();
    const r = this.tabela.get(id);
    if (!r || r.usuarioId !== uid) throw new Error('RLS: Violação de UPDATE servico');
    if (dados.nome) r.nome = dados.nome;
    return new Servico(r);
  }

  async alterarAtivo(): Promise<void> {}
}

class RlsSimulatedProdutoRepository implements ProdutoRepository {
  public tabela: Map<string, { id: string; usuarioId: string; nome: string; unidade: string; precoBase: number; ativo: boolean }> = new Map();
  constructor(private getAuthUid: () => string | null) {}

  private checkAuth(): string {
    const uid = this.getAuthUid();
    if (!uid) throw new Error('RLS: Violação de autenticação');
    return uid;
  }

  async listar(usuarioId: string): Promise<Produto[]> {
    const uid = this.checkAuth();
    const res: Produto[] = [];
    for (const r of this.tabela.values()) {
      if (r.usuarioId === uid && r.usuarioId === usuarioId) {
        res.push(new Produto(r));
      }
    }
    return res;
  }

  async buscarPorId(id: string): Promise<Produto | null> {
    const uid = this.checkAuth();
    const r = this.tabela.get(id);
    if (!r || r.usuarioId !== uid) return null;
    return new Produto(r);
  }

  async criar(dados: CriarProdutoDados): Promise<Produto> {
    const uid = this.checkAuth();
    if (dados.usuarioId !== uid) throw new Error('RLS: Violação de INSERT produto');
    const id = `prd-${Math.random().toString(36).substring(2, 7)}`;
    const row = {
      id,
      usuarioId: dados.usuarioId,
      nome: dados.nome,
      unidade: dados.unidade,
      precoBase: dados.precoBase,
      ativo: dados.ativo ?? true,
    };
    this.tabela.set(id, row);
    return new Produto(row);
  }

  async atualizar(id: string, dados: AtualizarProdutoDados): Promise<Produto> {
    const uid = this.checkAuth();
    const r = this.tabela.get(id);
    if (!r || r.usuarioId !== uid) throw new Error('RLS: Violação de UPDATE produto');
    if (dados.nome) r.nome = dados.nome;
    return new Produto(r);
  }

  async alterarAtivo(): Promise<void> {}
}

class RlsSimulatedItemOrcamentoRepository implements ItemOrcamentoRepository {
  public tabela: Map<string, ItemOrcamento> = new Map();

  constructor(
    private getAuthUid: () => string | null,
    private orcamentoRepoGetter: () => RlsSimulatedOrcamentoRepository
  ) {}

  private checkAuth(): string {
    const uid = this.getAuthUid();
    if (!uid) throw new Error('RLS: Violação de autenticação');
    return uid;
  }

  async listarPorOrcamento(orcamentoId: string): Promise<ItemOrcamento[]> {
    const uid = this.checkAuth();
    const orcRepo = this.orcamentoRepoGetter();
    const orcRow = orcRepo.tabela.get(orcamentoId);
    // RLS: item só é visível se orçamento pertencer ao usuário
    if (!orcRow || orcRow.usuarioId !== uid) return [];

    return Array.from(this.tabela.values()).filter((it) => it.orcamentoId === orcamentoId);
  }

  async buscarPorId(id: string): Promise<ItemOrcamento | null> {
    const uid = this.checkAuth();
    const it = this.tabela.get(id);
    if (!it) return null;
    const orcRepo = this.orcamentoRepoGetter();
    const orcRow = orcRepo.tabela.get(it.orcamentoId);
    if (!orcRow || orcRow.usuarioId !== uid) return null;
    return it;
  }

  async criar(dados: CriarItemOrcamentoDados): Promise<ItemOrcamento> {
    const uid = this.checkAuth();
    const orcRepo = this.orcamentoRepoGetter();
    const orcRow = orcRepo.tabela.get(dados.orcamentoId);
    if (!orcRow || orcRow.usuarioId !== uid) {
      throw new Error('RLS: Violação de INSERT item_orcamento - orçamento não pertence ao usuário');
    }

    const id = dados.id || `item-${Math.random().toString(36).substring(2, 7)}`;
    const novo = new ItemOrcamento({
      id,
      orcamentoId: dados.orcamentoId,
      tipo: dados.tipo,
      servicoId: dados.servicoId,
      produtoId: dados.produtoId,
      descricao: dados.descricao,
      quantidade: dados.quantidade,
      unidade: dados.unidade,
      valorUnitario: dados.valorUnitario,
      valorTotal: dados.valorTotal,
      usaMedicaoArea: dados.usaMedicaoArea,
      areas: [],
    });
    this.tabela.set(id, novo);
    return novo;
  }

  async atualizar(id: string, dados: AtualizarItemOrcamentoDados): Promise<ItemOrcamento> {
    const it = await this.buscarPorId(id);
    if (!it) throw new Error('RLS: Violação de UPDATE item_orcamento');
    if (dados.descricao !== undefined) it.descricao = dados.descricao;
    if (dados.quantidade !== undefined) it.quantidade = dados.quantidade;
    if (dados.valorUnitario !== undefined) it.valorUnitario = dados.valorUnitario;
    if (dados.valorTotal !== undefined) it.valorTotal = dados.valorTotal;
    return it;
  }

  async excluir(id: string): Promise<void> {
    const it = await this.buscarPorId(id);
    if (!it) throw new Error('RLS: Violação de DELETE item_orcamento');
    this.tabela.delete(id);
  }
}

class RlsSimulatedOrcamentoRepository implements OrcamentoRepository {
  public tabela: Map<string, Orcamento> = new Map();
  public seqCounter = 0;

  constructor(
    private getAuthUid: () => string | null,
    private clienteRepo: RlsSimulatedClienteRepository,
    private itemRepoGetter: () => RlsSimulatedItemOrcamentoRepository
  ) {}

  private checkAuth(): string {
    const uid = this.getAuthUid();
    if (!uid) throw new Error('RLS: Violação de autenticação');
    return uid;
  }

  async listar(usuarioId: string, filtroStatus?: StatusOrcamento): Promise<OrcamentoResumo[]> {
    const uid = this.checkAuth();
    const lista: OrcamentoResumo[] = [];
    for (const o of this.tabela.values()) {
      if (o.usuarioId === uid && o.usuarioId === usuarioId) {
        if (!filtroStatus || o.status === filtroStatus) {
          const cli = this.clienteRepo.tabela.get(o.clienteId);
          lista.push({
            id: o.id,
            usuarioId: o.usuarioId,
            clienteId: o.clienteId,
            clienteNome: cli?.nome ?? 'Cliente',
            numero: o.numero,
            dataCriacao: o.dataCriacao,
            dataValidade: o.dataValidade,
            status: o.status,
            subtotal: o.subtotal,
            tipoDesconto: o.tipoDesconto,
            valorDesconto: o.valorDesconto,
            total: o.total,
            totalItens: o.itens.length,
          });
        }
      }
    }
    return lista.sort((a, b) => b.dataCriacao.getTime() - a.dataCriacao.getTime());
  }

  async buscarPorId(id: string): Promise<OrcamentoComCliente | null> {
    const uid = this.checkAuth();
    const o = this.tabela.get(id);
    if (!o || o.usuarioId !== uid) return null;

    const cli = this.clienteRepo.tabela.get(o.clienteId);
    const itemRepo = this.itemRepoGetter();
    const itens = await itemRepo.listarPorOrcamento(id);
    if (itens.length > 0) {
      (o as any)._itens = itens;
      o.recalcularValores();
    }

    return {
      orcamento: o,
      clienteNome: cli?.nome,
    };
  }

  async obterProximoNumero(usuarioId: string): Promise<string> {
    this.seqCounter++;
    return `ORC-2026-${String(this.seqCounter).padStart(3, '0')}`;
  }

  async criar(dados: CriarOrcamentoDados): Promise<Orcamento> {
    const uid = this.checkAuth();
    if (dados.usuarioId !== uid) throw new Error('RLS: Violação de INSERT orcamento - usuario_id inválido');

    const id = `orc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const numero = dados.numero || (await this.obterProximoNumero(dados.usuarioId));
    const novo = new Orcamento({
      id,
      usuarioId: dados.usuarioId,
      clienteId: dados.clienteId,
      numero,
      dataCriacao: new Date(),
      dataValidade: dados.dataValidade ?? null,
      status: StatusOrcamento.RASCUNHO,
      tipoDesconto: dados.tipoDesconto ?? null,
      valorDesconto: dados.valorDesconto ?? 0,
      observacoes: dados.observacoes ?? null,
      condicoesPagamento: dados.condicoesPagamento ?? null,
      itens: [],
    });
    this.tabela.set(id, novo);
    return novo;
  }

  async atualizar(id: string, dados: AtualizarOrcamentoDados): Promise<Orcamento> {
    const uid = this.checkAuth();
    const o = this.tabela.get(id);
    if (!o || o.usuarioId !== uid) throw new Error('RLS: Violação de UPDATE orcamento');
    if (dados.subtotal !== undefined) o.subtotal = dados.subtotal;
    if (dados.total !== undefined) o.total = dados.total;
    if (dados.observacoes !== undefined) o.observacoes = dados.observacoes;
    if (dados.condicoesPagamento !== undefined) o.condicoesPagamento = dados.condicoesPagamento;
    if (dados.tipoDesconto !== undefined) o.tipoDesconto = dados.tipoDesconto;
    if (dados.valorDesconto !== undefined) o.valorDesconto = dados.valorDesconto;
    return o;
  }

  async alterarStatus(id: string, novoStatus: StatusOrcamento): Promise<void> {
    const uid = this.checkAuth();
    const o = this.tabela.get(id);
    if (!o || o.usuarioId !== uid) throw new Error('RLS: Violação de UPDATE status orcamento');
    o.status = novoStatus;
  }

  async excluir(id: string): Promise<void> {
    const uid = this.checkAuth();
    const o = this.tabela.get(id);
    if (!o || o.usuarioId !== uid) throw new Error('RLS: Violação de DELETE orcamento');
    this.tabela.delete(id);
  }
}

describe('Testes Multi-Tenant e RLS — Orçamentos e Itens de Orçamento v1.0 (Seção 25 e 26)', () => {
  it('Isolamento completo entre USER_A e USER_B (A não vê B, A não altera B, A não usa recursos de B e vice-versa)', async () => {
    let currentAuthUser: AuthUser | null = null;

    const authMock: AuthService = {
      getCurrentUser: async () => currentAuthUser,
    } as unknown as AuthService;

    const clienteRepo = new RlsSimulatedClienteRepository(() => currentAuthUser?.id ?? null);
    const servicoRepo = new RlsSimulatedServicoRepository(() => currentAuthUser?.id ?? null);
    const produtoRepo = new RlsSimulatedProdutoRepository(() => currentAuthUser?.id ?? null);

    let orcamentoRepo: RlsSimulatedOrcamentoRepository;
    let itemRepo: RlsSimulatedItemOrcamentoRepository;

    itemRepo = new RlsSimulatedItemOrcamentoRepository(
      () => currentAuthUser?.id ?? null,
      () => orcamentoRepo
    );

    orcamentoRepo = new RlsSimulatedOrcamentoRepository(
      () => currentAuthUser?.id ?? null,
      clienteRepo,
      () => itemRepo
    );

    const service = new OrcamentoService(
      orcamentoRepo,
      itemRepo,
      clienteRepo,
      servicoRepo,
      produtoRepo,
      authMock
    );

    // =======================================================================
    // SETUP: USER_A cria Cliente A, Serviço A, Produto A, Orçamento A
    // =======================================================================
    currentAuthUser = { id: 'usr-a-uuid', email: 'user_a@empresa.com', nome: 'Usuário A' };

    const clienteA = await clienteRepo.criar({
      usuarioId: 'usr-a-uuid',
      nome: 'Cliente Alpha (USER_A)',
    });

    const servicoA = await servicoRepo.criar({
      usuarioId: 'usr-a-uuid',
      nome: 'Poda de Árvores (USER_A)',
      unidade: 'h',
      precoBase: 80,
      usaMedicaoArea: false,
    });

    const produtoA = await produtoRepo.criar({
      usuarioId: 'usr-a-uuid',
      nome: 'Adubo Especial (USER_A)',
      unidade: 'kg',
      precoBase: 50,
    });

    const orcamentoA = await service.criarOrcamento({
      clienteId: clienteA.id,
      numero: 'ORC-A-001',
    });

    const itemSrvA = await service.adicionarItem({
      orcamentoId: orcamentoA.id,
      tipo: TipoItem.SERVICO,
      servicoId: servicoA.id,
      quantidade: 2,
    });

    const itemPrdA = await service.adicionarItem({
      orcamentoId: orcamentoA.id,
      tipo: TipoItem.PRODUTO,
      produtoId: produtoA.id,
      quantidade: 3,
    });

    assert.strictEqual(orcamentoA.usuarioId, 'usr-a-uuid');
    assert.strictEqual(orcamentoA.subtotal, 2 * 80 + 3 * 50); // 160 + 150 = 310

    // =======================================================================
    // SETUP: USER_B cria Cliente B, Serviço B, Produto B, Orçamento B
    // =======================================================================
    currentAuthUser = { id: 'usr-b-uuid', email: 'user_b@empresa.com', nome: 'Usuário B' };

    const clienteB = await clienteRepo.criar({
      usuarioId: 'usr-b-uuid',
      nome: 'Cliente Beta (USER_B)',
    });

    const servicoB = await servicoRepo.criar({
      usuarioId: 'usr-b-uuid',
      nome: 'Corte de Grama (USER_B)',
      unidade: 'm²',
      precoBase: 12,
      usaMedicaoArea: true,
    });

    const produtoB = await produtoRepo.criar({
      usuarioId: 'usr-b-uuid',
      nome: 'Muda de Palmeira (USER_B)',
      unidade: 'un',
      precoBase: 200,
    });

    const orcamentoB = await service.criarOrcamento({
      clienteId: clienteB.id,
      numero: 'ORC-B-001',
    });

    const itemPrdB = await service.adicionarItem({
      orcamentoId: orcamentoB.id,
      tipo: TipoItem.PRODUTO,
      produtoId: produtoB.id,
      quantidade: 2,
    });

    assert.strictEqual(orcamentoB.usuarioId, 'usr-b-uuid');
    assert.strictEqual(orcamentoB.subtotal, 400);

    // =======================================================================
    // PASSO 1: TESTES SOB PERSPECTIVA DO USER_A
    // =======================================================================
    currentAuthUser = { id: 'usr-a-uuid', email: 'user_a@empresa.com', nome: 'Usuário A' };

    // 1.1 A não vê B: listagem retorna somente orcamentoA
    const listaA = await service.listarOrcamentos();
    assert.strictEqual(listaA.length, 1);
    assert.strictEqual(listaA[0].id, orcamentoA.id);
    assert.strictEqual(listaA[0].numero, 'ORC-A-001');

    // 1.2 A não vê B: buscar por ID do orçamento B retorna null
    const consultaBporA = await service.obterOrcamento(orcamentoB.id);
    assert.strictEqual(consultaBporA, null);

    // 1.3 A não edita B: tentativa de atualizar orçamento B é rejeitada
    await assert.rejects(
      async () => await service.atualizarOrcamento(orcamentoB.id, { observacoes: 'Ataque de A' }),
      /Orçamento não encontrado/
    );

    // 1.4 A não exclui B: tentativa de excluir orçamento B é rejeitada
    await assert.rejects(
      async () => await service.excluirOrcamento(orcamentoB.id),
      /Orçamento não encontrado/
    );

    // 1.5 A não altera status de B
    await assert.rejects(
      async () => await service.alterarStatusOrcamento(orcamentoB.id, StatusOrcamento.CANCELADO),
      /Orçamento não encontrado/
    );

    // 1.6 A não duplica B
    await assert.rejects(
      async () => await service.duplicarOrcamento(orcamentoB.id),
      /Orçamento de origem não encontrado/
    );

    // 1.7 A não usa cliente B: criar orçamento referenciando Cliente B é rejeitado
    await assert.rejects(
      async () => await service.criarOrcamento({ clienteId: clienteB.id, numero: 'ORC-A-INV' }),
      /não pertence ao usuário/
    );

    // 1.8 A não usa serviço B: adicionar Serviço B ao Orçamento A é rejeitado
    await assert.rejects(
      async () =>
        await service.adicionarItem({
          orcamentoId: orcamentoA.id,
          tipo: TipoItem.SERVICO,
          servicoId: servicoB.id,
        }),
      /não pertence ao usuário/
    );

    // 1.9 A não usa produto B: adicionar Produto B ao Orçamento A é rejeitado
    await assert.rejects(
      async () =>
        await service.adicionarItem({
          orcamentoId: orcamentoA.id,
          tipo: TipoItem.PRODUTO,
          produtoId: produtoB.id,
          quantidade: 1,
        }),
      /não pertence ao usuário/
    );

    // 1.10 A não altera ou remove item de B
    await assert.rejects(
      async () =>
        await service.removerItem(orcamentoB.id, itemPrdB.id),
      /Orçamento não encontrado/
    );

    // =======================================================================
    // PASSO 2: TESTES SIMÉTRICOS SOB PERSPECTIVA DO USER_B
    // =======================================================================
    currentAuthUser = { id: 'usr-b-uuid', email: 'user_b@empresa.com', nome: 'Usuário B' };

    // 2.1 B não vê A: listagem retorna somente orcamentoB
    const listaB = await service.listarOrcamentos();
    assert.strictEqual(listaB.length, 1);
    assert.strictEqual(listaB[0].id, orcamentoB.id);
    assert.strictEqual(listaB[0].numero, 'ORC-B-001');

    // 2.2 B não vê A: buscar por ID do orçamento A retorna null
    const consultaAporB = await service.obterOrcamento(orcamentoA.id);
    assert.strictEqual(consultaAporB, null);

    // 2.3 B não edita A: tentativa de atualizar orçamento A é rejeitada
    await assert.rejects(
      async () => await service.atualizarOrcamento(orcamentoA.id, { observacoes: 'Ataque de B' }),
      /Orçamento não encontrado/
    );

    // 2.4 B não exclui A: tentativa de excluir orçamento A é rejeitada
    await assert.rejects(
      async () => await service.excluirOrcamento(orcamentoA.id),
      /Orçamento não encontrado/
    );

    // 2.5 B não altera status de A
    await assert.rejects(
      async () => await service.alterarStatusOrcamento(orcamentoA.id, StatusOrcamento.CANCELADO),
      /Orçamento não encontrado/
    );

    // 2.6 B não duplica A
    await assert.rejects(
      async () => await service.duplicarOrcamento(orcamentoA.id),
      /Orçamento de origem não encontrado/
    );

    // 2.7 B não usa cliente A: criar orçamento referenciando Cliente A é rejeitado
    await assert.rejects(
      async () => await service.criarOrcamento({ clienteId: clienteA.id, numero: 'ORC-B-INV' }),
      /não pertence ao usuário/
    );

    // 2.8 B não usa serviço A: adicionar Serviço A ao Orçamento B é rejeitado
    await assert.rejects(
      async () =>
        await service.adicionarItem({
          orcamentoId: orcamentoB.id,
          tipo: TipoItem.SERVICO,
          servicoId: servicoA.id,
        }),
      /não pertence ao usuário/
    );

    // 2.9 B não usa produto A: adicionar Produto A ao Orçamento B é rejeitado
    await assert.rejects(
      async () =>
        await service.adicionarItem({
          orcamentoId: orcamentoB.id,
          tipo: TipoItem.PRODUTO,
          produtoId: produtoA.id,
          quantidade: 1,
        }),
      /não pertence ao usuário/
    );

    // 2.10 B não altera ou remove item de A
    await assert.rejects(
      async () =>
        await service.removerItem(orcamentoA.id, itemSrvA.id),
      /Orçamento não encontrado/
    );
  });
});
