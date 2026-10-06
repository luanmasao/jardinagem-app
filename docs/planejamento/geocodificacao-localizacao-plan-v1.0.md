# Planejamento Técnico — Bloco A
## Geolocalização e Geocodificação de Clientes v1.0

**Projeto:** Sistema de Orçamento para Jardinagem (Android / React Native)
**Data da Análise:** 03 de Outubro de 2026
**Responsável:** Arquitetura de Software e Auditoria Técnica
**Status do Documento:** Canônico — Aguardando Homologação
**Referência Canônica:** `docs/planejamento/requisitos-cobertura-status-v1.0.md`
**Declaração Oficial:** `PLANEJAMENTO CONCLUÍDO — BLOCO A — AGUARDANDO HOMOLOGAÇÃO`

---

## 1. Contexto

O **Inventário Oficial de Cobertura de Requisitos v1.0** (`docs/planejamento/requisitos-cobertura-status-v1.0.md`) formalizou a auditoria de 100% dos requisitos do sistema, constatando que os módulos centrais (*Autenticação, RLS, Clientes, Catálogo de Serviços, Catálogo de Produtos, Orçamentos, Itens de Orçamento e Medição de Áreas no Mapa via Satélite com PostGIS*) encontram-se **integralmente implementados, testados com 417 testes automatizados e formalmente homologados**.

Contudo, o inventário identificou como pendência objetiva o **Bloco A**, composto pelos requisitos de obtenção automática de coordenadas a partir do endereço do cliente e o posicionamento referencial inicial da tela de desenho do mapa.

Este planejamento técnico estabelece o projeto arquitetural e os contratos do Bloco A, garantindo que o desenvolvimento subsequente ocorra de maneira controlada, sem quebra de integridade e em estrita conformidade com os módulos congelados.

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

## 3. Estado Atual

A investigação técnica do repositório revelou um alinhamento favorável da arquitetura já existente:

1. **Modelo de Dados (PostgreSQL / PostGIS):**
   - A tabela `endereco` já existe (`supabase/migrations/20260916020500_modelo_fisico_v1_1.sql`) com chave estrangeira `cliente_id UUID UNIQUE REFERENCES cliente(id) ON DELETE CASCADE`;
   - As colunas `latitude NUMERIC(9,6)` e `longitude NUMERIC(9,6)` **já estão criadas e ativas no banco de dados**;
   - As constraints `endereco_latitude_check` (`-90.0 <= latitude <= 90.0`) e `endereco_longitude_check` (`-180.0 <= longitude <= 180.0`) já estão aplicadas e testadas via pgTAP.

2. **Entidades de Domínio:**
   - A entidade `Endereco` (`src/domain/entities/endereco.ts`) já possui as propriedades `latitude: number | null` e `longitude: number | null`, com métodos de atualização;
   - A entidade `Cliente` (`src/domain/entities/cliente.ts`) possui relacionamento canônico `1 : 0..1` com `Endereco`.

3. **Repositório de Dados:**
   - `SupabaseClienteRepository` (`src/infrastructure/repositories/supabase-cliente.repository.ts`) já mapeia e persiste `latitude` e `longitude` nas operações `obterEndereco` e `salvarEndereco`.

4. **Validação da Camada de Aplicação:**
   - O validador `cliente.validator.ts` já implementa `validarDadosEndereco()`, com verificação defensiva de limites numéricos para latitude e longitude.

5. **Componente de Mapa (MapProvider):**
   - O componente `MapProvider` (`src/infrastructure/maps/map-provider.tsx`) já aceita a propriedade `regiaoInicial?: RegiaoMapa`;
   - Já possui o `MapErrorBoundary` para resiliência e fallback visual nativo.

---

## 4. Problema

Apesar de a estrutura física e de domínio suportar coordenadas:
1. **Ausência de Serviço de Geocodificação:** Não existe implementação concreta que converta o endereço textual digitado pelo usuário (logradouro, número, bairro, cidade, estado, CEP) em latitude e longitude;
2. **Persistência de Coordenadas Nulas:** Ao salvar o cliente nas telas `novo.tsx` e `editar.tsx`, as colunas `latitude` e `longitude` permanecem `NULL`;
3. **Desconexão no Posicionamento Inicial do Mapa:** A tela `app/(app)/orcamentos/mapa.tsx` não recebe nem busca o cliente vinculado ao orçamento, fazendo com que o `MapProvider` sempre inicialize na coordenada estática padrão de fallback (Praça da Sé, São Paulo: `-23.55052, -46.633308`);
4. **Falta de Feedback Específico:** Não há indicação ao usuário sobre o sucesso ou falha da resolução geográfica do endereço.

