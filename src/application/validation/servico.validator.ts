import { RegraNegocioError } from '../../domain/errors/dominio-error';

export interface ValidarServicoInput {
  nome: string;
  descricao?: string | null;
  unidade: string;
  precoBase: number;
  usaMedicaoArea?: boolean;
}

/**
 * Validador canônico para dados cadastrais de serviço.
 * Fundamentado no Modelo Físico v1.1 e nas Regras de Negócio (RN12, RN16).
 */
export function validarDadosServico(dados: ValidarServicoInput): void {
  if (!dados.nome || dados.nome.trim() === '') {
    throw new RegraNegocioError('O nome do serviço é obrigatório.');
  }

  if (dados.nome.trim().length > 150) {
    throw new RegraNegocioError('O nome do serviço não pode exceder 150 caracteres.');
  }

  if (dados.usaMedicaoArea) {
    // RN16: Serviços que utilizam medição de área devem utilizar m² como unidade comercial.
    if (dados.unidade && dados.unidade.trim() !== '' && dados.unidade.trim().toLowerCase() !== 'm²') {
      throw new RegraNegocioError('Serviços com medição de área devem utilizar obrigatoriamente m² como unidade comercial.');
    }
  } else {
    if (!dados.unidade || dados.unidade.trim() === '') {
      throw new RegraNegocioError('A unidade do serviço é obrigatória.');
    }
    if (dados.unidade.trim().length > 30) {
      throw new RegraNegocioError('A unidade do serviço não pode exceder 30 caracteres.');
    }
  }

  if (typeof dados.precoBase !== 'number' || isNaN(dados.precoBase)) {
    throw new RegraNegocioError('O preço base do serviço deve ser um número válido.');
  }

  if (dados.precoBase < 0) {
    throw new RegraNegocioError('O preço base do serviço não pode ser negativo.');
  }
}
