import { ServicoRepository } from '../../../domain/repositories/servico.repository.interface';
import { Servico } from '../../../domain/entities/servico';
import { AuthService } from '../../services/auth.service';
import { validarDadosServico } from '../../validation/servico.validator';

export interface CriarServicoInput {
  nome: string;
  descricao?: string | null;
  unidade: string;
  precoBase: number;
  usaMedicaoArea?: boolean;
  ativo?: boolean;
}

/**
 * Caso de uso: Criar serviço.
 * Injeta usuario_id a partir do usuário autenticado.
 * Aplica RN16 (unidade m² se usaMedicaoArea).
 */
export class CriarServicoUseCase {
  constructor(
    private readonly servicoRepository: ServicoRepository,
    private readonly authService: AuthService
  ) {}

  async execute(input: CriarServicoInput): Promise<Servico> {
    const usuarioAtual = await this.authService.getCurrentUser();
    if (!usuarioAtual) {
      throw new Error('Usuário não autenticado.');
    }

    validarDadosServico(input);

    const usaMedicao = Boolean(input.usaMedicaoArea);
    const unidadeFinal = usaMedicao ? 'm²' : input.unidade.trim();

    return this.servicoRepository.criar({
      usuarioId: usuarioAtual.id,
      nome: input.nome.trim(),
      descricao: input.descricao ? input.descricao.trim() : null,
      unidade: unidadeFinal,
      precoBase: input.precoBase,
      usaMedicaoArea: usaMedicao,
      ativo: input.ativo ?? true,
    });
  }
}
