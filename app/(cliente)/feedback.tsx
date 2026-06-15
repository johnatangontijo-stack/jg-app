import React, { useState, useEffect } from 'react';
import { ScrollView, View, Text, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator } from 'react-native';
import { COLORS, SPACING, FONT, RADIUS } from '../../src/constants/theme';
import { useAuthStore } from '../../src/stores/authStore';
import { supabase } from '../../src/lib/supabase';
import { Card } from '../../src/components/ui/Card';
import { GoldButton } from '../../src/components/ui/GoldButton';
import { Badge } from '../../src/components/ui/Badge';
import { Icon, type IconName } from '../../src/components/ui/Icon';
import { Database } from '../../src/types/database';

type Feedback = Database['public']['Tables']['feedbacks']['Row'];
type Tipo = 'elogio' | 'sugestao' | 'reclamacao';

const TIPO_CONFIG: Record<Tipo, { label: string; icon: IconName; color: string }> = {
  elogio: { label: 'Elogio', icon: 'elogio', color: COLORS.success },
  sugestao: { label: 'Sugestão', icon: 'ideia', color: COLORS.warning },
  reclamacao: { label: 'Reclamação', icon: 'alerta', color: COLORS.danger },
};

export default function FeedbackScreen() {
  const { clienteId, profile } = useAuthStore();
  const [tipo, setTipo] = useState<Tipo>('elogio');
  const [mensagem, setMensagem] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [sent, setSent] = useState(false);
  const [historico, setHistorico] = useState<Feedback[]>([]);
  const [loadingHist, setLoadingHist] = useState(true);

  useEffect(() => {
    if (!clienteId) return;
    supabase
      .from('feedbacks')
      .select('*')
      .eq('cliente_id', clienteId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setHistorico(data ?? []);
        setLoadingHist(false);
      });
  }, [clienteId, sent]);

  const enviar = async () => {
    if (!clienteId || !mensagem.trim()) return;
    setEnviando(true);
    try {
      await supabase.from('feedbacks').insert({ cliente_id: clienteId, tipo, mensagem: mensagem.trim() });
      const { data: admin } = await supabase.from('profiles').select('id').eq('role', 'admin').maybeSingle();
      if (admin) {
        await supabase.from('notificacoes').insert({
          profile_id: admin.id,
          tipo: 'feedback_novo',
          titulo: `Novo ${tipo} recebido`,
          mensagem: mensagem.substring(0, 80),
        });
      }
      setSent(true);
      setMensagem('');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {sent ? (
        <Card style={styles.sentCard}>
          <Text style={styles.sentIcon}>✓</Text>
          <Text style={styles.sentTitle}>Enviado para o Joni!</Text>
          <Text style={styles.sentSub}>Você será contactado em até 24h. Deixa com a gente!</Text>
          <GoldButton label="Enviar outro" onPress={() => setSent(false)} variant="ghost" style={{ marginTop: SPACING.md }} />
        </Card>
      ) : (
        <>
          <Text style={styles.pageTitle}>Feedback direto</Text>
          <Text style={styles.pageHint}>Cai diretamente no painel do Joni Gontijo. Você será contactado em até 24h.</Text>

          {/* Seletor de tipo */}
          <View style={styles.tiposRow}>
            {(Object.entries(TIPO_CONFIG) as [Tipo, typeof TIPO_CONFIG[Tipo]][]).map(([key, cfg]) => (
              <TouchableOpacity
                key={key}
                style={[styles.tipoCard, tipo === key && { borderColor: cfg.color, borderWidth: 1.5 }]}
                onPress={() => setTipo(key)}
                activeOpacity={0.8}
              >
                <Icon name={cfg.icon} size={24} color={cfg.color} />
                <Text style={[styles.tipoLabel, { color: cfg.color }]}>{cfg.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            style={styles.msgInput}
            value={mensagem}
            onChangeText={setMensagem}
            placeholder={`Escreva seu ${TIPO_CONFIG[tipo].label.toLowerCase()}...`}
            placeholderTextColor={COLORS.text3}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />

          <GoldButton label={`Enviar ${TIPO_CONFIG[tipo].label}`} onPress={enviar} loading={enviando} disabled={!mensagem.trim()} />
        </>
      )}

      {/* Histórico */}
      {historico.length > 0 && (
        <>
          <Text style={styles.histTitle}>Histórico</Text>
          {historico.map((fb) => {
            const cfg = TIPO_CONFIG[fb.tipo as Tipo];
            return (
              <View key={fb.id} style={[styles.fbCard, { borderLeftColor: cfg.color }]}>
                <View style={styles.fbHeader}>
                  <Icon name={cfg.icon} size={18} color={cfg.color} />
                  <Text style={styles.fbData}>{new Date(fb.created_at).toLocaleDateString('pt-BR')}</Text>
                  {fb.respondido && <Badge label="Respondido" variant="success" />}
                </View>
                <Text style={styles.fbMsg}>{fb.mensagem}</Text>
                {fb.resposta && (
                  <View style={styles.fbResposta}>
                    <Text style={styles.fbRespostaLabel}>Resposta do Joni:</Text>
                    <Text style={styles.fbRespostaText}>{fb.resposta}</Text>
                  </View>
                )}
              </View>
            );
          })}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.black },
  content: { padding: SPACING.lg, gap: SPACING.lg, paddingBottom: SPACING.xxl },
  pageTitle: { color: COLORS.text, fontSize: 20, ...FONT.bold },
  pageHint: { color: COLORS.text3, fontSize: 13, marginTop: -SPACING.sm },
  tiposRow: { flexDirection: 'row', gap: SPACING.sm },
  tipoCard: { flex: 1, backgroundColor: COLORS.surface2, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.borderWeak, padding: SPACING.md, alignItems: 'center', gap: SPACING.xs },
  tipoEmoji: { fontSize: 22 },
  tipoLabel: { fontSize: 12, ...FONT.medium },
  msgInput: { backgroundColor: COLORS.surface2, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.borderWeak, padding: SPACING.md, color: COLORS.text, fontSize: 14, minHeight: 120 },
  sentCard: { alignItems: 'center', gap: SPACING.md, paddingVertical: SPACING.xl },
  sentIcon: { fontSize: 40, color: COLORS.success },
  sentTitle: { color: COLORS.text, fontSize: 20, ...FONT.bold },
  sentSub: { color: COLORS.text2, fontSize: 13, textAlign: 'center' },
  histTitle: { color: COLORS.text, fontSize: 16, ...FONT.bold },
  fbCard: { backgroundColor: COLORS.surface2, borderRadius: RADIUS.md, borderLeftWidth: 3, padding: SPACING.md, gap: SPACING.sm },
  fbHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  fbEmoji: { fontSize: 16 },
  fbData: { flex: 1, color: COLORS.text3, fontSize: 12 },
  fbMsg: { color: COLORS.text2, fontSize: 13 },
  fbResposta: { backgroundColor: COLORS.surface3, borderRadius: RADIUS.sm, padding: SPACING.sm, gap: 4 },
  fbRespostaLabel: { color: COLORS.gold, fontSize: 11, ...FONT.medium },
  fbRespostaText: { color: COLORS.text2, fontSize: 13 },
});
