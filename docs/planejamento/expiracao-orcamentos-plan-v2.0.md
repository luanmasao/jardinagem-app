# Planejamento Técnico Consolidado — Bloco D: Expiração Temporal Automática de Orçamentos (v2.0)

**Projeto:** Sistema de Orçamento para Jardinagem (`jardinagem-app`)  
**Data:** 05 de Outubro de 2026  
**Responsável Técnico:** Planejador Técnico Principal / Arquiteto de Software  
**Status do Documento:** `PLANEJAMENTO CONSOLIDADO — BLOCO D v2.0 — PRONTO PARA AUDITORIA FINAL PRÉ-IMPLEMENTAÇÃO`  
**Referência Canônica do Inventário:** `docs/planejamento/requisitos-cobertura-status-v1.2.md`  
**Escopo da Versão:** Versão de consolidação definitiva para implementação, encerrando os ciclos de microrefinamentos secundários e estabelecendo uma especificação estável, implementável, testável, proporcional e estritamente compatível com o schema real do Modelo Físico v1.1.  
**Requisitos Alvo:** RF67, RN69 (preservando integralmente RF68, RN70, RN61 a RN65, RN71, RNF12, RNF16, RNF34 e RNF35)  

---

## 1. Identificação e Princípio de Consolidação

### 1.1. Identificação do Bloco
- **Identificador:** Bloco D — Expiração Temporal Automática de Orçamentos
- **Versão:** 2.0 (Consolidação Definitiva para Implementação)
- **Status Canônico:** `PLANEJAMENTO CONSOLIDADO — BLOCO D v2.0 — PRONTO PARA AUDITORIA FINAL PRÉ-IMPLEMENTAÇÃO`

### 1.2. Princípio de Consolidação da v2.0
As revisões documentais anteriores (v1.0 a v1.9) cumpriram seu papel de amadurecimento arquitetural, mas atingiram um nível de detalhamento excessivo em questões periféricas e teóricas (como disputas acadêmicas sobre árvores de benchmark, medição teórica de buffers de ordenação de checksum e microetapas de deployment), enquanto os requisitos funcionais centrais já se encontram perfeitamente definidos e estabilizados.

A presente versão v2.0 estabelece o **encerramento formal do ciclo de debates documentais secundários**, consolidando as decisões de engenharia necessárias para habilitar a implementação prática:
1. **Separação entre Requisito Funcional e Otimização:** O atendimento literal a RF67/RN69 não depende de provas teóricas prévias de árvores de benchmark ou de checksums sofisticados. A implementação da solução funcional correta tem precedência;
2. **Proporcionalidade de Engenharia:** A arquitetura foca na entrega do mecanismo autônomo server-side e na defesa em profundidade, tratando otimizações de indexação e medições de memória como atividades empíricas de suporte no ambiente real;
3. **Compatibilidade Estrita com o Schema Real:** Alinhamento literal com os tipos, constraints e tabelas do Modelo Físico v1.1 vigente;
4. **Fluxo de Trabalho da v2.0 em Diante:**
   $$\text{Planejamento v2.0 Consolidado} \longrightarrow \text{Implementação} \longrightarrow \text{Testes Reais} \longrightarrow \text{Auditoria Empírica} \longrightarrow \text{Ajustes se houver falha concreta}$$
5. **Declaração Formal de Escopo:** **Não foram introduzidos novos requisitos funcionais.**

---

## 2. Histórico das Revisões

