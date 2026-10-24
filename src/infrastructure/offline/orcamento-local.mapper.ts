import { Orcamento } from '../../domain/entities/orcamento';
import { ItemOrcamento } from '../../domain/entities/item-orcamento';
import { Area } from '../../domain/entities/area';
import { StatusOrcamento } from '../../domain/enums/status-orcamento';
import { TipoDesconto } from '../../domain/enums/tipo-desconto';
import { TipoItem } from '../../domain/enums/tipo-item';
import { GeometriaPoligono } from '../../domain/types/geometria';

/**
 * Formato em JSON do agregado de orçamento guardado no aparelho (D-OFF-02).
 * As entidades são reconstruídas pelos próprios construtores, que recalculam quantidades
 * medidas, totais dos itens e totais do orçamento, como acontece ao ler do Supabase.
 */
export interface AreaSalva {
  id: string;
  itemOrcamentoId: string;
  nome: string | null;
  geometria: GeometriaPoligono;
  areaCalculada: number;
  unidade: string;
  observacoes: string | null;
}

export interface ItemSalvo {
  id: string;
  orcamentoId: string;
  tipo: TipoItem;
  servicoId: string | null;
  produtoId: string | null;
  descricao: string;
  quantidade: number;
  unidade: string;
  valorUnitario: number;
  valorTotal: number;
  usaMedicaoArea: boolean;
  areas: AreaSalva[];
}

export interface OrcamentoSalvo {
  id: string;
  usuarioId: string;
  clienteId: string;
  numero: string;
  dataCriacao: string;
  /** Data civil "AAAA-MM-DD", no mesmo formato da coluna data_validade. */
  dataValidade: string | null;
  status: StatusOrcamento;
  subtotal: number;
  tipoDesconto: TipoDesconto | null;
  valorDesconto: number;
  total: number;
  observacoes: string | null;
  condicoesPagamento: string | null;
  itens: ItemSalvo[];
}

/** Mesma conversão usada pelo repositório Supabase ao gravar data_validade. */
export function dataValidadeParaSalvar(data: Date | null | undefined): string | null {
  return data ? data.toISOString().split('T')[0] : null;
}

/** Mesma conversão usada pelo repositório Supabase ao ler data_validade. */
export function dataValidadeDeSalva(data: string | null): Date | null {
  return data ? new Date(data + 'T00:00:00') : null;
}

export function areaParaSalvar(area: Area): AreaSalva {
  return {
    id: area.id,
    itemOrcamentoId: area.itemOrcamentoId,
    nome: area.nome,
    geometria: area.geometria,
    areaCalculada: area.areaCalculada,
    unidade: area.unidade,
    observacoes: area.observacoes,
  };
}

export function areaDeSalva(salva: AreaSalva): Area {
  return new Area({ ...salva });
}

export function itemParaSalvar(item: ItemOrcamento): ItemSalvo {
  return {
    id: item.id,
    orcamentoId: item.orcamentoId,
    tipo: item.tipo,
    servicoId: item.servicoId,
    produtoId: item.produtoId,
    descricao: item.descricao,
    quantidade: item.quantidade,
    unidade: item.unidade,
    valorUnitario: item.valorUnitario,
    valorTotal: item.valorTotal,
    usaMedicaoArea: item.usaMedicaoArea,
    areas: item.areas.map(areaParaSalvar),
  };
}

export function itemDeSalvo(salvo: ItemSalvo): ItemOrcamento {
  return new ItemOrcamento({ ...salvo, areas: salvo.areas.map(areaDeSalva) });
}

export function orcamentoParaSalvar(orcamento: Orcamento): OrcamentoSalvo {
  return {
    id: orcamento.id,
    usuarioId: orcamento.usuarioId,
    clienteId: orcamento.clienteId,
    numero: orcamento.numero,
    dataCriacao: orcamento.dataCriacao.toISOString(),
    dataValidade: dataValidadeParaSalvar(orcamento.dataValidade),
    status: orcamento.status,
    subtotal: orcamento.subtotal,
    tipoDesconto: orcamento.tipoDesconto,
    valorDesconto: orcamento.valorDesconto,
    total: orcamento.total,
    observacoes: orcamento.observacoes,
    condicoesPagamento: orcamento.condicoesPagamento,
    itens: orcamento.itens.map(itemParaSalvar),
  };
}

export function orcamentoDeSalvo(salvo: OrcamentoSalvo): Orcamento {
  return new Orcamento({
    ...salvo,
    dataCriacao: new Date(salvo.dataCriacao),
    dataValidade: dataValidadeDeSalva(salvo.dataValidade),
    itens: salvo.itens.map(itemDeSalvo),
  });
}
