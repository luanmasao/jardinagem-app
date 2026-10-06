# Revisão de SECURITY DEFINER — v1.1

**Documento de Análise e Proposta Técnica — REVISÃO PONTUAL DE AUTH + RLS**  
**Status:** PENDENTE DE HOMOLOGAÇÃO  
**Data:** 2026-09-20  
**Contexto:** Revisão pontual e exclusiva da estratégia de `SECURITY DEFINER` para a função de bootstrap `handle_new_user()` e a trigger `on_auth_user_created`: (1) Schema de Residência (`public` vs `private`) e (2) Privilégios de Execução (`GRANT` / `REVOKE EXECUTE`).  
**Referência Principal:** `docs/relatorios/auth-rls-security-definer-v1.0.md` e `docs/relatorios/auth-rls-strategy-v1.3.md` (Premissa Homologada: `ENABLE RLS` ativo; `FORCE RLS` rejeitado).  
**Autor:** Equipe de Arquitetura e Engenharia de Software  

---

## 1. Escopo Estrito Desta Revisão

Esta revisão (v1.1) restringe-se **EXCLUSIVAMENTE** a dois pontos técnicos específicos identificados após a emissão da v1.0:

1. **Schema de Residência da Função:** Avaliação e migração de `public.handle_new_user()` para `private.handle_new_user()`;
2. **Privilégios de Execução (`EXECUTE`):** Revisão minuciosa da necessidade e do escopo de:
   - `REVOKE ALL ... FROM PUBLIC`;
   - `REVOKE EXECUTE ... FROM anon, authenticated`;
   - Eliminação da concessão desnecessária `GRANT EXECUTE ... TO supabase_auth_admin`.

> [!IMPORTANT]
> **Delimitação e Restrições Mandatórias:**
> - Todas as demais decisões técnicas homologadas ou consolidadas permanecem **estritamente inalteradas** (o uso de `SECURITY DEFINER`, o isolamento com `SET search_path = ''`, a diretiva de RLS `ENABLE ROW LEVEL SECURITY` sem `FORCE`, a atomicidade transacional da trigger em `auth.users`, a permanência do fallback defensivo no Application Service e o Princípio da Função Mínima);
> - Esta etapa é **estritamente de análise e documentação**;
> - **NÃO** executar comandos SQL no banco de dados;
> - **NÃO** criar migrations;
> - **NÃO** criar functions, triggers ou policies no SGBD;
> - **NÃO** alterar o banco de dados;
> - **NÃO** modificar o arquivo físico `supabase/migrations/20260916020500_modelo_fisico_v1_1.sql`;
> - O arquivo antecedente `docs/relatorios/auth-rls-security-definer-v1.0.md` é preservado intacto.

---

## 2. Situação na v1.0 e Necessidade de Revisão

Na versão antecedente (`auth-rls-security-definer-v1.0.md`), a estratégia de segurança para a função propunha:

1. **Residência em `public`:** A função foi posicionada como `public.handle_new_user()`, sustentada pelo argumento de que o PostgREST descarta automaticamente funções com retorno `RETURNS trigger` do seu endpoint RPC (`/rpc/`);
2. **Concessão de Execução ao GoTrue:** Propôs-se a revogação de privilégios públicos combinada com a concessão explícita de execução:
   ```sql
   GRANT EXECUTE ON FUNCTION public.handle_new_user() TO supabase_auth_admin;
   ```

### Pontos que Exigem Correção Técnica:

1. **Fragilidade da Justificativa sobre o PostgREST:**  
   Afirmar que a função está protegida de exposição HTTP apenas porque retorna o tipo `trigger` confunde um comportamento incidental de introspecção do PostgREST com um mecanismo formal de controle de acesso. A defesa em profundidade preconiza que rotinas puramente internas **não devem sequer residir no schema exposto pela Data API** (`public`). A proteção deve decorrer da ausência de exposição do schema e da revogação formal de privilégios;
2. **Equívoco Conceitual entre Triggers Nativas e Auth Hooks:**  
   A concessão `GRANT EXECUTE ... TO supabase_auth_admin` foi importada indevidamente de padrões de *Supabase Auth Hooks*. Conforme detalhado a seguir, no mecanismo nativo de triggers do PostgreSQL, o papel que realiza a operação DML (`INSERT INTO auth.users`) **não necessita de privilégio `EXECUTE`** sobre a trigger function. Manter essa concessão viola o Princípio do Menor Privilégio (*Least Privilege*).

