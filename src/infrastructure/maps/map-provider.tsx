import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import MapView, {
  Marker,
  Polygon,
  Polyline,
  PROVIDER_GOOGLE,
  MapPressEvent,
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
  modoMapa = 'satellite',
  vertices = [],
  onAdicionarVertice,
  desenhoHabilitado = true,
  estilo,
  children,
}) => {
  const [mapReady, setMapReady] = React.useState(false);

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

  return (
    <MapErrorBoundary>
      <View style={[styles.container, estilo]}>
        <MapView
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
          {/* Renderiza marcadores para cada vértice inserido */}
          {vertices.map((vertice, index) => (
            <Marker
              key={`vertex-${index}-${vertice.latitude}-${vertice.longitude}`}
              coordinate={vertice}
              title={`Vértice ${index + 1}`}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View style={styles.vertexMarker}>
                <Text style={styles.vertexMarkerText}>{index + 1}</Text>
              </View>
            </Marker>
          ))}

          {/* Se houver exatamente 2 vértices, desenha uma linha conectando-os */}
          {vertices.length === 2 && (
            <Polyline
              coordinates={vertices}
              strokeColor="#4CAF50"
              strokeWidth={3}
              lineDashPattern={[5, 5]}
            />
          )}

          {/* Se houver 3 ou mais vértices, renderiza o polígono fechado em tempo real */}
          {vertices.length >= 3 && (
            <Polygon
              coordinates={vertices}
              strokeColor="#2E7D32"
              fillColor="rgba(46, 125, 50, 0.45)"
              strokeWidth={3}
            />
          )}

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
