# Homologação Técnica das Configurações do Supabase Auth — v1.0

**Documento de Fechamento Formal e Homologação — PONTO 6 DA ESTRATÉGIA DE AUTH + RLS**  
**Assunto:** Homologação formal das decisões sobre algoritmos de hashing (bcrypt/argon2), requisitos e comprimento de senha, confirmação de e-mail, distinção rigorosa entre ambientes (Local vs. Produção), ciclo de vida de sessões, tokens e armazenamento de credenciais no Android.  
**Status:** HOMOLOGADA  
**Data da Homologação:** 2026-09-20  
**Documento de Referência Estratégica:** `docs/relatorios/auth-rls-strategy-v1.5.md`  
**Autor:** Equipe de Arquitetura e Engenharia de Software  

---

## 1. Objetivo e Registro Formal de Homologação

O presente relatório formaliza o **fechamento técnico e a HOMOLOGAÇÃO DEFINITIVA do Ponto 6** da revisão da Estratégia de Supabase Auth + RLS:

> *"Revisar detalhes de bcrypt/argon2 e configurações do Supabase Auth, removendo valores ou afirmações excessivamente específicos que não estejam fundamentados nos requisitos ou na configuração efetiva do projeto."*

A homologação formal do Ponto 6 registra explicitamente que:

1. **Hashing de Senhas:**
   - O algoritmo de hashing de senha **não é uma decisão arquitetural do aplicativo**;
   - O projeto **não configura diretamente algoritmo ou work factor de hashing** através da aplicação;
   - A implementação de hashing e verificação é de **responsabilidade do Supabase Auth / GoTrue**;
   - **Não tratar bcrypt ou argon2 como requisito funcional do projeto**;
   - A referência a `argon2` identificada na documentação anterior permanece classificada conforme a análise técnica deste relatório (não fundamentada), sem transformá-la em requisito ou configuração do aplicativo.

2. **Minimum Password Length:**
   - O valor `6` **NÃO é requisito de negócio, requisito funcional ou requisito não funcional do projeto**;
   - Ele permanece documentado estritamente como **DEFAULT DA PLATAFORMA / CONFIGURAÇÃO LOCAL**, conforme fundamentação apresentada no relatório;
   - Qualquer alteração futura das regras de senha deverá ser uma **decisão explícita do projeto** e não uma consequência automática desta homologação.

3. **Confirmação de E-mail:**
   - A confirmação de e-mail **não é requisito de domínio** identificado em RN v3, RF v2 ou RNF v2;
   - Para o **ambiente local**: `enable_confirmations = false` permanece como **decisão de ambiente / conveniência técnica** para agilidade de desenvolvimento e testes;
   - Para **produção**: `enable_confirmations = true` permanece como **decisão operacional pendente** de provisionamento/configuração do ambiente de produção e serviço SMTP;
   - **Não transformar essa decisão operacional em regra de domínio**.

4. **Local vs. Produção:**
   - Mantém-se uma **separação explícita** entre a configuração local de desenvolvimento/testes (`supabase/config.toml`) e a configuração do ambiente de produção;
   - **Não inventar valores de produção** que ainda não tenham sido formalmente definidos pelo projeto.

5. **Sessão e Refresh Token:**
   - As configurações e comportamentos documentados permanecem classificados como **comportamento / default / configuração da plataforma**, quando não forem requisitos do projeto;
   - **Não transformar valores como `jwt_expiry = 3600`, `enable_refresh_token_rotation = true` e `refresh_token_reuse_interval = 10` em requisitos funcionais ou regras de negócio**.

6. **Armazenamento da Sessão no Android:**
   - Mantém-se documentada a decisão arquitetural de utilizar estratégia de armazenamento compatível com as limitações do Android e do Supabase, incluindo a necessidade de avaliar o adaptador híbrido descrito no relatório (devido ao limite de 2.048 bytes por chave no `expo-secure-store`);
   - Isso deve ser tratado estritamente como **decisão técnica de Infrastructure**, e **não como regra de negócio**.

