import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import { Orcamento } from '../../src/domain/entities/orcamento';
import { ItemOrcamento } from '../../src/domain/entities/item-orcamento';
import { StatusOrcamento } from '../../src/domain/enums/status-orcamento';
import { TipoItem } from '../../src/domain/enums/tipo-item';
import {
  OrcamentoRepository,
  OrcamentoComCliente,
  CriarOrcamentoDados,
  AtualizarOrcamentoDados,
  OrcamentoResumo,
} from '../../src/domain/repositories/orcamento.repository.interface';
import { AuthService, AuthUser } from '../../src/application/services/auth.service';
import {
  ShareProvider,
  CompartilharArquivoParams,
  ResultadoCompartilhamento,
} from '../../src/application/interfaces/share-provider.interface';
import {
  GerarPdfOrcamentoUseCase,
  GerarPdfOrcamentoInput,
} from '../../src/application/use-cases/orcamento/gerar-pdf-orcamento.use-case';
import {
  CompartilharPdfOrcamentoUseCase,
  CompartilharPdfOrcamentoInput,
} from '../../src/application/use-cases/orcamento/compartilhar-pdf-orcamento.use-case';
import { ResultadoGeracaoPdf } from '../../src/application/interfaces/pdf-generator.interface';

// Mock MockShareProvider
class MockShareProvider implements ShareProvider {
  public isAvailableReturn: boolean = true;
  public arquivosExistentes: Map<string, boolean> = new Map();
  public ultimoParamsShare: CompartilharArquivoParams | null = null;
  public resultadoShare: ResultadoCompartilhamento = {
    sucesso: true,
    status: 'DISPARADO',
  };
  public shareCallCount: number = 0;
  public verificarArquivoExisteCallCount: number = 0;

  async isAvailable(): Promise<boolean> {
    return this.isAvailableReturn;
  }

  async verificarArquivoExiste(fileUri: string): Promise<boolean> {
    this.verificarArquivoExisteCallCount++;
    return this.arquivosExistentes.get(fileUri) ?? false;
  }

  async share(params: CompartilharArquivoParams): Promise<ResultadoCompartilhamento> {
    this.shareCallCount++;
    this.ultimoParamsShare = params;
    return this.resultadoShare;
  }
}

// Mock GerarPdfOrcamentoUseCase
class MockGerarPdfOrcamentoUseCase extends GerarPdfOrcamentoUseCase {
  public executeCallCount: number = 0;
  public ultimoInput: GerarPdfOrcamentoInput | null = null;
  public deveFalhar: boolean = false;
  public mensagemFalha: string = 'Falha no motor de compilação PDF';
  public uriRetorno: string = 'file:///data/user/0/com.jardinagem.app/cache/Print/new-generated-hash.pdf';

  constructor() {
    // Passa parâmetros nulos tipados para superclasse
    super(null as any, null as any, null as any, null as any);
  }

  override async execute(input: GerarPdfOrcamentoInput): Promise<ResultadoGeracaoPdf> {
    this.executeCallCount++;
    this.ultimoInput = input;
    if (this.deveFalhar) {
      throw new Error(this.mensagemFalha);
    }
    return {
      uri: this.uriRetorno,
      nomeArquivo: 'Orcamento_ORC-2026-001.pdf',
    };
  }
}

// Mock OrcamentoRepository
class MockOrcamentoRepository implements OrcamentoRepository {
  public orcamentos: Map<string, OrcamentoComCliente> = new Map();
  public alterarStatusCallCount: number = 0;

  async buscarPorId(id: string): Promise<OrcamentoComCliente | null> {
    return this.orcamentos.get(id) || null;
  }

  async alterarStatus(id: string, novoStatus: StatusOrcamento): Promise<void> {
    this.alterarStatusCallCount++;
    const o = this.orcamentos.get(id);
    if (o) {
      o.orcamento.status = novoStatus;
    }
  }

  async listar(): Promise<OrcamentoResumo[]> { return []; }
  async obterProximoNumero(): Promise<string> { return 'ORC-2026-001'; }
  async criar(_dados: CriarOrcamentoDados): Promise<Orcamento> { throw new Error('Not implemented'); }
  async atualizar(_id: string, _dados: AtualizarOrcamentoDados): Promise<Orcamento> { throw new Error('Not implemented'); }
  async excluir(_id: string): Promise<void> {}
}

