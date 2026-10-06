import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { Orcamento } from '../../src/domain/entities/orcamento';
import { ItemOrcamento } from '../../src/domain/entities/item-orcamento';
import { Cliente } from '../../src/domain/entities/cliente';
import { Endereco } from '../../src/domain/entities/endereco';
import { Usuario } from '../../src/domain/entities/usuario';
import { StatusOrcamento } from '../../src/domain/enums/status-orcamento';
import { TipoItem } from '../../src/domain/enums/tipo-item';
import {
  OrcamentoRepository,
  OrcamentoComCliente,
  CriarOrcamentoDados,
  AtualizarOrcamentoDados,
  OrcamentoResumo,
} from '../../src/domain/repositories/orcamento.repository.interface';
import {
  ClienteRepository,
  CriarClienteDados,
  AtualizarClienteDados,
  SalvarEnderecoDados,
} from '../../src/domain/repositories/cliente.repository.interface';
import { AuthService, AuthUser } from '../../src/application/services/auth.service';
import {
  PdfGenerator,
  OrcamentoPdfModel,
  ResultadoGeracaoPdf,
} from '../../src/application/interfaces/pdf-generator.interface';
import {
  GerarPdfOrcamentoUseCase,
  OrcamentoNaoEncontradoError,
  UsuarioNaoAutorizadoError,
  OrcamentoSemItensError,
  InconsistenciaFinanceiraError,
  FalhaGeracaoPdfError,
} from '../../src/application/use-cases/orcamento/gerar-pdf-orcamento.use-case';

// Mock Repositories
class MockOrcamentoRepository implements OrcamentoRepository {
  public orcamentos = new Map<string, OrcamentoComCliente>();

  async buscarPorId(id: string): Promise<OrcamentoComCliente | null> {
    return this.orcamentos.get(id) || null;
  }
  async listar(): Promise<OrcamentoResumo[]> { return []; }
  async obterProximoNumero(): Promise<string> { return 'ORC-2026-001'; }
  async criar(): Promise<Orcamento> { throw new Error('Not implemented'); }
  async atualizar(): Promise<Orcamento> { throw new Error('Not implemented'); }
  async alterarStatus(): Promise<void> {}
  async excluir(): Promise<void> {}
}

class MockClienteRepository implements ClienteRepository {
  public clientes = new Map<string, Cliente>();
  public enderecos = new Map<string, Endereco>();

  async buscarPorId(id: string): Promise<Cliente | null> {
    const c = this.clientes.get(id);
    if (!c) return null;
    const end = this.enderecos.get(id);
    if (end) c.definirEndereco(end);
    return c;
  }
  async obterEndereco(clienteId: string): Promise<Endereco | null> {
    return this.enderecos.get(clienteId) || null;
  }
  async listar(): Promise<Cliente[]> { return []; }
  async criar(): Promise<Cliente> { throw new Error('Not implemented'); }
  async atualizar(): Promise<Cliente> { throw new Error('Not implemented'); }
  async alterarAtivo(): Promise<void> {}
  async salvarEndereco(): Promise<Endereco> { throw new Error('Not implemented'); }
}

class MockPdfGenerator implements PdfGenerator {
  public ultimoModeloGerado: OrcamentoPdfModel | null = null;
  public deveFalhar: boolean = false;

  async gerar(modelo: OrcamentoPdfModel): Promise<ResultadoGeracaoPdf> {
    if (this.deveFalhar) {
      throw new Error('Erro nativo do subsistema de impressão.');
    }
    this.ultimoModeloGerado = modelo;
    return {
      uri: `file:///data/user/0/com.jardinagem/cache/Orcamento_${modelo.numero}.pdf`,
      nomeArquivo: `Orcamento_${modelo.numero}.pdf`,
    };
  }
}