> [!IMPORTANT]
> **Preservação de Escopo e Pontos Homologados:**  
> Os pontos anteriores da estratégia já foram formalmente deliberados e homologados:  
> - **FORCE ROW LEVEL SECURITY** (homologado em `auth-rls-strategy-v1.3.md`);  
> - **SECURITY DEFINER e Menor Privilégio** (homologado em `auth-rls-security-definer-v1.2.md`);  
> - **GRANT / REVOKE e Restrição de API** (homologado em `auth-rls-strategy-v1.4.md`);  
> - **Ponto 4 — DELETE vs. Desativação Lógica** (homologado em `auth-rls-delete-policy-v1.2.md`);  
> - **Ponto 5 — Revisão das Afirmações de Performance do RLS** (homologado em `auth-rls-performance-v1.0.md`).  
> 
> **Nenhum** dos pontos acima é reaberto por este relatório.  
> O arquivo `supabase/migrations/20260916020500_modelo_fisico_v1_1.sql` permanece **congelado e inalterado**, nenhum comando SQL é executado, nenhum banco é modificado e nenhum código de aplicação é alterado.

---

## 2. Escopo da Análise

A revisão abrange todas as declarações técnicas, diretas ou implícitas, presentes nos relatórios da série `auth-rls-strategy` e no arquivo de configuração local `supabase/config.toml`, contemplando:

1. **Hashing de Senhas:** Menções a `bcrypt` e `argon2`, sua fundamentação no Supabase Auth e a existência de controles configuráveis pelo projeto;
2. **Requisitos de Senha:** A menção a `minimum_password_length = 6` e regras de complexidade (`password_requirements`), confrontando-as com os requisitos do projeto e com os padrões da plataforma;
3. **Confirmação de E-mail:** A premissa de `enable_confirmations = false` no ambiente local e `enable_confirmations = true` em produção, segregando requisitos de negócio, conveniências de desenvolvimento e decisões operacionais;
4. **Segregação de Ambientes (Local vs. Produção):** A separação conceitual e prática entre o que rege o ambiente de desenvolvimento/testes locais via Supabase CLI e o que rege um ambiente de produção provisionado;
5. **Ciclo de Vida de Sessões e Tokens:** Afirmações sobre expiração de JWT (`jwt_expiry = 3600`), renovação automática via Refresh Token, rotação de refresh tokens (`enable_refresh_token_rotation = true`) e intervalo de tolerância (`refresh_token_reuse_interval = 10`);
6. **Armazenamento de Sessão no Android:** Avaliação da viabilidade técnica do uso direto de `expo-secure-store` diante das limitações estruturais da biblioteca oficial em contraste com o tamanho dos payloads do Supabase Auth.

---

## 3. Fontes Oficiais Consultadas

As conclusões deste relatório fundamentam-se exclusivamente nas seguintes fontes oficiais primárias:

### 3.1. Documentação Oficial do Supabase e Upstream GoTrue
1. **Supabase Auth Architecture & GoTrue Engine:** Documentação de referência do motor de autenticação GoTrue (`github.com/supabase/auth` / `supabase.com/docs/guides/auth`). O Supabase Auth utiliza internamente o pacote `golang.org/x/crypto/bcrypt` para derivação e hashing de senhas. A coluna `encrypted_password` na tabela `auth.users` armazena o hash salted do bcrypt;
2. **Supabase CLI Configuration Reference:** Documentação oficial do arquivo `supabase/config.toml` (`supabase.com/docs/guides/local-development/cli/config`). Define os parâmetros suportados localmente para `[auth]`, `[auth.email]`, `[auth.rate_limit]` e seus respectivos valores default;
3. **Supabase Password Security & Policies:** Guias oficiais sobre políticas de senha (`supabase.com/docs/guides/auth/passwords`). O valor mínimo absoluto imposto pela plataforma é de 6 caracteres; recomenda-se 8 ou mais caracteres para ambientes de produção;
4. **Supabase Email Auth & Confirmation Workflow:** Documentação oficial de fluxo de confirmação por email (`supabase.com/docs/guides/auth/auth-email`). Descreve o comportamento de `signUp()` quando a confirmação está ativada (`session == null`) versus quando desativada (`session != null`);
5. **Supabase Mobile / React Native Deep Dive:** Guia de integração oficial do Supabase com Expo e React Native (`supabase.com/docs/guides/auth/quickstarts/react-native`). Aborda as limitações de tamanho de chave no `expo-secure-store` (limite nativo de 2.048 bytes no Android SharedPreferences / Keystore) e a necessidade de adaptadores híbridos de armazenamento criptografado.

