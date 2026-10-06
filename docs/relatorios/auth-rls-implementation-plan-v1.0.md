# Plano Executivo de Implementação de Supabase Auth + RLS v1.0

**Documento de Planejamento Técnico e Engenharia de Software**  
**Objeto:** Especificação Operacional da Implementação de Supabase Auth + PostgreSQL RLS  
**Status:** HOMOLOGADA  
**Data de Elaboração:** 2026-09-20  
**Autor:** Equipe de Arquitetura e Engenharia de Software  

---

## 1. Objetivo e Princípios do Plano Executivo

### 1.1. Objetivo
O presente documento estabelece o **Plano Executivo de Implementação** para a introdução da autenticação gerenciada (**Supabase Auth**) e das políticas de segurança em nível de linha (**PostgreSQL Row Level Security — RLS**) no Sistema de Orçamentos para Jardinagem.

Este plano traduz as decisões arquiteturais formalmente homologadas na:
- [`docs/relatorios/auth-rls-strategy-v1.6.md`](file:///c:/Users/luanh/Documents/jardinagem-app/docs/relatorios/auth-rls-strategy-v1.6.md)
- [`docs/relatorios/auth-rls-strategy-v1.6-audit-v1.0.md`](file:///c:/Users/luanh/Documents/jardinagem-app/docs/relatorios/auth-rls-strategy-v1.6-audit-v1.0.md)

em uma **sequência de engenharia concreta, segura, ordenada e rastreável**, estabelecendo os inventários de objetos, requisitos prévios, riscos, critérios de aceite e rotinas de validação antes da execução física de qualquer alteração no banco de dados ou no código da aplicação.

> [!IMPORTANT]
> **Natureza Exclusivamente Documental e de Planejamento:**  
> Este documento constitui estritamente uma etapa de planejamento prévio.  
> - **NÃO implementa Auth nem RLS nesta etapa;**  
> - **NÃO cria migrations;**  
> - **NÃO cria policies, functions ou triggers no banco de dados;**  
> - **NÃO executa instruções SQL;**  
> - **NÃO altera a instância do PostgreSQL ou o arquivo congelado `supabase/migrations/20260916020500_modelo_fisico_v1_1.sql`;**  
> - **NÃO modifica o código de produção da aplicação móvel.**

---

### 1.2. Princípios Norteadores da Implementação
A execução futura da estratégia deverá preservar rigorosamente as seguintes premissas e invariantes arquiteturais:

1. **Supabase Auth como Autoridade Exclusiva de Identidade:** O catálogo interno `auth.users` é a fonte da verdade para identidades, credenciais, hashing seguro de senhas via `bcrypt` e gerenciamento de sessões/tokens JWT;
2. **`public.usuario` como Perfil da Aplicação:** A tabela `public.usuario` representa estritamente o perfil de negócio do profissional de jardinagem e não armazena senhas, tokens nem duplica a coluna de e-mail;
3. **Correspondência Estrita de Identificadores:** O identificador primário `public.usuario.id` é do tipo `UUID` e corresponde identicamente ao `id` da identidade autenticada gerada pelo Supabase Auth (`auth.users.id` / `auth.uid()`), sem gerador de UUID aleatório próprio;
4. **Isolamento Multi-Tenant por `usuario_id`:** A segregação lógica de dados entre profissionais distintos é garantida no nível de banco através da associação direta ou por cadeia ao `usuario_id`;
5. **RLS como Mecanismo de Autorização por Linha:** O RLS é o mecanismo de segurança que decide se uma determinada linha pode ser lida, inserida, atualizada ou excluída pelo papel `authenticated`;
6. **Foreign Keys como Mecanismo de Integridade Referencial Física:** As chaves estrangeiras (`ON DELETE RESTRICT` e `ON DELETE CASCADE`) garantem a consistência relacional e a ausência de órfãos na estrutura relacional;
7. **Domínio e Regras de Negócio como Responsabilidade da Aplicação:** Regras de transição de estado, validação de campos, cálculos de área e formatação de propostas permanecem sob responsabilidade das entidades e serviços das camadas de Domain e Application;
8. **Segregação Formal de Responsabilidades:** Manter a clara fronteira entre autorização de linha (RLS), integridade física estrutural (Constraints/FKs) e regras de negócio do domínio (ciclo de vida);
9. **Distinção entre Homologado e Implementado:** Todas as diretrizes aqui detalhadas representam decisões documentalmente homologadas, cuja materialização técnica só ocorrerá quando expressamente autorizada;
10. **Inexistência de Novas Regras de Negócio:** Nenhuma regra de negócio ausente em RN v3, RF v2 ou RNF v2 foi introduzida neste planejamento.

---

## 2. Inventário de Objetos do Banco de Dados

Para guiar a implementação com controle total de impacto, os objetos do banco de dados são categorizados em quatro grupos analíticos:

```text
+---------------------------------------------------------------------------------------------------+
|                                 INVENTÁRIO GERAL DE OBJETOS SGBD                                  |
+---------------------------------------------------------------------------------------------------+
| GRUPO A: Objetos Existentes e Congelados (Modelo Físico v1.1)                                     |
| GRUPO B: Objetos Novos a Criar (Futura Migration de Auth/RLS)                                     |
| GRUPO C: Objetos a Alterar (Habilitação de RLS via ALTER TABLE)                                   |
| GRUPO D: Objetos que NÃO Devem ser Alterados sob Nenhuma Hipótese                                 |
+---------------------------------------------------------------------------------------------------+
```

### 2.1. Grupo A: Objetos Já Existentes e Congelados
Objetos criados e consolidados pela migration inicial [`supabase/migrations/20260916020500_modelo_fisico_v1_1.sql`](file:///c:/Users/luanh/Documents/jardinagem-app/supabase/migrations/20260916020500_modelo_fisico_v1_1.sql):
- **Extensão:** `postgis` (schema `public`);
- **Domínios/Types:** `tipo_unidade_servico`, `tipo_desconto_orcamento`, `status_orcamento`;
- **Tabelas do Schema `public`:**
  - `public.usuario`
  - `public.cliente`
  - `public.endereco`
  - `public.servico`
  - `public.produto`
  - `public.orcamento`
  - `public.item_orcamento`
  - `public.area`
- **Chaves Estrangeiras:**
  - `fk_cliente_usuario` (`ON DELETE RESTRICT`)
  - `fk_endereco_cliente` (`ON DELETE CASCADE`)
  - `fk_servico_usuario` (`ON DELETE RESTRICT`)
  - `fk_produto_usuario` (`ON DELETE RESTRICT`)
  - `fk_orcamento_usuario` (`ON DELETE RESTRICT`)
  - `fk_orcamento_cliente` (`ON DELETE RESTRICT`)
  - `fk_item_orcamento_orcamento` (`ON DELETE CASCADE`)
  - `fk_item_orcamento_servico` (`ON DELETE RESTRICT`)
  - `fk_item_orcamento_produto` (`ON DELETE RESTRICT`)
  - `fk_area_item_orcamento` (`ON DELETE CASCADE`)
- **Índices B-Tree Estruturais:**
  - `idx_cliente_usuario_id`
  - `idx_endereco_cliente_id`
  - `idx_servico_usuario_id`
  - `idx_produto_usuario_id`
  - `idx_orcamento_usuario_id`
  - `idx_orcamento_cliente_id`
  - `idx_item_orcamento_orcamento_id`
  - `idx_item_orcamento_servico_id`
  - `idx_item_orcamento_produto_id`
  - `idx_area_item_orcamento_id`
  - `idx_area_poligono_gist` (índice espacial GiST)
- **Schema `auth` do Supabase:** Tabela `auth.users` e papéis de infraestrutura (`anon`, `authenticated`, `postgres`, `supabase_auth_admin`).

---

### 2.2. Grupo B: Objetos que Precisarão Ser Criados
Objetos a serem introduzidos exclusivamente por uma **nova migration dedicada de Auth/RLS**:
1. **Schema Privado:**
   - `private` (schema fora da publicação do PostgREST);
2. **Função de Bootstrap Transacional:**
   - `private.handle_new_user()` com `SECURITY DEFINER`, `SET search_path = ''` e proprietário `postgres`;
3. **Trigger Nativa:**
   - `on_auth_user_created` disparada no evento `AFTER INSERT ON auth.users`;
4. **Políticas de RLS para Tabelas com Titularidade Direta (19 políticas):**
   - `usuario`: `usuario_select_policy`, `usuario_insert_policy`, `usuario_update_policy` (*Sem policy de DELETE — Default Deny estrito*);
   - `cliente`: `cliente_select_policy`, `cliente_insert_policy`, `cliente_update_policy`, `cliente_delete_policy`;
   - `servico`: `servico_select_policy`, `servico_insert_policy`, `servico_update_policy`, `servico_delete_policy`;
   - `produto`: `produto_select_policy`, `produto_insert_policy`, `produto_update_policy`, `produto_delete_policy`;
   - `orcamento`: `orcamento_select_policy`, `orcamento_insert_policy`, `orcamento_update_policy`, `orcamento_delete_policy` (*Condicionado a `status = 'RASCUNHO'`*);
5. **Políticas de RLS para Tabelas com Titularidade por Cadeia (12 políticas):**
   - `endereco`: `endereco_select_policy`, `endereco_insert_policy`, `endereco_update_policy`, `endereco_delete_policy`;
   - `item_orcamento`: `item_orcamento_select_policy`, `item_orcamento_insert_policy`, `item_orcamento_update_policy`, `item_orcamento_delete_policy` (*Condicionado a orçamento pai em `RASCUNHO'`*);
   - `area`: `area_select_policy`, `area_insert_policy`, `area_update_policy`, `area_delete_policy` (*Condicionado a orçamento raiz em `RASCUNHO'`*);
   *(Totalizando 31 políticas de RLS distribuídas entre as 8 tabelas de domínio)*
6. **Comandos de Revogação de Privilégios:**
   - `REVOKE ALL ON FUNCTION private.handle_new_user() FROM PUBLIC;`
   - `REVOKE EXECUTE ON FUNCTION private.handle_new_user() FROM anon, authenticated;`

> [!CAUTION]
> **Avaliação de Funções Auxiliares:**  
> Nenhuma função auxiliar de autorização (ex.: `is_owner()`, `get_budget_status()`) está prevista na estratégia homologada v1.6.  
> Tais funções introduziriam sobrecarga desnecessária de chaveamento de contexto (*context switching*) e acoplamento.  
> Qualquer proposta de função auxiliar é classificada como **NÃO DEFINIDA / REQUER DECISÃO ARQUITETURAL ESPECÍFICA** e não deve ser criada.

---

### 2.3. Grupo C: Objetos que Precisarão Ser Alterados
Apenas o estado de segurança das tabelas existentes será modificado através de DDL:
- `ALTER TABLE public.usuario ENABLE ROW LEVEL SECURITY;`
- `ALTER TABLE public.cliente ENABLE ROW LEVEL SECURITY;`
- `ALTER TABLE public.endereco ENABLE ROW LEVEL SECURITY;`
- `ALTER TABLE public.servico ENABLE ROW LEVEL SECURITY;`
- `ALTER TABLE public.produto ENABLE ROW LEVEL SECURITY;`
- `ALTER TABLE public.orcamento ENABLE ROW LEVEL SECURITY;`
- `ALTER TABLE public.item_orcamento ENABLE ROW LEVEL SECURITY;`
- `ALTER TABLE public.area ENABLE ROW LEVEL SECURITY;`

*Nenhuma alteração de colunas, constraints ou tipos de dados será efetuada nestas tabelas.*

---

### 2.4. Grupo D: Objetos que NÃO Devem Ser Alterados sob Nenhuma Hipótese
1. O arquivo `supabase/migrations/20260916020500_modelo_fisico_v1_1.sql` (congelado);
2. A estrutura relacional, colunas e chaves estrangeiras aprovadas no Modelo Físico v1.1 e DER v1.1;
3. As definições e parâmetros da extensão `postgis`;
4. Tabelas e estruturas internas do schema `auth` gerenciadas pelo GoTrue / Supabase Auth;
5. Papéis de sistema nativos do PostgreSQL (`postgres`, `supabase_admin`, `authenticator`).

---

## 3. Ordem de Implementação Técnica e Gerenciamento de Riscos

A ordem de execução deve respeitar estritamente a topologia de dependências do SGBD para evitar brechas de segurança transitórias (*windows of exposure*) ou quebra de fluxo operacional durante a aplicação da migration.

```text
+---------------------------------------------------------------------------------------------------+
|                             SEQUÊNCIA DE IMPLEMENTAÇÃO DA MIGRATION                               |
+---------------------------------------------------------------------------------------------------+
| 1. Criação do Schema Privado (private)                                                            |
|    ↓                                                                                              |
| 2. Criação da Função private.handle_new_user() (SECURITY DEFINER, owner postgres)                |
|    ↓                                                                                              |
| 3. Aplicação de Menor Privilégio (REVOKE ALL FROM PUBLIC / anon / authenticated)                  |
|    ↓                                                                                              |
| 4. Ativação da Trigger Nativa em auth.users (on_auth_user_created)                                |
|    ↓                                                                                              |
| 5. Ativação de RLS nas 8 Tabelas de Domínio (ENABLE ROW LEVEL SECURITY)                          |
|    ↓                                                                                              |
| 6. Criação das Policies de Titularidade Direta (usuario, cliente, servico, produto, orcamento)    |
|    ↓                                                                                              |
| 7. Criação das Policies de Titularidade por Cadeia (endereco, item_orcamento, area)               |
|    ↓                                                                                              |
| 8. Execução de Testes Automatizados de Isolamento Multi-Tenant e Integração                       |
|    ↓                                                                                              |
| 9. Execução do Plano de Validação de Performance C1–C6 com EXPLAIN (ANALYZE, BUFFERS)             |
+---------------------------------------------------------------------------------------------------+
```

### Detalhamento Etapa por Etapa

| Etapa | Objeto Envolvido | Dependências | Motivo da Posição | Risco Técnico | Teste Necessário | Critério de Conclusão |
|---|---|---|---|---|---|---|
| **1** | `CREATE SCHEMA IF NOT EXISTS private;` | Nenhuma | Fornecer namespace isolado antes de criar rotinas internas. | Falha de permissão de DDL no cluster. | `SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'private';` | Schema `private` existente e não publicado no PostgREST. |
| **2** | `CREATE FUNCTION private.handle_new_user()` | Schema `private`, `public.usuario` | A função precisa existir antes que a trigger possa referenciá-la. | Erro de sintaxe PL/pgSQL ou referências a colunas incorretas. | Verificação de compilação da função no catálogo `pg_proc`. | Função compilada com `SECURITY DEFINER` e `search_path = ''`. |
| **3** | `REVOKE EXECUTE` | Função criada | Fechar a superfície de execução antes de vincular eventos ou expor a aplicação. | Permissões residuais em `PUBLIC` permitirem chamada RPC indevida. | Inspeção de ACLs em `pg_proc` via consulta a `proacl`. | Apenas `postgres` retém privilégio de execução; `PUBLIC`, `anon` e `authenticated` revogados. |
| **4** | `CREATE TRIGGER on_auth_user_created` | Função `private.handle_new_user()`, tabela `auth.users` | Garantir que qualquer criação de usuário já acione o provisionamento do perfil. | Disparo com erro abortar o cadastro no Supabase Auth. | Inserção simulada em `auth.users` gerando linha em `public.usuario`. | Trigger ativa e funcional para eventos `AFTER INSERT ON auth.users`. |
| **5** | `ENABLE ROW LEVEL SECURITY` (8 tabelas) | Tabelas existentes | Bloquear acessos abertos estabelecendo o comportamento *Default Deny* antes de criar permissões. | Bloqueio transitório de consultas legítimas caso não haja policies ativas. | Consulta sem policies retornando 0 linhas para `authenticated`. | RLS habilitado em todas as 8 tabelas (`relrowsecurity = true`). |
| **6** | Policies Diretas (`usuario`, `cliente`, etc.) | Tabelas com RLS habilitado | Estabelecer o acesso aos dados básicos e às entidades pai antes de suas dependentes. | Regras com predicados frouxos que permitam leitura cruzada. | Leitura e mutação com token de Tenant A vs Tenant B. | Usuário manipula exclusivamente seus próprios registros pai. |
| **7** | Policies em Cadeia (`endereco`, `item`, `area`) | Policies das entidades pai ativas | Subqueries `EXISTS` dependem da integridade das tabelas pai e de suas políticas. | Recursão infinita de policies ou travamento de subquery. | Inserção e consulta de item e área vinculados a orçamento próprio e alheio. | Subqueries operam com filtragem correta; tentativas cross-tenant bloqueadas. |
| **8** | Testes Automatizados de Isolamento | Migration completa | Validar formalmente a barreira multi-tenant em ambiente de teste local. | Falso positivo em testes mal instrumentados. | Execução da suíte de testes de integração com transações `BEGIN/ROLLBACK`. | 100% dos testes de autorização, negação e transição de estado aprovados. |
| **9** | Validação C1–C6 com `EXPLAIN` | Banco povoado com massa de teste | Avaliar o comportamento real do CBO perante as subqueries RLS. | Detecção de gargalos imprevistos de I/O em subqueries correlacionadas. | Execução de C1 a C6 com `EXPLAIN (ANALYZE, BUFFERS)`. | Planos de execução capturados e documentados conforme o relatório homologado. |

---

## 4. Arquitetura do Bootstrap Transacional: `auth.users` → `public.usuario`

O fluxo de provisionamento do perfil de negócio ocorre de forma estritamente atômica e transacional no SGBD, resguardado por salvaguardas de defesa em profundidade.

```text
[ Supabase Auth: signUp() ]
            │
            ▼
   (INSERT INTO auth.users)
            │
            ▼ (AFTER INSERT - Gatilho SGBD)
  [ TRIGGER: on_auth_user_created ]
            │
            ▼
  [ FUNCTION: private.handle_new_user() ]
   ├── Executa como: FUNCTION OWNER postgres (SECURITY DEFINER)
   ├── search_path: '' (Totalmente Vazio - Anti-Hijacking)
   ├── Schema: private (Fora da Data API do PostgREST)
   ├── Permissões: REVOKE de PUBLIC, anon e authenticated
   ├── Validação: Exige raw_user_meta_data->>'nome' obrigatório
   └── Ação:
            │
            ▼
   (INSERT INTO public.usuario (id, nome, telefone) VALUES (NEW.id, ...))
            │
            ▼
   [ Perfil de Negócio Criado no Mesmo Commit Transacional ]
```

### 4.1. Salvaguardas Homologadas da Rotina
1. **Modificador `SECURITY DEFINER`:** A função é executada sob as permissões da role `postgres`. Em virtude da rejeição homologada de `FORCE RLS` (Ponto 1), a operação de inserção em `public.usuario` usufrui de bypass nativo de RLS, permitindo criar o registro mesmo quando o usuário autenticado ainda não possui sessão ativa no PostgREST;
2. **Propriedade (`OWNER`):** A função pertence exclusivamente ao superusuário de banco `postgres`;
3. **Hardening contra Search Path Hijacking:** A cláusula estática `SET search_path = ''` neutraliza a injeção maliciosa de objetos em schemas arbitrários. Todas as chamadas a tabelas e funções do sistema no corpo do procedimento são explicitamente qualificadas (`public.usuario`);
4. **Residência no Schema `private`:** A função não reside em `public`, impedindo que seja mapeada como rota RPC na API REST pública do PostgREST;
5. **Menor Privilégio de Execução (`EXECUTE`):**
   - Revogação explícita de `PUBLIC`, `anon` e `authenticated`;
   - Ausência intencional de concessão de `EXECUTE` para o papel `supabase_auth_admin`, uma vez que triggers DML do PostgreSQL disparam nativamente no contexto do proprietário da rotina;
6. **Validação de Metadados:** Exige a presença do atributo `nome` em `raw_user_meta_data`. Caso omitido, aborta a transação com exceção SQL (`RAISE EXCEPTION`), impedindo que o cadastro em `auth.users` seja concluído sem a criação correspondente do perfil;
7. **Mecanismo Defensivo de Fallback na Aplicação:** Caso ocorra uma anomalia externa (ex.: inserção administrativa de usuário no painel do Supabase sem metadados), a camada de Application detecta no login a ausência de perfil (`SELECT FROM public.usuario WHERE id = auth.uid()` retorna vazio) e direciona para `/concluir-perfil`. A inserção subsequente é autorizada pela policy `usuario_insert_policy` (`WITH CHECK (auth.uid() = id)`).

---

## 5. Matriz Conceitual de Implementação das Políticas de RLS

A tabela a seguir define as especificações das políticas que deverão ser implementadas, detalhando as cláusulas `USING` e `WITH CHECK` conceituais, dependências relacionais e testes exigidos, **sem criar o código SQL definitivo**:

| Tabela | Operação | Deverá Existir Policy? | Cláusula Conceitual | Dependências | Observações Arquiteturais | Teste Futuro Obrigatório |
|---|---|---|---|---|---|---|
| **`usuario`** | **SELECT** | Sim | `USING (auth.uid() = id)` | Nenhuma | Usuário lê exclusivamente seu próprio perfil. | Leitura do próprio perfil (sucesso) vs. perfil alheio (0 linhas). |
| | **INSERT** | Sim | `WITH CHECK (auth.uid() = id)` | Nenhuma | Permite criação do próprio perfil no fallback defensivo. | Inserção com `id = auth.uid()` (sucesso) vs. outro ID (rejeição). |
| | **UPDATE** | Sim | `USING (auth.uid() = id) WITH CHECK (auth.uid() = id)` | Nenhuma | Edição de nome/telefone e desativação lógica (`ativo = false`). | Atualização legítima vs. tentativa de transferir o perfil. |
| | **DELETE** | **NÃO** | **DEFAULT DENY ESTRITO** | Nenhuma | **Decisão D1:** Nenhuma policy de exclusão criada. Exclusão física proibida via API. | Tentativa de `DELETE` por usuário autenticado resulta em 0 linhas afetadas / erro. |
| **`cliente`** | **SELECT** | Sim | `USING (auth.uid() = usuario_id)` | `usuario` | Leitura restrita à carteira de clientes do profissional. | Consulta retorna apenas clientes pertencentes ao tenant ativo. |
| | **INSERT** | Sim | `WITH CHECK (auth.uid() = usuario_id)` | `usuario` | Garante titularidade direta na criação. | Tentativa de criar cliente apontando para outro `usuario_id` é abortada. |
| | **UPDATE** | Sim | `USING (auth.uid() = usuario_id) WITH CHECK (auth.uid() = usuario_id)` | `usuario` | Impede usurpação ou repasse de cliente entre profissionais. | Tentativa de alterar o `usuario_id` de um cliente existente é bloqueada. |
| | **DELETE** | Sim | `USING (auth.uid() = usuario_id)` | `usuario`, `orcamento` (`FK`) | Deleção física permitida **se e somente se** não houver orçamentos vinculados (`RESTRICT`). | Exclusão de cliente sem histórico (sucesso) vs. com orçamentos vinculados (bloqueado por FK). |
| **`servico`** | **SELECT** | Sim | `USING (auth.uid() = usuario_id)` | `usuario` | Acesso restrito ao catálogo próprio do profissional. | Tenant B não visualiza serviços cadastrados por Tenant A. |
| | **INSERT** | Sim | `WITH CHECK (auth.uid() = usuario_id)` | `usuario` | Inclusão de serviço vinculado ao usuário ativo. | Criação com `usuario_id = auth.uid()` (sucesso). |
| | **UPDATE** | Sim | `USING (auth.uid() = usuario_id) WITH CHECK (auth.uid() = usuario_id)` | `usuario` | Edição de preços e descrições do próprio catálogo. | Tentativa de alterar preço em catálogo alheio é bloqueada. |
| | **DELETE** | Sim | `USING (auth.uid() = usuario_id)` | `usuario`, `item_orcamento` (`FK`) | Deleção permitida apenas se não houver itens de orçamento associados (`RESTRICT`). | Exclusão de serviço referenciado em orçamentos bloqueada por `ON DELETE RESTRICT`. |
| **`produto`** | **SELECT** | Sim | `USING (auth.uid() = usuario_id)` | `usuario` | Acesso restrito aos insumos próprios do profissional. | Isolamento completo de preços de custo e venda. |
| | **INSERT** | Sim | `WITH CHECK (auth.uid() = usuario_id)` | `usuario` | Inclusão vinculada ao usuário ativo. | Inserção legítima aprovada. |
| | **UPDATE** | Sim | `USING (auth.uid() = usuario_id) WITH CHECK (auth.uid() = usuario_id)` | `usuario` | Edição restrita ao catálogo próprio. | Tentativa de mutação indevida rejeitada. |
| | **DELETE** | Sim | `USING (auth.uid() = usuario_id)` | `usuario`, `item_orcamento` (`FK`) | Deleção física bloqueada se referenciado em orçamentos (`RESTRICT`). | Proteção relacional contra perda de histórico de itens. |
| **`orcamento`** | **SELECT** | Sim | `USING (auth.uid() = usuario_id)` | `usuario` | Visualização exclusiva dos orçamentos emitidos pelo usuário. | Tenant A não acessa propostas financeiras de Tenant B. |
| | **INSERT** | Sim | `WITH CHECK (auth.uid() = usuario_id AND EXISTS(cliente pertencente a auth.uid()))` | `usuario`, `cliente` | **Regra Anti-Cross-Tenant:** Veda associar orçamento a cliente de terceiro. | Tentativa de vincular cliente de Tenant B em orçamento de Tenant A é bloqueada. |
| | **UPDATE** | Sim | `USING (auth.uid() = usuario_id) WITH CHECK (auth.uid() = usuario_id AND EXISTS(cliente de auth.uid()))` | `usuario`, `cliente` | Permite alteração de dados preservando titularidade e cliente próprio. | Edição legítima aprovada; troca de dono rejeitada. |
| | **DELETE** | Sim | `USING (auth.uid() = usuario_id AND status = 'RASCUNHO')` | `usuario` | **Decisão D2:** Exclusão autorizada **unicamente** para propostas em rascunho. | Exclusão em `RASCUNHO` (sucesso) vs. em `ENVIADO`/`APROVADO` (bloqueio total). |
| **`endereco`** | **SELECT** | Sim | `USING (EXISTS(cliente vinculado pertencente a auth.uid()))` | `cliente` | Titularidade por cadeia relacional simples via `cliente_id`. | Consulta a endereços isolada por cliente próprio. |
| | **INSERT** | Sim | `WITH CHECK (EXISTS(cliente vinculado pertencente a auth.uid()))` | `cliente` | Impede cadastrar endereço em cliente alheio. | Inserção apontando para cliente de terceiro rejeitada. |
| | **UPDATE** | Sim | `USING (EXISTS(cliente próprio)) WITH CHECK (EXISTS(cliente próprio))` | `cliente` | Edição restrita aos endereços da própria base. | Bloqueio de mutação cross-tenant. |
| | **DELETE** | Sim | `USING (EXISTS(cliente próprio))` | `cliente` | Exclusão vinculada ao cliente do usuário. | Deleção autorizada apenas em clientes próprios. |
| **`item_orcamento`** | **SELECT** | Sim | `USING (EXISTS(orçamento pai pertencente a auth.uid()))` | `orcamento` | Titularidade por cadeia relacional simples via `orcamento_id`. | Isolamento dos itens do orçamento por tenant. |
| | **INSERT** | Sim | `WITH CHECK (EXISTS(orçamento próprio) AND servico/produto próprios)` | `orcamento`, `servico`, `produto` | **Regra Anti-Cross-Tenant Dupla:** Orçamento e catálogo devem ser do mesmo tenant. | Tentativa de inserir serviço de Tenant B em orçamento de Tenant A é bloqueada. |
| | **UPDATE** | Sim | `USING (EXISTS(orçamento próprio)) WITH CHECK (EXISTS(orçamento próprio) AND servico/produto próprios)` | `orcamento`, `servico`, `produto` | Atualização segura de quantidades e valores do item. | Validação relacional completa em mutações. |
| | **DELETE** | Sim | `USING (EXISTS(orçamento pai com status = 'RASCUNHO' e usuario_id = auth.uid()))` | `orcamento` | **Decisão D2:** Exclusão autorizada apenas se o orçamento pai estiver em `RASCUNHO`. | Deleção de item em rascunho (sucesso) vs. orçamento enviado (bloqueio). |
| **`area`** | **SELECT** | Sim | `USING (EXISTS(item -> orçamento pertencente a auth.uid()))` | `item_orcamento`, `orcamento` | Titularidade por cadeia relacional dupla (área $\rightarrow$ item $\rightarrow$ orçamento). | Isolamento dos polígonos e vértices de satélite. |
| | **INSERT** | Sim | `WITH CHECK (EXISTS(item -> orçamento pertencente a auth.uid()))` | `item_orcamento`, `orcamento` | Vínculo restrito a itens de orçamentos próprios. | Tentativa de vincular área a item de terceiros é rejeitada. |
| | **UPDATE** | Sim | `USING (EXISTS(item -> orcamento próprio)) WITH CHECK (EXISTS(item -> orcamento próprio))` | `item_orcamento`, `orcamento` | Edição de geometria de polígono e medição de área. | Atualização restrita a projetos próprios. |
| | **DELETE** | Sim | `USING (EXISTS(item -> orçamento em 'RASCUNHO' e pertencente a auth.uid()))` | `item_orcamento`, `orcamento` | **Decisão D2:** Exclusão autorizada apenas se o orçamento raiz estiver em `RASCUNHO`. | Deleção de área em proposta enviada/aprovada é terminantemente bloqueada. |

---

## 6. Cadeias de Autorização e Modelo Relacional

O isolamento multi-tenant das entidades sem coluna direta `usuario_id` é efetuado por **navegação relacional por cadeia**, preservando a integridade e normalização do Modelo Físico v1.1.

```text
CADEIA 1: CLIENTE E ENDEREÇO
[ public.endereco ] ──(cliente_id)──► [ public.cliente ] ──(usuario_id)──► [ auth.uid() ]

CADEIA 2: ITENS DE ORÇAMENTO
[ public.item_orcamento ] ──(orcamento_id)──► [ public.orcamento ] ──(usuario_id)──► [ auth.uid() ]
       │                                             ▲
       ├──(servico_id)──► [ public.servico ] ────────┤ (anti-cross-tenant)
       └──(produto_id)──► [ public.produto ] ────────┘ (anti-cross-tenant)

CADEIA 3: ÁREAS DE SERVIÇO (CADEIA DUPLA)
[ public.area ] ──(item_orcamento_id)──► [ public.item_orcamento ] ──(orcamento_id)──► [ public.orcamento ] ──(usuario_id)──► [ auth.uid() ]
```

### Regras Arquiteturais Mandatórias para as Cadeias
1. **Nenhum Campo Redundante:** É terminantemente vedado adicionar colunas redundantes `usuario_id` nas tabelas `item_orcamento`, `area` ou `endereco`. O Modelo Físico v1.1 permanece estritamente normalizado;
2. **Aproveitamento de Índices Estruturais:** A navegação pelas cadeias utiliza os índices B-Tree já existentes (`idx_endereco_cliente_id`, `idx_item_orcamento_orcamento_id`, `idx_area_item_orcamento_id`, `idx_orcamento_usuario_id`), viabilizando a transformação eficiente em semi-joins pelo otimizador;
3. **Consistência em Mutações:** O RLS verifica a cadeia relacional tanto no predicado `USING` (para assegurar que a linha prévia pertencia ao tenant) quanto no predicado `WITH CHECK` (para garantir que a linha resultante continue pertencendo ao tenant e não aponte para pais adulterados).

---

## 7. Políticas de DELETE e Preservação Histórica

A política de exclusão física e preservação histórica concretiza integralmente as decisões homologadas D1 e D2:

### 7.1. Decisão D1 — Usuário e Perfil da Aplicação
- **Ausência de Policy de DELETE para `authenticated`:** A negação padrão (*Default Deny*) impede que o cliente móvel exclua o registro de perfil da tabela `public.usuario`;
- **Desativação Lógica:** A inativação de conta é efetuada através de `UPDATE public.usuario SET ativo = false WHERE id = auth.uid()`;
- **Encerramento de Identidade:** O cancelamento formal da conta de acesso e revogação definitiva de credenciais permanece fora da API de dados, devendo ser orquestrado via Supabase Auth Admin em fluxo apropriado de suporte/segurança.

### 7.2. Decisão D2 — Orçamentos, Itens e Áreas
- **Regra do Rascunho:** A exclusão física de propostas comerciais só é permitida enquanto a entidade estiver no estado `RASCUNHO`:
  - `orcamento`: DELETE condicionado a `status = 'RASCUNHO'`;
  - `item_orcamento`: DELETE condicionado ao orçamento pai estar em `status = 'RASCUNHO'`;
  - `area`: DELETE condicionado ao orçamento raiz estar em `status = 'RASCUNHO'`;
- **Imutabilidade de Propostas Emitidas:** Orçamentos nos estados `ENVIADO`, `EM_ANALISE`, `APROVADO`, `RECUSADO`, `CANCELADO` e `CONCLUIDO` são históricos auditáveis, e qualquer solicitação de DELETE via API será sumariamente bloqueada pelo RLS.

### 7.3. Distinção entre RLS, `ON DELETE RESTRICT` e `ON DELETE CASCADE`
A integridade da base baseia-se na atuação complementar entre os mecanismos:
1. **RLS (Autorização por Linha):** Governa a legitimidade da operação pelo perfil conectado e pelo estado do ciclo de vida da proposta (`RASCUNHO`);
2. **`ON DELETE RESTRICT` (Proteção de Catálogos e Carteira):** As chaves estrangeiras entre `cliente`, `servico` e `produto` e seus respectivos orçamentos possuem restrição formal. Mesmo que o RLS autorize a exclusão de um cliente, se ele possuir orçamentos históricos, o SGBD abortará a exclusão física com violação de integridade referencial, forçando o uso de desativação lógica (`ativo = false`);
3. **`ON DELETE CASCADE` (Deleção em Cascata de Rascunhos):** Entre `orcamento` $\rightarrow$ `item_orcamento` $\rightarrow$ `area`, as FKs utilizam cascata física. Quando um orçamento em `RASCUNHO` tem sua exclusão autorizada pelo RLS, a deleção física remove atômica e integralmente seus itens e geometrias espaciais dependentes.

---

## 8. Estratégia e Matriz de Testes de Implementação

A validação da futura implementação de Auth + RLS exigirá uma suíte exaustiva de testes de integração automatizados, executados em transações isoladas contra a instância local do PostgreSQL:

### 8.1. Arquitetura dos Testes de Integração SQL
Os testes serão estruturados em arquivos SQL de validação, utilizando o padrão:
```sql
-- PADRÃO CONCEITUAL DE TESTE DE INTEGRAÇÃO
BEGIN;
-- 1. Setup de identidades e tenants de teste
-- 2. Chaveamento para role authenticated com JWT simulado
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub": "<UUID_TENANT_A>", "role": "authenticated"}';

-- 3. Execução das operações do caso de teste
-- 4. Asserções via contagem de linhas e verificação de erros esperados

-- 5. Rollback obrigatório para manter o banco limpo
ROLLBACK;
```

### 8.2. Grupos de Testes Obrigatórios
A suíte deve cobrir os seguintes doze grupos funcionais:

```text
+---------------------------------------------------------------------------------------------------+
|                                GRUPOS DE TESTES DE INTEGRAÇÃO RLS                                 |
+---------------------------------------------------------------------------------------------------+
| [A] Bootstrap Auth: Criação atômica em auth.users disparando inserção em public.usuario           |
| [B] Isolamento Multi-Tenant: Tenant A operando com Tenant B presente no mesmo banco              |
| [C] Testes Positivos: SELECT, INSERT, UPDATE em entidades próprias de Tenant A                   |
| [D] Testes Negativos: Tentativas de leitura de dados de Tenant B (esperado: 0 linhas)            |
| [E] Testes de DELETE: Restrição estrita a RASCUNHO e Default Deny em usuario                      |
| [F] Testes de UPDATE: Bloqueio de adulteração de usuario_id (impossibilidade de repasse)          |
| [G] Testes de INSERT: Bloqueio anti-cross-tenant (vínculo a clientes ou catálogos alheios)        |
| [H] Testes de SELECT: Listagem e consultas agregadas sem vazamento de cardinalidade              |
| [I] Testes de Sessão: Comportamento sob ausência de claims (esperado: bloqueio total)             |
| [J] Testes de Trigger: Disparo de on_auth_user_created e tratamento de ausência de metadados      |
| [K] Testes de Fallback: Resolução de perfil via usuario_insert_policy quando disparado            |
| [L] Testes de Integridade Referencial: ON DELETE RESTRICT barrando cliente com orçamento          |
+---------------------------------------------------------------------------------------------------+
```

### 8.3. Matriz de Cenários Tenant A vs. Tenant B

| Grupo | ID | Cenário de Teste | Papel / Contexto | Ação Executada | Resultado Esperado |
|---|---|---|---|---|---|
| **A** | T-BOOT-01 | Inserção de usuário com metadados | `postgres` | `INSERT INTO auth.users` com `nome` no JSONB | Linha criada em `public.usuario` com mesmo ID. |
| **A** | T-BOOT-02 | Inserção de usuário sem `nome` | `postgres` | `INSERT INTO auth.users` com `nome` nulo | Transação abortada com exceção descritiva. |
| **B** | T-ISO-01 | Contagem de clientes | Tenant A | `SELECT count(*) FROM cliente;` | Retorna exatamente o total de Tenant A; dados de B ignorados. |
| **C** | T-POS-01 | Criação de cliente próprio | Tenant A | `INSERT INTO cliente (usuario_id, nome)` | Sucesso (1 linha inserida). |
| **D** | T-NEG-01 | Leitura direta de cliente alheio | Tenant A | `SELECT * FROM cliente WHERE usuario_id = <TENANT_B>;` | 0 linhas retornadas (sem vazamento). |
| **E** | T-DEL-01 | Exclusão de perfil de usuário | Tenant A | `DELETE FROM usuario WHERE id = <TENANT_A>;` | 0 linhas afetadas (Default Deny impede a exclusão). |
| **E** | T-DEL-02 | Exclusão de orçamento RASCUNHO | Tenant A | `DELETE FROM orcamento WHERE id = <ORC_RASCUNHO_A>;` | Sucesso (1 linha afetada; itens e áreas excluídos via cascade). |
| **E** | T-DEL-03 | Exclusão de orçamento ENVIADO | Tenant A | `DELETE FROM orcamento WHERE id = <ORC_ENVIADO_A>;` | 0 linhas afetadas (RLS bloqueia deleção fora de rascunho). |
| **F** | T-UPD-01 | Transferência ilícita de orçamento | Tenant A | `UPDATE orcamento SET usuario_id = <TENANT_B>;` | Abortado por violação da cláusula `WITH CHECK`. |
| **G** | T-CROSS-01 | Orçamento com cliente de terceiro | Tenant A | `INSERT INTO orcamento (cliente_id = <CLIENTE_B>)` | Abortado por violação de `WITH CHECK` (anti-cross-tenant). |
| **G** | T-CROSS-02 | Item com serviço de terceiro | Tenant A | `INSERT INTO item_orcamento (servico_id = <SRV_B>)` | Abortado por violação de `WITH CHECK`. |
| **L** | T-INT-01 | Exclusão de cliente com orçamento | Tenant A | `DELETE FROM cliente WHERE id = <CLIENTE_COM_ORC>;` | Abortado por violação de `FK RESTRICT`. |

---

## 9. Plano de Validação de Performance (C1 a C6)

A aferição de desempenho das consultas sob RLS seguirá estritamente o protocolo formal homologado em `docs/relatorios/auth-rls-performance-v1.0.md` e consolidado na v1.6:

```text
+---------------------------------------------------------------------------------------------------+
|                         PROTOCOLO DE VALIDAÇÃO DE PERFORMANCE C1 A C6                             |
+---------------------------------------------------------------------------------------------------+
| C1: SELECT * FROM cliente WHERE id = $1;                                                          |
| C2: SELECT * FROM servico WHERE ativo = true;                                                     |
| C3: SELECT * FROM item_orcamento WHERE orcamento_id = $1;                                         |
| C4: SELECT * FROM area WHERE item_orcamento_id = $1;                                              |
| C5: DELETE FROM orcamento WHERE id = $1;                                                          |
| C6: Consulta Agregada Hierárquica da Pilha Integrada (PostgREST + JSON Agg + PostgreSQL + RLS)   |
+---------------------------------------------------------------------------------------------------+
| Instrumentação: EXPLAIN (ANALYZE, BUFFERS) em ambiente Docker com massa multi-tenant.            |
+---------------------------------------------------------------------------------------------------+
```

### Premissas e Limites da Validação
1. **Nenhum Teste Agora:** A validação será executada somente após a criação e aplicação da migration de Auth/RLS;
2. **Nenhuma Criação de Seed Agora:** A massa de dados multi-tenant representativa será gerada na etapa de testes de homologação;
3. **Nenhum Novo Threshold:** O valor de 100 ms (H3) permanece enquadrado estritamente como critério experimental provisório de bancada de engenharia, sem criar requisitos de negócio inexistentes na documentação oficial.

---

## 10. Segregação entre Ambiente Local e Produção

A estratégia de configuração do Supabase Auth mantém fronteira nítida entre o desenvolvimento local e a nuvem:

```text
+------------------------------------+------------------------------------+
| AMBIENTE LOCAL (DESENVOLVIMENTO)   | AMBIENTE DE PRODUÇÃO (NUVEM)       |
+------------------------------------+------------------------------------+
| - Supabase CLI + Docker            | - Supabase Cloud / Instância Prod  |
| - config.toml gerenciado           | - Painel e secrets de produção     |
| - enable_confirmations = false     | - enable_confirmations = true      |
| - Retorno de signUp() com sessão   | - Retorno de signUp() sem sessão   |
| - Mailpit local                    | - Provedor SMTP transacional real  |
+------------------------------------+------------------------------------+
```

- **Ambiente Local:** O parâmetro `enable_confirmations = false` é uma **conveniência técnica de desenvolvimento** para agilizar testes e automações;
- **Ambiente de Produção:** A ativação de confirmação de e-mail é uma **decisão operacional pendente**, vinculada à contratação e homologação de serviço SMTP (ex.: Resend, SendGrid, Amazon SES);
- **Tratamento Defensivo na Camada de Presentation:** A aplicação React Native tratará de forma resiliente os retornos de `signUp()`:
  - Se `session` estiver presente: direciona para `/home`;
  - Se `session` for nula: orienta o usuário a confirmar a conta via link no e-mail cadastrado antes do primeiro login.

---

## 11. Segurança da Sessão no Cliente Móvel (Android)

A segurança e persistência de credenciais no aplicativo móvel é uma responsabilidade atribuída à camada de **Infrastructure**, sem acoplamento com a camada de Domain:

1. **Gestão de Sessão pelo SDK Oficial:** Toda a renovação de tokens JWT, controle do refresh token e expiração é governada nativamente pelo `@supabase/supabase-js`;
2. **Limitação de Armazenamento no Android:** O `expo-secure-store` impõe uma restrição física de 2.048 bytes por entrada no Android Keystore / SharedPreferences;
3. **Solução Homologada (Adaptador Híbrido Criptografado):**
   - A camada de Infrastructure móvel implementará o adaptador de persistência recomendado pela documentação oficial do Supabase para React Native;
   - Uma chave simétrica (AES-256) gerada aleatoriamente é gravada com segurança no `expo-secure-store`;
   - O payload completo da sessão (que frequentemente excede 2 KB) é cifrado com essa chave e armazenado de forma segura no `@react-native-async-storage/async-storage`;
4. **Isolamento de Camada:** Nenhuma dependência do `expo-secure-store` ou do Supabase SDK vazará para as entidades ou regras de negócio do aplicativo.

---

## 12. Estratégia de Versionamento de Migrations

A introdução das políticas de segurança e rotinas de bootstrap respeitará a integridade do histórico de banco de dados do projeto:

1. **Migration v1.1 Congelada:** O arquivo `supabase/migrations/20260916020500_modelo_fisico_v1_1.sql` permanece **rigorosamente congelado**, não devendo receber qualquer edição ou adição retroativa;
2. **Nova Migration Dedicada de Auth/RLS:** Todas as instruções DDL de segurança (criação do schema `private`, função `private.handle_new_user()`, trigger em `auth.users`, comandos `ENABLE ROW LEVEL SECURITY`, revogações de privilégio e as 31 policies) serão agrupadas em uma nova migration isolada, por exemplo:
   `supabase/migrations/20260921000000_auth_rls.sql`
3. **Execução Futura:** Esta nova migration só será gerada e executada após a aprovação e homologação formal deste plano de implementação.

---

## 13. Critérios Objetivos de Aceitação da Futura Implementação

A futura implementação de Supabase Auth + RLS só será considerada concluída quando todos os seguintes critérios objetivos forem formalmente satisfeitos e evidenciados:

- [ ] **CA-01 (Bootstrap Atômico):** A execução de `signUp()` com metadado `nome` cria atômica e simultaneamente o usuário em `auth.users` e o registro em `public.usuario` com identificadores idênticos;
- [ ] **CA-02 (Defesa de Cadastro):** A tentativa de cadastro com metadado `nome` ausente ou em branco é abortada pelo SGBD com transação revertida;
- [ ] **CA-03 (Menor Privilégio):** A função `private.handle_new_user()` reside no schema `private`, possui `SECURITY DEFINER`, `search_path = ''` e privilégios `EXECUTE` revogados de `PUBLIC`, `anon` e `authenticated`;
- [ ] **CA-04 (Ausência de FORCE RLS):** Todas as 8 tabelas possuem `ENABLE ROW LEVEL SECURITY` ativo e `FORCE ROW LEVEL SECURITY` desativado, assegurando o bypass do FUNCTION OWNER `postgres`;
- [ ] **CA-05 (Default Deny de Exclusão de Perfil):** A tabela `public.usuario` não possui policy de DELETE, impedindo sumariamente a exclusão física do perfil via API;
- [ ] **CA-06 (Desativação Lógica de Perfil):** A inativação do usuário é realizada com sucesso mediante `UPDATE public.usuario SET ativo = false WHERE id = auth.uid()`;
- [ ] **CA-07 (Isolamento Multi-Tenant Estrito):** O papel `authenticated` associado a Tenant A é incapaz de ler, alterar ou excluir registros pertencentes a Tenant B em qualquer uma das 8 tabelas;
- [ ] **CA-08 (DELETE Condicionado a RASCUNHO):** A exclusão de `orcamento`, `item_orcamento` e `area` tem êxito exclusivo quando a proposta estiver em `status = 'RASCUNHO'`; qualquer exclusão em estados posteriores é bloqueada pelo RLS;
- [ ] **CA-09 (Bloqueio Anti-Cross-Tenant):** O RLS impede a criação de orçamentos vinculados a clientes de terceiros, bem como a inserção de itens com serviços ou produtos de outros tenants;
- [ ] **CA-10 (Proteção por Chave Estrangeira):** A tentativa de excluir fisicamente um cliente, serviço ou produto vinculado a orçamentos históricos é abortada por `ON DELETE RESTRICT`;
- [ ] **CA-11 (100% de Testes Automatizados Aprovados):** Toda a suíte de testes de integração SQL (grupos A a L) é executada com sucesso com 0 falhas;
- [ ] **CA-12 (Plano de Performance C1–C6 Documentado):** As consultas C1 a C6 são executadas com `EXPLAIN (ANALYZE, BUFFERS)` e os planos de execução são registrados sem regressões estruturais;
- [ ] **CA-13 (Suíte Geral Intacta):** `npm run test:typecheck` e `npm test` continuam operando com 0 erros e 49/49 testes de domínio passando.

---

## 14. Análise de Riscos Técnicos e Mitigações

| Risco Técnico Identificado | Impacto | Severidade | Mitigação Arquitetural e Procedimental Homologada |
|---|---|---|---|
| **Vazamento Cross-Tenant por Policy Incorreta** | Um usuário acessa orçamentos ou dados confidenciais de outro profissional. | **Crítica** | Testes de integração automatizados simulando pares de tenants (Tenant A vs Tenant B) com `SET LOCAL "request.jwt.claims"`. |
| **Recursão Infinita de RLS** | Travamento de consultas por subqueries RLS referenciando mutuamente tabelas com policies circulares. | **Alta** | Topologia unidirecional estrita: as policies em cadeia navegam exclusivamente de filho para pai (`area` $\rightarrow$ `item` $\rightarrow$ `orcamento` $\rightarrow$ `usuario`). |
| **Vulnerabilidade em Função `SECURITY DEFINER`** | Exploração de *search path hijacking* ou execução indevida da rotina com poderes de superusuário. | **Crítica** | Fixação estática obrigatória de `SET search_path = ''`, qualificação explícita dos esquemas (`public.usuario`), schema privado e revogação de `EXECUTE`. |
| **Falha de Transação no Signup do Supabase Auth** | Falhas na trigger de criação de perfil impedem o cadastro do usuário na plataforma. | **Alta** | Validação prévia de metadados na aplicação, validação estrita no corpo da trigger e mecanismo defensivo de fallback na camada de Application. |
| **Exclusão Indevida de Histórico Comercial** | Exclusão acidental de orçamentos aprovados ou faturados, quebrando auditoria e faturamento. | **Alta** | Decisão D2: cláusula `status = 'RASCUNHO'` embutida nas policies de DELETE de `orcamento`, `item_orcamento` e `area`. |
| **Tentativa de Transferência Ilícita de Posse** | Tenant A altera o `usuario_id` de um registro para assumir a titularidade de dados alheios. | **Alta** | Cláusulas `WITH CHECK` exigindo `auth.uid() = usuario_id` em todas as políticas de UPDATE. |
| **Divergência entre Local e Nuvem por E-mail** | A aplicação quebra em produção por assumir que o `signUp()` sempre retorna sessão ativa. | **Média** | Camada de Presentation orientada a tratar de forma defensiva tanto o retorno com sessão quanto o retorno com sessão nula. |
| **Falha de Persistência no Android por Limite de 2KB** | Sessão é perdida após fechamento do app no Android por estouro do `expo-secure-store`. | **Média** | Adoção do adaptador híbrido de persistência criptografada oficial na camada de Infrastructure móvel. |

---

## 15. Decisões Consolidadas vs. Decisões Ainda Pendentes

Para assegurar total transparência de governança técnica, as decisões são expressamente demarcadas entre o que já está homologado e o que permanece pendente:

### 15.1. Decisões Formalmente HOMOLOGADAS
- [x] **D-HOM-01:** Utilização exclusiva de `Email + Senha` gerenciado pelo Supabase Auth;
- [x] **D-HOM-02:** Hashing de senhas responsabilidade do GoTrue via `bcrypt`, sem configuração de algoritmo ou work factor pelo aplicativo;
- [x] **D-HOM-03:** `minimum_password_length = 6` classificado como default de plataforma da ferramenta local, não requisito de negócio;
- [x] **D-HOM-04:** Criação atômica de perfil via trigger nativa `AFTER INSERT ON auth.users` chamando `private.handle_new_user()`;
- [x] **D-HOM-05:** Função de bootstrap no schema `private`, `SECURITY DEFINER`, proprietário `postgres`, `search_path = ''` e menor privilégio de `EXECUTE`;
- [x] **D-HOM-06:** Correspondência biunívoca entre `auth.users.id` e `public.usuario.id`;
- [x] **D-HOM-07:** Adoção exclusiva de `ENABLE ROW LEVEL SECURITY` nas 8 tabelas de domínio e rejeição formal de `FORCE ROW LEVEL SECURITY`;
- [x] **D-HOM-08:** Default Deny total para exclusão física de `usuario` (ausência de policy de DELETE); inativação por desativação lógica;
- [x] **D-HOM-09:** DELETE de `orcamento`, `item_orcamento` e `area` condicionado ao estado `RASCUNHO`;
- [x] **D-HOM-10:** Navegação relacional em cadeia sem colunas desnormalizadas;
- [x] **D-HOM-11:** Regras anti-cross-tenant em orçamentos e itens de orçamento;
- [x] **D-HOM-12:** H1 e H2 tratadas como hipóteses empíricas; H3 (100 ms) reenquadrado como meta de bancada;
- [x] **D-HOM-13:** Validação de performance futura via C1–C6 com `EXPLAIN (ANALYZE, BUFFERS)`;
- [x] **D-HOM-14:** Persistência móvel segura no Android via adaptador híbrido (`expo-secure-store` + `AsyncStorage`);
- [x] **D-HOM-15:** Migration `20260916020500_modelo_fisico_v1_1.sql` mantida congelada; criação de nova migration dedicada de Auth/RLS.

### 15.2. Decisões Operacionais PENDENTES (Já Documentadas)
- [ ] **D-PEND-01 (Provedor SMTP de Produção):** Seleção, contratação e homologação do serviço de entrega de e-mails transacionais para a nuvem (ex.: Resend, SendGrid, Amazon SES);
- [ ] **D-PEND-02 (Política Operacional de Confirmação de E-mail em Produção):** Formalização da ativação de `enable_confirmations = true` e elaboração dos templates HTML/texto das mensagens transacionais de confirmação e recuperação de senha.

---

## 16. Rastreabilidade Documental

A tabela a seguir correlaciona cada seção deste plano com suas fontes canônicas oficiais:

| Seção do Plano de Implementação | Fontes Canônicas Homologadas de Referência |
|---|---|
| **1. Princípios e Invariantes** | `auth-rls-strategy-v1.6.md` (Seção 1, 3); RN v3; RF v2; RNF v2; Modelo Físico v1.1 |
| **2. Inventário de Objetos** | `auth-rls-strategy-v1.6.md` (Seção 7, 8, 10, 11); Modelo Físico v1.1 |
| **3. Ordem de Implementação** | `auth-rls-strategy-v1.6.md` (Seção 24, 25); `auth-rls-strategy-v1.6-audit-v1.0.md` |
| **4. Bootstrap Auth → Usuario** | `auth-rls-security-definer-v1.2.md` (HOMOLOGADA); `auth-rls-strategy-v1.6.md` (Seção 8) |
| **5. Matriz de Policies RLS** | `auth-rls-strategy-v1.6.md` (Seção 12, 13, 14); `auth-rls-delete-policy-v1.2.md` (HOMOLOGADA) |
| **6. Cadeias de Autorização** | `auth-rls-strategy-v1.6.md` (Seção 9, 14); Modelo Físico v1.1; DER v1.1 |
| **7. Políticas de DELETE** | `auth-rls-delete-policy-v1.2.md` (HOMOLOGADA); `auth-rls-strategy-v1.6.md` (Seção 12, 16, 19) |
| **8. Testes de Integração** | `auth-rls-strategy-v1.4.md` / `v1.6.md` (Seção 21); `auth-rls-delete-policy-v1.2.md` |
| **9. Validação de Performance** | `auth-rls-performance-v1.0.md` (HOMOLOGADA); `auth-rls-strategy-v1.6.md` (Seção 22) |
| **10. Ambientes Local vs. Produção** | `auth-rls-auth-config-v1.0.md` (HOMOLOGADA); `auth-rls-strategy-v1.6.md` (Seção 17) |
| **11. Segurança Mobile no Android** | `auth-rls-auth-config-v1.0.md` (HOMOLOGADA); `auth-rls-strategy-v1.6.md` (Seção 18.2) |
| **12. Versionamento de Migrations** | `auth-rls-strategy-v1.5.md` / `v1.6.md` (Seção 24, Decisão 14); Modelo Físico v1.1 |
| **13. Critérios de Aceitação** | `auth-rls-strategy-v1.6.md` (Seções 1, 24, 25); `auth-rls-strategy-v1.6-audit-v1.0.md` |
| **14. Análise de Riscos** | `auth-rls-strategy-v1.6.md` (Seção 23); `auth-rls-security-definer-v1.2.md` |
| **15. Decisões Pendentes** | `auth-rls-auth-config-v1.0.md` (HOMOLOGADA); `auth-rls-strategy-v1.6.md` (Seção 17, 24) |

---

## 17. Preservação Absoluta de Artefatos

Certifica-se formalmente que, durante a elaboração deste plano de implementação:
1. `docs/relatorios/auth-rls-strategy-v1.6.md` permaneceu **intocada**;
2. `docs/relatorios/auth-rls-strategy-v1.6-audit-v1.0.md` permaneceu **intocada**;
3. Todas as versões prévias e relatórios temáticos homologados permaneceram **inalterados**;
4. Os documentos canônicos do projeto (RN v3, RF v2, RNF v2, UML v3.1, DER v1.1, Modelo Físico v1.1) permaneceram **inalterados**;
5. O arquivo de migration `supabase/migrations/20260916020500_modelo_fisico_v1_1.sql` permaneceu **congelado**;
6. **Nenhuma instrução SQL foi executada** no cluster PostgreSQL;
7. **Nenhuma alteração foi realizada no banco de dados**;
8. **Nenhum arquivo de código de produção da aplicação móvel foi modificado**.

---

## 18. Conclusão

O presente **Plano Executivo de Implementação de Supabase Auth + RLS v1.0** estabelece com precisão cirúrgica o roteiro de engenharia necessário para a materialização segura da estratégia homologada.

O documento é submetido e formalizado perante a governança do projeto com o status de **HOMOLOGADA**.

---

## 19. Registro Formal de Homologação Documental

Fica formalmente **HOMOLOGADO DOCUMENTALMENTE** o presente Plano Executivo de Implementação de Supabase Auth + RLS v1.0 (`docs/relatorios/auth-rls-implementation-plan-v1.0.md`).

A homologação baseia-se na auditoria técnica independente registrada em:
> [`docs/relatorios/auth-rls-implementation-plan-v1.0-final-audit.md`](file:///c:/Users/luanh/Documents/jardinagem-app/docs/relatorios/auth-rls-implementation-plan-v1.0-final-audit.md)

E registra formalmente que:
1. **Data da Homologação:** 2026-09-20;
2. **Resultado da Auditoria Final:** 11 tópicos CONFORME + 1 tópico CONFORME COM OBSERVAÇÃO;
3. **Ausência de Inconsistências:** 0 divergências, 0 ausências e 0 novas decisões;
4. **Matriz e Políticas Aprovadas:** 31 políticas de RLS (19 diretas e 12 em cadeia) cobrindo rigorosamente as 32 operações DML das 8 tabelas de domínio (com `usuario` DELETE em Default Deny);
5. **Critérios de Aceitação:** 13/13 critérios objetivos de aceitação (CA-01 a CA-13) plenamente validados e conformes;
6. **Validações Automatizadas:** 49/49 testes de domínio passando com 0 erros de compilação TypeScript;
7. **Caráter Estritamente Documental:** Esta homologação encerra formalmente a fase de planejamento técnico e arquitetural. **Não representa execução de implementação, não cria migrations, não executa SQL e não altera o banco de dados nem o código de produção**, cuja implementação física dependerá de autorização explícita em etapa posterior.
