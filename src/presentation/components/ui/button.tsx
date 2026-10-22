import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { colors } from '../../theme';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'neutral';
export type ButtonSize = 'regular' | 'compact';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  /** compact: para cabeçalhos de lista e ações secundárias em linha. */
  size?: ButtonSize;
  /** Exibe indicador de carregamento no lugar do texto e bloqueia o toque. */
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

/**
 * Botão padrão da interface.
 *
 * - primary: ação principal da tela (fundo verde).
 * - secondary: ação alternativa (contorno verde).
 * - danger: ação destrutiva ou de saída (fundo vermelho suave).
 * - neutral: ação de apoio (fundo cinza suave).
 */
export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'regular',
  loading = false,
  disabled = false,
  style,
  accessibilityLabel,
}) => {
  const bloqueado = disabled || loading;

  return (
    <TouchableOpacity
      style={[
        styles.base,
        size === 'compact' && styles.compact,
        styles[variant],
        bloqueado && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={bloqueado}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: bloqueado, busy: loading }}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.textOnColor : colors.primary} />
      ) : (
        <Text style={[styles.text, size === 'compact' && styles.compactText, textStyles[variant]]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compact: {
    minHeight: 42,
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  danger: {
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
  },
  neutral: {
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  disabled: {
    opacity: 0.6,
  },
  text: {
    fontSize: 16,
    fontWeight: '700',
  },
  compactText: {
    fontSize: 14,
  },
});

const textStyles = StyleSheet.create({
  primary: { color: colors.textOnColor },
  secondary: { color: colors.primary },
  danger: { color: colors.danger },
  neutral: { color: colors.text },
});