- **v1.0 (05/10/2026):** Versão inicial baseada exclusivamente em Just-in-Time no app móvel. Reprovada por não atender RF67 com o aplicativo fechado (ACHADO-EXP-01 a 07);
- **v1.1 (05/10/2026):** Introdução do mecanismo autônomo via `pg_cron` e schema privado `app_private` (ACHADO-EXP-08 a 15);
- **v1.2 (05/10/2026):** Estruturação de camadas de segurança, RPC tenant-scoped e metas operacionais de SLA (ACHADO-EXP-16 a 20);
- **v1.3 a v1.5 (05/10/2026):** Refinamento de DDLs, cadeia fechada de roles sob `postgres`, desacoplamento de log funcional e confirmação de `cron.timezone = GMT` (ACHADO-EXP-21 a 34);
- **v1.6 a v1.8 (05/10/2026):** Formalização de pré-condições procedurais de timezone, protocolo de benchmark com transação/rollback, eliminação da intransitividade decisória por referência global comum e deployment não-circular (ACHADO-EXP-35 a 48);
- **v1.9 (05/10/2026):** Segregação teórica de memória lógica vs. real de checksum e decomposição estrita do deployment em 5 fases (ACHADO-EXP-49 a 52);
- **v2.0 (05/10/2026 — Presente Versão):** **Consolidação para implementação.** Redução drástica da complexidade documental secundária, preservação integral da regra de negócio central e da arquitetura server-side, compatibilização estrita com o schema real de `orcamento` e definição de suíte objetiva de 14 testes essenciais.

---

## 3. Requisitos Canônicos e Máquina de Estados

### 3.1. Requisitos Canônicos Vigentes Preservados
- **RF67:** *“O sistema deve identificar automaticamente a expiração de um orçamento ENVIADO ou EM_ANALISE quando sua data de validade for ultrapassada.”*
- **RF68 / RN70:** *“Um orçamento em RASCUNHO não deve ser marcado automaticamente como EXPIRADO.”*
- **RN69:** *“Um orçamento ENVIADO ou EM_ANALISE deve ser considerado EXPIRADO quando sua validade for ultrapassada.”*
- **RN61 a RN63:** Máquina de estados oficial e transições permitidas.
- **RN64 e RN65:** Edição direta permitida somente em `RASCUNHO`.
- **RN71:** Orçamentos finalizados (`CONCLUIDO`, `CANCELADO`, `RECUSADO`, `APROVADO`) são imutáveis e não podem transicionar para `EXPIRADO`.
- **RNF12:** Desempenho e tempo de resposta aceitável nas consultas.
- **RNF16:** Integridade referencial e consistência transacional do PostgreSQL.
- **RNF34 e RNF35:** Persistência segura, resiliência e tratamento de falhas.

### 3.2. Matriz Canônica de Estados na Expiração

| Estado Atual | Validade Ultrapassada? ($ref > val$) | Transição para `EXPIRADO`? | Justificativa Canônica |
| :---: | :---: | :---: | :--- |
| `RASCUNHO` | Sim ou Não | **NÃO** | RF68 e RN70 (Rascunho nunca expira automaticamente) |
| `ENVIADO` | Sim | **SIM** | RF67 e RN69 |
| `EM_ANALISE` | Sim | **SIM** | RF67 e RN69 |
| `APROVADO` | Sim ou Não | **NÃO** | RN61, RN62 (Estado terminal comercial aprovado pelo cliente) |
| `RECUSADO` | Sim ou Não | **NÃO** | RN62 (Estado terminal recusado pelo cliente) |
| `CANCELADO` | Sim ou Não | **NÃO** | RN62 (Estado terminal cancelado pelo prestador) |
| `CONCLUIDO` | Sim ou Não | **NÃO** | RN71 (Estado final imutável do ciclo de vida) |
| `EXPIRADO` | Sim ou Não | **NÃO** | Idempotente (estado de expiração já consolidado) |

---

## 4. Regra de Negócio Central e Soberania do Domínio

A regra de negócio que governa a expiração automática de orçamentos é simples, atômica e soberana:

> **Regra Canônica:** Um orçamento tem seu status alterado para `EXPIRADO` se, e somente se, atender cumulativamente a:
> 1. $\text{status} \in \{\text{'ENVIADO'}, \text{'EM\_ANALISE'}\}$;
> 2. $\text{data\_validade} < \text{data\_corte\_do\_servidor}$.

