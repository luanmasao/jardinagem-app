import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Orcamento } from '../../src/domain/entities/orcamento';
import { ItemOrcamento } from '../../src/domain/entities/item-orcamento';
import { Area } from '../../src/domain/entities/area';
import { Cliente } from '../../src/domain/entities/cliente';
import { Endereco } from '../../src/domain/entities/endereco';
import { Usuario } from '../../src/domain/entities/usuario';
import { StatusOrcamento } from '../../src/domain/enums/status-orcamento';
import { TipoDesconto } from '../../src/domain/enums/tipo-desconto';
import { TipoItem } from '../../src/domain/enums/tipo-item';
import {
  OrcamentoPdfMapper,
  formatarMoeda,
  formatarNumero,
  formatarData,
  formatarEndereco,
} from '../../src/application/mappers/orcamento-pdf.mapper';

describe('Bloco B — OrcamentoPdfMapper Unit Tests', () => {
  const usuarioPrestador = new Usuario({
    id: 'user-001',
    nome: 'Jardinagem Silva Verde',
    telefone: '(11) 98765-4321',
  });

  const clienteCompleto = new Cliente({
    id: 'cli-001',
    usuarioId: 'user-001',
    nome: 'Carlos Eduardo Santos',
    telefone: '(11) 91234-5678',
    email: 'carlos@empresa.com.br',
    documento: '123.456.789-00',
    endereco: new Endereco({
      id: 'end-001',
      clienteId: 'cli-001',
      logradouro: 'Rua das Camélias',
      numero: '150',
      complemento: 'Bloco B, Apto 12',
      bairro: 'Jardins',
      cidade: 'São Paulo',
      estado: 'SP',
      cep: '01402-000',
    }),
  });

  it('1. Formatação de Moedas e Números (pt-BR)', () => {
    assert.strictEqual(formatarMoeda(0), 'R$ 0,00');
    assert.strictEqual(formatarMoeda(45), 'R$ 45,00');
    assert.strictEqual(formatarMoeda(1250), 'R$ 1.250,00');
    assert.strictEqual(formatarMoeda(5422.5), 'R$ 5.422,50');
    assert.strictEqual(formatarMoeda(1000000.99), 'R$ 1.000.000,99');

    assert.strictEqual(formatarNumero(120.5, 2), '120,50');
    assert.strictEqual(formatarNumero(2, 2), '2,00');
    assert.strictEqual(formatarNumero(1500, 2), '1.500,00');
  });

  it('2. Formatação de Datas Civis', () => {
    const data = new Date(2026, 9, 3); // 03/10/2026
    assert.strictEqual(formatarData(data), '03/10/2026');
  });

  it('3. Mapeamento de Orçamento com Serviços e Produtos Mistos', () => {
    const itemServico = new ItemOrcamento({
      id: 'item-1',
      orcamentoId: 'orc-001',
      tipo: TipoItem.SERVICO,
      servicoId: 'srv-001',
      descricao: 'Poda e Limpeza de Arbustos',
      quantidade: 3,
      unidade: 'h',
      valorUnitario: 80,
      usaMedicaoArea: false,
    });

    const itemProduto = new ItemOrcamento({
      id: 'item-2',
      orcamentoId: 'orc-001',
      tipo: TipoItem.PRODUTO,
      produtoId: 'prd-001',
      descricao: 'Mudas de Hera Inglesa',
      quantidade: 10,
      unidade: 'un',
      valorUnitario: 25,
      usaMedicaoArea: false,
    });

    const orcamento = new Orcamento({
      id: 'orc-001',
      usuarioId: 'user-001',
      clienteId: 'cli-001',
      numero: 'ORC-2026-001',
      dataCriacao: new Date(2026, 9, 3),
      dataValidade: new Date(2026, 9, 18),
      status: StatusOrcamento.ENVIADO,
      itens: [itemServico, itemProduto],
      condicoesPagamento: '30% entrada + 70% na entrega',
      observacoes: 'Acesso pelo portão lateral dos fundos.',
    });

    const modelo = OrcamentoPdfMapper.paraModelo(orcamento, clienteCompleto, usuarioPrestador);

    assert.strictEqual(modelo.numero, 'ORC-2026-001');
    assert.strictEqual(modelo.statusBadge, 'Enviado');
    assert.strictEqual(modelo.dataCriacaoFormatada, '03/10/2026');
    assert.strictEqual(modelo.dataValidadeFormatada, '18/10/2026');
    assert.strictEqual(modelo.prestador.nome, 'Jardinagem Silva Verde');
    assert.strictEqual(modelo.prestador.telefoneFormatado, '(11) 98765-4321');
    assert.strictEqual(modelo.cliente.nome, 'Carlos Eduardo Santos');
    assert.strictEqual(modelo.cliente.telefoneFormatado, '(11) 91234-5678');
    assert.strictEqual(modelo.cliente.email, 'carlos@empresa.com.br');
    assert.strictEqual(modelo.cliente.documentoFormatado, '123.456.789-00');
    assert.strictEqual(
      modelo.cliente.enderecoFormatado,
      'Rua das Camélias, 150, Bloco B, Apto 12, Jardins, São Paulo - SP, CEP: 01402-000'
    );

    assert.strictEqual(modelo.itens.length, 2);
    assert.strictEqual(modelo.itens[0].tipoDescricao, 'Serviço');
    assert.strictEqual(modelo.itens[0].descricao, 'Poda e Limpeza de Arbustos');
    assert.strictEqual(modelo.itens[0].valorUnitarioFormatado, 'R$ 80,00');
    assert.strictEqual(modelo.itens[0].valorTotalFormatado, 'R$ 240,00');

    assert.strictEqual(modelo.itens[1].tipoDescricao, 'Produto');
    assert.strictEqual(modelo.itens[1].descricao, 'Mudas de Hera Inglesa');
    assert.strictEqual(modelo.itens[1].valorUnitarioFormatado, 'R$ 25,00');
    assert.strictEqual(modelo.itens[1].valorTotalFormatado, 'R$ 250,00');

    // Subtotal: 240 + 250 = 490
    assert.strictEqual(modelo.subtotalFormatado, 'R$ 490,00');
    assert.strictEqual(modelo.temDesconto, false);
    assert.strictEqual(modelo.totalFormatado, 'R$ 490,00');
    assert.strictEqual(modelo.condicoesPagamento, '30% entrada + 70% na entrega');
    assert.strictEqual(modelo.observacoes, 'Acesso pelo portão lateral dos fundos.');
  });

  it('4. Mapeamento de Serviços com Múltiplas Áreas Medidas', () => {
    const area1 = new Area({
      id: 'area-1',
      itemOrcamentoId: 'item-medido',
      nome: 'Jardim Frontal',
      areaCalculada: 120.5,
      geometria: {
        tipo: 'Polygon',
        coordenadas: [
          { latitude: -23.56, longitude: -46.65 },
          { latitude: -23.56, longitude: -46.66 },
          { latitude: -23.57, longitude: -46.66 },
        ],
      },
    });

    const area2 = new Area({
      id: 'area-2',
      itemOrcamentoId: 'item-medido',
      nome: 'Gramado Lateral',
      areaCalculada: 45.0,
      geometria: {
        tipo: 'Polygon',
        coordenadas: [
          { latitude: -23.57, longitude: -46.65 },
          { latitude: -23.57, longitude: -46.66 },
          { latitude: -23.58, longitude: -46.66 },
        ],
      },
    });

    const itemMedido = new ItemOrcamento({
      id: 'item-medido',
      orcamentoId: 'orc-002',
      tipo: TipoItem.SERVICO,
      servicoId: 'srv-gramado',
      descricao: 'Corte e Adubação de Gramado',
      quantidade: 165.5,
      unidade: 'm²',
      valorUnitario: 15,
      usaMedicaoArea: true,
      areas: [area1, area2],
    });

    const orcamento = new Orcamento({
      id: 'orc-002',
      usuarioId: 'user-001',
      clienteId: 'cli-001',
      numero: 'ORC-2026-002',
      status: StatusOrcamento.RASCUNHO,
      itens: [itemMedido],
    });

    const modelo = OrcamentoPdfMapper.paraModelo(orcamento, clienteCompleto, usuarioPrestador);

    assert.strictEqual(modelo.itens.length, 1);
    const item = modelo.itens[0];
    assert.strictEqual(item.usaMedicaoArea, true);
    assert.strictEqual(item.quantidadeFormatada, '165,50');
    assert.strictEqual(item.areas.length, 2);
    assert.strictEqual(item.areas[0].nome, 'Jardim Frontal');
    assert.strictEqual(item.areas[0].areaCalculadaFormatada, '120,50 m²');
    assert.strictEqual(item.areas[1].nome, 'Gramado Lateral');
    assert.strictEqual(item.areas[1].areaCalculadaFormatada, '45,00 m²');
    assert.strictEqual(item.valorTotalFormatado, 'R$ 2.482,50');
  });

  it('5. Mapeamento com Desconto Percentual', () => {
    const item = new ItemOrcamento({
      id: 'it-1',
      orcamentoId: 'orc-desc',
      tipo: TipoItem.SERVICO,
      servicoId: 'srv-1',
      descricao: 'Serviço Geral',
      quantidade: 10,
      unidade: 'un',
      valorUnitario: 100,
      usaMedicaoArea: false,
    });

    const orcamento = new Orcamento({
      id: 'orc-desc',
      usuarioId: 'user-001',
      clienteId: 'cli-001',
      numero: 'ORC-2026-DESC-PCT',
      tipoDesconto: TipoDesconto.PERCENTUAL,
      valorDesconto: 10, // 10%
      itens: [item],
    });

    const modelo = OrcamentoPdfMapper.paraModelo(orcamento, clienteCompleto, usuarioPrestador);

    assert.strictEqual(modelo.subtotalFormatado, 'R$ 1.000,00');
    assert.strictEqual(modelo.temDesconto, true);
    assert.strictEqual(modelo.descricaoDesconto, 'Desconto (10%):');
    assert.strictEqual(modelo.valorDescontoFormatado, '- R$ 100,00');
    assert.strictEqual(modelo.totalFormatado, 'R$ 900,00');
  });

  it('6. Mapeamento com Desconto Fixo', () => {
    const item = new ItemOrcamento({
      id: 'it-1',
      orcamentoId: 'orc-desc-fixo',
      tipo: TipoItem.PRODUTO,
      produtoId: 'prd-1',
      descricao: 'Vasos Cerâmica',
      quantidade: 4,
      unidade: 'un',
      valorUnitario: 250,
      usaMedicaoArea: false,
    });

    const orcamento = new Orcamento({
      id: 'orc-desc-fixo',
      usuarioId: 'user-001',
      clienteId: 'cli-001',
      numero: 'ORC-2026-DESC-FIX',
      tipoDesconto: TipoDesconto.FIXO,
      valorDesconto: 150, // R$ 150 fixo
      itens: [item],
    });

    const modelo = OrcamentoPdfMapper.paraModelo(orcamento, clienteCompleto, usuarioPrestador);

    assert.strictEqual(modelo.subtotalFormatado, 'R$ 1.000,00');
    assert.strictEqual(modelo.temDesconto, true);
    assert.strictEqual(modelo.descricaoDesconto, 'Desconto Fixo:');
    assert.strictEqual(modelo.valorDescontoFormatado, '- R$ 150,00');
    assert.strictEqual(modelo.totalFormatado, 'R$ 850,00');
  });

  it('7. Tratamento Defensivo de Dados Opcionais e Ausentes', () => {
    const clienteSemEndereco = new Cliente({
      id: 'cli-sem-end',
      usuarioId: 'user-001',
      nome: 'Mariana Lima',
      telefone: null,
      email: null,
      documento: null,
      endereco: null,
    });

    const orcamentoMinimo = new Orcamento({
      id: 'orc-min',
      usuarioId: 'user-001',
      clienteId: 'cli-sem-end',
      numero: 'ORC-2026-MIN',
      dataValidade: null,
      observacoes: null,
      condicoesPagamento: null,
      itens: [
        new ItemOrcamento({
          id: 'it-min',
          orcamentoId: 'orc-min',
          tipo: TipoItem.SERVICO,
          servicoId: 'srv-1',
          descricao: 'Consultoria Básica',
          quantidade: 1,
          unidade: 'h',
          valorUnitario: 150,
          usaMedicaoArea: false,
        }),
      ],
    });

    const modelo = OrcamentoPdfMapper.paraModelo(orcamentoMinimo, clienteSemEndereco, null);

    assert.strictEqual(modelo.prestador.nome, 'Prestador');
    assert.strictEqual(modelo.prestador.telefoneFormatado, null);
    assert.strictEqual(modelo.cliente.nome, 'Mariana Lima');
    assert.strictEqual(modelo.cliente.telefoneFormatado, null);
    assert.strictEqual(modelo.cliente.email, null);
    assert.strictEqual(modelo.cliente.documentoFormatado, null);
    assert.strictEqual(modelo.cliente.enderecoFormatado, 'Endereço: Não informado');
    assert.strictEqual(modelo.dataValidadeFormatada, 'Validade: A combinar');
    assert.strictEqual(modelo.condicoesPagamento, 'A combinar com o prestador');
    assert.strictEqual(modelo.observacoes, null);
    assert.strictEqual(modelo.temDesconto, false);
    assert.strictEqual(modelo.descricaoDesconto, null);
    assert.strictEqual(modelo.valorDescontoFormatado, null);
  });
});
