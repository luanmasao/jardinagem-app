# Validação Real da Migration — Modelo Físico v1.1

**Data da Validação:** 2026-09-18  
**Artefato Auditado:** `supabase/migrations/20260916020500_modelo_fisico_v1_1.sql`  
**Referência Oficial:** `docs/modelo-fisico-v1.1.md`  

---

## 1. Ambiente

As versões reais utilizadas durante a validação dinâmica no ambiente local foram:

- **Sistema Operacional:** Windows 11 (Kernel WSL2 Linux 6.18.33.2-microsoft-standard-WSL2)
- **Docker Engine / Desktop:** Docker Desktop 29.8.0 (Build v0.37.0 / Compose v5.5.1)
- **PostgreSQL:** PostgreSQL 17.6 on x86_64-pc-linux-gnu, compiled by gcc (GCC) 15.2.0, 64-bit
- **PostGIS:** PostGIS 3.3.7
- **Supabase CLI:** 2.117.0
- **Node.js:** v22.19.0
- **npm:** 10.9.3

---

## 2. Supabase local

Resultado da consulta de status operacional via `npx supabase status`:

```text
Stopped services: [supabase_imgproxy_jardinagem-app supabase_pooler_jardinagem-app]
DB_URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
API_URL: http://127.0.0.1:54321
REST_URL: http://127.0.0.1:54321/rest/v1
GRAPHQL_URL: http://127.0.0.1:54321/graphql/v1
FUNCTIONS_URL: http://127.0.0.1:54321/functions/v1
STUDIO_URL: http://127.0.0.1:54323
MAILPIT_URL: http://127.0.0.1:54324
STORAGE_S3_URL: http://127.0.0.1:54321/storage/v1/s3
```

Containers ativos e saudáveis inspecionados via Docker:
- `supabase_db_jardinagem-app`
- `supabase_studio_jardinagem-app`
- `supabase_pg_meta_jardinagem-app`
- `supabase_edge_runtime_jardinagem-app`
- `supabase_storage_jardinagem-app`
- `supabase_rest_jardinagem-app`
- `supabase_realtime_jardinagem-app`
- `supabase_inbucket_jardinagem-app`
- `supabase_auth_jardinagem-app`
- `supabase_kong_jardinagem-app`
- `supabase_vector_jardinagem-app`
- `supabase_analytics_jardinagem-app`

---

## 3. Execução

O comando de reset reproduzível foi executado para garantir a integridade da recriação a partir das migrations versionadas:

```bash
npx supabase db reset
```

**Log de Execução Obtido:**
```text
Resetting local database...
Recreating database...
Initialising schema...
Seeding globals from roles.sql...
Skipping migration .gitkeep... (file name must match pattern "<timestamp>_name.sql")
Applying migration 20260916020500_modelo_fisico_v1_1.sql...
WARN: no files matched pattern: supabase/seed.sql
Restarting containers...
Finished supabase db reset on branch master.
{"target":"local","version":"","message":"Reset local database."}
```
**Código de saída:** `0` (Sucesso absoluto).

---

## 4. Validação estrutural

As verificações foram executadas diretamente no PostgreSQL local (`supabase_db_jardinagem-app`) com os seguintes resultados:

### 4.1. Extensão PostGIS
- Extensão instalada no schema `public`: `postgis` versão `3.3.7`.

### 4.2. Tabelas
Exatamente 8 tabelas de domínio criadas (além da tabela interna de referência espacial `spatial_ref_sys` do PostGIS):
1. `usuario`
2. `cliente`
3. `endereco`
4. `servico`
5. `produto`
6. `orcamento`
7. `item_orcamento`
8. `area`

### 4.3. Tipos Enumerados (Enums)
Exatamente 3 tipos enumerados criados no schema `public`:
1. `status_orcamento`: `RASCUNHO`, `ENVIADO`, `EM_ANALISE`, `APROVADO`, `RECUSADO`, `EXPIRADO`, `CANCELADO`, `CONCLUIDO`
2. `tipo_desconto`: `PERCENTUAL`, `FIXO`
3. `tipo_item`: `SERVICO`, `PRODUTO`

### 4.4. Chaves Primárias (PKs)
Exatamente 8 chaves primárias verificadas:
1. `usuario_pkey` em `usuario(id)`
2. `cliente_pkey` em `cliente(id)`
3. `endereco_pkey` em `endereco(id)`
4. `servico_pkey` em `servico(id)`
5. `produto_pkey` em `produto(id)`
6. `orcamento_pkey` em `orcamento(id)`
7. `item_orcamento_pkey` em `item_orcamento(id)`
8. `area_pkey` em `area(id)`

