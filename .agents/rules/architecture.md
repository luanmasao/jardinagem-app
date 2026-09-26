---
trigger: always_on
---

# Arquitetura do Projeto

## 1. Objetivo

Manter a arquitetura do aplicativo simples, modular e compreensível para desenvolvedores iniciantes, com responsabilidades bem separadas e possibilidade de evolução incremental.

## 2. Stack oficial

### Plataforma e aplicação

- Android;
- React Native;
- Expo;
- TypeScript;
- Expo Router.

### Backend e dados

- Supabase;
- Supabase Auth;
- PostgreSQL;
- PostGIS;
- Row Level Security (RLS).

### Mapas

- Google Maps;
- `react-native-maps`;
- modo Satellite;
- desenho e edição de polígonos.

A solução de mapas foi validada pelo POC técnico do projeto.

### Serviços de infraestrutura

- `MapProvider` para abstrair a integração de mapas;
- `GeocodingProvider` para abstrair a geocodificação;
- `PdfGenerator` para abstrair a geração de PDF.

Os provedores concretos de geocodificação e a biblioteca específica de PDF permanecem decisões de implementação enquanto não forem formalmente definidas.

## 3. Organização em camadas

Quando aplicável, separar:

* Presentation;
* Application;
* Domain;
* Infrastructure.

A responsabilidade de cada camada deve ser mantida clara.

### Presentation

Responsável por telas, componentes visuais, navegação e interação com o usuário.

### Application

Responsável por casos de uso, orquestração de operações e coordenação entre domínio e infraestrutura.

### Domain

Responsável pelas entidades, regras de negócio e cálculos que devem permanecer independentes da interface.

Regras relacionadas a:

* orçamento;
* itens de orçamento;
* serviços;
* produtos;
* áreas;
* cálculos de preço;
* estados do orçamento;

devem permanecer independentes da interface sempre que possível.

### Infrastructure

Responsável por acesso a dados, autenticação, banco, PostGIS, mapas, geocodificação, geração de PDF e demais integrações externas.

## 4. Mapas e áreas

O fluxo técnico validado pelo POC é:

`Google Maps → Satellite → posicionamento → desenho/edição de polígono → coordenadas → cálculo de área → persistência espacial`.

As áreas de serviço são representadas no banco por geometrias PostGIS do tipo `POLYGON` em EPSG:4326.

O endereço do cliente e a área de trabalho possuem responsabilidades distintas: coordenadas do endereço representam a localização do cliente, enquanto a geometria de `AREA` representa a região de trabalho delimitada para um item de orçamento.

## 5. Dados e Supabase

O Supabase fornece autenticação, acesso ao PostgreSQL e mecanismos de segurança por linha.

A identidade autenticada é a referência para `USUARIO.id`.

`USUARIO` representa o perfil de negócio da aplicação e não armazena credenciais de autenticação.

O isolamento dos dados deve utilizar RLS, respeitando a propriedade definida no modelo de dados.

O PostGIS é responsável pelo armazenamento e operações espaciais necessárias às áreas.

## 6. Integrações e abstrações

Integrações externas devem ser isoladas por abstrações quando isso reduzir acoplamento desnecessário.

### MapProvider

Isola o domínio e a aplicação dos detalhes do provedor de mapas. A implementação atualmente adotada utiliza Google Maps com `react-native-maps`.

### GeocodingProvider

Isola a aplicação do provedor de geocodificação. O fornecedor concreto ainda não está definido como decisão oficial.

### PdfGenerator

Isola a aplicação dos detalhes da geração de PDF. PDF é responsabilidade de infraestrutura e não é uma entidade do domínio.

## 7. Dependências

Evitar criar múltiplas soluções para o mesmo problema.

Antes de introduzir uma nova biblioteca, verificar se uma biblioteca já utilizada pelo projeto pode resolver a necessidade e justificar a nova dependência.

## 8. Alterações estruturais

Alterações que afetem várias partes do sistema devem ser precedidas por análise de impacto.

Não alterar entidades, relacionamentos ou estrutura de dados apenas para facilitar uma implementação local.

O DER Final representa o modelo conceitual de dados e o Modelo Físico vigente representa sua concretização para o SGBD adotado.

Migrations devem implementar o Modelo Físico aprovado e não podem redefini-lo silenciosamente.

Quando uma mudança de código exigir alteração nos requisitos, banco, UML, DER ou arquitetura, informar essa necessidade explicitamente antes de alterar os artefatos afetados.

## 9. Simplicidade

Não aplicar padrões arquiteturais complexos sem benefício claro.

O tamanho da abstração deve ser proporcional ao problema que ela resolve.
