/**
 * Tradução das mensagens de erro do Supabase Auth para português (RNF04).
 *
 * O AuthService repassa o erro original do Supabase; aqui ele é convertido no texto exibido
 * ao usuário. A identificação usa primeiro o código do erro (AuthError.code) e, quando ele
 * não vem, trechos da mensagem em inglês. Erros que não são do Supabase Auth (ex.: validações
 * do próprio app, já em português) são devolvidos sem alteração.
 */

const MENSAGENS_POR_CODIGO: Readonly<Record<string, string>> = Object.freeze({
  invalid_credentials: 'E-mail ou senha incorretos.',
  user_already_exists: 'Este e-mail já está cadastrado. Faça login ou use outro e-mail.',
  email_exists: 'Este e-mail já está cadastrado. Faça login ou use outro e-mail.',
  email_not_confirmed: 'Confirme seu e-mail antes de entrar.',
  weak_password: 'A senha é muito fraca. Use pelo menos 6 caracteres.',
  same_password: 'A nova senha deve ser diferente da senha atual.',
  email_address_invalid: 'O e-mail informado é inválido.',
  validation_failed: 'Verifique os dados informados e tente novamente.',
  over_request_rate_limit: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
  over_email_send_rate_limit: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
  signup_disabled: 'O cadastro de novos usuários está desativado.',
  user_banned: 'Este usuário está bloqueado.',
  user_not_found: 'Usuário não encontrado.',
  session_expired: 'Sua sessão expirou. Entre novamente.',
  session_not_found: 'Sua sessão expirou. Entre novamente.',
  request_timeout: 'O servidor demorou para responder. Tente novamente.',
});

const MENSAGENS_POR_TEXTO: readonly [RegExp, string][] = Object.freeze([
  [/invalid login credentials/i, MENSAGENS_POR_CODIGO.invalid_credentials],
  [/user already registered/i, MENSAGENS_POR_CODIGO.user_already_exists],
  [/email not confirmed/i, MENSAGENS_POR_CODIGO.email_not_confirmed],
  [/password should be at least/i, MENSAGENS_POR_CODIGO.weak_password],
  [/unable to validate email address|email address .* is invalid/i, MENSAGENS_POR_CODIGO.email_address_invalid],
  [/rate limit|too many requests/i, MENSAGENS_POR_CODIGO.over_request_rate_limit],
  [/signups not allowed/i, MENSAGENS_POR_CODIGO.signup_disabled],
  [/failed to fetch|network request failed|fetch failed|networkerror|network error/i,
    'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.'],
]);

const MENSAGEM_GENERICA_AUTH = 'Não foi possível concluir a operação. Tente novamente.';

function ehErroDoSupabaseAuth(erro: { name?: unknown; code?: unknown; status?: unknown }): boolean {
  return (
    (typeof erro.name === 'string' && erro.name.startsWith('Auth')) ||
    typeof erro.code === 'string' ||
    typeof erro.status === 'number'
  );
}

/**
 * Converte um erro de autenticação no texto exibido ao usuário.
 *
 * @param erro erro devolvido pelo AuthService ou capturado em try/catch
 * @param mensagemPadrao texto usado quando o erro não traz mensagem aproveitável
 */
export function traduzirErroAutenticacao(erro: unknown, mensagemPadrao: string): string {
  if (!erro || typeof erro !== 'object') {
    return mensagemPadrao;
  }

  const { message, code, name, status } = erro as {
    message?: unknown;
    code?: unknown;
    name?: unknown;
    status?: unknown;
  };

  if (typeof code === 'string' && MENSAGENS_POR_CODIGO[code]) {
    return MENSAGENS_POR_CODIGO[code];
  }

  const texto = typeof message === 'string' ? message.trim() : '';
  for (const [padrao, traducao] of MENSAGENS_POR_TEXTO) {
    if (padrao.test(texto)) {
      return traducao;
    }
  }

  if (ehErroDoSupabaseAuth({ name, code, status })) {
    return MENSAGEM_GENERICA_AUTH;
  }

  return texto || mensagemPadrao;
}
