import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, RADIUS, SPACING, FONT } from '../../constants/theme';
import { Badge } from '../ui/Badge';
import { Database } from '../../types/database';

type Demanda = Database['public']['Tables']['demandas']['Row'];

interface DemandaItemProps {
  demanda: Demanda;
  clienteNome?: string;
  responsavelNome?: string;
  onConcluir: () => void;
}

const PRIORIDADE_VARIANT: Record<string, 'danger' | 'warning' | 'gray' | 'gold'> = {
  urgente: 'danger',
  alta: 'warning',
  media: 'gold',
  baixa: 'gray',
};

export function DemandaItem({ demanda, clienteNome, responsavelNome, onConcluir }: DemandaItemProps) {
  return (
    <View style={styles.item}>
      <View style={styles.header}>
        <Text style={styles.titulo} numberOfLines={1}>{demanda.titulo}</Text>
        <Badge label={demanda.prioridade} variant={PRIORIDADE_VARIANT[demanda.prioridade] ?? 'gray'} />
      </View>
      {(clienteNome || responsavelNome) && (
        <Text style={styles.meta}>
          {clienteNome && `${clienteNome} · `}
          {responsavelNome}
        </Text>
      )}
      {demanda.descricao && (
        <Text style={styles.desc} numberOfLines={2}>{demanda.descricao}</Text>
      )}
      <View style={styles.footer}>
        <Text style={styles.prazo}>
          Prazo: {new Date(demanda.prazo).toLocaleDateString('pt-BR')}
        </Text>
        <TouchableOpacity style={styles.concluirBtn} onPress={onConcluir} activeOpacity={0.8}>
          <Text style={styles.concluirText}>Concluir</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    backgroundColor: COLORS.surface2,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderWeak,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    gap: SPACING.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  titulo: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
    ...FONT.medium,
  },
  meta: {
    color: COLORS.text3,
    fontSize: 12,
  },
  desc: {
    color: COLORS.text2,
    fontSize: 13,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.xs,
  },
  prazo: {
    color: COLORS.text3,
    fontSize: 12,
  },
  concluirBtn: {
    backgroundColor: 'rgba(39,174,96,0.15)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.success,
  },
  concluirText: {
    color: COLORS.success,
    fontSize: 12,
    ...FONT.medium,
  },
});
