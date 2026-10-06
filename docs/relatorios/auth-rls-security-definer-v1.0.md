# Revisão de SECURITY DEFINER — v1.0

**Documento de Análise e Proposta Técnica — REVISÃO PONTUAL DE AUTH + RLS**  
**Status:** PENDENTE DE HOMOLOGAÇÃO  
**Data:** 2026-09-20  
**Contexto:** Fechamento e detalhamento da função de bootstrap `handle_new_user()` e da trigger `on_auth_user_created`  
**Referência Principal:** `docs/relatorios/auth-rls-strategy-v1.3.md` (Premissa Homologada: `ENABLE RLS` ativo; `FORCE RLS` rejeitado)  
**Autor:** Equipe de Arquitetura e Engenharia de Software  

---

## 1. Objetivo

Este documento apresenta a **análise técnica aprofundada e a proposta formal (v1.0)** para o uso do modificador `SECURITY DEFINER` na função de bootstrap transacional de perfis de usuário (`handle_new_user()`), acionada pela trigger `on_auth_user_created` no evento `AFTER INSERT ON auth.users`.

A análise aborda rigorosamente:
1. A necessidade real de `SECURITY DEFINER` frente às alternativas de execução (`SECURITY INVOKER` e mecanismos assíncronos/API);
2. A distinção conceitual e operacional entre **FUNCTION OWNER** e **TABLE OWNER**;
3. O endurecimento (*hardening*) de segurança contra ataques de *search_path hijacking* via `SET search_path = ''` e qualificação obrigatória de schemas;
4. O schema de residência da função (`public` vs schemas privados) e sua relação com a Supabase Data API (PostgREST);
5. O modelo de privilégios de execução (`GRANT`/`REVOKE EXECUTE`) e o isolamento de chamadas diretas de clientes móveis;
6. A interação com o Row Level Security (RLS) sob a premissa já homologada (`ENABLE RLS` sem `FORCE`);
7. A relação de complementaridade entre a garantia primária da trigger e o mecanismo de recuperação do fallback do Application Service;
8. A delimitação estrita do **Princípio da Função Mínima**.

> [!IMPORTANT]
> **Etapa de Análise e Documentação:** Nenhuma alteração estrutural, migration, trigger, function, policy ou código de produção é implementado nesta etapa. Os blocos de SQL apresentados constituem exclusivamente **"SQL PROPOSTO — NÃO EXECUTAR"**.

---

## 2. Fontes Oficiais Consultadas

As conclusões e propostas deste documento fundamentam-se estritamente na documentação oficial atualizada de:

1. **PostgreSQL Official Documentation (v15/v16):**
   - *SQL Commands — CREATE FUNCTION (SECURITY DEFINER & search_path behavior):* `https://www.postgresql.org/docs/current/sql-createfunction.html`;
   - *Server Programming — Trigger Procedures & Execution Privileges:* `https://www.postgresql.org/docs/current/plpgsql-trigger.html`;
   - *Security — Writing SECURITY DEFINER Functions Safely:* `https://www.postgresql.org/docs/current/sql-createfunction.html#SQL-CREATEFUNCTION-SECURITY`;
   - *Database Roles & Privileges (GRANT / REVOKE):* `https://www.postgresql.org/docs/current/sql-grant.html`.
2. **Supabase Official Documentation:**
   - *Database Functions (Security Definer & search_path hardening):* `https://supabase.com/docs/guides/database/functions`;
   - *Managing User Data & Auth Triggers (`on_auth_user_created` pattern):* `https://supabase.com/docs/guides/auth/managing-user-data`;
   - *Database Roles & System Privileges (`postgres`, `supabase_auth_admin`, `anon`, `authenticated`, `service_role`):* `https://supabase.com/docs/guides/database/postgres/roles`;
   - *Hardening Postgres Functions against privilege escalation:* `https://supabase.com/docs/guides/database/database-linter`.
3. **PostgREST Official Documentation:**
   - *Schema Cache & Stored Procedures (Exposing Functions via RPC):* `https://postgrest.org/en/stable/references/api/stored_procedures.html`.

---

## 3. Necessidade de SECURITY DEFINER

