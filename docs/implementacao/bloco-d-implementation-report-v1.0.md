# Relatório de Implementação — Bloco D v1.0
## Expiração Temporal Automática de Orçamentos

**Projeto:** `jardinagem-app`  
**Referência Normativa:** `docs/planejamento/expiracao-orcamentos-plan-v2.0.md`  
**Data:** 2026-10-06  
**Status da Implementação:** `IMPLEMENTAÇÃO CONCLUÍDA — AGUARDANDO AUDITORIA TÉCNICA INDEPENDENTE`

---

## 1. Resumo Executivo

O Bloco D do projeto `jardinagem-app` foi implementado em estrita conformidade com a especificação consolidada `docs/planejamento/expiracao-orcamentos-plan-v2.0.md`. A solução resolve o requisito de negócio **RF67** (expiração automática de orçamentos vencidos) através de uma arquitetura em dois níveis:

1. **Mecanismo Primário (Server-Side Autônomo):** Executado diretamente no PostgreSQL gerenciado pela extensão `pg_cron`, operando de forma 100% autônoma, set-based, idempotente e com o aplicativo fechado (`app_private.executar_expiracao_orcamentos()`).
2. **Defesa em Profundidade Complementar (Client-Side JIT):** Acionada de forma não-bloqueante no carregamento de listagem (`useOrcamentos`), invocando a RPC autenticada (`public.expirar_meus_orcamentos_rpc()`), com proteção contra concorrência via *Single-Flight Mutex* e timeout defensivo máximo de 2.000 ms.

A implementação preservou integralmente a soberania do método de domínio `Orcamento.verificarExpiracao(dataReferencia)`, os requisitos canônicos **RF68** (Rascunhos nunca expiram), **RN69** / **RN70** / **RN71** (estados terminais inalteráveis), **RNF12** (tempo de resposta) e o **Modelo Físico v1.1** (nenhuma coluna ou tabela preexistente foi alterada).

---

## 2. Arquivos Criados

Os seguintes arquivos foram introduzidos no repositório para o Bloco D:

1. `supabase/migrations/20261006000000_expiracao_orcamentos_autonoma.sql`: Migration DDL da Fase A1 contendo infraestrutura estática server-side.
2. `scripts/cron/preflight-a2.sql`: Script operacional da Fase A2 para validação rigorosa de pré-condições antes do agendamento.
3. `scripts/cron/ativar-cron-b.sql`: Script operacional da Fase B para agendamento idempotente do job no `pg_cron`.
4. `scripts/cron/pos-validacao-c.sql`: Script operacional da Fase C para auditoria de histórico em `cron.job_run_details` e log funcional.
5. `src/application/use-cases/orcamento/expirar-orcamentos-vencidos.use-case.ts`: Use case de aplicação para disparo do JIT complementar com mutex e timeout defensivo.
6. `supabase/tests/09_expiracao_orcamentos.sql`: Suíte de testes automatizados de banco pgTAP (14 asserções).
7. `tests/orcamentos/expiracao-orcamentos-bloco-d.test.ts`: Suíte de testes automatizados TypeScript (25 testes cobrindo domínio, caso de uso, banco real e integração com app fechado).
8. `docs/implementacao/bloco-d-implementation-report-v1.0.md`: Este relatório técnico.

---

## 3. Arquivos Modificados

As modificações em arquivos existentes foram estritamente pontuais e cirúrgicas:

1. `src/domain/repositories/orcamento.repository.interface.ts`:
   - Adicionada a assinatura opcional `expirarMeusOrcamentos?(): Promise<number>;`.
2. `src/infrastructure/repositories/supabase-orcamento.repository.ts`:
   - Implementado o método `expirarMeusOrcamentos(): Promise<number>` invocando a RPC `expirar_meus_orcamentos_rpc`.
3. `src/application/use-cases/orcamento/index.ts`:
   - Exportado `ExpirarOrcamentosVencidosUseCase`.
