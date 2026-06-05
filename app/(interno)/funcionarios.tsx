import React, { useState, useEffect, useCallback } from 'react';
import { ScrollView, View, StyleSheet, ActivityIndicator, RefreshControl, Text } from 'react-native';
import { COLORS, SPACING, FONT } from '../../src/constants/theme';
import { supabase } from '../../src/lib/supabase';
import { FuncionarioCard } from '../../src/components/interno/FuncionarioCard';
import { Database } from '../../src/types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface FuncStats {
  npsScore: number;
  totalClientes: number;
  demandasHoje: number;
  producoesMes: number;
}

export default function FuncionariosScreen() {
  const [funcionarios, setFuncionarios] = useState<Profile[]>([]);
  const [statsMap, setStatsMap] = useState<Record<string, FuncStats>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .not('role', 'in', '(admin,cliente)')
      .eq('ativo', true)
      .order('nome');

    setFuncionarios(profiles ?? []);

    if (profiles && profiles.length > 0) {
      const mesAtual = new Date().toISOString().slice(0, 7);
      const hoje = new Date().toISOString().split('T')[0];

      const stats: Record<string, FuncStats> = {};
      await Promise.all(
        profiles.map(async (p) => {
          const [clientesRes, demandasRes, producoesRes, npsRes] = await Promise.all([
            supabase.from('clientes').select('id', { count: 'exact', head: true }).eq('gestor_id', p.id).eq('status', 'ativo'),
            supabase.from('demandas').select('id', { count: 'exact', head: true }).eq('responsavel_id', p.id).lte('prazo', hoje).neq('status', 'concluida'),
            supabase.from('producoes').select('id', { count: 'exact', head: true }).eq('responsavel_id', p.id).gte('created_at', `${mesAtual}-01`),
            supabase.from('nps_votos').select('nota').eq('funcionario_id', p.id),
          ]);

          const votos = npsRes.data ?? [];
          const promotores = votos.filter((v) => v.nota >= 9).length;
          const detratores = votos.filter((v) => v.nota <= 6).length;
          const npsScore = votos.length > 0 ? Math.round(((promotores - detratores) / votos.length) * 100) : 0;

          stats[p.id] = {
            npsScore,
            totalClientes: clientesRes.count ?? 0,
            demandasHoje: demandasRes.count ?? 0,
            producoesMes: producoesRes.count ?? 0,
          };
        })
      );
      setStatsMap(stats);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <View style={styles.center}><ActivityIndicator color={COLORS.gold} /></View>;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={COLORS.gold} />}
    >
      <Text style={styles.pageTitle}>Equipe</Text>
      {funcionarios.map((f) => {
        const stats = statsMap[f.id];
        return (
          <FuncionarioCard
            key={f.id}
            profile={f}
            npsScore={stats?.npsScore}
            totalClientes={stats?.totalClientes}
            demandasHoje={stats?.demandasHoje}
            producoesmes={stats?.producoesMes}
          />
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.black },
  content: { padding: SPACING.lg, gap: SPACING.lg, paddingBottom: SPACING.xxl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.black },
  pageTitle: { color: COLORS.text, fontSize: 22, ...FONT.bold },
});
