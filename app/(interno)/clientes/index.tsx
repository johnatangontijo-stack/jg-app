import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, FONT, RADIUS } from '../../../src/constants/theme';
import { supabase } from '../../../src/lib/supabase';
import { useAuthStore } from '../../../src/stores/authStore';
import { ClienteRow } from '../../../src/components/interno/ClienteRow';
import { MetricCard } from '../../../src/components/ui/MetricCard';
import { Database } from '../../../src/types/database';

type Cliente = Database['public']['Tables']['clientes']['Row'];
type Filtro = 'todos' | 'saudaveis' | 'atencao' | 'risco' | 'inadimplentes';

const FILTROS: { key: Filtro; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'saudaveis', label: 'Saudáveis' },
  { key: 'atencao', label: 'Atenção' },
  { key: 'risco', label: 'Risco' },
  { key: 'inadimplentes', label: 'Inadimpl.' },
];

function applyFiltro(clientes: Cliente[], filtro: Filtro) {
  switch (filtro) {
    case 'saudaveis': return clientes.filter((c) => c.health_score >= 70);
    case 'atencao': return clientes.filter((c) => c.health_score >= 50 && c.health_score < 70);
    case 'risco': return clientes.filter((c) => c.health_score < 50);
    case 'inadimplentes': return clientes.filter((c) => c.status === 'inadimplente');
    default: return clientes;
  }
}

export default function ClientesScreen() {
  const router = useRouter();
  const { profile } = useAuthStore();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('clientes').select('*').order('nome_fantasia');

    if (profile?.role !== 'admin' && profile?.role !== 'gerencia' && profile?.id) {
      query = query.eq('gestor_id', profile.id);
    }

    const { data } = await query;
    setClientes(data ?? []);
    setLoading(false);
  }, [profile]);

  useEffect(() => { load(); }, [load]);

  const buscados = clientes.filter((c) =>
    c.nome_fantasia.toLowerCase().includes(busca.toLowerCase())
  );
  const filtrados = applyFiltro(buscados, filtro);
  const paginated = filtrados.slice(0, (page + 1) * 20);

  const saudaveis = clientes.filter((c) => c.health_score >= 70).length;
  const atencao = clientes.filter((c) => c.health_score >= 50 && c.health_score < 70).length;
  const risco = clientes.filter((c) => c.health_score < 50).length;

  return (
    <View style={styles.container}>
      {/* Barra de busca + add */}
      <View style={styles.topBar}>
        <TextInput
          style={styles.searchInput}
          value={busca}
          onChangeText={setBusca}
          placeholder="Buscar cliente..."
          placeholderTextColor={COLORS.text3}
        />
        <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/(interno)/clientes/add')}>
          <Text style={styles.addText}>+ Novo</Text>
        </TouchableOpacity>
      </View>

      {/* KPIs */}
      <View style={styles.kpiRow}>
        <MetricCard label="Total" value={String(clientes.length)} style={styles.kpiCard} />
        <MetricCard label="OK" value={String(saudaveis)} style={styles.kpiCard} />
        <MetricCard label="Atenção" value={String(atencao)} style={styles.kpiCard} />
        <MetricCard label="Risco" value={String(risco)} style={styles.kpiCard} />
      </View>

      {/* Filtros */}
      <View style={styles.filtrosRow}>
        {FILTROS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filtroChip, filtro === f.key && styles.filtroActive]}
            onPress={() => setFiltro(f.key)}
            activeOpacity={0.8}
          >
            <Text style={[styles.filtroText, filtro === f.key && styles.filtroTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.gold} style={{ marginTop: SPACING.xl }} />
      ) : (
        <FlatList
          data={paginated}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ClienteRow
              cliente={item}
              onPress={() => router.push(`/(interno)/clientes/${item.id}`)}
            />
          )}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={COLORS.gold} />}
          onEndReached={() => setPage((p) => p + 1)}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={<Text style={styles.vazio}>Nenhum cliente encontrado.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.black },
  topBar: { padding: SPACING.lg, paddingBottom: SPACING.sm, flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  searchInput: { flex: 1, backgroundColor: COLORS.surface2, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.borderWeak, paddingHorizontal: SPACING.md, height: 44, color: COLORS.text, fontSize: 14 },
  addBtn: { backgroundColor: COLORS.gold, paddingHorizontal: SPACING.md, height: 44, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  addText: { color: COLORS.black, fontSize: 13, ...FONT.bold },
  kpiRow: { flexDirection: 'row', gap: SPACING.xs, paddingHorizontal: SPACING.lg, paddingBottom: SPACING.sm },
  kpiCard: { flex: 1 },
  filtrosRow: { flexDirection: 'row', gap: SPACING.xs, paddingHorizontal: SPACING.lg, paddingBottom: SPACING.sm },
  filtroChip: { paddingHorizontal: SPACING.md, paddingVertical: 6, borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.borderWeak, backgroundColor: COLORS.surface2 },
  filtroActive: { backgroundColor: COLORS.gold, borderColor: COLORS.gold },
  filtroText: { color: COLORS.text2, fontSize: 11, ...FONT.medium },
  filtroTextActive: { color: COLORS.black, ...FONT.bold },
  list: { padding: SPACING.lg, paddingTop: SPACING.sm },
  vazio: { color: COLORS.text3, fontSize: 13 },
});
