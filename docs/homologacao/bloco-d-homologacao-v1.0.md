# Homologação Técnica Formal — Bloco D v1.0
## Expiração Temporal Automática de Orçamentos

**Projeto:** `jardinagem-app`  
**Referência Normativa:** `docs/planejamento/expiracao-orcamentos-plan-v2.0.md`  
**Referência da Implementação:** `docs/implementacao/bloco-d-implementation-report-v1.0.md`  
**Data:** 2026-10-06  
**Status da Avaliação:** `HOMOLOGADO`  

---

## 1. Identificação do Bloco D

- **Módulo:** Bloco D — Expiração Temporal Automática de Orçamentos
- **Responsabilidade:** Garantir a transição autônoma e consistente de orçamentos com validade vencida de `ENVIADO` ou `EM_ANALISE` para `EXPIRADO` (RF67, RN69), respeitando o isolamento do estado `RASCUNHO` (RF68, RN70) e a imutabilidade dos estados terminais (RN71).
- **Arquitetura Homologada:**
  - **Primária (Server-Side):** PostgreSQL + extensão `pg_cron` executando de forma autônoma a stored function privilegiada `app_private.executar_expiracao_orcamentos()` às 03:01 UTC (00:01 BRT), com autoridade temporal em `America/Sao_Paulo`.
  - **Complementar (Client-Side JIT):** Chamada não-bloqueante a `public.expirar_meus_orcamentos_rpc()` no hook `useOrcamentos`, protegida por *Single-Flight Mutex* e timeout defensivo máximo de 2.000 ms.

---

## 2. Referências Documentais e Técnicas

1. **Especificação Normativa Aprovada:** `docs/planejamento/expiracao-orcamentos-plan-v2.0.md`
2. **Relatório Técnico de Implementação:** `docs/implementacao/bloco-d-implementation-report-v1.0.md`
3. **Migration de Infraestrutura Estática (Fase A1):** `supabase/migrations/20261006000000_expiracao_orcamentos_autonoma.sql`
4. **Scripts Operacionais do Ciclo de Vida:**
   - Pré-Condições (Fase A2): `scripts/cron/preflight-a2.sql`
   - Ativação do Job (Fase B): `scripts/cron/ativar-cron-b.sql`
   - Pós-Validação (Fase C): `scripts/cron/pos-validacao-c.sql`
5. **Modelo Físico:** `docs/modelo-fisico-v1.1.md` (preservado sem alterações)

---

## 3. Resumo da Implementação

A implementação foi construída rigorosamente dentro dos padrões arquiteturais do projeto:
- **Domínio:** Entidade canônica `Orcamento` com o método soberano `Orcamento.verificarExpiracao(dataReferencia)` mantido 100% intacto.
- **Aplicação:** Caso de uso `ExpirarOrcamentosVencidosUseCase` com controle de concorrência local (*Single-Flight Mutex*) e timeout de 2.000 ms.
- **Apresentação:** Hook `useOrcamentos` executando o disparo assíncrono em background após renderizar a lista, sem bloquear a interface de usuário.
- **Infraestrutura e Banco:** 
  - Extensão `pg_cron` (v1.6.4);
  - Schema privado `app_private` blindado (`REVOKE ALL FROM PUBLIC, anon, authenticated`);
  - Função `app_private.executar_expiracao_orcamentos()` (`SECURITY DEFINER`, `search_path = ''`, set-based UPDATE em `public.orcamento`);
  - Tabela `app_private.expiracao_execucao_log` para observabilidade funcional;
  - RPC por tenant `public.expirar_meus_orcamentos_rpc()` (`SECURITY INVOKER`, escopo estrito em `auth.uid()`).

---

## 4. Matriz dos Critérios Obrigatórios de Homologação

Todos os 20 critérios obrigatórios definidos no processo de homologação foram submetidos a validação empírica real no ambiente:

| # | Critério de Homologação | Descrição Técnica / Alvo | Evidência Coletada | Status |
| :---: | :--- | :--- | :--- | :---: |
| 1 | **RF67** | ENVIADO vencido transiciona automaticamente para EXPIRADO | Disparo real pelo daemon pg_cron atualizou status | **PASS** |
| 2 | **RN69** | EM_ANALISE vencido transiciona para EXPIRADO | Testado via suíte de integração no PostgreSQL | **PASS** |
| 3 | **RF68** | RASCUNHO com data vencida nunca expira | Testes de domínio e banco comprovaram preservação | **PASS** |
| 4 | **RN70** | RASCUNHO isolado de qualquer expiração temporal | Avaliação de predicado excluiu status RASCUNHO | **PASS** |
| 5 | **RN61-RN65** | Regras de integridade e transições comerciais válidas | Preservadas em testes de unidade e use cases | **PASS** |
| 6 | **RN71** | APROVADO, RECUSADO, CANCELADO, CONCLUIDO inalterados | Estados finais mantidos mesmo com datas vencidas | **PASS** |
| 7 | **Função Server-Side** | Execução privilegiada autônoma via PL/pgSQL | `app_private.executar_expiracao_orcamentos()` testada | **PASS** |
| 8 | **Segurança** | Bloqueio de papéis não autorizados na função privada | `anon` e `authenticated` recebem `insufficient_privilege` | **PASS** |
| 9 | **Tenant RPC** | RPC restrita estritamente ao `auth.uid()` | Tenant A não afeta Tenant B; anon rejeitado com 28000 | **PASS** |
| 10 | **Idempotência** | Segunda execução consecutiva afeta zero linhas | Linhas afetadas = 0 na segunda chamada | **PASS** |
| 11 | **Concorrência** | Transição comercial simultânea não é sobrescrita (EPQ) | Reavaliação Read Committed preserva novo status comercial | **PASS** |
| 12 | **Recuperação** | Vencidos acumulados em períodos sem ciclo são processados | Predicado retroativo `< data_corte` processa todo o passivo | **PASS** |
| 13 | **Scheduler Real** | Daemon pg_cron dispara a função de forma autônoma | Execução confirmada no worker background (`job_pid 4855`) | **PASS** |
| 14 | **App Fechado** | Expiração ocorre sem qualquer instância mobile ou chamada | Metro/Expo desligados, sem RPC/JWT de cliente | **PASS** |
| 15 | **Evidência cron.job_run_details** | Registro detalhado do disparo do scheduler | Linha gravada com status `succeeded`, return `1 row` | **PASS** |
| 16 | **Evidência Log Funcional** | Log gravado em `app_private.expiracao_execucao_log` | Registro gravado com `sucesso = true`, `duracao_ms = 2` | **PASS** |
| 17 | **RNF12 sob Carga Representativa** | Desempenho do UPDATE medido em 10k, 100k e 1M registros | 10k: 27 ms \| 100k: 219 ms \| 1M: 3.043 ms (< 5.000 ms) | **PASS** |
| 18 | **Regressão Global** | Toda a suíte existente continua íntegra | 184/184 pgTAP; 100% testes TypeScript aprovados | **PASS** |
| 19 | **Typecheck** | Compilação estática rigorosa do TypeScript | `npm run typecheck` e `test:typecheck` retornam código 0 | **PASS** |
| 20 | **Modelo Físico v1.1 Preservado** | Nenhuma alteração estrutural nas tabelas de negócio | Zero colunas alteradas; nenhum índice extra criado | **PASS** |

---

## 5. Evidência Empírica do pg_cron Real (Scheduler Daemon)

O teste central exigido pelo protocolo de homologação consistiu em validar a execução direta pelo daemon de background do PostgreSQL, sem simulação manual via `SELECT app_private.executar_expiracao_orcamentos();`.

### Procedimento Executado
1. Um orçamento real foi inserido na tabela `public.orcamento` com id `11111111-2222-3333-4444-555555555555`, `status = 'ENVIADO'` e `data_validade = '2026-10-05'` (ontem em relação à data de corte `2026-10-06`).
2. Foi verificado que nenhuma instância do Expo / React Native ou processo cliente estava ativo no host ou no emulador Android.
3. Foi criado um job acelerado no `pg_cron` com frequência `* * * * *` (Job ID: `8`).
4. O processo aguardou o alinhamento de minuto do relógio do servidor até o disparo do daemon.
5. O worker launcher do `pg_cron` disparou o processo em background `job_pid = 4855`.

### Registro em `cron.job_run_details`
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

