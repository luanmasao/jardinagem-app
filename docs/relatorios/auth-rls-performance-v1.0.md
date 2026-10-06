# Homologação da Revisão de Performance do RLS — v1.0

**Documento de Fechamento Formal e Homologação — PONTO 5 DA ESTRATÉGIA DE AUTH + RLS**  
**Assunto:** Homologação formal das decisões consolidadas sobre performance de RLS, classificação estrutural de índices, desmistificação de *Sequential Scans*, reenquadramento de H3 como meta experimental provisória e homologação do plano de validação C1–C6 com `EXPLAIN (ANALYZE, BUFFERS)`.  
**Status:** HOMOLOGADA  
**Data da Homologação:** 2026-09-20  
**Documento de Referência Estratégica:** `docs/relatorios/auth-rls-strategy-v1.5.md`  
**Autor:** Equipe de Arquitetura e Engenharia de Software  

---

## 1. Objetivo e Registro Formal de Homologação

Este documento formaliza o **fechamento técnico e a HOMOLOGAÇÃO DEFINITIVA do Ponto 5** da Estratégia de Supabase Auth + RLS:

> *"Revisar afirmações de performance das policies RLS e substituir afirmações não comprovadas por hipóteses/métodos de validação."*

Na Seção 23 da `docs/relatorios/auth-rls-strategy-v1.5.md`, constavam asserções de desempenho que foram tecnicamente readequadas perante o funcionamento real do planejador de consultas baseado em custos (*Cost-Based Optimizer* — CBO) do PostgreSQL. 

A homologação formal do Ponto 5 estabelece explicitamente que:

1. **Afirmações não constituem garantias:** As afirmações anteriores de “sem sequential scans”, complexidade geral $O(\log n)$ e sobrecarga não apreciável não são consideradas garantias do sistema;
2. **Uso de índices condicionado ao CBO:** A existência de índices é uma propriedade estrutural do modelo, mas sua utilização efetiva pelo PostgreSQL depende do plano de execução escolhido pelo otimizador de custos com base em estatísticas e volume de páginas;
3. **Manutenção de H1 e H2 como hipóteses:** A hipótese H1 (adoção de caminhos indexados em escala) e a hipótese H2 (descorrelação de subqueries `EXISTS` em Semi-Joins) permanecem como hipóteses técnicas a serem validadas empiricamente;
4. **Desassociação de requisito em H3 (100ms):** A hipótese H3 não estabelece requisito de 100 ms. O patamar de 100 ms permanece estritamente como meta/critério experimental provisório de engenharia interna, sem status de requisito de negócio ou garantia arquitetural;
5. **Plano de validação C1–C6 homologado:** As consultas C1 a C6 constituem o plano formal de testes de integração futura;
6. **Natureza integrada de C6:** A consulta C6 avalia o comportamento integrado e indissociável da pilha:  
   $$\text{PostgREST} + \text{Consulta Relacional com Agregação JSON} + \text{Motor PostgreSQL} + \text{Políticas RLS}$$  
   e **não exclusivamente o custo isolado do RLS**;
7. **Validação futura com instrumentação real:** O comando `EXPLAIN (ANALYZE, BUFFERS)` será utilizado futuramente na etapa de testes de integração da migration de Auth/RLS, com massa de dados multi-tenant representativa;
8. **Interpretação técnica de `Seq Scan`:** A ocorrência de `Seq Scan` não será considerada automaticamente uma falha ou defeito; a análise empírica considerará o plano de execução, os custos globais e a volumetria da tabela;
9. **Ausência de medições nesta etapa:** Nenhuma medição de performance ou benchmark foi executada nesta etapa de documentação.

> [!IMPORTANT]
> **Registro Formal de Escopo e Congelamento:**  
> - Nenhuma política RLS foi criada ou alterada no banco de dados;  
> - Nenhum comando SQL ou benchmark foi executado;  
> - Nenhum *seed* de teste foi criado no banco;  
> - Nenhuma migration foi criada ou modificada;  
> - O arquivo `supabase/migrations/20260916020500_modelo_fisico_v1_1.sql` permanece **congelado e inalterado**;  
> - O banco de dados PostgreSQL permanece **completamente intocado**;  
> - Nenhum código de produção da aplicação móvel foi alterado;  
> - As decisões anteriores já homologadas — **Decisão 4** (`ENABLE RLS` sem `FORCE`), **Decisão 12** (`private.handle_new_user()`, `SECURITY DEFINER`, menor privilégio) e **Ponto 4** (D1 e D2 homologadas em `docs/relatorios/auth-rls-delete-policy-v1.2.md`) — **permanecem rigorosamente fechadas e inalteradas**.

---

## 2. Escopo da Análise

