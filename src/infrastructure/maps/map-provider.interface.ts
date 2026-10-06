/**
 * Interfaces e tipos para o provedor de mapas (MapProvider).
 * Desacopla a camada de apresentação dos detalhes específicos de react-native-maps / Google Maps.
 */

export interface CoordenadaMapa {
  latitude: number;
  longitude: number;
}

export interface RegiaoMapa {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

export type ModoMapa = 'satellite' | 'standard' | 'hybrid';

export interface MapProviderProps {
  regiaoInicial?: RegiaoMapa;
  modoMapa?: ModoMapa;
  vertices: CoordenadaMapa[];
  onAdicionarVertice?: (coordenada: CoordenadaMapa) => void;
  desenhoHabilitado?: boolean;
  estilo?: any;
  children?: React.ReactNode;
}
