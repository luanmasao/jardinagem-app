import { ProdutoRepository } from '../../../domain/repositories/produto.repository.interface';
import { Produto } from '../../../domain/entities/produto';
import { AuthService } from '../../services/auth.service';
import { validarDadosProduto } from '../../validation/produto.validator';

export interface CriarProdutoInput {
  nome: string;
  descricao?: string | null;
  unidade: string;
  precoBase: number;
  ativo?: boolean;
}

/**
 * Caso de uso: Criar produto.
 * Injeta usuario_id a partir do usuário autenticado.
 * Produto não possui medição de área.
 */
export class CriarProdutoUseCase {
  constructor(
    private readonly produtoRepository: ProdutoRepository,
    private readonly authService: AuthService
  ) {}

  async execute(input: CriarProdutoInput): Promise<Produto> {
    const usuarioAtual = await this.authService.getCurrentUser();
    if (!usuarioAtual) {
      throw new Error('Usuário não autenticado.');
    }

    validarDadosProduto(input);

    return this.produtoRepository.criar({
      usuarioId: usuarioAtual.id,
      nome: input.nome.trim(),
      descricao: input.descricao ? input.descricao.trim() : null,
      unidade: input.unidade.trim(),
      precoBase: input.precoBase,
      ativo: input.ativo ?? true,
    });
  }
}
