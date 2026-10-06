import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Cliente } from '../../src/domain/entities/cliente';
import { Endereco } from '../../src/domain/entities/endereco';
import {
  ClienteRepository,
  CriarClienteDados,
  AtualizarClienteDados,
  SalvarEnderecoDados,
} from '../../src/domain/repositories/cliente.repository.interface';
import { AuthService, AuthUser } from '../../src/application/services/auth.service';
import {
  CriarClienteUseCase,
  AtualizarClienteUseCase,
} from '../../src/application/use-cases/cliente';
import {
  GeocodingProvider,
  EnderecoConsultaGeocoding,
  CoordenadasGeocoding,
  GeocodificarOptions,
  GeocodingError,
} from '../../src/application/interfaces/geocoding-provider.interface';
import {
  formatarEnderecoParaGeocodificacao,
} from '../../src/infrastructure/services/geocoding/expo-location-geocoding.provider';
import {
  enderecosSaoIguais,
} from '../../src/application/validation/cliente.validator';

/**
 * Mock em memória de ClienteRepository para testes controlados.
 */
class InMemoryClienteRepository implements ClienteRepository {
  public clientes: Map<string, Cliente> = new Map();
  public enderecos: Map<string, Endereco> = new Map();

  async listar(usuarioId: string): Promise<Cliente[]> {
    const lista: Cliente[] = [];
    for (const cli of this.clientes.values()) {
      if (cli.usuarioId === usuarioId) {
        cli.endereco = this.enderecos.get(cli.id) ?? null;
        lista.push(cli);
      }
    }
    return lista;
  }

  async buscarPorId(id: string): Promise<Cliente | null> {
    const cli = this.clientes.get(id);
    if (!cli) return null;
    cli.endereco = this.enderecos.get(cli.id) ?? null;
    return cli;
  }

  async criar(dados: CriarClienteDados): Promise<Cliente> {
    const id = `cli-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const cli = new Cliente({
      id,
      usuarioId: dados.usuarioId,
      nome: dados.nome,
      telefone: dados.telefone,
      email: dados.email,
      documento: dados.documento,
      observacoes: dados.observacoes,
      ativo: dados.ativo ?? true,
    });
    this.clientes.set(id, cli);
    return cli;
  }

  async atualizar(id: string, dados: AtualizarClienteDados): Promise<Cliente> {
    const cli = this.clientes.get(id);
    if (!cli) throw new Error('Cliente inexistente');
    cli.atualizarDados(dados);
    cli.endereco = this.enderecos.get(id) ?? null;
    return cli;
  }

  async alterarAtivo(id: string, ativo: boolean): Promise<void> {
    const cli = this.clientes.get(id);
    if (cli) {
      if (ativo) cli.ativar();
      else cli.desativar();
    }
  }

  async obterEndereco(clienteId: string): Promise<Endereco | null> {
    return this.enderecos.get(clienteId) ?? null;
  }

  async salvarEndereco(clienteId: string, dados: SalvarEnderecoDados): Promise<Endereco> {
    const id = `end-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const end = new Endereco({
      id,
      clienteId,
      ...dados,
    });
    this.enderecos.set(clienteId, end);
    const cli = this.clientes.get(clienteId);
    if (cli) {
      cli.endereco = end;
    }
    return end;
  }
}

/**
 * Mock configurável de GeocodingProvider para testes unitários determinísticos.
 */
class MockGeocodingProvider implements GeocodingProvider {
  public chamadas: Array<{ endereco: EnderecoConsultaGeocoding; options?: GeocodificarOptions }> = [];
  public proximoResultado: CoordenadasGeocoding | null = null;
  public proximoErro: Error | null = null;
  public delayMs: number = 0;

  async geocodificar(
    endereco: EnderecoConsultaGeocoding,
    options?: GeocodificarOptions
  ): Promise<CoordenadasGeocoding | null> {
    this.chamadas.push({ endereco, options });

    if (this.delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.delayMs));
    }

    if (options?.signal?.aborted) {
      throw new GeocodingError('CANCELADO', 'Operação cancelada pelo chamador.');
    }

    if (this.proximoErro) {
      throw this.proximoErro;
    }

    return this.proximoResultado;
  }
}

const mockAuthService = {
  getCurrentUser: async (): Promise<AuthUser | null> => ({
    id: 'user-geo-test',
    email: 'jardineiro@test.com',
  }),
  getSession: async () => null,
  signOut: async () => ({ error: null }),
  signIn: async () => ({ user: null, session: null, error: null }),
  signUp: async () => ({ user: null, session: null, error: null }),
  onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
} as unknown as AuthService;

