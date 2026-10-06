# Parecer de Auditoria Técnica Independente — Planejamento Bloco C v1.0
## Compartilhamento Nativo de PDF de Orçamentos

**Projeto:** Sistema de Orçamento para Jardinagem (Android / React Native / Expo SDK 57)  
**Documento Auditado:** `docs/planejamento/compartilhamento-pdf-plan-v1.0.md`  
**Data da Auditoria:** 05 de Outubro de 2026  
**Função do Auditor:** Auditor Técnico Independente / Arquiteto de Software / Revisor de Conformidade  
**Veredito Oficial:** `REPROVADO PARA CORREÇÃO`  
**Status da Auditoria:** `AUDITORIA DE PLANEJAMENTO CONCLUÍDA — BLOCO C — REPROVADO PARA CORREÇÃO`

---

## 1. Sumário Executivo

A auditoria técnica independente examinou detalhadamente o documento de planejamento `compartilhamento-pdf-plan-v1.0.md`, confrontando suas premissas arquiteturais, decisões técnicas e contratos de código contra:
1. As fontes canônicas de requisitos (**RF82**, **RN81**, **RNF03**);
2. A Arquitetura Técnica v1.1 e as regras de governança estipuladas em `AGENTS.md` e `architecture.md`;
3. A implementação real do módulo `expo-sharing` (versão vinculada ao Expo SDK 57: `57.0.20`), inspecionando diretamente seu código nativo Android (`SharingModule.kt`, `AndroidManifest.xml` e `Sharing.types.d.ts`);
4. Os limites de interoperabilidade do sistema operacional Android (especialmente o comportamento de `Intent.ACTION_SEND`, `Intent.createChooser` e permissões de `FileProvider` no Android API 37).

### Síntese dos Achados:
Embora o planejamento apresente excelente estruturação conceitual, correto isolamento do Domínio e firme respeito ao congelamento do Bloco B, a auditoria identificou **1 achado CRÍTICO, 4 achados MAJOR, 3 achados MINOR e 1 OBSERVAÇÃO** que inviabilizam a homologação da versão v1.0:

1. **[CRÍTICO] Inviabilidade Técnica da Detecção de Cancelamento via `expo-sharing` no Android:** O planejamento fundamenta o atendimento a RNF03 na suposição de que `expo-sharing` rejeita a Promise com mensagens de erro (`"dismissed"`, `"canceled"`, `"User did not share"`). A inspeção direta do código nativo em `SharingModule.kt` comprovou que o módulo Android **sempre resolve a Promise com sucesso (`null`)**, sem inspecionar `resultCode` da Activity, tornando impossível preencher o status `'CANCELADO'` por captura de erro.
2. **[MAJOR] Identificação Incorreta do FileProvider e Authority:** O plano afirma que `expo-sharing` utiliza o `FileSystemFileProvider` (`com.jardinagem.app.FileSystemFileProvider`). A inspeção comprovou que a biblioteca registra e utiliza seu próprio provider nativo: `expo.modules.sharing.SharingFileProvider` com a autoridade `${applicationId}.SharingFileProvider`.
3. **[MAJOR] Omissão de Estratégia para o Nome do Arquivo Compartilhado (`nomeArquivo`):** A API `Sharing.shareAsync` não aceita parâmetro de nome de arquivo. Como o Bloco B gera o PDF temporário com nome em hash aleatório (`Print/uuid.pdf`), o documento seria entregue aos aplicativos de destino (WhatsApp, Gmail, etc.) com esse nome ilegível. O plano não previu a renomeação/cópia prévia para o nome institucional canônico (`Orcamento_<numero>.pdf`).
4. **[MAJOR] Violação de Camadas no Caso de Uso de Aplicação:** O caso de uso `CompartilharPdfOrcamentoUseCase` importa diretamente o módulo de infraestrutura `expo-file-system/legacy` para checar existência física de arquivos, quebrando a inversão de dependência da Clean Architecture em 4 camadas.
5. **[MAJOR] Inversão de Governança na Rotulação de Decisões:** O planejamento v1.0 nomeia a Seção 8 como *"Decisão Arquitetural Homologada"*, conferindo status de homologação a decisões que ainda se encontravam sob auditoria.

