import { ClienteRepository } from '../../../domain/repositories/cliente.repository.interface';
import { supabaseClienteRepository } from '../../../infrastructure/repositories/supabase-cliente.repository';
import { AuthService, authService } from '../../services/auth.service';
import { RegraNegocioError } from '../../../domain/errors/dominio-error';

/**
 * Caso de Uso: AlterarAtivoCliente
 * Realiza a ativação ou inativação lógica do cliente (ativo = true/false).
 * Não realiza exclusão física.
 */
export class AlterarAtivoClienteUseCase {
  constructor(
    private readonly repository: ClienteRepository = supabaseClienteRepository,
    private readonly auth: AuthService = authService
  ) {}

  async execute(id: string, ativo: boolean): Promise<void> {
    if (!id || id.trim() === '') {
      throw new RegraNegocioError('O ID do cliente é obrigatório.');
    }

    const user = await this.auth.getCurrentUser();
    if (!user || !user.id) {
      throw new Error('Usuário não autenticado.');
    }

    const clienteExistente = await this.repository.buscarPorId(id.trim());
    if (!clienteExistente || clienteExistente.usuarioId !== user.id) {
      throw new Error('Cliente não encontrado ou não pertence ao usuário.');
    }

    await this.repository.alterarAtivo(id.trim(), ativo);
  }
}
