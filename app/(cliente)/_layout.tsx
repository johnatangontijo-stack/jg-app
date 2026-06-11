import React from 'react';
import { Tabs } from 'expo-router';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, FONT } from '../../src/constants/theme';
import { useNotificacoesStore } from '../../src/stores/notificacoesStore';
import { useAuthStore } from '../../src/stores/authStore';
import { useEffect } from 'react';

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>;
}

function HeaderRight() {
  const { naoLidas } = useNotificacoesStore();
  return (
    <TouchableOpacity style={styles.bell} activeOpacity={0.8}>
      <Text style={styles.bellIcon}>🔔</Text>
      {naoLidas > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{naoLidas > 9 ? '9+' : naoLidas}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function ClienteLayout() {
  const { profile } = useAuthStore();
  const { load, subscribeRealtime } = useNotificacoesStore();

  useEffect(() => {
    if (!profile) return;
    load(profile.id);
    const unsub = subscribeRealtime(profile.id);
    return unsub;
  }, [profile?.id]);

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.surface1 },
        headerTintColor: COLORS.text,
        headerTitleStyle: { ...FONT.bold, color: COLORS.text },
        headerRight: () => <HeaderRight />,
        tabBarStyle: {
          backgroundColor: COLORS.surface1,
          borderTopColor: COLORS.borderWeak,
          height: 60,
        },
        tabBarActiveTintColor: COLORS.gold,
        tabBarInactiveTintColor: COLORS.text3,
        tabBarLabelStyle: { fontSize: 10, ...FONT.medium, marginBottom: 4 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Início',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="trafego"
        options={{
          title: 'Tráfego',
          tabBarIcon: ({ focused }) => <TabIcon emoji="📊" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="producoes"
        options={{
          title: 'Produções',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🎬" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="metas"
        options={{
          title: 'Metas',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🎯" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="aprovacoes"
        options={{
          title: 'Aprovações',
          tabBarIcon: ({ focused }) => <TabIcon emoji="✅" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="networking"
        options={{
          title: 'Networking',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🤝" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="marca"
        options={{
          title: 'Marca',
          tabBarIcon: ({ focused }) => <TabIcon emoji="⭐" focused={focused} />,
        }}
      />
      <Tabs.Screen name="agenda" options={{ href: null }} />
      <Tabs.Screen name="nps" options={{ href: null }} />
      <Tabs.Screen name="feedback" options={{ href: null }} />
      <Tabs.Screen name="whatsapp" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bell: {
    marginRight: 16,
    position: 'relative',
  },
  bellIcon: {
    fontSize: 22,
  },
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
  badgeText: {
    color: COLORS.black,
    fontSize: 9,
    ...FONT.bold,
  },
});
