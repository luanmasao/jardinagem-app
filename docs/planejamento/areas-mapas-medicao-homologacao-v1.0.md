# Termo de Homologação Formal do Planejamento Técnico v1.0
# Módulo: Áreas / Mapas / Medição de Área

**Projeto:** Sistema de Orçamentos para Jardinagem  
**Módulo:** Áreas / Mapas / Medição de Área v1.0  
**Artefato Avaliado:** [`docs/planejamento/areas-mapas-medicao-plan-v1.0.md`](./areas-mapas-medicao-plan-v1.0.md)  
**Data da Homologação:** 02/10/2026  
**Auditor / Avaliador:** Antigravity IDE (Pair Programming Assistant / Engenharia de Software)  
**Status Final:** **PLANEJAMENTO HOMOLOGADO — PRONTO PARA IMPLEMENTAÇÃO**  

---

## 1. Identificação da Homologação

O presente documento formaliza a revisão técnica independente e a **homologação formal do planejamento técnico** do módulo de **Áreas / Mapas / Medição de Área v1.0**, documentado em `docs/planejamento/areas-mapas-medicao-plan-v1.0.md`.

Esta homologação atesta que o planejamento produzido cumpriu integralmente todos os critérios de consistência arquitetural, rastreabilidade de requisitos, fidelidade às regras de negócio, conformidade com o Modelo Físico v1.1 e respeito à integridade dos módulos já congelados e homologados (Autenticação, Clientes, Catálogo e Orçamentos + Itens).

> **Aviso de Restrição de Escopo:** O presente termo autoriza tecnicamente o plano para futura execução, mas **NENHUM CÓDIGO-FONTE, MIGRATION OU DEPENDÊNCIA FOI IMPLEMENTADO NESTA EXECUÇÃO**, em cumprimento estrito às diretrizes de governança.

---

## 2. Fontes Canônicas Auditadas

A homologação fundamentou-se na confrontação analítica direta do plano com o conjunto integral das fontes canônicas do projeto em suas versões vigentes:

1. **Regras de Negócio (RN v3):** Documento oficial `docs/regras_negocio.docx` (especificamente RN07 a RN09, RN13, RN16, RN33, RN34, RN36 a RN46, RN47, RN48, RN56, RN59, RN64, RN65 e RN73);
2. **Requisitos Funcionais (RF v2):** Documento oficial `docs/requisitos/requisitos_funcionais.docx` (especificamente RF11, RF12, RF36, RF37, RF39 a RF49, RF61, RF73 e RF80);
3. **Requisitos Não-Funcionais (RNF v2):** Documento oficial `docs/requisitos/requisitos_nao_funcionais.docx` (especificamente RNF05, RNF13, RNF15, RNF19, RNF22, RNF26, RNF29 e RNF30);
4. **Diagramas UML (UML v3.1):** `docs/uml/classes.puml`, `casos_de_uso.puml`, `sequencia.puml`, `estados.puml`, `atividades.puml` e `der.puml`;
5. **Diagrama Entidade-Relacionamento (DER v1.1):** `docs/uml/der.puml`;
6. **Modelo Físico PostgreSQL / PostGIS v1.1:** `docs/modelo-fisico-v1.1.md`;
7. **Arquitetura Técnica v1.1:** `.agents/rules/architecture.md`;
8. **Estratégia Auth/RLS Homologada:** `docs/relatorios/auth-rls-strategy-v1.6.md` e migration `20260921000000_auth_rls.sql`;
9. **Termo de Homologação de Clientes:** `docs/relatorios/clientes-implementation-homologation-v1.0.md`;
10. **Termo de Homologação de Catálogo:** `docs/relatorios/catalogo-servicos-produtos-implementation-homologation-v1.0.md`;
11. **Relatório de Auditoria e Homologação de Orçamentos e Itens v1.1:** `docs/relatorios/orcamentos-itens-implementation-audit-v1.1.md`;
12. **Plano Técnico de Áreas v1.0:** `docs/planejamento/areas-mapas-medicao-plan-v1.0.md`.

---

## 3. Delimitação Estrita de Escopo

O escopo do módulo de Áreas foi auditado e encontra-se estritamente delimitado em torno da entidade `Area` e da delimitação geográfica de áreas de serviço que exigem medição:

