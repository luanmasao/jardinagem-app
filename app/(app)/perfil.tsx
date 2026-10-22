import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../src/presentation/contexts/auth-context';
import { useRouter } from 'expo-router';
import { colors } from '../../src/presentation/theme';

export default function PerfilScreen() {
  const router = useRouter();
  const { user, perfil, isLoading, signOut, refreshPerfil } = useAuth();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
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
            <TouchableOpacity
              style={[styles.secondaryButton, { backgroundColor: colors.primary, marginBottom: 8 }]}
              onPress={() => router.push('/concluir-perfil')}
            >
              <Text style={[styles.secondaryButtonText, { color: colors.textOnColor, fontWeight: 'bold' }]}>
                Concluir Meu Perfil
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={refreshPerfil}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          <Text style={styles.refreshButtonText}>Recarregar Dados</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={signOut}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          <Text style={styles.logoutButtonText}>Sair da Conta</Text>
        </TouchableOpacity>
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
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 18,
    marginBottom: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceMuted,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  label: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '500',
  },
  value: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '600',
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
    color: colors.textMuted,
  },
  emptyContainer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 12,
  },
  secondaryButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.border,
    borderRadius: 6,
  },
  secondaryButtonText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  actions: {
    marginTop: 10,
    marginBottom: 30,
  },
  refreshButton: {
    backgroundColor: colors.border,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  refreshButtonText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.dangerBorder,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: colors.danger,
    fontSize: 15,
    fontWeight: 'bold',
  },
});
