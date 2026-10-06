import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { Orcamento } from '../../src/domain/entities/orcamento';
import { ItemOrcamento } from '../../src/domain/entities/item-orcamento';
import { Servico } from '../../src/domain/entities/servico';
import { Produto } from '../../src/domain/entities/produto';
import { StatusOrcamento } from '../../src/domain/enums/status-orcamento';
import { TipoItem } from '../../src/domain/enums/tipo-item';
import { RegraNegocioError } from '../../src/domain/errors/dominio-error';
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
import {
  AdicionarItemOrcamentoUseCase,
  AtualizarItemOrcamentoUseCase,
  RemoverItemOrcamentoUseCase,
} from '../../src/application/use-cases/orcamento';

class InMemoryServicoRepo implements ServicoRepository {
  public servicos: Map<string, Servico> = new Map();
  async listar(usuarioId: string): Promise<Servico[]> {
    return Array.from(this.servicos.values()).filter((s) => s.usuarioId === usuarioId);
  }
  async buscarPorId(id: string): Promise<Servico | null> {
    return this.servicos.get(id) ?? null;
  }
  async criar(dados: CriarServicoDados): Promise<Servico> {
    const id = `srv-${Math.random().toString(36).substring(2, 7)}`;
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
    const s = this.servicos.get(id);
    if (!s) throw new Error('Serviço não encontrado.');
    if (dados.nome !== undefined) s.nome = dados.nome;
    if (dados.precoBase !== undefined) s.precoBase = dados.precoBase;
    return s;
  }
  async alterarAtivo(id: string, ativo: boolean): Promise<void> {
    const s = this.servicos.get(id);
    if (s) s.ativo = ativo;
  }
}

class InMemoryProdutoRepo implements ProdutoRepository {
  public produtos: Map<string, Produto> = new Map();
  async listar(usuarioId: string): Promise<Produto[]> {
    return Array.from(this.produtos.values()).filter((p) => p.usuarioId === usuarioId);
  }
  async buscarPorId(id: string): Promise<Produto | null> {
    return this.produtos.get(id) ?? null;
  }
  async criar(dados: CriarProdutoDados): Promise<Produto> {
    const id = `prod-${Math.random().toString(36).substring(2, 7)}`;
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
    const p = this.produtos.get(id);
    if (!p) throw new Error('Produto não encontrado.');
    if (dados.nome !== undefined) p.nome = dados.nome;
    if (dados.precoBase !== undefined) p.precoBase = dados.precoBase;
    return p;
  }
  async alterarAtivo(id: string, ativo: boolean): Promise<void> {
    const p = this.produtos.get(id);
    if (p) p.ativo = ativo;
  }
}

class InMemoryItemOrcamentoRepo implements ItemOrcamentoRepository {
  public itens: Map<string, ItemOrcamento> = new Map();
  async listarPorOrcamento(orcamentoId: string): Promise<ItemOrcamento[]> {
    return Array.from(this.itens.values()).filter((it) => it.orcamentoId === orcamentoId);
  }
  async buscarPorId(id: string): Promise<ItemOrcamento | null> {
    return this.itens.get(id) ?? null;
  }
  async criar(dados: CriarItemOrcamentoDados): Promise<ItemOrcamento> {
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
    this.itens.set(id, novo);
    return novo;
  }
  async atualizar(id: string, dados: AtualizarItemOrcamentoDados): Promise<ItemOrcamento> {
    const it = this.itens.get(id);
    if (!it) throw new Error('Item não encontrado.');
    if (dados.descricao !== undefined) it.descricao = dados.descricao;
    if (dados.quantidade !== undefined) it.quantidade = dados.quantidade;
    if (dados.valorUnitario !== undefined) it.valorUnitario = dados.valorUnitario;
    if (dados.valorTotal !== undefined) it.valorTotal = dados.valorTotal;
    return it;
  }
  async excluir(id: string): Promise<void> {
    this.itens.delete(id);
  }
}

