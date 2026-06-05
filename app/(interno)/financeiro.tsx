import React, { useState, useCallback, useEffect } from 'react';
import {
  ScrollView, View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, ViewStyle,
} from 'react-native';
import { Redirect } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { useAuthStore } from '../../src/stores/authStore';
import { COLORS, SPACING, FONT, RADIUS } from '../../src/constants/theme';

type PagStatus = 'pago' | 'pendente' | 'atrasado' | 'cancelado';
type TipoStatus = 'normal' | 'permuta' | 'isento' | 'cortesia';

interface Pagamento {
  id: string;
  cliente_id: string;
  valor: number;
  status: PagStatus;
  tipo_status: TipoStatus | null;
  data_vencimento: string;
  data_pagamento: string | null;
  competencia: string;
  clientes: { nome_fantasia: string; logo_url?: string | null } | null;
}

interface Resumo {
  total_recebido: number;
  total_aberto: number;
  total_atrasado: number;
  total_permuta: number;
  total_isento: number;
  total_geral: number;
  clientes_inadimplentes: number;
}

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

const STATUS_CONFIG = {
  pago:     { label: 'Recebido',  color: COLORS.success, bg: 'rgba(39,174,96,0.12)'    },
  pendente: { label: 'Em aberto', color: COLORS.gold,    bg: 'rgba(201,168,76,0.12)'   },
  atrasado: { label: 'Atrasado',  color: COLORS.danger,  bg: 'rgba(192,57,43,0.12)'    },
  permuta:  { label: 'Permuta',   color: COLORS.info,    bg: 'rgba(41,128,185,0.12)'   },
  isento:   { label: 'Isento',    color: '#888',         bg: 'rgba(136,136,136,0.12)'  },
} as const;

type Aba = 'Todos' | 'Recebido' | 'Em aberto' | 'Atrasado' | 'Permuta' | 'Isento';
const ABAS: Aba[] = ['Todos', 'Recebido', 'Em aberto', 'Atrasado', 'Permuta', 'Isento'];

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

