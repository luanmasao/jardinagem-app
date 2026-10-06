import { OrcamentoRepository } from '../../../domain/repositories/orcamento.repository.interface';
import { StatusOrcamento } from '../../../domain/enums/status-orcamento';
import { Orcamento } from '../../../domain/entities/orcamento';
import { RegraNegocioError, TransicaoInvalidaError } from '../../../domain/errors/dominio-error';

export interface AlterarStatusOrcamentoInput {
  id: string;
  usuarioId: string;
  novoStatus: StatusOrcamento;
}

/**
 * Caso de uso: Alterar status do orçamento conforme máquina de estados homologada (RN61 a RN71).
 */
export class AlterarStatusOrcamentoUseCase {
  constructor(private readonly orcamentoRepository: OrcamentoRepository) {}

  async execute(input: AlterarStatusOrcamentoInput): Promise<Orcamento> {
    if (!input.id || input.id.trim() === '') {
      throw new RegraNegocioError('O ID do orçamento é obrigatório.');
    }
    if (!input.usuarioId || input.usuarioId.trim() === '') {
      throw new RegraNegocioError('Usuário não autenticado.');
    }

    const resultado = await this.orcamentoRepository.buscarPorId(input.id);
    if (!resultado) {
      throw new RegraNegocioError('Orçamento não encontrado.');
    }

    if (resultado.orcamento.usuarioId !== input.usuarioId) {
      throw new RegraNegocioError('Orçamento não encontrado ou não pertence ao usuário.');
    }

    const orcamento = resultado.orcamento;

    // Se o status desejado for idêntico ao atual, operação idempotente
    if (orcamento.status === input.novoStatus) {
      return orcamento;
    }

    // Aplica transição de estados através dos métodos ricos da entidade de domínio
    switch (input.novoStatus) {
      case StatusOrcamento.ENVIADO:
        orcamento.enviar();
        break;
      case StatusOrcamento.EM_ANALISE:
        orcamento.iniciarAnalise();
        break;
      case StatusOrcamento.APROVADO:
        orcamento.aprovar();
        break;
      case StatusOrcamento.RECUSADO:
        orcamento.recusar();
        break;
      case StatusOrcamento.CONCLUIDO:
        orcamento.concluir();
        break;
      case StatusOrcamento.CANCELADO:
        orcamento.cancelar();
        break;
      case StatusOrcamento.EXPIRADO:
        if (orcamento.status !== StatusOrcamento.ENVIADO && orcamento.status !== StatusOrcamento.EM_ANALISE) {
          throw new TransicaoInvalidaError(orcamento.status, StatusOrcamento.EXPIRADO);
        }
        orcamento.status = StatusOrcamento.EXPIRADO;
        break;
      default:
        throw new TransicaoInvalidaError(orcamento.status, input.novoStatus);
    }

    await this.orcamentoRepository.alterarStatus(input.id, orcamento.status);
    return orcamento;
  }
}
