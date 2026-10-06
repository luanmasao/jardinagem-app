# Relatório de Correção Controlada: Módulo de Orçamentos e Itens de Orçamento v1.0

**Documento:** Relatório de Correção Controlada da Implementação  
**Versão:** 1.0  
**Data:** 30/09/2026  
**Responsável:** Antigravity IDE (Pair Programming Assistant)  
**Referência da Auditoria:** [orcamentos-itens-implementation-audit-v1.0.md](file:///c:/Users/luanh/Documents/jardinagem-app/docs/relatorios/orcamentos-itens-implementation-audit-v1.0.md)  
**Status da Etapa:** **CORREÇÕES IMPLEMENTADAS — AGUARDANDO NOVA AUDITORIA**  

---

## 1. Sumário Executivo

Este documento formaliza a execução e os resultados da **correção técnica controlada** referente às duas únicas divergências identificadas na auditoria técnica independente do **Módulo de Orçamentos e Itens de Orçamento v1.0** ([orcamentos-itens-implementation-audit-v1.0.md](file:///c:/Users/luanh/Documents/jardinagem-app/docs/relatorios/orcamentos-itens-implementation-audit-v1.0.md)):

1. **Divergência 1 (D1):** Violação da check constraint `orcamento_desconto_check` ao persistir desconto `FIXO` no formulário de criação de orçamento antes da existência de itens e subtotal.
2. **Divergência 2 (D2):** Incompatibilidade em tempo de execução com o motor JavaScript **Hermes** no Android devido ao uso de `crypto.randomUUID()` em escopo global.

As correções foram implementadas com precisão cirúrgica, respeitando integralmente todas as restrições canônicas do projeto. Nenhuma migration foi criada ou alterada, nenhuma policy de RLS foi modificada, nenhum trigger foi alterado e o Modelo Físico v1.1 permanece 100% congelado e íntegro.

---

## 2. Tratamento Detalhado das Divergências

### 2.1 Divergência 1 — Desconto Fixo Antes do Subtotal

#### A) Situação Anterior (Auditoria)
- **Arquivo Afetado:** [app/(app)/orcamentos/novo.tsx](file:///c:/Users/luanh/Documents/jardinagem-app/app/(app)/orcamentos/novo.tsx)
- **Causa Raiz:** O formulário de criação chamava `orcamentoService.criarOrcamento()` repassando diretamente `tipoDesconto: 'FIXO'` e `valorDesconto: X` antes que qualquer item existisse na tabela `public.item_orcamento`. Como o orçamento era inicializado com `subtotal = 0.00`, o PostgreSQL disparava a violação da constraint `orcamento_desconto_check`:
  ```sql
  CHECK (
    (tipo_desconto IS NULL AND valor_desconto = 0) OR
    (tipo_desconto = 'PERCENTUAL' AND valor_desconto >= 0 AND valor_desconto <= 100) OR
    (tipo_desconto = 'FIXO' AND valor_desconto > 0 AND valor_desconto <= subtotal)
  )
  ```
  Resultando no erro: `new row for relation "orcamento" violates check constraint "orcamento_desconto_check"`.

#### B) Correção Implementada
1. **Ordenação do Fluxo de Criação em [novo.tsx](file:///c:/Users/luanh/Documents/jardinagem-app/app/(app)/orcamentos/novo.tsx):**
   - O formulário valida defensivamente se o desconto fixo informado é maior do que o subtotal da soma dos itens adicionados antes de prosseguir;
   - Caso o desconto seja `FIXO` e `valorDesconto > 0`, o orçamento é criado inicialmente com desconto neutro (`tipoDesconto: null`, `valorDesconto: 0`), garantindo conformidade imediata com a constraint `orcamento_desconto_check`;
   - Em seguida, todos os itens são persistidos via `orcamentoService.adicionarItem()`, calculando o subtotal real;
   - Somente após existir subtotal válido no banco (`subtotal >= valorDesconto`), o serviço invoca `orcamentoService.atualizarOrcamento()` persistindo o desconto `FIXO` e recalculando o total final;
   - Para desconto `PERCENTUAL`, o comportamento foi preservado de forma contínua, pois a regra percentual é válida independentemente do subtotal.
2. **Proteção Defensiva em [editar.tsx](file:///c:/Users/luanh/Documents/jardinagem-app/app/(app)/orcamentos/editar.tsx):**
   - Adicionada validação que impede a submissão de desconto `FIXO` superior ao subtotal visível em tela.
3. **Tratamento do Caso de Borda (Remoção Total ou Parcial de Itens em RASCUNHO):**
   - Na entidade [Orcamento](file:///c:/Users/luanh/Documents/jardinagem-app/src/domain/entities/orcamento.ts), o método `recalcularValores()` foi ajustado para tratar explicitamente o esvaziamento de itens ou a redução do subtotal:
     - Se o subtotal tornar-se `0.00` e o desconto for `FIXO`, o desconto é automaticamente neutralizado (`tipoDesconto = null`, `valorDesconto = 0`);
     - Se o subtotal for reduzido abaixo do valor do desconto fixo corrente, o `valorDesconto` é delimitado ao novo subtotal (`valorDesconto = subtotal`), assegurando que `total` nunca seja negativo e que a constraint do banco jamais seja violada;
   - Essa regra de domínio foi conectada aos use cases [remover-item-orcamento.use-case.ts](file:///c:/Users/luanh/Documents/jardinagem-app/src/application/use-cases/orcamento/remover-item-orcamento.use-case.ts) e [atualizar-item-orcamento.use-case.ts](file:///c:/Users/luanh/Documents/jardinagem-app/src/application/use-cases/orcamento/atualizar-item-orcamento.use-case.ts).
4. **Proteção na Duplicação de Orçamentos com Desconto FIXO:**
   - Em [duplicar-orcamento.use-case.ts](file:///c:/Users/luanh/Documents/jardinagem-app/src/application/use-cases/orcamento/duplicar-orcamento.use-case.ts), o clone rascunho é persistido inicialmente sem desconto fixo caso possua itens a clonar, sendo o desconto fixo reaplicado após a inserção dos itens clonados e cálculo do subtotal.

#### C) Evidências Objetivas
- **Teste Automatizado:** Teste de integração de 9 passos em [tests/orcamentos/divergencias-d1-d2.test.ts](file:///c:/Users/luanh/Documents/jardinagem-app/tests/orcamentos/divergencias-d1-d2.test.ts) validando:
  1. Criação de rascunho com formulário de desconto fixo positivo;
  2. Persistência em estado compatível sem quebra de constraint;
  3. Adição de item e cálculo de subtotal;
  4. Aplicação e persistência posterior do desconto FIXO;
  5. Cálculo exato do total final;
  6. Remoção de todos os itens e neutralização automática do desconto FIXO quando o subtotal zera.
- **Validação Mobile no Android Emulator (`Pixel_10` / Hermes):**
  - Criação do orçamento `ORC-2026-002` com Cliente "Maria da Silva", Desconto FIXO de R$ 50,00 e Produto "Adubo Organico NPK" (2 x R$ 48 = R$ 96,00);
  - Orçamento salvo com absoluto sucesso sem erro de constraint;
  - Resumo em tela e persistido: Subtotal R$ 96,00, Desconto (Fixo) - R$ 50,00, Total R$ 46,00.
  - Imagens de evidência registradas:
    - [android_d1_orcamento_criado_sucesso.png](file:///c:/Users/luanh/Documents/jardinagem-app/docs/evidencias/android_d1_orcamento_criado_sucesso.png)
    - [android_d1_detalhes_orcamento_sucesso.png](file:///c:/Users/luanh/Documents/jardinagem-app/docs/evidencias/android_d1_detalhes_orcamento_sucesso.png)

---

### 2.2 Divergência 2 — Incompatibilidade de `crypto.randomUUID()` no Hermes

#### A) Situação Anterior (Auditoria)
- **Arquivos Afetados:**
  - [src/application/use-cases/orcamento/adicionar-item-orcamento.use-case.ts](file:///c:/Users/luanh/Documents/jardinagem-app/src/application/use-cases/orcamento/adicionar-item-orcamento.use-case.ts)
  - [src/application/use-cases/orcamento/duplicar-orcamento.use-case.ts](file:///c:/Users/luanh/Documents/jardinagem-app/src/application/use-cases/orcamento/duplicar-orcamento.use-case.ts)
- **Causa Raiz:** Invocação direta de `crypto.randomUUID()` em escopo global. No ambiente Node.js dos testes Jest a API existe nativamente, mas no motor **Hermes** em execução no Android a API web/crypto global não está exposta por padrão, resultando na exceção:
  `TypeError: undefined is not a function (evaluating 'crypto.randomUUID()')`.

#### B) Correção Implementada
1. **Adoção do Módulo Homologado `expo-crypto`:**
   - Adicionada a dependência oficial compatível com a versão Expo do projeto (`expo-crypto@~15.0.8`);
   - Nenhuma dependência alheia foi instalada ou atualizada.
2. **Substituição nos Use Cases:**
   - Em [adicionar-item-orcamento.use-case.ts](file:///c:/Users/luanh/Documents/jardinagem-app/src/application/use-cases/orcamento/adicionar-item-orcamento.use-case.ts) e [duplicar-orcamento.use-case.ts](file:///c:/Users/luanh/Documents/jardinagem-app/src/application/use-cases/orcamento/duplicar-orcamento.use-case.ts), substituiu-se o uso global por:
     ```typescript
     import * as Crypto from 'expo-crypto';
     // ...
     const novoId = Crypto.randomUUID();
     ```
   - **Zero** fallback baseado em `Math.random()`.
   - **Zero** gerador artesanal.
   - **Zero** polyfill global desnecessário injetado.
3. **Compatibilidade com o Ambiente de Testes Node.js:**
   - Como o runtime Node (`tsx`) não interpreta a sintaxe Flow contida em arquivos internos do React Native referenciados pelo módulo Expo em Node puro, criou-se o mock canônico [tests/mocks/expo-crypto.ts](file:///c:/Users/luanh/Documents/jardinagem-app/tests/mocks/expo-crypto.ts) mapeado em [tsconfig.test.json](file:///c:/Users/luanh/Documents/jardinagem-app/tsconfig.test.json), utilizando a função criptograficamente segura CSPRNG `node:crypto.randomUUID()`.

#### C) Evidências Objetivas
- **Teste Automatizado:** Teste de validação em [tests/orcamentos/divergencias-d1-d2.test.ts](file:///c:/Users/luanh/Documents/jardinagem-app/tests/orcamentos/divergencias-d1-d2.test.ts) comprovando a geração de UUIDs RFC 4122 válidos e a independência de IDs entre o orçamento de origem e o duplicado.
- **Validação Mobile no Android Emulator (`Pixel_10` / Hermes):**
  - Acionamento da ação "Duplicar Orçamento" a partir da proposta `ORC-2026-002`;
  - Confirmação no modal nativo;
  - Exibição do feedback com sucesso: *"Nova proposta ORC-2026-003 criada!"*;
  - Abertura imediata dos detalhes da nova proposta clonada:
    - Número: `ORC-2026-003`;
    - ID do orçamento clonado: `53cbda4f-5d0c-43cb-901f-e5bf126e91e8`;
    - Novo item de produto gerado com ID independente: `7c595a68-0f81-4db9-b964-792783a87091`;
    - **Zero** ocorrências de `TypeError: undefined is not a function (evaluating 'crypto.randomUUID()')`.
  - Imagens de evidência registradas:
    - [android_d2_duplicacao_sucesso.png](file:///c:/Users/luanh/Documents/jardinagem-app/docs/evidencias/android_d2_duplicacao_sucesso.png)
    - [android_d2_detalhes_copia_sucesso.png](file:///c:/Users/luanh/Documents/jardinagem-app/docs/evidencias/android_d2_detalhes_copia_sucesso.png)
    - [android_orcamentos_listagem_completa.png](file:///c:/Users/luanh/Documents/jardinagem-app/docs/evidencias/android_orcamentos_listagem_completa.png)

---

## 3. Resultados das Validações Automatizadas

### 3.1 Verificação de Tipos (TypeScript)
```bash
npm run typecheck
npm run test:typecheck
```
- **Resultado:** **0 erros** encontrados em ambas as suítes.

### 3.2 Regressão Completa de Testes Automatizados
```bash
npm test
npm run test:auth
npm run test:clientes
npm run test:catalogo
npm run test:orcamentos
```
| Suíte de Testes | Quantitativo Esperado | Quantitativo Executado | Resultado | Status |
| :--- | :--- | :--- | :--- | :--- |
| `npm test` (Domínio) | 49/49 | 49/49 | 49 aprovados (0 falhas) | **PASS** |
| `npm run test:auth` | 18/18 | 18/18 | 18 aprovados (0 falhas) | **PASS** |
| `npm run test:clientes` | 28/28 | 28/28 | 28 aprovados (0 falhas) | **PASS** |
| `npm run test:catalogo` | 42/42 | 42/42 | 42 aprovados (0 falhas) | **PASS** |
| `npm run test:orcamentos` | 24/24 | **28/28** (24 legados + 4 novos D1/D2) | 28 aprovados (0 falhas) | **PASS** |

### 3.3 Testes pgTAP de Banco de Dados e RLS
```bash
npx supabase test db
```
- **Resultado:** **170/170 testes aprovados (100% de sucesso)**.
- **Integridade Estrutural:** Nenhuma constraint, policy de RLS, trigger ou função de banco foi violada ou alterada.

---

## 4. Validação Mobile no Android Emulator

| Parâmetro | Configuração |
| :--- | :--- |
| **Dispositivo Emulado** | `Pixel_10` |
| **Arquitetura / API** | x86_64 / Android 16 (API 36/37) |
| **JavaScript Engine** | **Hermes** |
| **Frameworks** | Expo SDK 57 / React Native 0.86 |

### Roteiro de Verificação Funcional Executado:
1. **Criação de Orçamento com Desconto Fixo (D1):**
   - Abertura de `Novo Orçamento` no app;
   - Seleção do cliente Maria da Silva;
   - Preenchimento de desconto FIXO no valor de R$ 50,00;
   - Inclusão do produto Adubo NPK (2 x R$ 48 = R$ 96,00);
   - Salvamento do orçamento;
   - **Resultado:** Salvo com sucesso gerando `ORC-2026-002`, com subtotal R$ 96,00, desconto fixo R$ 50,00 e total R$ 46,00, sem disparar a constraint `orcamento_desconto_check`.
2. **Duplicação de Orçamento no Hermes (D2):**
   - A partir de `ORC-2026-002`, clique no botão "Duplicar Orçamento";
   - Confirmação no diálogo nativo;
   - **Resultado:** Proposta duplicada com sucesso para `ORC-2026-003`, com novo ID gerado via `Crypto.randomUUID()` de `expo-crypto`, sem erro de runtime Hermes (`undefined is not a function`).

---

## 5. Arquivos Modificados e Criados

### 5.1 Arquivos Modificados
- [src/domain/entities/orcamento.ts](file:///c:/Users/luanh/Documents/jardinagem-app/src/domain/entities/orcamento.ts): Neutralização/ajuste de desconto fixo no recálculo quando subtotal é zerado ou reduzido;
- [src/application/use-cases/orcamento/adicionar-item-orcamento.use-case.ts](file:///c:/Users/luanh/Documents/jardinagem-app/src/application/use-cases/orcamento/adicionar-item-orcamento.use-case.ts): Uso de `expo-crypto`;
- [src/application/use-cases/orcamento/duplicar-orcamento.use-case.ts](file:///c:/Users/luanh/Documents/jardinagem-app/src/application/use-cases/orcamento/duplicar-orcamento.use-case.ts): Uso de `expo-crypto` e postergação de desconto fixo no clone com itens;
- [src/application/use-cases/orcamento/remover-item-orcamento.use-case.ts](file:///c:/Users/luanh/Documents/jardinagem-app/src/application/use-cases/orcamento/remover-item-orcamento.use-case.ts): Sincronização de tipo/valor de desconto ao recalcular após remoção de item;
- [src/application/use-cases/orcamento/atualizar-item-orcamento.use-case.ts](file:///c:/Users/luanh/Documents/jardinagem-app/src/application/use-cases/orcamento/atualizar-item-orcamento.use-case.ts): Sincronização de tipo/valor de desconto ao recalcular após atualização de item;
- [app/(app)/orcamentos/novo.tsx](file:///c:/Users/luanh/Documents/jardinagem-app/app/(app)/orcamentos/novo.tsx): Ordem de persistência de desconto fixo após subtotal e validações em tela;
- [app/(app)/orcamentos/editar.tsx](file:///c:/Users/luanh/Documents/jardinagem-app/app/(app)/orcamentos/editar.tsx): Validação defensiva de desconto fixo vs subtotal;
- [package.json](file:///c:/Users/luanh/Documents/jardinagem-app/package.json) e `package-lock.json`: Inclusão da dependência homologada `expo-crypto`;
- [tsconfig.test.json](file:///c:/Users/luanh/Documents/jardinagem-app/tsconfig.test.json): Mapeamento de mock para `expo-crypto` na suíte Node.

### 5.2 Arquivos Criados
- [tests/mocks/expo-crypto.ts](file:///c:/Users/luanh/Documents/jardinagem-app/tests/mocks/expo-crypto.ts): Mock canônico de `expo-crypto` para os testes Node;
- [tests/orcamentos/divergencias-d1-d2.test.ts](file:///c:/Users/luanh/Documents/jardinagem-app/tests/orcamentos/divergencias-d1-d2.test.ts): Suíte de testes automatizados específica para D1 e D2;
- [docs/relatorios/orcamentos-itens-implementation-correction-v1.0.md](file:///c:/Users/luanh/Documents/jardinagem-app/docs/relatorios/orcamentos-itens-implementation-correction-v1.0.md): Este relatório de correção.

---

## 6. Confirmação de Preservação Estrutural e Escopo

Em cumprimento às restrições inegociáveis do projeto, confirma-se formalmente:
- **0** alterações em migrations existentes (`supabase/migrations/`);
- **0** alterações em policies de RLS;
- **0** alterações em triggers de banco de dados;
- **0** alterações na função `private.handle_new_user()`;
- **0** alterações no Modelo Físico v1.1;
- **0** alterações no DER v1.1 ou UML v3.1;
- **0** novas decisões de arquitetura introduzidas;
- Nenhuma funcionalidade fora do escopo foi adicionada.

---

## 7. Parecer Conclusivo da Correção

As duas divergências identificadas na auditoria técnica foram plenamente solucionadas, com comprovação por testes unitários, testes de integração, testes pgTAP no PostgreSQL e validação visual no runtime Android Hermes.

Conforme estipulado no protocolo de correção controlada, este relatório **não declara homologação**.

**STATUS FINAL:**  
### **CORREÇÕES IMPLEMENTADAS — AGUARDANDO NOVA AUDITORIA**
