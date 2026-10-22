import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { produtoService } from '../../../src/application/services/produto.service';
import { colors } from '../../../src/presentation/theme';

export default function NovoProdutoScreen() {
  const router = useRouter();

  // Campos do Produto (NÃO possui usa_medicao_area)
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [unidade, setUnidade] = useState('un');
  const [precoBase, setPrecoBase] = useState('');

  // Estados de controle
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (isSubmitting) return;

    if (!nome.trim()) {
      setErrorMessage('O nome do produto é obrigatório.');
      return;
    }

    const valorNumerico = parseFloat(precoBase.replace(',', '.'));
    if (isNaN(valorNumerico) || valorNumerico < 0) {
      setErrorMessage('Informe um preço base válido (maior ou igual a zero).');
      return;
    }

    if (!unidade.trim()) {
      setErrorMessage('A unidade de medida é obrigatória.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const novoProduto = await produtoService.criarProduto({
        nome: nome.trim(),
        descricao: descricao.trim() || null,
        unidade: unidade.trim(),
        precoBase: valorNumerico,
        ativo: true,
      });

      router.replace(`/produtos/${novoProduto.id}` as any);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao cadastrar produto.';
      setErrorMessage(msg);
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {errorMessage ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Dados do Produto</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Nome do Produto <Text style={styles.requiredAsterisk}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Terra Vegetal Adubada"
              placeholderTextColor={colors.textPlaceholder}
              value={nome}
              onChangeText={setNome}
              maxLength={150}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Descrição Detalhada</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Descreva as características, marca, composição ou especificações..."
              placeholderTextColor={colors.textPlaceholder}
              value={descricao}
              onChangeText={setDescricao}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>
                Unidade <Text style={styles.requiredAsterisk}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: un, kg, saco, m³"
                placeholderTextColor={colors.textPlaceholder}
                value={unidade}
                onChangeText={setUnidade}
                maxLength={20}
              />
            </View>

            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>
                Preço Base (R$) <Text style={styles.requiredAsterisk}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: 25,00"
                placeholderTextColor={colors.textPlaceholder}
                value={precoBase}
                onChangeText={setPrecoBase}
                keyboardType="numeric"
              />
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
          activeOpacity={0.8}
        >
          {isSubmitting ? (
            <ActivityIndicator color={colors.surface} />
          ) : (
            <Text style={styles.submitButtonText}>Cadastrar Produto</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 80,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dangerSoft,
    borderColor: colors.dangerBorder,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  errorText: {
    fontSize: 13,
    color: colors.danger,
    flex: 1,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 14,
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  requiredAsterisk: {
    color: colors.danger,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
  },
  textArea: {
    minHeight: 70,
  },
  row: {
    flexDirection: 'row',
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: colors.textOnColor,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
