# Relatório de Homologação Independente do Planejamento Técnico
## Bloco A — Geolocalização e Geocodificação de Clientes v1.1

**Projeto:** Sistema de Orçamento para Jardinagem (Android / React Native)
**Data da Homologação:** 03 de Outubro de 2026
**Documento Auditado:** `docs/planejamento/geocodificacao-localizacao-plan-v1.1.md` (Revisão v1.1)
**Homologação Anterior:** `docs/planejamento/geocodificacao-localizacao-homologacao-v1.0.md` (Pendente de Revisão)
**Responsável:** Auditoria Técnica Independente de Arquitetura de Software
**Parecer Final:** `HOMOLOGADO — PLANEJAMENTO BLOCO A v1.1`

---

## 1. Objetivo

Este documento formaliza o **Parecer Técnico Definitivo de Homologação Independente** da Revisão v1.1 do planejamento técnico do **Bloco A (Geolocalização e Geocodificação de Clientes)**, em estrita observância ao processo canônico de governança do projeto:

`Planejamento v1.0 → Homologação Independente (Pendente) → Revisão v1.1 → Homologação Independente (Aprovado) → Implementação Controlada → Homologação do Módulo → Congelamento`.

O propósito desta auditoria é atestar se o planejamento revisado na versão v1.1 sanou integralmente os achados apontados no parecer `geocodificacao-localizacao-homologacao-v1.0.md`, fornecendo uma especificação técnica sólida, segura, robusta e inequívoca, apta a guiar a implementação sem exigir que os desenvolvedores tomem decisões arquiteturais fundamentais por conta própria.

Em estrita conformidade com as regras do projeto, **esta etapa NÃO implementa código, NÃO instala dependências, NÃO cria migrations e NÃO altera os módulos congelados**.

---

## 2. Documento Auditado

- **Artefato Auditado:** `docs/planejamento/geocodificacao-localizacao-plan-v1.1.md` (Versão 1.1 Canônica);
- **Data de Emissão:** 03 de Outubro de 2026;
- **Escopo:** Requisitos RF10, RF11, RF12, RN06, RN07, RN09 e atributos de qualidade RNF01, RNF03, RNF15, RNF22;
- **Decisões Técnicas Consolidadas:** DECISÃO-GEO-01 a DECISÃO-GEO-09.

---

## 3. Fontes Canônicas Confrontadas

A auditoria confrontou a versão v1.1 diretamente com:
- **Requisitos:** RF v2 (`requisitos_funcionais.docx`), RN v3 (`regras_negocio.docx`), RNF v2 (`requisitos_nao_funcionais.docx`);
- **Modelagem:** UML v3.1 (`classes.puml`, `casos_de_uso.puml`, `sequencia.puml`, `atividades.puml`, `estados.puml`) e DER v1.1 (`der.puml`);
- **Arquitetura e Banco:** Arquitetura Técnica v1.1 (`docs/arquitetura/arquitetura-tecnica-v1.1.md`) e Modelo Físico v1.1 (`supabase/migrations/20260916020500_modelo_fisico_v1_1.sql`);
- **Segurança e Multitenancy:** Auth/RLS Strategy v1.6 e testes pgTAP (`supabase/tests/`);
- **Inventário Oficial de Cobertura:** `docs/planejamento/requisitos-cobertura-status-v1.0.md`;
- **Módulos Congelados:** GAP-AREA-01, GAP-AREA-02, GAP-AREA-04, GAP-AREA-06, GAP-AREA-07, GAP-AREA-08, Clientes e Orçamentos.

---

## 4. Matriz de Avaliação dos Requisitos

A tabela abaixo analisa a cobertura projetada na v1.1 para cada requisito:

| Requisito | Descrição Canônica | Decisão v1.1 | Componente Afetado | Sucesso Projetado | Falha Projetada | Avaliação da Auditoria |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **RF10** | Obter automaticamente lat/lng a partir do endereço cadastrado | DECISÃO-GEO-01, GEO-02, GEO-03, GEO-08, GEO-09 | `CriarClienteUseCase`, `AtualizarClienteUseCase`, `GeocodingProvider` | Preenche `latitude` e `longitude` em `ENDERECO` | Salva endereço com coordenadas nulas | **HOMOLOGADO** |
| **RF11** | Localização do cliente como referência de posição inicial do mapa | DECISÃO-GEO-07 | `areas.tsx`, `mapa.tsx`, `MapaDelimitacao` | Mapa abre centrado no imóvel do cliente em modo Satélite | Fallback para posição padrão | **HOMOLOGADO** |
| **RF12** | Localização manual no mapa quando cliente sem endereço/coordenadas | DECISÃO-GEO-04 | `mapa.tsx`, `MapProvider` | Navegação livre via gestos de Pan e Zoom sobre o satélite | N/A | **HOMOLOGADO** |
| **RN06** | Endereço com lat/lng preenchidas ou em branco em falha externa | DECISÃO-GEO-02, GEO-05, GEO-09 | `ENDERECO`, `cliente.validator.ts` | Coordenadas persistidas no banco | Coordenadas mantidas `NULL` sem erro | **HOMOLOGADO** |
| **RN07** | Abertura do mapa utiliza coordenadas do cliente se disponíveis | DECISÃO-GEO-07 | `app/(app)/orcamentos/mapa.tsx` | Câmera posicionada via `regiaoInicial` | Usa `REGIAO_PADRAO` | **HOMOLOGADO** |
| **RN09** | Localização manual navegando no mapa quando sem coordenadas | DECISÃO-GEO-04 | `MapProvider` | Usuário navega até a propriedade e desenha | Erro no mapa capturado por ErrorBoundary | **HOMOLOGADO** |
| **RNF01** | Usabilidade intuitiva nas operações principais | DECISÃO-GEO-02 | Telas de Cliente e Mapa | Geocodificação transparente no salvamento | Não exige etapas manuais do usuário | **HOMOLOGADO** |
| **RNF03** | Feedback claro em operações relevantes | DECISÃO-GEO-05 | Telas de Cliente | Avisos discretos/toasts | Mensagem em log / aviso não-bloqueante | **HOMOLOGADO** |
| **RNF15** | Feedback de indisponibilidade de serviços externos | DECISÃO-GEO-05, GEO-08 | `GeocodingProvider`, `MapErrorBoundary` | Notifica usuário de indisponibilidade | Falha tratada defensivamente | **HOMOLOGADO** |
| **RNF22** | Tolerância a falhas externas sem travar funções locais | DECISÃO-GEO-05, GEO-08 | `CriarClienteUseCase` | Cliente e endereço textual sempre salvos | Timeout de 5s não trava aplicação | **HOMOLOGADO** |

---

## 5. Verificação dos Achados da Auditoria v1.0

A auditoria verificou o saneamento de cada um dos quatro achados emitidos no parecer anterior:

### 5.1. ACHADO-GEO-01: Incompatibilidade de Restrição de Credencial no GCP
- **Diagnóstico na v1.0:** Proposta de usar Google Geocoding API via HTTP REST com restrição de aplicativo Android (SHA-1/pacote), que é tecnicamente incompatível com requisições REST da web e retornaria `403 RequestDenied`;
- **Solução na v1.1:** A DECISÃO-GEO-01 foi substituída integralmente pela **Estratégia A (Geocoder nativo Android via `expo-location`)**. Essa solução delega a chamada à classe `android.location.Geocoder` do Android SDK, que se comunica diretamente com o Google Play Services nativo do dispositivo. **Nenhuma chave de API existe no app**, eliminando a raiz da vulnerabilidade e o risco de faturamento acidental;
- **Status do Achado:** **SANADO COM SUCESSO (RESOLVIDO).**

### 5.2. ACHADO-GEO-02: Falta de Declaração Explícita de Não-Sobrescrita
- **Diagnóstico na v1.0:** Risco de o desenvolvedor salvar o centro do polígono desenhado manualmente sobre o endereço do cliente;
- **Solução na v1.1:** A DECISÃO-GEO-04 incorporou textualmente a cláusula de invariância espacial (*'A localização manual utilizada para posicionar o mapa ou realizar a delimitação de uma área de trabalho NÃO deve sobrescrever automaticamente as coordenadas geográficas armazenadas do endereço do cliente'*) e estabeleceu a distinção conceitual rigorosa entre os quatro elementos espaciais;
- **Status do Achado:** **SANADO COM SUCESSO (RESOLVIDO).**

