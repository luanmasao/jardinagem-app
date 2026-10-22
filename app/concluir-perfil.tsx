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
import { colors } from '../src/presentation/theme';
import { Button, Card, TextField } from '../src/presentation/components/ui';

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
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.appTitle}>🌿 Jardinagem App</Text>
          <Text style={styles.subtitle}>Conclusão Defensiva de Perfil</Text>
        </View>

        <Card>
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
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 13,
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
    lineHeight: 18,
  },
  button: {
    marginTop: 8,
  },
  logoutButton: {
    marginTop: 12,
  },
});
