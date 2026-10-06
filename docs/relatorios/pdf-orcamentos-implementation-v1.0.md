# Relatório de Implementação — Bloco B: Geração e Apresentação de PDF de Orçamentos v1.0

## 1. Identificação

- **Projeto:** Sistema de Orçamento para Jardinagem (jardinagem-app)
- **Frente de Trabalho:** BLOCO B — Geração e Apresentação Local de PDF de Orçamentos
- **Versão do Relatório:** v1.0
- **Data de Execução:** 05/10/2026
- **Status do Gate Anterior:** HOMOLOGADO — Planejamento Bloco B v1.1 (`docs/planejamento/pdf-orcamentos-plan-audit-v1.1.md`)
- **Documento Canônico de Planejamento:** `docs/planejamento/pdf-orcamentos-plan-v1.1.md`
- **Ambiente de Teste / Runtime Oficial:** Google Pixel 10 (Emulador Android 16, API 37)

---

## 2. Escopo Implementado

O escopo executado limitou-se estritamente ao previsto e homologado no Planejamento v1.1 para o **Bloco B**:

1. **Instalação Controlada de Dependências Oficiais:** Instalação de `expo-print`, `expo-file-system` e `expo-intent-launcher` via ecossistema Expo SDK 57 sem alterações em bibliotecas já existentes.
2. **Contrato de Abstração `PdfGenerator`:** Definição da interface agnóstica de infraestrutura em `src/application/interfaces/pdf-generator.interface.ts`.
3. **Mapeamento e Formatação `OrcamentoPdfMapper`:** Transformação pura de entidades persistidas para o modelo de dados do documento impresso (`OrcamentoPdfModel`), garantindo formatação monetária (pt-BR, R$), datas civis e tratamento defensivo de campos opcionais sem recalcular regras financeiras de domínio.
4. **Caso de Uso `GerarPdfOrcamentoUseCase`:** Orquestração de carregamento de dados via repositórios existentes, validações defensivas de integridade e multi-tenancy, e geração física do arquivo via provedor.
5. **Template HTML/CSS Print-Ready A4:** Estrutura semântica visual para impressão e conversão PDF, isolada em `src/infrastructure/templates/pdf/orcamento-html.template.ts`, com regras CSS anti-quebra de bloco, cabeçalho repetido em tabelas extensas e rodapé institucional estático.
6. **Provedor Concreto `ExpoPrintPdfGenerator`:** Implementação concreta baseada em `expo-print` (`printToFileAsync`), gerando arquivos temporários no cache local do aplicativo sem persistência remota.
7. **Serviço de Visualização Android `AndroidPdfViewerService`:** Conversão da URI local (`file://`) para URI segura de conteúdo (`content://`) via `FileSystem.getContentUriAsync`, disparo de Intent nativa `android.intent.action.VIEW` com MIME type `application/pdf` e flag `FLAG_GRANT_READ_URI_PERMISSION (1)`.
8. **Integração na Interface:** Inclusão da ação "Gerar PDF da Proposta" em `app/(app)/orcamentos/[id].tsx` através do hook `useGerarPdf`, com controle de loading, prevenção de duplo clique e feedback de erro.
9. **Bateria Completa de Testes:** 25 novos testes unitários e de integração cobrindo mapper, use case, template, consistência matemática e mutação do catálogo (RN78).

---

## 3. Arquivos Criados

Os seguintes arquivos foram criados dentro da arquitetura de camadas:

1. `src/application/interfaces/pdf-generator.interface.ts` — Contratos `PdfGenerator`, `OrcamentoPdfModel`, `ItemOrcamentoPdfModel`, `AreaItemPdfModel`, `PrestadorPdfModel`, `ClientePdfModel`, `ResultadoGeracaoPdf`.
2. `src/application/mappers/orcamento-pdf.mapper.ts` — Mapper com funções puras de formatação de moedas, datas, áreas e dados opcionais.
3. `src/application/use-cases/orcamento/gerar-pdf-orcamento.use-case.ts` — Caso de uso orquestrador com erros tipados (`OrcamentoNaoEncontradoError`, `UsuarioNaoAutorizadoError`, `OrcamentoSemItensError`, `InconsistenciaFinanceiraError`, `FalhaGeracaoPdfError`).
4. `src/infrastructure/templates/pdf/orcamento-html.template.ts` — Template HTML5/CSS3 otimizado para motor de renderização Android WebView/Print Spooler.
5. `src/infrastructure/services/pdf/expo-print-pdf.generator.ts` — Implementação concreta de `PdfGenerator` delegando a `expo-print`.
6. `src/infrastructure/services/pdf/android-pdf-viewer.service.ts` — Serviço de apresentação via FileProvider e Intent nativa `ACTION_VIEW`.
7. `src/presentation/hooks/use-gerar-pdf.ts` — Hook React Native para controle de fluxo, bloqueio de concorrência e disparo da visualização.
8. `tests/application/orcamento-pdf-mapper.test.ts` — Suíte de testes unitários do mapper (7 testes).
9. `tests/application/gerar-pdf-orcamento.use-case.test.ts` — Suíte de testes do caso de uso e invariantes de segurança/regressão (7 testes).
10. `tests/infrastructure/expo-print-pdf-generator.test.ts` — Suíte de testes da infraestrutura e template HTML (8 testes).
11. `tests/domain/consistencia-matematica-pdf.test.ts` — Suíte de testes de consistência monetária de transporte sem perda (3 testes).

