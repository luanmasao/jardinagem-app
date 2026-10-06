# Planejamento Técnico — Bloco C v1.0
## Compartilhamento Nativo de PDF de Orçamentos

**Projeto:** Sistema de Orçamento para Jardinagem (Android / React Native)  
**Data:** 05 de Outubro de 2026  
**Responsável:** Arquiteto de Software e Planejador Técnico  
**Versão do Documento:** 1.0 (Planejamento Inicial)  
**Status do Bloco Anterior (Bloco B):** AUDITADO E HOMOLOGADO (`CONGELADO`)  
**Declaração Oficial:** `PLANEJAMENTO CONCLUÍDO — BLOCO C — AGUARDANDO AUDITORIA`

---

## 1. Controle de Versão

| Versão | Data | Autor / Função | Descrição das Modificações | Situação do Documento |
| :---: | :---: | :--- | :--- | :--- |
| **1.0** | 05/10/2026 | Arquiteto de Software e Planejador Técnico | Elaboração do planejamento técnico detalhado para o Bloco C (Compartilhamento Nativo de PDF). Definição da abstração `ShareProvider`, caso de uso, análise de alternativas (`expo-sharing` vs `Intent ACTION_SEND`), segurança de FileProvider, feedback RNF03, mitigação de riscos e critérios de aceitação. | `AGUARDANDO AUDITORIA` |

---

## 2. Objetivo

Planejar arquiteturalmente e detalhar tecnicamente a implementação do **Bloco C (Compartilhamento Nativo de PDF)**, capacitando o usuário a transmitir externamente o documento PDF da proposta comercial de jardinagem através dos mecanismos e aplicativos disponíveis no dispositivo Android (WhatsApp, E-mail, Google Drive, Bluetooth, etc.), em estrita consonância com os requisitos canônicos **RF82**, **RN81** e a parcela de feedback de **RNF03**.

Este planejamento rege-se pelos seguintes princípios inegociáveis de engenharia:
1. **Segregação Estrita e Imutabilidade do Bloco B:** O Bloco B está formalmente homologado e **CONGELADO**. O Bloco C atua exclusivamente como consumidor do artefato PDF gerado pelo Bloco B, sendo terminantemente vedada qualquer alteração no gerador, templates, mappers ou visualizador local;
2. **Desacoplamento Arquitetural:** O mecanismo de compartilhamento nativo móvel reside exclusivamente na camada de Infraestrutura, isolado por uma porta abstrata (`ShareProvider`) consumida pela camada de Aplicação;
3. **Segurança e Minimização de Privilégios:** O arquivo PDF é compartilhado por meio de Content URI protegida (`content://`) emitida pelo `FileProvider` oficial, concedendo apenas permissão temporária de leitura (`FLAG_GRANT_READ_URI_PERMISSION`), sem exposição de `file://` e sem elevação de privilégios;
4. **Governança Estrita:** **Nenhum código de implementação será escrito, nenhuma dependência instalada e nenhuma migration criada** durante esta fase de planejamento.

---

## 3. Escopo

### 3.1. O que ESTÁ no Escopo do Bloco C
- Definição do contrato da abstração `ShareProvider` na camada de Aplicação;
- Planejamento do caso de uso `CompartilharPdfOrcamentoUseCase` na camada de Aplicação;
- Planejamento do adaptador concreto `ExpoSharingShareProvider` na camada de Infraestrutura, utilizando a biblioteca oficial `expo-sharing`;
- Planejamento do hook de apresentação `useCompartilharPdf` para gestão de estado, prevenção de duplo clique e feedback de carregamento/erro/sucesso;
- Integração da ação de compartilhamento ("Compartilhar Proposta") na interface móvel da tela de detalhes do orçamento (`app/(app)/orcamentos/[id].tsx`);
- Tratamento explícito de fluxos excepcionais: cancelamento pelo usuário, ausência de aplicativos de destino compatíveis e expiração do arquivo em cache;
- Planejamento de suíte completa de testes unitários e de integração (com mocks do subsistema nativo);
- Roteiro de validação empírica nativa no emulador Android oficial (`Pixel_10` / API 37).

### 3.2. O que NÃO ESTÁ no Escopo do Bloco C (Limites Rígidos)
- **NÃO alterar o Bloco B:** Nenhuma linha de `ExpoPrintPdfGenerator`, `orcamento-html.template.ts`, `orcamento-pdf.mapper.ts` ou `AndroidPdfViewerService` será modificada;
- **NÃO recriar o PDF:** O Bloco C não possui template próprio, não compila HTML e não altera o layout nem os valores monetários calculados;
- **NÃO implementar a Rotina de Expiração Automática (RF67 / RN69):** A expiração temporal de orçamentos permanece estritamente fora do escopo deste bloco;
- **NÃO criar migrations nem alterar banco:** Zero alterações no schema PostgreSQL, zero migrations e zero impacto nas políticas de RLS;
- **NÃO implementar backend de mensageria própria ou upload em nuvem:** O compartilhamento utiliza exclusivamente os aplicativos locais instalados no sistema operacional móvel do usuário;
- **NÃO instalar dependências ou executar código nesta etapa:** O gate de implementação depende de prévia auditoria e homologação deste plano.

---

## 4. Requisitos Cobertos

O Bloco C atende aos seguintes requisitos canônicos do sistema:

### 4.1. Requisito Funcional
- **RF82:** *"O sistema deve permitir compartilhar o PDF utilizando os mecanismos de compartilhamento disponíveis no dispositivo."*  
  *Critério Canônico:* Disparo da folha de compartilhamento oficial do sistema operacional (Share Sheet) contendo o arquivo PDF da proposta comercial, permitindo que o usuário escolha o aplicativo de destino.

