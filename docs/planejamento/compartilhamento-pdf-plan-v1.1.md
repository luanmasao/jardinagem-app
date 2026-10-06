# Planejamento Técnico — Bloco C v1.1
## Compartilhamento Nativo de PDF de Orçamentos

**Projeto:** Sistema de Orçamento para Jardinagem (Android / React Native / Expo SDK 57)  
**Data:** 05 de Outubro de 2026  
**Responsável:** Arquiteto de Software e Planejador Técnico  
**Versão do Documento:** 1.1 (Revisão Pós-Auditoria)  
**Origem da Revisão:** Correção integral dos apontamentos do Parecer de Auditoria Técnica Independente v1.0 (`docs/planejamento/compartilhamento-pdf-plan-audit-v1.0.md`)  
**Status do Bloco Anterior (Bloco B):** AUDITADO E HOMOLOGADO (`CONGELADO`)  
**Declaração Oficial:** `PLANEJAMENTO REVISADO — BLOCO C v1.1 — AGUARDANDO NOVA AUDITORIA`

---

## 1. Controle de Versão

| Versão | Data | Autor / Função | Descrição das Modificações | Situação do Documento |
| :---: | :---: | :--- | :--- | :--- |
| **1.0** | 05/10/2026 | Arquiteto de Software e Planejador Técnico | Elaboração inicial do planejamento do Bloco C. Submetido ao gate de auditoria independente. | `REPROVADO PARA CORREÇÃO` |
| **1.1** | 05/10/2026 | Arquiteto de Software e Planejador Técnico | Revisão arquitetural e documental completa sanando os 9 achados da auditoria v1.0: (1) Redesenho da máquina de estados e contratos para o comportamento real do Android/`expo-sharing` (resolução sem distinção de cancelamento/conclusão); (2) Correção do FileProvider para `SharingFileProvider` e authority `com.jardinagem.app.SharingFileProvider`; (3) Criação de etapa de infraestrutura para preparação e sanitização do nome do arquivo (`Orcamento_<numero>.pdf`); (4) Eliminação do acoplamento da camada de Aplicação com `expo-file-system`; (5) Reclassificação de decisões para "Propostas / Planejadas"; (6) Fixação da dependência em `"expo-sharing": "~57.0.20"`; (7) Correção do mecanismo de permissão para `grantUriPermission()`; (8) Padronização do alvo para Android 17 (API 37); (9) Ajuste da terminologia de integridade ("conteúdo-consistente / visualmente e financeiramente idêntico" em caso de regeneração). | `AGUARDANDO NOVA AUDITORIA` |

---

## 2. Sumário Executivo da Revisão v1.1

O presente documento constitui a revisão formal (v1.1) do planejamento técnico para o **Bloco C (Compartilhamento Nativo de PDF de Orçamentos)**.

A versão v1.0 foi submetida à auditoria técnica independente e recebeu o veredito **`REPROVADO PARA CORREÇÃO`** fundamentado em 9 apontamentos técnicos (1 CRÍTICO, 4 MAJOR, 3 MINOR, 1 OBSERVAÇÃO), registrados em `docs/planejamento/compartilhamento-pdf-plan-audit-v1.0.md`.

Esta revisão v1.1 reestrutura minuciosamente o planejamento, alinhando rigorosamente:
1. **Comportamento Nativo Real do Android e `expo-sharing`:** Elimina a falsa premissa de que a API lança exceção em cancelamentos ou informa se o usuário concluiu a partilha. Redesenha a máquina de estados para refletir a garantia real: abertura do diálogo do sistema e retorno fluido ao aplicativo sem afirmações enganosas de entrega;
2. **Infraestrutura e Nomenclatura Canônica:** Cria uma etapa controlada na camada de Infraestrutura para preparar o arquivo temporário sob a nomenclatura institucional padronizada (`Orcamento_<numero>.pdf`), resolvendo a limitação de apps receptores (WhatsApp, Gmail) sem alterar o gerador homologado do Bloco B;
3. **Pureza Arquitetural (Clean Architecture):** Remove qualquer importação de SDKs nativos (`expo-file-system`) da camada de Aplicação, encapsulando as checagens e manipulações de arquivo na Infraestrutura através da porta `ShareProvider`;
4. **Segurança de FileProvider e Permissões:** Corrige formalmente a autoridade para `com.jardinagem.app.SharingFileProvider` e documenta o mecanismo real de concessão transitiva por pacote (`grantUriPermission`);
5. **Governança Estrita:** Reclassifica as decisões como propostas/planejadas, fixa a dependência oficial (`~57.0.20`) e mantém **zero migrations, zero alterações de banco e zero alterações no Bloco B congelado**.

---

## 3. Objetivo

Planejar arquiteturalmente e detalhar tecnicamente a implementação do **Bloco C (Compartilhamento Nativo de PDF)**, capacitando o usuário a transmitir externamente o documento PDF da proposta comercial de jardinagem através dos mecanismos e aplicativos disponíveis no dispositivo Android (WhatsApp, E-mail, Google Drive, Bluetooth, etc.), em estrita consonância com os requisitos canônicos **RF82**, **RN81** e a parcela de feedback de **RNF03**.

Princípios fundamentais preservados:
1. **Segregação Estrita e Imutabilidade do Bloco B:** O Bloco B está formalmente homologado e **CONGELADO**. O Bloco C atua exclusivamente como consumidor do artefato PDF gerado pelo Bloco B, sendo terminantemente vedada qualquer alteração no gerador, templates, mappers ou visualizador local;
2. **Clean Architecture em 4 Camadas:** O mecanismo de compartilhamento nativo reside exclusivamente na camada de Infraestrutura, isolado por contrato abstrato (`ShareProvider`) consumido pela camada de Aplicação;
3. **Segurança e Minimização de Privilégios:** O arquivo PDF é compartilhado por meio de Content URI protegida (`content://`) emitida pelo `SharingFileProvider`, concedendo apenas permissão temporária de leitura (`FLAG_GRANT_READ_URI_PERMISSION`) via `grantUriPermission()`, sem exposição de `file://` e sem elevação de privilégios;
4. **Governança Estrita:** **Nenhum código de implementação será escrito, nenhuma dependência instalada e nenhuma migration criada** durante esta fase de planejamento.

---

## 4. Escopo

### 4.1. O que ESTÁ no Escopo do Bloco C
- Definição do contrato da abstração `ShareProvider` na camada de Aplicação (`src/application/interfaces/share-provider.interface.ts`);
- Planejamento do caso de uso `CompartilharPdfOrcamentoUseCase` na camada de Aplicação (`src/application/use-cases/orcamento/compartilhar-pdf-orcamento.use-case.ts`), 100% puro e sem imports de bibliotecas Expo;
- Planejamento do adaptador concreto `ExpoSharingShareProvider` na camada de Infraestrutura (`src/infrastructure/services/share/expo-sharing.provider.ts`), utilizando a biblioteca oficial `expo-sharing` e gerenciando a preparação de arquivo canônico;
- Planejamento do hook de apresentação `useCompartilharPdf` para gestão de estado reativo, prevenção de duplo clique e feedback operacional alinhado a RNF03;
- Integração da ação de compartilhamento ("Compartilhar") na interface da tela de detalhes do orçamento (`app/(app)/orcamentos/[id].tsx`);
- Tratamento de fluxos operacionais: retorno normal da Share Sheet, ausência de aplicativos de destino compatíveis e expiração/regeneração de arquivo;
- Planejamento de suíte completa de testes automatizados unitários e de integração desacoplados do runtime nativo;
- Roteiro de validação empírica nativa no emulador Android oficial (`Pixel_10` / Android 17 / API 37).

