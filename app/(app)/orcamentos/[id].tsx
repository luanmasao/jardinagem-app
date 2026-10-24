import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useOrcamentoDetalhe } from '../../../src/presentation/hooks/use-orcamento-detalhe';
import { useGerarPdf } from '../../../src/presentation/hooks/use-gerar-pdf';
import { useCompartilharPdf } from '../../../src/presentation/hooks/use-compartilhar-pdf';
import { StatusOrcamento } from '../../../src/domain/enums/status-orcamento';
import { TipoItem } from '../../../src/domain/enums/tipo-item';
import { formatarDataCivil } from '../../../src/presentation/utils/data-formatters';
import { formatarStatusOrcamento } from '../../../src/presentation/utils/status-orcamento.utils';
import { colors, fonts } from '../../../src/presentation/theme';
import { Button, Card, Icon, IconName, StatusBadge } from '../../../src/presentation/components/ui';

export default function OrcamentoDetalheScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const {
    orcamento,
    clienteNome,
    clienteTelefone,
    clienteEmail,
    itens,
    isLoading,
    isSaving,
    error,
    reload,
    alterarStatus,
    duplicar,
    excluir,
    removerItem,
    pendenteSincronizacao,
  } = useOrcamentoDetalhe(id || '');

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const { isGenerating: isGeneratingPdf, gerarEVisualizarPdf, executarBenchmark } = useGerarPdf();
  const { isSharing: isSharingPdf, compartilharPdf } = useCompartilharPdf();
  const [menuVisivel, setMenuVisivel] = useState(false);
  const insets = useSafeAreaInsets();

  const formatarMoeda = (valor: number): string => {
    return `R$ ${valor.toFixed(2).replace('.', ',')}`;
  };

  const formatarData = (data: Date): string => {
    return formatarDataCivil(data);
  };

  const handleTransitarStatus = (novoStatus: StatusOrcamento, confirmMsg: string) => {
    Alert.alert('Confirmação de Transição', confirmMsg, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Confirmar',
        onPress: async () => {
          const ok = await alterarStatus(novoStatus);
          if (ok) {
            Alert.alert('Sucesso', `Status alterado para "${formatarStatusOrcamento(novoStatus)}".`);
          }
        },
      },
    ]);
  };

  const handleDuplicar = () => {
    Alert.alert(
      'Duplicar Orçamento',
      'Deseja criar uma nova proposta independente (em RASCUNHO) a partir deste orçamento?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Duplicar',
          onPress: async () => {
            const copia = await duplicar();
            if (copia) {
              Alert.alert('Sucesso', `Nova proposta ${copia.numero} criada!`, [
                {
                  text: 'Visualizar Cópia',
                  onPress: () => router.push(`/orcamentos/${copia.id}` as any),
                },
              ]);
            }
          },
        },
      ]
    );
  };

  const handleExcluir = () => {
    Alert.alert(
      'Excluir Rascunho',
      'Tem certeza que deseja excluir permanentemente este rascunho? Esta ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            const ok = await excluir();
            if (ok) {
              Alert.alert('Sucesso', 'Orçamento excluído.', [
                { text: 'OK', onPress: () => router.replace('/orcamentos' as any) },
              ]);
            }
          },
        },
      ]
    );
  };

  const handleRemoverItemConfirm = (itemId: string, itemDesc: string) => {
    Alert.alert('Remover Item', `Remover "${itemDesc}" deste orçamento?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          await removerItem(itemId);
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Carregando orçamento...</Text>
      </View>
    );
  }

  if (error || !orcamento) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error || 'Orçamento não encontrado.'}</Text>
        <Button title="Voltar para Orçamentos" size="compact" onPress={() => router.replace('/orcamentos' as any)} />
      </View>
    );
  }

  const isRascunho = orcamento.status === StatusOrcamento.RASCUNHO;

  // Ação principal do status atual (barra fixa). Mesmas transições e mensagens de antes.
  let acaoPrincipal: { titulo: string; icone: IconName; onPress: () => void } | null = null;
  if (isRascunho) {
    acaoPrincipal = {
      titulo: 'Enviar Proposta',
      icone: 'send',
      onPress: () =>
        handleTransitarStatus(
          StatusOrcamento.ENVIADO,
          'Deseja enviar esta proposta? Ela sairá do status de rascunho.'
        ),
    };
  } else if (orcamento.status === StatusOrcamento.ENVIADO) {
    acaoPrincipal = {
      titulo: 'Marcar "Em análise"',
      icone: 'check',
      onPress: () =>
        handleTransitarStatus(
          StatusOrcamento.EM_ANALISE,
          'Marcar orçamento como "Em análise" pelo cliente?'
        ),
    };
  } else if (orcamento.status === StatusOrcamento.EM_ANALISE) {
    acaoPrincipal = {
      titulo: 'Aprovar Orçamento',
      icone: 'check',
      onPress: () =>
        handleTransitarStatus(
          StatusOrcamento.APROVADO,
          'Confirmar aprovação do orçamento pelo cliente?'
        ),
    };
  } else if (orcamento.status === StatusOrcamento.APROVADO) {
    acaoPrincipal = {
      titulo: 'Concluir Orçamento',
      icone: 'check',
      onPress: () =>
        handleTransitarStatus(
          StatusOrcamento.CONCLUIDO,
          'Finalizar e marcar serviços deste orçamento como Concluídos?'
        ),
    };
  }

  // Demais ações do status atual (menu ⋮). Mesmas transições e mensagens de antes.
  const acoesMenu: {
    titulo: string;
    icone: IconName;
    onPress?: () => void;
    perigo?: boolean;
    detalhe?: string;
  }[] = [{ titulo: 'Duplicar Orçamento', icone: 'copy', onPress: handleDuplicar }];

  if (isRascunho) {
    acoesMenu.push(
      {
        titulo: 'Editar Dados (Rascunho)',
        icone: 'edit',
        onPress: () => router.push(`/orcamentos/editar?id=${orcamento.id}` as any),
      },
      { titulo: 'Excluir Rascunho', icone: 'trash', onPress: handleExcluir, perigo: true }
    );
  } else {
    // RF69: edição direta só em RASCUNHO; a opção aparece desabilitada para explicar o motivo
    acoesMenu.push({ titulo: 'Editar Dados', icone: 'edit', detalhe: 'Disponível somente em Rascunho' });
  }
  if (orcamento.status === StatusOrcamento.ENVIADO) {
    acoesMenu.push({
      titulo: 'Cancelar Proposta',
      icone: 'cancel',
      perigo: true,
      onPress: () =>
        handleTransitarStatus(
          StatusOrcamento.CANCELADO,
          'Tem certeza que deseja cancelar esta proposta enviada?'
        ),
    });
  }
  if (orcamento.status === StatusOrcamento.EM_ANALISE) {
    acoesMenu.push(
      {
        titulo: 'Recusar Orçamento',
        icone: 'cancel',
        perigo: true,
        onPress: () =>
          handleTransitarStatus(
            StatusOrcamento.RECUSADO,
            'Confirmar recusa do orçamento pelo cliente?'
          ),
      },
      {
        titulo: 'Cancelar Proposta',
        icone: 'cancel',
        perigo: true,
        onPress: () =>
          handleTransitarStatus(
            StatusOrcamento.CANCELADO,
            'Tem certeza que deseja cancelar esta proposta em análise?'
          ),
      }
    );
  }

  const pdfOcupado = isGeneratingPdf || isSharingPdf || isSaving;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Resumo do orçamento */}
        <View style={styles.hero}>
          <View style={styles.heroTopo}>
            <View style={styles.heroIdentificacao}>
              <Text style={styles.numeroOrcamento}>{orcamento.numero}</Text>
              <Text style={styles.dataCriacaoSub}>Criado em {formatarData(orcamento.dataCriacao)}</Text>
            </View>
            <TouchableOpacity
              style={styles.btnMenu}
              onPress={() => setMenuVisivel(true)}
              disabled={isSaving}
              accessibilityRole="button"
              accessibilityLabel="Mais ações"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Icon name="more" size={22} color={colors.textOnColor} />
            </TouchableOpacity>
          </View>
          <StatusBadge status={orcamento.status} style={styles.heroStatus} />
          <Text style={styles.heroTotal}>{formatarMoeda(orcamento.total)}</Text>
          <Text style={styles.heroCliente} numberOfLines={1}>
            {clienteNome || 'Cliente não identificado'}
          </Text>
        </View>

        <View style={styles.secoes}>
          {pendenteSincronizacao ? (
            <View style={styles.avisoPendente} accessibilityRole="alert">
              <Icon name="alert" size={16} color={colors.warning} />
              <Text style={styles.avisoPendenteTexto}>
                Rascunho salvo só neste aparelho. Ele será enviado ao servidor na sincronização; até lá, não é
                possível enviar, excluir nem gerar o PDF.
              </Text>
            </View>
          ) : null}

          {/* Card de Itens */}
          <Card style={styles.cardSection}>
            <View style={styles.itensSectionHeader}>
              <Text style={styles.cardSectionTitle}>Itens ({itens.length})</Text>
              {isRascunho ? (
                <TouchableOpacity
                  onPress={() => router.push(`/orcamentos/editar?id=${orcamento.id}` as any)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityRole="button"
                >
                  <Text style={styles.linkAcao}>Gerenciar Itens</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {itens.length === 0 ? (
              <Text style={styles.emptyItensAviso}>Nenhum item adicionado a este orçamento.</Text>
            ) : (
              itens.map((it, indice) => (
                <View key={it.id} style={[styles.itemRow, indice === itens.length - 1 && styles.itemRowUltimo]}>
                  <View style={styles.itemIcone}>
                    <Icon
                      name={it.tipo === TipoItem.PRODUTO ? 'package' : 'leaf'}
                      size={18}
                      color={colors.primaryDark}
                    />
                  </View>
                  <View style={styles.itemTextos}>
                    <Text style={styles.itemDescricao}>{it.descricao}</Text>
                    <Text style={styles.itemSubinfo}>
                      {it.usaMedicaoArea
                        ? `${it.quantidade.toFixed(2)} m² (${it.areas.length} ${it.areas.length === 1 ? 'área' : 'áreas'}) x ${formatarMoeda(it.valorUnitario)}`
                        : `${it.quantidade} ${it.unidade} x ${formatarMoeda(it.valorUnitario)}`}
                    </Text>
                    {it.usaMedicaoArea ? (
                      <TouchableOpacity
                        style={styles.btnGerenciarAreas}
                        onPress={() =>
                          router.push(
                            `/orcamentos/areas?orcamentoId=${orcamento.id}&itemId=${it.id}` as any
                          )
                        }
                        activeOpacity={0.7}
                      >
                        <Text style={styles.btnGerenciarAreasText}>
                          <Icon name="map" size={12} /> Áreas Medidas ({it.areas.length})
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                  <View style={styles.itemValores}>
                    <Text style={styles.itemTotal}>{formatarMoeda(it.valorTotal)}</Text>
                    {isRascunho ? (
                      <TouchableOpacity
                        onPress={() => handleRemoverItemConfirm(it.id, it.descricao)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Text style={styles.btnRemoverItem}>Excluir</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              ))
            )}
          </Card>

          {/* Card de Resumo Financeiro */}
          <Card style={styles.cardSection}>
            <Text style={styles.cardSectionTitle}>Resumo Financeiro</Text>
            <View style={styles.financeiroRow}>
              <Text style={styles.financeiroLabel}>Subtotal:</Text>
              <Text style={styles.financeiroValor}>{formatarMoeda(orcamento.subtotal)}</Text>
            </View>

            {orcamento.valorDesconto > 0 ? (
              <View style={styles.financeiroRow}>
                <Text style={styles.financeiroLabelDesconto}>
                  Desconto ({orcamento.tipoDesconto === 'PERCENTUAL' ? `${orcamento.valorDesconto}%` : 'Fixo'}):
                </Text>
                <Text style={styles.financeiroValorDesconto}>
                  -{' '}
                  {formatarMoeda(
                    orcamento.tipoDesconto === 'PERCENTUAL'
                      ? (orcamento.subtotal * orcamento.valorDesconto) / 100
                      : orcamento.valorDesconto
                  )}
                </Text>
              </View>
            ) : null}

            <View style={[styles.financeiroRow, styles.financeiroTotalRow]}>
              <Text style={styles.financeiroTotalLabel}>Total:</Text>
              <Text style={styles.financeiroTotalValor}>{formatarMoeda(orcamento.total)}</Text>
            </View>
          </Card>

          {/* Card de Condições e Validade */}
          <Card style={styles.cardSection}>
            <Text style={styles.cardSectionTitle}>Prazos e Condições</Text>
            <View style={styles.infoCampoRow}>
              <Text style={styles.infoCampoLabel}>Data de Validade</Text>
              <Text style={styles.infoCampoValor}>
                {orcamento.dataValidade ? formatarData(orcamento.dataValidade) : 'Não informada'}
              </Text>
            </View>

            {orcamento.condicoesPagamento ? (
              <View style={styles.infoCampoRow}>
                <Text style={styles.infoCampoLabel}>Condições de Pagamento</Text>
                <Text style={styles.infoCampoValor}>{orcamento.condicoesPagamento}</Text>
              </View>
            ) : null}

            {orcamento.observacoes ? (
              <View style={styles.infoCampoRow}>
                <Text style={styles.infoCampoLabel}>Observações</Text>
                <Text style={styles.infoCampoValor}>{orcamento.observacoes}</Text>
              </View>
            ) : null}
          </Card>

          {/* Card do Cliente */}
          <Card style={styles.cardSection}>
            <Text style={styles.cardSectionTitle}>Cliente</Text>
            <Text style={styles.clienteNome}>{clienteNome || 'Cliente não identificado'}</Text>
            {clienteTelefone ? <Text style={styles.clienteInfoText}>Telefone: {clienteTelefone}</Text> : null}
            {clienteEmail ? <Text style={styles.clienteInfoText}>E-mail: {clienteEmail}</Text> : null}
          </Card>
        </View>
      </ScrollView>

      {/* Barra fixa: PDF (RF79 / RF80), compartilhamento (RF82) e ação principal do status */}
      <View style={[styles.barraAcoes, { paddingBottom: 12 + insets.bottom }]}>
        <TouchableOpacity
          style={[styles.btnIcone, pdfOcupado && styles.btnDesabilitado]}
          onPress={() => gerarEVisualizarPdf(orcamento.id)}
          onLongPress={async () => {
            Alert.alert('Iniciando Benchmark', 'Executando protocolo oficial (1 warm-up + 5 amostras para Cenários A, B, C)...');
            try {
              const res = await executarBenchmark([
                { id: '366b942a-35dd-41b3-bea6-35e60944d582', nome: 'Cenário A (Pequeno)' },
                { id: '6306122b-fe26-4468-a4fc-786dd2486909', nome: 'Cenário B (Médio)' },
                { id: '1f70f86a-4afc-48f1-9cd9-7bff62ce07fc', nome: 'Cenário C (Grande)' },
              ]);
              const textoRes = Object.entries(res)
                .map(([nome, d]) => `${nome}:\nAmostras: [${d.amostras.join(', ')}] ms\nMédia: ${d.media}ms | p95: ${d.p95}ms`)
                .join('\n\n');
              Alert.alert('Resultado Benchmark Oficial', textoRes);
            } catch (e: unknown) {
              Alert.alert('Erro no Benchmark', e instanceof Error ? e.message : String(e));
            }
          }}
          disabled={isGeneratingPdf || isSharingPdf || isSaving}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Visualizar PDF"
          accessibilityState={{ disabled: pdfOcupado, busy: isGeneratingPdf }}
        >
          {isGeneratingPdf ? (
            <ActivityIndicator size="small" color={colors.primaryDark} />
          ) : (
            <Icon name="file" size={22} color={colors.primaryDark} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btnIcone, pdfOcupado && styles.btnDesabilitado]}
          onPress={() => compartilharPdf(orcamento.id)}
          disabled={isGeneratingPdf || isSharingPdf || isSaving}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Compartilhar PDF"
          accessibilityState={{ disabled: pdfOcupado, busy: isSharingPdf }}
        >
          {isSharingPdf ? (
            <ActivityIndicator size="small" color={colors.primaryDark} />
          ) : (
            <Icon name="share" size={22} color={colors.primaryDark} />
          )}
        </TouchableOpacity>

        {acaoPrincipal ? (
          <Button
            title={acaoPrincipal.titulo}
            icon={acaoPrincipal.icone}
            onPress={acaoPrincipal.onPress}
            loading={isSaving}
            style={styles.btnPrincipal}
          />
        ) : isSaving ? (
          <View style={styles.btnPrincipal}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : null}
      </View>

      {/* Menu ⋮: demais ações do status atual */}
      <Modal visible={menuVisivel} transparent animationType="slide" onRequestClose={() => setMenuVisivel(false)}>
        <View style={styles.menuOverlay}>
          <TouchableOpacity
            style={styles.menuFundo}
            onPress={() => setMenuVisivel(false)}
            accessibilityRole="button"
            accessibilityLabel="Fechar menu"
          />
          <View style={[styles.menuPainel, { paddingBottom: 16 + insets.bottom }]}>
            <View style={styles.menuAlca} />
            <View style={styles.menuCabecalho}>
              <Text style={styles.menuTitulo}>{orcamento.numero}</Text>
              <StatusBadge status={orcamento.status} />
            </View>
            {acoesMenu.map((acao) => (
              <TouchableOpacity
                key={acao.titulo}
                style={styles.menuItem}
                disabled={!acao.onPress}
                onPress={() => {
                  setMenuVisivel(false);
                  acao.onPress?.();
                }}
                accessibilityRole="button"
                accessibilityState={{ disabled: !acao.onPress }}
              >
                <Icon
                  name={acao.icone}
                  size={20}
                  color={!acao.onPress ? colors.textPlaceholder : acao.perigo ? colors.danger : colors.primaryDark}
                />
                <View style={styles.menuItemTextos}>
                  <Text
                    style={[
                      styles.menuItemTitulo,
                      acao.perigo && styles.menuItemTituloPerigo,
                      !acao.onPress && styles.menuItemTituloDesabilitado,
                    ]}
                  >
                    {acao.titulo}
                  </Text>
                  {acao.detalhe ? <Text style={styles.menuItemDetalhe}>{acao.detalhe}</Text> : null}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    color: colors.textMuted,
    fontSize: 14,
    fontFamily: fonts.regular,
  },
  errorText: {
    color: colors.danger,
    fontSize: 15,
    fontFamily: fonts.regular,
    textAlign: 'center',
    marginBottom: 16,
  },
  hero: {
    backgroundColor: colors.primaryDark,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
  },
  heroTopo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  heroIdentificacao: {
    flex: 1,
  },
  numeroOrcamento: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: colors.primarySoft,
  },
  dataCriacaoSub: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.primarySoft,
    marginTop: 2,
  },
  btnMenu: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -6,
    marginRight: -10,
  },
  heroStatus: {
    marginTop: 12,
  },
  heroTotal: {
    fontSize: 32,
    fontFamily: fonts.extrabold,
    color: colors.textOnColor,
    marginTop: 8,
  },
  heroCliente: {
    fontSize: 15,
    fontFamily: fonts.medium,
    color: colors.primarySoft,
    marginTop: 2,
  },
  secoes: {
    padding: 16,
  },
  avisoPendente: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: colors.warningSoft,
    borderColor: colors.warningBorder,
  },
  avisoPendenteTexto: {
    flex: 1,
    color: colors.warning,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: fonts.medium,
  },
  cardSection: {
    marginBottom: 12,
  },
  cardSectionTitle: {
    fontSize: 16,
    fontFamily: fonts.extrabold,
    color: colors.text,
    marginBottom: 10,
  },
  clienteNome: {
    fontSize: 15,
    fontFamily: fonts.semibold,
    color: colors.text,
  },
  clienteInfoText: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    marginTop: 2,
  },
  itensSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  linkAcao: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: colors.primary,
  },
  emptyItensAviso: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textPlaceholder,
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceMuted,
  },
  itemRowUltimo: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  itemIcone: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  itemTextos: {
    flex: 1,
    marginRight: 8,
  },
  itemDescricao: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: colors.text,
  },
  itemSubinfo: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    marginTop: 2,
  },
  itemValores: {
    alignItems: 'flex-end',
  },
  itemTotal: {
    fontSize: 14,
    fontFamily: fonts.extrabold,
    color: colors.text,
  },
  btnRemoverItem: {
    fontSize: 12,
    fontFamily: fonts.semibold,
    color: colors.danger,
    marginTop: 6,
  },
  btnGerenciarAreas: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    marginTop: 4,
  },
  btnGerenciarAreasText: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: colors.primary,
  },
  financeiroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  financeiroLabel: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
  financeiroValor: {
    fontSize: 14,
    fontFamily: fonts.semibold,
    color: colors.text,
  },
  financeiroLabelDesconto: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.danger,
  },
  financeiroValorDesconto: {
    fontSize: 14,
    fontFamily: fonts.semibold,
    color: colors.danger,
  },
  financeiroTotalRow: {
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  financeiroTotalLabel: {
    fontSize: 16,
    fontFamily: fonts.extrabold,
    color: colors.text,
  },
  financeiroTotalValor: {
    fontSize: 16,
    fontFamily: fonts.extrabold,
    color: colors.primaryDark,
  },
  infoCampoRow: {
    marginVertical: 5,
  },
  infoCampoLabel: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  infoCampoValor: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.text,
    marginTop: 2,
  },
  barraAcoes: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  btnIcone: {
    width: 52,
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDesabilitado: {
    opacity: 0.6,
  },
  btnPrincipal: {
    flex: 1,
    minHeight: 52,
    justifyContent: 'center',
  },
  menuOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: colors.overlay,
  },
  menuFundo: {
    flex: 1,
  },
  menuPainel: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  menuAlca: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
    marginBottom: 12,
  },
  menuCabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  menuTitulo: {
    fontSize: 17,
    fontFamily: fonts.extrabold,
    color: colors.text,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  menuItemTextos: {
    flex: 1,
    marginLeft: 14,
  },
  menuItemTitulo: {
    fontSize: 15,
    fontFamily: fonts.semibold,
    color: colors.text,
  },
  menuItemTituloPerigo: {
    color: colors.danger,
  },
  menuItemTituloDesabilitado: {
    color: colors.textMuted,
  },
  menuItemDetalhe: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    marginTop: 2,
  },
});
