BEGIN;

SELECT plan(35);

-- ============================================================================
-- SETUP: Criar usuários Auth e perfis
-- ============================================================================
INSERT INTO auth.users (id, email, raw_user_meta_data)
VALUES
    ('a0000000-0000-0000-0000-000000000001', 'cross_a@test.com', '{"nome": "User A Cross"}'::jsonb),
    ('b0000000-0000-0000-0000-000000000002', 'cross_b@test.com', '{"nome": "User B Cross"}'::jsonb);

-- Seed de User A
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = 'a0000000-0000-0000-0000-000000000001';

INSERT INTO public.cliente (id, usuario_id, nome, email, telefone)
VALUES ('ca000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Cliente A Cross', 'cla@test.com', '11999990001');

INSERT INTO public.endereco (id, cliente_id, logradouro, numero, bairro, cidade, estado, cep)
VALUES ('ea000000-0000-0000-0000-000000000001', 'ca000000-0000-0000-0000-000000000001', 'Rua A', '1', 'Bairro A', 'São Paulo', 'SP', '01000-000');

INSERT INTO public.servico (id, usuario_id, nome, unidade, preco_base, usa_medicao_area)
VALUES ('5a000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Servico A', 'HORA', 100.00, false);

INSERT INTO public.produto (id, usuario_id, nome, unidade, preco_base)
VALUES ('fa000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Produto A', 'UN', 50.00);

