import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { Session } from '@supabase/supabase-js';
import {
  authService,
  AuthUser,
  ConcluirPerfilParams,
  SignInParams,
  SignUpParams,
} from '../../application/services/auth.service';
import { Usuario } from '../../domain/entities/usuario';
import { traduzirErroAutenticacao } from '../utils/auth-erros.utils';

export interface AuthContextData {
  user: AuthUser | null;
  session: Session | null;
  perfil: Usuario | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (params: SignInParams) => Promise<{ success: boolean; error?: string }>;
  signUp: (params: SignUpParams) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  refreshPerfil: () => Promise<void>;
  concluirPerfil: (params: ConcluirPerfilParams) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextData | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [perfil, setPerfil] = useState<Usuario | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchPerfil = useCallback(async (userId: string) => {
    try {
      const perfilCarregado = await authService.getPerfilUsuario(userId);
      setPerfil(perfilCarregado);
    } catch {
      setPerfil(null);
    }
  }, []);

  const refreshPerfil = useCallback(async () => {
    if (user?.id) {
      await fetchPerfil(user.id);
    }
  }, [user?.id, fetchPerfil]);

  useEffect(() => {
    let isMounted = true;

    // 1. Inicializa o estado com a sessão persistida existente
    async function initializeAuth() {
      try {
        const initialSession = await authService.getSession();
        if (!isMounted) return;

        if (initialSession?.user) {
          setSession(initialSession);
          const authUser: AuthUser = {
            id: initialSession.user.id,
            email: initialSession.user.email ?? null,
            nome: (initialSession.user.user_metadata?.nome as string) ?? null,
            telefone: (initialSession.user.user_metadata?.telefone as string) ?? null,
          };
          setUser(authUser);
          await fetchPerfil(initialSession.user.id);
        } else {
          setSession(null);
          setUser(null);
          setPerfil(null);
        }
      } catch (err) {
        console.error('[AuthProvider] Erro ao recuperar sessão inicial:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    initializeAuth();

    // 2. Observa mudanças no estado de autenticação de forma centralizada
    const { data: { subscription } } = authService.onAuthStateChange(async (_event, newSession) => {
      if (!isMounted) return;

      if (newSession?.user) {
        setSession(newSession);
        const authUser: AuthUser = {
          id: newSession.user.id,
          email: newSession.user.email ?? null,
          nome: (newSession.user.user_metadata?.nome as string) ?? null,
          telefone: (newSession.user.user_metadata?.telefone as string) ?? null,
        };
        setUser(authUser);
        await fetchPerfil(newSession.user.id);
      } else {
        setSession(null);
        setUser(null);
        setPerfil(null);
      }
      setIsLoading(false);
    });

    // 3. Observa o ciclo de vida do aplicativo (Foreground / Background) para auto-refresh
    const appStateSubscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        authService.startAutoRefresh();
      } else {
        authService.stopAutoRefresh();
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      appStateSubscription.remove();
    };
  }, [fetchPerfil]);

  const signIn = useCallback(async (params: SignInParams) => {
    setIsLoading(true);
    try {
      const response = await authService.signIn(params);
      if (response.error) {
        return { success: false, error: traduzirErroAutenticacao(response.error, 'Falha ao autenticar') };
      }
      if (response.user) {
        setUser(response.user);
        setSession(response.session);
        await fetchPerfil(response.user.id);
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: traduzirErroAutenticacao(err, 'Falha ao autenticar') };
    } finally {
      setIsLoading(false);
    }
  }, [fetchPerfil]);

  const signUp = useCallback(async (params: SignUpParams) => {
    setIsLoading(true);
    try {
      const response = await authService.signUp(params);
      if (response.error) {
        return { success: false, error: traduzirErroAutenticacao(response.error, 'Falha ao cadastrar') };
      }
      if (response.user) {
        setUser(response.user);
        setSession(response.session);
        await fetchPerfil(response.user.id);
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: traduzirErroAutenticacao(err, 'Falha ao cadastrar') };
    } finally {
      setIsLoading(false);
    }
  }, [fetchPerfil]);

  const signOut = useCallback(async () => {
    setIsLoading(true);
    try {
      await authService.signOut();
      setSession(null);
      setUser(null);
      setPerfil(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const concluirPerfil = useCallback(
    async (params: ConcluirPerfilParams) => {
      setIsLoading(true);
      try {
        const response = await authService.concluirPerfil(params);
        if (response.error) {
          return {
            success: false,
            error: traduzirErroAutenticacao(response.error, 'Falha ao concluir perfil.'),
          };
        }
        if (response.perfil) {
          setPerfil(response.perfil);
        }
        return { success: true };
      } catch (err) {
        return { success: false, error: traduzirErroAutenticacao(err, 'Falha ao concluir perfil.') };
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const value = useMemo<AuthContextData>(
    () => ({
      user,
      session,
      perfil,
      isLoading,
      isAuthenticated: !!session && !!user,
      signIn,
      signUp,
      signOut,
      refreshPerfil,
      concluirPerfil,
    }),
    [user, session, perfil, isLoading, signIn, signUp, signOut, refreshPerfil, concluirPerfil]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextData {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return context;
}
