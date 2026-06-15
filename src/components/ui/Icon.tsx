import React from 'react';
import { View, Text, StyleSheet, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * Nomes semânticos do app → ícones reais (Ionicons).
 * Substitui os emojis usados como ícones (cara de protótipo).
 */
const MAP = {
  // navegação interna
  dashboard:  'stats-chart',
  clientes:   'people',
  demandas:   'checkbox',
  agenda:     'calendar',
  gravacoes:  'videocam',
  nps:        'star',
  feedbacks:  'chatbubble-ellipses',
  financeiro: 'cash',
  aprovacoes: 'checkmark-done-circle',
  metas:      'flag',
  networking: 'git-network',
  equipe:     'person',
  // cliente
  inicio:     'home',
  trafego:    'bar-chart',
  producoes:  'film',
  marca:      'sparkles',
  whatsapp:   'logo-whatsapp',
  // utilitários
  more:       'grid',
  bell:       'notifications',
  back:       'chevron-back',
  add:        'add',
  chevron:    'chevron-forward',
  eye:        'eye',
  eyeOff:     'eye-off',
  fingerprint:'finger-print',
  logout:     'log-out',
  close:      'close',
  // status
  aguardando: 'time',
  aprovado:   'checkmark-circle',
  reprovado:  'close-circle',
  revisao:    'sync',
  conectado:  'checkmark-circle',
  emContato:  'call',
  pendente:   'hourglass',
  alerta:     'warning',
  // mídia / arquivos
  video:      'play-circle',
  imagem:     'image',
  arquivo:    'attach',
  comment:    'chatbubble',
  publicar:   'calendar',
  prazo:      'alarm',
  lock:       'lock-closed',
  empresa:    'business',
  usuario:    'person-circle',
  list:       'list',
  circle:     'ellipse-outline',
  send:       'paper-plane',
  pin:        'bookmark',
  elogio:     'thumbs-up',
  ideia:      'bulb',
  mic:        'mic',
  micOff:     'stop-circle',
  paleta:     'color-palette',
  // plataformas (logos)
  instagram:  'logo-instagram',
  facebook:   'logo-facebook',
  linkedin:   'logo-linkedin',
  tiktok:     'logo-tiktok',
  youtube:    'logo-youtube',
  // segmentos
  ecommerce:  'cart',
  saude:      'medkit',
  moda:       'shirt',
  construcao: 'construct',
  automotivo: 'car-sport',
  alimentacao:'restaurant',
  educacao:   'school',
  tecnologia: 'laptop',
  beleza:     'rose',
  fitness:    'barbell',
  imobiliario:'key',
  juridico:   'briefcase',
  segmento:   'pricetag',
} as const;

export type IconName = keyof typeof MAP;

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
}

export function Icon({ name, size = 22, color = '#efefef' }: IconProps) {
  return <Ionicons name={MAP[name] as any} size={size} color={color} />;
}

interface IconTextProps {
  name: IconName;
  children: React.ReactNode;
  size?: number;
  color?: string;
  gap?: number;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

/** Ícone + texto em linha. Substitui o padrão `{emoji} texto` dentro de <Text>. */
export function IconText({ name, children, size = 14, color = '#efefef', gap = 5, style, textStyle }: IconTextProps) {
  return (
    <View style={[itStyles.row, { gap }, style]}>
      <Icon name={name} size={size} color={color} />
      <Text style={[{ color }, textStyle]}>{children}</Text>
    </View>
  );
}

const itStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
});