### 3.2. Artefatos Oficiais do Projeto
- **Regras de Negócio (RN v3):** Não contêm regras sobre algoritmo de criptografia, tamanho de senha de infraestrutura ou tempos de expiração de token;
- **Requisitos Funcionais (RF v2):** O cadastro e a autenticação do usuário são delegados ao provedor de identidade, sem especificação de política criptográfica de hashing;
- **Requisitos Não Funcionais (RNF v2):** RNF de segurança e isolamento delegam a custódia das credenciais ao Supabase Auth;
- **Modelo Físico v1.1:** A tabela `public.usuario` não armazena senha nem email, eliminando o manuseio de hashes pelo domínio;
- **Diretrizes Arquiteturais (`AGENTS.md` e `architecture.md`):** Estabelecem que a aplicação mobile é cliente público não confiável e que credenciais de infraestrutura são custodiadas pelo Supabase Auth.

---

## 4. Afirmações Encontradas nos Documentos do Projeto

A varredura textual nos relatórios anteriores e arquivos de configuração identificou as seguintes menções relevantes:

### 4.1. No Relatório `auth-rls-strategy-v1.0.md`
- **Linha 125:** *"O Supabase Auth valida o hash `bcrypt`/`argon2` e emite o JWT contendo a claim `sub = <uuid>` e o refresh token."*
- **Linha 119:** *"Usuário preenche Nome, Email, Senha (mínimo 6 caracteres conforme `config.toml`) e Telefone (opcional)."*
- **Linhas 651–662:** Seção com especificações de parâmetros locais:
  - `jwt_expiry = 3600 (1 hora)`
  - `minimum_password_length = 6`
  - `enable_confirmations = false`
- **Linha 775 (Tabela de Decisões, Decisão 13):** *"Manter enable_confirmations = false no ambiente local e ativar true em produção."*

### 4.2. No Relatório `auth-rls-strategy-v1.5.md`
- **Linha 156 (Diagrama):** Cita na tabela `auth.users` o campo `encrypted_password: hash seguro`, tendo removido a menção direta a bcrypt/argon2 do corpo principal;
- **Linha 166:** *"password (mínimo de 6 caracteres conforme `config.toml`, gerenciado por `auth.users`);"*
- **Linhas 753–770 (Seção 18):** Descreve detalhadamente:
  - Ambiente Local com `enable_confirmations = false` e emissão instantânea de sessão;
  - Ambiente de Produção com `enable_confirmations = true`, ausência de sessão inicial (`session === null`) e obrigatoriedade de confirmação por email;
- **Linha 814:** *"Tokens de autenticação são gravados em armazenamento criptografado no dispositivo (`expo-secure-store`)."*
- **Linha 890 (Tabela de Decisões, Decisão 13):** Mantém a decisão de ajustes em `config.toml` como **PENDENTE DE HOMOLOGAÇÃO**.

### 4.3. No Arquivo `supabase/config.toml` (Configuração Local Efetiva)
- **Linha 164:** `jwt_expiry = 3600`
- **Linha 170:** `enable_refresh_token_rotation = true`
- **Linha 173:** `refresh_token_reuse_interval = 10`
- **Linha 175:** `enable_signup = true`
- **Linha 177:** `enable_anonymous_sign_ins = false`
- **Linha 181:** `minimum_password_length = 6`
- **Linha 184:** `password_requirements = ""`
- **Linha 225:** `enable_confirmations = false`

---

