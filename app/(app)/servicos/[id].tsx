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
        <ActivityIndicator size="large" color="#15803d" />
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
            <ActivityIndicator color={servico.ativo ? '#b91c1c' : '#15803d'} />
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
    backgroundColor: '#f8fafc',
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
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
  },
  errorIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#b91c1c',
    marginBottom: 6,
  },
  errorMessage: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 20,
    maxWidth: 280,
  },
  backButton: {
    backgroundColor: '#15803d',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  headerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
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
    color: '#0f172a',
    flex: 1,
    marginRight: 10,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeAtivo: {
    backgroundColor: '#dcfce7',
  },
  badgeInativo: {
    backgroundColor: '#fee2e2',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusTextAtivo: {
    color: '#166534',
  },
  statusTextInativo: {
    color: '#b91c1c',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  label: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  value: {
    fontSize: 13,
    color: '#0f172a',
    fontWeight: '600',
    maxWidth: '65%',
    textAlign: 'right',
  },
  valuePreco: {
    fontSize: 15,
    color: '#15803d',
    fontWeight: '700',
  },
  textAreaSim: {
    color: '#b45309',
  },
  textAreaNao: {
    color: '#475569',
  },
  descricaoContainer: {
    marginTop: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 10,
  },
  descricaoText: {
    fontSize: 13,
    color: '#334155',
    marginTop: 4,
    lineHeight: 18,
  },
  actionsContainer: {
    marginTop: 8,
    marginBottom: 20,
    gap: 10,
  },
  editButton: {
    backgroundColor: '#15803d',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  editButtonText: {
    color: '#ffffff',
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
    backgroundColor: '#fef2f2',
    borderColor: '#fca5a5',
  },
  toggleAtivarButton: {
    backgroundColor: '#f0fdf4',
    borderColor: '#86efac',
  },
  toggleStatusButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  toggleInativarText: {
    color: '#b91c1c',
  },
  toggleAtivarText: {
    color: '#15803d',
  },
  voltarButton: {
    backgroundColor: '#e2e8f0',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  voltarButtonText: {
    color: '#334155',
    fontSize: 14,
    fontWeight: '600',
  },
});
