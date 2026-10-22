import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useAuth } from '../src/presentation/contexts/auth-context';
import { colors, fonts } from '../src/presentation/theme';
import { Button, TextField } from '../src/presentation/components/ui';
import { AuthHero, AuthPainel } from '../src/presentation/components/auth/auth-hero';

export default function ConcluirPerfilScreen() {
  const { user, concluirPerfil, signOut, isLoading } = useAuth();

  const [nome, setNome] = useState(user?.nome || '');
  const [telefone, setTelefone] = useState(user?.telefone || '');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSalvarPerfil = async () => {
    setErrorMessage(null);

    if (!nome.trim()) {
      setErrorMessage('Por favor, informe seu nome completo.');
      return;
    }

    const result = await concluirPerfil({
      nome: nome.trim(),
      telefone: telefone.trim() || undefined,
    });

    if (!result.success) {
      setErrorMessage(result.error || 'Falha ao salvar perfil. Tente novamente.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        <AuthHero titulo={'Conclusão Defensiva\nde Perfil'} />

        <AuthPainel>
          <Text style={styles.cardTitle}>Complete seu cadastro</Text>
          <Text style={styles.cardDescription}>
            Sua conta de acesso está ativa, mas precisamos dos seus dados profissionais para habilitar a criação de orçamentos e serviços.
          </Text>

          {errorMessage && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          <TextField
            label="E-mail da Conta"
            value={user?.email || '—'}
            editable={false}
          />

          <TextField
            label="Nome Completo *"
            placeholder="Ex: Carlos Jardineiro"
            value={nome}
            onChangeText={setNome}
            autoCapitalize="words"
            editable={!isLoading}
          />

          <TextField
            label="Telefone / WhatsApp (opcional)"
            placeholder="Ex: (11) 99999-9999"
            value={telefone}
            onChangeText={setTelefone}
            keyboardType="phone-pad"
            editable={!isLoading}
          />

          <Button
            title="Concluir Perfil e Acessar"
            onPress={handleSalvarPerfil}
            loading={isLoading}
            style={styles.button}
          />

          <Button
            title="Sair da Conta (Logout)"
            variant="neutral"
            onPress={signOut}
            disabled={isLoading}
            style={styles.logoutButton}
          />
        </AuthPainel>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primaryDark,
  },
  scrollContent: {
    flexGrow: 1,
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
  errorContainer: {
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    fontFamily: fonts.regular,
    lineHeight: 18,
  },
  button: {
    marginTop: 8,
  },
  logoutButton: {
    marginTop: 12,
  },
});
