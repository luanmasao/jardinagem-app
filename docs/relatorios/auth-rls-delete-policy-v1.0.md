# Análise e Proposta Técnica: Políticas de DELETE e Preservação de Histórico v1.0

**Revisão Técnica Pontual e Exclusiva do Ponto 4 da Estratégia de Supabase Auth + RLS**  
**Assunto:** Decidir e restringir operações de DELETE onde a regra de negócio determina desativação lógica, controle por estado ou preservação de integridade histórica.  
**Status:** PENDENTE DE HOMOLOGAÇÃO  
**Data:** 2026-09-20  
**Documento de Referência Estratégica:** `docs/relatorios/auth-rls-strategy-v1.5.md`  
**Autor:** Equipe de Arquitetura e Engenharia de Software  

---

## 1. Objetivo da Revisão

O presente documento realiza uma **revisão técnica pontual e EXCLUSIVA do Ponto 4** identificado no aprimoramento da Estratégia de Supabase Auth + RLS:

> *"Decidir/restringir DELETE onde a regra de negócio é desativação lógica."*

As decisões já homologadas no projeto — especificamente a **Decisão 4** (`ENABLE ROW LEVEL SECURITY` nas 8 tabelas e rejeição de `FORCE ROW LEVEL SECURITY`) e a **Decisão 12** (trigger nativa `on_auth_user_created`, função `private.handle_new_user()`, modificador `SECURITY DEFINER` sob o function owner `postgres`, `SET search_path = ''`, schema privado e menor privilégio) — **permanecem rigorosamente fechadas e inalteradas**.

O objetivo desta análise é avaliar detalhadamente o comportamento da operação SQL `DELETE` sobre as **8 tabelas de domínio do sistema**, verificando se as políticas de RLS e o modelo relacional propostos na estratégia v1.5 estão em estrita conformidade com:
1. **Regras de Negócio:** RN v3 (com foco em RN01–RN05, RN14, RN16, RN18, RN28–RN31, RN35, RN43–RN45, RN58–RN71);
2. **Requisitos de Sistema:** Requisitos Funcionais RF v2 e Requisitos Não Funcionais RNF v2;
3. **Modelo Físico:** Modelo Físico v1.1 (`docs/modelo-fisico-v1.1.md`);
4. **Diagramas UML:** DER v1.1 (`docs/uml/der.puml`), Classes v3.1 (`docs/uml/classes.puml`), Estados v3.1 (`docs/uml/estados.puml`) e Casos de Uso v3.1 (`docs/uml/casos_de_uso.puml`);
5. **Estratégia de Auth + RLS v1.5:** `docs/relatorios/auth-rls-strategy-v1.5.md`.

> [!IMPORTANT]
> **Etapa Exclusiva de Análise e Documentação Técnica:**  
> Nenhum código de produção, migration, trigger, função ou política RLS é implementado ou executado nesta etapa. O banco de dados PostgreSQL permanece intocado e o arquivo `supabase/migrations/20260916020500_modelo_fisico_v1_1.sql` permanece congelado.

---

## 2. Fontes Analisadas

A análise técnica apoia-se estritamente nas seguintes fontes oficiais homologadas e documentações primárias dos provedores:

### 2.1. Fontes Internas do Projeto
- **Modelo Físico v1.1 (`docs/modelo-fisico-v1.1.md`):** Seção 4 (`USUARIO`), Seção 5 (`CLIENTE`), Seção 6 (`ENDERECO`), Seção 7 (`SERVICO`), Seção 8 (`PRODUTO`), Seção 9 e 10 (`ORCAMENTO`), Seção 11 e 12 (`ITEM_ORCAMENTO`), Seção 13 e 14 (`AREA`), Seção 17 (*"Exclusão e preservação histórica"*), Seção 18 (*"Segurança e isolamento"*) e Seção 21 (*"Decisões consolidadas"*);
- **Migration Homologada (`supabase/migrations/20260916020500_modelo_fisico_v1_1.sql`):** Definições DDL das 8 tabelas, constraints de Chaves Primárias, Chaves Estrangeiras (`ON DELETE RESTRICT` vs `ON DELETE CASCADE`), CHECK constraints e tipos enumerados;
- **Diagramas UML Homologados:**
  - `docs/uml/der.puml`: Cardinalidades e estrutura de dependência relacional;
  - `docs/uml/classes.puml`: Atributos, operações e métodos de domínio;
  - `docs/uml/estados.puml`: Ciclo de vida de `ORCAMENTO` e imutabilidade de propostas formalizadas;
  - `docs/uml/casos_de_uso.puml`: Casos de uso autorizados pelo ator *Jardineiro*;
- **Regras de Negócio (RN v3):**
  - RN01 e RN02: Cadastro e ativação/desativação de `Usuario`;
  - RN03, RN04 e RN05: Cadastro, endereço opcional e ativação/desativação de `Cliente`;
  - RN14: Desativação lógica de `Servico`;
  - RN18: Desativação lógica de `Produto`;
  - RN28 a RN31: Snapshot histórico em `ItemOrcamento`;
  - RN35 e RN44: Remoção de item e remoção de área em orçamento editável;
  - RN61 a RN65: Máquina de estados, transições e imutabilidade de orçamentos fora de `RASCUNHO`;
  - RN71: Proibição de reabertura de orçamentos finalizados;
- **Estratégia de Supabase Auth + RLS v1.5 (`docs/relatorios/auth-rls-strategy-v1.5.md`):** Matriz de Policies RLS (Seção 13), Policies Propostas (Seções 14 e 15), Distinção entre RLS e Integridade (Seção 17) e Preservação Histórica (Seção 20);
- **Domínio TypeScript:** Entidades em `src/domain/entities/*.ts` e suíte de testes em `tests/domain/*.test.ts`.

### 2.2. Fontes Externas e Oficiais
- **PostgreSQL 15/16 Official Documentation:**
  - *Row Security Policies (`ddl-rowsecurity`):* Comportamento da cláusula `USING` em comandos `DELETE` (linhas que não satisfazem a expressão retornam 0 linhas afetadas, sem disparar erro de violação de RLS);
  - *Foreign Keys & Referential Actions (`ddl-constraints-fk`):* Semântica de `ON DELETE RESTRICT` (impede a remoção referenciada com código SQLSTATE `23503`) e `ON DELETE CASCADE` (propagação atômica da exclusão);
  - *Data Manipulation — DELETE:* Avaliação sequencial de policies RLS pré-DML e verificação de integridade referencial pós-DML;
