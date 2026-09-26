BEGIN;

SELECT plan(33);

-- ============================================================================
-- SETUP: Criar estrutura completa de dados com postgres/authenticated
-- ============================================================================
INSERT INTO auth.users (id, email, raw_user_meta_data)
VALUES ('a0000000-0000-0000-0000-000000000001', 'user_anon_test@test.com', '{"nome": "User Anon Test"}'::jsonb);

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = 'a0000000-0000-0000-0000-000000000001';

INSERT INTO public.cliente (id, usuario_id, nome, email, telefone)
VALUES ('ca000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Cliente Anon Test', 'cl_anon@test.com', '11999990001');

INSERT INTO public.endereco (id, cliente_id, logradouro, numero, bairro, cidade, estado, cep)
VALUES ('ea000000-0000-0000-0000-000000000001', 'ca000000-0000-0000-0000-000000000001', 'Rua Teste Anon', '10', 'Centro', 'São Paulo', 'SP', '01000-000');

INSERT INTO public.servico (id, usuario_id, nome, unidade, preco_base, usa_medicao_area)
VALUES ('5a000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Poda Anon', 'HORA', 150.00, false);

INSERT INTO public.produto (id, usuario_id, nome, unidade, preco_base)
VALUES ('fa000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Adubo Anon', 'KG', 50.00);