O fluxo de autenticação do Supabase Auth é gerido pelo serviço GoTrue, que se conecta ao PostgreSQL através da role de sistema `supabase_auth_admin`. Quando um usuário efetua cadastro (`signUp`), o GoTrue realiza um `INSERT INTO auth.users`.

A tabela `public.usuario`, por sua vez, reside no schema `public` e possui Row Level Security ativado com políticas exclusivas para a role `authenticated` baseadas em `auth.uid() = id`.

Para que a trigger no schema `auth` consiga gravar na tabela de negócio `public.usuario`, avaliou-se a real necessidade do modificador `SECURITY DEFINER`.

**Conclusão Técnica:**  
O uso de `SECURITY DEFINER` é **estritamente necessário e insubstituível** para este fluxo. Sem ele, a função herdaria o contexto do invocador (`supabase_auth_admin`), um papel que por arquitetura do Supabase não possui privilégios de escrita nem políticas permissivas de RLS em tabelas de negócio do schema `public`, inviabilizando a transação de cadastro.

---

## 4. Alternativas Analisadas

Avaliaram-se formalmente três opções de engenharia para o provisionamento do perfil:

### Opção A: Trigger com Função `SECURITY INVOKER`
- **Identidade de Execução:** Executa com a identidade de quem disparou a trigger — a role `supabase_auth_admin`.
- **Privilégios Disponíveis:** `supabase_auth_admin` possui privilégios no schema `auth`, mas não tem `INSERT` out-of-the-box nas tabelas de `public`.
- **Interação com RLS:** Como a tabela `public.usuario` tem RLS habilitado e políticas restritas `TO authenticated` com checagem de `auth.uid() = id`, o papel `supabase_auth_admin` não possui contexto de claims JWT e não satisfaz as políticas da aplicação.
- **Resultado Operacional:** O comando `INSERT INTO public.usuario` falha imediatamente por negação de RLS (*default-deny*) ou por falta de permissão de tabela (`permission denied for table usuario`). Como a trigger é `AFTER INSERT` na mesma transação, todo o cadastro (`signUp`) sofre rollback.
- **Avaliação:** **Inviável**. Exigiria concessões excessivas de permissões manuais e criação de políticas artificiais de RLS para `supabase_auth_admin`.

### Opção B: Trigger com Função `SECURITY DEFINER` (Proposta Técnica)
- **Identidade de Execução:** Executa com os privilégios do criador da função (**FUNCTION OWNER**), que nas migrações do Supabase é a role `postgres`.
- **Privilégios Disponíveis:** O papel `postgres` é proprietário dos schemas e tabelas de domínio, detendo permissões completas de DDL/DML.
- **Interação com RLS:** Como a decisão de RLS já homologada determinou **sem `FORCE`** (`NO FORCE`), o proprietário usufrui do bypass padrão do PostgreSQL para operações de bootstrap, permitindo que a inserção ocorra atomicamente sem depender de sessão HTTP, token JWT ou email previamente confirmado.
- **Resultado Operacional:** Criação transacional íntegra e atômica. Se os metadados forem válidos, ambos os registros (`auth.users` e `public.usuario`) são confirmados na mesma transação de banco.
- **Avaliação:** **Excelente e canônica**. Segue o padrão oficial documentado pelo Supabase.

### Opção C: Mecanismos Assíncronos ou Invocação Externa (Webhooks / Edge Functions / API-only)
- **Como funcionaria:** O Supabase Auth finaliza o cadastro e emite um webhook HTTP assíncrono para uma Edge Function ou delega ao cliente móvel a responsabilidade de efetuar um `INSERT` manual em `public.usuario` após receber o token de login.
- **Desvantagens Críticas:**
  - *Perda de Atomicidade:* Se o app perder conectividade logo após o cadastro, ou se o webhook falhar por timeout, a conta existirá no Auth sem o respectivo registro em `public.usuario`, gerando perfis órfãos e inconsistência de dados;
  - *Complexidade Desnecessária:* Introduz dependências de rede, filas e retries para algo que o SGBD resolve nativamente em microssegundos dentro da transação ACID;
  - *Abertura de Superfície:* Delegar a criação primária à API do cliente móvel exigiria que o app tivesse que orquestrar a sequência de cadastro.
- **Avaliação:** **Rejeitada**. Fere os requisitos de consistência e o princípio de simplicidade do projeto.

---

