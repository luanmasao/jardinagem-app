# Inventário Oficial de Cobertura Pós-Bloco D — Release 1.0

**Projeto:** Sistema de Orçamento para Jardinagem (Android / React Native)  
**Data da Análise:** 06 de Outubro de 2026  
**Responsável:** Arquiteto de Software e Responsável por Governança Técnica do Projeto  
**Versão do Documento:** 1.0 (Oficial Pós-Bloco D / Fechamento Técnico de Requisitos)  
**Documento Anterior (Baseline):** `docs/planejamento/requisitos-cobertura-status-v1.2.md` (05/10/2026 — Intacto e Congelado)  
**Universo Canônico Auditado:** 198 Requisitos (82 Requisitos Funcionais, 81 Regras de Negócio e 35 Requisitos Não-Funcionais)  
**Declaração Oficial:** `INVENTÁRIO PÓS-BLOCO D CONCLUÍDO — AGUARDANDO AUDITORIA DE INTEGRAÇÃO`  
**Status Inicial de Registro:** `INVENTÁRIO EM CONSOLIDAÇÃO — PÓS-BLOCO D — AGUARDANDO AUDITORIA DE INTEGRAÇÃO`

---

## 1. Controle de Versão e Histórico de Governança

| Versão | Data | Autor / Função | Descrição das Modificações | Situação do Inventário |
| :---: | :---: | :--- | :--- | :--- |
| **1.0** | 03/10/2026 | Auditoria Técnica e Arquitetura de Software | Inventário inicial completo de 198 requisitos canônicos pós-homologação de Áreas (GAP-AREA-01 a 08). Identificação das lacunas dos Blocos A, B e C. | `CONGELADO` |
| **1.1** | 05/10/2026 | Analista de Requisitos e Governança | Atualização oficial de cobertura após homologações do **Bloco A (Geocodificação e Localização v1.1)** e do **Bloco B (Geração e Apresentação de PDF v1.1)**. | `CONGELADO` |
| **1.2** | 05/10/2026 | Arquiteto de Software e Governança Técnica | Atualização oficial de cobertura pós-homologação do **Bloco C (Compartilhamento Nativo de PDF v1.0)**. Transição de RF82, RN81 e parcela de RNF03 para HOMOLOGADO. Restaram apenas RF67 e RN69 parciais. | `CONGELADO` |
| **Pós-D v1.0** | 06/10/2026 | Arquiteto de Software e Governança Técnica | **Recálculo integral dos 198 requisitos canônicos pós-homologação do Bloco D (Expiração Temporal Automática de Orçamentos v1.0)**. Transição de RF67 e RN69 para `HOMOLOGADO`. Reconfirmação de RF68, RN70, RN71 e RNF12. Cobertura canônica atinge **100,00% (198/198)**. Formalização dos 11 módulos congelados. Preparação para Auditoria de Integração Global da Release 1.0. | `VIGENTE` |

---

## 2. Referências Canônicas e Documentos Oficiais

Este inventário fundamenta-se estritamente na cadeia de referência do projeto, sem admissão de inferências empíricas ou decisões não homologadas:

### 2.1. Fontes Canônicas Primárias
1. **Requisitos Funcionais (RF v2):** Documento `requisitos_funcionais.docx` contendo **RF01 a RF82**;
2. **Regras de Negócio (RN v3):** Documento `regras_negocio.docx` contendo **RN01 a RN81**;
3. **Requisitos Não-Funcionais (RNF v2):** Documento `requisitos_nao_funcionais.docx` contendo **RNF01 a RNF35**;
4. **Diagramas UML Canônicos (UML v3.1):** `classes.puml`, `casos_de_uso.puml`, `sequencia.puml`, `atividades.puml`, `estados.puml`;
5. **Modelo Conceitual (DER v1.1):** `der.puml`;
6. **Arquitetura Técnica v1.1:** `docs/arquitetura/arquitetura-tecnica-v1.1.md`;
7. **Modelo Físico PostgreSQL / PostGIS v1.1:** `docs/banco/modelo-fisico-v1.1.md` e migrations em `supabase/migrations/`;
8. **Estratégia de Segurança e RLS v1.6:** `docs/relatorios/auth-rls-strategy-v1.6.md`.

### 2.2. Pareceres de Auditoria e Documentos Formais de Homologação dos Módulos
1. **Autenticação:** `docs/relatorios/supabase-auth-app-integration-homologation-v1.0.md`;
2. **Segurança e Multitenancy (RLS):** `docs/relatorios/auth-rls-implementation-homologation-v1.0.md`;
3. **Gerenciamento de Clientes:** `docs/relatorios/clientes-implementation-homologation-v1.0.md`;
4. **Catálogo de Serviços e Produtos:** `docs/relatorios/catalogo-servicos-produtos-implementation-homologation-v1.0.md`;
5. **Orçamentos e Itens:** `docs/relatorios/orcamentos-itens-implementation-audit-v1.1.md`;
6. **Áreas / Mapas / Medição Espacial:** `docs/relatorios/areas-gap-closure-implementation-audit-v1.0.md` e `docs/relatorios/areas-map-drawing-implementation-reaudit-v1.0.md`;
7. **Bloco A (Geolocalização e Geocodificação de Clientes v1.1):** `docs/relatorios/geocodificacao-localizacao-implementation-homologation-v1.1.md`;
8. **Bloco B (Geração e Apresentação Local de PDF v1.1):** `docs/relatorios/pdf-orcamentos-implementation-audit-v1.0.md`;
9. **Bloco C (Compartilhamento Nativo de PDF v1.0):** `docs/relatorios/compartilhamento-pdf-implementation-homologation-v1.0.md` e `docs/relatorios/compartilhamento-pdf-implementation-audit-v1.0.md`;
10. **Bloco D (Expiração Temporal Automática de Orçamentos v1.0):**
    - Especificação Consolidada v2.0: `docs/planejamento/expiracao-orcamentos-plan-v2.0.md`;
    - Relatório de Implementação v1.0: `docs/implementacao/bloco-d-implementation-report-v1.0.md`;
    - Relatório de Execução do Benchmark RNF12: `docs/relatorios/bloco-d-rnf12-benchmark-execution-v1.0.md`;
    - Homologação Técnica Final v1.0: `docs/homologacao/bloco-d-expiracao-orcamentos-homologacao-final-v1.0.md`.

---

## 3. Critérios Formais de Classificação e Homologação

Para afastar subjetividades, cada um dos 198 requisitos canônicos foi submetido a critérios formais e unívocos:

- **HOMOLOGADO:** Requisito integralmente implementado no código-fonte e/ou banco de dados, verificado por testes automatizados específicos, com conformidade documental comprovada e respaldado por parecer de auditoria e relatório formal de homologação aprovados no repositório.
- **IMPLEMENTADO — NÃO HOMOLOGADO:** Requisito com código e testes existentes e funcionais no repositório, porém sem parecer formal de auditoria ou termo de homologação correspondente emitido.
- **PARCIALMENTE IMPLEMENTADO:** Requisito que possui estrutura parcial (ex.: método isolado no domínio ou coluna em schema), porém sem integração ponta a ponta, UI ou rotina disparadora.
- **NÃO IMPLEMENTADO:** Requisito sem código, testes ou rotas implementadas no repositório.
- **FORA DO ESCOPO EXPLÍCITO:** Requisito formalmente diferido ou descontinuado por decisão canônica documentada.
- **DIVERGENTE:** Requisito cuja implementação contraria as regras dos documentos canônicos oficiais.

> [!IMPORTANT]
> **Princípio de Rigor:** Nenhuma funcionalidade é considerada homologada apenas por estar implementada ou aparente na interface. A homologação exige trilha de evidências auditáveis (testes, logs, parecer e aprovação formal).

---

## 4. Verificação Específica dos Últimos Gaps Homologados

### 4.1. Fechamento Definitivo do Bloco D (Expiração Temporal Automática)
O Bloco D resolveu as últimas pendências de expiração temporal automática do projeto através de uma arquitetura híbrida de alta resiliência:

| ID | Tipo | Enunciado Canônico | Módulo Responsável | Evidência Primária | Documento Homologação | Teste de Verificação | Veredito |
| :---: | :---: | :--- | :--- | :--- | :--- | :--- | :---: |
| **RF67** | Funcional | O sistema deve identificar automaticamente a expiração de um orçamento ENVIADO ou EM_ANALISE quando sua validade for ultrapassada. | Bloco D (Expiração Automática) | Disparo autônomo pelo daemon `pg_cron` (job 9, às 03:01 UTC) executando `app_private.executar_expiracao_orcamentos()` e defesa complementar JIT via RPC `public.expirar_meus_orcamentos_rpc()`. | `docs/homologacao/bloco-d-expiracao-orcamentos-homologacao-final-v1.0.md` (Seções 3, 5 e 17) | `supabase/tests/09_expiracao_orcamentos.sql` (testes 7, 8) e `tests/orcamentos/expiracao-orcamentos-bloco-d.test.ts` (testes 1 a 4) | **HOMOLOGADO** |
| **RF68** | Funcional | O sistema não deve marcar automaticamente um orçamento RASCUNHO como EXPIRADO. | Bloco D / Orçamentos | Predicado estrito `WHERE status IN ('ENVIADO', 'EM_ANALISE')` na procedure SQL e proteção em `Orcamento.verificarExpiracao()`. | `docs/homologacao/bloco-d-expiracao-orcamentos-homologacao-final-v1.0.md` (Seção 3) | `supabase/tests/09_expiracao_orcamentos.sql` (teste 9) e `tests/orcamentos/expiracao-orcamentos-bloco-d.test.ts` (teste 5) | **HOMOLOGADO** |
| **RN69** | Regra | Um orçamento ENVIADO ou EM_ANALISE deve ser considerado EXPIRADO quando sua validade for ultrapassada. | Bloco D (Expiração Automática) | Atualização de status para `EXPIRADO` com telemetria gravada em `app_private.expiracao_execucao_log` e preservação de isolamento multi-tenant. | `docs/homologacao/bloco-d-expiracao-orcamentos-homologacao-final-v1.0.md` (Seção 3 e 5) | `supabase/tests/09_expiracao_orcamentos.sql` (testes 7, 8, 14) | **HOMOLOGADO** |
| **RN70** | Regra | Um orçamento em RASCUNHO não deve ser marcado automaticamente como EXPIRADO. | Bloco D / Orçamentos | Filtro de exclusão imune em banco e domínio; rascunhos com datas retroativas permanecem `RASCUNHO`. | `docs/homologacao/bloco-d-expiracao-orcamentos-homologacao-final-v1.0.md` (Seção 3) | `supabase/tests/09_expiracao_orcamentos.sql` (teste 9) e `tests/domain/orcamento-estados.test.ts` (teste 4) | **HOMOLOGADO** |
| **RN71** | Regra | Orçamentos em APROVADO, RECUSADO, EXPIRADO, CANCELADO ou CONCLUIDO não podem ser reabertos. | Bloco D / Orçamentos | Imutabilidade de estados finais e proteção de concorrência com *EvalPlanQual* (EPQ) comprovada contra commits concorrentes de aprovação. | `docs/homologacao/bloco-d-expiracao-orcamentos-homologacao-final-v1.0.md` (Seções 3 e 8) | `supabase/tests/09_expiracao_orcamentos.sql` (testes 10, 11) e `tests/orcamentos/expiracao-orcamentos-bloco-d.test.ts` (teste 8) | **HOMOLOGADO** |
| **RNF12** | Não-Func. | Operações do sistema devem apresentar tempo de resposta adequado (SLO < 5.000 ms para rotina em lote). | Bloco D (Performance) | Benchmark auditado pós-resolução de `AUDIT-D-01` com `ANALYZE` obrigatório e volumes de 10k (20,78 ms), 100k (227,69 ms) e 1M (2.807,41 ms). | `docs/homologacao/bloco-d-expiracao-orcamentos-homologacao-final-v1.0.md` (Seções 9 e 10) e `docs/relatorios/bloco-d-rnf12-benchmark-execution-v1.0.md` | `scripts/cron/benchmark-representativo-rnf12.ts` | **HOMOLOGADO** |

### 4.2. Fechamento do Bloco C (Compartilhamento Nativo de PDF)
Confirmado no inventário v1.2 e integralmente preservado:

| ID | Tipo | Enunciado Canônico | Módulo Responsável | Evidência Primária | Documento Homologação | Teste de Verificação | Veredito |
| :---: | :---: | :--- | :--- | :--- | :--- | :--- | :---: |
| **RF82** | Funcional | O sistema deve permitir compartilhar o PDF utilizando os mecanismos disponíveis no dispositivo. | Bloco C (Compartilhamento) | Integração com `expo-sharing` via `ExpoSharingShareProvider`, disparando a Share Sheet nativa (`ChooserActivityLauncher` com Intent `ACTION_SEND`). | `docs/relatorios/compartilhamento-pdf-implementation-homologation-v1.0.md` | `tests/infrastructure/expo-sharing-provider.test.ts` (22 testes) | **HOMOLOGADO** |
| **RN81** | Regra | O PDF deve poder ser compartilhado por meio dos mecanismos disponíveis no dispositivo. | Bloco C (Compartilhamento) | `CompartilharPdfOrcamentoUseCase` mantendo o status comercial inalterado (`RASCUNHO`, etc.) e gerando arquivo canônico `Orcamento_<numero>.pdf`. | `docs/relatorios/compartilhamento-pdf-implementation-homologation-v1.0.md` | `tests/application/compartilhar-pdf-orcamento.use-case.test.ts` (18 testes) | **HOMOLOGADO** |
| **RNF03** | Não-Func. | Fornecer feedback adequado ao usuário após operações relevantes (parcela de compartilhamento). | Bloco C / UI | Hook `useCompartilharPdf` gerenciando estados `idle`, `preparing`, `sharing`, com indicador `"Preparando..."` e desabilitação contra duplo clique. | `docs/relatorios/compartilhamento-pdf-implementation-homologation-v1.0.md` | Evidências visuais em `cenario_a_preparando.png` e testes de hook | **HOMOLOGADO** |

---

## 5. Integridade dos Módulos Homologados e Congelados

Declara-se a **INTEGRIDADE ABSOLUTA E O CONGELAMENTO RÍGIDO** dos 11 módulos funcionais e de infraestrutura do sistema:

1. **Autenticação e Sessão:** Login, logout, criptografia AES, CSPRNG nativo e controle de rotas (`supabase-auth-app-integration-homologation-v1.0.md`) — **CONGELADO**;
2. **Segurança e Multitenancy (RLS):** 31 políticas RLS ativas em 8 tabelas de negócio, isolamento por `auth.uid()` (`auth-rls-implementation-homologation-v1.0.md`) — **CONGELADO**;
3. **Gerenciamento de Clientes:** CRUD completo, endereços opcionais, inativação lógica e busca reativa (`clientes-implementation-homologation-v1.0.md`) — **CONGELADO**;
4. **Catálogo de Serviços:** CRUD, unidade m² para serviços medidos, preço base e soft delete (`catalogo-servicos-produtos-implementation-homologation-v1.0.md`) — **CONGELADO**;
5. **Catálogo de Produtos:** CRUD, unidades comerciais, preço base e soft delete (`catalogo-servicos-produtos-implementation-homologation-v1.0.md`) — **CONGELADO**;
6. **Orçamentos e Itens:** Ciclo de vida de 8 status, snapshot de itens, recálculo financeiro e duplicação profunda (`orcamentos-itens-implementation-audit-v1.1.md`) — **CONGELADO**;
7. **Áreas, Mapas e Medição Espacial:** Polígonos PostGIS `GEOMETRY(Polygon, 4326)`, cálculo geodésico Chamberlain & Duquette, satélite Google Maps e GAP-01 a 08 (`areas-map-drawing-implementation-reaudit-v1.0.md`) — **CONGELADO**;
8. **Bloco A (Geolocalização e Geocodificação de Clientes v1.1):** Geocodificação nominatim/provedor, coordenadas em endereço e inicialização de mapa (`geocodificacao-localizacao-implementation-homologation-v1.1.md`) — **CONGELADO**;
9. **Bloco B (Geração e Apresentação Local de PDF v1.1):** Template institucional visualmente fiel, renderização off-screen via `expo-print`, visualização nativa e RNF14/31/32/33 (`pdf-orcamentos-implementation-audit-v1.0.md`) — **CONGELADO**;
10. **Bloco C (Compartilhamento Nativo de PDF v1.0):** Compartilhamento nativo Android, `expo-sharing`, sanitização de arquivo e Share Sheet (`compartilhamento-pdf-implementation-homologation-v1.0.md`) — **CONGELADO**;
11. **Bloco D (Expiração Temporal Automática de Orçamentos v1.0):** Rotina autônoma server-side via `pg_cron`, stored procedure privada, defesa JIT complementar via RPC e benchmark RNF12 (`bloco-d-expiracao-orcamentos-homologacao-final-v1.0.md`) — **CONGELADO**.

### 5.1. Observações Residuais Previamente Aceitas
Mantêm-se registradas formalmente as observações residuais já acolhidas em auditorias prévias:
- **Bloco C (ACHADO-IMPL-SHARE-01 a 03):** Condição `msg.includes('not found')` no provider aceita para a v1.0; distinção entre cópia byte-idêntica (Cenário A) e regeneração conteúdo-consistente (Cenário B); repasse de cache na UI classificado como otimização futura sem impacto de aceitação.
- **Bloco D (Autoridade Temporal e Logs):** A autoridade temporal é estritamente o servidor PostgreSQL no fuso `America/Sao_Paulo`; o log em `app_private.expiracao_execucao_log` possui tratamento de erro desacoplado que não compromete o commit das expirações de negócio.

---

## 6. Matriz Completa de Cobertura por Requisito

### 6.1. Requisitos Funcionais (RF01 a RF82)

