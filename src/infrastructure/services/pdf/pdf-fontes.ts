import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
// Importação por peso, para só os arquivos usados entrarem no app (ver app/_layout.tsx).
import { PlusJakartaSans_400Regular } from '@expo-google-fonts/plus-jakarta-sans/400Regular';
import { PlusJakartaSans_600SemiBold } from '@expo-google-fonts/plus-jakarta-sans/600SemiBold';
import { PlusJakartaSans_700Bold } from '@expo-google-fonts/plus-jakarta-sans/700Bold';
import { PlusJakartaSans_800ExtraBold } from '@expo-google-fonts/plus-jakarta-sans/800ExtraBold';

/** Pesos da Plus Jakarta Sans usados no template do PDF. */
const FONTES_PDF: readonly { peso: number; modulo: number }[] = [
  { peso: 400, modulo: PlusJakartaSans_400Regular },
  { peso: 600, modulo: PlusJakartaSans_600SemiBold },
  { peso: 700, modulo: PlusJakartaSans_700Bold },
  { peso: 800, modulo: PlusJakartaSans_800ExtraBold },
];

let fontesEmCache: Promise<string> | null = null;

async function montarFontFaceCss(): Promise<string> {
  const regras = await Promise.all(
    FONTES_PDF.map(async ({ peso, modulo }) => {
      const asset = Asset.fromModule(modulo);
      await asset.downloadAsync();
      const uri = asset.localUri ?? asset.uri;
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return `@font-face {
      font-family: "Plus Jakarta Sans";
      font-weight: ${peso};
      font-style: normal;
      src: url(data:font/ttf;base64,${base64}) format("truetype");
    }`;
    })
  );
  return regras.join('\n');
}

/**
 * Regras @font-face da Plus Jakarta Sans em base64 para embutir no HTML do PDF.
 *
 * O expo-print gera o PDF a partir do HTML no próprio aparelho (offline), então a fonte
 * precisa estar embutida no documento. O resultado fica em memória após a primeira geração
 * para não reler os arquivos a cada PDF (RNF14). Em caso de falha, retorna string vazia e o
 * PDF usa a fonte do sistema, sem interromper a geração (RNF22).
 */
export function carregarFontesPdf(): Promise<string> {
  if (!fontesEmCache) {
    fontesEmCache = montarFontFaceCss().catch((erro) => {
      console.warn('Não foi possível embutir a fonte no PDF; usando a fonte do sistema.', erro);
      fontesEmCache = null; // permite nova tentativa no próximo PDF
      return '';
    });
  }
  return fontesEmCache;
}
