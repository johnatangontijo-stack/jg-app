import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { COLORS, RADIUS, SPACING, FONT } from '../../constants/theme';
import { Card } from './Card';

interface MetricCardProps {
  label: string;
  value: string;
  delta?: string;
  deltaPositive?: boolean;
  goldValue?: boolean;
  sublabel?: string;
  style?: ViewStyle;
}

export function MetricCard({ label, value, delta, deltaPositive, goldValue, sublabel, style }: MetricCardProps) {
  return (
    <Card style={style ? { ...styles.card, ...style } : styles.card} padding="md">
      <Text style={styles.label} numberOfLines={1}>{label}</Text>
      <Text style={[styles.value, goldValue && styles.goldValue]}>{value}</Text>
      {delta && (
        <Text style={[styles.delta, deltaPositive ? styles.positive : styles.negative]}>
          {deltaPositive ? '↑' : '↓'} {delta}
        </Text>
      )}
      {sublabel && <Text style={styles.sublabel} numberOfLines={1}>{sublabel}</Text>}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 140,
  },
  label: {
    fontSize: 11,
    color: COLORS.text2,
    ...FONT.medium,
    marginBottom: SPACING.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 22,
    color: COLORS.text,
    ...FONT.bold,
    marginBottom: 2,
  },
  goldValue: {
    color: COLORS.gold,
  },
  delta: {
    fontSize: 12,
    ...FONT.medium,
  },
  positive: {
    color: COLORS.success,
  },
  negative: {
    color: COLORS.danger,
  },
  sublabel: {
    fontSize: 11,
    color: COLORS.text3,
    marginTop: 2,
  },
});
