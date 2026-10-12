import { StatusOrcamento } from '../../domain/enums/status-orcamento';

/**
 * Mapeamento explícito e determinístico dos estados técnicos do orçamento
 * para rótulos visuais legíveis e amigáveis ao usuário em pt-br.
 *
 * Correção visando unificação da experiência de usuário (UX) em toda a aplicação.
 */
export const STATUS_ORCAMENTO_LABELS: Readonly<Record<StatusOrcamento, string>> = Object.freeze({
  [StatusOrcamento.RASCUNHO]: 'Rascunho',
  [StatusOrcamento.ENVIADO]: 'Enviado',
  [StatusOrcamento.EM_ANALISE]: 'Em análise',
  [StatusOrcamento.APROVADO]: 'Aprovado',
  [StatusOrcamento.RECUSADO]: 'Recusado',
  [StatusOrcamento.EXPIRADO]: 'Expirado',
  [StatusOrcamento.CANCELADO]: 'Cancelado',
  [StatusOrcamento.CONCLUIDO]: 'Concluído',
});

/**
 * Converte um StatusOrcamento para sua representação textual amigável ao usuário.
 *
 * Regras:
 * - Mapeamento explícito e determinístico (sem transformações genéricas por regex/casing).
 * - Fallback controlado para valores nulos, vazios ou desconhecidos.
 * - Não muta o valor original nem altera o identificador técnico persistido.
 *
 * Exemplos:
 * - StatusOrcamento.EM_ANALISE -> "Em análise" (nunca "Em_analise" ou "Em analise")
 * - StatusOrcamento.CONCLUIDO -> "Concluído"
 */
export function formatarStatusOrcamento(status: StatusOrcamento | string | null | undefined): string {
  if (!status) {
    return 'Não definido';
  }

  if (typeof status === 'string' && status in STATUS_ORCAMENTO_LABELS) {
    return STATUS_ORCAMENTO_LABELS[status as StatusOrcamento];
  }

  // Fallback defensivo controlado para valores desconhecidos
  return 'Desconhecido';
}

export interface StatusOrcamentoEstilo {
  bg: string;
  text: string;
  border: string;
}

export interface StatusOrcamentoBadge extends StatusOrcamentoEstilo {
  label: string;
}

export const STATUS_ORCAMENTO_ESTILOS: Readonly<Record<StatusOrcamento, StatusOrcamentoEstilo>> = Object.freeze({
  [StatusOrcamento.RASCUNHO]: { bg: '#FFF3E0', text: '#E65100', border: '#FFE0B2' },
  [StatusOrcamento.ENVIADO]: { bg: '#E3F2FD', text: '#1565C0', border: '#BBDEFB' },
  [StatusOrcamento.EM_ANALISE]: { bg: '#EDE7F6', text: '#512DA8', border: '#D1C4E9' },
  [StatusOrcamento.APROVADO]: { bg: '#E8F5E9', text: '#2E7D32', border: '#C8E6C9' },
  [StatusOrcamento.CONCLUIDO]: { bg: '#E0F2F1', text: '#004D40', border: '#B2DFDB' },
  [StatusOrcamento.RECUSADO]: { bg: '#FFEBEE', text: '#C62828', border: '#FFCDD2' },
  [StatusOrcamento.EXPIRADO]: { bg: '#FFF8E1', text: '#F57F17', border: '#FFECB3' },
  [StatusOrcamento.CANCELADO]: { bg: '#ECEFF1', text: '#455A64', border: '#CFD8DC' },
});

export const STATUS_ORCAMENTO_ESTILO_PADRAO: StatusOrcamentoEstilo = Object.freeze({
  bg: '#F5F5F5',
  text: '#616161',
  border: '#E0E0E0',
});

/**
 * Retorna o estilo visual (cores de fundo, texto e borda) para o status.
 */
export function obterEstiloStatusOrcamento(status: StatusOrcamento | string | null | undefined): StatusOrcamentoEstilo {
  if (status && typeof status === 'string' && status in STATUS_ORCAMENTO_ESTILOS) {
    return STATUS_ORCAMENTO_ESTILOS[status as StatusOrcamento];
  }
  return STATUS_ORCAMENTO_ESTILO_PADRAO;
}

/**
 * Retorna as propriedades completas de badge (label amigável + estilos visuais).
 */
export function obterBadgeStatusOrcamento(status: StatusOrcamento | string | null | undefined): StatusOrcamentoBadge {
  const estilo = obterEstiloStatusOrcamento(status);
  const label = formatarStatusOrcamento(status);
  return {
    ...estilo,
    label,
  };
}

/**
 * Lista de filtros pré-formatada para uso em telas de consulta e listagem.
 */
export const STATUS_FILTROS_ORCAMENTO: ReadonlyArray<{ label: string; valor: StatusOrcamento | 'TODOS' }> = Object.freeze([
  { label: 'Todos', valor: 'TODOS' },
  { label: 'Rascunho', valor: StatusOrcamento.RASCUNHO },
  { label: 'Enviado', valor: StatusOrcamento.ENVIADO },
  { label: 'Em análise', valor: StatusOrcamento.EM_ANALISE },
  { label: 'Aprovado', valor: StatusOrcamento.APROVADO },
  { label: 'Concluído', valor: StatusOrcamento.CONCLUIDO },
  { label: 'Recusado', valor: StatusOrcamento.RECUSADO },
  { label: 'Cancelado', valor: StatusOrcamento.CANCELADO },
  { label: 'Expirado', valor: StatusOrcamento.EXPIRADO },
]);
