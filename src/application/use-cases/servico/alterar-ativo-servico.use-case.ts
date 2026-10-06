import { ServicoRepository } from '../../../domain/repositories/servico.repository.interface';
import { AuthService } from '../../services/auth.service';
import { RegraNegocioError } from '../../../domain/errors/dominio-error';

/**
 * Caso de uso: Alterar logicamente o status ativo de um serviço.
 * Preserva o registro físico no banco de dados.
 */
export class AlterarAtivoServicoUseCase {
  constructor(
    private readonly servicoRepository: ServicoRepository,
    private readonly authService: AuthService
  ) {}

  async execute(id: string, ativo: boolean): Promise<void> {
    if (!id || id.trim() === '') {
      throw new RegraNegocioError('O ID do serviço é obrigatório.');
    }

    const usuarioAtual = await this.authService.getCurrentUser();
    if (!usuarioAtual) {
      throw new Error('Usuário não autenticado.');
    }

    const servicoExistente = await this.servicoRepository.buscarPorId(id);
    if (!servicoExistente || servicoExistente.usuarioId !== usuarioAtual.id) {
      throw new Error('Serviço não encontrado ou não pertence ao usuário.');
    }

    await this.servicoRepository.alterarAtivo(id, ativo);
  }
}