## 5. Function Owner

A correta compreensão de segurança em PostgreSQL exige a distinção formal entre os conceitos de propriedade:

```text
+-----------------------------------------------------------------------------------+
|                        DISTINÇÃO FORMAL DE PROPRIEDADE                            |
+-----------------------------------------------------------------------------------+
| 1. FUNCTION OWNER (pg_proc.proowner)                                              |
|    - Papel que criou e detém a função.                                            |
|    - Em funções SECURITY DEFINER, o PostgreSQL altera o CURRENT_USER para este     |
|      papel durante toda a execução do corpo da função.                            |
+-----------------------------------------------------------------------------------+
| 2. TABLE OWNER (pg_class.relowner)                                                |
|    - Papel que criou e detém a tabela (ex.: public.usuario).                      |
|    - Define a quem pertence a tabela e quem é isento de RLS quando FORCE está off.|
+-----------------------------------------------------------------------------------+
```

- **Quem é o FUNCTION OWNER no Projeto:**
  O papel executor das migrações do Supabase, que no ambiente local (Docker CLI) e no ambiente hospedado (Cloud) é o papel administrativo **`postgres`**.
- **Coincidência no Projeto:**
  Como a migration cria tanto as tabelas de domínio quanto a função `handle_new_user()`, o **FUNCTION OWNER** e o **TABLE OWNER** coincidem na figura do papel `postgres`.
- **Privilégios do Owner:**
  O papel `postgres` detém todos os privilégios no schema `public` e possui nativamente o atributo de sistema `BYPASSRLS`.
- **Segurança da Execução:**
  A função `SECURITY DEFINER` executa sob a identidade de `postgres`. Por conseguinte, ela não depende dos privilégios de quem a invocou (`supabase_auth_admin`) nem dos privilégios do usuário final (`anon`/`authenticated`).

---

## 6. Interação com RLS

A interação da função com o Row Level Security da tabela `public.usuario` ocorre da seguinte forma:

1. **Premissa Homologada:** A decisão de ativação de RLS homologada em `auth-rls-strategy-v1.3.md` estabeleceu:
   - `ALTER TABLE public.usuario ENABLE ROW LEVEL SECURITY;`
   - **Rejeição de `FORCE ROW LEVEL SECURITY`** (mantendo o comportamento nativo `NO FORCE`).
2. **Avaliação de RLS pelo PostgreSQL:**
   - Durante a execução de uma função `SECURITY DEFINER`, o papel ativo para avaliação de permissões de linha é o seu **FUNCTION OWNER** (`postgres`).
   - Como a tabela está sob `ENABLE RLS` com `NO FORCE`, o PostgreSQL isenta o proprietário da tabela de ter suas consultas filtradas pelas políticas de linha.
   - Como o FUNCTION OWNER coincide com o TABLE OWNER (e possui o atributo `BYPASSRLS`), o `INSERT INTO public.usuario` ocorre via **bypass nativo de RLS**.
3. **Por que isso é indispensável:**
   - No momento exato em que o trigger dispara no `signUp`, o usuário ainda não completou o fluxo de sessão do PostgREST.
   - Não há claims de `request.jwt.claims` injetadas e o claim `auth.uid()` pode estar nulo ou inacessível no contexto da conexão interna do GoTrue.
   - Além disso, em ambientes de produção com confirmação assíncrona de email (`enable_confirmations = true`), o usuário sequer possui sessão ativa.
   - Se o RLS fosse aplicado ao FUNCTION OWNER (como ocorreria sob `FORCE RLS`), a inserção falharia por *default-deny*. A isenção nativa do owner sob `ENABLE RLS` assegura a robustez do provisionamento.

---

## 7. SECURITY DEFINER e search_path

### 7.1. A Ameaça de Search Path Hijacking
O PostgreSQL adverte oficialmente (*CVE-2018-1058* e documentação de *CREATE FUNCTION*):
Se uma função `SECURITY DEFINER` não definir um `search_path` seguro e estático, ela herdará o `search_path` da sessão do invocador.

Um invasor com acesso de criação em schemas públicos ou temporários (`pg_temp`) poderia criar tabelas, visões ou operadores maliciosos com os mesmos nomes dos objetos internos da função. Ao ser invocada, a função executaria o código do invasor com os privilégios elevados do FUNCTION OWNER (`postgres`), resultando em **escalada total de privilégios** (*privilege escalation*).

