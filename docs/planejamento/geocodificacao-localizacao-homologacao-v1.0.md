# Relatório de Homologação Independente do Planejamento Técnico
## Bloco A — Geolocalização e Geocodificação de Clientes v1.0

**Projeto:** Sistema de Orçamento para Jardinagem (Android / React Native)
**Data da Homologação:** 03 de Outubro de 2026
**Documento Auditado:** `docs/planejamento/geocodificacao-localizacao-plan-v1.0.md` (v1.0)
**Responsável:** Auditoria Técnica Independente de Arquitetura de Software
**Parecer Final:** `PENDENTE DE REVISÃO`

---

## 1. Objetivo

Este documento formaliza o **Parecer Técnico de Homologação Independente** do planejamento técnico do **Bloco A (Geolocalização e Geocodificação de Clientes v1.0)**, em estrita observância ao processo canônico de governança do projeto:

`Planejamento → Decisão Técnica → Auditoria/Homologação do Plano → Implementação Controlada → Homologação do Módulo → Congelamento`.

A pergunta central desta auditoria é:
> *'O planejamento fornece informação suficiente, tecnicamente viável e segura para que outro desenvolvedor implemente o Bloco A sem precisar tomar decisões arquiteturais fundamentais por conta própria e sem gerar vulnerabilidades ou falhas em tempo de execução?'*

Em estrita conformidade com as diretrizes do projeto, esta etapa **não implementa código, não instala dependências, não cria migrations e não altera os módulos congelados**.

---

## 2. Planejamento Auditado

- **Artefato Auditado:** `docs/planejamento/geocodificacao-localizacao-plan-v1.0.md`;
- **Data de Emissão do Plano:** 03 de Outubro de 2026;
- **Escopo Declarado:** Requisitos RF10, RF11, RF12, RN06, RN07, RN09 e atributos de qualidade RNF01, RNF03, RNF15, RNF22;
- **Decisões Técnicas Avaliadas:** DECISÃO-GEO-01 a DECISÃO-GEO-07.

---

## 3. Fontes Canônicas Confrontadas

A auditoria confrontou o planejamento diretamente com o conjunto documental oficial vigente:
- **Requisitos:** RF v2 (`requisitos_funcionais.docx`), RN v3 (`regras_negocio.docx`), RNF v2 (`requisitos_nao_funcionais.docx`);
- **Modelagem:** UML v3.1 (`classes.puml`, `casos_de_uso.puml`, `sequencia.puml`, `atividades.puml`, `estados.puml`) e DER v1.1 (`der.puml`);
- **Arquitetura e Banco:** Arquitetura Técnica v1.1 (`docs/arquitetura/arquitetura-tecnica-v1.1.md`) e Modelo Físico v1.1 (`supabase/migrations/20260916020500_modelo_fisico_v1_1.sql`);
- **Segurança:** Auth/RLS Strategy v1.6 e testes pgTAP (`supabase/tests/`);
- **Inventário de Cobertura:** `docs/planejamento/requisitos-cobertura-status-v1.0.md` (Inventário v1.0);
- **Módulos Congelados:** GAP-AREA-01, GAP-AREA-02, GAP-AREA-04, GAP-AREA-06, GAP-AREA-07, GAP-AREA-08, Clientes e Orçamentos.

---

## 4. Matriz de Avaliação dos Requisitos

A tabela abaixo analisa a cobertura projetada para cada requisito do escopo:

| Requisito | Descrição Canônica | Decisão Associada | Componente Afetado | Sucesso Projetado | Falha Projetada | Avaliação da Auditoria |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **RF10** | Obter automaticamente lat/lng a partir do endereço cadastrado | DECISÃO-GEO-01, GEO-02, GEO-03 | `CriarClienteUseCase`, `AtualizarClienteUseCase`, `GeocodingProvider` | Preenche `latitude` e `longitude` em `ENDERECO` | Salva endereço com coordenadas nulas | **Conforme com Ressalva de Segurança (Achado 01)** |
| **RF11** | Localização do cliente como referência de posição inicial do mapa | DECISÃO-GEO-07 | `areas.tsx`, `mapa.tsx`, `MapaDelimitacao` | Mapa abre centrado no imóvel do cliente em modo Satélite | Fallback para posição padrão | **Conforme** |
| **RF12** | Localização manual no mapa quando cliente sem endereço/coordenadas | DECISÃO-GEO-04 | `mapa.tsx`, `MapProvider` | Navegação livre via gestos de Pan e Zoom sobre o satélite | N/A | **Conforme com Ressalva de Invariância (Achado 02)** |
| **RN06** | Endereço com lat/lng preenchidas ou em branco em falha externa | DECISÃO-GEO-02, GEO-05 | `ENDERECO`, `cliente.validator.ts` | Coordenadas persistidas no banco | Coordenadas mantidas `NULL` sem erro | **Conforme** |
| **RN07** | Abertura do mapa utiliza coordenadas do cliente se disponíveis | DECISÃO-GEO-07 | `app/(app)/orcamentos/mapa.tsx` | Câmera posicionada via `regiaoInicial` | Usa `REGIAO_PADRAO` | **Conforme** |
| **RN09** | Localização manual navegando no mapa quando sem coordenadas | DECISÃO-GEO-04 | `MapProvider` | Usuário navega até a propriedade e desenha | Erro no mapa capturado por ErrorBoundary | **Conforme** |
| **RNF01** | Usabilidade intuitiva nas operações principais | DECISÃO-GEO-02 | Telas de Cliente e Mapa | Geocodificação transparente no salvamento | Não exige etapas manuais do usuário | **Conforme** |
| **RNF03** | Feedback claro em operações relevantes | DECISÃO-GEO-05 | Telas de Cliente | Avisos discretos/toasts | Mensagem em log / aviso não-bloqueante | **Conforme** |
| **RNF15** | Feedback de indisponibilidade de serviços externos | DECISÃO-GEO-05 | `GeocodingProvider`, `MapErrorBoundary` | Notifica usuário de indisponibilidade | Falha tratada defensivamente | **Conforme** |
| **RNF22** | Tolerância a falhas externas sem travar funções locais | DECISÃO-GEO-05 | `CriarClienteUseCase` | Cliente e endereço textual sempre salvos | Timeout de 5s não trava aplicação | **Conforme** |

---

## 5. Avaliação da Arquitetura Proposta

A distribuição de responsabilidades proposta no planejamento é plenamente aderente à **Arquitetura Técnica v1.1**:

- **Domain:** Permanece totalmente puro e desacoplado. As entidades `Cliente` e `Endereco` não importam nenhuma biblioteca HTTP, SDK ou conceito de geocodificação externa. As validações numéricas de latitude e longitude permanecem como invariantes de domínio;
- **Infrastructure:** O `GeocodingProvider` é alocado na camada de infraestrutura, encapsulando os detalhes de chamadas externas e tratamento de respostas HTTP/JSON;
- **Application:** Os casos de uso de cliente (`CriarClienteUseCase` e `AtualizarClienteUseCase`) coordenam a obtenção de coordenadas sem expor detalhes de transporte à interface;
- **Presentation:** As telas apenas recebem o feedback de conclusão do cadastro e transmitem parâmetros de coordenadas via rotas do Expo Router;
- **Testabilidade:** A introdução da interface `GeocodingProvider` permite a injeção de mocks nos testes de aplicação com 100% de previsibilidade.

---

## 6. Avaliação do Provedor de Geocodificação (DECISÃO-GEO-01)

O planejamento avaliou 4 alternativas (*Google Geocoding REST, Android Native Geocoder via expo-location, Nominatim OSM e Supabase Proxy*) e recomendou a **Google Geocoding API via HTTP REST**.

### Méritos Técnicos da Escolha:
1. **Precisão para Endereços Brasileiros:** A base do Google Maps Platform é inquestionavelmente superior para validação de CEPs, logradouros municipais e numeração predial (`ROOFTOP`), aspecto essencial para a localização precisa de jardins residenciais;
2. **Custo Operacional:** O crédito mensal de $200 oferecido pelo Google Cloud absorve amplamente a demanda de um aplicativo de jardinagem;
3. **Zero Dependências Binárias:** O uso de `fetch()` nativo evita a introdução de novos módulos nativos no projeto Expo.

### Lacuna Crítica Identificada:
Apesar dos méritos funcionais, o planejamento cometeu um equívoco técnico de segurança ao detalhar o modelo de credenciais no cliente Android, conforme exposto na Seção 7.

---

## 7. Avaliação Crítica de Segurança e Credenciais (ACHADO-GEO-01)

> [!CAUTION]
> **ALERTA CRÍTICO DE SEGURANÇA E INCOMPATIBILIDADE DE RESTRIÇÃO NO GCP:**
> O planejamento afirma na Seção 14 e Seção 21 que a chave de API da Google Geocoding API será mantida no aplicativo (`EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`) e protegida por **restrição de aplicativo Android (SHA-1 fingerprint + nome do pacote `com.jardinagem.app`)**.