A revisão abrangeu todas as asserções de desempenho e custo relacional presentes na estratégia v1.5, cobrindo:
1. **Políticas com predicados `EXISTS` em subqueries correlacionadas;**
2. **Subqueries em cadeia simples:** `item_orcamento -> orcamento`;
3. **Subqueries em cadeia dupla:** `area -> item_orcamento -> orcamento`;
4. **Políticas diretas com `auth.uid() = usuario_id`:** `cliente`, `servico`, `produto`, `orcamento`;
5. **Políticas de deleção condicionada:** `orcamento` com `status = 'RASCUNHO'` e navegação em `item_orcamento` e `area` (D2 homologada);
6. **Consultas agregadas hierárquicas geradas pelo PostgREST;**
7. **Cobertura de índices existentes na migration homologada v1.1;**
8. **Interpretação e desmistificação de *Sequential Scans*;**
9. **Afirmações de complexidade assintótica $O(\log n)$;**
10. **Metodologia de mensuração empírica via `EXPLAIN (ANALYZE, BUFFERS)`.**

---

## 3. Afirmações Originais Identificadas na Estratégia v1.5

No texto da Seção 23 da `docs/relatorios/auth-rls-strategy-v1.5.md`, constavam as seguintes declarações textuais submetidas a revisão:

- **Afirmação 1 (Cobertura por Índices):**  
  *"Todas as colunas envolvidas nas subqueries já possuem índices B-Tree criados pela migration homologada 20260916020500_modelo_fisico_v1_1.sql: idx_orcamento_usuario_id, idx_item_orcamento_orcamento_id, idx_area_item_orcamento_id, idx_cliente_usuario_id."*
- **Afirmação 2 (Garantia de Index Lookups):**  
  *"As buscas utilizam index lookups..."*
- **Afirmação 3 (Complexidade Algorítmica $O(\log n)$):**  
  *"...de complexidade $O(\log n)$..."*
- **Afirmação 4 (Garantia de Ausência de Sequential Scans):**  
  *"...sem sequential scans."*
- **Afirmação 5 (Plano de Execução e Sobrecarga no PostgREST):**  
  *"O PostgREST compõe as políticas no plano de execução SQL (EXPLAIN ANALYZE). Não há sobrecarga apreciável para os volumes previstos no projeto de jardinagem."*

---

## 4. Análise Técnica e Respostas às Questões Obrigatórias

### 4.1. A afirmação de que os índices “garantem” index lookups é válida?
**Resposta:** **NÃO.**  
**Fundamentação Técnica Homologada:**  
No PostgreSQL, a existência de um índice B-Tree cria o **caminho de acesso estrutural**, mas **nunca garante** que ele será selecionado pelo planejador de consultas (*planner*).  
O otimizador do PostgreSQL é baseado em custos estimados (*Cost-Based Optimizer* — CBO). Ele compara os custos de diferentes estratégias (varredura sequencial, varredura de índice, varredura por mapa de bits) ponderando parâmetros como `seq_page_cost` (padrão 1.0), `random_page_cost` (padrão 4.0), tamanho da tabela em páginas (`relpages`), número de tuplas (`reltuples`) e estatísticas de seletividade (`pg_statistic`).  
Se a tabela contiver poucas páginas de disco ou se a estimativa de tuplas retornadas indicar que grande parte da tabela será lida, o planejador escolherá intencionalmente **não utilizar o índice**, porque ler blocos sequenciais contíguos em memória é mais rápido do que alternar entre páginas de índice e páginas de dados (*heap fetches* aleatórios).  
Portanto, a presença de índice é **condição necessária, porém não suficiente** para um *index lookup*.

---

### 4.2. A afirmação de complexidade $O(\log n)$ para as avaliações de RLS é válida como afirmação geral?
**Resposta:** **NÃO.**  
**Fundamentação Técnica Homologada:**  
A complexidade $O(\log n)$ descreve estritamente a travessia de uma árvore B-Tree para buscar uma única chave em um índice com $n$ entradas.  
A avaliação de uma política RLS em tempo de execução envolve muito mais do que uma busca isolada:
1. **Avaliação por Tupla Candidata:** Em comandos `SELECT`, `UPDATE` ou `DELETE`, o predicado RLS é avaliado contra as tuplas examinadas da tabela alvo;
2. **Subqueries e Junções:** Em políticas como `item_orcamento_select_policy` ou `area_select_policy`, a cláusula `EXISTS (...)` transforma-se internamente em uma operação relacional (um *Semi-Join*, *Nested Loop com Index Scan*, *Hash Semi-Join* ou um *SubPlan* correlacionado). Se o planejador adotar um *Nested Loop*, o custo assintótico para $M$ tuplas candidatas será $O(M \cdot \log n)$, e não simplesmente $O(\log n)$;
3. **Cadeia Dupla de `area`:** Em `area`, a subquery une `item_orcamento` e `orcamento`. O custo total dependerá do método de junção escolhido para os três nós relacionais envolvidos.  
Atribuir complexidade $O(\log n)$ a uma política RLS inteira confunde a estrutura do índice com o algoritmo de execução relacional da consulta.

