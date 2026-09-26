# Projeto de Orçamento para Jardinagem

## 1. Objetivo

Este projeto é um aplicativo React Native para Android destinado ao gerenciamento de clientes, serviços, produtos, áreas de serviço e criação de orçamentos para empresas ou profissionais de jardinagem.

O sistema utiliza mapas e imagens de satélite para auxiliar na definição de áreas de serviço, calcular valores relacionados à medição de área, gerar orçamentos em PDF e, futuramente, integrar-se com serviços externos adicionais.

O POC de mapas validou o fluxo técnico de uso do Google Maps com `react-native-maps`, incluindo modo Satellite, posicionamento, desenho/edição de polígonos, obtenção de coordenadas e cálculo de área. O armazenamento espacial do projeto utiliza PostGIS.

## 2. Fonte da verdade

Antes de implementar regras de negócio ou realizar alterações estruturais, consulte a documentação vigente em `docs/` e a implementação existente quando aplicável.

As fontes oficiais devem ser consideradas de acordo com o seguinte conjunto e suas versões vigentes:

1. requisitos funcionais;
2. requisitos não funcionais;
3. regras de negócio;
4. arquitetura técnica;
5. modelo de dados/DER;
6. modelo físico;
7. diagramas UML;
8. código e testes existentes;
9. resultados de POCs, quando usados como evidência técnica.

Versões atualmente vigentes:

- RN v3;
- RF v2;
- RNF v2;
- UML v3.1;
- DER v1.1;
- Arquitetura Técnica v1.1;
- Modelo Físico v1.1.

Não invente requisitos ou regras de negócio que não estejam documentados.

Quando houver conflito entre documentos oficiais, entre documentação e código, ou entre documentação e estrutura real do banco, informe o conflito antes de realizar uma alteração estrutural. Não escolha arbitrariamente uma fonte para resolver o conflito.

## 3. Escopo das tarefas

Implemente somente o que foi solicitado.

Não adicione funcionalidades futuras sem solicitação.

Não faça grandes refatorações apenas por preferência pessoal.

Evite alterar arquivos que não sejam necessários para a tarefa.

Não altere requisitos, regras de negócio, arquitetura, UML, DER ou modelo físico apenas para facilitar uma implementação local.

## 4. Análise antes da implementação

Antes de uma alteração relevante:

1. examine a estrutura do projeto;
2. localize os arquivos relacionados;
3. consulte a documentação relevante e identifique as versões vigentes;
4. identifique possíveis impactos nos demais artefatos;
5. apresente um plano breve;
6. somente então implemente.

Para alterações estruturais de banco, consulte obrigatoriamente o Modelo Físico aprovado antes de criar ou modificar migrations.

Uma migration deve implementar o modelo aprovado, e não redefinir entidades, relacionamentos ou regras por iniciativa própria.

Para tarefas pequenas e claramente isoladas, não é necessário produzir um plano extenso.

## 5. Arquitetura

Respeite a arquitetura existente e a documentação de arquitetura vigente.

A arquitetura atual está organizada, quando aplicável, nas camadas:

- Presentation;
- Application;
- Domain;
- Infrastructure.

Não introduza novos padrões arquiteturais, bibliotecas ou camadas sem necessidade e sem análise de impacto.

Regras de negócio importantes devem permanecer separadas da interface sempre que possível.

Cálculos do domínio devem ser implementados de forma que possam ser testados independentemente da interface.

Integrações externas e detalhes de infraestrutura não devem ser acoplados desnecessariamente ao domínio.

## 6. Dependências

Antes de adicionar uma dependência:

* verificar se o projeto já possui uma solução equivalente;
* explicar o problema que a nova dependência resolve;
* avaliar se ela é realmente necessária.

Não substituir bibliotecas existentes sem justificar a mudança.

## 7. Segurança

Nunca colocar chaves secretas, senhas, tokens ou credenciais diretamente no código versionado.

A autenticação utiliza Supabase Auth.

A tabela `USUARIO` representa os dados de perfil da aplicação e não armazena senha nem duplica o email do Supabase Auth.

O identificador de `USUARIO` corresponde ao identificador da identidade autenticada do Supabase Auth.

O isolamento de dados utiliza Supabase Row Level Security (RLS).

Nunca colocar credenciais privilegiadas, incluindo `service_role`, no aplicativo Android ou em código distribuído ao cliente.

Não modificar configurações de segurança sem explicar o motivo.

## 8. Validação

Depois de alterações relevantes:

* executar TypeScript/typecheck;
* executar lint;
* executar testes relacionados;
* verificar a aplicação no Android quando a alteração afetar a interface ou comportamento mobile;
* para alterações de banco, validar migrations, constraints, chaves estrangeiras, RLS e recursos PostGIS conforme aplicável.

Uma funcionalidade não deve ser considerada concluída apenas porque o código foi gerado.

A validação deve considerar também a consistência com a documentação vigente.

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

documentação consistente > decisões implícitas
