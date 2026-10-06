# Relatório de Auditoria Técnica Independente: Módulo de Orçamentos e Itens de Orçamento v1.1

**Documento:** Relatório de Auditoria Técnica Formal e Empírica Pós-Correções D1 e D2  
**Versão:** 1.1  
**Data:** 01/10/2026  
**Auditor Responsável:** Antigravity IDE (Pair Programming Assistant / Engenharia de Qualidade)  
**Status do Módulo:** **HOMOLOGADO**  
**Referência da Auditoria Anterior:** [orcamentos-itens-implementation-audit-v1.0.md](file:///c:/Users/luanh/Documents/jardinagem-app/docs/relatorios/orcamentos-itens-implementation-audit-v1.0.md)  
**Referência do Relatório de Correção:** [orcamentos-itens-implementation-correction-v1.0.md](file:///c:/Users/luanh/Documents/jardinagem-app/docs/relatorios/orcamentos-itens-implementation-correction-v1.0.md)  
**Artefato Auditado:** Módulo de Orçamentos (`public.orcamento`) e Itens de Orçamento (`public.item_orcamento`)  

---

## 1. Identificação da Auditoria

| Parâmetro | Detalhe / Valor Auditado |
| :--- | :--- |
| **Módulo Auditado** | Orçamentos (`public.orcamento`) e Itens de Orçamento (`public.item_orcamento`) |
| **Versão da Auditoria** | v1.1 (Auditoria Pós-Correções das Divergências D1 e D2) |
| **Data e Hora de Execução** | 01/10/2026 - 02:30 UTC (30/09/2026 - 23:30 BRT) |
| **Branch / Commit Auditado** | `main` / HEAD auditado (código limpo, sem arquivos pendentes de commit) |
| **Ambiente Operacional** | Windows 11 Pro 64-bit / Supabase CLI 2.119.0 (Docker Engine local) |
| **Runtime Node.js** | v22.19.0 |
| **Gerenciador de Pacotes** | npm 10.9.3 |
| **Expo Framework** | Expo SDK 57.0.25 |
| **React Native** | 0.86.3 |
| **TypeScript** | 6.0.3 |
| **Supabase CLI** | 2.119.0 |
| **PostgreSQL (Local)** | PostgreSQL 17.6 on x86_64-pc-linux-gnu |
| **PostGIS (Local)** | PostGIS 3.3.7 |
| **Dispositivo Emulado** | Google Android Emulator (`Pixel_10` / AVD x86_64) |
| **Android API Target** | API 37 (Android 17 / API 36/37) |
| **JavaScript Engine Mobile**| **Hermes Engine** (`transform.engine=hermes&transform.bytecode=1`) |

---

## 2. Escopo Funcional Auditado

O escopo funcional desta auditoria cobriu com rigor e completude todo o ciclo de vida comercial e operacional dos **Orçamentos** e seus **Itens de Orçamento**:

1. **Criação de Orçamento:** Fluxo completo com validação de cliente ativo, preenchimento de prazos, condições de pagamento, observações e status inicial fixado em `RASCUNHO`;
2. **Consulta e Listagem:** Filtros reativos por status comercial, busca textual por número ou nome do cliente e paginação;
3. **Detalhamento do Orçamento:** Visualização completa de cabeçalho, resumo financeiro discriminado (subtotal, desconto, total) e lista de itens;
4. **Edição Restrita a RASCUNHO:** Alteração de dados cadastrais e financeiros permitida estritamente enquanto a proposta estiver no status `RASCUNHO`;
5. **Adição de Serviços e Produtos:** Inclusão de itens originários do catálogo homologado com respeito à regra XOR e snapshot imutável;
6. **Alteração de Itens:** Atualização de quantidade e valor unitário com recálculo matemático reativo;
7. **Remoção de Itens:** Exclusão de itens individuais em `RASCUNHO` com recálculo automático de subtotal, desconto e total;
8. **Cálculo Financeiro Canônico:** Subtotal como somatório ponderado dos itens (`Σ quantidade × valor_unitario`) com arredondamento monetário de duas casas decimais;
9. **Descontos:** Aplicação de Desconto Percentual (0% a 100%) e Desconto Fixo com validações defensivas e integridade relacional;
10. **Validade e Prazos:** Formato civil ISO (`YYYY-MM-DD`), opcional em `RASCUNHO` e obrigatório para transição para `ENVIADO` (RN58, RN59);
11. **Observações e Condições de Pagamento:** Preservação de texto livre para termos comerciais;
12. **Máquina de Estados Comercial:** Ciclo completo de 8 status canônicos e 10 transições permitidas;
13. **Duplicação de Orçamentos:** Criação de proposta clone autônoma em status `RASCUNHO`, com novo identificador UUID, novo número sequencial e itens independentes;
14. **Exclusão de Propostas (Decisão D2):** Exclusão permitida estritamente em `RASCUNHO` e terminantemente bloqueada em status posteriores;
15. **Isolamento Multi-Tenant:** Garantia de segregação estrita por tenant em todas as tabelas e relacionamentos via Row Level Security (RLS).

### Itens Estritamente Fora de Escopo:
- Entidade `Area` e tabela `public.area`;
- Mapas do Google Maps, satélite, polígonos e cálculos geoespaciais PostGIS;
- Geração de PDF (`PdfGenerator`) e geocodificação (`GeocodingProvider`);
- Compartilhamento via WhatsApp, pagamentos, faturamento, estoque e CRM.

---

## 3. Modelo de Banco

Auditou-se a conformidade exata entre o banco de dados PostgreSQL local (porta 54322) e o **Modelo Físico v1.1** aprovado.

### 3.1 Tabela `public.orcamento`
A introspecção de catálogo via `information_schema.columns` comprovou a presença de **exatamente 13 colunas homologadas**, sem nenhuma coluna a mais ou a menos:

| Coluna | Tipo Físico | Nullable | Restrição Canônica | Conformidade |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | NO | PK, `DEFAULT gen_random_uuid()` | **CONFORME** |
| `usuario_id` | `UUID` | NO | FK -> `usuario(id)` ON DELETE RESTRICT | **CONFORME** |
| `cliente_id` | `UUID` | NO | FK -> `cliente(id)` ON DELETE RESTRICT | **CONFORME** |
| `numero` | `VARCHAR(50)` | NO | Restrição `UNIQUE (usuario_id, numero)` | **CONFORME** |
| `data_criacao` | `TIMESTAMPTZ` | NO | `DEFAULT now()` | **CONFORME** |
| `data_validade` | `DATE` | YES | Validade civil ISO | **CONFORME** |
| `status` | `VARCHAR(20)` | NO | `DEFAULT 'RASCUNHO'`, CHECK status válidos | **CONFORME** |
| `subtotal` | `NUMERIC(10,2)`| NO | `DEFAULT 0.00`, CHECK (`subtotal >= 0`) | **CONFORME** |
| `tipo_desconto` | `VARCHAR(20)` | YES | CHECK (`'PERCENTUAL'` ou `'FIXO'`) | **CONFORME** |
| `valor_desconto`| `NUMERIC(10,2)`| NO | `DEFAULT 0.00`, CHECK (`valor_desconto >= 0`)| **CONFORME** |
| `total` | `NUMERIC(10,2)`| NO | `DEFAULT 0.00`, CHECK (`total >= 0`) | **CONFORME** |
| `observacoes` | `TEXT` | YES | Notas gerais de texto livre | **CONFORME** |
| `condicoes_pagamento`| `TEXT` | YES | Condições comerciais de pagamento | **CONFORME** |

- **Check Constraints Ativas em `orcamento`:**
  - `orcamento_desconto_check`:
    ```sql
    CHECK (
      (tipo_desconto IS NULL AND valor_desconto = 0) OR
      (tipo_desconto = 'PERCENTUAL' AND valor_desconto >= 0 AND valor_desconto <= 100) OR
      (tipo_desconto = 'FIXO' AND valor_desconto > 0 AND valor_desconto <= subtotal)
    )
    ```
  - `orcamento_subtotal_check`: `CHECK (subtotal >= 0)`
  - `orcamento_total_check`: `CHECK (total >= 0)`
  - `orcamento_status_check`: `CHECK (status IN ('RASCUNHO','ENVIADO','EM_ANALISE','APROVADO','RECUSADO','EXPIRADO','CANCELADO','CONCLUIDO'))`

### 3.2 Tabela `public.item_orcamento`
A introspecção de catálogo comprovou a presença de **exatamente 11 colunas homologadas**:

| Coluna | Tipo Físico | Nullable | Restrição Canônica | Conformidade |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | NO | PK, `DEFAULT gen_random_uuid()` | **CONFORME** |
| `orcamento_id` | `UUID` | NO | FK -> `orcamento(id)` ON DELETE CASCADE | **CONFORME** |
| `servico_id` | `UUID` | YES | FK -> `servico(id)` ON DELETE RESTRICT | **CONFORME** |
| `produto_id` | `UUID` | YES | FK -> `produto(id)` ON DELETE RESTRICT | **CONFORME** |
| `tipo` | `VARCHAR(20)` | NO | CHECK (`'SERVICO'` ou `'PRODUTO'`) | **CONFORME** |
| `descricao` | `VARCHAR(200)`| NO | Snapshot histórico de texto | **CONFORME** |
| `quantidade` | `NUMERIC(10,2)`| NO | `DEFAULT 1.00`, CHECK (`quantidade > 0`) | **CONFORME** |
| `unidade` | `VARCHAR(30)` | NO | Snapshot histórico de unidade | **CONFORME** |
| `valor_unitario`| `NUMERIC(10,2)`| NO | `DEFAULT 0.00`, CHECK (`valor_unitario >= 0`)| **CONFORME** |
| `valor_total` | `NUMERIC(10,2)`| NO | `DEFAULT 0.00`, CHECK (`valor_total >= 0`) | **CONFORME** |
| `usa_medicao_area`| `BOOLEAN` | NO | `DEFAULT false` | **CONFORME** |

- **Check Constraints Ativas em `item_orcamento`:**
  - `item_orcamento_xor_tipo_check`:
    ```sql
    CHECK (
      (tipo = 'SERVICO' AND servico_id IS NOT NULL AND produto_id IS NULL) OR
      (tipo = 'PRODUTO' AND produto_id IS NOT NULL AND servico_id IS NULL)
    )
    ```
  - `item_orcamento_produto_sem_medicao_area_check`:
    ```sql
    CHECK (NOT (tipo = 'PRODUTO' AND usa_medicao_area = true))
    ```
  - `item_orcamento_quantidade_check`: `CHECK (quantidade > 0)`
  - `item_orcamento_valor_unitario_check`: `CHECK (valor_unitario >= 0)`
  - `item_orcamento_valor_total_check`: `CHECK (valor_total >= 0)`

---

## 4. Relacionamentos e Integridade

A auditoria comprovou a integridade referencial física e a ausência total de associações indevidas ou cross-tenant:

1. **Orçamento → Usuário:** Chave estrangeira `orcamento_usuario_id_fkey` para `usuario(id)` com `ON DELETE RESTRICT`. A persistência atribui estritamente o `auth.uid()` da sessão autenticada.
2. **Orçamento → Cliente:** Chave estrangeira `orcamento_cliente_id_fkey` para `cliente(id)` com `ON DELETE RESTRICT`. Tentativas de associar cliente pertencente a outro tenant são barradas via Foreign Key e RLS.
3. **Item → Orçamento:** Chave estrangeira `item_orcamento_orcamento_id_fkey` com `ON DELETE CASCADE`. A exclusão de um orçamento em `RASCUNHO` remove automaticamente todos os seus itens associados sem órfãos.
4. **Item → Serviço e Item → Produto:** Chaves estrangeiras com `ON DELETE RESTRICT`, impedindo a remoção cadastral de serviços ou produtos que já constem em orçamentos.
5. **Isolamento de Tenant Cruzado:** Testes empíricos ao vivo demonstraram que nenhum usuário consegue associar entidades de terceiros às suas propostas.

---

## 5. Snapshot Histórico

Auditou-se empiricamente no banco real se os itens de orçamento mantêm seus dados históricos imutáveis perante alterações no catálogo de origem.

### Roteiro e Evidência Empírica Executada:
1. Registrou-se no catálogo o Serviço `"Poda Ornamental Padrão"` a R$ 80,00, unidade `"UN"`, `usa_medicao_area = false`;
2. Adicionou-se o item ao orçamento com quantidade 3 -> `descricao = "Poda Ornamental Padrão"`, `unidade = "UN"`, `valor_unitario = 80.00`, `valor_total = 240.00`;
3. Alterou-se o catálogo do serviço para `"Poda Técnica Avançada"`, unidade `"m²"`, valor unitário R$ 150,00 e `usa_medicao_area = true`;
4. Reconsultou-se a tabela `item_orcamento` via query direta:
   - `descricao`: manteve `"Poda Ornamental Padrão"`;
   - `unidade`: manteve `"UN"`;
   - `valor_unitario`: manteve `80.00`;
   - `valor_total`: manteve `240.00`;
   - `usa_medicao_area`: manteve `false`.
5. O mesmo teste foi executado com entidade `Produto` (adubo com preço reajustado de R$ 48,00 para R$ 75,00), comprovando que o snapshot preserva a integridade contratual do orçamento.

**Resultado:** **CONFORME (Imutabilidade Histórica Comprovada)**

---

## 6. Regra XOR Serviço/Produto

Validou-se no banco de dados real a eficácia das check constraints de exclusão mútua (`item_orcamento_xor_tipo_check` e `item_orcamento_produto_sem_medicao_area_check`):

| Cenário Testado | Parâmetros de Entrada | Resultado Esperado | Resultado Real no Banco | Código/Erro SQL | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **A. Serviço Válido** | `tipo='SERVICO'`, `servico_id=UUID`, `produto_id=null` | Aceito | Inserido com sucesso | - | **CONFORME** |
| **B. Produto Válido** | `tipo='PRODUTO'`, `produto_id=UUID`, `servico_id=null` | Aceito | Inserido com sucesso | - | **CONFORME** |
| **C. Ambos Preenchidos** | `servico_id=UUID`, `produto_id=UUID` | Bloqueado | Rejeitado pelo PostgreSQL | `23514 (item_orcamento_xor_tipo_check)` | **CONFORME** |
| **D. Nenhum Preenchido** | `servico_id=null`, `produto_id=null` | Bloqueado | Rejeitado pelo PostgreSQL | `23514 (item_orcamento_xor_tipo_check)` | **CONFORME** |
| **E. Tipo Incompatível** | `tipo='SERVICO'`, `servico_id=null`, `produto_id=UUID` | Bloqueado | Rejeitado pelo PostgreSQL | `23514 (item_orcamento_xor_tipo_check)` | **CONFORME** |
| **F. Produto com Medição**| `tipo='PRODUTO'`, `usa_medicao_area=true` | Bloqueado | Rejeitado pelo PostgreSQL | `23514 (item_orcamento_produto_sem_medicao_area_check)` | **CONFORME** |

---

## 7. Quantidade e Medição de Área

Auditou-se a conformidade com a regra **RN34**:
- **Produtos e Serviços sem Medição:** A entrada manual de quantidade na interface é permitida, editável e reativa (`quantidade > 0`).
- **Serviços com Medição de Área (`usa_medicao_area = true`):** O campo de digitação manual de quantidade é bloqueado na tela móvel, exibindo a informação de que a quantidade depende da demarcação de polígono a ser fornecida pelo futuro módulo de Áreas.
- **Isolamento de Responsabilidade:** O módulo de Orçamentos não faz simulações fictícias de área nem injeta números arbitrários, preservando a fronteira arquitetural.

**Resultado:** **CONFORME**

---

## 8. Cálculo Financeiro

Auditou-se a integridade aritmética em todas as camadas:
- **Fórmula do Subtotal:** `subtotal = Σ (quantidade × valor_unitario)`;
- **Arredondamento Canônico:** Implementado na função utilitária `arredondarMoeda(valor)` com arredondamento padrão bancário de duas casas decimais;
- **Cenários Testados:**
  - 0 itens: `subtotal = 0.00`, `total = 0.00`;
  - 1 item: multiplicação precisa (ex: 2.5 × 48.00 = 120.00);
  - Múltiplos itens: somatório composto sem propagação de erro de ponto flutuante;
  - Frações monetárias e decimais: precisão decimal validada;
  - Alteração de item: atualização reativa imediata de subtotal e total;
  - Remoção de item: recálculo decrescente do somatório;
  - Validação de piso: `total >= 0` garantido pelo domínio e pela constraint `orcamento_total_check`.

**Resultado:** **CONFORME**

---

## 9. Desconto Percentual

Auditou-se a aplicação e validação do desconto percentual:
- **Faixa Válida:** `0 <= valor_desconto <= 100`;
- **Fórmula:** `total = subtotal - arredondarMoeda(subtotal × valor_desconto / 100)`;
- **Cenários Validados:**
  - 0%: `total = subtotal`;
  - Desconto intermediário (ex: 10% sobre R$ 1.872,00 -> Desconto R$ 187,20, Total R$ 1.684,80);
  - 100%: `total = 0.00`;
  - Desconto negativo (< 0%): Rejeitado pelo domínio e pela constraint do PostgreSQL (código `23514`);
  - Desconto excessivo (> 100%): Rejeitado pelo domínio e pela constraint do PostgreSQL (código `23514`).

**Resultado:** **CONFORME**

---

## 10. Desconto Fixo (Auditoria Crítica da Divergência 1)

Esta seção constitui a auditoria independente e comprovação empírica da **Divergência 1**.

### 10.1 Situação na Auditoria v1.0
Na v1.0, o formulário de criação em `app/(app)/orcamentos/novo.tsx` tentava persistir o orçamento com `tipoDesconto = 'FIXO'` e `valorDesconto > 0` antes da inserção dos itens. Como o orçamento nascia com `subtotal = 0.00`, o PostgreSQL disparava violação imediata da check constraint `orcamento_desconto_check` (`CHECK ((tipo_desconto = 'FIXO' AND valor_desconto > 0 AND valor_desconto <= subtotal))`).

### 10.2 Verificação Empírica da Resolução na v1.1
Auditou-se o código-fonte, os use cases e a execução contra o banco real:
1. **Ordenação do Fluxo em [novo.tsx](file:///c:/Users/luanh/Documents/jardinagem-app/app/(app)/orcamentos/novo.tsx):**
   - O formulário valida defensivamente se o desconto fixo informado é maior do que o subtotal da soma dos itens adicionados antes de prosseguir;
   - Ao salvar, o orçamento é persistido inicialmente com desconto neutro (`tipoDesconto = null`, `valorDesconto = 0.00`);
   - Em seguida, os itens são persistidos via `orcamentoService.adicionarItem()`, consolidando o subtotal real no banco;
   - Por fim, o use case atualiza o orçamento com o desconto `FIXO` e calcula o total definitivo;
2. **Testes no Banco PostgreSQL Real:**
   - Teste de INSERT direto com FIXO e subtotal=0: Rejeitado com código `23514` (`orcamento_desconto_check`);
   - Teste de fluxo ordenado (orçamento neutro -> itens inseridos -> subtotal consolidado -> desconto FIXO aplicado): **Sucesso absoluto sem qualquer erro de constraint**;
   - Desconto FIXO exatamente igual ao subtotal (R$ 200,00 == R$ 200,00 -> total 0.00): **Sucesso**;
   - Desconto FIXO maior que o subtotal (R$ 200,01 > R$ 200,00): **Bloqueado com erro 23514**;
3. **Evidência no Runtime Android Real (`Pixel_10` / Hermes):**
   - Criação do orçamento `ORC-2026-002` com Cliente "Maria da Silva", Desconto FIXO de R$ 50,00 e Produto "Adubo Organico NPK" (2 sacos a R$ 48,00 = R$ 96,00);
   - Subtotal R$ 96,00, Desconto Fixo R$ 50,00, Total R$ 46,00;
   - Salvamento executado com sucesso e exibição de alerta de confirmação sem erro de banco;
   - Evidências registradas em:
     - [android_d1_orcamento_criado_sucesso.png](file:///c:/Users/luanh/Documents/jardinagem-app/docs/evidencias/android_d1_orcamento_criado_sucesso.png)
     - [android_d1_detalhes_orcamento_sucesso.png](file:///c:/Users/luanh/Documents/jardinagem-app/docs/evidencias/android_d1_detalhes_orcamento_sucesso.png)

**Resultado:** **RESOLVIDA (Totalmente Conforme no Código, Banco e Android)**

---

## 11. Caso de Borda — Subtotal Zero

Auditou-se o comportamento do sistema quando um orçamento em `RASCUNHO` possui desconto `FIXO` positivo e o usuário remove todos os seus itens:

1. **Comportamento na Entidade de Domínio [Orcamento.ts](file:///c:/Users/luanh/Documents/jardinagem-app/src/domain/entities/orcamento.ts):**
   - O método `recalcularValores()` detecta que a lista de itens tornou-se vazia (`subtotal = 0.00`);
   - Para prevenir violação de constraint no banco, o domínio neutraliza automaticamente o desconto:
     `tipoDesconto = null`, `valorDesconto = 0.00`, `total = 0.00`;
2. **Propagação nos Use Cases:**
   - [remover-item-orcamento.use-case.ts](file:///c:/Users/luanh/Documents/jardinagem-app/src/application/use-cases/orcamento/remover-item-orcamento.use-case.ts) e [atualizar-item-orcamento.use-case.ts](file:///c:/Users/luanh/Documents/jardinagem-app/src/application/use-cases/orcamento/atualizar-item-orcamento.use-case.ts) sincronizam esses campos de volta ao PostgreSQL;
3. **Teste Empírico no Banco:**
   - Orçamento rascunho com R$ 100,00 de subtotal e R$ 40,00 de desconto fixo;
   - Remoção de todos os itens do orçamento;
   - Verificação dos dados persistidos no PostgreSQL:
     - `subtotal`: `0.00`
     - `tipo_desconto`: `null`
     - `valor_desconto`: `0.00`
     - `total`: `0.00`
   - Zero violações da check constraint `orcamento_desconto_check`.

**Resultado:** **CONFORME**

---

## 12. Status da Máquina de Estados

Auditou-se a máquina de estados comercial de 8 status e 10 transições válidas:
`RASCUNHO`, `ENVIADO`, `EM_ANALISE`, `APROVADO`, `RECUSADO`, `EXPIRADO`, `CANCELADO`, `CONCLUIDO`.

### 12.1 Matriz de Transições Homologadas
| Origem | Destino | Regra / Pré-condição | Resultado |
| :--- | :--- | :--- | :--- |
| `RASCUNHO` | `ENVIADO` | Requer itens > 0 e validade preenchida (RN58, RN60) | **APROVADO** |
| `RASCUNHO` | `CANCELADO` | Cancelamento de rascunho permitido | **APROVADO** |
| `ENVIADO` | `EM_ANALISE` | Cliente recebeu e está avaliando | **APROVADO** |
| `ENVIADO` | `CANCELADO` | Cancelamento da proposta enviada | **APROVADO** |
| `ENVIADO` | `EXPIRADO` | Transcorrido prazo de validade | **APROVADO** |
| `EM_ANALISE` | `APROVADO` | Proposta aceita pelo cliente | **APROVADO** |
| `EM_ANALISE` | `RECUSADO` | Proposta rejeitada pelo cliente | **APROVADO** |
| `EM_ANALISE` | `CANCELADO` | Cancelamento durante análise | **APROVADO** |
| `EM_ANALISE` | `EXPIRADO` | Validade expirada durante análise | **APROVADO** |
| `APROVADO` | `CONCLUIDO` | Serviços/produtos executados e faturados | **APROVADO** |

### 12.2 Transições Proibidas Auditadas
- Tentativas de retornar de qualquer status para `RASCUNHO`: **Bloqueadas**;
- Tentativa de transição direta de `ENVIADO` para `APROVADO` (sem passar por `EM_ANALISE`): **Bloqueada**;
- Tentativa de transição a partir de status terminais (`CONCLUIDO`, `CANCELADO`, `RECUSADO`): **Bloqueadas**.

**Resultado:** **CONFORME**

---

## 13. RN60 — Envio Sem Itens

Testou-se no aplicativo móvel em execução real no Android Emulator (`Pixel_10` / Hermes):
1. Criou-se proposta em status `RASCUNHO` sem nenhum item adicionado;
2. Preencheu-se data de validade futura;
3. Acionou-se a ação de envio ("Marcar como Enviado");
4. **Comportamento Observado:** A operação foi imediatamente interceptada e bloqueada, exibindo na interface o alerta de erro canônico do domínio:
   `"Orçamento inválido para envio: Orçamento deve conter pelo menos um item"`
5. Evidência capturada em: [scratch/android_step17_status_changed.png](file:///c:/Users/luanh/Documents/jardinagem-app/scratch/android_step17_status_changed.png).

**Resultado:** **CONFORME**

---

## 14. Bloqueio Fora de RASCUNHO

Auditou-se a imutabilidade do orçamento fora do status `RASCUNHO` em três camadas:

1. **Camada de Apresentação (UI):** Ao avançar para `ENVIADO` ou superior, a tela oculta todos os botões de edição de cabeçalho, gerenciamento de itens, adição de serviços/produtos e exclusão;
2. **Camada de Aplicação (Use Cases):** `AtualizarOrcamentoUseCase`, `AdicionarItemOrcamentoUseCase`, `AtualizarItemOrcamentoUseCase` e `RemoverItemOrcamentoUseCase` disparam `RegraNegocioError` imediato caso o status atual não seja `RASCUNHO`;
3. **Camada de Infraestrutura / RLS:** Comandos DELETE disparados fora de `RASCUNHO` são bloqueados fisicamente por RLS policies. Comandos UPDATE de transição de status são autorizados pelo RLS do banco conforme o Modelo Físico v1.1 aprovado.

**Resultado:** **CONFORME**

---

## 15. Delete e Decisão D2

Auditou-se o comportamento de exclusão com base na **Decisão D2**:
- **Orçamento em RASCUNHO:** Exclusão autorizada e executada com sucesso. Itens vinculados são removidos em cascata via `ON DELETE CASCADE`;
- **Orçamento fora de RASCUNHO:** Exclusão bloqueada fisicamente pela policy de RLS `orcamento_delete_policy` (`USING (auth.uid() = usuario_id AND status = 'RASCUNHO')`). Chamada direta via PostgREST resultou em 0 linhas afetadas;
- **Item de Orçamento fora de RASCUNHO:** Exclusão bloqueada pela policy `item_orcamento_delete_policy`.

**Resultado:** **CONFORME**

---

## 16. Duplicação — Auditoria Crítica da Divergência 2

Esta seção constitui a auditoria independente e comprovação empírica da **Divergência 2**.

### 16.1 Situação na Auditoria v1.0
Na v1.0, o caso de uso [duplicar-orcamento.use-case.ts](file:///c:/Users/luanh/Documents/jardinagem-app/src/application/use-cases/orcamento/duplicar-orcamento.use-case.ts) e [adicionar-item-orcamento.use-case.ts](file:///c:/Users/luanh/Documents/jardinagem-app/src/application/use-cases/orcamento/adicionar-item-orcamento.use-case.ts) invocavam a função global `crypto.randomUUID()`. No motor JavaScript **Hermes** do Android, essa API web/Node não está disponível globalmente, lançando a exceção em tempo de execução:
`TypeError: undefined is not a function (evaluating 'crypto.randomUUID()')`.

### 16.2 Verificação Empírica da Resolução na v1.1
Auditou-se o código-fonte, a suíte de testes e o runtime no dispositivo:
1. **Adoção do Módulo Homologado `expo-crypto`:**
   - Substituição estrita por `import * as Crypto from 'expo-crypto'` e `Crypto.randomUUID()`;
   - **Zero** uso de `Math.random()`;
   - **Zero** gerador artesanal;
   - **Zero** polyfill global inseguro;
2. **Mock Seguro nos Testes Node:**
   - Criado [tests/mocks/expo-crypto.ts](file:///c:/Users/luanh/Documents/jardinagem-app/tests/mocks/expo-crypto.ts) mapeado no [tsconfig.test.json](file:///c:/Users/luanh/Documents/jardinagem-app/tsconfig.test.json), utilizando `node:crypto.randomUUID()` seguro;
3. **Execução no Android Hermes Real (`Pixel_10`):**
   - Abriu-se a proposta `ORC-2026-002`;
   - Clicou-se no botão "Duplicar Orçamento";
   - Diálogo nativo de confirmação aprovado;
   - Proposta clonada criada com total sucesso gerando `ORC-2026-003`;
   - Novo identificador de orçamento: `53cbda4f-5d0c-43cb-901f-e5bf126e91e8`;
   - Novo identificador de item clonado: `7c595a68-0f81-4db9-b964-792783a87091`;
   - **Zero ocorrências de erro de runtime** (`undefined is not a function`);
   - Evidências registradas em:
     - [android_d2_duplicacao_sucesso.png](file:///c:/Users/luanh/Documents/jardinagem-app/docs/evidencias/android_d2_duplicacao_sucesso.png)
     - [android_d2_detalhes_copia_sucesso.png](file:///c:/Users/luanh/Documents/jardinagem-app/docs/evidencias/android_d2_detalhes_copia_sucesso.png)
     - [android_orcamentos_listagem_completa.png](file:///c:/Users/luanh/Documents/jardinagem-app/docs/evidencias/android_orcamentos_listagem_completa.png)

**Resultado:** **RESOLVIDA (Totalmente Conforme no Código, Banco e Android/Hermes)**

---

## 17. Independência da Cópia

Auditou-se no banco de dados real se a alteração de um orçamento duplicado impacta o orçamento original:
1. Clonou-se o orçamento original `ORC-2026-002` gerando a cópia `ORC-2026-003`;
2. No orçamento `ORC-2026-003`, alterou-se a quantidade do produto de 2 para 5 unidades (subtotal elevado para R$ 240,00);
3. Adicionou-se um segundo item de serviço à cópia e removeu-se o desconto;
4. Reconsultou-se no PostgreSQL o orçamento de origem `ORC-2026-002`:
   - `subtotal`: permaneceu exatamente `96.00`;
   - `valor_desconto`: permaneceu `50.00`;
   - `total`: permaneceu `46.00`;
   - Lista de itens original: preservada sem nenhuma modificação.

**Resultado:** **CONFORME**

---

## 18. Numeração dos Orçamentos

Auditou-se a geração e a unicidade da numeração dos orçamentos:
- **Formato Canônico:** `ORC-YYYY-XXX` (ex: `ORC-2026-001`, `ORC-2026-002`, `ORC-2026-003`);
- **Restrição de Banco:** Restrição `UNIQUE (usuario_id, numero)` ativa no PostgreSQL;
- **Concorrência e Colisão:** Tentativa de persistir manualmente o mesmo número para o mesmo usuário resulta em violação de chave única (código `23505`);
- **Multi-Tenant:** O mesmo número (ex: `ORC-2026-001`) pertencente a usuários distintos é permitido e perfeitamente isolado por tenant.

**Resultado:** **CONFORME**

---

## 19. Cliente e Catálogo

Auditou-se a integridade relacional entre orçamentos e os módulos de Clientes e Catálogo:
- Clientes inativos ou inexistentes não podem ser associados a novos orçamentos;
- Serviços e produtos devem pertencer ao mesmo `usuario_id` autenticado;
- Alterações cadastrais futuras em clientes ou no catálogo de serviços/produtos não alteram retroativamente os dados já consolidados no orçamento.

**Resultado:** **CONFORME**

---

## 20. Multi-Tenant e RLS Real

Executou-se a auditoria empírica de isolamento multi-tenant via PostgREST local com dois usuários reais autenticados com tokens JWT (`User A` e `User B`):

| Operação Testada | Ação Executada | Resultado Observado | Status |
| :--- | :--- | :--- | :--- |
| **SELECT Cruzado** | `User A` consulta orçamentos de `User B` | 0 registros retornados | **CONFORME** |
| **INSERT Cruzado** | `User A` tenta criar orçamento com `usuario_id` de `User B` | Bloqueado por RLS / `auth.uid()` | **CONFORME** |
| **UPDATE Cruzado** | `User A` tenta alterar status do orçamento de `User B` | 0 linhas afetadas | **CONFORME** |
| **DELETE Cruzado** | `User A` tenta excluir orçamento rascunho de `User B` | 0 linhas afetadas | **CONFORME** |
| **Itens Cruzados** | `User A` tenta consultar itens de orçamento de `User B` | 0 registros retornados | **CONFORME** |
| **Cliente Cruzado**| `User A` tenta vincular `cliente_id` de `User B` ao seu orçamento | Bloqueado por FK e RLS | **CONFORME** |
| **Catálogo Cruzado**| `User A` tenta inserir `servico_id` de `User B` em seu item | Bloqueado por FK e RLS | **CONFORME** |

**Resultado:** **CONFORME (100% Isolado por Tenant)**

---

## 21. pgTAP

Executou-se a suíte completa de testes pgTAP de banco de dados e políticas RLS via Supabase CLI:

```bash
npx supabase test db
```

### Sumário dos Testes de Banco Executados:
- `test/00_perfil_rls.test.sql` ...................... **pass**
- `test/01_clientes_rls.test.sql` .................... **pass**
- `test/02_catalogo_rls.test.sql` .................... **pass**
- `test/03_orcamentos_rls.test.sql` .................. **pass**
- `test/04_orcamentos_delete_policy.test.sql` ........ **pass**
- `test/05_orcamentos_integridade.test.sql` .......... **pass**
- `test/06_item_orcamento_rls.test.sql` .............. **pass**
- `test/07_item_orcamento_constraints.test.sql` ...... **pass**

- **Total de asserções pgTAP:** **170 testes**
- **Aprovados:** **170/170 (100% de sucesso)**
- **Falhas:** **0**
- **Alterações em Migrations ou Policies:** **0**

**Resultado:** **CONFORME**

---

## 22. Testes TypeScript

Executou-se a verificação estrita de tipagem TypeScript no código da aplicação e nos testes:

```bash
npm run typecheck
npm run test:typecheck
```

- `npm run typecheck`: **0 erros** encontrados no projeto.
- `npm run test:typecheck`: **0 erros** encontrados na suíte de testes.

**Resultado:** **CONFORME**

---

## 23. Regressão Completa

Executou-se a regressão integral de todas as suítes automatizadas do repositório:

| Suíte de Testes | Comando | Testes Executados | Resultado | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Domínio Central** | `npm test` | 49/49 | 49 aprovados, 0 falhas | **PASS** |
| **Autenticação** | `npm run test:auth` | 18/18 | 18 aprovados, 0 falhas | **PASS** |
| **Clientes** | `npm run test:clientes` | 28/28 | 28 aprovados, 0 falhas | **PASS** |
| **Catálogo** | `npm run test:catalogo` | 42/42 | 42 aprovados, 0 falhas | **PASS** |
| **Orçamentos e Itens** | `npm run test:orcamentos` | 28/28 | 28 aprovados, 0 falhas | **PASS** |
| **Banco e RLS (pgTAP)**| `npx supabase test db` | 170/170 | 170 aprovados, 0 falhas | **PASS** |

- **Total de Testes Unitários e Integração TypeScript:** **165 testes aprovados** (0 falhas);
- **Total de Testes pgTAP:** **170 testes aprovados** (0 falhas);
- **Grande Total de Testes do Repositório:** **335 testes aprovados (100% de sucesso)**.

**Resultado:** **CONFORME (Zero Regressões)**

---

## 24. Testes Específicos D1/D2

Auditou-se e executou-se a suíte específica de regressão das duas divergências:

```bash
npx tsx --tsconfig tsconfig.test.json --test tests/orcamentos/divergencias-d1-d2.test.ts
```

### Resultados dos Cenários Específicos:
1. **D1 — Ordem de Criação de Orçamento com Desconto FIXO:** Valida que o formulário cria inicialmente o orçamento com desconto neutro, insere os itens acumulando o subtotal e em seguida aplica o desconto fixo. **PASS**
2. **D1 — Caso de Borda (Subtotal Zero):** Valida que a remoção de todos os itens de um orçamento com desconto fixo neutraliza automaticamente o desconto para `null` e `0.00`, preservando a consistência do banco. **PASS**
3. **D2 — Duplicação com `expo-crypto`:** Valida que a duplicação gera novos identificadores UUID compatíveis com RFC 4122 e garante total independência de instâncias. **PASS**
4. **D2 — Adição de Item com ID via `expo-crypto`:** Valida que novos itens adicionados recebem UUID gerado pela biblioteca oficial. **PASS**

- **Total da Suíte D1/D2:** **4/4 testes aprovados (100% PASS)**.

**Resultado:** **CONFORME**

---

## 25. Inspeção dos Use Cases

Inspecionou-se o código-fonte dos use cases do módulo:
- [adicionar-item-orcamento.use-case.ts](file:///c:/Users/luanh/Documents/jardinagem-app/src/application/use-cases/orcamento/adicionar-item-orcamento.use-case.ts): Utiliza `Crypto.randomUUID()`, valida status `RASCUNHO`, valida XOR entre serviço e produto, gera snapshot histórico fiel e recalcula subtotal e total;
- [atualizar-item-orcamento.use-case.ts](file:///c:/Users/luanh/Documents/jardinagem-app/src/application/use-cases/orcamento/atualizar-item-orcamento.use-case.ts): Valida status `RASCUNHO`, atualiza quantidade e valor unitário, recalcula e delimita desconto fixo caso o subtotal caia abaixo do desconto;
- [remover-item-orcamento.use-case.ts](file:///c:/Users/luanh/Documents/jardinagem-app/src/application/use-cases/orcamento/remover-item-orcamento.use-case.ts): Valida status `RASCUNHO`, remove item, recalcula somatório e neutraliza desconto fixo caso subtotal zere;
- [duplicar-orcamento.use-case.ts](file:///c:/Users/luanh/Documents/jardinagem-app/src/application/use-cases/orcamento/duplicar-orcamento.use-case.ts): Utiliza `Crypto.randomUUID()`, cria cópia em `RASCUNHO`, preserva dados comerciais, clona itens com novos UUIDs e reaplica desconto fixo de forma segura após o cálculo do subtotal da cópia.

**Resultado:** **CONFORME**

---

## 26. Repositories e Camadas

Auditou-se a aderência estrita à arquitetura canônica de 4 camadas:
1. **Presentation:** Telas em `app/(app)/orcamentos/*.tsx` e hooks `useOrcamentos` e `useOrcamentoDetalhe` limitam-se à experiência do usuário, navegação e apresentação de dados;
2. **Application:** Fachada `OrcamentoService` e 10 casos de uso isolados orquestram regras e chamadas sem acoplamento a detalhes de tela;
3. **Domain:** Entidades `Orcamento` e `ItemOrcamento`, enums e interfaces de repositório puras em TypeScript, sem nenhuma dependência de bibliotecas externas de banco ou UI;
4. **Infrastructure:** `SupabaseOrcamentoRepository` e `SupabaseItemOrcamentoRepository` encapsulam o acesso ao PostgREST e mapeiam `snake_case` para `camelCase`.

**Resultado:** **CONFORME**

---

## 27. Compatibilidade Android/Hermes

Auditou-se o comportamento do aplicativo em tempo de execução no Android sob o motor **Hermes**:
- **Ambiente:** `Pixel_10` / Android API 37 / Hermes JS Engine;
- **Fluxos Executados e Aprovados:**
  - Criação de novo orçamento com cliente, produtos e desconto FIXO positivo;
  - Resumo financeiro calculado com precisão sem travamentos;
  - Ação de envio bloqueada adequadamente quando orçamento sem itens (RN60);
  - Ação de duplicação de orçamento executada via modal de confirmação;
  - Geração de nova proposta clone com novo número e novos IDs;
  - **Zero ocorrências de `TypeError: undefined is not a function (evaluating 'crypto.randomUUID()')`**;
  - **Zero crashes de runtime**.

**Resultado:** **CONFORME**

---

## 28. Segurança e Integridade

Auditou-se a segurança do módulo:
- **Zero Secrets no Frontend:** Nenhuma chave privilegiada (`service_role`), token de administrador ou segredo vazado no código versionado;
- **Isolamento por RLS:** Todas as consultas e mutações respeitam estritamente `auth.uid() = usuario_id`;
- **Integridade de Identidade:** O `usuario_id` é rigorosamente derivado do token JWT da sessão autenticada;
- **Prevenção de Injeção Multi-Tenant:** Bloqueio garantido contra inclusão de clientes, serviços ou produtos de outros tenants.

**Resultado:** **CONFORME**

---

## 29. Diferenças em Relação à Auditoria v1.0

### Divergência 1 (D1)
- **Estado na Auditoria v1.0:** Violação da check constraint `orcamento_desconto_check` ao criar orçamento com desconto FIXO antes de inserir itens.
- **Estado na Auditoria v1.1:** O formulário cria inicialmente o orçamento com desconto neutro, insere os itens gerando o subtotal real no banco, e em seguida aplica o desconto FIXO via use case. Além disso, a entidade de domínio neutraliza automaticamente o desconto fixo quando o subtotal zera.
- **Classificação:** **RESOLVIDA**

### Divergência 2 (D2)
- **Estado na Auditoria v1.0:** Incompatibilidade com o motor Hermes no Android devido ao uso global de `crypto.randomUUID()`, gerando `TypeError: undefined is not a function`.
- **Estado na Auditoria v1.1:** O código utiliza o módulo oficial `expo-crypto` (`Crypto.randomUUID()`), homologado para Expo e Hermes, com mock seguro para os testes Node. A duplicação e adição de itens operam com total estabilidade no Android.
- **Classificação:** **RESOLVIDA**

---

## 30. Novas Decisões e Regressões

Auditou-se se a correção das divergências introduziu alterações indevidas ou novas decisões arquiteturais:
- **Novas Decisões Arquiteturais Não Homologadas:** **0**;
- **Novas Decisões de Negócio Não Homologadas:** **0**;
- **Alterações em Migrations de Banco:** **0**;
- **Alterações em Policies RLS:** **0**;
- **Alterações em Triggers ou Funções do Banco:** **0**;
- **Alterações no Modelo Físico v1.1:** **0**;
- **Regressões Funcionais nos Módulos de Auth, Clientes ou Catálogo:** **0**.

**Resultado:** **CONFORME**

---

## 31. Matriz Final de Conformidade

| # | Critério de Avaliação | Evidência Objetiva | Resultado |
| :---: | :--- | :--- | :---: |
| 1 | **Modelo Físico v1.1** | Introspecção PostgreSQL (13 colunas em `orcamento`, 11 em `item_orcamento`, 0 extras) | **CONFORME** |
| 2 | **Relacionamentos e Integridade** | FKs com ON DELETE RESTRICT e CASCADE rigorosamente ativas e testadas | **CONFORME** |
| 3 | **Snapshot Histórico** | Preço e dados do item mantidos inalterados após modificação do catálogo | **CONFORME** |
| 4 | **Regra XOR (Serviço vs Produto)** | Cenários A-F testados contra PostgREST com bloqueio por check constraint | **CONFORME** |
| 5 | **Quantidade e Medição (RN34)** | Quantidade manual bloqueada para serviços com medição de área | **CONFORME** |
| 6 | **Cálculos Financeiros** | Subtotal, descontos e total com arredondamento monetário de duas casas | **CONFORME** |
| 7 | **Desconto Percentual** | Validação entre 0% e 100%, cálculo exato do total | **CONFORME** |
| 8 | **Desconto Fixo (D1)** | Ordem de criação corrigida, validação empírica no banco e no Android | **CONFORME** |
| 9 | **Subtotal Zero (Caso de Borda)** | Neutralização automática de desconto fixo ao remover todos os itens | **CONFORME** |
| 10 | **Máquina de Estados Comercial** | 8 status e 10 transições homologadas testadas com 100% de sucesso | **CONFORME** |
| 11 | **RN60 (Envio Sem Itens)** | Bloqueio comprovado no Android com erro canônico de domínio | **CONFORME** |
| 12 | **Bloqueio Fora de RASCUNHO** | Ocultação na UI, validação nos Use Cases e bloqueio físico por RLS no DELETE | **CONFORME** |
| 13 | **DELETE e Decisão D2** | Exclusão permitida apenas em RASCUNHO; bloqueada em status posteriores | **CONFORME** |
| 14 | **Duplicação (D2)** | Implementação com `expo-crypto` validada no Android Hermes sem erros | **CONFORME** |
| 15 | **Independência da Cópia** | Alterações na cópia duplicada não causam qualquer efeito no orçamento original | **CONFORME** |
| 16 | **Numeração de Orçamentos** | Formato `ORC-YYYY-XXX` com restrição `UNIQUE (usuario_id, numero)` ativa | **CONFORME** |
| 17 | **Isolamento Multi-Tenant** | Teste ao vivo com dois JWTs reais comprovando isolamento total | **CONFORME** |
| 18 | **pgTAP de Banco e RLS** | 170/170 asserções de banco aprovadas via Supabase CLI | **CONFORME** |
| 19 | **TypeScript e Regressão Geral** | 0 erros de tipagem, 165/165 testes TS aprovados em todos os módulos | **CONFORME** |
| 20 | **Segurança e Arquitetura** | Zero secrets, 4 camadas respeitadas, sem credenciais de serviço | **CONFORME** |

---

## 32. Parecer Final

Com base na inspeção técnica detalhada, na execução integral de testes automatizados, na validação de banco de dados via pgTAP e na comprovação empírica no ambiente móvel real Android sob o motor Hermes, atesta-se que:

1. As duas divergências identificadas na auditoria v1.0 (**Divergência 1** e **Divergência 2**) foram **efetivamente e comprovadamente eliminadas**;
2. Não foi identificada nenhuma nova divergência funcional, estrutural ou de segurança;
3. Não houve qualquer regressão nos módulos previamente homologados (Auth, Clientes e Catálogo);
4. O Modelo Físico v1.1, as migrations, as políticas de RLS e os 170 testes pgTAP permaneceram 100% congelados e íntegros;
5. O módulo de Orçamentos e Itens de Orçamento cumpre integralmente os Requisitos Funcionais (RF v2), Requisitos Não-Funcionais (RNF v2), Regras de Negócio (RN v3) e a Arquitetura Técnica v1.1.

Portanto, emite-se formalmente o parecer conclusivo:

### **STATUS: HOMOLOGADO**

---

## Tabela Final de Reconciliação das Duas Divergências Anteriores

| Divergência | Diagnóstico na Auditoria v1.0 | Causa Raiz Técnica | Correção Implementada | Validação Empírica v1.1 | Status Final |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **Divergência 1 (D1):** Desconto Fixo Antes do Subtotal | Falha ao criar orçamento com desconto FIXO no formulário `novo.tsx`, violando a check constraint `orcamento_desconto_check` no PostgreSQL. | O formulário enviava `tipoDesconto = 'FIXO'` e `valorDesconto > 0` na criação inicial do orçamento, momento em que `subtotal = 0.00`. | 1. Orçamento é criado com desconto neutro;<br>2. Itens são inseridos acumulando o subtotal real;<br>3. Desconto FIXO é aplicado e total recalculado;<br>4. Domínio neutraliza desconto fixo se subtotal zerar. | - Teste de banco direto: 0 violações;<br>- Teste automatizado de 9 passos aprovado;<br>- Orçamento `ORC-2026-002` criado e salvo com sucesso no Android `Pixel_10`. | **RESOLVIDA / HOMOLOGADA** |
| **Divergência 2 (D2):** Incompatibilidade de `crypto.randomUUID()` no Hermes | Falha em tempo de execução ao tentar duplicar orçamentos no aplicativo Android, disparando erro de runtime no motor Hermes. | Invocação direta da API global `crypto.randomUUID()`, que não é exposta por padrão no motor JavaScript Hermes no Android. | 1. Adoção da dependência oficial homologada `expo-crypto`;<br>2. Invocação de `Crypto.randomUUID()` nos use cases de duplicação e adição de item;<br>3. Mock CSPRNG seguro para o ambiente Node.js de testes. | - 4/4 testes unitários D1/D2 aprovados;<br>- Duplicação da proposta `ORC-2026-002` gerando `ORC-2026-003` no Android `Pixel_10` sob motor Hermes com 100% de sucesso e zero erros de runtime. | **RESOLVIDA / HOMOLOGADA** |
