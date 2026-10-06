import React from 'react';
import { Stack } from 'expo-router';

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#15803d' },
        headerTintColor: '#ffffff',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Sistema de Orçamentos',
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