| ID | Categoria | Status | Módulo/Incremento | Evidência Primária | Auditoria/Homologação | Observação |
| :---: | :---: | :---: | :--- | :--- | :--- | :--- |
| **RF01** | Funcional | **HOMOLOGADO** | Autenticação | `AuthService.signInWithEmail()`, `LoginScreen` | `supabase-auth-app-integration-homologation-v1.0.md` | Login com credenciais seguras e sessão persistida. |
| **RF02** | Funcional | **HOMOLOGADO** | Autenticação | `AuthService.signOut()`, `AppLayout` | `supabase-auth-app-integration-homologation-v1.0.md` | Encerramento de sessão e descarte de tokens. |
| **RF03** | Funcional | **HOMOLOGADO** | Autenticação / RLS | 31 Políticas RLS `auth.uid() = usuario_id` | `auth-rls-implementation-homologation-v1.0.md` | Isolamento estrito de dados entre usuários. |
| **RF04** | Funcional | **HOMOLOGADO** | Clientes | `CriarClienteUseCase`, `NovoClienteScreen` | `clientes-implementation-homologation-v1.0.md` | Cadastro de cliente com campos obrigatórios e opcionais. |
| **RF05** | Funcional | **HOMOLOGADO** | Clientes | `ListarClientesUseCase`, `ObterClienteUseCase` | `clientes-implementation-homologation-v1.0.md` | Consulta e listagem de clientes ativos e inativos. |
| **RF06** | Funcional | **HOMOLOGADO** | Clientes | `useClientes()`, filtro reativo por nome e telefone | `clientes-implementation-homologation-v1.0.md` | Busca local instantânea. |
| **RF07** | Funcional | **HOMOLOGADO** | Clientes | `AtualizarClienteUseCase`, `EditarClienteScreen` | `clientes-implementation-homologation-v1.0.md` | Edição com validação de dados cadastrais. |
| **RF08** | Funcional | **HOMOLOGADO** | Clientes | `AlterarAtivoClienteUseCase`, soft delete | `clientes-implementation-homologation-v1.0.md` | Inativação lógica preservando integridade referencial. |
| **RF09** | Funcional | **HOMOLOGADO** | Clientes / Endereço | `SalvarEnderecoClienteUseCase`, `ObterEnderecoClienteUseCase` | `clientes-implementation-homologation-v1.0.md` | Gerenciamento de endereço textual vinculado ao cliente. |
| **RF10** | Funcional | **HOMOLOGADO** | Bloco A (Geocodificação) | `GeocodingProvider`, `ObterCoordenadasEnderecoUseCase` | `geocodificacao-localizacao-implementation-homologation-v1.1.md` | Obtenção de latitude/longitude a partir do endereço. |
| **RF11** | Funcional | **HOMOLOGADO** | Bloco A (Geocodificação) | `MapProviderProps.regiaoInicial`, injeção de coordenadas | `geocodificacao-localizacao-implementation-homologation-v1.1.md` | Centralização do mapa na localização do cliente. |
| **RF12** | Funcional | **HOMOLOGADO** | Bloco A / Áreas | `MapView` gestos nativos de pan/zoom e fallback de busca | `geocodificacao-localizacao-implementation-homologation-v1.1.md` | Posicionamento manual no mapa quando sem endereço. |
| **RF13** | Funcional | **HOMOLOGADO** | Catálogo (Serviços) | `CriarServicoUseCase`, `NovoServicoScreen` | `catalogo-servicos-produtos-implementation-homologation-v1.0.md` | Cadastro de serviços personalizados do usuário. |
| **RF14** | Funcional | **HOMOLOGADO** | Catálogo (Serviços) | `ServicoValidator.validar()`, `ServicoProps` | `catalogo-servicos-produtos-implementation-homologation-v1.0.md` | Nome, unidade, preço base, indicador de área e ativo. |
| **RF15** | Funcional | **HOMOLOGADO** | Catálogo (Serviços) | `ListarServicosUseCase`, `ObterServicoUseCase` | `catalogo-servicos-produtos-implementation-homologation-v1.0.md` | Consulta e listagem do catálogo de serviços. |
| **RF16** | Funcional | **HOMOLOGADO** | Catálogo (Serviços) | `AtualizarServicoUseCase`, `EditarServicoScreen` | `catalogo-servicos-produtos-implementation-homologation-v1.0.md` | Edição de serviço sem efeito retroativo em orçamentos. |
| **RF17** | Funcional | **HOMOLOGADO** | Catálogo (Serviços) | `AlterarAtivoServicoUseCase`, soft delete | `catalogo-servicos-produtos-implementation-homologation-v1.0.md` | Desativação com preservação de integridade referencial. |
| **RF18** | Funcional | **HOMOLOGADO** | Catálogo / Orçamentos | `ItemOrcamento` snapshot histórico, FK ON DELETE RESTRICT | `orcamentos-itens-implementation-audit-v1.1.md` | Alteração de catálogo não modifica orçamentos existentes. |
| **RF19** | Funcional | **HOMOLOGADO** | Catálogo (Produtos) | `CriarProdutoUseCase`, `NovoProdutoScreen` | `catalogo-servicos-produtos-implementation-homologation-v1.0.md` | Cadastro de produtos personalizados do usuário. |
| **RF20** | Funcional | **HOMOLOGADO** | Catálogo (Produtos) | `ProdutoValidator.validar()`, `ProdutoProps` | `catalogo-servicos-produtos-implementation-homologation-v1.0.md` | Nome, unidade, preço unitário e situação ativa/inativa. |
| **RF21** | Funcional | **HOMOLOGADO** | Catálogo (Produtos) | `ListarProdutosUseCase`, `ObterProdutoUseCase` | `catalogo-servicos-produtos-implementation-homologation-v1.0.md` | Consulta e listagem de produtos do usuário. |
| **RF22** | Funcional | **HOMOLOGADO** | Catálogo (Produtos) | `AtualizarProdutoUseCase`, `EditarProdutoScreen` | `catalogo-servicos-produtos-implementation-homologation-v1.0.md` | Edição de produtos com validação de dados. |
| **RF23** | Funcional | **HOMOLOGADO** | Catálogo (Produtos) | `AlterarAtivoProdutoUseCase`, soft delete | `catalogo-servicos-produtos-implementation-homologation-v1.0.md` | Inativação preservando histórico de orçamentos. |
| **RF24** | Funcional | **HOMOLOGADO** | Catálogo / Orçamentos | `ItemOrcamento` snapshot histórico, FK ON DELETE RESTRICT | `orcamentos-itens-implementation-audit-v1.1.md` | Alteração de produtos não afeta itens já orçados. |
| **RF25** | Funcional | **HOMOLOGADO** | Orçamentos | `CriarOrcamentoUseCase`, `NovoOrcamentoScreen` | `orcamentos-itens-implementation-audit-v1.1.md` | Criação de orçamento associado a um cliente. |
| **RF26** | Funcional | **HOMOLOGADO** | Orçamentos | UUID `id`, `numero` com constraint `UNIQUE(usuario_id, numero)` | `orcamentos-itens-implementation-audit-v1.1.md` | Identificador único e numeração sequencial por usuário. |
| **RF27** | Funcional | **HOMOLOGADO** | Orçamentos | `Orcamento.status = StatusOrcamento.RASCUNHO` | `orcamentos-itens-implementation-audit-v1.1.md` | Inicialização mandatória em status RASCUNHO. |
| **RF28** | Funcional | **HOMOLOGADO** | Orçamentos | `Orcamento.recalcularValores()`, formulário dinâmico | `orcamentos-itens-implementation-audit-v1.1.md` | Salvamento progressivo de rascunhos incompletos. |
| **RF29** | Funcional | **HOMOLOGADO** | Orçamentos / Itens | `AdicionarItemOrcamentoUseCase.execute()` | `orcamentos-itens-implementation-audit-v1.1.md` | Inclusão de serviços originados do catálogo. |
| **RF30** | Funcional | **HOMOLOGADO** | Orçamentos / Itens | `AdicionarItemOrcamentoUseCase.execute()` | `orcamentos-itens-implementation-audit-v1.1.md` | Inclusão de produtos originados do catálogo. |
| **RF31** | Funcional | **HOMOLOGADO** | Orçamentos / Itens | `RemoverItemOrcamentoUseCase.execute()` | `orcamentos-itens-implementation-audit-v1.1.md` | Exclusão de itens do orçamento sem afetar o catálogo. |
| **RF32** | Funcional | **HOMOLOGADO** | Itens de Orçamento | `ItemOrcamento` snapshot desacoplado do catálogo | `orcamentos-itens-implementation-audit-v1.1.md` | Snapshot imutável dos dados do serviço ou produto. |
| **RF33** | Funcional | **HOMOLOGADO** | Itens de Orçamento | Campos: `descricao`, `unidade`, `quantidade`, `valor_unitario`, `total` | `orcamentos-itens-implementation-audit-v1.1.md` | Registro completo de dados operacionais do item. |
| **RF34** | Funcional | **HOMOLOGADO** | Itens de Orçamento | `ItemOrcamento.atualizarSnapshot()` | `orcamentos-itens-implementation-audit-v1.1.md` | Edição de descrição e valor do item sem mudar catálogo. |
| **RF35** | Funcional | **HOMOLOGADO** | Itens de Orçamento | `ItemOrcamento.atualizarQuantidadeManual()` | `orcamentos-itens-implementation-audit-v1.1.md` | Entrada manual de quantidade para itens não medidos. |
| **RF36** | Funcional | **HOMOLOGADO** | Áreas / Itens | `ItemOrcamento.recalcularQuantidadePelasAreas()` | `areas-use-cases-implementation-audit-v1.0.md` | Soma automática de áreas associadas em m². |
| **RF37** | Funcional | **HOMOLOGADO** | Áreas / Itens | `RegraNegocioError` ao tentar alterar manual item medido | `orcamentos-itens-implementation-audit-v1.1.md` | Bloqueio de edição manual para serviços medidos. |
| **RF38** | Funcional | **HOMOLOGADO** | Itens de Orçamento | `ItemOrcamento.calcularTotal()`, precisão BRL | `orcamentos-itens-implementation-audit-v1.1.md` | Recálculo automático de total = quantidade × unitário. |
| **RF39** | Funcional | **HOMOLOGADO** | Áreas / Orçamentos | `ItemOrcamento.usaMedicaoArea`, gatilho de interface | `areas-use-cases-implementation-audit-v1.0.md` | Identificação visual da necessidade de medição de área. |
| **RF40** | Funcional | **HOMOLOGADO** | Áreas / Mapas | Rota `/orcamentos/mapa`, `AreasItemScreen` | `areas-map-drawing-implementation-reaudit-v1.0.md` | Abertura do mapa satélite para delimitação de área. |
| **RF41** | Funcional | **HOMOLOGADO** | Áreas / Mapas | Polígono interativo manual em `MapaDelimitacao` | `areas-map-drawing-implementation-reaudit-v1.0.md` | Desenho e fechamento de polígono sobre satélite. |
| **RF42** | Funcional | **HOMOLOGADO** | Áreas | `CriarAreaUseCase`, tabela `public.area` PostGIS | `areas-repository-implementation-audit-v1.0.md` | Associação de uma ou mais áreas a um item de serviço. |
| **RF43** | Funcional | **HOMOLOGADO** | Áreas | Suporte a N áreas contíguas ou não por item | `areas-use-cases-implementation-audit-v1.0.md` | Múltiplas áreas somadas no mesmo item orçamentário. |
| **RF44** | Funcional | **HOMOLOGADO** | Áreas | `GeodesicCalculadorAreaService.calcularArea()` | `areas-calculador-area-implementation-audit-v1.0.md` | Cálculo geodésico automático da área em m². |
| **RF45** | Funcional | **HOMOLOGADO** | Áreas | `AtualizarAreaUseCase.atualizarGeometria()` | `areas-use-cases-implementation-audit-v1.0.md` | Edição dos vértices e geometria do polígono. |
| **RF46** | Funcional | **HOMOLOGADO** | Áreas | `AtualizarAreaUseCase.atualizarDados()` | `areas-use-cases-implementation-audit-v1.0.md` | Edição de nome descritivo e observações da área. |
| **RF47** | Funcional | **HOMOLOGADO** | Áreas | Recálculo em cascata: área → item → total orçamento | `areas-use-cases-implementation-audit-v1.0.md` | Atualização reativa de valores pós-edição de geometria. |
| **RF48** | Funcional | **HOMOLOGADO** | Áreas | `RemoverAreaUseCase.execute()` | `areas-use-cases-implementation-audit-v1.0.md` | Exclusão de área de item em orçamento editável. |
| **RF49** | Funcional | **HOMOLOGADO** | Áreas / Itens | Bloqueio de área para produto ou serviço sem medição | `areas-use-cases-implementation-audit-v1.0.md` | Impedimento estrito de vincular área a item não medido. |
| **RF50** | Funcional | **HOMOLOGADO** | Orçamentos | `Orcamento.recalcularValores()`, `subtotal = Σ item.total` | `orcamentos-itens-implementation-audit-v1.1.md` | Cálculo automático do subtotal do orçamento. |
| **RF51** | Funcional | **HOMOLOGADO** | Orçamentos | `Orcamento.aplicarDesconto()` | `orcamentos-itens-implementation-audit-v1.1.md` | Aplicação de desconto sobre o subtotal. |
| **RF52** | Funcional | **HOMOLOGADO** | Orçamentos | `TipoDesconto.PERCENTUAL` e `TipoDesconto.FIXO` | `orcamentos-itens-implementation-audit-v1.1.md` | Seleção flexível do tipo de desconto. |
| **RF53** | Funcional | **HOMOLOGADO** | Orçamentos | Constraint `orcamento_desconto_check` no banco e domínio | `orcamentos-itens-implementation-audit-v1.1.md` | Validação de limites (0-100% ou 0 a subtotal). |
| **RF54** | Funcional | **HOMOLOGADO** | Orçamentos | `calcularValorDesconto()`, `calcularTotalOrcamento()` | `orcamentos-itens-implementation-audit-v1.1.md` | Dedução de desconto e apuração do valor final. |
| **RF55** | Funcional | **HOMOLOGADO** | Orçamentos | Check constraint `orcamento_total_check (total >= 0)` | `orcamentos-itens-implementation-audit-v1.1.md` | Impedimento de orçamento com valor total negativo. |
| **RF56** | Funcional | **HOMOLOGADO** | Orçamentos | Persistência de `subtotal`, `valor_desconto`, `total` | `orcamentos-itens-implementation-audit-v1.1.md` | Armazenamento e recálculo contínuo de totais. |
| **RF57** | Funcional | **HOMOLOGADO** | Orçamentos | `Orcamento.dataValidade`, input civil de validade | `orcamentos-itens-implementation-audit-v1.1.md` | Definição da data de validade da proposta. |
| **RF58** | Funcional | **HOMOLOGADO** | Orçamentos | `Orcamento.observacoes`, campo de texto livre | `orcamentos-itens-implementation-audit-v1.1.md` | Registro de observações gerais na proposta. |
| **RF59** | Funcional | **HOMOLOGADO** | Orçamentos | `Orcamento.condicoesPagamento`, campo descritivo | `orcamentos-itens-implementation-audit-v1.1.md` | Registro de condições comerciais e prazos. |
| **RF60** | Funcional | **HOMOLOGADO** | Orçamentos | Botão "Enviar Proposta", `AlterarStatusOrcamentoUseCase` | `orcamentos-itens-implementation-audit-v1.1.md` | Acionamento de envio da proposta comercial. |
| **RF61** | Funcional | **HOMOLOGADO** | Orçamentos | `Orcamento.validarParaEnvio()` (cliente, itens, validade, áreas) | `orcamentos-itens-implementation-audit-v1.1.md` | Validação estrita de completude antes do envio. |
| **RF62** | Funcional | **HOMOLOGADO** | Orçamentos | `ValidacaoEnvioError`, bloqueio de transição com alertas | `orcamentos-itens-implementation-audit-v1.1.md` | Apresentação clara de pendências impeditivas de envio. |
| **RF63** | Funcional | **HOMOLOGADO** | Orçamentos | Máquina de estados de 8 status de `estados.puml` | `orcamentos-itens-implementation-audit-v1.1.md` | Transições de status estritamente padronizadas. |
| **RF64** | Funcional | **HOMOLOGADO** | Orçamentos | Transições: enviar, analisar, aprovar, recusar, concluir, cancelar | `orcamentos-itens-implementation-audit-v1.1.md` | Fluxo completo do ciclo de vida comercial. |
| **RF65** | Funcional | **HOMOLOGADO** | Orçamentos | `TransicaoInvalidaError`, constraint `orcamento_status_check` | `orcamentos-itens-implementation-audit-v1.1.md` | Bloqueio de transições ilegais no ciclo de vida. |
| **RF66** | Funcional | **HOMOLOGADO** | Orçamentos | Botões "Aprovar" e "Recusar", registro formal | `orcamentos-itens-implementation-audit-v1.1.md` | Registro de decisão comercial pelo jardineiro. |
| **RF67** | Funcional | **HOMOLOGADO** | Bloco D (Expiração Automática) | Disparo autônomo `pg_cron` (diário às 03:01 UTC) e defesa JIT | `bloco-d-expiracao-orcamentos-homologacao-final-v1.0.md` | Expiração automática de ENVIADO e EM_ANALISE vencidos. |
| **RF68** | Funcional | **HOMOLOGADO** | Bloco D / Orçamentos | Filtro `status IN ('ENVIADO', 'EM_ANALISE')` na procedure | `bloco-d-expiracao-orcamentos-homologacao-final-v1.0.md` | Imunidade total de orçamentos em RASCUNHO à expiração. |
| **RF69** | Funcional | **HOMOLOGADO** | Orçamentos | `Orcamento.assegurarEditavel()`, botões ocultos na UI | `orcamentos-itens-implementation-audit-v1.1.md` | Bloqueio de edição direta fora de RASCUNHO. |
| **RF70** | Funcional | **HOMOLOGADO** | Orçamentos | Inexistência de transições reversas a partir de estados finais | `orcamentos-itens-implementation-audit-v1.1.md` | Bloqueio de reabertura de orçamentos finalizados. |
| **RF71** | Funcional | **HOMOLOGADO** | Orçamentos | `ListarOrcamentosUseCase`, `OrcamentosScreen` | `orcamentos-itens-implementation-audit-v1.1.md` | Consulta e listagem de propostas do usuário. |
| **RF72** | Funcional | **HOMOLOGADO** | Orçamentos | Filtro reativo por status comercial na listagem | `orcamentos-itens-implementation-audit-v1.1.md` | Filtragem por abas de status. |
| **RF73** | Funcional | **HOMOLOGADO** | Orçamentos / Detalhes | `ObterOrcamentoUseCase`, tela completa de detalhe | `areas-hydration-implementation-audit-v1.0.md` | Visualização detalhada de dados, itens e polígonos. |
| **RF74** | Funcional | **HOMOLOGADO** | Orçamentos | RLS no DELETE restrita a RASCUNHO, histórico imutável | `orcamentos-itens-implementation-audit-v1.1.md` | Preservação durável de propostas finalizadas. |
| **RF75** | Funcional | **HOMOLOGADO** | Orçamentos | `DuplicarOrcamentoUseCase`, botão "Duplicar" | `orcamentos-itens-implementation-audit-v1.1.md` | Duplicação de proposta para criação de novo orçamento. |
| **RF76** | Funcional | **HOMOLOGADO** | Orçamentos | `Orcamento.duplicar()`, novo UUID, novo número e RASCUNHO | `orcamentos-itens-implementation-audit-v1.1.md` | Novo orçamento gerado em RASCUNHO com nova identidade. |
| **RF77** | Funcional | **HOMOLOGADO** | Orçamentos | Clonagem profunda independente de itens e áreas | `orcamentos-itens-implementation-audit-v1.1.md` | Edição autônoma do orçamento duplicado. |
| **RF78** | Funcional | **HOMOLOGADO** | Orçamentos | Desacoplamento físico e relacional entre cópia e original | `orcamentos-itens-implementation-audit-v1.1.md` | Alterações na cópia não afetam proposta original. |
| **RF79** | Funcional | **HOMOLOGADO** | Bloco B (PDF) | `GerarPdfOrcamentoUseCase`, `ExpoPrintPdfGenerator` | `pdf-orcamentos-implementation-audit-v1.0.md` | Geração off-screen de PDF a partir do orçamento. |
| **RF80** | Funcional | **HOMOLOGADO** | Bloco B (PDF) | Template institucional HTML/CSS completo com dados | `pdf-orcamentos-implementation-audit-v1.0.md` | Apresentação padronizada de profissional, cliente e itens. |
| **RF81** | Funcional | **HOMOLOGADO** | Bloco B (PDF) | Validação matemática estrita de consistência no layout | `pdf-orcamentos-implementation-audit-v1.0.md` | Fidelidade absoluta de valores e textos entre PDF e banco. |
| **RF82** | Funcional | **HOMOLOGADO** | Bloco C (Compartilhamento) | `ExpoSharingShareProvider`, Share Sheet Android | `compartilhamento-pdf-implementation-homologation-v1.0.md` | Compartilhamento nativo de PDF com apps do dispositivo. |