---

## 4. Arquivos Modificados

As alterações em arquivos pré-existentes foram mínimas e pontuais:

1. `package.json` — Registro das dependências oficiais (`expo-print`, `expo-file-system`, `expo-intent-launcher`) e adição do script de conveniência `"test:pdf"`.
2. `package-lock.json` — Lockfile sincronizado após instalação das 3 bibliotecas.
3. `app/(app)/orcamentos/[id].tsx` — Integração visual com inclusão do botão "Gerar PDF da Proposta", feedback de loading e chamada a `gerarEVisualizarPdf`.

---

## 5. Dependências Adicionadas

Instalação executada estritamente através do comando oficial do Expo CLI:
```bash
npx expo install expo-print expo-file-system expo-intent-launcher
```

Versões exatas adicionadas ao `package.json` e validadas contra o Expo SDK 57 (React Native 0.86.3):
- `"expo-print": "~57.0.2"`
- `"expo-file-system": "~57.0.7"`
- `"expo-intent-launcher": "~57.0.1"`

Nenhuma dependência extra ou não homologada foi instalada.

---

## 6. Arquitetura Implementada

A implementação preservou rigorosamente a separação em camadas do projeto:

```
Presentation Layer (UI & Hook)
  │  app/(app)/orcamentos/[id].tsx (Botão "Gerar PDF da Proposta")
  │  src/presentation/hooks/use-gerar-pdf.ts
  ▼
Application Layer (Use Cases, Mappers & Interfaces)
  │  src/application/use-cases/orcamento/gerar-pdf-orcamento.use-case.ts
  │  src/application/mappers/orcamento-pdf.mapper.ts
  │  src/application/interfaces/pdf-generator.interface.ts (Agnóstico de libs externas)
  ▼
Domain Layer (Pure Business Entities & Calculations)
  │  src/domain/entities/orcamento.ts (Entidade e validações de ciclo de vida)
  │  src/domain/calculations/moeda.ts (Autoridade financeira de arredondamento bancário)
  ▼
Infrastructure Layer (Concrete Implementations)
     src/infrastructure/services/pdf/expo-print-pdf.generator.ts (expo-print)
     src/infrastructure/services/pdf/android-pdf-viewer.service.ts (FileProvider + ACTION_VIEW)
     src/infrastructure/templates/pdf/orcamento-html.template.ts (HTML/CSS)
```

- **Domain:** Permanece 100% puro. Não importa Expo, React Native, HTML ou sistema de arquivos.
- **Application:** Não conhece `expo-print` nem `expo-intent-launcher`. Comunica-se exclusivamente via a interface `PdfGenerator`.

---

## 7. Fonte de Verdade

As definições seguiram estritamente a hierarquia documental:
1. `RN v3` (RN78, RN79, RN80)
2. `RF v2` (RF80, RF81, RF82)
3. `RNF v2` (RNF14, RNF15, RNF32, RNF33)
4. `Arquitetura Técnica v1.1`
5. `docs/planejamento/pdf-orcamentos-plan-v1.1.md`

Nenhum requisito foi inventado ou alterado durante a execução.

---

## 8. Estratégia de Snapshot Histórico (RN78)

Conforme prescrito pelo planejamento v1.1 e verificado em testes automatizados:
- **Itens do Orçamento (`ITEM_ORCAMENTO`):** O PDF é gerado consumindo exclusivamente os dados congelados no item persistido:
  - `descricao`
  - `unidade`
  - `valorUnitario`
  - `quantidade`
  - `valorTotal`
  - `tipo`
  - `usaMedicaoArea`
