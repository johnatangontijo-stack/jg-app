import React, { useState, useEffect, useCallback } from 'react';
import {
  ScrollView, View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Redirect } from 'expo-router';
import { COLORS, SPACING, FONT, RADIUS } from '../../src/constants/theme';
import { supabase } from '../../src/lib/supabase';
import { useAuthStore } from '../../src/stores/authStore';
import { Card } from '../../src/components/ui/Card';
import { Badge } from '../../src/components/ui/Badge';
import { GoldButton } from '../../src/components/ui/GoldButton';
import { Database } from '../../src/types/database';

type Feedback = Database['public']['Tables']['feedbacks']['Row'] & {
  clientes: { nome_fantasia: string } | null;
};

const TIPO_COLOR: Record<string, string> = {
  elogio: COLORS.success,
  sugestao: COLORS.warning,
  reclamacao: COLORS.danger,
};

export default function FeedbacksAdminScreen() {
  const { profile } = useAuthStore();
  if (profile && !['admin', 'gerencia'].includes(profile.role)) return <Redirect href="/(interno)/dashboard" />;

  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [respostasMap, setRespostasMap] = useState<Record<string, string>>({});
  const [sendingId, setSendingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('feedbacks')
      .select('*, clientes!cliente_id(nome_fantasia)')
      .order('created_at', { ascending: false });
    setFeedbacks((data as unknown as Feedback[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const responder = async (fb: Feedback) => {
    const resposta = respostasMap[fb.id];
    if (!resposta?.trim()) return;
    setSendingId(fb.id);
    try {
      await supabase.from('feedbacks').update({
        respondido: true,
        resposta: resposta.trim(),
        respondido_em: new Date().toISOString(),
      }).eq('id', fb.id);

      const { data: cu } = await supabase.from('cliente_usuarios').select('profile_id').eq('cliente_id', fb.cliente_id);
      for (const u of cu ?? []) {
        await supabase.from('notificacoes').insert({
          profile_id: u.profile_id,
          tipo: 'geral',
          titulo: 'O Joni respondeu seu feedback',
          mensagem: resposta.trim().substring(0, 80),
        });
      }
      setRespostasMap((m) => { const n = { ...m }; delete n[fb.id]; return n; });
      await load();
    } finally {
      setSendingId(null);
    }
  };

  const naoRespondidos = feedbacks.filter((f) => !f.respondido);
  const respondidos = feedbacks.filter((f) => f.respondido);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={COLORS.gold} />}
    >
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Feedbacks</Text>
        {loading && <ActivityIndicator color={COLORS.gold} size="small" />}
      </View>

      {!loading && feedbacks.length === 0 && (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>Nenhum feedback recebido ainda.</Text>
        </View>
      )}

      {naoRespondidos.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Não respondidos ({naoRespondidos.length})</Text>
          {naoRespondidos.map((fb) => (
            <FeedbackCard
              key={fb.id}
              fb={fb}
              resposta={respostasMap[fb.id] ?? ''}
              onRespostaChange={(v) => setRespostasMap((m) => ({ ...m, [fb.id]: v }))}
              onResponder={() => responder(fb)}
              sending={sendingId === fb.id}
            />
          ))}
        </>
      )}

      {respondidos.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Respondidos</Text>
          {respondidos.map((fb) => (
            <FeedbackCard key={fb.id} fb={fb} readonly />
          ))}
        </>
      )}
    </ScrollView>
  );
}

function FeedbackCard({
  fb, resposta, onRespostaChange, onResponder, sending, readonly,
}: {
  fb: Feedback;
  resposta?: string;
  onRespostaChange?: (v: string) => void;
  onResponder?: () => void;
  sending?: boolean;
  readonly?: boolean;
}) {
  const cor = TIPO_COLOR[fb.tipo] ?? COLORS.text2;
  return (
    <View style={[styles.fbCard, { borderLeftColor: cor }]}>
      <View style={styles.fbHeader}>
        <Text style={styles.fbCliente}>{fb.clientes?.nome_fantasia ?? '—'}</Text>
        <Text style={styles.fbData}>{new Date(fb.created_at).toLocaleDateString('pt-BR')}</Text>
        <Badge label={fb.tipo} variant={fb.tipo === 'elogio' ? 'success' : fb.tipo === 'sugestao' ? 'warning' : 'danger'} />
      </View>
      <Text style={styles.fbMsg}>{fb.mensagem}</Text>
      {!readonly && !fb.respondido && (
        <>
          <TextInput
            style={styles.respostaInput}
            value={resposta}
            onChangeText={onRespostaChange}
            placeholder="Escreva sua resposta..."
            placeholderTextColor={COLORS.text3}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
          <GoldButton label="Responder" onPress={onResponder!} loading={!!sending} disabled={!resposta?.trim()} />
        </>
      )}
      {fb.respondido && fb.resposta && (
        <View style={styles.respostaBox}>
          <Text style={styles.respostaLabel}>Sua resposta:</Text>
          <Text style={styles.respostaText}>{fb.resposta}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.black },
  content: { padding: SPACING.lg, gap: SPACING.lg, paddingBottom: SPACING.xxl },
  pageHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pageTitle: { color: COLORS.text, fontSize: 22, ...FONT.bold },
  emptyBox: { padding: SPACING.xl, alignItems: 'center' },
  emptyText: { color: COLORS.text3, fontSize: 13 },
  sectionTitle: { color: COLORS.text, fontSize: 16, ...FONT.bold },
  fbCard: { backgroundColor: COLORS.surface2, borderRadius: RADIUS.md, borderLeftWidth: 3, padding: SPACING.md, gap: SPACING.sm },
  fbHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  fbCliente: { flex: 1, color: COLORS.text, fontSize: 13, ...FONT.medium },
  fbData: { color: COLORS.text3, fontSize: 12 },
  fbMsg: { color: COLORS.text2, fontSize: 13 },
  respostaInput: { backgroundColor: COLORS.surface3, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.borderWeak, padding: SPACING.md, color: COLORS.text, fontSize: 13, minHeight: 70 },
  respostaBox: { backgroundColor: COLORS.surface3, borderRadius: RADIUS.sm, padding: SPACING.sm, gap: 4 },
  respostaLabel: { color: COLORS.gold, fontSize: 11, ...FONT.medium },
  respostaText: { color: COLORS.text2, fontSize: 13 },
});
