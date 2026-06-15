import React, { useState, useCallback, useEffect } from 'react';
import { ScrollView, View, Text, StyleSheet, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { COLORS, SPACING, FONT, RADIUS } from '../../src/constants/theme';
import { supabase } from '../../src/lib/supabase';
import { useAuthStore } from '../../src/stores/authStore';
import { DemandaItem } from '../../src/components/interno/DemandaItem';
import { Icon, IconText } from '../../src/components/ui/Icon';
import { Database } from '../../src/types/database';

type Demanda = Database['public']['Tables']['demandas']['Row'] & {
  clientes: { nome_fantasia: string } | null;
  profiles: { nome: string } | null;
};

export default function DemandasScreen() {
  const { profile } = useAuthStore();
  const [demandas, setDemandas] = useState<Demanda[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);

    let query = supabase
      .from('demandas')
      .select('*, clientes(nome_fantasia), profiles!responsavel_id(nome)')
      .neq('status', 'concluida')
      .order('prioridade', { ascending: false })
      .order('prazo');

    if (profile.role !== 'admin' && profile.role !== 'gerencia') {
      query = query.eq('responsavel_id', profile.id);
    }

    const { data } = await query;
    setDemandas((data as unknown as Demanda[]) ?? []);
    setLoading(false);
  }, [profile]);

  useEffect(() => { load(); }, [load]);

  const concluir = async (id: string) => {
    await supabase.from('demandas').update({ status: 'concluida' }).eq('id', id);
    await load();
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color={COLORS.gold} /></View>;

  const hoje = new Date().toISOString().split('T')[0];
  const urgentes = demandas.filter((d) => d.prioridade === 'urgente');
  const paraHoje = demandas.filter((d) => d.prioridade !== 'urgente' && d.prazo <= hoje);
  const restante = demandas.filter((d) => d.prioridade !== 'urgente' && d.prazo > hoje);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={COLORS.gold} />}
    >
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Demandas</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/(interno)/demandas/add')}>
          <Text style={styles.addText}>+ Nova</Text>
        </TouchableOpacity>
      </View>

      {urgentes.length > 0 && (
        <>
          <IconText name="alerta" size={14} color={COLORS.danger} textStyle={[styles.sectionTitle, { color: COLORS.danger }]}>Urgentes</IconText>
          {urgentes.map((d) => (
            <DemandaItem
              key={d.id}
              demanda={d}
              clienteNome={d.clientes?.nome_fantasia}
              responsavelNome={d.profiles?.nome}
              onConcluir={() => concluir(d.id)}
            />
          ))}
        </>
      )}

      {paraHoje.length > 0 && (
        <>
          <IconText name="pin" size={14} color={COLORS.text} textStyle={styles.sectionTitle}>Para hoje</IconText>
          {paraHoje.map((d) => (
            <DemandaItem
              key={d.id}
              demanda={d}
              clienteNome={d.clientes?.nome_fantasia}
              responsavelNome={d.profiles?.nome}
              onConcluir={() => concluir(d.id)}
            />
          ))}
        </>
      )}

      {restante.length > 0 && (
        <>
          <IconText name="list" size={14} color={COLORS.text} textStyle={styles.sectionTitle}>Esta semana</IconText>
          {restante.map((d) => (
            <DemandaItem
              key={d.id}
              demanda={d}
              clienteNome={d.clientes?.nome_fantasia}
              responsavelNome={d.profiles?.nome}
              onConcluir={() => concluir(d.id)}
            />
          ))}
        </>
      )}

      {demandas.length === 0 && (
        <View style={styles.empty}>
          <Icon name="aprovado" size={36} color={COLORS.success} />
          <Text style={styles.emptyText}>Nada pendente. Deixa com a gente!</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.black },
  content: { padding: SPACING.lg, gap: SPACING.lg, paddingBottom: SPACING.xxl },
  pageHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pageTitle: { color: COLORS.text, fontSize: 22, ...FONT.bold },
  addBtn: { backgroundColor: COLORS.gold, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: RADIUS.md },
  addText: { color: COLORS.black, fontSize: 13, ...FONT.bold },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.black },
  sectionTitle: { color: COLORS.text, fontSize: 15, ...FONT.bold },
  empty: { alignItems: 'center', paddingVertical: SPACING.xxl * 2, gap: SPACING.md },
  emptyIcon: { fontSize: 40 },
  emptyText: { color: COLORS.gold, fontSize: 16, ...FONT.medium },
});
