import * as Print from 'expo-print';
import {
  PdfGenerator,
  OrcamentoPdfModel,
  ResultadoGeracaoPdf,
} from '../../../application/interfaces/pdf-generator.interface';
import { gerarOrcamentoHtml } from '../../templates/pdf/orcamento-html.template';

/**
 * Implementação concreta de PdfGenerator utilizando expo-print.
 *
 * Compila o template HTML5/CSS através do motor nativo Android WebView / PrintDocumentAdapter.
 * Gera o arquivo temporário localmente no cache do aplicativo (100% offline).
 * Não envia dados para a nuvem nem executa compartilhamento externo.
 */
export class ExpoPrintPdfGenerator implements PdfGenerator {
  async gerar(modelo: OrcamentoPdfModel): Promise<ResultadoGeracaoPdf> {
    const html = gerarOrcamentoHtml(modelo);

    const resultado = await Print.printToFileAsync({
      html,
      base64: false,
    });

    const sanitizado = modelo.numero.replace(/[^a-zA-Z0-9_-]/g, '_');
    const nomeArquivo = `Orcamento_${sanitizado}.pdf`;

    return {
      uri: resultado.uri,
      nomeArquivo,
    };
  }
}

export const expoPrintPdfGenerator = new ExpoPrintPdfGenerator();
