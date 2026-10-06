import { Cliente } from '../entities/cliente';
import { Endereco } from '../entities/endereco';

export interface CriarClienteDados {
  usuarioId: string;
  nome: string;
  telefone?: string | null;
  email?: string | null;
  documento?: string | null;
  observacoes?: string | null;
  ativo?: boolean;
}

export interface AtualizarClienteDados {
  nome?: string;
  telefone?: string | null;
  email?: string | null;
  documento?: string | null;
  observacoes?: string | null;
}

export interface SalvarEnderecoDados {
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

/**
 * Contrato canônico para o repositório de clientes.
 * Segue a arquitetura em camadas do projeto.
 */
export interface ClienteRepository {
  listar(usuarioId: string): Promise<Cliente[]>;
  buscarPorId(id: string): Promise<Cliente | null>;
  criar(dados: CriarClienteDados): Promise<Cliente>;
  atualizar(id: string, dados: AtualizarClienteDados): Promise<Cliente>;
  alterarAtivo(id: string, ativo: boolean): Promise<void>;
  obterEndereco(clienteId: string): Promise<Endereco | null>;
  salvarEndereco(clienteId: string, dados: SalvarEnderecoDados): Promise<Endereco>;
}
