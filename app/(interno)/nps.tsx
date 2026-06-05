import React, { useState, useEffect, useCallback } from 'react';
import {
  ScrollView, View, Text, StyleSheet, ActivityIndicator,
  RefreshControl, TouchableOpacity,
} from 'react-native';
import { COLORS, SPACING, FONT, RADIUS } from '../../src/constants/theme';
import { supabase } from '../../src/lib/supabase';
import { Card } from '../../src/components/ui/Card';
import { Badge } from '../../src/components/ui/Badge';

interface VotoComInfo {
  nota: number;
  comentario: string | null;
  cliente_id: string | null;
  funcionario_id: string | null;
  clientes: { nome_fantasia: string } | null;
  profiles: { nome: string } | null;
}

interface NPSData {
  score: number;
  promotores: number;
  neutros: number;
  detratores: number;
  pctPromo: number;
  pctNeutro: number;
  pctDetrat: number;
  total: number;
  votos: VotoComInfo[];
  pesquisaId: string | null;
}

// NPS = (promotores - detratores) / total × 100
const calcNPS = (votos: { nota: number }[]) => {
  if (!votos.length) return 0;
  const p = votos.filter(v => v.nota >= 9).length;
  const d = votos.filter(v => v.nota <= 6).length;
  return Math.round(((p - d) / votos.length) * 100);
};

const npsColor = (score: number) =>
  score >= 75 ? COLORS.success : score >= 50 ? COLORS.gold : score >= 0 ? COLORS.warning : COLORS.danger;

const notaColor = (nota: number) =>
  nota >= 9 ? COLORS.success : nota >= 7 ? COLORS.warning : COLORS.danger;

const notaLabel = (nota: number) =>
  nota >= 9 ? 'Promotor' : nota >= 7 ? 'Neutro' : 'Detrator';

