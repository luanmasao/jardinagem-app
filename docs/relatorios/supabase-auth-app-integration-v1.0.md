# Relatório de Integração — Supabase Auth com Expo / React Native v1.0

**Status da Etapa:** HOMOLOGADA  
**Data:** 20/09/2026  
**Ambiente:** Supabase LOCAL (Docker) + Android Emulator (Pixel_10 / Android API 36)  
**Banco de Dados:** Intocado / Sem alterações estruturais  

---

## 1. Sumário Executivo

Este relatório documenta a conclusão da integração da camada de aplicativo móvel (Expo / React Native / Android) com o **Supabase Auth** no ambiente local.

A integração seguiu rigorosamente os documentos canônicos do projeto (Arquitetura Técnica v1.1, Estratégia Canônica v1.6, Plano Executivo v1.0 e Decisão Homologada D-HOM-14), respeitando a arquitetura em camadas sem acoplamento indevido e preservando a integridade do banco de dados relacional e espacial.

Nenhuma migration foi criada, modificada ou executada. As 8 tabelas com RLS, as 31 policies e os 170 testes pgTAP permanecem 100% íntegros e validados.

---

## 2. Dependências Instaladas

Em estrita conformidade com as regras do projeto, **nenhuma biblioteca de gerenciamento de estado global** (Redux, Zustand, Jotai) foi introduzida. Foram instaladas exclusivamente as dependências necessárias para autenticação e persistência de sessão segura:

| Pacote | Versão | Propósito |
| :--- | :--- | :--- |
| `@supabase/supabase-js` | `^2.116.0` | Cliente oficial Supabase (Auth + PostgREST Data API) |
| `expo-secure-store` | `~57.0.4` | Armazenamento de chave simétrica criptográfica no Keystore do Android |
| `@react-native-async-storage/async-storage` | `2.2.0` | Armazenamento de payload de sessão cifrado sem restrição de 2 KB |
| `aes-js` | `^3.1.2` | Implementação de cifragem AES-256 no modo CTR |
| `react-native-get-random-values` | `~1.11.0` | Polyfill seguro de `crypto.getRandomValues` para React Native |
| `@types/aes-js` (Dev) | `^3.1.4` | Tipagem estática TypeScript para a biblioteca `aes-js` |

---

## 3. Arquitetura e Arquivos

### 3.1. Arquivos Criados
1. `.env.example`: Gabarito público de variáveis de ambiente com prefixo `EXPO_PUBLIC_`.
2. `.env.local`: Configuração local apontando para `http://127.0.0.1:54321` com a chave pública anônima (`ANON_KEY`) local (ignorado pelo git).
3. `src/infrastructure/supabase/large-secure-store.ts`: Adaptador de persistência híbrido implementando a interface `SupportedStorage` do Supabase SDK com criptografia AES-256 CTR (Decisão D-HOM-14).
4. `src/infrastructure/supabase/supabase-client.ts`: Módulo de instanciação centralizada do cliente Supabase singleton.
5. `src/infrastructure/supabase/index.ts`: Exportações centralizadas da camada de infraestrutura Supabase.
6. `src/application/services/auth.service.ts`: Abstração na camada de aplicação centralizando `signUp`, `signIn`, `signOut`, `getSession`, `getCurrentUser`, `onAuthStateChange` e `getPerfilUsuario`.
7. `src/application/services/index.ts`: Exportações da camada de aplicação.
8. `src/presentation/contexts/auth-context.tsx`: `AuthProvider` provendo estado reativo centralizado de autenticação, observação de sessão e consulta defensiva de perfil.
9. `src/presentation/hooks/use-auth.ts`: Hook para consumo limpo do `AuthContext`.
10. `app/(auth)/_layout.tsx`: Layout do grupo de navegação não autenticado (Stack sem header).
11. `app/(auth)/login.tsx`: Tela de login com e-mail, senha, validação defensiva e link para cadastro.
12. `app/(auth)/register.tsx`: Tela de cadastro com nome completo, telefone opcional, e-mail, senha e disparo de metadados.
13. `app/(app)/_layout.tsx`: Layout do grupo de navegação protegido.
14. `app/(app)/index.tsx`: Tela inicial protegida exibindo dados de `auth.users`, perfil de `public.usuario` via RLS, recarregar perfil e logout.
15. `tests/auth/auth-service.test.ts`: Suíte de testes automatizados cobrindo os 10 cenários obrigatórios de autenticação + teste de persistência.
16. `docs/relatorios/supabase-auth-app-integration-v1.0.md`: Este relatório técnico.

