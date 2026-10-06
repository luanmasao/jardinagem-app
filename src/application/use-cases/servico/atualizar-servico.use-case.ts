import { ServicoRepository } from '../../../domain/repositories/servico.repository.interface';
import { Servico } from '../../../domain/entities/servico';
import { AuthService } from '../../services/auth.service';
import { RegraNegocioError } from '../../../domain/errors/dominio-error';

export interface AtualizarServicoInput {
  nome?: string;
  descricao?: string | null;
  unidade?: string;
  precoBase?: number;
  usaMedicaoArea?: boolean;
}

/**
 * Caso de uso: Atualizar serviço existente.
 * Valida titularidade e impede troca de usuário.
 */
export class AtualizarServicoUseCase {
  constructor(
    private readonly servicoRepository: ServicoRepository,
    private readonly authService: AuthService
  ) {}

  async execute(id: string, input: AtualizarServicoInput): Promise<Servico> {
    if (!id || id.trim() === '') {
      throw new RegraNegocioError('O ID do serviço é obrigatório.');
    }

    const usuarioAtual = await this.authService.getCurrentUser();
    if (!usuarioAtual) {
      throw new Error('Usuário não autenticado.');
    }

    const servicoExistente = await this.servicoRepository.buscarPorId(id);
    if (!servicoExistente || servicoExistente.usuarioId !== usuarioAtual.id) {
      throw new Error('Serviço não encontrado ou não pertence ao usuário.');
    }

    if (input.nome !== undefined) {
      if (!input.nome || input.nome.trim() === '') {
        throw new RegraNegocioError('O nome do serviço é obrigatório.');
      }
      if (input.nome.trim().length > 150) {
        throw new RegraNegocioError('O nome do serviço não pode exceder 150 caracteres.');
      }
    }

    if (input.precoBase !== undefined) {
      if (typeof input.precoBase !== 'number' || input.precoBase < 0) {
        throw new RegraNegocioError('O preço base não pode ser negativo.');
      }
    }

    const usaMedicaoFinal = input.usaMedicaoArea !== undefined ? input.usaMedicaoArea : servicoExistente.usaMedicaoArea;
    const unidadeInformada = input.unidade !== undefined ? input.unidade.trim() : servicoExistente.unidade;

    if (input.unidade !== undefined && (!input.unidade || input.unidade.trim() === '')) {
      throw new RegraNegocioError('A unidade de medida é obrigatória.');
    }

    if (usaMedicaoFinal && unidadeInformada !== 'm²') {
      throw new RegraNegocioError("Quando o serviço utiliza medição de área, a unidade deve ser 'm²'.");
    }

    const unidadeFinal = usaMedicaoFinal ? 'm²' : unidadeInformada;

    return this.servicoRepository.atualizar(id, {
      nome: input.nome !== undefined ? input.nome.trim() : undefined,
      descricao: input.descricao !== undefined ? (input.descricao ? input.descricao.trim() : null) : undefined,
      unidade: input.unidade !== undefined || input.usaMedicaoArea !== undefined ? unidadeFinal : undefined,
      precoBase: input.precoBase,
      usaMedicaoArea: input.usaMedicaoArea,
    });
  }
}
