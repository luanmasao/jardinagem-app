# Manifesto da Baseline Técnica — Release 1.0

**Projeto:** Sistema de Orçamento para Jardinagem (`jardinagem-app`)  
**Identificação da Release:** `Release 1.0.0`  
**Data:** 06 de Outubro de 2026  
**Responsável:** Arquiteto de Software e Governança Técnica do Projeto  
**Status dos Artefatos:** `CONGELADO`  
**Referência Normativa:** `docs/homologacao/release-1.0-homologacao-final-v1.0.md`  
**Tag Vinculada:** `v1.0.0`

---

## 1. Objetivo do Manifesto

Este documento formaliza o **Manifesto da Baseline Técnica e Documental da Release 1.0** do projeto *jardinagem-app*. Ele cataloga exaustivamente todos os artefatos que compõem o estado oficial homologado do sistema, estabelece seu estado definitivo como `CONGELADO` e registra os checksums determinísticos (SHA-256) dos componentes estruturais para garantia de auditabilidade, imutabilidade e rastreabilidade histórica.

---

## 2. Catálogo Estruturado de Artefatos Congelados

### 2.1. Aplicação e Interface Móvel (Android / React Native)

| Nome do Artefato | Caminho no Repositório | Finalidade Técnica | Estado | Observações / Versão |
| :--- | :--- | :--- | :---: | :--- |
| **Domínio da Aplicação** | `src/domain/` | Entidades, serviços puros de domínio, cálculos monetários e enums | `CONGELADO` | Clean Architecture (Zero dependência nativa) |
| **Casos de Uso da Aplicação** | `src/application/` | Orquestração dos casos de uso de negócio, validações e mappers | `CONGELADO` | Casos de uso atômicos (11 módulos) |
| **Infraestrutura e Integrações** | `src/infrastructure/` | Adaptadores Supabase, PostGIS, MapProvider, PDF e ExpoSharing | `CONGELADO` | Implementações concretas de serviços |
| **Componentes e Apresentação** | `src/presentation/` | Componentes de UI, hooks reativos e mapa de delimitação | `CONGELADO` | Design system padronizado e responsivo |
| **Roteamento Expo Router** | `app/` | Rotas de autenticação `(auth)` e rotas protegidas `(app)` | `CONGELADO` | Expo Router 57.0.21 com tipagem estática |
| **Configuração do Aplicativo** | `app.json` | Configuração do Expo, scheme, nome, ícones e pacote Android | `CONGELADO` | Versão `1.0.0`, `com.jardinagem.app` |
| **Configuração Dinâmica** | `app.config.js` | Injeção de variáveis de ambiente e chave do Google Maps | `CONGELADO` | Hermes Engine habilitado |

### 2.2. Dependências e Compilação

| Nome do Artefato | Caminho no Repositório | Finalidade Técnica | Estado | Observações / Versão |
| :--- | :--- | :--- | :---: | :--- |
| **Manifesto de Dependências** | `package.json` | Definição de pacotes npm, scripts de build e testes | `CONGELADO` | `version: 1.0.0`, Expo SDK ~57.0.23 |
| **Lockfile de Resolução** | `package-lock.json` | Árvore exata de resolução determinística de dependências | `CONGELADO` | Integridade SHA-512 de pacotes |
| **Configuração TypeScript App** | `tsconfig.json` | Configuração de compilação estática do código de produção | `CONGELADO` | TypeScript 6.0.3 compatível |
| **Configuração TypeScript Test** | `tsconfig.test.json` | Configuração de compilação estática das suítes de teste | `CONGELADO` | Suporte a Vitest e Node Test Runner |

### 2.3. Banco de Dados, Modelagem e Migrations

