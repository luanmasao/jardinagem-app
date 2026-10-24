import { Orcamento } from '../entities/orcamento';
import { StatusOrcamento } from '../enums/status-orcamento';
import { TipoDesconto } from '../enums/tipo-desconto';

export interface CriarOrcamentoDados {
  /** Gerado no aparelho, para o mesmo rascunho poder ser criado offline e sincronizado depois (D-OFF-03). */
  id?: string;
  usuarioId: string;
  clienteId: string;
  numero?: string;
  dataValidade?: Date | null;
  tipoDesconto?: TipoDesconto | null;
  valorDesconto?: number;
  observacoes?: string | null;
  condicoesPagamento?: string | null;
}

export interface AtualizarOrcamentoDados {
  clienteId?: string;
  dataValidade?: Date | null;
  tipoDesconto?: TipoDesconto | null;
  valorDesconto?: number;
  observacoes?: string | null;
  condicoesPagamento?: string | null;
  subtotal?: number;
  total?: number;
}

export interface OrcamentoResumo {
  id: string;
  usuarioId: string;
  clienteId: string;
  clienteNome?: string;
  numero: string;
  dataCriacao: Date;
  dataValidade: Date | null;
  status: StatusOrcamento;
  subtotal: number;
  tipoDesconto: TipoDesconto | null;
  valorDesconto: number;
  total: number;
  totalItens?: number;
  /** Rascunho com alterações guardadas só no aparelho. Marca técnica, não é status (RN84). */
  pendenteSincronizacao?: boolean;
}

export interface OrcamentoComCliente {
  orcamento: Orcamento;
  clienteNome?: string;
  clienteTelefone?: string | null;
  clienteEmail?: string | null;
  /** Rascunho com alterações guardadas só no aparelho. Marca técnica, não é status (RN84). */
  pendenteSincronizacao?: boolean;
}

/**
 * Contrato canônico para o repositório de orçamentos.
 * Segue a arquitetura em camadas do projeto e respeita o RLS do Supabase.
 */
export interface OrcamentoRepository {
  listar(usuarioId: string, filtroStatus?: StatusOrcamento): Promise<OrcamentoResumo[]>;
  buscarPorId(id: string): Promise<OrcamentoComCliente | null>;
  obterProximoNumero(usuarioId: string): Promise<string>;
  criar(dados: CriarOrcamentoDados): Promise<Orcamento>;
  atualizar(id: string, dados: AtualizarOrcamentoDados): Promise<Orcamento>;
  alterarStatus(id: string, novoStatus: StatusOrcamento): Promise<void>;
  excluir(id: string): Promise<void>;
  expirarMeusOrcamentos?(): Promise<number>;
  /** Quantidade de rascunhos com alterações ainda não enviadas ao servidor (RNF40, RF87). */
  contarPendentesSincronizacao?(): Promise<number>;
}

