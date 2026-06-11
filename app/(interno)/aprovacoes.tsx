import React, { useState, useCallback, useEffect } from 'react';
import {
  ScrollView, View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { COLORS, SPACING, FONT, RADIUS } from '../../src/constants/theme';
import { supabase } from '../../src/lib/supabase';
import { useAuthStore } from '../../src/stores/authStore';
import { Badge } from '../../src/components/ui/Badge';
import { Database } from '../../src/types/database';

type Aprovacao = Database['public']['Tables']['aprovacoes']['Row'] & {
  clientes: { nome_fantasia: string } | null;
  respondido_por_profile: { nome: string } | null;
};

const STATUS_INFO = {
  aguardando_aprovacao: { label: 'Aguardando', variant: 'warning' as const, emoji: '⏳' },
  aprovado:             { label: 'Aprovado',   variant: 'success' as const, emoji: '✅' },
  reprovado:            { label: 'Reprovado',  variant: 'danger'  as const, emoji: '❌' },
  revisao:              { label: 'Revisão',    variant: 'gray'    as const, emoji: '🔄' },
};

const PLATAFORMA_EMOJI: Record<string, string> = {
  instagram: '📸', facebook: '👥', linkedin: '💼', tiktok: '🎵', youtube: '▶️',
};

type Filtro = 'todas' | 'aguardando_aprovacao' | 'aprovado' | 'reprovado' | 'revisao';

export default function AprovacoesInternoScreen() {
  const { profile } = useAuthStore();
  const [aprovacoes, setAprovacoes] = useState<Aprovacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<Filtro>('todas');

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('aprovacoes')
      .select('*, clientes!cliente_id(nome_fantasia), respondido_por_profile:profiles!respondido_por(nome)')
      .order('created_at', { ascending: false })
      .limit(100);
    setAprovacoes((data as unknown as Aprovacao[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const ch = supabase
      .channel('aprovacoes-interno')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'aprovacoes' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  const counts = {
    aguardando_aprovacao: aprovacoes.filter(a => a.status === 'aguardando_aprovacao').length,
    aprovado:             aprovacoes.filter(a => a.status === 'aprovado').length,
    reprovado:            aprovacoes.filter(a => a.status === 'reprovado').length,
    revisao:              aprovacoes.filter(a => a.status === 'revisao').length,
  };

  const lista = filtro === 'todas'
    ? aprovacoes
    : aprovacoes.filter(a => a.status === filtro);

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={COLORS.gold} />}
    >
      {/* Header */}
      <View style={s.pageHeader}>
        <Text style={s.pageTitle}>Aprovações</Text>
        {loading && <ActivityIndicator color={COLORS.gold} size="small" />}
      </View>

      {/* Resumo */}
      <View style={s.resumoRow}>
        <ResumoChip emoji="⏳" label="Aguardando" count={counts.aguardando_aprovacao} color={COLORS.warning} />
        <ResumoChip emoji="✅" label="Aprovados"  count={counts.aprovado}             color={COLORS.success} />
        <ResumoChip emoji="🔄" label="Revisão"    count={counts.revisao}             color="#8b5cf6" />
        <ResumoChip emoji="❌" label="Reprovados" count={counts.reprovado}           color={COLORS.danger} />
      </View>

      {/* Filtros */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={s.filtros}>
          {([
            { k: 'todas',                l: `Todas (${aprovacoes.length})` },
            { k: 'aguardando_aprovacao', l: `Aguardando (${counts.aguardando_aprovacao})` },
            { k: 'aprovado',             l: `Aprovados (${counts.aprovado})` },
            { k: 'revisao',              l: `Revisão (${counts.revisao})` },
            { k: 'reprovado',            l: `Reprovados (${counts.reprovado})` },
          ] as const).map(f => (
            <TouchableOpacity
              key={f.k}
              style={[s.filtroBtn, filtro === f.k && s.filtroBtnActive]}
              onPress={() => setFiltro(f.k)}
            >
              <Text style={[s.filtroText, filtro === f.k && s.filtroTextActive]}>{f.l}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Lista */}
      {lista.length === 0 && !loading && (
        <View style={s.emptyState}>
          <Text style={s.emptyIcon}>📋</Text>
          <Text style={s.emptyText}>Nenhuma aprovação nesta categoria.</Text>
        </View>
      )}

      {lista.map(apr => {
        const info = STATUS_INFO[apr.status] ?? STATUS_INFO.aguardando_aprovacao;
        const conteudo = apr.conteudo as any;
        const prazoExpired = apr.prazo_resposta && new Date(apr.prazo_resposta) < new Date() && apr.status === 'aguardando_aprovacao';

        return (
          <View key={apr.id} style={[s.card, { borderLeftColor: STATUS_INFO[apr.status]?.variant === 'warning' ? COLORS.warning : STATUS_INFO[apr.status]?.variant === 'success' ? COLORS.success : STATUS_INFO[apr.status]?.variant === 'danger' ? COLORS.danger : '#8b5cf6' }]}>

            {/* Topo */}
            <View style={s.cardTop}>
              <View style={s.cardTopLeft}>
                <Text style={s.clienteNome}>
                  {apr.clientes?.nome_fantasia ?? apr.cliente_nome ?? '—'}
                </Text>
                <Text style={s.cardMeta}>
                  {PLATAFORMA_EMOJI[apr.plataforma] ?? '📱'} {apr.plataforma} · {apr.tipo_conteudo === 'video' ? '🎬 Vídeo' : '🖼 Estático'}
                </Text>
              </View>
              <Badge label={`${info.emoji} ${info.label}`} variant={info.variant} />
            </View>

            {/* Responsável social media */}
            {apr.social_media_responsavel && (
              <Text style={s.social}>👤 {apr.social_media_responsavel}</Text>
            )}

            {/* Descrição */}
            {apr.descricao_post && (
              <Text style={s.descricao} numberOfLines={2}>{apr.descricao_post}</Text>
            )}

            {/* Prazo */}
            <View style={s.datas}>
              {apr.data_publicacao_prevista && (
                <Text style={s.data}>
                  📅 Pub: {new Date(apr.data_publicacao_prevista).toLocaleDateString('pt-BR')}
                </Text>
              )}
              {apr.prazo_resposta && (
                <Text style={[s.data, prazoExpired && { color: COLORS.danger }]}>
                  ⏰ Prazo: {new Date(apr.prazo_resposta).toLocaleDateString('pt-BR')}
                  {prazoExpired ? ' ⚠️ EXPIRADO' : ''}
                </Text>
              )}
            </View>

            {/* Arquivo */}
            {conteudo?.nome_arquivo && (
              <Text style={s.arquivo}>📎 {conteudo.nome_arquivo}</Text>
            )}

            {/* Resposta do cliente */}
            {apr.status !== 'aguardando_aprovacao' && (
              <View style={s.respostaBox}>
                {apr.resposta_comentario && (
                  <Text style={s.respostaText}>💬 "{apr.resposta_comentario}"</Text>
                )}
                <Text style={s.respostaData}>
                  {apr.respondido_em ? new Date(apr.respondido_em).toLocaleString('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }) : ''}
                </Text>
              </View>
            )}

            {/* Data de envio */}
            <Text style={s.enviadoEm}>
              Enviado em {new Date(apr.created_at).toLocaleString('pt-BR', { dateStyle: 'medium', timeStyle: 'short' })}
            </Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

function ResumoChip({ emoji, label, count, color }: { emoji: string; label: string; count: number; color: string }) {
  return (
    <View style={[rs.chip, { borderColor: color + '44' }]}>
      <Text style={[rs.num, { color }]}>{count}</Text>
      <Text style={rs.label}>{emoji} {label}</Text>
    </View>
  );
}

const rs = StyleSheet.create({
  chip: { flex: 1, backgroundColor: COLORS.surface2, borderRadius: RADIUS.md, padding: SPACING.sm, alignItems: 'center', borderWidth: 1, gap: 2 },
  num: { fontSize: 20, ...FONT.bold },
  label: { color: COLORS.text3, fontSize: 9, textAlign: 'center' },
});

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.black },
  content: { padding: SPACING.lg, gap: SPACING.md, paddingBottom: 48 },
  pageHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pageTitle: { color: COLORS.text, fontSize: 22, ...FONT.bold },
  resumoRow: { flexDirection: 'row', gap: SPACING.sm },
  filtros: { flexDirection: 'row', gap: SPACING.sm, paddingRight: SPACING.lg },
  filtroBtn: { paddingHorizontal: SPACING.md, paddingVertical: 6, borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.border },
  filtroBtnActive: { borderColor: COLORS.gold, backgroundColor: 'rgba(201,168,76,0.12)' },
  filtroText: { color: COLORS.text3, fontSize: 12 },
  filtroTextActive: { color: COLORS.gold, ...FONT.medium },
  emptyState: { alignItems: 'center', paddingVertical: 48, gap: SPACING.sm },
  emptyIcon: { fontSize: 36 },
  emptyText: { color: COLORS.text3, fontSize: 13 },
  card: {
    backgroundColor: COLORS.surface2, borderRadius: RADIUS.lg, borderLeftWidth: 4,
    padding: SPACING.lg, gap: SPACING.sm, borderWidth: 1, borderColor: COLORS.borderWeak,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: SPACING.sm },
  cardTopLeft: { flex: 1, gap: 2 },
  clienteNome: { color: COLORS.text, fontSize: 14, ...FONT.bold },
  cardMeta: { color: COLORS.text3, fontSize: 12, textTransform: 'capitalize' },
  social: { color: COLORS.text2, fontSize: 12 },
  descricao: { color: COLORS.text2, fontSize: 13, lineHeight: 18 },
  datas: { flexDirection: 'row', gap: SPACING.md, flexWrap: 'wrap' },
  data: { color: COLORS.text3, fontSize: 11 },
  arquivo: { color: COLORS.gold, fontSize: 12 },
  respostaBox: { backgroundColor: COLORS.surface3, borderRadius: RADIUS.sm, padding: SPACING.sm, gap: 2 },
  respostaText: { color: COLORS.text2, fontSize: 12, fontStyle: 'italic' },
  respostaData: { color: COLORS.text3, fontSize: 11 },
  enviadoEm: { color: COLORS.text3, fontSize: 10 },
});
