/**
 * Utilitários de Apresentação para Formatação e Parsing de Datas Civis em pt-br.
 *
 * Padrão canônico de interface: DD/MM/AAAA (ex: 07/10/2026).
 *
 * Princípios Fundamentais:
 * 1. Data civil: datas de validade/criação de orçamento não são instantes temporais.
 * 2. Imunidade a Timezone: blindagem total contra conversões UTC/locais que causem deslocamento de dia.
 * 3. Formatação determinística: 2 dígitos para dia, 2 para mês, 4 para ano, separados por '/'.
 */

/**
 * Formata uma data civil (Date ou string ISO YYYY-MM-DD) para a representação visual DD/MM/AAAA.
 * Nunca sofre deslocamento de fuso horário.
 *
 * Exemplos:
 * - Date(2026, 9, 7) -> '07/10/2026'
 * - '2026-10-07' -> '07/10/2026'
 * - '2026-01-05' -> '05/01/2026'
 * - '2026-12-31' -> '31/12/2026'
 * - null / undefined / '' -> ''
 */
export function formatarDataCivil(data: Date | string | null | undefined): string {
  if (!data) {
    return '';
  }

  // Caso 1: String no formato ISO ou civil
  if (typeof data === 'string') {
    const limpo = data.trim();
    if (!limpo) return '';

    // Se já estiver no formato DD/MM/AAAA, retorna
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(limpo)) {
      return limpo;
    }

    // Se estiver no formato AAAA-MM-DD (com ou sem sufixo de hora/T)
    const partesIso = limpo.split('T')[0].split('-');
    if (partesIso.length === 3) {
      const [ano, mes, dia] = partesIso;
      if (ano && mes && dia && ano.length === 4) {
        return `${dia.padStart(2, '0')}/${mes.padStart(2, '0')}/${ano}`;
      }
    }

    // Fallback: tentar instanciar como Date
    const d = new Date(limpo);
    if (!isNaN(d.getTime())) {
      const dia = String(d.getDate()).padStart(2, '0');
      const mes = String(d.getMonth() + 1).padStart(2, '0');
      const ano = String(d.getFullYear()).padStart(4, '0');
      return `${dia}/${mes}/${ano}`;
    }

    return '';
  }

  // Caso 2: Instância de Date
  if (data instanceof Date) {
    if (isNaN(data.getTime())) {
      return '';
    }
    const dia = String(data.getDate()).padStart(2, '0');
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const ano = String(data.getFullYear()).padStart(4, '0');
    return `${dia}/${mes}/${ano}`;
  }

  return '';
}

/**
 * Aplica máscara de entrada em tempo real para o campo de data (DD/MM/AAAA).
 * Permite digitação natural de números inserindo barras automaticamente.
 * Converte caso o usuário cole uma data no formato ISO AAAA-MM-DD.
 *
 * Exemplos:
 * - '07' -> '07'
 * - '071' -> '07/1'
 * - '0710' -> '07/10'
 * - '07102026' -> '07/10/2026'
 * - '2026-10-07' -> '07/10/2026'
 */
export function aplicarMascaraData(valor: string): string {
  if (!valor) return '';

  const limpo = valor.trim();

  // Tratamento se colar formato ISO AAAA-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(limpo)) {
    const [ano, mes, dia] = limpo.split('-');
    return `${dia}/${mes}/${ano}`;
  }

  // Extrai apenas os dígitos (máximo 8: DDMMAAAA)
  const digitos = valor.replace(/\D/g, '').slice(0, 8);

  if (digitos.length <= 2) {
    return digitos;
  }
  if (digitos.length <= 4) {
    return `${digitos.slice(0, 2)}/${digitos.slice(2)}`;
  }
  return `${digitos.slice(0, 2)}/${digitos.slice(2, 4)}/${digitos.slice(4)}`;
}

/**
 * Converte a string de entrada do usuário (DD/MM/AAAA) para um objeto Date representativo.
 * Para garantir imunidade total a fusos horários e compatibilidade com o domínio e Supabase,
 * a data é instanciada às 12:00:00 (meio-dia) no fuso local.
 *
 * Valida rigorosamente:
 * - Ano com 4 dígitos (1000 a 9999)
 * - Mês entre 1 e 12
 * - Dia entre 1 e 31 (e coerente com o calendário: bissextos, meses com 30/31 dias)
 *
 * Retorna null se o valor for vazio, inválido ou nulo.
 */
export function parseDataCivil(valor: string | null | undefined): Date | null {
  if (!valor || typeof valor !== 'string') {
    return null;
  }

  const limpo = valor.trim();
  if (limpo === '') {
    return null;
  }

  let dia: number;
  let mes: number;
  let ano: number;

  if (limpo.includes('/')) {
    const partes = limpo.split('/');
    if (partes.length !== 3) {
      return null;
    }
    dia = parseInt(partes[0], 10);
    mes = parseInt(partes[1], 10);
    ano = parseInt(partes[2], 10);
  } else if (limpo.includes('-')) {
    const partes = limpo.split('-');
    if (partes.length !== 3) {
      return null;
    }
    ano = parseInt(partes[0], 10);
    mes = parseInt(partes[1], 10);
    dia = parseInt(partes[2], 10);
  } else {
    return null;
  }

  if (isNaN(dia) || isNaN(mes) || isNaN(ano)) {
    return null;
  }

  if (ano < 1000 || ano > 9999 || mes < 1 || mes > 12 || dia < 1 || dia > 31) {
    return null;
  }

  // Meio-dia (12:00:00) blinda contra qualquer desvio de timezone em qualquer meridiano
  const dataObj = new Date(ano, mes - 1, dia, 12, 0, 0, 0);

  // Validação estrita do calendário real (evita 31/04, 30/02, 29/02 em ano não bissexto)
  if (
    dataObj.getFullYear() !== ano ||
    dataObj.getMonth() !== mes - 1 ||
    dataObj.getDate() !== dia
  ) {
    return null;
  }

  return dataObj;
}

/**
 * Converte data para string no formato ISO AAAA-MM-DD para compatibilidade lógica.
 */
export function converterDataParaIso(data: Date | string | null | undefined): string | null {
  if (!data) return null;

  if (typeof data === 'string') {
    const d = parseDataCivil(data);
    if (!d) return null;
    const ano = String(d.getFullYear()).padStart(4, '0');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  }

  if (data instanceof Date && !isNaN(data.getTime())) {
    const ano = String(data.getFullYear()).padStart(4, '0');
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  }

  return null;
}
