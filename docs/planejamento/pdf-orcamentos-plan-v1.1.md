# Planejamento Técnico — Bloco B v1.1
## Geração e Apresentação de PDF de Orçamentos

**Projeto:** Sistema de Orçamentos para Jardinagem  
**Módulo:** Geração e Apresentação de Documentos Comerciais  
**Bloco:** B — Geração e Apresentação de PDF de Orçamentos  
**Versão:** 1.1 (Revisada pós-auditoria)  
**Data:** 03 de Outubro de 2026  
**Documento Predecessor:** `docs/planejamento/pdf-orcamentos-plan-v1.0.md`  
**Parecer de Auditoria Vinculante:** `docs/planejamento/pdf-orcamentos-plan-audit-v1.0.md`  
**Status do Bloco Anterior (Bloco A):** AUDITADO E HOMOLOGADO (CONGELADO)  

---

## 1. Controle de Versão

| Versão | Data | Autor | Descrição das Alterações |
|:---:|:---:|:---:|:---|
| **1.0** | 03/10/2026 | Arquiteto de Software | Planejamento técnico inicial do Bloco B submetido à auditoria independente. |
| **1.1** | 03/10/2026 | Arquiteto de Software | **Revisão controlada pós-auditoria v1.0:**<br/>- Correção da rastreabilidade canônica de RNF33 (identificação do orçamento);<br/>- Delimitação exata da fonte de verdade e do snapshot de itens vs dados cadastrais correntes;<br/>- Eliminação da ambiguidade matemática (domínio como único motor financeiro);<br/>- Definição unívoca da estratégia de visualização (separando geração, visualização e compartilhamento);<br/>- Substituição de contadores dinâmicos de página inviáveis por rodapé comercial compatível com Android;<br/>- Estruturação de protocolo estatístico para o RNF14 com descarte de warm-up e amostragem volumétrica;<br/>- Inclusão do teste formal de mutação de catálogo para RN78;<br/>- Tratamento defensivo de cliente sem endereço e dados opcionais. |

---

## 2. Objetivo

Estabelecer a especificação técnica revisada e estritamente aderente à arquitetura canônica para o **Bloco B — Geração e Apresentação de PDF de Orçamentos**.

O Bloco B provê a infraestrutura, a orquestração de aplicação e os componentes de interface necessários para sintetizar um orçamento completo em um documento PDF diretamente no dispositivo Android. O documento é gerado de forma 100% local e offline a partir dos registros persistidos do orçamento, mantendo fidelidade absoluta aos valores calculados pelo domínio, preservando a identidade visual comercial e assegurando legibilidade superior, sem qualquer invasão de funcionalidades de compartilhamento externo (reservadas ao Bloco C).

---

## 3. Histórico da Revisão v1.0 → v1.1 e Tratamento dos Achados da Auditoria

Esta versão decorre obrigatoriamente do parecer independente emitido em `docs/planejamento/pdf-orcamentos-plan-audit-v1.0.md`. Todos os achados foram individual e rigorosamente sanados:

| Achado da Auditoria v1.0 | Severidade | Tratamento Aplicado na Versão 1.1 | Seção Refletida |
|---|:---:|---|:---:|
| **ACHADO-AUD-B-01** (Rastreabilidade Erônea de RNF33) | **MAJOR** | RNF33 foi restabelecido ao seu texto canônico: identificação unívoca do **orçamento** (código, número, status e distinção visual). A identificação do prestador de serviços permanece no cabeçalho, porém justificada e rastreada legitimamente a **RF80** e **RN79**. | Seções 6, 15, 16, 30 |
| **ACHADO-AUD-B-02** (Imprecisão Conceitual do Snapshot - RN78) | **MAJOR** | Eliminada a expressão "snapshot integral". Formalizou-se a distinção: itens (`ITEM_ORCAMENTO`), áreas (`AREA`) e valores do orçamento possuem snapshot histórico imutável; dados cadastrais de `CLIENTE`, `ENDERECO` e `USUARIO` refletem o estado cadastral vigente no momento da geração do documento. | Seção 9 |
| **ACHADO-AUD-B-03** (Ambiguidade entre Recálculo vs Invariantes) | **MAJOR** | Extinta qualquer prescrição de recálculo financeiro no mapper/template. Declarou-se a autoridade exclusiva do agregado `Orcamento`. O mapper apenas transporta e formata; o caso de uso atua exclusivamente validando invariantes defensivas, sem possuir motor concorrente. | Seções 13, 14, 18 |
| **ACHADO-AUD-B-04** (Indefinição do Mecanismo de Visualização) | **MAJOR** | Eliminada a indefinição "ou printAsync ou abertura direta de URI". Fixou-se a estratégia determinística: geração via `Print.printToFileAsync` e visualização direta via `ACTION_VIEW` com URI segura `content://` mediada por `FileProvider` e permissão de leitura temporária, sem envolver Sharesheet (`ACTION_SEND`). | Seção 12 |
| **ACHADO-AUD-B-05** (Inviabilidade de "Página X de Y" via CSS) | **MAJOR** | Removida a exigência de `counter(pages)` via CSS, comprovadamente não suportada pelo motor Chromium do Android WebView via `PrintDocumentAdapter`. Substituída por rodapé institucional estático de alta legibilidade com identificação do orçamento, marca d'água técnica e controle anti-quebra de tabelas. | Seções 16, 17 |
| **ACHADO-AUD-B-06** (Falta de Rigor Metodológico no RNF14) | **MINOR** | Diferenciou-se a norma canônica de RNF14 ("tempo adequado sem bloqueios") da meta interna de aceitação (< 2,0s). Estruturou-se protocolo com warm-up descartado, 5 repetições e 3 cenários volumétricos (pequeno, médio, grande), corrigindo terminologia de concorrência. | Seção 22 |
| **ACHADO-AUD-B-07** (Ausência de Teste de Mutação de Catálogo) | **MINOR** | Adicionado teste explícito de regressão da RN78: catálogo de serviços/produtos é mutado após a criação do orçamento, comprovando que o PDF gerado permanece fiel aos dados originais do `ItemOrcamento`. | Seções 23, 30 |
| **ACHADO-AUD-B-08** (Tratamento de Cliente sem Endereço) | **MINOR** | Definida política defensiva para dados opcionais: clientes sem endereço cadastrado exibem "Endereço: Não informado", sem quebras de layout, sem "null" e sem "undefined". | Seções 15, 19 |
| **ACHADO-AUD-B-09** (Incoerência na Seção de Questões Abertas) | **MINOR** | A seção de questões abertas foi saneada, registrando de forma fundamentada que todas as pendências técnicas foram equacionadas nesta revisão v1.1. | Seção 28 |