### 4.2. O que NÃO ESTÁ no Escopo do Bloco C (Limites Rígidos)
- **NÃO alterar o Bloco B:** Nenhuma linha de `ExpoPrintPdfGenerator`, `orcamento-html.template.ts`, `orcamento-pdf.mapper.ts` ou `AndroidPdfViewerService` será modificada;
- **NÃO recriar o PDF:** O Bloco C não possui template próprio, não compila HTML e não altera o layout nem os valores monetários calculados;
- **NÃO implementar a Rotina de Expiração Automática (RF67 / RN69):** A expiração temporal de orçamentos permanece estritamente fora do escopo deste bloco;
- **NÃO criar migrations nem alterar banco:** Zero alterações no schema PostgreSQL, zero migrations e zero impacto nas políticas de RLS;
- **NÃO implementar backend de mensageria própria ou upload em nuvem:** O compartilhamento utiliza exclusivamente os aplicativos locais instalados no sistema operacional móvel do usuário;
- **NÃO instalar dependências ou executar código nesta etapa:** O gate de implementação depende de prévia auditoria e homologação deste plano v1.1.

---

## 5. Requisitos Cobertos e Análise Crítica

### 5.1. Requisito Funcional: RF82
> *"O sistema deve permitir compartilhar o PDF utilizando os mecanismos de compartilhamento disponíveis no dispositivo."*

- **Análise Canônica:** O sistema deve disparar a folha de compartilhamento nativa (Share Sheet) do Android contendo a referência ao arquivo PDF da proposta comercial, permitindo que o usuário selecione qualquer aplicativo compatível instalado.
- **Atendimento no Bloco C:** Invocação de `Sharing.shareAsync` via `ExpoSharingShareProvider`, disparando o `Intent.ACTION_SEND` envolvido por `Intent.createChooser`.

### 5.2. Regra de Negócio: RN81
> *"O PDF deve poder ser compartilhado por meio dos mecanismos disponíveis no dispositivo."*

- **Análise Canônica:** A proposta comercial em formato PDF deve ser entregue aos canais externos suportados pelo dispositivo, garantindo que o documento compartilhado seja íntegro, reflita os dados do orçamento e apresente o nome institucional padronizado (`Orcamento_<numero>.pdf`).
- **Atendimento no Bloco C:** Consumo do PDF gerado pelo Bloco B, preparação de cópia temporária com nome canônico na camada de Infraestrutura e transmissão via Content URI protegida.

### 5.3. Requisito Não-Funcional: RNF03 (Parcela de Compartilhamento)
> *"O sistema deve fornecer feedback adequado após operações relevantes, como salvamento, alteração de dados, cálculo de área, cálculo do orçamento, geração de PDF e compartilhamento."*

- **Análise Canônica e Esclarecimento de Limites de Plataforma (Auditado):**
  - **O que o aplicativo CONSEGUE comprovar:**
    1. Se o dispositivo possui suporte a compartilhamento (`isAvailable`);
    2. O início da preparação (desabilitar botões contra duplo clique, exibir spinner no botão);
    3. A abertura da Share Sheet do sistema;
    4. O fechamento da Share Sheet e retorno do controle à Activity da aplicação;
    5. Erros técnicos ao tentar ler o arquivo ou invocar a Intent.
  - **O que o aplicativo NÃO CONSEGUE comprovar no Android moderno (Fato Técnico comprovado pelo código-fonte de `SharingModule.kt`):**
    O Android e a biblioteca `expo-sharing` **não fornecem callback de confirmação de entrega nem diferenciam se o usuário tocou em um aplicativo (ex: WhatsApp) ou tocou fora/apertou Back para cancelar a Share Sheet**. Em ambos os casos, a Promise é resolvida com sucesso (`null`).
  - **Atendimento Realista a RNF03:**
    A máquina de estados e o feedback não devem emitir falsas mensagens de "Enviado com sucesso" nem tentar capturar cancelamento via exceção inexistente. O retorno da Share Sheet restaura suavemente a interface ao estado ocioso (`idle`), habilitando novamente os controles. Caso ocorra erro técnico antes do disparo ou o dispositivo não tenha apps compatíveis, mensagens claras e específicas são exibidas ao usuário.

---

## 6. Fontes Canônicas

1. **Parecer de Auditoria Técnica Independente Bloco C v1.0:** `docs/planejamento/compartilhamento-pdf-plan-audit-v1.0.md` (Documento que reprovou a v1.0 e estabeleceu as 9 correções obrigatórias);
2. **Inventário Oficial de Cobertura v1.1:** `docs/planejamento/requisitos-cobertura-status-v1.1.md`;
3. **Requisitos Funcionais v2, Regras de Negócio v3 e Requisitos Não-Funcionais v2;**
4. **Arquitetura Técnica v1.1:** `docs/arquitetura/arquitetura-tecnica-v1.1.md` (Padrão 4 camadas: Presentation, Application, Domain, Infrastructure);
5. **Parecer de Homologação da Implementação do Bloco B:** `docs/relatorios/pdf-orcamentos-implementation-audit-v1.0.md`;
6. **Relatório de Implementação do Bloco B:** `docs/relatorios/pdf-orcamentos-implementation-v1.0.md`;
7. **Planejamento Técnico do Bloco B v1.1:** `docs/planejamento/pdf-orcamentos-plan-v1.1.md`;
8. **Estratégia de Segurança e RLS v1.6:** `docs/relatorios/auth-rls-strategy-v1.6.md`;
9. **Modelo Físico PostgreSQL / PostGIS v1.1:** `docs/banco/modelo-fisico-v1.1.md`;
10. **Código-fonte Nativo do Expo SDK 57:** `expo-sharing@57.0.20` (`SharingModule.kt`, `AndroidManifest.xml` e `Sharing.types.d.ts`).

---

## 7. Análise da Arquitetura do Sistema e Limites Operacionais do Android

A auditoria técnica da versão v1.0 fundamentou-se na análise estática e de código nativo do ecossistema Android 17 (API 37) e Expo SDK 57. As seguintes realidades técnicas orientam esta revisão:

### 7.1. Diagnóstico do `expo-sharing` no Android 17 (API 37)
- **Biblioteca Oficial:** `expo-sharing` versão `~57.0.20` (especificada em `node_modules/expo/bundledNativeModules.json` para Expo SDK 57.0.23);
- **Assinatura Real da API:**
  ```ts
  Sharing.isAvailableAsync(): Promise<boolean>;
  Sharing.shareAsync(url: string, options?: SharingOptions): Promise<void>;
  ```
- **Opções Suportadas (`SharingOptions`):**
  - `mimeType?: string` (utilizado como `'application/pdf'`);
  - `dialogTitle?: string` (título no topo do Chooser Android);
  - `UTI?: string` (específico para iOS, opcional);
  - `anchor?: object` (específico para iPad, opcional).
  - *Constatação Crítica:* **Não existe opção `nomeArquivo`** na assinatura oficial do Expo.

### 7.2. Ciclo de Vida da Share Sheet e Resolução da Promise
No código-fonte nativo de `SharingModule.kt`:
```kotlin
OnActivityResult { _, (requestCode) ->
  if (requestCode == REQUEST_CODE && pendingPromise != null) {
    pendingPromise?.resolve(null)
    pendingPromise = null
  }
}
```
- O módulo registra um callback de Activity (`OnActivityResult`) que escuta o retorno do Chooser do sistema (`Intent.createChooser`);
- Quando o usuário encerra o diálogo nativo (seja selecionando um aplicativo destinatário ou tocando fora / pressionando Back), o Android dispara `onActivityResult`;
- O módulo **não avalia se o resultado foi `Activity.RESULT_OK` ou `Activity.RESULT_CANCELED`**: ele invoca incondicionalmente `pendingPromise?.resolve(null)`;
- **Conclusão Técnica Mandatória:** A Promise retornada por `Sharing.shareAsync()` **sempre resolve com sucesso (`void / undefined`)** quando a Share Sheet é fechada normalmente. Ela **NUNCA** lança erros contendo strings como `"dismissed"`, `"canceled"`, `"cancelled"` ou `"User did not share"`.
- Portanto, qualquer tentativa de mapear cancelamento por meio de bloco `catch` é código morto e decorre de premissa falsa sobre a plataforma.

### 7.3. O Problema da Nomenclatura de Arquivos e a Solução de Infraestrutura
- O Bloco B gera o PDF através do motor `expo-print` (`Print.printToFileAsync`), que grava o arquivo físico no cache com um hash interno aleatório:
  `file:///data/user/0/com.jardinagem.app/cache/Print/3b4d2f8e-1234-4a5b-bcde-9876543210ab.pdf`
