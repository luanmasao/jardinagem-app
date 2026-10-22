import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { produtoService } from '../../../src/application/services/produto.service';
import { colors, fonts } from '../../../src/presentation/theme';
import { Button, Card, Icon, TextField } from '../../../src/presentation/components/ui';

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
            <Icon name="alert" size={16} color={colors.danger} style={styles.errorIcon} />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Dados do Produto</Text>

          <TextField
            label="Nome do Produto"
            required
            placeholder="Ex: Terra Vegetal Adubada"
            value={nome}
            onChangeText={setNome}
            maxLength={150}
          />

          <TextField
            label="Descrição Detalhada"
            style={styles.textArea}
            placeholder="Descreva as características, marca, composição ou especificações..."
            value={descricao}
            onChangeText={setDescricao}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          <View style={styles.row}>
            <TextField
              label="Unidade"
              required
              containerStyle={{ flex: 1, marginRight: 8 }}
              placeholder="Ex: un, kg, saco, m³"
              value={unidade}
              onChangeText={setUnidade}
              maxLength={20}
            />

            <TextField
              label="Preço Base (R$)"
              required
              containerStyle={{ flex: 1 }}
              placeholder="Ex: 25,00"
              value={precoBase}
              onChangeText={setPrecoBase}
              keyboardType="numeric"
            />
          </View>
        </Card>

        <Button
          title="Cadastrar Produto"
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
    fontFamily: fonts.regular,
    color: colors.danger,
    flex: 1,
  },
  sectionCard: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: fonts.bold,
    color: colors.text,
    marginBottom: 14,
  },
  textArea: {
    minHeight: 80,
  },
  row: {
    flexDirection: 'row',
  },
  submitButton: {
    marginTop: 8,
  },
});
