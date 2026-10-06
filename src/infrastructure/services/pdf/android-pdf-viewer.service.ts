import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';

export interface VisualizarPdfResultado {
  sucesso: boolean;
  mensagem?: string;
}

/**
 * Serviço responsável por abrir e apresentar o arquivo PDF local no dispositivo Android.
 *
 * Utiliza exclusivamente:
 * 1. Conversão de file:// para content:// via FileSystem.getContentUriAsync;
 * 2. Disparo de Intent ACTION_VIEW (android.intent.action.VIEW) com FLAG_GRANT_READ_URI_PERMISSION (1);
 * 3. MIME type application/pdf.
 *
 * Não utiliza ACTION_SEND, não abre Sharesheet e não utiliza expo-sharing.
 */
export class AndroidPdfViewerService {
  async visualizar(fileUri: string): Promise<VisualizarPdfResultado> {
    if (!fileUri || fileUri.trim() === '') {
      return {
        sucesso: false,
        mensagem: 'URI do arquivo PDF inválida.',
      };
    }

    try {
      if (Platform.OS === 'android') {
        // Converte a URI de arquivo em URI de conteúdo segura através do FileProvider nativo
        const contentUri = await FileSystem.getContentUriAsync(fileUri);

        // FLAG_GRANT_READ_URI_PERMISSION = 1
        await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
          data: contentUri,
          type: 'application/pdf',
          flags: 1,
        });

        return { sucesso: true };
      }

      return {
        sucesso: false,
        mensagem: 'Visualização nativa implementada exclusivamente para Android.',
      };
    } catch (error: unknown) {
      const msgOriginal = error instanceof Error ? error.message : String(error);

      // Tratamento defensivo caso não exista visualizador de PDF instalado no dispositivo
      if (
        msgOriginal.includes('ActivityNotFoundException') ||
        msgOriginal.includes('No Activity found') ||
        msgOriginal.includes('not found')
      ) {
        return {
          sucesso: false,
          mensagem:
            'Nenhum aplicativo leitor de PDF encontrado no dispositivo. Instale um visualizador de PDF (ex: Google PDF Viewer) para inspecionar o arquivo.',
        };
      }

      return {
        sucesso: false,
        mensagem: `Não foi possível abrir o visualizador de PDF: ${msgOriginal}`,
      };
    }
  }
}

export const androidPdfViewerService = new AndroidPdfViewerService();
