# Estratégia de Supabase Auth + RLS v1.6

**Documento de Arquitetura e Engenharia de Software — CONSOLIDAÇÃO INTEGRAL HOMOLOGADA**  
**Status:** CONSOLIDADA / HOMOLOGADA DOCUMENTALMENTE  
**Data da Consolidação:** 2026-09-20  
**Versão Anterior (Preservada Intacta):** `docs/relatorios/auth-rls-strategy-v1.5.md`  
**Fontes Oficiais Homologadas Incorporadas:**  
1. `docs/relatorios/auth-rls-strategy-v1.3.md` (Ponto 1: Homologação de `NO FORCE RLS`);  
2. `docs/relatorios/auth-rls-security-definer-v1.2.md` (Ponto 2: Homologação de `SECURITY DEFINER` e Menor Privilégio);  
3. `docs/relatorios/auth-rls-strategy-v1.4.md` / `v1.5.md` (Ponto 3: GRANT/REVOKE, Schemas e Rastreabilidade da Decisão 12);  
4. `docs/relatorios/auth-rls-delete-policy-v1.2.md` (Ponto 4: Homologação de DELETE vs. Desativação Lógica — D1 e D2);  
5. `docs/relatorios/auth-rls-performance-v1.0.md` (Ponto 5: Homologação da Revisão de Performance do RLS e Plano C1–C6);  
6. `docs/relatorios/auth-rls-auth-config-v1.0.md` (Ponto 6: Homologação de Configurações de Auth, Hashing, Senhas e Sessão).  
**Autor:** Equipe de Arquitetura e Engenharia de Software  

---

## 1. Objetivo da Consolidação v1.6

Este documento apresenta a **versão consolidada e formalmente homologada (v1.6)** da estratégia técnica de autenticação (**Supabase Auth**) e autorização/isolamento multi-tenant (**PostgreSQL Row Level Security — RLS**) para o Sistema de Orçamentos para Jardinagem.

A versão 1.6 representa o **fechamento definitivo do ciclo de revisão técnica da estratégia de Auth + RLS**, consolidando em um único documento canônico todas as deliberações técnicas homologadas ao longo dos seis pontos de revisão:

1. **SECURITY DEFINER e Menor Privilégio:** Consolidação integral da função de bootstrap no schema privado (`private.handle_new_user()`), `SECURITY DEFINER`, proprietário `postgres`, `SET search_path = ''`, revogação de `EXECUTE` para `PUBLIC`, `anon`, `authenticated` e ausência de concessão para `supabase_auth_admin`, com trigger nativa em `auth.users` e mecanismo defensivo de fallback;
2. **Diretiva de RLS:** Adoção exclusiva de `ENABLE ROW LEVEL SECURITY` nas 8 tabelas de negócio e rejeição formal de `FORCE ROW LEVEL SECURITY`;
3. **DELETE vs. Desativação Lógica:** Ausência de policy de `DELETE` para `public.usuario` (Default Deny e desativação lógica por `ativo = false`), `DELETE` de `orcamento` condicionado ao estado `RASCUNHO`, `DELETE` de `item_orcamento` e `area` condicionado ao orçamento pai/raiz estar em `RASCUNHO`, e preservação histórica dos registros consolidados fora de rascunho;
4. **Performance das Policies RLS:** Readequação das asserções de desempenho perante o funcionamento real do Otimizador Baseado em Custos (*Cost-Based Optimizer* — CBO) do PostgreSQL, classificação dos índices existentes na migration v1.1 como garantias estruturais, desmistificação de *Sequential Scans*, manutenção de H1 e H2 como hipóteses empíricas, reenquadramento de H3 (100 ms) como critério experimental provisório de bancada e homologação do plano futuro de validação C1–C6 com `EXPLAIN (ANALYZE, BUFFERS)`;
5. **Configurações do Supabase Auth e Hashing:** Desassociação do algoritmo de hashing de senhas (`bcrypt`) e work factor como decisões do aplicativo móvel, expurgo da referência não fundamentada a `argon2`, desvinculação de `minimum_password_length = 6` como requisito de negócio (classificado como default da plataforma), segregação explícita entre ambiente local (`enable_confirmations = false`) e produção (decisão operacional pendente), e diretriz técnica para persistência de sessão no Android via adaptador híbrido seguro.

> [!IMPORTANT]
> **Status de Homologação Documental e Congelamento de Artefatos:**  
> O status **CONSOLIDADA / HOMOLOGADA DOCUMENTALMENTE** certifica que todas as decisões arquiteturais, modelos de políticas e especificações técnicas foram formalmente aprovadas pela governança do projeto.  
> **A homologação documental NÃO significa implementação imediata no banco de dados:**  
> - Nenhuma migration de Auth/RLS foi criada ou executada nesta etapa;  
> - A migration homologada `supabase/migrations/20260916020500_modelo_fisico_v1_1.sql` permanece **rigorosamente congelada e inalterada**;  
> - O banco de dados PostgreSQL permanece **completamente intocado**;  
> - Nenhuma política RLS, trigger ou função foi ainda criada na instância real;  
> - Nenhum código de produção da aplicação React Native/Expo foi alterado;  
> - Todos os blocos de SQL apresentados neste documento continuam expressamente rotulados como **"SQL PROPOSTO — NÃO EXECUTAR"**.

---

## 2. Rastreabilidade Técnica da Consolidação

A consolidação da versão 1.6 é fruto de uma cadeia formal, rastreável e auditável de relatórios técnicos homologados:

