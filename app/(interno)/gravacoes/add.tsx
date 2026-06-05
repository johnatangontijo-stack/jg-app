import React, { useState, useEffect } from 'react';
import {
  ScrollView, View, Text, TextInput, StyleSheet,
  TouchableOpacity, Linking, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../../src/lib/supabase';
import { useAuthStore } from '../../../src/stores/authStore';
import { COLORS, SPACING, FONT, RADIUS } from '../../../src/constants/theme';
import { GoldButton } from '../../../src/components/ui/GoldButton';
import { Database } from '../../../src/types/database';

type Cliente = Pick<Database['public']['Tables']['clientes']['Row'], 'id' | 'nome_fantasia'>;

const GOOGLE_CALENDAR_URL = 'https://calendar.google.com/calendar/r/eventedit';

export default function AddGravacaoScreen() {
  const { profile } = useAuthStore();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [form, setForm] = useState({
    titulo: '',
    descricao: '',
    cliente_id: '',
    link_gravacao: '',
    data_gravacao: new Date().toISOString().slice(0, 16),
    duracao_min: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [calendarLinked, setCalendarLinked] = useState(false);

  useEffect(() => {
    supabase.from('clientes').select('id, nome_fantasia').eq('status', 'ativo').order('nome_fantasia')
      .then(({ data }) => setClientes(data ?? []));
  }, []);

  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }));

  const openGoogleCalendar = () => {
    const title = encodeURIComponent(form.titulo || 'Reunião / Gravação');
    const details = encodeURIComponent(form.descricao || '');
    const url = `${GOOGLE_CALENDAR_URL}?text=${title}&details=${details}`;
    Linking.openURL(url);
    setCalendarLinked(true);
  };

  const handleSave = async () => {
    if (!form.titulo.trim()) { setError('Título é obrigatório.'); return; }
    setSaving(true);
    setError(null);
    const { error: err } = await supabase.from('gravacoes').insert({
      titulo: form.titulo.trim(),
      descricao: form.descricao.trim() || null,
      cliente_id: form.cliente_id || null,
      link_gravacao: form.link_gravacao.trim() || null,
      data_gravacao: form.data_gravacao,
      duracao_min: form.duracao_min ? parseInt(form.duracao_min, 10) : null,
      responsavel_id: profile?.id ?? null,
    });
    setSaving(false);
    if (err) { setError(err.message); return; }
    router.back();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Nova Gravação</Text>

      <Field label="Título *" value={form.titulo} onChangeText={v => set('titulo', v)} placeholder="Ex: Reunião de alinhamento TechBrasil" />
      <Field label="Descrição" value={form.descricao} onChangeText={v => set('descricao', v)} placeholder="Pauta, observações..." multiline />

      <View style={styles.fieldWrap}>
        <Text style={styles.label}>Cliente</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
            {[{ id: '', nome_fantasia: 'Interno' }, ...clientes].map(c => (
              <TouchableOpacity
                key={c.id}
                style={[styles.optBtn, form.cliente_id === c.id && styles.optBtnActive]}
                onPress={() => set('cliente_id', c.id)}
              >
                <Text style={[styles.optText, form.cliente_id === c.id && styles.optTextActive]}>{c.nome_fantasia}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      <Field label="Data e Hora" value={form.data_gravacao} onChangeText={v => set('data_gravacao', v)} placeholder="AAAA-MM-DDTHH:MM" />
      <Field label="Duração (min)" value={form.duracao_min} onChangeText={v => set('duracao_min', v)} placeholder="60" keyboardType="numeric" />
      <Field label="Link da Gravação" value={form.link_gravacao} onChangeText={v => set('link_gravacao', v)} placeholder="https://drive.google.com/..." />

      {/* Google Calendar integration */}
      <View style={styles.calendarBox}>
        <Text style={styles.calendarTitle}>📅 Google Calendar</Text>
        <Text style={styles.calendarDesc}>
          Crie o evento no Google Calendar e cole o link da gravação acima após a reunião.
        </Text>
        <TouchableOpacity style={styles.calendarBtn} onPress={openGoogleCalendar}>
          <Text style={styles.calendarBtnText}>
            {calendarLinked ? '✅ Calendar aberto' : '🔗 Abrir Google Calendar'}
          </Text>
        </TouchableOpacity>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}
      <GoldButton label="Salvar Gravação" onPress={handleSave} loading={saving} style={{ marginTop: SPACING.md }} />
      <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
        <Text style={styles.cancelText}>Cancelar</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Field({ label, value, onChangeText, placeholder, multiline, keyboardType }: {
  label: string; value: string; onChangeText: (v: string) => void;
  placeholder?: string; multiline?: boolean; keyboardType?: 'default' | 'numeric';
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && { height: 80, textAlignVertical: 'top' }]}
        value={value} onChangeText={onChangeText} placeholder={placeholder}
        placeholderTextColor={COLORS.text3} multiline={multiline}
        autoCapitalize="none" keyboardType={keyboardType ?? 'default'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.black },
  content: { padding: SPACING.lg, gap: SPACING.md, paddingBottom: 48 },
  title: { color: COLORS.text, fontSize: 20, ...FONT.bold, marginBottom: SPACING.sm },
  fieldWrap: { gap: SPACING.xs },
  label: { color: COLORS.text2, fontSize: 13, ...FONT.medium },
  input: {
    backgroundColor: COLORS.surface2, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: RADIUS.md, padding: SPACING.md, color: COLORS.text, fontSize: 14, height: 48,
  },
  optBtn: {
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.border,
  },
  optBtnActive: { borderColor: COLORS.gold, backgroundColor: 'rgba(201,168,76,0.15)' },
  optText: { color: COLORS.text3, fontSize: 12 },
  optTextActive: { color: COLORS.gold, ...FONT.medium },
  calendarBox: {
    backgroundColor: COLORS.surface2, borderRadius: RADIUS.lg, padding: SPACING.lg,
    borderWidth: 1, borderColor: COLORS.border, gap: SPACING.sm,
  },
  calendarTitle: { color: COLORS.text, fontSize: 14, ...FONT.bold },
  calendarDesc: { color: COLORS.text3, fontSize: 12, lineHeight: 18 },
  calendarBtn: {
    backgroundColor: 'rgba(201,168,76,0.15)', borderRadius: RADIUS.md,
    padding: SPACING.md, alignItems: 'center', borderWidth: 1, borderColor: COLORS.gold,
  },
  calendarBtnText: { color: COLORS.gold, fontSize: 13, ...FONT.medium },
  error: { color: COLORS.danger, fontSize: 13, textAlign: 'center' },
  cancelBtn: { padding: SPACING.md, alignItems: 'center' },
  cancelText: { color: COLORS.text3, fontSize: 14 },
});
