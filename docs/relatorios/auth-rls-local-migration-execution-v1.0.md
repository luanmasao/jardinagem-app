# Relatório de Execução Controlada Local da Migration Auth + RLS v1.0

**Documento de Evidência e Inspeção Estrutural Pós-Execução (Ambiente Supabase LOCAL)**  
**Objeto Executado:** `supabase/migrations/20260921000000_auth_rls.sql`  
**Comando de Execução:** `npx supabase db reset` (Autorização expressa para ambiente local)  
**Data da Execução:** 2026-09-20  
**Autor:** Equipe de Engenharia e Arquitetura de Software  

---

## 1. Contexto e Objetivo

Em estrito cumprimento à autorização expressa concedida para o ambiente **Supabase LOCAL**, foi executado o comando:
```bash
npx supabase db reset
```
com o objetivo de reconstruir a base local desde o estado zero e aplicar de forma limpa e sequencial as migrations do projeto:
1. `supabase/migrations/20260916020500_modelo_fisico_v1_1.sql` (Modelo Físico v1.1);
2. `supabase/migrations/20260921000000_auth_rls.sql` (Auth + RLS v1.0).

O presente relatório consolida todas as evidências estruturais coletadas diretamente do catálogo do PostgreSQL local, certificando a conformidade dos objetos criados e o encerramento desta etapa prévia à bateria de testes dinâmicos.

---

## 2. Evidências da Execução do Supabase CLI

### 2.1. Saída do Comando `npx supabase db reset`
```text
Resetting local database...
Recreating database...
Initialising schema...
Seeding globals from roles.sql...
Skipping migration .gitkeep... (file name must match pattern "<timestamp>_name.sql")
Applying migration 20260916020500_modelo_fisico_v1_1.sql...
Applying migration 20260921000000_auth_rls.sql...
WARN: no files matched pattern: supabase/seed.sql
Restarting containers...
Finished supabase db reset on branch master.
{"target":"local","version":"","message":"Reset local database."}
```
- **Exit Code:** `0` (Sucesso absoluto).

### 2.2. Status do Ambiente Supabase Local
A consulta ao status via `npx supabase status` confirmou a operacionalidade plena de todos os containers essenciais:
- **PostgreSQL DB URL:** `postgresql://postgres:postgres@127.0.0.1:54322/postgres`
- **API Gateway (Kong / PostgREST):** `http://127.0.0.1:54321`
- **Studio Dashboard:** `http://127.0.0.1:54323`
- **InBucket / Mailpit:** `http://127.0.0.1:54324`
- **PostgREST REST API:** `http://127.0.0.1:54321/rest/v1`

### 2.3. Catálogo de Migrations Aplicadas (`supabase_migrations`)
A verificação via `npx supabase migration list --local` atestou formalmente o registro de ambas as migrations no banco:
```json
{
  "migrations": [
    {"local": "20260916020500", "remote": "20260916020500", "time": "2026-09-16 02:05:00"},
    {"local": "20260921000000", "remote": "20260921000000", "time": "2026-09-21 00:00:00"}
  ],
  "message": "Migrations listed"
}
```

---

## 3. Inspeção Estrutural Direta no Banco de Dados

### 3.1. Tabelas Existentes no SGBD Local
Consulta a `information_schema.tables` nos schemas `public` e `private`:
```sql
SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema IN ('public', 'private');
```
*Resultado:*
- As 8 tabelas de domínio existem rigorosamente: `usuario`, `cliente`, `endereco`, `servico`, `produto`, `orcamento`, `item_orcamento`, `area`;
- Nenhuma tabela espúria ou indevida foi criada no schema `public` ou no schema `private`.