---

## 3. Análise Técnica 1: Schema da Função (`public` vs `private`)

### 3.1. Arquitetura da Supabase Data API (PostgREST)
A Data API do Supabase é provida pelo PostgREST, cujo mecanismo de exposição baseia-se na configuração declarativa de schemas (`db-schemas`). Por padrão em qualquer projeto Supabase, essa diretiva é:
```toml
schemas = ["public"]
```

Objetos contidos no schema `public` (tabelas, views e funções elegíveis) passam pelo processo de introspecção do PostgREST (Schema Cache) e tornam-se candidatos a endpoints REST (`/rest/v1/...` e `/rest/v1/rpc/...`). Schemas que não constam explicitamente nessa lista — como `private`, `internal`, `extensions` ou `auth` — são completamente ignorados pelo PostgREST e jamais são mapeados para a rede externa.

### 3.2. Correção da Justificativa Técnica sobre o PostgREST
Na v1.0, argumentou-se que `RETURNS trigger` impedia a chamada direta da função via PostgREST. Embora seja verdade que o PostgREST não gere rotas `/rpc/nome_funcao` para funções que retornam `trigger` (por ausência de tipo de retorno serializável e parâmetros incompatíveis com chamadas RPC), **essa não é a barreira arquitetural de segurança apropriada**:

- O tipo de retorno de uma função é um detalhe de implementação procedimental, e não uma fronteira de segurança;
- Se porventura a assinatura ou tipo de retorno fosse refatorado no futuro, ou se uma função auxiliar fosse adicionada ao schema `public`, ela entraria imediatamente no raio de introspecção da API;
- **A proteção real contra exposição à Data API é o isolamento de schema:** objetos que não compõem a API pública da aplicação não devem habitar o namespace exposto à API.

### 3.3. Uma Função Usada Exclusivamente por Trigger Deve Ficar em Schema Privado?
**Sim.** As melhores práticas de engenharia de banco de dados e arquitetura de segurança do PostgreSQL e Supabase estabelecem:
- O schema `public` deve conter exclusivamente a API de dados pública da aplicação (tabelas e visões sujeitas ao RLS para consumo dos clientes);
- Funções utilitárias, rotinas de auditoria e trigger procedures devem residir em um schema dedicado e não exposto (por convenção, denominado `private` ou `internal`);
- Colocar `handle_new_user()` em um schema privado remove a função do catálogo visível aos desenvolvedores de frontend e aos clientes HTTP, reduz a superfície de introspecção do banco e garante o isolamento funcional.

### 3.4. O Schema `private` é Compatível com a Trigger em `auth.users`?
**Sim, com total e absoluta compatibilidade.**  
No PostgreSQL, o mecanismo de triggers opera no nível do catálogo interno do SGBD (`pg_trigger` e `pg_proc`). Um trigger registrado em uma tabela de qualquer schema (`auth.users`) pode referenciar e disparar perfeitamente uma função procedural residente em outro schema (`private.handle_new_user()`):

```sql
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION private.handle_new_user();
```

O PostgreSQL não impõe qualquer restrição de co-localização de schemas entre tabelas e funções de trigger.

### 3.5. Existe Alguma Necessidade Legítima de Expor a Função via API?
**Não, nenhuma.**  
A função `handle_new_user()` existe unicamente para responder ao evento físico de inserção de novas credenciais na tabela `auth.users`. Ela não possui parâmetros invocáveis por clientes, não deve ser chamada pelo aplicativo React Native, não deve ser exposta a administradores via RPC e sua execução direta fora do ciclo de vida da trigger geraria inconsistências graves (por tentar acessar a variável interna `NEW`, que é nula fora de contexto de trigger).

### 3.6. Conclusão e Decisão do Schema
Rejeita-se a manutenção da função no schema `public`. Adota-se formalmente a criação do schema `private` e o posicionamento da função como:
$$\mathbf{private.handle\_new\_user()}$$

---

## 4. Análise Técnica 2: Privilégios de Execução (`EXECUTE`)