---

## 5. Objetivos

1. Projetar a abstração e o contrato do `GeocodingProvider` na camada de infraestrutura;
2. Selecionar a tecnologia de geocodificação mais adequada, considerando custo, precisão para endereços brasileiros, segurança de credenciais e conformidade com o ecossistema Android/Expo;
3. Definir o ciclo de vida da geocodificação (momento da chamada, estratégia de atualização e tratamento de erros);
4. Projetar o fluxo de transmissão de coordenadas do cliente até a inicialização do mapa (`orcamento -> cliente -> endereco -> mapa`);
5. Garantir tolerância a falhas absoluta (se o serviço externo falhar, o endereço textual é salvo com sucesso e o usuário navega manualmente no mapa);
6. Preservar 100% dos módulos e testes já homologados.

---

## 6. Não Objetivos

- **NÃO** implementar código nesta fase;
- **NÃO** instalar novas dependências ou pacotes npm;
- **NÃO** alterar tabelas, colunas ou constraints no PostgreSQL (o modelo atual já é suficiente);
- **NÃO** alterar políticas de RLS;
- **NÃO** substituir o `MapProvider` nem alterar seu modo de renderização Satélite;
- **NÃO** implementar autocompletar de endereços em tempo real enquanto o usuário digita (o escopo é geocodificação no salvamento do cadastro);
- **NÃO** alterar o algoritmo de cálculo de área geodésica em PostGIS (GAP-AREA-04);
- **NÃO** iniciar desenvolvimento dos blocos subsequentes (PDF ou Expiração de Orçamentos).

---

## 7. Arquitetura Atual Relevante

A Arquitetura Técnica v1.1 do projeto organiza as responsabilidades em 4 camadas bem delineadas:

```
┌─────────────────────────────────────────────────────────────┐
│                    1. PRESENTATION                          │
│  - app/(app)/clientes/novo.tsx, editar.tsx                  │
│  - app/(app)/orcamentos/areas.tsx, mapa.tsx                 │
│  - src/presentation/components/mapa/mapa-delimitacao.tsx    │
└──────────────────────────────┬──────────────────────────────┘
                               │ aciona
┌──────────────────────────────▼──────────────────────────────┐
│                    2. APPLICATION                           │
│  - ClienteService / CriarClienteUseCase / AtualizarCliente  │
│  - GeocodificacaoService (Orquestração do Provider)         │
│  - cliente.validator.ts                                     │
└──────────────────────────────┬──────────────────────────────┘
                               │ orquestra
┌──────────────────────────────▼──────────────────────────────┐
│                    3. DOMAIN                                │
│  - Entidades: Cliente, Endereco                             │
│  - Interfaces de Repositório: ClienteRepository             │
│  - Invariantes: Validação numérica de latitude/longitude    │
└──────────────────────────────┬──────────────────────────────┘
                               │ implementa
┌──────────────────────────────▼──────────────────────────────┐
│                    4. INFRASTRUCTURE                        │
│  - SupabaseClienteRepository                                │
│  - GeocodingProvider (Implementação Concreta)               │
│  - MapProvider (react-native-maps / Google Maps Android)     │
│  - Banco de Dados PostgreSQL 17 + PostGIS 3.3.7             │
└─────────────────────────────────────────────────────────────┘
```

A introdução do serviço de geocodificação respeita rigorosamente essa separação: o domínio permanece agnóstico a APIs externas, a aplicação coordena o fluxo e a infraestrutura implementa a comunicação HTTP/REST com o provedor.

---

## 8. Opções de Provider de Geocodificação

Foram avaliadas quatro opções viáveis de provedores de geocodificação para o aplicativo Android:

### Opção 1: Google Geocoding API (HTTP REST Direto)
- **Mecanismo:** Requisição HTTP direta via `fetch()` para a API oficial do Google Maps Platform: `https://maps.googleapis.com/maps/api/geocode/json`.
- **Autenticação:** Google Maps API Key passada como parâmetro.
- **Custo / Cotas:** Crédito recorrente gratuito mensal de $200 no Google Cloud (equivalente a até 40.000 requisições mensais de geocodificação). Para a volumetria de um app de jardinagem (dezenas a centenas de clientes/mês), o custo é nulo.
- **Precisão no Brasil:** Excelente. Reconhece CEP brasileiro, logradouro com número predial exato (`ROOFTOP`), bairros e variações de escrita.
- **Dependência de Pacotes:** Nenhuma dependência externa adicional (`fetch` nativo do runtime JavaScript).

### Opção 2: Geocoder Nativo do Android via `expo-location` (`Location.geocodeAsync`)
- **Mecanismo:** Chamada à API nativa do sistema operacional (`android.location.Geocoder`), que delega a resolução para o Google Play Services no dispositivo.
- **Autenticação:** Não exige chave de API em código de aplicação.
- **Custo:** Gratuito e ilimitado nos dispositivos Android homologados com Google Play Services.
- **Precisão no Brasil:** Muito boa, utilizando os mesmos dados de base do Google.
- **Dependência de Pacotes:** Exige instalação da biblioteca `expo-location`.
- **Limitações:** Em ambientes de emulador sem Google Play Services configurado ou sem permissão de localização no manifesto, o Geocoder nativo pode retornar lista vazia de forma opaca.

### Opção 3: OpenStreetMap / Nominatim (HTTP REST)
- **Mecanismo:** Chamada HTTP para o endpoint público `https://nominatim.openstreetmap.org/search`.
- **Autenticação:** Não exige API key; exige cabeçalho `User-Agent` personalizado.
- **Custo:** Gratuito sob política de uso justo da comunidade.
- **Limitações:** Política rígida de no máximo 1 requisição por segundo; proibição de uso comercial de alta intensidade; precisão baixa no Brasil para numeração predial (frequentemente resolve apenas no centro da rua ou do bairro).

### Opção 4: Supabase Edge Function como Proxy de Geocodificação
- **Mecanismo:** O app móvel chama uma Edge Function (`/functions/v1/geocode`), que por sua vez consulta a Google Geocoding API utilizando uma chave mantida em segredo no backend Supabase.
- **Segurança:** Isolamento absoluto da chave de API externa.
- **Complexidade:** Adiciona um ponto de falha de rede intermediário, exigência de deploy de funções Deno e manutenção de infraestrutura de backend para uma chamada simples.

---

## 9. Comparação Técnica

A matriz abaixo confronta as opções segundo critérios técnicos objetivos:

| Critério Técnico | Opção 1: Google Geocoding REST | Opção 2: Native Android (`expo-location`) | Opção 3: Nominatim (OSM) | Opção 4: Supabase Proxy |
| :--- | :--- | :--- | :--- | :--- |
| **Compatibilidade Android** | Total (via HTTP padrão) | Total (Google Play Services) | Total (via HTTP padrão) | Total (via Supabase client) |
| **Necessidade de Pacote npm** | **Nenhuma** (Zero dependências) | Sim (`expo-location`) | **Nenhuma** (Zero dependências) | **Nenhuma** (já usa Supabase) |
| **Qualidade p/ Endereços BR** | **Excelente** (Padrão ouro) | **Excelente** (Google Play) | Regular / Baixa | **Excelente** (Google) |
| **Resolução de Número Predial** | **Alta (`ROOFTOP`)** | **Alta** | Média/Baixa | **Alta** |
| **Custo Operacional** | Gratuito ($200 crédito/mês) | Gratuito | Gratuito | Gratuito + Custo Supabase |
| **Isolamento de Chave** | Restrição de API no GCP | Não requer chave no app | Não requer chave | Segredo no backend |
| **Complexidade Arquitetural** | **Mínima** (Serviço simples) | Média (Módulo nativo Expo) | **Mínima** | Alta (Deploy Edge Function) |
| **Resiliência a Falhas** | Excelente com Timeout | Boa (depende do Play Services) | Baixa (Rate Limit 1 req/s) | Média (2 saltos de rede) |

---

## 10. Decisão Recomendada

### Proposta Oficial: Google Geocoding API via HTTP REST com Provedor Desacoplado

