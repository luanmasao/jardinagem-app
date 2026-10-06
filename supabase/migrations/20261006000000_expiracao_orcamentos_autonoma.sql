-- ============================================================================
-- Migration: 20261006000000_expiracao_orcamentos_autonoma.sql
-- Bloco D: Expiração Temporal Automática de Orçamentos (v2.0)
-- Fase A1: Instalação Estática de Infraestrutura
--
-- ATENÇÃO:
-- Esta migration contém EXCLUSIVAMENTE a infraestrutura estática do Bloco D:
-- 1. Extensão pg_cron;
-- 2. Schema privado app_private;
-- 3. Tabela de log funcional de observabilidade mínima;
-- 4. Função central privilegiada app_private.executar_expiracao_orcamentos();
-- 5. RPC complementar de tenant public.expirar_meus_orcamentos_rpc();
-- 6. Concessões de privilégios (GRANT/REVOKE) e blindagem de segurança.
--
-- NENHUM agendamento (cron.schedule) é criado nesta etapa (Fase A1).
-- O agendamento ocorre exclusivamente na Fase B após aprovação do Pre-Flight A2.
-- ============================================================================

-- 1. Extensão pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Schema privado app_private
CREATE SCHEMA IF NOT EXISTS app_private;

-- Blindagem estrita do schema app_private
REVOKE ALL ON SCHEMA app_private FROM PUBLIC;
REVOKE ALL ON SCHEMA app_private FROM anon;
REVOKE ALL ON SCHEMA app_private FROM authenticated;
GRANT USAGE ON SCHEMA app_private TO postgres;

-- 3. Tabela de auditoria/log funcional de observabilidade mínima
CREATE TABLE IF NOT EXISTS app_private.expiracao_execucao_log (
    id BIGSERIAL PRIMARY KEY,
    executado_em TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.clock_timestamp(),
    data_corte DATE NOT NULL,
    linhas_afetadas INT NOT NULL,
    duracao_ms INT NOT NULL,
    sucesso BOOLEAN NOT NULL,
    origem VARCHAR(50) NOT NULL,
    mensagem_erro TEXT
);

ALTER TABLE app_private.expiracao_execucao_log OWNER TO postgres;
REVOKE ALL ON TABLE app_private.expiracao_execucao_log FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON TABLE app_private.expiracao_execucao_log TO postgres;

-- 4. Stored function central privilegiada de expiração automática (Server-Side)
CREATE OR REPLACE FUNCTION app_private.executar_expiracao_orcamentos()
RETURNS pg_catalog.jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_inicio pg_catalog.timestamptz;
    v_data_corte pg_catalog.date;
    v_linhas_afetadas pg_catalog.int4;
    v_duracao_ms pg_catalog.int4;
BEGIN
    v_inicio := pg_catalog.clock_timestamp();
    -- Data de corte canônica baseada no relógio do PostgreSQL no fuso oficial
    v_data_corte := (pg_catalog.timezone('America/Sao_Paulo', pg_catalog.now()))::pg_catalog.date;

    -- UPDATE set-based atômico, setando diretamente EXPIRADO
    -- Apenas ENVIADO e EM_ANALISE vencidos. RASCUNHO e estados finais são intocados.
    -- data_validade IS NULL avalia naturalmente para NULL (não atendido pelo <).
    UPDATE public.orcamento
    SET status = 'EXPIRADO'::public.status_orcamento
    WHERE status IN ('ENVIADO'::public.status_orcamento, 'EM_ANALISE'::public.status_orcamento)
      AND data_validade < v_data_corte;

    GET DIAGNOSTICS v_linhas_afetadas = ROW_COUNT;
    v_duracao_ms := pg_catalog.round(pg_catalog.date_part('epoch', pg_catalog.clock_timestamp() - v_inicio) * 1000)::pg_catalog.int4;


    -- Registro funcional de observabilidade mínima sob proteção não-bloqueante
    BEGIN
        INSERT INTO app_private.expiracao_execucao_log (
            executado_em,
            data_corte,
            linhas_afetadas,
            duracao_ms,
            sucesso,
            origem,
            mensagem_erro
        ) VALUES (
            pg_catalog.clock_timestamp(),
            v_data_corte,
            v_linhas_afetadas,
            v_duracao_ms,
            true,
            'SCHEDULER',
            NULL
        );
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Falha não-bloqueante ao registrar log funcional em app_private.expiracao_execucao_log: %', SQLERRM;
    END;

    RETURN pg_catalog.jsonb_build_object(
        'sucesso', true,
        'data_corte', v_data_corte,
        'linhas_expiradas', v_linhas_afetadas,
        'duracao_ms', v_duracao_ms,
        'executado_em', pg_catalog.clock_timestamp()
    );
END;
$$;

-- Blindagem estrita de privilégios da função privada
REVOKE ALL ON FUNCTION app_private.executar_expiracao_orcamentos() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION app_private.executar_expiracao_orcamentos() TO postgres;
ALTER FUNCTION app_private.executar_expiracao_orcamentos() OWNER TO postgres;

-- 5. RPC complementar de tenant (Defesa em Profundidade JIT)
CREATE OR REPLACE FUNCTION public.expirar_meus_orcamentos_rpc()
RETURNS pg_catalog.jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    v_uid pg_catalog.uuid := auth.uid();
    v_data_corte pg_catalog.date;
    v_linhas pg_catalog.int4;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Acesso negado: usuário não autenticado';
    END IF;

    v_data_corte := (pg_catalog.timezone('America/Sao_Paulo', pg_catalog.now()))::pg_catalog.date;

    UPDATE public.orcamento
    SET status = 'EXPIRADO'::public.status_orcamento
    WHERE usuario_id = v_uid
      AND status IN ('ENVIADO'::public.status_orcamento, 'EM_ANALISE'::public.status_orcamento)
      AND data_validade < v_data_corte;

    GET DIAGNOSTICS v_linhas = ROW_COUNT;

    RETURN pg_catalog.jsonb_build_object(
        'linhas_expiradas', v_linhas,
        'data_corte', v_data_corte
    );
END;
$$;

REVOKE ALL ON FUNCTION public.expirar_meus_orcamentos_rpc() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.expirar_meus_orcamentos_rpc() TO authenticated;
ALTER FUNCTION public.expirar_meus_orcamentos_rpc() OWNER TO postgres;
