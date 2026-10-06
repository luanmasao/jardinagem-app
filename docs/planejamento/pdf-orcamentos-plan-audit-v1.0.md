# Parecer de Auditoria Técnica Independente — Planejamento Bloco B v1.0
## Geração e Apresentação de PDF de Orçamentos

**Projeto:** Sistema de Orçamentos para Jardinagem  
**Módulo:** Geração e Apresentação de Documentos Comerciais  
**Bloco:** B — Geração e Apresentação de PDF de Orçamentos  
**Documento Auditado:** `docs/planejamento/pdf-orcamentos-plan-v1.0.md` (Versão 1.0)  
**Data da Auditoria:** 03 de Outubro de 2026  
**Auditor:** Auditor Técnico Independente  
**Status de Entrada:** `PLANEJAMENTO CONCLUÍDO — BLOCO B — AGUARDANDO AUDITORIA`  

---

## 1. Identificação

O presente parecer constitui a auditoria técnica independente do planejamento de engenharia do **Bloco B (Geração e Apresentação de PDF de Orçamentos v1.0)**. O objetivo exclusivo desta avaliação é determinar a solidez, a completude, a precisão arquitetural, a viabilidade técnica e a estrita conformidade do planejamento antes da liberação para qualquer implementação.

Em cumprimento aos princípios mandatórios de auditoria:
- Nenhum código de produção ou teste foi modificado;
- Nenhuma dependência foi instalada;
- Nenhuma migration foi criada;
- O planejamento auditado não foi alterado para sanar achados durante a auditoria;
- Todos os apontamentos foram fundamentados em evidências documentais e técnicas verificáveis.

---

## 2. Escopo da Auditoria

A auditoria incidiu sobre a totalidade do planejamento do Bloco B, com avaliação direta dos seguintes requisitos e regras canônicas:

- **Requisitos Funcionais:** RF79, RF80, RF81;
- **Regras de Negócio:** RN78, RN79, RN80;
- **Requisitos Não Funcionais:** RNF14, RNF31, RNF32, RNF33;
- **Decisões Técnicas Planejadas:** DECISÃO-PDF-01 a DECISÃO-PDF-09;
- **Segregação de Escopo com Bloco C:** Garantia de que compartilhamento externo (WhatsApp, e-mail, Sharesheet, intents) permaneça estritamente fora do Bloco B;
- **Preservação de Módulos Congelados:** Autenticação, RLS, Clientes, Catálogo, Orçamentos, Áreas (GAP-AREA-01 a 08) e Bloco A.

---

## 3. Fontes Consultadas

1. `docs/planejamento/pdf-orcamentos-plan-v1.0.md` (Documento sob auditoria);
2. `docs/planejamento/requisitos-cobertura-status-v1.0.md` (Inventário Oficial de Cobertura);
3. Requisitos Funcionais v2 (RF79, RF80, RF81);
4. Regras de Negócio v3 (RN15, RN20, RN29, RN30, RN33, RN47, RN48, RN49, RN50, RN54, RN55, RN78, RN79, RN80);
5. Requisitos Não Funcionais v2 (RNF01, RNF03, RNF11, RNF14, RNF17, RNF18, RNF23, RNF25, RNF26, RNF31, RNF32, RNF33);
6. Arquitetura Técnica v1.1 (Contrato `PdfGenerator` e arquitetura em 4 camadas);
7. DER v1.1 e Modelo Físico PostgreSQL / PostGIS v1.1;
8. Auth / RLS Strategy v1.6;
9. `docs/relatorios/geocodificacao-localizacao-implementation-audit-v1.0.md` (Parecer do Bloco A homologado).

---

## 4. Método