- **Supabase Documentation:**
  - *Row Level Security Guides & Best Practices:* Recomendações de menor privilégio para comandos destrutivos (`DELETE`);
  - *Managing User Data & Auth Triggers:* Ciclo de vida de contas de usuário e desassociação entre `auth.users` e dados públicos.

---

## 3. Critérios Utilizados

Para evitar diagnósticos simplistas ou generalizações indevidas (como propor arbitrariamente "proibir DELETE em todas as tabelas" ou "permitir DELETE livre em tudo"), esta análise adota como fundamento metodológico a **tríplice separação de responsabilidades arquiteturais**:

```text
+-------------------------------------------------------------------------------------------------+
|                               TRÍPLICE CAMADA DE GOVERNANÇA                                     |
+-------------------------------------------------------------------------------------------------+
| 1. REGRA DE NEGÓCIO (Domínio / Aplicação)                                                       |
|    - Determina o ciclo de vida conceitual da entidade no mundo real;                            |
|    - Define se a entidade pode ser descartada, se deve ser desativada logicamente               |
|      (ativo = false) ou se seu encerramento ocorre por transição de estado (CANCELADO).         |
+-------------------------------------------------------------------------------------------------+
| 2. ROW LEVEL SECURITY - RLS (Banco de Dados / Camada de Acesso)                                 |
|    - Avalia a autorização por linha para a sessão ativa (TO authenticated USING (...));         |
|    - Determina se o usuário ativo é o legítimo proprietário da linha e se as pré-condições     |
|      de segurança/estado são satisfeitas antes de autorizar o comando DELETE.                   |
+-------------------------------------------------------------------------------------------------+
| 3. CONSTRAINTS DE CHAVE ESTRANGEIRA - FK (SGBD / Motor Relacional)                              |
|    - Garante a integridade referencial física e estrutural do banco de dados;                   |
|    - ON DELETE RESTRICT: Impede a exclusão se houver dependentes históricos;                    |
|    - ON DELETE CASCADE: Remove recursivamente entidades filhas que não existem autonomamente.   |
+-------------------------------------------------------------------------------------------------+
```

### 3.1. Distinção entre RLS e Chave Estrangeira
1. **O RLS autoriza:** Se uma policy de `DELETE` possui `USING (auth.uid() = usuario_id)`, o RLS simplesmente autoriza o usuário a tentar a exclusão das linhas que lhe pertencem. Se a condição falhar, nenhuma linha é afetada;
2. **A FK valida a integridade física:** Mesmo que o RLS autorize a operação, se a linha for referenciada por uma Chave Estrangeira com `ON DELETE RESTRICT`, o motor do PostgreSQL aborta a transação com erro `23503 (foreign_key_violation)`. A FK não autoriza; ela protege o grafo de dados;
3. **Não misturar conceitos:** Uma tabela não deve ter sua política RLS considerada "segura" apenas porque existe uma FK `RESTRICT` de retaguarda, nem deve ter o `DELETE` proibido sem justificativa se a regra de negócio admitir descarte legítimo.

### 3.2. Taxonomia de Comportamento para o DELETE
Cada uma das 8 tabelas será classificada em exatamente uma das seguintes categorias:
- **PERMITIDO:** A remoção física é compatível com o domínio, não possui dependências históricas órfãs e é a forma ordinária de remoção (autorizada por RLS ao proprietário);
- **CONDICIONADO AO ESTADO:** A remoção física é permitida **apenas** enquanto a entidade (ou seu agregador raiz) estiver em um estado transitório de elaboração (ex.: `RASCUNHO`), sendo terminantemente proibida após a consolidação formal;
- **SUBSTITUÍDO POR DESATIVAÇÃO LÓGICA:** A regra de negócio consagra o campo `ativo = false` como mecanismo oficial de exclusão do ciclo operacional para preservar rastreabilidade histórica e referências em orçamentos passados;
- **SUBSTITUÍDO POR TRANSIÇÃO DE ESTADO:** A regra de negócio proíbe o expurgo da entidade e prevê um estado de cancelamento ou finalização formal (ex.: `CANCELADO`, `RECUSADO`);
- **PROIBIDO VIA CLIENTE API:** A entidade não deve admitir `DELETE` direto disparado pela aplicação móvel (`authenticated`), devendo sua exclusão ser restrita a fluxos administrativos ou triggers de sistema.

---

## 4. Análise Individual das 8 Tabelas de Domínio

### 4.1. Tabela `usuario`

#### 1. Compatibilidade do DELETE Físico com Regras de Negócio
- A tabela `public.usuario` representa o **perfil de negócio** do jardineiro/empresa, associado biunivocamente à identidade autenticada no Supabase Auth (`auth.users.id = public.usuario.id`);
- O aplicativo móvel Android é uma ferramenta de trabalho do profissional. A remoção física direta da linha de perfil em `public.usuario` a partir do cliente móvel não corresponde a uma operação de negócio ordinária.

#### 2. Mecanismo de Desativação Lógica ou Histórico
- **Existe desativação lógica explícita:** O Modelo Físico v1.1 (Seção 4) e a migration homologada estabelecem a coluna `ativo BOOLEAN NOT NULL DEFAULT TRUE`;
- A entidade de domínio `Usuario` implementa os métodos explícitos `ativar()` e `desativar()` (RN01, RN02 e `src/domain/entities/usuario.ts:33-39`), validados em `tests/domain/usuario-cliente.test.ts`.

#### 3. Dados Históricos Dependentes
- Todas as entidades do sistema (`cliente`, `servico`, `produto`, `orcamento`) dependem diretamente de `usuario_id`.

#### 4. FKs e Comportamentos `ON DELETE`
- Todas as tabelas dependentes possuem restrição rígida contra a perda do usuário:
  - `cliente.usuario_id REFERENCES usuario(id) ON DELETE RESTRICT`
  - `servico.usuario_id REFERENCES usuario(id) ON DELETE RESTRICT`
  - `produto.usuario_id REFERENCES usuario(id) ON DELETE RESTRICT`
  - `orcamento.usuario_id REFERENCES usuario(id) ON DELETE RESTRICT`