---

## 4. Escopo do Bloco B

### 4.1. No Escopo do Bloco B
- Modelagem e implementação do contrato de infraestrutura `PdfGenerator`;
- Instalação oficial da dependência de renderização local `expo-print` (~57.0.x);
- Criação do caso de uso de aplicação `GerarPdfOrcamentoUseCase`;
- Criação do mapper puro `OrcamentoPdfMapper` e modelo desacoplado `OrcamentoPdfModel`;
- Template HTML5/CSS print-ready com formatação brasileira (moeda, datas, áreas e tipografia institucional);
- Mecanismo determinístico de apresentação/visualização do documento no dispositivo via `ACTION_VIEW` com `FileProvider` (`content://`);
- Interação na tela de detalhes do orçamento (`app/(app)/orcamentos/[id].tsx`) com botão de geração e indicador de carregamento não-bloqueante;
- Suíte completa de testes automatizados e homologação em runtime nativo no emulador Android (`Pixel_10`).

### 4.2. Fora do Escopo do Bloco B (Segregação Estrita com Bloco C e Futuros)
- **Compartilhamento Externo:** WhatsApp, e-mail, Telegram, aplicativos de mensagens (Bloco C);
- **Android Sharesheet / `ACTION_SEND`:** Mecanismo de despacho multipropósito do sistema operacional (Bloco C);
- **Biblioteca `expo-sharing`:** Integração delegada ao Bloco C;
- **Armazenamento em Nuvem / Supabase Storage:** O PDF é gerado e mantido exclusivamente no cache local;
- **Assinatura Digital / Certificados ICP-Brasil / Criptografia de Documentos:** Não previstos no projeto;
- **Mutações nos Módulos Congelados:** Autenticação, RLS, Clientes, Catálogo, Orçamentos, Áreas (GAP-AREA-01 a 08) e Bloco A permanecem congelados.

---

## 5. Fontes Canônicas Consultadas

1. **Requisitos Funcionais v2:** RF79, RF80, RF81;
2. **Regras de Negócio v3:** RN15, RN20, RN29, RN30, RN33, RN47, RN48, RN49, RN50, RN54, RN55, RN78, RN79, RN80;
3. **Requisitos Não Funcionais v2:** RNF01, RNF03, RNF11, RNF14, RNF17, RNF18, RNF23, RNF25, RNF26, RNF31, RNF32, RNF33;
4. **Arquitetura Técnica v1.1:** Seção 2 ("Serviços de infraestrutura - PdfGenerator"), Seção 3 ("Organização em 4 Camadas") e Seção 6 ("PdfGenerator: Isola a aplicação dos detalhes da geração de PDF");
5. **DER v1.1 e Modelo Físico v1.1:** Estrutura e integridade referencial das tabelas do banco;
6. **Auth & RLS Strategy v1.6:** Isolamento estrito de dados por `usuario_id = auth.uid()`;
7. **Parecer de Auditoria Técnica do Bloco A:** `docs/relatorios/geocodificacao-localizacao-implementation-audit-v1.0.md` (Bloco A homologado);
8. **Parecer de Auditoria do Planejamento v1.0:** `docs/planejamento/pdf-orcamentos-plan-audit-v1.0.md`.

---

## 6. Requisitos Cobertos

### 6.1. Requisitos Funcionais
- **RF79:** O sistema deve permitir gerar um PDF a partir dos dados de um orçamento.
- **RF80:** O PDF deve apresentar, quando aplicável: identificação do profissional/prestador, identificação do cliente, identificação do orçamento, data, validade, serviços, produtos, áreas, quantidades, valores, desconto, total, observações e condições de pagamento.
- **RF81:** Os valores e demais dados apresentados no PDF devem corresponder exatamente aos dados do orçamento utilizado para sua geração.

### 6.2. Regras de Negócio
- **RN78:** O PDF deve ser produzido a partir dos dados históricos persistidos do orçamento e de seus itens, sem reconstruir informações a partir do catálogo atual de serviços e produtos.
- **RN79:** O PDF deve apresentar o conteúdo mínimo e seguir o layout oficial estruturado, legível e organizado.
- **RN80:** Garantir a consistência matemática dos valores apresentados no PDF com o orçamento persistido.

### 6.3. Requisitos Não Funcionais
- **RNF14:** A geração do PDF deve ocorrer em tempo adequado ao uso do aplicativo, sem causar bloqueios prolongados da interface (meta interna de aceitação: média < 2,0s no Android).
- **RNF31:** O PDF gerado deve apresentar conteúdo legível, organizado e adequado para apresentação formal ao cliente (tipografia clara, quebras de página controladas, tabelas alinhadas).
- **RNF32:** O conteúdo e os valores apresentados no PDF devem permanecer rigorosamente consistentes com os dados do orçamento exibidos na aplicação.
- **RNF33:** O PDF deve apresentar identificação clara do orçamento, permitindo distingui-lo de outros documentos comerciais (número/código sequencial, datas e distinção visual).

---

## 7. Estado Atual da Implementação

1. **Entidade `Orcamento` (`src/domain/entities/orcamento.ts`):**  
   Encapsula subtotal, desconto, total, status, datas e textos. É a única autoridade das regras de cálculo financeiro da proposta.
