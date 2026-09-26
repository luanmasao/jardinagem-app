import { TipoItem } from '../enums/tipo-item';
import { Area } from './area';
import { Servico } from './servico';
import { Produto } from './produto';
import { RegraNegocioError } from '../errors/dominio-error';
import { arredondarMoeda } from '../calculations/moeda';

export interface ItemOrcamentoProps {
  id: string;
  orcamentoId: string;
  tipo: TipoItem;
  servicoId?: string | null;
  produtoId?: string | null;
  descricao: string;
  quantidade: number;
  unidade: string;
  valorUnitario: number;
  valorTotal?: number;
  usaMedicaoArea: boolean;
  areas?: Area[];
}

/**
 * Entidade que representa um item de orçamento com snapshot histórico.
 *
 * Divisão Arquitetural de Responsabilidades referente à RN28:
 * 1. Domínio (ItemOrcamento):
 *    - Garante a integridade estrutural e tipagem do item (RN27: SERVICO XOR PRODUTO);
 *    - Obriga a presença de servicoId (para SERVICO) ou produtoId (para PRODUTO);
 *    - Fornece fábricas (criarDeServico / criarDeProduto) para captura inicial do snapshot;
 *    - Garante independência do catálogo após a criação (RN29, RN30, RN35).
 * 2. Aplicação (Use Cases futuros - ex.: AdicionarItemOrcamentoUseCase):
 *    - Valida o pertencimento ao usuário: verifica se o servicoId/produtoId pertence ao mesmo usuarioId do orçamento;
 *    - Valida se o serviço/produto do catálogo está ativo antes da inclusão;
 *    - Orquestra a busca no catálogo e a delegação para as fábricas de domínio.
 * 3. Banco de Dados / RLS (PostgreSQL/Supabase):
 *    - Garante existência persistida e integridade referencial (FKs em ITEM_ORCAMENTO);
 *    - Garante isolamento multi-tenant por RLS (auth.uid() = usuario_id).
 */
export class ItemOrcamento {
  public readonly id: string;
  public readonly orcamentoId: string;
  public readonly tipo: TipoItem;
  public readonly servicoId: string | null;
  public readonly produtoId: string | null;
  public descricao: string;
  public quantidade: number;
  public unidade: string;
  public valorUnitario: number;
  public valorTotal: number;
  public readonly usaMedicaoArea: boolean;
  private _areas: Area[];

  constructor(props: ItemOrcamentoProps) {
    if (!props.id || props.id.trim() === '') {
      throw new RegraNegocioError('O ID do item de orçamento é obrigatório.');
    }
    if (!props.orcamentoId || props.orcamentoId.trim() === '') {
      throw new RegraNegocioError('O ID do orçamento proprietário é obrigatório.');
    }
    if (!props.descricao || props.descricao.trim() === '') {
      throw new RegraNegocioError('A descrição do item de orçamento é obrigatória.');
    }
    if (typeof props.valorUnitario !== 'number' || props.valorUnitario < 0) {
      throw new RegraNegocioError('O valor unitário do item não pode ser negativo.');
    }

    // Regra RN27 / Modelo Físico v1.1: SERVICO XOR PRODUTO
    if (props.tipo === TipoItem.SERVICO) {
      if (!props.servicoId || props.servicoId.trim() === '') {
        throw new RegraNegocioError('Item do tipo SERVICO deve possuir servicoId preenchido.');
      }
      if (props.produtoId) {
        throw new RegraNegocioError('Item do tipo SERVICO não pode possuir produtoId.');
      }
    } else if (props.tipo === TipoItem.PRODUTO) {
      if (!props.produtoId || props.produtoId.trim() === '') {
        throw new RegraNegocioError('Item do tipo PRODUTO deve possuir produtoId preenchido.');
      }
      if (props.servicoId) {
        throw new RegraNegocioError('Item do tipo PRODUTO não pode possuir servicoId.');
      }
      if (props.usaMedicaoArea) {
        throw new RegraNegocioError('Item do tipo PRODUTO não pode ter medição de área habilitada.');
      }
    } else {
      throw new RegraNegocioError(`Tipo de item inválido: '${props.tipo}'.`);
    }

    this.id = props.id;
    this.orcamentoId = props.orcamentoId;
    this.tipo = props.tipo;
    this.servicoId = props.servicoId ? props.servicoId.trim() : null;
    this.produtoId = props.produtoId ? props.produtoId.trim() : null;
    this.descricao = props.descricao.trim();
    this.usaMedicaoArea = props.usaMedicaoArea;
    this.unidade = props.usaMedicaoArea ? 'm²' : props.unidade.trim();
    this.valorUnitario = arredondarMoeda(props.valorUnitario);
    this._areas = props.areas ? [...props.areas] : [];

    // RN45: Produto ou serviço sem medição não pode ter áreas associadas
    if (!this.usaMedicaoArea && this._areas.length > 0) {
      throw new RegraNegocioError('Itens sem medição de área não podem possuir áreas associadas.');
    }

    // RN33 / RN34: Quantidade derivada para item medido vs quantidade manual
    if (this.usaMedicaoArea) {
      this.quantidade = this.calcularSomaAreas();
    } else {
      if (typeof props.quantidade !== 'number' || props.quantidade < 0) {
        throw new RegraNegocioError('A quantidade do item não medido deve ser um valor numérico não negativo.');
      }
      this.quantidade = arredondarMoeda(props.quantidade);
    }

    // RN47: valor_total = quantidade * valor_unitario
    this.valorTotal = arredondarMoeda(this.quantidade * this.valorUnitario);
  }

