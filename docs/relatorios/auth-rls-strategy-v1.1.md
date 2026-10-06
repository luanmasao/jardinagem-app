# Estratégia de Supabase Auth + RLS v1.1

**Documento de Análise e Proposta Técnica — REVISÃO CONTROLADA**  
**Status:** PENDENTE DE HOMOLOGAÇÃO  
**Data:** 2026-09-18  
**Versão Anterior (Preservada):** `docs/relatorios/auth-rls-strategy-v1.0.md`  
**Autor:** Equipe de Arquitetura e Engenharia de Software  

---

## 1. Objetivo

Este documento apresenta a **revisão controlada (v1.1)** da estratégia técnica de autenticação (**Supabase Auth**) e autorização/isolamento multi-tenant (**PostgreSQL Row Level Security — RLS**) para o Sistema de Orçamentos para Jardinagem.

Esta versão aprimora a proposta v1.0 incorporando o detalhamento operacional de 6 pontos críticos:
1. Contrato explícito de metadados de cadastro;
2. Papel formal da trigger transacional como caminho primário e do fallback como mecanismo de recuperação de falhas;
3. Matriz operacional de RLS especificando cláusulas `USING`, `WITH CHECK` e comportamento por role;
4. Separação explícita entre os roles `anon` e `authenticated` sob a política de *default deny*;
5. Diferenciação formal dos fluxos de confirmação de email entre desenvolvimento local e produção, orientando o ciclo de vida de sessão no aplicativo;
6. Delimitação estrita entre Autorização (RLS), Integridade Referencial (FKs/Constraints) e Regras de Negócio (Domain/Application).

> [!IMPORTANT]
> **Etapa de Análise e Documentação:** Nenhuma alteração estrutural, migration, trigger, policy ou código de produção é implementado nesta etapa. Os blocos de SQL apresentados constituem exclusivamente **"SQL PROPOSTO — NÃO EXECUTAR"**.

---

## 2. Premissas

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

## 3. Fontes Consideradas

- **Regras de Negócio vigentes:** RN v3 (com foco em RN01–RN05, RN12, RN18, RN23, RN28–RN31, RN58–RN71);
- **Requisitos vigentes:** RF v2 e RNF v2;
- **Diagramas UML:** Classes v3.1 (`docs/uml/classes.puml`) e DER v1.1 (`docs/uml/der.puml`);
- **Arquitetura Técnica:** Arquitetura Técnica v1.1 (`.agents/rules/architecture.md`);
- **Modelo Físico:** Modelo Físico v1.1 (`docs/modelo-fisico-v1.1.md`);
- **Migration Homologada:** `supabase/migrations/20260916020500_modelo_fisico_v1_1.sql`;
- **Documentação Oficial Supabase:** Supabase Auth Engine, PostgreSQL RLS (`USING` vs `WITH CHECK`), User Management, Local Development CLI e Auth Triggers.

---

## 4. Supabase Auth

### 4.1. Método de Autenticação Homologado para v1.0
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

## 5. Contrato de Cadastro

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

### 5.1. Especificação dos Campos

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

## 6. Relação Auth → USUARIO

O vínculo fundamental do sistema é:

$$\text{auth.uid()} \equiv \text{public.usuario.id}$$

- `public.usuario` não é uma entidade autônoma nem duplicada;
- Cada conta no Auth possui no máximo um registro de perfil em `public.usuario`;
- A chave primária `usuario.id` é o próprio identificador da identidade autenticada;
- Não há campos de login, senha ou controle de sessão em `public.usuario`.

---

## 7. Criação de USUARIO

A criação do perfil de negócio ocorre de forma coordenada entre o mecanismo de eventos do banco e a aplicação móvel.

---

## 8. Trigger como Caminho Principal e Fallback de Recuperação

Para conciliar a necessidade de atomicidade transacional com a resiliência operacional contra falhas transitórias de rede, define-se a estratégia de dois níveis:

### 8.1. Caminho Principal: Trigger Transacional no Banco

A criação padrão do registro `public.usuario` ocorrerá de forma atômica via trigger no schema `auth`:

- **Evento:** `AFTER INSERT ON auth.users`
- **Função:** `handle_new_user()` executada com privilégios `SECURITY DEFINER`.
- **Funcionamento:**
  1. A função intercepta a criação da linha em `auth.users`;
  2. Extrai `NEW.id`, `NEW.raw_user_meta_data->>'nome'` e `NEW.raw_user_meta_data->>'telefone'`;
  3. Valida se `nome` é válido (não nulo e não em branco);
  4. Executa o `INSERT INTO public.usuario (id, nome, telefone) VALUES (...)`;
  5. Se a inserção falhar (ex.: nome ausente), a transação inteira do `signUp` é revertida pelo PostgreSQL, impedindo que o Auth retenha um usuário inválido.

> [!NOTE]
> **SQL PROPOSTO — NÃO EXECUTAR (Ilustração técnica para homologação)**
> ```sql
> -- SQL PROPOSTO — NÃO EXECUTAR
> CREATE OR REPLACE FUNCTION public.handle_new_user()
> RETURNS trigger AS $$
> BEGIN
>   IF NEW.raw_user_meta_data->>'nome' IS NULL OR trim(NEW.raw_user_meta_data->>'nome') = '' THEN
>     RAISE EXCEPTION 'Nome do usuário é obrigatório para criação do perfil.';
>   END IF;
> 
>   INSERT INTO public.usuario (id, nome, telefone)
>   VALUES (
>     NEW.id,
>     trim(NEW.raw_user_meta_data->>'nome'),
>     nullif(trim(NEW.raw_user_meta_data->>'telefone'), '')
>   );
>   RETURN NEW;
> END;
> $$ LANGUAGE plpgsql SECURITY DEFINER;
> 
> CREATE TRIGGER on_auth_user_created
>   AFTER INSERT ON auth.users
>   FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
> ```

### 8.2. Fallback: Mecanismo de Recuperação no Application Service

O fallback **não é** um fluxo alternativo cotidiano de cadastro, mas um procedimento defensivo de recuperação contra edge cases (por exemplo: usuários criados via console administrativo do Supabase sem metadados, migrações legadas ou falhas transitórias extraordinárias).

- **Como funciona o Fallback:**
  1. Ao autenticar com sucesso (`signInWithPassword`), a camada de Application executa:
     `SELECT id, nome, ativo FROM public.usuario WHERE id = auth.uid()`
  2. **Caso o perfil exista:** O fluxo de navegação segue normalmente para a tela inicial.
  3. **Caso o perfil NÃO exista (0 linhas retornadas):**
     - O Expo Router intercepta o estado e redireciona o usuário para a tela `/concluir-perfil`;
     - A tela solicita o nome e telefone do profissional;
     - A camada de Application submete um `INSERT INTO public.usuario (id, nome, telefone) VALUES (auth.uid(), nome, telefone)`;
     - Esse `INSERT` é explicitamente permitido pela policy `usuario_insert_policy` (`WITH CHECK (auth.uid() = id)`).
4. **Prevenção de Duplicação e Concorrência:**
   - Como `usuario.id` é Chave Primária, qualquer tentativa de inserção concorrente é travada pelo SGBD com erro de unicidade (`ON CONFLICT (id) DO NOTHING`).
   - O fallback nunca pode criar um perfil com ID diferente de `auth.uid()`.

### 8.3. Riscos Mapeados da Abordagem por Trigger
- Se a função `handle_new_user()` contiver bugs ou referenciar tabelas bloqueadas, qualquer chamada de cadastro no Supabase Auth falhará globalmente.
- *Mitigação:* A trigger deve ser extremamente simples, focada apenas na extração e inserção dos dados obrigatórios, sem acoplamento com outras tabelas de negócio.

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
3. A negação padrão (*Default Deny*) é mandatória: se nenhuma política explicitamente conferir acesso a uma linha para o role ativo, o acesso é negado (retorna 0 linhas em `SELECT` ou erro de violação de RLS em `INSERT`/`UPDATE`/`DELETE`).

