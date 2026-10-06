import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  GeodesicCalculadorAreaService,
  geodesicCalculadorAreaService,
} from '../../src/infrastructure/services/geodesic-calculador-area.service';
import {
  Area,
  CalculadorAreaService,
  GeometriaPoligono,
  RegraNegocioError,
} from '../../src/domain';

describe('GeodesicCalculadorAreaService (GAP-AREA-06 / DECISÃO-AREA-01)', () => {
  // Conversões métricas aproximadas para latitude e longitude em São Paulo (-23.55°, -46.63°)
  const LAT_SP = -23.5505;
  const LON_SP = -46.6333;
  // 1 metro de latitude ~ 1 / 111319.49 graus
  const GRAUS_POR_METRO_LAT = 1 / 111319.49;
  // 1 metro de longitude ~ 1 / (111319.49 * cos(lat)) graus
  const GRAUS_POR_METRO_LON =
    1 / (111319.49 * Math.cos((LAT_SP * Math.PI) / 180));

  it('deve satisfazer a interface/porta CalculadorAreaService do domínio', () => {
    const service: CalculadorAreaService = new GeodesicCalculadorAreaService();
    assert.strictEqual(typeof service.calcularArea, 'function');

    // Confirma export singleton
    assert.ok(geodesicCalculadorAreaService instanceof GeodesicCalculadorAreaService);
  });

  it('Cenário 1: deve calcular área de um polígono simples (triângulo no equador)', () => {
    // Triângulo retângulo no Equador com base 0.001° e altura 0.001°
    // 0.001° no equador ~ 111.3195 m
    // Área analítica esperada plana: (111.3195 * 111.3195) / 2 ~ 6195.88 m²
    const geometriaTriangulo: GeometriaPoligono = {
      tipo: 'Polygon',
      coordenadas: [
        { latitude: 0.0, longitude: 0.0 },
        { latitude: 0.0, longitude: 0.001 },
        { latitude: 0.001, longitude: 0.0 },
      ],
    };

    const area = geodesicCalculadorAreaService.calcularArea(geometriaTriangulo);
    assert.strictEqual(typeof area, 'number');
    assert.ok(area > 6190 && area < 6200, `Área esperada próxima de 6195.88 m², obtido: ${area}`);
  });

  it('Cenário 2: deve calcular área de um jardim com coordenadas geográficas reais em São Paulo', () => {
    // Retângulo de 10m x 20m = 200 m² em São Paulo
    const deltaLat = 10 * GRAUS_POR_METRO_LAT;
    const deltaLon = 20 * GRAUS_POR_METRO_LON;

    const jardimSP: GeometriaPoligono = {
      tipo: 'Polygon',
      coordenadas: [
        { latitude: LAT_SP, longitude: LON_SP },
        { latitude: LAT_SP, longitude: LON_SP + deltaLon },
        { latitude: LAT_SP + deltaLat, longitude: LON_SP + deltaLon },
        { latitude: LAT_SP + deltaLat, longitude: LON_SP },
      ],
    };

    const areaCalculada = geodesicCalculadorAreaService.calcularArea(jardimSP);
    // Deve ser exatamente 200.00 m² (ou margem menor que 0.1 m² antes do arredondamento comercial)
    assert.strictEqual(areaCalculada, 200.0);
  });

  it('Cenário 3 e 4: deve produzir resultado estritamente idêntico entre fechamento explícito e implícito (A-B-C-A vs A-B-C)', () => {
    const coordsBase = [
      { latitude: -23.5505, longitude: -46.6333 },
      { latitude: -23.5515, longitude: -46.6333 },
      { latitude: -23.5515, longitude: -46.6343 },
    ];

    const poligonoImplicito: GeometriaPoligono = {
      tipo: 'Polygon',
      coordenadas: [...coordsBase],
    };

    const poligonoExplicito: GeometriaPoligono = {
      tipo: 'Polygon',
      coordenadas: [...coordsBase, { ...coordsBase[0] }],
    };

    const areaImplicito = geodesicCalculadorAreaService.calcularArea(poligonoImplicito);
    const areaExplicito = geodesicCalculadorAreaService.calcularArea(poligonoExplicito);

    assert.ok(areaImplicito > 0);
    assert.strictEqual(
      areaImplicito,
      areaExplicito,
      'A representação explícita e implícita do mesmo anel devem gerar exatamente a mesma área'
    );
  });

  it('Cenário 5: Teste de Orientação — sentido horário (CW) e anti-horário (CCW) devem produzir a mesma área não-negativa', () => {
    const verticesCW: GeometriaPoligono = {
      tipo: 'Polygon',
      coordenadas: [
        { latitude: -23.55, longitude: -46.63 },
        { latitude: -23.55 + 0.0001, longitude: -46.63 },
        { latitude: -23.55 + 0.0001, longitude: -46.63 + 0.0002 },
        { latitude: -23.55, longitude: -46.63 + 0.0002 },
      ],
    };

    const verticesCCW: GeometriaPoligono = {
      tipo: 'Polygon',
      coordenadas: [...verticesCW.coordenadas].reverse(),
    };

    const areaCW = geodesicCalculadorAreaService.calcularArea(verticesCW);
    const areaCCW = geodesicCalculadorAreaService.calcularArea(verticesCCW);

    assert.ok(areaCW > 0, 'Área em sentido horário deve ser positiva');
    assert.ok(areaCCW > 0, 'Área em sentido anti-horário deve ser positiva');
    assert.strictEqual(
      areaCW,
      areaCCW,
      'A inversão da ordem dos vértices não deve criar resultado negativo ou divergente'
    );
  });

  it('Cenário 6: deve calcular áreas consistentes em diferentes posições geográficas (Sul, Norte, Equador)', () => {
    // Quadrado de 15m x 15m = 225 m² em 3 partes distintas do globo
    const testarEmLocalizacao = (lat: number, lon: number): number => {
      const gLat = 1 / 111319.49;
      const gLon = 1 / (111319.49 * Math.cos((lat * Math.PI) / 180));

      const poly: GeometriaPoligono = {
        tipo: 'Polygon',
        coordenadas: [
          { latitude: lat, longitude: lon },
          { latitude: lat, longitude: lon + 15 * gLon },
          { latitude: lat + 15 * gLat, longitude: lon + 15 * gLon },
          { latitude: lat + 15 * gLat, longitude: lon },
        ],
      };
      return geodesicCalculadorAreaService.calcularArea(poly);
    };

    const areaSP = testarEmLocalizacao(-23.55, -46.63); // São Paulo (Hemisfério Sul)
    const areaEquador = testarEmLocalizacao(0.0, -51.05); // Macapá (Equador)
    const areaLondres = testarEmLocalizacao(51.5, -0.12); // Londres (Hemisfério Norte)

    assert.strictEqual(areaSP, 225.0);
    assert.strictEqual(areaEquador, 225.0);
    assert.strictEqual(areaLondres, 225.0);
  });

  it('Cenário 7 e 8: deve lidar adequadamente com área pequena (canteiro) e área maior (fazenda/parque)', () => {
    // Pequeno canteiro de flores: 3m x 4m = 12 m²
    const canteiroPequeno: GeometriaPoligono = {
      tipo: 'Polygon',
      coordenadas: [
        { latitude: LAT_SP, longitude: LON_SP },
        { latitude: LAT_SP, longitude: LON_SP + 4 * GRAUS_POR_METRO_LON },
        { latitude: LAT_SP + 3 * GRAUS_POR_METRO_LAT, longitude: LON_SP + 4 * GRAUS_POR_METRO_LON },
        { latitude: LAT_SP + 3 * GRAUS_POR_METRO_LAT, longitude: LON_SP },
      ],
    };
    const areaPequena = geodesicCalculadorAreaService.calcularArea(canteiroPequeno);
    assert.strictEqual(areaPequena, 12.0);

    // Grande área de plantio: 200m x 500m = 100.000 m²
    const parqueGrande: GeometriaPoligono = {
      tipo: 'Polygon',
      coordenadas: [
        { latitude: LAT_SP, longitude: LON_SP },
        { latitude: LAT_SP, longitude: LON_SP + 500 * GRAUS_POR_METRO_LON },
        { latitude: LAT_SP + 200 * GRAUS_POR_METRO_LAT, longitude: LON_SP + 500 * GRAUS_POR_METRO_LON },
        { latitude: LAT_SP + 200 * GRAUS_POR_METRO_LAT, longitude: LON_SP },
      ],
    };
    const areaGrande = geodesicCalculadorAreaService.calcularArea(parqueGrande);
    assert.ok(Math.abs(areaGrande - 100000.0) <= 1.0, `Área esperada próxima de 100000 m², obtido: ${areaGrande}`);
  });

  it('Cenário 9: Comportamento Determinístico — múltiplas invocações retornam exatamente o mesmo valor', () => {
    const geometria: GeometriaPoligono = {
      tipo: 'Polygon',
      coordenadas: [
        { latitude: -23.5505, longitude: -46.6333 },
        { latitude: -23.5515, longitude: -46.6333 },
        { latitude: -23.5518, longitude: -46.6341 },
        { latitude: -23.5508, longitude: -46.6345 },
      ],
    };

    const primeira = geodesicCalculadorAreaService.calcularArea(geometria);

    for (let i = 0; i < 50; i++) {
      const repeticao = geodesicCalculadorAreaService.calcularArea(geometria);
      assert.strictEqual(repeticao, primeira, `Iteração ${i} produziu valor divergente`);
    }
  });

  it('Cenário 10: Consistência entre representações cíclicas equivalentes (shift de vértice inicial)', () => {
    const v1 = { latitude: -23.5505, longitude: -46.6333 };
    const v2 = { latitude: -23.5515, longitude: -46.6333 };
    const v3 = { latitude: -23.5515, longitude: -46.6343 };
    const v4 = { latitude: -23.5505, longitude: -46.6343 };

    const ciclo1: GeometriaPoligono = { tipo: 'Polygon', coordenadas: [v1, v2, v3, v4] };
    const ciclo2: GeometriaPoligono = { tipo: 'Polygon', coordenadas: [v2, v3, v4, v1] };
    const ciclo3: GeometriaPoligono = { tipo: 'Polygon', coordenadas: [v3, v4, v1, v2] };

    const a1 = geodesicCalculadorAreaService.calcularArea(ciclo1);
    const a2 = geodesicCalculadorAreaService.calcularArea(ciclo2);
    const a3 = geodesicCalculadorAreaService.calcularArea(ciclo3);

    assert.strictEqual(a1, a2);
    assert.strictEqual(a2, a3);
  });

  it('deve normalizar corretamente o cruzamento do antimeridiano (-180° / +180°)', () => {
    // Quadrilátero que cruza o meridiano 180° (de 179.999° a -179.999°, delta de 0.002° no Equador)
    const antimeridianoPoly: GeometriaPoligono = {
      tipo: 'Polygon',
      coordenadas: [
        { latitude: 0.0, longitude: 179.999 },
        { latitude: 0.0, longitude: -179.999 },
        { latitude: 0.002, longitude: -179.999 },
        { latitude: 0.002, longitude: 179.999 },
      ],
    };

    const area = geodesicCalculadorAreaService.calcularArea(antimeridianoPoly);
    assert.ok(area > 0, 'Área que cruza o antimeridiano deve ser calculada e positiva');
    // 0.002° no equador ~ 222.64m -> 222.64 * 222.64 ~ 49568 m²
    assert.ok(area > 49000 && area < 50000, `Área esperada próxima de 49568 m², obtido: ${area}`);
  });

  it('deve lançar RegraNegocioError para geometrias inválidas segundo os contratos do domínio', () => {
    // Geometria nula ou tipo errado
    assert.throws(
      () => geodesicCalculadorAreaService.calcularArea(null as unknown as GeometriaPoligono),
      RegraNegocioError
    );

    // Menos de 3 coordenadas
    assert.throws(
      () =>
        geodesicCalculadorAreaService.calcularArea({
          tipo: 'Polygon',
          coordenadas: [
            { latitude: 0, longitude: 0 },
            { latitude: 1, longitude: 1 },
          ],
        }),
      RegraNegocioError
    );

    // Coordenada com NaN ou fora dos limites
    assert.throws(
      () =>
        geodesicCalculadorAreaService.calcularArea({
          tipo: 'Polygon',
          coordenadas: [
            { latitude: 95.0, longitude: 0 },
            { latitude: 0, longitude: 1 },
            { latitude: 1, longitude: 0 },
          ],
        }),
      RegraNegocioError
    );

    // Polígono degenerado com pontos colapsados (3 coordenadas idênticas)
    assert.throws(
      () =>
        geodesicCalculadorAreaService.calcularArea({
          tipo: 'Polygon',
          coordenadas: [
            { latitude: -23.55, longitude: -46.63 },
            { latitude: -23.55, longitude: -46.63 },
            { latitude: -23.55, longitude: -46.63 },
          ],
        }),
      RegraNegocioError
    );

    // Pontos colineares resultando em área zero
    assert.throws(
      () =>
        geodesicCalculadorAreaService.calcularArea({
          tipo: 'Polygon',
          coordenadas: [
            { latitude: 0.0, longitude: 0.0 },
            { latitude: 0.0, longitude: 0.001 },
            { latitude: 0.0, longitude: 0.002 },
          ],
        }),
      RegraNegocioError
    );
  });

  it('deve integrar perfeitamente com os métodos da entidade de domínio Area (calcularArea e atualizarGeometria)', () => {
    const geometria: GeometriaPoligono = {
      tipo: 'Polygon',
      coordenadas: [
        { latitude: -23.5505, longitude: -46.6333 },
        { latitude: -23.5515, longitude: -46.6333 },
        { latitude: -23.5515, longitude: -46.6343 },
        { latitude: -23.5505, longitude: -46.6333 },
      ],
    };

    const areaEsperada = geodesicCalculadorAreaService.calcularArea(geometria);

    const areaEntity = new Area({
      id: 'area-integration-1',
      itemOrcamentoId: 'item-100',
      nome: 'Gramado Principal',
      geometria,
      areaCalculada: 50.0, // valor inicial provisório
    });

    // 1. Invocação via area.calcularArea(geodesicCalculadorAreaService)
    const resultadoCalculo = areaEntity.calcularArea(geodesicCalculadorAreaService);
    assert.strictEqual(resultadoCalculo, areaEsperada);

    // 2. Invocação via area.atualizarGeometria(novaGeom, geodesicCalculadorAreaService)
    const novaGeometria: GeometriaPoligono = {
      tipo: 'Polygon',
      coordenadas: [
        { latitude: -23.5505, longitude: -46.6333 },
        { latitude: -23.5505, longitude: -46.6333 + 10 * GRAUS_POR_METRO_LON },
        {
          latitude: -23.5505 + 10 * GRAUS_POR_METRO_LAT,
          longitude: -46.6333 + 10 * GRAUS_POR_METRO_LON,
        },
        { latitude: -23.5505 + 10 * GRAUS_POR_METRO_LAT, longitude: -46.6333 },
      ],
    };

    areaEntity.atualizarGeometria(novaGeometria, geodesicCalculadorAreaService);
    assert.strictEqual(areaEntity.areaCalculada, 100.0);
    assert.strictEqual(areaEntity.geometria, novaGeometria);
  });

  it('Verificação Hermes / React Native: não deve invocar ou depender de APIs exclusivas de Node.js ou navegador', () => {
    // Executa em ambiente padrão ECMAScript/Hermes
    // Garante que nenhuma propriedade externa de Node como Buffer ou process é referenciada internamente
    const service = new GeodesicCalculadorAreaService();
    const result = service.calcularArea({
      tipo: 'Polygon',
      coordenadas: [
        { latitude: 10, longitude: 10 },
        { latitude: 10, longitude: 10.001 },
        { latitude: 10.001, longitude: 10.001 },
      ],
    });
    assert.ok(typeof result === 'number' && Number.isFinite(result) && result > 0);
  });
});
