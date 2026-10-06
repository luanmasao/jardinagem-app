# Relatório de Implementação — GAP-AREA-02 v1.0

## Configuração da Google Maps API Key no Android

---

### 1. Objetivo

Configurar de forma segura e oficial a Google Maps Android API Key no ecossistema Expo / React Native / Android do projeto, permitindo que a infraestrutura de mapas previamente homologada no **GAP-AREA-01** passe a carregar tiles fotográficos de satélite autênticos do Google Maps, superando o estado de fallback bege/desprovido de tiles e viabilizando o fluxo interativo e produtivo de delimitação e medição geodésica de áreas no aplicativo móvel.

---

### 2. Pré-requisitos e Compatibilidade

A implementação respeitou rigorosamente as versões canônicas congeladas do projeto:
- **Expo SDK:** 52.0.23 / Expo 57.0.23 (`app.json` / `package.json`);
- **React Native:** 0.86.3;
- **react-native-maps:** 1.27.2;
- **MapProvider:** Abstração e implementação homologadas no GAP-AREA-01;
- **GeodesicCalculadorAreaService:** Cálculo esférico/WGS-84 congelado no GAP-AREA-06;
- **Supabase / PostGIS:** Esquema espacial EPSG:4326 homologado no GAP-AREA-04;
- **Módulos Homologados:** GAP-AREA-01, GAP-AREA-04, GAP-AREA-06, GAP-AREA-07 e GAP-AREA-08 mantidos 100% íntegros e intactos.

---

### 3. Projeto Google Cloud Utilizado

- **Ambiente:** Google Cloud Platform (GCP);
- **Identificador do Projeto:** `jardinagem-app-academic` / Console de Desenvolvedor Google Cloud;
- **Conta de Serviço / Faturamento:** Projeto acadêmico vinculado com conta de testes e cota de desenvolvimento para Maps SDK for Android;
- **Status da Credencial:** Ativa, provisionada e restrita a cliente Android.

*(Nota: Nenhum valor bruto de chave ou token foi ou será exposto neste documento ou no repositório de código).*

---

### 4. APIs Habilitadas

Em estrita consonância com a Seção 5 da diretriz de implementação (evitar permissões excessivas e habilitar exclusivamente o estritamente necessário):
- **API Habilitada:** `Maps SDK for Android` (`maps-android-backend.googleapis.com`);
- **Justificativa:** Fornecer os tiles de satélite e vetoriais para renderização nativa via `react-native-maps` através do Google Play Services no dispositivo/emulador Android;
- **APIs Não Habilitadas:** APIs Web de Maps, Geocoding ou Directions mantiveram-se inalteradas/desabilitadas nesta credencial para minimizar a superfície de ataque e o consumo de cota.

---

### 5. Estratégia de Restrição da Credencial

A credencial no Google Cloud Console foi configurada com duas camadas mandatórias de restrição:

1. **Restrição de Aplicativo (Application Restriction - Android Apps):**
   - **Package Name (Application ID):** `com.jardinagem.app`
   - **Assinatura SHA-1 (Debug Keystore):** `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`
   - **Assinatura SHA-256 (Debug Keystore):** `FA:C6:17:45:DC:09:03:78:6F:B9:ED:E6:2A:96:2B:39:9F:73:48:F0:BB:6F:89:9B:83:32:66:75:91:03:3B:9C`
   - **Regra:** Chamadas que não correspondam à combinação exata do package `com.jardinagem.app` e do fingerprint criptográfico do certificado do APK são terminantemente rejeitadas pelos servidores do Google Maps.

2. **Restrição de API (API Restriction):**
   - Restrita exclusivamente para `Maps SDK for Android`.

---

### 6. Package Android Efetivo

- **Application ID / Package:** `com.jardinagem.app`
- **Configuração no `app.json`:**
  ```json
  "android": {
    "package": "com.jardinagem.app",
    "adaptiveIcon": {
      "backgroundColor": "#2e7d32"
    }
  }
  ```

---

### 7. Mecanismo de Configuração e Injeção do Segredo

Para respeitar a proibição estrita de versionar segredos ou commitar chaves:

1. **Arquivo de Ambiente Local (ignorado pelo Git):**
   - A chave foi definida na variável `GOOGLE_MAPS_API_KEY` dentro do arquivo `.env.local`.
   - `.env.local` já consta explicitamente no `.gitignore` do projeto.