  public get areas(): ReadonlyArray<Area> {
    return this._areas;
  }

  /**
   * Fábrica para criação de snapshot a partir de um Serviço.
   */
  public static criarDeServico(
    id: string,
    orcamentoId: string,
    servico: Servico,
    quantidadeManual = 0
  ): ItemOrcamento {
    return new ItemOrcamento({
      id,
      orcamentoId,
      tipo: TipoItem.SERVICO,
      servicoId: servico.id,
      produtoId: null,
      descricao: servico.nome,
      unidade: servico.unidade,
      valorUnitario: servico.precoBase,
      quantidade: servico.usaMedicaoArea ? 0 : quantidadeManual,
      usaMedicaoArea: servico.usaMedicaoArea,
      areas: [],
    });
  }

  /**
   * Fábrica para criação de snapshot a partir de um Produto.
   */
  public static criarDeProduto(
    id: string,
    orcamentoId: string,
    produto: Produto,
    quantidade: number
  ): ItemOrcamento {
    return new ItemOrcamento({
      id,
      orcamentoId,
      tipo: TipoItem.PRODUTO,
      servicoId: null,
      produtoId: produto.id,
      descricao: produto.nome,
      unidade: produto.unidade,
      valorUnitario: produto.precoBase,
      quantidade,
      usaMedicaoArea: false,
      areas: [],
    });
  }

  /**
   * RN32 / RN34: Atualiza a quantidade do item (apenas para itens não medidos).
   */
  public definirQuantidadeManual(novaQuantidade: number): void {
    if (this.usaMedicaoArea) {
      throw new RegraNegocioError(
        'A quantidade de itens com medição de área é derivada das áreas e não pode ser alterada manualmente.'
      );
    }
    if (typeof novaQuantidade !== 'number' || novaQuantidade < 0) {
      throw new RegraNegocioError('A quantidade do item não pode ser negativa.');
    }
    this.quantidade = arredondarMoeda(novaQuantidade);
    this.recalcularValorTotal();
  }

  /**
   * RN31: Permite personalizar descrição e valor unitário do snapshot sem alterar catálogo.
   */
  public personalizarItem(dados: { descricao?: string; valorUnitario?: number }): void {
    if (dados.descricao !== undefined) {
      if (!dados.descricao || dados.descricao.trim() === '') {
        throw new RegraNegocioError('A descrição do item não pode ser vazia.');
      }
      this.descricao = dados.descricao.trim();
    }
    if (dados.valorUnitario !== undefined) {
      if (typeof dados.valorUnitario !== 'number' || dados.valorUnitario < 0) {
        throw new RegraNegocioError('O valor unitário do item não pode ser negativo.');
      }
      this.valorUnitario = arredondarMoeda(dados.valorUnitario);
      this.recalcularValorTotal();
    }
  }

  /**
   * RN38, RN45: Adiciona uma nova área a um item medido.
   */
  public adicionarArea(area: Area): void {
    if (!this.usaMedicaoArea) {
      throw new RegraNegocioError('Não é permitido adicionar áreas a um item que não utiliza medição de área.');
    }
    if (area.itemOrcamentoId !== this.id) {
      throw new RegraNegocioError('A área informada não pertence a este item de orçamento.');
    }
    this._areas.push(area);
    this.recalcularQuantidadePelasAreas();
  }

  /**
   * RN44: Remove uma área do item medido.
   */
  public removerArea(areaId: string): void {
    if (!this.usaMedicaoArea) {
      throw new RegraNegocioError('Item não possui áreas associadas.');
    }
    const index = this._areas.findIndex((a) => a.id === areaId);
    if (index === -1) {
      throw new RegraNegocioError(`Área com ID '${areaId}' não foi encontrada neste item.`);
    }
    this._areas.splice(index, 1);
    this.recalcularQuantidadePelasAreas();
  }

  /**
   * RN43: Atualiza uma área existente e recalcula a quantidade e valor do item.
   */
  public atualizarArea(areaAtualizada: Area): void {
    if (!this.usaMedicaoArea) {
      throw new RegraNegocioError('Item não possui áreas associadas.');
    }
    const index = this._areas.findIndex((a) => a.id === areaAtualizada.id);
    if (index === -1) {
      throw new RegraNegocioError(`Área com ID '${areaAtualizada.id}' não encontrada para atualização.`);
    }
    this._areas[index] = areaAtualizada;
    this.recalcularQuantidadePelasAreas();
  }

  /**
   * RN33, RN43: Recalcula a quantidade do item a partir da soma das áreas associadas.
   */
  public recalcularQuantidadePelasAreas(): void {
    if (this.usaMedicaoArea) {
      this.quantidade = this.calcularSomaAreas();
      this.recalcularValorTotal();
    }
  }

  private calcularSomaAreas(): number {
    const soma = this._areas.reduce((acc, area) => acc + area.areaCalculada, 0);
    return arredondarMoeda(soma);
  }

  private recalcularValorTotal(): void {
    this.valorTotal = arredondarMoeda(this.quantidade * this.valorUnitario);
  }
}