### 4.1. Distinção Crucial no PostgreSQL: DDL (Criação) vs DML (Disparo em Tempo de Execução)
Para compreender corretamente o modelo de permissões, é indispensável separar as duas fases operacionais de uma trigger no PostgreSQL:

```text
+------------------------------------------------------------------------------------+
|                         FASES DA TRIGGER NO POSTGRESQL                             |
+------------------------------------------------------------------------------------+
| 1. FASE DDL — CRIAÇÃO DA TRIGGER (CREATE TRIGGER)                                  |
|    - Executada pelo papel de manutenção/migration (role 'postgres').               |
|    - O PostgreSQL exige:                                                           |
|        a) Privilégio TRIGGER sobre a tabela de destino (auth.users);               |
|        b) Privilégio EXECUTE sobre a função da trigger (private.handle_new_user()).|
|    - Como o papel 'postgres' é superuser/owner, satisfaz todas as exigências.      |
+------------------------------------------------------------------------------------+
| 2. FASE DML — DISPARO DA TRIGGER EM RUNTIME (INSERT INTO auth.users)               |
|    - Executada pelo papel do serviço GoTrue ('supabase_auth_admin').               |
|    - O papel executa apenas o comando: INSERT INTO auth.users (...) VALUES (...);  |
|    - O motor de triggers do PostgreSQL intercepta a operação e dispara a função.  |
|    - O PostgreSQL NÃO avalia o privilégio EXECUTE para o papel que realizou o DML! |
+------------------------------------------------------------------------------------+
```

De acordo com a documentação oficial do PostgreSQL (*Server Programming — Triggers* e *CREATE TRIGGER*):
> *"In order to create a trigger on a table, the user must have the TRIGGER privilege on the table. The user must also have EXECUTE privilege on the trigger function."*

Uma vez criada a trigger por um papel autorizado (`postgres`), o disparo subseqüente da trigger durante comandos DML (`INSERT`, `UPDATE`, `DELETE`) é uma **ação interna do motor relacional**. O papel que emite o `INSERT` (`supabase_auth_admin`) necessita unicamente do privilégio de `INSERT` na tabela `auth.users`. Ele **não necessita possuir `GRANT EXECUTE` sobre a função da trigger**.

### 4.2. Por que a v1.0 Sugeriu `GRANT EXECUTE TO supabase_auth_admin`? (A Confusão com Auth Hooks)
A concessão de `EXECUTE` para `supabase_auth_admin` proposta na v1.0 originou-se de uma confusão frequente entre dois mecanismos distintos suportados pelo Supabase:

| Mecanismo | Como Funciona | Identidade de Execução | Necessita de `GRANT EXECUTE TO supabase_auth_admin`? |
|---|---|---|---|
| **Supabase Auth Hook** (ex.: Token Hook, SMS Hook) | O serviço GoTrue emite uma consulta SQL explícita via conexão de rede: `SELECT * FROM private.my_hook(...)`. | Chamada direta de função por `supabase_auth_admin`. | **SIM**, obrigatoriamente. Sem `GRANT EXECUTE`, a chamada `SELECT` é negada. |
| **Trigger PostgreSQL Nativa** (`on_auth_user_created`) | O serviço GoTrue executa apenas `INSERT INTO auth.users`. O PostgreSQL dispara a trigger como efeito colateral no kernel do banco. | Disparo interno pelo motor relacional; transição para o FUNCTION OWNER (`postgres`). | **NÃO**. O papel DML não invoca a função diretamente. |

Como o fluxo do projeto utiliza uma **trigger nativa de banco de dados** e não um Auth Hook de rede, a role `supabase_auth_admin` **não precisa de qualquer concessão de privilégio sobre a função**.

### 4.3. Determinação sobre `PUBLIC`, `anon` e `authenticated`
Por padrão, ao criar qualquer função em PostgreSQL, o SGBD atribui automaticamente privilégios amplos de execução:
```sql
GRANT EXECUTE ON FUNCTION ... TO PUBLIC;
```

A pseudo-role `PUBLIC` engloba implicitamente todos os papéis presentes e futuros do banco de dados, incluindo `anon` (usuários anônimos da API) e `authenticated` (usuários logados da aplicação).