### 3.1 Escopo Aprovado
- Visualização de mapa no Android com alternância entre modo Satélite e modo Vetorial;
- Posicionamento inicial na localização do cliente (`latitude` e `longitude` do endereço cadastrado), quando existente;
- Delimitação manual de polígonos no mapa (`react-native-maps`) sobre imagens de satélite;
- Inserção, arraste e remoção de vértices com fechamento geométrico válido ($\ge 3$ vértices distintos);
- Validação topológica de polígonos (rejeição de autointerseções, polígonos vazios e áreas $\le 0$);
- Cálculo geodésico da área em tempo real na interface e persistido estritamente em metros quadrados ($m^2$);
- Suporte a múltiplas áreas não contíguas para o mesmo item de orçamento;
- Atribuição de metadados à área: identificador UUID, nome identificador opcional e observações opcionais;
- Vínculo relacional obrigatório com `ItemOrcamento`;
- Derivação automática da quantidade comercial do item: $\text{quantidade} = \sum \text{area\_calculada}$;
- Bloqueio completo da digitação manual de quantidade na interface para serviços medidos (RN34);
- Recálculo financeiro em cascata: valor total do item, subtotal, desconto e total do orçamento;
- Persistência espacial nativa no PostGIS (`GEOMETRY(POLYGON, 4326)`) com índice espacial GiST;
- Reabertura e consulta visual de polígonos previamente persistidos;
- Mutações e exclusões restritas estritamente ao status `RASCUNHO`.

### 3.2 Exclusões Explícitas e Invioláveis (Out-of-Scope)
- **Distinção entre Endereço e Área (RN08):** As coordenadas do endereço do cliente representam apenas a localização civil do imóvel e ponto de partida do mapa, jamais a geometria da área de trabalho;
- **Sincronização Offline:** Ausência total de fila de mutações offline, reconciliação ou merge de conflitos (fora de escopo da Arquitetura Técnica v1.1);
- **Módulos Subsequentes e Externos:** O módulo de Áreas não invade geração de PDF (`PdfGenerator`), disparo por WhatsApp, gateways de pagamento, controle financeiro, controle de estoque ou CRM.

---

## 4. Conformidades Auditadas (13 Verificações Canônicas)

| # | Verificação Obrigatória | Parecer Técnico | Justificativa e Rastreabilidade |
| :---: | :--- | :---: | :--- |
| **1** | **Separação de Escopo:** Áreas vs. Orçamentos + Itens | **CONFORME** | O módulo de Orçamentos gerencia propostas comerciais, itens e totais. O módulo de Áreas limita-se à espacialidade, polígonos e cálculo da metragem em $m^2$. |
| **2** | **Sem Reinterpretação de Requisitos:** Preservação dos RFs | **CONFORME** | Nenhum dos 82 requisitos funcionais homologados em RF v2 foi alterado ou redefinido. RF36, RF37 e RF39 a RF49 mantêm integridade exata. |
| **3** | **Sem Regras Novas Implícitas:** Fidelidade às RNs | **CONFORME** | Todas as regras referenciadas derivam estritamente de RN v3 (RN07-09, RN13, RN16, RN33, RN34, RN36-46, RN47, RN48, RN56, RN59, RN64, RN65, RN73). |
| **4** | **Alinhamento ao Modelo Físico v1.1:** Tabela `public.area` | **CONFORME** | A tabela `public.area` já existe com as 7 colunas homologadas, 3 constraints ativas (`area_area_calculada_check`, `area_geometria_nao_vazia_check`, `area_geometria_valida_check`), FK CASCADE e índice espacial GiST. Zero DDL novo. |
| **5** | **Integração com ItemOrcamento:** RN34 / RN46 / RN59 / RN73 | **CONFORME** | Respeita o bloqueio de quantidade manual (RN34), a permissão de 0 áreas em rascunho (RN46), a obrigatoriedade de medições concluídas para envio (RN59) e a clonagem de áreas na duplicação (RN73). |
| **6** | **Múltiplas Áreas Não Contíguas:** RN38 e RN39 | **CONFORME** | Contempla expressamente suporte a $N$ polígonos independentes e disjuntos para o mesmo item de serviço medido. |
| **7** | **Quantidade Derivada da Soma das Áreas:** RN33 e RF36 | **CONFORME** | $\text{quantidade} = \sum \text{area\_calculada}$. Fonte única da verdade matemática, sem redundância ou estado divergente. |
| **8** | **Preservação do Snapshot Histórico:** RN29 e RN30 | **CONFORME** | Inclusão de áreas afeta a quantidade do item no orçamento, mas preserva intactos `descricao`, `unidade = 'm²'`, `valor_unitario` e a independência do catálogo de serviços. |
| **9** | **Mutações Restritas a RASCUNHO:** RN44, RN64 e RN65 | **CONFORME** | Criar, editar e excluir áreas são ações exclusivas do estado `RASCUNHO`. Bloqueadas na interface, nos casos de uso e pelo RLS no banco. |
| **10** | **Isolamento Multi-Tenant:** RLS por Cadeia Homologada | **CONFORME** | O acesso à área é protegido pela cadeia $\text{area} \rightarrow \text{item} \rightarrow \text{orcamento} \rightarrow \text{usuario} = \text{auth.uid()}$. As 4 policies de RLS existentes já cobrem SELECT, INSERT, UPDATE e DELETE. |
| **11** | **Arquitetura em 4 Camadas:** Arquitetura Técnica v1.1 | **CONFORME** | Divisão estrita em Presentation, Application, Domain e Infrastructure, preservando os domínios desacoplados de infraestrutura externa. |
| **12** | **Sem Sincronização Offline:** Escopo Arquitetural | **CONFORME** | O planejamento declara categoricamente fora de escopo cache persistente de tiles, filas de mutação offline ou resolução de conflitos. |
| **13** | **Sem Invasão de Outros Domínios:** Limite Operacional | **CONFORME** | Não invade PDF, WhatsApp, pagamentos, financeiro, estoque ou CRM. |

