import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { Orcamento } from '../../src/domain/entities/orcamento';
import { ItemOrcamento } from '../../src/domain/entities/item-orcamento';
import { Cliente } from '../../src/domain/entities/cliente';
import { StatusOrcamento } from '../../src/domain/enums/status-orcamento';
import { TipoDesconto } from '../../src/domain/enums/tipo-desconto';
import { TipoItem } from '../../src/domain/enums/tipo-item';
import { RegraNegocioError, TransicaoInvalidaError, ValidacaoEnvioError } from '../../src/domain/errors/dominio-error';
import {
  OrcamentoRepository,
  CriarOrcamentoDados,
  AtualizarOrcamentoDados,
  OrcamentoResumo,
  OrcamentoComCliente,
} from '../../src/domain/repositories/orcamento.repository.interface';
import {
  ItemOrcamentoRepository,
  CriarItemOrcamentoDados,
  AtualizarItemOrcamentoDados,
} from '../../src/domain/repositories/item-orcamento.repository.interface';
import { ClienteRepository, CriarClienteDados, AtualizarClienteDados, SalvarEnderecoDados } from '../../src/domain/repositories/cliente.repository.interface';
import {
  ListarOrcamentosUseCase,
  ObterOrcamentoUseCase,
  CriarOrcamentoUseCase,
  AtualizarOrcamentoUseCase,
  DuplicarOrcamentoUseCase,
  AlterarStatusOrcamentoUseCase,
  ExcluirOrcamentoUseCase,
} from '../../src/application/use-cases/orcamento';

/**
 * Mocks em memória para os repositórios nos testes de caso de uso.
 */
class InMemoryClienteRepository implements ClienteRepository {
  public clientes: Map<string, Cliente> = new Map();

  async listar(usuarioId: string): Promise<Cliente[]> {
    return Array.from(this.clientes.values()).filter((c) => c.usuarioId === usuarioId);
  }
  async buscarPorId(id: string): Promise<Cliente | null> {
    return this.clientes.get(id) ?? null;
  }
  async criar(dados: CriarClienteDados): Promise<Cliente> {
    const id = `cli-${Math.random().toString(36).substring(2, 7)}`;
    const novo = new Cliente({
      id,
      usuarioId: dados.usuarioId,
      nome: dados.nome,
      telefone: dados.telefone,
      email: dados.email,
      documento: dados.documento,
      observacoes: dados.observacoes,
      ativo: dados.ativo ?? true,
    });
    this.clientes.set(id, novo);
    return novo;
  }
  async atualizar(id: string, dados: AtualizarClienteDados): Promise<Cliente> {
    const cl = this.clientes.get(id);
    if (!cl) throw new Error('Cliente não encontrado.');
    if (dados.nome !== undefined) cl.nome = dados.nome;
    return cl;
  }
  async alterarAtivo(id: string, ativo: boolean): Promise<void> {
    const cl = this.clientes.get(id);
    if (cl) cl.ativo = ativo;
  }
  async obterEndereco(): Promise<any> {
    return null;
  }
  async salvarEndereco(): Promise<any> {
    return null;
  }
}

class InMemoryItemOrcamentoRepository implements ItemOrcamentoRepository {
  public itens: Map<string, ItemOrcamento> = new Map();

  async listarPorOrcamento(orcamentoId: string): Promise<ItemOrcamento[]> {
    return Array.from(this.itens.values()).filter((it) => it.orcamentoId === orcamentoId);
  }
  async buscarPorId(id: string): Promise<ItemOrcamento | null> {
    return this.itens.get(id) ?? null;
  }
  async criar(dados: CriarItemOrcamentoDados): Promise<ItemOrcamento> {
    const id = dados.id || `item-${Math.random().toString(36).substring(2, 7)}`;
    const novo = new ItemOrcamento({
      id,
      orcamentoId: dados.orcamentoId,
      tipo: dados.tipo,
      servicoId: dados.servicoId,
      produtoId: dados.produtoId,
      descricao: dados.descricao,
      quantidade: dados.quantidade,
      unidade: dados.unidade,
      valorUnitario: dados.valorUnitario,
      valorTotal: dados.valorTotal,
      usaMedicaoArea: dados.usaMedicaoArea,
      areas: [],
    });
    this.itens.set(id, novo);
    return novo;
  }
  async atualizar(id: string, dados: AtualizarItemOrcamentoDados): Promise<ItemOrcamento> {
    const it = this.itens.get(id);
    if (!it) throw new Error('Item não encontrado.');
    if (dados.descricao !== undefined) it.descricao = dados.descricao;
    if (dados.quantidade !== undefined) it.quantidade = dados.quantidade;
    if (dados.valorUnitario !== undefined) it.valorUnitario = dados.valorUnitario;
    if (dados.valorTotal !== undefined) it.valorTotal = dados.valorTotal;
    return it;
  }
  async excluir(id: string): Promise<void> {
    this.itens.delete(id);
  }
}

