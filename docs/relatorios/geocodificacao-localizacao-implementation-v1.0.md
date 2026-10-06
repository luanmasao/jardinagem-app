# Relatório Técnico de Implementação — Bloco A v1.1
## Geolocalização e Geocodificação de Clientes

**Projeto:** Sistema de Orçamentos para Jardinagem  
**Módulo:** Geolocalização e Geocodificação de Clientes (Bloco A)  
**Status do Gate:** IMPLEMENTAÇÃO CONCLUÍDA — BLOCO A — AGUARDANDO AUDITORIA  
**Data:** 03 de Outubro de 2026  
**Documento de Planejamento Homologado:** `docs/planejamento/geocodificacao-localizacao-plan-v1.1.md`  
**Parecer de Homologação Vinculante:** `docs/planejamento/geocodificacao-localizacao-homologacao-v1.1.md`  
**Inventário de Cobertura Vigente:** `docs/planejamento/requisitos-cobertura-status-v1.0.md`  

---

## 1. Contexto

O presente documento relata a implementação técnica do **Bloco A (Geolocalização e Geocodificação de Clientes)** do Sistema de Orçamentos para Jardinagem. O objetivo deste bloco é integrar de forma transparente a obtenção de coordenadas geográficas (latitude e longitude) a partir do endereço textual informado no cadastro e atualização de clientes, fornecendo tais coordenadas para o posicionamento inicial do mapa de delimitação de áreas de serviço.

A implementação foi realizada de forma estritamente incremental, baseada no **Planejamento Técnico v1.1 Homologado**, com impacto zero sobre a estrutura do banco de dados (zero migrations) e preservando integralmente todos os módulos e componentes congelados das fases anteriores.

---

## 2. Requisitos Cobertos

A implementação contempla com exatidão os requisitos funcionais, regras de negócio e requisitos não funcionais estipulados no planejamento:

- **RF10 (Geocodificação Automática):** Obtenção automática de latitude e longitude a partir do endereço textual fornecido pelo usuário no cadastro e na atualização de clientes.
- **RF11 (Posicionamento Inicial do Mapa):** Abertura do mapa satellite centrado nas coordenadas geográficas do cliente quando disponíveis e válidas.
- **RF12 (Fallback para Localização Manual):** Na ausência de coordenadas cadastradas, o mapa abre na região padrão definida pela aplicação, permitindo que o profissional navegue, localize manualmente o imóvel e delimite as áreas de trabalho.
- **RN06 (Preenchimento das Coordenadas):** Coordenadas são preenchidas de forma automática quando o geocodificador retorna resultado válido ou permanecem nulas caso não sejam encontradas.
- **RN07 (Referência de Posicionamento):** Coordenadas válidas do cliente orientam o posicionamento inicial da tela de delimitação espacial.
- **RN09 (Desacoplamento e Não-Sobrescrita):** A localização manual utilizada para posicionar o mapa ou desenhar a área de trabalho NÃO substitui e nem sobrescreve as coordenadas persistidas do endereço do cliente.
- **RNF01 (Usabilidade):** Operação simples, direta e transparente, sem exigir ações extras desnecessárias do usuário.
- **RNF03 (Feedback Operacional):** Notificação compreensível no salvamento sobre o status da localização.
- **RNF15 (Resiliência do Serviço Externo):** Tratamento gracioso de indisponibilidade de rede, erros do geocodificador ou ausência de resultado sem lançar exceções não tratadas.
- **RNF22 (Não-Bloqueio de Cadastro):** A falha do provedor de geocodificação não impede o cadastro nem a atualização do cliente e do endereço.

---

## 3. Decisões Aplicadas

Todas as 9 decisões técnicas homologadas foram rigorosamente implementadas:

| Decisão Homologada | Resumo da Decisão | Detalhe da Implementação no Código |
|---|---|---|
| **DECISÃO-GEO-01** | Geocoder nativo Android via `expo-location` (`android.location.Geocoder`). | Implementado em `ExpoLocationGeocodingProvider`. Sem uso de API Key própria de geocodificação e sem requisições REST manuais. |
| **DECISÃO-GEO-02** | Geocodificação automática no salvamento de cliente. | Integrado em `CriarClienteUseCase`, `AtualizarClienteUseCase` e `SalvarEnderecoClienteUseCase`. |
| **DECISÃO-GEO-03** | Reutilização das colunas `latitude` e `longitude` da tabela `endereco`. | Zero migrations criadas. Utilizados os atributos já existentes no modelo relacional e na entidade `Endereco`. |
| **DECISÃO-GEO-04** | Fallback manual e não-sobrescrita automática das coordenadas do cliente. | A manipulação do mapa salva apenas polígonos na tabela `area`. Nenhuma escrita de volta na tabela `endereco` ocorre a partir do mapa. |
| **DECISÃO-GEO-05** | Resiliência e não-bloqueio: indisponibilidade externa não impede o cadastro. | Tratamento em bloco `try/catch` no use case. Se o provider falhar, persiste o endereço com coordenadas nulas e loga aviso. |
| **DECISÃO-GEO-06** | Minimização de dados (LGPD): envio exclusivo de campos de endereço. | Função `formatarEnderecoParaGeocodificacao` envia estritamente logradouro, número, bairro, cidade, estado e CEP. Dados pessoais nunca são incluídos. |
| **DECISÃO-GEO-07** | Região inicial desacoplada via mapa. | Propriedade `regiaoInicial` repassada declarativamente ao `MapProvider` existente em `MapaDelimitacao`. Lógica interna do mapa inalterada. |
| **DECISÃO-GEO-08** | Timeout padrão de 5.000 ms e cancelamento via `AbortSignal`. | Timer com limpeza garantida em `limparRecursos()` e rejeição tipada via `GeocodingError('TIMEOUT')` e `GeocodingError('CANCELADO')`. |
| **DECISÃO-GEO-09** | Consistência estrita endereço ↔ coordenadas. | Função `enderecosSaoIguais` detecta alterações textuais. Se o endereço for alterado e a geocodificação falhar, coordenadas antigas são forçadas a `NULL`. |

---

## 4. Dependência

- **Pacote Instalado:** `expo-location`
- **Comando Oficial Utilizado:** `npx expo install expo-location`
- **Versão Homologada e Resolvida:** `"expo-location": "~57.0.20"`
- **Compatibilidade:** Totalmente compatível com a versão instalada do Expo SDK (`~57.0.23`).
- **Bloqueio de Bibliotecas Extras:** Nenhuma biblioteca paralela (como `react-native-geocoding`, `axios` ou clientes Google REST) foi instalada.
- **Lockfile:** `package-lock.json` atualizado de forma consistente.

---

## 5. Provider

A implementação do provedor de geocodificação foi alocada exclusivamente na camada de infraestrutura:

- **Arquivo:** `src/infrastructure/services/geocoding/expo-location-geocoding.provider.ts`
- **Classe:** `ExpoLocationGeocodingProvider implements GeocodingProvider`
- **Import Dinâmico:** O módulo `expo-location` é importado dinamicamente (`await import('expo-location')`) dentro do método de execução, viabilizando a execução de testes automatizados em ambientes Node.js (como `tsx --test`) sem exigir bindings nativos em tempo de compilação da suíte de testes.
- **Resolução Nativa:** No runtime Android, utiliza internamente `Location.geocodeAsync(enderecoFormatado)`.

---

## 6. Contrato de Infraestrutura

- **Arquivo:** `src/application/interfaces/geocoding-provider.interface.ts`
- **Assinatura do Método:**
```typescript
geocodificar(
  endereco: EnderecoConsultaGeocoding,
  options?: GeocodificarOptions
): Promise<CoordenadasGeocoding | null>;
```
- **Tipos de Entrada:** `EnderecoConsultaGeocoding` (com campos opcionais `logradouro`, `numero`, `bairro`, `cidade`, `estado`, `cep`).
- **Tipos de Saída:** `CoordenadasGeocoding` (`latitude: number`, `longitude: number`, `precisao?: 'ROOFTOP' | 'APPROXIMATE'`) ou `null` quando o serviço não localizar o logradouro.
- **Erros Tipados:** Classe `GeocodingError` com códigos determinísticos: `'TIMEOUT'`, `'CANCELADO'`, `'INDISPONIVEL'`, `'ENDERECO_INVALIDO'`, `'ERRO_DESCONHECIDO'`.

