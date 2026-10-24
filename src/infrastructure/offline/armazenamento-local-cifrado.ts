import aesjs from 'aes-js';
import { ArmazenamentoLocal } from '../../application/interfaces/armazenamento-local.interface';

// Polyfill do CSPRNG no React Native; em Node.js (testes) o runtime já tem crypto.getRandomValues.
// require() intencional: um import falharia ao carregar o módulo fora do React Native.
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('react-native-get-random-values');
} catch {
  // Ambiente sem bundle React Native (ex.: testes em Node.js com tsx).
}

const CHAVE_MESTRA = 'offline.chave-mestra';

export interface ModuloSecureStore {
  getItemAsync: (key: string) => Promise<string | null>;
  setItemAsync: (key: string, value: string) => Promise<void>;
}

export interface ModuloAsyncStorage {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
  getAllKeys: () => Promise<readonly string[]>;
  multiRemove: (keys: readonly string[]) => Promise<void>;
}

export interface ModulosNativos {
  secureStore: ModuloSecureStore;
  asyncStorage: ModuloAsyncStorage;
}

function carregarModulosNativos(): ModulosNativos | null {
  // require() intencional: sem os módulos nativos (testes em Node.js) usa-se memória.
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const secureStore = require('expo-secure-store');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const asyncStoragePkg = require('@react-native-async-storage/async-storage');
    const asyncStorage = asyncStoragePkg.default || asyncStoragePkg;
    if (typeof secureStore?.getItemAsync === 'function' && typeof asyncStorage?.getItem === 'function') {
      return { secureStore, asyncStorage };
    }
  } catch {
    // Ambiente sem módulos nativos.
  }
  return null;
}

function bytesAleatorios(tamanho: number): Uint8Array {
  if (typeof globalThis.crypto?.getRandomValues !== 'function') {
    throw new Error('[ArmazenamentoLocalCifrado] CSPRNG indisponível: crypto.getRandomValues não está definido.');
  }
  return globalThis.crypto.getRandomValues(new Uint8Array(tamanho));
}

/**
 * Armazenamento local cifrado para operação sem conexão (D-OFF-01).
 *
 * - Uma chave-mestra AES-256 é gerada uma vez e guardada no SecureStore.
 * - Cada valor é cifrado em AES-CTR com um contador inicial aleatório (IV) próprio,
 *   e IV + dados vão juntos numa única entrada do AsyncStorage, então cada gravação é atômica.
 * - Diferente da LargeSecureStore, falhas são propagadas, e não trocadas por memória (RNF39).
 * - Sem módulos nativos (testes em Node.js), usa um Map em memória.
 */
export class ArmazenamentoLocalCifrado implements ArmazenamentoLocal {
  private readonly nativos: ModulosNativos | null;
  private readonly memoria = new Map<string, string>();
  private chaveMestra: Promise<Uint8Array> | null = null;

  constructor(modulos: ModulosNativos | null = carregarModulosNativos()) {
    this.nativos = modulos;
  }

  async ler<T>(chave: string): Promise<T | null> {
    if (!this.nativos) {
      const valor = this.memoria.get(chave);
      return valor === undefined ? null : (JSON.parse(valor) as T);
    }

    const conteudo = await this.nativos.asyncStorage.getItem(chave);
    if (!conteudo) return null;

    const [ivHex, dadosHex] = conteudo.split(':');
    if (!ivHex || !dadosHex) {
      throw new Error(`[ArmazenamentoLocalCifrado] Entrada local "${chave}" em formato inválido.`);
    }

    const cifra = new aesjs.ModeOfOperation.ctr(await this.obterChaveMestra(), new aesjs.Counter(aesjs.utils.hex.toBytes(ivHex)));
    const texto = aesjs.utils.utf8.fromBytes(cifra.decrypt(aesjs.utils.hex.toBytes(dadosHex)));
    try {
      return JSON.parse(texto) as T;
    } catch {
      throw new Error(`[ArmazenamentoLocalCifrado] Não foi possível decifrar a entrada local "${chave}".`);
    }
  }

  async gravar<T>(chave: string, valor: T): Promise<void> {
    const texto = JSON.stringify(valor);
    if (!this.nativos) {
      this.memoria.set(chave, texto);
      return;
    }

    const iv = bytesAleatorios(16);
    const cifra = new aesjs.ModeOfOperation.ctr(await this.obterChaveMestra(), new aesjs.Counter(iv));
    const dados = cifra.encrypt(aesjs.utils.utf8.toBytes(texto));
    await this.nativos.asyncStorage.setItem(chave, `${aesjs.utils.hex.fromBytes(iv)}:${aesjs.utils.hex.fromBytes(dados)}`);
  }

  async remover(chave: string): Promise<void> {
    if (!this.nativos) {
      this.memoria.delete(chave);
      return;
    }
    await this.nativos.asyncStorage.removeItem(chave);
  }

  async removerPorPrefixo(prefixo: string): Promise<void> {
    if (!this.nativos) {
      for (const chave of [...this.memoria.keys()]) {
        if (chave.startsWith(prefixo)) this.memoria.delete(chave);
      }
      return;
    }
    const chaves = (await this.nativos.asyncStorage.getAllKeys()).filter((chave) => chave.startsWith(prefixo));
    if (chaves.length > 0) {
      await this.nativos.asyncStorage.multiRemove(chaves);
    }
  }

  private obterChaveMestra(): Promise<Uint8Array> {
    if (!this.chaveMestra) {
      this.chaveMestra = this.carregarOuCriarChaveMestra().catch((err) => {
        // Permite nova tentativa na próxima operação.
        this.chaveMestra = null;
        throw err;
      });
    }
    return this.chaveMestra;
  }

  private async carregarOuCriarChaveMestra(): Promise<Uint8Array> {
    const secureStore = this.nativos!.secureStore;
    const existente = await secureStore.getItemAsync(CHAVE_MESTRA);
    if (existente) {
      return aesjs.utils.hex.toBytes(existente);
    }
    const nova = bytesAleatorios(32);
    await secureStore.setItemAsync(CHAVE_MESTRA, aesjs.utils.hex.fromBytes(nova));
    return nova;
  }
}

export const armazenamentoLocal = new ArmazenamentoLocalCifrado();
