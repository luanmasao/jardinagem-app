import aesjs from 'aes-js';

// Inicialização segura do polyfill CSPRNG para React Native / Android antes de qualquer uso.
// Em ambiente Node.js / testes rápidos, o runtime já disponibiliza globalThis.crypto.getRandomValues nativamente.
// require() intencional: um import falharia ao carregar o módulo fora do React Native.
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('react-native-get-random-values');
} catch {
  // Ambiente sem bundle React Native (ex.: testes em Node.js com tsx).
}

export interface SupportedStorage {
  getItem: (key: string) => Promise<string | null> | string | null;
  setItem: (key: string, value: string) => Promise<void> | void;
  removeItem: (key: string) => Promise<void> | void;
}

class MemoryStorage implements SupportedStorage {
  private store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }
}

/**
 * LargeSecureStore: Adaptador híbrido de persistência para Supabase Auth.
 * Conforme Decisão D-HOM-14 da Arquitetura:
 * - O Android possui limite de 2048 bytes por entrada no SecureStore / SharedPreferences.
 * - Para contornar sem perder segurança, uma chave AES-256 é armazenada no SecureStore.
 * - Os dados da sessão são cifrados com essa chave (AES-CTR) e armazenados no AsyncStorage.
 * - Em ambientes sem módulos nativos (ex.: testes em Node.js), utiliza fallback defensivo em memória.
 */
export class LargeSecureStore implements SupportedStorage {
  private secureStoreModule: {
    getItemAsync: (key: string) => Promise<string | null>;
    setItemAsync: (key: string, value: string) => Promise<void>;
    deleteItemAsync: (key: string) => Promise<void>;
  } | null = null;

  private asyncStorageModule: {
    getItem: (key: string) => Promise<string | null>;
    setItem: (key: string, value: string) => Promise<void>;
    removeItem: (key: string) => Promise<void>;
  } | null = null;

  private fallbackStore = new MemoryStorage();
  private isNativeAvailable: boolean = false;

  constructor() {
    this.initNativeModules();
  }

  private initNativeModules(): void {
    // require() intencional: carrega os módulos nativos só quando existem, para os testes
    // em Node.js usarem o armazenamento em memória em vez de falhar no import.
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      this.secureStoreModule = require('expo-secure-store');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const asyncStoragePkg = require('@react-native-async-storage/async-storage');
      this.asyncStorageModule = asyncStoragePkg.default || asyncStoragePkg;
      this.isNativeAvailable = !!(
        this.secureStoreModule &&
        this.asyncStorageModule &&
        typeof this.secureStoreModule.getItemAsync === 'function' &&
        typeof this.asyncStorageModule.getItem === 'function'
      );
    } catch {
      this.isNativeAvailable = false;
    }
  }

  private getRandomBytes(length: number): Uint8Array {
    if (typeof globalThis !== 'undefined' && typeof globalThis.crypto?.getRandomValues === 'function') {
      return globalThis.crypto.getRandomValues(new Uint8Array(length));
    }
    throw new Error(
      '[LargeSecureStore] CSPRNG indisponível: crypto.getRandomValues não está definido. Verifique a inicialização de react-native-get-random-values.'
    );
  }

  private async _encrypt(key: string, value: string): Promise<string> {
    if (!this.secureStoreModule) {
      throw new Error('SecureStore module unavailable for encryption');
    }

    const encryptionKey = this.getRandomBytes(32); // 256-bit AES
    const cipher = new aesjs.ModeOfOperation.ctr(encryptionKey, new aesjs.Counter(1));
    const encryptedBytes = cipher.encrypt(aesjs.utils.utf8.toBytes(value));

    await this.secureStoreModule.setItemAsync(key, aesjs.utils.hex.fromBytes(encryptionKey));
    return aesjs.utils.hex.fromBytes(encryptedBytes);
  }

  private async _decrypt(key: string, value: string): Promise<string | null> {
    if (!this.secureStoreModule) {
      throw new Error('SecureStore module unavailable for decryption');
    }

    const encryptionKeyHex = await this.secureStoreModule.getItemAsync(key);
    if (!encryptionKeyHex) {
      return null;
    }

    const cipher = new aesjs.ModeOfOperation.ctr(
      aesjs.utils.hex.toBytes(encryptionKeyHex),
      new aesjs.Counter(1)
    );
    const decryptedBytes = cipher.decrypt(aesjs.utils.hex.toBytes(value));

    return aesjs.utils.utf8.fromBytes(decryptedBytes);
  }

  async getItem(key: string): Promise<string | null> {
    if (!this.isNativeAvailable || !this.asyncStorageModule || !this.secureStoreModule) {
      return this.fallbackStore.getItem(key);
    }

    try {
      const encrypted = await this.asyncStorageModule.getItem(key);
      if (!encrypted) {
        return null;
      }
      return await this._decrypt(key, encrypted);
    } catch {
      return this.fallbackStore.getItem(key);
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    if (!this.isNativeAvailable || !this.asyncStorageModule || !this.secureStoreModule) {
      this.fallbackStore.setItem(key, value);
      return;
    }

    try {
      const encrypted = await this._encrypt(key, value);
      await this.asyncStorageModule.setItem(key, encrypted);
    } catch {
      this.fallbackStore.setItem(key, value);
    }
  }

  async removeItem(key: string): Promise<void> {
    if (!this.isNativeAvailable || !this.asyncStorageModule || !this.secureStoreModule) {
      this.fallbackStore.removeItem(key);
      return;
    }

    try {
      await this.asyncStorageModule.removeItem(key);
      await this.secureStoreModule.deleteItemAsync(key);
    } catch {
      this.fallbackStore.removeItem(key);
    }
  }
}