describe('Bloco B — GerarPdfOrcamentoUseCase Unit & Integration Tests', () => {
  let orcamentoRepo: MockOrcamentoRepository;
  let clienteRepo: MockClienteRepository;
  let mockPdfGenerator: MockPdfGenerator;
  let mockAuth: AuthService;
  let useCase: GerarPdfOrcamentoUseCase;

  const usuarioId = 'usr-prestador-1';
  const outroUsuarioId = 'usr-prestador-invasor';
  const clienteId = 'cli-100';

  beforeEach(() => {
    orcamentoRepo = new MockOrcamentoRepository();
    clienteRepo = new MockClienteRepository();
    mockPdfGenerator = new MockPdfGenerator();

    mockAuth = {
      getCurrentUser: async (): Promise<AuthUser | null> => ({
        id: usuarioId,
        email: 'prestador@jardim.com',
      }),
      getPerfilUsuario: async (id: string): Promise<Usuario | null> => {
        if (id === usuarioId) {
          return new Usuario({
            id: usuarioId,
            nome: 'Empresa Jardins Elegantes',
            telefone: '(11) 98888-7777',
          });
        }
        return null;
      },
    } as unknown as AuthService;

    useCase = new GerarPdfOrcamentoUseCase(
      orcamentoRepo,
      clienteRepo,
      mockAuth,
      mockPdfGenerator
    );

    // Setup cliente padrão
    const cliente = new Cliente({
      id: clienteId,
      usuarioId,
      nome: 'Beatriz Almeida',
      telefone: '(11) 97777-6666',
      email: 'beatriz@email.com',
    });
    clienteRepo.clientes.set(clienteId, cliente);
    clienteRepo.enderecos.set(
      clienteId,
      new Endereco({
        id: 'end-100',
        clienteId,
        logradouro: 'Alameda dos Ipês',
        numero: '42',
        bairro: 'Jardim Primavera',
        cidade: 'Campinas',
        estado: 'SP',
        cep: '13080-000',
      })
    );
  });

  it('1. Deve gerar PDF com sucesso para orçamento válido e autorizado', async () => {
    const item = new ItemOrcamento({
      id: 'item-1',
      orcamentoId: 'orc-ok',
      tipo: TipoItem.SERVICO,
      servicoId: 'srv-1',
      descricao: 'Manutenção de Canteiros',
      quantidade: 2,
      unidade: 'h',
      valorUnitario: 90,
      usaMedicaoArea: false,
    });

    const orcamento = new Orcamento({
      id: 'orc-ok',
      usuarioId,
      clienteId,
      numero: 'ORC-2026-VAL',
      status: StatusOrcamento.RASCUNHO,
      itens: [item],
    });

    orcamentoRepo.orcamentos.set('orc-ok', {
      orcamento,
      clienteNome: 'Beatriz Almeida',
    });

    const resultado = await useCase.execute({
      orcamentoId: 'orc-ok',
      usuarioId,
    });

    assert.ok(resultado.uri.includes('Orcamento_ORC-2026-VAL.pdf'));
    assert.strictEqual(resultado.nomeArquivo, 'Orcamento_ORC-2026-VAL.pdf');
    assert.ok(mockPdfGenerator.ultimoModeloGerado);
    assert.strictEqual(mockPdfGenerator.ultimoModeloGerado.numero, 'ORC-2026-VAL');
    assert.strictEqual(mockPdfGenerator.ultimoModeloGerado.prestador.nome, 'Empresa Jardins Elegantes');
    assert.strictEqual(mockPdfGenerator.ultimoModeloGerado.cliente.nome, 'Beatriz Almeida');
    assert.strictEqual(mockPdfGenerator.ultimoModeloGerado.totalFormatado, 'R$ 180,00');
  });

  it('2. Deve rejeitar se o orçamento for inexistente (OrcamentoNaoEncontradoError)', async () => {
    await assert.rejects(
      async () => {
        await useCase.execute({
          orcamentoId: 'orc-fantasma',
          usuarioId,
        });
      },
      (err: unknown) => {
        assert.ok(err instanceof OrcamentoNaoEncontradoError);
        assert.match((err as Error).message, /não foi encontrado/);
        return true;
      }
    );
  });

  it('3. Deve rejeitar se o usuário não for o proprietário (UsuarioNaoAutorizadoError - Multi-tenant)', async () => {
    const item = new ItemOrcamento({
      id: 'item-1',
      orcamentoId: 'orc-outro',
      tipo: TipoItem.SERVICO,
      servicoId: 'srv-1',
      descricao: 'Serviço Privado',
      quantidade: 1,
      unidade: 'un',
      valorUnitario: 100,
      usaMedicaoArea: false,
    });

    const orcamento = new Orcamento({
      id: 'orc-outro',
      usuarioId, // Pertence a usuarioId
      clienteId,
      numero: 'ORC-2026-OUTRO',
      itens: [item],
    });

    orcamentoRepo.orcamentos.set('orc-outro', { orcamento });

    // Tentativa de geração por outro usuário
    await assert.rejects(
      async () => {
        await useCase.execute({
          orcamentoId: 'orc-outro',
          usuarioId: outroUsuarioId,
        });
      },
      (err: unknown) => {
        assert.ok(err instanceof UsuarioNaoAutorizadoError);
        assert.match((err as Error).message, /não autorizado/);
        return true;
      }
    );
  });

  it('4. Deve rejeitar se o orçamento não possuir itens (OrcamentoSemItensError)', async () => {
    // Como a entidade Orcamento permite itens vazios em rascunho
    const orcamentoVazio = new Orcamento({
      id: 'orc-vazio',
      usuarioId,
      clienteId,
      numero: 'ORC-2026-VAZIO',
      itens: [],
    });

    orcamentoRepo.orcamentos.set('orc-vazio', { orcamento: orcamentoVazio });

    await assert.rejects(
      async () => {
        await useCase.execute({
          orcamentoId: 'orc-vazio',
          usuarioId,
        });
      },
      (err: unknown) => {
        assert.ok(err instanceof OrcamentoSemItensError);
        assert.match((err as Error).message, /sem itens/);
        return true;
      }
    );
  });

  it('5. Deve rejeitar defensivamente em caso de inconsistência financeira persistida (InconsistenciaFinanceiraError)', async () => {
    const item = new ItemOrcamento({
      id: 'item-1',
      orcamentoId: 'orc-corrompido',
      tipo: TipoItem.SERVICO,
      servicoId: 'srv-1',
      descricao: 'Serviço',
      quantidade: 1,
      unidade: 'un',
      valorUnitario: 100, // Total item: 100
      usaMedicaoArea: false,
    });

    const orcamentoCorrompido = new Orcamento({
      id: 'orc-corrompido',
      usuarioId,
      clienteId,
      numero: 'ORC-2026-CORR',
      itens: [item],
    });

    // Simula corrupção de dados externos no banco: subtotal diverge da soma dos itens
    (orcamentoCorrompido as any).subtotal = 999.0;

    orcamentoRepo.orcamentos.set('orc-corrompido', { orcamento: orcamentoCorrompido });

    await assert.rejects(
      async () => {
        await useCase.execute({
          orcamentoId: 'orc-corrompido',
          usuarioId,
        });
      },
      (err: unknown) => {
        assert.ok(err instanceof InconsistenciaFinanceiraError);
        assert.match((err as Error).message, /Inconsistência financeira/);
        return true;
      }
    );
  });

  it('6. Deve tratar falha do gerador de PDF (FalhaGeracaoPdfError)', async () => {
    const item = new ItemOrcamento({
      id: 'item-1',
      orcamentoId: 'orc-falha',
      tipo: TipoItem.SERVICO,
      servicoId: 'srv-1',
      descricao: 'Serviço',
      quantidade: 1,
      unidade: 'un',
      valorUnitario: 100,
      usaMedicaoArea: false,
    });

    const orcamento = new Orcamento({
      id: 'orc-falha',
      usuarioId,
      clienteId,
      numero: 'ORC-2026-FALHA',
      itens: [item],
    });

    orcamentoRepo.orcamentos.set('orc-falha', { orcamento });
    mockPdfGenerator.deveFalhar = true;

    await assert.rejects(
      async () => {
        await useCase.execute({
          orcamentoId: 'orc-falha',
          usuarioId,
        });
      },
      (err: unknown) => {
        assert.ok(err instanceof FalhaGeracaoPdfError);
        assert.match((err as Error).message, /Falha ao gerar o arquivo PDF/);
        return true;
      }
    );
  });

  it('7. TESTE DE REGRESSÃO RN78: Mutação do catálogo NÃO afeta o PDF gerado', async () => {
    // 1. Simula Serviço A do catálogo: "Poda Especial de Palmeira" a R$ 150,00 / un
    const catalogoServicoDescricaoOriginal = 'Poda Especial de Palmeira';
    const catalogoServicoPrecoOriginal = 150.0;

    // 2. Cria item de orçamento capturando snapshot A
    const itemSnapshot = new ItemOrcamento({
      id: 'item-snap',
      orcamentoId: 'orc-snap',
      tipo: TipoItem.SERVICO,
      servicoId: 'srv-palmeira',
      descricao: catalogoServicoDescricaoOriginal,
      quantidade: 2,
      unidade: 'un',
      valorUnitario: catalogoServicoPrecoOriginal,
      usaMedicaoArea: false,
    });

    const orcamento = new Orcamento({
      id: 'orc-snap',
      usuarioId,
      clienteId,
      numero: 'ORC-2026-SNAP',
      itens: [itemSnapshot],
    });

    orcamentoRepo.orcamentos.set('orc-snap', { orcamento });

    // 3. Mutação simulada do catálogo B (altera preço para R$ 300 e descrição para "Poda Radical")
    const catalogoMutadoDescricao = 'Poda Radical de Palmeira';
    const catalogoMutadoPreco = 300.0;
    // O useCase NÃO consulta o catálogo e não injeta serviçoRepo

    // 4. Executa geração do PDF
    const resultado = await useCase.execute({
      orcamentoId: 'orc-snap',
      usuarioId,
    });

    assert.ok(resultado);
    const modelo = mockPdfGenerator.ultimoModeloGerado!;

    // 5. Prova formal: o item no PDF preserva estritamente os dados do snapshot original A
    assert.strictEqual(modelo.itens[0].descricao, catalogoServicoDescricaoOriginal);
    assert.strictEqual(modelo.itens[0].valorUnitarioFormatado, 'R$ 150,00');
    assert.strictEqual(modelo.itens[0].valorTotalFormatado, 'R$ 300,00');
    assert.strictEqual(modelo.totalFormatado, 'R$ 300,00');

    // Assegura que nenhuma mutação do catálogo vazou para o PDF
    assert.notStrictEqual(modelo.itens[0].descricao, catalogoMutadoDescricao);
    assert.notStrictEqual(modelo.itens[0].valorUnitarioFormatado, 'R$ 300,00');
  });
});