- **Áreas Medidas (`AREA`):** O detalhamento visual consome os dados persistidos na tabela `AREA`.
- **Isolamento do Catálogo:** Em nenhuma hipótese o caso de uso consulta tabelas `SERVICO` ou `PRODUTO` para reconstruir descrição, unidade ou preço. Alterações posteriores no catálogo de serviços ou produtos não afetam o documento gerado.
- **Cadastros Vigentes:** Dados do `CLIENTE`, `ENDERECO` e perfil do prestador (`USUARIO`) refletem o cadastro vigente no momento da emissão, exatamente conforme delimitado no planejamento.

---

## 9. Estratégia Financeira

- **Autoridade Financeira:** A autoridade de cálculo permanece sendo o Domínio (`Orcamento` + `src/domain/calculations/moeda.ts`).
- **Não Recalculação:** O `OrcamentoPdfMapper` e o template HTML **não executam fórmulas financeiras**, não calculam subtotal, não calculam descontos e não recalculam valores totais.
- **Validação Defensiva:** O caso de uso valida defensivamente se `orcamento.itens.length > 0` e se a soma dos itens diverge do subtotal persistido (`InconsistenciaFinanceiraError`), rejeitando a emissão em caso de inconsistência de banco sem aplicar correções arbitrárias.
- **Item Medido:** A quantidade faturada exibida no PDF é rigorosamente `item.quantidade`. As áreas medidas individuais são apresentadas em bloco aninhado como memória de cálculo/detalhamento técnico descritivo, sem atuar como segundo motor contábil.

---

## 10. Geração do PDF

- **Provedor:** `ExpoPrintPdfGenerator` utilizando `Print.printToFileAsync({ html, base64: false })`.
- **Localização:** Arquivo gerado localmente no diretório de cache do aplicativo (`FileSystem.cacheDirectory`).
- **Nomenclatura:** `orcamento-<numero>-<timestamp>.pdf` (sanitizado).
- **Isolamento de Nuvem:** Nenhum byte é transmitido para rede externa, storage S3/Supabase ou API remota.

---

## 11. Visualização Android

A apresentação visual no dispositivo Android seguiu estritamente o mecanismo homologado:
1. Obtenção do caminho local (`file:///data/user/0/.../cache/Print/....pdf`).
2. Conversão segura via `FileSystem.getContentUriAsync(fileUri)`, gerando URI no padrão `content://com.jardinagem.app.FileSystemFileProvider/...`.
3. Disparo da Intent nativa através de `IntentLauncher.startActivityAsync('android.intent.action.VIEW', { data: contentUri, type: 'application/pdf', flags: 1 })`.
4. A flag `1` corresponde à `FLAG_GRANT_READ_URI_PERMISSION`, permitindo que o visualizador externo acesse o stream do arquivo com permissão temporária delegada.
5. **Tratamento de Ausência de App:** Caso o dispositivo não possua leitor de PDF (capturado por `ActivityNotFoundException`), o app captura a falha e exibe feedback amigável informando a necessidade de instalar um leitor de PDF (sem quebrar e sem recorrer a fallback de compartilhamento).

---

## 12. Tratamento de Erros

Erros canônicos tipados implementados na camada de aplicação:
- `OrcamentoNaoEncontradoError`: Orçamento não localizado no repositório.
- `UsuarioNaoAutorizadoError`: Tentativa de acesso a orçamento pertencente a outro usuário (violação multi-tenant).
- `OrcamentoSemItensError`: Orçamento sem itens cadastrados.
- `InconsistenciaFinanceiraError`: Divergência entre a soma dos itens e o subtotal registrado no cabeçalho do orçamento.
- `FalhaGeracaoPdfError`: Falha operacional no gerador físico de PDF.

Na camada de apresentação, todas as exceções são interceptadas pelo hook `useGerarPdf`, apresentando `Alert` intuitivo ao operador sem expor stack traces ou quebrar a árvore de renderização.

---

## 13. Testes Unitários

Suítes executadas via `npm run test:pdf`:

### A. Mapper (`tests/application/orcamento-pdf-mapper.test.ts`)
- 1. Formatação de Moedas e Números (pt-BR com R$, vírgulas e pontos de milhar) — PASS
- 2. Formatação de Datas Civis (`DD/MM/AAAA`) — PASS
- 3. Mapeamento de Orçamento com Serviços e Produtos Mistos — PASS
- 4. Mapeamento de Serviços com Múltiplas Áreas Medidas — PASS
- 5. Mapeamento com Desconto Percentual — PASS
- 6. Mapeamento com Desconto Fixo — PASS
- 7. Tratamento Defensivo de Dados Opcionais e Ausentes ("Não informado", "A combinar", etc.) — PASS