Recomenda-se a adoção da **Google Geocoding API (Opção 1)**, implementada por meio de um provedor de infraestrutura desacoplado (`GoogleGeocodingProvider`), pelas seguintes razões técnicas:

1. **Sinergia com a Solução de Mapas:** O projeto já utiliza Google Maps com API Key configurada no Android (`GAP-AREA-02`), consolidando todo o ecossistema espacial na plataforma Google Maps Platform;
2. **Zero Dependências Novas:** Utiliza a API `fetch()` global padrão do React Native / TypeScript, sem introduzir bibliotecas externas ao projeto;
3. **Qualidade Superior no Território Nacional:** É o serviço mais confiável para identificar logradouros, bairros, CEPs e números residenciais no Brasil;
4. **Custo Nulo no Cenário do Projeto:** A cota gratuita de $200 mensais do Google Cloud absorve com imensa folga a demanda do aplicativo;
5. **Isolamento Arquitetural:** O contrato `GeocodingProvider` garante que, se no futuro for necessário alternar para outro provedor, nenhuma linha de código da camada de aplicação ou domínio será alterada.

---

## 11. Contratos Arquiteturais

O serviço de geocodificação será inserido na camada de infraestrutura sob a interface canônica `GeocodingProvider`:

### 11.1. Interface do Provedor (`src/application/interfaces/geocoding-provider.interface.ts`)

```typescript
export interface EnderecoConsultaGeocoding {
  logradouro?: string | null;
  numero?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
}

export type PrecisaoGeocoding = 'ROOFTOP' | 'RANGE_INTERPOLATED' | 'GEOMETRIC_CENTER' | 'APPROXIMATE';

export interface CoordenadasGeocoding {
  latitude: number;
  longitude: number;
  enderecoFormatado?: string;
  precisao?: PrecisaoGeocoding;
}

export interface GeocodingProvider {
  geocodificar(endereco: EnderecoConsultaGeocoding): Promise<CoordenadasGeocoding | null>;
}
```

### 11.2. Tratamento de Exceções Tipadas (`src/domain/errors/geocoding-error.ts`)

```typescript
export class GeocodingError extends Error {
  constructor(message: string, public readonly codigo: 'TIMEOUT' | 'INDISPONIVEL' | 'FORMATO_INVALIDO' | 'LIMITE_EXCEDIDO' | 'DESCONHECIDO') {
    super(message);
    this.name = 'GeocodingError';
  }
}
```

---

## 12. Fluxos de Execução

### 12.1. Fluxo RF10: Geocodificação no Cadastro/Edição de Cliente

```
[Usuário na Tela de Cliente]
       │ Preenche dados cadastrais e endereço
       ▼
[Toca em Salvar Cliente]
       │
       ▼
[ClienteService.salvarCliente()]
       │
       ├──> Valida dados textuais (cliente.validator.ts)
       │
       ├──> Endereço possui dados suficientes? (temDadosEndereco)
       │       │
       │       ├── NÃO ──> Salva Cliente com endereço nulo
       │       │
       │       └── SIM ──> Invoca GeocodingProvider.geocodificar(endereco)
       │                     │
       │                     ├── SUCESSO ──> Retorna { latitude, longitude }
       │                     │                 │
       │                     │                 ▼
       │                     │         Salva Endereço com coordenadas
       │                     │
       │                     └── FALHA / TIMEOUT / NÃO ENCONTRADO
       │                               │
       │                               ▼
       │                         Registra aviso em log / feedback não-bloqueante
       │                         Salva Endereço com latitude/longitude = NULL (RN06)
       ▼
[Retorna Cliente Salvo e Redireciona]
```

### 12.2. Fluxo RF11: Posicionamento Inicial da Delimitação no Mapa

```
[Usuário no Detalhe do Item de Orçamento (areas.tsx)]
       │ Toca em 'Delimitar Nova Área'
       ▼
[Carrega Dados do Orçamento e do Cliente Associado]
       │
       ├──> Cliente possui endereço com latitude e longitude não nulas?
       │       │
       │       ├── SIM (RF11 / RN07):
       │       │     regiaoInicial = {
       │       │       latitude: cliente.endereco.latitude,
       │       │       longitude: cliente.endereco.longitude,
       │       │       latitudeDelta: 0.003, // Zoom de alta proximidade (satélite)
       │       │       longitudeDelta: 0.003
       │       │     }
       │       │
       │       └── NÃO (RF12 / RN09):
       │             regiaoInicial = REGIAO_PADRAO (Praça da Sé: -23.55052, -46.633308)
       ▼
[Navega para orcamentos/mapa.tsx passando regiaoInicial ou coordenadas na rota]
       │
       ▼
[MapProvider abre centrado na residência do cliente em Modo Satélite]
       │
       ▼
[Usuário visualiza o imóvel de cima e desenha os vértices da área de serviço]
```

