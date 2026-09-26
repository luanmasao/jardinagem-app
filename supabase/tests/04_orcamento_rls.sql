BEGIN;
SELECT plan(16);

-- ============================================================================
-- SETUP: USUÁRIOS A E B + CLIENTES
-- ============================================================================
\set user_a '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
\set user_b '22222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
\set cli_a   'aaaa0001-0000-0000-0000-000000000001'
\set cli_b   'bbbb0001-0000-0000-0000-000000000001'

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, raw_user_meta_data, created_at, updated_at)
VALUES 
(
    '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated', 'authenticated', 'user.a@example.com', 'pass',
    '{"nome": "Profissional A", "telefone": "11911111111"}'::jsonb, now(), now()
),
(
    '22222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated', 'authenticated', 'user.b@example.com', 'pass',
    '{"nome": "Profissional B", "telefone": "11922222222"}'::jsonb, now(), now()
);

-- Inserção de clientes para A e B
INSERT INTO public.cliente (id, usuario_id, nome)
VALUES 
('aaaa0001-0000-0000-0000-000000000001'::uuid, '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'Cliente de A'),
('bbbb0001-0000-0000-0000-000000000001'::uuid, '22222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, 'Cliente de B');

-- Setup orçamento de B
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '22222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

INSERT INTO public.orcamento (id, usuario_id, cliente_id, numero, status)
VALUES ('bbbb0010-0000-0000-0000-000000000010'::uuid, '22222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, 'bbbb0001-0000-0000-0000-000000000001'::uuid, 'ORC-B-01', 'RASCUNHO');

-- ============================================================================
-- PERSPECTIVA DE USER_A
-- ============================================================================
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

-- Teste 1: INSERT legítimo de orçamento de A com cliente próprio
INSERT INTO public.orcamento (id, usuario_id, cliente_id, numero, status, observacoes)
VALUES ('aaaa0010-0000-0000-0000-000000000010'::uuid, '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'aaaa0001-0000-0000-0000-000000000001'::uuid, 'ORC-A-01', 'RASCUNHO', 'Orçamento A Rascunho');

SELECT is(
    (SELECT count(*)::integer FROM public.orcamento WHERE id = 'aaaa0010-0000-0000-0000-000000000010'::uuid),
    1,
    'User A cria orçamento próprio com cliente próprio com sucesso'
);

-- Teste 2: INSERT de orçamento apontando para cliente de B é bloqueado (anti-cross-tenant)
SELECT throws_matching(
    $$INSERT INTO public.orcamento (id, usuario_id, cliente_id, numero, status)
      VALUES ('aaaa0011-0000-0000-0000-000000000011'::uuid, '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'bbbb0001-0000-0000-0000-000000000001'::uuid, 'ORC-A-FORJADO', 'RASCUNHO')$$,
    'new row violates row-level security policy for table "orcamento"',
    'Tentativa de criar orçamento associado a cliente de B é bloqueada por WITH CHECK'
);

-- Teste 3: INSERT com usuario_id de B é bloqueado por WITH CHECK
SELECT throws_matching(
    $$INSERT INTO public.orcamento (id, usuario_id, cliente_id, numero, status)
      VALUES ('aaaa0012-0000-0000-0000-000000000012'::uuid, '22222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, 'aaaa0001-0000-0000-0000-000000000001'::uuid, 'ORC-A-USURPADO', 'RASCUNHO')$$,
    'new row violates row-level security policy for table "orcamento"',
    'Tentativa de criar orçamento com usuario_id diferente de auth.uid() é bloqueada'
);

-- Teste 4: SELECT retorna apenas orçamentos de A
SELECT is(
    (SELECT count(*)::integer FROM public.orcamento),
    1,
    'User A visualiza apenas seus próprios orçamentos'
);

-- Teste 5: Orçamento de B é invisível para A
SELECT is(
    (SELECT count(*)::integer FROM public.orcamento WHERE id = 'bbbb0010-0000-0000-0000-000000000010'::uuid),
    0,
    'Orçamento de B é invisível para User A'
);

-- Teste 6: UPDATE legítimo em orçamento de A
UPDATE public.orcamento SET observacoes = 'Obs Atualizada' WHERE id = 'aaaa0010-0000-0000-0000-000000000010'::uuid;
SELECT is(
    (SELECT observacoes FROM public.orcamento WHERE id = 'aaaa0010-0000-0000-0000-000000000010'::uuid),
    'Obs Atualizada',
    'User A atualiza observações de orçamento próprio com sucesso'
);

-- Teste 7: UPDATE tentando alterar cliente_id para cliente de B é bloqueado por WITH CHECK
SELECT throws_matching(
    $$UPDATE public.orcamento SET cliente_id = 'bbbb0001-0000-0000-0000-000000000001'::uuid WHERE id = 'aaaa0010-0000-0000-0000-000000000010'::uuid$$,
    'new row violates row-level security policy for table "orcamento"',
    'Tentativa de trocar cliente para cliente de B via UPDATE é bloqueada por WITH CHECK'
);

-- Teste 8: UPDATE tentando transferir titularidade usuario_id para B é bloqueado por WITH CHECK
SELECT throws_matching(
    $$UPDATE public.orcamento SET usuario_id = '22222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid WHERE id = 'aaaa0010-0000-0000-0000-000000000010'::uuid$$,
    'new row violates row-level security policy for table "orcamento"',
    'Tentativa de transferir titularidade de orçamento via UPDATE usuario_id é bloqueada'
);

-- Teste 9: UPDATE em orçamento de B afeta 0 linhas
UPDATE public.orcamento SET observacoes = 'Hacked B' WHERE id = 'bbbb0010-0000-0000-0000-000000000010'::uuid;
RESET ROLE;
SELECT is(
    (SELECT observacoes FROM public.orcamento WHERE id = 'bbbb0010-0000-0000-0000-000000000010'::uuid),
    NULL,
    'Tentativa de User A atualizar orçamento de B é inócua'
);

-- Teste 10: DELETE em orçamento de B afeta 0 linhas
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
DELETE FROM public.orcamento WHERE id = 'bbbb0010-0000-0000-0000-000000000010'::uuid;

RESET ROLE;
SELECT is(
    (SELECT count(*)::integer FROM public.orcamento WHERE id = 'bbbb0010-0000-0000-0000-000000000010'::uuid),
    1,
    'Tentativa de User A excluir orçamento de B afeta 0 linhas; orçamento de B permanece intacto'
);

-- ============================================================================
-- DECISÃO D2: EXCLUSÃO CONDICIONADA A RASCUNHO
-- ============================================================================
-- Inserir mais orçamentos para A em diferentes status
INSERT INTO public.orcamento (id, usuario_id, cliente_id, numero, status)
VALUES 
('aaaa0013-0000-0000-0000-000000000013'::uuid, '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'aaaa0001-0000-0000-0000-000000000001'::uuid, 'ORC-A-ENV', 'ENVIADO'),
('aaaa0014-0000-0000-0000-000000000014'::uuid, '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'aaaa0001-0000-0000-0000-000000000001'::uuid, 'ORC-A-APR', 'APROVADO');

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

-- Teste 11: DELETE de orçamento em RASCUNHO é permitido e tem sucesso (Decisão D2)
DELETE FROM public.orcamento WHERE id = 'aaaa0010-0000-0000-0000-000000000010'::uuid;
SELECT is(
    (SELECT count(*)::integer FROM public.orcamento WHERE id = 'aaaa0010-0000-0000-0000-000000000010'::uuid),
    0,
    'Exclusão de orçamento em status RASCUNHO tem sucesso (Decisão D2)'
);

-- Teste 12: DELETE de orçamento em status ENVIADO é bloqueado por RLS (afeta 0 linhas)
DELETE FROM public.orcamento WHERE id = 'aaaa0013-0000-0000-0000-000000000013'::uuid;
SELECT is(
    (SELECT count(*)::integer FROM public.orcamento WHERE id = 'aaaa0013-0000-0000-0000-000000000013'::uuid),
    1,
    'Exclusão de orçamento em status ENVIADO é bloqueada por RLS (Decisão D2)'
);

-- Teste 13: DELETE de orçamento em status APROVADO é bloqueado por RLS (afeta 0 linhas)
DELETE FROM public.orcamento WHERE id = 'aaaa0014-0000-0000-0000-000000000014'::uuid;
SELECT is(
    (SELECT count(*)::integer FROM public.orcamento WHERE id = 'aaaa0014-0000-0000-0000-000000000014'::uuid),
    1,
    'Exclusão de orçamento em status APROVADO é bloqueada por RLS (Decisão D2)'
);

-- ============================================================================
-- PERSPECTIVA DE USER_B
-- ============================================================================
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '22222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

-- Teste 14: User B vê apenas seu próprio orçamento
SELECT is(
    (SELECT count(*)::integer FROM public.orcamento),
    1,
    'User B visualiza apenas seus próprios orçamentos'
);

-- Teste 15: User B não vê os orçamentos de A
SELECT is(
    (SELECT count(*)::integer FROM public.orcamento WHERE id IN ('aaaa0013-0000-0000-0000-000000000013'::uuid, 'aaaa0014-0000-0000-0000-000000000014'::uuid)),
    0,
    'User B não visualiza nenhum orçamento de User A'
);

-- Teste 16: User B exclui seu próprio orçamento em RASCUNHO com sucesso
DELETE FROM public.orcamento WHERE id = 'bbbb0010-0000-0000-0000-000000000010'::uuid;
SELECT is(
    (SELECT count(*)::integer FROM public.orcamento WHERE id = 'bbbb0010-0000-0000-0000-000000000010'::uuid),
    0,
    'User B exclui seu orçamento em RASCUNHO com sucesso'
);

SELECT * FROM finish();
ROLLBACK;