- No Android, os aplicativos de destino (como WhatsApp, Gmail, Google Drive) extraem o nome do anexo diretamente da URI de conteúdo ou da coluna `OpenableColumns.DISPLAY_NAME` do FileProvider, que espelha o nome do arquivo gravado no disco;
- Se a URI de cache do Bloco B for repassada diretamente ao `expo-sharing`, o arquivo recebido no WhatsApp exibirá o nome feio e ilegível `3b4d2f8e-1234-4a5b-bcde-9876543210ab.pdf`;
- **Solução Arquitetural de Infraestrutura:**
  A camada de Infraestrutura (`ExpoSharingShareProvider`), antes de invocar `Sharing.shareAsync`, realiza a preparação de uma cópia temporária do arquivo no diretório de cache, atribuindo o nome canônico sanitizado:
  `cacheDirectory + 'Orcamento_' + sanitizar(numero) + '.pdf'` (ex: `Orcamento_ORC-2026-001.pdf`).
  Essa operação:
  1. É estritamente de sistema de arquivos (cópia rápida);
  2. Não invoca o gerador do Bloco B;
  3. Não compila HTML nem altera dados financeiros;
  4. Sobrescreve deterministicamente qualquer arquivo anterior com mesmo nome para garantir atualização;
  5. Garante que os aplicativos receptores apresentem o nome institucional correto.

---

## 8. Análise Arquitetural de Camadas e Desacoplamento (Clean Architecture)

### 8.1. Diagnóstico da Violação em v1.0
Na versão v1.0, o caso de uso `CompartilharPdfOrcamentoUseCase` importava diretamente:
`import * as FileSystem from 'expo-file-system/legacy';`
Essa importação quebrava a regra de dependência da Clean Architecture: a camada de Aplicação conhecia detalhes de infraestrutura do Expo SDK.

### 8.2. Avaliação de Alternativas de Abstração

| Abordagem | Descrição | Prós | Contras | Veredito |
| :--- | :--- | :--- | :--- | :---: |
| **Alternativa A: Porta Única `ShareProvider` com Capacidade de Arquivo** | Adicionar à interface `ShareProvider` o método `verificarArquivoExiste(fileUri: string): Promise<boolean>` e delegar a preparação do nome para o método `share(...)`. | Alta coesão, zero proliferação de interfaces, a Application não conhece arquivos físicos e o provider encapsula todas as idiossincrasias de compartilhamento móvel. | Agrupa verificação de cache e disparo de intent no mesmo provedor. | **RECOMENDADA** |
| **Alternativa B: Criação de `FileStorageProvider` Separado** | Criar interface `FileStorageProvider` com `arquivoExiste()` e `prepararArquivo()`. | Segregação estrita de interface (ISP). | Adiciona uma segunda porta e um segundo adaptador para uma operação trivial de 3 linhas de verificação de cache. | Viável, porém adiciona complexidade desnecessária |
| **Alternativa C: Uso de Módulo Nativo Customizado** | Criar código Java/Kotlin para contornar o Expo. | Controle total de Activity. | Violação de diretriz de simplicidade, alto custo de manutenção e risco de quebra de build. | Rejeitada |

### 8.3. Decisão da Porta de Infraestrutura (Alternativa A Adotada)
A abstração `ShareProvider` é a porta oficial de infraestrutura para o subsistema de compartilhamento.
Ela expõe:
1. `isAvailable(): Promise<boolean>` — checagem de suporte;
2. `verificarArquivoExiste(fileUri: string): Promise<boolean>` — checagem segura de persistência no cache;
3. `share(params: CompartilharArquivoParams): Promise<ResultadoCompartilhamento>` — preparação do arquivo canônico e abertura da Share Sheet.

Com isso:
- A camada de **Aplicação** (`CompartilharPdfOrcamentoUseCase`) permanece **100% pura**: depende unicamente de interfaces (`ShareProvider`, `GerarPdfOrcamentoUseCase`, `OrcamentoRepository`, `AuthService`);
- A camada de **Infraestrutura** (`ExpoSharingShareProvider`) absorve o uso de `expo-sharing` e `expo-file-system`.

---

## 9. Decisões Técnicas Propostas / Planejadas

Em conformidade estrita com a governança do projeto, todas as decisões abaixo são registradas como **Propostas / Planejadas**, sujeitas à auditoria e homologação:

- **DECISÃO-SHARE-01 (Mecanismo Concreto Planejado):** Adotar formalmente a biblioteca oficial `expo-sharing`, especificando a versão vinculada ao Expo SDK 57 (`~57.0.20`), com instalação planejada para a etapa de implementação via `npx expo install expo-sharing`.
- **DECISÃO-SHARE-02 (Isolamento de Contrato em Aplicação):** Declarar a interface `ShareProvider` na camada de Aplicação (`src/application/interfaces/share-provider.interface.ts`), contendo métodos de disponibilidade, verificação de arquivo e compartilhamento.
- **DECISÃO-SHARE-03 (Implementação em Infraestrutura com Preparação de Nome):** Implementar o adaptador `ExpoSharingShareProvider` em `src/infrastructure/services/share/expo-sharing.provider.ts`, responsável por sanitizar o nome, copiar o arquivo temporário para `Orcamento_<numero>.pdf` no cache e invocar `Sharing.shareAsync`.
- **DECISÃO-SHARE-04 (Caso de Uso Puro e Atômico):** Criar `CompartilharPdfOrcamentoUseCase` sem qualquer importação de SDKs móveis (`expo-*`), orquestrando autenticação, autorização de tenant, verificação de cache e acionamento do provedor.
- **DECISÃO-SHARE-05 (Reutilização de Arquivo do Bloco B):** O Bloco C consumirá estritamente o arquivo PDF gerado pelo `GerarPdfOrcamentoUseCase` do Bloco B. Nenhuma rotina paralela de compilação ou novo template será criado.
- **DECISÃO-SHARE-06 (Política de Cache e Regeneração Transparente):**
  - **Cenário A (Arquivo em Cache Existente):** Reutiliza a instância física já existente (garantindo arquivo **byte-idêntico**);
  - **Cenário B (Cache Inexistente ou Limpo):** Invoca deterministicamente o `GerarPdfOrcamentoUseCase` homologado do Bloco B, regenerando o documento (gerando documento **conteúdo-consistente / visualmente e financeiramente idêntico**).
- **DECISÃO-SHARE-07 (FileProvider Oficial e Concessão Transitiva):** Documentar o uso do `expo.modules.sharing.SharingFileProvider` com autoridade `com.jardinagem.app.SharingFileProvider`, cujas permissões de leitura são concedidas por pacote através de `context.grantUriPermission(packageName, contentUri, Intent.FLAG_GRANT_READ_URI_PERMISSION)`.
- **DECISÃO-SHARE-08 (Modelo Realista de Retorno de Share Sheet):** Abandonar a premissa de detecção de cancelamento. O retorno da Share Sheet é modelado como status `'DISPARADO'`, significando que a folha nativa foi aberta e o controle retornou ao app, restaurando a interface sem toasts ou mensagens enganosas.
- **DECISÃO-SHARE-09 (Feedback de Interface RNF03 e Proteção contra Duplo Clique):** O hook `useCompartilharPdf` fornecerá controle reativo de estado (`isSharing`), bloqueando interações concorrentes no botão e exibindo `ActivityIndicator` durante a preparação do envio.
- **DECISÃO-SHARE-10 (Congelamento Rígido de Módulos Homologados):** Manter o Bloco B, Catálogo, Clientes, Áreas e Orçamentos estritamente congelados. O Bloco C terá impacto zero sobre o banco de dados (zero migrations e zero alterações em RLS).

---

## 10. Especificação dos Contratos da Camada de Aplicação

### 10.1. Arquivo de Contrato: `src/application/interfaces/share-provider.interface.ts`