```text
+---------------------------------------------------------------------------------------------------+
|                                CADEIA DE RASTREABILIDADE TÉCNICA                                  |
+---------------------------------------------------------------------------------------------------+
| 1. Concepção Inicial (auth-rls-strategy-v1.0.md a v1.2.md)                                        |
|    - Análise exaustiva de papéis PostgreSQL e isolamento multi-tenant.                            |
+---------------------------------------------------------------------------------------------------+
| 2. Ponto 1: Diretiva FORCE RLS (auth-rls-strategy-v1.3.md — HOMOLOGADA)                           |
|    - Adotado: ENABLE ROW LEVEL SECURITY em todas as 8 tabelas de domínio;                         |
|    - Rejeitado: FORCE ROW LEVEL SECURITY (preserva bypass nativo do FUNCTION OWNER postgres).    |
+---------------------------------------------------------------------------------------------------+
| 3. Ponto 2: Função de Bootstrap e SECURITY DEFINER (auth-rls-security-definer-v1.2.md — HOMOLOGADA)|
|    - Função: private.handle_new_user() com SECURITY DEFINER e SET search_path = '';              |
|    - Menor privilégio de execução: REVOKE ALL FROM PUBLIC, anon, authenticated;                   |
|    - Ausência de GRANT EXECUTE para supabase_auth_admin;                                          |
|    - Trigger nativa AFTER INSERT ON auth.users e fallback defensivo no Application Service.       |
+---------------------------------------------------------------------------------------------------+
| 4. Ponto 3: Rastreabilidade da Decisão 12 e Schemas (auth-rls-strategy-v1.4.md e v1.5.md)         |
|    - Ajuste formal da Decisão 12 (Necessidade de Triggers + Detalhamento Complementar).           |
+---------------------------------------------------------------------------------------------------+
| 5. Ponto 4: DELETE vs. Desativação Lógica (auth-rls-delete-policy-v1.2.md — HOMOLOGADA)           |
|    - Decisão D1: Bloqueio total de DELETE em usuario via Default Deny; desativação lógica;         |
|    - Decisão D2: DELETE em orcamento, item_orcamento e area condicionado a status = 'RASCUNHO'.   |
+---------------------------------------------------------------------------------------------------+
| 6. Ponto 5: Revisão de Performance do RLS (auth-rls-performance-v1.0.md — HOMOLOGADA)             |
|    - Índices como garantias estruturais; uso dependente do CBO do PostgreSQL;                     |
|    - Expurgo de afirmações categóricas; aceitação técnica de Seq Scan em tabelas pequenas;        |
|    - Reenquadramento de H3 (meta interna de bancada); homologação do plano C1–C6 com EXPLAIN.    |
+---------------------------------------------------------------------------------------------------+
| 7. Ponto 6: Configurações de Auth, Hashing e Sessão (auth-rls-auth-config-v1.0.md — HOMOLOGADA)    |
|    - Hashing é responsabilidade delegada ao Supabase Auth (bcrypt); expurgo de argon2;            |
|    - minimum_password_length = 6 classificado como default da plataforma (não requisito);         |
|    - Segregação de ambiente local (enable_confirmations = false) e produção (decisão pendente);   |
|    - Diretriz de persistência mobile compatível com limite de 2KB do Android (adaptador híbrido).  |
+---------------------------------------------------------------------------------------------------+
| 8. CONSOLIDAÇÃO INTEGRAL (auth-rls-strategy-v1.6.md — ESTE DOCUMENTO)                             |
|    - Consolidação canônica definitiva de todas as decisões homologadas.                           |
+---------------------------------------------------------------------------------------------------+
```

---

## 3. Premissas Arquiteturais do Sistema

1. **Separação entre Identidade e Perfil de Negócio:**
   - O Supabase Auth (`auth.users`) é a fonte exclusiva da verdade para identidades, credenciais, hashing de senhas via `bcrypt`, emissão de tokens JWT e gestão de sessões;
   - A tabela `public.usuario` representa estritamente o perfil de negócio do profissional de jardinagem no aplicativo;
   - `public.usuario.id` é do tipo `UUID`, corresponde identicamente a `auth.uid()` e não possui gerador de UUID aleatório próprio;
   - `public.usuario` **não armazena senhas, tokens nem duplica a coluna de e-mail** como identidade paralela.
2. **Modelo Físico v1.1 Imutável:**
   - A migration `20260916020500_modelo_fisico_v1_1.sql` permanece congelada;
   - As tabelas `item_orcamento`, `area` e `endereco` **não possuem coluna `usuario_id` redundante**, baseando sua autorização na navegação relacional por cadeia.
3. **Cliente Móvel (Android) Público e Não Confiável:**
   - O aplicativo React Native / Expo é um cliente público;
   - Nenhuma regra de segurança ou isolamento pode depender exclusivamente da interface do usuário;
   - A chave privilegiada `service_role` **nunca** é distribuída no cliente Android. O aplicativo consome a API através da chave pública `anon_key` acompanhada do header `Authorization: Bearer <JWT>`.
4. **Isolamento Absoluto (Zero Leakage):**
   - Requisições não autenticadas (`auth.uid() IS NULL` ou role `anon`) sofrem bloqueio padrão imediato nas 8 tabelas de domínio via Default Deny;
   - Um usuário autenticado jamais acessa, altera ou referencia dados pertencentes a outro usuário.
5. **Defesa em Profundidade:**
   - O RLS atua na camada de autorização de linhas (*row-level authorization*);
   - As constraints relacionais do SGBD (especialmente chaves estrangeiras com `ON DELETE RESTRICT`) garantem a integridade física estrutural;
   - O Domínio TypeScript governa cálculos numéricos, geodésicos e transições da máquina de estados do ciclo de vida dos orçamentos.

---

## 4. Fontes Oficiais Vigentes

- **Regras de Negócio vigentes:** RN v3 (com destaque para RN01–RN05, RN12, RN18, RN23, RN28–RN31, RN58–RN71);
- **Requisitos vigentes:** Requisitos Funcionais RF v2 e Requisitos Não Funcionais RNF v2;
- **Diagramas UML:** Classes v3.1 (`docs/uml/classes.puml`) e DER v1.1 (`docs/uml/der.puml`);
- **Arquitetura Técnica:** Arquitetura Técnica v1.1 (`.agents/rules/architecture.md`);
- **Modelo Físico:** Modelo Físico v1.1 (`docs/modelo-fisico-v1.1.md`);
- **Migration Homologada Congelada:** `supabase/migrations/20260916020500_modelo_fisico_v1_1.sql`;
- **Relatórios Técnicos Homologados:**
  - `docs/relatorios/auth-rls-strategy-v1.3.md` (Homologação de `NO FORCE RLS`);
  - `docs/relatorios/auth-rls-security-definer-v1.2.md` (Homologação de `SECURITY DEFINER`);
  - `docs/relatorios/auth-rls-delete-policy-v1.2.md` (Homologação de DELETE vs. Desativação Lógica);
  - `docs/relatorios/auth-rls-performance-v1.0.md` (Homologação de Performance de RLS);
  - `docs/relatorios/auth-rls-auth-config-v1.0.md` (Homologação de Configurações de Supabase Auth).

---

## 5. Supabase Auth e Gestão de Credenciais

*(Origem da consolidação: `docs/relatorios/auth-rls-auth-config-v1.0.md`)*

