import { Endereco } from './endereco';
import { RegraNegocioError } from '../errors/dominio-error';

export interface ClienteProps {
  id: string;
  usuarioId: string;
  nome: string;
  telefone?: string | null;
  email?: string | null;
  documento?: string | null;
  observacoes?: string | null;
  ativo?: boolean;
  endereco?: Endereco | null;
}

export class Cliente {
  public readonly id: string;
  public readonly usuarioId: string;
  public nome: string;
  public telefone: string | null;
  public email: string | null;
  public documento: string | null;
  public observacoes: string | null;
  public ativo: boolean;
  public endereco: Endereco | null;

  constructor(props: ClienteProps) {
    if (!props.id || props.id.trim() === '') {
      throw new RegraNegocioError('O ID do cliente é obrigatório.');
    }
    if (!props.usuarioId || props.usuarioId.trim() === '') {
      throw new RegraNegocioError('O ID do usuário proprietário é obrigatório.');
    }
    if (!props.nome || props.nome.trim() === '') {
      throw new RegraNegocioError('O nome do cliente é obrigatório.');
    }

    this.id = props.id;
    this.usuarioId = props.usuarioId;
    this.nome = props.nome.trim();
    this.telefone = props.telefone ? props.telefone.trim() : null;
    this.email = props.email ? props.email.trim() : null;
    this.documento = props.documento ? props.documento.trim() : null;
    this.observacoes = props.observacoes ? props.observacoes.trim() : null;
    this.ativo = props.ativo ?? true;
    this.endereco = props.endereco ?? null;
  }

  public ativar(): void {
    this.ativo = true;
  }

  public desativar(): void {
    this.ativo = false;
  }

  public definirEndereco(endereco: Endereco): void {
    if (endereco.clienteId !== this.id) {
      throw new RegraNegocioError('O endereço não pertence a este cliente.');
    }
    this.endereco = endereco;
  }

  public removerEndereco(): void {
    this.endereco = null;
  }

  public atualizarDados(dados: {
    nome?: string;
    telefone?: string | null;
    email?: string | null;
    documento?: string | null;
    observacoes?: string | null;
  }): void {
    if (dados.nome !== undefined) {
      if (!dados.nome || dados.nome.trim() === '') {
        throw new RegraNegocioError('O nome do cliente não pode ser vazio.');
      }
      this.nome = dados.nome.trim();
    }
    if (dados.telefone !== undefined) this.telefone = dados.telefone ? dados.telefone.trim() : null;
    if (dados.email !== undefined) this.email = dados.email ? dados.email.trim() : null;
    if (dados.documento !== undefined) this.documento = dados.documento ? dados.documento.trim() : null;
    if (dados.observacoes !== undefined) this.observacoes = dados.observacoes ? dados.observacoes.trim() : null;
  }
}