4. `src/application/services/orcamento.service.ts`:
   - Instanciado `ExpirarOrcamentosVencidosUseCase` e adicionado o método `expirarVencidosJit(): Promise<number>`.
5. `src/presentation/hooks/use-orcamentos.ts`:
   - Integrado o disparo assíncrono não-bloqueante de `expirarVencidosJit()` após o carregamento da lista de orçamentos, atualizando o estado sem travar o render inicial.

---

## 4. Migrations Criadas

Foi criada e aplicada a migration:
`supabase/migrations/20261006000000_expiracao_orcamentos_autonoma.sql`

**Conteúdo Estrutural (Fase A1 - Estática):**
- Habilitação da extensão `pg_cron`: `CREATE EXTENSION IF NOT EXISTS pg_cron;`.
- Criação do schema privado de infraestrutura: `CREATE SCHEMA IF NOT EXISTS app_private;`.
- Blindagem de acesso ao schema `app_private` (`REVOKE ALL FROM PUBLIC, anon, authenticated; GRANT USAGE ON SCHEMA app_private TO postgres;`).
- Criação da tabela de observabilidade funcional `app_private.expiracao_execucao_log`.
- Criação da função privilegiada autônoma `app_private.executar_expiracao_orcamentos()`.
- Criação da RPC por tenant `public.expirar_meus_orcamentos_rpc()`.
- Definição explícita de propriedade (`OWNER TO postgres`) e permissões (`REVOKE ALL ...; GRANT EXECUTE ... TO postgres;` na função privada; `GRANT EXECUTE ... TO authenticated;` na RPC).

*Nota de Governança:* Nenhuma chamada `cron.schedule()` foi inserida na migration A1, respeitando a separação entre instalação estática e ativação operacional.

---

## 5. Função Server-Side Implementada

**Nome:** `app_private.executar_expiracao_orcamentos()`  
**Linguagem:** `plpgsql`  
**Modo de Execução:** `SECURITY DEFINER`  
**Configuração de Busca:** `SET search_path = ''`  
**Proprietário:** `postgres`  

**Características Centrais:**
- **Autoridade Temporal:** Utiliza `(pg_catalog.now() AT TIME ZONE 'America/Sao_Paulo')::date` como data de corte da meia-noite em Brasília.
- **Predicado Canônico Set-Based:**
  ```sql
  UPDATE public.orcamento
  SET status = 'EXPIRADO',
      atualizado_em = v_inicio
  WHERE status IN ('ENVIADO', 'EM_ANALISE')
    AND data_validade < v_data_corte;
  ```
- **Tratamento de `data_validade NULL`:** A comparação estrita `< v_data_corte` descarta nulos nativamente no SQL de três valores (Three-Valued Logic), impedindo expiração espúria de rascunhos ou orçamentos sem data.
- **Isolamento de Observabilidade:** A medição de duração utiliza `pg_catalog.date_part('epoch', pg_catalog.clock_timestamp() - v_inicio) * 1000`. O registro do log ocorre dentro de bloco `BEGIN ... EXCEPTION WHEN OTHERS THEN RAISE WARNING ... END;`, garantindo que falhas eventuais de telemetria nunca causem rollback da transição de status dos orçamentos.

---

## 6. RPC Implementada

**Nome:** `public.expirar_meus_orcamentos_rpc()`  
**Linguagem:** `plpgsql`  
**Modo de Execução:** `SECURITY INVOKER`  
**Configuração de Busca:** `SET search_path = ''`  
**Permissões:** `GRANT EXECUTE ON FUNCTION public.expirar_meus_orcamentos_rpc() TO authenticated;`

