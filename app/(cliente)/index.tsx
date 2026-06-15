import React, { useState, useCallback } from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, FONT, RADIUS } from '../../src/constants/theme';
import { Icon } from '../../src/components/ui/Icon';
import { useCliente } from '../../src/hooks/useCliente';
import { useTrafego } from '../../src/hooks/useTrafego';
import { useProducoes } from '../../src/hooks/useProducoes';
import { useNotificacoesStore } from '../../src/stores/notificacoesStore';
import { Card } from '../../src/components/ui/Card';
import { MetricCard } from '../../src/components/ui/MetricCard';
import { ProducaoCard } from '../../src/components/cliente/ProducaoCard';
import { FeedbackForm } from '../../src/components/cliente/FeedbackForm';
import { Badge } from '../../src/components/ui/Badge';
import { supabase } from '../../src/lib/supabase';
import { useAuthStore } from '../../src/stores/authStore';

export default function ClienteInicio() {
  const router = useRouter();
  const { cliente, loading: loadingCliente } = useCliente();
  const { metricas, loading: loadingTrafego, reload: reloadTrafego } = useTrafego();
  const { recentes, loading: loadingProducoes, reload: reloadProducoes } = useProducoes();
  const { notificacoes } = useNotificacoesStore();
  const { clienteId } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);
  const [feedbackTipo, setFeedbackTipo] = useState<'elogio' | 'sugestao' | 'reclamacao' | null>(null);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([reloadTrafego(), reloadProducoes()]);
    setRefreshing(false);
  }, [reloadTrafego, reloadProducoes]);

  const enviarFeedback = async (mensagem: string) => {
    if (!clienteId || !feedbackTipo) return;
    await supabase.from('feedbacks').insert({
      cliente_id: clienteId,
      tipo: feedbackTipo,
      mensagem,
    });
    const { data: admin } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'admin')
      .maybeSingle();
    if (admin) {
      await supabase.from('notificacoes').insert({
        profile_id: admin.id,
        tipo: 'feedback_novo',
        titulo: `Novo ${feedbackTipo} de ${cliente?.nome_fantasia ?? 'cliente'}`,
        mensagem: mensagem.substring(0, 80),
      });
    }
  };

  if (loadingCliente) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.gold} />
      </View>
    );
  }

  const naoLidas = notificacoes.filter((n) => !n.lida).slice(0, 3);

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.gold} />}
      >
        {/* Banner boas-vindas */}
        <Card style={styles.welcomeCard}>
          <View style={styles.welcomeRow}>
            <View style={styles.welcomeLeft}>
              <Text style={styles.welcomeGreet}>Olá,</Text>
              <Text style={styles.welcomeName}>{cliente?.nome_fantasia ?? '...'}</Text>
              <Text style={styles.welcomeSub}>Deixa com a gente!</Text>
            </View>
            <Badge
              label={cliente?.campanha_status === 'ativa' ? '● Ativa' : '● Pausada'}
              variant={cliente?.campanha_status === 'ativa' ? 'success' : 'warning'}
            />
          </View>
        </Card>

        {/* Grid métricas */}
        <Text style={styles.sectionTitle}>Performance do mês</Text>
        {loadingTrafego ? (
          <ActivityIndicator color={COLORS.gold} style={{ marginVertical: SPACING.lg }} />
        ) : (
          <View style={styles.metricsGrid}>
            <MetricCard
              label="Alcance"
              value={metricas.totalAlcance.toLocaleString('pt-BR')}
              goldValue
            />
            <MetricCard
              label="Cliques"
              value={metricas.totalCliques.toLocaleString('pt-BR')}
            />
            <MetricCard
              label="Investido"
              value={metricas.totalInvestido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              goldValue
            />
            <MetricCard
              label="Leads"
              value={metricas.totalLeads.toLocaleString('pt-BR')}
            />
          </View>
        )}

        {/* Produções recentes */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Produções do mês</Text>
          <TouchableOpacity onPress={() => router.push('/(cliente)/producoes')}>
            <Text style={styles.verTodas}>Ver todas</Text>
          </TouchableOpacity>
        </View>
        {loadingProducoes ? (
          <ActivityIndicator color={COLORS.gold} />
        ) : recentes.length === 0 ? (
          <Text style={styles.vazio}>Nenhuma produção no momento.</Text>
        ) : (
          recentes.map((p) => <ProducaoCard key={p.id} producao={p} />)
        )}

        {/* Notificações recentes */}
        {naoLidas.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Notificações</Text>
            <Card>
              {naoLidas.map((n) => (
                <View key={n.id} style={styles.notifRow}>
                  <View style={[styles.notifDot, { backgroundColor: COLORS.gold }]} />
                  <View style={styles.notifContent}>
                    <Text style={styles.notifTitulo}>{n.titulo}</Text>
                    <Text style={styles.notifMsg} numberOfLines={1}>{n.mensagem}</Text>
                  </View>
                  <Text style={styles.notifHora}>
                    {new Date(n.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              ))}
            </Card>
          </>
        )}

        {/* Feedback rápido */}
        <Text style={styles.sectionTitle}>Fale com a gente</Text>
        <View style={styles.feedbackRow}>
          <TouchableOpacity
            style={[styles.feedbackBtn, { borderColor: COLORS.success }]}
            onPress={() => setFeedbackTipo('elogio')}
            activeOpacity={0.8}
          >
            <Icon name="elogio" size={22} color={COLORS.success} />
            <Text style={[styles.feedbackLabel, { color: COLORS.success }]}>Elogiar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.feedbackBtn, { borderColor: COLORS.warning }]}
            onPress={() => setFeedbackTipo('sugestao')}
            activeOpacity={0.8}
          >
            <Icon name="ideia" size={22} color={COLORS.warning} />
            <Text style={[styles.feedbackLabel, { color: COLORS.warning }]}>Sugerir</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.feedbackBtn, { borderColor: COLORS.danger }]}
            onPress={() => setFeedbackTipo('reclamacao')}
            activeOpacity={0.8}
          >
            <Icon name="alerta" size={22} color={COLORS.danger} />
            <Text style={[styles.feedbackLabel, { color: COLORS.danger }]}>Reclamar</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {feedbackTipo && (
        <FeedbackForm
          visible
          tipo={feedbackTipo}
          onClose={() => setFeedbackTipo(null)}
          onSubmit={enviarFeedback}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.black },
  content: { padding: SPACING.lg, gap: SPACING.lg, paddingBottom: SPACING.xxl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.black },
  welcomeCard: { borderColor: COLORS.border },
  welcomeRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  welcomeLeft: { gap: 2 },
  welcomeGreet: { color: COLORS.text2, fontSize: 14 },
  welcomeName: { color: COLORS.text, fontSize: 22, ...FONT.bold },
  welcomeSub: { color: COLORS.gold, fontSize: 13, ...FONT.medium },
  sectionTitle: { color: COLORS.text, fontSize: 16, ...FONT.bold },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  verTodas: { color: COLORS.gold, fontSize: 13 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  vazio: { color: COLORS.text3, fontSize: 13 },
  notifRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.borderWeak },
  notifDot: { width: 8, height: 8, borderRadius: RADIUS.full },
  notifContent: { flex: 1 },
  notifTitulo: { color: COLORS.text, fontSize: 13, ...FONT.medium },
  notifMsg: { color: COLORS.text3, fontSize: 12 },
  notifHora: { color: COLORS.text3, fontSize: 11 },
  feedbackRow: { flexDirection: 'row', gap: SPACING.sm },
  feedbackBtn: { flex: 1, alignItems: 'center', padding: SPACING.md, borderRadius: RADIUS.md, borderWidth: 1, backgroundColor: COLORS.surface2, gap: SPACING.xs },
  feedbackEmoji: { fontSize: 22 },
  feedbackLabel: { fontSize: 12, ...FONT.medium },
});
