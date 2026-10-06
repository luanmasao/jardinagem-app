# Homologação das Políticas de DELETE e Desativação Lógica — v1.2

**Documento de Fechamento Formal e Homologação — PONTO 4 DA ESTRATÉGIA DE AUTH + RLS**  
**Assunto:** Homologação formal das decisões D1 (DELETE de `usuario`) e D2 (DELETE condicionado a `RASCUNHO` para `orcamento`, `item_orcamento` e `area`).  
**Status:** HOMOLOGADA  
**Data da Homologação:** 2026-09-20  
**Versões Anteriores (Preservadas Intactas):**  
- `docs/relatorios/auth-rls-delete-policy-v1.0.md` (Análise detalhada das 8 tabelas de domínio)  
- `docs/relatorios/auth-rls-delete-policy-v1.1.md` (Micro-revisão técnica e validação das propostas D1 e D2)  
**Referência Estratégica:** `docs/relatorios/auth-rls-strategy-v1.5.md`  
**Autor:** Equipe de Arquitetura e Engenharia de Software  

---

## 1. Objetivo e Registro Formal de Homologação

O presente documento formaliza o **fechamento técnico e a HOMOLOGAÇÃO DEFINITIVA** do **Ponto 4** da Estratégia de Supabase Auth + RLS:

> *"Decidir/restringir DELETE onde a regra de negócio é desativação lógica."*

Com base nas análises exaustivas documentadas na versão v1.0 e nas validações formais de conformidade efetuadas na versão v1.1 (confrontadas com as Regras de Negócio RN v3, Requisitos RF/RNF v2, Modelo Físico v1.1, Diagramas UML e Estratégia de Auth + RLS v1.5), **as decisões D1 e D2 são formalmente APROVADAS e HOMOLOGADAS**.

> [!IMPORTANT]
> **Registro Formal de Não Implementação nesta Etapa:**  
> - Nenhuma política RLS foi criada ou aplicada no banco de dados;  
> - Nenhum comando SQL foi executado;  
> - Nenhuma migration foi criada ou modificada;  
> - O arquivo `supabase/migrations/20260916020500_modelo_fisico_v1_1.sql` permanece **congelado e inalterado**;  
> - O banco de dados PostgreSQL permanece **completamente intocado**;  
> - Nenhum código de produção da aplicação móvel foi alterado;  
> - As decisões anteriores já homologadas — **Decisão 4** (`ENABLE RLS` ativo; `FORCE RLS` rejeitado) e **Decisão 12** (`private.handle_new_user()`, `SECURITY DEFINER`, function owner `postgres`, menor privilégio) — **permanecem rigorosamente fechadas e inalteradas**.

---

## 2. Decisões Homologadas em Detalhe

### 2.1. Decisão D1 — DELETE da Tabela `usuario`
**Status:** **HOMOLOGADA**

#### Especificação Homologada:
1. **Supressão da Policy de DELETE:** Não criar policy de `DELETE` para o papel `authenticated` sobre a tabela `public.usuario`;
2. **Bloqueio Nativo via Default Deny:** Manter a negação padrão (*Default Deny*) do Row Level Security. Toda tentativa de emissão de comando `DELETE FROM public.usuario` via Supabase Data API (PostgREST) a partir do cliente móvel será sumariamente bloqueada pelo PostgreSQL;
3. **Mecanismo de Desativação no Domínio:** A suspensão ou inativação do perfil de negócio pelo próprio profissional é realizada exclusivamente por desativação lógica:
   ```sql
   UPDATE public.usuario SET ativo = false WHERE id = auth.uid();
   ```
4. **Desacoplamento entre Perfil e Identidade:** A exclusão física definitiva da conta de usuário (ex.: atendimento à LGPD/GDPR) é uma operação de ciclo de vida de identidade e governança de acesso, devendo ser orquestrada pelo Supabase Auth (via Auth Admin API / rotina de infraestrutura administrativa com credenciais privilegiadas), e **nunca** por comando DML direto executado pelo aplicativo cliente sobre a tabela de negócio.

#### Justificativa da Homologação:
- Plenamente sustentada pela **RN01** e **RN02** (o ciclo de vida do usuário é ativação/desativação; nenhuma regra prevê delete físico pelo app);
- Alinhada ao **Modelo Físico v1.1** (Seção 4 e Seção 18: `auth.uid() = USUARIO.id`) e aos diagramas de **Classes** e **Casos de Uso** (onde o jardineiro possui apenas login e logout, sem caso de uso de exclusão de perfil);
- As Chaves Estrangeiras com `ON DELETE RESTRICT` nas tabelas `cliente`, `servico`, `produto` e `orcamento` atuam como barreira complementar de **integridade referencial**, enquanto a ausência de policy RLS cumpre com rigor o papel de **autorização por linha** sob o Princípio do Menor Privilégio.

