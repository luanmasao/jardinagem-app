import * as Crypto from 'expo-crypto';
import { AreaRepository, AtualizarAreaDados, CriarAreaDados } from '../../domain/repositories/area.repository.interface';
import { Area } from '../../domain/entities/area';
import { supabaseAreaRepository } from '../repositories/supabase-area.repository';
import { RascunhosLocais, rascunhosLocais } from './rascunhos-locais';
import { AreaSalva, OrcamentoSalvo, areaDeSalva, areaParaSalvar } from './orcamento-local.mapper';

function localizarNoOrcamento(orcamento: OrcamentoSalvo, areaId: string): AreaSalva {
  for (const item of orcamento.itens) {
    const area = item.areas.find((a) => a.id === areaId);
    if (area) return area;
  }
  throw new Error('Área não encontrada no orçamento guardado no aparelho.');
}

/**
 * Repositório de áreas com rascunhos no aparelho.
 * A área vive dentro do item do agregado; a quantidade do item medido é recalculada
 * pela entidade a cada alteração (RN33). Desenhar áreas sem conexão depende de o mapa
 * já estar em cache, mas o cálculo e o armazenamento são locais.
 */
export class AreaRepositoryOffline implements AreaRepository {
  constructor(
    private readonly online: AreaRepository = supabaseAreaRepository,
    private readonly rascunhos: RascunhosLocais = rascunhosLocais
  ) {}

  async listarPorItem(itemOrcamentoId: string): Promise<Area[]> {
    const local = await this.rascunhos.localizarItem(itemOrcamentoId);
    return this.rascunhos.ler(
      local ? local.item.areas.map(areaDeSalva) : undefined,
      !!local?.agregado.pendente,
      () => this.online.listarPorItem(itemOrcamentoId)
    );
  }

  async buscarPorId(id: string): Promise<Area | null> {
    const local = await this.rascunhos.localizarArea(id);
    return this.rascunhos.ler(local ? areaDeSalva(local.area) : undefined, !!local?.agregado.pendente, () =>
      this.online.buscarPorId(id)
    );
  }

  async criar(dados: CriarAreaDados): Promise<Area> {
    const local = await this.rascunhos.localizarItem(dados.itemOrcamentoId);
    if (!local) return this.rascunhos.somenteOnline(() => this.online.criar(dados));

    const id = dados.id ?? Crypto.randomUUID();
    const resultado = await this.rascunhos.aplicar(
      local.agregado.orcamento.id,
      () => this.online.criar({ ...dados, id }),
      (o, doServidor) => {
        const item = o.itens.find((i) => i.id === dados.itemOrcamentoId);
        if (!item) throw new Error('Item não encontrado no orçamento guardado no aparelho.');
        const salva = areaParaSalvar(
          doServidor ??
            new Area({
              id,
              itemOrcamentoId: dados.itemOrcamentoId,
              nome: dados.nome ?? null,
              geometria: dados.geometria,
              areaCalculada: dados.areaCalculada,
              unidade: dados.unidade ?? 'm²',
              observacoes: dados.observacoes ?? null,
            })
        );
        item.areas = [...item.areas.filter((a) => a.id !== id), salva];
      }
    );
    return resultado.online ? resultado.resultado : areaDeSalva(localizarNoOrcamento(resultado.agregado.orcamento, id));
  }

  async atualizar(id: string, dados: AtualizarAreaDados): Promise<Area> {
    const local = await this.rascunhos.localizarArea(id);
    if (!local) return this.rascunhos.somenteOnline(() => this.online.atualizar(id, dados));

    const resultado = await this.rascunhos.aplicar(
      local.agregado.orcamento.id,
      () => this.online.atualizar(id, dados),
      (o, doServidor) => {
        if (doServidor) {
          for (const item of o.itens) {
            item.areas = item.areas.map((a) => (a.id === id ? areaParaSalvar(doServidor) : a));
          }
          return;
        }
        const area = localizarNoOrcamento(o, id);
        if (dados.nome !== undefined) area.nome = dados.nome;
        if (dados.geometria !== undefined) area.geometria = dados.geometria;
        if (dados.areaCalculada !== undefined) area.areaCalculada = dados.areaCalculada;
        if (dados.unidade !== undefined) area.unidade = dados.unidade.trim();
        if (dados.observacoes !== undefined) area.observacoes = dados.observacoes;
      }
    );
    return resultado.online ? resultado.resultado : areaDeSalva(localizarNoOrcamento(resultado.agregado.orcamento, id));
  }

  async excluir(id: string): Promise<void> {
    const local = await this.rascunhos.localizarArea(id);
    if (!local) return this.rascunhos.somenteOnline(() => this.online.excluir(id));

    await this.rascunhos.aplicar(
      local.agregado.orcamento.id,
      () => this.online.excluir(id),
      (o) => {
        for (const item of o.itens) {
          item.areas = item.areas.filter((a) => a.id !== id);
        }
      }
    );
  }

  remover(id: string): Promise<void> {
    return this.excluir(id);
  }
}

export const areaRepositoryOffline = new AreaRepositoryOffline();