## 5. Análise de Hashing de Senhas: BCRYPT vs. ARGON2

### 5.1. O Supabase Auth permite escolher o algoritmo de hashing?
**NÃO.**  
O motor GoTrue que executa o Supabase Auth gera e valida internamente os hashes de senha utilizando a implementação padrão da biblioteca `golang.org/x/crypto/bcrypt`.

1. **Responsabilidade de Hashing:** A operação de derivar o hash com salt e compará-lo no login é executada integralmente pelo servidor de autenticação da Supabase. O banco de dados relacional (`public`) e o aplicativo móvel (`jardinagem-app`) nunca têm acesso à senha em texto plano nem ao algoritmo de derivação;
2. **Inexistência de Configuração de Algoritmo:** Nem o arquivo `supabase/config.toml`, nem o painel administrativo do Supabase, nem as variáveis de ambiente padrão do GoTrue expõem parâmetro para o desenvolvedor alternar a geração de novas senhas para `argon2`. O suporte a algoritmos alternativos (como Argon2id, PBKDF2 ou Scrypt do Firebase) existe no código-fonte do GoTrue exclusivamente para fins de **migração retroativa de usuários legados** via rotas administrativas de importação de usuários;
3. **Parâmetros de Custo:** O fator de trabalho (*work factor / cost*) do bcrypt no GoTrue é fixado internamente no código do servidor (custo padrão 10). Não há suporte no `config.toml` para o projeto customizar esse valor.

### 5.2. Conclusão Técnica
A citação a *"hash `bcrypt`/`argon2`"* em documentos anteriores representou uma generalização teórica indevida. O projeto de jardinagem **não escolhe, não configura e não parametriza** o algoritmo de hashing.  
A estratégia de segurança deve registrar com precisão que:
- O hashing de senhas é **responsabilidade delegada exclusivamente à infraestrutura do Supabase Auth**;
- O mecanismo padrão e efetivo adotado pela plataforma é o `bcrypt`;
- O projeto não possui controle sobre parâmetros internos de derivação de chave.

---

## 6. Análise de Password Configuration (`minimum_password_length`)

### 6.1. O valor `minimum_password_length = 6` é um requisito do projeto?
**NÃO.**  
Nenhum dos artefatos canônicos aprovados (Regras de Negócio RN v3, Requisitos Funcionais RF v2, Requisitos Não Funcionais RNF v2 ou Modelo Físico v1.1) define qualquer exigência sobre comprimento mínimo de senha ou regras de caracteres.

### 6.2. Qual é a natureza técnica do valor `6`?
O valor `6` é estritamente o **DEFAULT DA PLATAFORMA SUPABASE / GOTRUE**:
- No código-fonte do GoTrue e no template oficial do `config.toml`, o valor padrão gerado pelo comando `supabase init` é `minimum_password_length = 6`;
- A documentação oficial do Supabase esclarece explicitamente no próprio arquivo de configuração:  
  `# Passwords shorter than this value will be rejected as weak. Minimum 6, recommended 8 or more.`
- O valor 6 é o piso físico inferior aceito pela plataforma (valores menores que 6 são rejeitados pelo servidor Auth).

### 6.3. Conclusão Técnica
Tratar `minimum_password_length = 6` como um *requisito do projeto* configura erro de categorização.  
O valor 6 deve ser formalmente classificado como **DEFAULT DA PLATAFORMA / CONFIGURAÇÃO LOCAL**. Caso a governança do projeto venha a aprovar futuramente um requisito de segurança da informação mais restritivo (por exemplo, 8 caracteres e caracteres alfanuméricos via `password_requirements`), isso constituirá uma nova decisão técnica; até que isso ocorra, o valor 6 é apenas o padrão da ferramenta de desenvolvimento local.

---

## 7. Análise de Confirmação de E-mail (`enable_confirmations`)

### 7.1. A confirmação de e-mail é um requisito funcional de negócio?
**NÃO.**  
A especificação funcional RF v2 não estabelece como regra de negócio que um profissional de jardinagem deva obrigatoriamente confirmar seu e-mail antes de criar seu primeiro orçamento. Trata-se de uma **diretriz operacional e de segurança de infraestrutura**.

