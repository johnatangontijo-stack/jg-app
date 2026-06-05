import React, { useState } from 'react';
import {
  ScrollView, View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, TextInput, Modal, RefreshControl,
} from 'react-native';
import { COLORS, SPACING, FONT, RADIUS } from '../../src/constants/theme';
import { useProducoes } from '../../src/hooks/useProducoes';
import { GoldButton } from '../../src/components/ui/GoldButton';
import { Badge } from '../../src/components/ui/Badge';
import { ProducaoCard } from '../../src/components/cliente/ProducaoCard';
import { Database } from '../../src/types/database';

type Producao = Database['public']['Tables']['producoes']['Row'];
type Filtro = 'todos' | 'agendada' | 'editando' | 'aprovada';

export default function ProducoesScreen() {
  const { producoes, aguardando, loading, error, aprovar, reprovar, reload } = useProducoes();
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [reprovarModal, setReprovarModal] = useState<Producao | null>(null);
  const [motivo, setMotivo] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const FILTROS: { key: Filtro; label: string }[] = [
    { key: 'todos', label: 'Todos' },
    { key: 'agendada', label: 'Agendada' },
    { key: 'editando', label: 'Editando' },
    { key: 'aprovada', label: 'Aprovada' },
  ];

  const filtradas = filtro === 'todos' ? producoes : producoes.filter((p) => p.status === filtro);

  const handleAprovar = async (id: string) => {
    setActionLoading(id);
    try { await aprovar(id); } finally { setActionLoading(null); }
  };

  const handleReprovar = async () => {
    if (!reprovarModal || !motivo.trim()) return;
    setActionLoading(reprovarModal.id);
    try {
      await reprovar(reprovarModal.id, motivo.trim());
      setReprovarModal(null);
      setMotivo('');
    } finally { setActionLoading(null); }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={COLORS.gold} /></View>;
  }

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} tintColor={COLORS.gold} />}
      >
        {error && <Text style={styles.errorText}>{error}</Text>}

        {/* Aguardando aprovação */}
        {aguardando.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Aguardando aprovação</Text>
            {aguardando.map((p) => (
              <View key={p.id} style={[styles.aprovCard, { borderColor: COLORS.gold }]}>
                <Text style={styles.aprovTitulo}>{p.titulo}</Text>
                <Text style={styles.aprovMeta}>
                  {p.tipo.toUpperCase()} · Enviado em {new Date(p.created_at).toLocaleDateString('pt-BR')}
                </Text>
                <View style={styles.aprovPreview}>
                  <Text style={styles.aprovPreviewIcon}>▶</Text>
                  <Text style={styles.aprovPreviewText}>
                    Assistir{p.duracao_segundos ? ` · ${Math.floor(p.duracao_segundos / 60)}:${String(p.duracao_segundos % 60).padStart(2, '0')}` : ''}
                  </Text>
                </View>
                <View style={styles.aprovActions}>
                  <GoldButton
                    label="✓ Aprovar"
                    onPress={() => handleAprovar(p.id)}
                    loading={actionLoading === p.id}
                    style={styles.flex}
                  />
                  <GoldButton
                    label="✗ Ajuste"
                    onPress={() => setReprovarModal(p)}
                    variant="danger"
                    style={styles.flex}
                  />
                </View>
              </View>
            ))}
          </>
        )}

        {/* Filtros */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtrosScroll}>
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
        </ScrollView>

        {/* Lista */}
        {filtradas.length === 0 ? (
          <Text style={styles.vazio}>Nenhuma produção encontrada.</Text>
        ) : (
          filtradas.map((p) => <ProducaoCard key={p.id} producao={p} />)
        )}
      </ScrollView>

      {/* Modal reprovar */}
      <Modal visible={!!reprovarModal} transparent animationType="slide" onRequestClose={() => setReprovarModal(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Solicitar ajuste</Text>
            <Text style={styles.modalSub}>Descreva o que precisa ser alterado:</Text>
            <TextInput
              style={styles.motivoInput}
              value={motivo}
              onChangeText={setMotivo}
              placeholder="Ex: Mudar a cor do texto, ajustar o áudio..."
              placeholderTextColor={COLORS.text3}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <View style={styles.modalActions}>
              <GoldButton label="Cancelar" onPress={() => setReprovarModal(null)} variant="ghost" style={styles.flex} />
              <GoldButton
                label="Enviar"
                onPress={handleReprovar}
                loading={!!actionLoading}
                variant="danger"
                style={styles.flex}
              />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.black },
  content: { padding: SPACING.lg, gap: SPACING.lg, paddingBottom: SPACING.xxl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.black },
  errorText: { color: COLORS.danger, fontSize: 13 },
  sectionTitle: { color: COLORS.text, fontSize: 16, ...FONT.bold },
  aprovCard: { backgroundColor: COLORS.surface2, borderRadius: RADIUS.lg, borderWidth: 1, padding: SPACING.lg, gap: SPACING.md },
  aprovTitulo: { color: COLORS.text, fontSize: 16, ...FONT.bold },
  aprovMeta: { color: COLORS.text3, fontSize: 12 },
  aprovPreview: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: COLORS.surface3, borderRadius: RADIUS.md, padding: SPACING.md },
  aprovPreviewIcon: { color: COLORS.gold, fontSize: 18 },
  aprovPreviewText: { color: COLORS.text2, fontSize: 14 },
  aprovActions: { flexDirection: 'row', gap: SPACING.sm },
  flex: { flex: 1 },
  filtrosScroll: { marginHorizontal: -SPACING.lg },
  filtrosRow: { flexDirection: 'row', gap: SPACING.sm, paddingHorizontal: SPACING.lg },
  filtroChip: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.borderWeak, backgroundColor: COLORS.surface2 },
  filtroActive: { backgroundColor: COLORS.gold, borderColor: COLORS.gold },
  filtroText: { color: COLORS.text2, fontSize: 13, ...FONT.medium },
  filtroTextActive: { color: COLORS.black, ...FONT.bold },
  vazio: { color: COLORS.text3, fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: COLORS.surface2, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: SPACING.xxl, gap: SPACING.md },
  modalTitle: { color: COLORS.danger, fontSize: 18, ...FONT.bold },
  modalSub: { color: COLORS.text3, fontSize: 13 },
  motivoInput: { backgroundColor: COLORS.surface3, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.borderWeak, padding: SPACING.md, color: COLORS.text, fontSize: 14, minHeight: 100 },
  modalActions: { flexDirection: 'row', gap: SPACING.sm },
});
