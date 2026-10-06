# Planejamento Técnico — Bloco A v1.1
## Geolocalização e Geocodificação de Clientes

**Projeto:** Sistema de Orçamento para Jardinagem (Android / React Native)
**Data da Revisão:** 03 de Outubro de 2026
**Versão:** 1.1 (Revisada pós-auditoria independente)
**Documento Anterior:** `docs/planejamento/geocodificacao-localizacao-plan-v1.0.md`
**Parecer de Homologação que motivou a revisão:** `docs/planejamento/geocodificacao-localizacao-homologacao-v1.0.md`
**Responsável:** Arquitetura de Software e Auditoria Técnica
**Declaração Oficial:** `PLANEJAMENTO REVISADO — BLOCO A v1.1 — AGUARDANDO HOMOLOGAÇÃO`

---

## 1. Contexto e Histórico de Revisão

O **Inventário Oficial de Cobertura de Requisitos v1.0** (`docs/planejamento/requisitos-cobertura-status-v1.0.md`) formalizou a auditoria de 100% dos requisitos do sistema, constatando que os módulos centrais (*Autenticação, RLS, Clientes, Catálogo de Serviços, Catálogo de Produtos, Orçamentos, Itens de Orçamento e Medição de Áreas no Mapa via Satélite com PostGIS*) encontram-se **integralmente implementados, testados com 417 testes automatizados e formalmente homologados**.

O Planejamento Técnico v1.0 do **Bloco A (Geolocalização e Geocodificação de Clientes)** foi submetido à auditoria técnica independente (`geocodificacao-localizacao-homologacao-v1.0.md`), que emitiu o parecer formal de **`PENDENTE DE REVISÃO`** em razão de quatro achados técnicos:

1. **ACHADO-GEO-01 (MAJOR):** Incompatibilidade de restrição de credencial no Google Cloud Platform para requisições HTTP REST de Web Services disparadas do aplicativo móvel;
2. **ACHADO-GEO-02 (MINOR):** Falta de declaração explícita de que a localização manual no mapa **nunca** sobrescreve as coordenadas do endereço cadastrado do cliente;
3. **ACHADO-GEO-03 (MINOR):** Contrato `GeocodingProvider` sem especificação formal de timeout e cancelamento com `AbortSignal`;
4. **ACHADO-GEO-04 (OBSERVAÇÃO):** Necessidade de especificar o carregamento explícito da entidade do cliente em `areas.tsx` antes da navegação para a tela de mapa.

Esta versão v1.1 **revisa integralmente** o planejamento do Bloco A, sanando todos os achados apontados e estabelecendo uma solução arquitetural viável, segura e em estrita conformidade com os módulos congelados.

---

## 2. Requisitos Envolvidos

O escopo deste bloco engloba estritamente os seguintes requisitos canônicos:

### 2.1. Requisitos Funcionais (RF v2)
- **RF10:** *O sistema deve permitir obter automaticamente a latitude e longitude a partir do endereço cadastrado para o cliente (geocodificação).*
- **RF11:** *O sistema deve utilizar a localização do cliente como referência para o posicionamento inicial do mapa ao iniciar a medição de uma área.*
- **RF12:** *O sistema deve permitir que o usuário localize manualmente a área de trabalho no mapa caso o cliente não possua endereço ou a geocodificação não esteja disponível.*

### 2.2. Regras de Negócio (RN v3)
- **RN06:** *O endereço do cliente deve incluir latitude e longitude, preenchidas automaticamente a partir do endereço informado (geocodificação) ou mantidas em branco caso a geocodificação não esteja disponível.*
- **RN07:** *A abertura do mapa para medição de áreas de um orçamento deve utilizar as coordenadas do cliente como posição inicial, caso disponíveis.*
- **RN09:** *Caso o cliente não possua endereço cadastrado ou a geocodificação não esteja disponível, o usuário poderá localizar manualmente a área de trabalho navegando no mapa.*