| Nome do Artefato | Caminho no Repositório | Finalidade Técnica | Estado | Observações / Versão |
| :--- | :--- | :--- | :---: | :--- |
| **Modelo Físico Vigente** | `docs/modelo-fisico-v1.1.md` | Especificação formal do schema relacional e espacial | `CONGELADO` | Modelo Físico v1.1 oficial |
| **Modelo Conceitual (DER)** | `docs/uml/der.puml` | Diagrama Entidade-Relacionamento canônico | `CONGELADO` | DER v1.1 oficial |
| **Diagramas UML Canônicos** | `docs/uml/*.puml` | Classes, Casos de Uso, Sequência, Atividades e Estados | `CONGELADO` | UML v3.1 oficial |
| **Migration 01 — Modelo Físico** | `supabase/migrations/20260916020500_modelo_fisico_v1_1.sql` | Criação das 8 tabelas de negócio e tipos PostGIS | `CONGELADO` | Baseline estrutural de dados |
| **Migration 02 — Segurança RLS** | `supabase/migrations/20260921000000_auth_rls.sql` | 31 Políticas de Row Level Security por `auth.uid()` | `CONGELADO` | Isolamento estrito de tenants |
| **Migration 03 — Bloco D** | `supabase/migrations/20261006000000_expiracao_orcamentos_autonoma.sql` | Infraestrutura de expiração `app_private`, `pg_cron` e RPC | `CONGELADO` | Automação server-side diária |

### 2.4. Automação e Background (pg_cron)

| Nome do Artefato | Caminho no Repositório | Finalidade Técnica | Estado | Observações / Versão |
| :--- | :--- | :--- | :---: | :--- |
| **Script Pré-Voo A2** | `scripts/cron/preflight-a2.sql` | Validação de pré-requisitos antes de ativar agendamento | `CONGELADO` | Pipeline de 4 estágios |
| **Script de Ativação B** | `scripts/cron/ativar-cron-b.sql` | Agendamento do job diário `job_expirar_orcamentos_diario` | `CONGELADO` | 03:01 UTC / 00:01 BRT |
| **Script de Pós-Validação C** | `scripts/cron/pos-validacao-c.sql` | Verificação de integridade e registro funcional no cron | `CONGELADO` | Auditoria operacional |
| **Script de Benchmark RNF12** | `scripts/cron/benchmark-representativo-rnf12.ts` | Benchmark com `ANALYZE` pós-carga para volumes 10k/100k/1M | `CONGELADO` | Resolução de `AUDIT-D-01` |

### 2.5. Suítes de Testes Automatizados

| Nome do Artefato | Caminho no Repositório | Finalidade Técnica | Estado | Observações / Versão |
| :--- | :--- | :--- | :---: | :--- |
| **Testes de Banco pgTAP** | `supabase/tests/*.sql` (9 arquivos) | 184 testes de schema, RLS, cross-tenant e expiração | `CONGELADO` | 184 / 184 PASS (100%) |
| **Testes de Domínio** | `tests/domain/*.test.ts` | 52 testes de regras financeiras, status e invariantes | `CONGELADO` | 52 / 52 PASS (100%) |
| **Testes de Clientes e Bloco A** | `tests/clientes/*.test.ts` | 43 testes de CRUD, geocodificação e multi-tenant | `CONGELADO` | 43 / 43 PASS (100%) |
| **Testes de Catálogo** | `tests/servicos/`, `tests/produtos/` | 42 testes de serviços e produtos (RN16 unidade m²) | `CONGELADO` | 42 / 42 PASS (100%) |
| **Testes de Orçamentos e Bloco D** | `tests/orcamentos/*.test.ts` | 53 testes de propostas, itens, snapshots e expiração | `CONGELADO` | 53 / 53 PASS (100%) |
| **Testes de Áreas e Geodésia** | `tests/areas/*.test.ts`, `tests/infrastructure/` | 82 testes de polígonos, desenho e fórmula geodésica | `CONGELADO` | 82 / 82 PASS (100%) |
| **Testes de PDF (Bloco B)** | `tests/application/`, `tests/infrastructure/` | 25 testes de formatação, layout institucional e performance | `CONGELADO` | 25 / 25 PASS (100%) |
| **Testes de Compartilhamento (Bloco C)** | `tests/application/`, `tests/infrastructure/` | 40 testes de Share Sheet, provider e fallback seguro | `CONGELADO` | 40 / 40 PASS (100%) |

