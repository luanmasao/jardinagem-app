# Artefato Técnico B — Modelo Físico v1.1

**Projeto:** Sistema de Orçamentos para Jardinagem  
**Artefato:** B — Modelo Físico  
**Versão:** 1.1  
**Status:** Consolidado e aprovado para implementação  
**SGBD:** PostgreSQL  
**Extensão espacial:** PostGIS  
**Backend/BaaS:** Supabase

---

## 1. Objetivo

O Modelo Físico v1.1 consolida a estrutura de dados do sistema para futura implementação em PostgreSQL/PostGIS no Supabase.

Esta versão incorpora as decisões da revisão do Modelo Físico v1 e deve ser utilizada como referência oficial para a futura migration do Supabase.

---

## 2. Stack relacionada ao modelo

- Android
- React Native
- Expo
- TypeScript
- Expo Router
- Supabase
- Supabase Auth
- PostgreSQL
- PostGIS
- Supabase Row Level Security (RLS)
- Google Maps
- react-native-maps

O modelo físico é independente da implementação da interface e representa apenas a estrutura persistente de dados.

---

## 3. Entidades

O modelo possui oito entidades principais:

1. `USUARIO`
2. `CLIENTE`
3. `ENDERECO`
4. `SERVICO`
5. `PRODUTO`
6. `ORCAMENTO`
7. `ITEM_ORCAMENTO`
8. `AREA`

Estrutura dos relacionamentos:

```text
SUPABASE AUTH
      |
      | 1:1
      v
   USUARIO
      |
      +---- CLIENTE
      |       |
      |       +---- ENDERECO
      |
      +---- SERVICO
      |
      +---- PRODUTO
      |
      +---- ORCAMENTO
               |
               +---- ITEM_ORCAMENTO
                       |
                       +---- AREA
```

---

## 4. USUARIO

A autenticação e as credenciais são responsabilidade do Supabase Auth.

### Atributos

| Campo | Tipo | Obrigatório | Observação |
|---|---|---:|---|
| `id` | UUID | Sim | Mesmo identificador da identidade autenticada |
| `nome` | VARCHAR(150) | Sim | Nome do usuário |
| `telefone` | VARCHAR(30) | Não | Telefone |
| `data_cadastro` | TIMESTAMPTZ | Sim | Data/hora de cadastro |
| `ativo` | BOOLEAN | Sim | Indica se o usuário está ativo |

### Regras

- Não armazenar senha em `USUARIO`.
- Não duplicar o email do Supabase Auth em `USUARIO`.
- `USUARIO.id` corresponde à identidade autenticada do Supabase Auth.

---

## 5. CLIENTE

Representa o cliente atendido pelo usuário da aplicação.

### Atributos

| Campo | Tipo | Obrigatório |
|---|---|---:|
| `id` | UUID | Sim |
| `usuario_id` | UUID | Sim |
| `nome` | VARCHAR(150) | Sim |
| `telefone` | VARCHAR(30) | Não |
| `email` | VARCHAR(255) | Não |
| `documento` | VARCHAR(30) | Não |
| `observacoes` | TEXT | Não |
| `ativo` | BOOLEAN | Sim |

### Relacionamento

`USUARIO 1 : N CLIENTE`

---

## 6. ENDERECO

Representa o endereço associado ao cliente.

### Atributos

| Campo | Tipo | Obrigatório |
|---|---|---:|
| `id` | UUID | Sim |
| `cliente_id` | UUID | Sim |
| `cep` | VARCHAR(10) | Não |
| `logradouro` | VARCHAR(200) | Não |
| `numero` | VARCHAR(20) | Não |
| `complemento` | VARCHAR(100) | Não |
| `bairro` | VARCHAR(100) | Não |
| `cidade` | VARCHAR(100) | Não |
| `estado` | VARCHAR(2) | Não |
| `latitude` | NUMERIC(9,6) | Não |
| `longitude` | NUMERIC(9,6) | Não |

### Regras

