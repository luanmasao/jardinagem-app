import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  Orcamento,
  ItemOrcamento,
  Servico,
  Produto,
  Area,
  ValidacaoEnvioError,
} from '../../src/domain';

describe('Orcamento - Validação para Envio (RN58, RN59, RN60)', () => {
  const geometriaValida = {
    tipo: 'Polygon' as const,
    coordenadas: [
      { latitude: -23.55, longitude: -46.63 },
      { latitude: -23.56, longitude: -46.63 },
      { latitude: -23.56, longitude: -46.64 },
      { latitude: -23.55, longitude: -46.63 },
    ],
  };

  it('RN59: deve reprovar envio quando orçamento não possui itens', () => {
    const orc = new Orcamento({
      id: 'orc-1',
      usuarioId: 'usr-1',
      clienteId: 'cli-1',
      numero: 'ORC-001',
      dataValidade: new Date(Date.now() + 86400000 * 15), // +15 dias
    });

    assert.strictEqual(orc.validarParaEnvio(), false);
    const erros = orc.obterErrosValidacaoEnvio();
    assert.ok(erros.some((e) => e.includes('pelo menos um item')));
    assert.throws(() => orc.enviar(), ValidacaoEnvioError);
  });

  it('RN59: deve reprovar envio quando orçamento não possui data de validade', () => {
    const orc = new Orcamento({
      id: 'orc-1',
      usuarioId: 'usr-1',
      clienteId: 'cli-1',
      numero: 'ORC-001',
      dataValidade: null,
    });

    const produto = new Produto({
      id: 'prod-1',
      usuarioId: 'usr-1',
      nome: 'Mudas',
      unidade: 'un',
      precoBase: 10,
    });
    orc.adicionarItem(ItemOrcamento.criarDeProduto('item-1', orc.id, produto, 5));

    assert.strictEqual(orc.validarParaEnvio(), false);
    const erros = orc.obterErrosValidacaoEnvio();
    assert.ok(erros.some((e) => e.includes('data de validade')));
  });

  it('RN46, RN59: deve reprovar envio quando serviço medido não possui áreas delimitadas', () => {
    const orc = new Orcamento({
      id: 'orc-1',
      usuarioId: 'usr-1',
      clienteId: 'cli-1',
      numero: 'ORC-001',
      dataValidade: new Date(Date.now() + 86400000 * 10),
    });

    const servico = new Servico({
      id: 'srv-1',
      usuarioId: 'usr-1',
      nome: 'Corte de Grama',
      unidade: 'm²',
      precoBase: 15.0,
      usaMedicaoArea: true,
    });

    // Item criado mas ainda sem áreas (permitido apenas em RASCUNHO, RN46)
    const itemMedido = ItemOrcamento.criarDeServico('item-1', orc.id, servico);
    orc.adicionarItem(itemMedido);

    assert.strictEqual(orc.validarParaEnvio(), false);
    const erros = orc.obterErrosValidacaoEnvio();
    assert.ok(erros.some((e) => e.includes('não possui áreas delimitadas')));
    assert.throws(() => orc.enviar(), ValidacaoEnvioError);
  });

  it('RN58, RN59: deve aprovar envio quando todos os requisitos estão atendidos', () => {
    const orc = new Orcamento({
      id: 'orc-1',
      usuarioId: 'usr-1',
      clienteId: 'cli-1',
      numero: 'ORC-001',
      dataValidade: new Date(Date.now() + 86400000 * 15),
    });

    const servico = new Servico({
      id: 'srv-1',
      usuarioId: 'usr-1',
      nome: 'Gramado',
      unidade: 'm²',
      precoBase: 20.0,
      usaMedicaoArea: true,
    });
    const itemMedido = ItemOrcamento.criarDeServico('item-1', orc.id, servico);
    itemMedido.adicionarArea(
      new Area({
        id: 'area-1',
        itemOrcamentoId: itemMedido.id,
        geometria: geometriaValida,
        areaCalculada: 50.0,
      })
    );
    orc.adicionarItem(itemMedido);

    assert.strictEqual(orc.validarParaEnvio(), true);
    assert.strictEqual(orc.obterErrosValidacaoEnvio().length, 0);

    // Deve transitar para ENVIADO com sucesso
    orc.enviar();
    assert.strictEqual(orc.status, 'ENVIADO');
    assert.strictEqual(orc.editavel, false);
  });
});