---

### 6.2. Regras de Negócio (RN01 a RN81)

| ID | Categoria | Status | Módulo/Incremento | Evidência Primária | Auditoria/Homologação | Observação |
| :---: | :---: | :---: | :--- | :--- | :--- | :--- |
| **RN01** | Negócio | **HOMOLOGADO** | Usuário e Acesso | `AuthService`, `Usuario`, tabela `public.usuario` | `supabase-auth-app-integration-homologation-v1.0.md` | Usuários autenticados gerenciam seus próprios dados. |
| **RN02** | Negócio | **HOMOLOGADO** | Segurança / RLS | Políticas RLS em todas as tabelas (`usuario_id = auth.uid()`) | `auth-rls-implementation-homologation-v1.0.md` | Acesso restrito exclusivo aos dados sob sua posse. |
| **RN03** | Negócio | **HOMOLOGADO** | Clientes | FK `CLIENTE.usuario_id NOT NULL` | `clientes-implementation-homologation-v1.0.md` | Cliente pertence a um único usuário. |
| **RN04** | Negócio | **HOMOLOGADO** | Clientes | `ClienteProps` (nome, telefone, email, documento, observações) | `clientes-implementation-homologation-v1.0.md` | Dados de contato e identificação no cadastro de cliente. |
| **RN05** | Negócio | **HOMOLOGADO** | Clientes | `CriarClienteInput.endereco?` opcional | `clientes-implementation-homologation-v1.0.md` | Endereço do cliente é opcional no cadastro. |
| **RN06** | Negócio | **HOMOLOGADO** | Bloco A (Geocodificação) | `EnderecoProps.latitude/longitude`, `GeocodingProvider` | `geocodificacao-localizacao-implementation-homologation-v1.1.md` | Endereço textual com suporte a latitude/longitude. |
| **RN07** | Negócio | **HOMOLOGADO** | Bloco A / Áreas | `MapProviderProps.regiaoInicial` | `geocodificacao-localizacao-implementation-homologation-v1.1.md` | Coordenadas do cliente como referência de abertura no mapa. |
| **RN08** | Negócio | **HOMOLOGADO** | Clientes / Áreas | Ponto geográfico (`POINT`) vs Polígono (`POLYGON`) | `areas-mapas-medicao-homologacao-v1.0.md` | Localização do cliente não se confunde com área de serviço. |
| **RN09** | Negócio | **HOMOLOGADO** | Bloco A / Áreas | Pan, zoom e busca de endereço alternativo no mapa | `geocodificacao-localizacao-implementation-homologation-v1.1.md` | Posicionamento manual quando cliente não tem coordenadas. |
| **RN10** | Negócio | **HOMOLOGADO** | Clientes | FK `orcamento_cliente_id_fkey ON DELETE RESTRICT` | `clientes-implementation-homologation-v1.0.md` | Clientes com histórico de orçamentos não sofrem hard delete. |
| **RN11** | Negócio | **HOMOLOGADO** | Serviços | FK `SERVICO.usuario_id NOT NULL` | `catalogo-servicos-produtos-implementation-homologation-v1.0.md` | Cada serviço pertence a um único usuário. |
| **RN12** | Negócio | **HOMOLOGADO** | Serviços | `ServicoProps` (nome, descrição, unidade, preço, área, ativo) | `catalogo-servicos-produtos-implementation-homologation-v1.0.md` | Atributos mandatários de serviços. |
| **RN13** | Negócio | **HOMOLOGADO** | Serviços | `Servico.usaMedicaoArea: boolean` | `catalogo-servicos-produtos-implementation-homologation-v1.0.md` | Serviço pode exigir ou não medição de área. |
| **RN14** | Negócio | **HOMOLOGADO** | Serviços | FK `item_orcamento_servico_id_fkey ON DELETE RESTRICT` | `catalogo-servicos-produtos-implementation-homologation-v1.0.md` | Serviços com orçamentos são inativados, não excluídos. |
| **RN15** | Negócio | **HOMOLOGADO** | Serviços | `ItemOrcamento` snapshot histórico | `orcamentos-itens-implementation-audit-v1.1.md` | Edição de serviço não afeta itens já orçados. |
| **RN16** | Negócio | **HOMOLOGADO** | Serviços | `ServicoValidator`: se `usaMedicaoArea = true`, unidade é `m²` | `catalogo-servicos-produtos-implementation-homologation-v1.0.md` | Serviços medidos utilizam obrigatoriamente m². |
| **RN17** | Negócio | **HOMOLOGADO** | Produtos | FK `PRODUTO.usuario_id NOT NULL` | `catalogo-servicos-produtos-implementation-homologation-v1.0.md` | Cada produto pertence a um único usuário. |
| **RN18** | Negócio | **HOMOLOGADO** | Produtos | `ProdutoProps` (nome, descrição, unidade, preço, ativo) | `catalogo-servicos-produtos-implementation-homologation-v1.0.md` | Atributos mandatários de produtos. |
| **RN19** | Negócio | **HOMOLOGADO** | Produtos | FK `item_orcamento_produto_id_fkey ON DELETE RESTRICT` | `catalogo-servicos-produtos-implementation-homologation-v1.0.md` | Produtos orçados são inativados, não deletados fisicamente. |
| **RN20** | Negócio | **HOMOLOGADO** | Produtos | `ItemOrcamento` snapshot histórico | `orcamentos-itens-implementation-audit-v1.1.md` | Alteração de produto não modifica orçamentos prévios. |
| **RN21** | Negócio | **HOMOLOGADO** | Orçamentos | FKs `usuario_id` e `cliente_id` NOT NULL | `orcamentos-itens-implementation-audit-v1.1.md` | Orçamento pertence a um único usuário e um único cliente. |
| **RN22** | Negócio | **HOMOLOGADO** | Orçamentos | UUID `id`, constraint `UNIQUE (usuario_id, numero)` | `orcamentos-itens-implementation-audit-v1.1.md` | Identificador próprio e número único por titular. |
| **RN23** | Negócio | **HOMOLOGADO** | Orçamentos | Array `_itens: ItemOrcamento[]` pode ser vazio em RASCUNHO | `orcamentos-itens-implementation-audit-v1.1.md` | Orçamento em rascunho pode ter zero itens. |
| **RN24** | Negócio | **HOMOLOGADO** | Orçamentos | `status = StatusOrcamento.RASCUNHO` na inicialização | `orcamentos-itens-implementation-audit-v1.1.md` | Início mandatório em RASCUNHO. |
| **RN25** | Negócio | **HOMOLOGADO** | Orçamentos | `Orcamento.adicionarItem()` suporta serviços e produtos | `orcamentos-itens-implementation-audit-v1.1.md` | Orçamento pode mesclar serviços e produtos por itens. |
| **RN26** | Negócio | **HOMOLOGADO** | Orçamentos | Propriedades `dataValidade`, `observacoes`, `condicoesPagamento` | `orcamentos-itens-implementation-audit-v1.1.md` | Registro de validade, observações e condições de pgto. |
| **RN27** | Negócio | **HOMOLOGADO** | Itens | Check constraint `item_orcamento_tipo_check` (XOR estrito) | `orcamentos-itens-implementation-audit-v1.1.md` | Item é exatamente um serviço OU um produto, nunca ambos. |
| **RN28** | Negócio | **HOMOLOGADO** | Itens | `AdicionarItemOrcamentoUseCase` validação de catálogo | `orcamentos-itens-implementation-audit-v1.1.md` | Item deve se originar de catálogo ativo do usuário. |
| **RN29** | Negócio | **HOMOLOGADO** | Itens | Cópia profunda no construtor de `ItemOrcamento` | `orcamentos-itens-implementation-audit-v1.1.md` | Snapshot independente de dados ao incluir item. |
| **RN30** | Negócio | **HOMOLOGADO** | Itens | Snapshot de descrição, unidade, quantidade, unitário e total | `orcamentos-itens-implementation-audit-v1.1.md` | Atributos mínimos resguardados no snapshot. |
| **RN31** | Negócio | **HOMOLOGADO** | Itens | `ItemOrcamento.atualizarSnapshot()` local ao orçamento | `orcamentos-itens-implementation-audit-v1.1.md` | Personalização de descrição e valor sem alterar catálogo. |
| **RN32** | Negócio | **HOMOLOGADO** | Itens | `ItemOrcamento.atualizarQuantidadeManual()` | `orcamentos-itens-implementation-audit-v1.1.md` | Quantidade manual para produtos e serviços não medidos. |
| **RN33** | Negócio | **HOMOLOGADO** | Áreas / Itens | Quantidade = soma das áreas vinculadas em m² | `areas-use-cases-implementation-audit-v1.0.md` | Quantidade comercial de serviço medido corresponde às áreas. |
| **RN34** | Negócio | **HOMOLOGADO** | Áreas / Itens | `ItemOrcamento.atualizarQuantidadeManual()` rejeita medidos | `orcamentos-itens-implementation-audit-v1.1.md` | Quantidade de item medido não pode ser alterada manualmente. |
| **RN35** | Negócio | **HOMOLOGADO** | Itens | `RemoverItemOrcamentoUseCase` desvincula sem mexer no catálogo | `orcamentos-itens-implementation-audit-v1.1.md` | Alteração de item não afeta cadastro de origem. |
| **RN36** | Negócio | **HOMOLOGADO** | Áreas | Validação de `item.usaMedicaoArea = true` para vincular área | `areas-use-cases-implementation-audit-v1.0.md` | Medição de área restrita a serviços configurados para tal. |
| **RN37** | Negócio | **HOMOLOGADO** | Áreas | FK `item_orcamento_id NOT NULL` na tabela `public.area` | `areas-repository-implementation-audit-v1.0.md` | Área pertence a um único item de orçamento de serviço. |
| **RN38** | Negócio | **HOMOLOGADO** | Áreas | Cardinalidade 1:N entre Item e Áreas | `areas-use-cases-implementation-audit-v1.0.md` | Item de serviço medido pode possuir múltiplas áreas. |
| **RN39** | Negócio | **HOMOLOGADO** | Áreas | Polígonos espaciais independentes somados na metragem | `areas-use-cases-implementation-audit-v1.0.md` | Áreas de um mesmo item não precisam ser contíguas. |
| **RN40** | Negócio | **HOMOLOGADO** | Áreas | Polígono com $>= 3$ vértices delimitado sobre satélite | `areas-map-drawing-implementation-reaudit-v1.0.md` | Delimitação de área exclusivamente por polígono manual. |
| **RN41** | Negócio | **HOMOLOGADO** | Áreas | Algoritmo Chamberlain & Duquette sobre elipsoide WGS84 | `areas-calculador-area-implementation-audit-v1.0.md` | Cálculo automático de área em m². |
| **RN42** | Negócio | **HOMOLOGADO** | Áreas | `AtualizarAreaUseCase` suporta geometria e metadados | `areas-use-cases-implementation-audit-v1.0.md` | Usuário pode editar geometria, nome e notas da área. |
| **RN43** | Negócio | **HOMOLOGADO** | Áreas | Cascata reativa: área → item → subtotal → desconto → total | `areas-use-cases-implementation-audit-v1.0.md` | Alteração de geometria recalcula valores dependentes. |
| **RN44** | Negócio | **HOMOLOGADO** | Áreas | `RemoverAreaUseCase` bloqueia exclusão fora de RASCUNHO | `areas-use-cases-implementation-audit-v1.0.md` | Remoção de área permitida apenas enquanto editável. |
| **RN45** | Negócio | **HOMOLOGADO** | Áreas | `ItemOrcamento.adicionarArea()` lança `RegraNegocioError` | `areas-use-cases-implementation-audit-v1.0.md` | Produto ou serviço não medido não pode ter áreas associadas. |
| **RN46** | Negócio | **HOMOLOGADO** | Áreas / Orçamentos | Rascunho salvo sem áreas; envio exige áreas delimitadas | `orcamentos-itens-implementation-audit-v1.1.md` | Serviço medido pode ficar sem área em rascunho. |
| **RN47** | Negócio | **HOMOLOGADO** | Valores | `valorTotal = arredondarMoeda(quantidade * valorUnitario)` | `orcamentos-itens-implementation-audit-v1.1.md` | Total do item = quantidade × valor unitário. |
| **RN48** | Negócio | **HOMOLOGADO** | Valores | `subtotal = arredondarMoeda(Σ item.valorTotal)` | `orcamentos-itens-implementation-audit-v1.1.md` | Subtotal = soma dos totais de seus itens. |
| **RN49** | Negócio | **HOMOLOGADO** | Valores | `calcularValorDesconto(subtotal, tipo, valor)` | `orcamentos-itens-implementation-audit-v1.1.md` | Desconto incide diretamente sobre o subtotal. |
| **RN50** | Negócio | **HOMOLOGADO** | Valores | `TipoDesconto.PERCENTUAL` ou `TipoDesconto.FIXO` | `orcamentos-itens-implementation-audit-v1.1.md` | Desconto pode ser percentual ou fixo. |
| **RN51** | Negócio | **HOMOLOGADO** | Valores | Check constraint `orcamento_desconto_check` ($0 <= v <= 100$) | `orcamentos-itens-implementation-audit-v1.1.md` | Desconto percentual limitado entre 0% e 100%. |
| **RN52** | Negócio | **HOMOLOGADO** | Valores | Check constraint `orcamento_desconto_check` ($0 < v <= subtotal$) | `orcamentos-itens-implementation-audit-v1.1.md` | Desconto fixo limitado entre zero e o subtotal. |
| **RN53** | Negócio | **HOMOLOGADO** | Valores | `tipoDesconto = null` implica `valorDesconto = 0.00` | `orcamentos-itens-implementation-audit-v1.1.md` | Sem desconto, o valor abatido é estritamente zero. |
| **RN54** | Negócio | **HOMOLOGADO** | Valores | `total = subtotal - desconto` (mínimo 0.00) | `orcamentos-itens-implementation-audit-v1.1.md` | Total = subtotal - desconto, nunca negativo. |
| **RN55** | Negócio | **HOMOLOGADO** | Valores | Função `arredondarMoeda()`, precisão BRL 2 casas decimais | `orcamentos-itens-implementation-audit-v1.1.md` | Valores monetários tratados em BRL com duas casas decimais. |
| **RN56** | Negócio | **HOMOLOGADO** | Valores | Persistência e recálculo contínuo em cascata | `orcamentos-itens-implementation-audit-v1.1.md` | Totais armazenados e recalculados a cada mutação. |
| **RN57** | Negócio | **HOMOLOGADO** | Ciclo de Vida | `Orcamento.constructor()` aceita estado preliminar | `orcamentos-itens-implementation-audit-v1.1.md` | Rascunho incompleto pode ser salvo livremente. |
| **RN58** | Negócio | **HOMOLOGADO** | Ciclo de Vida | `Orcamento.validarParaEnvio()` barreiras de consistência | `orcamentos-itens-implementation-audit-v1.1.md` | Transição para ENVIADO exige orçamento 100% válido. |
| **RN59** | Negócio | **HOMOLOGADO** | Ciclo de Vida | Validação obrigatória: cliente, itens, validade, medições | `orcamentos-itens-implementation-audit-v1.1.md` | Condições mandatórias para permissão de envio. |
| **RN60** | Negócio | **HOMOLOGADO** | Ciclo de Vida | `ValidacaoEnvioError`, bloqueio de alteração de status | `orcamentos-itens-implementation-audit-v1.1.md` | Rascunho não conforme permanece em edição e não envia. |
| **RN61** | Negócio | **HOMOLOGADO** | Ciclo de Vida | 8 estados canônicos definidos em `StatusOrcamento` | `orcamentos-itens-implementation-audit-v1.1.md` | Universo de estados canônicos do orçamento. |
| **RN62** | Negócio | **HOMOLOGADO** | Ciclo de Vida | `TransicaoInvalidaError`, validação de grafo | `orcamentos-itens-implementation-audit-v1.1.md` | Mudanças de status obedecem estritamente às transições. |
| **RN63** | Negócio | **HOMOLOGADO** | Ciclo de Vida | 10 transições válidas homologadas em `estados.puml` | `orcamentos-itens-audit-v1.1.md` | Transições de status permitidas no sistema. |
| **RN64** | Negócio | **HOMOLOGADO** | Ciclo de Vida | `Orcamento.editavel` verdadeiro apenas em `RASCUNHO` | `orcamentos-itens-implementation-audit-v1.1.md` | RASCUNHO é o único estado diretamente editável. |
| **RN65** | Negócio | **HOMOLOGADO** | Ciclo de Vida | `Orcamento.assegurarEditavel()` bloqueia outros 7 estados | `orcamentos-itens-implementation-audit-v1.1.md` | Demais status bloqueiam edição direta de campos e itens. |
| **RN66** | Negócio | **HOMOLOGADO** | Ciclo de Vida | `Orcamento.aprovar()`, transição para `APROVADO` | `orcamentos-itens-implementation-audit-v1.1.md` | Status APROVADO representa aceitação pelo cliente. |
| **RN67** | Negócio | **HOMOLOGADO** | Ciclo de Vida | Ações manuais na UI registradas pelo profissional | `orcamentos-itens-implementation-audit-v1.1.md` | Registro de aprovação ou recusa operado pelo jardineiro. |
| **RN68** | Negócio | **HOMOLOGADO** | Ciclo de Vida | `Orcamento.concluir()`, transição para `CONCLUIDO` | `orcamentos-itens-implementation-audit-v1.1.md` | Status CONCLUIDO representa conclusão da execução. |
| **RN69** | Negócio | **HOMOLOGADO** | Bloco D (Expiração Automática) | Disparo autônomo `pg_cron` e defesa JIT via RPC | `bloco-d-expiracao-orcamentos-homologacao-final-v1.0.md` | Orçamento com validade ultrapassada torna-se EXPIRADO. |
| **RN70** | Negócio | **HOMOLOGADO** | Bloco D / Orçamentos | Predicado estrito de exclusão em banco e domínio | `bloco-d-expiracao-orcamentos-homologacao-final-v1.0.md` | Orçamento em RASCUNHO não é marcado como EXPIRADO. |
| **RN71** | Negócio | **HOMOLOGADO** | Bloco D / Orçamentos | Bloqueio de transição a partir de estados finais | `bloco-d-expiracao-orcamentos-homologacao-final-v1.0.md` | Estados terminais não podem ser reabertos ou expirados. |
| **RN72** | Negócio | **HOMOLOGADO** | Duplicação | `DuplicarOrcamentoUseCase`, botão "Duplicar" | `orcamentos-itens-implementation-audit-v1.1.md` | Duplicação de orçamento para criar nova proposta. |
| **RN73** | Negócio | **HOMOLOGADO** | Duplicação | Novo UUID, novo número sequencial e status `RASCUNHO` | `orcamentos-itens-implementation-audit-v1.1.md` | Identificador e numeração próprios na proposta duplicada. |
| **RN74** | Negócio | **HOMOLOGADO** | Duplicação | Instâncias desacopladas em memória e banco | `orcamentos-itens-implementation-audit-v1.1.md` | Orçamento duplicado é 100% independente do original. |
| **RN75** | Negócio | **HOMOLOGADO** | Duplicação | Mutações na cópia não alteram dados da origem | `orcamentos-itens-implementation-audit-v1.1.md` | Alterações na cópia não afetam o original. |
| **RN76** | Negócio | **HOMOLOGADO** | Histórico | RLS policy no DELETE restringe a RASCUNHO | `orcamentos-itens-implementation-audit-v1.1.md` | Propostas aprovadas/finalizadas preservadas no histórico. |
| **RN77** | Negócio | **HOMOLOGADO** | Duplicação | Duplicação como mecanismo para novas versões sem reabertura | `orcamentos-itens-implementation-audit-v1.1.md` | Duplicação cria nova proposta sem corromper histórico. |
| **RN78** | Negócio | **HOMOLOGADO** | Bloco B (PDF) | Snapshot de geração em tempo real no HTML renderizado | `pdf-orcamentos-implementation-audit-v1.0.md` | PDF representa exatamente os dados no momento da geração. |
| **RN79** | Negócio | **HOMOLOGADO** | Bloco B (PDF) | Template com profissional, cliente, itens, valores e notas | `pdf-orcamentos-implementation-audit-v1.0.md` | Exibição de todos os dados canônicos no documento PDF. |
| **RN80** | Negócio | **HOMOLOGADO** | Bloco B (PDF) | Auditoria de equivalência matemática e estrutural de campos | `pdf-orcamentos-implementation-audit-v1.0.md` | Valores no PDF correspondem aos dados do orçamento. |
| **RN81** | Negócio | **HOMOLOGADO** | Bloco C (Compartilhamento) | `CompartilharPdfOrcamentoUseCase`, preservação de status | `compartilhamento-pdf-implementation-homologation-v1.0.md` | PDF compartilhável por canais nativos do dispositivo. |