### 5.1. Método de Autenticação Homologado para v1.0
O método de autenticação adotado é **Email e Senha (`Email + Password`)**:
- Simplicidade operacional para o profissional de jardinagem;
- Suporte nativo completo pela infraestrutura do Supabase Auth;
- Possibilidade de testes locais automatizados e reproduzíveis via Mailpit (`127.0.0.1:54324`).
- Métodos como OAuth externo, Magic Link, SMS OTP ou Passkeys permanecem fora do escopo da v1.0.

### 5.2. Hashing de Senhas e Delegação de Responsabilidade
- O algoritmo de hashing e a gestão do ciclo de vida das senhas **não são decisões arquiteturais do aplicativo móvel**;
- A implementação de hashing e verificação é de **responsabilidade exclusiva do Supabase Auth / GoTrue**, que utiliza internamente a biblioteca `golang.org/x/crypto/bcrypt` com custo padrão 10;
- O aplicativo móvel e o banco relacional não possuem qualquer controle sobre parâmetros de hashing;
- Nem `bcrypt` nem `argon2` constituem requisitos funcionais do projeto. A referência a `argon2` identificada na v1.0 fica formalmente classificada como não fundamentada e desconsiderada.

### 5.3. Comprimento Mínimo de Senha (`minimum_password_length`)
- O valor `minimum_password_length = 6` constante em `supabase/config.toml` **não constitui requisito de negócio** (inexistente em RN v3, RF v2 e RNF v2);
- O valor 6 é estritamente o **DEFAULT DA PLATAFORMA SUPABASE / GOTRUE** para desenvolvimento local;
- Qualquer alteração futura nos critérios de complexidade de senha constituirá decisão explícita e formal de engenharia, não decorrendo automaticamente desta homologação.

---

## 6. Contrato de Cadastro de Usuário

A criação da conta estabelece uma fronteira clara entre o que pertence ao **Supabase Auth** e o que pertence ao **Perfil de Negócio (`public.usuario`)**:

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
|  - encrypted_password: hash salted bcrypt       |  - telefone: VARCHAR(30) NULL   |
|  - email_confirmed_at: timestamp                |  - data_cadastro: TIMESTAMPTZ   |
|  - raw_user_meta_data: JSONB                    |  - ativo: BOOLEAN DEFAULT TRUE  |
+-------------------------------------------------+---------------------------------+
```

### 6.1. Especificação dos Campos
1. **Campos Obrigatórios na Chamada `signUp`:**
   - `email` (gerenciado por `auth.users`);
   - `password` (validado pelo GoTrue conforme default da ferramenta);
   - `options.data.nome` (mandatório para preencher `public.usuario.nome`).
2. **Campos Opcionais na Chamada `signUp`:**
   - `options.data.telefone` (pode ser `NULL` ou vazio, mapeado para `public.usuario.telefone`).
3. **Validação Transacional de `usuario.nome`:**
   - A constraint física `usuario.nome VARCHAR(150) NOT NULL` da migration v1.1 é respaldada pela validação prévia na trigger transacional. Se `nome` estiver ausente ou em branco, a trigger aborta o `signUp` no SGBD com exceção SQL.
4. **Tratamento de `telefone`:**
   - Campo opcional (`is_nullable = YES`), gravado como `NULL` se omitido.
5. **Alteração Posterior de Perfil:**
   - O usuário autenticado atualiza `nome` e `telefone` via `UPDATE public.usuario SET nome = ..., telefone = ... WHERE id = auth.uid()`.
   - `usuario.id` é imutável via policy de `UPDATE` (`WITH CHECK (auth.uid() = id)`).
6. **Não-duplicação de E-mail:**
   - `public.usuario` **não possui** coluna de email. Redefinições e alterações de e-mail ocorrem estritamente pelos endpoints de segurança do Supabase Auth.

---

## 7. Vínculo Relação Auth $\rightarrow$ USUARIO

O vínculo de identidade do sistema é estrito e biunívoco:

$$\text{auth.uid()} \equiv \text{public.usuario.id}$$

- `public.usuario` não é uma tabela autônoma de credenciais;
- Cada conta no Auth possui exatamente um registro de perfil em `public.usuario`;
- A chave primária `usuario.id` é a própria identidade autenticada;
- Não existem colunas de autenticação, senha ou estado de sessão em `public.usuario`.

---

## 8. Criação de USUARIO: Trigger Homologada e Fallback Defensivo

*(Origem da consolidação: `docs/relatorios/auth-rls-security-definer-v1.2.md`)*

### 8.1. Caminho Principal: Trigger Transacional no Schema `private` (Homologada)
A criação atômica do perfil é governada por trigger nativa configurada sob as seguintes diretrizes homologadas:

1. **Schema de Residência Privado:** A função reside no schema `private` (`private.handle_new_user()`), completamente fora dos schemas expostos pela Data API do Supabase (PostgREST expõe exclusivamente `schemas = ["public"]`). Isso assegura que a função não possua rotas REST ou RPC expostas à internet;
2. **Modificador `SECURITY DEFINER`:** A função executa com os privilégios do seu criador (**FUNCTION OWNER: role `postgres`**), efetuando o `INSERT INTO public.usuario` via bypass nativo de RLS assegurado pela regra `NO FORCE RLS`;
3. **Hardening com `SET search_path = ''`:** Declaração estática de search path vazio, neutralizando ataques de *search path hijacking* e exigindo qualificação explícita dos objetos (`public.usuario`);
4. **Menor Privilégio de Execução (`EXECUTE`):**
   - Privilégios de execução revogados de `PUBLIC`: `REVOKE ALL ON FUNCTION private.handle_new_user() FROM PUBLIC;`;
   - Privilégios de execução revogados de `anon` e `authenticated`;
   - **Sem concessão para `supabase_auth_admin`:** No PostgreSQL, o disparo de triggers nativas em tempo de execução (`INSERT INTO auth.users`) não avalia privilégios `EXECUTE` contra o papel DML. Apenas o FUNCTION OWNER (`postgres`) possui privilégio de execução;
5. **Arquitetura de Proteção:** A proteção da rotina baseia-se na conjunção técnica entre **schema privado (`private`)**, **controle rigoroso de privilégios `EXECUTE`** e **natureza interna de trigger procedure**, sem alegações de exclusão automática do `/rpc/`.

```sql
-- ============================================================================
-- SQL PROPOSTO — NÃO EXECUTAR (Homologado em auth-rls-security-definer-v1.2.md)
-- ============================================================================

-- 1. Criação do Schema Privado
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
O fallback não é um fluxo concorrente normal, mas um mecanismo defensivo para recuperação de anomalias (ex.: criação manual via Supabase Dashboard sem metadados):
1. Ao autenticar com sucesso (`signInWithPassword`), a camada de Application consulta:
   `SELECT id, nome, ativo FROM public.usuario WHERE id = auth.uid()`
