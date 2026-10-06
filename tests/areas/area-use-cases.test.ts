import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { Orcamento } from '../../src/domain/entities/orcamento';
import { ItemOrcamento } from '../../src/domain/entities/item-orcamento';
import { Area } from '../../src/domain/entities/area';
import { StatusOrcamento } from '../../src/domain/enums/status-orcamento';
import { TipoItem } from '../../src/domain/enums/tipo-item';
import { TipoDesconto } from '../../src/domain/enums/tipo-desconto';
import { RegraNegocioError } from '../../src/domain/errors/dominio-error';
import { GeometriaPoligono } from '../../src/domain/types/geometria';
import {
  AreaRepository,
  CriarAreaDados,
  AtualizarAreaDados,
} from '../../src/domain/repositories/area.repository.interface';
import {
  ItemOrcamentoRepository,
  CriarItemOrcamentoDados,
  AtualizarItemOrcamentoDados,
} from '../../src/domain/repositories/item-orcamento.repository.interface';
import {
  OrcamentoRepository,
  CriarOrcamentoDados,
  AtualizarOrcamentoDados,
  OrcamentoResumo,
  OrcamentoComCliente,
} from '../../src/domain/repositories/orcamento.repository.interface';
import { GeodesicCalculadorAreaService } from '../../src/infrastructure/services/geodesic-calculador-area.service';
import {
  CriarAreaUseCase,
  ListarAreasPorItemUseCase,
  ObterAreaUseCase,
  AtualizarAreaUseCase,
  RemoverAreaUseCase,
} from '../../src/application/use-cases/area';
import { AreaService } from '../../src/application/services/area.service';
import { AuthService } from '../../src/application/services/auth.service';

// Polígono 1 (Triângulo em SP: ~21.722,86 m²)
const geometriaTeste1: GeometriaPoligono = {
  tipo: 'Polygon',
  coordenadas: [
    { latitude: -23.55052, longitude: -46.633308 },
    { latitude: -23.551601, longitude: -46.63445 },
    { latitude: -23.55278, longitude: -46.63212 },
  ],
};

// Polígono 2 (Triângulo em SP menor)
const geometriaTeste2: GeometriaPoligono = {
  tipo: 'Polygon',
  coordenadas: [
    { latitude: -23.555, longitude: -46.635 },
    { latitude: -23.556, longitude: -46.636 },
    { latitude: -23.557, longitude: -46.634 },
  ],
};

// Polígono 3 (Triângulo adicional para multi-área)
const geometriaTeste3: GeometriaPoligono = {
  tipo: 'Polygon',
  coordenadas: [
    { latitude: -23.560, longitude: -46.640 },
    { latitude: -23.561, longitude: -46.641 },
    { latitude: -23.562, longitude: -46.639 },
  ],
};

class InMemoryAreaRepo implements AreaRepository {
  public areas: Map<string, Area> = new Map();

  async listarPorItem(itemOrcamentoId: string): Promise<Area[]> {
    return Array.from(this.areas.values()).filter(
      (a) => a.itemOrcamentoId === itemOrcamentoId
    );
  }

  async buscarPorId(id: string): Promise<Area | null> {
    const area = this.areas.get(id);
    if (!area) return null;
    return new Area({
      id: area.id,
      itemOrcamentoId: area.itemOrcamentoId,
      nome: area.nome,
      geometria: {
        tipo: 'Polygon',
        coordenadas: area.geometria.coordenadas.map((c) => ({ ...c })),
      },
      areaCalculada: area.areaCalculada,
      unidade: area.unidade,
      observacoes: area.observacoes,
    });
  }

  async criar(dados: CriarAreaDados): Promise<Area> {
    const id = dados.id ?? `area-${Math.random().toString(36).substring(2, 9)}`;
    const area = new Area({
      id,
      itemOrcamentoId: dados.itemOrcamentoId,
      nome: dados.nome,
      geometria: dados.geometria,
      areaCalculada: dados.areaCalculada,
      unidade: dados.unidade ?? 'm²',
      observacoes: dados.observacoes,
    });
    this.areas.set(id, area);
    return area;
  }

  async atualizar(id: string, dados: AtualizarAreaDados): Promise<Area> {
    const area = this.areas.get(id);
    if (!area) throw new Error('Área não encontrada.');
    if (dados.nome !== undefined) area.nome = dados.nome ? dados.nome.trim() : null;
    if (dados.observacoes !== undefined) area.observacoes = dados.observacoes ? dados.observacoes.trim() : null;
    if (dados.unidade !== undefined) area.unidade = dados.unidade.trim();
    if (dados.geometria !== undefined) area.geometria = dados.geometria;
    if (dados.areaCalculada !== undefined) area.areaCalculada = dados.areaCalculada;
    return area;
  }