### 12.3. Fluxo RF12: Localização Manual sem Coordenadas (Fallback)

- Se o cliente não tiver endereço ou a geocodificação falhou;
- O mapa abre na região padrão;
- O operador utiliza os gestos nativos de arrasto (*Pan*) e aproximação (*Pinch to Zoom*) sobre a imagem de satélite até enquadrar a propriedade;
- Ao tocar na tela, os vértices são adicionados normalmente, cumprindo integralmente o requisito RF12 e a regra RN09.

---

## 13. Persistência de Dados

A análise rigorosa do Modelo Físico v1.1 confirma que **nenhuma migration de banco é necessária**:

```sql
-- Estrutura canônica já existente na tabela public.endereco:
latitude  NUMERIC(9,6) CONSTRAINT endereco_latitude_check CHECK (latitude IS NULL OR (latitude >= -90.0 AND latitude <= 90.0))
longitude NUMERIC(9,6) CONSTRAINT endereco_longitude_check CHECK (longitude IS NULL OR (longitude >= -180.0 AND longitude <= 180.0))
```

- **Precisão Numérica:** O tipo `NUMERIC(9,6)` armazena 6 casas decimais, o que equivale a uma precisão submétrica na superfície terrestre (~0,1 metro), perfeitamente adequada para localização de terrenos e jardins;
- **Nulidade Controlada:** Ambos os campos aceitam valor nulo (`NULL`), o que viabiliza salvar clientes sem endereço ou clientes cuja geocodificação falhou sem violar restrições;
- **Atualização de Endereço:** Ao alterar os campos textuais do endereço em `AtualizarClienteUseCase`, a geocodificação é reexecutada. Se o novo endereço retornar novas coordenadas, os campos são atualizados; se falhar, as coordenadas antigas são substituídas por `NULL` para não manter localização de imóvel anterior.

---

## 14. Segurança

1. **Proteção da Chave de API:**
   - A Google Maps API Key deve ser configurada via variáveis de ambiente (`EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` ou segredo seguro de build Expo);
   - No console do Google Cloud Platform, a chave deve ser restrita:
     - Restrição de API: limitar estritamente a *Geocoding API* e *Maps SDK for Android*;
     - Restrição de aplicativo: assinatura SHA-1 e pacote Android `com.jardinagem.app` para chamadas nativas do SDK.
2. **Isolamento Multitenant (RLS):**
   - O salvamento de coordenadas na tabela `endereco` permanece protegido pelas políticas de RLS vigentes (`endereco_select_policy`, `endereco_insert_policy`, `endereco_update_policy`);
   - Nenhum usuário pode visualizar ou alterar endereços e coordenadas pertencentes a clientes de outro usuário.
3. **Uso de HTTPS Estrito:** Todas as chamadas para a API de geocodificação utilizam TLS 1.3 criptografado.

---

## 15. Privacidade e Proteção de Dados (LGPD)

1. **Minimização de Dados (Data Minimization):**
   - A requisição enviada ao provedor externo de geocodificação contém **apenas dados geográficos** (ex.: `Rua das Flores, 123, Jardim Paulista, São Paulo, SP`);
   - **Nunca** são transmitidos dados identificadores do cliente, como **Nome**, **CPF/Documento**, **Telefone**, **E-mail** ou anotações internas;
2. **Transparência:** O usuário final tem ciência de que o endereço é utilizado para referência do mapa;
3. **Retenção no Provedor:** Os termos da Google Maps Platform estipulam que dados de geocodificação são processados para retorno imediato das coordenadas, sem associação com identidades pessoais do aplicativo.

---

## 16. Tratamento de Erros e Resiliência

Em estrita consonância com **RNF15** e **RNF22**, o sistema não deve interromper o fluxo do usuário em caso de indisponibilidade de serviços de terceiros:

| Cenário de Falha | Comportamento do Sistema | Feedback ao Usuário | Estado das Coordenadas |
| :--- | :--- | :--- | :--- |
| **Endereço não localizado** | Salva cliente e endereço normalmente | Toast amigável: *'Endereço salvo. Coordenadas não localizadas; utilize o mapa manual.'* | `latitude: null, longitude: null` |
| **Sem conexão de internet / Offline** | Salva dados locais no Supabase quando reconectar ou acusa erro de rede geral | Mensagem de erro de conexão | Mantém nulo |
| **Timeout da API (> 5 segundos)** | Aborta requisição de geocodificação e salva o cliente | Não bloqueia o salvamento; log informativo | `latitude: null, longitude: null` |
| **Cota excedida / Erro de chave** | Captura erro em bloco `try/catch` defensivo | Salva cliente sem travar a interface | `latitude: null, longitude: null` |
| **Endereço ambíguo (múltiplos retornos)** | Seleciona o primeiro resultado (`results[0]`) com precisão mais alta | Salva com a coordenada obtida | Coordenada do 1º resultado |

---

## 17. Fallback Manual e Desacoplamento Conceitual

É fundamental formalizar a distinção entre três conceitos espaciais distintos no sistema:

1. **Localização Geográfica do Cliente (`ENDERECO.latitude/longitude`):** Ponto cartesiano único representando a residência ou sede do contratante;
2. **Posição Inicial de Abertura do Mapa (`regiaoInicial`):** Ponto focal de câmera no momento em que a tela do mapa é aberta;
3. **Área de Serviço Delimitada (`AREA.poligono`):** Geometria PostGIS fechada (`POLYGON`) de 3 ou mais vértices, que define o canteiro ou jardim a ser medido e precificado.

> [!IMPORTANT]
> A ausência da localização do cliente nunca impede a criação da área de serviço. O operador pode iniciar o mapa em qualquer ponto e desenhar o polígono com total liberdade métrica.

---

## 18. Integração com a Tela de Mapa

A passagem das coordenadas para o mapa ocorrerá de forma limpa e sem acoplamento:

1. Em `app/(app)/orcamentos/areas.tsx`, a função `handleAbrirMapa()` obtém o `clienteId` do orçamento já carregado;
2. Consulta as coordenadas do cliente (caso o orçamento já traga os dados ou via consulta rápida de cache);
3. Passa os parâmetros opcionais na rota do Expo Router:
   ```typescript
   const lat = cliente?.endereco?.latitude;
   const lng = cliente?.endereco?.longitude;
   const query = lat && lng ? `&lat=${lat}&lng=${lng}` : '';
   router.push(`/orcamentos/mapa?orcamentoId=${orcamentoId}&itemId=${itemId}${query}` as any);
   ```
4. Em `app/(app)/orcamentos/mapa.tsx`, lê os parâmetros `lat` e `lng`:
   - Se presentes e válidos, define `regiaoInicial: { latitude: Number(lat), longitude: Number(lng), latitudeDelta: 0.003, longitudeDelta: 0.003 }`;
   - Passa `regiaoInicial` para `<MapaDelimitacao regiaoInicial={regiaoInicial} />`;
   - `MapaDelimitacao` repassa diretamente para `<MapProvider regiaoInicial={regiaoInicial} />`.

Essa estratégia **não altera** o componente `MapProvider` e reaproveita 100% de sua lógica já homologada.

---

## 19. Estratégia de Testes

O plano de testes cobrirá todos os níveis da pirâmide:

### 19.1. Testes Unitários de Provedor e Validação (Vitest)
1. Montagem correta da URL da Google Geocoding API a partir dos campos do endereço;
2. Parsing correto da resposta JSON da API e extração de latitude e longitude;
3. Tratamento de resposta `ZERO_RESULTS` retornando `null`;
4. Tratamento de timeout ou falha de rede retornando `GeocodingError`;
5. Validação de formato e limites de coordenadas (-90 a 90, -180 a 180).

### 19.2. Testes de Casos de Uso de Aplicação (Vitest com Mocks)
1. `CriarClienteUseCase` com endereço completo: verifica se o provedor é acionado e se as coordenadas são repassadas ao repositório;
2. `CriarClienteUseCase` quando o provedor falha: verifica se o cliente é salvo com sucesso com coordenadas nulas (resiliência);
3. `AtualizarClienteUseCase` alterando endereço: verifica atualização correta das coordenadas;
4. `AtualizarClienteUseCase` removendo endereço: verifica limpeza de coordenadas.

