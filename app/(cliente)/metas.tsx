import React from 'react';
import { ScrollView, View, Text, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { COLORS, SPACING, FONT, RADIUS } from '../../src/constants/theme';
import { useMetas } from '../../src/hooks/useMetas';
import { Card } from '../../src/components/ui/Card';
import { ProgressBar } from '../../src/components/ui/ProgressBar';
import { CheckItem } from '../../src/components/ui/CheckItem';

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function diasRestantes() {
  const hoje = new Date();
  const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
  return fimMes.getDate() - hoje.getDate();
}

export default function MetasScreen() {
  const { meta, itensJG, itensCliente, pctJG, pctCliente, pctGeral, pctMeta, loading, error, toggleItem, reload } = useMetas();

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={COLORS.gold} /></View>;
  }

  const dias = diasRestantes();
  const falta = meta ? Math.max(0, meta.valor_meta - (meta.valor_atual ?? 0)) : 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} tintColor={COLORS.gold} />}
    >
      {error && <Text style={styles.errorText}>{error}</Text>}

      {meta ? (
        <>
          {/* Card objetivo */}
          <Card style={styles.metaCard}>
            <Text style={styles.metaLabel}>Objetivo do mês</Text>
            <Text style={styles.metaValor}>{fmtBRL(meta.valor_meta)}</Text>
            <ProgressBar value={pctMeta} showLabel />
            <View style={styles.metaInfo}>
              <Text style={styles.metaAtual}>Atual: {fmtBRL(meta.valor_atual ?? 0)}</Text>
              <Text style={styles.metaFalta}>Faltam {fmtBRL(falta)} · {dias} dias</Text>
            </View>
          </Card>

          {/* Aviso equipe */}
          <Card style={styles.infoCard}>
            <Text style={styles.infoIcon}>🤝</Text>
            <Text style={styles.infoText}>
              A meta é fruto do trabalho em equipe. Cada ação — sua e nossa — conta para chegar lá.
            </Text>
          </Card>

          {/* Grid % conclusão */}
          <View style={styles.pctGrid}>
            <View style={styles.pctCard}>
              <Text style={styles.pctVal}>{pctJG}%</Text>
              <Text style={styles.pctLabel}>JG concluiu</Text>
            </View>
            <View style={styles.pctCard}>
              <Text style={styles.pctVal}>{pctCliente}%</Text>
              <Text style={styles.pctLabel}>Você concluiu</Text>
            </View>
            <View style={[styles.pctCard, styles.pctCardGold]}>
              <Text style={[styles.pctVal, styles.goldText]}>{pctGeral}%</Text>
              <Text style={styles.pctLabel}>Geral</Text>
            </View>
          </View>

          {/* Itens JG */}
          {itensJG.length > 0 && (
            <Card style={styles.listCard}>
              <View style={styles.listHeader}>
                <View style={[styles.dot, { backgroundColor: COLORS.gold }]} />
                <Text style={styles.listTitle}>O que a JG vai entregar</Text>
              </View>
              {itensJG.map((item) => (
                <CheckItem
                  key={item.id}
                  label={item.descricao}
                  checked={item.concluido}
                  variant="jg"
                  tag={item.categoria ?? undefined}
                  disabled
                />
              ))}
            </Card>
          )}

          {/* Itens cliente */}
          {itensCliente.length > 0 && (
            <Card style={styles.listCard}>
              <View style={styles.listHeader}>
                <View style={[styles.dot, { backgroundColor: COLORS.info }]} />
                <Text style={styles.listTitle}>O que você precisa fazer</Text>
              </View>
              {itensCliente.map((item) => {
                const atrasado = !item.concluido && item.prazo ? new Date(item.prazo) < new Date() : false;
                return (
                  <CheckItem
                    key={item.id}
                    label={item.descricao}
                    checked={item.concluido}
                    onToggle={() => toggleItem(item)}
                    variant="client"
                    tag={item.categoria ?? undefined}
                    atrasado={atrasado}
                  />
                );
              })}
            </Card>
          )}

          <Card style={styles.footerCard}>
            <Text style={styles.footerText}>
              Alguma dificuldade? Avisa a gente.{' '}
              <Text style={styles.footerGold}>Deixa com a gente!</Text>
            </Text>
          </Card>
        </>
      ) : (
        <Card>
          <Text style={styles.vazio}>Nenhuma meta definida para este mês.</Text>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.black },
  content: { padding: SPACING.lg, gap: SPACING.lg, paddingBottom: SPACING.xxl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.black },
  errorText: { color: COLORS.danger, fontSize: 13 },
  metaCard: { gap: SPACING.sm, borderColor: COLORS.border },
  metaLabel: { color: COLORS.text2, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  metaValor: { color: COLORS.gold, fontSize: 32, ...FONT.bold },
  metaInfo: { flexDirection: 'row', justifyContent: 'space-between', marginTop: SPACING.xs },
  metaAtual: { color: COLORS.text2, fontSize: 12 },
  metaFalta: { color: COLORS.text3, fontSize: 12 },
  infoCard: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, borderColor: `${COLORS.info}33` },
  infoIcon: { fontSize: 22 },
  infoText: { flex: 1, color: COLORS.text2, fontSize: 13 },
  pctGrid: { flexDirection: 'row', gap: SPACING.sm },
  pctCard: { flex: 1, backgroundColor: COLORS.surface2, borderRadius: RADIUS.md, padding: SPACING.md, alignItems: 'center', gap: 4 },
  pctCardGold: { borderWidth: 1, borderColor: COLORS.border },
  pctVal: { color: COLORS.text, fontSize: 22, ...FONT.bold },
  goldText: { color: COLORS.gold },
  pctLabel: { color: COLORS.text3, fontSize: 10, textAlign: 'center' },
  listCard: { gap: SPACING.xs },
  listHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
  dot: { width: 8, height: 8, borderRadius: RADIUS.full },
  listTitle: { color: COLORS.text, fontSize: 14, ...FONT.bold },
  footerCard: { alignItems: 'center' },
  footerText: { color: COLORS.text2, fontSize: 13, textAlign: 'center' },
  footerGold: { color: COLORS.gold, ...FONT.medium },
  vazio: { color: COLORS.text3, fontSize: 13 },
});
