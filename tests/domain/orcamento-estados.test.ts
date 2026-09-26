import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  Orcamento,
  ItemOrcamento,
  Produto,
  StatusOrcamento,
  TransicaoInvalidaError,
} from '../../src/domain';

describe('Orcamento - Máquina de Estados e Ciclo de Vida (RN61, RN62, RN63, RN71)', () => {
  function criarOrcamentoValidoParaEnvio(): Orcamento {
    const orc = new Orcamento({
      id: 'orc-1',
      usuarioId: 'usr-1',
      clienteId: 'cli-1',
      numero: 'ORC-001',
      dataCriacao: new Date('2026-03-01T10:00:00Z'),
      dataValidade: new Date('2026-03-15T23:59:59Z'),
    });

    const produto = new Produto({
      id: 'prod-1',
      usuarioId: 'usr-1',
      nome: 'Grama',
      unidade: 'm²',
      precoBase: 15.0,
    });
    orc.adicionarItem(ItemOrcamento.criarDeProduto('item-1', orc.id, produto, 20));
    return orc;
  }

  it('RN63: fluxo completo de aprovação: RASCUNHO -> ENVIADO -> EM_ANALISE -> APROVADO -> CONCLUIDO', () => {
    const orc = criarOrcamentoValidoParaEnvio();
    assert.strictEqual(orc.status, StatusOrcamento.RASCUNHO);

    orc.enviar();
    assert.strictEqual(orc.status, StatusOrcamento.ENVIADO);

    orc.iniciarAnalise();
    assert.strictEqual(orc.status, StatusOrcamento.EM_ANALISE);

    orc.aprovar();
    assert.strictEqual(orc.status, StatusOrcamento.APROVADO);

    orc.concluir();
    assert.strictEqual(orc.status, StatusOrcamento.CONCLUIDO);
  });

  it('RN63: fluxo de recusa: RASCUNHO -> ENVIADO -> EM_ANALISE -> RECUSADO', () => {
    const orc = criarOrcamentoValidoParaEnvio();
    orc.enviar();
    orc.iniciarAnalise();
    orc.recusar();
    assert.strictEqual(orc.status, StatusOrcamento.RECUSADO);
  });

  it('RN63: cancelamento a partir de RASCUNHO, ENVIADO e EM_ANALISE', () => {
    // A partir de RASCUNHO
    const orc1 = criarOrcamentoValidoParaEnvio();
    orc1.cancelar();
    assert.strictEqual(orc1.status, StatusOrcamento.CANCELADO);

    // A partir de ENVIADO
    const orc2 = criarOrcamentoValidoParaEnvio();
    orc2.enviar();
    orc2.cancelar();
    assert.strictEqual(orc2.status, StatusOrcamento.CANCELADO);

    // A partir de EM_ANALISE
    const orc3 = criarOrcamentoValidoParaEnvio();
    orc3.enviar();
    orc3.iniciarAnalise();
    orc3.cancelar();
    assert.strictEqual(orc3.status, StatusOrcamento.CANCELADO);
  });

  it('RN69, RN70: expiração por data de validade', () => {
    const orc = criarOrcamentoValidoParaEnvio();
    // Validade: 15/03/2026

    // RASCUNHO não expira (RN70)
    orc.verificarExpiracao(new Date('2026-03-20T10:00:00Z'));
    assert.strictEqual(orc.status, StatusOrcamento.RASCUNHO);

    orc.enviar();

    // Data antes da validade -> permanece ENVIADO
    orc.verificarExpiracao(new Date('2026-03-10T10:00:00Z'));
    assert.strictEqual(orc.status, StatusOrcamento.ENVIADO);

    // Data após a validade -> EXPIRADO (RN69)
    orc.verificarExpiracao(new Date('2026-03-16T10:00:00Z'));
    assert.strictEqual(orc.status, StatusOrcamento.EXPIRADO);
  });

  it('RN62, RN71: deve bloquear transições proibidas e reabertura de orçamentos finalizados', () => {
    const orc = criarOrcamentoValidoParaEnvio();

    // RASCUNHO não pode ir direto para APROVADO
    assert.throws(() => orc.aprovar(), TransicaoInvalidaError);

    // RASCUNHO não pode ir direto para CONCLUIDO
    assert.throws(() => orc.concluir(), TransicaoInvalidaError);

    // Conclui o orçamento
    orc.enviar();
    orc.iniciarAnalise();
    orc.aprovar();
    orc.concluir();

    // Orçamento CONCLUIDO não pode ser reaberto ou alterado para outro estado (RN71)
    assert.throws(() => orc.enviar(), TransicaoInvalidaError);
    assert.throws(() => orc.aprovar(), TransicaoInvalidaError);
    assert.throws(() => orc.cancelar(), TransicaoInvalidaError);
  });
});
