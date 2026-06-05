import React, { useState } from 'react';
import {
  ScrollView, View, Text, TextInput, StyleSheet,
  TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../../src/lib/supabase';
import { COLORS, SPACING, FONT, RADIUS } from '../../../src/constants/theme';
import { GoldButton } from '../../../src/components/ui/GoldButton';

export default function AddClienteScreen() {
  const [form, setForm] = useState({
    nome_fantasia: '',
    razao_social: '',
    cnpj: '',
    segmento: '',
    mensalidade: '',
    data_inicio: new Date().toISOString().slice(0, 10),
    data_renovacao: '',
    campanha_status: 'ativa' as 'ativa' | 'pausada',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.nome_fantasia.trim()) { setError('Nome fantasia é obrigatório.'); return; }
    const mensalidade = parseFloat(form.mensalidade.replace(',', '.'));
    if (isNaN(mensalidade)) { setError('Mensalidade inválida.'); return; }

    setSaving(true);
    setError(null);

    const dataRenovacao = form.data_renovacao || (() => {
      const d = new Date(form.data_inicio);
      d.setFullYear(d.getFullYear() + 1);
      return d.toISOString().slice(0, 10);
    })();

    const { error: err } = await supabase.from('clientes').insert({
      nome_fantasia: form.nome_fantasia.trim(),
      razao_social: form.razao_social.trim() || null,
      cnpj: form.cnpj.trim() || null,
      segmento: form.segmento.trim() || null,
      mensalidade,
      data_inicio: form.data_inicio,
      data_renovacao: dataRenovacao,
      campanha_status: form.campanha_status,
      status: 'ativo',
      health_score: 75,
    });

    setSaving(false);
    if (err) { setError(err.message); return; }
    router.back();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Novo Cliente</Text>

      <Field label="Nome Fantasia *" value={form.nome_fantasia} onChangeText={v => set('nome_fantasia', v)} placeholder="Ex: TechBrasil Store" />
      <Field label="Razão Social" value={form.razao_social} onChangeText={v => set('razao_social', v)} placeholder="Ex: TechBrasil Comercio Ltda" />
      <Field label="CNPJ" value={form.cnpj} onChangeText={v => set('cnpj', v)} placeholder="00.000.000/0001-00" keyboardType="numeric" />
      <Field label="Segmento" value={form.segmento} onChangeText={v => set('segmento', v)} placeholder="Ex: E-commerce, Saúde..." />
      <Field label="Mensalidade (R$) *" value={form.mensalidade} onChangeText={v => set('mensalidade', v)} placeholder="2500,00" keyboardType="decimal-pad" />
      <Field label="Data de Início" value={form.data_inicio} onChangeText={v => set('data_inicio', v)} placeholder="AAAA-MM-DD" />
      <Field label="Data de Renovação" value={form.data_renovacao} onChangeText={v => set('data_renovacao', v)} placeholder="AAAA-MM-DD (auto: +1 ano)" />

      <View style={styles.fieldWrap}>
        <Text style={styles.label}>Status da Campanha</Text>
        <View style={styles.toggleRow}>
          {(['ativa', 'pausada'] as const).map(s => (
            <TouchableOpacity
              key={s}
              style={[styles.toggleBtn, form.campanha_status === s && styles.toggleBtnActive]}
              onPress={() => set('campanha_status', s)}
            >
              <Text style={[styles.toggleText, form.campanha_status === s && styles.toggleTextActive]}>
                {s === 'ativa' ? '🟢 Ativa' : '⏸ Pausada'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <GoldButton label="Salvar Cliente" onPress={handleSave} loading={saving} style={{ marginTop: SPACING.md }} />
      <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
        <Text style={styles.cancelText}>Cancelar</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Field({ label, value, onChangeText, placeholder, keyboardType }: {
  label: string; value: string; onChangeText: (v: string) => void;
  placeholder?: string; keyboardType?: 'default' | 'numeric' | 'decimal-pad';
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.text3}
        keyboardType={keyboardType ?? 'default'}
        autoCapitalize="none"
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
  toggleRow: { flexDirection: 'row', gap: SPACING.sm },
  toggleBtn: {
    flex: 1, padding: SPACING.md, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border, alignItems: 'center',
  },
  toggleBtnActive: { borderColor: COLORS.gold, backgroundColor: 'rgba(201,168,76,0.12)' },
  toggleText: { color: COLORS.text3, fontSize: 13 },
  toggleTextActive: { color: COLORS.gold, ...FONT.medium },
  error: { color: COLORS.danger, fontSize: 13, textAlign: 'center' },
  cancelBtn: { padding: SPACING.md, alignItems: 'center' },
  cancelText: { color: COLORS.text3, fontSize: 14 },
});
