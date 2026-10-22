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
import { useServicos } from '../../../src/presentation/hooks/use-servicos';
import { Servico } from '../../../src/domain/entities/servico';
import { colors } from '../../../src/presentation/theme';
import { Badge, Button } from '../../../src/presentation/components/ui';

export default function ServicosListScreen() {
  const router = useRouter();
  const {
    filteredServicos,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    reload,
  } = useServicos();

  const formatarPreco = (valor: number): string => {
    return `R$ ${valor.toFixed(2).replace('.', ',')}`;
  };

  const renderServicoItem = ({ item }: { item: Servico }) => {
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => router.push(`/servicos/${item.id}` as any)}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.servicoNome} numberOfLines={1}>
            {item.nome}
          </Text>
          <Badge label={item.ativo ? 'Ativo' : 'Inativo'} tone={item.ativo ? 'success' : 'danger'} />
        </View>

        {item.descricao ? (
          <Text style={styles.servicoDescricao} numberOfLines={2}>
            {item.descricao}
          </Text>
        ) : null}

        <View style={styles.footerRow}>
          <View style={styles.badgeUnidade}>
            <Text style={styles.unidadeText}>{item.unidade}</Text>
          </View>

          {item.usaMedicaoArea ? (
            <View style={styles.badgeArea}>
              <Text style={styles.areaText}>📐 Medição de Área</Text>
            </View>
          ) : null}

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
            placeholderTextColor={colors.textPlaceholder}
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

        <Button
          title="+ Novo"
          size="compact"
          onPress={() => router.push('/servicos/novo' as any)}
          accessibilityLabel="Novo serviço"
        />
      </View>

      {/* Conteúdo Principal: Loading, Erro, Vazio ou Lista */}
      {isLoading && filteredServicos.length === 0 ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Carregando serviços...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Erro ao carregar serviços</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <Button title="Tentar Novamente" size="compact" onPress={reload} />
        </View>
      ) : filteredServicos.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyIcon}>🌿</Text>
          <Text style={styles.emptyTitle}>
            {searchQuery ? 'Nenhum serviço encontrado' : 'Nenhum serviço cadastrado'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {searchQuery
              ? 'Tente ajustar os termos da busca.'
              : 'Cadastre seus serviços de jardinagem e paisagismo para utilizar nos orçamentos.'}
          </Text>
          {!searchQuery && (
            <Button
              title="Cadastrar Primeiro Serviço"
              size="compact"
              onPress={() => router.push('/servicos/novo' as any)}
            />
          )}
        </View>
      ) : (
        <FlatList
          data={filteredServicos}
          keyExtractor={(item) => item.id}
          renderItem={renderServicoItem}
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
    marginBottom: 6,
  },
  servicoNome: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
    marginRight: 8,
  },
  servicoDescricao: {
    fontSize: 13,
    color: colors.textSecondary,
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
    backgroundColor: colors.infoSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  unidadeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.info,
  },
  badgeArea: {
    backgroundColor: colors.warningSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginLeft: 6,
  },
  areaText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.warning,
  },
  precoText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
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
    color: colors.textMuted,
  },
  errorIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.danger,
    marginBottom: 4,
  },
  errorMessage: {
    fontSize: 13,
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
    fontWeight: 'bold',
    color: colors.textSecondary,
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 20,
    maxWidth: 280,
  },
});
