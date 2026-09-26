import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { LargeSecureStore } from './large-secure-store';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  '';

if (!supabaseAnonKey && process.env.NODE_ENV !== 'test') {
  console.warn(
    '[SupabaseClient] EXPO_PUBLIC_SUPABASE_ANON_KEY ou EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY não foi configurada.'
  );
}

/**
 * Cliente Supabase singleton configurado para o ambiente React Native / Expo.
 * Utiliza o adaptador híbrido de persistência criptografada LargeSecureStore.
 */
export const supabase: SupabaseClient = createClient(
  supabaseUrl,
  supabaseAnonKey || 'dummy-anon-key-for-init',
  {
    auth: {
      storage: new LargeSecureStore(),
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);

/**
 * Permite criar clientes Supabase customizados (útil para testes de integração ou injeção de dependências).
 */
export function createCustomSupabaseClient(
  url: string = supabaseUrl,
  key: string = supabaseAnonKey,
  options?: Parameters<typeof createClient>[2]
) {
  return createClient(url, key, {
    auth: {
      storage: new LargeSecureStore(),
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      ...options?.auth,
    },
    ...options,
  });
}
