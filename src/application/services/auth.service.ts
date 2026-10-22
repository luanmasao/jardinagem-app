import { AuthChangeEvent, Session, SupabaseClient, User } from '@supabase/supabase-js';
import { supabase } from '../../infrastructure/supabase/supabase-client';
import { Usuario } from '../../domain/entities/usuario';

export interface AuthUser {
  id: string;
  email: string | null;
  nome?: string | null;
  telefone?: string | null;
}

export interface SignUpParams {
  email: string;
  password: string;
  nome: string;
  telefone?: string | null;
}

export interface SignInParams {
  email: string;
  password: string;
}

export interface ConcluirPerfilParams {
  nome: string;
  telefone?: string | null;
}

export interface AuthResponse {
  user: AuthUser | null;
  session: Session | null;
  error: Error | null;
}

function mapSupabaseUser(user: User | null): AuthUser | null {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email ?? null,
    nome: (user.user_metadata?.nome as string) ?? null,
    telefone: (user.user_metadata?.telefone as string) ?? null,
  };
}

/**
 * AuthService: Centraliza todas as operações de autenticação e consulta de perfil.
 * Encapsula o Supabase Auth para isolar a aplicação de chamadas diretas de infraestrutura.
 */
export class AuthService {
  constructor(private readonly client: SupabaseClient = supabase) {}