class InMemoryOrcamentoRepo implements OrcamentoRepository {
  public orcamentos: Map<string, Orcamento> = new Map();
  async listar(): Promise<OrcamentoResumo[]> {
    return [];
  }
  async buscarPorId(id: string): Promise<OrcamentoComCliente | null> {
    const o = this.orcamentos.get(id);
    if (!o) return null;
    return { orcamento: o, clienteNome: 'Cliente Teste' };
  }
  async obterProximoNumero(): Promise<string> {
    return 'ORC-TEST';
  }
  async criar(dados: CriarOrcamentoDados): Promise<Orcamento> {
    const o = new Orcamento({
      id: `orc-${Math.random().toString(36).substring(2, 7)}`,
      usuarioId: dados.usuarioId,
      clienteId: dados.clienteId,
      numero: 'ORC-TEST',
      dataCriacao: new Date(),
      status: StatusOrcamento.RASCUNHO,
      itens: [],
    });
    this.orcamentos.set(o.id, o);
    return o;
  }
  async atualizar(id: string, dados: AtualizarOrcamentoDados): Promise<Orcamento> {
    const o = this.orcamentos.get(id);
    if (!o) throw new Error('Orçamento não encontrado.');
    if (dados.subtotal !== undefined) o.subtotal = dados.subtotal;
    if (dados.total !== undefined) o.total = dados.total;
    return o;
  }
  async alterarStatus(): Promise<void> {}
  async excluir(): Promise<void> {}
}

