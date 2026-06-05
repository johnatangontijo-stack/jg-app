import React, { useState, useEffect, useCallback } from 'react';
import {
  ScrollView, View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Modal, RefreshControl,
} from 'react-native';
import { COLORS, SPACING, FONT, RADIUS } from '../../src/constants/theme';
import { supabase } from '../../src/lib/supabase';
import { useAuthStore } from '../../src/stores/authStore';
import { Card } from '../../src/components/ui/Card';
import { Badge } from '../../src/components/ui/Badge';
import { GoldButton } from '../../src/components/ui/GoldButton';
import { Database } from '../../src/types/database';

type Slot = Database['public']['Tables']['agenda_otimizacao']['Row'] & {
  clientes: { nome_fantasia: string } | null;
  profiles: { nome: string } | null;
};
type Cliente = Database['public']['Tables']['clientes']['Row'];

function groupByDay(slots: Slot[]) {
  const map = new Map<string, Slot[]>();
  for (const s of slots) {
    const day = s.data_hora.slice(0, 10);
    if (!map.has(day)) map.set(day, []);
    map.get(day)!.push(s);
  }
  return map;
}

export default function AgendaInternoScreen() {
  const { profile } = useAuthStore();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [clientes, setClientes] = useState<Pick<Cliente, 'id' | 'nome_fantasia'>[]>([]);
  const [loading, setLoading] = useState(true);
  const [addModal, setAddModal] = useState(false);
  const [form, setForm] = useState({ clienteId: '', data: '', hora: '09:00', descricao: '', plataformas: 'Meta Ads' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const inicio = new Date();
    const fim = new Date();
    fim.setDate(fim.getDate() + 7);

    let q = supabase
      .from('agenda_otimizacao')
      .select('*, clientes(nome_fantasia), profiles!funcionario_id(nome)')
      .gte('data_hora', inicio.toISOString())
      .lte('data_hora', fim.toISOString())
      .order('data_hora');

    if (profile?.role !== 'admin' && profile?.id) {
      q = q.eq('funcionario_id', profile.id);
    }

    const { data: slotsData } = await q;
    setSlots((slotsData as unknown as Slot[]) ?? []);

    const { data: clientesData } = await supabase.from('clientes').select('id, nome_fantasia').eq('status', 'ativo').order('nome_fantasia');
    setClientes(clientesData ?? []);
    setLoading(false);
  }, [profile]);

  useEffect(() => { load(); }, [load]);

  const addSlot = async () => {
    if (!form.clienteId || !form.data || !form.hora || !form.descricao || !profile) return;
    setSaving(true);
    try {
      await supabase.from('agenda_otimizacao').insert({
        cliente_id: form.clienteId,
        funcionario_id: profile.id,
        data_hora: `${form.data}T${form.hora}:00`,
        descricao: form.descricao,
        plataformas: form.plataformas.split(',').map((p) => p.trim()),
        status: 'agendado',
      });

      // Notificar usuários do cliente
      const { data: cu } = await supabase.from('cliente_usuarios').select('profile_id').eq('cliente_id', form.clienteId);
      for (const u of cu ?? []) {
        await supabase.from('notificacoes').insert({
          profile_id: u.profile_id,
          tipo: 'campanha_alerta',
          titulo: 'Nova otimização agendada',
          mensagem: `${form.descricao} — ${new Date(form.data).toLocaleDateString('pt-BR')} às ${form.hora}`,
        });
      }

      setAddModal(false);
      setForm({ clienteId: '', data: '', hora: '09:00', descricao: '', plataformas: 'Meta Ads' });
      await load();
    } finally {
      setSaving(false);
    }
  };

  const concluir = async (id: string) => {
    await supabase.from('agenda_otimizacao').update({ status: 'concluido' }).eq('id', id);
    await load();
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color={COLORS.gold} /></View>;

  const grouped = groupByDay(slots);

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={COLORS.gold} />}
      >
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Agenda da semana</Text>
          <GoldButton label="+ Slot" onPress={() => setAddModal(true)} style={styles.addBtn} />
        </View>

        {grouped.size === 0 ? (
          <Text style={styles.vazio}>Nenhum slot esta semana.</Text>
        ) : (
          Array.from(grouped.entries()).map(([day, daySlots]) => (
            <View key={day}>
              <Text style={styles.dayLabel}>
                {new Date(day + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
              </Text>
              {daySlots.map((slot) => (
                <Card key={slot.id} style={styles.slotCard}>
                  <View style={styles.slotRow}>
                    <Text style={styles.hora}>{slot.data_hora.slice(11, 16)}</Text>
                    <View style={styles.slotInfo}>
                      <Text style={styles.slotCliente}>{slot.clientes?.nome_fantasia}</Text>
                      <Text style={styles.slotDesc}>{slot.descricao}</Text>
                      <Text style={styles.slotPlats}>{slot.plataformas.join(' · ')}</Text>
                    </View>
                    <Badge label={slot.status} variant={slot.status === 'concluido' ? 'success' : 'gray'} />
                  </View>
                  {slot.status !== 'concluido' && (
                    <TouchableOpacity style={styles.concluirBtn} onPress={() => concluir(slot.id)} activeOpacity={0.8}>
                      <Text style={styles.concluirText}>Marcar concluído</Text>
                    </TouchableOpacity>
                  )}
                </Card>
              ))}
            </View>
          ))
        )}
      </ScrollView>

      {/* Modal adicionar slot */}
      <Modal visible={addModal} transparent animationType="slide" onRequestClose={() => setAddModal(false)}>
        <View style={styles.overlay}>
          <ScrollView style={styles.sheet} contentContainerStyle={{ gap: SPACING.md, padding: SPACING.xxl }}>
            <Text style={styles.modalTitle}>Novo slot de otimização</Text>

            <Text style={styles.inputLabel}>Cliente</Text>
            <ScrollView style={styles.clientePicker} nestedScrollEnabled>
              {clientes.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.clienteOption, form.clienteId === c.id && styles.clienteSelected]}
                  onPress={() => setForm((f) => ({ ...f, clienteId: c.id }))}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.clienteOptionText, form.clienteId === c.id && styles.clienteSelectedText]}>
                    {c.nome_fantasia}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.inputLabel}>Data (YYYY-MM-DD)</Text>
            <TextInput style={styles.textInput} value={form.data} onChangeText={(v) => setForm((f) => ({ ...f, data: v }))} placeholder="2026-06-15" placeholderTextColor={COLORS.text3} />

            <Text style={styles.inputLabel}>Hora (HH:MM)</Text>
            <TextInput style={styles.textInput} value={form.hora} onChangeText={(v) => setForm((f) => ({ ...f, hora: v }))} placeholder="09:00" placeholderTextColor={COLORS.text3} />

            <Text style={styles.inputLabel}>Descrição</Text>
            <TextInput style={[styles.textInput, { minHeight: 60 }]} value={form.descricao} onChangeText={(v) => setForm((f) => ({ ...f, descricao: v }))} placeholder="Ex: Otimização de segmentação Meta Ads" placeholderTextColor={COLORS.text3} multiline textAlignVertical="top" />

            <Text style={styles.inputLabel}>Plataformas (separadas por vírgula)</Text>
            <TextInput style={styles.textInput} value={form.plataformas} onChangeText={(v) => setForm((f) => ({ ...f, plataformas: v }))} placeholder="Meta Ads, Google Ads" placeholderTextColor={COLORS.text3} />

            <View style={styles.modalActions}>
              <GoldButton label="Cancelar" onPress={() => setAddModal(false)} variant="ghost" style={styles.flex} />
              <GoldButton label="Agendar" onPress={addSlot} loading={saving} style={styles.flex} />
            </View>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.black },
  content: { padding: SPACING.lg, gap: SPACING.lg, paddingBottom: SPACING.xxl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.black },
  pageHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pageTitle: { color: COLORS.text, fontSize: 18, ...FONT.bold },
  addBtn: { paddingVertical: SPACING.sm, paddingHorizontal: SPACING.lg },
  vazio: { color: COLORS.text3, fontSize: 13 },
  dayLabel: { color: COLORS.text2, fontSize: 13, ...FONT.medium, textTransform: 'capitalize', marginBottom: SPACING.sm },
  slotCard: { marginBottom: SPACING.sm, gap: SPACING.sm },
  slotRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md },
  hora: { color: COLORS.gold, fontSize: 14, ...FONT.bold, minWidth: 40 },
  slotInfo: { flex: 1, gap: 2 },
  slotCliente: { color: COLORS.text, fontSize: 13, ...FONT.bold },
  slotDesc: { color: COLORS.text2, fontSize: 12 },
  slotPlats: { color: COLORS.text3, fontSize: 11 },
  concluirBtn: { alignSelf: 'flex-end', paddingHorizontal: SPACING.md, paddingVertical: 5, borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.success, backgroundColor: 'rgba(39,174,96,0.1)' },
  concluirText: { color: COLORS.success, fontSize: 12, ...FONT.medium },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: COLORS.surface2, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, maxHeight: '85%' },
  modalTitle: { color: COLORS.text, fontSize: 18, ...FONT.bold },
  inputLabel: { color: COLORS.text3, fontSize: 12 },
  textInput: { backgroundColor: COLORS.surface3, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.borderWeak, padding: SPACING.md, color: COLORS.text, fontSize: 14 },
  clientePicker: { maxHeight: 150, backgroundColor: COLORS.surface3, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.borderWeak },
  clienteOption: { padding: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.borderWeak },
  clienteSelected: { backgroundColor: 'rgba(201,168,76,0.15)' },
  clienteOptionText: { color: COLORS.text2, fontSize: 13 },
  clienteSelectedText: { color: COLORS.gold, ...FONT.medium },
  modalActions: { flexDirection: 'row', gap: SPACING.sm },
  flex: { flex: 1 },
});
