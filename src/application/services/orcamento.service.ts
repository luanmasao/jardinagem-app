import { Orcamento } from '../../domain/entities/orcamento';
import { ItemOrcamento } from '../../domain/entities/item-orcamento';
import { StatusOrcamento } from '../../domain/enums/status-orcamento';
import { TipoItem } from '../../domain/enums/tipo-item';
import { TipoDesconto } from '../../domain/enums/tipo-desconto';
import { OrcamentoResumo, OrcamentoComCliente, OrcamentoRepository } from '../../domain/repositories/orcamento.repository.interface';
import { ItemOrcamentoRepository } from '../../domain/repositories/item-orcamento.repository.interface';
import { ClienteRepository } from '../../domain/repositories/cliente.repository.interface';
import { ServicoRepository } from '../../domain/repositories/servico.repository.interface';
import { ProdutoRepository } from '../../domain/repositories/produto.repository.interface';
import { supabaseOrcamentoRepository } from '../../infrastructure/repositories/supabase-orcamento.repository';
import { supabaseItemOrcamentoRepository } from '../../infrastructure/repositories/supabase-item-orcamento.repository';
import { supabaseClienteRepository } from '../../infrastructure/repositories/supabase-cliente.repository';
import { supabaseServicoRepository } from '../../infrastructure/repositories/supabase-servico.repository';
import { supabaseProdutoRepository } from '../../infrastructure/repositories/supabase-produto.repository';
import { AuthService, authService } from './auth.service';
import {
  ListarOrcamentosUseCase,
  ObterOrcamentoUseCase,
  CriarOrcamentoUseCase,
  AtualizarOrcamentoUseCase,
  DuplicarOrcamentoUseCase,
  AlterarStatusOrcamentoUseCase,
  AdicionarItemOrcamentoUseCase,
  AtualizarItemOrcamentoUseCase,
  RemoverItemOrcamentoUseCase,
  ExcluirOrcamentoUseCase,
  ExpirarOrcamentosVencidosUseCase,
} from '../use-cases/orcamento';

import { RegraNegocioError } from '../../domain/errors/dominio-error';

export interface CriarOrcamentoServiceInput {
  clienteId: string;
  numero?: string;
  dataValidade?: Date | null;
  tipoDesconto?: TipoDesconto | null;
  valorDesconto?: number;
  observacoes?: string | null;
  condicoesPagamento?: string | null;
}

export interface AtualizarOrcamentoServiceInput {
  clienteId?: string;
  dataValidade?: Date | null;
  tipoDesconto?: TipoDesconto | null;
  valorDesconto?: number;
  observacoes?: string | null;
  condicoesPagamento?: string | null;
}

export interface AdicionarItemServiceInput {
  orcamentoId: string;
  tipo: TipoItem;
  servicoId?: string | null;
  produtoId?: string | null;
  quantidade?: number;
}

export interface AtualizarItemServiceInput {
  orcamentoId: string;
  itemId: string;
  quantidade?: number;
  descricao?: string;
  valorUnitario?: number;
}

/**
 * OrcamentoService: Fachada da aplicação para coordenação de casos de uso de Orçamento e Itens.
 * Mantém a apresentação desacoplada de detalhes de infraestrutura e repositório.
 */
export class OrcamentoService {
  private readonly listarOrcamentosUseCase: ListarOrcamentosUseCase;
  private readonly obterOrcamentoUseCase: ObterOrcamentoUseCase;
  private readonly criarOrcamentoUseCase: CriarOrcamentoUseCase;
  private readonly atualizarOrcamentoUseCase: AtualizarOrcamentoUseCase;
  private readonly duplicarOrcamentoUseCase: DuplicarOrcamentoUseCase;
  private readonly alterarStatusOrcamentoUseCase: AlterarStatusOrcamentoUseCase;
  private readonly adicionarItemOrcamentoUseCase: AdicionarItemOrcamentoUseCase;
  private readonly atualizarItemOrcamentoUseCase: AtualizarItemOrcamentoUseCase;
  private readonly removerItemOrcamentoUseCase: RemoverItemOrcamentoUseCase;
  private readonly excluirOrcamentoUseCase: ExcluirOrcamentoUseCase;
  private readonly expirarOrcamentosVencidosUseCase: ExpirarOrcamentosVencidosUseCase;