---

### 6.3. Requisitos Não-Funcionais (RNF01 a RNF35)

| ID | Categoria | Status | Módulo/Incremento | Evidência Primária | Auditoria/Homologação | Observação |
| :---: | :---: | :---: | :--- | :--- | :--- | :--- |
| **RNF01** | Usabilidade | **HOMOLOGADO** | Apresentação / Bloco B | Telas operacionais e geração de PDF off-screen fluida | `pdf-orcamentos-implementation-audit-v1.0.md` | Operações principais claras, fluidas e compreensíveis. |
| **RNF02** | Usabilidade | **HOMOLOGADO** | Apresentação | Padrão de design system unificado em todas as rotas | Homologações de Clientes, Catálogo e Orçamentos | Padrões visuais e comportamentais consistentes. |
| **RNF03** | Usabilidade | **HOMOLOGADO** | Apresentação / Bloco C | Spinners reativos, alertas e feedback de Share Sheet | `compartilhamento-pdf-implementation-homologation-v1.0.md` | Feedback adequado após operações relevantes. |
| **RNF04** | Usabilidade | **HOMOLOGADO** | Apresentação | Erros tipados e mensagens orientativas ao usuário | `orcamentos-itens-implementation-audit-v1.1.md` | Mensagens de erro e validação claras e orientativas. |
| **RNF05** | Usabilidade | **HOMOLOGADO** | Áreas / Mapas | Exibição de polígonos sobre satélite e metragem m² | `areas-map-drawing-implementation-reaudit-v1.0.md` | Interação nítida e compreensível com o mapa. |
| **RNF06** | Segurança | **HOMOLOGADO** | Autenticação | Criptografia AES via `LargeSecureStore`, CSPRNG nativo | `auth-rls-implementation-homologation-v1.0.md` | Credenciais e tokens seguros contra exposição. |
| **RNF07** | Segurança | **HOMOLOGADO** | Segurança / RLS | 31 políticas de RLS e 170 testes pgTAP passando | `auth-rls-implementation-homologation-v1.0.md` | Controle de acesso impede acesso a dados de outros tenants. |
| **RNF08** | Segurança | **HOMOLOGADO** | Infraestrutura | Comunicação HTTPS (TLS 1.3) e WSS para Realtime | `auth-rls-implementation-homologation-v1.0.md` | Tráfego com serviços externos integralmente criptografado. |
| **RNF09** | Segurança | **HOMOLOGADO** | Segurança / Banco | Permissões revogadas para `anon`, RLS para `authenticated` | `auth-rls-implementation-homologation-v1.0.md` | Dados pessoais e comerciais protegidos contra anônimos. |
| **RNF10** | Privacidade | **HOMOLOGADO** | Governança / LGPD | Minimização de dados pessoais, titularidade estrita | `clientes-implementation-homologation-v1.0.md` | Tratamento de dados alinhado aos princípios de privacidade. |
| **RNF11** | Privacidade | **HOMOLOGADO** | Modelo de Dados | Apenas 8 entidades essenciais sem campos supérfluos | `orcamentos-itens-implementation-audit-v1.1.md` | Coleta estritamente limitada ao escopo operacional. |
| **RNF12** | Desempenho | **HOMOLOGADO** | Performance / Bloco D | CRUD < 100 ms; Expiração 10k em 20,78 ms, 1M em 2.807 ms | `bloco-d-expiracao-orcamentos-homologacao-final-v1.0.md` | Tempos de resposta adequados (SLO < 5.000 ms no daemon). |
| **RNF13** | Desempenho | **HOMOLOGADO** | Performance / Áreas | Cálculo geodésico < 1 ms no motor Hermes | `areas-calculador-area-implementation-audit-v1.0.md` | Cálculos de área e valores executados sem lentidão. |
| **RNF14** | Desempenho | **HOMOLOGADO** | Bloco B (PDF) | Geração de PDF em ~1,2s sem travar interface | `pdf-orcamentos-implementation-audit-v1.0.md` | Geração de PDF em tempo adequado ao uso do aplicativo. |
| **RNF15** | Desempenho | **HOMOLOGADO** | Bloco A / Mapas | `MapErrorBoundary` e fallbacks em serviços externos | `geocodificacao-localizacao-implementation-homologation-v1.1.md` | Tratamento de demora ou falha em integrações externas. |
| **RNF16** | Confiabilidade | **HOMOLOGADO** | Banco / PostGIS | Foreign Keys `RESTRICT`/`CASCADE`, check constraints | `orcamentos-itens-implementation-audit-v1.1.md` | Integridade relacional e prevenção de estados inconsistentes. |
| **RNF17** | Confiabilidade | **HOMOLOGADO** | Domínio / Moeda | `arredondarMoeda()` com `Number.EPSILON`, `NUMERIC(12,2)` | `orcamentos-itens-implementation-audit-v1.1.md` | Precisão monetária sem erros de ponto flutuante IEEE-754. |
| **RNF18** | Confiabilidade | **HOMOLOGADO** | Orçamentos / Itens | Snapshots autônomos em `public.item_orcamento` | `orcamentos-itens-implementation-audit-v1.1.md` | Histórico imutável de orçamentos sobre alteração de catálogo. |
| **RNF19** | Confiabilidade | **HOMOLOGADO** | Áreas / Valores | Recálculo determinístico sincronizado | `areas-use-cases-implementation-audit-v1.0.md` | Consistência entre áreas, quantidades e valores de propostas. |
| **RNF20** | Confiabilidade | **HOMOLOGADO** | Banco / PostgREST | Transações atômicas no PostgreSQL | `areas-repository-implementation-audit-v1.0.md` | Falhas de gravação não geram estados parcialmente inconsistentes. |
| **RNF21** | Disponibilidade | **HOMOLOGADO** | Mapas / Infra | Isolamento do `MapView` com `MapErrorBoundary` | `areas-map-drawing-implementation-reaudit-v1.0.md` | Indisponibilidade de serviço externo não corrompe dados. |
| **RNF22** | Disponibilidade | **HOMOLOGADO** | Bloco A / Mapas | Fallback de busca manual e mensagens amigáveis de erro | `geocodificacao-localizacao-implementation-homologation-v1.1.md` | Falhas em mapas/geocodificação tratadas controladamente. |
| **RNF23** | Compatibilidade | **HOMOLOGADO** | Mobile Android | Target Android API 37, motor Hermes compilado | Homologações dos Blocos A, B, C e Áreas | Execução homologada em Android na versão mínima suportada. |
| **RNF24** | Compatibilidade | **HOMOLOGADO** | Mobile / UI | Layouts responsivos Flexbox, `ScrollView`, `SafeAreaView` | Homologações de Clientes, Catálogo e Orçamentos | Adaptação adequada a diferentes resoluções de tela. |
| **RNF25** | Arquitetura | **HOMOLOGADO** | Engenharia | Clean Architecture em 4 camadas bem separadas | Homologações vigentes de todos os módulos | Organização modular com responsabilidades bem definidas. |
| **RNF26** | Arquitetura | **HOMOLOGADO** | Engenharia | Interfaces `MapProvider`, `CalculadorAreaService` | `areas-mapas-medicao-homologacao-v1.0.md` | Substituição de provedores externos sem quebrar domínio. |
| **RNF27** | Arquitetura | **HOMOLOGADO** | Engenharia | Suíte com 184 testes pgTAP e 230+ testes TypeScript | `bloco-d-expiracao-orcamentos-homologacao-final-v1.0.md` | Estrutura modular que facilita testes, manutenções e evolução. |
| **RNF28** | Arquitetura | **HOMOLOGADO** | Engenharia | Casos de uso atômicos permitindo evolução incremental | `areas-use-cases-implementation-audit-v1.0.md` | Incorporação de novas features sem reescrever o núcleo. |
| **RNF29** | Medição | **HOMOLOGADO** | Áreas / PostGIS | Algoritmo Chamberlain & Duquette determinístico | `areas-calculador-area-implementation-audit-v1.0.md` | Resultados consistentes e invariantes para a mesma geometria. |
| **RNF30** | Medição | **HOMOLOGADO** | Áreas / PostGIS | Divergência < 0,1% em relação ao PostGIS geodésico | `areas-calculador-area-implementation-audit-v1.0.md` | Precisão compatível com orçamentos de jardinagem/paisagismo. |
| **RNF31** | Bloco B (PDF) | **HOMOLOGADO** | Bloco B (PDF) | Layout A4 institucional legível e organizado | `pdf-orcamentos-implementation-audit-v1.0.md` | Conteúdo legível, organizado e adequado para envio ao cliente. |
| **RNF32** | Bloco B (PDF) | **HOMOLOGADO** | Bloco B (PDF) | Validação cruzada estrita entre tabela de itens e PDF | `pdf-orcamentos-implementation-audit-v1.0.md` | Conteúdo e valores consistentes com o orçamento de origem. |
| **RNF33** | Bloco B (PDF) | **HOMOLOGADO** | Bloco B (PDF) | Cabeçalho institucional com número único `Orcamento_<n>` | `pdf-orcamentos-implementation-audit-v1.0.md` | Identificação visual clara do orçamento gerado. |
| **RNF34** | Persistência | **HOMOLOGADO** | Banco / PostGIS | PostgreSQL relacional durável e storage Supabase | `auth-rls-implementation-homologation-v1.0.md` | Dados persistentes mesmo após encerramento da aplicação. |
| **RNF35** | Persistência | **HOMOLOGADO** | Banco / PostGIS | Constraints de integridade, foreign keys e índices GiST | `orcamentos-itens-implementation-audit-v1.1.md` | Preservação íntegra de relações e restrições no banco. |

