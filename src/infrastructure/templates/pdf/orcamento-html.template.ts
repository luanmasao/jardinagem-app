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
 * Cores do selo de status no PDF. Espelham a paleta de status do app
 * (src/presentation/utils/status-orcamento.utils.ts); ficam aqui porque a
 * infraestrutura não depende da camada de apresentação.
 */
const CORES_STATUS: Readonly<Record<string, { fundo: string; texto: string }>> = Object.freeze({
  Rascunho: { fundo: '#EEF0EC', texto: '#3F4A42' },
  Enviado: { fundo: '#E6EEF8', texto: '#234E8C' },
  'Em análise': { fundo: '#EEEAF7', texto: '#553A97' },
  Aprovado: { fundo: '#DCEBDD', texto: '#1E4D34' },
  Concluído: { fundo: '#DFF0EE', texto: '#155A52' },
  Recusado: { fundo: '#F8E6E3', texto: '#B23A2E' },
  Expirado: { fundo: '#FBEFD9', texto: '#7A4F0E' },
  Cancelado: { fundo: '#ECEEF0', texto: '#46505A' },
});
const COR_STATUS_PADRAO = { fundo: '#EEF0EC', texto: '#5A665D' };

/** Marca (folha) desenhada em SVG inline, sem depender de arquivos externos. */
const SVG_MARCA = `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#1E4D34" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>`;

export interface OpcoesTemplateOrcamento {
  /**
   * Regras @font-face da Plus Jakarta Sans embutidas no HTML (ex.: fontes em base64).
   * Sem elas, o PDF usa a fonte do sistema.
   */
  fontFaceCss?: string;
}

/**
 * Gera o documento HTML5 print-ready para renderização em A4 via expo-print.
 *
 * Segue estritamente:
 * - RF80 / RN79 / RNF31 / RNF33;
 * - Ausência absoluta de contadores dinâmicos counter(pages);
 * - Prevenção de quebra indevida de linhas e blocos (page-break-inside: avoid);
 * - Tratamento defensivo total contra null, undefined e NaN.
 *
 * Visual alinhado ao app (verde-floresta, superfícies claras e total em destaque),
 * sem fundos escuros extensos para economizar tinta na impressão.
 */