---

## 5. Homologação das Decisões Técnicas

As três decisões técnicas estruturadas no planejamento foram submetidas à análise crítica e formalmente deliberadas:

### 5.1 DECISÃO-AREA-01: Cálculo Geodésico Esférico Puro em TypeScript
- **Necessidade Confirmada:** Sim. O contrato de domínio `CalculadorAreaService` (`calcularArea(geometria: GeometriaPoligono): number`) exige um adaptador concreto para fornecer retorno imediato em metros quadrados ($m^2$) na interface móvel enquanto o jardineiro interage com os vértices no mapa.
- **Justificativa Técnica:**
  1. *Zero Dependências:* A fórmula da área em polígonos esféricos sobre o elipsoide WGS84/esfera de raio médio ($R = 6.378.137\text{ m}$) pode ser implementada puramente em TypeScript com alta precisão e sem necessidade de incluir bibliotecas externas pesadas;
  2. *Compatibilidade Hermes:* Executa nativamente no motor JavaScript Hermes no Android com altíssimo desempenho e sem dependência de APIs restritas de navegadores;
  3. *Testabilidade:* Permite testes unitários 100% determinísticos no pipeline de CI/testes;
  4. *Validação Backend:* O PostGIS continua como autoridade final de validação física via `ST_Area(geometria::geography)`.
- **Impacto:** Criação da classe `GeodesicCalculadorAreaService` na camada de Infraestrutura, implementando a interface `CalculadorAreaService`.
- **Status:** **HOMOLOGADA**

### 5.2 DECISÃO-AREA-02: GeoJSON para Transporte Espacial via PostgREST
- **Necessidade Confirmada:** Sim. É necessário padronizar o formato de entrada e saída das geometrias poligonais entre o cliente móvel React Native e o PostgREST / Supabase.
- **Justificativa Técnica:**
  1. *Padrão Aberto OGC/IETF:* O GeoJSON (RFC 7946) é o formato padrão da web e do ecossistema espacial, sendo nativamente suportado em JSON;
  2. *Suporte PostgREST / PostGIS:* O PostgREST 10+ converte nativamente payloads GeoJSON para o tipo espacial `GEOMETRY(POLYGON, 4326)` no banco e pode serializar geometrias em GeoJSON diretamente;
  3. *Isolamento de Eixos:* A transposição da convenção GeoJSON `[longitude, latitude]` para o modelo de domínio `{ latitude, longitude }` fica restrita a um único mapper na Infraestrutura (`PostgisGeoJsonMapper`), sem vazar para a interface ou domínio.
- **Impacto:** Implementação de serializador e desserializador GeoJSON na camada de Infraestrutura (`SupabaseAreaRepository`).
- **Status:** **HOMOLOGADA**

