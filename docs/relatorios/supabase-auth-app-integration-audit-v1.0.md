# Relatório de Auditoria de Integração — Supabase Auth com Expo / React Native v1.0

**Documento:** Relatório de Auditoria Técnica de Integração  
**Versão:** 1.0  
**Data:** 25/09/2026  
**Auditor:** Agente Antigravity (Auditoria Técnica Independente)  
**Objeto Auditado:** Integração do Supabase Auth no aplicativo móvel Expo / React Native v1.0  
**Relatório de Referência:** `docs/relatorios/supabase-auth-app-integration-v1.0.md`  
**Status da Auditoria:** **PENDENTE DE CORREÇÃO**  

---

## 1. Sumário Executivo

Esta auditoria técnica avaliou a implementação da camada de autenticação do aplicativo móvel (**React Native / Expo SDK 57**) integrado ao **Supabase Auth**, confrontando o código-fonte, configurações de ambiente, dependências e testes com as decisões canônicas homologadas do projeto (**Arquitetura Técnica v1.1**, **Estratégia Canônica v1.6**, **Plano Executivo v1.0** e **Decisão D-HOM-14**).

A implementação apresenta um alto nível de conformidade arquitetural e de engenharia de software: respeita estritamente o isolamento em camadas (Infrastructure, Application, Presentation, Domain), centraliza a instanciação do cliente Supabase como singleton, encapsula o ciclo de vida da autenticação em `AuthService` e `AuthProvider`, adota o adaptador criptográfico híbrido `LargeSecureStore` para contornar o limite de 2 KB do `SharedPreferences` no Android, preserva a integridade física do banco de dados relacional e respeita integralmente o isolamento multi-tenant por Row Level Security (RLS).

Contudo, aplicando rigorosamente os critérios de homologação estabelecidos, o status final é determinado como **PENDENTE DE CORREÇÃO** pelos seguintes motivos objetivos:
1. **Ausência da Rota Defensiva `/concluir-perfil`:** A rota visual homologada na Estratégia Canônica v1.6 para recuperação defensiva de usuários autenticados sem perfil em `public.usuario` não foi criada em `app/`;
2. **Evidência Insuficiente de Validação Dinâmica no Dispositivo nesta Sessão de Auditoria:** O ambiente de auditoria não dispõe de emulador/dispositivo Android ativo via ADB e o daemon do Docker encontra-se desligado no host, inviabilizando a reprodução em tempo real dos testes em dispositivo físico/emulador (forçando encerramento de processo e restauração de sessão) e a reexecução do pgTAP (170/170).

---

## 2. Escopo e Metodologia

O escopo da auditoria compreendeu 30 itens analíticos detalhados, agrupados nos seguintes eixos:
- **Infraestrutura e Cliente Supabase:** Centralização do singleton, variáveis de ambiente, verificação de API key e ausência de credenciais administrativas;
- **Mecanismo de Armazenamento Seguro (`LargeSecureStore`):** Criptografia AES-256 CTR, separação de chaves no Keystore e payload no AsyncStorage, polyfills criptográficos e limites de plataforma;
- **Ciclo de Vida de Sessão e Autenticação:** `signUp`, `signIn`, `signOut`, `getSession`, `getCurrentUser`, `onAuthStateChange`, refresh automático e integração com `AppState`;
- **Arquitetura em Camadas e RLS:** Bootstrap atômico via trigger de banco, consulta ao perfil `public.usuario` via PostgREST Data API sob RLS (`usuario_select_policy`) e fluxo `/concluir-perfil`;
- **Navegação e Apresentação:** Estrutura do Expo Router, proteção de rotas, eliminação de flashes visuais de tela protegida e hidratação de sessão;
- **Validação Automatizada e Dinâmica:** TypeScript typecheck, suíte de testes de autenticação, testes de domínio e testes em ambiente Android;
- **Segurança da Informação e Ambiente:** Arquivos `.env.*`, `.gitignore`, ausência de credenciais em logs e higienização de erros.

