import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS, FONT } from '../../constants/theme';
import { Icon } from './Icon';
import { useNotificacoesStore } from '../../stores/notificacoesStore';

/** Sino de notificações com badge de não-lidas (header das abas). */
export function HeaderBell() {
  const router = useRouter();
  const { naoLidas } = useNotificacoesStore();

  return (
    <TouchableOpacity
      style={styles.bell}
      activeOpacity={0.7}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      onPress={() => router.push('/notificacoes' as any)}
    >
      <Icon name="bell" size={22} color={COLORS.text} />
      {naoLidas > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{naoLidas > 9 ? '9+' : naoLidas}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  bell: { marginRight: 16, position: 'relative', padding: 2 },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: COLORS.gold,
    borderRadius: 10,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { color: COLORS.black, fontSize: 9, ...FONT.bold },
});
