import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useAuth } from '../../src/presentation/contexts/auth-context';
import { useRouter } from 'expo-router';
import { useOrcamentos } from '../../src/presentation/hooks/use-orcamentos';
import { colors, fonts } from '../../src/presentation/theme';
import { Badge, Button, Icon, IconName, StatusBadge } from '../../src/presentation/components/ui';

const MODULOS: { titulo: string; descricao: string; rota: string; icone: IconName }[] = [
  {
    titulo: 'Orçamentos',
    descricao: 'Propostas, áreas e PDF',
    rota: '/orcamentos',
    icone: 'file',
  },
  {
    titulo: 'Clientes',
    descricao: 'Contatos e endereços',
    rota: '/clientes',
    icone: 'users',
  },
  {
    titulo: 'Serviços',
    descricao: 'Serviços e preços',
    rota: '/servicos',
    icone: 'leaf',
  },
  {
    titulo: 'Produtos',
    descricao: 'Insumos, plantas e materiais',
    rota: '/produtos',
    icone: 'package',
  },
];

/** Quantidade de orçamentos exibidos em "Recentes" (a lista já vem do mais novo para o mais antigo). */
const QTD_RECENTES = 3;

const formatarMoeda = (valor: number): string => `R$ ${valor.toFixed(2).replace('.', ',')}`;

function formatarDataHoje(): string {
  const texto = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export default function HomeScreen() {
  const router = useRouter();
  const { user, perfil, isLoading, refreshPerfil } = useAuth();
  const { orcamentos, isLoading: carregandoOrcamentos, error: erroOrcamentos, reload } = useOrcamentos();

  const recentes = orcamentos.slice(0, QTD_RECENTES);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.heroData}>{formatarDataHoje()}</Text>
        <Text style={styles.heroSaudacao}>
          Olá, {perfil?.nome || user?.nome || 'Profissional'}!
        </Text>
      </View>

      <View style={styles.corpo}>
        <TouchableOpacity
          style={styles.ctaCard}
          activeOpacity={0.8}
          onPress={() => router.push('/orcamentos/novo' as any)}
          accessibilityRole="button"
          accessibilityLabel="Novo orçamento"
        >
          <View style={styles.ctaIcone}>
            <Icon name="plus" size={26} color={colors.textOnColor} />
          </View>
          <View style={styles.ctaTextos}>
            <Text style={styles.ctaTitulo}>Novo orçamento</Text>
            <Text style={styles.ctaDescricao}>Escolha o cliente; começa como rascunho</Text>
          </View>
          <Icon name="chevron-right" size={22} color={colors.textMuted} />
        </TouchableOpacity>

        {/* Aviso exibido apenas quando o perfil não pôde ser carregado */}
        {!isLoading && !perfil && (
          <View style={styles.warningCard}>
            <Text style={styles.warningText}>
              Seu perfil ainda não foi carregado. Conclua seu cadastro ou tente novamente.
            </Text>
            <View style={styles.warningActions}>
              <Button
                title="Concluir Meu Perfil"
                size="compact"
                onPress={() => router.push('/concluir-perfil')}
              />
              <Button title="Tentar novamente" size="compact" variant="neutral" onPress={refreshPerfil} />
            </View>
          </View>
        )}

        <View style={styles.grid}>
          {MODULOS.map((modulo) => (
            <TouchableOpacity
              key={modulo.rota}
              style={styles.modulo}
              activeOpacity={0.7}
              onPress={() => router.push(modulo.rota as any)}
              accessibilityRole="button"
              accessibilityLabel={modulo.titulo}
            >
              <View style={styles.moduloIcone}>
                <Icon name={modulo.icone} size={20} color={colors.primaryDark} />
              </View>
              <Text style={styles.moduloTitulo}>{modulo.titulo}</Text>
              <Text style={styles.moduloDescricao}>{modulo.descricao}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.recentes}>
          <View style={styles.recentesHeader}>
            <Text style={styles.recentesTitulo}>Recentes</Text>
            <TouchableOpacity
              onPress={() => router.push('/orcamentos' as any)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
            >
              <Text style={styles.verTodos}>Ver todos</Text>
            </TouchableOpacity>
          </View>

          {carregandoOrcamentos && orcamentos.length === 0 ? (
            <ActivityIndicator color={colors.primary} style={styles.recentesLoading} />
          ) : erroOrcamentos ? (
            <View style={styles.recentesAviso}>
              <Text style={styles.recentesAvisoTexto}>{erroOrcamentos}</Text>
              <Button title="Tentar novamente" size="compact" variant="neutral" onPress={reload} />
            </View>
          ) : recentes.length === 0 ? (
            <View style={styles.recentesAviso}>
              <Text style={styles.recentesAvisoTexto}>Nenhum orçamento criado ainda.</Text>
            </View>
          ) : (
            recentes.map((orc) => (
              <TouchableOpacity
                key={orc.id}
                style={styles.recenteItem}
                activeOpacity={0.7}
                onPress={() => router.push(`/orcamentos/${orc.id}` as any)}
                accessibilityRole="button"
              >
                <View style={styles.recenteTextos}>
                  <Text style={styles.recenteCliente} numberOfLines={1}>
                    {orc.clienteNome || 'Cliente não identificado'}
                  </Text>
                  <Text style={styles.recenteDetalhe}>
                    {orc.numero} · {formatarMoeda(orc.total)}
                  </Text>
                </View>
                {orc.pendenteSincronizacao ? (
                  <Badge label="Não sincronizado" tone="warning" />
                ) : (
                  <StatusBadge status={orc.status} />
                )}
              </TouchableOpacity>
            ))
          )}
        </View>
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
    paddingBottom: 30,
  },
  hero: {
    backgroundColor: colors.primaryDark,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 60,
  },
  heroData: {
    fontSize: 14,
    fontFamily: fonts.medium,
    color: colors.primarySoft,
  },
  heroSaudacao: {
    fontSize: 26,
    fontFamily: fonts.extrabold,
    color: colors.textOnColor,
    marginTop: 4,
  },
  corpo: {
    paddingHorizontal: 20,
    marginTop: -44,
    gap: 18,
  },
  ctaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 18,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  },
  ctaIcone: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  ctaTextos: {
    flex: 1,
  },
  ctaTitulo: {
    fontSize: 17,
    fontFamily: fonts.extrabold,
    color: colors.text,
  },
  ctaDescricao: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    marginTop: 2,
  },
  warningCard: {
    backgroundColor: colors.warningSoft,
    borderColor: colors.warningBorder,
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
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
    gap: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  modulo: {
    width: '48.5%',
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  moduloIcone: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  moduloTitulo: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: colors.text,
  },
  moduloDescricao: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    marginTop: 2,
  },
  recentes: {
    gap: 10,
  },
  recentesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  recentesTitulo: {
    fontSize: 17,
    fontFamily: fonts.extrabold,
    color: colors.text,
  },
  verTodos: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: colors.primary,
  },
  recentesLoading: {
    marginVertical: 12,
  },
  recentesAviso: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 10,
    alignItems: 'flex-start',
  },
  recentesAvisoTexto: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
  recenteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  recenteTextos: {
    flex: 1,
    marginRight: 10,
  },
  recenteCliente: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: colors.text,
  },
  recenteDetalhe: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    marginTop: 2,
  },
});
