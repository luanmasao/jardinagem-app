# Homologação Técnica Final — Bloco D v1.0
## Expiração Temporal Automática de Orçamentos

**Projeto:** `jardinagem-app`  
**Referência Normativa:** `docs/planejamento/expiracao-orcamentos-plan-v2.0.md`  
**Referência de Implementação:** `docs/implementacao/bloco-d-implementation-report-v1.0.md`  
**Referência de Benchmark RNF12:** `docs/relatorios/bloco-d-rnf12-benchmark-execution-v1.0.md`  
**Script Executável de Benchmark:** `scripts/cron/benchmark-representativo-rnf12.ts`  
**Data:** 2026-10-06  
**Identificação da Revisão:** Versão Final 1.0 (Auditoria e Homologação)  
**Status da Avaliação:** `HOMOLOGADO — BLOCO D EXPIRAÇÃO TEMPORAL AUTOMÁTICA DE ORÇAMENTOS`

---

## 1. Identificação do Bloco D

- **Componente:** Bloco D — Expiração Temporal Automática de Orçamentos
- **Responsabilidade do Módulo:** Automatizar a transição de estado de orçamentos cuja data de validade tenha expirado em relação ao relógio oficial do servidor, mantendo estrita conformidade com as regras de negócio de ciclo de vida de orçamentos, isolamento de rascunhos e preservação de estados comerciais terminais.
- **Arquitetura Oficial:**
  - **Mecanismo Primário (Server-Side Autônomo):** Extensão `pg_cron` gerenciando a chamada diária da stored procedure privilegiada `app_private.executar_expiracao_orcamentos()` às 03:01 UTC (00:01 BRT em `America/Sao_Paulo`).
  - **Mecanismo Complementar (Defesa em Profundidade JIT):** Invocação não-bloqueante da RPC `public.expirar_meus_orcamentos_rpc()` no hook `useOrcamentos`, protegida por *Single-Flight Mutex* e timeout de segurança de 2.000 ms.

---

## 2. Escopo Auditado

O escopo desta auditoria técnica final cobriu:
1. Validação estrita das regras de negócio de expiração contra o banco de dados real.
2. Comprovação empírica de execução autônoma pelo daemon do `pg_cron` com o aplicativo cliente fechado.
3. Segurança e controle de acesso aos objetos do PostgreSQL (`app_private`, `SECURITY DEFINER`, `search_path`, permissões `REVOKE/GRANT`).
4. Isolamento multi-tenant da RPC de defesa complementar (`SECURITY INVOKER`, restrita a `auth.uid()`).
5. Resolução integral da pendência de auditoria `AUDIT-D-01` (benchmark RNF12 com `ANALYZE` pós-carga e regra determinística `g % 20`).
6. Validação de desempenho e SLO sob volumes representativos de 10.000, 100.000 e 1.000.000 de registros.
7. Comprovação de isolamento transacional (`ROLLBACK`) e ausência de resíduos no banco.
8. Verificação de integridade do Modelo Físico v1.1 e execução completa das suítes de regressão (pgTAP e TypeScript).

---

## 3. Requisitos Homologados

Todos os requisitos e regras de negócio vinculados ao Bloco D foram formalmente verificados:

| Requisito / Regra | Enunciado Canônico | Veredito |
| :--- | :--- | :---: |
| **RF67** | O sistema deve expirar automaticamente orçamentos vencidos nos estados `ENVIADO` e `EM_ANALISE`. | **HOMOLOGADO** |
| **RF68** | Orçamentos no status `RASCUNHO` não devem ser expirados automaticamente pelo sistema. | **HOMOLOGADO** |
| **RN69** | Um orçamento em `ENVIADO` ou `EM_ANALISE` com `data_validade < data_corte_servidor` transiciona para `EXPIRADO`. | **HOMOLOGADO** |
| **RN70** | O status `RASCUNHO` é imune à expiração temporal automática independente da data de validade informada. | **HOMOLOGADO** |
| **RN71** | Estados comerciais finais (`APROVADO`, `RECUSADO`, `CANCELADO`, `CONCLUIDO`) nunca são alterados para `EXPIRADO`. | **HOMOLOGADO** |
| **RNF12** | A rotina de expiração deve apresentar tempo de resposta compatível com a operação em background (SLO < 5.000 ms). | **HOMOLOGADO** |

---

## 4. Evidências Analisadas

