BEGIN;
SELECT plan(22);

-- ============================================================================
-- SETUP: USUÁRIOS A E B + CLIENTES + SERVIÇOS + PRODUTOS + ORÇAMENTOS
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

-- Clientes
INSERT INTO public.cliente (id, usuario_id, nome)
VALUES 
('aaaa0001-0000-0000-0000-000000000001'::uuid, '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'Cliente de A'),
('bbbb0001-0000-0000-0000-000000000001'::uuid, '22222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, 'Cliente de B');

-- Catálogos
INSERT INTO public.servico (id, usuario_id, nome, unidade, preco_base, usa_medicao_area)
VALUES 
('aaaa0020-0000-0000-0000-000000000020'::uuid, '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'Gramado A', 'm²', 20.00, true),
('bbbb0020-0000-0000-0000-000000000020'::uuid, '22222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, 'Gramado B', 'm²', 30.00, true);

INSERT INTO public.produto (id, usuario_id, nome, unidade, preco_base)
VALUES 
('aaaa0030-0000-0000-0000-000000000030'::uuid, '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'Fertilizante A', 'kg', 10.00),
('bbbb0030-0000-0000-0000-000000000030'::uuid, '22222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, 'Fertilizante B', 'kg', 15.00);

-- Orçamentos:
-- A: 1 em RASCUNHO, 1 em ENVIADO
-- B: 1 em RASCUNHO
INSERT INTO public.orcamento (id, usuario_id, cliente_id, numero, status)
VALUES 
('aaaa0010-0000-0000-0000-000000000010'::uuid, '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'aaaa0001-0000-0000-0000-000000000001'::uuid, 'ORC-A-RASC', 'RASCUNHO'),
('aaaa0011-0000-0000-0000-000000000011'::uuid, '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'aaaa0001-0000-0000-0000-000000000001'::uuid, 'ORC-A-ENV', 'ENVIADO'),
('bbbb0010-0000-0000-0000-000000000010'::uuid, '22222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, 'bbbb0001-0000-0000-0000-000000000001'::uuid, 'ORC-B-RASC', 'RASCUNHO');

-- Setup dados em B (item e área)
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '22222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

INSERT INTO public.item_orcamento (id, orcamento_id, servico_id, tipo, descricao, quantidade, unidade, valor_unitario, valor_total, usa_medicao_area)
VALUES ('bbbb0040-0000-0000-0000-000000000040'::uuid, 'bbbb0010-0000-0000-0000-000000000010'::uuid, 'bbbb0020-0000-0000-0000-000000000020'::uuid, 'SERVICO', 'Item de B', 50, 'm²', 30.00, 1500.00, true);

INSERT INTO public.area (id, item_orcamento_id, nome, geometria, area_calculada, unidade)
VALUES ('bbbb0050-0000-0000-0000-000000000050'::uuid, 'bbbb0040-0000-0000-0000-000000000040'::uuid, 'Jardim de B', ST_GeomFromText('POLYGON((0 0, 0 5, 5 5, 5 0, 0 0))', 4326), 25.00, 'm²');

-- ============================================================================
-- PERSPECTIVA DE USER_A: ITEM_ORCAMENTO
-- ============================================================================
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

-- Teste 1: INSERT legítimo de item com serviço próprio de A em orçamento próprio de A
INSERT INTO public.item_orcamento (id, orcamento_id, servico_id, tipo, descricao, quantidade, unidade, valor_unitario, valor_total, usa_medicao_area)
VALUES ('aaaa0040-0000-0000-0000-000000000040'::uuid, 'aaaa0010-0000-0000-0000-000000000010'::uuid, 'aaaa0020-0000-0000-0000-000000000020'::uuid, 'SERVICO', 'Grama A Rascunho', 100, 'm²', 20.00, 2000.00, true);

SELECT is(
    (SELECT count(*)::integer FROM public.item_orcamento WHERE id = 'aaaa0040-0000-0000-0000-000000000040'::uuid),
    1,
    'User A insere item com serviço e orçamento próprios com sucesso'
);

-- Teste 2: INSERT legítimo de produto próprio de A em orçamento próprio de A
INSERT INTO public.item_orcamento (id, orcamento_id, produto_id, tipo, descricao, quantidade, unidade, valor_unitario, valor_total, usa_medicao_area)
VALUES ('aaaa0041-0000-0000-0000-000000000041'::uuid, 'aaaa0010-0000-0000-0000-000000000010'::uuid, 'aaaa0030-0000-0000-0000-000000000030'::uuid, 'PRODUTO', 'Fertilizante Item', 5, 'kg', 10.00, 50.00, false);

SELECT is(
    (SELECT count(*)::integer FROM public.item_orcamento WHERE id = 'aaaa0041-0000-0000-0000-000000000041'::uuid),
    1,
    'User A insere item de produto próprio com sucesso'
);

-- Teste 3: Tentativa de INSERT em orçamento de B é bloqueada por WITH CHECK
SELECT throws_matching(
    $$INSERT INTO public.item_orcamento (id, orcamento_id, servico_id, tipo, descricao, quantidade, unidade, valor_unitario, valor_total, usa_medicao_area)
      VALUES ('aaaa0042-0000-0000-0000-000000000042'::uuid, 'bbbb0010-0000-0000-0000-000000000010'::uuid, 'aaaa0020-0000-0000-0000-000000000020'::uuid, 'SERVICO', 'Invasão em B', 10, 'm²', 20.00, 200.00, true)$$,
    'new row violates row-level security policy for table "item_orcamento"',
    'User A não pode inserir item em orçamento pertencente a User B'
);

-- Teste 4: Tentativa de INSERT com serviço de B em orçamento de A é bloqueada (anti-cross-tenant catálogo)
SELECT throws_matching(
    $$INSERT INTO public.item_orcamento (id, orcamento_id, servico_id, tipo, descricao, quantidade, unidade, valor_unitario, valor_total, usa_medicao_area)
      VALUES ('aaaa0043-0000-0000-0000-000000000043'::uuid, 'aaaa0010-0000-0000-0000-000000000010'::uuid, 'bbbb0020-0000-0000-0000-000000000020'::uuid, 'SERVICO', 'Uso de servico B', 10, 'm²', 30.00, 300.00, true)$$,
    'new row violates row-level security policy for table "item_orcamento"',
    'User A não pode vincular serviço de User B em item próprio'
);

-- Teste 5: Tentativa de INSERT com produto de B em orçamento de A é bloqueada (anti-cross-tenant catálogo)
SELECT throws_matching(
    $$INSERT INTO public.item_orcamento (id, orcamento_id, produto_id, tipo, descricao, quantidade, unidade, valor_unitario, valor_total, usa_medicao_area)
      VALUES ('aaaa0044-0000-0000-0000-000000000044'::uuid, 'aaaa0010-0000-0000-0000-000000000010'::uuid, 'bbbb0030-0000-0000-0000-000000000030'::uuid, 'PRODUTO', 'Uso de produto B', 10, 'kg', 15.00, 150.00, false)$$,
    'new row violates row-level security policy for table "item_orcamento"',
    'User A não pode vincular produto de User B em item próprio'
);

-- Teste 6: SELECT retorna apenas itens de orçamentos de A
SELECT is(
    (SELECT count(*)::integer FROM public.item_orcamento),
    2,
    'User A visualiza apenas os itens de seus próprios orçamentos'
);

-- Teste 7: Item de B é invisível para A
SELECT is(
    (SELECT count(*)::integer FROM public.item_orcamento WHERE id = 'bbbb0040-0000-0000-0000-000000000040'::uuid),
    0,
    'Item de orçamento de B é invisível para User A'
);

-- Teste 8: UPDATE em item próprio
UPDATE public.item_orcamento SET quantidade = 120, valor_total = 2400.00 WHERE id = 'aaaa0040-0000-0000-0000-000000000040'::uuid;
SELECT is(
    (SELECT quantidade FROM public.item_orcamento WHERE id = 'aaaa0040-0000-0000-0000-000000000040'::uuid),
    120.00,
    'User A atualiza quantidade em item próprio com sucesso'
);

-- Teste 9: UPDATE tentando mudar orcamento_id para orçamento de B é bloqueado por WITH CHECK
SELECT throws_matching(
    $$UPDATE public.item_orcamento SET orcamento_id = 'bbbb0010-0000-0000-0000-000000000010'::uuid WHERE id = 'aaaa0040-0000-0000-0000-000000000040'::uuid$$,
    'new row violates row-level security policy for table "item_orcamento"',
    'Tentativa de transferir item para orçamento de B via UPDATE é bloqueada'
);

-- Teste 10: UPDATE em item de B afeta 0 linhas
UPDATE public.item_orcamento SET quantidade = 999 WHERE id = 'bbbb0040-0000-0000-0000-000000000040'::uuid;
RESET ROLE;
SELECT is(
    (SELECT quantidade FROM public.item_orcamento WHERE id = 'bbbb0040-0000-0000-0000-000000000040'::uuid),
    50.00,
    'Tentativa de User A alterar item de B é inócua'
);

-- Teste 11: DELETE em item de B afeta 0 linhas
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
DELETE FROM public.item_orcamento WHERE id = 'bbbb0040-0000-0000-0000-000000000040'::uuid;

RESET ROLE;
SELECT is(
    (SELECT count(*)::integer FROM public.item_orcamento WHERE id = 'bbbb0040-0000-0000-0000-000000000040'::uuid),
    1,
    'Tentativa de User A excluir item de B é inócua; item de B permanece intacto'
);

-- Teste 12: Inserção de item em orçamento com status ENVIADO
INSERT INTO public.item_orcamento (id, orcamento_id, servico_id, tipo, descricao, quantidade, unidade, valor_unitario, valor_total, usa_medicao_area)
VALUES ('aaaa0045-0000-0000-0000-000000000045'::uuid, 'aaaa0011-0000-0000-0000-000000000011'::uuid, 'aaaa0020-0000-0000-0000-000000000020'::uuid, 'SERVICO', 'Grama A em Enviado', 50, 'm²', 20.00, 1000.00, true);

SELECT is(
    (SELECT count(*)::integer FROM public.item_orcamento WHERE id = 'aaaa0045-0000-0000-0000-000000000045'::uuid),
    1,
    'Item em orçamento com status ENVIADO existe no banco'
);

-- Teste 13: DELETE de item em orçamento ENVIADO é bloqueado por RLS (Decisão D2)
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
DELETE FROM public.item_orcamento WHERE id = 'aaaa0045-0000-0000-0000-000000000045'::uuid;

SELECT is(
    (SELECT count(*)::integer FROM public.item_orcamento WHERE id = 'aaaa0045-0000-0000-0000-000000000045'::uuid),
    1,
    'DELETE de item cujo orçamento pai está em ENVIADO é bloqueado por RLS (Decisão D2)'
);

-- Teste 14: DELETE de item cujo orçamento está em RASCUNHO tem sucesso (Decisão D2)
DELETE FROM public.item_orcamento WHERE id = 'aaaa0041-0000-0000-0000-000000000041'::uuid;
SELECT is(
    (SELECT count(*)::integer FROM public.item_orcamento WHERE id = 'aaaa0041-0000-0000-0000-000000000041'::uuid),
    0,
    'DELETE de item cujo orçamento pai está em RASCUNHO tem sucesso (Decisão D2)'
);

-- ============================================================================
-- PERSPECTIVA DE USER_A: AREA
-- ============================================================================
-- Teste 15: INSERT legítimo de área vinculada a item de orçamento medido de A
INSERT INTO public.area (id, item_orcamento_id, nome, geometria, area_calculada, unidade)
VALUES ('aaaa0050-0000-0000-0000-000000000050'::uuid, 'aaaa0040-0000-0000-0000-000000000040'::uuid, 'Jardim Frontal A', ST_GeomFromText('POLYGON((0 0, 0 10, 10 10, 10 0, 0 0))', 4326), 100.00, 'm²');

SELECT is(
    (SELECT count(*)::integer FROM public.area WHERE id = 'aaaa0050-0000-0000-0000-000000000050'::uuid),
    1,
    'User A insere área própria em item próprio com sucesso'
);

-- Teste 16: Tentativa de INSERT de área apontando para item de B é bloqueada por WITH CHECK
SELECT throws_matching(
    $$INSERT INTO public.area (id, item_orcamento_id, nome, geometria, area_calculada, unidade)
      VALUES ('aaaa0051-0000-0000-0000-000000000051'::uuid, 'bbbb0040-0000-0000-0000-000000000040'::uuid, 'Área Forjada', ST_GeomFromText('POLYGON((0 0, 0 1, 1 1, 1 0, 0 0))', 4326), 1.00, 'm²')$$,
    'new row violates row-level security policy for table "area"',
    'User A não pode inserir área vinculada a item de orçamento pertencente a User B'
);

-- Teste 17: SELECT retorna apenas áreas de A
SELECT is(
    (SELECT count(*)::integer FROM public.area),
    1,
    'User A visualiza apenas suas próprias áreas'
);

-- Teste 18: Área de B é invisível para A
SELECT is(
    (SELECT count(*)::integer FROM public.area WHERE id = 'bbbb0050-0000-0000-0000-000000000050'::uuid),
    0,
    'Área de B é invisível para User A'
);

-- Teste 19: UPDATE legítimo em área própria de A
UPDATE public.area SET nome = 'Jardim Frontal A Renomeado' WHERE id = 'aaaa0050-0000-0000-0000-000000000050'::uuid;
SELECT is(
    (SELECT nome FROM public.area WHERE id = 'aaaa0050-0000-0000-0000-000000000050'::uuid),
    'Jardim Frontal A Renomeado',
    'User A atualiza nome de área própria com sucesso'
);

-- Teste 20: UPDATE tentando mudar item_orcamento_id para item de B é bloqueado por WITH CHECK
SELECT throws_matching(
    $$UPDATE public.area SET item_orcamento_id = 'bbbb0040-0000-0000-0000-000000000040'::uuid WHERE id = 'aaaa0050-0000-0000-0000-000000000050'::uuid$$,
    'new row violates row-level security policy for table "area"',
    'Tentativa de transferir área para item de B via UPDATE é bloqueada'
);

-- Inserção de área vinculada ao item em orçamento ENVIADO
INSERT INTO public.area (id, item_orcamento_id, nome, geometria, area_calculada, unidade)
VALUES ('aaaa0052-0000-0000-0000-000000000052'::uuid, 'aaaa0045-0000-0000-0000-000000000045'::uuid, 'Área em Enviado', ST_GeomFromText('POLYGON((0 0, 0 2, 2 2, 2 0, 0 0))', 4326), 4.00, 'm²');

-- Teste 21: DELETE de área em orçamento ENVIADO é bloqueado por RLS (Decisão D2)
DELETE FROM public.area WHERE id = 'aaaa0052-0000-0000-0000-000000000052'::uuid;
SELECT is(
    (SELECT count(*)::integer FROM public.area WHERE id = 'aaaa0052-0000-0000-0000-000000000052'::uuid),
    1,
    'DELETE de área cujo orçamento raiz está em ENVIADO é bloqueado por RLS (Decisão D2)'
);

-- Teste 22: DELETE de área em orçamento RASCUNHO tem sucesso (Decisão D2)
DELETE FROM public.area WHERE id = 'aaaa0050-0000-0000-0000-000000000050'::uuid;
SELECT is(
    (SELECT count(*)::integer FROM public.area WHERE id = 'aaaa0050-0000-0000-0000-000000000050'::uuid),
    0,
    'DELETE de área cujo orçamento raiz está em RASCUNHO tem sucesso (Decisão D2)'
);

SELECT * FROM finish();
ROLLBACK;
