import React, { useState, useEffect, useCallback } from 'react';
import {
  ScrollView, View, Text, StyleSheet, ActivityIndicator,
  RefreshControl, TouchableOpacity, Dimensions,
} from 'react-native';
import { COLORS, SPACING, FONT, RADIUS } from '../../src/constants/theme';
import { supabase } from '../../src/lib/supabase';
import { useAuthStore } from '../../src/stores/authStore';
import { Badge } from '../../src/components/ui/Badge';

const { width: SCREEN_W } = Dimensions.get('window');
const IS_WIDE = SCREEN_W > 900;

// ── helpers ────────────────────────────────────────────────────────────────
const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const mesAtual = () => new Date().toISOString().slice(0, 7);
const mes30 = () => { const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().slice(0, 10); };

// ── Sparkline (SVG puro, sem lib) ──────────────────────────────────────────
function Sparkline({ values, color = COLORS.gold, height = 36, width = 100 }: {
  values: number[]; color?: string; height?: number; width?: number;
}) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = width / (values.length - 1);
  const pts = values.map((v, i) => {
    const x = i * step;
    const y = height - ((v - min) / range) * height * 0.85 - height * 0.075;
    return `${x},${y}`;
  }).join(' ');

  return (
    <View style={{ width, height }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
        <polygon points={`0,${height} ${pts} ${width},${height}`} fill={color} fillOpacity="0.12" />
      </svg>
    </View>
  );
}