A auditoria aplicou a metodologia de confronto rigoroso:
1. **Auditoria de Rastreabilidade:** Verificação individual de cada requisito canônico contra as decisões, componentes e critérios do plano;
2. **Auditoria de Integridade Semântica e Dados:** Confronto das asserções de "snapshot" do plano com a modelagem relacional homologada no Modelo Físico v1.1;
3. **Auditoria de Consistência Matemática:** Análise de fluxos de dados para identificar e neutralizar duplicação de fórmulas ou motores de cálculo paralelos;
4. **Auditoria de Viabilidade Técnica de Plataforma:** Verificação das APIs do Expo SDK 57 e do Android WebView / Print Engine quanto às capacidades prometidas (especialmente paginação e ciclo de vida de arquivos em cache);
5. **Auditoria de Isolamento de Escopo:** Averiguação de fronteiras limpas para que o Bloco B não invada mecanismos de compartilhamento do Bloco C.

---

## 5. Resultado da Auditoria de Rastreabilidade

O planejamento estrutura adequadamente a cobertura de RF79, RF80, RF81, RN78, RN79, RN80, RNF14, RNF31 e RNF32.  
Contudo, a auditoria identificou uma divergência material na rastreabilidade do **RNF33**:

- **Texto Canônico de RNF33 (RNF v2 / Inventário):**  
  *"O PDF deve apresentar identificação clara do orçamento, permitindo distingui-lo de outros documentos."*
- **Associação no Planejamento (Seção 4.3, Seção 14.2 e Seção 24):**  
  O planejamento vincula RNF33 predominantemente à *"Identificação do prestador no cabeçalho do PDF"*.
- **Parecer:** A identificação do prestador decorre de **RF80** e **RN79** (*"dados do profissional/prestador..."*). O **RNF33** destina-se estritamente à identificação unívoca do **ORÇAMENTO** (número/código sequencial, datas e distinção visual). Confundir a identificação do prestador com o escopo de RNF33 gera distorção de rastreabilidade e critérios de teste errôneos.  
*(Classificado como **ACHADO-AUD-B-01 — MAJOR**).*

---

## 6. Resultado da Auditoria Arquitetural

- **Separação de Camadas:** A estrutura proposta (Presentation → Application → Domain → Infrastructure) está plenamente alinhada à Arquitetura Técnica v1.1. O Domínio permanece puro, a aplicação orquestra via `GerarPdfOrcamentoUseCase` e a infraestrutura encapsula a geração através de `ExpoPrintPdfGenerator` implementando `PdfGenerator`.
- **Inversão de Dependências:** O contrato `PdfGenerator` isola a aplicação do Expo e do Android.
- **Multitenancy e RLS:** Preservados. O use case consulta os dados via repositórios existentes com token de usuário autenticado (`usuario_id = auth.uid()`) e adiciona verificação defensiva de propriedade.
- **Módulos Congelados:** Catálogo, Áreas, Mapas e Bloco A não sofrem alterações funcionais ou estruturais.

---

## 7. Resultado da Auditoria de Fonte de Verdade

O planejamento afirma reiteradamente que o PDF é gerado a partir de um *"snapshot histórico e imutável integral"*. A auditoria confrontou essa declaração com o Modelo Físico v1.1 e os repositórios reais:

1. **Snapshot Efetivamente Imutável:**
   - `ITEM_ORCAMENTO` e `AREA` possuem snapshot autônomo (descrição, unidade, valor unitário, quantidade, valor total, tipo e áreas calculadas). Modificações posteriores no catálogo de serviços ou produtos não afetam esses itens (RN78/RNF18).
2. **Dados Cadastrais Dinâmicos (Sem Snapshot na Modelagem Homologada):**
   - As tabelas `CLIENTE`, `ENDERECO` e `USUARIO` **NÃO possuem tabela de histórico ou colunas de snapshot no orçamento**.
   - Ao gerar o PDF, o sistema consulta os registros atuais de `cliente`, `endereco` e `usuario`.
   - Se um cliente alterar seu telefone ou o prestador mudar seu nome fantasia, o PDF gerado exibirá os dados cadastrais atuais.
