# Inventário Oficial de Cobertura do Projeto v1.1

**Projeto:** Sistema de Orçamento para Jardinagem (Android / React Native)  
**Data da Análise:** 05 de Outubro de 2026  
**Responsável:** Analista de Requisitos e Governança  
**Versão do Documento:** 1.1 (Revisão Pós-Homologação do Bloco B)  
**Documento Anterior:** `docs/planejamento/requisitos-cobertura-status-v1.0.md` (03/10/2026 — Intacto e Congelado)  
**Declaração Oficial:** `INVENTÁRIO ATUALIZADO — BLOCO B HOMOLOGADO — PRÓXIMO BLOCO A PLANEJAR`

---

## 1. Controle de Versão

| Versão | Data | Autor / Função | Descrição das Modificações | Situação do Inventário |
| :---: | :---: | :--- | :--- | :--- |
| **1.0** | 03/10/2026 | Auditoria Técnica e Arquitetura de Software | Inventário inicial completo de 198 requisitos canônicos pós-homologação de Áreas (GAP-AREA-01 a 08). Identificação das lacunas dos Blocos A, B e C. | `CONGELADO` |
| **1.1** | 05/10/2026 | Analista de Requisitos e Governança | Atualização oficial de cobertura após as homologações do **Bloco A (Geocodificação e Localização v1.1)** e do **Bloco B (Geração e Apresentação de PDF de Orçamentos v1.1)**. Preservação estrita de RF82/RN81 para o Bloco de Compartilhamento. Registro documental de divergência textual do RF81. Recálculo integral de totais e percentuais. | `VIGENTE` |

---

## 2. Referências

Este inventário baseia-se exclusivamente no conjunto canônico de documentos oficiais e nos artefatos de implementação e auditoria efetivamente homologados no repositório:

### 2.1. Fontes Canônicas de Requisitos e Modelagem
- **Requisitos Funcionais (RF v2):** Documento `requisitos_funcionais.docx` contendo a especificação de **RF01 a RF82**;
- **Regras de Negócio (RN v3):** Documento `regras_negocio.docx` contendo a especificação de **RN01 a RN81**;
- **Requisitos Não-Funcionais (RNF v2):** Documento `requisitos_nao_funcionais.docx` contendo a especificação de **RNF01 a RNF35**;
- **Diagramas UML Canônicos (UML v3.1):** `classes.puml`, `casos_de_uso.puml`, `sequencia.puml`, `atividades.puml`, `estados.puml`;
- **Modelo Conceitual (DER v1.1):** `der.puml`;
- **Arquitetura Técnica v1.1:** `docs/arquitetura/arquitetura-tecnica-v1.1.md`;
- **Modelo Físico PostgreSQL / PostGIS v1.1:** `docs/banco/modelo-fisico-v1.1.md` e migrations em `supabase/migrations/`;
- **Estratégia de Segurança e RLS v1.6:** `docs/relatorios/auth-rls-strategy-v1.6.md`.

### 2.2. Pareceres de Auditoria e Homologação Homologados
1. **Autenticação:** `docs/relatorios/supabase-auth-app-integration-homologation-v1.0.md`;
2. **Segurança e RLS:** `docs/relatorios/auth-rls-implementation-homologation-v1.0.md`;
3. **Clientes:** `docs/relatorios/clientes-implementation-homologation-v1.0.md`;
4. **Catálogo de Serviços e Produtos:** `docs/relatorios/catalogo-servicos-produtos-implementation-homologation-v1.0.md`;
5. **Orçamentos e Itens:** `docs/relatorios/orcamentos-itens-implementation-audit-v1.1.md`;
6. **Áreas / Medição / PostGIS (GAP-AREA-04, 06, 07, 08):** `docs/relatorios/areas-gap-closure-implementation-audit-v1.0.md`;
7. **Áreas / Desenho em Mapa Satélite (GAP-AREA-01):** `docs/relatorios/areas-map-drawing-implementation-reaudit-v1.0.md`;
8. **Áreas / Chave de API Google Maps (GAP-AREA-02):** `docs/relatorios/areas-google-maps-api-key-implementation-audit-v1.0.md`;
9. **Bloco A (Geolocalização e Geocodificação de Clientes v1.1):**
   - Planejamento: `docs/planejamento/geocodificacao-localizacao-plan-v1.1.md`;
   - Parecer de Homologação do Planejamento: `docs/planejamento/geocodificacao-localizacao-homologacao-v1.1.md`;
   - Relatório de Implementação: `docs/relatorios/geocodificacao-localizacao-implementation-v1.0.md`;
   - Parecer de Auditoria da Implementação: `docs/relatorios/geocodificacao-localizacao-implementation-audit-v1.0.md`;
