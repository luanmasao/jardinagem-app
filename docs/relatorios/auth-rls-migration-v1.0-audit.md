# Relatório de Auditoria Estática da Migration Auth + RLS v1.0

**Documento de Auditoria Técnica de Código SQL (Sem Execução)**  
**Objeto Auditado:** `supabase/migrations/20260921000000_auth_rls.sql`  
**Status da Migration:** APTA À HOMOLOGAÇÃO  
**Data da Auditoria:** 2026-09-20  
**Autor:** Auditoria Técnica de Arquitetura e Engenharia de Software  

---

## 1. Escopo e Princípios da Auditoria

O presente documento relata a **auditoria estática independente e exaustiva** realizada sobre o arquivo físico da migration dedicada:
> [`supabase/migrations/20260921000000_auth_rls.sql`](file:///c:/Users/luanh/Documents/jardinagem-app/supabase/migrations/20260921000000_auth_rls.sql)

A auditoria teve por objetivo determinar se a migration traduz com exatidão matemática, relacional e de segurança todas as decisões homologadas no Plano Executivo e na Estratégia Canônica, **sem aplicar qualquer instrução SQL ao banco de dados**.

### Salvaguardas Rígidas de Governança
- **NENHUMA EXECUÇÃO DE SQL:** Não foi disparado `supabase migration up`, `supabase db reset`, nem executado script no SGBD;
- **NENHUMA ALTERAÇÃO NO BANCO DE DADOS:** A instância local do PostgreSQL permaneceu intocada;
- **PRESERVAÇÃO DA MIGRATION CONGELADA:** O arquivo `supabase/migrations/20260916020500_modelo_fisico_v1_1.sql` permaneceu intocado;
- **PRESERVAÇÃO DOS DOCUMENTOS CANÔNICOS:** Não houve edição de regras, requisitos, modelos físicos ou diagramas.

---

## 2. Fontes Canônicas Utilizadas

1. [`docs/relatorios/auth-rls-strategy-v1.6.md`](file:///c:/Users/luanh/Documents/jardinagem-app/docs/relatorios/auth-rls-strategy-v1.6.md) (HOMOLOGADA DOCUMENTALMENTE);
2. [`docs/relatorios/auth-rls-strategy-v1.6-audit-v1.0.md`](file:///c:/Users/luanh/Documents/jardinagem-app/docs/relatorios/auth-rls-strategy-v1.6-audit-v1.0.md) (HOMOLOGADA);
3. [`docs/relatorios/auth-rls-implementation-plan-v1.0.md`](file:///c:/Users/luanh/Documents/jardinagem-app/docs/relatorios/auth-rls-implementation-plan-v1.0.md) (HOMOLOGADA);
4. [`docs/relatorios/auth-rls-implementation-plan-v1.0-final-audit.md`](file:///c:/Users/luanh/Documents/jardinagem-app/docs/relatorios/auth-rls-implementation-plan-v1.0-final-audit.md);
5. [`docs/relatorios/auth-rls-implementation-plan-v1.0-homologation.md`](file:///c:/Users/luanh/Documents/jardinagem-app/docs/relatorios/auth-rls-implementation-plan-v1.0-homologation.md);
6. [`supabase/migrations/20260916020500_modelo_fisico_v1_1.sql`](file:///c:/Users/luanh/Documents/jardinagem-app/supabase/migrations/20260916020500_modelo_fisico_v1_1.sql) (CONGELADA).

---

## 3. Inventário Geral dos Objetos Definidos no SQL

| # | Tipo de Objeto | Identificador / Assinatura | Schema | Finalidade Arquitetural | Classificação |
|---|---|---|---|---|---|
| 1 | **Schema** | `private` | SGBD | Isolamento fora da publicação PostgREST | **CONFORME** |
| 2 | **Função** | `handle_new_user()` | `private` | Bootstrap atômico de perfil em `public.usuario` | **CONFORME** |
| 3 | **Hardening** | `SET search_path = ''` | `private` | Proteção estática contra hijacking | **CONFORME** |
| 4 | **Revogação** | `REVOKE ALL / EXECUTE` | `private` | Menor privilégio (`PUBLIC`, `anon`, `authenticated`) | **CONFORME** |
| 5 | **Trigger** | `on_auth_user_created` | `auth` | Disparo `AFTER INSERT ON auth.users` | **CONFORME** |
| 6 | **RLS Direct** | `ENABLE ROW LEVEL SECURITY` | `public` | Habilitado em 8 tabelas de domínio (sem `FORCE`) | **CONFORME** |
| 7 | **Policies** | 31 Políticas RLS | `public` | 19 diretas + 12 em cadeia | **CONFORME** |

---

## 4. Auditoria Estrutural dos Componentes Críticos

### 4.1. Schema Privado (`private`)
- **Comando:** `CREATE SCHEMA IF NOT EXISTS private;`
- **Análise:** O schema foi criado com cláusula `IF NOT EXISTS` compatível com o padrão de idempotência do PostgreSQL. Reside fora da lista de schemas expostos pelo PostgREST (`schemas = ["public"]`), eliminando qualquer possibilidade de exposição acidental de rotinas ou endpoints REST para a internet.
- **Resultado:** **CONFORME**.

### 4.2. Função de Bootstrap (`private.handle_new_user()`)
- **Assinatura e Modificadores:**
  - `RETURNS trigger`
  - `LANGUAGE plpgsql`
  - `SECURITY DEFINER` (executa sob os privilégios do proprietário `postgres`)
  - `SET search_path = ''` (search path estaticamente vazio)
- **Hardening de Qualificação:** Todas as referências a objetos do banco são estritamente schema-qualified: `INSERT INTO public.usuario (id, nome, telefone)`.
- **Validação de Entrada:** Valida a presença obrigatória do nome (`NEW.raw_user_meta_data->>'nome' IS NULL OR trim(...) = ''`), disparando `RAISE EXCEPTION` em caso de omissão, garantindo que o cadastro em `auth.users` não seja efetivado sem o respectivo perfil da aplicação.
- **Tratamento de Dados:** Aplica `trim()` no nome e `nullif(trim(...), '')` no telefone.
- **Privilégios:**
  - `REVOKE ALL ON FUNCTION private.handle_new_user() FROM PUBLIC;`
  - `REVOKE EXECUTE ON FUNCTION private.handle_new_user() FROM anon, authenticated;`
  - Nenhuma permissão indevida concedida a `supabase_auth_admin` (desnecessária no PostgreSQL para triggers DML nativas).
- **Resultado:** **CONFORME**.

### 4.3. Trigger Nativa (`auth.users`)
- **Comando:**
  ```sql
  CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION private.handle_new_user();
  ```
- **Análise:** A trigger utiliza a sintaxe padrão PostgreSQL 14+ (`CREATE OR REPLACE TRIGGER`), atrelada estritamente ao evento `AFTER INSERT ON auth.users` em nível de linha (`FOR EACH ROW`), acionando o procedimento `private.handle_new_user()`.
- **Integridade do Catálogo:** Nenhuma coluna, restrição ou índice da tabela `auth.users` é modificado.
- **Resultado:** **CONFORME**.

### 4.4. Habilitação de RLS e Rejeição de `FORCE RLS`
- As 8 tabelas de domínio possuem declaração explícita de `ENABLE ROW LEVEL SECURITY`:
  1. `ALTER TABLE public.usuario ENABLE ROW LEVEL SECURITY;`
  2. `ALTER TABLE public.cliente ENABLE ROW LEVEL SECURITY;`
  3. `ALTER TABLE public.servico ENABLE ROW LEVEL SECURITY;`
  4. `ALTER TABLE public.produto ENABLE ROW LEVEL SECURITY;`
  5. `ALTER TABLE public.orcamento ENABLE ROW LEVEL SECURITY;`
  6. `ALTER TABLE public.endereco ENABLE ROW LEVEL SECURITY;`
  7. `ALTER TABLE public.item_orcamento ENABLE ROW LEVEL SECURITY;`
  8. `ALTER TABLE public.area ENABLE ROW LEVEL SECURITY;`
- **Auditoria de `FORCE`:** Não há nenhum comando `FORCE ROW LEVEL SECURITY`. A rejeição de `FORCE` garante que a role superusuária `postgres` e a função `private.handle_new_user()` operem com o bypass nativo de RLS, eliminando bloqueios catastróficos durante o provisionamento atômico do perfil.
- **Resultado:** **CONFORME**.

---

## 5. Auditoria Individual Exaustiva das 31 Políticas de RLS

A tabela a seguir consolida a auditoria individual de cada uma das 31 policies definidas no arquivo SQL:

| # | Tabela | Operação | Nome da Policy | Cláusula USING | Cláusula WITH CHECK | Regra de Titularidade / Negócio | Origem Documental | Resultado |
|---|---|---|---|---|---|---|---|---|
| 1 | `usuario` | `SELECT` | `usuario_select_policy` | `(auth.uid() = id)` | *N/A* | Próprio perfil | Estratégia v1.6 (Seção 13) | **CONFORME** |
| 2 | `usuario` | `INSERT` | `usuario_insert_policy` | *N/A* | `(auth.uid() = id)` | Próprio perfil (fallback defensivo) | Estratégia v1.6 (Seção 8.2 / 13) | **CONFORME** |
| 3 | `usuario` | `UPDATE` | `usuario_update_policy` | `(auth.uid() = id)` | `(auth.uid() = id)` | Próprio perfil / Inativação lógica | Estratégia v1.6 (Seção 13) | **CONFORME** |
| *—* | `usuario` | `DELETE` | *SEM POLICY* | *N/A* | *N/A* | **Default Deny Estrito (Decisão D1)** | Estratégia v1.6 (Seção 12 / 13) | **CONFORME** |
| 4 | `cliente` | `SELECT` | `cliente_select_policy` | `(auth.uid() = usuario_id)` | *N/A* | Carteira própria | Estratégia v1.6 (Seção 13) | **CONFORME** |
| 5 | `cliente` | `INSERT` | `cliente_insert_policy` | *N/A* | `(auth.uid() = usuario_id)` | Carteira própria | Estratégia v1.6 (Seção 13) | **CONFORME** |
| 6 | `cliente` | `UPDATE` | `cliente_update_policy` | `(auth.uid() = usuario_id)` | `(auth.uid() = usuario_id)` | Carteira própria (anti-transferência) | Estratégia v1.6 (Seção 13) | **CONFORME** |
| 7 | `cliente` | `DELETE` | `cliente_delete_policy` | `(auth.uid() = usuario_id)` | *N/A* | Carteira própria (FK RESTRICT) | Estratégia v1.6 (Seção 13 / 16) | **CONFORME** |
| 8 | `servico` | `SELECT` | `servico_select_policy` | `(auth.uid() = usuario_id)` | *N/A* | Catálogo próprio | Estratégia v1.6 (Seção 13) | **CONFORME** |
| 9 | `servico` | `INSERT` | `servico_insert_policy` | *N/A* | `(auth.uid() = usuario_id)` | Catálogo próprio | Estratégia v1.6 (Seção 13) | **CONFORME** |
| 10 | `servico` | `UPDATE` | `servico_update_policy` | `(auth.uid() = usuario_id)` | `(auth.uid() = usuario_id)` | Catálogo próprio | Estratégia v1.6 (Seção 13) | **CONFORME** |
| 11 | `servico` | `DELETE` | `servico_delete_policy` | `(auth.uid() = usuario_id)` | *N/A* | Catálogo próprio (FK RESTRICT) | Estratégia v1.6 (Seção 13 / 16) | **CONFORME** |
| 12 | `produto` | `SELECT` | `produto_select_policy` | `(auth.uid() = usuario_id)` | *N/A* | Insumos próprios | Estratégia v1.6 (Seção 13) | **CONFORME** |
| 13 | `produto` | `INSERT` | `produto_insert_policy` | *N/A* | `(auth.uid() = usuario_id)` | Insumos próprios | Estratégia v1.6 (Seção 13) | **CONFORME** |
| 14 | `produto` | `UPDATE` | `produto_update_policy` | `(auth.uid() = usuario_id)` | `(auth.uid() = usuario_id)` | Insumos próprios | Estratégia v1.6 (Seção 13) | **CONFORME** |
| 15 | `produto` | `DELETE` | `produto_delete_policy` | `(auth.uid() = usuario_id)` | *N/A* | Insumos próprios (FK RESTRICT) | Estratégia v1.6 (Seção 13 / 16) | **CONFORME** |
| 16 | `orcamento` | `SELECT` | `orcamento_select_policy` | `(auth.uid() = usuario_id)` | *N/A* | Orçamentos próprios | Estratégia v1.6 (Seção 13) | **CONFORME** |
| 17 | `orcamento` | `INSERT` | `orcamento_insert_policy` | *N/A* | `auth.uid() = usuario_id AND EXISTS (c.id = cliente_id AND c.usuario_id = auth.uid())` | Orçamento próprio + Anti-cross-tenant cliente | Estratégia v1.6 (Seção 13 / 15) | **CONFORME** |
| 18 | `orcamento` | `UPDATE` | `orcamento_update_policy` | `(auth.uid() = usuario_id)` | `auth.uid() = usuario_id AND EXISTS (c.id = cliente_id AND c.usuario_id = auth.uid())` | Orçamento próprio + Anti-cross-tenant cliente | Estratégia v1.6 (Seção 13 / 15) | **CONFORME** |
| 19 | `orcamento` | `DELETE` | `orcamento_delete_policy` | `auth.uid() = usuario_id AND status = 'RASCUNHO'` | *N/A* | **Decisão D2:** Exclusão exclusiva em RASCUNHO | Estratégia v1.6 (Seção 13); D2 | **CONFORME** |
| 20 | `endereco` | `SELECT` | `endereco_select_policy` | `EXISTS (c.id = endereco.cliente_id AND c.usuario_id = auth.uid())` | *N/A* | Cadeia simples via cliente | Estratégia v1.6 (Seção 14) | **CONFORME** |
| 21 | `endereco` | `INSERT` | `endereco_insert_policy` | *N/A* | `EXISTS (c.id = cliente_id AND c.usuario_id = auth.uid())` | Cadeia simples via cliente | Estratégia v1.6 (Seção 14) | **CONFORME** |
| 22 | `endereco` | `UPDATE` | `endereco_update_policy` | `EXISTS (c.id = endereco.cliente_id AND c.usuario_id = auth.uid())` | `EXISTS (c.id = cliente_id AND c.usuario_id = auth.uid())` | Cadeia simples via cliente | Estratégia v1.6 (Seção 14) | **CONFORME** |
| 23 | `endereco` | `DELETE` | `endereco_delete_policy` | `EXISTS (c.id = endereco.cliente_id AND c.usuario_id = auth.uid())` | *N/A* | Cadeia simples via cliente | Estratégia v1.6 (Seção 14) | **CONFORME** |
| 24 | `item_orcamento` | `SELECT` | `item_orcamento_select_policy` | `EXISTS (o.id = item_orcamento.orcamento_id AND o.usuario_id = auth.uid())` | *N/A* | Cadeia simples via orçamento | Estratégia v1.6 (Seção 14) | **CONFORME** |
| 25 | `item_orcamento` | `INSERT` | `item_orcamento_insert_policy` | *N/A* | `EXISTS(orçamento próprio) AND servico/produto próprios` | Cadeia simples + Anti-cross-tenant em catálogo | Estratégia v1.6 (Seção 14 / 15) | **CONFORME** |
| 26 | `item_orcamento` | `UPDATE` | `item_orcamento_update_policy` | `EXISTS (o.id = item_orcamento.orcamento_id AND o.usuario_id = auth.uid())` | `EXISTS(orçamento próprio) AND servico/produto próprios` | Cadeia simples + Anti-cross-tenant em catálogo | Estratégia v1.6 (Seção 14 / 15) | **CONFORME** |
| 27 | `item_orcamento` | `DELETE` | `item_orcamento_delete_policy` | `EXISTS (o.id = item_orcamento.orcamento_id AND o.usuario_id = auth.uid() AND o.status = 'RASCUNHO')` | *N/A* | **Decisão D2:** Exclusão vinculada a orçamento em RASCUNHO | Estratégia v1.6 (Seção 14); D2 | **CONFORME** |
| 28 | `area` | `SELECT` | `area_select_policy` | `EXISTS (io JOIN o WHERE io.id = area.item_orcamento_id AND o.usuario_id = auth.uid())` | *N/A* | Cadeia dupla: item $\rightarrow$ orçamento | Estratégia v1.6 (Seção 14) | **CONFORME** |
| 29 | `area` | `INSERT` | `area_insert_policy` | *N/A* | `EXISTS (io JOIN o WHERE io.id = item_orcamento_id AND o.usuario_id = auth.uid())` | Cadeia dupla: item $\rightarrow$ orçamento | Estratégia v1.6 (Seção 14) | **CONFORME** |
| 30 | `area` | `UPDATE` | `area_update_policy` | `EXISTS (io JOIN o WHERE io.id = area.item_orcamento_id AND o.usuario_id = auth.uid())` | `EXISTS (io JOIN o WHERE io.id = item_orcamento_id AND o.usuario_id = auth.uid())` | Cadeia dupla: item $\rightarrow$ orçamento | Estratégia v1.6 (Seção 14) | **CONFORME** |
| 31 | `area` | `DELETE` | `area_delete_policy` | `EXISTS (io JOIN o WHERE io.id = area.item_orcamento_id AND o.usuario_id = auth.uid() AND o.status = 'RASCUNHO')` | *N/A* | **Decisão D2:** Exclusão vinculada a orçamento raiz em RASCUNHO | Estratégia v1.6 (Seção 14); D2 | **CONFORME** |

---

## 6. Auditoria de Decisões Homologadas Específicas

### 6.1. Decisão D1 — Default Deny de Exclusão de Perfil (`usuario`)
- **Verificação:** A tabela `public.usuario` possui exclusivamente 3 políticas: `SELECT`, `INSERT` e `UPDATE`.
- **Efeito SGBD:** Conforme a especificação do PostgreSQL RLS, na ausência de uma policy de `DELETE` para o papel `authenticated`, qualquer comando `DELETE FROM public.usuario` emitido pela API REST é sumariamente rejeitado (retornando 0 linhas afetadas ou erro de permissão).
- **Desativação Lógica:** A inativação de conta é plenamente autorizada via `UPDATE public.usuario SET ativo = false WHERE id = auth.uid()`.
- **Resultado:** **CONFORME**.

### 6.2. Decisão D2 — Exclusão Condicionada a RASCUNHO
- **`orcamento_delete_policy`:** Predicado `auth.uid() = usuario_id AND status = 'RASCUNHO'` garante que orçamentos nos status `ENVIADO`, `EM_ANALISE`, `APROVADO`, `RECUSADO`, `EXPIRADO`, `CANCELADO` e `CONCLUIDO` não possam ser deletados fisicamente;
- **`item_orcamento_delete_policy`:** Predicado exige que o orçamento pai esteja com `o.status = 'RASCUNHO'`;
- **`area_delete_policy`:** Predicado exige que o orçamento raiz da cadeia esteja com `o.status = 'RASCUNHO'`.
- **Resultado:** **CONFORME**.

### 6.3. Regras Anti-Cross-Tenant e Integridade Relacional
- **Vínculo de Orçamento com Cliente Alheio:** Bloqueado no `INSERT` e `UPDATE` de `orcamento` através da subquery `EXISTS (SELECT 1 FROM public.cliente c WHERE c.id = cliente_id AND c.usuario_id = auth.uid())`;
- **Vínculo de Item com Catálogo Alheio:** Bloqueado no `INSERT` e `UPDATE` de `item_orcamento` através da verificação dupla de catálogo:
  - `servico_id IS NULL OR EXISTS (SELECT 1 FROM public.servico s WHERE s.id = servico_id AND s.usuario_id = auth.uid())`
  - `produto_id IS NULL OR EXISTS (SELECT 1 FROM public.produto p WHERE p.id = produto_id AND p.usuario_id = auth.uid())`
- **Resultado:** **CONFORME**.

### 6.4. Navegação por Cadeia Relacional Pura
- Nenhuma coluna `usuario_id` redundante foi adicionada em `endereco`, `item_orcamento` ou `area`.
- O isolamento dessas entidades opera puramente através das chaves estrangeiras já existentes e indexadas:
  - `endereco` $\rightarrow$ `cliente_id` $\rightarrow$ `cliente.usuario_id`
  - `item_orcamento` $\rightarrow$ `orcamento_id` $\rightarrow$ `orcamento.usuario_id`
  - `area` $\rightarrow$ `item_orcamento_id` $\rightarrow$ `item_orcamento.orcamento_id` $\rightarrow$ `orcamento.usuario_id`
- **Resultado:** **CONFORME**.

---

## 7. Verificações de Integridade Estrutural e Não-Intrusão

| Item Auditado | Verificação Realizada | Resultado |
|---|---|---|
| **`usuario_id` redundante em `item_orcamento`** | Inexistente no DDL | **CONFORME** |
| **`usuario_id` redundante em `area`** | Inexistente no DDL | **CONFORME** |
| **Novas tabelas de domínio** | Nenhuma tabela criada (apenas schema `private`) | **CONFORME** |
| **Novas Chaves Estrangeiras (FKs)** | Nenhuma FK adicionada ou modificada | **CONFORME** |
| **Novas Constraints CHECK** | Nenhum CHECK adicionado ou modificado | **CONFORME** |
| **Alteração física de colunas** | Nenhuma coluna alterada em qualquer tabela | **CONFORME** |
| **Políticas fora das 31 homologadas** | Exatamente 31 policies no arquivo | **CONFORME** |
| **Funções auxiliares não homologadas** | Nenhuma função auxiliar (`is_owner`, etc.) criada | **CONFORME** |
| **Alteração em `auth.users`** | Apenas trigger nativa anexada | **CONFORME** |
| **Alteração na migration congelada** | `20260916020500_modelo_fisico_v1_1.sql` intocada | **CONFORME** |
| **Ordem de dependências DDL** | Schema $\rightarrow$ Função $\rightarrow$ Revogações $\rightarrow$ Trigger $\rightarrow$ RLS $\rightarrow$ Policies | **CONFORME** |
| **Ausência de SQL destrutivo** | Nenhum `DROP`, `TRUNCATE` ou `DELETE` destrutivo | **CONFORME** |
| **Execução Transacional CLI** | 100% compatível com transações DDL do PostgreSQL | **CONFORME** |

---

## 8. Validações Automatizadas do Ambiente

- **TypeScript Typecheck:**
  ```bash
  npm run test:typecheck
  ```
  *Resultado:* **0 erros** de compilação estática.

- **Suíte de Testes Unitários de Domínio:**
  ```bash
  npm test
  ```
  *Resultado:* **49/49 testes passando** (100% de sucesso).

---

## 9. Resumo da Auditoria e Classificação

- **Total de Itens Auditados:** 19 tópicos
- **CONFORME:** 19
- **CONFORME COM OBSERVAÇÃO:** 0
- **DIVERGENTE:** 0
- **AUSENTE:** 0
- **NOVA DECISÃO:** 0

---

## 10. Conclusão e Parecer Técnico

A migration dedicada [`supabase/migrations/20260921000000_auth_rls.sql`](file:///c:/Users/luanh/Documents/jardinagem-app/supabase/migrations/20260921000000_auth_rls.sql) implementa de forma rigorosa, cirúrgica e exata o conjunto de 31 políticas de RLS, o schema privado `private`, a função transacional de bootstrap `private.handle_new_user()` com `SECURITY DEFINER` e `search_path = ''`, o princípio do menor privilégio (`REVOKE`), a trigger nativa em `auth.users`, a diretiva estrita `ENABLE ROW LEVEL SECURITY` sem `FORCE RLS` nas 8 tabelas de domínio e as decisões homologadas D1 e D2.

Certifica-se formalmente que **nenhum comando SQL foi executado**, **o banco de dados local não foi alterado** e **a migration física congelada permaneceu intacta**.

Diante do atendimento integral de todos os critérios objetivos de aceitação, emite-se o parecer de que a migration está:

> **STATUS: APTA À HOMOLOGAÇÃO**
