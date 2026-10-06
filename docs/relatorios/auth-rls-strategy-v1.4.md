# Estratégia de Supabase Auth + RLS v1.4

**Documento de Análise e Proposta Técnica — CONSOLIDAÇÃO DE DECISÕES HOMOLOGADAS (Incorporação de SECURITY DEFINER v1.2)**  
**Status:** PARCIALMENTE HOMOLOGADO (Decisões 4 e 12 Homologadas; Decisões 1–3, 5–11 e 13–14 Pendentes de Homologação)  
**Data:** 2026-09-20  
**Versão Anterior (Preservada Intacta):** `docs/relatorios/auth-rls-strategy-v1.3.md`  
**Referência da Decisão Incorporada:** `docs/relatorios/auth-rls-security-definer-v1.2.md`  
**Autor:** Equipe de Arquitetura e Engenharia de Software  

---

## 1. Objetivo

Este documento apresenta a **versão consolidada (v1.4)** da estratégia técnica de autenticação (**Supabase Auth**) e autorização/isolamento multi-tenant (**PostgreSQL Row Level Security — RLS**) para o Sistema de Orçamentos para Jardinagem.

Esta versão tem como finalidades específicas:
1. **Incorporar formalmente a decisão técnica HOMOLOGADA de `SECURITY DEFINER`** (conforme deliberado e homologado em `docs/relatorios/auth-rls-security-definer-v1.2.md`):
   - Função de bootstrap transacional posicionada exclusivamente no schema privado: `private.handle_new_user()`;
   - Execução com o modificador `SECURITY DEFINER` sob a identidade e privilégios do **FUNCTION OWNER** (`postgres`);
   - Imunização estrita contra ataques de sequestro de caminho de busca via `SET search_path = ''` e qualificação obrigatória de `public.usuario`;
   - Isolamento total da rotina fora dos schemas expostos pela Supabase Data API / PostgREST (`schemas = ["public"]`);
   - Aplicação estrita do Princípio do Menor Privilégio (*Least Privilege*) na gestão de permissões `EXECUTE`: revogação total de `PUBLIC`, `anon` e `authenticated`, sem concessão de `GRANT EXECUTE` para `supabase_auth_admin`;
   - Trigger nativa `on_auth_user_created` no evento `AFTER INSERT ON auth.users`;
   - Preservação do mecanismo de fallback defensivo de recuperação no Application Service.
2. **Preservar a decisão técnica HOMOLOGADA sobre RLS e FORCE RLS** (deliberada em `auth-rls-strategy-v1.3.md`):
   - Adoção exclusiva de `ENABLE ROW LEVEL SECURITY` em todas as 8 tabelas de domínio;
   - Rejeição formal e definitiva de `FORCE ROW LEVEL SECURITY`.
3. **Eliminar qualquer menção residual legada:**
   - Remoção de qualquer referência antiga que apresente `public.handle_new_user()` como decisão vigente. A única referência vigente adotada no projeto é `private.handle_new_user()`.
4. **Atualizar a matriz de decisões homologadas:**
   - Registrar a Decisão 4 (`ENABLE RLS` sem `FORCE`) e a Decisão 12 (`private.handle_new_user()` com `SECURITY DEFINER`, `search_path = ''`, schema `private` e menor privilégio) como formalmente **HOMOLOGADAS**.

> [!IMPORTANT]
> **Etapa de Análise e Documentação:** Nenhuma alteração estrutural, migration, trigger, policy ou código de produção é implementado nesta etapa. O arquivo `supabase/migrations/20260916020500_modelo_fisico_v1_1.sql` permanece congelado. Os blocos de SQL apresentados constituem exclusivamente **"SQL PROPOSTO — NÃO EXECUTAR"**.

---

## 2. Rastreabilidade da Consolidação

A evolução e o refinamento desta estratégia obedecem a uma cadeia formal de deliberações e fechamentos técnicos, plenamente rastreável nos relatórios arquivados:

```text
+-----------------------------------------------------------------------------------+
|                        CADEIA DE RASTREABILIDADE TÉCNICA                          |
+-----------------------------------------------------------------------------------+
| 1. auth-rls-strategy-v1.0.md a v1.2.md                                            |
|    - Concepção inicial da estratégia de Auth + RLS;                               |
|    - Análise exaustiva de papéis PostgreSQL e isolamento multi-tenant.            |
+-----------------------------------------------------------------------------------+
| 2. auth-rls-strategy-v1.3.md                                                      |
|    - Fechamento formal e HOMOLOGAÇÃO da Decisão sobre FORCE RLS:                  |
|      * Adotado: ENABLE ROW LEVEL SECURITY em todas as 8 tabelas;                  |
|      * Rejeitado: FORCE ROW LEVEL SECURITY (preserva bypass do FUNCTION OWNER).   |
+-----------------------------------------------------------------------------------+
| 3. auth-rls-security-definer-v1.0.md a v1.2.md                                    |
|    - v1.0: Análise aprofundada de SECURITY DEFINER, search_path e function owner; |
|    - v1.1: Revisão pontual exclusiva do schema (private) e privilégios EXECUTE;   |
|    - v1.2: Fechamento formal e HOMOLOGAÇÃO da decisão de SECURITY DEFINER.        |
+-----------------------------------------------------------------------------------+
| 4. auth-rls-strategy-v1.4.md (ESTE DOCUMENTO)                                     |
|    - Consolidação estratégica unificada das decisões homologadas em v1.3 e v1.2.  |
+-----------------------------------------------------------------------------------+
```

---

## 3. Premissas

1. **Separação entre Identidade e Perfil de Negócio:**
   - O Supabase Auth (`auth.users`) é a única fonte da verdade para identidades, credenciais, hashing de senhas, emissão de JWTs e sessões.
   - A tabela `public.usuario` representa estritamente o perfil de negócio do profissional/empresa no aplicativo.
   - `public.usuario.id` é do tipo `UUID`, corresponde exatamente a `auth.uid()` e não possui gerador de UUID aleatório padrão.
   - `public.usuario` não armazena senhas, tokens ou uma cópia independente de email que atue como identidade paralela.
2. **Modelo Físico v1.1 Imutável:**
   - A migration `20260916020500_modelo_fisico_v1_1.sql` está homologada, validada e congelada.
   - `item_orcamento`, `area` e `endereco` **não possuem `usuario_id` redundante**. A navegação relacional é a base da autorização por cadeia.
3. **Cliente Móvel (Android) Não Confiável:**
   - A aplicação React Native / Expo é tratada como cliente não confiável.
   - Nenhuma regra de autorização, isolamento ou invariante pode depender unicamente da interface.
   - A chave privilegiada `service_role` **nunca** é distribuída no cliente Android. O app consome a API através da chave pública `anon_key` acompanhada do header `Authorization: Bearer <JWT>`.
4. **Isolamento Absoluto (Zero Leakage):**
   - Requisições sem autenticação (`auth.uid() IS NULL` ou role `anon`) sofrem bloqueio padrão imediato nas 8 tabelas de negócio.
   - Um usuário autenticado jamais acessa, modifica ou referencia dados pertencentes a outro usuário.
5. **Defesa em Profundidade:**
   - RLS governa a visibilidade e autorização de modificação de linhas.
   - Chaves estrangeiras com `ON DELETE RESTRICT` (especialmente `item_orcamento.orcamento_id -> orcamento.id`) governam a integridade física estrutural.
   - O Domínio TypeScript governa regras de negócio, invariantes e transições de estado.

---

## 4. Fontes Consideradas

