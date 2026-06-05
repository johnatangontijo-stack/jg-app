import React, { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { COLORS, FONT } from '../../src/constants/theme';
import { useAuthStore } from '../../src/stores/authStore';
import { useNotificacoesStore } from '../../src/stores/notificacoesStore';

type Role = 'admin' | 'gerencia' | 'head' | 'financeiro' | 'colaborador' | 'cliente';

function can(role: Role | undefined, allowed: Role[]): boolean {
  if (!role) return false;
  return allowed.includes(role);
}

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return <Text style={{ fontSize: 18, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>;
}

export default function InternoLayout() {
  const { profile } = useAuthStore();
  const { load, subscribeRealtime } = useNotificacoesStore();
  const role = profile?.role as Role | undefined;

  const showClientes   = can(role, ['admin', 'gerencia']);
  const showDemandas   = can(role, ['admin', 'gerencia', 'head', 'colaborador']);
  const showNps        = can(role, ['admin', 'gerencia']);
  const showFeedbacks  = can(role, ['admin', 'gerencia']);
  const showFinanceiro = can(role, ['admin', 'financeiro']);
  const showGravacoes  = can(role, ['admin', 'gerencia', 'head']);
  const showEquipe     = can(role, ['admin', 'gerencia']);

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
        tabBarStyle: {
          backgroundColor: COLORS.surface1,
          borderTopColor: COLORS.borderWeak,
          height: 60,
        },
        tabBarActiveTintColor: COLORS.gold,
        tabBarInactiveTintColor: COLORS.text3,
        tabBarLabelStyle: { fontSize: 9, ...FONT.medium, marginBottom: 4 },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ focused }) => <TabIcon emoji="📈" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="clientes/index"
        options={{
          title: 'Clientes',
          href: showClientes ? undefined : null,
          tabBarIcon: ({ focused }) => <TabIcon emoji="👥" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="demandas"
        options={{
          title: 'Demandas',
          href: showDemandas ? undefined : null,
          tabBarIcon: ({ focused }) => <TabIcon emoji="✅" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="agenda"
        options={{
          title: 'Agenda',
          tabBarIcon: ({ focused }) => <TabIcon emoji="📅" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="gravacoes/index"
        options={{
          title: 'Gravações',
          href: showGravacoes ? undefined : null,
          tabBarIcon: ({ focused }) => <TabIcon emoji="🎥" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="nps"
        options={{
          title: 'NPS',
          href: showNps ? undefined : null,
          tabBarIcon: ({ focused }) => <TabIcon emoji="⭐" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="feedbacks"
        options={{
          title: 'Feedbacks',
          href: showFeedbacks ? undefined : null,
          tabBarIcon: ({ focused }) => <TabIcon emoji="💬" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="financeiro"
        options={{
          title: 'Financeiro',
          href: showFinanceiro ? undefined : null,
          tabBarIcon: ({ focused }) => <TabIcon emoji="💰" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="equipe/index"
        options={{
          title: 'Equipe',
          href: showEquipe ? undefined : null,
          tabBarIcon: ({ focused }) => <TabIcon emoji="👤" focused={focused} />,
        }}
      />
      {/* hidden routes */}
      <Tabs.Screen name="clientes/[id]"     options={{ href: null }} />
      <Tabs.Screen name="clientes/add"      options={{ href: null, title: 'Novo Cliente' }} />
      <Tabs.Screen name="demandas/add"      options={{ href: null, title: 'Nova Demanda' }} />
      <Tabs.Screen name="gravacoes/add"     options={{ href: null, title: 'Nova Gravação' }} />
      <Tabs.Screen name="equipe/add"        options={{ href: null, title: 'Novo Membro' }} />
      <Tabs.Screen name="funcionarios"      options={{ href: null }} />
    </Tabs>
  );
}
