import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, RADIUS, SPACING, FONT } from '../../constants/theme';
import { IconText } from './Icon';

interface CheckItemProps {
  label: string;
  checked: boolean;
  onToggle?: () => void;
  disabled?: boolean;
  tag?: string;
  variant?: 'jg' | 'client';
  atrasado?: boolean;
}

export function CheckItem({
  label,
  checked,
  onToggle,
  disabled,
  tag,
  variant = 'jg',
  atrasado,
}: CheckItemProps) {
  const checkColor = variant === 'jg' ? COLORS.gold : COLORS.info;

  const inner = (
    <View style={[styles.row, atrasado && styles.atrasado]}>
      <View
        style={[
          styles.check,
          { borderColor: checked ? checkColor : COLORS.text3 },
          checked && { backgroundColor: checkColor },
        ]}
      >
        {checked && <Text style={styles.tick}>✓</Text>}
      </View>
      <View style={styles.content}>
        <Text style={[styles.label, checked && styles.done]}>{label}</Text>
        {tag && <Text style={styles.tag}>{tag}</Text>}
        {atrasado && <IconText name="alerta" size={11} color={COLORS.danger} textStyle={styles.atrasadoText}>Atrasado</IconText>}
      </View>
    </View>
  );

  if (onToggle && !disabled) {
    return (
      <TouchableOpacity onPress={onToggle} activeOpacity={0.7}>
        {inner}
      </TouchableOpacity>
    );
  }

  return inner;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  atrasado: {
    borderLeftWidth: 2,
    borderLeftColor: COLORS.danger,
    paddingLeft: SPACING.sm,
  },
  check: {
    width: 20,
    height: 20,
    borderRadius: RADIUS.sm,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  tick: {
    color: COLORS.black,
    fontSize: 12,
    ...FONT.bold,
  },
  content: {
    flex: 1,
  },
  label: {
    color: COLORS.text,
    fontSize: 14,
    ...FONT.regular,
  },
  done: {
    color: COLORS.text3,
    textDecorationLine: 'line-through',
  },
  tag: {
    color: COLORS.text3,
    fontSize: 11,
    marginTop: 2,
  },
  atrasadoText: {
    color: COLORS.danger,
    fontSize: 11,
    marginTop: 2,
  },
});
