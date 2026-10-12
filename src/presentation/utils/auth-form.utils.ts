import { SignUpParams } from '../../application/services/auth.service';

export interface RegisterFormState {
  nome: string;
  telefone?: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface RegisterValidationResult {
  valido: boolean;
  mensagemErro?: string;
  payloadParaSignUp?: SignUpParams;
}

/**
 * Validação puramente local da tela de Cadastro (Presentation Layer).
 * Atende ACH-UX-04:
 * - Valida preenchimento de nome, email, senha e confirmação de senha;
 * - Garante que senha === confirmação;
 * - Bloqueia cadastro e emite mensagens claras de divergência;
 * - Gera o payload estrito de SignUpParams sem enviar nem persistir confirmPassword.
 */
export function validarFormularioCadastro(form: RegisterFormState): RegisterValidationResult {
  if (!form.nome || !form.nome.trim()) {
    return { valido: false, mensagemErro: 'Por favor, informe seu nome completo.' };
  }

  if (!form.email || !form.email.trim()) {
    return { valido: false, mensagemErro: 'Por favor, informe seu e-mail.' };
  }

  if (!form.password || form.password.length < 6) {
    return { valido: false, mensagemErro: 'A senha deve ter pelo menos 6 caracteres.' };
  }

  if (!form.confirmPassword || form.confirmPassword.trim() === '') {
    return { valido: false, mensagemErro: 'Por favor, confirme sua senha.' };
  }

  if (form.password !== form.confirmPassword) {
    return { valido: false, mensagemErro: 'As senhas não coincidem.' };
  }

  // Payload seguro repassado exclusivamente para o Supabase Auth (sem confirmPassword)
  const payloadParaSignUp: SignUpParams = {
    nome: form.nome.trim(),
    email: form.email.trim(),
    password: form.password,
    telefone: form.telefone && form.telefone.trim() ? form.telefone.trim() : undefined,
  };

  return {
    valido: true,
    payloadParaSignUp,
  };
}
