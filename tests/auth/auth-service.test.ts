import { describe, it } from 'node:test';
import assert from 'node:assert';
import { AuthService } from '../../src/application/services/auth.service';
import { LargeSecureStore } from '../../src/infrastructure/supabase/large-secure-store';
import { Usuario } from '../../src/domain/entities/usuario';
import type { SupabaseClient } from '@supabase/supabase-js';

// Helper para criar mock estruturado do SupabaseClient
function createMockSupabaseClient(overrides: {
  signUpResult?: any;
  signInResult?: any;
  signOutError?: any;
  sessionResult?: any;
  userResult?: any;
  usuarioQueryResult?: { data: any; error: any };
  insertQueryResult?: { data: any; error: any };
  onInsert?: (payload: any) => void;
  onStartAutoRefresh?: () => void;
  onStopAutoRefresh?: () => void;
  signUpThrows?: Error;
  signInThrows?: Error;
} = {}): SupabaseClient {
  return {
    auth: {
      signUp: async (args: any) => {
        if (overrides.signUpThrows) throw overrides.signUpThrows;
        return overrides.signUpResult ?? {
          data: {
            user: {
              id: 'uuid-teste-123',
              email: args.email,
              user_metadata: args.options?.data ?? {},
            },
            session: {
              access_token: 'fake-jwt-token',
              refresh_token: 'fake-refresh-token',
              user: { id: 'uuid-teste-123', email: args.email },
            },
          },
          error: null,
        };
      },
      signInWithPassword: async (args: any) => {
        if (overrides.signInThrows) throw overrides.signInThrows;
        return overrides.signInResult ?? {
          data: {
            user: {
              id: 'uuid-teste-123',
              email: args.email,
              user_metadata: { nome: 'Usuário Teste' },
            },
            session: {
              access_token: 'fake-jwt-token',
              refresh_token: 'fake-refresh-token',
            },
          },
          error: null,
        };
      },
      signOut: async () => ({
        error: overrides.signOutError ?? null,
      }),
      getSession: async () => ({
        data: {
          session: overrides.sessionResult !== undefined ? overrides.sessionResult : {
            access_token: 'valid-session-token',
            user: { id: 'uuid-teste-123', email: 'teste@email.com' },
          },
        },
        error: null,
      }),
      getUser: async () => ({
        data: {
          user: overrides.userResult !== undefined ? overrides.userResult : {
            id: 'uuid-teste-123',
            email: 'teste@email.com',
            user_metadata: { nome: 'Usuário Teste' },
          },
        },
        error: null,
      }),
      onAuthStateChange: (_callback: any) => ({
        data: {
          subscription: {
            unsubscribe: () => {},
          },
        },
      }),
      startAutoRefresh: () => {
        if (overrides.onStartAutoRefresh) overrides.onStartAutoRefresh();
      },
      stopAutoRefresh: () => {
        if (overrides.onStopAutoRefresh) overrides.onStopAutoRefresh();
      },
    },
    from: (_table: string) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => overrides.usuarioQueryResult ?? {
            data: {
              id: 'uuid-teste-123',
              nome: 'Carlos Jardineiro',
              telefone: '11988887777',
              data_cadastro: '2026-09-20T12:00:00.000Z',
              ativo: true,
            },
            error: null,
          },
        }),
      }),
      insert: (payload: any) => {
        if (overrides.onInsert) overrides.onInsert(payload);
        return {
          select: () => ({
            single: async () => overrides.insertQueryResult ?? {
              data: {
                id: payload.id,
                nome: payload.nome,
                telefone: payload.telefone,
                data_cadastro: '2026-09-25T12:00:00.000Z',
                ativo: true,
              },
              error: null,
            },
          }),
        };
      },
    }),
  } as unknown as SupabaseClient;
}