### 5.3 DECISÃO-AREA-04: Eager Loading das Áreas no Detalhe de Orçamento/Item
- **Necessidade Confirmada:** Sim. A entidade `Orcamento` e seus `ItemOrcamento` necessitam das instâncias de `Area` hidratadas para somar a metragem, validar o envio (RN59) e realizar duplicações autônomas (RN73).
- **Justificativa Técnica:**
  1. *Eficiência de Rede (Anti-N+1):* A chamada PostgREST `orcamento.select('*, cliente(*), item_orcamento(*, area(*))')` busca a árvore relacional completa do orçamento em uma única requisição HTTP atômica;
  2. *Consistência de Domínio:* Permite que a entidade de domínio `Orcamento` nasça com todos os seus invariantes de envio e somatório de áreas perfeitamente satisfeitos;
  3. *Complementaridade com Lazy Loading:* A tela de gestão específica de áreas continuará utilizando a consulta direta via `AreaRepository.listarPorItem(itemId)` para operações de foco e refresh.
- **Impacto:** Ajuste dos mapeadores em `SupabaseOrcamentoRepository` e `SupabaseItemOrcamentoRepository` para instanciar instâncias reais de `Area` a partir dos dados retornados.
- **Status:** **HOMOLOGADA**

---

## 6. Revisão e Classificação dos GAPs

Os 6 GAPs catalogados no planejamento foram revisados e classificados rigorosamente de acordo com sua natureza:

| GAP | Descrição | Classificação Formal | Plano de Resolução na Implementação |
| :---: | :--- | :--- | :--- |
| **GAP-AREA-01** | `react-native-maps` não instalado no `package.json` | **Configuração / Implementação Pendente** | Instalação via `npx expo install react-native-maps` na Fase 6 da implementação, assegurando versão compatível com Expo SDK 57. |
| **GAP-AREA-02** | Google Maps API Key não configurada no `app.json` | **Configuração Pendente** | Configuração no `app.json` sob `android.config.googleMaps.apiKey` via variável de ambiente, garantindo zero segredos expostos no Git. |
| **GAP-AREA-04** | `AreaRepository` e `SupabaseAreaRepository` ausentes | **Implementação Pendente** | Criação da interface no domínio e implementação na infraestrutura PostgREST na Fase 3 da implementação. |
| **GAP-AREA-06** | `CalculadorAreaService` sem adaptador concreto | **Implementação Pendente** | Implementação de `GeodesicCalculadorAreaService` na infraestrutura na Fase 2, conforme homologação da DECISÃO-AREA-01. |
| **GAP-AREA-07** | Use cases de Área ausentes na Application | **Implementação Pendente** | Criação dos 5 use cases canônicos (`Criar`, `Listar`, `Obter`, `Atualizar`, `Remover`) e da fachada `AreaService` na Fase 4. |
| **GAP-AREA-08** | Repositórios instanciam `areas: []` estático | **Implementação Pendente** | Implementação de eager loading no mapeamento da infraestrutura na Fase 5, conforme homologação da DECISÃO-AREA-04. |

---

## 7. Impacto sobre os Módulos Congelados

Fica atestado que o planejamento técnico aprovado produz **impacto nulo de risco e zero alterações estruturais regressivas** sobre os módulos previamente homologados:

1. **Módulo de Autenticação e RLS (v1.6):**
   - **Impacto:** **ZERO**. As 31 políticas de RLS vigentes permanecem 100% inalteradas. As 4 policies de `area` já contemplam todas as necessidades de segurança multi-tenant;
2. **Módulo de Clientes e Endereços (v1.0):**
   - **Impacto:** **ZERO**. O módulo de Áreas atua como consumidor estritamente somente-leitura das coordenadas geográficas cadastradas no endereço do cliente (`latitude`/`longitude`), sem qualquer mutação nos dados do cliente;
3. **Módulo de Catálogo — Serviços e Produtos (v1.0):**
   - **Impacto:** **ZERO**. A regra RN16 (`usa_medicao_area = true` fixando `m²`) permanece intacta. O catálogo permanece desacoplado de mapas e cálculos espaciais;
4. **Módulo de Orçamentos e Itens de Orçamento (v1.1):**
   - **Impacto:** **POSITIVO E ALINHADO**. A implementação de Áreas irá preencher a lacuna prevista de quantificação de serviços medidos, permitindo que orçamentos com serviços em $m^2$ alcancem o status `ENVIADO` após a delimitação das áreas, cumprindo o ciclo natural do sistema sem alterar nenhuma das regras financeiras ou máquinas de estado já homologadas;
5. **Modelo Físico e Migrations:**
   - **Impacto:** **ZERO**. Nenhuma migration DDL, trigger, enum ou constraint adicional será necessária. O banco de dados PostgreSQL/PostGIS já contém a tabela `public.area` homologada.

