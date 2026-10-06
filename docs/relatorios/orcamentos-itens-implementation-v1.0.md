# Relatório de Implementação — Módulo de Orçamentos e Itens de Orçamento v1.0

**Status da Etapa:** CONCLUÍDO — PENDENTE DE AUDITORIA  
**Data:** 28/09/2026  
**Ambiente:** React Native (Expo SDK 57) + TypeScript + Supabase Auth / PostgreSQL (PostgREST) + Android Emulator (Pixel_10 / Android API 36)  
**Banco de Dados:** Intocado / Congelado (Modelo Físico v1.1 e Auth + RLS v1.0 rigorosamente preservados)

---

## 1. Escopo

Implementação completa do módulo comercial central do aplicativo: **Orçamentos** (`public.orcamento`) e **Itens de Orçamento** (`public.item_orcamento`) v1.0.

### 1.1 Itens Implementados
- **Gestão de Orçamentos:**
  - Listagem com filtro por status (`RASCUNHO`, `ENVIADO`, `EM_ANALISE`, `APROVADO`, `RECUSADO`, `EXPIRADO`, `CANCELADO`, `CONCLUIDO`), busca em memória por número e cliente;
  - Criação de novo orçamento no status inicial obrigatório `RASCUNHO` associado a um cliente do próprio usuário;
  - Geração segura de numeração sequencial por usuário (`UNIQUE(usuario_id, numero)`);
  - Edição restrita ao status `RASCUNHO` (desconto, validade, observações, condições de pagamento);
  - Bloqueio estrito de edição após sair de `RASCUNHO` (RN64, RN65);
  - Exclusão permitida exclusivamente enquanto no status `RASCUNHO`;
  - Duplicação de orçamentos (`duplicarOrcamento`), gerando nova proposta comercial independente em `RASCUNHO` com novos IDs e preservação integral dos snapshots históricos dos itens;
  - Máquina de estados completa com validação de pré-requisitos para envio (RN58, RN59, RN60) e bloqueio de transições proibidas (RN62, RN71).
- **Gestão de Itens de Orçamento:**
  - Adição de Serviço **XOR** Produto com cópia de snapshot histórico (descrição, unidade, valor unitário);
  - Garantia de que alterações posteriores no catálogo não modifiquem os itens existentes no orçamento;
  - Cálculo automático de subtotal, descontos (percentual ou fixo) e valor total;
  - Suporte ao indicador `usa_medicao_area`:
    - Itens com `usa_medicao_area = false` e produtos permitem quantidade manual informada pelo usuário;
    - Serviços com `usa_medicao_area = true` têm quantidade manual bloqueada (RN34) e registram a limitação da fase atual (quantidade 0 m² enquanto o módulo de Áreas/Polígonos não for implementado);
  - Edição de itens (quantidade, valor unitário, descrição) restrita a `RASCUNHO`;
  - Remoção de itens restrita a `RASCUNHO` com recálculo automático em cascata dos totais do orçamento pai.

### 1.2 Limitações desta Fase e Itens Fora de Escopo
Conforme diretrizes canônicas, **NÃO** foram implementados nesta fase:
- Áreas e polígonos geoespaciais (`public.area`);
- Google Maps, imagens de satélite e desenho interativo;
- Cálculo espacial e conversões geodésicas;
- Geração e exportação de PDF (`PdfGenerator`);
- Compartilhamento via WhatsApp;
- Integrações de pagamentos e financeiro;
- Controle de estoque;
- CRM e funis avançados de atendimento.

---

## 2. Entidades do Modelo de Dados

As tabelas do banco permanecem inalteradas, respeitando o Modelo Físico v1.1:

### 2.1 `public.orcamento`
- `id`: UUID (PK, DEFAULT gen_random_uuid())
- `usuario_id`: UUID (FK -> usuario(id) ON DELETE RESTRICT)
- `cliente_id`: UUID (FK -> cliente(id) ON DELETE RESTRICT)
- `numero`: VARCHAR(50) NOT NULL
- `data_criacao`: TIMESTAMPTZ NOT NULL DEFAULT now()
- `data_validade`: DATE NULL (obrigatória ao sair de `RASCUNHO`, não retroativa à data de criação)
- `status`: VARCHAR(20) NOT NULL DEFAULT 'RASCUNHO' (CHECK status válidos)
- `subtotal`: NUMERIC(10,2) NOT NULL DEFAULT 0.00
- `tipo_desconto`: VARCHAR(20) NULL (CHECK: 'PERCENTUAL' ou 'VALOR_FIXO')
- `valor_desconto`: NUMERIC(10,2) NOT NULL DEFAULT 0.00
- `total`: NUMERIC(10,2) NOT NULL DEFAULT 0.00
- `observacoes`: TEXT NULL
- `condicoes_pagamento`: TEXT NULL
- **Restrição de unicidade:** `UNIQUE (usuario_id, numero)`

