# Homologação de SECURITY DEFINER — v1.2

**Documento de Fechamento Formal e Homologação — REVISÃO DE AUTH + RLS**  
**Status:** HOMOLOGADA  
**Data da Homologação:** 2026-09-20  
**Contexto:** Fechamento formal e homologação da arquitetura e estratégia de `SECURITY DEFINER` para a função de bootstrap transacional `handle_new_user()` e a trigger nativa `on_auth_user_created`.  
**Versão Anterior (Preservada Intacta):** `docs/relatorios/auth-rls-security-definer-v1.1.md`  
**Referência Principal:** `docs/relatorios/auth-rls-strategy-v1.3.md` (Premissa Homologada: `ENABLE RLS` ativo; `FORCE RLS` rejeitado).  
**Autor:** Equipe de Arquitetura e Engenharia de Software  

---

## 1. Objetivo e Registro de Homologação

Este documento formaliza o **fechamento e a HOMOLOGAÇÃO** da estratégia técnica para o uso do modificador `SECURITY DEFINER` na função de provisionamento de perfil de usuário (`handle_new_user()`), acionada pela trigger `on_auth_user_created` no evento `AFTER INSERT ON auth.users`.

A revisão técnica proposta na versão v1.1 foi **APROVADA E HOMOLOGADA**, consolidando:

1. **Schema da Função:** Adoção definitiva de `private.handle_new_user()`, isolando a rotina fora do schema exposto pela Supabase Data API (PostgREST);
2. **Modificador de Execução:** `SECURITY DEFINER`, executando sob os privilégios plenos do FUNCTION OWNER (`postgres`), contornando o RLS de `public.usuario` via bypass nativo sob a diretiva homologada `NO FORCE`;
3. **Hardening de Segurança:** `SET search_path = ''` estático e qualificação estrita e explícita de `public.usuario`;
4. **Privilégios de Execução Mínimos:** Revogação total de `EXECUTE` para `PUBLIC`, `anon` e `authenticated`, sem concessão de `GRANT EXECUTE` para `supabase_auth_admin`;
5. **Trigger Nativa:** Trigger `on_auth_user_created` em `auth.users`, disparada pelo motor relacional interno do PostgreSQL;
6. **Integridade de Migrations:** O arquivo `supabase/migrations/20260916020500_modelo_fisico_v1_1.sql` permanece **congelado e inalterado**;
7. **Status de Implementação:** A **implementação física no banco permanece pendente** para a etapa planejada de migrations de Auth/RLS.

> [!IMPORTANT]
> **Registro Formal de Escopo e Não Implementação:**
> - Esta etapa destina-se **exclusivamente ao registro da homologação documental**;
> - **NÃO** foi implementada a function no SGBD;
> - **NÃO** foi criada ou alterada nenhuma trigger no banco;
> - **NÃO** foi executado nenhum comando SQL;
> - **NÃO** foram criadas ou alteradas migrations;
> - O banco de dados físico **não sofreu qualquer alteração**;
> - Nenhuma decisão técnica foi reaberta.

---

## 2. Decisões Homologadas em Detalhe

### 2.1. Schema da Função: `private.handle_new_user()`
- **Schema Adotado:** `private`.
- **Justificativa Homologada:**
  - O PostgREST expõe exclusivamente os schemas declarados em `db-schemas` (`schemas = ["public"]`).
  - Manter rotinas de trigger em `public` violaria o princípio de separação de planos e defesa em profundidade. O schema `private` não é inspecionado pelo Schema Cache do PostgREST, garantindo que a função não possua qualquer endpoint REST ou RPC exposto;
  - Corrige-se em definitivo qualquer dependência conceitual sobre o retorno `RETURNS trigger`: a barreira real de proteção contra a API é a ausência de exposição do schema (`private`) combinada com a restrição de privilégios;
  - O PostgreSQL suporta plenamente triggers em `auth.users` acionando rotinas no schema `private` (`EXECUTE FUNCTION private.handle_new_user()`).

