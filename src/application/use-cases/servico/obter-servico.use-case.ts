import { ServicoRepository } from '../../../domain/repositories/servico.repository.interface';
import { Servico } from '../../../domain/entities/servico';
import { AuthService } from '../../services/auth.service';
import { RegraNegocioError } from '../../../domain/errors/dominio-error';

/**
 * Caso de uso: Obter serviço por ID.
 * Garante que o serviço pertence ao usuário autenticado.
 */
export class ObterServicoUseCase {
  constructor(
    private readonly servicoRepository: ServicoRepository,
    private readonly authService: AuthService
  ) {}

  async execute(id: string): Promise<Servico | null> {
    if (!id || id.trim() === '') {
      throw new RegraNegocioError('O ID do serviço é obrigatório.');
    }

    const usuarioAtual = await this.authService.getCurrentUser();
    if (!usuarioAtual) {
      throw new Error('Usuário não autenticado.');
    }

    const servico = await this.servicoRepository.buscarPorId(id);
    if (!servico) {
      return null;
    }

    // Validação explícita de titularidade
    if (servico.usuarioId !== usuarioAtual.id) {
      return null;
    }

    return servico;
  }
}
