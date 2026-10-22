import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useOrcamentoDetalhe } from '../../../src/presentation/hooks/use-orcamento-detalhe';
import { useGerarPdf } from '../../../src/presentation/hooks/use-gerar-pdf';
import { useCompartilharPdf } from '../../../src/presentation/hooks/use-compartilhar-pdf';
import { StatusOrcamento } from '../../../src/domain/enums/status-orcamento';
import { formatarDataCivil } from '../../../src/presentation/utils/data-formatters';
import { formatarStatusOrcamento } from '../../../src/presentation/utils/status-orcamento.utils';
import { colors, fonts } from '../../../src/presentation/theme';
import { Button, Card, Icon, StatusBadge } from '../../../src/presentation/components/ui';

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
  } = useOrcamentoDetalhe(id || '');

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const { isGenerating: isGeneratingPdf, gerarEVisualizarPdf, executarBenchmark } = useGerarPdf();
  const { isSharing: isSharingPdf, compartilharPdf } = useCompartilharPdf();

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

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Cabeçalho do Orçamento */}
        <Card style={styles.cardHeaderPrincipal}>
          <View style={styles.headerLeft}>
            <Text style={styles.numeroOrcamento}>{orcamento.numero}</Text>
            <Text style={styles.dataCriacaoSub}>Criado em {formatarData(orcamento.dataCriacao)}</Text>
          </View>
          <StatusBadge status={orcamento.status} />
        </Card>

        {/* Card do Cliente */}
        <Card style={styles.cardSection}>
          <Text style={styles.cardSectionTitle}>Cliente</Text>
          <Text style={styles.clienteNome}>{clienteNome || 'Cliente não identificado'}</Text>
          {clienteTelefone ? <Text style={styles.clienteInfoText}>Telefone: {clienteTelefone}</Text> : null}
          {clienteEmail ? <Text style={styles.clienteInfoText}>E-mail: {clienteEmail}</Text> : null}
        </Card>

        {/* Card de Itens */}
        <Card style={styles.cardSection}>
          <View style={styles.itensSectionHeader}>
            <Text style={styles.cardSectionTitle}>Itens ({itens.length})</Text>
            {isRascunho ? (
              <TouchableOpacity
                style={styles.btnEditarItensHeader}
                onPress={() => router.push(`/orcamentos/editar?id=${orcamento.id}` as any)}
              >
                <Text style={styles.btnEditarItensHeaderText}>Gerenciar Itens</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {itens.length === 0 ? (
            <Text style={styles.emptyItensAviso}>Nenhum item adicionado a este orçamento.</Text>
          ) : (
            itens.map((it) => (
              <View key={it.id} style={styles.itemRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <View style={styles.itemTipoBadge}>
                    <Text style={styles.itemTipoBadgeText}>{it.tipo}</Text>
                  </View>
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
                <View style={{ alignItems: 'flex-end', justifyContent: 'space-between' }}>
                  <Text style={styles.itemTotal}>{formatarMoeda(it.valorTotal)}</Text>
                  {isRascunho ? (
                    <TouchableOpacity onPress={() => handleRemoverItemConfirm(it.id, it.descricao)}>
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
            <Text style={styles.infoCampoLabel}>Data de Validade:</Text>
            <Text style={styles.infoCampoValor}>
              {orcamento.dataValidade ? formatarData(orcamento.dataValidade) : 'Não informada'}
            </Text>
          </View>

          {orcamento.condicoesPagamento ? (
            <View style={styles.infoCampoRow}>
              <Text style={styles.infoCampoLabel}>Condições de Pagamento:</Text>
              <Text style={styles.infoCampoValor}>{orcamento.condicoesPagamento}</Text>
            </View>
          ) : null}

          {orcamento.observacoes ? (
            <View style={styles.infoCampoRow}>
              <Text style={styles.infoCampoLabel}>Observações:</Text>
              <Text style={styles.infoCampoValor}>{orcamento.observacoes}</Text>
            </View>
          ) : null}
        </Card>

        {/* Seção de Ações de Ciclo de Vida e Gestão */}
        <View style={styles.acoesContainer}>
          {/* Ações de Emissão, Visualização e Compartilhamento de PDF (RF80 / RF82 / RN81 / RNF03) */}
          <View style={styles.pdfBotoesRow}>
            {/* Visualização de PDF (Bloco B - Homologado) */}
            <TouchableOpacity
              style={[styles.btnGerarPdf, isGeneratingPdf && styles.btnDesabilitado]}
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
            >
              {isGeneratingPdf ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator size="small" color={colors.surface} />
                  <Text style={styles.btnGerarPdfText}>Abrindo...</Text>
                </View>
              ) : (
                <View style={styles.loadingRow}>
                  <Icon name="file" size={18} color={colors.textOnColor} style={styles.btnGerarPdfIcon} />
                  <Text style={styles.btnGerarPdfText}>Visualizar PDF</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Compartilhamento de PDF (Bloco C) */}
            <TouchableOpacity
              style={[styles.btnCompartilharPdf, isSharingPdf && styles.btnDesabilitado]}
              onPress={() => compartilharPdf(orcamento.id)}
              disabled={isGeneratingPdf || isSharingPdf || isSaving}
              activeOpacity={0.8}
            >
              {isSharingPdf ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator size="small" color={colors.surface} />
                  <Text style={styles.btnCompartilharPdfText}>Preparando...</Text>
                </View>
              ) : (
                <View style={styles.loadingRow}>
                  <Icon name="share" size={18} color={colors.textOnColor} style={styles.btnCompartilharPdfIcon} />
                  <Text style={styles.btnCompartilharPdfText}>Compartilhar</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {isSaving ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 12 }} />
          ) : (
            <>
              {/* Ações para RASCUNHO */}
              {isRascunho ? (
                <>
                  <Button
                    title="Enviar Proposta"
                    onPress={() =>
                      handleTransitarStatus(
                        StatusOrcamento.ENVIADO,
                        'Deseja enviar esta proposta? Ela sairá do status de rascunho.'
                      )
                    }
                  />

                  <Button
                    title="Editar Dados (Rascunho)"
                    variant="secondary"
                    onPress={() => router.push(`/orcamentos/editar?id=${orcamento.id}` as any)}
                  />

                  <Button
                    title="Excluir Rascunho"
                    variant="danger"
                    onPress={handleExcluir}
                  />
                </>
              ) : null}

              {/* Ações para ENVIADO */}
              {orcamento.status === StatusOrcamento.ENVIADO ? (
                <>
                  <Button
                    title={'Marcar "Em análise"'}
                    onPress={() =>
                      handleTransitarStatus(
                        StatusOrcamento.EM_ANALISE,
                        'Marcar orçamento como "Em análise" pelo cliente?'
                      )
                    }
                  />

                  <Button
                    title="Cancelar Proposta"
                    variant="danger"
                    onPress={() =>
                      handleTransitarStatus(
                        StatusOrcamento.CANCELADO,
                        'Tem certeza que deseja cancelar esta proposta enviada?'
                      )
                    }
                  />
                </>
              ) : null}

              {/* Ações para EM_ANALISE */}
              {orcamento.status === StatusOrcamento.EM_ANALISE ? (
                <>
                  <Button
                    title="Aprovar Orçamento"
                    onPress={() =>
                      handleTransitarStatus(
                        StatusOrcamento.APROVADO,
                        'Confirmar aprovação do orçamento pelo cliente?'
                      )
                    }
                  />

                  <Button
                    title="Recusar Orçamento"
                    variant="danger"
                    onPress={() =>
                      handleTransitarStatus(
                        StatusOrcamento.RECUSADO,
                        'Confirmar recusa do orçamento pelo cliente?'
                      )
                    }
                  />

                  <Button
                    title="Cancelar Proposta"
                    variant="danger"
                    onPress={() =>
                      handleTransitarStatus(
                        StatusOrcamento.CANCELADO,
                        'Tem certeza que deseja cancelar esta proposta em análise?'
                      )
                    }
                  />
                </>
              ) : null}

              {/* Ações para APROVADO */}
              {orcamento.status === StatusOrcamento.APROVADO ? (
                <Button
                  title="Concluir Orçamento"
                  onPress={() =>
                    handleTransitarStatus(
                      StatusOrcamento.CONCLUIDO,
                      'Finalizar e marcar serviços deste orçamento como Concluídos?'
                    )
                  }
                />
              ) : null}

              {/* Ação universal: Duplicar Orçamento (sempre disponível) */}
              <Button title="Duplicar Orçamento" variant="neutral" onPress={handleDuplicar} />
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  cardHeaderPrincipal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerLeft: {
    flex: 1,
  },
  numeroOrcamento: {
    fontSize: 20,
    fontFamily: fonts.bold,
    color: colors.primaryDark,
  },
  dataCriacaoSub: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    marginTop: 2,
  },
  cardSection: {
    marginBottom: 12,
  },
  cardSectionTitle: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: colors.primaryDark,
    marginBottom: 8,
  },
  clienteNome: {
    fontSize: 16,
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
    alignItems: 'center',
    marginBottom: 10,
  },
  btnEditarItensHeader: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  btnEditarItensHeaderText: {
    fontSize: 12,
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
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceMuted,
  },
  itemTipoBadge: {
    backgroundColor: colors.tealSoft,
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 2,
  },
  itemTipoBadgeText: {
    fontSize: 10,
    fontFamily: fonts.bold,
    color: colors.teal,
  },
  itemDescricao: {
    fontSize: 14,
    fontFamily: fonts.semibold,
    color: colors.text,
  },
  itemSubinfo: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    marginTop: 2,
  },
  itemTotal: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: colors.primary,
  },
  btnRemoverItem: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.danger,
    marginTop: 4,
  },
  btnGerenciarAreas: {
    backgroundColor: colors.primarySoft,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 6,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
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
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  financeiroTotalLabel: {
    fontSize: 16,
    fontFamily: fonts.bold,
    color: colors.primaryDark,
  },
  financeiroTotalValor: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: colors.primary,
  },
  infoCampoRow: {
    marginVertical: 4,
  },
  infoCampoLabel: {
    fontSize: 12,
    fontFamily: fonts.semibold,
    color: colors.textMuted,
  },
  infoCampoValor: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.text,
    marginTop: 2,
  },
  acoesContainer: {
    gap: 10,
    marginTop: 8,
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
  pdfBotoesRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  btnGerarPdf: {
    flex: 1,
    backgroundColor: colors.primaryDark,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  btnCompartilharPdf: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  btnCompartilharPdfIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  btnCompartilharPdfText: {
    color: colors.textOnColor,
    fontSize: 15,
    fontFamily: fonts.bold,
  },
  btnGerarPdfIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  btnGerarPdfText: {
    color: colors.textOnColor,
    fontSize: 15,
    fontFamily: fonts.bold,
  },
  btnDesabilitado: {
    opacity: 0.65,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
