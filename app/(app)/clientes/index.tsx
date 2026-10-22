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
import { colors, fonts } from '../../../src/presentation/theme';
import { Badge, Button, Icon } from '../../../src/presentation/components/ui';

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
          <Badge label={item.ativo ? 'Ativo' : 'Inativo'} tone={item.ativo ? 'success' : 'danger'} />
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
            <Icon name="map-pin" size={12} /> {item.endereco.cidade}
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
          <Icon name="search" size={14} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nome, doc ou telefone..."
            placeholderTextColor={colors.textPlaceholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Icon name="close" size={14} color={colors.textMuted} style={styles.clearSearchText} />
            </TouchableOpacity>
          ) : null}
        </View>

        <Button
          title="+ Novo"
          size="compact"
          onPress={() => router.push('/clientes/novo' as any)}
          accessibilityLabel="Novo cliente"
        />
      </View>

      {/* Conteúdo Principal: Loading, Erro, Vazio ou Lista */}
      {isLoading && filteredClientes.length === 0 ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Carregando clientes...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Icon name="alert" size={36} color={colors.danger} style={styles.errorIcon} />
          <Text style={styles.errorTitle}>Erro ao carregar clientes</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <Button title="Tentar Novamente" size="compact" onPress={reload} />
        </View>
      ) : filteredClientes.length === 0 ? (
        <View style={styles.centerContainer}>
          <Icon name="users" size={48} color={colors.textPlaceholder} style={styles.emptyIcon} />
          <Text style={styles.emptyTitle}>
            {searchQuery ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {searchQuery
              ? 'Tente ajustar os termos da busca.'
              : 'Cadastre seu primeiro cliente para gerenciar orçamentos e serviços.'}
          </Text>
          {!searchQuery && (
            <Button
              title="Cadastrar Primeiro Cliente"
              size="compact"
              onPress={() => router.push('/clientes/novo' as any)}
            />
          )}
        </View>
      ) : (
        <FlatList
          data={filteredClientes}
          keyExtractor={(item) => item.id}
          renderItem={renderClienteItem}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={reload}
              colors={[colors.primary]}
              tintColor={colors.primary}
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
    backgroundColor: colors.background,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 10,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: 12,
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
    fontFamily: fonts.regular,
    color: colors.text,
    paddingVertical: 0,
  },
  clearSearchText: {
    fontSize: 14,
    color: colors.textMuted,
    paddingHorizontal: 4,
  },
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  clienteNome: {
    fontSize: 16,
    fontFamily: fonts.bold,
    color: colors.text,
    flex: 1,
    marginRight: 8,
  },
  clienteInfo: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  infoLabel: {
    fontFamily: fonts.semibold,
    color: colors.textMuted,
  },
  clienteEndereco: {
    fontSize: 12,
    color: colors.primary,
    marginTop: 4,
    fontFamily: fonts.medium,
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
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
  errorIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  errorTitle: {
    fontSize: 16,
    fontFamily: fonts.bold,
    color: colors.danger,
    marginBottom: 4,
  },
  errorMessage: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: colors.textSecondary,
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 20,
    maxWidth: 280,
  },
});
