import { ItemOrcamento } from '../entities/item-orcamento';
import { TipoItem } from '../enums/tipo-item';

export interface CriarItemOrcamentoDados {
  id?: string;
  orcamentoId: string;
  tipo: TipoItem;
  servicoId?: string | null;
  produtoId?: string | null;
  descricao: string;
  quantidade: number;
  unidade: string;
  valorUnitario: number;
  valorTotal: number;
  usaMedicaoArea: boolean;
}

export interface AtualizarItemOrcamentoDados {
  descricao?: string;
  quantidade?: number;
  valorUnitario?: number;
  valorTotal?: number;
}

/**
 * Contrato canônico para o repositório de itens de orçamento.
 * Segue a arquitetura em camadas do projeto e respeita o RLS do Supabase.
 */
export interface ItemOrcamentoRepository {
  listarPorOrcamento(orcamentoId: string): Promise<ItemOrcamento[]>;
  buscarPorId(id: string): Promise<ItemOrcamento | null>;
  criar(dados: CriarItemOrcamentoDados): Promise<ItemOrcamento>;
  atualizar(id: string, dados: AtualizarItemOrcamentoDados): Promise<ItemOrcamento>;
  excluir(id: string): Promise<void>;
}
