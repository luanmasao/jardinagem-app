import { colors, fonts } from '../theme';

/**
 * Aparência padrão do cabeçalho das telas (pilhas de cada área e abas com cabeçalho próprio).
 */
export const opcoesCabecalho = {
  headerStyle: { backgroundColor: colors.primaryDark },
  headerTintColor: colors.textOnColor,
  headerTitleStyle: { fontFamily: fonts.bold },
  headerShadowVisible: false,
} as const;