### Critérios de Classificação Adotados
- **CONFORME:** Atende plenamente à documentação canônica, boas práticas e requisitos de segurança.
- **CONFORME COM OBSERVAÇÃO:** Atende funcionalmente, mas possui detalhes técnicos ou recomendações de alinhamento futuro documentadas.
- **DIVERGENTE:** Contradiz diretamente decisão homologada, documentação ou regra de negócio.
- **AUSENTE:** Elemento previsto na especificação que não foi implementado.
- **EVIDÊNCIA INSUFICIENTE:** Item cuja comprovação depende de ambiente não acessível no momento da auditoria.
- **NOVA DECISÃO:** Modificação arquitetural ou tecnológica introduzida sem homologação prévia.

---

## 3. Ambiente e Dependências

### 3.1. Auditoria de Dependências (`package.json` vs. `package-lock.json`)
Foi confrontado o manifesto de dependências com o arquivo de trava (`package-lock.json`), confirmando compatibilidade com o **Expo SDK 57** e ausência de bibliotecas de estado redundantes (Redux, MobX, Zustand):

| Pacote | Versão Declarada (`package.json`) | Versão Efetiva (`package-lock.json`) | Status | Análise |
| :--- | :--- | :--- | :--- | :--- |
| `@supabase/supabase-js` | `^2.116.0` | `2.116.0` | **CONFORME** | Cliente oficial do Supabase |
| `expo-secure-store` | `~57.0.4` | `57.0.4` | **CONFORME** | Acesso ao Keystore do Android |
| `@react-native-async-storage/async-storage` | `2.2.0` | `2.2.0` | **CONFORME** | Armazenamento de payload cifrado |
| `aes-js` | `^3.1.2` | `3.1.2` | **CONFORME** | Cifra simétrica AES-256 CTR |
| `react-native-get-random-values` | `~1.11.0` | `1.11.0` | **CONFORME** | Polyfill de CSPRNG |
| `@types/aes-js` (Dev) | `^3.1.4` | `3.1.4` | **CONFORME** | Tipagem TypeScript |

Nenhuma biblioteca desnecessária foi instalada. As versões fixadas de `react` (`19.2.3`) e `react-native` (`0.86.3`) foram preservadas.