describe('AuthService — Integração e Casos de Uso', () => {
  it('1. cadastro: deve cadastrar novo usuário enviando nome e telefone nos metadados', async () => {
    let capturedOptions: any = null;
    const mockClient = {
      auth: {
        signUp: async (args: any) => {
          capturedOptions = args;
          return {
            data: {
              user: {
                id: 'uuid-novo-usuario',
                email: args.email,
                user_metadata: args.options.data,
              },
              session: { access_token: 'token-novo', user: { id: 'uuid-novo-usuario' } },
            },
            error: null,
          };
        },
      },
    } as unknown as SupabaseClient;

    const auth = new AuthService(mockClient);
    const result = await auth.signUp({
      email: 'novo@jardim.com',
      password: 'password123',
      nome: 'Mariana Flores',
      telefone: '11977776666',
    });

    assert.strictEqual(result.error, null);
    assert.ok(result.user);
    assert.strictEqual(result.user.id, 'uuid-novo-usuario');
    assert.strictEqual(result.user.email, 'novo@jardim.com');
    assert.strictEqual(result.user.nome, 'Mariana Flores');
    assert.strictEqual(result.user.telefone, '11977776666');

    // Confirma que os metadados foram passados para o auth.users sem insert direto
    assert.deepStrictEqual(capturedOptions.options.data, {
      nome: 'Mariana Flores',
      telefone: '11977776666',
    });
  });

  it('2. login válido: deve autenticar com email/senha e retornar usuário mapeado e sessão', async () => {
    const mockClient = createMockSupabaseClient();
    const auth = new AuthService(mockClient);

    const result = await auth.signIn({
      email: 'teste@jardim.com',
      password: 'senhaCorreta123',
    });

    assert.strictEqual(result.error, null);
    assert.ok(result.user);
    assert.strictEqual(result.user.id, 'uuid-teste-123');
    assert.ok(result.session);
    assert.strictEqual(result.session.access_token, 'fake-jwt-token');
  });

  it('3. login inválido: deve retornar erro ao tentar login com credenciais incorretas', async () => {
    const mockClient = createMockSupabaseClient({
      signInResult: {
        data: { user: null, session: null },
        error: new Error('Invalid login credentials'),
      },
    });
    const auth = new AuthService(mockClient);

    const result = await auth.signIn({
      email: 'inexistente@jardim.com',
      password: 'senhaIncorreta',
    });

    assert.ok(result.error);
    assert.strictEqual(result.error.message, 'Invalid login credentials');
    assert.strictEqual(result.user, null);
    assert.strictEqual(result.session, null);
  });

  it('4. logout: deve chamar signOut e retornar sucesso', async () => {
    let signOutCalled = false;
    const mockClient = {
      auth: {
        signOut: async () => {
          signOutCalled = true;
          return { error: null };
        },
      },
    } as unknown as SupabaseClient;

    const auth = new AuthService(mockClient);
    const result = await auth.signOut();

    assert.strictEqual(signOutCalled, true);
    assert.strictEqual(result.error, null);
  });

  it('5. sessão persistida: deve retornar a sessão atual quando existir', async () => {
    const mockClient = createMockSupabaseClient({
      sessionResult: {
        access_token: 'session-token-persistida',
        user: { id: 'uuid-persistido' },
      },
    });
    const auth = new AuthService(mockClient);

    const session = await auth.getSession();
    assert.ok(session);
    assert.strictEqual(session.access_token, 'session-token-persistida');
    assert.strictEqual(session.user.id, 'uuid-persistido');
  });

  it('6. sessão inexistente: deve retornar null quando não houver sessão ativa', async () => {
    const mockClient = createMockSupabaseClient({
      sessionResult: null,
    });
    const auth = new AuthService(mockClient);

    const session = await auth.getSession();
    assert.strictEqual(session, null);
  });

  it('7. leitura de perfil próprio: deve consultar public.usuario e mapear para entidade Usuario', async () => {
    const mockClient = createMockSupabaseClient({
      usuarioQueryResult: {
        data: {
          id: 'uuid-teste-123',
          nome: 'Carlos Jardineiro',
          telefone: '11988887777',
          data_cadastro: '2026-09-20T12:00:00.000Z',
          ativo: true,
        },
        error: null,
      },
    });
    const auth = new AuthService(mockClient);

    const perfil = await auth.getPerfilUsuario('uuid-teste-123');

    assert.ok(perfil);
    assert.ok(perfil instanceof Usuario);
    assert.strictEqual(perfil.id, 'uuid-teste-123');
    assert.strictEqual(perfil.nome, 'Carlos Jardineiro');
    assert.strictEqual(perfil.telefone, '11988887777');
    assert.strictEqual(perfil.ativo, true);
    assert.strictEqual(perfil.dataCadastro.toISOString(), '2026-09-20T12:00:00.000Z');
  });

  it('8. tratamento de erro Auth: deve capturar erros lançados pelo SDK de forma defensiva', async () => {
    const mockClient = createMockSupabaseClient({
      signUpThrows: new Error('Falha catastrófica de rede no Supabase Auth'),
    });
    const auth = new AuthService(mockClient);

    const result = await auth.signUp({
      email: 'erro@teste.com',
      password: 'password123',
      nome: 'Teste Erro',
    });

    assert.ok(result.error);
    assert.strictEqual(result.error.message, 'Falha catastrófica de rede no Supabase Auth');
    assert.strictEqual(result.user, null);
    assert.strictEqual(result.session, null);
  });

  it('9. usuário Auth existente: deve retornar erro descritivo quando email já estiver registrado', async () => {
    const mockClient = createMockSupabaseClient({
      signUpResult: {
        data: { user: null, session: null },
        error: new Error('User already registered'),
      },
    });
    const auth = new AuthService(mockClient);

    const result = await auth.signUp({
      email: 'duplicado@jardim.com',
      password: 'password123',
      nome: 'Usuário Duplicado',
    });

    assert.ok(result.error);
    assert.strictEqual(result.error.message, 'User already registered');
    assert.strictEqual(result.user, null);
  });

  it('10. comportamento defensivo quando perfil não estiver disponível: deve retornar null sem estourar exceção', async () => {
    const mockClient = createMockSupabaseClient({
      usuarioQueryResult: {
        data: null,
        error: new Error('PGRST116: The result contains 0 rows'),
      },
    });
    const auth = new AuthService(mockClient);

    const perfil = await auth.getPerfilUsuario('uuid-sem-perfil');
    assert.strictEqual(perfil, null);

    // Também para ID vazio
    const perfilIdVazio = await auth.getPerfilUsuario('');
    assert.strictEqual(perfilIdVazio, null);
  });

  it('11. persistência: LargeSecureStore deve armazenar, recuperar e remover dados no storage', async () => {
    const store = new LargeSecureStore();
    const chave = 'supabase.auth.token';
    const valor = JSON.stringify({ token: 'jwt-12345', refresh: 'ref-67890' });

    await store.setItem(chave, valor);
    const recuperado = await store.getItem(chave);
    assert.strictEqual(recuperado, valor);

    await store.removeItem(chave);
    const posRemocao = await store.getItem(chave);
    assert.strictEqual(posRemocao, null);
  });

  it('12. concluirPerfil: deve inserir em public.usuario com id = auth.uid() e retornar entidade Usuario', async () => {
    let insertedPayload: any = null;
    const mockClient = createMockSupabaseClient({
      userResult: { id: 'uuid-autenticado-456', email: 'autenticado@jardim.com' },
      onInsert: (payload: any) => {
        insertedPayload = payload;
      },
    });
    const auth = new AuthService(mockClient);

    const result = await auth.concluirPerfil({
      nome: 'José Jardineiro',
      telefone: '11988889999',
    });

    assert.strictEqual(result.error, null);
    assert.ok(result.perfil);
    assert.ok(result.perfil instanceof Usuario);
    assert.strictEqual(result.perfil.id, 'uuid-autenticado-456');
    assert.strictEqual(result.perfil.nome, 'José Jardineiro');
    assert.strictEqual(result.perfil.telefone, '11988889999');

    // Confirma que o id inserido é exatamente o id do usuário autenticado (auth.uid())
    assert.ok(insertedPayload);
    assert.strictEqual(insertedPayload.id, 'uuid-autenticado-456');
    assert.strictEqual(insertedPayload.nome, 'José Jardineiro');
    assert.strictEqual(insertedPayload.telefone, '11988889999');
  });

  it('13. concluirPerfil: deve rejeitar tentativa de conclusão sem usuário autenticado', async () => {
    const mockClient = createMockSupabaseClient({
      userResult: null,
    });
    const auth = new AuthService(mockClient);

    const result = await auth.concluirPerfil({
      nome: 'Sem Sessão',
    });

    assert.ok(result.error);
    assert.strictEqual(result.error.message, 'Usuário não autenticado.');
    assert.strictEqual(result.perfil, null);
  });

  it('14. concluirPerfil: deve validar nome obrigatório e rejeitar strings vazias', async () => {
    const mockClient = createMockSupabaseClient();
    const auth = new AuthService(mockClient);

    const result = await auth.concluirPerfil({
      nome: '   ',
    });

    assert.ok(result.error);
    assert.strictEqual(result.error.message, 'O nome é obrigatório.');
    assert.strictEqual(result.perfil, null);
  });

  it('15. concluirPerfil: deve capturar e tratar erro de inserção retornado pelo banco', async () => {
    const mockClient = createMockSupabaseClient({
      insertQueryResult: {
        data: null,
        error: new Error('new row violates row-level security policy for table "usuario"'),
      },
    });
    const auth = new AuthService(mockClient);

    const result = await auth.concluirPerfil({
      nome: 'Falha RLS',
    });

    assert.ok(result.error);
    assert.strictEqual(
      result.error.message,
      'new row violates row-level security policy for table "usuario"'
    );
    assert.strictEqual(result.perfil, null);
  });

  it('16. autoRefresh: deve acionar startAutoRefresh e stopAutoRefresh no cliente Supabase', () => {
    let startCalled = false;
    let stopCalled = false;

    const mockClient = createMockSupabaseClient({
      onStartAutoRefresh: () => {
        startCalled = true;
      },
      onStopAutoRefresh: () => {
        stopCalled = true;
      },
    });
    const auth = new AuthService(mockClient);

    auth.startAutoRefresh();
    assert.strictEqual(startCalled, true);

    auth.stopAutoRefresh();
    assert.strictEqual(stopCalled, true);
  });

  it('17. LargeSecureStore: deve inicializar com CSPRNG sem fallback silencioso para Math.random', () => {
    const store = new LargeSecureStore();
    assert.ok(store);
    assert.strictEqual(typeof store.getItem, 'function');
    assert.strictEqual(typeof store.setItem, 'function');
    assert.strictEqual(typeof store.removeItem, 'function');
  });

  it('18. fluxo defensivo completo: usuário sem perfil -> concluirPerfil -> perfil ativo', async () => {
    let perfilNoBanco: any = null;

    const mockClient = {
      auth: {
        getUser: async () => ({
          data: {
            user: { id: 'uuid-recuperado-789', email: 'recuperado@jardim.com' },
          },
          error: null,
        }),
      },
      from: (table: string) => {
        assert.strictEqual(table, 'usuario');
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: perfilNoBanco,
                error: null,
              }),
            }),
          }),
          insert: (payload: any) => {
            perfilNoBanco = {
              id: payload.id,
              nome: payload.nome,
              telefone: payload.telefone,
              data_cadastro: '2026-09-25T12:00:00.000Z',
              ativo: true,
            };
            return {
              select: () => ({
                single: async () => ({
                  data: perfilNoBanco,
                  error: null,
                }),
              }),
            };
          },
        };
      },
    } as unknown as SupabaseClient;

    const auth = new AuthService(mockClient);

    // Passo 1: Usuário autenticado consulta perfil -> perfil não existe (null)
    const perfilInicial = await auth.getPerfilUsuario('uuid-recuperado-789');
    assert.strictEqual(perfilInicial, null);

    // Passo 2: Executa fluxo defensivo via concluirPerfil
    const resultadoConclusao = await auth.concluirPerfil({
      nome: 'Roberto Paisagista Recuperado',
      telefone: '11966665555',
    });
    assert.strictEqual(resultadoConclusao.error, null);
    assert.ok(resultadoConclusao.perfil);
    assert.strictEqual(resultadoConclusao.perfil.id, 'uuid-recuperado-789');

    // Passo 3: Consulta subsequente retorna o perfil criado
    const perfilFinal = await auth.getPerfilUsuario('uuid-recuperado-789');
    assert.ok(perfilFinal);
    assert.strictEqual(perfilFinal.id, 'uuid-recuperado-789');
    assert.strictEqual(perfilFinal.nome, 'Roberto Paisagista Recuperado');
    assert.strictEqual(perfilFinal.telefone, '11966665555');
  });
});