```ts
/**
 * Parâmetros para a operação de compartilhamento nativo de arquivo.
 */
export interface CompartilharArquivoParams {
  /** URI do arquivo local gerado (esquema file://) */
  fileUri: string;
  /** Tipo MIME do arquivo (obrigatório: 'application/pdf') */
  mimeType: string;
  /** Título exibido na barra superior do diálogo Chooser do Android */
  dialogTitle: string;
  /** Nome institucional sugerido para o arquivo ao ser compartilhado (ex: 'Orcamento_ORC-2026-001.pdf') */
  nomeArquivo: string;
}

/**
 * Status do resultado da operação de compartilhamento:
 * - 'DISPARADO': A Share Sheet nativa foi aberta com sucesso e o usuário encerrou o diálogo (selecionando um app ou fechando a folha);
 * - 'INDISPONIVEL': O dispositivo não possui capacidade técnica ou apps compatíveis para compartilhar arquivos;
 * - 'ERRO': Falha técnica antes ou durante a invocação da Intent nativa.
 */
export type StatusCompartilhamento = 'DISPARADO' | 'INDISPONIVEL' | 'ERRO';

/**
 * Resposta padronizada da porta de compartilhamento.
 */
export interface ResultadoCompartilhamento {
  sucesso: boolean;
  status: StatusCompartilhamento;
  mensagem?: string;
}

/**
 * Porta de Infraestrutura para serviços de compartilhamento e validação de arquivos locais de compartilhamento.
 */
export interface ShareProvider {
  /**
   * Verifica se o dispositivo possui suporte a compartilhamento de arquivos.
   */
  isAvailable(): Promise<boolean>;

  /**
   * Verifica se o arquivo local na URI informada existe fisicamente no armazenamento.
   * Permite que o Use Case avalie o cache sem importar SDKs nativos.
   * @param fileUri URI local no formato file://
   */
  verificarArquivoExiste(fileUri: string): Promise<boolean>;

  /**
   * Prepara o arquivo com o nome institucional correto e abre a Share Sheet do sistema.
   * @param params Metadados e caminho do arquivo
   */
  share(params: CompartilharArquivoParams): Promise<ResultadoCompartilhamento>;
}
```

---

## 11. Especificação do Caso de Uso `CompartilharPdfOrcamentoUseCase`

### 11.1. Arquivo: `src/application/use-cases/orcamento/compartilhar-pdf-orcamento.use-case.ts`

O caso de uso atua como orquestrador puro na camada de Aplicação, sem acoplamento ao Expo:

```ts
import { ShareProvider, ResultadoCompartilhamento } from '../../interfaces/share-provider.interface';
import { GerarPdfOrcamentoUseCase } from './gerar-pdf-orcamento.use-case';
import { OrcamentoRepository } from '../../../domain/repositories/orcamento.repository.interface';
import { AuthService } from '../../services/auth.service';

export interface CompartilharPdfOrcamentoInput {
  orcamentoId: string;
  usuarioId: string;
  fileUriExistente?: string;
}

export class CompartilharPdfOrcamentoUseCase {
  constructor(
    private readonly shareProvider: ShareProvider,
    private readonly gerarPdfUseCase: GerarPdfOrcamentoUseCase,
    private readonly orcamentoRepository: OrcamentoRepository,
    private readonly authService: AuthService
  ) {}

  async execute(input: CompartilharPdfOrcamentoInput): Promise<ResultadoCompartilhamento> {
    // 1. Validação de autenticação
    const usuarioAtual = await this.authService.getCurrentUser();
    if (!usuarioAtual || usuarioAtual.id !== input.usuarioId) {
      return {
        sucesso: false,
        status: 'ERRO',
        mensagem: 'Acesso não autorizado. Usuário não autenticado.',
      };
    }

    // 2. Validação da existência e titularidade do orçamento (Tenant Isolation)
    const orcamento = await this.orcamentoRepository.obterPorId(input.orcamentoId);
    if (!orcamento || orcamento.usuarioId !== usuarioAtual.id) {
      return {
        sucesso: false,
        status: 'ERRO',
        mensagem: 'Orçamento não encontrado ou não pertencente ao usuário.',
      };
    }

    // 3. Sanitização e definição do nome institucional do arquivo
    const numeroSanitizado = (orcamento.numero || 'SEM_NUMERO').replace(/[^a-zA-Z0-9_-]/g, '_');
    const nomeArquivo = `Orcamento_${numeroSanitizado}.pdf`;

    let uriParaCompartilhar = input.fileUriExistente;

    // 4. Validação de segurança da URI informada (evita injeção de arquivos arbitrários)
    let arquivoExiste = false;
    if (uriParaCompartilhar && typeof uriParaCompartilhar === 'string' && uriParaCompartilhar.trim() !== '') {
      // Exige que a URI comece com file:// e termine com .pdf
      if (uriParaCompartilhar.startsWith('file://') && uriParaCompartilhar.endsWith('.pdf')) {
        arquivoExiste = await this.shareProvider.verificarArquivoExiste(uriParaCompartilhar);
      }
    }

    // 5. Regeneração transparente via Bloco B caso o arquivo não exista no cache
    if (!arquivoExiste) {
      try {
        const resultadoGeracao = await this.gerarPdfUseCase.execute({
          orcamentoId: input.orcamentoId,
          usuarioId: usuarioAtual.id,
        });
        uriParaCompartilhar = resultadoGeracao.uri;
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        return {
          sucesso: false,
          status: 'ERRO',
          mensagem: `Falha ao gerar o documento PDF para compartilhamento: ${msg}`,
        };
      }
    }

    // 6. Invocação da porta de compartilhamento nativo
    return await this.shareProvider.share({
      fileUri: uriParaCompartilhar,
      mimeType: 'application/pdf',
      dialogTitle: `Compartilhar Orçamento #${orcamento.numero}`,
      nomeArquivo,
    });
  }
}
```

### 11.2. Segurança e Validação de Origem
- **Tenant Isolation:** O caso de uso valida se `orcamento.usuarioId === usuarioAtual.id`. Se houver divergência, a operação é rejeitada imediatamente com status `'ERRO'`;
- **Proteção contra Injeção de Arquivos Arbitrários:** O use case não aceita qualquer string como `fileUriExistente`. Ele exige o prefixo `file://`, a extensão `.pdf` e submete o caminho ao método `verificarArquivoExiste` do provedor. Se a validação falhar, o caso de uso descarta a URI externa e aciona a geração controlada pelo `GerarPdfOrcamentoUseCase`.

---

## 12. Especificação do Adaptador de Infraestrutura `ExpoSharingShareProvider`

### 12.1. Arquivo: `src/infrastructure/services/share/expo-sharing.provider.ts`

```ts
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import {
  ShareProvider,
  CompartilharArquivoParams,
  ResultadoCompartilhamento,
} from '../../../application/interfaces/share-provider.interface';

export class ExpoSharingShareProvider implements ShareProvider {
  async isAvailable(): Promise<boolean> {
    try {
      return await Sharing.isAvailableAsync();
    } catch {
      return false;
    }
  }

  async verificarArquivoExiste(fileUri: string): Promise<boolean> {
    try {
      if (!fileUri || !fileUri.startsWith('file://')) {
        return false;
      }
      const info = await FileSystem.getInfoAsync(fileUri);
      return info.exists;
    } catch {
      return false;
    }
  }

  async share(params: CompartilharArquivoParams): Promise<ResultadoCompartilhamento> {
    try {
      // 1. Checagem prévia de disponibilidade
      const disponivel = await this.isAvailable();
      if (!disponivel) {
        return {
          sucesso: false,
          status: 'INDISPONIVEL',
          mensagem: 'O compartilhamento de arquivos não está disponível neste dispositivo.',
        };
      }

      // 2. Verificação de integridade do arquivo fonte
      const arquivoExiste = await this.verificarArquivoExiste(params.fileUri);
      if (!arquivoExiste) {
        return {
          sucesso: false,
          status: 'ERRO',
          mensagem: 'Arquivo PDF não encontrado para compartilhamento.',
        };
      }

      // 3. Preparação do arquivo com nome institucional canônico (ACHADO-SHARE-03)
      // Converte 'Print/<hash>.pdf' em 'Orcamento_<numero>.pdf' no cache
      let uriFinalParaCompartilhar = params.fileUri;
      if (params.nomeArquivo && params.nomeArquivo.trim() !== '') {
        const cacheDir = FileSystem.cacheDirectory;
        if (cacheDir) {
          const caminhoDestino = `${cacheDir}${params.nomeArquivo}`;
          try {
            // Copia o arquivo para o destino canônico (sobrescrevendo se já existir)
            await FileSystem.copyAsync({
              from: params.fileUri,
              to: caminhoDestino,
            });
            uriFinalParaCompartilhar = caminhoDestino;
          } catch {
            // Em caso de falha na cópia, mantém a URI original como fallback seguro
            uriFinalParaCompartilhar = params.fileUri;
          }
        }
      }

      // 4. Invocação da Share Sheet nativa via expo-sharing
      await Sharing.shareAsync(uriFinalParaCompartilhar, {
        mimeType: params.mimeType,
        dialogTitle: params.dialogTitle,
        UTI: 'com.adobe.pdf',
      });

      // 5. Retorno normal do diálogo nativo (ACHADO-SHARE-01)
      // No Android, a Promise resolve quando o diálogo é encerrado (compartilhado ou fechado).
      return {
        sucesso: true,
        status: 'DISPARADO',
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      return {
        sucesso: false,
        status: 'ERRO',
        mensagem: `Falha ao acionar o compartilhamento nativo: ${msg}`,
      };
    }
  }
}

export const expoSharingShareProvider = new ExpoSharingShareProvider();
```