2. **Entidade `ItemOrcamento` (`src/domain/entities/item-orcamento.ts`):**  
   Grava snapshot histórico no momento da criação (descrição, unidade, preço unitário, valor total, tipo e flag `usaMedicaoArea`). Contém a coleção `areas` hidratada.
3. **Entidade `Area` (`src/domain/entities/area.ts`):**  
   Contém `nome`, `areaCalculada` em m², `unidade` e observações.
4. **Entidades `Cliente`, `Endereco` e `Usuario`:**  
   Cadastros de suporte gerenciados por `SupabaseClienteRepository` e `AuthService.getPerfilUsuario`.
5. **Módulo PDF:**  
   Inexistente no código atual. A ser implementado estritamente conforme esta especificação v1.1.

---

## 8. Arquitetura em 4 Camadas

A arquitetura preserva estritamente a separação e o fluxo de dados em sentido único:

```
[Presentation]
  app/(app)/orcamentos/[id].tsx
  useGerarPdf Hook / PdfViewerLauncher
       │
       ▼ (invoca caso de uso)
[Application]
  GerarPdfOrcamentoUseCase
       │ ├── consulta repositórios (Orcamento, Cliente, AuthService)
       │ ├── valida integridade e invariantes
       │ ├── delega ao OrcamentoPdfMapper (produz OrcamentoPdfModel)
       │ └── aciona porta PdfGenerator
       │
       ▼ (dependência via interface)
[Domain]
  Orcamento, ItemOrcamento, Area, Cliente, Usuario (Entidades Puras)
  moeda.ts (Função pura arredondarMoeda)
       │
       ▲ (implementa porta de infraestrutura)
[Infrastructure]
  ExpoPrintPdfGenerator (implementa PdfGenerator)
       ├── OrcamentoHtmlTemplate (HTML5 / CSS Print Engine)
       ├── expo-print API (Print.printToFileAsync)
       └── Android FileProvider / ACTION_VIEW (abertura nativa para inspeção)
```

- **Domain:** 100% livre de referências a HTML, PDF, buffers, sistema de arquivos ou Expo.
- **Application:** Define os contratos (`PdfGenerator`), o caso de uso (`GerarPdfOrcamentoUseCase`) e o modelo (`OrcamentoPdfModel`).
- **Infrastructure:** Converte o modelo em HTML/CSS e compila em PDF via subsistema nativo do Android.
- **Presentation:** Dispara a geração com feedback visual e gerencia a apresentação do arquivo gerado.

---

## 9. Fonte de Verdade dos Dados e Limites do Snapshot (RN78, RNF18)

Em atendimento ao **ACHADO-AUD-B-02**, o planejamento formaliza a fronteira entre dados históricos e dados vigentes:

### 9.1. Dados com Snapshot Histórico Imutável
- **Itens do Orçamento (`ITEM_ORCAMENTO`):**  
  A descrição, unidade, valor unitário, quantidade faturada, valor total e tipo (`SERVICO` ou `PRODUTO`) são imutáveis e extraídos exclusivamente da tabela `item_orcamento`. Alterações posteriores em `servico` ou `produto` no catálogo não afetam o PDF histórico (RN78).
- **Áreas Delimitadas (`AREA`):**  
  As áreas vinculadas a itens com medição de área são persistidas com sua geometria e metragem quadrada calculada (`area_calculada`). O PDF consome esses dados históricos.
- **Valores e Datas da Proposta (`ORCAMENTO`):**  
  O número identificador (`numero`), data de criação, data de validade, subtotal, valor do desconto e total da proposta são imutáveis após a aprovação/conclusão e residem na tabela `orcamento`.

### 9.2. Dados Cadastrais Correntes no Momento da Geração
- **Dados do Cliente (`CLIENTE` e `ENDERECO`):**  
  O Modelo Físico v1.1 não duplica nem armazena snapshot de clientes ou endereços dentro do orçamento. Os dados de contato (nome, telefone, e-mail, documento) e localização da intervenção (logradouro, número, bairro, cidade, estado, CEP) são carregados do cadastro vigente de `cliente` e `endereco` no instante em que o PDF é gerado.
- **Dados do Prestador (`USUARIO`):**  
  O nome do profissional/empresa e telefone de contato são carregados do cadastro vigente do prestador (`public.usuario`) no instante da geração.

**Princípio Canônico:** A regra RN78 garante que o PDF represente a proposta comercial sem dependência do catálogo de serviços e produtos atual. A consulta a cadastros correntes de cliente e prestador é uma característica estrutural do Modelo Físico v1.1 e não viola a imutabilidade comercial da proposta.

---

## 10. Estratégia de Geração de PDF (DECISÃO-PDF-01)

Adota-se a geração local através da biblioteca oficial do Expo:
- **Pacote:** `expo-print` (~57.0.x);
- **Mecanismo:** Compilação do template HTML5/CSS pelo motor Android WebView / `PrintDocumentAdapter` através de `Print.printToFileAsync({ html, base64: false })`;
- **Vantagens Técnicas:**
  - Execução 100% offline em campo;
  - Zero dependência de internet ou APIs em nuvem;
  - Zero custo operacional;
  - Desacoplamento arquitetural absoluto entre template de apresentação e regras de negócio.

---

## 11. Estratégia de Visualização e Apresentação no Dispositivo (DECISÃO-PDF-08)

Em saneamento definitivo ao **ACHADO-AUD-B-04**, o planejamento estipula uma estratégia unívoca e segura para visualização, mantendo a segregação estrita entre as 4 operações:

```
[ GERAÇÃO ]  ──>  Print.printToFileAsync({ html })  ──>  Grava PDF temporário no Cache
     │
     ▼
[ ARQUIVO ]  ──>  uri: file:///data/user/0/.../cache/Print/Orcamento_ORC-2026-001.pdf
     │
     ▼
[ VISUALIZAÇÃO ] (Bloco B)
     │
     ├── 1. Obtenção de Content URI via FileSystem (content://...FileProvider/...)
     └── 2. Disparo de Intent ACTION_VIEW (application/pdf) com FLAG_GRANT_READ_URI_PERMISSION
     │
     ▼ (Abre leitor nativo padrão do Android: Google Drive PDF Viewer, Adobe, etc.)
     │
     X  (NÃO COMPARTILHA - Sharesheet / ACTION_SEND / WhatsApp / e-mail pertencem ao Bloco C)
```

### 11.1. Detalhamento Técnico da Visualização
1. O use case `GerarPdfOrcamentoUseCase` retorna a URI do arquivo gerado (`file://...`);
2. Para que o documento seja inspecionado visualmente pelo usuário no Android sem risco de `FileUriExposedException` (Android 7+), a camada de apresentação/infraestrutura:
   - Converte a URI de arquivo para URI de conteúdo (`content://`) via `FileSystem.getContentUriAsync(fileUri)`;
   - Dispara a Intent nativa de visualização através de `IntentLauncher.startActivityAsync('android.intent.action.VIEW', { data: contentUri, type: 'application/pdf', flags: 1 })`;
   - O sistema operacional Android abre o leitor de PDF padrão do dispositivo para que o profissional inspecione o layout, as páginas e os valores;
3. **Segregação:** Esta operação utiliza estritamente `android.intent.action.VIEW`. Ela **não** invoca `ACTION_SEND`, **não** abre Sharesheet de compartilhamento e **não** utiliza `expo-sharing`.

---

## 12. Contrato do Caso de Uso `GerarPdfOrcamentoUseCase`

### 12.1. Interfaces de Dados da Aplicação
Arquivo: `src/application/interfaces/pdf-generator.interface.ts`

```typescript
export interface AreaItemPdfModel {
  id: string;
  nome: string;
  areaCalculadaFormatada: string; // Ex: "120,50 m²"
}

export interface ItemOrcamentoPdfModel {
  numeroItem: number;
  tipoDescricao: 'Serviço' | 'Produto';
  descricao: string;
  quantidadeFormatada: string;   // Ex: "120,50" ou "2,00"
  unidade: string;               // Ex: "m²", "un", "h"
  valorUnitarioFormatado: string;// Ex: "R$ 45,00"
  valorTotalFormatado: string;   // Ex: "R$ 5.422,50"
  usaMedicaoArea: boolean;
  areas: AreaItemPdfModel[];
}

export interface PrestadorPdfModel {
  nome: string;
  telefoneFormatado: string | null;
}

export interface ClientePdfModel {
  nome: string;
  telefoneFormatado: string | null;
  email: string | null;
  documentoFormatado: string | null; // CPF/CNPJ quando informado
  enderecoFormatado: string;         // Logradouro completo ou "Endereço: Não informado"
}

export interface OrcamentoPdfModel {
  id: string;
  numero: string;                   // Ex: "ORC-2026-001"
  dataCriacaoFormatada: string;     // Ex: "03/10/2026"
  dataValidadeFormatada: string;    // Ex: "18/10/2026" ou "Validade: A combinar"
  statusBadge: string;              // Ex: "Rascunho", "Aprovado", "Enviado"
  prestador: PrestadorPdfModel;
  cliente: ClientePdfModel;
  itens: ItemOrcamentoPdfModel[];
  subtotalFormatado: string;        // Ex: "R$ 5.422,50"
  temDesconto: boolean;
  descricaoDesconto: string | null; // Ex: "Desconto (10%):" ou "Desconto Fixo:"
  valorDescontoFormatado: string | null; // Ex: "- R$ 542,25"
  totalFormatado: string;           // Ex: "R$ 4.880,25"
  observacoes: string | null;
  condicoesPagamento: string | null;
}

export interface ResultadoGeracaoPdf {
  uri: string;
  nomeArquivo: string;
}

export interface PdfGenerator {
  gerar(modelo: OrcamentoPdfModel): Promise<ResultadoGeracaoPdf>;
}
```

### 12.2. Fluxo de Execução do Caso de Uso
1. **Validação Preliminar:** Valida preenchimento dos parâmetros obrigatórios (`orcamentoId`, `usuarioId`);
2. **Carregamento Autenticado:**  
   - Busca orçamento, itens e áreas via `OrcamentoRepository.buscarPorId(orcamentoId)`;
   - Valida autorização: `orcamento.usuarioId === usuarioId` (rejeita com `UsuarioNaoAutorizadoError` em caso de divergência);
3. **Validação de Conteúdo:** Verifica se `orcamento.itens.length > 0` (rejeita com `OrcamentoSemItensError`);
4. **Carregamento Cadastral:**  
   - Busca cliente e endereço atualizados via `ClienteRepository.buscarPorId(orcamento.clienteId)`;
   - Busca perfil do prestador via `AuthService.getPerfilUsuario(usuarioId)`;
5. **Validação Defensiva de Invariantes (Sem Recálculo de Negócio):**  
   - Verifica se a soma dos `item.valorTotal` confere com `orcamento.subtotal`;
   - Se divergente, lança `InconsistenciaFinanceiraError` (garante que dados corrompidos não gerem PDF);
6. **Mapeamento:** Invoca `OrcamentoPdfMapper.paraModelo(orcamento, cliente, prestador)`;
7. **Compilação de Infraestrutura:** Invoca `pdfGenerator.gerar(modelo)` e retorna `{ uri, nomeArquivo }`.

---

## 13. Unicidade do Motor Financeiro (RN80, RNF32)

Em conformidade rigorosa com o **ACHADO-AUD-B-03**:

1. **Autoridade Exclusiva do Domínio:**  
   O agregado `Orcamento` e a função pura `arredondarMoeda(valor)` de `moeda.ts` são as únicas autoridades de cálculo financeiro do sistema.