### 5.3. ACHADO-GEO-03: Contrato sem Parâmetro de Timeout/Cancelamento
- **Diagnóstico na v1.0:** Interface `GeocodingProvider` sem suporte formal a cancelamento ou timeout;
- **Solução na v1.1:** A interface foi atualizada para aceitar `options?: GeocodificarOptions` com `timeoutMs?: number` e `signal?: AbortSignal`. A DECISÃO-GEO-08 fixou o timeout padrão em 5.000 ms com justificativa técnica;
- **Status do Achado:** **SANADO COM SUCESSO (RESOLVIDO).**

### 5.4. ACHADO-GEO-04: Carregamento do Cliente em `areas.tsx`
- **Diagnóstico na v1.0:** Fluxo de dados entre `areas.tsx` e `mapa.tsx` não especificava como as coordenadas eram extraídas;
- **Solução na v1.1:** A DECISÃO-GEO-07 detalhou a consulta pontual a `clienteService.obterCliente(clienteId)` antes da navegação, injetando `lat` e `lng` via query params sem gerar consultas N+1;
- **Status do Achado:** **SANADO COM SUCESSO (RESOLVIDO).**

---

## 6. Avaliação da DECISÃO-GEO-01 e Classificação de Premissas

A auditoria avaliou a fundamentação da **DECISÃO-GEO-01**, confrontando as premissas técnicas:

1. **Compatibilidade com o Stack do Projeto:** `[FATO DOCUMENTADO]`
   - O projeto utiliza React Native 0.86.3 e Expo SDK 57.0.23. O pacote `expo-location` é um módulo oficial de primeira classe do ecossistema Expo, mantido ativamente e plenamente compatível com o Hermes Engine e New Architecture.
2. **Inexistência de Chave de API:** `[FATO DOCUMENTADO]`
   - A classe `android.location.Geocoder` do Android SDK utiliza os serviços de localização do sistema operacional (Google Play Services) e **não consome nem exige chaves de API** fornecidas pelo aplicativo do desenvolvedor.
3. **Dispensa de Permissões de GPS em Tempo de Execução:** `[FATO DOCUMENTADO]`
   - O método `Location.geocodeAsync(addressString)` realiza a conversão de endereço textual para coordenadas por meio de consulta remota do sistema operacional. Ele **não acessa o hardware de GPS** do dispositivo e, portanto, **não exige** permissão em tempo de execução de localização fina (`ACCESS_FINE_LOCATION`).
4. **Diferenciação Crítica:** `[DECISÃO DO PROJETO]`
   - O planejamento distingue categoricamente **Geocodificação de Endereço Textual** (escopo do Bloco A) de **Geolocalização Atual do Dispositivo GPS** (não utilizada e fora de escopo).
5. **Comportamento em Emulador Android:** `[PREMISSA A VALIDAR EMPIRICAMENTE]`
   - O emulador Android oficial do projeto (`Pixel_10`) possui imagem com Google Play Services ativa. A resposta do `Geocoder` no emulador durante os testes empíricos de homologação será validada na etapa subsequente de implementação controlada.

---

## 7. Avaliação de Segurança

- **Eliminação da Superfície de Ataque:** Como a estratégia nativa não utiliza chaves de API, é nulo o risco de extração de credenciais por engenharia reversa do APK;
- **Preservação do Multitenancy (RLS):** As consultas e atualizações de coordenadas permanecem sob as políticas RLS canônicas da tabela `endereco` (`auth.uid() = cliente.usuario_id`);
- **Comunicação Segura:** As requisições do sistema operacional Android aos servidores de localização do Google utilizam canais TLS protegidos pelo sistema operacional;
- **Status:** **HOMOLOGADO.**

---

## 8. Avaliação de Privacidade e Minimização de Dados (LGPD)

- **Minimização Estrita:** Apenas os campos estritamente necessários para a determinação geográfica são transmitidos (`logradouro, numero, bairro, cidade, estado, cep`);
- **Dados Pessoais Protegidos:** O planejamento proíbe expressamente o envio de dados que possam identificar o titular (`nome`, `documento/CPF`, `telefone`, `email`, `observacoes`);
- **Logs Transparentes:** Proibição de associação de dados pessoais com coordenadas em logs de depuração;
- **Status:** **HOMOLOGADO.**

---

## 9. Avaliação da Arquitetura e Contratos

