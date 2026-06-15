import React, { useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, FONT, RADIUS } from '../src/constants/theme';
import { Icon, type IconName } from '../src/components/ui/Icon';
import { useAuthStore } from '../src/stores/authStore';
import { useNotificacoesStore } from '../src/stores/notificacoesStore';

const TIPO_ICON: Record<string, IconName> = {
  campanha_alerta: 'trafego',
  producao_status: 'producoes',
  meta_update: 'metas',
  pagamento: 'financeiro',
  feedback_novo: 'feedbacks',
  aprovacao: 'aprovacoes',
  geral: 'bell',
};

function tempoAtras(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

export default function NotificacoesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile } = useAuthStore();
  const { notificacoes, naoLidas, loading, load, marcarLida, marcarTodasLidas } = useNotificacoesStore();

  useEffect(() => {
    if (profile?.id) load(profile.id);
  }, [profile?.id]);

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Icon name="back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={s.title}>Notificações</Text>
        {naoLidas > 0 ? (
          <TouchableOpacity onPress={() => profile?.id && marcarTodasLidas(profile.id)}>
            <Text style={s.markAll}>Marcar todas</Text>
          </TouchableOpacity>
        ) : <View style={{ width: 1 }} />}
      </View>

      {loading && notificacoes.length === 0 ? (
        <View style={s.center}><ActivityIndicator color={COLORS.gold} /></View>
      ) : notificacoes.length === 0 ? (
        <View style={s.center}>
          <Icon name="bell" size={40} color={COLORS.text3} />
          <Text style={s.emptyText}>Nenhuma notificação ainda.</Text>
        </View>
      ) : (
        <FlatList
          data={notificacoes}
          keyExtractor={(n) => n.id}
          contentContainerStyle={{ padding: SPACING.lg, paddingBottom: insets.bottom + SPACING.xl, gap: SPACING.sm }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[s.card, !item.lida && s.cardUnread]}
              activeOpacity={0.8}
              onPress={() => !item.lida && marcarLida(item.id)}
            >
              <View style={s.iconWrap}>
                <Icon name={TIPO_ICON[item.tipo] ?? 'bell'} size={20} color={COLORS.gold} />
              </View>
              <View style={s.body}>
                <Text style={s.cardTitle} numberOfLines={1}>{item.titulo}</Text>
                <Text style={s.cardMsg} numberOfLines={2}>{item.mensagem}</Text>
              </View>
              <View style={s.meta}>
                <Text style={s.time}>{tempoAtras(item.created_at)}</Text>
                {!item.lida && <View style={s.dot} />}
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.black },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.borderWeak,
  },
  title: { color: COLORS.text, fontSize: 18, ...FONT.bold },
  markAll: { color: COLORS.gold, fontSize: 13, ...FONT.medium },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.sm },
  emptyText: { color: COLORS.text3, fontSize: 13 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: COLORS.surface1, borderRadius: RADIUS.lg, padding: SPACING.md,
    borderWidth: 1, borderColor: COLORS.borderWeak,
  },
  cardUnread: { borderColor: COLORS.border, backgroundColor: COLORS.surface2 },
  iconWrap: {
    width: 40, height: 40, borderRadius: RADIUS.full,
    backgroundColor: 'rgba(201,168,76,0.10)', borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  body: { flex: 1, gap: 2 },
  cardTitle: { color: COLORS.text, fontSize: 14, ...FONT.medium },
  cardMsg: { color: COLORS.text3, fontSize: 12, lineHeight: 16 },
  meta: { alignItems: 'flex-end', gap: 6 },
  time: { color: COLORS.text3, fontSize: 10 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.gold },
});