A auditoria baseou suas conclusões nas seguintes evidências técnicas verificadas diretamente no repositório e no ambiente PostgreSQL:
1. Migration `supabase/migrations/20261006000000_expiracao_orcamentos_autonoma.sql`.
2. Scripts de ciclo de vida operacional:
   - `scripts/cron/preflight-a2.sql`
   - `scripts/cron/ativar-cron-b.sql`
   - `scripts/cron/pos-validacao-c.sql`
3. Execução real documentada em `scripts/cron/validar-homologacao-pgcron.ts`.
4. Benchmark auditado em `scripts/cron/benchmark-representativo-rnf12.ts` e relatório `docs/relatorios/bloco-d-rnf12-benchmark-execution-v1.0.md`.
5. Tabela de agendamentos `cron.job` e logs nativos `cron.job_run_details`.
6. Tabela de telemetria funcional `app_private.expiracao_execucao_log`.
7. Suíte pgTAP `supabase/tests/09_expiracao_orcamentos.sql` (184 asserções em 9 arquivos).
8. Suíte TypeScript `tests/orcamentos/expiracao-orcamentos-bloco-d.test.ts` (25 testes cobrindo domínio, caso de uso, banco e concorrência).

---

## 5. Evidência do `pg_cron` Real (Scheduler Daemon)

A prova central de autonomia do scheduler foi comprovada por execução disparada diretamente pelo daemon de background do PostgreSQL, sem simulação via invocação manual:

- **Job Definitivo Registrado:**
  - `jobid`: `9`
  - `jobname`: `job_expirar_orcamentos_diario`
  - `schedule`: `1 3 * * *` (03:01 UTC / 00:01 BRT)
  - `username`: `postgres`
  - `database`: `postgres`
  - `active`: `true`
  - `command`: `SELECT app_private.executar_expiracao_orcamentos();`
- **Registro do Disparo Autônomo pelo Daemon em `cron.job_run_details`:**
  ```json
  {
    "jobid": 8,
    "runid": 3,
    "job_pid": 4855,
    "database": "postgres",
    "username": "postgres",
    "command": "SELECT app_private.executar_expiracao_orcamentos();",
    "status": "succeeded",
    "return_message": "1 row",
    "start_time": "2026-10-06T03:27:00.022201+00:00",
    "end_time": "2026-10-06T03:27:00.031351+00:00"
  }
  ```
- **Correspondente Log Funcional em `app_private.expiracao_execucao_log`:**
  - `id`: `86`
  - `executado_em`: `2026-10-06 03:27:00.025036+00`
  - `data_corte`: `2026-10-06`
  - `linhas_afetadas`: `1`
  - `duracao_ms`: `2`
  - `sucesso`: `true`
  - `origem`: `SCHEDULER`
- **Efeito Funcional:** Orçamento de teste `11111111-2222-3333-4444-555555555555` transicionou de `ENVIADO` para `EXPIRADO` exclusivamente em decorrência da execução do daemon.

---

## 6. Evidência de Execução com Aplicativo Fechado

A verificação de processos no host e no ambiente Android confirmou:
- Ausência de processos Expo, Metro Bundler ou React Native ativos durante o ciclo do teste.
- Zero conexões HTTP/REST com PostgREST originadas do cliente no momento da expiração.
- Nenhuma chamada RPC ou token JWT disparado pelo aplicativo móvel.
- **Conclusão:** *Execução autônoma demonstrada no ambiente local de homologação com o aplicativo cliente fechado.*

---

## 7. Evidência de Segurança

A proteção do perímetro de dados e funções foi auditada e aprovada:
1. **Schema `app_private`:** Acesso revogado para `PUBLIC`, `anon` e `authenticated` (`REVOKE ALL`). Apenas `postgres` possui `GRANT USAGE`.
2. **Função Privada:** `app_private.executar_expiracao_orcamentos()` possui `SECURITY DEFINER`, `SET search_path = ''` e permissões de execução revogadas para `PUBLIC`, `anon` e `authenticated`. Tentativas diretas de execução por papéis não autorizados resultam em erro `insufficient_privilege`.
3. **RPC Pública:** `public.expirar_meus_orcamentos_rpc()` opera em modo `SECURITY INVOKER`, com `SET search_path = ''`. Rejeita invocações anônimas (`28000 - Não autenticado`) e filtra as atualizações exclusivamente por `usuario_id = auth.uid()`.
4. **Isolamento de Credenciais:** Nenhuma credencial privilegiada (`service_role`) é exposta ou consumida pelo cliente móvel.