### 4.2. Regra de Negócio
- **RN81:** *"O PDF deve poder ser compartilhado por meio dos mecanismos disponíveis no dispositivo."*  
  *Critério Canônico:* A proposta comercial em formato PDF deve ser entregue aos canais externos suportados pelo dispositivo, garantindo que o documento compartilhado seja íntegro e reflita os dados do orçamento.

### 4.3. Requisito Não-Funcional (Parcela Específica)
- **RNF03 (Feedback Operacional de Compartilhamento):** *"O sistema deve fornecer feedback adequado após operações relevantes, como salvamento, alteração de dados, cálculo de área, cálculo do orçamento, geração de PDF e compartilhamento."*  
  *Critério Canônico:* Exibição de indicador de progresso (`ActivityIndicator`), desabilitação de botões contra duplo toque durante a preparação do envio, retorno gracioso e silencioso em caso de cancelamento pelo usuário e apresentação de mensagens claras em caso de indisponibilidade de aplicativo compatível ou falha de sistema.

---

## 5. Fontes Canônicas

O planejamento apoia-se estritamente nas seguintes referências canônicas aprovadas:
1. **Inventário Oficial de Cobertura v1.1:** `docs/planejamento/requisitos-cobertura-status-v1.1.md`;
2. **Requisitos Funcionais v2, Regras de Negócio v3 e Requisitos Não-Funcionais v2;**
3. **Arquitetura Técnica v1.1:** `docs/arquitetura/arquitetura-tecnica-v1.1.md` (Padrão 4 camadas: Presentation, Application, Domain, Infrastructure);
4. **Parecer de Homologação da Implementação do Bloco B:** `docs/relatorios/pdf-orcamentos-implementation-audit-v1.0.md`;
5. **Relatório de Implementação do Bloco B:** `docs/relatorios/pdf-orcamentos-implementation-v1.0.md`;
6. **Planejamento Técnico do Bloco B v1.1:** `docs/planejamento/pdf-orcamentos-plan-v1.1.md`;
7. **Estratégia de Segurança e RLS v1.6:** `docs/relatorios/auth-rls-strategy-v1.6.md`;
8. **Modelo Físico PostgreSQL / PostGIS v1.1:** `docs/banco/modelo-fisico-v1.1.md`.

---

## 6. Estado Atual do Sistema e Análise do Código Existente

A inspeção técnica detalhada dos artefatos homologados no Bloco B revelou as seguintes características operacionais:

### 6.1. Ciclo de Vida do Arquivo PDF e Retorno de URI
- **Gerador:** `src/infrastructure/services/pdf/expo-print-pdf.generator.ts` invoca `Print.printToFileAsync({ html, base64: false })`;
- **Localização física:** O arquivo é gravado no diretório de cache do aplicativo no armazenamento interno do Android (`FileSystem.cacheDirectory + 'Print/....pdf'`);
- **Formato da URI de retorno:** O método `gerar()` retorna uma URI no esquema de arquivo local:
  ```ts
  { uri: 'file:///data/user/0/com.jardinagem.app/cache/Print/abc-123.pdf', nomeArquivo: 'Orcamento_ORC-2026-001.pdf' }
  ```
- **Persistência no Cache:** O arquivo permanece acessível no cache local enquanto o sistema operacional Android não executar limpeza de espaço temporário ou o aplicativo não for desinstalado.

### 6.2. Visualizador Nativo Homologado (`AndroidPdfViewerService`)
- O arquivo `src/infrastructure/services/pdf/android-pdf-viewer.service.ts` recebe o caminho `file://`, converte-o para Content URI segura através de `FileSystem.getContentUriAsync(fileUri)` e dispara a Intent:
  ```ts
  await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
    data: contentUri,
    type: 'application/pdf',
    flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
  });
  ```
- **Fronteira Operacional:** Essa chamada aciona exclusivamente o visualizador passivo local (`Google PDF Viewer`). Ela **não** abre a folha de compartilhamento (Share Sheet), **não** invoca `ACTION_SEND` e **não** atende a RF82/RN81.

### 6.3. Ponto de Integração na Interface
- A tela de detalhes do orçamento `app/(app)/orcamentos/[id].tsx` consome o hook `useGerarPdf`, que disponibiliza o método `gerarEVisualizarPdf(orcamentoId)`.
- Atualmente existe apenas o botão *"Gerar PDF da Proposta"*.
- Não há botão, hook ou serviço de compartilhamento no código ativo.

---

## 7. Análise de Alternativas Técnicas

Para viabilizar o compartilhamento nativo de arquivos PDF no ecossistema Expo SDK 57 / Android API 37, foram avaliadas três alternativas técnicas:

| Critério de Análise | Alternativa A: `expo-sharing` (Recomendada) | Alternativa B: `expo-intent-launcher` com `ACTION_SEND` | Alternativa C: Módulo Nativo Customizado (TurboModule / JNI) |
| :--- | :--- | :--- | :--- |
| **Compatibilidade Expo SDK 57** | **Nativa e Oficial:** Pacote mantido pelo time do Expo (`~57.0.x`), 100% alinhado ao runtime Hermes e React Native 0.86.3. | **Parcial:** Pacote presente, mas desenhado para disparos genéricos de Activity, não especializado em compartilhamento. | **Baixa:** Requer compilação C++/Java dedicada e manutenção proprietária. |
| **Compatibilidade Android 16 (API 37)** | **Total:** Gerencia automaticamente FileProvider, permissões de leitura transitivas e Share Sheet nativa. | **Insegura / Problemática:** Apresenta falhas de permissão em `EXTRA_STREAM` sem `ClipData` explícito. | **Alta, porém com alto custo:** Depende de manutenção manual contínua. |
| **Gerenciamento de Content URI e Permissões** | **Automático:** Resolve `file://` para `content://`, injeta `ClipData.newUri()` e atribui `FLAG_GRANT_READ_URI_PERMISSION` de forma transparente. | **Crítico:** `IntentLauncher` passa o URI em `extra: { 'android.intent.extra.STREAM': uri }`. No Android 10+, Intents `ACTION_SEND` exigem `ClipData` para propagação segura de leitura via FileProvider, funcionalidade não exposta pelo `expo-intent-launcher`. Risco de `SecurityException`. | **Manual:** Exigiria codificação Java/Kotlin para manipulação de `FileProvider` e `ClipData`. |
| **Abertura da Share Sheet do Sistema** | **Nativa com Chooser:** Injeta `Intent.createChooser` garantindo o aparecimento da folha de compartilhamento padrão do Android com título customizado. | **Inconsistente:** Pode abrir diretamente o aplicativo padrão anterior em vez da folha de escolha do usuário caso não haja chooser nativo configurado. | **Total:** Controlado via código Java nativo. |
| **Detecção de Disponibilidade (`isAvailable`)** | **Sim:** Fornece `Sharing.isAvailableAsync()` para checagem prévia antes do disparo. | **Não:** Exige tentativa às cegas com captura de `ActivityNotFoundException`. | **Sim:** Mediante implementação de método específico. |
| **Tratamento de Cancelamento pelo Usuário** | **Gracioso:** A Promise resolve normalmente quando a Share Sheet é fechada/cancelada pelo usuário, sem lançar exceção fatal não tratada. | **Complexo:** `startActivityForResult` retorna código de cancelamento (`RESULT_CANCELED`) que se mistura com erros de execução. | **Tratável:** Mediante gerenciamento de callbacks de Activity. |
| **Impacto no Build e Manutenibilidade** | **Mínimo:** Instalado via `npx expo install expo-sharing`. Sem alterações em `android/` manual ou Gradle complexo. | **Zero dependência nova:** Reutiliza lib existente, porém com alto débito técnico e risco de bugs em runtime nativo. | **Crítico:** Quebra a simplicidade da arquitetura e exige rebuild nativo complexo. |

### 7.1. Diagnóstico Técnico Decisivo sobre `ACTION_SEND` via `expo-intent-launcher`
A tentativa de utilizar `expo-intent-launcher` para compartilhamento (`ACTION_SEND`) apresenta uma limitação arquitetural severa no Android moderno:
- No Android, enquanto a Intent `ACTION_VIEW` consome o arquivo através de `intent.setDataAndType(contentUri, "application/pdf")` (onde a flag `FLAG_GRANT_READ_URI_PERMISSION = 1` é automaticamente herdada pelo aplicativo leitor), a Intent `ACTION_SEND` transporta o arquivo dentro do mapa de extras: `intent.putExtra(Intent.EXTRA_STREAM, contentUri)`.
- A partir do Android 4.4 (API 19) e consolidado no Android 10+ (API 29+), o sistema operacional **NÃO** concede permissão de leitura sobre URIs contidas em `EXTRA_STREAM` a menos que a URI seja também anexada ao `ClipData` da Intent (`intent.setClipData(...)`).
- Como o `expo-intent-launcher` é um despachante genérico de dicionários JavaScript para Intents Android, ele **não expõe API para configuração de `ClipData`**. Consequentemente, aplicativos como WhatsApp, Gmail e Google Drive falham com `SecurityException: Permission Denial` ao tentar ler a URI do FileProvider.
- Em contrapartida, o módulo nativo do `expo-sharing` (`SharingModule.kt`) foi construído especificamente para resolver esse problema do Android, gerando o `ClipData` e o `Intent.createChooser` de forma segura e certificada.

---

## 8. Decisão Arquitetural Homologada

Ficam registradas e numeradas as **10 Decisões Técnicas Oficiais do Bloco C**:

- **DECISÃO-SHARE-01 (Mecanismo Concreto):** Adotar formalmente a biblioteca oficial `expo-sharing` como mecanismo de compartilhamento nativo móvel no Android, instalando-a estritamente via comando oficial `npx expo install expo-sharing` após a homologação deste plano.
- **DECISÃO-SHARE-02 (Abstração em Infraestrutura):** Criar a interface abstrata `ShareProvider` em `src/application/interfaces/share-provider.interface.ts`, garantindo que a camada de Aplicação não dependa diretamente do módulo `expo-sharing`.
- **DECISÃO-SHARE-03 (Implementação Concreta):** Implementar o adaptador `ExpoSharingShareProvider` em `src/infrastructure/services/share/expo-sharing.provider.ts`, encapsulando todas as particularidades de `expo-sharing`.
- **DECISÃO-SHARE-04 (Caso de Uso Atômico):** Criar o caso de uso `CompartilharPdfOrcamentoUseCase` em `src/application/use-cases/orcamento/compartilhar-pdf-orcamento.use-case.ts`, com responsabilidade única de validar o orçamento, verificar o arquivo e orquestrar o compartilhamento.
- **DECISÃO-SHARE-05 (Reutilização Byte-Consistente do Bloco B):** O Bloco C consumirá estritamente o arquivo PDF físico já compilado pelo `ExpoPrintPdfGenerator` do Bloco B. Não será criada nenhuma rotina paralela de compilação ou geração de PDF.
- **DECISÃO-SHARE-06 (Política de Cache e Regeneração Transparente):** Caso o PDF já tenha sido gerado na sessão e persista no cache, o arquivo existente será compartilhado imediatamente. Se o arquivo temporário tiver sido expurgado pelo sistema operacional ou ainda não tiver sido emitido, o caso de uso invocará deterministicamente o `GerarPdfOrcamentoUseCase` já homologado do Bloco B, regenerando o documento oficial antes de disparar o compartilhamento.
- **DECISÃO-SHARE-07 (Segurança e Minimização de Dados):** O arquivo compartilhado será referenciado exclusivamente por Content URI emitido pelo `FileProvider` oficial do Expo (`FileSystemFileProvider`), com concessão de permissão temporária restrita de leitura. Nenhum token JWT, credencial ou metadado administrativo será repassado à Share Sheet.
- **DECISÃO-SHARE-08 (Tratamento Gracioso de Cancelamento):** O cancelamento da folha de compartilhamento pelo usuário será tratado como um fluxo de término normal (`status: 'CANCELADO'`), sem exibição de mensagens de erro ou alertas de falha.
- **DECISÃO-SHARE-09 (Feedback de Interface RNF03):** O hook `useCompartilharPdf` fornecerá controle de estado (`isSharing`), bloqueando novos toques para prevenir duplo acionamento e exibindo `ActivityIndicator` com mensagem explicativa durante a preparação do envio.
- **DECISÃO-SHARE-10 (Zero Regressão e Módulos Congelados):** Manter o Bloco B e todos os módulos anteriores estritamente congelados. O Bloco C terá impacto zero sobre o banco de dados (zero migrations e zero alterações em RLS).

