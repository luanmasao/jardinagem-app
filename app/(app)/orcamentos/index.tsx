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
import { STATUS_FILTROS_ORCAMENTO } from '../../../src/presentation/utils/status-orcamento.utils';
import { colors, fonts } from '../../../src/presentation/theme';
import { Button, Icon, StatusBadge } from '../../../src/presentation/components/ui';

/** Iniciais exibidas no círculo do card (até duas letras do nome do cliente). */
function iniciaisDoCliente(nome?: string): string {
  const partes = (nome || '').trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';
  const primeira = partes[0].charAt(0);
  const ultima = partes.length > 1 ? partes[partes.length - 1].charAt(0) : '';
  return (primeira + ultima).toUpperCase();
}

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
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => router.push(`/orcamentos/${item.id}` as any)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarTexto}>{iniciaisDoCliente(item.clienteNome)}</Text>
          </View>
          <View style={styles.headerLeft}>
            <Text style={styles.clienteText} numberOfLines={1}>
              {item.clienteNome || 'Cliente não identificado'}
            </Text>
            <Text style={styles.numeroText}>
              {item.numero} · criado em {formatarData(item.dataCriacao)}
            </Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.statusCol}>
            <StatusBadge status={item.status} />
            {item.dataValidade ? (
              <Text style={styles.validadeText}>Validade {formatarData(item.dataValidade)}</Text>
            ) : null}
          </View>
          <Text style={styles.totalValor}>{formatarMoeda(item.total)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.topo}>
        <View style={styles.searchBar}>
          <Icon name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por número ou cliente..."
            placeholderTextColor={colors.textPlaceholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 ? (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel="Limpar busca"
            >
              <Icon name="close" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>

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
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
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
          <Button title="Tentar Novamente" size="compact" onPress={reload} />
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
                <Button
                  title="Criar Orçamento"
                  size="compact"
                  onPress={() => router.push('/orcamentos/novo' as any)}
                />
              ) : null}
            </View>
          }
        />
      )}

      {/* Botão flutuante de criação */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() => router.push('/orcamentos/novo' as any)}
        accessibilityRole="button"
        accessibilityLabel="Novo orçamento"
      >
        <Icon name="plus" size={22} color={colors.textOnColor} />
        <Text style={styles.fabTexto}>Novo</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topo: {
    paddingTop: 14,
    gap: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    height: 48,
    paddingHorizontal: 14,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: fonts.regular,
    color: colors.text,
    paddingVertical: 0,
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingBottom: 4,
    gap: 8,
  },
  filterChip: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  filterChipSelected: {
    backgroundColor: colors.primaryDark,
    borderColor: colors.primaryDark,
  },
  filterChipText: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: colors.text,
  },
  filterChipTextSelected: {
    color: colors.textOnColor,
    fontFamily: fonts.bold,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    gap: 14,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarTexto: {
    fontSize: 14,
    fontFamily: fonts.extrabold,
    color: colors.primaryDark,
  },
  headerLeft: {
    flex: 1,
  },
  clienteText: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: colors.text,
  },
  numeroText: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusCol: {
    flex: 1,
    gap: 4,
  },
  validadeText: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
  totalValor: {
    fontSize: 18,
    fontFamily: fonts.extrabold,
    color: colors.text,
    marginLeft: 12,
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
    fontFamily: fonts.regular,
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
    fontFamily: fonts.regular,
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: fonts.bold,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 56,
    paddingLeft: 16,
    paddingRight: 20,
    borderRadius: 18,
    backgroundColor: colors.primary,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  fabTexto: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: colors.textOnColor,
  },
});
