# Adendo à Arquitetura Técnica — Operação sem conexão

Versão: 1.0 (proposta, aguardando aprovação)
Data: 2026-10-22
Requisitos atendidos: RNF36–RNF40 (RNF v3), RF83–RF87 (RF v3), RN82–RN84.

Este adendo descreve a camada offline do aplicativo. A Arquitetura Técnica v1.1 não está disponível em `docs/`; quando estiver, este conteúdo deve ser incorporado a ela como uma nova versão (v1.2).

---

## 1. Escopo

Disponível sem conexão:

- consulta de serviços, produtos e clientes, a partir da última cópia obtida do servidor;
- consulta dos orçamentos já carregados no dispositivo;
- criação de orçamento em RASCUNHO;
- edição de rascunho: itens, quantidades, descrição e valor unitário dos itens, desconto, validade, observações e condições de pagamento;
- geração e compartilhamento do PDF de orçamentos já sincronizados, a partir da cópia local.

Não disponível para rascunho pendente de sincronização: geração e compartilhamento de PDF, porque o número provisório não identifica o orçamento de forma definitiva (RNF33, RN82).

Exige conexão:

- login e cadastro de usuário;
- cadastro e edição de clientes, serviços e produtos;
- alteração de status e exclusão de orçamentos (RN83);
- duplicação de orçamento;
- geocodificação de endereços.

Limitação conhecida: as imagens de satélite do mapa exigem internet. A delimitação de áreas sem conexão depende de o mapa já estar em cache no dispositivo. O cálculo da área é local e não depende de conexão.

---

## 2. Decisões

| ID | Decisão | Motivo |
|---|---|---|
| D-OFF-01 | Armazenamento local em AsyncStorage, cifrado com o mesmo esquema da `LargeSecureStore` (chave AES-256 no SecureStore, dados cifrados no AsyncStorage). | O volume de dados de um usuário é pequeno; AsyncStorage já é dependência do projeto; a cifragem atende RNF09/RNF38 sem nova biblioteca. |
| D-OFF-02 | O orçamento é sincronizado como um agregado completo (orçamento + itens + áreas), e não operação por operação. | Mantém a consistência entre áreas, quantidades e valores (RNF19/RNF20) e simplifica a recuperação de falhas. |
| D-OFF-03 | Os identificadores (UUID) de orçamento, item e área são gerados no dispositivo. | Permite referenciar o rascunho antes de existir no servidor e torna o reenvio idempotente (RNF39). O Modelo Físico define `gen_random_uuid()` apenas como valor padrão, então não há mudança no banco. |
| D-OFF-04 | Número provisório local; número definitivo atribuído na sincronização (RN82). Se o usuário informou um número manualmente, ele é mantido; em caso de colisão, o rascunho recebe o próximo número automático e o usuário é avisado da troca. | Só o servidor garante a unicidade `usuario_id + numero` (RN22). O número provisório nunca é gravado no servidor. A tela de edição não permite alterar o número, então manter o rascunho pendente até o usuário corrigi-lo o deixaria preso. |
| D-OFF-05 | "Pendente de sincronização" é uma marca técnica local, não um status do orçamento (RN84). | O enum `STATUS_ORCAMENTO` e o diagrama de estados não mudam. |
| D-OFF-06 | Conflitos: prevalece a última versão sincronizada do rascunho. Exceção: se no servidor o orçamento já saiu de RASCUNHO (ex.: enviado por outro aparelho), as alterações locais são descartadas e o usuário é avisado. | O cenário esperado é um único dispositivo por usuário; não há coluna de controle de versão no Modelo Físico v1.1. |
| D-OFF-07 | O usuário corrente é obtido da sessão persistida no dispositivo quando não houver conexão; o último perfil carregado também fica guardado localmente. | `auth.getUser()` exige rede. A segurança dos dados continua garantida pela RLS, que valida o token quando os dados chegam ao servidor (RNF07). |
| D-OFF-08 | Conectividade detectada com `expo-network` (módulo oficial do Expo SDK 57). | Permite exibir o aviso de operação sem conexão (RNF40) e disparar a sincronização ao reconectar (RF85). |
| D-OFF-09 | Os dados locais ficam separados por usuário e são apagados no logout, com aviso prévio quando houver rascunhos pendentes (RNF38, RF87). | Evita que outro usuário no mesmo aparelho acesse os dados (RN02). |

---

## 3. Componentes por camada

**Domain** — sem mudanças. Entidades, cálculos e interfaces de repositório (`src/domain/repositories/`) continuam os mesmos.

**Application**

- Casos de uso inalterados: rodam sobre as mesmas interfaces de repositório, com ou sem conexão.
- `SincronizacaoService`: envia os rascunhos pendentes ao servidor (seção 4).
- `AuthService`: usuário corrente obtido da sessão local quando não houver conexão (D-OFF-07).

