import React, { useState, useEffect } from 'react';
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
  Switch,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { servicoService } from '../../../src/application/services/servico.service';
import { colors } from '../../../src/presentation/theme';

export default function EditarServicoScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  // Estados de dados
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [unidade, setUnidade] = useState('');
  const [precoBase, setPrecoBase] = useState('');
  const [usaMedicaoArea, setUsaMedicaoArea] = useState(false);

  // Estados de controle
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function carregarServico() {
      if (!id) {
        setErrorMessage('ID do serviço não informado.');
        setIsLoading(false);
        return;
      }

      try {
        const servico = await servicoService.obterServico(id);
        if (!servico) {
          setErrorMessage('Serviço não encontrado.');
        } else {
          setNome(servico.nome || '');
          setDescricao(servico.descricao || '');
          setUnidade(servico.unidade || '');
          setPrecoBase(servico.precoBase ? servico.precoBase.toString() : '0');
          setUsaMedicaoArea(Boolean(servico.usaMedicaoArea));
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Falha ao carregar dados do serviço.';
        setErrorMessage(msg);
      } finally {
        setIsLoading(false);
      }
    }

    carregarServico();
  }, [id]);

  const handleToggleMedicaoArea = (value: boolean) => {
    setUsaMedicaoArea(value);
    if (value) {
      setUnidade('m²');
    } else if (unidade === 'm²') {
      setUnidade('un');
    }
  };

  const handleSubmit = async () => {
    if (isSubmitting || !id) return;

    if (!nome.trim()) {
      setErrorMessage('O nome do serviço é obrigatório.');
      return;
    }

    const valorNumerico = parseFloat(precoBase.replace(',', '.'));
    if (isNaN(valorNumerico) || valorNumerico < 0) {
      setErrorMessage('Informe um preço base válido (maior ou igual a zero).');
      return;
    }

    const unidadeFinal = usaMedicaoArea ? 'm²' : unidade.trim();
    if (!unidadeFinal) {
      setErrorMessage('A unidade de medida é obrigatória.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await servicoService.atualizarServico(id, {
        nome: nome.trim(),
        descricao: descricao.trim() || null,
        unidade: unidadeFinal,
        precoBase: valorNumerico,
        usaMedicaoArea,
      });

      router.back();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao atualizar serviço.';
      setErrorMessage(msg);
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Carregando dados para edição...</Text>
      </View>
    );
  }

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
          <Text style={styles.sectionTitle}>Editar Serviço</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Nome do Serviço <Text style={styles.requiredAsterisk}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Corte e Poda de Grama"
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
              placeholder="Descreva o escopo e detalhes técnicos do serviço..."
              placeholderTextColor={colors.textPlaceholder}
              value={descricao}
              onChangeText={setDescricao}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Toggle Usa Medição de Área */}
          <View style={styles.toggleCard}>
            <View style={styles.toggleTextContainer}>
              <Text style={styles.toggleTitle}>Usa Medição de Área</Text>
              <Text style={styles.toggleSubtitle}>
                {usaMedicaoArea
                  ? 'O serviço será dimensionado por área (m²) delimitada no mapa.'
                  : 'O serviço utiliza precificação direta sem associação geométrica.'}
              </Text>
            </View>
            <Switch
              value={usaMedicaoArea}
              onValueChange={handleToggleMedicaoArea}
              trackColor={{ false: colors.borderStrong, true: colors.primaryBorder }}
              thumbColor={usaMedicaoArea ? colors.primary : colors.surfaceSubtle}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>
                Unidade <Text style={styles.requiredAsterisk}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, usaMedicaoArea && styles.inputDisabled]}
                placeholder="Ex: m², un, h"
                placeholderTextColor={colors.textPlaceholder}
                value={unidade}
                onChangeText={setUnidade}
                editable={!usaMedicaoArea}
                maxLength={20}
              />
            </View>

            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>
                Preço Base (R$) <Text style={styles.requiredAsterisk}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: 15,50"
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
            <Text style={styles.submitButtonText}>Salvar Alterações</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => router.back()}
          disabled={isSubmitting}
          activeOpacity={0.8}
        >
          <Text style={styles.cancelButtonText}>Cancelar</Text>
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textMuted,
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
  inputDisabled: {
    backgroundColor: colors.surfaceMuted,
    color: colors.textMuted,
  },
  textArea: {
    minHeight: 70,
  },
  row: {
    flexDirection: 'row',
  },
  toggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleTextContainer: {
    flex: 1,
    marginRight: 10,
  },
  toggleTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  toggleSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 16,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 10,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: colors.textOnColor,
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: colors.border,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  cancelButtonText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
});
