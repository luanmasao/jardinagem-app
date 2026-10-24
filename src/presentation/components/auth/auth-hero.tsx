import React, { useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../../theme';
import { Icon } from '../ui';

interface AuthHeroProps {
  titulo: string;
  subtitulo?: string;
}

/**
 * Faixa verde do topo das telas de acesso (login, cadastro e conclusão de perfil).
 * Enquanto a tela está em foco, a barra de status usa ícones claros para aparecer sobre o verde.
 */
export const AuthHero: React.FC<AuthHeroProps> = ({ titulo, subtitulo }) => {
  const insets = useSafeAreaInsets();

  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('light');
      return () => setStatusBarStyle('auto');
    }, [])
  );

  return (
    <View style={[styles.hero, { paddingTop: insets.top + 32 }]}>
      <View style={styles.marca}>
        <View style={styles.marcaIcone}>
          <Icon name="leaf" size={26} color={colors.primaryDark} />
        </View>
        <Text style={styles.marcaNome}>Área Verde</Text>
      </View>
      <Text style={styles.titulo}>{titulo}</Text>
      {subtitulo ? <Text style={styles.subtitulo}>{subtitulo}</Text> : null}
    </View>
  );
};

/**
 * Painel claro que fica sob a faixa verde e recebe o formulário.
 */
export const AuthPainel: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const insets = useSafeAreaInsets();
  return <View style={[styles.painel, { paddingBottom: 24 + insets.bottom }]}>{children}</View>;
};

const styles = StyleSheet.create({
  hero: {
    backgroundColor: colors.primaryDark,
    paddingHorizontal: 28,
    paddingBottom: 32,
  },
  marca: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  marcaIcone: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  marcaNome: {
    fontSize: 16,
    fontFamily: fonts.bold,
    color: colors.primarySoft,
  },
  titulo: {
    fontSize: 30,
    lineHeight: 36,
    fontFamily: fonts.extrabold,
    color: colors.textOnColor,
  },
  subtitulo: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: fonts.regular,
    color: colors.primarySoft,
    marginTop: 8,
  },
  painel: {
    flex: 1,
    backgroundColor: colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -4,
    paddingHorizontal: 24,
    paddingTop: 28,
  },
});