---

## 9. Especificação da Abstração `ShareProvider`

A abstração será declarada na camada de Aplicação, respeitando a inversão de dependência:

### 9.1. Arquivo de Contrato: `src/application/interfaces/share-provider.interface.ts`

```ts
/**
 * Parâmetros de entrada para o serviço de compartilhamento nativo.
 */
export interface CompartilharArquivoParams {
  /** URI do arquivo local (esquema file://) a ser compartilhado */
  fileUri: string;
  /** Tipo MIME do arquivo (obrigatório: 'application/pdf') */
  mimeType: string;
  /** Título apresentado na barra superior da Share Sheet do Android */
  dialogTitle: string;
  /** Nome sugerido para o arquivo ao compartilhar */
  nomeArquivo?: string;
}

/**
 * Resultado padronizado da operação de compartilhamento.
 */
export type StatusCompartilhamento = 'COMPARTILHADO' | 'CANCELADO' | 'INDISPONIVEL' | 'ERRO';

export interface ResultadoCompartilhamento {
  sucesso: boolean;
  status: StatusCompartilhamento;
  mensagem?: string;
}

/**
 * Porta de infraestrutura para serviços de compartilhamento externo do sistema operacional.
 */
export interface ShareProvider {
  /**
   * Verifica se o dispositivo possui capacidade e aplicativos para compartilhamento.
   */
  isAvailable(): Promise<boolean>;

  /**
   * Abre a folha nativa de compartilhamento para o arquivo informado.
   * @param params Dados do arquivo e parâmetros de exibição
   */
  share(params: CompartilharArquivoParams): Promise<ResultadoCompartilhamento>;
}
```

### 9.2. Implementação Concreta: `src/infrastructure/services/share/expo-sharing.provider.ts`

```ts
import * as Sharing from 'expo-sharing';
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

  async share(params: CompartilharArquivoParams): Promise<ResultadoCompartilhamento> {
    try {
      const disponivel = await this.isAvailable();
      if (!disponivel) {
        return {
          sucesso: false,
          status: 'INDISPONIVEL',
          mensagem: 'O compartilhamento de arquivos não está disponível neste dispositivo.',
        };
      }

      await Sharing.shareAsync(params.fileUri, {
        mimeType: params.mimeType,
        dialogTitle: params.dialogTitle,
        UTI: 'com.adobe.pdf',
      });

      return {
        sucesso: true,
        status: 'COMPARTILHADO',
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);

      // Tratamento de cancelamento gracioso pelo usuário
      if (
        msg.includes('dismissed') ||
        msg.includes('canceled') ||
        msg.includes('cancelled') ||
        msg.includes('User did not share')
      ) {
        return {
          sucesso: true,
          status: 'CANCELADO',
        };
      }

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

---

## 10. Caso de Uso de Compartilhamento

### 10.1. Arquivo: `src/application/use-cases/orcamento/compartilhar-pdf-orcamento.use-case.ts`

O caso de uso atua como orquestrador da operação na camada de Aplicação:

```ts
import { ShareProvider, ResultadoCompartilhamento } from '../../interfaces/share-provider.interface';
import { GerarPdfOrcamentoUseCase } from './gerar-pdf-orcamento.use-case';
import { OrcamentoRepository } from '../../../domain/repositories/orcamento.repository.interface';
import { AuthService } from '../../services/auth.service';
import * as FileSystem from 'expo-file-system/legacy';

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
    // 1. Validação de autenticação e tenant
    const usuarioAtual = await this.authService.getCurrentUser();
    if (!usuarioAtual || usuarioAtual.id !== input.usuarioId) {
      return {
        sucesso: false,
        status: 'ERRO',
        mensagem: 'Acesso não autorizado. Usuário não autenticado.',
      };
    }

    // 2. Validação da existência e titularidade do orçamento
    const orcamento = await this.orcamentoRepository.obterPorId(input.orcamentoId);
    if (!orcamento || orcamento.usuarioId !== input.usuarioId) {
      return {
        sucesso: false,
        status: 'ERRO',
        mensagem: 'Orçamento não encontrado ou não pertencente ao usuário.',
      };
    }

    let uriParaCompartilhar = input.fileUriExistente;
    let nomeArquivo = `Orcamento_${orcamento.numero.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;

    // 3. Verificação de integridade do arquivo em cache (DECISÃO-SHARE-06)
    let arquivoExiste = false;
    if (uriParaCompartilhar && uriParaCompartilhar.trim() !== '') {
      try {
        const info = await FileSystem.getInfoAsync(uriParaCompartilhar);
        arquivoExiste = info.exists;
      } catch {
        arquivoExiste = false;
      }
    }

    // 4. Regeneração transparente via Bloco B caso o arquivo não exista no cache
    if (!arquivoExiste) {
      const resultadoGeracao = await this.gerarPdfUseCase.execute({
        orcamentoId: input.orcamentoId,
        usuarioId: input.usuarioId,
      });
      uriParaCompartilhar = resultadoGeracao.uri;
      nomeArquivo = resultadoGeracao.nomeArquivo;
    }

    // 5. Invocação da porta de compartilhamento nativo
    return await this.shareProvider.share({
      fileUri: uriParaCompartilhar,
      mimeType: 'application/pdf',
      dialogTitle: `Compartilhar Orçamento #${orcamento.numero}`,
      nomeArquivo,
    });
  }
}
```

---

## 11. Fonte do Arquivo e Integridade Byte a Byte

1. **Origem Única:** O arquivo PDF submetido ao compartilhamento é gerado **exclusivamente** pelo `ExpoPrintPdfGenerator` através do `GerarPdfOrcamentoUseCase` homologado no Bloco B.
2. **Imutabilidade:** O Bloco C não altera nenhum byte do documento, preservando o layout A4, o snapshot dos itens, o detalhamento das áreas medidas, o subtotal, os descontos e o total geral calculados pelas regras de domínio.
3. **Resolução de Cache e Inexistência Física:**
   - **Cenário A (Arquivo em Cache Válido):** Se o usuário já visualizou o PDF na mesma sessão e o arquivo permanece íntegro em `FileSystem.cacheDirectory`, o use case reutiliza a URI diretamente, garantindo abertura instantânea (< 200 ms) sem novo processamento de CPU.
   - **Cenário B (Cache Limpo ou Primeira Emissão):** Se o arquivo tiver sido removido pelo sistema operacional ou se o usuário acionar o compartilhamento diretamente, o `GerarPdfOrcamentoUseCase` é invocado de forma transparente antes do envio. O usuário recebe o documento idêntico sem interrupção do fluxo.

---

## 12. URI, FileProvider e Permissões Android

Para garantir a interoperabilidade e a segurança exigidas pelo Android API 37:
1. **Esquema `content://` Mandatório:** O Android bloqueia a exposição de esquemas `file://` através de limites de segurança do sistema operacional (`FileUriExposedException`). O `expo-sharing` utiliza o `FileSystemFileProvider` configurado nativamente no `AndroidManifest.xml`:
   `content://com.jardinagem.app.FileSystemFileProvider/cache/Print/Orcamento_ORC-2026-001.pdf`
