import React from 'react';
import { View, Text, Platform, StyleSheet } from 'react-native';
import { COLORS, SPACING, FONT, RADIUS } from '../../constants/theme';

interface DateTimePickerProps {
  label: string;
  date: string;   // YYYY-MM-DD
  time: string;   // HH:MM
  onDateChange: (v: string) => void;
  onTimeChange: (v: string) => void;
}

export function DateTimePicker({ label, date, time, onDateChange, onTimeChange }: DateTimePickerProps) {
  if (Platform.OS !== 'web') {
    // Fallback para mobile: inputs de texto simples
    const { TextInput } = require('react-native');
    return (
      <View style={styles.wrap}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.row}>
          <TextInput style={[styles.input, { flex: 3 }]} value={date} onChangeText={onDateChange}
            placeholder="AAAA-MM-DD" placeholderTextColor={COLORS.text3} />
          <TextInput style={[styles.input, { flex: 2 }]} value={time} onChangeText={onTimeChange}
            placeholder="HH:MM" placeholderTextColor={COLORS.text3} />
        </View>
      </View>
    );
  }

  // Web: usa inputs HTML nativos
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        {/* @ts-ignore — web-only HTML input */}
        <input
          type="date"
          value={date}
          onChange={(e: any) => onDateChange(e.target.value)}
          style={webInputStyle}
        />
        {/* @ts-ignore */}
        <input
          type="time"
          value={time}
          onChange={(e: any) => onTimeChange(e.target.value)}
          style={{ ...webInputStyle, flex: '0 0 120px' }}
        />
      </View>
    </View>
  );
}

const webInputStyle = {
  flex: 1,
  backgroundColor: COLORS.surface2,
  border: `1px solid ${COLORS.border}`,
  borderRadius: RADIUS.md,
  padding: '12px',
  color: COLORS.text,
  fontSize: '14px',
  colorScheme: 'dark',
  outline: 'none',
  cursor: 'pointer',
};

const styles = StyleSheet.create({
  wrap: { gap: SPACING.xs },
  label: { color: COLORS.text2, fontSize: 13, ...FONT.medium },
  row: { flexDirection: 'row', gap: SPACING.sm },
  input: {
    backgroundColor: COLORS.surface2,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    color: COLORS.text,
    fontSize: 14,
    height: 48,
  },
});