---

### 4.3. É correto afirmar que as policies não gerarão sequential scans?
**Resposta:** **NÃO.**  
**Fundamentação Técnica e Desmistificação de `Seq Scan`:**  
Afirmar categoricamente "sem sequential scans" é tecnicamente incorreto, metodologicamente falso e contraproducente:
1. **`Seq Scan` Não é Automaticamente um Defeito:** A ocorrência de um `Seq Scan` não constitui automaticamente falha de performance ou problema de modelagem. Trata-se de uma estratégia legítima e frequentemente ótima do PostgreSQL;
2. **Tabelas Pequenas (Ambiente Inicial e Testes):** Quando uma tabela ocupa poucas páginas em disco (cenário típico de tabelas de domínio no início de uso por um jardineiro autônomo), o custo computacional de ler as páginas sequencialmente é inferior ao overhead de ler blocos raiz/folha de índices B-Tree para depois acessar a tabela. Nesses casos, o CBO **sempre escolherá Sequential Scan**, sendo essa a decisão mais rápida;
3. **Outer Table sem Predicado Específico na Query do Cliente:** Em uma consulta ampla como `SELECT * FROM cliente`, o PostgreSQL precisa inspecionar as tuplas da tabela externa antes de aplicar o filtro `auth.uid() = usuario_id`, podendo optar por `Seq Scan` caso o número de páginas seja reduzido;
4. **Critério Correto de Avaliação:** A análise de desempenho não deve reprovar mecanicamente planos que contenham `Seq Scan`. A validação deve concentrar-se em identificar **varreduras sequenciais anômalas** (aquelas ocorrendo em tabelas grandes, com milhares de tuplas, onde um índice altamente seletivo deveria ser utilizado, mas é ignorado por predicados mal formulados ou estatísticas desatualizadas).

---

### 4.4. É possível determinar o custo real das policies sem executar EXPLAIN/EXPLAIN ANALYZE?
**Resposta:** **NÃO.**  
**Fundamentação Técnica Homologada:**  
- O custo de uma política RLS no PostgreSQL não é estático. Ele depende de:
  - Tamanho real das tabelas (`pg_class.relpages`, `reltuples`);
  - Seletividade real das chaves e estatísticas coletadas pelo `ANALYZE`;
  - Parâmetros de hardware e configuração do banco (`shared_buffers`, `work_mem`, `random_page_cost`);
  - Estratégia de reescrita de consultas do PostgreSQL (`pg_rewrite`).
- O comando `EXPLAIN` fornece o custo computacional estimado (*estimated cost*) pelo otimizador;
- Somente o comando `EXPLAIN (ANALYZE, BUFFERS)` executa a consulta de fato, medindo o tempo real decorrido em cada nó da árvore de execução (`actual time`), a quantidade de iterações (`loops`) e o consumo de I/O de memória/disco (`shared hit`, `read`).  
Portanto, determinar custo e tempo de resposta a priori sem execução empírica é mera especulação.

---

### 4.5. A consulta relacional do PostgREST deve ser descrita como “um único plano de execução” ou precisa ser reformulada?
**Resposta:** **PRECISA SER REFORMULADA.**  
**Fundamentação Técnica Homologada:**  
O PostgREST constrói uma consulta SQL parametrizada a partir da URL da API (usando operadores `to_jsonb`, `json_agg` e subconsultas LATERAL ou sub-SELECTs para compor as relações hierárquicas solicitadas pelo cliente).  
O PostgreSQL submete essa consulta SQL inteira à sua fase de reescrita de segurança (`pg_rewrite`), na qual **injeta as políticas de RLS como qualificadores booleanos adicionais em cada nó da árvore de tabelas**.  
Embora o PostgreSQL elabore um único plano de execução geral para a declaração resultante, esse plano pode conter **múltiplos subplanos interdependentes (*SubPlans*, *InitPlans*)** e loops aninhados para avaliar as subqueries de RLS caso não consiga desmembrá-las em junções (*decorrelation*).  
Afirmar de forma simplista que "não há sobrecarga apreciável" ignora o impacto potencial que subqueries correlacionadas em múltiplos níveis de aninhamento podem causar na geração do plano. Essa declaração deve ser expressa como uma **hipótese técnica plausível**, a ser confirmada nos testes de integração.