---

### 2.2. Decisão D2 — DELETE Condicionado a `RASCUNHO` (`orcamento`, `item_orcamento`, `area`)
**Status:** **HOMOLOGADA**

#### Especificação Homologada:
1. **Tabela `orcamento`:** A autorização para exclusão física é permitida exclusivamente para o proprietário e estritamente enquanto a proposta estiver em elaboração:
   ```sql
   CREATE POLICY orcamento_delete_policy ON public.orcamento
       FOR DELETE TO authenticated
       USING (
           auth.uid() = usuario_id AND
           status = 'RASCUNHO'
       );
   ```
2. **Tabela `item_orcamento`:** A autorização para exclusão física é validada por navegação relacional, sendo permitida somente quando o orçamento agregador pai estiver no estado `RASCUNHO`:
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
3. **Tabela `area`:** A autorização para exclusão física é validada por navegação relacional em cadeia, sendo permitida somente quando o orçamento raiz da medição estiver no estado `RASCUNHO`:
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

#### Justificativa da Homologação:
- Plenamente sustentada pela **RN64** e **RN65** (invariante de imutabilidade: orçamentos fora de `RASCUNHO` não podem ser editados diretamente);
- Plenamente sustentada pela **RN35** (`UC_RemoverItem`) e **RN44** (`UC_RemoverArea`), que autorizam a remoção de itens e medições poligonais exclusivamente durante a elaboração da proposta em `RASCUNHO`;
- Coerente com a **RN63**, **RN71** e com o diagrama de estados (`docs/uml/estados.puml`), que consagram a transição para **`CANCELADO`** como a operação oficial de negócio para o descarte formal de propostas já emitidas;
- Materializa a **defesa em profundidade**: como o cliente móvel opera em ambiente público e não confiável, a incorporação de `status = 'RASCUNHO'` na cláusula `USING` do RLS impede que requisições forjadas ou anomalias de interface excluam propostas comerciais já formalizadas ou aprovadas.

---

## 3. Matriz Final das Decisões Homologadas

A tabela a seguir consolida a matriz completa de tratamento da operação `DELETE` para as 8 tabelas de domínio da aplicação:

| Tabela | Status da Decisão | Diretiva de DELETE Físico | Mecanismo de Ciclo de Vida | Política RLS Homologada (Cláusula `USING`) | Papel da Integridade Referencial (FK) |
|---|---|---|---|---|---|
| **`usuario`** | **HOMOLOGADA (D1)** | **PROIBIDO** para `authenticated` | Desativação Lógica (`ativo = false`, RN02) | **NENHUMA POLICY DE DELETE** *(Default Deny pelo RLS)*. Suspensão via `UPDATE public.usuario SET ativo = false`. | 4 FKs `RESTRICT` (`cliente`, `servico`, `produto`, `orcamento`) garantem que o perfil não possa ser deletado se houver histórico. |
| **`cliente`** | **HOMOLOGADA** | **RESTRITO** | Desativação Lógica (`ativo = false`, RN04) | `USING (auth.uid() = usuario_id)` | FK `orcamento.cliente_id -> cliente.id ON DELETE RESTRICT` bloqueia fisicamente o DELETE se houver orçamentos. Se sem orçamentos, limpa `endereco` via `CASCADE`. |
| **`endereco`** | **HOMOLOGADA** | **PERMITIDO** | Não se aplica (sem `ativo`, RN05) | `USING (EXISTS (SELECT 1 FROM public.cliente c WHERE c.id = endereco.cliente_id AND c.usuario_id = auth.uid()))` | `endereco.cliente_id REFERENCES cliente(id) ON DELETE CASCADE` propaga exclusão automática ao apagar o cliente proprietário. |
| **`servico`** | **HOMOLOGADA** | **RESTRITO** | Desativação Lógica (`ativo = false`, RN14) | `USING (auth.uid() = usuario_id)` | FK `item_orcamento.servico_id -> servico.id ON DELETE RESTRICT` impede a remoção física de serviços vinculados a propostas históricas. |
| **`produto`** | **HOMOLOGADA** | **RESTRITO** | Desativação Lógica (`ativo = false`, RN18) | `USING (auth.uid() = usuario_id)` | FK `item_orcamento.produto_id -> produto.id ON DELETE RESTRICT` impede a remoção física de produtos vinculados a propostas históricas. |
| **`orcamento`** | **HOMOLOGADA (D2)** | **CONDICIONADO** | Máquina de Estados (`CANCELADO`, RN63) | `USING (auth.uid() = usuario_id AND status = 'RASCUNHO')` | FK `item_orcamento.orcamento_id -> orcamento.id ON DELETE RESTRICT` impede a exclusão do orçamento caso existam itens não tratados. |
| **`item_orcamento`** | **HOMOLOGADA (D2)** | **CONDICIONADO** | Não se aplica (sem `ativo`, RN35, RN64) | `USING (EXISTS (SELECT 1 FROM public.orcamento o WHERE o.id = item_orcamento.orcamento_id AND o.usuario_id = auth.uid() AND o.status = 'RASCUNHO'))` | FK `area.item_orcamento_id REFERENCES item_orcamento(id) ON DELETE CASCADE` limpa medições vinculadas ao remover o item. |
| **`area`** | **HOMOLOGADA (D2)** | **CONDICIONADO** | Não se aplica (sem `ativo`, RN44, RN64) | `USING (EXISTS (SELECT 1 FROM public.item_orcamento io JOIN public.orcamento o ON o.id = io.orcamento_id WHERE io.id = area.item_orcamento_id AND o.usuario_id = auth.uid() AND o.status = 'RASCUNHO'))` | Não possui dependentes. Removida em cascata se o item pai for deletado. |