### 12.2. Detalhamento do FileProvider e Concessão de Permissões Android
- **FileProvider Real Utilizado:** `expo.modules.sharing.SharingFileProvider`;
- **Authority Oficial Registrada:** `com.jardinagem.app.SharingFileProvider` (definida genericamente na biblioteca como `${applicationId}.SharingFileProvider`);
- **Configuração no AndroidManifest (da AAR `expo-sharing`):**
  ```xml
  <provider
      android:name=".SharingFileProvider"
      android:authorities="${applicationId}.SharingFileProvider"
      android:exported="false"
      android:grantUriPermissions="true">
      <meta-data
          android:name="android.support.FILE_PROVIDER_PATHS"
          android:resource="@xml/sharing_provider_paths"/>
  </provider>
  ```
- **Mecanismo de Concessão de Permissão (Verificado no Código Nativo):**
  O módulo não utiliza `ClipData.newUri()`. Ele utiliza o mecanismo do Android `grantUriPermission()` por pacote elegível:
  ```kotlin
  val resInfoList = context.packageManager.queryIntentActivities(intent, PackageManager.MATCH_DEFAULT_ONLY)
  resInfoList.forEach {
      val packageName = it.activityInfo.packageName
      context.grantUriPermission(packageName, contentUri, Intent.FLAG_GRANT_READ_URI_PERMISSION)
  }
  ```
  Isso garante que apenas aplicativos receptores com capacidade para tratar `application/pdf` recebam permissão temporária de leitura da Content URI, sem permissões de gravação.

---

## 13. Rastreabilidade da Integridade do Documento

A integridade do documento compartilhado em relação ao documento gerado pelo Bloco B é assegurada sob duas categorias técnicas precisas:

### 13.1. Reutilização de Cache (Cenário A: "Byte-Idêntico")
- Ocorre quando o usuário visualizou o PDF na mesma sessão e o arquivo `Print/<hash>.pdf` ainda se encontra íntegro no cache;
- O caso de uso detecta sua existência física e aciona a cópia rápida para `Orcamento_<numero>.pdf`;
- **Garantia de Integridade:** O arquivo é **byte-idêntico** àquele inspecionado visualmente, possuindo exatamente o mesmo conteúdo binário.

### 13.2. Regeneração Transparente (Cenário B: "Conteúdo-Consistente")
- Ocorre quando o arquivo foi expurgado pelo sistema operacional ou o usuário acionou "Compartilhar" diretamente;
- O `GerarPdfOrcamentoUseCase` do Bloco B é invocado deterministicamente;
- **Garantia de Integridade:** Como o motor de impressão emite novos metadados de criação e timestamps internos no stream binário do PDF, duas emissões independentes diferem em nível de hash binário. Todavia, o documento é **conteúdo-consistente, visualmente idêntico e financeiramente idêntico**, pois:
  1. Utiliza os mesmos snapshots imutáveis do orçamento gravados no banco;
  2. Executa o mesmo mapper homologado (`orcamento-pdf.mapper.ts`);
  3. Renderiza o mesmo template CSS/HTML homologado (`orcamento-html.template.ts`);
  4. Preserva integralmente tabelas de itens, áreas medidas, subtotais, descontos e total geral.

*Nota de Desempenho:* Alegações arbitrárias de tempo ("< 200 ms") foram removidas deste planejamento. O tempo de resposta para o Cenário A corresponde a uma cópia local de arquivo (< poucas dezenas de milissegundos), enquanto o Cenário B requer o tempo padrão de compilação do Bloco B (~1 a 2 segundos).

---

## 14. Especificação de RNF03 e Máquina de Estados da Interface

### 14.1. Nova Máquina de Estados Realista

Para não prometer estados que o sistema operacional Android não consegue reportar, a máquina de estados da operação de compartilhamento foi redesenhada:

```
                  ┌──────────────┐
                  │     idle     │ ◄────────────────────────┐
                  └──────┬───────┘                          │
                         │ [Usuário clica em "Compartilhar"]│
                         ▼                                  │
                  ┌──────────────┐                          │
                  │  preparing   │                          │
                  └──────┬───────┘                          │
                         │ [Disparo de shareAsync]          │
                         ▼                                  │
                  ┌──────────────┐                          │
                  │   sharing    │ (Share Sheet em exibição)│
                  └──────┬───────┘                          │
                         │                                  │
        ┌────────────────┼────────────────┐                 │
        ▼                ▼                ▼                 │
[Promise Resolve]  [isAvailable=false] [Promise Rejeita]    │
 (Disparado/Volta)       │                │                 │
        │                ▼                ▼                 │
        │         ┌─────────────┐  ┌─────────────┐          │
        │         │ unavailable │  │    error    │          │
        │         └──────┬──────┘  └──────┬──────┘          │
        │                │                │                 │
        │         (Alert amigável)  (Alert de erro)         │
        │                │                │                 │
        └────────────────┴────────────────┴─────────────────┘
```

| Estado | Indicador Visual | Estado dos Botões | Mensagem / Ação |
| :--- | :--- | :--- | :--- |
| **`idle`** | Botão padrão "Compartilhar" (📤) | Habilitado | Estado de repouso, pronto para interação. |
| **`preparing`** | `ActivityIndicator` embutido | Desabilitado (previne duplo clique) | Texto do botão: *"Preparando..."*. Executa validações e cópia de arquivo. |
| **`sharing`** | Aguardando retorno da Activity nativa | Desabilitado | Diálogo nativo do Android com foco do usuário. |
| **`unavailable`** | Retorno ao botão normal | Habilitado | `Alert.alert('Compartilhamento Indisponível', 'Nenhum aplicativo compatível para compartilhamento de PDF foi localizado no dispositivo.')` |
| **`error`** | Retorno ao botão normal | Habilitado | `Alert.alert('Erro ao Compartilhar', 'Não foi possível acionar o compartilhamento. Tente novamente.')` |

**Comportamento no Retorno da Share Sheet:**
Quando a Share Sheet é fechada (seja pelo envio no WhatsApp ou por cancelamento/Back), a Promise resolve normalmente. O hook transiciona suavemente de `sharing` para `idle`.
**Não é exibido alerta enganoso de "Enviado com sucesso!" nem alerta indevido de "Erro".** Os botões voltam a ficar habilitados para nova ação.

### 14.2. Hook de Apresentação: `src/presentation/hooks/use-compartilhar-pdf.ts`

