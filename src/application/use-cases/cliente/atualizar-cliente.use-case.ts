import { Cliente } from '../../../domain/entities/cliente';
import { ClienteRepository } from '../../../domain/repositories/cliente.repository.interface';
import { supabaseClienteRepository } from '../../../infrastructure/repositories/supabase-cliente.repository';
import { AuthService, authService } from '../../services/auth.service';
import { RegraNegocioError } from '../../../domain/errors/dominio-error';
import {
  GeocodingProvider,
  GeocodingError,
} from '../../interfaces/geocoding-provider.interface';
import { expoLocationGeocodingProvider } from '../../../infrastructure/services/geocoding/expo-location-geocoding.provider';
import {
  validarDadosCliente,
  validarDadosEndereco,
  temDadosEndereco,
  ValidarEnderecoInput,
  enderecosSaoIguais,
} from '../../validation/cliente.validator';

export interface AtualizarClienteInput {
  nome?: string;
  telefone?: string | null;
  email?: string | null;
  documento?: string | null;
  observacoes?: string | null;
  endereco?: ValidarEnderecoInput | null;
}

/**
 * Caso de Uso: AtualizarCliente
 * Atualiza os dados de um cliente existente e seu endereço associado.
 * Implementa rigorosamente a matriz de consistência da DECISÃO-GEO-09:
 * - Endereço não alterado: não executa nova geocodificação, preserva coordenadas existentes;
 * - Endereço alterado com sucesso: atualiza latitude/longitude com as novas coordenadas;
 * - Endereço alterado com falha ou timeout: LIMPA coordenadas antigas para NULL;
 * - Endereço removido: limpa coordenadas.
 */
export class AtualizarClienteUseCase {
  constructor(
    private readonly repository: ClienteRepository = supabaseClienteRepository,
    private readonly auth: AuthService = authService,
    private readonly geocodingProvider: GeocodingProvider = expoLocationGeocodingProvider
  ) {}

  async execute(id: string, input: AtualizarClienteInput): Promise<Cliente> {
    if (!id || id.trim() === '') {
      throw new RegraNegocioError('O ID do cliente é obrigatório.');
    }

    const user = await this.auth.getCurrentUser();
    if (!user || !user.id) {
      throw new Error('Usuário não autenticado.');
    }

    // Validação dos dados se fornecidos
    if (input.nome !== undefined) {
      validarDadosCliente({
        nome: input.nome,
        telefone: input.telefone,
        email: input.email,
        documento: input.documento,
        observacoes: input.observacoes,
      });
    }

    if (input.endereco && temDadosEndereco(input.endereco)) {
      validarDadosEndereco(input.endereco);
    }

    // Verifica existência e titularidade (traz endereço atual associado)
    const clienteExistente = await this.repository.buscarPorId(id.trim());
    if (!clienteExistente || clienteExistente.usuarioId !== user.id) {
      throw new Error('Cliente não encontrado ou não pertence ao usuário.');
    }

    // Atualização dos dados do cliente (sem alterar usuario_id)
    const clienteAtualizado = await this.repository.atualizar(id.trim(), {
      nome: input.nome,
      telefone: input.telefone,
      email: input.email,
      documento: input.documento,
      observacoes: input.observacoes,
    });

    // Atualização do endereço se fornecido
    if (input.endereco !== undefined) {
      if (input.endereco && temDadosEndereco(input.endereco)) {
        const dadosEndereco = input.endereco;
        const enderecoAtual = clienteExistente.endereco;
        const enderecoMudou = !enderecosSaoIguais(enderecoAtual, dadosEndereco);

        let latitude: number | null;
        let longitude: number | null;

        if (!enderecoMudou) {
          // Cenário A: Endereço não mudou -> não geocodificar novamente.
          // Preserva coordenadas existentes ou as repassadas explicitamente
          latitude =
            dadosEndereco.latitude !== undefined
              ? dadosEndereco.latitude
              : (enderecoAtual?.latitude ?? null);
          longitude =
            dadosEndereco.longitude !== undefined
              ? dadosEndereco.longitude
              : (enderecoAtual?.longitude ?? null);
        } else {
          // Cenário B/C/D/E: Endereço mudou!
          // Executa nova geocodificação para o novo endereço
          try {
            const resultado = await this.geocodingProvider.geocodificar({
              logradouro: dadosEndereco.logradouro,
              numero: dadosEndereco.numero,
              bairro: dadosEndereco.bairro,
              cidade: dadosEndereco.cidade,
              estado: dadosEndereco.estado,
              cep: dadosEndereco.cep,
            });

            if (resultado) {
              // Sucesso: atualiza com as novas coordenadas
              latitude = resultado.latitude;
              longitude = resultado.longitude;
            } else {
              // Não encontrado: limpa coordenadas antigas para NULL
              latitude = null;
              longitude = null;
            }
          } catch (err) {
            // DECISÃO-GEO-09 / FASE 8: Timeout ou erro externo com endereço novo obrigatoriamente
            // limpa as coordenadas antigas para NULL para evitar endereço novo com coordenada antiga
            if (err instanceof GeocodingError && err.code === 'PERMISSAO_NEGADA') {
              console.info('[Geocoding] Permissão de localização não concedida ao atualizar endereço. Coordenadas limpas para NULL.');
            } else if (err instanceof GeocodingError && err.code === 'TIMEOUT') {
              console.warn('[Geocoding] Tempo limite atingido ao geocodificar novo endereço. Coordenadas limpas para NULL.');
            } else if (err instanceof GeocodingError && err.code === 'INDISPONIVEL') {
              console.warn('[Geocoding] Serviço de localização indisponível ao atualizar endereço. Coordenadas limpas para NULL.');
            } else {
              console.warn('Falha na geocodificação ao atualizar endereço do cliente:', err instanceof Error ? err.message : String(err));
            }
            latitude = null;
            longitude = null;
          }
        }

        const enderecoSalvo = await this.repository.salvarEndereco(id.trim(), {
          ...dadosEndereco,
          latitude,
          longitude,
        });
        clienteAtualizado.definirEndereco(enderecoSalvo);
      }
    }

    return clienteAtualizado;
  }
}