---

### 4.6. Quais partes podem ser consideradas propriedades estruturais do modelo?
As propriedades estruturais são aquelas garantidas matematicamente ou fisicamente pelo DDL da migration homologada `20260916020500_modelo_fisico_v1_1.sql`:
1. **Existência de Índices B-Tree de Cobertura para Chaves Estrangeiras:**
   - `idx_cliente_usuario_id` em `cliente(usuario_id)`
   - `idx_servico_usuario_id` em `servico(usuario_id)`
   - `idx_produto_usuario_id` em `produto(usuario_id)`
   - `idx_orcamento_usuario_id` em `orcamento(usuario_id)`
   - `idx_orcamento_cliente_id` em `orcamento(cliente_id)`
   - `idx_orcamento_status` em `orcamento(status)`
   - `idx_item_orcamento_orcamento_id` em `item_orcamento(orcamento_id)`
   - `idx_item_orcamento_servico_id` em `item_orcamento(servico_id)`
   - `idx_item_orcamento_produto_id` em `item_orcamento(produto_id)`
   - `idx_area_item_orcamento_id` em `area(item_orcamento_id)`
2. **Existência de Índices de Chave Primária (B-Tree Únicos):**  
   Garantem acesso direto a registros pontuais por `id` em `usuario`, `cliente`, `endereco`, `servico`, `produto`, `orcamento`, `item_orcamento`, `area`;
3. **Índice Espacial GiST:** `idx_area_geometria` em `area(geometria)` para filtros espaciais PostGIS;
4. **Tipagem e Operadores:** Uso de tipos nativos `UUID`, inteiros e booleanos, com operadores de igualdade indexáveis (`=`) e ausência de chamadas a funções lentas ou não determinísticas nos predicados das políticas.

---

### 4.7. Quais partes precisam ser tratadas como hipóteses de performance?
As seguintes asserções deixam de ser afirmações categóricas e passam a ser tratadas formalmente como **hipóteses técnicas**:

- **Hipótese H1 (Uso Efetivo de Índices em Escala):**  
  *À medida que a base de dados atingir dezenas de páginas de disco por tenant, o planejador do PostgreSQL selecionará planos de acesso indexado (Index Scan ou Bitmap Index Scan) para avaliar os filtros de RLS em consultas filtradas por `usuario_id` ou chaves estrangeiras.*
- **Hipótese H2 (Descorrelação de Subqueries pelo Otimizador):**  
  *O otimizador do PostgreSQL conseguirá transformar os predicados `WHERE EXISTS (SELECT 1 FROM ...)` das políticas de `item_orcamento` e `area` em Semi-Joins eficientes, evitando a execução redundante de SubPlans correlacionados tupla a tupla.*
- **Hipótese H3 (Tempo de Resposta em Consultas Hierárquicas — Reenquadramento):**  
  *Consultas compostas que recuperam orçamentos com seus respectivos itens e áreas via Data API (PostgREST) manterão latência de processamento adequada à experiência mobile para a volumetria típica de um profissional de jardinagem.*  
  > [!WARNING]
  > **Nota Técnica de Desassociação de Requisito (100ms):**  
  > O valor preliminar de 100ms mencionado em relatórios anteriores **NÃO possui respaldo ou fundamentação nos requisitos atuais (RNF v2 / RF v2)** e **NÃO deve ser interpretado como requisito formal nem garantia arquitetural**.  
  > Esse patamar atua exclusivamente como uma **meta experimental preliminar interna de engenharia**, sujeita a reavaliação empírica ou à posterior formalização em documento de Requisitos Não Funcionais. Não se inventa nem se assume qualquer teto numérico como exigência de negócio nesta etapa.
- **Hipótese H4 (Eficiência da Restrição de Status em DELETE):**  
  *A avaliação combinada de `auth.uid() = usuario_id AND status = 'RASCUNHO'` na policy de DELETE homologada (D2) operará com custo mínimo, aproveitando os índices existentes em `usuario_id` e `status` sem degradação perceptível.*

---

### 4.8. Detalhamento e Limitações do Plano de Consultas C1–C6

Deverão ser submetidas a teste empírico 6 consultas representativas do ciclo de vida, avaliadas individualmente quanto a seus objetivos, componentes, relação com RLS e limitações:

#### 1. Consulta C1 — Listagem de Clientes (Política Direta)
```sql
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT * FROM public.cliente;
```
- **Objetivo:** Avaliar o comportamento de acesso a uma tabela de catálogo primário sob o papel `authenticated`;
- **Componente Avaliado:** `cliente_select_policy` (`USING (auth.uid() = usuario_id)`);
- **Relação com RLS:** Testa a injeção do filtro direto de titularidade contra o claim JWT do usuário;
- **Limitações da Medição:** Em tabelas com poucos clientes (cenário de testes com dezenas de linhas), o PostgreSQL tenderá a usar `Seq Scan`. A medição isolada de C1 avalia a leitura pura da tabela `cliente`, sem medir o carregamento de seu `endereco` associado.

