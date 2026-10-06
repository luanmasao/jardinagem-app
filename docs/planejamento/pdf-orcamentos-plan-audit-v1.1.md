# Parecer de Auditoria Técnica Independente — Planejamento Bloco B v1.1
## Geração e Apresentação de PDF de Orçamentos

**Projeto:** Sistema de Orçamentos para Jardinagem  
**Módulo:** Geração e Apresentação de Documentos Comerciais  
**Bloco:** B — Geração e Apresentação de PDF de Orçamentos  
**Documento Auditado:** `docs/planejamento/pdf-orcamentos-plan-v1.1.md` (Versão 1.1 — Revisada)  
**Documento Predecessor:** `docs/planejamento/pdf-orcamentos-plan-v1.0.md`  
**Auditoria Anterior:** `docs/planejamento/pdf-orcamentos-plan-audit-v1.0.md` (Status anterior: *Pendente de Revisão*)  
**Data da Auditoria:** 03 de Outubro de 2026  
**Auditor:** Auditor Técnico Independente  
**Status de Entrada:** `PLANEJAMENTO REVISADO — BLOCO B v1.1 — AGUARDANDO NOVA AUDITORIA`  

---

## 1. Identificação

O presente parecer constitui a segunda auditoria técnica independente realizada sobre o planejamento do **Bloco B (Geração e Apresentação de PDF de Orçamentos)**, incidindo sobre o documento revisado `docs/planejamento/pdf-orcamentos-plan-v1.1.md`.

A finalidade precípua desta auditoria é verificar se a revisão controlada v1.1 saneou de forma efetiva, técnica e verificável todos os 9 achados (5 Major e 4 Minor) catalogados na auditoria v1.0, assegurando que o planejamento está consistente com as fontes canônicas, robusto em suas definições de engenharia e pronto para liberação da fase de implementação.

Em conformidade com os princípios éticos e técnicos da função de auditoria:
- Nenhum código de produção ou de teste foi alterado;
- Nenhuma dependência foi instalada;
- Nenhuma migration foi criada;
- Nenhuma correção no planejamento foi feita durante a auditoria;
- Todos os apontamentos baseiam-se em evidências documentais e técnicas concretas.

---

## 2. Escopo da Auditoria

A auditoria abrangeu integralmente a especificação técnica do Bloco B v1.1, avaliando:
- **Requisitos Funcionais:** RF79, RF80, RF81;
- **Regras de Negócio:** RN78, RN79, RN80;
- **Requisitos Não Funcionais:** RNF14, RNF31, RNF32, RNF33;
- **Decisões Técnicas Consolidadas:** DECISÃO-PDF-01 a DECISÃO-PDF-10;
- **Saneamento Efetivo:** Dos achados `ACHADO-AUD-B-01` a `ACHADO-AUD-B-09`;
- **Segregação Estrita de Escopo:** Preservação da fronteira com o Bloco C (compartilhamento externo, WhatsApp, e-mail, Sharesheet e `expo-sharing`);
- **Preservação dos Módulos Congelados:** Autenticação, RLS, Clientes, Catálogo, Orçamentos, Áreas (GAP-AREA-01 a 08) e Bloco A.

---

## 3. Fontes Consultadas

1. `docs/planejamento/pdf-orcamentos-plan-v1.1.md` (Documento auditado);
2. `docs/planejamento/pdf-orcamentos-plan-v1.0.md` (Documento predecessor);
3. `docs/planejamento/pdf-orcamentos-plan-audit-v1.0.md` (Primeira auditoria vinculante);
4. `docs/planejamento/requisitos-cobertura-status-v1.0.md` (Inventário Oficial de Cobertura);
5. Requisitos Funcionais v2 (RF79, RF80, RF81);
6. Regras de Negócio v3 (RN15, RN20, RN29, RN30, RN33, RN47, RN48, RN49, RN50, RN54, RN55, RN78, RN79, RN80);
7. Requisitos Não Funcionais v2 (RNF01, RNF03, RNF11, RNF14, RNF17, RNF18, RNF23, RNF25, RNF26, RNF31, RNF32, RNF33);
8. Arquitetura Técnica v1.1 (Contrato `PdfGenerator`, 4 camadas);
9. DER v1.1 e Modelo Físico PostgreSQL / PostGIS v1.1;
10. Auth / RLS Strategy v1.6;
11. `docs/relatorios/geocodificacao-localizacao-implementation-audit-v1.0.md` (Bloco A homologado);
12. Especificações técnicas do Expo SDK 57 e Android APIs para `PrintDocumentAdapter`, `FileProvider` e Intents.

