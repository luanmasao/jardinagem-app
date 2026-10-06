import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { ExpoSharingShareProvider } from '../../src/infrastructure/services/share/expo-sharing.provider';
import { __mockSharing } from '../mocks/expo-sharing';
import { __mockFileSystem, cacheDirectory } from '../mocks/expo-file-system-legacy';

describe('Bloco C — ExpoSharingShareProvider Infrastructure Unit Tests', () => {
  let provider: ExpoSharingShareProvider;
  const uriCacheValida = `${cacheDirectory}documento_orig.pdf`;

  beforeEach(() => {
    __mockSharing.reset();
    __mockFileSystem.reset();
    provider = new ExpoSharingShareProvider();
  });

  // 1. isAvailable() -> true
  it('1. Deve retornar true quando Sharing.isAvailableAsync() resolver com true', async () => {
    __mockSharing.setAvailable(true);
    const disponivel = await provider.isAvailable();
    assert.strictEqual(disponivel, true);
  });

  // 2. isAvailable() -> false
  it('2. Deve retornar false quando Sharing.isAvailableAsync() resolver com false', async () => {
    __mockSharing.setAvailable(false);
    const disponivel = await provider.isAvailable();
    assert.strictEqual(disponivel, false);
  });

  // 3. isAvailableAsync() rejeitando
  it('3. Deve capturar erro e retornar false quando isAvailableAsync() rejeitar com exceção', async () => {
    __mockSharing.setAvailableReject(new Error('Falha no subsistema nativo de compartilhamento'));
    const disponivel = await provider.isAvailable();
    assert.strictEqual(disponivel, false);
  });

  // 4. verificarArquivoExiste() com arquivo existente
  it('4. Deve retornar true para arquivo existente no cache autorizado', async () => {
    __mockFileSystem.addExistingFile(uriCacheValida);
    const existe = await provider.verificarArquivoExiste(uriCacheValida);
    assert.strictEqual(existe, true);
  });

  // 5. verificarArquivoExiste() com arquivo inexistente
  it('5. Deve retornar false quando o arquivo não existir fisicamente no cache', async () => {
    const existe = await provider.verificarArquivoExiste(`${cacheDirectory}inexistente.pdf`);
    assert.strictEqual(existe, false);
  });

  // 6. rejeição de URI fora de file://
  it('6. Deve rejeitar URIs que não utilizem o esquema file://', async () => {
    assert.strictEqual(await provider.verificarArquivoExiste('https://servidor.com/arquivo.pdf'), false);
    assert.strictEqual(await provider.verificarArquivoExiste('content://com.jardinagem.app/doc.pdf'), false);
    assert.strictEqual(await provider.verificarArquivoExiste('/storage/emulated/0/doc.pdf'), false);
    assert.strictEqual(await provider.verificarArquivoExiste(''), false);
    assert.strictEqual(await provider.verificarArquivoExiste(null as unknown as string), false);
  });

  // 7. rejeição de URI fora de cacheDirectory (ACHADO-SHARE-10)
  it('7. ACHADO-SHARE-10: Deve rejeitar estritamente URIs fora do cacheDirectory ou com path traversal', async () => {
    const uriForaDoCache = 'file:///data/user/0/com.jardinagem.app/files/orcamento.pdf';
    __mockFileSystem.addExistingFile(uriForaDoCache);
    assert.strictEqual(await provider.verificarArquivoExiste(uriForaDoCache), false);

    const uriComTraversal = `${cacheDirectory}../shared_prefs/secret.pdf`;
    __mockFileSystem.addExistingFile(uriComTraversal);
    assert.strictEqual(await provider.verificarArquivoExiste(uriComTraversal), false);

    const uriSdcard = 'file:///sdcard/Download/orcamento.pdf';
    __mockFileSystem.addExistingFile(uriSdcard);
    assert.strictEqual(await provider.verificarArquivoExiste(uriSdcard), false);
  });

  // 8. rejeição de arquivo não-PDF
  it('8. Deve rejeitar arquivos cuja extensão não seja .pdf', async () => {
    const uriPng = `${cacheDirectory}foto.png`;
    __mockFileSystem.addExistingFile(uriPng);
    assert.strictEqual(await provider.verificarArquivoExiste(uriPng), false);

    const uriTxt = `${cacheDirectory}documento.txt`;
    __mockFileSystem.addExistingFile(uriTxt);
    assert.strictEqual(await provider.verificarArquivoExiste(uriTxt), false);
  });

  // 9. cópia para nome canônico
  it('9. Deve copiar o arquivo para o nome institucional canônico antes de compartilhar', async () => {
    __mockFileSystem.addExistingFile(uriCacheValida);

    const res = await provider.share({
      fileUri: uriCacheValida,
      mimeType: 'application/pdf',
      dialogTitle: 'Compartilhar Proposta',
      nomeArquivo: 'Orcamento_ORC-2026-001.pdf',
    });

    assert.strictEqual(res.sucesso, true);
    assert.strictEqual(res.status, 'DISPARADO');

    const copyCalls = __mockFileSystem.getCopyCalls();
    assert.strictEqual(copyCalls.length, 1);
    assert.strictEqual(copyCalls[0].from, uriCacheValida);
    assert.strictEqual(copyCalls[0].to, `${cacheDirectory}Orcamento_ORC-2026-001.pdf`);
  });

  // 10. sanitização do nome
  it('10. Deve sanitizar caracteres especiais e espaços no nome canônico', async () => {
    __mockFileSystem.addExistingFile(uriCacheValida);

    await provider.share({
      fileUri: uriCacheValida,
      mimeType: 'application/pdf',
      dialogTitle: 'Proposta Comercial',
      nomeArquivo: 'Orçamento Comercial #01 [Final] / 2026.pdf',
    });

    const copyCalls = __mockFileSystem.getCopyCalls();
    assert.strictEqual(copyCalls.length, 1);
    // Caracteres não alfanuméricos exceto . _ - devem virar _
    assert.strictEqual(copyCalls[0].to, `${cacheDirectory}Or_amento_Comercial__01__Final____2026.pdf`);
  });

  // 11. URI final apontando para o arquivo preparado
  it('11. Deve repassar a URI do arquivo preparado e copiado para o Sharing.shareAsync', async () => {
    __mockFileSystem.addExistingFile(uriCacheValida);

    await provider.share({
      fileUri: uriCacheValida,
      mimeType: 'application/pdf',
      dialogTitle: 'Proposta Comercial',
      nomeArquivo: 'Orcamento_ORC-2026-042.pdf',
    });

    const shareCalls = __mockSharing.getCalls();
    assert.strictEqual(shareCalls.length, 1);
    assert.strictEqual(shareCalls[0].url, `${cacheDirectory}Orcamento_ORC-2026-042.pdf`);
  });

  // 12. mimeType application/pdf
  it('12. Deve fornecer mimeType application/pdf nas opções do Sharing.shareAsync', async () => {
    __mockFileSystem.addExistingFile(uriCacheValida);

    await provider.share({
      fileUri: uriCacheValida,
      mimeType: 'application/pdf',
      dialogTitle: 'Enviar Proposta',
      nomeArquivo: 'Orcamento_ORC-2026-001.pdf',
    });

    const shareCalls = __mockSharing.getCalls();
    assert.strictEqual(shareCalls[0].options?.mimeType, 'application/pdf');
    assert.strictEqual(shareCalls[0].options?.UTI, 'com.adobe.pdf');
  });

  // 13. dialogTitle correto
  it('13. Deve repassar o dialogTitle correto para as opções do Sharing.shareAsync', async () => {
    __mockFileSystem.addExistingFile(uriCacheValida);

    await provider.share({
      fileUri: uriCacheValida,
      mimeType: 'application/pdf',
      dialogTitle: 'Enviar Proposta de Jardinagem',
      nomeArquivo: 'Orcamento_ORC-2026-001.pdf',
    });

    const shareCalls = __mockSharing.getCalls();
    assert.strictEqual(shareCalls[0].options?.dialogTitle, 'Enviar Proposta de Jardinagem');
  });

  // 14. shareAsync() resolvendo normalmente
  it('14. Deve retornar sucesso true e status DISPARADO quando shareAsync resolver normalmente', async () => {
    __mockFileSystem.addExistingFile(uriCacheValida);

    const resultado = await provider.share({
      fileUri: uriCacheValida,
      mimeType: 'application/pdf',
      dialogTitle: 'Enviar Proposta',
      nomeArquivo: 'Orcamento_ORC-2026-001.pdf',
    });

    assert.deepStrictEqual(resultado, {
      sucesso: true,
      status: 'DISPARADO',
    });
  });

  // 15. shareAsync() rejeitando com erro genérico
  it('15. Deve retornar sucesso false e status ERRO quando shareAsync rejeitar com falha técnica genérica', async () => {
    __mockFileSystem.addExistingFile(uriCacheValida);
    __mockSharing.setShareAsyncHandler(async () => {
      throw new Error('Falha no IPC nativo do Android');
    });

    const resultado = await provider.share({
      fileUri: uriCacheValida,
      mimeType: 'application/pdf',
      dialogTitle: 'Enviar Proposta',
      nomeArquivo: 'Orcamento_ORC-2026-001.pdf',
    });

    assert.strictEqual(resultado.sucesso, false);
    assert.strictEqual(resultado.status, 'ERRO');
    assert.ok(resultado.mensagem?.includes('Falha técnica ao acionar o compartilhamento'));
  });

  // 16. ActivityNotFoundException / No activity found (ACHADO-SHARE-11)
  it('16. ACHADO-SHARE-11: Deve mapear ActivityNotFoundException para status INDISPONIVEL', async () => {
    __mockFileSystem.addExistingFile(uriCacheValida);
    __mockSharing.setShareAsyncHandler(async () => {
      throw new Error('android.content.ActivityNotFoundException: No Activity found to handle Intent { act=android.intent.action.CHOOSER }');
    });

    const resultado = await provider.share({
      fileUri: uriCacheValida,
      mimeType: 'application/pdf',
      dialogTitle: 'Enviar Proposta',
      nomeArquivo: 'Orcamento_ORC-2026-001.pdf',
    });

    assert.strictEqual(resultado.sucesso, false);
    assert.strictEqual(resultado.status, 'INDISPONIVEL');
    assert.ok(resultado.mensagem?.includes('Nenhum aplicativo compatível'));
  });

  // 17. falha no copyAsync() (ACHADO-SHARE-12)
  it('17. ACHADO-SHARE-12: Falha no copyAsync não deve quebrar a execução do fluxo', async () => {
    __mockFileSystem.addExistingFile(uriCacheValida);
    __mockFileSystem.setCopyAsyncHandler(async () => {
      throw new Error('Espaço em disco temporariamente insuficiente');
    });

    const resultado = await provider.share({
      fileUri: uriCacheValida,
      mimeType: 'application/pdf',
      dialogTitle: 'Enviar Proposta',
      nomeArquivo: 'Orcamento_ORC-2026-001.pdf',
    });

    // Operação deve prosseguir mesmo com falha na cópia
    assert.strictEqual(resultado.sucesso, true);
    assert.strictEqual(resultado.status, 'DISPARADO');
  });

  // 18. fallback para URI original quando copyAsync falha (ACHADO-SHARE-12)
  it('18. ACHADO-SHARE-12: Deve utilizar a URI original como fallback quando copyAsync falhar', async () => {
    __mockFileSystem.addExistingFile(uriCacheValida);
    __mockFileSystem.setCopyAsyncHandler(async () => {
      throw new Error('EACCES: permission denied');
    });

    await provider.share({
      fileUri: uriCacheValida,
      mimeType: 'application/pdf',
      dialogTitle: 'Enviar Proposta',
      nomeArquivo: 'Orcamento_ORC-2026-001.pdf',
    });

    const shareCalls = __mockSharing.getCalls();
    assert.strictEqual(shareCalls.length, 1);
    // Utilizou a URI original como fallback seguro
    assert.strictEqual(shareCalls[0].url, uriCacheValida);
  });

  // 19. warning no console quando ocorrer fallback (ACHADO-SHARE-12)
  it('19. ACHADO-SHARE-12: Deve emitir console.warn quando o fallback for acionado', async () => {
    __mockFileSystem.addExistingFile(uriCacheValida);
    __mockFileSystem.setCopyAsyncHandler(async () => {
      throw new Error('Disk full');
    });

    const warnings: any[] = [];
    const origWarn = console.warn;
    console.warn = (...args: any[]) => warnings.push(args);

    try {
      await provider.share({
        fileUri: uriCacheValida,
        mimeType: 'application/pdf',
        dialogTitle: 'Enviar Proposta',
        nomeArquivo: 'Orcamento_ORC-2026-001.pdf',
      });

      assert.strictEqual(warnings.length >= 1, true);
      const primeiroAviso = warnings[0].join(' ');
      assert.ok(primeiroAviso.includes('[ExpoSharingShareProvider] Falha ao copiar arquivo para nome canônico'));
    } finally {
      console.warn = origWarn;
    }
  });

  // 20. ausência de lógica de cancelamento por strings
  it('20. Deve retornar DISPARADO sem criar estados artificiais ou tentar adivinhar cancelamento por strings', async () => {
    __mockFileSystem.addExistingFile(uriCacheValida);
    __mockSharing.setShareAsyncHandler(async () => {
      // No Android nativo, a Share Sheet resolve void quando a intent do chooser conclui
      return;
    });

    const resultado = await provider.share({
      fileUri: uriCacheValida,
      mimeType: 'application/pdf',
      dialogTitle: 'Enviar Proposta',
      nomeArquivo: 'Orcamento_ORC-2026-001.pdf',
    });

    // O status é estritamente 'DISPARADO', sem estados 'CANCELADO' ou 'COMPARTILHADO'
    assert.strictEqual(resultado.status, 'DISPARADO');
    assert.strictEqual(resultado.sucesso, true);
  });

  it('21. Deve retornar status INDISPONIVEL sem chamar o sistema quando isAvailable() for false', async () => {
    __mockSharing.setAvailable(false);
    __mockFileSystem.addExistingFile(uriCacheValida);

    const resultado = await provider.share({
      fileUri: uriCacheValida,
      mimeType: 'application/pdf',
      dialogTitle: 'Enviar Proposta',
      nomeArquivo: 'Orcamento_ORC-2026-001.pdf',
    });

    assert.strictEqual(resultado.sucesso, false);
    assert.strictEqual(resultado.status, 'INDISPONIVEL');
    assert.strictEqual(__mockSharing.getCalls().length, 0);
  });

  it('22. Deve retornar status ERRO sem acionar compartilhamento se o arquivo não existir fisicamente', async () => {
    // Arquivo não adicionado ao mock de filesystem
    const resultado = await provider.share({
      fileUri: `${cacheDirectory}arquivo_inexistente.pdf`,
      mimeType: 'application/pdf',
      dialogTitle: 'Enviar Proposta',
      nomeArquivo: 'Orcamento_ORC-2026-001.pdf',
    });

    assert.strictEqual(resultado.sucesso, false);
    assert.strictEqual(resultado.status, 'ERRO');
    assert.strictEqual(__mockSharing.getCalls().length, 0);
  });
});