### 2.3. Requisitos Não-Funcionais (RNF v2)
- **RNF01 (Usabilidade):** *O sistema deve ser intuitivo para usuários com pouca familiaridade com tecnologia, permitindo a execução das operações principais em poucos passos.*
- **RNF03 (Feedback):** *O sistema deve fornecer feedback claro para todas as operações relevantes.*
- **RNF15 (Feedback de Serviços Externos):** *O sistema deve informar adequadamente o usuário caso serviços externos (ex.: mapa, geocodificação) estejam indisponíveis.*
- **RNF22 (Tolerância a Falhas):** *Falhas em integrações com serviços externos não devem impedir o uso das funcionalidades locais do sistema que não dependam diretamente do serviço.*

---

## 3. Estado Atual a Preservar

A investigação técnica do repositório confirma a infraestrutura física e lógica já homologada:

1. **Modelo de Dados (PostgreSQL 17 / PostGIS 3.3.7):** `[FATO DOCUMENTADO]`
   - Tabela `public.endereco` já possui as colunas `latitude NUMERIC(9,6)` e `longitude NUMERIC(9,6)`;
   - Constraints ativas: `endereco_latitude_check` (`-90 <= latitude <= 90`) e `endereco_longitude_check` (`-180 <= longitude <= 180`);
   - Chave estrangeira `cliente_id UUID UNIQUE REFERENCES cliente(id) ON DELETE CASCADE`;
   - RLS ativo e coberto por 170 testes pgTAP.

2. **Entidades de Domínio:** `[FATO DOCUMENTADO]`
   - Entidade `Endereco` (`src/domain/entities/endereco.ts`) com propriedades `latitude: number | null` e `longitude: number | null`;
   - Entidade `Cliente` (`src/domain/entities/cliente.ts`) com cardinalidade `1 : 0..1` com `Endereco`.

3. **Repositório de Dados:** `[FATO DOCUMENTADO]`
   - `SupabaseClienteRepository` mapeia `latitude` e `longitude` nas operações `obterEndereco` e `salvarEndereco`.

4. **Validação da Aplicação:** `[FATO DOCUMENTADO]`
   - Validador `cliente.validator.ts` com validação de limites numéricos para latitude e longitude.

5. **Componente de Mapa (MapProvider):** `[FATO DOCUMENTADO]`
   - Aceita a propriedade `regiaoInicial?: RegiaoMapa`;
   - Modo Satélite padrão, ferramentas de desenho e `MapErrorBoundary` homologados em GAP-AREA-01/02.

---

## 4. Avaliação Comparativa da Estratégia de Credencial e Provedor (ACHADO-GEO-01)

Para sanar o **ACHADO-GEO-01**, foram analisadas em profundidade as três estratégias viáveis de arquitetura de geocodificação e credenciais:

### Estratégia A: Geocoder Nativo Android via `expo-location` (`Location.geocodeAsync`)
- **Mecanismo:** O aplicativo React Native utiliza a biblioteca oficial `expo-location`, que no Android invoca a API nativa do sistema operacional: `android.location.Geocoder.getFromLocationName(addressString, maxResults)`. Essa chamada delega a resolução diretamente ao **Google Play Services** instalado no dispositivo.
- **Segurança da Credencial:** **100% segura por concepção.** Não requer NENHUMA chave de API em código-fonte, bundle JavaScript, variáveis de ambiente ou backend. O sistema operacional Android se autentica diretamente com os servidores de localização do Google utilizando as credenciais nativas do dispositivo. `[FATO DOCUMENTADO - Android Developers: Geocoder]`
- **Exposição da Chave ao Cliente:** **Nula (Zero risco).** Não existe chave de API para ser extraída do APK.
- **Compatibilidade com Expo e Android:** `expo-location` é um módulo canônico do Expo SDK 57, compatível com React Native 0.86, New Architecture e Hermes Engine. `[FATO DOCUMENTADO]`
- **Necessidade de Permissões de GPS:** Para geocodificação direta de endereço textual (`geocodeAsync`), o Android **NÃO exige** permissões de localização em tempo de execução (`ACCESS_FINE_LOCATION` ou `ACCESS_COARSE_LOCATION`), pois trata-se de uma consulta textual de catálogo geográfico na rede, e não de leitura do sensor de GPS do aparelho. `[FATO DOCUMENTADO - Android Geocoder API]`
- **Custo Financeiro:** **Gratuito e ilimitado** para o aplicativo. Não consome quota nem saldo do Google Cloud Platform.
- **Dependências:** Adiciona unicamente a biblioteca `expo-location` ao `package.json`.
- **Adequação ao Projeto:** Máxima. Solução limpa, sem custos, sem segredos em build e com excelente precisão para endereços brasileiros via Google Play Services.

