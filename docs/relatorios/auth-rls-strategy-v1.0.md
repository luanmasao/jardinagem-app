# Estratégia de Supabase Auth + RLS v1.0

**Documento de Análise e Proposta Técnica — PENDENTE DE HOMOLOGAÇÃO**  
**Data:** 2026-09-18  
**Autor:** Equipe de Arquitetura e Engenharia de Software  
**Referências Oficiais:**
- Regras de Negócio (RN v3)
- Requisitos Funcionais (RF v2) e Não Funcionais (RNF v2)
- Modelo Conceitual / DER v1.1 (`docs/uml/der.puml`)
- Arquitetura Técnica v1.1 (`.agents/rules/architecture.md`)
- Modelo Físico v1.1 (`docs/modelo-fisico-v1.1.md`)
- Migration Homologada (`supabase/migrations/20260916020500_modelo_fisico_v1_1.sql`)
- Relatório de Validação Dinâmica (`docs/relatorios/migration-local-validation-v1.1.md`)

---

## 1. Objetivo

O objetivo deste documento é projetar, documentar e submeter à homologação formal a **estratégia técnica de autenticação (Supabase Auth)** e **autorização / isolamento multi-tenant (PostgreSQL Row Level Security — RLS)** para o Sistema de Orçamentos para Jardinagem.

Esta etapa é exclusivamente de **análise e proposta**. Nenhuma migration será criada, nenhum comando DDL/DML será executado no banco de dados e nenhuma alteração será feita na base de código antes da aprovação explícita das decisões aqui contidas.

---

## 2. Premissas

1. **Separação entre Identidade e Perfil:**
   - O **Supabase Auth** (`auth.users`) é a única fonte da verdade para identidades, credenciais, hashing de senhas, emissão de tokens JWT e sessões.
   - A tabela `public.usuario` representa estritamente o **perfil de negócio** da aplicação, sem duplicar senhas ou credenciais de acesso.
   - O identificador `public.usuario.id` é do tipo `UUID` e corresponde obrigatoriamente a `auth.uid()`.
2. **Modelo Físico v1.1 Congelado:**
   - A migration `20260916020500_modelo_fisico_v1_1.sql` está homologada e validada.
   - As tabelas `item_orcamento`, `area` e `endereco` **não possuem `usuario_id` redundante**. A modelagem relacional é a fonte da verdade e o RLS deve respeitar a hierarquia relacional estabelecida.
3. **Cliente Móvel (Android) Não Confiável:**
   - O aplicativo móvel opera em ambiente sob controle do usuário final. Nenhuma regra crítica de isolamento ou autorização pode depender exclusivamente da interface ou de validações client-side.
   - O RLS no PostgreSQL atua como barreira inegociável e definitiva para a segurança dos dados.
   - Chaves privilegiadas (`service_role`) **jamais** serão empacotadas no aplicativo Android. O aplicativo utilizará exclusivamente a `anon_key` pública e o token JWT do usuário autenticado (`Authorization: Bearer <jwt>`).
4. **Isolamento Estrito (Zero Leakage):**
   - Um usuário A jamais poderá visualizar, alterar, remover ou associar seus dados aos de um usuário B.
   - Requisições não autenticadas (`auth.uid() IS NULL`) serão bloqueadas em todas as operações sobre os dados de negócio.
5. **Preservação Histórica e Integridade Referencial:**
   - A regra `item_orcamento.orcamento_id -> orcamento.id ON DELETE RESTRICT` (Decisão 1 homologada) é inegociável e o RLS não contornará restrições de integridade física ou lógica.

---

## 3. Relação Supabase Auth → USUARIO

O Modelo Físico v1.1 estabelece:

```text
Supabase Auth (auth.users)
        ↓
    auth.uid()
        ↓ 1:1
  USUARIO.id (public.usuario)
```

### 3.1. Análise Comparativa de Mecanismos de Criação do Perfil

| Mecanismo | Funcionamento | Vantagens | Riscos / Desvantagens | Recomendação |
|---|---|---|---|---|
| **Opção 1: Criação pelo Cliente (Application Service)** | O app chama `supabase.auth.signUp()`, obtém o `auth.uid()` e executa um `INSERT INTO public.usuario (id, nome, ...)` | Não exige código PL/pgSQL nem triggers no banco; regras de validação no TypeScript. | Falta de atomicidade: se o app perder a conexão entre o `signUp` e o `INSERT`, cria-se uma conta no Auth sem perfil no banco ("perfil órfão"). Exige política de INSERT permissiva em `public.usuario`. | Não recomendada como via primária |
| **Opção 2: Trigger no Banco (`AFTER INSERT ON auth.users`)** | Uma trigger PL/pgSQL no schema `auth` escuta inserções em `auth.users` e insere atomicamente em `public.usuario` lendo `raw_user_meta_data`. | Atomicidade transacional: conta e perfil nascem no mesmo instante. Se a inserção do perfil falhar, o cadastro no Auth sofre rollback. | Exige função `SECURITY DEFINER` e migração adicional de banco. Metadados de negócio trafegam no payload do Auth. | **Recomendada como via primária** |
| **Opção 3: Híbrida com Bootstrap Defensivo (Recomendada)** | Trigger automática (Opção 2) como via primária. Se por qualquer anomalia o perfil não existir no login, o Application Service detecta a ausência e permite a criação pontual protegida por RLS (`auth.uid() = id`). | Resiliência máxima contra falhas de sincronismo, idempotência e tratamento completo de casos de borda. | Exige documentação clara de ambos os fluxos e política de INSERT específica. | **PROPOSTA PARA HOMOLOGAÇÃO** |

### 3.2. Regras de Negócio do Perfil `USUARIO`

