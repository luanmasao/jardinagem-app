import { useState, useCallback, useMemo } from 'react';
import { Alert } from 'react-native';
import { CompartilharPdfOrcamentoUseCase } from '../../application/use-cases/orcamento/compartilhar-pdf-orcamento.use-case';
import { GerarPdfOrcamentoUseCase } from '../../application/use-cases/orcamento/gerar-pdf-orcamento.use-case';
import { orcamentoRepositoryOffline } from '../../infrastructure/offline/orcamento-repository-offline';
import { clienteRepositoryComCopiaLocal } from '../../infrastructure/offline/cliente-repository-com-copia-local';
import { expoPrintPdfGenerator } from '../../infrastructure/services/pdf/expo-print-pdf.generator';
import { expoSharingShareProvider } from '../../infrastructure/services/share/expo-sharing.provider';
import { authService } from '../../application/services/auth.service';
import { useAuth } from './use-auth';

export interface UseCompartilharPdfReturn {
  isSharing: boolean;
  compartilharPdf: (orcamentoId: string, fileUriExistente?: string) => Promise<boolean>;
}

/**
 * Hook de apresentação para orquestração do compartilhamento nativo de PDF de orçamentos (RNF03).
 *
 * Responsável por:
 * - Controle de loading reativo (isSharing) para prevenção de duplo clique;
 * - Validação da sessão de autenticação do usuário;
 * - Disparo do caso de uso puro CompartilharPdfOrcamentoUseCase;
 * - Exibição de alertas amigáveis em caso de indisponibilidade ou erro;
 * - Retorno suave para o estado ocioso (idle) no término do diálogo nativo,
 *   sem falsas afirmações de confirmação de entrega ou cancelamento (ACHADO-SHARE-01).
 */
export function useCompartilharPdf(
  customUseCase?: CompartilharPdfOrcamentoUseCase
): UseCompartilharPdfReturn {
  const [isSharing, setIsSharing] = useState<boolean>(false);
  const { user } = useAuth();

  const useCase = useMemo(() => {
    if (customUseCase) return customUseCase;

    const gerarPdfUseCase = new GerarPdfOrcamentoUseCase(
      orcamentoRepositoryOffline,
      clienteRepositoryComCopiaLocal,
      authService,
      expoPrintPdfGenerator
    );

    return new CompartilharPdfOrcamentoUseCase(
      expoSharingShareProvider,
      gerarPdfUseCase,
      orcamentoRepositoryOffline,
      authService
    );
  }, [customUseCase]);

  const compartilharPdf = useCallback(
    async (orcamentoId: string, fileUriExistente?: string): Promise<boolean> => {
      if (isSharing) return false;

      // Resolução do usuário autenticado (via context ou serviço)
      const usuarioAtual = user || (await authService.getCurrentUser());
      if (!usuarioAtual) {
        Alert.alert(
          'Não autenticado',
          'Você precisa estar conectado para compartilhar o orçamento.'
        );
        return false;
      }

      setIsSharing(true);

      try {
        const resultado = await useCase.execute({
          orcamentoId,
          usuarioId: usuarioAtual.id,
          fileUriExistente,
        });

        if (!resultado.sucesso) {
          if (resultado.status === 'INDISPONIVEL') {
            Alert.alert(
              'Compartilhamento Indisponível',
              resultado.mensagem ||
                'Nenhum aplicativo compatível para compartilhamento de PDF foi localizado no dispositivo.'
            );
          } else {
            Alert.alert(
              'Erro ao Compartilhar',
              resultado.mensagem ||
                'Não foi possível acionar o compartilhamento da proposta comercial.'
            );
          }
          return false;
        }

        // Sucesso na abertura e retorno da Share Sheet nativa (ACHADO-SHARE-01).
        // Restaura suavemente ao estado idle sem emitir falso "Enviado com sucesso".
        return true;
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        Alert.alert('Erro Inesperado', `Ocorreu uma falha ao tentar compartilhar: ${msg}`);
        return false;
      } finally {
        setIsSharing(false);
      }
    },
    [isSharing, user, useCase]
  );

  return { isSharing, compartilharPdf };
}