### Registro em `app_private.expiracao_execucao_log`
```json
{
  "id": 86,
  "executado_em": "2026-10-06T03:27:00.025036+00:00",
  "data_corte": "2026-10-06",
  "linhas_afetadas": 1,
  "duracao_ms": 2,
  "sucesso": true,
  "origem": "SCHEDULER",
  "mensagem_erro": null
}
```

### Transição de Estado Confirmada no Banco
```text
Antes:  { id: '11111111-2222-3333-4444-555555555555', status: 'ENVIADO',  data_validade: '2026-10-05' }
Depois: { id: '11111111-2222-3333-4444-555555555555', status: 'EXPIRADO', data_validade: '2026-10-05' }
```

### Limpeza e Confirmação do Job Definitivo
O job temporário 8 foi removido (`cron.unschedule(8)`). A tabela `cron.job` contém exclusivamente o job definitivo de produção:
```text
 jobid | schedule  |                       command                       | database | username | active |            jobname            
-------+-----------+-----------------------------------------------------+----------+----------+--------+-------------------------------
     9 | 1 3 * * * | SELECT app_private.executar_expiracao_orcamentos(); | postgres | postgres | t      | job_expirar_orcamentos_diario
```

---

## 6. Evidência de App Fechado

Durante toda a janela de teste do scheduler:
- Processos de desenvolvimento do Expo (`expo start`, `node` com metro bundler) permaneceram desligados (PIDs finalizados e verificados via PowerShell `Get-Process`).
- Nenhuma chamada HTTP/REST foi recebida pelo PostgREST com autenticação de usuário móvel.
- Nenhuma RPC foi disparada pelo cliente móvel.
- A transição ocorreu de forma 100% autônoma dentro do cluster PostgreSQL.

---

## 7. Evidência de Desempenho e RNF12 (Carga Representativa)

Para não limitar a validação a tabelas de teste com poucas tuplas, o comando `UPDATE` da função foi submetido a baterias de benchmark real com volumes representativos de **10.000**, **100.000** e **1.000.000** de orçamentos populados em banco real:

### 1. Bateria 10.000 Registros (1.000 Vencidos Atualizados)
- **Plano Adotado:** Index Scan utilizando `idx_orcamento_status`
- **Planning Time:** 0,199 ms
- **Execution Time:** **27,676 ms**
- **Buffers:** shared hit = 22.023, dirtied = 20, written = 20

### 2. Bateria 100.000 Registros (10.000 Vencidos Atualizados)
- **Plano Adotado:** Index Scan utilizando `idx_orcamento_status`
- **Planning Time:** 0,191 ms
- **Execution Time:** **219,007 ms** (~0,22 segundos)
- **Buffers:** shared hit = 184.802, dirtied = 195, written = 195

### 3. Bateria 1.000.000 Registros (100.000 Vencidos Atualizados)
- **Plano Adotado:** Bitmap Index Scan em `idx_orcamento_status` + Bitmap Heap Scan em `orcamento`
- **Planning Time:** 0,621 ms
- **Execution Time:** **3.043,272 ms** (~3,04 segundos)
- **Buffers:** shared hit = 1.893.868, read = 40.779, dirtied = 47.335, written = 33.185

### Avaliação do SLO e RNF12
- O limite máximo estipulado pelo SLO é de **5.000 ms** (5 segundos).
- Mesmo sob a carga extrema de **1 milhão de orçamentos**, a operação foi concluída em **3,04 segundos**, cumprindo o SLO com mais de 39% de margem.
- Na carga esperada em regime normal de operação (10.000 a 100.000 orçamentos), a execução ocorre entre **27 ms e 219 ms**.
- **Decisão sobre Índices:** Como o PostgreSQL utilizou naturalmente o índice `idx_orcamento_status` já homologado no Modelo Físico v1.1 e os tempos cumpriram o RNF12 com ampla folga, **nenhum índice adicional foi adicionado**, preservando a simplicidade e a integridade do modelo de dados.

---

## 8. Evidência de Concorrência e Read Committed (EPQ)

- **Cenário:** Orçamento em `ENVIADO` e vencido. Uma transação concorrente altera seu estado para `APROVADO` e executa `COMMIT`. Concomitantemente, a rotina de expiração é acionada.
- **Mecanismo:** Sob o nível de isolamento `READ COMMITTED`, o mecanismo nativo *EvalPlanQual* (EPQ) do PostgreSQL reavalia o predicado `WHERE status IN ('ENVIADO', 'EM_ANALISE')`.
- **Resultado:** Como a linha comitada passou a ser `APROVADO`, o predicado rejeita a linha e a expiração afeta 0 tuplas. O estado comercial aprovado pelo cliente nunca é sobrescrito.
- **Resultado do Teste:** **PASS** (Zero perda de transição comercial).