### 3.2. Verificação de Habilitação de RLS e Ausência de FORCE RLS
Consulta a `pg_class`:
```sql
SELECT relname AS table_name, relrowsecurity AS rls_enabled, relforcerowsecurity AS rls_forced 
FROM pg_class 
WHERE relnamespace = 'public'::regnamespace 
  AND relname IN ('usuario', 'cliente', 'endereco', 'servico', 'produto', 'orcamento', 'item_orcamento', 'area')
ORDER BY relname;
```
*Resultado:*
```text
   table_name   | rls_enabled | rls_forced 
----------------+-------------+------------
 area           | t           | f
 cliente        | t           | f
 endereco       | t           | f
 item_orcamento | t           | f
 orcamento      | t           | f
 produto        | t           | f
 servico        | t           | f
 usuario        | t           | f
```
- **RLS Habilitado:** `true` em todas as 8 tabelas;
- **FORCE RLS:** `false` em todas as 8 tabelas (resguardando o bypass nativo do table owner e rotinas de sistema com `SECURITY DEFINER`).

### 3.3. Quantidade e Nomes das Policies Ativas no PostgreSQL
Consulta de contagem:
```sql
SELECT COUNT(*) FROM pg_policy p JOIN pg_class c ON c.oid = p.polrelid WHERE c.relnamespace = 'public'::regnamespace;
```
*Resultado:* **Exatamente 31 policies**.

Consulta detalhada a `pg_policy`:
```text
   table_name   |         policy_name          | command |     roles     
----------------+------------------------------+---------+---------------
 area           | area_insert_policy           | INSERT  | authenticated
 area           | area_delete_policy           | DELETE  | authenticated
 area           | area_select_policy           | SELECT  | authenticated
 area           | area_update_policy           | UPDATE  | authenticated
 cliente        | cliente_insert_policy        | INSERT  | authenticated
 cliente        | cliente_delete_policy        | DELETE  | authenticated
 cliente        | cliente_select_policy        | SELECT  | authenticated
 cliente        | cliente_update_policy        | UPDATE  | authenticated
 endereco       | endereco_insert_policy       | INSERT  | authenticated
 endereco       | endereco_delete_policy       | DELETE  | authenticated
 endereco       | endereco_select_policy       | SELECT  | authenticated
 endereco       | endereco_update_policy       | UPDATE  | authenticated
 item_orcamento | item_orcamento_insert_policy | INSERT  | authenticated
 item_orcamento | item_orcamento_delete_policy | DELETE  | authenticated
 item_orcamento | item_orcamento_select_policy | SELECT  | authenticated
 item_orcamento | item_orcamento_update_policy | UPDATE  | authenticated
 orcamento      | orcamento_insert_policy      | INSERT  | authenticated
 orcamento      | orcamento_delete_policy      | DELETE  | authenticated
 orcamento      | orcamento_select_policy      | SELECT  | authenticated
 orcamento      | orcamento_update_policy      | UPDATE  | authenticated
 produto        | produto_insert_policy        | INSERT  | authenticated
 produto        | produto_delete_policy        | DELETE  | authenticated
 produto        | produto_select_policy        | SELECT  | authenticated
 produto        | produto_update_policy        | UPDATE  | authenticated
 servico        | servico_insert_policy        | INSERT  | authenticated
 servico        | servico_delete_policy        | DELETE  | authenticated
 servico        | servico_select_policy        | SELECT  | authenticated
 servico        | servico_update_policy        | UPDATE  | authenticated
 usuario        | usuario_insert_policy        | INSERT  | authenticated
 usuario        | usuario_select_policy        | SELECT  | authenticated
 usuario        | usuario_update_policy        | UPDATE  | authenticated
```
- **Evidência da Decisão D1:** A tabela `public.usuario` possui exatamente 3 policies (`SELECT`, `INSERT`, `UPDATE`), operando em **Default Deny estrito para DELETE** (exclusão física rejeitada).