2. **Mapper é Puramente Transportador e Formatador:**  
   O `OrcamentoPdfMapper` não aplica fórmulas matemáticas de negócio (`*`, `-`, `/ 100`). Ele consome os valores numéricos já arredondados e validados pelo agregado (`subtotal`, `valorDesconto`, `total`, `item.valorTotal`) e executa exclusivamente a conversão em texto monetário no padrão pt-BR:
   ```typescript
   formatarMoeda(valor: number): string => `R$ ${valor.toFixed(2).replace('.', ',')}`
   ```
3. **Quantidade de Serviços Medidos:**  
   A quantidade faturada é extraída de `item.quantidade` (que o domínio já calculou como a soma exata das áreas vinculadas, conforme RN33). A tabela de itens exibe essa quantidade consolidada e, abaixo da descrição, lista nominalmente cada área associada com sua metragem quadrada para fins de auditoria visual do cliente.

---

## 14. Conteúdo Mínimo do Documento Comercial (RF80, RN79)

O PDF contém obrigatoriamente todos os 14 itens exigidos pelo requisito canônico:

1. **Identificação do Prestador:** Nome comercial e telefone (RF80/RN79);
2. **Identificação do Cliente:** Nome completo e dados de contato (RF80/RN79);
3. **Endereço da Intervenção:** Endereço completo formatado ou indicação de "Não informado" (RF80/RN79);
4. **Identificação do Orçamento:** Código/número único do orçamento em destaque (RF80/RNF33);
5. **Data de Emissão:** Data civil de criação da proposta (RF80/RN79);
6. **Validade da Proposta:** Data de validade expressa ou "A combinar" (RF80/RN79);
7. **Status da Proposta:** Badge visual com o status atual (RF80);
8. **Relação de Serviços:** Itens de serviço com discriminação de áreas e unidades (RF80);
9. **Relação de Produtos:** Itens de produto com quantidades e unidades (RF80);
10. **Valores Unitários e Totais dos Itens:** Detalhamento por linha (RF80);
11. **Subtotal da Proposta:** Soma monetária de todos os itens (RF80/RN80);
12. **Desconto Discriminado:** Percentual ou fixo, com valor deduzido evidente (RF80/RN80);
13. **Total Geral:** Valor final a pagar em tipografia destacada (RF80/RN80);
14. **Observações e Condições de Pagamento:** Prazos, garantias e condições comerciais (RF80/RN79).

---

## 15. Layout Oficial do PDF (RN79, RNF31, RNF33)

### 15.1. Estrutura Visual
O layout adota proporções de design gráfico profissional, paleta de cores corporativa baseada na identidade visual do aplicativo (Verde Floresta `#1B5E20`, Verde Primário `#2E7D32`, Cinza Neutro `#424242` e Cinza Claro `#F8F9FA`) e grid responsivo para folha A4.

1. **Faixa Superior (Cabeçalho Institucional - RF80 / RNF33):**
   - Lado Esquerdo: Nome do Prestador / Empresa (16pt, bold `#1B5E20`) e canais de contato;
   - Lado Direito: Caixa destacada contendo o **Número do Orçamento** (14pt, bold `#2E7D32`), Data de Emissão, Data de Validade e Badge de Status. Atende taxativamente ao **RNF33** garantindo identificação imediata do documento.
2. **Faixa de Dados do Cliente:**
   - Caixa com fundo sutil `#F9FBF9` e borda `#E8ECE8`;
   - Nome do cliente, documento (CPF/CNPJ quando informado), e-mail e telefone;
   - Linha dedicada ao endereço da intervenção.
3. **Tabela Principal de Itens:**
   - Cabeçalho escuro `#2E7D32` com texto branco;
   - Linhas zebradas alternando branco e `#FAFCFA`;
   - Para itens com medição de área, caixa aninhada detalhando:  
     *▸ Áreas Medidas: Área Frontal (120,50 m²) | Área Lateral (45,00 m²)*;
   - Alinhamento numérico à direita para Qtd, Unitário e Total.
4. **Quadro de Resumo Financeiro:**
   - Posicionado no canto inferior direito;
   - Subtotal, Desconto destacado em vermelho sutil (ex: `- R$ 150,00`) e Linha do Total Geral com tipografia 16pt bold cor `#1B5E20`.
5. **Bloco de Informações Complementares:**
   - Condições de Pagamento e Observações em caixas de texto com bordas sutis.

---

## 16. Paginação Realista e Rodapé Comercial (RNF31)

Em saneamento definitivo ao **ACHADO-AUD-B-05**:

- **Remoção de Contadores Dinâmicos:** A exigência de `counter(pages)` via CSS foi removida devido à incompatibilidade do motor Chromium no Android WebView via `PrintDocumentAdapter`.
- **Estratégia de Controle de Quebra de Página:**
  ```css
  @media print {
    table { page-break-inside: auto; }
    tr    { page-break-inside: avoid; page-break-after: auto; }
    thead { display: table-header-group; }
    .bloco-totais { page-break-inside: avoid; }
    .bloco-condicoes { page-break-inside: avoid; }
  }
  ```
- **Rodapé Institucional Comercial:**
  - Posicionado na base do documento com linha divisória sutil:
    `Orçamento ORC-2026-001 • Documento emitido eletronicamente pelo Sistema de Orçamentos para Jardinagem • Registro emitido em DD/MM/AAAA às HH:MM`

---

## 17. Tratamento Defensivo de Dados Opcionais (ACHADO-AUD-B-08)

O `OrcamentoPdfMapper` e o template HTML aplicam tratamento defensivo para todos os campos não obrigatórios:

| Campo | Estado no Banco | Comportamento no PDF |
|---|:---:|---|
| `cliente.endereco` | `null` | Renderiza: *"Endereço: Não informado"* |
| `cliente.documento` | `null` ou vazio | Omite a linha de documento |
| `cliente.telefone` | `null` ou vazio | Omite o telefone do cliente |
| `cliente.email` | `null` ou vazio | Omite o e-mail do cliente |
| `orcamento.dataValidade` | `null` | Renderiza: *"Validade: A combinar"* |
| `orcamento.observacoes` | `null` ou vazio | Omite o bloco de observações |
| `orcamento.condicoesPagamento` | `null` ou vazio | Renderiza: *"A combinar com o prestador"* |
| `orcamento.tipoDesconto` | `null` | Omite a linha de desconto e exibe subtotal = total |

---

## 18. Privacidade e Minimização de Dados (LGPD)

- Os dados presentes no PDF (nome do cliente, documento, telefone, e-mail e endereço) são estritamente os dados necessários para formalizar o negócio jurídico comercial entre o prestador e o contratante;
- Nenhuma informação de outros clientes ou metadados de autenticação (como `auth_user_id` ou tokens de sessão) é injetada no documento;
- O documento é gerado no diretório de cache privado do aplicativo (`context.getCacheDir()`).

---

## 19. Segurança e Isolamento Multi-tenant (RLS)

- A geração de PDF respeita a política de isolamento do Supabase RLS (`usuario_id = auth.uid()`);
- O caso de uso valida formalmente a propriedade: se o `orcamento.usuarioId` não corresponder ao `usuarioId` autenticado, a execução é abortada imediatamente com `UsuarioNaoAutorizadoError`;
- Nenhuma operação utiliza permissões elevadas (`service_role`).

---

## 20. Desempenho e Protocolo Metodológico de Medição (RNF14)

Em saneamento definitivo ao **ACHADO-AUD-B-06**:

### 20.1. Requisito Canônico vs Meta de Engenharia
- **Requisito Canônico (RNF14):** A geração do documento deve ocorrer em tempo adequado ao uso do aplicativo, sem causar bloqueios prolongados da interface.
- **Meta Interna de Engenharia:** Duração média de geração **inferior a 2,0 segundos** e percentil 95 (p95) inferior a **2,5 segundos** no cenário médio.
- **Não-Bloqueio de UI:** O processamento no JavaScript é assíncrono e cede o event loop. A tela exibe um indicador de atividade (`ActivityIndicator`) e desabilita o botão para impedir duplo disparo acidental.

### 20.2. Protocolo de Teste Empírico Reproduzível
A medição de desempenho no emulador `Pixel_10` (Android 16 / API 37) seguirá o roteiro:
1. **Definição dos Cenários Volumétricos:**
   - **Cenário A (Pequeno):** 1 serviço, 1 produto, sem medição de área (1 página);
   - **Cenário B (Médio — Referência):** 3 serviços, 2 produtos, 2 áreas medidas, desconto percentual (1 página);
   - **Cenário C (Grande):** 12 itens mistos, 5 áreas medidas, textos longos de observações e condições (múltiplas páginas).
2. **Procedimento de Amostragem:**
   - Execução de 1 rodada de aquecimento (warm-up para inicialização da WebView nativa), cujo tempo é registrado mas **descartado** da média;
   - Realização de **5 execuções consecutivas** cronometradas para cada cenário;
3. **Métrica Cronometrada:**
   - $T_0$: momento imediatamente anterior à chamada de `gerarPdfUseCase.execute()`;
   - $T_1$: momento em que a URI do arquivo gerado é devolvida pelo adaptador;
   - Duração da amostra = $T_1 - T_0$ em milissegundos;
4. **Critério de Aprovação:** Média aritmética das 5 amostras do Cenário B inferior a 2.000 ms.

---

## 21. Planejamento dos Testes Automatizados

A suíte de testes do Bloco B contemplará testes em Node.js puro via `tsx --test`:

### 21.1. Arquivos de Teste Planejados
1. `tests/application/orcamento-pdf-mapper.test.ts`:
   - Mapeamento com serviços e produtos;
   - Formatação correta de moedas, áreas e datas;
   - Mapeamento de cliente sem endereço (tratamento defensivo);
   - Tratamento de campos opcionais ausentes;
   - Mapeamento de desconto fixo, percentual e ausência de desconto.
2. `tests/application/gerar-pdf-orcamento.use-case.test.ts`:
   - Geração com sucesso para orçamento válido;
   - Rejeição para orçamento inexistente (`OrcamentoNaoEncontradoError`);
   - Rejeição para usuário não proprietário (`UsuarioNaoAutorizadoError`);
   - Rejeição para orçamento sem itens (`OrcamentoSemItensError`);
   - Rejeição preventiva em caso de inconsistência matemática (`InconsistenciaFinanceiraError`);
   - **Teste de Imutabilidade Histórica sob Mutação de Catálogo (RN78 — ACHADO-AUD-B-07):**
     * Prova formal de que a alteração de preços ou descrições no catálogo pós-criação do orçamento não modifica o documento gerado.
3. `tests/infrastructure/expo-print-pdf-generator.test.ts`:
   - Geração de HTML estruturado com tags semânticas e CSS anti-quebra;
   - Ausência de palavras-chave indesejadas (`undefined`, `null`, `NaN`);
   - Presença do cabeçalho institucional e número do orçamento em destaque.
4. `tests/domain/consistencia-matematica-pdf.test.ts`:
   - Teste de transporte de valores: assegura que o mapper não altera nenhum centavo do orçamento.

---

## 22. Procedimento de Homologação Visual e Manual no Android

1. **Ambiente:** Emulador oficial `Pixel_10` (Android 16 / API 37);
2. **Fluxo Operacional:**
   - Acessar detalhe de um orçamento com itens e áreas;
   - Acionar o botão **"Gerar PDF da Proposta"**;
   - Observar o indicador de carregamento e o bloqueio de cliques repetidos;
   - Confirmar abertura automática no visualizador de PDF padrão do Android via `ACTION_VIEW`;
