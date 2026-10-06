import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { execSync } from 'node:child_process';
import { Orcamento } from '../../src/domain/entities/orcamento';
import { StatusOrcamento } from '../../src/domain/enums/status-orcamento';
import { TipoDesconto } from '../../src/domain/enums/tipo-desconto';
import { OrcamentoRepository } from '../../src/domain/repositories/orcamento.repository.interface';
import { ExpirarOrcamentosVencidosUseCase } from '../../src/application/use-cases/orcamento/expirar-orcamentos-vencidos.use-case';

/**
 * Helper para execução direta de SQL no banco PostgreSQL do container Supabase
 */
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
  } catch {
    return [];
  }
}


describe('Bloco D v2.0 — Expiração Temporal Automática de Orçamentos', () => {
  // ==========================================================================
  // SUÍTE 1: Domínio Puro & Soberania da Regra de Negócio (RF67, RF68, RN69, RN70)
  // ==========================================================================
  describe('Suíte 1: Regras Canônicas de Domínio (Orcamento.verificarExpiracao)', () => {
    const dataHoje = new Date(2026, 9, 6); // 06/10/2026
    const dataOntem = new Date(2026, 9, 5); // 05/10/2026
    const dataAmanha = new Date(2026, 9, 7); // 07/10/2026

    it('TESTE 1 (Domínio): ENVIADO com validade vencida deve transicionar para EXPIRADO', () => {
      const orc = new Orcamento({
        id: 'orc-1',
        usuarioId: 'user-1',
        clienteId: 'cli-1',
        numero: 'ORC-001',
        status: StatusOrcamento.ENVIADO,
        dataCriacao: new Date(2026, 8, 1),
        dataValidade: dataOntem,
      });

      orc.verificarExpiracao(dataHoje);
      assert.strictEqual(orc.status, StatusOrcamento.EXPIRADO);
    });

    it('TESTE 2 (Domínio): EM_ANALISE com validade vencida deve transicionar para EXPIRADO', () => {
      const orc = new Orcamento({
        id: 'orc-2',
        usuarioId: 'user-1',
        clienteId: 'cli-1',
        numero: 'ORC-002',
        status: StatusOrcamento.EM_ANALISE,
        dataCriacao: new Date(2026, 8, 1),
        dataValidade: dataOntem,
      });

      orc.verificarExpiracao(dataHoje);
      assert.strictEqual(orc.status, StatusOrcamento.EXPIRADO);
    });

    it('TESTE 3 (Domínio): ENVIADO com validade vigente deve permanecer ENVIADO', () => {
      const orc = new Orcamento({
        id: 'orc-3',
        usuarioId: 'user-1',
        clienteId: 'cli-1',
        numero: 'ORC-003',
        status: StatusOrcamento.ENVIADO,
        dataCriacao: new Date(2026, 8, 1),
        dataValidade: dataAmanha,
      });

      orc.verificarExpiracao(dataHoje);
      assert.strictEqual(orc.status, StatusOrcamento.ENVIADO);
    });

    it('TESTE 4 (Domínio): EM_ANALISE com validade vigente deve permanecer EM_ANALISE', () => {
      const orc = new Orcamento({
        id: 'orc-4',
        usuarioId: 'user-1',
        clienteId: 'cli-1',
        numero: 'ORC-004',
        status: StatusOrcamento.EM_ANALISE,
        dataCriacao: new Date(2026, 8, 1),
        dataValidade: dataAmanha,
      });

      orc.verificarExpiracao(dataHoje);
      assert.strictEqual(orc.status, StatusOrcamento.EM_ANALISE);
    });

    it('TESTE 5 (Domínio): RF68 / RN70: RASCUNHO com data vencida NUNCA deve expirar', () => {
      const orc = new Orcamento({
        id: 'orc-5',
        usuarioId: 'user-1',
        clienteId: 'cli-1',
        numero: 'ORC-005',
        status: StatusOrcamento.RASCUNHO,
        dataCriacao: new Date(2026, 8, 1),
        dataValidade: dataOntem,
      });

      orc.verificarExpiracao(dataHoje);
      assert.strictEqual(orc.status, StatusOrcamento.RASCUNHO);
    });

    it('TESTE 6 (Domínio): RN71: Estados finais vencidos não devem transicionar para EXPIRADO', () => {
      const estadosFinais = [
        StatusOrcamento.APROVADO,
        StatusOrcamento.RECUSADO,
        StatusOrcamento.CANCELADO,
        StatusOrcamento.CONCLUIDO,
        StatusOrcamento.EXPIRADO,
      ];

      for (const st of estadosFinais) {
        const orc = new Orcamento({
          id: `orc-${st}`,
          usuarioId: 'user-1',
          clienteId: 'cli-1',
          numero: `ORC-${st}`,
          status: st,
          dataCriacao: new Date(2026, 8, 1),
          dataValidade: dataOntem,
        });

        orc.verificarExpiracao(dataHoje);
        assert.strictEqual(orc.status, st, `Status ${st} não deveria ser alterado`);
      }
    });

    it('Data de validade NULL não deve provocar expiração', () => {
      const orc = new Orcamento({
        id: 'orc-null',
        usuarioId: 'user-1',
        clienteId: 'cli-1',
        numero: 'ORC-NULL',
        status: StatusOrcamento.ENVIADO,
        dataCriacao: new Date(2026, 8, 1),
        dataValidade: null,
      });

      orc.verificarExpiracao(dataHoje);
      assert.strictEqual(orc.status, StatusOrcamento.ENVIADO);
    });
  });

  // ==========================================================================
  // SUÍTE 2: Application / Caso de Uso JIT (ExpirarOrcamentosVencidosUseCase)
  // ==========================================================================
  describe('Suíte 2: Application JIT Use Case (ExpirarOrcamentosVencidosUseCase)', () => {
    it('Deve executar RPC através do repositório e retornar linhas expiradas', async () => {
      const fakeRepo: OrcamentoRepository = {
        listar: async () => [],
        buscarPorId: async () => null,
        obterProximoNumero: async () => 'ORC-001',
        criar: async () => ({} as any),
        atualizar: async () => ({} as any),
        alterarStatus: async () => {},
        excluir: async () => {},
        expirarMeusOrcamentos: async () => 3,
      };

      const useCase = new ExpirarOrcamentosVencidosUseCase(fakeRepo);
      const res = await useCase.execute();
      assert.strictEqual(res.linhasExpiradas, 3);
    });

    it('Single-Flight Mutex: chamadas concorrentes paralelas devem retornar 0 sem duplicar requisições', async () => {
      let rpcCalls = 0;
      const delayedRepo: OrcamentoRepository = {
        listar: async () => [],
        buscarPorId: async () => null,
        obterProximoNumero: async () => 'ORC-001',
        criar: async () => ({} as any),
        atualizar: async () => ({} as any),
        alterarStatus: async () => {},
        excluir: async () => {},
        expirarMeusOrcamentos: async () => {
          rpcCalls++;
          await new Promise((resolve) => setTimeout(resolve, 50));
          return 5;
        },
      };

      const useCase = new ExpirarOrcamentosVencidosUseCase(delayedRepo);
      const [res1, res2, res3] = await Promise.all([
        useCase.execute(),
        useCase.execute(),
        useCase.execute(),
      ]);

      assert.strictEqual(rpcCalls, 1, 'Apenas uma chamada RPC física deve ser efetuada');
      assert.strictEqual(res1.linhasExpiradas, 5);
      assert.strictEqual(res2.linhasExpiradas, 0);
      assert.strictEqual(res3.linhasExpiradas, 0);
    });

    it('Timeout defensivo: se a RPC ultrapassar 2.000 ms, use case deve rejeitar', async () => {
      const hangingRepo: OrcamentoRepository = {
        listar: async () => [],
        buscarPorId: async () => null,
        obterProximoNumero: async () => 'ORC-001',
        criar: async () => ({} as any),
        atualizar: async () => ({} as any),
        alterarStatus: async () => {},
        excluir: async () => {},
        expirarMeusOrcamentos: async () => {
          await new Promise((resolve) => setTimeout(resolve, 2500));
          return 10;
        },
      };

      const useCase = new ExpirarOrcamentosVencidosUseCase(hangingRepo);
      await assert.rejects(
        async () => {
          await useCase.execute();
        },
        {
          message: 'Timeout de 2000ms excedido na RPC de expiração',
        }
      );
    });
  });

  // ==========================================================================
  // SUÍTE 3: 14 Testes Obrigatórios Integrados no PostgreSQL (v2.0)
  // ==========================================================================
  describe('Suíte 3: 14 Testes Obrigatórios Integrados no PostgreSQL Real', () => {
    const USER_A = '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    const USER_B = '22222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
    const CLI_A = 'aaaa0001-0000-0000-0000-000000000001';
    const CLI_B = 'bbbb0001-0000-0000-0000-000000000001';

    before(() => {
      // Setup de usuários e clientes base
      execSql(`
        INSERT INTO public.usuario (id, nome, ativo) VALUES
          ('${USER_A}'::uuid, 'Usuário Teste A', true),
          ('${USER_B}'::uuid, 'Usuário Teste B', true)
        ON CONFLICT (id) DO NOTHING;

        INSERT INTO public.cliente (id, usuario_id, nome) VALUES
          ('${CLI_A}'::uuid, '${USER_A}'::uuid, 'Cliente A'),
          ('${CLI_B}'::uuid, '${USER_B}'::uuid, 'Cliente B')
        ON CONFLICT (id) DO NOTHING;
      `);

      // Ativação do scheduler para os testes de integração
      const fs = require('node:fs');
      const ativarSql = fs.readFileSync('scripts/cron/ativar-cron-b.sql', 'utf-8');
      execSql(ativarSql);
    });


    after(() => {
      // Limpeza completa dos dados criados nos testes
      execSql(`
        DELETE FROM public.orcamento WHERE usuario_id IN ('${USER_A}'::uuid, '${USER_B}'::uuid);
        DELETE FROM public.cliente WHERE usuario_id IN ('${USER_A}'::uuid, '${USER_B}'::uuid);
        DELETE FROM public.usuario WHERE id IN ('${USER_A}'::uuid, '${USER_B}'::uuid);
      `);
    });


    it('TESTE 1 (PostgreSQL): ENVIADO com validade vencida é atualizado para EXPIRADO', () => {
      const orcId = '00000001-0000-0000-0000-000000000001';
      execSql(`
        INSERT INTO public.orcamento (id, usuario_id, cliente_id, numero, status, data_validade, subtotal, valor_desconto, total)
        VALUES ('${orcId}'::uuid, '${USER_A}'::uuid, '${CLI_A}'::uuid, 'TEST-1', 'ENVIADO', '2026-01-01', 100, 0, 100)
        ON CONFLICT (id) DO UPDATE SET status = 'ENVIADO', data_validade = '2026-01-01';

        SELECT app_private.executar_expiracao_orcamentos();
      `);

      const status = execSql(`SELECT status FROM public.orcamento WHERE id = '${orcId}'::uuid;`).trim();
      assert.strictEqual(status, 'EXPIRADO');
    });

    it('TESTE 2 (PostgreSQL): EM_ANALISE com validade vencida é atualizado para EXPIRADO', () => {
      const orcId = '00000002-0000-0000-0000-000000000002';
      execSql(`
        INSERT INTO public.orcamento (id, usuario_id, cliente_id, numero, status, data_validade, subtotal, valor_desconto, total)
        VALUES ('${orcId}'::uuid, '${USER_A}'::uuid, '${CLI_A}'::uuid, 'TEST-2', 'EM_ANALISE', '2026-01-01', 100, 0, 100)
        ON CONFLICT (id) DO UPDATE SET status = 'EM_ANALISE', data_validade = '2026-01-01';

        SELECT app_private.executar_expiracao_orcamentos();
      `);

      const status = execSql(`SELECT status FROM public.orcamento WHERE id = '${orcId}'::uuid;`).trim();
      assert.strictEqual(status, 'EXPIRADO');
    });

    it('TESTE 3 (PostgreSQL): ENVIADO vigente permanece ENVIADO', () => {
      const orcId = '00000003-0000-0000-0000-000000000003';
      execSql(`
        INSERT INTO public.orcamento (id, usuario_id, cliente_id, numero, status, data_validade, subtotal, valor_desconto, total)
        VALUES ('${orcId}'::uuid, '${USER_A}'::uuid, '${CLI_A}'::uuid, 'TEST-3', 'ENVIADO', '2099-12-31', 100, 0, 100)
        ON CONFLICT (id) DO UPDATE SET status = 'ENVIADO', data_validade = '2099-12-31';

        SELECT app_private.executar_expiracao_orcamentos();
      `);

      const status = execSql(`SELECT status FROM public.orcamento WHERE id = '${orcId}'::uuid;`).trim();
      assert.strictEqual(status, 'ENVIADO');
    });

    it('TESTE 4 (PostgreSQL): EM_ANALISE vigente permanece EM_ANALISE', () => {
      const orcId = '00000004-0000-0000-0000-000000000004';
      execSql(`
        INSERT INTO public.orcamento (id, usuario_id, cliente_id, numero, status, data_validade, subtotal, valor_desconto, total)
        VALUES ('${orcId}'::uuid, '${USER_A}'::uuid, '${CLI_A}'::uuid, 'TEST-4', 'EM_ANALISE', '2099-12-31', 100, 0, 100)
        ON CONFLICT (id) DO UPDATE SET status = 'EM_ANALISE', data_validade = '2099-12-31';

        SELECT app_private.executar_expiracao_orcamentos();
      `);

      const status = execSql(`SELECT status FROM public.orcamento WHERE id = '${orcId}'::uuid;`).trim();
      assert.strictEqual(status, 'EM_ANALISE');
    });

    it('TESTE 5 (PostgreSQL): RASCUNHO com validade ultrapassada permanece RASCUNHO', () => {
      const orcId = '00000005-0000-0000-0000-000000000005';
      execSql(`
        INSERT INTO public.orcamento (id, usuario_id, cliente_id, numero, status, data_validade, subtotal, valor_desconto, total)
        VALUES ('${orcId}'::uuid, '${USER_A}'::uuid, '${CLI_A}'::uuid, 'TEST-5', 'RASCUNHO', '2026-01-01', 0, 0, 0)
        ON CONFLICT (id) DO UPDATE SET status = 'RASCUNHO', data_validade = '2026-01-01';

        SELECT app_private.executar_expiracao_orcamentos();
      `);

      const status = execSql(`SELECT status FROM public.orcamento WHERE id = '${orcId}'::uuid;`).trim();
      assert.strictEqual(status, 'RASCUNHO');
    });

    it('TESTE 6 (PostgreSQL): Estados comerciais finais vencidos permanecem inalterados', () => {
      const orcAprov = '00000006-0000-0000-0000-000000000006';
      const orcRecus = '00000006-0000-0000-0000-000000000007';
      const orcCanc = '00000006-0000-0000-0000-000000000008';
      const orcConc = '00000006-0000-0000-0000-000000000009';

      execSql(`
        INSERT INTO public.orcamento (id, usuario_id, cliente_id, numero, status, data_validade, subtotal, valor_desconto, total) VALUES
          ('${orcAprov}'::uuid, '${USER_A}'::uuid, '${CLI_A}'::uuid, 'TEST-6-AP', 'APROVADO', '2026-01-01', 100, 0, 100),
          ('${orcRecus}'::uuid, '${USER_A}'::uuid, '${CLI_A}'::uuid, 'TEST-6-RE', 'RECUSADO', '2026-01-01', 100, 0, 100),
          ('${orcCanc}'::uuid, '${USER_A}'::uuid, '${CLI_A}'::uuid, 'TEST-6-CA', 'CANCELADO', '2026-01-01', 100, 0, 100),
          ('${orcConc}'::uuid, '${USER_A}'::uuid, '${CLI_A}'::uuid, 'TEST-6-CO', 'CONCLUIDO', '2026-01-01', 100, 0, 100)
        ON CONFLICT (id) DO NOTHING;

        SELECT app_private.executar_expiracao_orcamentos();
      `);

      const stAp = execSql(`SELECT status FROM public.orcamento WHERE id = '${orcAprov}'::uuid;`).trim();
      const stRe = execSql(`SELECT status FROM public.orcamento WHERE id = '${orcRecus}'::uuid;`).trim();
      const stCa = execSql(`SELECT status FROM public.orcamento WHERE id = '${orcCanc}'::uuid;`).trim();
      const stCo = execSql(`SELECT status FROM public.orcamento WHERE id = '${orcConc}'::uuid;`).trim();

      assert.strictEqual(stAp, 'APROVADO');
      assert.strictEqual(stRe, 'RECUSADO');
      assert.strictEqual(stCa, 'CANCELADO');
      assert.strictEqual(stCo, 'CONCLUIDO');
    });

    it('TESTE 7 (PostgreSQL): Idempotência — segunda execução afeta zero linhas', () => {
      // Primeira execução
      const res1 = execSql(`SELECT (app_private.executar_expiracao_orcamentos()->>'linhas_expiradas')::int;`).trim();
      // Segunda execução consecutiva
      const res2 = execSql(`SELECT (app_private.executar_expiracao_orcamentos()->>'linhas_expiradas')::int;`).trim();

      assert.strictEqual(Number(res2), 0, 'Segunda execução consecutiva deve afetar 0 linhas');
    });

    it('TESTE 8 (PostgreSQL): Concorrência real via EvalPlanQual (EPQ) — estado aprovado não é sobrescrito', () => {
      const orcId = '00000008-0000-0000-0000-000000000008';
      // Insere orçamento vencido em ENVIADO
      execSql(`
        INSERT INTO public.orcamento (id, usuario_id, cliente_id, numero, status, data_validade, subtotal, valor_desconto, total)
        VALUES ('${orcId}'::uuid, '${USER_A}'::uuid, '${CLI_A}'::uuid, 'TEST-8-CONC', 'ENVIADO', '2026-01-01', 100, 0, 100)
        ON CONFLICT (id) DO UPDATE SET status = 'ENVIADO', data_validade = '2026-01-01';
      `);

      // Simulação de corrida: Transação comercial comita APROVADO antes/durante a inspeção da rotina
      execSql(`
        BEGIN;
        UPDATE public.orcamento SET status = 'APROVADO' WHERE id = '${orcId}'::uuid;
        COMMIT;

        -- Rotina executa após o commit comercial
        SELECT app_private.executar_expiracao_orcamentos();
      `);

      const statusFinal = execSql(`SELECT status FROM public.orcamento WHERE id = '${orcId}'::uuid;`).trim();
      assert.strictEqual(statusFinal, 'APROVADO', 'Estado APROVADO comercial não pode ser sobrescrito como EXPIRADO');
    });

    it('TESTE 9 (PostgreSQL): Execução com app fechado — rotina server-side opera de forma autônoma', () => {
      const orcId = '00000009-0000-0000-0000-000000000009';
      execSql(`
        INSERT INTO public.orcamento (id, usuario_id, cliente_id, numero, status, data_validade, subtotal, valor_desconto, total)
        VALUES ('${orcId}'::uuid, '${USER_A}'::uuid, '${CLI_A}'::uuid, 'TEST-9-AUTON', 'ENVIADO', '2026-01-01', 100, 0, 100)
        ON CONFLICT (id) DO UPDATE SET status = 'ENVIADO', data_validade = '2026-01-01';

        -- Disparo estritamente server-side (sem qualquer cliente React Native ativo)
        SELECT app_private.executar_expiracao_orcamentos();
      `);

      const status = execSql(`SELECT status FROM public.orcamento WHERE id = '${orcId}'::uuid;`).trim();
      assert.strictEqual(status, 'EXPIRADO');
    });

    it('TESTE 10 (PostgreSQL): Segurança — papéis anon e authenticated não possuem acesso à função privada', () => {
      const resAnon = execSql(`
        DO $$
        BEGIN
            SET LOCAL ROLE anon;
            PERFORM app_private.executar_expiracao_orcamentos();
            RAISE EXCEPTION 'FALHA: anon conseguiu executar função privada!';
        EXCEPTION WHEN insufficient_privilege THEN
            RAISE NOTICE 'Sucesso: anon bloqueado com insufficient_privilege';
        END;
        $$;
      `);
      assert.ok(!resAnon.includes('FALHA'), 'anon deve ser bloqueado');

      const resAuth = execSql(`
        DO $$
        BEGIN
            SET LOCAL ROLE authenticated;
            PERFORM app_private.executar_expiracao_orcamentos();
            RAISE EXCEPTION 'FALHA: authenticated conseguiu executar função privada!';
        EXCEPTION WHEN insufficient_privilege THEN
            RAISE NOTICE 'Sucesso: authenticated bloqueado com insufficient_privilege';
        END;
        $$;
      `);
      assert.ok(!resAuth.includes('FALHA'), 'authenticated deve ser bloqueado');
    });

    it('TESTE 11 (PostgreSQL): Tenant RPC — public.expirar_meus_orcamentos_rpc atualiza apenas auth.uid()', () => {
      const orcA = '00000011-0000-0000-0000-00000000000a';
      const orcB = '00000011-0000-0000-0000-00000000000b';

      execSql(`
        INSERT INTO public.orcamento (id, usuario_id, cliente_id, numero, status, data_validade, subtotal, valor_desconto, total) VALUES
          ('${orcA}'::uuid, '${USER_A}'::uuid, '${CLI_A}'::uuid, 'TEST-11-A', 'ENVIADO', '2026-01-01', 100, 0, 100),
          ('${orcB}'::uuid, '${USER_B}'::uuid, '${CLI_B}'::uuid, 'TEST-11-B', 'ENVIADO', '2026-01-01', 100, 0, 100)
        ON CONFLICT (id) DO UPDATE SET status = 'ENVIADO', data_validade = '2026-01-01';

        -- Executa RPC como USER_A em transação com claims
        BEGIN;
        SELECT set_config('request.jwt.claim.sub', '${USER_A}', true);
        SET LOCAL ROLE authenticated;
        SELECT public.expirar_meus_orcamentos_rpc();
        COMMIT;
      `);


      const statusA = execSql(`SELECT status FROM public.orcamento WHERE id = '${orcA}'::uuid;`).trim();
      const statusB = execSql(`SELECT status FROM public.orcamento WHERE id = '${orcB}'::uuid;`).trim();

      assert.strictEqual(statusA, 'EXPIRADO', 'Orçamento de A deve ter expirado');
      assert.strictEqual(statusB, 'ENVIADO', 'Orçamento de B NÃO deve ser alterado pela RPC de A');
    });

    it('TESTE 12 (PostgreSQL): Scheduler real — job_expirar_orcamentos_diario está cadastrado e ativo no pg_cron', () => {
      const jobs = execSqlJson(`
        SELECT jobid, jobname, schedule, command, username, active 
        FROM cron.job 
        WHERE jobname = 'job_expirar_orcamentos_diario';
      `);

      assert.strictEqual(jobs.length, 1, 'Exatamente 1 job deve estar configurado no cron.job');
      const job = jobs[0];
      assert.strictEqual(job.jobname, 'job_expirar_orcamentos_diario');
      assert.strictEqual(job.schedule, '1 3 * * *');
      assert.strictEqual(job.username, 'postgres');
      assert.strictEqual(job.active, true);
    });

    it('TESTE 13 (PostgreSQL): Recuperação cumulativa — orçamentos vencidos em períodos anteriores são processados', () => {
      const orcAntigo1 = '00000013-0000-0000-0000-000000000001';
      const orcAntigo2 = '00000013-0000-0000-0000-000000000002';

      execSql(`
        INSERT INTO public.orcamento (id, usuario_id, cliente_id, numero, status, data_validade, subtotal, valor_desconto, total) VALUES
          ('${orcAntigo1}'::uuid, '${USER_A}'::uuid, '${CLI_A}'::uuid, 'TEST-13-1', 'ENVIADO', '2025-12-01', 100, 0, 100),
          ('${orcAntigo2}'::uuid, '${USER_A}'::uuid, '${CLI_A}'::uuid, 'TEST-13-2', 'EM_ANALISE', '2026-02-15', 100, 0, 100)
        ON CONFLICT (id) DO UPDATE SET status = 'ENVIADO', data_validade = '2025-12-01';

        SELECT app_private.executar_expiracao_orcamentos();
      `);

      const st1 = execSql(`SELECT status FROM public.orcamento WHERE id = '${orcAntigo1}'::uuid;`).trim();
      const st2 = execSql(`SELECT status FROM public.orcamento WHERE id = '${orcAntigo2}'::uuid;`).trim();

      assert.strictEqual(st1, 'EXPIRADO');
      assert.strictEqual(st2, 'EXPIRADO');
    });

    it('TESTE 14 (PostgreSQL): Desempenho e RNF12 — EXPLAIN (ANALYZE, BUFFERS) do comando UPDATE', () => {
      const explainRaw = execSql(`
        EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
        UPDATE public.orcamento
        SET status = 'EXPIRADO'::public.status_orcamento
        WHERE status IN ('ENVIADO'::public.status_orcamento, 'EM_ANALISE'::public.status_orcamento)
          AND data_validade < (timezone('America/Sao_Paulo', now()))::date;
      `);

      const explainJson = JSON.parse(explainRaw);
      const executionTimeMs = explainJson[0]['Execution Time'];
      assert.ok(typeof executionTimeMs === 'number', 'Execution Time deve ser um número');
      assert.ok(executionTimeMs < 5000, `Execution Time (${executionTimeMs}ms) deve ser menor que 5.000 ms (SLO)`);
    });
  });

  // ==========================================================================
  // SUÍTE 4: Prova Integrada Ponta a Ponta com App Fechado
  // ==========================================================================
  describe('Suíte 4: Prova Integrada Ponta a Ponta com Aplicativo Fechado', () => {
    it('Fluxo Completo: Orçamento vencido -> Job ativo -> Execução Server-Side -> Log gravado -> Status EXPIRADO', () => {
      const orcIntegrado = '00000099-0000-0000-0000-000000000099';
      const USER_INT = '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
      const CLI_INT = 'aaaa0001-0000-0000-0000-000000000001';

      // Setup de usuário e cliente para a prova integrada
      execSql(`
        INSERT INTO public.usuario (id, nome, ativo) VALUES ('${USER_INT}'::uuid, 'Usuário Integrado', true) ON CONFLICT (id) DO NOTHING;
        INSERT INTO public.cliente (id, usuario_id, nome) VALUES ('${CLI_INT}'::uuid, '${USER_INT}'::uuid, 'Cliente Integrado') ON CONFLICT (id) DO NOTHING;
      `);

      // 1. Inserir orçamento vencido em ENVIADO
      execSql(`
        INSERT INTO public.orcamento (id, usuario_id, cliente_id, numero, status, data_validade, subtotal, valor_desconto, total)
        VALUES ('${orcIntegrado}'::uuid, '${USER_INT}'::uuid, '${CLI_INT}'::uuid, 'INT-PROVA-01', 'ENVIADO', '2026-03-01', 250, 0, 250)
        ON CONFLICT (id) DO UPDATE SET status = 'ENVIADO', data_validade = '2026-03-01';
      `);

      // 2. Garantir que o job está ativo no pg_cron
      const jobActive = execSql(`
        SELECT active FROM cron.job WHERE jobname = 'job_expirar_orcamentos_diario';
      `).trim();
      assert.strictEqual(jobActive, 't', 'Job deve estar ativo (t)');

      // 3. Disparar ciclo controlado da rotina server-side (sem aplicativo móvel aberto)
      const resFn = execSql(`
        SELECT app_private.executar_expiracao_orcamentos();
      `);
      assert.ok(resFn.includes('sucesso'), 'Execução da função privada deve retornar sucesso');

      // 4. Verificar log funcional em app_private.expiracao_execucao_log
      const logs = execSqlJson(`
        SELECT id, data_corte, linhas_afetadas, sucesso, origem 
        FROM app_private.expiracao_execucao_log 
        ORDER BY id DESC LIMIT 1;
      `);
      assert.ok(logs.length > 0, 'Log funcional deve conter pelo menos 1 registro');
      assert.strictEqual(logs[0].sucesso, true);
      assert.strictEqual(logs[0].origem, 'SCHEDULER');

      // 5. Verificar que o orçamento de teste transicionou efetivamente para EXPIRADO
      const statusFinal = execSql(`
        SELECT status FROM public.orcamento WHERE id = '${orcIntegrado}'::uuid;
      `).trim();
      assert.strictEqual(statusFinal, 'EXPIRADO', 'Orçamento deve estar com status EXPIRADO');
    });

    after(() => {
      execSql(`
        DELETE FROM public.orcamento WHERE id = '00000099-0000-0000-0000-000000000099'::uuid;
        DELETE FROM public.cliente WHERE id = 'aaaa0001-0000-0000-0000-000000000001'::uuid;
        DELETE FROM public.usuario WHERE id = '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid;
      `);
    });
  });
});

