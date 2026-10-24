import { ConectividadeProvider } from '../../application/interfaces/conectividade-provider.interface';

export interface EstadoRede {
  isConnected?: boolean;
  isInternetReachable?: boolean;
}

export interface ExpoNetworkModule {
  getNetworkStateAsync(): Promise<EstadoRede>;
  addNetworkStateListener(listener: (estado: EstadoRede) => void): { remove(): void };
}

/**
 * Online quando há conexão ativa e a internet não foi dada como inalcançável.
 * `isInternetReachable` indefinido (ainda não verificado) não bloqueia.
 */
export function estadoEstaOnline(estado: EstadoRede): boolean {
  return estado.isConnected === true && estado.isInternetReachable !== false;
}

/**
 * Provedor de conectividade baseado no expo-network (D-OFF-08).
 * O módulo nativo é carregado sob demanda, para os testes em Node.js poderem injetar um substituto.
 */
export class ExpoNetworkConectividadeProvider implements ConectividadeProvider {
  private modulo: ExpoNetworkModule | null = null;
  /** O módulo nativo não existe neste ambiente (ex.: testes em Node.js): assume online sem novos avisos. */
  private indisponivel = false;

  constructor(private readonly moduloInjetado?: ExpoNetworkModule) {}

  async estaOnline(): Promise<boolean> {
    if (this.indisponivel) return true;
    try {
      const network = this.carregarModulo();
      return estadoEstaOnline(await network.getNetworkStateAsync());
    } catch (err) {
      // Sem como consultar o estado: assume online e deixa a requisição real decidir.
      console.warn('[ConectividadeProvider] Falha ao consultar o estado da rede:', err);
      return true;
    }
  }

  observar(callback: (online: boolean) => void): () => void {
    try {
      const assinatura = this.carregarModulo().addNetworkStateListener((estado) =>
        callback(estadoEstaOnline(estado))
      );
      return () => assinatura.remove();
    } catch (err) {
      console.warn('[ConectividadeProvider] Falha ao observar o estado da rede:', err);
      return () => {};
    }
  }

  private carregarModulo(): ExpoNetworkModule {
    if (this.moduloInjetado) return this.moduloInjetado;
    if (!this.modulo) {
      // require() síncrono e sob demanda: a importação dinâmica (import()) não resolvia no
      // bundle de desenvolvimento do Metro, e um import estático quebraria os testes em Node.js.
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        this.modulo = require('expo-network') as ExpoNetworkModule;
      } catch (err) {
        this.indisponivel = true;
        throw err;
      }
    }
    return this.modulo;
  }
}

export const conectividadeProvider = new ExpoNetworkConectividadeProvider();
