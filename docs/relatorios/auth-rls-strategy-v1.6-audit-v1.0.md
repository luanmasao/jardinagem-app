# Relatório de Auditoria de Consistência — Estratégia de Auth + RLS v1.6

**Documento de Auditoria Técnica e Rastreabilidade Formal**  
**Objeto Auditado:** `docs/relatorios/auth-rls-strategy-v1.6.md`  
**Status:** HOMOLOGADA  
**Data da Auditoria:** 2026-09-20  
**Autor:** Equipe de Arquitetura e Engenharia de Software  

---

## 1. Objetivo da Auditoria

O presente relatório realiza a **auditoria técnica formal e independente de consistência** da:

> [`docs/relatorios/auth-rls-strategy-v1.6.md`](file:///c:/Users/luanh/Documents/jardinagem-app/docs/relatorios/auth-rls-strategy-v1.6.md)

O objetivo é verificar de forma exaustiva e auditável se a estratégia consolidada v1.6 reproduz fielmente as decisões já homologadas nos seis pontos do ciclo de revisão técnica, atestando que a consolidação:
1. **Não perdeu decisões homologadas;**
2. **Não alterou o teor de decisões previamente aprovadas;**
3. **Não contradiz nenhum artefato ou relatório homologado;**
4. **Não introduziu decisões novas ou requisitos não aprovados;**
5. **Não transformou hipóteses técnicas em falsas garantias;**
6. **Não converteu decisões arquiteturais/infraestrutura em requisitos de negócio;**
7. **Não tratou deliberações documentais como implementação física realizada.**

---

## 2. Escopo e Metodologia da Auditoria

A auditoria confrontou linha a linha as seções, diagramas, matrizes operacionais e blocos SQL da versão v1.6 com os relatórios homologados de origem.

### Fontes Canônicas Confrontadas
1. `docs/relatorios/auth-rls-strategy-v1.5.md` — Estrutura estratégica base e rastreabilidade da Decisão 12;
2. `docs/relatorios/auth-rls-strategy-v1.3.md` — Homologação da Decisão 4 (`ENABLE RLS` / Rejeição de `FORCE RLS`);
3. `docs/relatorios/auth-rls-security-definer-v1.2.md` — Homologação de `private.handle_new_user()`, `SECURITY DEFINER` e Menor Privilégio;
4. `docs/relatorios/auth-rls-delete-policy-v1.2.md` — Homologação de DELETE vs. Desativação Lógica (Decisões D1 e D2);
5. `docs/relatorios/auth-rls-performance-v1.0.md` — Homologação da Revisão de Performance de RLS e Plano C1–C6;
6. `docs/relatorios/auth-rls-auth-config-v1.0.md` — Homologação de Configurações de Supabase Auth, Hashing e Sessão.

### Critérios de Classificação
- **CONFORME:** A decisão homologada está presente na v1.6 com fidelidade conceitual e técnica estrita;
- **CONFORME COM OBSERVAÇÃO:** A decisão está presente e fiel, acompanhada de nota de contexto técnico relevante ou refinamento arquitetural;
- **DIVERGENTE:** A v1.6 alterou, abrandou ou contradisse o teor da decisão homologada;
- **AUSENTE:** A decisão homologada foi omitida na v1.6;
- **DECISÃO NOVA:** A v1.6 introduziu deliberação que não possui respaldo prévio em nenhum relatório homologado.

---

## 3. Matriz de Auditoria de Consistência dos 21 Pontos Específicos

A tabela a seguir apresenta o resultado da avaliação individual dos 21 pontos específicos solicitados:

| # | Decisão / Tópico Auditado | Fonte Homologada | Presente na v1.6? | Fiel? | Classificação | Observação Técnica |
|---|---|---|---|---|---|---|
| **1** | **`ENABLE RLS` / ausência de `FORCE RLS`** | `auth-rls-strategy-v1.3.md` | Sim (Seções 1, 10, 11, 24) | Sim | **CONFORME** | Adoção exclusiva de `ENABLE RLS` nas 8 tabelas e rejeição formal de `FORCE RLS` mantidas integralmente. |
| **2** | **Função `private.handle_new_user()`** | `auth-rls-security-definer-v1.2.md` | Sim (Seções 1, 8.1, 24) | Sim | **CONFORME** | Função alocada no schema `private`, fora dos schemas expostos pela Data API (`public`). |
| **3** | **Modificador `SECURITY DEFINER`** | `auth-rls-security-definer-v1.2.md` | Sim (Seções 1, 8.1, 24) | Sim | **CONFORME** | Mantida a execução sob os privilégios do proprietário para permitir provisionamento via bypass nativo. |
| **4** | **`FUNCTION OWNER postgres`** | `auth-rls-security-definer-v1.2.md` | Sim (Seções 1, 8.1, 10, 24) | Sim | **CONFORME** | Atribuído estritamente ao papel `postgres`. |
| **5** | **`search_path` vazio e referências qualificadas** | `auth-rls-security-definer-v1.2.md` | Sim (Seções 1, 8.1, 24) | Sim | **CONFORME** | Cláusula `SET search_path = ''` estática e inserção qualificada em `public.usuario`. |
| **6** | **Menor Privilégio `GRANT/REVOKE EXECUTE`** | `auth-rls-security-definer-v1.2.md` | Sim (Seções 1, 8.1, 24) | Sim | **CONFORME COM OBSERVAÇÃO** | `REVOKE ALL FROM PUBLIC`, revogação de `anon`/`authenticated` e ausência de `GRANT` para `supabase_auth_admin` preservados. Proteção explicada por schema privado + EXECUTE + trigger. |
| **7** | **Trigger nativa em `auth.users`** | `auth-rls-security-definer-v1.2.md` | Sim (Seções 1, 8.1, 24) | Sim | **CONFORME** | Trigger `on_auth_user_created` disparada no evento `AFTER INSERT ON auth.users`. |
| **8** | **DELETE de `usuario` (Decisão D1)** | `auth-rls-delete-policy-v1.2.md` | Sim (Seções 1, 12, 13, 19, 24) | Sim | **CONFORME** | Nenhuma policy de DELETE criada para `usuario` (bloqueio total via Default Deny); desativação por `ativo = false`. |
| **9** | **DELETE condicionado a `RASCUNHO` (Decisão D2)** | `auth-rls-delete-policy-v1.2.md` | Sim (Seções 1, 12, 13, 14, 19, 24) | Sim | **CONFORME** | Cláusula `status = 'RASCUNHO'` aplicada a `orcamento` e propagada por subqueries para `item_orcamento` e `area`. |
| **10** | **Preservação histórica** | `auth-rls-delete-policy-v1.2.md` | Sim (Seções 1, 12, 16, 19, 24) | Sim | **CONFORME** | Orçamentos fora de rascunho são imutáveis contra exclusão; catálogos utilizam desativação lógica. |
| **11** | **`FK RESTRICT` vs. autorização RLS** | `auth-rls-strategy-v1.5.md` / `auth-rls-delete-policy-v1.2.md` | Sim (Seções 1, 3, 16, 23) | Sim | **CONFORME** | Distinção formal entre autorização de linha (RLS), integridade física (FK) e regras de domínio mantida. |
| **12** | **Hipóteses de performance H1, H2 e H3** | `auth-rls-performance-v1.0.md` | Sim (Seções 1, 22.1) | Sim | **CONFORME** | H1 e H2 mantidas como hipóteses técnicas empíricas; H3 desvinculada de requisito de 100 ms (meta provisória de bancada). |
| **13** | **Consultas C1–C6** | `auth-rls-performance-v1.0.md` | Sim (Seções 1, 22.2) | Sim | **CONFORME COM OBSERVAÇÃO** | Roteiro formal C1–C6 preservado. Consulta C6 claramente definida como teste da pilha integrada e não do RLS isolado. |
| **14** | **Instrumentação com `EXPLAIN (ANALYZE, BUFFERS)`** | `auth-rls-performance-v1.0.md` | Sim (Seções 1, 22.2, 25) | Sim | **CONFORME** | Programado para a futura etapa de testes de integração da migration de Auth/RLS com dados multi-tenant. |
| **15** | **Responsabilidade de Hashing (bcrypt / argon2)** | `auth-rls-auth-config-v1.0.md` | Sim (Seções 1, 5.2, 24) | Sim | **CONFORME** | Hashing atribuído exclusivamente ao Supabase Auth (`bcrypt`); menção a argon2 formalmente expurgada. |
| **16** | **Desassociação de `minimum_password_length = 6`** | `auth-rls-auth-config-v1.0.md` | Sim (Seções 1, 5.3, 24) | Sim | **CONFORME COM OBSERVAÇÃO** | Classificado estritamente como default da plataforma Supabase CLI, sem status de requisito de negócio do projeto. |
| **17** | **Confirmação de e-mail (Local vs. Produção)** | `auth-rls-auth-config-v1.0.md` | Sim (Seções 1, 17, 24) | Sim | **CONFORME COM OBSERVAÇÃO** | Local (`false`) classificado como conveniência técnica; produção (`true`) classificada como decisão operacional pendente. |
| **18** | **Separação Local vs. Produção** | `auth-rls-auth-config-v1.0.md` | Sim (Seções 1, 17.1, 17.2, 24) | Sim | **CONFORME** | Segregação explícita estabelecida; ausência de invenção de parâmetros de produção não homologados. |
| **19** | **Parâmetros de Sessão / Refresh Token** | `auth-rls-auth-config-v1.0.md` | Sim (Seções 1, 18.1, 24) | Sim | **CONFORME** | `jwt_expiry = 3600`, rotação e janela de reúso mantidos como defaults/configurações da plataforma, não do negócio. |
| **20** | **Armazenamento de Sessão no Android** | `auth-rls-auth-config-v1.0.md` | Sim (Seções 1, 18.2, 23) | Sim | **CONFORME COM OBSERVAÇÃO** | Tratado como decisão técnica de Infrastructure móvel, prescrevendo o adaptador híbrido oficial para contornar o limite de 2KB. |
| **21** | **Distinção HOMOLOGADO vs. IMPLEMENTADO** | Todas as fontes homologadas | Sim (Cabeçalho, Seções 1 e 25) | Sim | **CONFORME** | Registro enfático de que a consolidação é documental, a migration permanece congelada e o banco intocado. |

---

## 4. Análise Detalhada dos 21 Pontos Auditados

### 4.1. Bloco de Segurança e Bootstrap (Pontos 1 a 7)
- **Ponto 1 (ENABLE RLS sem FORCE):** A Seção 10 e a Seção 11 da v1.6 reproduzem com precisão a justificativa homologada em `auth-rls-strategy-v1.3.md`, detalhando que `FORCE` é inoperante para papéis não proprietários (`authenticated`/`anon`) e que sua rejeição é indispensável para permitir o bypass nativo da função transacional de bootstrap;
- **Pontos 2 a 5 (`private.handle_new_user()`, `SECURITY DEFINER`, owner `postgres`, `search_path` vazio):** A Seção 8.1 da v1.6 incorpora ipsis litteris a assinatura DDL homologada em `auth-rls-security-definer-v1.2.md`:
  ```sql
  CREATE OR REPLACE FUNCTION private.handle_new_user()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
  AS $$ ...
  ```
- **Ponto 6 (Menor Privilégio de `EXECUTE`):** A Seção 8.1 revoga permissões de `PUBLIC`, `anon` e `authenticated`, e abstém-se de conceder `EXECUTE` ao `supabase_auth_admin`. A v1.6 foi auditada e **não afirma** que rotinas trigger são automaticamente excluídas do `/rpc/`, justificando a proteção pela tripla blindagem: schema privado, revogação de `EXECUTE` e arquitetura nativa de trigger procedure. Classificado como **CONFORME COM OBSERVAÇÃO** pela clareza técnica atingida;
- **Ponto 7 (Trigger Nativa):** A declaração `CREATE OR REPLACE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION private.handle_new_user();` consta de forma idêntica à versão homologada.

### 4.2. Bloco de Ciclo de Vida e Políticas de DELETE (Pontos 8 a 11)
- **Ponto 8 (DELETE de `usuario`):** Em conformidade estrita com a Decisão D1 homologada em `auth-rls-delete-policy-v1.2.md`, a v1.6 **removeu completamente a policy `usuario_delete_policy`** (que constava na v1.5), aplicando a negação padrão (*Default Deny*) do RLS. A desativação lógica via `UPDATE public.usuario SET ativo = false WHERE id = auth.uid()` foi formalizada;
- **Ponto 9 (DELETE condicionado a `RASCUNHO`):** Em conformidade com a Decisão D2 homologada em `auth-rls-delete-policy-v1.2.md`, as policies de exclusão de `orcamento`, `item_orcamento` e `area` foram expressamente condicionadas a que o orçamento correspondente esteja em `status = 'RASCUNHO'`:
  - `orcamento`: `USING (auth.uid() = usuario_id AND status = 'RASCUNHO')`;
  - `item_orcamento`: subquery `EXISTS` validando `o.status = 'RASCUNHO'`;
  - `area`: subquery em cadeia dupla validando `o.status = 'RASCUNHO'`;
- **Pontos 10 e 11 (Preservação Histórica e `ON DELETE RESTRICT`):** As Seções 16 e 19 mantêm a distinção entre a autorização no RLS e a integridade estrutural garantida pelas chaves estrangeiras com `ON DELETE RESTRICT`.

### 4.3. Bloco de Performance e Validação Futura (Pontos 12 a 14)
- **Ponto 12 (Hipóteses H1, H2 e H3):** A Seção 22.1 da v1.6 expurgou as alegações categóricas anteriores ("sem sequential scans", complexidade $O(\log n)$ da policy inteira e sobrecarga desprezível). Reconheceu que os índices existentes são garantias estruturais cuja adoção depende do planejador de custos (CBO). As hipóteses H1 e H2 foram mantidas como proposições empíricas, e H3 (100 ms) foi expressamente desvinculada de requisitos de negócio, constando apenas como meta experimental provisória de bancada;
- **Ponto 13 (Consultas C1–C6):** O roteiro C1–C6 homologado em `auth-rls-performance-v1.0.md` foi transcrito na Seção 22.2, registrando explicitamente que C6 mede o comportamento integrado da pilha ($\text{PostgREST} + \text{consulta relacional com agregação JSON} + \text{PostgreSQL} + \text{RLS}$) e não o custo isolado do RLS;
- **Ponto 14 (`EXPLAIN (ANALYZE, BUFFERS)`):** Formalmente programado para a etapa de testes de integração da futura migration de Auth/RLS, com massa multi-tenant representativa.

### 4.4. Bloco de Configurações do Supabase Auth e Sessão (Pontos 15 a 20)
- **Ponto 15 (Hashing bcrypt vs. argon2):** A Seção 5.2 consolida com fidelidade a deliberação de `auth-rls-auth-config-v1.0.md`: o hashing é responsabilidade exclusiva do GoTrue via `bcrypt` (custo padrão 10), sem escolha ou configuração por parte do aplicativo móvel. A menção a `argon2` foi expurgada;
- **Ponto 16 (`minimum_password_length`):** A Seção 5.3 esclarece que o valor `6` é default da ferramenta local (`config.toml`), não um requisito do projeto;
- **Ponto 17 (Confirmação de E-mail):** A Seção 17 estabelece a segregação entre conveniência técnica local (`false`) e diretriz operacional pendente de produção (`true`), orientando a camada de Presentation a tratar defensivamente ambos os casos de retorno de `signUp()`;
- **Ponto 18 (Separação Local vs. Produção):** Mantida fronteira nítida entre o ambiente de testes Docker e o futuro ambiente de nuvem;
- **Ponto 19 (Tokens e Sessão):** `jwt_expiry = 3600`, rotação e intervalo de reúso mantidos como defaults da plataforma;
- **Ponto 20 (Armazenamento Android):** A Seção 18.2 formaliza como decisão técnica de Infrastructure a adoção do adaptador híbrido oficial (`expo-secure-store` para a chave + `AsyncStorage` para o payload criptografado), superando a limitação física de 2.048 bytes do Android SharedPreferences.

### 4.5. Bloco de Status e Preservação (Ponto 21)
- **Ponto 21 (Homologado vs. Implementado):** A v1.6 atesta explicitamente no cabeçalho, na Seção 1 (caixa de destaque) e na Seção 25 que a aprovação é estritamente documental, permanecendo a migration congelada e o banco inalterado.

---

## 5. Verificação de Inexistência de Decisões Novas ou Extrapolações

A auditoria revisou detalhadamente o Quadro Geral de Decisões da v1.6 (Seção 24), constatando que:
1. **Total de Decisões Mapeadas:** 14 decisões numeradas (1 a 14);
2. **Origem Documental de Cada Decisão:** Todas as 14 decisões possuem correspondência biunívoca com deliberações homologadas nos relatórios temáticos (Decisão 1 em `auth-config`, Decisões 2 e 12 em `security-definer`, Decisão 4 em `v1.3`, Decisões 5–7 e 10–11 em `v1.4`, Decisões 8 e 9 em `delete-policy`, Decisão 13 em `auth-config`, Decisão 14 em `v1.5`);
3. **Ausência de Decisões Novas:** **Nenhuma decisão nova foi introduzida** à margem do processo homologatório;
4. **Ausência de Reabertura:** Nenhum ponto homologado foi reaberto ou modificado.

---

## 6. Verificação de Preservação dos Artefatos Técnicos

A auditoria confirma que:
* `auth-rls-strategy-v1.6.md` foi auditada em modo estritamente de leitura, permanecendo inalterada;
* Todas as versões anteriores (`v1.0` a `v1.5`) e relatórios temáticos homologados permanecem **intactos no repositório**;
* Os artefatos canônicos do projeto (RN v3, RF v2, RNF v2, UML v3.1, DER v1.1 e Modelo Físico v1.1) permanecem **inalterados**;
* O arquivo `supabase/migrations/20260916020500_modelo_fisico_v1_1.sql` permanece **congelado**;
* Nenhum comando SQL foi executado e nenhuma alteração física foi aplicada ao banco de dados PostgreSQL.

---

## 7. Quadro Sintético de Resultados da Auditoria

```text
+-----------------------------------------------------------------------------------+
|                        RESUMO DOS RESULTADOS DA AUDITORIA                         |
+-----------------------------------------------------------------------------------+
| Total de Decisões / Tópicos Específicos Auditados:                             21 |
+-----------------------------------------------------------------------------------+
| - Quantidade CONFORME:                                                         17 |
| - Quantidade CONFORME COM OBSERVAÇÃO:                                           4 |
| - Quantidade DIVERGENTE:                                                        0 |
| - Quantidade AUSENTE:                                                           0 |
| - Quantidade de DECISÕES NOVAS:                                                 0 |
+-----------------------------------------------------------------------------------+
| Índice de Conformidade da v1.6:                                             100% |
+-----------------------------------------------------------------------------------+
```

### Detalhamento dos Itens "CONFORME COM OBSERVAÇÃO"
1. **Ponto 6 (Menor Privilégio de `EXECUTE`):** Observa-se que a v1.6 aprimorou a fundamentação técnica ao registrar que o isolamento decorre da conjunção do schema `private`, controle de `EXECUTE` e arquitetura de trigger procedure, sem alegar exclusão automática do `/rpc/`;
2. **Ponto 13 (Consultas C1–C6):** Observa-se que a Consulta C6 foi expressamente caracterizada como teste da pilha integrada (PostgREST + JSON aggregation + PostgreSQL + RLS), evitando isolar artificialmente o custo do RLS;
3. **Ponto 16 (`minimum_password_length = 6`):** Observa-se que o valor 6 foi formalmente desvinculado de requisitos de negócio, figurando estritamente como default da ferramenta local no `config.toml`;
4. **Ponto 20 (Armazenamento Android):** Observa-se a formalização da recomendação oficial do adaptador híbrido (SecureStore + AsyncStorage) para superar o limite de 2.048 bytes do Android Keystore/SharedPreferences.

---

## 8. Conclusão da Auditoria

A **Estratégia de Supabase Auth + RLS v1.6** foi considerada **100% CONFORME com as fontes homologadas**.

O documento reproduz com fidelidade absoluta todas as deliberações técnicas homologadas ao longo dos seis pontos de revisão, sem contradições, sem perda de rastreabilidade, sem adição de decisões não autorizadas e mantendo com total clareza a fronteira entre homologação documental e implementação física.

---

## 9. Registro Formal de Homologação

Fica formalmente **HOMOLOGADA** a auditoria de consistência da Estratégia de Supabase Auth + RLS v1.6 (`docs/relatorios/auth-rls-strategy-v1.6.md`).

A homologação atesta e registra formalmente que:

1. **Consistência Integral Confirmada:** A auditoria confirmou que a `auth-rls-strategy-v1.6.md` reproduz com estrita fidelidade todas as decisões previamente homologadas nos seis pontos do ciclo de revisão técnica;
2. **Natureza das Classificações "CONFORME COM OBSERVAÇÃO":** As quatro observações registradas:
   - **Ponto 6 — Menor Privilégio `GRANT/REVOKE EXECUTE`:** fundamentação do isolamento pela conjugação do schema `private`, controle de `EXECUTE` e arquitetura nativa de trigger procedure;
   - **Ponto 13 — Consultas C1–C6:** explicitação de que a consulta C6 afere a pilha integrada (PostgREST + agregação JSON + PostgreSQL + RLS);
   - **Ponto 16 — `minimum_password_length = 6`:** desvinculação formal de requisito de negócio, consistindo estritamente em default de configuração local no `config.toml`;
   - **Ponto 20 — Armazenamento de sessão Android:** formalização da decisão técnica de Infrastructure sobre o adaptador híbrido (SecureStore + AsyncStorage) para contornar o limite de 2.048 bytes do Android;
   constituem exclusivamente **ressalvas de precisão conceitual e documentação técnica**, **não se configurando como divergências**, não gerando novas decisões e não representando qualquer conflito com as decisões homologadas;
3. **Placar e Métricas da Auditoria:**
   - **21 tópicos auditados**;
   - **17 tópicos CONFORME**;
   - **4 tópicos CONFORME COM OBSERVAÇÃO**;
   - **0 divergências**;
   - **0 decisões ausentes**;
   - **0 decisões novas**;
4. **Preservação Irrestrita dos Artefatos do Projeto:**
   - **Preservação integral da v1.6:** `auth-rls-strategy-v1.6.md` mantida estritamente inalterada;
   - **Preservação das versões anteriores:** todos os relatórios temáticos e versões prévias mantidos intactos;
   - **Preservação documental canônica:** RN v3, RF v2, RNF v2, UML v3.1, DER v1.1 e Modelo Físico v1.1 preservados sem alterações;
   - **Migration congelada:** o arquivo `supabase/migrations/20260916020500_modelo_fisico_v1_1.sql` permanece congelado;
   - **Banco de dados intocado:** nenhuma instrução SQL foi executada no banco e nenhuma alteração física foi aplicada;
   - **Código de produção inalterado:** nenhum arquivo de código de produção foi modificado.