2. **Sinalizadores de Permissão (Flags):**
   - Inclusão compulsória de `FLAG_GRANT_READ_URI_PERMISSION` (valor numérico `1`);
   - Concessão de permissão temporária de leitura estrita vinculada ao ciclo de vida da Activity de destino selecionada pelo usuário;
   - Zero concessão de escrita (`FLAG_GRANT_WRITE_URI_PERMISSION` ausente);
3. **ClipData:** O `expo-sharing` anexa a Content URI ao `ClipData` do Intent Android, assegurando que aplicativos que utilizam segurança reforçada (como WhatsApp e Gmail) acessem o arquivo sem erro de permissão.

---

## 13. Mecanismo da Android Share Sheet

O fluxo de compartilhamento no dispositivo Android seguirá o seguinte encadeamento nativo:

```
[ Usuário toca em "Compartilhar Proposta" ]
               │
               ▼
[ useCompartilharPdf: bloqueia botão e ativa spinner ]
               │
               ▼
[ CompartilharPdfOrcamentoUseCase: valida tenant e resolve PDF ]
               │
               ▼
[ ExpoSharingShareProvider: verifica isAvailableAsync() ]
               │
               ▼
[ Android OS: Intent.ACTION_SEND + Intent.createChooser ]
               │
               ▼
┌─────────────────────────────────────────────────────────┐
│              ANDROID SYSTEM SHARE SHEET                 │
│         "Compartilhar Orçamento #ORC-2026-001"          │
├─────────────────────────────────────────────────────────┤
│ [ WhatsApp ]   [ Gmail ]   [ Drive ]   [ Bluetooth ]   │
└─────────────────────────────────────────────────────────┘
               │
      ┌────────┴────────┐
      ▼                 ▼
[ App Selecionado ]  [ Usuário Cancela / Volta ]
      │                 │
      ▼                 ▼
Status: COMPARTILHADO   Status: CANCELADO
      │                 │
      └────────┬────────┘
               ▼
[ useCompartilharPdf: desbloqueia botão e encerra spinner ]
```

---

## 14. Segurança e Minimização de Dados

1. **Isolamento Multitenant:** A camada de Aplicação valida rigorosamente se o `orcamento.usuarioId` corresponde ao `usuario.id` autenticado via Supabase Auth antes de acessar o arquivo;
2. **Sem Vazamento de Credenciais:** Nenhuma chave secreta, token JWT ou dado interno do banco de dados é injetado no payload do Intent de compartilhamento;
3. **Minimização de Permissões no AndroidManifest:** Nenhuma nova permissão perigosa (`dangerous permission`) será solicitada. O compartilhamento utiliza intents implícitas mediadas pelo sistema operacional;
4. **Zero Acesso Administrativo:** Toda operação executa sob o contexto seguro do usuário regular.

---

## 15. Privacidade e Canais Externos

- O aplicativo limita-se a disponibilizar o arquivo PDF para a Share Sheet oficial do sistema operacional.
- A decisão de qual aplicativo receberá o orçamento (WhatsApp, E-mail, Telegram, Drive) é tomada **exclusiva e voluntariamente pelo usuário**.
- O sistema não monitora, armazena nem transmite dados telemétricos sobre qual aplicativo foi escolhido pelo usuário na Share Sheet.

---

## 16. Planejamento de Feedback ao Usuário (RNF03)

