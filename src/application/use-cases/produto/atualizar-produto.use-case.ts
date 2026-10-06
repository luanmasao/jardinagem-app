import { ProdutoRepository } from '../../../domain/repositories/produto.repository.interface';
import { Produto } from '../../../domain/entities/produto';
import { AuthService } from '../../services/auth.service';
import { RegraNegocioError } from '../../../domain/errors/dominio-error';

export interface AtualizarProdutoInput {
  nome?: string;
  descricao?: string | null;
  unidade?: string;
  precoBase?: number;
}

/**
 * Caso de uso: Atualizar produto existente.
 * Valida titularidade e impede troca de usuário.
 */
export class AtualizarProdutoUseCase {
  constructor(
    private readonly produtoRepository: ProdutoRepository,
    private readonly authService: AuthService
  ) {}

  async execute(id: string, input: AtualizarProdutoInput): Promise<Produto> {
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

    if (input.nome !== undefined) {
      if (!input.nome || input.nome.trim() === '') {
        throw new RegraNegocioError('O nome do produto é obrigatório.');
      }
      if (input.nome.trim().length > 150) {
        throw new RegraNegocioError('O nome do produto não pode exceder 150 caracteres.');
      }
    }

    if (input.unidade !== undefined) {
      if (!input.unidade || input.unidade.trim() === '') {
        throw new RegraNegocioError('A unidade de medida é obrigatória.');
      }
    }

    if (input.precoBase !== undefined) {
      if (typeof input.precoBase !== 'number' || input.precoBase < 0) {
        throw new RegraNegocioError('O preço base não pode ser negativo.');
      }
    }

    return this.produtoRepository.atualizar(id, {
      nome: input.nome !== undefined ? input.nome.trim() : undefined,
      descricao: input.descricao !== undefined ? (input.descricao ? input.descricao.trim() : null) : undefined,
      unidade: input.unidade !== undefined ? input.unidade.trim() : undefined,
      precoBase: input.precoBase,
    });
  }
}
