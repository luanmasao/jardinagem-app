import { Cliente } from '../../domain/entities/cliente';
import { Endereco } from '../../domain/entities/endereco';
import { ClienteRepository } from '../../domain/repositories/cliente.repository.interface';
import { supabaseClienteRepository } from '../../infrastructure/repositories/supabase-cliente.repository';
import { AuthService, authService } from './auth.service';
import { GeocodingProvider } from '../interfaces/geocoding-provider.interface';
import { expoLocationGeocodingProvider } from '../../infrastructure/services/geocoding/expo-location-geocoding.provider';
import {
  ListarClientesUseCase,
  ObterClienteUseCase,
  CriarClienteUseCase,
  CriarClienteInput,
  AtualizarClienteUseCase,
  AtualizarClienteInput,
  AlterarAtivoClienteUseCase,
  ObterEnderecoClienteUseCase,
  SalvarEnderecoClienteUseCase,
} from '../use-cases/cliente';
import { ValidarEnderecoInput } from '../validation/cliente.validator';

/**
 * ClienteService: Serviço de aplicação que orquestra as operações do módulo de clientes.
 * Reúne os casos de uso homologados mantendo a camada de apresentação desacoplada da infraestrutura.
 */
export class ClienteService {
  private readonly listarClientesUseCase: ListarClientesUseCase;
  private readonly obterClienteUseCase: ObterClienteUseCase;
  private readonly criarClienteUseCase: CriarClienteUseCase;
  private readonly atualizarClienteUseCase: AtualizarClienteUseCase;
  private readonly alterarAtivoClienteUseCase: AlterarAtivoClienteUseCase;
  private readonly obterEnderecoClienteUseCase: ObterEnderecoClienteUseCase;
  private readonly salvarEnderecoClienteUseCase: SalvarEnderecoClienteUseCase;

  constructor(
    repository: ClienteRepository = supabaseClienteRepository,
    auth: AuthService = authService,
    geocodingProvider: GeocodingProvider = expoLocationGeocodingProvider
  ) {
    this.listarClientesUseCase = new ListarClientesUseCase(repository, auth);
    this.obterClienteUseCase = new ObterClienteUseCase(repository, auth);
    this.criarClienteUseCase = new CriarClienteUseCase(repository, auth, geocodingProvider);
    this.atualizarClienteUseCase = new AtualizarClienteUseCase(repository, auth, geocodingProvider);
    this.alterarAtivoClienteUseCase = new AlterarAtivoClienteUseCase(repository, auth);
    this.obterEnderecoClienteUseCase = new ObterEnderecoClienteUseCase(repository, auth);
    this.salvarEnderecoClienteUseCase = new SalvarEnderecoClienteUseCase(repository, auth, geocodingProvider);
  }

  async listarClientes(): Promise<Cliente[]> {
    return this.listarClientesUseCase.execute();
  }

  async obterCliente(id: string): Promise<Cliente | null> {
    return this.obterClienteUseCase.execute(id);
  }

  async criarCliente(dados: CriarClienteInput): Promise<Cliente> {
    return this.criarClienteUseCase.execute(dados);
  }

  async atualizarCliente(id: string, dados: AtualizarClienteInput): Promise<Cliente> {
    return this.atualizarClienteUseCase.execute(id, dados);
  }

  async alterarAtivoCliente(id: string, ativo: boolean): Promise<void> {
    return this.alterarAtivoClienteUseCase.execute(id, ativo);
  }

  async obterEnderecoCliente(clienteId: string): Promise<Endereco | null> {
    return this.obterEnderecoClienteUseCase.execute(clienteId);
  }

  async salvarEnderecoCliente(clienteId: string, dados: ValidarEnderecoInput): Promise<Endereco> {
    return this.salvarEnderecoClienteUseCase.execute(clienteId, dados);
  }
}

/**
 * Singleton padrão do serviço de clientes da aplicação.
 */
export const clienteService = new ClienteService();