```ts
import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { CompartilharPdfOrcamentoUseCase } from '../../application/use-cases/orcamento/compartilhar-pdf-orcamento.use-case';
import { useAuth } from './use-auth';

export interface UseCompartilharPdfReturn {
  isSharing: boolean;
  compartilharPdf: (orcamentoId: string, fileUriExistente?: string) => Promise<boolean>;
}

export function useCompartilharPdf(
  compartilharPdfUseCase: CompartilharPdfOrcamentoUseCase
): UseCompartilharPdfReturn {
  const [isSharing, setIsSharing] = useState<boolean>(false);
  const { user } = useAuth();

  const compartilharPdf = useCallback(
    async (orcamentoId: string, fileUriExistente?: string): Promise<boolean> => {
      if (isSharing) return false;

      if (!user) {
        Alert.alert('Não autenticado', 'Você precisa estar conectado para compartilhar o orçamento.');
        return false;
      }

      setIsSharing(true);

      try {
        const resultado = await compartilharPdfUseCase.execute({
          orcamentoId,
          usuarioId: user.id,
          fileUriExistente,
        });

        if (!resultado.sucesso) {
          if (resultado.status === 'INDISPONIVEL') {
            Alert.alert(
              'Compartilhamento Indisponível',
              resultado.mensagem || 'Nenhum aplicativo compatível foi localizado no dispositivo.'
            );
          } else {
            Alert.alert(
              'Erro ao Compartilhar',
              resultado.mensagem || 'Não foi possível compartilhar a proposta.'
            );
          }
          return false;
        }

        // Sucesso na abertura e retorno da Share Sheet
        return true;
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        Alert.alert('Erro Inesperado', `Ocorreu uma falha ao tentar compartilhar: ${msg}`);
        return false;
      } finally {
        setIsSharing(false);
      }
    },
    [isSharing, user, compartilharPdfUseCase]
  );

  return { isSharing, compartilharPdf };
}
```

### 14.3. Integração na Tela de Orçamento (`app/(app)/orcamentos/[id].tsx`)

Na tela de detalhes do orçamento, o botão "Compartilhar" será inserido ao lado do botão existente "Visualizar PDF" (Bloco B):

```tsx
<View style={styles.pdfBotoesRow}>
  {/* Botão de Visualização (Bloco B - Homologado) */}
  <TouchableOpacity
    style={[styles.btnGerarPdf, isGeneratingPdf && styles.btnDesabilitado]}
    onPress={() => gerarEVisualizarPdf(orcamento.id)}
    disabled={isGeneratingPdf || isSharingPdf || isSaving}
    activeOpacity={0.8}
  >
    {isGeneratingPdf ? (
      <View style={styles.loadingRow}>
        <ActivityIndicator size="small" color="#FFFFFF" />
        <Text style={styles.btnGerarPdfText}>Abrindo...</Text>
      </View>
    ) : (
      <View style={styles.loadingRow}>
        <Text style={styles.btnGerarPdfIcon}>👁️</Text>
        <Text style={styles.btnGerarPdfText}>Visualizar PDF</Text>
      </View>
    )}
  </TouchableOpacity>

  {/* Botão de Compartilhamento (Bloco C - Proposto) */}
  <TouchableOpacity
    style={[styles.btnCompartilharPdf, isSharingPdf && styles.btnDesabilitado]}
    onPress={() => compartilharPdf(orcamento.id, ultimaUriGerada)}
    disabled={isGeneratingPdf || isSharingPdf || isSaving}
    activeOpacity={0.8}
  >
    {isSharingPdf ? (
      <View style={styles.loadingRow}>
        <ActivityIndicator size="small" color="#FFFFFF" />
        <Text style={styles.btnCompartilharPdfText}>Preparando...</Text>
      </View>
    ) : (
      <View style={styles.loadingRow}>
        <Text style={styles.btnCompartilharPdfIcon}>📤</Text>
        <Text style={styles.btnCompartilharPdfText}>Compartilhar</Text>
      </View>
    )}
  </TouchableOpacity>
</View>
```

---

## 15. Matriz de Correções Provenientes da Auditoria v1.0

A tabela abaixo mapeia cada um dos 9 apontamentos do parecer de auditoria v1.0 para sua respectiva resolução na versão v1.1:

| ID do Achado | Severidade | Seção Corrigida no v1.1 | Descrição da Mudança Realizada | Causa Raiz Endereçada |
| :--- | :---: | :---: | :--- | :--- |
| **ACHADO-SHARE-01** | **CRÍTICO** | 5.3, 7.2, 10.1, 12.1, 14.1 | Removida a premissa de que cancelamento gera erro com strings `"dismissed"`/`"canceled"`. Redesenhado o status para `'DISPARADO'`, modelando a resolução normal da Promise pelo Android. A UI retorna suavemente ao estado ocioso sem falso toast de sucesso ou erro. | Inviabilidade de capturar cancelamento via `expo-sharing` no Android, cujo `OnActivityResult` sempre resolve com `null`. |
| **ACHADO-SHARE-02** | **MAJOR** | 7.1, 9, 12.2, 21 | Substituídas todas as menções a `FileSystemFileProvider` por `expo.modules.sharing.SharingFileProvider` com authority `com.jardinagem.app.SharingFileProvider`. | Indicação incorreta do FileProvider e autoridade nativa no planejamento anterior. |
| **ACHADO-SHARE-03** | **MAJOR** | 7.3, 9, 12.1 | Criada etapa na Infraestrutura (`ExpoSharingShareProvider`) para copiar o arquivo temporário `Print/<hash>.pdf` para `Orcamento_<numero>.pdf` no cache antes de chamar `shareAsync`. | A API `Sharing.shareAsync` não possui parâmetro de nome de arquivo e apps externos leem o nome da URI física. |
| **ACHADO-SHARE-04** | **MAJOR** | 8.1, 8.2, 10.1, 11.1 | Removido `import * as FileSystem` da camada de Aplicação. Adicionado método `verificarArquivoExiste` na porta `ShareProvider` para que o caso de uso permaneça 100% puro. | Violação da Clean Architecture por importação direta de SDK nativo no Use Case. |
| **ACHADO-SHARE-05** | **MAJOR** | 1, 9 | Seção renomeada para *"Decisões Técnicas Propostas / Planejadas"*. Todos os itens `DECISÃO-SHARE-*` rotulados como propostos/planejados sob auditoria. | Inversão de governança ao rotular decisões como "homologadas" antes da auditoria. |
| **ACHADO-SHARE-06** | **MINOR** | 7.1, 9, 18 | Especificada formalmente a versão exata fixada pelo Expo SDK 57: `"expo-sharing": "~57.0.20"`. | Imprecisão na versão declarada da dependência em relação ao `bundledNativeModules.json`. |
| **ACHADO-SHARE-07** | **MINOR** | 9, 12.2 | Removida a menção a `ClipData.newUri()`. Documentado o uso real de `context.grantUriPermission(packageName, contentUri, FLAG_GRANT_READ_URI_PERMISSION)` iterando pelas activities do Intent. | Descrição incorreta do mecanismo interno de concessão de permissão do módulo. |
| **ACHADO-SHARE-08** | **MINOR** | 4.1, 17.1 | Padronizada a nomenclatura de teste para Android 17 (API Level 37), eliminando a menção a "Android 16". | Inconsistência na correlação entre versão do Android e API Level 37. |
| **ACHADO-SHARE-09** | **OBSERVAÇÃO** | 9, 13.1, 13.2 | Ajustada a terminologia: "byte-idêntico" reservado para reutilização de arquivo físico existente; "conteúdo-consistente / visualmente e financeiramente idêntico" para PDF regenerado. Removida menção a "< 200 ms". | Imprecisão técnica ao afirmar identidade binária em gerações de PDF independentes. |

---

## 16. Planejamento de Testes Automatizados Revisado

A cobertura de testes automatizados será implementada em Jest / TypeScript, garantindo validação completa sem depender de emulador ou hardware nativo:

### 16.1. Testes do Caso de Uso (`tests/application/compartilhar-pdf-orcamento.use-case.test.ts`)
1. **Reutilização de Arquivo Existente:** Quando a URI fornecida for válida e `shareProvider.verificarArquivoExiste` retornar `true`, deve acionar `shareProvider.share` diretamente, sem invocar o gerador de PDF;
2. **Regeneração por Arquivo Inexistente:** Quando a URI fornecida não existir no cache, deve invocar `gerarPdfUseCase.execute`, obter nova URI e acionar `shareProvider.share`;
3. **Regeneração por Ausência de URI de Entrada:** Quando `fileUriExistente` não for fornecida, deve invocar `gerarPdfUseCase.execute` antes do compartilhamento;
4. **Falha na Regeneração:** Quando `gerarPdfUseCase.execute` falhar/rejeitar, deve retornar `sucesso: false, status: 'ERRO'` com mensagem informativa;
5. **Bloqueio de Não-Autenticado:** Deve rejeitar a operação se `authService.getCurrentUser()` retornar nulo;
6. **Bloqueio de Usuário Divergente:** Deve rejeitar a operação se `usuarioAtual.id !== input.usuarioId`;
7. **Bloqueio de Tenant Inviolável:** Deve rejeitar o compartilhamento se `orcamento.usuarioId !== usuarioAtual.id`;
8. **Orçamento Inexistente:** Deve rejeitar com erro se o orçamento não for localizado no repositório;
9. **Retorno Normal da Share Sheet:** Deve retornar `sucesso: true, status: 'DISPARADO'` quando o provedor concluir o compartilhamento;
10. **Tratamento de Dispositivo Indisponível:** Deve repassar `sucesso: false, status: 'INDISPONIVEL'` se o provedor reportar indisponibilidade;
11. **Tratamento de Erro do Provedor:** Deve capturar rejeições do provedor e retornar `sucesso: false, status: 'ERRO'`;
12. **Sanitização do Nome do Arquivo:** Deve validar que o parâmetro `nomeArquivo` repassado ao provedor substitui caracteres especiais por `_` (ex: `Orcamento_ORC_2026_001.pdf`);
13. **Proteção de URI Não-Autorizada:** Deve rejeitar URIs que não comecem com `file://` ou não terminem com `.pdf`, forçando a regeneração segura.

### 16.2. Testes do Adaptador de Infraestrutura (`tests/infrastructure/expo-sharing-provider.test.ts`)
1. **Disponibilidade Verdadeira:** Deve retornar `true` quando `Sharing.isAvailableAsync()` retornar `true`;
2. **Disponibilidade Falsa:** Deve retornar `false` quando `Sharing.isAvailableAsync()` retornar `false` ou rejeitar;
3. **Verificação de Arquivo Existente:** Deve delegar para `FileSystem.getInfoAsync` e retornar `exists`;
4. **Cópia para Nome Canônico:** Deve chamar `FileSystem.copyAsync` copiando de `fileUri` para `cacheDirectory + nomeArquivo`;
5. **Disparo de `Sharing.shareAsync`:** Deve repassar a URI copiada, com `mimeType: 'application/pdf'` e o título correto;
6. **Retorno Normal:** Deve resolver com `sucesso: true, status: 'DISPARADO'` quando `Sharing.shareAsync` resolver;
7. **Captura de Erro de Sistema:** Deve retornar `sucesso: false, status: 'ERRO'` quando `Sharing.shareAsync` rejeitar com erro de sistema.

### 16.3. Testes de Não-Regressão e Preservação de Camadas
- Validação estática de que `CompartilharPdfOrcamentoUseCase.ts` **não contém importações** de `expo-sharing` ou `expo-file-system`;
- Teste de espionagem garantindo que o status comercial do orçamento (`RASCUNHO`, `ENVIADO`, etc.) **não é alterado** durante o compartilhamento.

---

## 17. Roteiro de Validação Empírica no Android Nativo

A validação dinâmica no dispositivo físico ou emulador oficial é o único mecanismo capaz de comprovar o comportamento nativo do sistema operacional:

### 17.1. Ambiente e Configuração
- **Emulador Oficial:** `Pixel_10`;
- **Sistema Operacional:** Android 17;
- **API Level:** 37;
- **Ambiente de Execução:** Expo Dev Client / APK Debug gerado para o projeto;
- **Banco de Dados:** Supabase Local ativo com dados do Bloco B.

### 17.2. Protocolo de Testes Empíricos Passo a Passo

| Passo | Ação no Dispositivo | Comportamento Esperado | Evidência a Coletar |
| :---: | :--- | :--- | :--- |
| **01** | Abrir tela de detalhes do orçamento homologado | Botões "Visualizar PDF" e "Compartilhar" visíveis e habilitados. | Captura de tela |
| **02** | Tocar em "Compartilhar" (primeira vez, sem cache prévio) | Botão exibe "Preparando...", spinner ativo, duplo clique bloqueado. Gerador emite o PDF transparentemente. | Captura de tela |
| **03** | Observar abertura da Share Sheet do Android | Folha nativa surge exibindo título "Compartilhar Orçamento #ORC-..." e lista de apps. | Captura de tela |
| **04** | Fechar a Share Sheet tocando fora ou via botão Voltar (Back) | Diálogo fecha imediatamente. Aplicativo volta ao foco com botões reabilitados suavemente, sem alerta de erro nem toast enganoso. | Captura de tela |
| **05** | Tocar em "Compartilhar" novamente (arquivo em cache) | Abertura imediata da Share Sheet (reutilização de cache sem novo spinner longo). | Log de execução |
| **06** | Selecionar aplicativo de destino real (ex: "Salvar no dispositivo" / Google Drive) | O sistema abre o app receptor com o anexo preparado. | Captura de tela |
| **07** | Inspecionar o nome do anexo no app receptor | Nome do anexo exibido: `Orcamento_ORC-2026-001.pdf` (não exibe hash do cache). | Captura de tela |
| **08** | Concluir o salvamento e abrir o PDF externo | O arquivo abre perfeitamente. Layout A4, cabeçalhos, tabela de itens e totais 100% íntegros. | Captura de tela |
| **09** | Validar ausência de crash ou vazamento de memória | Zero exceções não tratadas no logcat do Android. | Logcat limpo |

---

## 18. Auditoria e Planejamento de Dependências

- **Dependência Identificada:** `"expo-sharing": "~57.0.20"`;
- **Fonte de Validação:** `node_modules/expo/bundledNativeModules.json` (Expo SDK 57.0.23);
- **Comando de Instalação Futuro (na fase de implementação):**
  ```bash
  npx expo install expo-sharing
  ```
- **Declaração de Conformidade:** **NENHUMA DEPENDÊNCIA FOI INSTALADA NESTA ETAPA**. A instalação permanece formalmente bloqueada até a homologação deste documento.

---

## 19. Banco de Dados e Multitenancy

- **Migrations:** **ZERO migrations**. O Bloco C não altera e não cria tabelas, colunas, tipos enumerados, índices ou funções no PostgreSQL;
- **Modelo Físico:** Permanece rigorosamente inalterado em relação ao Modelo Físico v1.1 homologado;
- **Políticas de RLS:** Intocadas. Nenhuma política de RLS foi modificada. Nenhuma operação utiliza a credencial `service_role`.

---

## 20. Preservação dos Módulos Homologados (Congelamento Rígido)

| Módulo | Situação Oficial | Ação no Bloco C |
| :--- | :---: | :--- |
| **Autenticação (Supabase Auth)** | `HOMOLOGADO (CONGELADO)` | Apenas consome `authService.getCurrentUser()`. Nenhuma alteração. |
| **Segurança e RLS** | `HOMOLOGADO (CONGELADO)` | Nenhuma alteração em regras de segurança ou tabelas. |
| **Clientes e Geocodificação (Bloco A)** | `HOMOLOGADO (CONGELADO)` | Totalmente isolado. Intocado. |
| **Catálogo de Serviços e Produtos** | `HOMOLOGADO (CONGELADO)` | Totalmente isolado. Intocado. |
| **Orçamentos e Áreas (GAP-01 a 08)** | `HOMOLOGADO (CONGELADO)` | O status comercial do orçamento não é alterado pelo compartilhamento. |
| **Geração e Visualização de PDF (Bloco B)** | `HOMOLOGADO (CONGELADO)` | Zero alterações em `ExpoPrintPdfGenerator`, templates HTML, mappers ou visualizador local. |
| **Rotina de Expiração Automática (RF67 / RN69)** | `FORA DE ESCOPO` | Permanece fora de escopo. Não implementada. |

---

## 21. Matriz de Gestão de Riscos Atualizada

