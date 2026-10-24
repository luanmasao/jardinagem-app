import { Servico } from '../../domain/entities/servico';
import { ServicoRepository } from '../../domain/repositories/servico.repository.interface';
import { servicoRepositoryComCopiaLocal } from '../../infrastructure/offline/servico-repository-com-copia-local';
import { AuthService, authService } from './auth.service';
import {
  ListarServicosUseCase,
  ObterServicoUseCase,
  CriarServicoUseCase,
  CriarServicoInput,
  AtualizarServicoUseCase,
  AtualizarServicoInput,
  AlterarAtivoServicoUseCase,
} from '../use-cases/servico';

/**
 * ServicoService: Serviço de aplicação que orquestra as operações do catálogo de serviços.
 * Mantém a camada de apresentação desacoplada da infraestrutura.
 */
export class ServicoService {
  private readonly listarServicosUseCase: ListarServicosUseCase;
  private readonly obterServicoUseCase: ObterServicoUseCase;
  private readonly criarServicoUseCase: CriarServicoUseCase;
  private readonly atualizarServicoUseCase: AtualizarServicoUseCase;
  private readonly alterarAtivoServicoUseCase: AlterarAtivoServicoUseCase;

  constructor(
    repository: ServicoRepository = servicoRepositoryComCopiaLocal,
    auth: AuthService = authService
  ) {
    this.listarServicosUseCase = new ListarServicosUseCase(repository, auth);
    this.obterServicoUseCase = new ObterServicoUseCase(repository, auth);
    this.criarServicoUseCase = new CriarServicoUseCase(repository, auth);
    this.atualizarServicoUseCase = new AtualizarServicoUseCase(repository, auth);
    this.alterarAtivoServicoUseCase = new AlterarAtivoServicoUseCase(repository, auth);
  }

  async listarServicos(): Promise<Servico[]> {
    return this.listarServicosUseCase.execute();
  }

  async obterServico(id: string): Promise<Servico | null> {
    return this.obterServicoUseCase.execute(id);
  }

  async criarServico(dados: CriarServicoInput): Promise<Servico> {
    return this.criarServicoUseCase.execute(dados);
  }

  async atualizarServico(id: string, dados: AtualizarServicoInput): Promise<Servico> {
    return this.atualizarServicoUseCase.execute(id, dados);
  }

  async alterarAtivoServico(id: string, ativo: boolean): Promise<void> {
    return this.alterarAtivoServicoUseCase.execute(id, ativo);
  }
}

/**
 * Singleton padrão do serviço de serviços da aplicação.
 */
export const servicoService = new ServicoService();