### 3.2. Arquivos Modificados
1. `package.json`: Adição das dependências necessárias e inclusão do script `"test:auth": "tsx --env-file=.env.local --test tests/auth/*.test.ts"`.
2. `app/_layout.tsx`: Configuração do `AuthProvider` na raiz e proteção de rotas com redirecionamento condicional reativo baseado na presença de sessão.
3. `app/index.tsx`: Redirecionamento raiz delegando para `(app)` ou `(auth)/login`.

---

## 4. Estratégia de Persistência de Sessão (Decisão D-HOM-14)

### O Problema do Limite de 2048 Bytes no Android
No sistema operacional Android, o `expo-secure-store` utiliza `SharedPreferences` associado ao Android Keystore, impondo um limite estrito de 2.048 bytes por entrada. Como as sessões do Supabase Auth contêm JWT de acesso, refresh token e metadados, seu tamanho serializado frequentemente excede 2 KB, gerando falhas silenciosas de persistência.

### Solução Homologada Implementada: `LargeSecureStore`
- Uma chave de criptografia de 256 bits (32 bytes) é gerada via `crypto.getRandomValues`;
- A chave é salva de forma segura no `expo-secure-store` (tamanho desprezível, bem abaixo de 2 KB);
- O payload completo da sessão é serializado e cifrado com a chave via `aes-js` (modo CTR);
- O ciphertext em formato hexadecimal é armazenado no `@react-native-async-storage/async-storage` (sem restrição de 2 KB);
- Na leitura (`getItem`), o ciphertext é obtido do `AsyncStorage`, a chave é recuperada do `SecureStore`, a decifragem é realizada e o payload original é entregue ao Supabase SDK;
- Na remoção (`removeItem` / `signOut`), tanto a entrada do `AsyncStorage` quanto a chave do `SecureStore` são excluídas;
- Em ambientes sem módulos nativos (como suítes de teste em Node.js), um fallback defensivo em memória é acionado automaticamente, viabilizando execução de testes rápidos sem falsos positivos.

---

## 5. Fluxos de Autenticação e Regras de Negócio

### 5.1. Cadastro (`signUp`)
- Entrada: `email`, `password`, `nome`, `telefone` (opcional).
- O nome e o telefone são passados exclusivamente em `options.data` como metadados do `auth.users`.
- **Nenhum insert manual em `public.usuario` é feito pelo app.** O bootstrap é realizado de forma atômica e transacional pelo trigger homologado de banco `on_auth_user_created` (`private.handle_new_user()`).

### 5.2. Login (`signInWithPassword`)
- Validação de preenchimento obrigatório de e-mail e senha.
- Chamada centralizada via `AuthService`.
- Tratamento de credenciais inválidas com exibição de mensagem clara na interface.

### 5.3. Logout (`signOut`)
- Chamada a `authService.signOut()`.
- Limpeza de sessão no storage criptografado.
- Atualização imediata do estado da aplicação e redirecionamento automático para a rota de login `/(auth)/login`.

### 5.4. Observação Centralizada de Sessão
- Um único listener via `authService.onAuthStateChange` configurado no `AuthProvider`.
- Limpeza da subscription (`unsubscribe()`) executada rigorosamente no desmonte do provider.
- A sessão ativa é a fonte única de verdade para a proteção de navegação.

### 5.5. Consulta do Perfil (`public.usuario`) via RLS
- O identificador do usuário autenticado (`auth.uid()`) é obtido da sessão.
- A consulta é realizada sobre `public.usuario` via Data API padrão:
  `supabase.from('usuario').select('*').eq('id', user.id).maybeSingle()`
