import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import MapView, {
  Marker,
  Polygon,
  Polyline,
  PROVIDER_GOOGLE,
  MapPressEvent,
  MarkerDragStartEndEvent,
  Region,
} from 'react-native-maps';
import { MapProviderProps, CoordenadaMapa } from './map-provider.interface';

// Região padrão inicial (Praça da Sé, São Paulo - centro de referência SP)
const REGIAO_PADRAO: Region = {
  latitude: -23.55052,
  longitude: -46.633308,
  latitudeDelta: 0.005,
  longitudeDelta: 0.005,
};

interface State {
  hasError: boolean;
  errorMessage: string | null;
}

/**
 * ErrorBoundary específico para isolar eventuais falhas do componente nativo de mapas.
 */
class MapErrorBoundary extends Component<{ children: ReactNode }, State> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn('[MapProvider] Erro ao carregar componente de mapa:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.fallbackContainer}>
          <Text style={styles.fallbackTitle}>Mapa Indisponível</Text>
          <Text style={styles.fallbackMessage}>
            Não foi possível carregar a visualização geográfica no momento.
          </Text>
          {this.state.errorMessage ? (
            <Text style={styles.fallbackDetails}>{this.state.errorMessage}</Text>
          ) : null}
        </View>
      );
    }
    return this.props.children;
  }
}

/**
 * MapProvider: Implementação da abstração de mapa utilizando react-native-maps e Google Maps no Android.
 * Suporta modo satélite nativo e desenho interativo de polígonos.
 */
export const MapProvider: React.FC<MapProviderProps> = ({
  regiaoInicial,
  regiaoFoco,
  pontoPesquisado,
  modoMapa = 'satellite',
  vertices = [],
  onAdicionarVertice,
  onMoverVertice,
  desenhoHabilitado = true,
  estilo,
  children,
}) => {
  const [mapReady, setMapReady] = React.useState(false);
  const mapRef = React.useRef<MapView>(null);

  React.useEffect(() => {
    if (regiaoFoco && mapRef.current) {
      mapRef.current.animateToRegion(regiaoFoco, 600);
    }
  }, [regiaoFoco]);

  const initialRegion: Region = regiaoInicial || {
    ...REGIAO_PADRAO,
    latitude: vertices.length > 0 ? vertices[0].latitude : REGIAO_PADRAO.latitude,
    longitude: vertices.length > 0 ? vertices[0].longitude : REGIAO_PADRAO.longitude,
  };

  const handleMapPress = (e: MapPressEvent) => {
    if (!desenhoHabilitado || !onAdicionarVertice) return;
    const coord: CoordenadaMapa = {
      latitude: e.nativeEvent.coordinate.latitude,
      longitude: e.nativeEvent.coordinate.longitude,
    };
    onAdicionarVertice(coord);
  };

  const verticesArrastaveis = desenhoHabilitado && !!onMoverVertice;

  const handleSoltarVertice = (indice: number, e: MarkerDragStartEndEvent) => {
    if (!verticesArrastaveis || !onMoverVertice) return;
    onMoverVertice(indice, {
      latitude: e.nativeEvent.coordinate.latitude,
      longitude: e.nativeEvent.coordinate.longitude,
    });
  };

  return (
    <MapErrorBoundary>
      <View style={[styles.container, estilo]}>
        <MapView
          ref={mapRef}
          testID="map-provider-view"
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          style={StyleSheet.absoluteFill}
          mapType={modoMapa}
          initialRegion={initialRegion}
          onMapReady={() => setMapReady(true)}
          onPress={handleMapPress}
          showsUserLocation={false}
          showsMyLocationButton={false}
          showsCompass={true}
          showsScale={true}
        >
          {/* Marcador de referência do endereço pesquisado */}
          {pontoPesquisado && (
            <Marker
              key={`pesquisa-${pontoPesquisado.latitude}-${pontoPesquisado.longitude}`}
              coordinate={pontoPesquisado}
              title="Endereço pesquisado"
              pinColor="#1E88E5"
            />
          )}

          {/* Marcadores dos vértices: toque longo + arrastar reposiciona o ponto (ajuste fino).
              Sem title, para que um toque simples no ponto não abra a etiqueta do Google Maps. */}
          {vertices.map((vertice, index) => (
            <Marker
              key={`vertex-${index}-${vertice.latitude}-${vertice.longitude}`}
              coordinate={vertice}
              anchor={{ x: 0.5, y: 0.5 }}
              draggable={verticesArrastaveis}
              onDragEnd={(e) => handleSoltarVertice(index, e)}
            >
              <View style={styles.vertexMarker}>
                <Text style={styles.vertexMarkerText}>{index + 1}</Text>
              </View>
            </Marker>
          ))}

          {/* Linha conectando exatamente 2 vértices (mantida sempre montada para contornar retenção no Fabric/Android) */}
          <Polyline
            coordinates={vertices.length === 2 ? vertices : [REGIAO_PADRAO, REGIAO_PADRAO]}
            strokeColor={vertices.length === 2 ? '#4CAF50' : 'rgba(0, 0, 0, 0)'}
            strokeWidth={vertices.length === 2 ? 3 : 0}
            lineDashPattern={[5, 5]}
          />

          {/* Polígono fechado em tempo real (mantido sempre montado para atualizar coordenadas sem reter geometria ao desfazer/limpar) */}
          <Polygon
            coordinates={vertices.length >= 3 ? vertices : [REGIAO_PADRAO, REGIAO_PADRAO, REGIAO_PADRAO]}
            strokeColor={vertices.length >= 3 ? '#2E7D32' : 'rgba(0, 0, 0, 0)'}
            fillColor={vertices.length >= 3 ? 'rgba(46, 125, 50, 0.45)' : 'rgba(0, 0, 0, 0)'}
            strokeWidth={vertices.length >= 3 ? 3 : 0}
          />

          {children}
        </MapView>

        {!mapReady && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.loadingText}>Carregando Satélite...</Text>
          </View>
        )}
      </View>
    </MapErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E1E1E',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  vertexMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2E7D32',
    borderColor: '#FFFFFF',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  vertexMarkerText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  fallbackContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#263238',
  },
  fallbackTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  fallbackMessage: {
    color: '#CFD8DC',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
  },
  fallbackDetails: {
    color: '#FF8A80',
    fontSize: 12,
    textAlign: 'center',
  },
});
