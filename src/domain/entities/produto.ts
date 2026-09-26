import { RegraNegocioError } from '../errors/dominio-error';
import { arredondarMoeda } from '../calculations/moeda';

export interface ProdutoProps {
  id: string;
  usuarioId: string;
  nome: string;
  descricao?: string | null;
  unidade: string;
  precoBase: number;
  ativo?: boolean;
}

export class Produto {
  public readonly id: string;
  public readonly usuarioId: string;
  public nome: string;
  public descricao: string | null;
  public unidade: string;
  public precoBase: number;
  public ativo: boolean;

  constructor(props: ProdutoProps) {
    if (!props.id || props.id.trim() === '') {
      throw new RegraNegocioError('O ID do produto é obrigatório.');
    }
    if (!props.usuarioId || props.usuarioId.trim() === '') {
      throw new RegraNegocioError('O ID do usuário proprietário é obrigatório.');
    }
    if (!props.nome || props.nome.trim() === '') {
      throw new RegraNegocioError('O nome do produto é obrigatório.');
    }
    if (!props.unidade || props.unidade.trim() === '') {
      throw new RegraNegocioError('A unidade do produto é obrigatória.');
    }
    if (typeof props.precoBase !== 'number' || props.precoBase < 0) {
      throw new RegraNegocioError('O preço base do produto não pode ser negativo.');
    }

    this.id = props.id;
    this.usuarioId = props.usuarioId;
    this.nome = props.nome.trim();
    this.descricao = props.descricao ? props.descricao.trim() : null;
    this.unidade = props.unidade.trim();
    this.precoBase = arredondarMoeda(props.precoBase);
    this.ativo = props.ativo ?? true;
  }

  public ativar(): void {
    this.ativo = true;
  }

  public desativar(): void {
    this.ativo = false;
  }

  public atualizar(dados: {
    nome?: string;
    descricao?: string | null;
    unidade?: string;
    precoBase?: number;
  }): void {
    if (dados.nome !== undefined) {
      if (!dados.nome || dados.nome.trim() === '') {
        throw new RegraNegocioError('O nome do produto não pode ser vazio.');
      }
      this.nome = dados.nome.trim();
    }
    if (dados.descricao !== undefined) {
      this.descricao = dados.descricao ? dados.descricao.trim() : null;
    }
    if (dados.unidade !== undefined) {
      if (!dados.unidade || dados.unidade.trim() === '') {
        throw new RegraNegocioError('A unidade do produto não pode ser vazia.');
      }
      this.unidade = dados.unidade.trim();
    }
    if (dados.precoBase !== undefined) {
      if (typeof dados.precoBase !== 'number' || dados.precoBase < 0) {
        throw new RegraNegocioError('O preço base do produto não pode ser negativo.');
      }
      this.precoBase = arredondarMoeda(dados.precoBase);
    }
  }
}
