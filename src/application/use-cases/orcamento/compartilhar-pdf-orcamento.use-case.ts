import {
  ShareProvider,
  ResultadoCompartilhamento,
} from '../../interfaces/share-provider.interface';
import { GerarPdfOrcamentoUseCase } from './gerar-pdf-orcamento.use-case';
import { OrcamentoRepository } from '../../../domain/repositories/orcamento.repository.interface';
import { AuthService } from '../../services/auth.service';

export interface CompartilharPdfOrcamentoInput {
  orcamentoId: string;
  usuarioId: string;
  fileUriExistente?: string;
}

/**
 * Caso de Uso: Compartilhar PDF de Orçamento.
 *
 * Camada de Aplicação (100% pura, sem acoplamento a SDKs móveis ou APIs nativas).
 *
 * Responsabilidades:
 * 1. Validar autenticação do usuário;
 * 2. Validar autorização e isolamento de tenant (o orçamento deve pertencer ao usuário);
 * 3. Sanitizar e definir o nome canônico institucional do arquivo (Orcamento_<numero>.pdf);
 * 4. Avaliar existência de arquivo prévio no cache seguro via ShareProvider (Cenário A - Reutilização byte-idêntica);
 * 5. Caso inexistente ou expirado, acionar transparentemente o GerarPdfOrcamentoUseCase do Bloco B (Cenário B - Regeneração);
 * 6. Delegar a abertura da Share Sheet ao ShareProvider;
 * 7. Preservar rigorosamente inalterado o status comercial do orçamento (RN81 / RNF03).
 */
export class CompartilharPdfOrcamentoUseCase {
  constructor(
    private readonly shareProvider: ShareProvider,
    private readonly gerarPdfUseCase: GerarPdfOrcamentoUseCase,
    private readonly orcamentoRepository: OrcamentoRepository,
    private readonly authService: AuthService
  ) {}

  async execute(input: CompartilharPdfOrcamentoInput): Promise<ResultadoCompartilhamento> {
    // 1. Validação de autenticação
    const usuarioAtual = await this.authService.getCurrentUser();
    if (!usuarioAtual || usuarioAtual.id !== input.usuarioId) {
      return {
        sucesso: false,
        status: 'ERRO',
        mensagem: 'Acesso não autorizado. Usuário não autenticado.',
      };
    }

    if (!input.orcamentoId || input.orcamentoId.trim() === '') {
      return {
        sucesso: false,
        status: 'ERRO',
        mensagem: 'ID do orçamento não informado.',
      };
    }

    // 2. Validação da existência e titularidade do orçamento (Tenant Isolation)
    const orcamentoComCliente = await this.orcamentoRepository.buscarPorId(input.orcamentoId.trim());
    if (!orcamentoComCliente || !orcamentoComCliente.orcamento) {
      return {
        sucesso: false,
        status: 'ERRO',
        mensagem: 'Orçamento não encontrado.',
      };
    }

    const orcamento = orcamentoComCliente.orcamento;
    if (orcamento.usuarioId !== usuarioAtual.id) {
      return {
        sucesso: false,
        status: 'ERRO',
        mensagem: 'Orçamento não pertencente ao usuário autenticado.',
      };
    }

    // 3. Sanitização e definição do nome institucional canônico do arquivo (RN81)
    const numeroSanitizado = (orcamento.numero || 'SEM_NUMERO').replace(/[^a-zA-Z0-9_-]/g, '_');
    const nomeArquivo = `Orcamento_${numeroSanitizado}.pdf`;

    let uriParaCompartilhar = input.fileUriExistente;

    // 4. Validação defensiva da URI informada (ACHADO-SHARE-10)
    let arquivoExiste = false;
    if (uriParaCompartilhar && typeof uriParaCompartilhar === 'string' && uriParaCompartilhar.trim() !== '') {
      const uriNormalizada = uriParaCompartilhar.trim();
      // Exige prefixo file://, extensão .pdf e ausência de travessia
      if (
        uriNormalizada.startsWith('file://') &&
        uriNormalizada.toLowerCase().endsWith('.pdf') &&
        !uriNormalizada.includes('..')
      ) {
        arquivoExiste = await this.shareProvider.verificarArquivoExiste(uriNormalizada);
        if (arquivoExiste) {
          uriParaCompartilhar = uriNormalizada;
        }
      }
    }

    // 5. Regeneração transparente via Bloco B caso o arquivo não exista no cache
    if (!arquivoExiste) {
      try {
        const resultadoGeracao = await this.gerarPdfUseCase.execute({
          orcamentoId: orcamento.id,
          usuarioId: usuarioAtual.id,
        });
        uriParaCompartilhar = resultadoGeracao.uri;
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        return {
          sucesso: false,
          status: 'ERRO',
          mensagem: `Falha ao gerar o documento PDF para compartilhamento: ${msg}`,
        };
      }
    }

    if (!uriParaCompartilhar) {
      return {
        sucesso: false,
        status: 'ERRO',
        mensagem: 'Não foi possível obter o arquivo para compartilhamento.',
      };
    }

    // 6. Invocação da porta de infraestrutura de compartilhamento nativo
    return await this.shareProvider.share({
      fileUri: uriParaCompartilhar,
      mimeType: 'application/pdf',
      dialogTitle: `Compartilhar Orçamento #${orcamento.numero}`,
      nomeArquivo,
    });
  }
}
