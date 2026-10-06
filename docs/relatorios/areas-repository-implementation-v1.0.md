# Relatório de Implementação — AreaRepository v1.0
# Módulo: Áreas / Mapas / Medição de Área (GAP-AREA-04)

**Status da Etapa:** AREA REPOSITORY IMPLEMENTADO — AGUARDANDO AUDITORIA  
**Data:** 02/10/2026  
**Ambiente:** React Native (Expo SDK 57) + TypeScript + Node.js / tsx + Supabase PostgREST  
**Decisões Arquiteturais Vinculadas:**  
- **DECISÃO-AREA-01:** "Cálculo geodésico esférico puro em TypeScript" (HOMOLOGADA)  
- **DECISÃO-AREA-02:** "GeoJSON para transporte espacial via PostgREST" (HOMOLOGADA)  
**Decisões Congeladas / Reservadas:**  
- **DECISÃO-AREA-04:** "Eager Loading de Áreas no Orçamento" (reservada para a fase de hidratação)  
**Banco de Dados:** Intocado / Congelado (0 migrations alteradas, 0 migrations criadas, tabela `public.area` e RLS rigorosamente preservados)

---

## 1. Objetivo

Implementar de forma controlada e isolada a persistência da entidade de domínio `Area` no módulo Áreas / Mapas / Medição de Área (**GAP-AREA-04**), abrangendo:

1. A interface canônica `AreaRepository` na camada de Domínio;
2. A implementação concreta `SupabaseAreaRepository` na camada de Infraestrutura;
3. O conversor/mapper espacial bidirecional entre a representação do domínio (`GeometriaPoligono` com `{ latitude, longitude }`) e GeoJSON RFC 7946 (`Polygon` com `[longitude, latitude]` em SRID 4326), em conformidade estrita com a **DECISÃO-AREA-02**;
4. O ciclo completo de operações CRUD (`criar`, `buscarPorId`, `listarPorItem`, `atualizar`, `excluir`, `remover`);
5. A preservação integral do isolamento multi-tenant e das políticas Row Level Security (RLS) já homologadas no banco de dados.

O repositório prepara a infraestrutura de dados para os casos de uso de aplicação (GAP-AREA-07) e para a futura hidratação (GAP-AREA-08).

---

## 2. Fontes Canônicas

A implementação fundamentou-se rigorosamente no acervo canônico do projeto:

- **Modelo Físico v1.1:** Tabela `public.area` (colunas `id`, `item_orcamento_id`, `nome`, `geometria GEOMETRY(POLYGON, 4326)`, `area_calculada NUMERIC(12,2)`, `unidade VARCHAR(30)`, `observacoes TEXT`, índices e constraints `area_area_calculada_check`, `area_geometria_nao_vazia_check`, `area_geometria_valida_check`);
- **DER v1.1:** Relacionamento relacional `ITEM_ORCAMENTO (1) <---> (0..N) AREA` com integridade referencial `ON DELETE CASCADE`;
- **UML v3.1:** Métodos e atributos da classe de domínio `Area`;
- **RN v3:** Regras de negócio, em especial RN40 (validação de geometria), RN41/RN42 (cálculo e atualização), RN44 (múltiplas áreas por item) e ciclo de vida do orçamento;
- **RF v2:** Requisitos funcionais de persistência espacial e gerenciamento de áreas de trabalho;
- **RNF v2:** Requisitos não-funcionais de desempenho, segurança e isolamento por linha;
- **Arquitetura Técnica v1.1:** Separação estrita em 4 camadas e direção de dependência ($\text{Presentation} \rightarrow \text{Application} \rightarrow \text{Domain} \leftarrow \text{Infrastructure}$);
- **Auth/RLS v1.6 (Migration 20260921000000_auth_rls.sql):** 4 políticas de segurança de `public.area` (`area_select_policy`, `area_insert_policy`, `area_update_policy`, `area_delete_policy`);
- [docs/planejamento/areas-mapas-medicao-plan-v1.0.md](file:///c:/Users/luanh/Documents/jardinagem-app/docs/planejamento/areas-mapas-medicao-plan-v1.0.md): Planejamento técnico homologado do módulo de áreas;
- [docs/planejamento/areas-mapas-medicao-homologacao-v1.0.md](file:///c:/Users/luanh/Documents/jardinagem-app/docs/planejamento/areas-mapas-medicao-homologacao-v1.0.md): Parecer formal de homologação (autorização expressa do GAP-AREA-04 e DECISÃO-AREA-02).

---

## 3. Contrato `AreaRepository`

O contrato do repositório foi estabelecido na camada de Domínio, espelhando os padrões arquiteturais dos repositórios canônicos do sistema (`ItemOrcamentoRepository`, `ClienteRepository`):

- **Arquivo:** [src/domain/repositories/area.repository.interface.ts](file:///c:/Users/luanh/Documents/jardinagem-app/src/domain/repositories/area.repository.interface.ts)
- **Barramento de Exportação:**
  - [src/domain/repositories/index.ts](file:///c:/Users/luanh/Documents/jardinagem-app/src/domain/repositories/index.ts)
  - [src/domain/index.ts](file:///c:/Users/luanh/Documents/jardinagem-app/src/domain/index.ts)

### 3.1 Definição dos Tipos e Assinaturas

```typescript
export interface CriarAreaDados {
  id?: string;
  itemOrcamentoId: string;
  nome?: string | null;
  geometria: GeometriaPoligono;
  areaCalculada: number;
  unidade?: string;
  observacoes?: string | null;
}

export interface AtualizarAreaDados {
  nome?: string | null;
  geometria?: GeometriaPoligono;
  areaCalculada?: number;
  unidade?: string;
  observacoes?: string | null;
}

export interface AreaRepository {
  listarPorItem(itemOrcamentoId: string): Promise<Area[]>;
  buscarPorId(id: string): Promise<Area | null>;
  criar(dados: CriarAreaDados): Promise<Area>;
  atualizar(id: string, dados: AtualizarAreaDados): Promise<Area>;
  excluir(id: string): Promise<void>;
  remover(id: string): Promise<void>;
}
```

*Nota de padronização:* O método `remover` foi provido como alias direto para `excluir`, garantindo interoperabilidade semântica completa com qualquer caso de uso subsequente.

---

## 4. Mapper Espacial GeoJSON (DECISÃO-AREA-02)

Para isolar completamente os detalhes de transporte espacial PostGIS/PostgREST da lógica de negócio e da interface, foi implementado o mapper:

- **Arquivo:** [src/infrastructure/mappers/area-geojson.mapper.ts](file:///c:/Users/luanh/Documents/jardinagem-app/src/infrastructure/mappers/area-geojson.mapper.ts)
- **Exportado em:** [src/infrastructure/mappers/index.ts](file:///c:/Users/luanh/Documents/jardinagem-app/src/infrastructure/mappers/index.ts) e [src/infrastructure/index.ts](file:///c:/Users/luanh/Documents/jardinagem-app/src/infrastructure/index.ts)

### 4.1 Regras de Conversão Implementadas

1. **Ordem de Coordenadas (Eixo X vs Eixo Y):**
   - No Domínio: `{ latitude: number, longitude: number }` (convenção de interfaces de mapas móveis);
   - No GeoJSON (RFC 7946): `[longitude, latitude]` (eixo x/longitude primeiro, eixo y/latitude segundo);
   - A inversão foi testada empiricamente com coordenadas fortemente assimétricas de São Paulo ($\text{lat} \approx -23.55^\circ, \text{lon} \approx -46.63^\circ$), garantindo que a transposição de eixos ocorra sem qualquer inversão.
2. **Fechamento do Anel (LinearRing):**
   - Na saída para o banco (`dominioParaGeoJson`): o primeiro vértice é repetido no final da sequência, gerando um anel explicitamente fechado (`[A, B, C, A]`) conforme exigido pela especificação OGC/PostGIS;
   - Na entrada do banco (`geoJsonParaDominio`): os vértices são normalizados através de `obterVerticesPoligono`, eliminando o ponto final redundante para que o domínio receba os vértices únicos (`[A, B, C]`), em perfeita harmonia com o padrão de consumo do `react-native-maps`.
3. **Resiliência de Entrada:**
   - Suporta objetos GeoJSON estruturados (`{ type: "Polygon", coordinates: [...] }`);
   - Suporta strings JSON serializadas recebidas via HTTP/PostgREST;
   - Contém fallback para formato WKT (`POLYGON((lon lat, ...))`) prevenindo falhas caso configurações do PostgREST variem.
4. **Mapeamento de Linha:**
   - A função `mapAreaRow(data: any): Area` instancia a entidade de domínio `Area` garantindo valores padrão (`unidade = 'm²'`) e tratamento de valores nulos em campos opcionais.

---

## 5. Implementação `SupabaseAreaRepository`

- **Arquivo:** [src/infrastructure/repositories/supabase-area.repository.ts](file:///c:/Users/luanh/Documents/jardinagem-app/src/infrastructure/repositories/supabase-area.repository.ts)
- **Barramento:** [src/infrastructure/repositories/index.ts](file:///c:/Users/luanh/Documents/jardinagem-app/src/infrastructure/repositories/index.ts)
- **Instância Singleton:** `supabaseAreaRepository`

### 5.1 Diretrizes e Invariantes Respeitados

1. **Consumo de Cliente:** Recebe `client: SupabaseClient = supabase` via injeção de dependência no construtor. Não utiliza `service_role`. Opera exclusivamente no contexto da identidade autenticada (`auth.uid()`).
2. **Preservação do Cálculo de Área (Seção 6 do Pedido):**
   - O repositório **NÃO** recalcula a área em infraestrutura nem introduz segundo algoritmo;
   - Persiste o valor fornecido no contrato `dados.areaCalculada` (aplicando o arredondamento canônico comercial de duas casas decimais via `arredondarMoeda`);
   - A autoridade de cálculo do domínio permanece 100% no `GeodesicCalculadorAreaService` já homologado.
3. **Mapeamento Estruturado de Erros (Seção 7 do Pedido):**
   - `23503` (Foreign Key): Mapeado para mensagem explicativa de item de orçamento inexistente;
   - `23514` (Check Constraint): Mapeado para violação de integridade/validação (área $\le 0$ ou geometria inválida);
   - `42501` (RLS / Insufficient Privilege): Mapeado para negação por política de segurança de linha;
   - `PGRST116` (Registro Inexistente): Mapeado para registro não encontrado ou não acessível;
   - Nenhuma exceção é silenciada ou convertida em erro genérico cego.
4. **Respeito à Máquina de Estados e Status RASCUNHO:**
   - O repositório não duplica regras da máquina de estados; o RLS (`area_delete_policy`) se encarrega de validar se `orcamento.status = 'RASCUNHO'` antes de autorizar a exclusão;
   - Tentativas de exclusão em orçamentos em status `ENVIADO` ou posteriores são bloqueadas pelo banco/RLS.
5. **Multi-Area no Mesmo Item:**
   - Permite a criação de múltiplas áreas vinculadas ao mesmo `item_orcamento_id`, cada qual com seu `id` UUID autônomo, sem sobrescrita.

---

## 6. Cobertura de Testes e Validação Empírica

Foram implementadas duas suítes dedicadas de testes automatizados com Node.js Test Runner:

### 6.1 Suíte 1: Testes do Mapper Espacial GeoJSON
**Arquivo:** [tests/areas/area-geojson.mapper.test.ts](file:///c:/Users/luanh/Documents/jardinagem-app/tests/areas/area-geojson.mapper.test.ts)  
**Total de Testes:** 15 testes (100% aprovados)

- Conversão `dominioParaGeoJson` com fechamento implícito $\rightarrow$ GeoJSON com LinearRing fechado de 4 posições;
- Conversão com fechamento explícito $\rightarrow$ LinearRing fechado sem duplicação adicional;
- Verificação rigorosa de assimetria de coordenadas (garantindo que latitude $-23$ e longitude $-46$ não foram trocadas de posição);
- Rejeição de geometrias com menos de 3 vértices e objetos nulos;
- Conversão `geoJsonParaDominio` a partir de objetos GeoJSON e strings JSON serializadas;
- Suporte a fallback WKT;
- Rejeição de GeoJSON sem anel fechado, tipos incompatíveis (Point, LineString) ou coordenadas não-numéricas;
- Teste de Round-Trip bidirecional ($\text{Domínio} \rightarrow \text{GeoJSON} \rightarrow \text{Domínio}$) com equivalência estrita de coordenadas;
- Mapeamento de linha `mapAreaRow` com campos opcionais nulos e unidade padrão `m²`.

### 6.2 Suíte 2: Testes de Persistência, CRUD e RLS
**Arquivo:** [tests/areas/area-repository.test.ts](file:///c:/Users/luanh/Documents/jardinagem-app/tests/areas/area-repository.test.ts)  
**Total de Testes:** 20 testes (100% aprovados)

- **CRUD:**
  - `criar`: Inserção de área com geometria GeoJSON fechada e metragem calculada;
  - `buscarPorId`: Consulta por ID com mapeamento integral de atributos;
  - `buscarPorId`: Retorno de `null` para identificador inexistente;
  - `listarPorItem`: Listagem das áreas de um item específico;
  - `atualizar`: Atualização parcial de dados cadastrais (nome, observações, unidade);
  - `atualizar`: Atualização atômica de geometria e metragem calculada;
  - `atualizar`: No-op gracioso (retorno do registro atual quando payload é vazio);
  - `excluir` e `remover`: Exclusão de área por ID.
- **Multi-Area:**
  - Criação de 3 áreas no mesmo item;
  - Persistência com 3 IDs UUID distintos;
  - Listagem simultânea das 3 áreas;
  - Remoção isolada da Área 2 preservando integralmente Área 1 e Área 3.
- **Constraints e Erros:**
  - Falha de chave estrangeira ao associar a item inexistente (código 23503);
  - Falha de check constraint com metragem $\le 0$ (código 23514);
  - Falha de atualização em registro inexistente (código PGRST116).
- **Isolamento Multi-Tenant e RLS:**
  - Usuário A não enxerga área do Usuário B no `buscarPorId` (retorno `null`);
  - Usuário A não lista áreas do Usuário B no `listarPorItem` (lista vazia);
  - Usuário A é bloqueado por RLS (código 42501) ao tentar atualizar área do Usuário B;
  - Usuário A é bloqueado por RLS (código 42501) ao tentar excluir área do Usuário B;
  - Tentativa de injeção cross-tenant (Usuário A inserindo área apontando para `item_orcamento` do Usuário B) é sumariamente bloqueada pelo RLS (`area_insert_policy`).
- **Ciclo de Vida (RASCUNHO vs ENVIADO):**
  - Exclusão permitida quando o orçamento pai está em `RASCUNHO`;
  - Exclusão bloqueada pelo RLS quando o orçamento pai transita para `ENVIADO`.
- **Preservação de Valores:**
  - Confirmação de que `area_calculada` é salva fielmente com arredondamento comercial sem recálculo divergente na infraestrutura.

---

## 7. Análise de Regressão e Quantitativos

A execução de todas as verificações do projeto demonstrou **zero regressões**:

| Verificação | Comando | Resultado | Quantitativo Real |
| :--- | :--- | :---: | :---: |
| **Typecheck Aplicação** | `npm run typecheck` | **PASS** | 0 erros de compilação |
| **Typecheck Testes** | `npm run test:typecheck` | **PASS** | 0 erros de compilação |
| **Testes de Domínio** | `npm test` | **PASS** | 49 testes aprovados (8 suítes) |
| **Testes de Clientes** | `npm run test:clientes` | **PASS** | 28 testes aprovados (2 suítes) |
| **Testes de Catálogo** | `npm run test:catalogo` | **PASS** | 42 testes aprovados (3 suítes) |
| **Testes de Orçamentos** | `npm run test:orcamentos` | **PASS** | 28 testes aprovados (4 suítes) |
| **Adaptador Geodésico** | `npx tsx --test tests/infrastructure/*.test.ts` | **PASS** | 13 testes aprovados (1 suíte) |
| **Mapeador Espacial GeoJSON** | `npx tsx --test tests/areas/area-geojson.mapper.test.ts` | **PASS** | 15 testes aprovados (4 suítes) |
| **Repositório de Áreas e RLS** | `npx tsx --test tests/areas/area-repository.test.ts` | **PASS** | 20 testes aprovados (6 suítes) |
| **TOTAL GERAL DO PROJETO** | — | **PASS** | **195 testes aprovados (0 falhas)** |

---

## 8. Preservação dos Módulos Congelados

Conforme exigido pelo protocolo do projeto, foram formalmente confirmados os seguintes índices de preservação:

- **0** migrations criadas ou alteradas;
- **0** alterações na tabela `public.area`;
- **0** alterações em triggers, constraints ou índices PostGIS;
- **0** alterações em policies RLS do banco de dados;
- **0** alterações na porta `CalculadorAreaService`;
- **0** alterações no serviço `GeodesicCalculadorAreaService` (GAP-AREA-06);
- **0** alterações na entidade `Area` ou em entidades do domínio;
- **0** alterações no módulo de Autenticação;
- **0** alterações no módulo de Clientes;
- **0** alterações no módulo de Catálogo (Serviços e Produtos);
- **0** alterações no módulo de Orçamentos e Itens de Orçamento;
- **0** novas decisões arquiteturais inventadas (apenas as homologadas DECISÃO-AREA-01 e DECISÃO-AREA-02 foram empregadas).

---

## 9. Arquivos Criados e Modificados

### 9.1 Arquivos Criados
1. [src/domain/repositories/area.repository.interface.ts](file:///c:/Users/luanh/Documents/jardinagem-app/src/domain/repositories/area.repository.interface.ts) — Contrato canônico da interface de persistência de áreas;
2. [src/infrastructure/mappers/area-geojson.mapper.ts](file:///c:/Users/luanh/Documents/jardinagem-app/src/infrastructure/mappers/area-geojson.mapper.ts) — Mapper bidirecional Domain $\leftrightarrow$ GeoJSON RFC 7946;
3. [src/infrastructure/mappers/index.ts](file:///c:/Users/luanh/Documents/jardinagem-app/src/infrastructure/mappers/index.ts) — Barramento de exportação de mappers da infraestrutura;
4. [src/infrastructure/repositories/supabase-area.repository.ts](file:///c:/Users/luanh/Documents/jardinagem-app/src/infrastructure/repositories/supabase-area.repository.ts) — Implementação concreta Supabase PostgREST;
5. [tests/areas/area-geojson.mapper.test.ts](file:///c:/Users/luanh/Documents/jardinagem-app/tests/areas/area-geojson.mapper.test.ts) — Suíte unitária do conversor espacial;
6. [tests/areas/area-repository.test.ts](file:///c:/Users/luanh/Documents/jardinagem-app/tests/areas/area-repository.test.ts) — Suíte de testes do repositório, constraints e RLS.

### 9.2 Arquivos Modificados (Apenas Barramentos de Exportação)
1. [src/domain/repositories/index.ts](file:///c:/Users/luanh/Documents/jardinagem-app/src/domain/repositories/index.ts) — Adicionado export de `area.repository.interface`;
2. [src/infrastructure/repositories/index.ts](file:///c:/Users/luanh/Documents/jardinagem-app/src/infrastructure/repositories/index.ts) — Adicionado export de `supabase-area.repository`;
3. [src/infrastructure/index.ts](file:///c:/Users/luanh/Documents/jardinagem-app/src/infrastructure/index.ts) — Adicionado export de `./mappers`.

---

## 10. Limitações e Próximos Incrementos

1. **Casos de Uso de Aplicação (GAP-AREA-07):** Ainda não implementados nesta fase (`CriarAreaUseCase`, `ListarAreasPorItemUseCase`, `ObterAreaUseCase`, `AtualizarAreaUseCase`, `RemoverAreaUseCase`).
2. **Eager Loading de Áreas no Orçamento (GAP-AREA-08 / DECISÃO-AREA-04):** A hidratação de `item.areas` dentro de `SupabaseOrcamentoRepository` e `SupabaseItemOrcamentoRepository` permanece reservada para a etapa posterior de hidratação.
3. **Interface Gráfica e Mapas (GAP-AREA-01 / GAP-AREA-02):** A integração com `react-native-maps` e provisionamento de Google Maps API Key permanecem fora do escopo desta fase, conforme o planejamento aprovado.

---

## 11. Status Final

```
================================================================================
STATUS FINAL DO INCREMENTO:
AREA REPOSITORY IMPLEMENTADO — AGUARDANDO AUDITORIA
================================================================================
```