// ── Donut mini ─────────────────────────────────────────────────────────────
function MiniDonut({ pct, color, size = 44 }: { pct: number; color: string; size?: number }) {
  const r = size / 2 - 4;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <View style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={COLORS.surface3} strokeWidth="4" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`} />
        <text x={size/2} y={size/2+4} textAnchor="middle" fill={color} fontSize="10" fontWeight="bold">
          {pct}%
        </text>
      </svg>
    </View>
  );
}

// ── BarChart horizontal simples ────────────────────────────────────────────
function HBarChart({ data }: { data: { label: string; value: number; color?: string }[] }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <View style={{ gap: 8 }}>
      {data.map((d, i) => (
        <View key={i} style={{ gap: 3 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: COLORS.text2, fontSize: 11 }}>{d.label}</Text>
            <Text style={{ color: COLORS.text3, fontSize: 10 }}>{d.value}</Text>
          </View>
          <View style={{ height: 6, backgroundColor: COLORS.surface3, borderRadius: 3 }}>
            <View style={{
              height: 6, borderRadius: 3,
              width: `${(d.value / max) * 100}%` as any,
              backgroundColor: d.color ?? COLORS.gold,
              opacity: 0.4 + 0.6 * (d.value / max),
            }} />
          </View>
        </View>
      ))}
    </View>
  );
}

// ── Tipos ──────────────────────────────────────────────────────────────────
interface DashData {
  clientesAtivos: number;
  emRisco: number;
  atencao: number;
  saudaveis: number;
  mrr: number;
  mrrAnterior: number;
  mrrHistorico: number[];
  npsScore: number;
  promotores: number;
  neutros: number;
  detratores: number;
  piorCliente: string;
  alertas: { tipo: string; msg: string; nivel: 'danger' | 'warning' | 'info' }[];
  renovacoes30d: number;
  aguardandoAprovacao: number;
  gravacoesAgendadas: number;
  setores: { label: string; value: number }[];
  finPago: number;
  finPendente: number;
  finAtrasado: number;
  finTotal: number;
}

// ── Tela principal ─────────────────────────────────────────────────────────
export default function DashboardScreen() {
  const { profile } = useAuthStore();
  const [data, setData] = useState<DashData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const mes = mesAtual();
    const mesAnt = (() => {
      const d = new Date(); d.setMonth(d.getMonth() - 1);
      return d.toISOString().slice(0, 7);
    })();

    const [cliRes, pagRes, pagAntRes, npsRes, prodRes, gravRes, demRes] = await Promise.all([
      supabase.from('clientes').select('id,health_score,status,nome_fantasia,data_renovacao,mensalidade,segmento').eq('status', 'ativo'),
      supabase.from('pagamentos').select('status,valor,tipo_status').eq('competencia', mes),
      supabase.from('pagamentos').select('valor').eq('competencia', mesAnt).eq('status', 'pago'),
      supabase.from('nps_pesquisas').select('id').eq('ativo', true).maybeSingle(),
      supabase.from('producoes').select('status').eq('status', 'aguardando_aprovacao'),
      supabase.from('gravacoes').select('id').gte('data_gravacao', new Date().toISOString().slice(0, 7) + '-01'),
      supabase.from('demandas').select('prioridade').in('status', ['pendente', 'em_andamento']).eq('prioridade', 'urgente'),
    ]);

    const clientes = cliRes.data ?? [];
    const pags = pagRes.data ?? [];

    // MRR histórico simulado (últimos 6 meses derivado do atual com variação)
    const mrrAtual = clientes.reduce((a, c) => a + (c.mensalidade ?? 0), 0);
    const mrrHist = [0.82, 0.85, 0.88, 0.91, 0.95, 1.0].map(f => Math.round(mrrAtual * f));

    const emRisco = clientes.filter(c => c.health_score < 50);
    const atencao = clientes.filter(c => c.health_score >= 50 && c.health_score < 70);
    const saudaveis = clientes.filter(c => c.health_score >= 70);

    // NPS
    let npsScore = 0, promotores = 0, neutros = 0, detratores = 0;
    if (npsRes.data?.id) {
      const { data: votos } = await supabase.from('nps_votos').select('nota').eq('pesquisa_id', npsRes.data.id);
      const total = votos?.length ?? 0;
      if (total > 0) {
        const p = votos!.filter(v => v.nota >= 9).length;
        const n = votos!.filter(v => v.nota >= 7 && v.nota <= 8).length;
        const d = votos!.filter(v => v.nota <= 6).length;
        npsScore = Math.round(((p - d) / total) * 100);
        promotores = Math.round((p / total) * 100);
        neutros = Math.round((n / total) * 100);
        detratores = Math.round((d / total) * 100);
      }
    }

    // Alertas
    const alertas: DashData['alertas'] = [];
    if (emRisco.length > 0) alertas.push({ tipo: 'Churn', msg: `${emRisco.length} cliente(s) em risco crítico`, nivel: 'danger' });
    const vencHoje = pags.filter(p => p.status === 'atrasado');
    if (vencHoje.length > 0) alertas.push({ tipo: 'Financeiro', msg: `${vencHoje.length} pagamento(s) atrasado(s)`, nivel: 'danger' });
    if ((demRes.data?.length ?? 0) > 0) alertas.push({ tipo: 'Demandas', msg: `${demRes.data!.length} demanda(s) urgente(s)`, nivel: 'warning' });
    if (atencao.length > 0) alertas.push({ tipo: 'Health', msg: `${atencao.length} cliente(s) precisam de atenção`, nivel: 'warning' });

    // Setores
    const setMap: Record<string, number> = {};
    clientes.forEach(c => { const s = c.segmento ?? 'Outros'; setMap[s] = (setMap[s] ?? 0) + 1; });
    const setores = Object.entries(setMap).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([label, value]) => ({ label, value }));

    const finPago = pags.filter(p => p.status === 'pago').reduce((a, p) => a + p.valor, 0);
    const finPendente = pags.filter(p => p.status === 'pendente').reduce((a, p) => a + p.valor, 0);
    const finAtrasado = pags.filter(p => p.status === 'atrasado').reduce((a, p) => a + p.valor, 0);

    const renovacoes30d = clientes.filter(c => c.data_renovacao <= mes30()).length;

    setData({
      clientesAtivos: clientes.length,
      emRisco: emRisco.length,
      atencao: atencao.length,
      saudaveis: saudaveis.length,
      mrr: mrrAtual,
      mrrAnterior: (pagAntRes.data ?? []).reduce((a, p) => a + p.valor, 0),
      mrrHistorico: mrrHist,
      npsScore, promotores, neutros, detratores,
      piorCliente: emRisco.sort((a, b) => a.health_score - b.health_score)[0]?.nome_fantasia ?? '—',
      alertas,
      renovacoes30d,
      aguardandoAprovacao: prodRes.data?.length ?? 0,
      gravacoesAgendadas: gravRes.data?.length ?? 0,
      setores,
      finPago, finPendente, finAtrasado,
      finTotal: finPago + finPendente + finAtrasado,
    });
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading || !data) {
    return <View style={s.center}><ActivityIndicator color={COLORS.gold} size="large" /><Text style={s.loadingText}>Carregando dashboard...</Text></View>;
  }

  const mrrDelta = data.mrrAnterior > 0 ? Math.round(((data.mrr - data.mrrAnterior) / data.mrrAnterior) * 100) : 0;
  const totalNPS = data.promotores + data.neutros + data.detratores;

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={COLORS.gold} />}
    >
      {/* Header */}
      <View style={s.pageHeader}>
        <View>
          <Text style={s.pageTitle}>Dashboard</Text>
          <Text style={s.pageDate}>
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
          </Text>
        </View>
        <View style={s.mrrBadge}>
          <Text style={s.mrrBadgeLabel}>MRR</Text>
          <Text style={s.mrrBadgeVal}>{fmt(data.mrr)}</Text>
        </View>
      </View>

      {/* ── LINHA 1: layout assimétrico ─── */}
      <View style={[s.row, IS_WIDE && s.rowWide]}>

        {/* Col A — Receita com sparkline */}
        <View style={[s.colA, IS_WIDE && s.colAWide]}>
          <View style={s.receitaCard}>
            <View style={s.receitaTop}>
              <View>
                <Text style={s.receitaLabel}>Receita do mês</Text>
                <Text style={s.receitaVal}>{fmt(data.mrr)}</Text>
                <View style={s.receitaDelta}>
                  <Text style={[s.receitaDeltaText, { color: mrrDelta >= 0 ? COLORS.success : COLORS.danger }]}>
                    {mrrDelta >= 0 ? '▲' : '▼'} {Math.abs(mrrDelta)}% vs mês anterior
                  </Text>
                </View>
              </View>
              <Sparkline values={data.mrrHistorico} width={110} height={44} />
            </View>
            <View style={s.receitaStats}>
              <View style={s.receitaStat}>
                <Text style={[s.receitaStatVal, { color: COLORS.success }]}>{fmt(data.finPago)}</Text>
                <Text style={s.receitaStatLabel}>Recebido</Text>
              </View>
              <View style={s.receitaSep} />
              <View style={s.receitaStat}>
                <Text style={[s.receitaStatVal, { color: COLORS.warning }]}>{fmt(data.finPendente)}</Text>
                <Text style={s.receitaStatLabel}>Pendente</Text>
              </View>
              <View style={s.receitaSep} />
              <View style={s.receitaStat}>
                <Text style={[s.receitaStatVal, { color: COLORS.danger }]}>{fmt(data.finAtrasado)}</Text>
                <Text style={s.receitaStatLabel}>Atrasado</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Col B — 3 cards empilhados */}
        <View style={[s.colB, IS_WIDE && s.colBWide]}>
          {/* Clientes ativos + donut health */}
          <View style={s.miniCard}>
            <View style={{ flex: 1 }}>
              <Text style={s.miniCardLabel}>Clientes ativos</Text>
              <Text style={s.miniCardVal}>{data.clientesAtivos}</Text>
              <View style={s.healthDots}>
                <Text style={[s.dot, { color: COLORS.success }]}>● {data.saudaveis} saud.</Text>
                <Text style={[s.dot, { color: COLORS.warning }]}>● {data.atencao} atenção</Text>
                <Text style={[s.dot, { color: COLORS.danger }]}>● {data.emRisco} risco</Text>
              </View>
            </View>
            <MiniDonut
              pct={data.clientesAtivos > 0 ? Math.round((data.saudaveis / data.clientesAtivos) * 100) : 0}
              color={COLORS.success}
            />
          </View>

          {/* NPS mini */}
          <View style={s.miniCard}>
            <View style={{ flex: 1 }}>
              <Text style={s.miniCardLabel}>NPS do mês</Text>
              <Text style={[s.miniCardVal, { color: data.npsScore >= 50 ? COLORS.success : data.npsScore >= 0 ? COLORS.warning : COLORS.danger }]}>
                {data.npsScore}
              </Text>
              <View style={s.npsBar}>
                <View style={[s.npsSegment, { flex: data.promotores || 1, backgroundColor: COLORS.success }]} />
                <View style={[s.npsSegment, { flex: data.neutros || 0.5, backgroundColor: COLORS.warning }]} />
                <View style={[s.npsSegment, { flex: data.detratores || 0.5, backgroundColor: COLORS.danger }]} />
              </View>
              <Text style={s.npsLegend}>{data.promotores}% prom · {data.neutros}% neut · {data.detratores}% detr</Text>
            </View>
          </View>

          {/* Risco de churn */}
          <View style={[s.miniCard, { borderColor: data.emRisco > 0 ? COLORS.danger + '44' : COLORS.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={s.miniCardLabel}>Risco de churn</Text>
              <Text style={[s.miniCardVal, { color: data.emRisco > 0 ? COLORS.danger : COLORS.success }]}>
                {data.emRisco} cliente{data.emRisco !== 1 ? 's' : ''}
              </Text>
              {data.emRisco > 0 && <Text style={s.piorCliente} numberOfLines={1}>⚠ {data.piorCliente}</Text>}
            </View>
          </View>
        </View>

        {/* Col C — Alertas */}
        <View style={[s.colC, IS_WIDE && s.colCWide]}>
          <View style={s.alertasCard}>
            <View style={s.alertasHeader}>
              <Text style={s.alertasTitle}>Alertas críticos</Text>
              {data.alertas.length > 0 && (
                <View style={s.alertasBadge}><Text style={s.alertasBadgeText}>{data.alertas.length}</Text></View>
              )}
            </View>
            <ScrollView style={{ maxHeight: 200 }} showsVerticalScrollIndicator={false}>
              {data.alertas.length === 0 && (
                <Text style={s.alertaVazio}>✅ Nenhum alerta no momento</Text>
              )}
              {data.alertas.map((a, i) => (
                <View key={i} style={[s.alertaItem, { borderLeftColor: a.nivel === 'danger' ? COLORS.danger : a.nivel === 'warning' ? COLORS.warning : COLORS.info }]}>
                  <Text style={s.alertaTipo}>{a.tipo}</Text>
                  <Text style={s.alertaMsg}>{a.msg}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </View>

      {/* ── LINHA 2: gráficos Power BI ─── */}
      <View style={[s.row, IS_WIDE && s.rowWide]}>
        {/* Setores / segmentos */}
        <View style={[s.chartCard, IS_WIDE && { flex: 1.2 }]}>
          <Text style={s.chartTitle}>Clientes por segmento</Text>
          {data.setores.length > 0
            ? <HBarChart data={data.setores} />
            : <Text style={s.empty}>Sem dados de segmento</Text>}
        </View>

        {/* Financeiro rosca */}
        <View style={[s.chartCard, IS_WIDE && { flex: 0.9 }]}>
          <Text style={s.chartTitle}>Financeiro do mês</Text>
          <View style={s.rosca}>
            <MiniDonut
              pct={data.finTotal > 0 ? Math.round((data.finPago / data.finTotal) * 100) : 0}
              color={COLORS.gold}
              size={80}
            />
            <View style={s.roscaLegenda}>
              <LegendaItem cor={COLORS.success} label="Recebido" val={fmt(data.finPago)} />
              <LegendaItem cor={COLORS.warning} label="Pendente" val={fmt(data.finPendente)} />
              <LegendaItem cor={COLORS.danger} label="Atrasado" val={fmt(data.finAtrasado)} />
            </View>
          </View>
        </View>
      </View>

      {/* ── LINHA 3: KPIs rodapé ─── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={s.kpiRow}>
          <KpiCard emoji="🎥" label="Gravações no mês" val={String(data.gravacoesAgendadas)} />
          <KpiCard emoji="⏳" label="Aguard. aprovação" val={String(data.aguardandoAprovacao)} alert={data.aguardandoAprovacao > 3} />
          <KpiCard emoji="📅" label="Renov. 30 dias" val={String(data.renovacoes30d)} alert={data.renovacoes30d > 0} />
          <KpiCard emoji="🔥" label="Clientes em risco" val={String(data.emRisco)} alert={data.emRisco > 0} />
          <KpiCard emoji="⭐" label="NPS atual" val={String(data.npsScore)} />
        </View>
      </ScrollView>
    </ScrollView>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────
function LegendaItem({ cor, label, val }: { cor: string; label: string; val: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 3 }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: cor }} />
      <Text style={{ color: COLORS.text3, fontSize: 10, flex: 1 }}>{label}</Text>
      <Text style={{ color: COLORS.text, fontSize: 10 }}>{val}</Text>
    </View>
  );
}

function KpiCard({ emoji, label, val, alert }: { emoji: string; label: string; val: string; alert?: boolean }) {
  return (
    <View style={[s.kpiCard, alert && s.kpiCardAlert]}>
      <Text style={s.kpiEmoji}>{emoji}</Text>
      <Text style={[s.kpiVal, alert && { color: COLORS.warning }]}>{val}</Text>
      <Text style={s.kpiLabel}>{label}</Text>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.black },
  content: { padding: SPACING.lg, gap: SPACING.lg, paddingBottom: 48 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.black, gap: SPACING.md },
  loadingText: { color: COLORS.text3, fontSize: 13 },
  pageHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  pageTitle: { color: COLORS.text, fontSize: 22, ...FONT.bold },
  pageDate: { color: COLORS.text3, fontSize: 12, textTransform: 'capitalize', marginTop: 2 },
  mrrBadge: { backgroundColor: COLORS.surface2, borderRadius: RADIUS.md, padding: SPACING.sm, borderWidth: 1, borderColor: COLORS.border, alignItems: 'flex-end' },
  mrrBadgeLabel: { color: COLORS.text3, fontSize: 10 },
  mrrBadgeVal: { color: COLORS.gold, fontSize: 15, ...FONT.bold },

  // Layout rows
  row: { gap: SPACING.md },
  rowWide: { flexDirection: 'row', alignItems: 'flex-start' },
  colA: {}, colAWide: { flex: 2.2 },
  colB: { gap: SPACING.sm }, colBWide: { flex: 1.8 },
  colC: {}, colCWide: { flex: 1.4 },

  // Receita card
  receitaCard: { backgroundColor: COLORS.surface1, borderRadius: RADIUS.lg, padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.border, gap: SPACING.md },
  receitaTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  receitaLabel: { color: COLORS.text3, fontSize: 12 },
  receitaVal: { color: COLORS.gold, fontSize: 28, ...FONT.bold, marginTop: 2 },
  receitaDelta: { marginTop: 4 },
  receitaDeltaText: { fontSize: 12 },
  receitaStats: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  receitaStat: { flex: 1, alignItems: 'center', gap: 2 },
  receitaStatVal: { fontSize: 13, ...FONT.bold },
  receitaStatLabel: { color: COLORS.text3, fontSize: 10 },
  receitaSep: { width: 1, height: 28, backgroundColor: COLORS.borderWeak },

  // Mini cards
  miniCard: { backgroundColor: COLORS.surface1, borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border, flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, minHeight: 80 },
  miniCardLabel: { color: COLORS.text3, fontSize: 11 },
  miniCardVal: { color: COLORS.text, fontSize: 22, ...FONT.bold, marginTop: 2 },
  healthDots: { flexDirection: 'row', gap: SPACING.sm, flexWrap: 'wrap', marginTop: 4 },
  dot: { fontSize: 10 },
  npsBar: { flexDirection: 'row', height: 4, borderRadius: 2, overflow: 'hidden', marginTop: SPACING.sm, gap: 1 },
  npsSegment: { borderRadius: 2 },
  npsLegend: { color: COLORS.text3, fontSize: 9, marginTop: 4 },
  piorCliente: { color: COLORS.danger, fontSize: 11, marginTop: 2 },

  // Alertas
  alertasCard: { backgroundColor: COLORS.surface1, borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border, minHeight: 180 },
  alertasHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.md },
  alertasTitle: { color: COLORS.text, fontSize: 13, ...FONT.bold },
  alertasBadge: { backgroundColor: COLORS.danger, borderRadius: RADIUS.full, width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  alertasBadgeText: { color: '#fff', fontSize: 10, ...FONT.bold },
  alertaItem: { borderLeftWidth: 3, paddingLeft: SPACING.sm, marginBottom: SPACING.sm },
  alertaTipo: { color: COLORS.text2, fontSize: 10, ...FONT.bold, textTransform: 'uppercase' },
  alertaMsg: { color: COLORS.text3, fontSize: 11, marginTop: 1 },
  alertaVazio: { color: COLORS.success, fontSize: 12, textAlign: 'center', marginTop: SPACING.md },

  // Charts
  chartCard: { backgroundColor: COLORS.surface1, borderRadius: RADIUS.lg, padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.border },
  chartTitle: { color: COLORS.text, fontSize: 13, ...FONT.bold, marginBottom: SPACING.md },
  rosca: { flexDirection: 'row', alignItems: 'center', gap: SPACING.lg },
  roscaLegenda: { flex: 1 },
  empty: { color: COLORS.text3, fontSize: 12 },

  // KPI row
  kpiRow: { flexDirection: 'row', gap: SPACING.sm, paddingBottom: SPACING.xs },
  kpiCard: { backgroundColor: COLORS.surface1, borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', gap: 4, minWidth: 120 },
  kpiCardAlert: { borderColor: COLORS.warning + '66' },
  kpiEmoji: { fontSize: 20 },
  kpiVal: { color: COLORS.gold, fontSize: 20, ...FONT.bold },
  kpiLabel: { color: COLORS.text3, fontSize: 10, textAlign: 'center' },
});