### 19.3. Testes de Integração e RLS (PostgreSQL / pgTAP)
1. Testes de persistência de latitude e longitude válidas na tabela `endereco`;
2. Testes de disparo de check constraint para coordenadas fora do limite;
3. Testes de garantia de RLS em consultas de endereços geocodificados.

### 19.4. Testes Empíricos no Emulador Android (Pixel_10)
1. Cadastro de cliente com endereço real brasileiro (ex.: Av. Paulista, 1000, São Paulo, SP);
2. Verificação do preenchimento das coordenadas;
3. Criação de orçamento vinculado ao cliente e navegação para a tela de medição de área no mapa;
4. Confirmação visual de que o mapa via satélite abre focado na Av. Paulista, 1000;
5. Teste de regressão do desenho de polígonos, adição de vértices, botões desfazer/limpar e salvamento da área.

---

## 20. Impacto nos Módulos Congelados

A implementação do Bloco A foi projetada para ter **impacto zero** sobre os módulos homologados:

- **GAP-AREA-01 (Desenho de Polígonos):** Preservado integralmente. Nenhuma lógica de vértices, botões ou hooks de desenho é modificada;
- **GAP-AREA-02 (API Key Google Maps):** Preservado integralmente. A mesma chave pode ser habilitada para a API Geocoding no GCP;
- **GAP-AREA-04 (Cálculo PostGIS de Área):** Preservado integralmente. As geometrias de `AREA` continuam sendo polígonos fechados em SRID 4326;
- **GAP-AREA-06 / 07 / 08 (Itens de Orçamento e Metragem):** Preservados integralmente;
- **Clientes e Catálogos:** Não há alteração em assinaturas de métodos existentes; a geocodificação ocorre de forma composicional e aditiva.

---

## 21. Decisões Técnicas Formalizadas

Ficam registradas e numeradas as seguintes decisões técnicas para este bloco:

### DECISÃO-GEO-01: Provedor de Geocodificação
- **Decisão:** Adotar a **Google Geocoding API via HTTP REST**;
- **Motivação:** Máxima fidelidade e precisão com numeração predial no Brasil, custo gratuito na volumetria do app, sem dependências adicionais e padronização com o ecossistema Google Maps já homologado.

### DECISÃO-GEO-02: Momento da Geocodificação
- **Decisão:** A geocodificação será executada **automaticamente no salvamento do cliente** (`CriarClienteUseCase` e `AtualizarClienteUseCase`);
- **Motivação:** Transparência total para o usuário, sem exigir botões manuais adicionais, mantendo a interface simples e ágil (RNF01).

### DECISÃO-GEO-03: Reutilização do Modelo Físico sem Migrations
- **Decisão:** Utilizar estritamente as colunas `latitude` e `longitude` já existentes na tabela `endereco`;
- **Motivação:** O Modelo Físico v1.1 já é completo e homologado. Não criar migrations desnecessárias preserva a estabilidade do banco.

### DECISÃO-GEO-04: Estratégia de Fallback Manual (RF12 / RN09)
- **Decisão:** Quando o cliente não possuir coordenadas ou a geocodificação falhar, o mapa abrirá na região padrão (`REGIAO_PADRAO`), permitindo navegação manual livre via gestos de Pan e Zoom;
- **Motivação:** Atendimento estrito a RF12 e RN09 sem complexidade de interface desnecessária.

### DECISÃO-GEO-05: Tolerância a Falhas e Não-Bloqueio (RNF15 / RNF22)
- **Decisão:** Qualquer falha na geocodificação (timeout, offline, erro HTTP) será tratada de forma silenciosa e resiliente: o cliente e o endereço textual serão salvos normalmente com coordenadas nulas;
- **Motivação:** A indisponibilidade de rede ou do Google não pode impedir o cadastro de um cliente nem paralisar o trabalho do jardineiro.

### DECISÃO-GEO-06: Minimização e Privacidade de Dados (LGPD)
- **Decisão:** Somente strings de logradouro, número, bairro, cidade, estado e CEP serão enviadas para o endpoint de geocodificação;
- **Motivação:** Conformidade com o princípio de minimização de dados da LGPD; nenhum dado pessoal sensível do cliente é compartilhado.

