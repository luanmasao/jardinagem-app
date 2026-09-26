import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  Orcamento,
  ItemOrcamento,
  Servico,
  Produto,
  Area,
  TipoDesconto,
  StatusOrcamento,
  RegraNegocioError,
} from '../../src/domain';

describe('Orcamento - Cálculos e Descontos', () => {
  const geometriaPadrao = {
    tipo: 'Polygon' as const,
    coordenadas: [
      { latitude: 0, longitude: 0 },
      { latitude: 0, longitude: 1 },
      { latitude: 1, longitude: 1 },
      { latitude: 0, longitude: 0 },
    ],
  };

  it('RN23, RN24: orçamento novo sem itens deve iniciar em RASCUNHO com valores zerados', () => {
    const orc = new Orcamento({
      id: 'orc-1',
      usuarioId: 'usr-1',
      clienteId: 'cli-1',
      numero: 'ORC-2026-001',
    });

    assert.strictEqual(orc.status, StatusOrcamento.RASCUNHO);
    assert.strictEqual(orc.editavel, true);
    assert.strictEqual(orc.subtotal, 0);
    assert.strictEqual(orc.valorDesconto, 0);
    assert.strictEqual(orc.total, 0);
    assert.strictEqual(orc.tipoDesconto, null);
    assert.strictEqual(orc.itens.length, 0);
  });

  it('RN48: subtotal deve corresponder à soma dos valores totais de seus itens', () => {
    const orc = new Orcamento({
      id: 'orc-1',
      usuarioId: 'usr-1',
      clienteId: 'cli-1',
      numero: 'ORC-001',
    });

    const servico = new Servico({
      id: 'srv-1',
      usuarioId: 'usr-1',
      nome: 'Manutenção de Jardim',
      unidade: 'hora',
      precoBase: 80.0,
      usaMedicaoArea: false,
    });
    const item1 = ItemOrcamento.criarDeServico('item-1', orc.id, servico, 3); // 240.0

    const produto = new Produto({
      id: 'prod-1',
      usuarioId: 'usr-1',
      nome: 'Fertilizante Mineral',
      unidade: 'kg',
      precoBase: 25.0,
    });
    const item2 = ItemOrcamento.criarDeProduto('item-2', orc.id, produto, 4); // 100.0

    orc.adicionarItem(item1);
    assert.strictEqual(orc.subtotal, 240.0);
    assert.strictEqual(orc.total, 240.0);

    orc.adicionarItem(item2);
    assert.strictEqual(orc.subtotal, 340.0);
    assert.strictEqual(orc.total, 340.0);
  });

  it('RN50, RN51: deve aplicar desconto percentual dentro dos limites [0%, 100%]', () => {
    const orc = new Orcamento({
      id: 'orc-1',
      usuarioId: 'usr-1',
      clienteId: 'cli-1',
      numero: 'ORC-001',
    });

    const produto = new Produto({
      id: 'prod-1',
      usuarioId: 'usr-1',
      nome: 'Vaso de Cerâmica',
      unidade: 'unidade',
      precoBase: 200.0,
    });
    const item = ItemOrcamento.criarDeProduto('item-1', orc.id, produto, 2); // 400.0
    orc.adicionarItem(item);

    // 10% de desconto sobre 400.0 = 40.0 -> total 360.0
    orc.aplicarDesconto(TipoDesconto.PERCENTUAL, 10);
    assert.strictEqual(orc.tipoDesconto, TipoDesconto.PERCENTUAL);
    assert.strictEqual(orc.valorDesconto, 10);
    assert.strictEqual(orc.subtotal, 400.0);
    assert.strictEqual(orc.total, 360.0);

    // 100% de desconto -> total 0
    orc.aplicarDesconto(TipoDesconto.PERCENTUAL, 100);
    assert.strictEqual(orc.total, 0.0);

    // Rejeição de desconto > 100%
    assert.throws(() => orc.aplicarDesconto(TipoDesconto.PERCENTUAL, 100.01), RegraNegocioError);

    // Rejeição de desconto < 0%
    assert.throws(() => orc.aplicarDesconto(TipoDesconto.PERCENTUAL, -5), RegraNegocioError);
  });

  it('RN50, RN52: deve aplicar desconto de valor fixo até o limite do subtotal', () => {
    const orc = new Orcamento({
      id: 'orc-1',
      usuarioId: 'usr-1',
      clienteId: 'cli-1',
      numero: 'ORC-001',
    });

    const produto = new Produto({
      id: 'prod-1',
      usuarioId: 'usr-1',
      nome: 'Terra Adubada',
      unidade: 'saco',
      precoBase: 30.0,
    });
    const item = ItemOrcamento.criarDeProduto('item-1', orc.id, produto, 10); // 300.0
    orc.adicionarItem(item);

    // Desconto fixo de R$ 50,00 -> total 250.0
    orc.aplicarDesconto(TipoDesconto.FIXO, 50.0);
    assert.strictEqual(orc.tipoDesconto, TipoDesconto.FIXO);
    assert.strictEqual(orc.valorDesconto, 50.0);
    assert.strictEqual(orc.total, 250.0);

    // Desconto fixo igual ao subtotal (R$ 300,00) -> total 0.0
    orc.aplicarDesconto(TipoDesconto.FIXO, 300.0);
    assert.strictEqual(orc.total, 0.0);

    // Rejeição de desconto fixo maior que o subtotal (R$ 300,01)
    assert.throws(() => orc.aplicarDesconto(TipoDesconto.FIXO, 300.01), RegraNegocioError);

    // Rejeição de desconto fixo negativo
    assert.throws(() => orc.aplicarDesconto(TipoDesconto.FIXO, -10), RegraNegocioError);
  });

  it('RN53: remover desconto deve resetar tipoDesconto para null e valorDesconto para zero', () => {
    const orc = new Orcamento({
      id: 'orc-1',
      usuarioId: 'usr-1',
      clienteId: 'cli-1',
      numero: 'ORC-001',
    });

    const produto = new Produto({
      id: 'prod-1',
      usuarioId: 'usr-1',
      nome: 'Grama',
      unidade: 'm²',
      precoBase: 20.0,
    });
    orc.adicionarItem(ItemOrcamento.criarDeProduto('item-1', orc.id, produto, 10)); // 200.0

    orc.aplicarDesconto(TipoDesconto.PERCENTUAL, 15);
    assert.strictEqual(orc.total, 170.0);

    orc.removerDesconto();
    assert.strictEqual(orc.tipoDesconto, null);
    assert.strictEqual(orc.valorDesconto, 0);
    assert.strictEqual(orc.total, 200.0);
  });

  it('RN56: adicionar área a item medido deve atualizar automaticamente o total do orçamento', () => {
    const orc = new Orcamento({
      id: 'orc-1',
      usuarioId: 'usr-1',
      clienteId: 'cli-1',
      numero: 'ORC-001',
    });

    const servico = new Servico({
      id: 'srv-1',
      usuarioId: 'usr-1',
      nome: 'Corte de Grama',
      unidade: 'm²',
      precoBase: 12.0,
      usaMedicaoArea: true,
    });

    const itemMedido = ItemOrcamento.criarDeServico('item-1', orc.id, servico);
    orc.adicionarItem(itemMedido);
    assert.strictEqual(orc.subtotal, 0);

    // Adiciona área no item
    itemMedido.adicionarArea(
      new Area({
        id: 'area-1',
        itemOrcamentoId: itemMedido.id,
        geometria: geometriaPadrao,
        areaCalculada: 50.0,
      })
    );

    // Orçamento recalculado
    orc.recalcularValores();
    assert.strictEqual(orc.subtotal, 600.0); // 50 * 12
    assert.strictEqual(orc.total, 600.0);
  });

  it('RN64, RN65: orçamento fora de RASCUNHO não pode ser editado diretamente', () => {
    const orc = new Orcamento({
      id: 'orc-1',
      usuarioId: 'usr-1',
      clienteId: 'cli-1',
      numero: 'ORC-001',
      status: StatusOrcamento.ENVIADO, // Não está em RASCUNHO
    });

    assert.strictEqual(orc.editavel, false);

    const produto = new Produto({
      id: 'prod-1',
      usuarioId: 'usr-1',
      nome: 'Semente',
      unidade: 'pct',
      precoBase: 10,
    });
    const item = ItemOrcamento.criarDeProduto('item-1', orc.id, produto, 1);

    assert.throws(() => orc.adicionarItem(item), RegraNegocioError);
    assert.throws(() => orc.aplicarDesconto(TipoDesconto.PERCENTUAL, 10), RegraNegocioError);
    assert.throws(() => orc.definirValidade(new Date()), RegraNegocioError);
  });
});
