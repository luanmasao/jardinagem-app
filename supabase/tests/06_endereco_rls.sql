BEGIN;

SELECT plan(15);

-- ============================================================================
-- SETUP DE USUÁRIOS E CLIENTES
-- ============================================================================
INSERT INTO auth.users (id, email, raw_user_meta_data)
VALUES
    ('a0000000-0000-0000-0000-000000000001', 'user_a_end@test.com', '{"nome": "User A Endereco"}'::jsonb),
    ('b0000000-0000-0000-0000-000000000002', 'user_b_end@test.com', '{"nome": "User B Endereco"}'::jsonb);

-- Criar clientes
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = 'a0000000-0000-0000-0000-000000000001';

INSERT INTO public.cliente (id, usuario_id, nome, email, telefone)
VALUES ('ca000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Cliente A', 'cla@test.com', '11999990001');

SET LOCAL "request.jwt.claim.sub" = 'b0000000-0000-0000-0000-000000000002';

INSERT INTO public.cliente (id, usuario_id, nome, email, telefone)
VALUES ('cb000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 'Cliente B', 'clb@test.com', '11999990002');

-- ============================================================================
-- 1. INSERT ENDEREÇO
-- ============================================================================
-- User A insere endereço para cliente próprio (Cliente A) -> permitido
SET LOCAL "request.jwt.claim.sub" = 'a0000000-0000-0000-0000-000000000001';

SELECT lives_ok(
    $$
    INSERT INTO public.endereco (id, cliente_id, logradouro, numero, bairro, cidade, estado, cep)
    VALUES ('ea000000-0000-0000-0000-000000000001', 'ca000000-0000-0000-0000-000000000001', 'Rua das Flores', '100', 'Jardim', 'São Paulo', 'SP', '01234-000');
    $$,
    '1. User A consegue inserir endereço para seu próprio cliente'
);

-- User A tenta inserir endereço para cliente de B -> bloqueado por RLS
SELECT throws_matching(
    $$
    INSERT INTO public.endereco (id, cliente_id, logradouro, numero, bairro, cidade, estado, cep)
    VALUES ('ea000000-0000-0000-0000-000000000002', 'cb000000-0000-0000-0000-000000000002', 'Rua Inválida', '999', 'Bairro B', 'São Paulo', 'SP', '01234-001');
    $$,
    'new row violates row-level security policy',
    '2. User A é bloqueado ao tentar inserir endereço para cliente de B'
);

-- User B insere endereço para cliente de B -> permitido
SET LOCAL "request.jwt.claim.sub" = 'b0000000-0000-0000-0000-000000000002';

SELECT lives_ok(
    $$
    INSERT INTO public.endereco (id, cliente_id, logradouro, numero, bairro, cidade, estado, cep)
    VALUES ('eb000000-0000-0000-0000-000000000001', 'cb000000-0000-0000-0000-000000000002', 'Av Paulista', '200', 'Bela Vista', 'São Paulo', 'SP', '01311-000');
    $$,
    '3. User B consegue inserir endereço para seu próprio cliente'
);

-- ============================================================================
-- 2. SELECT ENDEREÇO (ISOLAMENTO)
-- ============================================================================
SET LOCAL "request.jwt.claim.sub" = 'a0000000-0000-0000-0000-000000000001';

SELECT is(
    (SELECT logradouro FROM public.endereco WHERE id = 'ea000000-0000-0000-0000-000000000001'),
    'Rua das Flores',
    '4. User A consegue selecionar seu próprio endereço'
);

SELECT is(
    (SELECT count(*)::integer FROM public.endereco),
    1,
    '5. User A visualiza apenas 1 endereço (o seu próprio)'
);

SELECT is(
    (SELECT count(*)::integer FROM public.endereco WHERE id = 'eb000000-0000-0000-0000-000000000001'),
    0,
    '6. Endereço de B é invisível para User A'
);

-- ============================================================================
-- 3. UPDATE ENDEREÇO
-- ============================================================================
-- User A atualiza próprio endereço
SELECT lives_ok(
    $$
    UPDATE public.endereco
    SET logradouro = 'Rua das Flores Alterada'
    WHERE id = 'ea000000-0000-0000-0000-000000000001';
    $$,
    '7. User A consegue atualizar seu próprio endereço'
);

SELECT is(
    (SELECT logradouro FROM public.endereco WHERE id = 'ea000000-0000-0000-0000-000000000001'),
    'Rua das Flores Alterada',
    '8. Alteração de logradouro do endereço de A foi persistida'
);

-- User A tenta transferir endereço para Cliente B -> bloqueado por WITH CHECK
SELECT throws_matching(
    $$
    UPDATE public.endereco
    SET cliente_id = 'cb000000-0000-0000-0000-000000000002'
    WHERE id = 'ea000000-0000-0000-0000-000000000001';
    $$,
    'new row violates row-level security policy',
    '9. User A é impedido de transferir endereço para cliente de B'
);

-- User A tenta atualizar endereço de B -> não altera o registro de B
UPDATE public.endereco
SET logradouro = 'Ataque A'
WHERE id = 'eb000000-0000-0000-0000-000000000001';

SET LOCAL "request.jwt.claim.sub" = 'b0000000-0000-0000-0000-000000000002';
SELECT is(
    (SELECT logradouro FROM public.endereco WHERE id = 'eb000000-0000-0000-0000-000000000001'),
    'Av Paulista',
    '10. Tentativa de User A atualizar endereço de B não surte efeito no registro de B'
);

-- ============================================================================
-- 4. DELETE ENDEREÇO
-- ============================================================================
-- User A tenta excluir endereço de B -> não remove o registro de B
SET LOCAL "request.jwt.claim.sub" = 'a0000000-0000-0000-0000-000000000001';
DELETE FROM public.endereco
WHERE id = 'eb000000-0000-0000-0000-000000000001';

SET LOCAL "request.jwt.claim.sub" = 'b0000000-0000-0000-0000-000000000002';
SELECT is(
    (SELECT count(*)::integer FROM public.endereco WHERE id = 'eb000000-0000-0000-0000-000000000001'),
    1,
    '11. Tentativa de User A excluir endereço de B não remove o registro de B'
);

-- User A exclui próprio endereço -> permitido
SET LOCAL "request.jwt.claim.sub" = 'a0000000-0000-0000-0000-000000000001';
SELECT lives_ok(
    $$
    DELETE FROM public.endereco
    WHERE id = 'ea000000-0000-0000-0000-000000000001';
    $$,
    '12. User A consegue excluir seu próprio endereço'
);

SELECT is(
    (SELECT count(*)::integer FROM public.endereco WHERE id = 'ea000000-0000-0000-0000-000000000001'),
    0,
    '13. Endereço de A foi excluído com sucesso'
);

-- User B ainda tem seu endereço intacto
SET LOCAL "request.jwt.claim.sub" = 'b0000000-0000-0000-0000-000000000002';

SELECT is(
    (SELECT count(*)::integer FROM public.endereco WHERE id = 'eb000000-0000-0000-0000-000000000001'),
    1,
    '14. Endereço de B permanece intacto'
);

-- Teste de CASCADE: Excluir Cliente B remove Endereço B via ON DELETE CASCADE
DELETE FROM public.cliente WHERE id = 'cb000000-0000-0000-0000-000000000002';

SELECT is(
    (SELECT count(*)::integer FROM public.endereco WHERE id = 'eb000000-0000-0000-0000-000000000001'),
    0,
    '15. Exclusão de cliente cascateia para exclusão de seus endereços'
);

SELECT * FROM finish();
ROLLBACK;
