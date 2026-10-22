import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Keyboard,
} from 'react-native';
import { MapProvider } from '../../../infrastructure/maps/map-provider';
import { CoordenadaMapa, RegiaoMapa } from '../../../infrastructure/maps/map-provider.interface';
import { useMapaDelimitacao } from '../../hooks/use-mapa-delimitacao';
import { usePesquisaEndereco } from '../../hooks/use-pesquisa-endereco';
import { GeometriaPoligono } from '../../../domain/types/geometria';
import { colors, fonts } from '../../theme';
import { Button, Icon, TextField } from '../ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Área salva aberta para edição (RF45/RF46): o desenho começa com seus vértices e dados. */
export interface AreaEmEdicao {
  vertices: CoordenadaMapa[];
  nome: string;
  observacoes: string;
}

interface MapaDelimitacaoProps {
  regiaoInicial?: RegiaoMapa;
  areaInicial?: AreaEmEdicao;
  onSalvarArea: (dados: {
    nome: string;
    observacoes?: string | null;
    geometria: GeometriaPoligono;
  }) => Promise<void>;
  onCancelar: () => void;
  salvando?: boolean;
}

/**
 * Componente de Apresentação interativo para Delimitação de Áreas no Mapa.
 * Renderiza em modo Satélite por padrão e oferece ferramentas de desenho e conclusão.
 */