O atendimento pleno a **RNF03** na operação de compartilhamento contempla uma máquina de estados visual clara e determinística:

| Estado da Operação | Indicador Visual | Estado dos Botões da UI | Mensagem / Alerta ao Usuário |
| :--- | :--- | :--- | :--- |
| **Ocioso (`idle`)** | Botão padrão com ícone 📤 | Habilitado | Nenhum |
| **Preparando Arquivo (`preparing`)** | `ActivityIndicator` embutido | Desabilitado (previne duplo clique) | Texto do botão: *"Preparando Envio..."* |
| **Share Sheet Aberta (`active`)** | Aguardando retorno do SO | Desabilitado | Nenhum (foco na Share Sheet do Android) |
| **Compartilhado com Sucesso (`success`)** | Retorno ao botão normal | Habilitado | Restauração fluida da tela |
| **Cancelado pelo Usuário (`cancelled`)** | Retorno ao botão normal | Habilitado | Retorno silencioso sem mensagens de erro |
| **Dispositivo sem Apps Compatíveis (`unavailable`)** | Retorno ao botão normal | Habilitado | `Alert.alert('Compartilhamento Indisponível', 'Nenhum aplicativo compatível para compartilhamento de PDF foi localizado no dispositivo.')` |
| **Falha Técnica (`error`)** | Retorno ao botão normal | Habilitado | `Alert.alert('Erro ao Compartilhar', 'Não foi possível acionar o compartilhamento. Tente gerar o PDF novamente.')` |

---

## 17. Integração na Interface de Usuário (UI)

### 17.1. Localização e Layout
Na tela `app/(app)/orcamentos/[id].tsx`, a seção de ações de PDF será refinada para acomodar harmonicamente os botões de **Visualização** (Bloco B) e **Compartilhamento** (Bloco C):