### Estratégia B: Backend Proxy via Supabase Edge Function com Google Geocoding API
- **Mecanismo:** O app móvel faz uma requisição HTTP autenticada via JWT do Supabase Auth para uma Edge Function Deno (`/functions/v1/geocodificar`). A Edge Function lê uma chave privada de Web Services armazenada nos Secrets do Supabase (`GOOGLE_GEOCODING_API_KEY`) e consome a Google Geocoding REST API.
- **Segurança da Credencial:** **Alta.** A chave de API do Google permanece no servidor do Supabase, sem nunca ser exposta no aplicativo móvel.
- **Exposição da Chave ao Cliente:** **Nula.**
- **Complexidade de Infraestrutura:** **Alta.** Exige desenvolver, testar, implantar e manter código Deno no Supabase CLI (`supabase/functions/`), configurar segredos remotos e locais, e lidar com latência de dois saltos de rede (App → Supabase → Google → Supabase → App).
- **Custo:** Gratuito até o limite de invocações do Supabase (500k/mês) + crédito de $200 do GCP.
- **Adequação ao Projeto:** Embora excelente para ambientes corporativos complexos, introduz uma camada desnecessária de backend para um aplicativo cujo mapa já roda nativamente no Android.

### Estratégia C: Chave Web Service Dedicada no App com Cotas Rígidas no GCP
- **Mecanismo:** O app móvel faz chamadas `fetch()` diretas para `https://maps.googleapis.com/maps/api/geocode/json?key=...` utilizando uma chave dedicada.
- **Segurança da Credencial:** **Frágil.** A Geocoding API é um Web Service REST e o Google Cloud Platform **NÃO suporta** restrições de aplicativo Android (SHA-1/pacote) para esse endpoint. A chave fica presente no bundle do app.
- **Mitigação Parcial:** Restringir o escopo da chave estritamente à Geocoding API e limitar a cota diária no console do GCP para evitar faturamento acidental.
- **Risco Residual:** Mesmo com cotas, a chave pode ser extraída do APK por engenharia reversa e esgotar a cota diária do aplicativo.
- **Adequação ao Projeto:** Inadequada quando comparada às alternativas A e B.

---

## 5. Matriz Comparativa Formal de Estratégias

| Critério de Avaliação | Estratégia A: Nativo (`expo-location`) | Estratégia B: Proxy Supabase | Estratégia C: Web Service no App |
| :--- | :---: | :---: | :---: |
| **Segurança da Credencial** | **Excelente (Sem chave)** | **Excelente (Chave no servidor)** | Frágil (Chave no bundle) |
| **Exposição de Chave no APK** | **NULA (0%)** | **NULA (0%)** | Alta (Presente no JS) |
| **Risco de Abuso por Terceiros** | **Inexistente** | **Inexistente (Exige JWT)** | Existente (Consumo de cota) |
| **Complexidade Arquitetural** | **Mínima (Módulo cliente)** | Alta (Função Deno no Supabase) | Mínima (HTTP fetch) |
| **Dependência de Infraestrutura Backend**| **Nenhuma** | Sim (Edge Functions) | Nenhuma |
| **Latência de Execução** | **Baixa (Direta ao Play Services)**| Média (2 saltos de rede) | Baixa (Direta ao Google) |
| **Custo Operacional** | **R$ 0,00 (Ilimitado)** | Gratuito c/ limites | Gratuito c/ crédito GCP |
| **Necessidade de Pacote npm** | Sim (`expo-location`) | Nenhuma no app | Nenhuma no app |
| **Qualidade para Endereços BR** | **Excelente (Base Google)** | **Excelente (Base Google)** | **Excelente (Base Google)** |
| **Compatibilidade Android Pixel_10** | **Total (Play Services nativo)** | Total | Total |
| **Facilidade de Manutenção** | **Altíssima** | Média | Média |
| **Adequação ao Escopo do Projeto** | **ÓTIMA (Padrão Expo)** | Excessiva | Vulnerável |

---

## 6. Decisão Recomendada v1.1

### OPÇÃO ESCOLHIDA: Estratégia A (Geocoder Nativo Android via `expo-location`)

