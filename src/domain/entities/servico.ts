import { RegraNegocioError } from '../errors/dominio-error';
import { arredondarMoeda } from '../calculations/moeda';

export interface ServicoProps {
  id: string;
  usuarioId: string;
  nome: string;
  descricao?: string | null;
  unidade: string;
  precoBase: number;
  usaMedicaoArea: boolean;
  ativo?: boolean;
}

export class Servico {
  public readonly id: string;
  public readonly usuarioId: string;
  public nome: string;
  public descricao: string | null;
  public unidade: string;
  public precoBase: number;
  public usaMedicaoArea: boolean;
  public ativo: boolean;

  constructor(props: ServicoProps) {
    if (!props.id || props.id.trim() === '') {
      throw new RegraNegocioError('O ID do serviço é obrigatório.');
    }
    if (!props.usuarioId || props.usuarioId.trim() === '') {
      throw new RegraNegocioError('O ID do usuário proprietário é obrigatório.');
    }
    if (!props.nome || props.nome.trim() === '') {
      throw new RegraNegocioError('O nome do serviço é obrigatório.');
    }
    if (!props.unidade || props.unidade.trim() === '') {
      throw new RegraNegocioError('A unidade do serviço é obrigatória.');
    }
    if (typeof props.precoBase !== 'number' || props.precoBase < 0) {
      throw new RegraNegocioError('O preço base do serviço não pode ser negativo.');
    }

    // RN16: Serviços que utilizam medição de área devem utilizar m² como unidade comercial.
    const unidadeAjustada = props.usaMedicaoArea ? 'm²' : props.unidade.trim();

    this.id = props.id;
    this.usuarioId = props.usuarioId;
    this.nome = props.nome.trim();
    this.descricao = props.descricao ? props.descricao.trim() : null;
    this.unidade = unidadeAjustada;
    this.precoBase = arredondarMoeda(props.precoBase);
    this.usaMedicaoArea = props.usaMedicaoArea;
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
    usaMedicaoArea?: boolean;
  }): void {
    if (dados.nome !== undefined) {
      if (!dados.nome || dados.nome.trim() === '') {
        throw new RegraNegocioError('O nome do serviço não pode ser vazio.');
      }
      this.nome = dados.nome.trim();
    }
    if (dados.descricao !== undefined) {
      this.descricao = dados.descricao ? dados.descricao.trim() : null;
    }
    if (dados.usaMedicaoArea !== undefined) {
      this.usaMedicaoArea = dados.usaMedicaoArea;
    }
    if (dados.unidade !== undefined) {
      if (!dados.unidade || dados.unidade.trim() === '') {
        throw new RegraNegocioError('A unidade do serviço não pode ser vazia.');
      }
      this.unidade = this.usaMedicaoArea ? 'm²' : dados.unidade.trim();
    } else if (this.usaMedicaoArea) {
      this.unidade = 'm²';
    }
    if (dados.precoBase !== undefined) {
      if (typeof dados.precoBase !== 'number' || dados.precoBase < 0) {
        throw new RegraNegocioError('O preço base do serviço não pode ser negativo.');
      }
      this.precoBase = arredondarMoeda(dados.precoBase);
    }
  }
}