- **Quem pode criar:** O próprio usuário autenticado para seu respectivo `id` (`auth.uid() = id`) ou a trigger interna do sistema operacional do banco.
- **Garantia de Identidade:** `usuario.id` não possui default `gen_random_uuid()` no Modelo Físico v1.1 justamente para impor o recebimento do identificador gerado pelo Supabase Auth.
- **Prevenção de Duplicidade:** `usuario.id` é Chave Primária. Tentativas de recriar perfil com mesmo ID são rejeitadas pelo SGBD.
- **Cadastro Incompleto / Perfil Ausente:** Se um usuário autenticar com sucesso no Auth mas a consulta `SELECT * FROM public.usuario WHERE id = auth.uid()` retornar vazio, o aplicativo Android interceptará esse estado no roteador (Expo Router) e redirecionará para uma tela obrigatória de "Conclusão de Perfil", impedindo a navegação no catálogo ou orçamentos.
- **Exclusão e Desativação:**
  - A desativação é a via padrão (`UPDATE usuario SET ativo = false WHERE id = auth.uid()`).
  - Caso ocorra exclusão física da identidade no Supabase Auth (`auth.users`), a integridade referencial com os dados vinculados em `cliente`, `servico`, `produto` e `orcamento` (`ON DELETE RESTRICT`) impedirá a deleção física caso haja dados históricos.

---

## 4. Fluxo de Autenticação Proposto

### 4.1. Método Selecionado para a Versão 1.0: Email e Senha (`Email + Password`)

**Justificativa:**
- Perfeitamente adequado ao modelo operacional de profissionais e pequenas empresas de jardinagem.
- Nativamente suportado pelo Supabase Auth sem necessidade de contratação de gateways de SMS (como Twilio) ou credenciamento complexo de OAuth (Google Cloud Console, Apple Developer Portal).
- Totalmente testável e reproduzível no ambiente local de desenvolvimento utilizando o **Mailpit** integrado na porta `54324`.
- Minimiza custos de infraestrutura e dependências externas no lançamento.

**Métodos Adiados (Escopo Futuro):**
- OAuth Social (Google, Apple)
- Magic Link por email sem senha
- Autenticação por SMS / WhatsApp OTP
- Passkeys / Biometria FIDO2 / WebAuthn
- Autenticação Multifator (MFA / TOTP)

### 4.2. Ciclo de Vida da Sessão

```text
[Usuário] ---> [Tela Login] ---> supabase.auth.signInWithPassword()
                                          |
                                          v
                                 [Supabase Auth Engine]
                                          |
                        +-----------------+-----------------+
                        | Validação OK                      | Erro de credenciais
                        v                                   v
             [Retorna JWT + Refresh Token]         [Exibe erro na UI]
                        |
                        v
       [Armazenamento Seguro: SecureStore (Android)]
                        |
                        v
       [Header: Authorization Bearer <JWT>]
                        |
                        v
       [PostgreSQL RLS: auth.uid() extraído do JWT]
```

1. **Cadastro (Sign Up):**
   - Usuário preenche Nome, Email, Senha (mínimo 6 caracteres conforme `config.toml`) e Telefone (opcional).
   - O aplicativo invoca `supabase.auth.signUp({ email, password, options: { data: { nome, telefone } } })`.
   - Em ambiente local (`enable_confirmations = false`), a sessão é aberta imediatamente.
   - Em produção (`enable_confirmations = true`), um email com link de confirmação é expedido antes da liberação do login.
2. **Login (Sign In):**
   - Usuário insere email e senha; aplicativo invoca `supabase.auth.signInWithPassword({ email, password })`.
   - O Supabase Auth valida o hash `bcrypt`/`argon2` e emite o JWT contendo a claim `sub = <uuid>` e o refresh token.
3. **Logout (Sign Out):**
   - Chamada a `supabase.auth.signOut()`.
   - O SDK revoga a sessão, limpa os tokens do armazenamento seguro local (`expo-secure-store`) e o aplicativo redireciona o usuário para o fluxo de boas-vindas.
4. **Recuperação de Senha (Password Reset):**
   - Usuário solicita recuperação informando o email cadastrado via `supabase.auth.resetPasswordForEmail(email)`.
   - Um link seguro com OTP é enviado ao email (visível no Mailpit em desenvolvimento).
   - O usuário acessa a tela de redefinição e executa `supabase.auth.updateUser({ password: novaSenha })`.
5. **Tratamento de Sessão Expirada e Renovação:**
   - O token JWT tem expiração padrão de 3600 segundos (1 hora).
   - O cliente Supabase (`@supabase/supabase-js`) realiza a rotação automática do token em background (`autoRefreshToken: true`).
   - Se o refresh token falhar (ex.: revogado, expirado após o intervalo configurado), o listener `onAuthStateChange` detecta `SIGNED_OUT` e a aplicação expulsa o usuário para a tela de autenticação, limpando o cache local.
6. **Tratamento de Usuário Não Autenticado:**
   - No nível da aplicação: Guards de rota do Expo Router bloqueiam telas restritas.
   - No nível do banco: Se qualquer chamada chegar ao PostgreSQL sem token ou com token anônimo, `auth.uid()` será avaliado como `NULL`, resultando em bloqueio imediato via RLS.

---

## 5. Modelo de Propriedade dos Dados

O modelo de dados do projeto estrutura a titularidade dos registros em dois níveis bem definidos:

### 5.1. Propriedade Direta

As entidades que mantêm associação direta com o profissional/empresa contêm o campo `usuario_id`:

- `cliente.usuario_id` → `usuario.id`
- `servico.usuario_id` → `usuario.id`
- `produto.usuario_id` → `usuario.id`
- `orcamento.usuario_id` → `usuario.id`

### 5.2. Propriedade Indireta (Hierarquia Relacional)

Em estrita consonância com o Modelo Físico v1.1 e o DER v1.1, as entidades dependentes **não possuem** coluna redundante `usuario_id`. Sua titularidade é comprovada exclusivamente navegando pela árvore relacional:

1. **ENDERECO:** Pertence ao cliente, que pertence ao usuário:
   $$\text{ENDERECO} \longrightarrow \text{CLIENTE} \longrightarrow \text{USUARIO}$$
2. **ITEM_ORCAMENTO:** Pertence ao orçamento, que pertence ao usuário:
   $$\text{ITEM_ORCAMENTO} \longrightarrow \text{ORCAMENTO} \longrightarrow \text{USUARIO}$$
3. **AREA:** Pertence ao item de orçamento, que pertence ao orçamento, que pertence ao usuário:
   $$\text{AREA} \longrightarrow \text{ITEM\_ORCAMENTO} \longrightarrow \text{ORCAMENTO} \longrightarrow \text{USUARIO}$$

Essa modelagem impede a ocorrência de anomalias de atualização ou inconsistências entre chaves de posse redundantes.

---

## 6. Matriz de Autorização (RLS Matrix)

A matriz abaixo detalha a permissão de acesso para as 8 tabelas de domínio, distinguindo formalmente os papéis das cláusulas SQL:
- **`USING`**: Avaliada contra linhas já existentes no banco de dados para determinar se elas são visíveis para `SELECT`, elegíveis para modificação em `UPDATE` ou elegíveis para remoção em `DELETE`.
- **`WITH CHECK`**: Avaliada contra as novas linhas propostas para determinar se elas têm permissão de serem criadas em `INSERT` ou se os novos valores após a modificação em `UPDATE` são válidos e permitidos.

| Tabela | Operação | Quem Pode Executar | Condição de Propriedade | Relação de Validação | Comportamento se Desautenticado (`auth.uid() IS NULL`) | Comportamento se Pertence a Outro Usuário |
|---|---|---|---|---|---|---|
| **usuario** | `SELECT` | Usuário autenticado | Próprio perfil | `id = auth.uid()` | Retorna 0 linhas (vazio) | Retorna 0 linhas (invisível) |
| | `INSERT` | Usuário autenticado | Próprio perfil | `id = auth.uid()` | Rejeição por violação de RLS | Rejeição por violação de RLS |
| | `UPDATE` | Usuário autenticado | Próprio perfil | `id = auth.uid()` (mantém `id`) | Rejeição por violação de RLS | Rejeição / 0 linhas afetadas |
| | `DELETE` | Usuário autenticado | Próprio perfil | `id = auth.uid()` | Rejeição por violação de RLS | Rejeição / 0 linhas afetadas |
| **cliente** | `SELECT` | Usuário autenticado | Próprios clientes | `usuario_id = auth.uid()` | Retorna 0 linhas | Retorna 0 linhas |
| | `INSERT` | Usuário autenticado | Próprios clientes | `usuario_id = auth.uid()` | Rejeição por violação de RLS | Rejeição por violação de RLS |
| | `UPDATE` | Usuário autenticado | Próprios clientes | `usuario_id = auth.uid()` | Rejeição por violação de RLS | Rejeição / 0 linhas afetadas |
| | `DELETE` | Usuário autenticado | Próprios clientes | `usuario_id = auth.uid()` | Rejeição por violação de RLS | Rejeição / 0 linhas afetadas |
| **endereco** | `SELECT` | Usuário autenticado | Endereço do cliente próprio | `cliente_id` pertence a cliente de `auth.uid()` | Retorna 0 linhas | Retorna 0 linhas |
| | `INSERT` | Usuário autenticado | Endereço do cliente próprio | `cliente_id` pertence a cliente de `auth.uid()` | Rejeição por violação de RLS | Rejeição por violação de RLS |
| | `UPDATE` | Usuário autenticado | Endereço do cliente próprio | `cliente_id` pertence a cliente de `auth.uid()` | Rejeição por violação de RLS | Rejeição / 0 linhas afetadas |
| | `DELETE` | Usuário autenticado | Endereço do cliente próprio | `cliente_id` pertence a cliente de `auth.uid()` | Rejeição por violação de RLS | Rejeição / 0 linhas afetadas |
| **servico** | `SELECT` | Usuário autenticado | Próprio catálogo | `usuario_id = auth.uid()` | Retorna 0 linhas | Retorna 0 linhas |
| | `INSERT` | Usuário autenticado | Próprio catálogo | `usuario_id = auth.uid()` | Rejeição por violação de RLS | Rejeição por violação de RLS |
| | `UPDATE` | Usuário autenticado | Próprio catálogo | `usuario_id = auth.uid()` | Rejeição por violação de RLS | Rejeição / 0 linhas afetadas |
| | `DELETE` | Usuário autenticado | Próprio catálogo | `usuario_id = auth.uid()` | Rejeição por violação de RLS | Rejeição / 0 linhas afetadas |
| **produto** | `SELECT` | Usuário autenticado | Próprio catálogo | `usuario_id = auth.uid()` | Retorna 0 linhas | Retorna 0 linhas |
| | `INSERT` | Usuário autenticado | Próprio catálogo | `usuario_id = auth.uid()` | Rejeição por violação de RLS | Rejeição por violação de RLS |
| | `UPDATE` | Usuário autenticado | Próprio catálogo | `usuario_id = auth.uid()` | Rejeição por violação de RLS | Rejeição / 0 linhas afetadas |
| | `DELETE` | Usuário autenticado | Próprio catálogo | `usuario_id = auth.uid()` | Rejeição por violação de RLS | Rejeição / 0 linhas afetadas |
| **orcamento** | `SELECT` | Usuário autenticado | Próprios orçamentos | `usuario_id = auth.uid()` | Retorna 0 linhas | Retorna 0 linhas |
| | `INSERT` | Usuário autenticado | Próprio e cliente próprio | `usuario_id = auth.uid()` E `cliente_id` próprio | Rejeição por violação de RLS | Rejeição por violação de RLS |
| | `UPDATE` | Usuário autenticado | Próprio e cliente próprio | `usuario_id = auth.uid()` E `cliente_id` próprio | Rejeição por violação de RLS | Rejeição / 0 linhas afetadas |
| | `DELETE` | Usuário autenticado | Próprios orçamentos | `usuario_id = auth.uid()` | Rejeição por violação de RLS | Rejeição / 0 linhas afetadas |
| **item_orcamento** | `SELECT` | Usuário autenticado | Item de orçamento próprio | `orcamento_id` pertence a orçamento de `auth.uid()` | Retorna 0 linhas | Retorna 0 linhas |
| | `INSERT` | Usuário autenticado | Orçamento próprio + itens próprios | `orcamento` próprio E `servico`/`produto` próprio | Rejeição por violação de RLS | Rejeição por violação de RLS |
| | `UPDATE` | Usuário autenticado | Item de orçamento próprio | `orcamento` próprio E `servico`/`produto` próprio | Rejeição por violação de RLS | Rejeição / 0 linhas afetadas |
| | `DELETE` | Usuário autenticado | Item de orçamento próprio | `orcamento_id` pertence a orçamento de `auth.uid()` | Rejeição por violação de RLS | Rejeição / 0 linhas afetadas |
| **area** | `SELECT` | Usuário autenticado | Área de item próprio | Cadeia `item_orcamento` → `orcamento` de `auth.uid()` | Retorna 0 linhas | Retorna 0 linhas |
| | `INSERT` | Usuário autenticado | Área de item próprio | Cadeia `item_orcamento` → `orcamento` de `auth.uid()` | Rejeição por violação de RLS | Rejeição por violação de RLS |
| | `UPDATE` | Usuário autenticado | Área de item próprio | Cadeia `item_orcamento` → `orcamento` de `auth.uid()` | Rejeição por violação de RLS | Rejeição / 0 linhas afetadas |
| | `DELETE` | Usuário autenticado | Área de item próprio | Cadeia `item_orcamento` → `orcamento` de `auth.uid()` | Rejeição por violação de RLS | Rejeição / 0 linhas afetadas |