- **Regras de Negócio vigentes:** RN v3 (com foco em RN01–RN05, RN12, RN18, RN23, RN28–RN31, RN58–RN71);
- **Requisitos vigentes:** RF v2 e RNF v2;
- **Diagramas UML:** Classes v3.1 (`docs/uml/classes.puml`) e DER v1.1 (`docs/uml/der.puml`);
- **Arquitetura Técnica:** Arquitetura Técnica v1.1 (`.agents/rules/architecture.md`);
- **Modelo Físico:** Modelo Físico v1.1 (`docs/modelo-fisico-v1.1.md`);
- **Migration Homologada:** `supabase/migrations/20260916020500_modelo_fisico_v1_1.sql`;
- **Documentação Homologada Anterior:**
  - `docs/relatorios/auth-rls-strategy-v1.3.md` (Homologação de `FORCE RLS`);
  - `docs/relatorios/auth-rls-security-definer-v1.2.md` (Homologação de `SECURITY DEFINER`);
- **Documentação Oficial PostgreSQL (v15/v16):**
  - *SQL Commands — ALTER TABLE (Row Level Security & FORCE syntax):* `https://www.postgresql.org/docs/current/sql-altertable.html`;
  - *Data Definition — Row Security Policies (`ddl-rowsecurity`):* `https://www.postgresql.org/docs/current/ddl-rowsecurity.html`;
  - *User Management, Roles & Privileges (GRANT / REVOKE / BYPASSRLS):* `https://www.postgresql.org/docs/current/user-manag.html`;
  - *Server Programming — CREATE FUNCTION (SECURITY DEFINER & search_path):* `https://www.postgresql.org/docs/current/sql-createfunction.html`;
  - *Triggers and Trigger Procedures:* `https://www.postgresql.org/docs/current/plpgsql-trigger.html`;
- **Documentação Oficial Supabase:**
  - *Row Level Security (RLS) & Policies:* `https://supabase.com/docs/guides/database/row-level-security`;
  - *Database Roles & Privileges (`postgres`, `service_role`, `authenticated`, `anon`, `supabase_auth_admin`):* `https://supabase.com/docs/guides/database/postgres/roles`;
  - *Managing User Data & Auth Triggers:* `https://supabase.com/docs/guides/auth/managing-user-data`;
  - *Hardening Postgres Functions & Database Linter:* `https://supabase.com/docs/guides/database/database-linter`;
- **Documentação Oficial PostgREST:**
  - *Schema Cache, Exposed Schemas & Stored Procedures:* `https://postgrest.org/en/stable/references/api/stored_procedures.html`.

---

## 5. Supabase Auth

### 5.1. Método de Autenticação Homologado para v1.0
O método adotado para a primeira versão do sistema é **Email e Senha (`Email + Password`)**.

**Justificativa Técnica:**
- Simplicidade operacional para o usuário final (jardineiro autônomo ou pequena empresa de jardinagem);
- Suporte nativo completo pelo Supabase Auth;
- Possibilidade de testes locais integrais e automatizados via container `supabase_inbucket` / Mailpit (`http://127.0.0.1:54324`), sem requisições a serviços externos pagos;
- Elimina a dependência inicial de contas de desenvolvedor de terceiros (Google Cloud Console, Apple Developer) ou serviços de telefonia SMS (Twilio).

**Métodos Não Adotados na v1.0:**
- Provedores OAuth (Google, Apple, Facebook);
- Magic Link sem senha;
- SMS OTP / WhatsApp OTP;
- Passkeys / Biometria WebAuthn;
- Multi-Factor Authentication (MFA).

---

## 6. Contrato de Cadastro

A criação de um usuário exige a definição clara das fronteiras entre o que pertence ao **Supabase Auth** e o que pertence ao **Perfil de Negócio (`public.usuario`)**.

```text
+-----------------------------------------------------------------------------------+
|                            PAYLOAD DE CADASTRO (CLIENTE)                          |
|  - email: "jardineiro@email.com"                                                  |
|  - password: "******"                                                             |
|  - options.data:                                                                  |
|      - nome: "Carlos Jardineiro"                                                  |
|      - telefone: "11999998888" (opcional)                                         |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-------------------------------------------------+---------------------------------+
|              SUPABASE AUTH                      |         PUBLIC.USUARIO          |
|  (auth.users)                                   |  (Perfil de Negócio)            |
|-------------------------------------------------|---------------------------------|
|  - id: UUID (gerado pelo Auth)                  |  - id: UUID (= auth.uid())      |
|  - email: VARCHAR (credencial de acesso)        |  - nome: VARCHAR(150) NOT NULL  |
|  - encrypted_password: hash seguro              |  - telefone: VARCHAR(30) NULL   |
|  - email_confirmed_at: timestamp                |  - data_cadastro: TIMESTAMPTZ   |
|  - raw_user_meta_data: JSONB                    |  - ativo: BOOLEAN DEFAULT TRUE  |
+-------------------------------------------------+---------------------------------+
```

### 6.1. Especificação dos Campos

1. **Campos Obrigatórios na Chamada de Cadastro (`signUp`):**
   - `email` (gerenciado por `auth.users`);
   - `password` (mínimo de 6 caracteres conforme `config.toml`, gerenciado por `auth.users`);
   - `options.data.nome` (obrigatório para alimentar `public.usuario.nome`).
2. **Campos Opcionais na Chamada de Cadastro:**
   - `options.data.telefone` (pode ser `NULL` ou string vazia, mapeado para `public.usuario.telefone`).
3. **Garantia de `usuario.nome` Obrigatório:**
   - A restrição física `usuario.nome VARCHAR(150) NOT NULL` já está estabelecida na migration v1.1.
   - A trigger de cadastro validará a presença e preenchimento de `raw_user_meta_data->>'nome'`. Se o campo estiver ausente ou for uma string vazia/espaços, a trigger emitirá uma exceção SQL, abortando o `signUp`.
4. **Tratamento de `telefone`:**
   - Em conformidade com o Modelo Físico v1.1, `public.usuario.telefone` é opcional (`is_nullable = YES`). Se omitido no cadastro, será gravado como `NULL`.
5. **Alteração Posterior de Dados de Perfil:**
   - O usuário autenticado poderá atualizar `nome` e `telefone` a qualquer momento mediante `UPDATE public.usuario SET nome = ..., telefone = ... WHERE id = auth.uid()`.
   - `usuario.id` é imutável e sua alteração é barrada pela policy de `UPDATE` (`WITH CHECK (auth.uid() = id)`).
6. **Não-duplicação de Email:**
   - `public.usuario` **não possui** coluna de email. Toda alteração de email ou redefinição de senha é conduzida exclusivamente pelos endpoints de segurança do Supabase Auth (`supabase.auth.updateUser({ email })` e `resetPasswordForEmail`).

---

## 7. Relação Auth → USUARIO

O vínculo fundamental do sistema é:

$$\text{auth.uid()} \equiv \text{public.usuario.id}$$

- `public.usuario` não é uma entidade autônoma nem duplicada;
- Cada conta no Auth possui no máximo um registro de perfil em `public.usuario`;
- A chave primária `usuario.id` é o próprio identificador da identidade autenticada;
- Não há campos de login, senha ou controle de sessão em `public.usuario`.

---

## 8. Criação de USUARIO: Trigger Homologada e Fallback

A criação do perfil de negócio ocorre de forma coordenada entre o mecanismo transacional do banco (caminho principal) e a aplicação móvel (mecanismo defensivo de recuperação).

### 8.1. Caminho Principal: Trigger Transacional no Schema `private` (Homologada)

A criação do perfil `public.usuario` é governada pela trigger nativa de banco de dados, configurada sob os parâmetros homologados em `auth-rls-security-definer-v1.2.md`:

1. **Schema de Residência Privado:** A função reside no schema `private` (`private.handle_new_user()`), completamente fora dos schemas expostos pela Data API do Supabase (PostgREST, que expõe apenas `schemas = ["public"]`). Isso garante que a função não possua rotas REST ou RPC expostas à internet;
2. **Modificador `SECURITY DEFINER`:** Executa estritamente com os privilégios do seu criador (**FUNCTION OWNER: role `postgres`**), efetuando o `INSERT INTO public.usuario` via bypass nativo de RLS sob a regra homologada `NO FORCE RLS`, sem depender de claims de sessão JWT;
3. **Hardening de Segurança:** Declarada com `SET search_path = ''` estático, neutralizando vetores de ataque de *search path hijacking*, exigindo a qualificação explícita de `public.usuario`;
4. **Política de Menor Privilégio (`EXECUTE`):**
   - Privilégios de execução revogados de `PUBLIC`: `REVOKE ALL ON FUNCTION private.handle_new_user() FROM PUBLIC;`;
   - Privilégios de execução revogados explicitamente de `anon` e `authenticated`;
   - **Nenhum `GRANT EXECUTE` para `supabase_auth_admin`:** No PostgreSQL, o disparo de triggers nativas em tempo de execução (`INSERT INTO auth.users`) não avalia privilégios `EXECUTE` contra o papel DML. Apenas o FUNCTION OWNER (`postgres`) possui privilégio de execução;
5. **Validação Antecipada e Atomicidade:** Se `NEW.raw_user_meta_data->>'nome'` estiver ausente ou vazio, emite `RAISE EXCEPTION`, abortando toda a transação do `signUp` no SGBD e impedindo a criação de usuários órfãos.

```sql
-- ============================================================================
-- SQL PROPOSTO — NÃO EXECUTAR (Consolidado de auth-rls-security-definer-v1.2.md)
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
  -- Validação mandatória do nome do profissional/empresa
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

-- 3. Política Estrita de Menor Privilégio
REVOKE ALL ON FUNCTION private.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION private.handle_new_user() FROM anon, authenticated;

-- 4. Criação da Trigger Nativa no Schema auth
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION private.handle_new_user();
```

### 8.2. Fallback: Mecanismo Defensivo de Recuperação no Application Service

O fallback **não é** um fluxo ordinário concorrente de cadastro, mas um procedimento defensivo de recuperação contra edge cases (ex.: usuários convidados ou criados diretamente pelo administrador no painel Web do Supabase Dashboard sem metadados `options.data`, migrações legadas ou intervenções manuais):

1. **Como funciona o Fallback:**
   - Ao autenticar com sucesso (`signInWithPassword`), a camada de Application executa:
     `SELECT id, nome, ativo FROM public.usuario WHERE id = auth.uid()`
   - **Caso o perfil exista:** O fluxo de navegação segue normalmente para a tela inicial (`/home`);
   - **Caso o perfil NÃO exista (0 linhas retornadas):**
     - O Expo Router intercepta o estado e redireciona o usuário para a tela `/concluir-perfil`;
     - A tela solicita o nome e telefone do profissional;
     - A camada de Application submete um `INSERT INTO public.usuario (id, nome, telefone) VALUES (auth.uid(), nome, telefone)`;
     - Esse `INSERT` é explicitamente permitido pela policy `usuario_insert_policy` (`WITH CHECK (auth.uid() = id)`).
2. **Prevenção de Duplicação e Concorrência:**
   - Como `usuario.id` é Chave Primária, qualquer tentativa de inserção concorrente é travada pelo SGBD com erro de unicidade (`ON CONFLICT (id) DO NOTHING`).
   - O fallback nunca pode criar um perfil com ID diferente de `auth.uid()`.

### 8.3. Princípio da Função Mínima
Para garantir a estabilidade global do sistema de cadastro:
- A função `private.handle_new_user()` limita-se estritamente a validar os metadados e inserir o registro em `public.usuario`;
- É **terminantemente proibido** consultar tabelas adicionais de negócio, semear catálogos ou invocar extensões de rede dentro da trigger de autenticação.

---

## 9. Modelo de Propriedade

A titularidade dos dados permanece estruturada de acordo com o Modelo Físico v1.1 e DER v1.1:

```text
                    USUARIO (auth.uid())
                       |
        +--------------+--------------+--------------+
        |                             |              |
        v                             v              v
     CLIENTE                       SERVICO        PRODUTO
        |                             |              |
        v                             +-------+------+
     ENDERECO                                 | (referência)
                                              v
                                          ORCAMENTO
                                              |
                                              v
                                       ITEM_ORCAMENTO
                                              |
                                              v
                                             AREA
```

- **Propriedade Direta:** `cliente`, `servico`, `produto`, `orcamento`.
- **Propriedade por Cadeia (Sem redundância de colunas):**
  - `endereco` $\rightarrow$ validado por `cliente_id` $\rightarrow$ `cliente.usuario_id = auth.uid()`.
  - `item_orcamento` $\rightarrow$ validado por `orcamento_id` $\rightarrow$ `orcamento.usuario_id = auth.uid()`.
  - `area` $\rightarrow$ validada por `item_orcamento_id` $\rightarrow$ `item_orcamento.orcamento_id` $\rightarrow$ `orcamento.usuario_id = auth.uid()`.

---

## 10. RLS (Row Level Security)

1. O RLS é a linha mestra de defesa multi-tenant da aplicação;
2. Todas as 8 tabelas de negócio têm o RLS ativado via `ALTER TABLE <tabela> ENABLE ROW LEVEL SECURITY`;
3. A diretiva complementar `FORCE ROW LEVEL SECURITY` é **formalmente REJEITADA** (mantendo-se o padrão nativo `NO FORCE`), assegurando que rotinas internas transacionais com privilégios de sistema (`private.handle_new_user()` com `SECURITY DEFINER`) operem com bypass nativo, conforme homologado na Seção 11;
4. A negação padrão (*Default Deny*) é mandatória: se nenhuma política explicitamente conferir acesso a uma linha para o role ativo, o acesso é negado (retorna 0 linhas em `SELECT` ou erro de violação de RLS em `INSERT`/`UPDATE`/`DELETE`).

---

## 11. Revisão de FORCE ROW LEVEL SECURITY (Decisão Homologada)

Esta seção consolida a deliberação técnica homologada em `auth-rls-strategy-v1.3.md`:

### 11.1. Síntese da Decisão Homologada
**Adotar EXCLUSIVAMENTE: `ENABLE ROW LEVEL SECURITY` em todas as 8 tabelas de domínio do sistema.**  
**Rejeitar formal e definitivamente o uso da diretiva `FORCE ROW LEVEL SECURITY`.**

### 11.2. Justificativas Consolidadas
1. **Governança Total dos Papéis da Aplicação:** Os papéis `authenticated` e `anon` já são integralmente submetidos às políticas de RLS apenas com `ENABLE ROW LEVEL SECURITY`, pois não são proprietários das tabelas nem possuem `BYPASSRLS`;
2. **Inutilidade de `FORCE` para o Cliente Móvel:** `FORCE ROW LEVEL SECURITY` altera exclusivamente o comportamento do proprietário da tabela (*table owner*), não adicionando nenhuma proteção adicional para as requisições originadas do aplicativo React Native;
3. **Imunidade de Roles com `BYPASSRLS`:** Papéis administrativos como `service_role` e superusuários ignoram o RLS por definição nativa do PostgreSQL, não sendo constrangidos por `FORCE`;
4. **Desacoplamento e Segurança de `SECURITY DEFINER`:** Manter o comportamento padrão `NO FORCE` garante que a trigger `private.handle_new_user()`, executando sob seu **FUNCTION OWNER** (`postgres`), realize o bootstrap do perfil em `public.usuario` via bypass nativo, eliminando o risco de falhas catastróficas que abortariam o cadastro de novos usuários;
5. **Redução de Complexidade:** Elimina a necessidade de criar políticas artificiais para papéis de sistema ou rotinas de manutenção.

