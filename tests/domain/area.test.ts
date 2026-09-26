import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  Area,
  ItemOrcamento,
  Servico,
  RegraNegocioError,
  validarGeometriaPoligono,
  isPoligonoFechado,
  obterVerticesPoligono,
  CalculadorAreaService,
  GeometriaPoligono,
} from '../../src/domain';

describe('Area e Medição', () => {
  // Polígono com fechamento explícito (4 coordenadas, 3 vértices distintos)
  const geometriaValida = {
    tipo: 'Polygon' as const,
    coordenadas: [
      { latitude: -23.5505, longitude: -46.6333 },
      { latitude: -23.5515, longitude: -46.6333 },
      { latitude: -23.5515, longitude: -46.6343 },
      { latitude: -23.5505, longitude: -46.6333 },
    ],
  };

  // Polígono com fechamento implícito (3 vértices distintos - padrão mobile)
  const geometriaVerticesValida: GeometriaPoligono = {
    tipo: 'Polygon',
    coordenadas: [
      { latitude: -23.5505, longitude: -46.6333 },
      { latitude: -23.5515, longitude: -46.6333 },
      { latitude: -23.5515, longitude: -46.6343 },
    ],
  };

  it('deve criar área válida com dados completos', () => {
    const area = new Area({
      id: 'area-1',
      itemOrcamentoId: 'item-1',
      nome: 'Jardim da Frente',
      geometria: geometriaValida,
      areaCalculada: 75.5,
      observacoes: 'Terreno inclinado',
    });

    assert.strictEqual(area.id, 'area-1');
    assert.strictEqual(area.itemOrcamentoId, 'item-1');
    assert.strictEqual(area.nome, 'Jardim da Frente');
    assert.strictEqual(area.areaCalculada, 75.5);
    assert.strictEqual(area.unidade, 'm²');
    assert.strictEqual(area.observacoes, 'Terreno inclinado');
  });

  it('deve rejeitar área com área calculada menor ou igual a zero', () => {
    assert.throws(
      () =>
        new Area({
          id: 'area-zero',
          itemOrcamentoId: 'item-1',
          geometria: geometriaValida,
          areaCalculada: 0,
        }),
      RegraNegocioError
    );

    assert.throws(
      () =>
        new Area({
          id: 'area-neg',
          itemOrcamentoId: 'item-1',
          geometria: geometriaValida,
          areaCalculada: -10,
        }),
      RegraNegocioError
    );
  });

  it('deve rejeitar geometria inválida com menos de 3 coordenadas', () => {
    assert.throws(
      () =>
        new Area({
          id: 'area-invalida',
          itemOrcamentoId: 'item-1',
          geometria: {
            tipo: 'Polygon',
            coordenadas: [{ latitude: 0, longitude: 0 }],
          },
          areaCalculada: 50,
        }),
      RegraNegocioError
    );
  });

  it('RN38, RN39, RN33: deve permitir múltiplas áreas e somá-las na quantidade do item medido', () => {
    const servico = new Servico({
      id: 'srv-1',
      usuarioId: 'usr-1',
      nome: 'Plantio de Grama',
      unidade: 'm²',
      precoBase: 20.0,
      usaMedicaoArea: true,
    });

    const item = ItemOrcamento.criarDeServico('item-1', 'orc-1', servico);
    assert.strictEqual(item.quantidade, 0);
    assert.strictEqual(item.valorTotal, 0);

    const area1 = new Area({
      id: 'area-1',
      itemOrcamentoId: item.id,
      nome: 'Setor A',
      geometria: geometriaValida,
      areaCalculada: 50.25,
    });

    const area2 = new Area({
      id: 'area-2',
      itemOrcamentoId: item.id,
      nome: 'Setor B (não contíguo)',
      geometria: geometriaValida,
      areaCalculada: 30.75,
    });

    item.adicionarArea(area1);
    assert.strictEqual(item.quantidade, 50.25);
    assert.strictEqual(item.valorTotal, 1005.0); // 50.25 * 20

    item.adicionarArea(area2);
    // RN33: quantidade = soma das áreas (50.25 + 30.75 = 81.0)
    assert.strictEqual(item.quantidade, 81.0);
    assert.strictEqual(item.valorTotal, 1620.0); // 81.0 * 20
  });

  it('RN43: alteração de área deve recalcular quantidade e valor total do item', () => {
    const servico = new Servico({
      id: 'srv-1',
      usuarioId: 'usr-1',
      nome: 'Limpeza e Nivelamento',
      unidade: 'm²',
      precoBase: 10.0,
      usaMedicaoArea: true,
    });

    const item = ItemOrcamento.criarDeServico('item-1', 'orc-1', servico);
    const area = new Area({
      id: 'area-1',
      itemOrcamentoId: item.id,
      geometria: geometriaValida,
      areaCalculada: 100.0,
    });

    item.adicionarArea(area);
    assert.strictEqual(item.quantidade, 100.0);
    assert.strictEqual(item.valorTotal, 1000.0);

    // Atualiza geometria e área calculada
    area.atualizarGeometria(geometriaValida, 150.0);
    item.atualizarArea(area);

    assert.strictEqual(item.quantidade, 150.0);
    assert.strictEqual(item.valorTotal, 1500.0);
  });

  it('RN44: remoção de área deve subtrair da quantidade e recalcular valor total', () => {
    const servico = new Servico({
      id: 'srv-1',
      usuarioId: 'usr-1',
      nome: 'Adubação de Área',
      unidade: 'm²',
      precoBase: 5.0,
      usaMedicaoArea: true,
    });

    const item = ItemOrcamento.criarDeServico('item-1', 'orc-1', servico);
    const area1 = new Area({
      id: 'area-1',
      itemOrcamentoId: item.id,
      geometria: geometriaValida,
      areaCalculada: 60.0,
    });
    const area2 = new Area({
      id: 'area-2',
      itemOrcamentoId: item.id,
      geometria: geometriaValida,
      areaCalculada: 40.0,
    });

    item.adicionarArea(area1);
    item.adicionarArea(area2);
    assert.strictEqual(item.quantidade, 100.0);
    assert.strictEqual(item.valorTotal, 500.0);

    item.removerArea('area-2');
    assert.strictEqual(item.quantidade, 60.0);
    assert.strictEqual(item.valorTotal, 300.0);
  });

  // Novos testes: Validação de GeometriaPoligono (RN40)
  describe('Validação de GeometriaPoligono (RN40)', () => {
    it('deve aceitar polígono válido com fechamento explícito (GeoJSON/PostGIS LinearRing)', () => {
      assert.strictEqual(validarGeometriaPoligono(geometriaValida), true);
      assert.strictEqual(isPoligonoFechado(geometriaValida), true);
      const vertices = obterVerticesPoligono(geometriaValida);
      assert.strictEqual(vertices.length, 3);
    });

    it('deve aceitar polígono válido com fechamento implícito (vértices do mapa mobile)', () => {
      assert.strictEqual(validarGeometriaPoligono(geometriaVerticesValida), true);
      assert.strictEqual(isPoligonoFechado(geometriaVerticesValida), false);
      const vertices = obterVerticesPoligono(geometriaVerticesValida);
      assert.strictEqual(vertices.length, 3);
    });

    it('deve rejeitar geometrias vazias, nulas ou sem array de coordenadas', () => {
      assert.strictEqual(validarGeometriaPoligono(null as unknown as GeometriaPoligono), false);
      assert.strictEqual(validarGeometriaPoligono(undefined as unknown as GeometriaPoligono), false);
      assert.strictEqual(validarGeometriaPoligono({ tipo: 'Polygon', coordenadas: [] }), false);
      assert.strictEqual(
        validarGeometriaPoligono({ tipo: 'LineString' as unknown as 'Polygon', coordenadas: [] }),
        false
      );
    });

    it('deve rejeitar polígono com menos de 3 coordenadas ou anel explícito com menos de 4 coordenadas', () => {
      // Menos de 3 coordenadas
      assert.strictEqual(
        validarGeometriaPoligono({
          tipo: 'Polygon',
          coordenadas: [
            { latitude: -23.55, longitude: -46.63 },
            { latitude: -23.56, longitude: -46.64 },
          ],
        }),
        false
      );

      // Anel com primeiro ponto igual ao último, porém com apenas 3 pontos no total (apenas 2 vértices distintos)
      assert.strictEqual(
        validarGeometriaPoligono({
          tipo: 'Polygon',
          coordenadas: [
            { latitude: -23.55, longitude: -46.63 },
            { latitude: -23.56, longitude: -46.64 },
            { latitude: -23.55, longitude: -46.63 },
          ],
        }),
        false
      );
    });

    it('deve rejeitar polígonos degenerados (pontos colapsados com menos de 3 vértices distintos)', () => {
      // 3 coordenadas idênticas
      assert.strictEqual(
        validarGeometriaPoligono({
          tipo: 'Polygon',
          coordenadas: [
            { latitude: -23.55, longitude: -46.63 },
            { latitude: -23.55, longitude: -46.63 },
            { latitude: -23.55, longitude: -46.63 },
          ],
        }),
        false
      );

      // 4 coordenadas repetindo apenas 2 pontos alternados (segmento de reta)
      assert.strictEqual(
        validarGeometriaPoligono({
          tipo: 'Polygon',
          coordenadas: [
            { latitude: -23.55, longitude: -46.63 },
            { latitude: -23.56, longitude: -46.64 },
            { latitude: -23.55, longitude: -46.63 },
            { latitude: -23.56, longitude: -46.64 },
          ],
        }),
        false
      );
    });

    it('deve rejeitar coordenadas com valores inválidos (NaN, Infinity, fora dos limites geográficos)', () => {
      // Latitude fora de [-90, +90]
      assert.strictEqual(
        validarGeometriaPoligono({
          tipo: 'Polygon',
          coordenadas: [
            { latitude: 95.0, longitude: -46.63 },
            { latitude: -23.56, longitude: -46.63 },
            { latitude: -23.56, longitude: -46.64 },
          ],
        }),
        false
      );

      // Longitude fora de [-180, +180]
      assert.strictEqual(
        validarGeometriaPoligono({
          tipo: 'Polygon',
          coordenadas: [
            { latitude: -23.55, longitude: 200.0 },
            { latitude: -23.56, longitude: -46.63 },
            { latitude: -23.56, longitude: -46.64 },
          ],
        }),
        false
      );

      // Coordenada com NaN ou Infinity
      assert.strictEqual(
        validarGeometriaPoligono({
          tipo: 'Polygon',
          coordenadas: [
            { latitude: NaN, longitude: -46.63 },
            { latitude: -23.56, longitude: -46.63 },
            { latitude: -23.56, longitude: -46.64 },
          ],
        }),
        false
      );

      assert.strictEqual(
        validarGeometriaPoligono({
          tipo: 'Polygon',
          coordenadas: [
            { latitude: -23.55, longitude: Infinity },
            { latitude: -23.56, longitude: -46.63 },
            { latitude: -23.56, longitude: -46.64 },
          ],
        }),
        false
      );
    });
  });

  // Novos testes: Contrato CalculadorAreaService (RN41 e métodos UML da Area)
  describe('Contrato CalculadorAreaService e Métodos UML (RN41)', () => {
    const calculadorMock: CalculadorAreaService = {
      calcularArea: (_geom: GeometriaPoligono) => 125.75,
    };

    it('deve calcular área utilizando o contrato CalculadorAreaService', () => {
      const area = new Area({
        id: 'area-calc',
        itemOrcamentoId: 'item-1',
        geometria: geometriaVerticesValida,
        areaCalculada: 50.0,
      });

      const resultadoCalculado = area.calcularArea(calculadorMock);
      assert.strictEqual(resultadoCalculado, 125.75);
    });

    it('deve atualizar área calculada diretamente via método atualizarArea (UML v3.1)', () => {
      const area = new Area({
        id: 'area-upd',
        itemOrcamentoId: 'item-1',
        geometria: geometriaVerticesValida,
        areaCalculada: 50.0,
      });

      area.atualizarArea(88.4);
      assert.strictEqual(area.areaCalculada, 88.4);

      assert.throws(() => area.atualizarArea(0), RegraNegocioError);
      assert.throws(() => area.atualizarArea(-5), RegraNegocioError);
    });

    it('deve atualizar geometria e recalcular área automaticamente via CalculadorAreaService (RN41, RN42, RN43)', () => {
      const area = new Area({
        id: 'area-upd-geom',
        itemOrcamentoId: 'item-1',
        geometria: geometriaValida,
        areaCalculada: 50.0,
      });

      const novaGeometria: GeometriaPoligono = {
        tipo: 'Polygon',
        coordenadas: [
          { latitude: -23.56, longitude: -46.65 },
          { latitude: -23.57, longitude: -46.65 },
          { latitude: -23.57, longitude: -46.66 },
        ],
      };

      area.atualizarGeometria(novaGeometria, calculadorMock);
      assert.strictEqual(area.areaCalculada, 125.75);
      assert.strictEqual(area.geometria, novaGeometria);
    });

    it('deve rejeitar se o CalculadorAreaService retornar valor nulo, zero, negativo ou NaN', () => {
      const area = new Area({
        id: 'area-err',
        itemOrcamentoId: 'item-1',
        geometria: geometriaVerticesValida,
        areaCalculada: 50.0,
      });

      const calculadorInvalido: CalculadorAreaService = {
        calcularArea: () => 0,
      };

      assert.throws(() => area.calcularArea(calculadorInvalido), RegraNegocioError);
      assert.throws(
        () => area.atualizarGeometria(geometriaVerticesValida, calculadorInvalido),
        RegraNegocioError
      );
    });
  });
});
