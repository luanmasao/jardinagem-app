import { Cliente } from '../../../domain/entities/cliente';
import { ClienteRepository } from '../../../domain/repositories/cliente.repository.interface';
import { supabaseClienteRepository } from '../../../infrastructure/repositories/supabase-cliente.repository';
import { AuthService, authService } from '../../services/auth.service';
import { RegraNegocioError } from '../../../domain/errors/dominio-error';

/**
 * Caso de Uso: ObterCliente
 * Obtém os dados de um cliente específico pelo ID.
 */
export class ObterClienteUseCase {
  constructor(
    private readonly repository: ClienteRepository = supabaseClienteRepository,
    private readonly auth: AuthService = authService
  ) {}

  async execute(id: string): Promise<Cliente | null> {
    if (!id || id.trim() === '') {
      throw new RegraNegocioError('O ID do cliente é obrigatório.');
    }

    const user = await this.auth.getCurrentUser();
    if (!user || !user.id) {
      throw new Error('Usuário não autenticado.');
    }

    const cliente = await this.repository.buscarPorId(id.trim());

    if (!cliente) return null;

    // Defesa em profundidade: não expor cliente de outro usuário
    if (cliente.usuarioId !== user.id) {
      return null;
    }

    return cliente;
  }
}