---

## 11. Roles `anon` e `authenticated`

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

### 11.1. Diretrizes dos Roles
- **Role `anon`:** Possui acesso zero às 8 tabelas de domínio. Nenhuma policy concederá privilégios para `anon`. Qualquer tentativa de consulta retornará vazio e qualquer tentativa de mutação resultará em erro.
- **Role `authenticated`:** Todas as policies das tabelas de negócio serão declaradas estritamente com `TO authenticated`.
- **Comportamento de `auth.uid()`:** Dentro das policies, `auth.uid()` é avaliado em tempo de execução extraindo o claim `sub` do JWT. Se `auth.uid()` for nulo, nenhuma condição de propriedade será satisfeita.

---

## 12. Matriz Operacional de Policies

A matriz operacional a seguir especifica cada operação nas 8 tabelas de domínio, discriminando formalmente o papel de `USING` e `WITH CHECK`.

### Definições Conceituais:
- **`USING`**: Expressão booleana aplicada às linhas já persistidas na tabela. Define quais linhas são visíveis para leitura (`SELECT`), quais linhas podem ser alteradas (`UPDATE`) e quais podem ser removidas (`DELETE`).
- **`WITH CHECK`**: Expressão booleana aplicada aos novos dados fornecidos. Define se uma nova linha pode ser gravada (`INSERT`) ou se o novo estado de uma linha após alteração continua obedecendo às regras de autorização (`UPDATE`).

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

## 13. Policies Diretas (SQL Proposto — Não Executar)

```sql
-- SQL PROPOSTO — NÃO EXECUTAR

-- 1. USUARIO
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

-- 2. CLIENTE
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

-- 3. SERVICO
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

-- 4. PRODUTO
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

-- 5. ORCAMENTO
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

## 14. Policies por Cadeia (SQL Proposto — Não Executar)

```sql
-- SQL PROPOSTO — NÃO EXECUTAR

-- 6. ENDERECO (via CLIENTE)
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

-- 7. ITEM_ORCAMENTO (via ORCAMENTO)
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

-- 8. AREA (via ITEM_ORCAMENTO -> ORCAMENTO)
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

## 15. Anti-Cross-Tenant

O sistema impede matematicamente que qualquer operação misture recursos pertencentes a diferentes contas através das seguintes validações em banco:

1. **`orcamento(cliente_id)`:** `orcamento_insert_policy` e `orcamento_update_policy` forçam que `cliente_id` seja de um cliente com `usuario_id = auth.uid()`.
2. **`item_orcamento(servico_id, produto_id)`:** `item_orcamento_insert_policy` e `item_orcamento_update_policy` forçam que o serviço e o produto referenciados pertençam ao `auth.uid()`.
3. **`item_orcamento(orcamento_id)`:** Força que o item pertença a um orçamento de `auth.uid()`.
4. **`area(item_orcamento_id)`:** Força que a área pertença a um item de orçamento que se conecta a um orçamento de `auth.uid()`.
5. **Tentativa de transferência de posse:** As cláusulas `WITH CHECK (auth.uid() = usuario_id)` em todas as tabelas com propriedade direta barram a tentativa de um usuário transferir um registro seu para o ID de outro usuário.

---

## 16. Autorização vs. Integridade Referencial

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

