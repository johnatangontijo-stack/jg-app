import React, { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { COLORS, FONT } from '../../src/constants/theme';
import { useAuthStore } from '../../src/stores/authStore';
import { useNotificacoesStore } from '../../src/stores/notificacoesStore';
import { ResponsiveTabBar } from '../../src/components/ui/ResponsiveTabBar';
import { HeaderBell } from '../../src/components/ui/HeaderBell';
import { INTERNO_MENU } from '../../src/constants/nav';

export default function InternoLayout() {
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
        <ResponsiveTabBar state={props.state} navigation={props.navigation} menu={INTERNO_MENU} />
      )}
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.surface1 },
        headerTintColor: COLORS.text,
        headerTitleStyle: { ...FONT.bold, color: COLORS.text },
        headerRight: () => <HeaderBell />,
      }}
    >
      {/* abas (a barra responsiva decide quais entram em "Mais") */}
      <Tabs.Screen name="dashboard"       options={{ title: 'Dashboard' }} />
      <Tabs.Screen name="clientes/index"  options={{ title: 'Clientes' }} />
      <Tabs.Screen name="demandas"        options={{ title: 'Demandas' }} />
      <Tabs.Screen name="agenda"          options={{ title: 'Agenda' }} />
      <Tabs.Screen name="gravacoes/index" options={{ title: 'Gravações' }} />
      <Tabs.Screen name="nps"             options={{ title: 'NPS' }} />
      <Tabs.Screen name="aprovacoes"      options={{ title: 'Aprovações' }} />
      <Tabs.Screen name="metas"           options={{ title: 'Metas' }} />
      <Tabs.Screen name="feedbacks"       options={{ title: 'Feedbacks' }} />
      <Tabs.Screen name="financeiro"      options={{ title: 'Financeiro' }} />
      <Tabs.Screen name="networking"      options={{ title: 'Networking' }} />
      <Tabs.Screen name="equipe/index"    options={{ title: 'Equipe' }} />
      <Tabs.Screen name="gestao"           options={{ title: 'Gestão' }} />

      {/* rotas internas sem botão na barra */}
      <Tabs.Screen name="clientes/[id]"   options={{ title: 'Cliente' }} />
      <Tabs.Screen name="clientes/add"    options={{ title: 'Novo Cliente' }} />
      <Tabs.Screen name="demandas/add"    options={{ title: 'Nova Demanda' }} />
      <Tabs.Screen name="gravacoes/add"   options={{ title: 'Nova Gravação' }} />
      <Tabs.Screen name="equipe/add"      options={{ title: 'Novo Membro' }} />
      <Tabs.Screen name="funcionarios"    options={{ title: 'Funcionários' }} />
    </Tabs>
  );
}
