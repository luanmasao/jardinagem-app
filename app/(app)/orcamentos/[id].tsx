import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useOrcamentoDetalhe } from '../../../src/presentation/hooks/use-orcamento-detalhe';
import { useGerarPdf } from '../../../src/presentation/hooks/use-gerar-pdf';
import { useCompartilharPdf } from '../../../src/presentation/hooks/use-compartilhar-pdf';
import { StatusOrcamento } from '../../../src/domain/enums/status-orcamento';

function getStatusBadge(status: StatusOrcamento) {
  switch (status) {
    case StatusOrcamento.RASCUNHO:
      return { label: 'Rascunho', bg: '#FFF3E0', text: '#E65100', border: '#FFE0B2' };
    case StatusOrcamento.ENVIADO:
      return { label: 'Enviado', bg: '#E3F2FD', text: '#1565C0', border: '#BBDEFB' };
    case StatusOrcamento.EM_ANALISE:
      return { label: 'Em Análise', bg: '#EDE7F6', text: '#512DA8', border: '#D1C4E9' };
    case StatusOrcamento.APROVADO:
      return { label: 'Aprovado', bg: '#E8F5E9', text: '#2E7D32', border: '#C8E6C9' };
    case StatusOrcamento.CONCLUIDO:
      return { label: 'Concluído', bg: '#E0F2F1', text: '#004D40', border: '#B2DFDB' };
    case StatusOrcamento.RECUSADO:
      return { label: 'Recusado', bg: '#FFEBEE', text: '#C62828', border: '#FFCDD2' };
    case StatusOrcamento.EXPIRADO:
      return { label: 'Expirado', bg: '#FFF8E1', text: '#F57F17', border: '#FFECB3' };
    case StatusOrcamento.CANCELADO:
      return { label: 'Cancelado', bg: '#ECEFF1', text: '#455A64', border: '#CFD8DC' };
    default:
      return { label: status, bg: '#F5F5F5', text: '#616161', border: '#E0E0E0' };
  }
}

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

  const { isGenerating: isGeneratingPdf, gerarEVisualizarPdf, executarBenchmark } = useGerarPdf();
  const { isSharing: isSharingPdf, compartilharPdf } = useCompartilharPdf();

  const formatarMoeda = (valor: number): string => {
    return `R$ ${valor.toFixed(2).replace('.', ',')}`;
  };

  const formatarData = (data: Date): string => {
    return new Intl.DateTimeFormat('pt-BR').format(data);
  };

  const handleTransitarStatus = (novoStatus: StatusOrcamento, confirmMsg: string) => {
    Alert.alert('Confirmação de Transição', confirmMsg, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Confirmar',
        onPress: async () => {
          const ok = await alterarStatus(novoStatus);
          if (ok) {
            Alert.alert('Sucesso', `Status alterado para ${novoStatus}.`);
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
        <ActivityIndicator size="large" color="#2E7D32" />
        <Text style={styles.loadingText}>Carregando orçamento...</Text>
      </View>
    );
  }

  if (error || !orcamento) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error || 'Orçamento não encontrado.'}</Text>
        <TouchableOpacity style={styles.btnVoltarErro} onPress={() => router.replace('/orcamentos' as any)}>
          <Text style={styles.btnVoltarErroText}>Voltar para Orçamentos</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const badge = getStatusBadge(orcamento.status);
  const isRascunho = orcamento.status === StatusOrcamento.RASCUNHO;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Cabeçalho do Orçamento */}
        <View style={styles.cardHeaderPrincipal}>
          <View style={styles.headerLeft}>
            <Text style={styles.numeroOrcamento}>{orcamento.numero}</Text>
            <Text style={styles.dataCriacaoSub}>Criado em {formatarData(orcamento.dataCriacao)}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
            <Text style={[styles.statusBadgeText, { color: badge.text }]}>{badge.label}</Text>
          </View>
        </View>

        {/* Card do Cliente */}
        <View style={styles.cardSection}>
          <Text style={styles.cardSectionTitle}>Cliente</Text>
          <Text style={styles.clienteNome}>{clienteNome || 'Cliente não identificado'}</Text>
          {clienteTelefone ? <Text style={styles.clienteInfoText}>Telefone: {clienteTelefone}</Text> : null}
          {clienteEmail ? <Text style={styles.clienteInfoText}>E-mail: {clienteEmail}</Text> : null}
        </View>

        {/* Card de Itens */}
        <View style={styles.cardSection}>
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
                        🗺️ Áreas Medidas ({it.areas.length})
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
        </View>

        {/* Card de Resumo Financeiro */}
        <View style={styles.cardSection}>
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
        </View>

        {/* Card de Condições e Validade */}
        <View style={styles.cardSection}>
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
        </View>

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
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.btnGerarPdfText}>Abrindo...</Text>
                </View>
              ) : (
                <View style={styles.loadingRow}>
                  <Text style={styles.btnGerarPdfIcon}>📄</Text>
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
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.btnCompartilharPdfText}>Preparando...</Text>
                </View>
              ) : (
                <View style={styles.loadingRow}>
                  <Text style={styles.btnCompartilharPdfIcon}>📤</Text>
                  <Text style={styles.btnCompartilharPdfText}>Compartilhar</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {isSaving ? (
            <ActivityIndicator size="small" color="#2E7D32" style={{ marginVertical: 12 }} />
          ) : (
            <>
              {/* Ações para RASCUNHO */}
              {isRascunho ? (
                <>
                  <TouchableOpacity
                    style={styles.btnAcaoPrimaria}
                    onPress={() =>
                      handleTransitarStatus(
                        StatusOrcamento.ENVIADO,
                        'Deseja enviar esta proposta? Ela sairá do status de rascunho.'
                      )
                    }
                  >
                    <Text style={styles.btnAcaoPrimariaText}>Enviar Proposta</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.btnAcaoSecundaria}
                    onPress={() => router.push(`/orcamentos/editar?id=${orcamento.id}` as any)}
                  >
                    <Text style={styles.btnAcaoSecundariaText}>Editar Dados (Rascunho)</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.btnAcaoExcluir}
                    onPress={handleExcluir}
                  >
                    <Text style={styles.btnAcaoExcluirText}>Excluir Rascunho</Text>
                  </TouchableOpacity>
                </>
              ) : null}

              {/* Ações para ENVIADO */}
              {orcamento.status === StatusOrcamento.ENVIADO ? (
                <>
                  <TouchableOpacity
                    style={styles.btnAcaoPrimaria}
                    onPress={() =>
                      handleTransitarStatus(
                        StatusOrcamento.EM_ANALISE,
                        'Marcar orçamento como Em Análise pelo cliente?'
                      )
                    }
                  >
                    <Text style={styles.btnAcaoPrimariaText}>Marcar "Em Análise"</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.btnAcaoPerigo}
                    onPress={() =>
                      handleTransitarStatus(
                        StatusOrcamento.CANCELADO,
                        'Tem certeza que deseja cancelar esta proposta enviada?'
                      )
                    }
                  >
                    <Text style={styles.btnAcaoPerigoText}>Cancelar Proposta</Text>
                  </TouchableOpacity>
                </>
              ) : null}

              {/* Ações para EM_ANALISE */}
              {orcamento.status === StatusOrcamento.EM_ANALISE ? (
                <>
                  <TouchableOpacity
                    style={styles.btnAcaoAprovar}
                    onPress={() =>
                      handleTransitarStatus(
                        StatusOrcamento.APROVADO,
                        'Confirmar aprovação do orçamento pelo cliente?'
                      )
                    }
                  >
                    <Text style={styles.btnAcaoAprovarText}>Aprovar Orçamento</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.btnAcaoRecusar}
                    onPress={() =>
                      handleTransitarStatus(
                        StatusOrcamento.RECUSADO,
                        'Confirmar recusa do orçamento pelo cliente?'
                      )
                    }
                  >
                    <Text style={styles.btnAcaoRecusarText}>Recusar Orçamento</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.btnAcaoPerigo}
                    onPress={() =>
                      handleTransitarStatus(
                        StatusOrcamento.CANCELADO,
                        'Tem certeza que deseja cancelar esta proposta em análise?'
                      )
                    }
                  >
                    <Text style={styles.btnAcaoPerigoText}>Cancelar Proposta</Text>
                  </TouchableOpacity>
                </>
              ) : null}

              {/* Ações para APROVADO */}
              {orcamento.status === StatusOrcamento.APROVADO ? (
                <TouchableOpacity
                  style={styles.btnAcaoConcluir}
                  onPress={() =>
                    handleTransitarStatus(
                      StatusOrcamento.CONCLUIDO,
                      'Finalizar e marcar serviços deste orçamento como Concluídos?'
                    )
                  }
                >
                  <Text style={styles.btnAcaoConcluirText}>Concluir Orçamento</Text>
                </TouchableOpacity>
              ) : null}

              {/* Ação universal: Duplicar Orçamento (sempre disponível) */}
              <TouchableOpacity style={styles.btnAcaoDuplicar} onPress={handleDuplicar}>
                <Text style={styles.btnAcaoDuplicarText}>Duplicar Orçamento</Text>
              </TouchableOpacity>
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
    backgroundColor: '#F8F9FA',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  cardHeaderPrincipal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8EAED',
    marginBottom: 12,
  },
  headerLeft: {
    flex: 1,
  },
  numeroOrcamento: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1B5E20',
  },
  dataCriacaoSub: {
    fontSize: 13,
    color: '#616161',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  cardSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E8EAED',
    marginBottom: 12,
  },
  cardSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1B5E20',
    marginBottom: 8,
  },
  clienteNome: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
  },
  clienteInfoText: {
    fontSize: 13,
    color: '#616161',
    marginTop: 2,
  },
  itensSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  btnEditarItensHeader: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  btnEditarItensHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2E7D32',
  },
  emptyItensAviso: {
    fontSize: 13,
    color: '#9E9E9E',
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  itemTipoBadge: {
    backgroundColor: '#E0F2F1',
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 2,
  },
  itemTipoBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#004D40',
  },
  itemDescricao: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212121',
  },
  itemSubinfo: {
    fontSize: 12,
    color: '#757575',
    marginTop: 2,
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2E7D32',
  },
  btnRemoverItem: {
    fontSize: 12,
    color: '#C62828',
    marginTop: 4,
  },
  btnGerenciarAreas: {
    backgroundColor: '#E8F5E9',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  btnGerenciarAreasText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2E7D32',
  },
  financeiroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  financeiroLabel: {
    fontSize: 14,
    color: '#616161',
  },
  financeiroValor: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212121',
  },
  financeiroLabelDesconto: {
    fontSize: 14,
    color: '#C62828',
  },
  financeiroValorDesconto: {
    fontSize: 14,
    fontWeight: '600',
    color: '#C62828',
  },
  financeiroTotalRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  financeiroTotalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1B5E20',
  },
  financeiroTotalValor: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2E7D32',
  },
  infoCampoRow: {
    marginVertical: 4,
  },
  infoCampoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#757575',
  },
  infoCampoValor: {
    fontSize: 14,
    color: '#212121',
    marginTop: 2,
  },
  acoesContainer: {
    gap: 10,
    marginTop: 8,
  },
  btnAcaoPrimaria: {
    backgroundColor: '#2E7D32',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnAcaoPrimariaText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  btnAcaoSecundaria: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#2E7D32',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnAcaoSecundariaText: {
    color: '#2E7D32',
    fontSize: 14,
    fontWeight: '600',
  },
  btnAcaoDuplicar: {
    backgroundColor: '#F1F3F4',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnAcaoDuplicarText: {
    color: '#424242',
    fontSize: 14,
    fontWeight: '600',
  },
  btnAcaoAprovar: {
    backgroundColor: '#2E7D32',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnAcaoAprovarText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  btnAcaoRecusar: {
    backgroundColor: '#C62828',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnAcaoRecusarText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  btnAcaoConcluir: {
    backgroundColor: '#004D40',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnAcaoConcluirText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  btnAcaoPerigo: {
    backgroundColor: '#FFF0F0',
    borderWidth: 1,
    borderColor: '#FFCDD2',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnAcaoPerigoText: {
    color: '#C62828',
    fontSize: 14,
    fontWeight: '600',
  },
  btnAcaoExcluir: {
    backgroundColor: '#FFF0F0',
    borderWidth: 1,
    borderColor: '#FFCDD2',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnAcaoExcluirText: {
    color: '#C62828',
    fontSize: 14,
    fontWeight: '600',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    color: '#616161',
    fontSize: 14,
  },
  errorText: {
    color: '#C62828',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 16,
  },
  btnVoltarErro: {
    backgroundColor: '#2E7D32',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  btnVoltarErroText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  pdfBotoesRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  btnGerarPdf: {
    flex: 1,
    backgroundColor: '#1B5E20',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1B5E20',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  btnCompartilharPdf: {
    flex: 1,
    backgroundColor: '#2E7D32',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2E7D32',
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
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  btnGerarPdfIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  btnGerarPdfText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
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