### 3.4. Função `private.handle_new_user()`
Consulta a `pg_proc`:
```sql
SELECT n.nspname, p.proname, r.rolname AS owner, p.prosecdef AS security_definer, p.proconfig AS config, p.proacl 
FROM pg_proc p 
JOIN pg_namespace n ON n.oid = p.pronamespace 
JOIN pg_roles r ON r.oid = p.proowner 
WHERE n.nspname = 'private' AND p.proname = 'handle_new_user';
```
*Resultado:*
- `nspname`: `private` (fora da Data API)
- `proname`: `handle_new_user`
- `owner`: `postgres`
- `security_definer`: `true`
- `config`: `{"search_path=\"\""}` (hardening contra hijacking)
- `proacl`: `{postgres=X/postgres}` (menor privilégio estrito: apenas `postgres` detém `EXECUTE`; revogado de `PUBLIC`, `anon` e `authenticated`).

### 3.5. Trigger `on_auth_user_created`
Consulta a `pg_trigger`:
```sql
SELECT tgname, relname, proname, tgenabled, tgtype 
FROM pg_trigger t 
JOIN pg_class c ON c.oid = t.tgrelid 
JOIN pg_proc p ON p.oid = t.tgfoid 
WHERE tgname = 'on_auth_user_created';
```
*Resultado:*
- `tgname`: `on_auth_user_created`
- `relname`: `users` (schema `auth`)
- `proname`: `handle_new_user`
- `tgenabled`: `O` (Ativa)
- `tgtype`: `5` (`AFTER INSERT ON auth.users FOR EACH ROW`).

### 3.6. Evidência da Decisão D2 (DELETE Condicionado a RASCUNHO)
Consulta a `pg_get_expr(p.polqual, p.polrelid)`:
```text
orcamento_delete_policy:
  ((auth.uid() = usuario_id) AND (status = 'RASCUNHO'::status_orcamento))

item_orcamento_delete_policy:
  (EXISTS (SELECT 1 FROM orcamento o WHERE o.id = item_orcamento.orcamento_id AND o.usuario_id = auth.uid() AND o.status = 'RASCUNHO'::status_orcamento))

area_delete_policy:
  (EXISTS (SELECT 1 FROM item_orcamento io JOIN orcamento o ON o.id = io.orcamento_id WHERE io.id = area.item_orcamento_id AND o.usuario_id = auth.uid() AND o.status = 'RASCUNHO'::status_orcamento))
```

### 3.7. Evidência Anti-Cross-Tenant e Integridade Relacional Pura
Consulta a `pg_get_expr(p.polwithcheck, p.polrelid)`:
- `orcamento_insert_policy`: Valida `auth.uid() = usuario_id AND EXISTS (SELECT 1 FROM cliente c WHERE c.id = orcamento.cliente_id AND c.usuario_id = auth.uid())`;
- `item_orcamento_insert_policy`: Valida vínculo de orçamento próprio e valida que `servico_id` e `produto_id` pertençam estritamente a `auth.uid()`;
- Consulta a `information_schema.columns` confirma: **0 colunas `usuario_id` em `item_orcamento`, `area` ou `endereco`**, assegurando cadeias relacionais puras e normalizadas.

---

## 4. Validações Automatizadas da Aplicação

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

## 5. Confirmações Formais de Governança

1. **Ambiente Estritamente Local:** O comando foi executado com exclusividade no cluster local via Docker;
2. **Nenhuma Conexão Remota:** Não houve `supabase link`, `supabase db push` ou conexão a projeto em nuvem;
3. **Preservação de Código e Documentação:** Nenhum arquivo de código de produção, migration ou documento canônico foi alterado;
4. **NÃO Homologação da Implementação:** A execução da migration e a inspeção estrutural constituem evidências técnicas de prontidão, **não encerrando a validação e não constituindo homologação da implementação**;
5. **Parada Mandatória:** O processo foi interrompido conforme instruído, aguardando a próxima etapa formal de testes dinâmicos de isolamento multi-tenant.

---

## 6. Status Final e Próximos Passos

O banco de dados local do Supabase encontra-se com a migration aplicada e estruturalmente validada perante o catálogo do PostgreSQL:

> **STATUS: MIGRATION APLICADA LOCALMENTE COM SUCESSO (ESTRUTURALMENTE CONFORME)**  
> *(Próxima etapa: Execução da bateria específica de testes dinâmicos de Auth + RLS)*