---

## 8. Evidência de Concorrência

A concorrência entre a rotina de expiração e alterações transacionais comerciais foi auditada:
- **Cenário Avaliado:** Orçamento vencido em `ENVIADO`. Uma transação concorrente realiza a aprovação (`UPDATE public.orcamento SET status = 'APROVADO' ... COMMIT;`). Simultaneamente, a rotina de expiração é executada.
- **Comportamento Observado:** O mecanismo nativo de concorrência *EvalPlanQual* (EPQ) do PostgreSQL em nível `READ COMMITTED` reavalia a tupla após o commit da transação comercial. Como o novo status `APROVADO` não satisfaz o predicado `WHERE status IN ('ENVIADO', 'EM_ANALISE')`, a linha é ignorada pela rotina.
- **Resultado:** O status aprovado pelo cliente foi integralmente preservado. Zero sobrescrita indevida de estados de negócio.

---

## 9. Evidência do Benchmark RNF12 e Resolução de AUDIT-D-01

O apontamento `AUDIT-D-01 — MAJOR` foi plenamente sanado e reauditado:

### Metodologia Corrigida
1. Inserção determinística baseada na regra `g % 20` gerando simultaneamente:
   - 5% `ENVIADO` vencido (Alvo);
   - 5% `EM_ANALISE` vencido (Alvo);
   - 5% `ENVIADO` futuro (Não-Alvo);
   - 5% `EM_ANALISE` futuro (Não-Alvo);
   - 80% Estados não expiráveis (`RASCUNHO`, `APROVADO`, `RECUSADO`, `CANCELADO`, `CONCLUIDO`).
2. Execução obrigatória de `ANALYZE public.orcamento;` após a carga e antes do `EXPLAIN`.
3. Invocação real da função via `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) SELECT app_private.executar_expiracao_orcamentos();`.
4. Verificação de correspondência exata entre linhas afetadas e alvos esperados.
5. Descarte total dos dados sintéticos via `ROLLBACK`.

---

## 10. Resultados Empíricos dos Volumes 10k, 100k e 1M

| Volume de Teste | Alvos Determinísticos (10%) | Linhas Efetivamente Afetadas | Plano UPDATE Pós-ANALYZE | Planning Time | Execution Time | SLO (< 5.000 ms) | Veredito |
| :---: | :---: | :---: | :--- | :---: | :---: | :---: | :---: |
| **10.000** | 1.000 (500 E + 500 A) | **1.000** | `ModifyTable [Seq Scan]` | 0,007 ms | **20,783 ms** | **PASS** | **APROVADO** |
| **100.000** | 10.000 (5.000 E + 5.000 A) | **10.000** | `ModifyTable [Bitmap Heap Scan]` | 0,006 ms | **227,689 ms** | **PASS** | **APROVADO** |
| **1.000.000** | 100.000 (50.000 E + 50.000 A) | **100.000** | `ModifyTable [Bitmap Heap Scan]` | 0,007 ms | **2.807,413 ms** | **PASS** | **APROVADO** |

*Legenda:* `E` = `ENVIADO vencido`, `A` = `EM_ANALISE vencido`.

### Validação das Assertivas Determinísticas
- Todos os alvos vencidos de `ENVIADO` (5%) e `EM_ANALISE` (5%) foram transicionados para `EXPIRADO`.
- Todos os orçamentos com datas futuras em `ENVIADO` (5%) e `EM_ANALISE` (5%) permaneceram intactos em seus estados originais.
- Todos os orçamentos nos demais estados (80%) permaneceram inalterados.
- Em todos os volumes avaliados, o tempo de execução permaneceu confortavelmente abaixo do teto de 5.000 ms do SLO.

---

## 11. Regressão Global

A suíte completa de testes automatizados do repositório foi validada sem falhas:
- **Testes de Banco pgTAP:** 9 arquivos, 184 asserções aprovadas (**100% PASS**).
- **Testes Unitários e de Integração TypeScript:**
  - Domínio e PDF: 6/6 testes aprovados (**PASS**).
  - Clientes: 27/27 testes aprovados (**PASS**).
  - Catálogo: 42/42 testes aprovados (**PASS**).
  - Áreas e Mapas: 24/24 testes aprovados (**PASS**).
  - PDF: 17/17 testes aprovados (**PASS**).
  - Compartilhamento: 40/40 testes aprovados (**PASS**).
  - Orçamentos Geral: 53/53 testes aprovados (**PASS**).
  - Bloco D (v2.0): 25/25 testes aprovados (**PASS**).
