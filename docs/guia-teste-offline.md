# Guia de testes — Operação sem conexão

Roteiro manual para verificar a camada offline do aplicativo (RNF36–RNF40, RF83–RF87, RN82–RN84).
Arquitetura e decisões: [arquitetura-offline-adendo.md](arquitetura-offline-adendo.md).

---

## 1. Como o app percebe a falta de conexão

O app reage a duas situações diferentes, e vale testar as duas:

| Situação | Como acontece | O que o app faz |
|---|---|---|
| **Aparelho sem rede** | Modo avião, Wi-Fi e dados desligados | Faixa marrom no rodapé: "Sem conexão · exibindo os dados salvos no aparelho". As leituras vão direto à cópia local, sem esperar o servidor. |
| **Aparelho com rede, mas sem acesso ao banco** | Supabase fora do ar, ou túnel `adb reverse` cortado no ambiente local | O app tenta o servidor e, ao falhar, usa a cópia local. A faixa "Sem conexão" **não** aparece, porque o sistema informa que há rede; ela só aparece se houver rascunhos pendentes ("N rascunhos não sincronizados · Sincronizar"). |

Nos dois casos, as alterações em rascunhos ficam guardadas no aparelho e são enviadas na sincronização.

---

## 2. Preparação

### 2.1. Supabase local no ar

```bash
npx supabase status
```

### 2.2. Build do app

Para testar fechando e reabrindo o app sem conexão, use o **APK de release**. O build de desenvolvimento carrega o código pelo Metro do computador e não abre sem ele.

```bash
npx expo run:android --variant release
```

### 2.3. Acesso do aparelho ao banco local

O app usa `127.0.0.1:54321` (do `.env.local`). No celular ou emulador, isso só funciona pelo túnel do adb:

```bash
adb reverse tcp:54321 tcp:54321
```

Confira com `adb reverse --list`.

### 2.4. Aquecer as cópias locais (com conexão)

1. Faça login.
2. Aguarde alguns segundos na Início: o app guarda automaticamente serviços, produtos, clientes e o perfil.
3. Abra a lista de **Orçamentos** (guarda a lista para consulta offline).
4. Abra o detalhe dos orçamentos que você quer consultar ou editar sem conexão. Só orçamentos abertos com conexão ficam disponíveis offline.

---

## 3. Como cortar e restaurar a conexão

### Celular físico

| Ação | Como |
|---|---|
| Cortar tudo | Tirar o cabo USB e ativar o modo avião |
| Restaurar | Desativar o modo avião, reconectar o cabo e rodar `adb reverse tcp:54321 tcp:54321` |

### Emulador

| Ação | Comando |
|---|---|
| Aparelho sem rede | `adb shell svc wifi disable` |
| Banco inacessível | `adb reverse --remove tcp:54321` |
| Religar a rede | `adb shell svc wifi enable` |
| Devolver o acesso ao banco | `adb reverse tcp:54321 tcp:54321` |

Depois de religar o Wi-Fi do emulador, confira dois problemas conhecidos (seção 7): o relógio do emulador e o túnel do adb.

---

## 4. Roteiro de testes

Para cada teste: **Passos** e **Resultado esperado**. Comece com conexão e o app aquecido (seção 2.4).

### T1 — Abrir o app sem conexão

1. Com o app aquecido, corte toda a conexão.
2. Feche o app totalmente e abra de novo.

**Esperado:** abre na Início com o seu nome e a faixa "Sem conexão" no rodapé. Não vai para a tela de login nem para "Não foi possível carregar seus dados".

### T2 — Catálogo e clientes sem conexão (RNF36, RF83)

1. Sem conexão, abra Catálogo → Serviços e Catálogo → Produtos.
2. Abra Clientes e o detalhe de um cliente.

**Esperado:** as listas aparecem com os dados da última cópia. O detalhe do cliente mostra o endereço e "Mapa / Coordenadas: Definida" quando houver.

### T3 — Cadastros exigem conexão

1. Sem conexão, toque em "+ Novo" em Serviços, preencha e salve.

**Esperado:** mensagem "Sem conexão com o servidor. Esta alteração precisa de internet; tente novamente quando a conexão voltar." Nada é gravado.

### T4 — Criar rascunho sem conexão (RNF37, RF84, RN82)

1. Sem conexão, toque em "Novo orçamento".
2. Escolha um cliente, adicione um produto, deixe o número em branco e salve.
3. Toque em "Visualizar".

**Esperado:**
- mensagem "Orçamento PROV-XXXXXXXX criado com sucesso!";
- no detalhe, o número provisório `PROV-…` e o aviso "Rascunho salvo só neste aparelho…";
- na faixa: "1 rascunho aguardando sincronização";
- na lista de Orçamentos e nos Recentes da Início, a etiqueta "Não sincronizado".

Variação: informe um número manualmente (ex.: `CAMPO-01`). Ele é mantido em vez do provisório.

### T5 — Editar rascunho sem conexão

1. No rascunho do T4, use "Gerenciar Itens": adicione outro item, altere a quantidade, aplique um desconto.

**Esperado:** subtotal, desconto e total recalculados corretamente, como acontece online.

### T6 — Editar sem conexão um rascunho que veio do servidor

