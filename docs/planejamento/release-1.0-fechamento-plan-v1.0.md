# Plano de Fechamento da Release 1.0

**Projeto:** Sistema de Orçamento para Jardinagem (Android / React Native)  
**Data:** 06 de Outubro de 2026  
**Responsável:** Arquiteto de Software e Responsável por Governança Técnica do Projeto  
**Versão do Documento:** 1.0 (Plano Normativo de Fechamento da Release 1.0)  
**Status Oficial:** `PLANO DE FECHAMENTO DA RELEASE 1.0 — AGUARDANDO AUDITORIA`  
**Referência do Inventário:** `docs/planejamento/requisitos-cobertura-status-pos-bloco-d-v1.0.md`  

---

## 1. Objetivo e Questão Central

Este plano estabelece as diretrizes normativas, critérios operacionais e passos formais necessários para responder objetivamente à seguinte questão técnica:

> **“Que condições ainda precisam ser satisfeitas para congelar a Release 1.0 como baseline técnica do projeto?”**

Com a conclusão dos desenvolvimentos e homologações dos 9 incrementos funcionais (Autenticação, Clientes, Catálogo de Serviços e Produtos, Orçamentos e Itens, Áreas/Mapas/Medição, Bloco A, Bloco B, Bloco C e Bloco D), o projeto atinge **100,00% de cobertura canônica homologada (198 de 198 requisitos)**.

O objetivo deste plano é estruturar a **transição governada do estado "Módulos Homologados Isoladamente" para o estado "Release 1.0 Técnica e Documentalmente Fechada"**, garantindo que nenhuma ponta solta ou regressão transversal passe despercebida.

> [!IMPORTANT]
> **Regra Fundamental de Governança:** Este plano NÃO homologa a Release 1.0. Ele define e formaliza os critérios de auditoria, regressão e congelamento para que a homologação global possa ser legitimamente concedida.

---

## 2. Estado Consolidado da Release

O estado técnico atual do repositório, fundamentado no *Inventário Oficial de Cobertura Pós-Bloco D — Release 1.0*, é o seguinte:

- **Universo de Requisitos:** 198 requisitos canônicos (82 Requisitos Funcionais, 81 Regras de Negócio e 35 Requisitos Não-Funcionais);
- **Requisitos Homologados:** **198 / 198 (100,00%)**;
- **Requisitos Pendentes:** **0 (0,00%)**;
- **Requisitos Parciais:** **0 (0,00%)**;
- **Requisitos Não Implementados:** **0 (0,00%)**;
- **Divergências com a Especificação:** **0 (0,00%)**;
- **Módulos Homologados e Congelados:** 11 módulos funcionais e de infraestrutura:
  1. *Autenticação e Sessão;*
  2. *Segurança e Multitenancy (RLS);*
  3. *Gerenciamento de Clientes;*
  4. *Catálogo de Serviços;*
  5. *Catálogo de Produtos;*
  6. *Orçamentos e Itens de Orçamento;*
  7. *Áreas, Mapas e Medição Espacial;*
  8. *Bloco A (Geolocalização e Geocodificação de Clientes v1.1);*
  9. *Bloco B (Geração e Apresentação Local de PDF v1.1);*
  10. *Bloco C (Compartilhamento Nativo de PDF v1.0);*
  11. *Bloco D (Expiração Temporal Automática de Orçamentos v1.0).*
- **Apontamentos Críticos ou Maiores Abertos:** Zero (`AUDIT-D-01` encerrado e sanado no Bloco D);
- **Observações Residuais Acolhidas:**
  - *Bloco C:* Recomendações de refinamento futuro de mensagens no catch do provider e otimização de cache de PDF na UI (`ACHADO-IMPL-SHARE-01 a 03`);
  - *Bloco D:* Autoridade temporal canônica no fuso `America/Sao_Paulo` do PostgreSQL e desacoplamento de telemetria em `app_private.expiracao_execucao_log`.

---

## 3. Critérios de Entrada para a Auditoria de Integração