INSERT INTO public.orcamento (id, usuario_id, cliente_id, numero, status)
VALUES ('0a000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'ca000000-0000-0000-0000-000000000001', 'ORC-A-01', 'RASCUNHO');

INSERT INTO public.item_orcamento (id, orcamento_id, servico_id, tipo, descricao, quantidade, unidade, valor_unitario, valor_total, usa_medicao_area)
VALUES ('1a000000-0000-0000-0000-000000000001', '0a000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 'SERVICO', 'Item Serv A', 1, 'HORA', 100.00, 100.00, false);

INSERT INTO public.item_orcamento (id, orcamento_id, produto_id, tipo, descricao, quantidade, unidade, valor_unitario, valor_total, usa_medicao_area)
VALUES ('2a000000-0000-0000-0000-000000000001', '0a000000-0000-0000-0000-000000000001', 'fa000000-0000-0000-0000-000000000001', 'PRODUTO', 'Item Prod A', 2, 'UN', 50.00, 100.00, false);

INSERT INTO public.area (id, item_orcamento_id, nome, geometria, area_calculada)
VALUES (
    'aa000000-0000-0000-0000-000000000001',
    '1a000000-0000-0000-0000-000000000001',
    'Area A',
    ST_GeomFromText('POLYGON((-46.6 -23.5, -46.6 -23.6, -46.7 -23.6, -46.7 -23.5, -46.6 -23.5))', 4326),
    50.00
);

-- Seed de User B
SET LOCAL "request.jwt.claim.sub" = 'b0000000-0000-0000-0000-000000000002';

INSERT INTO public.cliente (id, usuario_id, nome, email, telefone)
VALUES ('cb000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 'Cliente B Cross', 'clb@test.com', '11999990002');

INSERT INTO public.endereco (id, cliente_id, logradouro, numero, bairro, cidade, estado, cep)
VALUES ('eb000000-0000-0000-0000-000000000002', 'cb000000-0000-0000-0000-000000000002', 'Rua B', '2', 'Bairro B', 'São Paulo', 'SP', '02000-000');

INSERT INTO public.servico (id, usuario_id, nome, unidade, preco_base, usa_medicao_area)
VALUES ('5b000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 'Servico B', 'HORA', 120.00, false);

INSERT INTO public.produto (id, usuario_id, nome, unidade, preco_base)
VALUES ('fb000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 'Produto B', 'UN', 60.00);

INSERT INTO public.orcamento (id, usuario_id, cliente_id, numero, status)
VALUES ('0b000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 'cb000000-0000-0000-0000-000000000002', 'ORC-B-01', 'RASCUNHO');

INSERT INTO public.item_orcamento (id, orcamento_id, servico_id, tipo, descricao, quantidade, unidade, valor_unitario, valor_total, usa_medicao_area)
VALUES ('1b000000-0000-0000-0000-000000000002', '0b000000-0000-0000-0000-000000000002', '5b000000-0000-0000-0000-000000000002', 'SERVICO', 'Item Serv B', 1, 'HORA', 120.00, 120.00, false);

INSERT INTO public.area (id, item_orcamento_id, nome, geometria, area_calculada)
VALUES (
    'ab000000-0000-0000-0000-000000000002',
    '1b000000-0000-0000-0000-000000000002',
    'Area B',
    ST_GeomFromText('POLYGON((-46.6 -23.5, -46.6 -23.6, -46.7 -23.6, -46.7 -23.5, -46.6 -23.5))', 4326),
    80.00
);

-- ============================================================================
-- PARTE 1: CROSS-TENANT UPDATE ATTACKS (USER_A TENTA MUTAR PARA B)
-- ============================================================================
SET LOCAL "request.jwt.claim.sub" = 'a0000000-0000-0000-0000-000000000001';

-- 1. A tenta alterar usuario_id de seu cliente para B
SELECT throws_matching(
    $$ UPDATE public.cliente SET usuario_id = 'b0000000-0000-0000-0000-000000000002' WHERE id = 'ca000000-0000-0000-0000-000000000001'; $$,
    'new row violates row-level security policy',
    '1. User A é bloqueado ao tentar alterar usuario_id de cliente para B'
);

-- 2. A tenta alterar usuario_id de seu servico para B
SELECT throws_matching(
    $$ UPDATE public.servico SET usuario_id = 'b0000000-0000-0000-0000-000000000002' WHERE id = '5a000000-0000-0000-0000-000000000001'; $$,
    'new row violates row-level security policy',
    '2. User A é bloqueado ao tentar alterar usuario_id de servico para B'
);

-- 3. A tenta alterar usuario_id de seu produto para B
SELECT throws_matching(
    $$ UPDATE public.produto SET usuario_id = 'b0000000-0000-0000-0000-000000000002' WHERE id = 'fa000000-0000-0000-0000-000000000001'; $$,
    'new row violates row-level security policy',
    '3. User A é bloqueado ao tentar alterar usuario_id de produto para B'
);

-- 4. A tenta alterar usuario_id de seu orcamento para B
SELECT throws_matching(
    $$ UPDATE public.orcamento SET usuario_id = 'b0000000-0000-0000-0000-000000000002' WHERE id = '0a000000-0000-0000-0000-000000000001'; $$,
    'new row violates row-level security policy',
    '4. User A é bloqueado ao tentar alterar usuario_id de orcamento para B'
);

-- 5. A tenta alterar cliente_id de seu orcamento para Cliente B
SELECT throws_matching(
    $$ UPDATE public.orcamento SET cliente_id = 'cb000000-0000-0000-0000-000000000002' WHERE id = '0a000000-0000-0000-0000-000000000001'; $$,
    'new row violates row-level security policy',
    '5. User A é bloqueado ao tentar alterar cliente_id de orcamento para Cliente B'
);

-- 6. A tenta alterar cliente_id de seu endereco para Cliente B
SELECT throws_matching(
    $$ UPDATE public.endereco SET cliente_id = 'cb000000-0000-0000-0000-000000000002' WHERE id = 'ea000000-0000-0000-0000-000000000001'; $$,
    'new row violates row-level security policy',
    '6. User A é bloqueado ao tentar alterar cliente_id de endereco para Cliente B'
);

-- 7. A tenta alterar orcamento_id de seu item para Orcamento B
SELECT throws_matching(
    $$ UPDATE public.item_orcamento SET orcamento_id = '0b000000-0000-0000-0000-000000000002' WHERE id = '1a000000-0000-0000-0000-000000000001'; $$,
    'new row violates row-level security policy',
    '7. User A é bloqueado ao tentar mover item_orcamento para Orcamento B'
);

-- 8. A tenta alterar servico_id de seu item para Servico B
SELECT throws_matching(
    $$ UPDATE public.item_orcamento SET servico_id = '5b000000-0000-0000-0000-000000000002' WHERE id = '1a000000-0000-0000-0000-000000000001'; $$,
    'new row violates row-level security policy',
    '8. User A é bloqueado ao tentar usar Servico B em seu item_orcamento'
);

-- 9. A tenta alterar produto_id de seu item para Produto B
SELECT throws_matching(
    $$ UPDATE public.item_orcamento SET produto_id = 'fb000000-0000-0000-0000-000000000002' WHERE id = '2a000000-0000-0000-0000-000000000001'; $$,
    'new row violates row-level security policy',
    '9. User A é bloqueado ao tentar usar Produto B em seu item_orcamento'
);

-- 10. A tenta mover sua area para item de B
SELECT throws_matching(
    $$ UPDATE public.area SET item_orcamento_id = '1b000000-0000-0000-0000-000000000002' WHERE id = 'aa000000-0000-0000-0000-000000000001'; $$,
    'new row violates row-level security policy',
    '10. User A é bloqueado ao tentar mover area para Item de B'
);

-- ============================================================================
-- PARTE 2: SIMETRIA - VISÃO EXCLUSIVA DE USER_B
-- ============================================================================
SET LOCAL "request.jwt.claim.sub" = 'b0000000-0000-0000-0000-000000000002';

SELECT is((SELECT count(*)::integer FROM public.usuario), 1, '11. User B enxerga apenas 1 usuario (o seu próprio)');
SELECT is((SELECT count(*)::integer FROM public.cliente), 1, '12. User B enxerga apenas 1 cliente (o seu próprio)');
SELECT is((SELECT count(*)::integer FROM public.servico), 1, '13. User B enxerga apenas 1 servico (o seu próprio)');
SELECT is((SELECT count(*)::integer FROM public.produto), 1, '14. User B enxerga apenas 1 produto (o seu próprio)');
SELECT is((SELECT count(*)::integer FROM public.orcamento), 1, '15. User B enxerga apenas 1 orcamento (o seu próprio)');
SELECT is((SELECT count(*)::integer FROM public.item_orcamento), 1, '16. User B enxerga apenas 1 item_orcamento (o seu próprio)');
SELECT is((SELECT count(*)::integer FROM public.area), 1, '17. User B enxerga apenas 1 area (a sua própria)');
SELECT is((SELECT count(*)::integer FROM public.endereco), 1, '18. User B enxerga apenas 1 endereco (o seu próprio)');

-- ============================================================================
-- PARTE 3: USER_B TENTA INSERIR DADOS REFERENCIANDO USER_A (CROSS-TENANT INSERT)
-- ============================================================================
-- 19. B tenta criar cliente atribuído a A
SELECT throws_matching(
    $$ INSERT INTO public.cliente (usuario_id, nome, email, telefone) VALUES ('a0000000-0000-0000-0000-000000000001', 'Cliente Falso', 'falso@test.com', '11'); $$,
    'new row violates row-level security policy',
    '19. User B é bloqueado ao tentar criar cliente para User A'
);

-- 20. B tenta criar serviço atribuído a A
SELECT throws_matching(
    $$ INSERT INTO public.servico (usuario_id, nome, unidade, preco_base, usa_medicao_area) VALUES ('a0000000-0000-0000-0000-000000000001', 'Serv Falso', 'HORA', 10, false); $$,
    'new row violates row-level security policy',
    '20. User B é bloqueado ao tentar criar servico para User A'
);

-- 21. B tenta criar produto atribuído a A
SELECT throws_matching(
    $$ INSERT INTO public.produto (usuario_id, nome, unidade, preco_base) VALUES ('a0000000-0000-0000-0000-000000000001', 'Prod Falso', 'UN', 10); $$,
    'new row violates row-level security policy',
    '21. User B é bloqueado ao tentar criar produto para User A'
);

-- 22. B tenta criar orçamento atribuído a A
SELECT throws_matching(
    $$ INSERT INTO public.orcamento (usuario_id, cliente_id, numero, status) VALUES ('a0000000-0000-0000-0000-000000000001', 'cb000000-0000-0000-0000-000000000002', 'ORC-B-FALSO', 'RASCUNHO'); $$,
    'new row violates row-level security policy',
    '22. User B é bloqueado ao tentar criar orcamento para User A'
);

-- 23. B tenta criar orçamento usando Cliente de A
SELECT throws_matching(
    $$ INSERT INTO public.orcamento (usuario_id, cliente_id, numero, status) VALUES ('b0000000-0000-0000-0000-000000000002', 'ca000000-0000-0000-0000-000000000001', 'ORC-B-FALSO2', 'RASCUNHO'); $$,
    'new row violates row-level security policy',
    '23. User B é bloqueado ao tentar criar orcamento usando Cliente de A'
);

-- 24. B tenta inserir item no orçamento de A
SELECT throws_matching(
    $$ INSERT INTO public.item_orcamento (orcamento_id, servico_id, tipo, descricao, quantidade, unidade, valor_unitario, valor_total, usa_medicao_area)
       VALUES ('0a000000-0000-0000-0000-000000000001', '5b000000-0000-0000-0000-000000000002', 'SERVICO', 'Invasao B', 1, 'HORA', 10, 10, false); $$,
    'new row violates row-level security policy',
    '24. User B é bloqueado ao tentar inserir item no orcamento de A'
);

-- 25. B tenta inserir item em seu orçamento usando Servico de A
SELECT throws_matching(
    $$ INSERT INTO public.item_orcamento (orcamento_id, servico_id, tipo, descricao, quantidade, unidade, valor_unitario, valor_total, usa_medicao_area)
       VALUES ('0b000000-0000-0000-0000-000000000002', '5a000000-0000-0000-0000-000000000001', 'SERVICO', 'Serv A em B', 1, 'HORA', 10, 10, false); $$,
    'new row violates row-level security policy',
    '25. User B é bloqueado ao tentar usar Servico de A em seu item_orcamento'
);

-- 26. B tenta inserir item em seu orçamento usando Produto de A
SELECT throws_matching(
    $$ INSERT INTO public.item_orcamento (orcamento_id, produto_id, tipo, descricao, quantidade, unidade, valor_unitario, valor_total, usa_medicao_area)
       VALUES ('0b000000-0000-0000-0000-000000000002', 'fa000000-0000-0000-0000-000000000001', 'PRODUTO', 'Prod A em B', 1, 'UN', 10, 10, false); $$,
    'new row violates row-level security policy',
    '26. User B é bloqueado ao tentar usar Produto de A em seu item_orcamento'
);

-- 27. B tenta inserir área em item de A
SELECT throws_matching(
    $$ INSERT INTO public.area (item_orcamento_id, nome, geometria, area_calculada)
       VALUES ('1a000000-0000-0000-0000-000000000001', 'Area Invasora', ST_GeomFromText('POLYGON((-46.6 -23.5, -46.6 -23.6, -46.7 -23.6, -46.7 -23.5, -46.6 -23.5))', 4326), 10); $$,
    'new row violates row-level security policy',
    '27. User B é bloqueado ao tentar inserir area em item de A'
);

-- 28. B tenta inserir endereço para Cliente A
SELECT throws_matching(
    $$ INSERT INTO public.endereco (cliente_id, logradouro, numero, bairro, cidade, estado, cep)
       VALUES ('ca000000-0000-0000-0000-000000000001', 'Rua B em A', '1', 'B', 'C', 'SP', '01000-000'); $$,
    'new row violates row-level security policy',
    '28. User B é bloqueado ao tentar inserir endereco para Cliente A'
);

-- ============================================================================
-- PARTE 4: USER_B TENTA EXCLUIR REGISTROS DE USER_A (NENHUM DEVE SER AFETADO)
-- ============================================================================
DELETE FROM public.area WHERE id = 'aa000000-0000-0000-0000-000000000001';
DELETE FROM public.item_orcamento WHERE id = '1a000000-0000-0000-0000-000000000001';
DELETE FROM public.orcamento WHERE id = '0a000000-0000-0000-0000-000000000001';
DELETE FROM public.endereco WHERE id = 'ea000000-0000-0000-0000-000000000001';
DELETE FROM public.cliente WHERE id = 'ca000000-0000-0000-0000-000000000001';
DELETE FROM public.servico WHERE id = '5a000000-0000-0000-0000-000000000001';
DELETE FROM public.produto WHERE id = 'fa000000-0000-0000-0000-000000000001';

-- Trocar de volta para User A para verificar que tudo continua existindo
SET LOCAL "request.jwt.claim.sub" = 'a0000000-0000-0000-0000-000000000001';

SELECT is((SELECT count(*)::integer FROM public.area WHERE id = 'aa000000-0000-0000-0000-000000000001'), 1, '29. Area de A não foi excluída por B');
SELECT is((SELECT count(*)::integer FROM public.item_orcamento WHERE id = '1a000000-0000-0000-0000-000000000001'), 1, '30. Item de orcamento de A não foi excluído por B');
SELECT is((SELECT count(*)::integer FROM public.orcamento WHERE id = '0a000000-0000-0000-0000-000000000001'), 1, '31. Orcamento de A não foi excluído por B');
SELECT is((SELECT count(*)::integer FROM public.endereco WHERE id = 'ea000000-0000-0000-0000-000000000001'), 1, '32. Endereco de A não foi excluído por B');
SELECT is((SELECT count(*)::integer FROM public.cliente WHERE id = 'ca000000-0000-0000-0000-000000000001'), 1, '33. Cliente de A não foi excluído por B');
SELECT is((SELECT count(*)::integer FROM public.servico WHERE id = '5a000000-0000-0000-0000-000000000001'), 1, '34. Servico de A não foi excluído por B');
SELECT is((SELECT count(*)::integer FROM public.produto WHERE id = 'fa000000-0000-0000-0000-000000000001'), 1, '35. Produto de A não foi excluído por B');

SELECT * FROM finish();
ROLLBACK;
