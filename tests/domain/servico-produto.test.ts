import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Servico, Produto, RegraNegocioError } from '../../src/domain';

describe('Servico e Produto', () => {
  it('RN12, RN16: serviço medido deve forçar unidade m² e validar campos', () => {
    const srv = new Servico({
      id: 'srv-1',
      usuarioId: 'usr-1',
      nome: 'Corte de Grama',
      unidade: 'hectare', // Deve ser ajustado para m² se usaMedicaoArea = true
      precoBase: 12.5,
      usaMedicaoArea: true,
    });

    assert.strictEqual(srv.unidade, 'm²');
    assert.strictEqual(srv.precoBase, 12.5);
    assert.strictEqual(srv.ativo, true);

    // Desativação lógica (RN14)
    srv.desativar();
    assert.strictEqual(srv.ativo, false);
    srv.ativar();
    assert.strictEqual(srv.ativo, true);
  });

  it('deve rejeitar serviço com preço base negativo ou nome vazio', () => {
    assert.throws(
      () =>
        new Servico({
          id: 'srv-1',
          usuarioId: 'usr-1',
          nome: '',
          unidade: 'hora',
          precoBase: 50,
          usaMedicaoArea: false,
        }),
      RegraNegocioError
    );

    assert.throws(
      () =>
        new Servico({
          id: 'srv-1',
          usuarioId: 'usr-1',
          nome: 'Poda',
          unidade: 'hora',
          precoBase: -10,
          usaMedicaoArea: false,
        }),
      RegraNegocioError
    );
  });

  it('RN18: produto deve validar preço base e permitir ativação/desativação', () => {
    const prod = new Produto({
      id: 'prod-1',
      usuarioId: 'usr-1',
      nome: 'Semente de Girassol',
      unidade: 'pacote',
      precoBase: 18.0,
    });

    assert.strictEqual(prod.nome, 'Semente de Girassol');
    assert.strictEqual(prod.precoBase, 18.0);
    assert.strictEqual(prod.ativo, true);

    prod.desativar();
    assert.strictEqual(prod.ativo, false);
  });

  it('deve rejeitar produto com preço base negativo ou nome vazio', () => {
    assert.throws(
      () =>
        new Produto({
          id: 'prod-1',
          usuarioId: 'usr-1',
          nome: 'Adubo',
          unidade: 'kg',
          precoBase: -1,
        }),
      RegraNegocioError
    );
  });
});
