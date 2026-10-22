import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useProdutoDetalhe } from '../../../src/presentation/hooks/use-produto-detalhe';
import { colors, fonts } from '../../../src/presentation/theme';
import { Badge, Button, Card, Icon } from '../../../src/presentation/components/ui';

export default function ProdutoDetalheScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    produto,
    isLoading,
    isTogglingAtivo,
    error,
    reload,
    toggleAtivo,
  } = useProdutoDetalhe(id);

  const formatarPreco = (valor: number): string => {
    return `R$ ${valor.toFixed(2).replace('.', ',')}`;
  };

  const handleToggleAtivo = () => {
    if (!produto) return;
    const acao = produto.ativo ? 'inativar' : 'reativar';
    const confirmMessage = `Deseja realmente ${acao} o produto "${produto.nome}"?`;

    if (Platform.OS === 'web') {
      if (window.confirm(confirmMessage)) {
        toggleAtivo();
      }
    } else {
      Alert.alert(
        `Confirmar ${acao.charAt(0).toUpperCase() + acao.slice(1)}`,
        confirmMessage,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Confirmar',
            style: produto.ativo ? 'destructive' : 'default',
            onPress: () => toggleAtivo(),
          },
        ]
      );
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Carregando dados do produto...</Text>
      </View>
    );
  }

  if (error || !produto) {
    return (
      <View style={styles.centerContainer}>
        <Icon name="alert" size={40} color={colors.danger} style={styles.errorIcon} />
        <Text style={styles.errorTitle}>Produto não encontrado</Text>
        <Text style={styles.errorMessage}>
          {error || 'O produto solicitado não pôde ser localizado ou você não possui permissão para acessá-lo.'}
        </Text>
        <Button title="Voltar para Lista" size="compact" onPress={() => router.replace('/produtos' as any)} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Banner de Identificação */}
      <Card style={styles.card}>
        <View style={styles.headerTop}>
          <Text style={styles.headerNome}>{produto.nome}</Text>
          <Badge label={produto.ativo ? 'Ativo' : 'Inativo'} tone={produto.ativo ? 'success' : 'danger'} />
        </View>
      </Card>

      {/* Card: Detalhes Comerciais */}
      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Especificações do Produto</Text>

        <View style={styles.row}>
          <Text style={styles.label}>Preço Base:</Text>
          <Text style={styles.valuePreco}>{formatarPreco(produto.precoBase)}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Unidade de Comercialização:</Text>
          <Text style={styles.value}>{produto.unidade}</Text>
        </View>

        {produto.descricao ? (
          <View style={styles.descricaoContainer}>
            <Text style={styles.label}>Descrição:</Text>
            <Text style={styles.descricaoText}>{produto.descricao}</Text>
          </View>
        ) : null}
      </Card>

      {/* Ações */}
      <View style={styles.actionsContainer}>
        <Button
          title="Editar Dados do Produto"
          onPress={() => router.push(`/produtos/editar?id=${produto.id}` as any)}
        />

        <Button
          title={produto.ativo ? 'Inativar Produto' : 'Ativar Produto'}
          variant={produto.ativo ? 'danger' : 'secondary'}
          loading={isTogglingAtivo}
          onPress={handleToggleAtivo}
        />

        <Button
          title="Voltar para Lista"
          variant="neutral"
          onPress={() => router.push('/produtos' as any)}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
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
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
  errorIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  errorTitle: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: colors.danger,
    marginBottom: 6,
  },
  errorMessage: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 20,
    maxWidth: 280,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerNome: {
    fontSize: 20,
    fontFamily: fonts.bold,
    color: colors.text,
    flex: 1,
    marginRight: 10,
  },
  card: {
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: fonts.bold,
    color: colors.text,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceMuted,
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.background,
  },
  label: {
    fontSize: 13,
    color: colors.textMuted,
    fontFamily: fonts.medium,
  },
  value: {
    fontSize: 13,
    color: colors.text,
    fontFamily: fonts.semibold,
    maxWidth: '65%',
    textAlign: 'right',
  },
  valuePreco: {
    fontSize: 15,
    color: colors.primary,
    fontFamily: fonts.bold,
  },
  descricaoContainer: {
    marginTop: 10,
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 10,
  },
  descricaoText: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  actionsContainer: {
    marginTop: 8,
    marginBottom: 20,
    gap: 10,
  },
});