10. **Bloco B (Geração e Apresentação de PDF de Orçamentos v1.1):**
    - Planejamento Homologado: `docs/planejamento/pdf-orcamentos-plan-v1.1.md`;
    - Parecer de Homologação do Planejamento: `docs/planejamento/pdf-orcamentos-plan-audit-v1.1.md`;
    - Relatório de Implementação: `docs/relatorios/pdf-orcamentos-implementation-v1.0.md`;
    - Parecer de Auditoria da Implementação: `docs/relatorios/pdf-orcamentos-implementation-audit-v1.0.md`.

---

## 3. Estado Pós-Homologação do Bloco B

Com a conclusão da auditoria técnica independente do **Bloco B (Geração e Apresentação de PDF de Orçamentos v1.1)**, formalizada no documento `docs/relatorios/pdf-orcamentos-implementation-audit-v1.0.md` com parecer definitivo **HOMOLOGADO — BLOCO B**, o projeto atinge um novo patamar de completude e estabilidade operacional.

### 3.1. Marcos Técnicos Conquistados
1. **Infraestrutura de PDF Estabelecida:** Adoção oficial da biblioteca `expo-print` (~57.0.2) encapsulada no adaptador `ExpoPrintPdfGenerator`, garantindo compilação A4 determinística a partir de template HTML/CSS tipado sem dependências de rede externa;
2. **Visualização Nativa no Android Operacional:** Integração de `expo-intent-launcher` (~57.0.1) e `expo-file-system` (~57.0.7) no serviço `AndroidPdfViewerService`, gerando URIs de conteúdo seguras (`content://`) via FileProvider e acionando o visualizador de PDF padrão do sistema Android (`ACTION_VIEW`) com total resiliência contra vazamento de URIs (`FileUriExposedException`);
3. **Fidelidade Histórica e Matemática Auditada:** Comprovação estrita de que o PDF consome exclusivamente os snapshots imutáveis gravados em `ITEM_ORCAMENTO` e `AREA`, imune a mutações posteriores no catálogo de serviços/produtos, com formatação monetária em padrão pt-BR (R$) e validação por suíte de testes dedicada;
4. **Desempenho de Alta Performance Comprovado:** Medições empíricas no emulador oficial `Pixel_10` (Android 16 / API 37) demonstraram tempos médios de renderização entre **719 ms e 937 ms**, cumprindo com folga o teto de 2.000 ms estabelecido no planejamento homologado;
5. **Base de Testes Automatizados Expandida:** A base do projeto alcançou **460 testes automatizados** com **100% de sucesso** (290 testes TypeScript/Vitest + 170 testes de banco PostgreSQL/pgTAP).

---

## 4. Requisitos Recém-Homologados (Bloco B)

Em cumprimento estrito à deliberação da auditoria técnica independente, os seguintes **10 requisitos (3 RFs, 3 RNs e 4 RNFs)** passam formalmente ao estado de **HOMOLOGADO**, tendo como fonte primária de evidência o relatório `docs/relatorios/pdf-orcamentos-implementation-audit-v1.0.md`:

| ID | Tipo | Enunciado Canônico | Componente / Implementação | Evidência de Homologação |
| :--- | :---: | :--- | :--- | :--- |
| **RF79** | Funcional | O sistema deve permitir gerar um PDF a partir dos dados de um orçamento. | `GerarPdfOrcamentoUseCase`, `ExpoPrintPdfGenerator` | Testes 1, 2 e 5 de `gerar-pdf-orcamento.use-case.test.ts`; `docs/relatorios/pdf-orcamentos-implementation-audit-v1.0.md` (Seção 8). |
| **RF80** | Funcional | O PDF deve apresentar, quando aplicável, os dados do profissional, cliente, identificação do orçamento, data, validade, serviços, produtos, áreas, quantidades, valores, desconto, total, observações e condições de pagamento. | `orcamento-html.template.ts`, `orcamento-pdf.mapper.ts` | Testes 1 a 6 de `orcamento-html.template.test.ts`; capturas de tela `screenshot_pdf_viewer_cenario_b_full.png` e `cenario_c.png`; auditoria Seção 9. |
| **RF81** | Funcional | Os valores e demais dados apresentados no PDF devem corresponder aos dados do orçamento utilizado para sua geração. | `consistencia-matematica-pdf.test.ts`, `arredondarMoeda` | 4 testes exatos de consistência numérica centavo a centavo; reconciliação tela x PDF na auditoria Seção 13 e Seção 34. |
| **RN78** | Regra de Negócio | O PDF gerado a partir de um orçamento deve representar os dados daquele orçamento no momento da geração. | `ItemOrcamento` snapshot, mapper sem consulta a tabelas de catálogo | Teste 7 de `gerar-pdf-orcamento.use-case.test.ts` (teste de mutação do catálogo pós-inclusão); auditoria Seção 11. |
| **RN79** | Regra de Negócio | O PDF deve apresentar, quando aplicável, identificação do profissional, cliente, orçamento, data, validade, serviços, produtos, áreas, quantidades, valores, desconto, total, observações e condições de pagamento. | Template HTML padronizado com folha A4 e grid CSS | Validação visual de todos os 8 blocos estruturais no emulador `Pixel_10`; auditoria Seção 12. |
| **RN80** | Regra de Negócio | Os valores e informações apresentados no PDF devem corresponder aos dados do orçamento utilizado para sua geração. | Formatação `formatarMoedaPtBr`, `NUMERIC(12,2)` | 13 testes em `consistencia-matematica-pdf.test.ts`; auditoria Seção 13. |
| **RNF14** | Não-Funcional | A geração do PDF deve ocorrer em tempo adequado ao uso do aplicativo, sem causar bloqueios prolongados da interface. | Geração assíncrona desacoplada da UI com botão bloqueado e spinner | Medição empírica no Pixel 10: Cenário A = 879 ms, Cenário B = 719 ms, Cenário C = 937 ms (< 2.000 ms); auditoria Seção 28. |
| **RNF31** | Não-Funcional | O PDF gerado deve apresentar conteúdo legível, organizado e adequado para compartilhamento com o cliente. | Folha A4 (`@page { size: A4 }`), `page-break-inside: avoid` em itens | Inspeção visual no `Google PDF Viewer` sem truncamentos ou cortes de linha; auditoria Seção 27. |
| **RNF32** | Não-Funcional | O conteúdo e os valores apresentados no PDF devem permanecer consistentes com os dados do orçamento utilizado para sua geração. | Validação cruzada de subtotal, descontos (fixo/percentual) e total | Testes automatizados e confronto de telas em `docs/evidencias/`; auditoria Seção 34. |
| **RNF33** | Não-Funcional | O PDF deve apresentar identificação clara do orçamento, permitindo distingui-lo de outros documentos. | Topo direito destacado com número `#<numero>`, data e badge de status | Teste 2 de `orcamento-html.template.test.ts`; auditoria Seção 34. |

> [!NOTE]
> Os requisitos acima deixam de constar como pendentes ou não implementados em todo o inventário do projeto.

---

## 5. Requisitos Ainda Pendentes

Após a homologação do Bloco A e do Bloco B, restam **apenas 5 requisitos pendentes** em todo o universo de 198 requisitos canônicos do sistema:

| ID | Categoria | Tipo de Pendência | Enunciado Resumido | Escopo Destinado |
| :---: | :---: | :---: | :--- | :--- |
| **RF82** | Funcional | **Não Implementado** | Compartilhar o PDF utilizando mecanismos disponíveis no dispositivo | Bloco de Compartilhamento Nativo de PDF |
| **RN81** | Regra de Negócio | **Não Implementada** | O PDF deve poder ser compartilhado por meio dos mecanismos disponíveis no dispositivo | Bloco de Compartilhamento Nativo de PDF |
| **RF67** | Funcional | **Parcialmente Implementado** | Identificar automaticamente a expiração de orçamento ENVIADO/EM_ANALISE quando validade vencida | Bloco de Expiração Temporal de Orçamentos |
| **RN69** | Regra de Negócio | **Parcialmente Implementada** | Orçamento com validade ultrapassada deve ser considerado EXPIRADO | Bloco de Expiração Temporal de Orçamentos |
| **RNF03** | Não-Funcional | **Parcialmente Implementado** | Feedback adequado após operações relevantes (pendente exclusivamente na operação de compartilhamento) | Transversal ao Compartilhamento Nativo |

