import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { StatusOrcamento } from '../../../domain/enums/status-orcamento';
import { obterBadgeStatusOrcamento } from '../../utils/status-orcamento.utils';
import { Badge } from './badge';

interface StatusBadgeProps {
  status: StatusOrcamento | string | null | undefined;
  style?: StyleProp<ViewStyle>;
}

/**
 * Selo de status do orçamento. Rótulo e cores vêm de `obterBadgeStatusOrcamento`.
 */
export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, style }) => {
  const badge = obterBadgeStatusOrcamento(status);
  return <Badge label={badge.label} cores={{ bg: badge.bg, text: badge.text }} style={style} />;
};