  async excluir(id: string): Promise<void> {
    this.areas.delete(id);
  }

  async remover(id: string): Promise<void> {
    return this.excluir(id);
  }
}

class InMemoryItemOrcamentoRepo implements ItemOrcamentoRepository {
  public itens: Map<string, ItemOrcamento> = new Map();

  async listarPorOrcamento(orcamentoId: string): Promise<ItemOrcamento[]> {
    return Array.from(this.itens.values()).filter(
      (i) => i.orcamentoId === orcamentoId
    );
  }

  async buscarPorId(id: string): Promise<ItemOrcamento | null> {
    return this.itens.get(id) ?? null;
  }

  async criar(dados: CriarItemOrcamentoDados): Promise<ItemOrcamento> {
    const id = dados.id ?? `item-${Math.random().toString(36).substring(2, 9)}`;
    const item = new ItemOrcamento({
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
    this.itens.set(id, item);
    return item;
  }

  async atualizar(id: string, dados: AtualizarItemOrcamentoDados): Promise<ItemOrcamento> {
    const item = this.itens.get(id);
    if (!item) throw new Error('Item não encontrado.');
    if (dados.descricao !== undefined) item.descricao = dados.descricao;
    if (dados.quantidade !== undefined) item.quantidade = dados.quantidade;
    if (dados.valorUnitario !== undefined) item.valorUnitario = dados.valorUnitario;
    if (dados.valorTotal !== undefined) item.valorTotal = dados.valorTotal;
    return item;
  }

  async excluir(id: string): Promise<void> {
    this.itens.delete(id);
  }
}

class InMemoryOrcamentoRepo implements OrcamentoRepository {
  public orcamentos: Map<string, Orcamento> = new Map();
  public clientes: Map<string, { nome: string }> = new Map();

  async listar(usuarioId: string, filtroStatus?: StatusOrcamento): Promise<OrcamentoResumo[]> {
    return Array.from(this.orcamentos.values())
      .filter((o) => o.usuarioId === usuarioId)
      .filter((o) => !filtroStatus || o.status === filtroStatus)
      .map((o) => ({
        id: o.id,
        usuarioId: o.usuarioId,
        clienteId: o.clienteId,
        clienteNome: this.clientes.get(o.clienteId)?.nome ?? 'Cliente Teste',
        numero: o.numero,
        dataCriacao: o.dataCriacao,
        dataValidade: o.dataValidade,
        status: o.status,
        subtotal: o.subtotal,
        tipoDesconto: o.tipoDesconto,
        valorDesconto: o.valorDesconto,
        total: o.total,
        totalItens: o.itens.length,
      }));
  }

  async buscarPorId(id: string): Promise<OrcamentoComCliente | null> {
    const orcamento = this.orcamentos.get(id);
    if (!orcamento) return null;
    return {
      orcamento,
      clienteNome: this.clientes.get(orcamento.clienteId)?.nome ?? 'Cliente Teste',
    };
  }

  async obterProximoNumero(_usuarioId: string): Promise<string> {
    return `ORC-2026-${(this.orcamentos.size + 1).toString().padStart(3, '0')}`;
  }

  async criar(dados: CriarOrcamentoDados): Promise<Orcamento> {
    const id = `orc-${Math.random().toString(36).substring(2, 9)}`;
    const orcamento = new Orcamento({
      id,
      usuarioId: dados.usuarioId,
      clienteId: dados.clienteId,
      numero: dados.numero ?? 'ORC-2026-001',
      dataValidade: dados.dataValidade,
      tipoDesconto: dados.tipoDesconto,
      valorDesconto: dados.valorDesconto,
      observacoes: dados.observacoes,
      condicoesPagamento: dados.condicoesPagamento,
      itens: [],
    });
    this.orcamentos.set(id, orcamento);
    return orcamento;
  }

  async atualizar(id: string, dados: AtualizarOrcamentoDados): Promise<Orcamento> {
    const orcamento = this.orcamentos.get(id);
    if (!orcamento) throw new Error('Orçamento não encontrado.');
    if (dados.clienteId !== undefined) (orcamento as any).clienteId = dados.clienteId;
    if (dados.dataValidade !== undefined) orcamento.dataValidade = dados.dataValidade;
    if (dados.tipoDesconto !== undefined) orcamento.tipoDesconto = dados.tipoDesconto;
    if (dados.valorDesconto !== undefined) orcamento.valorDesconto = dados.valorDesconto;
    if (dados.subtotal !== undefined) orcamento.subtotal = dados.subtotal;
    if (dados.total !== undefined) orcamento.total = dados.total;
    if (dados.observacoes !== undefined) orcamento.observacoes = dados.observacoes;
    if (dados.condicoesPagamento !== undefined) orcamento.condicoesPagamento = dados.condicoesPagamento;
    return orcamento;
  }

  async alterarStatus(id: string, novoStatus: StatusOrcamento): Promise<void> {
    const orcamento = this.orcamentos.get(id);
    if (!orcamento) throw new Error('Orçamento não encontrado.');
    orcamento.status = novoStatus;
  }

  async excluir(id: string): Promise<void> {
    this.orcamentos.delete(id);
  }
}

describe('Casos de Uso — Módulo de Áreas v1.0 (GAP-AREA-07)', () => {
  const usuarioId = 'usr-owner-123';
  const outroUsuarioId = 'usr-intruder-999';
  const clienteId = 'cli-test-001';

  let areaRepo: InMemoryAreaRepo;
  let itemOrcamentoRepo: InMemoryItemOrcamentoRepo;
  let orcamentoRepo: InMemoryOrcamentoRepo;
  let calculador: GeodesicCalculadorAreaService;

  let criarAreaUseCase: CriarAreaUseCase;
  let listarAreasUseCase: ListarAreasPorItemUseCase;
  let obterAreaUseCase: ObterAreaUseCase;
  let atualizarAreaUseCase: AtualizarAreaUseCase;
  let removerAreaUseCase: RemoverAreaUseCase;

  let orcamentoRascunho: Orcamento;
  let itemServicoMedido: ItemOrcamento;
  let itemServicoNaoMedido: ItemOrcamento;
  let itemProduto: ItemOrcamento;

  beforeEach(async () => {
    areaRepo = new InMemoryAreaRepo();
    itemOrcamentoRepo = new InMemoryItemOrcamentoRepo();
    orcamentoRepo = new InMemoryOrcamentoRepo();
    calculador = new GeodesicCalculadorAreaService();

    criarAreaUseCase = new CriarAreaUseCase(areaRepo, itemOrcamentoRepo, orcamentoRepo, calculador);
    listarAreasUseCase = new ListarAreasPorItemUseCase(areaRepo, itemOrcamentoRepo, orcamentoRepo);
    obterAreaUseCase = new ObterAreaUseCase(areaRepo, itemOrcamentoRepo, orcamentoRepo);
    atualizarAreaUseCase = new AtualizarAreaUseCase(areaRepo, itemOrcamentoRepo, orcamentoRepo, calculador);
    removerAreaUseCase = new RemoverAreaUseCase(areaRepo, itemOrcamentoRepo, orcamentoRepo);

    // Orçamento base em RASCUNHO
    orcamentoRascunho = await orcamentoRepo.criar({
      usuarioId,
      clienteId,
      numero: 'ORC-2026-001',
    });

    // Item de serviço medido (R$ 10,00 por m²)
    itemServicoMedido = await itemOrcamentoRepo.criar({
      orcamentoId: orcamentoRascunho.id,
      tipo: TipoItem.SERVICO,
      servicoId: 'srv-gramado-01',
      descricao: 'Plantio de Grama',
      quantidade: 0,
      unidade: 'm²',
      valorUnitario: 10.0,
      valorTotal: 0,
      usaMedicaoArea: true,
    });
    orcamentoRascunho.adicionarItem(itemServicoMedido);

    // Item de serviço não medido (R$ 150,00 manual)
    itemServicoNaoMedido = await itemOrcamentoRepo.criar({
      orcamentoId: orcamentoRascunho.id,
      tipo: TipoItem.SERVICO,
      servicoId: 'srv-poda-01',
      descricao: 'Poda de Árvores',
      quantidade: 1,
      unidade: 'un',
      valorUnitario: 150.0,
      valorTotal: 150.0,
      usaMedicaoArea: false,
    });
    orcamentoRascunho.adicionarItem(itemServicoNaoMedido);

    // Item de produto (R$ 50,00 cada)
    itemProduto = await itemOrcamentoRepo.criar({
      orcamentoId: orcamentoRascunho.id,
      tipo: TipoItem.PRODUTO,
      produtoId: 'prod-adubo-01',
      descricao: 'Saco de Adubo 20kg',
      quantidade: 2,
      unidade: 'un',
      valorUnitario: 50.0,
      valorTotal: 100.0,
      usaMedicaoArea: false,
    });
    orcamentoRascunho.adicionarItem(itemProduto);

    // Atualiza totais do orçamento
    await orcamentoRepo.atualizar(orcamentoRascunho.id, {
      subtotal: orcamentoRascunho.subtotal,
      total: orcamentoRascunho.total,
    });
  });

  describe('CriarAreaUseCase', () => {
    it('deve criar área com sucesso para serviço com medição de área em RASCUNHO e recalcular quantidade e valores', async () => {
      const areaEsperada = calculador.calcularArea(geometriaTeste1);
      assert.ok(areaEsperada > 0);

      const area = await criarAreaUseCase.execute({
        usuarioId,
        itemOrcamentoId: itemServicoMedido.id,
        nome: 'Jardim Frontal',
        geometria: geometriaTeste1,
        observacoes: 'Terreno levemente inclinado',
      });

      assert.ok(area.id);
      assert.strictEqual(area.itemOrcamentoId, itemServicoMedido.id);
      assert.strictEqual(area.nome, 'Jardim Frontal');
      assert.strictEqual(area.areaCalculada, areaEsperada);
      assert.strictEqual(area.unidade, 'm²');
      assert.strictEqual(area.observacoes, 'Terreno levemente inclinado');

      // Verifica persistência no repositório
      const areaPersistida = await areaRepo.buscarPorId(area.id);
      assert.ok(areaPersistida);
      assert.strictEqual(areaPersistida.areaCalculada, areaEsperada);

      // RN33, RN34: Quantidade do item deve ser igual à área calculada
      const itemAtualizado = await itemOrcamentoRepo.buscarPorId(itemServicoMedido.id);
      assert.ok(itemAtualizado);
      assert.strictEqual(itemAtualizado.quantidade, areaEsperada);
      assert.strictEqual(itemAtualizado.valorTotal, Math.round(areaEsperada * 10.0 * 100) / 100);

      // Snapshot histórico do item deve ser rigorosamente preservado (RN29, RN31)
      assert.strictEqual(itemAtualizado.descricao, 'Plantio de Grama');
      assert.strictEqual(itemAtualizado.unidade, 'm²');
      assert.strictEqual(itemAtualizado.valorUnitario, 10.0);
      assert.strictEqual(itemAtualizado.tipo, TipoItem.SERVICO);
      assert.strictEqual(itemAtualizado.usaMedicaoArea, true);

      // Recálculo do orçamento (RN48, RN56)
      const orcamentoAtualizado = (await orcamentoRepo.buscarPorId(orcamentoRascunho.id))!.orcamento;
      const subtotalEsperado = Math.round((itemAtualizado.valorTotal + 150.0 + 100.0) * 100) / 100;
      assert.strictEqual(orcamentoAtualizado.subtotal, subtotalEsperado);
      assert.strictEqual(orcamentoAtualizado.total, subtotalEsperado);
    });

    it('deve rejeitar criação de área para item que não utiliza medição de área (usaMedicaoArea = false)', async () => {
      await assert.rejects(
        async () => {
          await criarAreaUseCase.execute({
            usuarioId,
            itemOrcamentoId: itemServicoNaoMedido.id,
            geometria: geometriaTeste1,
          });
        },
        (err: Error) => {
          assert.ok(err instanceof RegraNegocioError);
          assert.match(err.message, /não utiliza medição de área/i);
          return true;
        }
      );
    });

    it('deve rejeitar criação de área para item do tipo PRODUTO', async () => {
      await assert.rejects(
        async () => {
          await criarAreaUseCase.execute({
            usuarioId,
            itemOrcamentoId: itemProduto.id,
            geometria: geometriaTeste1,
          });
        },
        (err: Error) => {
          assert.ok(err instanceof RegraNegocioError);
          assert.match(err.message, /SERVICO/i);
          return true;
        }
      );
    });

    it('deve bloquear criação de área em orçamento com status fora de RASCUNHO (RN64, RN65)', async () => {
      orcamentoRascunho.status = StatusOrcamento.ENVIADO;

      await assert.rejects(
        async () => {
          await criarAreaUseCase.execute({
            usuarioId,
            itemOrcamentoId: itemServicoMedido.id,
            geometria: geometriaTeste1,
          });
        },
        (err: Error) => {
          assert.ok(err instanceof RegraNegocioError);
          assert.match(err.message, /RASCUNHO/i);
          return true;
        }
      );
    });

    it('deve rejeitar geometria inválida com menos de 3 coordenadas', async () => {
      const geometriaInvalida: GeometriaPoligono = {
        tipo: 'Polygon',
        coordenadas: [
          { latitude: -23.55, longitude: -46.63 },
          { latitude: -23.56, longitude: -46.64 },
        ],
      };

      await assert.rejects(
        async () => {
          await criarAreaUseCase.execute({
            usuarioId,
            itemOrcamentoId: itemServicoMedido.id,
            geometria: geometriaInvalida,
          });
        },
        (err: Error) => {
          assert.ok(err instanceof RegraNegocioError);
          assert.match(err.message, /pelo menos 3 coordenadas/i);
          return true;
        }
      );
    });

    it('deve rejeitar se o item de orçamento não existir', async () => {
      await assert.rejects(
        async () => {
          await criarAreaUseCase.execute({
            usuarioId,
            itemOrcamentoId: 'item-inexistente-404',
            geometria: geometriaTeste1,
          });
        },
        (err: Error) => {
          assert.ok(err instanceof RegraNegocioError);
          assert.match(err.message, /Item de orçamento não encontrado/i);
          return true;
        }
      );
    });

    it('deve rejeitar se o orçamento associado pertencer a outro usuário (multi-tenant)', async () => {
      await assert.rejects(
        async () => {
          await criarAreaUseCase.execute({
            usuarioId: outroUsuarioId,
            itemOrcamentoId: itemServicoMedido.id,
            geometria: geometriaTeste1,
          });
        },
        (err: Error) => {
          assert.ok(err instanceof RegraNegocioError);
          assert.match(err.message, /não pertence ao usuário/i);
          return true;
        }
      );
    });

    it('deve rejeitar quando usuárioId for vazio', async () => {
      await assert.rejects(
        async () => {
          await criarAreaUseCase.execute({
            usuarioId: '   ',
            itemOrcamentoId: itemServicoMedido.id,
            geometria: geometriaTeste1,
          });
        },
        (err: Error) => {
          assert.ok(err instanceof RegraNegocioError);
          assert.match(err.message, /Usuário não autenticado/i);
          return true;
        }
      );
    });
  });

  describe('Multi-Área no mesmo Item (Seção 14)', () => {
    it('deve suportar múltiplas áreas (A, B, C) somando deterministicamente as metragens e atualizando quantidade', async () => {
      const areaA = await criarAreaUseCase.execute({
        usuarioId,
        itemOrcamentoId: itemServicoMedido.id,
        nome: 'Área A - Jardim Frontal',
        geometria: geometriaTeste1,
      });

      const areaB = await criarAreaUseCase.execute({
        usuarioId,
        itemOrcamentoId: itemServicoMedido.id,
        nome: 'Área B - Lateral Direita',
        geometria: geometriaTeste2,
      });

      const areaC = await criarAreaUseCase.execute({
        usuarioId,
        itemOrcamentoId: itemServicoMedido.id,
        nome: 'Área C - Fundos',
        geometria: geometriaTeste3,
      });

      // Confirma criação e IDs independentes
      assert.notStrictEqual(areaA.id, areaB.id);
      assert.notStrictEqual(areaB.id, areaC.id);
      assert.notStrictEqual(areaA.id, areaC.id);

      // Soma esperada
      const somaEsperada = Math.round((areaA.areaCalculada + areaB.areaCalculada + areaC.areaCalculada) * 100) / 100;

      const itemRecarregado = await itemOrcamentoRepo.buscarPorId(itemServicoMedido.id);
      assert.ok(itemRecarregado);
      assert.strictEqual(itemRecarregado.quantidade, somaEsperada);
      assert.strictEqual(itemRecarregado.valorTotal, Math.round(somaEsperada * 10.0 * 100) / 100);

      // Listar áreas confirma as 3 áreas associadas
      const lista = await listarAreasUseCase.execute({
        usuarioId,
        itemOrcamentoId: itemServicoMedido.id,
      });
      assert.strictEqual(lista.length, 3);

      // Atualizar a geometria de Área B recalcula e reflete na soma sem afetar Área A e C
      const areaBOriginalMetragem = areaB.areaCalculada;
      const areaBAtualizada = await atualizarAreaUseCase.execute({
        usuarioId,
        id: areaB.id,
        geometria: geometriaTeste1, // Nova geometria para B
      });
      assert.notStrictEqual(areaBAtualizada.areaCalculada, areaBOriginalMetragem);

      const novaSomaEsperada = Math.round((areaA.areaCalculada + areaBAtualizada.areaCalculada + areaC.areaCalculada) * 100) / 100;
      const itemAposAtualizacao = await itemOrcamentoRepo.buscarPorId(itemServicoMedido.id);
      assert.strictEqual(itemAposAtualizacao?.quantidade, novaSomaEsperada);

      // Remover Área A preserva Área B e C e ajusta a quantidade
      await removerAreaUseCase.execute({
        usuarioId,
        id: areaA.id,
      });

      const listaAposRemocao = await listarAreasUseCase.execute({
        usuarioId,
        itemOrcamentoId: itemServicoMedido.id,
      });
      assert.strictEqual(listaAposRemocao.length, 2);
      assert.ok(!listaAposRemocao.some((a) => a.id === areaA.id));
      assert.ok(listaAposRemocao.some((a) => a.id === areaB.id));
      assert.ok(listaAposRemocao.some((a) => a.id === areaC.id));

      const somaRestante = Math.round((areaBAtualizada.areaCalculada + areaC.areaCalculada) * 100) / 100;
      const itemFinal = await itemOrcamentoRepo.buscarPorId(itemServicoMedido.id);
      assert.strictEqual(itemFinal?.quantidade, somaRestante);
    });
  });

  describe('ListarAreasPorItemUseCase', () => {
    it('deve listar áreas existentes em ordem determinística por ID', async () => {
      const a1 = await criarAreaUseCase.execute({
        id: 'area-z-99',
        usuarioId,
        itemOrcamentoId: itemServicoMedido.id,
        nome: 'Zeta',
        geometria: geometriaTeste1,
      });

      const a2 = await criarAreaUseCase.execute({
        id: 'area-a-01',
        usuarioId,
        itemOrcamentoId: itemServicoMedido.id,
        nome: 'Alfa',
        geometria: geometriaTeste2,
      });

      const lista = await listarAreasUseCase.execute({
        usuarioId,
        itemOrcamentoId: itemServicoMedido.id,
      });

      assert.strictEqual(lista.length, 2);
      // Ordem determinística por ID: 'area-a-01' antes de 'area-z-99'
      assert.strictEqual(lista[0].id, a2.id);
      assert.strictEqual(lista[1].id, a1.id);
    });

    it('deve retornar lista vazia se item não tiver nenhuma área delimitada', async () => {
      const lista = await listarAreasUseCase.execute({
        usuarioId,
        itemOrcamentoId: itemServicoMedido.id,
      });

      assert.deepStrictEqual(lista, []);
    });

    it('deve rejeitar se item pertencer a outro usuário (isolamento multi-tenant)', async () => {
      await assert.rejects(
        async () => {
          await listarAreasUseCase.execute({
            usuarioId: outroUsuarioId,
            itemOrcamentoId: itemServicoMedido.id,
          });
        },
        (err: Error) => {
          assert.ok(err instanceof RegraNegocioError);
          assert.match(err.message, /não pertence ao usuário/i);
          return true;
        }
      );
    });
  });

  describe('ObterAreaUseCase', () => {
    it('deve retornar área existente quando solicitada pelo proprietário', async () => {
      const criada = await criarAreaUseCase.execute({
        usuarioId,
        itemOrcamentoId: itemServicoMedido.id,
        nome: 'Canteiro Central',
        geometria: geometriaTeste1,
      });

      const obtida = await obterAreaUseCase.execute({
        usuarioId,
        id: criada.id,
      });

      assert.ok(obtida);
      assert.strictEqual(obtida.id, criada.id);
      assert.strictEqual(obtida.nome, 'Canteiro Central');
      assert.strictEqual(obtida.areaCalculada, criada.areaCalculada);
    });

    it('deve retornar null para área inexistente', async () => {
      const resultado = await obterAreaUseCase.execute({
        usuarioId,
        id: 'area-nao-existe-404',
      });

      assert.strictEqual(resultado, null);
    });

    it('deve retornar null se área pertencer a outro usuário (multi-tenant)', async () => {
      const criada = await criarAreaUseCase.execute({
        usuarioId,
        itemOrcamentoId: itemServicoMedido.id,
        nome: 'Área Privada',
        geometria: geometriaTeste1,
      });

      const resultado = await obterAreaUseCase.execute({
        usuarioId: outroUsuarioId,
        id: criada.id,
      });

      assert.strictEqual(resultado, null);
    });
  });

  describe('AtualizarAreaUseCase', () => {
    it('deve atualizar metadados (nome e observações) sem recalcular área desnecessariamente', async () => {
      const criada = await criarAreaUseCase.execute({
        usuarioId,
        itemOrcamentoId: itemServicoMedido.id,
        nome: 'Nome Antigo',
        geometria: geometriaTeste1,
        observacoes: 'Obs antiga',
      });

      const areaCalculadaOriginal = criada.areaCalculada;

      const atualizada = await atualizarAreaUseCase.execute({
        usuarioId,
        id: criada.id,
        nome: 'Nome Novo',
        observacoes: 'Obs nova',
      });

      assert.strictEqual(atualizada.id, criada.id);
      assert.strictEqual(atualizada.nome, 'Nome Novo');
      assert.strictEqual(atualizada.observacoes, 'Obs nova');
      assert.strictEqual(atualizada.areaCalculada, areaCalculadaOriginal);

      // Quantidade do item deve permanecer inalterada
      const item = await itemOrcamentoRepo.buscarPorId(itemServicoMedido.id);
      assert.strictEqual(item?.quantidade, areaCalculadaOriginal);
    });

    it('deve recalcular areaCalculada quando geometria for alterada e atualizar quantidade do item', async () => {
      const criada = await criarAreaUseCase.execute({
        usuarioId,
        itemOrcamentoId: itemServicoMedido.id,
        nome: 'Jardim',
        geometria: geometriaTeste1,
      });

      const novaAreaEsperada = calculador.calcularArea(geometriaTeste2);
      assert.notStrictEqual(criada.areaCalculada, novaAreaEsperada);

      const atualizada = await atualizarAreaUseCase.execute({
        usuarioId,
        id: criada.id,
        geometria: geometriaTeste2,
      });

      assert.strictEqual(atualizada.areaCalculada, novaAreaEsperada);

      // Verifica sincronização no item
      const item = await itemOrcamentoRepo.buscarPorId(itemServicoMedido.id);
      assert.strictEqual(item?.quantidade, novaAreaEsperada);
      assert.strictEqual(item?.valorTotal, Math.round(novaAreaEsperada * 10.0 * 100) / 100);

      // Verifica recálculo no orçamento
      const orcamento = (await orcamentoRepo.buscarPorId(orcamentoRascunho.id))!.orcamento;
      const subtotalEsperado = Math.round((item!.valorTotal + 150.0 + 100.0) * 100) / 100;
      assert.strictEqual(orcamento.subtotal, subtotalEsperado);
    });

    it('deve bloquear atualização caso orçamento não esteja em RASCUNHO', async () => {
      const criada = await criarAreaUseCase.execute({
        usuarioId,
        itemOrcamentoId: itemServicoMedido.id,
        geometria: geometriaTeste1,
      });

      orcamentoRascunho.status = StatusOrcamento.APROVADO;

      await assert.rejects(
        async () => {
          await atualizarAreaUseCase.execute({
            usuarioId,
            id: criada.id,
            nome: 'Tentativa de Edição',
          });
        },
        (err: Error) => {
          assert.ok(err instanceof RegraNegocioError);
          assert.match(err.message, /RASCUNHO/i);
          return true;
        }
      );
    });

    it('deve rejeitar atualização com geometria inválida', async () => {
      const criada = await criarAreaUseCase.execute({
        usuarioId,
        itemOrcamentoId: itemServicoMedido.id,
        geometria: geometriaTeste1,
      });

      await assert.rejects(
        async () => {
          await atualizarAreaUseCase.execute({
            usuarioId,
            id: criada.id,
            geometria: { tipo: 'Polygon', coordenadas: [{ latitude: 0, longitude: 0 }] },
          });
        },
        (err: Error) => {
          assert.ok(err instanceof RegraNegocioError);
          assert.match(err.message, /pelo menos 3 coordenadas/i);
          return true;
        }
      );
    });
  });

  describe('RemoverAreaUseCase', () => {
    it('deve remover área em RASCUNHO e recalcular a quantidade e valores do item', async () => {
      const a1 = await criarAreaUseCase.execute({
        usuarioId,
        itemOrcamentoId: itemServicoMedido.id,
        nome: 'Área 1',
        geometria: geometriaTeste1,
      });

      const a2 = await criarAreaUseCase.execute({
        usuarioId,
        itemOrcamentoId: itemServicoMedido.id,
        nome: 'Área 2',
        geometria: geometriaTeste2,
      });

      // Remove a1
      await removerAreaUseCase.execute({
        usuarioId,
        id: a1.id,
      });

      // A área 1 não deve mais existir no repositório
      const busca = await areaRepo.buscarPorId(a1.id);
      assert.strictEqual(busca, null);

      // Quantidade do item deve ser apenas a área 2
      const item = await itemOrcamentoRepo.buscarPorId(itemServicoMedido.id);
      assert.strictEqual(item?.quantidade, a2.areaCalculada);
      assert.strictEqual(item?.valorTotal, Math.round(a2.areaCalculada * 10.0 * 100) / 100);

      // Orçamento deve refletir a nova soma
      const orcamento = (await orcamentoRepo.buscarPorId(orcamentoRascunho.id))!.orcamento;
      const subtotalEsperado = Math.round((item!.valorTotal + 150.0 + 100.0) * 100) / 100;
      assert.strictEqual(orcamento.subtotal, subtotalEsperado);
    });

    it('ao remover a última área, a quantidade do item deve voltar para 0.00 com valor total 0.00', async () => {
      const a1 = await criarAreaUseCase.execute({
        usuarioId,
        itemOrcamentoId: itemServicoMedido.id,
        geometria: geometriaTeste1,
      });

      await removerAreaUseCase.execute({
        usuarioId,
        id: a1.id,
      });

      const item = await itemOrcamentoRepo.buscarPorId(itemServicoMedido.id);
      assert.strictEqual(item?.quantidade, 0);
      assert.strictEqual(item?.valorTotal, 0);

      const orcamento = (await orcamentoRepo.buscarPorId(orcamentoRascunho.id))!.orcamento;
      assert.strictEqual(orcamento.subtotal, 250.0); // 150 (serviço não medido) + 100 (produto)
    });

    it('deve bloquear remoção caso orçamento esteja fora de RASCUNHO (ex: ENVIADO)', async () => {
      const a1 = await criarAreaUseCase.execute({
        usuarioId,
        itemOrcamentoId: itemServicoMedido.id,
        geometria: geometriaTeste1,
      });

      orcamentoRascunho.status = StatusOrcamento.ENVIADO;

      await assert.rejects(
        async () => {
          await removerAreaUseCase.execute({
            usuarioId,
            id: a1.id,
          });
        },
        (err: Error) => {
          assert.ok(err instanceof RegraNegocioError);
          assert.match(err.message, /RASCUNHO/i);
          return true;
        }
      );
    });

    it('deve rejeitar remoção de área inexistente', async () => {
      await assert.rejects(
        async () => {
          await removerAreaUseCase.execute({
            usuarioId,
            id: 'area-inexistente-404',
          });
        },
        (err: Error) => {
          assert.ok(err instanceof RegraNegocioError);
          assert.match(err.message, /Área não encontrada/i);
          return true;
        }
      );
    });
  });

  describe('AreaService (Fachada de Aplicação)', () => {
    it('deve orquestrar criação, listagem, obtenção, atualização e remoção integradas', async () => {
      const mockAuth = {
        getCurrentUser: async () => ({ id: usuarioId, email: 'user@test.com' }),
      } as unknown as AuthService;

      const service = new AreaService(
        areaRepo,
        itemOrcamentoRepo,
        orcamentoRepo,
        calculador,
        mockAuth
      );

      // 1. Criar via fachada
      const area = await service.criarArea({
        itemOrcamentoId: itemServicoMedido.id,
        nome: 'Jardim Fachada',
        geometria: geometriaTeste1,
      });
      assert.ok(area.id);

      // 2. Obter via fachada
      const obtida = await service.obterArea(area.id);
      assert.ok(obtida);
      assert.strictEqual(obtida.nome, 'Jardim Fachada');

      // 3. Listar via fachada
      const lista = await service.listarAreasPorItem(itemServicoMedido.id);
      assert.strictEqual(lista.length, 1);
      assert.strictEqual(lista[0].id, area.id);

      // 4. Atualizar via fachada
      const atualizada = await service.atualizarArea(area.id, {
        nome: 'Jardim Fachada VIP',
      });
      assert.strictEqual(atualizada.nome, 'Jardim Fachada VIP');

      // 5. Remover via fachada
      await service.removerArea(area.id);
      const listaPosRemocao = await service.listarAreasPorItem(itemServicoMedido.id);
      assert.strictEqual(listaPosRemocao.length, 0);
    });

    it('deve rejeitar operações se usuário não estiver autenticado na fachada', async () => {
      const mockAuthDeslogado = {
        getCurrentUser: async () => null,
      } as unknown as AuthService;

      const service = new AreaService(
        areaRepo,
        itemOrcamentoRepo,
        orcamentoRepo,
        calculador,
        mockAuthDeslogado
      );

      await assert.rejects(
        async () => {
          await service.criarArea({
            itemOrcamentoId: itemServicoMedido.id,
            geometria: geometriaTeste1,
          });
        },
        (err: Error) => {
          assert.ok(err instanceof RegraNegocioError);
          assert.match(err.message, /Usuário não autenticado/i);
          return true;
        }
      );
    });
  });

  describe('Conformidade Hermes / React Native (D2 / RN34)', () => {
    it('deve gerar IDs compatíveis com UUID v4 para áreas criadas sem ID explícito', async () => {
      const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

      const area = await criarAreaUseCase.execute({
        usuarioId,
        itemOrcamentoId: itemServicoMedido.id,
        geometria: geometriaTeste1,
      });

      assert.ok(
        uuidV4Regex.test(area.id),
        `ID gerado para a área ('${area.id}') deve ser um UUID v4 compatível`
      );
    });

    it('RN34: o fluxo de aplicação deve garantir que a quantidade do item seja sempre derivada das áreas', async () => {
      const a1 = await criarAreaUseCase.execute({
        usuarioId,
        itemOrcamentoId: itemServicoMedido.id,
        geometria: geometriaTeste1,
      });

      const itemRecarregado = await itemOrcamentoRepo.buscarPorId(itemServicoMedido.id);
      assert.strictEqual(itemRecarregado?.quantidade, a1.areaCalculada);

      // Tentar mutar manualmente a quantidade na entidade dispara erro canônico
      assert.throws(
        () => {
          itemRecarregado!.definirQuantidadeManual(50);
        },
        (err: Error) => {
          assert.ok(err instanceof RegraNegocioError);
          assert.match(err.message, /derivada das áreas/i);
          return true;
        }
      );
    });
  });
});