---

## 7. Recálculo Matemático e Quantitativos Oficiais

Os quantitativos consolidados a seguir foram integralmente recalculados:

### 7.1. Tabela Consolidada de Requisitos Funcionais (RF01 a RF82)

| Situação | Quantidade | Percentual | Requisitos Correspondentes |
| :--- | :---: | :---: | :--- |
| **Homologado** | **82** | **100,00%** | **RF01 a RF82 (Todos Homologados)** |
| **Implementado — Não Homologado** | **0** | **0,00%** | *Nenhum* |
| **Parcialmente Implementado** | **0** | **0,00%** | *Nenhum (RF67 homologado no Bloco D)* |
| **Não Encontrado / Não Implementado** | **0** | **0,00%** | *Nenhum* |
| **Fora do Escopo Explícito** | **0** | **0,00%** | *Nenhum* |
| **Divergente** | **0** | **0,00%** | *Nenhum* |
| **Total de Requisitos Funcionais** | **82** | **100,00%** | **RF01 a RF82** |

### 7.2. Tabela Consolidada de Regras de Negócio (RN01 a RN81)

| Situação | Quantidade | Percentual | Regras Correspondentes |
| :--- | :---: | :---: | :--- |
| **Homologada** | **81** | **100,00%** | **RN01 a RN81 (Todas Homologadas)** |
| **Implementada — Não Homologada** | **0** | **0,00%** | *Nenhum* |
| **Parcialmente Implementada** | **0** | **0,00%** | *Nenhum (RN69 homologada no Bloco D)* |
| **Não Encontrada / Não Implementada** | **0** | **0,00%** | *Nenhum* |
| **Fora do Escopo Explícito** | **0** | **0,00%** | *Nenhum* |
| **Divergente** | **0** | **0,00%** | *Nenhum* |
| **Total de Regras de Negócio** | **81** | **100,00%** | **RN01 a RN81** |

