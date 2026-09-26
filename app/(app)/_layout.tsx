import React from 'react';
import { Stack } from 'expo-router';

export default function AppLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: 'Sistema de Orçamentos',
          headerShown: true,
          headerStyle: { backgroundColor: '#15803d' },
          headerTintColor: '#ffffff',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      />
    </Stack>
  );
}