---

## 7. Criação de Cliente (`CriarClienteUseCase`)

- **Localização:** `src/application/use-cases/cliente/criar-cliente.use-case.ts`
- **Fluxo Implementado:**
  1. Validação dos dados cadastrais do cliente e formato do endereço via `cliente.validator.ts`.
  2. Persistência da entidade `Cliente` associada ao `usuarioId` autenticado.
  3. Verificação de endereço: se houver campos textuais preenchidos e não houver coordenadas manuais pré-fixadas:
     - Aciona o `geocodingProvider.geocodificar(enderecoConsulta, { timeoutMs: 5000 })`.
     - **Sucesso:** Persiste o endereço com `latitude` e `longitude`.
     - **Não Encontrado (`null`):** Persiste o endereço com `latitude = null` e `longitude = null`.
     - **Erro / Timeout:** Captura o erro sem travar o use case (DECISÃO-GEO-05 / RNF22) e persiste o endereço com `latitude = null` e `longitude = null`.

---

## 8. Atualização de Cliente (`AtualizarClienteUseCase` e `SalvarEnderecoClienteUseCase`)

- **Localização:**
  - `src/application/use-cases/cliente/atualizar-cliente.use-case.ts`
  - `src/application/use-cases/cliente/salvar-endereco-cliente.use-case.ts`
- **Fluxo Implementado:**
  1. Consulta o endereço atual cadastrado no repositório.
  2. Avalia alteração via `enderecosSaoIguais(enderecoAtual, novoEndereco)`.
  3. Aplica a matriz de atualização homologada:
     - **Endereço inalterado:** Nenhuma chamada ao geocodificador; coordenadas existentes são preservadas intactas.
     - **Endereço alterado + Sucesso:** Novas coordenadas substituem as anteriores.
     - **Endereço alterado + Falha / Timeout / Não Encontrado:** Coordenadas anteriores são limpas para `NULL`.
     - **Endereço removido:** Registro de endereço é excluído.

---

## 9. Consistência Endereço ↔ Coordenadas (DECISÃO-GEO-09)

- **Regra Fundamental Implementada:** Em nenhuma hipótese a aplicação mantém coordenadas antigas vinculadas a um endereço textual novo que não pôde ser geocodificado com sucesso.
- **Detecção de Mudança:** A função `enderecosSaoIguais` compara de forma normalizada (trim e case-insensitive) os 6 campos físicos:
  - `logradouro`
  - `numero`
  - `bairro`
  - `cidade`
  - `estado`
  - `cep`
- **Invariante Garantida:** Se qualquer um desses campos for alterado e o novo endereço não puder ser validado pelo Geocoder (seja por timeout, erro de rede ou endereço inexistente), `latitude` e `longitude` são forçadas para `NULL`.

---

## 10. Timeout

- **Configuração:** Timeout padrão definido em 5.000 ms na classe `ExpoLocationGeocodingProvider`.
- **Implementação:** Concorrência controlada utilizando `Promise.race` entre a operação nativa e um timer `setTimeout`.
- **Descarte e Limpeza:** A função `limparRecursos()` executa `clearTimeout(timerId)` imediatamente após a conclusão ou falha, prevenindo vazamentos de timers no runtime.
- **Rejeição Controlada:** Em caso de estouro do tempo, rejeita com `new GeocodingError('TIMEOUT', 'Tempo limite de 5000ms excedido para geocodificação.')`.

---

## 11. Cancelamento

- **Suporte:** Suporte formal ao padrão `AbortSignal` via `options.signal`.
- **Detecção Imediata:** Se `signal.aborted` já for verdadeiro no início da execução, a chamada rejeita imediatamente sem acionar o Geocoder.
- **Interrupção em Espera:** Registra listener para o evento `'abort'`. Se disparado durante a requisição, limpa o timer e rejeita com `new GeocodingError('CANCELADO', 'Operação de geocodificação cancelada pelo chamador.')`.
- **Limpeza de Eventos:** O listener `'abort'` é removido em `limparRecursos()`.

