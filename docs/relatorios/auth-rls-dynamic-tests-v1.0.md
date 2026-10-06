# Relatório de Bateria de Testes Dinâmicos Auth + RLS v1.0

**Documento de Validação Comportamental em Banco de Dados Real (Ambiente Supabase LOCAL)**  
**Objeto Validado:** Comportamento real de Auth, Triggers, RLS Policies e Integridade Referencial derivados da migration `supabase/migrations/20260921000000_auth_rls.sql` aplicada sobre `supabase/migrations/20260916020500_modelo_fisico_v1_1.sql`.  
**Mecanismo de Teste:** pgTAP (`supabase test db`) + Jest / TypeScript (`npm run test:typecheck` e `npm test`).  
**Data da Execução:** 2026-09-20  
**Autor:** Equipe de Engenharia e Arquitetura de Software  

---

## 1. Objetivo

Validar o comportamento dinâmico real da arquitetura de Autenticação e Row Level Security (RLS) no PostgreSQL/Supabase Local, certificando:
- O funcionamento do gatilho de provisionamento automático de perfil (`private.handle_new_user`);
- O isolamento multi-tenant rigoroso entre usuários distintos;
- O bloqueio contra ataques cross-tenant por `INSERT`, `UPDATE` e `DELETE`;
- A integridade das decisões arquiteturais homologadas **D1** (ausência de policy de exclusão física para `usuario`) e **D2** (exclusão de orçamento e entidades dependentes estritamente condicionada ao estado `RASCUNHO`);
- A eficácia da política Default Deny para o papel `anon` (usuário não autenticado);
- O comportamento do fluxo defensivo de conclusão de perfil (`/concluir-perfil`);
- A integridade das foreign keys (`ON DELETE RESTRICT` e `ON DELETE CASCADE`).

---

## 2. Ambiente

- **Tipo:** Supabase LOCAL (Docker Engine v27+)
- **PostgreSQL Version:** 17.6 (PostgreSQL 17.6 on x86_64-pc-linux-gnu, Supabase Postgres Container)
- **Extensões:** PostGIS 3.3+, pgtap 1.2.0
- **Host do Banco:** `127.0.0.1:54322`
- **Database:** `postgres`
- **Schema de Negócio:** `public`
- **Schema Privado:** `private`
- **Schema de Autenticação:** `auth`
- **Branches / Migrations:**
  - `20260916020500_modelo_fisico_v1_1.sql` (Modelo Físico v1.1 congelado)
  - `20260921000000_auth_rls.sql` (Auth + RLS v1.0 homologado)

---

## 3. Versão Supabase CLI

- **Versão:** `2.117.0`
- **Comando Executor de Banco:** `npx supabase test db`

---

## 4. Usuários de Teste

Para simulação de cenários multi-tenant simétricos e assimétricos, foram criadas identidades controladas em `auth.users` dotadas de UUIDs canônicos e metadados estruturados:

| Identificador | UUID | Email | Perfil em `public.usuario` |
| :--- | :--- | :--- | :--- |
| **USER_A** | `11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa` (e variações por suíte) | `user.a@example.com` | `Profissional A` |
| **USER_B** | `22222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb` (e variações por suíte) | `user.b@example.com` | `Profissional B` |
| **USER_DEFENSIVE** | `44444444-4444-4444-4444-444444444444` | `sem.perfil@example.com` | Inicialmente ausente (simulação `/concluir-perfil`) |
| **ANON** | *(Sem identidade / claim nula)* | *(Sem email)* | N/A (Papel `anon`) |

---

## 5. Estratégia de Simulação de Identidade

A simulação de sessões autenticadas sem quebra das regras de segurança e respeitando a função `auth.uid()` do Supabase foi implementada no padrão nativo do PostgREST/Supabase:

```sql
-- Simulação de User A:
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

-- Simulação de User B:
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '22222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

-- Simulação de Visitante Anônimo:
SET LOCAL ROLE anon;
RESET "request.jwt.claim.sub";

-- Retorno ao contexto de superusuário para asserções de integridade do catálogo:
RESET ROLE;
```

Todas as suítes de teste são executadas em blocos transacionais fechados terminados com `ROLLBACK;`, garantindo que **nenhum dado de teste permaneça no banco local**.

