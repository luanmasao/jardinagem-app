BEGIN;
SELECT plan(27);

-- ============================================================================
-- SETUP: USUÁRIOS A E B
-- ============================================================================
\set user_a '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
\set user_b '22222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb'

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

-- ============================================================================
-- SETUP DE DADOS DE USER_B
-- ============================================================================
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '22222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

INSERT INTO public.cliente (id, usuario_id, nome, telefone)
VALUES ('bbbb0001-0000-0000-0000-000000000001'::uuid, '22222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, 'Cliente de B', '11988880000');

INSERT INTO public.servico (id, usuario_id, nome, unidade, preco_base, usa_medicao_area)
VALUES ('bbbb0002-0000-0000-0000-000000000002'::uuid, '22222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, 'Poda de B', 'm²', 25.00, true);

INSERT INTO public.produto (id, usuario_id, nome, unidade, preco_base)
VALUES ('bbbb0003-0000-0000-0000-000000000003'::uuid, '22222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, 'Adubo de B', 'saco', 45.00);

-- ============================================================================
-- BATERIA CLIENTE (PERSPECTIVA DE USER_A)
-- ============================================================================
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

-- 1. INSERT legítimo de clientes de A
INSERT INTO public.cliente (id, usuario_id, nome, telefone)
VALUES 
('aaaa0001-0000-0000-0000-000000000001'::uuid, '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'Cliente A 1', '11911110001'),
('aaaa0002-0000-0000-0000-000000000002'::uuid, '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'Cliente A 2 Descartável', '11911110002');

-- Teste 1: SELECT retorna apenas clientes de A
SELECT is(
    (SELECT count(*)::integer FROM public.cliente),
    2,
    'User A visualiza apenas seus 2 próprios clientes'
);

-- Teste 2: SELECT filtrado pelo ID de cliente de B retorna 0 linhas
SELECT is(
    (SELECT count(*)::integer FROM public.cliente WHERE id = 'bbbb0001-0000-0000-0000-000000000001'::uuid),
    0,
    'Cliente de B é invisível para User A'
);

-- Teste 3: Tentativa de INSERT associando a usuario_id de B é bloqueada por WITH CHECK
SELECT throws_matching(
    $$INSERT INTO public.cliente (id, usuario_id, nome, telefone)
      VALUES ('aaaa0003-0000-0000-0000-000000000003'::uuid, '22222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, 'Cliente Forjado', '11999998888')$$,
    'new row violates row-level security policy for table "cliente"',
    'User A não pode inserir cliente apontando para usuario_id de B'
);

-- Teste 4: UPDATE legítimo de cliente de A
UPDATE public.cliente SET nome = 'Cliente A 1 Modificado' WHERE id = 'aaaa0001-0000-0000-0000-000000000001'::uuid;
SELECT is(
    (SELECT nome FROM public.cliente WHERE id = 'aaaa0001-0000-0000-0000-000000000001'::uuid),
    'Cliente A 1 Modificado',
    'User A atualiza nome de cliente próprio com sucesso'
);

-- Teste 5: UPDATE tentando transferir cliente para B é bloqueado por WITH CHECK
SELECT throws_matching(
    $$UPDATE public.cliente SET usuario_id = '22222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid WHERE id = 'aaaa0001-0000-0000-0000-000000000001'::uuid$$,
    'new row violates row-level security policy for table "cliente"',
    'User A não pode transferir cliente para usuario_id de B'
);

-- Teste 6: UPDATE em cliente de B afeta 0 linhas
UPDATE public.cliente SET nome = 'Hacked Cliente B' WHERE id = 'bbbb0001-0000-0000-0000-000000000001'::uuid;
RESET ROLE;
SELECT is(
    (SELECT nome FROM public.cliente WHERE id = 'bbbb0001-0000-0000-0000-000000000001'::uuid),
    'Cliente de B',
    'Tentativa de alterar cliente de B é inócua'
);

-- Teste 7: DELETE de cliente sem orçamentos vinculados tem sucesso
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
DELETE FROM public.cliente WHERE id = 'aaaa0002-0000-0000-0000-000000000002'::uuid;

SELECT is(
    (SELECT count(*)::integer FROM public.cliente WHERE id = 'aaaa0002-0000-0000-0000-000000000002'::uuid),
    0,
    'User A exclui cliente próprio sem vínculos históricos com sucesso'
);

-- Teste 8: DELETE em cliente de B afeta 0 linhas
DELETE FROM public.cliente WHERE id = 'bbbb0001-0000-0000-0000-000000000001'::uuid;
RESET ROLE;
SELECT is(
    (SELECT count(*)::integer FROM public.cliente WHERE id = 'bbbb0001-0000-0000-0000-000000000001'::uuid),
    1,
    'Tentativa de excluir cliente de B é inócua'
);

-- Teste 9: DELETE de cliente com orçamento vinculado é bloqueado por FK RESTRICT
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
INSERT INTO public.orcamento (id, usuario_id, cliente_id, numero, status)
VALUES ('aaaa0010-0000-0000-0000-000000000010'::uuid, '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'aaaa0001-0000-0000-0000-000000000001'::uuid, 'ORC-001', 'RASCUNHO');

SELECT throws_matching(
    $$DELETE FROM public.cliente WHERE id = 'aaaa0001-0000-0000-0000-000000000001'::uuid$$,
    'violates foreign key constraint "orcamento_cliente_id_fkey" on table "orcamento"',
    'Exclusão física de cliente com orçamentos vinculados é bloqueada por ON DELETE RESTRICT'
);

-- ============================================================================
-- BATERIA SERVIÇO (PERSPECTIVA DE USER_A)
-- ============================================================================
-- Inserção de serviços próprios de A
INSERT INTO public.servico (id, usuario_id, nome, unidade, preco_base, usa_medicao_area)
VALUES 
('aaaa0020-0000-0000-0000-000000000020'::uuid, '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'Corte de Grama A', 'm²', 15.00, true),
('aaaa0021-0000-0000-0000-000000000021'::uuid, '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'Limpeza de Canteiro Descartável', 'unidade', 50.00, false);

-- Teste 10: SELECT retorna apenas serviços de A
SELECT is(
    (SELECT count(*)::integer FROM public.servico),
    2,
    'User A visualiza apenas seus 2 próprios serviços'
);

-- Teste 11: Serviço de B invisível para A
SELECT is(
    (SELECT count(*)::integer FROM public.servico WHERE id = 'bbbb0002-0000-0000-0000-000000000002'::uuid),
    0,
    'Serviço de B é invisível para User A'
);

-- Teste 12: INSERT de serviço para usuario_id de B é bloqueado por WITH CHECK
SELECT throws_matching(
    $$INSERT INTO public.servico (id, usuario_id, nome, unidade, preco_base, usa_medicao_area)
      VALUES ('aaaa0022-0000-0000-0000-000000000022'::uuid, '22222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, 'Serviço Ilegal', 'm²', 20.00, true)$$,
    'new row violates row-level security policy for table "servico"',
    'User A não pode inserir serviço apontando para usuario_id de B'
);

-- Teste 13: UPDATE próprio de serviço
UPDATE public.servico SET preco_base = 18.00 WHERE id = 'aaaa0020-0000-0000-0000-000000000020'::uuid;
SELECT is(
    (SELECT preco_base FROM public.servico WHERE id = 'aaaa0020-0000-0000-0000-000000000020'::uuid),
    18.00,
    'User A atualiza preço de serviço próprio com sucesso'
);

-- Teste 14: UPDATE tentando transferir serviço para B é bloqueado
SELECT throws_matching(
    $$UPDATE public.servico SET usuario_id = '22222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid WHERE id = 'aaaa0020-0000-0000-0000-000000000020'::uuid$$,
    'new row violates row-level security policy for table "servico"',
    'User A não pode transferir serviço para usuario_id de B'
);

-- Teste 15: UPDATE em serviço de B afeta 0 linhas
UPDATE public.servico SET preco_base = 999.00 WHERE id = 'bbbb0002-0000-0000-0000-000000000002'::uuid;
RESET ROLE;
SELECT is(
    (SELECT preco_base FROM public.servico WHERE id = 'bbbb0002-0000-0000-0000-000000000002'::uuid),
    25.00,
    'Tentativa de alterar serviço de B é inócua'
);

-- Teste 16: DELETE em serviço sem itens tem sucesso
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
DELETE FROM public.servico WHERE id = 'aaaa0021-0000-0000-0000-000000000021'::uuid;

SELECT is(
    (SELECT count(*)::integer FROM public.servico WHERE id = 'aaaa0021-0000-0000-0000-000000000021'::uuid),
    0,
    'User A exclui serviço próprio sem itens com sucesso'
);

-- Teste 17: DELETE em serviço de B afeta 0 linhas
DELETE FROM public.servico WHERE id = 'bbbb0002-0000-0000-0000-000000000002'::uuid;
RESET ROLE;
SELECT is(
    (SELECT count(*)::integer FROM public.servico WHERE id = 'bbbb0002-0000-0000-0000-000000000002'::uuid),
    1,
    'Tentativa de excluir serviço de B é inócua'
);

-- Teste 18: DELETE de serviço referenciado em item_orcamento é bloqueado por FK RESTRICT
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
INSERT INTO public.item_orcamento (id, orcamento_id, servico_id, tipo, descricao, quantidade, unidade, valor_unitario, valor_total, usa_medicao_area)
VALUES ('aaaa0030-0000-0000-0000-000000000030'::uuid, 'aaaa0010-0000-0000-0000-000000000010'::uuid, 'aaaa0020-0000-0000-0000-000000000020'::uuid, 'SERVICO', 'Corte de Grama Item', 100, 'm²', 18.00, 1800.00, true);

SELECT throws_matching(
    $$DELETE FROM public.servico WHERE id = 'aaaa0020-0000-0000-0000-000000000020'::uuid$$,
    'violates foreign key constraint "item_orcamento_servico_id_fkey" on table "item_orcamento"',
    'Exclusão de serviço referenciado em itens é bloqueada por ON DELETE RESTRICT'
);

-- ============================================================================
-- BATERIA PRODUTO (PERSPECTIVA DE USER_A)
-- ============================================================================
-- Inserção de produtos próprios de A
INSERT INTO public.produto (id, usuario_id, nome, unidade, preco_base)
VALUES 
('aaaa0040-0000-0000-0000-000000000040'::uuid, '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'Muda de Palmeira A', 'muda', 120.00),
('aaaa0041-0000-0000-0000-000000000041'::uuid, '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'Terra Vegetal Descartável', 'saco', 15.00);

-- Teste 19: SELECT retorna apenas produtos de A
SELECT is(
    (SELECT count(*)::integer FROM public.produto),
    2,
    'User A visualiza apenas seus 2 próprios produtos'
);

-- Teste 20: Produto de B invisível para A
SELECT is(
    (SELECT count(*)::integer FROM public.produto WHERE id = 'bbbb0003-0000-0000-0000-000000000003'::uuid),
    0,
    'Produto de B é invisível para User A'
);

-- Teste 21: INSERT de produto para usuario_id de B é bloqueado por WITH CHECK
SELECT throws_matching(
    $$INSERT INTO public.produto (id, usuario_id, nome, unidade, preco_base)
      VALUES ('aaaa0042-0000-0000-0000-000000000042'::uuid, '22222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, 'Produto Ilegal', 'unidade', 10.00)$$,
    'new row violates row-level security policy for table "produto"',
    'User A não pode inserir produto apontando para usuario_id de B'
);

-- Teste 22: UPDATE próprio de produto
UPDATE public.produto SET preco_base = 130.00 WHERE id = 'aaaa0040-0000-0000-0000-000000000040'::uuid;
SELECT is(
    (SELECT preco_base FROM public.produto WHERE id = 'aaaa0040-0000-0000-0000-000000000040'::uuid),
    130.00,
    'User A atualiza preço de produto próprio com sucesso'
);

-- Teste 23: UPDATE tentando transferir produto para B é bloqueado
SELECT throws_matching(
    $$UPDATE public.produto SET usuario_id = '22222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid WHERE id = 'aaaa0040-0000-0000-0000-000000000040'::uuid$$,
    'new row violates row-level security policy for table "produto"',
    'User A não pode transferir produto para usuario_id de B'
);

-- Teste 24: UPDATE em produto de B afeta 0 linhas
UPDATE public.produto SET preco_base = 999.00 WHERE id = 'bbbb0003-0000-0000-0000-000000000003'::uuid;
RESET ROLE;
SELECT is(
    (SELECT preco_base FROM public.produto WHERE id = 'bbbb0003-0000-0000-0000-000000000003'::uuid),
    45.00,
    'Tentativa de alterar produto de B é inócua'
);

-- Teste 25: DELETE em produto sem itens tem sucesso
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
DELETE FROM public.produto WHERE id = 'aaaa0041-0000-0000-0000-000000000041'::uuid;

SELECT is(
    (SELECT count(*)::integer FROM public.produto WHERE id = 'aaaa0041-0000-0000-0000-000000000041'::uuid),
    0,
    'User A exclui produto próprio sem itens com sucesso'
);

-- Teste 26: DELETE em produto de B afeta 0 linhas
DELETE FROM public.produto WHERE id = 'bbbb0003-0000-0000-0000-000000000003'::uuid;
RESET ROLE;
SELECT is(
    (SELECT count(*)::integer FROM public.produto WHERE id = 'bbbb0003-0000-0000-0000-000000000003'::uuid),
    1,
    'Tentativa de excluir produto de B é inócua'
);

-- Teste 27: DELETE de produto referenciado em item_orcamento é bloqueado por FK RESTRICT
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
INSERT INTO public.item_orcamento (id, orcamento_id, produto_id, tipo, descricao, quantidade, unidade, valor_unitario, valor_total, usa_medicao_area)
VALUES ('aaaa0050-0000-0000-0000-000000000050'::uuid, 'aaaa0010-0000-0000-0000-000000000010'::uuid, 'aaaa0040-0000-0000-0000-000000000040'::uuid, 'PRODUTO', 'Muda de Palmeira Item', 2, 'muda', 130.00, 260.00, false);

SELECT throws_matching(
    $$DELETE FROM public.produto WHERE id = 'aaaa0040-0000-0000-0000-000000000040'::uuid$$,
    'violates foreign key constraint "item_orcamento_produto_id_fkey" on table "item_orcamento"',
    'Exclusão de produto referenciado em itens é bloqueada por ON DELETE RESTRICT'
);

SELECT * FROM finish();
ROLLBACK;
