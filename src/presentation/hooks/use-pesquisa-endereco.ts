import { useState, useRef, useCallback } from 'react';
import {
  GeocodingProvider,
  GeocodingError,
} from '../../application/interfaces/geocoding-provider.interface';
import { expoLocationGeocodingProvider } from '../../infrastructure/services/geocoding/expo-location-geocoding.provider';
import { RegiaoMapa, CoordenadaMapa } from '../../infrastructure/maps/map-provider.interface';

export interface UsePesquisaEnderecoOptions {
  provider?: GeocodingProvider;
  timeoutMs?: number;
}

export interface ResultadoPesquisaEndereco {
  sucesso: boolean;
  regiao: RegiaoMapa | null;
  erro: string | null;
}

export interface UsePesquisaEnderecoReturn {
  texto: string;
  setTexto: (texto: string) => void;
  pesquisando: boolean;
  erro: string | null;
  pontoEncontrado: CoordenadaMapa | null;
  regiaoFoco: RegiaoMapa | null;
  pesquisar: (textoParaPesquisar?: string) => Promise<ResultadoPesquisaEndereco>;
  limparPesquisa: () => void;
}

/**
 * Hook para orquestrar a busca de endereços no mapa de medição de área (RF12 / RN09 / RNF15 / RNF22).
 * Fornece estado de pesquisa, cancelamento automático de requisições anteriores via AbortController,
 * tratamento de erros com mensagens amigáveis e retorno de RegiaoMapa para movimentação da câmera.
 */
export function usePesquisaEndereco(
  options?: UsePesquisaEnderecoOptions
): UsePesquisaEnderecoReturn {
  const provider = options?.provider ?? expoLocationGeocodingProvider;
  const timeoutMs = options?.timeoutMs ?? 5000;

  const [texto, setTexto] = useState('');
  const [pesquisando, setPesquisando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pontoEncontrado, setPontoEncontrado] = useState<CoordenadaMapa | null>(null);
  const [regiaoFoco, setRegiaoFoco] = useState<RegiaoMapa | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const pesquisar = useCallback(
    async (textoParaPesquisar?: string): Promise<ResultadoPesquisaEndereco> => {
      const termo = (textoParaPesquisar !== undefined ? textoParaPesquisar : texto).trim();

      if (termo.length < 3) {
        const msg = 'Digite pelo menos 3 caracteres para pesquisar o endereço.';
        setErro(msg);
        return { sucesso: false, regiao: null, erro: msg };
      }

      // Cancela busca anterior se ainda em andamento
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      setPesquisando(true);
      setErro(null);

      try {
        const resultado = await provider.pesquisarEndereco(termo, {
          timeoutMs,
          signal: controller.signal,
        });

        if (!resultado) {
          const msg = 'Endereço não encontrado. Tente incluir cidade e estado.';
          setErro(msg);
          return { sucesso: false, regiao: null, erro: msg };
        }

        const novaRegiao: RegiaoMapa = {
          latitude: resultado.latitude,
          longitude: resultado.longitude,
          latitudeDelta: 0.003,
          longitudeDelta: 0.003,
        };

        const novoPonto: CoordenadaMapa = {
          latitude: resultado.latitude,
          longitude: resultado.longitude,
        };

        setPontoEncontrado(novoPonto);
        setRegiaoFoco(novaRegiao);
        return { sucesso: true, regiao: novaRegiao, erro: null };
      } catch (err) {
        let msgErro = 'Não foi possível localizar o endereço informado.';
        if (err instanceof GeocodingError) {
          switch (err.code) {
            case 'CANCELADO':
              return { sucesso: false, regiao: null, erro: null };
            case 'TIMEOUT':
              msgErro = 'A busca demorou demais. Verifique a conexão e tente novamente.';
              break;
            case 'PERMISSAO_NEGADA':
              msgErro = 'Permissão de localização necessária para pesquisar endereços.';
              break;
            case 'INDISPONIVEL':
              msgErro =
                'Serviço de busca indisponível. Verifique sua conexão com a internet e tente novamente.';
              break;
            default:
              msgErro = 'Não foi possível localizar o endereço informado.';
              break;
          }
        } else {
          msgErro = 'Erro inesperado ao pesquisar endereço.';
        }
        setErro(msgErro);
        return { sucesso: false, regiao: null, erro: msgErro };
      } finally {
        setPesquisando(false);
      }
    },
    [texto, provider, timeoutMs]
  );

  const limparPesquisa = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setTexto('');
    setErro(null);
    setPontoEncontrado(null);
    setRegiaoFoco(null);
    setPesquisando(false);
  }, []);

  return {
    texto,
    setTexto,
    pesquisando,
    erro,
    pontoEncontrado,
    regiaoFoco,
    pesquisar,
    limparPesquisa,
  };
}