### 7.2. Configuração Recomendada pelo Supabase e PostgreSQL
A diretiva de máxima segurança adotada é:
```sql
SET search_path = ''
```

Ao definir o `search_path` como vazio:
1. O PostgreSQL desativa a resolução implícita de nomes de esquemas;
2. Objetos criados em `pg_temp` ou schemas não confiáveis são sumariamente ignorados;
3. A função torna-se imune a ataques de sequestro de caminho de busca (*search path hijacking*).

### 7.3. Exigência de Qualificação Estrita (Schema-Qualified Objects)
Com `search_path = ''`, a função **obrigatoriamente** deve qualificar todos os identificadores de schemas utilizados em suas instruções SQL:
- Incorreto: `INSERT INTO usuario (id, nome) ...` (Falha com erro: `relation "usuario" does not exist`);
- **Correto:** `INSERT INTO public.usuario (id, nome, telefone) ...`.

---

## 8. Schema da Função

Analisou-se onde a função `handle_new_user()` deve residir na árvore de schemas do banco de dados:

| Schema Candidato | Vantagens | Desvantagens | Veredito |
|---|---|---|---|
| **Opção A: `public`** (`public.handle_new_user()`) | - Padrão universal e oficial do Supabase.<br>- Total compatibilidade com o instalador do CLI e Studio.<br>- Fácil manutenção e rastreabilidade nas migrations. | - O schema `public` é exposto por padrão no PostgREST. Requer revogação explícita de `EXECUTE` para proteção em profundidade. | **RECOMENDADA** (com hardening de privilégios) |
| **Opção B: `private` ou `internal`** (`private.handle_new_user()`) | - Isolamento total fora dos schemas expostos pelo PostgREST (`schemas = ["public"]` no `config.toml`). | - Exige criar e gerenciar um schema DDL adicional nas migrations.<br>- Requer gerenciar concessões manuais de `GRANT USAGE ON SCHEMA` para o trigger manager. Complexidade sem ganho real para funções trigger. | **REJEITADA** (Complexidade acidental) |
| **Opção C: `auth`** (`auth.handle_new_user()`) | - Proximidade com a tabela `auth.users`. | - O schema `auth` é reservado e gerenciado pelo GoTrue. Criar objetos de usuário em `auth` viola as diretrizes do Supabase e pode quebrar em upgrades. | **REJEITADA** (Incompatível com Supabase) |

### Proteção de Exposição na Data API:
1. Funções declaradas com `RETURNS trigger` **não são expostas** pelo PostgREST como endpoints RPC `/rpc/nome_funcao`. O PostgREST descarta automaticamente funções com tipo de retorno `trigger` do seu schema cache;
2. Portanto, residir em `public` **não gera risco de exposição REST**, desde que a função retorne o tipo `trigger` e tenha seus privilégios `EXECUTE` devidamente restringidos.

---

## 9. Privilégios de Execução (`EXECUTE`)

### 9.1. Comportamento Padrão no PostgreSQL
No PostgreSQL, ao criar uma função, o privilégio de execução é concedido automaticamente para a pseudo-role `PUBLIC`:
`GRANT EXECUTE ON FUNCTION ... TO PUBLIC;`

Isso significa que, por padrão, qualquer conexão autenticada ou anônima com permissão de conexão ao banco teria direitos teóricos de invocar a função.

### 9.2. Política de Menor Privilégio (*Hardening*)
Mesmo que funções `RETURNS trigger` não sejam chamáveis diretamente via API REST, a política de defesa em profundidade do projeto exige revogar o privilégio público e restringi-lo:

1. **Revogação Ampla:**
   ```sql
   REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
   REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
   ```
2. **Concessão Específica:**
   O processo do Supabase Auth opera sob o papel `supabase_auth_admin`. Para garantir que o disparo do trigger ocorra sem erros de autorização de procedimento:
   ```sql
   GRANT EXECUTE ON FUNCTION public.handle_new_user() TO supabase_auth_admin;
   ```
3. **FUNCTION OWNER (`postgres`):**
   Como proprietário da função, o papel `postgres` mantém privilégios de execução plenos e nativos.

---