### 2.2. Modificador `SECURITY DEFINER` e FUNCTION OWNER
- **Identidade de Execução:** FUNCTION OWNER (`postgres`).
- **Justificativa Homologada:**
  - O invocador da trigger (`supabase_auth_admin`) não possui permissões no schema `public` nem contexto de sessão JWT da aplicação;
  - Como a regra de RLS homologada em `auth-rls-strategy-v1.3.md` definiu `ENABLE RLS` com `NO FORCE`, o FUNCTION OWNER (`postgres`), coincidindo com o TABLE OWNER e detentor do atributo `BYPASSRLS`, efetua a inserção de bootstrap atômico via bypass nativo de RLS, mesmo se a confirmação de email estiver pendente.

### 2.3. Hardening de `search_path`
- **Configuração Adotada:** `SET search_path = ''`.
- **Justificativa Homologada:**
  - Elimina qualquer vetor de ataque de *search path hijacking* (CVE-2018-1058);
  - Exige a qualificação explícita de todos os objetos acessados: `INSERT INTO public.usuario (...)`.

### 2.4. Privilégios de Execução (`EXECUTE`)
- **Quem POSSUI `EXECUTE`:** Exclusivamente o **FUNCTION OWNER (`postgres`)**.
- **Quem NÃO POSSUI `EXECUTE`:**
  - `PUBLIC` (revogado explicitamente);
  - `anon` (revogado explicitamente);
  - `authenticated` (revogado explicitamente);
  - `supabase_auth_admin` (não concedido).
- **Justificativa Homologada:**
  - No PostgreSQL, a permissão de `EXECUTE` é checada na criação da trigger (`CREATE TRIGGER` pelo `postgres`), e **não no momento da inserção DML** (`INSERT INTO auth.users` pelo `supabase_auth_admin`);
  - Triggers nativas de banco de dados não são *Auth Hooks*. Conceder `GRANT EXECUTE` a `supabase_auth_admin` é desnecessário e violaria o Princípio do Menor Privilégio.

### 2.5. Trigger Nativa no Schema `auth`
- **Evento e Destino:** `AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION private.handle_new_user()`.
- **Justificativa Homologada:**
  - Garante atomicidade transacional ACID entre a credencial em `auth.users` e o perfil em `public.usuario`. Se os metadados forem inválidos, a transação sofre rollback integral, impedindo a criação de usuários órfãos.

### 2.6. Princípio da Função Mínima e Permanência do Fallback
- **Escopo Mínimo:** A função restringe-se a validar `nome` a partir de `NEW.raw_user_meta_data`, inserir o registro em `public.usuario` e retornar `NEW`. Proibido consultar outras tabelas, acionar extensões de rede ou engolir erros.
- **Fallback no Application Service:** Mantido como mecanismo defensivo de tolerância a falhas na camada móvel (para tratar cadastros via console administrativo do Supabase ou anomalias operacionais), respaldado pela policy `usuario_insert_policy`.

---

## 3. SQL Conceitual Homologado

Apresenta-se a formulação oficial homologada para futura incorporação na migration de Auth/RLS.

> [!CAUTION]
> **SQL HOMOLOGADO — NÃO EXECUTAR (Implementação Pendente)**  
> O código abaixo constitui a especificação homologada da arquitetura. Nenhuma migration física foi criada ou alterada nesta etapa. A execução permanece pendente.

```sql
-- ============================================================================
-- SQL HOMOLOGADO — NÃO EXECUTAR (Especificação Formal v1.2 — Implementação Pendente)
-- ============================================================================

-- 1. Criação do Schema Privado (fora da Supabase Data API / PostgREST)
CREATE SCHEMA IF NOT EXISTS private;

-- 2. Criação da Função no Schema private com Hardening Total
CREATE OR REPLACE FUNCTION private.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Validação mandatória do nome do usuário/empresa
  IF NEW.raw_user_meta_data->>'nome' IS NULL OR trim(NEW.raw_user_meta_data->>'nome') = '' THEN
    RAISE EXCEPTION 'Nome do usuário é obrigatório para criação do perfil.';
  END IF;

  -- Inserção segura e estritamente qualificada no schema public
  INSERT INTO public.usuario (id, nome, telefone)
  VALUES (
    NEW.id,
    trim(NEW.raw_user_meta_data->>'nome'),
    nullif(trim(NEW.raw_user_meta_data->>'telefone'), '')
  );

  RETURN NEW;
END;
$$;

-- 3. Restrição Absoluta de Privilégios de Execução (Princípio do Menor Privilégio)
REVOKE ALL ON FUNCTION private.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION private.handle_new_user() FROM anon, authenticated;

-- NOTA ARQUITETURAL HOMOLOGADA:
-- Nenhum GRANT EXECUTE para supabase_auth_admin. Triggers nativas em auth.users
-- não avaliam privilégios EXECUTE no momento do INSERT efetuado pelo GoTrue.
-- Apenas o FUNCTION OWNER (postgres) retém o privilégio de execução.

-- 4. Criação da Trigger Nativa no Schema auth
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION private.handle_new_user();
```

