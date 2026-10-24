import { Area } from '../../domain/entities/area';
import { GeometriaPoligono } from '../../domain/types/geometria';
import { AreaRepository } from '../../domain/repositories/area.repository.interface';
import { ItemOrcamentoRepository } from '../../domain/repositories/item-orcamento.repository.interface';
import { OrcamentoRepository } from '../../domain/repositories/orcamento.repository.interface';
import { CalculadorAreaService } from '../../domain/services/calculador-area.service';
import { areaRepositoryOffline } from '../../infrastructure/offline/area-repository-offline';
import { itemOrcamentoRepositoryOffline } from '../../infrastructure/offline/item-orcamento-repository-offline';
import { orcamentoRepositoryOffline } from '../../infrastructure/offline/orcamento-repository-offline';
import { geodesicCalculadorAreaService } from '../../infrastructure/services/geodesic-calculador-area.service';
import { AuthService, authService } from './auth.service';
import {
  CriarAreaUseCase,
  ListarAreasPorItemUseCase,
  ObterAreaUseCase,
  AtualizarAreaUseCase,
  RemoverAreaUseCase,
} from '../use-cases/area';
import { RegraNegocioError } from '../../domain/errors/dominio-error';

export interface CriarAreaServiceInput {
  id?: string;
  itemOrcamentoId: string;
  geometria: GeometriaPoligono;
  nome?: string | null;
  observacoes?: string | null;
  unidade?: string;
}

export interface AtualizarAreaServiceInput {
  nome?: string | null;
  geometria?: GeometriaPoligono;
  observacoes?: string | null;
  unidade?: string;
}

/**
 * AreaService: Fachada da aplicação para coordenação dos casos de uso de Área (GAP-AREA-07).
 * Mantém a camada de apresentação desacoplada dos detalhes de repositório e infraestrutura.
 */
export class AreaService {
  private readonly criarAreaUseCase: CriarAreaUseCase;
  private readonly listarAreasPorItemUseCase: ListarAreasPorItemUseCase;
  private readonly obterAreaUseCase: ObterAreaUseCase;
  private readonly atualizarAreaUseCase: AtualizarAreaUseCase;
  private readonly removerAreaUseCase: RemoverAreaUseCase;

  constructor(
    private readonly areaRepo: AreaRepository = areaRepositoryOffline,
    private readonly itemOrcamentoRepo: ItemOrcamentoRepository = itemOrcamentoRepositoryOffline,
    private readonly orcamentoRepo: OrcamentoRepository = orcamentoRepositoryOffline,
    private readonly calculadorArea: CalculadorAreaService = geodesicCalculadorAreaService,
    private readonly auth: AuthService = authService
  ) {
    this.criarAreaUseCase = new CriarAreaUseCase(
      this.areaRepo,
      this.itemOrcamentoRepo,
      this.orcamentoRepo,
      this.calculadorArea
    );
    this.listarAreasPorItemUseCase = new ListarAreasPorItemUseCase(
      this.areaRepo,
      this.itemOrcamentoRepo,
      this.orcamentoRepo
    );
    this.obterAreaUseCase = new ObterAreaUseCase(
      this.areaRepo,
      this.itemOrcamentoRepo,
      this.orcamentoRepo
    );
    this.atualizarAreaUseCase = new AtualizarAreaUseCase(
      this.areaRepo,
      this.itemOrcamentoRepo,
      this.orcamentoRepo,
      this.calculadorArea
    );
    this.removerAreaUseCase = new RemoverAreaUseCase(
      this.areaRepo,
      this.itemOrcamentoRepo,
      this.orcamentoRepo
    );
  }

  private async getUsuarioId(): Promise<string> {
    const usuario = await this.auth.getCurrentUser();
    if (!usuario) {
      throw new RegraNegocioError('Usuário não autenticado.');
    }
    return usuario.id;
  }

  async criarArea(dados: CriarAreaServiceInput): Promise<Area> {
    const usuarioId = await this.getUsuarioId();
    return this.criarAreaUseCase.execute({ ...dados, usuarioId });
  }

  async listarAreasPorItem(itemOrcamentoId: string): Promise<Area[]> {
    const usuarioId = await this.getUsuarioId();
    return this.listarAreasPorItemUseCase.execute({ itemOrcamentoId, usuarioId });
  }

  async obterArea(id: string): Promise<Area | null> {
    const usuarioId = await this.getUsuarioId();
    return this.obterAreaUseCase.execute({ id, usuarioId });
  }

  async atualizarArea(id: string, dados: AtualizarAreaServiceInput): Promise<Area> {
    const usuarioId = await this.getUsuarioId();
    return this.atualizarAreaUseCase.execute({ ...dados, id, usuarioId });
  }

  async removerArea(id: string): Promise<void> {
    const usuarioId = await this.getUsuarioId();
    return this.removerAreaUseCase.execute({ id, usuarioId });
  }
}

/**
 * Instância singleton padrão do serviço de áreas da aplicação.
 */
export const areaService = new AreaService();