- **Clean Architecture em 4 Camadas:** Preservada integralmente. O domínio desconhece a biblioteca `expo-location` e o sistema operacional Android;
- **Contrato `GeocodingProvider`:** Completo e extensível, com suporte nativo a `timeoutMs` e `AbortSignal`;
- **Erros Tipados:** `GeocodingError` provê tipagem clara para falhas (`TIMEOUT`, `INDISPONIVEL`, `FORMATO_INVALIDO`, etc.);
- **Intercambialidade:** Caso no futuro seja necessário alternar o provedor de geocodificação, apenas a classe de infraestrutura `ExpoLocationGeocodingProvider` será substituída;
- **Status:** **HOMOLOGADO.**

---

## 10. Avaliação da Consistência de Dados (DECISÃO-GEO-09)

A auditoria verificou minuciosamente a matriz de decisão sobre alteração de endereços:
- **Endereço inalterado:** Não dispara geocodificação, preservando a rede e mantendo as coordenadas já existentes;
- **Endereço alterado com sucesso:** Atualiza com as novas coordenadas;
- **Endereço alterado com falha de geocodificação:** **Limpa as coordenadas antigas para `NULL`**, evitando a anomalia crítica de ter o endereço textual de um imóvel com as coordenadas de outro;
- **Endereço removido:** Limpa coordenadas para `NULL`;
- **Consistência Atômica:** A resolução de geocodificação ocorre em memória antes da persistência, garantindo que o `SupabaseClienteRepository.salvarEndereco` receba os dados finais em uma única chamada de atualização;
- **Status:** **HOMOLOGADO.**

---

## 11. Avaliação do Fluxo RF10 (Geocodificação Automática)

- Integrado aos casos de uso `CriarClienteUseCase` e `AtualizarClienteUseCase`;
- Ordem lógica clara: validação textual → verificação de preenchimento → chamada assíncrona com timeout de 5s → persistência no banco Supabase;
- Resiliência comprovada: falha externa não bloqueia o cadastro do cliente;
- **Status:** **HOMOLOGADO.**

---

## 12. Avaliação do Fluxo RF11 (Posicionamento Inicial)

- Precedência estrita: coordenadas válidas do cliente > região padrão;
- Configuração de `latitudeDelta: 0.003` e `longitudeDelta: 0.003` (~300m) oferece enquadramento perfeito para visualização satélite do lote e seus limites;
- Passagem desacoplada via query params de rota no Expo Router;
- **Status:** **HOMOLOGADO.**

---

## 13. Avaliação do Fluxo RF12 (Fallback Manual)

- Sem coordenadas, o mapa abre na região padrão de São Paulo (`REGIAO_PADRAO`);
- O usuário pode navegar livremente por Pan e Zoom sobre a imagem de satélite;
- O desenho e cálculo de polígonos funcionam de forma idêntica;
- A cláusula de não-sobrescrita impede qualquer alteração indevida nos dados do cliente;
- **Status:** **HOMOLOGADO.**

---

## 14. Avaliação de Resiliência e Tolerância a Falhas

- Atende plenamente a **RNF15** e **RNF22**;
- Timeout padrão de 5.000 ms impede travamento da UI em conexões lentas;
- Falhas de rede ou serviço externo são tratadas de forma defensiva dentro dos casos de uso de cliente;
- **Status:** **HOMOLOGADO.**

---

## 15. Avaliação da Testabilidade

- **Testes de Unidade e Aplicação (Vitest):** A interface `GeocodingProvider` permite mockar 100% dos cenários (sucesso, array vazio, timeout, erro);
- **Testes de Banco (pgTAP):** Constraints de latitude e longitude já cobertas;
- **Testes Empíricos no Android (Pixel_10):** Cenários de teste claramente definidos (Av. Paulista, 1000);
- **Proteção de Regressão:** Bateria existente de 247 testes Vitest e 170 testes pgTAP preservada;
- **Status:** **HOMOLOGADO.**

---

## 16. Avaliação da Matriz de Impacto

- A matriz de impacto detalhada na Seção 14 da v1.1 demonstra que as alterações são mínimas, aditivas e pontuais:
  - Entidades de domínio: **0 alterações**;
  - Repositório e banco: **0 alterações**;
  - `MapProvider`: **0 alterações** (já homologado e congelado);
  - Casos de uso de cliente: alteração aditiva e composicional;
  - Navegação entre telas: ajuste de query params.
