import React, { useEffect } from 'react';
import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { COLORS, FONT } from '../../src/constants/theme';
import { useNotificacoesStore } from '../../src/stores/notificacoesStore';
import { useAuthStore } from '../../src/stores/authStore';
import { ResponsiveTabBar } from '../../src/components/ui/ResponsiveTabBar';
import { HeaderBell } from '../../src/components/ui/HeaderBell';
import { HeaderLogout } from '../../src/components/ui/HeaderLogout';
import { CLIENTE_MENU } from '../../src/constants/nav';

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
      tabBar={(props) => (
        <ResponsiveTabBar state={props.state} navigation={props.navigation} menu={CLIENTE_MENU} />
      )}
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.surface1 },
        headerTintColor: COLORS.text,
        headerTitleStyle: { ...FONT.bold, color: COLORS.text },
        headerRight: () => (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <HeaderBell />
            <HeaderLogout />
          </View>
        ),
      }}
    >
      <Tabs.Screen name="index"      options={{ title: 'Início' }} />
      <Tabs.Screen name="trafego"    options={{ title: 'Tráfego' }} />
      <Tabs.Screen name="producoes"  options={{ title: 'Produções' }} />
      <Tabs.Screen name="aprovacoes" options={{ title: 'Aprovações' }} />
      <Tabs.Screen name="metas"      options={{ title: 'Metas' }} />
      <Tabs.Screen name="networking" options={{ title: 'Networking' }} />
      <Tabs.Screen name="marca"      options={{ title: 'Marca' }} />
      <Tabs.Screen name="agenda"     options={{ title: 'Agenda' }} />
      <Tabs.Screen name="nps"        options={{ title: 'NPS' }} />
      <Tabs.Screen name="feedback"   options={{ title: 'Feedback' }} />
      <Tabs.Screen name="whatsapp"   options={{ title: 'WhatsApp' }} />
    </Tabs>
  );
}
