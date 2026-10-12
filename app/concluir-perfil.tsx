import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useAuth } from '../src/presentation/contexts/auth-context';

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

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Complete seu cadastro</Text>
          <Text style={styles.cardDescription}>
            Sua conta de acesso está ativa, mas precisamos dos seus dados profissionais para habilitar a criação de orçamentos e serviços.
          </Text>

          {errorMessage && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>E-mail da Conta</Text>
            <TextInput
              style={[styles.input, styles.inputDisabled]}
              value={user?.email || '—'}
              editable={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nome Completo *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Carlos Jardineiro"
              placeholderTextColor="#94a3b8"
              value={nome}
              onChangeText={setNome}
              autoCapitalize="words"
              editable={!isLoading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Telefone / WhatsApp (opcional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: (11) 99999-9999"
              placeholderTextColor="#94a3b8"
              value={telefone}
              onChangeText={setTelefone}
              keyboardType="phone-pad"
              editable={!isLoading}
            />
          </View>

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleSalvarPerfil}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.buttonText}>Concluir Perfil e Acessar</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.logoutButton, isLoading && styles.buttonDisabled]}
            onPress={signOut}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            <Text style={styles.logoutButtonText}>Sair da Conta (Logout)</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
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
    color: '#1e293b',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
    marginBottom: 20,
  },
  errorContainer: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 13,
    lineHeight: 18,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0f172a',
    backgroundColor: '#f8fafc',
  },
  inputDisabled: {
    backgroundColor: '#e2e8f0',
    color: '#64748b',
  },
  button: {
    backgroundColor: '#15803d',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  logoutButton: {
    backgroundColor: '#f8fafc',
    borderColor: '#cbd5e1',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  logoutButtonText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '600',
  },
});