#### 2. Consulta C2 — Listagem de Orçamentos Filtrados por Status (Filtro Composto)
```sql
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT * FROM public.orcamento WHERE status = 'RASCUNHO';
```
- **Objetivo:** Avaliar como o CBO combina o predicado explícito da query do usuário (`status = 'RASCUNHO'`) com a cláusula de segurança injetada pelo RLS (`auth.uid() = usuario_id`);
- **Componente Avaliado:** `orcamento_select_policy` em conjunto com a cláusula `WHERE status = ...`;
- **Relação com RLS:** Verifica a interação entre dois índices existentes na migration: `idx_orcamento_usuario_id` e `idx_orcamento_status` (possibilidade de *BitmapAnd* ou seleção do índice de maior seletividade);
- **Limitações da Medição:** A escolha do índice dependerá criticamente da proporção de orçamentos em rascunho versus orçamentos finalizados na massa de dados.

#### 3. Consulta C3 — Consulta de Itens de Orçamento (Navegação em Cadeia Simples)
```sql
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT * FROM public.item_orcamento WHERE orcamento_id = :orcamento_id;
```
- **Objetivo:** Avaliar o custo de segurança por cadeia relacional de primeiro nível;
- **Componente Avaliado:** `item_orcamento_select_policy` (`USING (EXISTS (SELECT 1 FROM orcamento o WHERE o.id = item_orcamento.orcamento_id AND o.usuario_id = auth.uid()))`);
- **Relação com RLS:** Avalia se o predicado `EXISTS` é transformado pelo otimizador em um *Hash Semi Join* ou se é executado como um *SubPlan* iterativo;
- **Limitações da Medição:** Se a query já filtra `orcamento_id = :id` (que possui índice `idx_item_orcamento_orcamento_id`), o conjunto candidato de itens é muito restrito, o que mascara possíveis custos de varreduras amplas que ocorreriam se um usuário tentasse listar todos os itens de todos os seus orçamentos de uma só vez.

#### 4. Consulta C4 — Consulta de Áreas de um Item (Navegação em Cadeia Dupla)
```sql
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT * FROM public.area WHERE item_orcamento_id = :item_id;
```
- **Objetivo:** Avaliar o custo de segurança por cadeia relacional de segundo nível (junção dupla);
- **Componente Avaliado:** `area_select_policy` (`USING (EXISTS (SELECT 1 FROM item_orcamento io JOIN orcamento o ON o.id = io.orcamento_id WHERE io.id = area.item_orcamento_id AND o.usuario_id = auth.uid()))`);
- **Relação com RLS:** Avalia o encadeamento de 3 tabelas (`area -> item_orcamento -> orcamento`) para validar a posse da área pelo usuário autenticado;
- **Limitações da Medição:** Como uma área física de jardim está ligada a um item específico, a consulta pontual acessa poucos registros. O teste não reflete diretamente o impacto de renderizar dezenas de polígonos simultâneos na interface do mapa.

#### 5. Consulta C5 — Deleção Condicionada Homologada (D2)
```sql
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
DELETE FROM public.orcamento WHERE id = :id;
```
- **Objetivo:** Avaliar o overhead de autorização da policy de DELETE homologada em D2;
- **Componente Avaliado:** `orcamento_delete_policy` (`USING (auth.uid() = usuario_id AND status = 'RASCUNHO')`);
- **Relação com RLS:** Verifica a eficiência do PostgreSQL em validar simultaneamente `auth.uid()`, `id = :id` e `status = 'RASCUNHO'` antes de autorizar a exclusão;
- **Limitações da Medição:** A medição do comando `DELETE` testa apenas o tempo de autorização e remoção no nó `orcamento`. Não mede o tempo gasto pela constraint de integridade `ON DELETE RESTRICT` (que verifica a existência de itens filhos em `item_orcamento`).