Por conseguinte, o planejamento técnico v1.0 é **REPROVADO PARA CORREÇÃO**, exigindo a emissão de uma revisão revisada (v1.1) saneando todos os pontos impeditivos antes da autorização de implementação.

---

## 2. Veredito da Auditoria

### **REPROVADO PARA CORREÇÃO**

O planejamento do Bloco C **não está autorizado para implementação** até que a revisão v1.1 seja produzida e reauditada com parecer favorável.

---

## 3. Tabela Consolidada de Achados

| ID | Severidade | Seção do Plano | Evidência / Fato Técnico | Impacto no Projeto | Correção Exigida |
| :---: | :---: | :---: | :--- | :--- | :--- |
| **ACHADO-SHARE-01** | **CRÍTICO** | 9.2, 10.1, 16 | Em `SharingModule.kt`, `OnActivityResult` executa `pendingPromise?.resolve(null)` incondicionalmente, sem verificar `resultCode`. `shareAsync` resolve normalmente (`Promise<void>`) tanto ao compartilhar quanto ao cancelar. | O bloco `catch` planejado para capturar cancelamento nunca será executado no Android. O app registrará falsamente `COMPARTILHADO` mesmo se o usuário cancelar, violando a máquina de estados de RNF03. | Redesenhar o contrato de `ResultadoCompartilhamento` e a máquina de estados de RNF03 para refletir o comportamento real do Android: a Promise resolve ao concluir/fechar a Share Sheet (ex: status `'DISPARADO'` ou sucesso de abertura). Eliminar a heurística frágil de strings em catch block. |
| **ACHADO-SHARE-02** | **MAJOR** | 8, 12, 14, 20 | `expo-sharing` declara no `AndroidManifest.xml` a classe `expo.modules.sharing.SharingFileProvider` com authority `${applicationId}.SharingFileProvider`. | O plano descreve que a autoridade é `FileSystemFileProvider`. Essa divergência gera inconsistência documental e causará falhas em testes de integração e verificações de segurança. | Corrigir toda a documentação para apontar formalmente a autoridade `${applicationId}.SharingFileProvider` (`com.jardinagem.app.SharingFileProvider`). |
| **ACHADO-SHARE-03** | **MAJOR** | 9.1, 10.1 | `SharingOptions` aceita apenas `mimeType`, `dialogTitle` e `UTI`. Não existe opção `nomeArquivo`. O `ExpoPrintPdfGenerator` gera `Print/<hash>.pdf`. | O arquivo compartilhado no WhatsApp/Gmail exibirá o hash interno (ex: `12345-abc.pdf`) em vez de `Orcamento_ORC-2026-001.pdf`, degradando a identidade visual do profissional. | Planejar etapa prévia em Infraestrutura para copiar/salvar o arquivo no cache com o nome sanitizado canônico antes de chamar `Sharing.shareAsync`. |
| **ACHADO-SHARE-04** | **MAJOR** | 10.1 | `CompartilharPdfOrcamentoUseCase` importa `import * as FileSystem from 'expo-file-system/legacy'` diretamente na camada de Aplicação. | Violação explícita da Arquitetura Técnica v1.1 e do princípio de inversão de dependência da Clean Architecture. A camada Application não pode acoplar-se a SDKs nativos. | Mover a verificação de existência do arquivo e manipulação de cache para um método da porta de Infraestrutura (`ShareProvider` ou serviço de armazenamento). |
| **ACHADO-SHARE-05** | **MAJOR** | 1, 8 | A Seção 8 intitula-se *"Decisão Arquitetural Homologada"* e declara *"Ficam registradas e numeradas as 10 Decisões Técnicas Oficiais do Bloco C"*. | Inversão do processo de governança canônico. Nenhuma decisão de um documento "Aguardando Auditoria" pode ser tratada como homologada antes da emissão deste parecer. | Alterar o título e os textos da Seção 8 para *"Decisões Técnicas Propostas / Planejadas"*. |
| **ACHADO-SHARE-06** | **MINOR** | 7, 20 | O arquivo `node_modules/expo/bundledNativeModules.json` (SDK 57.0.23) fixa categoricamente `"expo-sharing": "~57.0.20"`. O plano citava `"~57.0.x"` ou `"~57.0.4"`. | Imprecisão de dependência em ambiente de governança estrita. | Especificar taxativamente a dependência `"expo-sharing": "~57.0.20"`. |
| **ACHADO-SHARE-07** | **MINOR** | 7.1, 12, 13 | O plano afirma que `expo-sharing` injeta `ClipData.newUri()`. O código de `SharingModule.kt` revela que ele utiliza `context.grantUriPermission(packageName, contentUri, Intent.FLAG_GRANT_READ_URI_PERMISSION)` iterando sobre as activities elegíveis. | Descrição técnica incorreta do mecanismo interno da biblioteca. | Ajustar a descrição do mecanismo Android no documento para refletir o uso real de `grantUriPermission()` por pacote consultado. |
| **ACHADO-SHARE-08** | **MINOR** | 19, 27 | O documento refere-se ao alvo como *"Pixel_10 (Android 16 / API Level 37)"*. | A API Level 37 corresponde oficialmente ao Android 17 (Baklava preview / 17), e não ao Android 16 (API 36). | Corrigir a nomenclatura para Android 17 (API Level 37). |
| **ACHADO-SHARE-09** | **OBSERVAÇÃO** | 11, 24 | O documento utiliza o termo *"byte-consistente"* para o cenário de regeneração de PDF. | Um PDF regenerado por `printToFileAsync` possui conteúdo semântico e visual 100% idêntico, mas seu hash binário difere devido a timestamps e metadados de criação do motor de impressão. | Utilizar a terminologia técnica precisa: *"conteúdo-consistente / visualmente e financeiramente idêntico"*, reservando *"byte-idêntico"* apenas para a reutilização do arquivo em cache pré-existente. |