---

## 6. Requisitos Parcialmente Implementados

A tabela a seguir discrimina detalhadamente os **3 requisitos** classificados como **PARCIALMENTE IMPLEMENTADO**:

| ID | Descrição | O que está Efetivamente Implementado e Testado | O que Falta para Completude | Causa Técnica da Parcialidade |
| :--- | :--- | :--- | :--- | :--- |
| **RF67** | Identificação automática de expiração de orçamento por validade | Método de domínio `Orcamento.verificarExpiracao(dataReferencia: Date)` implementado e coberto em `tests/domain/orcamento-estados.test.ts` (teste 4). | Ausência de rotina autônoma de agendamento (cron, background fetch ou gatilho periódico ao abrir a lista) para varredura e atualização em lote. | Não foi estabelecido componente de execução temporal na aplicação móvel ou função agendada (pg_cron/Edge Function) no Supabase. |
| **RN69** | Transição de orçamentos vencidos para o estado `EXPIRADO` | Máquina de estados do domínio transiciona deterministamente para `StatusOrcamento.EXPIRADO` quando a data atual supera a data de validade. | Aplicação automática da regra na camada de persistência para todos os orçamentos do usuário que atingirem a validade. | Depende da integração do mecanismo disparador que orquestrará a chamada ao use case de atualização de status. |
| **RNF03** | Feedback adequado após operações relevantes | Feedback completo com alertas, indicadores de carregamento (`ActivityIndicator`), desabilitação de botões e displays reativos em tempo real para: cadastros, edições, medição de áreas, recálculo financeiro e geração/apresentação de PDF. | Fornecimento de feedback específico (spinner/toast/alerta) durante o acionamento da folha de compartilhamento nativo externa. | A funcionalidade de compartilhamento nativo externo ainda não foi implementada no aplicativo. |

---

## 7. Requisitos Não Implementados

A tabela a seguir discrimina os **2 requisitos** classificados formalmente como **NÃO IMPLEMENTADO**:

| ID | Categoria | Enunciado Canônico | Motivo da Ausência | Impacto no Sistema | O que precisa ser Feito |
| :---: | :---: | :--- | :--- | :--- | :--- |
| **RF82** | Funcional | O sistema deve permitir compartilhar o PDF utilizando os mecanismos de compartilhamento disponíveis no dispositivo. | Nenhuma biblioteca de compartilhamento móvel (ex: `expo-sharing`) instalada; ausência de Intent `ACTION_SEND` no código. | O operador visualiza o PDF localmente, mas não consegue disparar a folha de compartilhamento nativa para envio via WhatsApp, E-mail ou Bluetooth. | Planejar, implementar e auditar o serviço de compartilhamento nativo através de integração com o subsistema de compartilhamento do dispositivo. |
| **RN81** | Regra de Negócio | O PDF deve poder ser compartilhado por meio dos mecanismos disponíveis no dispositivo. | Inexistência de caso de uso de compartilhamento e ausência de ação de envio na interface. | A proposta comercial não pode ser transmitida externamente pelo aplicativo. | Elaborar caso de uso dedicado que consuma o arquivo PDF já gerado pelo `PdfGenerator` e o repasse para o provedor de compartilhamento nativo. |

---

## 8. Situação de RF82 e RN81 (Preservação de Escopo)

A segregação entre o **Bloco B** e o compartilhamento nativo permanece uma premissa fundamental da governança do projeto:

1. **Distinção Operacional:** A ação implementada no Bloco B é estritamente de visualização local (`ACTION_VIEW`), executada pelo serviço `AndroidPdfViewerService` que delega o arquivo para o `Google PDF Viewer`.
2. **Não-Equivalência Técnica:** `ACTION_VIEW` **NÃO é compartilhamento**. O compartilhamento nativo exige invocação de serviços de envio/distribuição multicanal (Share Sheet do sistema operacional, `ACTION_SEND` com `Intent.createChooser` ou abstração `expo-sharing`).
3. **Decisão de Governança:**
   - **RF82 e RN81 NÃO foram atribuídos ao Bloco B;**
   - **NÃO foi inferida cobertura** de RF82/RN81 a partir da visualização local do PDF;
   - Os requisitos RF82 e RN81 permanecem classificados como **NÃO IMPLEMENTADOS** e reservados com exclusividade para o bloco funcional subsequente.

