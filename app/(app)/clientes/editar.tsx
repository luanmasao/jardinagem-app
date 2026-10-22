import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { clienteService } from '../../../src/application/services/cliente.service';
import { colors } from '../../../src/presentation/theme';

export default function EditarClienteScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  // Estados de dados
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [documento, setDocumento] = useState('');
  const [observacoes, setObservacoes] = useState('');

  // Estados de endereço
  const [cep, setCep] = useState('');
  const [logradouro, setLogradouro] = useState('');
  const [numero, setNumero] = useState('');
  const [complemento, setComplemento] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('');

  // Estados de controle
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function carregarCliente() {
      if (!id) {
        setErrorMessage('ID do cliente não informado.');
        setIsLoading(false);
        return;
      }

      try {
        const cliente = await clienteService.obterCliente(id);
        if (!cliente) {
          setErrorMessage('Cliente não encontrado.');
        } else {
          setNome(cliente.nome || '');
          setTelefone(cliente.telefone || '');
          setEmail(cliente.email || '');
          setDocumento(cliente.documento || '');
          setObservacoes(cliente.observacoes || '');

          if (cliente.endereco) {
            setCep(cliente.endereco.cep || '');
            setLogradouro(cliente.endereco.logradouro || '');
            setNumero(cliente.endereco.numero || '');
            setComplemento(cliente.endereco.complemento || '');
            setBairro(cliente.endereco.bairro || '');
            setCidade(cliente.endereco.cidade || '');
            setEstado(cliente.endereco.estado || '');
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Falha ao carregar dados do cliente.';
        setErrorMessage(msg);
      } finally {
        setIsLoading(false);
      }
    }

    carregarCliente();
  }, [id]);

  const handleSubmit = async () => {
    if (isSubmitting || !id) return;

    if (!nome.trim()) {
      setErrorMessage('O nome do cliente é obrigatório.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const temEndereco =
        cep.trim() ||
        logradouro.trim() ||
        numero.trim() ||
        complemento.trim() ||
        bairro.trim() ||
        cidade.trim() ||
        estado.trim();

      const enderecoPayload = temEndereco
        ? {
            cep: cep.trim() || null,
            logradouro: logradouro.trim() || null,
            numero: numero.trim() || null,
            complemento: complemento.trim() || null,
            bairro: bairro.trim() || null,
            cidade: cidade.trim() || null,
            estado: estado.trim().toUpperCase() || null,
          }
        : null;

      const clienteAtualizado = await clienteService.atualizarCliente(id, {
        nome: nome.trim(),
        telefone: telefone.trim() || null,
        email: email.trim() || null,
        documento: documento.trim() || null,
        observacoes: observacoes.trim() || null,
        endereco: enderecoPayload,
      });

      const temCoords = Boolean(
        clienteAtualizado.endereco &&
        clienteAtualizado.endereco.latitude != null &&
        clienteAtualizado.endereco.longitude != null
      );

      // Se endereço foi informado/alterado mas coordenadas automáticas não foram obtidas, informa amigavelmente
      if (enderecoPayload && !temCoords && Platform.OS !== 'web') {
        Alert.alert(
          'Cliente Atualizado',
          'Os dados foram atualizados com sucesso. A localização automática no mapa não foi obtida e poderá ser definida manualmente.',
          [
            {
              text: 'OK',
              onPress: () => router.back(),
            },
          ]
        );
      } else {
        router.back();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao atualizar cliente.';
      setErrorMessage(msg);
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Carregando dados para edição...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.keyboardContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {errorMessage ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        {/* Seção 1: Dados Pessoais */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Dados Principais</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Nome Completo <Text style={styles.requiredAsterisk}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Maria da Silva"
              placeholderTextColor={colors.textPlaceholder}
              value={nome}
              onChangeText={setNome}
              maxLength={150}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Telefone / WhatsApp</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: (11) 98888-7777"
              placeholderTextColor={colors.textPlaceholder}
              value={telefone}
              onChangeText={setTelefone}
              maxLength={30}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>E-mail</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: cliente@email.com"
              placeholderTextColor={colors.textPlaceholder}
              value={email}
              onChangeText={setEmail}
              maxLength={255}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Documento (CPF / CNPJ)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: 123.456.789-00"
              placeholderTextColor={colors.textPlaceholder}
              value={documento}
              onChangeText={setDocumento}
              maxLength={30}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Observações</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Notas gerais sobre o cliente..."
              placeholderTextColor={colors.textPlaceholder}
              value={observacoes}
              onChangeText={setObservacoes}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Seção 2: Endereço */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Endereço</Text>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>CEP</Text>
              <TextInput
                style={styles.input}
                placeholder="00000-000"
                placeholderTextColor={colors.textPlaceholder}
                value={cep}
                onChangeText={setCep}
                maxLength={10}
                keyboardType="numeric"
              />
            </View>

            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Estado (UF)</Text>
              <TextInput
                style={styles.input}
                placeholder="SP"
                placeholderTextColor={colors.textPlaceholder}
                value={estado}
                onChangeText={setEstado}
                maxLength={2}
                autoCapitalize="characters"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Cidade</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: São Paulo"
              placeholderTextColor={colors.textPlaceholder}
              value={cidade}
              onChangeText={setCidade}
              maxLength={100}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Bairro</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Jardim Paulista"
              placeholderTextColor={colors.textPlaceholder}
              value={bairro}
              onChangeText={setBairro}
              maxLength={100}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 2, marginRight: 8 }]}>
              <Text style={styles.label}>Logradouro (Rua / Av.)</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Rua das Flores"
                placeholderTextColor={colors.textPlaceholder}
                value={logradouro}
                onChangeText={setLogradouro}
                maxLength={200}
              />
            </View>

            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Número</Text>
              <TextInput
                style={styles.input}
                placeholder="123"
                placeholderTextColor={colors.textPlaceholder}
                value={numero}
                onChangeText={setNumero}
                maxLength={20}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Complemento</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Casa 2 / Bloco B"
              placeholderTextColor={colors.textPlaceholder}
              value={complemento}
              onChangeText={setComplemento}
              maxLength={100}
            />
          </View>
        </View>

        {/* Botão de Salvar Alterações */}
        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
          activeOpacity={0.8}
        >
          {isSubmitting ? (
            <ActivityIndicator color={colors.surface} />
          ) : (
            <Text style={styles.submitButtonText}>Salvar Alterações</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => router.back()}
          disabled={isSubmitting}
          activeOpacity={0.8}
        >
          <Text style={styles.cancelButtonText}>Cancelar</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 80,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textMuted,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dangerSoft,
    borderColor: colors.dangerBorder,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  errorText: {
    fontSize: 13,
    color: colors.danger,
    flex: 1,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  requiredAsterisk: {
    color: colors.danger,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
  },
  textArea: {
    minHeight: 70,
  },
  row: {
    flexDirection: 'row',
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 10,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: colors.textOnColor,
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: colors.border,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  cancelButtonText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
});