- Se o usuário possuir qualquer cliente, serviço, produto ou orçamento cadastrado, qualquer instrução `DELETE FROM usuario WHERE id = ...` falhará imediatamente por violação de Chave Estrangeira (`RESTRICT`).

#### 5. Riscos de Quebra de Histórico e Integridade
- Se um usuário sem dados dependentes emitisse `DELETE FROM usuario WHERE id = auth.uid()` diretamente pela Data API:
  1. O registro de perfil em `public.usuario` seria excluído fisicamente;
  2. A conta de autenticação em `auth.users` **permaneceria viva e ativa** no Supabase Auth;
  3. Criar-se-ia um estado de descompasso arquitetural crítico: o usuário continuaria com credenciais válidas e JWT ativo, mas sem perfil de negócio, acionando anomalias na interface ou forçando a execução indevida do fallback (`/concluir-perfil`);
- A exclusão definitiva de uma conta (ex.: exigência da LGPD/GDPR ou encerramento de conta) é uma **operação de ciclo de vida de identidade**, que deve ser iniciada no Auth (`supabase.auth.admin.deleteUser()`) via rotina de infraestrutura/serviço administrativo com chave privilegiada ou RPC dedicada, e nunca por simples comando DML `DELETE` disparado pelo cliente móvel sobre a tabela de domínio.

#### 6. Classificação do DELETE
- **PROIBIDO VIA CLIENTE API / SUBSTITUÍDO POR DESATIVAÇÃO LÓGICA (`ativo = false`)**.

#### 7. Comportamento da Policy RLS Proposta
- Na estratégia v1.5 constava provisoriamente:
  `CREATE POLICY usuario_delete_policy ON public.usuario FOR DELETE TO authenticated USING (auth.uid() = id);`
- **Revisão Técnica:** Esta policy deve ser **SUPRIMIDA**. Não deve existir policy de `DELETE` para o papel `authenticated` sobre a tabela `usuario`. Sob o princípio do *Default Deny* (Negação Padrão) do RLS, qualquer tentativa de `DELETE` originada do aplicativo móvel será imediatamente bloqueada pelo PostgreSQL.
- Caso o profissional deseje suspender seu acesso, a operação permitida é o `UPDATE public.usuario SET ativo = false WHERE id = auth.uid()`.

#### 8. Diferenciação de Responsabilidades
- *Autorização RLS:* O papel `authenticated` não possui permissão de `DELETE` (0 políticas concedidas = bloqueio total);
- *Integridade FK:* `ON DELETE RESTRICT` em 4 tabelas filhas impede a criação de dados órfãos caso um superusuário tente a deleção;
- *Regra de Negócio:* RN01 e RN02 determinam que a suspensão de uso é governada por `ativo = false`.

---

### 4.2. Tabela `cliente`

#### 1. Compatibilidade do DELETE Físico com Regras de Negócio
- A tabela `public.cliente` armazena o cadastro dos clientes atendidos pelo profissional. O Modelo Físico v1.1 Seção 17 estabelece: *"Serviços, produtos e clientes possuem controle lógico por `ativo`. Quando existirem dependências históricas, a estratégia preferencial é a desativação, evitando a remoção física."*

#### 2. Mecanismo de Desativação Lógica ou Histórico
- **Existe desativação lógica explícita:** Coluna `ativo BOOLEAN NOT NULL DEFAULT TRUE` (Modelo Físico v1.1 Seção 5);
- A entidade de domínio `Cliente` implementa `ativar()` e `desativar()` (RN03, RN04 e `src/domain/entities/cliente.ts:49-55`).

#### 3. Dados Históricos Dependentes
- Orçamentos (`orcamento.cliente_id`), que representam propostas comerciais e contratos emitidos ao longo do tempo.

#### 4. FKs e Comportamentos `ON DELETE`
- `orcamento.cliente_id REFERENCES cliente(id) ON DELETE RESTRICT`: Se o cliente tiver qualquer orçamento associado (mesmo cancelado ou em rascunho), a exclusão física é **impossível** no banco de dados;
- `endereco.cliente_id REFERENCES cliente(id) ON DELETE CASCADE`: O endereço do cliente é uma extensão 1:0..1 dependente estrita. Se o cliente for excluído, seu endereço é removido em cascata.

#### 5. Riscos de Quebra de Histórico e Integridade
- Se um cliente com orçamentos pudesse ser excluído fisicamente, todo o histórico financeiro e de auditoria de orçamentos ficaria corrompido ou sem titularidade;
- Por outro lado, caso um cliente tenha sido cadastrado por engano e **não possua nenhum orçamento**, a remoção física não quebra histórico algum e seu endereço dependente é limpo pelo `CASCADE`.

#### 6. Classificação do DELETE
- **RESTRITO / SUBSTITUÍDO PREFERENCIALMENTE POR DESATIVAÇÃO LÓGICA (`ativo = false`)**:
  - *Com orçamentos associados:* DELETE físico **PROIBIDO / IMPOSSÍVEL** (bloqueado por FK `RESTRICT`, substituído por `ativo = false`);
  - *Sem orçamentos associados:* DELETE físico **TECNICAMENTE ADMISSÍVEL** (descarte de cadastro errôneo sem histórico).

#### 7. Comportamento da Policy RLS Proposta
- A policy de `DELETE` deve autorizar a operação somente ao proprietário (`auth.uid() = usuario_id`):
  ```sql
  CREATE POLICY cliente_delete_policy ON public.cliente
      FOR DELETE TO authenticated
      USING (auth.uid() = usuario_id);
  ```
- *Comportamento prático:*
  - Se o cliente possuir orçamentos: o PostgreSQL dispara o erro de integridade referencial `23503 (foreign_key_violation)`. A camada de aplicação/UI intercepta ou previne a chamada, orientando o usuário a utilizar a **desativação** (`desativar()`);
  - Se o cliente não possuir orçamentos: a linha é removida com sucesso e seu `endereco` é limpo pelo `ON DELETE CASCADE`.