```sql
-- SQL PROPOSTO — NÃO EXECUTAR (Ativação Padronizada Homologada)
ALTER TABLE public.usuario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cliente ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.endereco ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produto ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orcamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_orcamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.area ENABLE ROW LEVEL SECURITY;
```

---

## 12. Roles `anon` e `authenticated`

O Supabase Gateway mapeia as requisições HTTP recebidas para papéis específicos no PostgreSQL:

```text
Requisição HTTP
      |
      +---> Sem token / Com anon_key pública ---> Role PostgreSQL: `anon`
      |                                              |
      |                                              v
      |                                     [auth.uid() IS NULL]
      |                                              |
      |                                              v
      |                                  BLOQUEIO TOTAL NO RLS (0 linhas)
      |
      +---> Com Header `Authorization: Bearer <JWT>` ---> Role PostgreSQL: `authenticated`
                                                     |
                                                     v
                                            [auth.uid() = UUID]
                                                     |
                                                     v
                                           AVALIAÇÃO DAS POLICIES RLS
```

### 12.1. Diretrizes dos Roles
- **Role `anon`:** Possui acesso zero às 8 tabelas de domínio. Nenhuma policy concederá privilégios para `anon`. Qualquer tentativa de consulta retornará vazio e qualquer tentativa de mutação resultará em erro.
- **Role `authenticated`:** Todas as policies das tabelas de negócio serão declaradas estritamente com `TO authenticated`.
- **Comportamento de `auth.uid()`:** Dentro das policies, `auth.uid()` é avaliado em tempo de execução extraindo o claim `sub` do JWT. Se `auth.uid()` for nulo, nenhuma condição de propriedade será satisfeita.

---

## 13. Matriz Operacional de Policies

A matriz operacional a seguir especifica cada operação nas 8 tabelas de domínio, discriminando formalmente o papel de `USING` e `WITH CHECK`:

| Tabela | Operação | Role Alvo | Condição de Propriedade | Cláusula `USING` | Cláusula `WITH CHECK` | Comportamento se Desautenticado (`anon` ou `auth.uid() IS NULL`) | Comportamento se de Outro Usuário | Dependência Relacional |
|---|---|---|---|---|---|---|---|---|
| **usuario** | `SELECT` | `authenticated` | Próprio perfil | `auth.uid() = id` | *N/A* | Retorna 0 linhas | Retorna 0 linhas | Nenhuma |
| | `INSERT` | `authenticated` | Próprio perfil | *N/A* | `auth.uid() = id` | Rejeição por RLS | Rejeição por RLS | Nenhuma |
| | `UPDATE` | `authenticated` | Próprio perfil | `auth.uid() = id` | `auth.uid() = id` | Rejeição por RLS | 0 linhas afetadas | Nenhuma |
| | `DELETE` | `authenticated` | Próprio perfil | `auth.uid() = id` | *N/A* | Rejeição por RLS | 0 linhas afetadas | Nenhuma |
| **cliente** | `SELECT` | `authenticated` | Próprio catálogo | `auth.uid() = usuario_id` | *N/A* | Retorna 0 linhas | Retorna 0 linhas | Nenhuma |
| | `INSERT` | `authenticated` | Próprio catálogo | *N/A* | `auth.uid() = usuario_id` | Rejeição por RLS | Rejeição por RLS | Nenhuma |
| | `UPDATE` | `authenticated` | Próprio catálogo | `auth.uid() = usuario_id` | `auth.uid() = usuario_id` | Rejeição por RLS | 0 linhas afetadas | Nenhuma |
| | `DELETE` | `authenticated` | Próprio catálogo | `auth.uid() = usuario_id` | *N/A* | Rejeição por RLS | 0 linhas afetadas | Nenhuma |
| **endereco** | `SELECT` | `authenticated` | Cliente próprio | `EXISTS (SELECT 1 FROM cliente c WHERE c.id = cliente_id AND c.usuario_id = auth.uid())` | *N/A* | Retorna 0 linhas | Retorna 0 linhas | `cliente` |
| | `INSERT` | `authenticated` | Cliente próprio | *N/A* | `EXISTS (SELECT 1 FROM cliente c WHERE c.id = cliente_id AND c.usuario_id = auth.uid())` | Rejeição por RLS | Rejeição por RLS | `cliente` |
| | `UPDATE` | `authenticated` | Cliente próprio | `EXISTS (SELECT 1 FROM cliente c WHERE c.id = endereco.cliente_id AND c.usuario_id = auth.uid())` | `EXISTS (SELECT 1 FROM cliente c WHERE c.id = cliente_id AND c.usuario_id = auth.uid())` | Rejeição por RLS | 0 linhas afetadas | `cliente` |
| | `DELETE` | `authenticated` | Cliente próprio | `EXISTS (SELECT 1 FROM cliente c WHERE c.id = endereco.cliente_id AND c.usuario_id = auth.uid())` | *N/A* | Rejeição por RLS | 0 linhas afetadas | `cliente` |
| **servico** | `SELECT` | `authenticated` | Próprio catálogo | `auth.uid() = usuario_id` | *N/A* | Retorna 0 linhas | Retorna 0 linhas | Nenhuma |
| | `INSERT` | `authenticated` | Próprio catálogo | *N/A* | `auth.uid() = usuario_id` | Rejeição por RLS | Rejeição por RLS | Nenhuma |
| | `UPDATE` | `authenticated` | Próprio catálogo | `auth.uid() = usuario_id` | `auth.uid() = usuario_id` | Rejeição por RLS | 0 linhas afetadas | Nenhuma |
| | `DELETE` | `authenticated` | Próprio catálogo | `auth.uid() = usuario_id` | *N/A* | Rejeição por RLS | 0 linhas afetadas | Nenhuma |
| **produto** | `SELECT` | `authenticated` | Próprio catálogo | `auth.uid() = usuario_id` | *N/A* | Retorna 0 linhas | Retorna 0 linhas | Nenhuma |
| | `INSERT` | `authenticated` | Próprio catálogo | *N/A* | `auth.uid() = usuario_id` | Rejeição por RLS | Rejeição por RLS | Nenhuma |
| | `UPDATE` | `authenticated` | Próprio catálogo | `auth.uid() = usuario_id` | `auth.uid() = usuario_id` | Rejeição por RLS | 0 linhas afetadas | Nenhuma |
| | `DELETE` | `authenticated` | Próprio catálogo | `auth.uid() = usuario_id` | *N/A* | Rejeição por RLS | 0 linhas afetadas | Nenhuma |
| **orcamento** | `SELECT` | `authenticated` | Próprio orçamento | `auth.uid() = usuario_id` | *N/A* | Retorna 0 linhas | Retorna 0 linhas | Nenhuma |
| | `INSERT` | `authenticated` | Próprio orçamento e cliente próprio | *N/A* | `auth.uid() = usuario_id AND EXISTS (SELECT 1 FROM cliente c WHERE c.id = cliente_id AND c.usuario_id = auth.uid())` | Rejeição por RLS | Rejeição por RLS | `cliente` |
| | `UPDATE` | `authenticated` | Próprio orçamento e cliente próprio | `auth.uid() = usuario_id` | `auth.uid() = usuario_id AND EXISTS (SELECT 1 FROM cliente c WHERE c.id = cliente_id AND c.usuario_id = auth.uid())` | Rejeição por RLS | 0 linhas afetadas | `cliente` |
| | `DELETE` | `authenticated` | Próprio orçamento | `auth.uid() = usuario_id` | *N/A* | Rejeição por RLS | 0 linhas afetadas | Nenhuma |
| **item_orcamento** | `SELECT` | `authenticated` | Orçamento próprio | `EXISTS (SELECT 1 FROM orcamento o WHERE o.id = item_orcamento.orcamento_id AND o.usuario_id = auth.uid())` | *N/A* | Retorna 0 linhas | Retorna 0 linhas | `orcamento` |
| | `INSERT` | `authenticated` | Orçamento próprio e catálogo próprio | *N/A* | `EXISTS (SELECT 1 FROM orcamento o WHERE o.id = orcamento_id AND o.usuario_id = auth.uid()) AND (servico_id IS NULL OR EXISTS (SELECT 1 FROM servico s WHERE s.id = servico_id AND s.usuario_id = auth.uid())) AND (produto_id IS NULL OR EXISTS (SELECT 1 FROM produto p WHERE p.id = produto_id AND p.usuario_id = auth.uid()))` | Rejeição por RLS | Rejeição por RLS | `orcamento`, `servico`, `produto` |
| | `UPDATE` | `authenticated` | Orçamento próprio e catálogo próprio | `EXISTS (SELECT 1 FROM orcamento o WHERE o.id = item_orcamento.orcamento_id AND o.usuario_id = auth.uid())` | `EXISTS (SELECT 1 FROM orcamento o WHERE o.id = orcamento_id AND o.usuario_id = auth.uid()) AND (servico_id IS NULL OR EXISTS (SELECT 1 FROM servico s WHERE s.id = servico_id AND s.usuario_id = auth.uid())) AND (produto_id IS NULL OR EXISTS (SELECT 1 FROM produto p WHERE p.id = produto_id AND p.usuario_id = auth.uid()))` | Rejeição por RLS | 0 linhas afetadas | `orcamento`, `servico`, `produto` |
| | `DELETE` | `authenticated` | Orçamento próprio | `EXISTS (SELECT 1 FROM orcamento o WHERE o.id = item_orcamento.orcamento_id AND o.usuario_id = auth.uid())` | *N/A* | Rejeição por RLS | 0 linhas afetadas | `orcamento` |
| **area** | `SELECT` | `authenticated` | Orçamento próprio por cadeia | `EXISTS (SELECT 1 FROM item_orcamento io JOIN orcamento o ON o.id = io.orcamento_id WHERE io.id = area.item_orcamento_id AND o.usuario_id = auth.uid())` | *N/A* | Retorna 0 linhas | Retorna 0 linhas | `item_orcamento`, `orcamento` |
| | `INSERT` | `authenticated` | Orçamento próprio por cadeia | *N/A* | `EXISTS (SELECT 1 FROM item_orcamento io JOIN orcamento o ON o.id = io.orcamento_id WHERE io.id = item_orcamento_id AND o.usuario_id = auth.uid())` | Rejeição por RLS | Rejeição por RLS | `item_orcamento`, `orcamento` |
| | `UPDATE` | `authenticated` | Orçamento próprio por cadeia | `EXISTS (SELECT 1 FROM item_orcamento io JOIN orcamento o ON o.id = io.orcamento_id WHERE io.id = area.item_orcamento_id AND o.usuario_id = auth.uid())` | `EXISTS (SELECT 1 FROM item_orcamento io JOIN orcamento o ON o.id = io.orcamento_id WHERE io.id = item_orcamento_id AND o.usuario_id = auth.uid())` | Rejeição por RLS | 0 linhas afetadas | `item_orcamento`, `orcamento` |
| | `DELETE` | `authenticated` | Orçamento próprio por cadeia | `EXISTS (SELECT 1 FROM item_orcamento io JOIN orcamento o ON o.id = io.orcamento_id WHERE io.id = area.item_orcamento_id AND o.usuario_id = auth.uid())` | *N/A* | Rejeição por RLS | 0 linhas afetadas | `item_orcamento`, `orcamento` |