- Um cliente possui no máximo um endereço.
- `cliente_id` é único.
- Latitude e longitude representam a localização do endereço, não a área de trabalho.

### Relacionamento

`CLIENTE 1 : 0..1 ENDERECO`

---

## 7. SERVICO

Representa um serviço do catálogo do usuário.

### Atributos

| Campo | Tipo | Obrigatório |
|---|---|---:|
| `id` | UUID | Sim |
| `usuario_id` | UUID | Sim |
| `nome` | VARCHAR(150) | Sim |
| `descricao` | TEXT | Não |
| `unidade` | VARCHAR(30) | Sim |
| `preco_base` | NUMERIC(10,2) | Sim |
| `usa_medicao_area` | BOOLEAN | Sim |
| `ativo` | BOOLEAN | Sim |

### Regras

- `preco_base >= 0`.
- `usa_medicao_area` representa a configuração atual do serviço no catálogo.
- Serviços utilizados por orçamentos históricos não devem ser removidos fisicamente quando isso comprometer o histórico.

### Relacionamento

`USUARIO 1 : N SERVICO`

---

## 8. PRODUTO

Representa um produto do catálogo do usuário.

### Atributos

| Campo | Tipo | Obrigatório |
|---|---|---:|
| `id` | UUID | Sim |
| `usuario_id` | UUID | Sim |
| `nome` | VARCHAR(150) | Sim |
| `descricao` | TEXT | Não |
| `unidade` | VARCHAR(30) | Sim |
| `preco_base` | NUMERIC(10,2) | Sim |
| `ativo` | BOOLEAN | Sim |

### Regras

- `preco_base >= 0`.
- Produtos utilizados por orçamentos históricos não devem ser removidos fisicamente quando isso comprometer o histórico.

### Relacionamento

`USUARIO 1 : N PRODUTO`

---

## 9. ORCAMENTO

Representa a proposta comercial.

### Atributos

| Campo | Tipo | Obrigatório |
|---|---|---:|
| `id` | UUID | Sim |
| `usuario_id` | UUID | Sim |
| `cliente_id` | UUID | Sim |
| `numero` | VARCHAR(30) | Sim |
| `data_criacao` | TIMESTAMPTZ | Sim |
| `data_validade` | DATE | Não |
| `status` | STATUS_ORCAMENTO | Sim |
| `subtotal` | NUMERIC(12,2) | Sim |
| `tipo_desconto` | TIPO_DESCONTO | Não |
| `valor_desconto` | NUMERIC(12,2) | Sim |
| `total` | NUMERIC(12,2) | Sim |
| `observacoes` | TEXT | Não |
| `condicoes_pagamento` | TEXT | Não |

### Regras

- A combinação `usuario_id + numero` é única.
- `subtotal >= 0`.
- `valor_desconto >= 0`.
- `total >= 0`.
- `data_validade` pode ser `NULL` enquanto o orçamento estiver em `RASCUNHO`.
- Ao sair de `RASCUNHO`, o orçamento deve possuir validade válida.
- A data de validade não pode ser anterior à data civil de criação.
- `RASCUNHO` não expira.
- A lógica de transição de status pertence ao domínio/aplicação.

### Relacionamentos

- `USUARIO 1 : N ORCAMENTO`
- `CLIENTE 1 : N ORCAMENTO`

---

## 10. Status do orçamento

O domínio utiliza os seguintes estados:

```text
RASCUNHO
ENVIADO
EM_ANALISE
APROVADO
RECUSADO
EXPIRADO
CANCELADO
CONCLUIDO
```

O enum garante o conjunto válido de estados. As transições são responsabilidade da lógica de domínio/aplicação.

---

## 11. ITEM_ORCAMENTO

Representa o item histórico incluído em um orçamento.

### Atributos