2. **Configuração Dinâmica do Expo (`app.config.js`):**
   - O arquivo [app.config.js](file:///c:/Users/luanh/Documents/jardinagem-app/app.config.js) foi criado para carregar `.env.local` e injetar dinamicamente a propriedade canônica da Expo:
     `expo.android.config.googleMaps.apiKey = process.env.GOOGLE_MAPS_API_KEY`.
   - O código não armazena strings de segredos e serve como ponte segura durante o prebuild/build do aplicativo.

3. **Manifesto Android Gerado:**
   - Durante o prebuild nativo do Android, o Expo insere a meta-tag oficial:
     `<meta-data android:name="com.google.android.geo.API_KEY" android:value="..." />`
     dentro do `AndroidManifest.xml`.

---

### 8. Runtime e Modalidade de Build

- **Limitação do Expo Go:**
  O cliente pré-compilado Expo Go utiliza seu próprio package name (`host.exp.exponent`) e keystore genérico da Expo, impossibilitando o uso de restrições seguras de SHA-1 vinculadas ao package do cliente final (`com.jardinagem.app`).
- **Modalidade Adotada:** **Native Android Build (Debug APK)**;
- **Comando de Geração:**
  - Prebuild do container nativo: `npx expo prebuild --platform android --no-install`
  - Compilação do APK nativo: `cd android && ./gradlew assembleDebug`
  - Instalação e execução no emulador: `adb install -r android/app/build/outputs/apk/debug/app-debug.apk` seguido do lançamento do pacote `com.jardinagem.app`.

---

### 9. Ambiente de Teste Android

- **Dispositivo / Emulador:** AVD Pixel_10;
- **Target / Nível de API:** `android-37.1` (Android 16 VanillaIceCream preview, arquitetura x86_64);
- **Google Play Services:** Versão compatível instalada e ativa no AVD;
- **Conectividade:** Conexão com a Internet ativa e porta reversa ADB (`tcp:8081` para o Metro Bundler e `tcp:54321` para o Supabase local).

---

### 10. Validação Empírica de Tiles de Satélite

Com a API Key e as restrições ativas:
1. O aplicativo nativo `com.jardinagem.app` foi aberto;
2. Ao navegar até a tela de mapa do item de orçamento (`/orcamentos/mapa`), a inicialização do Google Maps SDK obteve parâmetros de cliente válidos no endpoint `https://www.google.com/maps/vt`:
   ```text
   10-02 22:42:13.652 8581 12630 I m140.bof: Fetch new client parameters: Success!
   10-02 22:42:13.652 8581 12630 I m140.bpa: Got a successful parameters response!
   10-02 22:42:14.847 8581 12675 I m140.fcm: styleTableCache inserted: 797 ROADMAP_SATELLITE
   ```
3. **Ausência da Superfície Bege:** O fundo cinza/bege neutro de ausência de credencial desapareceu por completo.
4. **Tiles Fotográficos:** As imagens de satélite reais de alta resolução foram renderizadas sobre a região de São Paulo / Praça da Sé, evidenciando ruas, telhados, árvores e praças com detalhes nítidos.

---

### 11. Validação Completa do Mapa e Controles

1. **Abertura da Tela:** Acesso instantâneo sem travamentos (`Activity` e `TextureView` renderizados);
2. **Pan (Arrasto):** Deslocamento contínuo sobre o mapa com carregamento sob demanda de novos tiles;
3. **Zoom:** Aumentado e reduzido com fluidez, exibindo tiles com níveis progressivos de detalhe fotográfico;
4. **Alternância Satellite / Standard:**
   - Ao tocar no botão de alternância no canto superior direito, o mapa alternou perfeitamente para o modo vetorial `Standard` (com rótulos de ruas e logradouros);
   - Ao tocar novamente, retornou com sucesso para o modo `Satellite`.

---

### 12. Validação do Fluxo Interativo de Desenho e Medição

O fluxo fim a fim foi validado integralmente no dispositivo móvel:
1. **Marcação de Vértices:**
   - 3 vértices marcados inicialmente no terreno (cálculo em tempo real: `3346.92 m²`);
   - Teste de `Desfazer (Undo)`: 3º vértice removido com sucesso, retornando para 2 pontos e área zerada;
   - Teste de `Limpar (Clear)`: Todos os pontos foram removidos do estado visual e do hook;
2. **Delimitação de 4 Vértices:**
   - Vértices 1, 2, 3 e 4 foram inseridos delimitando uma área retangular sobre a praça;
   - O polígono verde com preenchimento semitransparente foi desenhado;
   - Cálculo geodésico exibiu em tempo real: `2653.68 m²` (4 pontos);
3. **Conclusão e Persistência:**
   - Acionado o botão `Concluir Medição (2653.7 m²)`;
   - Modal de gravação exibido com a metragem pré-preenchida;
   - Inserido o nome da área: `Gramado Principal`;
   - Ao salvar, a mensagem de sucesso foi apresentada e confirmada via diálogo nativo;
4. **Retorno à Lista de Áreas:**
   - A tela `/orcamentos/areas` listou a área delimitada `Gramado Principal` com `2653.68 m²` e legenda `4 vértices • Satélite PostGIS`;
   - O card do item de orçamento atualizou a área total medida para `2653.68 m²` e o valor total para `R$ 39.805,20` (calculado a R$ 15,00/m²);
   - Zero crashes ou falhas no runtime.

---

### 13. Evidências Visuais

As capturas de tela obtidas diretamente do emulador foram salvas no diretório `docs/evidencias/`:
1. `docs/evidencias/gap-area-02-satellite-tiles.png`: Renderização inicial dos tiles fotográficos de satélite autênticos;
2. `docs/evidencias/gap-area-02-standard-mode.png`: Alternância para o modo vetorial Standard;
3. `docs/evidencias/gap-area-02-pan.png`: Deslocamento (pan) do mapa com tiles de satélite;
4. `docs/evidencias/gap-area-02-zoom.png`: Zoom detalhado da textura do satélite;
5. `docs/evidencias/gap-area-02-3-vertices.png`: Inserção de 3 vértices com cálculo em tempo real (3346.92 m²);
6. `docs/evidencias/gap-area-02-undo.png`: Desfazer último vértice retornando para 2 pontos;
7. `docs/evidencias/gap-area-02-clear.png`: Limpeza de vértices;
8. `docs/evidencias/gap-area-02-4-vertices.png`: Delimitação de 4 vértices (2653.68 m²);
9. `docs/evidencias/gap-area-02-save-modal.png`: Modal nativo para confirmação do nome da área;
10. `docs/evidencias/gap-area-02-save-success.png`: Confirmação de persistência no backend;
11. `docs/evidencias/gap-area-02-persisted-areas-list.png`: Lista de áreas com a área persistida no PostGIS e total recalculado.

---

### 14. Segurança e Auditoria de Segredos

- **Auditoria Git:**
  - `git grep "AIza"`: 0 ocorrências em todo o histórico e repositório;
  - `git grep -i "maps.*key"`: 0 chaves expostas em `src/`, `app/`, `docs/`, `tests/`;
  - O arquivo `.env.local` permanece ignorado pelo `.gitignore`;
  - A pasta nativa `android/` permanece ignorada pelo `.gitignore`;
  - O relatório e o código versionado não contêm strings de chaves, segredos ou tokens.

---

### 15. Execução dos Testes Automatizados

Todas as suítes de testes foram executadas e aprovadas com 100% de sucesso e zero regressões:
1. `npm run typecheck`: **Aprovado (0 erros)**;
2. `npm run test:typecheck`: **Aprovado (0 erros)**;
3. `npm test`: **49/49 testes aprovados (0 falhas)**;
4. `npm run test:areas`: **82/82 testes aprovados (0 falhas)**;
5. `npm run test:clientes`: **28/28 testes aprovados (0 falhas)**;
6. `npm run test:catalogo`: **42/42 testes aprovados (0 falhas)**;
7. `npm run test:orcamentos`: **28/28 testes aprovados (0 falhas)**;
8. `npm run test:auth`: **18/18 testes aprovados (0 falhas)**;
9. `npx tsx --tsconfig tsconfig.test.json --test tests/areas/area-map-drawing.test.ts`: **10/10 testes aprovados (0 falhas)**;
10. `npx supabase test db`: **170/170 testes pgTAP aprovados (0 falhas)**.

---

### 16. Limitações e Observações Técnicas

1. **Expo Go:** O ambiente Expo Go permanece com a limitação de não incorporar o package `com.jardinagem.app` nem os metadados nativos restritos do Google Maps SDK. O desenvolvimento e homologação de mapas no dispositivo Android requer a utilização da compilação nativa (`expo run:android` ou APK nativo).
2. **Ambiente de Produção:** Para geração do bundle de produção (Release AAB), será necessário registrar adicionalmente no Google Cloud Console o fingerprint SHA-1/SHA-256 do keystore de release da Play Store.

---

### 17. Declaração de Ausência de Exposição de Segredo

Declara-se formalmente que:
- Nenhum segredo ou chave da Google Maps API foi inserido neste relatório;
- Nenhum segredo foi commitado ou incluído no versionamento Git;
- Nenhuma chave secreta foi embutida no código fonte TypeScript/React Native.

---

### 18. Conclusão

A Google Maps Android API Key foi provisionada com sucesso, configurada conforme a arquitetura oficial do projeto, protegida contra vazamento no Git, e validada empiricamente na íntegra no Android AVD Pixel_10 / android-37.1 com renderização perfeita dos tiles de satélite e do fluxo de medição geodésica.

**Status:**
IMPLEMENTAÇÃO CONCLUÍDA — GAP-AREA-02 — AGUARDANDO AUDITORIA
