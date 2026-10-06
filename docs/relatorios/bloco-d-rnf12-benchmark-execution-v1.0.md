# Relatório Técnico de Execução do Benchmark RNF12 — Bloco D v1.0
## Avaliação de Desempenho Sob Carga Representativa (Resolução de AUDIT-D-01)

**Projeto:** `jardinagem-app`  
**Referência Normativa:** `docs/planejamento/expiracao-orcamentos-plan-v2.0.md`  
**Apontamento Auditado:** `AUDIT-D-01 — MAJOR`  
**Script Executável:** `scripts/cron/benchmark-representativo-rnf12.ts`  
**Data:** 2026-10-06  
**Status:** `BENCHMARK RNF12 CORRIGIDO E REEXECUTADO — AGUARDANDO AUDITORIA TÉCNICA FINAL`

---

## 1. Identificação e Contexto

Durante a auditoria técnica independente da homologação do Bloco D, foi apontada a não conformidade `AUDIT-D-01`:
1. **Ausência de ANALYZE pós-carga:** O benchmark representativo anterior inseria os registros e chamava `EXPLAIN (ANALYZE, BUFFERS)` diretamente, operando sob estatísticas defasadas do otimizador de consultas do PostgreSQL.
2. **Defeito na distribuição da massa:** A fórmula determinística anterior gerava registros `EM_ANALISE` apenas com datas futuras, impedindo a medição representativa de orçamentos `EM_ANALISE` vencidos em conjunto com `ENVIADO`.

O presente relatório registra a correção metodológica completa do benchmark, a reexecução estrita nos três volumes estipulados (**10.000**, **100.000** e **1.000.000** de registros) e a coleta das evidências empíricas auditáveis.

---

## 2. Metodologia do Benchmark

O script `scripts/cron/benchmark-representativo-rnf12.ts` foi reestruturado para seguir um fluxo transacional estritamente isolado para cada volume avaliado:

```
[ BEGIN Transação ]
         │
         ▼
[ Inserção Determinística (g % 20) compatível com schema real ]
         │
         ▼
[ ANALYZE public.orcamento (Atualização formal das estatísticas do Planner) ]
         │
         ▼
[ EXPLAIN (BUFFERS, FORMAT JSON) UPDATE ... (Inspeção estática do plano) ]
         │
         ▼
[ EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) SELECT app_private.executar_expiracao_orcamentos() ]
         │
         ▼
[ Captura de Métricas do Log Funcional e Contagem Pós-Execução ]
         │
         ▼
[ Verificação de Assertivas Determinísticas (Alvos, Linhas Afetadas, Não-Alvos) ]
         │
         ▼
[ ROLLBACK (Descarte total dos dados sintéticos) ]
```

---

## 3. Regra Determinística da Massa de Testes (`g % 20`)

Para garantir determinismo absoluto, reprodutibilidade e conformidade com o schema real de `public.orcamento`, a distribuição dos dados sintéticos gerados via `generate_series(1, volume) g` adotou a regra formal baseada no operador módulo `g % 20`:

| Posição / Módulo | Status | Condição Temporal | Classificação no Teste | Percentual |
| :---: | :--- | :--- | :--- | :---: |
| `g % 20 = 0` | `ENVIADO` | `v_data_corte - INTERVAL '2 days'` | **Alvo de Expiração (Vencido)** | **5%** |
| `g % 20 = 1` | `EM_ANALISE` | `v_data_corte - INTERVAL '2 days'` | **Alvo de Expiração (Vencido)** | **5%** |
| `g % 20 = 2` | `ENVIADO` | `v_data_corte + INTERVAL '5 days'` | Não-Alvo (Vigente/Futuro) | 5% |
| `g % 20 = 3` | `EM_ANALISE` | `v_data_corte + INTERVAL '5 days'` | Não-Alvo (Vigente/Futuro) | 5% |
| `g % 20 IN (4, 5, 6, 7)` | `RASCUNHO` | `v_data_corte - INTERVAL '2 days'` | Não-Alvo (RF68/RN70) | 20% |
| `g % 20 IN (8, 9, 10, 11)` | `APROVADO` | `v_data_corte - INTERVAL '2 days'` | Não-Alvo (RN71 - Terminal) | 20% |
| `g % 20 IN (12, 13, 14)` | `RECUSADO` | `v_data_corte - INTERVAL '2 days'` | Não-Alvo (RN71 - Terminal) | 15% |
| `g % 20 IN (15, 16, 17)` | `CANCELADO` | `v_data_corte - INTERVAL '2 days'` | Não-Alvo (RN71 - Terminal) | 15% |
| `g % 20 IN (18, 19)` | `CONCLUIDO` | `v_data_corte - INTERVAL '2 days'` | Não-Alvo (RN71 - Terminal) | 10% |

