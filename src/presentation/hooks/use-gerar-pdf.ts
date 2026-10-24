import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { GerarPdfOrcamentoUseCase } from '../../application/use-cases/orcamento/gerar-pdf-orcamento.use-case';
import { orcamentoRepositoryOffline } from '../../infrastructure/offline/orcamento-repository-offline';
import { clienteRepositoryComCopiaLocal } from '../../infrastructure/offline/cliente-repository-com-copia-local';
import { expoPrintPdfGenerator } from '../../infrastructure/services/pdf/expo-print-pdf.generator';
import { androidPdfViewerService } from '../../infrastructure/services/pdf/android-pdf-viewer.service';
import { authService } from '../../application/services/auth.service';

/**
 * Hook para geração e apresentação de PDF de orçamentos.
 *
 * Responsável por:
 * - Controle de loading e prevenção de duplo clique;
 * - Resolução do usuário autenticado atual;
 * - Acionamento do caso de uso GerarPdfOrcamentoUseCase;
 * - Disparo da visualização nativa segura no Android (ACTION_VIEW);
 * - Feedback compreensível ao usuário em caso de erro ou ausência de visualizador.
 */
export function useGerarPdf() {
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  const gerarEVisualizarPdf = useCallback(
    async (orcamentoId: string): Promise<boolean> => {
      if (isGenerating) return false;

      setIsGenerating(true);
      try {
        const usuario = await authService.getCurrentUser();
        if (!usuario) {
          Alert.alert('Erro de Autenticação', 'Usuário não autenticado.');
          return false;
        }

        const useCase = new GerarPdfOrcamentoUseCase(
          orcamentoRepositoryOffline,
          clienteRepositoryComCopiaLocal,
          authService,
          expoPrintPdfGenerator
        );
        const t0 = Date.now();
        const resultado = await useCase.execute({
          orcamentoId,
          usuarioId: usuario.id,
        });
        const t1 = Date.now();
        console.warn(`[PDF_GERACAO] orcamentoId=${orcamentoId} duracaoMs=${t1 - t0}`);

        // Disparo da Intent nativa de visualização ACTION_VIEW
        const resultadoVisualizacao = await androidPdfViewerService.visualizar(resultado.uri);

        if (!resultadoVisualizacao.sucesso) {
          Alert.alert(
            'Visualizador de PDF',
            resultadoVisualizacao.mensagem ||
              'PDF gerado com sucesso, mas não foi possível abrir o visualizador automaticamente.'
          );
        }

        return true;
      } catch (err: unknown) {
        const mensagem =
          err instanceof Error
            ? err.message
            : 'Ocorreu um erro inesperado ao gerar a proposta comercial em PDF.';
        Alert.alert('Falha na Geração do PDF', mensagem);
        return false;
      } finally {
        setIsGenerating(false);
      }
    },
    [isGenerating]
  );

  const executarBenchmark = useCallback(
    async (cenarios: { id: string; nome: string }[]): Promise<Record<string, { amostras: number[]; media: number; p95: number }>> => {
      const usuario = await authService.getCurrentUser();
      if (!usuario) throw new Error('Usuário não autenticado.');

      const useCase = new GerarPdfOrcamentoUseCase(
        orcamentoRepositoryOffline,
        clienteRepositoryComCopiaLocal,
        authService,
        expoPrintPdfGenerator
      );

      const resultados: Record<string, { amostras: number[]; media: number; p95: number }> = {};

      for (const c of cenarios) {
        console.warn(`[BENCHMARK] === Iniciando cenário: ${c.nome} (${c.id}) ===`);
        // 1 warm-up descartado
        const tw0 = Date.now();
        await useCase.execute({ orcamentoId: c.id, usuarioId: usuario.id });
        const tw1 = Date.now();
        console.warn(`[BENCHMARK] ${c.nome} Warm-up (descartado): ${tw1 - tw0}ms`);

        const amostras: number[] = [];
        for (let i = 1; i <= 5; i++) {
          const t0 = Date.now();
          await useCase.execute({ orcamentoId: c.id, usuarioId: usuario.id });
          const t1 = Date.now();
          amostras.push(t1 - t0);
          console.warn(`[BENCHMARK] ${c.nome} Amostra ${i}: ${t1 - t0}ms`);
        }

        const sorted = [...amostras].sort((a, b) => a - b);
        const media = Math.round(amostras.reduce((a, b) => a + b, 0) / amostras.length);
        // p95 para 5 amostras: rank = 0.95 * 5 = 4.75 -> 5ª amostra (índice 4)
        const p95 = sorted[Math.min(sorted.length - 1, Math.floor(0.95 * sorted.length))];

        resultados[c.nome] = { amostras, media, p95 };
        console.warn(`[BENCHMARK_RESULT] ${c.nome} -> Amostras: [${amostras.join(', ')}] ms | Média: ${media}ms | p95: ${p95}ms`);
      }

      return resultados;
    },
    []
  );

  return {
    isGenerating,
    gerarEVisualizarPdf,
    executarBenchmark,
  };
}
