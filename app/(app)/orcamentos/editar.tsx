import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useOrcamentoDetalhe } from '../../../src/presentation/hooks/use-orcamento-detalhe';
import { clienteService } from '../../../src/application/services/cliente.service';
import { servicoService } from '../../../src/application/services/servico.service';
import { produtoService } from '../../../src/application/services/produto.service';
import { orcamentoService } from '../../../src/application/services/orcamento.service';
import { Cliente } from '../../../src/domain/entities/cliente';
import { Servico } from '../../../src/domain/entities/servico';
import { Produto } from '../../../src/domain/entities/produto';
import { StatusOrcamento } from '../../../src/domain/enums/status-orcamento';
import { TipoItem } from '../../../src/domain/enums/tipo-item';
import { TipoDesconto } from '../../../src/domain/enums/tipo-desconto';
import {
  aplicarMascaraData,
  formatarDataCivil,
  parseDataCivil,
} from '../../../src/presentation/utils/data-formatters';
import { formatarStatusOrcamento } from '../../../src/presentation/utils/status-orcamento.utils';
import { colors, fonts } from '../../../src/presentation/theme';
import { Button, Card, Icon, TextField } from '../../../src/presentation/components/ui';

export default function EditarOrcamentoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const {
    orcamento,
    itens,
    isLoading: loadingOrcamento,
    reload,
    adicionarItem,
    removerItem,
  } = useOrcamentoDetalhe(id || '');

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  // Formulário
  const [clienteId, setClienteId] = useState<string>('');
  const [dataValidade, setDataValidade] = useState<string>('');
  const [tipoDesconto, setTipoDesconto] = useState<'NENHUM' | 'PERCENTUAL' | 'FIXO'>('NENHUM');
  const [valorDescontoStr, setValorDescontoStr] = useState<string>('');
  const [observacoes, setObservacoes] = useState<string>('');
  const [condicoesPagamento, setCondicoesPagamento] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Catálogos
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loadingCatalogos, setLoadingCatalogos] = useState<boolean>(true);

  // Modais
  const [modalClienteVisible, setModalClienteVisible] = useState<boolean>(false);
  const [modalItemVisible, setModalItemVisible] = useState<boolean>(false);
  const [abaItem, setAbaItem] = useState<'SERVICO' | 'PRODUTO'>('SERVICO');
  const [itemSelecionado, setItemSelecionado] = useState<Servico | Produto | null>(null);
  const [qtdDigitada, setQtdDigitada] = useState<string>('1');

  useEffect(() => {
    async function carregarCatalogos() {
      setLoadingCatalogos(true);
      try {
        const [listaClientes, listaServicos, listaProdutos] = await Promise.all([
          clienteService.listarClientes(),
          servicoService.listarServicos(),
          produtoService.listarProdutos(),
        ]);
        setClientes(listaClientes.filter((c) => c.ativo));
        setServicos(listaServicos.filter((s) => s.ativo));
        setProdutos(listaProdutos.filter((p) => p.ativo));
      } catch (err) {
        Alert.alert('Erro', 'Falha ao carregar catálogos.');
      } finally {
        setLoadingCatalogos(false);
      }
    }
    carregarCatalogos();
  }, []);

  useEffect(() => {
    if (orcamento) {
      setClienteId(orcamento.clienteId);
      setDataValidade(
        orcamento.dataValidade
          ? formatarDataCivil(orcamento.dataValidade)
          : ''
      );
      if (orcamento.tipoDesconto === TipoDesconto.PERCENTUAL) {
        setTipoDesconto('PERCENTUAL');
        setValorDescontoStr(orcamento.valorDesconto.toString());
      } else if (orcamento.tipoDesconto === TipoDesconto.FIXO) {
        setTipoDesconto('FIXO');
        setValorDescontoStr(orcamento.valorDesconto.toString());
      } else {
        setTipoDesconto('NENHUM');
        setValorDescontoStr('');
      }
      setObservacoes(orcamento.observacoes || '');
      setCondicoesPagamento(orcamento.condicoesPagamento || '');
    }
  }, [orcamento]);

  const clienteSelecionado = useMemo(() => {
    return clientes.find((c) => c.id === clienteId);
  }, [clientes, clienteId]);

  const formatarMoeda = (valor: number): string => {
    return `R$ ${valor.toFixed(2).replace('.', ',')}`;
  };

  const handleSelecionarOrigem = (origem: Servico | Produto) => {
    setItemSelecionado(origem);
    if ('usaMedicaoArea' in origem && origem.usaMedicaoArea) {
      setQtdDigitada('0');
    } else {
      setQtdDigitada('1');
    }
  };

  const handleConfirmarAdicionarItem = async () => {
    if (!itemSelecionado || !orcamento) return;

    const isServico = 'usaMedicaoArea' in itemSelecionado;
    const usaMedicaoArea = isServico ? Boolean(itemSelecionado.usaMedicaoArea) : false;
    const qtdNum = usaMedicaoArea ? 0 : parseFloat(qtdDigitada.replace(',', '.')) || 1;

    if (!usaMedicaoArea && qtdNum <= 0) {
      Alert.alert('Quantidade Inválida', 'A quantidade deve ser maior que zero.');
      return;
    }

    try {
      await adicionarItem({
        tipo: isServico ? TipoItem.SERVICO : TipoItem.PRODUTO,
        servicoId: isServico ? itemSelecionado.id : null,
        produtoId: !isServico ? itemSelecionado.id : null,
        quantidade: qtdNum,
      });
      setItemSelecionado(null);
      setModalItemVisible(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao adicionar item.';
      Alert.alert('Erro', msg);
    }
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

  const handleSalvarEdicao = async () => {
    if (!orcamento) return;
    if (!clienteId) {
      Alert.alert('Campo Obrigatório', 'Selecione um cliente.');
      return;
    }

    setIsSaving(true);
    try {
      let dataValidadeObj: Date | null = null;
      if (dataValidade && dataValidade.trim() !== '') {
        dataValidadeObj = parseDataCivil(dataValidade);
        if (!dataValidadeObj) {
          Alert.alert(
            'Data Inválida',
            'A data de validade informada é inválida. Use o formato DD/MM/AAAA (ex: 07/10/2026).'
          );
          setIsSaving(false);
          return;
        }
      }

      const tipoDescEnum =
        tipoDesconto === 'PERCENTUAL'
          ? TipoDesconto.PERCENTUAL
          : tipoDesconto === 'FIXO'
          ? TipoDesconto.FIXO
          : null;

      const valDescNum = tipoDescEnum ? parseFloat(valorDescontoStr.replace(',', '.')) || 0 : 0;

      // Validação defensiva: desconto fixo não pode exceder o subtotal
      if (tipoDescEnum === TipoDesconto.FIXO && valDescNum > orcamento.subtotal) {
        Alert.alert(
          'Desconto Inválido',
          `O desconto fixo (R$ ${valDescNum.toFixed(2)}) não pode ser superior ao subtotal dos itens (R$ ${orcamento.subtotal.toFixed(2)}).`
        );
        setIsSaving(false);
        return;
      }

      await orcamentoService.atualizarOrcamento(orcamento.id, {
        clienteId,
        dataValidade: dataValidadeObj,
        tipoDesconto: tipoDescEnum,
        valorDesconto: valDescNum,
        observacoes: observacoes.trim() || null,
        condicoesPagamento: condicoesPagamento.trim() || null,
      });

      Alert.alert('Sucesso', 'Orçamento atualizado com sucesso!', [
        {
          text: 'OK',
          onPress: () => router.replace(`/orcamentos/${orcamento.id}` as any),
        },
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao atualizar orçamento.';
      Alert.alert('Erro ao Salvar', msg);
    } finally {
      setIsSaving(false);
    }
  };

  if (loadingOrcamento || loadingCatalogos) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Carregando dados...</Text>
      </View>
    );
  }

  if (!orcamento) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Orçamento não encontrado.</Text>
        <Button title="Voltar" size="compact" onPress={() => router.replace('/orcamentos' as any)} />
      </View>
    );
  }

  // RN64 / RN65: Bloqueio estrito de edição direta para orçamentos fora de RASCUNHO
  if (orcamento.status !== StatusOrcamento.RASCUNHO) {
    return (
      <View style={styles.centerContainer}>
        <Card style={styles.bloqueioCard}>
          <Text style={styles.bloqueioTitulo}>Edição Direta Não Permitida</Text>
          <Text style={styles.bloqueioMensagem}>
            Este orçamento está no status "{formatarStatusOrcamento(orcamento.status)}". Conforme as regras de negócio homologadas
            (RN64 e RN65), propostas fora do status RASCUNHO não podem ser editadas diretamente para
            preservação histórica.
          </Text>
          <Text style={styles.bloqueioMensagemSub}>
            Para alterar valores ou itens desta proposta, utilize a opção "Duplicar Orçamento" na tela de
            detalhes.
          </Text>
          <Button
            title="Voltar para Detalhes"
            onPress={() => router.replace(`/orcamentos/${orcamento.id}` as any)}
          />
        </Card>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Card style={styles.headerEdicao}>
          <Text style={styles.headerEdicaoNumero}>{orcamento.numero}</Text>
          <Text style={styles.headerEdicaoStatus}>Status: Rascunho (Editável)</Text>
        </Card>

        {/* Cliente */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Cliente</Text>
          <TouchableOpacity
            style={styles.selectButton}
            onPress={() => setModalClienteVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={clienteSelecionado ? styles.selectButtonTextSelected : styles.selectButtonTextPlaceholder}>
              {clienteSelecionado ? clienteSelecionado.nome : 'Selecione o cliente...'}
            </Text>
          </TouchableOpacity>
        </Card>

        {/* Validade */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Prazos</Text>
          <TextField
            label="Data de Validade (DD/MM/AAAA)"
            placeholder="DD/MM/AAAA (ex: 07/10/2026)"
            value={dataValidade}
            onChangeText={(val) => setDataValidade(aplicarMascaraData(val))}
            keyboardType="numeric"
            maxLength={10}
          />
        </Card>

        {/* Itens */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Itens ({itens.length})</Text>
            <Button
              title="+ Adicionar Item"
              variant="secondary"
              size="compact"
              onPress={() => {
                setItemSelecionado(null);
                setModalItemVisible(true);
              }}
            />
          </View>

          {itens.length === 0 ? (
            <Text style={styles.emptyItensTexto}>Nenhum item adicionado.</Text>
          ) : (
            itens.map((it) => (
              <View key={it.id} style={styles.itemRowCard}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <View style={{ flexDirection: 'row', gap: 6, marginBottom: 4 }}>
                    <View style={styles.itemTipoBadge}>
                      <Text style={styles.itemTipoBadgeText}>{it.tipo}</Text>
                    </View>
                    {it.usaMedicaoArea ? (
                      <View style={styles.itemMedicaoBadge}>
                        <Text style={styles.itemMedicaoBadgeText}>MEDIÇÃO DE ÁREA</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.itemDescricao}>{it.descricao}</Text>
                  <Text style={styles.itemDetalhes}>
                    {it.usaMedicaoArea
                      ? `${it.quantidade > 0 ? `${it.quantidade.toFixed(2)} m²` : '0,00 m² (Pendente)'} x ${formatarMoeda(it.valorUnitario)}`
                      : `${it.quantidade} ${it.unidade} x ${formatarMoeda(it.valorUnitario)}`}
                  </Text>
                  {it.usaMedicaoArea ? (
                    <TouchableOpacity
                      style={styles.btnMedirArea}
                      onPress={() =>
                        router.push({
                          pathname: '/orcamentos/areas',
                          params: {
                            orcamentoId: orcamento?.id || id,
                            itemId: it.id,
                            autoAbrirMapa: it.quantidade === 0 ? 'true' : 'false',
                          },
                        } as any)
                      }
                      activeOpacity={0.7}
                    >
                      <Text style={styles.btnMedirAreaText}>
                        <Icon name="map" size={12} /> {it.quantidade > 0 ? `Áreas Medidas (${it.quantidade.toFixed(2)} m²)` : 'Medir Área no Mapa'}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
                <View style={{ alignItems: 'flex-end', justifyContent: 'space-between' }}>
                  <Text style={styles.itemValorTotal}>{formatarMoeda(it.valorTotal)}</Text>
                  <TouchableOpacity onPress={() => handleRemoverItemConfirm(it.id, it.descricao)}>
                    <Text style={styles.btnRemoverText}>Excluir</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </Card>

        {/* Desconto */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Desconto</Text>
          <View style={styles.descontoTipoRow}>
            <TouchableOpacity
              style={[styles.tipoDescButton, tipoDesconto === 'NENHUM' && styles.tipoDescButtonActive]}
              onPress={() => setTipoDesconto('NENHUM')}
            >
              <Text style={[styles.tipoDescText, tipoDesconto === 'NENHUM' && styles.tipoDescTextActive]}>
                Sem Desconto
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tipoDescButton, tipoDesconto === 'PERCENTUAL' && styles.tipoDescButtonActive]}
              onPress={() => setTipoDesconto('PERCENTUAL')}
            >
              <Text style={[styles.tipoDescText, tipoDesconto === 'PERCENTUAL' && styles.tipoDescTextActive]}>
                Percentual (%)
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tipoDescButton, tipoDesconto === 'FIXO' && styles.tipoDescButtonActive]}
              onPress={() => setTipoDesconto('FIXO')}
            >
              <Text style={[styles.tipoDescText, tipoDesconto === 'FIXO' && styles.tipoDescTextActive]}>
                Valor Fixo (R$)
              </Text>
            </TouchableOpacity>
          </View>

          {tipoDesconto !== 'NENHUM' ? (
            <TextField
              label={tipoDesconto === 'PERCENTUAL' ? 'Percentual (%)' : 'Valor (R$)'}
              keyboardType="numeric"
              value={valorDescontoStr}
              onChangeText={setValorDescontoStr}
            />
          ) : null}

          <View style={styles.divider} />
          <View style={styles.resumoRow}>
            <Text style={styles.resumoLabel}>Subtotal:</Text>
            <Text style={styles.resumoValor}>{formatarMoeda(orcamento.subtotal)}</Text>
          </View>
          <View style={[styles.resumoRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total Atual:</Text>
            <Text style={styles.totalFinalValor}>{formatarMoeda(orcamento.total)}</Text>
          </View>
        </Card>

        {/* Observações e Condições */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Observações e Condições</Text>
          <TextField
            label="Observações"
            style={styles.textArea}
            multiline
            numberOfLines={3}
            value={observacoes}
            onChangeText={setObservacoes}
          />
          <TextField
            label="Condições de Pagamento"
            style={styles.textArea}
            multiline
            numberOfLines={2}
            value={condicoesPagamento}
            onChangeText={setCondicoesPagamento}
          />
        </Card>

        <Button
          title="Salvar Alterações"
          onPress={handleSalvarEdicao}
          loading={isSaving}
          style={styles.btnSalvar}
        />
      </ScrollView>

      {/* Modal Seleção Cliente */}
      <Modal visible={modalClienteVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Selecione o Cliente</Text>
            <FlatList
              data={clientes}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalItemRow, item.id === clienteId && styles.modalItemRowSelected]}
                  onPress={() => {
                    setClienteId(item.id);
                    setModalClienteVisible(false);
                  }}
                >
                  <Text style={styles.modalItemTitle}>{item.nome}</Text>
                  {item.telefone ? <Text style={styles.modalItemSub}>{item.telefone}</Text> : null}
                </TouchableOpacity>
              )}
            />
            <Button
              title="Cancelar"
              variant="neutral"
              onPress={() => setModalClienteVisible(false)}
              style={styles.modalBtnFechar}
            />
          </View>
        </View>
      </Modal>

      {/* Modal Adição de Item */}
      <Modal visible={modalItemVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Adicionar do Catálogo</Text>
            <View style={styles.modalTabsRow}>
              <TouchableOpacity
                style={[styles.modalTab, abaItem === 'SERVICO' && styles.modalTabActive]}
                onPress={() => {
                  setAbaItem('SERVICO');
                  setItemSelecionado(null);
                }}
              >
                <Text style={[styles.modalTabText, abaItem === 'SERVICO' && styles.modalTabTextActive]}>
                  Serviços
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalTab, abaItem === 'PRODUTO' && styles.modalTabActive]}
                onPress={() => {
                  setAbaItem('PRODUTO');
                  setItemSelecionado(null);
                }}
              >
                <Text style={[styles.modalTabText, abaItem === 'PRODUTO' && styles.modalTabTextActive]}>
                  Produtos
                </Text>
              </TouchableOpacity>
            </View>

            {abaItem === 'SERVICO' ? (
              <FlatList
                data={servicos}
                keyExtractor={(item) => item.id}
                style={{ maxHeight: 220 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.modalItemRow, itemSelecionado?.id === item.id && styles.modalItemRowSelected]}
                    onPress={() => handleSelecionarOrigem(item)}
                  >
                    <Text style={styles.modalItemTitle}>{item.nome}</Text>
                    <Text style={styles.modalItemSub}>
                      {item.usaMedicaoArea ? 'Medição de Área (m²)' : `Unidade: ${item.unidade}`} •{' '}
                      {formatarMoeda(item.precoBase)}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            ) : (
              <FlatList
                data={produtos}
                keyExtractor={(item) => item.id}
                style={{ maxHeight: 220 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.modalItemRow, itemSelecionado?.id === item.id && styles.modalItemRowSelected]}
                    onPress={() => handleSelecionarOrigem(item)}
                  >
                    <Text style={styles.modalItemTitle}>{item.nome}</Text>
                    <Text style={styles.modalItemSub}>
                      Unidade: {item.unidade} • {formatarMoeda(item.precoBase)}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            )}

            {itemSelecionado ? (
              <View style={styles.itemConfigBox}>
                <Text style={styles.itemConfigTitle}>Configurar: {itemSelecionado.nome}</Text>
                {'usaMedicaoArea' in itemSelecionado && itemSelecionado.usaMedicaoArea ? (
                  <View style={styles.avisoMedicaoBox}>
                    <Text style={styles.avisoMedicaoText}>
                      Este serviço utiliza medição de área (0 m² inicialmente).
                    </Text>
                  </View>
                ) : (
                  <TextField
                    label={`Quantidade (${itemSelecionado.unidade})`}
                    keyboardType="numeric"
                    value={qtdDigitada}
                    onChangeText={setQtdDigitada}
                  />
                )}
                <Button title="Confirmar Inclusão" onPress={handleConfirmarAdicionarItem} />
              </View>
            ) : null}

            <Button
              title="Cancelar"
              variant="neutral"
              onPress={() => setModalItemVisible(false)}
              style={styles.modalBtnFechar}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  headerEdicao: {
    marginBottom: 12,
  },
  headerEdicaoNumero: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: colors.primaryDark,
  },
  headerEdicaoStatus: {
    fontSize: 13,
    color: colors.warning,
    marginTop: 2,
    fontFamily: fonts.semibold,
  },
  sectionCard: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: colors.primaryDark,
    marginBottom: 10,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  selectButton: {
    backgroundColor: colors.surfaceMuted,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectButtonTextSelected: {
    fontSize: 15,
    fontFamily: fonts.semibold,
    color: colors.text,
  },
  selectButtonTextPlaceholder: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
  textArea: {
    minHeight: 64,
    textAlignVertical: 'top',
  },
  emptyItensTexto: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textPlaceholder,
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  itemRowCard: {
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
  },
  itemTipoBadgeText: {
    fontSize: 10,
    fontFamily: fonts.bold,
    color: colors.teal,
  },
  itemMedicaoBadge: {
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  itemMedicaoBadgeText: {
    fontSize: 10,
    fontFamily: fonts.bold,
    color: colors.primary,
  },
  btnMedirArea: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  btnMedirAreaText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontFamily: fonts.bold,
  },
  itemDescricao: {
    fontSize: 14,
    fontFamily: fonts.semibold,
    color: colors.text,
  },
  itemDetalhes: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    marginTop: 2,
  },
  itemValorTotal: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: colors.primary,
  },
  btnRemoverText: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.danger,
    marginTop: 4,
  },
  descontoTipoRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  tipoDescButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: colors.surfaceMuted,
  },
  tipoDescButtonActive: {
    backgroundColor: colors.primary,
  },
  tipoDescText: {
    fontSize: 12,
    fontFamily: fonts.semibold,
    color: colors.textMuted,
  },
  tipoDescTextActive: {
    color: colors.textOnColor,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 10,
  },
  resumoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  resumoLabel: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
  resumoValor: {
    fontSize: 14,
    fontFamily: fonts.semibold,
    color: colors.text,
  },
  totalRow: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  totalLabel: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: colors.primaryDark,
  },
  totalFinalValor: {
    fontSize: 17,
    fontFamily: fonts.bold,
    color: colors.primary,
  },
  btnSalvar: {
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
  bloqueioCard: {
    padding: 24,
    borderColor: colors.dangerBorder,
    alignItems: 'center',
  },
  bloqueioTitulo: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: colors.danger,
    marginBottom: 12,
  },
  bloqueioMensagem: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 10,
  },
  bloqueioMensagemSub: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: colors.primaryDark,
    marginBottom: 14,
  },
  modalTabsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: 12,
  },
  modalTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  modalTabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  modalTabText: {
    fontSize: 14,
    fontFamily: fonts.semibold,
    color: colors.textMuted,
  },
  modalTabTextActive: {
    color: colors.primary,
  },
  modalItemRow: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceMuted,
  },
  modalItemRowSelected: {
    backgroundColor: colors.primarySoft,
    borderRadius: 6,
  },
  modalItemTitle: {
    fontSize: 15,
    fontFamily: fonts.semibold,
    color: colors.text,
  },
  modalItemSub: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    marginTop: 2,
  },
  itemConfigBox: {
    backgroundColor: colors.surfaceSubtle,
    padding: 12,
    borderRadius: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemConfigTitle: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: colors.primary,
    marginBottom: 8,
  },
  avisoMedicaoBox: {
    backgroundColor: colors.warningSoft,
    padding: 10,
    borderRadius: 6,
    marginBottom: 10,
  },
  avisoMedicaoText: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.warning,
    lineHeight: 16,
  },
  modalBtnFechar: {
    marginTop: 14,
  },
});
