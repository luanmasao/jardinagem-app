import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useClientes } from '../../../src/presentation/hooks/use-clientes';
import { Cliente } from '../../../src/domain/entities/cliente';

export default function ClientesListScreen() {
  const router = useRouter();
  const {
    filteredClientes,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    reload,
  } = useClientes();

  const renderClienteItem = ({ item }: { item: Cliente }) => {
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => router.push(`/clientes/${item.id}` as any)}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.clienteNome} numberOfLines={1}>
            {item.nome}
          </Text>
          <View
            style={[
              styles.statusBadge,
              item.ativo ? styles.badgeAtivo : styles.badgeInativo,
            ]}
          >
            <Text
              style={[
                styles.statusText,
                item.ativo ? styles.statusTextAtivo : styles.statusTextInativo,
              ]}
            >
              {item.ativo ? 'Ativo' : 'Inativo'}
            </Text>
          </View>
        </View>

        {item.documento ? (
          <Text style={styles.clienteInfo}>
            <Text style={styles.infoLabel}>Doc: </Text>
            {item.documento}
          </Text>
        ) : null}

        {item.telefone ? (
          <Text style={styles.clienteInfo}>
            <Text style={styles.infoLabel}>Tel: </Text>
            {item.telefone}
          </Text>
        ) : null}

        {item.email ? (
          <Text style={styles.clienteInfo}>
            <Text style={styles.infoLabel}>Email: </Text>
            {item.email}
          </Text>
        ) : null}

        {item.endereco?.cidade ? (
          <Text style={styles.clienteEndereco}>
            📍 {item.endereco.cidade}
            {item.endereco.estado ? ` - ${item.endereco.estado}` : ''}
          </Text>
        ) : null}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Barra de Busca e Ação Novo */}
      <View style={styles.headerContainer}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nome, doc ou telefone..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.clearSearchText}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <TouchableOpacity
          style={styles.novoButton}
          activeOpacity={0.8}
          onPress={() => router.push('/clientes/novo' as any)}
        >
          <Text style={styles.novoButtonText}>+ Novo</Text>
        </TouchableOpacity>
      </View>

      {/* Conteúdo Principal: Loading, Erro, Vazio ou Lista */}
      {isLoading && filteredClientes.length === 0 ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#15803d" />
          <Text style={styles.loadingText}>Carregando clientes...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Erro ao carregar clientes</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={reload} activeOpacity={0.8}>
            <Text style={styles.retryButtonText}>Tentar Novamente</Text>
          </TouchableOpacity>
        </View>
      ) : filteredClientes.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyIcon}>👥</Text>
          <Text style={styles.emptyTitle}>
            {searchQuery ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {searchQuery
              ? 'Tente ajustar os termos da busca.'
              : 'Cadastre seu primeiro cliente para gerenciar orçamentos e serviços.'}
          </Text>
          {!searchQuery && (
            <TouchableOpacity
              style={styles.cadastrarButton}
              activeOpacity={0.8}
              onPress={() => router.push('/clientes/novo' as any)}
            >
              <Text style={styles.cadastrarButtonText}>Cadastrar Primeiro Cliente</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredClientes}
          keyExtractor={(item) => item.id}
          renderItem={renderClienteItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={reload}
              colors={['#15803d']}
              tintColor="#15803d"
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    gap: 10,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 42,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1e293b',
    paddingVertical: 0,
  },
  clearSearchText: {
    fontSize: 14,
    color: '#64748b',
    paddingHorizontal: 4,
  },
  novoButton: {
    backgroundColor: '#15803d',
    paddingHorizontal: 14,
    height: 42,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  novoButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  clienteNome: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeAtivo: {
    backgroundColor: '#dcfce7',
  },
  badgeInativo: {
    backgroundColor: '#fee2e2',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusTextAtivo: {
    color: '#166534',
  },
  statusTextInativo: {
    color: '#b91c1c',
  },
  clienteInfo: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 4,
  },
  infoLabel: {
    fontWeight: '600',
    color: '#64748b',
  },
  clienteEndereco: {
    fontSize: 12,
    color: '#059669',
    marginTop: 4,
    fontWeight: '500',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
  },
  errorIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#b91c1c',
    marginBottom: 4,
  },
  errorMessage: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#15803d',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#334155',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 20,
    maxWidth: 280,
  },
  cadastrarButton: {
    backgroundColor: '#15803d',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  cadastrarButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