A **Auditoria Técnica de Integração Global — Release 1.0** somente poderá ser formalmente iniciada após a validação cumulativa dos seguintes critérios de entrada:

1. **Inventário Oficial Pós-Bloco D Aprovado:** Documento `docs/planejamento/requisitos-cobertura-status-pos-bloco-d-v1.0.md` publicado e consistente;
2. **Plano de Fechamento Aprovado:** Este documento formalizado no repositório;
3. **Zero Pendências Bloco a Bloco:** Todos os 11 módulos formalmente homologados com termos e laudos arquivados;
4. **Ausência de Erros de Tipagem:** `npm run typecheck` e `npm run test:typecheck` executados com código `0` (zero erros TypeScript);
5. **Ambiente Local Saudável:**
   - Contêiner PostgreSQL / Supabase ativo com extensão PostGIS e `pg_cron` funcionais;
   - Job definitivo `job_expirar_orcamentos_diario` ativo no `cron.job`;
   - Zero dados residuais ou sintéticos (`BENCH-%`) nas tabelas de negócio;
   - Emulador Android (AVD Pixel_10 / API 37) disponível para testes de ponta a ponta.

---

## 4. Auditoria de Integração Global (18 Fluxos Transversais)

Diferente das homologações unitárias de cada bloco, a **Auditoria de Integração Global** deve exercitar a aplicação como um organismo integrado, percorrendo 18 fluxos transversais contínuos:

### Fluxo 1: Inicialização da Aplicação e Bootstrap
- Inicialização do app, carregamento do motor Hermes, montagem dos providers e verificação de variáveis de ambiente do Supabase e Google Maps sem crashes.

### Fluxo 2: Autenticação, Criptografia e Guarda de Rotas
- Ciclo de login com credenciais válidas via Supabase Auth, persistência segura da sessão via AES (`LargeSecureStore`), redirecionamento automático das rotas protegidas em `app/(app)` e logout com limpeza completa de tokens.

### Fluxo 3: Navegação Principal e Layout Responsivo
- Transição fluida entre abas (Clientes, Catálogo, Orçamentos), suporte a orientações de tela, `SafeAreaView` e `KeyboardAvoidingView` sem quebra visual.

### Fluxo 4: Criação, Edição e Inativação de Clientes
- Cadastro completo de cliente, persistência de dados de contato e observações, edição de dados e inativação lógica (soft delete) garantindo integridade referencial.

### Fluxo 5: Catálogo de Serviços e Produtos
- Cadastro de serviços com unidade comercial forçada em `m²` para serviços que utilizam medição de área (RN16); cadastro de produtos; atualização e inativação sem impacto retroativo em orçamentos.

### Fluxo 6: Criação de Orçamento e Ciclo Inicial
- Abertura de orçamento vinculado ao cliente, geração automática de número sequencial único para o usuário, inicialização mandatória no status `RASCUNHO` e salvamento preliminar com dados parciais.

### Fluxo 7: Inclusão de Serviços e Produtos no Orçamento
- Adição de itens originados do catálogo, validação de exclusão mútua SERVIÇO XOR PRODUTO (RN27), criação de snapshot histórico imutável (`ItemOrcamento`) e personalização de descrição/preço unitário local sem alterar o catálogo original.

### Fluxo 8: Delimitação e Medição de Áreas no Mapa Satélite
- Abertura do mapa satélite a partir de item com medição, desenho interativo de polígono com $>= 3$ vértices, fechamento do polígono, cálculo geodésico automático da área em m² via Chamberlain & Duquette, vinculação da geometria PostGIS ao item, suporte a múltiplas áreas (contíguas ou não), bloqueio de alteração manual de quantidade (RN34) e recálculo automático da quantidade do item pela soma das áreas.

### Fluxo 9: Geolocalização e Geocodificação de Clientes (Bloco A)
- Geocodificação automática de endereço do cliente obtendo latitude e longitude, armazenamento no registro de endereço e inicialização automática do mapa satélite centralizado nas coordenadas do cliente ao abrir a medição de área.

