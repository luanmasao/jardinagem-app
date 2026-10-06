-- ============================================================================
-- Script Operacional: ativar-cron-b.sql
-- Bloco D: Expiração Temporal Automática de Orçamentos (v2.0)
-- Fase B: Ativação Idempotente do Agendador pg_cron
--
-- Remove agendamento anterior com o mesmo nome se existir, agenda o job diário
-- e valida rigorosamente que o job resultante está único, ativo e configurado.
-- ============================================================================

DO $$
DECLARE
    v_job_id BIGINT;
    v_job_count INT;
    v_job_record RECORD;
BEGIN
    -- 1. Remoção Idempotente de job preexistente
    FOR v_job_record IN 
        SELECT jobid FROM cron.job WHERE jobname = 'job_expirar_orcamentos_diario'
    LOOP
        PERFORM cron.unschedule(v_job_record.jobid);
        RAISE NOTICE 'Job pré-existente removido: id=%', v_job_record.jobid;
    END LOOP;

    -- 2. Agendamento Idempotente do Job
    -- Disparo diário às 00:01 BRT (03:01 GMT / UTC)
    SELECT cron.schedule(
        'job_expirar_orcamentos_diario',
        '1 3 * * *',
        'SELECT app_private.executar_expiracao_orcamentos();'
    ) INTO v_job_id;

    RAISE NOTICE 'Job agendado com sucesso: jobid=%', v_job_id;

    -- 3. Validação Estrita do Job Criado
    SELECT count(*)::int INTO v_job_count
    FROM cron.job
    WHERE jobname = 'job_expirar_orcamentos_diario';

    IF v_job_count <> 1 THEN
        RAISE EXCEPTION 'ATIVAÇÃO FALHOU [B-01]: Contagem de jobs (%) diferente de 1', v_job_count;
    END IF;

    SELECT * INTO v_job_record
    FROM cron.job
    WHERE jobname = 'job_expirar_orcamentos_diario';

    IF v_job_record.username <> 'postgres' THEN
        RAISE EXCEPTION 'ATIVAÇÃO FALHOU [B-02]: Username do job (%) não é postgres', v_job_record.username;
    END IF;

    IF v_job_record.active <> true THEN
        RAISE EXCEPTION 'ATIVAÇÃO FALHOU [B-03]: Job não está ativo (active=false)';
    END IF;

    IF v_job_record.schedule <> '1 3 * * *' THEN
        RAISE EXCEPTION 'ATIVAÇÃO FALHOU [B-04]: Schedule do job (%) diferente de 1 3 * * *', v_job_record.schedule;
    END IF;

    IF v_job_record.command <> 'SELECT app_private.executar_expiracao_orcamentos();' THEN
        RAISE EXCEPTION 'ATIVAÇÃO FALHOU [B-05]: Comando do job inválido: %', v_job_record.command;
    END IF;

    RAISE NOTICE '>>> ATIVAÇÃO FASE B CONCLUÍDA COM SUCESSO <<<';
    RAISE NOTICE 'Job: %, ID: %, User: %, Schedule: %, Active: %',
        v_job_record.jobname, v_job_record.jobid, v_job_record.username, v_job_record.schedule, v_job_record.active;
END;
$$;
