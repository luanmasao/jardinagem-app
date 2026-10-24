---
trigger: model_decision
---

# Regras de Testes

## 1. Objetivo

Garantir que alterações no sistema sejam verificadas antes de serem consideradas concluídas.

## 2. Prioridade

Dar prioridade a testes de:

* regras de negócio;
* cálculos;
* validações;
* transformações de dados;
* comportamentos críticos.

## 3. Domínio e orçamento

Os cálculos relacionados ao orçamento devem ser testáveis isoladamente.

Devem ser cobertos, conforme aplicável:

* subtotal de item;
* total do orçamento;
* quantidade × preço;
* cálculo relacionado a área;
* regras de precificação;
* descontos percentual e fixo;
* limites dos descontos;
* total não negativo;
* transições de estado relevantes;
* validações para envio;
* preservação do snapshot histórico do item.

## 4. Áreas e medição

As regras de medição de área devem possuir testes para os comportamentos relevantes, incluindo:

* criação de uma área;
* múltiplas áreas para um item;
* alteração de área;
* remoção de área;
* soma das áreas;
* sincronização da quantidade de item medido;
* recálculo do valor do item após alteração de área.

Para itens com `usa_medicao_area = TRUE`, o teste deve verificar a relação entre a soma das áreas e `ITEM_ORCAMENTO.quantidade`.

Para produtos e serviços sem medição, testar a entrada e o uso de quantidade manual.

## 5. Geometria e PostGIS

Comportamentos espaciais críticos devem ser testados, conforme aplicável, incluindo:

* POLYGON válido;
* geometria inválida;
* geometria vazia;
* área geométrica zero ou inválida;
* cálculo de área em m²;
* alteração da geometria;
* recálculo de `area_calculada`;
* impacto da alteração geométrica na quantidade do item.

A estratégia de teste deve considerar que as áreas utilizam PostGIS e geometria `POLYGON` em EPSG:4326.

## 6. Segurança e RLS

Testar o isolamento entre usuários quando houver alterações em autenticação, autorização, banco ou políticas RLS.

Os cenários relevantes devem verificar que:

* um usuário não acessa dados pertencentes a outro usuário;
* associações protegidas não permitem acesso cruzado;
* operações autorizadas continuam funcionando para o proprietário correto.

## 7. Banco e migrations

Alterações estruturais no banco devem ser validadas antes de serem consideradas concluídas.

Quando aplicável, verificar:

* ordem de criação e dependências;
* tabelas e colunas esperadas;
* chaves primárias e estrangeiras;
* constraints;
* índices;
* RLS;
* recursos PostGIS;
* compatibilidade com o Modelo Físico vigente.

## 8. Testes de integração

Usar testes de integração quando o comportamento depender da interação entre componentes ou infraestrutura e não puder ser protegido adequadamente apenas por testes unitários.

Exemplos relevantes incluem integração entre:

* casos de uso e repositórios;
* Supabase e PostgreSQL;
* PostgreSQL e PostGIS;
* operações sujeitas a RLS;
* persistência de áreas e atualização de quantidade/valores.

## 9. Alterações

Ao modificar uma regra existente:

1. localizar os testes relacionados;
2. verificar se continuam válidos;
3. atualizar ou criar testes quando necessário;
4. executar os testes.

## 10. Interface

Testes de interface devem ser usados quando houver comportamento relevante que não possa ser protegido adequadamente por testes de domínio, integração ou outras formas de validação mais apropriadas.

## 11. Conclusão

Não considerar uma tarefa concluída se uma alteração relevante introduzir uma falha conhecida nos testes.

A conclusão de uma alteração relevante deve considerar também a consistência com a documentação vigente e, quando aplicável, com a estrutura real do banco.