---

## 14. Policies Diretas (SQL Proposto — Não Executar)

```sql
-- SQL PROPOSTO — NÃO EXECUTAR

-- 1. USUARIO
ALTER TABLE public.usuario ENABLE ROW LEVEL SECURITY;

CREATE POLICY usuario_select_policy ON public.usuario
    FOR SELECT TO authenticated
    USING (auth.uid() = id);

CREATE POLICY usuario_insert_policy ON public.usuario
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = id);

CREATE POLICY usuario_update_policy ON public.usuario
    FOR UPDATE TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY usuario_delete_policy ON public.usuario
    FOR DELETE TO authenticated
    USING (auth.uid() = id);

-- 2. CLIENTE
ALTER TABLE public.cliente ENABLE ROW LEVEL SECURITY;

CREATE POLICY cliente_select_policy ON public.cliente
    FOR SELECT TO authenticated
    USING (auth.uid() = usuario_id);

CREATE POLICY cliente_insert_policy ON public.cliente
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY cliente_update_policy ON public.cliente
    FOR UPDATE TO authenticated
    USING (auth.uid() = usuario_id)
    WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY cliente_delete_policy ON public.cliente
    FOR DELETE TO authenticated
    USING (auth.uid() = usuario_id);

-- 3. SERVICO
ALTER TABLE public.servico ENABLE ROW LEVEL SECURITY;

CREATE POLICY servico_select_policy ON public.servico
    FOR SELECT TO authenticated
    USING (auth.uid() = usuario_id);

CREATE POLICY servico_insert_policy ON public.servico
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY servico_update_policy ON public.servico
    FOR UPDATE TO authenticated
    USING (auth.uid() = usuario_id)
    WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY servico_delete_policy ON public.servico
    FOR DELETE TO authenticated
    USING (auth.uid() = usuario_id);

-- 4. PRODUTO
ALTER TABLE public.produto ENABLE ROW LEVEL SECURITY;

CREATE POLICY produto_select_policy ON public.produto
    FOR SELECT TO authenticated
    USING (auth.uid() = usuario_id);

CREATE POLICY produto_insert_policy ON public.produto
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY produto_update_policy ON public.produto
    FOR UPDATE TO authenticated
    USING (auth.uid() = usuario_id)
    WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY produto_delete_policy ON public.produto
    FOR DELETE TO authenticated
    USING (auth.uid() = usuario_id);

-- 5. ORCAMENTO
ALTER TABLE public.orcamento ENABLE ROW LEVEL SECURITY;

CREATE POLICY orcamento_select_policy ON public.orcamento
    FOR SELECT TO authenticated
    USING (auth.uid() = usuario_id);

CREATE POLICY orcamento_insert_policy ON public.orcamento
    FOR INSERT TO authenticated
    WITH CHECK (
        auth.uid() = usuario_id AND
        EXISTS (
            SELECT 1 FROM public.cliente c
            WHERE c.id = cliente_id AND c.usuario_id = auth.uid()
        )
    );

CREATE POLICY orcamento_update_policy ON public.orcamento
    FOR UPDATE TO authenticated
    USING (auth.uid() = usuario_id)
    WITH CHECK (
        auth.uid() = usuario_id AND
        EXISTS (
            SELECT 1 FROM public.cliente c
            WHERE c.id = cliente_id AND c.usuario_id = auth.uid()
        )
    );

CREATE POLICY orcamento_delete_policy ON public.orcamento
    FOR DELETE TO authenticated
    USING (auth.uid() = usuario_id);
```

---

## 15. Policies em Cadeia (SQL Proposto — Não Executar)