describe('Casos de Uso — Itens de Orçamento e Snapshot Histórico', () => {
  const USER_ID = 'user-auth-itens';
  let servicoRepo: InMemoryServicoRepo;
  let produtoRepo: InMemoryProdutoRepo;
  let itemRepo: InMemoryItemOrcamentoRepo;
  let orcamentoRepo: InMemoryOrcamentoRepo;
  let orcamentoValido: Orcamento;

  beforeEach(async () => {
    servicoRepo = new InMemoryServicoRepo();
    produtoRepo = new InMemoryProdutoRepo();
    itemRepo = new InMemoryItemOrcamentoRepo();
    orcamentoRepo = new InMemoryOrcamentoRepo();

    orcamentoValido = await orcamentoRepo.criar({
      usuarioId: USER_ID,
      clienteId: 'cli-1',
    });
  });

  describe('Teste Obrigatório de Snapshot Histórico (Seção 20)', () => {
    it('1 a 4: cadastrar Serviço a R$10, adicionar ao orçamento, alterar catálogo para R$20 e verificar que item continua R$10', async () => {
      const adicionarUc = new AdicionarItemOrcamentoUseCase(orcamentoRepo, itemRepo, servicoRepo, produtoRepo);

      // 1. Cadastrar Serviço A a R$ 10,00
      const servicoA = await servicoRepo.criar({
        usuarioId: USER_ID,
        nome: 'Poda de Arbustos',
        unidade: 'h',
        precoBase: 10.0,
        usaMedicaoArea: false,
      });

      // 2. Adicionar ao orçamento
      const itemAdicionado = await adicionarUc.execute({
        usuarioId: USER_ID,
        orcamentoId: orcamentoValido.id,
        tipo: TipoItem.SERVICO,
        servicoId: servicoA.id,
        quantidade: 2,
      });

      assert.strictEqual(itemAdicionado.valorUnitario, 10.0);
      assert.strictEqual(itemAdicionado.valorTotal, 20.0);
      assert.strictEqual(orcamentoValido.subtotal, 20.0);

      // 3. Alterar Serviço A no catálogo para R$ 20,00
      await servicoRepo.atualizar(servicoA.id, { precoBase: 20.0 });
      const servicoAtualizado = await servicoRepo.buscarPorId(servicoA.id);
      assert.strictEqual(servicoAtualizado?.precoBase, 20.0);

      // 4. Verificar que o item existente no orçamento continua intacto a R$ 10,00
      const itemNoOrcamento = orcamentoValido.itens.find((i) => i.id === itemAdicionado.id);
      assert.ok(itemNoOrcamento);
      assert.strictEqual(itemNoOrcamento.valorUnitario, 10.0);
      assert.strictEqual(itemNoOrcamento.valorTotal, 20.0);
      assert.strictEqual(orcamentoValido.subtotal, 20.0);
    });

    it('Repetição com Produto: cadastrar Produto a R$15, adicionar ao orçamento, alterar catálogo para R$30 e verificar que item continua R$15', async () => {
      const adicionarUc = new AdicionarItemOrcamentoUseCase(orcamentoRepo, itemRepo, servicoRepo, produtoRepo);

      // 1. Cadastrar Produto A a R$ 15,00
      const produtoA = await produtoRepo.criar({
        usuarioId: USER_ID,
        nome: 'Fertilizante NPK',
        unidade: 'saco',
        precoBase: 15.0,
      });

      // 2. Adicionar ao orçamento
      const itemAdicionado = await adicionarUc.execute({
        usuarioId: USER_ID,
        orcamentoId: orcamentoValido.id,
        tipo: TipoItem.PRODUTO,
        produtoId: produtoA.id,
        quantidade: 3,
      });

      assert.strictEqual(itemAdicionado.valorUnitario, 15.0);
      assert.strictEqual(itemAdicionado.valorTotal, 45.0);
      assert.strictEqual(orcamentoValido.subtotal, 45.0);

      // 3. Alterar Produto A no catálogo para R$ 30,00
      await produtoRepo.atualizar(produtoA.id, { precoBase: 30.0 });
      const produtoAtualizado = await produtoRepo.buscarPorId(produtoA.id);
      assert.strictEqual(produtoAtualizado?.precoBase, 30.0);

      // 4. Verificar que o item existente no orçamento continua intacto a R$ 15,00
      const itemNoOrcamento = orcamentoValido.itens.find((i) => i.id === itemAdicionado.id);
      assert.ok(itemNoOrcamento);
      assert.strictEqual(itemNoOrcamento.valorUnitario, 15.0);
      assert.strictEqual(itemNoOrcamento.valorTotal, 45.0);
      assert.strictEqual(orcamentoValido.subtotal, 45.0);
    });
  });

  describe('Regra XOR e Integridade Estrutural do Item', () => {
    it('item do tipo SERVICO não pode possuir produtoId e item do tipo PRODUTO não pode ter servicoId', async () => {
      const servico = await servicoRepo.criar({
        usuarioId: USER_ID,
        nome: 'Capina',
        unidade: 'm²',
        precoBase: 8,
        usaMedicaoArea: true,
      });
      const produto = await produtoRepo.criar({
        usuarioId: USER_ID,
        nome: 'Muda de Ipê',
        unidade: 'un',
        precoBase: 35,
      });

      // Teste do construtor de domínio rejeitando violação XOR
      assert.throws(
        () => {
          new ItemOrcamento({
            id: 'it-invalido',
            orcamentoId: orcamentoValido.id,
            tipo: TipoItem.SERVICO,
            servicoId: servico.id,
            produtoId: produto.id, // Violação: ambos informados
            descricao: 'Inválido',
            quantidade: 1,
            unidade: 'm²',
            valorUnitario: 8,
            usaMedicaoArea: true,
          });
        },
        (err: Error) => {
          assert.ok(err instanceof RegraNegocioError);
          assert.match(err.message, /não pode possuir produtoId/);
          return true;
        }
      );
    });

    it('item do tipo PRODUTO não pode possuir medição de área habilitada', async () => {
      const produto = await produtoRepo.criar({
        usuarioId: USER_ID,
        nome: 'Grama Batatais',
        unidade: 'm²',
        precoBase: 12,
      });

      assert.throws(
        () => {
          new ItemOrcamento({
            id: 'it-prod-invalido',
            orcamentoId: orcamentoValido.id,
            tipo: TipoItem.PRODUTO,
            produtoId: produto.id,
            descricao: 'Grama',
            quantidade: 1,
            unidade: 'm²',
            valorUnitario: 12,
            usaMedicaoArea: true, // Violação: produto medido
          });
        },
        (err: Error) => {
          assert.ok(err instanceof RegraNegocioError);
          assert.match(err.message, /Item do tipo PRODUTO não pode ter medição de área habilitada/);
          return true;
        }
      );
    });
  });

  describe('Quantidade Manual vs Item Medido', () => {
    it('deve permitir atualizar quantidade manual para item não medido e recalcular totais', async () => {
      const adicionarUc = new AdicionarItemOrcamentoUseCase(orcamentoRepo, itemRepo, servicoRepo, produtoRepo);
      const atualizarUc = new AtualizarItemOrcamentoUseCase(orcamentoRepo, itemRepo);

      const servico = await servicoRepo.criar({
        usuarioId: USER_ID,
        nome: 'Consultoria de Paisagismo',
        unidade: 'h',
        precoBase: 100,
        usaMedicaoArea: false,
      });

      const item = await adicionarUc.execute({
        usuarioId: USER_ID,
        orcamentoId: orcamentoValido.id,
        tipo: TipoItem.SERVICO,
        servicoId: servico.id,
        quantidade: 1,
      });

      assert.strictEqual(orcamentoValido.subtotal, 100);

      // Atualiza quantidade manual para 3
      await atualizarUc.execute({
        usuarioId: USER_ID,
        orcamentoId: orcamentoValido.id,
        itemId: item.id,
        quantidade: 3,
      });

      assert.strictEqual(item.quantidade, 3);
      assert.strictEqual(item.valorTotal, 300);
      assert.strictEqual(orcamentoValido.subtotal, 300);
    });

    it('deve bloquear alteração manual de quantidade para serviço com medição de área (RN34)', async () => {
      const adicionarUc = new AdicionarItemOrcamentoUseCase(orcamentoRepo, itemRepo, servicoRepo, produtoRepo);
      const atualizarUc = new AtualizarItemOrcamentoUseCase(orcamentoRepo, itemRepo);

      const servicoMedido = await servicoRepo.criar({
        usuarioId: USER_ID,
        nome: 'Corte de Grama',
        unidade: 'm²',
        precoBase: 5,
        usaMedicaoArea: true,
      });

      const item = await adicionarUc.execute({
        usuarioId: USER_ID,
        orcamentoId: orcamentoValido.id,
        tipo: TipoItem.SERVICO,
        servicoId: servicoMedido.id,
      });

      assert.strictEqual(item.usaMedicaoArea, true);
      assert.strictEqual(item.quantidade, 0);

      // Tentativa de alterar quantidade manualmente em item medido
      await assert.rejects(
        async () => {
          await atualizarUc.execute({
            usuarioId: USER_ID,
            orcamentoId: orcamentoValido.id,
            itemId: item.id,
            quantidade: 50,
          });
        },
        (err: Error) => {
          assert.ok(err instanceof RegraNegocioError);
          assert.match(err.message, /é derivada das áreas e não pode ser alterada manualmente/);
          return true;
        }
      );
    });
  });

  describe('Remoção de Itens e Recálculo', () => {
    it('deve remover item em RASCUNHO e atualizar automaticamente o subtotal do orçamento', async () => {
      const adicionarUc = new AdicionarItemOrcamentoUseCase(orcamentoRepo, itemRepo, servicoRepo, produtoRepo);
      const removerUc = new RemoverItemOrcamentoUseCase(orcamentoRepo, itemRepo);

      const prod = await produtoRepo.criar({
        usuarioId: USER_ID,
        nome: 'Vaso Cerâmico',
        unidade: 'un',
        precoBase: 80,
      });

      const item = await adicionarUc.execute({
        usuarioId: USER_ID,
        orcamentoId: orcamentoValido.id,
        tipo: TipoItem.PRODUTO,
        produtoId: prod.id,
        quantidade: 2,
      });

      assert.strictEqual(orcamentoValido.subtotal, 160);
      assert.strictEqual(orcamentoValido.itens.length, 1);

      await removerUc.execute({
        usuarioId: USER_ID,
        orcamentoId: orcamentoValido.id,
        itemId: item.id,
      });

      assert.strictEqual(orcamentoValido.itens.length, 0);
      assert.strictEqual(orcamentoValido.subtotal, 0);
      assert.strictEqual(orcamentoValido.total, 0);
    });

    it('deve bloquear remoção de item caso orçamento não esteja em RASCUNHO', async () => {
      const adicionarUc = new AdicionarItemOrcamentoUseCase(orcamentoRepo, itemRepo, servicoRepo, produtoRepo);
      const removerUc = new RemoverItemOrcamentoUseCase(orcamentoRepo, itemRepo);

      const prod = await produtoRepo.criar({
        usuarioId: USER_ID,
        nome: 'Pedra Branca',
        unidade: 'saco',
        precoBase: 25,
      });

      const item = await adicionarUc.execute({
        usuarioId: USER_ID,
        orcamentoId: orcamentoValido.id,
        tipo: TipoItem.PRODUTO,
        produtoId: prod.id,
        quantidade: 1,
      });

      orcamentoValido.status = StatusOrcamento.ENVIADO;

      await assert.rejects(
        async () => {
          await removerUc.execute({
            usuarioId: USER_ID,
            orcamentoId: orcamentoValido.id,
            itemId: item.id,
          });
        },
        (err: Error) => {
          assert.ok(err instanceof RegraNegocioError);
          assert.match(err.message, /não podem ser removidos/);
          return true;
        }
      );
    });
  });
});