### 7.2. Segregação Rigorosa dos Comportamentos

| Dimensão | Ambiente Local (Desenvolvimento/Testes) | Ambiente de Produção / Homologação |
|---|---|---|
| **Configuração no Supabase** | `enable_confirmations = false` em `config.toml` | `enable_confirmations = true` (ou `false`, a depender da política de go-live) |
| **Comportamento do `signUp()`** | Retorna `user` e `session` válidos imediatamente. `email_confirmed_at = NOW()`. | Se ativado: retorna `user` válido e `session = null`. `email_confirmed_at = NULL`. |
| **Envio de E-mail** | Não despacha e-mails para a internet (repassa para o Mailpit local na porta 54324 se habilitado). | Exige contratação e integração de serviço de mensageria SMTP / transactional email (ex.: Resend, Sendgrid, SES). |
| **Natureza da Decisão** | **Decisão de Ambiente (Conveniência de Engenharia):** Agiliza testes automatizados locais e CI. | **Decisão Operacional Pendente:** Não há contrato de infraestrutura de produção provisionado até o momento. |

### 7.3. Conclusão Técnica
1. No **ambiente local**, a configuração `enable_confirmations = false` é uma **conveniência de engenharia plenamente justificada** para permitir testes manuais e automatizados sem a dependência de clicar em links no Mailpit;
2. A afirmação na v1.5 de que em produção *“a confirmação será obrigatoriamente `true`”* deve ser tratada como **uma intenção operacional pendente de provisionamento**, e não como um requisito imutável de software;
3. O código da camada de Presentation do aplicativo móvel deve ser **defensivo**: ao invocar `supabase.auth.signUp()`, a aplicação deve inspecionar se `session != null`. Se a sessão existir, redireciona para a tela inicial; se for nula, apresenta a mensagem informativa orientando o usuário a verificar o e-mail cadastrado. Isso garante que a UI funcione de forma transparente tanto com confirmação ativa quanto desativada.

---

## 8. Análise de Ambiente Local vs. Produção

A revisão identificou que versões anteriores da estratégia mesclavam premissas operacionais de ambientes distintos:

1. **Ambiente Local (Desenvolvimento):**
   - Regido por `supabase/config.toml` e contêineres Docker geridos pela CLI local;
   - As credenciais (`anon_key`, `jwt_secret`, `service_role_key`) são chaves fixas e públicas conhecidas da documentação da CLI do Supabase;
   - Os emails transacionais são retidos pelo Mailpit (`localhost:54324`);
   - Objetivo: **Reprodutibilidade rápida, testes determinísticos e validação de schema**.
2. **Ambiente de Produção:**
   - Regido pelo painel da plataforma em nuvem (Supabase Cloud) ou variáveis de ambiente de um contêiner GoTrue em servidor de produção;
   - As chaves de criptografia e assinatura de JWT são segredos fortes gerados por hardware/KMS;
   - Exige configuração de domínio próprio, políticas de anti-spam (SPF, DKIM, DMARC), limites de taxa estritos (`rate_limit`) e provedores SMTP reais;
   - Objetivo: **Disponibilidade, segurança, confidencialidade e resiliência**.

### Conclusão Técnica
Nenhum parâmetro específico de infraestrutura de produção deve ser gravado na documentação como "fato consumado" enquanto o ambiente de produção não estiver formalmente provisionado. A documentação técnica deve tratar as diretrizes de produção como **RECOMENDAÇÕES OPERACIONAIS / DECISÕES PENDENTES DE PROVISIONAMENTO**.

---

## 9. Análise de Sessão, Tokens e Armazenamento no Dispositivo

### 9.1. Tempo de Expiração do Access Token (`jwt_expiry = 3600`)
- O valor `3600` segundos (1 hora) é o **DEFAULT DA PLATAFORMA SUPABASE**.
- No aplicativo móvel, o usuário não percebe a expiração de 1 hora porque o SDK `@supabase/supabase-js` executa o **auto-refresh** transparente em segundo plano via Refresh Token.
- O valor de 1 hora não decorre de nenhum requisito do cliente de jardinagem; decorre do padrão balanceado da especificação OAuth2/JWT adotado pelo GoTrue.