### Fluxo 10: Recálculo Financeiro, Descontos e Regras Monetárias
- Apuração contínua do subtotal ($\sum \text{itens}$), aplicação de desconto percentual (0 a 100%) ou valor fixo (0 ao subtotal), garantia de total nunca negativo ($\ge 0.00$), precisão de arredondamento BRL em duas casas decimais e persistência dos totais recalculados.

### Fluxo 11: Geração Local de PDF de Orçamentos (Bloco B)
- Acionamento da geração de proposta em PDF, compilação off-screen via `expo-print` a partir de template HTML/CSS institucional, persistência em cache privado e tempo de resposta < 1,5s sem congelamento da interface (RNF14).

### Fluxo 12: Visualização de PDF
- Abertura do documento gerado em visualizador nativo/webview, verificando cabeçalho padronizado, identificação do profissional e do cliente, discriminação de serviços, produtos, metragens de áreas em m², valores e observações idênticos aos dados cadastrados (RN80, RNF32).

### Fluxo 13: Compartilhamento Nativo de PDF (Bloco C)
- Acionamento do botão de compartilhamento, exibição de feedback reativo de preparação (RNF03), proteção contra múltiplos cliques concorrentes, sanitização e renomeação do arquivo para `Orcamento_<numero>.pdf`, disparo da Share Sheet nativa do Android via Intent `ACTION_SEND` e preservação estrita do status comercial da proposta (RN81).

### Fluxo 14: Expiração Temporal Automática e Validação de Envio (Bloco D)
- Validação impeditiva de envio para orçamentos incompletos (sem cliente, sem itens, sem validade ou com áreas pendentes); transição de `RASCUNHO` para `ENVIADO`; teste de imunidade de rascunhos vencidos à expiração (RF68, RN70); verificação da transição autônoma pelo daemon do `pg_cron` para propostas `ENVIADO` e `EM_ANALISE` vencidas para o status `EXPIRADO`; defesa complementar JIT no carregamento da listagem; e resolução de concorrência com *EvalPlanQual* preservando propostas aprovadas concorrentemente.

### Fluxo 15: Isolamento Multi-Tenant e Segurança de Perímetro
- Validação prática de isolamento entre dois usuários autenticados distintos: garantia de que o Usuário B não visualiza, altera ou exclui clientes, serviços, produtos, orçamentos, itens ou áreas do Usuário A; e bloqueio rigoroso de chamadas não autenticadas (`anon`).

### Fluxo 16: Tratamento de Erros e Resiliência da Interface
- Apresentação de mensagens orientativas amigáveis ao usuário para erros de validação, tratamento de indisponibilidade de rede ou falhas em serviços externos (`MapErrorBoundary`), sem fechamento inesperado (crash) do aplicativo.

### Fluxo 17: Persistência Durável e Recuperação de Estado
- Encerramento forçado e reinicialização completa da aplicação móvel e do contêiner PostgreSQL, comprovando que todos os cadastros, históricos, transições de status e áreas delimitadas permanecem intactos e perfeitamente recuperáveis.

### Fluxo 18: Regressão Cruzada entre Módulos
- Verificação de ausência de efeitos colaterais entre os módulos: comprovação de que as rotinas do Bloco D não interferem no compartilhamento do Bloco C, no layout do Bloco B, na geocodificação do Bloco A ou na edição de áreas e orçamentos.

---

## 5. Protocolo de Regressão Final Automatizada

Antes da emissão do termo de homologação, deve ser executada uma rodada integral das suítes de testes automatizados do projeto:

### 5.1. Testes de Banco de Dados (pgTAP)
- **Comando:** `npx supabase test db`
- **Escopo:** 9 arquivos de teste cobrindo `01_extensoes.sql` a `09_expiracao_orcamentos.sql`;
- **Métricas Esperadas:** 184 / 184 asserções aprovadas (**100% PASS**), 0 falhas, 0 erros.

