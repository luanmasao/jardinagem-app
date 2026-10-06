import { execSync } from 'node:child_process';

function execSql(sql: string): string {
  return execSync('docker exec -i supabase_db_jardinagem-app psql -U postgres -d postgres -t -A', {
    input: sql,
    encoding: 'utf-8',
    maxBuffer: 100 * 1024 * 1024,
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

interface BenchmarkResult {
  volume: number;
  expectedTargets: number;
  expectedEnviadoVencido: number;
  expectedEmAnaliseVencido: number;
  expectedEnviadoFuturo: number;
  expectedEmAnaliseFuturo: number;
  expectedOutrosEstados: number;
  actualLinhasAfetadas: number;
  planningTimeMs: number;
  executionTimeMs: number;
  buffers: {
    sharedHit: number;
    sharedRead: number;
    sharedDirtied: number;
    sharedWritten: number;
  };
  nodeType: string;
  updatePlanNodeType?: string;
  postVerification: {
    totalExpirados: number;
    enviadoRestantes: number;
    emAnaliseRestantes: number;
    rascunhoRestantes: number;
    aprovadoRestantes: number;
    recusadoRestantes: number;
    canceladoRestantes: number;
    concluidoRestantes: number;
  };
  passed: boolean;
}

function runScenario(volume: number): BenchmarkResult {
  console.log(`\n========================================================================`);
  console.log(`CENÁRIO BENCHMARK RNF12: VOLUME = ${volume.toLocaleString()} REGISTROS`);
  console.log(`========================================================================`);

  const expectedEnviadoVencido = Math.round(volume * 0.05);
  const expectedEmAnaliseVencido = Math.round(volume * 0.05);
  const expectedTargets = expectedEnviadoVencido + expectedEmAnaliseVencido;
  const expectedEnviadoFuturo = Math.round(volume * 0.05);
  const expectedEmAnaliseFuturo = Math.round(volume * 0.05);
  const expectedOutrosEstados = Math.round(volume * 0.80);

  console.log(`Distribuição determinística esperada:`);
  console.log(`- 5% ENVIADO vencido (alvo):    ${expectedEnviadoVencido.toLocaleString()}`);
  console.log(`- 5% EM_ANALISE vencido (alvo):  ${expectedEmAnaliseVencido.toLocaleString()}`);
  console.log(`- TOTAL ALVOS ESPERADOS:         ${expectedTargets.toLocaleString()}`);
  console.log(`- 5% ENVIADO futuro (não alvo):   ${expectedEnviadoFuturo.toLocaleString()}`);
  console.log(`- 5% EM_ANALISE futuro (não alvo):${expectedEmAnaliseFuturo.toLocaleString()}`);
  console.log(`- 80% Outros estados (não alvo):  ${expectedOutrosEstados.toLocaleString()}`);

  const prefix = `BENCH-${volume}-`;

  const sql = `
    BEGIN;

    -- 1. Carga dos registros sintéticos com distribuição g % 20
    DO $$
    DECLARE
      v_user_id uuid;
      v_cliente_id uuid;
      v_data_corte date;
    BEGIN
      SELECT id INTO v_user_id FROM auth.users LIMIT 1;
      SELECT id INTO v_cliente_id FROM public.cliente LIMIT 1;
      v_data_corte := (pg_catalog.timezone('America/Sao_Paulo', pg_catalog.now()))::pg_catalog.date;

      INSERT INTO public.orcamento (
        id, usuario_id, cliente_id, numero, status, data_criacao, data_validade, subtotal, tipo_desconto, valor_desconto, total
      )
      SELECT
        gen_random_uuid(),
        v_user_id,
        v_cliente_id,
        '${prefix}' || g::text,
        CASE 
          WHEN g % 20 = 0 THEN 'ENVIADO'::public.status_orcamento
          WHEN g % 20 = 1 THEN 'EM_ANALISE'::public.status_orcamento
          WHEN g % 20 = 2 THEN 'ENVIADO'::public.status_orcamento
          WHEN g % 20 = 3 THEN 'EM_ANALISE'::public.status_orcamento
          WHEN g % 20 IN (4, 5, 6, 7) THEN 'RASCUNHO'::public.status_orcamento
          WHEN g % 20 IN (8, 9, 10, 11) THEN 'APROVADO'::public.status_orcamento
          WHEN g % 20 IN (12, 13, 14) THEN 'RECUSADO'::public.status_orcamento
          WHEN g % 20 IN (15, 16, 17) THEN 'CANCELADO'::public.status_orcamento
          ELSE 'CONCLUIDO'::public.status_orcamento
        END,
        now() - INTERVAL '30 days',
        CASE
          WHEN g % 20 = 0 THEN v_data_corte - INTERVAL '2 days'  -- ENVIADO vencido (ALVO 5%)
          WHEN g % 20 = 1 THEN v_data_corte - INTERVAL '2 days'  -- EM_ANALISE vencido (ALVO 5%)
          WHEN g % 20 = 2 THEN v_data_corte + INTERVAL '5 days'  -- ENVIADO futuro (NÃO ALVO 5%)
          WHEN g % 20 = 3 THEN v_data_corte + INTERVAL '5 days'  -- EM_ANALISE futuro (NÃO ALVO 5%)
          ELSE v_data_corte - INTERVAL '2 days'                  -- OUTROS ESTADOS (NÃO ALVO 80%)
        END,
        100.00,
        NULL,
        0.00,
        100.00
      FROM generate_series(1, ${volume}) g;
    END $$;

    -- 2. Atualização mandatória de estatísticas do otimizador
    ANALYZE public.orcamento;

    -- 3. Inspecionar plano estático do comando UPDATE após ANALYZE
    EXPLAIN (BUFFERS, FORMAT JSON)
    UPDATE public.orcamento
    SET status = 'EXPIRADO'::public.status_orcamento
    WHERE status IN ('ENVIADO'::public.status_orcamento, 'EM_ANALISE'::public.status_orcamento)
      AND data_validade < (pg_catalog.timezone('America/Sao_Paulo', pg_catalog.now()))::pg_catalog.date;

    -- 4. Executar benchmark real da função de expiração com EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
    EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
    SELECT app_private.executar_expiracao_orcamentos();

    -- 5. Captura das linhas afetadas a partir do log funcional gravado na mesma transação
    SELECT linhas_afetadas, duracao_ms, sucesso, origem
    FROM app_private.expiracao_execucao_log
    ORDER BY id DESC
    LIMIT 1;

    -- 6. Validação do estado pós-execução na tabela
    SELECT 
      count(*) FILTER (WHERE status = 'EXPIRADO') AS total_expirados,
      count(*) FILTER (WHERE status = 'ENVIADO') AS total_enviado,
      count(*) FILTER (WHERE status = 'EM_ANALISE') AS total_em_analise,
      count(*) FILTER (WHERE status = 'RASCUNHO') AS total_rascunho,
      count(*) FILTER (WHERE status = 'APROVADO') AS total_aprovado,
      count(*) FILTER (WHERE status = 'RECUSADO') AS total_recusado,
      count(*) FILTER (WHERE status = 'CANCELADO') AS total_cancelado,
      count(*) FILTER (WHERE status = 'CONCLUIDO') AS total_concluido
    FROM public.orcamento
    WHERE numero LIKE '${prefix}%';

    -- 7. Descarte total dos dados sintéticos para isolamento do ambiente
    ROLLBACK;
  `;

  console.log(`Executando transação de benchmark no PostgreSQL...`);
  const rawOutput = execSql(sql);

function extractJsonBlocks(text: string): any[] {
  const blocks: any[] = [];
  let depth = 0;
  let start = -1;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '[') {
      if (depth === 0) start = i;
      depth++;
    } else if (text[i] === ']') {
      depth--;
      if (depth === 0 && start !== -1) {
        try {
          const parsed = JSON.parse(text.slice(start, i + 1));
          blocks.push(parsed);
        } catch (e) {
          console.error('Falha ao parsear bloco JSON:', e);
        }
        start = -1;
      }
    }
  }
  return blocks;
}

  const jsonBlocks = extractJsonBlocks(rawOutput);
  const lines = rawOutput.split(/\r?\n/);

  // jsonBlocks[0]: Explain do UPDATE
  // jsonBlocks[1]: Explain do SELECT app_private.executar_expiracao_orcamentos()
  const updateExplain = jsonBlocks[0]?.[0];
  const functionExplain = jsonBlocks[1]?.[0];

  if (!functionExplain) {
    console.error('Output bruto:', rawOutput);
    throw new Error(`Falha ao obter EXPLAIN FORMAT JSON para o volume ${volume}`);
  }

  const executionTimeMs = functionExplain['Execution Time'] ?? 0;
  const planningTimeMs = functionExplain['Planning Time'] ?? 0;
  const nodeType = functionExplain.Plan?.['Node Type'] ?? 'Unknown';
  const buffers = {
    sharedHit: functionExplain.Plan?.['Shared Hit Blocks'] ?? 0,
    sharedRead: functionExplain.Plan?.['Shared Read Blocks'] ?? 0,
    sharedDirtied: functionExplain.Plan?.['Shared Dirtied Blocks'] ?? 0,
    sharedWritten: functionExplain.Plan?.['Shared Written Blocks'] ?? 0,
  };

  const innerScan = updateExplain?.Plan?.Plans?.[0];
  const innerScanType = innerScan?.['Node Type'] ?? 'Unknown';
  const innerIndex = innerScan?.['Index Name'] ? ` (${innerScan['Index Name']})` : '';
  const updatePlanNodeType = `${updateExplain?.Plan?.['Node Type'] ?? 'Unknown'} [${innerScanType}${innerIndex}]`;

  // Extrair log e contagens pós-execução das linhas restantes
  // Linha de log: linhas_afetadas|duracao_ms|sucesso|origem
  // Linha de contagem: total_expirados|total_enviado|total_em_analise|...
  const dataLines = lines.filter((l) => l.includes('|') && !l.includes('Plan') && !l.includes('linhas_afetadas') && !l.includes('total_expirados'));
  
  let actualLinhasAfetadas = 0;
  let postVerification = {
    totalExpirados: 0,
    enviadoRestantes: 0,
    emAnaliseRestantes: 0,
    rascunhoRestantes: 0,
    aprovadoRestantes: 0,
    recusadoRestantes: 0,
    canceladoRestantes: 0,
    concluidoRestantes: 0,
  };

  for (const dl of dataLines) {
    const parts = dl.split('|');
    if (parts.length === 4 && (parts[2] === 't' || parts[2] === 'true')) {
      actualLinhasAfetadas = parseInt(parts[0], 10);
    } else if (parts.length === 8) {
      postVerification = {
        totalExpirados: parseInt(parts[0], 10),
        enviadoRestantes: parseInt(parts[1], 10),
        emAnaliseRestantes: parseInt(parts[2], 10),
        rascunhoRestantes: parseInt(parts[3], 10),
        aprovadoRestantes: parseInt(parts[4], 10),
        recusadoRestantes: parseInt(parts[5], 10),
        canceladoRestantes: parseInt(parts[6], 10),
        concluidoRestantes: parseInt(parts[7], 10),
      };
    }
  }

  console.log(`\n--- RESULTADOS DO CENÁRIO ---`);
  console.log(`Planning Time:      ${planningTimeMs.toFixed(3)} ms`);
  console.log(`Execution Time:     ${executionTimeMs.toFixed(3)} ms`);
  console.log(`Operação Principal: ${nodeType} (executando app_private.executar_expiracao_orcamentos)`);
  console.log(`Plano do UPDATE:    ${updatePlanNodeType}`);
  console.log(`Buffers Compartilhados: Hit=${buffers.sharedHit}, Read=${buffers.sharedRead}, Dirtied=${buffers.sharedDirtied}, Written=${buffers.sharedWritten}`);
  console.log(`Linhas Afetadas (Log): ${actualLinhasAfetadas.toLocaleString()} (Esperado: ${expectedTargets.toLocaleString()})`);
  console.log(`Contagem Pós-Execução:`, postVerification);

  // Asserções obrigatórias
  const targetsMatched = actualLinhasAfetadas === expectedTargets;
  const expiradosMatched = postVerification.totalExpirados === expectedTargets;
  const enviadoFuturoIntacto = postVerification.enviadoRestantes === expectedEnviadoFuturo;
  const emAnaliseFuturoIntacto = postVerification.emAnaliseRestantes === expectedEmAnaliseFuturo;
  const outrosIntactos = (
    postVerification.rascunhoRestantes +
    postVerification.aprovadoRestantes +
    postVerification.recusadoRestantes +
    postVerification.canceladoRestantes +
    postVerification.concluidoRestantes
  ) === expectedOutrosEstados;

  const passed = targetsMatched && expiradosMatched && enviadoFuturoIntacto && emAnaliseFuturoIntacto && outrosIntactos;

  if (!passed) {
    console.error(`\n[FALHA DE VALIDAÇÃO] Cenário volume ${volume}:`);
    console.error(`- targetsMatched: ${targetsMatched} (${actualLinhasAfetadas} vs ${expectedTargets})`);
    console.error(`- expiradosMatched: ${expiradosMatched} (${postVerification.totalExpirados} vs ${expectedTargets})`);
    console.error(`- enviadoFuturoIntacto: ${enviadoFuturoIntacto} (${postVerification.enviadoRestantes} vs ${expectedEnviadoFuturo})`);
    console.error(`- emAnaliseFuturoIntacto: ${emAnaliseFuturoIntacto} (${postVerification.emAnaliseRestantes} vs ${expectedEmAnaliseFuturo})`);
    console.error(`- outrosIntactos: ${outrosIntactos}`);
    throw new Error(`Falha de consistência no benchmark do volume ${volume}`);
  }

  console.log(`>>> CENÁRIO ${volume.toLocaleString()} CONCLUÍDO COM SUCESSO! VALIDAÇÕES DETERMINÍSTICAS PASSARAM (PASS) <<<\n`);

  return {
    volume,
    expectedTargets,
    expectedEnviadoVencido,
    expectedEmAnaliseVencido,
    expectedEnviadoFuturo,
    expectedEmAnaliseFuturo,
    expectedOutrosEstados,
    actualLinhasAfetadas,
    planningTimeMs,
    executionTimeMs,
    buffers,
    nodeType,
    updatePlanNodeType,
    postVerification,
    passed,
  };
}

async function main() {
  console.log('========================================================================');
  console.log('BENCHMARK RNF12 REVISADO: CORREÇÃO AUDIT-D-01 (ANALYZE + REGRA DETERMINÍSTICA)');
  console.log('========================================================================');

  // Executar 10.000
  const res10k = runScenario(10000);

  // Executar 100.000
  const res100k = runScenario(100000);

  // Executar 1.000.000
  const res1M = runScenario(1000000);

  console.log('\n========================================================================');
  console.log('RESUMO CONSOLIDADO DOS TRÊS VOLUMES AVALIADOS');
  console.log('========================================================================');
  console.table([
    {
      Volume: '10.000',
      'Alvos Esp.': res10k.expectedTargets,
      'Linhas Afet.': res10k.actualLinhasAfetadas,
      'Plano UPDATE': res10k.updatePlanNodeType,
      'Plan Time (ms)': res10k.planningTimeMs.toFixed(3),
      'Exec Time (ms)': res10k.executionTimeMs.toFixed(3),
      'SLO (<5000ms)': res10k.executionTimeMs < 5000 ? 'PASS' : 'FAIL',
      Status: res10k.passed ? 'PASS' : 'FAIL',
    },
    {
      Volume: '100.000',
      'Alvos Esp.': res100k.expectedTargets,
      'Linhas Afet.': res100k.actualLinhasAfetadas,
      'Plano UPDATE': res100k.updatePlanNodeType,
      'Plan Time (ms)': res100k.planningTimeMs.toFixed(3),
      'Exec Time (ms)': res100k.executionTimeMs.toFixed(3),
      'SLO (<5000ms)': res100k.executionTimeMs < 5000 ? 'PASS' : 'FAIL',
      Status: res100k.passed ? 'PASS' : 'FAIL',
    },
    {
      Volume: '1.000.000',
      'Alvos Esp.': res1M.expectedTargets,
      'Linhas Afet.': res1M.actualLinhasAfetadas,
      'Plano UPDATE': res1M.updatePlanNodeType,
      'Plan Time (ms)': res1M.planningTimeMs.toFixed(3),
      'Exec Time (ms)': res1M.executionTimeMs.toFixed(3),
      'SLO (<5000ms)': res1M.executionTimeMs < 5000 ? 'PASS' : 'FAIL',
      Status: res1M.passed ? 'PASS' : 'FAIL',
    },
  ]);

  // Verificar se o banco continua limpo
  const remainingCheck = execSql("SELECT count(*) FROM public.orcamento WHERE numero LIKE 'BENCH-%';").trim();
  console.log(`\nVerificação de isolamento: registros residuais no banco pós-ROLLBACK = ${remainingCheck}`);
  if (parseInt(remainingCheck, 10) !== 0) {
    throw new Error('Falha: registros de benchmark persistiram no banco!');
  }

  console.log('\n========================================================================');
  console.log('TODOS OS CRITÉRIOS DE BENCHMARK RNF12 FORAM VALIDADOS COM SUCESSO (PASS)');
  console.log('========================================================================');
}

main().catch((err) => {
  console.error('\n[ERRO NO BENCHMARK RNF12]', err);
  process.exit(1);
});
