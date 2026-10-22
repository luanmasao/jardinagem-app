import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Alert, ActivityIndicator, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  MapaDelimitacao,
  AreaEmEdicao,
} from '../../../src/presentation/components/mapa/mapa-delimitacao';
import {
  verticesDaGeometria,
  regiaoDosVertices,
} from '../../../src/presentation/utils/mapa-vertices.utils';
import { areaService } from '../../../src/application/services/area.service';
import { GeometriaPoligono } from '../../../src/domain/types/geometria';
import { RegiaoMapa } from '../../../src/infrastructure/maps/map-provider.interface';
import { deviceLocationService } from '../../../src/infrastructure/services/location';
import { colors, fonts } from '../../../src/presentation/theme';

/**
 * Tela de Delimitação e Desenho de Área no Mapa.
 * Renderiza o mapa Google Maps em modo Satélite e orquestra a criação via AreaService.
 * Hierarquia de posicionamento inicial:
 * 1. Imóvel do cliente quando disponível (RF11 / RN07);
 * 2. Localização atual do dispositivo Android como fallback automático (RF12 / RN09 / Opção 2B);
 * 3. Região padrão para delimitação e navegação manual caso sem permissão/GPS (RF12 / RN09).
 * Com `areaId`, edita uma área já salva (RF45/RF46): o mapa abre centralizado nela, com seus
 * vértices, e o salvamento atualiza a área, recalculando item e orçamento (RF47).
 */
export default function DelimitacaoMapaScreen() {
  const router = useRouter();
  const { itemId, areaId, lat, lng } = useLocalSearchParams<{
    orcamentoId: string;
    itemId: string;
    areaId?: string;
    lat?: string;
    lng?: string;
  }>();
  const [salvando, setSalvando] = useState(false);
  const [areaEmEdicao, setAreaEmEdicao] = useState<AreaEmEdicao | null>(null);
  const [carregandoArea, setCarregandoArea] = useState<boolean>(!!areaId);

  // Verifica se coordenadas do cliente foram informadas via parâmetros da rota
  const coordenadasCliente = React.useMemo<RegiaoMapa | null>(() => {
    if (lat && lng) {
      const latitude = Number(lat);
      const longitude = Number(lng);
      if (
        !isNaN(latitude) &&
        !isNaN(longitude) &&
        latitude >= -90.0 &&
        latitude <= 90.0 &&
        longitude >= -180.0 &&
        longitude <= 180.0
      ) {
        return {
          latitude,
          longitude,
          latitudeDelta: 0.003, // Zoom de alta resolução (~300m) adequado para lote/jardim
          longitudeDelta: 0.003,
        };
      }
    }
    return null;
  }, [lat, lng]);

  const [regiaoInicial, setRegiaoInicial] = useState<RegiaoMapa | undefined>(
    coordenadasCliente ?? undefined
  );
  const [carregandoPosicao, setCarregandoPosicao] = useState<boolean>(!coordenadasCliente && !areaId);

  // Edição: carrega a área salva e centraliza o mapa nela
  useEffect(() => {
    if (!areaId) return;

    let montado = true;
    const carregarArea = async () => {
      try {
        const area = await areaService.obterArea(areaId);
        if (!montado) return;
        if (!area) {
          Alert.alert('Área não encontrada', 'Não foi possível carregar a área para edição.', [
            { text: 'OK', onPress: () => router.back() },
          ]);
          return;
        }
        const vertices = verticesDaGeometria(area.geometria);
        setAreaEmEdicao({
          vertices,
          nome: area.nome ?? '',
          observacoes: area.observacoes ?? '',
        });
        setRegiaoInicial(regiaoDosVertices(vertices) ?? undefined);
      } catch (err) {
        if (!montado) return;
        const msg = err instanceof Error ? err.message : 'Falha ao carregar a área.';
        Alert.alert('Erro', msg, [{ text: 'OK', onPress: () => router.back() }]);
      } finally {
        if (montado) setCarregandoArea(false);
      }
    };

    carregarArea();

    return () => {
      montado = false;
    };
  }, [areaId, router]);

  // Fallback 2B: Se cliente não tiver localização, busca posição atual do dispositivo (RF12 / RN09)
  useEffect(() => {
    // Na edição, a região vem da própria área
    if (areaId) return;

    if (coordenadasCliente) {
      setRegiaoInicial(coordenadasCliente);
      setCarregandoPosicao(false);
      return;
    }

    let montado = true;
    const buscarPosicaoDispositivo = async () => {
      try {
        const pos = await deviceLocationService.obterLocalizacaoAtual({ timeoutMs: 5000 });
        if (montado && pos) {
          setRegiaoInicial({
            latitude: pos.latitude,
            longitude: pos.longitude,
            latitudeDelta: 0.003,
            longitudeDelta: 0.003,
          });
        }
      } catch (err) {
        console.warn('Erro ao obter localização do dispositivo para o mapa:', err);
      } finally {
        if (montado) {
          setCarregandoPosicao(false);
        }
      }
    };

    buscarPosicaoDispositivo();

    return () => {
      montado = false;
    };
  }, [coordenadasCliente, areaId]);

  const handleSalvarArea = async (dados: {
    nome: string;
    observacoes?: string | null;
    geometria: GeometriaPoligono;
  }) => {
    if (!itemId) {
      Alert.alert('Erro', 'Item de orçamento não informado.');
      return;
    }

    setSalvando(true);
    try {
      if (areaId) {
        await areaService.atualizarArea(areaId, {
          nome: dados.nome,
          observacoes: dados.observacoes,
          geometria: dados.geometria,
        });
      } else {
        await areaService.criarArea({
          itemOrcamentoId: itemId,
          nome: dados.nome,
          observacoes: dados.observacoes,
          geometria: dados.geometria,
        });
      }

      const mensagem = areaId
        ? 'Área atualizada e metragem recalculada com sucesso!'
        : 'Área delimitada e calculada com sucesso!';
      Alert.alert('Sucesso', mensagem, [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao salvar área delimitada.';
      Alert.alert('Erro ao Salvar', msg);
    } finally {
      setSalvando(false);
    }
  };

  const handleCancelar = () => {
    router.back();
  };

  // Na edição, o mapa só monta com a área carregada (o desenho começa com os vértices dela)
  if (carregandoPosicao || carregandoArea || (areaId && !areaEmEdicao)) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.surface} />
        <Text style={styles.loadingText}>
          {areaId ? 'Carregando área para edição...' : 'Obtendo localização para o mapa...'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapaDelimitacao
        regiaoInicial={regiaoInicial}
        areaInicial={areaEmEdicao ?? undefined}
        onSalvarArea={handleSalvarArea}
        onCancelar={handleCancelar}
        salvando={salvando}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: colors.textOnColor,
    marginTop: 12,
    fontSize: 14,
    fontFamily: fonts.semibold,
  },
});
