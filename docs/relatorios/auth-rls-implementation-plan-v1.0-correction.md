# Relatório de Correção Controlada do Plano Executivo de Implementação Auth + RLS v1.0

**Documento de Governança Técnica e Saneamento Documental**  
**Objeto Corrigido:** `docs/relatorios/auth-rls-implementation-plan-v1.0.md`  
**Referência da Auditoria:** `docs/relatorios/auth-rls-implementation-plan-v1.0-audit.md`  
**Data da Correção:** 2026-09-20  
**Status do Plano Corrigido:** PENDENTE DE NOVA AUDITORIA  
**Autor:** Equipe de Arquitetura e Engenharia de Software  

---

## 1. Objetivo da Correção Controlada

O presente relatório formaliza o **saneamento e a retificação documental controlada** do:

> [`docs/relatorios/auth-rls-implementation-plan-v1.0.md`](file:///c:/Users/luanh/Documents/jardinagem-app/docs/relatorios/auth-rls-implementation-plan-v1.0.md)

As correções foram realizadas com base **estrita e exclusiva nos apontamentos formulados pela auditoria técnica independente** registrada em:

> [`docs/relatorios/auth-rls-implementation-plan-v1.0-audit.md`](file:///c:/Users/luanh/Documents/jardinagem-app/docs/relatorios/auth-rls-implementation-plan-v1.0-audit.md)

---

## 2. Divergências Documentais Retificadas

### 2.1. Retificação da Contagem de Políticas de RLS
A auditoria técnica identificou uma divergência aritmética entre o texto introdutório do plano e o catálogo/matriz real das políticas:
- **Contagem Anterior no Texto:** Declarava erroneamente "28 policies" (16 diretas e 12 em cadeia);
- **Contagem Correta e Efetiva:** **31 políticas de RLS** (19 diretas e 12 em cadeia).

A decomposição matemática auditada e formalizada no documento é:

```text
+-----------------------------------------------------------------------------------+
|                        DECOMPOSIÇÃO CORRETA DAS 31 POLÍTICAS                      |
+-----------------------------------------------------------------------------------+
| A) TITULARIDADE DIRETA (5 tabelas):                                               |
|    - usuario:        3 policies (SELECT, INSERT, UPDATE)                          |
|                      [DELETE ausente por Default Deny estrito - Decisão D1]       |
|    - cliente:        4 policies (SELECT, INSERT, UPDATE, DELETE)                  |
|    - servico:        4 policies (SELECT, INSERT, UPDATE, DELETE)                  |
|    - produto:        4 policies (SELECT, INSERT, UPDATE, DELETE)                  |
|    - orcamento:      4 policies (SELECT, INSERT, UPDATE, DELETE)                  |
|                      [DELETE condicionado a status = 'RASCUNHO' - Decisão D2]     |
|    Subtotal Direto: 19 policies                                                   |
+-----------------------------------------------------------------------------------+
| B) TITULARIDADE POR CADEIA RELACIONAL (3 tabelas):                                |
|    - endereco:       4 policies (SELECT, INSERT, UPDATE, DELETE)                  |
|                      [Cadeia simples via cliente_id]                              |
|    - item_orcamento: 4 policies (SELECT, INSERT, UPDATE, DELETE)                  |
|                      [Cadeia via orcamento_id + anti-cross-tenant em catálogo;    |
|                       DELETE condicionado a orçamento pai em 'RASCUNHO']          |
|    - area:           4 policies (SELECT, INSERT, UPDATE, DELETE)                  |
|                      [Cadeia dupla via item -> orcamento;                         |
|                       DELETE condicionado a orçamento raiz em 'RASCUNHO']         |
|    Subtotal Cadeia: 12 policies                                                   |
+-----------------------------------------------------------------------------------+
| TOTAL GERAL:        31 policies (distribuídas entre as 8 tabelas de domínio)      |
+-----------------------------------------------------------------------------------+
```

#### Locais Corrigidos no Plano:
1. **Seção 2.2 (Item 4 e 5):**
   - Alterado de `Políticas de RLS para Tabelas com Titularidade Direta (16 políticas)` para `Políticas de RLS para Tabelas com Titularidade Direta (19 políticas)`;
   - Adicionado o esclarecimento explícito: `*(Totalizando 31 políticas de RLS distribuídas entre as 8 tabelas de domínio)*`;
2. **Seção 12 (Item 2):**
   - Alterado de `revogações de privilégio e as 28 policies` para `revogações de privilégio e as 31 policies`.

---

### 2.2. Saneamento do Rol de Decisões Pendentes (Seção 15.2)
A auditoria técnica constatou que duas pendências operacionais incluídas na Seção 15.2 não possuíam qualquer menção ou fundamentação nos documentos canônicos homologados (RN v3, RF v2, RNF v2, Modelo Físico v1.1 e estratégia v1.6):
- `D-PEND-03` — Rate Limiting e Proteção contra Brute Force em Produção;
- `D-PEND-04` — Política de Expiração e Retenção de Logs em Produção.

#### Ação Realizada:
- **Remoção Completa:** Os itens `D-PEND-03` e `D-PEND-04` foram formalmente excluídos da Seção 15.2;
- **Preservação Estrita das Pendências Documentadas:** Foram mantidas exclusivamente as duas pendências legítimas homologadas:
  - `D-PEND-01 (Provedor SMTP de Produção):` Seleção, contratação e homologação do serviço SMTP transacional para nuvem;
  - `D-PEND-02 (Política Operacional de Confirmação de E-mail em Produção):` Formalização de `enable_confirmations = true` e elaboração dos templates das mensagens.

---

### 2.3. Ajuste do Status de Governança
- O status de governança do plano executivo foi ajustado de `PENDENTE DE HOMOLOGAÇÃO` para:
  **`PENDENTE DE NOVA AUDITORIA`**  
  (tanto no cabeçalho quanto na Seção 18 de Conclusão), garantindo que o plano retificado passe por reauditoria antes de qualquer homologação formal.

---

## 3. Preservação Integral dos Elementos Técnicos Já Auditados

Fica formalmente certificado que todas as seções e estruturas aprovadas na auditoria foram rigorosamente preservadas:
1. **Matriz Conceitual de Políticas (Seção 5):** Preservada ipsis litteris para todas as 32 operações nas 8 tabelas;
2. **Regras `USING` e `WITH CHECK`:** Intactas, mantendo as condições anti-cross-tenant e a exclusão restrita a `RASCUNHO`;
3. **Ordem de Implementação Técnica (Seção 3):** Preservada a sequência segura em 9 etapas;
4. **Bootstrap e Hardening (Seção 4):** Preservados `private.handle_new_user()`, `SECURITY DEFINER`, proprietário `postgres`, `SET search_path = ''` e menor privilégio;
5. **Critérios de Aceitação (Seção 13):** Preservados integralmente de CA-01 a CA-13;
6. **Estratégia de Testes (Seção 8):** Preservados os 12 grupos de testes (A a L) e os cenários Tenant A vs. Tenant B.

---

## 4. Garantias de Não Implementação e Preservação Absoluta

1. **Nenhuma implementação técnica foi realizada:** nenhum código de produção da aplicação React Native/Expo foi alterado;
2. **Nenhuma instrução SQL foi executada:** o banco de dados PostgreSQL permanece completamente intocado;
3. **Nenhuma migration foi criada ou alterada:** o arquivo `supabase/migrations/20260916020500_modelo_fisico_v1_1.sql` permanece congelado;
4. **Nenhum artefato canônico foi alterado:** RN v3, RF v2, RNF v2, UML v3.1, DER v1.1, Modelo Físico v1.1 e a estratégia `auth-rls-strategy-v1.6.md` permanecem intactos.

---

## 5. Validações Automatizadas Executadas

Após a retificação dos arquivos, as suítes de validação automatizada foram executadas no repositório:

### 5.1. Checagem Estática de Tipos (TypeScript)
```bash
npm run test:typecheck
```
- **Resultado:** **0 erros** (Compilação limpa).

### 5.2. Testes Automatizados de Domínio
```bash
npm test
```
- **Resultado:** **49/49 testes passando** (0 falhas, 0 cancelados, 10 suites aprovadas).

---

## 6. Parecer de Conclusão da Correção

O **Plano Executivo de Implementação de Supabase Auth + RLS v1.0** encontra-se plenamente saneado:
- Todas as inconsistências quantitativas de policies foram resolvidas ($19 + 12 = 31$);
- Todas as pendências sem lastro documental foram removidas;
- O plano permanece no status de **PENDENTE DE NOVA AUDITORIA**, pronto para verificação e posterior homologação.