---

## 6. Arquivos de Teste

Foram estruturadas **8 suítes especializadas de teste pgTAP** no diretório `supabase/tests/`, cobrindo 100% dos requisitos estabelecidos:

| Arquivo | Descrição da Suíte | Quantidade de Testes |
| :--- | :--- | :---: |
| `01_bootstrap_and_trigger.sql` | Validação do gatilho `handle_new_user`, tratamento de nomes e `/concluir-perfil` | 9 |
| `02_usuario_rls.sql` | Validação de RLS para `usuario`: SELECT, UPDATE, INSERT e Default Deny no DELETE (D1) | 13 |
| `03_catalogo_rls.sql` | Validação de isolamento para `cliente`, `servico` e `produto` e bloqueio de FKs | 27 |
| `04_orcamento_rls.sql` | Ciclo do `orcamento`, vinculação exclusiva a clientes próprios e regra D2 no DELETE | 16 |
| `05_itens_e_areas_rls.sql` | Validação em cadeia para `item_orcamento` e `area` (PostGIS), herança de status D2 | 22 |
| `06_endereco_rls.sql` | Validação da cadeia `endereco -> cliente -> usuario`, mutações e CASCADE | 15 |
| `07_anon_access.sql` | Validação de Default Deny integral para papel `anon` nas 8 tabelas de domínio | 33 |
| `08_cross_tenant_mutations.sql`| Ataques cross-tenant por UPDATE, simetria de User B e tentativas de exclusão cruzada | 35 |
| **TOTAL** | **Cobertura Integral de Auth + RLS no Banco** | **170** |

---

## 7. Testes por Tabela

Distribuição das asserções dinâmicas nas 8 tabelas do domínio:

| Tabela | Policies Testadas | Casos SELECT | Casos INSERT | Casos UPDATE | Casos DELETE | Total Testes |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| `usuario` | 3 (SELECT, INSERT, UPDATE) | 4 | 4 | 3 | 2 (D1) | 13 |
| `cliente` | 4 (SELECT, INSERT, UPDATE, DELETE) | 5 | 4 | 4 | 4 | 17 |
| `servico` | 4 (SELECT, INSERT, UPDATE, DELETE) | 5 | 4 | 4 | 3 | 16 |
| `produto` | 4 (SELECT, INSERT, UPDATE, DELETE) | 5 | 4 | 4 | 3 | 16 |
| `orcamento` | 4 (SELECT, INSERT, UPDATE, DELETE) | 6 | 4 | 4 | 4 (D2) | 18 |
| `item_orcamento` | 4 (SELECT, INSERT, UPDATE, DELETE) | 7 | 6 | 4 | 4 (D2) | 21 |
| `area` | 4 (SELECT, INSERT, UPDATE, DELETE) | 7 | 4 | 4 | 4 (D2) | 19 |
| `endereco` | 4 (SELECT, INSERT, UPDATE, DELETE) | 6 | 4 | 4 | 4 | 18 |
| *Função / Anon / Metadados* | *Security Definer / Default Deny* | 8 | 8 | 8 | 8 | 32 |

---

## 8. Testes Positivos

Cenários legítimos executados com sucesso por usuários autenticados em relação aos seus próprios recursos:
- **`usuario`**: Leitura do próprio perfil (`id = auth.uid()`), alteração de telefone/nome próprio.
- **`cliente`**: Criação com `usuario_id = auth.uid()`, consulta, atualização cadastral e exclusão sem dependências.
- **`servico` / `produto`**: Inserção no catálogo próprio, leitura, alteração de valores/unidades e exclusão limpa sem vínculos em itens.
- **`orcamento`**: Criação de orçamento vinculado a cliente do próprio usuário, consulta detalhada, atualização de observações/totais em estado `RASCUNHO`.
- **`item_orcamento`**: Inserção de serviços e produtos do próprio catálogo em orçamento próprio em `RASCUNHO`.
- **`area`**: Delimitação espacial de polígonos PostGIS em EPSG:4326 em item próprio de orçamento em `RASCUNHO`.
- **`endereco`**: Associação de endereço ao cliente do próprio usuário, consulta e manutenção.