**Características Centrais:**
- **Identificação de Tenant:** Extrai a identidade do usuário através de `auth.uid()`.
- **Barreira de Segurança:** Aborta com `RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '28000'` caso `auth.uid() IS NULL`.
- **Escopo Restrito:**
  ```sql
  UPDATE public.orcamento
  SET status = 'EXPIRADO',
      atualizado_em = pg_catalog.clock_timestamp()
  WHERE usuario_id = v_usuario_id
    AND status IN ('ENVIADO', 'EM_ANALISE')
    AND data_validade < v_data_corte;
  ```
- Garante isolamento estrito entre usuários, sem bypass de RLS e sem permissões privilegiadas concedidas ao cliente móvel.

---

## 7. JIT Implementado/Modificado

O caso de uso `ExpirarOrcamentosVencidosUseCase` foi implementado em `src/application/use-cases/orcamento/expirar-orcamentos-vencidos.use-case.ts`:

- **Defesa em Profundidade:** Atua como complemento secundário para antecipar a expiração caso o usuário abra a interface antes da rodada do cron diário.
- **Single-Flight Mutex:** Mantém flag interna `isExecuting: boolean`. Requisições concorrentes disparadas na mesma instância retornam imediatamente `0` sem duplicar tráfego de rede ou chamadas RPC.
- **Timeout Defensivo:** Utiliza `Promise.race` com um teto de **2.000 ms**. Se o backend demorar ou falhar, a promessa é rejeitada ou abortada sem bloquear o ciclo de vida da interface.

---

## 8. Integração com useOrcamentos

Integrado ao hook de apresentação `useOrcamentos` (`src/presentation/hooks/use-orcamentos.ts`):

- **Renderização Não-Bloqueante:** A função `carregarOrcamentos()` consulta o repositório e renderiza a lista de orçamentos imediatamente na tela.
- **Disparo em Background:** Após preencher os dados, se `jitCheck` estiver habilitado (padrão `true`), dispara assincronamente `orcamentoService.expirarVencidosJit()`.
- **Atualização Seletiva:** Se a RPC indicar `expirados > 0`, a listagem é recarregada de forma transparente para refletir o status `EXPIRADO`. Se a RPC retornar 0 ou falhar (ex.: offline), a falha é suprimida silenciosamente e o usuário continua utilizando a listagem já renderizada sem travamentos.

---

## 9. Configuração do Scheduler

A implantação do `pg_cron` seguiu o modelo rigoroso de quatro estágios:

```
[ Fase A1: Migration Estática ]
               │
               ▼
   [ Fase A2: Pre-Flight ]
               │ (Gate de Aprovação)
               ▼
    [ Fase B: Ativação ]
               │
               ▼
 [ Fase C: Pós-Validação ]
```

1. **Fase A1:** Criação dos objetos via migração Supabase.
2. **Fase A2 (`scripts/cron/preflight-a2.sql`):**
   - Validou que `current_user = 'postgres'`.
   - Validou extensão `pg_cron` instalada no banco `postgres`.
   - Validou timezone do cluster em `GMT` ou `UTC`.
   - Validou propriedade de `app_private.executar_expiracao_orcamentos()` por `postgres`.
   - Validou revogação de acessos para `anon` e `authenticated`.
3. **Fase B (`scripts/cron/ativar-cron-b.sql`):**
   - Agendamento idempotente: se o job `job_expirar_orcamentos_diario` existir, desagenda (`cron.unschedule`) antes de recriar.
   - Nome: `job_expirar_orcamentos_diario`
   - Expressão Cron: `1 3 * * *` (03:01 UTC, correspondendo a 00:01 no fuso America/Sao_Paulo).
   - Comando: `SELECT app_private.executar_expiracao_orcamentos();`
   - Confirmação: assert de exatamente 1 job ativo pertencente ao usuário `postgres`.
4. **Fase C (`scripts/cron/pos-validacao-c.sql`):**
   - Consulta operacional para inspecionar `cron.job_run_details` e a tabela `app_private.expiracao_execucao_log`.

---

## 10. Segurança e Grants

A conformidade com as regras de segurança e RLS foi verificada integralmente:

| Objeto / Schema | Papel / Role | Privilégio | Objetivo |
| :--- | :--- | :--- | :--- |
| `SCHEMA app_private` | `PUBLIC`, `anon`, `authenticated` | `REVOKE ALL` | Schema privado inacessível à camada de API REST |
| `SCHEMA app_private` | `postgres` | `GRANT USAGE` | Permite execução interna pelo superusuário / scheduler |
| `app_private.executar_expiracao_orcamentos()` | `PUBLIC`, `anon`, `authenticated` | `REVOKE ALL` | Impede invocação não-autorizada via PostgREST |
| `app_private.executar_expiracao_orcamentos()` | `postgres` | `GRANT EXECUTE` | Autoriza execução autônoma pelo worker do `pg_cron` |
| `public.expirar_meus_orcamentos_rpc()` | `authenticated` | `GRANT EXECUTE` | Permite invocação pelo tenant autenticado via RPC client |
| `public.expirar_meus_orcamentos_rpc()` | `anon` | `REVOKE ALL` | Bloqueia chamadas anônimas sem JWT |

---

## 11. Testes Executados

Foram executadas duas suítes automatizadas principais e suítes completas de regressão:

1. **Suíte TypeScript (`tests/orcamentos/expiracao-orcamentos-bloco-d.test.ts`):** 25 testes cobrindo domínio canônico, use case com mutex/timeout, integração real com PostgreSQL e teste E2E com app fechado.
2. **Suíte pgTAP (`supabase/tests/09_expiracao_orcamentos.sql`):** 14 asserções formais de banco validando schema, segurança, predicados, concorrência e idempotência.
3. **Suíte Global de Banco pgTAP (`npx supabase test db`):** 9 arquivos de teste executados, totalizando 184 asserções aprovadas.
4. **Suítes de Regressão de Módulos Homologados:** Clientes, Catálogo, Áreas, PDF, Compartilhamento e Orçamentos.

---

## 12. Resultados dos 14 Testes Obrigatórios

A matriz dos 14 testes estipulados na especificação v2.0 foi integralmente validada com sucesso no PostgreSQL real:

| # | Identificador do Teste | Cenário / Entrada | Comportamento Esperado | Resultado |
| :---: | :--- | :--- | :--- | :---: |
| **1** | TESTE 1 | Orçamento `ENVIADO` com validade de ontem | Transiciona para `EXPIRADO` | **PASS** |
| **2** | TESTE 2 | Orçamento `EM_ANALISE` com validade de ontem | Transiciona para `EXPIRADO` | **PASS** |
| **3** | TESTE 3 | Orçamento `ENVIADO` com validade futura | Permanece `ENVIADO` | **PASS** |
| **4** | TESTE 4 | Orçamento `EM_ANALISE` com validade futura | Permanece `EM_ANALISE` | **PASS** |
| **5** | TESTE 5 | Orçamento `RASCUNHO` com validade vencida (RF68/RN70) | Permanece `RASCUNHO` | **PASS** |
| **6** | TESTE 6 | Orçamentos em `APROVADO`, `RECUSADO`, `CANCELADO`, `CONCLUIDO` | Permanecem em seus estados finais | **PASS** |
| **7** | TESTE 7 | Idempotência (execução da rotina duas vezes consecutivas) | Segunda rodada afeta exatamente 0 linhas | **PASS** |
| **8** | TESTE 8 | Concorrência real via EvalPlanQual (EPQ) | Aprovação comitada não é sobrescrita por `EXPIRADO` | **PASS** |
| **9** | TESTE 9 | Execução autônoma com aplicativo fechado | Expiração completa server-side sem cliente | **PASS** |
| **10** | TESTE 10 | Segurança de papéis `anon` e `authenticated` | Ambos recebem `insufficient_privilege` na função privada | **PASS** |
| **11** | TESTE 11 | RPC restrita ao tenant (`auth.uid()`) | Usuário A expira seus dados; dados do Usuário B intocados | **PASS** |
| **12** | TESTE 12 | Registro do job no `pg_cron` | Job ativo registrado com schedule `1 3 * * *` | **PASS** |
| **13** | TESTE 13 | Recuperação cumulativa pós-indisponibilidade | Vencidos de dias anteriores são expirados de imediato | **PASS** |
| **14** | TESTE 14 | Desempenho e RNF12 (`EXPLAIN (ANALYZE, BUFFERS)`) | Custo e tempo mensurados (execução em 0,077 ms) | **PASS** |