Para satisfazer o princípio da defesa em profundidade e impedir qualquer invocação não autorizada:
1. É mandatório revogar todo e qualquer privilégio de `PUBLIC`:
   ```sql
   REVOKE ALL ON FUNCTION private.handle_new_user() FROM PUBLIC;
   ```
2. É prudente explicitar a revogação para os papéis da Data API:
   ```sql
   REVOKE EXECUTE ON FUNCTION private.handle_new_user() FROM anon, authenticated;
   ```
3. Além disso, os papéis `anon` e `authenticated` não devem receber permissão de navegação (`USAGE`) no schema `private`.

### 4.4. Aplicação Estrita do Princípio do Menor Privilégio (*Least Privilege*)
Sob a política do menor privilégio:
- **Quem POSSUI `EXECUTE`:** Exclusivamente o **FUNCTION OWNER** (`postgres`), papel que cria a função e a trigger via migrations;
- **Quem NÃO POSSUI `EXECUTE`:**
  - `PUBLIC` (revogado);
  - `anon` (revogado / sem privilégio);
  - `authenticated` (revogado / sem privilégio);
  - `supabase_auth_admin` (não concedido, por ser completamente desnecessário).

Dessa forma, nenhuma entidade ou serviço externo ao kernel do SGBD possui autorização para invocar a função procedimental diretamente.

---

## 5. Proposta Final Consolidada

A estratégia de segurança para o bootstrap transacional de perfis fica assim consolidada:

1. **Schema Privado:** A função residirá no schema `private`, completamente fora do alcance de introspecção do PostgREST (`schemas = ["public"]`);
2. **Nome da Função:** `private.handle_new_user()`;
3. **Modificador de Execução:** `SECURITY DEFINER`, executando com os privilégios plenos do FUNCTION OWNER (`postgres`), contornando o RLS de `public.usuario` via bypass nativo sob a regra homologada `NO FORCE`;
4. **Isolamento de Search Path:** `SET search_path = ''`, com qualificação estrita e explícita de todos os objetos (`public.usuario`);
5. **Privilégios de Execução Mínimos:**
   - Revogação total de privilégios para `PUBLIC`, `anon` e `authenticated`;
   - Nenhuma concessão para `supabase_auth_admin`;
   - Execução restrita internamente ao FUNCTION OWNER (`postgres`) e ao trigger engine do PostgreSQL;
6. **Trigger:** `on_auth_user_created` em `auth.users`, no evento `AFTER INSERT FOR EACH ROW EXECUTE FUNCTION private.handle_new_user()`;
7. **Princípio da Função Mínima e Fallback:** Mantidos estritamente conforme definidos na v1.0.

---

## 6. SQL Conceitual Proposto

Apresenta-se a formulação revisada para homologação.

> [!CAUTION]
> **SQL PROPOSTO — NÃO EXECUTAR**  
> O código abaixo possui caráter estritamente ilustrativo e conceitual para homologação da arquitetura. Nenhuma migration, comando DDL ou alteração em banco deve ser executada nesta etapa.

```sql
-- ============================================================================
-- SQL PROPOSTO — NÃO EXECUTAR (Ilustração conceitual para homologação v1.1)
-- ============================================================================

-- 1. Criação do Schema Privado (não exposto à Supabase Data API / PostgREST)
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
-- Revoga privilégios padrão herdados por PUBLIC e papéis de cliente
REVOKE ALL ON FUNCTION private.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION private.handle_new_user() FROM anon, authenticated;

-- NOTA ARQUITETURAL:
-- Não é executado GRANT EXECUTE TO supabase_auth_admin. Triggers nativas em auth.users
-- não avaliam o privilégio EXECUTE no momento do INSERT efetuado pelo GoTrue.
-- Apenas o FUNCTION OWNER (postgres) retém o privilégio de execução.

-- 4. Criação da Trigger Nativa no Schema auth
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION private.handle_new_user();
```

---

## 7. Quadro Comparativo: v1.0 vs v1.1