## 10. Trigger `auth.users`

O ciclo de vida transacional da trigger é estruturado conforme o diagrama:

```text
[Cliente Móvel: signUp(email, pass, { nome, telefone })]
                          |
                          v
         [Supabase GoTrue (supabase_auth_admin)]
                          |
                          v
                 BEGIN TRANSACTION
                          |
                          v
           INSERT INTO auth.users (...)
                          |
                          v (AFTER INSERT Trigger)
             on_auth_user_created
                          |
                          v (Muda contexto para FUNCTION OWNER: postgres)
         public.handle_new_user() [SECURITY DEFINER]
                          |
           +--------------+--------------+
           |                             |
     [Nome Inválido]               [Nome Válido]
           |                             |
     RAISE EXCEPTION                     v
           |                 INSERT INTO public.usuario (...)
           v                             |
        ROLLBACK                         v
   (signUp é abortado)                COMMIT
                           (Usuário e Perfil Gravados)
```

### Detalhes do Comportamento Transacional:
- **Evento:** `AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();`
- **Validação Antecipada:** A função verifica `NEW.raw_user_meta_data->>'nome'`. Se estiver ausente ou contiver apenas espaços, emite `RAISE EXCEPTION 'Nome do usuário é obrigatório para criação do perfil.'`;
- **Tratamento de Exceções:** Qualquer erro na função interrompe a transação do PostgreSQL. Isso impede a ocorrência de "usuários fantasmas" (contas criadas no Auth sem perfil no banco de dados);
- **Propagação do Erro:** O GoTrue intercepta a falha e retorna código HTTP `400` para a aplicação React Native com a mensagem da exceção.

---

## 11. Bootstrap de USUARIO

A criação do registro de perfil obedece estritamente às colunas e constraints definidas na migration homologada `20260916020500_modelo_fisico_v1_1.sql`:

- `id`: Recebe `NEW.id` (UUID idêntico ao do Supabase Auth, satisfazendo `usuario.id = auth.uid()`);
- `nome`: Recebe `trim(NEW.raw_user_meta_data->>'nome')` (campo obrigatório, `VARCHAR(150) NOT NULL`);
- `telefone`: Recebe `nullif(trim(NEW.raw_user_meta_data->>'telefone'), '')` (opcional, mapeado para `NULL` se omitido ou vazio);
- `data_cadastro`: Preenchido automaticamente pelo banco com `CURRENT_TIMESTAMP`;
- `ativo`: Preenchido automaticamente pelo banco com `DEFAULT TRUE`.

---

## 12. Fallback do Application Service

A revisão formaliza o papel e a necessidade de permanência do mecanismo de fallback na camada de aplicação:

### 12.1. Por que o Fallback Existe?
O fallback consiste no fluxo:
`Login (signInWithPassword) -> Consulta public.usuario -> Se vazio -> Redireciona para /concluir-perfil -> INSERT via API`.

Ele existe para tratar cenários anômalos e imprevistos que fogem do fluxo ordinário de cadastro móvel:
1. Usuários convidados ou criados diretamente pelo administrador no painel Web do Supabase Dashboard (onde não há passagem de metadados customizados `options.data`);
2. Recuperação de desastres ou intervenções manuais de banco;
3. Eventual migração de identidades legadas.

### 12.2. O Fallback Concorre com a Trigger?
**Não.** A trigger transacional é a via mestra e determinística de cadastro do aplicativo móvel. O fallback é estritamente um **mecanismo defensivo de tolerância a falhas** (*safety net*).

### 12.3. Deliberação sobre a Permanência do Fallback:
- O fallback **deve permanecer** na camada de aplicação (Presentation/Application) e no desenho de autorização;
- A policy `usuario_insert_policy` (`FOR INSERT TO authenticated WITH CHECK (auth.uid() = id)`) deve ser mantida para permitir que o fallback complete o perfil caso necessário, sem violar as regras de integridade.

---

## 13. Princípio da Função Mínima

Para garantir que o modificador `SECURITY DEFINER` não represente vetor de vulnerabilidade ou degradação de desempenho, estipulam-se as seguintes restrições arquiteturais:

### Obrigações Estritas da Função:
1. Extrair e validar os campos de perfil a partir de `NEW.raw_user_meta_data`;
2. Realizar a inserção de exatamente uma linha em `public.usuario`;
3. Retornar `NEW` para conclusão do evento de trigger.