#### 8. Diferenciação de Responsabilidades
- *Autorização RLS:* Garante que o usuário só possa solicitar exclusão de clientes do seu próprio catálogo (`auth.uid() = usuario_id`);
- *Integridade FK:* `ON DELETE RESTRICT` em `orcamento.cliente_id` protege a integridade do histórico comercial; `ON DELETE CASCADE` em `endereco.cliente_id` evita endereços órfãos;
- *Regra de Negócio:* RN03/RN04 e Modelo Físico Seção 17 consagram `ativo = false` como a operação padrão do ciclo de vida para clientes com histórico.

---

### 4.3. Tabela `endereco`

#### 1. Compatibilidade do DELETE Físico com Regras de Negócio
- A tabela `public.endereco` armazena o endereço físico associado a um cliente (relação `CLIENTE 1 : 0..1 ENDERECO`, Modelo Físico v1.1 Seção 6);
- O endereço é opcional (RN05). O domínio modela expressamente a capacidade do cliente ter ou não ter endereço, fornecendo o método `cliente.removerEndereco()` (`src/domain/entities/cliente.ts:64-66`), testado em `tests/domain/usuario-cliente.test.ts:53-54`.

#### 2. Mecanismo de Desativação Lógica ou Histórico
- **NÃO EXISTE desativação lógica:** `endereco` não possui campo `ativo`. O endereço é um dado descritivo do cliente. Quando o cliente muda de endereço ou remove suas informações de localização, o registro deixa de ter validade.

#### 3. Dados Históricos Dependentes
- **Nenhum.** Nenhuma outra tabela do sistema referencia `endereco.id`. Orçamentos e itens não apontam para `endereco_id`.

#### 4. FKs e Comportamentos `ON DELETE`
- `endereco.cliente_id REFERENCES cliente(id) ON DELETE CASCADE`.
- Não há tabelas apontando para `endereco`.

#### 5. Riscos de Quebra de Histórico e Integridade
- Nenhum risco. A remoção de um endereço não afeta orçamentos passados nem corrompe cálculos de serviços, visto que a medição espacial é de responsabilidade de `AREA` e não de `ENDERECO`.

#### 6. Classificação do DELETE
- **PERMITIDO**.

#### 7. Comportamento da Policy RLS Proposta
- Policy por cadeia via `cliente` com validação de titularidade do usuário autenticado:
  ```sql
  CREATE POLICY endereco_delete_policy ON public.endereco
      FOR DELETE TO authenticated
      USING (
          EXISTS (
              SELECT 1 FROM public.cliente c
              WHERE c.id = endereco.cliente_id AND c.usuario_id = auth.uid()
          )
      );
  ```

#### 8. Diferenciação de Responsabilidades
- *Autorização RLS:* Garante que apenas o dono do cliente associado possa deletar o endereço;
- *Integridade FK:* `ON DELETE CASCADE` garante que se o cliente for deletado, o endereço seja eliminado automaticamente;
- *Regra de Negócio:* RN05 e o método de domínio `removerEndereco()` validam o descarte voluntário do endereço.

---

### 4.4. Tabela `servico`

#### 1. Compatibilidade do DELETE Físico com Regras de Negócio
- A tabela `public.servico` representa o catálogo de serviços do profissional (ex.: "Poda de Árvores", "Corte de Grama");
- O Modelo Físico v1.1 Seção 7 explicita: *"Serviços utilizados por orçamentos históricos não devem ser removidos fisicamente quando isso comprometer o histórico."*

#### 2. Mecanismo de Desativação Lógica ou Histórico
- **Existe desativação lógica explícita:** Coluna `ativo BOOLEAN NOT NULL DEFAULT TRUE` (Modelo Físico v1.1 Seção 7 e RN14);
- A entidade de domínio `Servico` possui os métodos `ativar()` e `desativar()` (`src/domain/entities/servico.ts:56-61`), testados em `tests/domain/servico-produto.test.ts:20-24`.

#### 3. Dados Históricos Dependentes
- Itens de orçamento (`item_orcamento.servico_id`). Embora o item grave um snapshot de descrição e valor unitário (RN28, RN30), a integridade relacional mantém a chave estrangeira para o catálogo.

#### 4. FKs e Comportamentos `ON DELETE`
- `item_orcamento.servico_id REFERENCES servico(id) ON DELETE RESTRICT`.
- O banco de dados bloqueia terminantemente qualquer instrução de `DELETE` físico contra um serviço que já tenha sido referenciado em pelo menos um item de orçamento.

#### 5. Riscos de Quebra de Histórico e Integridade
- Se a remoção física fosse permitida de forma irrestrita, causaria falhas de integridade referencial ou perda do vínculo de catálogo em relatórios consolidados do profissional;
- Se o serviço foi cadastrado recentemente e **nunca foi utilizado em nenhum orçamento**, a exclusão física é inofensiva e remove itens de teste ou erros de digitação.

#### 6. Classificação do DELETE
- **RESTRITO / SUBSTITUÍDO PREFERENCIALMENTE POR DESATIVAÇÃO LÓGICA (`ativo = false`)**:
  - *Com itens de orçamento vinculados:* DELETE físico **PROIBIDO / IMPOSSÍVEL** (rejeitado por FK `RESTRICT`, substituído por `desativar()`);
  - *Sem itens vinculados:* DELETE físico **ADMISSÍVEL**.

#### 7. Comportamento da Policy RLS Proposta
- A policy de `DELETE` deve autorizar a operação exclusivamente ao proprietário do catálogo (`auth.uid() = usuario_id`):
  ```sql
  CREATE POLICY servico_delete_policy ON public.servico
      FOR DELETE TO authenticated
      USING (auth.uid() = usuario_id);
  ```
- *Comportamento prático:*
  - Serviços utilizados: O SGBD dispara `23503 (foreign_key_violation)`. A UI deve priorizar a ação de "Desativar serviço";
  - Serviços não utilizados: O DELETE é concluído normalmente.

#### 8. Diferenciação de Responsabilidades
- *Autorização RLS:* Garante isolamento estrito: um usuário jamais pode deletar serviços de outro (`auth.uid() = usuario_id`);
- *Integridade FK:* `ON DELETE RESTRICT` em `item_orcamento.servico_id` protege orçamentos históricos;
- *Regra de Negócio:* RN14 determina a desativação lógica como mecanismo padrão para retirar o serviço do fluxo de novos orçamentos.