- **Parecer:** O planejamento precisa ser documentalmente exato. Chamar o conjunto de "snapshot histórico imutável integral" induz a falsa premissa de que cliente e prestador estão congelados na data do orçamento, o que exigiria migrations não existentes. O plano deve explicitar que o snapshot imutável aplica-se estritamente aos itens, áreas e totais da proposta, enquanto os dados de cliente e prestador refletem o cadastro vigente no momento da geração.  
*(Classificado como **ACHADO-AUD-B-02 — MAJOR**).*

---

## 8. Resultado da Auditoria Matemática

A auditoria detectou uma ambiguidade na Seção 13 do planejamento:

- Na Seção 13 (item 2), o documento prescreve:  
  *"Ordem Estrita das Operações: Total de cada item: valorTotal = arredondarMoeda(quantidade * valorUnitario)... Subtotal = soma dos itens... Desconto deduzido = ... Total = subtotal - desconto..."*
- Na mesma seção (item 5) e na DECISÃO-PDF-04, afirma:  
  *"Invariância: O gerador de PDF não calcula valores por conta própria; ele apenas valida se os valores informados conferem com as fórmulas canônicas e exibe os valores validados."*
- **Parecer:** A Seção 13 descreve um fluxo de cálculo que pode ser interpretado como um **segundo motor financeiro concorrente**. O agregado `Orcamento` persistido no banco já possui `subtotal`, `valor_desconto` e `total` canonicamente calculados e validados pelo Domínio. O mapper/template do PDF **não pode recalcular valores para exibição**. O papel do caso de uso deve ser estritamente transportar os valores persistidos e executar asserções defensivas de invariantes (disparando erro caso o banco contenha inconsistência), sem jamais sobrescrever valores do domínio.  
*(Classificado como **ACHADO-AUD-B-03 — MAJOR**).*

---

## 9. Resultado da Auditoria de Desempenho

- **Texto Canônico de RNF14:** *"A geração do PDF deve ocorrer em tempo adequado ao uso do aplicativo, sem causar bloqueios prolongados da interface."*
- **Meta do Planejamento:** O plano estipula `< 2,0 segundos` e declara *"execução em thread de background"*.
- **Parecer Técnico:**
  1. O plano deve declarar explicitamente que `< 2,0 segundos` é uma meta interna de engenharia do projeto, e não texto literal da norma RNF14;
  2. No React Native sob motor Hermes, o código JavaScript executa na thread principal de JS (Single Thread). O processamento assíncrono nativo ocorre na ponte do Android, mas a invocação JS não é uma "thread de background JS". A terminologia precisa ser ajustada;
  3. O protocolo de medição na Seção 14.1 carece de especificação estatística: não define número de repetições, descarte de primeira execução (warm-up da WebView nativa), variação volumétrica (orçamento pequeno vs orçamento com 15 itens e 5 áreas) nem critério de aceitação (média ou percentil 95).  
*(Classificado como **ACHADO-AUD-B-06 — MINOR**).*

---

## 10. Resultado da Auditoria de Testes

A suíte de testes planejada na Seção 18 possui excelente granularidade para use cases, mappers, templates e cálculos.  
Contudo, a auditoria identificou a ausência de um teste conceitual indispensável para **RN78**:

- **Teste de Mutação Posterior de Catálogo:**
  1. Criar e persistir orçamento contendo Item A originado de Serviço S1 (preço R$ 50,00);
  2. Alterar o Serviço S1 no catálogo (preço para R$ 100,00, alteração de descrição);
  3. Acionar `GerarPdfOrcamentoUseCase`;
  4. Provar que o PDF gerado mantém rigorosamente R$ 50,00 e a descrição original de S1.  
*(Classificado como **ACHADO-AUD-B-07 — MINOR**).*

---

## 11. Resultado da Auditoria de Layout, Paginação e Visualização

### 11.1. Inviabilidade Técnica de "Página X de Y" via CSS no Android
- Na Seção 12.1 (item 7), o planejamento exige:  
  *"Paginação automática centralizada ('Página X de Y')"*.
