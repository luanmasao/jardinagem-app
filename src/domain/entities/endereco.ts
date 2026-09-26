import { RegraNegocioError } from '../errors/dominio-error';

export interface EnderecoProps {
  id: string;
  clienteId: string;
  cep?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export class Endereco {
  public readonly id: string;
  public readonly clienteId: string;
  public cep: string | null;
  public logradouro: string | null;
  public numero: string | null;
  public complemento: string | null;
  public bairro: string | null;
  public cidade: string | null;
  public estado: string | null;
  public latitude: number | null;
  public longitude: number | null;

  constructor(props: EnderecoProps) {
    if (!props.id || props.id.trim() === '') {
      throw new RegraNegocioError('O ID do endereço é obrigatório.');
    }
    if (!props.clienteId || props.clienteId.trim() === '') {
      throw new RegraNegocioError('O ID do cliente proprietário do endereço é obrigatório.');
    }

    this.id = props.id;
    this.clienteId = props.clienteId;
    this.cep = props.cep ? props.cep.trim() : null;
    this.logradouro = props.logradouro ? props.logradouro.trim() : null;
    this.numero = props.numero ? props.numero.trim() : null;
    this.complemento = props.complemento ? props.complemento.trim() : null;
    this.bairro = props.bairro ? props.bairro.trim() : null;
    this.cidade = props.cidade ? props.cidade.trim() : null;
    this.estado = props.estado ? props.estado.trim().toUpperCase() : null;
    this.latitude = props.latitude ?? null;
    this.longitude = props.longitude ?? null;
  }

  public atualizar(dados: Partial<Omit<EnderecoProps, 'id' | 'clienteId'>>): void {
    if (dados.cep !== undefined) this.cep = dados.cep ? dados.cep.trim() : null;
    if (dados.logradouro !== undefined) this.logradouro = dados.logradouro ? dados.logradouro.trim() : null;
    if (dados.numero !== undefined) this.numero = dados.numero ? dados.numero.trim() : null;
    if (dados.complemento !== undefined) this.complemento = dados.complemento ? dados.complemento.trim() : null;
    if (dados.bairro !== undefined) this.bairro = dados.bairro ? dados.bairro.trim() : null;
    if (dados.cidade !== undefined) this.cidade = dados.cidade ? dados.cidade.trim() : null;
    if (dados.estado !== undefined) this.estado = dados.estado ? dados.estado.trim().toUpperCase() : null;
    if (dados.latitude !== undefined) this.latitude = dados.latitude ?? null;
    if (dados.longitude !== undefined) this.longitude = dados.longitude ?? null;
  }
}
