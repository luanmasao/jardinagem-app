Sistema de Orçamentos para Jardinagem

Aplicativo Android desenvolvido como projeto acadêmico para auxiliar profissionais de jardinagem na criação, gerenciamento e compartilhamento de orçamentos.

O diferencial do projeto é permitir a medição de áreas de trabalho diretamente sobre um mapa em modo satélite, possibilitando que a área calculada seja utilizada na composição automática do orçamento.

Status: em fase de modelagem e prova de conceito (POC).
A arquitetura e algumas escolhas tecnológicas ainda estão sendo validadas antes da implementação completa.

🎯 Objetivo

O sistema tem como objetivo facilitar a elaboração de orçamentos para serviços de jardinagem, permitindo ao profissional:

cadastrar clientes;

cadastrar serviços personalizados;

cadastrar produtos personalizados;

criar e reutilizar orçamentos;

medir áreas de trabalho por meio de polígonos no mapa;

calcular automaticamente a área em m²;

utilizar a área medida como quantidade de serviços vendidos por m²;

aplicar descontos;

controlar o status do orçamento;

gerar e compartilhar o orçamento em PDF.

🗺️ Principal diferencial

Para serviços que exigem medição de área, o usuário poderá utilizar o mapa para delimitar uma ou mais áreas de trabalho.

Fluxo previsto:

Mapa em modo satélite
        ↓
Posicionar localização
        ↓
Delimitar polígono
        ↓
Editar polígono
        ↓
Calcular área automaticamente
        ↓
Obter área em m²
        ↓
Atualizar quantidade do serviço
        ↓
Calcular valor do item

Um mesmo serviço pode possuir várias áreas não contíguas.

Exemplo:

Corte de grama
├── Área 1 → 500 m²
├── Área 2 → 300 m²
└── Área 3 → 150 m²

Quantidade do serviço = 950 m²

🧩 Funcionalidades previstas

Autenticação

Login

Encerramento de sessão

Isolamento dos dados por usuário

Clientes

Cadastro

Consulta

Pesquisa

Edição

Desativação

Endereço opcional

Localização geográfica como referência para o mapa

Serviços

Cadastro de serviços personalizados

Unidade de medida

Preço base

Indicação de uso de medição por área

Edição

Desativação

Preservação do histórico dos orçamentos

Produtos

Cadastro de produtos personalizados

Unidade

Preço base

Edição

Desativação

Preservação do histórico dos orçamentos

Orçamentos

Criação de orçamento

Adição de serviços e produtos

Snapshot dos itens

Personalização da descrição e valor unitário do item

Desconto percentual ou fixo

Validade

Observações

Condições de pagamento

Cálculo de subtotal e total

Consulta e histórico

Duplicação de orçamento

Geração de PDF

Compartilhamento do PDF

Medição de áreas

Mapa em modo satélite

Delimitação por polígonos

Múltiplas áreas por serviço

Edição da geometria

Edição de nome e observações

Cálculo automático em m²

Atualização automática da quantidade do serviço

Status do orçamento

O ciclo de vida previsto é:

RASCUNHO
    ↓
ENVIADO
    ↓
EM_ANALISE
   ↙      ↘
APROVADO  RECUSADO
    ↓
CONCLUIDO

Também existem os fluxos:

ENVIADO ───────→ EXPIRADO
EM_ANALISE ────→ EXPIRADO

RASCUNHO ──────→ CANCELADO
ENVIADO ───────→ CANCELADO
EM_ANALISE ────→ CANCELADO

Um orçamento que saiu de RASCUNHO não é reaberto para edição. Para criar uma nova proposta a partir dele, utiliza-se a duplicação.

🏗️ Arquitetura

A arquitetura conceitual está organizada em camadas:

┌───────────────────────────────┐
│       Apresentação            │
│ Telas / Componentes / Rotas   │
└───────────────┬───────────────┘
                ↓
┌───────────────────────────────┐
│          Aplicação            │
│ Casos de uso / Orquestração   │
└───────────────┬───────────────┘
                ↓
┌───────────────────────────────┐
│            Domínio            │
│ Entidades / Regras / Cálculos │
└───────────────┬───────────────┘
                ↓
┌───────────────────────────────┐
│        Infraestrutura         │
│ Banco / Auth / Mapas / PDF    │
└───────────────────────────────┘

A intenção é manter as regras de negócio independentes de tecnologias específicas, especialmente do provedor de mapas.

🛠️ Stack tecnológica proposta

A stack está em fase de validação. A proposta atual é:

Componente

