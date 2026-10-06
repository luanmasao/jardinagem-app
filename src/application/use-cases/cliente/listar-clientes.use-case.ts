import { Cliente } from '../../../domain/entities/cliente';
import { ClienteRepository } from '../../../domain/repositories/cliente.repository.interface';
import { supabaseClienteRepository } from '../../../infrastructure/repositories/supabase-cliente.repository';
import { AuthService, authService } from '../../services/auth.service';

/**
 * Caso de Uso: ListarClientes
 * Lista todos os clientes do usuário autenticado atual.
 */
export class ListarClientesUseCase {
  constructor(
    private readonly repository: ClienteRepository = supabaseClienteRepository,
    private readonly auth: AuthService = authService
  ) {}

  async execute(): Promise<Cliente[]> {
    const user = await this.auth.getCurrentUser();
    if (!user || !user.id) {
      throw new Error('Usuário não autenticado.');
    }

    return this.repository.listar(user.id);
  }
}