2. Se o perfil existir, navega para a tela principal (`/home`);
3. Se o perfil não existir (0 linhas), redireciona para a tela defensiva `/concluir-perfil`, que executa um `INSERT INTO public.usuario (id, nome, telefone) VALUES (auth.uid(), nome, telefone)` permitido pela policy `usuario_insert_policy` (`WITH CHECK (auth.uid() = id)`).

---

## 9. Modelo de Propriedade e Navegação Relacional

A titularidade dos dados obedece estritamente ao Modelo Físico v1.1 e DER v1.1:

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

- **Propriedade Direta:** `cliente`, `servico`, `produto`, `orcamento` (`usuario_id = auth.uid()`).
- **Propriedade por Cadeia (Sem desnormalização de colunas):**
  - `endereco` $\rightarrow$ por `cliente_id` $\rightarrow$ `cliente.usuario_id = auth.uid()`;
  - `item_orcamento` $\rightarrow$ por `orcamento_id` $\rightarrow$ `orcamento.usuario_id = auth.uid()`;
  - `area` $\rightarrow$ por `item_orcamento_id` $\rightarrow$ `item_orcamento.orcamento_id` $\rightarrow$ `orcamento.usuario_id = auth.uid()`.

---

## 10. RLS e Diretiva de Ativação (`ENABLE` vs. `FORCE`)

*(Origem da consolidação: `docs/relatorios/auth-rls-strategy-v1.3.md`)*

1. Todas as 8 tabelas de domínio têm o RLS ativado via `ALTER TABLE <tabela> ENABLE ROW LEVEL SECURITY`;
2. A diretiva complementar `FORCE ROW LEVEL SECURITY` é **formalmente REJEITADA** (mantendo-se o padrão nativo `NO FORCE`);
3. **Justificativa Homologada:** Os papéis `authenticated` e `anon` já são 100% governados pelo RLS com `ENABLE RLS`, pois não são table owners. Manter `NO FORCE` assegura que a função `private.handle_new_user()` operando sob o FUNCTION OWNER (`postgres`) execute o provisionamento do perfil com bypass nativo;
4. A negação padrão (*Default Deny*) é mandatória em todas as tabelas.

---

## 11. Roles de Acesso: `anon` e `authenticated`

- **Role `anon` (Não Autenticado):** Acesso estritamente zero. Nenhuma policy concede privilégios para `anon`. Qualquer requisição sem JWT válido recebe 0 linhas em `SELECT` e erro em operações de escrita;
- **Role `authenticated`:** Todas as policies de domínio são declaradas estritamente com `TO authenticated`;
- **Comportamento de `auth.uid()`:** Se o token JWT for ausente ou inválido, `auth.uid()` é avaliado como `NULL`, resultando em bloqueio imediato por RLS.

---

## 12. Matriz Operacional de Policies Consolidada

*(Origem da consolidação: `docs/relatorios/auth-rls-delete-policy-v1.2.md`)*

A tabela a seguir consolida as operações nas 8 tabelas de domínio, incorporando integralmente as decisões homologadas **D1** (ausência de DELETE em `usuario`) e **D2** (DELETE condicionado a `RASCUNHO` em `orcamento`, `item_orcamento` e `area`):