**Resumo da Regra Determinística:**
- **Total Alvos:** Exatamente **10%** do volume total (5% `ENVIADO` vencido + 5% `EM_ANALISE` vencido).
- **Total Não-Alvos:** Exatamente **90%** do volume total (10% vigentes + 80% em estados não expiráveis).

---

## 4. Confirmação Explícita do ANALYZE Antes de Cada EXPLAIN

Em estrita conformidade com a determinação `AUDIT-D-01`, a execução do comando:
```sql
ANALYZE public.orcamento;
```
foi posicionada explicitamente dentro do bloco transacional de cada cenário, ocorrendo **após** o preenchimento da massa sintética e **antes** de qualquer chamada a `EXPLAIN` ou execução da rotina. Isso garantiu que o otimizador de consultas operasse com a densidade, estatísticas de tuplas e seletividade de índices perfeitamente sincronizadas com o volume real carregado.

---

## 5. Resultados Detalhados por Volume

### 5.1. Cenário 1: 10.000 Registros

- **Alvos Determinísticos Esperados:**
  - `ENVIADO` vencido (5%): 500
  - `EM_ANALISE` vencido (5%): 500
  - Total Esperado: **1.000**
- **Plano Observado:**
  - Operação Externa: `Result` (chamada a `app_private.executar_expiracao_orcamentos()`)
  - Plano Interno do UPDATE: `ModifyTable [Seq Scan]`
- **Métricas Observadas:**
  - **Planning Time:** **0,007 ms**
  - **Execution Time:** **20,783 ms**
  - **Buffers Compartilhados:** `Hit = 30.466`, `Read = 28`, `Dirtied = 26`, `Written = 17`
- **Validação Pós-Execução na Tabela:**
  - `total_expirados`: **1.000** (exatamente igual aos 1.000 alvos)
  - `enviado_restantes` (futuros): **500** (100% preservados)
  - `em_analise_restantes` (futuros): **500** (100% preservados)
  - `demais_estados` (`RASCUNHO`, `APROVADO`, `RECUSADO`, `CANCELADO`, `CONCLUIDO`): **8.000** (100% preservados)
  - Linhas afetadas registradas no log: **1.000**
- **Status do Cenário:** **PASS** (dentro do SLO de 5.000 ms com margem de 99,5%)

---

### 5.2. Cenário 2: 100.000 Registros

- **Alvos Determinísticos Esperados:**
  - `ENVIADO` vencido (5%): 5.000
  - `EM_ANALISE` vencido (5%): 5.000
  - Total Esperado: **10.000**
- **Plano Observado:**
  - Operação Externa: `Result`
  - Plano Interno do UPDATE: `ModifyTable [Bitmap Heap Scan]` (utilizando o índice `idx_orcamento_status`)
- **Métricas Observadas:**
  - **Planning Time:** **0,006 ms**
  - **Execution Time:** **227,689 ms** (~0,23 segundos)
  - **Buffers Compartilhados:** `Hit = 304.127`, `Read = 132`, `Dirtied = 305`, `Written = 173`
- **Validação Pós-Execução na Tabela:**
  - `total_expirados`: **10.000** (exatamente igual aos 10.000 alvos)
  - `enviado_restantes` (futuros): **5.000** (100% preservados)
  - `em_analise_restantes` (futuros): **5.000** (100% preservados)
  - `demais_estados`: **80.000** (100% preservados)
  - Linhas afetadas registradas no log: **10.000**
