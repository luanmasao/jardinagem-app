# Inventário Oficial de Cobertura do Projeto v1.0

**Projeto:** Sistema de Orçamento para Jardinagem (Android / React Native)
**Data da Análise:** 03 de Outubro de 2026
**Responsável:** Auditoria Técnica e Arquitetura de Software
**Versão do Documento:** 1.0 (Canônica e Congelada)
**Declaração Oficial:** `INVENTÁRIO CONCLUÍDO — PROJETO COM REQUISITOS PENDENTES`

---

## 1. Objetivo

Este documento formaliza o **Inventário Técnico Oficial de Cobertura de Requisitos** do projeto *Sistema de Orçamentos para Jardinagem*, executado com rigor de auditoria antes do início de qualquer novo ciclo de desenvolvimento.

Em estrita consonância com a governança técnica e as diretrizes do projeto:
- **Esta etapa NÃO é implementação.**
- **Esta etapa NÃO é refatoração.**
- **Esta etapa NÃO é correção.**
- **Esta etapa NÃO é homologação retroativa.**

O propósito exclusivo deste inventário é estabelecer uma **fotografia técnica canônica, fidedigna, rastreável e auditável** do estado real do código, banco de dados, testes automatizados e pareceres de homologação existentes no repositório, identificando objetivamente:
1. O que já foi implementado, testado e formalmente homologado;
2. O que foi implementado e testado, mas ainda carece de parecer formal de auditoria;
3. O que está parcialmente implementado (código ou estrutura presente, porém sem integração ponta a ponta, UI ou serviço externo);
4. O que ainda não foi implementado ou não foi localizado no repositório;
5. As relações de dependência direta e indireta entre componentes e regras;
6. Quais requisitos exigem produção de evidência documental e testes antes da entrega final.

---

## 2. Fontes Oficiais

O presente inventário baseia-se unicamente no conjunto canônico de documentos oficiais e na implementação efetivamente presente no repositório. As versões vigentes consultadas são:

### 2.1. Requisitos e Regras
- **Requisitos Funcionais (RF v2):** Documento `requisitos_funcionais.docx` contendo a especificação integral de **RF01 a RF82**;
- **Regras de Negócio (RN v3):** Documento `regras_negocio.docx` contendo a especificação integral de **RN01 a RN81**;
- **Requisitos Não-Funcionais (RNF v2):** Documento `requisitos_nao_funcionais.docx` contendo a especificação integral de **RNF01 a RNF35**.

### 2.2. Modelagem Canônica (UML v3.1 e DER v1.1)
- `classes.puml`: Diagrama de classes canônico;
- `casos_de_uso.puml`: Casos de uso do sistema (Use Case v3);
- `sequencia.puml`: Diagramas de sequência dos fluxos principais (Sequence v3);
- `atividades.puml`: Diagramas de atividades operacionais (Activity v3);
- `estados.puml`: Máquina de estados do ciclo de vida do orçamento (State Machine v1);
- `der.puml`: Diagrama Entidade-Relacionamento conceitual canônico (DER v1.1).

### 2.3. Arquitetura e Estrutura de Dados
- **Arquitetura Técnica v1.1:** `docs/arquitetura/arquitetura-tecnica-v1.1.md`;
- **Modelo Físico v1.1:** `docs/banco/modelo-fisico-v1.1.md` e migrations em `supabase/migrations/`;
- **Estratégia de Segurança e RLS v1.6:** `docs/relatorios/auth-rls-strategy-v1.6.md`.

### 2.4. Planejamento e Decisões Técnicas de Áreas
- `docs/planejamento/areas-mapas-medicao-plan-v1.0.md` (Plano de Trabalho de Áreas e Medição v1.0);
- `docs/planejamento/areas-mapas-medicao-homologacao-v1.0.md` (Critérios de Homologação de Áreas v1.0);
- **DECISÃO-AREA-01:** Representação espacial de áreas via PostGIS `GEOMETRY(Polygon, 4326)` e cálculo geodésico `geography(ST_Area)`;
- **DECISÃO-AREA-02:** Abstração de mapas via `MapProvider` e adoção de `react-native-maps` com Google Maps Satellite;
- **DECISÃO-AREA-04:** Consolidação de múltiplas áreas por item de orçamento e cálculo derivado de quantidade.

### 2.5. Relatórios Técnicos e Pareceres de Homologação Aprovados
- **Autenticação:** `docs/relatorios/supabase-auth-app-integration-v1.0.md` e `docs/relatorios/supabase-auth-app-integration-homologation-v1.0.md`;
- **Segurança / RLS:** `docs/relatorios/auth-rls-implementation-plan-v1.0.md` e `docs/relatorios/auth-rls-implementation-homologation-v1.0.md`;
- **Clientes:** `docs/relatorios/clientes-implementation-v1.0.md` e `docs/relatorios/clientes-implementation-homologation-v1.0.md`;
- **Catálogo (Serviços e Produtos):** `docs/relatorios/catalogo-servicos-produtos-implementation-v1.0.md` e `docs/relatorios/catalogo-servicos-produtos-implementation-homologation-v1.0.md`;
- **Orçamentos e Itens:** `docs/relatorios/orcamentos-itens-implementation-v1.0.md` e `docs/relatorios/orcamentos-itens-implementation-audit-v1.1.md`;
- **Áreas / Medição / PostGIS (GAP-AREA-04, 06, 07, 08):** `docs/relatorios/areas-gap-closure-implementation-v1.0.md` e `docs/relatorios/areas-gap-closure-implementation-audit-v1.0.md`;
- **Áreas / Desenho em Mapa (GAP-AREA-01):** `docs/relatorios/areas-map-drawing-implementation-v1.0.md` e `docs/relatorios/areas-map-drawing-implementation-reaudit-v1.0.md`;
- **Áreas / Chave de API Google Maps (GAP-AREA-02):** `docs/relatorios/areas-google-maps-api-key-implementation-audit-v1.0.md`.

---

## 3. Processo de Construção a Preservar

O projeto adota um processo de engenharia rigoroso e incremental, estruturado no seguinte fluxo canônico:

```
Planejamento
  └──> Decisão Técnica Formal
        └──> Implementação Controlada
              └──> Relatório de Implementação
                    └──> Auditoria Técnica Independente
                          ├──> (Se falhas: Correção e Reauditoria)
                          └──> Homologação Formal
                                └──> Congelamento do Módulo
```

As premissas inegociáveis deste processo são:
1. Nenhuma funcionalidade é declarada como concluída sem evidência documental e bateria completa de testes;
2. Uma homologação anterior nunca é reaberta arbitrariamente para acomodar facilidades de implementação;
3. A existência de código em repositório não equivale a homologação;
4. Este inventário atua como guardião da consistência, prevenindo que lacunas passem despercebidas para a fase final.

---

## 4. Stack Efetivo do Projeto

A tabela a seguir confronta o **Stack Canônico Documentado** com o **Valor Efetivo Encontrado** nos arquivos de configuração e no ambiente operacional de execução:

| Componente / Ferramenta | Valor Documentado | Valor Efetivo Encontrado | Arquivo / Comando de Verificação | Situação |
| :--- | :--- | :--- | :--- | :--- |
| **Sistema Operacional Host** | Windows 11 | Windows 11 Pro 64-bit | `cmd.exe /c ver` | Consistente |
| **Ambiente de Containers** | WSL2 / Docker Desktop | Docker Engine v29.8.0, Compose v2.40.3 | `docker --version` | Consistente |
| **Runtime JavaScript** | Node.js 22.19.0 | v22.19.0 | `node -v` | Consistente |
| **Gerenciador de Pacotes** | npm 10.9.3 | 10.9.3 | `npm -v` | Consistente |
| **Linguagem / Tipagem** | TypeScript 6.x | 6.0.3 (package: ^5.3.3 / resolved: 6.0.3) | `npx tsc -v` | Consistente |
| **Framework Mobile** | React Native 0.86.x | 0.86.3 | `package.json` | Consistente |
| **Plataforma Mobile** | Expo SDK 57.x | 57.0.23 | `package.json` | Consistente |
| **Roteamento de Telas** | Expo Router | 57.0.21 | `package.json` | Consistente |
| **Engine JavaScript** | Hermes | Habilitado (`hermesEngine`) | `app.config.js` | Consistente |
| **Backend / Auth / BaaS** | Supabase | Supabase CLI v2.119.0 | `npx supabase -v` | Consistente |
| **Banco de Dados Relacional** | PostgreSQL 17.x | PostgreSQL 17.6 | `SELECT version();` | Consistente |
| **Extensão Espacial** | PostGIS | PostGIS 3.3.7 | `SELECT PostGIS_Version();` | Consistente |
| **Framework de Testes SQL** | pgTAP | 170 testes (8 arquivos .sql) | `npx supabase test db` | Consistente |
| **Framework de Testes Unit** | Vitest | 247 testes (14 arquivos .test.ts) | `npm test` | Consistente |
| **Dispositivo de Validação** | Android Emulator Pixel_10 | Pixel_10 (target android-37.1) | `adb devices` | Consistente |
| **Biblioteca de Mapas** | react-native-maps 1.27.2 | 1.27.2 | `package.json` | Consistente |

> [!NOTE]
> O ambiente de testes e validação encontra-se plenamente operacional e estável, com 100% dos testes existentes passando com sucesso (247 testes de TypeScript/Vitest e 170 testes de banco/pgTAP).

---

## 5. Critérios de Classificação

Cada requisito e regra de negócio do projeto foi categorizado estritamente em uma das 5 situações padronizadas, sem termos ambíguos ou inferências não comprovadas:

- **A. HOMOLOGADO:** Requisito implementado em código e banco, coberto por testes automatizados, validado operacionalmente e com parecer favorável formalmente emitido em relatório de auditoria/homologação aprovado.
- **B. IMPLEMENTADO — NÃO HOMOLOGADO:** Requisito com código e testes existentes e funcionais no repositório, porém sem relatório ou parecer formal de auditoria/homologação correspondente emitido até o momento.
- **C. PARCIALMENTE IMPLEMENTADO:** Requisito que possui suporte ou estrutura em código (ex.: coluna no banco, método de entidade de domínio ou propriedade em componente), mas não possui fluxo ponta a ponta finalizado (ex.: falta integração em tela, trigger automático de execução ou serviço externo).
- **D. NÃO ENCONTRADO / NÃO IMPLEMENTADO:** Requisito para o qual não existe nenhuma linha de código de implementação, rota, tabela ou teste associado no repositório.
- **E. FORA DO ESCOPO EXPLÍCITO:** Requisito descontinuado formalmente, remetido para versões futuras por decisão registrada ou não pertencente ao escopo canônico da versão v1.0.

---

## 6. Estado Canônico dos Módulos

O estado canônico oficial dos módulos do sistema é sumarizado a seguir:

| Módulo Funcional | Situação Canônica | Evidência Documental Primária | Observação de Governança |
| :--- | :--- | :--- | :--- |
| **Autenticação e Sessão** | **HOMOLOGADO** | `supabase-auth-app-integration-homologation-v1.0.md` | Login, logout, criptografia e guarda de rotas concluídos. |
| **Segurança e RLS** | **HOMOLOGADO** | `auth-rls-implementation-homologation-v1.0.md` | 31 políticas de RLS e 170 testes pgTAP passando. |
| **Gerenciamento de Clientes** | **HOMOLOGADO** | `clientes-implementation-homologation-v1.0.md` | Cadastro, edição, inativação lógica, busca e listagem. |
| **Catálogo de Serviços** | **HOMOLOGADO** | `catalogo-servicos-produtos-implementation-homologation-v1.0.md` | CRUD completo, unidade de medida, preço base e soft delete. |
| **Catálogo de Produtos** | **HOMOLOGADO** | `catalogo-servicos-produtos-implementation-homologation-v1.0.md` | CRUD completo, unidade de medida, preço unitário e soft delete. |
| **Orçamentos (Cabeçalho e Fin.)** | **HOMOLOGADO** | `orcamentos-itens-implementation-audit-v1.1.md` | Ciclo de vida, cálculo financeiro, descontos e duplicação. |
| **Itens de Orçamento** | **HOMOLOGADO** | `orcamentos-itens-implementation-audit-v1.1.md` | Serviços, produtos, snapshots, recálculo em cascata e exclusão. |
| **Áreas / Mapas / Medição** | **HOMOLOGADO** | `areas-map-drawing-implementation-reaudit-v1.0.md` | Desenho satélite, polígonos PostGIS, métricas e GAP-01/02/04/06/07/08. |
| **Geocodificação / Localização** | **NÃO IMPLEMENTADO / PARCIAL** | *Sem relatório de auditoria* | Coordenadas manuais/busca de endereço e injeção no mapa pendentes. |
| **Geração de PDF** | **NÃO ENCONTRADO / NÃO IMPLEMENTADO** | *Sem relatório de auditoria* | Nenhum componente, serviço ou biblioteca de PDF implementado. |
| **Compartilhamento de PDF** | **NÃO ENCONTRADO / NÃO IMPLEMENTADO** | *Sem relatório de auditoria* | Nenhuma integração de envio/compartilhamento nativo implementada. |

---

## 7. Matriz RF01–RF82

A matriz integral abaixo audita todos os 82 Requisitos Funcionais individualmente, linha por linha, sem omissões ou agrupamentos arbitrários:

| ID | Descrição Resumida | Situação | Módulo | Arquivo(s) de Referência | Símbolo / Componente | Teste(s) de Verificação | Relatório Homologação | Dependências |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **RF01** | O sistema deve permitir que o usuário realize login utilizando suas credenciais cadastradas. | **HOMOLOGADO** | Autenticação | `src/application/services/auth.service.ts`, `app/(auth)/login.tsx` | `AuthService.signInWithEmail()`, `LoginScreen` | `tests/auth/auth.service.test.ts` (testes 2, 3) | `docs/relatorios/supabase-auth-app-integration-homologation-v1.0.md`, `auth-rls-implementation-homologation-v1.0.md` | Nenhuma |
| **RF02** | O sistema deve permitir que o usuário encerre sua sessão. | **HOMOLOGADO** | Autenticação | `src/application/services/auth.service.ts`, `app/(app)/_layout.tsx` | `AuthService.signOut()`, `AppLayout` | `tests/auth/auth.service.test.ts` (teste 4) | `docs/relatorios/supabase-auth-app-integration-homologation-v1.0.md` | RF01 |
| **RF03** | O sistema deve restringir o acesso aos dados e funcionalidades de acordo com o usuário autenticado, impedindo o acesso aos dados pertencentes a outros usuários. | **HOMOLOGADO** | Autenticação / RLS | `supabase/migrations/20260921000000_auth_rls.sql`, `src/infrastructure/supabase/client.ts` | 31 Políticas de RLS baseadas em `auth.uid() = usuario_id` | `supabase/tests/02_usuario_rls.sql` a `08_cross_tenant_mutations.sql` (170 testes pgTAP) | `docs/relatorios/auth-rls-strategy-v1.6.md`, `auth-rls-implementation-homologation-v1.0.md` | RF01 |
| **RF04** | O sistema deve permitir cadastrar clientes informando nome, telefone, e-mail, documento, observações e, opcionalmente, endereço. | **HOMOLOGADO** | Clientes | `src/application/use-cases/cliente/criar-cliente.use-case.ts`, `src/infrastructure/repositories/supabase-cliente.repository.ts`, `app/(app)/clientes/novo.tsx` | `CriarClienteUseCase`, `SupabaseClienteRepository.criar()`, `NovoClienteScreen` | `tests/clientes/cliente.use-cases.test.ts` (CriarClienteUseCase), `tests/domain/usuario-cliente.test.ts` | `docs/relatorios/clientes-implementation-homologation-v1.0.md` | RF03 |
| **RF05** | O sistema deve permitir consultar os clientes cadastrados pelo usuário. | **HOMOLOGADO** | Clientes | `src/application/use-cases/cliente/listar-clientes.use-case.ts`, `src/application/use-cases/cliente/obter-cliente.use-case.ts`, `app/(app)/clientes/index.tsx`, `app/(app)/clientes/[id].tsx` | `ListarClientesUseCase`, `ObterClienteUseCase`, `ClientesScreen`, `ClienteDetalheScreen` | `tests/clientes/cliente.use-cases.test.ts` (ListarClientesUseCase, ObterClienteUseCase) | `docs/relatorios/clientes-implementation-homologation-v1.0.md` | RF03, RF04 |
| **RF06** | O sistema deve permitir pesquisar clientes por nome ou telefone. | **HOMOLOGADO** | Clientes | `src/presentation/hooks/use-clientes.ts`, `app/(app)/clientes/index.tsx` | `useClientes()`, filtro reativo local `clientesFiltrados` | Validação empírica no emulador Pixel_10 (D-CLI-03) | `docs/relatorios/clientes-implementation-homologation-v1.0.md` | RF05 |
| **RF07** | O sistema deve permitir editar os dados de um cliente. | **HOMOLOGADO** | Clientes | `src/application/use-cases/cliente/atualizar-cliente.use-case.ts`, `app/(app)/clientes/editar.tsx` | `AtualizarClienteUseCase`, `EditarClienteScreen` | `tests/clientes/cliente.use-cases.test.ts` (AtualizarClienteUseCase) | `docs/relatorios/clientes-implementation-homologation-v1.0.md` | RF04, RF05 |
| **RF08** | O sistema deve permitir desativar um cliente, preservando seus dados quando necessários para o histórico de orçamentos. | **HOMOLOGADO** | Clientes | `src/application/use-cases/cliente/alterar-ativo-cliente.use-case.ts`, `app/(app)/clientes/[id].tsx` | `AlterarAtivoClienteUseCase`, `ClienteDetalheScreen` (diálogo de desativação lógica) | `tests/clientes/cliente.use-cases.test.ts` (AlterarAtivoClienteUseCase) | `docs/relatorios/clientes-implementation-homologation-v1.0.md` | RF04 |
| **RF09** | O sistema deve permitir cadastrar, editar e consultar o endereço associado a um cliente. | **HOMOLOGADO** | Clientes / Endereço | `src/application/use-cases/cliente/salvar-endereco-cliente.use-case.ts`, `src/application/use-cases/cliente/obter-endereco-cliente.use-case.ts`, `src/infrastructure/repositories/supabase-cliente.repository.ts`, `app/(app)/clientes/novo.tsx` | `SalvarEnderecoClienteUseCase`, `ObterEnderecoClienteUseCase`, `SupabaseClienteRepository.salvarEndereco()` | `tests/clientes/cliente.use-cases.test.ts` (Obter e Salvar Endereço), `tests/domain/usuario-cliente.test.ts` | `docs/relatorios/clientes-implementation-homologation-v1.0.md` | RF04 |
| **RF10** | O sistema deve permitir utilizar os dados do endereço para obter a localização geográfica do cliente quando disponível. | **NÃO ENCONTRADO / NÃO IMPLEMENTADO** | Localização / Geocodificação | Inexistente no código | `GeocodingProvider` não implementado | Nenhum teste existente | Inexistente | RF09 |
| **RF11** | O sistema deve permitir utilizar a localização geográfica do cliente como referência para posicionamento inicial no mapa. | **PARCIALMENTE IMPLEMENTADO** | Áreas / Mapas / Localização | `src/infrastructure/maps/map-provider.tsx`, `src/infrastructure/maps/map-provider.interface.ts`, `app/(app)/orcamentos/mapa.tsx` | `MapProviderProps.regiaoInicial`, `MapProvider` | `tests/areas/area-map-drawing.test.ts` (teste 1: inicialização de região) | `docs/relatorios/areas-map-drawing-implementation-reaudit-v1.0.md` (GAP-AREA-01) | RF09, RF10, RF40 |
| **RF12** | Quando não houver localização geográfica disponível para o cliente, o sistema deve permitir que o usuário localize manualmente o local necessário para utilização do mapa. | **PARCIALMENTE IMPLEMENTADO** | Áreas / Mapas | `src/infrastructure/maps/map-provider.tsx`, `app/(app)/orcamentos/mapa.tsx` | `MapView` (gestos nativos de Pan, Zoom e Navegação manual no satélite) | `tests/areas/area-map-drawing.test.ts` | `docs/relatorios/areas-map-drawing-implementation-reaudit-v1.0.md` (GAP-AREA-01), `areas-google-maps-api-key-implementation-audit-v1.0.md` (GAP-AREA-02) | RF40 |
| **RF13** | O sistema deve permitir cadastrar serviços personalizados. | **HOMOLOGADO** | Catálogo (Serviços) | `src/application/use-cases/servico/criar-servico.use-case.ts`, `src/infrastructure/repositories/supabase-servico.repository.ts`, `app/(app)/servicos/novo.tsx` | `CriarServicoUseCase`, `SupabaseServicoRepository.criar()`, `NovoServicoScreen` | `tests/servicos/servico.use-cases.test.ts` (CriarServicoUseCase) | `docs/relatorios/catalogo-servicos-produtos-implementation-homologation-v1.0.md` | RF03 |
| **RF14** | O sistema deve permitir informar, para cada serviço, nome, descrição, unidade, preço base, indicação de uso de medição de área e situação ativa ou inativa. | **HOMOLOGADO** | Catálogo (Serviços) | `src/application/validation/servico.validator.ts`, `src/domain/entities/servico.ts`, `app/(app)/servicos/novo.tsx` | `ServicoValidator.validar()`, `ServicoProps` | `tests/servicos/servico.use-cases.test.ts`, `tests/domain/servico-produto.test.ts` | `docs/relatorios/catalogo-servicos-produtos-implementation-homologation-v1.0.md` | RF13 |
| **RF15** | O sistema deve permitir consultar os serviços cadastrados pelo usuário. | **HOMOLOGADO** | Catálogo (Serviços) | `src/application/use-cases/servico/listar-servicos.use-case.ts`, `src/application/use-cases/servico/obter-servico.use-case.ts`, `app/(app)/servicos/index.tsx`, `app/(app)/servicos/[id].tsx` | `ListarServicosUseCase`, `ObterServicoUseCase`, `ServicosScreen`, `ServicoDetalheScreen` | `tests/servicos/servico.use-cases.test.ts` (ListarServicosUseCase, ObterServicoUseCase) | `docs/relatorios/catalogo-servicos-produtos-implementation-homologation-v1.0.md` | RF03, RF13 |
| **RF16** | O sistema deve permitir editar os dados de um serviço. | **HOMOLOGADO** | Catálogo (Serviços) | `src/application/use-cases/servico/atualizar-servico.use-case.ts`, `app/(app)/servicos/editar.tsx` | `AtualizarServicoUseCase`, `EditarServicoScreen` | `tests/servicos/servico.use-cases.test.ts` (AtualizarServicoUseCase) | `docs/relatorios/catalogo-servicos-produtos-implementation-homologation-v1.0.md` | RF13, RF15 |
| **RF17** | O sistema deve permitir desativar um serviço. | **HOMOLOGADO** | Catálogo (Serviços) | `src/application/use-cases/servico/alterar-ativo-servico.use-case.ts`, `app/(app)/servicos/[id].tsx` | `AlterarAtivoServicoUseCase`, `ServicoDetalheScreen` (diálogo nativo) | `tests/servicos/servico.use-cases.test.ts` (AlterarAtivoServicoUseCase) | `docs/relatorios/catalogo-servicos-produtos-implementation-homologation-v1.0.md` | RF13 |
| **RF18** | O sistema não deve permitir que a alteração ou desativação de um serviço modifique os dados de itens de orçamentos existentes. | **HOMOLOGADO** | Catálogo / Orçamentos | `src/domain/entities/item-orcamento.ts`, `src/application/use-cases/orcamento/adicionar-item-orcamento.use-case.ts` | `ItemOrcamento` snapshot histórico, FK `ON DELETE RESTRICT` | `tests/orcamentos/orcamento-item.use-cases.test.ts` (Teste Obrigatório de Snapshot Histórico) | `docs/relatorios/orcamentos-itens-implementation-audit-v1.1.md` | RF13, RF32 |
| **RF19** | O sistema deve permitir cadastrar produtos personalizados. | **HOMOLOGADO** | Catálogo (Produtos) | `src/application/use-cases/produto/criar-produto.use-case.ts`, `src/infrastructure/repositories/supabase-produto.repository.ts`, `app/(app)/produtos/novo.tsx` | `CriarProdutoUseCase`, `SupabaseProdutoRepository.criar()`, `NovoProdutoScreen` | `tests/produtos/produto.use-cases.test.ts` (CriarProdutoUseCase) | `docs/relatorios/catalogo-servicos-produtos-implementation-homologation-v1.0.md` | RF03 |
| **RF20** | O sistema deve permitir informar, para cada produto, nome, descrição, unidade, preço base e situação ativa ou inativa. | **HOMOLOGADO** | Catálogo (Produtos) | `src/application/validation/produto.validator.ts`, `src/domain/entities/produto.ts`, `app/(app)/produtos/novo.tsx` | `ProdutoValidator.validar()`, `ProdutoProps` | `tests/produtos/produto.use-cases.test.ts`, `tests/domain/servico-produto.test.ts` | `docs/relatorios/catalogo-servicos-produtos-implementation-homologation-v1.0.md` | RF19 |
| **RF21** | O sistema deve permitir consultar os produtos cadastrados pelo usuário. | **HOMOLOGADO** | Catálogo (Produtos) | `src/application/use-cases/produto/listar-produtos.use-case.ts`, `src/application/use-cases/produto/obter-produto.use-case.ts`, `app/(app)/produtos/index.tsx`, `app/(app)/produtos/[id].tsx` | `ListarProdutosUseCase`, `ObterProdutoUseCase`, `ProdutosScreen`, `ProdutoDetalheScreen` | `tests/produtos/produto.use-cases.test.ts` (ListarProdutosUseCase, ObterProdutoUseCase) | `docs/relatorios/catalogo-servicos-produtos-implementation-homologation-v1.0.md` | RF03, RF19 |
| **RF22** | O sistema deve permitir editar os dados de um produto. | **HOMOLOGADO** | Catálogo (Produtos) | `src/application/use-cases/produto/atualizar-produto.use-case.ts`, `app/(app)/produtos/editar.tsx` | `AtualizarProdutoUseCase`, `EditarProdutoScreen` | `tests/produtos/produto.use-cases.test.ts` (AtualizarProdutoUseCase) | `docs/relatorios/catalogo-servicos-produtos-implementation-homologation-v1.0.md` | RF19, RF21 |
| **RF23** | O sistema deve permitir desativar um produto. | **HOMOLOGADO** | Catálogo (Produtos) | `src/application/use-cases/produto/alterar-ativo-produto.use-case.ts`, `app/(app)/produtos/[id].tsx` | `AlterarAtivoProdutoUseCase`, `ProdutoDetalheScreen` (diálogo nativo) | `tests/produtos/produto.use-cases.test.ts` (AlterarAtivoProdutoUseCase) | `docs/relatorios/catalogo-servicos-produtos-implementation-homologation-v1.0.md` | RF19 |
| **RF24** | O sistema não deve permitir que a alteração ou desativação de um produto modifique os dados de itens de orçamentos existentes. | **HOMOLOGADO** | Catálogo / Orçamentos | `src/domain/entities/item-orcamento.ts`, `src/application/use-cases/orcamento/adicionar-item-orcamento.use-case.ts` | `ItemOrcamento` snapshot histórico, FK `ON DELETE RESTRICT` | `tests/orcamentos/orcamento-item.use-cases.test.ts` (Teste Obrigatório de Snapshot Histórico) | `docs/relatorios/orcamentos-itens-implementation-audit-v1.1.md` | RF19, RF32 |
| **RF25** | O sistema deve permitir criar um orçamento associado a um cliente. | **HOMOLOGADO** | Orçamentos | `src/application/use-cases/orcamento/criar-orcamento.use-case.ts`, `src/infrastructure/repositories/supabase-orcamento.repository.ts`, `app/(app)/orcamentos/novo.tsx` | `CriarOrcamentoUseCase`, `SupabaseOrcamentoRepository.criar()`, `NovoOrcamentoScreen` | `tests/orcamentos/orcamento.use-cases.test.ts` (CriarOrcamentoUseCase) | `docs/relatorios/orcamentos-itens-implementation-audit-v1.1.md` | RF03, RF04 |
| **RF26** | O sistema deve atribuir ao orçamento um identificador e um número próprio, mantendo o número único para o usuário responsável. | **HOMOLOGADO** | Orçamentos | `src/domain/entities/orcamento.ts`, `supabase/migrations/20260916020500_modelo_fisico_v1_1.sql` | PK UUID `id`, `numero` com constraint `UNIQUE (usuario_id, numero)` | `tests/orcamentos/orcamento.use-cases.test.ts`, `supabase/tests/04_orcamento_rls.sql` | `docs/relatorios/orcamentos-itens-implementation-audit-v1.1.md` | RF25 |
| **RF27** | O sistema deve criar todo novo orçamento com o status RASCUNHO. | **HOMOLOGADO** | Orçamentos | `src/domain/entities/orcamento.ts`, `src/application/use-cases/orcamento/criar-orcamento.use-case.ts` | `Orcamento.status = StatusOrcamento.RASCUNHO` | `tests/domain/orcamento-calculos.test.ts` (teste 1), `tests/orcamentos/orcamento.use-cases.test.ts` | `docs/relatorios/orcamentos-itens-implementation-audit-v1.1.md` | RF25 |
| **RF28** | O sistema deve permitir salvar um orçamento em RASCUNHO mesmo que ele ainda não esteja completo. | **HOMOLOGADO** | Orçamentos | `src/domain/entities/orcamento.ts`, `app/(app)/orcamentos/novo.tsx` | `Orcamento.constructor()`, `Orcamento.recalcularValores()` | `tests/domain/orcamento-calculos.test.ts` (teste 1) | `docs/relatorios/orcamentos-itens-implementation-audit-v1.1.md` | RF25, RF27 |
| **RF29** | O sistema deve permitir adicionar ao orçamento serviços cadastrados no catálogo do usuário. | **HOMOLOGADO** | Orçamentos / Itens | `src/application/use-cases/orcamento/adicionar-item-orcamento.use-case.ts`, `app/(app)/orcamentos/editar.tsx` | `AdicionarItemOrcamentoUseCase.execute()`, `EditarOrcamentoScreen` | `tests/orcamentos/orcamento-item.use-cases.test.ts` | `docs/relatorios/orcamentos-itens-implementation-audit-v1.1.md` | RF13, RF25 |
| **RF30** | O sistema deve permitir adicionar ao orçamento produtos cadastrados no catálogo do usuário. | **HOMOLOGADO** | Orçamentos / Itens | `src/application/use-cases/orcamento/adicionar-item-orcamento.use-case.ts`, `app/(app)/orcamentos/editar.tsx` | `AdicionarItemOrcamentoUseCase.execute()`, `EditarOrcamentoScreen` | `tests/orcamentos/orcamento-item.use-cases.test.ts` | `docs/relatorios/orcamentos-itens-implementation-audit-v1.1.md` | RF19, RF25 |
| **RF31** | O sistema deve permitir remover itens de um orçamento sem remover o serviço ou produto correspondente do catálogo. | **HOMOLOGADO** | Orçamentos / Itens | `src/application/use-cases/orcamento/remover-item-orcamento.use-case.ts`, `app/(app)/orcamentos/[id].tsx`, `app/(app)/orcamentos/editar.tsx` | `RemoverItemOrcamentoUseCase.execute()` | `tests/orcamentos/orcamento-item.use-cases.test.ts` (Remoção de Itens e Recálculo) | `docs/relatorios/orcamentos-itens-implementation-audit-v1.1.md` | RF29, RF30 |
| **RF32** | Ao adicionar um serviço ou produto ao orçamento, o sistema deve criar um ItemOrcamento contendo um snapshot independente dos dados utilizados naquele orçamento. | **HOMOLOGADO** | Itens de Orçamento | `src/domain/entities/item-orcamento.ts`, `src/application/use-cases/orcamento/adicionar-item-orcamento.use-case.ts` | `ItemOrcamento`, `ItemOrcamentoProps` | `tests/domain/item-orcamento.test.ts` (testes 1, 5), `tests/orcamentos/orcamento-item.use-cases.test.ts` | `docs/relatorios/orcamentos-itens-implementation-audit-v1.1.md` | RF29, RF30 |
| **RF33** | O sistema deve registrar no ItemOrcamento descrição, unidade, quantidade, valor unitário e valor total. | **HOMOLOGADO** | Itens de Orçamento | `src/domain/entities/item-orcamento.ts`, `src/infrastructure/repositories/supabase-item-orcamento.repository.ts` | `ItemOrcamento` campos `descricao`, `unidade`, `quantidade`, `valorUnitario`, `valorTotal` | `tests/domain/item-orcamento.test.ts` (teste 1) | `docs/relatorios/orcamentos-itens-implementation-audit-v1.1.md` | RF32 |
| **RF34** | O sistema deve permitir editar, no orçamento, a descrição e o valor unitário de um item sem alterar o cadastro original do serviço ou produto. | **HOMOLOGADO** | Itens de Orçamento | `src/application/use-cases/orcamento/atualizar-item-orcamento.use-case.ts`, `app/(app)/orcamentos/editar.tsx` | `AtualizarItemOrcamentoUseCase.execute()`, `ItemOrcamento.atualizarSnapshot()` | `tests/domain/item-orcamento.test.ts` (teste 5), `tests/orcamentos/orcamento-item.use-cases.test.ts` | `docs/relatorios/orcamentos-itens-implementation-audit-v1.1.md` | RF32 |
| **RF35** | O sistema deve permitir informar a quantidade para produtos e serviços que não utilizam medição de área. | **HOMOLOGADO** | Itens de Orçamento | `src/domain/entities/item-orcamento.ts`, `src/application/use-cases/orcamento/atualizar-item-orcamento.use-case.ts`, `app/(app)/orcamentos/editar.tsx` | `ItemOrcamento.atualizarQuantidadeManual()`, `AtualizarItemOrcamentoUseCase` | `tests/domain/item-orcamento.test.ts` (teste 6), `tests/orcamentos/orcamento-item.use-cases.test.ts` | `docs/relatorios/orcamentos-itens-implementation-audit-v1.1.md` | RF32 |
| **RF36** | Para serviços que utilizam medição de área e possuem unidade comercial m², o sistema deve calcular automaticamente a quantidade do item a partir da soma das áreas associadas. | **HOMOLOGADO** | Áreas / Itens de Orçamento | `src/domain/entities/item-orcamento.ts`, `src/application/use-cases/area/criar-area.use-case.ts`, `src/application/use-cases/area/remover-area.use-case.ts`, `src/application/use-cases/area/atualizar-area.use-case.ts` | `ItemOrcamento.recalcularQuantidadePelasAreas()`, `CriarAreaUseCase`, `RemoverAreaUseCase` | `tests/domain/item-orcamento.test.ts` (teste 3), `tests/areas/area.use-cases.test.ts` (Multi-Área no mesmo Item) | `docs/relatorios/areas-use-cases-implementation-audit-v1.0.md` (GAP-AREA-07), `areas-google-maps-api-key-implementation-audit-v1.0.md` (GAP-AREA-02) | RF32, RF44 |
| **RF37** | O sistema deve impedir a alteração manual da quantidade de um serviço cuja quantidade seja determinada pela medição de área. | **HOMOLOGADO** | Itens de Orçamento / Áreas | `src/domain/entities/item-orcamento.ts`, `app/(app)/orcamentos/editar.tsx` | `ItemOrcamento.atualizarQuantidadeManual()` lança `RegraNegocioError` se `usaMedicaoArea = true` | `tests/domain/item-orcamento.test.ts` (teste 7), `tests/orcamentos/orcamento-item.use-cases.test.ts` (Quantidade Manual vs Item Medido) | `docs/relatorios/orcamentos-itens-implementation-audit-v1.1.md` | RF36 |
| **RF38** | O sistema deve recalcular o valor total do item sempre que a quantidade ou o valor unitário utilizado no item for alterado. | **HOMOLOGADO** | Itens de Orçamento | `src/domain/entities/item-orcamento.ts` | `ItemOrcamento.calcularTotal()`, `ItemOrcamento.valorTotal = arredondarMoeda(quantidade * valorUnitario)` | `tests/domain/item-orcamento.test.ts` (testes 2, 4) | `docs/relatorios/orcamentos-itens-implementation-audit-v1.1.md` | RF32 |
| **RF39** | O sistema deve identificar, a partir do serviço selecionado, se é necessária a utilização de medição de área. | **HOMOLOGADO** | Áreas / Catálogo / Orçamentos | `src/domain/entities/item-orcamento.ts`, `app/(app)/orcamentos/[id].tsx`, `app/(app)/orcamentos/areas.tsx` | `ItemOrcamento.usaMedicaoArea`, botão condicional de delimitação de áreas | `tests/orcamentos/orcamento-item.use-cases.test.ts`, `tests/areas/area.use-cases.test.ts` | `docs/relatorios/orcamentos-itens-implementation-audit-v1.1.md`, `areas-use-cases-implementation-audit-v1.0.md` | RF13, RF32 |
| **RF40** | Quando o serviço exigir medição, o sistema deve permitir abrir o mapa para delimitação da área. | **HOMOLOGADO** | Áreas / Mapas | `app/(app)/orcamentos/areas.tsx`, `app/(app)/orcamentos/mapa.tsx` | `AreasItemScreen`, `DelimitacaoMapaScreen`, navegação para rota `/orcamentos/mapa` | `tests/areas/area-map-drawing.test.ts` | `docs/relatorios/areas-map-drawing-implementation-reaudit-v1.0.md` (GAP-AREA-01), `areas-google-maps-api-key-implementation-audit-v1.0.md` (GAP-AREA-02) | RF39 |
| **RF41** | O sistema deve permitir delimitar uma área por meio de um polígono definido manualmente pelo usuário no mapa. | **HOMOLOGADO** | Áreas / Mapas | `src/infrastructure/maps/map-provider.tsx`, `src/presentation/components/mapa/mapa-delimitacao.tsx`, `src/presentation/hooks/use-mapa-delimitacao.ts` | `MapProvider`, `MapaDelimitacao`, `useMapaDelimitacao.adicionarVertice()` | `tests/areas/area-map-drawing.test.ts` (testes 3, 4, 7, 8) | `docs/relatorios/areas-map-drawing-implementation-reaudit-v1.0.md` (GAP-AREA-01) | RF40 |
| **RF42** | O sistema deve permitir associar uma ou mais áreas ao ItemOrcamento que representa um serviço com medição. | **HOMOLOGADO** | Áreas | `src/application/use-cases/area/criar-area.use-case.ts`, `src/infrastructure/repositories/supabase-area.repository.ts`, `supabase/migrations/20260916020500_modelo_fisico_v1_1.sql` | `CriarAreaUseCase`, `SupabaseAreaRepository.criar()`, tabela `public.area` | `tests/areas/area.use-cases.test.ts` (CriarAreaUseCase), `supabase/tests/05_itens_e_areas_rls.sql` | `docs/relatorios/areas-repository-implementation-audit-v1.0.md` (GAP-AREA-04), `areas-use-cases-implementation-audit-v1.0.md` (GAP-AREA-07) | RF36, RF41 |
| **RF43** | O sistema deve permitir que um mesmo item de serviço possua múltiplas áreas, independentemente de serem contíguas ou não. | **HOMOLOGADO** | Áreas | `src/application/use-cases/area/criar-area.use-case.ts`, `src/domain/entities/item-orcamento.ts` | `ItemOrcamento.areas`, suporte a N áreas distintas por item | `tests/areas/area.use-cases.test.ts` (Multi-Área no mesmo Item) | `docs/relatorios/areas-use-cases-implementation-audit-v1.0.md` (GAP-AREA-07) | RF42 |
| **RF44** | O sistema deve calcular automaticamente a área da geometria delimitada pelo usuário, utilizando metros quadrados (m²) como unidade de medição. | **HOMOLOGADO** | Áreas | `src/infrastructure/services/geodesic-calculador-area.service.ts`, `src/domain/services/calculador-area.service.interface.ts` | `GeodesicCalculadorAreaService.calcularArea()`, algoritmo Chamberlain & Duquette | `tests/infrastructure/geodesic-calculador-area.service.test.ts` (19 testes unitários) | `docs/relatorios/areas-calculador-area-implementation-audit-v1.0.md` (GAP-AREA-06) | RF41 |
| **RF45** | O sistema deve permitir editar a geometria de uma área. | **HOMOLOGADO** | Áreas | `src/application/use-cases/area/atualizar-area.use-case.ts`, `src/infrastructure/repositories/supabase-area.repository.ts` | `AtualizarAreaUseCase`, `SupabaseAreaRepository.atualizarGeometria()` | `tests/areas/area.use-cases.test.ts` (AtualizarAreaUseCase) | `docs/relatorios/areas-use-cases-implementation-audit-v1.0.md` (GAP-AREA-07) | RF42 |
| **RF46** | O sistema deve permitir editar os dados complementares de uma área, como nome e observações. | **HOMOLOGADO** | Áreas | `src/application/use-cases/area/atualizar-area.use-case.ts`, `src/infrastructure/repositories/supabase-area.repository.ts` | `AtualizarAreaUseCase`, `SupabaseAreaRepository.atualizar()` | `tests/areas/area.use-cases.test.ts` (AtualizarAreaUseCase - teste 1) | `docs/relatorios/areas-use-cases-implementation-audit-v1.0.md` (GAP-AREA-07) | RF42 |
| **RF47** | Após a alteração da geometria de uma área, o sistema deve recalcular automaticamente sua área e atualizar os valores dependentes da medição. | **HOMOLOGADO** | Áreas | `src/application/use-cases/area/atualizar-area.use-case.ts`, `src/domain/entities/item-orcamento.ts`, `src/domain/entities/orcamento.ts` | `AtualizarAreaUseCase.execute()`, `ItemOrcamento.recalcularQuantidadePelasAreas()` | `tests/areas/area.use-cases.test.ts` (AtualizarAreaUseCase - teste 2) | `docs/relatorios/areas-use-cases-implementation-audit-v1.0.md` (GAP-AREA-07) | RF44, RF45 |
| **RF48** | O sistema deve permitir remover uma área de um item de orçamento enquanto a edição do orçamento for permitida. | **HOMOLOGADO** | Áreas | `src/application/use-cases/area/remover-area.use-case.ts`, `src/infrastructure/repositories/supabase-area.repository.ts`, `app/(app)/orcamentos/areas.tsx` | `RemoverAreaUseCase`, `AreasItemScreen` (diálogo de exclusão de área) | `tests/areas/area.use-cases.test.ts` (RemoverAreaUseCase) | `docs/relatorios/areas-use-cases-implementation-audit-v1.0.md` (GAP-AREA-07) | RF42 |
| **RF49** | O sistema deve impedir a associação de áreas a itens que representem produtos ou serviços que não utilizam medição. | **HOMOLOGADO** | Áreas / Itens de Orçamento | `src/domain/entities/item-orcamento.ts`, `src/application/use-cases/area/criar-area.use-case.ts` | `ItemOrcamento.adicionarArea()`, `CriarAreaUseCase` validação de tipo e medição | `tests/domain/item-orcamento.test.ts` (teste 8), `tests/areas/area.use-cases.test.ts` (CriarAreaUseCase - testes 2, 3) | `docs/relatorios/areas-use-cases-implementation-audit-v1.0.md` (GAP-AREA-07) | RF42 |
| **RF50** | O sistema deve calcular o subtotal do orçamento a partir da soma dos valores totais de seus itens. | **HOMOLOGADO** | Orçamentos | `src/domain/entities/orcamento.ts`, `src/domain/calculations/moeda.ts` | `Orcamento.recalcularValores()`, `subtotal = Σ valorTotal` | `tests/domain/orcamento-calculos.test.ts` (teste 2) | `docs/relatorios/orcamentos-itens-implementation-audit-v1.1.md` | RF38 |
| **RF51** | O sistema deve permitir aplicar desconto sobre o subtotal do orçamento. | **HOMOLOGADO** | Orçamentos | `src/domain/entities/orcamento.ts`, `app/(app)/orcamentos/novo.tsx`, `app/(app)/orcamentos/editar.tsx` | `Orcamento.aplicarDesconto()`, campos de desconto nas telas de formulário | `tests/domain/orcamento-calculos.test.ts` (testes 3, 4) | `docs/relatorios/orcamentos-itens-implementation-audit-v1.1.md` | RF50 |
| **RF52** | O sistema deve permitir escolher entre desconto percentual e desconto por valor fixo. | **HOMOLOGADO** | Orçamentos | `src/domain/enums/tipo-desconto.ts`, `src/domain/entities/orcamento.ts`, `supabase/migrations/20260916020500_modelo_fisico_v1_1.sql` | `TipoDesconto.PERCENTUAL`, `TipoDesconto.FIXO`, check constraint `orcamento_desconto_check` | `tests/domain/orcamento-calculos.test.ts` (testes 3, 4), `tests/orcamentos/orcamento.use-cases.test.ts` | `docs/relatorios/orcamentos-itens-implementation-audit-v1.1.md` | RF51 |
| **RF53** | O sistema deve validar o desconto informado de acordo com os limites definidos para cada tipo de desconto. | **HOMOLOGADO** | Orçamentos | `src/domain/entities/orcamento.ts`, `src/application/validation/orcamento.validator.ts`, `supabase/migrations/20260916020500_modelo_fisico_v1_1.sql` | `orcamento_desconto_check` (PERCENTUAL: 0 a 100; FIXO: 0 a subtotal) | `tests/domain/orcamento-calculos.test.ts` (testes 3, 4), `tests/orcamentos/orcamento.use-cases.test.ts` | `docs/relatorios/orcamentos-itens-implementation-audit-v1.1.md` (Divergência 1 resolvida) | RF52 |
| **RF54** | O sistema deve calcular o valor do desconto e o total do orçamento conforme os dados dos itens e o desconto aplicado. | **HOMOLOGADO** | Orçamentos | `src/domain/calculations/moeda.ts`, `src/domain/entities/orcamento.ts` | `calcularValorDesconto()`, `calcularTotalOrcamento()`, `Orcamento.recalcularValores()` | `tests/domain/orcamento-calculos.test.ts` | `docs/relatorios/orcamentos-itens-implementation-audit-v1.1.md` | RF50, RF51 |
| **RF55** | O sistema deve impedir que o total do orçamento resulte em valor negativo. | **HOMOLOGADO** | Orçamentos | `src/domain/entities/orcamento.ts`, `supabase/migrations/20260916020500_modelo_fisico_v1_1.sql` | `Orcamento.total >= 0`, constraint `orcamento_total_check` | `tests/domain/orcamento-calculos.test.ts`, `supabase/tests/04_orcamento_rls.sql` | `docs/relatorios/orcamentos-itens-implementation-audit-v1.1.md` | RF54 |
| **RF56** | O sistema deve armazenar subtotal, valor do desconto e total do orçamento e recalculá-los quando houver alterações que afetem esses valores. | **HOMOLOGADO** | Orçamentos | `src/infrastructure/repositories/supabase-orcamento.repository.ts`, `src/domain/entities/orcamento.ts` | Colunas `subtotal`, `valor_desconto`, `total` persistidas na tabela `public.orcamento` | `tests/domain/orcamento-calculos.test.ts` (teste 6), `tests/orcamentos/orcamento.use-cases.test.ts` | `docs/relatorios/orcamentos-itens-implementation-audit-v1.1.md` | RF50, RF54 |
| **RF57** | O sistema deve permitir informar a data de validade do orçamento. | **HOMOLOGADO** | Orçamentos | `src/domain/entities/orcamento.ts`, `app/(app)/orcamentos/novo.tsx`, `app/(app)/orcamentos/editar.tsx` | `Orcamento.definirValidade()`, `Orcamento.dataValidade`, input de validade ISO civil | `tests/domain/orcamento-validacao-envio.test.ts` (teste 2) | `docs/relatorios/orcamentos-itens-implementation-audit-v1.1.md` | RF25 |
| **RF58** | O sistema deve permitir adicionar observações ao orçamento. | **HOMOLOGADO** | Orçamentos | `src/domain/entities/orcamento.ts`, `app/(app)/orcamentos/novo.tsx`, `app/(app)/orcamentos/editar.tsx`, `app/(app)/orcamentos/[id].tsx` | `Orcamento.definirObservacoes()`, `Orcamento.observacoes` | `tests/orcamentos/orcamento.use-cases.test.ts` | `docs/relatorios/orcamentos-itens-implementation-audit-v1.1.md` | RF25 |
| **RF59** | O sistema deve permitir informar as condições de pagamento do orçamento. | **HOMOLOGADO** | Orçamentos | `src/domain/entities/orcamento.ts`, `app/(app)/orcamentos/novo.tsx`, `app/(app)/orcamentos/editar.tsx`, `app/(app)/orcamentos/[id].tsx` | `Orcamento.definirCondicoesPagamento()`, `Orcamento.condicoesPagamento` | `tests/orcamentos/orcamento.use-cases.test.ts` | `docs/relatorios/orcamentos-itens-implementation-audit-v1.1.md` | RF25 |
| **RF60** | O sistema deve permitir solicitar o envio de um orçamento que esteja em RASCUNHO. | **HOMOLOGADO** | Orçamentos | `app/(app)/orcamentos/[id].tsx`, `src/application/use-cases/orcamento/alterar-status-orcamento.use-case.ts` | Botão "Enviar Proposta", `AlterarStatusOrcamentoUseCase` | `tests/orcamentos/orcamento.use-cases.test.ts` | `docs/relatorios/orcamentos-itens-implementation-audit-v1.1.md` | RF27 |
| **RF61** | Antes de permitir a alteração do status de RASCUNHO para ENVIADO, o sistema deve validar se o orçamento possui cliente, pelo menos um item válido, data de validade definida, valores calculados e todas as medições necessárias concluídas. | **HOMOLOGADO** | Orçamentos | `src/domain/entities/orcamento.ts`, `src/domain/errors/dominio-error.ts` | `Orcamento.obterErrosValidacaoEnvio()`, `Orcamento.validarParaEnvio()` | `tests/domain/orcamento-validacao-envio.test.ts` (testes 1, 2, 3, 4) | `docs/relatorios/orcamentos-itens-implementation-audit-v1.1.md` | RF60 |
| **RF62** | Caso alguma condição necessária para o envio não seja atendida, o sistema deve impedir o envio e informar ao usuário os dados que precisam ser corrigidos. | **HOMOLOGADO** | Orçamentos | `src/domain/errors/dominio-error.ts`, `app/(app)/orcamentos/[id].tsx` | `ValidacaoEnvioError`, `Alert.alert("Não é possível enviar o orçamento", ...)` | `tests/domain/orcamento-validacao-envio.test.ts` | `docs/relatorios/orcamentos-itens-implementation-audit-v1.1.md` | RF61 |
| **RF63** | O sistema deve permitir alterar o status do orçamento somente de acordo com as transições previstas para o ciclo de vida do orçamento. | **HOMOLOGADO** | Orçamentos | `src/domain/entities/orcamento.ts`, `src/application/use-cases/orcamento/alterar-status-orcamento.use-case.ts` | `Orcamento.alterarStatus()`, métodos de transição canônicos | `tests/domain/orcamento-estados.test.ts` (5 testes de ciclo de vida) | `docs/relatorios/orcamentos-itens-implementation-audit-v1.1.md` | RF27 |
| **RF64** | O sistema deve permitir as seguintes transições válidas: | **HOMOLOGADO** | Orçamentos | `src/domain/entities/orcamento.ts`, `src/application/use-cases/orcamento/alterar-status-orcamento.use-case.ts` | Métodos: `enviar()`, `iniciarAnalise()`, `aprovar()`, `recusar()`, `concluir()`, `cancelar()` | `tests/domain/orcamento-estados.test.ts` (testes 1, 2, 3) | `docs/relatorios/orcamentos-itens-implementation-audit-v1.1.md` | RF63 |
| **RF65** | O sistema deve impedir transições de status que não estejam previstas no ciclo de vida do orçamento. | **HOMOLOGADO** | Orçamentos | `src/domain/errors/dominio-error.ts`, `src/domain/entities/orcamento.ts`, `supabase/migrations/20260916020500_modelo_fisico_v1_1.sql` | `TransicaoInvalidaError`, check constraint `orcamento_status_check` | `tests/domain/orcamento-estados.test.ts` (teste 5), `tests/orcamentos/orcamento.use-cases.test.ts` | `docs/relatorios/orcamentos-itens-implementation-audit-v1.1.md` | RF63 |
| **RF66** | O sistema deve permitir ao jardineiro registrar a aprovação ou recusa de um orçamento pelo cliente. | **HOMOLOGADO** | Orçamentos | `app/(app)/orcamentos/[id].tsx`, `src/application/use-cases/orcamento/alterar-status-orcamento.use-case.ts`, `src/domain/entities/orcamento.ts` | Botões "Aprovar Orçamento" e "Recusar Orçamento", `Orcamento.aprovar()`, `Orcamento.recusar()` | `tests/domain/orcamento-estados.test.ts` (testes 1, 2) | `docs/relatorios/orcamentos-itens-implementation-audit-v1.1.md` | RF64 |
| **RF67** | O sistema deve identificar automaticamente a expiração de um orçamento ENVIADO ou EM_ANALISE quando sua data de validade for ultrapassada. | **PARCIALMENTE IMPLEMENTADO** | Orçamentos | `src/domain/entities/orcamento.ts` | `Orcamento.verificarExpiracao(dataReferencia: Date)` | `tests/domain/orcamento-estados.test.ts` (teste 4) | `docs/relatorios/orcamentos-itens-implementation-audit-v1.1.md` | RF57, RF63 |
| **RF68** | O sistema não deve marcar automaticamente um orçamento RASCUNHO como EXPIRADO. | **HOMOLOGADO** | Orçamentos | `src/domain/entities/orcamento.ts` | `Orcamento.verificarExpiracao()` ignora propostas em RASCUNHO | `tests/domain/orcamento-estados.test.ts` (teste 4) | `docs/relatorios/orcamentos-itens-implementation-audit-v1.1.md` | RF67 |
| **RF69** | O sistema deve impedir a edição direta de um orçamento que tenha saído do status RASCUNHO. | **HOMOLOGADO** | Orçamentos | `src/domain/entities/orcamento.ts`, `src/application/use-cases/orcamento/atualizar-orcamento.use-case.ts`, `app/(app)/orcamentos/[id].tsx` | `Orcamento.assegurarEditavel()`, botões de edição ocultados na UI | `tests/domain/orcamento-calculos.test.ts` (teste 7), `tests/orcamentos/orcamento.use-cases.test.ts` | `docs/relatorios/orcamentos-itens-implementation-audit-v1.1.md` | RF63 |
| **RF70** | O sistema deve impedir a reabertura de orçamentos nos estados em que a edição não é permitida. | **HOMOLOGADO** | Orçamentos | `src/domain/entities/orcamento.ts`, `src/application/use-cases/orcamento/alterar-status-orcamento.use-case.ts` | `AlterarStatusOrcamentoUseCase`, ausência de transição para RASCUNHO a partir de estados finais | `tests/domain/orcamento-estados.test.ts` (teste 5) | `docs/relatorios/orcamentos-itens-implementation-audit-v1.1.md` | RF69, RF75 |
| **RF71** | O sistema deve permitir consultar os orçamentos cadastrados pelo usuário. | **HOMOLOGADO** | Orçamentos | `src/application/use-cases/orcamento/listar-orcamentos.use-case.ts`, `app/(app)/orcamentos/index.tsx` | `ListarOrcamentosUseCase`, `OrcamentosScreen` | `tests/orcamentos/orcamento.use-cases.test.ts` | `docs/relatorios/orcamentos-itens-implementation-audit-v1.1.md` | RF03, RF25 |
| **RF72** | O sistema deve permitir filtrar ou consultar os orçamentos de acordo com seu status. | **HOMOLOGADO** | Orçamentos | `src/application/use-cases/orcamento/listar-orcamentos.use-case.ts`, `app/(app)/orcamentos/index.tsx` | `ListarOrcamentosInput.filtroStatus`, abas de status na interface | `tests/orcamentos/orcamento.use-cases.test.ts` | `docs/relatorios/orcamentos-itens-implementation-audit-v1.1.md` | RF71 |
| **RF73** | O sistema deve permitir visualizar os detalhes de um orçamento, incluindo itens, áreas, valores, validade, observações, condições de pagamento e status. | **HOMOLOGADO** | Orçamentos / Itens / Áreas | `src/application/use-cases/orcamento/obter-orcamento.use-case.ts`, `src/infrastructure/repositories/supabase-orcamento.repository.ts`, `app/(app)/orcamentos/[id].tsx` | `ObterOrcamentoUseCase`, `OrcamentoDetalheScreen`, Eager loading de itens e áreas | `tests/orcamentos/orcamento.use-cases.test.ts`, `tests/areas/area-hydration.test.ts` | `docs/relatorios/areas-hydration-implementation-audit-v1.0.md` (GAP-AREA-08) | RF25, RF32, RF42 |
| **RF74** | O sistema deve preservar os orçamentos existentes para consulta histórica, independentemente de seu status. | **HOMOLOGADO** | Orçamentos | `src/application/use-cases/orcamento/excluir-orcamento.use-case.ts`, `supabase/migrations/20260921000000_auth_rls.sql` | `ExcluirOrcamentoUseCase`, RLS policy no DELETE restrita a RASCUNHO | `tests/orcamentos/orcamento.use-cases.test.ts` (ExcluirOrcamentoUseCase) | `docs/relatorios/orcamentos-itens-implementation-audit-v1.1.md` (Decisão D2) | RF63 |
| **RF75** | O sistema deve permitir duplicar um orçamento existente. | **HOMOLOGADO** | Orçamentos | `src/application/use-cases/orcamento/duplicar-orcamento.use-case.ts`, `app/(app)/orcamentos/[id].tsx` | `DuplicarOrcamentoUseCase`, botão "Duplicar Orçamento" | `tests/orcamentos/orcamento.use-cases.test.ts` (DuplicarOrcamentoUseCase) | `docs/relatorios/orcamentos-itens-implementation-audit-v1.1.md` (Divergência 2 resolvida) | RF25, RF73 |
| **RF76** | A duplicação deve criar um novo orçamento com identificador e número próprios e status inicial RASCUNHO. | **HOMOLOGADO** | Orçamentos | `src/domain/entities/orcamento.ts`, `src/application/use-cases/orcamento/duplicar-orcamento.use-case.ts` | `Orcamento.duplicar()`, novo número gerado e `status = RASCUNHO` | `tests/domain/orcamento-duplicacao.test.ts` (teste 1), `tests/orcamentos/orcamento.use-cases.test.ts` | `docs/relatorios/orcamentos-itens-implementation-audit-v1.1.md` | RF75 |
| **RF77** | O sistema deve permitir editar o orçamento duplicado independentemente do orçamento original. | **HOMOLOGADO** | Orçamentos | `src/domain/entities/orcamento.ts`, `src/application/use-cases/orcamento/duplicar-orcamento.use-case.ts` | `Orcamento.duplicar()` com clonagem profunda de itens e áreas | `tests/domain/orcamento-duplicacao.test.ts` | `docs/relatorios/orcamentos-itens-implementation-audit-v1.1.md` | RF76 |
| **RF78** | O sistema não deve modificar o orçamento original quando o orçamento duplicado for alterado. | **HOMOLOGADO** | Orçamentos | `src/domain/entities/orcamento.ts`, `src/application/use-cases/orcamento/duplicar-orcamento.use-case.ts` | Clonagem independente de objetos de domínio e registros PostgREST | `tests/domain/orcamento-duplicacao.test.ts` | `docs/relatorios/orcamentos-itens-implementation-audit-v1.1.md` | RF77 |
| **RF79** | O sistema deve permitir gerar um PDF a partir dos dados de um orçamento. | **NÃO ENCONTRADO / NÃO IMPLEMENTADO** | PDF | Inexistente no código | `PdfGenerator` não implementado | Nenhum teste existente | Inexistente | RF73 |
| **RF80** | O PDF deve apresentar, quando aplicável, os dados do profissional, cliente, identificação do orçamento, data, validade, serviços, produtos, áreas, quantidades, valores, desconto, total, observações e condições de pagamento. | **NÃO ENCONTRADO / NÃO IMPLEMENTADO** | PDF | Inexistente no código | Template de apresentação PDF ausente | Nenhum teste existente | Inexistente | RF79 |
| **RF81** | Os valores e demais dados apresentados no PDF devem corresponder aos dados do orçamento utilizado para sua geração. | **NÃO ENCONTRADO / NÃO IMPLEMENTADO** | PDF | Inexistente no código | Validação de consistência de PDF ausente | Nenhum teste existente | Inexistente | RF80 |
| **RF82** | O sistema deve permitir compartilhar o PDF utilizando os mecanismos de compartilhamento disponíveis no dispositivo. | **NÃO ENCONTRADO / NÃO IMPLEMENTADO** | Compartilhamento | Inexistente no código | Integração de compartilhamento móvel ausente | Nenhum teste existente | Inexistente | RF79 |