describe('Bloco C — CompartilharPdfOrcamentoUseCase Unit & Integration Tests', () => {
  let mockShareProvider: MockShareProvider;
  let mockGerarPdfUseCase: MockGerarPdfOrcamentoUseCase;
  let mockOrcamentoRepo: MockOrcamentoRepository;
  let mockAuth: AuthService;
  let useCase: CompartilharPdfOrcamentoUseCase;

  const usuarioId = 'usr-prestador-1';
  const outroUsuarioId = 'usr-prestador-invasor';
  const orcamentoId = 'orc-valid-1';

  beforeEach(() => {
    mockShareProvider = new MockShareProvider();
    mockGerarPdfUseCase = new MockGerarPdfOrcamentoUseCase();
    mockOrcamentoRepo = new MockOrcamentoRepository();

    // Mock AuthService
    mockAuth = {
      getCurrentUser: async () => ({
        id: usuarioId,
        email: 'prestador@jardinagem.com.br',
      } as AuthUser),
      getPerfilUsuario: async () => null,
      signOut: async () => {},
      refreshSession: async () => {},
    } as unknown as AuthService;

    // Monta orçamento válido de teste
    const orc = new Orcamento({
      id: orcamentoId,
      usuarioId,
      clienteId: 'cli-001',
      numero: 'ORC-2026/001',
      status: StatusOrcamento.RASCUNHO,
      subtotal: 1500,
      total: 1500,
      valorDesconto: 0,
      dataCriacao: new Date('2026-10-01T10:00:00Z'),
      itens: [
        new ItemOrcamento({
          id: 'item-1',
          orcamentoId,
          tipo: TipoItem.SERVICO,
          servicoId: 'srv-001',
          descricao: 'Poda e Limpeza Geral',
          quantidade: 1,
          unidade: 'un',
          valorUnitario: 1500,
          valorTotal: 1500,
          usaMedicaoArea: false,
          areas: [],
        }),
      ],
    });

    mockOrcamentoRepo.orcamentos.set(orcamentoId, {
      orcamento: orc,
      clienteNome: 'Maria Silva',
      clienteTelefone: '11999998888',
      clienteEmail: 'maria@email.com',
    });

    useCase = new CompartilharPdfOrcamentoUseCase(
      mockShareProvider,
      mockGerarPdfUseCase,
      mockOrcamentoRepo,
      mockAuth
    );
  });

  // 1. Não autenticado
  it('1. Deve rejeitar se o usuário não estiver autenticado (getCurrentUser nulo)', async () => {
    mockAuth.getCurrentUser = async () => null;

    const res = await useCase.execute({
      orcamentoId,
      usuarioId,
    });

    assert.strictEqual(res.sucesso, false);
    assert.strictEqual(res.status, 'ERRO');
    assert.match(res.mensagem || '', /Acesso não autorizado|Usuário não autenticado/);
    assert.strictEqual(mockShareProvider.shareCallCount, 0);
    assert.strictEqual(mockGerarPdfUseCase.executeCallCount, 0);
  });

  // 2. usuarioId divergente
  it('2. Deve rejeitar se o usuarioId de entrada divergir do usuário da sessão autenticada', async () => {
    const res = await useCase.execute({
      orcamentoId,
      usuarioId: outroUsuarioId,
    });

    assert.strictEqual(res.sucesso, false);
    assert.strictEqual(res.status, 'ERRO');
    assert.match(res.mensagem || '', /Acesso não autorizado/);
    assert.strictEqual(mockShareProvider.shareCallCount, 0);
  });

  // 3. Orçamento inexistente
  it('3. Deve rejeitar se o orçamento informado não existir no repositório', async () => {
    const res = await useCase.execute({
      orcamentoId: 'orc-fantasma-999',
      usuarioId,
    });

    assert.strictEqual(res.sucesso, false);
    assert.strictEqual(res.status, 'ERRO');
    assert.match(res.mensagem || '', /Orçamento não encontrado/);
    assert.strictEqual(mockShareProvider.shareCallCount, 0);
  });

  // 4. Orçamento de outro tenant
  it('4. Deve rejeitar o compartilhamento se o orçamento pertencer a outro usuário (Tenant Isolation)', async () => {
    const orcInvasor = new Orcamento({
      id: 'orc-invasor-2',
      usuarioId: outroUsuarioId,
      clienteId: 'cli-002',
      numero: 'ORC-2026-999',
      status: StatusOrcamento.RASCUNHO,
      subtotal: 500,
      total: 500,
      valorDesconto: 0,
      dataCriacao: new Date(),
      itens: [],
    });

    mockOrcamentoRepo.orcamentos.set('orc-invasor-2', {
      orcamento: orcInvasor,
    });

    const res = await useCase.execute({
      orcamentoId: 'orc-invasor-2',
      usuarioId,
    });

    assert.strictEqual(res.sucesso, false);
    assert.strictEqual(res.status, 'ERRO');
    assert.match(res.mensagem || '', /não pertencente ao usuário/);
    assert.strictEqual(mockShareProvider.shareCallCount, 0);
  });

  // 5. URI válida existente (Cenário A - Reutilização byte-idêntica)
  it('5. Deve reutilizar arquivo em cache existente sem acionar o gerador (Cenário A)', async () => {
    const uriCacheValida = 'file:///data/user/0/com.jardinagem.app/cache/Print/hash-existente.pdf';
    mockShareProvider.arquivosExistentes.set(uriCacheValida, true);

    const res = await useCase.execute({
      orcamentoId,
      usuarioId,
      fileUriExistente: uriCacheValida,
    });

    assert.strictEqual(res.sucesso, true);
    assert.strictEqual(res.status, 'DISPARADO');
    assert.strictEqual(mockGerarPdfUseCase.executeCallCount, 0, 'Gerador NÃO deve ser chamado');
    assert.strictEqual(mockShareProvider.shareCallCount, 1);
    assert.strictEqual(mockShareProvider.ultimoParamsShare?.fileUri, uriCacheValida);
    assert.strictEqual(mockShareProvider.ultimoParamsShare?.nomeArquivo, 'Orcamento_ORC-2026_001.pdf');
  });

  // 6. URI inexistente no cache (Cenário B - Regeneração transparente)
  it('6. Deve regenerar via Bloco B quando a URI informada não existir fisicamente no cache', async () => {
    const uriCacheInexistente = 'file:///data/user/0/com.jardinagem.app/cache/Print/hash-sumiu.pdf';
    mockShareProvider.arquivosExistentes.set(uriCacheInexistente, false);

    const res = await useCase.execute({
      orcamentoId,
      usuarioId,
      fileUriExistente: uriCacheInexistente,
    });

    assert.strictEqual(res.sucesso, true);
    assert.strictEqual(res.status, 'DISPARADO');
    assert.strictEqual(mockGerarPdfUseCase.executeCallCount, 1, 'Deve regenerar');
    assert.strictEqual(mockShareProvider.shareCallCount, 1);
    assert.strictEqual(mockShareProvider.ultimoParamsShare?.fileUri, mockGerarPdfUseCase.uriRetorno);
  });

  // 7. Ausência de URI de entrada
  it('7. Deve regenerar via Bloco B quando nenhuma fileUriExistente for informada', async () => {
    const res = await useCase.execute({
      orcamentoId,
      usuarioId,
    });

    assert.strictEqual(res.sucesso, true);
    assert.strictEqual(res.status, 'DISPARADO');
    assert.strictEqual(mockGerarPdfUseCase.executeCallCount, 1);
    assert.strictEqual(mockShareProvider.shareCallCount, 1);
  });

  // 8. Regeneração transparente
  it('8. Deve validar parâmetros passados ao gerador durante regeneração transparente', async () => {
    await useCase.execute({
      orcamentoId,
      usuarioId,
    });

    assert.strictEqual(mockGerarPdfUseCase.ultimoInput?.orcamentoId, orcamentoId);
    assert.strictEqual(mockGerarPdfUseCase.ultimoInput?.usuarioId, usuarioId);
  });

  // 9. Falha de regeneração
  it('9. Deve tratar e retornar status ERRO caso o gerador do Bloco B falhe na regeneração', async () => {
    mockGerarPdfUseCase.deveFalhar = true;
    mockGerarPdfUseCase.mensagemFalha = 'WebView crash na compilação';

    const res = await useCase.execute({
      orcamentoId,
      usuarioId,
    });

    assert.strictEqual(res.sucesso, false);
    assert.strictEqual(res.status, 'ERRO');
    assert.match(res.mensagem || '', /Falha ao gerar o documento PDF.*WebView crash/);
    assert.strictEqual(mockShareProvider.shareCallCount, 0);
  });

  // 10. Retorno DISPARADO
  it('10. Deve retornar sucesso true e status DISPARADO quando o provider conclui com sucesso', async () => {
    mockShareProvider.resultadoShare = {
      sucesso: true,
      status: 'DISPARADO',
    };

    const res = await useCase.execute({
      orcamentoId,
      usuarioId,
    });

    assert.strictEqual(res.sucesso, true);
    assert.strictEqual(res.status, 'DISPARADO');
  });

  // 11. Indisponibilidade
  it('11. Deve repassar status INDISPONIVEL caso o provider informe ausência de capacidade', async () => {
    mockShareProvider.resultadoShare = {
      sucesso: false,
      status: 'INDISPONIVEL',
      mensagem: 'Nenhum aplicativo compatível encontrado.',
    };

    const res = await useCase.execute({
      orcamentoId,
      usuarioId,
    });

    assert.strictEqual(res.sucesso, false);
    assert.strictEqual(res.status, 'INDISPONIVEL');
    assert.strictEqual(res.mensagem, 'Nenhum aplicativo compatível encontrado.');
  });

  // 12. Erro técnico no provider
  it('12. Deve repassar status ERRO quando o provider retornar falha técnica', async () => {
    mockShareProvider.resultadoShare = {
      sucesso: false,
      status: 'ERRO',
      mensagem: 'Falha técnica ao acionar Intent.',
    };

    const res = await useCase.execute({
      orcamentoId,
      usuarioId,
    });

    assert.strictEqual(res.sucesso, false);
    assert.strictEqual(res.status, 'ERRO');
    assert.strictEqual(res.mensagem, 'Falha técnica ao acionar Intent.');
  });

  // 13. URI fora do cache (ACHADO-SHARE-10)
  it('13. Deve descartar URI externa fora do cache e acionar regeneração segura', async () => {
    const uriExterna = 'file:///storage/emulated/0/Download/arquivo_arbitrario.pdf';
    // O mock provider rejeita existência de arquivos fora do cache
    mockShareProvider.arquivosExistentes.set(uriExterna, false);

    const res = await useCase.execute({
      orcamentoId,
      usuarioId,
      fileUriExistente: uriExterna,
    });

    assert.strictEqual(res.sucesso, true);
    assert.strictEqual(mockGerarPdfUseCase.executeCallCount, 1, 'Deve regenerar ao invés de usar URI externa');
    assert.strictEqual(mockShareProvider.ultimoParamsShare?.fileUri, mockGerarPdfUseCase.uriRetorno);
  });

  // 14. URI não file://
  it('14. Deve rejeitar URI sem esquema file:// e acionar regeneração segura', async () => {
    const uriInvalida = 'https://site-malicioso.com/documento.pdf';

    const res = await useCase.execute({
      orcamentoId,
      usuarioId,
      fileUriExistente: uriInvalida,
    });

    assert.strictEqual(res.sucesso, true);
    assert.strictEqual(mockGerarPdfUseCase.executeCallCount, 1, 'Deve regenerar');
    assert.strictEqual(mockShareProvider.verificarArquivoExisteCallCount, 0, 'Nem deve consultar verificação física');
  });

  // 15. URI não PDF
  it('15. Deve rejeitar URI de arquivo que não seja extensão .pdf e acionar regeneração segura', async () => {
    const uriNaoPdf = 'file:///data/user/0/com.jardinagem.app/cache/script.sh';

    const res = await useCase.execute({
      orcamentoId,
      usuarioId,
      fileUriExistente: uriNaoPdf,
    });

    assert.strictEqual(res.sucesso, true);
    assert.strictEqual(mockGerarPdfUseCase.executeCallCount, 1, 'Deve regenerar');
    assert.strictEqual(mockShareProvider.verificarArquivoExisteCallCount, 0);
  });

  // 16. Status do orçamento permanece rigorosamente inalterado
  it('16. Status comercial do orçamento NÃO deve sofrer alteração após o compartilhamento', async () => {
    const orcAntes = (await mockOrcamentoRepo.buscarPorId(orcamentoId))?.orcamento;
    assert.strictEqual(orcAntes?.status, StatusOrcamento.RASCUNHO);

    await useCase.execute({
      orcamentoId,
      usuarioId,
    });

    const orcDepois = (await mockOrcamentoRepo.buscarPorId(orcamentoId))?.orcamento;
    assert.strictEqual(orcDepois?.status, StatusOrcamento.RASCUNHO);
    assert.strictEqual(mockOrcamentoRepo.alterarStatusCallCount, 0, 'Nenhuma chamada de alteração de status');
  });

  // 17. Gerador não é chamado quando arquivo já existe
  it('17. Garantir que o gerador tem zero execuções quando arquivo em cache for válido', async () => {
    const uriExistente = 'file:///data/user/0/com.jardinagem.app/cache/Print/item-cache.pdf';
    mockShareProvider.arquivosExistentes.set(uriExistente, true);

    await useCase.execute({
      orcamentoId,
      usuarioId,
      fileUriExistente: uriExistente,
    });

    assert.strictEqual(mockGerarPdfUseCase.executeCallCount, 0);
    assert.strictEqual(mockShareProvider.shareCallCount, 1);
  });

  // Pureza Arquitetural
  it('18. PUREZA ARQUITETURAL: CompartilharPdfOrcamentoUseCase não deve importar nenhum SDK nativo ou Expo', () => {
    const caminhoArquivo = path.resolve(
      __dirname,
      '../../src/application/use-cases/orcamento/compartilhar-pdf-orcamento.use-case.ts'
    );
    const conteudo = fs.readFileSync(caminhoArquivo, 'utf-8');

    assert.ok(!conteudo.includes('expo-sharing'), 'Não deve importar expo-sharing na Application');
    assert.ok(!conteudo.includes('expo-file-system'), 'Não deve importar expo-file-system na Application');
    assert.ok(!conteudo.includes('expo-intent-launcher'), 'Não deve importar expo-intent-launcher na Application');
    assert.ok(!conteudo.includes('react-native'), 'Não deve importar react-native na Application');
  });
});
