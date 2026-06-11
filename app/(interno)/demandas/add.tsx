import React, { useState, useEffect } from 'react';
import {
  ScrollView, View, Text, TextInput, StyleSheet,
  TouchableOpacity, ViewStyle,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../../src/lib/supabase';
import { useAuthStore } from '../../../src/stores/authStore';
import { COLORS, SPACING, FONT, RADIUS } from '../../../src/constants/theme';
import { GoldButton } from '../../../src/components/ui/GoldButton';
import { DateTimePicker } from '../../../src/components/ui/DateTimePicker';
import { Database } from '../../../src/types/database';

type Cliente = Pick<Database['public']['Tables']['clientes']['Row'], 'id' | 'nome_fantasia'>;
type Responsavel = Pick<Database['public']['Tables']['profiles']['Row'], 'id' | 'nome'>;

const SETORES = [
  { id: 'trafego',     label: 'Tráfego Pago',          color: COLORS.gold },
  { id: 'social',      label: 'Social Media',           color: '#3498db' },
  { id: 'ia',          label: 'IA',                     color: '#9b59b6' },
  { id: 'site',        label: 'Site / Dev',             color: '#27ae60' },
  { id: 'consultoria', label: 'Consultoria de Vendas',  color: '#e67e22' },
] as const;

export default function AddDemandaScreen() {
  const { profile } = useAuthStore();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [equipe, setEquipe] = useState<Responsavel[]>([]);
  const [form, setForm] = useState({
    titulo: '',
    descricao: '',
    cliente_id: '',
    responsavel_id: profile?.id ?? '',
    prioridade: 'media' as 'baixa' | 'media' | 'alta' | 'urgente',
    prazoDate: '',
    prazoTime: '',
    setor: '' as string,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.from('clientes').select('id, nome_fantasia').eq('status', 'ativo').order('nome_fantasia')
      .then(({ data }) => setClientes(data ?? []));
    supabase.from('profiles').select('id, nome').eq('ativo', true).neq('role', 'cliente').order('nome')
      .then(({ data }) => setEquipe(data ?? []));
  }, []);

  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.titulo.trim()) { setError('Título é obrigatório.'); return; }
    setSaving(true);
    setError(null);
    const { error: err } = await supabase.from('demandas').insert({
      titulo: form.titulo.trim(),
      descricao: form.descricao.trim() || null,
      cliente_id: form.cliente_id || null,
      responsavel_id: form.responsavel_id || profile?.id || null,
      prioridade: form.prioridade,
      prazo: form.prazoDate ? `${form.prazoDate}T${form.prazoTime || '00:00'}:00` : null,
      setor: form.setor || null,
      status: 'pendente',
    });
    setSaving(false);
    if (err) { setError(err.message); return; }
    router.back();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Nova Demanda</Text>

      {/* 1. Cliente */}
      <SelectField
        label="Cliente"
        value={form.cliente_id}
        onSelect={v => set('cliente_id', v)}
        options={[{ id: '', label: 'Interno (sem cliente)' }, ...clientes.map(c => ({ id: c.id, label: c.nome_fantasia }))]}
      />

      {/* 2. Setor */}
      <View style={styles.fieldWrap}>
        <Text style={styles.label}>Setor *</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs }}>
          {SETORES.map(s => {
            const active = form.setor === s.id;
            return (
              <TouchableOpacity
                key={s.id}
                style={[styles.setorBtn, active && { borderColor: s.color, backgroundColor: s.color + '22' } as ViewStyle]}
                onPress={() => set('setor', active ? '' : s.id)}
              >
                <View style={[styles.setorDot, { backgroundColor: s.color }]} />
                <Text style={[styles.setorText, active && { color: s.color }]}>{s.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* 3. Título e descrição */}
      <Field label="Título *" value={form.titulo} onChangeText={v => set('titulo', v)} placeholder="Ex: Criar criativos para campanha..." />
      <Field label="Descrição" value={form.descricao} onChangeText={v => set('descricao', v)} placeholder="Detalhes da demanda..." multiline />

      {/* 4. Responsável */}
      <SelectField
        label="Responsável"
        value={form.responsavel_id}
        onSelect={v => set('responsavel_id', v)}
        options={equipe.map(e => ({ id: e.id, label: e.nome }))}
      />

      {/* 5. Prioridade */}
      <View style={styles.fieldWrap}>
        <Text style={styles.label}>Prioridade</Text>
        <View style={styles.prioRow}>
          {(['baixa', 'media', 'alta', 'urgente'] as const).map(p => (
            <TouchableOpacity
              key={p}
              style={[styles.prioBtn, form.prioridade === p && { borderColor: PRIO_COLORS[p], backgroundColor: PRIO_COLORS[p] + '22' } as ViewStyle]}
              onPress={() => set('prioridade', p)}
            >
              <Text style={[styles.prioText, form.prioridade === p && styles.prioTextActive]}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <DateTimePicker
        label="Prazo"
        date={form.prazoDate}
        time={form.prazoTime}
        onDateChange={v => set('prazoDate', v)}
        onTimeChange={v => set('prazoTime', v)}
      />

      {error && <Text style={styles.error}>{error}</Text>}
      <GoldButton label="Salvar Demanda" onPress={handleSave} loading={saving} style={{ marginTop: SPACING.md }} />
      <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
        <Text style={styles.cancelText}>Cancelar</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Field({ label, value, onChangeText, placeholder, multiline }: {
  label: string; value: string; onChangeText: (v: string) => void;
  placeholder?: string; multiline?: boolean;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && { height: 80, textAlignVertical: 'top' }]}
        value={value} onChangeText={onChangeText} placeholder={placeholder}
        placeholderTextColor={COLORS.text3} multiline={multiline} autoCapitalize="none"
      />
    </View>
  );
}

function SelectField({ label, value, onSelect, options }: {
  label: string; value: string; onSelect: (v: string) => void;
  options: { id: string; label: string }[];
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
          {options.map(o => (
            <TouchableOpacity
              key={o.id}
              style={[styles.optBtn, value === o.id && styles.optBtnActive]}
              onPress={() => onSelect(o.id)}
            >
              <Text style={[styles.optText, value === o.id && styles.optTextActive]}>{o.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const PRIO_COLORS: Record<string, string> = {
  baixa: COLORS.info, media: COLORS.warning, alta: COLORS.danger, urgente: '#8b0000',
};

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
  prioRow: { flexDirection: 'row', gap: SPACING.sm },
  prioBtn: {
    flex: 1, padding: SPACING.sm, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' as const,
  },
  prioText: { color: COLORS.text3, fontSize: 12 },
  prioTextActive: { color: COLORS.text, ...FONT.medium },
  setorBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.border,
  },
  setorDot: { width: 8, height: 8, borderRadius: 4 },
  setorText: { color: COLORS.text3, fontSize: 12 },
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
