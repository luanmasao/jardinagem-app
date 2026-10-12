import { Orcamento } from '../../domain/entities/orcamento';
import { Cliente } from '../../domain/entities/cliente';
import { Endereco } from '../../domain/entities/endereco';
import { Usuario } from '../../domain/entities/usuario';
import { StatusOrcamento } from '../../domain/enums/status-orcamento';
import { TipoDesconto } from '../../domain/enums/tipo-desconto';
import { TipoItem } from '../../domain/enums/tipo-item';
import {
  OrcamentoPdfModel,
  ItemOrcamentoPdfModel,
  AreaItemPdfModel,
  PrestadorPdfModel,
  ClientePdfModel,
} from '../interfaces/pdf-generator.interface';

/**
 * Formata um valor numérico para o padrão monetário brasileiro (pt-BR).
 * Ex: 1250 -> "R$ 1.250,00", 5422.5 -> "R$ 5.422,50".
 * Pure string formatting - sem recalcular ponto flutuante.
 */
export function formatarMoeda(valor: number): string {
  const fixo = (Math.round((valor + Number.EPSILON) * 100) / 100).toFixed(2);
  const [inteiro, decimais] = fixo.split('.');
  const inteiroComPontos = inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `R$ ${inteiroComPontos},${decimais}`;
}

/**
 * Formata um número com casas decimais e separadores no padrão pt-BR.
 * Ex: 120.5 -> "120,50", 1000 -> "1.000,00".
 */
export function formatarNumero(valor: number, casas: number = 2): string {
  const fixo = valor.toFixed(casas);
  const [inteiro, decimais] = fixo.split('.');
  const inteiroComPontos = inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return decimais !== undefined ? `${inteiroComPontos},${decimais}` : inteiroComPontos;
}

/**
 * Formata data para o padrão civil brasileiro (DD/MM/AAAA).
 */
export function formatarData(data: Date): string {
  const dia = String(data.getDate()).padStart(2, '0');
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const ano = data.getFullYear();
  return `${dia}/${mes}/${ano}`;
}

/**
 * Mapeia o badge legível do status do orçamento.
 */
export function formatarStatusBadge(status: StatusOrcamento): string {
  switch (status) {
    case StatusOrcamento.RASCUNHO:
      return 'Rascunho';
    case StatusOrcamento.ENVIADO:
      return 'Enviado';
    case StatusOrcamento.EM_ANALISE:
      return 'Em análise';
    case StatusOrcamento.APROVADO:
      return 'Aprovado';
    case StatusOrcamento.CONCLUIDO:
      return 'Concluído';
    case StatusOrcamento.RECUSADO:
      return 'Recusado';
    case StatusOrcamento.EXPIRADO:
      return 'Expirado';
    case StatusOrcamento.CANCELADO:
      return 'Cancelado';
    default:
      return String(status);
  }
}

/**
 * Formata o endereço de intervenção do cliente de forma defensiva.
 * Caso ausente ou vazio, retorna expressamente "Endereço: Não informado".
 */
export function formatarEndereco(endereco: Endereco | null | undefined): string {
  if (!endereco) {
    return 'Endereço: Não informado';
  }

  const partes: string[] = [];

  if (endereco.logradouro && endereco.logradouro.trim() !== '') {
    let log = endereco.logradouro.trim();
    if (endereco.numero && endereco.numero.trim() !== '') {
      log += `, ${endereco.numero.trim()}`;
    }
    partes.push(log);
  } else if (endereco.numero && endereco.numero.trim() !== '') {
    partes.push(`Nº ${endereco.numero.trim()}`);
  }

  if (endereco.complemento && endereco.complemento.trim() !== '') {
    partes.push(endereco.complemento.trim());
  }

  if (endereco.bairro && endereco.bairro.trim() !== '') {
    partes.push(endereco.bairro.trim());
  }

  if (endereco.cidade && endereco.cidade.trim() !== '') {
    const estadoStr = endereco.estado && endereco.estado.trim() !== '' ? ` - ${endereco.estado.trim()}` : '';
    partes.push(`${endereco.cidade.trim()}${estadoStr}`);
  } else if (endereco.estado && endereco.estado.trim() !== '') {
    partes.push(endereco.estado.trim());
  }

  if (endereco.cep && endereco.cep.trim() !== '') {
    partes.push(`CEP: ${endereco.cep.trim()}`);
  }

  if (partes.length === 0) {
    return 'Endereço: Não informado';
  }

  return partes.join(', ');
}