class InMemoryOrcamentoRepository implements OrcamentoRepository {
  public orcamentos: Map<string, Orcamento> = new Map();
  public clientesRef: InMemoryClienteRepository;
  public itensRef: InMemoryItemOrcamentoRepository;
  public seqCounter = 0;

  constructor(clientesRef: InMemoryClienteRepository, itensRef: InMemoryItemOrcamentoRepository) {
    this.clientesRef = clientesRef;
    this.itensRef = itensRef;
  }

  async listar(usuarioId: string, filtroStatus?: StatusOrcamento): Promise<OrcamentoResumo[]> {
    const lista: OrcamentoResumo[] = [];
    for (const o of this.orcamentos.values()) {
      if (o.usuarioId === usuarioId) {
        if (!filtroStatus || o.status === filtroStatus) {
          const cli = this.clientesRef.clientes.get(o.clienteId);
          lista.push({
            id: o.id,
            usuarioId: o.usuarioId,
            clienteId: o.clienteId,
            clienteNome: cli?.nome ?? 'Cliente Teste',
            numero: o.numero,
            dataCriacao: o.dataCriacao,
            dataValidade: o.dataValidade,
            status: o.status,
            subtotal: o.subtotal,
            tipoDesconto: o.tipoDesconto,
            valorDesconto: o.valorDesconto,
            total: o.total,
            totalItens: o.itens.length,
          });
        }
      }
    }
    return lista.sort((a, b) => b.dataCriacao.getTime() - a.dataCriacao.getTime());
  }

  async buscarPorId(id: string): Promise<OrcamentoComCliente | null> {
    const o = this.orcamentos.get(id);
    if (!o) return null;
    const cli = this.clientesRef.clientes.get(o.clienteId);
    const itens = await this.itensRef.listarPorOrcamento(id);
    if (itens.length > 0) {
      (o as any)._itens = itens;
      o.recalcularValores();
    }
    return {
      orcamento: o,
      clienteNome: cli?.nome,
      clienteTelefone: cli?.telefone,
      clienteEmail: cli?.email,
    };
  }

  async obterProximoNumero(usuarioId: string): Promise<string> {
    this.seqCounter++;
    return `ORC-2026-${String(this.seqCounter).padStart(3, '0')}`;
  }