---

## 4. Método

A metodologia adotada consistiu em:
1. **Auditoria Ponto a Ponto dos 9 Achados Anteriores:** Confronto analítico entre o parecer da auditoria v1.0 e as alterações concretas introduzidas no documento v1.1;
2. **Auditoria Contratual e de Rastreabilidade:** Verificação individual de cada requisito canônico e sua vinculação funcional;
3. **Auditoria Semântica de Dados e Domínio:** Análise da autoridade matemática e dos limites entre dados persistidos com snapshot vs dados dinâmicos;
4. **Auditoria Técnica de Plataforma Android:** Verificação de conformidade das APIs de visualização (`ACTION_VIEW`, `FileProvider`, `content://`) e das restrições de CSS Paged Media no Chromium WebView;
5. **Auditoria de Critérios de Aceitação:** Verificação de objetividade, mensurabilidade e reprodutibilidade dos testes e benchmarks planejados.

---

## 5. Auditoria do Tratamento dos 9 Achados Anteriores

A tabela a seguir consolida o veredito da auditoria para cada um dos achados reportados na versão v1.0:

| Identificador do Achado | Natureza do Problema na v1.0 | Evidência de Tratamento na v1.1 | Veredito da Auditoria |
|---|---|---|:---:|
| **ACHADO-AUD-B-01** (Major) | Rastreabilidade erônea de RNF33 (atribuído ao prestador). | RNF33 foi reatribuído exclusivamente à **identificação clara do orçamento** (Seções 6.3, 15, 28). A identificação do prestador no cabeçalho foi mantida e fundamentada em **RF80** e **RN79**. | **SANADO** |
| **ACHADO-AUD-B-02** (Major) | Imprecisão sobre "snapshot integral" (cliente/prestador). | Seção 9 delimitou com precisão: itens (`ITEM_ORCAMENTO`), áreas (`AREA`) e valores de `ORCAMENTO` possuem snapshot imutável; cadastros de cliente, endereço e prestador refletem o estado vigente na data de geração. | **SANADO** |
| **ACHADO-AUD-B-03** (Major) | Ambiguidade de fórmulas e segundo motor de cálculo. | Seções 12 e 13 declararam a autoridade exclusiva do domínio `Orcamento` e `moeda.ts`. O mapper/template apenas transporta e formata. O caso de uso apenas valida invariantes defensivas, sem recálculos concorrentes. | **SANADO** |
| **ACHADO-AUD-B-04** (Major) | Indefinição do mecanismo de visualização ("ou printAsync ou URI"). | Seção 11 fixou estratégia unívoca: geração com `Print.printToFileAsync` e visualização via `ACTION_VIEW` com URI `content://` mediada por `FileProvider` e permissão temporária de leitura. | **SANADO** |
| **ACHADO-AUD-B-05** (Major) | Inviabilidade técnica de "Página X de Y" via CSS no Android. | Seção 16 removeu `counter(pages)` e adotou rodapé comercial estático com número da proposta, data/hora e marca d'água técnica, com regras CSS anti-quebra de tabelas. | **SANADO** |
| **ACHADO-AUD-B-06** (Minor) | Falta de rigor estatístico no protocolo de desempenho RNF14. | Seção 20 formalizou protocolo com 1 warm-up descartado, 5 repetições cronometradas ($T_1 - T_0$), 3 cenários volumétricos e meta média < 2,0s (p95 < 2,5s), corrigindo terminologia de concorrência. | **SANADO** |
| **ACHADO-AUD-B-07** (Minor) | Ausência de teste de mutação de catálogo para RN78. | Seções 21, 28, 29 e 30 incluíram formalmente o teste de mutação: alteração de preços/descrições no catálogo pós-criação do orçamento para provar que o PDF preserva o snapshot histórico. | **SANADO** |
| **ACHADO-AUD-B-08** (Minor) | Omissão de tratamento de layout para cliente sem endereço. | Seção 17 estabeleceu tabela defensiva completa: cliente sem endereço renderiza *"Endereço: Não informado"*, com supressão limpa de campos opcionais vazios (sem "null" ou "undefined"). | **SANADO** |
| **ACHADO-AUD-B-09** (Minor) | Incoerência na Seção de Questões Abertas. | Seção 26 detalhou a resolução técnica de todos os pontos pendentes e fundamentou a ausência de questões arquiteturais impeditivas. | **SANADO** |

