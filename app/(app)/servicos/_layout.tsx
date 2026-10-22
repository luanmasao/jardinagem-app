import React from 'react';
import { Stack } from 'expo-router';
import { opcoesCabecalho } from '../../../src/presentation/navigation/header-options';

// Garante a lista como base da pilha ao abrir uma rota interna diretamente.
export const unstable_settings = { initialRouteName: 'index' };

export default function ServicosLayout() {
  return (
    <Stack screenOptions={opcoesCabecalho}>
      <Stack.Screen name="index" options={{ title: 'Serviços' }} />
      <Stack.Screen name="novo" options={{ title: 'Novo Serviço' }} />
      <Stack.Screen name="[id]" options={{ title: 'Detalhes do Serviço' }} />
      <Stack.Screen name="editar" options={{ title: 'Editar Serviço' }} />
    </Stack>
  );
}