### 2.6. Documentação Canônica, Planejamento e Governança

| Nome do Artefato | Caminho no Repositório | Finalidade Técnica | Estado | Observações / Versão |
| :--- | :--- | :--- | :---: | :--- |
| **Requisitos Funcionais** | `docs/requisitos/requisitos_funcionais.docx` | Especificação de RF01 a RF82 | `CONGELADO` | RF v2 Canônico |
| **Regras de Negócio** | `docs/regras_negocio.docx` | Especificação de RN01 a RN81 | `CONGELADO` | RN v3 Canônica |
| **Requisitos Não-Funcionais** | `docs/requisitos/requisitos_nao_funcionais.docx` | Especificação de RNF01 a RNF35 | `CONGELADO` | RNF v2 Canônico |
| **Inventário Pós-Bloco D** | `docs/planejamento/requisitos-cobertura-status-pos-bloco-d-v1.0.md` | Recálculo dos 198 requisitos canônicos (100% homologados) | `CONGELADO` | Baseline de Requisitos |
| **Plano de Fechamento** | `docs/planejamento/release-1.0-fechamento-plan-v1.0.md` | Critérios de auditoria, regressão e congelamento | `CONGELADO` | Plano de Release 1.0 |
| **Laudo de Auditoria Global** | `docs/relatorios/release-1.0-integracao-global-audit-v1.0.md` | Auditoria dos 18 fluxos transversais (18/18 PASS) | `CONGELADO` | Parecer Vinculante |
| **Termo Oficial de Homologação** | `docs/homologacao/release-1.0-homologacao-final-v1.0.md` | Declaração oficial de homologação da Release 1.0 | `CONGELADO` | Homologação Definitiva |

---

## 3. Checksums Determinísticos da Baseline (SHA-256)

### 3.1. Metodologia de Cálculo
- **Algoritmo Padronizado:** SHA-256 (Secure Hash Algorithm 256-bit);
- **Escopo Incluído:** Arquivos canônicos de configuração, modelagem, migrations, documentação formal e infraestrutura da Release 1.0;
- **Escopo Explicitamente Excluído:** Diretórios efêmeros, caches locais, dependências de terceiros (`node_modules/`), `.git/`, `.expo/`, diretório `scratch/` e capturas temporárias de tela.

### 3.2. Tabela de Hashes SHA-256 dos Artefatos Estruturais

