import React from 'react';
import { Stack } from 'expo-router';
import { opcoesCabecalho } from '../../../src/presentation/navigation/header-options';

// Garante a lista como base da pilha ao abrir uma rota interna diretamente.
export const unstable_settings = { initialRouteName: 'index' };

export default function OrcamentosLayout() {
  return (
    <Stack screenOptions={opcoesCabecalho}>
      <Stack.Screen name="index" options={{ title: 'Orçamentos' }} />
      <Stack.Screen name="novo" options={{ title: 'Novo Orçamento' }} />
      <Stack.Screen name="[id]" options={{ title: 'Detalhes do Orçamento' }} />
      <Stack.Screen name="editar" options={{ title: 'Editar Orçamento' }} />
      <Stack.Screen name="areas" options={{ title: 'Áreas do Item' }} />
      <Stack.Screen name="mapa" options={{ title: 'Delimitação no Mapa', headerShown: false }} />
    </Stack>
  );
}
