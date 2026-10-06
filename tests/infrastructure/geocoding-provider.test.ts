import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  GeocodingError,
  EnderecoConsultaGeocoding,
  CoordenadasGeocoding,
} from '../../src/application/interfaces/geocoding-provider.interface';
import {
  formatarEnderecoParaGeocodificacao,
  ExpoLocationGeocodingProvider,
} from '../../src/infrastructure/services/geocoding/expo-location-geocoding.provider';

describe('Infraestrutura — Geocoding Provider e Formatação (Bloco A)', () => {
  describe('Minimização e Formatação de Dados (DECISÃO-GEO-06)', () => {
    it('deve formatar endereço completo com país Brasil ao final', () => {
      const input: EnderecoConsultaGeocoding = {
        logradouro: 'Rua das Acácias',
        numero: '123',
        bairro: 'Jardim Primavera',
        cidade: 'Ribeirão Preto',
        estado: 'sp',
        cep: '14000-000',
      };

      const formatado = formatarEnderecoParaGeocodificacao(input);
      assert.strictEqual(
        formatado,
        'Rua das Acácias, 123, Jardim Primavera, Ribeirão Preto - SP, CEP 14000-000, Brasil'
      );
    });

    it('deve converter UF para caixa alta automaticamente', () => {
      const input: EnderecoConsultaGeocoding = {
        cidade: 'Belo Horizonte',
        estado: 'mg',
      };
      const formatado = formatarEnderecoParaGeocodificacao(input);
      assert.strictEqual(formatado, 'Belo Horizonte - MG, Brasil');
    });

    it('deve ignorar campos em branco ou vazios', () => {
      const input: EnderecoConsultaGeocoding = {
        logradouro: '  ',
        numero: '',
        cidade: 'Brasília',
        estado: 'DF',
      };
      const formatado = formatarEnderecoParaGeocodificacao(input);
      assert.strictEqual(formatado, 'Brasília - DF, Brasil');
    });

    it('deve retornar string vazia para objeto vazio ou nulo', () => {
      assert.strictEqual(formatarEnderecoParaGeocodificacao({}), '');
      assert.strictEqual(
        formatarEnderecoParaGeocodificacao({
          logradouro: null,
          cidade: null,
          cep: null,
        }),
        ''
      );
    });

    it('NUNCA deve incluir identificadores ou dados pessoais na string formatada', () => {
      const input: any = {
        logradouro: 'Rua Verde',
        numero: '42',
        cidade: 'Santos',
        estado: 'SP',
        // Propriedades indevidas que possam ser acidentalmente passadas
        nome: 'João da Silva',
        cpf: '123.456.789-00',
        telefone: '(13) 99999-8888',
        email: 'joao@silva.com',
      };

      const formatado = formatarEnderecoParaGeocodificacao(input);
      assert.ok(!formatado.includes('João'));
      assert.ok(!formatado.includes('123.456'));
      assert.ok(!formatado.includes('99999'));
      assert.ok(!formatado.includes('joao@silva'));
      assert.strictEqual(formatado, 'Rua Verde, 42, Santos - SP, Brasil');
    });
  });

  describe('Tipagem de Erros e GeocodingError', () => {
    it('deve instanciar GeocodingError com código TIMEOUT', () => {
      const erro = new GeocodingError('TIMEOUT', 'Tempo limite excedido.');
      assert.strictEqual(erro.name, 'GeocodingError');
      assert.strictEqual(erro.code, 'TIMEOUT');
      assert.strictEqual(erro.message, 'Tempo limite excedido.');
      assert.ok(erro instanceof Error);
    });

    it('deve instanciar GeocodingError com código CANCELADO', () => {
      const erro = new GeocodingError('CANCELADO', 'Operação abortada.');
      assert.strictEqual(erro.code, 'CANCELADO');
    });

    it('deve instanciar GeocodingError com código INDISPONIVEL', () => {
      const erro = new GeocodingError('INDISPONIVEL', 'Sem conexão com a rede.');
      assert.strictEqual(erro.code, 'INDISPONIVEL');
    });
  });

  describe('Comportamento de Timeout e Cancelamento (DECISÃO-GEO-08)', () => {
    it('deve rejeitar com CANCELADO quando AbortSignal já estiver com aborted=true', async () => {
      const provider = new ExpoLocationGeocodingProvider(5000);
      const controller = new AbortController();
      controller.abort();

      await assert.rejects(
        async () => {
          await provider.geocodificar(
            { logradouro: 'Av. Paulista', cidade: 'São Paulo', estado: 'SP' },
            { signal: controller.signal }
          );
        },
        (err: any) => {
          assert.ok(err instanceof GeocodingError);
          assert.strictEqual(err.code, 'CANCELADO');
          return true;
        }
      );
    });

    it('deve retornar null diretamente para endereço sem texto geocodificável sem disparar rede', async () => {
      const provider = new ExpoLocationGeocodingProvider(5000);
      const resultado = await provider.geocodificar({});
      assert.strictEqual(resultado, null);
    });
  });
});