export default function FinanceiroScreen() {
  const { profile } = useAuthStore();
  if (profile && !['admin', 'financeiro', 'gerencia'].includes(profile.role)) {
    return <Redirect href="/(interno)/dashboard" />;
  }

  const now = new Date();
  const [mesSel, setMesSel] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [loading, setLoading] = useState(true);
  const [abaAtiva, setAbaAtiva] = useState<Aba>('Todos');

  const load = useCallback(async () => {
    setLoading(true);
    const [pagRes, resRes] = await Promise.all([
      supabase.from('pagamentos').select('*, clientes(nome_fantasia, logo_url)').eq('competencia', mesSel).order('data_vencimento'),
      supabase.from('financeiro_resumo').select('*').eq('competencia', mesSel).maybeSingle(),
    ]);
    setPagamentos((pagRes.data ?? []) as unknown as Pagamento[]);
    setResumo(resRes.data as unknown as Resumo ?? null);
    setLoading(false);
  }, [mesSel]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (id: string, status: PagStatus, tipoStatus?: TipoStatus) => {
    await supabase.from('pagamentos').update({
      status,
      data_pagamento: status === 'pago' ? new Date().toISOString().slice(0, 10) : null,
      ...(tipoStatus ? { tipo_status: tipoStatus } : {}),
    } as { status: PagStatus; data_pagamento: string | null; tipo_status?: TipoStatus }).eq('id', id);
    load();
  };

  const filtrados = pagamentos.filter(p => {
    if (abaAtiva === 'Todos') return true;
    if (abaAtiva === 'Recebido') return p.status === 'pago' && (!p.tipo_status || p.tipo_status === 'normal');
    if (abaAtiva === 'Em aberto') return p.status === 'pendente';
    if (abaAtiva === 'Atrasado') return p.status === 'atrasado';
    if (abaAtiva === 'Permuta') return p.tipo_status === 'permuta';
    if (abaAtiva === 'Isento') return p.tipo_status === 'isento';
    return true;
  });

  const contadores: Record<Aba, number> = {
    Todos: pagamentos.length,
    Recebido: pagamentos.filter(p => p.status === 'pago' && (!p.tipo_status || p.tipo_status === 'normal')).length,
    'Em aberto': pagamentos.filter(p => p.status === 'pendente').length,
    Atrasado: pagamentos.filter(p => p.status === 'atrasado').length,
    Permuta: pagamentos.filter(p => p.tipo_status === 'permuta').length,
    Isento: pagamentos.filter(p => p.tipo_status === 'isento').length,
  };

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={COLORS.gold} />}>

      <Text style={s.title}>Financeiro</Text>

      {/* Seletor de mês */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={s.mesRow}>
          {Array.from({ length: 12 }, (_, i) => {
            const d = new Date(now.getFullYear(), i, 1);
            const val = `${d.getFullYear()}-${String(i + 1).padStart(2, '0')}`;
            const ativo = mesSel === val;
            return (
              <TouchableOpacity key={val} style={[s.mesBtn, ativo && s.mesBtnActive]} onPress={() => setMesSel(val)}>
                <Text style={[s.mesText, ativo && s.mesTextActive]}>{MESES[i]}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Somatória */}
      {resumo && (
        <View style={s.somatoriaCard}>
          <Text style={s.somatoriaTitle}>Somatória — {mesSel}</Text>
          <View style={s.somatoriaGrid}>
            <SomItem label="MRR Potencial" val={fmt(resumo.total_geral)} color={COLORS.text} bold />
            <SomItem label="Recebido" val={fmt(resumo.total_recebido)} color={COLORS.success} />
            <SomItem label="Em aberto" val={fmt(resumo.total_aberto)} color={COLORS.gold} />
            <SomItem label="Atrasado" val={fmt(resumo.total_atrasado)} color={COLORS.danger} />
            <SomItem label="Permuta" val={fmt(resumo.total_permuta)} color={COLORS.info} />
            <SomItem label="Isento" val={fmt(resumo.total_isento)} color="#888" />
          </View>
        </View>
      )}

      {/* Abas */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={s.abasRow}>
          {ABAS.map(a => (
            <TouchableOpacity key={a} style={[s.aba, abaAtiva === a && s.abaActive]} onPress={() => setAbaAtiva(a)}>
              <Text style={[s.abaText, abaAtiva === a && s.abaTextActive]}>{a}</Text>
              {contadores[a] > 0 && (
                <View style={[s.abaBadge, abaAtiva === a && s.abaBadgeActive]}>
                  <Text style={s.abaBadgeText}>{contadores[a]}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {loading && <ActivityIndicator color={COLORS.gold} />}

      {!loading && filtrados.length === 0 && (
        <View style={s.emptyBox}>
          <Text style={s.emptyText}>Nenhum pagamento nesta categoria.</Text>
        </View>
      )}

      {filtrados.map(p => (
        <PagCard key={p.id} pag={p} onUpdate={updateStatus} />
      ))}
    </ScrollView>
  );
}

function SomItem({ label, val, color, bold }: { label: string; val: string; color: string; bold?: boolean }) {
  return (
    <View style={s.somItem}>
      <Text style={s.somLabel}>{label}</Text>
      <Text style={[s.somVal, { color }, bold ? FONT.bold : FONT.medium]}>{val}</Text>
    </View>
  );
}

function PagCard({ pag, onUpdate }: {
  pag: Pagamento;
  onUpdate: (id: string, status: PagStatus, tipo?: TipoStatus) => void;
}) {
  const tipoAtivo = pag.tipo_status && pag.tipo_status !== 'normal' ? pag.tipo_status : pag.status;

  const BOTOES = [
    { id: 'pago',     label: 'Recebido', cfg: STATUS_CONFIG.pago,     fn: () => onUpdate(pag.id, 'pago', 'normal') },
    { id: 'pendente', label: 'Em aberto', cfg: STATUS_CONFIG.pendente, fn: () => onUpdate(pag.id, 'pendente') },
    { id: 'atrasado', label: 'Atrasado',  cfg: STATUS_CONFIG.atrasado, fn: () => onUpdate(pag.id, 'atrasado') },
    { id: 'permuta',  label: 'Permuta',   cfg: STATUS_CONFIG.permuta,  fn: () => onUpdate(pag.id, 'pago', 'permuta') },
    { id: 'isento',   label: 'Isento',    cfg: STATUS_CONFIG.isento,   fn: () => onUpdate(pag.id, 'pago', 'isento') },
  ];

  const statusLabel = (pag.tipo_status && pag.tipo_status !== 'normal')
    ? STATUS_CONFIG[pag.tipo_status as keyof typeof STATUS_CONFIG]?.label ?? pag.tipo_status
    : STATUS_CONFIG[pag.status as keyof typeof STATUS_CONFIG]?.label ?? pag.status;

  const statusColor = (pag.tipo_status && pag.tipo_status !== 'normal')
    ? STATUS_CONFIG[pag.tipo_status as keyof typeof STATUS_CONFIG]?.color ?? COLORS.text
    : STATUS_CONFIG[pag.status as keyof typeof STATUS_CONFIG]?.color ?? COLORS.text;

  return (
    <View style={s.pagCard}>
      <View style={s.pagHeader}>
        <View style={s.pagAvatar}>
          <Text style={s.pagAvatarText}>{pag.clientes?.nome_fantasia?.charAt(0) ?? '?'}</Text>
        </View>
        <View style={s.pagInfo}>
          <Text style={s.pagNome}>{pag.clientes?.nome_fantasia ?? '—'}</Text>
          <Text style={s.pagVenc}>Venc: {new Date(pag.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</Text>
        </View>
        <View style={s.pagValorBox}>
          <Text style={s.pagValor}>{pag.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</Text>
          <Text style={[s.pagStatus, { color: statusColor }]}>{statusLabel}</Text>
        </View>
      </View>
      {/* Grid de status — 1 toque para mudar */}
      <View style={s.statusGrid}>
        {BOTOES.map(b => {
          const isActive = b.id === tipoAtivo;
          return (
            <TouchableOpacity key={b.id}
              style={[s.statusBtn, isActive && { backgroundColor: b.cfg.bg, borderColor: b.cfg.color } as ViewStyle]}
              onPress={b.fn}>
              <Text style={[s.statusBtnText, isActive && { color: b.cfg.color }]}>{b.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.black },
  content: { padding: SPACING.lg, gap: SPACING.md, paddingBottom: 48 },
  title: { color: COLORS.text, fontSize: 22, ...FONT.bold },
  mesRow: { flexDirection: 'row', gap: SPACING.sm, paddingVertical: SPACING.xs },
  mesBtn: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.border },
  mesBtnActive: { borderColor: COLORS.gold, backgroundColor: 'rgba(201,168,76,0.15)' },
  mesText: { color: COLORS.text3, fontSize: 12 },
  mesTextActive: { color: COLORS.gold, ...FONT.medium },
  somatoriaCard: { backgroundColor: COLORS.surface1, borderRadius: RADIUS.lg, padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.border },
  somatoriaTitle: { color: COLORS.text2, fontSize: 12, ...FONT.medium, marginBottom: SPACING.md },
  somatoriaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  somItem: { minWidth: 130, gap: 2 },
  somLabel: { color: COLORS.text3, fontSize: 11 },
  somVal: { fontSize: 14 },
  abasRow: { flexDirection: 'row', gap: SPACING.xs },
  aba: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.border, flexDirection: 'row', alignItems: 'center', gap: 4 },
  abaActive: { borderColor: COLORS.gold, backgroundColor: 'rgba(201,168,76,0.12)' },
  abaText: { color: COLORS.text3, fontSize: 12 },
  abaTextActive: { color: COLORS.gold, ...FONT.medium },
  abaBadge: { backgroundColor: COLORS.surface3, borderRadius: RADIUS.full, paddingHorizontal: 5, paddingVertical: 1 },
  abaBadgeActive: { backgroundColor: 'rgba(201,168,76,0.2)' },
  abaBadgeText: { color: COLORS.text3, fontSize: 9 },
  pagCard: { backgroundColor: COLORS.surface1, borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border, gap: SPACING.md },
  pagHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  pagAvatar: { width: 38, height: 38, borderRadius: RADIUS.md, backgroundColor: COLORS.surface3, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
  pagAvatarText: { color: COLORS.gold, fontSize: 15, ...FONT.bold },
  pagInfo: { flex: 1 },
  pagNome: { color: COLORS.text, fontSize: 13, ...FONT.bold },
  pagVenc: { color: COLORS.text3, fontSize: 11, marginTop: 1 },
  pagValorBox: { alignItems: 'flex-end' },
  pagValor: { color: COLORS.gold, fontSize: 14, ...FONT.bold },
  pagStatus: { fontSize: 11 },
  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  statusBtn: { paddingHorizontal: SPACING.sm, paddingVertical: 5, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.border },
  statusBtnText: { color: COLORS.text3, fontSize: 11 },
  emptyBox: { padding: SPACING.xl, alignItems: 'center' },
  emptyText: { color: COLORS.text3, fontSize: 13 },
});
