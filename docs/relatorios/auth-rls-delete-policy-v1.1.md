# Micro-Revisão Técnica: Validação Formal das Propostas D1 e D2 (Políticas de DELETE) v1.1

**Micro-Revisão Técnica Exclusiva das Propostas D1 e D2 da Revisão de DELETE**  
**Assunto:** Validação formal e confronto das decisões D1 (DELETE de `usuario`) e D2 (DELETE condicionado a `RASCUNHO` em `orcamento`, `item_orcamento` e `area`).  
**Status:** PENDENTE DE HOMOLOGAÇÃO  
**Data:** 2026-09-20  
**Documentos de Referência:**  
- `docs/relatorios/auth-rls-delete-policy-v1.0.md` (Relatório base preservado intacto)  
- `docs/relatorios/auth-rls-strategy-v1.5.md` (Estratégia geral preservada intacta)  
**Autor:** Equipe de Arquitetura e Engenharia de Software  

---

## 1. Objetivo

Esta micro-revisão técnica tem como objetivo **validar formal e exclusivamente** as duas propostas técnicas pendentes identificadas e formuladas no relatório `docs/relatorios/auth-rls-delete-policy-v1.0.md`:

1. **Proposta D1 — Tratamento da Operação DELETE na Tabela `usuario`:**  
   Avaliar a correção técnica e arquitetural de suprimir a policy de `DELETE` para o papel `authenticated` em `public.usuario`, mantendo a negação padrão (*Default Deny*) do RLS, utilizando a desativação lógica (`UPDATE ... SET ativo = false`) como operação ordinária de negócio e reservando a exclusão definitiva ao ciclo de vida da identidade no Supabase Auth.
2. **Proposta D2 — Condicionamento do DELETE ao Estado `RASCUNHO` (`orcamento`, `item_orcamento`, `area`):**  
   Avaliar a correção técnica de condicionar as policies de `DELETE` das entidades de orçamento, itens e áreas ao estado `status = 'RASCUNHO'` (no orçamento ou por navegação até o orçamento pai), garantindo a defesa em profundidade da invariante de imutabilidade de propostas comerciais formalizadas.

> [!IMPORTANT]
> **Escopo Restrito e Não Reabertura:**  
> A presente revisão restringe-se exclusivamente a D1 e D2. As decisões já homologadas no projeto — **Decisão 4** (`ENABLE ROW LEVEL SECURITY` sem `FORCE`) e **Decisão 12** (trigger nativa, função `private.handle_new_user()`, `SECURITY DEFINER` sob o function owner `postgres`, menor privilégio) — permanecem congeladas e intocadas.  
> Não há implementação de código, migrations, triggers ou policies nesta etapa. O arquivo `supabase/migrations/20260916020500_modelo_fisico_v1_1.sql` permanece congelado.

---

## 2. D1 — DELETE da Tabela `usuario`

### 2.1. Formulação da Proposta D1
- **Ação no RLS:** Não criar policy de `DELETE` para o papel `authenticated` sobre a tabela `public.usuario`;
- **Comportamento Resultante:** O PostgreSQL aplica a regra nativa de *Default Deny* (Negação Padrão) do RLS. Qualquer comando `DELETE FROM public.usuario` despachado via Supabase Data API (PostgREST) por usuário autenticado resultará em 0 linhas afetadas ou erro de autorização;
- **Ciclo de Vida no Domínio:** A suspensão ou encerramento das atividades do profissional é realizada mediante desativação lógica:  
  `UPDATE public.usuario SET ativo = false WHERE id = auth.uid()`;
- **Encerramento Definitivo de Identidade:** O expurgo integral dos dados de conta (ex.: atendimento à LGPD/GDPR) é tratado como operação de infraestrutura e governança de identidade (via Supabase Auth Admin API: `supabase.auth.admin.deleteUser()`), nunca por DML direto originado do cliente móvel.

### 2.2. Evidências Encontradas nas Fontes Oficiais

1. **Regras de Negócio (RN v3):**
   - **RN01:** Estabelece os atributos do usuário (`id`, `nome` obrigatório, `telefone` opcional, `dataCadastro`, `ativo`);
   - **RN02:** *"O usuário pode ser ativado ou desativado no sistema."*  
     A RN v3 não prevê, em nenhuma regra, a exclusão física da entidade de usuário pelo aplicativo. O ciclo de vida previsto pelo negócio é estritamente a alternância entre ativo e inativo;
2. **Modelo Físico v1.1 (`docs/modelo-fisico-v1.1.md`):**
   - **Seção 4 (`USUARIO`):** Define a coluna `ativo BOOLEAN NOT NULL DEFAULT TRUE`. Explicita: *"A autenticação e as credenciais são responsabilidade do Supabase Auth"*, *"Não duplicar o email do Supabase Auth em USUARIO"*, e *"USUARIO.id corresponde à identidade autenticada do Supabase Auth"*;
   - **Seção 18 (`Segurança e Isolamento`):** Formaliza o vínculo biunívoco `auth.uid() = USUARIO.id`;
