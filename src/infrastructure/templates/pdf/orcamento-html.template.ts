import { OrcamentoPdfModel } from '../../../application/interfaces/pdf-generator.interface';

/**
 * Escapa caracteres HTML para prevenir injeção e renderização incorreta.
 */
function escapeHtml(valor: string | null | undefined): string {
  if (valor === null || valor === undefined) return '';
  return String(valor)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Gera o documento HTML5 print-ready para renderização em A4 via expo-print.
 *
 * Segue estritamente:
 * - RF80 / RN79 / RNF31 / RNF33;
 * - Ausência absoluta de contadores dinâmicos counter(pages);
 * - Prevenção de quebra indevida de linhas e blocos (page-break-inside: avoid);
 * - Tratamento defensivo total contra null, undefined e NaN.
 */
export function gerarOrcamentoHtml(modelo: OrcamentoPdfModel): string {
  // 1. Itens e Detalhamento de Áreas
  const itensHtml = modelo.itens
    .map((item) => {
      let areasDetalhamentoHtml = '';
      if (item.usaMedicaoArea && item.areas && item.areas.length > 0) {
        const areasTexto = item.areas
          .map((a) => `${escapeHtml(a.nome)} (${escapeHtml(a.areaCalculadaFormatada)})`)
          .join(' | ');
        areasDetalhamentoHtml = `
          <div class="areas-detalhe">
            <span class="areas-icone">&#9656;</span> <strong>Áreas Medidas:</strong> ${areasTexto}
          </div>
        `;
      }

      return `
        <tr>
          <td class="col-num">${escapeHtml(String(item.numeroItem))}</td>
          <td class="col-tipo"><span class="badge-tipo badge-tipo-${item.tipoDescricao.toLowerCase()}">${escapeHtml(item.tipoDescricao)}</span></td>
          <td class="col-desc">
            <div class="item-titulo">${escapeHtml(item.descricao)}</div>
            ${areasDetalhamentoHtml}
          </td>
          <td class="col-qtd text-right">${escapeHtml(item.quantidadeFormatada)}</td>
          <td class="col-un text-center">${escapeHtml(item.unidade)}</td>
          <td class="col-unitario text-right">${escapeHtml(item.valorUnitarioFormatado)}</td>
          <td class="col-total text-right">${escapeHtml(item.valorTotalFormatado)}</td>
        </tr>
      `;
    })
    .join('');

  // 2. Linhas de Contato do Prestador
  const prestadorTelefoneHtml = modelo.prestador.telefoneFormatado
    ? `<div class="contato-linha">&#9990; ${escapeHtml(modelo.prestador.telefoneFormatado)}</div>`
    : '';

  // 3. Linhas de Contato do Cliente
  const clienteContatos: string[] = [];
  if (modelo.cliente.documentoFormatado) {
    clienteContatos.push(`<strong>Doc:</strong> ${escapeHtml(modelo.cliente.documentoFormatado)}`);
  }
  if (modelo.cliente.telefoneFormatado) {
    clienteContatos.push(`<strong>Tel:</strong> ${escapeHtml(modelo.cliente.telefoneFormatado)}`);
  }
  if (modelo.cliente.email) {
    clienteContatos.push(`<strong>E-mail:</strong> ${escapeHtml(modelo.cliente.email)}`);
  }
  const clienteContatosHtml = clienteContatos.length > 0
    ? `<div class="cliente-contatos">${clienteContatos.join(' &nbsp;&bull;&nbsp; ')}</div>`
    : '';

  // 4. Linha de Desconto no Resumo
  const descontoHtml = modelo.temDesconto && modelo.valorDescontoFormatado
    ? `
      <div class="linha-financeira linha-desconto">
        <span class="label">${escapeHtml(modelo.descricaoDesconto || 'Desconto:')}</span>
        <span class="valor text-desconto">${escapeHtml(modelo.valorDescontoFormatado)}</span>
      </div>
    `
    : '';

  // 5. Bloco de Observações
  const observacoesHtml = modelo.observacoes
    ? `
      <div class="bloco-info">
        <div class="bloco-info-titulo">Observações</div>
        <div class="bloco-info-conteudo">${escapeHtml(modelo.observacoes)}</div>
      </div>
    `
    : '';

  // 6. Bloco de Condições de Pagamento
  const condicoesHtml = `
    <div class="bloco-info">
      <div class="bloco-info-titulo">Condições Comerciais e Pagamento</div>
      <div class="bloco-info-conteudo">${escapeHtml(modelo.condicoesPagamento || 'A combinar com o prestador')}</div>
    </div>
  `;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Orçamento ${escapeHtml(modelo.numero)}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 14mm 12mm 16mm 12mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 10pt;
      line-height: 1.4;
      color: #212121;
      background-color: #FFFFFF;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* Cabeçalho Institucional */
    .header-container {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #2E7D32;
      padding-bottom: 12px;
      margin-bottom: 14px;
    }
    .prestador-info {
      flex: 1;
      padding-right: 16px;
    }
    .prestador-nome {
      font-size: 16pt;
      font-weight: 700;
      color: #1B5E20;
      margin-bottom: 4px;
    }
    .contato-linha {
      font-size: 9pt;
      color: #555555;
      margin-top: 2px;
    }
    .proposta-badge-box {
      text-align: right;
      min-width: 170px;
    }
    .proposta-numero {
      font-size: 14pt;
      font-weight: 700;
      color: #2E7D32;
      margin-bottom: 4px;
    }
    .proposta-meta {
      font-size: 8.5pt;
      color: #616161;
      line-height: 1.3;
    }
    .status-tag {
      display: inline-block;
      margin-top: 5px;
      padding: 2px 8px;
      font-size: 8pt;
      font-weight: 600;
      text-transform: uppercase;
      border-radius: 4px;
      background-color: #E8F5E9;
      color: #2E7D32;
      border: 1px solid #C8E6C9;
    }

    /* Caixa do Cliente */
    .cliente-card {
      background-color: #F9FBF9;
      border: 1px solid #E0E8E0;
      border-radius: 6px;
      padding: 10px 12px;
      margin-bottom: 16px;
    }
    .cliente-header-linha {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 4px;
    }
    .cliente-titulo-secao {
      font-size: 7.5pt;
      font-weight: 700;
      color: #2E7D32;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .cliente-nome {
      font-size: 11pt;
      font-weight: 600;
      color: #212121;
    }
    .cliente-contatos {
      font-size: 8.5pt;
      color: #555555;
      margin-top: 3px;
    }
    .cliente-endereco {
      font-size: 8.5pt;
      color: #424242;
      margin-top: 4px;
      padding-top: 4px;
      border-top: 1px dashed #E0E8E0;
    }

    /* Tabela de Itens */
    .tabela-itens {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
      font-size: 9pt;
    }
    .tabela-itens th {
      background-color: #2E7D32;
      color: #FFFFFF;
      font-weight: 600;
      padding: 6px 8px;
      text-align: left;
      font-size: 8.5pt;
    }
    .tabela-itens td {
      padding: 7px 8px;
      border-bottom: 1px solid #EAEAEA;
      vertical-align: top;
    }
    .tabela-itens tbody tr:nth-child(even) {
      background-color: #FAFCFA;
    }
    .col-num { width: 4%; text-align: center; color: #757575; }
    .col-tipo { width: 10%; }
    .col-desc { width: 48%; }
    .col-qtd { width: 9%; }
    .col-un { width: 6%; }
    .col-unitario { width: 11%; }
    .col-total { width: 12%; font-weight: 600; color: #1B5E20; }

    .item-titulo {
      font-weight: 500;
      color: #212121;
    }
    .areas-detalhe {
      font-size: 8pt;
      color: #388E3C;
      background-color: #F1F8F1;
      padding: 3px 6px;
      border-radius: 4px;
      margin-top: 4px;
      display: inline-block;
      line-height: 1.25;
    }
    .areas-icone {
      font-size: 7pt;
    }

    .badge-tipo {
      font-size: 7.5pt;
      font-weight: 600;
      padding: 1px 5px;
      border-radius: 3px;
    }
    .badge-tipo-serviço, .badge-tipo-servico {
      background-color: #E8F5E9;
      color: #2E7D32;
    }
    .badge-tipo-produto {
      background-color: #E3F2FD;
      color: #1565C0;
    }

    /* Alinhamentos */
    .text-right { text-align: right; }
    .text-center { text-align: center; }

    /* Quadro Financeiro */
    .secao-inferior {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 16px;
    }
    .bloco-observacoes-wrapper {
      flex: 1;
      padding-right: 20px;
    }
    .bloco-totais {
      width: 250px;
      background-color: #F9FBF9;
      border: 1px solid #C8E6C9;
      border-radius: 6px;
      padding: 10px 14px;
    }
    .linha-financeira {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 4px 0;
      font-size: 9.5pt;
      color: #424242;
    }
    .linha-desconto {
      color: #C62828;
    }
    .text-desconto {
      font-weight: 600;
      color: #C62828;
    }
    .linha-total-geral {
      border-top: 2px solid #2E7D32;
      margin-top: 6px;
      padding-top: 8px;
    }
    .linha-total-geral .label {
      font-size: 11pt;
      font-weight: 700;
      color: #1B5E20;
    }
    .linha-total-geral .valor {
      font-size: 13pt;
      font-weight: 700;
      color: #1B5E20;
    }

    /* Blocos Informativos */
    .bloco-info {
      background-color: #FAFAFA;
      border: 1px solid #EEEEEE;
      border-radius: 4px;
      padding: 8px 10px;
      margin-bottom: 8px;
    }
    .bloco-info-titulo {
      font-size: 8pt;
      font-weight: 700;
      text-transform: uppercase;
      color: #555555;
      margin-bottom: 2px;
      letter-spacing: 0.4px;
    }
    .bloco-info-conteudo {
      font-size: 8.5pt;
      color: #333333;
      white-space: pre-wrap;
    }

    /* Rodapé Institucional */
    .rodape-estatico {
      margin-top: 20px;
      padding-top: 8px;
      border-top: 1px solid #E0E0E0;
      font-size: 7.5pt;
      color: #888888;
      text-align: center;
      line-height: 1.3;
    }

    /* Regras Print / Paginação */
    @media print {
      body {
        margin: 0;
      }
      table {
        page-break-inside: auto;
      }
      tr {
        page-break-inside: avoid;
        page-break-after: auto;
      }
      thead {
        display: table-header-group;
      }
      .bloco-totais {
        page-break-inside: avoid;
      }
      .bloco-info {
        page-break-inside: avoid;
      }
      .rodape-estatico {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>

  <!-- 1. Cabeçalho Institucional (RF80 / RNF33) -->
  <div class="header-container">
    <div class="prestador-info">
      <div class="prestador-nome">${escapeHtml(modelo.prestador.nome)}</div>
      ${prestadorTelefoneHtml}
    </div>
    <div class="proposta-badge-box">
      <div class="proposta-numero">Orçamento ${escapeHtml(modelo.numero)}</div>
      <div class="proposta-meta">
        <div>Emissão: <strong>${escapeHtml(modelo.dataCriacaoFormatada)}</strong></div>
        <div>${escapeHtml(modelo.dataValidadeFormatada)}</div>
      </div>
      <div><span class="status-tag">${escapeHtml(modelo.statusBadge)}</span></div>
    </div>
  </div>

  <!-- 2. Dados do Cliente e Endereço da Intervenção -->
  <div class="cliente-card">
    <div class="cliente-header-linha">
      <span class="cliente-titulo-secao">Destinatário / Proposta Comercial</span>
    </div>
    <div class="cliente-nome">${escapeHtml(modelo.cliente.nome)}</div>
    ${clienteContatosHtml}
    <div class="cliente-endereco">${escapeHtml(modelo.cliente.enderecoFormatado)}</div>
  </div>

  <!-- 3. Relação de Serviços e Produtos (Tabela Principal) -->
  <table class="tabela-itens">
    <thead>
      <tr>
        <th class="col-num">#</th>
        <th class="col-tipo">Tipo</th>
        <th class="col-desc">Descrição</th>
        <th class="col-qtd text-right">Qtd</th>
        <th class="col-un text-center">Un.</th>
        <th class="col-unitario text-right">Valor Unit.</th>
        <th class="col-total text-right">Total</th>
      </tr>
    </thead>
    <tbody>
      ${itensHtml}
    </tbody>
  </table>

  <!-- 4. Resumo Financeiro e Condições Complementares -->
  <div class="secao-inferior">
    <div class="bloco-observacoes-wrapper">
      ${condicoesHtml}
      ${observacoesHtml}
    </div>

    <div class="bloco-totais">
      <div class="linha-financeira">
        <span class="label">Subtotal:</span>
        <span class="valor">${escapeHtml(modelo.subtotalFormatado)}</span>
      </div>
      ${descontoHtml}
      <div class="linha-financeira linha-total-geral">
        <span class="label">Total Geral:</span>
        <span class="valor">${escapeHtml(modelo.totalFormatado)}</span>
      </div>
    </div>
  </div>

  <!-- 5. Rodapé Institucional Estático -->
  <div class="rodape-estatico">
    Orçamento ${escapeHtml(modelo.numero)} &bull; Documento emitido eletronicamente pelo Sistema de Orçamentos para Jardinagem &bull; Proposta comercial sujeita às condições informadas.
  </div>

</body>
</html>`;
}