### 2.2 `public.item_orcamento`
- `id`: UUID (PK, DEFAULT gen_random_uuid())
- `orcamento_id`: UUID (FK -> orcamento(id) ON DELETE CASCADE)
- `servico_id`: UUID NULL (FK -> servico(id) ON DELETE RESTRICT)
- `produto_id`: UUID NULL (FK -> produto(id) ON DELETE RESTRICT)
- `tipo`: VARCHAR(20) NOT NULL (CHECK: 'SERVICO' ou 'PRODUTO')
- `descricao`: VARCHAR(200) NOT NULL (snapshot histórico)
- `quantidade`: NUMERIC(10,2) NOT NULL DEFAULT 1.00
- `unidade`: VARCHAR(30) NOT NULL (snapshot histórico)
- `valor_unitario`: NUMERIC(10,2) NOT NULL DEFAULT 0.00 (snapshot histórico)
- `valor_total`: NUMERIC(10,2) NOT NULL DEFAULT 0.00
- `usa_medicao_area`: BOOLEAN NOT NULL DEFAULT false
- **Restrições de integridade:**
  - `CHECK ((tipo = 'SERVICO' AND servico_id IS NOT NULL AND produto_id IS NULL) OR (tipo = 'PRODUTO' AND produto_id IS NOT NULL AND servico_id IS NULL))` (Regra XOR)
  - `CHECK (NOT (tipo = 'PRODUTO' AND usa_medicao_area = true))`

---

## 3. Repositories e Arquitetura

Seguindo rigorosamente o padrão homologado nos módulos de Clientes e Catálogo:

| Interface (Domain) | Implementação (Infrastructure) | Finalidade |
| :--- | :--- | :--- |
| `OrcamentoRepository` | `SupabaseOrcamentoRepository` | Acesso à tabela `public.orcamento` via PostgREST, com subconsultas para itens e clientes, respeitando RLS |
| `ItemOrcamentoRepository` | `SupabaseItemOrcamentoRepository` | Acesso à tabela `public.item_orcamento` via PostgREST com herança de isolamento de titularidade |

Ambos os repositórios utilizam estritamente o cliente Supabase autenticado (`auth.uid()`) e jamais utilizam credenciais privilegiadas (`service_role`).

---

## 4. Casos de Uso Implementados

| Caso de Uso | Camada | Responsabilidade |
| :--- | :--- | :--- |
| `ListarOrcamentosUseCase` | Application | Lista orçamentos do usuário autenticado com suporte a filtro de status e ordenação cronológica decrescente |
| `ObterOrcamentoUseCase` | Application | Recupera orçamento completo por ID, seus itens e dados do cliente, validando titularidade |
| `CriarOrcamentoUseCase` | Application | Valida cliente pertencente ao usuário, gera número único e cria proposta em `RASCUNHO` |
| `AtualizarOrcamentoUseCase` | Application | Valida permissão de edição (apenas `RASCUNHO`), aplica descontos percentuais ou fixos e atualiza dados |
| `DuplicarOrcamentoUseCase` | Application | Clona proposta original para nova proposta em `RASCUNHO`, com novo ID, novo número e snapshots isolados |
| `AlterarStatusOrcamentoUseCase` | Application | Valida pré-requisitos de envio e executa transições homologadas da máquina de estados comercial |
| `AdicionarItemOrcamentoUseCase` | Application | Valida XOR (Serviço ou Produto), captura snapshot do catálogo, vincula ao orçamento e recalcula totais |
| `AtualizarItemOrcamentoUseCase` | Application | Permite atualizar quantidade (itens não medidos) e customizar snapshot em `RASCUNHO` |
| `RemoverItemOrcamentoUseCase` | Application | Exclui item de orçamento em `RASCUNHO` e recalcula totais do orçamento |
| `ExcluirOrcamentoUseCase` | Application | Exclui orçamento logicamente e fisicamente apenas enquanto no status `RASCUNHO` |
| `OrcamentoService` | Application | Fachada unificada injetável para a camada de apresentação |