  /**
   * Realiza o cadastro do usuário.
   * O nome e telefone são enviados como metadados do auth.users.
   * A trigger de banco private.handle_new_user() é a responsável pelo bootstrap em public.usuario.
   */
  async signUp(params: SignUpParams): Promise<AuthResponse> {
    const { email, password, nome, telefone } = params;

    if (!email || email.trim() === '') {
      return { user: null, session: null, error: new Error('O e-mail é obrigatório.') };
    }
    if (!password || password.length < 6) {
      return {
        user: null,
        session: null,
        error: new Error('A senha deve ter no mínimo 6 caracteres.'),
      };
    }
    if (!nome || nome.trim() === '') {
      return { user: null, session: null, error: new Error('O nome é obrigatório.') };
    }

    try {
      const { data, error } = await this.client.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            nome: nome.trim(),
            ...(telefone && telefone.trim() !== '' ? { telefone: telefone.trim() } : {}),
          },
        },
      });

      if (error) {
        return { user: null, session: null, error };
      }

      return {
        user: mapSupabaseUser(data.user),
        session: data.session,
        error: null,
      };
    } catch (err) {
      return {
        user: null,
        session: null,
        error: err instanceof Error ? err : new Error(String(err)),
      };
    }
  }

  /**
   * Realiza o login com email e senha.
   */
  async signIn(params: SignInParams): Promise<AuthResponse> {
    const { email, password } = params;

    if (!email || email.trim() === '') {
      return { user: null, session: null, error: new Error('O e-mail é obrigatório.') };
    }
    if (!password) {
      return { user: null, session: null, error: new Error('A senha é obrigatória.') };
    }

    try {
      const { data, error } = await this.client.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        return { user: null, session: null, error };
      }

      return {
        user: mapSupabaseUser(data.user),
        session: data.session,
        error: null,
      };
    } catch (err) {
      return {
        user: null,
        session: null,
        error: err instanceof Error ? err : new Error(String(err)),
      };
    }
  }

  /**
   * Realiza o logout revogando a sessão ativa.
   */
  async signOut(): Promise<{ error: Error | null }> {
    try {
      const { error } = await this.client.auth.signOut();
      return { error: error ?? null };
    } catch (err) {
      return {
        error: err instanceof Error ? err : new Error(String(err)),
      };
    }
  }

  /**
   * Obtém a sessão atual persistida no storage.
   */
  async getSession(): Promise<Session | null> {
    try {
      const { data, error } = await this.client.auth.getSession();
      if (error || !data.session) {
        return null;
      }
      return data.session;
    } catch {
      return null;
    }
  }

  /**
   * Obtém os dados do usuário autenticado atual.
   */
  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const { data, error } = await this.client.auth.getUser();
      if (error || !data.user) {
        return null;
      }
      return mapSupabaseUser(data.user);
    } catch {
      return null;
    }
  }

  /**
   * Observa mudanças no estado de autenticação (LOGIN, LOGOUT, TOKEN_REFRESHED).
   * Retorna objeto com método unsubscribe para cleanup no unmount.
   */
  onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void) {
    return this.client.auth.onAuthStateChange(callback);
  }

  /**
   * Consulta o perfil de negócio do usuário em public.usuario através do Data API regular.
   * Utiliza a RLS homologada (usuario_select_policy) garantindo isolamento sem permissão administrativa.
   */
  async getPerfilUsuario(usuarioId: string): Promise<Usuario | null> {
    const { perfil } = await this.buscarPerfilUsuario(usuarioId);
    return perfil;
  }

  /**
   * Igual a getPerfilUsuario, mas distingue os dois motivos de não haver perfil:
   * - perfil inexistente: { perfil: null, error: null };
   * - falha ao consultar (sem conexão, banco indisponível): { perfil: null, error }.
   * Usado na sessão para não tratar uma falha de rede como "perfil a concluir".
   */
  async buscarPerfilUsuario(usuarioId: string): Promise<{ perfil: Usuario | null; error: Error | null }> {
    if (!usuarioId || usuarioId.trim() === '') {
      return { perfil: null, error: null };
    }

    try {
      const { data, error } = await this.client
        .from('usuario')
        .select('id, nome, telefone, data_cadastro, ativo')
        .eq('id', usuarioId)
        .maybeSingle();

      if (error) {
        return { perfil: null, error: new Error(error.message) };
      }
      if (!data) {
        return { perfil: null, error: null };
      }

      return {
        perfil: new Usuario({
          id: data.id,
          nome: data.nome,
          telefone: data.telefone,
          dataCadastro: data.data_cadastro ? new Date(data.data_cadastro) : undefined,
          ativo: data.ativo ?? true,
        }),
        error: null,
      };
    } catch (err) {
      return { perfil: null, error: err instanceof Error ? err : new Error(String(err)) };
    }
  }

  /**
   * Conclui o perfil do usuário autenticado inserindo registro em public.usuario.
   * Utilizado exclusivamente no fluxo defensivo (/concluir-perfil) quando o perfil
   * não foi provisionado pela trigger on_auth_user_created.
   * Respeita a policy usuario_insert_policy (WITH CHECK (auth.uid() = id)).
   */
  async concluirPerfil(params: ConcluirPerfilParams): Promise<{ perfil: Usuario | null; error: Error | null }> {
    const { nome, telefone } = params;

    if (!nome || nome.trim() === '') {
      return { perfil: null, error: new Error('O nome é obrigatório.') };
    }

    try {
      const user = await this.getCurrentUser();
      if (!user?.id) {
        return { perfil: null, error: new Error('Usuário não autenticado.') };
      }

      const { data, error } = await this.client
        .from('usuario')
        .insert({
          id: user.id,
          nome: nome.trim(),
          telefone: telefone && telefone.trim() !== '' ? telefone.trim() : null,
        })
        .select('id, nome, telefone, data_cadastro, ativo')
        .single();

      if (error) {
        return { perfil: null, error };
      }

      const novoPerfil = new Usuario({
        id: data.id,
        nome: data.nome,
        telefone: data.telefone,
        dataCadastro: data.data_cadastro ? new Date(data.data_cadastro) : undefined,
        ativo: data.ativo ?? true,
      });

      return { perfil: novoPerfil, error: null };
    } catch (err) {
      return {
        perfil: null,
        error: err instanceof Error ? err : new Error(String(err)),
      };
    }
  }

  /**
   * Inicia o refresh automático de tokens do Supabase Auth.
   */
  startAutoRefresh(): void {
    if (typeof this.client.auth?.startAutoRefresh === 'function') {
      this.client.auth.startAutoRefresh();
    }
  }

  /**
   * Pausa o refresh automático de tokens do Supabase Auth.
   */
  stopAutoRefresh(): void {
    if (typeof this.client.auth?.stopAutoRefresh === 'function') {
      this.client.auth.stopAutoRefresh();
    }
  }
}

/**
 * Singleton padrão da aplicação.
 */
export const authService = new AuthService();
