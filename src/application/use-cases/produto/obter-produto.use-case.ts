import { ProdutoRepository } from '../../../domain/repositories/produto.repository.interface';
import { Produto } from '../../../domain/entities/produto';
import { AuthService } from '../../services/auth.service';
import { RegraNegocioError } from '../../../domain/errors/dominio-error';

/**
 * Caso de uso: Obter produto por ID.
 * Garante que o produto pertence ao usuário autenticado.
 */
export class ObterProdutoUseCase {
  constructor(
    private readonly produtoRepository: ProdutoRepository,
    private readonly authService: AuthService
  ) {}

  async execute(id: string): Promise<Produto | null> {
    if (!id || id.trim() === '') {
      throw new RegraNegocioError('O ID do produto é obrigatório.');
    }

    const usuarioAtual = await this.authService.getCurrentUser();
    if (!usuarioAtual) {
      throw new Error('Usuário não autenticado.');
    }

    const produto = await this.produtoRepository.buscarPorId(id);
    if (!produto) {
      return null;
    }

    // Validação explícita de titularidade
    if (produto.usuarioId !== usuarioAtual.id) {
      return null;
    }

    return produto;
  }
}
