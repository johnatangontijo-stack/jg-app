import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, RADIUS, SPACING, FONT } from '../../constants/theme';
import { Badge } from '../ui/Badge';
import { Icon } from '../ui/Icon';
import { Database } from '../../types/database';

type Criativo = Database['public']['Tables']['criativos']['Row'];

interface CriativoCardProps {
  criativo: Criativo;
}

export function CriativoCard({ criativo }: CriativoCardProps) {
  const ctr = criativo.ctr ? `${criativo.ctr.toFixed(2)}%` : '—';
  const plataformaCor = criativo.plataforma === 'meta' ? '#1877F2' : criativo.plataforma === 'google' ? '#EA4335' : '#000';

  return (
    <View style={styles.card}>
      <View style={styles.thumb}>
        <Icon name="imagem" size={28} color={COLORS.text3} />
        <View style={[styles.platBadge, { backgroundColor: plataformaCor }]}>
          <Text style={styles.platText}>{criativo.plataforma.toUpperCase()}</Text>
        </View>
      </View>
      <Text style={styles.nome} numberOfLines={1}>{criativo.nome}</Text>
      <View style={styles.row}>
        <Text style={styles.ctrLabel}>CTR</Text>
        <Text style={styles.ctrValue}>{ctr}</Text>
      </View>
      <Badge label={criativo.status} variant={criativo.status === 'ativo' ? 'success' : 'gray'} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: COLORS.surface2,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderWeak,
    padding: SPACING.sm,
    gap: SPACING.xs,
  },
  thumb: {
    height: 80,
    backgroundColor: COLORS.surface3,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
    overflow: 'hidden',
  },
  thumbIcon: {
    fontSize: 28,
  },
  platBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: RADIUS.sm,
  },
  platText: {
    color: '#fff',
    fontSize: 9,
    ...FONT.bold,
  },
  nome: {
    color: COLORS.text,
    fontSize: 12,
    ...FONT.medium,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  ctrLabel: {
    color: COLORS.text3,
    fontSize: 11,
  },
  ctrValue: {
    color: COLORS.gold,
    fontSize: 13,
    ...FONT.bold,
  },
});