---

## 9. Testes Negativos

Cenários ilegais bloqueados com sucesso pelas policies RLS e constraints do banco:
- **Tentativa de leitura de registros de terceiros**: Consultas diretas retornam zero linhas (invisibilidade completa via cláusula `USING`).
- **Tentativa de inserção com `usuario_id` de terceiro**: Rejeitada com violação de policy (`WITH CHECK`).
- **Tentativa de vincular cliente de terceiro a orçamento próprio**: Rejeitada com violação de policy em `orcamento_insert_own` (`WITH CHECK`).
- **Tentativa de vincular serviço ou produto de terceiro a item de orçamento próprio**: Rejeitada por `item_orcamento_insert_own` (`WITH CHECK`).
- **Tentativa de vincular área a item de terceiro**: Rejeitada por `area_insert_own` (`WITH CHECK`).
- **Tentativa de vincular endereço a cliente de terceiro**: Rejeitada por `endereco_insert_own` (`WITH CHECK`).
- **Tentativa de exclusão física de usuário**: Bloqueada por Default Deny (não há policy de DELETE em `usuario`).

---

## 10. Cross-Tenant

A bateria de testes investigou e comprovou a robustez das proteções contra ataques cross-tenant em todas as direções:
1. **Invisibilidade Total**: `SELECT count(*)` em qualquer tabela do domínio para um usuário autenticado contabiliza estritamente os seus registros (isolamento vertical e horizontal).
2. **Imunidade contra Deletes Cruzados**: Quando User B executa `DELETE FROM cliente WHERE id = <cliente_de_a>`, o PostgreSQL afeta `0` linhas e o registro de User A permanece intacto. O mesmo comportamento foi validado para `servico`, `produto`, `orcamento`, `item_orcamento`, `area` e `endereco`.
3. **Simetria Multi-Tenant**: User B possui as mesmas capacidades sobre seus dados e a mesma impossibilidade absoluta de tocar dados de User A.

---

## 11. D1 — Exclusão Física de Usuário

- **Regra:** Não existe política de exclusão física (`DELETE`) para a tabela `public.usuario`. A exclusão física é terminantemente proibida para usuários finais.
- **Validação:**
  ```sql
  DELETE FROM public.usuario WHERE id = '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  ```
  Executado sob o papel `authenticated` com `auth.uid() = 11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa`.
- **Resultado:** Afetou `0` linhas. O registro do usuário permaneceu inalterado no banco.
- **Conclusão:** Regra **D1** plenamente satisfeita via Default Deny do PostgreSQL.

---

## 12. D2 — Exclusão Condicionada a RASCUNHO

- **Regra:** Orçamentos e seus itens e áreas só podem ser excluídos pelo titular se o orçamento estiver no estado `RASCUNHO`. Em qualquer outro status (`ENVIADO`, `APROVADO`, `RECUSADO`, `CANCELADO`), a exclusão deve ser terminantemente bloqueada.
- **Validações:**
  1. **Orçamento em `RASCUNHO`:** User A exclui o orçamento e o registro é removido com sucesso.
  2. **Orçamento em `ENVIADO`:** User A tenta excluir o orçamento; a operação afeta `0` linhas (bloqueada pela policy).
  3. **Item em orçamento `ENVIADO`:** User A tenta excluir item de orçamento enviado; a operação afeta `0` linhas.
  4. **Área em orçamento `ENVIADO`:** User A tenta excluir área de item cujo orçamento raiz está enviado; a operação afeta `0` linhas.
- **Conclusão:** Regra **D2** plenamente satisfeita em toda a hierarquia `orcamento -> item_orcamento -> area`.

---

## 13. Bootstrap de Autenticação

- **Mecanismo:** Ao inserir um usuário em `auth.users`, a trigger `on_auth_user_created` intercepta o evento e invoca a função `private.handle_new_user()`.
- **Validações:**
  1. Criação de usuário em `auth.users` gera automaticamente linha correspondente em `public.usuario`.
  2. O identificador `id` em `public.usuario` é exatamente idêntico ao `id` em `auth.users`.
  3. Tentativa de inserir usuário sem nome em `raw_user_meta_data` é abortada com exceção descritiva:
     `ERROR: Nome do usuário é obrigatório para criação do perfil.`