### 7.3. Tabela Consolidada de Requisitos Não-Funcionais (RNF01 a RNF35)

| Situação | Quantidade | Percentual | Requisitos Correspondentes |
| :--- | :---: | :---: | :--- |
| **Homologado** | **35** | **100,00%** | **RNF01 a RNF35 (Todos Homologados)** |
| **Implementado — Não Homologado** | **0** | **0,00%** | *Nenhum* |
| **Parcialmente Implementado** | **0** | **0,00%** | *Nenhum* |
| **Não Encontrado / Não Implementado** | **0** | **0,00%** | *Nenhum* |
| **Fora do Escopo Explícito** | **0** | **0,00%** | *Nenhum* |
| **Divergente** | **0** | **0,00%** | *Nenhum* |
| **Total de Requisitos Não-Funcionais** | **35** | **100,00%** | **RNF01 a RNF35** |

### 7.4. Consolidação Geral de Requisitos do Projeto

| Categoria | Total Canônico | Homologado | Implementado Não Homologado | Parcial | Não Implementado | Fora do Escopo | Divergente | Percentual Homologado |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Requisitos Funcionais (RF)** | 82 | 82 | 0 | 0 | 0 | 0 | 0 | **100,00%** |
| **Regras de Negócio (RN)** | 81 | 81 | 0 | 0 | 0 | 0 | 0 | **100,00%** |
| **Requisitos Não-Funcionais (RNF)** | 35 | 35 | 0 | 0 | 0 | 0 | 0 | **100,00%** |
| **TOTAL GERAL** | **198** | **198** | **0** | **0** | **0** | **0** | **0** | **100,00%** |