### Proibições Absolutas (Invariantes de Segurança):
- **PROIBIDO** acessar ou consultar outras tabelas de negócio (`cliente`, `servico`, `produto`, `orcamento`, etc.);
- **PROIBIDO** inicializar catálogos, orçamentos ou configurações pré-fabricadas dentro da trigger de autenticação;
- **PROIBIDO** realizar chamadas de rede, disparo de webhooks ou invocar extensões externas (`http`, `pg_net`) dentro do corpo da função;
- **PROIBIDO** implementar lógicas de domínio complexas ou regras de negócio que pertençam à aplicação TypeScript;
- **PROIBIDO** engolir exceções com blocos `EXCEPTION WHEN OTHERS THEN NULL` (erros devem propagar para abortar cadastros com metadados inválidos).

---

## 14. Riscos Mapeados

1. **Risco 1: Search Path Hijacking (Escalada de Privilégios):**  
   Função `SECURITY DEFINER` executada como `postgres` sem isolamento de schemas poderia executar código injetado em esquemas temporários.
2. **Risco 2: Falha Global no Cadastro por Erro na Função:**  
   Como a trigger é transacional, qualquer bug ou erro de sintaxe em `handle_new_user()` bloqueia 100% dos novos cadastros no sistema.
3. **Risco 3: Chamada Direta Não Autorizada:**  
   Usuários anônimos ou autenticados invocarem a função fora do contexto de criação do Supabase Auth.
4. **Risco 4: Dessincronização entre Auth e Perfil:**  
   Cadastros criados fora do aplicativo móvel (ex.: console administrativo) resultarem em contas sem perfil de negócio associado.

---

## 15. Mitigações Consolidadas

1. **Mitigação 1:** Fixação obrigatória de `SET search_path = ''` e qualificação explícita de todos os objetos (`public.usuario`).
2. **Mitigação 2:** Adoção do Princípio da Função Mínima: lógica reduzida a apenas 10 linhas de PL/pgSQL, sem consultas a tabelas externas ou regras complexas.
3. **Mitigação 3:** A função retorna o tipo `trigger` (não exponível via PostgREST RPC) combinada com `REVOKE EXECUTE FROM PUBLIC, anon, authenticated` e concessão exclusiva a `supabase_auth_admin`.
4. **Mitigação 4:** Manutenção do fallback de recuperação na camada de Application e preservação da policy `usuario_insert_policy`.

---

## 16. SQL Conceitual Proposto

Apresenta-se a proposta completa de DDL a ser submetida para homologação e posterior incorporação na futura migration de Auth/RLS:

