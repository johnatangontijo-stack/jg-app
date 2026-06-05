import React from 'react';
import { ScrollView, View, Text, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { COLORS, SPACING, FONT, RADIUS } from '../../src/constants/theme';
import { useTrafego } from '../../src/hooks/useTrafego';
import { Card } from '../../src/components/ui/Card';
import { MetricCard } from '../../src/components/ui/MetricCard';
import { Badge } from '../../src/components/ui/Badge';
import { ProgressBar } from '../../src/components/ui/ProgressBar';
import { CriativoCard } from '../../src/components/cliente/CriativoCard';

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function fmtNum(v: number | null | undefined) {
  return (v ?? 0).toLocaleString('pt-BR');
}

export default function TrafegoScreen() {
  const { metaSnap, googleSnap, criativos, metricas, loading, error, updatedAt, reload } = useTrafego();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.gold} />
      </View>
    );
  }

  const updatedText = updatedAt
    ? `Atualizado ${Math.round((Date.now() - updatedAt.getTime()) / 60000)} min atrás`
    : '';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} tintColor={COLORS.gold} />}
    >
      <View style={styles.headerRow}>
        <Text style={styles.pageTitle}>Performance de tráfego</Text>
        <Text style={styles.updated}>{updatedText}</Text>
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}

      {/* Grid métricas gerais */}
      <View style={styles.metricsGrid}>
        <MetricCard label="Investido" value={fmtBRL(metricas.totalInvestido)} goldValue />
        <MetricCard label="ROAS médio" value={metricas.roasMedio.toFixed(2) + 'x'} />
        <MetricCard label="Custo/lead" value={fmtBRL(metricas.cplMedio)} />
        <MetricCard label="Total leads" value={fmtNum(metricas.totalLeads)} />
      </View>

      {/* Meta Ads */}
      {metaSnap && (
        <Card>
          <View style={styles.platHeader}>
            <View style={[styles.platIcon, { backgroundColor: '#1877F2' }]}>
              <Text style={styles.platIconText}>f</Text>
            </View>
            <Text style={styles.platName}>Meta Ads</Text>
            <Badge
              label={metaSnap.investido > 0 ? 'Rodando' : 'Pausado'}
              variant={metaSnap.investido > 0 ? 'success' : 'gray'}
            />
          </View>
          <View style={styles.metaGrid}>
            <StatCell label="Investido" value={fmtBRL(metaSnap.investido)} />
            <StatCell label="Alcance" value={fmtNum(metaSnap.alcance)} />
            <StatCell label="Cliques" value={fmtNum(metaSnap.cliques)} />
            <StatCell label="Leads" value={fmtNum(metaSnap.leads)} />
            <StatCell label="Impressões" value={fmtNum(metaSnap.impressoes)} />
            <StatCell label="ROAS" value={(metaSnap.roas ?? 0).toFixed(2) + 'x'} gold />
          </View>
        </Card>
      )}

      {/* Google Ads */}
      {googleSnap && (
        <Card>
          <View style={styles.platHeader}>
            <View style={[styles.platIcon, { backgroundColor: '#EA4335' }]}>
              <Text style={styles.platIconText}>G</Text>
            </View>
            <Text style={styles.platName}>Google Ads</Text>
            <Badge
              label={googleSnap.investido > 0 ? 'Rodando' : 'Pausado'}
              variant={googleSnap.investido > 0 ? 'success' : 'gray'}
            />
          </View>
          <View style={styles.metaGrid}>
            <StatCell label="Investido" value={fmtBRL(googleSnap.investido)} />
            <StatCell label="Impressões" value={fmtNum(googleSnap.impressoes)} />
            <StatCell label="Cliques" value={fmtNum(googleSnap.cliques)} />
            <StatCell label="Conversões" value={fmtNum(googleSnap.conversoes)} />
            <StatCell label="CPC médio" value={fmtBRL(googleSnap.cpc ?? 0)} />
            <StatCell label="ROAS" value={(googleSnap.roas ?? 0).toFixed(2) + 'x'} gold />
          </View>
        </Card>
      )}

      {/* Criativos */}
      {criativos.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Criativos em veiculação</Text>
          <View style={styles.criativosGrid}>
            {criativos.map((c) => (
              <CriativoCard key={c.id} criativo={c} />
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

function StatCell({ label, value, gold }: { label: string; value: string; gold?: boolean }) {
  return (
    <View style={statStyles.cell}>
      <Text style={statStyles.label}>{label}</Text>
      <Text style={[statStyles.value, gold && statStyles.gold]}>{value}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  cell: {
    width: '33%',
    paddingVertical: SPACING.sm,
    alignItems: 'center',
  },
  label: { color: COLORS.text3, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  value: { color: COLORS.text, fontSize: 14, ...FONT.bold, marginTop: 2 },
  gold: { color: COLORS.gold },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.black },
  content: { padding: SPACING.lg, gap: SPACING.lg, paddingBottom: SPACING.xxl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.black },
  headerRow: { gap: 2 },
  pageTitle: { color: COLORS.text, fontSize: 18, ...FONT.bold },
  updated: { color: COLORS.text3, fontSize: 11 },
  errorText: { color: COLORS.danger, fontSize: 13 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  platHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.md },
  platIcon: { width: 28, height: 28, borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center' },
  platIconText: { color: '#fff', fontSize: 14, ...FONT.bold },
  platName: { flex: 1, color: COLORS.text, fontSize: 15, ...FONT.bold },
  metaGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  sectionTitle: { color: COLORS.text, fontSize: 16, ...FONT.bold },
  criativosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
});
