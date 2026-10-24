import { AuthChangeEvent, isAuthRetryableFetchError, Session, SupabaseClient, User } from '@supabase/supabase-js';
import { supabase } from '../../infrastructure/supabase/supabase-client';
import { armazenamentoLocal } from '../../infrastructure/offline/armazenamento-local-cifrado';
import { conectividadeProvider } from '../../infrastructure/offline/expo-network-conectividade.provider';
import {
  ArmazenamentoLocal,
  CHAVE_IDENTIDADE_LOCAL,
  prefixoLocalDoUsuario,
} from '../interfaces/armazenamento-local.interface';
import { ConectividadeProvider } from '../interfaces/conectividade-provider.interface';
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

export interface SessaoRecuperada {
  session: Session | null;
  /** Última identidade autenticada, usada quando a sessão não pôde ser renovada por falta de conexão. */
  usuarioOffline: AuthUser | null;
}

interface PerfilLocal {
  id: string;
  nome: string;
  telefone: string | null;
  dataCadastro: string;
  ativo: boolean;
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
  constructor(
    private readonly client: SupabaseClient = supabase,
    private readonly armazenamento: ArmazenamentoLocal = armazenamentoLocal,
    private readonly conectividade: ConectividadeProvider = conectividadeProvider
  ) {}

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
   * Realiza o logout revogando a sessão ativa e apaga os dados locais do usuário (RNF38).
   */
  async signOut(): Promise<{ error: Error | null }> {
    const usuarioId = (await this.lerIdentidadeLocal())?.id ?? (await this.getSession())?.user.id;
    try {
      const { error } = await this.client.auth.signOut();
      return { error: error ?? null };
    } catch (err) {
      return {
        error: err instanceof Error ? err : new Error(String(err)),
      };
    } finally {
      await this.limparDadosLocais(usuarioId);
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
   * Recupera a sessão persistida. Sem conexão, se o token não pôde ser renovado,
   * devolve a última identidade autenticada no dispositivo (D-OFF-07).
   */
  async recuperarSessao(): Promise<SessaoRecuperada> {
    try {
      const { data, error } = await this.client.auth.getSession();
      if (data.session) {
        return { session: data.session, usuarioOffline: null };
      }
      if (error && isAuthRetryableFetchError(error)) {
        return { session: null, usuarioOffline: await this.lerIdentidadeLocal() };
      }
    } catch {
      // Tratado como ausência de sessão.
    }
    return { session: null, usuarioOffline: null };
  }

  /**
   * Obtém os dados do usuário autenticado atual.
   * Sem conexão, usa a última identidade autenticada no dispositivo (D-OFF-07);
   * a RLS continua validando o token quando os dados chegam ao servidor.
   */
  async getCurrentUser(): Promise<AuthUser | null> {
    // Sem rede informada pelo sistema, não espera a requisição falhar (pode levar até o timeout).
    if (!(await this.conectividade.estaOnline())) {
      const identidade = await this.lerIdentidadeLocal();
      if (identidade) return identidade;
    }
    try {
      const { data, error } = await this.client.auth.getUser();
      if (!error && data.user) {
        return mapSupabaseUser(data.user);
      }
      if (error && isAuthRetryableFetchError(error)) {
        return this.lerIdentidadeLocal();
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Observa mudanças no estado de autenticação (LOGIN, LOGOUT, TOKEN_REFRESHED).
   * Também mantém atualizada a identidade usada sem conexão.
   * Retorna objeto com método unsubscribe para cleanup no unmount.
   */
  onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void | Promise<void>) {
    return this.client.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        await this.guardarLocal(CHAVE_IDENTIDADE_LOCAL, mapSupabaseUser(session.user));
      } else if (event === 'SIGNED_OUT') {
        await this.removerLocal(CHAVE_IDENTIDADE_LOCAL);
      }
      await callback(event, session);
    });
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
   * Em caso de falha, devolve o último perfil guardado no dispositivo, se houver.
   */
  async buscarPerfilUsuario(usuarioId: string): Promise<{ perfil: Usuario | null; error: Error | null }> {
    if (!usuarioId || usuarioId.trim() === '') {
      return { perfil: null, error: null };
    }

    let falha: Error;
    try {
      const { data, error } = await this.client
        .from('usuario')
        .select('id, nome, telefone, data_cadastro, ativo')
        .eq('id', usuarioId)
        .maybeSingle();

      if (error) {
        falha = new Error(error.message);
      } else if (!data) {
        return { perfil: null, error: null };
      } else {
        const perfil = new Usuario({
          id: data.id,
          nome: data.nome,
          telefone: data.telefone,
          dataCadastro: data.data_cadastro ? new Date(data.data_cadastro) : undefined,
          ativo: data.ativo ?? true,
        });
        await this.guardarPerfilLocal(perfil);
        return { perfil, error: null };
      }
    } catch (err) {
      falha = err instanceof Error ? err : new Error(String(err));
    }

    const perfilLocal = await this.lerPerfilLocal(usuarioId);
    return perfilLocal ? { perfil: perfilLocal, error: null } : { perfil: null, error: falha };
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

      await this.guardarPerfilLocal(novoPerfil);
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

  private async lerIdentidadeLocal(): Promise<AuthUser | null> {
    try {
      return await this.armazenamento.ler<AuthUser>(CHAVE_IDENTIDADE_LOCAL);
    } catch (err) {
      console.warn('[AuthService] Falha ao ler a identidade local:', err);
      return null;
    }
  }

  private async lerPerfilLocal(usuarioId: string): Promise<Usuario | null> {
    try {
      const salvo = await this.armazenamento.ler<PerfilLocal>(`${prefixoLocalDoUsuario(usuarioId)}perfil`);
      if (!salvo) return null;
      return new Usuario({
        id: salvo.id,
        nome: salvo.nome,
        telefone: salvo.telefone,
        dataCadastro: new Date(salvo.dataCadastro),
        ativo: salvo.ativo,
      });
    } catch (err) {
      console.warn('[AuthService] Falha ao ler o perfil local:', err);
      return null;
    }
  }

  private async guardarPerfilLocal(perfil: Usuario): Promise<void> {
    const salvo: PerfilLocal = {
      id: perfil.id,
      nome: perfil.nome,
      telefone: perfil.telefone ?? null,
      dataCadastro: perfil.dataCadastro.toISOString(),
      ativo: perfil.ativo,
    };
    await this.guardarLocal(`${prefixoLocalDoUsuario(perfil.id)}perfil`, salvo);
  }

  /** Cópia local é melhoria de disponibilidade: uma falha aqui não deve interromper a operação online. */
  private async guardarLocal<T>(chave: string, valor: T): Promise<void> {
    try {
      await this.armazenamento.gravar(chave, valor);
    } catch (err) {
      console.warn(`[AuthService] Falha ao gravar "${chave}" localmente:`, err);
    }
  }

  private async removerLocal(chave: string): Promise<void> {
    try {
      await this.armazenamento.remover(chave);
    } catch (err) {
      console.warn(`[AuthService] Falha ao remover "${chave}" localmente:`, err);
    }
  }

  private async limparDadosLocais(usuarioId: string | undefined): Promise<void> {
    await this.removerLocal(CHAVE_IDENTIDADE_LOCAL);
    if (!usuarioId) return;
    try {
      await this.armazenamento.removerPorPrefixo(prefixoLocalDoUsuario(usuarioId));
    } catch (err) {
      console.warn('[AuthService] Falha ao apagar os dados locais do usuário:', err);
    }
  }
}

/**
 * Singleton padrão da aplicação.
 */
export const authService = new AuthService();
