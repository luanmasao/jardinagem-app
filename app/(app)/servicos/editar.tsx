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
        <ActivityIndicator size="large" color="#15803d" />
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
              placeholderTextColor="#94a3b8"
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
              placeholderTextColor="#94a3b8"
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
              trackColor={{ false: '#cbd5e1', true: '#86efac' }}
              thumbColor={usaMedicaoArea ? '#15803d' : '#f4f3f4'}
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
                placeholderTextColor="#94a3b8"
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
                placeholderTextColor="#94a3b8"
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
            <ActivityIndicator color="#ffffff" />
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
    backgroundColor: '#f8fafc',
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
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderColor: '#fca5a5',
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
    color: '#b91c1c',
    flex: 1,
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 14,
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
  },
  requiredAsterisk: {
    color: '#b91c1c',
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
  },
  inputDisabled: {
    backgroundColor: '#f1f5f9',
    color: '#64748b',
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
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  toggleTextContainer: {
    flex: 1,
    marginRight: 10,
  },
  toggleTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 2,
  },
  toggleSubtitle: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 16,
  },
  submitButton: {
    backgroundColor: '#15803d',
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
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: '#e2e8f0',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  cancelButtonText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '600',
  },
});
