import { describe, it } from 'node:test';
import assert from 'node:assert';
import { gerarOrcamentoHtml } from '../../src/infrastructure/templates/pdf/orcamento-html.template';
import { OrcamentoPdfModel } from '../../src/application/interfaces/pdf-generator.interface';

describe('Bloco B — ExpoPrint Template & Infrastructure Unit Tests', () => {
  const modeloValido: OrcamentoPdfModel = {
    id: 'orc-123',
    numero: 'ORC-2026-042',
    dataCriacaoFormatada: '03/10/2026',
    dataValidadeFormatada: '18/10/2026',
    statusBadge: 'Aprovado',
    prestador: {
      nome: 'Jardinagem Verdejante Ltda',
      telefoneFormatado: '(11) 98765-4321',
    },
    cliente: {
      nome: 'Condomínio Residencial Parque dos Pássaros',
      telefoneFormatado: '(11) 3333-4444',
      email: 'sindico@parquepassaros.com.br',
      documentoFormatado: '12.345.678/0001-90',
      enderecoFormatado: 'Av. das Nações Unidas, 1000, Bloco 1, Pinheiros, São Paulo - SP, CEP: 05425-070',
    },
    itens: [
      {
        numeroItem: 1,
        tipoDescricao: 'Serviço',
        descricao: 'Plantio e Nivelamento de Gramado Esmeralda',
        quantidadeFormatada: '250,00',
        unidade: 'm²',
        valorUnitarioFormatado: 'R$ 20,00',
        valorTotalFormatado: 'R$ 5.000,00',
        usaMedicaoArea: true,
        areas: [
          {
            id: 'area-1',
            nome: 'Talude Sul',
            areaCalculadaFormatada: '150,00 m²',
          },
          {
            id: 'area-2',
            nome: 'Praça Central',
            areaCalculadaFormatada: '100,00 m²',
          },
        ],
      },
      {
        numeroItem: 2,
        tipoDescricao: 'Produto',
        descricao: 'Substrato Adubado Orgânico (Sacos 25kg)',
        quantidadeFormatada: '20,00',
        unidade: 'un',
        valorUnitarioFormatado: 'R$ 35,00',
        valorTotalFormatado: 'R$ 700,00',
        usaMedicaoArea: false,
        areas: [],
      },
    ],
    subtotalFormatado: 'R$ 5.700,00',
    temDesconto: true,
    descricaoDesconto: 'Desconto (5%):',
    valorDescontoFormatado: '- R$ 285,00',
    totalFormatado: 'R$ 5.415,00',
    observacoes: 'Serviço com garantia de 90 dias após o pegamento das placas.',
    condicoesPagamento: 'Entrada de 50% no início e 50% após vistoria de conclusão.',
  };

  it('1. Deve gerar HTML estruturalmente válido e semântico', () => {
    const html = gerarOrcamentoHtml(modeloValido);

    assert.ok(html.startsWith('<!DOCTYPE html>'));
    assert.ok(html.includes('<html lang="pt-BR">'));
    assert.ok(html.includes('<head>'));
    assert.ok(html.includes('</head>'));
    assert.ok(html.includes('<body>'));
    assert.ok(html.includes('</body>'));
    assert.ok(html.endsWith('</html>'));
  });

  it('2. Deve conter identificação do orçamento em destaque (RNF33)', () => {
    const html = gerarOrcamentoHtml(modeloValido);

    assert.ok(html.includes('Orçamento ORC-2026-042'));
    assert.ok(html.includes('proposta-numero'));
    assert.ok(html.includes('03/10/2026'));
    assert.ok(html.includes('18/10/2026'));
    assert.ok(html.includes('Aprovado'));
  });

  it('3. Deve conter identificação do prestador e do cliente (RF80/RN79)', () => {
    const html = gerarOrcamentoHtml(modeloValido);

    assert.ok(html.includes('Jardinagem Verdejante Ltda'));
    assert.ok(html.includes('(11) 98765-4321'));
    assert.ok(html.includes('Condomínio Residencial Parque dos Pássaros'));
    assert.ok(html.includes('12.345.678/0001-90'));
    assert.ok(html.includes('sindico@parquepassaros.com.br'));
    assert.ok(html.includes('Av. das Nações Unidas, 1000'));
  });

  it('4. Deve renderizar tabela de itens com áreas medidas aninhadas', () => {
    const html = gerarOrcamentoHtml(modeloValido);

    assert.ok(html.includes('Plantio e Nivelamento de Gramado Esmeralda'));
    assert.ok(html.includes('250,00'));
    assert.ok(html.includes('m²'));
    assert.ok(html.includes('R$ 20,00'));
    assert.ok(html.includes('R$ 5.000,00'));

    // Detalhe de áreas medidas
    assert.ok(html.includes('Áreas Medidas:'));
    assert.ok(html.includes('Talude Sul (150,00 m²)'));
    assert.ok(html.includes('Praça Central (100,00 m²)'));

    // Produto
    assert.ok(html.includes('Substrato Adubado Orgânico (Sacos 25kg)'));
    assert.ok(html.includes('R$ 700,00'));
  });

  it('5. Deve renderizar quadro de resumo financeiro', () => {
    const html = gerarOrcamentoHtml(modeloValido);

    assert.ok(html.includes('Subtotal:'));
    assert.ok(html.includes('R$ 5.700,00'));
    assert.ok(html.includes('Desconto (5%):'));
    assert.ok(html.includes('- R$ 285,00'));
    assert.ok(html.includes('Total Geral:'));
    assert.ok(html.includes('R$ 5.415,00'));
  });

  it('6. Deve conter regras CSS anti-quebra de página e estilização A4', () => {
    const html = gerarOrcamentoHtml(modeloValido);

    assert.ok(html.includes('@page'));
    assert.ok(html.includes('size: A4 portrait'));
    assert.ok(html.includes('page-break-inside: avoid'));
    assert.ok(html.includes('display: table-header-group'));
    assert.ok(html.includes('.bloco-totais'));
  });

  it('7. Deve conter rodapé institucional comercial estático', () => {
    const html = gerarOrcamentoHtml(modeloValido);

    assert.ok(html.includes('rodape-estatico'));
    assert.ok(html.includes('Orçamento ORC-2026-042'));
    assert.ok(html.includes('Documento emitido eletronicamente pelo Sistema de Orçamentos para Jardinagem'));
  });

  it('8. AUSÊNCIA ABSOLUTA de undefined, null ou NaN no HTML gerado', () => {
    const modeloMinimo: OrcamentoPdfModel = {
      id: 'orc-min',
      numero: 'ORC-MIN-001',
      dataCriacaoFormatada: '03/10/2026',
      dataValidadeFormatada: 'Validade: A combinar',
      statusBadge: 'Rascunho',
      prestador: {
        nome: 'Prestador',
        telefoneFormatado: null,
      },
      cliente: {
        nome: 'Cliente Sem Contatos',
        telefoneFormatado: null,
        email: null,
        documentoFormatado: null,
        enderecoFormatado: 'Endereço: Não informado',
      },
      itens: [
        {
          numeroItem: 1,
          tipoDescricao: 'Serviço',
          descricao: 'Serviço Básico',
          quantidadeFormatada: '1,00',
          unidade: 'un',
          valorUnitarioFormatado: 'R$ 100,00',
          valorTotalFormatado: 'R$ 100,00',
          usaMedicaoArea: false,
          areas: [],
        },
      ],
      subtotalFormatado: 'R$ 100,00',
      temDesconto: false,
      descricaoDesconto: null,
      valorDescontoFormatado: null,
      totalFormatado: 'R$ 100,00',
      observacoes: null,
      condicoesPagamento: 'A combinar com o prestador',
    };

    const html = gerarOrcamentoHtml(modeloMinimo);

    assert.strictEqual(html.includes('undefined'), false, 'Não deve conter "undefined"');
    assert.strictEqual(html.includes('null'), false, 'Não deve conter "null"');
    assert.strictEqual(html.includes('NaN'), false, 'Não deve conter "NaN"');
    assert.ok(html.includes('Endereço: Não informado'));
    assert.ok(html.includes('Validade: A combinar'));
    assert.ok(html.includes('A combinar com o prestador'));
  });
});
