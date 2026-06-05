import React, { useState } from 'react';
import {
  ScrollView, View, Text, TextInput, StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../../src/lib/supabase';
import { COLORS, SPACING, FONT, RADIUS } from '../../../src/constants/theme';
import { GoldButton } from '../../../src/components/ui/GoldButton';

type Role = 'admin' | 'gerencia' | 'head' | 'financeiro' | 'colaborador';

const ROLES: { value: Role; label: string; desc: string }[] = [
  { value: 'admin',       label: 'Admin',       desc: 'Acesso total ao sistema' },
  { value: 'gerencia',    label: 'Gerência',    desc: 'Clientes, feedbacks, financeiro e equipe' },
  { value: 'head',        label: 'Head',        desc: 'Demandas, agenda e gravações' },
  { value: 'financeiro',  label: 'Financeiro',  desc: 'Pagamentos e verbas (restrito)' },
  { value: 'colaborador', label: 'Colaborador', desc: 'Produções, demandas e agenda' },
];

export default function AddEquipeScreen() {
  const [form, setForm] = useState({ nome: '', email: '', senha: '', role: 'colaborador' as Role });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.nome.trim() || !form.email.trim() || !form.senha.trim()) {
      setError('Nome, e-mail e senha são obrigatórios.');
      return;
    }
    if (form.senha.length < 6) { setError('Senha deve ter ao menos 6 caracteres.'); return; }

    setSaving(true);
    setError(null);

    // signUp creates the user; mailer_autoconfirm=true means no email needed
    const { data, error: signUpErr } = await supabase.auth.signUp({
      email: form.email.trim().toLowerCase(),
      password: form.senha,
      options: { data: { nome: form.nome.trim() } },
    });

    if (signUpErr || !data.user) {
      setError(signUpErr?.message ?? 'Erro ao criar usuário.');
      setSaving(false);
      return;
    }

    // Upsert profile with correct role (admin RLS allows this)
    const { error: profileErr } = await supabase.from('profiles').upsert({
      id: data.user.id,
      nome: form.nome.trim(),
      email: form.email.trim().toLowerCase(),
      role: form.role,
      ativo: true,
    });

    setSaving(false);
    if (profileErr) { setError(profileErr.message); return; }
    router.back();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Novo Membro da Equipe</Text>

      <View style={styles.fieldWrap}>
        <Text style={styles.label}>Nome Completo *</Text>
        <TextInput style={styles.input} value={form.nome} onChangeText={v => set('nome', v)}
          placeholder="Ex: Maria Silva" placeholderTextColor={COLORS.text3} />
      </View>

      <View style={styles.fieldWrap}>
        <Text style={styles.label}>E-mail *</Text>
        <TextInput style={styles.input} value={form.email} onChangeText={v => set('email', v)}
          placeholder="maria@empresa.com" placeholderTextColor={COLORS.text3}
          keyboardType="email-address" autoCapitalize="none" />
      </View>

      <View style={styles.fieldWrap}>
        <Text style={styles.label}>Senha *</Text>
        <TextInput style={styles.input} value={form.senha} onChangeText={v => set('senha', v)}
          placeholder="Mínimo 6 caracteres" placeholderTextColor={COLORS.text3} secureTextEntry />
      </View>

      <View style={styles.fieldWrap}>
        <Text style={styles.label}>Nível de Acesso</Text>
        {ROLES.map(r => (
          <TouchableOpacity
            key={r.value}
            style={[styles.roleBtn, form.role === r.value && styles.roleBtnActive]}
            onPress={() => set('role', r.value)}
          >
            <View style={styles.roleRow}>
              <Text style={[styles.roleLabel, form.role === r.value && styles.roleLabelActive]}>
                {r.label}
              </Text>
              {form.role === r.value && <Text style={styles.check}>✓</Text>}
            </View>
            <Text style={styles.roleDesc}>{r.desc}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {error && <Text style={styles.error}>{error}</Text>}
      <GoldButton label="Criar Membro" onPress={handleSave} loading={saving} style={{ marginTop: SPACING.md }} />
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
  label: { color: COLORS.text2, fontSize: 13, ...FONT.medium },
  input: {
    backgroundColor: COLORS.surface2, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: RADIUS.md, padding: SPACING.md, color: COLORS.text, fontSize: 14, height: 48,
  },
  roleBtn: {
    backgroundColor: COLORS.surface2, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: RADIUS.md, padding: SPACING.md, gap: 2, marginBottom: SPACING.xs,
  },
  roleBtnActive: { borderColor: COLORS.gold, backgroundColor: 'rgba(201,168,76,0.08)' },
  roleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  roleLabel: { color: COLORS.text2, fontSize: 14, ...FONT.medium },
  roleLabelActive: { color: COLORS.gold },
  check: { color: COLORS.gold, fontSize: 14 },
  roleDesc: { color: COLORS.text3, fontSize: 11 },
  error: { color: COLORS.danger, fontSize: 13, textAlign: 'center' },
  cancelBtn: { padding: SPACING.md, alignItems: 'center' },
  cancelText: { color: COLORS.text3, fontSize: 14 },
});
