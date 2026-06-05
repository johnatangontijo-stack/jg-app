import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, ViewStyle } from 'react-native';
import { COLORS, RADIUS, SPACING, FONT } from '../../constants/theme';

type Variant = 'primary' | 'ghost' | 'danger';

interface GoldButtonProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  variant?: Variant;
  style?: ViewStyle;
  disabled?: boolean;
}

export function GoldButton({
  label,
  onPress,
  loading,
  variant = 'primary',
  style,
  disabled,
}: GoldButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.base, styles[variant], (disabled || loading) && styles.disabled, style]}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator size="small" color={variant === 'primary' ? COLORS.black : COLORS.gold} />
      ) : (
        <Text style={[styles.text, variant !== 'primary' && styles.textAlt]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  primary: {
    backgroundColor: COLORS.gold,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.borderWeak,
  },
  danger: {
    backgroundColor: 'rgba(192,57,43,0.15)',
    borderWidth: 1,
    borderColor: COLORS.danger,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    color: COLORS.black,
    fontSize: 15,
    ...FONT.bold,
  },
  textAlt: {
    color: COLORS.text2,
    ...FONT.medium,
  },
});
