---
trigger: always_on
---

# Regras de Arquitetura

## Objetivo

Manter a arquitetura do aplicativo simples, modular e compreensível para desenvolvedores iniciantes.

## Organização

Separar, quando aplicável:

* apresentação;
* componentes reutilizáveis;
* estado da aplicação;
* regras de negócio;
* acesso a dados;
* integrações externas.

Evitar colocar regras complexas diretamente em telas ou componentes visuais.

## Domínio

Regras relacionadas a:

* orçamento;
* itens de orçamento;
* serviços;
* produtos;
* áreas;
* cálculos de preço;

devem permanecer independentes da interface sempre que possível.

## Dependências

Evitar criar múltiplas soluções para o mesmo problema.

Antes de introduzir uma nova biblioteca, verificar se uma biblioteca já utilizada pelo projeto pode resolver a necessidade.

## Alterações estruturais

Alterações que afetem várias partes do sistema devem ser precedidas por análise de impacto.

Não alterar entidades, relacionamentos ou estrutura de dados apenas para facilitar uma implementação local.

Quando uma mudança de código exigir alteração nos requisitos, banco ou UML, informar essa necessidade explicitamente.

## Simplicidade

Não aplicar padrões arquiteturais complexos sem benefício claro.

O tamanho da abstração deve ser proporcional ao problema que ela resolve.