3. **Diagramas UML Vigentes:**
   - **Classes v3.1 (`docs/uml/classes.puml`):** A classe `Usuario` define os métodos `ativar()`, `desativar()` e `atualizarDados()`. Não existe operação ou método `excluir()` ou `deletar()`;
   - **Casos de Uso v3.1 (`docs/uml/casos_de_uso.puml`):** O pacote *Autenticação* contém apenas `UC_Login` (*Realizar login*) e `UC_Logout` (*Encerrar sessão*). Não há caso de uso para exclusão de conta via cliente móvel;
4. **Estratégia de Supabase Auth + RLS v1.5 (`docs/relatorios/auth-rls-strategy-v1.5.md`):**
   - **Premissa 1 (Seção 3):** Separação estrita entre Identidade (`auth.users`) e Perfil de Negócio (`public.usuario`);
   - **Premissa 3 (Seção 3):** Cliente móvel (Android) não confiável. O cliente opera com a `anon_key` e JWT de usuário;
   - **Decisão 12 (Homologada):** A criação de `public.usuario` é governada pela trigger nativa `AFTER INSERT ON auth.users`. Se o perfil pudesse ser deletado fisicamente pelo cliente via Data API, a conta continuaria viva no Auth, gerando um estado de descompasso arquitetural crítico (JWT ativo sem perfil correspondente).

### 2.3. O Papel das Chaves Estrangeiras `ON DELETE RESTRICT`
- A tabela `public.usuario` é referenciada por 4 Chaves Estrangeiras configuradas com `ON DELETE RESTRICT`:
  - `cliente.usuario_id REFERENCES usuario(id) ON DELETE RESTRICT`
  - `servico.usuario_id REFERENCES usuario(id) ON DELETE RESTRICT`
  - `produto.usuario_id REFERENCES usuario(id) ON DELETE RESTRICT`
  - `orcamento.usuario_id REFERENCES usuario(id) ON DELETE RESTRICT`
- **Distinção Rigorosa:**  
  - A Chave Estrangeira `ON DELETE RESTRICT` **não é e não deve ser confundida com autorização RLS**. A FK é uma constraint física de banco que garante a integridade referencial relacional, impedindo a criação de registros órfãos caso um comando DML seja executado;
  - A decisão de não conceder policy de `DELETE` em `usuario` para `authenticated` é uma **decisão legítima de autorização RLS**: mesmo que um usuário recém-cadastrado não possua nenhum cliente ou orçamento (onde a FK não impediria o DELETE), a operação de apagar o perfil pelo cliente móvel é arquiteturalmente inválida pois desassocia a identidade do Auth;
  - Portanto, a FK `RESTRICT` atua como **segunda linha de defesa** para a integridade estrutural, enquanto a ausência de policy RLS cumpre a **primeira linha de defesa** na camada de autorização do PostgreSQL.

### 2.4. Conclusão sobre D1
- **Status:** **CONFIRMADA**.
- **Justificativa:** Tecnicamente irretocável e plenamente sustentada por RN01, RN02, Modelo Físico v1.1, UML de Classes e Casos de Uso, e pela arquitetura de separação Auth/Perfil homologada na v1.5.

---

## 3. D2 — DELETE Condicionado a `RASCUNHO`

### 3.1. Formulação da Proposta D2
- **Tabela `orcamento`:** Policy de `DELETE` restrita à propriedade e ao estado rascunho:
  ```sql
  CREATE POLICY orcamento_delete_policy ON public.orcamento
      FOR DELETE TO authenticated
      USING (
          auth.uid() = usuario_id AND
          status = 'RASCUNHO'
      );
  ```
- **Tabela `item_orcamento`:** Policy de `DELETE` restrita por navegação relacional ao orçamento pai em rascunho:
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
- **Tabela `area`:** Policy de `DELETE` restrita por navegação relacional em cadeia ao orçamento raiz em rascunho:
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

### 3.2. Evidências Encontradas nas Fontes Oficiais

1. **Regras de Negócio (RN v3):**
   - **RN64:** *"Orçamentos nos status ENVIADO, EM_ANALISE, APROVADO, RECUSADO, EXPIRADO, CANCELADO e CONCLUIDO não podem ser editados diretamente."*;
   - **RN65:** *"Somente orçamentos no status RASCUNHO podem ter seus dados gerais, itens, medições e descontos alterados diretamente."*;
   - **RN35:** *"Permite a remoção de um item do orçamento durante a elaboração da proposta."*;
   - **RN44:** *"Permite a remoção de uma área associada a um item durante a medição ou elaboração da proposta."*;
   - **RN63:** Define as transições válidas. Para descarte ou desistência formal de propostas já criadas ou enviadas, o sistema adota a transição para **`CANCELADO`** (a partir de `RASCUNHO`, `ENVIADO` ou `EM_ANALISE`);
   - **RN71:** Proíbe terminantemente a reabertura ou mutação de orçamentos em estados finais;
