---
trigger: model_decision
---

# Regras de Testes

## Objetivo

Garantir que alterações no sistema sejam verificadas antes de serem consideradas concluídas.

## Prioridade

Dar prioridade a testes de:

* regras de negócio;
* cálculos;
* validações;
* transformações de dados;
* comportamentos críticos.

## Orçamento

Os cálculos relacionados ao orçamento devem ser testáveis isoladamente.

Exemplos:

* subtotal de item;
* total do orçamento;
* quantidade × preço;
* cálculo relacionado a área;
* regras de precificação.

## Alterações

Ao modificar uma regra existente:

1. localizar os testes relacionados;
2. verificar se continuam válidos;
3. atualizar ou criar testes quando necessário;
4. executar os testes.

## Interface

Testes de interface devem ser usados quando houver comportamento relevante que não possa ser protegido adequadamente por testes de domínio.

## Conclusão

Não considerar uma tarefa concluída se uma alteração relevante introduzir uma falha conhecida nos testes.