| Campo | Tipo | Obrigatório | Observação |
|---|---|---:|---|
| `id` | UUID | Sim | Identificador |
| `orcamento_id` | UUID | Sim | Orçamento proprietário |
| `servico_id` | UUID | Não | Preenchido para item de serviço |
| `produto_id` | UUID | Não | Preenchido para item de produto |
| `tipo` | TIPO_ITEM | Sim | `SERVICO` ou `PRODUTO` |
| `descricao` | VARCHAR(255) | Sim | Snapshot histórico |
| `quantidade` | NUMERIC(12,2) | Sim | Manual ou calculada |
| `unidade` | VARCHAR(30) | Sim | Snapshot histórico |
| `valor_unitario` | NUMERIC(12,2) | Sim | Snapshot histórico |
| `valor_total` | NUMERIC(12,2) | Sim | Snapshot histórico |
| `usa_medicao_area` | BOOLEAN | Sim | Snapshot histórico |

### Regras

- O item referencia exatamente um serviço ou um produto.
- `servico_id` e `produto_id` são opcionais individualmente.
- A combinação válida é `SERVICO XOR PRODUTO`.
- O serviço/produto referenciado deve pertencer ao mesmo usuário do orçamento.
- `usa_medicao_area` preserva o comportamento do serviço no momento em que o item foi criado.
- Alterações posteriores no catálogo não devem modificar os dados históricos do item.

### Relacionamento

`ORCAMENTO 1 : N ITEM_ORCAMENTO`

---

## 12. Quantidade do ITEM_ORCAMENTO

Há dois comportamentos:

### Item medido

Quando:

```text
usa_medicao_area = TRUE
```

a quantidade é derivada da soma das áreas:

```text
quantidade = Σ area_calculada
```

A quantidade não é alterada manualmente.

### Item não medido

Para:

- produto;
- serviço sem medição;

a quantidade é informada manualmente.

---

## 13. AREA

Representa uma área de trabalho delimitada no mapa.

### Atributos

| Campo | Tipo | Obrigatório |
|---|---|---:|
| `id` | UUID | Sim |
| `item_orcamento_id` | UUID | Sim |
| `nome` | VARCHAR(150) | Não |
| `geometria` | GEOMETRY(POLYGON,4326) | Sim |
| `area_calculada` | NUMERIC(12,2) | Sim |
| `unidade` | VARCHAR(30) | Sim |
| `observacoes` | TEXT | Não |

### Regras

- `geometria` é obrigatória.
- A geometria deve ser um `POLYGON`.
- O SRID utilizado é `4326`.
- A geometria não deve ser vazia.
- A geometria deve ser topologicamente válida.
- A área geométrica deve ser maior que zero.
- `area_calculada` representa a área da geometria em metros quadrados.
- Uma área somente pode pertencer a um item de serviço cujo `usa_medicao_area` seja `TRUE`.

### Relacionamento

`ITEM_ORCAMENTO 1 : N AREA`

---

## 14. Cálculo espacial

A cadeia espacial é:

```text
Google Maps
    ↓
POLYGON
    ↓
AREA.geometria
    ↓
cálculo da área
    ↓
AREA.area_calculada
    ↓
soma das áreas
    ↓
ITEM_ORCAMENTO.quantidade
```

Para o armazenamento:

```text
GEOMETRY(POLYGON, 4326)
```

Para o cálculo comercial:

```text
área em metros quadrados
```

---

## 15. Cálculo financeiro

### Item

```text
valor_total = quantidade × valor_unitario
```

### Orçamento

```text
subtotal = Σ valor_total dos itens
```

### Desconto percentual

```text
desconto = subtotal × percentual / 100
```

### Desconto fixo

```text
desconto = valor informado
```

### Total

```text
total = subtotal - desconto
```

O total nunca poderá ser negativo.

---

## 16. Descontos

### Sem desconto

```text
tipo_desconto = NULL
valor_desconto = 0
```

### Percentual

```text
tipo_desconto = PERCENTUAL
0 <= valor_desconto <= 100
```

### Fixo

```text
tipo_desconto = FIXO
0 <= valor_desconto <= subtotal
```

