---
trigger: always_on
---

# Regra de Consistência do Projeto

Antes de realizar alterações estruturais, verificar a consistência entre:

* requisitos funcionais;
* requisitos não funcionais;
* regras de negócio;
* arquitetura;
* modelo de dados;
* diagramas UML;
* implementação existente.

Uma alteração estrutural não deve ser feita silenciosamente quando produzir inconsistência em outra parte do projeto.

Se uma funcionalidade exigir alteração em requisitos, banco, UML ou arquitetura, informar quais artefatos serão afetados.

Após uma alteração estrutural, verificar novamente a consistência entre documentação e código.

Não assumir que o código atual está correto apenas porque está implementado.