### JUSTIFICATIVA TÉCNICA E ARQUITETURAL:
1. **Eliminação Integral do Risco de Credenciais:** Ao utilizar a interface `Location.geocodeAsync()` da biblioteca `expo-location`, a geocodificação é delegada à classe `android.location.Geocoder` do Android SDK. Isso significa que **o aplicativo NÃO armazena, NÃO transmite e NÃO requer nenhuma chave de API no código-fonte ou no bundle compilado**, eliminando completamente o **ACHADO-GEO-01**;
2. **Qualidade Idêntica ao Google Maps Platform:** No ambiente Android, o provedor nativo do sistema operacional é alimentado diretamente pelos serviços de localização do Google Play Services, garantindo a mesma precisão de resolução de endereços brasileiros sem custos de faturamento;
3. **Simplicidade e Aderência ao Ecossistema:** O projeto é construído em Expo SDK 57. Adotar `expo-location` é a solução canônica recomendada pela documentação oficial do Expo e do React Native;
4. **Isolamento por Abstração:** O contrato `GeocodingProvider` permanece em vigor. A implementação concreta `ExpoLocationGeocodingProvider` encapsulará a chamada a `expo-location`. Se no futuro houver necessidade de migrar para outro provedor, a aplicação e o domínio não sofrerão nenhum impacto.

---

## 7. Segurança da Credencial na Estratégia Escolhida

Com a adoção da **Estratégia A**:
- **Existência de API Key para Geocodificação:** **NENHUMA.** Não há chave de API a ser criada, configurada, protegida ou rotacionada para o serviço de geocodificação; `[DECISÃO DO PROJETO]`
- **Fronteira de Segurança do Android:** A comunicação com o serviço de geocodificação é gerenciada pelas permissões de rede do próprio sistema operacional Android e assinada pelo Google Play Services do aparelho; `[FATO DOCUMENTADO]`
- **Chave do Google Maps (GAP-AREA-02):** A chave do Google Maps SDK configurada no AndroidManifest (`com.google.android.geo.API_KEY`) para renderização dos tiles de satélite **permanece restrita** por SHA-1 e pacote Android `com.jardinagem.app`, operando exclusivamente na camada de apresentação visual do mapa;
- **Código-Fonte e Versionamento:** Nenhum segredo ou chave de geocodificação existirá em arquivos versionados, variáveis `.env` ou logs.

---

## 8. Privacidade e Minimização de Dados (LGPD)

A política de privacidade técnica definida na v1.0 é preservada e reforçada:
- **Campos Transmitidos:** A string de consulta para geocodificação é composta **exclusivamente por dados geográficos públicos**: `[DECISÃO DO PROJETO]`
  `logradouro, numero, bairro, cidade - UF, CEP, Brasil`
- **Campos Terminantemente Proibidos de Envio:**
  - `nome` do cliente;
  - `documento` (CPF/CNPJ);
  - `telefone` / WhatsApp;
  - `email`;
  - `observacoes` gerais.
- **Logs e Rastreamento:** Os logs da aplicação nunca devem imprimir dados pessoais associados às coordenadas geográficas.

---

## 9. Fallback Manual e Regra de Não-Sobrescrita (ACHADO-GEO-02 / DECISÃO-GEO-04)

Para sanar o **ACHADO-GEO-02**, fica estabelecido o princípio literal de não-sobrescrita:

> [!IMPORTANT]
> **CLÁUSULA DE INVARIÂNCIA ESPACIAL (RN08 / DECISÃO-GEO-04):**
> *'A localização manual utilizada para posicionar o mapa ou realizar a delimitação de uma área de trabalho NÃO deve sobrescrever automaticamente as coordenadas geográficas armazenadas do endereço do cliente.'*

### Distinção Conceitual Rigorosa dos Quatro Elementos Espaciais:
1. **Coordenadas do Cliente (`ENDERECO.latitude/longitude`):** Ponto cartesiano único `(lat, lng)` derivado do endereço cadastral oficial do cliente;
2. **Centro Inicial do Mapa (`regiaoInicial`):** Ponto de referência visual onde a câmera satélite é posicionada ao abrir a tela de medição;
3. **Ponto Manual de Navegação:** Região para onde o usuário arrasta o mapa livremente durante a exploração por Pan/Zoom;
4. **Polígono da Área de Trabalho (`AREA.poligono`):** Geometria PostGIS fechada delimitada pelos vértices desenhados pelo usuário, utilizada para o cálculo de metragem quadrada do item de serviço.

