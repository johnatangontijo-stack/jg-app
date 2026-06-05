import React, { useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator } from 'react-native';
import { COLORS, SPACING, FONT, RADIUS } from '../../src/constants/theme';
import { useNPS } from '../../src/hooks/useNPS';
import { Card } from '../../src/components/ui/Card';
import { GoldButton } from '../../src/components/ui/GoldButton';
import { ProgressBar } from '../../src/components/ui/ProgressBar';

function notaColor(nota: number) {
  if (nota >= 9) return COLORS.success;
  if (nota >= 7) return COLORS.warning;
  return COLORS.danger;
}

export default function NPSScreen() {
  const { pesquisa, meuVoto, score, promotores, detratores, neutros, total, loading, votar } = useNPS();
  const [notaSel, setNotaSel] = useState<number | null>(null);
  const [comentario, setComentario] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [sent, setSent] = useState(false);

  const handleVotar = async () => {
    if (notaSel === null) return;
    setEnviando(true);
    try {
      await votar(notaSel, comentario);
      setSent(true);
    } finally {
      setEnviando(false);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color={COLORS.gold} /></View>;

  const pctProm = total > 0 ? (promotores / total) * 100 : 0;
  const pctNeutr = total > 0 ? (neutros / total) * 100 : 0;
  const pctDetr = total > 0 ? (detratores / total) * 100 : 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Score */}
      <Card style={styles.scoreCard}>
        <Text style={styles.scoreLabel}>NPS do mês</Text>
        <Text style={[styles.scoreVal, { color: score >= 70 ? COLORS.success : score >= 50 ? COLORS.warning : COLORS.danger }]}>
          {score}
        </Text>
        <View style={styles.barTricolor}>
          <View style={[styles.barSeg, { flex: pctProm || 1, backgroundColor: COLORS.success }]} />
          <View style={[styles.barSeg, { flex: pctNeutr || 1, backgroundColor: COLORS.warning }]} />
          <View style={[styles.barSeg, { flex: pctDetr || 1, backgroundColor: COLORS.danger }]} />
        </View>
        <View style={styles.barLegend}>
          <Text style={[styles.legText, { color: COLORS.success }]}>{promotores} Promotores</Text>
          <Text style={[styles.legText, { color: COLORS.warning }]}>{neutros} Neutros</Text>
          <Text style={[styles.legText, { color: COLORS.danger }]}>{detratores} Detratores</Text>
        </View>
      </Card>

      {/* Votação */}
      {!meuVoto && !sent && pesquisa ? (
        <Card>
          <Text style={styles.voteTitle}>Como você avalia nossos serviços?</Text>
          <Text style={styles.voteHint}>0 = Péssimo · 10 = Excelente</Text>
          <View style={styles.notasRow}>
            {Array.from({ length: 11 }, (_, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.notaBtn, notaSel === i && styles.notaBtnSel, { borderColor: notaColor(i) }]}
                onPress={() => setNotaSel(i)}
                activeOpacity={0.8}
              >
                <Text style={[styles.notaText, { color: notaSel === i ? COLORS.black : notaColor(i) }]}>{i}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {notaSel !== null && (
            <TextInput
              style={styles.comentInput}
              value={comentario}
              onChangeText={setComentario}
              placeholder="Comentário opcional..."
              placeholderTextColor={COLORS.text3}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          )}
          <GoldButton
            label="Enviar avaliação"
            onPress={handleVotar}
            loading={enviando}
            disabled={notaSel === null}
            style={{ marginTop: SPACING.sm }}
          />
        </Card>
      ) : (meuVoto || sent) ? (
        <Card style={styles.votadoCard}>
          <Text style={styles.votadoIcon}>✓</Text>
          <Text style={styles.votadoTitle}>Obrigado pela avaliação!</Text>
          <Text style={styles.votadoSub}>Deixa com a gente!</Text>
        </Card>
      ) : (
        <Card>
          <Text style={styles.vazio}>Nenhuma pesquisa ativa no momento.</Text>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.black },
  content: { padding: SPACING.lg, gap: SPACING.lg, paddingBottom: SPACING.xxl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.black },
  scoreCard: { alignItems: 'center', gap: SPACING.sm, borderColor: COLORS.border },
  scoreLabel: { color: COLORS.text2, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 },
  scoreVal: { fontSize: 64, ...FONT.bold, lineHeight: 72 },
  barTricolor: { flexDirection: 'row', height: 8, borderRadius: RADIUS.full, overflow: 'hidden', width: '100%' },
  barSeg: { height: '100%' },
  barLegend: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  legText: { fontSize: 11, ...FONT.medium },
  voteTitle: { color: COLORS.text, fontSize: 16, ...FONT.bold, marginBottom: SPACING.xs },
  voteHint: { color: COLORS.text3, fontSize: 12, marginBottom: SPACING.md },
  notasRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  notaBtn: { width: 42, height: 42, borderRadius: RADIUS.md, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surface3 },
  notaBtnSel: { backgroundColor: COLORS.gold },
  notaText: { fontSize: 14, ...FONT.bold },
  comentInput: { backgroundColor: COLORS.surface3, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.borderWeak, padding: SPACING.md, color: COLORS.text, fontSize: 14, minHeight: 80, marginTop: SPACING.md },
  votadoCard: { alignItems: 'center', gap: SPACING.md, paddingVertical: SPACING.xl },
  votadoIcon: { fontSize: 40, color: COLORS.success },
  votadoTitle: { color: COLORS.text, fontSize: 20, ...FONT.bold },
  votadoSub: { color: COLORS.gold, fontSize: 14 },
  vazio: { color: COLORS.text3, fontSize: 13 },
});