---

## 12. Privacidade e Minimização de Dados (LGPD / DECISÃO-GEO-06)

- **Isolamento de Contrato:** O tipo `EnderecoConsultaGeocoding` contém exclusivamente dados físicos do imóvel.
- **Construção da Consulta:** A função pura `formatarEnderecoParaGeocodificacao` concatena apenas logradouro, número, bairro, cidade, estado e CEP:
  `"Av. Heitor Penteado, 1671, Taquaral, Campinas - SP, CEP 13087-000, Brasil"`
- **Dados Pessoais Excluídos:** Dados como nome do cliente, CPF/CNPJ, telefone, e-mail, observações, `clienteId` e `usuarioId` **NUNCA** são repassados ao provedor de geocodificação.
- **Validação Automatizada:** Testes unitários em `tests/infrastructure/geocoding-provider.test.ts` e `tests/clientes/geocodificacao-bloco-a.test.ts` verificam que nenhuma propriedade pessoal é injetada.

---

## 13. Fallback Manual (RF12 / DECISÃO-GEO-04)

- **Comportamento na Ausência de Coordenadas:** Quando o cliente não possui coordenadas ou a geocodificação falha, o mapa abre na região padrão (`REGIAO_PADRAO`).
- **Navegação e Desenho:** O usuário pode navegar, aproximar, distanciar e posicionar o mapa manualmente sobre o imóvel para delimitar as áreas de trabalho.
- **Desacoplamento Rigoroso:** As coordenadas do centro do mapa ou do polígono desenhado são utilizadas unicamente para calcular a área e registrar a entidade `AREA`. Em nenhuma hipótese o fallback manual altera os campos `latitude` ou `longitude` da tabela `endereco` do cliente.

---

## 14. Posicionamento Inicial do Mapa (RF11 / DECISÃO-GEO-07)

- **Fluxo em `app/(app)/orcamentos/areas.tsx`:**
  - Consulta pontual dos dados do cliente do orçamento (`clienteService.obterCliente(clienteId)`).
  - Prevenção ativa de consultas repetidas ou N+1.
  - Ao clicar para desenhar uma nova área, transmite as coordenadas via parâmetros de rota: `/orcamentos/mapa?modo=novo&clienteId=...&lat=-22.8751&lng=-47.0543`.
- **Fluxo em `app/(app)/orcamentos/mapa.tsx`:**
  - Lê `lat` e `lng` dos parâmetros de busca (`useLocalSearchParams`).
  - Se válidos, constrói `regiaoInicial` com delta aproximado `0.003`.
  - Injeta declarativamente na prop `regiaoInicial` de `MapaDelimitacao`, a qual repassa ao `MapProvider` homologado.

---

## 15. Resultados dos Testes Automatizados

Todas as suítes de testes automatizados do sistema foram executadas e validadas:

### 15.1. Verificação Estática de Tipos
- `npm run typecheck`: **APROVADO** (0 erros em todo o código-fonte).
- `npm run test:typecheck`: **APROVADO** (0 erros nas suítes de testes).

### 15.2. Suítes de Testes Unitários e de Integração
- **`npm run test:clientes`:** **43 APROVADOS** (incluindo 15 novos testes específicos do Bloco A cobrindo criação, atualização, consistência, limpeza de coordenadas antigas, timeout, cancelamento e não-sobrescrita).
- **`tests/infrastructure/geocoding-provider.test.ts`:** **10 APROVADOS** (testes focados em formatação, LGPD, timeout, cancelamento e validação de limites).
- **`npm run test:catalogo`:** **42 APROVADOS**.
- **`npm run test:orcamentos`:** **28 APROVADOS**.
- **`npm run test:areas`:** **82 APROVADOS**.
- **`npm run test:auth`:** **18 APROVADOS**.
- **`npm test` (geral):** **49 APROVADOS**.
- **`npx supabase test db` (pgTAP):** **170 APROVADOS** (validação de banco de dados, constraints PostGIS, RLS e ownership).

**Total Consolidado:** **455 testes automatizados aprovados (0 falhas).**