- **Fato Técnico:** O `expo-print` no Android utiliza o motor WebView com `PrintDocumentAdapter`. A especificação CSS Paged Media (`@page { @bottom-center { content: counter(page) " de " counter(pages); } }`) **não é suportada pelo motor Chromium do Android WebView via PrintDocumentAdapter** para contagem total de páginas (`counter(pages)`).
- **Parecer:** Prometer "Página X de Y" como critério oficial de layout levará a falha na homologação ou induzirá a implementação a recorrer a injeções frágeis de scripts JavaScript. O layout deve adotar rodapé comercial elegante ou limitar-se a mecanismos comprovadamente suportados pelo motor nativo.  
*(Classificado como **ACHADO-AUD-B-05 — MAJOR**).*

### 11.2. Indefinição do Mecanismo de Visualização
- Na Seção 16.2, o plano apresenta:  
  *"O método Print.printAsync({ html }) do expo-print ou abertura direta da URI gerada no visualizador padrão de PDF do sistema operacional Android."*
- **Fato Técnico:**
  1. `Print.printAsync` abre o spooler de impressão do sistema Android (seleção de impressoras físicas/serviço de impressão), e não um leitor de PDF;
  2. A "abertura direta da URI no visualizador padrão" exige disparar uma Intent `ACTION_VIEW`. No Android moderno, abrir um arquivo local de cache (`file://`) a partir de outro aplicativo resulta em `FileUriExposedException`, exigindo configuração de `FileProvider` (`content://`). Além disso, o uso de Intents aproxima-se do compartilhamento externo, expressamente restrito ao Bloco C.
- **Parecer:** O planejamento deve definir de forma unívoca, determinística e segura como o usuário visualizará a proposta no Bloco B, sem ambiguidades de "ou isso ou aquilo".  
*(Classificado como **ACHADO-AUD-B-04 — MAJOR**).*

---

## 12. Resultado da Auditoria de Segurança e Persistência Local

- **Estratégia Stateless:** A decisão de gravar o PDF sob demanda no cache do aplicativo (`DECISÃO-PDF-05`), sem tabelas ou colunas extras no PostgreSQL, é plenamente homologável e aderente ao Modelo Físico v1.1 congelado.
- **Minimização de Dados (LGPD):** O modelo inclui CPF/CNPJ, e-mail, telefone e endereço. Todos esses dados são estritamente comerciais para formalização da proposta de prestação de serviços de jardinagem.
- **Cenário de Cliente sem Endereço:** O plano não define o comportamento visual caso o cliente não possua endereço cadastrado (`cliente.endereco === null`). O template deve prever supressão limpa desse bloco sem apresentar "null" ou espaços vazios.  
*(Classificado como **ACHADO-AUD-B-08 — MINOR**).*

---

## 13. Registro Completo de Achados

### 🔴 ACHADO-AUD-B-01: Rastreabilidade Erônea de RNF33
- **Classificação:** **MAJOR**
- **Descrição:** O planejamento associou RNF33 à *"Identificação do prestador no cabeçalho"*, quando o requisito canônico RNF33 define taxativamente: *"O PDF deve apresentar identificação clara do orçamento, permitindo distingui-lo de outros documentos"*. A identificação do prestador pertence a RF80/RN79.
- **Impacto:** Conflito de critérios de aceitação e distorção da matriz de rastreabilidade.

### 🔴 ACHADO-AUD-B-02: Imprecisão Conceitual sobre o Escopo do Snapshot Histórico (RN78)
- **Classificação:** **MAJOR**
- **Descrição:** O documento emprega a expressão "snapshot histórico imutável integral" sem distinguir que a modelagem relacional congela exclusivamente itens (`ITEM_ORCAMENTO`), áreas (`AREA`) e valores do orçamento (`ORCAMENTO`). Dados cadastrais de `CLIENTE`, `ENDERECO` e `USUARIO` são carregados de seus registros atuais no momento da geração do PDF.
- **Impacto:** Falsa expectativa de modelagem e risco de desvio arquitetural.