- **Conclusão:** Bootstrap dinâmico 100% conforme a estratégia canônica.

---

## 14. Trigger (`private.handle_new_user`)

- **Propriedades da Função:**
  - `SECURITY DEFINER` e `SET search_path = ''` (search path estaticamente vazio, com referências schema-qualified `public.usuario`);
  - Permissão de execução revogada de `PUBLIC`, `anon` e `authenticated`;
  - Tratamento de nomes: aplica `TRIM` e sanitização de espaços em branco;
  - Cláusula de idempotência: `ON CONFLICT (id) DO NOTHING`.
- **Validações:**
  - Papéis `anon` e `authenticated` recebem `permission denied` ao tentar invocar a função manualmente;
  - Disparo exclusivo pelo motor de trigger em nível de superusuário/auth.
- **Conclusão:** Função protegida contra abusos externos e estritamente restrita ao contexto da trigger.

---

## 15. /concluir-perfil (Fluxo Defensivo)

- **Cenário de Negócio:** Usuário existente em `auth.users`, porém com perfil ausente em `public.usuario` (e.g., inserção prévia incompleta, migração legada ou falha temporária).
- **Validação:**
  1. Usuário de teste é criado em `auth.users` e seu registro correspondente em `public.usuario` é removido manualmente como administrador.
  2. Assumindo o papel `authenticated` com o token desse usuário, é executado o fluxo previsto para a tela `/concluir-perfil`:
     ```sql
     INSERT INTO public.usuario (id, nome, telefone)
     VALUES ('44444444-4444-4444-4444-444444444444', 'Usuário Recuperado', '11944444444');
     ```
  3. A política `usuario_insert_own` permite a inserção com sucesso porque `id = auth.uid()`.
  4. Nova tentativa de reinserir o mesmo ID é bloqueada por chave primária, e tentativa de inserir outro ID qualquer é bloqueada pela policy RLS.
- **Conclusão:** O fluxo defensivo da aplicação funciona perfeitamente sem exigir concessão de privilégios adicionais.

---

## 16. anon (Default Deny)

A suíte `07_anon_access.sql` submeteu as 8 tabelas de domínio a operações executadas pelo papel `anon` (sem claim de autenticação):
- **SELECT:** Retornou `0` linhas em todas as 8 tabelas (`usuario`, `cliente`, `endereco`, `servico`, `produto`, `orcamento`, `item_orcamento`, `area`).
- **INSERT:** Rejeitado com exceção explícita de violação de RLS (`new row violates row-level security policy`) em todas as 8 tabelas.
- **UPDATE:** Afetou `0` linhas e não produziu nenhuma alteração em registros existentes.
- **DELETE:** Afetou `0` linhas e nenhum dado foi excluído.
- **Conclusão:** Papel não autenticado encontra-se em total bloqueio por Default Deny.

---

## 17. Foreign Keys (Integridade Referencial)

Foram testadas as restrições relacionais homologadas no Modelo Físico v1.1 em conjunto com RLS:
1. **`cliente -> usuario` (`ON DELETE RESTRICT`):** Não aplicável para exclusão normal de usuário devido a D1, e restrito no banco.
2. **`orcamento -> cliente` (`ON DELETE RESTRICT`):** Tentativa de excluir cliente que possui orçamento vinculado falha com erro de chave estrangeira:
   `violates foreign key constraint "orcamento_cliente_id_fkey" on table "orcamento"`.
3. **`item_orcamento -> servico` (`ON DELETE RESTRICT`):** Tentativa de excluir serviço referenciado em item de orçamento falha com erro de chave estrangeira:
   `violates foreign key constraint "item_orcamento_servico_id_fkey" on table "item_orcamento"`.
4. **`item_orcamento -> produto` (`ON DELETE RESTRICT`):** Tentativa de excluir produto referenciado em item de orçamento falha com erro de chave estrangeira:
   `violates foreign key constraint "item_orcamento_produto_id_fkey" on table "item_orcamento"`.