3. **Verificação Visual do Documento:**
   - [ ] Número do orçamento e data em destaque (RNF33);
   - [ ] Identificação do prestador com nome e contato no topo (RF80/RN79);
   - [ ] Identificação do cliente e endereço limpo (ou "Endereço: Não informado");
   - [ ] Tabela discriminada alinhada, legível e com detalhamento das áreas medidas;
   - [ ] Subtotal, desconto e total rigorosamente idênticos à tela do aplicativo (RNF32);
   - [ ] Ausência de "null" ou textos cortados;
   - [ ] Rodapé institucional com data de emissão;
   - [ ] Captura de evidência visual via `adb exec-out screencap -p`.

---

## 23. Impacto e Preservação dos Módulos Congelados

- **Autenticação e RLS:** Intocadas. Reutilização de `AuthService.getPerfilUsuario`;
- **Clientes e Endereços:** Intocados. Reutilização de `ClienteRepository.buscarPorId`;
- **Catálogo de Serviços e Produtos:** Intocados. O módulo PDF não consome o catálogo;
- **Orçamentos e Itens:** Intocados. Reutilização de `OrcamentoRepository.buscarPorId`;
- **Áreas e Mapas (Bloco A e GAP-AREA-01 a 08):** Intocados;
- **Banco de Dados:** **Zero migrations**. Nenhuma alteração no PostgreSQL ou Supabase.

---

## 24. Riscos e Mitigações

| Risco | Severidade | Mitigação Arquitetural na v1.1 |
|---|:---:|---|
| **R1: `FileUriExposedException` ao abrir PDF** | Alta | Uso obrigatório de `content://` via `FileSystem.getContentUriAsync` com `FLAG_GRANT_READ_URI_PERMISSION`. |
| **R2: Inconsistência de centavos no documento** | Alta | Mapper atua como transportador/formatador; cálculo exclusivo no domínio `Orcamento`. |
| **R3: Quebra de tabelas em páginas múltiplas** | Média | CSS print-ready com `tr { page-break-inside: avoid }` e `thead { display: table-header-group }`. |
| **R4: Falha na visualização se não houver leitor PDF** | Baixa | O emulador oficial Android possui leitor de PDF nativo integrado ao sistema. Em caso de ausência, `try/catch` exibe alerta orientando instalação de visualizador. |

---

## 25. Dependências Técnicas

- **Biblioteca Oficial:** `expo-print` (~57.0.x), instalada futuramente via:
  ```bash
  npx expo install expo-print
  ```
- **Mecanismos de Apoio:** `expo-file-system` e `expo-intent-launcher` para abertura segura de `ACTION_VIEW` com `FileProvider`.

---

## 26. Questões Abertas (ACHADO-AUD-B-09)

Com a incorporação das soluções da v1.1:
- A estratégia de visualização está unificada em `ACTION_VIEW` com `FileProvider`;
- A delimitação da fonte de verdade foi estabelecida (snapshot de itens/áreas vs dados vigentes de cliente/prestador);
- A autoridade matemática foi restrita ao domínio;
- O rodapé institucional substituiu a paginação dinâmica inviável;
- O protocolo de teste de desempenho foi metodologicamente delimitado.

Portanto: **Não há questões arquiteturais abertas que impeçam a implementação do Bloco B.**

---

## 27. Decisões Técnicas Propostas (Consolidadas na v1.1)

- **DECISÃO-PDF-01 (Provedor de Geração Local):**  
  A geração do documento PDF utilizará exclusivamente a biblioteca oficial `expo-print`, processando HTML5/CSS localmente no dispositivo via Android Print Engine, sem chamadas a servidores remotos ou APIs externas.
- **DECISÃO-PDF-02 (Isolamento da Abstração `PdfGenerator`):**  
  A aplicação dependerá estritamente da interface `PdfGenerator`. Nenhuma dependência do Expo ou de impressão alcançará as camadas de Domínio ou Aplicação.
- **DECISÃO-PDF-03 (Imutabilidade Comercial Restrita aos Itens e Áreas - RN78):**  
  O PDF será gerado a partir do snapshot imutável dos itens (`ITEM_ORCAMENTO`) e áreas (`AREA`). Os dados cadastrais de cliente e prestador refletem os registros vigentes no momento da compilação.
- **DECISÃO-PDF-04 (Unicidade do Motor Financeiro - RN80, RNF32):**  
  O template e o mapper não aplicam fórmulas de cálculo; todos os valores numéricos são originados das propriedades já calculadas pelo agregado `Orcamento`, garantindo divergência nula entre tela e documento.
- **DECISÃO-PDF-05 (Geração Stateless sem Persistência no Banco):**  
  O PDF será gerado sob demanda como arquivo temporário no cache do aplicativo. Nenhuma tabela, coluna ou migration será criada no banco de dados.
- **DECISÃO-PDF-06 (Layout Canônico Estruturado e Rodapé Comercial - RN79, RNF31, RNF33):**  
  O documento seguirá layout comercial formal com cabeçalho institucional destacando o número do orçamento e status (RNF33), dados do prestador e cliente (RF80/RN79), tabela zebrada de serviços/produtos com áreas aninhadas, fechamento financeiro e rodapé estático institucional.
- **DECISÃO-PDF-07 (Desempenho com Feedback Não-Bloqueante - RNF14):**  
  A geração assíncrona exibirá indicador de progresso na interface (`ActivityIndicator`) bloqueando múltiplos toques, com meta de tempo médio de geração inferior a 2,0s.
- **DECISÃO-PDF-08 (Visualização Determinística via `ACTION_VIEW`):**  
  A apresentação do documento no dispositivo Android utilizará uma Intent `ACTION_VIEW` direcionada a `application/pdf`, mediada por Content URI do `FileProvider` (`content://`) com permissão temporária de leitura. O compartilhamento externo permanece isolado para o Bloco C.
- **DECISÃO-PDF-09 (Tratamento Defensivo de Dados Opcionais):**  
  Clientes sem endereço cadastrado ou orçamentos com campos opcionais vazios terão tratamento gracioso no template, sem apresentar "null" ou quebras visuais.
