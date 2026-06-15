import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, RADIUS, SPACING, FONT } from '../../constants/theme';
import { Badge } from '../ui/Badge';
import { Icon } from '../ui/Icon';
import { Database } from '../../types/database';

type Producao = Database['public']['Tables']['producoes']['Row'];

const STATUS_BADGE: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'info' | 'gold' | 'gray' }> = {
  rascunho: { label: 'Rascunho', variant: 'gray' },
  editando: { label: 'Editando', variant: 'warning' },
  aguardando_aprovacao: { label: 'Aguardando', variant: 'gold' },
  aprovada: { label: 'Aprovada', variant: 'success' },
  reprovada: { label: 'Reprovada', variant: 'danger' },
  agendada: { label: 'Agendada', variant: 'info' },
  publicada: { label: 'Publicada', variant: 'success' },
};

interface ProducaoCardProps {
  producao: Producao;
  onPress?: () => void;
}

export function ProducaoCard({ producao, onPress }: ProducaoCardProps) {
  const badge = STATUS_BADGE[producao.status] ?? { label: producao.status, variant: 'gray' as const };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.thumb}>
        <Icon name="video" size={28} color={COLORS.text3} />
      </View>
      <View style={styles.info}>
        <Text style={styles.titulo} numberOfLines={1}>{producao.titulo}</Text>
        <Text style={styles.tipo}>{producao.tipo.toUpperCase()}</Text>
        <Badge label={badge.label} variant={badge.variant} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface2,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.borderWeak,
  },
  thumb: {
    width: 64,
    height: 64,
    backgroundColor: COLORS.surface3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbIcon: {
    fontSize: 24,
  },
  info: {
    flex: 1,
    padding: SPACING.sm,
    gap: 4,
  },
  titulo: {
    color: COLORS.text,
    fontSize: 14,
    ...FONT.medium,
  },
  tipo: {
    color: COLORS.text3,
    fontSize: 10,
    ...FONT.medium,
  },
});
