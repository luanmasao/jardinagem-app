import { StatusOrcamento } from '../../domain/enums/status-orcamento';
import { colors } from '../theme';

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

/**
 * Cores dos status, a partir da paleta do tema (texto com contraste mínimo de 4,5:1 sobre o fundo).
 */
export const STATUS_ORCAMENTO_ESTILOS: Readonly<Record<StatusOrcamento, StatusOrcamentoEstilo>> = Object.freeze({
  [StatusOrcamento.RASCUNHO]: { bg: colors.surfaceMuted, text: colors.textSecondary, border: colors.borderStrong },
  [StatusOrcamento.ENVIADO]: { bg: colors.infoSoft, text: colors.info, border: colors.infoBorder },
  [StatusOrcamento.EM_ANALISE]: { bg: colors.analysisSoft, text: colors.analysis, border: colors.analysisBorder },
  [StatusOrcamento.APROVADO]: { bg: colors.primarySoft, text: colors.primaryDark, border: colors.primaryBorder },
  [StatusOrcamento.CONCLUIDO]: { bg: colors.tealSoft, text: colors.teal, border: colors.tealBorder },
  [StatusOrcamento.RECUSADO]: { bg: colors.dangerSoft, text: colors.danger, border: colors.dangerBorder },
  [StatusOrcamento.EXPIRADO]: { bg: colors.warningSoft, text: colors.warning, border: colors.warningBorder },
  [StatusOrcamento.CANCELADO]: { bg: colors.slateSoft, text: colors.slate, border: colors.slateBorder },
});

export const STATUS_ORCAMENTO_ESTILO_PADRAO: StatusOrcamentoEstilo = Object.freeze({
  bg: colors.surfaceMuted,
  text: colors.textMuted,
  border: colors.border,
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
export const STATUS_FILTROS_ORCAMENTO: readonly { label: string; valor: StatusOrcamento | 'TODOS' }[] = Object.freeze([
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
