# Plano Técnico de Especificação e Implementação Controlada
# Módulo: Áreas / Mapas / Medição de Área v1.0

**Projeto:** Sistema de Orçamentos para Jardinagem  
**Módulo:** Áreas, Mapas e Medição Geográfica de Área  
**Versão do Documento:** 1.0  
**Data:** 02/10/2026  
**Status:** **PLANEJAMENTO CONCLUÍDO — AGUARDANDO APROVAÇÃO**  
**Natureza da Fase:** Especificação Canônica, Análise de Gaps e Planejamento Prévio (Sem Alteração de Código ou Migrations)  

---

## 1. Objetivo

Este documento estabelece o plano técnico canônico, a delimitação precisa de escopo, o mapeamento exaustivo de requisitos e regras de negócio, a verificação da infraestrutura existente e a estratégia de implementação controlada para o módulo de **Áreas / Mapas / Medição de Área v1.0**.

O objetivo central do módulo é fornecer ao profissional de jardinagem a capacidade de delimitar geograficamente polígonos no mapa sobre imagens de satélite, calcular automaticamente a metragem quadrada ($m^2$) das áreas de trabalho, associar essas áreas aos itens de serviço orçados e derivar a quantidade comercial desses itens sem digitação manual, mantendo a integridade matemática, estrutural, histórica e multi-tenant do sistema.

A execução respeita integralmente a regra de **não alterar código, migrations, RLS ou modelos físicos nesta fase**, servindo como documento preparatório oficial antes da autorização formal de implementação.

---

## 2. Escopo do Módulo

### 2.1 O que está Dentro do Escopo (In-Scope)
1. **Visualização de Mapa Interativo:**
   - Renderização no dispositivo Android de mapa interativo com suporte a modo Satélite e modo Vetorial (mapa padrão);
   - Controles de zoom, pan (deslocamento) e recentralização.
2. **Posicionamento Inicial Inteligente:**
   - Utilização das coordenadas do cliente (`latitude` e `longitude` cadastradas em `ENDERECO`), quando disponíveis, como ponto focal de partida para abertura do mapa (RN07, RF11);
   - Posicionamento manual no mapa caso o cliente não possua endereço ou coordenadas geográficas cadastradas (RN09, RF12).
3. **Delimitação e Desenho de Polígonos:**
   - Inserção de vértices no mapa via toque na tela para delimitar a área de intervenção (RN40, RF41);
   - Fechamento do polígono com validação de no mínimo 3 vértices distintos não colapsados;
   - Suporte a edição visual: movimentação de vértices existentes (arraste), exclusão de vértices e limpeza da geometria.
4. **Validação Geométrica e Topológica:**
   - Rejeição de geometrias vazias, abertas ou com menos de 3 coordenadas distintas;
   - Rejeição de geometrias degeneradas (colapso em ponto ou segmento de reta);
   - Rejeição de geometrias inválidas segundo os padrões espaciais PostGIS (`ST_IsValid`);
   - Garantia de que a área geométrica calculada seja estritamente maior que zero ($area > 0$).
5. **Cálculo de Área em Tempo Real e Persistido:**
   - Cálculo geodésico esférico na interface em tempo real durante a manipulação dos vértices;
   - Padronização estrita da unidade em metros quadrados ($m^2$) (RN16, RN41, RF44);
   - Persistência da área calculada com precisão de duas casas decimais (`NUMERIC(12,2)`).
6. **Gerenciamento de Metadados da Área:**
   - Identificação única por UUID;
   - Nome identificador opcional (ex.: *"Gramado Frontal"*, *"Talude dos Fundos"*, *"Jardim Interno"*);
   - Observações textuais complementares opcionais;
   - Associação direta ao item de orçamento de serviço medido (`item_orcamento_id`).
7. **Suporte a Múltiplas Áreas Não Contíguas:**
   - Possibilidade de associar $N$ áreas independentes e geograficamente separadas a um mesmo item de serviço (RN38, RN39, RF42, RF43);
   - Exibição discriminada de cada área na listagem de áreas do item.
8. **Consolidação Automática da Quantidade do Item:**
   - A quantidade comercial do item passa a ser estritamente o somatório das áreas associadas: $\text{quantidade} = \sum \text{area\_calculada}$ (RN33, RF36);
   - Bloqueio terminante de digitação manual de quantidade na interface para serviços com medição (RN34, RF37).
9. **Recálculo Financeiro Reativo em Cascata:**
   - Recálculo imediato do valor total do item: $\text{valor\_total} = \text{quantidade} \times \text{valor\_unitario}$ (RN47, RF38);
   - Recálculo do subtotal do orçamento: $\text{subtotal} = \sum \text{valor\_total}$ (RN48, RF50);
   - Recálculo de desconto (percentual ou fixo) e total do orçamento (RN49, RN54, RF54, RF56).
10. **Persistência Espacial PostGIS:**
    - Armazenamento nativo da geometria no PostgreSQL/PostGIS como `GEOMETRY(POLYGON, 4326)` na tabela `public.area`;
    - Indexação espacial através de índice GiST (`idx_area_geometria`).
11. **Ciclo de Vida e Estados do Orçamento:**
    - Criação, edição e exclusão de áreas permitidas estritamente enquanto o orçamento estiver em status `RASCUNHO` (RN44, RN64, RF48, RF69);
    - Bloqueio completo de mutações de área em orçamentos `ENVIADO`, `EM_ANALISE`, `APROVADO`, `RECUSADO`, `EXPIRADO`, `CANCELADO` ou `CONCLUIDO`.

### 2.2 O que está Estritamente Fora de Escopo (Out-of-Scope)
- **Distinção Conceitual Obrigatória:** A área de trabalho **NÃO** é o endereço do cliente (RN08). O sistema jamais deve transformar a latitude/longitude do endereço do cliente em geometria de polígono da área de trabalho automaticamente;
- **Modo Offline e Sincronização em Fila:** Não haverá cache persistente de tiles de satélite, fila de mutações offline, reconciliação ou resolução de conflitos offline (conforme Arquitetura Técnica v1.1);
- **Geração e Renderização de PDF:** A inclusão de dados de áreas no PDF do orçamento pertence ao módulo independente subsequente de PDF (`PdfGenerator`);
- **Geocodificação Reversa ou Detecção Automática de Lotes:** Não haverá integração com bases cartográficas cadastrais públicas ou IA para delimitação automática de terrenos.

---

## 3. Fontes Canônicas Vigentes

O presente planejamento é estritamente fundamentado nas seguintes versões vigentes dos artefatos oficiais do projeto:

| Artefato | Versão | Status |
| :--- | :--- | :--- |
| **Regras de Negócio (RN)** | v3 | Consolidado e Homologado |
| **Requisitos Funcionais (RF)** | v2 | Consolidado e Homologado |
| **Requisitos Não-Funcionais (RNF)** | v2 | Consolidado e Homologado |
| **Diagramas UML** | v3.1 | Consolidado e Homologado |
| **Diagrama Entidade-Relacionamento (DER)** | v1.1 | Consolidado e Homologado |
| **Arquitetura Técnica** | v1.1 | Consolidado e Homologado |
| **Modelo Físico** | v1.1 | Consolidado e Homologado |
| **Estratégia de Autenticação e RLS** | v1.6 | Consolidado e Homologado |
| **Auditoria Técnica de Orçamentos e Itens** | v1.1 | Homologado (Sem pendências) |

---

## 4. Modelo Homologado da Entidade AREA e Auditoria do Banco Real

### 4.1 Estrutura Homologada (Modelo Físico v1.1)

A tabela `public.area` foi formalmente consolidada no Modelo Físico v1.1 e materializada no banco de dados local através da migration `20260916020500_modelo_fisico_v1_1.sql`.

| Coluna | Tipo Físico | Nullable | Default | Restrição / Regra Canônica |
| :--- | :--- | :---: | :--- | :--- |
| `id` | `UUID` | NÃO | `gen_random_uuid()` | Chave Primária (`area_pkey`) |
| `item_orcamento_id` | `UUID` | NÃO | - | FK -> `item_orcamento(id)` ON DELETE CASCADE |
| `nome` | `VARCHAR(150)` | SIM | `NULL` | Nome de identificação da área |
| `geometria` | `GEOMETRY(POLYGON, 4326)` | NÃO | - | Polígono fechado em WGS 84 (SRID 4326) |
| `area_calculada` | `NUMERIC(12,2)` | NÃO | - | Área em $m^2$, estritamente $> 0$ |
| `unidade` | `VARCHAR(30)` | NÃO | `'m²'` | Unidade de medição comercial padrão |
| `observacoes` | `TEXT` | SIM | `NULL` | Notas textuais complementares |

### 4.2 Constraints Ativas no PostgreSQL Local
1. `area_area_calculada_check`: `CHECK (area_calculada > 0)` — Garante que nenhuma área seja persistida com valor zero ou negativo;
2. `area_geometria_nao_vazia_check`: `CHECK (NOT ST_IsEmpty(geometria))` — Impede a inserção de geometrias vazias (`POLYGON EMPTY`);
3. `area_geometria_valida_check`: `CHECK (ST_IsValid(geometria))` — Garante a consistência topológica do polígono (sem autointerseções ou deformações inválidas);
4. `area_item_orcamento_id_fkey`: `FOREIGN KEY (item_orcamento_id) REFERENCES item_orcamento(id) ON DELETE CASCADE` — Garante que a exclusão de um item de orçamento remova em cascata todas as suas áreas associadas sem deixar órfãos.

### 4.3 Índices Ativos no Banco Real
1. `idx_area_item_orcamento_id`: B-Tree index sobre `area(item_orcamento_id)` para consultas relacionais de alto desempenho;
2. `idx_area_geometria`: Índice espacial **GiST** sobre `area(geometria)` para consultas, cálculos e otimizações espaciais do PostGIS.

> **Conclusão da Auditoria de Banco:** O modelo físico da tabela `area` já está 100% materializado, íntegro e validado no PostgreSQL local com PostGIS 3.3.7. **NÃO É NECESSÁRIO CRIAR NENHUMA NOVA MIGRATION DDL PARA A TABELA AREA.**

---

## 5. Regra Fundamental de Medição e Quantidade

A relação entre a medição espacial e o item de orçamento é uma das regras mais críticas do sistema de orçamentos para jardinagem:

```text
ItemOrcamento.usa_medicao_area = TRUE
             ↓
ItemOrcamento.quantidade = Σ Area.area_calculada  (em m²)
             ↓
Bloqueio estrito de edição manual de quantidade (RN34, RF37)
             ↓
ItemOrcamento.valor_total = quantidade × valor_unitario (RN47)
             ↓
Orcamento.subtotal = Σ valor_total dos itens (RN48)
```

### 5.1 Regras de Comportamento Dinâmico
1. **Inclusão do Serviço no Orçamento:** Quando um serviço com `usa_medicao_area = true` é adicionado ao orçamento, sua quantidade inicial é `0.00 m²`, seu valor total inicial é `R$ 0,00` e a lista de áreas inicia vazia (`[]`);
2. **Adição de Área:** A inclusão de uma nova área (ex.: 50,00 $m^2$) eleva imediatamente a quantidade do item para 50,00 $m^2$ e recalcula seu valor total;
3. **Múltiplas Áreas:** A adição subsequente de uma segunda área (ex.: 30,50 $m^2$) atualiza a quantidade para $50,00 + 30,50 = 80,50\text{ }m^2$;
4. **Edição de Geometria de Área:** Caso a geometria de uma área seja ajustada pelo usuário para 40,00 $m^2$, a quantidade do item é recalculada para $40,00 + 30,50 = 70,50\text{ }m^2$;
5. **Remoção de Área:** Caso uma área seja excluída, a quantidade decresce correspondentemente; caso todas as áreas sejam removidas, a quantidade retorna a `0.00 m²`;
6. **Validação para Envio (RN46, RN59):** O orçamento não pode transitar de `RASCUNHO` para `ENVIADO` se contiver itens de serviço medido sem áreas delimitadas ou com quantidade total igual a zero.

---

## 6. Fronteira com o Módulo Homologado de Orçamentos e Itens

O módulo de Orçamentos e Itens v1.1 deixou a arquitetura e o domínio perfeitamente preparados para a chegada do módulo de Áreas. A inspeção comprovou:

