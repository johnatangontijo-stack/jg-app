import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONT, SPACING } from '../../constants/theme';
import { Icon } from './Icon';
import { MoreMenu } from './MoreMenu';
import { useResponsive } from '../../hooks/useResponsive';
import { useAuthStore } from '../../stores/authStore';
import { splitNav, type NavItem, type Role } from '../../constants/nav';

interface Props {
  // BottomTabBarProps (state/navigation) — tipado solto p/ não acoplar à versão
  state: any;
  navigation: any;
  menu: NavItem[];
}

/**
 * Barra inferior responsiva. Mostra N abas principais (N depende da largura)
 * + uma aba "Mais" que abre um grid com o restante. Substitui a barra de 12
 * abas que estourava no celular. Reage a rotação/resize (useWindowDimensions).
 */
export function ResponsiveTabBar({ state, navigation, menu }: Props) {
  const insets = useSafeAreaInsets();
  const { maxTabs } = useResponsive();
  const role = useAuthStore((s) => s.profile?.role) as Role | undefined;
  const [moreOpen, setMoreOpen] = useState(false);

  const { primary, secondary } = splitNav(menu, role, maxTabs);
  const currentName = state.routes[state.index]?.name as string | undefined;
  const onSecondary = secondary.some((i) => i.name === currentName);

  const go = (item: NavItem) => {
    const event = navigation.emit({ type: 'tabPress', target: item.name, canPreventDefault: true });
    if (!event?.defaultPrevented) navigation.navigate(item.name);
  };

  const Tab = ({ item, active }: { item: NavItem; active: boolean }) => (
    <TouchableOpacity
      key={item.name}
      style={styles.tab}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={() => go(item)}
    >
      <Icon name={item.icon} size={22} color={active ? COLORS.gold : COLORS.text3} />
      <Text style={[styles.label, { color: active ? COLORS.gold : COLORS.text3 }]} numberOfLines={1}>
        {item.title}
      </Text>
    </TouchableOpacity>
  );

  return (
    <>
      <View style={[styles.bar, { paddingBottom: insets.bottom, height: 58 + insets.bottom }]}>
        {primary.map((item) => (
          <Tab key={item.name} item={item} active={item.name === currentName} />
        ))}

        {secondary.length > 0 && (
          <TouchableOpacity
            style={styles.tab}
            activeOpacity={0.7}
            accessibilityRole="button"
            onPress={() => setMoreOpen(true)}
          >
            <Icon name="more" size={22} color={onSecondary ? COLORS.gold : COLORS.text3} />
            <Text style={[styles.label, { color: onSecondary ? COLORS.gold : COLORS.text3 }]}>
              Mais
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <Modal visible={moreOpen} animationType="slide" transparent onRequestClose={() => setMoreOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setMoreOpen(false)} />
        <View style={[styles.sheet, { paddingTop: SPACING.md }]}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Mais</Text>
            <TouchableOpacity onPress={() => setMoreOpen(false)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Icon name="back" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>
          <MoreMenu items={secondary} onNavigate={() => setMoreOpen(false)} bottomInset={insets.bottom} />
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface1,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.borderWeak,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
    gap: 3,
  },
  label: { fontSize: 10, ...FONT.medium },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '80%',
    backgroundColor: COLORS.black,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderColor: COLORS.border,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  sheetTitle: { color: COLORS.text, fontSize: 18, ...FONT.bold },
});