### DECISÃO-GEO-07: Injeção de Posição Inicial via Rota no Expo Router
- **Decisão:** A tela `app/(app)/orcamentos/areas.tsx` enviará as coordenadas do cliente via query params de rota para `app/(app)/orcamentos/mapa.tsx`, que montará a `regiaoInicial` repassada ao `MapProvider`;
- **Motivação:** Desacoplamento limpo sem acoplar a tela de mapa ao repositório de clientes, mantendo o `MapProvider` intacto.

---

## 22. Riscos e Mitigações

| Risco Identificado | Probabilidade | Impacto | Estratégia de Mitigação |
| :--- | :---: | :---: | :--- |
| **Falha de rede ou timeout durante cadastro** | Média | Baixo | Tratamento defensivo com `try/catch` que salva o cliente com coordenadas nulas sem travar a UI. |
| **Endereço digitado incompleto ou inexistente** | Média | Baixo | Provedor retorna `null`; sistema aceita o endereço textual e permite localização manual no mapa. |
| **Exposição de Chave de API no aplicativo** | Baixa | Médio | Restringir a API Key no Google Cloud Console por IP/aplicativo e limitar escopo estritamente a Geocoding. |
| **Regressão no componente MapProvider** | Baixa | Alto | O `MapProvider` não será modificado; apenas receberá a prop `regiaoInicial` já existente em sua interface. |

---

## 23. Dependências e Pré-Requisitos

- Habilitação da **Geocoding API** no mesmo projeto do Google Cloud Platform onde a chave do Google Maps foi gerada;
- Definição da variável de ambiente com a chave de API nos ambientes de teste e desenvolvimento;
- Nenhuma dependência externa ou biblioteca npm adicional é necessária.

---

## 24. Critérios de Aceitação

A futura implementação do Bloco A será considerada concluída somente se atender a todos os seguintes critérios:

1. Ao cadastrar um cliente com endereço válido, as colunas `latitude` e `longitude` da tabela `endereco` são preenchidas com valores numéricos coerentes;
2. Ao cadastrar um cliente com endereço inválido ou sem internet, o cliente e o endereço textual são salvos sem erros, com coordenadas `null`;
3. Ao abrir a delimitação de área de um orçamento cujo cliente possui coordenadas válidas, a câmera do mapa via satélite inicia posicionada sobre a residência do cliente;
4. Ao abrir a delimitação de área para cliente sem coordenadas, o mapa inicia na posição padrão e permite navegação manual livre;
5. O desenho de polígonos, cálculo de área e consolidação nos itens continuam funcionando sem qualquer regressão;
6. 100% dos testes unitários, testes de caso de uso e testes pgTAP continuam passando.

---

## 25. Critérios de Homologação

A homologação do Bloco A exigirá:
1. Emissão de Relatório de Implementação detalhado;
2. Execução de auditoria técnica independente;
3. Bateria completa de testes automatizados (unitários + integração + regressão de áreas);
4. Evidência empírica gravada/fotografada no emulador Android Pixel_10 demonstrando:
   - Cadastro de cliente com geocodificação;
   - Abertura do mapa centrada no endereço do cliente;
   - Desenho de polígono sobre a área do imóvel;
5. Emissão de parecer formal favorável de auditoria antes do congelamento do módulo.

---

## 26. Próximo Passo

Em conformidade com a governança canônica do projeto:

1. **PARALISAÇÃO:** Nenhuma linha de código deve ser escrita antes da aprovação deste planejamento;
2. **GATE FORMAL:** Submissão deste documento para **Homologação do Planejamento Técnico do Bloco A**;
3. **FASE POSTERIOR:** Somente após a homologação deste plano será autorizado o início da implementação controlada do Bloco A;
4. **ROADMAP DOS DEMAIS BLOCOS:**
   - **Bloco B:** Geração e Compartilhamento de Proposta em PDF (planejamento futuro);
   - **Bloco C:** Automação da Expiração Temporal de Orçamentos (planejamento futuro).

---

### **PLANEJAMENTO CONCLUÍDO — BLOCO A — AGUARDANDO HOMOLOGAÇÃO**

---
*Fim do Documento de Planejamento Técnico v1.0.*