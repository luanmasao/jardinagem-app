import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SupabaseOrcamentoRepository } from '../../src/infrastructure/repositories/supabase-orcamento.repository';
import { SupabaseItemOrcamentoRepository } from '../../src/infrastructure/repositories/supabase-item-orcamento.repository';
import { SupabaseAreaRepository } from '../../src/infrastructure/repositories/supabase-area.repository';
import { TipoItem } from '../../src/domain/enums/tipo-item';
import { StatusOrcamento } from '../../src/domain/enums/status-orcamento';
import { TipoDesconto } from '../../src/domain/enums/tipo-desconto';
import { GeometriaPoligono } from '../../src/domain/types/geometria';
import { Area } from '../../src/domain/entities/area';
import { mapAreaRow } from '../../src/infrastructure/mappers/area-geojson.mapper';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

// Geometrias de teste (polígonos válidos e não-colineares em SP)
const geo1: GeometriaPoligono = {
  tipo: 'Polygon',
  coordenadas: [
    { latitude: -23.55052, longitude: -46.633308 },
    { latitude: -23.551601, longitude: -46.63445 },
    { latitude: -23.55278, longitude: -46.63212 },
  ],
};

const geo2: GeometriaPoligono = {
  tipo: 'Polygon',
  coordenadas: [
    { latitude: -23.555, longitude: -46.635 },
    { latitude: -23.556, longitude: -46.636 },
    { latitude: -23.557, longitude: -46.634 },
  ],
};

const geo3: GeometriaPoligono = {
  tipo: 'Polygon',
  coordenadas: [
    { latitude: -23.56, longitude: -46.64 },
    { latitude: -23.561, longitude: -46.641 },
    { latitude: -23.562, longitude: -46.639 },
  ],
};

// Helper para criar usuário isolado com sessão autenticada real
async function criarUsuarioAutenticado(prefixo: string): Promise<{ client: SupabaseClient; userId: string }> {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const email = `${prefixo}.${Date.now()}.${Math.random().toString(36).substring(2, 7)}@example.com`;
  const password = 'Password123!';

  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: {
      data: {
        nome: `Profissional ${prefixo}`,
        telefone: '11999998888',
      },
    },
  });

  if (error || !data.user) {
    throw new Error(`Falha ao criar usuário autenticado para teste (${prefixo}): ${error?.message}`);
  }

  return { client, userId: data.user.id };
}

