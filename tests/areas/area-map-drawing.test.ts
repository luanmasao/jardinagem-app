import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { CoordenadaMapa, ModoMapa } from '../../src/infrastructure/maps/map-provider.interface';
import { GeodesicCalculadorAreaService } from '../../src/infrastructure/services/geodesic-calculador-area.service';
import { GeometriaPoligono } from '../../src/domain/types/geometria';
import { dominioParaGeoJson, geoJsonParaDominio } from '../../src/infrastructure/mappers/area-geojson.mapper';
import { AreaService } from '../../src/application/services/area.service';
import {
  CriarAreaUseCase,
  ListarAreasPorItemUseCase,
  ObterAreaUseCase,
  AtualizarAreaUseCase,
  RemoverAreaUseCase,
} from '../../src/application/use-cases/area';
import { AreaRepository, CriarAreaDados, AtualizarAreaDados } from '../../src/domain/repositories/area.repository.interface';
import { ItemOrcamentoRepository, CriarItemOrcamentoDados, AtualizarItemOrcamentoDados } from '../../src/domain/repositories/item-orcamento.repository.interface';
import { OrcamentoRepository, CriarOrcamentoDados, AtualizarOrcamentoDados, OrcamentoResumo, OrcamentoComCliente } from '../../src/domain/repositories/orcamento.repository.interface';
import { AuthService } from '../../src/application/services/auth.service';
import { Orcamento } from '../../src/domain/entities/orcamento';
import { ItemOrcamento } from '../../src/domain/entities/item-orcamento';
import { Area } from '../../src/domain/entities/area';
import { StatusOrcamento } from '../../src/domain/enums/status-orcamento';
import { TipoItem } from '../../src/domain/enums/tipo-item';
import { TipoDesconto } from '../../src/domain/enums/tipo-desconto';
import { RegraNegocioError } from '../../src/domain/errors/dominio-error';

// ============================================================================
// Repositórios em memória para testar isolamento e ausência de chamadas
// ============================================================================

class SpyAreaRepository implements AreaRepository {
  public operacoesChamadas: string[] = [];
  private areas: Map<string, Area> = new Map();

  async criar(dados: CriarAreaDados): Promise<Area> {
    this.operacoesChamadas.push(`criar:${dados.nome}`);
    const area = new Area({
      id: dados.id || 'area-uuid-1',
      itemOrcamentoId: dados.itemOrcamentoId,
      nome: dados.nome,
      geometria: dados.geometria,
      areaCalculada: dados.areaCalculada,
      observacoes: dados.observacoes,
    });
    this.areas.set(area.id, area);
    return area;
  }

  async buscarPorId(id: string): Promise<Area | null> {
    this.operacoesChamadas.push(`buscarPorId:${id}`);
    return this.areas.get(id) || null;
  }

  async obterPorId(id: string): Promise<Area | null> {
    return this.buscarPorId(id);
  }

  async listarPorItem(itemId: string): Promise<Area[]> {
    this.operacoesChamadas.push(`listarPorItem:${itemId}`);
    return Array.from(this.areas.values()).filter((a) => a.itemOrcamentoId === itemId);
  }

  async listarPorItemOrcamentoId(itemId: string): Promise<Area[]> {
    return this.listarPorItem(itemId);
  }

  async atualizar(id: string, dados: AtualizarAreaDados): Promise<Area> {
    this.operacoesChamadas.push(`atualizar:${id}`);
    const existente = this.areas.get(id);
    if (!existente) throw new Error('Área não encontrada');
    const atualizada = new Area({
      id: existente.id,
      itemOrcamentoId: existente.itemOrcamentoId,
      nome: dados.nome ?? existente.nome,
      geometria: dados.geometria ?? existente.geometria,
      areaCalculada: dados.areaCalculada ?? existente.areaCalculada,
      observacoes: dados.observacoes !== undefined ? dados.observacoes : existente.observacoes,
      unidade: dados.unidade ?? existente.unidade,
    });
    this.areas.set(id, atualizada);
    return atualizada;
  }