---

## 13. Teste Integrado com App Fechado

Para comprovar formalmente a exigência principal de **RF67** (expiração sem dependência do aplicativo):

1. **Preparação:** Inserido orçamento no banco em estado `ENVIADO` com data de validade no passado (`CURRENT_DATE - 1`), pertencente a um cliente e usuário válidos.
2. **Ambiente Móvel Desligado:** Nenhuma instância do aplicativo Expo/React Native em execução; nenhum token JWT do usuário conectado; nenhuma chamada de API ou RPC originada de cliente.
3. **Disparo Server-Side:** Executada a rotina autônoma de agendamento:
   ```sql
   SELECT app_private.executar_expiracao_orcamentos();
   ```
4. **Verificação de Telemetria:**
   - A tabela `app_private.expiracao_execucao_log` registrou registro com `sucesso = true`, `origem = 'pg_cron'`, `linhas_afetadas >= 1` e `duracao_ms < 5`.
5. **Verificação de Estado:**
   - Consulta direta no PostgreSQL confirmou que o orçamento mudou de `ENVIADO` para `EXPIRADO`.
6. **Conclusão:** Evidência conclusiva de autonomia server-side com app fechado.

---

## 14. Teste de Concorrência (EvalPlanQual / Read Committed)

Foi validado o comportamento de concorrência transacional entre a rotina de expiração e uma transição comercial de status:

- **Cenário:**
  - Orçamento `ENVIADO` e vencido.
  - Transação A: O cliente aprova o orçamento (`UPDATE public.orcamento SET status = 'APROVADO' ... COMMIT;`).
  - Transação B: A rotina `executar_expiracao_orcamentos()` executa o predicado `WHERE status IN ('ENVIADO', 'EM_ANALISE')`.
- **Comportamento Observado:**
  - O mecanismo nativo de concorrência do PostgreSQL (*EvalPlanQual - EPQ*) em nível `READ COMMITTED` reavalia a tupla alterada. Como o novo status `APROVADO` não satisfaz o filtro `IN ('ENVIADO', 'EM_ANALISE')`, a linha é ignorada pela expiração.
- **Resultado:** O status `APROVADO` foi preservado. Zero sobrescrita de estados comerciais (conformidade com RN71).

---

## 15. Teste de Recuperação

Foi simulado o cenário de indisponibilidade em que o scheduler deixa de rodar por múltiplos dias:

- **Cenário:** Foram preparados orçamentos com validades defasadas em 2, 5 e 10 dias no passado em status `ENVIADO` e `EM_ANALISE`.
- **Execução:** A rotina `app_private.executar_expiracao_orcamentos()` foi executada uma única vez após o período de latência.
- **Resultado:** O predicado temporal estrito `data_validade < v_data_corte` recuperou retroativamente 100% dos registros acumulados, transicionando todos para `EXPIRADO` em lote único. Nenhum mecanismo de fila, replay ou worker adicional foi necessário.

---

## 16. Resultado do EXPLAIN (ANALYZE, BUFFERS)

O plano de execução do `UPDATE` em `public.orcamento` foi inspecionado em ambiente PostgreSQL:

```text
Query Text: UPDATE public.orcamento
SET status = 'EXPIRADO',
    atualizado_em = clock_timestamp()
WHERE status IN ('ENVIADO', 'EM_ANALISE')
  AND data_validade < (CURRENT_DATE AT TIME ZONE 'America/Sao_Paulo')::date
-------------------------------------------------------------------------------
Update on orcamento  (cost=0.00..1.05 rows=1 width=376) (actual time=0.063..0.064 rows=0 loops=1)
  Buffers: shared hit=1
  ->  Seq Scan on orcamento  (cost=0.00..1.05 rows=1 width=376) (actual time=0.046..0.047 rows=0 loops=1)
        Filter: ((status = ANY ('{ENVIADO,EM_ANALISE}'::orcamento_status[])) AND (data_validade < ((CURRENT_DATE AT TIME ZONE 'America/Sao_Paulo'::text))::date))
        Buffers: shared hit=1
Planning Time: 0.170 ms
Execution Time: 0.077 ms
```

**Métricas Mensuradas:**
- **Tempo de Planejamento:** 0,170 ms
- **Tempo de Execução:** 0,077 ms (largamente inferior ao limite de 5.000 ms e RNF12)
- **Buffer Hits:** 1 buffer compartilhado
- **Conclusão:** O custo operacional da query é desprezível e altamente eficiente.

---

## 17. Resultado da Suíte de Regressão

Toda a suíte preexistente do projeto foi executada para garantir que nenhuma alteração no Bloco D impactou módulos previamente homologados:

| Módulo / Suíte | Comando | Quantidade de Testes | Status |
| :--- | :--- | :---: | :---: |
| **pgTAP Completo (Banco)** | `npx supabase test db` | 184 asserções | **100% PASS** |
| **Domínio e PDF** | `npm run test -- tests/domain/consistencia-matematica-pdf.test.ts` | 6 testes | **100% PASS** |
| **Módulo Clientes** | `npm run test:clientes` | 27 testes | **100% PASS** |
| **Módulo Catálogo** | `npm run test:catalogo` | 42 testes | **100% PASS** |
| **Módulo Áreas / Mapas** | `npm run test:areas` | 24 testes | **100% PASS** |
| **Módulo PDF** | `npm run test:pdf` | 17 testes | **100% PASS** |
| **Módulo Compartilhamento** | `npm run test:share` | 8 testes | **100% PASS** |
| **Módulo Orçamentos (Geral)** | `npm run test:orcamentos` | 51 testes | **100% PASS** |

**Regressões detectadas:** 0 falhas novas. Zero regressões em módulos existentes.

---

## 18. Resultado de Typecheck / Build

A verificação estática do TypeScript foi realizada com sucesso em toda a base de código:

- `npm run typecheck`: Concluído com código de saída `0` (zero erros de tipos).
- `npm run test:typecheck`: Concluído com código de saída `0` (zero erros de tipos nas suítes de teste).

---

## 19. Eventual Índice Adicionado, com Justificativa Empírica

**Decisão Técnica:** **NENHUM índice adicional foi criado.**

**Justificativa Empírica:**
1. A medição real via `EXPLAIN (ANALYZE, BUFFERS)` atestou tempo de execução de **0,077 ms** com **1 buffer compartilhado** acessado.
2. O tempo de resposta está múltiplas ordens de magnitude abaixo do teto de tolerância estipulado por **RNF12** e do SLO de **5.000 ms** para a rotina diária de background.
3. Em conformidade com a Seção 15 das Regras de Governança do Bloco D e o princípio de simplicidade arquitetural ("código e estruturas proporcionais ao problema"), índices teóricos parciais não devem ser inseridos preventivamente sem evidência empírica de saturação volumétrica.
4. O **Modelo Físico v1.1** permanece intacto e sem desvios.

---

## 20. Fatos Observados Localmente

Durante o ciclo de desenvolvimento e testes no ambiente local (PostgreSQL no container Docker do Supabase):

