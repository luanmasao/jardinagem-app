import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useAuth } from '../../src/presentation/contexts/auth-context';
import { useRouter } from 'expo-router';

const MODULOS = [
  {
    titulo: 'Clientes',
    descricao: 'Cadastre e consulte seus clientes e endereços.',
    rota: '/clientes',
  },
  {
    titulo: 'Serviços',
    descricao: 'Gerencie seus serviços e preços.',
    rota: '/servicos',
  },
  {
    titulo: 'Produtos',
    descricao: 'Gerencie insumos, plantas e materiais.',
    rota: '/produtos',
  },
  {
    titulo: 'Orçamentos',
    descricao: 'Crie orçamentos, meça áreas no mapa e gere PDF.',
    rota: '/orcamentos',
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const { user, perfil, isLoading, refreshPerfil } = useAuth();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.welcomeBanner}>
        <Text style={styles.welcomeTitle}>
          Olá, {perfil?.nome || user?.nome || 'Profissional'}!
        </Text>
      </View>

      {/* Aviso exibido apenas quando o perfil não pôde ser carregado */}
      {!isLoading && !perfil && (
        <View style={styles.warningCard}>
          <Text style={styles.warningText}>
            Seu perfil ainda não foi carregado. Conclua seu cadastro ou tente novamente.
          </Text>
          <View style={styles.warningActions}>
            <TouchableOpacity
              style={[styles.secondaryButton, { backgroundColor: '#15803d', marginRight: 8 }]}
              onPress={() => router.push('/concluir-perfil')}
            >
              <Text style={[styles.secondaryButtonText, { color: '#ffffff', fontWeight: 'bold' }]}>
                Concluir Meu Perfil
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={refreshPerfil}>
              <Text style={styles.secondaryButtonText}>Tentar novamente</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {MODULOS.map((modulo) => (
        <View key={modulo.rota} style={styles.card}>
          <Text style={styles.cardTitle}>{modulo.titulo}</Text>
          <Text style={styles.cardDescription}>{modulo.descricao}</Text>

          <TouchableOpacity
            style={styles.primaryButton}
            activeOpacity={0.8}
            onPress={() => router.push(modulo.rota as any)}
          >
            <Text style={styles.primaryButtonText}>Acessar {modulo.titulo}</Text>
            <Text style={styles.primaryButtonArrow}>→</Text>
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 20,
    paddingBottom: 30,
  },
  welcomeBanner: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#065f46',
  },
  warningCard: {
    backgroundColor: '#fffbeb',
    borderColor: '#fcd34d',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  warningText: {
    fontSize: 13,
    color: '#92400e',
    marginBottom: 12,
  },
  warningActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 6,
  },
  cardDescription: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 14,
  },
  primaryButton: {
    backgroundColor: '#15803d',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  primaryButtonArrow: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  secondaryButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 6,
  },
  secondaryButtonText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '600',
  },
});