### 4.5. Chaves Estrangeiras (FKs)
Exatamente 10 chaves estrangeiras verificadas com seus respectivos comportamentos de exclusão:
1. `area_item_orcamento_id_fkey`: `area(item_orcamento_id)` → `item_orcamento(id)` (`ON DELETE CASCADE`)
2. `cliente_usuario_id_fkey`: `cliente(usuario_id)` → `usuario(id)` (`ON DELETE RESTRICT`)
3. `endereco_cliente_id_fkey`: `endereco(cliente_id)` → `cliente(id)` (`ON DELETE CASCADE`)
4. `item_orcamento_orcamento_id_fkey`: `item_orcamento(orcamento_id)` → `orcamento(id)` (`ON DELETE RESTRICT`) — **Confirmado ON DELETE RESTRICT**
5. `item_orcamento_produto_id_fkey`: `item_orcamento(produto_id)` → `produto(id)` (`ON DELETE RESTRICT`)
6. `item_orcamento_servico_id_fkey`: `item_orcamento(servico_id)` → `servico(id)` (`ON DELETE RESTRICT`)
7. `orcamento_cliente_id_fkey`: `orcamento(cliente_id)` → `cliente(id)` (`ON DELETE RESTRICT`)
8. `orcamento_usuario_id_fkey`: `orcamento(usuario_id)` → `usuario(id)` (`ON DELETE RESTRICT`)
9. `produto_usuario_id_fkey`: `produto(usuario_id)` → `usuario(id)` (`ON DELETE RESTRICT`)
10. `servico_usuario_id_fkey`: `servico(usuario_id)` → `usuario(id)` (`ON DELETE RESTRICT`)

### 4.6. Restrições de Unicidade (UNIQUE)
- `endereco_cliente_id_key`: `UNIQUE(cliente_id)` em `endereco` — relação 1:1 estrita.
- `orcamento_usuario_id_numero_key`: `UNIQUE(usuario_id, numero)` em `orcamento` — unicidade por usuário.

### 4.7. CHECK Constraints
Exatamente 15 CHECK constraints ativas no banco:
1. `area_area_calculada_check`: `CHECK (area_calculada > 0)`
2. `area_geometria_nao_vazia_check`: `CHECK (NOT ST_IsEmpty(geometria))`
3. `area_geometria_valida_check`: `CHECK (ST_IsValid(geometria))`
4. `endereco_latitude_check`: `CHECK (latitude IS NULL OR (latitude >= -90.0 AND latitude <= 90.0))`
5. `endereco_longitude_check`: `CHECK (longitude IS NULL OR (longitude >= -180.0 AND longitude <= 180.0))`
6. `item_orcamento_quantidade_check`: `CHECK (quantidade >= 0)`
7. `item_orcamento_servico_xor_produto_check`: `CHECK ((tipo = 'SERVICO' AND servico_id IS NOT NULL AND produto_id IS NULL) OR (tipo = 'PRODUTO' AND produto_id IS NOT NULL AND servico_id IS NULL AND usa_medicao_area = false))`
8. `item_orcamento_valor_total_check`: `CHECK (valor_total >= 0)`
9. `item_orcamento_valor_unitario_check`: `CHECK (valor_unitario >= 0)`
10. `orcamento_desconto_check`: `CHECK (((tipo_desconto IS NULL) AND (valor_desconto = 0)) OR ((tipo_desconto = 'PERCENTUAL') AND (valor_desconto >= 0) AND (valor_desconto <= 100)) OR ((tipo_desconto = 'FIXO') AND (valor_desconto >= 0) AND (valor_desconto <= subtotal)))`
11. `orcamento_subtotal_check`: `CHECK (subtotal >= 0)`
12. `orcamento_total_check`: `CHECK (total >= 0)`
13. `orcamento_valor_desconto_check`: `CHECK (valor_desconto >= 0)`
14. `produto_preco_base_check`: `CHECK (preco_base >= 0)`
15. `servico_preco_base_check`: `CHECK (preco_base >= 0)`

### 4.8. Geometria Espacial
- Coluna `area.geometria`: `GEOMETRY(POLYGON, 4326)` (tipo: `POLYGON`, SRID: `4326`, dimensão: `2`).