2. **Diagramas UML Vigentes:**
   - **Máquina de Estados (`docs/uml/estados.puml`):**
     - `RASCUNHO`: Nota explícita: *"Pode estar incompleto e permanecer editável. Pode ser salvo sem itens. Não expira automaticamente."*;
     - `ENVIADO`, `EM_ANALISE`, `APROVADO`: Notas explícitas: *"Não pode ser editado diretamente."*;
     - `CANCELADO`, `RECUSADO`, `EXPIRADO`, `CONCLUIDO`: Estados terminais com transição direta para o encerramento (`[*]`);
   - **Casos de Uso (`docs/uml/casos_de_uso.puml`):**
     - O ator *Jardineiro* possui `UC_RemoverItem` (*Remover item do orçamento*) e `UC_RemoverArea` (*Remover área*), que estendem o fluxo de edição de propostas em elaboração;
     - Não existe caso de uso de "Excluir orçamento finalizado". O caso de uso `UC_Status` (*Gerenciar status do orçamento*) é quem governa a mudança de estado (incluindo o cancelamento);
   - **Classes v3.1 (`docs/uml/classes.puml`):**
     - A classe `Orcamento` expõe os métodos `adicionarItem()`, `removerItem()`, `cancelar()`, etc., todos guardados pelo invariante `assegurarEditavel()` (`this.status === StatusOrcamento.RASCUNHO`);
3. **Modelo Físico v1.1 (`docs/modelo-fisico-v1.1.md`):**
   - **Seção 17 (`Exclusão e preservação histórica`):** *"Para dependências internas: ORCAMENTO -> ITEM_ORCAMENTO -> AREA as regras de exclusão devem preservar a integridade do histórico e evitar registros órfãos."*;
   - **Seção 21.23:** *"O histórico de itens é independente do estado atual do catálogo."*

### 3.3. Natureza da Regra: Autorização RLS vs. Regra de Negócio
- **A regra de negócio determina:** Propostas enviadas ou aprovadas são imutáveis e históricas (RN64). Itens e medições só podem ser adicionados ou removidos enquanto o orçamento estiver em rascunho (RN35, RN44, RN65);
- **O RLS aplica a defesa em profundidade:** O cliente móvel Android é um ambiente público e não confiável. Se as policies RLS de `DELETE` verificassem apenas `auth.uid() = usuario_id`, uma falha de software no app ou uma requisição direta manipulada via HTTP/PostgREST poderia deletar um orçamento `APROVADO`, ou expurgar itens de uma proposta comercial enviada;
- Ao incorporar `AND status = 'RASCUNHO'` na cláusula `USING` do RLS:
  1. A invariante de negócio é **blindada diretamente no banco de dados**;
  2. A remoção de itens e áreas é **plenamente autorizada durante o estado `RASCUNHO`** (atendendo integralmente a `UC_RemoverItem`, `UC_RemoverArea`, RN35 e RN44);
  3. A remoção de itens, áreas ou do próprio orçamento é **bloqueada de forma transparente após a proposta sair de `RASCUNHO`** (o PostgreSQL filtra a linha e retorna 0 linhas afetadas, sem permitir corrupção de histórico);
  4. Para descartar orçamentos formalizados, a regra de negócio de cancelamento (`status = 'CANCELADO'`) opera via comando `UPDATE`, preservando a auditoria.

### 3.4. Conclusão sobre D2
- **Status:** **CONFIRMADA**.
- **Justificativa:** Coerência absoluta entre o Domínio (RN35, RN44, RN64, RN65), os diagramas UML (Estados e Casos de Uso), o Modelo Físico v1.1 e o princípio de defesa em profundidade do RLS.

---

## 4. Matriz de Compatibilidade com Artefatos Vigentes