---

## 8. Critérios e Ordem de Implementação Controlada

A execução da futura fase de implementação deverá seguir rigorosamente o sequenciamento em 10 etapas estabelecido no plano:

```text
[Etapa 1] Domínio: Tipos e interfaces de Área (já consolidadas e testadas)
    ↓
[Etapa 2] Infraestrutura: Adaptador de cálculo geodésico puro (DECISÃO-AREA-01)
    ↓
[Etapa 3] Infraestrutura: Conversor PostGIS GeoJSON (DECISÃO-AREA-02) e SupabaseAreaRepository
    ↓
[Etapa 4] Aplicação: 5 Use Cases de Área + Validador + Fachada AreaService
    ↓
[Etapa 5] Integração: Hidratação de áreas nos repositórios de Orçamento (DECISÃO-AREA-04)
    ↓
[Etapa 6] Mobile Config: Instalação de react-native-maps e configuração Google Maps API Key
    ↓
[Etapa 7] Apresentação: Abstração MapProvider, Telas de Gestão de Áreas e Mapa Satélite
    ↓
[Etapa 8] Testes Automatizados: Suíte completa de use cases, multi-tenant e typecheck estrito
    ↓
[Etapa 9] Validação Empírica no Android Real: Emulador Pixel_10 / Hermes (captura de evidências)
    ↓
[Etapa 10] Auditoria Técnica Independente e Homologação Final do Módulo
```

---

## 9. Critérios Objetivos de Aceite para a Futura Implementação

A futura implementação somente será considerada aprovada se satisfizer com rigor todos os 15 critérios objetivos:

- **CA-01 (Mapa Satélite):** Google Maps renderizado em modo satélite com nitidez e fluidez no Android;
- **CA-02 (Centralização Inicial):** Abertura do mapa centralizada na latitude/longitude do endereço do cliente quando existente;
- **CA-03 (Desenho Interativo):** Marcação de vértices, arraste e fechamento de polígono funcionando na tela;
- **CA-04 (Validação Topológica):** Rejeição imediata de polígonos abertos, com $< 3$ vértices ou autointerseções;
- **CA-05 (Cálculo em $m^2$):** Cálculo geodésico da área com precisão de 2 casas decimais na unidade $m^2$;
- **CA-06 (Múltiplas Áreas):** Associação bem-sucedida de duas ou mais áreas disjuntas ao mesmo item medido;
- **CA-07 (Quantidade Derivada):** Quantidade do item no banco correspondente com precisão a $\sum \text{area\_calculada}$;
- **CA-08 (Bloqueio Manual):** Campo de digitação de quantidade bloqueado na tela para serviços medidos (RN34);
- **CA-09 (Recálculo Financeiro):** Atualização reativa e persistida do valor total do item, subtotal, desconto e total do orçamento;
- **CA-10 (Edição de Área):** Edição de geometria de área previamente salva atualizando os cálculos no banco;
- **CA-11 (Remoção de Área):** Exclusão de área decrescendo a quantidade do item e recalculando o orçamento;
- **CA-12 (Multi-Tenant RLS):** Bloqueio estrito de qualquer tentativa de leitura, criação, edição ou exclusão cruzada entre usuários;
- **CA-13 (Imutabilidade Fora de Rascunho):** Bloqueio de mutações de área em orçamentos que já saíram do status `RASCUNHO`;
- **CA-14 (Validação para Envio):** Orçamento com serviço medido impedido de avançar para `ENVIADO` se possuir 0 áreas ou 0 $m^2$;
- **CA-15 (Duplicação Autônoma):** Duplicação de orçamento clona áreas com novos identificadores UUID independentes.

---

## 10. Conclusão e Parecer Final

Com base na análise técnica aprofundada, na verificação das 13 conformidades canônicas, na homologação das decisões DECISÃO-AREA-01, DECISÃO-AREA-02 e DECISÃO-AREA-04, na classificação precisa de todos os GAPs e na garantia de impacto nulo sobre os módulos congelados:

O **Planejamento Técnico do Módulo de Áreas / Mapas / Medição de Área v1.0** está formal e integralmente aprovado.

---

### **STATUS:**
### **PLANEJAMENTO HOMOLOGADO — PRONTO PARA IMPLEMENTAÇÃO**

---

*Fica expressamente reiterado que a autorização para iniciar o ciclo de implementação controlada ocorrerá em comando operacional separado, mantendo os artefatos de código estritamente preservados nesta execução.*