### 4.9. Índices
Exatamente 11 índices adicionais homologados (além dos índices das PKs e UNIQUE):
1. `idx_area_geometria`: Spatial index GiST em `area(geometria)`
2. `idx_area_item_orcamento_id`: B-Tree em `area(item_orcamento_id)`
3. `idx_cliente_usuario_id`: B-Tree em `cliente(usuario_id)`
4. `idx_item_orcamento_orcamento_id`: B-Tree em `item_orcamento(orcamento_id)`
5. `idx_item_orcamento_produto_id`: B-Tree em `item_orcamento(produto_id)`
6. `idx_item_orcamento_servico_id`: B-Tree em `item_orcamento(servico_id)`
7. `idx_orcamento_cliente_id`: B-Tree em `orcamento(cliente_id)`
8. `idx_orcamento_status`: B-Tree em `orcamento(status)`
9. `idx_orcamento_usuario_id`: B-Tree em `orcamento(usuario_id)`
10. `idx_produto_usuario_id`: B-Tree em `produto(usuario_id)`
11. `idx_servico_usuario_id`: B-Tree em `servico(usuario_id)`

### 4.10. Valores Padrão (DEFAULTs)
- `gen_random_uuid()`: `area.id`, `cliente.id`, `endereco.id`, `item_orcamento.id`, `orcamento.id`, `produto.id`, `servico.id` (`usuario.id` deliberadamente sem default, pois referencia Supabase Auth)
- `now()`: `orcamento.data_criacao`, `usuario.data_cadastro`
- `true`: `cliente.ativo`, `produto.ativo`, `servico.ativo`, `usuario.ativo`
- `0.00`: `orcamento.subtotal`, `orcamento.valor_desconto`, `orcamento.total`
- `'RASCUNHO'::status_orcamento`: `orcamento.status`
- `'m²'::character varying`: `area.unidade`

---

## 5. Testes dinâmicos

Todos os testes de integridade foram executados contra a instância ativa do PostgreSQL no container local:

| Teste | Descrição da Operação | Resultado Esperado | Resultado Observado | Constraint Responsável | Status |
|---|---|---|---|---|---|
| **A** | `item_orcamento` sem `servico_id` e sem `produto_id` | Rejeição por violação de regra de negócio (XOR) | `ERROR: new row for relation "item_orcamento" violates check constraint "item_orcamento_servico_xor_produto_check"` | `item_orcamento_servico_xor_produto_check` | **SUCESSO** |
| **B** | `item_orcamento` com `servico_id` e `produto_id` simultâneos | Rejeição por violação de exclusividade (XOR) | `ERROR: new row for relation "item_orcamento" violates check constraint "item_orcamento_servico_xor_produto_check"` | `item_orcamento_servico_xor_produto_check` | **SUCESSO** |
| **C** | `item_orcamento` do tipo `PRODUTO` com `usa_medicao_area = TRUE` | Rejeição, pois produtos exigem medição de área desligada | `ERROR: new row for relation "item_orcamento" violates check constraint "item_orcamento_servico_xor_produto_check"` | `item_orcamento_servico_xor_produto_check` | **SUCESSO** |
| **D** | `orcamento` com desconto percentual > 100 (`105%`) | Rejeição por ultrapassar o limite percentual | `ERROR: new row for relation "orcamento" violates check constraint "orcamento_desconto_check"` | `orcamento_desconto_check` | **SUCESSO** |
| **E** | `orcamento` com desconto fixo > subtotal (subtotal `100.00`, desconto `150.00`) | Rejeição por desconto fixo exceder o subtotal | `ERROR: new row for relation "orcamento" violates check constraint "orcamento_desconto_check"` | `orcamento_desconto_check` | **SUCESSO** |
| **F** | `endereco` com latitude fora de `-90..90` (`95.123456`) | Rejeição por latitude geográfica inválida | `ERROR: new row for relation "endereco" violates check constraint "endereco_latitude_check"` | `endereco_latitude_check` | **SUCESSO** |
| **G** | `endereco` com longitude fora de `-180..180` (`185.123456`) | Rejeição por longitude geográfica inválida | `ERROR: new row for relation "endereco" violates check constraint "endereco_longitude_check"` | `endereco_longitude_check` | **SUCESSO** |
| **H** | `area` com `area_calculada <= 0` (`0.00`) | Rejeição por medição de área não estritamente positiva | `ERROR: new row for relation "area" violates check constraint "area_area_calculada_check"` | `area_area_calculada_check` | **SUCESSO** |
| **I1** | `area` com geometria vazia (`ST_GeomFromText('POLYGON EMPTY', 4326)`) | Rejeição por geometria vazia | `ERROR: new row for relation "area" violates check constraint "area_geometria_nao_vazia_check"` | `area_geometria_nao_vazia_check` | **SUCESSO** |
| **I2** | `area` com geometria inválida (autointerseção / bowtie) | Rejeição por polígono geometricamente inválido | `NOTICE: Self-intersection at or near point 1 1` <br> `ERROR: new row for relation "area" violates check constraint "area_geometria_valida_check"` | `area_geometria_valida_check` | **SUCESSO** |
| **J** | Exclusão de `orcamento` que possui `item_orcamento` associado | Rejeição por proteção de integridade referencial restritiva | `ERROR: update or delete on table "orcamento" violates foreign key constraint "item_orcamento_orcamento_id_fkey" on table "item_orcamento"` | `item_orcamento_orcamento_id_fkey` (`ON DELETE RESTRICT`) | **SUCESSO** |