---

## 4. SQL Conceitual Homologado (Políticas de DELETE)

Apresenta-se o bloco de SQL conceitual contendo a especificação formal homologada das políticas de `DELETE` para futura materialização na migration dedicada de Auth/RLS.

> [!CAUTION]
> **SQL HOMOLOGADO — NÃO EXECUTAR (Implementação Física Pendente)**  
> O código abaixo consolida a especificação técnica formal para implementação futura. Nenhuma instrução DDL foi executada no banco de dados e nenhuma migration foi gerada nesta etapa.

```sql
-- ============================================================================
-- SQL HOMOLOGADO — NÃO EXECUTAR (Especificação Formal v1.2 — Implementação Pendente)
-- ============================================================================

-- 1. USUARIO (D1 HOMOLOGADA: NENHUMA POLICY DE DELETE PARA AUTHENTICATED)
-- Default Deny ativo: authenticated não possui permissão de DELETE em public.usuario.
-- Desativação/suspensão governada por:
-- UPDATE public.usuario SET ativo = false WHERE id = auth.uid();

-- 2. CLIENTE (RESTRITO: Integridade garantida por FK RESTRICT)
CREATE POLICY cliente_delete_policy ON public.cliente
    FOR DELETE TO authenticated
    USING (auth.uid() = usuario_id);

-- 3. ENDERECO (PERMITIDO: Navegação por cadeia via cliente proprietário)
CREATE POLICY endereco_delete_policy ON public.endereco
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.cliente c
            WHERE c.id = endereco.cliente_id AND c.usuario_id = auth.uid()
        )
    );

-- 4. SERVICO (RESTRITO: Integridade garantida por FK RESTRICT)
CREATE POLICY servico_delete_policy ON public.servico
    FOR DELETE TO authenticated
    USING (auth.uid() = usuario_id);

-- 5. PRODUTO (RESTRITO: Integridade garantida por FK RESTRICT)
CREATE POLICY produto_delete_policy ON public.produto
    FOR DELETE TO authenticated
    USING (auth.uid() = usuario_id);

-- 6. ORCAMENTO (D2 HOMOLOGADA: Condicionado ao status RASCUNHO)
CREATE POLICY orcamento_delete_policy ON public.orcamento
    FOR DELETE TO authenticated
    USING (
        auth.uid() = usuario_id AND
        status = 'RASCUNHO'
    );

-- 7. ITEM_ORCAMENTO (D2 HOMOLOGADA: Orçamento pai deve estar em RASCUNHO)
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

-- 8. AREA (D2 HOMOLOGADA: Orçamento raiz da cadeia deve estar em RASCUNHO)
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

---

## 5. Rastreabilidade e Próximos Passos

1. **Rastreabilidade:**  
   - O Ponto 4 encontra-se **definitivamente homologado**;
   - Os artefatos anteriores `docs/relatorios/auth-rls-delete-policy-v1.0.md` e `docs/relatorios/auth-rls-delete-policy-v1.1.md` permanecem arquivados como histórico completo da fundamentação;
   - As decisões D1 e D2 estão formalmente fechadas;
2. **Próximos Passos:**  
   - Consolidar as decisões homologadas de DELETE na próxima revisão documental da estratégia geral (`auth-rls-strategy`), mantendo estrita rastreabilidade;
   - Prosseguir com a revisão técnica dos pontos remanescentes pendentes da estratégia geral quando solicitado;
   - A criação da migration física correspondente ocorrerá somente após o fechamento e a autorização explícita de todo o pacote de Auth/RLS.
