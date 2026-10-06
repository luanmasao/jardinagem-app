import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { SupabaseAreaRepository } from '../../src/infrastructure/repositories/supabase-area.repository';
import { GeometriaPoligono } from '../../src/domain/types/geometria';
import { Area } from '../../src/domain/entities/area';
import { SupabaseClient } from '@supabase/supabase-js';

// Coordenadas assimétricas para evitar inversão acidental de lat/lon
const latA = -23.55052;
const lonA = -46.633308;
const latB = -23.551601;
const lonB = -46.63445;
const latC = -23.55278;
const lonC = -46.63212;

const geometriaTeste: GeometriaPoligono = {
  tipo: 'Polygon',
  coordenadas: [
    { latitude: latA, longitude: lonA },
    { latitude: latB, longitude: lonB },
    { latitude: latC, longitude: lonC },
  ],
};

/**
 * Cria um mock de SupabaseClient que simula o PostgREST e as policies RLS de public.area:
 * - area_select_policy: item_orcamento -> orcamento.usuario_id = auth.uid()
 * - area_insert_policy: item_orcamento -> orcamento.usuario_id = auth.uid()
 * - area_update_policy: item_orcamento -> orcamento.usuario_id = auth.uid()
 * - area_delete_policy: item_orcamento -> orcamento.usuario_id = auth.uid() AND orcamento.status = 'RASCUNHO'
 */
