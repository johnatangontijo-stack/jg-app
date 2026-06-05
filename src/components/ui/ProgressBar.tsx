import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, RADIUS, SPACING, FONT } from '../../constants/theme';

interface ProgressBarProps {
  value: number;
  color?: string;
  height?: number;
  showLabel?: boolean;
}

export function ProgressBar({ value, color = COLORS.gold, height = 6, showLabel }: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, value));

  return (
    <View>
      <View style={[styles.track, { height }]}>
        <View
          style={[
            styles.fill,
            { width: `${pct}%`, backgroundColor: color, height },
          ]}
        />
      </View>
      {showLabel && (
        <Text style={styles.label}>{pct}%</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    backgroundColor: COLORS.surface4,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
    width: '100%',
  },
  fill: {
    borderRadius: RADIUS.full,
  },
  label: {
    color: COLORS.text2,
    fontSize: 11,
    marginTop: SPACING.xs,
    ...FONT.medium,
  },
});