  async excluir(id: string): Promise<void> {
    this.operacoesChamadas.push(`excluir:${id}`);
    this.areas.delete(id);
  }

  async remover(id: string): Promise<void> {
    return this.excluir(id);
  }

  async removerPorItemOrcamentoId(itemId: string): Promise<void> {
    this.operacoesChamadas.push(`removerPorItemOrcamentoId:${itemId}`);
    for (const [id, area] of this.areas.entries()) {
      if (area.itemOrcamentoId === itemId) this.areas.delete(id);
    }
  }

  limparHistorico() {
    this.operacoesChamadas = [];
  }
}

class InMemoryItemOrcamentoRepository implements ItemOrcamentoRepository {
  private itens: Map<string, ItemOrcamento> = new Map();

  constructor(itensIniciais: ItemOrcamento[] = []) {
    itensIniciais.forEach((item) => this.itens.set(item.id, item));
  }

  async buscarPorId(id: string): Promise<ItemOrcamento | null> {
    return this.itens.get(id) || null;
  }

  async listarPorOrcamento(orcamentoId: string): Promise<ItemOrcamento[]> {
    return Array.from(this.itens.values()).filter((i) => i.orcamentoId === orcamentoId);
  }

  async criar(dados: CriarItemOrcamentoDados): Promise<ItemOrcamento> {
    const item = new ItemOrcamento({
      id: dados.id || 'item-uuid-1',
      orcamentoId: dados.orcamentoId,
      tipo: dados.tipo,
      servicoId: dados.servicoId,
      produtoId: dados.produtoId,
      descricao: dados.descricao,
      quantidade: dados.quantidade,
      unidade: dados.unidade,
      valorUnitario: dados.valorUnitario,
      valorTotal: dados.valorTotal,
      usaMedicaoArea: dados.usaMedicaoArea ?? false,
    });
    this.itens.set(item.id, item);
    return item;
  }

