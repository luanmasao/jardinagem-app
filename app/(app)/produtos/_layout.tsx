import React from 'react';
import { Stack } from 'expo-router';
import { opcoesCabecalho } from '../../../src/presentation/navigation/header-options';

// Garante a lista como base da pilha ao abrir uma rota interna diretamente.
export const unstable_settings = { initialRouteName: 'index' };

export default function ProdutosLayout() {
  return (
    <Stack screenOptions={opcoesCabecalho}>
      <Stack.Screen name="index" options={{ title: 'Produtos' }} />
      <Stack.Screen name="novo" options={{ title: 'Novo Produto' }} />
      <Stack.Screen name="[id]" options={{ title: 'Detalhes do Produto' }} />
      <Stack.Screen name="editar" options={{ title: 'Editar Produto' }} />
    </Stack>
  );
}
