import { RegraNegocioError } from '../../domain/errors/dominio-error';
import { TipoItem } from '../../domain/enums/tipo-item';

export interface ValidarItemOrcamentoInput {
  orcamentoId: string;
  tipo: TipoItem;
  servicoId?: string | null;
  produtoId?: string | null;
  descricao: string;
  quantidade: number;
  unidade: string;
  valorUnitario: number;
  usaMedicaoArea: boolean;
}

/**
 * Validador canônico para itens de orçamento.
 * Fundamentado no Modelo Físico v1.1 e nas Regras de Negócio (RN27 a RN34, RN45).
 */
export function validarDadosItemOrcamento(dados: ValidarItemOrcamentoInput): void {
  if (!dados.orcamentoId || dados.orcamentoId.trim() === '') {
    throw new RegraNegocioError('O ID do orçamento proprietário é obrigatório.');
  }

  if (!dados.descricao || dados.descricao.trim() === '') {
    throw new RegraNegocioError('A descrição do item de orçamento é obrigatória.');
  }

  if (dados.descricao.trim().length > 255) {
    throw new RegraNegocioError('A descrição do item não pode exceder 255 caracteres.');
  }

  if (!dados.unidade || dados.unidade.trim() === '') {
    throw new RegraNegocioError('A unidade do item de orçamento é obrigatória.');
  }

  if (dados.unidade.trim().length > 30) {
    throw new RegraNegocioError('A unidade do item não pode exceder 30 caracteres.');
  }

  if (typeof dados.valorUnitario !== 'number' || isNaN(dados.valorUnitario) || dados.valorUnitario < 0) {
    throw new RegraNegocioError('O valor unitário do item não pode ser negativo.');
  }

  if (typeof dados.quantidade !== 'number' || isNaN(dados.quantidade) || dados.quantidade < 0) {
    throw new RegraNegocioError('A quantidade do item não pode ser negativa.');
  }

  // Regra RN27 / Modelo Físico v1.1: SERVICO XOR PRODUTO
  if (dados.tipo === TipoItem.SERVICO) {
    if (!dados.servicoId || dados.servicoId.trim() === '') {
      throw new RegraNegocioError('Item do tipo SERVICO deve possuir servicoId preenchido.');
    }
    if (dados.produtoId) {
      throw new RegraNegocioError('Item do tipo SERVICO não pode possuir produtoId.');
    }
    if (dados.usaMedicaoArea && dados.unidade.trim().toLowerCase() !== 'm²') {
      throw new RegraNegocioError('Item com medição de área deve utilizar obrigatoriamente m² como unidade comercial.');
    }
  } else if (dados.tipo === TipoItem.PRODUTO) {
    if (!dados.produtoId || dados.produtoId.trim() === '') {
      throw new RegraNegocioError('Item do tipo PRODUTO deve possuir produtoId preenchido.');
    }
    if (dados.servicoId) {
      throw new RegraNegocioError('Item do tipo PRODUTO não pode possuir servicoId.');
    }
    if (dados.usaMedicaoArea) {
      throw new RegraNegocioError('Item do tipo PRODUTO não pode ter medição de área habilitada.');
    }
  } else {
    throw new RegraNegocioError(`Tipo de item inválido: '${dados.tipo}'.`);
  }
}