### Invariantes de Negócio:
- Orçamentos em `RASCUNHO` **nunca** são modificados pela rotina;
- Orçamentos em estados comerciais finais (`APROVADO`, `RECUSADO`, `CANCELADO`, `CONCLUIDO`) **nunca** são modificados;
- O método canônico da entidade de domínio [`Orcamento.verificarExpiracao(dataReferencia)`](file:///c:/Users/luanh/Documents/jardinagem-app/src/domain/entities/orcamento.ts#L336-L350) permanece intacto, soberano e idêntico à expressão relacional executada no banco.

---

## 5. Arquitetura do Mecanismo Autônomo e Defesa em Profundidade

O sistema adota formalmente o modelo híbrido com clara hierarquia de responsabilidades:

1. **Mecanismo Primário (Server-Side / PostgreSQL + `pg_cron` — Mandatório):**
   - Stored function privilegiada em schema privado `app_private`, disparada diariamente às `00:01 BRT` (`03:01 GMT`) pelo daemon do `pg_cron`;
   - **Funciona de forma 100% autônoma com o aplicativo móvel completamente fechado**;
   - É o mecanismo que garante o atendimento literal aos requisitos RF67 e RN69;
2. **Mecanismo Complementar (Cliente / React Native — Defesa em Profundidade Opcional):**
   - RPC segura `public.expirar_meus_orcamentos_rpc()` restrita a `auth.uid()`;
   - Invocada com *Single-Flight Mutex* e timeout estrito não-bloqueante de 2.000 ms durante a abertura da listagem no app;
   - **Não substitui o mecanismo autônomo**; atua exclusivamente para cobrir o acesso de usuários caso abram o aplicativo antes do término da janela operacional do cron ou em ambientes de desenvolvimento/CI onde o daemon do cron não esteja ativo.

---

## 6. Implementação Server-Side

### 6.1. Stored Function Central de Expiração
A lógica de expiração server-side reside em uma única stored function privilegiada, set-based, idempotente e segura:

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
    -- Data de corte canônica baseada no relógio do PostgreSQL no fuso oficial
    v_data_corte := (pg_catalog.timezone('America/Sao_Paulo', pg_catalog.now()))::pg_catalog.date;

    -- UPDATE set-based atômico, setando diretamente EXPIRADO
    UPDATE public.orcamento
    SET status = 'EXPIRADO'::public.status_orcamento
    WHERE status IN ('ENVIADO'::public.status_orcamento, 'EM_ANALISE'::public.status_orcamento)
      AND data_validade < v_data_corte;

    GET DIAGNOSTICS v_linhas_afetadas = ROW_COUNT;
    v_duracao_ms := pg_catalog.round(pg_catalog.extract(epoch FROM (pg_catalog.clock_timestamp() - v_inicio)) * 1000)::pg_catalog.int4;

    -- Registro funcional de observabilidade mínima sob proteção não-bloqueante
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

-- Blindagem estrita de privilégios
REVOKE ALL ON FUNCTION app_private.executar_expiracao_orcamentos() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION app_private.executar_expiracao_orcamentos() TO postgres;
ALTER FUNCTION app_private.executar_expiracao_orcamentos() OWNER TO postgres;
```

### 6.2. RPC Complementar para Tenant
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

## 7. Política Temporal e Agendamento

1. **Fuso Horário Oficial de Negócio:** `America/Sao_Paulo` (UTC-3 fixo, sem horário de verão, Decreto nº 9.772/2019);
2. **Autoridade Temporal:** A data civil de corte deriva estritamente do relógio transacional do PostgreSQL (`timezone('America/Sao_Paulo', now())::date`). O relógio do dispositivo Android não possui qualquer autoridade sobre a expiração;
3. **Fuso Canônico do Scheduler:** `GMT` (valor canônico oficial exigido). O alias funcional `'UTC'` é aceito operacionalmente por possuir offset zero idêntico (`+00:00`);
4. **Horário de Disparo:** Programado diariamente para as `00:01 BRT`, correspondente à expressão cron `'1 3 * * *'` (03:01 GMT / 03:01 UTC).

---

## 8. Deployment Desacoplado Simples e Auditável

O processo de deployment adota separação em etapas objetivas para assegurar governança sem burocracia excessiva:

1. **Fase A1 — Instalação Estática DDL:**
   - Criação da extensão `pg_cron`, schema privado `app_private`, tabela `expiracao_execucao_log`, stored function privilegiada e RPC tenant-scoped;
   - **Nenhum job é agendado nesta etapa**;
2. **Fase A2 — Pre-Flight Procedural:**
   - Execução de bloco de asserção que inspeciona: `current_user = 'postgres'`, disponibilidade de `pg_cron`, concessão de `EXECUTE` e `cron.timezone IN ('GMT', 'UTC')`;
   - Emite o relatório de pre-flight;
3. **Portão de Aprovação:**
   - Validação técnica da ausência de erros na Fase A2. Se A2 falhar, a ativação é categoricamente proibida;
4. **Fase B — Ativação Idempotente do Agendador:**
   - Execução de script idempotente que remove agendamento prévio com o mesmo nome e invoca:
     ```sql
     PERFORM cron.schedule(
         'job_expirar_orcamentos_diario',
         '1 3 * * *',
         'SELECT app_private.executar_expiracao_orcamentos();'
     );
     ```
   - Confirmação de registro ativo único em `cron.job` com `username = 'postgres'`;
5. **Fase C — Pós-Validação Operacional:**
   - Verificação em produção após o primeiro ciclo programado, consultando `cron.job_run_details` (`status = 'succeeded'`) e `app_private.expiracao_execucao_log`.

---

## 9. Compatibilidade Estrita com o Modelo Físico Real v1.1

O planejamento respeita literalmente a estrutura congelada da tabela `ORCAMENTO` aprovada no Modelo Físico v1.1:

| Coluna Real | Tipo de Dado Real | Nulidade | Papel no Bloco D |
| :--- | :--- | :---: | :--- |
| `id` | `UUID` | `NOT NULL` | Chave primária canônica |
| `usuario_id` | `UUID` | `NOT NULL` | Chave de isolamento de tenant / RLS |
| `cliente_id` | `UUID` | `NOT NULL` | FK para tabela `CLIENTE` |
| `numero` | `VARCHAR(30)` | `NOT NULL` | Identificador textual comercial |
| `data_criacao` | `TIMESTAMPTZ` | `NOT NULL` | Timestamp transacional de criação |
| `data_validade` | `DATE` | `NULL` (Rascunho) / `NOT NULL` | **Coluna central do predicado temporal de expiração** |
| `status` | `STATUS_ORCAMENTO` | `NOT NULL` | **Coluna de estado da máquina de estados** |
| `subtotal` | `NUMERIC(12,2)` | `NOT NULL` | Somatório dos itens |
| `tipo_desconto` | `TIPO_DESCONTO` | `NULL` | Indicador de desconto |
| `valor_desconto` | `NUMERIC(12,2)` | `NOT NULL` | Valor do abatimento comercial |
| `total` | `NUMERIC(12,2)` | `NOT NULL` | **Valor monetário final real (não usar `valor_total`)** |
| `observacoes` | `TEXT` | `NULL` | Anotações adicionais |
| `condicoes_pagamento` | `TEXT` | `NULL` | Termos de pagamento |

> **Diretriz de Compatibilidade:** Qualquer massa sintética de teste ou script utilitário deve utilizar estritamente a nomenclatura real acima (especialmente `total` em vez de `valor_total` e `UUID` em vez de inteiros), respeitando as chaves estrangeiras para `USUARIO` e `CLIENTE`.

---

## 10. Indexação e Redução de Complexidade

### 10.1. Desregulamentação de Decisão Prévia Abstrata
A escolha entre índices parciais candidatos não constitui requisito funcional. A funcionalidade RF67 opera com correção semântica independentemente do índice físico utilizado.

Portanto, **a v2.0 elimina qualquer dependência de árvores de decisão matemáticas complexas prévias**:
1. **Passo 1:** A solução funcional será implementada e testada no schema padrão;
2. **Passo 2:** O comportamento físico do comando `UPDATE` será inspecionado via `EXPLAIN (ANALYZE, BUFFERS)` no ambiente real de testes;
3. **Passo 3:** Caso o volume de dados demande otimização de I/O para cumprir o RNF12, será avaliada a introdução de índice parcial adequado (por exemplo, sobre `(data_validade) WHERE status IN ('ENVIADO', 'EM_ANALISE')`);
4. **Passo 4:** Nenhuma alteração de índice será aplicada em produção sem evidência técnica comprovada no ambiente de testes.

---

## 11. Concorrência e Isolamento Transacional

O mecanismo de concorrência baseia-se no comportamento nativo do PostgreSQL sob nível de isolamento *Read Committed*:
1. **Locks Cirúrgicos de Linha:** O `UPDATE` set-based adquire `RowExclusiveLock` no nível de tabela (não bloqueando leituras `SELECT`) e locks exclusivos por tupla apenas sobre as linhas candidatas visitadas;
2. **Resolução de Corridas via EvalPlanQual (EPQ):** Se um usuário aprovar, recusar ou cancelar um orçamento concorrentemente no momento do disparo da rotina, a transação comercial comita primeiro. Quando a rotina de expiração alcançar a tupla, o mecanismo EPQ do PostgreSQL reavalia a cláusula `WHERE` sobre a linha recém-comitada. Como o status agora é `APROVADO`, `RECUSADO` ou `CANCELADO`, a linha deixa de atender ao predicado e não é modificada;
3. **Imutabilidade Garantida:** Não há risco de um orçamento legitimamente aprovado pelo cliente ser sobrescrito como expirado.

---

## 12. Observabilidade Mínima Adequada

A observabilidade do Bloco D opera em duas dimensões complementares e simples:
1. **Auditoria Técnica do Daemon (`cron.job_run_details`):**
   - Repositório nativo do `pg_cron` que registra cada disparo, tempo de execução (`start_time`, `end_time`), usuário executor e `status` (`'succeeded'` ou `'failed'`);
2. **Auditoria Funcional de Negócio (`app_private.expiracao_execucao_log`):**
   - Tabela dedicada e protegida que registra: `executado_em`, `data_corte`, `linhas_afetadas`, `duracao_ms`, `sucesso`, `origem` e `mensagem_erro`;
   - O registro é encapsulado em bloco `BEGIN ... EXCEPTION` com `RAISE WARNING`: **uma falha de inserção de log nunca reverte a transição válida de expiração dos orçamentos**.

---

## 13. Semântica de Recuperação após Indisponibilidade

1. **Ausência de Replay Imediato:** Se o banco de dados estiver desligado ou reiniciar durante a janela programada (`03:01 GMT`), o daemon do `pg_cron` não executa replay automático imediato no momento do boot;
2. **Correção Cumulativa Garantida:** Devido ao predicado retroativo $\text{data\_validade} < \text{data\_corte}$, o primeiro ciclo subsequente executado pelo cron (ou um disparo manual emergencial via `SELECT app_private.executar_expiracao_orcamentos();`) processará cumulativamente **todos** os orçamentos que venceram durante o período de parada;
3. **Defesa em Profundidade Ativa:** Se um usuário acessar o aplicativo antes do restabelecimento do cron, a RPC tenant-scoped do JIT atuará pontualmente sobre os orçamentos do seu tenant, impedindo visualização inconsistente.

---

## 14. Metas Operacionais de SLO (Critérios de Aceitação)

Os parâmetros temporais são formalmente enquadrados como **metas operacionais e critérios de aceitação de engenharia**, sujeitos à validação empírica nos testes:
- **Frequência de Execução:** Diária;
- **Horário Programado:** `00:01 BRT` (`03:01 GMT`);
- **Janela Operacional Alvo:** Conclusão até as `00:15 BRT`;
- **Duração de Execução Alvo ($T_{dur}$):** $\le 5\text{ s}$ para volumes normais de operação;
- **Atraso de Disparo Alvo ($T_{disp}$):** $\le 60\text{ s}$.

---

## 15. Suíte Objetiva de 14 Testes Mínimos Obrigatórios

Para liberar a homologação e assegurar cobertura rigorosa de RF67, RF68, RN69, RN70 e RNF12/16/34/35, define-se o seguinte conjunto mínimo de testes:

| ID | Nome do Teste | Cenário de Entrada | Resultado Esperado | Requisito Coberto |
| :---: | :--- | :--- | :--- | :---: |
| **TESTE 1** | Expiração de `ENVIADO` vencido | Orçamento com `status = 'ENVIADO'` e `data_validade < data_corte` | Status transiciona para `EXPIRADO` | RF67, RN69 |
| **TESTE 2** | Expiração de `EM_ANALISE` vencido | Orçamento com `status = 'EM_ANALISE'` e `data_validade < data_corte` | Status transiciona para `EXPIRADO` | RF67, RN69 |
| **TESTE 3** | `ENVIADO` vigente | Orçamento com `status = 'ENVIADO'` e `data_validade >= data_corte` | Status permanece inalterado (`ENVIADO`) | RF67, RN69 |
| **TESTE 4** | `EM_ANALISE` vigente | Orçamento com `status = 'EM_ANALISE'` e `data_validade >= data_corte` | Status permanece inalterado (`EM_ANALISE`) | RF67, RN69 |
| **TESTE 5** | `RASCUNHO` com data anterior | Orçamento com `status = 'RASCUNHO'` e `data_validade < data_corte` | Status permanece inalterado (`RASCUNHO`) | RF68, RN70 |
| **TESTE 6** | Estados comerciais terminais | Orçamentos em `APROVADO`, `RECUSADO`, `CANCELADO`, `CONCLUIDO` | Status permanecem 100% inalterados | RN61, RN62, RN71 |
| **TESTE 7** | Execução Idempotente | Executar a rotina duas vezes consecutivas | Segunda execução afeta 0 linhas e mantém integridade | RNF16, RNF34 |
| **TESTE 8** | Concorrência Real | Transação concorrente aprova orçamento no momento do UPDATE | Orçamento comita como `APROVADO`; não é sobrescrito | RNF16 |
| **TESTE 9** | Operação com App Fechado | Executar rotina sem instâncias do cliente React Native ativas | Orçamentos vencidos expiram perfeitamente | RF67 (Autonomia) |
| **TESTE 10** | Segurança e Blindagem | Usuário `anon` ou `authenticated` tenta chamar função privada | Erro imediato de `permission denied` | RNF34 (Segurança) |
| **TESTE 11** | Isolamento de Tenant na RPC | Usuário autenticado A chama `expirar_meus_orcamentos_rpc()` | Modifica apenas orçamentos onde `usuario_id = auth.uid()` | RLS / RNF34 |
| **TESTE 12** | Disparo do Scheduler Real | Agendamento via `pg_cron` no PostgreSQL | Job executa e registra tupla em `cron.job_run_details` | RF67, RNF35 |
| **TESTE 13** | Recuperação Cumulativa | Simular indisponibilidade em dias anteriores | Próxima execução processa cumulativamente os dias parados | RNF35 |
| **TESTE 14** | Aferição de Desempenho | Medir tempo de resposta do UPDATE sob carga | Execução cumpre metas de tempo sem travamentos | RNF12 |

---

## 16. Itens Desregulamentados do Caminho Crítico

Para evitar bloqueios desnecessários na implementação, fixam-se formalmente os seguintes itens como **desregulamentados do caminho crítico**:
- **Checksums sofisticados de múltiplos estágios:** A verificação de dados de teste utilizará consultas relacionais convencionais (`EXCEPT`, contagens de integridade);
- **Árvores teóricas prévias de decisão de benchmark:** A escolha de índices físicos será pautada na observação de planos de execução reais sob carga, não em fórmulas teóricas abstratas;
- **Análises teóricas de saturação de `work_mem`:** Questões de memória de banco serão avaliadas durante a execução real de testes de estresse;
- **Suposições prévias de infraestrutura Cloud remota:** O comportamento no Supabase Cloud será tratado pela sequência objetiva de Pre-Flight e Ativação no momento do deploy real.

---

## 17. Governança do Modelo Físico e Status de Congelamento

- O **Modelo Físico v1.1 permanece CONGELADO e intocado**;
- Nenhuma migration foi criada ou executada nesta tarefa de planejamento documental;
- Nenhuma linha de código de produção foi modificada;
- A formalização estrutural no banco ocorrerá via migration condicionada `20261006000000_expiracao_orcamentos_autonoma.sql` exclusivamente após aprovação formal deste documento consolidado.

---

`PLANEJAMENTO CONSOLIDADO — BLOCO D v2.0 — PRONTO PARA AUDITORIA FINAL PRÉ-IMPLEMENTAÇÃO`