### 16.1. O que o RLS Faz e o que NÃO Faz:
- **O RLS autoriza:** Avalia se o usuário autenticado é o legítimo proprietário da linha antes de autorizar `SELECT`, `INSERT`, `UPDATE` ou `DELETE`.
- **O RLS NÃO substitui Chaves Estrangeiras:** O fato de o usuário A ser dono do orçamento não lhe dá o poder de apagá-lo caso ele possua itens. A foreign key `item_orcamento.orcamento_id -> orcamento.id` com `ON DELETE RESTRICT` rejeitará a exclusão com código de erro referencial (`23503`), preservando a integridade do banco.
- **O RLS NÃO substitui CHECK constraints:** O fato de o usuário ser dono do item não permite salvar valores negativos (`quantidade >= 0` e `valor_unitario >= 0` são mantidos pelas CHECK constraints).
- **O RLS NÃO substitui o Domínio:** Regras complexas como cálculo geodésico de áreas, snapshot de itens e transições da máquina de estados pertencem às entidades e serviços do Domínio TypeScript.

---

## 17. Confirmação de Email

O comportamento da autenticação difere deliberadamente entre o ambiente de testes/desenvolvimento e o ambiente de produção:

### 17.1. Ambiente de Desenvolvimento Local
- **Configuração:** `enable_confirmations = false` no `supabase/config.toml`.
- **Comportamento do `signUp`:**
  1. A chamada `supabase.auth.signUp({ email, password, options: { data: { nome } } })` cria o usuário em `auth.users` e grava imediatamente `email_confirmed_at = NOW()`;
  2. O Supabase Auth emite imediatamente a sessão ativa contendo os tokens JWT e Refresh Token;
  3. A aplicação móvel já recebe a sessão aberta, podendo navegar diretamente para a home do aplicativo;
  4. Agiliza a execução de testes automatizados locais.

### 17.2. Ambiente de Produção / Homologação
- **Configuração:** `enable_confirmations = true`.
- **Comportamento do `signUp`:**
  1. A chamada `supabase.auth.signUp(...)` cria o usuário em `auth.users` com `email_confirmed_at = NULL`;
  2. **A sessão NÃO é retornada imediatamente** (`session === null`);
  3. Um email com token/link de verificação é despachado para a caixa postal do usuário;
  4. A camada de Presentation **não pode assumir** que o cadastro gera login automático;
  5. O aplicativo deve exibir a tela informativa: *"Cadastro realizado! Enviamos um link de confirmação para o seu email. Confirme sua conta para efetuar o primeiro login."*;
  6. O usuário confirma o email e retorna ao aplicativo para executar `signInWithPassword()`.

---

## 18. Fluxo de Sessão no Aplicativo Móvel

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

## 19. Preservação Histórica

- **Clientes, Serviços e Produtos:** A estratégia padrão do aplicativo é a **desativação lógica** (`ativo = false`). O RLS permite a alteração exclusiva pelo proprietário.
- **Orçamentos:** Orçamentos que saíram de `RASCUNHO` são históricos e protegidos pelo Domínio. Caso sofram tentativa de exclusão física, as FKs com `ON DELETE RESTRICT` atuam impedindo a perda de dados.

---

## 20. Segurança do Android

- O aplicativo móvel é um cliente público e não confiável;
- Nenhuma chave privilegiada (`service_role`) fará parte do código-fonte ou dos bundles de compilação;
- A comunicação com o Supabase utiliza TLS/HTTPS estrito;
- Tokens de autenticação são gravados em armazenamento criptografado no dispositivo (`expo-secure-store`).

---

## 21. Estratégia de Testes

Os testes de RLS serão automatizados e executados contra a instância real do PostgreSQL local no Docker, validando o isolamento entre dois usuários criados no Supabase Auth:

- `USUARIO A` (`alpha@teste.com` — ID: `a0000000-0000-0000-0000-000000000001`)
- `USUARIO B` (`bravo@teste.com` — ID: `b0000000-0000-0000-0000-000000000002`)