| Tabela | Operação | Role Alvo | Condição de Propriedade | Cláusula `USING` | Cláusula `WITH CHECK` | Comportamento se Desautenticado (`anon` ou `auth.uid() IS NULL`) | Comportamento se de Outro Usuário | Origem / Decisão Homologada |
|---|---|---|---|---|---|---|---|---|
| **usuario** | `SELECT` | `authenticated` | Próprio perfil | `auth.uid() = id` | *N/A* | Retorna 0 linhas | Retorna 0 linhas | Decisão 5 |
| | `INSERT` | `authenticated` | Próprio perfil (fallback) | *N/A* | `auth.uid() = id` | Rejeição por RLS | Rejeição por RLS | Decisão 6 |
| | `UPDATE` | `authenticated` | Próprio perfil / Desativação | `auth.uid() = id` | `auth.uid() = id` | Rejeição por RLS | 0 linhas afetadas | Decisão 7 |
| | `DELETE` | — | **NENHUMA POLICY DE DELETE** | *Sem policy (Default Deny)* | *N/A* | Bloqueio total por RLS | Bloqueio total por RLS | **Decisão D1 (Homologada)** |
| **cliente** | `SELECT` | `authenticated` | Próprio catálogo | `auth.uid() = usuario_id` | *N/A* | Retorna 0 linhas | Retorna 0 linhas | Decisão 5 |
| | `INSERT` | `authenticated` | Próprio catálogo | *N/A* | `auth.uid() = usuario_id` | Rejeição por RLS | Rejeição por RLS | Decisão 6 |
| | `UPDATE` | `authenticated` | Próprio catálogo | `auth.uid() = usuario_id` | `auth.uid() = usuario_id` | Rejeição por RLS | 0 linhas afetadas | Decisão 7 |
| | `DELETE` | `authenticated` | Próprio catálogo | `auth.uid() = usuario_id` | *N/A* | Rejeição por RLS | 0 linhas afetadas | Decisão D2 (FK RESTRICT) |
| **endereco** | `SELECT` | `authenticated` | Cliente próprio | `EXISTS (SELECT 1 FROM cliente c WHERE c.id = cliente_id AND c.usuario_id = auth.uid())` | *N/A* | Retorna 0 linhas | Retorna 0 linhas | Decisão 9 |
| | `INSERT` | `authenticated` | Cliente próprio | *N/A* | `EXISTS (SELECT 1 FROM cliente c WHERE c.id = cliente_id AND c.usuario_id = auth.uid())` | Rejeição por RLS | Rejeição por RLS | Decisão 9 |
| | `UPDATE` | `authenticated` | Cliente próprio | `EXISTS (SELECT 1 FROM cliente c WHERE c.id = endereco.cliente_id AND c.usuario_id = auth.uid())` | `EXISTS (SELECT 1 FROM cliente c WHERE c.id = cliente_id AND c.usuario_id = auth.uid())` | Rejeição por RLS | 0 linhas afetadas | Decisão 9 |
| | `DELETE` | `authenticated` | Cliente próprio | `EXISTS (SELECT 1 FROM cliente c WHERE c.id = endereco.cliente_id AND c.usuario_id = auth.uid())` | *N/A* | Rejeição por RLS | 0 linhas afetadas | Decisão 9 |
| **servico** | `SELECT` | `authenticated` | Próprio catálogo | `auth.uid() = usuario_id` | *N/A* | Retorna 0 linhas | Retorna 0 linhas | Decisão 5 |
| | `INSERT` | `authenticated` | Próprio catálogo | *N/A* | `auth.uid() = usuario_id` | Rejeição por RLS | Rejeição por RLS | Decisão 6 |
| | `UPDATE` | `authenticated` | Próprio catálogo | `auth.uid() = usuario_id` | `auth.uid() = usuario_id` | Rejeição por RLS | 0 linhas afetadas | Decisão 7 |
| | `DELETE` | `authenticated` | Próprio catálogo | `auth.uid() = usuario_id` | *N/A* | Rejeição por RLS | 0 linhas afetadas | Decisão D2 (FK RESTRICT) |
| **produto** | `SELECT` | `authenticated` | Próprio catálogo | `auth.uid() = usuario_id` | *N/A* | Retorna 0 linhas | Retorna 0 linhas | Decisão 5 |
| | `INSERT` | `authenticated` | Próprio catálogo | *N/A* | `auth.uid() = usuario_id` | Rejeição por RLS | Rejeição por RLS | Decisão 6 |
| | `UPDATE` | `authenticated` | Próprio catálogo | `auth.uid() = usuario_id` | `auth.uid() = usuario_id` | Rejeição por RLS | 0 linhas afetadas | Decisão 7 |
| | `DELETE` | `authenticated` | Próprio catálogo | `auth.uid() = usuario_id` | *N/A* | Rejeição por RLS | 0 linhas afetadas | Decisão D2 (FK RESTRICT) |
| **orcamento** | `SELECT` | `authenticated` | Próprio orçamento | `auth.uid() = usuario_id` | *N/A* | Retorna 0 linhas | Retorna 0 linhas | Decisão 5 |
| | `INSERT` | `authenticated` | Próprio orçamento e cliente próprio | *N/A* | `auth.uid() = usuario_id AND EXISTS (SELECT 1 FROM cliente c WHERE c.id = cliente_id AND c.usuario_id = auth.uid())` | Rejeição por RLS | Rejeição por RLS | Decisão 6 e 10 |
| | `UPDATE` | `authenticated` | Próprio orçamento e cliente próprio | `auth.uid() = usuario_id` | `auth.uid() = usuario_id AND EXISTS (SELECT 1 FROM cliente c WHERE c.id = cliente_id AND c.usuario_id = auth.uid())` | Rejeição por RLS | 0 linhas afetadas | Decisão 7 e 10 |
| | `DELETE` | `authenticated` | Próprio orçamento em RASCUNHO | `auth.uid() = usuario_id AND status = 'RASCUNHO'` | *N/A* | Rejeição por RLS | 0 linhas afetadas | **Decisão D2 (Homologada)** |
| **item_orcamento** | `SELECT` | `authenticated` | Orçamento próprio | `EXISTS (SELECT 1 FROM orcamento o WHERE o.id = item_orcamento.orcamento_id AND o.usuario_id = auth.uid())` | *N/A* | Retorna 0 linhas | Retorna 0 linhas | Decisão 9 |
| | `INSERT` | `authenticated` | Orçamento próprio e catálogo próprio | *N/A* | `EXISTS (SELECT 1 FROM orcamento o WHERE o.id = orcamento_id AND o.usuario_id = auth.uid()) AND (servico_id IS NULL OR EXISTS (SELECT 1 FROM servico s WHERE s.id = servico_id AND s.usuario_id = auth.uid())) AND (produto_id IS NULL OR EXISTS (SELECT 1 FROM produto p WHERE p.id = produto_id AND p.usuario_id = auth.uid()))` | Rejeição por RLS | Rejeição por RLS | Decisão 9 e 10 |
| | `UPDATE` | `authenticated` | Orçamento próprio e catálogo próprio | `EXISTS (SELECT 1 FROM orcamento o WHERE o.id = item_orcamento.orcamento_id AND o.usuario_id = auth.uid())` | `EXISTS (SELECT 1 FROM orcamento o WHERE o.id = orcamento_id AND o.usuario_id = auth.uid()) AND (servico_id IS NULL OR EXISTS (SELECT 1 FROM servico s WHERE s.id = servico_id AND s.usuario_id = auth.uid())) AND (produto_id IS NULL OR EXISTS (SELECT 1 FROM produto p WHERE p.id = produto_id AND p.usuario_id = auth.uid()))` | Rejeição por RLS | 0 linhas afetadas | Decisão 9 e 10 |
| | `DELETE` | `authenticated` | Orçamento próprio em RASCUNHO | `EXISTS (SELECT 1 FROM orcamento o WHERE o.id = item_orcamento.orcamento_id AND o.usuario_id = auth.uid() AND o.status = 'RASCUNHO')` | *N/A* | Rejeição por RLS | 0 linhas afetadas | **Decisão D2 (Homologada)** |
| **area** | `SELECT` | `authenticated` | Orçamento próprio por cadeia | `EXISTS (SELECT 1 FROM item_orcamento io JOIN orcamento o ON o.id = io.orcamento_id WHERE io.id = area.item_orcamento_id AND o.usuario_id = auth.uid())` | *N/A* | Retorna 0 linhas | Retorna 0 linhas | Decisão 9 |
| | `INSERT` | `authenticated` | Orçamento próprio por cadeia | *N/A* | `EXISTS (SELECT 1 FROM item_orcamento io JOIN orcamento o ON o.id = io.orcamento_id WHERE io.id = item_orcamento_id AND o.usuario_id = auth.uid())` | Rejeição por RLS | Rejeição por RLS | Decisão 9 |
| | `UPDATE` | `authenticated` | Orçamento próprio por cadeia | `EXISTS (SELECT 1 FROM item_orcamento io JOIN orcamento o ON o.id = io.orcamento_id WHERE io.id = area.item_orcamento_id AND o.usuario_id = auth.uid())` | `EXISTS (SELECT 1 FROM item_orcamento io JOIN orcamento o ON o.id = io.orcamento_id WHERE io.id = item_orcamento_id AND o.usuario_id = auth.uid())` | Rejeição por RLS | 0 linhas afetadas | Decisão 9 |
| | `DELETE` | `authenticated` | Orçamento raiz em RASCUNHO | `EXISTS (SELECT 1 FROM item_orcamento io JOIN orcamento o ON o.id = io.orcamento_id WHERE io.id = area.item_orcamento_id AND o.usuario_id = auth.uid() AND o.status = 'RASCUNHO')` | *N/A* | Rejeição por RLS | 0 linhas afetadas | **Decisão D2 (Homologada)** |

