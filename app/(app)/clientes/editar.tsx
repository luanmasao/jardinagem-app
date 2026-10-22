import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { clienteService } from '../../../src/application/services/cliente.service';
import { colors, fonts } from '../../../src/presentation/theme';
import { Button, Card, Icon, TextField } from '../../../src/presentation/components/ui';

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
            <Icon name="alert" size={16} color={colors.danger} style={styles.errorIcon} />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        {/* Seção 1: Dados Pessoais */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Dados Principais</Text>

          <TextField
            label="Nome Completo"
            required
            placeholder="Ex: Maria da Silva"
            value={nome}
            onChangeText={setNome}
            maxLength={150}
            autoCapitalize="words"
          />

          <TextField
            label="Telefone / WhatsApp"
            placeholder="Ex: (11) 98888-7777"
            value={telefone}
            onChangeText={setTelefone}
            maxLength={30}
            keyboardType="phone-pad"
          />

          <TextField
            label="E-mail"
            placeholder="Ex: cliente@email.com"
            value={email}
            onChangeText={setEmail}
            maxLength={255}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <TextField
            label="Documento (CPF / CNPJ)"
            placeholder="Ex: 123.456.789-00"
            value={documento}
            onChangeText={setDocumento}
            maxLength={30}
          />

          <TextField
            label="Observações"
            style={styles.textArea}
            placeholder="Notas gerais sobre o cliente..."
            value={observacoes}
            onChangeText={setObservacoes}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </Card>

        {/* Seção 2: Endereço */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Endereço</Text>

          <View style={styles.row}>
            <TextField
              label="CEP"
              containerStyle={{ flex: 1, marginRight: 8 }}
              placeholder="00000-000"
              value={cep}
              onChangeText={setCep}
              maxLength={10}
              keyboardType="numeric"
            />

            <TextField
              label="Estado (UF)"
              containerStyle={{ flex: 1 }}
              placeholder="SP"
              value={estado}
              onChangeText={setEstado}
              maxLength={2}
              autoCapitalize="characters"
            />
          </View>

          <TextField
            label="Cidade"
            placeholder="Ex: São Paulo"
            value={cidade}
            onChangeText={setCidade}
            maxLength={100}
          />

          <TextField
            label="Bairro"
            placeholder="Ex: Jardim Paulista"
            value={bairro}
            onChangeText={setBairro}
            maxLength={100}
          />

          <View style={styles.row}>
            <TextField
              label="Logradouro (Rua / Av.)"
              containerStyle={{ flex: 2, marginRight: 8 }}
              placeholder="Ex: Rua das Flores"
              value={logradouro}
              onChangeText={setLogradouro}
              maxLength={200}
            />

            <TextField
              label="Número"
              containerStyle={{ flex: 1 }}
              placeholder="123"
              value={numero}
              onChangeText={setNumero}
              maxLength={20}
            />
          </View>

          <TextField
            label="Complemento"
            placeholder="Ex: Casa 2 / Bloco B"
            value={complemento}
            onChangeText={setComplemento}
            maxLength={100}
          />
        </Card>

        {/* Botão de Salvar Alterações */}
        <Button
          title="Salvar Alterações"
          onPress={handleSubmit}
          loading={isSubmitting}
          style={styles.submitButton}
        />

        <Button
          title="Cancelar"
          variant="neutral"
          onPress={() => router.back()}
          disabled={isSubmitting}
          style={styles.cancelButton}
        />
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
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dangerSoft,
    borderColor: colors.dangerBorder,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  errorText: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.danger,
    flex: 1,
  },
  sectionCard: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: fonts.bold,
    color: colors.text,
    marginBottom: 12,
  },
  textArea: {
    minHeight: 80,
  },
  row: {
    flexDirection: 'row',
  },
  submitButton: {
    marginTop: 8,
    marginBottom: 10,
  },
  cancelButton: {
    marginBottom: 20,
  },
});
