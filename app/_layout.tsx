import 'react-native-get-random-values';
import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { AuthProvider, useAuth } from '../src/presentation/contexts/auth-context';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { colors } from '../src/presentation/theme';

function RootNavigation() {
  const { isAuthenticated, isLoading, perfil } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inConcluirPerfil = segments[0] === 'concluir-perfil';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && !perfil && !inConcluirPerfil) {
      router.replace('/concluir-perfil');
    } else if (isAuthenticated && perfil && (inAuthGroup || inConcluirPerfil)) {
      router.replace('/(app)');
    }
  }, [isAuthenticated, isLoading, perfil, segments, router]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(app)" options={{ headerShown: false }} />
      <Stack.Screen name="concluir-perfil" options={{ headerShown: false }} />
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigation />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});