**Infrastructure** (`src/infrastructure/offline/`)

- Armazenamento local cifrado (D-OFF-01). Diferente da `LargeSecureStore`, falhas de gravação são propagadas, e não substituídas por memória, para não perder rascunhos em silêncio (RNF39).
- Serviço de conectividade (D-OFF-08).
- Repositórios de serviço, produto e cliente com cópia local (`CopiaLocalDeLista`): leem do Supabase quando há conexão e guardam a cópia; sem conexão, devolvem a cópia. Só falhas de conexão usam a cópia; erros do servidor (RLS, validação) são repassados. Cadastros continuam exigindo conexão e, sem ela, lançam `SemConexaoError` com mensagem para o usuário. Escritas bem-sucedidas atualizam a cópia.
- Repositórios offline de orçamento, item e área: implementam as interfaces do domínio e gravam o agregado no armazenamento local quando não há conexão ou quando o rascunho já tem pendências. Também passam para o aparelho quando a conexão cai no meio de uma operação. Com conexão, cada alteração confirmada pelo servidor é aplicada também à cópia local do orçamento, para que uma edição offline seguinte parta da versão atual. Todo orçamento aberto com conexão fica guardado para consulta sem conexão.
- Os casos de uso continuam os mesmos: a entidade reconstruída a partir da cópia local recalcula quantidades medidas e totais, então as regras do domínio valem sem conexão.

**Presentation**

- Aviso de operação sem conexão (faixa no rodapé das telas do app) e contador de rascunhos pendentes (RNF40).
- Pré-carregamento: ao entrar no app com conexão, e sempre que ela volta, o catálogo e os clientes são buscados para renovar a cópia local, mesmo que o usuário não abra essas telas (RNF36).
- Ação "Sincronizar agora" (RF86).
- Aviso no logout quando houver pendências (RF87).

---

## 4. Sincronização

Gatilhos: conexão restabelecida, aplicativo voltando ao primeiro plano e solicitação do usuário.

Para cada rascunho pendente, em ordem de criação:

1. Consultar o orçamento no servidor. Se ele existir e não estiver mais em RASCUNHO, descartar as alterações locais (RN65, D-OFF-06), guardar a versão do servidor e avisar o usuário.
2. Se o número for provisório, obter o próximo número no servidor (ou reaproveitar o que um envio anterior interrompido já gravou).
3. Gravar o orçamento por `id` (insert ou update). Se o número já existir para o usuário, obter o próximo e avisar (D-OFF-04).
4. Remover do servidor os itens que não estão mais no rascunho (as áreas deles caem em cascata) e gravar os itens por `id`.
5. Remover do servidor as áreas que não estão mais nos itens do rascunho e gravar as áreas por `id`.
6. Em caso de sucesso, trocar o rascunho local pela versão do servidor (sem a marca de pendente). Se o rascunho foi editado durante o envio, ele continua pendente, já com o número definitivo, para enviar a nova versão na próxima vez.
7. Em caso de falha, manter o rascunho pendente e tentar novamente no próximo gatilho. Falta de conexão interrompe a rodada; outras falhas são informadas ao usuário.

Os passos 3 a 5 são requisições separadas: se a conexão cair no meio, o servidor pode ficar por um momento com parte do rascunho, até o próximo envio completá-lo. Fazer tudo numa transação exigiria uma função no banco, o que mudaria o Modelo Físico; por isso não foi feito.

Interface: a faixa no rodapé mostra quantos rascunhos estão pendentes, o andamento da sincronização e o botão "Sincronizar" (RF86). O resultado é informado num aviso quando pede atenção (descarte, troca de número ou erro que não é falta de conexão) ou quando o usuário pediu a sincronização.

A gravação por `id` torna o reenvio seguro: repetir um passo já concluído não duplica registros. As policies RLS existentes de `orcamento`, `item_orcamento` e `area` já permitem insert, update e delete do próprio usuário em RASCUNHO; não é necessária nova migration.

---

## 5. Impacto nos demais artefatos

| Artefato | Impacto |
|---|---|
| RNF v3 | Seção 12, RNF36–RNF40. |
| RF v3 | Seção 16, RF83–RF87. |
| Regras de negócio | Seção 13, RN82–RN84. |
| UML — casos de uso | Caso de uso "Sincronizar rascunhos". |
| UML — sequência | Trechos "Operação sem conexão" e "Sincronização de rascunhos". |
| UML — estados | Sem mudança (D-OFF-05). |
| DER v1.1 / Modelo Físico v1.1 | Sem mudança (D-OFF-03, D-OFF-06). |