### O Problema Técnico Incontestável:
1. No console do **Google Cloud Platform**, restrições de aplicativos Android baseadas em SHA-1 e Package Name **APLICAM-SE EXCLUSIVAMENTE aos SDKs nativos do Google** (como o *Maps SDK for Android* e o *Places SDK for Android*);
2. Requisições HTTP REST diretas disparadas via JavaScript (`fetch('https://maps.googleapis.com/maps/api/geocode/json?key=...')`) **NÃO** trafegam pelo SDK nativo e, portanto, **NÃO transmitem os headers criptografados de assinatura SHA-1 e pacote Android**;
3. Se o desenvolvedor configurar a chave com restrição de aplicativo Android no GCP, a chamada REST do React Native retornará invariavelmente o erro HTTP 403 Forbidden:
   ```json
   {
     "error_message" : "This IP, site or mobile application is not authorized to use this API key.",
     "results" : [],
     "status" : "REQUEST_DENIED"
   }
   ```
4. Por outro lado, se para contornar esse erro a chave for deixada sem restrição de aplicação, ela ficará exposta em texto claro no bundle do aplicativo (`EXPO_PUBLIC_...`), permitindo que terceiros a extraiam do APK e a utilizem sem restrições fora do aplicativo;
5. O prompt de homologação exige explicitamente: *'O planejamento deve deixar claro se a requisição será realizada no cliente Android, em infraestrutura backend ou em outro mecanismo intermediário. Não aceitar uma decisão incompleta que simplesmente coloque uma credencial privilegiada no aplicativo sem análise. Caso a estratégia ainda não esteja suficientemente definida: registrar como BLOQUEIO DE PLANEJAMENTO.'*

### Classificação:** `MAJOR / BLOQUEIO DE PLANEJAMENTO`.

### Remediações Viáveis a Serem Escolhidas na Revisão do Plano:
- **Alternativa 1 (Provedor Nativo Android sem Chave de API — Altamente Recomendada):**
  Adotar a **Opção 2 do plano** (`android.location.Geocoder` via `expo-location` ou módulo nativo). O Geocoder nativo utiliza a infraestrutura do Google Play Services diretamente no sistema operacional Android. **Não requer nenhuma API Key em código ou bundle do app**, tem custo zero e resolução oficial Google.
- **Alternativa 2 (Backend Proxy via Supabase Edge Function):**
  Manter a Google Geocoding API, mas intermediada por uma Edge Function do Supabase (`/functions/v1/geocode`). O aplicativo chama a Edge Function autenticado via JWT de usuário, e a Edge Function realiza a requisição ao Google utilizando a API Key mantida em segredo nas variáveis de ambiente do backend.
- **Alternativa 3 (Chave Exclusiva para Web Service com Limite Rígido de Quota):**
  Se a equipe optar por manter o `fetch()` direto no cliente, deve criar uma chave **exclusiva para Web Services** (diferente da chave do Maps SDK), restrita estritamente à *Geocoding API*, e configurar no Google Cloud Console limites de cota diária rígidos (ex.: máximo de 100 requisições/dia) para neutralizar o risco financeiro de vazamento.

---

## 8. Avaliação de Privacidade e Minimização de Dados (DECISÃO-GEO-06)

A auditoria verificou minuciosamente o tratamento de dados pessoais:
- **Campos Transmitidos:** A requisição ao provedor contém unicamente: `logradouro`, `numero`, `bairro`, `cidade`, `estado`, `cep`;
- **Dados Excluídos:** O planejamento estipula expressamente a exclusão de qualquer dado pessoal identificável do cliente (`nome`, `cpf/documento`, `telefone`, `email`, `observacoes`);
- **Conformidade Técnica:** Atende perfeitamente ao princípio de **minimização de dados** da LGPD (Art. 6º, III), limitando o tráfego estritamente ao necessário para a determinação das coordenadas;
- **Status:** **Aprovado.**

---

## 9. Avaliação da Persistência e Modelo de Dados (DECISÃO-GEO-03)

A auditoria confrontou a alegação de *'impacto zero no banco'* diretamente com a migration `20260916020500_modelo_fisico_v1_1.sql`:

```sql
CREATE TABLE endereco (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID NOT NULL UNIQUE REFERENCES cliente(id) ON DELETE CASCADE,
    cep VARCHAR(10),
    logradouro VARCHAR(200),
    numero VARCHAR(20),
    complemento VARCHAR(100),
    bairro VARCHAR(100),
    cidade VARCHAR(100),
    estado VARCHAR(2),
    latitude NUMERIC(9,6),
    longitude NUMERIC(9,6),
    CONSTRAINT endereco_latitude_check CHECK (latitude IS NULL OR (latitude >= -90.0 AND latitude <= 90.0)),
    CONSTRAINT endereco_longitude_check CHECK (longitude IS NULL OR (longitude >= -180.0 AND longitude <= 180.0))
);
```