---

## 17. Exclusão e preservação histórica

Serviços, produtos e clientes possuem controle lógico por `ativo`.

Quando existirem dependências históricas, a estratégia preferencial é a desativação, evitando a remoção física.

Para dependências internas:

```text
ORCAMENTO
    ↓
ITEM_ORCAMENTO
    ↓
AREA
```

as regras de exclusão devem preservar a integridade do histórico e evitar registros órfãos.

---

## 18. Segurança e isolamento

A autenticação utiliza:

```text
Supabase Auth
```

O isolamento de dados utiliza:

```text
Supabase Row Level Security (RLS)
```

A referência da identidade autenticada é:

```text
auth.uid()
        =
USUARIO.id
```

A propriedade direta está em:

```text
CLIENTE.usuario_id
SERVICO.usuario_id
PRODUTO.usuario_id
ORCAMENTO.usuario_id
```

`ITEM_ORCAMENTO` e `AREA` não duplicam `usuario_id`.

A propriedade dessas entidades é determinada pela cadeia:

```text
AREA
 ↓
ITEM_ORCAMENTO
 ↓
ORCAMENTO
 ↓
USUARIO
```

---

## 19. Índices

Devem existir índices para os principais relacionamentos e consultas:

- `CLIENTE.usuario_id`
- `SERVICO.usuario_id`
- `PRODUTO.usuario_id`
- `ORCAMENTO.usuario_id`
- `ORCAMENTO.cliente_id`
- `ORCAMENTO.status`
- `ITEM_ORCAMENTO.orcamento_id`
- `ITEM_ORCAMENTO.servico_id`
- `ITEM_ORCAMENTO.produto_id`
- `AREA.item_orcamento_id`

Para `AREA.geometria`, utilizar índice espacial compatível com PostGIS.

---

## 20. Consistência com os artefatos anteriores

O Modelo Físico v1.1 deve permanecer consistente com:

```text
RN v3
RF v2
RNF v2
UML v3.1
DER v1.1
Arquitetura Técnica v1.1
```

A cadeia de implementação é:

```text
Modelo Físico v1.1
        ↓
migration Supabase
        ↓
banco PostgreSQL/PostGIS
```

A migration não deve redefinir o modelo por conveniência de implementação.

---

## 21. Decisões consolidadas

Esta versão consolida as seguintes decisões:

1. Supabase Auth é responsável pela autenticação.
2. `USUARIO` não armazena senha.
3. `USUARIO` não duplica o email do Auth.
4. `USUARIO.id` corresponde à identidade autenticada.
5. RLS isola dados por usuário.
6. `ITEM_ORCAMENTO` não possui `usuario_id` redundante.
7. `AREA` não possui `usuario_id` redundante.
8. Item é `SERVICO XOR PRODUTO`.
9. `usa_medicao_area` do item é snapshot histórico.
10. Área só existe para serviço medido.
11. Quantidade de item medido é derivada das áreas e persistida.
12. Quantidade de produto/serviço não medido é manual.
13. Geometria é `POLYGON` em EPSG:4326.
14. Geometria deve ser válida, não vazia e ter área maior que zero.
15. `area_calculada` representa a área da geometria em m².
16. `data_validade` pode ser nula em `RASCUNHO`.
17. Orçamento enviado precisa de validade válida.
18. `RASCUNHO` não expira.
19. Desconto percentual é limitado a 100.
20. Desconto fixo é limitado ao subtotal.
21. Sem desconto é representado por `NULL + 0`.
22. Total não pode ser negativo.
23. O histórico de itens é independente do estado atual do catálogo.
24. O PDF não é uma entidade do banco.

---

## 22. Status do artefato

**Modelo Físico v1.1 — CONSOLIDADO.**

Este documento é a referência de estrutura do banco para a próxima etapa de implementação.

**Importante:** a criação da migration ainda é uma etapa separada e deve ocorrer somente no diretório do projeto, no Antigravity, após autorização específica.