### B. Provedor e Template (`tests/infrastructure/expo-print-pdf-generator.test.ts`)
- 1. Geração de HTML estruturalmente válido e semântico — PASS
- 2. Identificação do orçamento em destaque (RNF33) — PASS
- 3. Identificação completa do prestador e do cliente (RF80/RN79) — PASS
- 4. Renderização de tabela de itens com áreas medidas aninhadas — PASS
- 5. Renderização do quadro de resumo financeiro — PASS
- 6. Regras CSS anti-quebra de página (`page-break-inside: avoid`) e dimensões A4 — PASS
- 7. Rodapé institucional comercial estático (sem `counter(pages)`) — PASS
- 8. Ausência absoluta de `undefined`, `null` ou `NaN` no HTML gerado — PASS

### C. Consistência Matemática (`tests/domain/consistencia-matematica-pdf.test.ts`)
- 1. Transporte de valores com precisão exata de centavos — PASS
- 2. Transporte de desconto percentual sem divergência de centavos — PASS
- 3. Garantia de que o mapper não recalcula e apenas transporta os valores validados — PASS

---

## 14. Testes de Integração

Executados em `tests/application/gerar-pdf-orcamento.use-case.test.ts`:
- 1. Geração com sucesso para orçamento válido e autorizado — PASS
- 2. Rejeição com `OrcamentoNaoEncontradoError` para orçamento inexistente — PASS
- 3. Rejeição com `UsuarioNaoAutorizadoError` para usuário não proprietário — PASS
- 4. Rejeição com `OrcamentoSemItensError` para proposta sem itens — PASS
- 5. Rejeição defensiva com `InconsistenciaFinanceiraError` para soma inconsistente — PASS
- 6. Tratamento de falha do provedor com `FalhaGeracaoPdfError` — PASS

---

## 15. Teste de Mutação do Catálogo (RN78)

Implementado e validado no teste 7 de `tests/application/gerar-pdf-orcamento.use-case.test.ts`:
- **Cenário:**
  1. Criação do serviço `Poda de Árvores Grande Porte` (R$ 150,00, unidade "unidade") no catálogo.
  2. Adição do item ao orçamento, gerando snapshot histórico com esses valores.
  3. Mutação deliberada do item de catálogo original para `Poda Radicada Alterada` com valor R$ 999,99 e unidade "metro".
  4. Execução do caso de uso de geração do PDF.
- **Resultado:** O modelo gerado para o PDF manteve intacta a descrição original `Poda de Árvores Grande Porte`, valor unitário de R$ 150,00 e unidade "unidade", comprovando a total imunidade a mutações do catálogo.

---

## 16. Typecheck

Comandos executados e resultados obtidos:

```bash
npm run typecheck
> tsc --noEmit
# Saída: 0 erros

npm run test:typecheck
> tsc --project tsconfig.test.json --noEmit
# Saída: 0 erros
```

Zero erros de tipagem. Nenhum uso de `@ts-ignore` ou casts arbitrários para mascarar problemas.

---

## 17. Regressão Completa

Todas as suítes de testes do repositório foram executadas com sucesso:

| Suíte | Comando | Arquivos / Suítes | Testes | Falhas | Status |
|---|---|---|---|---|---|
| **Bloco B (PDF)** | `npm run test:pdf` | 4 suítes | 25 | 0 | APROVADO |
| **Domínio Core** | `npm test` | 11 suítes | 52 | 0 | APROVADO |
| **Clientes / Geo** | `npm run test:clientes` | 15 suítes | 43 | 0 | APROVADO |
| **Catálogo** | `npm run test:catalogo` | 15 suítes | 42 | 0 | APROVADO |
| **Orçamentos** | `npm run test:orcamentos` | 15 suítes | 28 | 0 | APROVADO |
| **Áreas / Mapas** | `npm run test:areas` | 25 suítes | 82 | 0 | APROVADO |
| **Autenticação** | `npm run test:auth` | 1 suíte | 18 | 0 | APROVADO |
| **Total TypeScript** | — | **86 suítes** | **290 testes** | **0 falhas** | **100% VERDE** |

---

## 18. pgTAP (Banco de Dados)

Validação das migrations e RLS do Supabase local via pgTAP:

```bash
npx supabase test db
```

Resultado oficial:
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
Files=8, Tests=170,  0 wallclock secs ( 0.04 usr  0.03 sys +  0.05 cusr  0.07 csys =  0.19 CPU)
Result: PASS
```

- Total de testes no banco de dados: **170 testes (0 falhas)**.
- Total acumulado no projeto: **460 testes (290 TypeScript + 170 SQL pgTAP)**.

---

## 19. Build Android

Compilação nativa de debug realizada diretamente com o Gradle Wrapper do projeto:
```bash
cd android && ./gradlew assembleDebug
```
- **Resultado:** `BUILD SUCCESSFUL in 38s` (92 tarefas executadas).
- **Artefato gerado:** `android/app/build/outputs/apk/debug/app-debug.apk`.
- **Instalação:** APK instalado com sucesso no emulador `Pixel_10` (`emulator-5554`) via `adb install -r`.

---

## 20. Runtime Pixel_10 / API 37

Verificação do comportamento no dispositivo oficial:
- **Dispositivo:** Google Pixel 10 (Emulador Oficial Android SDK)
- **Versão do SO:** Android 16 (API Level 37)
- **Fluxo Validado:**
  1. Login com usuário autenticado (`jardineiro@teste.com`).
  2. Acesso à listagem de orçamentos e abertura da tela de detalhes de proposta.
  3. Visualização do botão "Gerar PDF da Proposta".
  4. Acionamento do botão: bloqueio imediato contra duplo clique com exibição de indicador de carregamento.
  5. Geração do arquivo temporário no cache do app (`.pdf`).
  6. Conversão para `content://` e disparo automático da Intent `ACTION_VIEW`.
  7. Abertura imediata do leitor oficial `Google PDF Viewer` (`com.google.android.apps.docs/com.google.android.apps.viewer.PdfViewerActivity`).
  8. Inspeção visual do documento e retorno fluído para a aplicação sem encerramento ou crash.

---

## 21. Protocolo de Desempenho (RNF14)

Conforme determinado pelo item 23 da solicitação e especificado no planejamento v1.1, o protocolo de medição de desempenho foi executado no dispositivo físico emulado **Pixel_10 (Android 16 / API 37)**:
- **Medição:** $T_0$ imediatamente antes do caso de uso e $T_1$ no momento do retorno do URI gerado pelo `ExpoPrint`.
- **Metodologia:** 1 execução de warm-up (descartada) + 5 execuções consecutivas cronometradas.

### Dados Oficiais Coletados

| Cenário | Descrição | Warm-up (descartado) | Amostras Válidas (ms) | Média Oficial | p95 Oficial | Critério / Meta | Resultado |
|---|---|---|---|---|---|---|---|
| **Cenário A (Pequeno)** | 1 serviço + 1 produto, sem medição, 1 página | 3.114 ms | [1459, 827, 789, 650, 668] | **879 ms** | **1.459 ms** | Observação | Aprovado |
| **Cenário B (Médio — Referência)** | 3 serviços + 2 produtos, 2 áreas medidas, desconto %, 1 página | 745 ms | [831, 765, 636, 695, 668] | **719 ms** | **831 ms** | **Média < 2.000 ms** | **APROVADO COM FOLGA** |
| **Cenário C (Grande)** | 12 itens mistos, 5 áreas medidas, textos longos, múltiplas páginas | 675 ms | [900, 1458, 833, 709, 783] | **937 ms** | **1.458 ms** | Observação | Aprovado |

- **Conformidade RNF14:** A média do Cenário B de Referência foi de **719 ms**, atingindo com enorme margem de segurança a exigência interna de desempenho (< 2.000 ms).

---

## 22. Homologação Visual

Inspeção minuciosa dos PDFs gerados em runtime e capturados via `adb exec-out screencap -p`:

1. **Número e Cabeçalho:** Número do orçamento com tipografia destacada em verde floresta institucional (`#1B5E20`), datas de emissão e validade formatadas, e badge de status comercial (`RASCUNHO`, etc.).
2. **Dados do Prestador e Cliente:** Quadro corporativo completo com Razão Social / Nome, CPF/CNPJ, Telefone e E-mail em linha de contato limpa, e endereço do cliente formatado.
3. **Tabela de Itens:**
   - Badges coloridos e legíveis diferenciando `SERVIÇO` e `PRODUTO`.
   - Alinhamento monetário à direita com largura fixa.
   - Detalhamento de áreas medidas aninhado logo abaixo da descrição do serviço medido em caixa destacada verde suave (`#F1F8E9`), listando nome e metragem quadrada individual de cada área.
