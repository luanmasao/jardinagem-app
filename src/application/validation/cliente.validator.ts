import { RegraNegocioError } from '../../domain/errors/dominio-error';

export interface ValidarClienteInput {
  nome: string;
  telefone?: string | null;
  email?: string | null;
  documento?: string | null;
  observacoes?: string | null;
}

export interface ValidarEnderecoInput {
  cep?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

/**
 * Validador canônico para dados cadastrais de cliente.
 * Não inventa máscaras ou regras artificiais de documento/telefone.
 */
export function validarDadosCliente(dados: ValidarClienteInput): void {
  if (!dados.nome || dados.nome.trim() === '') {
    throw new RegraNegocioError('O nome do cliente é obrigatório.');
  }

  if (dados.nome.trim().length > 150) {
    throw new RegraNegocioError('O nome do cliente não pode exceder 150 caracteres.');
  }

  if (dados.telefone && dados.telefone.trim().length > 30) {
    throw new RegraNegocioError('O telefone não pode exceder 30 caracteres.');
  }

  if (dados.email && dados.email.trim() !== '') {
    const emailLimpo = dados.email.trim();
    if (emailLimpo.length > 255) {
      throw new RegraNegocioError('O e-mail não pode exceder 255 caracteres.');
    }
    // Verificação de estrutura básica de email sem regex excessivamente restritiva
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailLimpo)) {
      throw new RegraNegocioError('O formato do e-mail é inválido.');
    }
  }

  if (dados.documento && dados.documento.trim().length > 30) {
    throw new RegraNegocioError('O documento não pode exceder 30 caracteres.');
  }
}

/**
 * Validador canônico para dados de endereço.
 */
export function validarDadosEndereco(dados: ValidarEnderecoInput): void {
  if (dados.cep && dados.cep.trim().length > 10) {
    throw new RegraNegocioError('O CEP não pode exceder 10 caracteres.');
  }

  if (dados.logradouro && dados.logradouro.trim().length > 200) {
    throw new RegraNegocioError('O logradouro não pode exceder 200 caracteres.');
  }

  if (dados.numero && dados.numero.trim().length > 20) {
    throw new RegraNegocioError('O número do endereço não pode exceder 20 caracteres.');
  }

  if (dados.complemento && dados.complemento.trim().length > 100) {
    throw new RegraNegocioError('O complemento não pode exceder 100 caracteres.');
  }

  if (dados.bairro && dados.bairro.trim().length > 100) {
    throw new RegraNegocioError('O bairro não pode exceder 100 caracteres.');
  }

  if (dados.cidade && dados.cidade.trim().length > 100) {
    throw new RegraNegocioError('A cidade não pode exceder 100 caracteres.');
  }

  if (dados.estado && dados.estado.trim().length > 2) {
    throw new RegraNegocioError('O estado (UF) deve ter no máximo 2 caracteres.');
  }

  if (dados.latitude != null) {
    if (isNaN(dados.latitude) || dados.latitude < -90.0 || dados.latitude > 90.0) {
      throw new RegraNegocioError('A latitude deve estar entre -90.0 e 90.0.');
    }
  }

  if (dados.longitude != null) {
    if (isNaN(dados.longitude) || dados.longitude < -180.0 || dados.longitude > 180.0) {
      throw new RegraNegocioError('A longitude deve estar entre -180.0 e 180.0.');
    }
  }
}

/**
 * Verifica se o objeto de endereço possui ao menos um campo preenchido.
 */
export function temDadosEndereco(dados?: ValidarEnderecoInput | null): boolean {
  if (!dados) return false;
  return Boolean(
    (dados.cep && dados.cep.trim() !== '') ||
    (dados.logradouro && dados.logradouro.trim() !== '') ||
    (dados.numero && dados.numero.trim() !== '') ||
    (dados.complemento && dados.complemento.trim() !== '') ||
    (dados.bairro && dados.bairro.trim() !== '') ||
    (dados.cidade && dados.cidade.trim() !== '') ||
    (dados.estado && dados.estado.trim() !== '') ||
    dados.latitude != null ||
    dados.longitude != null
  );
}

/**
 * Compara deterministicamente os 6 campos relevantes de dois endereços utilizados pelo geocodificador.
 * Compara: logradouro, numero, bairro, cidade, estado e CEP.
 * Ignora diferenças de caixa alta/baixa e espaços extras nas extremidades.
 * (DECISÃO-GEO-09)
 */
export function enderecosSaoIguais(
  a?: {
    logradouro?: string | null;
    numero?: string | null;
    bairro?: string | null;
    cidade?: string | null;
    estado?: string | null;
    cep?: string | null;
  } | null,
  b?: {
    logradouro?: string | null;
    numero?: string | null;
    bairro?: string | null;
    cidade?: string | null;
    estado?: string | null;
    cep?: string | null;
  } | null
): boolean {
  const norm = (v?: string | null) => (v ? v.trim().toLowerCase() : '');
  if (!a && !b) return true;
  if (!a || !b) return false;
  return (
    norm(a.logradouro) === norm(b.logradouro) &&
    norm(a.numero) === norm(b.numero) &&
    norm(a.bairro) === norm(b.bairro) &&
    norm(a.cidade) === norm(b.cidade) &&
    norm(a.estado) === norm(b.estado) &&
    norm(a.cep) === norm(b.cep)
  );
}