---

## 7. Estratégia RLS por Tabela

Para garantir o isolamento sem exceções:
1. Todas as 8 tabelas terão RLS explicitamente ativado via:
   `ALTER TABLE <nome_tabela> ENABLE ROW LEVEL SECURITY;`
2. Todas as tabelas terão a diretiva `FORCE ROW LEVEL SECURITY` aplicada aos papéis da aplicação (ou RLS habilitado sem bypass pelo papel `authenticated`).
3. Por padrão no PostgreSQL, quando o RLS está habilitado em uma tabela e nenhuma policy confere permissão, o comportamento padrão é **bloqueio total** (negação implícita).

---

## 8. Policies Diretas

As tabelas com propriedade direta utilizam predicados baseados na correspondência `auth.uid() = usuario_id`.

> [!IMPORTANT]
> Os blocos de código abaixo representam o **SQL PROPOSTO — NÃO EXECUTAR**. Nenhuma instrução será enviada ao banco de dados nesta etapa.

### 8.1. Tabela `usuario`

```sql
-- SQL PROPOSTO — NÃO EXECUTAR
ALTER TABLE usuario ENABLE ROW LEVEL SECURITY;

CREATE POLICY usuario_select_policy ON usuario
    FOR SELECT TO authenticated
    USING (auth.uid() = id);

CREATE POLICY usuario_insert_policy ON usuario
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = id);

CREATE POLICY usuario_update_policy ON usuario
    FOR UPDATE TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY usuario_delete_policy ON usuario
    FOR DELETE TO authenticated
    USING (auth.uid() = id);
```

### 8.2. Tabelas de Catálogo: `cliente`, `servico`, `produto`

```sql
-- SQL PROPOSTO — NÃO EXECUTAR
-- CLIENTE
ALTER TABLE cliente ENABLE ROW LEVEL SECURITY;

CREATE POLICY cliente_select_policy ON cliente
    FOR SELECT TO authenticated
    USING (auth.uid() = usuario_id);

CREATE POLICY cliente_insert_policy ON cliente
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY cliente_update_policy ON cliente
    FOR UPDATE TO authenticated
    USING (auth.uid() = usuario_id)
    WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY cliente_delete_policy ON cliente
    FOR DELETE TO authenticated
    USING (auth.uid() = usuario_id);

-- SERVICO
ALTER TABLE servico ENABLE ROW LEVEL SECURITY;

CREATE POLICY servico_select_policy ON servico
    FOR SELECT TO authenticated
    USING (auth.uid() = usuario_id);

CREATE POLICY servico_insert_policy ON servico
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY servico_update_policy ON servico
    FOR UPDATE TO authenticated
    USING (auth.uid() = usuario_id)
    WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY servico_delete_policy ON servico
    FOR DELETE TO authenticated
    USING (auth.uid() = usuario_id);

-- PRODUTO
ALTER TABLE produto ENABLE ROW LEVEL SECURITY;

CREATE POLICY produto_select_policy ON produto
    FOR SELECT TO authenticated
    USING (auth.uid() = usuario_id);

CREATE POLICY produto_insert_policy ON produto
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY produto_update_policy ON produto
    FOR UPDATE TO authenticated
    USING (auth.uid() = usuario_id)
    WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY produto_delete_policy ON produto
    FOR DELETE TO authenticated
    USING (auth.uid() = usuario_id);
```

### 8.3. Tabela `orcamento`

Além de verificar `usuario_id`, a política deve validar que o `cliente_id` associado pertence ao mesmo usuário:

```sql
-- SQL PROPOSTO — NÃO EXECUTAR
ALTER TABLE orcamento ENABLE ROW LEVEL SECURITY;

CREATE POLICY orcamento_select_policy ON orcamento
    FOR SELECT TO authenticated
    USING (auth.uid() = usuario_id);

CREATE POLICY orcamento_insert_policy ON orcamento
    FOR INSERT TO authenticated
    WITH CHECK (
        auth.uid() = usuario_id
        AND EXISTS (
            SELECT 1 FROM cliente c 
            WHERE c.id = cliente_id 
              AND c.usuario_id = auth.uid()
        )
    );

CREATE POLICY orcamento_update_policy ON orcamento
    FOR UPDATE TO authenticated
    USING (auth.uid() = usuario_id)
    WITH CHECK (
        auth.uid() = usuario_id
        AND EXISTS (
            SELECT 1 FROM cliente c 
            WHERE c.id = cliente_id 
              AND c.usuario_id = auth.uid()
        )
    );

CREATE POLICY orcamento_delete_policy ON orcamento
    FOR DELETE TO authenticated
    USING (auth.uid() = usuario_id);
```

---

## 9. Policies por Cadeia

Para entidades que não possuem `usuario_id` direto, as políticas navegam nas relações homologadas no DER v1.1.

### 9.1. Tabela `endereco`

Cadeia: `ENDERECO` → `CLIENTE` → `USUARIO`.

```sql
-- SQL PROPOSTO — NÃO EXECUTAR
ALTER TABLE endereco ENABLE ROW LEVEL SECURITY;

CREATE POLICY endereco_select_policy ON endereco
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM cliente c
            WHERE c.id = endereco.cliente_id
              AND c.usuario_id = auth.uid()
        )
    );

CREATE POLICY endereco_insert_policy ON endereco
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM cliente c
            WHERE c.id = cliente_id
              AND c.usuario_id = auth.uid()
        )
    );

CREATE POLICY endereco_update_policy ON endereco
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM cliente c
            WHERE c.id = endereco.cliente_id
              AND c.usuario_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM cliente c
            WHERE c.id = cliente_id
              AND c.usuario_id = auth.uid()
        )
    );

CREATE POLICY endereco_delete_policy ON endereco
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM cliente c
            WHERE c.id = endereco.cliente_id
              AND c.usuario_id = auth.uid()
        )
    );
```

### 9.2. Tabela `item_orcamento`

Cadeia: `ITEM_ORCAMENTO` → `ORCAMENTO` → `USUARIO`.

```sql
-- SQL PROPOSTO — NÃO EXECUTAR
ALTER TABLE item_orcamento ENABLE ROW LEVEL SECURITY;

CREATE POLICY item_orcamento_select_policy ON item_orcamento
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM orcamento o
            WHERE o.id = item_orcamento.orcamento_id
              AND o.usuario_id = auth.uid()
        )
    );

CREATE POLICY item_orcamento_insert_policy ON item_orcamento
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM orcamento o
            WHERE o.id = orcamento_id
              AND o.usuario_id = auth.uid()
        )
        AND (
            servico_id IS NULL OR EXISTS (
                SELECT 1 FROM servico s
                WHERE s.id = servico_id
                  AND s.usuario_id = auth.uid()
            )
        )
        AND (
            produto_id IS NULL OR EXISTS (
                SELECT 1 FROM produto p
                WHERE p.id = produto_id
                  AND p.usuario_id = auth.uid()
            )
        )
    );

CREATE POLICY item_orcamento_update_policy ON item_orcamento
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM orcamento o
            WHERE o.id = item_orcamento.orcamento_id
              AND o.usuario_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM orcamento o
            WHERE o.id = orcamento_id
              AND o.usuario_id = auth.uid()
        )
        AND (
            servico_id IS NULL OR EXISTS (
                SELECT 1 FROM servico s
                WHERE s.id = servico_id
                  AND s.usuario_id = auth.uid()
            )
        )
        AND (
            produto_id IS NULL OR EXISTS (
                SELECT 1 FROM produto p
                WHERE p.id = produto_id
                  AND p.usuario_id = auth.uid()
            )
        )
    );

CREATE POLICY item_orcamento_delete_policy ON item_orcamento
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM orcamento o
            WHERE o.id = item_orcamento.orcamento_id
              AND o.usuario_id = auth.uid()
        )
    );
```

### 9.3. Tabela `area`

Cadeia: `AREA` → `ITEM_ORCAMENTO` → `ORCAMENTO` → `USUARIO`.

```sql
-- SQL PROPOSTO — NÃO EXECUTAR
ALTER TABLE area ENABLE ROW LEVEL SECURITY;

CREATE POLICY area_select_policy ON area
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM item_orcamento io
            JOIN orcamento o ON o.id = io.orcamento_id
            WHERE io.id = area.item_orcamento_id
              AND o.usuario_id = auth.uid()
        )
    );

CREATE POLICY area_insert_policy ON area
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM item_orcamento io
            JOIN orcamento o ON o.id = io.orcamento_id
            WHERE io.id = item_orcamento_id
              AND o.usuario_id = auth.uid()
        )
    );

CREATE POLICY area_update_policy ON area
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM item_orcamento io
            JOIN orcamento o ON o.id = io.orcamento_id
            WHERE io.id = area.item_orcamento_id
              AND o.usuario_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM item_orcamento io
            JOIN orcamento o ON o.id = io.orcamento_id
            WHERE io.id = item_orcamento_id
              AND o.usuario_id = auth.uid()
        )
    );

CREATE POLICY area_delete_policy ON area
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM item_orcamento io
            JOIN orcamento o ON o.id = io.orcamento_id
            WHERE io.id = area.item_orcamento_id
              AND o.usuario_id = auth.uid()
        )
    );
```

---

## 10. Proteção de Associações entre Entidades (Anti-Cross-Tenant)

