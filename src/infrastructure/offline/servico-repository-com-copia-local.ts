import {
  AtualizarServicoDados,
  CriarServicoDados,
  ServicoRepository,
} from '../../domain/repositories/servico.repository.interface';
import { Servico } from '../../domain/entities/servico';
import { ArmazenamentoLocal } from '../../application/interfaces/armazenamento-local.interface';
import { ConectividadeProvider } from '../../application/interfaces/conectividade-provider.interface';
import { supabaseServicoRepository } from '../repositories/supabase-servico.repository';
import { armazenamentoLocal } from './armazenamento-local-cifrado';
import { conectividadeProvider } from './expo-network-conectividade.provider';
import { CopiaLocalDeLista } from './copia-local-de-lista';

/**
 * Repositório de serviços com a última cópia do catálogo guardada no aparelho (RNF36/RF83).
 * Leituras funcionam sem conexão a partir da cópia; cadastros continuam exigindo conexão.
 */
export class ServicoRepositoryComCopiaLocal implements ServicoRepository {
  private readonly copia: CopiaLocalDeLista<Servico>;

  constructor(
    private readonly online: ServicoRepository = supabaseServicoRepository,
    armazenamento: ArmazenamentoLocal = armazenamentoLocal,
    conectividade: ConectividadeProvider = conectividadeProvider
  ) {
    this.copia = new CopiaLocalDeLista(armazenamento, 'servicos', (salvo) => new Servico(salvo), conectividade);
  }

  listar(usuarioId: string): Promise<Servico[]> {
    return this.copia.listar(usuarioId, () => this.online.listar(usuarioId));
  }

  buscarPorId(id: string): Promise<Servico | null> {
    return this.copia.buscarPorId(id, () => this.online.buscarPorId(id));
  }

  async criar(dados: CriarServicoDados): Promise<Servico> {
    const servico = await this.copia.escrever(() => this.online.criar(dados));
    await this.copia.guardarItem(servico);
    return servico;
  }

  async atualizar(id: string, dados: AtualizarServicoDados): Promise<Servico> {
    const servico = await this.copia.escrever(() => this.online.atualizar(id, dados));
    await this.copia.guardarItem(servico);
    return servico;
  }

  async alterarAtivo(id: string, ativo: boolean): Promise<void> {
    await this.copia.escrever(() => this.online.alterarAtivo(id, ativo));
    await this.copia.alterarItem(id, (servico) => (ativo ? servico.ativar() : servico.desativar()));
  }
}

export const servicoRepositoryComCopiaLocal = new ServicoRepositoryComCopiaLocal();