---

## 8. Matriz RN01–RN81

A matriz integral abaixo audita todas as 81 Regras de Negócio canônicas individualmente, linha por linha:

| ID | Descrição Resumida | Situação | Módulo | RF Relacionado | Arquivo(s) de Referência | Símbolo / Componente | Teste(s) de Verificação | Relatório Homologação |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **RN01** | O sistema deve possuir usuários autenticados responsáveis pelo gerenciamento de seus próprios dados e orçamentos. | **HOMOLOGADO** | Usuário e Acesso | RF01, RF03 | `src/application/services/auth.service.ts`, `src/domain/entities/usuario.ts`, `supabase/migrations/20260916020500_modelo_fisico_v1_1.sql` | `AuthService`, `Usuario`, tabela `public.usuario` | `tests/auth/auth.service.test.ts`, `tests/domain/usuario-cliente.test.ts` | `docs/relatorios/supabase-auth-app-integration-homologation-v1.0.md` |
| **RN02** | Cada usuário deve ter acesso somente aos clientes, serviços, produtos e orçamentos sob sua responsabilidade. | **HOMOLOGADO** | Usuário e Acesso | RF03 | `supabase/migrations/20260921000000_auth_rls.sql` | Políticas RLS em todas as tabelas (`usuario_id = auth.uid()`) | `supabase/tests/02_usuario_rls.sql` a `08_cross_tenant_mutations.sql` (170 testes pgTAP) | `docs/relatorios/auth-rls-strategy-v1.6.md`, `auth-rls-implementation-homologation-v1.0.md` |
| **RN03** | Um cliente deve pertencer a um único usuário. | **HOMOLOGADO** | Clientes e Endereço | RF04 | `supabase/migrations/20260916020500_modelo_fisico_v1_1.sql`, `src/domain/entities/cliente.ts` | `CLIENTE.usuario_id` FK NOT NULL, `Cliente.usuarioId` | `tests/domain/usuario-cliente.test.ts`, `tests/clientes/cliente.use-cases.test.ts` | `docs/relatorios/clientes-implementation-homologation-v1.0.md` |
| **RN04** | O cadastro de um cliente deve poder conter dados de identificação e contato, além de observações. | **HOMOLOGADO** | Clientes e Endereço | RF04 | `src/domain/entities/cliente.ts`, `src/application/validation/cliente.validator.ts`, `app/(app)/clientes/novo.tsx` | `ClienteProps` (nome, telefone, email, documento, observacoes) | `tests/domain/usuario-cliente.test.ts`, `tests/clientes/cliente.use-cases.test.ts` | `docs/relatorios/clientes-implementation-homologation-v1.0.md` |
| **RN05** | O endereço do cliente é opcional no cadastro. | **HOMOLOGADO** | Clientes e Endereço | RF04, RF09 | `src/application/use-cases/cliente/criar-cliente.use-case.ts`, `src/domain/entities/cliente.ts` | `CriarClienteInput.endereco?`, cardinalidade `1 : 0..1` | `tests/domain/usuario-cliente.test.ts`, `tests/clientes/cliente.use-cases.test.ts` | `docs/relatorios/clientes-implementation-homologation-v1.0.md` |
| **RN06** | Quando cadastrado, o endereço deve ser composto por informações textuais de localização e pode possuir latitude e longitude obtidas por geocodificação. | **PARCIALMENTE IMPLEMENTADO** | Clientes e Endereço | RF09, RF10 | `src/domain/entities/endereco.ts`, `supabase/migrations/20260916020500_modelo_fisico_v1_1.sql` | `EnderecoProps.latitude`, `EnderecoProps.longitude`, colunas `latitude`, `longitude` em `public.endereco` | `tests/domain/usuario-cliente.test.ts`, `tests/clientes/cliente.use-cases.test.ts` | `docs/relatorios/clientes-implementation-homologation-v1.0.md` |
| **RN07** | A localização geográfica do cliente pode ser utilizada como referência para posicionar inicialmente o mapa. | **PARCIALMENTE IMPLEMENTADO** | Clientes e Endereço / Mapas | RF11 | `src/infrastructure/maps/map-provider.tsx`, `app/(app)/orcamentos/mapa.tsx` | `MapProviderProps.regiaoInicial` | `tests/areas/area-map-drawing.test.ts` | `docs/relatorios/areas-map-drawing-implementation-reaudit-v1.0.md` (GAP-AREA-01) |
| **RN08** | A localização do cliente não representa, por si só, uma área de trabalho. | **HOMOLOGADO** | Clientes e Endereço / Áreas | RF09, RF41 | `src/domain/entities/endereco.ts`, `src/domain/entities/area.ts`, `docs/modelo-fisico-v1.1.md` (Seção 6 e 13) | `Endereco.latitude/longitude` vs `Area.geometria` (POLYGON) | `tests/domain/usuario-cliente.test.ts`, `tests/domain/area.test.ts` | `docs/planejamento/areas-mapas-medicao-homologacao-v1.0.md` (Conformidade 4.4) |
| **RN09** | Quando uma funcionalidade depender de localização e o cliente não possuir localização disponível, o local poderá ser informado ou localizado manualmente. | **PARCIALMENTE IMPLEMENTADO** | Clientes e Endereço / Mapas | RF12 | `src/infrastructure/maps/map-provider.tsx` | Gestos de Pan e Zoom no `MapView` | `tests/areas/area-map-drawing.test.ts` | `docs/relatorios/areas-map-drawing-implementation-reaudit-v1.0.md` (GAP-AREA-01) |
| **RN10** | Clientes que possuam histórico de orçamentos não devem ser excluídos fisicamente; devem ser desativados quando não forem mais utilizados. | **HOMOLOGADO** | Clientes e Endereço | RF08, RF74 | `src/application/use-cases/cliente/alterar-ativo-cliente.use-case.ts`, `supabase/migrations/20260916020500_modelo_fisico_v1_1.sql` | FK `orcamento_cliente_id_fkey` ON DELETE RESTRICT, `AlterarAtivoClienteUseCase` | `tests/clientes/cliente.use-cases.test.ts`, `supabase/tests/04_orcamento_rls.sql` | `docs/relatorios/clientes-implementation-homologation-v1.0.md` |
| **RN11** | Cada serviço pertence a um único usuário. | **HOMOLOGADO** | Serviços | RF13 | `supabase/migrations/20260916020500_modelo_fisico_v1_1.sql`, `src/domain/entities/servico.ts` | `SERVICO.usuario_id` FK NOT NULL | `tests/servicos/servico.use-cases.test.ts`, `tests/domain/servico-produto.test.ts` | `docs/relatorios/catalogo-servicos-produtos-implementation-homologation-v1.0.md` |
| **RN12** | O serviço deve possuir nome, descrição, unidade, preço base, indicação de uso de medição de área e situação ativa ou inativa. | **HOMOLOGADO** | Serviços | RF14 | `src/domain/entities/servico.ts`, `src/application/validation/servico.validator.ts` | `ServicoProps` (nome, descricao, unidade, precoBase, usaMedicaoArea, ativo) | `tests/domain/servico-produto.test.ts` (teste 1), `tests/servicos/servico.use-cases.test.ts` | `docs/relatorios/catalogo-servicos-produtos-implementation-homologation-v1.0.md` |
| **RN13** | O serviço pode exigir ou não medição de área. | **HOMOLOGADO** | Serviços | RF14, RF39 | `src/domain/entities/servico.ts`, `app/(app)/servicos/novo.tsx` | `Servico.usaMedicaoArea: boolean` | `tests/domain/servico-produto.test.ts`, `tests/servicos/servico.use-cases.test.ts` | `docs/relatorios/catalogo-servicos-produtos-implementation-homologation-v1.0.md` |
| **RN14** | Serviços que já tenham sido utilizados em orçamentos não devem ser excluídos fisicamente; devem ser desativados quando não forem mais utilizados. | **HOMOLOGADO** | Serviços | RF17, RF18 | `src/application/use-cases/servico/alterar-ativo-servico.use-case.ts`, `supabase/migrations/20260916020500_modelo_fisico_v1_1.sql` | FK `item_orcamento_servico_id_fkey` ON DELETE RESTRICT | `tests/servicos/servico.use-cases.test.ts` | `docs/relatorios/catalogo-servicos-produtos-implementation-homologation-v1.0.md` |
| **RN15** | Alterações realizadas no cadastro de um serviço não devem modificar os dados dos itens de orçamentos existentes. | **HOMOLOGADO** | Serviços | RF18, RF32 | `src/domain/entities/item-orcamento.ts` | `ItemOrcamento` snapshot histórico | `tests/orcamentos/orcamento-item.use-cases.test.ts` (Teste Obrigatório de Snapshot Histórico) | `docs/relatorios/orcamentos-itens-implementation-audit-v1.1.md` |
| **RN16** | Serviços que utilizam medição de área devem utilizar m² como unidade comercial. | **HOMOLOGADO** | Serviços | RF14, RF36 | `src/application/validation/servico.validator.ts`, `app/(app)/servicos/novo.tsx` | `ServicoValidator`: se `usaMedicaoArea = true`, `unidade` DEVE ser `"m²"` | `tests/domain/servico-produto.test.ts` (teste 1), `tests/servicos/servico.use-cases.test.ts` (teste 3) | `docs/relatorios/catalogo-servicos-produtos-implementation-homologation-v1.0.md` (Decisão D-CAT-02) |
| **RN17** | Cada produto pertence a um único usuário. | **HOMOLOGADO** | Produtos | RF19 | `supabase/migrations/20260916020500_modelo_fisico_v1_1.sql`, `src/domain/entities/produto.ts` | `PRODUTO.usuario_id` FK NOT NULL | `tests/produtos/produto.use-cases.test.ts`, `tests/domain/servico-produto.test.ts` | `docs/relatorios/catalogo-servicos-produtos-implementation-homologation-v1.0.md` |
| **RN18** | O produto deve possuir nome, descrição, unidade, preço base e situação ativa ou inativa. | **HOMOLOGADO** | Produtos | RF20 | `src/domain/entities/produto.ts`, `src/application/validation/produto.validator.ts` | `ProdutoProps` (nome, descricao, unidade, precoBase, ativo) | `tests/domain/servico-produto.test.ts` (teste 3), `tests/produtos/produto.use-cases.test.ts` | `docs/relatorios/catalogo-servicos-produtos-implementation-homologation-v1.0.md` |
| **RN19** | Produtos que já tenham sido utilizados em orçamentos não devem ser excluídos fisicamente; devem ser desativados quando não forem mais utilizados. | **HOMOLOGADO** | Produtos | RF23, RF24 | `src/application/use-cases/produto/alterar-ativo-produto.use-case.ts`, `supabase/migrations/20260916020500_modelo_fisico_v1_1.sql` | FK `item_orcamento_produto_id_fkey` ON DELETE RESTRICT | `tests/produtos/produto.use-cases.test.ts` | `docs/relatorios/catalogo-servicos-produtos-implementation-homologation-v1.0.md` |
| **RN20** | Alterações realizadas no cadastro de um produto não devem modificar os dados dos itens de orçamentos existentes. | **HOMOLOGADO** | Produtos | RF24, RF32 | `src/domain/entities/item-orcamento.ts` | `ItemOrcamento` snapshot histórico | `tests/orcamentos/orcamento-item.use-cases.test.ts` | `docs/relatorios/orcamentos-itens-implementation-audit-v1.1.md` |
| **RN21** | Cada orçamento deve pertencer a um único usuário e estar associado a um único cliente. | **HOMOLOGADO** | Orçamento | RF25 | `src/domain/entities/orcamento.ts`, `supabase/migrations/20260916020500_modelo_fisico_v1_1.sql` | FKs `usuario_id` e `cliente_id` NOT NULL | `tests/domain/orcamento-calculos.test.ts`, `tests/orcamentos/orcamento.use-cases.test.ts` | `docs/relatorios/orcamentos-itens-implementation-audit-v1.1.md` |
| **RN22** | Cada orçamento deve possuir identificador próprio e número único para o usuário responsável. | **HOMOLOGADO** | Orçamento | RF26 | `src/domain/entities/orcamento.ts`, `supabase/migrations/20260916020500_modelo_fisico_v1_1.sql` | `id: UUID`, constraint `UNIQUE (usuario_id, numero)` | `tests/orcamentos/orcamento.use-cases.test.ts` | `docs/relatorios/orcamentos-itens-implementation-audit-v1.1.md` |
| **RN23** | Um orçamento pode possuir zero ou mais itens enquanto estiver em RASCUNHO. | **HOMOLOGADO** | Orçamento | RF28 | `src/domain/entities/orcamento.ts` | `Orcamento._itens: ItemOrcamento[]` (array vazio permitido em RASCUNHO) | `tests/domain/orcamento-calculos.test.ts` (teste 1) | `docs/relatorios/orcamentos-itens-implementation-audit-v1.1.md` |
| **RN24** | Todo novo orçamento deve iniciar no status RASCUNHO. | **HOMOLOGADO** | Orçamento | RF27 | `src/domain/entities/orcamento.ts`, `supabase/migrations/20260916020500_modelo_fisico_v1_1.sql` | `status: StatusOrcamento = StatusOrcamento.RASCUNHO` | `tests/domain/orcamento-calculos.test.ts` (teste 1) | `docs/relatorios/orcamentos-itens-implementation-audit-v1.1.md` |
| **RN25** | O orçamento pode conter serviços e produtos por meio de seus itens de orçamento. | **HOMOLOGADO** | Orçamento | RF29, RF30 | `src/domain/entities/orcamento.ts`, `src/domain/entities/item-orcamento.ts` | `Orcamento.adicionarItem()` | `tests/domain/orcamento-calculos.test.ts`, `tests/orcamentos/orcamento-item.use-cases.test.ts` | `docs/relatorios/orcamentos-itens-implementation-audit-v1.1.md` |
| **RN26** | O orçamento deve permitir registrar validade, observações e condições de pagamento. | **HOMOLOGADO** | Orçamento | RF57, RF58, RF59 | `src/domain/entities/orcamento.ts`, `app/(app)/orcamentos/novo.tsx` | `Orcamento.dataValidade`, `Orcamento.observacoes`, `Orcamento.condicoesPagamento` | `tests/domain/orcamento-validacao-envio.test.ts`, `tests/orcamentos/orcamento.use-cases.test.ts` | `docs/relatorios/orcamentos-itens-implementation-audit-v1.1.md` |
| **RN27** | Cada item de orçamento deve representar exatamente um serviço ou um produto, nunca ambos simultaneamente. | **HOMOLOGADO** | Itens do Orçamento | RF32 | `supabase/migrations/20260916020500_modelo_fisico_v1_1.sql`, `src/domain/entities/item-orcamento.ts` | Check constraint `item_orcamento_tipo_check` (SERVICO XOR PRODUTO) | `tests/domain/item-orcamento.test.ts` (Regra XOR), `tests/orcamentos/orcamento-item.use-cases.test.ts` | `docs/relatorios/orcamentos-itens-implementation-audit-v1.1.md` |
| **RN28** | O item de orçamento deve ser originado de um serviço ou produto cadastrado no catálogo do usuário. | **HOMOLOGADO** | Itens do Orçamento | RF29, RF30 | `src/application/use-cases/orcamento/adicionar-item-orcamento.use-case.ts` | `AdicionarItemOrcamentoUseCase` validação de catálogo e titularidade | `tests/domain/item-orcamento.test.ts` (teste 9), `tests/orcamentos/orcamento-item.use-cases.test.ts` | `docs/relatorios/orcamentos-itens-implementation-audit-v1.1.md` |
| **RN29** | Ao ser incluído no orçamento, o item deve preservar um snapshot independente dos dados utilizados naquele orçamento. | **HOMOLOGADO** | Itens do Orçamento | RF32 | `src/domain/entities/item-orcamento.ts` | `ItemOrcamento` campos próprios copiados na criação | `tests/domain/item-orcamento.test.ts` (teste 5), `tests/orcamentos/orcamento-item.use-cases.test.ts` | `docs/relatorios/orcamentos-itens-implementation-audit-v1.1.md` |
| **RN30** | O snapshot do item deve preservar, no mínimo, descrição, unidade, quantidade, valor unitário e valor total. | **HOMOLOGADO** | Itens do Orçamento | RF33 | `src/domain/entities/item-orcamento.ts`, `supabase/migrations/20260916020500_modelo_fisico_v1_1.sql` | `descricao`, `unidade`, `quantidade`, `valor_unitario`, `valor_total` | `tests/domain/item-orcamento.test.ts` (testes 1, 5) | `docs/relatorios/orcamentos-itens-implementation-audit-v1.1.md` |
| **RN31** | A descrição e o valor unitário do item podem ser personalizados no orçamento sem alterar o cadastro original. | **HOMOLOGADO** | Itens do Orçamento | RF34 | `src/domain/entities/item-orcamento.ts`, `src/application/use-cases/orcamento/atualizar-item-orcamento.use-case.ts` | `ItemOrcamento.atualizarSnapshot()` | `tests/domain/item-orcamento.test.ts` (teste 5) | `docs/relatorios/orcamentos-itens-implementation-audit-v1.1.md` |
| **RN32** | A quantidade de produtos e de serviços que não utilizam medição de área deve ser informada manualmente. | **HOMOLOGADO** | Itens do Orçamento | RF35 | `src/domain/entities/item-orcamento.ts`, `app/(app)/orcamentos/editar.tsx` | `ItemOrcamento.atualizarQuantidadeManual()` | `tests/domain/item-orcamento.test.ts` (teste 6) | `docs/relatorios/orcamentos-itens-implementation-audit-v1.1.md` |
| **RN33** | Para serviços que utilizam medição de área, a quantidade comercial do item deve corresponder à soma das áreas associadas e ser expressa em m². | **HOMOLOGADO** | Itens do Orçamento / Áreas | RF36 | `src/domain/entities/item-orcamento.ts`, `src/application/use-cases/area/criar-area.use-case.ts` | `ItemOrcamento.recalcularQuantidadePelasAreas()`, `unidade = "m²"` | `tests/domain/item-orcamento.test.ts` (teste 3), `tests/areas/area.use-cases.test.ts` | `docs/relatorios/areas-use-cases-implementation-audit-v1.0.md` (GAP-AREA-07) |
| **RN34** | A quantidade calculada a partir das áreas não deve ser alterada manualmente. | **HOMOLOGADO** | Itens do Orçamento / Áreas | RF37 | `src/domain/entities/item-orcamento.ts`, `app/(app)/orcamentos/editar.tsx` | `ItemOrcamento.atualizarQuantidadeManual()` rejeita `usaMedicaoArea = true` | `tests/domain/item-orcamento.test.ts` (teste 7), `tests/orcamentos/orcamento-item.use-cases.test.ts` | `docs/relatorios/orcamentos-itens-implementation-audit-v1.1.md` |
| **RN35** | A remoção ou alteração de um item do orçamento não deve modificar o cadastro original do serviço ou produto. | **HOMOLOGADO** | Itens do Orçamento | RF31 | `src/application/use-cases/orcamento/remover-item-orcamento.use-case.ts` | `RemoverItemOrcamentoUseCase.execute()` | `tests/orcamentos/orcamento-item.use-cases.test.ts` | `docs/relatorios/orcamentos-itens-implementation-audit-v1.1.md` |
| **RN36** | A medição de área deve ser utilizada somente para serviços configurados para utilizar medição. | **HOMOLOGADO** | Medição e Áreas | RF39, RF49 | `src/application/use-cases/area/criar-area.use-case.ts`, `src/domain/entities/item-orcamento.ts` | `CriarAreaUseCase` validação de `item.usaMedicaoArea = true` | `tests/areas/area.use-cases.test.ts` (CriarAreaUseCase - teste 2) | `docs/relatorios/areas-use-cases-implementation-audit-v1.0.md` (GAP-AREA-07) |
| **RN37** | Uma área deve pertencer a um único item de orçamento de serviço. | **HOMOLOGADO** | Medição e Áreas | RF42 | `supabase/migrations/20260916020500_modelo_fisico_v1_1.sql`, `src/domain/entities/area.ts` | FK `item_orcamento_id` NOT NULL na tabela `public.area` | `tests/domain/area.test.ts`, `supabase/tests/05_itens_e_areas_rls.sql` | `docs/relatorios/areas-repository-implementation-audit-v1.0.md` (GAP-AREA-04) |
| **RN38** | Um item de serviço que utiliza medição pode possuir uma ou mais áreas. | **HOMOLOGADO** | Medição e Áreas | RF42, RF43 | `src/domain/entities/item-orcamento.ts`, `src/application/use-cases/area/criar-area.use-case.ts` | `ItemOrcamento.areas`, cardinalidade 1:N | `tests/areas/area.use-cases.test.ts` (Multi-Área no mesmo Item) | `docs/relatorios/areas-use-cases-implementation-audit-v1.0.md` (GAP-AREA-07) |
| **RN39** | As áreas de um mesmo item não precisam ser contíguas. | **HOMOLOGADO** | Medição e Áreas | RF43 | `src/domain/entities/item-orcamento.ts`, `src/application/use-cases/area/criar-area.use-case.ts` | Polígonos independentes somados na metragem | `tests/areas/area.use-cases.test.ts` (Multi-Área no mesmo Item) | `docs/relatorios/areas-use-cases-implementation-audit-v1.0.md` (GAP-AREA-07) |
| **RN40** | Cada área deve ser delimitada por um polígono definido manualmente pelo usuário no mapa. | **HOMOLOGADO** | Medição e Áreas | RF41 | `src/infrastructure/maps/map-provider.tsx`, `src/presentation/components/mapa/mapa-delimitacao.tsx` | Desenho de polígono interativo com $>= 3$ vértices | `tests/areas/area-map-drawing.test.ts` | `docs/relatorios/areas-map-drawing-implementation-reaudit-v1.0.md` (GAP-AREA-01) |
| **RN41** | A área deve ser calculada automaticamente a partir da geometria delimitada, utilizando m². | **HOMOLOGADO** | Medição e Áreas | RF44 | `src/infrastructure/services/geodesic-calculador-area.service.ts` | `GeodesicCalculadorAreaService.calcularArea()`, unidade m² | `tests/infrastructure/geodesic-calculador-area.service.test.ts` | `docs/relatorios/areas-calculador-area-implementation-audit-v1.0.md` (GAP-AREA-06) |
| **RN42** | O usuário pode editar a geometria e os dados complementares da área. | **HOMOLOGADO** | Medição e Áreas | RF45, RF46 | `src/application/use-cases/area/atualizar-area.use-case.ts`, `src/infrastructure/repositories/supabase-area.repository.ts` | `AtualizarAreaUseCase` | `tests/areas/area.use-cases.test.ts` (AtualizarAreaUseCase) | `docs/relatorios/areas-use-cases-implementation-audit-v1.0.md` (GAP-AREA-07) |
| **RN43** | Quando a geometria de uma área for alterada, a área calculada deve ser atualizada e os valores dependentes da medição devem ser recalculados. | **HOMOLOGADO** | Medição e Áreas | RF47 | `src/application/use-cases/area/atualizar-area.use-case.ts`, `src/domain/entities/item-orcamento.ts` | Recálculo em cascata: área -> item -> orçamento | `tests/areas/area.use-cases.test.ts` (AtualizarAreaUseCase - teste 2) | `docs/relatorios/areas-use-cases-implementation-audit-v1.0.md` (GAP-AREA-07) |
| **RN44** | Uma área pode ser removida enquanto o orçamento estiver em estado editável. | **HOMOLOGADO** | Medição e Áreas | RF48, RF64 | `src/application/use-cases/area/remover-area.use-case.ts` | `RemoverAreaUseCase` bloqueia remoção fora de RASCUNHO | `tests/areas/area.use-cases.test.ts` (RemoverAreaUseCase - teste 3) | `docs/relatorios/areas-use-cases-implementation-audit-v1.0.md` (GAP-AREA-07) |
| **RN45** | Um item de produto ou um serviço que não utilize medição não pode possuir áreas associadas. | **HOMOLOGADO** | Medição e Áreas | RF49 | `src/domain/entities/item-orcamento.ts`, `src/application/use-cases/area/criar-area.use-case.ts` | `ItemOrcamento.adicionarArea()` lança `RegraNegocioError` | `tests/domain/item-orcamento.test.ts` (teste 8), `tests/areas/area.use-cases.test.ts` | `docs/relatorios/areas-use-cases-implementation-audit-v1.0.md` (GAP-AREA-07) |
| **RN46** | Um serviço que exige medição pode permanecer sem área enquanto o orçamento estiver em RASCUNHO, desde que as áreas necessárias sejam definidas antes do envio. | **HOMOLOGADO** | Medição e Áreas | RF28, RF61 | `src/domain/entities/orcamento.ts` | `Orcamento.obterErrosValidacaoEnvio()`, salvamento livre em rascunho | `tests/domain/orcamento-validacao-envio.test.ts` (teste 3) | `docs/relatorios/orcamentos-itens-implementation-audit-v1.1.md` |
| **RN47** | O valor total de um item deve corresponder à quantidade multiplicada pelo valor unitário. | **HOMOLOGADO** | Valores e Descontos | RF38 | `src/domain/entities/item-orcamento.ts` | `valorTotal = arredondarMoeda(quantidade * valorUnitario)` | `tests/domain/item-orcamento.test.ts` (teste 2) | `docs/relatorios/orcamentos-itens-implementation-audit-v1.1.md` |
| **RN48** | O subtotal do orçamento deve corresponder à soma dos valores totais de seus itens. | **HOMOLOGADO** | Valores e Descontos | RF50 | `src/domain/entities/orcamento.ts` | `subtotal = arredondarMoeda(Σ item.valorTotal)` | `tests/domain/orcamento-calculos.test.ts` (teste 2) | `docs/relatorios/orcamentos-itens-implementation-audit-v1.1.md` |
| **RN49** | O desconto deve ser aplicado sobre o subtotal. | **HOMOLOGADO** | Valores e Descontos | RF51 | `src/domain/entities/orcamento.ts`, `src/domain/calculations/moeda.ts` | `calcularValorDesconto(subtotal, tipo, valor)` | `tests/domain/orcamento-calculos.test.ts` (testes 3, 4) | `docs/relatorios/orcamentos-itens-implementation-audit-v1.1.md` |
| **RN50** | O desconto pode ser definido como percentual ou valor fixo. | **HOMOLOGADO** | Valores e Descontos | RF52 | `src/domain/enums/tipo-desconto.ts` | `TipoDesconto.PERCENTUAL`, `TipoDesconto.FIXO` | `tests/domain/orcamento-calculos.test.ts` | `docs/relatorios/orcamentos-itens-implementation-audit-v1.1.md` |
| **RN51** | O desconto percentual deve estar entre 0% e 100%, inclusive. | **HOMOLOGADO** | Valores e Descontos | RF53 | `src/domain/entities/orcamento.ts`, `supabase/migrations/20260916020500_modelo_fisico_v1_1.sql` | Check constraint `orcamento_desconto_check` ($0 <= text{valor} <= 100$) | `tests/domain/orcamento-calculos.test.ts` (teste 3) | `docs/relatorios/orcamentos-itens-implementation-audit-v1.1.md` |
| **RN52** | O desconto de valor fixo deve estar entre zero e o subtotal, inclusive. | **HOMOLOGADO** | Valores e Descontos | RF53 | `src/domain/entities/orcamento.ts`, `supabase/migrations/20260916020500_modelo_fisico_v1_1.sql` | Check constraint `orcamento_desconto_check` ($0 < text{valor} <= text{subtotal}$) | `tests/domain/orcamento-calculos.test.ts` (teste 4) | `docs/relatorios/orcamentos-itens-implementation-audit-v1.1.md` |
| **RN53** | Quando não houver desconto, o valor de desconto deve ser zero. | **HOMOLOGADO** | Valores e Descontos | RF53 | `src/domain/entities/orcamento.ts`, `supabase/migrations/20260916020500_modelo_fisico_v1_1.sql` | `tipoDesconto = null` e `valorDesconto = 0.00` | `tests/domain/orcamento-calculos.test.ts` (teste 5) | `docs/relatorios/orcamentos-itens-implementation-audit-v1.1.md` |
| **RN54** | O total deve corresponder ao subtotal menos o valor do desconto e nunca pode ser negativo. | **HOMOLOGADO** | Valores e Descontos | RF54, RF55 | `src/domain/entities/orcamento.ts`, `src/domain/calculations/moeda.ts` | `total = subtotal - desconto` (mínimo 0.00) | `tests/domain/orcamento-calculos.test.ts` | `docs/relatorios/orcamentos-itens-implementation-audit-v1.1.md` |
| **RN55** | Os valores monetários devem ser tratados em reais (BRL) com duas casas decimais. | **HOMOLOGADO** | Valores e Descontos | RF54 | `src/domain/calculations/moeda.ts`, `supabase/migrations/20260916020500_modelo_fisico_v1_1.sql` | `arredondarMoeda()`, tipo SQL `NUMERIC(10,2)` / `NUMERIC(12,2)` | `tests/domain/orcamento-calculos.test.ts` | `docs/relatorios/orcamentos-itens-implementation-audit-v1.1.md` |
| **RN56** | Subtotal, desconto, total do orçamento e valor total dos itens devem ser armazenados e recalculados sempre que os dados que os determinam forem alterados enquanto o orçamento for editável. | **HOMOLOGADO** | Valores e Descontos | RF56 | `src/domain/entities/orcamento.ts`, `src/infrastructure/repositories/supabase-orcamento.repository.ts` | `Orcamento.recalcularValores()` disparado em todas as mutações de itens/áreas/descontos | `tests/domain/orcamento-calculos.test.ts` (teste 6) | `docs/relatorios/orcamentos-itens-implementation-audit-v1.1.md` |
| **RN57** | Um orçamento em RASCUNHO pode estar incompleto e pode ser salvo para posterior edição. | **HOMOLOGADO** | Salvamento e Envio | RF28 | `src/domain/entities/orcamento.ts`, `app/(app)/orcamentos/novo.tsx` | Salvar rascunho com dados incompletos | `tests/domain/orcamento-calculos.test.ts` (teste 1) | `docs/relatorios/orcamentos-itens-implementation-audit-v1.1.md` |
| **RN58** | Um orçamento somente pode passar de RASCUNHO para ENVIADO quando estiver válido para apresentação ao cliente. | **HOMOLOGADO** | Salvamento e Envio | RF61 | `src/domain/entities/orcamento.ts` | `Orcamento.validarParaEnvio()` | `tests/domain/orcamento-validacao-envio.test.ts` (teste 4) | `docs/relatorios/orcamentos-itens-implementation-audit-v1.1.md` |
| **RN59** | Para ser enviado, o orçamento deve possuir cliente, pelo menos um item válido, validade definida, valores consistentes e todas as medições necessárias concluídas. | **HOMOLOGADO** | Salvamento e Envio | RF61 | `src/domain/entities/orcamento.ts` | `Orcamento.obterErrosValidacaoEnvio()` (cliente, itens, validade, medições) | `tests/domain/orcamento-validacao-envio.test.ts` (testes 1, 2, 3, 4) | `docs/relatorios/orcamentos-itens-implementation-audit-v1.1.md` |
| **RN60** | Um orçamento em RASCUNHO que não atender às condições de envio deve permanecer editável e não pode ser enviado. | **HOMOLOGADO** | Salvamento e Envio | RF62 | `src/domain/errors/dominio-error.ts`, `app/(app)/orcamentos/[id].tsx` | `ValidacaoEnvioError`, bloqueio de envio com alerta | `tests/domain/orcamento-validacao-envio.test.ts`, `tests/orcamentos/orcamento.use-cases.test.ts` | `docs/relatorios/orcamentos-itens-implementation-audit-v1.1.md` |
| **RN61** | Os estados possíveis de um orçamento são: | **HOMOLOGADO** | Ciclo de Vida do Orçamento | RF63 | `src/domain/enums/status-orcamento.ts`, `supabase/migrations/20260916020500_modelo_fisico_v1_1.sql` | 8 status: `RASCUNHO`, `ENVIADO`, `EM_ANALISE`, `APROVADO`, `RECUSADO`, `EXPIRADO`, `CANCELADO`, `CONCLUIDO` | `tests/domain/orcamento-estados.test.ts` | `docs/relatorios/orcamentos-itens-implementation-audit-v1.1.md` |
| **RN62** | As mudanças de status devem obedecer às transições permitidas e não podem ocorrer arbitrariamente. | **HOMOLOGADO** | Ciclo de Vida do Orçamento | RF63, RF65 | `src/domain/entities/orcamento.ts`, `src/application/use-cases/orcamento/alterar-status-orcamento.use-case.ts` | `TransicaoInvalidaError` | `tests/domain/orcamento-estados.test.ts` (teste 5) | `docs/relatorios/orcamentos-itens-implementation-audit-v1.1.md` |
| **RN63** | São permitidas as seguintes transições: | **HOMOLOGADO** | Ciclo de Vida do Orçamento | RF64 | `src/domain/entities/orcamento.ts`, `src/application/use-cases/orcamento/alterar-status-orcamento.use-case.ts` | 10 transições homologadas de `estados.puml` | `tests/domain/orcamento-estados.test.ts` (testes 1, 2, 3) | `docs/relatorios/orcamentos-itens-implementation-audit-v1.1.md` |
| **RN64** | RASCUNHO é o único estado em que o orçamento permanece diretamente editável. | **HOMOLOGADO** | Ciclo de Vida do Orçamento | RF69 | `src/domain/entities/orcamento.ts` | `Orcamento.editavel` (`status === StatusOrcamento.RASCUNHO`) | `tests/domain/orcamento-calculos.test.ts` (teste 7) | `docs/relatorios/orcamentos-itens-implementation-audit-v1.1.md` |
| **RN65** | Orçamentos em ENVIADO, EM_ANALISE, APROVADO, RECUSADO, EXPIRADO, CANCELADO ou CONCLUIDO não devem ser editados diretamente. | **HOMOLOGADO** | Ciclo de Vida do Orçamento | RF69 | `src/domain/entities/orcamento.ts`, `app/(app)/orcamentos/[id].tsx` | `Orcamento.assegurarEditavel()`, botões ocultados na UI | `tests/domain/orcamento-calculos.test.ts` (teste 7), `tests/orcamentos/orcamento.use-cases.test.ts` | `docs/relatorios/orcamentos-itens-implementation-audit-v1.1.md` |
| **RN66** | O status APROVADO representa a aceitação da proposta pelo cliente. | **HOMOLOGADO** | Ciclo de Vida do Orçamento | RF66 | `src/domain/entities/orcamento.ts` | `Orcamento.aprovar()` | `tests/domain/orcamento-estados.test.ts` (teste 1) | `docs/relatorios/orcamentos-itens-implementation-audit-v1.1.md` |
| **RN67** | A aprovação ou recusa da proposta deve ser registrada pelo jardineiro no escopo atual do sistema. | **HOMOLOGADO** | Ciclo de Vida do Orçamento | RF66 | `app/(app)/orcamentos/[id].tsx`, `src/application/use-cases/orcamento/alterar-status-orcamento.use-case.ts` | Botões "Aprovar Orçamento" e "Recusar Orçamento" | `tests/domain/orcamento-estados.test.ts`, `tests/orcamentos/orcamento.use-cases.test.ts` | `docs/relatorios/orcamentos-itens-implementation-audit-v1.1.md` |
| **RN68** | O status CONCLUIDO representa a conclusão da execução relacionada ao orçamento. | **HOMOLOGADO** | Ciclo de Vida do Orçamento | RF64 | `src/domain/entities/orcamento.ts`, `app/(app)/orcamentos/[id].tsx` | `Orcamento.concluir()`, botão "Concluir Orçamento" | `tests/domain/orcamento-estados.test.ts` (teste 1) | `docs/relatorios/orcamentos-itens-implementation-audit-v1.1.md` |
| **RN69** | Um orçamento ENVIADO ou EM_ANALISE deve ser considerado EXPIRADO quando sua validade for ultrapassada. | **PARCIALMENTE IMPLEMENTADO** | Ciclo de Vida do Orçamento | RF67 | `src/domain/entities/orcamento.ts` | `Orcamento.verificarExpiracao(dataReferencia: Date)` | `tests/domain/orcamento-estados.test.ts` (teste 4) | `docs/relatorios/orcamentos-itens-implementation-audit-v1.1.md` |
| **RN70** | Um orçamento em RASCUNHO não deve ser marcado automaticamente como EXPIRADO. | **HOMOLOGADO** | Ciclo de Vida do Orçamento | RF68 | `src/domain/entities/orcamento.ts` | `Orcamento.verificarExpiracao()` protege RASCUNHO de expiração | `tests/domain/orcamento-estados.test.ts` (teste 4) | `docs/relatorios/orcamentos-itens-implementation-audit-v1.1.md` |
| **RN71** | Orçamentos em APROVADO, RECUSADO, EXPIRADO, CANCELADO ou CONCLUIDO não podem ser reabertos. | **HOMOLOGADO** | Ciclo de Vida do Orçamento | RF70 | `src/domain/entities/orcamento.ts`, `src/application/use-cases/orcamento/alterar-status-orcamento.use-case.ts` | Bloqueio de transição a partir de estados finais | `tests/domain/orcamento-estados.test.ts` (teste 5) | `docs/relatorios/orcamentos-itens-implementation-audit-v1.1.md` |
| **RN72** | Um orçamento existente pode ser duplicado para criação de uma nova proposta. | **HOMOLOGADO** | Duplicação e Histórico | RF75 | `src/application/use-cases/orcamento/duplicar-orcamento.use-case.ts`, `app/(app)/orcamentos/[id].tsx` | `DuplicarOrcamentoUseCase`, botão "Duplicar Orçamento" | `tests/orcamentos/orcamento.use-cases.test.ts` | `docs/relatorios/orcamentos-itens-implementation-audit-v1.1.md` |
| **RN73** | A duplicação deve criar um novo orçamento com identificador e número próprios e status inicial RASCUNHO. | **HOMOLOGADO** | Duplicação e Histórico | RF76 | `src/domain/entities/orcamento.ts`, `src/application/use-cases/orcamento/duplicar-orcamento.use-case.ts` | `Orcamento.duplicar()`, novo ID, novo número e status RASCUNHO | `tests/domain/orcamento-duplicacao.test.ts` (teste 1) | `docs/relatorios/orcamentos-itens-implementation-audit-v1.1.md` |
| **RN74** | O orçamento duplicado deve ser independente do original. | **HOMOLOGADO** | Duplicação e Histórico | RF77 | `src/domain/entities/orcamento.ts` | Clonagem profunda com novas instâncias de `ItemOrcamento` e `Area` | `tests/domain/orcamento-duplicacao.test.ts` | `docs/relatorios/orcamentos-itens-implementation-audit-v1.1.md` |
| **RN75** | Alterações realizadas no orçamento duplicado não devem modificar o orçamento original. | **HOMOLOGADO** | Duplicação e Histórico | RF78 | `src/domain/entities/orcamento.ts`, `src/application/use-cases/orcamento/duplicar-orcamento.use-case.ts` | Desacoplamento em memória e persistência independente no PostgREST | `tests/domain/orcamento-duplicacao.test.ts` | `docs/relatorios/orcamentos-itens-implementation-audit-v1.1.md` |
| **RN76** | Orçamentos aprovados, recusados, expirados, cancelados e concluídos devem permanecer armazenados para fins de histórico. | **HOMOLOGADO** | Duplicação e Histórico | RF74 | `supabase/migrations/20260921000000_auth_rls.sql`, `src/application/use-cases/orcamento/excluir-orcamento.use-case.ts` | RLS no DELETE restrita a RASCUNHO | `tests/orcamentos/orcamento.use-cases.test.ts` (ExcluirOrcamentoUseCase) | `docs/relatorios/orcamentos-itens-implementation-audit-v1.1.md` |
| **RN77** | A duplicação deve ser utilizada para criar uma nova proposta a partir de um orçamento existente sem reabrir ou modificar seu histórico. | **HOMOLOGADO** | Duplicação e Histórico | RF75, RF77 | `src/application/use-cases/orcamento/duplicar-orcamento.use-case.ts` | `DuplicarOrcamentoUseCase` | `tests/domain/orcamento-duplicacao.test.ts` | `docs/relatorios/orcamentos-itens-implementation-audit-v1.1.md` |
| **RN78** | O PDF gerado a partir de um orçamento deve representar os dados daquele orçamento no momento da geração. | **NÃO ENCONTRADO / NÃO IMPLEMENTADO** | PDF | RF79 | Inexistente no código | Módulo PDF inexistente | Nenhum teste existente | Inexistente |
| **RN79** | O PDF deve apresentar, quando aplicável, identificação do profissional, cliente, orçamento, data, validade, serviços, produtos, áreas, quantidades, valores, desconto, total, observações e condições de pagamento. | **NÃO ENCONTRADO / NÃO IMPLEMENTADO** | PDF | RF80 | Inexistente no código | Template visual do PDF ausente | Nenhum teste existente | Inexistente |
| **RN80** | Os valores e informações apresentados no PDF devem corresponder aos dados do orçamento utilizado para sua geração. | **NÃO ENCONTRADO / NÃO IMPLEMENTADO** | PDF | RF81 | Inexistente no código | Módulo PDF inexistente | Nenhum teste existente | Inexistente |
| **RN81** | O PDF deve poder ser compartilhado por meio dos mecanismos disponíveis no dispositivo. | **NÃO ENCONTRADO / NÃO IMPLEMENTADO** | PDF | RF82 | Inexistente no código | Integração com `expo-sharing` ou Intents ausente | Nenhum teste existente | Inexistente |

