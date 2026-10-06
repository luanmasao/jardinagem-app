import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  dominioParaGeoJson,
  geoJsonParaDominio,
  mapAreaRow,
  GeoJsonPolygon,
} from '../../src/infrastructure/mappers/area-geojson.mapper';
import { GeometriaPoligono } from '../../src/domain/types/geometria';
import { RegraNegocioError } from '../../src/domain/errors/dominio-error';
import { Area } from '../../src/domain/entities/area';

describe('AreaGeoJsonMapper — GAP-AREA-04 / DECISÃO-AREA-02', () => {
  // Coordenadas reais e fortemente assimétricas (evita falsos positivos por lat == lon)
  // Jardim da Luz, São Paulo: Lat ~ -23.5350, Lon ~ -46.6340
  const latA = -23.535012;
  const lonA = -46.634055;
  const latB = -23.536120;
  const lonB = -46.633110;
  const latC = -23.537250;
  const lonC = -46.635890;

  const poligonoDominioImplicito: GeometriaPoligono = {
    tipo: 'Polygon',
    coordenadas: [
      { latitude: latA, longitude: lonA },
      { latitude: latB, longitude: lonB },
      { latitude: latC, longitude: lonC },
    ],
  };

  const poligonoDominioExplicito: GeometriaPoligono = {
    tipo: 'Polygon',
    coordenadas: [
      { latitude: latA, longitude: lonA },
      { latitude: latB, longitude: lonB },
      { latitude: latC, longitude: lonC },
      { latitude: latA, longitude: lonA }, // Fechado
    ],
  };

  describe('1. Conversão Domain → GeoJSON (dominioParaGeoJson)', () => {
    it('deve converter polígono com fechamento implícito [A, B, C] em GeoJSON RFC 7946 explicitamente fechado [A, B, C, A]', () => {
      const geojson = dominioParaGeoJson(poligonoDominioImplicito);

      assert.strictEqual(geojson.type, 'Polygon');
      assert.strictEqual(geojson.coordinates.length, 1);

      const ring = geojson.coordinates[0];
      assert.strictEqual(ring.length, 4, 'LinearRing deve conter 4 posições');

      // Verifica estritamente a ordem [longitude, latitude]
      assert.strictEqual(ring[0][0], lonA, 'Primeiro ponto X deve ser longitude');
      assert.strictEqual(ring[0][1], latA, 'Primeiro ponto Y deve ser latitude');
      assert.strictEqual(ring[1][0], lonB);
      assert.strictEqual(ring[1][1], latB);
      assert.strictEqual(ring[2][0], lonC);
      assert.strictEqual(ring[2][1], latC);

      // Fechamento explícito: quarto ponto igual ao primeiro
      assert.strictEqual(ring[3][0], lonA, 'Último ponto deve fechar no primeiro (lon)');
      assert.strictEqual(ring[3][1], latA, 'Último ponto deve fechar no primeiro (lat)');
    });

    it('deve converter polígono já explicitamente fechado [A, B, C, A] sem duplicar o anel além de 4 posições', () => {
      const geojson = dominioParaGeoJson(poligonoDominioExplicito);

      assert.strictEqual(geojson.type, 'Polygon');
      const ring = geojson.coordinates[0];
      assert.strictEqual(ring.length, 4, 'Não deve adicionar repetições extras');
      assert.strictEqual(ring[0][0], lonA);
      assert.strictEqual(ring[0][1], latA);
      assert.strictEqual(ring[3][0], lonA);
      assert.strictEqual(ring[3][1], latA);
    });

    it('deve validar assimetria estrita de latitude e longitude (garantir que não foram invertidos)', () => {
      const geojson = dominioParaGeoJson(poligonoDominioImplicito);
      const ring = geojson.coordinates[0];

      // Verificação específica: longitude é negativa ~ -46, latitude é negativa ~ -23
      assert.ok(ring[0][0] < -40 && ring[0][0] > -50, 'X deve estar na faixa de longitude (-46)');
      assert.ok(ring[0][1] < -20 && ring[0][1] > -30, 'Y deve estar na faixa de latitude (-23)');
      assert.notStrictEqual(ring[0][0], ring[0][1]);
    });

    it('deve rejeitar geometria inválida ou com menos de 3 vértices', () => {
      assert.throws(
        () =>
          dominioParaGeoJson({
            tipo: 'Polygon',
            coordenadas: [
              { latitude: 10, longitude: 20 },
              { latitude: 11, longitude: 21 },
            ],
          }),
        RegraNegocioError
      );

      assert.throws(() => dominioParaGeoJson(null as any), RegraNegocioError);
    });
  });

  describe('2. Conversão GeoJSON → Domain (geoJsonParaDominio)', () => {
    it('deve converter objeto GeoJSON fechado para GeometriaPoligono com vértices únicos do domínio', () => {
      const geojson: GeoJsonPolygon = {
        type: 'Polygon',
        coordinates: [
          [
            [lonA, latA],
            [lonB, latB],
            [lonC, latC],
            [lonA, latA],
          ],
        ],
      };

      const dominio = geoJsonParaDominio(geojson);

      assert.strictEqual(dominio.tipo, 'Polygon');
      assert.strictEqual(dominio.coordenadas.length, 3, 'Domínio recebe vértices limpos');

      assert.strictEqual(dominio.coordenadas[0].latitude, latA);
      assert.strictEqual(dominio.coordenadas[0].longitude, lonA);
      assert.strictEqual(dominio.coordenadas[1].latitude, latB);
      assert.strictEqual(dominio.coordenadas[1].longitude, lonB);
      assert.strictEqual(dominio.coordenadas[2].latitude, latC);
      assert.strictEqual(dominio.coordenadas[2].longitude, lonC);
    });

    it('deve aceitar string JSON serializada com GeoJSON', () => {
      const jsonString = JSON.stringify({
        type: 'Polygon',
        coordinates: [
          [
            [lonA, latA],
            [lonB, latB],
            [lonC, latC],
            [lonA, latA],
          ],
        ],
      });

      const dominio = geoJsonParaDominio(jsonString);
      assert.strictEqual(dominio.tipo, 'Polygon');
      assert.strictEqual(dominio.coordenadas.length, 3);
      assert.strictEqual(dominio.coordenadas[0].latitude, latA);
      assert.strictEqual(dominio.coordenadas[0].longitude, lonA);
    });

    it('deve suportar fallback de WKT: POLYGON((lon lat, ...))', () => {
      const wkt = `POLYGON((${lonA} ${latA}, ${lonB} ${latB}, ${lonC} ${latC}, ${lonA} ${latA}))`;
      const dominio = geoJsonParaDominio(wkt);

      assert.strictEqual(dominio.tipo, 'Polygon');
      assert.strictEqual(dominio.coordenadas.length, 3);
      assert.strictEqual(dominio.coordenadas[0].latitude, latA);
      assert.strictEqual(dominio.coordenadas[0].longitude, lonA);
    });

    it('deve rejeitar GeoJSON sem fechamento ou com menos de 4 posições no anel', () => {
      const geojsonInvalido = {
        type: 'Polygon',
        coordinates: [
          [
            [lonA, latA],
            [lonB, latB],
            [lonC, latC],
          ],
        ],
      };

      assert.throws(() => geoJsonParaDominio(geojsonInvalido), RegraNegocioError);
    });

    it('deve rejeitar GeoJSON de tipo incompatível (ex: Point ou LineString)', () => {
      const point = {
        type: 'Point',
        coordinates: [lonA, latA],
      };

      assert.throws(() => geoJsonParaDominio(point), RegraNegocioError);
    });

    it('deve rejeitar posições não-numéricas no GeoJSON', () => {
      const corrupto = {
        type: 'Polygon',
        coordinates: [
          [
            ['invalido', latA],
            [lonB, latB],
            [lonC, latC],
            ['invalido', latA],
          ],
        ],
      };

      assert.throws(() => geoJsonParaDominio(corrupto), RegraNegocioError);
    });
  });

  describe('3. Round-Trip e Preservação Semântica (Domain → GeoJSON → Domain)', () => {
    it('deve preservar fielmente os vértices e coordenadas em ciclo completo', () => {
      const original = poligonoDominioImplicito;

      const geojson = dominioParaGeoJson(original);
      const reconstruido = geoJsonParaDominio(geojson);

      assert.strictEqual(reconstruido.tipo, original.tipo);
      assert.strictEqual(reconstruido.coordenadas.length, original.coordenadas.length);

      for (let i = 0; i < original.coordenadas.length; i++) {
        assert.strictEqual(reconstruido.coordenadas[i].latitude, original.coordenadas[i].latitude);
        assert.strictEqual(reconstruido.coordenadas[i].longitude, original.coordenadas[i].longitude);
      }
    });

    it('deve preservar coordenadas em ciclo completo a partir de polígono com fechamento explícito', () => {
      const original = poligonoDominioExplicito;

      const geojson = dominioParaGeoJson(original);
      const reconstruido = geoJsonParaDominio(geojson);

      // Reconstruído tem 3 vértices normalizados
      assert.strictEqual(reconstruido.coordenadas.length, 3);
      assert.strictEqual(reconstruido.coordenadas[0].latitude, latA);
      assert.strictEqual(reconstruido.coordenadas[1].latitude, latB);
      assert.strictEqual(reconstruido.coordenadas[2].latitude, latC);
    });
  });

  describe('4. Mapeamento de Linha do Banco (mapAreaRow)', () => {
    it('deve instanciar corretamente a entidade Area a partir do registro do banco de dados', () => {
      const row = {
        id: '99999999-9999-9999-9999-999999999999',
        item_orcamento_id: '88888888-8888-8888-8888-888888888888',
        nome: 'Gramado Principal',
        geometria: {
          type: 'Polygon',
          coordinates: [
            [
              [lonA, latA],
              [lonB, latB],
              [lonC, latC],
              [lonA, latA],
            ],
          ],
        },
        area_calculada: '142.50',
        unidade: 'm²',
        observacoes: 'Área com declive suave',
      };

      const area = mapAreaRow(row);

      assert.ok(area instanceof Area);
      assert.strictEqual(area.id, '99999999-9999-9999-9999-999999999999');
      assert.strictEqual(area.itemOrcamentoId, '88888888-8888-8888-8888-888888888888');
      assert.strictEqual(area.nome, 'Gramado Principal');
      assert.strictEqual(area.areaCalculada, 142.5);
      assert.strictEqual(area.unidade, 'm²');
      assert.strictEqual(area.observacoes, 'Área com declive suave');
      assert.strictEqual(area.geometria.coordenadas.length, 3);
      assert.strictEqual(area.geometria.coordenadas[0].latitude, latA);
      assert.strictEqual(area.geometria.coordenadas[0].longitude, lonA);
    });

    it('deve tratar campos opcionais nulos (nome, observações) com unidade padrão m²', () => {
      const row = {
        id: '11111111-1111-1111-1111-111111111111',
        item_orcamento_id: '22222222-2222-2222-2222-222222222222',
        nome: null,
        geometria: {
          type: 'Polygon',
          coordinates: [
            [
              [lonA, latA],
              [lonB, latB],
              [lonC, latC],
              [lonA, latA],
            ],
          ],
        },
        area_calculada: 50,
        unidade: null,
        observacoes: null,
      };

      const area = mapAreaRow(row);

      assert.strictEqual(area.nome, null);
      assert.strictEqual(area.unidade, 'm²');
      assert.strictEqual(area.observacoes, null);
      assert.strictEqual(area.areaCalculada, 50);
    });

    it('deve lançar erro se row for nulo', () => {
      assert.throws(() => mapAreaRow(null), Error);
    });
  });
});
