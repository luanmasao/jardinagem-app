import * as Crypto from 'expo-crypto';
import {
  AtualizarItemOrcamentoDados,
  CriarItemOrcamentoDados,
  ItemOrcamentoRepository,
} from '../../domain/repositories/item-orcamento.repository.interface';
import { ItemOrcamento } from '../../domain/entities/item-orcamento';
import { supabaseItemOrcamentoRepository } from '../repositories/supabase-item-orcamento.repository';
import { RascunhosLocais, rascunhosLocais } from './rascunhos-locais';
import { ItemSalvo, OrcamentoSalvo, itemDeSalvo, itemParaSalvar } from './orcamento-local.mapper';

function itemDoOrcamento(orcamento: OrcamentoSalvo, itemId: string): ItemSalvo {
  const item = orcamento.itens.find((i) => i.id === itemId);
  if (!item) throw new Error('Item não encontrado no orçamento guardado no aparelho.');
  return item;
}

/**
 * Repositório de itens de orçamento com rascunhos no aparelho (RNF37, RF84).
 * O item vive dentro do agregado do orçamento; sem conexão, as alterações vão para o rascunho local.
 */
export class ItemOrcamentoRepositoryOffline implements ItemOrcamentoRepository {
  constructor(
    private readonly online: ItemOrcamentoRepository = supabaseItemOrcamentoRepository,
    private readonly rascunhos: RascunhosLocais = rascunhosLocais
  ) {}

  async listarPorOrcamento(orcamentoId: string): Promise<ItemOrcamento[]> {
    const agregado = await this.rascunhos.obter(orcamentoId);
    return this.rascunhos.ler(
      agregado ? agregado.orcamento.itens.map(itemDeSalvo) : undefined,
      !!agregado?.pendente,
      () => this.online.listarPorOrcamento(orcamentoId)
    );
  }

  async buscarPorId(id: string): Promise<ItemOrcamento | null> {
    const local = await this.rascunhos.localizarItem(id);
    return this.rascunhos.ler(local ? itemDeSalvo(local.item) : undefined, !!local?.agregado.pendente, () =>
      this.online.buscarPorId(id)
    );
  }

  async criar(dados: CriarItemOrcamentoDados): Promise<ItemOrcamento> {
    const id = dados.id ?? Crypto.randomUUID();
    const resultado = await this.rascunhos.aplicar(
      dados.orcamentoId,
      () => this.online.criar({ ...dados, id }),
      (o, doServidor) => {
        const salvo = itemParaSalvar(doServidor ?? new ItemOrcamento({ ...dados, id, areas: [] }));
        o.itens = [...o.itens.filter((i) => i.id !== id), salvo];
      }
    );
    return resultado.online ? resultado.resultado : itemDeSalvo(itemDoOrcamento(resultado.agregado.orcamento, id));
  }

  async atualizar(id: string, dados: AtualizarItemOrcamentoDados): Promise<ItemOrcamento> {
    const local = await this.rascunhos.localizarItem(id);
    if (!local) return this.rascunhos.somenteOnline(() => this.online.atualizar(id, dados));

    const resultado = await this.rascunhos.aplicar(
      local.agregado.orcamento.id,
      () => this.online.atualizar(id, dados),
      (o, doServidor) => {
        if (doServidor) {
          o.itens = o.itens.map((i) => (i.id === id ? itemParaSalvar(doServidor) : i));
          return;
        }
        const item = itemDoOrcamento(o, id);
        if (dados.descricao !== undefined) item.descricao = dados.descricao.trim();
        if (dados.quantidade !== undefined) item.quantidade = dados.quantidade;
        if (dados.valorUnitario !== undefined) item.valorUnitario = dados.valorUnitario;
        if (dados.valorTotal !== undefined) item.valorTotal = dados.valorTotal;
      }
    );
    return resultado.online ? resultado.resultado : itemDeSalvo(itemDoOrcamento(resultado.agregado.orcamento, id));
  }

  async excluir(id: string): Promise<void> {
    const local = await this.rascunhos.localizarItem(id);
    if (!local) return this.rascunhos.somenteOnline(() => this.online.excluir(id));

    await this.rascunhos.aplicar(
      local.agregado.orcamento.id,
      () => this.online.excluir(id),
      (o) => {
        o.itens = o.itens.filter((i) => i.id !== id);
      }
    );
  }
}

export const itemOrcamentoRepositoryOffline = new ItemOrcamentoRepositoryOffline();
