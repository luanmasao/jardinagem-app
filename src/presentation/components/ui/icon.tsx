import React from 'react';
import { StyleProp, TextStyle } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';

/**
 * Ícones da interface pelo seu papel, independentes do conjunto de origem.
 * Feather (traço) é o conjunto principal; MaterialCommunityIcons cobre o que ele não tem.
 */
const ICONES = {
  search: { set: 'feather', glyph: 'search' },
  close: { set: 'feather', glyph: 'x' },
  alert: { set: 'feather', glyph: 'alert-triangle' },
  'map-pin': { set: 'feather', glyph: 'map-pin' },
  users: { set: 'feather', glyph: 'users' },
  package: { set: 'feather', glyph: 'package' },
  refresh: { set: 'feather', glyph: 'refresh-cw' },
  map: { set: 'feather', glyph: 'map' },
  file: { set: 'feather', glyph: 'file-text' },
  share: { set: 'feather', glyph: 'share-2' },
  undo: { set: 'feather', glyph: 'rotate-ccw' },
  trash: { set: 'feather', glyph: 'trash-2' },
  check: { set: 'feather', glyph: 'check' },
  'arrow-right': { set: 'feather', glyph: 'arrow-right' },
  leaf: { set: 'mci', glyph: 'leaf' },
  satellite: { set: 'mci', glyph: 'satellite-variant' },
  area: { set: 'mci', glyph: 'vector-square' },
} as const;

export type IconName = keyof typeof ICONES;

interface IconProps {
  name: IconName;
  size?: number;
  /** Sem cor, o ícone herda a cor do <Text> em que estiver aninhado. */
  color?: string;
  style?: StyleProp<TextStyle>;
}

/**
 * Ícone decorativo: fica oculto para leitores de tela; o texto ao lado (ou o
 * accessibilityLabel do botão que o contém) descreve a ação.
 *
 * Pode ser usado sozinho ou aninhado dentro de um <Text> (o ícone também é um Text).
 */
export const Icon: React.FC<IconProps> = ({ name, size = 18, color, style }) => {
  const icone = ICONES[name];
  const props = {
    size,
    color,
    style,
    accessibilityElementsHidden: true,
    importantForAccessibility: 'no-hide-descendants' as const,
  };
  return icone.set === 'feather' ? (
    <Feather name={icone.glyph} {...props} />
  ) : (
    <MaterialCommunityIcons name={icone.glyph} {...props} />
  );
};
