import { ProdutoRepository } from '../../../domain/repositories/produto.repository.interface';
import { Produto } from '../../../domain/entities/produto';
import { AuthService } from '../../services/auth.service';

export interface ListarProdutosFiltros {
  apenasAtivos?: boolean;
}

/**
 * Caso de uso: Listar produtos pertencentes ao usuário autenticado.
 */
export class ListarProdutosUseCase {
  constructor(
    private readonly produtoRepository: ProdutoRepository,
    private readonly authService: AuthService
  ) {}

  async execute(filtros?: ListarProdutosFiltros): Promise<Produto[]> {
    const usuarioAtual = await this.authService.getCurrentUser();
    if (!usuarioAtual) {
      throw new Error('Usuário não autenticado.');
    }

    const produtos = await this.produtoRepository.listar(usuarioAtual.id);

    if (filtros?.apenasAtivos) {
      return produtos.filter((p) => p.ativo);
    }

    return produtos;
  }
}