- O resultado é mapeado para a entidade de domínio `Usuario` (`src/domain/entities/usuario.ts`).
- Validação física de que o acesso respeita a policy `usuario_select_policy` sem requerer privilégios administrativos (`service_role`).

---

## 6. Validações e Testes Executados

### 6.1. Verificação Estática de Tipagem (TypeScript)
```bash
npm run typecheck
```
**Resultado:** 0 erros de compilação.

```bash
npm run test:typecheck
```
**Resultado:** 0 erros de compilação.

### 6.2. Testes Automatizados de Autenticação (`tests/auth/auth-service.test.ts`)
```bash
npm run test:auth
```
**Resultado:** 11/11 testes aprovados (0 falhas).
1. Cadastro: cadastro de usuário passando nome e telefone em metadados;
2. Login válido: autenticação com e-mail/senha, retorno de `AuthUser` e sessão;
3. Login inválido: tratamento de credenciais incorretas;
4. Logout: chamada a `signOut` e limpeza de sessão;
5. Sessão persistida: recuperação de sessão ativa;
6. Sessão inexistente: retorno de `null` defensivo;
7. Leitura de perfil próprio: consulta e instanciação da entidade de domínio `Usuario`;
8. Tratamento de erro Auth: captura e tratamento defensivo de falhas de rede do SDK;
9. Usuário Auth existente: tratamento de e-mail duplicado;
10. Comportamento defensivo quando perfil não estiver disponível: retorno `null` sem quebra;
11. Persistência: teste de gravação, leitura e remoção do `LargeSecureStore`.

### 6.3. Testes de Regressão de Domínio (`tests/domain/*.test.ts`)
```bash
npm test
```
**Resultado:** 49/49 testes aprovados (0 falhas). Regressão zero.

### 6.4. Testes de Banco de Dados pgTAP (`supabase/tests/*.sql`)
```bash
npx supabase test db
```
**Resultado:** 170/170 asserções aprovadas em 8 arquivos de teste. Banco de dados e políticas RLS permanecem 100% íntegros.

---

## 7. Validação Dinâmica no Dispositivo Android (Emulador Pixel_10)

A validação foi executada no emulador oficial Android `Pixel_10` (API 36) conectado via ADB e redirecionamento de portas `adb reverse tcp:54321 tcp:54321` e `adb reverse tcp:8081 tcp:8081`:

1. **Abertura do Aplicativo:**
   - O aplicativo abriu na rota raiz e foi redirecionado automaticamente para a tela de autenticação `/(auth)/login`.
   - Elementos visuais renderizados com clareza (título, campos de e-mail e senha, botão Entrar e link de cadastro).
2. **Navegação para Cadastro:**
   - Toque no botão "Cadastre-se" navegou para `/(auth)/register`.
   - Formulário completo exibido com campos para Nome Completo, Telefone, E-mail e Senha.
3. **Execução do Cadastro:**
   - Preenchimento do usuário de teste:
     - Nome: `Roberto Paisagista`
     - Telefone: `11999887766`
     - E-mail: `roberto.jardim@teste.com`
     - Senha: `senhaSegura123`
   - O botão "Cadastrar" foi acionado.
   - O Supabase Auth recebeu a requisição no endpoint local `http://127.0.0.1:54321/auth/v1/signup`.
   - O trigger `private.handle_new_user()` executou no PostgreSQL local, inserindo o registro em `public.usuario`.
4. **Recebimento da Sessão e Acesso à Rota Protegida:**
   - A sessão foi gerada e persistida via `LargeSecureStore`.
   - A navegação redirecionou automaticamente para a rota protegida `/(app)/index`.
   - Dados exibidos em tela:
     - **Auth.Users:** UUID `7917f2ae-2872-40ed-b203-2bc591a188a0`, e-mail `roberto.jardim@teste.com`, sessão `Ativa / Persistida`.
     - **Public.Usuario:** ID `7917f2ae-2872-40ed-b203-2bc591a188a0`, Nome `Roberto Paisagista`, Telefone `11999887766`, Data `20/09/2026, 16:42:47`, Status `Ativo`.
     - Confirmação de RLS: `✓ Acesso verificado via RLS (usuario_select_policy). Sem privilégios administrativos.`