---

## 13. Policies Diretas (SQL Proposto — Não Executar)

*(Origem da consolidação: `docs/relatorios/auth-rls-delete-policy-v1.2.md`)*

```sql
-- ============================================================================
-- SQL PROPOSTO — NÃO EXECUTAR (Consolidação de D1 e D2 Homologadas)
-- ============================================================================

-- 1. USUARIO (Sem policy de DELETE — Default Deny estrito via RLS)
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

-- 5. ORCAMENTO (DELETE condicionado formalmente a status = 'RASCUNHO')
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
    USING (auth.uid() = usuario_id AND status = 'RASCUNHO');
```

---

## 14. Policies em Cadeia (SQL Proposto — Não Executar)

*(Origem da consolidação: `docs/relatorios/auth-rls-delete-policy-v1.2.md`)*

```sql
-- ============================================================================
-- SQL PROPOSTO — NÃO EXECUTAR (Consolidação de D2 Homologada em Cadeia)
-- ============================================================================

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

-- 7. ITEM_ORCAMENTO (DELETE condicionado ao orçamento pai estar em RASCUNHO)
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
            WHERE o.id = item_orcamento.orcamento_id
              AND o.usuario_id = auth.uid()
              AND o.status = 'RASCUNHO'
        )
    );

-- 8. AREA (DELETE condicionado ao orçamento raiz estar em RASCUNHO)
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
            WHERE io.id = area.item_orcamento_id
              AND o.usuario_id = auth.uid()
              AND o.status = 'RASCUNHO'
        )
    );
```

---

## 15. Regras Anti-Cross-Tenant e Integridade Relacional

O RLS bloqueia formalmente referências cruzadas forjadas entre diferentes tenants:

1. **Vínculo de Orçamento a Cliente de Terceiros:** A policy `orcamento_insert_policy` exige em `WITH CHECK` que `cliente_id` satisfaça `c.usuario_id = auth.uid()`;
2. **Uso de Catálogos de Terceiros:** `item_orcamento_insert_policy` e `update_policy` validam que `servico_id` e `produto_id` pertençam estritamente ao catálogo do usuário ativo;
3. **Transferência Ilícita de Titularidade:** Nas cláusulas `WITH CHECK` de `UPDATE`, é vedado alterar `usuario_id`.

---

## 16. Autorização vs. Integridade Referencial

*(Origem da consolidação: `docs/relatorios/auth-rls-delete-policy-v1.2.md`)*

Fica mantida a segregação estrita de responsabilidades entre camadas:

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

- **O RLS autoriza:** Avalia a titularidade e o estado prévio da linha. Não substitui integridade relacional;
- **Chaves Estrangeiras (`ON DELETE RESTRICT`):** Impedem a deleção em cascata acidental de dados vinculados (ex.: clientes referenciados por orçamentos);
- **O Domínio governa o ciclo de vida:** Preserva dados históricos auditáveis após o envio da proposta.

---

## 17. Confirmação de E-mail e Segregação de Ambientes

*(Origem da consolidação: `docs/relatorios/auth-rls-auth-config-v1.0.md`)*

A confirmação de e-mail **não é requisito de domínio de negócio** (inexistente em RN v3 e RF v2):

### 17.1. Ambiente de Desenvolvimento Local
- **Configuração:** `enable_confirmations = false` no `supabase/config.toml`;
- **Natureza:** **Decisão de Ambiente (Conveniência Técnica)** para viabilizar testes manuais, testes automatizados e integração contínua sem depender da interceptação de links no Mailpit local;
- **Comportamento do `signUp()`:** Retorna `session` ativa imediatamente.

### 17.2. Ambiente de Produção / Homologação
- **Configuração:** `enable_confirmations = true` (planejada);
- **Natureza:** **Decisão Operacional Pendente** de contratação e provisionamento do serviço SMTP de produção (ex.: Resend, Sendgrid, SES);
- **Comportamento Defensivo na Camada de Presentation:** O aplicativo móvel deve tratar o retorno de `supabase.auth.signUp()` de forma resiliente:
  - Se `session != null`, redireciona imediatamente para a tela inicial (`/home`);
  - Se `session == null`, exibe a tela informativa orientando o usuário a verificar o e-mail cadastrado antes de executar o primeiro login via `signInWithPassword()`.

---

## 18. Sessões, Tokens e Persistência Móvel no Android

*(Origem da consolidação: `docs/relatorios/auth-rls-auth-config-v1.0.md`)*

### 18.1. Parâmetros de Token e Sessão
- `jwt_expiry = 3600` (1 hora): **Default da Plataforma**, gerenciado pelo auto-refresh do SDK `@supabase/supabase-js`;
- `enable_refresh_token_rotation = true`: **Configuração de Segurança Recomendada** para mitigação de replay attacks;
- `refresh_token_reuse_interval = 10` segundos: **Default da Plataforma** para tolerar concorrência em redes móveis instáveis.
- Nenhum desses valores constitui regra de negócio do projeto de jardinagem.

### 18.2. Armazenamento Seguro no Android (Decisão de Infrastructure)
- A persistência de credenciais no aplicativo móvel é uma **decisão técnica da camada de Infrastructure**;
- O `expo-secure-store` possui uma limitação física nativa de 2.048 bytes por entrada no sistema Android SharedPreferences / Keystore;
- O payload de sessão completo do Supabase frequentemente excede 2 KB;
- A camada de Infrastructure móvel implementará o **adaptador híbrido oficial recomendado pela documentação do Supabase para React Native/Expo**: a chave criptográfica simétrica (AES de 256 bits) é armazenada no `expo-secure-store`, e os dados da sessão cifrados são persistidos no `@react-native-async-storage/async-storage`.

---

## 19. Preservação Histórica e Desativação Lógica

*(Origem da consolidação: `docs/relatorios/auth-rls-delete-policy-v1.2.md`)*

- **Usuário:** Não possui exclusão física via API (`Default Deny`). A desativação ou suspensão de conta ocorre mediante `UPDATE public.usuario SET ativo = false WHERE id = auth.uid()`;
- **Clientes, Serviços e Produtos:** A estratégia padrão do aplicativo é a **desativação lógica** (`ativo = false`). Exclusões físicas só são permitidas se o registro não possuir dependências em orçamentos (garantido por `ON DELETE RESTRICT`);
- **Orçamentos Fora de RASCUNHO:** Orçamentos nos estados `ENVIADO`, `EM_ANALISE`, `APROVADO`, `RECUSADO`, `CANCELADO` ou `CONCLUIDO` são históricos auditáveis e têm sua exclusão física **terminantemente bloqueada pelo RLS**.

