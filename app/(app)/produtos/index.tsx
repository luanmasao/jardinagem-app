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
} from 'react-native';
import { useRouter } from 'expo-router';
import { useProdutos } from '../../../src/presentation/hooks/use-produtos';
import { Produto } from '../../../src/domain/entities/produto';

export default function ProdutosListScreen() {
  const router = useRouter();
  const {
    filteredProdutos,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    reload,
  } = useProdutos();

  const formatarPreco = (valor: number): string => {
    return `R$ ${valor.toFixed(2).replace('.', ',')}`;
  };

  const renderProdutoItem = ({ item }: { item: Produto }) => {
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => router.push(`/produtos/${item.id}` as any)}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.produtoNome} numberOfLines={1}>
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

        {item.descricao ? (
          <Text style={styles.produtoDescricao} numberOfLines={2}>
            {item.descricao}
          </Text>
        ) : null}

        <View style={styles.footerRow}>
          <View style={styles.badgeUnidade}>
            <Text style={styles.unidadeText}>{item.unidade}</Text>
          </View>

          <Text style={styles.precoText}>{formatarPreco(item.precoBase)}</Text>
        </View>
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
            placeholder="Buscar por nome ou descrição..."
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
          onPress={() => router.push('/produtos/novo' as any)}
        >
          <Text style={styles.novoButtonText}>+ Novo</Text>
        </TouchableOpacity>
      </View>

      {/* Conteúdo Principal: Loading, Erro, Vazio ou Lista */}
      {isLoading && filteredProdutos.length === 0 ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#15803d" />
          <Text style={styles.loadingText}>Carregando produtos...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Erro ao carregar produtos</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={reload} activeOpacity={0.8}>
            <Text style={styles.retryButtonText}>Tentar Novamente</Text>
          </TouchableOpacity>
        </View>
      ) : filteredProdutos.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyIcon}>📦</Text>
          <Text style={styles.emptyTitle}>
            {searchQuery ? 'Nenhum produto encontrado' : 'Nenhum produto cadastrado'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {searchQuery
              ? 'Tente ajustar os termos da busca.'
              : 'Cadastre insumos, adubos, plantas e materiais para utilizar nos orçamentos.'}
          </Text>
          {!searchQuery && (
            <TouchableOpacity
              style={styles.cadastrarButton}
              activeOpacity={0.8}
              onPress={() => router.push('/produtos/novo' as any)}
            >
              <Text style={styles.cadastrarButtonText}>Cadastrar Primeiro Produto</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredProdutos}
          keyExtractor={(item) => item.id}
          renderItem={renderProdutoItem}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
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
    marginBottom: 6,
  },
  produtoNome: {
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
  produtoDescricao: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 10,
    lineHeight: 18,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  badgeUnidade: {
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  unidadeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0369a1',
  },
  precoText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#15803d',
    marginLeft: 'auto',
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