---

## 9. Situação de RF67 e RN69 (Expiração Automática)

O estado cadastral de RF67 e RN69 foi verificado e atualizado conforme as diretrizes de governança:

1. **Estado Atual:** Ambos permanecem como **PARCIALMENTE IMPLEMENTADOS**;
2. **Camada de Domínio Atendida:** A entidade de domínio `Orcamento` já possui o método `verificarExpiracao(dataReferencia: Date)`, que implementa com exatidão a regra de negócio (orçamentos em `ENVIADO` ou `EM_ANALISE` transitam para `EXPIRADO`, enquanto `RASCUNHO` é imune à expiração, conforme RN70/RF68);
3. **Lacuna Remanescente:** Falta a camada de orquestração periódica (job agendado, verificação transparente no carregamento da listagem de orçamentos ou trigger de banco de dados);
4. **Requisitos Não-Funcionais Transversais:**
   - **RNF16 (Integridade dos Dados):** Garantir que a transição temporal respeite as regras de integridade de estado;
   - **RNF12 (Desempenho):** Garantir que a varredura de expiração não degrade a velocidade de listagem dos orçamentos;
   - **RNF34 / RNF35 (Persistência):** Garantir a persistência segura da alteração de status no PostgreSQL;
5. **Diretriz de Escopo:** A expiração automática de orçamentos **NÃO é tratada nem resolvida neste documento**, mantendo-se estritamente delimitada para seu respectivo ciclo de planejamento.

---

## 10. Módulos Congelados

Em conformidade estrita com o processo de engenharia e governança do projeto, declara-se o **CONGELAMENTO FORMAL** dos seguintes módulos e componentes, sendo terminantemente vedada qualquer alteração estrutural, regressão ou refatoração arbitrária sobre eles:

1. **Autenticação e Sessão:** Homologado em `supabase-auth-app-integration-homologation-v1.0.md` (**CONGELADO**);
2. **Segurança e Multitenancy (RLS):** Homologado em `auth-rls-implementation-homologation-v1.0.md` (**CONGELADO**);
3. **Gerenciamento de Clientes:** Homologado em `clientes-implementation-homologation-v1.0.md` (**CONGELADO**);
4. **Catálogo de Serviços:** Homologado em `catalogo-servicos-produtos-implementation-homologation-v1.0.md` (**CONGELADO**);
5. **Catálogo de Produtos:** Homologado em `catalogo-servicos-produtos-implementation-homologation-v1.0.md` (**CONGELADO**);
6. **Orçamentos e Itens de Orçamento:** Homologado em `orcamentos-itens-implementation-audit-v1.1.md` (**CONGELADO**);
7. **Áreas, Mapas e Medição Espacial:** Homologado nos pareceres de GAP-AREA-01 a GAP-AREA-08 (**CONGELADO**);
8. **Bloco A (Geolocalização e Geocodificação de Clientes v1.1):** Homologado em `geocodificacao-localizacao-implementation-audit-v1.0.md` (**CONGELADO**);
9. **Bloco B (Geração e Apresentação de PDF de Orçamentos v1.1):** Homologado em `pdf-orcamentos-implementation-audit-v1.0.md` (**CONGELADO**).

---

## 11. Totais Recalculados

Os quantitativos consolidados a seguir foram integralmente recalculados a partir da auditoria individual e exaustiva dos 198 requisitos canônicos vigentes:

### 11.1. Tabela Consolidada de Requisitos Funcionais (RF01 a RF82)

| Situação | Quantidade | Percentual | Requisitos Correspondentes |
| :--- | :---: | :---: | :--- |
| **Homologado** | **80** | **97,56%** | RF01 a RF66, RF68 a RF81 |
| **Implementado — Não Homologado** | **0** | **0,00%** | *Nenhum* |
| **Parcialmente Implementado** | **1** | **1,22%** | RF67 |
| **Não Encontrado / Não Implementado** | **1** | **1,22%** | RF82 |
| **Fora do Escopo Explícito** | **0** | **0,00%** | *Nenhum* |
| **Total de Requisitos Funcionais** | **82** | **100,00%** | **RF01 a RF82** |