---

## 9. Evidência de Recuperação Retroativa

- **Cenário:** Orçamentos acumulados com datas de vencimento em 2, 5 e 10 dias no passado em decorrência de simulação de parada do daemon.
- **Resultado:** A execução subsequente utilizou o predicado estrito `data_validade < v_data_corte`, localizando e transicionando 100% dos orçamentos vencidos em uma única passagem set-based atômica.
- **Resultado do Teste:** **PASS** (Sem necessidade de replays ou filas adicionais).

---

## 10. Evidência de Segurança e Isolamento

- **Tentativa de Execução por `anon`:** Rejeitada pelo PostgreSQL com erro de permissão insuficiente (`insufficient_privilege`).
- **Tentativa de Execução por `authenticated`:** Rejeitada pelo PostgreSQL com erro de permissão insuficiente (`insufficient_privilege`).
- **RPC `expirar_meus_orcamentos_rpc()`:** 
  - Executada sem JWT de autenticação: rejeitada com código `28000` (`Não autenticado`).
  - Executada com JWT do Tenant A: atualiza estritamente os orçamentos de `usuario_id = auth.uid()`. Orçamentos vencidos de outros tenants no mesmo banco não são modificados.
- **Resultado do Teste:** **PASS**.

---

## 11. Resultado dos Testes de Regressão Global

Toda a suíte do projeto foi reexecutada após as provas empíricas:

- **pgTAP Completo:** 9 suítes, 184 asserções, **0 falhas** (`PASS`).
- **Suíte TypeScript de Domínio e PDF:** 6/6 testes aprovados (`PASS`).
- **Módulo Clientes:** 27/27 testes aprovados (`PASS`).
- **Módulo Catálogo:** 42/42 testes aprovados (`PASS`).
- **Módulo Áreas e Mapas:** 24/24 testes aprovados (`PASS`).
- **Módulo PDF:** 17/17 testes aprovados (`PASS`).
- **Módulo Compartilhamento:** 40/40 testes aprovados (`PASS`).
- **Módulo Orçamentos Geral:** 53/53 testes aprovados (`PASS`).
- **Suíte Bloco D (v2.0):** 25/25 testes aprovados (`PASS`).
- **Typecheck do Projeto (`tsc --noEmit`):** 0 erros (`PASS`).
- **Typecheck de Testes (`tsc --project tsconfig.test.json --noEmit`):** 0 erros (`PASS`).

---

## 12. Estado Final do Modelo Físico

O **Modelo Físico v1.1** permanece rigorosamente idêntico ao estado homologado anterior:
- Nenhuma coluna nova foi adicionada a `public.orcamento`.
- Nenhuma alteração foi introduzida nas tabelas `cliente`, `servico`, `produto`, `area` ou `item_orcamento`.
- Nenhum novo índice foi adicionado, tendo sido comprovado que os índices existentes atendem plenamente ao RNF12.

---

## 13. Limitações e Observações Operacionais

1. **Deployment Cloud:** A implantação no Supabase Cloud deverá seguir o roteiro aprovado de quatro estágios (A1: migration estática -> A2: `preflight-a2.sql` -> Gate -> B: `ativar-cron-b.sql` -> C: `pos-validacao-c.sql`).
2. **Defesa JIT:** O mecanismo JIT do cliente é uma defesa em profundidade e só expira orçamentos do próprio tenant mediante acesso com autenticação válida. A autoridade primária e universal continua sendo o job diário do `pg_cron`.

---

## 14. Decisão Formal

Com base nas evidências empíricas coletadas no ambiente real, no disparo autônomo comprovado do daemon do `pg_cron`, no cumprimento comprovado de RF67 com o aplicativo fechado, na integridade mantida dos estados de negócio e do Modelo Físico v1.1, e na aprovação de 100% da suíte de regressão global:

### Decisão:
**HOMOLOGADO**

> **“Bloco D — Expiração Temporal Automática de Orçamentos — HOMOLOGADO.”**
