import { StatusOrcamento } from '../enums/status-orcamento';
import { TipoDesconto } from '../enums/tipo-desconto';
import { ItemOrcamento } from './item-orcamento';
import { Area } from './area';
import { RegraNegocioError, TransicaoInvalidaError, ValidacaoEnvioError } from '../errors/dominio-error';
import { arredondarMoeda, calcularValorDesconto, calcularTotalOrcamento } from '../calculations/moeda';

export interface OrcamentoProps {
  id: string;
  usuarioId: string;
  clienteId: string;
  numero: string;
  dataCriacao?: Date;
  dataValidade?: Date | null;
  status?: StatusOrcamento;
  subtotal?: number;
  tipoDesconto?: TipoDesconto | null;
  valorDesconto?: number;
  total?: number;
  observacoes?: string | null;
  condicoesPagamento?: string | null;
  itens?: ItemOrcamento[];
}

export class Orcamento {
  public readonly id: string;
  public readonly usuarioId: string;
  public readonly clienteId: string;
  public readonly numero: string;
  public readonly dataCriacao: Date;
  public dataValidade: Date | null;
  public status: StatusOrcamento;
  public subtotal: number;
  public tipoDesconto: TipoDesconto | null;
  public valorDesconto: number;
  public total: number;
  public observacoes: string | null;
  public condicoesPagamento: string | null;
  private _itens: ItemOrcamento[];

  constructor(props: OrcamentoProps) {
    if (!props.id || props.id.trim() === '') {
      throw new RegraNegocioError('O ID do orçamento é obrigatório.');
    }
    if (!props.usuarioId || props.usuarioId.trim() === '') {
      throw new RegraNegocioError('O ID do usuário proprietário é obrigatório.');
    }
    if (!props.clienteId || props.clienteId.trim() === '') {
      throw new RegraNegocioError('O ID do cliente do orçamento é obrigatório.');
    }
    if (!props.numero || props.numero.trim() === '') {
      throw new RegraNegocioError('O número do orçamento é obrigatório.');
    }

    this.id = props.id;
    this.usuarioId = props.usuarioId;
    this.clienteId = props.clienteId;
    this.numero = props.numero.trim();
    this.dataCriacao = props.dataCriacao ?? new Date();
    this.status = props.status ?? StatusOrcamento.RASCUNHO;
    this.observacoes = props.observacoes ? props.observacoes.trim() : null;
    this.condicoesPagamento = props.condicoesPagamento ? props.condicoesPagamento.trim() : null;
    this._itens = props.itens ? [...props.itens] : [];

    // Validar data de validade se informada
    if (props.dataValidade) {
      this.validarDataValidadeCoerente(props.dataValidade, this.dataCriacao);
      this.dataValidade = props.dataValidade;
    } else {
      this.dataValidade = null;
    }

    // Inicialização de desconto
    this.tipoDesconto = props.tipoDesconto ?? null;
    this.valorDesconto = props.valorDesconto !== undefined ? arredondarMoeda(props.valorDesconto) : 0;
    if (this.tipoDesconto === null) {
      this.valorDesconto = 0;
    }

    // Calcular valores subtotal e total
    this.subtotal = 0;
    this.total = 0;
    this.recalcularValores();
  }

  public get itens(): readonly ItemOrcamento[] {
    return this._itens;
  }

  /**
   * RN64 / RN65: Verifica se o orçamento é diretamente editável.
   */
  public get editavel(): boolean {
    return this.status === StatusOrcamento.RASCUNHO;
  }

  private assegurarEditavel(): void {
    if (!this.editavel) {
      throw new RegraNegocioError(
        `Orçamentos no status '${this.status}' não podem ser editados diretamente. Somente orçamentos em RASCUNHO são editáveis.`
      );
    }
  }

  private validarDataValidadeCoerente(dataValidade: Date, dataCriacao: Date): void {
    // Comparação por data civil (ano, mês, dia)
    const criacaoCivil = new Date(dataCriacao.getFullYear(), dataCriacao.getMonth(), dataCriacao.getDate());
    const validadeCivil = new Date(dataValidade.getFullYear(), dataValidade.getMonth(), dataValidade.getDate());

    if (validadeCivil < criacaoCivil) {
      throw new RegraNegocioError('A data de validade não pode ser anterior à data de criação do orçamento.');
    }
  }

  /**
   * Recalcula subtotal, desconto aplicado e total do orçamento.
   * RN48, RN49, RN54, RN56.
   */
  public recalcularValores(): void {
    const somaItens = this._itens.reduce((acc, item) => acc + item.valorTotal, 0);
    this.subtotal = arredondarMoeda(somaItens);

    // Caso de borda obrigatório (RN53):
    // Se durante edição de rascunho os itens forem removidos e o subtotal voltar para 0.00,
    // não pode permanecer persistido um desconto FIXO positivo. O desconto é resetado para neutro.
    if (this.subtotal === 0 && this.tipoDesconto === TipoDesconto.FIXO && this.valorDesconto > 0) {
      this.tipoDesconto = null;
      this.valorDesconto = 0;
    } else if (this.tipoDesconto === TipoDesconto.FIXO && this.valorDesconto > this.subtotal) {
      this.valorDesconto = this.subtotal;
    }

    const descontoDeduzido = calcularValorDesconto(this.subtotal, this.tipoDesconto, this.valorDesconto);
    this.total = calcularTotalOrcamento(this.subtotal, descontoDeduzido);
  }

