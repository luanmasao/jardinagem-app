# Relatório de Auditoria Técnica do Plano Executivo de Implementação Auth + RLS v1.0

**Documento de Auditoria Técnica e Conformidade Arquitetural**  
**Objeto Auditado:** `docs/relatorios/auth-rls-implementation-plan-v1.0.md`  
**Status:** PENDENTE DE HOMOLOGAÇÃO  
**Data da Auditoria:** 2026-09-20  
**Autor:** Equipe de Arquitetura e Engenharia de Software  

---

## 1. Objetivo e Escopo da Auditoria

O presente relatório realiza a **auditoria técnica formal, exaustiva e independente** do:

> [`docs/relatorios/auth-rls-implementation-plan-v1.0.md`](file:///c:/Users/luanh/Documents/jardinagem-app/docs/relatorios/auth-rls-implementation-plan-v1.0.md)

O objetivo é verificar se o plano executivo traduz com exatidão, fidelidade e consistência interna a **Estratégia de Supabase Auth + RLS v1.6** formalmente homologada, assegurando que:
1. Nenhuma decisão homologada foi perdida, alterada ou contradita;
2. Nenhuma regra de negócio nova ou requisito não aprovado foi introduzido;
3. As contagens quantitativas de policies, tabelas e operações estão matematicamente corretas e coerentes;
4. As cláusulas conceituais `USING` e `WITH CHECK` respeitam o Modelo Físico v1.1 e os padrões anti-cross-tenant;
5. A ordem técnica de implementação respeita a topologia de dependências do PostgreSQL/Supabase;
6. As pendências e critérios de aceitação possuem fundamentação estrita nos documentos canônicos.

> [!IMPORTANT]
> **Preservação Absoluta:**  
> Esta auditoria é estritamente analítica. Nenhum artefato técnico, migration, código de produção ou o próprio plano auditado foi alterado nesta etapa.

---

## 2. Fontes Canônicas da Auditoria

A análise confrontou o plano executivo exclusivamente contra o conjunto documental oficial vigente:
1. `docs/relatorios/auth-rls-strategy-v1.6.md` (Estratégia Consolidada Homologada);
2. `docs/relatorios/auth-rls-strategy-v1.6-audit-v1.0.md` (Auditoria Homologada da v1.6);
3. `docs/relatorios/auth-rls-security-definer-v1.2.md` (Homologação de Bootstrap, `SECURITY DEFINER` e Privilégios);
4. `docs/relatorios/auth-rls-delete-policy-v1.2.md` (Homologação de DELETE e Desativação Lógica — D1 e D2);
5. `docs/relatorios/auth-rls-performance-v1.0.md` (Homologação da Revisão de Performance e Roteiro C1–C6);
6. `docs/relatorios/auth-rls-auth-config-v1.0.md` (Homologação de Configurações do Supabase Auth e Sessão);
7. `docs/modelo-fisico-v1.1.md` e `supabase/migrations/20260916020500_modelo_fisico_v1_1.sql` (Modelo Físico Congelado);
8. Requisitos de Negócio: RN v3, RF v2 e RNF v2.

---

## 3. Auditoria da Contagem de Políticas de RLS (Divergência Quantitativa Interna)

A auditoria identificou uma **DIVERGÊNCIA INTERNA DE CONTAGEM** no texto do plano executivo:

### 3.1. Confronto entre o Texto Descritivo e o Catálogo Real
- **Afirmação no Texto do Plano (Seção 2.2, Item 4 e 5, e Seção 12, Item 2):**
  - O texto declara: *"Políticas de RLS para Tabelas com Titularidade Direta (16 políticas)"* (Seção 2.2, Item 4);
  - O texto declara: *"Políticas de RLS para Tabelas com Titularidade por Cadeia (12 políticas)"* (Seção 2.2, Item 5);
  - O texto conclui: *"e as 28 policies"* (Seção 12, Item 2).
- **Contagem Real dos Objetos Listados e Detalhados na Matriz (Seção 2.2 e Seção 5):**
  - Tabelas de Titularidade Direta (5 tabelas):
    - `usuario`: 3 policies (SELECT, INSERT, UPDATE) — *Sem DELETE (Default Deny)*;
    - `cliente`: 4 policies (SELECT, INSERT, UPDATE, DELETE);
    - `servico`: 4 policies (SELECT, INSERT, UPDATE, DELETE);
    - `produto`: 4 policies (SELECT, INSERT, UPDATE, DELETE);
    - `orcamento`: 4 policies (SELECT, INSERT, UPDATE, DELETE);
    - **Subtotal Real de Policies Diretas:** $3 + 4 + 4 + 4 + 4 = \mathbf{19\text{ policies}}$.
  - Tabelas de Titularidade por Cadeia (3 tabelas):
    - `endereco`: 4 policies (SELECT, INSERT, UPDATE, DELETE);
    - `item_orcamento`: 4 policies (SELECT, INSERT, UPDATE, DELETE);
    - `area`: 4 policies (SELECT, INSERT, UPDATE, DELETE);
    - **Subtotal Real de Policies em Cadeia:** $4 + 4 + 4 = \mathbf{12\text{ policies}}$.
  - **TOTAL REAL DE POLICIES ESPECIFICADAS NO PLANO:** $19 + 12 = \mathbf{31\text{ policies}}$.

### 3.2. Diagnóstico da Origem do Erro de Contagem
A divergência decorreu de um equívoco aritmético na redação do texto de introdução do Grupo B (Seção 2.2):
- O autor calculou $4 \times 4 = 16$ considerando as quatro tabelas de negócio diretas com quatro operações (`cliente`, `servico`, `produto`, `orcamento`), omitindo as 3 policies da tabela `usuario` no somatório do texto;
- Em seguida, somou $16 + 12 = 28$ na Seção 12;
- No entanto, a tabela `usuario` **foi devidamente incluída no corpo do Item 4 com suas 3 policies**, totalizando 19 diretas e 31 no total geral.

```text
+-----------------------------------------------------------------------------------+
|                        QUADRO COMPARATIVO DE CONTAGEM                             |
+-----------------------------------------------------------------------------------+
| Categoria de Policy     | Declarado no Texto | Real no Catálogo | Divergência     |
+-------------------------+--------------------+------------------+-----------------+
| Titularidade Direta     | 16 policies        | 19 policies      | -3 policies     |
| Titularidade por Cadeia | 12 policies        | 12 policies      | 0 (Exato)       |
+-------------------------+--------------------+------------------+-----------------+
| TOTAL DE POLICIES       | 28 policies        | 31 policies      | -3 policies     |
+-------------------------+--------------------+------------------+-----------------+
```

> [!WARNING]
> **Registro de Divergência Interna:**  
> Classificado formalmente como **DIVERGÊNCIA INTERNA DO PLANO**.  
> O catálogo e a matriz de policies contêm **31 políticas reais**. O texto introdutório que menciona "16 diretas" e "28 policies no total" está matematicamente incorreto em relação ao próprio conteúdo do plano e precisará ser retificado antes da homologação.

---

### 3.3. Placar Exato por Operação e por Tabela
Nas 8 tabelas do sistema, há um total de $8 \times 4 = 32\text{ operações}$ DML possíveis para o papel `authenticated`:
- **Operações Cobertas por Policy:** 31 operações;
- **Operações Não Cobertas por Decisão Explícita:** 1 operação (`usuario` DELETE $\rightarrow$ bloqueio total por *Default Deny* homologado na Decisão D1);
- **Distribuição por Operação:**
  - **SELECT:** 8 policies (1 por tabela);
  - **INSERT:** 8 policies (1 por tabela);
  - **UPDATE:** 8 policies (1 por tabela);
  - **DELETE:** 7 policies (`cliente`, `servico`, `produto`, `orcamento`, `endereco`, `item_orcamento`, `area`).

---

## 4. Auditoria Exaustiva das 32 Operações nas 8 Tabelas de Domínio

A matriz a seguir audita individualmente cada operação para cada uma das 8 tabelas do Modelo Físico v1.1, confrontando as regras conceituais com a estratégia homologada v1.6:

| # | Tabela | Operação | Policy Prevista | Cláusula `USING` | Cláusula `WITH CHECK` | Fonte Homologada | Classificação | Observação Técnica |
|---|---|---|---|---|---|---|---|---|
| **1** | `usuario` | **SELECT** | Sim (`usuario_select_policy`) | `auth.uid() = id` | N/A | `v1.6` (Seção 12) | **CONFORME** | Acesso restrito ao perfil próprio. |
| **2** | `usuario` | **INSERT** | Sim (`usuario_insert_policy`) | N/A | `auth.uid() = id` | `v1.6` (Seção 8.2, 12); `security-definer-v1.2` | **CONFORME** | Suporte exclusivo ao fallback defensivo `/concluir-perfil`. |
| **3** | `usuario` | **UPDATE** | Sim (`usuario_update_policy`) | `auth.uid() = id` | `auth.uid() = id` | `v1.6` (Seção 12) | **CONFORME** | Permite edição de dados e desativação lógica (`ativo = false`). |
| **4** | `usuario` | **DELETE** | **NÃO** | N/A | N/A | `v1.6` (Seção 12, 19); `delete-policy-v1.2` (D1) | **CONFORME** | **Default Deny total:** exclusão física bloqueada via API. |
| **5** | `cliente` | **SELECT** | Sim (`cliente_select_policy`) | `auth.uid() = usuario_id` | N/A | `v1.6` (Seção 12) | **CONFORME** | Carteira própria de clientes. |
| **6** | `cliente` | **INSERT** | Sim (`cliente_insert_policy`) | N/A | `auth.uid() = usuario_id` | `v1.6` (Seção 12) | **CONFORME** | Atribuição mandatória ao titular ativo. |
| **7** | `cliente` | **UPDATE** | Sim (`cliente_update_policy`) | `auth.uid() = usuario_id` | `auth.uid() = usuario_id` | `v1.6` (Seção 12) | **CONFORME** | Veda usurpação de titularidade. |
| **8** | `cliente` | **DELETE** | Sim (`cliente_delete_policy`) | `auth.uid() = usuario_id` | N/A | `v1.6` (Seção 12, 16) | **CONFORME** | Autoriza deleção se não houver orçamentos (`FK RESTRICT`). |
| **9** | `servico` | **SELECT** | Sim (`servico_select_policy`) | `auth.uid() = usuario_id` | N/A | `v1.6` (Seção 12) | **CONFORME** | Catálogo de serviços próprio. |
| **10** | `servico` | **INSERT** | Sim (`servico_insert_policy`) | N/A | `auth.uid() = usuario_id` | `v1.6` (Seção 12) | **CONFORME** | Cadastro exclusivo no catálogo próprio. |
| **11** | `servico` | **UPDATE** | Sim (`servico_update_policy`) | `auth.uid() = usuario_id` | `auth.uid() = usuario_id` | `v1.6` (Seção 12) | **CONFORME** | Edição de preços e descrições do próprio catálogo. |
| **12** | `servico` | **DELETE** | Sim (`servico_delete_policy`) | `auth.uid() = usuario_id` | N/A | `v1.6` (Seção 12, 16) | **CONFORME** | Sujeito a `ON DELETE RESTRICT` perante `item_orcamento`. |
| **13** | `produto` | **SELECT** | Sim (`produto_select_policy`) | `auth.uid() = usuario_id` | N/A | `v1.6` (Seção 12) | **CONFORME** | Catálogo de insumos próprio. |
| **14** | `produto` | **INSERT** | Sim (`produto_insert_policy`) | N/A | `auth.uid() = usuario_id` | `v1.6` (Seção 12) | **CONFORME** | Cadastro exclusivo no catálogo próprio. |
| **15** | `produto` | **UPDATE** | Sim (`produto_update_policy`) | `auth.uid() = usuario_id` | `auth.uid() = usuario_id` | `v1.6` (Seção 12) | **CONFORME** | Edição de preços e unidades do catálogo. |
| **16** | `produto` | **DELETE** | Sim (`produto_delete_policy`) | `auth.uid() = usuario_id` | N/A | `v1.6` (Seção 12, 16) | **CONFORME** | Sujeito a `ON DELETE RESTRICT` perante `item_orcamento`. |
| **17** | `orcamento` | **SELECT** | Sim (`orcamento_select_policy`) | `auth.uid() = usuario_id` | N/A | `v1.6` (Seção 12) | **CONFORME** | Visualização exclusiva de propostas do usuário. |
| **18** | `orcamento` | **INSERT** | Sim (`orcamento_insert_policy`) | N/A | `auth.uid() = usuario_id AND EXISTS (cliente de auth.uid())` | `v1.6` (Seção 12, 15) | **CONFORME** | **Anti-cross-tenant:** Veda associar cliente de terceiro. |
| **19** | `orcamento` | **UPDATE** | Sim (`orcamento_update_policy`) | `auth.uid() = usuario_id` | `auth.uid() = usuario_id AND EXISTS (cliente de auth.uid())` | `v1.6` (Seção 12, 15) | **CONFORME** | Mantém integridade e titularidade do cliente. |
| **20** | `orcamento` | **DELETE** | Sim (`orcamento_delete_policy`) | `auth.uid() = usuario_id AND status = 'RASCUNHO'` | N/A | `v1.6` (Seção 12); `delete-policy-v1.2` (D2) | **CONFORME** | **Decisão D2:** Exclusão restrita ao estado `RASCUNHO`. |
| **21** | `endereco` | **SELECT** | Sim (`endereco_select_policy`) | `EXISTS (cliente vinculado de auth.uid())` | N/A | `v1.6` (Seção 14) | **CONFORME** | Cadeia relacional simples via `cliente_id`. |
| **22** | `endereco` | **INSERT** | Sim (`endereco_insert_policy`) | N/A | `EXISTS (cliente vinculado de auth.uid())` | `v1.6` (Seção 14) | **CONFORME** | Impede criar endereço apontando para cliente alheio. |
| **23** | `endereco` | **UPDATE** | Sim (`endereco_update_policy`) | `EXISTS (cliente próprio)` | `EXISTS (cliente próprio)` | `v1.6` (Seção 14) | **CONFORME** | Mutação restrita a endereços da própria carteira. |
| **24** | `endereco` | **DELETE** | Sim (`endereco_delete_policy`) | `EXISTS (cliente próprio)` | N/A | `v1.6` (Seção 14) | **CONFORME** | Exclusão vinculada ao cliente do usuário. |
| **25** | `item_orcamento` | **SELECT** | Sim (`item_orcamento_select_policy`) | `EXISTS (orçamento pai de auth.uid())` | N/A | `v1.6` (Seção 14) | **CONFORME** | Cadeia relacional simples via `orcamento_id`. |
| **26** | `item_orcamento` | **INSERT** | Sim (`item_orcamento_insert_policy`) | N/A | `EXISTS (orçamento próprio) AND servico/produto próprios` | `v1.6` (Seção 14, 15) | **CONFORME** | **Anti-cross-tenant triplo:** orçamento, serviço e produto. |
| **27** | `item_orcamento` | **UPDATE** | Sim (`item_orcamento_update_policy`) | `EXISTS (orçamento próprio)` | `EXISTS (orçamento próprio) AND servico/produto próprios` | `v1.6` (Seção 14, 15) | **CONFORME** | Atualização segura de itens do orçamento. |
| **28** | `item_orcamento` | **DELETE** | Sim (`item_orcamento_delete_policy`) | `EXISTS (orçamento próprio AND status = 'RASCUNHO')` | N/A | `v1.6` (Seção 14); `delete-policy-v1.2` (D2) | **CONFORME** | **Decisão D2:** Exclusão autorizada só em `RASCUNHO`. |
| **29** | `area` | **SELECT** | Sim (`area_select_policy`) | `EXISTS (item -> orçamento de auth.uid())` | N/A | `v1.6` (Seção 14) | **CONFORME** | Cadeia relacional dupla (área $\rightarrow$ item $\rightarrow$ orçamento). |
| **30** | `area` | **INSERT** | Sim (`area_insert_policy`) | N/A | `EXISTS (item -> orçamento de auth.uid())` | `v1.6` (Seção 14) | **CONFORME** | Vínculo restrito a itens de orçamentos próprios. |
| **31** | `area` | **UPDATE** | Sim (`area_update_policy`) | `EXISTS (item -> orçamento próprio)` | `EXISTS (item -> orçamento próprio)` | `v1.6` (Seção 14) | **CONFORME** | Edição de geometria de polígono e medição. |
| **32** | `area` | **DELETE** | Sim (`area_delete_policy`) | `EXISTS (item -> orçamento próprio AND status = 'RASCUNHO')` | N/A | `v1.6` (Seção 14); `delete-policy-v1.2` (D2) | **CONFORME** | **Decisão D2:** Exclusão autorizada só em `RASCUNHO`. |

---

## 5. Auditoria Específica da Tabela `usuario` e Suporte ao Fallback Defensivo

A auditoria verificou detalhadamente as regras de autorização de `public.usuario`:
1. **Cláusula SELECT (`auth.uid() = id`):** Rigorosamente conforme com a Seção 12 da v1.6;
2. **Fundamentação de `usuario_insert_policy`:**
   - Foi auditado se a policy `usuario_insert_policy` (`WITH CHECK (auth.uid() = id)`) com a justificativa de "suporte ao fallback defensivo" está fundamentada nos documentos homologados;
   - **Confirmação:** A Seção 8.2 da estratégia consolidada v1.6 e a Seção 6 de `auth-rls-security-definer-v1.2.md` estabelecem formalmente que, em cenários anômalos onde o perfil não é provisionado pela trigger (ex.: cadastro manual no Supabase Dashboard), a camada de Application direciona o usuário autenticado para a rota `/concluir-perfil`, que insere o registro via PostgREST. A policy `usuario_insert_policy` foi deliberadamente mantida na Seção 12 da v1.6 exatamente para viabilizar essa recuperação defensiva;
   - **Conclusão:** O plano **NÃO inventou** uma nova regra de autorização; a inclusão da policy de INSERT está **100% FUNDAMENTADA**;
3. **Cláusula UPDATE (`auth.uid() = id`):** Conforme. Permite edição de dados pessoais e inativação de conta;
4. **Ausência de Policy de DELETE (Default Deny):** A inexistência deliberada de policy de DELETE para `usuario` reproduz ipsis litteris a Decisão D1 homologada em `auth-rls-delete-policy-v1.2.md`.

---

## 6. Auditoria de `orcamento`, `item_orcamento` e `area` (Cadeias e Anti-Cross-Tenant)

### 6.1. Tabela `orcamento`
- A política de INSERT e UPDATE exige em `WITH CHECK` que `c.usuario_id = auth.uid()`, bloqueando a associação de clientes alheios;
- A política de UPDATE diferencia corretamente `USING` (validação de posse da linha existente) de `WITH CHECK` (validação de titularidade e integridade do cliente na linha modificada);
- A política de DELETE condiciona a operação a `status = 'RASCUNHO'`, em conformidade estrita com a Decisão D2.

### 6.2. Tabela `item_orcamento`
- A titularidade por cadeia simples `item_orcamento -> orcamento -> usuario` respeita o Modelo Físico v1.1 sem adicionar coluna redundante `usuario_id`;
- As validações anti-cross-tenant em INSERT e UPDATE verificam se `servico_id` e `produto_id` pertencem ao mesmo tenant (`usuario_id = auth.uid()`);
- A exclusividade mútua entre `servico_id` e `produto_id` é assegurada pelas constraints `chk_item_orcamento_tipo` e `chk_item_orcamento_referencia_tipo` do Modelo Físico v1.1;
- O DELETE é expressamente condicionado a que o orçamento pai esteja em `RASCUNHO`.

### 6.3. Tabela `area`
- A titularidade por cadeia dupla `area -> item_orcamento -> orcamento -> usuario` respeita a normalização do banco;
- O DELETE exige que o orçamento raiz esteja em `RASCUNHO`;
- A integridade relacional física opera em harmonia com o RLS: quando um orçamento em `RASCUNHO` é excluído, a constraint `ON DELETE CASCADE` do Modelo Físico v1.1 propaga a exclusão física para seus itens e áreas correspondentes.

---

## 7. Auditoria do Bootstrap e `SECURITY DEFINER`

A Seção 4 do plano executivo reproduz integralmente todos os requisitos de segurança homologados em `auth-rls-security-definer-v1.2.md`:
1. **Schema Privado (`private`):** Garante isolamento fora dos schemas expostos pelo PostgREST (`public`);
2. **Modificador `SECURITY DEFINER` com FUNCTION OWNER `postgres`:** Permite bypass nativo de RLS assegurado pela ausência de `FORCE RLS` (Decisão 4);
3. **Hardening Estático `SET search_path = ''`:** Neutraliza hijacking de caminho de busca;
4. **Qualificação Explícita:** Referência qualificada `public.usuario`;
5. **Menor Privilégio de `EXECUTE`:** `REVOKE ALL FROM PUBLIC` e revogação explícita de `anon` e `authenticated`;
6. **Ausência de GRANT para `supabase_auth_admin`:** Respeita o funcionamento nativo das triggers no PostgreSQL;
7. **Trigger Nativa:** Disparo em `AFTER INSERT ON auth.users`;
8. **Inexistência de Funções Auxiliares:** Nenhuma função auxiliar de autorização não homologada foi introduzida no plano.

---

## 8. Auditoria da Ordem de Implementação e Dependências

A ordem proposta na Seção 3 do plano foi auditada quanto à sua coerência operacional no PostgreSQL/Supabase:

```text
Ordem Proposta:
1. Schema private 
   → 2. Função private.handle_new_user() 
   → 3. Revogações de EXECUTE 
   → 4. Trigger on_auth_user_created 
   → 5. ENABLE ROW LEVEL SECURITY (8 tabelas) 
   → 6. Policies Diretas 
   → 7. Policies em Cadeia 
   → 8. Testes de Integração 
   → 9. Validação C1–C6
```

### Avaliação Técnica
1. **Dependências DDL:** A ordem é perfeitamente hierárquica (o schema precede a função; a função precede os revokes e a trigger; as tabelas precedem o RLS; o RLS precede as policies; as entidades pai precedem as entidades filhas em cadeia);
2. **Atomicidade Transacional da Migration:**  
   No Supabase CLI (`supabase db push` / `psql`), uma migration DDL é executada como uma transação atômica única (`BEGIN ... COMMIT`). Portanto, a habilitação de RLS (Etapa 5) antes da criação das policies (Etapas 6 e 7) **não gera janelas transitórias de bloqueio (*exposure windows*)** em ambiente de produção, pois o commit é único;
3. **Independência da Trigger em Relação ao RLS:**  
   Como `private.handle_new_user()` é `SECURITY DEFINER` e possui owner `postgres`, qualquer inserção em `auth.users` durante a execução da migration opera via bypass de RLS, não dependendo das policies de `public.usuario`.
4. **Classificação:** **CONFORME COM OBSERVAÇÃO** (Registrando formalmente que a migration deve ser estruturada e executada em bloco transacional atômico).

---

## 9. Auditoria das "Decisões Pendentes" (Classificação Formal)

A Seção 15 do plano declara quatro decisões pendentes (`D-PEND-01` a `D-PEND-04`). A auditoria confrontou cada uma com a estratégia consolidada v1.6 e com o relatório homologado `auth-rls-auth-config-v1.0.md`:

```text
+---------------------------------------------------------------------------------------------------+
|                            AUDITORIA DAS DECISÕES PENDENTES DECLARADAS                            |
+---------------------------------------------------------------------------------------------------+
| ID        | Descrição no Plano               | Status Canônico               | Classificação       |
+-----------+----------------------------------+-------------------------------+---------------------+
| D-PEND-01 | Provedor SMTP de Produção        | Previsto em v1.6 (Seção 17.2) | PENDÊNCIA JÁ        |
|           |                                  | e auth-config (Seção 4.1, 6)  | DOCUMENTADA         |
+-----------+----------------------------------+-------------------------------+---------------------+
| D-PEND-02 | Confirmação de E-mail Produção   | Previsto em v1.6 (Seção 17.2) | PENDÊNCIA JÁ        |
|           | (enable_confirmations = true)    | e auth-config (Seção 4.2, 6)  | DOCUMENTADA         |
+-----------+----------------------------------+-------------------------------+---------------------+
| D-PEND-03 | Rate Limiting e Proteção contra  | Ausente em v1.6 e em todos os | DECISÃO NOVA        |
|           | Brute Force em Produção          | relatórios homologados        | NÃO HOMOLOGADA      |
+-----------+----------------------------------+-------------------------------+---------------------+
| D-PEND-04 | Política de Retenção e Expiração | Ausente em v1.6 e em todos os | DECISÃO NOVA        |
|           | de Logs de Auditoria             | relatórios homologados        | NÃO HOMOLOGADA      |
+---------------------------------------------------------------------------------------------------+
```

### Análise Crítica de D-PEND-03 e D-PEND-04
- **D-PEND-01 e D-PEND-02:** São **pendências operacionais legítimas já documentadas e homologadas**, consistindo estritamente na contratação de serviço SMTP e formalização da confirmação de e-mail antes do go-live de produção;
- **D-PEND-03 e D-PEND-04:** Embora rate limiting e retenção de logs sejam boas práticas operacionais de nuvem, **eles não possuem qualquer menção ou respaldo na documentação canônica do projeto** (inexistentes em RN v3, RF v2, RNF v2, Modelo Físico v1.1, `auth-config-v1.0.md` e `auth-rls-strategy-v1.6.md`);
- **Conclusão:** O plano executivo **extrapolou o escopo documental homologado** ao catalogar formalmente `D-PEND-03` e `D-PEND-04` como pendências oficiais do projeto. Elas devem ser reclassificadas como *inferências operacionais de infraestrutura não homologadas*, não integrando o escopo da futura homologação do plano.

---

## 10. Auditoria dos Critérios de Aceitação (CA-01 a CA-13)

Todos os 13 critérios de aceitação foram avaliados individualmente:

| Critério | Descrição | Fonte Homologada | Verificável? | Introduz Requisito Novo? | Classificação |
|---|---|---|---|---|---|
| **CA-01** | Bootstrap atômico de usuário | `v1.6` (Seção 8) | Sim (teste SQL) | Não | **CONFORME** |
| **CA-02** | Defesa contra cadastro sem nome | `v1.6` (Seção 8.1) | Sim (exceção SQL) | Não | **CONFORME** |
| **CA-03** | Menor privilégio na rotina privada | `v1.6` (Seção 8.1) | Sim (ACL pg_proc) | Não | **CONFORME** |
| **CA-04** | RLS com `ENABLE` e sem `FORCE` | `v1.6` (Seção 10) | Sim (pg_class) | Não | **CONFORME** |
| **CA-05** | Default Deny de exclusão de perfil | `v1.6` (Seção 12) | Sim (DELETE negado) | Não | **CONFORME** |
| **CA-06** | Desativação lógica de perfil | `v1.6` (Seção 19) | Sim (UPDATE ativo) | Não | **CONFORME** |
| **CA-07** | Isolamento multi-tenant estrito | `v1.6` (Seção 11) | Sim (teste A vs B) | Não | **CONFORME** |
| **CA-08** | DELETE condicionado a RASCUNHO | `v1.6` (Seção 12) | Sim (DELETE por status) | Não | **CONFORME** |
| **CA-09** | Bloqueio anti-cross-tenant | `v1.6` (Seção 15) | Sim (INSERT inválido) | Não | **CONFORME** |
| **CA-10** | Proteção `ON DELETE RESTRICT` | `v1.6` (Seção 16) | Sim (violação de FK) | Não | **CONFORME** |
| **CA-11** | Suíte de testes SQL 100% aprovada | `v1.6` (Seção 21) | Sim (0 falhas) | Não | **CONFORME** |
| **CA-12** | Plano C1–C6 documentado com EXPLAIN | `v1.6` (Seção 22) | Sim (planos capturados) | Não (sem threshold) | **CONFORME** |
| **CA-13** | Suíte geral intacta (49/49 testes) | Regra de Governança | Sim (npm test) | Não | **CONFORME** |

> **Observação sobre Performance:**  
> O critério **CA-12** respeitou rigorosamente a homologação do Ponto 5: ele **não estabelece o limite de 100 ms como requisito**, exigindo estritamente a execução e registro dos planos de execução do roteiro C1–C6 com `EXPLAIN (ANALYZE, BUFFERS)`.

---

## 11. Auditoria da Estratégia de Testes (Grupos A a L)

A segmentação dos testes proposta no plano executivo foi confrontada com a estratégia homologada:
- **Testes de Bootstrap Auth (Grupo A):** Validação da trigger `on_auth_user_created` e exceções de metadados;
- **Testes de Isolamento Multi-Tenant (Grupos B, C, D, H):** Validação de segregação estrita entre Tenant A e Tenant B via `SET LOCAL "request.jwt.claims"`;
- **Testes de Mutação e Regras de Negócio de RLS (Grupos E, F, G):** Validação de exclusão condicionada a `RASCUNHO` (D2), imutabilidade de `usuario_id` e regras anti-cross-tenant;
- **Testes de Sessão e Trigger (Grupos I, J):** Validação de chamadas sem token e disparos assíncronos/síncronos;
- **Testes de Fallback (Grupo K):** Validação da rota `/concluir-perfil` suportada por `usuario_insert_policy`;
- **Testes de Integridade Estrutural (Grupo L):** Validação das restrições `ON DELETE RESTRICT` físicas do Modelo Físico v1.1.

**Classificação:** Todos os 12 grupos de testes são **CONFORMES** e cobrem exaustivamente as deliberações homologadas.

---

## 12. Auditoria da Rastreabilidade Documental

A matriz de rastreabilidade (Seção 16 do plano) correlaciona adequadamente cada tópico com sua fonte canônica. Não foram identificadas seções técnicas órfãs de fundamentação, à exceção dos itens operacionais `D-PEND-03` e `D-PEND-04` destacados na Seção 9 deste relatório.

---

## 13. Quadro Geral de Divergências, Observações e Não Conformidades

```text
+---------------------------------------------------------------------------------------------------+
|                        QUADRO RESUMO DE APONTAMENTOS DA AUDITORIA                                 |
+---------------------------------------------------------------------------------------------------+
| Tipo             | Localização no Plano | Descrição do Apontamento         | Ação Recomendada     |
+------------------+----------------------+----------------------------------+----------------------+
| DIVERGÊNCIA      | Seção 2.2 (Item 4) e | Texto cita "28 policies no total | Retificar texto para |
| INTERNA          | Seção 12 (Item 2)    | (16 diretas + 12 em cadeia)",    | 31 policies reais    |
|                  |                      | mas a matriz detalha 31 policies | (19 diretas +        |
|                  |                      | reais (19 diretas + 12 cadeia).  | 12 em cadeia).       |
+------------------+----------------------+----------------------------------+----------------------+
| DECISÕES NOVAS   | Seção 15.2           | D-PEND-03 (Rate Limiting) e      | Excluir do rol de    |
| NÃO HOMOLOGADAS  | (D-PEND-03 e 04)     | D-PEND-04 (Retenção de Logs)     | pendências oficiais  |
|                  |                      | não possuem lastro canônico.     | ou reclassificar.    |
+------------------+----------------------+----------------------------------+----------------------+
| OBSERVAÇÃO       | Seção 3 (Etapa 5)    | A habilitação de RLS antes das   | Explicitar que a     |
| TÉCNICA          |                      | policies exige migration atômica | migration deve rodar |
|                  |                      | em bloco transacional único.     | em bloco BEGIN/COMMIT|
+---------------------------------------------------------------------------------------------------+
```

---

## 14. Conclusão e Parecer da Auditoria

1. O **Plano Executivo de Implementação Auth + RLS v1.0** traduz com elevado rigor técnico e fidelidade conceitual a **Estratégia consolidada v1.6**;
2. As 32 operações nas 8 tabelas de domínio estão **100% corretas e alinhadas** com as políticas de autorização, navegação em cadeia e regras anti-cross-tenant homologadas;
3. Foi identificada uma **divergência interna quantitativa** na redação introdutória (o texto cita 28 policies, enquanto a matriz especifica 31 policies reais);
4. Foram identificadas **duas decisões novas não homologadas** no catálogo de pendências (`D-PEND-03` e `D-PEND-04`), que carecem de respaldo documental canônico;
5. O presente relatório registra formalmente esses apontamentos e conclui que o plano executivo está **apto para retificação pontual e posterior homologação**.

O presente relatório de auditoria é concluído com o status de **PENDENTE DE HOMOLOGAÇÃO**.