1. **Entidade de Domínio `ItemOrcamento` ([item-orcamento.ts](file:///c:/Users/luanh/Documents/jardinagem-app/src/domain/entities/item-orcamento.ts)):**
   - Possui os métodos canônicos prontos: `adicionarArea(area)`, `atualizarArea(areaAtualizada)`, `removerArea(areaId)`, `recalcularQuantidadePelasAreas()` e `calcularSomaAreas()`;
   - Método `definirQuantidadeManual()` dispara `RegraNegocioError` imediato caso `usaMedicaoArea = true`, protegendo a regra RN34;
   - Força a unidade do item como `'m²'` quando `usaMedicaoArea = true`.
2. **Entidade de Domínio `Orcamento` ([orcamento.ts](file:///c:/Users/luanh/Documents/jardinagem-app/src/domain/entities/orcamento.ts)):**
   - Método `obterErrosValidacaoEnvio()` já valida:
     ```ts
     for (const item of this._itens) {
       if (item.usaMedicaoArea) {
         if (item.areas.length === 0) {
           erros.push(`O item de serviço medido '${item.descricao}' não possui áreas delimitadas.`);
         } else if (item.quantidade <= 0) {
           erros.push(`O item de serviço medido '${item.descricao}' possui área calculada total igual a zero.`);
         }
       }
     }
     ```
   - Método `duplicar()` já clona recursivamente todas as instâncias de `Area` com novos identificadores UUID gerados pela fábrica;
   - Método `recalcularValores()` mantém subtotal, desconto e total perfeitamente sincronizados.
3. **Telas Móveis de Orçamentos:**
   - [novo.tsx](file:///c:/Users/luanh/Documents/jardinagem-app/app/(app)/orcamentos/novo.tsx) e [editar.tsx](file:///c:/Users/luanh/Documents/jardinagem-app/app/(app)/orcamentos/editar.tsx) já bloqueiam a digitação de quantidade quando `itemSelecionado.usaMedicaoArea = true`, exibindo banner informativo:
     > *"Este serviço utiliza medição de área. A quantidade será de 0 m² inicialmente e calculada a partir das áreas delimitadas no módulo de Áreas."*
4. **Ponto de Extensão Identificado na Infraestrutura:**
   - Em [supabase-item-orcamento.repository.ts](file:///c:/Users/luanh/Documents/jardinagem-app/src/infrastructure/repositories/supabase-item-orcamento.repository.ts) e [supabase-orcamento.repository.ts](file:///c:/Users/luanh/Documents/jardinagem-app/src/infrastructure/repositories/supabase-orcamento.repository.ts), os mapeadores instanciam itens com `areas: []`. O módulo de Áreas irá fornecer o repositório específico e a hidratação das áreas associadas.

---

## 7. Matriz de Requisitos Funcionais (RF)

| Requisito | Fonte | Comportamento Esperado | Componente Responsável | Evidência de Validação |
| :--- | :--- | :--- | :--- | :--- |
| **RF11** | RF v2 | Posiciona inicialmente o mapa na latitude/longitude do endereço do cliente quando disponível | `Presentation / MapaDelimitacaoArea` | Mapa abre centralizado nas coordenadas do cliente |
| **RF12** | RF v2 | Permite localização manual no mapa quando o cliente não tiver coordenadas de endereço | `Presentation / MapaDelimitacaoArea` | Mapa permite busca textual/pan manual |
| **RF36** | RF v2 | Calcula quantidade do item automaticamente pela soma das áreas em $m^2$ | `Domain / ItemOrcamento` | `quantidade = Σ areaCalculada` |
| **RF37** | RF v2 | Impede alteração manual de quantidade para serviço com medição de área | `Domain / ItemOrcamento` + `Presentation / UI` | Input desabilitado na UI e exceção disparada no domínio |
| **RF39** | RF v2 | Identifica a partir do serviço selecionado se é necessária a medição de área | `Application / AdicionarItemOrcamento` | Campo `usa_medicao_area` herdado no snapshot |
| **RF40** | RF v2 | Permite abrir o mapa de delimitação a partir do item de serviço com medição | `Presentation / DetalheItemOrcamento` | Botão "Delimitar Área no Mapa" navega para a rota de mapa |
| **RF41** | RF v2 | Permite delimitar área por meio de polígono definido manualmente no mapa | `Presentation / MapaDelimitacaoArea` + `MapProvider` | Desenho de polígono com toque na tela |
| **RF42** | RF v2 | Permite associar uma ou mais áreas ao item de serviço medido | `Application / CriarAreaUseCase` | Registro criado em `public.area` com `item_orcamento_id` |
| **RF43** | RF v2 | Permite que o mesmo item possua múltiplas áreas não contíguas | `Domain / ItemOrcamento` + `Infra / PostGIS` | Múltiplos registros de polígonos independentes para o mesmo item |
| **RF44** | RF v2 | Calcula automaticamente a área da geometria em metros quadrados ($m^2$) | `Domain / CalculadorAreaService` | Área calculada com fórmula esférica/PostGIS |
| **RF45** | RF v2 | Permite editar a geometria de uma área já existente | `Application / AtualizarAreaUseCase` | Polígono recarregado no mapa para movimentação de vértices |
| **RF46** | RF v2 | Permite editar dados complementares da área (nome e observações) | `Application / AtualizarAreaUseCase` | Atualização persistida no banco |
| **RF47** | RF v2 | Recalcula automaticamente a área calculada e valores dependentes após edição | `Domain / ItemOrcamento` + `Orcamento` | Recálculo reativo de quantidade, subtotal e total |
| **RF48** | RF v2 | Permite remover uma área de um item enquanto o orçamento estiver editável | `Application / RemoverAreaUseCase` | Exclusão do registro e recálculo da quantidade |
| **RF49** | RF v2 | Impede a associação de áreas a produtos ou serviços sem medição | `Domain / ItemOrcamento` | Exceção `RegraNegocioError` disparada |
| **RF61** | RF v2 | Exige medições concluídas ($quantidade > 0$) antes do envio do orçamento | `Domain / Orcamento` | Envio bloqueado com mensagem de validação caso áreas vazias |
| **RF73** | RF v2 | Exibe áreas detalhadas na consulta de detalhes do orçamento | `Presentation / DetalheOrcamento` | Lista de áreas com nome, geometria e metragem em $m^2$ |

---

## 8. Matriz de Regras de Negócio (RN)

| Regra | Origem | Condição / Gatilho | Comportamento Esperado | Camada Responsável | Teste Planejado |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **RN07** | RN v3 | Abertura do mapa e cliente possui endereço geocodificado | Centraliza o mapa nas coordenadas do cliente | Presentation | Teste de interface / Hook de inicialização |
| **RN08** | RN v3 | Definição da área de trabalho | A localização do cliente NÃO é a área de trabalho; não assume coordenadas do cliente como polígono | Arquitetura / Domain | Inspeção estrutural e validação de isolamento |
| **RN09** | RN v3 | Abertura do mapa e cliente sem endereço | Usuário navega manualmente até o local no mapa | Presentation | Teste com coordenadas de fallback padrão |
| **RN13** | RN v3 | Cadastro de serviço | Define se o serviço exige medição de área | Domain / Servico | Testes unitários do catálogo |
| **RN16** | RN v3 | Serviço medido | Unidade comercial obrigatória é $m^2$ | Domain / Servico | Validação de snapshot imutável |
| **RN33** | RN v3 | Item de serviço com medição | Quantidade comercial do item é igual à soma das áreas associadas | Domain / ItemOrcamento | `assert.strictEqual(item.quantidade, somaAreas)` |
| **RN34** | RN v3 | Item com `usa_medicao_area = true` | Bloqueia alteração manual da quantidade | Domain / ItemOrcamento | `throws(RegraNegocioError)` |
| **RN36** | RN v3 | Associação de área | Somente serviços com `usa_medicao_area = true` aceitam áreas | Domain / ItemOrcamento | `throws(RegraNegocioError)` |
| **RN37** | RN v3 | Vínculo relacional da Área | Uma área pertence a exatamente um item de serviço | Modelo Físico / DER | FK `item_orcamento_id` obrigatória e NOT NULL |
| **RN38** | RN v3 | Item medido | Pode possuir 1 ou mais áreas associadas | Domain / ItemOrcamento | Teste de inclusão de múltiplas instâncias de `Area` |
| **RN39** | RN v3 | Múltiplas áreas do mesmo item | Não precisam ser contíguas | Domain / PostGIS | Polígonos disjuntos persistidos com sucesso |
| **RN40** | RN v3 | Delimitação da área | Delimitada por polígono definido manualmente | Presentation / MapProvider | Validação de polígono fechado com $\ge 3$ vértices |
| **RN41** | RN v3 | Cálculo da área | Cálculo automático a partir da geometria em $m^2$ | Domain / CalculadorArea | Comparação de precisão geodésica em $m^2$ |
| **RN42** | RN v3 | Edição da área | Usuário pode editar geometria, nome e observações | Application / UseCase | Teste de mutação em rascunho |
| **RN43** | RN v3 | Geometria alterada | Atualiza `area_calculada`, quantidade do item e total | Domain / UseCase | Recálculo propagado para subtotal e total |
| **RN44** | RN v3 | Remoção de área | Permitida somente enquanto o orçamento for editável | Domain / RLS | DELETE autorizado em RASCUNHO e barrado fora |
| **RN45** | RN v3 | Item de produto ou serviço sem medição | Não pode possuir áreas associadas | Domain / ItemOrcamento | `throws(RegraNegocioError)` ao tentar adicionar |
| **RN46** | RN v3 | Serviço medido em RASCUNHO | Pode ficar temporariamente sem área enquanto rascunho | Domain / Orcamento | Salvamento permitido em RASCUNHO com 0 $m^2$ |
| **RN47** | RN v3 | Quantidade atualizada por área | $\text{valor\_total} = \text{quantidade} \times \text{valor\_unitario}$ | Domain / ItemOrcamento | Teste aritmético de multiplicação com arredondamento |
| **RN48** | RN v3 | Valor total do item alterado | Subtotal do orçamento recalcula $\sum \text{valor\_total}$ | Domain / Orcamento | Teste de somatório de múltiplos itens |
| **RN56** | RN v3 | Alteração de dados em rascunho | Subtotal, desconto e total devem ser recalculados e persistidos | Application / UseCase | Sincronização atômica de totais no banco |
| **RN59** | RN v3 | Transição de RASCUNHO para ENVIADO | Exige todas as medições necessárias concluídas ($> 0\text{ }m^2$) | Domain / Orcamento | `validarParaEnvio()` retorna erros se áreas vazias |
| **RN64** | RN v3 | Mutações de área | RASCUNHO é o único estado onde a área pode ser criada/editada | Application / RLS | Bloqueio nos Use Cases e no RLS |
| **RN65** | RN v3 | Orçamentos fora de RASCUNHO | Não podem ter suas áreas alteradas diretamente | Application / Presentation | Ocultação de ações na UI e erro no Use Case |
| **RN73** | RN v3 | Duplicação de orçamento | Duplicação clona áreas para novos UUIDs no novo orçamento | Domain / Orcamento | Instâncias clonadas independentes no banco |

---

## 9. Arquitetura do Módulo (4 Camadas)

Seguindo estritamente a **Arquitetura Técnica v1.1**:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                          PRESENTATION                                  │
│  - app/(app)/orcamentos/[id]/areas/index.tsx (Lista e Gestão de Áreas) │
│  - app/(app)/orcamentos/[id]/areas/mapa.tsx (Delimitação e Edição Mapa)│
│  - hooks: useAreas, useDesenhoMapa                                     │
│  - componentes: MapaDelimitacaoArea, PoligonoEditor, MetricasAreaCard  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ invoca
                                    v
┌────────────────────────────────────────────────────────────────────────┐
│                          APPLICATION                                   │
│  - CriarAreaUseCase                                                    │
│  - ListarAreasPorItemUseCase                                           │
│  - ObterAreaUseCase                                                    │
│  - AtualizarAreaUseCase                                                │
│  - RemoverAreaUseCase                                                  │
│  - AreaService (Fachada da Camada de Aplicação)                        │
│  - AreaValidator (Validações de entrada de aplicação)                  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ orquestra
                                    v
┌────────────────────────────────────────────────────────────────────────┐
│                            DOMAIN                                      │
│  - Entidades: Area, ItemOrcamento, Orcamento                           │
│  - Tipos e VOs: GeometriaPoligono, Coordenada                          │
│  - Funções: validarGeometriaPoligono, isPoligonoFechado                │
│  - Port/Interface: CalculadorAreaService                               │
│  - Port/Interface: AreaRepository                                     │
│  - Erros Canônicos: RegraNegocioError, DominioError                    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ implementa
                                    v
┌────────────────────────────────────────────────────────────────────────┐
│                        INFRASTRUCTURE                                  │
│  - SupabaseAreaRepository (PostgREST / PostgreSQL)                     │
│  - PostGIS Serializer/Deserializer (GeometriaPoligono <-> GeoJSON/WKT) │
│  - GeodesicCalculadorAreaService (Cálculo esférico geodésico)          │
│  - MapProvider (Abstração Google Maps via react-native-maps)           │
│  - Supabase RLS (Policies de isolamento multi-tenant)                  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 10. Provedor de Mapas (`MapProvider`) e Stack Mobile

### 10.1 Situação Atual Inspecionada no Repositório
- **`package.json`:** A biblioteca `react-native-maps` **NÃO** está instalada no momento;
- **`app.json`:** Não possui configuração de API Key do Google Maps para Android (`android.config.googleMaps.apiKey`) e não possui plugins de mapas declarados;
- **Permissões:** As permissões de localização (`ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`) não estão declaradas no `app.json`.

### 10.2 Abstração e Integração
Para manter o desacoplamento arquitetural (RNF26), a aplicação deve isolar a renderização do mapa atrás de uma abstração:
- **Port/Componente:** `MapProvider` (encapsula `MapView`, `Polygon`, `Marker` de `react-native-maps`);
- **Provedor Homologado:** Google Maps com `react-native-maps` e modo `satellite` (validado pelo POC técnico);
- **Tratamento de Indisponibilidade (RNF15, RNF22):** Se o Google Maps não carregar por falta de rede ou chave de API ausente, o sistema deve apresentar estado de erro controlado (`fallback`), sem travar o aplicativo e sem corromper dados já salvos.

---

## 11. Representação da Geometria e Conversão Espacial

### 11.1 Os Três Formatos na Arquitetura
1. **Formato Mobile (`react-native-maps`):**
   - Sequência ordenada de vértices no plano:
     ```ts
     coordinates: [{ latitude: -23.5505, longitude: -46.6333 }, ...]
     ```
2. **Formato do Domínio (`src/domain/types/geometria.ts`):**
   - Entidade tipada imutável:
     ```ts
     interface GeometriaPoligono {
       tipo: 'Polygon';
       coordenadas: Array<{ latitude: number; longitude: number }>;
     }
     ```
3. **Formato do Banco de Dados (PostGIS EPSG:4326):**
   - Coluna `geometria GEOMETRY(POLYGON, 4326)`.
   - Representação canônica em WKT:
     ```text
     POLYGON((long1 lat1, long2 lat2, long3 lat3, ..., long1 lat1))
     ```
   - Ou representação em GeoJSON standard:
     ```json
     {
       "type": "Polygon",
       "coordinates": [
         [
           [long1, lat1],
           [long2, lat2],
           [long3, lat3],
           [long1, lat1]
         ]
       ]
     }
     ```

### 11.2 Regras de Conversão
- **Fechamento de Polígono (LinearRing):** O PostGIS exige que o primeiro e o último ponto sejam rigorosamente idênticos. O conversor da camada de Infraestrutura deve garantir o fechamento explícito do anel antes do envio ao banco;
- **Ordem das Coordenadas:** Notação geográfica convencional é `(latitude, longitude)`, mas a convenção espacial OGC / GeoJSON / PostGIS é `(longitude, latitude)` (`X = longitude`, `Y = latitude`). O conversor da camada de Infraestrutura é o único responsável por essa transposição de eixos, impedindo vazamento desse detalhe para o domínio.

---

## 12. Cálculo de Área (`CalculadorAreaService`)

### 12.1 Contrato de Domínio Homologado
Localizado em `src/domain/services/calculador-area.service.ts`:
```ts
export interface CalculadorAreaService {
  calcularArea(geometria: GeometriaPoligono): number;
}
```

### 12.2 Especificação do Cálculo
- **Unidade:** Estritamente metros quadrados ($m^2$);
- **Precisão:** Arredondamento monetário/comercial canônico para duas casas decimais (`arredondarMoeda(area)`);
- **Algoritmo Geodésico na UI (Client-Side):** Para feedback imediato enquanto o jardineiro arrasta os vértices no mapa sem latência de rede, utiliza-se o cálculo esférico geodésico (baseado no raio médio da Terra $R = 6.378.137\text{ m}$ e fórmula da área de polígonos esféricos);
- **Integridade no Banco:** A constraint `area_geometria_valida_check` (`ST_IsValid`) e `area_area_calculada_check` (`area_calculada > 0`) no PostgreSQL garantem a barreira definitiva de integridade física.

---

## 13. Segurança e Isolamento Multi-Tenant (RLS)

A tabela `public.area` já está 100% protegida pela migration `20260921000000_auth_rls.sql`, com `ENABLE ROW LEVEL SECURITY` e 4 policies de titularidade por cadeia relacional dupla:

$$\text{area} \rightarrow \text{item\_orcamento} \rightarrow \text{orcamento} \rightarrow \text{usuario} = \text{auth.uid()}$$

### 13.1 Políticas Vigentes no Banco Real
1. **`area_select_policy`:**
   ```sql
   USING (
     EXISTS (
       SELECT 1 FROM public.item_orcamento io
       JOIN public.orcamento o ON o.id = io.orcamento_id
       WHERE io.id = area.item_orcamento_id AND o.usuario_id = auth.uid()
     )
   )
   ```
2. **`area_insert_policy`:**
   ```sql
   WITH CHECK (
     EXISTS (
       SELECT 1 FROM public.item_orcamento io
       JOIN public.orcamento o ON o.id = io.orcamento_id
       WHERE io.id = item_orcamento_id AND o.usuario_id = auth.uid()
     )
   )
   ```
3. **`area_update_policy`:**
   ```sql
   USING (
     EXISTS (
       SELECT 1 FROM public.item_orcamento io
       JOIN public.orcamento o ON o.id = io.orcamento_id
       WHERE io.id = area.item_orcamento_id AND o.usuario_id = auth.uid()
     )
   )
   WITH CHECK (
     EXISTS (
       SELECT 1 FROM public.item_orcamento io
       JOIN public.orcamento o ON o.id = io.orcamento_id
       WHERE io.id = item_orcamento_id AND o.usuario_id = auth.uid()
     )
   )
   ```
4. **`area_delete_policy`:**
   ```sql
   USING (
     EXISTS (
       SELECT 1 FROM public.item_orcamento io
       JOIN public.orcamento o ON o.id = io.orcamento_id
       WHERE io.id = area.item_orcamento_id
         AND o.usuario_id = auth.uid()
         AND o.status = 'RASCUNHO'
     )
   )
   ```

> **Verificação:** Todas as quatro operações primitivas (SELECT, INSERT, UPDATE, DELETE) já estão plenamente cobertas e validadas por 8 asserções pgTAP em `supabase/tests/05_itens_e_areas_rls.sql` e `08_cross_tenant_mutations.sql`.

---

## 14. Matriz de Testes Multi-Tenant Planejada

| ID | Cenário de Teste | Ação Executada | Resultado Esperado | Camada de Bloqueio |
| :---: | :--- | :--- | :--- | :--- |
| **MT-01** | SELECT Próprio | User A consulta áreas de seu item | Áreas retornadas com sucesso | RLS / PostgREST |
| **MT-02** | SELECT Cruzado | User A tenta consultar área criada por User B | 0 registros retornados | RLS (`area_select_policy`) |
| **MT-03** | INSERT Cruzado | User A tenta inserir área vinculando `item_orcamento_id` de User B | Bloqueado com violação de RLS | RLS (`area_insert_policy`) |
| **MT-04** | UPDATE Cruzado | User A tenta alterar nome ou geometria de área de User B | 0 linhas afetadas | RLS (`area_update_policy`) |
| **MT-05** | Transferência Cruzada | User A tenta via UPDATE alterar `item_orcamento_id` para item de User B | Bloqueado com violação de RLS | RLS (`area_update_policy WITH CHECK`) |
| **MT-06** | DELETE Cruzado | User A tenta deletar área de User B | 0 linhas afetadas | RLS (`area_delete_policy`) |
| **MT-07** | DELETE Fora de RASCUNHO | User A tenta deletar área cujo orçamento está em `ENVIADO` | Bloqueado pelo RLS | RLS (`o.status = 'RASCUNHO'`) |

---

## 15. Casos de Uso Planejados (Application Layer)

1. **`CriarAreaUseCase`:**
   - **Entrada:** `usuarioId`, `itemOrcamentoId`, `nome?`, `geometria`, `areaCalculada`, `observacoes?`;
   - **Validações:** Verifica se orçamento pai é do usuário e está em `RASCUNHO`; valida se o item é de serviço com `usaMedicaoArea = true`; valida geometria e área $> 0$;
   - **Persistência:** Persiste a área em `public.area`;
   - **Propagação:** Atualiza a quantidade do item somando a nova área; atualiza subtotal e total do orçamento no banco.
2. **`ListarAreasPorItemUseCase`:**
   - **Entrada:** `usuarioId`, `itemOrcamentoId`;
   - **Validações:** Verifica se o item pertence a orçamento do usuário;
   - **Saída:** Lista de entidades `Area` com geometrias e metragens.
3. **`ObterAreaUseCase`:**
   - **Entrada:** `usuarioId`, `areaId`;
   - **Saída:** Detalhes completos da entidade `Area`.
4. **`AtualizarAreaUseCase`:**
   - **Entrada:** `usuarioId`, `areaId`, `nome?`, `geometria?`, `areaCalculada?`, `observacoes?`;
   - **Validações:** Orçamento em `RASCUNHO`; nova geometria válida se informada;
   - **Propagação:** Atualiza o registro; recalcula a soma das áreas do item; recalcula subtotal e total do orçamento.
5. **`RemoverAreaUseCase`:**
   - **Entrada:** `usuarioId`, `areaId`;
   - **Validações:** Orçamento em `RASCUNHO`;
   - **Persistência:** Exclui o registro de `public.area`;
   - **Propagação:** Recalcula a quantidade do item sem a área removida; atualiza totais do orçamento.

---

## 16. Experiência do Usuário (UX) e Rotas Planejadas

### 16.1 Rotas na Camada de Apresentação (Expo Router)
Para manter o padrão já consolidado no projeto, propõem-se as seguintes rotas:

1. **Gestão de Áreas do Item:**  
   `app/(app)/orcamentos/[id]/itens/[itemId]/areas/index.tsx`
   - Cabeçalho com dados do item e orçamento;
   - Card com a metragem total acumulada ($m^2$) e valor financeiro do item;
   - Lista das áreas já delimitadas (nome, metragem, miniatura de polígono ou ícone);
   - Ações por área: "Editar Geometria", "Editar Dados", "Excluir";
   - Botão flutuante ou de destaque: **"Delimitar Nova Área no Mapa"**.

2. **Tela de Delimitação e Edição no Mapa:**  
   `app/(app)/orcamentos/[id]/itens/[itemId]/areas/mapa.tsx`
   - Tela cheia com o componente do Google Maps;
   - Botão para alternar modo Satélite / Mapa Vetorial;
   - Botão para centralizar no cliente (se houver coordenadas);
   - Painel flutuante superior com feedback em tempo real da metragem calculada ($m^2$);
   - Barra inferior de ferramentas:
     - "Desfazer Vértice" (remove o último ponto inserido);
     - "Limpar Polígono";
     - "Cancelar";
     - **"Concluir Delimitação"** (abre diálogo/modal para confirmar nome e observações e salvar).

---

## 17. Matriz de Erros e Validações

| Condição de Falha | Código / Tipo de Erro | Mensagem Canônica Apresentada | Camada Responsável |
| :--- | :--- | :--- | :--- |
| Menos de 3 vértices no polígono | `RegraNegocioError` | *"A geometria da área deve ser um polígono válido com pelo menos 3 coordenadas."* | Domain / Validator |
| Vértices colapsados ou degenerados | `RegraNegocioError` | *"O polígono deve possuir no mínimo 3 vértices distintos."* | Domain / Validator |
| Área calculada $\le 0$ | `RegraNegocioError` | *"A área calculada deve ser um valor numérico estritamente maior que zero."* | Domain / Entity |
| Polígono com autointerseção | `RegraNegocioError` / SQL `23514` | *"A geometria do polígono não é topologicamente válida."* | Domain / PostGIS |
| Adicionar área a produto | `RegraNegocioError` | *"Não é permitido adicionar áreas a um item que não utiliza medição de área."* | Domain / ItemOrcamento |
| Adicionar área a serviço não medido | `RegraNegocioError` | *"Não é permitido adicionar áreas a um item que não utiliza medição de área."* | Domain / ItemOrcamento |
| Edição de área fora de RASCUNHO | `RegraNegocioError` | *"Áreas não podem ser alteradas em orçamentos fora do status RASCUNHO."* | Application / UseCase |
| Exclusão de área fora de RASCUNHO | `RegraNegocioError` / RLS | *"Áreas não podem ser excluídas em orçamentos fora do status RASCUNHO."* | Application / RLS |
| Envio de orçamento sem áreas medidas | `ValidacaoEnvioError` | *"O item de serviço medido '[nome]' não possui áreas delimitadas."* | Domain / Orcamento |
| Falha no carregamento do Google Maps | `InfraestruturaError` | *"Não foi possível inicializar o mapa. Verifique a conexão com a internet."* | Presentation / MapProvider |

---

## 18. Critérios de Aceite Objetivos

| # | Requisito / Regra | Critério Objetivo de Aceite | Validação / Teste | Evidência Exigida |
| :---: | :--- | :--- | :--- | :--- |
| **CA-01** | Visualização de Mapa | Mapa Google Maps renderiza modo satélite no Android | Execução mobile | Captura de tela do mapa em satélite |
| **CA-02** | Posicionamento Inicial | Centraliza na latitude/longitude do endereço do cliente | Teste de UI | Coordenadas do centro conferem com o cliente |
| **CA-03** | Desenho de Polígono | Permite marcar vértices e fechar polígono na tela | Teste de UI | Polígono desenhado e preenchido na tela |
| **CA-04** | Validação Geométrica | Bloqueia polígono com $< 3$ vértices ou área $\le 0$ | Testes unitários | Exceção `RegraNegocioError` disparada |
| **CA-05** | Cálculo em $m^2$ | Área é calculada e arredondada em $m^2$ com 2 casas | Teste matemático | Cálculo confere com a fórmula esférica |
| **CA-06** | Múltiplas Áreas | Permite criar 2 ou mais áreas não contíguas para o mesmo item | Teste de integração | Registros independentes persistidos em `public.area` |
| **CA-07** | Quantidade Derivada | `ItemOrcamento.quantidade` é exatamente igual a $\sum \text{area\_calculada}$ | Teste automatizado | Verificação de integridade no banco |
| **CA-08** | Bloqueio Manual | Campo de quantidade não é editável na interface | Teste de UI | Campo desabilitado/bloqueado na tela |
| **CA-09** | Recálculo Financeiro | Valor total do item e totais do orçamento atualizam | Teste automatizado | `subtotal` e `total` do orçamento recalculados |
| **CA-10** | Edição de Área | Permite reabrir área salva, ajustar vértices e recalcular | Teste mobile | Atualização no banco com novos m² e valor |
| **CA-11** | Remoção de Área | Exclusão de área decresce a quantidade do item | Teste automatizado | Registro removido e totais atualizados |
| **CA-12** | Isolamento Multi-Tenant | User A não acessa, edita ou exclui áreas de User B | pgTAP / PostgREST | 0 registros visíveis e erros de RLS |
| **CA-13** | Bloqueio Fora de Rascunho | Mutações proibidas fora do status `RASCUNHO` | Teste automatizado | Ações bloqueadas na UI, use case e RLS |
| **CA-14** | Validação para Envio | Impede envio de orçamento medido com 0 áreas | Teste de domínio | Erro retornado ao tentar transitar para `ENVIADO` |
| **CA-15** | Duplicação Independente | Duplicação do orçamento clona áreas com novos IDs | Teste automatizado | Áreas clonadas com sucesso no novo orçamento |

---

## 19. Tabela de GAPs Identificados

| ID | GAP Identificado | Fonte / Evidência | Impacto | Classificação | Precisa Decisão? |
| :---: | :--- | :--- | :--- | :--- | :---: |
| **GAP-AREA-01** | Dependência `react-native-maps` não instalada | `package.json` | Não há biblioteca de mapas no projeto mobile | Implementação pendente | Sim (Instalação via `npx expo install`) |
| **GAP-AREA-02** | Google Maps API Key não configurada | `app.json` | Google Maps nativo não inicializa no Android | Implementação pendente | Sim (Definir provisionamento de chave) |
| **GAP-AREA-03** | Permissões de localização ausentes | `app.json` | App não pode acessar localização atual caso usuário solicite | Implementação pendente | Não (Declarar no `app.json`) |
| **GAP-AREA-04** | Repositório de Área não implementado | `src/infrastructure/repositories/` | Não há métodos para CRUD de `Area` via PostgREST | Implementação pendente | Não (Seguir padrão dos demais repositórios) |
| **GAP-AREA-05** | Conversor PostGIS (WKT/GeoJSON) não criado | `src/infrastructure/` | Formato da coluna `geometria` não serializado | Implementação pendente | Sim (Definir WKT vs GeoJSON) |
| **GAP-AREA-06** | `CalculadorAreaService` sem implementação concreta | `src/infrastructure/` | Domínio possui o contrato, mas falta o adaptador concreto | Implementação pendente | Sim (Definir algoritmo ou biblioteca) |
| **GAP-AREA-07** | Use cases de aplicação para Área não criados | `src/application/use-cases/` | Faltam os 5 use cases de orquestração de área | Implementação pendente | Não (Padrão limpo já consolidado) |
| **GAP-AREA-08** | Repositórios de Orçamento/Item com `areas: []` estático | `supabase-item-orcamento.repository.ts` | Áreas salvas não são hidratadas ao abrir orçamento | Implementação pendente | Sim (Eager vs Lazy loading) |
| **GAP-AREA-09** | Telas e rotas de mapa e áreas não criadas | `app/(app)/orcamentos/` | Usuário não tem interface para desenhar áreas | Implementação pendente | Não (Seguir padrão de telas do Expo Router) |

---

## 20. Novas Decisões Técnicas Registradas

### DECISÃO-AREA-01: Algoritmo/Mecanismo para Cálculo Geodésico de Área
- **Problema:** O domínio define a porta `CalculadorAreaService`, mas é necessária uma implementação concreta para calcular a área em $m^2$ a partir das coordenadas geográficas (latitude/longitude em WGS84).
- **Alternativas:**
  1. *Alternativa A:* Implementação pura em TypeScript utilizando a fórmula matemática esférica de polígonos geodésicos (algoritmo padrão do OpenGIS/Spherical Geometry, sem nenhuma nova dependência npm);
  2. *Alternativa B:* Instalação de biblioteca externa de geoespacial (ex.: `@turf/area` ou `geolib`);
  3. *Alternativa C:* Delegar todo o cálculo exclusivamente para o PostGIS (`ST_Area(geometria::geography)`) via chamada RPC ao Supabase.
- **Recomendação Técnica:** **Alternativa A (Implementação pura em TypeScript)** para o cálculo interativo imediato na UI (zero dependências extras, compatível com Hermes, offline-first durante o desenho) combinada com a validação final da geometria no PostGIS (`ST_Area`) na persistência.
- **Necessidade de Homologação:** Sim.

### DECISÃO-AREA-02: Formato de Serialização Espacial com o Supabase PostgREST
- **Problema:** A coluna `public.area.geometria` é do tipo `GEOMETRY(POLYGON, 4326)`. O PostgREST aceita e retorna dados espaciais em múltiplos formatos.
- **Alternativas:**
  1. *Alternativa A (GeoJSON):* Enviar e receber como objeto GeoJSON standard (`{ "type": "Polygon", "coordinates": [[[long, lat], ...]] }`);
  2. *Alternativa B (WKT):* Enviar e receber como string Well-Known Text (`POLYGON((long lat, ...))`);
  3. *Alternativa C (EWKB/Hex):* Formato binário hexadecimal nativo do PostGIS.
- **Recomendação Técnica:** **Alternativa A (GeoJSON)** ou **Alternativa B (WKT)**. A alternativa GeoJSON possui suporte nativo em JavaScript/JSON e é diretamente interpretada pelo PostgREST 10+.
- **Necessidade de Homologação:** Sim.

### DECISÃO-AREA-03: Provisionamento e Segurança da Google Maps API Key
- **Problema:** O `react-native-maps` no Android requer uma chave de API Google Maps registrada nas credenciais do Google Cloud Console com o Maps SDK for Android ativado.
- **Alternativas:**
  1. *Alternativa A:* Configurar chave restrita por package name (`com.jardinagem.app`) e SHA-1 do keystore Android no Google Cloud Console, injetada via variável de ambiente no `app.config.js`;
  2. *Alternativa B:* Mock / Provider configurável com chave de teste para o ambiente de emulador e CI.
- **Recomendação Técnica:** **Alternativa A**, com chave de teste restrita documentada e isolamento em `MapProvider`.
- **Necessidade de Homologação:** Sim.

### DECISÃO-AREA-04: Estratégia de Hidratação das Áreas no Orçamento
- **Problema:** Como carregar as áreas vinculadas aos itens ao consultar um orçamento.
- **Alternativas:**
  1. *Alternativa A (Eager Loading):* Na consulta de detalhe do orçamento (`SupabaseOrcamentoRepository.buscarPorId`), incluir a relação aninhada `item_orcamento(*, area(*))`, instanciando a árvore completa de entidades com suas áreas;
  2. *Alternativa B (Lazy Loading):* Carregar áreas separadamente através de `AreaRepository.listarPorItem(itemId)` apenas quando a tela de áreas for acessada.
- **Recomendação Técnica:** **Alternativa A (Eager Loading)** para a consulta completa do orçamento (garante que os totais e a validação de envio tenham acesso imediato a `item.areas`), combinada com consulta pontual de `AreaRepository` na tela dedicada de gestão de áreas.
- **Necessidade de Homologação:** Sim.

---

## 21. Plano de Implementação Controlada (Fases Futuras)

A implementação subsequente deverá seguir rigorosamente a ordem em ondas controladas:

1. **Fase 1 — Domínio e Contratos:**
   - Verificação e consolidação dos contratos já existentes (`Area`, `ItemOrcamento`, `CalculadorAreaService`, `GeometriaPoligono`);
   - Testes unitários completos de domínio (49 testes existentes + novos cenários de borda).
2. **Fase 2 — Infraestrutura Espacial e Adaptadores:**
   - Implementação de `GeodesicCalculadorAreaService` (adaptador concreto do contrato);
   - Implementação do serializador/desserializador GeoJSON/WKT para PostGIS EPSG:4326.
3. **Fase 3 — Repositório de Área e Banco PostGIS:**
   - Definição da interface `AreaRepository`;
   - Implementação de `SupabaseAreaRepository` com mapeamento PostgREST/PostGIS;
   - Testes de integração direta de persistência espacial e constraints.
4. **Fase 4 — Casos de Uso da Aplicação:**
   - Implementação dos 5 casos de uso (`CriarAreaUseCase`, `ListarAreasPorItemUseCase`, `ObterAreaUseCase`, `AtualizarAreaUseCase`, `RemoverAreaUseCase`);
   - Implementação do validador `AreaValidator`;
   - Implementação da fachada `AreaService`.
5. **Fase 5 — Hidratação e Integração com Orçamentos:**
   - Atualização de `SupabaseOrcamentoRepository` e `SupabaseItemOrcamentoRepository` para hidratação das áreas reais;
   - Validação da propagação do recálculo de quantidades e totais financeiros.
6. **Fase 6 — Instalação Controlada e Configuração Mobile:**
   - Instalação oficial de `react-native-maps` compatível com Expo SDK 57 (`npx expo install react-native-maps`);
   - Configuração do plugin e Google Maps API key no `app.json`.
7. **Fase 7 — Camada de Apresentação (UI / Mobile):**
   - Criação da abstração `MapProvider`;
   - Criação das telas no Expo Router:
     - `app/(app)/orcamentos/[id]/itens/[itemId]/areas/index.tsx`
     - `app/(app)/orcamentos/[id]/itens/[itemId]/areas/mapa.tsx`
   - Integração com `useAreas` e desenho reativo de polígonos.
8. **Fase 8 — Suíte de Testes Automatizados:**
   - Testes unitários de use cases de área;
   - Testes de multi-tenant e RLS (TypeScript e pgTAP);
   - Typecheck estrito (`npm run typecheck` e `npm run test:typecheck`).
9. **Fase 9 — Validação Empírica no Android Real:**
   - Execução no Android Emulator (`Pixel_10` / Hermes JS Engine);
   - Teste completo de ponta a ponta: abrir mapa -> desenhar polígono -> calcular m² -> salvar -> verificar quantidade no item -> recalcular orçamento -> reabrir e editar.
10. **Fase 10 — Auditoria Técnica Independente e Homologação:**
    - Auditoria de código, banco, RLS, regras e evidências móveis;
    - Emissão do relatório final de homologação.

---

## 22. Checklist de Preservação dos Módulos Anteriores

Para garantir a estabilidade e a não-regressão do ecossistema, os seguintes componentes permanecem estritamente congelados e preservados:

- [x] **Módulo de Orçamentos e Itens:** Regras de negócio, snapshot histórico, máquina de estados comercial e use cases permanecem 100% íntegros;
- [x] **Módulo de Clientes e Endereços:** Cadastro, consulta e geocodificação de endereços permanecem intactos;
- [x] **Módulo de Catálogo (Serviços e Produtos):** Regras de cadastro, unicidade e ativação/desativação preservadas;
- [x] **Autenticação e RLS:** Estratégia v1.6 e as 31 policies ativas permanecem intocadas;
- [x] **Modelo Físico v1.1:** DDL, colunas e constraints existentes preservadas sem nenhuma alteração;
- [x] **Migrations Homologadas:** Nenhuma migration alterada ou criada nesta execução;
- [x] **Testes Existentes:** Suíte de 49 testes de domínio e 28 testes de orçamentos 100% aprovados sem regressões.

---

## 23. Conclusão do Planejamento

A especificação técnica do módulo de **Áreas / Mapas / Medição de Área v1.0** está consolidada e alinhada com toda a documentação canônica do projeto. 

Todas as lacunas técnicas foram explicitamente identificadas como GAPs catalogados, e as decisões pendentes foram formalizadas para avaliação. 

Nenhum código-fonte ou banco de dados foi alterado durante esta fase preparatória.

**STATUS:** **PLANEJAMENTO CONCLUÍDO — AGUARDANDO APROVAÇÃO**
