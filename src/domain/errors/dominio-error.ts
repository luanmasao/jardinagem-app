export class DominioError extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = 'DominioError';
  }
}

export class RegraNegocioError extends DominioError {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = 'RegraNegocioError';
  }
}

export class TransicaoInvalidaError extends DominioError {
  constructor(statusOrigem: string, statusDestino: string) {
    super(`Transição de status inválida de '${statusOrigem}' para '${statusDestino}'.`);
    this.name = 'TransicaoInvalidaError';
  }
}

export class ValidacaoEnvioError extends DominioError {
  public readonly erros: string[];

  constructor(erros: string[]) {
    super(`Orçamento inválido para envio: ${erros.join('; ')}`);
    this.name = 'ValidacaoEnvioError';
    this.erros = erros;
  }
}
