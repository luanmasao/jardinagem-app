import { Cliente } from '../../../domain/entities/cliente';
import { ClienteRepository } from '../../../domain/repositories/cliente.repository.interface';
import { supabaseClienteRepository } from '../../../infrastructure/repositories/supabase-cliente.repository';
import { AuthService, authService } from '../../services/auth.service';
import {
  GeocodingProvider,
} from '../../interfaces/geocoding-provider.interface';
import { expoLocationGeocodingProvider } from '../../../infrastructure/services/geocoding/expo-location-geocoding.provider';
import {
  validarDadosCliente,
  validarDadosEndereco,
  temDadosEndereco,
  ValidarEnderecoInput,
} from '../../validation/cliente.validator';

export interface CriarClienteInput {
  nome: string;
  telefone?: string | null;
  email?: string | null;
  documento?: string | null;
  observacoes?: string | null;
  ativo?: boolean;
  endereco?: ValidarEnderecoInput | null;
}

/**
 * Caso de Uso: CriarCliente
 * Valida os dados, associa ao usuário autenticado atual, executa geocodificação automática
 * transparente (RF10 / DECISÃO-GEO-02) e persiste o cliente e endereço no repositório.
 */
export class CriarClienteUseCase {
  constructor(
    private readonly repository: ClienteRepository = supabaseClienteRepository,
    private readonly auth: AuthService = authService,
    private readonly geocodingProvider: GeocodingProvider = expoLocationGeocodingProvider
  ) {}

  async execute(input: CriarClienteInput): Promise<Cliente> {
    // 1. Validação dos dados do cliente
    validarDadosCliente({
      nome: input.nome,
      telefone: input.telefone,
      email: input.email,
      documento: input.documento,
      observacoes: input.observacoes,
    });

    // 2. Validação dos dados de endereço se informados
    if (temDadosEndereco(input.endereco)) {
      validarDadosEndereco(input.endereco!);
    }

    // 3. Obtenção do usuário autenticado (nunca aceita usuarioId da UI)
    const user = await this.auth.getCurrentUser();
    if (!user || !user.id) {
      throw new Error('Usuário não autenticado.');
    }

    // 4. Criação do cliente
    const cliente = await this.repository.criar({
      usuarioId: user.id,
      nome: input.nome,
      telefone: input.telefone,
      email: input.email,
      documento: input.documento,
      observacoes: input.observacoes,
      ativo: input.ativo ?? true,
    });

    // 5. Salva endereço se fornecido com geocodificação automática (DECISÃO-GEO-02 / DECISÃO-GEO-09)
    if (temDadosEndereco(input.endereco)) {
      let latitude = input.endereco!.latitude ?? null;
      let longitude = input.endereco!.longitude ?? null;

      const temTextoGeocodificavel = Boolean(
        (input.endereco!.logradouro && input.endereco!.logradouro.trim() !== '') ||
        (input.endereco!.cidade && input.endereco!.cidade.trim() !== '') ||
        (input.endereco!.cep && input.endereco!.cep.trim() !== '')
      );

      // Se não foram passadas coordenadas prévias e há dados textuais, executa geocodificação
      if (temTextoGeocodificavel && latitude == null && longitude == null) {
        try {
          const resultado = await this.geocodingProvider.geocodificar({
            logradouro: input.endereco!.logradouro,
            numero: input.endereco!.numero,
            bairro: input.endereco!.bairro,
            cidade: input.endereco!.cidade,
            estado: input.endereco!.estado,
            cep: input.endereco!.cep,
          });

          if (resultado) {
            latitude = resultado.latitude;
            longitude = resultado.longitude;
          } else {
            latitude = null;
            longitude = null;
          }
        } catch (err) {
          // DECISÃO-GEO-05 / RNF22: falha na geocodificação não impede o salvamento do cliente
          console.warn('Falha na geocodificação automática durante criação do cliente:', err);
          latitude = null;
          longitude = null;
        }
      }

      const enderecoSalvo = await this.repository.salvarEndereco(cliente.id, {
        ...input.endereco!,
        latitude,
        longitude,
      });
      cliente.definirEndereco(enderecoSalvo);
    }

    return cliente;
  }
}
