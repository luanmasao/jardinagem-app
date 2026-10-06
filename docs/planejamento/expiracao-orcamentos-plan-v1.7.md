# Planejamento Técnico — Bloco D: Expiração Temporal Automática de Orçamentos (v1.7)

**Projeto:** Sistema de Orçamento para Jardinagem (`jardinagem-app`)  
**Data:** 05 de Outubro de 2026  
**Responsável Técnico:** Planejador Técnico Principal / Arquiteto de Software  
**Status do Documento:** `PLANEJAMENTO EM REVISÃO — BLOCO D v1.7 — AGUARDANDO NOVA AUDITORIA`  
**Referência Canônica do Inventário:** `docs/planejamento/requisitos-cobertura-status-v1.2.md`  
**Histórico de Governança:** Revisão normativa saneando os apontamentos ACHADO-EXP-40 a ACHADO-EXP-43 da Auditoria Técnica Independente da v1.6, preservando integralmente todas as correções anteriores (ACHADO-EXP-29 a ACHADO-EXP-39)  
**Requisitos Alvo:** RF67, RN69 (preservando integralmente RF68, RN70, RN61 a RN65, RN71, RNF12, RNF16, RNF34 e RNF35)  

---

## 1. Identificação e Status

- **Identificador do Bloco:** Bloco D — Expiração Temporal Automática de Orçamentos
- **Versão do Planejamento:** 1.7 (Árvore Decisória Total e Determinística de Benchmark, Governança Estrita de Roles Local vs. Cloud, Hierarquia Normativa Canônica de Timezone GMT/UTC e Reprodutibilidade Estatística por Seed e Checksum)
- **Data de Emissão:** 05/10/2026
- **Status Canônico:** `PLANEJAMENTO EM REVISÃO — BLOCO D v1.7 — AGUARDANDO NOVA AUDITORIA`
- **Escopo Normativo:** Planejar de forma exaustiva e auditável a orquestração e persistência autônomas para expiração de orçamentos com validade ultrapassada, garantindo conformidade literal com RF67 e RN69 sem depender da abertura do aplicativo móvel, com segurança estrita em funções privilegiadas, prova formal de concorrência, equivalência canônica de regras e governança transparente sobre persistência e modelo físico.

---

## 2. Histórico das Revisões e Apontamentos de Auditoria