A navegação manual ou a finalização de uma medição em área diferente do endereço do cliente **jamais** modificará os dados de `ENDERECO` do cliente.

---

## 10. Contrato Arquitetural com Timeout e Cancelamento (ACHADO-GEO-03 / DECISÃO-GEO-08)

Para sanar o **ACHADO-GEO-03**, o contrato da interface `GeocodingProvider` é revisado para incluir formalmente suporte a timeout e aborto de requisições:

### 10.1. Interface Canônica (`src/application/interfaces/geocoding-provider.interface.ts`)

```typescript
export interface EnderecoConsultaGeocoding {
  logradouro?: string | null;
  numero?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
}

export interface CoordenadasGeocoding {
  latitude: number;
  longitude: number;
  precisao?: 'ROOFTOP' | 'APPROXIMATE';
}

export interface GeocodificarOptions {
  /**
   * Tempo limite em milissegundos antes de abortar a requisição.
   * Valor padrão definido pela DECISÃO-GEO-08: 5000 ms (5 segundos).
   */
  timeoutMs?: number;
  /**
   * Sinal para cancelamento voluntário da requisição.
   */
  signal?: AbortSignal;
}

export interface GeocodingProvider {
  geocodificar(
    endereco: EnderecoConsultaGeocoding,
    options?: GeocodificarOptions
  ): Promise<CoordenadasGeocoding | null>;
}
```

### 10.2. Justificativa do Timeout Padrão de 5.000 ms (DECISÃO-GEO-08)
- **Fundamentação Técnica:** Em conexões móveis (4G/5G/Wi-Fi), uma consulta de geocodificação saudável responde entre 200ms e 800ms. O limite de 5.000 ms (5 segundos) garante margem para redes lentas sem degradar perceptivelmente o salvamento do formulário;
- **Comportamento em Timeout:** A promise é rejeitada com `GeocodingError('TIMEOUT')`, a camada de aplicação captura a falha e prossegue com o salvamento do cliente com coordenadas nulas (RNF22).

---

## 11. Fluxo de Dados areas.tsx → mapa.tsx (ACHADO-GEO-04 / DECISÃO-GEO-07)

Para sanar o **ACHADO-GEO-04**, o fluxo de obtenção e transmissão das coordenadas do cliente para a tela de mapa é detalhado passo a passo:

```
[Tela areas.tsx - handleAbrirMapa()]
       │
       ├── 1. Obtém orcamentoId e itemId já presentes na tela;
       │
       ├── 2. Obtém clienteId do orçamento já carregado (orcDetalhe.orcamento.clienteId);
       │
       ├── 3. Invoca clienteService.obterCliente(clienteId);
       │
       ├── 4. Extrai coordenadas:
       │      const lat = cliente?.endereco?.latitude;
       │      const lng = cliente?.endereco?.longitude;
       │
       ├── 5. Constrói a rota com query params:
       │      const query = (lat != null && lng != null)
       │        ? `&lat=${lat}&lng=${lng}`
       │        : '';
       │      router.push(`/orcamentos/mapa?orcamentoId=${orcamentoId}&itemId=${itemId}${query}` as any);
       ▼
[Tela mapa.tsx - Inicialização]
       │
       ├── 6. Lê searchParams: { orcamentoId, itemId, lat, lng }
       │
       ├── 7. Se lat e lng forem válidos (números finitos dentro dos limites):
       │      regiaoInicial = {
       │        latitude: Number(lat),
       │        longitude: Number(lng),
       │        latitudeDelta: 0.003, // Zoom de alta proximidade para lote/jardim
       │        longitudeDelta: 0.003
       │      }
       │
       └── 8. Se lat ou lng forem nulos/inválidos (RF12 / RN09):
              regiaoInicial = undefined // MapProvider usará REGIAO_PADRAO
       ▼
[Renderiza <MapaDelimitacao regiaoInicial={regiaoInicial} />]
       │
       ▼
[Repassa para <MapProvider regiaoInicial={regiaoInicial} />]
```