---

## 4. Auditoria da Decisão sobre `expo-sharing` (DECISÃO-SHARE-01)

A auditoria confirma que a escolha de **`expo-sharing`** em detrimento de `expo-intent-launcher` é **plenamente justificada e acertada**:
- **Motivo Arquitetural Comprovado:** Para compartilhar arquivos através de `ACTION_SEND` com múltiplos aplicativos no Android, é compulsório conceder permissões de leitura seguras via `FileProvider`. O `expo-intent-launcher` exigiria gerenciamento manual de concessões por pacote que o JavaScript não consegue realizar de forma limpa.
- **Implementação do `expo-sharing`:** A versão oficial correspondente ao Expo SDK 57 do projeto é rigorosamente **`~57.0.20`** (conforme verificado em `node_modules/expo/bundledNativeModules.json`).
- **Opções Suportadas:** A assinatura real de `Sharing.shareAsync` no Expo 57 suporta:
  - `mimeType?: string`
  - `dialogTitle?: string`
  - `UTI?: string` (relevante apenas para iOS)
- **Correção Necessária (ACHADO-SHARE-03):** Como `shareAsync` não aceita parâmetro de renomeação de arquivo, a responsabilidade de garantir que o arquivo possua o nome institucional correto (`Orcamento_<numero>.pdf`) deve ser assumida pela camada de Infraestrutura antes da invocação do compartilhamento.

---

## 5. Auditoria Específica do Cancelamento da Share Sheet e RNF03

Este ponto é o motivador central da classificação **CRÍTICA** (ACHADO-SHARE-01):

### 5.1. Comportamento Real do Android e do `expo-sharing`
No Android, a abertura de uma Share Sheet via `Intent.createChooser` inicia uma Activity do sistema.
Quando o usuário interage com essa Activity:
1. Se ele seleciona um aplicativo (ex: WhatsApp): a Activity do chooser finaliza e retorna para o app chamador;
2. Se ele toca fora da Share Sheet, arrasta para baixo ou aperta o botão Voltar (Back): a Activity do chooser também finaliza e retorna para o app chamador.

No código de `SharingModule.kt`:
```kotlin
OnActivityResult { _, (requestCode) ->
  if (requestCode == REQUEST_CODE && pendingPromise != null) {
    pendingPromise?.resolve(null)
    pendingPromise = null
  }
}
```
O listener do Expo **não avalia se o resultado foi `Activity.RESULT_OK` ou `Activity.RESULT_CANCELED`**. Ele resolve a Promise com `null` em ambos os casos.
Além disso, nas versões modernas do Android, o sistema não informa aos aplicativos chamadores qual app foi escolhido pelo usuário para proteger a privacidade do usuário contra rastreamento de terceiros (a menos que seja utilizado um `ChooserTargetService` / `IntentSender`, não suportado por módulos genéricos).

