import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, RADIUS, SPACING, FONT } from '../../constants/theme';
import { ClienteLogo } from './ClienteLogo';
import { ProgressBar } from '../ui/ProgressBar';
import { Database } from '../../types/database';

type Cliente = Database['public']['Tables']['clientes']['Row'];

interface ClienteRowProps {
  cliente: Cliente;
  responsavelNome?: string;
  onPress: () => void;
}

function healthColor(score: number) {
  if (score >= 70) return COLORS.success;
  if (score >= 50) return COLORS.warning;
  return COLORS.danger;
}

export function ClienteRow({ cliente, responsavelNome, onPress }: ClienteRowProps) {
  const color = healthColor(cliente.health_score);

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.8}>
      <ClienteLogo nome={cliente.nome_fantasia} logoUrl={cliente.logo_url} size={44} />
      <View style={styles.info}>
        <Text style={styles.nome} numberOfLines={1}>{cliente.nome_fantasia}</Text>
        {responsavelNome && <Text style={styles.resp}>{responsavelNome}</Text>}
        <View style={styles.healthRow}>
          <ProgressBar value={cliente.health_score} color={color} height={4} />
          <Text style={[styles.score, { color }]}>{cliente.health_score}</Text>
        </View>
      </View>
      <Text style={styles.renovacao}>
        {new Date(cliente.data_renovacao).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.surface1,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderWeak,
    marginBottom: SPACING.sm,
    gap: SPACING.md,
  },
  info: {
    flex: 1,
    gap: 4,
  },
  nome: {
    color: COLORS.text,
    fontSize: 14,
    ...FONT.medium,
  },
  resp: {
    color: COLORS.text3,
    fontSize: 12,
  },
  healthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  score: {
    fontSize: 11,
    ...FONT.bold,
    minWidth: 24,
    textAlign: 'right',
  },
  renovacao: {
    color: COLORS.text3,
    fontSize: 11,
    textAlign: 'center',
  },
});