Um dos pontos mais críticos de segurança em sistemas multi-tenant relacionais é impedir a **associação cruzada** (quando um atacante autenticado tenta associar uma entidade legítima sua a uma chave estrangeira de outro usuário).

A proposta cobre exaustivamente esses vetores:

1. **Tentativa: Usuário A cria orçamento apontando para `cliente_id` do Usuário B:**
   - *Bloqueio:* A policy `orcamento_insert_policy` exige `EXISTS (SELECT 1 FROM cliente c WHERE c.id = cliente_id AND c.usuario_id = auth.uid())`. A inserção é abortada com erro de RLS.
2. **Tentativa: Usuário A insere item de orçamento usando `servico_id` do Usuário B:**
   - *Bloqueio:* A policy `item_orcamento_insert_policy` valida que se `servico_id IS NOT NULL`, deve existir registro correspondente em `servico` onde `usuario_id = auth.uid()`. Como o serviço pertence a B, a query interna retorna falso e a operação é rejeitada.
3. **Tentativa: Usuário A insere item de orçamento usando `produto_id` do Usuário B:**
   - *Bloqueio:* A policy `item_orcamento_insert_policy` valida analogamente que `produto_id` deve pertencer a `auth.uid()`. Rejeição garantida.
4. **Tentativa: Usuário A insere item apontando para `orcamento_id` do Usuário B:**
   - *Bloqueio:* A cláusula `EXISTS (SELECT 1 FROM orcamento o WHERE o.id = orcamento_id AND o.usuario_id = auth.uid())` falha imediatamente.
5. **Tentativa: Usuário A insere área apontando para `item_orcamento_id` do Usuário B:**
   - *Bloqueio:* A cadeia `area` → `item_orcamento` → `orcamento` exige que a raiz pertença a `auth.uid()`. Rejeição garantida.
6. **Tentativa: Usuário A atualiza um registro seu transferindo-o para B (`usuario_id = <id_de_B>`):**
   - *Bloqueio:* As cláusulas `WITH CHECK (auth.uid() = usuario_id)` nas policies de `UPDATE` impedem que o registro pós-atualização assuma um `usuario_id` diferente do token ativo.

---

## 11. Preservação Histórica

1. **Desativação Lógica vs. Exclusão Física:**
   - Clientes, Serviços e Produtos possuem a flag `ativo BOOLEAN NOT NULL DEFAULT TRUE`.
   - O aplicativo priorizará a desativação (`ativo = FALSE`).
   - O RLS permite a atualização dessa flag exclusivamente pelo proprietário.
2. **Proteção de Integridade por Foreign Keys (`RESTRICT`):**
   - A exclusão física de um `servico` ou `produto` vinculado a itens de orçamentos históricos é terminantemente barrada pela constraint `ON DELETE RESTRICT` no banco, independentemente de permissões RLS.
   - A exclusão de um `orcamento` que possua `item_orcamento` associado é barrada pela constraint `item_orcamento_orcamento_id_fkey` com `ON DELETE RESTRICT`.
3. **Imutabilidade de Orçamentos Fora de RASCUNHO:**
   - A máquina de estados do orçamento (RN64, RN65) determina que propostas enviadas, em análise, aprovadas, concluídas ou recusadas não podem sofrer alteração direta, devendo ser duplicadas para novas revisões.
   - A validação dessa transição ocorre no domínio (`src/domain/entities/orcamento.ts`) e pode ser complementada por triggers ou RLS específico caso seja deliberado na homologação.

---

## 12. Segurança do Aplicativo Android

A segurança do aplicativo React Native / Expo adota a defesa em profundidade:

```text
+-------------------------------------------------------------+
|                     APLICATIVO ANDROID                      |
|  - Interface (React Native / Expo Router)                  |
|  - Validação de entrada na UI                              |
|  - Armazenamento de JWT em Expo SecureStore                |
|  - NUNCA armazena nem conhece service_role                  |
+-------------------------------------------------------------+
                              |
                     HTTPS (Bearer JWT)
                              |
                              v
+-------------------------------------------------------------+
|                     SUPABASE GATEWAY                        |
|  - Validação de assinatura criptográfica do JWT             |
|  - Extração do claim sub -> auth.uid()                      |
|  - Rejeição de tokens expirados / adulterados               |
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
|                    POSTGRESQL + POSTGIS                     |
|  - Row Level Security (RLS) intransponível                  |
|  - Integridade referencial (FK RESTRICT / CASCADE)          |
|  - CHECK Constraints de validação matemática e espacial     |
+-------------------------------------------------------------+
```

### Divisão de Responsabilidades

- **Aplicativo (Presentation / UI):** Prover feedback visual amigável ao jardineiro, guiar os fluxos e nunca expor chaves secretas.
- **Domínio (Domain):** Encapsular as regras de negócio puras (cálculos de subtotal/desconto/área, invariantes e máquina de estados) de forma desacoplada de fornecedores.
- **Application Services:** Orquestrar o fluxo de autenticação, persistência e leitura de dados.
- **Supabase Auth:** Gerenciar credenciais de login, hashes, emissão de JWTs e expiração de sessões.
- **PostgreSQL / RLS:** Garantir que nenhuma linha seja acessada ou modificada por quem não possui a titularidade, mesmo contra requisições maliciosas forjadas diretamente na API REST do Supabase.

---

## 13. Configuração Local de Auth

No arquivo `supabase/config.toml`, as diretrizes vigentes e propostas para o ambiente local são:

- `[auth]`:
  - `enabled = true`
  - `jwt_expiry = 3600` (1 hora)
  - `enable_signup = true`
  - `enable_anonymous_sign_ins = false` (bloqueio de acessos anônimos não identificados)
  - `minimum_password_length = 6`
- `[auth.email]`:
  - `enable_signup = true`
  - `enable_confirmations = false` (recomendado para agilidade em testes automatizados locais; em staging/produção deve ser habilitado como `true`).