---

### 4.5. Tabela `produto`

#### 1. Compatibilidade do DELETE Físico com Regras de Negócio
- A tabela `public.produto` representa o catálogo de produtos/materiais do profissional (ex.: "Grama Esmeralda", "Adubo NPK");
- O Modelo Físico v1.1 Seção 8 estabelece: *"Produtos utilizados por orçamentos históricos não devem ser removidos fisicamente quando isso comprometer o histórico."*

#### 2. Mecanismo de Desativação Lógica ou Histórico
- **Existe desativação lógica explícita:** Coluna `ativo BOOLEAN NOT NULL DEFAULT TRUE` (Modelo Físico v1.1 Seção 8 e RN18);
- A entidade de domínio `Produto` possui `ativar()` e `desativar()` (`src/domain/entities/produto.ts:49-55`), testados em `tests/domain/servico-produto.test.ts:68-70`.

#### 3. Dados Históricos Dependentes
- Itens de orçamento (`item_orcamento.produto_id`).

#### 4. FKs e Comportamentos `ON DELETE`
- `item_orcamento.produto_id REFERENCES produto(id) ON DELETE RESTRICT`.
- O SGBD proíbe a exclusão se houver qualquer item de orçamento associado.

#### 5. Riscos de Quebra de Histórico e Integridade
- Idêntico ao serviço: exclusão física quebraria referências em orçamentos anteriores se não houvesse a barreira da FK.

#### 6. Classificação do DELETE
- **RESTRITO / SUBSTITUÍDO PREFERENCIALMENTE POR DESATIVAÇÃO LÓGICA (`ativo = false`)**:
  - *Com itens vinculados:* DELETE físico **PROIBIDO / IMPOSSÍVEL** (rejeitado por FK `RESTRICT`);
  - *Sem itens vinculados:* DELETE físico **ADMISSÍVEL**.

#### 7. Comportamento da Policy RLS Proposta
- Policy de `DELETE` restrita à titularidade:
  ```sql
  CREATE POLICY produto_delete_policy ON public.produto
      FOR DELETE TO authenticated
      USING (auth.uid() = usuario_id);
  ```

#### 8. Diferenciação de Responsabilidades
- *Autorização RLS:* Garante titularidade do autor (`auth.uid() = usuario_id`);
- *Integridade FK:* `ON DELETE RESTRICT` em `item_orcamento.produto_id` impede deleções com impacto histórico;
- *Regra de Negócio:* RN18 prevê desativação lógica para ocultar o produto sem comprometer propostas passadas.

---

### 4.6. Tabela `orcamento`

#### 1. Compatibilidade do DELETE Físico com Regras de Negócio
- A tabela `public.orcamento` representa o coração do sistema: propostas comerciais emitidas a clientes;
- O ciclo de vida do orçamento é governado pela máquina de estados oficial (RN61, RN62, RN63, RN71, `docs/uml/estados.puml` e `src/domain/entities/orcamento.ts`):
  `RASCUNHO`, `ENVIADO`, `EM_ANALISE`, `APROVADO`, `RECUSADO`, `EXPIRADO`, `CANCELADO`, `CONCLUIDO`;
- **Invariante Fundamental (RN64 / RN65):** *"Orçamentos nos status ENVIADO, EM_ANALISE, APROVADO, RECUSADO, EXPIRADO, CANCELADO e CONCLUIDO não podem ser editados diretamente. Somente orçamentos em RASCUNHO são editáveis."*;
- Um orçamento que já foi formalizado e enviado ao cliente torna-se um **documento de valor histórico e comercial**. Apagá-lo fisicamente violaria a rastreabilidade comercial e a regra de integridade do ciclo de vida.

#### 2. Mecanismo de Desativação Lógica ou Histórico
- **Não utiliza campo `ativo`**, mas sim a **Máquina de Estados**:
  - Para descartar ou desistir de uma proposta já existente, a regra de negócio prevê expressamente a transição para o estado terminal **`CANCELADO`** (RN63, a partir de `RASCUNHO`, `ENVIADO` ou `EM_ANALISE`);
  - Orçamentos recusados pelo cliente vão para `RECUSADO`; orçamentos com prazo vencido vão para `EXPIRADO` (RN69). Todos permanecem no banco como histórico.

#### 3. Dados Históricos Dependentes
- Seus próprios `item_orcamento` e as medições de `area`.

#### 4. FKs e Comportamentos `ON DELETE`
- `item_orcamento.orcamento_id REFERENCES orcamento(id) ON DELETE RESTRICT`.
- **Atenção Estrutural Máxima:** A Chave Estrangeira de `item_orcamento` para `orcamento` possui comportamento **`ON DELETE RESTRICT`** e **não** `CASCADE` (conforme Modelo Físico v1.1 e migration homologada);
- Isso implica que o PostgreSQL **rejeita** qualquer tentativa de exclusão física direta de um orçamento enquanto ele possuir itens cadastrados.

#### 5. Riscos de Quebra de Histórico e Integridade
- Se um orçamento com status `ENVIADO`, `APROVADO` ou `CONCLUIDO` pudesse ser apagado via API:
  - Haveria destruição irrecuperável de histórico comercial, medições contratadas e propostas enviadas;
  - Haveria quebra de auditoria da numeração de orçamentos do usuário (`orcamento_usuario_id_numero_key`).

#### 6. Classificação do DELETE
- **CONDICIONADO AO ESTADO DA ENTIDADE (`status = 'RASCUNHO'`)**:
  - *Orçamentos fora de `RASCUNHO`:* DELETE físico **TERMINANTEMENTE PROIBIDO**. O encerramento ocorre exclusivamente por transição de estado (`CANCELADO`, `RECUSADO`, `EXPIRADO`, etc.);
  - *Orçamentos no status `RASCUNHO`:* DELETE físico **CONDICIONADO** (admissível para descartar rascunhos que nunca foram emitidos nem formalizados, desde que os itens sejam removidos previamente ou de forma coordenada pelo domínio, respeitando a FK `RESTRICT`).

