import React, { useState } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { COLORS, FONT, RADIUS } from '../../constants/theme';

interface ClienteLogoProps {
  nome: string;
  logoUrl?: string | null;
  size?: number;
}

function initials(nome: string) {
  const parts = nome.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function ClienteLogo({ nome, logoUrl, size = 44 }: ClienteLogoProps) {
  const [imgError, setImgError] = useState(false);

  const radius = size * 0.22;
  const fontSize = size * 0.35;

  if (logoUrl && !imgError) {
    return (
      <Image
        source={{ uri: logoUrl }}
        style={{ width: size, height: size, borderRadius: radius, backgroundColor: COLORS.surface2 }}
        onError={() => setImgError(true)}
        resizeMode="cover"
      />
    );
  }

  return (
    <View style={[styles.fallback, { width: size, height: size, borderRadius: radius }]}>
      <Text style={[styles.initials, { fontSize }]}>{initials(nome)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: COLORS.surface2,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: COLORS.gold,
    ...FONT.bold,
  },
});
