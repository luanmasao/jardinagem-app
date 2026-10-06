import { ServicoRepository } from '../../../domain/repositories/servico.repository.interface';
import { Servico } from '../../../domain/entities/servico';
import { AuthService } from '../../services/auth.service';

export interface ListarServicosFiltros {
  apenasAtivos?: boolean;
}

/**
 * Caso de uso: Listar serviços pertencentes ao usuário autenticado.
 */
export class ListarServicosUseCase {
  constructor(
    private readonly servicoRepository: ServicoRepository,
    private readonly authService: AuthService
  ) {}

  async execute(filtros?: ListarServicosFiltros): Promise<Servico[]> {
    const usuarioAtual = await this.authService.getCurrentUser();
    if (!usuarioAtual) {
      throw new Error('Usuário não autenticado.');
    }

    const servicos = await this.servicoRepository.listar(usuarioAtual.id);

    if (filtros?.apenasAtivos) {
      return servicos.filter((s) => s.ativo);
    }

    return servicos;
  }
}