#### 6. Consulta C6 — Montagem Completa de Orçamento (Padrão PostgREST com Embedding Relacional)
```sql
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT o.*, 
       (SELECT json_agg(io.*) 
        FROM public.item_orcamento io 
        WHERE io.orcamento_id = o.id) AS itens
FROM public.orcamento o
WHERE o.id = :id;
```
- **Objetivo:** Avaliar o comportamento de desempenho da consulta composta típica emitida pelo aplicativo mobile ao abrir os detalhes de um orçamento;
- **Componente Avaliado:** A árvore relacional completa de `orcamento` e `item_orcamento` sob injeção simultânea de RLS em múltiplos níveis com agregação JSON;
- **Relação com RLS:** O RLS injeta `orcamento_select_policy` na tabela externa e `item_orcamento_select_policy` na subconsulta interna;
- **LIMITAÇÃO E DISTINÇÃO FUNDAMENTAL DA MEDIÇÃO (ATENÇÃO):**  
  > [!IMPORTANT]
  > O resultado obtido em C6 **NÃO representa exclusivamente o custo do RLS**.  
  > C6 mede o comportamento **INTEGRADO e INDISSOCIÁVEL** da pilha:  
  > $$\text{PostgREST (ou agregação JSON)} + \text{Consulta Relacional Estrutural} + \text{Motor PostgreSQL} + \text{Políticas RLS}$$  
  > Atribuir eventuais variações de latência em C6 unicamente ao RLS constituiria erro metodológico, pois a serialização JSON e as subconsultas agregadas possuem custo de CPU próprio no PostgreSQL, independente do RLS estar ativado ou desativado.

---

### 4.9. Quais métricas devem ser observadas?
Nos testes empíricos de execução, deverão ser registradas obrigatoriamente:
1. **Tipo de Varredura por Tabela (Scan Type):** `Index Scan`, `Index Only Scan`, `Bitmap Index Scan` ou `Seq Scan`;
2. **Tipo de Junção (Join Type):** `Nested Loop`, `Hash Join`, `Merge Join`, `Hash Semi Join` ou `SubPlan`;
3. **Total Planning Time:** Tempo gasto pelo PostgreSQL para analisar a query, reescrever as policies RLS e gerar o plano (em milissegundos);
4. **Total Execution Time:** Tempo real de execução no motor (em milissegundos);
5. **Consumo de Buffers (I/O):**
   - `Shared Hit Blocks`: blocos encontrados em memória cache;
   - `Shared Read Blocks`: blocos lidos do disco;
6. **Acurácia do Otimizador:** Relação entre linhas estimadas (`rows=...`) e linhas reais retornadas (`actual rows=...`).

---

### 4.10. Em que momento essa validação deve ocorrer no projeto?
- **Momento Homologado:**  
  A validação empírica com `EXPLAIN (ANALYZE, BUFFERS)` **deve ocorrer exclusivamente durante a etapa de testes de integração da futura migration de Auth/RLS** (conforme planejado nas Decisões 11 e 14 da estratégia geral), utilizando a instância real do PostgreSQL no ambiente Docker local do Supabase, semeada com uma massa de dados de teste controlada (múltiplos usuários, dezenas de clientes, catálogos e orçamentos com múltiplos itens e áreas).  
  **Nenhuma medição é executada na presente etapa.**

---

## 5. Classificação das Afirmações de Performance

Adota-se a seguinte taxonomia para as asserções de desempenho:
- **GARANTIA ESTRUTURAL:** Propriedade garantida pela arquitetura física e esquema de dados (índices criados, tipagem e constraints);
- **HIPÓTESE:** Comportamento provável baseado no design relacional, dependente de volume de dados e das decisões do CBO;
- **NÃO COMPROVADA:** Afirmação que generaliza ou antecipa comportamento do motor sem fundamentação teórica válida (deve ser removida/reformulada);
- **NECESSITA MEDIÇÃO:** Ponto de atenção que exige aferição empírica via `EXPLAIN (ANALYZE, BUFFERS)` com massa de dados de teste.

---

## 6. Matriz Consolidada de Revisão de Performance

