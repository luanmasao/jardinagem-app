import 'react-native-get-random-values';
import React, { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import {
  useFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { AuthProvider, useAuth } from '../src/presentation/contexts/auth-context';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { colors } from '../src/presentation/theme';

function RootNavigation({ fontesProntas }: { fontesProntas: boolean }) {
  const { isAuthenticated, isLoading, perfil } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // isLoading também fica true durante login, cadastro, saída e conclusão de perfil.
  // A tela de carregamento cobre só a verificação inicial da sessão: depois dela a navegação
  // permanece montada, para que a tela atual não seja recriada e possa exibir erros
  // (ex.: senha incorreta) com os campos preenchidos.
  const [sessaoVerificada, setSessaoVerificada] = useState(false);
  useEffect(() => {
    if (!isLoading) setSessaoVerificada(true);
  }, [isLoading]);

  useEffect(() => {
    // Só redireciona depois que o Stack estiver montado (fontes prontas e sessão verificada)
    // e fora de uma operação de autenticação em andamento.
    if (isLoading || !sessaoVerificada || !fontesProntas) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inConcluirPerfil = segments[0] === 'concluir-perfil';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && !perfil && !inConcluirPerfil) {
      router.replace('/concluir-perfil');
    } else if (isAuthenticated && perfil && (inAuthGroup || inConcluirPerfil)) {
      router.replace('/(app)');
    }
  }, [isAuthenticated, isLoading, sessaoVerificada, perfil, segments, router, fontesProntas]);

  if (!sessaoVerificada || !fontesProntas) {
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
  const [fontesCarregadas, erroFontes] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  // Se a fonte falhar ao carregar, o app segue com a fonte do sistema em vez de travar.
  const fontesProntas = fontesCarregadas || erroFontes != null;

  return (
    <AuthProvider>
      <RootNavigation fontesProntas={fontesProntas} />
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
