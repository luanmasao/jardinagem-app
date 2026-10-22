import React from 'react';
import { View, StyleSheet } from 'react-native';
import { usePathname } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { colors, fonts } from '../../src/presentation/theme';
import { Icon, IconName } from '../../src/presentation/components/ui';
import { opcoesCabecalho } from '../../src/presentation/navigation/header-options';

/**
 * A barra inferior aparece só nas telas principais de cada aba.
 * Formulários, detalhes, áreas, mapa e as listas de serviços/produtos ficam sem ela.
 */
const ROTAS_COM_BARRA = ['/', '/orcamentos', '/clientes', '/catalogo', '/perfil'];

function iconeDaAba(nome: IconName) {
  return function IconeAba({ focused }: { focused: boolean }) {
    return (
      <View style={[styles.iconeAba, focused && styles.iconeAbaAtivo]}>
        <Icon name={nome} size={20} color={focused ? colors.primaryDark : colors.textMuted} />
      </View>
    );
  };
}

export default function AppLayout() {
  const pathname = usePathname();
  const mostrarBarra = ROTAS_COM_BARRA.includes(pathname);

  return (
    <Tabs
      backBehavior="history"
      screenOptions={{
        ...opcoesCabecalho,
        tabBarActiveTintColor: colors.primaryDark,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: styles.rotuloAba,
        tabBarStyle: mostrarBarra ? styles.barra : { display: 'none' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Sistema de Orçamentos', tabBarLabel: 'Início', tabBarIcon: iconeDaAba('home') }}
      />
      <Tabs.Screen
        name="orcamentos"
        options={{ headerShown: false, tabBarLabel: 'Orçamentos', tabBarIcon: iconeDaAba('file') }}
      />
      <Tabs.Screen
        name="clientes"
        options={{ headerShown: false, tabBarLabel: 'Clientes', tabBarIcon: iconeDaAba('users') }}
      />
      <Tabs.Screen
        name="catalogo"
        options={{ title: 'Catálogo', tabBarLabel: 'Catálogo', tabBarIcon: iconeDaAba('leaf') }}
      />
      <Tabs.Screen
        name="perfil"
        options={{ title: 'Meus Dados', tabBarLabel: 'Perfil', tabBarIcon: iconeDaAba('user') }}
      />

      {/* Rotas sem aba própria: acessadas pelo Catálogo */}
      <Tabs.Screen name="servicos" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="produtos" options={{ href: null, headerShown: false }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  barra: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
  },
  rotuloAba: {
    fontSize: 11,
    fontFamily: fonts.semibold,
  },
  iconeAba: {
    width: 56,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconeAbaAtivo: {
    backgroundColor: colors.primarySoft,
  },
});
