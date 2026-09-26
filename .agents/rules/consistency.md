---
trigger: always_on
---

# Regra de Consistência do Projeto

## 1. Objetivo

Garantir que alterações no sistema mantenham consistência entre documentação, código, testes, migrations e estrutura real do banco.

## 2. Artefatos e versões vigentes

Antes de realizar alterações estruturais, verificar a consistência entre os artefatos oficiais e suas versões vigentes.

Atualmente:

- RN v3;
- RF v2;
- RNF v2;
- UML v3.1;
- DER v1.1;
- Arquitetura Técnica v1.1;
- Modelo Físico v1.1;
- implementação e testes existentes.

## 3. Cadeia de referência

A cadeia principal de consistência é:

`RN → RF → RNF → UML → DER → Arquitetura Técnica → Modelo Físico → implementação`.

Migrations e banco real devem permanecer consistentes com o Modelo Físico.

POCs podem servir como evidência para decisões técnicas da arquitetura, sem substituir requisitos ou regras de negócio.

## 4. Conflitos

Uma alteração estrutural não deve ser feita silenciosamente quando produzir inconsistência em outra parte do projeto.

Se houver conflito entre dois artefatos oficiais, entre documentação e código, entre documentação e testes ou entre documentação e banco, informar o conflito antes de escolher uma solução estrutural.

Não assumir que uma fonte está correta apenas porque foi criada mais recentemente ou porque já está implementada.

A versão vigente do artefato deve ser identificada antes de utilizá-lo como referência.

## 5. Análise de impacto

Se uma funcionalidade ou alteração estrutural exigir mudança em qualquer artefato, informar quais outros artefatos podem ser afetados.

Exemplos:

- mudança de regra pode afetar requisitos, UML, domínio e testes;
- mudança no DER pode afetar Modelo Físico, migration e implementação;
- mudança no Modelo Físico pode afetar migration, acesso a dados, testes e documentação relacionada;
- mudança na arquitetura pode afetar Modelo Físico, implementação e integrações;
- mudança em uma migration pode afetar o banco real e a implementação dependente de sua estrutura.

## 6. Banco e migrations

O Modelo Físico aprovado é a referência para a criação e evolução das migrations.

Uma migration não deve redefinir entidades, relacionamentos ou regras estruturais por conveniência da implementação.

Após uma migration relevante, verificar a consistência entre:

`Modelo Físico ↔ migration ↔ estrutura real do banco`.

Também verificar constraints, chaves estrangeiras, índices, RLS e recursos PostGIS quando aplicáveis.

## 7. Implementação e testes

Após uma alteração estrutural, verificar novamente a consistência entre documentação e código.

Quando uma alteração afetar regras, cálculos, validações ou comportamentos críticos, verificar também os testes correspondentes.

Não assumir que o código atual está correto apenas porque está implementado.

Não considerar a documentação consistente se o comportamento implementado contrariar uma regra oficial conhecida.