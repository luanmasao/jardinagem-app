import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TextInputProps,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { colors, fonts } from '../../theme';

interface TextFieldProps extends TextInputProps {
  label: string;
  /** Exibe asterisco vermelho após o rótulo. */
  required?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
}

/**
 * Campo de texto com rótulo, no padrão visual da interface.
 *
 * Repassa todas as propriedades ao TextInput; destaca a borda enquanto o campo
 * está em foco e usa aparência atenuada quando `editable` é false.
 */
export const TextField: React.FC<TextFieldProps> = ({
  label,
  required = false,
  containerStyle,
  style,
  editable,
  onFocus,
  onBlur,
  placeholderTextColor = colors.textPlaceholder,
  ...inputProps
}) => {
  const [emFoco, setEmFoco] = useState(false);
  const somenteLeitura = editable === false;

  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      <TextInput
        {...inputProps}
        editable={editable}
        placeholderTextColor={placeholderTextColor}
        accessibilityLabel={inputProps.accessibilityLabel ?? label}
        onFocus={(e) => {
          setEmFoco(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setEmFoco(false);
          onBlur?.(e);
        }}
        style={[styles.input, emFoco && styles.inputFocused, somenteLeitura && styles.inputReadOnly, style]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  required: {
    color: colors.danger,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: fonts.regular,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  inputFocused: {
    borderColor: colors.primary,
    borderWidth: 1.5,
  },
  inputReadOnly: {
    backgroundColor: colors.surfaceMuted,
    color: colors.textMuted,
  },
});