INSERT INTO public.orcamento (id, usuario_id, cliente_id, numero, status)
VALUES ('0a000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'ca000000-0000-0000-0000-000000000001', 'ORC-ANON-001', 'RASCUNHO');

INSERT INTO public.item_orcamento (id, orcamento_id, servico_id, tipo, descricao, quantidade, unidade, valor_unitario, valor_total, usa_medicao_area)
VALUES ('1a000000-0000-0000-0000-000000000001', '0a000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 'SERVICO', 'Poda Anon', 1, 'HORA', 150.00, 150.00, false);

INSERT INTO public.area (id, item_orcamento_id, nome, geometria, area_calculada)
VALUES (
    'aa000000-0000-0000-0000-000000000001',
    '1a000000-0000-0000-0000-000000000001',
    'Jardim Anon',
    ST_GeomFromText('POLYGON((-46.6 -23.5, -46.6 -23.6, -46.7 -23.6, -46.7 -23.5, -46.6 -23.5))', 4326),
    100.00
);

-- ============================================================================
-- MUDANÇA PARA ROLE anon (SEM CLAIM AUTH.UID)
-- ============================================================================
SET LOCAL ROLE anon;
RESET "request.jwt.claim.sub";

-- ----------------------------------------------------------------------------
-- 1. SELECT COMO anon (DEFAULT DENY: 0 LINHAS)
-- ----------------------------------------------------------------------------
SELECT is((SELECT count(*)::integer FROM public.usuario), 0, '1. anon não enxerga registros de usuario');
SELECT is((SELECT count(*)::integer FROM public.cliente), 0, '2. anon não enxerga registros de cliente');
SELECT is((SELECT count(*)::integer FROM public.endereco), 0, '3. anon não enxerga registros de endereco');
SELECT is((SELECT count(*)::integer FROM public.servico), 0, '4. anon não enxerga registros de servico');
SELECT is((SELECT count(*)::integer FROM public.produto), 0, '5. anon não enxerga registros de produto');
SELECT is((SELECT count(*)::integer FROM public.orcamento), 0, '6. anon não enxerga registros de orcamento');
SELECT is((SELECT count(*)::integer FROM public.item_orcamento), 0, '7. anon não enxerga registros de item_orcamento');
SELECT is((SELECT count(*)::integer FROM public.area), 0, '8. anon não enxerga registros de area');

-- ----------------------------------------------------------------------------
-- 2. INSERT COMO anon (BLOQUEIO POR RLS)
-- ----------------------------------------------------------------------------
SELECT throws_matching(
    $$ INSERT INTO public.usuario (id, nome) VALUES ('a0000000-0000-0000-0000-000000000099', 'Hacker Anon'); $$,
    'new row violates row-level security policy',
    '9. anon bloqueado ao tentar inserir usuario'
);

SELECT throws_matching(
    $$ INSERT INTO public.cliente (usuario_id, nome, email, telefone) VALUES ('a0000000-0000-0000-0000-000000000001', 'Cliente Anon', 'anon@test.com', '11'); $$,
    'new row violates row-level security policy',
    '10. anon bloqueado ao tentar inserir cliente'
);

SELECT throws_matching(
    $$ INSERT INTO public.endereco (cliente_id, logradouro, numero, bairro, cidade, estado, cep) VALUES ('ca000000-0000-0000-0000-000000000001', 'R', '1', 'B', 'C', 'SP', '01000-000'); $$,
    'new row violates row-level security policy',
    '11. anon bloqueado ao tentar inserir endereco'
);

SELECT throws_matching(
    $$ INSERT INTO public.servico (usuario_id, nome, unidade, preco_base, usa_medicao_area) VALUES ('a0000000-0000-0000-0000-000000000001', 'Serv Anon', 'HORA', 10, false); $$,
    'new row violates row-level security policy',
    '12. anon bloqueado ao tentar inserir servico'
);

SELECT throws_matching(
    $$ INSERT INTO public.produto (usuario_id, nome, unidade, preco_base) VALUES ('a0000000-0000-0000-0000-000000000001', 'Prod Anon', 'UN', 10); $$,
    'new row violates row-level security policy',
    '13. anon bloqueado ao tentar inserir produto'
);

SELECT throws_matching(
    $$ INSERT INTO public.orcamento (usuario_id, cliente_id, numero, status) VALUES ('a0000000-0000-0000-0000-000000000001', 'ca000000-0000-0000-0000-000000000001', 'ORC-ANON-999', 'RASCUNHO'); $$,
    'new row violates row-level security policy',
    '14. anon bloqueado ao tentar inserir orcamento'
);

SELECT throws_matching(
    $$ INSERT INTO public.item_orcamento (orcamento_id, servico_id, tipo, descricao, quantidade, unidade, valor_unitario, valor_total, usa_medicao_area)
       VALUES ('0a000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 'SERVICO', 'Poda Anon', 1, 'HORA', 10, 10, false); $$,
    'new row violates row-level security policy',
    '15. anon bloqueado ao tentar inserir item_orcamento'
);

SELECT throws_matching(
    $$ INSERT INTO public.area (item_orcamento_id, nome, geometria, area_calculada)
       VALUES ('1a000000-0000-0000-0000-000000000001', 'Area Anon', ST_GeomFromText('POLYGON((-46.6 -23.5, -46.6 -23.6, -46.7 -23.6, -46.7 -23.5, -46.6 -23.5))', 4326), 10); $$,
    'new row violates row-level security policy',
    '16. anon bloqueado ao tentar inserir area'
);

-- ----------------------------------------------------------------------------
-- 3. UPDATE COMO anon (NENHUM REGISTRO AFETADO)
-- ----------------------------------------------------------------------------
UPDATE public.usuario SET nome = 'Nome Hackeado';
UPDATE public.cliente SET nome = 'Cliente Hackeado';
UPDATE public.endereco SET logradouro = 'Rua Hackeada';
UPDATE public.servico SET nome = 'Servico Hackeado';
UPDATE public.produto SET nome = 'Produto Hackeado';
UPDATE public.orcamento SET status = 'CANCELADO';
UPDATE public.item_orcamento SET valor_total = 0;
UPDATE public.area SET nome = 'Area Hackeada';

-- Voltar para postgres para verificar integridade dos dados
RESET ROLE;

SELECT is((SELECT nome FROM public.usuario WHERE id = 'a0000000-0000-0000-0000-000000000001'), 'User Anon Test', '17. usuario não foi modificado por anon');
SELECT is((SELECT nome FROM public.cliente WHERE id = 'ca000000-0000-0000-0000-000000000001'), 'Cliente Anon Test', '18. cliente não foi modificado por anon');
SELECT is((SELECT logradouro FROM public.endereco WHERE id = 'ea000000-0000-0000-0000-000000000001'), 'Rua Teste Anon', '19. endereco não foi modificado por anon');
SELECT is((SELECT nome FROM public.servico WHERE id = '5a000000-0000-0000-0000-000000000001'), 'Poda Anon', '20. servico não foi modificado por anon');
SELECT is((SELECT nome FROM public.produto WHERE id = 'fa000000-0000-0000-0000-000000000001'), 'Adubo Anon', '21. produto não foi modificado por anon');
SELECT is((SELECT status FROM public.orcamento WHERE id = '0a000000-0000-0000-0000-000000000001'), 'RASCUNHO', '22. orcamento não foi modificado por anon');
SELECT is((SELECT valor_total::numeric FROM public.item_orcamento WHERE id = '1a000000-0000-0000-0000-000000000001'), 150.00::numeric, '23. item_orcamento não foi modificado por anon');
SELECT is((SELECT nome FROM public.area WHERE id = 'aa000000-0000-0000-0000-000000000001'), 'Jardim Anon', '24. area não foi modificada por anon');

-- ----------------------------------------------------------------------------
-- 4. DELETE COMO anon (NENHUM REGISTRO EXCLUÍDO)
-- ----------------------------------------------------------------------------
SET LOCAL ROLE anon;

DELETE FROM public.area;
DELETE FROM public.item_orcamento;
DELETE FROM public.orcamento;
DELETE FROM public.produto;
DELETE FROM public.servico;
DELETE FROM public.endereco;
DELETE FROM public.cliente;
DELETE FROM public.usuario;

-- Voltar para postgres para verificar que registros continuam existindo
RESET ROLE;

SELECT is((SELECT count(*)::integer FROM public.usuario WHERE id = 'a0000000-0000-0000-0000-000000000001'), 1, '25. usuario não foi excluído por anon');
SELECT is((SELECT count(*)::integer FROM public.cliente WHERE id = 'ca000000-0000-0000-0000-000000000001'), 1, '26. cliente não foi excluído por anon');
SELECT is((SELECT count(*)::integer FROM public.endereco WHERE id = 'ea000000-0000-0000-0000-000000000001'), 1, '27. endereco não foi excluído por anon');
SELECT is((SELECT count(*)::integer FROM public.servico WHERE id = '5a000000-0000-0000-0000-000000000001'), 1, '28. servico não foi excluído por anon');
SELECT is((SELECT count(*)::integer FROM public.produto WHERE id = 'fa000000-0000-0000-0000-000000000001'), 1, '29. produto não foi excluído por anon');
SELECT is((SELECT count(*)::integer FROM public.orcamento WHERE id = '0a000000-0000-0000-0000-000000000001'), 1, '30. orcamento não foi excluído por anon');
SELECT is((SELECT count(*)::integer FROM public.item_orcamento WHERE id = '1a000000-0000-0000-0000-000000000001'), 1, '31. item_orcamento não foi excluído por anon');
SELECT is((SELECT count(*)::integer FROM public.area WHERE id = 'aa000000-0000-0000-0000-000000000001'), 1, '32. area não foi excluída por anon');

-- ----------------------------------------------------------------------------
-- 5. FUNÇÃO SECURITY DEFINER NÃO EXECUTÁVEL POR anon
-- ----------------------------------------------------------------------------
SET LOCAL ROLE anon;

SELECT throws_matching(
    $$ SELECT private.handle_new_user(); $$,
    'permission denied',
    '33. anon não tem permissão para executar private.handle_new_user()'
);

SELECT * FROM finish();
ROLLBACK;