| Risco Técnico Identificado | Severidade | Probabilidade | Mitigação Arquitetural na Revisão v1.1 |
| :--- | :---: | :---: | :--- |
| **R-01: Incompatibilidade de cancelamento no Android** | `CRÍTICO` | Baixa (Mitigado) | Redesenho completo do contrato e da máquina de estados. O app não tenta capturar cancelamento via exceção e não exibe alertas falsos. |
| **R-02: Nome de arquivo ilegível no WhatsApp/Gmail** | `MAJOR` | Baixa (Mitigado) | O `ExpoSharingShareProvider` copia previamente o arquivo para o cache com o nome sanitizado `Orcamento_<numero>.pdf`. |
| **R-03: Arquivo temporário expurgado do cache** | `MAJOR` | Baixa (Mitigado) | O use case valida a existência física via `shareProvider.verificarArquivoExiste`. Se ausente, regenera deterministicamente via Bloco B. |
| **R-04: Exceção de permissão no aplicativo receptor** | `MAJOR` | Baixa (Mitigado) | Adoção do `expo-sharing`, que registra o `SharingFileProvider` oficial e concede permissões de leitura seguras via `grantUriPermission()`. |
| **R-05: Dispositivo sem aplicativos para tratar PDF** | `MINOR` | Muito Baixa | Checagem de disponibilidade via `isAvailableAsync()` com feedback claro via `Alert.alert`. |
| **R-06: Duplo clique durante a preparação do envio** | `MINOR` | Média | O hook `useCompartilharPdf` gerencia `isSharing`, desabilitando os botões imediatamente no primeiro toque. |

---

## 22. Questões Abertas e Resoluções Arquiteturais

1. **O aplicativo deve registrar no banco que o orçamento foi compartilhado?**  
   *Resolução:* **Não.** Não existe requisito funcional de auditoria de compartilhamento, e o Android não permite saber com certeza se o usuário concluiu ou cancelou a partilha externa.
2. **O compartilhamento altera o status do orçamento para `ENVIADO`?**  
   *Resolução:* **Não.** A máquina de estados canônica do orçamento (`estados.puml`) determina transições explícitas de negócio. O compartilhamento externo é uma operação de transmissão que pode ocorrer em rascunhos ou propostas já emitidas sem alterar o status do registro.
3. **O que acontece se o usuário tocar em "Compartilhar" enquanto o PDF está sendo visualizado?**  
   *Resolução:* O botão de compartilhamento é desabilitado sempre que `isGeneratingPdf` ou `isSharingPdf` estiver ativo, impedindo concorrência na preparação de arquivos.

---

## 23. Matriz de Rastreabilidade Canônica

| Requisito / Regra | Componente de Arquitetura | Decisão Vinculada | Teste Automatizado | Validação Nativa |
| :--- | :--- | :--- | :--- | :--- |
| **RF82** (Compartilhar PDF via SO) | `CompartilharPdfOrcamentoUseCase`, `ExpoSharingShareProvider` | DECISÃO-SHARE-01, DECISÃO-SHARE-03, DECISÃO-SHARE-04 | `compartilhar-pdf-orcamento.use-case.test.ts` | Disparo da Share Sheet nativa com o arquivo no emulador Pixel 10 (Android 17). |
| **RN81** (PDF compartilhado íntegro e com nome correto) | `ExpoSharingShareProvider`, `ShareProvider` | DECISÃO-SHARE-03, DECISÃO-SHARE-06, DECISÃO-SHARE-07 | `expo-sharing-provider.test.ts` | Recepção do arquivo com nome `Orcamento_<numero>.pdf` e abertura íntegra no visualizador externo. |
| **RNF03** (Feedback operacional realista) | `useCompartilharPdf`, `orcamentos/[id].tsx` | DECISÃO-SHARE-08, DECISÃO-SHARE-09 | Testes unitários de hook e estado de botões | Bloqueio imediato contra duplo clique, spinner "Preparando..." e restauração suave pós-Share Sheet. |

---

## 24. Critérios Objetivos de Aprovação da Futura Implementação

A futura auditoria técnica independente da implementação do Bloco C utilizará a seguinte lista de verificação para homologação:

1. [ ] Dependência oficial `expo-sharing` (`~57.0.20`) instalada via `npx expo install expo-sharing` sem alterações no Gradle;
2. [ ] Contrato `ShareProvider` localizado na camada de Aplicação (`src/application/interfaces/`);
3. [ ] Caso de uso `CompartilharPdfOrcamentoUseCase` implementado na camada de Aplicação **sem importações de pacotes Expo**;
4. [ ] Adaptador `ExpoSharingShareProvider` implementado na camada de Infraestrutura (`src/infrastructure/services/share/`);
5. [ ] Cópia preparatória do arquivo para o nome canônico `Orcamento_<numero>.pdf` realizada antes de invocar `shareAsync`;
6. [ ] Reutilização física do arquivo existente quando disponível no cache (byte-idêntico);
7. [ ] Regeneração transparente operando perfeitamente caso o arquivo tenha sido expurgado (conteúdo-consistente);
8. [ ] FileProvider configurado como `com.jardinagem.app.SharingFileProvider`;
9. [ ] Retorno da Share Sheet tratado sem emissão de mensagens falsas de confirmação de entrega;
10. [ ] Prevenção de duplo toque e feedback visual (spinner) ativos durante a preparação;
11. [ ] Ausência de aplicativos compatíveis tratada com feedback amigável via `Alert.alert`;
12. [ ] Zero migrations criadas e zero alterações no modelo físico ou RLS do banco de dados;
13. [ ] Zero alterações de código no Bloco B congelado;
14. [ ] 100% de aprovação na suíte de testes automatizados;
15. [ ] Validação empírica aprovada no emulador `Pixel_10` (Android 17 / API 37) com evidências fotográficas anexadas ao relatório.

---

## 25. Sequência Planejada de Implementação Futura (Aguardando Homologação)

Somente após a emissão de parecer favorável de auditoria sobre este plano v1.1, as etapas de desenvolvimento deverão seguir a seguinte ordem:

1. **Instalação da Dependência:** Executar `npx expo install expo-sharing` e conferir `package.json`;
2. **Definição de Contratos:** Criar `src/application/interfaces/share-provider.interface.ts`;
3. **Implementação de Infraestrutura:** Criar `src/infrastructure/services/share/expo-sharing.provider.ts`;
4. **Implementação do Caso de Uso:** Criar `src/application/use-cases/orcamento/compartilhar-pdf-orcamento.use-case.ts`;
5. **Implementação do Hook de Apresentação:** Criar `src/presentation/hooks/use-compartilhar-pdf.ts`;
6. **Integração na Tela de Orçamento:** Atualizar `app/(app)/orcamentos/[id].tsx` adicionando o botão de compartilhamento;
7. **Implementação de Testes Automatizados:** Escrever suítes de testes unitários e de integração;
8. **Validação Estática e Testes Locais:** Executar `npm run typecheck` e `npm test`;
9. **Validação Empírica no Emulador:** Executar roteiro no `Pixel_10` (Android 17 / API 37) coletando evidências fotográficas;
10. **Emissão do Relatório de Implementação:** Produzir `docs/relatorios/compartilhamento-pdf-implementation-v1.0.md`;
11. **Submissão ao Gate de Auditoria Independente:** Solicitar auditoria da implementação para homologação do Bloco C.

---

## 26. Conclusão do Planejamento Revisado e Declaração de Status

A revisão v1.1 do planejamento técnico do **Bloco C (Compartilhamento Nativo de PDF)** sana integralmente todas as fragilidades, inconsistências e riscos apontados no parecer de auditoria independente da versão v1.0.

A arquitetura proposta respeita escrupulosamente a Clean Architecture em 4 camadas, alinha-se ao comportamento real e aos limites de privacidade do Android moderno, garante a integridade e nomenclatura institucional do documento comercial, previne acionamentos concorrentes e preserva absolutamente todos os módulos previamente homologados.

Nenhuma linha de código foi implementada, nenhuma biblioteca foi instalada e nenhuma alteração estrutural foi realizada no projeto.

---

STATUS:

PLANEJAMENTO REVISADO — BLOCO C v1.1 — AGUARDANDO NOVA AUDITORIA
