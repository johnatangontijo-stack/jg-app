import React, { useState, useCallback, useEffect } from 'react';
import {
  ScrollView, View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../../src/lib/supabase';
import { COLORS, SPACING, FONT, RADIUS } from '../../../src/constants/theme';
import { Card } from '../../../src/components/ui/Card';
import { Badge } from '../../../src/components/ui/Badge';
import { Database } from '../../../src/types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  gerencia: 'Gerência',
  head: 'Head',
  financeiro: 'Financeiro',
  colaborador: 'Colaborador',
  cliente: 'Cliente',
};

const ROLE_VARIANTS: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
  admin: 'danger',
  gerencia: 'warning',
  head: 'info',
  financeiro: 'success',
  colaborador: 'info',
};

export default function EquipeScreen() {
  const [equipe, setEquipe] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .neq('role', 'cliente')
      .order('role')
      .order('nome');
    setEquipe(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleAtivo = async (id: string, ativo: boolean) => {
    await supabase.from('profiles').update({ ativo: !ativo }).eq('id', id);
    load();
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={COLORS.gold} />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Equipe</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/(interno)/equipe/add')}>
          <Text style={styles.addText}>+ Novo Membro</Text>
        </TouchableOpacity>
      </View>

      {loading && <ActivityIndicator color={COLORS.gold} style={{ marginTop: SPACING.xl }} />}

      {!loading && equipe.length === 0 && (
        <Card><Text style={styles.empty}>Nenhum membro cadastrado.</Text></Card>
      )}

      {equipe.map(p => (
        <Card key={p.id} style={styles.card}>
          <View style={styles.cardRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{p.nome.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardNome}>{p.nome}</Text>
              <Text style={styles.cardEmail}>{p.email}</Text>
              <View style={styles.badgeRow}>
                <Badge
                  label={ROLE_LABELS[p.role] ?? p.role}
                  variant={ROLE_VARIANTS[p.role] ?? 'info'}
                />
                {!p.ativo && <Badge label="Inativo" variant="danger" />}
              </View>
            </View>
            <TouchableOpacity
              style={[styles.statusBtn, p.ativo ? styles.statusAtivo : styles.statusInativo]}
              onPress={() => toggleAtivo(p.id, p.ativo)}
            >
              <Text style={styles.statusText}>{p.ativo ? 'Ativo' : 'Inativo'}</Text>
            </TouchableOpacity>
          </View>
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.black },
  content: { padding: SPACING.lg, gap: SPACING.sm, paddingBottom: 48 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.sm },
  title: { color: COLORS.text, fontSize: 22, ...FONT.bold },
  addBtn: { backgroundColor: COLORS.gold, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: RADIUS.md },
  addText: { color: COLORS.black, fontSize: 13, ...FONT.bold },
  card: { padding: SPACING.md },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  avatar: {
    width: 44, height: 44, borderRadius: RADIUS.full,
    backgroundColor: 'rgba(201,168,76,0.15)', borderWidth: 1, borderColor: COLORS.gold,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: COLORS.gold, fontSize: 18, ...FONT.bold },
  cardInfo: { flex: 1, gap: 2 },
  cardNome: { color: COLORS.text, fontSize: 14, ...FONT.bold },
  cardEmail: { color: COLORS.text3, fontSize: 11 },
  badgeRow: { flexDirection: 'row', gap: SPACING.xs, marginTop: 2 },
  statusBtn: { paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: RADIUS.sm },
  statusAtivo: { backgroundColor: 'rgba(39,174,96,0.15)', borderWidth: 1, borderColor: COLORS.success },
  statusInativo: { backgroundColor: 'rgba(192,57,43,0.15)', borderWidth: 1, borderColor: COLORS.danger },
  statusText: { color: COLORS.text2, fontSize: 11 },
  empty: { color: COLORS.text2, textAlign: 'center' },
});