- `[local_smtp]`:
  - `enabled = true`
  - `port = 54324` (Mailpit web client disponível em `http://127.0.0.1:54324` para verificação de emails disparados pelo Auth local sem envio externo real).

*Nota: Nenhuma alteração manual em `config.toml` foi efetuada nesta etapa.*

---

## 14. Estratégia de Testes de RLS

Para comprovar formalmente a blindagem do RLS antes do lançamento, a futura suíte de testes de segurança utilizará dois usuários distintos criados no Supabase Auth local:

- **Usuário A (`usr_alpha`):** `email: alpha@teste.com`
- **Usuário B (`usr_bravo`):** `email: bravo@teste.com`

### Simulação de Contexto no PostgreSQL

No PostgreSQL, requisições do Supabase autenticadas executam com o role `authenticated` e com a claim do JWT injetada na sessão da transação. Os testes dinâmicos de RLS reproduzirão essa mecânica:

```sql
-- SQL CONCEITUAL DE TESTE — NÃO EXECUTAR
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub": "<UUID_USUARIO_A>", "role": "authenticated"}';

-- Execução de queries sob a identidade do Usuário A
SELECT * FROM cliente; -- Deve retornar somente clientes do Usuário A

ROLLBACK;
```

---

## 15. Cenários de Isolamento entre Usuários

A suíte conceitual de testes de RLS validará a seguinte matriz de cenários:

### 15.1. Cenários Permitidos (Positivos)
1. Usuário A autenticado consulta seus próprios clientes, serviços, produtos e orçamentos.
2. Usuário A consulta itens de orçamento e áreas pertencentes a seus orçamentos.
3. Usuário A cria um novo orçamento associando um cliente seu e itens de seu próprio catálogo.
4. Usuário A cadastra uma área delimitada em um item de serviço medido de seu orçamento.
5. Usuário A atualiza o endereço de seu cliente.

### 15.2. Cenários Proibidos (Negativos — Bloqueio RLS)
1. **Leitura Cruzada:** Usuário A tenta executar `SELECT * FROM cliente WHERE id = <id_cliente_B>`.
   - *Resultado esperado:* Retorna vazio (0 linhas).
2. **Modificação Cruzada:** Usuário A tenta executar `UPDATE servico SET nome = 'Hacked' WHERE id = <id_servico_B>`.
   - *Resultado esperado:* 0 linhas afetadas / erro de RLS.
3. **Exclusão Cruzada:** Usuário A tenta executar `DELETE FROM orcamento WHERE id = <id_orcamento_B>`.
   - *Resultado esperado:* 0 linhas afetadas / erro de RLS.
4. **Associação Cruzada de Cliente:** Usuário A tenta criar orçamento informando `cliente_id` pertencente ao Usuário B.
   - *Resultado esperado:* Erro de violação da policy `orcamento_insert_policy`.
5. **Associação Cruzada de Catálogo:** Usuário A tenta criar item de orçamento informando `servico_id` do Usuário B.
   - *Resultado esperado:* Erro de violação da policy `item_orcamento_insert_policy`.
6. **Injeção em Orçamento Alheio:** Usuário A tenta inserir `item_orcamento` com `orcamento_id` pertencente a B.
   - *Resultado esperado:* Erro de violação da policy `item_orcamento_insert_policy`.
7. **Injeção de Área Alheia:** Usuário A tenta cadastrar `area` apontando para `item_orcamento_id` de B.
   - *Resultado esperado:* Erro de violação da policy `area_insert_policy`.
8. **Requisição Anônima:** Requisição com role `anon` tenta ler ou gravar em qualquer tabela de negócio.
   - *Resultado esperado:* Bloqueio total (0 linhas ou erro de permissão).

---

## 16. Considerações de Performance

1. **Subqueries em Cadeia:**
   - As policies de `item_orcamento` e `area` dependem de subqueries com `EXISTS (...)`.
   - *Impacto e Mitigação:* A migration `20260916020500_modelo_fisico_v1_1.sql` já criou todos os índices B-Tree necessários:
     - `idx_orcamento_usuario_id` em `orcamento(usuario_id)`
     - `idx_item_orcamento_orcamento_id` em `item_orcamento(orcamento_id)`
     - `idx_area_item_orcamento_id` em `area(item_orcamento_id)`
     - `idx_cliente_usuario_id` em `cliente(usuario_id)`
   - O PostgreSQL utiliza index lookups rápidos (custo logarítmico), garantindo que as avaliações de RLS não gerem sequential scans.
2. **Consultas com Joins Complexos:**
   - Quando o aplicativo consulta um orçamento com seus itens e áreas via PostgREST (`supabase.from('orcamento').select('*, item_orcamento(*, area(*))')`), o PostgREST converte em um único plano de execução respeitando as policies de cada tabela envolvida.
   - Hipótese futura para monitoramento: Caso o número de áreas por orçamento se torne massivo, funções SQL `SECURITY DEFINER` estáveis poderão ser avaliadas para memorizar o proprietário da transação, se estritamente justificável.

---

## 17. Riscos e Decisões Pendentes

1. **Risco de Dessincronização entre Auth e Perfil:**
   - *Mitigação Proposta:* Implementação da trigger automática no banco (Opção 2 do item 3.1) combinada com fallback defensivo no login da aplicação.
2. **Imutabilidade de Orçamentos Históricos:**
   - *Mitigação Proposta:* Definir se o bloqueio de edição em orçamentos fora de `RASCUNHO` será restrito ao Domínio TypeScript da aplicação ou se será reforçado por uma constraint/trigger de banco.
3. **Estratégia de Exclusão de Conta:**
   - Definir formalmente se o encerramento de conta do profissional de jardinagem resultará em `ativo = false` ou se permitirá deleção em cascata controlada.

---

## 18. Proposta Final para Homologação

