import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
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
          ? orcamento.dataValidade.toISOString().split('T')[0]
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
        const partes = dataValidade.trim().split('-');
        if (partes.length === 3) {
          dataValidadeObj = new Date(parseInt(partes[0], 10), parseInt(partes[1], 10) - 1, parseInt(partes[2], 10));
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
        <ActivityIndicator size="large" color="#2E7D32" />
        <Text style={styles.loadingText}>Carregando dados...</Text>
      </View>
    );
  }

  if (!orcamento) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Orçamento não encontrado.</Text>
        <TouchableOpacity style={styles.btnVoltar} onPress={() => router.replace('/orcamentos' as any)}>
          <Text style={styles.btnVoltarText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // RN64 / RN65: Bloqueio estrito de edição direta para orçamentos fora de RASCUNHO
  if (orcamento.status !== StatusOrcamento.RASCUNHO) {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.bloqueioCard}>
          <Text style={styles.bloqueioTitulo}>Edição Direta Não Permitida</Text>
          <Text style={styles.bloqueioMensagem}>
            Este orçamento está no status "{orcamento.status}". Conforme as regras de negócio homologadas
            (RN64 e RN65), propostas fora do status RASCUNHO não podem ser editadas diretamente para
            preservação histórica.
          </Text>
          <Text style={styles.bloqueioMensagemSub}>
            Para alterar valores ou itens desta proposta, utilize a opção "Duplicar Orçamento" na tela de
            detalhes.
          </Text>
          <TouchableOpacity
            style={styles.btnVoltarAoDetalhe}
            onPress={() => router.replace(`/orcamentos/${orcamento.id}` as any)}
          >
            <Text style={styles.btnVoltarAoDetalheText}>Voltar para Detalhes</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerEdicao}>
          <Text style={styles.headerEdicaoNumero}>{orcamento.numero}</Text>
          <Text style={styles.headerEdicaoStatus}>Status: Rascunho (Editável)</Text>
        </View>

        {/* Cliente */}
        <View style={styles.sectionCard}>
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
        </View>

        {/* Validade */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Prazos</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Data de Validade (AAAA-MM-DD)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Ex: 2026-10-15"
              placeholderTextColor="#9E9E9E"
              value={dataValidade}
              onChangeText={setDataValidade}
            />
          </View>
        </View>

        {/* Itens */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Itens ({itens.length})</Text>
            <TouchableOpacity
              style={styles.btnAddItem}
              onPress={() => {
                setItemSelecionado(null);
                setModalItemVisible(true);
              }}
            >
              <Text style={styles.btnAddItemText}>+ Adicionar Item</Text>
            </TouchableOpacity>
          </View>

          {itens.length === 0 ? (
            <Text style={styles.emptyItensTexto}>Nenhum item adicionado.</Text>
          ) : (
            itens.map((it) => (
              <View key={it.id} style={styles.itemRowCard}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.itemDescricao}>{it.descricao}</Text>
                  <Text style={styles.itemDetalhes}>
                    {it.usaMedicaoArea
                      ? 'Medição por Área (0 m²)'
                      : `${it.quantidade} ${it.unidade} x ${formatarMoeda(it.valorUnitario)}`}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.itemValorTotal}>{formatarMoeda(it.valorTotal)}</Text>
                  <TouchableOpacity onPress={() => handleRemoverItemConfirm(it.id, it.descricao)}>
                    <Text style={styles.btnRemoverText}>Excluir</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Desconto */}
        <View style={styles.sectionCard}>
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
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                {tipoDesconto === 'PERCENTUAL' ? 'Percentual (%)' : 'Valor (R$)'}
              </Text>
              <TextInput
                style={styles.textInput}
                keyboardType="numeric"
                value={valorDescontoStr}
                onChangeText={setValorDescontoStr}
              />
            </View>
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
        </View>

        {/* Observações e Condições */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Observações e Condições</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Observações</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              multiline
              numberOfLines={3}
              value={observacoes}
              onChangeText={setObservacoes}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Condições de Pagamento</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              multiline
              numberOfLines={2}
              value={condicoesPagamento}
              onChangeText={setCondicoesPagamento}
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.btnSalvar, isSaving && styles.btnSalvarDisabled]}
          onPress={handleSalvarEdicao}
          disabled={isSaving}
          activeOpacity={0.8}
        >
          {isSaving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.btnSalvarText}>Salvar Alterações</Text>}
        </TouchableOpacity>
      </ScrollView>

      {/* Modal Seleção Cliente */}
      <Modal visible={modalClienteVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Selecione o Cliente</Text>
            <FlatList
              data={clientes}
              keyExtractor={(item) => item.id}
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
            <TouchableOpacity style={styles.modalBtnFechar} onPress={() => setModalClienteVisible(false)}>
              <Text style={styles.modalBtnFecharText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Adição de Item */}
      <Modal visible={modalItemVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
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
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Quantidade ({itemSelecionado.unidade})</Text>
                    <TextInput
                      style={styles.textInput}
                      keyboardType="numeric"
                      value={qtdDigitada}
                      onChangeText={setQtdDigitada}
                    />
                  </View>
                )}
                <TouchableOpacity style={styles.btnConfirmarItem} onPress={handleConfirmarAdicionarItem}>
                  <Text style={styles.btnConfirmarItemText}>Confirmar Inclusão</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            <TouchableOpacity style={styles.modalBtnFechar} onPress={() => setModalItemVisible(false)}>
              <Text style={styles.modalBtnFecharText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  headerEdicao: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8EAED',
    marginBottom: 12,
  },
  headerEdicaoNumero: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1B5E20',
  },
  headerEdicaoStatus: {
    fontSize: 13,
    color: '#E65100',
    marginTop: 2,
    fontWeight: '600',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8EAED',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1B5E20',
    marginBottom: 10,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  selectButton: {
    backgroundColor: '#F1F3F4',
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  selectButtonTextSelected: {
    fontSize: 15,
    fontWeight: '600',
    color: '#212121',
  },
  selectButtonTextPlaceholder: {
    fontSize: 14,
    color: '#757575',
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#424242',
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#212121',
  },
  textArea: {
    minHeight: 64,
    textAlignVertical: 'top',
  },
  btnAddItem: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  btnAddItemText: {
    color: '#2E7D32',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyItensTexto: {
    fontSize: 13,
    color: '#9E9E9E',
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  itemRowCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F3F4',
  },
  itemDescricao: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212121',
  },
  itemDetalhes: {
    fontSize: 12,
    color: '#757575',
    marginTop: 2,
  },
  itemValorTotal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2E7D32',
  },
  btnRemoverText: {
    fontSize: 12,
    color: '#C62828',
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
    borderRadius: 6,
    backgroundColor: '#F1F3F4',
  },
  tipoDescButtonActive: {
    backgroundColor: '#2E7D32',
  },
  tipoDescText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#616161',
  },
  tipoDescTextActive: {
    color: '#FFFFFF',
  },
  divider: {
    height: 1,
    backgroundColor: '#EEEEEE',
    marginVertical: 10,
  },
  resumoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  resumoLabel: {
    fontSize: 14,
    color: '#616161',
  },
  resumoValor: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212121',
  },
  totalRow: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1B5E20',
  },
  totalFinalValor: {
    fontSize: 17,
    fontWeight: '700',
    color: '#2E7D32',
  },
  btnSalvar: {
    backgroundColor: '#2E7D32',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  btnSalvarDisabled: {
    backgroundColor: '#A5D6A7',
  },
  btnSalvarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
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
  btnVoltar: {
    backgroundColor: '#2E7D32',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  btnVoltarText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  bloqueioCard: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFCDD2',
    alignItems: 'center',
  },
  bloqueioTitulo: {
    fontSize: 18,
    fontWeight: '700',
    color: '#C62828',
    marginBottom: 12,
  },
  bloqueioMensagem: {
    fontSize: 14,
    color: '#424242',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 10,
  },
  bloqueioMensagemSub: {
    fontSize: 13,
    color: '#757575',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  btnVoltarAoDetalhe: {
    backgroundColor: '#2E7D32',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  btnVoltarAoDetalheText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1B5E20',
    marginBottom: 14,
  },
  modalTabsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    marginBottom: 12,
  },
  modalTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  modalTabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#2E7D32',
  },
  modalTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#757575',
  },
  modalTabTextActive: {
    color: '#2E7D32',
  },
  modalItemRow: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  modalItemRowSelected: {
    backgroundColor: '#E8F5E9',
    borderRadius: 6,
  },
  modalItemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#212121',
  },
  modalItemSub: {
    fontSize: 13,
    color: '#757575',
    marginTop: 2,
  },
  itemConfigBox: {
    backgroundColor: '#FAFAFA',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  itemConfigTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2E7D32',
    marginBottom: 8,
  },
  avisoMedicaoBox: {
    backgroundColor: '#FFF8E1',
    padding: 10,
    borderRadius: 6,
    marginBottom: 10,
  },
  avisoMedicaoText: {
    fontSize: 12,
    color: '#F57F17',
    lineHeight: 16,
  },
  btnConfirmarItem: {
    backgroundColor: '#2E7D32',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  btnConfirmarItemText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  modalBtnFechar: {
    marginTop: 14,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#F1F3F4',
    borderRadius: 8,
  },
  modalBtnFecharText: {
    color: '#424242',
    fontWeight: '600',
    fontSize: 14,
  },
});