function createMockSupabaseEnvironment(initialAuthUid: string | null = 'user-a-111') {
  let currentAuthUid: string | null = initialAuthUid;

  // Bancos em memória simulando as tabelas envolvidas
  const tabelaOrcamento = new Map<
    string,
    { id: string; usuario_id: string; status: string }
  >();

  const tabelaItemOrcamento = new Map<
    string,
    { id: string; orcamento_id: string }
  >();

  const tabelaArea = new Map<
    string,
    {
      id: string;
      item_orcamento_id: string;
      nome: string | null;
      geometria: any;
      area_calculada: number;
      unidade: string;
      observacoes: string | null;
    }
  >();

  function setAuthUid(uid: string | null) {
    currentAuthUid = uid;
  }

  function getAuthUid(): string | null {
    return currentAuthUid;
  }

  // Verifica se o usuário autenticado é dono do item_orcamento através da cadeia relacional
  function checkOwner(itemOrcamentoId: string): boolean {
    const item = tabelaItemOrcamento.get(itemOrcamentoId);
    if (!item) return false;
    const orcamento = tabelaOrcamento.get(item.orcamento_id);
    if (!orcamento) return false;
    return orcamento.usuario_id === currentAuthUid;
  }

  // Verifica se o orçamento pai está em status 'RASCUNHO'
  function checkStatusRascunho(itemOrcamentoId: string): boolean {
    const item = tabelaItemOrcamento.get(itemOrcamentoId);
    if (!item) return false;
    const orcamento = tabelaOrcamento.get(item.orcamento_id);
    if (!orcamento) return false;
    return orcamento.status === 'RASCUNHO';
  }

  // Mock PostgREST Query Builder
  const client = {
    from: (table: string) => {
      if (table !== 'area') {
        throw new Error(`Tabela mock '${table}' não suportada diretamente.`);
      }

      return {
        select: (columns: string = '*') => {
          let filterField: string | null = null;
          let filterValue: any = null;

          const queryObj: any = {
            eq: (field: string, value: any) => {
              filterField = field;
              filterValue = value;
              return queryObj;
            },
            maybeSingle: async () => {
              if (!currentAuthUid) {
                return { data: null, error: { code: '42501', message: 'Sessão não autenticada' } };
              }
              if (filterField === 'id') {
                const row = tabelaArea.get(filterValue);
                if (!row) return { data: null, error: null };
                // RLS Check
                if (!checkOwner(row.item_orcamento_id)) {
                  // RLS filtra silenciosamente registros de outros usuários
                  return { data: null, error: null };
                }
                return { data: { ...row }, error: null };
              }
              return { data: null, error: null };
            },
            then: async (resolve: any) => {
              if (!currentAuthUid) {
                return resolve({ data: null, error: { code: '42501', message: 'Sessão não autenticada' } });
              }
              const results: any[] = [];
              for (const row of tabelaArea.values()) {
                if (filterField === 'item_orcamento_id' && row.item_orcamento_id !== filterValue) {
                  continue;
                }
                if (filterField === 'id' && row.id !== filterValue) {
                  continue;
                }
                // RLS Check
                if (checkOwner(row.item_orcamento_id)) {
                  results.push({ ...row });
                }
              }
              return resolve({ data: results, error: null });
            },
          };

          return queryObj;
        },

        insert: (payload: any) => {
          return {
            select: () => ({
              single: async () => {
                if (!currentAuthUid) {
                  return { data: null, error: { code: '42501', message: 'Sessão não autenticada' } };
                }

                // Validação de FK
                const item = tabelaItemOrcamento.get(payload.item_orcamento_id);
                if (!item) {
                  return {
                    data: null,
                    error: {
                      code: '23503',
                      message: 'Key (item_orcamento_id) is not present in table item_orcamento.',
                    },
                  };
                }

                // RLS Insert Check: auth.uid() = orcamento.usuario_id
                if (!checkOwner(payload.item_orcamento_id)) {
                  return {
                    data: null,
                    error: {
                      code: '42501',
                      message: 'new row violates row-level security policy for table "area"',
                    },
                  };
                }

                // Validação de check constraints: area_calculada > 0
                if (payload.area_calculada <= 0) {
                  return {
                    data: null,
                    error: {
                      code: '23514',
                      message: 'new row for relation "area" violates check constraint "area_area_calculada_check"',
                    },
                  };
                }

                const id = payload.id || `area-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
                const newRow = {
                  id,
                  item_orcamento_id: payload.item_orcamento_id,
                  nome: payload.nome ?? null,
                  geometria: payload.geometria,
                  area_calculada: payload.area_calculada,
                  unidade: payload.unidade || 'm²',
                  observacoes: payload.observacoes ?? null,
                };

                tabelaArea.set(id, newRow);
                return { data: { ...newRow }, error: null };
              },
            }),
          };
        },

        update: (payload: any) => {
          let targetId: string | null = null;
          return {
            eq: (field: string, value: any) => {
              if (field === 'id') targetId = value;
              return {
                select: () => ({
                  single: async () => {
                    if (!currentAuthUid) {
                      return { data: null, error: { code: '42501', message: 'Sessão não autenticada' } };
                    }
                    if (!targetId || !tabelaArea.has(targetId)) {
                      return { data: null, error: { code: 'PGRST116', message: 'No rows updated' } };
                    }
                    const existing = tabelaArea.get(targetId)!;

                    // RLS Update Check: auth.uid() = orcamento.usuario_id
                    if (!checkOwner(existing.item_orcamento_id)) {
                      return {
                        data: null,
                        error: {
                          code: '42501',
                          message: 'permission denied for table area',
                        },
                      };
                    }

                    // Check constraint: area_calculada > 0
                    if (payload.area_calculada !== undefined && payload.area_calculada <= 0) {
                      return {
                        data: null,
                        error: {
                          code: '23514',
                          message: 'violates check constraint "area_area_calculada_check"',
                        },
                      };
                    }

                    const updated = {
                      ...existing,
                      ...payload,
                    };
                    tabelaArea.set(targetId, updated);
                    return { data: { ...updated }, error: null };
                  },
                }),
              };
            },
          };
        },

        delete: () => {
          return {
            eq: async (field: string, value: any) => {
              if (!currentAuthUid) {
                return { error: { code: '42501', message: 'Sessão não autenticada' } };
              }
              if (field === 'id') {
                const existing = tabelaArea.get(value);
                if (!existing) {
                  return { error: null }; // Delete idempotente
                }

                // RLS Delete Check: dono E status = 'RASCUNHO'
                if (!checkOwner(existing.item_orcamento_id)) {
                  return {
                    error: {
                      code: '42501',
                      message: 'permission denied for table area (RLS violation)',
                    },
                  };
                }

                if (!checkStatusRascunho(existing.item_orcamento_id)) {
                  return {
                    error: {
                      code: '42501',
                      message: 'delete on table area denied: orcamento status is not RASCUNHO',
                    },
                  };
                }

                tabelaArea.delete(value);
                return { error: null };
              }
              return { error: null };
            },
          };
        },
      };
    },
  } as unknown as SupabaseClient;

  return {
    client,
    setAuthUid,
    getAuthUid,
    tabelaOrcamento,
    tabelaItemOrcamento,
    tabelaArea,
  };
}

describe('SupabaseAreaRepository — GAP-AREA-04 Persistência e RLS', () => {
  let env: ReturnType<typeof createMockSupabaseEnvironment>;
  let repository: SupabaseAreaRepository;

  const userA = 'user-a-uuid';
  const userB = 'user-b-uuid';

  const orcamentoAId = 'orc-a-1';
  const itemAId = 'item-a-1';

  const orcamentoBId = 'orc-b-1';
  const itemBId = 'item-b-1';

  beforeEach(() => {
    env = createMockSupabaseEnvironment(userA);
    repository = new SupabaseAreaRepository(env.client);

    // Setup User A
    env.tabelaOrcamento.set(orcamentoAId, {
      id: orcamentoAId,
      usuario_id: userA,
      status: 'RASCUNHO',
    });
    env.tabelaItemOrcamento.set(itemAId, {
      id: itemAId,
      orcamento_id: orcamentoAId,
    });

    // Setup User B
    env.tabelaOrcamento.set(orcamentoBId, {
      id: orcamentoBId,
      usuario_id: userB,
      status: 'RASCUNHO',
    });
    env.tabelaItemOrcamento.set(itemBId, {
      id: itemBId,
      orcamento_id: orcamentoBId,
    });
  });

  describe('1. Operações CRUD Básicas', () => {
    it('Cenário 1: deve criar uma Area válida com geometria GeoJSON e metragem calculada', async () => {
      const areaCriada = await repository.criar({
        itemOrcamentoId: itemAId,
        nome: 'Jardim dos Fundos',
        geometria: geometriaTeste,
        areaCalculada: 85.5,
        unidade: 'm²',
        observacoes: 'Terreno plano com grama esmeralda',
      });

      assert.ok(areaCriada instanceof Area);
      assert.ok(areaCriada.id);
      assert.strictEqual(areaCriada.itemOrcamentoId, itemAId);
      assert.strictEqual(areaCriada.nome, 'Jardim dos Fundos');
      assert.strictEqual(areaCriada.areaCalculada, 85.5);
      assert.strictEqual(areaCriada.unidade, 'm²');
      assert.strictEqual(areaCriada.observacoes, 'Terreno plano com grama esmeralda');

      // Verifica se a geometria foi persistida em GeoJSON na tabela interna
      const rowNoBanco = env.tabelaArea.get(areaCriada.id);
      assert.ok(rowNoBanco);
      assert.strictEqual(rowNoBanco.geometria.type, 'Polygon');
      assert.strictEqual(rowNoBanco.geometria.coordinates[0].length, 4); // Fechado
      assert.strictEqual(rowNoBanco.geometria.coordinates[0][0][0], lonA); // Longitude no eixo X
      assert.strictEqual(rowNoBanco.geometria.coordinates[0][0][1], latA); // Latitude no eixo Y
    });

    it('Cenário 2: deve consultar Area existente por ID via buscarPorId', async () => {
      const criada = await repository.criar({
        itemOrcamentoId: itemAId,
        nome: 'Área Piscina',
        geometria: geometriaTeste,
        areaCalculada: 42.0,
      });

      const buscada = await repository.buscarPorId(criada.id);
      assert.ok(buscada);
      assert.strictEqual(buscada.id, criada.id);
      assert.strictEqual(buscada.nome, 'Área Piscina');
      assert.strictEqual(buscada.areaCalculada, 42.0);
    });

    it('Cenário 3: deve retornar null ao consultar ID inexistente via buscarPorId', async () => {
      const inexistente = await repository.buscarPorId('uuid-inexistente');
      assert.strictEqual(inexistente, null);
    });

    it('Cenário 4: deve listar todas as áreas vinculadas a um item específico via listarPorItem', async () => {
      await repository.criar({
        itemOrcamentoId: itemAId,
        nome: 'Área 1',
        geometria: geometriaTeste,
        areaCalculada: 10,
      });
      await repository.criar({
        itemOrcamentoId: itemAId,
        nome: 'Área 2',
        geometria: geometriaTeste,
        areaCalculada: 20,
      });

      const lista = await repository.listarPorItem(itemAId);
      assert.strictEqual(lista.length, 2);
      assert.strictEqual(lista[0].nome, 'Área 1');
      assert.strictEqual(lista[1].nome, 'Área 2');
    });

    it('Cenário 5: deve atualizar os dados cadastrais (nome, observações, unidade) de uma área', async () => {
      const criada = await repository.criar({
        itemOrcamentoId: itemAId,
        nome: 'Nome Antigo',
        geometria: geometriaTeste,
        areaCalculada: 30,
        observacoes: 'Sem detalhes',
      });

      const atualizada = await repository.atualizar(criada.id, {
        nome: 'Nome Novo',
        observacoes: 'Detalhes adicionados',
      });

      assert.strictEqual(atualizada.nome, 'Nome Novo');
      assert.strictEqual(atualizada.observacoes, 'Detalhes adicionados');
      assert.strictEqual(atualizada.areaCalculada, 30);
    });

    it('Cenário 6: deve atualizar geometria e areaCalculada de forma atômica', async () => {
      const criada = await repository.criar({
        itemOrcamentoId: itemAId,
        nome: 'Canteiro',
        geometria: geometriaTeste,
        areaCalculada: 30,
      });

      const novaGeometria: GeometriaPoligono = {
        tipo: 'Polygon',
        coordenadas: [
          { latitude: -23.560, longitude: -46.640 },
          { latitude: -23.561, longitude: -46.641 },
          { latitude: -23.562, longitude: -46.639 },
        ],
      };

      const atualizada = await repository.atualizar(criada.id, {
        geometria: novaGeometria,
        areaCalculada: 75.25,
      });

      assert.strictEqual(atualizada.areaCalculada, 75.25);
      assert.strictEqual(atualizada.geometria.coordenadas[0].latitude, -23.560);
      assert.strictEqual(atualizada.geometria.coordenadas[0].longitude, -46.640);
    });

    it('Cenário 7: deve remover uma Area via excluir e via alias remover', async () => {
      const a1 = await repository.criar({
        itemOrcamentoId: itemAId,
        nome: 'Área Excluir',
        geometria: geometriaTeste,
        areaCalculada: 10,
      });
      const a2 = await repository.criar({
        itemOrcamentoId: itemAId,
        nome: 'Área Remover Alias',
        geometria: geometriaTeste,
        areaCalculada: 20,
      });

      await repository.excluir(a1.id);
      const busca1 = await repository.buscarPorId(a1.id);
      assert.strictEqual(busca1, null);

      await repository.remover(a2.id);
      const busca2 = await repository.buscarPorId(a2.id);
      assert.strictEqual(busca2, null);
    });
  });

  describe('2. Multi-Area no Mesmo Item', () => {
    it('deve suportar múltiplas áreas no mesmo item sem conflito de IDs e com isolamento de exclusão', async () => {
      const area1 = await repository.criar({
        itemOrcamentoId: itemAId,
        nome: 'Canteiro de Rosas',
        geometria: geometriaTeste,
        areaCalculada: 15.0,
      });
      const area2 = await repository.criar({
        itemOrcamentoId: itemAId,
        nome: 'Gramado Frontal',
        geometria: geometriaTeste,
        areaCalculada: 60.0,
      });
      const area3 = await repository.criar({
        itemOrcamentoId: itemAId,
        nome: 'Área de Pomar',
        geometria: geometriaTeste,
        areaCalculada: 120.0,
      });

      // Três IDs únicos e independentes
      assert.notStrictEqual(area1.id, area2.id);
      assert.notStrictEqual(area2.id, area3.id);

      // Todas são listadas
      const listaAntes = await repository.listarPorItem(itemAId);
      assert.strictEqual(listaAntes.length, 3);

      // Remoção da Area 2 não afeta Area 1 e Area 3
      await repository.remover(area2.id);

      const listaDepois = await repository.listarPorItem(itemAId);
      assert.strictEqual(listaDepois.length, 2);
      assert.ok(listaDepois.some((a) => a.id === area1.id));
      assert.ok(listaDepois.some((a) => a.id === area3.id));
      assert.ok(!listaDepois.some((a) => a.id === area2.id));
    });
  });

  describe('3. Validações, Constraints e Mapeamento de Erros', () => {
    it('deve lançar erro mapeado de Foreign Key (code 23503) ao associar a item_orcamento inexistente', async () => {
      await assert.rejects(
        () =>
          repository.criar({
            itemOrcamentoId: 'item-fantasma-inexistente',
            nome: 'Área Inválida',
            geometria: geometriaTeste,
            areaCalculada: 50,
          }),
        /item de orçamento associado não encontrado ou inválido/
      );
    });

    it('deve lançar erro mapeado de check constraint (code 23514) ao tentar persistir area_calculada <= 0', async () => {
      await assert.rejects(
        () =>
          repository.criar({
            itemOrcamentoId: itemAId,
            nome: 'Área Zerada',
            geometria: geometriaTeste,
            areaCalculada: -10,
          }),
        /violação de constraint de validação/
      );
    });

    it('deve retornar a entidade atual inalterada se payload de atualizar for vazio', async () => {
      const area = await repository.criar({
        itemOrcamentoId: itemAId,
        nome: 'Área Original',
        geometria: geometriaTeste,
        areaCalculada: 25,
      });

      const mesma = await repository.atualizar(area.id, {});
      assert.strictEqual(mesma.id, area.id);
      assert.strictEqual(mesma.nome, 'Área Original');
    });

    it('deve lançar erro ao atualizar área inexistente', async () => {
      await assert.rejects(
        () =>
          repository.atualizar('area-que-nao-existe', {
            nome: 'Novo Nome',
          }),
        /registro não encontrado ou não acessível/
      );
    });
  });

  describe('4. Isolamento Multi-Tenant e Políticas RLS', () => {
    it('User A não deve conseguir visualizar área de User B via buscarPorId', async () => {
      // User B cria uma área em seu item
      env.setAuthUid(userB);
      const areaB = await repository.criar({
        itemOrcamentoId: itemBId,
        nome: 'Área Secreta de B',
        geometria: geometriaTeste,
        areaCalculada: 100,
      });

      // User A tenta ler a área de User B
      env.setAuthUid(userA);
      const tentativaLeitura = await repository.buscarPorId(areaB.id);
      assert.strictEqual(tentativaLeitura, null, 'RLS deve filtrar área de outro usuário');
    });

    it('User A não deve listar áreas pertencentes a item de User B', async () => {
      env.setAuthUid(userB);
      await repository.criar({
        itemOrcamentoId: itemBId,
        nome: 'Área Privada de B',
        geometria: geometriaTeste,
        areaCalculada: 50,
      });

      env.setAuthUid(userA);
      const lista = await repository.listarPorItem(itemBId);
      assert.strictEqual(lista.length, 0, 'User A deve receber lista vazia para item de B');
    });

    it('User A não deve conseguir alterar área de User B', async () => {
      env.setAuthUid(userB);
      const areaB = await repository.criar({
        itemOrcamentoId: itemBId,
        nome: 'Área Intocável de B',
        geometria: geometriaTeste,
        areaCalculada: 40,
      });

      env.setAuthUid(userA);
      await assert.rejects(
        () =>
          repository.atualizar(areaB.id, {
            nome: 'Tentativa Hacker de A',
          }),
        /permissão negada por política de segurança RLS/
      );
    });

    it('User A não deve conseguir excluir área de User B', async () => {
      env.setAuthUid(userB);
      const areaB = await repository.criar({
        itemOrcamentoId: itemBId,
        nome: 'Área Protegida de B',
        geometria: geometriaTeste,
        areaCalculada: 40,
      });

      env.setAuthUid(userA);
      await assert.rejects(
        () => repository.excluir(areaB.id),
        /permissão negada por política de segurança RLS/
      );

      // Confirma que a área de B não foi excluída
      env.setAuthUid(userB);
      const buscaB = await repository.buscarPorId(areaB.id);
      assert.ok(buscaB);
    });

    it('Cross-tenant insert: User A não deve conseguir criar área vinculada a item_orcamento de User B', async () => {
      env.setAuthUid(userA);
      await assert.rejects(
        () =>
          repository.criar({
            itemOrcamentoId: itemBId, // Item pertence a B!
            nome: 'Injeção Cruzada de A no Orçamento de B',
            geometria: geometriaTeste,
            areaCalculada: 35,
          }),
        /permissão negada por política de segurança RLS/
      );
    });
  });

  describe('5. Regras de Ciclo de Vida: RASCUNHO vs ENVIADO para Exclusão', () => {
    it('deve permitir exclusão quando o orçamento está em status RASCUNHO', async () => {
      env.setAuthUid(userA);
      const area = await repository.criar({
        itemOrcamentoId: itemAId,
        nome: 'Área Deletável em Rascunho',
        geometria: geometriaTeste,
        areaCalculada: 20,
      });

      await repository.excluir(area.id);
      const busca = await repository.buscarPorId(area.id);
      assert.strictEqual(busca, null);
    });

    it('deve bloquear exclusão quando o orçamento está fora de RASCUNHO (ex: ENVIADO)', async () => {
      env.setAuthUid(userA);
      const area = await repository.criar({
        itemOrcamentoId: itemAId,
        nome: 'Área Congelada em Enviado',
        geometria: geometriaTeste,
        areaCalculada: 20,
      });

      // Transita orçamento pai para ENVIADO
      env.tabelaOrcamento.get(orcamentoAId)!.status = 'ENVIADO';

      await assert.rejects(
        () => repository.excluir(area.id),
        /delete on table area denied: orcamento status is not RASCUNHO/
      );

      // Verifica que a área ainda existe
      const aindaExiste = await repository.buscarPorId(area.id);
      assert.ok(aindaExiste);
      assert.strictEqual(aindaExiste.id, area.id);
    });
  });

  describe('6. Preservação do Valor Calculado (Regra: Não Recalcular em Infra)', () => {
    it('o repositório deve persistir com precisão a areaCalculada fornecida sem alteração ou recálculo divergente', async () => {
      const valorOriginal = 123.456; // Deverá ser arredondado via arredondarMoeda para 123.46
      const area = await repository.criar({
        itemOrcamentoId: itemAId,
        nome: 'Área Sem Recálculo',
        geometria: geometriaTeste,
        areaCalculada: valorOriginal,
      });

      assert.strictEqual(area.areaCalculada, 123.46);

      // Atualiza com outro valor arbitrário preciso
      const atualizada = await repository.atualizar(area.id, {
        areaCalculada: 987.65,
      });

      assert.strictEqual(atualizada.areaCalculada, 987.65);
    });
  });
});
