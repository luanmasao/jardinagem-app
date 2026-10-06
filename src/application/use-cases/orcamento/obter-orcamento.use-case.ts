import { OrcamentoRepository, OrcamentoComCliente } from '../../../domain/repositories/orcamento.repository.interface';
import { RegraNegocioError } from '../../../domain/errors/dominio-error';

export interface ObterOrcamentoInput {
  id: string;
  usuarioId: string;
}

/**
 * Caso de uso: Obter detalhes completos de um orçamento pelo ID.
 * Garante o isolamento multi-tenant (auth.uid() = usuario_id).
 */
export class ObterOrcamentoUseCase {
  constructor(private readonly orcamentoRepository: OrcamentoRepository) {}

  async execute(input: ObterOrcamentoInput): Promise<OrcamentoComCliente | null> {
    if (!input.id || input.id.trim() === '') {
      throw new RegraNegocioError('O ID do orçamento é obrigatório.');
    }
    if (!input.usuarioId || input.usuarioId.trim() === '') {
      throw new RegraNegocioError('Usuário não autenticado.');
    }

    const resultado = await this.orcamentoRepository.buscarPorId(input.id);
    if (!resultado) {
      return null;
    }

    // Validação estrita de titularidade
    if (resultado.orcamento.usuarioId !== input.usuarioId) {
      return null;
    }

    return resultado;
  }
}