export const MapaDelimitacao: React.FC<MapaDelimitacaoProps> = ({
  regiaoInicial,
  areaInicial,
  onSalvarArea,
  onCancelar,
  salvando = false,
}) => {
  const emEdicao = !!areaInicial;
  const {
    vertices,
    modoMapa,
    areaEstimada,
    isPoligonoValido,
    adicionarVertice,
    moverVertice,
    desfazerUltimoVertice,
    limparVertices,
    alternarModoMapa,
    converterParaGeometriaDominio,
  } = useMapaDelimitacao(areaInicial?.vertices);

  const {
    texto: textoBusca,
    setTexto: setTextoBusca,
    pesquisando: pesquisandoEndereco,
    pontoEncontrado,
    regiaoFoco,
    pesquisar: executarPesquisa,
    limparPesquisa,
  } = usePesquisaEndereco();

  const [modalVisible, setModalVisible] = useState(false);
  const [nome, setNome] = useState(areaInicial?.nome ?? '');
  const [observacoes, setObservacoes] = useState(areaInicial?.observacoes ?? '');

  const handlePesquisarEndereco = async () => {
    Keyboard.dismiss();
    const resultado = await executarPesquisa();
    if (!resultado.sucesso && resultado.erro) {
      Alert.alert('Busca de Endereço', resultado.erro);
    }
  };

  const handleAbrirConclusao = () => {
    if (!isPoligonoValido) {
      Alert.alert(
        'Vértices Insuficientes',
        'Toque no mapa para marcar pelo menos 3 pontos e formar uma área.'
      );
      return;
    }
    setModalVisible(true);
  };

  const handleConfirmarSalvar = async () => {
    if (!nome.trim()) {
      Alert.alert('Nome Obrigatório', 'Informe um nome descritivo para identificar a área.');
      return;
    }

    try {
      const geometria = converterParaGeometriaDominio();
      await onSalvarArea({
        nome: nome.trim(),
        observacoes: observacoes.trim() || null,
        geometria,
      });
      setModalVisible(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao salvar área.';
      Alert.alert('Erro ao Salvar', msg);
    }
  };

  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      {/* Provedor de Mapa (react-native-maps com Google Maps no Android) */}
      <MapProvider
        regiaoInicial={regiaoInicial}
        regiaoFoco={regiaoFoco ?? undefined}
        pontoPesquisado={pontoEncontrado}
        modoMapa={modoMapa}
        vertices={vertices}
        onAdicionarVertice={adicionarVertice}
        onMoverVertice={moverVertice}
        desenhoHabilitado={!modalVisible && !salvando}
      />

      {/* Topo flutuante: voltar, busca de endereço (RF12 / RN09) e modo do mapa */}
      <View style={[styles.topo, { top: insets.top + 12 }]}>
        <View style={styles.topoLinha}>
          <TouchableOpacity
            style={styles.btnCircular}
            onPress={onCancelar}
            disabled={salvando}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Voltar"
          >
            <Icon name="close" size={22} color={colors.text} />
          </TouchableOpacity>

          <View style={styles.buscaPill}>
            <Icon name="map-pin" size={18} color={colors.primary} />
            <TextInput
              style={styles.buscaInput}
              placeholder="Buscar endereço, rua, bairro..."
              placeholderTextColor={colors.textPlaceholder}
              value={textoBusca}
              onChangeText={setTextoBusca}
              returnKeyType="search"
              onSubmitEditing={handlePesquisarEndereco}
              editable={!pesquisandoEndereco && !salvando}
              autoCorrect={false}
            />
            {textoBusca.length > 0 && (
              <TouchableOpacity
                onPress={limparPesquisa}
                disabled={pesquisandoEndereco || salvando}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Limpar busca"
              >
                <Icon name="close" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                styles.btnBuscar,
                (pesquisandoEndereco || salvando) && styles.btnBuscarDesabilitado,
              ]}
              onPress={handlePesquisarEndereco}
              disabled={pesquisandoEndereco || salvando}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Buscar endereço"
            >
              {pesquisandoEndereco ? (
                <ActivityIndicator size="small" color={colors.surface} />
              ) : (
                <Icon name="search" size={18} color={colors.textOnColor} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={styles.chipModo}
          onPress={alternarModoMapa}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={modoMapa === 'satellite' ? 'Mapa em modo satélite' : 'Mapa em modo padrão'}
        >
          <Text style={styles.chipModoTexto}>
            <Icon name={modoMapa === 'satellite' ? 'satellite' : 'map'} size={14} />{' '}
            {modoMapa === 'satellite' ? 'Satélite' : 'Padrão'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Painel inferior: metragem (RNF05), dica e ações de desenho */}
      <View style={[styles.painel, { paddingBottom: 16 + insets.bottom }]}>
        <View style={styles.painelAlca} />
        <View style={styles.painelLinha}>
          <View>
            <Text style={styles.painelRotulo}>Área Calculada</Text>
            <Text style={styles.painelArea}>
              {areaEstimada > 0 ? `${areaEstimada.toFixed(2)} m²` : '0.00 m²'}
            </Text>
          </View>
          <View style={styles.pontosBadge}>
            <Text style={styles.pontosTexto}>
              {vertices.length} {vertices.length === 1 ? 'ponto' : 'pontos'}
            </Text>
          </View>
        </View>

        {vertices.length < 3 ? (
          <Text style={styles.dica}>
            Toque no mapa para marcar {3 - vertices.length} {3 - vertices.length === 1 ? 'vértice restante' : 'vértices'}
          </Text>
        ) : (
          <Text style={styles.dicaSucesso}>
            <Icon name="check" size={13} /> Polígono delimitado. Toque para adicionar pontos, segure um ponto para ajustar a posição ou conclua a medição.
          </Text>
        )}

        <View style={styles.ferramentas}>
          <TouchableOpacity
            style={[styles.btnFerramenta, vertices.length === 0 && styles.btnFerramentaDesabilitado]}
            onPress={desfazerUltimoVertice}
            disabled={vertices.length === 0 || salvando}
            activeOpacity={0.7}
            accessibilityRole="button"
          >
            <Text style={[styles.btnFerramentaTexto, vertices.length === 0 && styles.btnFerramentaTextoDesabilitado]}>
              <Icon name="undo" size={15} /> Desfazer
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btnFerramenta, styles.btnFerramentaLimpar, vertices.length === 0 && styles.btnFerramentaDesabilitado]}
            onPress={limparVertices}
            disabled={vertices.length === 0 || salvando}
            activeOpacity={0.7}
            accessibilityRole="button"
          >
            <Text style={[styles.btnLimparTexto, vertices.length === 0 && styles.btnFerramentaTextoDesabilitado]}>
              <Icon name="trash" size={15} /> Limpar
            </Text>
          </TouchableOpacity>
        </View>

        <Button
          title={`Concluir Medição (${areaEstimada.toFixed(1)} m²)`}
          onPress={handleAbrirConclusao}
          disabled={!isPoligonoValido || salvando}
        />
      </View>

      {/* Modal para Definir Nome e Observações da Área */}
      <Modal visible={modalVisible} transparent animationType="slide">
        {/* No Android a janela do Modal já usa SOFT_INPUT_ADJUST_RESIZE; compensar também com
            behavior="height" fazia o painel oscilar verticalmente ao abrir o teclado. */}
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalContent}>
            <ScrollView
              contentContainerStyle={styles.modalScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              <Text style={styles.modalTitulo}>{emEdicao ? 'Editar Área Medida' : 'Salvar Área Medida'}</Text>
              <Text style={styles.modalSubtitulo}>
                Metragem calculada:{' '}
                <Text style={styles.modalDestaque}>{areaEstimada.toFixed(2)} m²</Text>
              </Text>

              <TextField
                label="Nome da Área *"
                placeholder="Ex: Gramado Frontal, Jardim Lateral"
                value={nome}
                onChangeText={setNome}
              />

              <TextField
                label="Observações (opcional)"
                style={styles.textArea}
                placeholder="Ex: Terreno plano, terra boa"
                value={observacoes}
                onChangeText={setObservacoes}
                multiline
                numberOfLines={3}
              />

              <View style={styles.modalActions}>
                <Button
                  title="Voltar"
                  variant="neutral"
                  onPress={() => setModalVisible(false)}
                  disabled={salvando}
                  style={styles.modalBtnAcao}
                />

                <Button
                  title={emEdicao ? 'Salvar alterações' : 'Salvar Área'}
                  onPress={handleConfirmarSalvar}
                  loading={salvando}
                  style={styles.modalBtnAcao}
                />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  topo: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 10,
    gap: 10,
  },
  topoLinha: {
    flexDirection: 'row',
    gap: 10,
  },
  btnCircular: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  buscaPill: {
    flex: 1,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 14,
    paddingRight: 5,
    borderRadius: 14,
    backgroundColor: colors.surface,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  buscaInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.text,
    paddingVertical: 0,
  },
  btnBuscar: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnBuscarDesabilitado: {
    opacity: 0.6,
  },
  chipModo: {
    alignSelf: 'flex-end',
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    justifyContent: 'center',
    backgroundColor: colors.surface,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  chipModoTexto: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: colors.primaryDark,
  },
  painel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    gap: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 12,
  },
  painelAlca: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
  },
  painelLinha: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  painelRotulo: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  painelArea: {
    fontSize: 30,
    fontFamily: fonts.extrabold,
    color: colors.text,
    marginTop: 2,
  },
  pontosBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.primarySoft,
  },
  pontosTexto: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: colors.primaryDark,
  },
  dica: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
  dicaSucesso: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: colors.primary,
  },
  ferramentas: {
    flexDirection: 'row',
    gap: 10,
  },
  btnFerramenta: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnFerramentaLimpar: {
    borderColor: colors.dangerBorder,
  },
  btnFerramentaDesabilitado: {
    opacity: 0.5,
  },
  btnFerramentaTexto: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: colors.text,
  },
  btnLimparTexto: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: colors.danger,
  },
  btnFerramentaTextoDesabilitado: {
    color: colors.textMuted,
  },
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  // Painel inferior (mesmo layout dos modais de orçamento): o modal centralizado com
  // altura percentual oscilava verticalmente ao abrir o teclado no Android.
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 8,
  },
  modalScrollContent: {
    flexGrow: 0,
  },
  modalTitulo: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: colors.text,
    marginBottom: 4,
  },
  modalSubtitulo: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    marginBottom: 16,
  },
  modalDestaque: {
    color: colors.primary,
    fontFamily: fonts.bold,
  },
  textArea: {
    height: 70,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 10,
  },
  modalBtnAcao: {
    flex: 1,
  },
});
