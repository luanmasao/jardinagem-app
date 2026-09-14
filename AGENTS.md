# Projeto de Orçamento para Jardinagem

## 1. Objetivo

Este projeto é um aplicativo React Native para Android destinado ao gerenciamento de clientes, serviços, produtos, áreas de serviço e criação de orçamentos para empresas ou profissionais de jardinagem.

O sistema poderá futuramente utilizar mapas e imagens de satélite para auxiliar na definição de áreas de serviço, calcular valores, gerar orçamentos em PDF e integrar-se com serviços externos.

## 2. Fonte da verdade

Antes de implementar regras de negócio, consulte a documentação em `docs/`.

As seguintes fontes devem ser consideradas:

1. requisitos;
2. regras de negócio;
3. arquitetura;
4. modelo de banco de dados;
5. diagramas UML;
6. código existente.

Não invente requisitos ou regras de negócio que não estejam documentados.

Quando houver conflito entre documentação e código, informe o conflito antes de realizar uma alteração estrutural.

## 3. Escopo das tarefas

Implemente somente o que foi solicitado.

Não adicione funcionalidades futuras sem solicitação.

Não faça grandes refatorações apenas por preferência pessoal.

Evite alterar arquivos que não sejam necessários para a tarefa.

## 4. Análise antes da implementação

Antes de uma alteração relevante:

1. examine a estrutura do projeto;
2. localize os arquivos relacionados;
3. consulte a documentação relevante;
4. identifique possíveis impactos;
5. apresente um plano breve;
6. somente então implemente.

Para tarefas pequenas e claramente isoladas, não é necessário produzir um plano extenso.

## 5. Arquitetura

Respeite a arquitetura existente.

Não introduza novos padrões arquiteturais, bibliotecas ou camadas sem necessidade.

Regras de negócio importantes devem permanecer separadas da interface sempre que possível.

Cálculos do domínio devem ser implementados de forma que possam ser testados independentemente da interface.

## 6. Dependências

Antes de adicionar uma dependência:

* verificar se o projeto já possui uma solução equivalente;
* explicar o problema que a nova dependência resolve;
* avaliar se ela é realmente necessária.

Não substituir bibliotecas existentes sem justificar a mudança.

## 7. Segurança

Nunca colocar chaves secretas, senhas, tokens ou credenciais diretamente no código versionado.

Não modificar configurações de segurança sem explicar o motivo.

## 8. Validação

Depois de alterações relevantes:

* executar TypeScript/typecheck;
* executar lint;
* executar testes relacionados;
* verificar a aplicação no Android quando a alteração afetar a interface ou comportamento mobile.

Uma funcionalidade não deve ser considerada concluída apenas porque o código foi gerado.

## 9. Git

Manter alterações pequenas e coerentes.

Não misturar funcionalidades independentes no mesmo commit.

Antes de sugerir um commit, verificar os arquivos modificados.

## 10. Comunicação

Ao finalizar uma tarefa, informar:

* o que foi implementado;
* arquivos modificados;
* validações executadas;
* problemas encontrados;
* decisões importantes tomadas.

Quando uma informação necessária não estiver disponível, não invente uma resposta. Informe a ausência da informação.

## 11. Princípio geral

Priorizar:

clareza > complexidade

simplicidade > abstração desnecessária

código compreensível > código excessivamente sofisticado

pequenas alterações > grandes alterações

código testado > código apenas gerado