export default function NPSInternoScreen() {
  const [data, setData] = useState<NPSData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<'todos' | 'promotores' | 'neutros' | 'detratores'>('todos');

  const load = useCallback(async () => {
    setLoading(true);

    // Busca pesquisa ativa
    const { data: pesquisa } = await supabase
      .from('nps_pesquisas')
      .select('id')
      .eq('ativo', true)
      .maybeSingle();

    if (!pesquisa) {
      setData({ score: 0, promotores: 0, neutros: 0, detratores: 0, pctPromo: 0, pctNeutro: 0, pctDetrat: 0, total: 0, votos: [], pesquisaId: null });
      setLoading(false);
      return;
    }

    const { data: votos } = await supabase
      .from('nps_votos')
      .select('nota, comentario, cliente_id, funcionario_id, clientes(nome_fantasia), profiles!funcionario_id(nome)')
      .eq('pesquisa_id', pesquisa.id)
      .order('created_at', { ascending: false });

    const v = (votos ?? []) as unknown as VotoComInfo[];
    const total = v.length;
    const promotores = v.filter(x => x.nota >= 9).length;
    const neutros = v.filter(x => x.nota >= 7 && x.nota <= 8).length;
    const detratores = v.filter(x => x.nota <= 6).length;

    setData({
      score: calcNPS(v),
      promotores, neutros, detratores,
      pctPromo: total ? Math.round((promotores / total) * 100) : 0,
      pctNeutro: total ? Math.round((neutros / total) * 100) : 0,
      pctDetrat: total ? Math.round((detratores / total) * 100) : 0,
      total,
      votos: v,
      pesquisaId: pesquisa.id,
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    // Realtime — atualiza ao vivo
    const channel = supabase
      .channel('nps-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'nps_votos' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]);

  const votosFiltrados = data?.votos.filter(v => {
    if (filtro === 'promotores') return v.nota >= 9;
    if (filtro === 'neutros') return v.nota >= 7 && v.nota <= 8;
    if (filtro === 'detratores') return v.nota <= 6;
    return true;
  }) ?? [];

  const criarPesquisa = async () => {
    const mes = new Date().toISOString().slice(0, 7);
    await supabase.from('nps_pesquisas').update({ ativo: false }).neq('mes', mes);
    await supabase.from('nps_pesquisas').upsert({ mes, ativo: true }, { onConflict: 'mes' });
    load();
  };

  if (loading) return <View style={s.center}><ActivityIndicator color={COLORS.gold} /></View>;

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={COLORS.gold} />}>

      <Text style={s.title}>NPS</Text>

      {!data?.pesquisaId ? (
        <Card>
          <Text style={s.semPesq}>Nenhuma pesquisa NPS ativa.</Text>
          <TouchableOpacity style={s.criarBtn} onPress={criarPesquisa}>
            <Text style={s.criarBtnText}>+ Criar pesquisa para este mês</Text>
          </TouchableOpacity>
        </Card>
      ) : (
        <>
          {/* Score principal */}
          <View style={s.scoreCard}>
            <View style={s.scoreCircle}>
              <Text style={[s.scoreNum, { color: npsColor(data!.score) }]}>{data!.score}</Text>
              <Text style={s.scoreLabel}>NPS</Text>
            </View>
            <View style={s.scoreInfo}>
              <Text style={s.scoreTotal}>{data!.total} voto{data!.total !== 1 ? 's' : ''}</Text>
              <View style={s.barra}>
                <View style={[s.barSeg, { flex: data!.pctPromo || 1, backgroundColor: COLORS.success }]} />
                <View style={[s.barSeg, { flex: data!.pctNeutro || 0.5, backgroundColor: COLORS.warning }]} />
                <View style={[s.barSeg, { flex: data!.pctDetrat || 0.5, backgroundColor: COLORS.danger }]} />
              </View>
              <View style={s.legendRow}>
                <LegItem cor={COLORS.success} label="Promotores" pct={data!.pctPromo} count={data!.promotores} />
                <LegItem cor={COLORS.warning} label="Neutros" pct={data!.pctNeutro} count={data!.neutros} />
                <LegItem cor={COLORS.danger} label="Detratores" pct={data!.pctDetrat} count={data!.detratores} />
              </View>
              <Text style={s.formula}>
                Fórmula: ({data!.promotores} prom − {data!.detratores} detr) ÷ {data!.total} × 100 = {data!.score}
              </Text>
            </View>
          </View>

          {/* Filtros */}
          <View style={s.filtros}>
            {([
              { k: 'todos', l: 'Todos' },
              { k: 'promotores', l: `Promotores (${data!.promotores})` },
              { k: 'neutros', l: `Neutros (${data!.neutros})` },
              { k: 'detratores', l: `Detratores (${data!.detratores})` },
            ] as const).map(f => (
              <TouchableOpacity key={f.k} style={[s.filtroBtn, filtro === f.k && s.filtroBtnActive]} onPress={() => setFiltro(f.k)}>
                <Text style={[s.filtroText, filtro === f.k && s.filtroTextActive]}>{f.l}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Lista de votos */}
          {votosFiltrados.length === 0 && (
            <Card><Text style={s.empty}>Nenhum voto nesta categoria.</Text></Card>
          )}
          {votosFiltrados.map((v, i) => (
            <View key={i} style={s.votoCard}>
              <View style={s.votoHeader}>
                <View style={[s.notaBadge, { backgroundColor: notaColor(v.nota) + '22', borderColor: notaColor(v.nota) }]}>
                  <Text style={[s.notaNum, { color: notaColor(v.nota) }]}>{v.nota}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.votoCliente}>{v.clientes?.nome_fantasia ?? 'Cliente'}</Text>
                  <Text style={[s.votoTipo, { color: notaColor(v.nota) }]}>{notaLabel(v.nota)}</Text>
                </View>
                {v.profiles?.nome && <Text style={s.votoFunc}>👤 {v.profiles.nome}</Text>}
              </View>
              {v.comentario && <Text style={s.votoComentario}>"{v.comentario}"</Text>}
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

function LegItem({ cor, label, pct, count }: { cor: string; label: string; pct: number; count: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: cor }} />
      <Text style={{ color: COLORS.text3, fontSize: 10 }}>{label} {pct}% ({count})</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.black },
  content: { padding: SPACING.lg, gap: SPACING.md, paddingBottom: 48 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.black },
  title: { color: COLORS.text, fontSize: 22, ...FONT.bold },
  scoreCard: { backgroundColor: COLORS.surface1, borderRadius: RADIUS.lg, padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.border, flexDirection: 'row', gap: SPACING.lg, alignItems: 'flex-start' },
  scoreCircle: { width: 80, height: 80, borderRadius: RADIUS.full, borderWidth: 3, borderColor: COLORS.gold, alignItems: 'center', justifyContent: 'center' },
  scoreNum: { fontSize: 26, ...FONT.bold },
  scoreLabel: { color: COLORS.text3, fontSize: 10 },
  scoreInfo: { flex: 1, gap: SPACING.sm },
  scoreTotal: { color: COLORS.text2, fontSize: 12 },
  barra: { flexDirection: 'row', height: 6, borderRadius: 3, overflow: 'hidden', gap: 1 },
  barSeg: { borderRadius: 3 },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  formula: { color: COLORS.text3, fontSize: 10, fontStyle: 'italic', marginTop: SPACING.xs },
  filtros: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  filtroBtn: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.border },
  filtroBtnActive: { borderColor: COLORS.gold, backgroundColor: 'rgba(201,168,76,0.12)' },
  filtroText: { color: COLORS.text3, fontSize: 12 },
  filtroTextActive: { color: COLORS.gold, ...FONT.medium },
  votoCard: { backgroundColor: COLORS.surface1, borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border, gap: SPACING.sm },
  votoHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  notaBadge: { width: 38, height: 38, borderRadius: RADIUS.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  notaNum: { fontSize: 16, ...FONT.bold },
  votoCliente: { color: COLORS.text, fontSize: 13, ...FONT.medium },
  votoTipo: { fontSize: 11 },
  votoFunc: { color: COLORS.text3, fontSize: 11 },
  votoComentario: { color: COLORS.text2, fontSize: 12, fontStyle: 'italic', paddingLeft: SPACING.sm, borderLeftWidth: 2, borderLeftColor: COLORS.border },
  semPesq: { color: COLORS.text2, textAlign: 'center', marginBottom: SPACING.md },
  criarBtn: { backgroundColor: 'rgba(201,168,76,0.12)', borderRadius: RADIUS.md, padding: SPACING.md, alignItems: 'center', borderWidth: 1, borderColor: COLORS.gold },
  criarBtnText: { color: COLORS.gold, ...FONT.medium },
  empty: { color: COLORS.text2, textAlign: 'center' },
});
