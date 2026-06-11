import React, { useState, useCallback, useEffect } from 'react';
import {
  ScrollView, View, Text, TextInput, TouchableOpacity,
  StyleSheet, Modal, ActivityIndicator, RefreshControl,
} from 'react-native';
import { COLORS, SPACING, FONT, RADIUS } from '../../src/constants/theme';
import { supabase } from '../../src/lib/supabase';
import { useAuthStore } from '../../src/stores/authStore';
import { DateTimePicker } from '../../src/components/ui/DateTimePicker';
import { GoldButton } from '../../src/components/ui/GoldButton';
import { Database } from '../../src/types/database';

type Slot = Database['public']['Tables']['agenda_otimizacao']['Row'] & {
  clientes: { nome_fantasia: string } | null;
  profiles: { nome: string } | null;
};
type Cliente = { id: string; nome_fantasia: string };

// Cores por cliente (consistente por nome)
const PALETTE = ['#C9A84C', '#3b82f6', '#8b5cf6', '#22c55e', '#f97316', '#ef4444', '#06b6d4', '#ec4899'];
function clientColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return PALETTE[Math.abs(h) % PALETTE.length];
}

function toDateStr(d: Date) { return d.toISOString().slice(0, 10); }

function getWeekStart(from: Date): Date {
  const d = new Date(from);
  const dow = d.getDay();
  d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekDays(monday: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return d;
  });
}

const DIAS_PT = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