export function gerarOrcamentoHtml(modelo: OrcamentoPdfModel, opcoes?: OpcoesTemplateOrcamento): string {
  // 1. Itens e Detalhamento de Áreas
  const itensHtml = modelo.itens
    .map((item) => {
      let areasDetalhamentoHtml = '';
      if (item.usaMedicaoArea && item.areas && item.areas.length > 0) {
        const areasLista = item.areas
          .map((a) => `<li>${escapeHtml(a.nome)} (${escapeHtml(a.areaCalculadaFormatada)})</li>`)
          .join('');
        areasDetalhamentoHtml = `
          <div class="areas-detalhe">
            <div class="areas-titulo">Áreas Medidas:</div>
            <ul class="areas-lista">${areasLista}</ul>
          </div>
        `;
      }

      const tipoClasse = item.tipoDescricao === 'Produto' ? 'badge-tipo-produto' : 'badge-tipo-servico';

      return `
        <tr>
          <td class="col-num">${escapeHtml(String(item.numeroItem))}</td>
          <td class="col-desc">
            <div class="item-titulo">${escapeHtml(item.descricao)} <span class="badge-tipo ${tipoClasse}">${escapeHtml(item.tipoDescricao)}</span></div>
            ${areasDetalhamentoHtml}
          </td>
          <td class="col-qtd text-right">${escapeHtml(item.quantidadeFormatada)} ${escapeHtml(item.unidade)}</td>
          <td class="col-unitario text-right">${escapeHtml(item.valorUnitarioFormatado)}</td>
          <td class="col-total text-right">${escapeHtml(item.valorTotalFormatado)}</td>
        </tr>
      `;
    })
    .join('');

  // 2. Contato do Prestador
  const prestadorTelefoneHtml = modelo.prestador.telefoneFormatado
    ? `<div class="contato-linha">${escapeHtml(modelo.prestador.telefoneFormatado)}</div>`
    : '';

  // 3. Contatos do Cliente
  const clienteContatos: string[] = [];
  if (modelo.cliente.documentoFormatado) {
    clienteContatos.push(`<div>Documento: ${escapeHtml(modelo.cliente.documentoFormatado)}</div>`);
  }
  if (modelo.cliente.telefoneFormatado) {
    clienteContatos.push(`<div>Telefone: ${escapeHtml(modelo.cliente.telefoneFormatado)}</div>`);
  }
  if (modelo.cliente.email) {
    clienteContatos.push(`<div>E-mail: ${escapeHtml(modelo.cliente.email)}</div>`);
  }
  const clienteContatosHtml = clienteContatos.length > 0
    ? `<div class="cliente-contatos">${clienteContatos.join('')}</div>`
    : '';

  // 4. Validade: o mapper entrega a data (DD/MM/AAAA) ou o texto "Validade: A combinar"
  const validadeEhData = /^\d{2}\/\d{2}\/\d{4}$/.test(modelo.dataValidadeFormatada);
  const validadeResumoHtml = validadeEhData
    ? `<div class="resumo-rotulo">Válido até</div><div class="resumo-valor">${escapeHtml(modelo.dataValidadeFormatada)}</div>`
    : `<div class="resumo-rotulo">Validade</div><div class="resumo-valor">A combinar</div>`;
  const validadeRodape = validadeEhData
    ? `Válido até ${escapeHtml(modelo.dataValidadeFormatada)}`
    : escapeHtml(modelo.dataValidadeFormatada);

  // 5. Selo de Status
  const corStatus = CORES_STATUS[modelo.statusBadge] ?? COR_STATUS_PADRAO;

  // 6. Linha de Desconto no Resumo
  const descontoHtml = modelo.temDesconto && modelo.valorDescontoFormatado
    ? `
      <div class="linha-financeira linha-desconto">
        <span class="label">${escapeHtml(modelo.descricaoDesconto || 'Desconto:')}</span>
        <span class="valor">${escapeHtml(modelo.valorDescontoFormatado)}</span>
      </div>
    `
    : '';

  // 7. Bloco de Observações
  const observacoesHtml = modelo.observacoes
    ? `
      <div class="bloco-info">
        <div class="bloco-info-titulo">Observações</div>
        <div class="bloco-info-conteudo">${escapeHtml(modelo.observacoes)}</div>
      </div>
    `
    : '';

  // 8. Bloco de Condições de Pagamento
  const condicoesHtml = `
    <div class="bloco-info">
      <div class="bloco-info-titulo">Condições de Pagamento</div>
      <div class="bloco-info-conteudo">${escapeHtml(modelo.condicoesPagamento || 'A combinar com o prestador')}</div>
    </div>
  `;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Orçamento ${escapeHtml(modelo.numero)}</title>
  <style>
    ${opcoes?.fontFaceCss ?? ''}
    @page {
      size: A4 portrait;
      margin: 12mm 12mm 14mm 12mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: "Plus Jakarta Sans", Roboto, "Segoe UI", Helvetica, Arial, sans-serif;
      font-size: 9.5pt;
      line-height: 1.45;
      color: #18221B;
      background-color: #FFFFFF;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* Faixa da marca */
    .faixa-marca {
      height: 6px;
      background-color: #1E4D34;
      border-radius: 3px;
      margin-bottom: 18px;
    }

    /* Cabeçalho */
    .header-container {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 16px;
    }
    .prestador-info {
      display: flex;
      align-items: center;
      gap: 12px;
      flex: 1;
      padding-right: 16px;
    }
    .marca-icone {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background-color: #DCEBDD;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .prestador-nome {
      font-size: 15pt;
      font-weight: 800;
      color: #18221B;
    }
    .contato-linha {
      font-size: 9pt;
      color: #5A665D;
      margin-top: 2px;
    }
    .proposta-badge-box {
      text-align: right;
      min-width: 180px;
    }
    .proposta-rotulo {
      font-size: 8pt;
      font-weight: 700;
      letter-spacing: 1.2px;
      text-transform: uppercase;
      color: #5A665D;
    }
    .proposta-numero {
      font-size: 17pt;
      font-weight: 800;
      color: #1E4D34;
      margin-top: 1px;
    }
    .status-tag {
      display: inline-block;
      margin-top: 5px;
      padding: 2px 9px;
      font-size: 8pt;
      font-weight: 700;
      border-radius: 999px;
    }

    /* Resumo: emissão, validade e total */
    .resumo-faixa {
      display: flex;
      border: 1px solid #E3E7E0;
      border-radius: 10px;
      overflow: hidden;
      margin-bottom: 14px;
    }
    .resumo-celula {
      flex: 1;
      padding: 8px 12px;
      border-right: 1px solid #E3E7E0;
    }
    .resumo-celula:last-child {
      border-right: none;
    }
    .resumo-celula-total {
      background-color: #EEF5EE;
    }
    .resumo-rotulo {
      font-size: 7.5pt;
      font-weight: 700;
      letter-spacing: 0.8px;
      text-transform: uppercase;
      color: #5A665D;
    }
    .resumo-celula-total .resumo-rotulo,
    .resumo-celula-total .resumo-valor {
      color: #1E4D34;
    }
    .resumo-valor {
      font-size: 10.5pt;
      font-weight: 700;
      margin-top: 1px;
    }

    /* Cliente e local do serviço */
    .cliente-grid {
      display: flex;
      gap: 12px;
      margin-bottom: 18px;
    }
    .cliente-card {
      flex: 1;
      background-color: #F5F6F1;
      border-radius: 10px;
      padding: 10px 12px;
    }
    .secao-rotulo {
      font-size: 7.5pt;
      font-weight: 700;
      letter-spacing: 0.8px;
      text-transform: uppercase;
      color: #5A665D;
    }
    .cliente-nome {
      font-size: 11pt;
      font-weight: 700;
      margin-top: 3px;
    }
    .cliente-contatos {
      font-size: 8.5pt;
      color: #3F4A42;
      margin-top: 4px;
      line-height: 1.5;
    }
    .cliente-endereco {
      font-size: 9pt;
      font-weight: 600;
      color: #18221B;
      margin-top: 3px;
      line-height: 1.5;
    }

    /* Tabela de Itens */
    .secao-titulo {
      font-size: 11pt;
      font-weight: 800;
      margin-bottom: 8px;
    }
    .tabela-itens {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 18px;
      font-size: 9pt;
    }
    .tabela-itens th {
      background-color: #EEF5EE;
      color: #1E4D34;
      font-weight: 700;
      padding: 7px 8px;
      text-align: left;
      font-size: 8.5pt;
      border-bottom: 1px solid #A9CBB0;
    }
    .tabela-itens th.text-right {
      text-align: right;
    }
    .tabela-itens td {
      padding: 8px;
      border-bottom: 1px solid #E3E7E0;
      vertical-align: top;
    }
    .col-num { width: 4%; color: #5A665D; }
    .col-desc { width: 54%; }
    .col-qtd { width: 13%; white-space: nowrap; }
    .col-unitario { width: 13%; white-space: nowrap; }
    .col-total { width: 16%; font-weight: 700; white-space: nowrap; }

    .item-titulo {
      font-weight: 700;
      color: #18221B;
    }
    .badge-tipo {
      font-size: 7.5pt;
      font-weight: 700;
      padding: 1px 7px;
      border-radius: 999px;
      margin-left: 4px;
      white-space: nowrap;
    }
    .badge-tipo-servico {
      background-color: #DCEBDD;
      color: #1E4D34;
    }
    .badge-tipo-produto {
      background-color: #E6EEF8;
      color: #234E8C;
    }
    .areas-detalhe {
      margin-top: 5px;
      font-size: 8.5pt;
      color: #3F4A42;
    }
    .areas-titulo {
      font-weight: 700;
      color: #1E4D34;
    }
    .areas-lista {
      list-style: none;
      margin-top: 1px;
    }
    .areas-lista li::before {
      content: "\\2022  ";
      color: #2F6B47;
    }

    /* Alinhamentos */
    .text-right { text-align: right; }
    .text-center { text-align: center; }

    /* Condições e Totais */
    .secao-inferior {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 18px;
      margin-bottom: 16px;
    }
    .bloco-observacoes-wrapper {
      flex: 1;
    }
    .bloco-info {
      margin-bottom: 10px;
    }
    .bloco-info-titulo {
      font-size: 7.5pt;
      font-weight: 700;
      letter-spacing: 0.8px;
      text-transform: uppercase;
      color: #5A665D;
      margin-bottom: 2px;
    }
    .bloco-info-conteudo {
      font-size: 9pt;
      color: #18221B;
      white-space: pre-wrap;
    }
    .bloco-totais {
      width: 250px;
      border: 1px solid #E3E7E0;
      border-radius: 12px;
      overflow: hidden;
    }
    .linhas-parciais {
      padding: 8px 14px;
    }
    .linha-financeira {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 3px 0;
      font-size: 9.5pt;
    }
    .linha-financeira .label {
      color: #5A665D;
    }
    .linha-financeira .valor {
      font-weight: 600;
    }
    .linha-desconto .label,
    .linha-desconto .valor {
      color: #B23A2E;
    }
    .linha-total-geral {
      background-color: #DCEBDD;
      padding: 10px 14px;
    }
    .linha-total-geral .label {
      font-size: 10pt;
      font-weight: 800;
      color: #1E4D34;
    }
    .linha-total-geral .valor {
      font-size: 15pt;
      font-weight: 800;
      color: #1E4D34;
    }

    /* Rodapé */
    .rodape-estatico {
      margin-top: 18px;
      padding-top: 8px;
      border-top: 1px solid #E3E7E0;
      font-size: 7.5pt;
      color: #5A665D;
      line-height: 1.5;
    }
    .rodape-linha-principal {
      font-weight: 700;
      color: #3F4A42;
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

  <div class="faixa-marca"></div>

  <!-- 1. Cabeçalho: prestador e identificação do orçamento (RF80 / RNF33) -->
  <div class="header-container">
    <div class="prestador-info">
      <div class="marca-icone">${SVG_MARCA}</div>
      <div>
        <div class="prestador-nome">${escapeHtml(modelo.prestador.nome)}</div>
        ${prestadorTelefoneHtml}
      </div>
    </div>
    <div class="proposta-badge-box">
      <div class="proposta-rotulo">Orçamento</div>
      <div class="proposta-numero">${escapeHtml(modelo.numero)}</div>
      <div><span class="status-tag" style="background-color: ${corStatus.fundo}; color: ${corStatus.texto};">${escapeHtml(modelo.statusBadge)}</span></div>
    </div>
  </div>

  <!-- 2. Resumo: emissão, validade e valor total -->
  <div class="resumo-faixa">
    <div class="resumo-celula">
      <div class="resumo-rotulo">Emissão</div>
      <div class="resumo-valor">${escapeHtml(modelo.dataCriacaoFormatada)}</div>
    </div>
    <div class="resumo-celula">${validadeResumoHtml}</div>
    <div class="resumo-celula resumo-celula-total">
      <div class="resumo-rotulo">Valor total</div>
      <div class="resumo-valor">${escapeHtml(modelo.totalFormatado)}</div>
    </div>
  </div>

  <!-- 3. Cliente e local do serviço -->
  <div class="cliente-grid">
    <div class="cliente-card">
      <div class="secao-rotulo">Cliente</div>
      <div class="cliente-nome">${escapeHtml(modelo.cliente.nome)}</div>
      ${clienteContatosHtml}
    </div>
    <div class="cliente-card">
      <div class="secao-rotulo">Local do serviço</div>
      <div class="cliente-endereco">${escapeHtml(modelo.cliente.enderecoFormatado)}</div>
    </div>
  </div>

  <!-- 4. Serviços e produtos -->
  <div class="secao-titulo">Serviços e produtos</div>
  <table class="tabela-itens">
    <thead>
      <tr>
        <th class="col-num">#</th>
        <th class="col-desc">Descrição</th>
        <th class="col-qtd text-right">Qtd</th>
        <th class="col-unitario text-right">Unitário</th>
        <th class="col-total text-right">Total</th>
      </tr>
    </thead>
    <tbody>
      ${itensHtml}
    </tbody>
  </table>

  <!-- 5. Condições complementares e resumo financeiro -->
  <div class="secao-inferior">
    <div class="bloco-observacoes-wrapper">
      ${condicoesHtml}
      ${observacoesHtml}
    </div>

    <div class="bloco-totais">
      <div class="linhas-parciais">
        <div class="linha-financeira">
          <span class="label">Subtotal:</span>
          <span class="valor">${escapeHtml(modelo.subtotalFormatado)}</span>
        </div>
        ${descontoHtml}
      </div>
      <div class="linha-financeira linha-total-geral">
        <span class="label">Total Geral:</span>
        <span class="valor">${escapeHtml(modelo.totalFormatado)}</span>
      </div>
    </div>
  </div>

  <!-- 6. Rodapé -->
  <div class="rodape-estatico">
    <div class="rodape-linha-principal">Orçamento ${escapeHtml(modelo.numero)} &bull; Emitido em ${escapeHtml(modelo.dataCriacaoFormatada)} &bull; ${validadeRodape}</div>
    <div>Documento emitido eletronicamente pelo app Área Verde &bull; Proposta comercial sujeita às condições informadas.</div>
  </div>

</body>
</html>`;
}
