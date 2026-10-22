import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/presentation/contexts/auth-context';
import { validarFormularioCadastro } from '../../src/presentation/utils/auth-form.utils';
import { colors, fonts } from '../../src/presentation/theme';
import { Button, Card, Icon, TextField } from '../../src/presentation/components/ui';

export default function RegisterScreen() {
  const router = useRouter();
  const { signUp, isLoading } = useAuth();

  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleRegister = async () => {
    setErrorMessage(null);

    const validacao = validarFormularioCadastro({
      nome,
      telefone,
      email,
      password,
      confirmPassword,
    });

    if (!validacao.valido || !validacao.payloadParaSignUp) {
      setErrorMessage(validacao.mensagemErro || 'Preencha os campos corretamente.');
      return;
    }

    const result = await signUp(validacao.payloadParaSignUp);

    if (!result.success) {
      setErrorMessage(result.error || 'Falha ao realizar cadastro.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.appTitle}><Icon name="leaf" size={26} color={colors.primary} /> Jardinagem App</Text>
          <Text style={styles.subtitle}>Criação de Perfil Profissional</Text>
        </View>

        <Card>
          <Text style={styles.cardTitle}>Criar nova conta</Text>

          {errorMessage && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {/* 1. Nome Completo */}
          <TextField
            label="Nome Completo *"
            placeholder="Ex: João da Silva"
            value={nome}
            onChangeText={setNome}
            autoCapitalize="words"
            editable={!isLoading}
          />

          {/* 2. E-mail */}
          <TextField
            label="E-mail *"
            placeholder="seu.email@exemplo.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isLoading}
          />

          {/* 3. Senha */}
          <TextField
            label="Senha * (mínimo 6 caracteres)"
            placeholder="Digite sua senha segura"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!isLoading}
          />

          {/* 4. Confirmar senha (ACH-UX-04) */}
          <TextField
            label="Confirmar senha *"
            placeholder="Repita sua senha segura"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            editable={!isLoading}
          />

          {/* 5. Telefone / WhatsApp */}
          <TextField
            label="Telefone / WhatsApp"
            placeholder="Ex: (11) 99999-9999"
            value={telefone}
            onChangeText={setTelefone}
            keyboardType="phone-pad"
            editable={!isLoading}
          />

          <Button
            title="Cadastrar"
            onPress={handleRegister}
            loading={isLoading}
            style={styles.button}
          />

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
    fontFamily: fonts.bold,
    color: colors.text,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    textAlign: 'center',
  },
  cardTitle: {
    fontSize: 20,
    fontFamily: fonts.bold,
    color: colors.text,
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
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  footerText: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
  linkText: {
    fontSize: 14,
    color: colors.primary,
    fontFamily: fonts.semibold,
  },
});