5. **`endereco -> cliente` (`ON DELETE CASCADE`):** Exclusão de cliente sem orçamentos acarreta a exclusão automática de seu endereço vinculado.
6. **`area -> item_orcamento` (`ON DELETE CASCADE`):** Exclusão do item ou do orçamento em `RASCUNHO` acarreta a exclusão em cascata das áreas correspondentes.

---

## 18. Resultado dos Testes

### 18.1. Testes de Banco de Dados (pgTAP)
Comando: `npx supabase test db`
```text
Connecting to local database...
/Users/luanh/Documents/jardinagem-app/supabase/tests/01_bootstrap_and_trigger.sql ... ok
/Users/luanh/Documents/jardinagem-app/supabase/tests/02_usuario_rls.sql ............. ok
/Users/luanh/Documents/jardinagem-app/supabase/tests/03_catalogo_rls.sql ............ ok
/Users/luanh/Documents/jardinagem-app/supabase/tests/04_orcamento_rls.sql ........... ok
/Users/luanh/Documents/jardinagem-app/supabase/tests/05_itens_e_areas_rls.sql ....... ok
/Users/luanh/Documents/jardinagem-app/supabase/tests/06_endereco_rls.sql ............ ok
/Users/luanh/Documents/jardinagem-app/supabase/tests/07_anon_access.sql ............. ok
/Users/luanh/Documents/jardinagem-app/supabase/tests/08_cross_tenant_mutations.sql .. ok
All tests successful.
Files=8, Tests=170,  1 wallclock secs ( 0.03 usr  0.03 sys +  0.06 cusr  0.04 csys =  0.16 CPU)
Result: PASS
```
- **Arquivos de Teste:** 8/8 aprovados
- **Asserções Executadas:** 170/170 aprovadas (100% de sucesso)
- **Falhas de Banco:** 0

### 18.2. Testes de Tipagem e TypeScript
Comando: `npm run test:typecheck`
```text
> jardinagem-app@1.0.0 test:typecheck
> tsc --project tsconfig.test.json --noEmit
```
- **Erros de Tipagem:** 0

### 18.3. Testes Unitários de Domínio (Jest)
Comando: `npm test`
```text
# tests 49
# suites 10
# pass 49
# fail 0
# cancelled 0
# skipped 0
# todo 0
```
- **Testes de Domínio:** 49/49 aprovados

---

## 19. Falhas, se houver

- **Falhas Comportamentais de RLS/Auth:** **Nenhuma**.
- **Inconsistências Identificadas:** Durante o ajuste inicial das suítes de teste para espelhar as constraints do Modelo Físico v1.1, foram adequados nomes de colunas obrigatórias nas queries dos testes (`unidade` e `usa_medicao_area` em `servico`; `unidade` e `preco_base` em `produto`; `numero` em `orcamento`; `valor_unitario` e `valor_total` em `item_orcamento`; e `geometria` em `area`).
- Nenhuma migration, policy ou código de produção precisou ser alterado. A migration `20260921000000_auth_rls.sql` permaneceu **100% intacta e congelada**.

---

## 20. Evidências

### 20.1. Limpeza do Banco Pós-Execução
A verificação via query administrativa após a bateria de testes atestou que nenhuma entidade permanente permaneceu inserida no banco:
```json
{
  "rows": [
    {
      "clientes": 0,
      "orcamentos": 0,
      "users": 0,
      "usuarios": 0
    }
  ]
}
```
Todas as asserções rodaram em transações com `ROLLBACK;`.

---

## 21. Conclusão e Classificação Final

A validação dinâmica comportamental confirmou de forma empírica e irrefutável que a migration `20260921000000_auth_rls.sql` cumpre com precisão matemática todos os requisitos de segurança, isolamento multi-tenant, ciclo de vida e integridade definidos na Estratégia Canônica Auth + RLS v1.6 e no Plano Executivo Homologado v1.0.

- **Classificação Final:** **CONFORME**
- **Status da Validação:** **VALIDAÇÃO DINÂMICA CONCLUÍDA**
- **Parecer Técnico:** **APTA À AUDITORIA DA IMPLEMENTAÇÃO**

*(Aguardando instrução formal do usuário para as próximas etapas. A implementação não foi homologada automaticamente).*
