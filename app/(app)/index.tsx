import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useAuth } from '../../src/presentation/contexts/auth-context';
import { useRouter } from 'expo-router';

export default function HomeScreen() {
  const router = useRouter();
  const { user, perfil, isLoading, signOut, refreshPerfil } = useAuth();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.welcomeBanner}>
        <Text style={styles.welcomeTitle}>
          Olá, {perfil?.nome || user?.nome || 'Profissional'}!
        </Text>
        <Text style={styles.welcomeSubtitle}>
          Sessão autenticada e perfil carregado com sucesso.
        </Text>
      </View>

      {/* Card 1: Informações de Autenticação (auth.users) */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.badge}>Auth.Users</Text>
          <Text style={styles.cardTitle}>Dados de Autenticação</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>UUID (auth.uid):</Text>
          <Text style={styles.valueMono}>{user?.id || '—'}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>E-mail:</Text>
          <Text style={styles.value}>{user?.email || '—'}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Estado da Sessão:</Text>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>Ativa / Persistida</Text>
          </View>
        </View>
      </View>

      {/* Card 2: Informações de Perfil de Negócio (public.usuario via RLS) */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={[styles.badge, styles.badgeProfile]}>Public.Usuario</Text>
          <Text style={styles.cardTitle}>Perfil de Negócio</Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color="#15803d" />
            <Text style={styles.loadingText}>Atualizando dados do perfil...</Text>
          </View>
        ) : perfil ? (
          <>
            <View style={styles.row}>
              <Text style={styles.label}>ID do Perfil:</Text>
              <Text style={styles.valueMono}>{perfil.id}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Nome Cadastrado:</Text>
              <Text style={styles.value}>{perfil.nome}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Telefone:</Text>
              <Text style={styles.value}>{perfil.telefone || 'Não informado'}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Data de Cadastro:</Text>
              <Text style={styles.value}>
                {perfil.dataCadastro ? new Date(perfil.dataCadastro).toLocaleString('pt-BR') : '—'}
              </Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Status do Perfil:</Text>
              <Text style={[styles.value, { color: perfil.ativo ? '#15803d' : '#b91c1c' }]}>
                {perfil.ativo ? 'Ativo' : 'Inativo'}
              </Text>
            </View>

            <View style={styles.rlsNotice}>
              <Text style={styles.rlsNoticeText}>
                ✓ Acesso verificado via RLS (usuario_select_policy). Sem privilégios administrativos.
              </Text>
            </View>
          </>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              Perfil ainda não carregado ou em processamento assíncrono pelo banco.
            </Text>
            <TouchableOpacity
              style={[styles.secondaryButton, { backgroundColor: '#15803d', marginBottom: 8 }]}
              onPress={() => router.push('/concluir-perfil')}
            >
              <Text style={[styles.secondaryButtonText, { color: '#ffffff', fontWeight: 'bold' }]}>
                Concluir Meu Perfil
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={refreshPerfil}>
              <Text style={styles.secondaryButtonText}>Recarregar Perfil</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Ações */}
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
          <Text style={styles.logoutButtonText}>Sair da Conta (Logout)</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 20,
  },
  welcomeBanner: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#065f46',
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 13,
    color: '#047857',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  badge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1e40af',
    backgroundColor: '#dbeafe',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: 8,
    textTransform: 'uppercase',
  },
  badgeProfile: {
    color: '#166534',
    backgroundColor: '#dcfce7',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  label: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  value: {
    fontSize: 13,
    color: '#0f172a',
    fontWeight: '600',
  },
  valueMono: {
    fontSize: 11,
    color: '#334155',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    maxWidth: '65%',
  },
  statusBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    color: '#166534',
    fontSize: 12,
    fontWeight: '600',
  },
  rlsNotice: {
    marginTop: 12,
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
    borderWidth: 1,
    borderRadius: 6,
    padding: 10,
  },
  rlsNoticeText: {
    fontSize: 11,
    color: '#15803d',
    lineHeight: 16,
  },
  loadingContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 12,
    color: '#64748b',
  },
  emptyContainer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 12,
  },
  secondaryButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 6,
  },
  secondaryButtonText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '600',
  },
  actions: {
    marginTop: 10,
    marginBottom: 30,
  },
  refreshButton: {
    backgroundColor: '#e2e8f0',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  refreshButtonText: {
    color: '#1e293b',
    fontSize: 15,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: '#fee2e2',
    borderColor: '#fca5a5',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#b91c1c',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
