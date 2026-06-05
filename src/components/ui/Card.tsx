import React from 'react';
import { View, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { COLORS, RADIUS, SPACING } from '../../constants/theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  padding?: 'sm' | 'md' | 'lg';
}

export function Card({ children, style, onPress, padding = 'lg' }: CardProps) {
  const pad = padding === 'sm' ? SPACING.sm : padding === 'md' ? SPACING.md : SPACING.lg;

  if (onPress) {
    return (
      <TouchableOpacity
        style={[styles.card, { padding: pad }, style]}
        onPress={onPress}
        activeOpacity={0.8}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={[styles.card, { padding: pad }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface1,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderWeak,
  },
});
