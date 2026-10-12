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
import { RegiaoMapa } from '../../../infrastructure/maps/map-provider.interface';
import { useMapaDelimitacao } from '../../hooks/use-mapa-delimitacao';
import { usePesquisaEndereco } from '../../hooks/use-pesquisa-endereco';
import { GeometriaPoligono } from '../../../domain/types/geometria';

interface MapaDelimitacaoProps {
  regiaoInicial?: RegiaoMapa;
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
  onSalvarArea,
  onCancelar,
  salvando = false,
}) => {
  const {
    vertices,
    modoMapa,
    areaEstimada,
    isPoligonoValido,
    adicionarVertice,
    desfazerUltimoVertice,
    limparVertices,
    alternarModoMapa,
    converterParaGeometriaDominio,
  } = useMapaDelimitacao();

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
  const [nome, setNome] = useState('');
  const [observacoes, setObservacoes] = useState('');

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
        desenhoHabilitado={!modalVisible && !salvando}
      />

      {/* Painel Superior Flutuante: Feedback de Metragem e Modo Satélite */}
      <View style={styles.topOverlay}>
        <View style={styles.topRow}>
          <TouchableOpacity
            style={styles.btnVoltarTop}
            onPress={onCancelar}
            disabled={salvando}
            activeOpacity={0.7}
          >
            <Text style={styles.btnVoltarTopText}>✕ Voltar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.btnModoMapa}
            onPress={alternarModoMapa}
            activeOpacity={0.7}
          >
            <Text style={styles.btnModoMapaText}>
              {modoMapa === 'satellite' ? '🛰️ Satélite' : '🗺️ Padrão'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Barra de Pesquisa de Endereço no Mapa (RF12 / RN09) */}
        <View style={styles.searchBarContainer}>
          <TextInput
            style={styles.searchBarInput}
            placeholder="Buscar endereço, rua, bairro..."
            placeholderTextColor="#9E9E9E"
            value={textoBusca}
            onChangeText={setTextoBusca}
            returnKeyType="search"
            onSubmitEditing={handlePesquisarEndereco}
            editable={!pesquisandoEndereco && !salvando}
            autoCorrect={false}
          />
          {textoBusca.length > 0 && (
            <TouchableOpacity
              style={styles.btnSearchClear}
              onPress={limparPesquisa}
              disabled={pesquisandoEndereco || salvando}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.btnSearchClearText}>✕</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[
              styles.btnSearch,
              (pesquisandoEndereco || salvando) && styles.btnSearchDisabled,
            ]}
            onPress={handlePesquisarEndereco}
            disabled={pesquisandoEndereco || salvando}
            activeOpacity={0.7}
          >
            {pesquisandoEndereco ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.btnSearchText}>🔍</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.feedbackCard}>
          <View style={styles.feedbackRow}>
            <View>
              <Text style={styles.feedbackLabel}>Área Calculada</Text>
              <Text style={styles.feedbackValor}>
                {areaEstimada > 0 ? `${areaEstimada.toFixed(2)} m²` : '0.00 m²'}
              </Text>
            </View>
            <View style={styles.verticeBadge}>
              <Text style={styles.verticeBadgeText}>
                {vertices.length} {vertices.length === 1 ? 'ponto' : 'pontos'}
              </Text>
            </View>
          </View>
          {vertices.length < 3 ? (
            <Text style={styles.dicaText}>
              Toque no mapa para marcar {3 - vertices.length} {3 - vertices.length === 1 ? 'vértice restante' : 'vértices'}
            </Text>
          ) : (
            <Text style={styles.dicaSucessoText}>
              ✓ Polígono delimitado. Toque para adicionar mais pontos ou conclua a medição.
            </Text>
          )}
        </View>
      </View>

      {/* Barra Inferior de Ações */}
      <View style={styles.bottomOverlay}>
        <View style={styles.toolbarRow}>
          <TouchableOpacity
            style={[styles.btnTool, vertices.length === 0 && styles.btnToolDisabled]}
            onPress={desfazerUltimoVertice}
            disabled={vertices.length === 0 || salvando}
            activeOpacity={0.7}
          >
            <Text style={[styles.btnToolText, vertices.length === 0 && styles.btnToolTextDisabled]}>
              ↩ Desfazer
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btnTool, vertices.length === 0 && styles.btnToolDisabled]}
            onPress={limparVertices}
            disabled={vertices.length === 0 || salvando}
            activeOpacity={0.7}
          >
            <Text style={[styles.btnToolText, vertices.length === 0 && styles.btnToolTextDisabled]}>
              🗑️ Limpar
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btnConcluir, !isPoligonoValido && styles.btnConcluirDisabled]}
            onPress={handleAbrirConclusao}
            disabled={!isPoligonoValido || salvando}
            activeOpacity={0.8}
          >
            <Text style={[styles.btnConcluirText, !isPoligonoValido && styles.btnConcluirTextDisabled]}>
              Concluir Medição ({areaEstimada.toFixed(1)} m²)
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Modal para Definir Nome e Observações da Área */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalContent}>
            <ScrollView
              contentContainerStyle={styles.modalScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              <Text style={styles.modalTitulo}>Salvar Área Medida</Text>
              <Text style={styles.modalSubtitulo}>
                Metragem calculada:{' '}
                <Text style={styles.modalDestaque}>{areaEstimada.toFixed(2)} m²</Text>
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nome da Área *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Ex: Gramado Frontal, Jardim Lateral"
                  placeholderTextColor="#9E9E9E"
                  value={nome}
                  onChangeText={setNome}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Observações (opcional)</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="Ex: Terreno plano, terra boa"
                  placeholderTextColor="#9E9E9E"
                  value={observacoes}
                  onChangeText={setObservacoes}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalBtnCancelar}
                  onPress={() => setModalVisible(false)}
                  disabled={salvando}
                >
                  <Text style={styles.modalBtnCancelarText}>Voltar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalBtnSalvar, salvando && styles.btnConcluirDisabled]}
                  onPress={handleConfirmarSalvar}
                  disabled={salvando}
                >
                  {salvando ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalBtnSalvarText}>Salvar Área</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  topOverlay: {
    position: 'absolute',
    top: 40,
    left: 16,
    right: 16,
    zIndex: 10,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  btnVoltarTop: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  btnVoltarTopText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  btnModoMapa: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  btnModoMapaText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
  },
  searchBarInput: {
    flex: 1,
    fontSize: 14,
    color: '#212121',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  btnSearchClear: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  btnSearchClearText: {
    color: '#757575',
    fontSize: 14,
    fontWeight: 'bold',
  },
  btnSearch: {
    backgroundColor: '#2E7D32',
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  btnSearchDisabled: {
    backgroundColor: '#9E9E9E',
    opacity: 0.6,
  },
  btnSearchText: {
    fontSize: 16,
  },
  feedbackCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  feedbackRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  feedbackLabel: {
    fontSize: 12,
    color: '#616161',
    fontWeight: '500',
  },
  feedbackValor: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  verticeBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A5D6A7',
  },
  verticeBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  dicaText: {
    fontSize: 12,
    color: '#757575',
    marginTop: 2,
  },
  dicaSucessoText: {
    fontSize: 12,
    color: '#2E7D32',
    fontWeight: '600',
    marginTop: 2,
  },
  bottomOverlay: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    zIndex: 10,
  },
  toolbarRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  btnTool: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  btnToolDisabled: {
    opacity: 0.4,
  },
  btnToolText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  btnToolTextDisabled: {
    color: '#BDBDBD',
  },
  btnConcluir: {
    flex: 1,
    backgroundColor: '#2E7D32',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  btnConcluirDisabled: {
    backgroundColor: '#9E9E9E',
    opacity: 0.6,
  },
  btnConcluirText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  btnConcluirTextDisabled: {
    color: '#E0E0E0',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  modalScrollContent: {
    flexGrow: 0,
  },
  modalTitulo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 4,
  },
  modalSubtitulo: {
    fontSize: 14,
    color: '#616161',
    marginBottom: 16,
  },
  modalDestaque: {
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#424242',
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#212121',
    backgroundColor: '#FAFAFA',
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
  modalBtnCancelar: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  modalBtnCancelarText: {
    color: '#757575',
    fontWeight: 'bold',
    fontSize: 14,
  },
  modalBtnSalvar: {
    backgroundColor: '#2E7D32',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  modalBtnSalvarText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