#### 7. Comportamento da Policy RLS Proposta
- A policy de `DELETE` especificada na estratégia v1.5 continha apenas:
  `USING (auth.uid() = usuario_id);`
- Essa especificação continha uma brecha: permitia que o cliente móvel solicitasse o `DELETE` de orçamentos aprovados ou concluídos (desde que sem itens ou se a FK fosse burlada);
- **Aprimoramento Necessário no RLS:** A policy de DELETE deve incorporar explicitamente a regra de imutabilidade de estado do domínio:
  ```sql
  CREATE POLICY orcamento_delete_policy ON public.orcamento
      FOR DELETE TO authenticated
      USING (
          auth.uid() = usuario_id AND
          status = 'RASCUNHO'
      );
  ```
- *Efeito:* Se um usuário tentar deletar um orçamento que já foi `ENVIADO`, `APROVADO` ou `CANCELADO`, a cláusula `USING` é avaliada como `FALSE` e o PostgreSQL retorna imediatamente 0 linhas afetadas, bloqueando a destruição de histórico diretamente no motor de banco.

#### 8. Diferenciação de Responsabilidades
- *Autorização RLS:* Autoriza a deleção apenas de orçamentos próprios que estejam estritamente em estado de `RASCUNHO`;
- *Integridade FK:* `ON DELETE RESTRICT` em `item_orcamento.orcamento_id` impede que o orçamento seja apagado sem o tratamento de seus itens;
- *Regra de Negócio:* RN63, RN64 e RN71 determinam a imutabilidade de orçamentos formalizados e o uso de `CANCELADO` para descarte formal.

---

### 4.7. Tabela `item_orcamento`

#### 1. Compatibilidade do DELETE Físico com Regras de Negócio
- A tabela `public.item_orcamento` armazena os itens que compõem o orçamento, registrando um snapshot histórico independente do catálogo (RN28–RN31, Modelo Físico Seção 11);
- O caso de uso `UC_RemoverItem` (`docs/uml/casos_de_uso.puml`) e o método de domínio `orcamento.removerItem(itemId)` (RN35 e `src/domain/entities/orcamento.ts:142-150`) estabelecem formalmente que a remoção de um item de orçamento é uma operação legítima de negócio **enquanto o orçamento for editável (`RASCUNHO`)**.

#### 2. Mecanismo de Desativação Lógica ou Histórico
- **Não possui desativação lógica (`ativo`):** O item existe ou não existe dentro do orçamento;
- Após o orçamento sair de `RASCUNHO`, a lista de itens torna-se congelada e imutável (RN64).

#### 3. Dados Históricos Dependentes
- Instâncias de `area` associadas a itens de serviços medidos.

#### 4. FKs e Comportamentos `ON DELETE`
- `area.item_orcamento_id REFERENCES item_orcamento(id) ON DELETE CASCADE`: Quando um item de orçamento é removido, suas medições poligonais de área associadas são excluídas em cascata pelo SGBD;
- `item_orcamento.orcamento_id REFERENCES orcamento(id) ON DELETE RESTRICT`.

#### 5. Riscos de Quebra de Histórico e Integridade
- Se um item pudesse ser deletado de um orçamento `ENVIADO` ou `APROVADO`, o valor total contratado e o detalhamento dos serviços seriam corrompidos, violando o snapshot aprovado pelo cliente.

#### 6. Classificação do DELETE
- **CONDICIONADO AO ESTADO DO ORÇAMENTO PAI (`status = 'RASCUNHO'`)**:
  - *Orçamento pai fora de `RASCUNHO`:* DELETE físico **PROIBIDO**;
  - *Orçamento pai em `RASCUNHO`:* DELETE físico **PERMITIDO** (caso de uso ordinário de edição de proposta).

#### 7. Comportamento da Policy RLS Proposta
- Na estratégia v1.5, a policy de `DELETE` validava apenas o vínculo com o usuário:
  `USING (EXISTS (SELECT 1 FROM public.orcamento o WHERE o.id = item_orcamento.orcamento_id AND o.usuario_id = auth.uid()));`
- **Aprimoramento Necessário no RLS:** A policy de DELETE deve exigir que o orçamento proprietário esteja em `RASCUNHO`:
  ```sql
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
  ```

#### 8. Diferenciação de Responsabilidades
- *Autorização RLS:* Garante que itens só possam ser removidos de orçamentos próprios que estejam em `RASCUNHO`;
- *Integridade FK:* `ON DELETE CASCADE` em `area.item_orcamento_id` garante a limpeza física das áreas vinculadas;
- *Regra de Negócio:* RN35 e RN64 autorizam a remoção exclusivamente durante a fase de elaboração da proposta.

---

### 4.8. Tabela `area`

#### 1. Compatibilidade do DELETE Físico com Regras de Negócio
- A tabela `public.area` armazena as geometrias poligonais delimitadas no mapa via satélite e a respectiva `area_calculada` em m² para itens de serviço medido (RN40–RN46, Modelo Físico Seção 13);
- O caso de uso `UC_RemoverArea` (`docs/uml/casos_de_uso.puml`) e os métodos de domínio `item.removerArea(areaId)` e `orcamento.removerItem()` (RN44 e `src/domain/entities/item-orcamento.ts:224-234`) autorizam expressamente a exclusão de uma área delimitada durante a medição do serviço.

#### 2. Mecanismo de Desativação Lógica ou Histórico
- **Não possui desativação lógica (`ativo`):** Uma área representa um polígono físico desenhado sobre o terreno. Se o jardineiro redesenha ou descarta um canteiro, a área antiga é fisicamente removida.

#### 3. Dados Históricos Dependentes
- Nenhum. `area` é uma folha na árvore relacional do sistema.

#### 4. FKs e Comportamentos `ON DELETE`
- `area.item_orcamento_id REFERENCES item_orcamento(id) ON DELETE CASCADE`.
- Não há tabelas dependentes de `area`.

#### 5. Riscos de Quebra de Histórico e Integridade
- Se uma área pudesse ser excluída de um orçamento já enviado ou aprovado, o somatório de áreas (`quantidade = Σ area_calculada`) divergiria do snapshot registrado, corrompendo a consistência do orçamento histórico;
- Em `RASCUNHO`, a remoção da área dispara o recálculo imediato de `item.quantidade` e `orcamento.subtotal`, mantendo a integridade matemática da proposta.