- **Status:** **HOMOLOGADO.**

---

## 17. Preservação dos Módulos Congelados

A auditoria confirma que **nenhum módulo homologado será modificado**:
- `GAP-AREA-01` (Desenho e edição de polígonos): **Preservado 100%**;
- `GAP-AREA-02` (Google Maps Android API Key): **Preservado 100%**;
- `GAP-AREA-04` (Cálculo PostGIS geodésico de área): **Preservado 100%**;
- `GAP-AREA-06, 07, 08` (Itens de orçamento e metragens): **Preservados 100%**;
- `Clientes e Orçamentos`: Contratos e regras financeiras mantidos;
- **Status:** **HOMOLOGADO.**

---

## 18. Quadro Consolidado de Achados da Auditoria v1.1

| ID do Achado | Gravidade | Descrição do Problema | Impacto Técnico | Recomendação |
| :--- | :---: | :--- | :--- | :--- |
| **ACHADO-GEO-v1.1-01** | **OBSERVAÇÃO** | Instalação do pacote `expo-location` via CLI do Expo | Nenhum impacto estrutural; recomendação de boas práticas. | Na etapa de implementação, executar `npx expo install expo-location` para garantir a resolução exata da versão homologada para o Expo SDK 57. |

> [!NOTE]
> **Total de Achados Críticos (CRÍTICO):** 0  
> **Total de Achados Graves (MAJOR):** 0  
> **Total de Achados Menores (MINOR):** 0  
> **Total de Observações Técnicas (OBSERVAÇÃO):** 1 (Não-bloqueadora)

---

## 19. Critérios de Aceitação para a Implementação

Ficam homologados os seguintes critérios de aceitação objetivos para a futura implementação:
1. **RF10:** Cadastro de cliente com endereço válido preenche `latitude` e `longitude` no banco; falha externa salva cliente com coordenadas nulas;
2. **RF11:** Abertura do mapa para cliente com coordenadas válidas inicializa a câmera satélite centrada no imóvel do cliente;
3. **RF12:** Abertura do mapa para cliente sem coordenadas inicializa na região padrão e permite navegação e desenho manual sem erros;
4. **DECISÃO-GEO-04:** Delimitação manual de área no mapa não sobrescreve as coordenadas do endereço cadastrado do cliente;
5. **DECISÃO-GEO-08:** Timeout de geocodificação configurado em 5 segundos com tratamento não-bloqueante;
6. **DECISÃO-GEO-09:** Alteração de endereço com falha de geocodificação limpa coordenadas antigas;
7. **Regressão:** 100% dos testes automatizados existentes continuam passando.

---

## 20. Conclusão da Auditoria

A Revisão v1.1 do Planejamento Técnico do Bloco A foi examinada de ponta a ponta e aprovada com louvor. Todos os achados da auditoria v1.0 foram plenamente sanados:
- A adoção do **Geocoder nativo do Android (`expo-location`)** eliminou completamente o risco de exposição de credenciais e a incompatibilidade com as restrições do Google Cloud Platform;
- A invariância espacial e a não-sobrescrita manual foram formalizadas com clareza cristalina;
- Os contratos de interface, resiliência, timeout de 5 segundos e regras de consistência em edição de endereços estão perfeitamente especificados;
- O impacto no banco de dados é rigorosamente zero (reutilização das colunas já existentes) e os módulos de áreas e mapas permanecem 100% preservados;
- Não resta nenhuma decisão arquitetural pendente que exija deliberação discricionária do desenvolvedor.

Por conseguinte, emite-se o parecer oficial favorável:

### **HOMOLOGADO — PLANEJAMENTO BLOCO A v1.1**

---

## 21. Status Final e Regra de Gate

Em estrita consonância com a regra de gate do projeto:
- O gate de planejamento do Bloco A encontra-se **OFICIALMENTE HOMOLOGADO E CONCLUÍDO**;
- Fica **LIBERADO** o avanço para a próxima etapa canônica:
  `IMPLEMENTAÇÃO CONTROLADA — BLOCO A (Geolocalização e Geocodificação de Clientes)`;
- Em estrito respeito às diretrizes do usuário, **esta execução para aqui**. Nenhuma implementação de código, instalação de pacotes ou modificação do repositório deve ser realizada neste turno.

---
*Fim do Relatório Oficial de Homologação Independente v1.1.*