| # | Afirmação Original (v1.5) | Situação Atual | Classificação | Fundamentação Técnica | Validação Futura |
|---|---|---|---|---|---|
| **1** | *"Todas as colunas envolvidas nas subqueries já possuem índices B-Tree..."* | **Mantida integralmente** | **GARANTIA ESTRUTURAL** | Os 10 índices relacionais e 1 espacial estão definidos na migration `20260916020500_modelo_fisico_v1_1.sql`. | Verificação no catálogo `pg_indexes`. |
| **2** | *"As buscas utilizam index lookups..."* | **Reformulada para Hipótese (H1)** | **HIPÓTESE** | O índice viabiliza o caminho indexado, mas o CBO do PostgreSQL decidirá se o adota com base no custo estimado e volume de páginas. | `EXPLAIN (ANALYZE, BUFFERS)` nas consultas C1–C6. |
| **3** | *"...de complexidade $O(\log n)$..."* | **Removida da estratégia geral** | **NÃO COMPROVADA** | $O(\log n)$ aplica-se à árvore de índice isolada, não à execução de políticas RLS com subqueries correlacionadas e junções. | Mensuração do tempo de execução vs número de tuplas. |
| **4** | *"...sem sequential scans."* | **Removida da estratégia geral** | **NÃO COMPROVADA** | O PostgreSQL utiliza intencionalmente `Seq Scan` em tabelas pequenas ou baixa seletividade, sendo essa a decisão mais rápida. `Seq Scan` não é erro. | Análise de `Scan Type` e custos no `EXPLAIN`. |
| **5** | *"Não há sobrecarga apreciável para os volumes previstos..."* | **Reformulada para Hipótese (H3)** | **NECESSITA MEDIÇÃO** | O valor de 100ms não é requisito oficial; a sobrecarga da pilha integrada (PostgREST + RLS) precisa ser aferida em teste. | Benchmark local com massa de dados representativa. |
| **6** | *"Subqueries de item_orcamento e area são eficientes"* | **Reformulada para Hipótese (H2)** | **HIPÓTESE** | Depende da capacidade do PostgreSQL descorrelacionar os predicados `EXISTS` em Semi-Joins indexados. | Inspeção de nós `SubPlan` vs `Hash Semi Join` no `EXPLAIN`. |
| **7** | *"Filtro adicional de status = 'RASCUNHO' no DELETE não degrada"* | **Nova formulação (H4 / D2)** | **HIPÓTESE** | Há índices `idx_orcamento_status` e `idx_orcamento_usuario_id` para cobrir o predicado composto. | `EXPLAIN (ANALYZE, BUFFERS)` no comando `DELETE` (C5). |

---

## 7. Plano de Validação Futura

O roteiro de testes de validação de performance será estruturado em 4 fases sequenciais durante a etapa de validação da migration de Auth/RLS:

```text
+---------------------------------------------------------------------------------------------------+
|                                 ROTEIRO DE VALIDAÇÃO DE PERFORMANCE                               |
+---------------------------------------------------------------------------------------------------+
| FASE 1: Preparação do Ambiente Local                                                              |
| - Instância do PostgreSQL no Supabase Docker local;                                               |
| - Aplicação da migration de dados e da futura migration de Auth/RLS;                              |
| - Execução do comando VACUUM ANALYZE para atualizar as estatísticas de pg_statistic.              |
+---------------------------------------------------------------------------------------------------+
| FASE 2: Geração de Massa de Testes Controlada (Seed)                                              |
| - Tenant A: 50 clientes, 100 serviços, 100 produtos, 200 orçamentos, 1.000 itens, 2.000 áreas;    |
| - Tenant B: 10 clientes, 20 serviços, 20 produtos, 30 orçamentos, 150 itens, 300 áreas.           |
+---------------------------------------------------------------------------------------------------+
| FASE 3: Execução de Consultas Instrumentadas (C1 a C6)                                            |
| - Sessão configurada com SET LOCAL ROLE authenticated e JWT claim de Tenant A;                    |
| - Execução sistemática das Consultas C1 a C6 via script automatizado com EXPLAIN (ANALYZE, BUFFERS)|
+---------------------------------------------------------------------------------------------------+
| FASE 4: Análise de Métricas e Ajustes (se necessário)                                             |
| - Verificação de presença indevida de SubPlans iterativos de alto custo;                          |
| - Avaliação de tempos de resposta e consumo de buffers de memória (Shared Hit vs Read);           |
| - Registro das evidências em relatório de validação empírica.                                     |
+---------------------------------------------------------------------------------------------------+
```

---

## 8. Consultas e Políticas que Deverão ser Testadas

As seguintes políticas homologadas serão formalmente instrumentadas com scripts SQL no ambiente local:

1. **`cliente_select_policy`** (`auth.uid() = usuario_id`);
2. **`servico_select_policy`** (`auth.uid() = usuario_id`);
3. **`produto_select_policy`** (`auth.uid() = usuario_id`);
4. **`orcamento_select_policy`** (`auth.uid() = usuario_id`);
5. **`item_orcamento_select_policy`** (subquery `EXISTS` via `orcamento`);
6. **`area_select_policy`** (subquery `EXISTS` em cadeia dupla via `item_orcamento -> orcamento`);
7. **`orcamento_delete_policy`** (homologada em D2: `auth.uid() = usuario_id AND status = 'RASCUNHO'`);
8. **`item_orcamento_delete_policy`** (homologada em D2: subquery `EXISTS` com `o.status = 'RASCUNHO'`);
9. **`area_delete_policy`** (homologada em D2: subquery `EXISTS` em cadeia com `o.status = 'RASCUNHO'`).

---

## 9. Métricas a Observar e Critérios de Aceite Provisórios