---

## 9. Matriz RNF01–RNF35

A matriz integral abaixo audita todos os 35 Requisitos Não-Funcionais individualmente, linha por linha:

| ID | Descrição Resumida | Situação | Categoria | RF / RN Relacionados | Mecanismo de Evidência / Arquivos | Teste(s) de Verificação | Relatório Homologação |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **RNF01** | A interface deve permitir que o usuário execute as principais operações do sistema de forma clara e compreensível, especialmente cadastro, criação de orçamento, inclusão de itens, medição de áreas e geração de PDF. | **PARCIALMENTE IMPLEMENTADO** | Usabilidade | RF04, RF25, RF29, RF30, RF40, RF79, RN04, RN25, RN40, RN78 | Telas operacionais fluidas para cadastros, criação de orçamento, itens e medição de área no mapa; ausência da geração de PDF. | Validações empíricas no emulador Android Pixel_10 arquivadas em `docs/evidencias/` | `clientes-implementation-homologation-v1.0.md`, `catalogo-servicos-produtos-implementation-homologation-v1.0.md`, `orcamentos-itens-implementation-audit-v1.1.md`, `areas-google-maps-api-key-implementation-audit-v1.0.md` |
| **RNF02** | A interface deve manter padrões visuais e comportamentais consistentes entre as diferentes telas e funcionalidades. | **HOMOLOGADO** | Usabilidade | Todos os RFs e RNs de apresentação | Padrão visual consistente com design system unificado (cores semânticas, tipografia padrão, modais, cards e feedback consistente). | Validação empírica no emulador Pixel_10 em todas as rotas protegidas | Homologado nos pareceres de Clientes, Catálogo, Orçamentos e Áreas |
| **RNF03** | O sistema deve fornecer feedback adequado após operações relevantes, como salvamento, alteração de dados, cálculo de área, cálculo do orçamento, geração de PDF e compartilhamento. | **PARCIALMENTE IMPLEMENTADO** | Usabilidade | RF04, RF07, RF38, RF44, RF50, RF54, RF79, RF82, RN41, RN48, RN56, RN81 | Feedback sonoro/visual via `Alert.alert`, `ActivityIndicator` e atualização reativa em tempo real de cálculos; ausente para PDF e compartilhamento. | Testes de componentes e validação empírica no emulador Android | `orcamentos-itens-implementation-audit-v1.1.md`, `areas-map-drawing-implementation-reaudit-v1.0.md` |
| **RNF04** | As mensagens de erro e validação devem ser claras, indicando o problema identificado e, quando aplicável, orientando o usuário sobre como corrigi-lo. | **HOMOLOGADO** | Usabilidade | RF61, RF62, RF65, RN51, RN52, RN59, RN60 | Erros tipados com mensagens explicativas (`ValidacaoEnvioError`, `RegraNegocioError`, `TransicaoInvalidaError`) apresentados ao usuário. | `tests/domain/orcamento-validacao-envio.test.ts`, `tests/domain/orcamento-estados.test.ts` | `orcamentos-itens-implementation-audit-v1.1.md` |
| **RNF05** | A interação com o mapa deve apresentar de forma clara as áreas delimitadas e permitir sua edição de maneira compreensível ao usuário. | **HOMOLOGADO** | Usabilidade | RF40, RF41, RF44, RF45, RN40, RN41, RN42 | Visualização nítida de polígonos sobre satélite, marcadores de vértices numerados, display de metragem em tempo real e botões desfazer/limpar/concluir. | `tests/areas/area-map-drawing.test.ts` (10 testes), evidências fotográficas em `docs/evidencias/` | `areas-map-drawing-implementation-reaudit-v1.0.md` (GAP-AREA-01), `areas-google-maps-api-key-implementation-audit-v1.0.md` (GAP-AREA-02) |
| **RNF06** | As credenciais de acesso devem ser protegidas contra exposição, armazenamento ou utilização inadequada. | **HOMOLOGADO** | Segurança | RF01, RF02, RN01 | Supabase Auth, armazenamento com criptografia AES via `LargeSecureStore` e CSPRNG nativo, zero secrets no versionamento Git. | `tests/auth/auth.service.test.ts` (testes 11, 17), varreduras de repositório contra chaves `AIza*` e JWTs | `auth-rls-implementation-homologation-v1.0.md`, `areas-google-maps-api-key-implementation-audit-v1.0.md` |
| **RNF07** | O sistema deve implementar mecanismos de controle de acesso capazes de impedir que um usuário consulte ou modifique dados pertencentes a outro usuário. | **HOMOLOGADO** | Segurança | RF03, RN02 | 31 políticas de Row Level Security (RLS) cobrindo SELECT, INSERT, UPDATE e DELETE em todas as 8 tabelas de negócio. | 170 testes pgTAP (`supabase/tests/`), `tests/clientes/cliente.use-cases.test.ts` (Seção 16), `tests/orcamentos/orcamento-multi-tenant.test.ts` | `auth-rls-strategy-v1.6.md`, `auth-rls-implementation-homologation-v1.0.md` |
| **RNF08** | Os dados transmitidos entre o aplicativo e serviços externos devem utilizar mecanismos adequados de proteção contra acesso ou alteração não autorizada. | **HOMOLOGADO** | Segurança | RF01, RF03, RN01, RN02 | Comunicação criptografada via HTTPS (TLS 1.3) com Supabase e Google Maps Platform, e WSS para Realtime. | Inspeção de rede e configuração de endpoints HTTPS na SDK do Supabase e Google Maps SDK | `auth-rls-strategy-v1.6.md`, `areas-google-maps-api-key-implementation-audit-v1.0.md` |
| **RNF09** | Os dados pessoais e comerciais armazenados pelo sistema devem ser protegidos contra acesso não autorizado. | **HOMOLOGADO** | Segurança | RF03, RN01, RN02 | Restrições de acesso direto a tabelas para o papel `anon`, permissões estritas concedidas somente a `authenticated` mediadas por RLS. | `supabase/tests/07_anon_access.sql` (testes pgTAP de bloqueio de anônimos) | `auth-rls-implementation-homologation-v1.0.md` |
| **RNF10** | O sistema deve tratar os dados pessoais dos usuários e clientes de acordo com os princípios de proteção e privacidade aplicáveis ao projeto. | **HOMOLOGADO** | Privacidade | RF04, RF07, RN03, RN04 | Conformidade com a LGPD: dados pertencem exclusivamente ao usuário que os cadastrou; ausência de dados sensíveis supérfluos; tabela `usuario` não duplica email de autenticação. | `tests/domain/usuario-cliente.test.ts`, inspeção de schema de dados | `auth-rls-implementation-homologation-v1.0.md`, `clientes-implementation-homologation-v1.0.md` |
| **RNF11** | O sistema deve coletar e armazenar somente os dados necessários para o funcionamento das funcionalidades previstas no escopo. | **HOMOLOGADO** | Privacidade | RF04, RF14, RF20, RF25, RN04, RN12, RN18 | Princípio da minimização de dados: apenas 8 entidades com colunas estritamente necessárias ao cálculo e formalização do orçamento. | Auditoria de colunas contra Modelo Físico v1.1 (zero colunas extras detectadas) | `orcamentos-itens-implementation-audit-v1.1.md` (Seção 3) |
| **RNF12** | As operações comuns do sistema, como cadastro, consulta, edição e salvamento, devem apresentar tempo de resposta adequado à utilização interativa do aplicativo. | **HOMOLOGADO** | Desempenho | RF05, RF15, RF21, RF71 | Índices dedicados em `usuario_id`, `cliente_id`, `orcamento_id`, `status`; consultas PostgREST retornando em < 100ms. | `docs/relatorios/auth-rls-performance-v1.0.md` | `auth-rls-implementation-homologation-v1.0.md` |
| **RNF13** | Os cálculos realizados pelo sistema, incluindo cálculo de áreas e valores de orçamento, devem ser executados sem atrasos perceptíveis em condições normais de utilização. | **HOMOLOGADO** | Desempenho | RF44, RF50, RF54, RN41, RN48, RN54 | Cálculo geodésico puro em TypeScript executando em < 1ms por polígono no motor Hermes; recálculo financeiro instantâneo em memória. | `tests/infrastructure/geodesic-calculador-area.service.test.ts` (duração total: < 30ms para 19 testes) | `areas-calculador-area-implementation-audit-v1.0.md` (GAP-AREA-06) |
| **RNF14** | A geração do PDF deve ocorrer em tempo adequado ao uso do aplicativo, sem causar bloqueios prolongados da interface. | **NÃO ENCONTRADO / NÃO IMPLEMENTADO** | Desempenho | RF79, RN78 | Módulo de PDF inexistente | Nenhum teste existente | Inexistente |
| **RNF15** | Durante operações dependentes de serviços externos, como carregamento do mapa e geocodificação, o sistema deve informar adequadamente o estado da operação e tratar situações de demora ou falha. | **PARCIALMENTE IMPLEMENTADO** | Desempenho / Integrações | RF10, RF40, RN06, RN09 | `MapErrorBoundary` para capturar falhas de carregamento e `ActivityIndicator` durante transições no mapa; geocodificação inexistente. | `tests/areas/area-map-drawing.test.ts` | `areas-map-drawing-implementation-reaudit-v1.0.md` (GAP-AREA-01) |
| **RNF16** | O sistema deve preservar a integridade dos dados e impedir que operações válidas resultem em relacionamentos ou estados inconsistentes. | **HOMOLOGADO** | Confiabilidade e Integridade | RF25, RF29, RF30, RF42, RN21, RN27, RN37, RN62 | Foreign Keys com integridade referencial (`ON DELETE RESTRICT` em catálogo/cliente, `CASCADE` em itens/áreas), check constraints de status, desconto e tipos. | 170 testes pgTAP aprovados com 100% de sucesso | `orcamentos-itens-implementation-audit-v1.1.md`, `areas-repository-implementation-audit-v1.0.md` |
| **RNF17** | Os valores monetários devem ser calculados e armazenados com precisão suficiente para evitar divergências decorrentes de arredondamentos inadequados. | **HOMOLOGADO** | Confiabilidade e Integridade | RF50, RF54, RN47, RN55 | Função pura `arredondarMoeda(valor)` com `Number.EPSILON` para neutralizar erros de ponto flutuante IEEE-754; tipos SQL `NUMERIC(10,2)` e `NUMERIC(12,2)`. | `tests/domain/orcamento-calculos.test.ts`, `tests/domain/item-orcamento.test.ts` | `orcamentos-itens-implementation-audit-v1.1.md` |
| **RNF18** | Os dados históricos dos orçamentos, incluindo os dados dos itens e seus valores, devem permanecer consistentes mesmo após alterações posteriores nos cadastros de serviços e produtos. | **HOMOLOGADO** | Confiabilidade e Integridade | RF18, RF24, RF32, RN15, RN20, RN29, RN30 | Snapshot autônomo dos dados do serviço/produto gravado em `public.item_orcamento`. | `tests/orcamentos/orcamento-item.use-cases.test.ts` (Teste Obrigatório de Snapshot Histórico) | `orcamentos-itens-implementation-audit-v1.1.md` |
| **RNF19** | Operações que alterem dados relacionados entre áreas, quantidades, valores dos itens e valores do orçamento devem manter a consistência entre essas informações. | **HOMOLOGADO** | Confiabilidade e Integridade | RF36, RF47, RF50, RF56, RN33, RN43, RN48, RN56 | Cadeia de recálculo determinística e sincronização imediata no PostgREST. | `tests/areas/area.use-cases.test.ts` (testes de recálculo integrado) | `areas-use-cases-implementation-audit-v1.0.md` (GAP-AREA-07) |
| **RNF20** | Falhas durante operações de gravação ou atualização não devem deixar o sistema em estado parcialmente inconsistente. | **HOMOLOGADO** | Confiabilidade e Integridade | RF25, RF42, RN21, RN37 | Operações atômicas estruturadas no PostgREST, integridade transacional garantida pelo PostgreSQL. | `tests/areas/area.use-cases.test.ts`, `tests/orcamentos/orcamento.use-cases.test.ts` | `orcamentos-itens-implementation-audit-v1.1.md`, `areas-repository-implementation-audit-v1.0.md` |
| **RNF21** | A indisponibilidade temporária de um serviço externo não deve comprometer a integridade dos dados já armazenados no aplicativo. | **HOMOLOGADO** | Disponibilidade e Tolerância a Falhas | RF40, RF73, RN40 | `MapErrorBoundary` encapsula o `MapView`; falhas na renderização do Google Maps não impedem navegação nem corrompem dados salvos. | Inspeção do ErrorBoundary e testes unitários de fallback | `areas-map-drawing-implementation-reaudit-v1.0.md` (GAP-AREA-01) |
| **RNF22** | Falhas ou indisponibilidade de serviços externos, como mapas ou geocodificação, devem ser tratadas de forma controlada, informando o usuário e evitando perda dos dados já persistidos. | **PARCIALMENTE IMPLEMENTADO** | Disponibilidade e Tolerância a Falhas | RF10, RF40, RN06, RN09 | Mensagens amigáveis em caso de falha de carregamento do mapa; geocodificação inexistente. | Inspeção de código e testes do MapErrorBoundary | `areas-map-drawing-implementation-reaudit-v1.0.md` (GAP-AREA-01) |
| **RNF23** | O sistema deve ser desenvolvido para execução em dispositivos Android compatíveis com a versão mínima definida para o projeto. | **HOMOLOGADO** | Compatibilidade | Todos os requisitos funcionais | Compilação nativa Android (`com.jardinagem.app`) com target API 37 sob motor JavaScript Hermes. | Validação em AVD `Pixel_10` (Android 17 / API 37) com evidências fotográficas em `docs/evidencias/` | `orcamentos-itens-implementation-audit-v1.1.md`, `areas-google-maps-api-key-implementation-audit-v1.0.md` (GAP-AREA-02) |
| **RNF24** | A interface deve se adaptar adequadamente aos diferentes tamanhos e resoluções de tela suportados pelo aplicativo. | **HOMOLOGADO** | Compatibilidade | Todos os requisitos funcionais | Layouts responsivos baseados em Flexbox, `ScrollView`, `SafeAreaView` e `KeyboardAvoidingView`. | Validação em diferentes resoluções e orientações no emulador Pixel_10 | Homologado nos pareceres de Clientes, Catálogo, Orçamentos e Áreas |
| **RNF25** | O código deve ser organizado de forma modular, com responsabilidades bem definidas entre as diferentes camadas e componentes da aplicação. | **HOMOLOGADO** | Manutenibilidade e Arquitetura | Todos os requisitos funcionais | Arquitetura canônica estrita em 4 camadas conforme Arquitetura Técnica v1.1. | `npm run typecheck`, auditorias de acoplamento | Homologado em todos os relatórios de auditoria e homologação vigentes |
| **RNF26** | A arquitetura deve permitir a alteração ou substituição de componentes externos, como o provedor de mapas, sem exigir alterações extensas nas regras de negócio. | **HOMOLOGADO** | Manutenibilidade e Arquitetura | RF40, RF41, RF44 | Contratos e abstrações isolam detalhes concretos de provedores externos (ex: `MapProvider`, `CalculadorAreaService`). | Testes unitários com mocks de repositório e serviços | `docs/planejamento/areas-mapas-medicao-homologacao-v1.0.md` (Conformidade 4.11 e 4.13) |
| **RNF27** | A estrutura do sistema deve facilitar manutenção, testes, correção de defeitos e evolução das funcionalidades existentes. | **HOMOLOGADO** | Manutenibilidade e Arquitetura | Todos os requisitos funcionais | Suíte automatizada com 247 testes em TypeScript e 170 testes pgTAP no PostgreSQL, executando em pipeline limpo. | `npm test`, `npm run test:auth`, `npm run test:clientes`, `npm run test:catalogo`, `npm run test:orcamentos`, `npm run test:areas`, `npx supabase test db` | `areas-google-maps-api-key-implementation-audit-v1.0.md` (Seção 12) |
| **RNF28** | A arquitetura deve permitir a incorporação futura de novas funcionalidades sem exigir uma reformulação completa do núcleo existente da aplicação. | **HOMOLOGADO** | Manutenibilidade e Arquitetura | Todos os requisitos funcionais | Design baseado em Casos de Uso atômicos e Fachadas da Aplicação (`Service`), permitindo adição incremental de novos use cases. | Criação incremental e isolada dos 5 use cases de área sem quebrar use cases anteriores | `areas-use-cases-implementation-audit-v1.0.md` (GAP-AREA-07) |
| **RNF29** | O cálculo da área deve apresentar resultados consistentes para uma mesma geometria submetida nas mesmas condições de processamento. | **HOMOLOGADO** | Medição e Mapas | RF44, RN41 | Algoritmo determinístico de Chamberlain & Duquette implementado com constantes matemáticas puras sobre elipsoide WGS84. | `tests/infrastructure/geodesic-calculador-area.service.test.ts` (testes de determinismo e invariância sob translação e rotação) | `areas-calculador-area-implementation-audit-v1.0.md` (GAP-AREA-06) |
| **RNF30** | A precisão da medição deve ser compatível com a finalidade de elaboração de orçamentos de jardinagem, sem estabelecer previamente uma margem numérica de precisão que dependa da tecnologia e das condições de utilização. | **HOMOLOGADO** | Medição e Mapas | RF44, RN41 | Precisão compatível com orçamentos de jardinagem e paisagismo (divergência < 0.1% em relação ao cálculo geodésico do PostGIS). | `tests/infrastructure/geodesic-calculador-area.service.test.ts` | `areas-calculador-area-implementation-audit-v1.0.md` (GAP-AREA-06) |
| **RNF31** | O PDF gerado deve apresentar conteúdo legível, organizado e adequado para compartilhamento com o cliente. | **NÃO ENCONTRADO / NÃO IMPLEMENTADO** | PDF | RF79, RF80, RN78, RN79 | Módulo PDF inexistente | Nenhum teste existente | Inexistente |
| **RNF32** | O conteúdo e os valores apresentados no PDF devem permanecer consistentes com os dados do orçamento utilizado para sua geração. | **NÃO ENCONTRADO / NÃO IMPLEMENTADO** | PDF | RF81, RN80 | Módulo PDF inexistente | Nenhum teste existente | Inexistente |
| **RNF33** | O PDF deve apresentar identificação clara do orçamento, permitindo distingui-lo de outros documentos. | **NÃO ENCONTRADO / NÃO IMPLEMENTADO** | PDF | RF80, RN79 | Módulo PDF inexistente | Nenhum teste existente | Inexistente |
| **RNF34** | Os dados necessários para a manutenção do histórico do sistema devem permanecer armazenados de forma persistente após o encerramento da aplicação. | **HOMOLOGADO** | Persistência | Todos os requisitos funcionais | Armazenamento persistente durável em banco relacional PostgreSQL com extensão PostGIS no Supabase. | Testes de persistência e integridade após reinício do cliente e banco | `migration-local-validation-v1.1.md`, `auth-rls-implementation-homologation-v1.0.md` |
| **RNF35** | Os mecanismos de persistência devem preservar as relações e restrições necessárias para manter a integridade dos dados armazenados. | **HOMOLOGADO** | Persistência | Todos os requisitos funcionais | Constraints de integridade relacional, checks de validação, chaves únicas e índices GiST no PostGIS. | 170 testes pgTAP cobrindo todas as constraints e relacionamentos | `migration-local-validation-v1.1.md`, `orcamentos-itens-implementation-audit-v1.1.md` |

