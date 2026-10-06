import { Area } from '../entities/area';
import { GeometriaPoligono } from '../types/geometria';

export interface CriarAreaDados {
  id?: string;
  itemOrcamentoId: string;
  nome?: string | null;
  geometria: GeometriaPoligono;
  areaCalculada: number;
  unidade?: string;
  observacoes?: string | null;
}

export interface AtualizarAreaDados {
  nome?: string | null;
  geometria?: GeometriaPoligono;
  areaCalculada?: number;
  unidade?: string;
  observacoes?: string | null;
}

/**
 * Contrato canônico para o repositório de áreas de serviço (GAP-AREA-04).
 * Segue a arquitetura em camadas do projeto e respeita o RLS do Supabase.
 */
export interface AreaRepository {
  listarPorItem(itemOrcamentoId: string): Promise<Area[]>;
  buscarPorId(id: string): Promise<Area | null>;
  criar(dados: CriarAreaDados): Promise<Area>;
  atualizar(id: string, dados: AtualizarAreaDados): Promise<Area>;
  excluir(id: string): Promise<void>;
  remover(id: string): Promise<void>;
}
