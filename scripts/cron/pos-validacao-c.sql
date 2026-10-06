-- ============================================================================
-- Script Operacional: pos-validacao-c.sql
-- Bloco D: Expiração Temporal Automática de Orçamentos (v2.0)
-- Fase C: Pós-Validação Operacional
--
-- Consulta as duas fontes de observabilidade mínima estabelecidas pela v2.0:
-- 1. cron.job_run_details (Auditoria técnica do daemon do pg_cron)
-- 2. app_private.expiracao_execucao_log (Auditoria funcional de negócio)
-- ============================================================================

-- 1. Detalhes de execuções do daemon do pg_cron
SELECT 
    jobid,
    runid,
    job_pid,
    database,
    username,
    command,
    status,
    return_message,
    start_time,
    end_time
FROM cron.job_run_details
WHERE command LIKE '%executar_expiracao_orcamentos%'
ORDER BY start_time DESC
LIMIT 5;

-- 2. Registro funcional de negócio
SELECT 
    id,
    executado_em,
    data_corte,
    linhas_afetadas,
    duracao_ms,
    sucesso,
    origem,
    mensagem_erro
FROM app_private.expiracao_execucao_log
ORDER BY executado_em DESC
LIMIT 5;
