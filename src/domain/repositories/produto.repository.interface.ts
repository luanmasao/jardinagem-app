import { Produto } from '../entities/produto';

export interface CriarProdutoDados {
  usuarioId: string;
  nome: string;
  descricao?: string | null;
  unidade: string;
  precoBase: number;
  ativo?: boolean;
}

export interface AtualizarProdutoDados {
  nome?: string;
  descricao?: string | null;
  unidade?: string;
  precoBase?: number;
}

/**
 * Contrato canônico para o repositório de produtos do catálogo.
 * Segue a arquitetura em camadas do projeto.
 */
export interface ProdutoRepository {
  listar(usuarioId: string): Promise<Produto[]>;
  buscarPorId(id: string): Promise<Produto | null>;
  criar(dados: CriarProdutoDados): Promise<Produto>;
  atualizar(id: string, dados: AtualizarProdutoDados): Promise<Produto>;
  alterarAtivo(id: string, ativo: boolean): Promise<void>;
}
