BEGIN;
SELECT plan(14);


-- ============================================================================
-- Bloco D: Expiração Temporal Automática de Orçamentos (v2.0)
-- Testes Estruturais e Funcionais pgTAP
-- ============================================================================

-- 1. Extensão pg_cron instalada
SELECT has_extension('pg_cron', 'Extensão pg_cron deve estar instalada');

-- 2. Schema app_private existe
SELECT has_schema('app_private', 'Schema app_private deve existir');

-- 3. Tabela de log existe
SELECT has_table('app_private', 'expiracao_execucao_log', 'Tabela expiracao_execucao_log deve existir');

-- 4. Função privada existe e pertence a postgres
SELECT has_function('app_private', 'executar_expiracao_orcamentos', 'Função executar_expiracao_orcamentos deve existir');

-- 5. RPC pública existe
SELECT has_function('public', 'expirar_meus_orcamentos_rpc', 'Função expirar_meus_orcamentos_rpc deve existir');

-- 6. Setup de dados para validação das regras funcionais
\set user_a '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
\set user_b '22222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
\set cli_a   'aaaa0001-0000-0000-0000-000000000001'
\set cli_b   'bbbb0001-0000-0000-0000-000000000001'

INSERT INTO public.usuario (id, nome) VALUES
  ('11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'User A'),
  ('22222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, 'User B')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.cliente (id, usuario_id, nome) VALUES
  ('aaaa0001-0000-0000-0000-000000000001'::uuid, '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'Cliente A'),
  ('bbbb0001-0000-0000-0000-000000000001'::uuid, '22222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, 'Cliente B')
ON CONFLICT (id) DO NOTHING;

-- Inserção de orçamentos para teste das regras
-- ID 1: ENVIADO vencido (deve expirar)
-- ID 2: EM_ANALISE vencido (deve expirar)
-- ID 3: ENVIADO vigente (não deve expirar)
-- ID 4: RASCUNHO vencido (RF68: NUNCA deve expirar)
-- ID 5: APROVADO vencido (RN71: não deve expirar)
INSERT INTO public.orcamento (id, usuario_id, cliente_id, numero, status, data_validade, subtotal, valor_desconto, total) VALUES
  ('d0000001-0000-0000-0000-000000000001'::uuid, :'user_a'::uuid, :'cli_a'::uuid, 'TAP-ENVIADO-VENC', 'ENVIADO', '2026-01-01', 100, 0, 100),
  ('d0000002-0000-0000-0000-000000000002'::uuid, :'user_a'::uuid, :'cli_a'::uuid, 'TAP-ANALISE-VENC', 'EM_ANALISE', '2026-01-01', 100, 0, 100),
  ('d0000003-0000-0000-0000-000000000003'::uuid, :'user_a'::uuid, :'cli_a'::uuid, 'TAP-ENVIADO-VIG', 'ENVIADO', '2099-12-31', 100, 0, 100),
  ('d0000004-0000-0000-0000-000000000004'::uuid, :'user_a'::uuid, :'cli_a'::uuid, 'TAP-RASCUNHO-VENC', 'RASCUNHO', '2026-01-01', 0, 0, 0),
  ('d0000005-0000-0000-0000-000000000005'::uuid, :'user_a'::uuid, :'cli_a'::uuid, 'TAP-APROVADO-VENC', 'APROVADO', '2026-01-01', 100, 0, 100)
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  data_validade = EXCLUDED.data_validade;

-- Executa a rotina server-side
SELECT app_private.executar_expiracao_orcamentos();

-- 7. TESTE 1: ENVIADO vencido deve transicionar para EXPIRADO
SELECT is(
    (SELECT status::text FROM public.orcamento WHERE id = 'd0000001-0000-0000-0000-000000000001'::uuid),
    'EXPIRADO',
    'ENVIADO vencido deve ser EXPIRADO'
);

-- 8. TESTE 2: EM_ANALISE vencido deve transicionar para EXPIRADO
SELECT is(
    (SELECT status::text FROM public.orcamento WHERE id = 'd0000002-0000-0000-0000-000000000002'::uuid),
    'EXPIRADO',
    'EM_ANALISE vencido deve ser EXPIRADO'
);

-- 9. TESTE 3: ENVIADO vigente permanece ENVIADO
SELECT is(
    (SELECT status::text FROM public.orcamento WHERE id = 'd0000003-0000-0000-0000-000000000003'::uuid),
    'ENVIADO',
    'ENVIADO vigente permanece inalterado'
);

-- 10. TESTE 5: RASCUNHO vencido permanece RASCUNHO (RF68/RN70)
SELECT is(
    (SELECT status::text FROM public.orcamento WHERE id = 'd0000004-0000-0000-0000-000000000004'::uuid),
    'RASCUNHO',
    'RASCUNHO vencido NUNCA expira automaticamente'
);

-- 11. TESTE 6: APROVADO vencido permanece APROVADO (RN71)
SELECT is(
    (SELECT status::text FROM public.orcamento WHERE id = 'd0000005-0000-0000-0000-000000000005'::uuid),
    'APROVADO',
    'APROVADO vencido permanece inalterado'
);

-- 12. TESTE 7: Idempotência — segunda execução afeta 0 linhas
SELECT is(
    (SELECT (app_private.executar_expiracao_orcamentos()->>'linhas_expiradas')::int),
    0,
    'Segunda execução afeta zero linhas'
);

-- 13. TESTE 10: Anon bloqueado
SELECT throws_matching(
    $$
    SET LOCAL ROLE anon;
    SELECT app_private.executar_expiracao_orcamentos();
    $$,
    'permission denied',
    'Anon não pode executar app_private.executar_expiracao_orcamentos'
);

-- 14. TESTE 10: Authenticated bloqueado
SELECT throws_matching(
    $$
    SET LOCAL ROLE authenticated;
    SELECT app_private.executar_expiracao_orcamentos();
    $$,
    'permission denied',
    'Authenticated não pode executar app_private.executar_expiracao_orcamentos'
);

-- 15. Observabilidade: Log gravado com sucesso
SELECT cmp_ok(
    (SELECT count(*)::int FROM app_private.expiracao_execucao_log WHERE sucesso = true),
    '>=',
    1,
    'Log funcional contém registros de sucesso'
);

ROLLBACK;
