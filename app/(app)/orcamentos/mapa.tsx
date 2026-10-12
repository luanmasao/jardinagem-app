import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Alert, ActivityIndicator, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MapaDelimitacao } from '../../../src/presentation/components/mapa/mapa-delimitacao';
import { areaService } from '../../../src/application/services/area.service';
import { GeometriaPoligono } from '../../../src/domain/types/geometria';
import { RegiaoMapa } from '../../../src/infrastructure/maps/map-provider.interface';
import { deviceLocationService } from '../../../src/infrastructure/services/location';

/**
 * Tela de Delimitação e Desenho de Área no Mapa.
 * Renderiza o mapa Google Maps em modo Satélite e orquestra a criação via AreaService.
 * Hierarquia de posicionamento inicial:
 * 1. Imóvel do cliente quando disponível (RF11 / RN07);
 * 2. Localização atual do dispositivo Android como fallback automático (RF12 / RN09 / Opção 2B);
 * 3. Região padrão para delimitação e navegação manual caso sem permissão/GPS (RF12 / RN09).
 */
export default function DelimitacaoMapaScreen() {
  const router = useRouter();
  const { itemId, lat, lng } = useLocalSearchParams<{
    orcamentoId: string;
    itemId: string;
    lat?: string;
    lng?: string;
  }>();
  const [salvando, setSalvando] = useState(false);

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
  const [carregandoPosicao, setCarregandoPosicao] = useState<boolean>(!coordenadasCliente);

  // Fallback 2B: Se cliente não tiver localização, busca posição atual do dispositivo (RF12 / RN09)
  useEffect(() => {
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
  }, [coordenadasCliente]);

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
      await areaService.criarArea({
        itemOrcamentoId: itemId,
        nome: dados.nome,
        observacoes: dados.observacoes,
        geometria: dados.geometria,
      });

      Alert.alert('Sucesso', 'Área delimitada e calculada com sucesso!', [
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

  if (carregandoPosicao) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FFFFFF" />
        <Text style={styles.loadingText}>Obtendo localização para o mapa...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapaDelimitacao
        regiaoInicial={regiaoInicial}
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
    backgroundColor: '#000000',
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
  },
});