| Dimensão de Análise | Proposta D1 (`usuario`) | Proposta D2 (`orcamento`, `item_orcamento`, `area`) |
|---|---|---|
| **Regras de Negócio (RN v3)** | **100% Compatível:** Atende a RN01 e RN02 (ciclo de vida é ativação/desativação). Nenhuma RN prevê delete físico de usuário. | **100% Compatível:** Atende rigorosamente a RN35, RN44 (remoção em elaboração), RN64, RN65 (imutabilidade pós-rascunho) e RN63 (descarte via `CANCELADO`). |
| **Modelo Físico v1.1** | **100% Compatível:** Respeita a Seção 4 (relação Auth/Perfil) e a Seção 18. Não conflita com FKs `RESTRICT`. | **100% Compatível:** Respeita a Seção 17 (preservação do histórico em `ORCAMENTO -> ITEM_ORCAMENTO -> AREA`) e Seção 21.23. |
| **Diagrama de Classes v3.1** | **100% Compatível:** Métodos `ativar()` e `desativar()`. Ausência de método destrutivo na entidade. | **100% Compatível:** Métodos `removerItem()` e `removerArea()` condicionados a `status === RASCUNHO`. |
| **Diagrama de Estados v3.1** | **Não se aplica** (usuário não possui máquina de estados). | **100% Compatível:** Reflete fielmente as notas de `estados.puml` onde apenas `RASCUNHO` é editável e estados finais são terminais. |
| **Diagrama de Casos de Uso v3.1** | **100% Compatível:** Sem caso de uso de exclusão de usuário pelo Jardineiro. | **100% Compatível:** Suporta exatamente `UC_RemoverItem` e `UC_RemoverArea` no contexto de elaboração. |
| **Estratégia Auth + RLS v1.5** | **100% Compatível:** Aplica o princípio de menor privilégio e Default Deny, sem afetar decisões homologadas. | **100% Compatível:** Aprimora a Seção 13, 14 e 15 da estratégia v1.5, fechando a brecha de deleção acidental de dados históricos. |

---

## 5. Conclusão das Duas Propostas

Ambas as propostas foram submetidas ao crivo estrito das fontes oficiais e o diagnóstico técnico conclui que:

1. **Proposta D1 (`usuario`):**
   - **Resultado:** **CONFIRMADA**.
   - **Diagnóstico:** Não necessita de nenhum ajuste. O não provisionamento de policy de DELETE para `authenticated` sobre `public.usuario` é a única conduta segura perante o Supabase Auth, alinhada à RN02 e ao Modelo Físico. A presença de FKs `RESTRICT` atua como salvaguarda relacional complementar, mas não substitui a negação no RLS.
2. **Proposta D2 (`orcamento`, `item_orcamento`, `area`):**
   - **Resultado:** **CONFIRMADA**.
   - **Diagnóstico:** Não necessita de nenhum ajuste. Condicionar a autorização RLS de DELETE a `status = 'RASCUNHO'` reflete com exatidão a fronteira entre propostas em elaboração (onde a exclusão é livre e necessária) e propostas formalizadas (onde a exclusão é proibida e a regra de negócio exige preservação histórica e cancelamento formal via estado).

---

## 6. Decisão Proposta para Homologação

Submete-se à homologação formal o seguinte conjunto de diretivas:

```text
+---------------------------------------------------------------------------------------------------------+
|                                    DECISÕES VALIDADAS PARA HOMOLOGAÇÃO                                  |
+---------------------------------------------------------------------------------------------------------+
| D1 — DELETE DE USUARIO:                                                                                 |
| - Não criar policy de DELETE para o papel authenticated em public.usuario;                              |
| - Manter o bloqueio nativo via Default Deny do RLS;                                                    |
| - Suspensão e inativação de conta de usuário governadas exclusivamente por:                            |
|   UPDATE public.usuario SET ativo = false WHERE id = auth.uid();                                        |
| - Encerramento definitivo de identidade mantido como fluxo administrativo do Supabase Auth.             |
+---------------------------------------------------------------------------------------------------------+
| D2 — DELETE CONDICIONADO A RASCUNHO:                                                                    |
| - orcamento:                                                                                            |
|   CREATE POLICY orcamento_delete_policy ON public.orcamento                                             |
|       FOR DELETE TO authenticated                                                                       |
|       USING (auth.uid() = usuario_id AND status = 'RASCUNHO');                                          |
|                                                                                                         |
| - item_orcamento:                                                                                       |
|   CREATE POLICY item_orcamento_delete_policy ON public.item_orcamento                                   |
|       FOR DELETE TO authenticated                                                                       |
|       USING (EXISTS (                                                                                   |
|           SELECT 1 FROM public.orcamento o                                                              |
|           WHERE o.id = item_orcamento.orcamento_id                                                      |
|             AND o.usuario_id = auth.uid()                                                               |
|             AND o.status = 'RASCUNHO'                                                                   |
|       ));                                                                                               |
|                                                                                                         |
| - area:                                                                                                 |
|   CREATE POLICY area_delete_policy ON public.area                                                       |
|       FOR DELETE TO authenticated                                                                       |
|       USING (EXISTS (                                                                                   |
|           SELECT 1 FROM public.item_orcamento io                                                        |
|           JOIN public.orcamento o ON o.id = io.orcamento_id                                             |
|           WHERE io.id = area.item_orcamento_id                                                          |
|             AND o.usuario_id = auth.uid()                                                               |
|             AND o.status = 'RASCUNHO'                                                                   |
|       ));                                                                                               |
+---------------------------------------------------------------------------------------------------------+
```