| Aspecto de Segurança | Situação na v1.0 | Situação Revisada na v1.1 | Justificativa da Mudança |
|---|---|---|---|
| **Schema da Função** | `public.handle_new_user()` | `private.handle_new_user()` | Isola a rotina fora do schema exposto pela Data API (`public`), eliminando a superfície de introspecção do PostgREST. |
| **Defesa contra API** | Sustentada em `RETURNS trigger`. | Sustentada em schema não exposto (`private`) e `REVOKE EXECUTE`. | `RETURNS trigger` não é barreira formal de autorização; isolamento de schema e revogação de privilégios constituem a verdadeira proteção. |
| **Concessão a `supabase_auth_admin`** | `GRANT EXECUTE ... TO supabase_auth_admin;` | **Nenhuma concessão** (eliminada). | Triggers nativas do PostgreSQL não exigem `EXECUTE` para o papel DML em runtime. Corrige confusão conceitual com Auth Hooks. |
| **Privilégio `EXECUTE` para `PUBLIC`** | Revogado (`REVOKE ALL ... FROM PUBLIC`). | Mantido revogado (`REVOKE ALL ... FROM PUBLIC`). | Defesa mandatória contra execução herdada por papéis anônimos ou não privilegiados. |
| **Privilégio `EXECUTE` para `anon`/`authenticated`** | Revogado explicitamente. | Mantido revogado explicitamente. | Princípio do Menor Privilégio. |
| **Quem detém `EXECUTE`** | `postgres` e `supabase_auth_admin`. | **Exclusivamente `postgres`** (FUNCTION OWNER). | Menor privilégio absoluto: ninguém além do criador/owner tem permissão de executar a função. |

---

## 8. Decisões para Homologação

Submetem-se para homologação formal as decisões técnicas consolidadas:

| # | Item Deliberado | Decisão Técnica na v1.1 | Justificativa | Status |
|---|---|---|---|---|
| **1** | **Uso de `SECURITY DEFINER`** | Confirmado para `private.handle_new_user()`. | Insubstituível para viabilizar escrita em `public.usuario` a partir de `auth.users` sem conceder permissões em `public` ao GoTrue. | **PENDENTE DE HOMOLOGAÇÃO** |
| **2** | **FUNCTION OWNER** | Confirmado: role `postgres`. | Coincide com o TABLE OWNER e usufrui de bypass nativo de RLS sob a regra homologada `NO FORCE`. | **PENDENTE DE HOMOLOGAÇÃO** |
| **3** | **Hardening de `search_path`** | Confirmado: `SET search_path = ''`. | Bloqueia ataques de *search path hijacking* e referências maliciosas em `pg_temp`. | **PENDENTE DE HOMOLOGAÇÃO** |
| **4** | **Schema de Residência** | **Alterado para `private`** (`private.handle_new_user()`). | Isola a trigger procedure fora da Supabase Data API (PostgREST), estabelecendo defesa em profundidade estrutural. | **PENDENTE DE HOMOLOGAÇÃO** |
| **5** | **Privilégios de Execução** | **Revogação total de `PUBLIC`, `anon`, `authenticated` e eliminação de `GRANT` para `supabase_auth_admin`.** | Triggers nativas não exigem `EXECUTE` em tempo de execução para quem faz DML. Apenas o FUNCTION OWNER (`postgres`) mantém `EXECUTE`. | **PENDENTE DE HOMOLOGAÇÃO** |
| **6** | **Princípio da Função Mínima** | Confirmado: função confinada à validação de `nome` e inserção simples de perfil. | Minimiza superfície de ataque, tempo de transação e elimina dependências externas na criação do usuário. | **PENDENTE DE HOMOLOGAÇÃO** |
| **7** | **Permanência do Fallback** | Confirmado: fallback defensivo no Application Service e política de `INSERT` mantidos. | Resiliência contra cadastros manuais via painel administrativo do Supabase e garantia de integridade na camada móvel. | **PENDENTE DE HOMOLOGAÇÃO** |

---

## 9. Conclusão

A revisão pontual v1.1 aperfeiçoa a arquitetura de segurança da função de bootstrap transacional ao:
1. Eliminar o acoplamento desnecessário com o schema público da Data API, migrando a rotina para o schema `private`;
2. Esclarecer com rigor a mecânica de privilégios de triggers do PostgreSQL, demonstrando que `supabase_auth_admin` não necessita de privilégio `EXECUTE`;
3. Estabelecer o menor privilégio estrito no banco, onde apenas o FUNCTION OWNER (`postgres`) possui direitos de execução sobre a função.

O documento é submetido com status **PENDENTE DE HOMOLOGAÇÃO**.
