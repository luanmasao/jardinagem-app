import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { servicoService } from '../../../src/application/services/servico.service';
import { colors } from '../../../src/presentation/theme';
import { Button, Card, TextField } from '../../../src/presentation/components/ui';

export default function NovoServicoScreen() {
  const router = useRouter();

  // Campos do Serviço
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [unidade, setUnidade] = useState('m²');
  const [precoBase, setPrecoBase] = useState('');
  const [usaMedicaoArea, setUsaMedicaoArea] = useState(true);

  // Estados de controle
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleToggleMedicaoArea = (value: boolean) => {
    setUsaMedicaoArea(value);
    if (value) {
      setUnidade('m²');
    } else if (unidade === 'm²') {
      setUnidade('un');
    }
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;

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
      const novoServico = await servicoService.criarServico({
        nome: nome.trim(),
        descricao: descricao.trim() || null,
        unidade: unidadeFinal,
        precoBase: valorNumerico,
        usaMedicaoArea,
        ativo: true,
      });

      router.replace(`/servicos/${novoServico.id}` as any);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao cadastrar serviço.';
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

        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Dados do Serviço</Text>

          <TextField
            label="Nome do Serviço"
            required
            placeholder="Ex: Corte e Poda de Grama"
            value={nome}
            onChangeText={setNome}
            maxLength={150}
          />

          <TextField
            label="Descrição Detalhada"
            style={styles.textArea}
            placeholder="Descreva o escopo e detalhes técnicos do serviço..."
            value={descricao}
            onChangeText={setDescricao}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

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
            <TextField
              label="Unidade"
              required
              containerStyle={{ flex: 1, marginRight: 8 }}
              placeholder="Ex: m², un, h"
              value={unidade}
              onChangeText={setUnidade}
              editable={!usaMedicaoArea}
              maxLength={20}
            />

            <TextField
              label="Preço Base (R$)"
              required
              containerStyle={{ flex: 1 }}
              placeholder="Ex: 15,50"
              value={precoBase}
              onChangeText={setPrecoBase}
              keyboardType="numeric"
            />
          </View>
        </Card>

        <Button
          title="Cadastrar Serviço"
          onPress={handleSubmit}
          loading={isSubmitting}
          style={styles.submitButton}
        />
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
    borderRadius: 12,
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
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 14,
  },
  textArea: {
    minHeight: 80,
  },
  row: {
    flexDirection: 'row',
  },
  toggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderRadius: 12,
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
    marginTop: 8,
  },
});
