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
import { useClienteDetalhe } from '../../../src/presentation/hooks/use-cliente-detalhe';
import { colors, fonts } from '../../../src/presentation/theme';
import { Badge, Button, Card, Icon } from '../../../src/presentation/components/ui';

export default function ClienteDetalheScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    cliente,
    isLoading,
    isTogglingAtivo,
    error,
    reload,
    toggleAtivo,
  } = useClienteDetalhe(id);

  const handleToggleAtivo = () => {
    if (!cliente) return;
    const acao = cliente.ativo ? 'inativar' : 'reativar';
    const confirmMessage = `Deseja realmente ${acao} o cliente "${cliente.nome}"?`;

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
            style: cliente.ativo ? 'destructive' : 'default',
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
        <Text style={styles.loadingText}>Carregando dados do cliente...</Text>
      </View>
    );
  }

  if (error || !cliente) {
    return (
      <View style={styles.centerContainer}>
        <Icon name="alert" size={40} color={colors.danger} style={styles.errorIcon} />
        <Text style={styles.errorTitle}>Cliente não encontrado</Text>
        <Text style={styles.errorMessage}>
          {error || 'O cliente solicitado não pôde ser localizado ou você não possui permissão para acessá-lo.'}
        </Text>
        <Button title="Voltar para Lista" size="compact" onPress={() => router.replace('/clientes' as any)} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Banner de Identificação */}
      <Card style={styles.card}>
        <View style={styles.headerTop}>
          <Text style={styles.headerNome}>{cliente.nome}</Text>
          <Badge label={cliente.ativo ? 'Ativo' : 'Inativo'} tone={cliente.ativo ? 'success' : 'danger'} />
        </View>
      </Card>

      {/* Card 1: Informações de Contato e Documento */}
      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Dados Cadastrais</Text>

        <View style={styles.row}>
          <Text style={styles.label}>Telefone:</Text>
          <Text style={styles.value}>{cliente.telefone || 'Não informado'}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>E-mail:</Text>
          <Text style={styles.value}>{cliente.email || 'Não informado'}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Documento:</Text>
          <Text style={styles.value}>{cliente.documento || 'Não informado'}</Text>
        </View>

        {cliente.observacoes ? (
          <View style={styles.observacoesContainer}>
            <Text style={styles.label}>Observações:</Text>
            <Text style={styles.observacoesText}>{cliente.observacoes}</Text>
          </View>
        ) : null}
      </Card>

      {/* Card 2: Endereço do Cliente */}
      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Endereço</Text>

        {cliente.endereco ? (
          <>
            <View style={styles.row}>
              <Text style={styles.label}>Logradouro:</Text>
              <Text style={styles.value}>
                {cliente.endereco.logradouro || '—'}
                {cliente.endereco.numero ? `, ${cliente.endereco.numero}` : ''}
              </Text>
            </View>

            {cliente.endereco.complemento ? (
              <View style={styles.row}>
                <Text style={styles.label}>Complemento:</Text>
                <Text style={styles.value}>{cliente.endereco.complemento}</Text>
              </View>
            ) : null}

            <View style={styles.row}>
              <Text style={styles.label}>Bairro:</Text>
              <Text style={styles.value}>{cliente.endereco.bairro || '—'}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Cidade / UF:</Text>
              <Text style={styles.value}>
                {cliente.endereco.cidade || '—'}
                {cliente.endereco.estado ? ` - ${cliente.endereco.estado}` : ''}
              </Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>CEP:</Text>
              <Text style={styles.value}>{cliente.endereco.cep || '—'}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Mapa / Coordenadas:</Text>
              <Text
                style={[
                  styles.value,
                  cliente.endereco.latitude != null
                    ? styles.localizacaoMapeada
                    : styles.localizacaoPendente,
                ]}
              >
                <Icon name="map-pin" size={13} />{' '}
                {cliente.endereco.latitude != null
                  ? 'Definida'
                  : 'Não localizada (manual)'}
              </Text>
            </View>
          </>
        ) : (
          <View style={styles.emptyEndereco}>
            <Text style={styles.emptyEnderecoText}>
              Nenhum endereço cadastrado para este cliente.
            </Text>
          </View>
        )}
      </Card>

      {/* Ações */}
      <View style={styles.actionsContainer}>
        <Button
          title="Editar Dados do Cliente"
          onPress={() => router.push(`/clientes/editar?id=${cliente.id}` as any)}
        />

        <Button
          title={cliente.ativo ? 'Inativar Cliente' : 'Ativar Cliente'}
          variant={cliente.ativo ? 'danger' : 'secondary'}
          loading={isTogglingAtivo}
          onPress={handleToggleAtivo}
        />

        <Button
          title="Voltar para Lista"
          variant="neutral"
          onPress={() => router.push('/clientes' as any)}
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
  localizacaoMapeada: {
    color: colors.primary,
    fontFamily: fonts.bold,
  },
  localizacaoPendente: {
    color: colors.warning,
    fontFamily: fonts.semibold,
  },
  observacoesContainer: {
    marginTop: 10,
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 10,
  },
  observacoesText: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  emptyEndereco: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  emptyEnderecoText: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textPlaceholder,
    fontStyle: 'italic',
  },
  actionsContainer: {
    marginTop: 8,
    marginBottom: 20,
    gap: 10,
  },
});