---

## 6. Auditoria de Rastreabilidade

A auditoria reexaminou todas as associações de requisitos funcionais, regras de negócio e requisitos não funcionais na Seção 28 (Matriz de Rastreabilidade) e Seção 6:

- **RF79 (Gerar PDF):** Rastreabilidade direta para `GerarPdfOrcamentoUseCase`, `ExpoPrintPdfGenerator` e DECISÃO-PDF-01/02. **Conforme.**
- **RF80 (Conteúdo Completo):** Todos os 14 elementos exigidos estão mapeados no `OrcamentoPdfModel`, incluindo identificação do prestador, cliente, orçamento, datas, serviços, produtos, áreas, quantidades, valores, desconto, total, observações e condições de pagamento. **Conforme.**
- **RF81 (Correspondência de Dados):** Rastreabilidade ligada a `OrcamentoPdfMapper` e `moeda.ts` garantindo divergência zero. **Conforme.**
- **RN78 (Snapshot Imutável sem Catálogo):** Mapeado ao `ItemOrcamento` e coberto pelo teste obrigatório de mutação. **Conforme.**
- **RN79 (Conteúdo Mínimo e Layout Oficial):** Rastreabilidade vinculada a `OrcamentoHtmlTemplate` e homologação visual. **Conforme.**
- **RN80 (Consistência Matemática):** Rastreabilidade vinculada aos valores consolidados do agregado `Orcamento`. **Conforme.**
- **RNF14 (Desempenho Adequado):** Vinculado ao protocolo de medição empírica com 5 amostras no Android. **Conforme.**
- **RNF31 (Legibilidade e Qualidade Visual):** Vinculado ao CSS print-ready e inspeção em tela. **Conforme.**
- **RNF32 (Consistência Visual e Numérica):** Vinculado à identidade absoluta entre tela e papel. **Conforme.**
- **RNF33 (Identificação Clara do Orçamento):** Exclusivamente associado ao destaque do número do orçamento (`ORC-AAAA-NNN`), data de emissão e badge de status. **Conforme.**

---

## 7. Auditoria Arquitetural e Responsabilidade entre Camadas

A arquitetura em 4 camadas apresentada na Seção 8 foi minuciosamente inspecionada:

1. **Camada de Domínio (`Domain`):**  
   Permanência estrita de entidades puras (`Orcamento`, `ItemOrcamento`, `Area`, `Cliente`, `Usuario`, `Endereco`) e funções de cálculo monetário (`moeda.ts`). O domínio **não contém nenhuma referência** a bibliotecas do Expo, HTML, CSS, geração de PDF, buffers ou sistema de arquivos.
2. **Camada de Aplicação (`Application`):**  
   Define os contratos abstratos (`PdfGenerator`), o modelo de dados de apresentação desacoplado (`OrcamentoPdfModel`), o conversor puro (`OrcamentoPdfMapper`) e o caso de uso (`GerarPdfOrcamentoUseCase`). Contém apenas lógica de orquestração e asserções defensivas de invariantes.
3. **Camada de Infraestrutura (`Infrastructure`):**  
   Implementa a porta abstrata através de `ExpoPrintPdfGenerator`, encapsulando a biblioteca nativa `expo-print` e o gerador de HTML `OrcamentoHtmlTemplate`.
4. **Camada de Apresentação (`Presentation`):**  
   Localizada em `app/(app)/orcamentos/[id].tsx`, gerencia a ação do usuário, exibe feedback visual não-bloqueante (`ActivityIndicator`) e delega a abertura do documento para a Intent `ACTION_VIEW`.

