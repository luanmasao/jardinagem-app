import { OrcamentoRepository } from '../../../domain/repositories/orcamento.repository.interface';

export interface ExpirarOrcamentosVencidosOutput {
  linhasExpiradas: number;
}

/**
 * ExpirarOrcamentosVencidosUseCase
 * Caso de uso para o mecanismo Just-in-Time (JIT) de defesa em profundidade do cliente.
 * 
 * Regras:
 * 1. Opera exclusivamente como mecanismo complementar (pg_cron é o primário);
 * 2. Utiliza Single-Flight mutex para evitar chamadas simultâneas redundantes;
 * 3. Aplica timeout estrito de 2.000 ms não-bloqueante;
 * 4. Invoca o repositório tenant-scoped com RLS ativo.
 */
export class ExpirarOrcamentosVencidosUseCase {
  private isRunning: boolean = false;

  constructor(private readonly orcamentoRepo: OrcamentoRepository) {}

  async execute(): Promise<ExpirarOrcamentosVencidosOutput> {
    // Single-Flight: se já houver execução em andamento, retorna 0 sem duplicar chamadas
    if (this.isRunning) {
      return { linhasExpiradas: 0 };
    }

    if (!this.orcamentoRepo.expirarMeusOrcamentos) {
      return { linhasExpiradas: 0 };
    }

    this.isRunning = true;
    try {
      // Timeout estrito de 2.000 ms conforme especificação
      let timer: ReturnType<typeof setTimeout> | undefined;
      const timeoutPromise = new Promise<ExpirarOrcamentosVencidosOutput>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error('Timeout de 2000ms excedido na RPC de expiração'));
        }, 2000);
      });

      const rpcPromise = this.orcamentoRepo.expirarMeusOrcamentos().then((linhas) => {
        if (timer) clearTimeout(timer);
        return { linhasExpiradas: linhas };
      });

      return await Promise.race([rpcPromise, timeoutPromise]);
    } finally {
      this.isRunning = false;
    }
  }
}
