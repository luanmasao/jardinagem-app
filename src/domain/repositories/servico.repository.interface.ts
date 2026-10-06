import { Servico } from '../entities/servico';

export interface CriarServicoDados {
  usuarioId: string;
  nome: string;
  descricao?: string | null;
  unidade: string;
  precoBase: number;
  usaMedicaoArea?: boolean;
  ativo?: boolean;
}

export interface AtualizarServicoDados {
  nome?: string;
  descricao?: string | null;
  unidade?: string;
  precoBase?: number;
  usaMedicaoArea?: boolean;
}

/**
 * Contrato canônico para o repositório de serviços do catálogo.
 * Segue a arquitetura em camadas do projeto.
 */
export interface ServicoRepository {
  listar(usuarioId: string): Promise<Servico[]>;
  buscarPorId(id: string): Promise<Servico | null>;
  criar(dados: CriarServicoDados): Promise<Servico>;
  atualizar(id: string, dados: AtualizarServicoDados): Promise<Servico>;
  alterarAtivo(id: string, ativo: boolean): Promise<void>;
}
