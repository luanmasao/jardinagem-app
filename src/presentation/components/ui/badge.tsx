import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { colors } from '../../theme';

export type BadgeTone = 'success' | 'danger' | 'warning' | 'info' | 'neutral';

interface BadgeProps {
  label: string;
  tone?: BadgeTone;
  /** Cores explícitas; quando informadas, substituem as do `tone`. */
  cores?: { bg: string; text: string; dot?: string };
  style?: StyleProp<ViewStyle>;
}

const TONS: Record<BadgeTone, { bg: string; text: string; dot: string }> = {
  success: { bg: colors.primarySoft, text: colors.primaryDark, dot: colors.primary },
  danger: { bg: colors.dangerSoft, text: colors.danger, dot: colors.danger },
  warning: { bg: colors.warningSoft, text: colors.warning, dot: colors.warning },
  info: { bg: colors.infoSoft, text: colors.info, dot: colors.info },
  neutral: { bg: colors.surfaceMuted, text: colors.textSecondary, dot: colors.textMuted },
};

/**
 * Selo curto de situação (ex.: Ativo / Inativo), com ponto colorido e texto.
 */
export const Badge: React.FC<BadgeProps> = ({ label, tone = 'neutral', cores, style }) => {
  const tom = cores ? { bg: cores.bg, text: cores.text, dot: cores.dot ?? cores.text } : TONS[tone];
  return (
    <View style={[styles.badge, { backgroundColor: tom.bg }, style]}>
      <View style={[styles.dot, { backgroundColor: tom.dot }]} />
      <Text style={[styles.text, { color: tom.text }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 6,
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
  },
});