Esta estratégia **não altera** o componente `MapProvider` e não gera consultas N+1, pois é executada uma única vez quando o usuário solicita a abertura do mapa.

---

## 12. Regra de Consistência e Invalidação Endereço ↔ Coordenadas (DECISÃO-GEO-09)

Para eliminar qualquer ambiguidade durante a edição de clientes, fica estabelecida a matriz de consistência obrigatória:

| Cenário de Alteração Cadastral | Ação de Geocodificação | Resultado da Geocodificação | Estado Final das Coordenadas no Banco | Justificativa de Consistência |
| :--- | :--- | :--- | :--- | :--- |
| **Cadastro Novo com Endereço** | Executa geocodificação | Sucesso | `latitude = nova_lat`, `longitude = nova_lng` | Cadastro inicial resolvido com sucesso. |
| **Cadastro Novo com Endereço** | Executa geocodificação | Falha / Não encontrado | `latitude = NULL`, `longitude = NULL` | Endereço salvo; permite fallback manual. |
| **Edição sem Alteração de Endereço** (alterou só nome/tel) | **Não executa** | N/A | **Mantém coordenadas existentes** | Economiza rede e preserva dados já geocodificados. |
| **Edição com Novo Endereço** (Rua A → Rua B) | Executa geocodificação | Sucesso | `latitude = nova_lat`, `longitude = nova_lng` | Coordenadas atualizadas para o novo imóvel. |
| **Edição com Novo Endereço** (Rua A → Rua B) | Executa geocodificação | **Falha / Timeout** | **`latitude = NULL`, `longitude = NULL` (LIMPA ANTERIORES)** | **CRÍTICO:** Previne inconsistência grave de manter coordenadas da Rua A com texto da Rua B. |
| **Remoção de Endereço** | Não executa | N/A | **`latitude = NULL`, `longitude = NULL`** | Cliente sem endereço não deve possuir coordenadas. |

---

## 13. Resiliência e Tolerância a Falhas (DECISÃO-GEO-05)

Em estrita consonância com **RNF15** e **RNF22**:
- Qualquer falha na geocodificação externa é capturada defensivamente dentro do caso de uso de cliente em bloco `try/catch`;
- O salvamento do cliente e do endereço textual é **sempre concluído com sucesso** no banco de dados Supabase;
- A aplicação não trava, não exibe telas vermelhas de erro e não impede a continuidade da operação;
- Um aviso não-bloqueante (feedback discreto) informa que o endereço foi salvo e que a localização pode ser ajustada manualmente no mapa.

---

## 14. Matriz de Impacto nos Módulos e Componentes

A tabela abaixo mapeia rigorosamente as ações planejadas em cada artefato do repositório:

| Componente / Arquivo | Ler | Alterar | Criar | Preservar Intacto | Justificativa |
| :--- | :---: | :---: | :---: | :---: | :--- |
| `Cliente` (Entidade de Domínio) | Sim | Não | Não | **Sim** | Já suporta endereço opcional perfeitamente. |
| `Endereco` (Entidade de Domínio) | Sim | Não | Não | **Sim** | Já possui `latitude` e `longitude`. |
| `GeocodingProvider` (Interface) | - | - | **Sim** | - | Novo contrato de infraestrutura em `src/application/interfaces/`. |
| `ExpoLocationGeocodingProvider` | - | - | **Sim** | - | Implementação concreta em `src/infrastructure/geocoding/`. |
| `CriarClienteUseCase` | Sim | **Sim** | Não | Não | Integrar chamada ao `GeocodingProvider` antes de persistir endereço. |
| `AtualizarClienteUseCase` | Sim | **Sim** | Não | Não | Integrar nova geocodificação sob regra da DECISÃO-GEO-09. |
| `ClienteRepository` / `SupabaseRepo` | Sim | Não | Não | **Sim** | `salvarEndereco` já persiste lat/lng perfeitamente. |
| Banco de Dados / Migrations | Sim | Não | Não | **Sim** | Tabela `endereco` e constraints já são 100% compatíveis. |
| Políticas de RLS | Sim | Não | Não | **Sim** | RLS de `endereco` já ativo e homologado. |
| `app/(app)/orcamentos/areas.tsx` | Sim | **Sim** | Não | Não | Injetar `&lat=...&lng=...` na navegação do mapa. |
| `app/(app)/orcamentos/mapa.tsx` | Sim | **Sim** | Não | Não | Extrair query params e repassar `regiaoInicial` ao componente. |
| `MapaDelimitacao` (Componente) | Sim | **Sim** | Não | Não | Aceitar `regiaoInicial?` e repassar para `MapProvider`. |
| `MapProvider` (Componente de Mapa) | Sim | Não | Não | **Sim** | **CONGELADO.** Já aceita `regiaoInicial` nativamente. |
| `AreaService` / PostGIS | Sim | Não | Não | **Sim** | **CONGELADO.** Cálculo e desenho de polígonos intactos. |

