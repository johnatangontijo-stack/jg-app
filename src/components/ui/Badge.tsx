import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, RADIUS, SPACING, FONT } from '../../constants/theme';

type Variant = 'success' | 'warning' | 'danger' | 'info' | 'gold' | 'gray';

interface BadgeProps {
  label: string;
  variant?: Variant;
}

const VARIANT_COLORS: Record<Variant, { bg: string; text: string }> = {
  success: { bg: 'rgba(39,174,96,0.15)', text: COLORS.success },
  warning: { bg: 'rgba(230,126,34,0.15)', text: COLORS.warning },
  danger: { bg: 'rgba(192,57,43,0.15)', text: COLORS.danger },
  info: { bg: 'rgba(41,128,185,0.15)', text: COLORS.info },
  gold: { bg: 'rgba(201,168,76,0.15)', text: COLORS.gold },
  gray: { bg: 'rgba(255,255,255,0.07)', text: COLORS.text2 },
};

export function Badge({ label, variant = 'gray' }: BadgeProps) {
  const colors = VARIANT_COLORS[variant];
  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }]}>
      <Text style={[styles.text, { color: colors.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    ...FONT.medium,
  },
});
