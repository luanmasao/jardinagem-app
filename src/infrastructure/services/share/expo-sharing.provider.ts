import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import {
  ShareProvider,
  CompartilharArquivoParams,
  ResultadoCompartilhamento,
} from '../../../application/interfaces/share-provider.interface';

/**
 * Adaptador de infraestrutura concreto para compartilhamento nativo utilizando expo-sharing.
 *
 * Encapsula:
 * - Acesso ao expo-sharing e expo-file-system;
 * - Resolução segura através do SharingFileProvider (autoridade: com.jardinagem.app.SharingFileProvider);
 * - Confinamento de arquivos ao diretório autorizado de cache (ACHADO-SHARE-10);
 * - Preparação e sanitização do nome canônico (ex: Orcamento_ORC-2026-001.pdf) (RN81);
 * - Degradação segura via fallback caso a cópia falhe (ACHADO-SHARE-12);
 * - Mapeamento preciso de indisponibilidade e erro técnico (ACHADO-SHARE-11);
 * - Semântica de retorno normal DISPARADO sem falsas afirmações de entrega (ACHADO-SHARE-01).
 */
export class ExpoSharingShareProvider implements ShareProvider {
  async isAvailable(): Promise<boolean> {
    try {
      return await Sharing.isAvailableAsync();
    } catch {
      return false;
    }
  }

  /**
   * Valida se a URI do arquivo é segura, válida e existe fisicamente no armazenamento.
   *
   * ACHADO-SHARE-10:
   * Exige estritamente:
   * 1. URI com esquema file://;
   * 2. Extensão .pdf;
   * 3. Ausência de sequências de directory traversal (..);
   * 4. Caminho confinado estritamente dentro de FileSystem.cacheDirectory.
   */
  async verificarArquivoExiste(fileUri: string): Promise<boolean> {
    try {
      if (!fileUri || typeof fileUri !== 'string') {
        return false;
      }

      const uriNormalizada = fileUri.trim();

      if (!uriNormalizada.startsWith('file://')) {
        return false;
      }

      if (!uriNormalizada.toLowerCase().endsWith('.pdf')) {
        return false;
      }

      if (uriNormalizada.includes('..')) {
        return false;
      }

      const cacheDir = FileSystem.cacheDirectory;
      if (!cacheDir || !uriNormalizada.startsWith(cacheDir)) {
        return false;
      }

      const info = await FileSystem.getInfoAsync(uriNormalizada);
      return info.exists;
    } catch {
      return false;
    }
  }

  async share(params: CompartilharArquivoParams): Promise<ResultadoCompartilhamento> {
    try {
      // 1. Checagem prévia de disponibilidade geral
      const disponivel = await this.isAvailable();
      if (!disponivel) {
        return {
          sucesso: false,
          status: 'INDISPONIVEL',
          mensagem: 'O compartilhamento de arquivos não está disponível neste dispositivo.',
        };
      }

      // 2. Verificação de integridade e confinamento do arquivo fonte
      const arquivoExiste = await this.verificarArquivoExiste(params.fileUri);
      if (!arquivoExiste) {
        return {
          sucesso: false,
          status: 'ERRO',
          mensagem: 'Arquivo PDF não encontrado ou não autorizado para compartilhamento.',
        };
      }

      // 3. Preparação do arquivo com nome institucional canônico (RN81)
      let uriFinalParaCompartilhar = params.fileUri;
      if (params.nomeArquivo && params.nomeArquivo.trim() !== '') {
        const cacheDir = FileSystem.cacheDirectory;
        if (cacheDir) {
          // Sanitização do nome do arquivo preservando extensão
          const nomeSanitizado = params.nomeArquivo.replace(/[^a-zA-Z0-9_.-]/g, '_');
          const caminhoDestino = `${cacheDir}${nomeSanitizado}`;

          try {
            await FileSystem.copyAsync({
              from: params.fileUri,
              to: caminhoDestino,
            });
            uriFinalParaCompartilhar = caminhoDestino;
          } catch (err) {
            // ACHADO-SHARE-12: Fallback degradado em caso de falha de cópia
            console.warn(
              '[ExpoSharingShareProvider] Falha ao copiar arquivo para nome canônico. Usando fallback original:',
              err
            );
            uriFinalParaCompartilhar = params.fileUri;
          }
        }
      }

      // 4. Invocação da Share Sheet nativa via expo-sharing
      await Sharing.shareAsync(uriFinalParaCompartilhar, {
        mimeType: params.mimeType || 'application/pdf',
        dialogTitle: params.dialogTitle,
        UTI: 'com.adobe.pdf',
      });

      // 5. Retorno normal do diálogo nativo (ACHADO-SHARE-01)
      // No Android, a Promise resolve quando o diálogo é encerrado (compartilhado ou fechado).
      return {
        sucesso: true,
        status: 'DISPARADO',
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);

      // ACHADO-SHARE-11: Detecção de ausência de aplicativo receptor compatível
      if (
        msg.includes('ActivityNotFoundException') ||
        msg.includes('No Activity found') ||
        msg.includes('no activity found') ||
        msg.includes('not found')
      ) {
        return {
          sucesso: false,
          status: 'INDISPONIVEL',
          mensagem: 'Nenhum aplicativo compatível para compartilhamento de PDF foi localizado no dispositivo.',
        };
      }

      return {
        sucesso: false,
        status: 'ERRO',
        mensagem: `Falha técnica ao acionar o compartilhamento: ${msg}`,
      };
    }
  }
}

export const expoSharingShareProvider = new ExpoSharingShareProvider();