  constructor(
    private readonly orcamentoRepo: OrcamentoRepository = supabaseOrcamentoRepository,
    private readonly itemOrcamentoRepo: ItemOrcamentoRepository = supabaseItemOrcamentoRepository,
    private readonly clienteRepo: ClienteRepository = supabaseClienteRepository,
    private readonly servicoRepo: ServicoRepository = supabaseServicoRepository,
    private readonly produtoRepo: ProdutoRepository = supabaseProdutoRepository,
    private readonly auth: AuthService = authService
  ) {
    this.listarOrcamentosUseCase = new ListarOrcamentosUseCase(this.orcamentoRepo);
    this.obterOrcamentoUseCase = new ObterOrcamentoUseCase(this.orcamentoRepo);
    this.criarOrcamentoUseCase = new CriarOrcamentoUseCase(this.orcamentoRepo, this.clienteRepo);
    this.atualizarOrcamentoUseCase = new AtualizarOrcamentoUseCase(this.orcamentoRepo, this.clienteRepo);
    this.duplicarOrcamentoUseCase = new DuplicarOrcamentoUseCase(this.orcamentoRepo, this.itemOrcamentoRepo);
    this.alterarStatusOrcamentoUseCase = new AlterarStatusOrcamentoUseCase(this.orcamentoRepo);
    this.adicionarItemOrcamentoUseCase = new AdicionarItemOrcamentoUseCase(
      this.orcamentoRepo,
      this.itemOrcamentoRepo,
      this.servicoRepo,
      this.produtoRepo
    );
    this.atualizarItemOrcamentoUseCase = new AtualizarItemOrcamentoUseCase(this.orcamentoRepo, this.itemOrcamentoRepo);
    this.removerItemOrcamentoUseCase = new RemoverItemOrcamentoUseCase(this.orcamentoRepo, this.itemOrcamentoRepo);
    this.excluirOrcamentoUseCase = new ExcluirOrcamentoUseCase(this.orcamentoRepo);
    this.expirarOrcamentosVencidosUseCase = new ExpirarOrcamentosVencidosUseCase(this.orcamentoRepo);
  }


  private async getUsuarioId(): Promise<string> {
    const usuario = await this.auth.getCurrentUser();
    if (!usuario) {
      throw new RegraNegocioError('Usuário não autenticado.');
    }
    return usuario.id;
  }

  async listarOrcamentos(filtroStatus?: StatusOrcamento): Promise<OrcamentoResumo[]> {
    const usuarioId = await this.getUsuarioId();
    return this.listarOrcamentosUseCase.execute({ usuarioId, filtroStatus });
  }

  async obterOrcamento(id: string): Promise<OrcamentoComCliente | null> {
    const usuarioId = await this.getUsuarioId();
    return this.obterOrcamentoUseCase.execute({ id, usuarioId });
  }

  async criarOrcamento(dados: CriarOrcamentoServiceInput): Promise<Orcamento> {
    const usuarioId = await this.getUsuarioId();
    return this.criarOrcamentoUseCase.execute({ ...dados, usuarioId });
  }

  async atualizarOrcamento(id: string, dados: AtualizarOrcamentoServiceInput): Promise<Orcamento> {
    const usuarioId = await this.getUsuarioId();
    return this.atualizarOrcamentoUseCase.execute({ ...dados, id, usuarioId });
  }

  async duplicarOrcamento(id: string, novoNumero?: string): Promise<Orcamento> {
    const usuarioId = await this.getUsuarioId();
    return this.duplicarOrcamentoUseCase.execute({ id, usuarioId, novoNumero });
  }

  async alterarStatusOrcamento(id: string, novoStatus: StatusOrcamento): Promise<Orcamento> {
    const usuarioId = await this.getUsuarioId();
    return this.alterarStatusOrcamentoUseCase.execute({ id, usuarioId, novoStatus });
  }

  async adicionarItem(dados: AdicionarItemServiceInput): Promise<ItemOrcamento> {
    const usuarioId = await this.getUsuarioId();
    return this.adicionarItemOrcamentoUseCase.execute({ ...dados, usuarioId });
  }

  async atualizarItem(dados: AtualizarItemServiceInput): Promise<ItemOrcamento> {
    const usuarioId = await this.getUsuarioId();
    return this.atualizarItemOrcamentoUseCase.execute({ ...dados, usuarioId });
  }

  async removerItem(orcamentoId: string, itemId: string): Promise<void> {
    const usuarioId = await this.getUsuarioId();
    return this.removerItemOrcamentoUseCase.execute({ orcamentoId, itemId, usuarioId });
  }

  async excluirOrcamento(id: string): Promise<void> {
    const usuarioId = await this.getUsuarioId();
    return this.excluirOrcamentoUseCase.execute({ id, usuarioId });
  }

  /**
   * Dispara a rotina JIT de expiração de orçamentos vencidos para o usuário autenticado.
   * Não-bloqueante e seguro: se falhar ou atingir timeout, registra aviso e retorna 0.
   */
  async expirarVencidosJit(): Promise<number> {
    try {
      const result = await this.expirarOrcamentosVencidosUseCase.execute();
      return result.linhasExpiradas;
    } catch (err) {
      console.warn('[OrcamentoService] Falha não-bloqueante no JIT de expiração:', err);
      return 0;
    }
  }
}


export const orcamentoService = new OrcamentoService();
