import React, { useState, useEffect } from 'react';
import {
  ScrollView, View, Text, TextInput, StyleSheet, TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../../src/lib/supabase';
import { useAuthStore } from '../../../src/stores/authStore';
import { COLORS, SPACING, FONT, RADIUS } from '../../../src/constants/theme';
import { GoldButton } from '../../../src/components/ui/GoldButton';
import { DateTimePicker } from '../../../src/components/ui/DateTimePicker';
import { Database } from '../../../src/types/database';

type Cliente = Pick<Database['public']['Tables']['clientes']['Row'], 'id' | 'nome_fantasia'>;

export default function AddGravacaoScreen() {
  const { profile } = useAuthStore();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [form, setForm] = useState({
    cliente_id: '',
    prazoDate: new Date().toISOString().slice(0, 10),
    prazoTime: '09:00',
    titulo: '',
    descricao: '',
    roteiro: '',
    duracao_min: '90',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.from('clientes').select('id, nome_fantasia').eq('status', 'ativo').order('nome_fantasia')
      .then(({ data }) => setClientes(data ?? []));
  }, []);

  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.cliente_id)    { setError('Selecione o cliente.');     return; }
    if (!form.titulo.trim()) { setError('Título é obrigatório.');    return; }
    if (!form.roteiro.trim()){ setError('O roteiro é obrigatório para agendar a gravação.'); return; }
    setSaving(true);
    setError(null);
    const { error: err } = await supabase.from('gravacoes').insert({
      titulo:       form.titulo.trim(),
      descricao:    form.descricao.trim() || null,
      roteiro:      form.roteiro.trim(),
      cliente_id:   form.cliente_id || null,
      data_gravacao:`${form.prazoDate}T${form.prazoTime}:00`,
      duracao_min:  form.duracao_min ? parseInt(form.duracao_min, 10) : 90,
      responsavel_id: profile?.id ?? null,
    });
    setSaving(false);
    if (err) { setError(err.message); return; }

    // Notifica o cliente
    if (form.cliente_id) {
      const { data: cu } = await supabase.from('cliente_usuarios').select('profile_id').eq('cliente_id', form.cliente_id);
      for (const u of cu ?? []) {
        await supabase.from('notificacoes').insert({
          profile_id: u.profile_id,
          tipo: 'geral',
          titulo: 'Gravação agendada!',
          mensagem: `${form.titulo} — ${form.prazoDate} às ${form.prazoTime}`,
        });
      }
    }
    router.back();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Nova Gravação</Text>

      {/* 1. Cliente */}
      <View style={styles.fieldWrap}>
        <Text style={styles.label}>Cliente *</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
            {clientes.map(c => (
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

      {/* 2. Data e Hora */}
      <DateTimePicker
        label="Data e Hora *"
        date={form.prazoDate}
        time={form.prazoTime}
        onDateChange={v => set('prazoDate', v)}
        onTimeChange={v => set('prazoTime', v)}
      />

      {/* 3. Título */}
      <View style={styles.fieldWrap}>
        <Text style={styles.label}>Título *</Text>
        <TextInput
          style={styles.input}
          value={form.titulo}
          onChangeText={v => set('titulo', v)}
          placeholder="Ex: Reunião de alinhamento TechBrasil"
          placeholderTextColor={COLORS.text3}
          autoCapitalize="sentences"
        />
      </View>

      {/* 4. Descrição */}
      <View style={styles.fieldWrap}>
        <Text style={styles.label}>Descrição</Text>
        <TextInput
          style={[styles.input, { height: 72, textAlignVertical: 'top' }]}
          value={form.descricao}
          onChangeText={v => set('descricao', v)}
          placeholder="Pauta, observações gerais..."
          placeholderTextColor={COLORS.text3}
          multiline
        />
      </View>

      {/* 5. Roteiro — obrigatório */}
      <View style={styles.fieldWrap}>
        <View style={styles.labelRow}>
          <Text style={styles.label}>Roteiro *</Text>
          <Text style={styles.labelHint}>Obrigatório para agendar</Text>
        </View>
        <TextInput
          style={[styles.input, { minHeight: 120, textAlignVertical: 'top' }]}
          value={form.roteiro}
          onChangeText={v => set('roteiro', v)}
          placeholder="Descreva o roteiro completo da gravação: abertura, tópicos, CTA final..."
          placeholderTextColor={COLORS.text3}
          multiline
        />
      </View>

      {/* 6. Duração */}
      <View style={styles.fieldWrap}>
        <Text style={styles.label}>Duração (min)</Text>
        <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
          {['60', '90', '120'].map(v => (
            <TouchableOpacity
              key={v}
              style={[styles.optBtn, form.duracao_min === v && styles.optBtnActive]}
              onPress={() => set('duracao_min', v)}
            >
              <Text style={[styles.optText, form.duracao_min === v && styles.optTextActive]}>{v} min</Text>
            </TouchableOpacity>
          ))}
          <TextInput
            style={[styles.input, { flex: 1, height: 38 }]}
            value={!['60','90','120'].includes(form.duracao_min) ? form.duracao_min : ''}
            onChangeText={v => set('duracao_min', v)}
            placeholder="Outro"
            placeholderTextColor={COLORS.text3}
            keyboardType="numeric"
          />
        </View>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}
      <GoldButton label="Agendar Gravação" onPress={handleSave} loading={saving} style={{ marginTop: SPACING.md }} />
      <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
        <Text style={styles.cancelText}>Cancelar</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.black },
  content: { padding: SPACING.lg, gap: SPACING.md, paddingBottom: 48 },
  title: { color: COLORS.text, fontSize: 20, ...FONT.bold, marginBottom: SPACING.sm },
  fieldWrap: { gap: SPACING.xs },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { color: COLORS.text2, fontSize: 13, ...FONT.medium },
  labelHint: { color: COLORS.gold, fontSize: 11 },
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
  error: { color: COLORS.danger, fontSize: 13, textAlign: 'center' },
  cancelBtn: { padding: SPACING.md, alignItems: 'center' },
  cancelText: { color: COLORS.text3, fontSize: 14 },
});