  async criar(dados: CriarOrcamentoDados): Promise<Orcamento> {
    const id = `orc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const numero = dados.numero || (await this.obterProximoNumero(dados.usuarioId));
    const novo = new Orcamento({
      id,
      usuarioId: dados.usuarioId,
      clienteId: dados.clienteId,
      numero,
      dataCriacao: new Date(),
      dataValidade: dados.dataValidade ?? null,
      status: StatusOrcamento.RASCUNHO,
      tipoDesconto: dados.tipoDesconto ?? null,
      valorDesconto: dados.valorDesconto ?? 0,
      observacoes: dados.observacoes ?? null,
      condicoesPagamento: dados.condicoesPagamento ?? null,
      itens: [],
    });
    this.orcamentos.set(id, novo);
    return novo;
  }

  async atualizar(id: string, dados: AtualizarOrcamentoDados): Promise<Orcamento> {
    const o = this.orcamentos.get(id);
    if (!o) throw new Error('Orçamento não encontrado.');
    if (dados.clienteId !== undefined) (o as any).clienteId = dados.clienteId;
    if (dados.dataValidade !== undefined) o.dataValidade = dados.dataValidade;
    if (dados.tipoDesconto !== undefined) o.tipoDesconto = dados.tipoDesconto;
    if (dados.valorDesconto !== undefined) o.valorDesconto = dados.valorDesconto;
    if (dados.subtotal !== undefined) o.subtotal = dados.subtotal;
    if (dados.total !== undefined) o.total = dados.total;
    if (dados.observacoes !== undefined) o.observacoes = dados.observacoes;
    if (dados.condicoesPagamento !== undefined) o.condicoesPagamento = dados.condicoesPagamento;
    return o;
  }

  async alterarStatus(id: string, novoStatus: StatusOrcamento): Promise<void> {
    const o = this.orcamentos.get(id);
    if (o) o.status = novoStatus;
  }

  async excluir(id: string): Promise<void> {
    this.orcamentos.delete(id);
  }
}

describe('Casos de Uso — Módulo de Orçamentos v1.0', () => {
  const USER_ID = 'user-auth-123';
  let clienteRepo: InMemoryClienteRepository;
  let itemRepo: InMemoryItemOrcamentoRepository;
  let orcamentoRepo: InMemoryOrcamentoRepository;
  let clienteValido: Cliente;

  beforeEach(async () => {
    clienteRepo = new InMemoryClienteRepository();
    itemRepo = new InMemoryItemOrcamentoRepository();
    orcamentoRepo = new InMemoryOrcamentoRepository(clienteRepo, itemRepo);

    clienteValido = await clienteRepo.criar({
      usuarioId: USER_ID,
      nome: 'Empresa Alpha Jardins',
      telefone: '(11) 98888-7777',
      email: 'alpha@jardins.com',
    });
  });

  describe('CriarOrcamentoUseCase', () => {
    it('deve criar orçamento com sucesso no status RASCUNHO com valores zerados', async () => {
      const useCase = new CriarOrcamentoUseCase(orcamentoRepo, clienteRepo);
      const orc = await useCase.execute({
        usuarioId: USER_ID,
        clienteId: clienteValido.id,
      });

      assert.ok(orc.id);
      assert.strictEqual(orc.usuarioId, USER_ID);
      assert.strictEqual(orc.clienteId, clienteValido.id);
      assert.strictEqual(orc.status, StatusOrcamento.RASCUNHO);
      assert.strictEqual(orc.subtotal, 0);
      assert.strictEqual(orc.total, 0);
      assert.strictEqual(orc.itens.length, 0);
      assert.strictEqual(orc.editavel, true);
    });

    it('deve rejeitar criação se cliente informado não existir ou pertencer a outro usuário', async () => {
      const useCase = new CriarOrcamentoUseCase(orcamentoRepo, clienteRepo);
      await assert.rejects(
        async () => {
          await useCase.execute({
            usuarioId: USER_ID,
            clienteId: 'cliente-inexistente',
          });
        },
        (err: Error) => {
          assert.ok(err instanceof RegraNegocioError);
          assert.match(err.message, /O cliente informado não existe ou não pertence ao usuário/);
          return true;
        }
      );
    });

    it('deve rejeitar criação quando usuário não autenticado', async () => {
      const useCase = new CriarOrcamentoUseCase(orcamentoRepo, clienteRepo);
      await assert.rejects(
        async () => {
          await useCase.execute({
            usuarioId: '',
            clienteId: clienteValido.id,
          });
        },
        (err: Error) => {
          assert.match(err.message, /Usuário não autenticado/);
          return true;
        }
      );
    });

    it('deve rejeitar data de validade anterior à data de criação', async () => {
      const useCase = new CriarOrcamentoUseCase(orcamentoRepo, clienteRepo);
      const ontem = new Date();
      ontem.setDate(ontem.getDate() - 1);

      await assert.rejects(
        async () => {
          await useCase.execute({
            usuarioId: USER_ID,
            clienteId: clienteValido.id,
            dataValidade: ontem,
          });
        },
        (err: Error) => {
          assert.ok(err instanceof RegraNegocioError);
          assert.match(err.message, /A data de validade não pode ser anterior à data de criação/);
          return true;
        }
      );
    });
  });

  describe('AtualizarOrcamentoUseCase', () => {
    it('deve permitir atualizar dados e aplicar desconto percentual em RASCUNHO', async () => {
      const criarUc = new CriarOrcamentoUseCase(orcamentoRepo, clienteRepo);
      const atualizarUc = new AtualizarOrcamentoUseCase(orcamentoRepo, clienteRepo);

      const orc = await criarUc.execute({
        usuarioId: USER_ID,
        clienteId: clienteValido.id,
      });

      const orcAtualizado = await atualizarUc.execute({
        id: orc.id,
        usuarioId: USER_ID,
        observacoes: 'Serviço aos finais de semana',
        tipoDesconto: TipoDesconto.PERCENTUAL,
        valorDesconto: 10,
      });

      assert.strictEqual(orcAtualizado.observacoes, 'Serviço aos finais de semana');
      assert.strictEqual(orcAtualizado.tipoDesconto, TipoDesconto.PERCENTUAL);
      assert.strictEqual(orcAtualizado.valorDesconto, 10);
    });

    it('deve bloquear qualquer edição direta caso orçamento não esteja em RASCUNHO (RN64, RN65)', async () => {
      const criarUc = new CriarOrcamentoUseCase(orcamentoRepo, clienteRepo);
      const atualizarUc = new AtualizarOrcamentoUseCase(orcamentoRepo, clienteRepo);

      const orc = await criarUc.execute({
        usuarioId: USER_ID,
        clienteId: clienteValido.id,
      });

      // Altera diretamente o status para simular proposta enviada
      orc.status = StatusOrcamento.ENVIADO;

      await assert.rejects(
        async () => {
          await atualizarUc.execute({
            id: orc.id,
            usuarioId: USER_ID,
            observacoes: 'Tentativa de edição de orçamento enviado',
          });
        },
        (err: Error) => {
          assert.ok(err instanceof RegraNegocioError);
          assert.match(err.message, /não podem ser editados diretamente/);
          return true;
        }
      );
    });

    it('deve rejeitar desconto percentual maior que 100%', async () => {
      const criarUc = new CriarOrcamentoUseCase(orcamentoRepo, clienteRepo);
      const atualizarUc = new AtualizarOrcamentoUseCase(orcamentoRepo, clienteRepo);

      const orc = await criarUc.execute({
        usuarioId: USER_ID,
        clienteId: clienteValido.id,
      });

      await assert.rejects(
        async () => {
          await atualizarUc.execute({
            id: orc.id,
            usuarioId: USER_ID,
            tipoDesconto: TipoDesconto.PERCENTUAL,
            valorDesconto: 150,
          });
        },
        (err: Error) => {
          assert.ok(err instanceof RegraNegocioError);
          assert.match(err.message, /Desconto percentual deve estar entre 0% e 100%/);
          return true;
        }
      );
    });

    it('deve rejeitar desconto fixo maior que o subtotal', async () => {
      const criarUc = new CriarOrcamentoUseCase(orcamentoRepo, clienteRepo);
      const atualizarUc = new AtualizarOrcamentoUseCase(orcamentoRepo, clienteRepo);

      const orc = await criarUc.execute({
        usuarioId: USER_ID,
        clienteId: clienteValido.id,
      });

      // Subtotal é 0 no início
      await assert.rejects(
        async () => {
          await atualizarUc.execute({
            id: orc.id,
            usuarioId: USER_ID,
            tipoDesconto: TipoDesconto.FIXO,
            valorDesconto: 100,
          });
        },
        (err: Error) => {
          assert.ok(err instanceof RegraNegocioError);
          assert.match(err.message, /Desconto de valor fixo/);
          return true;
        }
      );
    });
  });

  describe('AlterarStatusOrcamentoUseCase', () => {
    it('deve transitar fluxo completo: RASCUNHO -> ENVIADO -> EM_ANALISE -> APROVADO -> CONCLUIDO', async () => {
      const criarUc = new CriarOrcamentoUseCase(orcamentoRepo, clienteRepo);
      const alterarStatusUc = new AlterarStatusOrcamentoUseCase(orcamentoRepo);

      const orc = await criarUc.execute({
        usuarioId: USER_ID,
        clienteId: clienteValido.id,
        dataValidade: new Date(2028, 11, 31),
      });

      // Adiciona um item para permitir envio
      orc.adicionarItem(
        new ItemOrcamento({
          id: 'item-1',
          orcamentoId: orc.id,
          tipo: TipoItem.PRODUTO,
          produtoId: 'prod-1',
          descricao: 'Muda de Palmeira',
          quantidade: 2,
          unidade: 'un',
          valorUnitario: 50,
          usaMedicaoArea: false,
        })
      );

      // 1. RASCUNHO -> ENVIADO
      await alterarStatusUc.execute({ id: orc.id, usuarioId: USER_ID, novoStatus: StatusOrcamento.ENVIADO });
      assert.strictEqual(orc.status, StatusOrcamento.ENVIADO);
      assert.strictEqual(orc.editavel, false);

      // 2. ENVIADO -> EM_ANALISE
      await alterarStatusUc.execute({ id: orc.id, usuarioId: USER_ID, novoStatus: StatusOrcamento.EM_ANALISE });
      assert.strictEqual(orc.status, StatusOrcamento.EM_ANALISE);

      // 3. EM_ANALISE -> APROVADO
      await alterarStatusUc.execute({ id: orc.id, usuarioId: USER_ID, novoStatus: StatusOrcamento.APROVADO });
      assert.strictEqual(orc.status, StatusOrcamento.APROVADO);

      // 4. APROVADO -> CONCLUIDO
      await alterarStatusUc.execute({ id: orc.id, usuarioId: USER_ID, novoStatus: StatusOrcamento.CONCLUIDO });
      assert.strictEqual(orc.status, StatusOrcamento.CONCLUIDO);
    });

    it('deve reprovar envio se orçamento não possuir itens ou validade (RN58, RN59)', async () => {
      const criarUc = new CriarOrcamentoUseCase(orcamentoRepo, clienteRepo);
      const alterarStatusUc = new AlterarStatusOrcamentoUseCase(orcamentoRepo);

      // Orçamento sem itens e sem validade
      const orc = await criarUc.execute({
        usuarioId: USER_ID,
        clienteId: clienteValido.id,
      });

      await assert.rejects(
        async () => {
          await alterarStatusUc.execute({ id: orc.id, usuarioId: USER_ID, novoStatus: StatusOrcamento.ENVIADO });
        },
        (err: Error) => {
          assert.ok(err instanceof ValidacaoEnvioError);
          return true;
        }
      );
    });

    it('deve bloquear transições proibidas (ENVIADO -> RASCUNHO, CONCLUIDO -> RASCUNHO, RECUSADO -> APROVADO)', async () => {
      const criarUc = new CriarOrcamentoUseCase(orcamentoRepo, clienteRepo);
      const alterarStatusUc = new AlterarStatusOrcamentoUseCase(orcamentoRepo);

      const orc = await criarUc.execute({
        usuarioId: USER_ID,
        clienteId: clienteValido.id,
        dataValidade: new Date(2028, 11, 31),
      });

      orc.adicionarItem(
        new ItemOrcamento({
          id: 'item-1',
          orcamentoId: orc.id,
          tipo: TipoItem.PRODUTO,
          produtoId: 'prod-1',
          descricao: 'Terra Vegetal',
          quantidade: 5,
          unidade: 'saco',
          valorUnitario: 20,
          usaMedicaoArea: false,
        })
      );

      await alterarStatusUc.execute({ id: orc.id, usuarioId: USER_ID, novoStatus: StatusOrcamento.ENVIADO });

      // Proibido: ENVIADO -> RASCUNHO
      await assert.rejects(
        async () => {
          await alterarStatusUc.execute({ id: orc.id, usuarioId: USER_ID, novoStatus: StatusOrcamento.RASCUNHO });
        },
        (err: Error) => {
          assert.ok(err instanceof TransicaoInvalidaError);
          return true;
        }
      );
    });

    it('deve permitir cancelar a partir de RASCUNHO, ENVIADO e EM_ANALISE', async () => {
      const criarUc = new CriarOrcamentoUseCase(orcamentoRepo, clienteRepo);
      const alterarStatusUc = new AlterarStatusOrcamentoUseCase(orcamentoRepo);

      const orc = await criarUc.execute({
        usuarioId: USER_ID,
        clienteId: clienteValido.id,
      });

      await alterarStatusUc.execute({ id: orc.id, usuarioId: USER_ID, novoStatus: StatusOrcamento.CANCELADO });
      assert.strictEqual(orc.status, StatusOrcamento.CANCELADO);
    });
  });

  describe('DuplicarOrcamentoUseCase', () => {
    it('deve gerar nova proposta independente em RASCUNHO preservando dados e snapshots (RN72 a RN77)', async () => {
      const criarUc = new CriarOrcamentoUseCase(orcamentoRepo, clienteRepo);
      const duplicarUc = new DuplicarOrcamentoUseCase(orcamentoRepo, itemRepo);

      const orcOriginal = await criarUc.execute({
        usuarioId: USER_ID,
        clienteId: clienteValido.id,
        numero: 'ORC-ORIGINAL',
      });

      // Adiciona item com snapshot histórico
      const itemOrig = await itemRepo.criar({
        id: 'item-orig-1',
        orcamentoId: orcOriginal.id,
        tipo: TipoItem.PRODUTO,
        produtoId: 'prod-1',
        descricao: 'Grama Esmeralda',
        quantidade: 100,
        unidade: 'm²',
        valorUnitario: 15,
        valorTotal: 1500,
        usaMedicaoArea: false,
      });
      orcOriginal.adicionarItem(itemOrig);

      // Duplica
      const copia = await duplicarUc.execute({
        id: orcOriginal.id,
        usuarioId: USER_ID,
        novoNumero: 'ORC-COPIA-001',
      });

      // Verificações de independência estrita
      assert.notStrictEqual(copia.id, orcOriginal.id);
      assert.strictEqual(copia.numero, 'ORC-COPIA-001');
      assert.strictEqual(copia.status, StatusOrcamento.RASCUNHO);
      assert.strictEqual(copia.editavel, true);
      assert.strictEqual(copia.itens.length, 1);
      assert.strictEqual(copia.itens[0].descricao, 'Grama Esmeralda');
      assert.strictEqual(copia.itens[0].valorUnitario, 15);
      assert.notStrictEqual(copia.itens[0].id, 'item-orig-1');

      // Original permanece inalterado
      assert.strictEqual(orcOriginal.numero, 'ORC-ORIGINAL');
      assert.strictEqual(orcOriginal.status, StatusOrcamento.RASCUNHO);
    });
  });

  describe('ExcluirOrcamentoUseCase', () => {
    it('deve permitir excluir orçamento em status RASCUNHO', async () => {
      const criarUc = new CriarOrcamentoUseCase(orcamentoRepo, clienteRepo);
      const excluirUc = new ExcluirOrcamentoUseCase(orcamentoRepo);

      const orc = await criarUc.execute({
        usuarioId: USER_ID,
        clienteId: clienteValido.id,
      });

      await excluirUc.execute({ id: orc.id, usuarioId: USER_ID });
      const busca = await orcamentoRepo.buscarPorId(orc.id);
      assert.strictEqual(busca, null);
    });

    it('deve rejeitar exclusão de orçamento fora de RASCUNHO', async () => {
      const criarUc = new CriarOrcamentoUseCase(orcamentoRepo, clienteRepo);
      const excluirUc = new ExcluirOrcamentoUseCase(orcamentoRepo);

      const orc = await criarUc.execute({
        usuarioId: USER_ID,
        clienteId: clienteValido.id,
      });

      orc.status = StatusOrcamento.ENVIADO;

      await assert.rejects(
        async () => {
          await excluirUc.execute({ id: orc.id, usuarioId: USER_ID });
        },
        (err: Error) => {
          assert.ok(err instanceof RegraNegocioError);
          assert.match(err.message, /não podem ser excluídos/);
          return true;
        }
      );
    });
  });
});