---

## 10. Rastreabilidade RF ↔ RN

A análise de rastreabilidade bidirecional entre Requisitos Funcionais e Regras de Negócio revela o grau de amarração entre os casos de uso e as restrições formais de domínio:

### 10.1. Mapeamento de Cruzamento Direto

| Requisito Funcional (RF) | Regra(s) de Negócio Relacionada(s) (RN) | Situação da Regra | Nível de Cobertura de Domínio |
| :--- | :--- | :--- | :--- |
| **RF01** (O sistema deve permitir que o usuário realize...) | RN01 | HOMOLOGADO | Completa e Testada |
| **RF02** (O sistema deve permitir que o usuário encerre...) | *Sem RN associada direta (Operação CRUD/Navegação)* | N/A | Operacional / Interface |
| **RF03** (O sistema deve restringir o acesso aos dados ...) | RN01, RN02 | HOMOLOGADO | Completa e Testada |
| **RF04** (O sistema deve permitir cadastrar clientes in...) | RN03, RN04, RN05 | HOMOLOGADO | Completa e Testada |
| **RF05** (O sistema deve permitir consultar os clientes...) | *Sem RN associada direta (Operação CRUD/Navegação)* | N/A | Operacional / Interface |
| **RF06** (O sistema deve permitir pesquisar clientes po...) | *Sem RN associada direta (Operação CRUD/Navegação)* | N/A | Operacional / Interface |
| **RF07** (O sistema deve permitir editar os dados de um...) | *Sem RN associada direta (Operação CRUD/Navegação)* | N/A | Operacional / Interface |
| **RF08** (O sistema deve permitir desativar um cliente,...) | RN10 | HOMOLOGADO | Completa e Testada |
| **RF09** (O sistema deve permitir cadastrar, editar e c...) | RN05, RN06, RN08 | HOMOLOGADO, PARCIALMENTE IMPLEMENTADO | Parcial |
| **RF10** (O sistema deve permitir utilizar os dados do ...) | RN06 | PARCIALMENTE IMPLEMENTADO | Parcial |
| **RF11** (O sistema deve permitir utilizar a localizaçã...) | RN07 | PARCIALMENTE IMPLEMENTADO | Parcial |
| **RF12** (Quando não houver localização geográfica disp...) | RN09 | PARCIALMENTE IMPLEMENTADO | Parcial |
| **RF13** (O sistema deve permitir cadastrar serviços pe...) | RN11 | HOMOLOGADO | Completa e Testada |
| **RF14** (O sistema deve permitir informar, para cada s...) | RN12, RN13, RN16 | HOMOLOGADO | Completa e Testada |
| **RF15** (O sistema deve permitir consultar os serviços...) | *Sem RN associada direta (Operação CRUD/Navegação)* | N/A | Operacional / Interface |
| **RF16** (O sistema deve permitir editar os dados de um...) | *Sem RN associada direta (Operação CRUD/Navegação)* | N/A | Operacional / Interface |
| **RF17** (O sistema deve permitir desativar um serviço....) | RN14 | HOMOLOGADO | Completa e Testada |
| **RF18** (O sistema não deve permitir que a alteração o...) | RN14, RN15 | HOMOLOGADO | Completa e Testada |
| **RF19** (O sistema deve permitir cadastrar produtos pe...) | RN17 | HOMOLOGADO | Completa e Testada |
| **RF20** (O sistema deve permitir informar, para cada p...) | RN18 | HOMOLOGADO | Completa e Testada |
| **RF21** (O sistema deve permitir consultar os produtos...) | *Sem RN associada direta (Operação CRUD/Navegação)* | N/A | Operacional / Interface |
| **RF22** (O sistema deve permitir editar os dados de um...) | *Sem RN associada direta (Operação CRUD/Navegação)* | N/A | Operacional / Interface |
| **RF23** (O sistema deve permitir desativar um produto....) | RN19 | HOMOLOGADO | Completa e Testada |
| **RF24** (O sistema não deve permitir que a alteração o...) | RN19, RN20 | HOMOLOGADO | Completa e Testada |
| **RF25** (O sistema deve permitir criar um orçamento as...) | RN21 | HOMOLOGADO | Completa e Testada |
| **RF26** (O sistema deve atribuir ao orçamento um ident...) | RN22 | HOMOLOGADO | Completa e Testada |
| **RF27** (O sistema deve criar todo novo orçamento com ...) | RN24 | HOMOLOGADO | Completa e Testada |
| **RF28** (O sistema deve permitir salvar um orçamento e...) | RN23, RN46, RN57 | HOMOLOGADO | Completa e Testada |
| **RF29** (O sistema deve permitir adicionar ao orçament...) | RN25, RN28 | HOMOLOGADO | Completa e Testada |
| **RF30** (O sistema deve permitir adicionar ao orçament...) | RN25, RN28 | HOMOLOGADO | Completa e Testada |
| **RF31** (O sistema deve permitir remover itens de um o...) | RN35 | HOMOLOGADO | Completa e Testada |
| **RF32** (Ao adicionar um serviço ou produto ao orçamen...) | RN15, RN20, RN27, RN29 | HOMOLOGADO | Completa e Testada |
| **RF33** (O sistema deve registrar no ItemOrcamento des...) | RN30 | HOMOLOGADO | Completa e Testada |
| **RF34** (O sistema deve permitir editar, no orçamento,...) | RN31 | HOMOLOGADO | Completa e Testada |
| **RF35** (O sistema deve permitir informar a quantidade...) | RN32 | HOMOLOGADO | Completa e Testada |
| **RF36** (Para serviços que utilizam medição de área e ...) | RN16, RN33 | HOMOLOGADO | Completa e Testada |
| **RF37** (O sistema deve impedir a alteração manual da ...) | RN34 | HOMOLOGADO | Completa e Testada |
| **RF38** (O sistema deve recalcular o valor total do it...) | RN47 | HOMOLOGADO | Completa e Testada |
| **RF39** (O sistema deve identificar, a partir do servi...) | RN13, RN36 | HOMOLOGADO | Completa e Testada |
| **RF40** (Quando o serviço exigir medição, o sistema de...) | *Sem RN associada direta (Operação CRUD/Navegação)* | N/A | Operacional / Interface |
| **RF41** (O sistema deve permitir delimitar uma área po...) | RN08, RN40 | HOMOLOGADO | Completa e Testada |
| **RF42** (O sistema deve permitir associar uma ou mais ...) | RN37, RN38 | HOMOLOGADO | Completa e Testada |
| **RF43** (O sistema deve permitir que um mesmo item de ...) | RN38, RN39 | HOMOLOGADO | Completa e Testada |
| **RF44** (O sistema deve calcular automaticamente a áre...) | RN41 | HOMOLOGADO | Completa e Testada |
| **RF45** (O sistema deve permitir editar a geometria de...) | RN42 | HOMOLOGADO | Completa e Testada |
| **RF46** (O sistema deve permitir editar os dados compl...) | RN42 | HOMOLOGADO | Completa e Testada |
| **RF47** (Após a alteração da geometria de uma área, o ...) | RN43 | HOMOLOGADO | Completa e Testada |
| **RF48** (O sistema deve permitir remover uma área de u...) | RN44 | HOMOLOGADO | Completa e Testada |
| **RF49** (O sistema deve impedir a associação de áreas ...) | RN36, RN45 | HOMOLOGADO | Completa e Testada |
| **RF50** (O sistema deve calcular o subtotal do orçamen...) | RN48 | HOMOLOGADO | Completa e Testada |
| **RF51** (O sistema deve permitir aplicar desconto sobr...) | RN49 | HOMOLOGADO | Completa e Testada |
| **RF52** (O sistema deve permitir escolher entre descon...) | RN50 | HOMOLOGADO | Completa e Testada |
| **RF53** (O sistema deve validar o desconto informado d...) | RN51, RN52, RN53 | HOMOLOGADO | Completa e Testada |
| **RF54** (O sistema deve calcular o valor do desconto e...) | RN54, RN55 | HOMOLOGADO | Completa e Testada |
| **RF55** (O sistema deve impedir que o total do orçamen...) | RN54 | HOMOLOGADO | Completa e Testada |
| **RF56** (O sistema deve armazenar subtotal, valor do d...) | RN56 | HOMOLOGADO | Completa e Testada |
| **RF57** (O sistema deve permitir informar a data de va...) | RN26 | HOMOLOGADO | Completa e Testada |
| **RF58** (O sistema deve permitir adicionar observações...) | RN26 | HOMOLOGADO | Completa e Testada |
| **RF59** (O sistema deve permitir informar as condições...) | RN26 | HOMOLOGADO | Completa e Testada |
| **RF60** (O sistema deve permitir solicitar o envio de ...) | *Sem RN associada direta (Operação CRUD/Navegação)* | N/A | Operacional / Interface |
| **RF61** (Antes de permitir a alteração do status de RA...) | RN46, RN58, RN59 | HOMOLOGADO | Completa e Testada |
| **RF62** (Caso alguma condição necessária para o envio ...) | RN60 | HOMOLOGADO | Completa e Testada |
| **RF63** (O sistema deve permitir alterar o status do o...) | RN61, RN62 | HOMOLOGADO | Completa e Testada |
| **RF64** (O sistema deve permitir as seguintes transiçõ...) | RN44, RN63, RN68 | HOMOLOGADO | Completa e Testada |
| **RF65** (O sistema deve impedir transições de status q...) | RN62 | HOMOLOGADO | Completa e Testada |
| **RF66** (O sistema deve permitir ao jardineiro registr...) | RN66, RN67 | HOMOLOGADO | Completa e Testada |
| **RF67** (O sistema deve identificar automaticamente a ...) | RN69 | PARCIALMENTE IMPLEMENTADO | Parcial |
| **RF68** (O sistema não deve marcar automaticamente um ...) | RN70 | HOMOLOGADO | Completa e Testada |
| **RF69** (O sistema deve impedir a edição direta de um ...) | RN64, RN65 | HOMOLOGADO | Completa e Testada |
| **RF70** (O sistema deve impedir a reabertura de orçame...) | RN71 | HOMOLOGADO | Completa e Testada |
| **RF71** (O sistema deve permitir consultar os orçament...) | *Sem RN associada direta (Operação CRUD/Navegação)* | N/A | Operacional / Interface |
| **RF72** (O sistema deve permitir filtrar ou consultar ...) | *Sem RN associada direta (Operação CRUD/Navegação)* | N/A | Operacional / Interface |
| **RF73** (O sistema deve permitir visualizar os detalhe...) | *Sem RN associada direta (Operação CRUD/Navegação)* | N/A | Operacional / Interface |
| **RF74** (O sistema deve preservar os orçamentos existe...) | RN10, RN76 | HOMOLOGADO | Completa e Testada |
| **RF75** (O sistema deve permitir duplicar um orçamento...) | RN72, RN77 | HOMOLOGADO | Completa e Testada |
| **RF76** (A duplicação deve criar um novo orçamento com...) | RN73 | HOMOLOGADO | Completa e Testada |
| **RF77** (O sistema deve permitir editar o orçamento du...) | RN74, RN77 | HOMOLOGADO | Completa e Testada |
| **RF78** (O sistema não deve modificar o orçamento orig...) | RN75 | HOMOLOGADO | Completa e Testada |
| **RF79** (O sistema deve permitir gerar um PDF a partir...) | RN78 | NÃO ENCONTRADO / NÃO IMPLEMENTADO | Pendente |
| **RF80** (O PDF deve apresentar, quando aplicável, os d...) | RN79 | NÃO ENCONTRADO / NÃO IMPLEMENTADO | Pendente |
| **RF81** (Os valores e demais dados apresentados no PDF...) | RN80 | NÃO ENCONTRADO / NÃO IMPLEMENTADO | Pendente |
| **RF82** (O sistema deve permitir compartilhar o PDF ut...) | RN81 | NÃO ENCONTRADO / NÃO IMPLEMENTADO | Pendente |

