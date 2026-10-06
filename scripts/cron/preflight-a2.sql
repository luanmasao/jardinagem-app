-- ============================================================================
-- Script Operacional: preflight-a2.sql
-- Bloco D: Expiração Temporal Automática de Orçamentos (v2.0)
-- Fase A2: Pre-Flight Procedural de Validação de Pré-Condições
--
-- Executa asserções rigorosas antes de permitir a ativação do agendador (Fase B).
-- Se qualquer verificação falhar, aborta imediatamente com RAISE EXCEPTION.
-- ============================================================================

DO $$
DECLARE
    v_user TEXT;
    v_session_user TEXT;
    v_pg_cron_installed BOOLEAN;
    v_cron_timezone TEXT;
    v_fn_exists BOOLEAN;
    v_fn_owner TEXT;
    v_schema_privs INT;
    v_log_table_exists BOOLEAN;
BEGIN
    -- 1. Verificação de Role Executora
    v_user := current_user;
    v_session_user := session_user;

    IF v_user <> 'postgres' THEN
        RAISE EXCEPTION 'PRE-FLIGHT FALHOU [A2-01]: Usuário atual (%) não é postgres', v_user;
    END IF;

    -- 2. Verificação da Extensão pg_cron
    SELECT EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
    ) INTO v_pg_cron_installed;

    IF NOT v_pg_cron_installed THEN
        RAISE EXCEPTION 'PRE-FLIGHT FALHOU [A2-02]: Extensão pg_cron não está instalada no banco';
    END IF;

    -- 3. Verificação do Timezone do cron (GMT canônico ou UTC alias tolerado)
    BEGIN
        SELECT setting INTO v_cron_timezone FROM pg_settings WHERE name = 'cron.timezone';
    EXCEPTION WHEN OTHERS THEN
        v_cron_timezone := NULL;
    END;

    IF v_cron_timezone IS NULL OR v_cron_timezone NOT IN ('GMT', 'UTC') THEN
        RAISE EXCEPTION 'PRE-FLIGHT FALHOU [A2-03]: cron.timezone (%) inválido. Exigido GMT ou UTC.', COALESCE(v_cron_timezone, 'NULL');
    END IF;

    -- 4. Verificação da Stored Function Privilegiada
    SELECT EXISTS (
        SELECT 1 
        FROM pg_proc p 
        JOIN pg_namespace n ON p.pronamespace = n.oid 
        WHERE n.nspname = 'app_private' 
          AND p.proname = 'executar_expiracao_orcamentos'
    ) INTO v_fn_exists;

    IF NOT v_fn_exists THEN
        RAISE EXCEPTION 'PRE-FLIGHT FALHOU [A2-04]: Função app_private.executar_expiracao_orcamentos não encontrada';
    END IF;

    -- 5. Verificação do Owner da Função Privilegiada
    SELECT r.rolname INTO v_fn_owner
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    JOIN pg_roles r ON p.proowner = r.oid
    WHERE n.nspname = 'app_private'
      AND p.proname = 'executar_expiracao_orcamentos';

    IF v_fn_owner <> 'postgres' THEN
        RAISE EXCEPTION 'PRE-FLIGHT FALHOU [A2-05]: Owner da função (%) não é postgres', v_fn_owner;
    END IF;

    -- 6. Verificação de Blindagem do Schema app_private contra anon/authenticated
    SELECT count(*)::int INTO v_schema_privs
    FROM pg_namespace n
    WHERE n.nspname = 'app_private'
      AND (
          has_schema_privilege('anon', n.nspname, 'USAGE') OR
          has_schema_privilege('authenticated', n.nspname, 'USAGE')
      );

    IF v_schema_privs > 0 THEN
        RAISE EXCEPTION 'PRE-FLIGHT FALHOU [A2-06]: Schema app_private expõe privilégios para anon ou authenticated';
    END IF;

    -- 7. Verificação da Tabela de Log
    SELECT EXISTS (
        SELECT 1 
        FROM pg_tables 
        WHERE schemaname = 'app_private' 
          AND tablename = 'expiracao_execucao_log'
    ) INTO v_log_table_exists;

    IF NOT v_log_table_exists THEN
        RAISE EXCEPTION 'PRE-FLIGHT FALHOU [A2-07]: Tabela app_private.expiracao_execucao_log não existe';
    END IF;

    RAISE NOTICE '>>> PRE-FLIGHT A2 APROVADO COM SUCESSO <<<';
    RAISE NOTICE 'Role: %, Timezone: %, pg_cron: Ativo, Schema/Função: Blindados', v_user, v_cron_timezone;
END;
$$;