### 5.2. Impacto no Planejamento v1.0
O planejamento v1.0 propôs:
```ts
} catch (error: unknown) {
  const msg = error instanceof Error ? error.message : String(error);
  if (msg.includes('dismissed') || msg.includes('canceled') || msg.includes('cancelled') || msg.includes('User did not share')) {
    return { sucesso: true, status: 'CANCELADO' };
  }
```
**Essa lógica é uma falácia técnica no Android:**
- O bloco `catch` **nunca será acionado** no cancelamento, porque o Android/Expo não lança erro ao fechar a folha.
- O método sempre retornará `status: 'COMPARTILHADO'`.
- Os testes unitários propostos no planejamento que simulam rejeição com erro `'dismissed'` testam apenas um mock artificial que não corresponde à realidade do runtime.

### 5.3. Solução Arquitetural Exigida para o Planejamento v1.1
Para manter o alinhamento com RNF03 sem inventar garantias que a plataforma não oferece:
1. **Redefinir o Contrato de Retorno:** A operação de compartilhamento deve modelar o resultado real da plataforma:
   - `sucesso: true` (a folha nativa foi aberta e a interação do usuário foi encerrada com sucesso pelo sistema operacional);
   - `sucesso: false` (o compartilhamento não pôde ser iniciado por ausência de apps, erro de arquivo ou falha de sistema).
2. **Revisar a Máquina de Estados:** Eliminar a distinção artificial entre `'COMPARTILHADO'` e `'CANCELADO'`, adotando um estado unificado de retorno ao estado ocioso após o fechamento da Share Sheet pelo usuário, restaurando os botões sem emitir mensagens enganosas de "Envio confirmado com sucesso".

---

## 6. Auditoria de FileProvider, URI e Permissões

### 6.1. Authority Real
A autoridade registrada pelo `expo-sharing` no manifesto da biblioteca é:
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
No pacote do projeto (`com.jardinagem.app`), a autoridade real é:
**`com.jardinagem.app.SharingFileProvider`**.
O planejamento deve substituir todas as menções a `FileSystemFileProvider` por `SharingFileProvider`.

### 6.2. Concessão de Permissões
A auditoria verificou em `SharingModule.kt` que a concessão ocorre através de:
```kotlin
val resInfoList = context.packageManager.queryIntentActivities(intent, PackageManager.MATCH_DEFAULT_ONLY)
resInfoList.forEach {
    val packageName = it.activityInfo.packageName
    context.grantUriPermission(packageName, contentUri, Intent.FLAG_GRANT_READ_URI_PERMISSION)
}
```
Esse mecanismo é altamente seguro e restritivo, garantindo que apenas as aplicações cadastradas no dispositivo para manipular o MIME type `application/pdf` recebam autorização de leitura temporária.

---

## 7. Auditoria Arquitetural das Camadas (Clean Architecture)

A análise da árvore de camadas identificou:
- **Presentation:** O hook `useCompartilharPdf` e os botões em `orcamentos/[id].tsx` estão bem posicionados e respeitam o padrão do projeto.
- **Domain:** **100% puro e preservado**. Zero alterações em entidades, regras ou cálculos.
- **Infrastructure:** `ExpoSharingShareProvider` isola corretamente a SDK do Expo.
- **Application (VIOLAÇÃO DETECTADA — ACHADO-SHARE-04):**
  No arquivo `CompartilharPdfOrcamentoUseCase` (Seção 10.1 do plano), há a importação:
  `import * as FileSystem from 'expo-file-system/legacy';`
  Isso acopla o caso de uso diretamente à biblioteca física do Expo.
  **Correção:** A validação de existência do arquivo e a preparação do arquivo com nome correto devem ser transferidas para a camada de Infraestrutura, seja através do próprio `ShareProvider` ou de uma abstração de arquivo.

---

## 8. Matriz de Requisitos × Evidências Auditadas

