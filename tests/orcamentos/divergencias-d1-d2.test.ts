import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import * as Crypto from 'expo-crypto';
import { Orcamento } from '../../src/domain/entities/orcamento';
import { ItemOrcamento } from '../../src/domain/entities/item-orcamento';
import { Cliente } from '../../src/domain/entities/cliente';
import { Produto } from '../../src/domain/entities/produto';
import { Servico } from '../../src/domain/entities/servico';
import { StatusOrcamento } from '../../src/domain/enums/status-orcamento';
import { TipoDesconto } from '../../src/domain/enums/tipo-desconto';
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
import { ClienteRepository, CriarClienteDados, AtualizarClienteDados } from '../../src/domain/repositories/cliente.repository.interface';
import { ProdutoRepository, CriarProdutoDados, AtualizarProdutoDados } from '../../src/domain/repositories/produto.repository.interface';
import { ServicoRepository, CriarServicoDados, AtualizarServicoDados } from '../../src/domain/repositories/servico.repository.interface';
import {
  CriarOrcamentoUseCase,
  AtualizarOrcamentoUseCase,
  DuplicarOrcamentoUseCase,
  AdicionarItemOrcamentoUseCase,
  RemoverItemOrcamentoUseCase,
} from '../../src/application/use-cases/orcamento';

/**
 * Repositórios em memória simulando fielmente as constraints do PostgreSQL (Modelo Físico v1.1):
 * - orcamento_desconto_check: (tipo_desconto = 'FIXO' AND valor_desconto <= subtotal)
 */
class MockClienteRepo implements ClienteRepository {
  public clientes: Map<string, Cliente> = new Map();
  async listar(usuarioId: string): Promise<Cliente[]> {
    return Array.from(this.clientes.values()).filter((c) => c.usuarioId === usuarioId);
  }
  async buscarPorId(id: string): Promise<Cliente | null> {
    return this.clientes.get(id) ?? null;
  }
  async criar(dados: CriarClienteDados): Promise<Cliente> {
    const id = `cli-${Math.random().toString(36).substring(2, 7)}`;
    const novo = new Cliente({
      id,
      usuarioId: dados.usuarioId,
      nome: dados.nome,
      ativo: dados.ativo ?? true,
    });
    this.clientes.set(id, novo);
    return novo;
  }
  async atualizar(id: string, dados: AtualizarClienteDados): Promise<Cliente> {
    const cl = this.clientes.get(id);
    if (!cl) throw new Error('Cliente não encontrado.');
    return cl;
  }
  async alterarAtivo(id: string, ativo: boolean): Promise<void> {
    const cl = this.clientes.get(id);
    if (cl) cl.ativo = ativo;
  }
  async obterEndereco(): Promise<any> { return null; }
  async salvarEndereco(): Promise<any> { return null; }
}

class MockProdutoRepo implements ProdutoRepository {
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
      unidade: dados.unidade,
      precoBase: dados.precoBase,
      ativo: dados.ativo ?? true,
    });
    this.produtos.set(id, novo);
    return novo;
  }
  async atualizar(id: string, dados: AtualizarProdutoDados): Promise<Produto> {
    const pr = this.produtos.get(id);
    if (!pr) throw new Error('Produto não encontrado.');
    return pr;
  }
  async alterarAtivo(id: string, ativo: boolean): Promise<void> {
    const pr = this.produtos.get(id);
    if (pr) pr.ativo = ativo;
  }
}

class MockServicoRepo implements ServicoRepository {
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
    return s;
  }
  async alterarAtivo(id: string, ativo: boolean): Promise<void> {
    const s = this.servicos.get(id);
    if (s) s.ativo = ativo;
  }
}