#### 6. Classificação do DELETE
- **CONDICIONADO AO ESTADO DO ORÇAMENTO PAI (`status = 'RASCUNHO'`)**:
  - *Orçamento pai fora de `RASCUNHO`:* DELETE físico **PROIBIDO**;
  - *Orçamento pai em `RASCUNHO`:* DELETE físico **PERMITIDO** (operação ordinária de ajuste de desenho no mapa).

#### 7. Comportamento da Policy RLS Proposta
- Na estratégia v1.5, a policy de `DELETE` verificava a cadeia sem checar o status:
  `USING (EXISTS (SELECT 1 FROM public.item_orcamento io JOIN public.orcamento o ON o.id = io.orcamento_id WHERE io.id = area.item_orcamento_id AND o.usuario_id = auth.uid()));`
- **Aprimoramento Necessário no RLS:** A policy de DELETE deve validar que o orçamento raiz esteja em `RASCUNHO`:
  ```sql
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

#### 8. Diferenciação de Responsabilidades
- *Autorização RLS:* Garante que a área pertença ao usuário e que o orçamento raiz esteja em `RASCUNHO`;
- *Integridade FK:* `ON DELETE CASCADE` elimina a área quando seu item pai é deletado;
- *Regra de Negócio:* RN44 e RN64 governam o ciclo de medição e a imutabilidade pós-rascunho.

---

## 5. Matriz Final Comparativa

A matriz a seguir consolida a avaliação individual das 8 tabelas de domínio do projeto:

| Tabela | DELETE Físico | Desativação / Estado | Justificativa Técnica e de Negócio | Policy RLS Proposta (Cláusula `USING`) |
|---|---|---|---|---|
| **usuario** | **PROIBIDO** para o papel `authenticated` | Desativação Lógica (`ativo = false`, RN02) | Perfil atrelado à conta Supabase Auth. Exclusão direta pelo app geraria descompasso de identidade. Encerramento de conta é fluxo administrativo do Auth. Quatro FKs `RESTRICT` impedem deleção se houver dados. | **NENHUMA POLICY DE DELETE** (Default Deny pelo RLS). Suspensão via `UPDATE public.usuario SET ativo = false`. |
| **cliente** | **RESTRITO** (permitido apenas sem orçamentos) | Desativação Lógica (`ativo = false`, RN04) | Orçamentos históricos impedem DELETE físico via FK `RESTRICT`. Exclusão física legítima apenas para cadastros errôneos sem histórico. Se deletado, limpa `endereco` via `CASCADE`. | `USING (auth.uid() = usuario_id)` *(com integridade protegida pela FK `RESTRICT` de `orcamento`)*. |
| **endereco** | **PERMITIDO** | Não se aplica (não possui `ativo`) | Dependência 1:0..1 de `cliente`. Não possui histórico dependente. Domínio prevê explicitamente o descarte via `cliente.removerEndereco()` (RN05). | `USING (EXISTS (SELECT 1 FROM public.cliente c WHERE c.id = endereco.cliente_id AND c.usuario_id = auth.uid()))` |
| **servico** | **RESTRITO** (permitido apenas sem itens) | Desativação Lógica (`ativo = false`, RN14) | Preservação de integridade histórica de orçamentos emitidos. Itens de orçamento apontam com FK `RESTRICT`. Itens não utilizados podem ser descartados fisicamente. | `USING (auth.uid() = usuario_id)` *(com integridade protegida pela FK `RESTRICT` de `item_orcamento`)*. |
| **produto** | **RESTRITO** (permitido apenas sem itens) | Desativação Lógica (`ativo = false`, RN18) | Idêntico ao serviço. Integridade protegida por FK `RESTRICT` em `item_orcamento.produto_id`. Desativação lógica é o fluxo de negócio preferencial. | `USING (auth.uid() = usuario_id)` *(com integridade protegida pela FK `RESTRICT` de `item_orcamento`)*. |
| **orcamento** | **CONDICIONADO** (`status = 'RASCUNHO'`) | Máquina de Estados (`CANCELADO`, RN63) | Propostas formalizadas (`ENVIADO`, `APROVADO`, etc.) são imutáveis (RN64). Descarte formal é `CANCELADO`. Exclusão física admitida apenas na fase de elaboração (`RASCUNHO`). FK de itens é `RESTRICT`. | `USING (auth.uid() = usuario_id AND status = 'RASCUNHO')` |
| **item_orcamento** | **CONDICIONADO** (Orçamento pai em `RASCUNHO`) | Não se aplica (não possui `ativo`) | Casos de uso (`UC_RemoverItem`) e domínio (`removerItem()`, RN35) autorizam remoção durante elaboração. Em orçamentos emitidos, é imutável (RN64). Limpa áreas por `CASCADE`. | `USING (EXISTS (SELECT 1 FROM public.orcamento o WHERE o.id = item_orcamento.orcamento_id AND o.usuario_id = auth.uid() AND o.status = 'RASCUNHO'))` |
| **area** | **CONDICIONADO** (Orçamento pai em `RASCUNHO`) | Não se aplica (não possui `ativo`) | Casos de uso (`UC_RemoverArea`) e domínio (`removerArea()`, RN44) autorizam remoção de polígonos durante medição. Imutável após envio do orçamento. Cascata automática ao deletar item. | `USING (EXISTS (SELECT 1 FROM public.item_orcamento io JOIN public.orcamento o ON o.id = io.orcamento_id WHERE io.id = area.item_orcamento_id AND o.usuario_id = auth.uid() AND o.status = 'RASCUNHO'))` |

---

## 6. Impactos sobre Histórico e Integridade

A parametrização técnica recomendada produz impactos positivos e balanceados entre as três camadas do sistema:

### 6.1. Blindagem Contra Perda Acidental de Dados Históricos
1. **Orçamentos Emitidos Imutáveis:** Ao exigir `status = 'RASCUNHO'` na policy de DELETE de `orcamento`, `item_orcamento` e `area`, garante-se que qualquer requisição que tente deletar propostas enviadas, em análise, aprovadas ou concluídas seja sumariamente ignorada pelo PostgreSQL (0 linhas afetadas). Não há risco de um bug na interface móvel ou uma chamada forjada via API apagar o histórico de vendas;
2. **Preservação de Catálogos Passados:** Serviços e produtos utilizados em orçamentos anteriores permanecem travados no banco por Chave Estrangeira `ON DELETE RESTRICT`. A desativação lógica (`ativo = false`) cumpre seu papel de ocultar itens descontinuados no momento da criação de novos orçamentos sem quebrar os orçamentos antigos;
3. **Consistência do Perfil de Usuário:** Ao proibir DELETE direto em `usuario`, elimina-se o risco de criar "usuários zumbis" autenticados no Auth sem registro na tabela de domínio.

### 6.2. Eliminação de Restrições Excessivas e Artificiais
1. **Descarte de Rascunhos Incompletos:** Jardineiros frequentemente criam rascunhos de orçamentos para simulações rápidas. Permitir a exclusão física enquanto `status = 'RASCUNHO'` evita o acúmulo desnecessário de dados lixo descartados antes mesmo de qualquer comunicação com o cliente;
2. **Correção de Cadastros Sem Uso:** Um cliente, serviço ou produto recém-cadastrado com erros de digitação e sem histórico vinculado pode ser excluído fisicamente, despoluindo o banco sem necessidade de manter registros inativos inúteis;
3. **Limpeza Eficiente de Extensões Dependentes:** O uso consagrado de `ON DELETE CASCADE` para `endereco` (dependente de `cliente`) e `area` (dependente de `item_orcamento`) mantém o banco livre de registros órfãos sem exigir código complexo de faxina manual.

---

## 7. Conclusão

A presente revisão técnica demonstra que:
1. **Nem toda tabela de domínio deve ter o DELETE proibido:** A adoção indiscriminada de proibições gerais geraria complexidade acidental e violaria casos de uso legítimos já modelados em UML e nas RN v3 (como `UC_RemoverItem`, `UC_RemoverArea` e `cliente.removerEndereco()`);
2. **As 8 tabelas de domínio dividem-se em 3 categorias arquiteturais coerentes:**
   - **Entidades de Catálogo e Perfil (`usuario`, `cliente`, `servico`, `produto`):** Possuem desativação lógica por `ativo = false` como fluxo padrão de negócio. `usuario` tem DELETE proibido via API cliente. `cliente`, `servico` e `produto` possuem DELETE restrito às instâncias sem dependências históricas, sendo bloqueadas pelas FKs `RESTRICT`;
   - **Entidade de Processo Comercial (`orcamento`):** Possui governança por Máquina de Estados. Propostas formalizadas utilizam o estado `CANCELADO` e são protegidas contra DELETE físico. Apenas propostas em elaboração (`RASCUNHO`) admitem DELETE físico;
   - **Entidades Dependentes Estruturais (`endereco`, `item_orcamento`, `area`):** `endereco` admite DELETE físico para suportar a remoção legítima de dados residenciais; `item_orcamento` e `area` admitem DELETE físico condicionado estritamente ao estado `RASCUNHO` do orçamento agregador raiz;
3. **As policies RLS propostas na estratégia v1.5 são aprimoradas:** Ao acrescentar a verificação de `status = 'RASCUNHO'` em `orcamento`, `item_orcamento` e `area`, e ao suprimir a policy de DELETE em `usuario`, as políticas de segurança alinham-se perfeitamente com a invariante de imutabilidade da RN64 e com a arquitetura defensiva do projeto.

---

## 8. Decisões Propostas

Registram-se para deliberação e homologação futura as seguintes decisões pontuais:

- **Proposta D1:** Suprimir a policy `usuario_delete_policy` para o papel `authenticated`, estabelecendo *Default Deny* para DELETE físico na tabela `usuario`. Desativação de conta de usuário deve operar via `UPDATE public.usuario SET ativo = false`;
- **Proposta D2:** Manter as policies `cliente_delete_policy`, `servico_delete_policy` e `produto_delete_policy` baseadas na titularidade (`auth.uid() = usuario_id`), contando com o respaldo estrutural das Chaves Estrangeiras `ON DELETE RESTRICT` e a orientação na camada de UI/Application para o uso padrão da desativação lógica (`ativo = false`);
- **Proposta D3:** Manter a policy `endereco_delete_policy` permitida via cadeia relacional de cliente, em consonância com a regra de negócio de remoção de endereço;
- **Proposta D4:** Aprimorar a policy `orcamento_delete_policy` para restringir o DELETE exclusivamente a orçamentos em rascunho:
  `USING (auth.uid() = usuario_id AND status = 'RASCUNHO')`;
- **Proposta D5:** Aprimorar as policies `item_orcamento_delete_policy` e `area_delete_policy` para restringir o DELETE exclusivamente quando o orçamento pai estiver em rascunho:
  `USING (EXISTS (SELECT 1 FROM orcamento o WHERE ... AND o.status = 'RASCUNHO'))`.

---

## 9. Pontos que Dependem de Eventual Refinamento nas RN v3

> [!CAUTION]
> **Importante:** Nenhuma alteração nas Regras de Negócio (RN v3) é realizada nesta etapa. As observações a seguir constituem exclusivamente **sugestões técnicas para eventual refinamento documental futuro**, sem afetar a vigência dos artefatos atuais.

1. **Explicitação de Descarte de Cadastros Sem Histórico:** As regras RN03, RN14 e RN18 definem a desativação lógica (`ativo = false`), e o Modelo Físico Seção 17 estabelece a desativação como estratégia *"preferencial quando existirem dependências históricas"*. Sugere-se em futura revisão das RNs explicitar se a interface do aplicativo móvel deve ocultar completamente o botão de exclusão física para clientes, serviços e produtos (oferecendo apenas o botão "Desativar"), delegando a remoção física apenas a casos de descarte imediato no momento da criação;
2. **Formalização do Descarte de Rascunhos:** As regras RN63 e RN71 preveem o cancelamento (`CANCELADO`) a partir de `RASCUNHO`. Sugere-se explicitar na documentação de requisitos se a exclusão definitiva de um rascunho incompleto (Hard Delete) é uma opção de interface ou se todo rascunho descartado deve obrigatoriamente transitar para `CANCELADO`. A solução técnica proposta suporta ambas as abordagens de forma segura.