Para cada consulta submetida ao `EXPLAIN (ANALYZE, BUFFERS)`, os parâmetros de observação técnica serão:

| Critério | Métrica Observada | Meta Experimental Provisória (Engenharia) | Observação Técnica / Ponto de Atenção |
|---|---|---|---|
| **Tempo de Execução** | `Total Execution Time` | Referência preliminar $< 100\text{ ms}$ | Não constitui requisito formal de negócio. Sujeito a calibração com dados reais. |
| **Tempo de Planejamento** | `Total Planning Time` | $< 15\text{ ms}$ | Avalia o overhead de reescrita das queries pelo RLS. |
| **Acesso a Dados** | `Scan Type` | `Seq Scan` aceito em tabelas pequenas; `Index Scan` esperado em tabelas com $> 1.000$ linhas | `Seq Scan` em tabelas pequenas **não é falha**. Alerta apenas se tabela for grande e o predicado altamente seletivo for ignorado. |
| **Operação de Subquery** | `Node Type` em RLS | `Semi Join` ou `Hash Semi Join` preferíveis | Alerta para nós `SubPlan` correlacionados com contagem elevada de `loops`. |
| **Eficiência de Memória** | `Shared Buffers` | Maximização de `Shared Hit` | Leituras massivas de disco (`Shared Read`) para conjuntos pequenos de dados. |

---

## 10. Conclusão

A presente revisão técnica estabelece que:
1. **Afirmações Categóricas Foram Readequadas:** As alegações de ausência total de *sequential scans* e de complexidade algorítmica uniforme $O(\log n)$ foram identificadas como generalizações insustentáveis e removidas da linha argumentativa estratégica;
2. **O Modelo Físico v1.1 Fornece Respaldo Estrutural Sólido:** Todos os índices relacionais necessários para apoiar a navegação em cadeia de `cliente`, `orcamento`, `item_orcamento` e `area` já estão materializados no DDL congelado;
3. **Reenquadramento de H3 e C6:** A meta de 100ms é tratada estritamente como parâmetro experimental provisório de bancada, desvinculada de requisitos formais, e a Consulta C6 fica expressamente definida como medição da pilha integrada (PostgREST + SQL + PostgreSQL + RLS), e não do custo isolado do RLS;
4. **Desmistificação de `Seq Scan`:** Fica registrado com clareza conceitual que `Seq Scan` é uma escolha legítima do otimizador do PostgreSQL em tabelas compactas e não configura erro por si só.

---

## 11. Decisões Homologadas do Ponto 5

Registram-se formalmente como **HOMOLOGADAS** as seguintes decisões técnicas consolidadas do Ponto 5:

- **Decisão P5-1 (HOMOLOGADA):** Homologar a **revisão e expurgo** das afirmações não comprovadas de ausência absoluta de *sequential scans*, de complexidade algorítmica $O(\log n)$ e de sobrecarga não apreciável da documentação estratégica do projeto, reconhecendo que tais asserções não constituem garantias do sistema;
- **Decisão P5-2 (HOMOLOGADA):** Homologar a **classificação da cobertura de índices da migration v1.1 como Garantia Estrutural**, confirmando que o modelo relacional aprovado fornece os caminhos de acesso necessários para a navegação por cadeia das políticas de RLS, embora sua utilização efetiva pelo PostgreSQL dependa do plano escolhido pelo otimizador (CBO);
- **Decisão P5-3 (HOMOLOGADA):** Homologar a **manutenção de H1 e H2 como hipóteses técnicas a serem validadas empiricamente**, bem como o **reenquadramento de H3**, estabelecendo expressamente que H3 **não fixa requisito de 100 ms** (o qual permanece apenas como meta/critério experimental provisório de engenharia interna);
- **Decisão P5-4 (HOMOLOGADA):** Homologar a **especificação do plano de consultas C1–C6 como roteiro formal de validação futura**, com discriminação de limitações e registro explícito de que C6 avalia o comportamento integrado de $\text{PostgREST} + \text{consulta relacional com agregação JSON} + \text{PostgreSQL} + \text{RLS}$, e não exclusivamente o custo isolado do RLS;
- **Decisão P5-5 (HOMOLOGADA):** Homologar a diretriz técnica de que **ocorrências de `Seq Scan` não constituem automaticamente falhas ou defeitos**, devendo a análise empírica futura considerar o plano global de execução, custos e volumetria das tabelas;
- **Decisão P5-6 (HOMOLOGADA):** Homologar o **Plano de Validação de Performance via `EXPLAIN (ANALYZE, BUFFERS)`**, determinando que a mensuração ocorrerá futuramente, com massa de dados multi-tenant representativa, exclusivamente durante a etapa de testes de integração da futura migration de Auth/RLS.