describe('GAP-AREA-08 — Hidratação e Eager Loading de Áreas (DECISÃO-AREA-04)', () => {
  describe('Testes Unitários de Mapeamento e Hidratação de Áreas', () => {
    it('1. Deve mapear linha de área crua do PostgREST usando mapAreaRow preservando dados e GeoJSON', () => {
      const rawArea = {
        id: 'area-uuid-001',
        item_orcamento_id: 'item-uuid-001',
        nome: 'Gramado Frontal',
        geometria: {
          type: 'Polygon',
          coordinates: [
            [
              [-46.633308, -23.55052],
              [-46.63445, -23.551601],
              [-46.63212, -23.55278],
              [-46.633308, -23.55052],
            ],
          ],
        },
        area_calculada: 125.75,
        unidade: 'm²',
        observacoes: 'Terreno levemente inclinado',
      };

      const area = mapAreaRow(rawArea);

      assert.strictEqual(area.id, 'area-uuid-001');
      assert.strictEqual(area.itemOrcamentoId, 'item-uuid-001');
      assert.strictEqual(area.nome, 'Gramado Frontal');
      assert.strictEqual(area.areaCalculada, 125.75);
      assert.strictEqual(area.unidade, 'm²');
      assert.strictEqual(area.observacoes, 'Terreno levemente inclinado');
      assert.strictEqual(area.geometria.tipo, 'Polygon');
      assert.strictEqual(area.geometria.coordenadas.length, 3);
      assert.strictEqual(area.geometria.coordenadas[0].latitude, -23.55052);
      assert.strictEqual(area.geometria.coordenadas[0].longitude, -46.633308);
    });

    it('2. Deve ordenar deterministicamente múltiplas áreas pelo ID (a.id.localeCompare(b.id))', () => {
      const rawAreas = [
        {
          id: 'z-area-3',
          item_orcamento_id: 'item-1',
          nome: 'Z',
          geometria: {
            type: 'Polygon',
            coordinates: [[[-46.6, -23.5], [-46.7, -23.5], [-46.6, -23.6], [-46.6, -23.5]]],
          },
          area_calculada: 30,
        },
        {
          id: 'a-area-1',
          item_orcamento_id: 'item-1',
          nome: 'A',
          geometria: {
            type: 'Polygon',
            coordinates: [[[-46.6, -23.5], [-46.7, -23.5], [-46.6, -23.6], [-46.6, -23.5]]],
          },
          area_calculada: 10,
        },
        {
          id: 'm-area-2',
          item_orcamento_id: 'item-1',
          nome: 'M',
          geometria: {
            type: 'Polygon',
            coordinates: [[[-46.6, -23.5], [-46.7, -23.5], [-46.6, -23.6], [-46.6, -23.5]]],
          },
          area_calculada: 20,
        },
      ];

      const mapped = rawAreas.map(mapAreaRow).sort((a: Area, b: Area) => a.id.localeCompare(b.id));

      assert.strictEqual(mapped[0].id, 'a-area-1');
      assert.strictEqual(mapped[1].id, 'm-area-2');
      assert.strictEqual(mapped[2].id, 'z-area-3');
    });

    it('3. Deve preservar snapshots do item sem alterações ao hidratar áreas', () => {
      const rawItem = {
        id: 'item-uuid-10',
        orcamento_id: 'orc-uuid-10',
        tipo: 'SERVICO',
        servico_id: 'srv-original-1',
        produto_id: null,
        descricao: 'Serviço com snapshot customizado',
        quantidade: 50.0,
        unidade: 'm²',
        valor_unitario: 35.0,
        valor_total: 1750.0,
        usa_medicao_area: true,
        area: [
          {
            id: 'area-1',
            item_orcamento_id: 'item-uuid-10',
            nome: 'Área 1',
            geometria: {
              type: 'Polygon',
              coordinates: [[[-46.6, -23.5], [-46.7, -23.5], [-46.6, -23.6], [-46.6, -23.5]]],
            },
            area_calculada: 50.0,
            unidade: 'm²',
          },
        ],
      };

      const areas = rawItem.area.map(mapAreaRow);
      const { ItemOrcamento } = require('../../src/domain/entities/item-orcamento');
      const item = new ItemOrcamento({
        id: rawItem.id,
        orcamentoId: rawItem.orcamento_id,
        tipo: rawItem.tipo,
        servicoId: rawItem.servico_id,
        produtoId: rawItem.produto_id,
        descricao: rawItem.descricao,
        quantidade: Number(rawItem.quantidade),
        unidade: rawItem.unidade,
        valorUnitario: Number(rawItem.valor_unitario),
        valorTotal: Number(rawItem.valor_total),
        usaMedicaoArea: Boolean(rawItem.usa_medicao_area),
        areas,
      });

      assert.strictEqual(item.descricao, 'Serviço com snapshot customizado');
      assert.strictEqual(item.unidade, 'm²');
      assert.strictEqual(item.valorUnitario, 35.0);
      assert.strictEqual(item.tipo, TipoItem.SERVICO);
      assert.strictEqual(item.servicoId, 'srv-original-1');
      assert.strictEqual(item.usaMedicaoArea, true);
      assert.strictEqual(item.quantidade, 50.0);
      assert.strictEqual(item.valorTotal, 1750.0);
      assert.strictEqual(item.areas.length, 1);
    });

    it('4. Zero áreas deve resultar em array vazio areas: [] sem exceções', () => {
      const rawItem = {
        id: 'item-sem-areas',
        orcamento_id: 'orc-1',
        tipo: 'SERVICO',
        servico_id: 'srv-1',
        produto_id: null,
        descricao: 'Serviço sem áreas ainda',
        quantidade: 0,
        unidade: 'm²',
        valor_unitario: 20.0,
        valor_total: 0,
        usa_medicao_area: true,
        area: [],
      };

      const { ItemOrcamento } = require('../../src/domain/entities/item-orcamento');
      const item = new ItemOrcamento({
        id: rawItem.id,
        orcamentoId: rawItem.orcamento_id,
        tipo: rawItem.tipo,
        servicoId: rawItem.servico_id,
        produtoId: rawItem.produto_id,
        descricao: rawItem.descricao,
        quantidade: Number(rawItem.quantidade),
        unidade: rawItem.unidade,
        valorUnitario: Number(rawItem.valor_unitario),
        valorTotal: Number(rawItem.valor_total),
        usaMedicaoArea: Boolean(rawItem.usa_medicao_area),
        areas: [],
      });

      assert.strictEqual(item.areas.length, 0);
      assert.deepStrictEqual(item.areas, []);
      assert.strictEqual(item.quantidade, 0);
      assert.strictEqual(item.valorTotal, 0);
    });
  });

  describe('Testes de Integração Real com Supabase Local (E2E Round-Trip)', () => {
    it('Deve executar ciclo completo: criar item medido, adicionar 3 áreas, hidratar detalhe de item e orçamento, e remover área', async () => {
      const { client, userId } = await criarUsuarioAutenticado('e2e-hydration');

      // 1. Criar Cliente
      const { data: cliente, error: cliError } = await client
        .from('cliente')
        .insert({
          usuario_id: userId,
          nome: 'Cliente E2E Teste Hydration',
          email: 'cliente.e2e@example.com',
          telefone: '11988881234',
        })
        .select()
        .single();
      assert.ifError(cliError);

      // 2. Criar Serviço Medido no catálogo
      const { data: servico, error: srvError } = await client
        .from('servico')
        .insert({
          usuario_id: userId,
          nome: 'Poda e Corte de Grama',
          unidade: 'm²',
          preco_base: 30.0,
          usa_medicao_area: true,
        })
        .select()
        .single();
      assert.ifError(srvError);

      const orcRepo = new SupabaseOrcamentoRepository(client);
      const itemRepo = new SupabaseItemOrcamentoRepository(client);
      const areaRepo = new SupabaseAreaRepository(client);

      // 3. Criar Orçamento
      const orcamento = await orcRepo.criar({
        usuarioId: userId,
        clienteId: cliente.id,
      });
      assert.ok(orcamento.id);

      // 4. Criar Item Medido (inicialmente sem áreas)
      const item = await itemRepo.criar({
        orcamentoId: orcamento.id,
        tipo: TipoItem.SERVICO,
        servicoId: servico.id,
        descricao: 'Poda Geral e Gramado',
        quantidade: 0,
        unidade: 'm²',
        valorUnitario: 30.0,
        valorTotal: 0,
        usaMedicaoArea: true,
      });
      assert.ok(item.id);

      // 5. Teste Zero Áreas na leitura
      const itemSemAreas = await itemRepo.buscarPorId(item.id);
      assert.ok(itemSemAreas);
      assert.strictEqual(itemSemAreas.areas.length, 0);
      assert.strictEqual(itemSemAreas.quantidade, 0);

      // 6. Criar Três Áreas
      const a1 = await areaRepo.criar({
        itemOrcamentoId: item.id,
        nome: 'Área 1 - Frente',
        geometria: geo1,
        areaCalculada: 100.5,
        unidade: 'm²',
        observacoes: 'Obs A1',
      });

      const a2 = await areaRepo.criar({
        itemOrcamentoId: item.id,
        nome: 'Área 2 - Fundos',
        geometria: geo2,
        areaCalculada: 50.25,
        unidade: 'm²',
        observacoes: 'Obs A2',
      });

      const a3 = await areaRepo.criar({
        itemOrcamentoId: item.id,
        nome: 'Área 3 - Lateral',
        geometria: geo3,
        areaCalculada: 25.25,
        unidade: 'm²',
        observacoes: 'Obs A3',
      });

      // 7. Consultar detalhe do item: buscarPorId
      const itemCom3 = await itemRepo.buscarPorId(item.id);
      assert.ok(itemCom3);
      assert.strictEqual(itemCom3.areas.length, 3);
      assert.strictEqual(itemCom3.quantidade, 176.0); // 100.50 + 50.25 + 25.25
      assert.strictEqual(itemCom3.valorTotal, 5280.0); // 176.0 * 30.0

      // Verifica ordenação determinística por ID
      for (let i = 0; i < itemCom3.areas.length - 1; i++) {
        assert.ok(
          itemCom3.areas[i].id.localeCompare(itemCom3.areas[i + 1].id) <= 0,
          'Áreas devem estar ordenadas crescentemente por ID'
        );
      }

      // 8. Consultar listagem de itens do orçamento: listarPorOrcamento
      const itensDoOrc = await itemRepo.listarPorOrcamento(orcamento.id);
      assert.strictEqual(itensDoOrc.length, 1);
      assert.strictEqual(itensDoOrc[0].areas.length, 3);
      assert.strictEqual(itensDoOrc[0].quantidade, 176.0);

      // 9. Consultar detalhe do orçamento: buscarPorId
      const orcDetalhe = await orcRepo.buscarPorId(orcamento.id);
      assert.ok(orcDetalhe);
      assert.strictEqual(orcDetalhe.orcamento.itens.length, 1);
      const itemOrc = orcDetalhe.orcamento.itens[0];
      assert.strictEqual(itemOrc.areas.length, 3);
      assert.strictEqual(itemOrc.quantidade, 176.0);
      assert.strictEqual(itemOrc.valorTotal, 5280.0);

      // Verifica fidelidade dos dados de cada área
      const areaFrente = itemOrc.areas.find((a) => a.id === a1.id);
      assert.ok(areaFrente);
      assert.strictEqual(areaFrente.nome, 'Área 1 - Frente');
      assert.strictEqual(areaFrente.areaCalculada, 100.5);
      assert.strictEqual(areaFrente.observacoes, 'Obs A1');
      assert.strictEqual(areaFrente.geometria.tipo, 'Polygon');
      assert.strictEqual(areaFrente.geometria.coordenadas.length, 3);

      // 10. Remover uma área e confirmar que o detalhe hidrata 2 áreas
      await areaRepo.remover(a2.id);

      const itemAposRemocao = await itemRepo.buscarPorId(item.id);
      assert.ok(itemAposRemocao);
      assert.strictEqual(itemAposRemocao.areas.length, 2);
      assert.strictEqual(itemAposRemocao.quantidade, 125.75); // 100.50 + 25.25
      assert.strictEqual(itemAposRemocao.valorTotal, 3772.5); // 125.75 * 30.0

      const orcAposRemocao = await orcRepo.buscarPorId(orcamento.id);
      assert.ok(orcAposRemocao);
      assert.strictEqual(orcAposRemocao.orcamento.itens[0].areas.length, 2);
      assert.strictEqual(orcAposRemocao.orcamento.itens[0].quantidade, 125.75);
    });

    it('Deve garantir isolamento multi-tenant real (User A vê apenas suas áreas, User B apenas as suas)', async () => {
      const userA = await criarUsuarioAutenticado('tenant-a');
      const userB = await criarUsuarioAutenticado('tenant-b');

      // Setup User A
      const { data: cliA } = await userA.client
        .from('cliente')
        .insert({ usuario_id: userA.userId, nome: 'Cliente A' })
        .select()
        .single();
      const { data: srvA } = await userA.client
        .from('servico')
        .insert({ usuario_id: userA.userId, nome: 'Serviço A', unidade: 'm²', preco_base: 10, usa_medicao_area: true })
        .select()
        .single();

      const orcRepoA = new SupabaseOrcamentoRepository(userA.client);
      const itemRepoA = new SupabaseItemOrcamentoRepository(userA.client);
      const areaRepoA = new SupabaseAreaRepository(userA.client);

      const orcA = await orcRepoA.criar({ usuarioId: userA.userId, clienteId: cliA.id });
      const itemA = await itemRepoA.criar({
        orcamentoId: orcA.id,
        tipo: TipoItem.SERVICO,
        servicoId: srvA.id,
        descricao: 'Item A',
        quantidade: 0,
        unidade: 'm²',
        valorUnitario: 10,
        valorTotal: 0,
        usaMedicaoArea: true,
      });

      const areaA1 = await areaRepoA.criar({
        itemOrcamentoId: itemA.id,
        nome: 'Área A1',
        geometria: geo1,
        areaCalculada: 40.0,
      });
      const areaA2 = await areaRepoA.criar({
        itemOrcamentoId: itemA.id,
        nome: 'Área A2',
        geometria: geo2,
        areaCalculada: 60.0,
      });

      // Setup User B
      const { data: cliB } = await userB.client
        .from('cliente')
        .insert({ usuario_id: userB.userId, nome: 'Cliente B' })
        .select()
        .single();
      const { data: srvB } = await userB.client
        .from('servico')
        .insert({ usuario_id: userB.userId, nome: 'Serviço B', unidade: 'm²', preco_base: 20, usa_medicao_area: true })
        .select()
        .single();

      const orcRepoB = new SupabaseOrcamentoRepository(userB.client);
      const itemRepoB = new SupabaseItemOrcamentoRepository(userB.client);
      const areaRepoB = new SupabaseAreaRepository(userB.client);

      const orcB = await orcRepoB.criar({ usuarioId: userB.userId, clienteId: cliB.id });
      const itemB = await itemRepoB.criar({
        orcamentoId: orcB.id,
        tipo: TipoItem.SERVICO,
        servicoId: srvB.id,
        descricao: 'Item B',
        quantidade: 0,
        unidade: 'm²',
        valorUnitario: 20,
        valorTotal: 0,
        usaMedicaoArea: true,
      });

      const areaB1 = await areaRepoB.criar({
        itemOrcamentoId: itemB.id,
        nome: 'Área B1',
        geometria: geo3,
        areaCalculada: 90.0,
      });

      // Verificação User A
      const detalheItemA = await itemRepoA.buscarPorId(itemA.id);
      assert.ok(detalheItemA);
      assert.strictEqual(detalheItemA.areas.length, 2);
      const idsA = detalheItemA.areas.map((a) => a.id);
      assert.ok(idsA.includes(areaA1.id));
      assert.ok(idsA.includes(areaA2.id));
      assert.ok(!idsA.includes(areaB1.id), 'Área de B não pode vazar para Item de A');

      // Verificação User B
      const detalheItemB = await itemRepoB.buscarPorId(itemB.id);
      assert.ok(detalheItemB);
      assert.strictEqual(detalheItemB.areas.length, 1);
      assert.strictEqual(detalheItemB.areas[0].id, areaB1.id);
      assert.ok(!detalheItemB.areas.map((a) => a.id).includes(areaA1.id));

      // Tentativa de acesso cruzado (RLS)
      const cruzadoItem = await itemRepoA.buscarPorId(itemB.id);
      assert.strictEqual(cruzadoItem, null, 'User A não pode ver Item de User B');

      const cruzadoOrc = await orcRepoA.buscarPorId(orcB.id);
      assert.strictEqual(cruzadoOrc, null, 'User A não pode ver Orçamento de User B');
    });

    it('Deve permitir hidratação somente leitura em orçamentos em diferentes status sem efetuar mutações', async () => {
      const { client, userId } = await criarUsuarioAutenticado('status-hydration');
      const { data: cliente } = await client
        .from('cliente')
        .insert({ usuario_id: userId, nome: 'Cliente Status' })
        .select()
        .single();
      const { data: servico } = await client
        .from('servico')
        .insert({ usuario_id: userId, nome: 'Serviço Status', unidade: 'm²', preco_base: 15, usa_medicao_area: true })
        .select()
        .single();

      const orcRepo = new SupabaseOrcamentoRepository(client);
      const itemRepo = new SupabaseItemOrcamentoRepository(client);
      const areaRepo = new SupabaseAreaRepository(client);

      const orc = await orcRepo.criar({
        usuarioId: userId,
        clienteId: cliente.id,
        dataValidade: new Date(Date.now() + 86400000 * 15),
      });

      const item = await itemRepo.criar({
        orcamentoId: orc.id,
        tipo: TipoItem.SERVICO,
        servicoId: servico.id,
        descricao: 'Item Status',
        quantidade: 0,
        unidade: 'm²',
        valorUnitario: 15,
        valorTotal: 0,
        usaMedicaoArea: true,
      });

      await areaRepo.criar({
        itemOrcamentoId: item.id,
        nome: 'Área Teste Status',
        geometria: geo1,
        areaCalculada: 30.0,
      });

      // Atualiza status diretamente para ENVIADO
      await orcRepo.alterarStatus(orc.id, StatusOrcamento.ENVIADO);

      // Consulta detalhe no status ENVIADO
      const orcEnviado = await orcRepo.buscarPorId(orc.id);
      assert.ok(orcEnviado);
      assert.strictEqual(orcEnviado.orcamento.status, StatusOrcamento.ENVIADO);
      assert.strictEqual(orcEnviado.orcamento.itens[0].areas.length, 1);
      assert.strictEqual(orcEnviado.orcamento.itens[0].areas[0].areaCalculada, 30.0);

      // Consulta detalhe do item diretamente
      const itemEnviado = await itemRepo.buscarPorId(item.id);
      assert.ok(itemEnviado);
      assert.strictEqual(itemEnviado.areas.length, 1);
    });

    it('Deve verificar que a listagem de orçamentos (listar) NÃO carrega áreas pesadas (preserva performance)', async () => {
      const { client, userId } = await criarUsuarioAutenticado('list-performance');
      const { data: cliente } = await client
        .from('cliente')
        .insert({ usuario_id: userId, nome: 'Cliente Perf' })
        .select()
        .single();

      const orcRepo = new SupabaseOrcamentoRepository(client);
      await orcRepo.criar({ usuarioId: userId, clienteId: cliente.id });

      const lista = await orcRepo.listar(userId);
      assert.strictEqual(lista.length, 1);
      // OrcamentoResumo só possui campos resumidos, sem carregamento de área ou geometria
      assert.strictEqual((lista[0] as any).itens, undefined);
      assert.strictEqual((lista[0] as any).areas, undefined);
    });

    it('Teste de Regressão Financeira (Seção 20): Leitura hidratada não altera valores, descontos ou totais', async () => {
      const { client, userId } = await criarUsuarioAutenticado('financial-regression');
      const { data: cliente } = await client
        .from('cliente')
        .insert({ usuario_id: userId, nome: 'Cliente Fin' })
        .select()
        .single();
      const { data: servico } = await client
        .from('servico')
        .insert({ usuario_id: userId, nome: 'Serviço Fin', unidade: 'm²', preco_base: 20.0, usa_medicao_area: true })
        .select()
        .single();

      const orcRepo = new SupabaseOrcamentoRepository(client);
      const itemRepo = new SupabaseItemOrcamentoRepository(client);
      const areaRepo = new SupabaseAreaRepository(client);

      const orc = await orcRepo.criar({
        usuarioId: userId,
        clienteId: cliente.id,
      });

      const item = await itemRepo.criar({
        orcamentoId: orc.id,
        tipo: TipoItem.SERVICO,
        servicoId: servico.id,
        descricao: 'Item Fin',
        quantidade: 0,
        unidade: 'm²',
        valorUnitario: 20.0,
        valorTotal: 0,
        usaMedicaoArea: true,
      });

      await areaRepo.criar({
        itemOrcamentoId: item.id,
        nome: 'Área 1',
        geometria: geo1,
        areaCalculada: 50.0,
      });
      await areaRepo.criar({
        itemOrcamentoId: item.id,
        nome: 'Área 2',
        geometria: geo2,
        areaCalculada: 50.0,
      });

      // Aplica desconto no orçamento
      const orcAtualizado = await orcRepo.atualizar(orc.id, {
        subtotal: 2000.0,
        tipoDesconto: TipoDesconto.FIXO,
        valorDesconto: 200.0,
        total: 1800.0,
      });

      assert.strictEqual(orcAtualizado.subtotal, 2000.0);
      assert.strictEqual(orcAtualizado.valorDesconto, 200.0);
      assert.strictEqual(orcAtualizado.total, 1800.0);

      // Consulta de leitura hidratada repetida (busca por ID)
      const orcConsultado1 = await orcRepo.buscarPorId(orc.id);
      const orcConsultado2 = await orcRepo.buscarPorId(orc.id);

      assert.ok(orcConsultado1);
      assert.ok(orcConsultado2);

      // Valores devem permanecer estritamente idênticos e preservados
      assert.strictEqual(orcConsultado1.orcamento.subtotal, 2000.0);
      assert.strictEqual(orcConsultado1.orcamento.valorDesconto, 200.0);
      assert.strictEqual(orcConsultado1.orcamento.total, 1800.0);
      assert.strictEqual(orcConsultado2.orcamento.subtotal, 2000.0);
      assert.strictEqual(orcConsultado2.orcamento.valorDesconto, 200.0);
      assert.strictEqual(orcConsultado2.orcamento.total, 1800.0);

      assert.strictEqual(orcConsultado1.orcamento.itens[0].quantidade, 100.0);
      assert.strictEqual(orcConsultado1.orcamento.itens[0].valorTotal, 2000.0);
      assert.strictEqual(orcConsultado2.orcamento.itens[0].quantidade, 100.0);
      assert.strictEqual(orcConsultado2.orcamento.itens[0].valorTotal, 2000.0);
    });

    it('Teste N+1 (Seção 11 e 22): buscarPorId realiza consulta aninhada única evitando cascata de requisições', async () => {
      let chamadasCount = 0;
      const interceptorClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: {
          fetch: async (url, options) => {
            chamadasCount++;
            return fetch(url, options);
          },
        },
      });

      const { client: authClient, userId } = await criarUsuarioAutenticado('n-plus-1');
      const { data: cliente } = await authClient
        .from('cliente')
        .insert({ usuario_id: userId, nome: 'Cliente N+1' })
        .select()
        .single();
      const { data: servico } = await authClient
        .from('servico')
        .insert({ usuario_id: userId, nome: 'Serviço N+1', unidade: 'm²', preco_base: 10, usa_medicao_area: true })
        .select()
        .single();

      const orcRepoAuth = new SupabaseOrcamentoRepository(authClient);
      const itemRepoAuth = new SupabaseItemOrcamentoRepository(authClient);
      const areaRepoAuth = new SupabaseAreaRepository(authClient);

      const orc = await orcRepoAuth.criar({ usuarioId: userId, clienteId: cliente.id });
      const item1 = await itemRepoAuth.criar({
        orcamentoId: orc.id,
        tipo: TipoItem.SERVICO,
        servicoId: servico.id,
        descricao: 'Item 1',
        quantidade: 0,
        unidade: 'm²',
        valorUnitario: 10,
        valorTotal: 0,
        usaMedicaoArea: true,
      });
      const item2 = await itemRepoAuth.criar({
        orcamentoId: orc.id,
        tipo: TipoItem.SERVICO,
        servicoId: servico.id,
        descricao: 'Item 2',
        quantidade: 0,
        unidade: 'm²',
        valorUnitario: 10,
        valorTotal: 0,
        usaMedicaoArea: true,
      });

      await areaRepoAuth.criar({ itemOrcamentoId: item1.id, nome: 'Area 1.1', geometria: geo1, areaCalculada: 20 });
      await areaRepoAuth.criar({ itemOrcamentoId: item1.id, nome: 'Area 1.2', geometria: geo2, areaCalculada: 30 });
      await areaRepoAuth.criar({ itemOrcamentoId: item2.id, nome: 'Area 2.1', geometria: geo3, areaCalculada: 40 });

      // Transfere a sessão para o cliente com interceptor
      const session = (await authClient.auth.getSession()).data.session;
      await interceptorClient.auth.setSession({
        access_token: session!.access_token,
        refresh_token: session!.refresh_token,
      });

      const monitoredOrcRepo = new SupabaseOrcamentoRepository(interceptorClient);

      chamadasCount = 0;
      const res = await monitoredOrcRepo.buscarPorId(orc.id);

      assert.ok(res);
      assert.strictEqual(res.orcamento.itens.length, 2);
      assert.strictEqual(res.orcamento.itens[0].areas.length, 2);
      assert.strictEqual(res.orcamento.itens[1].areas.length, 1);

      // Em vez de 1 (orçamento) + 2 (itens) + 3 (áreas) = 6 requisições,
      // PostgREST faz exatamente 1 requisição HTTP aninhada única!
      assert.strictEqual(chamadasCount, 1, 'buscarPorId deve realizar exatamente 1 chamada HTTP aninhada');
    });
  });
});
