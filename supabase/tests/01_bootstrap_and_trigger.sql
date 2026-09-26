BEGIN;
SELECT plan(9);

-- ============================================================================
-- 1. TESTE DE BOOTSTRAP: TRIGGER on_auth_user_created -> private.handle_new_user()
-- ============================================================================

-- Setup de identificadores de teste
\set user_test_1 'aaaaaaaa-1111-1111-1111-111111111111'
\set user_test_2 'bbbbbbbb-2222-2222-2222-222222222222'
\set user_test_3 'cccccccc-3333-3333-3333-333333333333'

-- Teste 1: Inserção legítima em auth.users dispara trigger e cria public.usuario
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, raw_user_meta_data, created_at, updated_at)
VALUES (
    'aaaaaaaa-1111-1111-1111-111111111111'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated',
    'authenticated',
    'usuario.a@example.com',
    'encrypted_pass',
    '{"nome": "  Jardineiro Carlos Silva  ", "telefone": "  11988887777  "}'::jsonb,
    now(),
    now()
);

SELECT is(
    (SELECT count(*)::integer FROM public.usuario WHERE id = 'aaaaaaaa-1111-1111-1111-111111111111'::uuid),
    1,
    'Trigger on_auth_user_created cria exatamente 1 registro em public.usuario'
);

-- Teste 2: Validação de tratamento de strings (trim no nome e telefone)
SELECT is(
    (SELECT nome FROM public.usuario WHERE id = 'aaaaaaaa-1111-1111-1111-111111111111'::uuid),
    'Jardineiro Carlos Silva',
    'Nome é tratado com trim na trigger de bootstrap'
);

SELECT is(
    (SELECT telefone FROM public.usuario WHERE id = 'aaaaaaaa-1111-1111-1111-111111111111'::uuid),
    '11988887777',
    'Telefone é tratado com trim na trigger de bootstrap'
);

-- Teste 3: Tratamento de telefone vazio/espaços -> deve ser convertido para NULL via nullif
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, raw_user_meta_data, created_at, updated_at)
VALUES (
    'bbbbbbbb-2222-2222-2222-222222222222'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated',
    'authenticated',
    'usuario.b@example.com',
    'encrypted_pass',
    '{"nome": "Empresa Verde Limpo", "telefone": "   "}'::jsonb,
    now(),
    now()
);

SELECT is(
    (SELECT telefone FROM public.usuario WHERE id = 'bbbbbbbb-2222-2222-2222-222222222222'::uuid),
    NULL,
    'Telefone com espaços em branco é convertido para NULL via nullif'
);

-- Teste 4: Inserção em auth.users sem metadado "nome" aborta com exceção
SELECT throws_matching(
    $$INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, raw_user_meta_data, created_at, updated_at)
      VALUES (
        'cccccccc-3333-3333-3333-333333333333'::uuid,
        '00000000-0000-0000-0000-000000000000'::uuid,
        'authenticated',
        'authenticated',
        'sem.nome@example.com',
        'encrypted_pass',
        '{"telefone": "11999990000"}'::jsonb,
        now(),
        now()
      )$$,
    'Nome do usuário é obrigatório para criação do perfil.',
    'Cadastro em auth.users sem metadado nome é abortado com RAISE EXCEPTION'
);

-- Teste 5: Inserção em auth.users com "nome" em branco aborta com exceção
SELECT throws_matching(
    $$INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, raw_user_meta_data, created_at, updated_at)
      VALUES (
        'cccccccc-3333-3333-3333-333333333333'::uuid,
        '00000000-0000-0000-0000-000000000000'::uuid,
        'authenticated',
        'authenticated',
        'nome.branco@example.com',
        'encrypted_pass',
        '{"nome": "   ", "telefone": "11999990000"}'::jsonb,
        now(),
        now()
      )$$,
    'Nome do usuário é obrigatório para criação do perfil.',
    'Cadastro em auth.users com metadado nome contendo apenas espaços é abortado'
);

-- ============================================================================
-- 2. CENÁRIO DEFENSIVO: /concluir-perfil
-- ============================================================================

-- Simulação de anomalia: usuário existe em auth.users, mas registro em public.usuario ausente
DELETE FROM public.usuario WHERE id = 'bbbbbbbb-2222-2222-2222-222222222222'::uuid;

-- Como role authenticated simulando o usuário B
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = 'bbbbbbbb-2222-2222-2222-222222222222';

-- Teste 6: Usuário autenticado B consegue executar INSERT do seu próprio perfil (/concluir-perfil)
INSERT INTO public.usuario (id, nome, telefone)
VALUES ('bbbbbbbb-2222-2222-2222-222222222222'::uuid, 'Empresa Verde Limpo Recuperada', '11977776666');

SELECT is(
    (SELECT count(*)::integer FROM public.usuario WHERE id = 'bbbbbbbb-2222-2222-2222-222222222222'::uuid),
    1,
    'Fluxo defensivo /concluir-perfil permite criação direta de perfil pelo próprio usuário autenticado'
);

-- Teste 7: Leitura do perfil recém-criado por B
SELECT is(
    (SELECT nome FROM public.usuario WHERE id = 'bbbbbbbb-2222-2222-2222-222222222222'::uuid),
    'Empresa Verde Limpo Recuperada',
    'Perfil criado em /concluir-perfil persiste os dados informados'
);

-- Teste 8: Tentativa de /concluir-perfil com ID diferente de auth.uid() é rejeitada por RLS
SELECT throws_matching(
    $$INSERT INTO public.usuario (id, nome, telefone)
      VALUES ('cccccccc-3333-3333-3333-333333333333'::uuid, 'Perfil Forjado', '11900001111')$$,
    'new row violates row-level security policy for table "usuario"',
    'Tentativa de criar perfil com id diferente de auth.uid() é bloqueada pela policy WITH CHECK'
);

SELECT * FROM finish();
ROLLBACK;
