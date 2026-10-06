import { OrcamentoRepository } from '../../../domain/repositories/orcamento.repository.interface';
import { ItemOrcamentoRepository } from '../../../domain/repositories/item-orcamento.repository.interface';
import { ItemOrcamento } from '../../../domain/entities/item-orcamento';
import { RegraNegocioError } from '../../../domain/errors/dominio-error';

export interface AtualizarItemOrcamentoInput {
  usuarioId: string;
  orcamentoId: string;
  itemId: string;
  quantidade?: number;
  descricao?: string;
  valorUnitario?: number;
}

/**
 * Caso de uso: Atualizar item de orçamento em RASCUNHO (RN31, RN32, RN34).
 * Permite alteração de quantidade manual para itens não medidos
 * ou personalização de descrição e valor unitário do snapshot.
 */
export class AtualizarItemOrcamentoUseCase {
  constructor(
    private readonly orcamentoRepository: OrcamentoRepository,
    private readonly itemOrcamentoRepository: ItemOrcamentoRepository
  ) {}

  async execute(input: AtualizarItemOrcamentoInput): Promise<ItemOrcamento> {
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
        `Itens não podem ser editados em orçamentos no status '${orcamento.status}'. Somente orçamentos em RASCUNHO são editáveis.`
      );
    }

    const item = orcamento.itens.find((i) => i.id === input.itemId);
    if (!item) {
      throw new RegraNegocioError(`Item com ID '${input.itemId}' não foi encontrado neste orçamento.`);
    }

    // RN32 / RN34: Atualização de quantidade (somente itens sem medição de área)
    if (input.quantidade !== undefined) {
      item.definirQuantidadeManual(input.quantidade);
    }

    // RN31: Personalização de descrição e valor unitário do snapshot
    if (input.descricao !== undefined || input.valorUnitario !== undefined) {
      item.personalizarItem({
        descricao: input.descricao,
        valorUnitario: input.valorUnitario,
      });
    }

    // Recalcula totais do orçamento
    orcamento.recalcularValores();

    // 1. Atualiza o item no banco
    const itemAtualizado = await this.itemOrcamentoRepository.atualizar(input.itemId, {
      descricao: item.descricao,
      quantidade: item.quantidade,
      valorUnitario: item.valorUnitario,
      valorTotal: item.valorTotal,
    });

    // 2. Atualiza os totais recalculados do orçamento e sincroniza desconto caso neutralizado/ajustado
    await this.orcamentoRepository.atualizar(orcamento.id, {
      tipoDesconto: orcamento.tipoDesconto,
      valorDesconto: orcamento.valorDesconto,
      subtotal: orcamento.subtotal,
      total: orcamento.total,
    });

    return itemAtualizado;
  }
}