### 🔴 ACHADO-AUD-B-03: Ambiguidade entre Recálculo de Valores vs Transporte de Invariantes
- **Classificação:** **MAJOR**
- **Descrição:** A Seção 13 descreve uma cadeia de cálculo financeiro no mapper/template que compete com o domínio `Orcamento`, contradizendo o princípio de que o PDF não deve possuir um segundo motor financeiro.
- **Impacto:** Risco de discrepâncias por arredondamento entre o valor persistido na tela e o valor gerado no PDF.

### 🔴 ACHADO-AUD-B-04: Indefinição do Mecanismo Concreto de Visualização no Bloco B
- **Classificação:** **MAJOR**
- **Descrição:** O planejamento apresenta alternativas excludentes na Seção 16.2 (*"Print.printAsync ou abertura direta de URI"*), sem definir o fluxo técnico exato e ignorando as restrições do Android quanto a `file://` URIs e Intents externos.
- **Impacto:** Risco de quebra de escopo (invasão do Bloco C) ou falha de runtime no Android (`FileUriExposedException`).

### 🔴 ACHADO-AUD-B-05: Inviabilidade Técnica da Paginação "Página X de Y" via CSS em `expo-print`
- **Classificação:** **MAJOR**
- **Descrição:** O motor Chromium/WebView do Android acionado por `PrintDocumentAdapter` não suporta contadores CSS `counter(pages)` em regras `@page` para totalização de páginas.
- **Impacto:** Inviabilidade do critério de layout planejado na Seção 12.1.

### 🟡 ACHADO-AUD-B-06: Falta de Rigor Estatístico no Protocolo de Desempenho RNF14
- **Classificação:** **MINOR**
- **Descrição:** O protocolo de medição não define repetições, descarte de warm-up nem amostragem volumétrica para validação objetiva do tempo de geração.
- **Impacto:** Teste empírico pouco reprodutível.

### 🟡 ACHADO-AUD-B-07: Ausência de Teste de Mutação Posterior de Catálogo para RN78
- **Classificação:** **MINOR**
- **Descrição:** Falta prever na suíte de testes o cenário em que o catálogo de serviços/produtos é alterado após a criação do orçamento, comprovando que o PDF mantém os valores do snapshot.
- **Impacto:** Risco de regressão silenciosa na regra RN78.

### 🟡 ACHADO-AUD-B-08: Omissão de Tratamento de Layout para Cliente sem Endereço
- **Classificação:** **MINOR**
- **Descrição:** O plano não detalha o comportamento defensivo do template para clientes sem endereço cadastrado.
- **Impacto:** Risco de quebra estética no documento.

### 🟡 ACHADO-AUD-B-09: Declaração Imprecisa na Seção de Questões Abertas
- **Classificação:** **MINOR**
- **Descrição:** A Seção 23 afirma que "não há questões abertas", omitindo as indefinições técnicas identificadas nesta auditoria.
- **Impacto:** Inconsistência documental interna.

---

## 14. Classificação dos Achados

| Severidade | Quantidade | Bloqueador para Homologação? |
|:---:|:---:|:---:|
| **CRITICAL** | 0 | Sim |
| **MAJOR** | 5 | **Sim (Exige Revisão v1.1)** |
| **MINOR** | 4 | Não (deve ser sanado na revisão) |
| **OBSERVAÇÃO** | 0 | Não |

---

## 15. Matriz Requisito × Decisão × Evidência

