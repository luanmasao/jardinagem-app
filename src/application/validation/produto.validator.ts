import { RegraNegocioError } from '../../domain/errors/dominio-error';

export interface ValidarProdutoInput {
  nome: string;
  descricao?: string | null;
  unidade: string;
  precoBase: number;
}

/**
 * Validador canônico para dados cadastrais de produto.
 * Fundamentado no Modelo Físico v1.1 e nas Regras de Negócio (RN18).
 * Observação: Produto NÃO possui medição de área no modelo de dados homologado.
 */
export function validarDadosProduto(dados: ValidarProdutoInput): void {
  if (!dados.nome || dados.nome.trim() === '') {
    throw new RegraNegocioError('O nome do produto é obrigatório.');
  }

  if (dados.nome.trim().length > 150) {
    throw new RegraNegocioError('O nome do produto não pode exceder 150 caracteres.');
  }

  if (!dados.unidade || dados.unidade.trim() === '') {
    throw new RegraNegocioError('A unidade do produto é obrigatória.');
  }

  if (dados.unidade.trim().length > 30) {
    throw new RegraNegocioError('A unidade do produto não pode exceder 30 caracteres.');
  }

  if (typeof dados.precoBase !== 'number' || isNaN(dados.precoBase)) {
    throw new RegraNegocioError('O preço base do produto deve ser um número válido.');
  }

  if (dados.precoBase < 0) {
    throw new RegraNegocioError('O preço base do produto não pode ser negativo.');
  }
}