### 2.1. Rejeição da Versão v1.0
A versão preliminar v1.0 foi reprovada em 05/10/2026 ([`docs/planejamento/expiracao-orcamentos-plan-audit-v1.0.md`](file:///c:/Users/luanh/Documents/jardinagem-app/docs/planejamento/expiracao-orcamentos-plan-audit-v1.0.md)) devido à dependência exclusiva de abertura do aplicativo (*Just-in-Time* puro), carga desnecessária de PostGIS e ausência de motor autônomo com o app fechado (ACHADO-EXP-01 a 07).

### 2.2. Apontamentos da Revisão v1.1
A versão preliminar v1.1 introduziu o motor autônomo no PostgreSQL (`pg_cron`), mas identificou a necessidade de isolamento em schema privado (`app_private`), `search_path` vazio, eliminação de estimativas arbitrárias de tempo e provas de concorrência (ACHADO-EXP-08 a 15).

### 2.3. Apontamentos da Revisão v1.2
A versão v1.2 estruturou as camadas de segurança e a RPC com `SECURITY INVOKER`, mas demandou aprofundamento na indexação parcial para cargas mistas (global vs. tenant), desenho de testes do scheduler e definição de SLA operacional (ACHADO-EXP-16 a 20).

### 2.4. Apontamentos da Revisão v1.3
A versão v1.3 corrigiu premissas de indexação preliminares, mas assumiu incorretamente cláusulas de schema inexistentes no `pg_cron`, dependência conceitual de workers, falta de idempotência por chamadas cegas a unschedule e mistura de observabilidade do libpq (ACHADO-EXP-21 a 28).

### 2.5. Apontamentos da Revisão v1.4 (Saneados na v1.5)
A versão v1.4 abordou transporte e DDL, e foi saneada na v1.5 em 6 achados formais:
- **ACHADO-EXP-29:** Cadeia de privilégios de roles fechada sob `postgres`;
- **ACHADO-EXP-30:** Desacoplamento transacional do log, eliminando falsos rollbacks de observabilidade;
- **ACHADO-EXP-31:** Constatação empírica de `cron.timezone = GMT`;
- **ACHADO-EXP-32:** Benchmark reprodutível encapsulado em transações com `ROLLBACK`;
- **ACHADO-EXP-33:** Precisão terminológica entre `RowExclusiveLock` (table-level) e row-level locks de tupla;
- **ACHADO-EXP-34:** Fidelidade do predicado temporal no benchmark com `America/Sao_Paulo`.

### 2.6. Apontamentos da Revisão v1.5 (Saneados na v1.6)
A versão v1.5 foi aprofundada na v1.6 em 5 pontos normativos:
- **ACHADO-EXP-35:** `cron.timezone` transformado em pré-condição formal de deployment com asserção procedural;
- **ACHADO-EXP-36:** Separação estrita entre benchmark de plano SQL interno e testes de integração da RPC/RLS;
- **ACHADO-EXP-37:** Semântica rigorosa de recuperação após indisponibilidade (Opção 1 adotada, sem presunção de replay);
- **ACHADO-EXP-38:** Critério objetivo prévio de escolha do índice;
- **ACHADO-EXP-39:** Teste de correlação temporal formulado sob janela de tolerância de SLO, sem igualdade exata.

### 2.7. Apontamentos Mandatórios da Auditoria v1.6 a Serem Sanados nesta v1.7
A auditoria independente da versão v1.6 apontou 4 necessidades técnicas e de governança formais que motivam a emissão da presente versão normativa v1.7:
- **ACHADO-EXP-40 (MAJOR — Regra Decisória do Benchmark Incompletamente Ordenada):** A v1.6 citava "Execution Time + Buffers" sem uma ordenação estrita para situações em que uma opção apresente menor tempo e maior consumo de buffers. A v1.7 deve formalizar uma árvore decisória matematicamente total e determinística, com tolerâncias explícitas ($\le 5\%$), critérios sequenciais de desempate e regra de consolidação ponderada entre volumes;
- **ACHADO-EXP-41 (MAJOR — Governança de Evidência da Cadeia de Roles no Supabase Cloud):** A v1.6 tratava a cadeia de roles do Supabase Cloud com as mesmas certezas do container local. A v1.7 deve segregar formalmente *Fato Observado Local*, *Fato Observado Cloud*, *Política Normativa de Deployment* e *Hipótese Não Validada*, adotando a Opção B: classificar formalmente a cadeia Cloud como hipótese condicionada a uma pré-condição mandatória de auditoria no primeiro deployment;
- **ACHADO-EXP-42 (MINOR — Ambiguidade Normativa entre GMT e UTC):** A v1.6 aceitava `IN ('GMT', 'UTC')` sem fixar uma hierarquia normativa. A v1.7 deve definir uma representação canônica única (`cron.timezone = 'GMT'`, valor empiricamente observado) e classificar formalmente `'UTC'` como alias funcional aceito devido à identidade exata de offset (`+00:00`);
- **ACHADO-EXP-43 (MINOR — Reprodutibilidade Estatística e Metodológica do Dataset):** Fortalecer o protocolo de benchmark com mecanismo explícito de reprodutibilidade lógica da massa de dados via seed determinística (`setseed`), script de distribuição parametrizado e checksum de integridade do dataset de entrada.

---

## 3. Objetivo do Bloco D

Planejar uma arquitetura robusta, matematicamente verificável e em 4 camadas que atenda integralmente a RF67 e RN69 através de:
1. **Autonomia do Scheduler com SLO Operacional Alvo:** Transição automática de orçamentos vencidos via scheduler autônomo do banco (`pg_cron`) com horário programado às `00:01 BRT` (`03:01 GMT`) e SLO operacional alvo de conclusão até `00:15 BRT`, sem qualquer dependência da abertura do aplicativo móvel;
2. **Timezone Canônico com Pré-Condição Verificável:** Definição canônica estrita de `cron.timezone = 'GMT'` com asserção defensiva em tempo de migration que interrompe o deployment caso o fuso divirja;
3. **Árvore Decisória Total e Determinística de Indexação:** Regra matemática pré-fixada que resolve sem ambiguidades qualquer combinação de tempo, buffers, WAL e tamanho físico, consolidando os resultados de escala de forma ponderada;
4. **Governança Transparente de Roles (Local vs. Cloud):** Distinção rigorosa entre o ambiente local comprovado e o ambiente Cloud tratado como hipótese sob pré-condição formal de validação;
5. **Reprodutibilidade Estrita da Massa de Teste:** Protocolo de geração sintética governado por seed e checksum com transações atômicas revertidas por `ROLLBACK`;
6. **Desacoplamento Transacional de Observabilidade:** Proteção soberana da regra de negócio, impedindo que falhas em tabelas de auditoria revertam transições legítimas de orçamentos;
7. **Governança Controlada do Modelo Físico:** Preservação estrita da baseline congelada do Modelo Físico v1.1.

---

## 4. Requisitos Canônicos e Máquina de Estados

### 4.1. Requisitos Canônicos Vigentes
- **RF67:** *“O sistema deve identificar automaticamente a expiração de um orçamento ENVIADO ou EM_ANALISE quando sua data de validade for ultrapassada.”*
- **RF68 / RN70:** *“Um orçamento em RASCUNHO não deve ser marcado automaticamente como EXPIRADO.”*
- **RN69:** *“Um orçamento ENVIADO ou EM_ANALISE deve ser considerado EXPIRADO quando sua validade for ultrapassada.”*
- **RN61 a RN63:** Máquina de estados oficial e transições permitidas.
- **RN64 e RN65:** Edição direta permitida somente em `RASCUNHO`.
- **RN71:** Orçamentos finalizados (`CONCLUIDO`, `CANCELADO`, `RECUSADO`, `APROVADO`) são imutáveis e não podem transicionar para `EXPIRADO`.
- **RNF12:** Desempenho e tempo de resposta aceitável nas consultas.
- **RNF16:** Integridade referencial e consistência transacional do PostgreSQL.
- **RNF34 e RNF35:** Persistência segura, resiliência e tratamento de falhas.

### 4.2. Matriz Canônica de Estados e Comportamento na Expiração

| Estado Atual | Validade Ultrapassada? | Transição para `EXPIRADO`? | Justificativa Canônica |
| :---: | :---: | :---: | :--- |
| `RASCUNHO` | Sim ou Não | **NÃO** | RF68 e RN70 (Rascunho não expira) |
| `ENVIADO` | Sim ($ref > val$) | **SIM** | RF67 e RN69 |
| `EM_ANALISE` | Sim ($ref > val$) | **SIM** | RF67 e RN69 |
| `APROVADO` | Sim ou Não | **NÃO** | RN61, RN62 (Estado terminal comercial) |
| `RECUSADO` | Sim ou Não | **NÃO** | RN62 (Estado terminal) |
| `CANCELADO` | Sim ou Não | **NÃO** | RN62 (Estado terminal) |
| `CONCLUIDO` | Sim ou Não | **NÃO** | RN71 (Estado final imutável) |
| `EXPIRADO` | Sim ou Não | **NÃO** | Idempotente (estado já alcançado) |

---

## 5. Avaliação dos Achados da Auditoria da v1.6

### 5.1. ACHADO-EXP-40 (Regra Decisória do Benchmark Totalmente Ordenada)
- **Fato Observado:** A redação da v1.6 mencionava "Execution Time + Buffers" sem uma ordem matemática estrita caso a Opção A tivesse menor tempo e a Opção B consumisse menos buffers.
- **Decisão Arquitetural Proposta:** Não somar grandezas físicas heterogêneas (milissegundos com blocos de 8KB). A decisão adota uma **ordem lexicográfica total**:
  1. O *Execution Time* mediano ($T_{med}$) é a métrica primária absoluta. Diferenças superiores a $5\%$ decidem imediatamente o vencedor;
  2. Em caso de equivalência temporal ($\le 5\%$), a segunda métrica determinante é o consumo de *Buffers Totais* ($B_{tot}$);
  3. Sucessivos critérios formais de desempate são fixados para tamanho físico em disco, geração de WAL e equilíbrio composto com a query de tenant, culminando em uma escolha padrão determinística caso todas as métricas sejam equivalentes.

### 5.2. ACHADO-EXP-41 (Governança da Evidência de Roles Local vs. Cloud)
- **Fato Observado no Ambiente Local:** Container `supabase_db_jardinagem-app` opera com `current_user = postgres`, `session_user = postgres`, e `cron.job` registra `username = 'postgres'`.
- **Fato Observado no Supabase Cloud:** Nenhuma evidência direta foi coletada em ambiente Cloud remoto nesta fase de planejamento, visto que a infraestrutura Cloud não foi auditada localmente.
- **Decisão Arquitetural Proposta (Opção B):** Declarar formalmente que a identidade da role no Supabase Cloud constitui uma **hipótese de planejamento de deployment**. Estabelece-se uma pré-condição formal de auditoria obrigatória que deverá inspecionar e documentar a cadeia de roles na primeira execução remota antes da ativação do job.

### 5.3. ACHADO-EXP-42 (Hierarquia Normativa Canônica de Timezone GMT/UTC)
- **Fato Observado:** O PostgreSQL do projeto retorna `cron.timezone = 'GMT'`.
- **Decisão Arquitetural Proposta:**
  - **Valor Canônico Oficial:** `'GMT'`;
  - **Alias Funcional Tolerado:** `'UTC'`. Ambos possuem offset zero invariável (`+00:00`). Qualquer outro fuso viola a política temporal e aborta a migration.

### 5.4. ACHADO-EXP-43 (Reprodutibilidade Estatística e Integridade do Dataset)
- **Decisão Arquitetural Proposta:** A geração de dados sintéticos para o benchmark utilizará seed pseudoaleatória fixa (`pg_catalog.setseed(0.20261005)`), distribuição paramétrica com `generate_series` e validação por checksum (hash MD5 das tuplas de chave, status e validade), assegurando que qualquer repetição do benchmark avalie rigorosamente o mesmo universo de tuplas.

---

## 6. Avaliação de Alternativas Arquiteturais Autônomas

| Critério | Alternativa 1: PostgreSQL Nativo com `pg_cron` | Alternativa 2: Supabase Edge Function Agendada | Alternativa 3: Scheduler Externo (GitHub Actions / Cloud) |
| :--- | :--- | :--- | :--- |
| **Local de Execução** | Scheduler daemon interno do PostgreSQL | Deno Runtime (`edge_runtime`) | Servidor externo via Internet |
| **Frequência** | Diária (`03:01 GMT` = `00:01 BRT`) | Diária | Diária |
| **Mecanismo de Disparo** | Conexão local libpq gerenciada pelo daemon | Trigger HTTP agendado | Execução de runner externo |
| **Fonte Temporal** | Relógio transacional do PostgreSQL via `timezone()` | Runtime Deno (sujeito a desvios de host) | Host externo |
| **Segurança** | Role `postgres` em `app_private`. Sem tokens trafegados. | Exigiria token `service_role` via HTTP, violando regra do projeto. | Exigiria credencial privilegiada exposta fora do ambiente seguro. |
| **Dependência de Rede** | Nula (loopback interno na instância do PostgreSQL) | Média (chamada HTTP PostgREST) | Alta (Internet pública suscetível a timeout) |
| **Independência do App** | **Total (100% autônomo)** | **Total (100% autônomo)** | **Total (100% autônomo)** |
| **Veredito** | **SELECIONADA** | Descartada por violação de segurança | Descartada por acoplamento e risco operacional |

---

## 7. Estratégia Arquitetural Selecionada

Adota-se formalmente a **Estratégia Híbrida de Duplo Motor**:
1. **Motor Autônomo Primário (Backend / PostgreSQL — Mandatório):** Stored function privilegiada em schema privado `app_private`, orquestrada pelo agendador do `pg_cron` sob horário programado às `00:01 BRT` (`03:01 GMT`) e SLO operacional alvo de conclusão até `00:15 BRT`. É o mecanismo formalmente responsável pelo **atendimento literal de RF67 com o aplicativo fechado**;
2. **Motor Just-in-Time Complementar (Cliente / React Native — Defesa em Profundidade):** RPC segura `public.expirar_meus_orcamentos_rpc()` restrita a `auth.uid()`, com *Single-Flight Mutex* e timeout não-bloqueante no app móvel. Atua exclusivamente para cobrir acessos do usuário antes do término da janela de SLO do cron, ou como fallback em pipelines de teste de cliente.

---

## 8. Arquitetura em Camadas

```mermaid
graph TD
    subgraph Servidor_Supabase_PostgreSQL
        direction TB
        Scheduler[pg_cron Scheduler Daemon: cron.timezone=GMT] -->|Disparo Diario 03:01 GMT / 00:01 BRT| Transport[Sessao Local: libpq socket como postgres]
        Transport -->|Execucao Privilegiada| FuncPriv[app_private.executar_expiracao_orcamentos]
        FuncPriv -->|Single-Statement UPDATE: RowExclusiveLock + Row-Level Locks| Table[(public.orcamento)]
        FuncPriv -->|Auditoria Funcional Protegida: RAISE WARNING se falhar| LogTable[(app_private.expiracao_execucao_log)]
        Scheduler -.->|Autoridade Primaria de Falhas: status failed + return_message| CronDetails[(cron.job_run_details)]
        RPC[public.expirar_meus_orcamentos_rpc] -->|UPDATE Tenant-Scoped: SECURITY INVOKER| Table
    end

    subgraph Aplicativo_Movel
        direction TB
        UI[Telas /orcamentos e /orcamentos/:id] --> Hook[useOrcamentos]
        Hook --> Mutex[ExpiracaoMutex: Single-Flight]
        Mutex --> UC[ExpirarOrcamentosVencidosUseCase]
        UC --> Repo[SupabaseOrcamentoRepository]
        Repo -->|Chamada RPC Segura com Timeout 2000ms| RPC
    end
```

### Divisão de Responsabilidades:
- **Domínio (`src/domain`):** Define a regra de negócio canônica e imutável em `Orcamento.verificarExpiracao(dataReferencia)`;
- **Aplicação (`src/application`):** `ExpirarOrcamentosVencidosUseCase` gerencia o mutex em memória, cooldown e dispara a RPC sem bloquear a UI;
- **Infraestrutura (`src/infrastructure`):** Conecta à RPC via Supabase Client e disponibiliza a stored function privada e job de agendamento no PostgreSQL;
- **Apresentação (`src/presentation`):** Hook `useOrcamentos` exibe a listagem de forma reativa e não-bloqueante.

---

## 9. Política Temporal e Canonicalidade GMT (ACHADO-EXP-42 Sanado)

### 9.1. Definições Canônicas
- **Data Civil:** O ciclo de vida do orçamento baseia-se na data civil pura (`data_validade DATE`), sem fração horária;
- **Horário Comercial e Limite de Vigência:** Um orçamento com `data_validade = '2026-03-15'` permanece vigente até as `23:59:59.999 BRT` do dia 15/03/2026;
- **Fronteira de Expiração:** Às `00:00:00 BRT` do dia 16/03/2026, a data corrente avança para `2026-03-16`. O orçamento é legalmente expirado pois `2026-03-15 < 2026-03-16`;
- **Fuso Oficial de Negócio:** `America/Sao_Paulo` (UTC-3 fixo, Decreto nº 9.772/2019);
- **Timezone Canônico do Scheduler:** `'GMT'` (**Valor Canônico Obrigatório**);
- **Alias Operacional Aceito:** `'UTC'` (**Alias Funcional Tolerado**). Ambos compartilham o offset `+00:00` sem horário de verão. O agendamento `'1 3 * * *'` (03:01 GMT) equivale estritamente às `00:01 BRT`.

---

## 10. Timezone e Pré-Condição de Deployment

```sql
DO $$
DECLARE
    v_cron_tz pg_catalog.text;
BEGIN
    SELECT setting INTO v_cron_tz FROM pg_settings WHERE name = 'cron.timezone';

    -- Validação normativa: GMT canônico obrigatório ou UTC alias tolerado
    IF v_cron_tz IS NULL OR v_cron_tz NOT IN ('GMT', 'UTC') THEN
        RAISE EXCEPTION 'PRÉ-CONDIÇÃO DE DEPLOYMENT VIOLADA: cron.timezone deve ser GMT (canônico) ou UTC (alias tolerado). Encontrado: %. Deployment abortado.', v_cron_tz;
    END IF;
END;
$$;
```

---

## 11. SLO Operacional

1. **Horário Programado:** Diariamente às `00:01 BRT` (`03:01 GMT`);
2. **SLO Operacional Alvo:** Conclusão da rotina diária até `00:15 BRT`;
3. **Métricas Operacionais Mensuráveis:**
   - **Atraso de Disparo ($T_{disp}$):** $\text{start\_time} - \text{horário\_programado}$ (Alvo: $\le 60\text{ s}$);
   - **Duração da Execução ($T_{dur}$):** $\text{end\_time} - \text{start\_time}$ (Alvo: $\le 5\text{ s}$ para volumetria esperada);
   - **Conclusão Máxima:** $\text{end\_time} \le \text{00:15 BRT}$.
4. **Tratamento de Violações:**
   - Ocorrência de `status = 'failed'` em `cron.job_run_details`;
   - Ausência de registro de execução referente ao dia civil após `00:15 BRT`;
   - Registro concluído após `00:15 BRT`.

---

## 12. Recuperação após Indisponibilidade

O projeto formaliza a distinção inegociável entre:
- **Garantia de Correção Matemática dos Dados:** Propriedade assegurada pelo predicado cumulativo $\text{data\_validade} < \text{data\_corte}$;
- **Comportamento do Scheduler na Reinicialização:** Propriedade do motor `pg_cron`. **Não há garantia de replay imediato automático** de ticks perdidos quando o banco religa.

### Formalização dos 5 Cenários Operacionais

| Cenário Operacional | Comportamento do Scheduler | Estado dos Dados | Impacto no SLO | Ação de Mitigação |
| :--- | :--- | :--- | :--- | :--- |
| **1. Banco Disponível** | Dispara às `00:01 BRT`, conclui em $T_{dur} \le 5\text{ s}$. | Orçamentos do dia transicionados para `EXPIRADO`. | SLO Atendido ($\le 00:15$). | Nenhuma. Operação nominal. |
| **2. Indisponibilidade Curta (00:00 a 00:10)** | Se o tick `03:01 GMT` passou, o scheduler aguarda o próximo ciclo. | Orçamentos permanecem `ENVIADO`/`EM_ANALISE`. | SLO Violado (não concluiu no horário). | Disparo manual ou aguardo da próxima execução. |
| **3. Indisponibilidade Média (00:00 a 08:00)** | Banco retoma às 08:00. O scheduler não executa imediatamente; aguarda o próximo `03:01 GMT`. | Orçamentos vencidos aguardam processamento. | SLO do dia Violado. | Operador dispara rotina manual ou acesso do usuário via JIT expira o tenant pontualmente. |
| **4. Indisponibilidade Prolongada (Múltiplos Dias)** | Na retomada, o scheduler executa na primeira virada de dia subsequente. | Ao executar, o predicado retroativo processa **todos os orçamentos de todos os dias parados**. | Múltiplos SLOs violados, mas **Zero Inconsistência Residual**. | Disparo manual emergencial via `SELECT app_private.executar_expiracao_orcamentos();`. |
| **5. Acesso do Usuário Pós-Indisponibilidade** | O app móvel abre antes da recuperação do cron. | O motor JIT aciona `expirar_meus_orcamentos_rpc()`, transicionando os orçamentos do tenant. | SLO do cron indiferente; experiência do usuário preservada. | Defesa em profundidade atua com sucesso. |

---

## 13. Persistência e Atomicidade

### 13.1. DDL da Extensão e Schemas
```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE SCHEMA IF NOT EXISTS app_private;
REVOKE ALL ON SCHEMA app_private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA app_private TO postgres;

CREATE TABLE IF NOT EXISTS app_private.expiracao_execucao_log (
    id pg_catalog.bigserial PRIMARY KEY,
    executado_em pg_catalog.timestamptz NOT NULL DEFAULT pg_catalog.now(),
    data_corte pg_catalog.date NOT NULL,
    linhas_afetadas pg_catalog.int4 NOT NULL,
    duracao_ms pg_catalog.int4 NOT NULL,
    sucesso pg_catalog.bool NOT NULL,
    origem pg_catalog.text NOT NULL,
    mensagem_erro pg_catalog.text NULL
);

REVOKE ALL ON TABLE app_private.expiracao_execucao_log FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON TABLE app_private.expiracao_execucao_log TO postgres;
ALTER TABLE app_private.expiracao_execucao_log OWNER TO postgres;
```

### 13.2. Stored Function com Desacoplamento Transacional de Observabilidade
```sql
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
    v_data_corte := (pg_catalog.timezone('America/Sao_Paulo', pg_catalog.now()))::pg_catalog.date;

    UPDATE public.orcamento
    SET status = 'EXPIRADO'::public.status_orcamento
    WHERE status IN ('ENVIADO'::public.status_orcamento, 'EM_ANALISE'::public.status_orcamento)
      AND data_validade < v_data_corte;

    GET DIAGNOSTICS v_linhas_afetadas = ROW_COUNT;
    v_duracao_ms := pg_catalog.round(pg_catalog.extract(epoch FROM (pg_catalog.clock_timestamp() - v_inicio)) * 1000)::pg_catalog.int4;

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
            pg_catalog.now(),
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
        'executado_em', pg_catalog.now()
    );
END;
$$;

REVOKE ALL ON FUNCTION app_private.executar_expiracao_orcamentos() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION app_private.executar_expiracao_orcamentos() TO postgres;
ALTER FUNCTION app_private.executar_expiracao_orcamentos() OWNER TO postgres;
```

### 13.3. RPC Segura de Tenant
```sql
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
```

---

## 14. Governança de Roles: Fato Local vs. Hipótese Cloud (ACHADO-EXP-41 Sanado)

### 14.1. Matriz de Governança e Rastreabilidade de Privilégios

| Dimensão de Segurança | Fato Observado (Ambiente Local) | Hipótese de Deployment (Supabase Cloud) | Ação Obrigatória de Validação Cloud |
| :--- | :--- | :--- | :--- |
| **Role Executora da Migration** | `postgres` (comprovado via `SELECT current_user, session_user;`) | `postgres` (esperado via Supabase CLI `db push`) | Inspecionar `current_user` e `session_user` durante a execução remota. |
| **Owner da Stored Function** | `postgres` (comprovado via `ALTER FUNCTION ... OWNER TO postgres;`) | `postgres` | Auditar catálogo `pg_proc` no Cloud pós-migration. |
| **Role Criadora do Job** | `postgres` (comprovado durante execução da migration) | `postgres` | Auditar `cron.job` para confirmar username gravado. |
| **Username Persistido em `cron.job`** | `'postgres'` (comprovado: `cron.schedule()` grava `CURRENT_USER`) | `'postgres'` | Auditar coluna `username` em `cron.job`. |
| **Role que Executa o Job** | `'postgres'` (o daemon abre conexão autenticando como `cron.job.username`) | `'postgres'` | Confirmar execução técnica em `cron.job_run_details.username`. |
| **Role com Concessão `EXECUTE`** | `postgres` (`GRANT EXECUTE ... TO postgres;`) | `postgres` | Auditar `information_schema.routine_privileges`. |

### 14.2. Pré-Condição Mandatória de Auditoria no Primeiro Deployment Cloud (Opção B Adotada)
A cadeia de privilégios para o Supabase Cloud é formalmente classificada como **Hipótese de Deployment**. No primeiro deployment remoto, a ativação do Bloco D exige execução obrigatória de checklist de validação em produção antes de declarar a conformidade operacional do scheduler.

---

## 15. Idempotência do Scheduler

```sql
DO $$
DECLARE
    v_target_user pg_catalog.text := 'postgres';
    v_jobid pg_catalog.bigint;
    v_qtd pg_catalog.int4;
BEGIN
    IF CURRENT_USER <> v_target_user THEN
        RAISE EXCEPTION 'A migration deve ser executada sob a role %, mas executou como %', v_target_user, CURRENT_USER;
    END IF;

    SELECT jobid INTO v_jobid
    FROM cron.job
    WHERE jobname = 'job_expirar_orcamentos_diario'
      AND username = v_target_user;

    IF v_jobid IS NOT NULL THEN
        PERFORM cron.unschedule(v_jobid);
    END IF;

    PERFORM cron.schedule(
        'job_expirar_orcamentos_diario',
        '1 3 * * *',
        'SELECT app_private.executar_expiracao_orcamentos();'
    );

    SELECT count(*), min(jobid) INTO v_qtd, v_jobid
    FROM cron.job
    WHERE jobname = 'job_expirar_orcamentos_diario'
      AND username = v_target_user;

    IF v_qtd <> 1 OR v_jobid IS NULL THEN
        RAISE EXCEPTION 'Falha ao registrar job_expirar_orcamentos_diario: contagem final de jobs para % = %', v_target_user, v_qtd;
    END IF;
END;
$$;
```

---

## 16. Concorrência e Precisão de Locks

1. **Table-Level Lock Mode (`RowExclusiveLock`):** O comando `UPDATE public.orcamento ...` adquire automaticamente `RowExclusiveLock` sobre a tabela. Não bloqueia leituras (`SELECT` com `AccessShareLock`) e não bloqueia updates concorrentes em tuplas distintas;
2. **Row-Level Locks (Bloqueios por Tupla):** Locks exclusivos adquiridos individualmente à medida que as tuplas candidatas são visitadas;
3. **Resolução de Corridas via EvalPlanQual (EPQ):** Sob *Read Committed*, se uma transação concorrente de aprovação comitar antes da expiração, o protocolo EPQ reavalia o `WHERE` sobre a nova versão da linha. Como o status agora é `APROVADO`, o predicado falha e zero linhas são modificadas.

---

## 17. Benchmark e Árvore Decisória Determinística de Indexação (ACHADO-EXP-40 e ACHADO-EXP-43 Sanados)

### 17.1. Separação Estrita de Escopos de Teste
- **Benchmark de Indexação:** Avalia estritamente o **plano interno físico do comando UPDATE** (global e com predicado de `usuario_id`), medindo custos físicos de banco (Execution Time, Buffers, WAL) sob as Opções A, B e C;
- **Teste de Integração da RPC:** Avalia a função `public.expirar_meus_orcamentos_rpc()` sob sessão autenticada com `auth.uid()`, validando a blindagem RLS e latência fim-a-fim da chamada PostgREST.

### 17.2. As Três Opções Candidatas de Índices Parciais

| Opção de Índice | Definição DDL Candidata | Comportamento no Job Global (`status + data_validade`) | Comportamento no UPDATE Tenant (`usuario_id + status + data_validade`) |
| :--- | :--- | :--- | :--- |
| **Opção A** | `(data_validade) WHERE status IN ('ENVIADO', 'EM_ANALISE')` | **Excelente:** Range Scan direto em `data_validade < corte`. | **Bom:** Range Scan em `data_validade` + filtro de `usuario_id` em memória. |
| **Opção B** | `(usuario_id, data_validade) WHERE status IN ('ENVIADO', 'EM_ANALISE')` | **Regular/Bom:** Scan em todas as chaves do índice parcial. | **Excelente:** Equality match em `usuario_id` + Range Scan em `data_validade`. |
| **Opção C** | `(data_validade, usuario_id) WHERE status IN ('ENVIADO', 'EM_ANALISE')` | **Excelente:** Range Scan na coluna líder `data_validade`. | **Muito Bom:** Range Scan em `data_validade` + Index Condition em `usuario_id`. |

### 17.3. Reprodutibilidade Determinística do Dataset Sintético
Para garantir que repetições sucessivas avaliem exatamente o mesmo universo de tuplas:
1. **Seed Determinística:** Fixação obrigatória via `SELECT pg_catalog.setseed(0.20261005);` antes de qualquer carga sintética;
2. **Geração Parametrizada:** Distribuição lógica fixada: 40% `RASCUNHO`, 20% `ENVIADO` (10% vencidos, 10% vigentes), 15% `EM_ANALISE` (8% vencidos, 7% vigentes), 10% `APROVADO`, 10% `EXPIRADO`, 5% outros;
3. **Checksum de Integridade:** Validação antes de cada rodada via hash MD5 das chaves e datas de vencimento para certificar paridade absoluta.

### 17.4. Protocolo de Benchmark com Transação e Rollback
Para cada Opção $i \in \{A, B, C\}$ e para cada volume $N \in \{100, 1.000, 10.000, 100.000, 1.000.000\}$:
1. Criar índice temporário da opção;
2. Executar `ANALYZE public.orcamento;`;
3. Executar 1 rodada de warm-up (descartada da estatística);
4. Executar 5 repetições controladas encapsuladas em transações com `ROLLBACK`:
   ```sql
   BEGIN;
   EXPLAIN (ANALYZE, BUFFERS, WAL, TIMING, COSTS, VERBOSE)
   UPDATE public.orcamento
   SET status = 'EXPIRADO'::public.status_orcamento
   WHERE status IN ('ENVIADO'::public.status_orcamento, 'EM_ANALISE'::public.status_orcamento)
     AND data_validade < (pg_catalog.timezone('America/Sao_Paulo', pg_catalog.now()))::pg_catalog.date;
   ROLLBACK;
   ```
5. Coletar tempos individuais, buffers lidos e calcular mediana e média aparada;
6. Repetir o procedimento para o comando com filtro de `usuario_id`;
7. Remover o índice temporário (`DROP INDEX`).

### 17.5. Árvore Decisória Total e Determinística de Indexação

A escolha do índice vencedor em cada volume de teste obedece a uma **ordem lexicográfica total** pré-fixada:

```mermaid
graph TD
    Start[Comparacao de Opcoes A, B e C para Dado Volume N] --> Nivel1{Nivel 1: Execution Time Mediano<br/>Diferenca > 5%?}
    Nivel1 -->|Sim| VenceTempo[Opcao com Menor Tempo Mediano Vence]
    Nivel1 -->|Nao: Equivalencia <= 5%| Nivel2{Nivel 2: Total Buffers<br/>Diferenca > 5%?}
    Nivel2 -->|Sim| VenceBuffers[Opcao com Menor Total Buffers Vence]
    Nivel2 -->|Nao: Equivalencia <= 5%| Nivel3{Nivel 3: Tamanho Fisico pg_relation_size<br/>Diferenca > 5%?}
    Nivel3 -->|Sim| VenceTamanho[Opcao com Menor Tamanho em Disco Vence]
    Nivel3 -->|Nao: Equivalencia <= 5%| Nivel4{Nivel 4: WAL Bytes Gerados<br/>Diferenca > 5%?}
    Nivel4 -->|Sim| VenceWAL[Opcao com Menor Geracao de WAL Vence]
    Nivel4 -->|Nao: Equivalencia <= 5%| Nivel5{Nivel 5: Equilibrio Composto<br/>Performance na Query de Tenant}
    Nivel5 -->|Melhor Desempenho no Tenant| VenceTenant[Opcao com Menor Tempo no Tenant Vence]
    Nivel5 -->|Empate Completo em Todos os Niveis| DesempateFinal[Desempate Final Normativo:<br/>Opcao C Vence por Lideranca de data_validade]
```

#### Regras da Árvore Decisória:
1. **Nível 1 (Métrica Primária — Tempo):** Compara-se o *Execution Time* mediano ($T_{med}$). Se $|T_1 - T_2| / \min(T_1, T_2) > 0.05$, a opção com menor tempo é declarada vencedora;
2. **Nível 2 (Segunda Métrica — I/O de Memória):** Se a variação de tempo for $\le 5\%$ (equivalência temporal), compara-se o total de buffers lidos ($B_{tot} = \text{shared hit} + \text{shared read}$). Se a variação for $> 5\%$, a opção com menor $B_{tot}$ vence;
3. **Nível 3 (Terceira Métrica — Overhead de Manutenção):** Se os buffers forem equivalentes ($\le 5\%$), compara-se o tamanho físico em disco via `pg_relation_size`. A opção com menor footprint vence;
4. **Nível 4 (Quarta Métrica — Volume de WAL):** Se o tamanho for equivalente ($\le 5\%$), vence a opção que gerar menor volume de bytes em WAL;
5. **Nível 5 (Quinta Métrica — Equilíbrio Global vs. Tenant):** Persistindo a equivalência, compara-se o desempenho na consulta de tenant;
6. **Desempate Final Absoluto:** Caso ocorra empate matemático rigoroso em todos os 5 níveis, adota-se a **Opção C** como vencedora padrão, justificada por sua coluna líder `data_validade` para range scan global aliada ao predicado indexado em `usuario_id`.

### 17.6. Regra de Consolidação Ponderada entre Volumes

1. **Volumes de Pequeno Porte ($N \le 1.000$):** Mantidos para observação de inicialização (*startup cost*). O uso legítimo de *Sequential Scan* pelo otimizador nesses volumes não desqualifica nenhuma opção e **possui peso zero na decisão final**;
2. **Volumes de Escala ($N \ge 10.000$):** A consolidação final aplica pontuação ponderada proporcional à escala:
   - Volume $N = 10.000$: **Peso 1** (escala operacional imediata);
   - Volume $N = 100.000$: **Peso 2** (escala de médio prazo);
   - Volume $N = 1.000.000$: **Peso 3** (escala limite de estresse).
3. **Pontuação Consolidada:** O vencedor de cada volume recebe os pontos correspondentes ao seu peso. A opção com a maior pontuação acumulada é declarada o **Índice Vencedor Consolidado**;
4. **Desempate Consolidado:** Em caso de empate na pontuação consolidada, prevalece o vencedor do volume de maior escala ($N = 1.000.000$).

---

## 18. Resiliência e JIT

1. **Classificação Normativa do JIT:**
   - **Em Produção:** Atua unicamente como **defesa em profundidade**. A presença do `pg_cron` é **condição mandatória de conformidade** para o deploy do Bloco D;
   - **Em CI / Local:** Atua como fallback restrito para testes automatizados de cliente quando o daemon do cron estiver inativo no container efêmero;
2. **Single-Flight Mutex com Cooldown:** Centraliza chamadas concorrentes à RPC no aplicativo móvel;
3. **Timeout Não-Bloqueante:** A listagem de orçamentos carrega de imediato enquanto a sincronização ocorre com **timeout estrito de 2.000 ms** (`AbortController`), isolando falhas de rede.

---

## 19. Observabilidade Segregada

| Dimensão de Observabilidade | Repositório / Tabela | Dados Capturados | Responsabilidade Canônica |
| :--- | :--- | :--- | :--- |
| **Auditoria do Scheduler (Sucesso e Falha do Motor)** | `cron.job_run_details` | `jobid`, `runid`, `job_pid`, `username`, `status`, `start_time`, `end_time`, `return_message` | **Autoridade primária:** comprova execução pelo daemon e captura erros de runtime do PostgreSQL em caso de falha (`status = 'failed'`). |
| **Auditoria Funcional de Negócio (Execuções Bem-Sucedidas)** | `app_private.expiracao_execucao_log` | `id`, `executado_em`, `data_corte`, `linhas_afetadas`, `duracao_ms`, `sucesso`, `origem` | **Autoridade funcional:** registra linhas efetivamente modificadas e tempo de execução sob proteção não-bloqueante. |
| **Telemetria de Tenant no App** | Logs técnicos estruturados no cliente | `linhas_expiradas`, `duracao_ms`, `timestamp` | Diagnosticar a atuação da defesa em profundidade no dispositivo do usuário. |

---

## 20. Estratégia de Testes (12 Testes Planejados)

1. **Teste de Contrato TypeScript × SQL:** Matriz de 24 combinações determinísticas (8 status $\times$ 3 datas de validade com corte fixo) assertando equivalência booleana de `Orcamento.verificarExpiracao()`;
2. **Teste de Concorrência Real:** Prova que *EvalPlanQual* e locks de linha preservam estados comerciais concorrentes (`APROVADO`, `RECUSADO`, `CANCELADO`);
3. **Teste da Stored Function Isolada:** Valida retorno JSONB e registro protegido em `app_private.expiracao_execucao_log`;
4. **Teste de Integração da RPC com Autenticação e RLS:** Comprova que a RPC só processa linhas do `auth.uid()` chamador e rejeita usuários não autenticados;
5. **Teste da Criação Idempotente do Cron:** Valida que reexecuções do bloco procedural sob `postgres` mantêm exatamente 1 job sem erros;
6. **Teste da Pré-Condição `cron.timezone`:** Valida que a migration aborta se `cron.timezone` divergir de `GMT` (canônico) ou `UTC` (alias);
7. **Teste de Disparo Real do pg_cron:** Valida que um job temporário acelerado (`* * * * *`) dispara via daemon autônomo e gera registros em `cron.job_run_details`;
8. **Teste de Correlação Temporal com Janela de SLO:** Valida que o job programado para as 03:01 GMT dispara com atraso $T_{disp} \le 60\text{ s}$ e término $\le 00:15\text{ BRT}$, sem exigir igualdade exata;
9. **Teste de Recuperação após Indisponibilidade:** Simula retomada pós-parada e comprova que a execução subsequente transiciona cumulativamente todos os orçamentos vencidos no período de indisponibilidade;
10. **Benchmark de Índices:** Execução do protocolo com transações com `ROLLBACK` e aplicação da árvore decisória total das Opções A, B e C;
11. **Teste de Reprodutibilidade da Massa Sintética (ACHADO-EXP-43 Sanado):** Validação de que a geração pseudoaleatória com seed e checksum produz datasets logicamente idênticos em execuções repetidas;
12. **Auditoria da Cadeia de Roles Cloud (Status: `PENDENTE DE VALIDAÇÃO NO AMBIENTE CLOUD`):** Procedimento formal de verificação pré-ativação no primeiro deployment remoto.

---

## 21. Impactos Estruturais

| Artefato do Projeto | Status Vigente | Procedimento de Governança para o Bloco D |
| :--- | :---: | :--- |
| **Banco de Dados (Migrations)** | `CONGELADO` | **REQUER 1 NOVA MIGRATION CONDICIONADA:** `20261006000000_expiracao_orcamentos_autonoma.sql`. Sua confecção é condicionada à prévia conclusão do benchmark de indexação e fechamento das roles. |
| **Modelo Físico v1.1** | `CONGELADO` | **REABERTURA CONTROLADA:** Permanece congelado até aprovação final da Auditoria do Bloco D. A formalização do schema `app_private`, das stored functions, da tabela de log e do índice benchmarked será conduzida via Aditivo Técnico / Modelo Físico v1.2 por portão formal. |
| **Políticas RLS** | `CONGELADO` | **PRESERVADAS:** As políticas homologadas em `auth_rls.sql` permanecem 100% inalteradas. |
| **Domínio (`Orcamento.ts`)** | `CONGELADO` | **PRESERVADO:** Zero linhas alteradas na entidade canônica. |
| **Módulos Anteriores** | `CONGELADO` | **PRESERVADOS:** Zero impacto em Clientes, Catálogo, Áreas, PDF e Compartilhamento. |

---

## 22. Governança do Modelo Físico

- O Modelo Físico v1.1 permanece como **linha de base congelada e intocada**;
- Nenhuma migration definitiva será criada nesta etapa;
- Nenhuma alteração estrutural será aplicada ao banco antes da homologação formal da Auditoria Técnica Independente;
- A incorporação das entidades do Bloco D ao Modelo Físico ocorrerá por portão formal de governança com versionamento explícito (Modelo Físico v1.2).

---

## 23. Riscos Residuais e Mitigações

| Risco Residual | Probabilidade | Impacto | Mitigação Técnica Planejada |
| :--- | :---: | :---: | :--- |
| **1. Instância de CI sem `pg_cron` Habilitado** | Média | Baixo | Testes de integração do scheduler são condicionados a flag de ambiente; testes de cliente utilizam o JIT como fallback exclusivo de CI. |
| **2. Concorrência com Janelas de Backup Noturno** | Baixa | Baixo | O job opera com locks cirúrgicos de linha de curta duração ($\le 5\text{ s}$), não retendo locks de tabela. |
| **3. Latência Transitória de Rede no Cliente** | Média | Baixo | Mutex *single-flight* com timeout estrito de 2.000 ms impede qualquer bloqueio ou travamento na interface do aplicativo. |

---

## 24. Decisões Arquiteturais Propostas

- **DECISÃO-EXP-01 (Mecanismo Autônomo com SLO via `pg_cron` e Schema Privado):**  
  `NOVA DECISÃO PROPOSTA — PENDENTE DE AUDITORIA`  
  Adoção de stored function em `app_private` orquestrada pelo agendador do `pg_cron` sob horário programado de `00:01 BRT` (`03:01 GMT`) e SLO operacional alvo de conclusão até `00:15 BRT`.
- **DECISÃO-EXP-02 (Hierarquia Normativa de Timezone GMT Canônico e UTC Alias):**  
  `NOVA DECISÃO PROPOSTA — PENDENTE DE AUDITORIA`  
  Definição formal de `cron.timezone = 'GMT'` como valor canônico obrigatório e `'UTC'` como alias funcional tolerado com aborto defensivo na migration.
- **DECISÃO-EXP-03 (Semântica de Recuperação sem Presunção de Replay Imediato):**  
  `NOVA DECISÃO PROPOSTA — PENDENTE DE AUDITORIA`  
  Formalização de que a recuperação do scheduler aguarda o próximo ciclo programado, com correção matemática cumulativa garantida pelo predicado retroativo e suporte de JIT/manual.
- **DECISÃO-EXP-04 (Árvore Decisória Total e Determinística de Indexação):**  
  `NOVA DECISÃO PROPOSTA — PENDENTE DE AUDITORIA`  
  Adoção de ordem lexicográfica total (Tempo $\rightarrow$ Buffers $\rightarrow$ Tamanho $\rightarrow$ WAL $\rightarrow$ Tenant $\rightarrow$ Opção C) e consolidação ponderada por volume.
- **DECISÃO-EXP-05 (Governança de Roles: Fato Local vs. Hipótese Cloud sob Pré-Condição):**  
  `NOVA DECISÃO PROPOSTA — PENDENTE DE AUDITORIA`  
  Classificação formal da cadeia Cloud como hipótese de deployment sujeita a checklist obrigatório de validação no primeiro deployment remoto.
- **DECISÃO-EXP-06 (Reprodutibilidade Determinística por Seed e Checksum):**  
  `NOVA DECISÃO PROPOSTA — PENDENTE DE AUDITORIA`  
  Obrigatoriedade de semente pseudoaleatória fixada (`setseed`) e validação de integridade por checksum para paridade do benchmark.
- **DECISÃO-EXP-07 (Segregação entre Benchmark de Plano SQL e Integração RPC/RLS):**  
  `NOVA DECISÃO PROPOSTA — PENDENTE DE AUDITORIA`  
  Separação explícita entre medição física de planos de UPDATE e testes funcionais/segurança da RPC com `auth.uid()`.
- **DECISÃO-EXP-08 (Desacoplamento Transacional de Observabilidade):**  
  `NOVA DECISÃO PROPOSTA — PENDENTE DE AUDITORIA`  
  Isolamento do registro de log funcional em bloco protegido contra falhas, delegando a autoridade de auditoria de falhas do job exclusivamente ao `cron.job_run_details`.
- **DECISÃO-EXP-09 (Precisão Terminológica de Locks):**  
  `NOVA DECISÃO PROPOSTA — PENDENTE DE AUDITORIA`  
  Classificação formal de `RowExclusiveLock` no nível de tabela e locks de linha nas tuplas, garantindo integridade sob *EvalPlanQual*.
- **DECISÃO-EXP-10 (Classificação Normativa do Motor JIT):**  
  `NOVA DECISÃO PROPOSTA — PENDENTE DE AUDITORIA`  
  Classificação do JIT em produção exclusivamente como defesa em profundidade (sendo a presença do `pg_cron` obrigatória para conformidade do deploy) e como fallback restrito a testes em CI.
- **DECISÃO-EXP-11 (Governança Controlada do Modelo Físico):**  
  `NOVA DECISÃO PROPOSTA — PENDENTE DE AUDITORIA`  
  Manutenção do Modelo Físico v1.1 como linha de base congelada até aprovação formal de auditoria, procedendo com reabertura controlada após o portão.
- **DECISÃO-EXP-12 (Preservação Canônica da Entidade de Domínio):**  
  `HOMOLOGADA ANTERIORMENTE`  
  O método canônico [`Orcamento.verificarExpiracao(dataReferencia)`](file:///c:/Users/luanh/Documents/jardinagem-app/src/domain/entities/orcamento.ts#L336-L350) permanece intacto e soberano para toda a lógica de negócio.

---

## 25. Critérios Objetivos para Implementação Futura

1. Execução do benchmark comparativo das opções de índices parciais A, B e C utilizando o protocolo transacional com `ROLLBACK`, repetições estatísticas e semente determinística;
2. Emissão do Relatório Técnico de Benchmark de Indexação com a indicação do índice vencedor segundo a árvore decisória total;
3. Validação da pré-condição de roles no primeiro deployment Cloud conforme o checklist estabelecido;
4. Criação da migration definitiva `20261006000000_expiracao_orcamentos_autonoma.sql` contendo asserção de timezone, extensão, schemas, tabela de log, stored functions, índice vencedor e agendamento idempotente;
5. Reabertura controlada do Modelo Físico v1.1 para emissão do Modelo Físico v1.2 / Aditivo Técnico;
6. Implementação do `ExpiracaoMutex` em `src/application/services/`;
7. Integração não-bloqueante no hook `useOrcamentos`;
8. Execução e aprovação da suíte completa de 12 testes planejados.

---

## 26. Critérios Objetivos para Homologação

1. **Atendimento Literal a RF67 com App Fechado:** Comprovação via `cron.job_run_details` e `app_private.expiracao_execucao_log` de que o agendador autônomo executou no servidor e transicionou orçamentos vencidos para `EXPIRADO` sem qualquer requisição de cliente móvel;
2. **Conformidade Estrita com RN69 e RN70:** Orçamentos `ENVIADO` e `EM_ANALISE` vencidos expiram; orçamentos em `RASCUNHO` permanecem inalterados;
3. **Pré-Condição de Timezone Auditada:** Comprovação de que o deployment valida `cron.timezone = 'GMT'`;
4. **Cadeia de Privilégios e Segurança Auditadas:** Comprovação de execução sob role `postgres` e rejeição (`permission denied`) para papéis `anon` e `authenticated` em `app_private`;
5. **Resiliência e Não-Bloqueio da UI:** Falhas injetadas na RPC não causam bloqueio, erro ou atraso na exibição da lista de orçamentos;
6. **Contrato TypeScript × SQL 100% Determinístico:** Identidade matemática em todas as 24 combinações de teste puro da matriz de estados e datas;
7. **Alinhamento Temporal com Janela de SLO:** Teste comprovando que o disparo sob `cron.timezone = 'GMT'` atende à janela operacional do Horário de Brasília sem violação de limites;
8. **Índice Vencedor Demonstrado por Benchmark:** Comprovação empírica de aplicação da árvore decisória total sem subjetividade.

---

`PLANEJAMENTO CONCLUÍDO — BLOCO D v1.7 — AGUARDANDO NOVA AUDITORIA`