4. **Resumo Financeiro:**
   - Bloco visual protegido com Subtotal, Desconto destacado em vermelho sóbrio (`#C62828`) e Total Geral em negrito proeminente.
   - Bloco de Prazos e Condições Comerciais em coluna balanceada.
5. **Comportamento Multi-página (Cenário C):**
   - Transição limpa de página A4 sem cortes de texto ou quebra de linhas pelo meio.
   - Observações extensas preservadas integralmente na segunda página.
6. **Rodapé:** Rodapé institucional fixo e estático na margem inferior.
7. **Ausência de Inconsistências:** Zero ocorrências de `undefined`, `null` ou `NaN`.

---

## 23. Segurança e Multi-tenancy

- **Controle de Propriedade:** O caso de uso valida explicitamente `orcamento.usuarioId !== usuarioId`, bloqueando a geração com `UsuarioNaoAutorizadoError` caso um usuário tente emitir proposta de terceiros.
- **Repositórios e RLS:** Todas as consultas utilizam o cliente autenticado sob o contexto do usuário (`auth.uid()`).
- **Nenhum uso de `service_role`:** Comprovado por busca estrita no repositório.
- **Credenciais:** Nenhuma chave secreta ou token adicionado ao código.

---

## 24. Verificação dos Módulos Congelados

Por verificação de diff e busca, atesta-se a preservação integral dos módulos congelados:
- **Auth:** Sem alterações estruturais.
- **RLS:** Sem alterações em políticas ou tabelas.
- **Clientes:** Módulo intacto.
- **Catálogo (Serviços e Produtos):** Módulo intacto.
- **Orçamentos:** Regras de negócio, cálculos e máquina de estados inalterados.
- **Áreas / Mapas:** Módulo intacto.
- **GAP-AREA-01 a GAP-AREA-08:** Sem alterações.
- **Bloco A:** Módulo intacto.

---

## 25. Verificação de Zero Migrations

- Total de migrations adicionadas no Bloco B: **ZERO (0)**.
- O Modelo Físico v1.1 e o DER v1.1 permanecem intactos.

---

## 26. Verificação de Separação do Bloco C

Foi estritamente assegurado o isolamento de escopo contra o futuro Bloco C:
- `ACTION_SEND`: **Ausente** (0 ocorrências em código ativo).
- `expo-sharing`: **Ausente** (não instalado, não importado).
- `Sharesheet`: **Ausente**.
- Integrações externas (WhatsApp, E-mail, Telegram): **Ausentes**.
- Armazenamento em nuvem (Supabase Storage, S3): **Ausentes**.

---

## 27. Limitações e Observações Técnicas

1. **Dependência de Visualizador Nativo:** Conforme preconizado pela arquitetura do Bloco B, o aplicativo confia no ecossistema Android para a renderização do PDF via `ACTION_VIEW`. No emulador oficial, o componente `com.google.android.apps.docs` (`Google PDF Viewer`) proveu visualização estável e imediata. Dispositivos sem nenhum visualizador recebem mensagem defensiva orientando a instalação.
2. **Paginação A4 e Rodapé:** Em conformidade com o planejamento v1.1 e as limitações do motor de impressão do Android WebView, o rodapé institucional é estático no final do conteúdo, evitando o uso instável de `counter(pages)`.

---

## 28. Evidências

Todas as evidências coletadas durante a implementação foram salvas no diretório `docs/evidencias/`:

- `docs/evidencias/screen_bench_b_btn_pdf.png`: Tela do aplicativo com o botão "Gerar PDF da Proposta".
- `docs/evidencias/screen_bench_alert.png`: Diálogo com os resultados oficiais das medições de desempenho cronometradas no Pixel 10.
- `docs/evidencias/screenshot_pdf_viewer_cenario_b_full.png`: Documento PDF do Cenário B (Médio) aberto no Google PDF Viewer nativo.
- `docs/evidencias/screenshot_pdf_viewer_cenario_c.png`: Documento PDF do Cenário C (Grande, multi-página, 12 itens e 5 áreas) aberto no visualizador nativo.

---

## 29. Conclusão

A implementação do Bloco B foi concluída com sucesso absoluto, em conformidade com todas as regras canônicas do projeto, diretrizes arquiteturais e critérios de qualidade exigidos.

STATUS:
IMPLEMENTAÇÃO CONCLUÍDA — BLOCO B — AGUARDANDO AUDITORIA