---

## 5. Regras de Negócio e Mecanismos Centrais

### 5.1 Snapshot Histórico (Seção 3 e Seção 20)
Ao adicionar um Serviço ou Produto a um orçamento, os valores de `descricao`, `unidade`, `valorUnitario` e `usaMedicaoArea` são copiados pontualmente para o `ItemOrcamento`. Alterações posteriores de preços ou nomenclaturas no catálogo de serviços ou produtos não afetam os itens já vinculados ao orçamento.
- **Evidência de Teste Automatizado:** Teste obrigatório da Seção 20 homologado e validado em `tests/orcamentos/item-orcamento-use-cases.test.ts`.

### 5.2 Regra XOR (Serviço vs Produto)
O item de orçamento representa exclusivamente um Serviço OU um Produto. Se `tipo = SERVICO`, `servicoId` é preenchido e `produtoId` é nulo. Se `tipo = PRODUTO`, `produtoId` é preenchido, `servicoId` é nulo e `usaMedicaoArea` é obrigatoriamente falso.

### 5.3 Regra Fundamental de Edição (RN64, RN65)
Apenas orçamentos com `status = 'RASCUNHO'` são passíveis de edição, adição ou exclusão de itens e alteração de descontos. Assim que o orçamento transita para `ENVIADO` ou estados subsequentes, qualquer tentativa de mutação é rejeitada com `RegraNegocioError`. Para realizar alterações, o usuário deve utilizar a ação de **Duplicação**, gerando um novo Rascunho.

### 5.4 Máquina de Estados Homologada
Transições válidas implementadas:
- `RASCUNHO` → `ENVIADO` (exige cliente, itens e validade)
- `RASCUNHO` → `CANCELADO`
- `ENVIADO` → `EM_ANALISE`
- `ENVIADO` → `EXPIRADO`
- `ENVIADO` → `CANCELADO`
- `EM_ANALISE` → `APROVADO`
- `EM_ANALISE` → `RECUSADO`
- `EM_ANALISE` → `EXPIRADO`
- `EM_ANALISE` → `CANCELADO`
- `APROVADO` → `CONCLUIDO`
- Estados terminais imutáveis: `RECUSADO`, `EXPIRADO`, `CANCELADO`, `CONCLUIDO`.

---

## 6. Interface de Usuário (Presentation)

Rotas criadas e registradas no Expo Router sob proteção de autenticação:

| Rota | Arquivo | Finalidade |
| :--- | :--- | :--- |
| `/(app)/orcamentos` | `app/(app)/orcamentos/index.tsx` | Lista de orçamentos com badge de status colorido, busca, filtro por abas e botão de novo orçamento |
| `/(app)/orcamentos/novo` | `app/(app)/orcamentos/novo.tsx` | Fluxo de seleção de cliente, criação de rascunho e adição inicial de itens |
| `/(app)/orcamentos/[id]` | `app/(app)/orcamentos/[id].tsx` | Detalhe completo, itens, totais, histórico, ações de status, duplicação e botão de edição |
| `/(app)/orcamentos/editar` | `app/(app)/orcamentos/editar.tsx` | Edição completa exclusiva para rascunhos (itens, descontos, observações) |

---

## 7. Validação Multi-Tenant e Segurança (RLS)

- **RLS em `orcamento`:** Filtragem por `usuario_id = auth.uid()` em `SELECT`, `INSERT`, `UPDATE`, `DELETE`.
- **RLS em `item_orcamento`:** Filtragem baseada na titularidade do orçamento pai (`EXISTS (SELECT 1 FROM orcamento o WHERE o.id = item_orcamento.orcamento_id AND o.usuario_id = auth.uid())`).
- **Testes Multi-Tenant (Seção 25 e 26):**
  - Suite `tests/orcamentos/orcamento-multi-tenant.test.ts` implementada com simulação fiel das policies RLS.
  - Comprovado isolamento simétrico estrito entre `USER_A` e `USER_B`:
    - `USER_A` não lista, não busca, não atualiza, não altera status e não exclui orçamentos de `USER_B`;
    - `USER_A` não consegue criar orçamento referenciando cliente de `USER_B`;
    - `USER_A` não consegue adicionar serviço ou produto de `USER_B` a seu orçamento;
    - `USER_A` não consegue alterar ou remover itens pertencentes a orçamento de `USER_B`;
    - `USER_B` submetido exatamente às mesmas validações com 100% de rejeição contra recursos de `USER_A`.