/**
 * Mapper oficial de Orçamento para o modelo de apresentação em PDF.
 *
 * Responsabilidade:
 * - Transformar entidades em OrcamentoPdfModel;
 * - Transportar valores financeiros já validados pelo domínio;
 * - Formatar datas, moedas e números;
 * - Aplicar tratamento defensivo de campos opcionais.
 *
 * NÃO implementa fórmulas financeiras nem recalcula subtotais, descontos ou totais.
 */
export class OrcamentoPdfMapper {
  public static paraModelo(
    orcamento: Orcamento,
    cliente: Cliente,
    prestador: Usuario | null
  ): OrcamentoPdfModel {
    // 1. Prestador
    const prestadorModel: PrestadorPdfModel = {
      nome: prestador?.nome?.trim() || 'Prestador',
      telefoneFormatado:
        prestador?.telefone && prestador.telefone.trim() !== ''
          ? prestador.telefone.trim()
          : null,
    };

    // 2. Cliente
    const clienteModel: ClientePdfModel = {
      nome: cliente.nome.trim(),
      telefoneFormatado:
        cliente.telefone && cliente.telefone.trim() !== ''
          ? cliente.telefone.trim()
          : null,
      email:
        cliente.email && cliente.email.trim() !== ''
          ? cliente.email.trim()
          : null,
      documentoFormatado:
        cliente.documento && cliente.documento.trim() !== ''
          ? cliente.documento.trim()
          : null,
      enderecoFormatado: formatarEndereco(cliente.endereco),
    };

    // 3. Itens e Áreas
    const itensModel: ItemOrcamentoPdfModel[] = orcamento.itens.map((item, idx) => {
      const areasModel: AreaItemPdfModel[] = item.areas.map((area) => ({
        id: area.id,
        nome: area.nome && area.nome.trim() !== '' ? area.nome.trim() : 'Área sem identificação',
        areaCalculadaFormatada: `${formatarNumero(area.areaCalculada, 2)} ${area.unidade || 'm²'}`,
      }));

      return {
        numeroItem: idx + 1,
        tipoDescricao: item.tipo === TipoItem.SERVICO ? 'Serviço' : 'Produto',
        descricao: item.descricao,
        quantidadeFormatada: formatarNumero(item.quantidade, 2),
        unidade: item.unidade,
        valorUnitarioFormatado: formatarMoeda(item.valorUnitario),
        valorTotalFormatado: formatarMoeda(item.valorTotal),
        usaMedicaoArea: item.usaMedicaoArea,
        areas: areasModel,
      };
    });

    // 4. Tratamento de Desconto
    const temDesconto = Boolean(
      orcamento.tipoDesconto !== null &&
      orcamento.valorDesconto > 0 &&
      orcamento.subtotal > orcamento.total
    );

    let descricaoDesconto: string | null = null;
    let valorDescontoFormatado: string | null = null;

    if (temDesconto) {
      if (orcamento.tipoDesconto === TipoDesconto.PERCENTUAL) {
        descricaoDesconto = `Desconto (${orcamento.valorDesconto}%):`;
      } else {
        descricaoDesconto = 'Desconto Fixo:';
      }
      const valorDeduzido = Math.max(0, orcamento.subtotal - orcamento.total);
      valorDescontoFormatado = `- ${formatarMoeda(valorDeduzido)}`;
    }

    // 5. Validade e Datas
    const dataCriacaoFormatada = formatarData(orcamento.dataCriacao);
    const dataValidadeFormatada = orcamento.dataValidade
      ? formatarData(orcamento.dataValidade)
      : 'Validade: A combinar';

    // 6. Observações e Condições de Pagamento
    const observacoes =
      orcamento.observacoes && orcamento.observacoes.trim() !== ''
        ? orcamento.observacoes.trim()
        : null;

    const condicoesPagamento =
      orcamento.condicoesPagamento && orcamento.condicoesPagamento.trim() !== ''
        ? orcamento.condicoesPagamento.trim()
        : 'A combinar com o prestador';

    return {
      id: orcamento.id,
      numero: orcamento.numero,
      dataCriacaoFormatada,
      dataValidadeFormatada,
      statusBadge: formatarStatusBadge(orcamento.status),
      prestador: prestadorModel,
      cliente: clienteModel,
      itens: itensModel,
      subtotalFormatado: formatarMoeda(orcamento.subtotal),
      temDesconto,
      descricaoDesconto,
      valorDescontoFormatado,
      totalFormatado: formatarMoeda(orcamento.total),
      observacoes,
      condicoesPagamento,
    };
  }
}