```sql
-- SQL PROPOSTO — NÃO EXECUTAR

-- 6. ENDERECO (Por cadeia via cliente)
ALTER TABLE public.endereco ENABLE ROW LEVEL SECURITY;

CREATE POLICY endereco_select_policy ON public.endereco
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.cliente c
            WHERE c.id = endereco.cliente_id AND c.usuario_id = auth.uid()
        )
    );

CREATE POLICY endereco_insert_policy ON public.endereco
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.cliente c
            WHERE c.id = cliente_id AND c.usuario_id = auth.uid()
        )
    );

CREATE POLICY endereco_update_policy ON public.endereco
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.cliente c
            WHERE c.id = endereco.cliente_id AND c.usuario_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.cliente c
            WHERE c.id = cliente_id AND c.usuario_id = auth.uid()
        )
    );

CREATE POLICY endereco_delete_policy ON public.endereco
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.cliente c
            WHERE c.id = endereco.cliente_id AND c.usuario_id = auth.uid()
        )
    );

-- 7. ITEM_ORCAMENTO (Por cadeia via orcamento)
ALTER TABLE public.item_orcamento ENABLE ROW LEVEL SECURITY;

CREATE POLICY item_orcamento_select_policy ON public.item_orcamento
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.orcamento o
            WHERE o.id = item_orcamento.orcamento_id AND o.usuario_id = auth.uid()
        )
    );

CREATE POLICY item_orcamento_insert_policy ON public.item_orcamento
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.orcamento o
            WHERE o.id = orcamento_id AND o.usuario_id = auth.uid()
        ) AND
        (servico_id IS NULL OR EXISTS (
            SELECT 1 FROM public.servico s
            WHERE s.id = servico_id AND s.usuario_id = auth.uid()
        )) AND
        (produto_id IS NULL OR EXISTS (
            SELECT 1 FROM public.produto p
            WHERE p.id = produto_id AND p.usuario_id = auth.uid()
        ))
    );

CREATE POLICY item_orcamento_update_policy ON public.item_orcamento
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.orcamento o
            WHERE o.id = item_orcamento.orcamento_id AND o.usuario_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.orcamento o
            WHERE o.id = orcamento_id AND o.usuario_id = auth.uid()
        ) AND
        (servico_id IS NULL OR EXISTS (
            SELECT 1 FROM public.servico s
            WHERE s.id = servico_id AND s.usuario_id = auth.uid()
        )) AND
        (produto_id IS NULL OR EXISTS (
            SELECT 1 FROM public.produto p
            WHERE p.id = produto_id AND p.usuario_id = auth.uid()
        ))
    );

CREATE POLICY item_orcamento_delete_policy ON public.item_orcamento
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.orcamento o
            WHERE o.id = item_orcamento.orcamento_id AND o.usuario_id = auth.uid()
        )
    );

-- 8. AREA (Por cadeia via item_orcamento -> orcamento)
ALTER TABLE public.area ENABLE ROW LEVEL SECURITY;

CREATE POLICY area_select_policy ON public.area
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.item_orcamento io
            JOIN public.orcamento o ON o.id = io.orcamento_id
            WHERE io.id = area.item_orcamento_id AND o.usuario_id = auth.uid()
        )
    );

CREATE POLICY area_insert_policy ON public.area
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.item_orcamento io
            JOIN public.orcamento o ON o.id = io.orcamento_id
            WHERE io.id = item_orcamento_id AND o.usuario_id = auth.uid()
        )
    );

CREATE POLICY area_update_policy ON public.area
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.item_orcamento io
            JOIN public.orcamento o ON o.id = io.orcamento_id
            WHERE io.id = area.item_orcamento_id AND o.usuario_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.item_orcamento io
            JOIN public.orcamento o ON o.id = io.orcamento_id
            WHERE io.id = item_orcamento_id AND o.usuario_id = auth.uid()
        )
    );

CREATE POLICY area_delete_policy ON public.area
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.item_orcamento io
            JOIN public.orcamento o ON o.id = io.orcamento_id
            WHERE io.id = area.item_orcamento_id AND o.usuario_id = auth.uid()
        )
    );
```

---

## 16. Regras Anti-Cross-Tenant

O RLS bloqueia explicitamente ataques onde um usuário malicioso tenta referenciar chaves estrangeiras pertencentes a outros usuários:

1. **Ataque 1: Associar Orçamento a Cliente Alheio:**
   - A policy `orcamento_insert_policy` exige na cláusula `WITH CHECK` que `cliente_id` satisfaça `c.usuario_id = auth.uid()`. Se o atacante tentar forjar `cliente_id = <UUID de B>`, o `INSERT` é abortado pelo SGBD.
2. **Ataque 2: Inserir Item com Serviço ou Produto Alheio:**
   - A policy `item_orcamento_insert_policy` valida que `servico_id` e `produto_id` pertençam estritamente ao catálogo do `auth.uid()`.
3. **Ataque 3: Transferir Entidade Alterando `usuario_id`:**
   - Nas policies de `UPDATE`, as cláusulas `WITH CHECK` exigem que `usuario_id = auth.uid()`. Nenhuma linha pode ter sua titularidade transferida para terceiros.

---

## 17. Autorização vs. Integridade Referencial

É fundamental estabelecer a divisão inequívoca de responsabilidades entre as camadas do banco e da aplicação:

```text
+-----------------------------------------------------------------------------------+
| CAMADA                  RESPONSABILIDADE                EXEMPLO TÍPICO            |
+-----------------------------------------------------------------------------------+
| 1. DOMÍNIO / APLICAÇÃO  Regras de Negócio e Invariantes  "Orçamento fora de       |
|                         do Ciclo de Vida                RASCUNHO não pode ser     |
|                                                         editado (RN64)"           |
+-----------------------------------------------------------------------------------+
| 2. ROW LEVEL SECURITY   Autorização por Linha e         "O Usuário A tem          |
|    (RLS)                Isolamento Multi-Tenant         permissão de consultar ou |
|                                                         deletar este orçamento?"  |
+-----------------------------------------------------------------------------------+
| 3. CONSTRAINTS SGBD     Integridade Física, Matemática  "Mesmo autorizado, o      |
|    (FK, CHECK, UNIQUE)  e Estrutural                    orçamento pode ser        |
|                                                         deletado se possui itens? |
|                                                         NÃO (ON DELETE RESTRICT)" |
+-----------------------------------------------------------------------------------+
```

- **O RLS autoriza:** Avalia se o usuário autenticado é o legítimo proprietário da linha antes de autorizar `SELECT`, `INSERT`, `UPDATE` ou `DELETE`.
- **O RLS NÃO substitui Chaves Estrangeiras:** O fato de o usuário A ser dono do orçamento não lhe dá o poder de apagá-lo caso ele possua itens. A foreign key `item_orcamento.orcamento_id -> orcamento.id` com `ON DELETE RESTRICT` rejeitará a exclusão com código de erro referencial (`23503`), preservando a integridade do banco.
- **O RLS NÃO substitui CHECK constraints:** O fato de o usuário ser dono do item não permite salvar valores negativos (`quantidade >= 0` e `valor_unitario >= 0` são mantidos pelas CHECK constraints).
- **O RLS NÃO substitui o Domínio:** Regras complexas como cálculo geodésico de áreas, snapshot de itens e transições da máquina de estados pertencem às entidades e serviços do Domínio TypeScript.

---

## 18. Confirmação de Email

O comportamento da autenticação difere deliberadamente entre o ambiente de testes/desenvolvimento e o ambiente de produção:

### 18.1. Ambiente de Desenvolvimento Local
- **Configuração:** `enable_confirmations = false` no `supabase/config.toml`.
- **Comportamento do `signUp`:**
  1. A chamada `supabase.auth.signUp({ email, password, options: { data: { nome } } })` cria o usuário em `auth.users` e grava imediatamente `email_confirmed_at = NOW()`;
  2. O Supabase Auth emite imediatamente a sessão ativa contendo os tokens JWT e Refresh Token;
  3. A aplicação móvel já recebe a sessão aberta, podendo navegar diretamente para a home do aplicativo;
  4. Agiliza a execução de testes automatizados locais.

