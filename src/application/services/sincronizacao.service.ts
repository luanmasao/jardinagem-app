import {
  ResultadoSincronizacao,
  SincronizadorRascunhos,
} from '../interfaces/sincronizador-rascunhos.interface';
import { ConectividadeProvider } from '../interfaces/conectividade-provider.interface';
import { supabaseSincronizadorRascunhos } from '../../infrastructure/offline/supabase-sincronizador-rascunhos';
import { conectividadeProvider } from '../../infrastructure/offline/expo-network-conectividade.provider';

const RESULTADO_VAZIO: ResultadoSincronizacao = { enviados: 0, falhas: [], descartados: [], renumerados: [] };

/**
 * SincronizacaoService: envia ao servidor os rascunhos criados ou alterados sem conexão
 * (RF85 ao reconectar, RF86 por solicitação do usuário).
 * Garante uma sincronização por vez: chamadas simultâneas recebem o mesmo resultado.
 */
export class SincronizacaoService {
  private emAndamento: Promise<ResultadoSincronizacao> | null = null;
  private readonly ouvintes = new Set<() => void>();

  constructor(
    private readonly sincronizador: SincronizadorRascunhos = supabaseSincronizadorRascunhos,
    private readonly conectividade: ConectividadeProvider = conectividadeProvider
  ) {}

  contarPendentes(): Promise<number> {
    return this.sincronizador.contarPendentes();
  }

  sincronizar(): Promise<ResultadoSincronizacao> {
    // Reserva a execução antes de qualquer await, para chamadas no mesmo instante não rodarem em dobro.
    if (!this.emAndamento) {
      this.emAndamento = this.executar().finally(() => {
        this.emAndamento = null;
      });
    }
    return this.emAndamento;
  }

  /**
   * Avisa quando uma sincronização alterou orçamentos (enviou ou descartou rascunhos),
   * para as telas abertas recarregarem. Devolve a função que cancela o aviso.
   */
  aoAlterarOrcamentos(ouvinte: () => void): () => void {
    this.ouvintes.add(ouvinte);
    return () => {
      this.ouvintes.delete(ouvinte);
    };
  }

  private async executar(): Promise<ResultadoSincronizacao> {
    if (!(await this.conectividade.estaOnline())) return RESULTADO_VAZIO;
    const resultado = await this.sincronizador.sincronizar();
    if (resultado.enviados > 0 || resultado.descartados.length > 0) {
      this.ouvintes.forEach((ouvinte) => ouvinte());
    }
    return resultado;
  }
}

export const sincronizacaoService = new SincronizacaoService();