O fluxo de dependências é estritamente unidirecional e atende à Arquitetura Técnica v1.1 e aos princípios de Clean Architecture.

---

## 8. Auditoria da Fonte de Verdade e Limites do Snapshot

A Seção 9 saneou com clareza exemplar o escopo do snapshot:

- **Itens e Áreas:** Mantêm garantia de imutabilidade histórica gravada nas tabelas `ITEM_ORCAMENTO` e `AREA`. Se um serviço do catálogo for alterado ou desativado, o item do orçamento permanece idêntico à sua criação.
- **Orçamento (Valores e Datas):** O subtotal, desconto, total, número e datas persistem na tabela `ORCAMENTO`. Enquanto em `RASCUNHO`, os dados podem ser editados pelo usuário no aplicativo; no momento em que a geração de PDF é disparada, o documento reflete os dados persistidos naquele instante (RN78).
- **Dados Cadastrais de Cliente e Prestador:** O Modelo Físico v1.1 não implementa tabelas de snapshot para perfis ou clientes. Portanto, o planejamento declara expressamente que esses dados refletem o cadastro corrente no momento da geração. Essa abordagem é tecnicamente verdadeira, compatível com o banco existente e evita promessas arquiteturais infundadas.

---

## 9. Auditoria de Consistência Financeira (RN80, RNF32)

O planejamento v1.1 eliminou a duplicação de fórmulas financeiras:

- O mapper **não executa multiplicações de quantidade por valor unitário**, não subtrai descontos e não recalcula subtotais;
- O mapper consome `orcamento.subtotal`, `orcamento.valorDesconto`, `orcamento.total` e `item.valorTotal` prontos do agregado;
- O template limita-se a interpolar os textos pré-formatados pelo mapper;
- A validação de invariantes no caso de uso atua como guardrail defensivo: se `soma(itens) != subtotal`, lança `InconsistenciaFinanceiraError`, impedindo a emissão de documentos corrompidos sem alterar valores de negócio.

---

## 10. Auditoria da Estratégia de Geração Local

A adoção de `expo-print` (~57.0.x) atende a todos os critérios canônicos:
- Processamento local offline pelo subsistema nativo do Android (`PrintDocumentAdapter`);
- Zero chamadas externas de rede;
- Zero dependências de servidores ou API keys adicionais;
- Formato A4 padrão (`210mm x 297mm`) com margens balanceadas (`12mm`).

---

## 11. Auditoria do Mecanismo de Visualização no Dispositivo

A especificação da Seção 11 para a visualização do PDF no Android é tecnicamente irrepreensível:

1. A geração grava o arquivo no diretório de cache do app (`file:///data/user/0/.../cache/Print/Orcamento_ORC-2026-001.pdf`);
2. A conversão para `content://` via `FileSystem.getContentUriAsync(fileUri)` utiliza o `FileProvider` já integrado aos módulos do Expo (`<applicationId>.FileSystemFileProvider`);
3. O disparo da Intent nativa `android.intent.action.VIEW` com MIME type `application/pdf` e flag `FLAG_GRANT_READ_URI_PERMISSION (1)` garante que o leitor de PDF padrão do Android acesse o arquivo de forma segura e sem violar as políticas de segurança do Android (prevenindo `FileUriExposedException`);
4. A operação não utiliza `ACTION_SEND`, não abre tela de compartilhamento social (Sharesheet) e não utiliza `expo-sharing`. O isolamento entre visualização (Bloco B) e compartilhamento (Bloco C) está plenamente preservado.

---

## 12. Auditoria de Paginação e Layout

- A remoção de `counter(pages)` via CSS evitou um ponto crítico de falha em tempo de execução;
- A substituição por rodapé comercial estático com código do orçamento e timestamp atende perfeitamente ao requisito de identificação formal;
- As diretivas CSS `@media print` com `page-break-inside: avoid` em linhas de tabela (`tr`), blocos de fechamento financeiro e condições de pagamento garantem que o motor de impressão não fragmente tabelas de forma antiestética.

---

## 13. Auditoria de Desempenho (RNF14)