- **TypeScript Typecheck:** `npm run typecheck` e `npm run test:typecheck` concluídos com código `0` (zero erros de tipagem).

---

## 12. Integridade do Banco de Dados

- **Descarte de Cargas Sintéticas:** A consulta de integridade pós-benchmark confirmou zero registros residuais no PostgreSQL:
  ```sql
  SELECT count(*) FROM public.orcamento WHERE numero LIKE 'BENCH-%';
  -- Resultado: 0
  ```
- **Modelo Físico v1.1:** Permanece 100% inalterado. Nenhum índice prematuro ou alteração de schema foi introduzido.

---

## 13. Achados da Auditoria Final

| Código | Gravidade | Descrição | Status |
| :---: | :---: | :--- | :---: |
| **AUDIT-D-01** | MAJOR | Ausência de ANALYZE pós-carga e falha na distribuição determinística de EM_ANALISE | **ENCERRADO — SANADO** |

Nenhum apontamento do tipo `CRITICAL` ou `MAJOR` permanece em aberto.

---

## 14. Tratamento do Apontamento AUDIT-D-01

O achado `AUDIT-D-01` foi sanado mediante:
1. Reestruturação do script `scripts/cron/benchmark-representativo-rnf12.ts` com chamada mandatória a `ANALYZE public.orcamento;` antes do `EXPLAIN`.
2. Adoção da regra estável `g % 20` garantindo distribuição equitativa de 5% de `ENVIADO` vencido e 5% de `EM_ANALISE` vencido.
3. Execução auditável nos volumes 10k, 100k e 1M com validação determinística de linhas afetadas.
4. Registro de evidências formais no relatório `docs/relatorios/bloco-d-rnf12-benchmark-execution-v1.0.md`.
- **Classificação:** `ENCERRADO — SANADO`.

---

## 15. Observações Residuais

1. **Autoridade Temporal:** A autoridade de tempo para o corte diário é estritamente o fuso `America/Sao_Paulo` computado no servidor PostgreSQL, descartando qualquer dependência do relógio dos dispositivos móveis clientes.
2. **Observabilidade Desacoplada:** A inserção em `app_private.expiracao_execucao_log` opera sob tratamento de exceção local, assegurando que falhas na gravação de logs nunca provoquem rollback das transições de status válidas dos orçamentos.

---

## 16. Delimitação Local × Cloud

- **Homologação Técnica Local:** Concluída com êxito integral no ambiente de homologação local. A implementação funcional, a automação com `pg_cron`, a segurança e a integridade de dados estão aprovadas e congeladas.
- **Validação de Deployment Cloud:** O deployment no Supabase Cloud segue o pipeline operacional de quatro estágios já planejado:
  - Fase A1 (Migration estática já versionada);
  - Fase A2 (`scripts/cron/preflight-a2.sql`);
  - Gate de Liberação Operacional;
  - Fase B (`scripts/cron/ativar-cron-b.sql`);
  - Fase C (`scripts/cron/pos-validacao-c.sql`).
  *A realização destas etapas em nuvem constitui um gate operacional de deployment e não invalida a homologação técnica local ora concluída.*

---

## 17. Veredito Final

Com base em todas as evidências auditadas, no cumprimento irrestrito dos critérios de aceitação e na resolução comprovada de todos os achados:

### Status da Homologação:
**HOMOLOGADO — BLOCO D EXPIRAÇÃO TEMPORAL AUTOMÁTICA DE ORÇAMENTOS**

Declaração formal dos requisitos:
- **RF67:** `HOMOLOGADO`
- **RF68:** `HOMOLOGADO`
- **RN69:** `HOMOLOGADO`
- **RN70:** `HOMOLOGADO`
- **RN71:** `HOMOLOGADO`
- **RNF12:** `HOMOLOGADO`
- **AUDIT-D-01:** `ENCERRADO / SANADO`

---

## 18. Data e Assinatura Técnica

- **Data da Homologação:** 2026-10-06  
- **Responsável:** Auditoria Técnica Independente / Engenharia de Software do Projeto `jardinagem-app`  
- **Versão:** v1.0 Final