class MockItemOrcamentoRepo implements ItemOrcamentoRepository {
  public itens: Map<string, ItemOrcamento> = new Map();
  async listarPorOrcamento(orcamentoId: string): Promise<ItemOrcamento[]> {
    return Array.from(this.itens.values()).filter((it) => it.orcamentoId === orcamentoId);
  }
  async buscarPorId(id: string): Promise<ItemOrcamento | null> {
    return this.itens.get(id) ?? null;
  }
  async criar(dados: CriarItemOrcamentoDados): Promise<ItemOrcamento> {
    const id = dados.id || Crypto.randomUUID();
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

class MockOrcamentoRepo implements OrcamentoRepository {
  public orcamentos: Map<string, Orcamento> = new Map();
  public seq = 0;

  constructor(
    private readonly clienteRepo: MockClienteRepo,
    private readonly itemRepo: MockItemOrcamentoRepo
  ) {}

  async listar(usuarioId: string, filtroStatus?: StatusOrcamento): Promise<OrcamentoResumo[]> {
    return [];
  }

  async buscarPorId(id: string): Promise<OrcamentoComCliente | null> {
    const o = this.orcamentos.get(id);
    if (!o) return null;
    const itens = await this.itemRepo.listarPorOrcamento(id);
    (o as any)._itens = [...itens];
    o.recalcularValores();
    const cli = this.clienteRepo.clientes.get(o.clienteId);
    return {
      orcamento: o,
      clienteNome: cli?.nome,
    };
  }

  async obterProximoNumero(usuarioId: string): Promise<string> {
    this.seq++;
    return `ORC-2026-${String(this.seq).padStart(3, '0')}`;
  }

  async criar(dados: CriarOrcamentoDados): Promise<Orcamento> {
    // Simula a constraint estrita do PostgreSQL: orcamento_desconto_check
    // No INSERT inicial, subtotal é 0.00
    const subtotalInicial = 0;
    const tipoDesc = dados.tipoDesconto ?? null;
    const valDesc = dados.valorDesconto ?? 0;

    if (tipoDesc === TipoDesconto.FIXO && valDesc > subtotalInicial) {
      throw new Error(
        'new row for relation "orcamento" violates check constraint "orcamento_desconto_check"'
      );
    }

    const id = Crypto.randomUUID();
    const numero = dados.numero || (await this.obterProximoNumero(dados.usuarioId));
    const novo = new Orcamento({
      id,
      usuarioId: dados.usuarioId,
      clienteId: dados.clienteId,
      numero,
      dataCriacao: new Date(),
      dataValidade: dados.dataValidade ?? null,
      status: StatusOrcamento.RASCUNHO,
      subtotal: subtotalInicial,
      tipoDesconto: tipoDesc,
      valorDesconto: valDesc,
      total: 0,
      observacoes: dados.observacoes ?? null,
      condicoesPagamento: dados.condicoesPagamento ?? null,
      itens: [],
    });
    this.orcamentos.set(id, novo);
    return novo;
  }

  async atualizar(id: string, dados: AtualizarOrcamentoDados): Promise<Orcamento> {
    const o = this.orcamentos.get(id);
    if (!o) throw new Error('Orçamento não encontrado.');

    const subtotal = dados.subtotal !== undefined ? dados.subtotal : o.subtotal;
    const tipoDesc = dados.tipoDesconto !== undefined ? dados.tipoDesconto : o.tipoDesconto;
    const valDesc = dados.valorDesconto !== undefined ? dados.valorDesconto : o.valorDesconto;

    // Simula validação da constraint orcamento_desconto_check no UPDATE
    if (tipoDesc === TipoDesconto.FIXO && valDesc > subtotal) {
      throw new Error(
        'new row for relation "orcamento" violates check constraint "orcamento_desconto_check"'
      );
    }

    if (dados.clienteId !== undefined) (o as any).clienteId = dados.clienteId;
    if (dados.dataValidade !== undefined) o.dataValidade = dados.dataValidade;
    if (dados.tipoDesconto !== undefined) o.tipoDesconto = dados.tipoDesconto;
    if (dados.valorDesconto !== undefined) o.valorDesconto = dados.valorDesconto;
    if (dados.subtotal !== undefined) o.subtotal = dados.subtotal;
    if (dados.total !== undefined) o.total = dados.total;
    if (dados.observacoes !== undefined) o.observacoes = dados.observacoes;
    if (dados.condicoesPagamento !== undefined) o.condicoesPagamento = dados.condicoesPagamento;
    return o;
  }

  async alterarStatus(id: string, novoStatus: StatusOrcamento): Promise<void> {
    const o = this.orcamentos.get(id);
    if (o) o.status = novoStatus;
  }

  async excluir(id: string): Promise<void> {
    this.orcamentos.delete(id);
  }
}

describe('Correções Controladas — Divergências D1 e D2', () => {
  const usuarioId = 'usr-auditoria-fix';
  let clienteRepo: MockClienteRepo;
  let produtoRepo: MockProdutoRepo;
  let servicoRepo: MockServicoRepo;
  let itemRepo: MockItemOrcamentoRepo;
  let orcamentoRepo: MockOrcamentoRepo;

  let criarOrcamentoUseCase: CriarOrcamentoUseCase;
  let atualizarOrcamentoUseCase: AtualizarOrcamentoUseCase;
  let duplicarOrcamentoUseCase: DuplicarOrcamentoUseCase;
  let adicionarItemUseCase: AdicionarItemOrcamentoUseCase;
  let removerItemUseCase: RemoverItemOrcamentoUseCase;

  let clienteId: string;
  let produtoId: string;

  beforeEach(async () => {
    clienteRepo = new MockClienteRepo();
    produtoRepo = new MockProdutoRepo();
    servicoRepo = new MockServicoRepo();
    itemRepo = new MockItemOrcamentoRepo();
    orcamentoRepo = new MockOrcamentoRepo(clienteRepo, itemRepo);

    criarOrcamentoUseCase = new CriarOrcamentoUseCase(orcamentoRepo, clienteRepo);
    atualizarOrcamentoUseCase = new AtualizarOrcamentoUseCase(orcamentoRepo, clienteRepo);
    duplicarOrcamentoUseCase = new DuplicarOrcamentoUseCase(orcamentoRepo, itemRepo);
    adicionarItemUseCase = new AdicionarItemOrcamentoUseCase(orcamentoRepo, itemRepo, servicoRepo, produtoRepo);
    removerItemUseCase = new RemoverItemOrcamentoUseCase(orcamentoRepo, itemRepo);

    const cli = await clienteRepo.criar({
      usuarioId,
      nome: 'Cliente Auditoria D1/D2',
    });
    clienteId = cli.id;

    const prod = await produtoRepo.criar({
      usuarioId,
      nome: 'Adubo Premium Teste',
      unidade: 'saco',
      precoBase: 50.0,
    });
    produtoId = prod.id;
  });

  describe('D1 — Fluxo de Desconto FIXO e Preservação de Constraints', () => {
    it('1 a 9: Ciclo completo de criação com desconto FIXO, adição de itens, aplicação posterior e remoção com subtotal zero', async () => {
      // 1. Criar orçamento RASCUNHO sem itens
      // 2. Informar desconto FIXO positivo no formulário (ex: R$ 30,00)
      const descontoFixoDesejado = 30.0;

      // 3. Persistir primeiro o orçamento em estado compatível (desconto neutro inicial)
      // Se tentasse persistir FIXO + R$ 30 com subtotal 0, o banco rejeitaria imediatamente com erro 23514
      const orcamentoCriado = await criarOrcamentoUseCase.execute({
        usuarioId,
        clienteId,
        numero: 'ORC-2026-D1',
        tipoDesconto: null, // Desconto neutro inicial para não violar orcamento_desconto_check
        valorDesconto: 0,
      });

      assert.strictEqual(orcamentoCriado.status, StatusOrcamento.RASCUNHO);
      assert.strictEqual(orcamentoCriado.subtotal, 0);
      assert.strictEqual(orcamentoCriado.valorDesconto, 0);
      assert.strictEqual(orcamentoCriado.total, 0);

      // 4. Adicionar item (2 sacos a R$ 50,00 = R$ 100,00)
      const itemAdicionado = await adicionarItemUseCase.execute({
        usuarioId,
        orcamentoId: orcamentoCriado.id,
        tipo: TipoItem.PRODUTO,
        produtoId,
        quantidade: 2,
      });

      // 5. Persistir subtotal: verificar que agora subtotal = 100.00
      const orcComItem = await orcamentoRepo.buscarPorId(orcamentoCriado.id);
      assert.ok(orcComItem);
      assert.strictEqual(orcComItem.orcamento.subtotal, 100.0);
      assert.strictEqual(orcComItem.orcamento.total, 100.0);

      // 6. Aplicar desconto FIXO informado (R$ 30,00 <= subtotal R$ 100,00)
      const orcComDesconto = await atualizarOrcamentoUseCase.execute({
        usuarioId,
        id: orcamentoCriado.id,
        tipoDesconto: TipoDesconto.FIXO,
        valorDesconto: descontoFixoDesejado,
      });

      // 7. Validar total final: 100.00 - 30.00 = 70.00
      assert.strictEqual(orcComDesconto.subtotal, 100.0);
      assert.strictEqual(orcComDesconto.tipoDesconto, TipoDesconto.FIXO);
      assert.strictEqual(orcComDesconto.valorDesconto, 30.0);
      assert.strictEqual(orcComDesconto.total, 70.0);

      // 8. Remover todos os itens (remove o único item adicionado)
      await removerItemUseCase.execute({
        usuarioId,
        orcamentoId: orcamentoCriado.id,
        itemId: itemAdicionado.id,
      });

      // 9. Validar comportamento do desconto quando subtotal volta a zero (Caso de borda obrigatório):
      // Não pode permanecer persistido um desconto FIXO positivo.
      const orcSemItens = await orcamentoRepo.buscarPorId(orcamentoCriado.id);
      assert.ok(orcSemItens);
      assert.strictEqual(orcSemItens.orcamento.subtotal, 0.0);
      assert.strictEqual(orcSemItens.orcamento.tipoDesconto, null, 'tipoDesconto deve ser neutralizado para null');
      assert.strictEqual(orcSemItens.orcamento.valorDesconto, 0.0, 'valorDesconto deve ser resetado para 0');
      assert.strictEqual(orcSemItens.orcamento.total, 0.0, 'total deve ser 0');
    });

    it('Rejeição estrita caso tente aplicar desconto FIXO maior que o subtotal', async () => {
      // Cria orçamento neutro e adiciona item de R$ 50,00
      const orc = await criarOrcamentoUseCase.execute({
        usuarioId,
        clienteId,
      });
      await adicionarItemUseCase.execute({
        usuarioId,
        orcamentoId: orc.id,
        tipo: TipoItem.PRODUTO,
        produtoId,
        quantidade: 1, // Subtotal 50.00
      });

      // Tentar aplicar desconto FIXO de R$ 50,01 deve ser barrado pelo domínio
      await assert.rejects(
        async () => {
          await atualizarOrcamentoUseCase.execute({
            usuarioId,
            id: orc.id,
            tipoDesconto: TipoDesconto.FIXO,
            valorDesconto: 50.01,
          });
        },
        RegraNegocioError
      );
    });

    it('Preservação do comportamento atual para desconto PERCENTUAL com subtotal inicial zero', async () => {
      // Desconto percentual (ex: 10%) é válido mesmo sem subtotal no banco
      const orcPercentual = await criarOrcamentoUseCase.execute({
        usuarioId,
        clienteId,
        tipoDesconto: TipoDesconto.PERCENTUAL,
        valorDesconto: 10,
      });
      assert.strictEqual(orcPercentual.tipoDesconto, TipoDesconto.PERCENTUAL);
      assert.strictEqual(orcPercentual.valorDesconto, 10);
      assert.strictEqual(orcPercentual.subtotal, 0);
      assert.strictEqual(orcPercentual.total, 0);

      // Adiciona item de R$ 100 -> Total deve ser R$ 90 (100 - 10%)
      await adicionarItemUseCase.execute({
        usuarioId,
        orcamentoId: orcPercentual.id,
        tipo: TipoItem.PRODUTO,
        produtoId,
        quantidade: 2, // 2 * 50 = 100
      });

      const orcRecarregado = await orcamentoRepo.buscarPorId(orcPercentual.id);
      assert.ok(orcRecarregado);
      assert.strictEqual(orcRecarregado.orcamento.subtotal, 100.0);
      assert.strictEqual(orcRecarregado.orcamento.total, 90.0);
    });
  });

  describe('D2 — Mecanismo UUID compatível com Hermes/Android via expo-crypto', () => {
    it('1 a 5: Adicionar item, duplicar orçamento, validação de formato UUIDv4, independência e ausência de crypto.randomUUID global', async () => {
      // 1. Adicionar item usando AdicionarItemOrcamentoUseCase
      const orcOriginal = await criarOrcamentoUseCase.execute({
        usuarioId,
        clienteId,
        numero: 'ORC-2026-ORIGINAL',
      });

      const itemAdicionado = await adicionarItemUseCase.execute({
        usuarioId,
        orcamentoId: orcOriginal.id,
        tipo: TipoItem.PRODUTO,
        produtoId,
        quantidade: 3, // 3 * 50 = 150.00
      });

      // 3. Garantir geração de ID válido para o novo item
      const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      assert.ok(
        uuidV4Regex.test(itemAdicionado.id),
        `ID gerado para o item ('${itemAdicionado.id}') deve ser um UUID v4 compatível`
      );

      // Aplica desconto fixo de R$ 50 no original para testar duplicação com desconto fixo
      await atualizarOrcamentoUseCase.execute({
        usuarioId,
        id: orcOriginal.id,
        tipoDesconto: TipoDesconto.FIXO,
        valorDesconto: 50.0,
      });

      // 2. Duplicar orçamento usando DuplicarOrcamentoUseCase
      const copia = await duplicarOrcamentoUseCase.execute({
        id: orcOriginal.id,
        usuarioId,
        novoNumero: 'ORC-2026-CLONE',
      });

      // 3. Garantir geração de IDs válidos para a cópia e seus itens
      assert.ok(
        uuidV4Regex.test(copia.id),
        `ID do orçamento duplicado ('${copia.id}') deve ser um UUID v4 válido`
      );
      assert.strictEqual(copia.itens.length, 1);
      assert.ok(
        uuidV4Regex.test(copia.itens[0].id),
        `ID do item duplicado ('${copia.itens[0].id}') deve ser um UUID v4 válido`
      );

      // 4. Garantir ausência de dependência de crypto.randomUUID() global
      // Verifica que Crypto.randomUUID de expo-crypto é uma função válida
      assert.strictEqual(typeof Crypto.randomUUID, 'function');
      const testUuid = Crypto.randomUUID();
      assert.ok(uuidV4Regex.test(testUuid), 'Crypto.randomUUID() deve gerar UUID v4 válido');

      // 5. Garantir independência total do orçamento duplicado e de seus itens
      assert.notStrictEqual(copia.id, orcOriginal.id, 'IDs de orçamento devem ser distintos');
      assert.notStrictEqual(copia.numero, orcOriginal.numero, 'Números de proposta devem ser distintos');
      assert.notStrictEqual(copia.itens[0].id, itemAdicionado.id, 'IDs de itens devem ser distintos');
      assert.strictEqual(copia.status, StatusOrcamento.RASCUNHO, 'Cópia deve sempre iniciar em RASCUNHO');

      // Valores devem corresponder
      assert.strictEqual(copia.subtotal, 150.0);
      assert.strictEqual(copia.tipoDesconto, TipoDesconto.FIXO);
      assert.strictEqual(copia.valorDesconto, 50.0);
      assert.strictEqual(copia.total, 100.0);

      // Remover item da cópia não afeta o original
      await removerItemUseCase.execute({
        usuarioId,
        orcamentoId: copia.id,
        itemId: copia.itens[0].id,
      });

      const originalAposRemocaoNaCopia = await orcamentoRepo.buscarPorId(orcOriginal.id);
      assert.ok(originalAposRemocaoNaCopia);
      assert.strictEqual(
        originalAposRemocaoNaCopia.orcamento.itens.length,
        1,
        'O orçamento original não pode ter seus itens afetados pela mutação na cópia'
      );
      assert.strictEqual(originalAposRemocaoNaCopia.orcamento.subtotal, 150.0);
      assert.strictEqual(originalAposRemocaoNaCopia.orcamento.total, 100.0);
    });
  });
});
