import {
  GeocodingProvider,
  EnderecoConsultaGeocoding,
  CoordenadasGeocoding,
  GeocodificarOptions,
  GeocodingError,
} from '../../../application/interfaces/geocoding-provider.interface';

/**
 * Formata um objeto de endereço para a string textual de consulta.
 * Em estrito cumprimento ao princípio da Minimização de Dados (LGPD / DECISÃO-GEO-06),
 * apenas dados geográficos públicos são transmitidos (logradouro, número, bairro, cidade, UF, CEP).
 * Dados pessoais (nome, documento, telefone, e-mail) NUNCA são transmitidos.
 */
export function formatarEnderecoParaGeocodificacao(
  endereco: EnderecoConsultaGeocoding
): string {
  const partes: string[] = [];

  if (endereco.logradouro && endereco.logradouro.trim() !== '') {
    const log = endereco.logradouro.trim();
    const num = endereco.numero && endereco.numero.trim() !== '' ? endereco.numero.trim() : null;
    partes.push(num ? `${log}, ${num}` : log);
  }

  if (endereco.bairro && endereco.bairro.trim() !== '') {
    partes.push(endereco.bairro.trim());
  }

  if (endereco.cidade && endereco.cidade.trim() !== '') {
    const cid = endereco.cidade.trim();
    const uf = endereco.estado && endereco.estado.trim() !== '' ? endereco.estado.trim().toUpperCase() : null;
    partes.push(uf ? `${cid} - ${uf}` : cid);
  } else if (endereco.estado && endereco.estado.trim() !== '') {
    partes.push(endereco.estado.trim().toUpperCase());
  }

  if (endereco.cep && endereco.cep.trim() !== '') {
    partes.push(`CEP ${endereco.cep.trim()}`);
  }

  if (partes.length === 0) {
    return '';
  }

  partes.push('Brasil');
  return partes.join(', ');
}

/**
 * Implementação concreta de GeocodingProvider utilizando o Geocoder nativo do Android
 * através da biblioteca expo-location (android.location.Geocoder / Google Play Services).
 * Em conformidade com a DECISÃO-GEO-01 homologada:
 * - Não utiliza nem requer nenhuma API Key em código, bundle ou backend;
 * - Suporta timeout padrão de 5.000 ms (DECISÃO-GEO-08);
 * - Suporta cancelamento limpo via AbortSignal;
 * - Tolerante a falhas (RNF15 / RNF22);
 * - Carregamento dinâmico do módulo nativo para viabilizar execução isolada em testes Node.js.
 */
export class ExpoLocationGeocodingProvider implements GeocodingProvider {
  private readonly defaultTimeoutMs: number;

  constructor(defaultTimeoutMs: number = 5000) {
    this.defaultTimeoutMs = defaultTimeoutMs;
  }

  async geocodificar(
    endereco: EnderecoConsultaGeocoding,
    options?: GeocodificarOptions
  ): Promise<CoordenadasGeocoding | null> {
    const textoConsulta = formatarEnderecoParaGeocodificacao(endereco);
    if (!textoConsulta || textoConsulta.trim() === '') {
      return null;
    }

    const signal = options?.signal;
    if (signal?.aborted) {
      throw new GeocodingError('CANCELADO', 'Operação de geocodificação cancelada antes de iniciar.');
    }

    const timeoutMs = options?.timeoutMs ?? this.defaultTimeoutMs;

    return new Promise<CoordenadasGeocoding | null>((resolve, reject) => {
      let timer: ReturnType<typeof setTimeout> | null = null;
      let onAbort: (() => void) | null = null;
      let finalizado = false;

      const limparRecursos = () => {
        finalizado = true;
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
        if (signal && onAbort) {
          signal.removeEventListener('abort', onAbort);
          onAbort = null;
        }
      };

      // Configuração de Cancelamento
      if (signal) {
        onAbort = () => {
          if (!finalizado) {
            limparRecursos();
            reject(new GeocodingError('CANCELADO', 'Operação de geocodificação cancelada pelo chamador.'));
          }
        };
        signal.addEventListener('abort', onAbort, { once: true });
      }

      // Configuração de Timeout
      if (timeoutMs > 0 && timeoutMs < Infinity) {
        timer = setTimeout(() => {
          if (!finalizado) {
            limparRecursos();
            reject(
              new GeocodingError(
                'TIMEOUT',
                `A geocodificação excedeu o tempo limite de ${timeoutMs} ms.`
              )
            );
          }
        }, timeoutMs);
      }

      // Execução da Geocodificação Nativa com expo-location carregado sob demanda
      (async () => {
        try {
          // Import dinâmico para não quebrar ambientes Node.js/testes unitários sem runtime React Native
          const Location = await import('expo-location');

          // O expo-location delega no Android diretamente ao android.location.Geocoder
          const resultados = await Location.geocodeAsync(textoConsulta);

          if (finalizado) return;
          limparRecursos();

          if (!resultados || resultados.length === 0) {
            resolve(null);
            return;
          }

          const primeira = resultados[0];
          const lat = Number(primeira.latitude);
          const lng = Number(primeira.longitude);

          // Validação das coordenadas conforme constraints canônicas
          if (
            isNaN(lat) ||
            isNaN(lng) ||
            lat < -90.0 ||
            lat > 90.0 ||
            lng < -180.0 ||
            lng > 180.0
          ) {
            resolve(null);
            return;
          }

          resolve({
            latitude: lat,
            longitude: lng,
            precisao: 'APPROXIMATE',
          });
        } catch (err) {
          if (finalizado) return;
          limparRecursos();

          if (err instanceof GeocodingError) {
            reject(err);
            return;
          }

          const mensagem = err instanceof Error ? err.message : String(err);
          // Mapeia erro de autorização ou indisponibilidade
          if (mensagem.includes('permission') || mensagem.includes('unauthorized') || mensagem.includes('Unauthorized')) {
            reject(new GeocodingError('INDISPONIVEL', `Permissão ou serviço de localização indisponível: ${mensagem}`));
          } else {
            reject(new GeocodingError('ERRO_DESCONHECIDO', `Falha ao geocodificar endereço: ${mensagem}`));
          }
        }
      })();
    });
  }
}

/**
 * Singleton padrão da implementação do provedor de geocodificação.
 */
export const expoLocationGeocodingProvider = new ExpoLocationGeocodingProvider();