| Requisito | Decisão Planejada | Avaliação da Auditoria | Status da Auditoria |
|---|---|---|:---:|
| **RF79** (Gerar PDF do orçamento) | DECISÃO-PDF-01 | Geração local via `expo-print` sem custos externos | **CONFORME** |
| **RF80** (Conteúdo completo do documento) | DECISÃO-PDF-06 | Conteúdo cobre todos os itens canônicos | **CONFORME** |
| **RF81** (Correspondência estrita de dados) | DECISÃO-PDF-03, 04 | Ambiguidade de fórmulas e snapshot precisa de correção | **PENDENTE (ACHADO 02 e 03)** |
| **RN78** (Snapshot imutável sem catálogo) | DECISÃO-PDF-03 | Aplicável a itens/áreas; cadastro de cliente/prestador é atual | **PENDENTE (ACHADO 02 e 07)** |
| **RN79** (Conteúdo mínimo e layout oficial) | DECISÃO-PDF-06 | Layout excelente, mas "Página X de Y" é inviável | **PENDENTE (ACHADO 05 e 08)** |
| **RN80** (Consistência matemática no PDF) | DECISÃO-PDF-04 | Risco de duplicação do motor financeiro | **PENDENTE (ACHADO 03)** |
| **RNF14** (Tempo de geração adequado) | DECISÃO-PDF-07 | Meta de 2s viável, mas protocolo requer rigor | **PENDENTE (ACHADO 06)** |
| **RNF31** (Legibilidade e qualidade visual) | DECISÃO-PDF-06 | CSS print estruturado e tipografia limpa | **CONFORME** |
| **RNF32** (Consistência visual e numérica) | DECISÃO-PDF-04 | Depende do saneamento do ACHADO 03 | **PENDENTE (ACHADO 03)** |
| **RNF33** (Identificação clara do orçamento) | DECISÃO-PDF-06 | Rastreabilidade distorcida para identificação de prestador | **PENDENTE (ACHADO 01)** |

---

## 16. Riscos Remanescentes

1. **Risco de Falha em Runtime por Indefinição de Visualização:** Se a implementação tentar abrir diretamente uma URI `file://` em leitor externo sem `FileProvider`, ocorrerá crash no Android;
2. **Risco de Divergência de Centavos:** Se o mapper recalcular valores em vez de exibir estritamente as propriedades consolidadas do agregado `Orcamento`, poderá haver divergência entre a tela e o documento;
3. **Risco de Frustração na Homologação Visual:** A exigência de "Página X de Y" causará reprovação na auditoria de implementação se mantida como critério obrigatório.

---

## 17. Recomendações para a Revisão v1.1

Para que o planejamento alcance o status de homologação, o planejador técnico deve elaborar a versão **v1.1** corrigindo:

1. **Correção de Rastreabilidade (RNF33):** Restabelecer a definição canônica de RNF33 como *identificação clara do orçamento* (número, datas e destaque visual), mantendo a identificação do prestador amparada por RF80/RN79;
2. **Clarificação da Fonte de Verdade:** Formalizar que o snapshot imutável aplica-se estritamente a `ITEM_ORCAMENTO`, `AREA` e valores consolidados de `ORCAMENTO`, enquanto `CLIENTE`, `ENDERECO` e `USUARIO` refletem o cadastro atual no instante da geração;
3. **Unicidade do Motor Financeiro:** Declarar taxativamente que os valores monetários vêm prontos do agregado `Orcamento`. O caso de uso atua como validador de invariantes, sem recálculos concorrentes;
4. **Definição Unívoca do Mecanismo de Visualização:** Fixar o mecanismo de apresentação do Bloco B compatível com o ecossistema Android e livre de invasão do Bloco C;
5. **Ajuste de Critério de Paginação:** Substituir "Página X de Y" por paginação e rodapé compatíveis com as capacidades reais do motor `expo-print` no Android;
6. **Inclusão do Teste de Mutação de Catálogo:** Adicionar explicitamente o teste de blindagem da RN78;
7. **Refinamento do Protocolo de Medição do RNF14:** Estabelecer bateria com 5 repetições, descarte de primeira execução e validação volumétrica.

---

## 18. Decisão Oficial da Auditoria

Em virtude da constatação de **5 achados MAJOR** e **4 achados MINOR**, e em estrita observância às regras do projeto que impedem a aprovação de planejamentos com achados de severidade Major:

### **PENDENTE DE REVISÃO**

A implementação do Bloco B permanece **bloqueada** até que seja apresentada e homologada a versão **v1.1** do Planejamento Técnico.

---

STATUS:  
PENDENTE DE REVISÃO