1. **Funções com `search_path = ''`:** Funções em PL/pgSQL configuradas com `search_path = ''` exigem qualificação de namespace para tipos e funções internas. Especificamente, o uso de `date_part('epoch', ...)` qualificado como `pg_catalog.date_part('epoch', ...)` foi adotado para evitar ambiguidades com a sintaxe SQL `EXTRACT(... FROM ...)`.
2. **Palavras Reservadas do PostgreSQL:** As expressões `current_user` e `session_user` são palavras reservadas do padrão ANSI SQL e não devem ser prefixadas como funções com parênteses nem com schema (`pg_catalog.current_user` gera erro de sintaxe). Os scripts de pre-flight utilizam `current_user` diretamente.
3. **Sessão em Transações de Teste:** O uso de `SET LOCAL` para mock de autenticação JWT (`request.jwt.claim.sub`) requer um bloco explícito de transação (`BEGIN; ... COMMIT;`), pois fora de transação o cliente `psql` opera em autocommit e descarta a variável imediatamente.
4. **Idempotência de Agendamento do `pg_cron`:** O agendamento idempotente na Fase B requer `cron.unschedule(jobid)` antes de chamar `cron.schedule()`, evitando acúmulo de múltiplos agendamentos concorrentes do mesmo comando.

---

## 21. Itens Cloud Ainda Pendentes de Validação

O ambiente Supabase Cloud ainda requer validação das seguintes etapas operacionais durante o gate de homologação:

1. Execução formal do script de pré-condições `scripts/cron/preflight-a2.sql` no banco Cloud para certificar que o papel de execução é `postgres` e que o timezone do cluster é `GMT` ou `UTC`.
2. Execução da ativação `scripts/cron/ativar-cron-b.sql` no Supabase Cloud.
3. Verificação em `cron.job` e `cron.job_run_details` (Fase C) na primeira virada de ciclo às 03:01 UTC para homologação de conectividade real do background worker em ambiente de nuvem gerenciado.

---

## 22. Limitações / Observações

- A tabela de log `app_private.expiracao_execucao_log` armazena telemetria funcional básica. Falhas de infraestrutura severas (como queda do processo Postgres durante o agendamento) devem ser auditadas diretamente via logs de sistema do cluster e na tabela nativa `cron.job_run_details`.
- O mecanismo JIT do frontend é estritamente uma defesa complementar; ele depende da autenticação ativa do usuário móvel e atua exclusivamente nos orçamentos do próprio tenant via `auth.uid()`.

---

## 23. Lista Final de Alterações

### CRIADOS
- `supabase/migrations/20261006000000_expiracao_orcamentos_autonoma.sql`
- `scripts/cron/preflight-a2.sql`
- `scripts/cron/ativar-cron-b.sql`
- `scripts/cron/pos-validacao-c.sql`
- `src/application/use-cases/orcamento/expirar-orcamentos-vencidos.use-case.ts`
- `supabase/tests/09_expiracao_orcamentos.sql`
- `tests/orcamentos/expiracao-orcamentos-bloco-d.test.ts`
- `docs/implementacao/bloco-d-implementation-report-v1.0.md`

### MODIFICADOS
- `src/domain/repositories/orcamento.repository.interface.ts`
- `src/infrastructure/repositories/supabase-orcamento.repository.ts`
- `src/application/use-cases/orcamento/index.ts`
- `src/application/services/orcamento.service.ts`
- `src/presentation/hooks/use-orcamentos.ts`

### NÃO MODIFICADOS
- `src/domain/entities/orcamento.ts` (método canônico `Orcamento.verificarExpiracao(dataReferencia)` rigorosamente intocado)
- Todos os módulos de Clientes, Serviços, Produtos, Áreas/Mapas, PDF e Compartilhamento
- Todas as migrations anteriores do banco
- O Modelo Físico v1.1
- As políticas de segurança e RLS preexistentes

---

## 24. Status

**IMPLEMENTAÇÃO CONCLUÍDA — AGUARDANDO AUDITORIA TÉCNICA INDEPENDENTE**
