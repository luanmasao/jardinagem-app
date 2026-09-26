import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  Orcamento,
  ItemOrcamento,
  Servico,
  Produto,
  Area,
  StatusOrcamento,
  TipoDesconto,
} from '../../src/domain';

describe('Orcamento - Duplicação (RN72, RN73, RN74, RN75, RN77)', () => {
  const geometria = {
    tipo: 'Polygon' as const,
    coordenadas: [
      { latitude: 0, longitude: 0 },
      { latitude: 0, longitude: 1 },
      { latitude: 1, longitude: 1 },
      { latitude: 0, longitude: 0 },
    ],
  };

  it('deve duplicar orçamento preservando dados essenciais mas em novo estado RASCUNHO independente', () => {
    const orcOriginal = new Orcamento({
      id: 'orc-orig',
      usuarioId: 'usr-1',
      clienteId: 'cli-1',
      numero: 'ORC-2026-001',
      dataCriacao: new Date('2026-03-20T10:00:00Z'),
      dataValidade: new Date('2026-04-01T23:59:59Z'),
      observacoes: 'Cliente prefere execução aos sábados',
      condicoesPagamento: 'Entrada 50% + 50% no término',
    });

    const servico = new Servico({
      id: 'srv-1',
      usuarioId: 'usr-1',
      nome: 'Plantio de Grama',
      unidade: 'm²',
      precoBase: 25.0,
      usaMedicaoArea: true,
    });
    const itemMedido = ItemOrcamento.criarDeServico('item-orig-1', orcOriginal.id, servico);
    itemMedido.adicionarArea(
      new Area({
        id: 'area-orig-1',
        itemOrcamentoId: itemMedido.id,
        nome: 'Jardim dos Fundos',
        geometria,
        areaCalculada: 40.0,
      })
    );
    orcOriginal.adicionarItem(itemMedido);

    const produto = new Produto({
      id: 'prod-1',
      usuarioId: 'usr-1',
      nome: 'Adubo Especial',
      unidade: 'saco',
      precoBase: 30.0,
    });
    orcOriginal.adicionarItem(ItemOrcamento.criarDeProduto('item-orig-2', orcOriginal.id, produto, 3));

    orcOriginal.aplicarDesconto(TipoDesconto.FIXO, 50.0);

    // Conclui/aprova o orçamento original
    orcOriginal.enviar();
    orcOriginal.iniciarAnalise();
    orcOriginal.aprovar();
    assert.strictEqual(orcOriginal.status, StatusOrcamento.APROVADO);
    assert.strictEqual(orcOriginal.editavel, false);

    // Duplica o orçamento para nova proposta (RN77)
    let itemCounter = 1;
    let areaCounter = 1;
    const orcDuplicado = orcOriginal.duplicar(
      'orc-novo-2',
      'ORC-2026-002',
      () => `item-dup-${itemCounter++}`,
      () => `area-dup-${areaCounter++}`,
      new Date('2026-04-05')
    );

    // Verificações do novo orçamento
    assert.strictEqual(orcDuplicado.id, 'orc-novo-2');
    assert.strictEqual(orcDuplicado.numero, 'ORC-2026-002');
    assert.strictEqual(orcDuplicado.status, StatusOrcamento.RASCUNHO); // RN73
    assert.strictEqual(orcDuplicado.editavel, true);
    assert.strictEqual(orcDuplicado.usuarioId, 'usr-1');
    assert.strictEqual(orcDuplicado.clienteId, 'cli-1');
    assert.strictEqual(orcDuplicado.observacoes, 'Cliente prefere execução aos sábados');
    assert.strictEqual(orcDuplicado.condicoesPagamento, 'Entrada 50% + 50% no término');
    assert.strictEqual(orcDuplicado.itens.length, 2);

    // Itens e áreas têm IDs novos
    assert.strictEqual(orcDuplicado.itens[0].id, 'item-dup-1');
    assert.strictEqual(orcDuplicado.itens[0].orcamentoId, 'orc-novo-2');
    assert.strictEqual(orcDuplicado.itens[0].areas[0].id, 'area-dup-1');
    assert.strictEqual(orcDuplicado.itens[0].areas[0].itemOrcamentoId, 'item-dup-1');

    // Totais preservados
    assert.strictEqual(orcDuplicado.subtotal, orcOriginal.subtotal);
    assert.strictEqual(orcDuplicado.total, orcOriginal.total);

    // RN75: alteração no duplicado não afeta o original
    orcDuplicado.adicionarItem(ItemOrcamento.criarDeProduto('item-dup-3', orcDuplicado.id, produto, 2));
    assert.strictEqual(orcDuplicado.itens.length, 3);
    assert.strictEqual(orcOriginal.itens.length, 2);
    assert.notStrictEqual(orcDuplicado.subtotal, orcOriginal.subtotal);
  });
});