- **DECISÃO-PDF-10 (Testabilidade Multicamadas com Prova de RN78):**  
  A suíte incluirá testes unitários do mapper, use case e template em Node.js puro, teste de blindagem contra mutação de catálogo (RN78) e homologação no emulador Android `Pixel_10`.

---

## 28. Matriz de Rastreabilidade Revisada

| Requisito / Regra | Decisão Técnica | Componentes Envolvidos | Testes de Verificação | Critério de Homologação |
|---|:---:|---|---|---|
| **RF79** (Gerar PDF do orçamento) | DECISÃO-PDF-01, 02 | `GerarPdfOrcamentoUseCase`, `ExpoPrintPdfGenerator` | `gerar-pdf-orcamento.use-case.test.ts` | Arquivo `.pdf` válido gravado no cache local |
| **RF80** (Conteúdo completo do documento) | DECISÃO-PDF-06, 09 | `OrcamentoHtmlTemplate`, `OrcamentoPdfMapper` | `orcamento-pdf-mapper.test.ts`, `expo-print-pdf-generator.test.ts` | Todos os 14 blocos de dados presentes no documento |
| **RF81** (Correspondência estrita de dados) | DECISÃO-PDF-03, 04 | `OrcamentoPdfMapper`, `moeda.ts` | `consistencia-matematica-pdf.test.ts` | Divergência numérica zero entre PDF e app |
| **RN78** (Snapshot imutável sem catálogo) | DECISÃO-PDF-03, 10 | `GerarPdfOrcamentoUseCase`, `ItemOrcamento` | `gerar-pdf-orcamento.use-case.test.ts` (Teste de Mutação) | PDF preserva snapshot mesmo se catálogo mudar |
| **RN79** (Conteúdo mínimo e layout oficial) | DECISÃO-PDF-06, 09 | `OrcamentoHtmlTemplate` | Homologação visual Android, teste do template | Diagramação sem quebras e campos opcionais limpos |
| **RN80** (Consistência matemática no PDF) | DECISÃO-PDF-04 | `OrcamentoPdfMapper`, `moeda.ts` | `consistencia-matematica-pdf.test.ts` | Valores consolidados pelo agregado `Orcamento` |
| **RNF14** (Tempo de geração adequado) | DECISÃO-PDF-07 | `ExpoPrintPdfGenerator` | Protocolo estatístico no Android (5 amostras) | Média das execuções no cenário médio < 2,0s |
| **RNF31** (Legibilidade e qualidade visual) | DECISÃO-PDF-06 | `OrcamentoHtmlTemplate` (CSS Print) | Homologação visual em tela e captura `adb` | Documento legível com contraste e sem sobreposição |
| **RNF32** (Consistência visual e numérica) | DECISÃO-PDF-04 | `OrcamentoDetalheScreen`, Template | Inspeção comparativa Tela ↔ PDF | Total e subtotal idênticos em tela e papel |
| **RNF33** (Identificação clara do orçamento) | DECISÃO-PDF-06 | `OrcamentoHtmlTemplate` | `orcamento-pdf-mapper.test.ts`, Teste visual | Número do orçamento e data em destaque imediato |

---

## 29. Critérios Objetivos para Aprovação do Bloco B

1. [ ] Biblioteca `expo-print` instalada oficialmente sem conflito no Expo SDK 57;
2. [ ] Zero erros de compilação TypeScript (`npm run typecheck` e `npm run test:typecheck`);
3. [ ] Todos os novos testes unitários e de integração passando com 100% de sucesso;
4. [ ] Teste de mutação de catálogo aprovado comprovando a imutabilidade da RN78;
5. [ ] Zero regressão nas suítes pré-existentes (Domínio, Clientes, Catálogo, Orçamentos, Áreas, Auth e pgTAP);
6. [ ] Zero migrations e estrutura de banco inalterada;
7. [ ] Documento PDF gerado com dados idênticos aos da tela;
8. [ ] Cliente sem endereço tratado limpamente como "Endereço: Não informado";
9. [ ] Abertura bem-sucedida no leitor PDF do Android via `ACTION_VIEW` com `FileProvider`;
10. [ ] Tempo médio de geração no cenário médio inferior a 2,0s no emulador `Pixel_10`;
11. [ ] Ausência total de funcionalidades de compartilhamento externo (Bloco C).

---

## 30. Proposta de Sequência de Implementação

1. **Etapa 1:** Instalação oficial de `expo-print` via `npx expo install expo-print`;
2. **Etapa 2:** Criação dos contratos da camada de aplicação (`src/application/interfaces/pdf-generator.interface.ts`);
3. **Etapa 3:** Implementação do conversor de dados puro (`src/application/mappers/orcamento-pdf.mapper.ts`) e testes unitários;
4. **Etapa 4:** Construção do template HTML5/CSS canônico (`src/infrastructure/templates/pdf/orcamento-html.template.ts`) e testes estruturais;
5. **Etapa 5:** Implementação do adaptador `ExpoPrintPdfGenerator` (`src/infrastructure/services/pdf/expo-print-pdf.generator.ts`);
6. **Etapa 6:** Implementação do caso de uso `GerarPdfOrcamentoUseCase` e testes com mocks e teste de mutação de catálogo (RN78);
7. **Etapa 7:** Integração na interface (`app/(app)/orcamentos/[id].tsx`) e serviço de visualização `ACTION_VIEW`;
8. **Etapa 8:** Execução e aprovação de todos os testes automatizados da aplicação;
9. **Etapa 9:** Validação empírica no emulador Android `Pixel_10` (medição de tempo e inspeção visual);
10. **Etapa 10:** Elaboração do Relatório de Implementação do Bloco B para auditoria técnica.

---

STATUS:
PLANEJAMENTO REVISADO — BLOCO B v1.1 — AGUARDANDO NOVA AUDITORIA
