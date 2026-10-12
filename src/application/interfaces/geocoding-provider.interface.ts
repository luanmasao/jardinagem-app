/**
 * Interfaces e tipos para o serviço de geocodificação de endereços.
 * Desacopla as regras de aplicação e o domínio dos detalhes do provedor (Android Geocoder / expo-location).
 */

export interface EnderecoConsultaGeocoding {
  logradouro?: string | null;
  numero?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
}

export interface CoordenadasGeocoding {
  latitude: number;
  longitude: number;
  precisao?: 'ROOFTOP' | 'APPROXIMATE';
}

export interface GeocodificarOptions {
  /**
   * Tempo limite em milissegundos antes de abortar a requisição.
   * Valor padrão canônico: 5.000 ms (DECISÃO-GEO-08).
   */
  timeoutMs?: number;
  /**
   * Sinal para cancelamento voluntário da requisição via AbortController.
   */
  signal?: AbortSignal;
}

export type GeocodingErrorCode =
  | 'TIMEOUT'
  | 'CANCELADO'
  | 'PERMISSAO_NEGADA'
  | 'INDISPONIVEL'
  | 'FORMATO_INVALIDO'
  | 'ERRO_DESCONHECIDO';

/**
 * Erro tipado para falhas no serviço de geocodificação.
 */
export class GeocodingError extends Error {
  constructor(
    public readonly code: GeocodingErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'GeocodingError';
  }
}

/**
 * Contrato abstrato do provedor de geocodificação.
 */
export interface GeocodingProvider {
  geocodificar(
    endereco: EnderecoConsultaGeocoding,
    options?: GeocodificarOptions
  ): Promise<CoordenadasGeocoding | null>;

  pesquisarEndereco(
    texto: string,
    options?: GeocodificarOptions
  ): Promise<CoordenadasGeocoding | null>;
}

