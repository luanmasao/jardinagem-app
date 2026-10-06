# Relatório de Correção Pós-Auditoria — GAP-AREA-01 v1.0
# Módulo: Áreas / Mapas / Medição de Área

**Status:** CORREÇÃO CONCLUÍDA — GAP-AREA-01 — AGUARDANDO REAUDITORIA  
**Data:** 02/10/2026  
**Auditoria de Referência:** [docs/relatorios/areas-map-drawing-implementation-audit-v1.0.md](file:///c:/Users/luanh/Documents/jardinagem-app/docs/relatorios/areas-map-drawing-implementation-audit-v1.0.md)  
**Relatório de Implementação Auditado:** [docs/relatorios/areas-map-drawing-implementation-v1.0.md](file:///c:/Users/luanh/Documents/jardinagem-app/docs/relatorios/areas-map-drawing-implementation-v1.0.md)  

---

## 1. Achados Originais da Auditoria Independente

A auditoria técnica independente de GAP-AREA-01 emitiu o parecer **PENDENTE DE CORREÇÃO** devido a um único conjunto bloqueador de problemas de tipagem restrito a `tests/areas/area-map-drawing.test.ts`, somado a duas divergências de ordem documental:

1. **TS2353 em `SpyAreaRepository`:** Propriedade inexistente `criadoEm` passada para `AreaProps` na instanciação da entidade `Area`;
2. **TS2339 em `SpyAreaRepository`:** Acesso a `existente.criadoEm` inexistente na entidade `Area`;
3. **TS2339 em `InMemoryOrcamentoRepository`:** Acesso a `o.criadoEm` inexistente na entidade `Orcamento`;
4. **TS2367 em Teste 2 (`Modo Satellite`):** Comparação entre tipos incompatíveis (`'standard'` e `'satellite'`) decorrente do narrowing do compilador TypeScript sobre a variável local `modoMapa`;
5. **Divergência Documental no Ambiente Android:** Relatório informava API 35, enquanto o AVD oficial `Pixel_10` está configurado com `target=android-37.1` e imagem `system-images\android-37.1\google_apis_playstore_ps16k\x86_64\`;
6. **Observação Arquitetural Documental:** Redação no relatório de implementação sugeria que `src/infrastructure/maps` pertenceria à camada Presentation, quando pela `Arquitetura Técnica v1.1` trata-se de **Infrastructure** (`MapProvider` é Serviço de Infraestrutura).

---

## 2. Diagnóstico de Causa Raiz

1. **`AreaProps` e `Area` (TS2353 / TS2339):** A entidade `Area` (`src/domain/entities/area.ts`) é instanciada com `{ id, itemOrcamentoId, nome?, geometria, areaCalculada, unidade?, observacoes? }`. Ela nunca possuiu os atributos `criadoEm` ou `atualizadoEm`. O mock de teste `SpyAreaRepository` continha propriedades espúrias não condizentes com o contrato real do domínio;
2. **`Orcamento` (TS2339):** A entidade `Orcamento` (`src/domain/entities/orcamento.ts`) expõe canonicamente `dataCriacao` (e não `criadoEm`). O mock `InMemoryOrcamentoRepository.listar` mapeava erroneamente `dataCriacao: o.criadoEm`;
3. **Narrowing de `modoMapa` (TS2367):** No Teste 2 de `area-map-drawing.test.ts`, a reatribuição condicional direta estreitava o tipo estático da variável para o literal `'standard'`, tornando a comparação estrita subsequente (`modoMapa === 'satellite'`) uma impossibilidade de tipo segundo a Flow Control Analysis do TypeScript;
4. **Ambiente Android:** O relatório de implementação citava genericamente "API 35" em vez do target real do AVD registrado no arquivo `config.ini` (`android-37.1`);
5. **Classificação Arquitetural:** Imprecisão textual na seção 2 do relatório misturou a responsabilidade de apresentação da UI com a abstração do provedor externo de mapas em `src/infrastructure/maps`.

---

## 3. Correções Aplicadas

Em estrita consonância com as diretrizes de não alteração de entidades, sem uso de `any`, `@ts-ignore`, `@ts-expect-error` ou enfraquecimento de asserções:

### 3.1. Correção do Mock de `Area` (`tests/areas/area-map-drawing.test.ts`)
No método `SpyAreaRepository.atualizar`, foram removidas as propriedades espúrias `criadoEm` e `atualizadoEm` na chamada ao construtor de `Area`, mantendo a assinatura exata de `AreaProps`:
```typescript
const atualizada = new Area({
  id: existente.id,
  itemOrcamentoId: existente.itemOrcamentoId,
  nome: dados.nome ?? existente.nome,
  geometria: dados.geometria ?? existente.geometria,
  areaCalculada: dados.areaCalculada ?? existente.areaCalculada,
  observacoes: dados.observacoes !== undefined ? dados.observacoes : existente.observacoes,
  unidade: dados.unidade ?? existente.unidade,
});
```

### 3.2. Correção do Mock de `Orcamento` (`tests/areas/area-map-drawing.test.ts`)
No método `InMemoryOrcamentoRepository.listar`, o mapeamento foi corrigido para acessar o getter canônico do domínio:
```typescript
dataCriacao: o.dataCriacao,
```

### 3.3. Correção do Narrowing de `modoMapa` (`tests/areas/area-map-drawing.test.ts`)
Para preservar o tipo `ModoMapa = 'satellite' | 'standard'` sem narrowing indevido e sem type casts arbitrários, extraiu-se a função pura de alternância (espelhando a lógica de `useMapaDelimitacao`):
```typescript
const alternarModo = (modo: ModoMapa): ModoMapa =>
  modo === 'satellite' ? 'standard' : 'satellite';

let modoMapa: ModoMapa = 'satellite';
assert.strictEqual(modoMapa, 'satellite', 'Modo padrão obrigatório deve ser satellite');

// Alterna para standard
modoMapa = alternarModo(modoMapa);
assert.strictEqual(modoMapa, 'standard');

// Alterna de volta para satellite
modoMapa = alternarModo(modoMapa);
assert.strictEqual(modoMapa, 'satellite', 'Deve retornar para satellite');
```

### 3.4. Retificação Documental do Ambiente Android
No relatório [docs/relatorios/areas-map-drawing-implementation-v1.0.md](file:///c:/Users/luanh/Documents/jardinagem-app/docs/relatorios/areas-map-drawing-implementation-v1.0.md), o ambiente foi formalmente retificado para refletir a evidência real:
- AVD: `Pixel_10`;
- Target: `android-37.1`;
- System Image: `system-images\android-37.1\google_apis_playstore_ps16k\x86_64\`.

### 3.5. Retificação Documental da Camada Arquitetural
Na seção 2 do relatório de implementação, a redação foi ajustada para consonância com a `Arquitetura Técnica v1.1`:
- `src/infrastructure/maps` pertence à camada de **Infrastructure**;
- `MapProvider` atua como **Serviço de Infraestrutura**;
- `src/presentation/components/mapa` e telas em `app/` pertencem à camada de **Presentation**.

---

## 4. Arquivos Alterados

1. [tests/areas/area-map-drawing.test.ts](file:///c:/Users/luanh/Documents/jardinagem-app/tests/areas/area-map-drawing.test.ts): Correção dos mocks e do narrowing tipado de `modoMapa`;
2. [docs/relatorios/areas-map-drawing-implementation-v1.0.md](file:///c:/Users/luanh/Documents/jardinagem-app/docs/relatorios/areas-map-drawing-implementation-v1.0.md): Retificação documental do ambiente Android e da taxonomia de camadas de mapas;
3. [docs/relatorios/areas-map-drawing-correction-v1.0.md](file:///c:/Users/luanh/Documents/jardinagem-app/docs/relatorios/areas-map-drawing-correction-v1.0.md): Presente relatório de registro da correção.

---

## 5. Ausência de Alteração Funcional ou Quebra de Contratos

- **Nenhum arquivo em `src/` ou `app/` foi modificado nesta correção.**
- O domínio permaneceu intacto: entidades `Area` e `Orcamento` não receberam aliases nem campos espúrios.
- A suite de testes `tests/areas/area-map-drawing.test.ts` manteve rigorosamente todas as 10 asserções de validação de comportamento real, sem enfraquecimento.
- Os componentes congelados GAP-AREA-04, GAP-AREA-06, GAP-AREA-07 e GAP-AREA-08 permanecem 100% preservados.
- GAP-AREA-02 permanece rigorosamente não iniciado.

---

## 6. Resultados das Validações

### 6.1. Verificação Estática de Tipagem dos Testes (`npm run test:typecheck`)
```bash
> tsc --project tsconfig.test.json --noEmit
# Saída: Código 0 (ZERO erros encontrados)
```

### 6.2. Verificação Estática do Projeto Principal (`npm run typecheck`)
```bash
> tsc --noEmit
# Saída: Código 0 (ZERO erros encontrados)
```

### 6.3. Teste Específico do GAP-AREA-01
```bash
> npx tsx --tsconfig tsconfig.test.json --test tests/areas/area-map-drawing.test.ts
✔ 1. deve instanciar MapProvider nativo respeitando interface abstrata IMapProvider (1.2917ms)
✔ 2. deve operar prioritariamente em modo Satellite e permitir alternância controlada (0.4357ms)
✔ 3. deve adicionar vértices em ordem sequencial estrita preservando cada coordenada (0.3396ms)
✔ 4. deve calcular área estimada em m² em tempo real utilizando GeodesicCalculadorAreaService homologado (0.7554ms)
✔ 5. deve suportar desfazimento do último vértice (undo) recalculando ou zerando área (0.3541ms)
✔ 6. deve suportar limpeza completa do traçado (clear) resetando estado (0.2863ms)
✔ 7. deve converter coordenadas para GeoJSON RFC 7946 Polygon com primeiro e último pontos idênticos sem inversão (0.4287ms)
✔ 8. deve integrar com CriarAreaUseCase e persistir geometria válida via AreaService (1.2384ms)
✔ 9. deve vincular área ao item do orçamento e atualizar área total recalculando subtotal (1.0664ms)
✔ 10. deve respeitar isolamento multi-tenant garantindo que áreas pertençam exclusivamente ao usuário autenticado (1.6857ms)
ℹ tests 10
ℹ suites 0
ℹ pass 10
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
```

### 6.4. Execução de Todas as Suítes de Teste
| Suíte de Testes | Comando | Resultado |
| :--- | :--- | :---: |
| **Áreas** | `npm run test:areas` | **82 pass, 0 fail** (5 arquivos de teste) |
| **Domínio Geral** | `npm test` | **49 pass, 0 fail** |
| **Orçamentos** | `npm run test:orcamentos` | **28 pass, 0 fail** |
| **Catálogo** | `npm run test:catalogo` | **42 pass, 0 fail** |
| **Clientes** | `npm run test:clientes` | **28 pass, 0 fail** |
| **Autenticação** | `npm run test:auth` | **18 pass, 0 fail** |

### 6.5. Verificação do Banco de Dados (`npx supabase test db`)
```
Connecting to local database...
/Users/luanh/Documents/jardinagem-app/supabase/tests/01_bootstrap_and_trigger.sql ... ok
/Users/luanh/Documents/jardinagem-app/supabase/tests/02_usuario_rls.sql ............. ok
/Users/luanh/Documents/jardinagem-app/supabase/tests/03_catalogo_rls.sql ............ ok
/Users/luanh/Documents/jardinagem-app/supabase/tests/04_orcamento_rls.sql ........... ok
/Users/luanh/Documents/jardinagem-app/supabase/tests/05_itens_e_areas_rls.sql ....... ok
/Users/luanh/Documents/jardinagem-app/supabase/tests/06_endereco_rls.sql ............ ok
/Users/luanh/Documents/jardinagem-app/supabase/tests/07_anon_access.sql ............. ok
/Users/luanh/Documents/jardinagem-app/supabase/tests/08_cross_tenant_mutations.sql .. ok
All tests successful.
Files=8, Tests=170,  1 wallclock secs
Result: PASS
```

---

## 7. Controle de Escopo e Revisão Git

- Nenhuma migration foi adicionada ou modificada (`supabase/migrations/` intacto);
- Nenhuma alteração foi realizada em `src/domain/entities/`;
- Nenhuma alteração foi realizada em `src/application/`;
- Nenhuma alteração foi realizada em `src/infrastructure/`;
- Nenhuma alteração foi realizada em `src/presentation/`;
- As únicas alterações desta etapa foram adstritas a:
  - `tests/areas/area-map-drawing.test.ts` (ajuste dos mocks e tipagem local do teste);
  - `docs/relatorios/areas-map-drawing-implementation-v1.0.md` (retificações documentais);
  - `docs/relatorios/areas-map-drawing-correction-v1.0.md` (relatório de correção).

---

## 8. Conclusão

Todos os apontamentos da auditoria independente foram rigorosamente sanados sem qualquer artifício escuso de tipagem (`any`, `@ts-ignore`), sem mascarar erros e sem alterar o domínio homologado. Todas as validações estáticas e dinâmicas obtiveram 100% de sucesso.

Declaração de status:

**CORREÇÃO CONCLUÍDA — GAP-AREA-01 — AGUARDANDO REAUDITORIA**
