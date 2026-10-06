# Relatório de Criação da Migration Dedicada Auth + RLS v1.0

**Documento de Registro de Criação de Artefato Físico (Sem Execução)**  
**Artefato Criado:** `supabase/migrations/20260921000000_auth_rls.sql`  
**Status do Artefato:** PENDENTE DE AUDITORIA  
**Data de Criação:** 2026-09-20  
**Autor:** Equipe de Arquitetura e Engenharia de Software  

---

## 1. Contexto e Objetivo

Após a homologação formal documental do **Plano Executivo de Implementação de Supabase Auth + RLS v1.0** (`docs/relatorios/auth-rls-implementation-plan-v1.0.md`), foi gerado o arquivo físico da migration dedicada de Auth + RLS.

O presente artefato materializa em linguagem SQL as decisões arquiteturais e operacionais consolidadas e auditadas, mantendo o estado de **NÃO EXECUÇÃO**, isto é, sem aplicar qualquer comando SQL ao banco de dados e sem disparar ferramentas de migration (`supabase migration up` ou `supabase db reset`).

---

## 2. Fontes Canônicas Utilizadas

A confecção da migration seguiu estritamente:

1. [`docs/relatorios/auth-rls-strategy-v1.6.md`](file:///c:/Users/luanh/Documents/jardinagem-app/docs/relatorios/auth-rls-strategy-v1.6.md) (HOMOLOGADA DOCUMENTALMENTE);
2. [`docs/relatorios/auth-rls-implementation-plan-v1.0.md`](file:///c:/Users/luanh/Documents/jardinagem-app/docs/relatorios/auth-rls-implementation-plan-v1.0.md) (HOMOLOGADA);
3. [`docs/relatorios/auth-rls-implementation-plan-v1.0-final-audit.md`](file:///c:/Users/luanh/Documents/jardinagem-app/docs/relatorios/auth-rls-implementation-plan-v1.0-final-audit.md);
4. [`docs/relatorios/auth-rls-implementation-plan-v1.0-homologation.md`](file:///c:/Users/luanh/Documents/jardinagem-app/docs/relatorios/auth-rls-implementation-plan-v1.0-homologation.md);
5. [`supabase/migrations/20260916020500_modelo_fisico_v1_1.sql`](file:///c:/Users/luanh/Documents/jardinagem-app/supabase/migrations/20260916020500_modelo_fisico_v1_1.sql) (CONGELADA).

---

## 3. Estrutura e Objetos Criados na Migration

O arquivo [`supabase/migrations/20260921000000_auth_rls.sql`](file:///c:/Users/luanh/Documents/jardinagem-app/supabase/migrations/20260921000000_auth_rls.sql) possui 353 linhas e contém a seguinte estrutura determinística:

### 3.1. Schema Privado
- `CREATE SCHEMA IF NOT EXISTS private;`
- **Isolamento:** Posicionado estritamente fora dos schemas expostos pelo PostgREST (`schemas = ["public"]`).

### 3.2. Rotina de Bootstrap Transacional de Perfil
- **Função:** `private.handle_new_user()`
- **Linguagem:** `plpgsql`
- **Modificador de Segurança:** `SECURITY DEFINER` (executa sob os privilégios do superusuário/owner `postgres`)
- **Hardening contra Hijacking:** `SET search_path = ''` estático, com todas as referências schema-qualified (`public.usuario`)
- **Validação de Metadados:** Exige `raw_user_meta_data->>'nome'` preenchido; caso contrário, aborta a transação (`RAISE EXCEPTION`)
- **Inserção de Perfil:** `INSERT INTO public.usuario (id, nome, telefone) VALUES (NEW.id, ...)`

### 3.3. Política de Menor Privilégio na Função
- `REVOKE ALL ON FUNCTION private.handle_new_user() FROM PUBLIC;`
- `REVOKE EXECUTE ON FUNCTION private.handle_new_user() FROM anon, authenticated;`
- Sem concessão desnecessária de privilégios para `supabase_auth_admin` (trigger nativa opera via contexto de ownership).

### 3.4. Trigger Nativa de Eventos DML
- **Trigger:** `on_auth_user_created`
- **Evento:** `AFTER INSERT ON auth.users`
- **Escopo:** `FOR EACH ROW EXECUTE FUNCTION private.handle_new_user();`

### 3.5. Ativação de Row Level Security (RLS)
- Habilitação estrita com `ENABLE ROW LEVEL SECURITY` nas 8 tabelas de domínio do schema `public`:
  1. `public.usuario`
  2. `public.cliente`
  3. `public.servico`
  4. `public.produto`
  5. `public.orcamento`
  6. `public.endereco`
  7. `public.item_orcamento`
  8. `public.area`
- **Ausência de FORCE RLS:** Rejeição formal de `FORCE ROW LEVEL SECURITY` em todas as tabelas, preservando o bypass do table owner e rotinas de sistema.

### 3.6. Distribuição das 31 Políticas de RLS Homologadas

#### Titularidade Direta (19 Policies):
1. **`public.usuario` (3 policies — DELETE ausente por Default Deny):**
   - `usuario_select_policy` (`FOR SELECT TO authenticated USING (auth.uid() = id)`)
   - `usuario_insert_policy` (`FOR INSERT TO authenticated WITH CHECK (auth.uid() = id)`)
   - `usuario_update_policy` (`FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id)`)
   - *DELETE:* Sem policy (Default Deny estrito; desativação lógica via `ativo = false`)
2. **`public.cliente` (4 policies):**
   - `cliente_select_policy` (`FOR SELECT TO authenticated USING (auth.uid() = usuario_id)`)
   - `cliente_insert_policy` (`FOR INSERT TO authenticated WITH CHECK (auth.uid() = usuario_id)`)
   - `cliente_update_policy` (`FOR UPDATE TO authenticated USING (auth.uid() = usuario_id) WITH CHECK (auth.uid() = usuario_id)`)
   - `cliente_delete_policy` (`FOR DELETE TO authenticated USING (auth.uid() = usuario_id)`)
3. **`public.servico` (4 policies):**
   - `servico_select_policy` (`FOR SELECT TO authenticated USING (auth.uid() = usuario_id)`)
   - `servico_insert_policy` (`FOR INSERT TO authenticated WITH CHECK (auth.uid() = usuario_id)`)
   - `servico_update_policy` (`FOR UPDATE TO authenticated USING (auth.uid() = usuario_id) WITH CHECK (auth.uid() = usuario_id)`)
   - `servico_delete_policy` (`FOR DELETE TO authenticated USING (auth.uid() = usuario_id)`)
4. **`public.produto` (4 policies):**
   - `produto_select_policy` (`FOR SELECT TO authenticated USING (auth.uid() = usuario_id)`)
   - `produto_insert_policy` (`FOR INSERT TO authenticated WITH CHECK (auth.uid() = usuario_id)`)
   - `produto_update_policy` (`FOR UPDATE TO authenticated USING (auth.uid() = usuario_id) WITH CHECK (auth.uid() = usuario_id)`)
   - `produto_delete_policy` (`FOR DELETE TO authenticated USING (auth.uid() = usuario_id)`)
5. **`public.orcamento` (4 policies):**
   - `orcamento_select_policy` (`FOR SELECT TO authenticated USING (auth.uid() = usuario_id)`)
   - `orcamento_insert_policy` (`FOR INSERT TO authenticated WITH CHECK (auth.uid() = usuario_id AND EXISTS (SELECT 1 FROM public.cliente c WHERE c.id = cliente_id AND c.usuario_id = auth.uid()))`)
   - `orcamento_update_policy` (`FOR UPDATE TO authenticated USING (auth.uid() = usuario_id) WITH CHECK (auth.uid() = usuario_id AND EXISTS (SELECT 1 FROM public.cliente c WHERE c.id = cliente_id AND c.usuario_id = auth.uid()))`)
   - `orcamento_delete_policy` (`FOR DELETE TO authenticated USING (auth.uid() = usuario_id AND status = 'RASCUNHO')`)

#### Titularidade por Cadeia Relacional (12 Policies):
6. **`public.endereco` (4 policies — cadeia simples via `cliente`):**
   - `endereco_select_policy` (`FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.cliente c WHERE c.id = endereco.cliente_id AND c.usuario_id = auth.uid()))`)
   - `endereco_insert_policy` (`FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.cliente c WHERE c.id = cliente_id AND c.usuario_id = auth.uid()))`)
   - `endereco_update_policy` (`FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.cliente c WHERE c.id = endereco.cliente_id AND c.usuario_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.cliente c WHERE c.id = cliente_id AND c.usuario_id = auth.uid()))`)
   - `endereco_delete_policy` (`FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.cliente c WHERE c.id = endereco.cliente_id AND c.usuario_id = auth.uid()))`)
7. **`public.item_orcamento` (4 policies — cadeia via `orcamento` + anti-cross-tenant em catálogo):**
   - `item_orcamento_select_policy` (`FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.orcamento o WHERE o.id = item_orcamento.orcamento_id AND o.usuario_id = auth.uid()))`)
   - `item_orcamento_insert_policy` (`FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.orcamento o WHERE o.id = orcamento_id AND o.usuario_id = auth.uid()) AND (servico_id IS NULL OR EXISTS (SELECT 1 FROM public.servico s WHERE s.id = servico_id AND s.usuario_id = auth.uid())) AND (produto_id IS NULL OR EXISTS (SELECT 1 FROM public.produto p WHERE p.id = produto_id AND p.usuario_id = auth.uid())))`)
   - `item_orcamento_update_policy` (`FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.orcamento o WHERE o.id = item_orcamento.orcamento_id AND o.usuario_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.orcamento o WHERE o.id = orcamento_id AND o.usuario_id = auth.uid()) AND (servico_id IS NULL OR EXISTS (SELECT 1 FROM public.servico s WHERE s.id = servico_id AND s.usuario_id = auth.uid())) AND (produto_id IS NULL OR EXISTS (SELECT 1 FROM public.produto p WHERE p.id = produto_id AND p.usuario_id = auth.uid())))`)
   - `item_orcamento_delete_policy` (`FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.orcamento o WHERE o.id = item_orcamento.orcamento_id AND o.usuario_id = auth.uid() AND o.status = 'RASCUNHO'))`)
8. **`public.area` (4 policies — cadeia dupla via `item_orcamento` $\rightarrow$ `orcamento`):**
   - `area_select_policy` (`FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.item_orcamento io JOIN public.orcamento o ON o.id = io.orcamento_id WHERE io.id = area.item_orcamento_id AND o.usuario_id = auth.uid()))`)
   - `area_insert_policy` (`FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.item_orcamento io JOIN public.orcamento o ON o.id = io.orcamento_id WHERE io.id = item_orcamento_id AND o.usuario_id = auth.uid()))`)
   - `area_update_policy` (`FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.item_orcamento io JOIN public.orcamento o ON o.id = io.orcamento_id WHERE io.id = area.item_orcamento_id AND o.usuario_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.item_orcamento io JOIN public.orcamento o ON o.id = io.orcamento_id WHERE io.id = item_orcamento_id AND o.usuario_id = auth.uid()))`)
   - `area_delete_policy` (`FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.item_orcamento io JOIN public.orcamento o ON o.id = io.orcamento_id WHERE io.id = area.item_orcamento_id AND o.usuario_id = auth.uid() AND o.status = 'RASCUNHO'))`)

---

## 4. Confirmações de Governança e Não Execução

Certifica-se formalmente que:
1. **Nenhuma Migration Foi Executada:** Não foi executado `supabase migration up`, `supabase db reset` ou similar;
2. **Nenhum Comando SQL Foi Aplicado:** A instância do PostgreSQL local não recebeu qualquer instrução DDL ou DML decorrente desta criação;
3. **O Banco de Dados Não Foi Alterado:** A estrutura e estado do banco de dados permanecem rigorosamente idênticos ao estado prévio;
4. **Preservação da Migration Inicial:** O arquivo `supabase/migrations/20260916020500_modelo_fisico_v1_1.sql` permaneceu **completamente congelado e inalterado**;
5. **Código de Produção Intocado:** Nenhum arquivo do diretório `src/` ou `app/` foi alterado;
6. **Preservação Canônica:** RN v3, RF v2, RNF v2, UML v3.1, DER v1.1, Modelo Físico v1.1 e Arquitetura Técnica v1.1 permanecem intactos.

---

## 5. Validações Executadas

Conforme permitido pelo protocolo de segurança estática:

- **TypeScript Typecheck:**
  ```bash
  npm run test:typecheck
  ```
  *Resultado:* **0 erros** de compilação.
- **Suíte de Testes de Domínio:**
  ```bash
  npm test
  ```
  *Resultado:* **49/49 testes passando** (100% de sucesso).
- **Inspeção Estática de Contagem SQL:**
  - Total de declarações `CREATE POLICY`: **31**;
  - Total de declarações `ENABLE ROW LEVEL SECURITY`: **8**;
  - Ocorrências de `FORCE ROW LEVEL SECURITY`: **0** (somente citada em comentário informativo).

---

## 6. Status e Próximos Passos

O artefato criado:
> [`supabase/migrations/20260921000000_auth_rls.sql`](file:///c:/Users/luanh/Documents/jardinagem-app/supabase/migrations/20260921000000_auth_rls.sql)

permanece com o status oficial de:
> **PENDENTE DE AUDITORIA**

O artefato **NÃO FOI HOMOLOGADO** e **NÃO FOI EXECUTADO**.  
A auditoria técnica independente da migration constituirá a próxima etapa do processo.
