import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useServicoDetalhe } from '../../../src/presentation/hooks/use-servico-detalhe';
import { colors } from '../../../src/presentation/theme';

export default function ServicoDetalheScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    servico,
    isLoading,
    isTogglingAtivo,
    error,
    reload,
    toggleAtivo,
  } = useServicoDetalhe(id);

  const formatarPreco = (valor: number): string => {
    return `R$ ${valor.toFixed(2).replace('.', ',')}`;
  };

  const handleToggleAtivo = () => {
    if (!servico) return;
    const acao = servico.ativo ? 'inativar' : 'reativar';
    const confirmMessage = `Deseja realmente ${acao} o serviço "${servico.nome}"?`;

    if (Platform.OS === 'web') {
      if (window.confirm(confirmMessage)) {
        toggleAtivo();
      }
    } else {
      Alert.alert(
        `Confirmar ${acao.charAt(0).toUpperCase() + acao.slice(1)}`,
        confirmMessage,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Confirmar',
            style: servico.ativo ? 'destructive' : 'default',
            onPress: () => toggleAtivo(),
          },
        ]
      );
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Carregando dados do serviço...</Text>
      </View>
    );
  }

  if (error || !servico) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>Serviço não encontrado</Text>
        <Text style={styles.errorMessage}>
          {error || 'O serviço solicitado não pôde ser localizado ou você não possui permissão para acessá-lo.'}
        </Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/servicos' as any)}>
          <Text style={styles.backButtonText}>Voltar para Lista</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Banner de Identificação */}
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <Text style={styles.headerNome}>{servico.nome}</Text>
          <View
            style={[
              styles.statusBadge,
              servico.ativo ? styles.badgeAtivo : styles.badgeInativo,
            ]}
          >
            <Text
              style={[
                styles.statusText,
                servico.ativo ? styles.statusTextAtivo : styles.statusTextInativo,
              ]}
            >
              {servico.ativo ? 'Ativo' : 'Inativo'}
            </Text>
          </View>
        </View>
      </View>

      {/* Card: Detalhes Comerciais e Técnicos */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Especificações do Serviço</Text>

        <View style={styles.row}>
          <Text style={styles.label}>Preço Base:</Text>
          <Text style={styles.valuePreco}>{formatarPreco(servico.precoBase)}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Unidade:</Text>
          <Text style={styles.value}>{servico.unidade}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Medição de Área:</Text>
          <Text style={[styles.value, servico.usaMedicaoArea ? styles.textAreaSim : styles.textAreaNao]}>
            {servico.usaMedicaoArea ? 'Sim (m² via polígono)' : 'Não'}
          </Text>
        </View>

        {servico.descricao ? (
          <View style={styles.descricaoContainer}>
            <Text style={styles.label}>Descrição:</Text>
            <Text style={styles.descricaoText}>{servico.descricao}</Text>
          </View>
        ) : null}
      </View>

      {/* Ações */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={styles.editButton}
          activeOpacity={0.8}
          onPress={() => router.push(`/servicos/editar?id=${servico.id}` as any)}
        >
          <Text style={styles.editButtonText}>Editar Dados do Serviço</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.toggleStatusButton,
            servico.ativo ? styles.toggleInativarButton : styles.toggleAtivarButton,
          ]}
          activeOpacity={0.8}
          disabled={isTogglingAtivo}
          onPress={handleToggleAtivo}
        >
          {isTogglingAtivo ? (
            <ActivityIndicator color={servico.ativo ? colors.danger : colors.primary} />
          ) : (
            <Text
              style={[
                styles.toggleStatusButtonText,
                servico.ativo ? styles.toggleInativarText : styles.toggleAtivarText,
              ]}
            >
              {servico.ativo ? 'Inativar Serviço' : 'Ativar Serviço'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.voltarButton}
          activeOpacity={0.8}
          onPress={() => router.push('/servicos' as any)}
        >
          <Text style={styles.voltarButtonText}>Voltar para Lista</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
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
  errorIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.danger,
    marginBottom: 6,
  },
  errorMessage: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 20,
    maxWidth: 280,
  },
  backButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backButtonText: {
    color: colors.textOnColor,
    fontSize: 14,
    fontWeight: 'bold',
  },
  headerCard: {
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
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  headerNome: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    flex: 1,
    marginRight: 10,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeAtivo: {
    backgroundColor: colors.primarySoft,
  },
  badgeInativo: {
    backgroundColor: colors.dangerSoft,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusTextAtivo: {
    color: colors.primaryDark,
  },
  statusTextInativo: {
    color: colors.danger,
  },
  card: {
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
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceMuted,
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.background,
  },
  label: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '500',
  },
  value: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '600',
    maxWidth: '65%',
    textAlign: 'right',
  },
  valuePreco: {
    fontSize: 15,
    color: colors.primary,
    fontWeight: '700',
  },
  textAreaSim: {
    color: colors.warning,
  },
  textAreaNao: {
    color: colors.textSecondary,
  },
  descricaoContainer: {
    marginTop: 10,
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 10,
  },
  descricaoText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  actionsContainer: {
    marginTop: 8,
    marginBottom: 20,
    gap: 10,
  },
  editButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  editButtonText: {
    color: colors.textOnColor,
    fontSize: 15,
    fontWeight: 'bold',
  },
  toggleStatusButton: {
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  toggleInativarButton: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.dangerBorder,
  },
  toggleAtivarButton: {
    backgroundColor: colors.primarySubtle,
    borderColor: colors.primaryBorder,
  },
  toggleStatusButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  toggleInativarText: {
    color: colors.danger,
  },
  toggleAtivarText: {
    color: colors.primary,
  },
  voltarButton: {
    backgroundColor: colors.border,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  voltarButtonText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
});
