import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Usuario, Cliente, Endereco, RegraNegocioError } from '../../src/domain';

describe('Usuario, Cliente e Endereco', () => {
  it('RN01, RN02: usuario deve validar nome e permitir ativar/desativar', () => {
    const user = new Usuario({
      id: 'usr-1',
      nome: 'Carlos Jardineiro',
      telefone: '11999998888',
    });

    assert.strictEqual(user.id, 'usr-1');
    assert.strictEqual(user.nome, 'Carlos Jardineiro');
    assert.strictEqual(user.ativo, true);

    user.desativar();
    assert.strictEqual(user.ativo, false);
    user.ativar();
    assert.strictEqual(user.ativo, true);
  });

  it('RN03, RN04, RN05: cliente deve pertencer a um usuário e permitir endereço opcional', () => {
    const cliente = new Cliente({
      id: 'cli-1',
      usuarioId: 'usr-1',
      nome: 'Maria da Silva',
      telefone: '11988887777',
      email: 'maria@email.com',
    });

    assert.strictEqual(cliente.usuarioId, 'usr-1');
    assert.strictEqual(cliente.nome, 'Maria da Silva');
    assert.strictEqual(cliente.endereco, null);

    const endereco = new Endereco({
      id: 'end-1',
      clienteId: cliente.id,
      logradouro: 'Rua das Flores',
      numero: '123',
      bairro: 'Jardins',
      cidade: 'São Paulo',
      estado: 'SP',
      latitude: -23.56,
      longitude: -46.65,
    });

    cliente.definirEndereco(endereco);
    const enderecoCadastrado = cliente.endereco as Endereco | null;
    assert.ok(enderecoCadastrado);
    assert.strictEqual(enderecoCadastrado.cidade, 'São Paulo');

    cliente.removerEndereco();
    assert.strictEqual(cliente.endereco as Endereco | null, null);
  });

  it('deve rejeitar endereço associado a outro cliente', () => {
    const cliente1 = new Cliente({
      id: 'cli-1',
      usuarioId: 'usr-1',
      nome: 'Cliente 1',
    });

    const enderecoOutro = new Endereco({
      id: 'end-2',
      clienteId: 'outro-cliente',
      logradouro: 'Av. Paulista',
    });

    assert.throws(() => cliente1.definirEndereco(enderecoOutro), RegraNegocioError);
  });
});