A formulação do RNF14 na Seção 20 foi plenamente harmonizada:
- Distinção clara entre o requisito normativo (tempo adequado ao uso sem travamentos) e a meta interna do projeto (média < 2,0s e p95 < 2,5s);
- Metodologia de teste transparente com cronometragem explícita de $T_0$ a $T_1$, descarte de 1 ciclo de warm-up da WebView e 5 execuções consecutivas para 3 perfis de documentos (pequeno, médio e grande);
- Adoção de terminologia técnica correta sobre execução assíncrona no event loop do JavaScript e processamento nativo na plataforma.

---

## 14. Auditoria da Cobertura de Testes Automatizados

A suíte de testes planejada na Seção 21 abrange todos os pontos críticos:
- Testes unitários do mapper com 100% de cobertura de ramificações (serviços, produtos, áreas, descontos, clientes sem endereço, dados opcionais ausentes);
- Testes do caso de uso cobrindo caminhos de sucesso, orçamento inexistente, usuário não autorizado e dados sem itens;
- **Teste de mutação de catálogo (RN78):** Formalmente incluído para garantir que modificações em serviços e produtos do catálogo não alterem orçamentos já persistidos;
- Testes de integridade matemática e testes estruturais de HTML.

---

## 15. Auditoria de Segurança, Multitenancy e RLS

- O acesso aos dados é mediado estritamente pelas credenciais do usuário autenticado (`usuario_id = auth.uid()`), sem uso de `service_role` ou privilégios administrativos;
- O caso de uso valida formalmente `orcamento.usuarioId === usuarioId` como segunda linha de defesa;
- Zero alterações em tabelas, constraints ou políticas de RLS.

---

## 16. Auditoria de Privacidade e Gestão de Cache

- Os dados pessoais contidos no PDF são estritamente os necessários para formalizar a proposta comercial (LGPD / minimização de dados);
- O arquivo é gravado no diretório de cache privado do app (`context.getCacheDir()`);
- A disponibilização externa é efetuada sob demanda via URI de conteúdo temporária com permissão estrita de leitura (`FLAG_GRANT_READ_URI_PERMISSION`).

---

## 17. Auditoria de Dependências

- Dependência primária: `expo-print` (~57.0.x), módulo oficial homologado para Expo SDK 57;
- Dependências de apoio: `expo-file-system` e `expo-intent-launcher`, necessárias para a mediação segura de URI (`content://`) e disparo de `ACTION_VIEW`. Ambas pertencem ao ecossistema oficial do Expo e operam perfeitamente no ambiente prebuild configurado no projeto;
- Nenhuma dependência invasiva, não mantida ou conflituosa com React Native 0.86 / Hermes foi introduzida.

---

## 18. Auditoria de Escopo (Fronteira com o Bloco C)

O planejamento mantém blindagem absoluta em relação ao Bloco C:
- Não há menção a envio por WhatsApp, e-mail ou Telegram;
- Não há uso de `ACTION_SEND` ou Android Sharesheet;
- Não há uso de `expo-sharing`;
- Não há armazenamento em nuvem ou webhooks;
- O Bloco B encerra rigorosamente na **geração do arquivo PDF e sua visualização/inspeção local no dispositivo**.

---

## 19. Registro de Achados da Auditoria v1.1

Nenhum achado de gravidade **CRITICAL** ou **MAJOR** foi encontrado na versão v1.1.  
Foram identificadas apenas 2 observações de natureza técnica/operacional não impeditivas:

### ℹ️ OBSERVAÇÃO-AUD-B-01: Comando Unificado de Instalação de Dependências
- **Descrição:** A Seção 30 (Etapa 1) menciona a instalação de `expo-print`. Como a Seção 25 lista `expo-file-system` e `expo-intent-launcher` como mecanismos de apoio para a visualização, recomenda-se que a etapa de instalação execute:
  ```bash
  npx expo install expo-print expo-file-system expo-intent-launcher
  ```
- **Classificação:** **OBSERVAÇÃO** (não afeta a arquitetura nem bloqueia a homologação).

