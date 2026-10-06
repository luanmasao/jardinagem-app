/**
 * Parâmetros para a operação de compartilhamento nativo de arquivo.
 */
export interface CompartilharArquivoParams {
  /** URI do arquivo local gerado (esquema file://) */
  fileUri: string;
  /** Tipo MIME do arquivo (obrigatório: 'application/pdf') */
  mimeType: string;
  /** Título exibido na barra superior do diálogo Chooser do Android */
  dialogTitle: string;
  /** Nome institucional sugerido para o arquivo ao ser compartilhado (ex: 'Orcamento_ORC-2026-001.pdf') */
  nomeArquivo: string;
}

/**
 * Status do resultado da operação de compartilhamento:
 * - 'DISPARADO': A Share Sheet nativa foi aberta com sucesso e o usuário encerrou o diálogo (selecionando um app ou fechando a folha);
 * - 'INDISPONIVEL': O dispositivo não possui capacidade técnica ou apps compatíveis para compartilhar arquivos;
 * - 'ERRO': Falha técnica antes ou durante a invocação da Intent nativa.
 *
 * NOTA DE PLATAFORMA: No Android, a API nativa não informa se o usuário concluiu o compartilhamento
 * nem se cancelou o diálogo (a Promise é resolvida normalmente). Portanto, 'DISPARADO' não garante
 * entrega efetiva ao destinatário e não existem estados 'CANCELADO' ou 'COMPARTILHADO'.
 */
export type StatusCompartilhamento = 'DISPARADO' | 'INDISPONIVEL' | 'ERRO';

/**
 * Resposta padronizada da porta de compartilhamento.
 */
export interface ResultadoCompartilhamento {
  sucesso: boolean;
  status: StatusCompartilhamento;
  mensagem?: string;
}

/**
 * Porta de Infraestrutura para serviços de compartilhamento e validação de arquivos locais de compartilhamento.
 *
 * Totalmente desacoplada de bibliotecas de terceiros (Expo, React Native ou APIs Android nativas).
 */
export interface ShareProvider {
  /**
   * Verifica se o dispositivo possui suporte geral a compartilhamento de arquivos.
   */
  isAvailable(): Promise<boolean>;

  /**
   * Verifica se o arquivo local na URI informada existe fisicamente no armazenamento
   * e está confinado ao diretório autorizado de cache do aplicativo.
   * Permite que o Use Case avalie a existência de cache sem importar SDKs nativos.
   *
   * @param fileUri URI local no formato file://
   */
  verificarArquivoExiste(fileUri: string): Promise<boolean>;

  /**
   * Prepara o arquivo com o nome institucional canônico e abre a Share Sheet nativa do sistema.
   *
   * @param params Metadados e caminho do arquivo
   */
  share(params: CompartilharArquivoParams): Promise<ResultadoCompartilhamento>;
}
