import { Endereco } from '../../../domain/entities/endereco';
import { ClienteRepository } from '../../../domain/repositories/cliente.repository.interface';
import { supabaseClienteRepository } from '../../../infrastructure/repositories/supabase-cliente.repository';
import { AuthService, authService } from '../../services/auth.service';
import { RegraNegocioError } from '../../../domain/errors/dominio-error';
import {
  GeocodingProvider,
} from '../../interfaces/geocoding-provider.interface';
import { expoLocationGeocodingProvider } from '../../../infrastructure/services/geocoding/expo-location-geocoding.provider';
import {
  validarDadosEndereco,
  ValidarEnderecoInput,
  enderecosSaoIguais,
} from '../../validation/cliente.validator';

/**
 * Caso de Uso: SalvarEnderecoCliente
 * Salva (cria ou atualiza) o endereço do cliente aplicando a política de geocodificação da DECISÃO-GEO-09.
 */
export class SalvarEnderecoClienteUseCase {
  constructor(
    private readonly repository: ClienteRepository = supabaseClienteRepository,
    private readonly auth: AuthService = authService,
    private readonly geocodingProvider: GeocodingProvider = expoLocationGeocodingProvider
  ) {}

  async execute(clienteId: string, dados: ValidarEnderecoInput): Promise<Endereco> {
    if (!clienteId || clienteId.trim() === '') {
      throw new RegraNegocioError('O ID do cliente é obrigatório.');
    }

    validarDadosEndereco(dados);

    const user = await this.auth.getCurrentUser();
    if (!user || !user.id) {
      throw new Error('Usuário não autenticado.');
    }

    const cliente = await this.repository.buscarPorId(clienteId.trim());
    if (!cliente || cliente.usuarioId !== user.id) {
      throw new Error('Cliente não encontrado ou não pertence ao usuário.');
    }

    const enderecoAtual = cliente.endereco;
    const enderecoMudou = !enderecosSaoIguais(enderecoAtual, dados);

    let latitude: number | null;
    let longitude: number | null;

    if (!enderecoMudou) {
      // Endereço não mudou: preserva coordenadas
      latitude =
        dados.latitude !== undefined
          ? dados.latitude
          : (enderecoAtual?.latitude ?? null);
      longitude =
        dados.longitude !== undefined
          ? dados.longitude
          : (enderecoAtual?.longitude ?? null);
    } else {
      // Endereço mudou: executa nova geocodificação
      try {
        const resultado = await this.geocodingProvider.geocodificar({
          logradouro: dados.logradouro,
          numero: dados.numero,
          bairro: dados.bairro,
          cidade: dados.cidade,
          estado: dados.estado,
          cep: dados.cep,
        });

        if (resultado) {
          latitude = resultado.latitude;
          longitude = resultado.longitude;
        } else {
          latitude = null;
          longitude = null;
        }
      } catch (err) {
        console.warn('Falha na geocodificação em SalvarEnderecoClienteUseCase:', err);
        latitude = null;
        longitude = null;
      }
    }

    return this.repository.salvarEndereco(clienteId.trim(), {
      ...dados,
      latitude,
      longitude,
    });
  }
}
