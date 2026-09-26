import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  ItemOrcamento,
  Servico,
  Produto,
  Area,
  TipoItem,
  RegraNegocioError,
} from '../../src/domain';

describe('ItemOrcamento', () => {
  it('RN27: deve criar item de serviço com servicoId e sem produtoId', () => {
    const servico = new Servico({
      id: 'srv-1',
      usuarioId: 'usr-1',
      nome: 'Corte de Grama',
      unidade: 'm²',
      precoBase: 15.0,
      usaMedicaoArea: true,
    });

    const item = ItemOrcamento.criarDeServico('item-1', 'orc-1', servico);

    assert.strictEqual(item.id, 'item-1');
    assert.strictEqual(item.orcamentoId, 'orc-1');
    assert.strictEqual(item.tipo, TipoItem.SERVICO);
    assert.strictEqual(item.servicoId, 'srv-1');
    assert.strictEqual(item.produtoId, null);
    assert.strictEqual(item.descricao, 'Corte de Grama');
    assert.strictEqual(item.unidade, 'm²');
    assert.strictEqual(item.valorUnitario, 15.0);
    assert.strictEqual(item.usaMedicaoArea, true);
    assert.strictEqual(item.quantidade, 0);
    assert.strictEqual(item.valorTotal, 0);
  });

  it('RN27: deve criar item de produto com produtoId e sem servicoId', () => {
    const produto = new Produto({
      id: 'prod-1',
      usuarioId: 'usr-1',
      nome: 'Muda de Palmeira',
      unidade: 'unidade',
      precoBase: 80.0,
    });

    const item = ItemOrcamento.criarDeProduto('item-2', 'orc-1', produto, 5);

    assert.strictEqual(item.id, 'item-2');
    assert.strictEqual(item.orcamentoId, 'orc-1');
    assert.strictEqual(item.tipo, TipoItem.PRODUTO);
    assert.strictEqual(item.servicoId, null);
    assert.strictEqual(item.produtoId, 'prod-1');
    assert.strictEqual(item.descricao, 'Muda de Palmeira');
    assert.strictEqual(item.unidade, 'unidade');
    assert.strictEqual(item.valorUnitario, 80.0);
    assert.strictEqual(item.quantidade, 5);
    assert.strictEqual(item.valorTotal, 400.0);
    assert.strictEqual(item.usaMedicaoArea, false);
  });

  it('RN27: deve rejeitar item simultaneamente associado a serviço e produto (XOR)', () => {
    assert.throws(
      () =>
        new ItemOrcamento({
          id: 'item-inv',
          orcamentoId: 'orc-1',
          tipo: TipoItem.SERVICO,
          servicoId: 'srv-1',
          produtoId: 'prod-1',
          descricao: 'Item inválido',
          quantidade: 1,
          unidade: 'm²',
          valorUnitario: 10,
          usaMedicaoArea: false,
        }),
      RegraNegocioError
    );
  });

  it('RN27: deve rejeitar item sem servicoId e sem produtoId', () => {
    assert.throws(
      () =>
        new ItemOrcamento({
          id: 'item-inv',
          orcamentoId: 'orc-1',
          tipo: TipoItem.SERVICO,
          servicoId: null,
          produtoId: null,
          descricao: 'Item sem referência',
          quantidade: 1,
          unidade: 'm²',
          valorUnitario: 10,
          usaMedicaoArea: false,
        }),
      RegraNegocioError
    );
  });

  it('RN29, RN30, RN31: deve preservar snapshot histórico dos dados do item', () => {
    const servico = new Servico({
      id: 'srv-1',
      usuarioId: 'usr-1',
      nome: 'Poda de Árvore',
      unidade: 'unidade',
      precoBase: 120.0,
      usaMedicaoArea: false,
    });

    const item = ItemOrcamento.criarDeServico('item-1', 'orc-1', servico, 2);

    // Personalização local sem afetar serviço original
    item.personalizarItem({
      descricao: 'Poda de Árvore com remoção de galhos secos',
      valorUnitario: 150.0,
    });

    assert.strictEqual(item.descricao, 'Poda de Árvore com remoção de galhos secos');
    assert.strictEqual(item.valorUnitario, 150.0);
    assert.strictEqual(item.valorTotal, 300.0);
    // Catálogo original permanece intacto
    assert.strictEqual(servico.nome, 'Poda de Árvore');
    assert.strictEqual(servico.precoBase, 120.0);
  });

  it('RN32: deve permitir entrada manual de quantidade para itens não medidos', () => {
    const produto = new Produto({
      id: 'prod-1',
      usuarioId: 'usr-1',
      nome: 'Adubo Orgânico',
      unidade: 'saco',
      precoBase: 35.0,
    });

    const item = ItemOrcamento.criarDeProduto('item-1', 'orc-1', produto, 4);
    assert.strictEqual(item.quantidade, 4);
    assert.strictEqual(item.valorTotal, 140.0);

    item.definirQuantidadeManual(10);
    assert.strictEqual(item.quantidade, 10);
    assert.strictEqual(item.valorTotal, 350.0);
  });

  it('RN34: deve bloquear alteração manual de quantidade para serviço com medição de área', () => {
    const servico = new Servico({
      id: 'srv-1',
      usuarioId: 'usr-1',
      nome: 'Gramado Esmeralda',
      unidade: 'm²',
      precoBase: 25.0,
      usaMedicaoArea: true,
    });

    const item = ItemOrcamento.criarDeServico('item-1', 'orc-1', servico);

    assert.throws(
      () => item.definirQuantidadeManual(100),
      RegraNegocioError
    );
  });

  it('RN45: não deve permitir associar área a item sem medição de área', () => {
    const produto = new Produto({
      id: 'prod-1',
      usuarioId: 'usr-1',
      nome: 'Pedra Branca Decorativa',
      unidade: 'saco',
      precoBase: 50.0,
    });

    const item = ItemOrcamento.criarDeProduto('item-1', 'orc-1', produto, 2);

    const area = new Area({
      id: 'area-1',
      itemOrcamentoId: 'item-1',
      nome: 'Canteiro Central',
      geometria: {
        tipo: 'Polygon',
        coordenadas: [
          { latitude: -23.55, longitude: -46.63 },
          { latitude: -23.56, longitude: -46.63 },
          { latitude: -23.56, longitude: -46.64 },
          { latitude: -23.55, longitude: -46.63 },
        ],
      },
      areaCalculada: 40.0,
    });

    assert.throws(() => item.adicionarArea(area), RegraNegocioError);
  });

  it('RN28: deve exigir identificador de origem válido do catálogo e rejeitar strings vazias', () => {
    assert.throws(
      () =>
        new ItemOrcamento({
          id: 'item-srv-empty',
          orcamentoId: 'orc-1',
          tipo: TipoItem.SERVICO,
          servicoId: '   ',
          descricao: 'Serviço com ID vazio',
          quantidade: 0,
          unidade: 'm²',
          valorUnitario: 10,
          usaMedicaoArea: true,
        }),
      RegraNegocioError
    );

    assert.throws(
      () =>
        new ItemOrcamento({
          id: 'item-prod-empty',
          orcamentoId: 'orc-1',
          tipo: TipoItem.PRODUTO,
          produtoId: '   ',
          descricao: 'Produto com ID vazio',
          quantidade: 1,
          unidade: 'un',
          valorUnitario: 10,
          usaMedicaoArea: false,
        }),
      RegraNegocioError
    );
  });
});