### ℹ️ OBSERVAÇÃO-AUD-B-02: Tratamento de Fallback na Ausência de Leitor de PDF
- **Descrição:** Conforme previsto na Seção 24, a camada de apresentação deve tratar com `try/catch` o disparo de `startActivityAsync`, exibindo alerta amigável caso o dispositivo não possua aplicativo registrado para `application/pdf`.
- **Classificação:** **OBSERVAÇÃO** (já prevista no plano como mitigação de risco R4).

---

## 20. Matriz de Severidade

| Severidade | Quantidade | Status do Gate |
|:---:|:---:|:---:|
| **CRITICAL** | 0 | Aprovado |
| **MAJOR** | 0 | Aprovado |
| **MINOR** | 0 | Aprovado |
| **OBSERVAÇÃO** | 2 | Informativo (Não bloqueador) |

---

## 21. Matriz de Conformidade Canônica Final

| Identificador | Requisito / Regra Canônica | Evidência Técnica no Planejamento v1.1 | Parecer da Auditoria |
|---|---|---|:---:|
| **RF79** | Gerar PDF a partir dos dados do orçamento | `GerarPdfOrcamentoUseCase`, `ExpoPrintPdfGenerator` via `printToFileAsync` | **CONFORME** |
| **RF80** | Apresentar dados completos previstos | Modelo cobre integralmente os 14 blocos de dados comerciais | **CONFORME** |
| **RF81** | Correspondência estrita de dados | Transporte puro sem recálculo; invariantes validadas | **CONFORME** |
| **RN78** | Snapshot do orçamento sem catálogo | Snapshot em `ITEM_ORCAMENTO` e `AREA`; teste de mutação de catálogo | **CONFORME** |
| **RN79** | Conteúdo mínimo e layout oficial | Template estruturado em HTML5/CSS print-ready com rodapé estático | **CONFORME** |
| **RN80** | Consistência matemática no PDF | Valores consolidados exclusivamente pelo agregado `Orcamento` | **CONFORME** |
| **RNF14** | Desempenho e ausência de bloqueios | Protocolo de 5 amostras no Android (`Pixel_10`) com meta < 2,0s | **CONFORME** |
| **RNF31** | Legibilidade e qualidade visual | Tipografia profissional, tabelas alinhadas e controle anti-quebra | **CONFORME** |
| **RNF32** | Consistência visual e numérica | Identidade numérica absoluta (centavos) entre tela e documento | **CONFORME** |
| **RNF33** | Identificação clara do orçamento | Código/número sequencial, data e status em destaque visual imediato | **CONFORME** |

---

## 22. Riscos Remanescentes

Os riscos mapeados foram satisfatoriamente mitigados:
1. **Risco de `FileUriExposedException`:** Mitigado pela mediação obrigatória de Content URI (`content://`) via `FileProvider`;
2. **Risco de Divergência Financeira:** Mitigado pelo papel do mapper como transportador e pelo domínio como autoridade única;
3. **Risco de Falhas de Paginação:** Mitigado pela eliminação de seletores CSS não suportados e adoção de regras consolidadas de impressão.

---

## 23. Recomendações para a Fase de Implementação

1. Ao instalar dependências, utilizar o comando consolidado:
   `npx expo install expo-print expo-file-system expo-intent-launcher`;
2. Manter a suíte de testes existente 100% verde ao adicionar os testes do Bloco B;
3. Registrar medições reais de desempenho conforme o protocolo da Seção 20 durante os testes no emulador `Pixel_10`;
4. Capturar telas do visualizador de PDF aberto no Android para compor o relatório de implementação.

---

## 24. Decisão Oficial da Auditoria

Considerando que a versão **v1.1** do Planejamento Técnico sanou integralmente todos os 9 achados da auditoria v1.0, eliminou inconsistências arquiteturais, definiu com rigor o mecanismo nativo de visualização, preservou os limites de snapshot e manteve a segregação estrita com o Bloco C:

### **HOMOLOGADO — PLANEJAMENTO BLOCO B v1.1**

O planejamento técnico do Bloco B está formalmente aprovado e liberado para a fase de implementação controlada.

---

STATUS:  
HOMOLOGADO — PLANEJAMENTO BLOCO B v1.1
