/**
 * Mock para a biblioteca expo-sharing utilizado exclusivamente em testes unitários Node.js.
 */

let mockIsAvailable = true;
let mockIsAvailableRejectError: Error | null = null;
let mockShareAsyncHandler: ((url: string, options?: any) => Promise<any>) | null = null;
const mockShareCalls: Array<{ url: string; options?: any }> = [];

export async function isAvailableAsync(): Promise<boolean> {
  if (mockIsAvailableRejectError) {
    throw mockIsAvailableRejectError;
  }
  return mockIsAvailable;
}

export async function shareAsync(url: string, options?: any): Promise<void> {
  mockShareCalls.push({ url, options });
  if (mockShareAsyncHandler) {
    return await mockShareAsyncHandler(url, options);
  }
}

export function useIncomingShare(): any {
  return [];
}

/**
 * Utilitários de controle para suítes de teste
 */
export const __mockSharing = {
  setAvailable(available: boolean): void {
    mockIsAvailable = available;
    mockIsAvailableRejectError = null;
  },
  setAvailableReject(error: Error): void {
    mockIsAvailableRejectError = error;
  },
  setShareAsyncHandler(handler: ((url: string, options?: any) => Promise<any>) | null): void {
    mockShareAsyncHandler = handler;
  },
  getCalls(): Array<{ url: string; options?: any }> {
    return [...mockShareCalls];
  },
  reset(): void {
    mockIsAvailable = true;
    mockIsAvailableRejectError = null;
    mockShareAsyncHandler = null;
    mockShareCalls.length = 0;
  },
};

export default {
  isAvailableAsync,
  shareAsync,
  useIncomingShare,
  __mockSharing,
};