### 10.2. Diagnóstico de Inconsistências ou Descolamentos

1. **RFs sem RN Correspondente Direta:**
   - Requisitos como **RF05** (listar clientes), **RF08** (buscar clientes), **RF14** (listar serviços), **RF18** (buscar serviços), **RF24** (buscar produtos) e **RF34** (buscar orçamentos) constituem operações de consulta e interface padronizadas, sem regra de negócio restritiva adicional além do isolamento por usuário (coberto por RN02).
2. **RNs sem RF Correspondente Direta:**
   - Regras como **RN02** (isolamento de tenant), **RN14** e **RN23** (imutabilidade de itens de orçamentos sobre alteração de catálogo) e **RN55** (arredondamento em duas casas decimais) representam invariantes arquiteturais globais ou do banco de dados, que protegem múltiplos RFs transversalmente.
3. **Requisitos com Código mas sem Teste:**
   - **Nenhum.** Todo código implementado possui cobertura correspondente em testes unitários, testes de caso de uso ou testes pgTAP.
4. **Requisitos Homologados sem Rastreabilidade:**
   - **Nenhum.** Todos os módulos homologados possuem pareceres técnicos auditáveis arquivados em `docs/relatorios/`.

---

## 11. Rastreabilidade RF/RN ↔ RNF

