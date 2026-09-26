import { RegraNegocioError } from '../errors/dominio-error';

export interface UsuarioProps {
  id: string;
  nome: string;
  telefone?: string | null;
  dataCadastro?: Date;
  ativo?: boolean;
}

export class Usuario {
  public readonly id: string;
  public nome: string;
  public telefone: string | null;
  public readonly dataCadastro: Date;
  public ativo: boolean;

  constructor(props: UsuarioProps) {
    if (!props.id || props.id.trim() === '') {
      throw new RegraNegocioError('O ID do usuário é obrigatório.');
    }
    if (!props.nome || props.nome.trim() === '') {
      throw new RegraNegocioError('O nome do usuário é obrigatório.');
    }

    this.id = props.id;
    this.nome = props.nome.trim();
    this.telefone = props.telefone ? props.telefone.trim() : null;
    this.dataCadastro = props.dataCadastro ?? new Date();
    this.ativo = props.ativo ?? true;
  }

  public ativar(): void {
    this.ativo = true;
  }

  public desativar(): void {
    this.ativo = false;
  }

  public atualizarDados(dados: { nome?: string; telefone?: string | null }): void {
    if (dados.nome !== undefined) {
      if (!dados.nome || dados.nome.trim() === '') {
        throw new RegraNegocioError('O nome do usuário não pode ser vazio.');
      }
      this.nome = dados.nome.trim();
    }
    if (dados.telefone !== undefined) {
      this.telefone = dados.telefone ? dados.telefone.trim() : null;
    }
  }
}