  /**
   * RN25: Adiciona um item ao orçamento.
   */
  public adicionarItem(item: ItemOrcamento): void {
    this.assegurarEditavel();
    if (item.orcamentoId !== this.id) {
      throw new RegraNegocioError('O item não pertence a este orçamento.');
    }
    this._itens.push(item);
    this.recalcularValores();
  }

  /**
   * RN35: Remove um item do orçamento.
   */
  public removerItem(itemId: string): void {
    this.assegurarEditavel();
    const index = this._itens.findIndex((i) => i.id === itemId);
    if (index === -1) {
      throw new RegraNegocioError(`Item com ID '${itemId}' não foi encontrado neste orçamento.`);
    }
    this._itens.splice(index, 1);
    this.recalcularValores();
  }

  /**
   * RN49, RN50, RN51, RN52, RN53: Aplica ou remove desconto do orçamento.
   */
  public aplicarDesconto(tipo: TipoDesconto | null, valor: number): void {
    this.assegurarEditavel();
    if (tipo === null || valor === 0) {
      this.tipoDesconto = null;
      this.valorDesconto = 0;
    } else {
      if (tipo === TipoDesconto.PERCENTUAL) {
        if (valor < 0 || valor > 100) {
          throw new RegraNegocioError('Desconto percentual deve estar entre 0% e 100%.');
        }
      } else if (tipo === TipoDesconto.FIXO) {
        if (valor < 0 || valor > this.subtotal) {
          throw new RegraNegocioError('Desconto de valor fixo deve estar entre zero e o subtotal.');
        }
      }
      this.tipoDesconto = tipo;
      this.valorDesconto = arredondarMoeda(valor);
    }
    this.recalcularValores();
  }

  public removerDesconto(): void {
    this.aplicarDesconto(null, 0);
  }

  /**
   * RN26: Define a data de validade.
   */
  public definirValidade(dataValidade: Date | null): void {
    this.assegurarEditavel();
    if (dataValidade) {
      this.validarDataValidadeCoerente(dataValidade, this.dataCriacao);
    }
    this.dataValidade = dataValidade;
  }

  public definirObservacoes(observacoes: string | null): void {
    this.assegurarEditavel();
    this.observacoes = observacoes ? observacoes.trim() : null;
  }

  public definirCondicoesPagamento(condicoesPagamento: string | null): void {
    this.assegurarEditavel();
    this.condicoesPagamento = condicoesPagamento ? condicoesPagamento.trim() : null;
  }

  /**
   * RN58, RN59, RN60: Valida se o orçamento atende a todas as condições para ser enviado.
   */
  public obterErrosValidacaoEnvio(): string[] {
    const erros: string[] = [];

    if (!this.clienteId || this.clienteId.trim() === '') {
      erros.push('Orçamento deve possuir um cliente associado.');
    }

    if (this._itens.length === 0) {
      erros.push('Orçamento deve conter pelo menos um item.');
    }

    if (!this.dataValidade) {
      erros.push('Orçamento deve possuir data de validade definida.');
    } else {
      try {
        this.validarDataValidadeCoerente(this.dataValidade, this.dataCriacao);
      } catch (err) {
        if (err instanceof Error) {
          erros.push(err.message);
        }
      }
    }

    if (this.total < 0) {
      erros.push('O valor total do orçamento não pode ser negativo.');
    }

    // RN46, RN59: Todas as medições necessárias devem estar concluídas
    for (const item of this._itens) {
      if (item.usaMedicaoArea) {
        if (item.areas.length === 0) {
          erros.push(`O item de serviço medido '${item.descricao}' não possui áreas delimitadas.`);
        } else if (item.quantidade <= 0) {
          erros.push(`O item de serviço medido '${item.descricao}' possui área calculada total igual a zero.`);
        }
      }
    }

    return erros;
  }

  public validarParaEnvio(): boolean {
    return this.obterErrosValidacaoEnvio().length === 0;
  }

  // ==========================================
  // TRANSIÇÕES DE ESTADO (RN61, RN62, RN63, estados.puml)
  // ==========================================

  /**
   * RASCUNHO -> ENVIADO
   * Exige validação completa (RN58, RN59).
   */
  public enviar(): void {
    if (this.status !== StatusOrcamento.RASCUNHO) {
      throw new TransicaoInvalidaError(this.status, StatusOrcamento.ENVIADO);
    }
    const erros = this.obterErrosValidacaoEnvio();
    if (erros.length > 0) {
      throw new ValidacaoEnvioError(erros);
    }
    this.status = StatusOrcamento.ENVIADO;
  }