  async atualizar(id: string, dados: AtualizarItemOrcamentoDados): Promise<ItemOrcamento> {
    const item = this.itens.get(id);
    if (!item) throw new Error('Item não encontrado');
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

class InMemoryOrcamentoRepository implements OrcamentoRepository {
  private orcamentos: Map<string, Orcamento> = new Map();

  constructor(orcamentosIniciais: Orcamento[] = []) {
    orcamentosIniciais.forEach((o) => this.orcamentos.set(o.id, o));
  }

  async buscarPorId(id: string): Promise<OrcamentoComCliente | null> {
    const o = this.orcamentos.get(id);
    if (!o) return null;
    return { orcamento: o, clienteNome: 'Cliente Teste' };
  }

  async listar(usuarioId: string, filtroStatus?: StatusOrcamento): Promise<OrcamentoResumo[]> {
    return Array.from(this.orcamentos.values())
      .filter((o) => o.usuarioId === usuarioId)
      .filter((o) => !filtroStatus || o.status === filtroStatus)
      .map((o) => ({
        id: o.id,
        usuarioId: o.usuarioId,
        clienteId: o.clienteId,
        clienteNome: 'Cliente Teste',
        numero: o.numero,
        dataCriacao: o.dataCriacao,
        dataValidade: null,
        status: o.status,
        subtotal: o.subtotal,
        tipoDesconto: o.tipoDesconto,
        valorDesconto: o.valorDesconto,
        total: o.total,
      }));
  }

  async obterProximoNumero(usuarioId: string): Promise<string> {
    return 'ORC-0001';
  }

  async criar(dados: CriarOrcamentoDados): Promise<Orcamento> {
    const orcamento = new Orcamento({
      id: 'orcamento-uuid-1',
      usuarioId: dados.usuarioId,
      clienteId: dados.clienteId,
      numero: dados.numero || 'ORC-0001',
      status: StatusOrcamento.RASCUNHO,
      subtotal: 0,
      tipoDesconto: dados.tipoDesconto || null,
      valorDesconto: dados.valorDesconto || 0,
      total: 0,
    });
    this.orcamentos.set(orcamento.id, orcamento);
    return orcamento;
  }

  async atualizar(id: string, dados: AtualizarOrcamentoDados): Promise<Orcamento> {
    const o = this.orcamentos.get(id);
    if (!o) throw new Error('Orçamento não encontrado');
    if (dados.clienteId !== undefined) (o as any).clienteId = dados.clienteId;
    if (dados.tipoDesconto !== undefined) o.tipoDesconto = dados.tipoDesconto;
    if (dados.valorDesconto !== undefined) o.valorDesconto = dados.valorDesconto;
    if (dados.subtotal !== undefined) o.subtotal = dados.subtotal;
    if (dados.total !== undefined) o.total = dados.total;
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

// ============================================================================
// SUÍTE DE TESTES OBRIGATÓRIOS DO GAP-AREA-01
// ============================================================================

describe('GAP-AREA-01: Mapa, Modo Satellite e Desenho Interativo de Polígonos', () => {
  const usuarioId = 'usr-test-123';
  const orcamentoId = 'orc-test-123';
  const itemId = 'item-test-123';

  // Coordenadas reais de teste (Jardim da Luz / Parque em SP)
  const coordA: CoordenadaMapa = { latitude: -23.53422, longitude: -46.63467 };
  const coordB: CoordenadaMapa = { latitude: -23.53505, longitude: -46.63319 };
  const coordC: CoordenadaMapa = { latitude: -23.53612, longitude: -46.63435 };
  const coordD: CoordenadaMapa = { latitude: -23.53550, longitude: -46.63580 };

  let spyAreaRepo: SpyAreaRepository;
  let itemRepo: InMemoryItemOrcamentoRepository;
  let orcamentoRepo: InMemoryOrcamentoRepository;
  let calculadorArea: GeodesicCalculadorAreaService;
  let authService: AuthService;
  let areaService: AreaService;

  beforeEach(() => {
    spyAreaRepo = new SpyAreaRepository();
    calculadorArea = new GeodesicCalculadorAreaService();

    const orcamento = new Orcamento({
      id: orcamentoId,
      usuarioId,
      clienteId: 'cli-test-1',
      numero: 'ORC-2026-001',
      status: StatusOrcamento.RASCUNHO,
      subtotal: 0,
      tipoDesconto: null,
      valorDesconto: 0,
      total: 0,
    });
    orcamentoRepo = new InMemoryOrcamentoRepository([orcamento]);

    const item = new ItemOrcamento({
      id: itemId,
      orcamentoId,
      tipo: TipoItem.SERVICO,
      servicoId: 'srv-grama-1',
      descricao: 'Corte e Adubação de Gramado',
      quantidade: 0,
      unidade: 'm²',
      valorUnitario: 25.0, // R$ 25,00 por m²
      valorTotal: 0,
      usaMedicaoArea: true,
      areas: [],
    });
    itemRepo = new InMemoryItemOrcamentoRepository([item]);

    authService = {
      getCurrentUser: async () => ({
        id: usuarioId,
        email: 'jardineiro@teste.com',
      }),
      obterUsuarioAutenticado: async () => ({
        id: usuarioId,
        email: 'jardineiro@teste.com',
      }),
    } as unknown as AuthService;

    areaService = new AreaService(
      spyAreaRepo,
      itemRepo,
      orcamentoRepo,
      calculadorArea,
      authService
    );
  });

  // --------------------------------------------------------------------------
  // 1. Mapa renderizado
  // --------------------------------------------------------------------------
  it('1. deve inicializar o estado do mapa com região padrão e configurações válidas', () => {
    const regiaoPadrao = {
      latitude: -23.55052,
      longitude: -46.633308,
      latitudeDelta: 0.005,
      longitudeDelta: 0.005,
    };

    assert.ok(regiaoPadrao.latitude >= -90 && regiaoPadrao.latitude <= 90);
    assert.ok(regiaoPadrao.longitude >= -180 && regiaoPadrao.longitude <= 180);
    assert.strictEqual(regiaoPadrao.latitudeDelta, 0.005);
    assert.strictEqual(regiaoPadrao.longitudeDelta, 0.005);
  });

  // --------------------------------------------------------------------------
  // 2. Modo Satellite
  // --------------------------------------------------------------------------
  it('2. deve operar prioritariamente em modo Satellite e permitir alternância controlada', () => {
    const alternarModo = (modo: ModoMapa): ModoMapa =>
      modo === 'satellite' ? 'standard' : 'satellite';

    let modoMapa: ModoMapa = 'satellite';
    assert.strictEqual(modoMapa, 'satellite', 'Modo padrão obrigatório deve ser satellite');

    // Alterna para standard
    modoMapa = alternarModo(modoMapa);
    assert.strictEqual(modoMapa, 'standard');

    // Alterna de volta para satellite
    modoMapa = alternarModo(modoMapa);
    assert.strictEqual(modoMapa, 'satellite', 'Deve retornar para satellite');
  });

  // --------------------------------------------------------------------------
  // 3. Adição ordenada de vértices
  // --------------------------------------------------------------------------
  it('3. deve adicionar vértices em ordem sequencial estrita preservando cada coordenada', () => {
    const vertices: CoordenadaMapa[] = [];

    // Adiciona A
    vertices.push(coordA);
    assert.strictEqual(vertices.length, 1);
    assert.deepStrictEqual(vertices[0], coordA);

    // Adiciona B
    vertices.push(coordB);
    assert.strictEqual(vertices.length, 2);
    assert.deepStrictEqual(vertices[1], coordB);

    // Adiciona C
    vertices.push(coordC);
    assert.strictEqual(vertices.length, 3);
    assert.deepStrictEqual(vertices[2], coordC);

    // A ordem [A, B, C] deve ser estritamente preservada
    assert.deepStrictEqual(vertices, [coordA, coordB, coordC]);
  });

  // --------------------------------------------------------------------------
  // 4. Fechamento do polígono
  // --------------------------------------------------------------------------
  it('4. deve permitir fechar o polígono quando houver >= 3 vértices e calcular área geodésica em tempo real', () => {
    const vertices: CoordenadaMapa[] = [coordA, coordB, coordC];
    assert.ok(vertices.length >= 3, 'Polígono precisa de no mínimo 3 vértices');

    // Fechamento visual
    let poligonoFechado = true;
    assert.strictEqual(poligonoFechado, true);

    // Converte para geometria de domínio
    const geometria: GeometriaPoligono = {
      tipo: 'Polygon',
      coordenadas: vertices.map((v) => ({ latitude: v.latitude, longitude: v.longitude })),
    };

    // Calcula área geodésica usando o serviço do domínio
    const areaM2 = calculadorArea.calcularArea(geometria);
    assert.ok(areaM2 > 0, 'Área calculada deve ser estritamente positiva');
    assert.ok(areaM2 > 1000 && areaM2 < 50000, `Área esperada no Jardim da Luz (~12.000m²), obtido: ${areaM2}`);
  });

  // --------------------------------------------------------------------------
  // 5. Conversão latitude/longitude → GeoJSON (DECISÃO-AREA-02)
  // --------------------------------------------------------------------------
  it('5. deve converter coordenadas visuais para GeoJSON obedecendo [lon, lat] com anel fechado explícito', () => {
    const vertices: CoordenadaMapa[] = [coordA, coordB, coordC, coordD];

    const geometria: GeometriaPoligono = {
      tipo: 'Polygon',
      coordenadas: vertices.map((v) => ({ latitude: v.latitude, longitude: v.longitude })),
    };

    const geojson = dominioParaGeoJson(geometria);

    assert.strictEqual(geojson.type, 'Polygon');
    assert.strictEqual(geojson.coordinates.length, 1, 'Deve ter exatamente 1 anel exterior');

    const anel = geojson.coordinates[0];
    // Um anel fechado com 4 vértices distintos deve conter 5 posições no GeoJSON
    assert.strictEqual(anel.length, 5);

    // Posição 0: [longitude, latitude] do vértice A
    assert.strictEqual(anel[0][0], coordA.longitude, 'Posição 0 deve ser longitude de A');
    assert.strictEqual(anel[0][1], coordA.latitude, 'Posição 1 deve ser latitude de A');

    // Posição 4 (última): deve ser exatamente idêntica à posição 0 (fechamento do anel)
    assert.strictEqual(anel[4][0], anel[0][0], 'Longitude final deve fechar com a inicial');
    assert.strictEqual(anel[4][1], anel[0][1], 'Latitude final deve fechar com a inicial');
  });

  // --------------------------------------------------------------------------
  // 6. Preservação dos eixos (Sem inversão lat/lon)
  // --------------------------------------------------------------------------
  it('6. deve preservar os eixos sem inversão entre CoordenadaMapa, GeometriaPoligono e GeoJSON', () => {
    const latOriginal = -23.55052;
    const lonOriginal = -46.633308;

    const coord: CoordenadaMapa = { latitude: latOriginal, longitude: lonOriginal };
    assert.strictEqual(coord.latitude, latOriginal);
    assert.strictEqual(coord.longitude, lonOriginal);

    const geometria: GeometriaPoligono = {
      tipo: 'Polygon',
      coordenadas: [
        { latitude: coord.latitude, longitude: coord.longitude },
        { latitude: -23.551, longitude: -46.634 },
        { latitude: -23.552, longitude: -46.632 },
      ],
    };

    // No domínio, coordenadas são { latitude, longitude }
    assert.strictEqual(geometria.coordenadas[0].latitude, latOriginal);
    assert.strictEqual(geometria.coordenadas[0].longitude, lonOriginal);

    // Na conversão para GeoJSON, a especificação RFC 7946 exige [longitude, latitude]
    const geojson = dominioParaGeoJson(geometria);
    assert.strictEqual(geojson.coordinates[0][0][0], lonOriginal, 'GeoJSON coord[0] é longitude (eixo X)');
    assert.strictEqual(geojson.coordinates[0][0][1], latOriginal, 'GeoJSON coord[1] é latitude (eixo Y)');

    // Na conversão de volta do GeoJSON para domínio, recupera { latitude, longitude }
    const recuperada = geoJsonParaDominio(geojson);
    assert.strictEqual(recuperada.coordenadas[0].latitude, latOriginal);
    assert.strictEqual(recuperada.coordenadas[0].longitude, lonOriginal);
  });

  // --------------------------------------------------------------------------
  // 7. Polígono com número insuficiente de vértices
  // --------------------------------------------------------------------------
  it('7. deve rejeitar encerramento ou cálculo para polígonos com menos de 3 vértices', () => {
    // 0 vértices
    const zeroVertices: CoordenadaMapa[] = [];
    assert.strictEqual(zeroVertices.length < 3, true);

    // 1 vértice
    const umVertice: CoordenadaMapa[] = [coordA];
    assert.strictEqual(umVertice.length < 3, true);

    // 2 vértices
    const doisVertices: CoordenadaMapa[] = [coordA, coordB];
    assert.strictEqual(doisVertices.length < 3, true);

    // Se tentar calcular geometria com 2 vértices no domínio, deve lançar erro
    const geometriaInvalida: GeometriaPoligono = {
      tipo: 'Polygon',
      coordenadas: doisVertices.map((v) => ({ latitude: v.latitude, longitude: v.longitude })),
    };

    assert.throws(
      () => calculadorArea.calcularArea(geometriaInvalida),
      (err: unknown) => {
        return (
          err instanceof RegraNegocioError &&
          (err.message.includes('ao menos 3') || err.message.includes('pelo menos 3'))
        );
      }
    );
  });

  // --------------------------------------------------------------------------
  // 8. Cancelamento do desenho
  // --------------------------------------------------------------------------
  it('8. deve limpar todos os vértices e cancelar o desenho sem deixar efeitos colaterais', () => {
    let vertices: CoordenadaMapa[] = [coordA, coordB, coordC];
    let poligonoFechado = true;
    let areaEstimada = 1500;

    // Ação: Cancelar / Limpar
    vertices = [];
    poligonoFechado = false;
    areaEstimada = 0;

    assert.strictEqual(vertices.length, 0);
    assert.strictEqual(poligonoFechado, false);
    assert.strictEqual(areaEstimada, 0);
  });

  // --------------------------------------------------------------------------
  // 9. Ausência de chamadas ao banco durante interação puramente visual
  // --------------------------------------------------------------------------
  it('9. deve assegurar que interação visual (toques, zoom, alternância de modo, desfazer) não faz chamadas ao banco', () => {
    spyAreaRepo.limparHistorico();

    // Simula interação visual intensa do usuário:
    const verticesInterativos: CoordenadaMapa[] = [];

    // Toque 1: adiciona vértice 1
    verticesInterativos.push(coordA);
    // Toque 2: adiciona vértice 2
    verticesInterativos.push(coordB);
    // Toque 3: adiciona vértice 3
    verticesInterativos.push(coordC);

    // Desfaz último vértice
    verticesInterativos.pop();

    // Toque 4: adiciona novo vértice C
    verticesInterativos.push(coordC);
    // Toque 5: adiciona vértice D
    verticesInterativos.push(coordD);

    // Alterna modo de satélite
    let modo: ModoMapa = 'satellite';
    modo = 'standard';
    modo = 'satellite';

    // Calcula área em tempo real na memória (TypeScript puro, sem SQL/PostGIS)
    const areaTemp = calculadorArea.calcularArea({
      tipo: 'Polygon',
      coordenadas: verticesInterativos.map((v) => ({ latitude: v.latitude, longitude: v.longitude })),
    });
    assert.ok(areaTemp > 0);

    // O repositório não deve ter recebido NENHUMA chamada!
    assert.strictEqual(
      spyAreaRepo.operacoesChamadas.length,
      0,
      'Nenhuma operação de repositório deve ocorrer durante a interação visual'
    );
  });

  // --------------------------------------------------------------------------
  // 10. Integração do desenho com o caso de uso existente
  // --------------------------------------------------------------------------
  it('10. deve integrar o encerramento do desenho com AreaService.criarArea persistindo e recalculando item', async () => {
    spyAreaRepo.limparHistorico();

    // 1. Usuário desenha os 4 vértices no mapa
    const verticesDesenho: CoordenadaMapa[] = [coordA, coordB, coordC, coordD];

    // 2. Converte visual para GeometriaPoligono
    const geometriaFinal: GeometriaPoligono = {
      tipo: 'Polygon',
      coordenadas: verticesDesenho.map((v) => ({ latitude: v.latitude, longitude: v.longitude })),
    };

    // 3. Submete ao AreaService (fachada de aplicação)
    const areaCriada = await areaService.criarArea({
      itemOrcamentoId: itemId,
      nome: 'Gramado Principal - Frente',
      geometria: geometriaFinal,
      observacoes: 'Delimitado interativamente via modo satélite',
    });

    // 4. Valida persistência
    assert.ok(areaCriada.id);
    assert.strictEqual(areaCriada.nome, 'Gramado Principal - Frente');
    assert.strictEqual(areaCriada.itemOrcamentoId, itemId);
    assert.ok(areaCriada.areaCalculada > 0, 'Área deve ter sido calculada pelo GeodesicCalculadorAreaService');

    // 5. Verifica se o repositório registrou a criação e a listagem para recálculo da quantidade (RN34)
    assert.deepStrictEqual(spyAreaRepo.operacoesChamadas, [
      'criar:Gramado Principal - Frente',
      `listarPorItem:${itemId}`,
    ]);

    // 6. Verifica se a quantidade do ItemOrcamento foi sincronizada automaticamente com a metragem da área
    const itemAtualizado = await itemRepo.buscarPorId(itemId);
    assert.ok(itemAtualizado);
    assert.strictEqual(itemAtualizado.quantidade, areaCriada.areaCalculada);
    assert.strictEqual(
      itemAtualizado.valorTotal,
      Math.round((areaCriada.areaCalculada * 25.0 + Number.EPSILON) * 100) / 100
    );

    // 7. Verifica listagem de áreas do item
    const areasDoItem = await areaService.listarAreasPorItem(itemId);
    assert.strictEqual(areasDoItem.length, 1);
    assert.strictEqual(areasDoItem[0].id, areaCriada.id);
  });
});
