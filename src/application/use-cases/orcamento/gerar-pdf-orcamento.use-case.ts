import { OrcamentoRepository } from '../../../domain/repositories/orcamento.repository.interface';
import { ClienteRepository } from '../../../domain/repositories/cliente.repository.interface';
import { AuthService } from '../../services/auth.service';
import { PdfGenerator, ResultadoGeracaoPdf } from '../../interfaces/pdf-generator.interface';
import { OrcamentoPdfMapper } from '../../mappers/orcamento-pdf.mapper';
import { RegraNegocioError } from '../../../domain/errors/dominio-error';
import { arredondarMoeda } from '../../../domain/calculations/moeda';

export interface GerarPdfOrcamentoInput {
  orcamentoId: string;
  usuarioId: string;
}

export class OrcamentoNaoEncontradoError extends Error {
  constructor(id: string) {
    super(`Orçamento com ID '${id}' não foi encontrado.`);
    this.name = 'OrcamentoNaoEncontradoError';
  }
}

export class UsuarioNaoAutorizadoError extends Error {
  constructor() {
    super('Usuário não autorizado a gerar PDF deste orçamento.');
    this.name = 'UsuarioNaoAutorizadoError';
  }
}

export class OrcamentoSemItensError extends Error {
  constructor() {
    super('Não é possível gerar PDF de orçamento sem itens cadastrados.');
    this.name = 'OrcamentoSemItensError';
  }
}

export class OrcamentoNaoSincronizadoError extends Error {
  constructor() {
    super(
      'Este rascunho ainda não foi sincronizado com o servidor e tem um número provisório. Sincronize-o para gerar o PDF com o número definitivo.'
    );
    this.name = 'OrcamentoNaoSincronizadoError';
  }
}

export class InconsistenciaFinanceiraError extends Error {
  constructor(detalhes: string) {
    super(`Inconsistência financeira detectada no orçamento: ${detalhes}`);
    this.name = 'InconsistenciaFinanceiraError';
  }
}

export class FalhaGeracaoPdfError extends Error {
  constructor(motivo: string, causaOriginal?: unknown) {
    super(`Falha ao gerar o arquivo PDF: ${motivo}`);
    this.name = 'FalhaGeracaoPdfError';
    if (causaOriginal) {
      this.cause = causaOriginal;
    }
  }
}

/**
 * Caso de Uso: Gerar PDF de Orçamento.
 *
 * Responsável por:
 * 1. Validar parâmetros de entrada;
 * 2. Carregar o orçamento autenticado com seus itens e áreas;
 * 3. Validar propriedade do orçamento (RLS / multitenancy);
 * 4. Validar se possui itens (mínimo 1);
 * 5. Carregar dados cadastrais vigentes de cliente e prestador;
 * 6. Validar defensivamente os invariantes matemáticos (sem recalcular ou corrigir banco);
 * 7. Orquestrar o mapeamento para OrcamentoPdfModel;
 * 8. Disparar a geração no PdfGenerator concreto.
 */
export class GerarPdfOrcamentoUseCase {
  constructor(
    private readonly orcamentoRepo: OrcamentoRepository,
    private readonly clienteRepo: ClienteRepository,
    private readonly authService: AuthService,
    private readonly pdfGenerator: PdfGenerator
  ) {}

  async execute(input: GerarPdfOrcamentoInput): Promise<ResultadoGeracaoPdf> {
    // 1. Validação de parâmetros de entrada
    if (!input.orcamentoId || input.orcamentoId.trim() === '') {
      throw new RegraNegocioError('O ID do orçamento é obrigatório.');
    }
    if (!input.usuarioId || input.usuarioId.trim() === '') {
      throw new RegraNegocioError('O ID do usuário é obrigatório.');
    }

    const orcamentoId = input.orcamentoId.trim();
    const usuarioId = input.usuarioId.trim();

    // 2. Carregamento do orçamento
    const orcamentoComCliente = await this.orcamentoRepo.buscarPorId(orcamentoId);
    if (!orcamentoComCliente || !orcamentoComCliente.orcamento) {
      throw new OrcamentoNaoEncontradoError(orcamentoId);
    }

    const orcamento = orcamentoComCliente.orcamento;

    // 3. Validação de autorização / propriedade
    if (orcamento.usuarioId !== usuarioId) {
      throw new UsuarioNaoAutorizadoError();
    }

    // RNF33 / RN82: rascunho pendente ainda tem número provisório, que não identifica o orçamento.
    if (orcamentoComCliente.pendenteSincronizacao) {
      throw new OrcamentoNaoSincronizadoError();
    }

    // 4. Validação de conteúdo: pelo menos 1 item
    if (!orcamento.itens || orcamento.itens.length === 0) {
      throw new OrcamentoSemItensError();
    }

    // 5. Carregamento cadastral do cliente e prestador
    const cliente = await this.clienteRepo.buscarPorId(orcamento.clienteId);
    if (!cliente) {
      throw new OrcamentoNaoEncontradoError(`Cliente '${orcamento.clienteId}' do orçamento`);
    }

    // Se o cliente não tem endereço carregado, busca explicitamente do repositório
    if (!cliente.endereco) {
      const endereco = await this.clienteRepo.obterEndereco(cliente.id);
      if (endereco) {
        cliente.definirEndereco(endereco);
      }
    }

    const prestador = await this.authService.getPerfilUsuario(usuarioId);

    // 6. Validação defensiva de integridade financeira (sem recalcular ou sobrepor valores)
    const somaItens = arredondarMoeda(
      orcamento.itens.reduce((acc, it) => acc + it.valorTotal, 0)
    );

    if (Math.abs(somaItens - orcamento.subtotal) > 0.01) {
      throw new InconsistenciaFinanceiraError(
        `A soma dos itens (R$ ${somaItens.toFixed(2)}) diverge do subtotal persistido (R$ ${orcamento.subtotal.toFixed(2)}).`
      );
    }

    if (orcamento.total > orcamento.subtotal) {
      throw new InconsistenciaFinanceiraError(
        `O total da proposta (R$ ${orcamento.total.toFixed(2)}) é superior ao subtotal (R$ ${orcamento.subtotal.toFixed(2)}).`
      );
    }

    // 7. Mapeamento
    const modelo = OrcamentoPdfMapper.paraModelo(orcamento, cliente, prestador);

    // 8. Geração de PDF via PdfGenerator
    try {
      return await this.pdfGenerator.gerar(modelo);
    } catch (err) {
      throw new FalhaGeracaoPdfError(
        err instanceof Error ? err.message : String(err),
        err
      );
    }
  }
}