---

## 8. Evolução Histórica de Cobertura

| Métrica de Governança | Inventário v1.0 (03/10) | Inventário v1.1 (05/10) | Inventário v1.2 (05/10) | Inventário Pós-Bloco D (06/10) | Evolução Total |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **RF Homologados** | 74 / 82 (90,24%) | 80 / 82 (97,56%) | 81 / 82 (98,78%) | **82 / 82 (100,00%)** | **+8 RFs (+9,76%)** |
| **RN Homologadas** | 73 / 81 (90,12%) | 79 / 81 (97,53%) | 80 / 81 (98,77%) | **81 / 81 (100,00%)** | **+8 RNs (+9,88%)** |
| **RNF Homologados** | 27 / 35 (77,14%) | 34 / 35 (97,14%) | 35 / 35 (100,00%) | **35 / 35 (100,00%)** | **+8 RNFs (+22,86%)** |
| **Cobertura Global Homologada** | **174 / 198 (87,88%)** | **193 / 198 (97,47%)** | **196 / 198 (98,99%)** | **198 / 198 (100,00%)** | **+24 Requisitos (+12,12%)** |
| **Requisitos Não Implementados** | 13 / 198 (6,57%) | 2 / 198 (1,01%) | 0 / 198 (0,00%) | **0 / 198 (0,00%)** | **-13 Requisitos (-6,57%)** |
| **Requisitos Parciais** | 11 / 198 (5,56%) | 3 / 198 (1,52%) | 2 / 198 (1,01%) | **0 / 198 (0,00%)** | **-11 Requisitos (-5,56%)** |

---

## 9. Modelo Físico, DER e Arquitetura Técnica Vigentes

Registra-se a total conformidade da baseline estrutural com os artefatos oficiais:
1. **Modelo Físico Vigente:** Versão 1.1 formalizada em `docs/banco/modelo-fisico-v1.1.md`. As tabelas de negócio do sistema são estritamente 8:
   - `public.usuario`
   - `public.cliente`
   - `public.endereco`
   - `public.servico`
   - `public.produto`
   - `public.orcamento`
   - `public.item_orcamento`
   - `public.area`
2. **Infraestrutura Adicional Introduzida no Bloco D:**
   - Schema privado: `app_private` (acesso revogado para papéis de cliente/anônimos, de posse exclusiva de `postgres`);
   - Tabela de telemetria funcional: `app_private.expiracao_execucao_log`;
   - Stored procedure privilegiada: `app_private.executar_expiracao_orcamentos()`;
   - Extensão `pg_cron` no schema `cron`;
   - Job agendado: `job_expirar_orcamentos_diario` (`1 3 * * *`);
   - RPC pública tenant-scoped: `public.expirar_meus_orcamentos_rpc()` (`SECURITY INVOKER`, restrita a `auth.uid()`).
   *Essa infraestrutura não alterou as tabelas, colunas, chaves estrangeiras ou constraints do Modelo Físico v1.1.*
3. **DER Conceitual Vigente:** Versão 1.1 (`der.puml`), preservado integralmente.
4. **Arquitetura Técnica Vigente:** Versão 1.1 (`docs/arquitetura/arquitetura-tecnica-v1.1.md`), mantendo estrita separação entre Presentation, Application, Domain e Infrastructure.

---

## 10. Auditoria de Consistência Documental

Confrontou-se todo o histórico do projeto para identificar eventuais divergências:

| Domínio de Comparação | Artefatos Confrontados | Diagnóstico | Classificação de Governança |
| :--- | :--- | :--- | :--- |
| **Status de RF67 e RN69** | Inventário v1.2 vs Homologação Bloco D | No inventário v1.2 constavam como Parciais. Com a homologação final do Bloco D v1.0, foram integralmente homologados com evidências de `pg_cron` e JIT. | `Corrigido documentalmente neste inventário` |
| **Status de RF82 e RN81** | Inventário v1.1 vs Inventário v1.2 | No inventário v1.1 constavam como Não Implementados. No inventário v1.2 foram homologados com base na auditoria do Bloco C. | `Sem impacto (Consistente)` |
| **Benchmark RNF12** | Auditoria Bloco D vs Relatório de Rebenchmark | O apontamento `AUDIT-D-01 — MAJOR` apontou ausência de ANALYZE pós-carga. Foi sanado no rebenchmark de 10k, 100k e 1M com ANALYZE e documentado formalmente. | `Observação aceita e sanada` |
| **Modelo Físico vs Migrations** | Modelo Físico v1.1 vs Migration do Bloco D | A migration do Bloco D operou em schema privado e criou RPC segura sem adicionar colunas ou alterar tabelas públicas existentes. | `Sem impacto (Consistente com Modelo Físico v1.1)` |
| **Delimitação Local vs Cloud** | Homologação Bloco D vs Supabase Cloud | A execução local do `pg_cron` com o app fechado foi comprovada. O deployment Cloud está definido como gate operacional de 4 estágios. | `Observação aceita (Gate Operacional)` |

---

## 11. Tabela-Resumo Final de Consistência

| Categoria | Total | Homologado | Implementado Não Homologado | Parcial | Não Implementado |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **RF** | **82** | 82 | 0 | 0 | 0 |
| **RN** | **81** | 81 | 0 | 0 | 0 |
| **RNF** | **35** | 35 | 0 | 0 | 0 |
| **TOTAL** | **198** | **198** | **0** | **0** | **0** |

---

## 12. Conclusão e Próximos Passos

O **Inventário Oficial de Cobertura Pós-Bloco D — Release 1.0** formaliza a conquista da marca de **100,00% de cobertura homologada** de todos os 198 requisitos canônicos do sistema *jardinagem-app*.

Todos os incrementos funcionais (Autenticação, Clientes, Catálogo, Orçamentos, Áreas/Mapas, Bloco A, Bloco B, Bloco C e Bloco D) encontram-se integralmente implementados, testados e formalmente homologados.

O sistema está apto para o prosseguimento das etapas de fechamento da versão 1.0, devendo ser submetido à **Auditoria Técnica de Integração Global** antes de qualquer emissão de homologação de release.

---

STATUS:

INVENTÁRIO PÓS-BLOCO D CONCLUÍDO — AGUARDANDO AUDITORIA DE INTEGRAÇÃO