export default function AgendaInternoScreen() {
  const { profile } = useAuthStore();
  const isCliente = profile?.role === 'cliente';

  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [selectedDay, setSelectedDay] = useState(toDateStr(new Date()));
  const [slots, setSlots] = useState<Slot[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [addModal, setAddModal] = useState(false);
  const [form, setForm] = useState({ clienteId: '', data: '', hora: '09:00', descricao: '', plataformas: 'Meta Ads' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59);

    let q = supabase
      .from('agenda_otimizacao')
      .select('*, clientes(nome_fantasia), profiles!funcionario_id(nome)')
      .gte('data_hora', weekStart.toISOString())
      .lte('data_hora', weekEnd.toISOString())
      .order('data_hora');

    if (isCliente && profile?.id) {
      const { data: cu } = await supabase
        .from('cliente_usuarios').select('cliente_id').eq('profile_id', profile.id).maybeSingle();
      if (cu) q = (q as any).eq('cliente_id', cu.cliente_id);
    }

    const { data } = await q;
    setSlots((data ?? []) as unknown as Slot[]);

    if (!isCliente) {
      const { data: cd } = await supabase.from('clientes').select('id, nome_fantasia').eq('status', 'ativo').order('nome_fantasia');
      setClientes(cd ?? []);
    }
    setLoading(false);
  }, [weekStart, profile]);

  useEffect(() => { load(); }, [load]);

  const prevWeek = () => { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d); };
  const nextWeek = () => { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d); };

  const weekDays = getWeekDays(weekStart);
  const weekEnd = weekDays[6];

  const selectedSlots = slots
    .filter(s => s.data_hora.startsWith(selectedDay))
    .sort((a, b) => a.data_hora.localeCompare(b.data_hora));

  const concluir = async (id: string) => {
    await supabase.from('agenda_otimizacao').update({ status: 'concluido' }).eq('id', id);
    await load();
  };

  const addSlot = async () => {
    if (!form.clienteId || !form.data || !form.descricao || !profile) return;
    setSaving(true);
    try {
      await supabase.from('agenda_otimizacao').insert({
        cliente_id: form.clienteId,
        funcionario_id: profile.id,
        data_hora: `${form.data}T${form.hora}:00`,
        descricao: form.descricao,
        plataformas: form.plataformas.split(',').map(p => p.trim()).filter(Boolean),
        status: 'agendado',
      });
      const { data: cu } = await supabase.from('cliente_usuarios').select('profile_id').eq('cliente_id', form.clienteId);
      for (const u of cu ?? []) {
        await supabase.from('notificacoes').insert({
          profile_id: u.profile_id,
          tipo: 'campanha_alerta',
          titulo: 'Nova otimização agendada',
          mensagem: `${form.descricao} — ${form.data} às ${form.hora}`,
        });
      }
      setAddModal(false);
      setForm({ clienteId: '', data: '', hora: '09:00', descricao: '', plataformas: 'Meta Ads' });
      setSelectedDay(form.data);
      await load();
    } finally { setSaving(false); }
  };

  const fmtWeek = `${weekStart.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} – ${weekEnd.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}`;

  return (
    <>
      <ScrollView
        style={s.container}
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={COLORS.gold} />}
      >
        {/* Navegação de semana */}
        <View style={s.weekNav}>
          <TouchableOpacity style={s.navBtn} onPress={prevWeek}>
            <Text style={s.navArrow}>‹</Text>
          </TouchableOpacity>
          <Text style={s.weekLabel}>{fmtWeek}</Text>
          <TouchableOpacity style={s.navBtn} onPress={nextWeek}>
            <Text style={s.navArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Faixa de dias — estilo Google Calendar */}
        <View style={s.dayStrip}>
          {weekDays.map((day, idx) => {
            const dateStr = toDateStr(day);
            const isSelected = selectedDay === dateStr;
            const isToday = toDateStr(new Date()) === dateStr;
            const daySlots = slots.filter(sl => sl.data_hora.startsWith(dateStr));
            const colors = [...new Set(daySlots.map(sl => clientColor(sl.clientes?.nome_fantasia ?? '')))].slice(0, 3);

            return (
              <TouchableOpacity
                key={dateStr}
                style={[s.dayCol, isSelected && s.dayColActive]}
                onPress={() => setSelectedDay(dateStr)}
                activeOpacity={0.8}
              >
                <Text style={[s.dayName, isSelected && s.dayNameActive, isToday && !isSelected && s.dayNameToday]}>
                  {DIAS_PT[idx]}
                </Text>
                <View style={[s.dayNumCircle, isSelected && s.dayNumCircleActive, isToday && !isSelected && s.dayNumCircleToday]}>
                  <Text style={[s.dayNum, isSelected && s.dayNumActive, isToday && !isSelected && s.dayNumToday]}>
                    {day.getDate()}
                  </Text>
                </View>
                <View style={s.dotRow}>
                  {colors.map((c, i) => (
                    <View key={i} style={[s.dot, { backgroundColor: isSelected ? 'rgba(255,255,255,0.6)' : c }]} />
                  ))}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Cabeçalho do dia selecionado */}
        <View style={s.dayHeader}>
          <Text style={s.dayTitle} numberOfLines={1}>
            {new Date(selectedDay + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
          </Text>
          {!isCliente && (
            <TouchableOpacity
              style={s.addBtn}
              onPress={() => { setForm(f => ({ ...f, data: selectedDay })); setAddModal(true); }}
            >
              <Text style={s.addText}>+ Slot</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Timeline do dia */}
        {loading ? (
          <ActivityIndicator color={COLORS.gold} style={{ marginTop: 24 }} />
        ) : selectedSlots.length === 0 ? (
          <View style={s.emptyDay}>
            <Text style={s.emptyIcon}>📅</Text>
            <Text style={s.emptyText}>Nenhum slot neste dia</Text>
            {!isCliente && <Text style={s.emptyHint}>Toque em "＋ Slot" para agendar</Text>}
          </View>
        ) : (
          <View style={s.timeline}>
            {selectedSlots.map((slot, idx) => {
              const color = clientColor(slot.clientes?.nome_fantasia ?? '');
              const done = slot.status === 'concluido';
              const hora = slot.data_hora.slice(11, 16);
              const isLast = idx === selectedSlots.length - 1;

              return (
                <View key={slot.id} style={s.timelineRow}>
                  {/* Coluna de hora */}
                  <View style={s.timeCol}>
                    <Text style={s.timeText}>{hora}</Text>
                    {!isLast && <View style={s.timeLine} />}
                  </View>

                  {/* Card do evento */}
                  <View style={[s.eventCard, { borderLeftColor: color }, done && s.eventCardDone]}>
                    <View style={s.eventTop}>
                      <View style={[s.colorBar, { backgroundColor: color }]} />
                      <View style={s.eventBody}>
                        <Text style={[s.eventCliente, { color }]}>{slot.clientes?.nome_fantasia ?? '—'}</Text>
                        <Text style={s.eventDesc}>{slot.descricao}</Text>
                      </View>
                      {done && <Text style={s.doneMark}>✓</Text>}
                    </View>

                    <View style={s.eventFooter}>
                      {slot.plataformas?.length > 0 && (
                        <Text style={s.eventPlat}>{slot.plataformas.join(' · ')}</Text>
                      )}
                      {slot.profiles?.nome && (
                        <Text style={s.eventResp}>👤 {slot.profiles.nome}</Text>
                      )}
                    </View>

                    {!done && !isCliente && (
                      <TouchableOpacity style={s.concluirBtn} onPress={() => concluir(slot.id)}>
                        <Text style={s.concluirText}>Marcar concluído</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Modal: novo slot */}
      <Modal visible={addModal} transparent animationType="slide" onRequestClose={() => setAddModal(false)}>
        <View style={s.overlay}>
          <ScrollView
            style={s.sheet}
            contentContainerStyle={{ gap: SPACING.md, padding: SPACING.xl, paddingBottom: 48 }}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={s.modalTitle}>Novo slot de otimização</Text>

            <Text style={s.inputLabel}>Cliente *</Text>
            <ScrollView style={s.clientePicker} nestedScrollEnabled>
              {clientes.map(c => {
                const cor = clientColor(c.nome_fantasia);
                return (
                  <TouchableOpacity
                    key={c.id}
                    style={[s.clienteOpt, form.clienteId === c.id && s.clienteOptActive]}
                    onPress={() => setForm(f => ({ ...f, clienteId: c.id }))}
                  >
                    <View style={[s.clienteDot, { backgroundColor: cor }]} />
                    <Text style={[s.clienteOptText, form.clienteId === c.id && { color: cor, ...FONT.medium }]}>
                      {c.nome_fantasia}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <DateTimePicker
              label="Data e Hora *"
              date={form.data}
              time={form.hora}
              onDateChange={v => setForm(f => ({ ...f, data: v }))}
              onTimeChange={v => setForm(f => ({ ...f, hora: v }))}
            />

            <Text style={s.inputLabel}>Descrição *</Text>
            <TextInput
              style={[s.textInput, { minHeight: 60 }]}
              value={form.descricao}
              onChangeText={v => setForm(f => ({ ...f, descricao: v }))}
              placeholder="Ex: Otimização de segmentação Meta Ads"
              placeholderTextColor={COLORS.text3}
              multiline
              textAlignVertical="top"
            />

            <Text style={s.inputLabel}>Plataformas (vírgula)</Text>
            <TextInput
              style={s.textInput}
              value={form.plataformas}
              onChangeText={v => setForm(f => ({ ...f, plataformas: v }))}
              placeholder="Meta Ads, Google Ads"
              placeholderTextColor={COLORS.text3}
            />

            <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
              <GoldButton label="Cancelar" onPress={() => setAddModal(false)} variant="ghost" style={{ flex: 1 }} />
              <GoldButton label="Agendar" onPress={addSlot} loading={saving} style={{ flex: 1 }}
                disabled={!form.clienteId || !form.data || !form.descricao} />
            </View>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.black },
  content: { paddingBottom: 48 },

  // Navegação semana
  weekNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md },
  navBtn: { padding: SPACING.sm },
  navArrow: { color: COLORS.gold, fontSize: 28, ...FONT.bold },
  weekLabel: { color: COLORS.text, fontSize: 14, ...FONT.medium },

  // Faixa de dias
  dayStrip: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.borderWeak, paddingBottom: SPACING.sm },
  dayCol: { flex: 1, alignItems: 'center', paddingVertical: SPACING.xs, borderRadius: RADIUS.md },
  dayColActive: { backgroundColor: COLORS.gold },
  dayName: { color: COLORS.text3, fontSize: 10, ...FONT.medium, marginBottom: 2 },
  dayNameActive: { color: COLORS.black },
  dayNameToday: { color: COLORS.gold },
  dayNumCircle: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  dayNumCircleActive: {},
  dayNumCircleToday: { backgroundColor: 'rgba(201,168,76,0.18)' },
  dayNum: { color: COLORS.text, fontSize: 13, ...FONT.bold },
  dayNumActive: { color: COLORS.black },
  dayNumToday: { color: COLORS.gold },
  dotRow: { flexDirection: 'row', gap: 2, marginTop: 3, height: 6, alignItems: 'center' },
  dot: { width: 5, height: 5, borderRadius: 3 },

  // Cabeçalho dia selecionado
  dayHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.sm },
  dayTitle: { flex: 1, color: COLORS.text, fontSize: 15, ...FONT.bold, textTransform: 'capitalize' },
  addBtn: { backgroundColor: COLORS.gold, paddingHorizontal: SPACING.md, paddingVertical: 6, borderRadius: RADIUS.md },
  addText: { color: COLORS.black, fontSize: 12, ...FONT.bold },

  // Vazio
  emptyDay: { alignItems: 'center', paddingVertical: 48, gap: SPACING.sm },
  emptyIcon: { fontSize: 36 },
  emptyText: { color: COLORS.text2, fontSize: 14 },
  emptyHint: { color: COLORS.text3, fontSize: 12 },

  // Timeline
  timeline: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm, gap: 0 },
  timelineRow: { flexDirection: 'row', gap: SPACING.md, minHeight: 72 },
  timeCol: { width: 44, alignItems: 'flex-end', paddingTop: 2 },
  timeText: { color: COLORS.text3, fontSize: 11, ...FONT.medium },
  timeLine: { flex: 1, width: 1, backgroundColor: COLORS.borderWeak, marginTop: 4, marginBottom: -4 },
  eventCard: {
    flex: 1, backgroundColor: COLORS.surface1, borderRadius: RADIUS.md,
    borderLeftWidth: 3, padding: SPACING.md, gap: SPACING.xs, marginBottom: SPACING.md,
    borderWidth: 1, borderColor: COLORS.borderWeak,
  },
  eventCardDone: { opacity: 0.55 },
  eventTop: { flexDirection: 'row', gap: SPACING.sm, alignItems: 'flex-start' },
  colorBar: { width: 3, borderRadius: 2, minHeight: 32, marginTop: 2 },
  eventBody: { flex: 1, gap: 2 },
  eventCliente: { fontSize: 13, ...FONT.bold },
  eventDesc: { color: COLORS.text2, fontSize: 12, lineHeight: 17 },
  doneMark: { color: COLORS.success, fontSize: 16, ...FONT.bold },
  eventFooter: { flexDirection: 'row', gap: SPACING.md, flexWrap: 'wrap' },
  eventPlat: { color: COLORS.text3, fontSize: 11 },
  eventResp: { color: COLORS.text3, fontSize: 11 },
  concluirBtn: {
    alignSelf: 'flex-end', paddingHorizontal: SPACING.md, paddingVertical: 4,
    borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.success,
    backgroundColor: 'rgba(39,174,96,0.08)',
  },
  concluirText: { color: COLORS.success, fontSize: 11, ...FONT.medium },

  // Modal
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: COLORS.surface2, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, maxHeight: '90%' },
  modalTitle: { color: COLORS.text, fontSize: 18, ...FONT.bold },
  inputLabel: { color: COLORS.text3, fontSize: 12 },
  textInput: {
    backgroundColor: COLORS.surface3, borderRadius: RADIUS.md, borderWidth: 1,
    borderColor: COLORS.borderWeak, padding: SPACING.md, color: COLORS.text, fontSize: 14,
  },
  clientePicker: { maxHeight: 160, backgroundColor: COLORS.surface3, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.borderWeak },
  clienteOpt: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, padding: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.borderWeak },
  clienteOptActive: { backgroundColor: 'rgba(201,168,76,0.10)' },
  clienteDot: { width: 10, height: 10, borderRadius: 5 },
  clienteOptText: { color: COLORS.text2, fontSize: 13 },
});