A arquitetura proposta atende a 100% dos requisitos de negócio, consistência e segurança estipulados nos artefatos homologados. O isolamento de dados é absoluto, a integridade referencial do Modelo Físico v1.1 é rigorosamente preservada e o cliente Android opera sob o princípio de menor privilégio.

---

## Decisões para Homologação

Apresentam-se a seguir as 14 decisões fundamentais da estratégia, prontas para deliberação da equipe e do usuário:

| # | Decisão | Proposta Técnica | Justificativa | Impacto no Projeto | Dependências | Status |
|---|---|---|---|---|---|---|
| **1** | **Método de Autenticação** | Utilizar `Email + Senha` na versão inicial. | Simples, seguro, nativo no Supabase, testável localmente via Mailpit sem custos de SMS/OAuth. | Simplifica o frontend e elimina dependências externas no lançamento. | Supabase Auth local | **PENDENTE DE HOMOLOGAÇÃO** |
| **2** | **Criação de `USUARIO`** | Trigger automática `AFTER INSERT ON auth.users` (com metadados `nome` e `telefone`) + fallback no Application Service. | Garante atomicidade transacional e evita perfis órfãos se a rede falhar após o cadastro. | Requer criação de função/trigger em futura migration dedicada a Auth/RLS. | Supabase Auth | **PENDENTE DE HOMOLOGAÇÃO** |
| **3** | **Vínculo `auth.uid()` ↔ `usuario.id`** | Correspondência exata e estrita `usuario.id = auth.uid()`. | Exigência consolidada no Modelo Físico v1.1; elimina duplicação de identidades. | `usuario.id` não possui default aleatório, recebe o UUID do Auth. | Modelo Físico v1.1 | **PENDENTE DE HOMOLOGAÇÃO** |
| **4** | **Política Desautenticada** | Bloqueio total (`auth.uid() IS NULL` nega acesso a todas as tabelas de negócio). | Evita vazamento de dados de clientes e orçamentos para requisições anônimas. | Segurança por padrão (default deny). | RLS ativado | **PENDENTE DE HOMOLOGAÇÃO** |
| **5** | **Política SELECT** | Exclusivamente o proprietário lê seus dados (direto ou por cadeia). | Isolamento absoluto entre diferentes jardineiros/empresas. | Usuário A não enxerga dados de B em listagens ou buscas. | Índices existentes | **PENDENTE DE HOMOLOGAÇÃO** |
| **6** | **Política INSERT** | Validação estrita via `WITH CHECK` exigindo titularidade do autor e de todas as entidades relacionadas. | Impede injeção de dados em contas alheias e associações cruzadas. | Requisições com chaves forjadas falham no banco de dados. | RLS | **PENDENTE DE HOMOLOGAÇÃO** |
| **7** | **Política UPDATE** | Validação dupla (`USING` para registro original e `WITH CHECK` para novos dados, impedindo troca de dono). | Impede apropriação indevida ou transferência de registros entre usuários. | Registros permanecem vinculados ao criador original por todo o ciclo de vida. | RLS | **PENDENTE DE HOMOLOGAÇÃO** |
| **8** | **Política DELETE** | Permitida apenas para o proprietário, condicionada às restrições de integridade (`RESTRICT`). | Respeita a propriedade do dado sem violar a preservação do histórico de orçamentos. | Tentativa de deletar serviço ou cliente usado em orçamento é rejeitada pelo SGBD. | FKs RESTRICT | **PENDENTE DE HOMOLOGAÇÃO** |
| **9** | **Proteção por Cadeia** | RLS navega a árvore relacional (`area` → `item` → `orcamento` → `usuario`; `endereco` → `cliente` → `usuario`) sem desnormalizar. | Preserva o DER v1.1 e Modelo Físico v1.1 sem adicionar `usuario_id` redundante. | Consultas utilizam os índices relacionais existentes sem sobrecarga. | Índices v1.1 | **PENDENTE DE HOMOLOGAÇÃO** |
| **10** | **Anti-Cross-Tenant** | Checagem no `WITH CHECK` de `orcamento` (valida `cliente_id`) e `item_orcamento` (valida `servico_id` e `produto_id`). | Impede o Usuário A de orçar serviços/produtos pertencentes a B ou atender clientes de B. | Blindagem completa das relações 1:N entre agregados de negócio. | RLS Subqueries | **PENDENTE DE HOMOLOGAÇÃO** |
| **11** | **Estratégia de Testes** | Testes de integração automatizados simulando Usuário A e B com `SET LOCAL "request.jwt.claims"`. | Prova matemática e reproduzível do isolamento em banco real antes do deploy. | Garante cobertura de segurança automatizada na pipeline de testes. | PostgreSQL local | **PENDENTE DE HOMOLOGAÇÃO** |
| **12** | **Necessidade de Triggers** | Criar 1 trigger para bootstrap do perfil `USUARIO` na futura migration de Auth/RLS. | Reduz código boilerplate no cliente móvel e garante criação atômica. | Requer definição de migration complementar quando for aprovada a implementação. | Futura migration | **PENDENTE DE HOMOLOGAÇÃO** |
| **13** | **Ajustes em `config.toml`** | Manter `enable_confirmations = false` no ambiente local e ativar `true` em produção. | Otimiza a velocidade de desenvolvimento e testes no Docker sem abdicar de segurança em prod. | Não afeta o código da aplicação móvel. | Supabase CLI | **PENDENTE DE HOMOLOGAÇÃO** |
| **14** | **Futura Migration** | Criar migration dedicada (ex.: `20260918000000_auth_rls.sql`) apenas após homologação deste documento. | Mantém o histórico limpo e a migration `20260916020500_modelo_fisico_v1_1.sql` imutável. | Consistência plena com as regras de versionamento do projeto. | Aprovação formal | **PENDENTE DE HOMOLOGAÇÃO** |

---
