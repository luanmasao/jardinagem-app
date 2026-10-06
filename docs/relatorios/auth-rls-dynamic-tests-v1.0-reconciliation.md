# Relatório de Reconciliação Documental Pós-Testes Dinâmicos Auth + RLS v1.0

**Documento de Averiguação de Catálogo e Reconciliação Documental**  
**Objeto Inspecionado:** Catálogo PostgreSQL Local (`pg_proc` e variáveis de ambiente/servidor)  
**Relatório Reconciliado:** `docs/relatorios/auth-rls-dynamic-tests-v1.0.md`  
**Data da Reconciliação:** 2026-09-20  
**Autor:** Equipe de Engenharia e Arquitetura de Software  

---

## 1. Contexto e Objetivo

Após a execução da bateria de testes dinâmicos com 100% de aprovação (170/170 asserções pgTAP, 8/8 arquivos, 49/49 testes unitários de domínio e 0 erros de tipagem), procedeu-se a uma auditoria documental fina para reconciliar duas divergências descritivas identificadas no relatório `docs/relatorios/auth-rls-dynamic-tests-v1.0.md`:

1. **`search_path` de `private.handle_new_user()`:** Verificar se a função em execução no banco possui `SET search_path = ''` (estratégia canônica) ou outro valor;
2. **Versão do PostgreSQL Local:** Averiguar no servidor em execução a versão exata do motor relacional instanciado pelo Supabase CLI.

A presente etapa foi estritamente não destrutiva e documental: **nenhuma migration foi alterada, nenhuma policy foi modificada e nenhum comando estrutural DDL foi aplicado**.

---

## 2. Evidência Direta do Catálogo PostgreSQL

### 2.1. Inspeção da Função `private.handle_new_user()`
Consulta realizada via `npx supabase db query`:
```sql
SELECT 
    p.proname, 
    n.nspname, 
    pg_get_userbyid(p.proowner) AS owner, 
    p.prosecdef, 
    p.proconfig, 
    p.proacl, 
    pg_get_functiondef(p.oid) AS definition 
FROM pg_proc p 
JOIN pg_namespace n ON p.pronamespace = n.oid 
WHERE n.nspname = 'private' AND p.proname = 'handle_new_user';
```

**Resultado Retornado pelo Catálogo:**
```json
{
  "nspname": "private",
  "proname": "handle_new_user",
  "owner": "postgres",
  "prosecdef": true,
  "proconfig": [
    "search_path=\"\""
  ],
  "proacl": "{postgres=X/postgres}",
  "definition": "CREATE OR REPLACE FUNCTION private.handle_new_user()\n RETURNS trigger\n LANGUAGE plpgsql\n SECURITY DEFINER\n SET search_path TO ''\nAS $function$\nBEGIN\n  -- Validação mandatória do nome do profissional/empresa\n  IF NEW.raw_user_meta_data->>'nome' IS NULL OR trim(NEW.raw_user_meta_data->>'nome') = '' THEN\n    RAISE EXCEPTION 'Nome do usuário é obrigatório para criação do perfil.';\n  END IF;\n\n  -- Inserção segura e estritamente qualificada no schema public\n  INSERT INTO public.usuario (id, nome, telefone)\n  VALUES (\n    NEW.id,\n    trim(NEW.raw_user_meta_data->>'nome'),\n    nullif(trim(NEW.raw_user_meta_data->>'telefone'), '')\n  );\n\n  RETURN NEW;\nEND;\n$function$\n"
}
```

#### Conclusão da Inspeção de Catálogo:
- **`search_path` Real:** `SET search_path TO ''` (vazio estático com referências schema-qualified);
- **Owner:** `postgres`;
- **Modificador:** `SECURITY DEFINER` (`prosecdef = true`);
- **Permissões (`proacl`):** Exclusivamente `postgres=X/postgres` (privilégios de execução revogados de `PUBLIC`, `anon` e `authenticated`).