```sql
-- ============================================================================
-- SQL PROPOSTO — NÃO EXECUTAR (Ilustração conceitual para homologação)
-- ============================================================================

-- 1. Criação da Função com Hardening Total de Segurança
CREATE OR REPLACE FUNCTION public.handle_new_user()
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

-- 2. Restrição Estrita de Privilégios de Execução (Defesa em Profundidade)
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO supabase_auth_admin;

-- 3. Criação da Trigger no Schema Auth
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

---

## 17. Decisão Técnica Proposta

Propõe-se a aprovação do seguinte conjunto de definições arquiteturais para a futura migration de Auth/RLS:

1. **Uso de `SECURITY DEFINER`:** Aprovado e adotado exclusivamente para a função `public.handle_new_user()`, por ser o único mecanismo transacional que viabiliza a escrita em `public.usuario` disparada a partir do evento de inserção de `auth.users`;
2. **FUNCTION OWNER:** Definido como o papel executor da migration (`postgres`), mantendo o bypass nativo de RLS sob a regra homologada `NO FORCE`;
3. **Segurança do Search Path:** Fixado obrigatoriamente como `SET search_path = ''`, com qualificação explícita de `public.usuario`;
4. **Schema da Função:** Mantido no schema `public` (`public.handle_new_user()`), assegurando compatibilidade com o ecossistema Supabase;
5. **Gestão de Privilégios:** Revogação total de `EXECUTE` para `PUBLIC`, `anon` e `authenticated`, com concessão exclusiva para `supabase_auth_admin`;
6. **Escopo Mínimo:** Confinamento estrito da função ao cadastro básico de perfil, sem dependências adicionais;
7. **Preservação do Fallback:** Manutenção do fallback na aplicação como procedimento defensivo de tolerância a falhas.

---

## 18. Decisões para Homologação

Apresentam-se a seguir as deliberações técnicas detalhadas para apreciação da equipe e homologação formal:

| # | Item Deliberado | Proposta Técnica Consolidada | Justificativa de Segurança e Arquitetura | Impacto no Projeto | Status |
|---|---|---|---|---|---|
| **1** | **Uso de `SECURITY DEFINER`** | Adotar `SECURITY DEFINER` na função `handle_new_user()`. | O invocador da trigger (`supabase_auth_admin`) não possui permissões nem contexto de RLS no schema `public`. Apenas `SECURITY DEFINER` garante a transacionalidade atômica do cadastro. | Elimina necessidade de concessões manuais de permissões em schemas do sistema. | **PENDENTE DE HOMOLOGAÇÃO** |
| **2** | **FUNCTION OWNER** | Atribuído à role `postgres` (criador via migration). | Coincide com o TABLE OWNER e usufrui de bypass nativo de RLS (`NO FORCE`), permitindo a escrita de perfis sem depender de token JWT ou claims de sessão. | Garante o cadastro mesmo com confirmação de email pendente (`email_confirmed_at = NULL`). | **PENDENTE DE HOMOLOGAÇÃO** |
| **3** | **Hardening de `search_path`** | Configurar `SET search_path = ''` na declaração da função e qualificar objetos com `public.`. | Bloqueia vetores de ataque de sequestro de caminho de busca (*search path hijacking*) e execução de código malicioso via `pg_temp`. | Conformidade com as diretrizes do PostgreSQL e Supabase Linter. | **PENDENTE DE HOMOLOGAÇÃO** |
| **4** | **Schema de Residência** | Manter no schema `public` (`public.handle_new_user()`). | Padrão nativo do Supabase. Como a função retorna `trigger`, o PostgREST descarta sua exposição em rotas REST `/rpc/`. Evita complexidade de schemas extras. | Simplicidade de manutenção e rastreabilidade nas migrations. | **PENDENTE DE HOMOLOGAÇÃO** |
| **5** | **Privilégios de Execução** | `REVOKE ALL FROM PUBLIC, anon, authenticated` e `GRANT EXECUTE TO supabase_auth_admin`. | Impede que qualquer cliente da API ou papel não autorizado execute a função fora do trigger manager do PostgreSQL. | Defesa em profundidade absoluta. | **PENDENTE DE HOMOLOGAÇÃO** |
| **6** | **Princípio da Função Mínima** | Função limitada a extrair `nome`/`telefone`, validar `nome` e inserir em `public.usuario`. | Minimiza a superfície de ataque, reduz o tempo de transação no `signUp` e previne falhas acidentais por dependências externas. | Máxima estabilidade e velocidade no cadastro de usuários. | **PENDENTE DE HOMOLOGAÇÃO** |
| **7** | **Relação com Fallback** | Manter o fallback no Application Service e preservar a policy `usuario_insert_policy`. | Protege contra cadastros realizados via console administrativo do Supabase ou anomalias operacionais, sem competir com a trigger. | Resiliência e tolerância a falhas na camada móvel. | **PENDENTE DE HOMOLOGAÇÃO** |

---

## 19. Conclusão

A presente revisão pontual delimita com total rigor e precisão técnica o uso seguro de `SECURITY DEFINER` no Sistema de Orçamentos para Jardinagem.

A combinação de:
1. `SECURITY DEFINER` sob o **FUNCTION OWNER** (`postgres`);
2. Ausência de `FORCE RLS` na tabela `public.usuario` (já homologada);
3. Imunização via `SET search_path = ''`;
4. Restrição de execução via `REVOKE EXECUTE FROM PUBLIC`;
5. Escopo confinante ao Princípio da Função Mínima;

estabelece uma arquitetura de provisionamento de usuários altamente segura, performática, desacoplada e 100% aderente às melhores práticas do PostgreSQL e do Supabase.

O documento é submetido com status **PENDENTE DE HOMOLOGAÇÃO** para formalização antes de qualquer atividade de implementação.