O confronto dos requisitos funcionais e regras de negócio com os atributos de qualidade (Requisitos Não-Funcionais) identifica subsistemas com requisitos de qualidade pendentes de evidência:

| Subsistema / Dimensão Técnica | RFs Vinculados | RNs Vinculadas | RNFs Associados | Situação da Qualidade | Evidência / Lacuna |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Mapas e Delimitação Espacial** | RF39 a RF49 | RN36 a RN46 | RNF05, RNF13, RNF29, RNF30 | **HOMOLOGADO** | Renderização fluida, cálculo PostGIS < 100ms e precisão m² comprovados em auditoria (GAP-AREA-01/02). |
| **Segurança e Multitenancy** | RF01 a RF03 | RN01, RN02 | RNF06 a RNF12 | **HOMOLOGADO** | Criptografia AES, isolamento RLS, JWT Supabase e 170 testes pgTAP aprovados. |
| **Usabilidade e Feedback de UI** | RF04, RF25, RF30, RF40, RF50, RF61 | RN41, RN48, RN56, RN59 | RNF01, RNF02, RNF03, RNF04 | **PARCIAL** | Excelente fluidez e feedback para cadastros, orçamentos e mapa; lacuna restrita aos módulos inexistentes de PDF e compartilhamento. |
| **Resiliência e Tolerância a Falhas** | RF10, RF40 | RN07, RN40 | RNF15, RNF22, RNF24 | **PARCIAL** | `MapErrorBoundary` protege mapa; entretanto, tolerância a falhas na geocodificação externa não pôde ser avaliada pela ausência do serviço. |
| **Desempenho e Armazenamento** | RF30, RF36, RF44, RF50 | RN43, RN45, RN46 | RNF13, RNF25 a RNF28 | **HOMOLOGADO** | Queries indexadas, tempos de resposta locais < 200ms e persistência relacional PostGIS íntegra. |
| **Geração e Apresentação de PDF** | RF79 a RF82 | RN78 a RN81 | RNF14, RNF31, RNF32, RNF33 | **NÃO IMPLEMENTADO** | Requisitos de desempenho (< 3s), diagramação, fidelidade de dados e cabeçalho institucional sem nenhuma evidência técnica. |
| **Arquitetura e Manutenibilidade** | Todos os RFs | Todas as RNs | RNF16 a RNF21, RNF34, RNF35 | **HOMOLOGADO** | Clean Architecture em 4 camadas, separação estrita de domínio, repositórios tipados e TypeScript sem erros. |

---

## 12. Cobertura por Módulo

A tabela abaixo consolida a visão funcional e técnica agrupada por módulo do sistema:

| Módulo | RFs Cobertos | RNs Cobertas | RNFs Relacionados | Situação do Módulo | Evidências Homologadas | Pendências Técnicas Objetivas |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Auth e Acesso** | RF01, RF02, RF03 | RN01, RN02 | RNF06 a RNF12 | **HOMOLOGADO** | 18 testes Vitest + 170 pgTAP + Parecer v1.0 | Nenhuma pendência. Módulo congelado. |
| **Clientes** | RF04 a RF09 | RN03 a RN05, RN08 | RNF01, RNF02, RNF04 | **HOMOLOGADO** | 28 testes Vitest + Parecer v1.0 | Nenhuma pendência no cadastro básico. |
| **Endereço e Localização** | RF10, RF11, RF12 | RN06, RN07, RN09 | RNF15, RNF22 | **PARCIAL / PENDENTE** | Colunas e props no banco/código | Ausência de geocodificação e injeção de coords na abertura do mapa. |
| **Catálogo de Serviços** | RF13 a RF21 | RN10 a RN18 | RNF01, RNF02 | **HOMOLOGADO** | 42 testes Vitest + Parecer v1.0 | Nenhuma pendência. Módulo congelado. |
| **Catálogo de Produtos** | RF22 a RF28 | RN19 a RN24 | RNF01, RNF02 | **HOMOLOGADO** | 42 testes Vitest + Parecer v1.0 | Nenhuma pendência. Módulo congelado. |
| **Orçamentos (Cabeçalho)** | RF29 a RF34, RF50 a RF78 | RN25 a RN33, RN47 a RN77 | RNF01, RNF04, RNF23 a RNF28 | **HOMOLOGADO** *(com ressalva em RF67/RN69)* | 28 testes Vitest + 49 domínio + Parecer v1.1 | Rotina autônoma de expiração por data pendente de gatilho/cron. |
| **Itens de Orçamento** | RF35 a RF38 | RN34 a RN36 | RNF01, RNF02, RNF13 | **HOMOLOGADO** | 28 testes Vitest + 82 áreas + Parecer v1.1 | Nenhuma pendência. Módulo congelado. |
| **Áreas e Mapas** | RF39 a RF49 | RN37 a RN46 | RNF05, RNF13, RNF29, RNF30 | **HOMOLOGADO** | 82 testes Vitest + pgTAP PostGIS + Parecer Reauditoria v1.0 | Nenhuma pendência no desenho/cálculo. Módulo congelado. |
| **Geração de PDF** | RF79, RF80, RF81 | RN78, RN79, RN80 | RNF14, RNF31, RNF32 | **NÃO IMPLEMENTADO** | Nenhuma | Módulo completo por construir (layout, snapshot e serviço de geração). |
| **Compartilhamento** | RF82 | RN81 | RNF33 | **NÃO IMPLEMENTADO** | Nenhuma | Módulo completo por construir (integração OS Share / intent). |

---

## 13. Cobertura por Testes

A pirâmide de testes do projeto foi avaliada categorizando o nível das evidências verificáveis:

### 13.1. Testes Automatizados Unitários e de Casos de Uso (TypeScript / Vitest)
- **Total de Testes Executados:** 247 testes
- **Status de Execução:** 247 passando (0 falhas)
- **Distribuição:**
  - `tests/domain/*`: 49 testes de regras de negócio puras (cálculos de subtotal, descontos, arredondamentos, validações de envio, transições de estado de orçamento, entidades usuário, cliente e item de orçamento);
  - `tests/auth/*`: 18 testes de serviço de autenticação e sessão com Supabase;
  - `tests/clientes/*`: 28 testes de casos de uso de clientes (criar, listar, buscar, inativar, reativar, atualizar);
  - `tests/catalogo/*`: 42 testes de casos de uso de catálogo de serviços e produtos;
  - `tests/orcamentos/*`: 28 testes de criação, edição, recálculo, duplicação e mudança de estado;
  - `tests/areas/*`: 82 testes de casos de uso de área, agregação de metragem quadrada, desenho e repositório PostGIS.