---

## 6. Teste positivo

Um fluxo completo com estrutura relacional hierárquica válida foi inserido abrangendo todas as 8 tabelas:

1. **`usuario`**: Criado perfil com ID UUID explícito.
2. **`cliente`**: Criado associado ao usuário.
3. **`endereco`**: Criado vinculado ao cliente com coordenadas geográficas reais de São Paulo (`-23.561414`, `-46.655881`).
4. **`servico`**: Criado com unidade `m²`, `preco_base = 25.00` e `usa_medicao_area = true`.
5. **`produto`**: Criado com unidade `kg` e `preco_base = 15.00`.
6. **`orcamento`**: Criado em estado `RASCUNHO`, `subtotal = 300.00`, desconto fixo de `20.00` e `total = 280.00`.
7. **`item_orcamento` (SERVICO)**: Criado com `tipo = 'SERVICO'`, `quantidade = 10`, `valor_unitario = 25.00`, `valor_total = 250.00`, `usa_medicao_area = true`.
8. **`item_orcamento` (PRODUTO)**: Criado com `tipo = 'PRODUTO'`, `quantidade = 2`, `valor_unitario = 25.00`, `valor_total = 50.00`, `usa_medicao_area = false`.
9. **`area`**: Criada vinculada ao item de orçamento de serviço com geometria `POLYGON` fechada em EPSG:4326.

### Validação Espacial Realizada no PostGIS:
```sql
SELECT 
    nome, 
    area_calculada, 
    unidade, 
    ST_AsText(geometria) AS wkt, 
    round(ST_Area(geometria::geography)::numeric, 2) AS area_geodesica_m2 
FROM area;
```
- **Resultado:** O PostGIS calculou com precisão a área geodésica esferoidal em `1356.85 m²`, confirmando a operacionalidade das rotinas espaciais.

Ao final do teste positivo, executou-se novamente `npx supabase db reset`, garantindo que o banco retornasse ao estado inicial limpo das migrations sem criar seeds residuais.

---

## 7. TypeScript

A conformidade do código de domínio e da suíte de testes com os tipos e regras foi verificada:

- **Typecheck:**
  ```bash
  npm run test:typecheck
  ```
  - Comando: `tsc --project tsconfig.test.json --noEmit`
  - Resultado: **0 erros** de compilação/tipagem (Exit code 0).

- **Testes Unitários de Domínio:**
  ```bash
  npm test
  ```
  - Comando: `tsx --test tests/domain/*.test.ts`
  - Resultado: **49/49 testes passando** (10 suítes, 0 falhas, 0 cancelamentos).

---

## 8. Limitações

1. **Ambiente Local Apenas:** A validação foi restrita ao Supabase local rodando em Docker Desktop sobre WSL2, sem conexão com nenhum banco remoto (em conformidade com a governança do projeto).
2. **Políticas de RLS e Supabase Auth:** A migration v1.1 trata estritamente do Modelo Físico DDL (tabelas, colunas, tipos, constraints e índices). A camada de segurança RLS (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`) e integração de políticas com `auth.uid()` serão implementadas na etapa subsequente dedicada.

---

## 9. Conclusão

Todos os critérios de validação foram atendidos integralmente:
- `npx supabase db reset` executou com sucesso e de forma reproduzível;
- A migration `20260916020500_modelo_fisico_v1_1.sql` foi aplicada sem erros;
- O schema real corresponde exatamente ao Modelo Físico v1.1 (8 tabelas, 3 enums, 8 PKs, 10 FKs, 2 UNIQUEs, 15 CHECKs, 11 índices, defaults homologados);
- Todas as restrições e constraints críticas funcionaram e rejeitaram operações inválidas conforme especificado;
- A extensão PostGIS e os cálculos espaciais com geometrias em EPSG:4326 estão plenamente operacionais;
- Os testes TypeScript e a suíte de testes unitários permanecem com 100% de aprovação (49/49).

**Conclusão:** **APROVADA**