### 9.2. Rotação de Refresh Tokens (`enable_refresh_token_rotation = true`)
- É uma **CONFIGURAÇÃO PADRÃO DE SEGURANÇA DA PLATAFORMA**.
- Quando o cliente renova o token de acesso, o servidor GoTrue invalida o Refresh Token anterior e emite um novo par de tokens.
- O parâmetro `refresh_token_reuse_interval = 10` segundos permite uma janela de tolerância para casos em que o aplicativo móvel efetua requisições simultâneas em condições de rede instável (ex.: 4G oscilando em trabalho de campo).
- Ambos são parâmetros recomendados da plataforma que devem ser mantidos sem serem promovidos a "regras de negócio do aplicativo".

### 9.3. Armazenamento de Sessão no Android: Limitação do `expo-secure-store`
A estratégia v1.5 afirma genericamente na Seção 21 que:
> *"Tokens de autenticação são gravados em armazenamento criptografado no dispositivo (`expo-secure-store`)."*

**Ponto de Atenção Técnico e Arquitetural Importante:**
1. A documentação oficial do Supabase para React Native/Expo documenta um problema crítico: o `expo-secure-store` possui um **limite máximo de 2.048 bytes (2 KB) por entrada** no Android (devido ao mecanismo interno do Android `SharedPreferences` integrado ao Keystore);
2. O objeto de sessão retornado pelo Supabase Auth (contendo `access_token`, `refresh_token`, metadados de usuário e claims) frequentemente excede 2.048 bytes;
3. Se o desenvolvedor tentar gravar a sessão inteira do Supabase diretamente no `expo-secure-store`, a chamada lançará uma exceção no Android, causando falha silenciosa ou quebra de persistência do login;
4. **Solução Oficial Padronizada:** A documentação oficial da Supabase recomenda a implementação de um adaptador híbrido (ex.: criptografia simétrica AES via `aes-js`, onde a chave de criptografia de 256 bits é guardada no `expo-secure-store` e o payload cifrado é gravado no `@react-native-async-storage/async-storage`) ou particionamento de chaves;
5. **Classificação:** O mecanismo exato de armazenamento local no Android é uma **DECISÃO DE IMPLEMENTAÇÃO DA CAMADA DE INFRASTRUCTURE MOBILE**, não uma restrição do banco de dados ou do Supabase Auth. A menção a `expo-secure-store` na estratégia deve ser tratada como diretriz de segurança de alto nível (não salvar tokens em texto puro), delegando à camada de infraestrutura mobile a adoção do adaptador de storage recomendado pela documentação do Supabase.

---

## 10. Matriz Consolidada de Classificação das Afirmações de Auth

A tabela a seguir consolida todas as afirmações, valores e diretrizes revisadas, atribuindo a cada item sua classificação técnica precisa e seu tratamento metodológico definitivo:

| Afirmação / Parâmetro | Situação Atual no Projeto | Classificação Técnica | Fundamentação Documental | Tratamento Proposto |
|---|---|---|---|---|
| **Validação com `bcrypt/argon2`** | Mencionado em `auth-rls-strategy-v1.0.md` (L125) como validação dupla | **NÃO FUNDAMENTADA** | Supabase Auth (GoTrue) utiliza `bcrypt` por padrão. `argon2` não é configurável pelo projeto para novos hashes. | **Expurgar menção a argon2.** Registrar que o hashing é responsabilidade delegada ao Supabase Auth (`bcrypt`), sem parâmetros locais de controle. |
| **Encrypted Password como hash seguro** | Mencionado em `auth-rls-strategy-v1.5.md` (L156) | **CONFIGURAÇÃO DA PLATAFORMA** | Tabela `auth.users` armazena o hash salted gerado pelo GoTrue na coluna `encrypted_password`. | **Manter.** Representa com fidelidade a arquitetura interna do Supabase Auth. |
| **`minimum_password_length = 6`** | Declarado em `config.toml` (L181) e citado como requisito em v1.5 (L166) | **DEFAULT DA PLATAFORMA** | Não consta em RN v3, RF v2 ou RNF v2. É o valor mínimo padrão gerado pela CLI do Supabase. | **Desvincular de requisito de negócio.** Tratar estritamente como valor padrão da ferramenta local de desenvolvimento. |
| **Complexidade de Senha (`password_requirements = ""`)** | Em branco no `config.toml` local | **DEFAULT DA PLATAFORMA** | Não há requisito de regras de complexidade alfanumérica formalizado no projeto. | **Manter sem exigência de regras adicionais**, salvo decisão futura e explícita do projeto. |
| **`enable_confirmations = false` (Local)** | Configurado no `supabase/config.toml` local (L225) | **DECISÃO DE AMBIENTE** | Facilita a execução de testes automatizados e o fluxo local sem depender de confirmação em Mailpit. | **Manter no ambiente local.** Reconhecer expressamente como conveniência técnica para testes, sem torná-la regra funcional de negócio. |
| **`enable_confirmations = true` (Produção)** | Citado em v1.5 (L762 e L890) como planejado para produção | **DECISÃO AINDA PENDENTE** | Não é requisito de RN/RF. Depende do provisionamento formal de infraestrutura e serviço SMTP de produção. | **Tratar como diretriz operacional pendente.** A camada de Presentation deve ser resiliente a ambos os cenários (`session == null` e `session != null`). |
| **Duração do Access Token (`jwt_expiry = 3600`)** | Configurado em `config.toml` (L164) e v1.0 (L653) | **DEFAULT DA PLATAFORMA** | Padrão padrão do Supabase Auth (1 hora). Não fundamentado em requisitos específicos do projeto. | **Manter como configuração padrão de infraestrutura.** Não tratar como exigência de negócio. |
| **Rotação de Refresh Token (`enable_refresh_token_rotation = true`)** | Configurado em `config.toml` (L170) | **DEFAULT DA PLATAFORMA** | Recomendação de segurança da plataforma contra replay attacks em conexões móveis. | **Manter como configuração padrão recomendada.** |
| **Janela de Tolerância de Refresh Token (`refresh_token_reuse_interval = 10`)** | Configurado em `config.toml` (L173) | **DEFAULT DA PLATAFORMA** | Padrão oficial da Supabase CLI para tolerar condições de concorrência em redes móveis instáveis. | **Manter como configuração padrão.** |
| **Bloqueio de Logins Anônimos (`enable_anonymous_sign_ins = false`)** | Configurado em `config.toml` (L177) | **CONFIGURAÇÃO DA PLATAFORMA** | Coerente com o modelo de negócio em que orçamentos exigem identificação de usuário (`usuario_id NOT NULL`). | **Manter.** Alinhado com a premissa arquitetural de usuário identificado. |
| **Armazenamento em `expo-secure-store` no Android** | Citado em v1.5 (L814) como mecanismo único | **NECESSITA DOCUMENTAÇÃO OFICIAL / ADAPTAÇÃO TÉCNICA** | `expo-secure-store` possui limite de 2.048 bytes no Android; sessions brutas do Supabase frequentemente estouram o limite. | **Adequar a diretriz:** prescrever uso do adaptador oficial de armazenamento seguro híbrido recomendado pelo Supabase para React Native/Expo na camada de Infrastructure. |

---

## 11. Decisões Homologadas do Ponto 6

Registram-se formalmente como **HOMOLOGADAS** as seguintes decisões técnicas consolidadas do Ponto 6:

### Decisão P6-1 (HOMOLOGADA): Hashing de Senhas e Responsabilidade Delegada
Formalizar que o algoritmo de hashing de senha **não é uma decisão arquitetural do aplicativo**, sendo a implementação de hashing e verificação **responsabilidade do Supabase Auth / GoTrue**. O projeto não configura diretamente algoritmo ou *work factor* de hashing através da aplicação. Fica estabelecido que nem `bcrypt` nem `argon2` constituem requisitos funcionais do projeto, e a referência a `argon2` identificada na documentação anterior permanece classificada como não fundamentada, sem se converter em requisito ou configuração do aplicativo.

### Decisão P6-2 (HOMOLOGADA): Desassociação de `minimum_password_length = 6` como Requisito
Formalizar que o valor `minimum_password_length = 6` **NÃO é requisito de negócio, requisito funcional ou requisito não funcional do projeto**, permanecendo documentado estritamente como **DEFAULT DA PLATAFORMA / CONFIGURAÇÃO LOCAL** do arquivo `supabase/config.toml`. Qualquer alteração futura das regras de senha deverá constituir decisão formal e explícita do projeto, e não consequência automática desta homologação.

### Decisão P6-3 (HOMOLOGADA): Segregação e Natureza de `enable_confirmations`
Formalizar que a confirmação de e-mail **não é requisito de domínio** identificado em RN v3, RF v2 ou RNF v2. Para o ambiente local, `enable_confirmations = false` permanece como **decisão de ambiente / conveniência técnica** para agilidade de desenvolvimento e testes. Para produção, `enable_confirmations = true` permanece como **decisão operacional pendente** de provisionamento/configuração do ambiente e de serviços de mensageria SMTP, sem transformação dessa decisão operacional em regra de domínio. A camada de Presentation deve tratar o retorno de `signUp()` de maneira defensiva, suportando fluxos com ou sem sessão imediata.

### Decisão P6-4 (HOMOLOGADA): Separação Explícita entre Ambiente Local e Produção
Formalizar a **separação explícita e obrigatória** entre a configuração local de desenvolvimento/testes (baseada na Supabase CLI e `config.toml`) e a configuração do ambiente de produção (baseada no Supabase Cloud / infraestrutura de produção). Fica vedada a antecipação ou invenção de parâmetros de produção que ainda não tenham sido formalmente definidos pelo projeto.

### Decisão P6-5 (HOMOLOGADA): Parâmetros de Token e Sessão como Defaults da Plataforma
Formalizar que os parâmetros `jwt_expiry = 3600`, `enable_refresh_token_rotation = true` e `refresh_token_reuse_interval = 10` permanecem classificados como **comportamento / default / configuração da plataforma**, mantendo-se vedada sua transformação em requisitos funcionais ou regras de negócio do aplicativo de jardinagem.

### Decisão P6-6 (HOMOLOGADA): Armazenamento da Sessão no Android como Decisão de Infrastructure
Formalizar como **decisão técnica da camada de Infrastructure** (e não como regra de negócio) a adoção de estratégia de armazenamento de sessão compatível com as restrições físicas do Android e do Supabase, considerando o limite de 2.048 bytes do `expo-secure-store` e a necessidade de avaliar o adaptador híbrido oficial recomendado pelo Supabase para React Native/Expo.

---

## 12. Conclusão

A homologação técnica do **Ponto 6** cumpre integralmente o propósito de sanear a documentação estratégica do projeto:

1. **Elimina especulações não comprovadas:** Remove a premissa de que o projeto configuraria `argon2` ou escolheria parâmetros de hashing de senhas;
2. **Restitui a verdade documental:** Classifica `minimum_password_length = 6` e `jwt_expiry = 3600` como propriedades padrão da plataforma de autenticação, e não como requisitos inventados de negócio;
3. **Harmoniza os ambientes:** Estabelece uma fronteira clara e transparente entre as conveniências práticas do ambiente de desenvolvimento local (`config.toml`) e as decisões operacionais do futuro ambiente de produção;
4. **Previne falhas de engenharia móvel:** Alerta com base em documentação técnica oficial sobre as limitações físicas do `expo-secure-store` no Android, orientando a futura implementação na camada de Infrastructure sem quebrar a integridade do design.

O presente artefato fica concluído com o status definitivo de **HOMOLOGADA**.
