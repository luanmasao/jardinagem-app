import { Endereco } from '../../../domain/entities/endereco';
import { ClienteRepository } from '../../../domain/repositories/cliente.repository.interface';
import { supabaseClienteRepository } from '../../../infrastructure/repositories/supabase-cliente.repository';
import { AuthService, authService } from '../../services/auth.service';
import { RegraNegocioError } from '../../../domain/errors/dominio-error';

/**
 * Caso de Uso: ObterEnderecoCliente
 * Obtém o endereço cadastrado para um cliente.
 */
export class ObterEnderecoClienteUseCase {
  constructor(
    private readonly repository: ClienteRepository = supabaseClienteRepository,
    private readonly auth: AuthService = authService
  ) {}

  async execute(clienteId: string): Promise<Endereco | null> {
    if (!clienteId || clienteId.trim() === '') {
      throw new RegraNegocioError('O ID do cliente é obrigatório.');
    }

    const user = await this.auth.getCurrentUser();
    if (!user || !user.id) {
      throw new Error('Usuário não autenticado.');
    }

    const cliente = await this.repository.buscarPorId(clienteId.trim());
    if (!cliente || cliente.usuarioId !== user.id) {
      return null;
    }

    return this.repository.obterEndereco(clienteId.trim());
  }
}
