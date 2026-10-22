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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { orcamentoService } from '../../../src/application/services/orcamento.service';
import { clienteService } from '../../../src/application/services/cliente.service';
import { servicoService } from '../../../src/application/services/servico.service';
import { produtoService } from '../../../src/application/services/produto.service';
import { Cliente } from '../../../src/domain/entities/cliente';
import { Servico } from '../../../src/domain/entities/servico';
import { Produto } from '../../../src/domain/entities/produto';
import { TipoItem } from '../../../src/domain/enums/tipo-item';
import { TipoDesconto } from '../../../src/domain/enums/tipo-desconto';
import {
  aplicarMascaraData,
  parseDataCivil,
} from '../../../src/presentation/utils/data-formatters';
import { colors } from '../../../src/presentation/theme';

interface ItemTemporario {
  tempId: string;
  tipo: TipoItem;
  origemId: string;
  descricao: string;
  unidade: string;
  valorUnitario: number;
  quantidade: number;
  valorTotal: number;
  usaMedicaoArea: boolean;
}

export default function NovoOrcamentoScreen() {
  const router = useRouter();

  // Estados dos dados do formulário
  const [clienteId, setClienteId] = useState<string>('');
  const [numero, setNumero] = useState<string>('');
  const [dataValidade, setDataValidade] = useState<string>('');
  const [tipoDesconto, setTipoDesconto] = useState<'NENHUM' | 'PERCENTUAL' | 'FIXO'>('NENHUM');
  const [valorDescontoStr, setValorDescontoStr] = useState<string>('');
  const [observacoes, setObservacoes] = useState<string>('');
  const [condicoesPagamento, setCondicoesPagamento] = useState<string>('');
  const [itens, setItens] = useState<ItemTemporario[]>([]);

  // Estados de catálogo disponíveis
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loadingCatalogos, setLoadingCatalogos] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Estados dos modais de seleção
  const [modalClienteVisible, setModalClienteVisible] = useState<boolean>(false);
  const [modalItemVisible, setModalItemVisible] = useState<boolean>(false);
  const [abaItem, setAbaItem] = useState<'SERVICO' | 'PRODUTO'>('SERVICO');

  // Estado para inserção de quantidade no modal
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
        Alert.alert('Erro', 'Falha ao carregar catálogo para criação do orçamento.');
      } finally {
        setLoadingCatalogos(false);
      }
    }
    carregarCatalogos();
  }, []);

  const clienteSelecionado = useMemo(() => {
    return clientes.find((c) => c.id === clienteId);
  }, [clientes, clienteId]);

  // Cálculos financeiros do orçamento
  const subtotal = useMemo(() => {
    return itens.reduce((acc, it) => acc + it.valorTotal, 0);
  }, [itens]);

  const valorDescontoCalculado = useMemo(() => {
    const valNum = parseFloat(valorDescontoStr.replace(',', '.')) || 0;
    if (tipoDesconto === 'PERCENTUAL') {
      const pct = Math.min(Math.max(valNum, 0), 100);
      return (subtotal * pct) / 100;
    } else if (tipoDesconto === 'FIXO') {
      return Math.min(Math.max(valNum, 0), subtotal);
    }
    return 0;
  }, [tipoDesconto, valorDescontoStr, subtotal]);

  const totalFinal = useMemo(() => {
    return Math.max(0, subtotal - valorDescontoCalculado);
  }, [subtotal, valorDescontoCalculado]);

  const formatarMoeda = (valor: number): string => {
    return `R$ ${valor.toFixed(2).replace('.', ',')}`;
  };

  // Manipulação de itens
  const handleSelecionarOrigem = (origem: Servico | Produto) => {
    setItemSelecionado(origem);
    if ('usaMedicaoArea' in origem && origem.usaMedicaoArea) {
      setQtdDigitada('0');
    } else {
      setQtdDigitada('1');
    }
  };

  const handleConfirmarAdicionarItem = () => {
    if (!itemSelecionado) return;

    const isServico = 'usaMedicaoArea' in itemSelecionado;
    const usaMedicaoArea = isServico ? Boolean(itemSelecionado.usaMedicaoArea) : false;
    const qtdNum = usaMedicaoArea ? 0 : parseFloat(qtdDigitada.replace(',', '.')) || 1;

    if (!usaMedicaoArea && qtdNum <= 0) {
      Alert.alert('Quantidade Inválida', 'A quantidade informada deve ser maior que zero.');
      return;
    }

    const valorUnitario = itemSelecionado.precoBase;
    const valorTotal = usaMedicaoArea ? 0 : Number((qtdNum * valorUnitario).toFixed(2));

    const novoItem: ItemTemporario = {
      tempId: Math.random().toString(),
      tipo: isServico ? TipoItem.SERVICO : TipoItem.PRODUTO,
      origemId: itemSelecionado.id,
      descricao: itemSelecionado.nome,
      unidade: usaMedicaoArea ? 'm²' : itemSelecionado.unidade,
      valorUnitario,
      quantidade: qtdNum,
      valorTotal,
      usaMedicaoArea,
    };

    setItens((prev) => [...prev, novoItem]);
    setItemSelecionado(null);
    setModalItemVisible(false);
  };

  const handleRemoverItem = (tempId: string) => {
    setItens((prev) => prev.filter((it) => it.tempId !== tempId));
  };

  const handleMedirAreaItemTemporario = async (itemTemp: ItemTemporario) => {
    if (!clienteId) {
      Alert.alert(
        'Cliente Obrigatório',
        'Selecione um cliente para o orçamento antes de delimitar a área no mapa.'
      );
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

      const subtotalCalculado = itens.reduce((acc, it) => acc + it.valorTotal, 0);

      const tipoDescEnum =
        tipoDesconto === 'PERCENTUAL'
          ? TipoDesconto.PERCENTUAL
          : tipoDesconto === 'FIXO'
          ? TipoDesconto.FIXO
          : null;

      const valDescNum = tipoDescEnum ? parseFloat(valorDescontoStr.replace(',', '.')) || 0 : 0;

      if (tipoDescEnum === TipoDesconto.FIXO && valDescNum > subtotalCalculado) {
        Alert.alert(
          'Desconto Inválido',
          `O desconto fixo (R$ ${valDescNum.toFixed(2)}) não pode ser superior ao subtotal dos itens (R$ ${subtotalCalculado.toFixed(2)}).`
        );
        setIsSaving(false);
        return;
      }

      const adiarDescontoFixo = tipoDescEnum === TipoDesconto.FIXO && valDescNum > 0;

      // 1. Cria o orçamento em status RASCUNHO com desconto neutro quando adiarDescontoFixo
      const novoOrcamento = await orcamentoService.criarOrcamento({
        clienteId,
        numero: numero.trim() || undefined,
        dataValidade: dataValidadeObj,
        tipoDesconto: adiarDescontoFixo ? null : tipoDescEnum,
        valorDesconto: adiarDescontoFixo ? 0 : valDescNum,
        observacoes: observacoes.trim() || null,
        condicoesPagamento: condicoesPagamento.trim() || null,
      });

      // 2. Adiciona os itens e identifica o ID persistido do item alvo da medição
      let itemPersistidoAlvoId: string | null = null;
      for (const it of itens) {
        const itemCriado = await orcamentoService.adicionarItem({
          orcamentoId: novoOrcamento.id,
          tipo: it.tipo,
          servicoId: it.tipo === TipoItem.SERVICO ? it.origemId : null,
          produtoId: it.tipo === TipoItem.PRODUTO ? it.origemId : null,
          quantidade: it.quantidade,
        });

        if (it.tempId === itemTemp.tempId) {
          itemPersistidoAlvoId = itemCriado.id;
        }
      }

      // 3. Somente após existir subtotal dos itens, persiste o desconto fixo informado e recalcula o total
      if (adiarDescontoFixo) {
        await orcamentoService.atualizarOrcamento(novoOrcamento.id, {
          tipoDesconto: TipoDesconto.FIXO,
          valorDesconto: valDescNum,
        });
      }

      if (!itemPersistidoAlvoId) {
        Alert.alert('Erro', 'Não foi possível identificar o item de serviço para medição.');
        return;
      }

      // 4. Substitui a rota atual por EditarOrcamento para continuidade fluida do fluxo
      router.replace({
        pathname: '/orcamentos/editar',
        params: { id: novoOrcamento.id },
      } as any);

      // 5. Navega imediatamente para a gestão de áreas do item com auto-abertura do mapa
      router.push({
        pathname: '/orcamentos/areas',
        params: {
          orcamentoId: novoOrcamento.id,
          itemId: itemPersistidoAlvoId,
          autoAbrirMapa: 'true',
        },
      } as any);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao iniciar medição de área.';
      Alert.alert('Erro ao Iniciar Medição', msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSalvarOrcamento = async () => {
    if (!clienteId) {
      Alert.alert('Campo Obrigatório', 'Selecione um cliente para o orçamento.');
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

      const subtotalCalculado = itens.reduce((acc, it) => acc + it.valorTotal, 0);

      const tipoDescEnum =
        tipoDesconto === 'PERCENTUAL'
          ? TipoDesconto.PERCENTUAL
          : tipoDesconto === 'FIXO'
          ? TipoDesconto.FIXO
          : null;

      const valDescNum = tipoDescEnum ? parseFloat(valorDescontoStr.replace(',', '.')) || 0 : 0;

      // Validação: desconto fixo positivo não pode exceder o subtotal dos itens adicionados
      if (tipoDescEnum === TipoDesconto.FIXO && valDescNum > subtotalCalculado) {
        Alert.alert(
          'Desconto Inválido',
          `O desconto fixo (R$ ${valDescNum.toFixed(2)}) não pode ser superior ao subtotal dos itens (R$ ${subtotalCalculado.toFixed(2)}).`
        );
        setIsSaving(false);
        return;
      }

      // Se for desconto FIXO positivo, adia a persistência para após a criação dos itens e cálculo do subtotal
      const adiarDescontoFixo = tipoDescEnum === TipoDesconto.FIXO && valDescNum > 0;

      // 1. Cria o orçamento em status RASCUNHO com desconto neutro quando adiarDescontoFixo
      const novoOrcamento = await orcamentoService.criarOrcamento({
        clienteId,
        numero: numero.trim() || undefined,
        dataValidade: dataValidadeObj,
        tipoDesconto: adiarDescontoFixo ? null : tipoDescEnum,
        valorDesconto: adiarDescontoFixo ? 0 : valDescNum,
        observacoes: observacoes.trim() || null,
        condicoesPagamento: condicoesPagamento.trim() || null,
      });

      // 2. Adiciona os itens com snapshot histórico de preço e descrição (calcula e persiste subtotal)
      for (const it of itens) {
        await orcamentoService.adicionarItem({
          orcamentoId: novoOrcamento.id,
          tipo: it.tipo,
          servicoId: it.tipo === TipoItem.SERVICO ? it.origemId : null,
          produtoId: it.tipo === TipoItem.PRODUTO ? it.origemId : null,
          quantidade: it.quantidade,
        });
      }

      // 3. Somente após existir subtotal dos itens, persiste o desconto fixo informado e recalcula o total
      if (adiarDescontoFixo) {
        await orcamentoService.atualizarOrcamento(novoOrcamento.id, {
          tipoDesconto: TipoDesconto.FIXO,
          valorDesconto: valDescNum,
        });
      }

      Alert.alert('Sucesso', `Orçamento ${novoOrcamento.numero} criado com sucesso!`, [
        {
          text: 'Visualizar',
          onPress: () => router.replace(`/orcamentos/${novoOrcamento.id}` as any),
        },
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao salvar orçamento.';
      Alert.alert('Erro ao Salvar', msg);
    } finally {
      setIsSaving(false);
    }
  };

  if (loadingCatalogos) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Carregando dados para o orçamento...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Card do Cliente */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>1. Cliente *</Text>
          <TouchableOpacity
            style={styles.selectButton}
            onPress={() => setModalClienteVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={clienteSelecionado ? styles.selectButtonTextSelected : styles.selectButtonTextPlaceholder}>
              {clienteSelecionado ? clienteSelecionado.nome : 'Toque para selecionar o cliente...'}
            </Text>
          </TouchableOpacity>
          {clienteSelecionado?.telefone ? (
            <Text style={styles.clienteSubtext}>Telefone: {clienteSelecionado.telefone}</Text>
          ) : null}
        </View>

        {/* Card de Identificação e Validade */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>2. Identificação e Validade</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Número do Orçamento (opcional)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Automático (ex: ORC-2026-001)"
              placeholderTextColor={colors.textPlaceholder}
              value={numero}
              onChangeText={setNumero}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Data de Validade (opcional no Rascunho)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="DD/MM/AAAA (ex: 07/10/2026)"
              placeholderTextColor={colors.textPlaceholder}
              value={dataValidade}
              onChangeText={(val) => setDataValidade(aplicarMascaraData(val))}
              keyboardType="numeric"
              maxLength={10}
            />
          </View>
        </View>

        {/* Card de Itens */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>3. Itens do Orçamento</Text>
            <TouchableOpacity
              style={styles.btnAddItem}
              onPress={() => {
                setItemSelecionado(null);
                setModalItemVisible(true);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.btnAddItemText}>+ Adicionar Item</Text>
            </TouchableOpacity>
          </View>

          {itens.length === 0 ? (
            <View style={styles.emptyItensBox}>
              <Text style={styles.emptyItensText}>Nenhum item adicionado ainda.</Text>
              <Text style={styles.emptyItensSubtext}>
                Adicione serviços ou produtos do seu catálogo para compor a proposta.
              </Text>
            </View>
          ) : (
            itens.map((it, idx) => (
              <View key={it.tempId} style={styles.itemRowCard}>
                <View style={styles.itemInfoCol}>
                  <View style={{ flexDirection: 'row', gap: 6, marginBottom: 4 }}>
                    <View style={styles.itemTipoBadge}>
                      <Text style={styles.itemTipoText}>{it.tipo}</Text>
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
                      onPress={() => handleMedirAreaItemTemporario(it)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.btnMedirAreaText}>
                        🗺️ {it.quantidade > 0 ? `Áreas Medidas (${it.quantidade.toFixed(2)} m²)` : 'Medir Área no Mapa'}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
                <View style={styles.itemAcoesCol}>
                  <Text style={styles.itemValorTotal}>{formatarMoeda(it.valorTotal)}</Text>
                  <TouchableOpacity onPress={() => handleRemoverItem(it.tempId)}>
                    <Text style={styles.btnRemoverText}>Remover</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Card de Desconto e Totais */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>4. Desconto e Resumo</Text>

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
                {tipoDesconto === 'PERCENTUAL' ? 'Percentual de Desconto (0% a 100%)' : 'Valor do Desconto (R$)'}
              </Text>
              <TextInput
                style={styles.textInput}
                keyboardType="numeric"
                placeholder={tipoDesconto === 'PERCENTUAL' ? 'Ex: 10' : 'Ex: 50,00'}
                placeholderTextColor={colors.textPlaceholder}
                value={valorDescontoStr}
                onChangeText={setValorDescontoStr}
              />
            </View>
          ) : null}

          <View style={styles.divider} />

          <View style={styles.resumoRow}>
            <Text style={styles.resumoLabel}>Subtotal:</Text>
            <Text style={styles.resumoValor}>{formatarMoeda(subtotal)}</Text>
          </View>
          {valorDescontoCalculado > 0 ? (
            <View style={styles.resumoRow}>
              <Text style={styles.resumoLabelDesconto}>Desconto Aplicado:</Text>
              <Text style={styles.resumoValorDesconto}>- {formatarMoeda(valorDescontoCalculado)}</Text>
            </View>
          ) : null}
          <View style={[styles.resumoRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total:</Text>
            <Text style={styles.totalFinalValor}>{formatarMoeda(totalFinal)}</Text>
          </View>
        </View>

        {/* Card de Observações e Condições */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>5. Informações Complementares</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Observações</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              multiline
              numberOfLines={3}
              placeholder="Instruções de serviço, detalhes do local, etc."
              placeholderTextColor={colors.textPlaceholder}
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
              placeholder="Ex: 50% de entrada e restante na conclusão via Pix"
              placeholderTextColor={colors.textPlaceholder}
              value={condicoesPagamento}
              onChangeText={setCondicoesPagamento}
            />
          </View>
        </View>

        {/* Botão de Criação */}
        <TouchableOpacity
          style={[styles.btnSalvar, isSaving && styles.btnSalvarDisabled]}
          onPress={handleSalvarOrcamento}
          disabled={isSaving}
          activeOpacity={0.8}
        >
          {isSaving ? (
            <ActivityIndicator color={colors.surface} />
          ) : (
            <Text style={styles.btnSalvarText}>Salvar Orçamento (Rascunho)</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Modal de Seleção de Cliente */}
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
              ListEmptyComponent={<Text style={styles.emptyListModal}>Nenhum cliente ativo cadastrado.</Text>}
            />
            <TouchableOpacity style={styles.modalBtnFechar} onPress={() => setModalClienteVisible(false)}>
              <Text style={styles.modalBtnFecharText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal de Seleção de Item (Serviço XOR Produto) */}
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
                renderItem={({ item }) => {
                  const isSelected = itemSelecionado?.id === item.id;
                  return (
                    <TouchableOpacity
                      style={[styles.modalItemRow, isSelected && styles.modalItemRowSelected]}
                      onPress={() => handleSelecionarOrigem(item)}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.modalItemTitle}>{item.nome}</Text>
                        <Text style={styles.modalItemSub}>
                          {item.usaMedicaoArea ? 'Medição de Área (m²)' : `Unidade: ${item.unidade}`} •{' '}
                          {formatarMoeda(item.precoBase)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                }}
                ListEmptyComponent={<Text style={styles.emptyListModal}>Nenhum serviço ativo encontrado.</Text>}
              />
            ) : (
              <FlatList
                data={produtos}
                keyExtractor={(item) => item.id}
                style={{ maxHeight: 220 }}
                renderItem={({ item }) => {
                  const isSelected = itemSelecionado?.id === item.id;
                  return (
                    <TouchableOpacity
                      style={[styles.modalItemRow, isSelected && styles.modalItemRowSelected]}
                      onPress={() => handleSelecionarOrigem(item)}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.modalItemTitle}>{item.nome}</Text>
                        <Text style={styles.modalItemSub}>
                          Unidade: {item.unidade} • {formatarMoeda(item.precoBase)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                }}
                ListEmptyComponent={<Text style={styles.emptyListModal}>Nenhum produto ativo encontrado.</Text>}
              />
            )}

            {itemSelecionado ? (
              <View style={styles.itemConfigBox}>
                <Text style={styles.itemConfigTitle}>Configurar: {itemSelecionado.nome}</Text>
                {'usaMedicaoArea' in itemSelecionado && itemSelecionado.usaMedicaoArea ? (
                  <View style={styles.avisoMedicaoBox}>
                    <Text style={styles.avisoMedicaoText}>
                      Este serviço utiliza medição de área. A quantidade será de 0 m² inicialmente e calculada
                      a partir das áreas delimitadas no módulo de Áreas.
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
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primaryDark,
    marginBottom: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  selectButton: {
    backgroundColor: colors.surfaceMuted,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectButtonTextSelected: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  selectButtonTextPlaceholder: {
    fontSize: 14,
    color: colors.textMuted,
  },
  clienteSubtext: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 6,
    marginLeft: 2,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
  },
  textArea: {
    minHeight: 64,
    textAlignVertical: 'top',
  },
  btnAddItem: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  btnAddItemText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  emptyItensBox: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 8,
  },
  emptyItensText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
  },
  emptyItensSubtext: {
    fontSize: 12,
    color: colors.textPlaceholder,
    textAlign: 'center',
    marginTop: 4,
  },
  itemRowCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceMuted,
  },
  itemInfoCol: {
    flex: 1,
    marginRight: 10,
  },
  itemTipoBadge: {
    backgroundColor: colors.tealSoft,
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 4,
  },
  itemTipoText: {
    fontSize: 10,
    fontWeight: '700',
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
    marginBottom: 4,
  },
  itemMedicaoBadgeText: {
    fontSize: 10,
    fontWeight: '700',
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
    fontWeight: '700',
  },
  itemDescricao: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  itemDetalhes: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  itemAcoesCol: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  itemValorTotal: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  btnRemoverText: {
    fontSize: 12,
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
    borderRadius: 6,
    backgroundColor: colors.surfaceMuted,
  },
  tipoDescButtonActive: {
    backgroundColor: colors.primary,
  },
  tipoDescText: {
    fontSize: 12,
    fontWeight: '600',
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
    color: colors.textMuted,
  },
  resumoValor: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  resumoLabelDesconto: {
    fontSize: 14,
    color: colors.danger,
  },
  resumoValorDesconto: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.danger,
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  totalFinalValor: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  btnSalvar: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  btnSalvarDisabled: {
    backgroundColor: colors.primaryBorder,
  },
  btnSalvarText: {
    color: colors.textOnColor,
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
    color: colors.textMuted,
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
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
    fontWeight: '600',
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
    fontWeight: '600',
    color: colors.text,
  },
  modalItemSub: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  itemConfigBox: {
    backgroundColor: colors.surfaceSubtle,
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemConfigTitle: {
    fontSize: 14,
    fontWeight: '700',
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
    color: colors.warning,
    lineHeight: 16,
  },
  btnConfirmarItem: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  btnConfirmarItemText: {
    color: colors.textOnColor,
    fontWeight: '600',
    fontSize: 14,
  },
  emptyListModal: {
    padding: 20,
    textAlign: 'center',
    color: colors.textPlaceholder,
  },
  modalBtnFechar: {
    marginTop: 14,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: 8,
  },
  modalBtnFecharText: {
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 14,
  },
});