- **Status do Cenário:** **PASS** (dentro do SLO de 5.000 ms com margem de 95,4%)

---

### 5.3. Cenário 3: 1.000.000 Registros

- **Alvos Determinísticos Esperados:**
  - `ENVIADO` vencido (5%): 50.000
  - `EM_ANALISE` vencido (5%): 50.000
  - Total Esperado: **100.000**
- **Plano Observado:**
  - Operação Externa: `Result`
  - Plano Interno do UPDATE: `ModifyTable [Bitmap Heap Scan]` (utilizando o índice `idx_orcamento_status`)
- **Métricas Observadas:**
  - **Planning Time:** **0,007 ms**
  - **Execution Time:** **2.807,413 ms** (~2,81 segundos)
  - **Buffers Compartilhados:** `Hit = 2.978.204`, `Read = 63.626`, `Dirtied = 44.128`, `Written = 44.321`
- **Validação Pós-Execução na Tabela:**
  - `total_expirados`: **100.000** (exatamente igual aos 100.000 alvos)
  - `enviado_restantes` (futuros): **50.000** (100% preservados)
  - `em_analise_restantes` (futuros): **50.000** (100% preservados)
  - `demais_estados`: **800.000** (100% preservados)
  - Linhas afetadas registradas no log: **100.000**
- **Status do Cenário:** **PASS** (dentro do SLO de 5.000 ms com margem de 43,8%)

---

## 6. Tabela Consolidada de Evidências

| Volume Avaliado | Alvos Esperados | Linhas Afetadas | Plano UPDATE Pós-ANALYZE | Planning Time | Execution Time | SLO (< 5.000 ms) | Status |
| :---: | :---: | :---: | :--- | :---: | :---: | :---: | :---: |
| **10.000** | 1.000 | 1.000 | `ModifyTable [Seq Scan]` | 0,007 ms | **20,783 ms** | **PASS** | **PASS** |
| **100.000** | 10.000 | 10.000 | `ModifyTable [Bitmap Heap Scan]` | 0,006 ms | **227,689 ms** | **PASS** | **PASS** |
| **1.000.000** | 100.000 | 100.000 | `ModifyTable [Bitmap Heap Scan]` | 0,007 ms | **2.807,413 ms** | **PASS** | **PASS** |

---

## 7. Isolamento e Integridade do Banco

Ao término da bateria dos três volumes, foi verificado que o mecanismo transacional `ROLLBACK` descartou integralmente a massa sintética:
```sql
SELECT count(*) FROM public.orcamento WHERE numero LIKE 'BENCH-%';
-- Resultado: 0
```
Nenhum registro sintético poluiu o banco de dados e nenhuma alteração foi persistida.

---

## 8. Conclusão Limitada aos Dados Demonstrados

Com base estritamente nos dados observados durante a execução do teste:

1. **Atualização Estatística:** Com a execução explícita de `ANALYZE public.orcamento`, o otimizador de consultas adaptou seu plano conforme o volume: optou por `Seq Scan` em volumes menores (10.000 tuplas) e utilizou `Bitmap Heap Scan` apoiado no índice preexistente `idx_orcamento_status` para volumes a partir de 100.000 tuplas.
2. **Representatividade de Regra:** A inclusão equilibrada de 5% de `ENVIADO` vencido e 5% de `EM_ANALISE` vencido comprovou que ambos os estados são identificados e atualizados pelo predicado da função sem desvios ou omissões.
3. **Comportamento Temporal:** Em todos os volumes avaliados sob as condições do ambiente de teste, o tempo total de execução permaneceu abaixo do limite de 5.000 ms definido como SLO, registrando **20,78 ms** (10k), **227,69 ms** (100k) e **2.807,41 ms** (1M).
4. **Preservação Estrutural:** Não houve necessidade de introdução de novos índices nem alteração do Modelo Físico v1.1 para o alcance destes resultados.

---

## 9. Status Final

**BENCHMARK RNF12 CORRIGIDO E REEXECUTADO — AGUARDANDO AUDITORIA TÉCNICA FINAL**