---

## 8. Resultados da Regressão Automatizada

Execução dos comandos obrigatórios:

| Suite | Comando | Resultado | Status |
| :--- | :--- | :--- | :--- |
| **Typecheck** | `npm run typecheck` | 0 erros | APROVADO |
| **Test Typecheck** | `npm run test:typecheck` | 0 erros | APROVADO |
| **Domínio Geral** | `npm test` | 49/49 aprovados | APROVADO |
| **Autenticação** | `npm run test:auth` | 18/18 aprovados | APROVADO |
| **Clientes** | `npm run test:clientes` | 28/28 aprovados | APROVADO |
| **Catálogo** | `npm run test:catalogo` | 42/42 aprovados | APROVADO |
| **Orçamentos + Itens** | `npm run test:orcamentos` | 24/24 aprovados | APROVADO |
| **Total de Testes Automatizados** | — | **161/161 testes em TypeScript** | **100% PASS** |

### Detalhamento dos Testes do Módulo de Orçamentos:
1. `tests/orcamentos/orcamento-use-cases.test.ts` (14 testes):
   - Criação de orçamento em `RASCUNHO` com valores zerados;
   - Rejeição de criação com cliente inexistente ou de terceiro;
   - Rejeição sem autenticação;
   - Rejeição de validade retroativa à data de criação;
   - Edição de rascunho com desconto percentual e fixo;
   - Bloqueio estrito de edição direta fora de `RASCUNHO` (RN64, RN65);
   - Rejeição de desconto > 100% ou maior que subtotal;
   - Transição completa do ciclo de vida: `RASCUNHO` → `ENVIADO` → `EM_ANALISE` → `APROVADO` → `CONCLUIDO`;
   - Reprovação de envio sem itens ou sem data de validade (RN58, RN59);
   - Bloqueio de transições proibidas e reabertura de orçamentos fechados;
   - Cancelamento permitido a partir de `RASCUNHO`, `ENVIADO` e `EM_ANALISE`;
   - Duplicação gerando proposta independente em `RASCUNHO` mantendo original inalterado;
   - Exclusão permitida apenas em `RASCUNHO`.
2. `tests/orcamentos/item-orcamento-use-cases.test.ts` (9 testes):
   - **Snapshot Histórico Obrigatório (Seção 20):** Serviço e Produto cadastrados a preço base, inseridos no orçamento, catálogo alterado posteriormente para valor superior e confirmação de que o valor unitário e total do item permanecem com o valor histórico congelado;
   - Regra XOR: impedimento de `produtoId` em serviço e `servicoId` em produto;
   - Impedimento de `usa_medicao_area` em produto;
   - Quantidade manual permitida para itens não medidos com recálculo automático;
   - Bloqueio de quantidade manual para serviço medido (RN34);
   - Remoção de item em `RASCUNHO` com recálculo automático do orçamento pai;
   - Bloqueio de remoção de item fora de `RASCUNHO`.
3. `tests/orcamentos/orcamento-multi-tenant.test.ts` (1 suite exaustiva):
   - Isolamento recíproco completo entre `USER_A` e `USER_B` para orçamentos, itens, clientes, serviços e produtos.

---

## 9. Decisões Arquiteturais e Conformidade

- **Nenhuma nova decisão arquitetural divergente tomada.**
- **Nenhuma migration modificada.**
- **Nenhuma coluna ou tabela criada fora do Modelo Físico v1.1.**
- Todas as implementações obedecem rigorosamente à separação em camadas (`Domain`, `Application`, `Infrastructure`, `Presentation`).

---

## 10. Conclusão

O **Módulo de Orçamentos e Itens de Orçamento v1.0** está completamente implementado, com todas as regras de negócio, snapshots históricos, máquina de estados, bloqueios de segurança e isolamento multi-tenant validados e cobertos por testes automatizados sem nenhuma regressão.

**Status Oficial:** **ORÇAMENTOS + ITENS CONCLUÍDO — PENDENTE DE AUDITORIA**
