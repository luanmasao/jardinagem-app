import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { colors, fonts } from '../../src/presentation/theme';

export default function AppLayout() {
  const router = useRouter();


  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.textOnColor,
        headerTitleStyle: { fontFamily: fonts.bold },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Sistema de Orçamentos',
          headerShown: true,
          headerRight: () => (
            <TouchableOpacity
              onPress={() => router.push('/perfil')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel="Meus dados"
            >
              <Text style={{ color: colors.textOnColor, fontSize: 15, fontFamily: fonts.bold }}>Perfil</Text>
            </TouchableOpacity>
          ),
        }}
      />
      <Stack.Screen
        name="perfil"
        options={{
          title: 'Meus Dados',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="clientes/index"
        options={{
          title: 'Clientes',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="clientes/novo"
        options={{
          title: 'Novo Cliente',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="clientes/[id]"
        options={{
          title: 'Detalhes do Cliente',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="clientes/editar"
        options={{
          title: 'Editar Cliente',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="servicos/index"
        options={{
          title: 'Serviços',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="servicos/novo"
        options={{
          title: 'Novo Serviço',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="servicos/[id]"
        options={{
          title: 'Detalhes do Serviço',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="servicos/editar"
        options={{
          title: 'Editar Serviço',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="produtos/index"
        options={{
          title: 'Produtos',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="produtos/novo"
        options={{
          title: 'Novo Produto',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="produtos/[id]"
        options={{
          title: 'Detalhes do Produto',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="produtos/editar"
        options={{
          title: 'Editar Produto',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="orcamentos/index"
        options={{
          title: 'Orçamentos',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="orcamentos/novo"
        options={{
          title: 'Novo Orçamento',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="orcamentos/[id]"
        options={{
          title: 'Detalhes do Orçamento',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="orcamentos/editar"
        options={{
          title: 'Editar Orçamento',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="orcamentos/areas"
        options={{
          title: 'Áreas do Item',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="orcamentos/mapa"
        options={{
          title: 'Delimitação no Mapa',
          headerShown: false,
        }}
      />
    </Stack>
  );
}