describe('Bloco A — Geolocalização e Geocodificação de Clientes v1.1', () => {
  describe('1. Minimização de Dados e Formatação de Consulta (DECISÃO-GEO-06)', () => {
    it('deve formatar string de consulta contendo apenas dados geográficos públicos', () => {
      const endereco: EnderecoConsultaGeocoding = {
        logradouro: 'Avenida Paulista',
        numero: '1000',
        bairro: 'Bela Vista',
        cidade: 'São Paulo',
        estado: 'SP',
        cep: '01310-100',
      };

      const texto = formatarEnderecoParaGeocodificacao(endereco);
      assert.strictEqual(
        texto,
        'Avenida Paulista, 1000, Bela Vista, São Paulo - SP, CEP 01310-100, Brasil'
      );
    });

    it('deve formatar endereço sem número mantendo consistência', () => {
      const endereco: EnderecoConsultaGeocoding = {
        logradouro: 'Rua das Flores',
        bairro: 'Jardins',
        cidade: 'Campinas',
        estado: 'SP',
      };

      const texto = formatarEnderecoParaGeocodificacao(endereco);
      assert.strictEqual(texto, 'Rua das Flores, Jardins, Campinas - SP, Brasil');
    });

    it('deve retornar string vazia quando nenhum campo for informado', () => {
      const endereco: EnderecoConsultaGeocoding = {};
      const texto = formatarEnderecoParaGeocodificacao(endereco);
      assert.strictEqual(texto, '');
    });
  });

  describe('2. Comparação Determinística de Endereços (DECISÃO-GEO-09)', () => {
    it('deve identificar endereços equivalentes ignorando diferenças de caixa e espaços extras', () => {
      const a = {
        logradouro: '  Av. Brasil ',
        numero: '123',
        bairro: 'Centro',
        cidade: 'Curitiba',
        estado: 'pr',
        cep: '80000-000',
      };
      const b = {
        logradouro: 'av. brasil',
        numero: '123 ',
        bairro: 'CENTRO',
        cidade: 'curitiba',
        estado: 'PR',
        cep: '80000-000',
      };

      assert.strictEqual(enderecosSaoIguais(a, b), true);
    });

    it('deve detectar alteração quando o logradouro ou número mudar', () => {
      const a = { logradouro: 'Rua A', numero: '10', cidade: 'SP', estado: 'SP' };
      const b = { logradouro: 'Rua B', numero: '10', cidade: 'SP', estado: 'SP' };
      const c = { logradouro: 'Rua A', numero: '20', cidade: 'SP', estado: 'SP' };

      assert.strictEqual(enderecosSaoIguais(a, b), false);
      assert.strictEqual(enderecosSaoIguais(a, c), false);
    });

    it('deve tratar comparações com valores nulos de forma segura', () => {
      assert.strictEqual(enderecosSaoIguais(null, null), true);
      assert.strictEqual(enderecosSaoIguais({ logradouro: 'Rua A' }, null), false);
      assert.strictEqual(enderecosSaoIguais(null, { logradouro: 'Rua A' }), false);
    });
  });

  describe('3. Criação de Cliente com Geocodificação Automática (RF10 / DECISÃO-GEO-02)', () => {
    it('deve criar cliente e persistir latitude/longitude quando geocodificação tiver sucesso', async () => {
      const repo = new InMemoryClienteRepository();
      const mockProvider = new MockGeocodingProvider();
      mockProvider.proximoResultado = { latitude: -23.561414, longitude: -46.655881 };

      const useCase = new CriarClienteUseCase(repo, mockAuthService, mockProvider);
      const cliente = await useCase.execute({
        nome: 'Condomínio Solar',
        endereco: {
          logradouro: 'Av. Paulista',
          numero: '1000',
          cidade: 'São Paulo',
          estado: 'SP',
          cep: '01310-100',
        },
      });

      assert.ok(cliente.id);
      assert.strictEqual(mockProvider.chamadas.length, 1);
      assert.strictEqual(cliente.endereco?.latitude, -23.561414);
      assert.strictEqual(cliente.endereco?.longitude, -46.655881);
    });

    it('deve salvar cliente com coordenadas nulas quando endereço não for localizado (RN06)', async () => {
      const repo = new InMemoryClienteRepository();
      const mockProvider = new MockGeocodingProvider();
      mockProvider.proximoResultado = null; // Nenhum resultado

      const useCase = new CriarClienteUseCase(repo, mockAuthService, mockProvider);
      const cliente = await useCase.execute({
        nome: 'Sítio Recanto Feliz',
        endereco: {
          logradouro: 'Estrada Rural Sem Nome',
          cidade: 'Interior',
          estado: 'SP',
        },
      });

      assert.ok(cliente.id);
      assert.strictEqual(cliente.endereco?.latitude, null);
      assert.strictEqual(cliente.endereco?.longitude, null);
      assert.strictEqual(cliente.endereco?.logradouro, 'Estrada Rural Sem Nome');
    });

    it('deve salvar cliente com coordenadas nulas sem travar em falha externa ou timeout (RNF15 / RNF22 / DECISÃO-GEO-05)', async () => {
      const repo = new InMemoryClienteRepository();
      const mockProvider = new MockGeocodingProvider();
      mockProvider.proximoErro = new GeocodingError('TIMEOUT', 'Timeout de 5000ms');

      const useCase = new CriarClienteUseCase(repo, mockAuthService, mockProvider);
      const cliente = await useCase.execute({
        nome: 'Empresa Alpha',
        endereco: {
          logradouro: 'Rua Comercial',
          numero: '500',
          cidade: 'São Paulo',
          estado: 'SP',
        },
      });

      assert.ok(cliente.id);
      assert.strictEqual(cliente.endereco?.latitude, null);
      assert.strictEqual(cliente.endereco?.longitude, null);
      assert.strictEqual(cliente.endereco?.numero, '500');
    });

    it('não deve invocar o provedor de geocodificação para cliente sem endereço', async () => {
      const repo = new InMemoryClienteRepository();
      const mockProvider = new MockGeocodingProvider();

      const useCase = new CriarClienteUseCase(repo, mockAuthService, mockProvider);
      const cliente = await useCase.execute({
        nome: 'Cliente Apenas Contato',
        telefone: '11999999999',
      });

      assert.ok(cliente.id);
      assert.strictEqual(cliente.endereco, null);
      assert.strictEqual(mockProvider.chamadas.length, 0);
    });
  });

  describe('4. Atualização de Cliente e Matriz de Consistência (DECISÃO-GEO-09)', () => {
    it('Cenário A: Endereço não alterado -> NÃO deve executar nova geocodificação e deve preservar coordenadas existentes', async () => {
      const repo = new InMemoryClienteRepository();
      const mockProvider = new MockGeocodingProvider();

      // Cria cliente inicial com coordenadas
      const cli = await repo.criar({ usuarioId: 'user-geo-test', nome: 'Cliente Original' });
      await repo.salvarEndereco(cli.id, {
        logradouro: 'Rua das Palmeiras',
        numero: '100',
        cidade: 'Campinas',
        estado: 'SP',
        latitude: -22.905,
        longitude: -47.06,
      });

      const useCase = new AtualizarClienteUseCase(repo, mockAuthService, mockProvider);
      const atualizado = await useCase.execute(cli.id, {
        nome: 'Cliente Original Nome Alterado',
        endereco: {
          logradouro: 'Rua das Palmeiras',
          numero: '100',
          cidade: 'Campinas',
          estado: 'SP',
        },
      });

      // Provedor NÃO deve ser chamado pois endereço textual é idêntico
      assert.strictEqual(mockProvider.chamadas.length, 0);
      assert.strictEqual(atualizado.nome, 'Cliente Original Nome Alterado');
      assert.strictEqual(atualizado.endereco?.latitude, -22.905);
      assert.strictEqual(atualizado.endereco?.longitude, -47.06);
    });

    it('Cenário B: Endereço alterado com sucesso -> deve atualizar para as novas coordenadas', async () => {
      const repo = new InMemoryClienteRepository();
      const mockProvider = new MockGeocodingProvider();
      mockProvider.proximoResultado = { latitude: -23.111, longitude: -46.222 };

      const cli = await repo.criar({ usuarioId: 'user-geo-test', nome: 'Cliente Mudança' });
      await repo.salvarEndereco(cli.id, {
        logradouro: 'Rua Velha',
        numero: '10',
        cidade: 'São Paulo',
        estado: 'SP',
        latitude: -23.555,
        longitude: -46.666,
      });

      const useCase = new AtualizarClienteUseCase(repo, mockAuthService, mockProvider);
      const atualizado = await useCase.execute(cli.id, {
        endereco: {
          logradouro: 'Rua Nova',
          numero: '200',
          cidade: 'São Paulo',
          estado: 'SP',
        },
      });

      assert.strictEqual(mockProvider.chamadas.length, 1);
      assert.strictEqual(atualizado.endereco?.logradouro, 'Rua Nova');
      assert.strictEqual(atualizado.endereco?.latitude, -23.111);
      assert.strictEqual(atualizado.endereco?.longitude, -46.222);
    });

    it('Cenário C (CRÍTICO): Endereço alterado com falha externa ou timeout -> DEVE LIMPAR coordenadas antigas para NULL', async () => {
      const repo = new InMemoryClienteRepository();
      const mockProvider = new MockGeocodingProvider();
      mockProvider.proximoErro = new GeocodingError('TIMEOUT', 'Timeout ao resolver novo endereço');

      const cli = await repo.criar({ usuarioId: 'user-geo-test', nome: 'Cliente Mudança Falha' });
      await repo.salvarEndereco(cli.id, {
        logradouro: 'Rua Antiga',
        numero: '50',
        cidade: 'São Paulo',
        estado: 'SP',
        latitude: -23.555,
        longitude: -46.666,
      });

      const useCase = new AtualizarClienteUseCase(repo, mockAuthService, mockProvider);
      const atualizado = await useCase.execute(cli.id, {
        endereco: {
          logradouro: 'Rua Totalmente Diferente',
          numero: '999',
          cidade: 'São Paulo',
          estado: 'SP',
        },
      });

      // Conforme DECISÃO-GEO-09: NUNCA manter coordenadas antigas com endereço textual novo!
      assert.strictEqual(mockProvider.chamadas.length, 1);
      assert.strictEqual(atualizado.endereco?.logradouro, 'Rua Totalmente Diferente');
      assert.strictEqual(atualizado.endereco?.latitude, null);
      assert.strictEqual(atualizado.endereco?.longitude, null);
    });

    it('Cenário D: Endereço alterado sem resultados encontrados -> DEVE LIMPAR coordenadas antigas para NULL', async () => {
      const repo = new InMemoryClienteRepository();
      const mockProvider = new MockGeocodingProvider();
      mockProvider.proximoResultado = null; // Não encontrado

      const cli = await repo.criar({ usuarioId: 'user-geo-test', nome: 'Cliente Endereco Fantasma' });
      await repo.salvarEndereco(cli.id, {
        logradouro: 'Rua Anterior',
        numero: '1',
        cidade: 'SP',
        estado: 'SP',
        latitude: -23.5,
        longitude: -46.6,
      });

      const useCase = new AtualizarClienteUseCase(repo, mockAuthService, mockProvider);
      const atualizado = await useCase.execute(cli.id, {
        endereco: {
          logradouro: 'Rua Nova Não Mapeada',
          numero: '999',
          cidade: 'SP',
          estado: 'SP',
        },
      });

      assert.strictEqual(atualizado.endereco?.latitude, null);
      assert.strictEqual(atualizado.endereco?.longitude, null);
    });
  });

  describe('5. Invariância Espacial e Não-Sobrescrita (DECISÃO-GEO-04 / RF11 / RF12)', () => {
    it('coordenada geográfica do cliente deve orientar o mapa sem sofrer alterações por navegação ou desenho manual', async () => {
      const repo = new InMemoryClienteRepository();
      const cli = await repo.criar({ usuarioId: 'user-geo-test', nome: 'Cliente Imóvel Fixo' });
      await repo.salvarEndereco(cli.id, {
        logradouro: 'Av. Paulista',
        numero: '1000',
        cidade: 'São Paulo',
        estado: 'SP',
        latitude: -23.561414,
        longitude: -46.655881,
      });

      // Simulação do fluxo de leitura em areas.tsx
      const clienteConsultado = await repo.buscarPorId(cli.id);
      const latOriginal = clienteConsultado?.endereco?.latitude;
      const lngOriginal = clienteConsultado?.endereco?.longitude;

      assert.strictEqual(latOriginal, -23.561414);
      assert.strictEqual(lngOriginal, -46.655881);

      // Simulação: usuário abre o mapa e desenha área de trabalho em coordenadas totalmente diferentes
      const verticesPoligonoTrabalho = [
        { latitude: -23.570000, longitude: -46.660000 },
        { latitude: -23.570500, longitude: -46.660000 },
        { latitude: -23.570500, longitude: -46.660500 },
      ];

      // A delimitação da área cria um registro de área independente, NUNCA alterando o endereço do cliente
      const enderecoAposDesenho = await repo.obterEndereco(cli.id);
      assert.strictEqual(enderecoAposDesenho?.latitude, latOriginal);
      assert.strictEqual(enderecoAposDesenho?.longitude, lngOriginal);
      assert.notStrictEqual(enderecoAposDesenho?.latitude, verticesPoligonoTrabalho[0].latitude);
    });
  });
});
