import { TipoDesconto } from '../enums/tipo-desconto';
import { RegraNegocioError } from '../errors/dominio-error';

/**
 * Arredonda valor monetário para 2 casas decimais (BRL, RN55).
 */
export function arredondarMoeda(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

/**
 * Calcula o valor deduzido a partir do subtotal e da configuração de desconto.
 * Regras: RN49, RN50, RN51, RN52, RN53.
 */
export function calcularValorDesconto(
  subtotal: number,
  tipoDesconto: TipoDesconto | null,
  valorDesconto: number
): number {
  if (tipoDesconto === null || valorDesconto === 0) {
    return 0;
  }

  if (valorDesconto < 0) {
    throw new RegraNegocioError('O valor do desconto não pode ser negativo.');
  }

  if (tipoDesconto === TipoDesconto.PERCENTUAL) {
    if (valorDesconto > 100) {
      throw new RegraNegocioError('O desconto percentual deve estar entre 0% e 100%.');
    }
    return arredondarMoeda(subtotal * (valorDesconto / 100));
  }

  if (tipoDesconto === TipoDesconto.FIXO) {
    if (valorDesconto > subtotal) {
      throw new RegraNegocioError('O desconto fixo não pode exceder o subtotal do orçamento.');
    }
    return arredondarMoeda(valorDesconto);
  }

  return 0;
}

/**
 * Calcula o valor total a partir do subtotal e do desconto deduzido.
 * Regras: RN54 (total = subtotal - desconto, nunca negativo).
 */
export function calcularTotalOrcamento(subtotal: number, valorDescontoDeduzido: number): number {
  const total = arredondarMoeda(subtotal - valorDescontoDeduzido);
  if (total < 0) {
    throw new RegraNegocioError('O total do orçamento não pode ser negativo.');
  }
  return total;
}