---

## 15. Decisões Técnicas Consolidadas da v1.1

Ficam registradas e numeradas as 9 decisões técnicas canônicas do Bloco A:

### DECISÃO-GEO-01: Provedor e Arquitetura de Credencial
- **Problema:** Necessidade de resolver endereços em coordenadas sem expor chaves de API nem sofrer bloqueios no Google Cloud.
- **Opções:** (A) Geocoder nativo Android via `expo-location`; (B) Proxy via Supabase Edge Function; (C) Chave Web Service no bundle.
- **Decisão:** **Estratégia A (Geocoder nativo Android via `expo-location`).**
- **Justificativa:** Zero chaves de API no app, custo zero, precisão oficial Google Play Services e perfeita integração com Expo SDK 57.
- **Impacto:** Adição de `expo-location` ao `package.json` na etapa de implementação.
- **Riscos:** Emuladores Android sem Google Play Services retornam lista vazia (mitigado pelo fallback manual RF12).
- **Validação:** Testes unitários com mock e teste empírico no emulador Pixel_10.

### DECISÃO-GEO-02: Momento da Geocodificação
- **Decisão:** Execução automática no salvamento de cliente (`CriarClienteUseCase` e `AtualizarClienteUseCase`).
- **Justificativa:** Transparência total para o usuário, sem passos extras.

### DECISÃO-GEO-03: Persistência no Modelo Físico Existente
- **Decisão:** Utilização estrita das colunas `latitude` e `longitude` da tabela `endereco` sem criação de migrations.
- **Justificativa:** O Modelo Físico v1.1 já possui as colunas e constraints necessárias.

### DECISÃO-GEO-04: Fallback Manual e Invariância Espacial (ACHADO-GEO-02)
- **Decisão:** O mapa abre na região padrão quando o cliente não tiver coordenadas; a navegação manual e o desenho de áreas **nunca** sobrescrevem as coordenadas do endereço cadastrado do cliente.
- **Justificativa:** Preservação estrita da regra canônica RN08.

### DECISÃO-GEO-05: Resiliência e Tolerância a Falhas (RNF15 / RNF22)
- **Decisão:** Falhas externas nunca impedem o salvamento do cliente; coordenadas são salvas como `NULL` e o fluxo continua.
- **Justificativa:** Não-bloqueio das funções essenciais do negócio.

### DECISÃO-GEO-06: Minimização de Dados (LGPD)
- **Decisão:** Transmissão exclusiva de logradouro, número, bairro, cidade, estado e CEP, sem dados pessoais do cliente.
- **Justificativa:** Conformidade técnica com o princípio de minimização de dados.

### DECISÃO-GEO-07: Injeção de Região Inicial no Mapa (ACHADO-GEO-04)
- **Decisão:** `areas.tsx` consulta as coordenadas do cliente e as transmite via query params de rota para `mapa.tsx`, que posiciona o `MapProvider`.
- **Justificativa:** Desacoplamento limpo sem consultas N+1 e preservando o `MapProvider` congelado.

### DECISÃO-GEO-08: Timeout Padrão e Cancelamento (ACHADO-GEO-03)
- **Decisão:** Contrato `GeocodingProvider` suporta `options?: { timeoutMs?: number; signal?: AbortSignal }`, com timeout padrão fixado em 5.000 ms.
- **Justificativa:** Prevenção de bloqueio da interface em conexões móveis lentas.