### 11.2. Tabela Consolidada de Regras de Negócio (RN01 a RN81)

| Situação | Quantidade | Percentual | Regras Correspondentes |
| :--- | :---: | :---: | :--- |
| **Homologada** | **79** | **97,53%** | RN01 a RN68, RN70 a RN80 |
| **Implementada — Não Homologada** | **0** | **0,00%** | *Nenhum* |
| **Parcialmente Implementada** | **1** | **1,23%** | RN69 |
| **Não Encontrada / Não Implementada** | **1** | **1,23%** | RN81 |
| **Fora do Escopo Explícito** | **0** | **0,00%** | *Nenhum* |
| **Total de Regras de Negócio** | **81** | **100,00%** | **RN01 a RN81** |

### 11.3. Tabela Consolidada de Requisitos Não-Funcionais (RNF01 a RNF35)

| Situação | Quantidade | Percentual | Requisitos Não-Funcionais Correspondentes |
| :--- | :---: | :---: | :--- |
| **Homologado** | **34** | **97,14%** | RNF01, RNF02, RNF04 a RNF35 |
| **Implementado — Não Homologado** | **0** | **0,00%** | *Nenhum* |
| **Parcialmente Implementado** | **1** | **2,86%** | RNF03 (pendente exclusivamente em compartilhamento) |
| **Não Encontrado / Não Implementado** | **0** | **0,00%** | *Nenhum* |
| **Fora do Escopo Explícito** | **0** | **0,00%** | *Nenhum* |
| **Total de Requisitos Não-Funcionais** | **35** | **100,00%** | **RNF01 a RNF35** |

### 11.4. Consolidação Geral de Requisitos do Projeto

| Situação Geral | RF | RN | RNF | Total Geral | Percentual Global |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Homologados** | 80 | 79 | 34 | **193** | **97,47%** |
| **Implementados — Não Homologados** | 0 | 0 | 0 | **0** | **0,00%** |
| **Parcialmente Implementados** | 1 | 1 | 1 | **3** | **1,52%** |
| **Não Encontrados / Não Implementados** | 1 | 1 | 0 | **2** | **1,01%** |
| **Fora do Escopo Explícito** | 0 | 0 | 0 | **0** | **0,00%** |
| **Total Auditado** | **82** | **81** | **35** | **198** | **100,00%** |

---

## 12. Percentual de Cobertura Recalculado

O gráfico de evolução histórica e a comparação direta entre as versões do inventário evidenciam o progresso consolidado do projeto:

| Métrica de Governança | Inventário v1.0 (03/10/2026) | Inventário v1.1 (05/10/2026) | Evolução Líquida |
| :--- | :---: | :---: | :---: |
| **Requisitos Funcionais Homologados** | 74 / 82 (90,24%) | **80 / 82 (97,56%)** | **+6 RFs (+7,32%)** |
| **Regras de Negócio Homologadas** | 73 / 81 (90,12%) | **79 / 81 (97,53%)** | **+6 RNs (+7,41%)** |
| **Requisitos Não-Funcionais Homologados** | 27 / 35 (77,14%) | **34 / 35 (97,14%)** | **+7 RNFs (+20,00%)** |
| **Cobertura Global Homologada** | **174 / 198 (87,88%)** | **193 / 198 (97,47%)** | **+19 Requisitos (+9,59%)** |
| **Requisitos Não Implementados** | 13 / 198 (6,57%) | **2 / 198 (1,01%)** | **-11 Requisitos (-5,56%)** |
| **Requisitos Parcialmente Implementados** | 11 / 198 (5,56%) | **3 / 198 (1,52%)** | **-8 Requisitos (-4,04%)** |

> [!IMPORTANT]
> O sistema atinge **97,47% de cobertura homologada**, restando apenas **2,53%** de itens pendentes de finalização para a entrega integral do escopo canônico.

---

## 13. Próximo Bloco Recomendado

Com base rigorosa nas lacunas identificadas neste inventário pós-Bloco B, define-se o próximo incremento funcional canônico do sistema:

### Bloco Funcional Recomendado: COMPARTILHAMENTO NATIVO DE PDF

- **Objetivo Primário:** Habilitar a transmissão externa e o compartilhamento nativo do arquivo PDF de orçamento já gerado pelo `PdfGenerator`, utilizando os mecanismos oficiais do sistema operacional Android (Share Sheet / `ACTION_SEND` / `expo-sharing`).
- **Cobertura de Requisitos Primários:**
  - **RF82:** O sistema deve permitir compartilhar o PDF utilizando os mecanismos de compartilhamento disponíveis no dispositivo;
  - **RN81:** O PDF deve poder ser compartilhado por meio dos mecanismos disponíveis no dispositivo.
- **Requisitos de Qualidade (Não-Funcionais) Diretamente Vinculados:**
  - **RNF03:** Fornecimento de feedback visual adequado e controle de estado durante a operação de compartilhamento;
  - **RNF23:** Compatibilidade com o runtime Android oficial (API 37);
  - **RNF26:** Isolamento do serviço de compartilhamento através de abstração na camada de infraestrutura (`ShareProvider` ou equivalente), impedindo acoplamento indevido no domínio.
- **Diretrizes para o Futuro Planejamento:**
  1. Reutilizar sem alterações a infraestrutura de PDF já homologada no Bloco B (`PdfGenerator` e cache de arquivos);
  2. Avaliar tecnicamente a dependência oficial `expo-sharing` ou Intent nativa do Android;
  3. Não reabrir nem modificar os templates, estilos ou lógica financeira do Bloco B;
  4. Realizar auditoria técnica independente antes de qualquer declaração de conclusão.

---

## 14. Observações Documentais

Registra-se formalmente para efeitos de governança e controle de consistência técnica:

### OBS-DOC-01 — Inconsistência Textual de Rótulo do RF81 no Parecer de Auditoria do Bloco B
- **Documento Afetado:** `docs/relatorios/pdf-orcamentos-implementation-audit-v1.0.md` (Seção 10 e Tabela da Seção 34);
- **Fato Observado:** No título da Seção 10 e na linha correspondente da Matriz Requisito × Evidência (Seção 34), o **RF81** consta com a descrição sumária de *"Visualização Local no Dispositivo"*;
- **Definição Canônica Oficial (RF v2):**
  > **RF81:** *"Os valores e demais dados apresentados no PDF devem corresponder aos dados do orçamento utilizado para sua geração."*
- **Análise Técnica e Esclarecimento de Governança:**
  1. A visualização local do PDF no Android (`ACTION_VIEW`) foi o mecanismo técnico de apresentação adotado no escopo do Bloco B, derivado operacionalmente de RF79 e RF80;
  2. A exigência canônica do RF81 é a correspondência estrita dos valores e dados do orçamento impresso com os dados originais cadastrados;
  3. Essa conformidade semântica do RF81 foi plenamente testada, demonstrada e aprovada pela auditoria técnica do Bloco B na Seção 13 (Auditoria de RN80 / RNF32 / Integridade Numérica e Visual) e através dos 13 testes matemáticos em `tests/application/consistencia-matematica-pdf.test.ts`;
  4. A divergência é puramente de rotulação textual no relatório de auditoria e não afeta a substância nem a validade da homologação do RF81;
  5. Em observância estrita às regras de governança, o documento `docs/relatorios/pdf-orcamentos-implementation-audit-v1.0.md` **não foi modificado nesta etapa**, ficando a retificação textual registrada neste inventário para correção formal futura em eventuais revisões de governança.

---

## 15. Conclusão

O Inventário Oficial de Cobertura de Requisitos v1.1 reflete com fidelidade matemática, documental e empírica o estado real do projeto *Sistema de Orçamento para Jardinagem* após a homologação bem-sucedida do Bloco B.

Com **193 requisitos homologados de um total de 198 (97,47%)**, todos os módulos centrais de negócio — incluindo geração e apresentação de PDF — encontram-se rigorosamente estáveis, testados e congelados.

O projeto está pronto para a abertura controlada da etapa de planejamento do **Compartilhamento Nativo de PDF**.

---

STATUS:

INVENTÁRIO ATUALIZADO — BLOCO B HOMOLOGADO — PRÓXIMO BLOCO A PLANEJAR
