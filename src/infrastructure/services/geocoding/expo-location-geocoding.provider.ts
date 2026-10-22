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
 * Normaliza uma string de pesquisa livre de endereço para consulta ao Geocoder.
 * Remove espaços excedentes, rejeita entradas triviais (< 3 caracteres)
 * e anexa ', Brasil' se não estiver presente ao final da string.
 */
export function normalizarTextoPesquisaEndereco(texto: string): string {
  if (!texto || typeof texto !== 'string') {
    return '';
  }
  const limpo = texto.trim().replace(/\s+/g, ' ');
  if (limpo.length < 3) {
    return '';
  }
  if (/,\s*brasil\s*$/i.test(limpo)) {
    return limpo;
  }
  return `${limpo}, Brasil`;
}

/**
 * Identifica falhas de conexão ou do serviço de geocodificação do aparelho (RNF15 / RNF22).
 * No Android, o Geocoder lança java.io.IOException quando não há rede ou o serviço do Google
 * Play Services não responde (ex.: "grpc failed", "Service not Available"); o expo-location
 * informa "Could not find the Geocoder" quando o aparelho não possui o serviço.
 */
export function ehFalhaDeRedeOuServico(mensagem: string): boolean {
  const texto = mensagem.toLowerCase();
  return [
    'ioexception',
    'grpc failed',
    'service not available',
    'timed out waiting for response',
    'unable to resolve host',
    'network',
    'could not find the geocoder',
    'geocoder is not running',
  ].some((trecho) => texto.includes(trecho));
}

export interface ExpoLocationModule {
  getForegroundPermissionsAsync?: () => Promise<{
    status: string;
    granted: boolean;
    canAskAgain?: boolean;
    expires?: string | number;
  }>;
  requestForegroundPermissionsAsync?: () => Promise<{
    status: string;
    granted: boolean;
    canAskAgain?: boolean;
    expires?: string | number;
  }>;
  geocodeAsync: (
    address: string
  ) => Promise<Array<{ latitude: number; longitude: number }>>;
}

/**
 * Implementação concreta de GeocodingProvider utilizando o Geocoder nativo do Android
 * através da biblioteca expo-location (android.location.Geocoder / Google Play Services).
 * Em conformidade com a DECISÃO-GEO-01 homologada e ACH-UX/TECH-05:
 * - Não utiliza nem requer nenhuma API Key em código, bundle ou backend;
 * - Verifica e solicita permissão de localização em primeiro plano sob demanda (FASE 2);
 * - Trata recusa do usuário graciosamente sem travar cadastro (FASE 3);
 * - Suporta timeout padrão de 5.000 ms (DECISÃO-GEO-08);
 * - Suporta cancelamento limpo via AbortSignal;
 * - Tolerante a falhas (RNF15 / RNF22);
 * - Carregamento dinâmico ou injetado do módulo nativo para viabilizar execução isolada em testes Node.js.
 */
export class ExpoLocationGeocodingProvider implements GeocodingProvider {
  private readonly defaultTimeoutMs: number;
  private readonly locationModuleLoader?: () => Promise<ExpoLocationModule>;

  constructor(
    defaultTimeoutMs: number = 5000,
    locationModuleLoader?: () => Promise<ExpoLocationModule>
  ) {
    this.defaultTimeoutMs = defaultTimeoutMs;
    this.locationModuleLoader = locationModuleLoader;
  }

  async geocodificar(
    endereco: EnderecoConsultaGeocoding,
    options?: GeocodificarOptions
  ): Promise<CoordenadasGeocoding | null> {
    const textoConsulta = formatarEnderecoParaGeocodificacao(endereco);
    if (!textoConsulta || textoConsulta.trim() === '') {
      return null;
    }
    return this.executarConsulta(textoConsulta, options);
  }

  async pesquisarEndereco(
    texto: string,
    options?: GeocodificarOptions
  ): Promise<CoordenadasGeocoding | null> {
    const textoConsulta = normalizarTextoPesquisaEndereco(texto);
    if (!textoConsulta || textoConsulta.trim() === '') {
      return null;
    }
    return this.executarConsulta(textoConsulta, options);
  }

  private async executarConsulta(
    textoConsulta: string,
    options?: GeocodificarOptions
  ): Promise<CoordenadasGeocoding | null> {
    const signal = options?.signal;
    if (signal?.aborted) {
      throw new GeocodingError('CANCELADO', 'Operação de geocodificação cancelada antes de iniciar.');
    }

    // Carregamento dinâmico do módulo expo-location (ou injetado em testes)
    let Location: ExpoLocationModule;
    try {
      Location = await (this.locationModuleLoader
        ? this.locationModuleLoader()
        : (import('expo-location') as Promise<unknown> as Promise<ExpoLocationModule>));
    } catch (err) {
      throw new GeocodingError(
        'INDISPONIVEL',
        `Falha ao carregar o módulo de localização: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    if (signal?.aborted) {
      throw new GeocodingError('CANCELADO', 'Operação de geocodificação cancelada pelo chamador.');
    }

    // 1. Verificação e Solicitação de Permissão de Localização em Primeiro Plano (FASE 2)
    if (typeof Location.getForegroundPermissionsAsync === 'function') {
      try {
        let permissao = await Location.getForegroundPermissionsAsync();

        if (permissao.status !== 'granted') {
          if (typeof Location.requestForegroundPermissionsAsync === 'function') {
            permissao = await Location.requestForegroundPermissionsAsync();
          }
        }

        if (permissao.status !== 'granted') {
          throw new GeocodingError(
            'PERMISSAO_NEGADA',
            'Permissão de localização em primeiro plano não foi concedida pelo usuário.'
          );
        }
      } catch (permErr) {
        if (permErr instanceof GeocodingError) {
          throw permErr;
        }
        const msg = permErr instanceof Error ? permErr.message : String(permErr);
        if (
          msg.includes('permission') ||
          msg.includes('unauthorized') ||
          msg.includes('Unauthorized') ||
          msg.includes('Not authorized') ||
          msg.includes('not authorized')
        ) {
          throw new GeocodingError('PERMISSAO_NEGADA', `Permissão de localização não concedida: ${msg}`);
        }
        throw new GeocodingError('INDISPONIVEL', `Falha ao verificar permissão de localização: ${msg}`);
      }
    }

    if (signal?.aborted) {
      throw new GeocodingError('CANCELADO', 'Operação de geocodificação cancelada pelo chamador.');
    }

    const timeoutMs = options?.timeoutMs ?? this.defaultTimeoutMs;

    // 2. Execução da Geocodificação Nativa com Proteção de Timeout e AbortSignal
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

      (async () => {
        try {
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
          // Mapeia erro de autorização ou permissão
          if (
            mensagem.includes('permission') ||
            mensagem.includes('unauthorized') ||
            mensagem.includes('Unauthorized') ||
            mensagem.includes('Not authorized') ||
            mensagem.includes('not authorized')
          ) {
            reject(new GeocodingError('PERMISSAO_NEGADA', `Permissão de localização não concedida: ${mensagem}`));
          } else if (
            mensagem.includes('unavailable') ||
            mensagem.includes('indisponivel') ||
            mensagem.includes('Indisponível') ||
            ehFalhaDeRedeOuServico(mensagem)
          ) {
            reject(new GeocodingError('INDISPONIVEL', `Serviço de localização indisponível: ${mensagem}`));
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