---

## 20. Segurança do Cliente Móvel (Android)

- O aplicativo React Native / Expo é um cliente público não confiável;
- Nenhuma chave privilegiada (`service_role`) fará parte do código-fonte, bundle de compilação ou assets do aplicativo;
- Toda a comunicação com o Supabase utiliza TLS/HTTPS estrito;
- Credenciais e tokens de sessão são mantidos sob armazenamento criptografado.

---

## 21. Estratégia de Testes Automatizados de RLS

Os testes de integração do RLS serão executados contra a instância real do PostgreSQL local no Docker, simulando requisições de múltiplos usuários através de transações isoladas com claims JWT:

```sql
-- SQL CONCEITUAL DE TESTE — NÃO EXECUTAR
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub": "a0000000-0000-0000-0000-000000000001", "role": "authenticated"}';

-- Consulta legítima do Usuário A
SELECT count(*) FROM cliente;

-- Tentativa de violação: consultar cliente de B
SELECT count(*) FROM cliente WHERE usuario_id = 'b0000000-0000-0000-0000-000000000002'; -- Retorna 0

ROLLBACK;
```

---

## 22. Performance das Políticas de RLS e Plano de Validação Futura

*(Origem da consolidação: `docs/relatorios/auth-rls-performance-v1.0.md`)*

### 22.1. Readequação das Asserções Técnicas
1. **Índices como Garantia Estrutural:** Os índices B-Tree existentes na migration homologada v1.1 (`idx_orcamento_usuario_id`, `idx_item_orcamento_orcamento_id`, `idx_area_item_orcamento_id`, `idx_cliente_usuario_id`) constituem **propriedades estruturais do modelo**, fornecendo os caminhos de acesso necessários para a navegação por cadeia;
2. **Utilização Efetiva Condicionada ao CBO:** A utilização efetiva de índices depende exclusivamente das estimativas de custo calculadas pelo planejador (*Cost-Based Optimizer* — CBO) do PostgreSQL com base em estatísticas reais (`pg_statistic`) e contagem de páginas de disco;
3. **Expurgo de Afirmações Categóricas:** As afirmações de "ausência total de sequential scans", de complexidade algorítmica uniforme $O(\log n)$ para policies inteiras e de sobrecarga não apreciável foram formalmente expurgadas como garantias teóricas do sistema;
4. **Legitimidade de `Seq Scan`:** A ocorrência de varredura sequencial em tabelas pequenas ou de baixa cardinalidade é uma decisão legítima e ótima do PostgreSQL, **não configurando falha ou defeito**;
5. **Hipóteses Técnicas H1 e H2:**
   - **H1:** Índices serão adotados pelo planejador conforme o volume de linhas por tenant crescer;
   - **H2:** Subqueries `EXISTS` serão descorrelacionadas em Semi-Joins eficientes pelo planejador;
   - Ambas permanecem como **hipóteses técnicas a serem validadas empiricamente**.
6. **Reenquadramento de H3:** O valor preliminar de 100 ms **não constitui requisito de negócio** (inexistente em RNF v2 / RF v2), figurando estritamente como meta/critério experimental provisório de engenharia interna para testes de bancada.

### 22.2. Plano Formal de Validação Futura (Consultas C1 a C6)
A validação de desempenho ocorrerá futuramente, durante a etapa de testes de integração da migration de Auth/RLS, instrumentando as seis consultas padronizadas com `EXPLAIN (ANALYZE, BUFFERS)` em ambiente Docker com massa de dados multi-tenant representativa (Tenant A com volumetria típica e Tenant B para controle de isolamento):

- **C1 (Leitura Direta com Predicado Seletivo):** `SELECT * FROM cliente WHERE id = $1;`
- **C2 (Leitura Direta de Catálogo):** `SELECT * FROM servico WHERE ativo = true;`
- **C3 (Navegação em Cadeia Simples):** `SELECT * FROM item_orcamento WHERE orcamento_id = $1;`
- **C4 (Navegação em Cadeia Dupla):** `SELECT * FROM area WHERE item_orcamento_id = $1;`
- **C5 (Mutação Condicionada por RLS):** `DELETE FROM orcamento WHERE id = $1;`
- **C6 (Consulta Agregada Hierárquica da Pilha Integrada):** Avalia o comportamento conjunto e indissociável da pilha:
  $$\text{PostgREST} + \text{Consulta Relacional com Agregação JSON} + \text{Motor PostgreSQL} + \text{Políticas RLS}$$
  e **não exclusivamente o custo isolado do RLS**.

---

## 23. Riscos Arquiteturais e Mitigações Consolidadas

1. **Risco 1: Cadastro falhar no banco por ausência de metadados no Auth.**  
   *Mitigação:* Presentation e Application validam a presença de `nome` antes do despacho de `signUp()`. A trigger transacional aborta o processo com exceção SQL se os metadados forem omitidos.
2. **Risco 2: Falha transitória impedir criação do perfil via trigger.**  
   *Mitigação:* Mecanismo defensivo de fallback no login redireciona para a tela de conclusão de perfil.
3. **Risco 3: Perda de integridade histórica por exclusão indevida.**  
   *Mitigação:* Homologação de D1 (bloqueio total de DELETE em `usuario`), D2 (DELETE restrito a `RASCUNHO` em orçamentos, itens e áreas) e constraints `ON DELETE RESTRICT` nas chaves estrangeiras.
4. **Risco 4: Bloqueio de rotinas internas por aplicação indevida de FORCE RLS.**  
   *Mitigação:* Homologação da rejeição de `FORCE RLS` (Seção 10), garantindo o bypass nativo do FUNCTION OWNER (`postgres`) na função de bootstrap.
5. **Risco 5: Exposição indesejada de rotinas de banco via API PostgREST.**  
   *Mitigação:* Posicionamento no schema `private` (`private.handle_new_user()`), controle estrito de `EXECUTE` e arquitetura de trigger procedure nativa.
6. **Risco 6: Falha de persistência de sessão no Android por limite do SecureStore.**  
   *Mitigação:* Adoção do adaptador híbrido de armazenamento criptografado oficial do Supabase na camada de Infrastructure móvel.

---

## 24. Quadro Geral das Decisões Consolidadas e Homologadas