### DECISÃO-GEO-09: Consistência e Invalidação de Coordenadas em Alterações
- **Decisão:** Ao alterar o endereço textual, se a geocodificação falhar, as coordenadas antigas são obrigatoriamente limpas (`NULL`). Se o endereço não mudar, a geocodificação não é reexecutada.
- **Justificativa:** Eliminação de inconsistência de manter coordenadas de um imóvel com texto de outro.

---

## 16. Estratégia de Testes

A estratégia de testes para a futura implementação cobrirá:

### 16.1. Testes Unitários de Provedor e Casos de Uso (Vitest)
1. `ExpoLocationGeocodingProvider`:
   - Conversão de endereço em string formatada;
   - Retorno de coordenadas com sucesso;
   - Retorno de `null` quando `geocodeAsync` retorna array vazio `[]`;
   - Disparo de `GeocodingError` em timeout ou erro de runtime;
2. `CriarClienteUseCase`:
   - Cliente com endereço completo: verifica se o provedor é chamado e lat/lng são salvas;
   - Cliente com falha no provedor: verifica se cliente é salvo com lat/lng `null`;
3. `AtualizarClienteUseCase`:
   - Alteração de endereço com sucesso: atualiza lat/lng;
   - Alteração de endereço com falha: limpa coordenadas para `null` (DECISÃO-GEO-09);
   - Sem alteração de endereço: não dispara geocodificação.

### 16.2. Testes de Integração de Banco (pgTAP)
1. Validação das constraints `endereco_latitude_check` e `endereco_longitude_check`;
2. Teste de isolamento de RLS em leitura de endereços com coordenadas.

### 16.3. Testes Empíricos no Emulador Android (Pixel_10)
1. Cadastro de cliente com endereço real (ex.: Av. Paulista, 1000);
2. Verificação visual das coordenadas preenchidas;
3. Abertura do mapa a partir de orçamento deste cliente;
4. Confirmação visual de que o mapa via satélite abre centrado na Av. Paulista, 1000;
5. Teste de regressão de desenho de polígono de área, cálculo de metragem e salvamento.

---

## 17. Critérios de Aceitação da Implementação

A implementação do Bloco A será considerada concluída se:
1. **RF10 / RN06:** Ao salvar cliente com endereço válido, latitude e longitude são persistidas na tabela `endereco`; em caso de falha externa, permanecem `null` sem travar a tela;
2. **RF11 / RN07:** Ao abrir o mapa para cliente com coordenadas válidas, o mapa satélite inicializa centrado na residência do cliente;
3. **RF12 / RN09:** Ao abrir o mapa para cliente sem coordenadas, o mapa abre na região padrão e permite desenho e navegação manual sem erros;
4. **DECISÃO-GEO-04:** A delimitação manual de área não sobrescreve as coordenadas do cliente;
5. **DECISÃO-GEO-09:** A alteração de endereço com falha de geocodificação limpa coordenadas antigas;
6. **Regressão Zero:** 100% dos testes existentes (247 Vitest + 170 pgTAP) continuam passando.

---

## 18. Critérios de Homologação da Implementação

A homologação da implementação exigirá:
1. Relatório de Implementação do Bloco A;
2. Auditoria técnica independente de código;
3. Evidências gravadas/fotografadas no emulador Pixel_10;
4. Emissão de parecer favorável antes de declarar os requisitos como HOMOLOGADOS.

---

## 19. Conclusão e Próximo Passo

A Revisão v1.1 do Planejamento Técnico do Bloco A sana com rigor todos os achados apontados na auditoria independente:
- Substitui a dependência de chave insegura pela **Estratégia Nativa Android (`expo-location`)**, de custo zero e sem exposição de credenciais;
- Formaliza a **não-sobrescrita** das coordenadas pelo mapa manual;
- Padroniza o contrato com **timeout de 5 segundos e cancelamento**;
- Define com precisão o fluxo de dados entre `areas.tsx` e `mapa.tsx`;
- Estabelece a matriz de **consistência e invalidação de coordenadas** em edições.

O documento encontra-se formalmente concluído e pronto para nova submissão ao gate de homologação.

Por conseguinte, declara-se oficialmente:

### **PLANEJAMENTO REVISADO — BLOCO A v1.1 — AGUARDANDO HOMOLOGAÇÃO**

---
*Fim do Documento Canônico de Planejamento Técnico v1.1.*