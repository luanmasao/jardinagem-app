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
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/presentation/contexts/auth-context';

export default function RegisterScreen() {
  const router = useRouter();
  const { signUp, isLoading } = useAuth();

  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleRegister = async () => {
    setErrorMessage(null);

    if (!nome.trim()) {
      setErrorMessage('Por favor, informe seu nome completo.');
      return;
    }
    if (!email.trim()) {
      setErrorMessage('Por favor, informe seu e-mail.');
      return;
    }
    if (!password || password.length < 6) {
      setErrorMessage('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    const result = await signUp({
      nome: nome.trim(),
      telefone: telefone.trim() || undefined,
      email: email.trim(),
      password,
    });

    if (!result.success) {
      setErrorMessage(result.error || 'Falha ao realizar cadastro.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.appTitle}>🌿 Jardinagem App</Text>
          <Text style={styles.subtitle}>Criação de Perfil Profissional</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Criar nova conta</Text>

          {errorMessage && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nome Completo *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: João da Silva"
              placeholderTextColor="#94a3b8"
              value={nome}
              onChangeText={setNome}
              autoCapitalize="words"
              editable={!isLoading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Telefone / WhatsApp</Text>
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

          <View style={styles.inputGroup}>
            <Text style={styles.label}>E-mail *</Text>
            <TextInput
              style={styles.input}
              placeholder="seu.email@exemplo.com"
              placeholderTextColor="#94a3b8"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Senha * (mínimo 6 caracteres)</Text>
            <TextInput
              style={styles.input}
              placeholder="Digite sua senha segura"
              placeholderTextColor="#94a3b8"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!isLoading}
            />
          </View>

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.buttonText}>Cadastrar</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Já possui uma conta? </Text>
            <TouchableOpacity
              onPress={() => {
                setErrorMessage(null);
                router.back();
              }}
              disabled={isLoading}
            >
              <Text style={styles.linkText}>Fazer Login</Text>
            </TouchableOpacity>
          </View>
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
    marginBottom: 14,
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
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  footerText: {
    fontSize: 14,
    color: '#64748b',
  },
  linkText: {
    fontSize: 14,
    color: '#15803d',
    fontWeight: '600',
  },
});
