BEGIN;
SELECT plan(13);

-- ============================================================================
-- SETUP: CRIAÇÃO DE USER_A E USER_B VIA AUTH.USERS
-- ============================================================================
\set user_a '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
\set user_b '22222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb'

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, raw_user_meta_data, created_at, updated_at)
VALUES 
(
    '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated',
    'authenticated',
    'user.a@example.com',
    'encrypted_pass',
    '{"nome": "Jardineiro User A", "telefone": "11911111111"}'::jsonb,
    now(), now()
),
(
    '22222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated',
    'authenticated',
    'user.b@example.com',
    'encrypted_pass',
    '{"nome": "Paisagista User B", "telefone": "11922222222"}'::jsonb,
    now(), now()
);

-- ============================================================================
-- PERSPECTIVA DO USUÁRIO A
-- ============================================================================
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

-- Teste 1: SELECT próprio perfil retorna os dados corretos
SELECT is(
    (SELECT nome FROM public.usuario WHERE id = '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid),
    'Jardineiro User A',
    'User A lê com sucesso seu próprio perfil em public.usuario'
);

-- Teste 2: SELECT no perfil de User B retorna 0 linhas (invisível por RLS)
SELECT is(
    (SELECT count(*)::integer FROM public.usuario WHERE id = '22222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid),
    0,
    'User A não visualiza o perfil de User B (retorna 0 linhas)'
);

-- Teste 3: SELECT geral sem filtro WHERE retorna apenas 1 linha (seu próprio perfil)
SELECT is(
    (SELECT count(*)::integer FROM public.usuario),
    1,
    'User A em SELECT irrestrito visualiza exclusivamente seu próprio perfil'
);

-- Teste 4: UPDATE legítimo no próprio perfil
UPDATE public.usuario 
SET nome = 'Jardineiro User A Atualizado', telefone = '11999990000' 
WHERE id = '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid;

SELECT is(
    (SELECT nome FROM public.usuario WHERE id = '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid),
    'Jardineiro User A Atualizado',
    'User A atualiza com sucesso seus próprios dados de perfil'
);

-- Teste 5: Desativação lógica do próprio perfil (Decisão D1)
UPDATE public.usuario 
SET ativo = false 
WHERE id = '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid;

SELECT is(
    (SELECT ativo FROM public.usuario WHERE id = '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid),
    false,
    'User A realiza desativação lógica (ativo = false) com sucesso (Decisão D1)'
);

-- Teste 6: Tentativa de alterar id do perfil para outro UUID é rejeitada por WITH CHECK
SELECT throws_matching(
    $$UPDATE public.usuario SET id = '22222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid WHERE id = '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid$$,
    'new row violates row-level security policy for table "usuario"',
    'Tentativa de transferir titularidade do perfil via UPDATE id é bloqueada por WITH CHECK'
);

-- Teste 7: UPDATE tentando modificar o perfil de User B afeta 0 linhas
UPDATE public.usuario 
SET nome = 'Tentativa Hacker em B' 
WHERE id = '22222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid;

-- Como postgres, verificamos se o nome de B foi alterado
RESET ROLE;
SELECT is(
    (SELECT nome FROM public.usuario WHERE id = '22222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid),
    'Paisagista User B',
    'Tentativa de User A alterar perfil de User B afeta 0 linhas e é inócua'
);

-- Teste 8: DELETE no próprio perfil bloqueado por Default Deny (Decisão D1)
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

DELETE FROM public.usuario WHERE id = '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid;

RESET ROLE;
SELECT is(
    (SELECT count(*)::integer FROM public.usuario WHERE id = '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid),
    1,
    'DELETE no próprio perfil é bloqueado por Default Deny; registro permanece intacto (Decisão D1)'
);

-- Teste 9: DELETE no perfil de User B bloqueado por Default Deny
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

DELETE FROM public.usuario WHERE id = '22222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid;

RESET ROLE;
SELECT is(
    (SELECT count(*)::integer FROM public.usuario WHERE id = '22222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid),
    1,
    'DELETE no perfil de User B é bloqueado por Default Deny; registro permanece intacto'
);

-- ============================================================================
-- PERSPECTIVA SIMÉTRICA DO USUÁRIO B
-- ============================================================================
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '22222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

-- Teste 10: User B lê seu próprio perfil
SELECT is(
    (SELECT nome FROM public.usuario WHERE id = '22222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid),
    'Paisagista User B',
    'User B lê com sucesso seu próprio perfil'
);

-- Teste 11: User B não enxerga o perfil de User A
SELECT is(
    (SELECT count(*)::integer FROM public.usuario WHERE id = '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid),
    0,
    'User B não visualiza o perfil de User A'
);

-- Teste 12: User B tentando DELETE no próprio perfil afeta 0 linhas
DELETE FROM public.usuario WHERE id = '22222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid;

RESET ROLE;
SELECT is(
    (SELECT count(*)::integer FROM public.usuario WHERE id = '22222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid),
    1,
    'User B também é bloqueado por Default Deny ao tentar excluir seu perfil'
);

-- Teste 13: Confirmação de integridade dos dois perfis
SELECT is(
    (SELECT count(*)::integer FROM public.usuario WHERE id IN ('11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, '22222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid)),
    2,
    'Ambos os perfis continuam íntegros no banco de dados'
);

SELECT * FROM finish();
ROLLBACK;
