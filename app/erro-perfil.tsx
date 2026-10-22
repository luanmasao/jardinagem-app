import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '../src/presentation/contexts/auth-context';
import { colors, fonts } from '../src/presentation/theme';
import { Button } from '../src/presentation/components/ui';
import { AuthHero, AuthPainel } from '../src/presentation/components/auth/auth-hero';

/**
 * Exibida quando há sessão, mas a consulta do perfil falhou (ex.: sem conexão com o servidor).
 * Diferente de /concluir-perfil, que é só para quem realmente não tem perfil cadastrado.
 */
export default function ErroPerfilScreen() {
  const { refreshPerfil, signOut, isLoading } = useAuth();
  const [tentando, setTentando] = useState(false);

  const handleTentarNovamente = async () => {
    setTentando(true);
    try {
      await refreshPerfil();
    } finally {
      setTentando(false);
    }
  };

  return (
    <View style={styles.container}>
      <AuthHero titulo="Sem conexão" />

      <AuthPainel>
        <Text style={styles.cardTitle}>Não foi possível carregar seus dados</Text>
        <Text style={styles.cardDescription}>
          Sua sessão continua ativa, mas não conseguimos falar com o servidor agora. Verifique sua
          conexão com a internet e tente novamente.
        </Text>

        <Button
          title="Tentar novamente"
          icon="refresh"
          onPress={handleTentarNovamente}
          loading={tentando}
          disabled={isLoading}
          style={styles.button}
        />

        <Button
          title="Sair da Conta (Logout)"
          variant="neutral"
          onPress={signOut}
          disabled={tentando || isLoading}
          style={styles.logoutButton}
        />
      </AuthPainel>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primaryDark,
  },
  cardTitle: {
    fontSize: 22,
    fontFamily: fonts.extrabold,
    color: colors.text,
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    lineHeight: 18,
    marginBottom: 20,
  },
  button: {
    marginTop: 8,
  },
  logoutButton: {
    marginTop: 12,
  },
});