### 3.2. Auditoria de Variáveis de Ambiente e Segredos
- `.env.example`: Contém o gabarito público das variáveis necessárias (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`). Não contém credenciais reais.
- `.env.local`: Configurado com URL local (`http://127.0.0.1:54321`) e chave anônima pública local.
- `.gitignore`: Contém regras explícitas bloqueando `.env`, `.env.local` e `.env*.local`. O arquivo `.env.local` não está rastreado pelo Git.
- **Segredos do Servidor:** Verificação por varredura textual (`grep`) no código-fonte confirmou a **ausência total** de:
  - `service_role` key;
  - Senhas de banco de dados;
  - Tokens administrativos;
  - Credenciais secretas de backend.

**Classificação: CONFORME.**

---

## 4. Auditoria Detalhada dos Componentes

### 4.1. Cliente Supabase Singleton (`src/infrastructure/supabase/supabase-client.ts`)
- **Centralização:** O método `createClient` está centralizado em `supabase-client.ts`, exportando a constante singleton `supabase: SupabaseClient`.
- **Variáveis `EXPO_PUBLIC_*`:** Carregadas via `process.env.EXPO_PUBLIC_SUPABASE_URL` e `process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY` / `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- **Configuração de Auth:**
  - `storage: new LargeSecureStore()` (armazenamento criptografado ativo);
  - `autoRefreshToken: true`;
  - `persistSession: true`;
  - `detectSessionInUrl: false` (coerente para ambiente mobile nativo).
- **Classificação da API Key Utilizada:**
  O código implementa fallback duplo:
  ```typescript
  const supabaseAnonKey =
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    '';
  ```
  Como o `.env.local` define ambas as chaves, a chave efetivamente consumida em tempo de execução é `EXPO_PUBLIC_SUPABASE_ANON_KEY`. A documentação atual do Supabase recomenda `publishable key` para clientes móveis e sinaliza que a chave `anon` é legada (com descontinuação prevista para o final de 2026).  
  **Classificação do Item 2: CONFORME COM OBSERVAÇÃO.** (Recomenda-se inverter a prioridade no futuro para `PUBLISHABLE_KEY || ANON_KEY`).

### 4.2. LargeSecureStore (`src/infrastructure/supabase/large-secure-store.ts`)
O adaptador implementa a interface `SupportedStorage` do Supabase SDK em conformidade com a Decisão **D-HOM-14**:
1. **Geração da Chave Simétrica:** Gera chave AES de 256 bits (32 bytes);
2. **Armazenamento Seguro da Chave:** Salva a chave em formato hexadecimal no `expo-secure-store` (`setItemAsync`), com tamanho desprezível (~64 caracteres), contornando o limite de 2.048 bytes do Android;
3. **Cifragem do Payload:** Cifra o payload JSON completo via `aes-js` no modo Counter (`CTR`);
4. **Armazenamento do Payload:** Grava os bytes cifrados em formato hexadecimal no `@react-native-async-storage/async-storage`;
5. **Leitura e Decifragem:** Lê os dados cifrados do `AsyncStorage`, recupera a chave do `SecureStore` e decifra o texto original. Caso a chave inexista no `SecureStore`, retorna `null` defensivamente;
6. **Remoção Atômica:** O método `removeItem` invoca conjuntamente `asyncStorageModule.removeItem(key)` e `secureStoreModule.deleteItemAsync(key)`;
7. **Ausência da Chave no AsyncStorage:** Confirmado que a chave AES jamais é persistida no `AsyncStorage`.

**Observações Técnicas:**
- *Importação de Polyfill:* O polyfill `react-native-get-random-values` foi importado na primeira linha de `app/_layout.tsx`, mas não dentro de `large-secure-store.ts`. O método `getRandomBytes` possui fallback para `Math.random()` caso `globalThis.crypto?.getRandomValues` não exista. Embora funcional no app via `_layout.tsx`, recomenda-se importar o polyfill diretamente no módulo de storage para garantir CSPRNG em qualquer contexto de importação isolado.
- *Modo AES-CTR e Contador Fixo:* O código utiliza `new aesjs.Counter(1)`, exatamente como no exemplo oficial documentado pelo Supabase. Pesquisadores de segurança apontam que reusar contadores estáticos em AES-CTR é uma fraqueza teórica clássica se o atacante capturar múltiplos ciphertexts da mesma chave. Como o `LargeSecureStore` gera uma nova chave a cada `setItem`, o risco é mitigado, mas a adoção de um IV/Nonce aleatório por mensagem é recomendada para versões futuras.  
**Classificação do Item 4: CONFORME COM OBSERVAÇÃO.**

### 4.3. Testes do Storage (Node.js vs. Android)
- **Em Node.js / tsx:** O arquivo `large-secure-store.ts` detecta a ausência de módulos nativos no runner do Node e redireciona para `MemoryStorage`. O teste automatizado número 11 em `tests/auth/auth-service.test.ts` valida com sucesso a interface `SupportedStorage` (gravação, leitura e remoção). **Isso comprova a lógica da classe e o fallback defensivo, mas NÃO comprova a persistência nativa.**
- **Em Android Nativo:** Não foi possível validar nativamente o storage durante a presente sessão de auditoria por ausência de emulador conectado.  
**Classificação do Item 6: CONFORME (Node.js) / EVIDÊNCIA INSUFICIENTE (Android na sessão atual).**

### 4.4. Ciclo de Vida da Sessão e Auto Refresh
- `getSession()`: Recupera sessão ativa via `auth.getSession()` com captura de erro;
- `getCurrentUser()`: Obtém dados do usuário via `auth.getUser()`, mapeando para a interface de aplicação `AuthUser`;
- `signOut()`: Executa `auth.signOut()`, limpando sessão e estado;
- `onAuthStateChange()`: Listener global único registrado no `AuthProvider` com encerramento rigoroso (`subscription.unsubscribe()`) no desmonte;
- `autoRefreshToken`: Configurado como `true` no cliente Supabase;
- **Integração com `AppState`:** A documentação oficial do Supabase para React Native sugere integrar `AppState` (`active` -> `startAutoRefresh()`, `background` -> `stopAutoRefresh()`). A implementação atual não registrou listener de `AppState`. Isso não quebra a autenticação em foreground, mas pode permitir tentativas desnecessárias de refresh em background ou exigir restart para reativar o polling.  
**Classificação do Item 8: CONFORME COM OBSERVAÇÃO.**

### 4.5. Cadastro e Bootstrap Atômico no Banco de Dados
- **Cadastro (`signUp`):** Valida e-mail não vazio, senha >= 6 caracteres e nome obrigatório. Passa `nome` e `telefone` exclusivamente em `options.data` como metadados do usuário em `auth.users`.
- **Bootstrap Atômico:** O aplicativo **NÃO** realiza nenhum comando `INSERT` em `public.usuario`. O provisionamento da conta de negócio é delegado integralmente ao banco via trigger nativa:
  `auth.users (INSERT) -> trigger on_auth_user_created -> private.handle_new_user() -> public.usuario`.
- **Retorno com Sessão Nula:** Caso a confirmação de e-mail estivesse ligada no Supabase, a sessão retornaria nula no cadastro. No app atual, o usuário permaneceria na tela de registro sem uma notificação específica de "Verifique seu e-mail". Como o ambiente local opera com confirmações desativadas, o fluxo é funcional.  
**Classificação dos Itens 9 e 10: CONFORME COM OBSERVAÇÃO.**

### 4.6. Consulta do Perfil (`public.usuario`) e RLS
- O método `authService.getPerfilUsuario(usuarioId)` consulta `public.usuario` via Data API padrão:
  `this.client.from('usuario').select('id, nome, telefone, data_cadastro, ativo').eq('id', usuarioId).maybeSingle()`
- Não há elevação de privilégios nem uso de `service_role`. A consulta executa sob o token JWT do usuário autenticado e é autorizada pela policy homologada `usuario_select_policy` (`USING (auth.uid() = id)`).
- O resultado é instanciado na entidade rica de domínio `Usuario` (`src/domain/entities/usuario.ts`).  
**Classificação do Item 11: CONFORME.**

### 4.7. Fluxo Defensivo `/concluir-perfil`
- **Exigência Canônica:** A Seção 8.2 da Estratégia Canônica v1.6 e o Plano de Implementação v1.0 estabelecem que, caso um usuário autenticado não possua perfil em `public.usuario` (ex.: cadastro administrativo sem trigger), a aplicação deve direcioná-lo para a rota `/concluir-perfil`, que executa um `INSERT INTO public.usuario (id, nome, telefone) VALUES (auth.uid(), nome, telefone)` suportado pela policy `usuario_insert_policy` (`WITH CHECK (auth.uid() = id)`).
- **Implementação Auditada:** A rota `app/concluir-perfil.tsx` (ou `app/(auth)/concluir-perfil.tsx`) **não foi criada**. Na tela inicial (`app/(app)/index.tsx`), a ausência de perfil exibe um card informando *"Perfil ainda não carregado ou em processamento assíncrono pelo banco"* com um botão *"Recarregar Perfil"*.
- **Conclusão:** O aplicativo não estourou erro nem executou inserções arbitrárias, mas deixou a rota defensiva ausente.  
**Classificação do Item 12: AUSENTE.**

### 4.8. Login, Logout e Autenticação
- **Login:** Tratamento de campos obrigatórios, chamada a `signInWithPassword`, captura de credenciais incorretas e retorno estruturado de erro;
- **Logout:** Chamada a `signOut`, limpeza da sessão no storage, redefinição das variáveis de estado no `AuthContext` e redirecionamento reativo para a tela de login;
- **Loading:** Indicadores de carregamento (`ActivityIndicator`) bloqueiam ações repetidas durante requisições de rede.  
**Classificação dos Itens 13 e 14: CONFORME.**

### 4.9. Navegação e Proteção de Rotas (Expo Router)
- **Estrutura de Grupos:**
  - `app/_layout.tsx`: `AuthProvider` envolvendo `RootNavigation`;
  - `app/index.tsx`: Redirecionamento condicional de entrada;
  - `app/(auth)/_layout.tsx`: Stack sem cabeçalho para `login` e `register`;
  - `app/(app)/_layout.tsx`: Stack protegida com cabeçalho para `index`.
- **Prevenção de Flash e Acesso Indevido:**
  Em `app/_layout.tsx`, enquanto `isLoading === true`, uma tela de carregamento neutra é exibida em tela cheia com `ActivityIndicator`. A tela protegida só é montada quando `isAuthenticated === true` e `isLoading === false`. Não ocorrem loops de redirecionamento.  
**Classificação do Item 15: CONFORME.**

### 4.10. Contexto de Autenticação (`AuthProvider` e `useAuth`)
- Provê `user`, `session`, `perfil`, `isLoading`, `isAuthenticated`, `signIn`, `signUp`, `signOut` e `refreshPerfil`;
- Encapsula estado com tipagens estritas;
- O hook `useAuth` lança erro descritivo se consumido fora do provider.  
**Classificação do Item 16: CONFORME.**

---

## 5. Auditoria de Segurança da Informação

| Vetor de Segurança | Requisito Canônico | Situação Observada | Classificação |
| :--- | :--- | :--- | :--- |
| **Credenciais Administrativas** | Nenhuma `service_role` ou chave mestra no app | Varredura de código confirmou 0 ocorrências de segredos de backend | **CONFORME** |
| **Armazenamento de Senha** | Senhas não devem ser gravadas em disco | Senhas trafegam unicamente no payload TLS para o Auth e são descartadas da memória | **CONFORME** |
| **Segurança no Armazenamento Local** | Tokens criptografados no Android Keystore / AES | Chave AES gravada no `expo-secure-store` e sessão cifrada no `AsyncStorage` | **CONFORME** |
| **Isolamento de Dados (RLS)** | Queries devem filtrar por `auth.uid()` | `usuario_select_policy` aplicada em `public.usuario`. Nenhuma evasão de RLS detectada | **CONFORME** |
| **Logs de Depuração** | Tokens e senhas não podem ser emitidos no console | Apenas 2 chamadas `console.*` no app (aviso de chave ausente e erro genérico de sessão). Sem vazamento de JWT | **CONFORME** |
| **Arquivos de Ambiente** | Arquivos locais não versionados | `.env.local` devidamente coberto pelo `.gitignore` e fora da árvore Git | **CONFORME** |

---

## 6. Resultados dos Testes Automatizados

Foram executadas as suítes de testes automatizados no ambiente de desenvolvimento:

### 6.1. Verificação Estática de Tipagem (TypeScript)
```bash
npm run typecheck
```
**Resultado:** Código de saída 0. 0 erros encontrados.

```bash
npm run test:typecheck
```
**Resultado:** Código de saída 0. 0 erros encontrados.

### 6.2. Testes Automatizados de Autenticação (`tests/auth/auth-service.test.ts`)
```bash
npm run test:auth
```
**Resultado:** 11/11 testes aprovados (100% de sucesso, 0 falhas):
1. `cadastro`: cadastro de novo usuário enviando nome e telefone nos metadados;
2. `login válido`: autenticação com email/senha e retorno de usuário mapeado e sessão;
3. `login inválido`: retorno de erro ao tentar login com credenciais incorretas;
4. `logout`: chamada a `signOut` e retorno de sucesso;
5. `sessão persistida`: recuperação de sessão ativa persistida;
6. `sessão inexistente`: retorno `null` quando não houver sessão ativa;
7. `leitura de perfil próprio`: consulta a `public.usuario` e mapeamento para entidade `Usuario`;
8. `tratamento de erro Auth`: captura e tratamento defensivo de falhas lançadas pelo SDK;
9. `usuário Auth existente`: retorno de erro quando e-mail já está cadastrado;
10. `comportamento defensivo quando perfil não estiver disponível`: retorno `null` sem exceção;
11. `persistência`: validação de `setItem`, `getItem` e `removeItem` no `LargeSecureStore`.

### 6.3. Testes de Regressão de Domínio (`tests/domain/*.test.ts`)
```bash
npm test
```
**Resultado:** 49/49 testes aprovados (100% de sucesso, 0 falhas). Regressão zero nas regras de negócio de orçamento, itens, serviços, produtos, clientes e medições de área.

### 6.4. Testes de Banco de Dados pgTAP (`supabase/tests/*.sql`)
```bash
npx supabase test db
```
**Resultado:** Comando retornou código 1 por falha de conexão (`ECONNREFUSED 127.0.0.1:54322` — daemon do Docker não está em execução no host local durante a auditoria).  
Embora o relatório anterior (`docs/relatorios/supabase-auth-app-integration-v1.0.md`) reporte 170/170 asserções válidas e os arquivos de migração permaneçam congelados e intactos, a reexecução ao vivo não pôde ser atestada nesta sessão específica.

---

## 7. Evidências do Ambiente Android e Persistência Real

### 7.1. Inspeção de Dispositivos Conectados
A execução de `adb devices` retornou:
```
List of devices attached
(vazio)
```
Nenhum emulador Android (AVD) ou dispositivo físico estava conectado no momento da auditoria.

### 7.2. Análise da Persistência Real (Restart / Force Stop)
O cenário crítico:
`LOGIN -> force-stop do processo -> reiniciar aplicação -> restauração de sessão`
foi descrito como validado no relatório preliminar `supabase-auth-app-integration-v1.0.md` (no emulador Pixel_10 API 36). Contudo, segundo a regra fundamental desta auditoria:
> *"Não aceitar como evidência uma afirmação não verificável. O teste em Node/tsx NÃO deve ser tratado como prova de persistência nativa. A evidência de persistência nativa deverá ser o teste no Android."*

Como o emulador não estava disponível para reprodução instantânea pelo auditor, este quesito é classificado formalmente como **EVIDÊNCIA INSUFICIENTE NA SESSÃO DE AUDITORIA ATUAL**.

---

## 8. Matriz de Rastreabilidade

A cadeia de consistência canônica foi mapeada entre a documentação homologada, a implementação e as validações:

| Componente | Documentação Canônica | Implementação | Teste Unitário / Automatizado | Evidência Android |
| :--- | :--- | :--- | :--- | :--- |
| **Sessão** | Arq. Técnica v1.1; Estratégia v1.6 | `supabase-client.ts`, `auth.service.ts` | Testes 5 e 6 em `test:auth` | Relatório v1.0 Seção 7 (Pendente de revalidação ao vivo) |
| **Storage Seguro** | Decisão D-HOM-14 | `large-secure-store.ts` | Teste 11 em `test:auth` | Relatório v1.0 Seção 7.8 (Pendente de revalidação ao vivo) |
| **Cadastro** | RF v2; Estratégia v1.6 (Seção 8.1) | `register.tsx`, `auth.service.ts` | Testes 1 e 9 em `test:auth` | Relatório v1.0 Seção 7.3 |
| **Login** | RF v2; Estratégia v1.6 | `login.tsx`, `auth.service.ts` | Testes 2 e 3 em `test:auth` | Relatório v1.0 Seção 7.6 e 7.7 |
| **Logout** | RF v2; Arq. Técnica v1.1 | `auth.service.ts`, `auth-context.tsx` | Teste 4 em `test:auth` | Relatório v1.0 Seção 7.5 |
| **Bootstrap** | D-HOM-04; Estratégia v1.6 (Seção 8.1) | Trigger `handle_new_user()` (banco) | Teste 1 em `test:auth` e pgTAP `01_bootstrap` | Relatório v1.0 Seção 7.3 e 7.4 |
| **Perfil (RLS)** | D-HOM-06; Estratégia v1.6 (Seção 8.2) | `auth.service.ts` (`getPerfilUsuario`) | Teste 7 e 10 em `test:auth` | Relatório v1.0 Seção 7.4 |
| **Rotas Protegidas** | Arq. Técnica v1.1; RNF v2 | `app/_layout.tsx`, `(app)/_layout.tsx` | Validação de navegação e hydration | Relatório v1.0 Seção 7.1 e 7.4 |
| **Rota `/concluir-perfil`** | Estratégia v1.6 (Seção 8.2) | **Não implementada** | Teste defensivo 10 (apenas service) | **Ausente** |

---

## 9. Quadro de Quantitativos e Classificações

| Categoria | Quantidade | Descrição Resumida |
| :--- | :---: | :--- |
| **CONFORME** | 19 | Cliente singleton, segredos, limite SecureStore, ciclo de vida de sessão, login, logout, navegação, contexto, typecheck (2), testes de auth (11), testes de domínio (49), bootstrap no banco, leitura de perfil RLS, integridade de migrations, dependências, ambiente, segurança de log e tratamento de erros. |
| **CONFORME COM OBSERVAÇÃO** | 5 | 1. API key (uso prioritário de ANON_KEY em vez de PUBLISHABLE_KEY);<br>2. LargeSecureStore (polyfill importado em `_layout.tsx` e fallback `Math.random`);<br>3. Auto Refresh (ausência de listener de `AppState`);<br>4. Cadastro (sem tela de aviso caso confirmação de e-mail seja ativada);<br>5. Relatório v1.0 (fiel no código, com testes dinâmicos não reexecutáveis nesta sessão). |
| **DIVERGENTE** | 0 | Nenhuma divergência arquitetural ou de regra de negócio encontrada. |
| **AUSENTE** | 1 | Rota de recuperação defensiva `/concluir-perfil` não criada na camada de apresentação. |
| **EVIDÊNCIA INSUFICIENTE** | 3 | 1. Testes de banco pgTAP na sessão atual (Docker off-line no host);<br>2. Validação dinâmica em dispositivo Android na sessão atual (`adb devices` vazio);<br>3. Comprovação ao vivo de persistência de sessão nativa pós-restart (`force-stop`). |
| **NOVA DECISÃO** | 0 | Nenhuma nova decisão tecnológica ou estrutural foi introduzida sem homologação. |

---

## 10. Apontamentos Detalhados

### 10.1. Divergências
- **Nenhuma divergência** identificada. O código adota os nomes, padrões, schemas e regras formalizados no projeto.

### 10.2. Itens Ausentes
1. **Rota `/concluir-perfil`:**  
   A Estratégia Canônica v1.6 e a policy `usuario_insert_policy` previam uma rota na aplicação para receber o usuário cujo registro em `public.usuario` não tenha sido disparado pela trigger. Atualmente, a tela inicial exibe apenas uma mensagem estática e um botão para recarregar o perfil, sem viabilizar a criação do registro via PostgREST.

### 10.3. Observações Técnicas (Melhorias Recomendadas)
1. **Nomenclatura da API Key (Supabase 2026 Roadmap):** Inverter a ordem de prioridade no `supabase-client.ts` para favorecer `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` sobre `EXPO_PUBLIC_SUPABASE_ANON_KEY`, preparando o app para a depreciação da chave anon.
2. **Importação do Polyfill Criptográfico:** Incluir `import 'react-native-get-random-values';` diretamente no início de `large-secure-store.ts`, eliminando a dependência de que ele seja importado previamente no `_layout.tsx` e mitigando o fallback inseguro para `Math.random()`.
3. **Listener de `AppState` para Economia e Estabilidade de Sessão:** Implementar o listener recomendado pela documentação oficial do Supabase para pausar o auto-refresh quando o aplicativo for para background (`stopAutoRefresh()`) e retomar ao voltar ao primeiro plano (`startAutoRefresh()`).
4. **Tratamento de Sessão Nula no Cadastro:** Caso a aplicação venha a ativar a confirmação de e-mail em produção, a tela `register.tsx` deve exibir um modal ou aviso informando que um link de confirmação foi enviado à caixa postal do usuário.

### 10.4. Evidências Insuficientes (Limitações do Ambiente de Auditoria)
1. **pgTAP 170/170:** O comando `npx supabase test db` falhou por falta de conexão com o banco local (Docker inativo). As migrations não foram alteradas e permanecem idênticas às homologadas, mas a asserção dinâmica não pôde ser reexecutada.
2. **Ambiente Android e Persistência Nativa:** O comando `adb devices` não localizou dispositivos ou emuladores abertos. A restauração de sessão em Keystore real do Android pós-fechamento do processo depende de uma sessão com dispositivo ativo para homologação visual.

---

## 11. Conclusão e Status Final

A integração da autenticação Supabase Auth com o aplicativo React Native / Expo v1.0 demonstra **excelente qualidade técnica, fidelidade à arquitetura canônica e rigoroso respeito à segurança e ao isolamento por RLS**. Não há falhas graves de segurança, injeções arbitrárias de privilégios ou bibliotecas não homologadas.

No entanto, em observância estrita ao item 29 dos critérios de aprovação:
> *"Considerar a integração APTA À HOMOLOGAÇÃO se: 0 divergências; 0 ausências; 0 novas decisões; 0 evidências insuficientes críticas; testes automatizados aprovados; testes Android comprovados; persistência de sessão comprovada."*

A existência de **1 item ausente** (rota defensiva `/concluir-perfil`) e a **ausência de comprovação ao vivo no emulador Android e pgTAP nesta sessão** impedem a emissão de aprovação sumária.

### Status Oficial da Auditoria:
# **PENDENTE DE CORREÇÃO**

### Próximos Passos para Homologação:
1. Avaliar se a rota `/concluir-perfil` será implementada nesta versão ou se a política de fallback será simplificada na documentação oficial;
2. Iniciar o Docker Desktop e executar `npx supabase test db` para revalidar formalmente os 170 testes pgTAP;
3. Iniciar o emulador Android (`Pixel_10` ou equivalente), conectar via ADB e registrar em tempo real a persistência com `force-stop` e restart da aplicação.
