import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../src/presentation/contexts/auth-context';
import { useRouter } from 'expo-router';
import { colors, fonts } from '../../src/presentation/theme';
import { Button, Card } from '../../src/presentation/components/ui';

export default function PerfilScreen() {
  const router = useRouter();
  const { user, perfil, isLoading, signOut, refreshPerfil } = useAuth();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.card}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.loadingText}>Carregando seus dados...</Text>
          </View>
        ) : perfil ? (
          <>
            <View style={styles.row}>
              <Text style={styles.label}>Nome</Text>
              <Text style={styles.value}>{perfil.nome}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>E-mail</Text>
              <Text style={styles.value}>{user?.email || '—'}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Telefone</Text>
              <Text style={styles.value}>{perfil.telefone || 'Não informado'}</Text>
            </View>

            <View style={[styles.row, styles.lastRow]}>
              <Text style={styles.label}>Cadastrado em</Text>
              <Text style={styles.value}>
                {perfil.dataCadastro ? new Date(perfil.dataCadastro).toLocaleDateString('pt-BR') : '—'}
              </Text>
            </View>
          </>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Não foi possível carregar seus dados.</Text>
            <Button
              title="Concluir Meu Perfil"
              onPress={() => router.push('/concluir-perfil')}
            />
          </View>
        )}
      </Card>

      <View style={styles.actions}>
        <Button
          title="Recarregar Dados"
          variant="neutral"
          onPress={refreshPerfil}
          disabled={isLoading}
          style={styles.refreshButton}
        />

        <Button
          title="Sair da Conta"
          variant="danger"
          onPress={signOut}
          disabled={isLoading}
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
    padding: 20,
  },
  card: {
    paddingVertical: 8,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceMuted,
  },
  lastRow: {
    borderBottomWidth: 0,
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
    flexShrink: 1,
    textAlign: 'right',
    marginLeft: 12,
  },
  loadingContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
  emptyContainer: {
    paddingVertical: 16,
    alignItems: 'stretch',
  },
  emptyText: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 12,
  },
  actions: {
    marginTop: 10,
    marginBottom: 30,
  },
  refreshButton: {
    marginBottom: 10,
  },
});