### Conclusões da Auditoria de Banco:
1. A tabela `endereco` já possui as colunas necessárias com constraints rigorosas;
2. O repositório `SupabaseClienteRepository` já realiza a leitura e gravação dessas colunas;
3. Nenhuma migration de banco precisa ser criada;
4. O isolamento de multitenancy via RLS já cobre a tabela `endereco`;
5. **Status:** **Aprovado com 100% de consistência empírica.**

---

## 10. Avaliação dos Fluxos de Criação e Atualização (DECISÃO-GEO-02)

- **Criação de Cliente:** A geocodificação é acionada assincronamente durante a execução de `CriarClienteUseCase`. Se o endereço estiver presente, tenta resolver; se tiver sucesso, grava; se falhar, grava com `null`;
- **Atualização de Cliente:** Em `AtualizarClienteUseCase`, se o endereço for modificado, uma nova geocodificação é disparada:
  - Sucesso do novo endereço: atualiza latitude e longitude com as novas coordenadas;
  - Falha da nova geocodificação: as coordenadas antigas são **limpas (`NULL`)**, impedindo que o cliente mantenha coordenadas de um imóvel antigo;
  - Remoção do endereço: latitude e longitude são limpas (`NULL`);
- **Status:** **Aprovado.**

---

## 11. Avaliação do Posicionamento Inicial no Mapa (DECISÃO-GEO-07)

- O fluxo de injeção `areas.tsx -> mapa.tsx -> MapaDelimitacao -> MapProvider` é arquiteturalmente correto;
- A definição de `latitudeDelta: 0.003` e `longitudeDelta: 0.003` proporciona um enquadramento visual aproximado de ~300 metros, ideal para visualização de telhados, canteiros e limites do lote em modo Satélite;
- O `MapProvider` e seus hooks de desenho homologados (`GAP-AREA-01`) são preservados sem alterações;
- **Status:** **Aprovado.**

---

## 12. Avaliação do Fallback Manual e Invariância de Domínio (DECISÃO-GEO-04)

### Avaliação da Regra RN08 / RN09:
- A regra canônica RN08 estabelece expressamente: *'A localização do cliente não representa, por si só, uma área de trabalho'*;
- O planejamento respeitou essa distinção conceitual ao manter `AREA.poligono` separado de `ENDERECO.latitude/longitude`.

### Lacuna Identificada (ACHADO-GEO-02):
- O planejamento não formalizou a regra de invariância de escrita inversa: *'A navegação manual ou a delimitação de polígonos no mapa NÃO deve atualizar ou sobrescrever as coordenadas cadastradas no endereço do cliente'*;
- Essa decisão deve ser explicitada textualmente para impedir que um desenvolvedor tente sincronizar o centro do polígono com o endereço do cliente durante a implementação;
- **Classificação:** `MINOR`.

---

## 13. Avaliação da Resiliência e Tolerância a Falhas (DECISÃO-GEO-05)

- O planejamento atende com rigor aos requisitos **RNF15** e **RNF22**:
  1. Falhas de rede, timeouts ou ausência de resultados não geram exceções não tratadas;
  2. O cliente e o endereço textual são sempre persistidos;
  3. Um timeout de 5 segundos é previsto para evitar congelamento da tela de salvamento;
- **Status:** **Aprovado.**

---

## 14. Avaliação da Testabilidade

- **Testes de Unidade e Aplicação:** Planejada cobertura com mocks de `GeocodingProvider` para testar sucesso, zero resultados, timeout e erro de rede;
- **Testes de Integração de Banco:** Validação de constraints de latitude/longitude e integridade de RLS via pgTAP;
- **Testes Empíricos:** Planejada validação no emulador Pixel_10 com endereço real;
- **Proteção contra Custos e Flakiness:** Testes automatizados contínuos (`npm test`) utilizam mocks locais, reservando chamadas reais para validação pontual de homologação;
- **Status:** **Aprovado.**

---

## 15. Avaliação do Impacto nos Módulos Congelados

A auditoria confirma que os módulos homologados permanecem rigorosamente protegidos:
- **GAP-AREA-01:** Nenhuma linha dos componentes ou hooks de desenho é modificada;
- **GAP-AREA-02:** Chave Google Maps no Android é preservada;
- **GAP-AREA-04:** Persistência espacial e cálculos em PostGIS são preservados;
- **GAP-AREA-06, 07, 08:** Itens e metragens mantêm seus contratos inalterados;
- **Clientes e Catálogos:** Mantêm sua integridade operacional e RLS.