### 18.2. Ambiente de Produção / Homologação
- **Configuração:** `enable_confirmations = true`.
- **Comportamento do `signUp`:**
  1. A chamada `supabase.auth.signUp(...)` cria o usuário em `auth.users` com `email_confirmed_at = NULL`;
  2. **A sessão NÃO é retornada imediatamente** (`session === null`);
  3. Um email com token/link de verificação é despachado para a caixa postal do usuário;
  4. A camada de Presentation **não pode assumir** que o cadastro gera login automático;
  5. O aplicativo deve exibir a tela informativa: *"Cadastro realizado! Enviamos um link de confirmação para o seu email. Confirme sua conta para efetuar o primeiro login."*;
  6. O usuário confirma o email e retorna ao aplicativo para executar `signInWithPassword()`.

---

## 19. Fluxo de Sessão no Aplicativo Móvel

O aplicativo Android gerenciará a sessão através do cliente `@supabase/supabase-js` desacoplado na camada de Infrastructure:

```text
[Início do App]
       |
       v
[Verifica Sessão Local (SecureStore)]
       |
       +---> [Sessão Válida] ---> [Carrega Perfil: SELECT * FROM usuario]
       |                                |
       |                                +---> [Perfil OK] ---> [Rota: /home]
       |                                |
       |                                +---> [Perfil Ausente] ---> [Rota: /concluir-perfil (Fallback)]
       |
       +---> [Sessão Inexistente / Expirada] ---> [Rota: /login]
```

1. **Tentativa de Acesso sem Sessão:**
   - Rotas protegidas pelo Expo Router interceptam a ausência de sessão ativa e forçam o redirecionamento para a tela `/login`.
2. **Sessão Expirada:**
   - O SDK do Supabase tenta a renovação automática em segundo plano via Refresh Token.
   - Caso a renovação falhe (token revogado ou expirado), o evento `TOKEN_REFRESH_FAILED` ou `SIGNED_OUT` do listener `onAuthStateChange` é capturado, limpando o armazenamento seguro e direcionando o usuário para o login com a mensagem: *"Sessão expirada. Faça login novamente."*.
3. **Logout:**
   - Limpa o storage local seguro e descarrega o estado da aplicação em memória.

---

## 20. Preservação Histórica

- **Clientes, Serviços e Produtos:** A estratégia padrão do aplicativo é a **desativação lógica** (`ativo = false`). O RLS permite a alteração exclusiva pelo proprietário.
- **Orçamentos:** Orçamentos que saíram de `RASCUNHO` são históricos e protegidos pelo Domínio. Caso sofram tentativa de exclusão física, as FKs com `ON DELETE RESTRICT` atuam impedindo a perda de dados.

---

## 21. Segurança do Android

- O aplicativo móvel é um cliente público e não confiável;
- Nenhuma chave privilegiada (`service_role`) fará parte do código-fonte ou dos bundles de compilação;
- A comunicação com o Supabase utiliza TLS/HTTPS estrito;
- Tokens de autenticação são gravados em armazenamento criptografado no dispositivo (`expo-secure-store`).

---

## 22. Estratégia de Testes

Os testes de RLS serão automatizados e executados contra a instância real do PostgreSQL local no Docker, validando o isolamento entre dois usuários criados no Supabase Auth:
- `USUARIO A` (`alpha@teste.com` — ID: `a0000000-0000-0000-0000-000000000001`)
- `USUARIO B` (`bravo@teste.com` — ID: `b0000000-0000-0000-0000-000000000002`)

### 22.1. Simulação Transacional de Sessão no PostgreSQL
```sql
-- SQL CONCEITUAL DE TESTE — NÃO EXECUTAR
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub": "a0000000-0000-0000-0000-000000000001", "role": "authenticated"}';

-- Teste de leitura legítima
SELECT count(*) FROM cliente; -- Deve retornar apenas registros de A

-- Teste de violação: tentar consultar cliente de B diretamente
SELECT count(*) FROM cliente WHERE usuario_id = 'b0000000-0000-0000-0000-000000000002'; -- Deve retornar 0

ROLLBACK;
```

---

## 23. Performance

1. **Subqueries em Cadeia:**
   - As policies de `item_orcamento`, `area` e `endereco` executam `EXISTS (...)`.
   - **Cobertura por Índices:** Todas as colunas envolvidas nas subqueries já possuem índices B-Tree criados pela migration homologada `20260916020500_modelo_fisico_v1_1.sql`:
     - `idx_orcamento_usuario_id` em `orcamento(usuario_id)`
     - `idx_item_orcamento_orcamento_id` em `item_orcamento(orcamento_id)`
     - `idx_area_item_orcamento_id` em `area(item_orcamento_id)`
     - `idx_cliente_usuario_id` em `cliente(usuario_id)`
   - As buscas utilizam index lookups de complexidade $O(\log n)$, sem sequential scans.
2. **Consultas Agregadas:**
   - O PostgREST compõe as políticas no plano de execução SQL (`EXPLAIN ANALYZE`). Não há sobrecarga apreciável para os volumes previstos no projeto de jardinagem.

---

## 24. Riscos

1. **Risco 1: Cadastro falhar no banco por falta de metadados obrigatórios no Auth.**
   - *Mitigação:* A camada de Presentation e Application valida a presença de `nome` antes de despachar a chamada `signUp()`.
2. **Risco 2: Falha transitória impedir criação do perfil via trigger.**
   - *Mitigação:* Mecanismo de fallback defensivo de recuperação no login redireciona para a tela de conclusão de perfil.
3. **Risco 3: Perda de integridade histórica por exclusão acidental.**
   - *Mitigação:* A restrição `ON DELETE RESTRICT` no banco de dados impede que orçamentos com itens ou catálogos vinculados sejam apagados fisicamente.
4. **Risco 4: Bloqueio acidental de rotinas internas por aplicação indevida de FORCE RLS.**
   - *Mitigação:* A homologação formal da rejeição de `FORCE ROW LEVEL SECURITY` (Seção 11) preserva o bypass nativo para triggers `SECURITY DEFINER` sob o FUNCTION OWNER.
5. **Risco 5: Exposição indesejada da função de bootstrap via API REST.**
   - *Mitigação:* A homologação do posicionamento no schema `private` (`private.handle_new_user()`) e a revogação de privilégios de execução garantem que o PostgREST não exponha a rotina.

---

## 25. Decisões para Homologação

Apresentam-se as 14 decisões fundamentais da estratégia técnica. As **Decisões 4 e 12 foram formalmente HOMOLOGADAS**, enquanto as demais decisões (1–3, 5–11 e 13–14) permanecem sob o status **PENDENTE DE HOMOLOGAÇÃO**:

| # | Decisão | Deliberação e Detalhamento Técnico v1.4 | Justificativa Técnica Consolidada | Impactos por Papel e Componente | Status |
|---|---|---|---|---|---|
| **1** | **Método de Autenticação** | Formalizado `Email + Senha`, documentando o fluxo de confirmação assíncrona (`enable_confirmations = true`) e a necessidade da UI tratar cadastros sem sessão imediata. | Ponto 5: Evitar premissa falsa na UI de que `signUp` sempre gera sessão instantânea em produção. | A UI exibirá aviso de confirmação de email antes de solicitar o primeiro login em produção. | **PENDENTE DE HOMOLOGAÇÃO** |
| **2** | **Criação de `USUARIO`** | Detalhado o contrato de metadados (`nome` obrigatório via `raw_user_meta_data`, `telefone` opcional) e definido o papel do fallback exclusivamente como mecanismo defensivo de recuperação de anomalias. | Pontos 1 e 2: Definir explicitamente o contrato e evitar criar um segundo fluxo concorrente equivalente. | Transacionalidade assegurada na trigger e tolerância a falhas garantida na aplicação. | **PENDENTE DE HOMOLOGAÇÃO** |
| **3** | **Vínculo `auth.uid()` ↔ `usuario.id`** | Mantido o vínculo estrito `usuario.id = auth.uid()`, detalhando que `usuario.id` é imutável via policy de UPDATE. | Pontos 1 e 3: Blindar contra alteração maliciosa da titularidade do perfil. | Imutabilidade garantida por RLS. | **PENDENTE DE HOMOLOGAÇÃO** |
| **4** | **Diretiva de RLS e Roles (`ENABLE` vs `FORCE`)** | **Decisão Homologada:**<br>1. **Adotar:** Somente `ENABLE ROW LEVEL SECURITY` em todas as 8 tabelas de domínio.<br>2. **Rejeitar:** `FORCE ROW LEVEL SECURITY`.<br><br>**Síntese da Deliberação:**<br>- `authenticated` e `anon` já são submetidos integralmente às policies apenas com `ENABLE RLS`.<br>- `FORCE` não acrescenta proteção adicional para papéis que não são table owner.<br>- `FORCE` altera exclusivamente o table owner.<br>- Roles com `BYPASSRLS` não são restringidos pelo `FORCE`.<br>- Evitar `FORCE` reduz complexidade e evita acoplamento desnecessário entre RLS e rotinas internas de bootstrap. | Elimina o risco de falhas críticas no cadastro de novos usuários (`signUp`) e em rotinas administrativas, garantindo 100% de isolamento multi-tenant para o app sem complexidade acidental. | - **Impacto sobre `authenticated`:** 100% governado pelas policies explícitas.<br>- **Impacto sobre `anon`:** 100% bloqueado por negação padrão (*default deny*).<br>- **Impacto sobre `table owner`:** Preserva o bypass padrão (`NO FORCE`).<br>- **Impacto sobre `SECURITY DEFINER`:** Garante que a trigger `private.handle_new_user()` opere com o bypass nativo de seu FUNCTION OWNER.<br>- **Impacto sobre roles com `BYPASSRLS`:** Mantêm o bypass nativo incondicional. | **HOMOLOGADA** |
| **5** | **Política SELECT** | Formalizada na Matriz Operacional com cláusula `USING` explícita por role `authenticated` (direta ou por cadeia). | Ponto 3: Especificação operacional detalhada. | Clientes, serviços, produtos e orçamentos de outros usuários são invisíveis. | **PENDENTE DE HOMOLOGAÇÃO** |
| **6** | **Política INSERT** | Formalizada na Matriz Operacional com cláusula `WITH CHECK` validando titularidade do autor e de todas as FKs associadas. | Pontos 3 e 10: Garantir autorização estrita e proteção anti-cross-tenant na criação. | Requisições com chaves adulteradas são rejeitadas pelo SGBD. | **PENDENTE DE HOMOLOGAÇÃO** |
| **7** | **Política UPDATE** | Formalizada com `USING` (valida registro prévio) e `WITH CHECK` (valida que o registro pós-modificação permanece sob a mesma titularidade). | Ponto 3: Evitar transferência indevida de dados entre contas. | Registros permanecem sob posse do mesmo autor. | **PENDENTE DE HOMOLOGAÇÃO** |
| **8** | **Política DELETE e Integridade** | Formalizada distinção estrita entre autorização RLS e integridade física de banco (`ON DELETE RESTRICT`). | Ponto 6: RLS não substitui integridade referencial nem regras de negócio. | Orçamentos com itens continuam impossibilitados de exclusão pelo banco. | **PENDENTE DE HOMOLOGAÇÃO** |
| **9** | **Proteção por Cadeia** | Formalizada a navegação relacional em `endereco`, `item_orcamento` e `area` respeitando o Modelo Físico v1.1 sem desnormalizar. | Ponto 3: Comprovar viabilidade operacional sem alterar tabelas congeladas. | Consultas utilizam índices já existentes. | **PENDENTE DE HOMOLOGAÇÃO** |
| **10** | **Anti-Cross-Tenant** | Especificadas as checagens relacionais em `orcamento` (`cliente_id`) e `item_orcamento` (`servico_id`, `produto_id`). | Ponto 3: Blindar contra roubo ou uso de entidades de outros profissionais. | Integridade relacional de catálogos e clientes assegurada. | **PENDENTE DE HOMOLOGAÇÃO** |
| **11** | **Estratégia de Testes** | Formalizada metodologia de testes com dois usuários (`USUARIO A` e `B`) via `SET LOCAL "request.jwt.claims"` e `SET LOCAL ROLE authenticated`. | Ponto 4: Testar exatamente no contexto real do gateway Supabase. | Testabilidade automatizada e reproduzível no ambiente local. | **PENDENTE DE HOMOLOGAÇÃO** |
| **12** | **Trigger de Bootstrap e SECURITY DEFINER** | **Decisão Homologada (a partir de `auth-rls-security-definer-v1.2.md`):**<br>1. **Função:** `private.handle_new_user()`, residindo em schema privado não exposto ao PostgREST;<br>2. **Modificador:** `SECURITY DEFINER`, executando sob o FUNCTION OWNER (`postgres`);<br>3. **Hardening:** `SET search_path = ''` estático, com qualificação obrigatória de `public.usuario`;<br>4. **Menor Privilégio (`EXECUTE`):** `REVOKE ALL FROM PUBLIC`, `REVOKE EXECUTE FROM anon, authenticated`, sem `GRANT EXECUTE` para `supabase_auth_admin` (desnecessário para triggers nativas DML);<br>5. **Trigger Nativa:** `on_auth_user_created` em `auth.users` (`AFTER INSERT`);<br>6. **Fallback e Escopo Mínimo:** Preservados integralmente. | Insubstituível para viabilizar escrita atômica em `public.usuario` no `signUp`. O isolamento em schema privado e o hardening de privilégios e search path garantem imunidade contra ataques de API e escalada de privilégios. | - **Segurança:** Isolamento absoluto fora da Data API.<br>- **Transacionalidade:** Atomicidade ACID garantida no cadastro.<br>- **Menor Privilégio:** Exclusivamente o FUNCTION OWNER detém `EXECUTE`. | **HOMOLOGADA** |
| **13** | **Ajustes em `config.toml`** | Mantido `enable_confirmations = false` no ambiente local do Docker e planejado `enable_confirmations = true` para produção. | Ponto 5: Alinhar comportamento dos ambientes de desenvolvimento e produção. | Testes locais ágeis e produção segura. | **PENDENTE DE HOMOLOGAÇÃO** |
| **14** | **Futura Migration** | Confirmada a criação de migration dedicada de Auth/RLS (ex.: `20260918000000_auth_rls.sql`) apenas após homologação integral de toda a estratégia. | Consistência: Manter a migration `20260916020500_modelo_fisico_v1_1.sql` imutável. | Histórico de banco limpo e auditável. | **PENDENTE DE HOMOLOGAÇÃO** |

---

## 26. Conclusão

A **Estratégia de Supabase Auth + RLS v1.4** consolida formalmente as duas decisões técnicas já homologadas no projeto:
1. **Decisão 4 (Homologada):** Adoção de `ENABLE ROW LEVEL SECURITY` sem `FORCE` nas 8 tabelas de domínio;
2. **Decisão 12 (Homologada):** Adoção de `private.handle_new_user()` com `SECURITY DEFINER`, `SET search_path = ''`, isolamento de schema fora da Data API (PostgREST), Princípio do Menor Privilégio nos direitos de execução (sem concessão a `supabase_auth_admin`) e disparo atômico via trigger nativa em `auth.users`.

Com essa consolidação:
- Elimina-se em definitivo qualquer referência à antiga localização `public.handle_new_user()`;
- Assegura-se a robustez arquitetural e a defesa em profundidade da camada de persistência;
- A migration `supabase/migrations/20260916020500_modelo_fisico_v1_1.sql` permanece congelada e intocada;
- As demais decisões (1–3, 5–11 e 13–14) continuam documentadas sob o status **PENDENTE DE HOMOLOGAÇÃO** para fechamento nas próximas etapas.