1. Com conexão, abra um orçamento em RASCUNHO que já existe no servidor.
2. Corte a conexão e altere algo (ex.: adicione um item).

**Esperado:** a alteração é salva; o orçamento passa a mostrar o aviso de rascunho local e a etiqueta "Não sincronizado".

### T7 — O que o rascunho pendente não permite (RN83)

Com um rascunho pendente aberto:

| Ação | Esperado |
|---|---|
| Gerar ou compartilhar PDF | "Este rascunho ainda não foi sincronizado com o servidor e tem um número provisório…" |
| Enviar proposta | Se faltar validade ou outra condição de envio, aparece primeiro a validação de envio. Com o orçamento completo, aparece "Este rascunho tem alterações guardadas só neste aparelho. Sincronize-o com o servidor antes de alterar o status ou excluí-lo." |
| Excluir | Mesma mensagem da RN83 |
| Duplicar (sem conexão) | Mensagem de que a operação precisa de internet |

### T8 — Os dados sobrevivem ao fechar o app

1. Sem conexão, feche o app totalmente e abra de novo.

**Esperado:** o rascunho continua na lista, com a etiqueta "Não sincronizado".

### T9 — Aviso ao sair da conta (RF87)

1. Com um rascunho pendente, vá em Perfil → "Sair da Conta".

**Esperado:** aviso "Há 1 rascunho salvo só neste aparelho. Se você sair agora, ele será apagado…". **Toque em Cancelar** para não perder o rascunho de teste.

### T10 — Orçamento nunca aberto com conexão

1. Sem conexão, na lista de Orçamentos (carregada antes com conexão), toque num orçamento cujo detalhe você nunca abriu com conexão.

**Esperado:** mensagem "Sem conexão com o servidor e ainda não há uma cópia destes dados no aparelho. Conecte-se à internet para carregá-los pela primeira vez."

### T11 — Sincronização automática ao reconectar (RF85)

1. Com rascunhos pendentes e o detalhe de um deles aberto, restaure a conexão.

**Esperado:**
- a faixa mostra "Sincronizando rascunhos…" e depois some;
- o detalhe aberto troca sozinho o número `PROV-…` pelo número definitivo (`ORC-AAAA-NNN`) e o aviso de rascunho local desaparece;
- a etiqueta "Não sincronizado" some da lista.

Conferir no banco (seção 5).

### T12 — Sincronização manual (RF86)

1. Crie um rascunho sem conexão.
2. Restaure a **rede**, mas deixe o **banco** inacessível (no emulador: `adb shell svc wifi enable` sem refazer o `adb reverse`).
3. Aguarde a faixa "1 rascunho não sincronizado · Sincronizar". A falha automática não mostra alerta.
4. Devolva o acesso ao banco e toque em **Sincronizar**.

**Esperado:** alerta "1 rascunho enviado ao servidor." e a faixa some.

### T13 — PDF de orçamento já sincronizado, sem conexão

1. Com conexão, abra um orçamento sincronizado que tenha itens.
2. Corte a conexão e toque no botão de PDF.

**Esperado:** o PDF é gerado a partir da cópia local, com o número definitivo.

---

## 5. Conferir no banco

```bash
docker exec -i supabase_db_jardinagem-app psql -U postgres -d postgres -c "select numero, status, total, observacoes, data_criacao from orcamento order by data_criacao desc limit 5;"
```

O rascunho sincronizado deve aparecer com o número definitivo, status `RASCUNHO`, o total visto no app e a data de criação do momento em que foi criado offline. Os itens:

```bash
docker exec -i supabase_db_jardinagem-app psql -U postgres -d postgres -c "select o.numero, i.descricao, i.quantidade, i.valor_total from orcamento o join item_orcamento i on i.orcamento_id = o.id order by o.data_criacao desc limit 10;"
```

---

## 6. Limpeza depois dos testes

- **Rascunhos de teste no banco:** podem ser excluídos pelo próprio app (orçamentos em RASCUNHO permitem exclusão).
- **Dados guardados no aparelho:** sair da conta apaga as cópias e os rascunhos do usuário. Para zerar tudo, inclusive a sessão:

```bash
adb shell pm clear com.jardinagem.app
```

---

## 7. Problemas conhecidos

| Sintoma | Causa | Solução |
|---|---|---|
| Emulador abre em "Não foi possível carregar seus dados" mesmo com o banco no ar | Relógio do emulador atrasado: o token é recusado (401) | `adb shell cmd alarm set-time <epoch em ms>`, por exemplo com `$(node -e "console.log(Date.now())")`, ou fazer cold boot do emulador |
| Depois de religar o Wi-Fi do emulador, o app não fala mais com o banco | O túnel `adb reverse` da porta 54321 parou de responder | `adb reverse --remove tcp:54321` e `adb reverse tcp:54321 tcp:54321` |
| App não abre sem o computador | Build de desenvolvimento (precisa do Metro) | Usar o APK de release (seção 2.2) |
| Faixa "Sem conexão" não aparece ao cortar só o banco | Comportamento esperado: o sistema ainda informa rede | Ver seção 1 |
| Mapa sem imagens de satélite ao desenhar áreas offline | As imagens do Google Maps exigem internet | Limitação documentada; o cálculo e o armazenamento das áreas funcionam offline |
