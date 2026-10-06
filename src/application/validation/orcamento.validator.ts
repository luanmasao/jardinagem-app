import { RegraNegocioError } from '../../domain/errors/dominio-error';
import { TipoDesconto } from '../../domain/enums/tipo-desconto';

export interface ValidarOrcamentoInput {
  clienteId: string;
  numero?: string;
  dataValidade?: Date | null;
  dataCriacao?: Date;
  tipoDesconto?: TipoDesconto | null;
  valorDesconto?: number;
  subtotal?: number;
}

/**
 * Validador canônico para dados cadastrais de orçamento.
 * Fundamentado no Modelo Físico v1.1 e nas Regras de Negócio vigentes (RN23 a RN71).
 */
export function validarDadosOrcamento(dados: ValidarOrcamentoInput): void {
  if (!dados.clienteId || dados.clienteId.trim() === '') {
    throw new RegraNegocioError('O cliente do orçamento é obrigatório.');
  }

  if (dados.numero !== undefined && dados.numero !== null) {
    if (dados.numero.trim() === '') {
      throw new RegraNegocioError('O número do orçamento não pode ser vazio quando informado.');
    }
    if (dados.numero.trim().length > 30) {
      throw new RegraNegocioError('O número do orçamento não pode exceder 30 caracteres.');
    }
  }

  if (dados.dataValidade) {
    const dataCriacao = dados.dataCriacao ?? new Date();
    const criacaoCivil = new Date(dataCriacao.getFullYear(), dataCriacao.getMonth(), dataCriacao.getDate());
    const validadeCivil = new Date(dados.dataValidade.getFullYear(), dados.dataValidade.getMonth(), dados.dataValidade.getDate());

    if (validadeCivil < criacaoCivil) {
      throw new RegraNegocioError('A data de validade não pode ser anterior à data de criação do orçamento.');
    }
  }

  if (dados.tipoDesconto !== undefined && dados.tipoDesconto !== null) {
    const valorDesconto = dados.valorDesconto ?? 0;

    if (typeof valorDesconto !== 'number' || isNaN(valorDesconto) || valorDesconto < 0) {
      throw new RegraNegocioError('O valor do desconto não pode ser negativo.');
    }

    if (dados.tipoDesconto === TipoDesconto.PERCENTUAL) {
      if (valorDesconto > 100) {
        throw new RegraNegocioError('Desconto percentual deve estar entre 0% e 100%.');
      }
    } else if (dados.tipoDesconto === TipoDesconto.FIXO) {
      if (dados.subtotal !== undefined && valorDesconto > dados.subtotal) {
        throw new RegraNegocioError('Desconto de valor fixo não pode exceder o subtotal.');
      }
    }
  } else {
    if (dados.valorDesconto !== undefined && dados.valorDesconto > 0) {
      throw new RegraNegocioError('Não é possível definir valor de desconto sem especificar o tipo de desconto.');
    }
  }
}
