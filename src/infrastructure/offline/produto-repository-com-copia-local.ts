import {
  AtualizarProdutoDados,
  CriarProdutoDados,
  ProdutoRepository,
} from '../../domain/repositories/produto.repository.interface';
import { Produto } from '../../domain/entities/produto';
import { ArmazenamentoLocal } from '../../application/interfaces/armazenamento-local.interface';
import { ConectividadeProvider } from '../../application/interfaces/conectividade-provider.interface';
import { supabaseProdutoRepository } from '../repositories/supabase-produto.repository';
import { armazenamentoLocal } from './armazenamento-local-cifrado';
import { conectividadeProvider } from './expo-network-conectividade.provider';
import { CopiaLocalDeLista } from './copia-local-de-lista';

/**
 * Repositório de produtos com a última cópia do catálogo guardada no aparelho (RNF36/RF83).
 * Leituras funcionam sem conexão a partir da cópia; cadastros continuam exigindo conexão.
 */
export class ProdutoRepositoryComCopiaLocal implements ProdutoRepository {
  private readonly copia: CopiaLocalDeLista<Produto>;

  constructor(
    private readonly online: ProdutoRepository = supabaseProdutoRepository,
    armazenamento: ArmazenamentoLocal = armazenamentoLocal,
    conectividade: ConectividadeProvider = conectividadeProvider
  ) {
    this.copia = new CopiaLocalDeLista(armazenamento, 'produtos', (salvo) => new Produto(salvo), conectividade);
  }

  listar(usuarioId: string): Promise<Produto[]> {
    return this.copia.listar(usuarioId, () => this.online.listar(usuarioId));
  }

  buscarPorId(id: string): Promise<Produto | null> {
    return this.copia.buscarPorId(id, () => this.online.buscarPorId(id));
  }

  async criar(dados: CriarProdutoDados): Promise<Produto> {
    const produto = await this.copia.escrever(() => this.online.criar(dados));
    await this.copia.guardarItem(produto);
    return produto;
  }

  async atualizar(id: string, dados: AtualizarProdutoDados): Promise<Produto> {
    const produto = await this.copia.escrever(() => this.online.atualizar(id, dados));
    await this.copia.guardarItem(produto);
    return produto;
  }

  async alterarAtivo(id: string, ativo: boolean): Promise<void> {
    await this.copia.escrever(() => this.online.alterarAtivo(id, ativo));
    await this.copia.alterarItem(id, (produto) => (ativo ? produto.ativar() : produto.desativar()));
  }
}

export const produtoRepositoryComCopiaLocal = new ProdutoRepositoryComCopiaLocal();