```tsx
{/* Seção de Ações de PDF (Bloco B e Bloco C) */}
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

  {/* Botão de Compartilhamento (Bloco C - Novo) */}
  <TouchableOpacity
    style={[styles.btnCompartilharPdf, isSharingPdf && styles.btnDesabilitado]}
    onPress={() => compartilharPdf(orcamento.id)}
    disabled={isGeneratingPdf || isSharingPdf || isSaving}
    activeOpacity={0.8}
  >
    {isSharingPdf ? (
      <View style={styles.loadingRow}>
        <ActivityIndicator size="small" color="#FFFFFF" />
        <Text style={styles.btnCompartilharPdfText}>Enviando...</Text>
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

### 17.2. Hook de Apresentação: `src/presentation/hooks/use-compartilhar-pdf.ts`
O hook encapsula:
- Gerenciamento do estado booleano `isSharing`;
- Obtenção do usuário autenticado atual;
- Invocação do caso de uso `CompartilharPdfOrcamentoUseCase`;
- Exibição de alertas compreensíveis para falhas técnicas ou ausência de apps;
- Tratamento silencioso de cancelamentos.

---

## 18. Planejamento de Testes Automatizados

A cobertura do Bloco C será assegurada por suítes de testes unitários e de integração desacopladas do hardware nativo:

### 18.1. Testes do Caso de Uso (`tests/application/compartilhar-pdf-orcamento.use-case.test.ts`)
1. **Sucesso com Cache Válido:** Deve compartilhar o arquivo imediatamente sem invocar o gerador quando o PDF já existir no cache;
2. **Sucesso com Regeneração Transparente:** Deve acionar o `GerarPdfOrcamentoUseCase` e compartilhar a nova URI quando o arquivo não existir previamente no cache;
3. **Bloqueio de Não-Autenticado:** Deve rejeitar a operação se o usuário não estiver autenticado;
4. **Bloqueio de Tenant Inviolável:** Deve rejeitar o compartilhamento se o orçamento pertencer a outro `usuarioId`;
5. **Tratamento de Cancelamento:** Deve retornar `sucesso: true` e `status: 'CANCELADO'` quando o usuário fechar a Share Sheet;
6. **Tratamento de Indisponibilidade:** Deve retornar `sucesso: false` e `status: 'INDISPONIVEL'` quando `shareProvider.isAvailable()` for falso;
7. **Tratamento de Exceção Nativa:** Deve capturar erros do provedor e retornar mensagem tratada em `status: 'ERRO'`.

### 18.2. Teste Obrigatório de Fronteira e Não-Duplicação
- **Teste de Consistência e Reutilização:**
  1. Emitir PDF via `GerarPdfOrcamentoUseCase`;
  2. Registrar o caminho da URI e o hash do arquivo;
  3. Acionar `CompartilharPdfOrcamentoUseCase` passando a URI gerada;
  4. Assegurar por mock spied que o método `PdfGenerator.gerar()` **NÃO foi invocado novamente**;
  5. Assegurar que os parâmetros repassados ao `ShareProvider` mantêm o mesmo arquivo e o MIME type `application/pdf`.

### 18.3. Testes do Adaptador Concreto (`tests/infrastructure/expo-sharing-provider.test.ts`)
- Testes unitários com mock do módulo `expo-sharing` verificando passagem correta de `mimeType`, `dialogTitle` e mapeamento de cancelamentos e erros.

---

## 19. Roteiro de Validação Empírica no Android Nativo

A validação dinâmica será conduzida no emulador oficial do projeto:
- **Dispositivo:** `Pixel_10` (Android 16 / API Level 37);
- **Roteiro de Testes Empíricos:**
  1. **Abertura da Share Sheet:** Acessar o detalhe de um orçamento homologado (ex: Cenário B com múltiplos itens e áreas) e acionar *"Compartilhar"*;
  2. **Inspeção da UI do Sistema:** Comprovar a exibição da folha nativa do Android contendo o título *"Compartilhar Orçamento #..."*;
  3. **Validação de Cancelamento:** Tocar fora da Share Sheet ou acionar a tecla física de retorno (Back `keyevent 4`) e comprovar o desbloqueio imediato da tela sem mensagens de erro;
  4. **Validação de Destino Real:** Selecionar um aplicativo disponível no sistema (ex: Google Drive / Salvar no Dispositivo) e concluir a exportação;
  5. **Verificação do Arquivo Exportado:** Abrir o arquivo gravado externamente e atestar a preservação exata do layout A4, dados de cabeçalho, tabela de itens e valores financeiros.

---

## 20. Auditoria de Dependências

- **Dependência Selecionada:** `expo-sharing` (~57.0.x);
- **Critério de Instalação:** `npx expo install expo-sharing` (comando gerenciado pelo Expo CLI que garante versão perfeitamente compatível com o Expo SDK 57 instalado);
- **Impacto no Lockfile:** A biblioteca adiciona apenas dependências internas do Expo, sem pacotes obsoletos de terceiros;
- **Instalação Controlada:** **NÃO EXECUTAR A INSTALAÇÃO NESTA ETAPA**. A instalação será realizada exclusivamente após a homologação deste plano.

---

## 21. Banco de Dados e Multitenancy

- **Migrations:** **ZERO migrations**. O Bloco C não cria nem altera tabelas, colunas, tipos ou funções no PostgreSQL;
- **Modelo Físico:** Permanece 100% inalterado (Modelo Físico v1.1 congelado);
- **Segurança e RLS:** Permanece 100% inalterado. Não há bypass de RLS nem uso de `service_role`.

---

## 22. Impacto e Preservação dos Módulos Homologados

| Módulo | Estado Oficial | Impacto do Bloco C | Ação de Preservação |
| :--- | :---: | :---: | :--- |
| **Autenticação e Sessão** | `HOMOLOGADO (CONGELADO)` | **Zero** | Consumo exclusivamente passivo de `authService.getCurrentUser()`. |
| **Segurança e RLS** | `HOMOLOGADO (CONGELADO)` | **Zero** | Nenhuma alteração de política RLS ou acesso direto ao PostgreSQL. |
| **Clientes e Geocodificação (Bloco A)** | `HOMOLOGADO (CONGELADO)` | **Zero** | Intocado. Dados de clientes lidos através do caso de uso de geração. |
| **Catálogo de Serviços e Produtos** | `HOMOLOGADO (CONGELADO)` | **Zero** | Intocado. Nenhuma consulta direta ao catálogo. |
| **Orçamentos e Áreas (GAP-01 a 08)** | `HOMOLOGADO (CONGELADO)` | **Zero** | Intocado. Nenhum cálculo ou status financeiro é modificado. |
| **Geração e Visualização de PDF (Bloco B)** | `HOMOLOGADO (CONGELADO)` | **Zero** | Intocado. O arquivo compilado pelo Bloco B é apenas lido e repassado à Share Sheet. |

---

## 23. Matriz de Gestão de Riscos

| Risco Identificado | Severidade | Probabilidade | Estratégia de Mitigação Planejada |
| :--- | :---: | :---: | :--- |
| **R-01: Arquivo temporário expurgado do cache** | `MAJOR` | Baixa | O `CompartilharPdfOrcamentoUseCase` verifica a existência física do arquivo via `FileSystem.getInfoAsync`. Se ausente, invoca o `GerarPdfOrcamentoUseCase` e regera o PDF antes de abrir a Share Sheet. |
| **R-02: Exceção de permissão no aplicativo de destino** | `MAJOR` | Baixa | Adoção do `expo-sharing`, que configura nativamente `ClipData` e permissão temporária de leitura via `FileSystemFileProvider` (`FLAG_GRANT_READ_URI_PERMISSION`). |
| **R-03: Dispositivo sem aplicativos para tratar PDF** | `MINOR` | Muito Baixa | Checagem de disponibilidade via `isAvailableAsync()` e captura de erro retornando feedback amigável via `Alert.alert`, sem travamento da aplicação. |
| **R-04: Duplo clique durante a abertura da Share Sheet** | `MINOR` | Média | O hook `useCompartilharPdf` gerencia a flag `isSharing`, desabilitando os botões imediatamente no primeiro toque. |
| **R-05: Falha na Share Sheet tratada como erro fatal** | `MINOR` | Média | Tratamento explícito das mensagens de cancelamento/dismissal do `expo-sharing`, mapeando para status `'CANCELADO'` sem alerta de erro. |
| **R-06: Conflito de versão no Gradle após adicionar dependência** | `OBSERVAÇÃO` | Baixa | Utilização estrita de `npx expo install expo-sharing` para garantir alinhamento exato com o Expo SDK 57. |

---

## 24. Questões Abertas e Resoluções Arquiteturais

Todas as questões arquiteturais foram analisadas e decididas conclusivamente:

1. **Como o aplicativo reage se o usuário clicar em "Compartilhar" sem ter visualizado o PDF antes?**  
   *Resolução:* O caso de uso detecta a ausência de URI de cache prévia e invoca deterministicamente o gerador homologado do Bloco B, emitindo o PDF e abrindo a Share Sheet em um único fluxo contínuo.
2. **O status do orçamento muda ao ser compartilhado?**  
   *Resolução:* **Não.** O status do orçamento é regido pela máquina de estados canônica (`estados.puml`). O compartilhamento é uma ação de transmissão de mídia e não altera o status comercial (`RASCUNHO`, `ENVIADO`, etc.).
3. **É necessário salvar o histórico de compartilhamento no banco de dados?**  
   *Resolução:* **Não.** Não há requisito funcional ou regra de negócio que exija persistência de data/hora ou log de compartilhamento externo na versão atual.
4. **Como garantir que o PDF compartilhado é idêntico ao visualizado?**  
   *Resolução:* O arquivo compartilhado é exatamente o mesmo arquivo gravado no cache pelo Bloco B. Se for necessária regeneração, ela consome a mesma entidade e os mesmos snapshots imutáveis.

---

## 25. Matriz de Rastreabilidade

| Requisito / Regra | Componente de Arquitetura | Decisão Vinculada | Teste Automatizado | Critério de Homologação |
| :--- | :--- | :--- | :--- | :--- |
| **RF82** (Compartilhar PDF via SO) | `CompartilharPdfOrcamentoUseCase`, `ExpoSharingShareProvider` | DECISÃO-SHARE-01, DECISÃO-SHARE-04 | `compartilhar-pdf-orcamento.use-case.test.ts` (testes 1 e 2) | Disparo com sucesso da folha de compartilhamento nativa com o arquivo PDF. |
| **RN81** (PDF compartilhado pelos mecanismos disponíveis) | `ExpoSharingShareProvider`, `ShareProvider` | DECISÃO-SHARE-02, DECISÃO-SHARE-03 | `expo-sharing-provider.test.ts`, teste empírico Android | Entrega do arquivo íntegro com MIME `application/pdf` e Content URI segura. |
| **RNF03** (Feedback da operação de compartilhamento) | `useCompartilharPdf`, `app/(app)/orcamentos/[id].tsx` | DECISÃO-SHARE-08, DECISÃO-SHARE-09 | Teste de estado de UI, validação de cancelamento e alerta no Pixel 10 | Botão bloqueado durante o processo, spinner ativo e retorno suave em cancelamento. |

---

## 26. Critérios Objetivos de Aprovação da Futura Implementação

A futura auditoria técnica independente do Bloco C homologará a implementação somente se todos os seguintes 15 critérios forem integralmente comprovados:

1. [ ] Dependência oficial `expo-sharing` instalada exclusivamente via `npx expo install expo-sharing` sem conflitos de versão;
2. [ ] Interface `ShareProvider` definida na camada de Aplicação e implementada em Infraestrutura;
3. [ ] Caso de uso `CompartilharPdfOrcamentoUseCase` implementado e desacoplado de detalhes de UI;
4. [ ] Consumo estrito do artefato PDF gerado pelo Bloco B, sem compilação paralela de documentos;
5. [ ] Regeneração transparente operando perfeitamente caso o arquivo em cache tenha sido expurgado;
6. [ ] Content URI segura gerada via `FileSystemFileProvider` sem vazamento de `file://`;
7. [ ] Permissão estrita de leitura temporária configurada sem concessão de escrita;
8. [ ] Share Sheet nativa do Android disparada com título do orçamento e MIME type `application/pdf`;
9. [ ] Cancelamento pelo usuário tratado graciosa e silenciosamente sem alerta de falha;
10. [ ] Ausência de aplicativos compatíveis tratada com feedback amigável sem crash da aplicação;
11. [ ] Prevenção de duplo toque e feedback visual (spinner) ativos durante a preparação;
12. [ ] Zero migrations criadas e zero alterações no modelo de banco de dados;
13. [ ] Zero alterações de regras de negócio ou de templates no Bloco B;
14. [ ] 100% de aprovação na suíte de testes automatizados (unitários, integração e regressão);
15. [ ] Validação empírica aprovada no emulador oficial `Pixel_10` (Android 16 / API 37) com evidências fotográficas arquivadas.

