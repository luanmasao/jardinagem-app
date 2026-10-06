import { execSync } from 'node:child_process';

function execSql(sql: string): string {
  return execSync('docker exec -i supabase_db_jardinagem-app psql -U postgres -d postgres -t -A', {
    input: sql,
    encoding: 'utf-8',
  });
}

function execSqlJson(sql: string): any {
  const cleanSql = sql.trim().replace(/;+$/, '');
  const query = `SELECT json_agg(t) FROM (${cleanSql}) t;`;
  const raw = execSql(query).trim();
  if (!raw || raw === '') return [];
  try {
    return JSON.parse(raw);
  } catch (err) {
    console.error('Falha ao parsear JSON:', raw, err);
    return [];
  }
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log('=====================================================');
  console.log('PROVA REAL DO PG_CRON — VALIDAÇÃO EMPÍRICA DA DAEMON');
  console.log('=====================================================');

  // 1. Preparação do Orçamento de Homologação
  const quoteId = '11111111-2222-3333-4444-555555555555';
  console.log(`\n[Passo 1] Preparando orçamento de homologação ID: ${quoteId}...`);
  
  execSql(`
    DO $$
    DECLARE
      v_user_id uuid;
      v_cliente_id uuid;
    BEGIN
      SELECT id INTO v_user_id FROM auth.users LIMIT 1;
      SELECT id INTO v_cliente_id FROM public.cliente LIMIT 1;

      DELETE FROM public.orcamento WHERE id = '${quoteId}';

      INSERT INTO public.orcamento (
        id,
        usuario_id,
        cliente_id,
        numero,
        status,
        data_criacao,
        data_validade,
        subtotal,
        tipo_desconto,
        valor_desconto,
        total
      ) VALUES (
        '${quoteId}',
        v_user_id,
        v_cliente_id,
        'HOMOLOG-DAEMON-001',
        'ENVIADO',
        (now() AT TIME ZONE 'America/Sao_Paulo')::date - INTERVAL '10 days',
        (now() AT TIME ZONE 'America/Sao_Paulo')::date - INTERVAL '1 day',
        500.00,
        NULL,
        0.00,
        500.00
      );
    END $$;
  `);

  const initialRows = execSqlJson(`SELECT id, status, data_validade FROM public.orcamento WHERE id = '${quoteId}'`);
  console.log('Estado inicial do orçamento:', initialRows[0]);
  if (!initialRows[0] || initialRows[0].status !== 'ENVIADO') {
    throw new Error('Falha na preparação do orçamento de teste!');
  }

  // 2. Garantir que o aplicativo está fechado
  console.log('\n[Passo 2] Verificando se aplicativo móvel / Expo está fechado...');
  const appProcCheck = execSync('powershell "Get-Process -Name node -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Id"', { encoding: 'utf-8' });
  console.log('PIDs Node ativos na máquina host:', appProcCheck.trim().replace(/\r?\n/g, ', '));

  // 3. Registrar o job acelerado de homologação no pg_cron
  console.log('\n[Passo 3] Agendando job acelerado de homologação no pg_cron (* * * * *)...');
  const scheduleTime = execSql("SELECT now() AT TIME ZONE 'UTC';").trim();
  console.log('Timestamp de agendamento (UTC):', scheduleTime);

  // Limpar qualquer job de homologação anterior
  execSql(`
    DO $$
    DECLARE
      v_old_id bigint;
    BEGIN
      SELECT jobid INTO v_old_id FROM cron.job WHERE jobname = 'job_homologacao_expiracao';
      IF v_old_id IS NOT NULL THEN
        PERFORM cron.unschedule(v_old_id);
      END IF;
    END $$;
  `);

  const scheduleResult = execSql("SELECT cron.schedule('job_homologacao_expiracao', '* * * * *', 'SELECT app_private.executar_expiracao_orcamentos();');").trim();
  const tempJobId = parseInt(scheduleResult, 10);
  console.log(`Job temporário criado com sucesso! Job ID: ${tempJobId}`);

  // 4. Aguardar a execução real pelo daemon do pg_cron
  console.log('\n[Passo 4] Aguardando disparo do daemon pg_cron (próximo minuto)...');
  let runDetail: any = null;
  const maxWaitMs = 80000; // até 80 segundos
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    const runs = execSqlJson(`
      SELECT jobid, runid, job_pid, database, username, command, status, return_message, start_time, end_time
      FROM cron.job_run_details
      WHERE jobid = ${tempJobId}
      ORDER BY start_time DESC
      LIMIT 1;
    `);

    if (runs && runs.length > 0) {
      runDetail = runs[0];
      console.log(`>>> DISPARO DETECTADO EM cron.job_run_details! <<<`);
      break;
    }
    process.stdout.write('.');
    await sleep(3000);
  }
  console.log('\n');

  if (!runDetail) {
    throw new Error('Timeout: o daemon do pg_cron não disparou o job dentro da janela prevista!');
  }

  console.log('Detalhes da execução capturados pelo daemon:');
  console.log(JSON.stringify(runDetail, null, 2));

  // 5. Verificar se o orçamento foi expirado
  console.log('\n[Passo 5] Verificando estado do orçamento pós-disparo...');
  const updatedRows = execSqlJson(`SELECT id, status, data_validade FROM public.orcamento WHERE id = '${quoteId}'`);
  console.log('Estado final do orçamento:', updatedRows[0]);

  if (!updatedRows[0] || updatedRows[0].status !== 'EXPIRADO') {
    throw new Error(`Orçamento NÃO transicionou para EXPIRADO! Status atual: ${updatedRows[0]?.status}`);
  }

  // 6. Verificar o log funcional correspondente
  console.log('\n[Passo 6] Verificando log em app_private.expiracao_execucao_log...');
  const logRows = execSqlJson(`
    SELECT id, executado_em, data_corte, linhas_afetadas, duracao_ms, sucesso, origem, mensagem_erro
    FROM app_private.expiracao_execucao_log
    ORDER BY executado_em DESC
    LIMIT 1;
  `);
  console.log('Último log funcional gravado:', logRows[0]);

  // 7. Remover o job temporário de homologação
  console.log('\n[Passo 7] Removendo job temporário de homologação...');
  execSql(`SELECT cron.unschedule(${tempJobId});`);

  const remainingJobs = execSqlJson(`SELECT jobid, jobname, schedule, command, username, active FROM cron.job;`);
  console.log('Jobs remanescentes em cron.job:');
  console.table(remainingJobs);

  // 8. Assertivas finais
  const tempJobStillExists = remainingJobs.some((j: any) => j.jobname === 'job_homologacao_expiracao');
  if (tempJobStillExists) {
    throw new Error('Falha: o job temporário não foi removido!');
  }

  const definitiveJob = remainingJobs.find((j: any) => j.jobname === 'job_expirar_orcamentos_diario');
  if (!definitiveJob || !definitiveJob.active) {
    throw new Error('Falha: o job definitivo job_expirar_orcamentos_diario não está ativo!');
  }

  // Limpeza do orçamento de teste
  execSql(`DELETE FROM public.orcamento WHERE id = '${quoteId}';`);

  console.log('\n=====================================================');
  console.log('PROVA REAL DO PG_CRON CONCLUÍDA COM 100% DE SUCESSO!');
  console.log('=====================================================');
}

main().catch((err) => {
  console.error('\n[ERRO NA PROVA DO PG_CRON]', err);
  process.exit(1);
});