  /**
   * ENVIADO -> EM_ANALISE
   */
  public iniciarAnalise(): void {
    if (this.status !== StatusOrcamento.ENVIADO) {
      throw new TransicaoInvalidaError(this.status, StatusOrcamento.EM_ANALISE);
    }
    this.status = StatusOrcamento.EM_ANALISE;
  }

  /**
   * EM_ANALISE -> APROVADO (RN66)
   */
  public aprovar(): void {
    if (this.status !== StatusOrcamento.EM_ANALISE) {
      throw new TransicaoInvalidaError(this.status, StatusOrcamento.APROVADO);
    }
    this.status = StatusOrcamento.APROVADO;
  }

  /**
   * EM_ANALISE -> RECUSADO
   */
  public recusar(): void {
    if (this.status !== StatusOrcamento.EM_ANALISE) {
      throw new TransicaoInvalidaError(this.status, StatusOrcamento.RECUSADO);
    }
    this.status = StatusOrcamento.RECUSADO;
  }

  /**
   * APROVADO -> CONCLUIDO (RN68)
   */
  public concluir(): void {
    if (this.status !== StatusOrcamento.APROVADO) {
      throw new TransicaoInvalidaError(this.status, StatusOrcamento.CONCLUIDO);
    }
    this.status = StatusOrcamento.CONCLUIDO;
  }

  /**
   * RASCUNHO -> CANCELADO
   * ENVIADO -> CANCELADO
   * EM_ANALISE -> CANCELADO
   */
  public cancelar(): void {
    const permitidos = [StatusOrcamento.RASCUNHO, StatusOrcamento.ENVIADO, StatusOrcamento.EM_ANALISE];
    if (!permitidos.includes(this.status)) {
      throw new TransicaoInvalidaError(this.status, StatusOrcamento.CANCELADO);
    }
    this.status = StatusOrcamento.CANCELADO;
  }

  /**
   * ENVIADO -> EXPIRADO
   * EM_ANALISE -> EXPIRADO
   * RN69: Validade ultrapassada. RASCUNHO não expira (RN70).
   */
  public verificarExpiracao(dataReferencia: Date): void {
    if (this.status !== StatusOrcamento.ENVIADO && this.status !== StatusOrcamento.EM_ANALISE) {
      return;
    }
    if (!this.dataValidade) {
      return;
    }

    const refCivil = new Date(dataReferencia.getFullYear(), dataReferencia.getMonth(), dataReferencia.getDate());
    const valCivil = new Date(this.dataValidade.getFullYear(), this.dataValidade.getMonth(), this.dataValidade.getDate());

    if (refCivil > valCivil) {
      this.status = StatusOrcamento.EXPIRADO;
    }
  }

  /**
   * RN72, RN73, RN74, RN75, RN77: Duplicação do orçamento.
   * Cria um novo orçamento independente com status RASCUNHO.
   */
  public duplicar(
    novoId: string,
    novoNumero: string,
    geradorIdItem: (itemAntigoId: string) => string,
    geradorIdArea: (areaAntigaId: string) => string,
    dataCriacao?: Date
  ): Orcamento {
    const itensDuplicados = this._itens.map((item) => {
      const novoItemId = geradorIdItem(item.id);
      const areasDuplicadas = item.areas.map(
        (area) =>
          new Area({
            id: geradorIdArea(area.id),
            itemOrcamentoId: novoItemId,
            nome: area.nome,
            geometria: {
              tipo: 'Polygon',
              coordenadas: area.geometria.coordenadas.map((c) => ({ ...c })),
            },
            areaCalculada: area.areaCalculada,
            unidade: area.unidade,
            observacoes: area.observacoes,
          })
      );

      return new ItemOrcamento({
        id: novoItemId,
        orcamentoId: novoId,
        tipo: item.tipo,
        servicoId: item.servicoId,
        produtoId: item.produtoId,
        descricao: item.descricao,
        quantidade: item.quantidade,
        unidade: item.unidade,
        valorUnitario: item.valorUnitario,
        valorTotal: item.valorTotal,
        usaMedicaoArea: item.usaMedicaoArea,
        areas: areasDuplicadas,
      });
    });

    return new Orcamento({
      id: novoId,
      usuarioId: this.usuarioId,
      clienteId: this.clienteId,
      numero: novoNumero,
      dataCriacao: dataCriacao ?? new Date(),
      dataValidade: null, // Validade inicia nula na nova proposta
      status: StatusOrcamento.RASCUNHO,
      tipoDesconto: this.tipoDesconto,
      valorDesconto: this.valorDesconto,
      observacoes: this.observacoes,
      condicoesPagamento: this.condicoesPagamento,
      itens: itensDuplicados,
    });
  }
}
