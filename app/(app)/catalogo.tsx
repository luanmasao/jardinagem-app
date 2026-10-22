import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, fonts } from '../../src/presentation/theme';
import { Icon, IconName } from '../../src/presentation/components/ui';

const SECOES: { titulo: string; descricao: string; rota: string; icone: IconName }[] = [
  {
    titulo: 'Serviços',
    descricao: 'Gerencie seus serviços e preços.',
    rota: '/servicos',
    icone: 'leaf',
  },
  {
    titulo: 'Produtos',
    descricao: 'Gerencie insumos, plantas e materiais.',
    rota: '/produtos',
    icone: 'package',
  },
];

/**
 * Aba Catálogo: dá acesso às listas de Serviços e Produtos.
 */
export default function CatalogoScreen() {
  const router = useRouter();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {SECOES.map((secao) => (
        <TouchableOpacity
          key={secao.rota}
          style={styles.card}
          activeOpacity={0.7}
          onPress={() => router.push(secao.rota as any)}
          accessibilityRole="button"
          accessibilityLabel={secao.titulo}
        >
          <View style={styles.iconeContainer}>
            <Icon name={secao.icone} size={22} color={colors.primaryDark} />
          </View>
          <View style={styles.textos}>
            <Text style={styles.titulo}>{secao.titulo}</Text>
            <Text style={styles.descricao}>{secao.descricao}</Text>
          </View>
          <Icon name="arrow-right" size={20} color={colors.textMuted} />
        </TouchableOpacity>
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
    padding: 16,
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  iconeContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  textos: {
    flex: 1,
  },
  titulo: {
    fontSize: 16,
    fontFamily: fonts.bold,
    color: colors.text,
  },
  descricao: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    marginTop: 2,
  },
});