Todas as 14 decisões técnicas fundamentais da estratégia de Supabase Auth + RLS foram formalmente **HOMOLOGADAS DOCUMENTALMENTE**:

| # | Decisão Técnica | Deliberação Consolidada v1.6 | Justificativa Arquitetural | Status | Origem Documental Homologada |
|---|---|---|---|---|---|
| **1** | **Método de Autenticação** | Formalizado `Email + Senha`. Gestão de hashing delegada ao Supabase Auth (`bcrypt`), sem parametrização local. | Simplicidade operacional e segurança nativa do provedor de identidade. | **HOMOLOGADA** | `auth-rls-auth-config-v1.0.md` |
| **2** | **Criação de `USUARIO`** | Criação atômica via trigger transacional `private.handle_new_user()`. Fallback defensivo mantido exclusivamente para anomalias. | Garantia de transacionalidade no SGBD e resiliência na aplicação. | **HOMOLOGADA** | `auth-rls-security-definer-v1.2.md` |
| **3** | **Vínculo `auth.uid()` ↔ `usuario.id`** | Vínculo estrito `usuario.id = auth.uid()`. Imutabilidade garantida por cláusula `WITH CHECK` na policy de UPDATE. | Blindagem absoluta contra usurpação de perfil multi-tenant. | **HOMOLOGADA** | `auth-rls-strategy-v1.4.md` |
| **4** | **Diretiva de RLS (`ENABLE` vs `FORCE`)** | Adotado exclusivamente `ENABLE ROW LEVEL SECURITY` nas 8 tabelas. Rejeitado `FORCE ROW LEVEL SECURITY`. | Garante isolamento de `authenticated` e `anon`, preservando bypass do FUNCTION OWNER `postgres`. | **HOMOLOGADA** | `auth-rls-strategy-v1.3.md` |
| **5** | **Política SELECT** | Matriz Operacional com cláusula `USING` explícita por role `authenticated` (direta ou por cadeia). | Isolamento total de visualização entre profissionais. | **HOMOLOGADA** | `auth-rls-strategy-v1.4.md` |
| **6** | **Política INSERT** | Cláusula `WITH CHECK` validando titularidade do autor e de todas as FKs associadas (anti-cross-tenant). | Impede a criação de registros vinculados a clientes ou catálogos alheios. | **HOMOLOGADA** | `auth-rls-strategy-v1.4.md` |
| **7** | **Política UPDATE** | Cláusula `USING` (valida registro prévio) e `WITH CHECK` (valida que titularidade permanece idêntica). | Evita transferência de posse de entidades entre contas. | **HOMOLOGADA** | `auth-rls-strategy-v1.4.md` |
| **8** | **Política DELETE e Desativação Lógica** | Decisão D1: Sem policy de DELETE em `usuario` (Default Deny; desativação por `ativo = false`). Decisão D2: DELETE de `orcamento`, `item_orcamento` e `area` permitido unicamente quando o orçamento estiver em `RASCUNHO`. | Preservação histórica de dados de auditoria e orçamentos emitidos. | **HOMOLOGADA** | `auth-rls-delete-policy-v1.2.md` |
| **9** | **Proteção Relacional por Cadeia** | Navegação em `endereco`, `item_orcamento` e `area` respeitando estritamente o Modelo Físico v1.1 sem desnormalização. | Consistência com o modelo de dados congelado e aproveitamento de índices B-Tree. | **HOMOLOGADA** | `auth-rls-delete-policy-v1.2.md` |
| **10** | **Regras Anti-Cross-Tenant** | Validação relacional em `orcamento` (`cliente_id`) e `item_orcamento` (`servico_id`, `produto_id`). | Blindagem contra falsificação de referências relacionais. | **HOMOLOGADA** | `auth-rls-strategy-v1.4.md` |
| **11** | **Estratégia de Testes de RLS** | Simulação transacional multi-tenant com dois usuários no PostgreSQL local com `SET LOCAL "request.jwt.claims"`. | Validação determinística no mesmo contexto de execução do PostgREST. | **HOMOLOGADA** | `auth-rls-strategy-v1.4.md` |
| **12** | **Necessidade de Triggers e Hardening** | Trigger nativa `on_auth_user_created` (`AFTER INSERT ON auth.users`) executando `private.handle_new_user()` com `SECURITY DEFINER`, `search_path = ''` e menor privilégio de `EXECUTE`. | Transacionalidade atômica, defesa em profundidade e proteção fora da Data API. | **HOMOLOGADA** | `auth-rls-security-definer-v1.2.md` |
| **13** | **Configurações de Auth e Ambientes** | Segregação entre ambiente local (`enable_confirmations = false`) e produção (decisão operacional pendente). `minimum_password_length = 6` e tokens classificados como defaults da plataforma. | Eliminação de suposições não fundamentadas e clareza operacional. | **HOMOLOGADA** | `auth-rls-auth-config-v1.0.md` |
| **14** | **Futura Migration de Auth/RLS** | Criação de migration dedicada de Auth/RLS (ex.: `20260921000000_auth_rls.sql`) somente após homologação integral documental da estratégia. | Preservação da migration `20260916020500_modelo_fisico_v1_1.sql` imutável. | **HOMOLOGADA** | `auth-rls-strategy-v1.5.md` |

---

## 25. Conclusão e Próximos Passos

A **Estratégia de Supabase Auth + RLS v1.6** conclui formalmente o saneamento e a consolidação de toda a arquitetura de autenticação, autorização e isolamento multi-tenant do projeto de jardinagem:

1. **Todas as Decisões Estão Homologadas Documentalmente:** Não restam pendências conceituais ou pontos abertos de revisão na estratégia;
2. **Eliminação Integral de Premissas Não Comprovadas:** As alegações de performance foram readequadas aos princípios reais do CBO do PostgreSQL, e as configurações do Supabase Auth foram delimitadas com rigor contra a documentação oficial da ferramenta;
3. **Preservação de Integridade:** O Modelo Físico v1.1, o DER v1.1 e a migration `20260916020500_modelo_fisico_v1_1.sql` permaneceram estritamente congelados e inalterados durante todo o processo;
4. **Próximo Passo Formal:** Elaboração da migration dedicada de Auth/RLS (contendo a criação do schema `private`, a função `private.handle_new_user()`, a trigger nativa em `auth.users`, a ativação de RLS e a criação de todas as policies homologadas na Seção 12), seguida de seus respectivos testes de integração automatizados e validação via `EXPLAIN (ANALYZE, BUFFERS)`.