Tecnologia

Plataforma

Android

Framework mobile

React Native

Framework de desenvolvimento

Expo

Linguagem

TypeScript

Navegação

Expo Router

Backend/BaaS

Supabase

Banco de dados

PostgreSQL

Dados geográficos

PostGIS (em validação)

Mapas

Google Maps (em POC)

PDF

A definir

Observação

A escolha do provedor de mapas ainda está sendo validada por meio de uma POC. A arquitetura utiliza uma abstração para evitar acoplamento direto ao fornecedor.

🗄️ Modelo de dados

O modelo conceitual atual possui as seguintes entidades:

USUARIO
CLIENTE
ENDERECO
SERVICO
PRODUTO
ORCAMENTO
ITEM_ORCAMENTO
AREA

Relacionamento principal:

USUARIO
 ├── CLIENTE
 │     └── ENDERECO
 │
 ├── SERVICO
 │
 ├── PRODUTO
 │
 └── ORCAMENTO
        │
        └── ITEM_ORCAMENTO
               │
               └── AREA

Snapshot dos itens

Os itens do orçamento armazenam seus próprios dados históricos:

SERVICO / PRODUTO
       ↓
  ItemOrcamento
       ↓
descrição
unidade
quantidade
valor unitário
valor total

Alterações posteriores no catálogo não modificam os dados já utilizados em um orçamento.

📐 Modelagem e documentação

O projeto possui documentação de análise e modelagem incluindo:

Regras de negócio;

Requisitos funcionais;

Requisitos não funcionais;

Diagrama de casos de uso;

Diagrama de classes;

Diagramas de sequência;

Diagramas de atividades;

Diagrama de estados;

Diagrama Entidade-Relacionamento;

Arquitetura conceitual;

Arquitetura técnica em fase de definição.

🧪 Prova de Conceito (POC)

A primeira POC tem como objetivo validar o componente geográfico antes da implementação completa do sistema.

Fluxo da POC

Android
  ↓
React Native + Expo
  ↓
Mapa
  ↓
Modo satélite
  ↓
Posicionamento
  ↓
Desenho de polígono
  ↓
Edição do polígono
  ↓
Obtenção das coordenadas
  ↓
Cálculo de área em m²

A POC não representa o aplicativo final. Seu objetivo é reduzir o risco técnico da solução de mapas antes da implementação das demais funcionalidades.

📌 Escopo atual

O foco inicial do projeto é:

Clientes
    +
Serviços
    +
Produtos
    +
Orçamentos
    +
Medição de áreas
    +
PDF

Funcionalidades como WhatsApp, estoque, pagamentos, CRM, notificações e outros módulos administrativos podem ser consideradas em versões futuras, mas não fazem parte do escopo principal atual.

🚀 Roadmap

Fase 1 — Modelagem

Regras de negócio

Requisitos funcionais

Requisitos não funcionais

UML

DER

Arquitetura conceitual

Fase 2 — Validação técnica

Arquitetura técnica

POC do mapa

Validação do provedor de mapas

Definição da estratégia de geocodificação

Definição da solução de PDF

Fase 3 — Implementação

Estrutura inicial do projeto

Autenticação

Clientes

Serviços

Produtos

Orçamentos

Cálculos

Medição de áreas

Status

Duplicação

PDF

Compartilhamento

Fase 4 — Testes e apresentação

Testes funcionais

Testes de integração

Validação da medição

Testes do PDF

Testes em dispositivos Android

Documentação final

🤖 Desenvolvimento com IA

O projeto está sendo estruturado para permitir desenvolvimento assistido por agentes de IA.

A abordagem adotada é incremental:

Regra de negócio
      ↓
Requisito
      ↓
Caso de uso
      ↓
Entidade/componente
      ↓
Tarefa de implementação
      ↓
Teste

A intenção é evitar que um agente tente implementar todo o sistema de uma única vez. Cada módulo deve possuir contexto, responsabilidades e critérios de aceitação bem definidos.

📄 Status do projeto

Em desenvolvimento / prova de conceito

Este repositório representa a evolução de um projeto acadêmico. A arquitetura e algumas tecnologias ainda podem sofrer ajustes durante a validação técnica.

📚 Objetivo acadêmico

O projeto busca aplicar conceitos de:

Engenharia de Software;

Levantamento e especificação de requisitos;

Modelagem UML;

Modelagem de banco de dados;

Arquitetura de software;

Desenvolvimento mobile;

Integração com serviços externos;

Geoprocessamento aplicado a uma necessidade de negócio.