### 2.2. Inspeção da Versão do PostgreSQL Local
Consultas realizadas via `npx supabase db query`:
```sql
SELECT version();
SHOW server_version;
```

**Resultados Retornados:**
- `version()`: `"PostgreSQL 17.6 on x86_64-pc-linux-gnu, compiled by gcc (GCC) 15.2.0, 64-bit"`
- `server_version`: `"17.6"`

---

## 3. Comparação com Documentos Canônicos e Histórico

| Item Inspecionado | Estratégia v1.6 / Auditoria Estática | Relatório Execução Local v1.0 | Texto Inicial do Relatório Dinâmico v1.0 | Catálogo PostgreSQL Real Local | Situação |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`search_path` da função** | `SET search_path = ''` | Conforme migration | *`SET search_path = public, auth, pg_temp`* (erro de digitação na Seção 14) | `SET search_path TO ''` (`proconfig: search_path=""`) | **Banco Real 100% Conforme com a Estratégia Canônica** (Divergência era puramente textual no relatório) |
| **Versão PostgreSQL** | PG 15+ / Supabase Docker | Não especificado numericamente | *15.8* (presunção genérica na Seção 2) | `17.6` (versão padrão do Supabase CLI 2.117.0) | **Ambiente Real Atualizado** (Ajuste descritivo de ambiente) |

---

## 4. Correções Realizadas no Relatório Dinâmico

O arquivo [`docs/relatorios/auth-rls-dynamic-tests-v1.0.md`](file:///c:/Users/luanh/Documents/jardinagem-app/docs/relatorios/auth-rls-dynamic-tests-v1.0.md) foi corrigido pontualmente:

1. **Seção 2 (Ambiente):**
   - **Antes:** `- PostgreSQL Version: 15.8 (via Supabase Postgres Container)`
   - **Depois:** `- PostgreSQL Version: 17.6 (PostgreSQL 17.6 on x86_64-pc-linux-gnu, Supabase Postgres Container)`

2. **Seção 14 (Trigger `private.handle_new_user`):**
   - **Antes:** `- SECURITY DEFINER e SET search_path = public, auth, pg_temp;`
   - **Depois:** `- SECURITY DEFINER e SET search_path = '' (search path estaticamente vazio, com referências schema-qualified public.usuario);`

Nenhuma outra alteração foi feita no relatório. Todos os resultados de testes (170/170 pgTAP e 49/49 Jest) foram rigorosamente preservados.

---

## 5. Garantias e Confirmações Estruturais

- [x] **Migration congelada intacta:** `supabase/migrations/20260916020500_modelo_fisico_v1_1.sql` permanece inalterada;
- [x] **Migration Auth + RLS intacta:** `supabase/migrations/20260921000000_auth_rls.sql` permanece inalterada;
- [x] **Policies intactas:** Nenhuma das 31 policies RLS foi modificada;
- [x] **Zero SQL estrutural executado:** Apenas consultas de leitura de catálogo (`pg_proc`, `version()`, `server_version`) foram executadas;
- [x] **Código de produção intacto:** Nenhum arquivo em `src/` ou `app/` foi alterado.

---

## 6. Validação dos Testes

Executada a verificação de sanidade do código e testes existentes:
- `npm run test:typecheck`: **0 erros**
- `npm test`: **49/49 testes aprovados**

---

## 7. Conclusão e Status

Com a comprovação empírica de que a função `private.handle_new_user()` no banco real implementa estritamente `SET search_path = ''` conforme homologado na Estratégia Canônica v1.6, e com a retificação descritiva da versão do PostgreSQL (17.6), as duas inconsistências documentais estão **plenamente reconciliadas**.

- **Status da Validação:** **VALIDAÇÃO DINÂMICA CONCLUÍDA**
- **Parecer Técnico:** **APTA À AUDITORIA DA IMPLEMENTAÇÃO**
- **Prontidão:** **PRONTA PARA AUDITORIA DA IMPLEMENTAÇÃO**

*(Aguardando decisão e autorização formal do usuário para prosseguir).*
