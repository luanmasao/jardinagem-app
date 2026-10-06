/**
 * Mock para expo-file-system/legacy utilizado exclusivamente em testes unitários Node.js.
 */

const DEFAULT_CACHE_DIR = 'file:///data/user/0/com.jardinagem.app/cache/';

let mockCacheDirectory: string | null = DEFAULT_CACHE_DIR;
const mockExistingFiles = new Set<string>();
let mockCopyAsyncHandler: ((options: { from: string; to: string }) => Promise<void>) | null = null;
const mockCopyCalls: Array<{ from: string; to: string }> = [];

export const cacheDirectory = DEFAULT_CACHE_DIR;

export async function getInfoAsync(fileUri: string): Promise<{ exists: boolean; uri: string; size?: number; isDirectory: boolean }> {
  const exists = mockExistingFiles.has(fileUri);
  return {
    exists,
    uri: fileUri,
    size: exists ? 2048 : 0,
    isDirectory: false,
  };
}

export async function getContentUriAsync(fileUri: string): Promise<string> {
  return fileUri.replace('file://', 'content://com.jardinagem.app.fileprovider/');
}

export async function copyAsync(options: { from: string; to: string }): Promise<void> {
  mockCopyCalls.push(options);
  if (mockCopyAsyncHandler) {
    await mockCopyAsyncHandler(options);
    return;
  }
  // Se a cópia for bem sucedida, o arquivo de destino passa a existir no mock
  mockExistingFiles.add(options.to);
}

/**
 * Utilitários de controle para suítes de teste
 */
export const __mockFileSystem = {
  addExistingFile(uri: string): void {
    mockExistingFiles.add(uri);
  },
  removeExistingFile(uri: string): void {
    mockExistingFiles.delete(uri);
  },
  setCacheDirectory(dir: string | null): void {
    mockCacheDirectory = dir;
  },
  setCopyAsyncHandler(handler: ((options: { from: string; to: string }) => Promise<void>) | null): void {
    mockCopyAsyncHandler = handler;
  },
  getCopyCalls(): Array<{ from: string; to: string }> {
    return [...mockCopyCalls];
  },
  reset(): void {
    mockCacheDirectory = DEFAULT_CACHE_DIR;
    mockExistingFiles.clear();
    mockCopyAsyncHandler = null;
    mockCopyCalls.length = 0;
  },
};

export default {
  cacheDirectory,
  getInfoAsync,
  copyAsync,
  __mockFileSystem,
};
