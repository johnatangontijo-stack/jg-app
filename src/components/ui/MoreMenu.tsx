import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, RADIUS, SPACING, FONT } from '../../constants/theme';
import { Icon } from './Icon';
import { useResponsive } from '../../hooks/useResponsive';
import type { NavItem } from '../../constants/nav';

interface MoreMenuProps {
  items: NavItem[];
  /** chamado após navegar — usado p/ fechar o modal "Mais". */
  onNavigate?: () => void;
}

/** Grid responsivo usado pela aba "Mais" (interno e cliente). */
export function MoreMenu({ items, onNavigate }: MoreMenuProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { columns, contentMaxWidth } = useResponsive();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: insets.bottom + SPACING.xl },
      ]}
    >
      <View style={[styles.grid, { maxWidth: contentMaxWidth, alignSelf: 'center' }]}>
        {items.map((item) => (
          <TouchableOpacity
            key={item.name}
            activeOpacity={0.75}
            style={[styles.card, { width: `${100 / columns}%` }]}
            onPress={() => {
              router.push(item.route as any);
              onNavigate?.();
            }}
          >
            <View style={styles.cardInner}>
              <View style={styles.iconWrap}>
                <Icon name={item.icon} size={24} color={COLORS.gold} />
              </View>
              <Text style={styles.cardLabel} numberOfLines={1}>
                {item.title}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
        {items.length === 0 && (
          <Text style={styles.empty}>Nada por aqui — tudo já está na barra.</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.black },
  content: { padding: SPACING.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', width: '100%' },
  card: { padding: SPACING.sm },
  cardInner: {
    backgroundColor: COLORS.surface1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
    gap: SPACING.md,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(201,168,76,0.10)',
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardLabel: { color: COLORS.text, fontSize: 13, ...FONT.medium, textAlign: 'center' },
  empty: { color: COLORS.text2, fontSize: 14, padding: SPACING.xl, textAlign: 'center', width: '100%' },
});