---

## 4. Tabela de Decisões Homologadas

Todas as decisões técnicas referentes ao `SECURITY DEFINER` encontram-se formalmente **HOMOLOGADAS**:

| # | Item Deliberado | Decisão Técnica Homologada | Justificativa Arquitetural | Status |
|---|---|---|---|---|
| **1** | **Uso de `SECURITY DEFINER`** | **Aprovado** para `private.handle_new_user()`. | Insubstituível para viabilizar a escrita atômica em `public.usuario` disparada a partir do evento em `auth.users`. | **HOMOLOGADA** |
| **2** | **FUNCTION OWNER** | **Aprovado:** role `postgres`. | Coincide com o TABLE OWNER e usufrui de bypass nativo de RLS sob a regra homologada `NO FORCE`. | **HOMOLOGADA** |
| **3** | **Hardening de `search_path`** | **Aprovado:** `SET search_path = ''`. | Imuniza contra ataques de *search path hijacking* e execução de código malicioso via `pg_temp`. | **HOMOLOGADA** |
| **4** | **Schema de Residência** | **Aprovado:** schema `private` (`private.handle_new_user()`). | Isola a função fora do schema exposto pela Data API (PostgREST), estabelecendo defesa em profundidade estrutural. | **HOMOLOGADA** |
| **5** | **Privilégios de Execução** | **Aprovado:** `REVOKE ALL FROM PUBLIC, anon, authenticated` e **sem `GRANT` para `supabase_auth_admin`**. | Triggers nativas não exigem `EXECUTE` em tempo de execução para o papel DML. Apenas o FUNCTION OWNER (`postgres`) mantém `EXECUTE`. | **HOMOLOGADA** |
| **6** | **Princípio da Função Mínima** | **Aprovado:** função confinada à validação de `nome` e inserção simples de perfil. | Minimiza superfície de ataque, tempo de transação e elimina dependências externas no cadastro de usuário. | **HOMOLOGADA** |
| **7** | **Permanência do Fallback** | **Aprovado:** fallback defensivo no Application Service e política de `INSERT` mantidos. | Resiliência contra cadastros manuais via painel administrativo do Supabase e garantia de integridade na camada móvel. | **HOMOLOGADA** |

---

## 5. Estado do Ambiente e Próximos Passos

1. **Estado das Migrations:**  
   O arquivo [supabase/migrations/20260916020500_modelo_fisico_v1_1.sql](file:///c:/Users/luanh/Documents/jardinagem-app/supabase/migrations/20260916020500_modelo_fisico_v1_1.sql) permanece **rigorosamente congelado e inalterado**.
2. **Estado do Banco de Dados:**  
   Nenhum comando DDL ou DML foi emitido. Nenhuma tabela, trigger, policy ou function foi criada ou modificada.
3. **Implementação:**  
   Permanece **PENDENTE**. A implementação física será efetuada em etapa posterior devidamente autorizada, mediante a elaboração da migration correspondente.
4. **Histórico Preservado:**  
   - [docs/relatorios/auth-rls-security-definer-v1.0.md](file:///c:/Users/luanh/Documents/jardinagem-app/docs/relatorios/auth-rls-security-definer-v1.0.md) (versão inicial preservada intacta);
   - [docs/relatorios/auth-rls-security-definer-v1.1.md](file:///c:/Users/luanh/Documents/jardinagem-app/docs/relatorios/auth-rls-security-definer-v1.1.md) (revisão pontual preservada intacta);
   - [docs/relatorios/auth-rls-security-definer-v1.2.md](file:///c:/Users/luanh/Documents/jardinagem-app/docs/relatorios/auth-rls-security-definer-v1.2.md) (este documento — homologação formal).