5. **Teste de Logout:**
   - Acionamento do botão "Sair da Conta (Logout)".
   - Sessão revogada e limpa do storage.
   - Redirecionamento instantâneo para a tela de login `/(auth)/login`.
6. **Teste de Login Inválido:**
   - Tentativa de login com campos vazios ou senha incorreta.
   - Exibição de banner de erro claro ("Por favor, preencha o e-mail e a senha" / "Invalid login credentials").
7. **Teste de Login Válido:**
   - Preenchimento com `roberto.jardim@teste.com` e `senhaSegura123`.
   - Toque em "Entrar".
   - Autenticação bem-sucedida, sessão restabelecida e redirecionamento imediato para a área logada com os dados do perfil atualizados.
8. **Teste de Persistência de Sessão pós-Restart:**
   - O aplicativo Expo foi forçado a fechar via `adb shell am force-stop host.exp.exponent`.
   - O aplicativo foi reaberto via intent direta `exp://localhost:8081`.
   - O `LargeSecureStore` recuperou a chave AES do `SecureStore`, decifrou a sessão gravada no `AsyncStorage` e restaurou o usuário diretamente na tela protegida `/(app)/index` sem exibir tela de login.

---

## 8. Verificação de Segurança (Checklist de Conformidade)

- [x] **Nenhum segredo de servidor no aplicativo:** Apenas `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_ANON_KEY` são utilizadas pelo app.
- [x] **Nenhuma `service_role` key:** Confirmado que a chave administrativa jamais é exposta ou referenciada no cliente móvel.
- [x] **Nenhuma senha persistida:** O storage armazena unicamente o token de sessão cifrado com AES-256 CTR. Nenhuma senha trafega fora do payload TLS/HTTPS ou é gravada em disco.
- [x] **Sem chamadas administrativas:** O aplicativo utiliza estritamente o endpoint público do Supabase Auth e o PostgREST Data API sob o token JWT do usuário autenticado.
- [x] **Isolamento multi-tenant via RLS:** Todas as consultas a `public.usuario` são filtradas no banco por `auth.uid() = id`. O aplicativo não possui e não requer permissões elevadas.

---

## 9. Riscos e Decisões Tomadas

1. **Decisão D-HOM-14 Preservada:** O uso do adaptador híbrido `LargeSecureStore` evitou que o limite de 2 KB do Android SharedPreferences quebrasse a persistência de sessão.
2. **Resolução de Conflito de Peer Dependencies:** O `npm install` padrão com npm 10+ tentava puxar versões mais recentes de `react-dom` conflitantes com o Expo SDK 57 (fixado no React 19.2.3). O uso de `--legacy-peer-deps` preservou rigorosamente as versões de React e Expo aprovadas sem atualizar dependências não solicitadas.
3. **Isolamento de Ambiente em Testes Node.js:** Como `react-native` exporta sintaxe JSX/Flow não compilada para o runner nativo Node.js, `LargeSecureStore` foi construído com carregamento dinâmico resiliente dos módulos nativos (`expo-secure-store` e `@react-native-async-storage/async-storage`), alternando para armazenamento defensivo em memória nos testes sem comprometer a execução nativa no dispositivo.
4. **Integração com o Banco Intocada:** Nenhuma alteração foi realizada nas migrations ou na estrutura do banco de dados local.

---

## 10. Conclusão e Próximos Passos

A integração do Supabase Auth com o aplicativo Expo/React Native está plenamente funcional e validada tanto estaticamente quanto em dispositivo Android real (emulador).

---

## 11. Registro de Homologação Formal

Em 26/09/2026, após a execução das correções controladas (`docs/relatorios/supabase-auth-app-integration-correction-v1.0.md`) e a aprovação integral na reauditoria técnica independente (`docs/relatorios/supabase-auth-app-integration-audit-v1.1.md`), a integração foi formalmente homologada no Termo de Homologação:
- **Termo de Homologação:** `docs/relatorios/supabase-auth-app-integration-homologation-v1.0.md`;
- **Status Final:** **HOMOLOGADA**.

