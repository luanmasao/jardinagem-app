/**
 * Interfaces e serviço de obtenção da localização atual do dispositivo Android (RF12 / RN09).
 * Utilizado como fallback para posicionar o mapa quando o cliente não possuir endereço ou coordenadas.
 */

export interface CoordenadasDispositivo {
  latitude: number;
  longitude: number;
}

export interface ExpoLocationDeviceModule {
  getForegroundPermissionsAsync?: () => Promise<{
    status: string;
    granted: boolean;
    canAskAgain?: boolean;
    expires?: string | number;
  }>;
  requestForegroundPermissionsAsync?: () => Promise<{
    status: string;
    granted: boolean;
    canAskAgain?: boolean;
    expires?: string | number;
  }>;
  getCurrentPositionAsync?: (options?: {
    accuracy?: number;
  }) => Promise<{
    coords: {
      latitude: number;
      longitude: number;
    };
  }>;
  Accuracy?: {
    Lowest: number;
    Low: number;
    Balanced: number;
    High: number;
    Highest: number;
    BestForNavigation: number;
  };
}

export interface ObterLocalizacaoOptions {
  timeoutMs?: number;
}

export class DeviceLocationService {
  private readonly defaultTimeoutMs: number;
  private readonly locationModuleLoader?: () => Promise<ExpoLocationDeviceModule>;

  constructor(
    defaultTimeoutMs: number = 5000,
    locationModuleLoader?: () => Promise<ExpoLocationDeviceModule>
  ) {
    this.defaultTimeoutMs = defaultTimeoutMs;
    this.locationModuleLoader = locationModuleLoader;
  }

  async obterLocalizacaoAtual(
    options?: ObterLocalizacaoOptions
  ): Promise<CoordenadasDispositivo | null> {
    const timeoutMs = options?.timeoutMs ?? this.defaultTimeoutMs;

    try {
      let Location: ExpoLocationDeviceModule;
      try {
        Location = await (this.locationModuleLoader
          ? this.locationModuleLoader()
          : (import('expo-location') as Promise<unknown> as Promise<ExpoLocationDeviceModule>));
      } catch (err) {
        console.warn('[DeviceLocationService] Módulo expo-location indisponível:', err);
        return null;
      }

      if (typeof Location.getForegroundPermissionsAsync === 'function') {
        let permissao = await Location.getForegroundPermissionsAsync();
        if (permissao.status !== 'granted') {
          if (typeof Location.requestForegroundPermissionsAsync === 'function') {
            permissao = await Location.requestForegroundPermissionsAsync();
          }
        }

        if (permissao.status !== 'granted') {
          console.info('[DeviceLocationService] Permissão de localização em primeiro plano não concedida.');
          return null;
        }
      }

      if (typeof Location.getCurrentPositionAsync !== 'function') {
        console.warn('[DeviceLocationService] getCurrentPositionAsync não implementado no módulo.');
        return null;
      }

      const accuracy = Location.Accuracy?.Balanced ?? 3;

      let timer: ReturnType<typeof setTimeout> | null = null;
      const promisePosicao = Location.getCurrentPositionAsync({ accuracy });
      const promiseTimeout = new Promise<null>((_, reject) => {
        timer = setTimeout(() => reject(new Error('TIMEOUT_LOCALIZACAO')), timeoutMs);
      });

      const resultado = await Promise.race([promisePosicao, promiseTimeout]).finally(() => {
        if (timer) clearTimeout(timer);
      });

      if (!resultado || !('coords' in resultado) || !resultado.coords) {
        return null;
      }

      const { latitude, longitude } = resultado.coords;

      if (
        typeof latitude === 'number' &&
        typeof longitude === 'number' &&
        !isNaN(latitude) &&
        !isNaN(longitude) &&
        latitude >= -90.0 &&
        latitude <= 90.0 &&
        longitude >= -180.0 &&
        longitude <= 180.0
      ) {
        return { latitude, longitude };
      }

      return null;
    } catch (err) {
      console.warn('[DeviceLocationService] Falha ao obter localização do dispositivo:', err);
      return null;
    }
  }
}

export const deviceLocationService = new DeviceLocationService();