---

## 27. Sequência de Implementação Futura (Proposta — NÃO EXECUTADA)

A implementação do Bloco C deverá seguir estritamente as etapas abaixo, **somente após a homologação deste plano**:

1. **Instalação Controlada:** Executar `npx expo install expo-sharing` e validar o arquivo `package.json`;
2. **Definição de Contratos:** Criar `src/application/interfaces/share-provider.interface.ts`;
3. **Implementação de Infraestrutura:** Criar `src/infrastructure/services/share/expo-sharing.provider.ts`;
4. **Implementação de Caso de Uso:** Criar `src/application/use-cases/orcamento/compartilhar-pdf-orcamento.use-case.ts`;
5. **Implementação de Apresentação:** Criar o hook `src/presentation/hooks/use-compartilhar-pdf.ts`;
6. **Integração na Tela de Orçamento:** Atualizar `app/(app)/orcamentos/[id].tsx` inserindo o botão *"Compartilhar"*;
7. **Desenvolvimento de Testes Automatizados:** Implementar testes de caso de uso e de provedor;
8. **Execução de Baterias de Testes e Tipagem:** Executar `npm run typecheck` e suítes completas de testes;
9. **Build e Teste Nativo no Android:** Compilar APK debug e executar validação dinâmica no `Pixel_10`;
10. **Elaboração do Relatório de Implementação:** Emitir `docs/relatorios/compartilhamento-pdf-implementation-v1.0.md`;
11. **Auditoria Técnica Independente:** Submeter o bloco ao gate de auditoria formal;
12. **Homologação e Congelamento:** Atualizar o inventário para v1.2 e declarar o Bloco C congelado.

---

## 28. Conclusão do Planejamento

O presente planejamento técnico estabelece com rigor analítico, segurança arquitetural e rastreabilidade documental a solução completa para o **Bloco C (Compartilhamento Nativo de PDF)**.

Todos os requisitos canônicos do bloco (**RF82**, **RN81** e a parcela de compartilhamento de **RNF03**) encontram-se plenamente mapeados, mitigando riscos de permissões no Android moderno e preservando integralmente os módulos homologados anteriores.

Nenhuma implementação foi iniciada. O projeto aguarda a avaliação da auditoria técnica independente.

---

STATUS:

PLANEJAMENTO CONCLUÍDO — BLOCO C — AGUARDANDO AUDITORIA