### 13.2. Testes de Banco de Dados e Isolamento de Tenants (PostgreSQL / pgTAP)
- **Total de Suítes Executadas:** 8 arquivos SQL em `supabase/tests/`
- **Total de Assertions Executadas:** 170 testes
- **Status de Execução:** 170 passando (0 falhas)
- **Garantias Validadas:**
  - Existência e integridade de tabelas, chaves primárias, chaves estrangeiras e constraints;
  - Integridade espacial da tabela `AREA` com PostGIS (`geometry(Polygon, 4326)`);
  - Habilitação compulsória de RLS em todas as tabelas (`FORCE ROW LEVEL SECURITY`);
  - Impossibilidade de mutações cross-tenant (tentativa de leitura ou gravação de dados de outro usuário resulta em bloqueio estrito).

### 13.3. Testes Empíricos em Emulador Android Real (Pixel_10)
- Validação comportamental executada de ponta a ponta na interface móvel através de scripts ADB e capturas de tela arquivadas em `docs/evidencias/`;
- Comprovou a responsividade, renderização fluida do mapa sobre satélite com Google Maps API Key real, adição de vértices, botões desfazer/limpar, listagens com scroll e modais reativos.

### 13.4. Ausência de Evidências
- **Geocodificação de Endereço:** 0 testes de integração com provedor de geocodificação;
- **Geração e Apresentação de PDF:** 0 testes de geração de arquivo PDF;
- **Compartilhamento Mobile:** 0 testes de acionamento de share intent no Android.

---

## 14. Cobertura por Homologação

Em estrito respeito à governança do projeto, o escopo das homologações já concedidas **não foi ampliado retroativamente**. Cada módulo homologado possui fronteiras delimitadas pelos seus pareceres:

1. **Autenticação:** Parecer `supabase-auth-app-integration-homologation-v1.0.md` homologou autenticação Supabase Auth, login/logout no app e guarda de rotas;
2. **Segurança / RLS:** Parecer `auth-rls-implementation-homologation-v1.0.md` homologou isolamento multitenant no PostgreSQL;
3. **Clientes:** Parecer `clientes-implementation-homologation-v1.0.md` homologou o cadastro de clientes, dados de contato e endereço estruturado textual;
4. **Catálogo de Serviços e Produtos:** Parecer `catalogo-servicos-produtos-implementation-homologation-v1.0.md` homologou cadastros, unidades de medida e preços;
5. **Orçamentos e Itens:** Parecer `orcamentos-itens-implementation-audit-v1.1.md` homologou ciclo de vida, snapshot de itens, cálculo de subtotal, descontos, transições válidas e bloqueio pós-envio;
6. **Áreas e Mapas (GAP-AREA-04, 06, 07, 08):** Parecer `areas-gap-closure-implementation-audit-v1.0.md` homologou persistência PostGIS, cálculo de área e agregação na quantidade do item;
7. **Áreas e Mapas (GAP-AREA-01):** Parecer `areas-map-drawing-implementation-reaudit-v1.0.md` homologou a interface interativa de desenho de polígonos, vértices, métricas em tempo real e botões desfazer/limpar;
8. **Áreas e Mapas (GAP-AREA-02):** Parecer `areas-google-maps-api-key-implementation-audit-v1.0.md` homologou a renderização com tiles satélite reais via Google Maps API Key no Android.

> [!IMPORTANT]
> **Fronteira Crítica:** A homologação do módulo de Áreas e Mapas atesta o funcionamento pleno do fluxo `Google Maps Satélite → posicionamento manual → desenho de polígono → cálculo de área → persistência PostGIS → soma de quantidade no item`. Ela **NÃO** homologou geocodificação automática de endereço do cliente nem centralização automática baseada na localização do cliente.

---

## 15. Requisitos sem Evidência Suficiente

A tabela a seguir identifica os **13 requisitos (5 RFs, 4 RNs e 4 RNFs)** classificados formalmente como **NÃO ENCONTRADO / NÃO IMPLEMENTADO**:

| ID | Descrição Sumária | Categoria | Motivo da Ausência | Impacto no Sistema | O que precisa ser Implementado / Testado / Auditado |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **RF10** | Geocodificar endereço do cliente para lat/long | Funcional | Nenhuma chamada a provedor de geocodificação (Google Geocoding, Nominatim, etc.) implementada. | O aplicativo não converte o endereço digitado pelo usuário em coordenadas geográficas automaticamente. | Implementar `GeocodingProvider`, integrar no salvamento do cliente, criar testes de unidade/mock e auditar. |
| **RF79** | Gerar documento PDF do orçamento | Funcional | Nenhuma biblioteca de renderização/geração de PDF (`expo-print`, etc.) instalada ou configurada. | O usuário não consegue gerar o orçamento em formato impresso/PDF para apresentar ao cliente. | Escolher e implementar biblioteca de PDF, desenhar template canônico, criar caso de uso e auditar. |
| **RF80** | Apresentar/visualizar PDF gerado | Funcional | Ausência de tela ou visualizador nativo de documentos PDF. | O jardineiro não pode inspecionar visualmente o orçamento formatado antes do envio. | Implementar tela/modal de visualização de PDF ou visualizador nativo do Android. |
| **RF81** | Consistência estrita dos dados no PDF | Funcional | Módulo de PDF inexistente. | Impossibilidade de verificar consistência e integridade das informações impressas. | Criar suíte de testes de conteúdo validando se cabeçalho, itens, áreas, descontos e total conferem. |
| **RF82** | Compartilhar PDF por canais externos (Share Intent) | Funcional | Ausência de integração com `expo-sharing` ou Intent nativa do Android. | O orçamento gerado não pode ser transmitido via WhatsApp, E-mail ou exportado para arquivos do dispositivo. | Integrar `expo-sharing`, testar no emulador Android com share sheet e auditar. |
| **RN78** | PDF gerado a partir de snapshot imutável do orçamento | Regra Negócio | Ausência de gerador de PDF. | Não há garantia de que o documento impresso reflita o snapshot imutável exigido pela regra. | Implementar gerador consumindo exclusivamente os dados do snapshot do orçamento. |
| **RN79** | Conteúdo mínimo e layout profissional do PDF | Regra Negócio | Ausência de template de PDF. | O layout formal contendo profissional, cliente, validade, itens, áreas e total não existe. | Desenhar template HTML/PDF atendendo rigorosamente todos os campos obrigatórios da RN79. |
| **RN80** | Consistência matemática absoluta de valores no PDF | Regra Negócio | Ausência de gerador de PDF. | Não há como auditar se os valores impressos mantêm duas casas decimais e total correto. | Testes de regressão confrontando valores calculados pelo domínio com strings renderizadas no PDF. |
| **RN81** | Compartilhamento via mecanismos oficiais do SO móvel | Regra Negócio | Ausência de share nativo. | Inviabiliza a entrega eletrônica externa da proposta comercial. | Implementação e homologação empírica do compartilhamento nativo no Android. |
| **RNF14** | Desempenho de geração de PDF (< 3 segundos) | Não-Funcional | Ausência de gerador de PDF. | Desconhecimento do tempo de compilação e renderização do arquivo no dispositivo. | Benchmark de medição de tempo de renderização em dispositivo móvel com orçamentos complexos. |
| **RNF31** | Qualidade visual e legibilidade do PDF | Não-Funcional | Ausência de gerador de PDF. | Não há artefato visual para auditoria de tipografia, quebras de página e legibilidade. | Auditoria visual da renderização em folhas A4 com inspeção de quebra de página de itens. |
| **RNF32** | Consistência entre tela do app e documento PDF | Não-Funcional | Ausência de gerador de PDF. | Risco de divergência entre o total visto no celular e o total impresso na proposta. | Testes de confronto tela x PDF em cenários com descontos percentuais e fixos. |
| **RNF33** | Identificação institucional do profissional/empresa no PDF | Não-Funcional | Ausência de gerador de PDF. | Proposta comercial anônima sem dados de contato do prestador de serviço. | Parametrizar dados do perfil do usuário (`USUARIO.nome_completo`, etc.) no cabeçalho do PDF. |

---

## 16. Implementações Parciais

A tabela abaixo detalha os **11 requisitos (3 RFs, 4 RNs e 4 RNFs)** identificados como **PARCIALMENTE IMPLEMENTADO**:

| ID | Descrição | O que está Efetivamente Implementado | O que Falta para Completude | Causa Técnica da Parcialidade |
| :--- | :--- | :--- | :--- | :--- |
| **RF11** | Posicionamento inicial do mapa baseado na localização do cliente | `MapProvider` aceita propriedade `regiaoInicial` com `{ latitude, longitude }`; em `app/(app)/orcamentos/mapa.tsx` o mapa inicia em coordenadas padrão (-23.5505, -46.6333). | A tela de mapa não busca o endereço/coordenadas do cliente do orçamento para injetar no `regiaoInicial`. | Desacoplamento entre a tela de delimitação de área e o cadastro de endereço do cliente. |
| **RF12** | Localização manual no mapa quando ausente localização do cliente | O usuário consegue navegar livremente pelo mapa (Pan e Zoom) e desenhar o polígono em qualquer localidade. | Ausência de barra de busca manual de endereço ou ferramenta de 'ir para coordenadas'. | O mapa depende exclusivamente do gesto de navegação manual do operador sobre a imagem satélite. |
| **RF67** | Orçamento expira automaticamente quando validade for ultrapassada | Método de domínio `Orcamento.verificarExpiracao()` implementado e testado em `tests/domain/orcamento-estados.test.ts`. | Não existe job, cron, worker em segundo plano ou trigger no banco que execute a verificação periodicamente. | Ausência de mecanismo de agendamento automático na aplicação móvel ou no backend Supabase. |
| **RN06** | Endereço do cliente inclui latitude e longitude obtidas por geocodificação | Tabela `CLIENTE` possui colunas `latitude` e `longitude` (PostgreSQL `numeric(10,8)` e `numeric(11,8)`). | As colunas permanecem `NULL` porque não há chamada de geocodificação no cadastro/edição de clientes. | Módulo de geocodificação não foi implementado. |
| **RN07** | Abertura do mapa utiliza coordenadas do cliente quando disponíveis | Suporte em `MapProvider` para centralizar em qualquer coordenada via props. | A tela `mapa.tsx` não consome o endereço do cliente vinculado ao orçamento. | Falta de amarração de navegação entre `orcamento -> cliente -> coordenadas -> mapa`. |
| **RN09** | Localização manual disponível quando cliente não possui coordenadas | Navegação livre via gestos de Pan/Zoom plenamente funcional sobre imagem satélite de alta resolução. | Falta busca textual de logradouro no mapa como alternativa de posicionamento manual guiado. | Implementação restrita à movimentação manual por toque. |
| **RN69** | Orçamento com validade ultrapassada transiciona para EXPIRADO | Transição de estado de domínio implementada e validada (`Orcamento.verificarExpiracao(dataAtual)`). | Falta a invocação automática desse método na abertura da lista de orçamentos ou via rotina agendada. | Depende da criação do gatilho de ativação temporal. |
| **RNF01** | Usabilidade nas operações principais do sistema | Cadastros de clientes, serviços, produtos, criação de orçamentos, cálculo de itens e desenho em mapa altamente fluidos. | Fluxo de geração e visualização de PDF não disponível para avaliação de usabilidade. | Ausência do módulo de PDF. |
| **RNF03** | Feedback claro em operações relevantes | Feedback completo com alertas nativos, spinners e displays reativos em tempo real para todas as telas existentes. | Ausência de feedback de geração e compartilhamento de PDF. | Ausência dos módulos de PDF e compartilhamento. |
| **RNF15** | Feedback de indisponibilidade de serviços externos | `MapErrorBoundary` captura e exibe mensagem amigável em caso de falha de carregamento do Google Maps. | Ausência de tratamento equivalente para o serviço de geocodificação (inexistente). | Módulo de geocodificação inexistente. |
| **RNF22** | Tolerância a falhas na integração com serviços externos | O sistema não trava se o mapa falhar; usuário é notificado com opção de tentar novamente. | Não há tratamento de indisponibilidade ou timeout de provedor de geocodificação. | Módulo de geocodificação inexistente. |

---

## 17. Requisitos que Impedem Conclusão do Projeto

Em estrita observância à governança e aos critérios canônicos de aceitação, **o projeto NÃO PODE ser declarado como concluído** enquanto os seguintes **24 requisitos bloqueadores** não forem formalmente implementados, testados e homologados:

### 17.1. Bloqueadores por Ausência Total de Implementação (13 requisitos)
1. **RF10:** Geocodificar endereço do cliente para obtenção automática de latitude e longitude;
2. **RF79:** Gerar documento PDF do orçamento;
3. **RF80:** Apresentar/visualizar PDF gerado na aplicação móvel;
4. **RF81:** Garantir consistência estrita dos dados e valores impressos no PDF;
5. **RF82:** Compartilhar o PDF por canais externos (Share Intent do Android);
6. **RN78:** Geração de PDF a partir de snapshot imutável do orçamento;
7. **RN79:** Conteúdo mínimo e layout formal do PDF;
8. **RN80:** Consistência matemática absoluta dos valores impressos no PDF;
9. **RN81:** Compartilhamento do PDF via mecanismos oficiais do sistema operacional;
10. **RNF14:** Tempo de geração do PDF inferior a 3 segundos;
11. **RNF31:** Qualidade visual e legibilidade do PDF;
12. **RNF32:** Consistência visual e numérica entre telas do aplicativo e documento PDF;
13. **RNF33:** Identificação institucional do prestador no cabeçalho do PDF.

### 17.2. Bloqueadores por Implementação Parcial (11 requisitos)
1. **RF11:** Injetar coordenadas do cliente no posicionamento inicial da tela de mapa;
2. **RF12:** Fornecer mecanismo alternativo guiado de localização manual quando cliente não tiver coordenadas;
3. **RF67:** Ativar rotina de expiração automática de orçamentos por data de validade;
4. **RN06:** Preencher latitude/longitude do endereço do cliente a partir de geocodificação;
5. **RN07:** Utilizar coordenadas do cliente para abertura do mapa na área de serviço;
6. **RN09:** Suporte a posicionamento manual alternativo;
7. **RN69:** Transicionar automaticamente orçamentos vencidos para o estado `EXPIRADO`;
8. **RNF01:** Estender usabilidade aos fluxos de PDF;
9. **RNF03:** Estender feedback de interface aos fluxos de PDF e compartilhamento;
10. **RNF15:** Incorporar feedback de falha para o serviço de geocodificação;
11. **RNF22:** Garantir tolerância a falhas na comunicação com a API de geocodificação.

---

## 18. Próximos Blocos Candidatos

Com base exclusiva nas lacunas técnicas reais identificadas neste inventário, definem-se os seguintes blocos naturais de trabalho para os ciclos de planejamento futuros:

### Bloco Candidato A: Localização e Geocodificação de Clientes
- **Requisitos Envolvidos:** RF10, RF11, RF12, RN06, RN07, RN09, RNF15, RNF22.
- **Escopo Conceitual:**
  1. Definir decisão técnica sobre provedor de geocodificação (`GeocodingProvider`);
  2. Implementar geocodificação de endereço no cadastro e edição de cliente;
  3. Persistir latitude/longitude nas colunas já existentes da tabela `CLIENTE`;
  4. Atualizar a rota de abertura do mapa (`orcamentos/mapa.tsx`) para consumir as coordenadas do cliente e posicionar a visualização satélite;
  5. Implementar tratamento de falhas e feedback em caso de indisponibilidade da API de geocodificação.

### Bloco Candidato B: Geração e Compartilhamento de Proposta em PDF
- **Requisitos Envolvidos:** RF79, RF80, RF81, RF82, RN78, RN79, RN80, RN81, RNF14, RNF31, RNF32, RNF33.
- **Escopo Conceitual:**
  1. Definir decisão técnica sobre biblioteca de geração de PDF (ex.: `expo-print` com templates HTML/CSS padronizados);
  2. Desenhar layout formal da proposta comercial (dados da empresa, cliente, itens, metragem de áreas, condições comerciais e total);
  3. Garantir imutabilidade consumindo dados do snapshot do orçamento;
  4. Integrar visualização prévia de PDF no aplicativo;
  5. Integrar compartilhamento nativo via `expo-sharing` no Android;
  6. Auditar consistência visual, fidelidade matemática e tempo de renderização.

### Bloco Candidato C: Rotina de Expiração Automática de Orçamentos
- **Requisitos Envolvidos:** RF67, RN69.
- **Escopo Conceitual:**
  1. Ativar a verificação de expiração temporal (`Orcamento.verificarExpiracao(dataAtual)`) na listagem ou abertura de orçamentos, ou via trigger/função agendada no Supabase;
  2. Garantir atualização persistida de status de `ENVIADO`/`EM_ANALISE` para `EXPIRADO` quando a data de validade estiver vencida.

> [!CAUTION]
> **Diretriz Obrigatória:** Nenhum dos blocos acima deve ser iniciado durante esta etapa de inventário. Qualquer desenvolvimento futuro exigirá a elaboração prévia de seu respectivo plano de implementação e homologação técnica formal.

---

## 19. Estatísticas de Cobertura

Abaixo apresentam-se os quadros quantitativos descritivos da cobertura de requisitos do sistema:

### 19.1. Requisitos Funcionais (RF)
| Situação | Quantidade | Percentual |
| :--- | :---: | :---: |
| **Homologado** | 74 | 90,24% |
| **Implementado — Não Homologado** | 0 | 0,00% |
| **Parcialmente Implementado** | 3 | 3,66% |
| **Não Encontrado / Não Implementado** | 5 | 6,10% |
| **Fora do Escopo Explícito** | 0 | 0,00% |
| **Total de Requisitos Funcionais** | **82** | **100,00%** |

### 19.2. Regras de Negócio (RN)
| Situação | Quantidade | Percentual |
| :--- | :---: | :---: |
| **Homologado** | 73 | 90,12% |
| **Implementado — Não Homologado** | 0 | 0,00% |
| **Parcialmente Implementado** | 4 | 4,94% |
| **Não Encontrado / Não Implementado** | 4 | 4,94% |
| **Fora do Escopo Explícito** | 0 | 0,00% |
| **Total de Regras de Negócio** | **81** | **100,00%** |

### 19.3. Requisitos Não-Funcionais (RNF)
| Situação | Quantidade | Percentual |
| :--- | :---: | :---: |
| **Homologado** | 27 | 77,14% |
| **Implementado — Não Homologado** | 0 | 0,00% |
| **Parcialmente Implementado** | 4 | 11,43% |
| **Não Encontrado / Não Implementado** | 4 | 11,43% |
| **Fora do Escopo Explícito** | 0 | 0,00% |
| **Total de Requisitos Não-Funcionais** | **35** | **100,00%** |

### 19.4. Consolidação Geral de Requisitos
| Situação | Quantidade Absoluta | Percentual Global |
| :--- | :---: | :---: |
| **Homologado** | 174 | 87,88% |
| **Implementado — Não Homologado** | 0 | 0,00% |
| **Parcialmente Implementado** | 11 | 5,56% |
| **Não Encontrado / Não Implementado** | 13 | 6,57% |
| **Fora do Escopo Explícito** | 0 | 0,00% |
| **Total Geral de Requisitos Auditados** | **198** | **100,00%** |

---

## 20. Conclusão

O presente inventário executou a auditoria completa e exaustiva dos 198 requisitos canônicos do projeto (*82 Requisitos Funcionais, 81 Regras de Negócio e 35 Requisitos Não-Funcionais*), confrontando diretamente a documentação oficial com o código-fonte, o banco de dados PostgreSQL/PostGIS, os 417 testes automatizados e o comportamento empírico no emulador Android.

Constata-se que o núcleo do sistema (*Autenticação, Clientes, Catálogo de Serviços, Catálogo de Produtos, Orçamentos, Itens de Orçamento, Regras Financeiras, Delimitação Espacial de Áreas via Satélite e Persistência PostGIS*) encontra-se **robusto, integralmente testado e formalmente homologado** (atingindo **87,88% de cobertura formal homologada**).

Entretanto, restam lacunas críticas relativas à **Geocodificação de Endereço**, à **Geração e Compartilhamento de PDF** e à automação da **Rotina de Expiração de Orçamentos**, que impedem o encerramento do projeto neste momento.

Por conseguinte, declara-se oficialmente:

### **INVENTÁRIO CONCLUÍDO — PROJETO COM REQUISITOS PENDENTES**

---
*Fim do Documento Canônico de Inventário v1.0.*