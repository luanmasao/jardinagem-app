import React, { useState, useMemo } from 'react';
import { StyleSheet, View, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MapaDelimitacao } from '../../../src/presentation/components/mapa/mapa-delimitacao';
import { areaService } from '../../../src/application/services/area.service';
import { GeometriaPoligono } from '../../../src/domain/types/geometria';
import { RegiaoMapa } from '../../../src/infrastructure/maps/map-provider.interface';

/**
 * Tela de Delimitação e Desenho de Área no Mapa.
 * Renderiza o mapa Google Maps em modo Satélite e orquestra a criação via AreaService.
 * Suporta posicionamento inicial pelo imóvel do cliente (RF11 / RN07) ou fallback manual (RF12 / RN09).
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

  // Calcula a região inicial: coordenadas válidas do cliente > região padrão (RF11 / RF12 / DECISÃO-GEO-07)
  const regiaoInicial = useMemo<RegiaoMapa | undefined>(() => {
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
    return undefined; // MapProvider utilizará REGIAO_PADRAO (Praça da Sé, SP)
  }, [lat, lng]);

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
});
