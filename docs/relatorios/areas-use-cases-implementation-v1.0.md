# Relatório de Implementação — Casos de Uso de Aplicação de Área v1.0
# Módulo: Áreas / Mapas / Medição de Área (GAP-AREA-07)

**Status de Saída:** GAP-AREA-07 IMPLEMENTADO — AGUARDANDO AUDITORIA  
**Data da Implementação:** 02/10/2026  
**Ambiente de Execução:** Windows 11 + Node.js v22.19.0 + npm 10.9.3 + TypeScript 6.0.3 + Supabase CLI 2.119.0 + Docker Desktop 29.8.0 + PostgreSQL 17.6 PostGIS  
**Incremento Implementado:** GAP-AREA-07 (Casos de Uso de Aplicação de Área + Fachada AreaService)  
**Planejamento Vinculado:** [docs/planejamento/areas-mapas-medicao-plan-v1.0.md](file:///c:/Users/luanh/Documents/jardinagem-app/docs/planejamento/areas-mapas-medicao-plan-v1.0.md)  
**Homologação do Planejamento:** [docs/planejamento/areas-mapas-medicao-homologacao-v1.0.md](file:///c:/Users/luanh/Documents/jardinagem-app/docs/planejamento/areas-mapas-medicao-homologacao-v1.0.md)  
**Auditoria GAP-AREA-06:** [docs/relatorios/areas-calculador-area-implementation-audit-v1.0.md](file:///c:/Users/luanh/Documents/jardinagem-app/docs/relatorios/areas-calculador-area-implementation-audit-v1.0.md) (HOMOLOGADO)  
**Auditoria GAP-AREA-04:** [docs/relatorios/areas-repository-implementation-audit-v1.0.md](file:///c:/Users/luanh/Documents/jardinagem-app/docs/relatorios/areas-repository-implementation-audit-v1.0.md) (HOMOLOGADO)  

---

## 1. Objetivo

Implementar exclusivamente a camada **Application** do módulo de Áreas do aplicativo de jardinagem:

- [CriarAreaUseCase](file:///c:/Users/luanh/Documents/jardinagem-app/src/application/use-cases/area/criar-area.use-case.ts);
- [ListarAreasPorItemUseCase](file:///c:/Users/luanh/Documents/jardinagem-app/src/application/use-cases/area/listar-areas-por-item.use-case.ts);
- [ObterAreaUseCase](file:///c:/Users/luanh/Documents/jardinagem-app/src/application/use-cases/area/obter-area.use-case.ts);
- [AtualizarAreaUseCase](file:///c:/Users/luanh/Documents/jardinagem-app/src/application/use-cases/area/atualizar-area.use-case.ts);
- [RemoverAreaUseCase](file:///c:/Users/luanh/Documents/jardinagem-app/src/application/use-cases/area/remover-area.use-case.ts);
- Fachada de aplicação [AreaService](file:///c:/Users/luanh/Documents/jardinagem-app/src/application/services/area.service.ts).

A camada de aplicação orquestra os componentes previamente homologados (`AreaRepository`, `GeodesicCalculadorAreaService`, `Area`, `ItemOrcamento`, `Orcamento`), assegurando o cumprimento integral das regras de negócio (RN33, RN34, RN44, RN45, RN48, RN56, RN64, RN65) sem duplicar algoritmos de cálculo geométrico ou violar o encapsulamento do domínio.

---

## 2. Fontes Canônicas Confrontadas

- **RN v3:**
  - RN29, RN31: Preservação de snapshot histórico do catálogo e de dados customizados do item;
  - RN33, RN34: Quantidade derivada da soma das áreas em $m^2$ para serviços medidos e bloqueio estrito de edição manual;
  - RN44: Múltiplas áreas vinculadas ao mesmo item de serviço medido;
  - RN45: Bloqueio estrito de áreas para itens do tipo produto ou serviços sem medição de área;
  - RN48, RN56: Recálculo automático de subtotal, desconto e total do orçamento ao mutar áreas;
  - RN64, RN65: Mutação de itens e áreas permitida exclusivamente enquanto o orçamento estiver no status `RASCUNHO`.
- **RF v2:** RF44 (Delimitação e edição de polígonos de serviço);
- **RNF v2:** RNF04 (Compatibilidade com runtime React Native / Hermes), RNF06 (Segurança e isolamento multi-tenant);
- **Arquitetura Técnica v1.1:** Separação estrita em camadas (Presentation → Application → Domain ← Infrastructure);
- **Decisões Homologadas:**
  - `DECISÃO-AREA-01`: Cálculo geodésico esférico puro em TypeScript via `GeodesicCalculadorAreaService`;
  - `DECISÃO-AREA-02`: Representação e persistência espacial via GeoJSON / PostGIS.

---

## 3. Casos de Uso Implementados e Responsabilidades

### 3.1. CriarAreaUseCase
- **Arquivo:** [src/application/use-cases/area/criar-area.use-case.ts](file:///c:/Users/luanh/Documents/jardinagem-app/src/application/use-cases/area/criar-area.use-case.ts)
- **Responsabilidades Executadas:**
  1. Validação de autenticação (`usuarioId`) e presença de `itemOrcamentoId`;
  2. Validação sintática e topológica da geometria via `validarGeometriaPoligono(input.geometria)`;
  3. Carregamento do [ItemOrcamento](file:///c:/Users/luanh/Documents/jardinagem-app/src/domain/entities/item-orcamento.ts) e verificação de existência;
  4. Validação do tipo do item: exige obrigatoriamente `item.tipo === TipoItem.SERVICO` (rejeita `PRODUTO`);
  5. Validação de medição de área: exige obrigatoriamente `item.usaMedicaoArea === true` (RN45);
  6. Carregamento do [Orcamento](file:///c:/Users/luanh/Documents/jardinagem-app/src/domain/entities/orcamento.ts) associado e validação de titularidade multi-tenant (`orcamento.usuarioId === usuarioId`);
  7. Validação do ciclo de vida: mutação exclusiva em `RASCUNHO` (`orcamento.editavel === true`, RN64, RN65);
  8. Cálculo da área em $m^2$ exclusivamente via porta `CalculadorAreaService` (`this.calculadorAreaService.calcularArea(input.geometria)`);
  9. Instanciação da entidade de domínio [Area](file:///c:/Users/luanh/Documents/jardinagem-app/src/domain/entities/area.ts) com ID via `Crypto.randomUUID()` (ou explícito se fornecido);
  10. Persistência física via [AreaRepository.criar](file:///c:/Users/luanh/Documents/jardinagem-app/src/domain/repositories/area.repository.interface.ts);
  11. Recálculo da quantidade total do item: $\text{quantidade} = \sum \text{areaCalculada}$;
  12. Recálculo do valor total do item: $\text{valorTotal} = \text{arredondarMoeda}(\text{quantidade} \times \text{valorUnitario})$;
  13. Atualização do item persistido preservando snapshots históricos (`descricao`, `valorUnitario`, `unidade = 'm²'`);
  14. Atualização em cascata do orçamento proprietário via `orcamento.recalcularValores()` e `orcamentoRepository.atualizar` (subtotal, desconto e total);
  15. Retorno da entidade `Area` persistida.

### 3.2. ListarAreasPorItemUseCase
- **Arquivo:** [src/application/use-cases/area/listar-areas-por-item.use-case.ts](file:///c:/Users/luanh/Documents/jardinagem-app/src/application/use-cases/area/listar-areas-por-item.use-case.ts)
- **Responsabilidades Executadas:**
  1. Validação de autenticação e parâmetros de entrada;
  2. Validação da existência do item de orçamento;
  3. Validação do isolamento multi-tenant através da cadeia `item_orcamento -> orcamento -> usuario_id`;
  4. Recuperação das áreas persistidas via `areaRepository.listarPorItem(itemOrcamentoId)`;
  5. Ordenação determinística inalterável por ID (`[...areas].sort((a, b) => a.id.localeCompare(b.id))`);
  6. Não recalcula as metragens (preserva valor da persistência).

### 3.3. ObterAreaUseCase
- **Arquivo:** [src/application/use-cases/area/obter-area.use-case.ts](file:///c:/Users/luanh/Documents/jardinagem-app/src/application/use-cases/area/obter-area.use-case.ts)
- **Responsabilidades Executadas:**
  1. Validação de parâmetros de entrada (`id`, `usuarioId`);
  2. Consulta à área via `areaRepository.buscarPorId(id)`;
  3. Retorno de `null` imediato se o registro não for encontrado;
  4. Validação multi-tenant: carrega `item` e `orcamento` associados. Se `orcamento.usuarioId !== usuarioId`, retorna `null` (isolamento multi-tenant preservado sem vazamento de existência);
  5. Não executa comandos SQL diretamente.

### 3.4. AtualizarAreaUseCase
- **Arquivo:** [src/application/use-cases/area/atualizar-area.use-case.ts](file:///c:/Users/luanh/Documents/jardinagem-app/src/application/use-cases/area/atualizar-area.use-case.ts)
- **Responsabilidades Executadas:**
  1. Carregamento da área atual e validação de existência;
  2. Validação do item e do orçamento associado com verificação estrita de titularidade;
  3. Bloqueio absoluto de mutação fora do status `RASCUNHO` (RN64, RN65);
  4. Atualização cadastral de metadados (`nome`, `observacoes`, `unidade`) sem recálculo desnecessário de área;
  5. Quando a geometria for alterada:
     - Validação da nova geometria poligonal;
     - Recálculo da `areaCalculada` via `GeodesicCalculadorAreaService`;
     - Atualização da área via repositório;
     - Recálculo da quantidade total do item pela soma das áreas ($\sum \text{areaCalculada}$);
     - Recálculo do valor total do item com preservação de snapshots históricos;
     - Atualização dos valores do orçamento (subtotal, desconto e total);
  6. Retorno da entidade `Area` atualizada.

### 3.5. RemoverAreaUseCase
- **Arquivo:** [src/application/use-cases/area/remover-area.use-case.ts](file:///c:/Users/luanh/Documents/jardinagem-app/src/application/use-cases/area/remover-area.use-case.ts)
- **Responsabilidades Executadas:**
  1. Carregamento da área e validação de existência;
  2. Validação do item e do orçamento associado com verificação de titularidade;
  3. Bloqueio estrito de exclusão fora do status `RASCUNHO`;
  4. Exclusão da área através de `areaRepository.remover(id)`;
  5. Recálculo da quantidade do item com as áreas restantes:
     - Se restarem áreas: $\text{quantidade} = \sum \text{areasRestantes}$;
     - Se zero áreas restarem: $\text{quantidade} = 0.00$ e $\text{valorTotal} = 0.00$;
  6. Atualização do item mantendo snapshots históricos inalterados;
  7. Atualização automática dos totais do orçamento proprietário.

### 3.6. Fachada AreaService
- **Arquivo:** [src/application/services/area.service.ts](file:///c:/Users/luanh/Documents/jardinagem-app/src/application/services/area.service.ts)
- **Responsabilidades Executadas:**
  - Padrão arquitetural idêntico a `ClienteService`, `ServicoService`, `ProdutoService` e `OrcamentoService`;
  - Injeção padronizada de dependências com fallbacks singleton para infraestrutura:
    - `areaRepo`: `supabaseAreaRepository`
    - `itemOrcamentoRepo`: `supabaseItemOrcamentoRepository`
    - `orcamentoRepo`: `supabaseOrcamentoRepository`
    - `calculadorArea`: `geodesicCalculadorAreaService`
    - `auth`: `authService`
  - Resolução automática do `usuarioId` via `auth.getCurrentUser()`;
  - Exposição dos métodos de alto nível para a camada Presentation:
    - `criarArea(dados: CriarAreaServiceInput): Promise<Area>`
    - `listarAreasPorItem(itemOrcamentoId: string): Promise<Area[]>`
    - `obterArea(id: string): Promise<Area | null>`
    - `atualizarArea(id: string, dados: AtualizarAreaServiceInput): Promise<Area>`
    - `removerArea(id: string): Promise<void>`
  - Exportação de classe e singleton `areaService`.

---

## 4. Integração e Regras de Negócio Garantidas

### 4.1. Regra da Quantidade Derivada (RN33, RN34)
Para itens onde `usaMedicaoArea === true`:
$$\text{quantidade} = \sum_{a \in \text{Areas}} a.\text{areaCalculada}$$
A quantidade do item nunca é aceita manualmente pela Presentation e não existe nenhum caminho interno de entrada manual. A cada inserção, alteração de geometria ou remoção de área, a quantidade do item é recalculada como a soma exata das áreas persistidas no repositório.

### 4.2. Cadeia de Recálculo Financeiro (RN48, RN56)
A alteração em qualquer área dispara o fluxo determinístico:
$$\text{Áreas} \longrightarrow \text{Quantidade do Item} \longrightarrow \text{Valor Total do Item} \longrightarrow \text{Subtotal} \longrightarrow \text{Desconto} \longrightarrow \text{Total}$$
Nenhuma fórmula matemática ou regra de desconto foi duplicada; o recálculo delega para `orcamento.recalcularValores()`, mantendo a regra RN53 (neutralização de desconto fixo se subtotal retornar a zero).

### 4.3. Preservação de Snapshot Histórico (RN29, RN31)
Durante a mutação das áreas de um item, os seguintes atributos do item permanecem estritamente congelados e inalterados:
- `descricao`;
- `unidade` (mantido `'m²'`);
- `valorUnitario`;
- `tipo` (`TipoItem.SERVICO`);
- `usaMedicaoArea` (`true`);
- `servicoId`.

### 4.4. Bloqueio de Ciclo de Vida (RN64, RN65)
Todas as mutações (`criar`, `atualizar`, `remover`) validam a editabilidade do orçamento:
`if (!orcamento.editavel) throw new RegraNegocioError(...)`
Bloqueando qualquer alteração quando o status for `ENVIADO`, `EM_ANALISE`, `APROVADO`, `RECUSADO`, `EXPIRADO`, `CANCELADO` ou `CONCLUIDO`.

---

## 5. Compatibilidade Hermes / React Native (RNF04)

- Os IDs gerados utilizam [expo-crypto](file:///c:/Users/luanh/Documents/jardinagem-app/tests/mocks/expo-crypto.ts) (`Crypto.randomUUID()`), homologado pela decisão D2 e plenamente compatível com o runtime Hermes/Android;
- Zero dependências de APIs Node.js (`fs`, `Buffer`, `process`, `window`, `DOM`, `crypto` global);
- Código 100% tipado em TypeScript strict mode.

---

## 6. Arquivos Criados e Modificados

### Arquivos Criados:
1. `src/application/use-cases/area/criar-area.use-case.ts`
2. `src/application/use-cases/area/listar-areas-por-item.use-case.ts`
3. `src/application/use-cases/area/obter-area.use-case.ts`
4. `src/application/use-cases/area/atualizar-area.use-case.ts`
5. `src/application/use-cases/area/remover-area.use-case.ts`
6. `src/application/use-cases/area/index.ts`
7. `src/application/services/area.service.ts`
8. `tests/areas/area-use-cases.test.ts`
9. `docs/relatorios/areas-use-cases-implementation-v1.0.md`

### Arquivos Atualizados (Barramentos):
1. `src/application/use-cases/index.ts` (exportação de `./area`)
2. `src/application/services/index.ts` (exportação de `AreaService` e tipos)
3. `src/application/index.ts` (exportação de `./use-cases/area`)
4. `package.json` (adição de script `"test:areas"`)

---

## 7. Resultados dos Testes e Regressão

### 7.1. Suíte Dedicada GAP-AREA-07
- **Arquivo:** `tests/areas/area-use-cases.test.ts`
- **Comando:** `npm run test:areas`
- **Testes executados:** 27 testes unitários dedicados a GAP-AREA-07 (+ 35 testes de GAP-AREA-04 na pasta)
- **Status:** **PASS** (62/62 testes passando em `tests/areas/`, 0 falhas)
- **Cenários cobertos:**
  - `CriarAreaUseCase`:
    - Serviço medido em RASCUNHO com recálculo correto de quantidade e valores;
    - Rejeição de serviço não medido (`usaMedicaoArea = false`);
    - Rejeição de item do tipo `PRODUTO`;
    - Bloqueio em status fora de `RASCUNHO` (`ENVIADO`);
    - Rejeição de geometria inválida (< 3 coordenadas);
    - Rejeição de item inexistente;
    - Rejeição de orçamento de outro usuário (multi-tenant);
    - Rejeição de usuário vazio/não autenticado.
  - `Multi-Área no mesmo Item (Seção 14)`:
    - Criação de Área A, B e C com IDs independentes;
    - Soma correta das metragens na quantidade do item;
    - Atualização de uma área sem interferir nas demais;
    - Remoção de uma área preservando as restantes e ajustando a quantidade.
  - `ListarAreasPorItemUseCase`:
    - Listagem de áreas em ordem determinística por ID;
    - Retorno de lista vazia para item sem áreas;
    - Isolamento multi-tenant (rejeita item de outro usuário).
  - `ObterAreaUseCase`:
    - Retorno de área existente pelo proprietário;
    - Retorno de `null` para área inexistente;
    - Retorno de `null` para área de outro usuário (sem vazamento).
  - `AtualizarAreaUseCase`:
    - Atualização de metadados sem recálculo desnecessário de área;
    - Recálculo quando geometria for alterada e atualização no item;
    - Bloqueio fora de `RASCUNHO`;
    - Rejeição de geometria inválida.
  - `RemoverAreaUseCase`:
    - Remoção em `RASCUNHO` com recálculo das áreas restantes;
    - Remoção da última área (quantidade volta a 0.00 e valorTotal a 0.00);
    - Bloqueio fora de `RASCUNHO`;
    - Rejeição de área inexistente.
  - `AreaService (Fachada)`:
    - Orquestração de ponta a ponta;
    - Rejeição quando deslogado.
  - `Conformidade Hermes / React Native`:
    - Validação de formato UUID v4;
    - Garantia da derivação de quantidade conforme RN34.

### 7.2. Suíte Geral de Regressão
| Suíte de Testes | Comando | Testes Executados | Testes Passando | Falhas |
|---|---|---|---|---|
| Typecheck App | `npm run typecheck` | — | 0 erros | 0 |
| Typecheck Testes | `npm run test:typecheck` | — | 0 erros | 0 |
| Domínio Base | `npm test` | 49 | 49 | 0 |
| Clientes | `npm run test:clientes` | 28 | 28 | 0 |
| Catálogo | `npm run test:catalogo` | 42 | 42 | 0 |
| Orçamentos | `npm run test:orcamentos` | 28 | 28 | 0 |
| Calculador Geodésico | `npx tsx --test tests/infrastructure/*.test.ts` | 13 | 13 | 0 |
| Mapper GeoJSON | `npx tsx --test tests/areas/area-geojson.mapper.test.ts` | 15 | 15 | 0 |
| Repositório de Área | `npx tsx --test tests/areas/area-repository.test.ts` | 20 | 20 | 0 |
| Casos de Uso de Área | `npx tsx --tsconfig tsconfig.test.json --test tests/areas/area-use-cases.test.ts` | 27 | 27 | 0 |
| **Total Acumulado** | — | **222** | **222** | **0** |

---

## 8. Verificação de Preservação e Não-Regressão

Em conformidade estrita com a Seção 25 do roteiro de implementação:

- **Migrations:** 0 alterações (congeladas);
- **RLS:** 0 alterações;
- **Triggers:** 0 alterações;
- **public.area:** 0 alterações;
- **CalculadorAreaService / GeodesicCalculadorAreaService:** 0 alterações (congelado GAP-AREA-06);
- **AreaRepository / SupabaseAreaRepository / AreaGeoJsonMapper:** 0 alterações (congelado GAP-AREA-04);
- **Entidades de Domínio (`Area`, `ItemOrcamento`, `Orcamento`):** 0 alterações;
- **Módulos homologados (Auth, Clientes, Catálogo, Orçamentos):** 0 alterações.

---

## 9. GAPs Remanescentes do Módulo Áreas

Com a conclusão do incremento **GAP-AREA-07**, permanecem estritamente no planejamento:

- **GAP-AREA-01:** Configuração e suporte a `react-native-maps` / modo Satellite;
- **GAP-AREA-02:** Provisionamento e proteção de Google Maps API Key;
- **GAP-AREA-08:** Hidratação e eager loading de áreas no agregado de Orçamento (`DECISÃO-AREA-04`).

---

## 10. Status Final

STATUS: **GAP-AREA-07 IMPLEMENTADO — AGUARDANDO AUDITORIA**