### 5.2. Testes de Domínio, Aplicação e Infraestrutura (TypeScript / Vitest)
- **Comandos:**
  - `npm test` (Testes de entidades e cálculos de domínio);
  - `npm run test:clientes` (Use cases e repositórios de clientes);
  - `npm run test:catalogo` (Use cases e validações de serviços e produtos);
  - `npm run test:orcamentos` (Use cases de orçamentos, itens, duplicação e Bloco D);
  - `npm run test:areas` (Use cases de área, cálculo geodésico e hidratação);
  - `npm run test:pdf` (Mapeador de PDF, use case e gerador expo-print);
  - `npm run test:share` (Use case de compartilhamento e provider expo-sharing).
- **Métricas Esperadas:** Todas as suítes 100% aprovadas (**zero falhas**).

### 5.3. Checagem Estática de Tipos (TypeScript Typecheck)
- **Comandos:**
  - `npm run typecheck` (`tsc --noEmit`);
  - `npm run test:typecheck` (`tsc --project tsconfig.test.json --noEmit`).
- **Métricas Esperadas:** Código de retorno `0` com zero diagnósticos de erro.

### 5.4. Verificação de Sanidade do Banco de Dados
- **Comando SQL:**
  ```sql
  SELECT count(*) FROM public.orcamento WHERE numero LIKE 'BENCH-%';
  ```
- **Métricas Esperadas:** Resultado estritamente igual a `0`.

---

## 6. Baseline Técnica da Release 1.0 a Congelar

Ao término aprovado da Auditoria de Integração e da Regressão Final, os seguintes artefatos serão formalmente congelados e etiquetados como a **Baseline Oficial da Release 1.0**:

1. **Código-Fonte da Aplicação:**
   - Diretórios `src/` (Domain, Application, Infrastructure, Presentation) e `app/` (Expo Router);
2. **Dependências e Runtimes:**
   - `package.json` (versão 1.0.0 fixada) e `package-lock.json`;
   - Expo SDK ~57.0.23, React Native 0.86.3, React 19.2.3, Hermes Engine;
3. **Configuração Mobile Android:**
   - `app.config.js` (ID `com.jardinagem.app`, versão 1.0.0, version code 1);
   - Diretório nativo `android/` com Manifest, FileProvider e configurações de API 37;
4. **Infraestrutura de Banco e Migrations:**
   - Diretório `supabase/migrations/` contendo as migrations consolidadas:
     - `20260916020500_modelo_fisico_v1_1.sql` (Modelo Físico v1.1 e PostGIS);
     - `20260921000000_auth_rls.sql` (Políticas de RLS e segurança);
     - `20261006000000_expiracao_orcamentos_autonoma.sql` (Infraestrutura do Bloco D);
5. **Scripts de Automação e Background:**
   - Diretório `scripts/cron/` contendo scripts A2, B, C e benchmarks representativos;
6. **Suítes de Testes Automatizados:**
   - `tests/` (testes TypeScript) e `supabase/tests/` (testes pgTAP);
7. **Documentação Técnica Canônica:**
   - `docs/arquitetura/arquitetura-tecnica-v1.1.md`;
   - `docs/banco/modelo-fisico-v1.1.md`;
   - `docs/planejamento/requisitos-cobertura-status-pos-bloco-d-v1.0.md`;
   - Relatórios e termos de homologação formal dos módulos em `docs/relatorios/` e `docs/homologacao/`.

---

## 7. Tratamento do Ambiente Cloud (Gate Operacional)

A governança do projeto estabelece uma clara segregação entre a **homologação técnica do código** e o **deployment operacional no Cloud**:

- **Homologação Técnica Local:**
  - O código, as migrations, o comportamento do daemon `pg_cron` e a integração com o emulador Android foram validados e homologados no ambiente local controlado de testes.
  - A conformidade com os 198 requisitos canônicos está 100% comprovada tecnicamente.
