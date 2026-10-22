/**
 * Paleta de cores única da interface.
 *
 * As telas devem referenciar estes tokens pelo papel da cor (texto, fundo, borda,
 * feedback), e não por valores hexadecimais fixos.
 *
 * As cores dos status de orçamento continuam em `utils/status-orcamento.utils.ts`.
 */
export const colors = Object.freeze({
  // Marca
  primary: '#2F6B47',
  primaryDark: '#1E4D34',
  primarySoft: '#DCEBDD',
  primarySubtle: '#EEF5EE',
  primaryBorder: '#A9CBB0',

  // Fundos e superfícies
  background: '#F5F6F1',
  surface: '#FFFFFF',
  surfaceMuted: '#EEF0EC',
  surfaceSubtle: '#FAFAF7',
  black: '#000000',
  overlay: 'rgba(0, 0, 0, 0.5)',

  // Bordas
  border: '#E3E7E0',
  borderStrong: '#D5DBD2',

  // Texto
  text: '#18221B',
  textSecondary: '#3F4A42',
  textMuted: '#5A665D',
  textPlaceholder: '#8A948C',
  textOnColor: '#FFFFFF',

  // Feedback
  danger: '#B23A2E',
  dangerSoft: '#F8E6E3',
  dangerBorder: '#EBC4BE',
  warning: '#7A4F0E',
  warningSoft: '#FBEFD9',
  warningBorder: '#F0D29A',
  info: '#234E8C',
  infoSoft: '#E6EEF8',
  infoBorder: '#BFD2EC',
  teal: '#155A52',
  tealSoft: '#DFF0EE',
  tealBorder: '#B5DCD6',
  analysis: '#553A97',
  analysisSoft: '#EEEAF7',
  analysisBorder: '#D6CCEC',
  slate: '#46505A',
  slateSoft: '#ECEEF0',
  slateBorder: '#D2D7DC',

  shadow: '#000000',
});

/**
 * Famílias da fonte Plus Jakarta Sans, carregadas no layout raiz (app/_layout.tsx).
 *
 * No Android, fontes customizadas não selecionam o peso por `fontWeight`: cada peso é
 * uma família própria. Use `fontFamily: fonts.bold` em vez de `fontWeight: 'bold'`.
 */
export const fonts = Object.freeze({
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
});
