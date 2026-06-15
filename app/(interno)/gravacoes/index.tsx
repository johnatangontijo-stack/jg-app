import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  ScrollView, View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, AppState,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../../src/lib/supabase';
import { COLORS, SPACING, FONT, RADIUS } from '../../../src/constants/theme';
import { Card } from '../../../src/components/ui/Card';
import { Icon, IconText } from '../../../src/components/ui/Icon';
import { Database } from '../../../src/types/database';

type Gravacao = Omit<Database['public']['Tables']['gravacoes']['Row'], 'link_gravacao'> & {
  roteiro: string | null;
  clientes: { nome_fantasia: string } | null;
  profiles: { nome: string } | null;
};

const LIMITE_SEGUNDOS = 90 * 60; // 1h30

function fmtTimer(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return [h, m, s].map(n => String(n).padStart(2, '0')).join(':');
}

function timerColor(sec: number) {
  const pct = sec / LIMITE_SEGUNDOS;
  if (pct <= 0.15) return COLORS.danger;   // últimos 15% = vermelho
  if (pct <= 0.25) return COLORS.warning;  // 25% restante = amarelo
  return COLORS.success;
}

export default function GravoesScreen() {
  const [gravacoes, setGravacoes] = useState<Gravacao[]>([]);
  const [loading, setLoading] = useState(true);
  // timerMap: gravacao.id → segundos restantes (null = não iniciado)
  const [timerMap, setTimerMap] = useState<Record<string, number | null>>({});
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('gravacoes')
      .select('id, cliente_id, titulo, descricao, roteiro, google_event_id, data_gravacao, duracao_min, responsavel_id, created_at, clientes(nome_fantasia), profiles!responsavel_id(nome)')
      .order('data_gravacao', { ascending: false })
      .limit(50);
    setGravacoes((data ?? []) as unknown as Gravacao[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Tick global para todos os timers ativos
  useEffect(() => {
    const hasActive = Object.values(timerMap).some(v => v !== null && v > 0);
    if (!hasActive) {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      return;
    }
    if (intervalRef.current) return; // já correndo
    intervalRef.current = setInterval(() => {
      setTimerMap(prev => {
        const next = { ...prev };
        for (const id in next) {
          if (next[id] !== null && next[id]! > 0) {
            next[id] = next[id]! - 1;
          }
        }
        return next;
      });
    }, 1000);
    return () => { if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; } };
  }, [timerMap]);

  const startTimer = (id: string) => {
    setTimerMap(prev => ({ ...prev, [id]: LIMITE_SEGUNDOS }));
  };

  const stopTimer = (id: string) => {
    setTimerMap(prev => ({ ...prev, [id]: null }));
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={COLORS.gold} />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Gravações</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/(interno)/gravacoes/add')}>
          <Text style={styles.addText}>+ Nova</Text>
        </TouchableOpacity>
      </View>

      {loading && <ActivityIndicator color={COLORS.gold} style={{ marginTop: SPACING.xl }} />}

      {!loading && gravacoes.length === 0 && (
        <Card>
          <Text style={styles.empty}>Nenhuma gravação registrada ainda.</Text>
          <TouchableOpacity onPress={() => router.push('/(interno)/gravacoes/add')}>
            <Text style={styles.emptyAction}>Adicionar primeira gravação →</Text>
          </TouchableOpacity>
        </Card>
      )}

      {gravacoes.map(g => {
        const secs = timerMap[g.id] ?? null;
        const running = secs !== null;
        const pct85 = secs !== null && secs <= Math.round(LIMITE_SEGUNDOS * 0.15);
        const finished = secs === 0;

        return (
          <Card key={g.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitulo} numberOfLines={2}>{g.titulo}</Text>
              <Text style={styles.cardData}>
                {new Date(g.data_gravacao).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
              </Text>
            </View>

            {g.clientes && <IconText name="clientes" size={12} color={COLORS.text2} textStyle={styles.cardMeta}>{g.clientes.nome_fantasia}</IconText>}
            {g.profiles && <IconText name="usuario" size={12} color={COLORS.text2} textStyle={styles.cardMeta}>{g.profiles.nome}</IconText>}
            {g.duracao_min && <IconText name="prazo" size={12} color={COLORS.text2} textStyle={styles.cardMeta}>{g.duracao_min} min planejados</IconText>}
            {g.descricao && <Text style={styles.cardDesc} numberOfLines={2}>{g.descricao}</Text>}

            {/* Roteiro */}
            {g.roteiro && (
              <View style={styles.roteiroBox}>
                <IconText name="list" size={12} color={COLORS.gold} textStyle={styles.roteiroLabel}>Roteiro</IconText>
                <Text style={styles.roteiroText} numberOfLines={3}>{g.roteiro}</Text>
              </View>
            )}

            {/* Timer 1h30 */}
            <View style={styles.timerRow}>
              {!running ? (
                <TouchableOpacity style={styles.timerStartBtn} onPress={() => startTimer(g.id)}>
                  <Text style={styles.timerStartText}>▶ Iniciar timer 1h30</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.timerActiveBox}>
                  <View style={styles.timerDisplay}>
                    <Text style={[styles.timerValue, { color: finished ? COLORS.danger : timerColor(secs!) }]}>
                      {finished ? 'ENCERRADO' : fmtTimer(secs!)}
                    </Text>
                    {pct85 && !finished && (
                      <IconText name="alerta" size={12} color={COLORS.danger} textStyle={styles.timerAlert}>Menos de 15% restante!</IconText>
                    )}
                  </View>
                  <TouchableOpacity style={styles.timerStopBtn} onPress={() => stopTimer(g.id)}>
                    <Text style={styles.timerStopText}>■ Parar</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

          </Card>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.black },
  content: { padding: SPACING.lg, gap: SPACING.md, paddingBottom: 48 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.sm },
  title: { color: COLORS.text, fontSize: 22, ...FONT.bold },
  addBtn: { backgroundColor: COLORS.gold, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: RADIUS.md },
  addText: { color: COLORS.black, fontSize: 13, ...FONT.bold },
  card: { gap: SPACING.xs },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: SPACING.sm },
  cardTitulo: { flex: 1, color: COLORS.text, fontSize: 14, ...FONT.bold },
  cardData: { color: COLORS.text3, fontSize: 12 },
  cardMeta: { color: COLORS.text2, fontSize: 12 },
  cardDesc: { color: COLORS.text3, fontSize: 12, marginTop: SPACING.xs },
  // Timer
  timerRow: { marginTop: SPACING.xs },
  timerStartBtn: {
    paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border,
    alignSelf: 'flex-start',
  },
  timerStartText: { color: COLORS.text3, fontSize: 12 },
  timerActiveBox: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  timerDisplay: { flex: 1, gap: 2 },
  timerValue: { fontSize: 22, ...FONT.bold },
  timerAlert: { color: COLORS.danger, fontSize: 11, ...FONT.medium },
  timerStopBtn: {
    paddingVertical: SPACING.xs, paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.danger,
  },
  timerStopText: { color: COLORS.danger, fontSize: 12 },
  roteiroBox: { backgroundColor: COLORS.surface3, borderRadius: RADIUS.sm, padding: SPACING.sm, gap: 4, borderLeftWidth: 2, borderLeftColor: COLORS.gold },
  roteiroLabel: { color: COLORS.gold, fontSize: 11, ...FONT.medium },
  roteiroText: { color: COLORS.text2, fontSize: 12, lineHeight: 17 },
  empty: { color: COLORS.text2, textAlign: 'center', marginBottom: SPACING.sm },
  emptyAction: { color: COLORS.gold, textAlign: 'center', ...FONT.medium },
});
