import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { colors, fonts } from '../../theme';
import { Icon } from '../ui';

interface FaixaSincronizacaoProps {
  offline: boolean;
  pendentes: number;
  sincronizando: boolean;
  onSincronizar: () => void;
  /** Altura da área de gestos do sistema: a faixa fica no rodapé da tela e ocupa essa área. */
  espacoInferior: number;
}

function rascunhos(n: number): string {
  return n === 1 ? '1 rascunho' : `${n} rascunhos`;
}

/** A faixa aparece quando há algo a informar: sem conexão, sincronizando ou rascunhos pendentes. */
export function deveMostrarFaixa({ offline, pendentes, sincronizando }: Pick<FaixaSincronizacaoProps, 'offline' | 'pendentes' | 'sincronizando'>) {
  return offline || sincronizando || pendentes > 0;
}

/**
 * Faixa no rodapé com o estado da conexão e dos rascunhos (RNF40) e a ação de sincronizar (RF86).
 * Fica embaixo porque os cabeçalhos nativos das pilhas calculam sozinhos o espaço
 * da barra de status e não acomodariam uma faixa no topo.
 */
export function FaixaSincronizacao({
  offline,
  pendentes,
  sincronizando,
  onSincronizar,
  espacoInferior,
}: FaixaSincronizacaoProps) {
  let texto: string;
  let detalhe: string | null = null;
  if (offline) {
    texto = 'Sem conexão · exibindo os dados salvos no aparelho';
    if (pendentes > 0) detalhe = `${rascunhos(pendentes)} aguardando sincronização`;
  } else if (sincronizando) {
    texto = 'Sincronizando rascunhos…';
  } else {
    texto = `${rascunhos(pendentes)} não ${pendentes === 1 ? 'sincronizado' : 'sincronizados'}`;
  }
  const podeSincronizar = !offline && !sincronizando && pendentes > 0;

  return (
    <View
      style={[styles.faixa, { paddingBottom: espacoInferior + 8 }]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      {sincronizando ? (
        <ActivityIndicator size="small" color={colors.textOnColor} />
      ) : (
        <Icon name={offline ? 'alert' : 'refresh'} size={14} color={colors.textOnColor} />
      )}
      <View style={styles.textos}>
        <Text style={styles.texto}>{texto}</Text>
        {detalhe ? <Text style={styles.detalhe}>{detalhe}</Text> : null}
      </View>
      {podeSincronizar ? (
        <TouchableOpacity
          style={styles.botao}
          onPress={onSincronizar}
          accessibilityRole="button"
          accessibilityLabel="Sincronizar agora"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.botaoTexto}>Sincronizar</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  faixa: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 8,
    backgroundColor: colors.warning,
  },
  textos: {
    flexShrink: 1,
  },
  texto: {
    color: colors.textOnColor,
    fontSize: 12,
    fontFamily: fonts.semibold,
  },
  detalhe: {
    color: colors.textOnColor,
    fontSize: 11,
    fontFamily: fonts.regular,
  },
  botao: {
    marginLeft: 4,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: colors.textOnColor,
  },
  botaoTexto: {
    color: colors.warning,
    fontSize: 12,
    fontFamily: fonts.bold,
  },
});