| Arquivo Canônico | Caminho | Hash SHA-256 |
| :--- | :--- | :--- |
| **Configuração de Pacotes** | `package.json` | `355D3FC5EFB0356D2E23F7B358E9D15C937142F81C5703B4072980797750B837` |
| **Resolução de Dependências** | `package-lock.json` | `D9B399195E365E6000B3124242B0CEC298485C41CE2A0307B8A54B74081C95E4` |
| **Configuração Expo** | `app.json` | `F9F8B91827BFE34836F3FD5CF52C4C469F3510D93AED4743CCD9A4F7DC54A4AA` |
| **Configuração Android / Maps** | `app.config.js` | `3BF7A8FDED582B2468586F884F9C3D53D84D5FFB99450914BEB894C494924D61` |
| **TypeScript Config** | `tsconfig.json` | `785E7259187338A1FC1068C5CFB3CFF7636F6297C0D196B26050D8377380ABA0` |
| **TypeScript Test Config** | `tsconfig.test.json` | `C27C3139E05A250F4C472DF7BBB80A1622C2A21DFE07C6D05A64CFA78E5FCFEB` |
| **Modelo Físico v1.1** | `docs/modelo-fisico-v1.1.md` | `440E8F47196EC7BE4A2677256F0893D2F5CCD79A8C56263C839AA6E9427F92F8` |
| **Regras de Negócio v3** | `docs/regras_negocio.docx` | `E0238938A7ADE6DC982AB711AC0EE49725CD1B21487627B5260932C80579AAEF` |
| **Requisitos Funcionais v2** | `docs/requisitos/requisitos_funcionais.docx` | `3B710A9A1FAA515F2E37AB015F1195F35EB97B210492ABFC105AE80180015758` |
| **Requisitos Não-Funcionais v2**| `docs/requisitos/requisitos_nao_funcionais.docx` | `51C624E84B6DBE0962DAD8BC28992D467FA77BFC5702B05534DE2C632001ACD1` |
| **DER Canônico v1.1** | `docs/uml/der.puml` | `C53492D5F1A1E93D22435DEB539D24350099B07BC05143F31B8303B9A4C3F26D` |
| **UML Classes v3.1** | `docs/uml/classes.puml` | `37613F2008C6309B818086169591FEFE8ED3C8F25CEBDE1924F283FCD15B6131` |
| **UML Ciclo de Vida** | `docs/uml/estados.puml` | `354FBE87BAE66A5AF5A849A9DDEA2A62E0032CF00C8DB30695118A18771171B7` |
| **UML Casos de Uso** | `docs/uml/casos_de_uso.puml` | `0E28C7358BF62DA6736F1B4CDD1A5B23F694D3D8B85CFF35D0B56CF64D896B22` |
| **UML Sequência** | `docs/uml/sequencia.puml` | `DF4A4193C58F775876954D41D2FA4760AF7E39A02C56C372C372BE4D8C3A226A` |
| **UML Atividades** | `docs/uml/atividades.puml` | `40C39E7766DA97A5CFD2F0E1178FAB4B382EF3D051858A2E559A46F860EDA080` |
| **Inventário Pós-Bloco D** | `docs/planejamento/requisitos-cobertura-status-pos-bloco-d-v1.0.md` | `7C3CF1A0C586899F6E8C7B69236540672394FEA2A3691E08B24AB2BC3E9D46E9` |
| **Plano de Fechamento** | `docs/planejamento/release-1.0-fechamento-plan-v1.0.md` | `2B9D84B550761EF03760BCA02F8D6332F80D87A3F6B9E6757BD06D1FCB7FF7DE` |
| **Laudo Auditoria Global** | `docs/relatorios/release-1.0-integracao-global-audit-v1.0.md` | `10B7094E5348A3391349C0950ECA54ED5E0D569E524B4B32E48998D7D8C3029A` |
| **Termo de Homologação** | `docs/homologacao/release-1.0-homologacao-final-v1.0.md` | `4A783104EB2D9BF62AC1E569C3308DB8A15718275B5C0A35B3A73D0E09D67214` |
| **Migration Modelo Físico** | `supabase/migrations/20260916020500_modelo_fisico_v1_1.sql` | `851BFD64D153E6F7228701D19D48B8D48A83E438E220489C493645E76436D522` |
| **Migration RLS** | `supabase/migrations/20260921000000_auth_rls.sql` | `44D413242B6A23A1AAAB56F9621E9D483F3F7457EE915025BF0D9AD6C17E1A64` |
| **Migration Bloco D** | `supabase/migrations/20261006000000_expiracao_orcamentos_autonoma.sql` | `0BCEC87298707E6078D2F8A79BD2E95DC8C4F16824E1FC92B89E85E85DDEBC4C` |

---

## 4. Declaração Formal de Imutabilidade

Com a emissão deste manifesto e a vinculação da tag `v1.0.0`:
- Os artefatos listados estão declarados como a **Baseline Oficial Congelada da Release 1.0**;
- Nenhuma alteração estrutural, comportamental ou de dependência poderá ser realizada sobre esta baseline sem abertura formal de um novo ciclo de planejamento, homologação e versionamento.
