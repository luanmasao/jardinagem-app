import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAreas } from '../../../src/presentation/hooks/use-areas';
import { supabaseOrcamentoRepository } from '../../../src/infrastructure/repositories/supabase-orcamento.repository';
import { supabaseItemOrcamentoRepository } from '../../../src/infrastructure/repositories/supabase-item-orcamento.repository';
import { clienteService } from '../../../src/application/services/cliente.service';
import { StatusOrcamento } from '../../../src/domain/enums/status-orcamento';
import { ItemOrcamento } from '../../../src/domain/entities/item-orcamento';

const formatarMoeda = (valor: number): string => `R$ ${valor.toFixed(2).replace('.', ',')}`;

/**
 * Tela de Gestão de Áreas do Item de Orçamento.
 * Exibe a lista das áreas já delimitadas, metragem total e botão para abrir o mapa.
 */
export default function AreasItemScreen() {
  const router = useRouter();
  const { orcamentoId, itemId } = useLocalSearchParams<{ orcamentoId: string; itemId: string }>();

  const [item, setItem] = useState<ItemOrcamento | null>(null);
  const [statusOrcamento, setStatusOrcamento] = useState<StatusOrcamento | null>(null);
  const [clienteId, setClienteId] = useState<string | null>(null);
  const [carregandoItem, setCarregandoItem] = useState<boolean>(true);

  const { areas, loading: loadingAreas, error: errorAreas, metragemTotal, carregarAreas, removerArea } =
    useAreas(itemId || '');

  const carregarItemEOrcamento = async () => {
    if (!orcamentoId || !itemId) return;
    setCarregandoItem(true);
    try {
      const orcDetalhe = await supabaseOrcamentoRepository.buscarPorId(orcamentoId);
      if (orcDetalhe) {
        setStatusOrcamento(orcDetalhe.orcamento.status);
        setClienteId(orcDetalhe.orcamento.clienteId);
        const itemEncontrado = orcDetalhe.orcamento.itens.find((it) => it.id === itemId);
        if (itemEncontrado) {
          setItem(itemEncontrado);
        } else {
          // Fallback consulta direta do item
          const itDireto = await supabaseItemOrcamentoRepository.buscarPorId(itemId);
          setItem(itDireto);
        }
      }
    } catch (err) {
      console.warn('Erro ao carregar dados do item/orçamento:', err);
    } finally {
      setCarregandoItem(false);
    }
  };

  useEffect(() => {
    carregarItemEOrcamento();
  }, [orcamentoId, itemId]);

  const isRascunho = statusOrcamento === StatusOrcamento.RASCUNHO;

  const handleExcluirArea = (areaId: string, areaNome: string) => {
    if (!isRascunho) {
      Alert.alert(
        'Ação Bloqueada',
        'Áreas só podem ser excluídas enquanto o orçamento estiver em status RASCUNHO.'
      );
      return;
    }

    Alert.alert(
      'Excluir Área',
      `Deseja realmente excluir a área "${areaNome}"? A metragem do item será recalculada.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await removerArea(areaId);
              await carregarItemEOrcamento();
              Alert.alert('Sucesso', 'Área removida com sucesso.');
            } catch (err) {
              const msg = err instanceof Error ? err.message : 'Falha ao remover área.';
              Alert.alert('Erro', msg);
            }
          },
        },
      ]
    );
  };

  const handleAbrirMapa = async () => {
    if (!isRascunho) {
      Alert.alert(
        'Ação Bloqueada',
        'Novas áreas só podem ser delimitadas em orçamentos no status RASCUNHO.'
      );
      return;
    }

    let queryCoords = '';
    if (clienteId) {
      try {
        const cliente = await clienteService.obterCliente(clienteId);
        const lat = cliente?.endereco?.latitude;
        const lng = cliente?.endereco?.longitude;
        if (
          lat != null &&
          lng != null &&
          !isNaN(lat) &&
          !isNaN(lng) &&
          lat >= -90.0 &&
          lat <= 90.0 &&
          lng >= -180.0 &&
          lng <= 180.0
        ) {
          queryCoords = `&lat=${lat}&lng=${lng}`;
        }
      } catch (err) {
        console.warn('Não foi possível obter coordenadas do cliente para o mapa:', err);
      }
    }

    router.push(`/orcamentos/mapa?orcamentoId=${orcamentoId}&itemId=${itemId}${queryCoords}` as any);
  };

  if (carregandoItem || loadingAreas) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2E7D32" />
        <Text style={styles.loadingText}>Carregando áreas do item...</Text>
      </View>
    );
  }

  const valorUnitario = item?.valorUnitario || 0;
  const valorTotalItem = metragemTotal * valorUnitario;

  return (
    <View style={styles.container}>
      {/* Card Informativo do Item e Metragem */}
      <View style={styles.headerCard}>
        <View style={styles.tipoBadge}>
          <Text style={styles.tipoBadgeText}>SERVIÇO COM MEDIÇÃO DE ÁREA</Text>
        </View>
        <Text style={styles.itemDescricao}>{item?.descricao || 'Item de Serviço'}</Text>
        <Text style={styles.itemPrecoBase}>
          Valor unitário: {formatarMoeda(valorUnitario)} / m²
        </Text>

        <View style={styles.resumoDivider} />

        <View style={styles.resumoMetragemRow}>
          <View>
            <Text style={styles.resumoLabel}>Área Total Medida</Text>
            <Text style={styles.resumoValorMetragem}>{metragemTotal.toFixed(2)} m²</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.resumoLabel}>Valor Total do Item</Text>
            <Text style={styles.resumoValorFinanceiro}>{formatarMoeda(valorTotalItem)}</Text>
          </View>
        </View>
      </View>

      {/* Lista de Áreas */}
      <View style={styles.listaSection}>
        <View style={styles.listaHeader}>
          <Text style={styles.listaTitulo}>
            Áreas Delimitadas ({areas.length})
          </Text>
          {isRascunho && (
            <TouchableOpacity style={styles.btnAtualizar} onPress={carregarAreas}>
              <Text style={styles.btnAtualizarText}>🔄 Atualizar</Text>
            </TouchableOpacity>
          )}
        </View>

        {errorAreas ? (
          <Text style={styles.erroText}>{errorAreas}</Text>
        ) : areas.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🗺️</Text>
            <Text style={styles.emptyTitulo}>Nenhuma área delimitada</Text>
            <Text style={styles.emptySubtitulo}>
              Toque no botão abaixo para abrir o mapa em modo Satélite e delimitar polígonos sobre o terreno.
            </Text>
          </View>
        ) : (
          <FlatList
            data={areas}
            keyExtractor={(a) => a.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item: a, index }) => (
              <View style={styles.areaCard}>
                <View style={styles.areaCardHeader}>
                  <View style={styles.areaNumeroBadge}>
                    <Text style={styles.areaNumeroText}>{index + 1}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={styles.areaNome}>{a.nome || `Área ${index + 1}`}</Text>
                    {a.observacoes ? (
                      <Text style={styles.areaObs}>{a.observacoes}</Text>
                    ) : null}
                  </View>
                  <Text style={styles.areaMetragem}>{a.areaCalculada.toFixed(2)} m²</Text>
                </View>

                <View style={styles.areaCardFooter}>
                  <Text style={styles.areaVertices}>
                    {a.geometria.coordenadas.length} vértices • Satélite PostGIS
                  </Text>
                  {isRascunho ? (
                    <TouchableOpacity
                      onPress={() => handleExcluirArea(a.id, a.nome || `Área ${index + 1}`)}
                    >
                      <Text style={styles.btnExcluirArea}>Excluir</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            )}
          />
        )}
      </View>

      {/* Botão de Destaque: Delimitar Nova Área no Mapa */}
      {isRascunho ? (
        <View style={styles.footerContainer}>
          <TouchableOpacity
            style={styles.btnDelimitarMapa}
            onPress={handleAbrirMapa}
            activeOpacity={0.8}
          >
            <Text style={styles.btnDelimitarMapaText}>
              🛰️ Delimitar Nova Área no Mapa
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#616161',
  },
  headerCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  tipoBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 6,
  },
  tipoBadgeText: {
    color: '#2E7D32',
    fontSize: 11,
    fontWeight: 'bold',
  },
  itemDescricao: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212121',
  },
  itemPrecoBase: {
    fontSize: 13,
    color: '#757575',
    marginTop: 2,
  },
  resumoDivider: {
    height: 1,
    backgroundColor: '#EEEEEE',
    marginVertical: 12,
  },
  resumoMetragemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resumoLabel: {
    fontSize: 12,
    color: '#757575',
    marginBottom: 2,
  },
  resumoValorMetragem: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  resumoValorFinanceiro: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1565C0',
  },
  listaSection: {
    flex: 1,
    paddingHorizontal: 16,
  },
  listaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  listaTitulo: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#424242',
  },
  btnAtualizar: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#EEEEEE',
  },
  btnAtualizarText: {
    fontSize: 12,
    color: '#616161',
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 80,
  },
  areaCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  areaCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  areaNumeroBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2E7D32',
    alignItems: 'center',
    justifyContent: 'center',
  },
  areaNumeroText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  areaNome: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#212121',
  },
  areaObs: {
    fontSize: 12,
    color: '#757575',
    marginTop: 2,
  },
  areaMetragem: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  areaCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
  },
  areaVertices: {
    fontSize: 11,
    color: '#9E9E9E',
  },
  btnExcluirArea: {
    color: '#D32F2F',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    marginTop: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  emptyTitulo: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#424242',
    marginBottom: 6,
  },
  emptySubtitulo: {
    fontSize: 13,
    color: '#757575',
    textAlign: 'center',
    lineHeight: 18,
  },
  erroText: {
    color: '#D32F2F',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 20,
  },
  footerContainer: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
  },
  btnDelimitarMapa: {
    backgroundColor: '#2E7D32',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  btnDelimitarMapaText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
