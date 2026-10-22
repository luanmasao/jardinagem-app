import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { produtoService } from '../../../src/application/services/produto.service';
import { colors } from '../../../src/presentation/theme';
import { Button, Card, TextField } from '../../../src/presentation/components/ui';

export default function EditarProdutoScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  // Estados de dados
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [unidade, setUnidade] = useState('');
  const [precoBase, setPrecoBase] = useState('');

  // Estados de controle
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function carregarProduto() {
      if (!id) {
        setErrorMessage('ID do produto não informado.');
        setIsLoading(false);
        return;
      }

      try {
        const produto = await produtoService.obterProduto(id);
        if (!produto) {
          setErrorMessage('Produto não encontrado.');
        } else {
          setNome(produto.nome || '');
          setDescricao(produto.descricao || '');
          setUnidade(produto.unidade || '');
          setPrecoBase(produto.precoBase ? produto.precoBase.toString() : '0');
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Falha ao carregar dados do produto.';
        setErrorMessage(msg);
      } finally {
        setIsLoading(false);
      }
    }

    carregarProduto();
  }, [id]);

  const handleSubmit = async () => {
    if (isSubmitting || !id) return;

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
      await produtoService.atualizarProduto(id, {
        nome: nome.trim(),
        descricao: descricao.trim() || null,
        unidade: unidade.trim(),
        precoBase: valorNumerico,
      });

      router.back();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao atualizar produto.';
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

        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Editar Produto</Text>

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
            placeholder="Descreva as características, marca, composição..."
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
          title="Salvar Alterações"
          onPress={handleSubmit}
          loading={isSubmitting}
          style={styles.submitButton}
        />

        <Button
          title="Cancelar"
          variant="neutral"
          onPress={() => router.back()}
          disabled={isSubmitting}
          style={styles.cancelButton}
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
  submitButton: {
    marginTop: 8,
    marginBottom: 10,
  },
  cancelButton: {
    marginBottom: 20,
  },
});
