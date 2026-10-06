import { OrcamentoRepository } from '../../../domain/repositories/orcamento.repository.interface';
import { ItemOrcamentoRepository } from '../../../domain/repositories/item-orcamento.repository.interface';
import { RegraNegocioError } from '../../../domain/errors/dominio-error';

export interface RemoverItemOrcamentoInput {
  usuarioId: string;
  orcamentoId: string;
  itemId: string;
}

/**
 * Caso de uso: Remover item de orçamento (RN35).
 * Permitido estritamente quando o orçamento está em RASCUNHO.
 * Recalcula automaticamente subtotal, desconto e total.
 */
export class RemoverItemOrcamentoUseCase {
  constructor(
    private readonly orcamentoRepository: OrcamentoRepository,
    private readonly itemOrcamentoRepository: ItemOrcamentoRepository
  ) {}

  async execute(input: RemoverItemOrcamentoInput): Promise<void> {
    if (!input.usuarioId || input.usuarioId.trim() === '') {
      throw new RegraNegocioError('Usuário não autenticado.');
    }
    if (!input.orcamentoId || input.orcamentoId.trim() === '') {
      throw new RegraNegocioError('O ID do orçamento é obrigatório.');
    }
    if (!input.itemId || input.itemId.trim() === '') {
      throw new RegraNegocioError('O ID do item de orçamento é obrigatório.');
    }

    const resultado = await this.orcamentoRepository.buscarPorId(input.orcamentoId);
    if (!resultado) {
      throw new RegraNegocioError('Orçamento não encontrado.');
    }

    if (resultado.orcamento.usuarioId !== input.usuarioId) {
      throw new RegraNegocioError('Orçamento não encontrado ou não pertence ao usuário.');
    }

    const orcamento = resultado.orcamento;

    // RN64 / RN65: Bloqueio estrito fora de RASCUNHO
    if (!orcamento.editavel) {
      throw new RegraNegocioError(
        `Itens não podem ser removidos de orçamentos no status '${orcamento.status}'. Somente orçamentos em RASCUNHO são editáveis.`
      );
    }

    // 1. Remove da entidade de domínio e recalcula totais (RN35, RN48)
    orcamento.removerItem(input.itemId);

    // 2. Exclui o item do banco de dados
    await this.itemOrcamentoRepository.excluir(input.itemId);

    // 3. Atualiza os totais recalculados do orçamento e sincroniza desconto caso neutralizado/ajustado
    await this.orcamentoRepository.atualizar(orcamento.id, {
      tipoDesconto: orcamento.tipoDesconto,
      valorDesconto: orcamento.valorDesconto,
      subtotal: orcamento.subtotal,
      total: orcamento.total,
    });
  }
}