| Requisito Canônico | Status no Planejamento v1.0 | Parecer da Auditoria | Justificativa Técnica |
| :--- | :---: | :---: | :--- |
| **RF82** (Compartilhar PDF via mecanismos do dispositivo) | Proposto | **CONFORME COM RESSALVA** | O fluxo atende ao requisito canônico via Share Sheet nativa, mas necessita da correção do nome do arquivo (ACHADO-SHARE-03). |
| **RN81** (PDF compartilhado pelos mecanismos disponíveis) | Proposto | **CONFORME COM RESSALVA** | O documento do Bloco B é preservado e transmitido íntegro, dependendo da correção do authority e nome de arquivo. |
| **RNF03** (Feedback da operação de compartilhamento) | Proposto | **NÃO CONFORME (CRÍTICO)** | A máquina de estados tenta tratar cancelamento por mensagens de erro inexistentes no Android, gerando inconsistência de feedback (ACHADO-SHARE-01). |

---

## 9. Lista de Correções Obrigatórias para a Versão v1.1

Para que o Planejamento Técnico do Bloco C obtenha parecer de **HOMOLOGADO**, a versão revisada (`compartilhamento-pdf-plan-v1.1.md`) deve obrigatoriamente incorporar as seguintes correções:

1. **[CORREÇÃO-01 / ACHADO-SHARE-01]:** Redesenhar o contrato de `ResultadoCompartilhamento` e a máquina de estados de RNF03, reconhecendo que no Android o fechamento da Share Sheet resolve a Promise sem diferenciar se o usuário enviou ou cancelou o diálogo. Eliminar o bloco `catch` heurístico de strings.
2. **[CORREÇÃO-02 / ACHADO-SHARE-02]:** Atualizar toda a documentação, diagramas e referências para indicar a autoridade real `com.jardinagem.app.SharingFileProvider`.
3. **[CORREÇÃO-03 / ACHADO-SHARE-03]:** Planejar na camada de Infraestrutura a cópia/preparação do PDF temporário para que ele possua o nome canônico `Orcamento_<numero>.pdf` antes de ser submetido ao `Sharing.shareAsync`.
4. **[CORREÇÃO-04 / ACHADO-SHARE-04]:** Remover a importação de `expo-file-system` do caso de uso `CompartilharPdfOrcamentoUseCase`, encapsulando a verificação de arquivos na camada de Infraestrutura.
5. **[CORREÇÃO-05 / ACHADO-SHARE-05]:** Renomear a Seção 8 de *"Decisão Arquitetural Homologada"* para *"Decisões Técnicas Propostas / Planejadas"*.
6. **[CORREÇÃO-06 / ACHADO-SHARE-06]:** Especificar formalmente a dependência `"expo-sharing": "~57.0.20"`.
7. **[CORREÇÃO-07 / ACHADO-SHARE-07]:** Ajustar a explicação do mecanismo Android para registrar o uso de `grantUriPermission()` por pacote elegível.
8. **[CORREÇÃO-08 / ACHADO-SHARE-08]:** Corrigir a referência da plataforma para Android 17 (API Level 37).
9. **[CORREÇÃO-09 / ACHADO-SHARE-09]:** Ajustar a terminologia de *"byte-consistente"* para *"conteúdo-consistente / visualmente e financeiramente idêntico"* na regeneração.

---

## 10. Conclusão Formal

O Planejamento Técnico do Bloco C v1.0 apresenta uma arquitetura conceitualmente sólida, mantém total respeito aos módulos congelados (Auth, Clientes, Catálogo, Orçamentos, Áreas e Bloco B) e adota a biblioteca correta (`expo-sharing`).

Contudo, em cumprimento ao rigor da auditoria técnica independente, a identificação de um achado impeditivo de runtime Android relativo ao cancelamento (CRÍTICO), somada às inconsistências documentais de FileProvider, nome de arquivo e acoplamento na camada de Aplicação (MAJOR), **impede a homologação prematura desta versão**.

A emissão deste parecer protege o projeto contra falhas em tempo de execução e garante que a implementação futura seja segura, precisa e estritamente aderente ao comportamento real da plataforma.

---

STATUS:

AUDITORIA DE PLANEJAMENTO CONCLUÍDA — BLOCO C — REPROVADO PARA CORREÇÃO
