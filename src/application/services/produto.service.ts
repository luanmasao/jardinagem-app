import { Produto } from '../../domain/entities/produto';
import { ProdutoRepository } from '../../domain/repositories/produto.repository.interface';
import { produtoRepositoryComCopiaLocal } from '../../infrastructure/offline/produto-repository-com-copia-local';
import { AuthService, authService } from './auth.service';
import {
  ListarProdutosUseCase,
  ObterProdutoUseCase,
  CriarProdutoUseCase,
  CriarProdutoInput,
  AtualizarProdutoUseCase,
  AtualizarProdutoInput,
  AlterarAtivoProdutoUseCase,
} from '../use-cases/produto';

/**
 * ProdutoService: Serviço de aplicação que orquestra as operações do catálogo de produtos.
 * Mantém a camada de apresentação desacoplada da infraestrutura.
 */
export class ProdutoService {
  private readonly listarProdutosUseCase: ListarProdutosUseCase;
  private readonly obterProdutoUseCase: ObterProdutoUseCase;
  private readonly criarProdutoUseCase: CriarProdutoUseCase;
  private readonly atualizarProdutoUseCase: AtualizarProdutoUseCase;
  private readonly alterarAtivoProdutoUseCase: AlterarAtivoProdutoUseCase;

  constructor(
    repository: ProdutoRepository = produtoRepositoryComCopiaLocal,
    auth: AuthService = authService
  ) {
    this.listarProdutosUseCase = new ListarProdutosUseCase(repository, auth);
    this.obterProdutoUseCase = new ObterProdutoUseCase(repository, auth);
    this.criarProdutoUseCase = new CriarProdutoUseCase(repository, auth);
    this.atualizarProdutoUseCase = new AtualizarProdutoUseCase(repository, auth);
    this.alterarAtivoProdutoUseCase = new AlterarAtivoProdutoUseCase(repository, auth);
  }

  async listarProdutos(): Promise<Produto[]> {
    return this.listarProdutosUseCase.execute();
  }

  async obterProduto(id: string): Promise<Produto | null> {
    return this.obterProdutoUseCase.execute(id);
  }

  async criarProduto(dados: CriarProdutoInput): Promise<Produto> {
    return this.criarProdutoUseCase.execute(dados);
  }

  async atualizarProduto(id: string, dados: AtualizarProdutoInput): Promise<Produto> {
    return this.atualizarProdutoUseCase.execute(id, dados);
  }

  async alterarAtivoProduto(id: string, ativo: boolean): Promise<void> {
    return this.alterarAtivoProdutoUseCase.execute(id, ativo);
  }
}

/**
 * Singleton padrão do serviço de produtos da aplicação.
 */
export const produtoService = new ProdutoService();