### 21.1. Simulação Transacional de Sessão no PostgreSQL
```sql
-- SQL CONCEITUAL DE TESTE — NÃO EXECUTAR
BEGIN;
-- Simula requisição originada do Usuário A autenticado
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub": "a0000000-0000-0000-0000-000000000001", "role": "authenticated"}';

-- Teste de leitura legítima
SELECT count(*) FROM cliente; -- Deve retornar apenas registros de A

-- Teste de violação: tentar consultar cliente de B diretamente
SELECT count(*) FROM cliente WHERE usuario_id = 'b0000000-0000-0000-0000-000000000002'; -- Deve retornar 0

ROLLBACK;
```

---

## 22. Performance

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

## 23. Riscos

1. **Risco 1: Cadastro falhar no banco por falta de metadados obrigatórios no Auth.**
   - *Mitigação:* A camada de Presentation e Application valida a presença de `nome` antes de despachar a chamada `signUp()`.
2. **Risco 2: Falha transitória impedir criação do perfil via trigger.**
   - *Mitigação:* Mecanismo de fallback de recuperação no login redireciona para a tela de conclusão de perfil.
3. **Risco 3: Perda de integridade histórica por exclusão acidental.**
   - *Mitigação:* A restrição `ON DELETE RESTRICT` no banco de dados impede que orçamentos com itens ou catálogos vinculados sejam apagados fisicamente.

---

## 24. Decisões para Homologação

Apresentam-se as 14 decisões fundamentais da estratégia técnica, refinadas com os 6 pontos esclarecidos nesta revisão e mantidas estritamente com status **PENDENTE DE HOMOLOGAÇÃO**:

| # | Decisão Original | Refinamento Realizado na v1.1 | Motivo do Refinamento | Impacto no Projeto | Status |
|---|---|---|---|---|---|
| **1** | **Método de Autenticação** | Formalizado `Email + Senha`, documentando o fluxo de confirmação assíncrona (`enable_confirmations = true`) e a necessidade da UI tratar cadastros sem sessão imediata. | Ponto 5: Evitar premissa falsa na UI de que `signUp` sempre gera sessão instantânea em produção. | A UI exibirá aviso de confirmação de email antes de solicitar o primeiro login em produção. | **PENDENTE DE HOMOLOGAÇÃO** |
| **2** | **Criação de `USUARIO`** | Detalhado o contrato de metadados (`nome` obrigatório via `raw_user_meta_data`, `telefone` opcional) e definido o papel do fallback exclusivamente como mecanismo de recuperação de anomalias. | Pontos 1 e 2: Definir explicitamente o contrato e evitar criar um segundo fluxo concorrente equivalente. | Transacionalidade assegurada na trigger e tolerância a falhas garantida na aplicação. | **PENDENTE DE HOMOLOGAÇÃO** |
| **3** | **Vínculo `auth.uid()` ↔ `usuario.id`** | Mantido o vínculo estrito `usuario.id = auth.uid()`, detalhando que `usuario.id` é imutável via policy de UPDATE. | Pontos 1 e 3: Blindar contra alteração maliciosa da titularidade do perfil. | Imutabilidade garantida por RLS. | **PENDENTE DE HOMOLOGAÇÃO** |
| **4** | **Política Desautenticada e Roles** | Explicitada a separação dos roles `anon` e `authenticated`, cravando negação absoluta de acesso (*default deny*) para `anon` em todas as tabelas de negócio. | Ponto 4: Formalizar a arquitetura de papéis do Supabase Gateway e PostgreSQL. | Elimina risco de vazamento de dados para chamadas anônimas. | **PENDENTE DE HOMOLOGAÇÃO** |
| **5** | **Política SELECT** | Formalizada na Matriz Operacional com cláusula `USING` explícita por role `authenticated` (direta ou por cadeia). | Ponto 3: Especificação operacional detalhada. | Clientes, serviços, produtos e orçamentos de outros usuários são invisíveis. | **PENDENTE DE HOMOLOGAÇÃO** |
| **6** | **Política INSERT** | Formalizada na Matriz Operacional com cláusula `WITH CHECK` validando titularidade do autor e de todas as FKs associadas. | Pontos 3 e 10: Garantir autorização estrita e proteção anti-cross-tenant na criação. | Requisições com chaves adulteradas são rejeitadas pelo SGBD. | **PENDENTE DE HOMOLOGAÇÃO** |
| **7** | **Política UPDATE** | Formalizada com `USING` (valida registro prévio) e `WITH CHECK` (valida que o registro pós-modificação permanece sob a mesma titularidade). | Ponto 3: Evitar transferência indevida de dados entre contas. | Registros permanecem sob posse do mesmo autor. | **PENDENTE DE HOMOLOGAÇÃO** |
| **8** | **Política DELETE e Integridade** | Formalizada distinção estrita entre autorização RLS e integridade física de banco (`ON DELETE RESTRICT`). | Ponto 6: RLS não substitui integridade referencial nem regras de negócio. | Orçamentos com itens continuam impossibilitados de exclusão pelo banco. | **PENDENTE DE HOMOLOGAÇÃO** |
| **9** | **Proteção por Cadeia** | Formalizada a navegação relacional em `endereco`, `item_orcamento` e `area` respeitando o Modelo Físico v1.1 sem desnormalizar. | Ponto 3: Comprovar viabilidade operacional sem alterar tabelas congeladas. | Consultas utilizam índices já existentes. | **PENDENTE DE HOMOLOGAÇÃO** |
| **10** | **Anti-Cross-Tenant** | Especificadas as checagens relacionais em `orcamento` (`cliente_id`) e `item_orcamento` (`servico_id`, `produto_id`). | Ponto 3: Blindar contra roubo ou uso de entidades de outros profissionais. | Integridade relacional de catálogos e clientes assegurada. | **PENDENTE DE HOMOLOGAÇÃO** |
| **11** | **Estratégia de Testes** | Formalizada metodologia de testes com dois usuários (`USUARIO A` e `B`) via `SET LOCAL "request.jwt.claims"` e `SET LOCAL ROLE authenticated`. | Ponto 4: Testar exatamente no contexto real do gateway Supabase. | Testabilidade automatizada e reproduzível no ambiente local. | **PENDENTE DE HOMOLOGAÇÃO** |
| **12** | **Necessidade de Triggers** | Definida a criação de 1 trigger (`on_auth_user_created`) para o bootstrap atômico do perfil `USUARIO`, a ser criada na futura migration. | Ponto 2: Garantir que a criação ocorra dentro do ciclo de vida transacional do PostgreSQL. | Menos código no cliente e integridade no banco. | **PENDENTE DE HOMOLOGAÇÃO** |
| **13** | **Ajustes em `config.toml`** | Mantido `enable_confirmations = false` no ambiente local do Docker e planejado `enable_confirmations = true` para produção. | Ponto 5: Alinhar comportamento dos ambientes de desenvolvimento e produção. | Testes locais ágeis e produção segura. | **PENDENTE DE HOMOLOGAÇÃO** |
| **14** | **Futura Migration** | Confirmada a criação de migration dedicada de Auth/RLS (ex.: `20260918000000_auth_rls.sql`) apenas após homologação integral deste documento. | Consistência: Manter a migration `20260916020500_modelo_fisico_v1_1.sql` imutável. | Histórico de banco limpo e auditável. | **PENDENTE DE HOMOLOGAÇÃO** |

---

## 25. Conclusão

A **Estratégia de Supabase Auth + RLS v1.1** detalha com rigor operacional e arquitetural todos os aspectos de autenticação, ciclo de vida de sessão, controle de acesso e isolamento multi-tenant do aplicativo.

O documento consolida as decisões tomadas, preserva a versão v1.0 para fins de rastreabilidade histórica, atende aos 6 pontos de refinamento solicitados e estabelece os pré-requisitos formais para a futura implementação quando houver a homologação definitiva.