- **Deployment no Supabase Cloud:**
  - O provisionamento no ambiente Cloud gerenciado seguirá a estratégia de quatro estágios já homologada:
    - *Fase A1:* Migration estática versionada;
    - *Fase A2:* Verificação de pré-requisitos (`preflight-a2.sql`);
    - *Gate de Liberação Operacional;*
    - *Fase B:* Ativação do agendamento diário (`ativar-cron-b.sql`);
    - *Fase C:* Pós-validação e verificação de integridade (`pos-validacao-c.sql`).
  - **Deliberação de Governança:** *A execução dos estágios em nuvem constitui um GATE OPERACIONAL DE DEPLOYMENT e NÃO invalida nem atrasa a homologação técnica da baseline da Release 1.0.*

---

## 8. Critérios de Saída para Homologação Definitiva

A declaração formal:

> **`RELEASE 1.0 — FECHADA / BASELINE HOMOLOGADA`**

somente poderá ser outorgada quando todas as seguintes condições forem plenamente satisfeitas:

1. **Zero Apontamentos `CRITICAL` ou `MAJOR` Abertos;**
2. **Nenhum Requisito Canônico Pendente ou Parcial (198/198 mantidos homologados);**
3. **Auditoria Técnica de Integração Global Executada e 100% Aprovada;**
4. **Bateria de Regressão Final Executada e 100% Green (pgTAP e TypeScript);**
5. **Checagem de Tipagem (Typecheck) com Zero Erros;**
6. **Consistência Documental Integral Verificada;**
7. **Inventário Oficial Pós-Bloco D Mantido e Fechado;**
8. **Artefatos da Baseline Devidamente Identificados e Congelados.**

---

## 9. Sequenciamento Obrigatório do Fechamento

O processo de fechamento da versão 1.0 deve respeitar estritamente a seguinte ordem sequencial de 9 etapas:

```
[1] Atualizar Inventário Oficial de Cobertura Pós-Bloco D (Concluído)
 │
 ▼
[2] Auditar Consistência Documental entre Artefatos (Concluído)
 │
 ▼
[3] Formalizar Plano de Fechamento da Release 1.0 (Concluído)
 │
 ▼
[4] Executar Auditoria Técnica de Integração Global (Próxima Etapa)
 │
 ▼
[5] Executar Bateria de Regressão Final Automatizada
 │
 ▼
[6] Corrigir Somente Não Conformidades Comprovadas (se houver)
 │
 ▼
[7] Reauditar Itens Afetados por Eventuais Correções
 │
 ▼
[8] Emitir Termo Oficial de Homologação da Release 1.0
 │
 ▼
[9] Congelar Baseline Técnica e Emitir Tag v1.0
```

> [!WARNING]
> **Proibição de Atalhos:** É terminantemente vedado emitir a Homologação da Release 1.0 (Etapa 8) ou congelar a baseline (Etapa 9) sem a prévia execução e aprovação documental das Etapas 4 e 5.

---

## 10. Política de Novas Funcionalidades

Para resguardar a integridade, estabilidade e maturidade técnica da Release 1.0:

1. **Vedação de "Bloco E" ou Escopos Adicionais:** É expressamente proibida a criação de novos blocos ou introdução de funcionalidades não contempladas nos 198 requisitos canônicos vigentes;
2. **Início do Próximo Ciclo:** Após o congelamento da Release 1.0, qualquer evolução futura do sistema obedecerá à seguinte diretriz canônica:

> **“O próximo ciclo deverá ser iniciado por novo levantamento e priorização de requisitos, não por extensão automática dos Blocos A–D.”**

---

## 11. Conclusão e Status

O presente plano delimita com exatidão os compromissos, testes e verificações remanescentes para o encerramento do ciclo. Com a publicação deste documento e do Inventário Oficial Pós-Bloco D, o projeto encontra-se tecnicamente pronto para o início da **Auditoria Técnica de Integração Global da Release 1.0**.

---

STATUS:

PLANO DE FECHAMENTO DA RELEASE 1.0 — AGUARDANDO AUDITORIA
