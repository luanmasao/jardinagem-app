import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Orcamento } from '../../src/domain/entities/orcamento';
import { ItemOrcamento } from '../../src/domain/entities/item-orcamento';
import { Cliente } from '../../src/domain/entities/cliente';
import { Usuario } from '../../src/domain/entities/usuario';
import { TipoItem } from '../../src/domain/enums/tipo-item';
import { TipoDesconto } from '../../src/domain/enums/tipo-desconto';
import { OrcamentoPdfMapper } from '../../src/application/mappers/orcamento-pdf.mapper';

describe('Bloco B — Consistência Matemática e Transporte Sem Perda (RN80, RNF32)', () => {
  const cliente = new Cliente({
    id: 'cli-mat',
    usuarioId: 'usr-1',
    nome: 'Cliente Validação Matemática',
  });

  const prestador = new Usuario({
    id: 'usr-1',
    nome: 'Prestador Alpha',
  });

  it('1. Deve transportar valores monetários com precisão exata de centavos', () => {
    // Caso com centavos fracionários reais: 3 itens com dízimas / centavos variados
    const item1 = new ItemOrcamento({
      id: 'i1',
      orcamentoId: 'orc-mat-1',
      tipo: TipoItem.SERVICO,
      servicoId: 'srv-1',
      descricao: 'Serviço com Centavos',
      quantidade: 3.33,
      unidade: 'm²',
      valorUnitario: 12.37, // 3.33 * 12.37 = 41.1921 -> arredondado no domínio para 41.19
      usaMedicaoArea: false,
    });

    const item2 = new ItemOrcamento({
      id: 'i2',
      orcamentoId: 'orc-mat-1',
      tipo: TipoItem.PRODUTO,
      produtoId: 'prd-1',
      descricao: 'Produto com Centavos',
      quantidade: 7,
      unidade: 'un',
      valorUnitario: 8.99, // 7 * 8.99 = 62.93
      usaMedicaoArea: false,
    });

    // Subtotal esperado: 41.19 + 62.93 = 104.12
    const orcamento = new Orcamento({
      id: 'orc-mat-1',
      usuarioId: 'usr-1',
      clienteId: 'cli-mat',
      numero: 'ORC-MAT-01',
      itens: [item1, item2],
    });

    // Verificação da autoridade do domínio
    assert.strictEqual(orcamento.subtotal, 104.12);
    assert.strictEqual(orcamento.total, 104.12);

    // Mapeamento para o modelo de PDF
    const modelo = OrcamentoPdfMapper.paraModelo(orcamento, cliente, prestador);

    // Verificação de transporte exato (nenhum centavo alterado)
    assert.strictEqual(modelo.itens[0].valorTotalFormatado, 'R$ 41,19');
    assert.strictEqual(modelo.itens[1].valorTotalFormatado, 'R$ 62,93');
    assert.strictEqual(modelo.subtotalFormatado, 'R$ 104,12');
    assert.strictEqual(modelo.totalFormatado, 'R$ 104,12');
  });

  it('2. Deve transportar desconto percentual sem divergência de centavos', () => {
    // Subtotal = 1.250,50, Desconto 10% = 125,05, Total = 1.125,45
    const item = new ItemOrcamento({
      id: 'i-desc',
      orcamentoId: 'orc-mat-desc',
      tipo: TipoItem.SERVICO,
      servicoId: 'srv-1',
      descricao: 'Serviço Base',
      quantidade: 1,
      unidade: 'un',
      valorUnitario: 1250.5,
      usaMedicaoArea: false,
    });

    const orcamento = new Orcamento({
      id: 'orc-mat-desc',
      usuarioId: 'usr-1',
      clienteId: 'cli-mat',
      numero: 'ORC-MAT-02',
      tipoDesconto: TipoDesconto.PERCENTUAL,
      valorDesconto: 10,
      itens: [item],
    });

    assert.strictEqual(orcamento.subtotal, 1250.5);
    assert.strictEqual(orcamento.valorDesconto, 10);
    assert.strictEqual(orcamento.total, 1125.45);

    const modelo = OrcamentoPdfMapper.paraModelo(orcamento, cliente, prestador);

    assert.strictEqual(modelo.subtotalFormatado, 'R$ 1.250,50');
    assert.strictEqual(modelo.valorDescontoFormatado, '- R$ 125,05');
    assert.strictEqual(modelo.totalFormatado, 'R$ 1.125,45');
  });

  it('3. Deve assegurar que o mapper não recalcula e apenas transporta os valores validados', () => {
    const item = new ItemOrcamento({
      id: 'i-prop',
      orcamentoId: 'orc-transporte',
      tipo: TipoItem.SERVICO,
      servicoId: 'srv-1',
      descricao: 'Item Transporte',
      quantidade: 5,
      unidade: 'h',
      valorUnitario: 200,
      usaMedicaoArea: false,
    });

    const orcamento = new Orcamento({
      id: 'orc-transporte',
      usuarioId: 'usr-1',
      clienteId: 'cli-mat',
      numero: 'ORC-MAT-03',
      itens: [item],
    });

    const modelo = OrcamentoPdfMapper.paraModelo(orcamento, cliente, prestador);

    // O texto formatado reflete exatamente os números do agregado
    assert.strictEqual(
      modelo.subtotalFormatado.replace(/\s/g, ''),
      'R$1.000,00'
    );
    assert.strictEqual(
      modelo.totalFormatado.replace(/\s/g, ''),
      'R$1.000,00'
    );
  });
});