---

## 16. Validação no Ambiente Android

- **Dispositivo / AVD:** `Pixel_10`
- **Versão da Plataforma:** Android 16 / API Level 37
- **Compilação Nativa Gradle:** Compilado com sucesso via `:app:installDebug -PreactNativeArchitectures=x86_64` (resolvendo a limitação de MAX_PATH do Windows para builds multiplataforma).
- **Comunicação de Rede:** Mapeamento reverso configurado com sucesso via `adb reverse tcp:8081 tcp:8081` (Metro) e `adb reverse tcp:54321 tcp:54321` (Supabase Local).
- **Execução Real do App:**
  - Login e autenticação concluídos com sucesso.
  - Navegação para a lista de clientes e abertura do formulário de cadastro.
  - Submissão de novo cliente com endereço completo: persistido com sucesso no banco de dados (`Cliente BlocoA`, ID `16bfba3b-d822-4877-9500-2bb3463e2a34`).
  - Resiliência comprovada na prática: o cadastro concluiu com sucesso e as coordenadas permaneceram nulas sem interrupções nem crashes.

---

## 17. Regressão e Módulos Congelados

Confirmamos a preservação absoluta e sem efeitos colaterais de todos os componentes previamente homologados:

- **`GAP-AREA-01` (Modo Satellite e Alternância):** Preservado intacto.
- **`GAP-AREA-02` (Controle de Desenho e Edição de Polígonos):** Preservado intacto.
- **`GAP-AREA-04` (Cálculo Geodésico de Área em m²):** Preservado intacto.
- **`GAP-AREA-06` (Persistência Espacial PostGIS):** Preservado intacto.
- **`GAP-AREA-07` (Recálculo Automático de Itens e Orçamento):** Preservado intacto.
- **`GAP-AREA-08` (Eager Loading e Associação de Áreas):** Preservado intacto.
- **`MapProvider` e `MapaDelimitacao`:** Nenhuma lógica de desenho foi alterada; apenas a propriedade `regiaoInicial` foi conectada de forma puramente declarativa.

---

## 18. Limitações Conhecidas

- **Disponibilidade do Geocoder no Emulador:** O serviço nativo `android.location.Geocoder` depende dos Google Play Services e conectividade ativa do dispositivo móvel. Em emuladores AVD locais com redes corporativas ou restrições de proxy, o Geocoder pode retornar lista vazia ou falha temporária. Esta limitação foi expressamente prevista no planejamento e é integralmente absorvida pela arquitetura resiliente implementada (DECISÃO-GEO-05 / RNF22 / RF12).
- **Precisão em Cidades Pequenas / Zonas Rurais:** Logradouros sem numeração cadastrada na base cartográfica do Google Maps podem ser resolvidos em nível de bairro ou município (`APPROXIMATE`).

---

## 19. Auditoria de Versionamento e Git

- **Inspeção de Diffs (`git status -s` e `git diff`):**
  - Nenhuma migration de banco de dados foi criada ou alterada.
  - Nenhuma alteração nas tabelas ou políticas RLS do Supabase.
  - Apenas uma dependência oficial adicionada (`expo-location` no `package.json` e `package-lock.json`).
  - Alterações no código de aplicação restritas aos casos de uso de cliente e serviço de geocodificação.
  - Alterações na apresentação restritas à passagem declarativa de parâmetros de localização nas telas de mapas e áreas.
  - Nenhuma chave secreta, credencial ou token versionado.

---

## 20. Conclusão

A implementação do **Bloco A v1.1 (Geolocalização e Geocodificação de Clientes)** foi executada com total fidelidade ao planejamento homologado, satisfazendo integralmente os requisitos RF10, RF11, RF12, as regras de negócio RN06, RN07, RN09, os requisitos não funcionais RNF01, RNF03, RNF15, RNF22 e todas as 9 decisões técnicas homologadas.

Todos os 455 testes automatizados estão aprovados, os módulos congelados continuam íntegros e o relatório técnico está concluído.

Declaração oficial do Gate:
**IMPLEMENTAÇÃO CONCLUÍDA — BLOCO A — AGUARDANDO AUDITORIA**
