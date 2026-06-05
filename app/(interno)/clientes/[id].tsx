import React, { useState, useEffect } from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { COLORS, SPACING, FONT, RADIUS } from '../../../src/constants/theme';
import { supabase } from '../../../src/lib/supabase';
import { Card } from '../../../src/components/ui/Card';
import { Badge } from '../../../src/components/ui/Badge';
import { ProgressBar } from '../../../src/components/ui/ProgressBar';
import { Avatar } from '../../../src/components/ui/Avatar';
import { Database } from '../../../src/types/database';

type Cliente = Database['public']['Tables']['clientes']['Row'];
type Aba = 'visao' | 'producoes' | 'metas' | 'trafego' | 'financeiro';

const ABAS: { key: Aba; label: string }[] = [
  { key: 'visao', label: 'Visão geral' },
  { key: 'producoes', label: 'Produções' },
  { key: 'metas', label: 'Metas' },
  { key: 'trafego', label: 'Tráfego' },
  { key: 'financeiro', label: 'Financeiro' },
];

function healthColor(score: number) {
  if (score >= 70) return COLORS.success;
  if (score >= 50) return COLORS.warning;
  return COLORS.danger;
}

export default function ClientePerfilScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [aba, setAba] = useState<Aba>('visao');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    supabase.from('clientes').select('*').eq('id', id).single()
      .then(({ data }) => { setCliente(data); setLoading(false); });
  }, [id]);

  if (loading || !cliente) {
    return <View style={styles.center}><ActivityIndicator color={COLORS.gold} /></View>;
  }

  const hColor = healthColor(cliente.health_score);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Avatar name={cliente.nome_fantasia} size={48} />
        <View style={styles.headerInfo}>
          <Text style={styles.nome}>{cliente.nome_fantasia}</Text>
          <Badge
            label={cliente.status}
            variant={cliente.status === 'ativo' ? 'success' : cliente.status === 'inadimplente' ? 'danger' : 'warning'}
          />
        </View>
        <View style={styles.scoreWrap}>
          <Text style={[styles.score, { color: hColor }]}>{cliente.health_score}</Text>
          <Text style={styles.scoreLabel}>health</Text>
        </View>
      </View>

      {/* Progress bar health */}
      <View style={styles.healthBar}>
        <ProgressBar value={cliente.health_score} color={hColor} height={4} />
      </View>

      {/* Abas */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.abasScroll}>
        <View style={styles.abasRow}>
          {ABAS.map((a) => (
            <TouchableOpacity
              key={a.key}
              style={[styles.abaChip, aba === a.key && styles.abaActive]}
              onPress={() => setAba(a.key)}
              activeOpacity={0.8}
            >
              <Text style={[styles.abaText, aba === a.key && styles.abaTextActive]}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Conteúdo da aba */}
      <ScrollView contentContainerStyle={styles.abaContent}>
        {aba === 'visao' && (
          <>
            <Card>
              <Text style={styles.cardTitle}>Dados gerais</Text>
              <InfoRow label="Razão social" value={cliente.razao_social ?? '—'} />
              <InfoRow label="CNPJ" value={cliente.cnpj ?? '—'} />
              <InfoRow label="Segmento" value={cliente.segmento ?? '—'} />
              <InfoRow label="Mensalidade" value={cliente.mensalidade.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} />
              <InfoRow label="Renovação" value={new Date(cliente.data_renovacao).toLocaleDateString('pt-BR')} />
              <InfoRow label="Campanha" value={cliente.campanha_status} />
            </Card>
          </>
        )}
        {aba !== 'visao' && (
          <View style={styles.abaEmpty}>
            <Text style={styles.abaEmptyText}>Dados de {ABAS.find((a) => a.key === aba)?.label} serão carregados aqui.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={infoStyles.row}>
      <Text style={infoStyles.label}>{label}</Text>
      <Text style={infoStyles.value}>{value}</Text>
    </View>
  );
}

const infoStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.borderWeak },
  label: { color: COLORS.text3, fontSize: 13 },
  value: { color: COLORS.text, fontSize: 13, ...FONT.medium },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.black },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.black },
  header: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, padding: SPACING.lg, paddingBottom: SPACING.md },
  back: { color: COLORS.gold, fontSize: 22, ...FONT.bold },
  headerInfo: { flex: 1, gap: SPACING.xs },
  nome: { color: COLORS.text, fontSize: 16, ...FONT.bold },
  scoreWrap: { alignItems: 'center' },
  score: { fontSize: 24, ...FONT.bold },
  scoreLabel: { color: COLORS.text3, fontSize: 10 },
  healthBar: { paddingHorizontal: SPACING.lg, marginBottom: SPACING.sm },
  abasScroll: { borderBottomWidth: 1, borderBottomColor: COLORS.borderWeak },
  abasRow: { flexDirection: 'row', gap: SPACING.xs, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm },
  abaChip: { paddingHorizontal: SPACING.md, paddingVertical: 6, borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.borderWeak },
  abaActive: { backgroundColor: COLORS.gold, borderColor: COLORS.gold },
  abaText: { color: COLORS.text2, fontSize: 12, ...FONT.medium },
  abaTextActive: { color: COLORS.black, ...FONT.bold },
  abaContent: { padding: SPACING.lg, gap: SPACING.lg, paddingBottom: SPACING.xxl },
  cardTitle: { color: COLORS.text, fontSize: 15, ...FONT.bold, marginBottom: SPACING.sm },
  abaEmpty: { alignItems: 'center', paddingVertical: SPACING.xxl },
  abaEmptyText: { color: COLORS.text3, fontSize: 13 },
});