---

## 16. Quadro Consolidado de Achados da Auditoria

| ID do Achado | Gravidade | Descrição do Problema | Impacto Técnico | Remediação Obrigatória |
| :--- | :---: | :--- | :--- | :--- |
| **ACHADO-GEO-01** | **MAJOR** | Incompatibilidade de Restrição de Credencial na Google Geocoding REST API | Restrição de aplicativo Android (SHA-1/pacote) não funciona com requisições HTTP REST da Geocoding API (retorna 403 Forbidden). Chave desprotegida gera risco de abuso. | Definir formalmente uma estratégia viável: (A) Adotar Geocoder nativo Android via `expo-location` (sem chave no app); (B) Backend proxy via Supabase Edge Function; ou (C) Chave Web Service dedicada com cota diária restrita no GCP. |
| **ACHADO-GEO-02** | **MINOR** | Falta de declaração explícita de não-sobrescrita no fallback manual | Risco de um desenvolvedor tentar salvar o centro do polígono manual no endereço do cliente. | Declarar explicitamente em DECISÃO-GEO-04 que a navegação e desenho manual no mapa não alteram o cadastro de endereço do cliente. |
| **ACHADO-GEO-03** | **MINOR** | Contrato `GeocodingProvider` sem parâmetro de timeout/cancelamento | Falta de padronização da assinatura para abortar requisições longas via código. | Incluir parâmetro opcional `timeoutMs` ou `signal?: AbortSignal` na interface `GeocodingProvider`. |
| **ACHADO-GEO-04** | **OBSERVAÇÃO** | Forma de obtenção do endereço do cliente em `areas.tsx` | `areas.tsx` precisa de chamada explícita para obter o endereço caso o orçamento carregado não inclua a entidade completa. | Especificar que `areas.tsx` deve invocar `clienteService.obterCliente(clienteId)` antes da navegação, ou passar a responsabilidade para a tela `mapa.tsx`. |

---

## 17. Critérios de Aceitação para Homologação da Revisão

Para que o Planejamento Técnico do Bloco A obtenha parecer favorável definitivo (`HOMOLOGADO — PLANEJAMENTO BLOCO A`), a versão revisada (`geocodificacao-localizacao-plan-v1.1.md`) deve obrigatoriamente:

1. Sanar o **ACHADO-GEO-01**, escolhendo formalmente uma das três alternativas de segurança de credenciais e documentando sua viabilidade técnica;
2. Sanar o **ACHADO-GEO-02**, incluindo a cláusula de não-sobrescrita das coordenadas do endereço pelo mapa na DECISÃO-GEO-04;
3. Sanar o **ACHADO-GEO-03**, atualizando a assinatura do contrato `GeocodingProvider` com controle de timeout;
4. Sanar o **ACHADO-GEO-04**, detalhando o ponto exato de consulta das coordenadas antes da abertura do mapa;
5. Manter o princípio de não-implementação e preservação dos módulos congelados.

---

## 18. Conclusão da Auditoria

O planejamento técnico do Bloco A elaborado na versão v1.0 é de alta qualidade arquitetural, possui mapeamento correto de 100% dos requisitos do escopo, comprova o impacto zero no banco de dados e preserva integralmente os módulos homologados de áreas e orçamentos.

Entretanto, a presença de uma inconsistência de segurança e restrição de credencial (**ACHADO-GEO-01 — MAJOR**), somada às lacunas menores (**ACHADO-GEO-02** e **ACHADO-GEO-03**), impede a emissão de parecer favorável irrestrito neste momento.

A liberação de implementação sem a definição da estratégia real de credenciais forçaria o desenvolvedor a tomar decisões críticas de segurança por iniciativa própria, violando o princípio fundamental da governança do projeto.

Por conseguinte, emite-se o parecer oficial:

### **PENDENTE DE REVISÃO**

---

## 19. Status Final e Regra de Gate

Em estrita consonância com a regra de gate do projeto:
- O gate de implementação do Bloco A **permanece temporariamente bloqueado**;
- **NÃO** é permitida a escrita de código de produção, testes ou instalação de dependências nesta etapa;
- O próximo passo mandatório é a elaboração da **Revisão v1.1 do Planejamento Técnico** (`docs/planejamento/geocodificacao-localizacao-plan-v1.1.md`), sanando os achados aqui apontados.

---
*Fim do Relatório Oficial de Homologação v1.0.*