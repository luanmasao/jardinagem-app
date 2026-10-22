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
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useOrcamentos } from '../../../src/presentation/hooks/use-orcamentos';
import { OrcamentoResumo } from '../../../src/domain/repositories/orcamento.repository.interface';
import { StatusOrcamento } from '../../../src/domain/enums/status-orcamento';
import { formatarDataCivil } from '../../../src/presentation/utils/data-formatters';
import {
  STATUS_FILTROS_ORCAMENTO,
  obterBadgeStatusOrcamento,
} from '../../../src/presentation/utils/status-orcamento.utils';
import { colors } from '../../../src/presentation/theme';

export default function OrcamentosListScreen() {
  const router = useRouter();
  const {
    filteredOrcamentos,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    filtroStatus,
    setFiltroStatus,
    reload,
  } = useOrcamentos();

  const formatarMoeda = (valor: number): string => {
    return `R$ ${valor.toFixed(2).replace('.', ',')}`;
  };

  const formatarData = (data: Date): string => {
    return formatarDataCivil(data);
  };

  const renderOrcamentoItem = ({ item }: { item: OrcamentoResumo }) => {
    const badge = obterBadgeStatusOrcamento(item.status);
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => router.push(`/orcamentos/${item.id}` as any)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <Text style={styles.numeroText}>{item.numero}</Text>
            <Text style={styles.clienteText} numberOfLines={1}>
              {item.clienteNome || 'Cliente não identificado'}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
            <Text style={[styles.statusBadgeText, { color: badge.text }]}>
              {badge.label}
            </Text>
          </View>
        </View>

        <View style={styles.cardDivider} />

        <View style={styles.cardFooter}>
          <View style={styles.infoCol}>
            <Text style={styles.labelMuted}>Criado em</Text>
            <Text style={styles.infoValor}>{formatarData(item.dataCriacao)}</Text>
          </View>

          {item.dataValidade ? (
            <View style={styles.infoCol}>
              <Text style={styles.labelMuted}>Validade</Text>
              <Text style={styles.infoValor}>{formatarData(item.dataValidade)}</Text>
            </View>
          ) : null}

          <View style={[styles.infoCol, styles.totalCol]}>
            <Text style={styles.labelMuted}>Total</Text>
            <Text style={styles.totalValor}>{formatarMoeda(item.total)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Orçamentos</Text>
          <Text style={styles.headerSubtitle}>Gerencie propostas e itens de orçamento</Text>
        </View>
        <TouchableOpacity
          style={styles.btnNovo}
          activeOpacity={0.8}
          onPress={() => router.push('/orcamentos/novo' as any)}
        >
          <Text style={styles.btnNovoText}>+ Novo</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por número ou cliente..."
          placeholderTextColor={colors.textPlaceholder}
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
        />
      </View>

      <View style={styles.filterScrollWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContainer}
        >
          {STATUS_FILTROS_ORCAMENTO.map((filtro) => {
            const isSelected = filtroStatus === filtro.valor;
            return (
              <TouchableOpacity
                key={filtro.valor}
                style={[styles.filterChip, isSelected && styles.filterChipSelected]}
                onPress={() => setFiltroStatus(filtro.valor)}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterChipText, isSelected && styles.filterChipTextSelected]}>
                  {filtro.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Carregando orçamentos...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={reload}>
            <Text style={styles.retryButtonText}>Tentar Novamente</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredOrcamentos}
          keyExtractor={(item) => item.id}
          renderItem={renderOrcamentoItem}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={reload} colors={[colors.primary]} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>Nenhum orçamento encontrado</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery || filtroStatus !== 'TODOS'
                  ? 'Nenhum resultado corresponde aos filtros aplicados.'
                  : 'Crie seu primeiro orçamento para começar.'}
              </Text>
              {!searchQuery && filtroStatus === 'TODOS' ? (
                <TouchableOpacity
                  style={styles.emptyButton}
                  onPress={() => router.push('/orcamentos/novo' as any)}
                >
                  <Text style={styles.emptyButtonText}>Criar Orçamento</Text>
                </TouchableOpacity>
              ) : null}
            </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  btnNovo: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  btnNovoText: {
    color: colors.textOnColor,
    fontSize: 14,
    fontWeight: '600',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: colors.surface,
  },
  searchInput: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
  },
  filterScrollWrapper: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.surfaceMuted,
    marginRight: 6,
  },
  filterChipSelected: {
    backgroundColor: colors.primary,
  },
  filterChipText: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '500',
  },
  filterChipTextSelected: {
    color: colors.textOnColor,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 2,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
    marginRight: 10,
  },
  numeroText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  clienteText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardDivider: {
    height: 1,
    backgroundColor: colors.surfaceMuted,
    marginVertical: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  infoCol: {
    flex: 1,
  },
  totalCol: {
    alignItems: 'flex-end',
  },
  labelMuted: {
    fontSize: 11,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  infoValor: {
    fontSize: 13,
    color: colors.text,
    marginTop: 2,
    fontWeight: '500',
  },
  totalValor: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 2,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    color: colors.textMuted,
    fontSize: 14,
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: colors.textOnColor,
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  emptyButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: colors.textOnColor,
    fontSize: 14,
    fontWeight: '600',
  },
});
