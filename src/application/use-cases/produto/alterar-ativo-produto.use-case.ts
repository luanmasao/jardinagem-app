import { ProdutoRepository } from '../../../domain/repositories/produto.repository.interface';
import { AuthService } from '../../services/auth.service';
import { RegraNegocioError } from '../../../domain/errors/dominio-error';

/**
 * Caso de uso: Alterar logicamente o status ativo de um produto.
 * Preserva o registro físico no banco de dados.
 */
export class AlterarAtivoProdutoUseCase {
  constructor(
    private readonly produtoRepository: ProdutoRepository,
    private readonly authService: AuthService
  ) {}

  async execute(id: string, ativo: boolean): Promise<void> {
    if (!id || id.trim() === '') {
      throw new RegraNegocioError('O ID do produto é obrigatório.');
    }

    const usuarioAtual = await this.authService.getCurrentUser();
    if (!usuarioAtual) {
      throw new Error('Usuário não autenticado.');
    }

    const produtoExistente = await this.produtoRepository.buscarPorId(id);
    if (!produtoExistente || produtoExistente.usuarioId !== usuarioAtual.id) {
      throw new Error('Produto não encontrado ou não pertence ao usuário.');
    }

    await this.produtoRepository.alterarAtivo(id, ativo);
  }
}
