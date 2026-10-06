export interface AreaItemPdfModel {
  id: string;
  nome: string;
  areaCalculadaFormatada: string; // Ex: "120,50 m²"
}

export interface ItemOrcamentoPdfModel {
  numeroItem: number;
  tipoDescricao: 'Serviço' | 'Produto';
  descricao: string;
  quantidadeFormatada: string;   // Ex: "120,50" ou "2,00"
  unidade: string;               // Ex: "m²", "un", "h"
  valorUnitarioFormatado: string;// Ex: "R$ 45,00"
  valorTotalFormatado: string;   // Ex: "R$ 5.422,50"
  usaMedicaoArea: boolean;
  areas: AreaItemPdfModel[];
}

export interface PrestadorPdfModel {
  nome: string;
  telefoneFormatado: string | null;
}

export interface ClientePdfModel {
  nome: string;
  telefoneFormatado: string | null;
  email: string | null;
  documentoFormatado: string | null; // CPF/CNPJ quando informado
  enderecoFormatado: string;         // Logradouro completo ou "Endereço: Não informado"
}

export interface OrcamentoPdfModel {
  id: string;
  numero: string;                   // Ex: "ORC-2026-001"
  dataCriacaoFormatada: string;     // Ex: "03/10/2026"
  dataValidadeFormatada: string;    // Ex: "18/10/2026" ou "Validade: A combinar"
  statusBadge: string;              // Ex: "Rascunho", "Aprovado", "Enviado"
  prestador: PrestadorPdfModel;
  cliente: ClientePdfModel;
  itens: ItemOrcamentoPdfModel[];
  subtotalFormatado: string;        // Ex: "R$ 5.422,50"
  temDesconto: boolean;
  descricaoDesconto: string | null; // Ex: "Desconto (10%):" ou "Desconto Fixo:"
  valorDescontoFormatado: string | null; // Ex: "- R$ 542,25"
  totalFormatado: string;           // Ex: "R$ 4.880,25"
  observacoes: string | null;
  condicoesPagamento: string | null;
}

export interface ResultadoGeracaoPdf {
  uri: string;
  nomeArquivo: string;
}

/**
 * Contrato abstrato para o gerador de PDF.
 * Permanece 100% agnóstico de infraestrutura e bibliotecas concretas.
 */
export interface PdfGenerator {
  gerar(modelo: OrcamentoPdfModel): Promise<ResultadoGeracaoPdf>;
}
