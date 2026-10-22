import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useAuth } from '../../src/presentation/contexts/auth-context';
import { useRouter } from 'expo-router';
import { colors, fonts } from '../../src/presentation/theme';
import { Icon } from '../../src/presentation/components/ui';

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
              style={[styles.secondaryButton, { backgroundColor: colors.primary, marginRight: 8 }]}
              onPress={() => router.push('/concluir-perfil')}
            >
              <Text style={[styles.secondaryButtonText, { color: colors.textOnColor, fontFamily: fonts.bold }]}>
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
            <Icon name="arrow-right" size={18} color={colors.textOnColor} style={styles.primaryButtonArrow} />
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 20,
    paddingBottom: 30,
  },
  welcomeBanner: {
    backgroundColor: colors.primarySubtle,
    borderColor: colors.primaryBorder,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  welcomeTitle: {
    fontSize: 20,
    fontFamily: fonts.bold,
    color: colors.primaryDark,
  },
  warningCard: {
    backgroundColor: colors.warningSoft,
    borderColor: colors.warningBorder,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  warningText: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.warning,
    marginBottom: 12,
  },
  warningActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 18,
    marginBottom: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: fonts.bold,
    color: colors.text,
    marginBottom: 6,
  },
  cardDescription: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginBottom: 14,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: colors.textOnColor,
    fontSize: 15,
    fontFamily: fonts.bold,
  },
  primaryButtonArrow: {
    color: colors.textOnColor,
    fontSize: 18,
  },
  secondaryButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.border,
    borderRadius: 6,
  },
  secondaryButtonText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontFamily: fonts.semibold,
  },
});
