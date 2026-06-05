import React, { useState, useEffect } from 'react';
import {
  ScrollView, View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Modal, RefreshControl,
} from 'react-native';
import { COLORS, SPACING, FONT, RADIUS } from '../../src/constants/theme';
import { useAuthStore } from '../../src/stores/authStore';
import { supabase } from '../../src/lib/supabase';
import { Card } from '../../src/components/ui/Card';
import { Badge } from '../../src/components/ui/Badge';
import { GoldButton } from '../../src/components/ui/GoldButton';
import { Database } from '../../src/types/database';

type ClienteDNA = Database['public']['Tables']['cliente_dna']['Row'];
type ClienteAtivo = Database['public']['Tables']['cliente_ativos']['Row'];

export default function MarcaScreen() {
  const { clienteId } = useAuthStore();
  const [dna, setDna] = useState<ClienteDNA | null>(null);
  const [ativos, setAtivos] = useState<ClienteAtivo[]>([]);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState(false);
  const [form, setForm] = useState({ descricao: '', diferencial: '' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!clienteId) return;
    setLoading(true);
    const [dnaRes, ativosRes] = await Promise.all([
      supabase.from('cliente_dna').select('*').eq('cliente_id', clienteId).maybeSingle(),
      supabase.from('cliente_ativos').select('*').eq('cliente_id', clienteId),
    ]);
    setDna(dnaRes.data);
    setAtivos(ativosRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [clienteId]);

  const abrirEdit = () => {
    setForm({ descricao: dna?.descricao ?? '', diferencial: dna?.diferencial ?? '' });
    setEditModal(true);
  };

  const salvarEdit = async () => {
    if (!clienteId) return;
    setSaving(true);
    if (dna) {
      await supabase.from('cliente_dna').update(form).eq('id', dna.id);
    } else {
      await supabase.from('cliente_dna').insert({ cliente_id: clienteId, ...form, persona_interesses: [], tom_de_voz: [] });
    }
    await load();
    setSaving(false);
    setEditModal(false);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color={COLORS.gold} /></View>;

  const TIPOS_ATIVO: ClienteAtivo['tipo'][] = ['logo', 'paleta', 'fotos', 'videos'];
  const TIPO_ICONS: Record<string, string> = { logo: '🎨', paleta: '🖌', fotos: '📸', videos: '🎬' };

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={COLORS.gold} />}
      >
        {/* Quem somos */}
        <Card>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Quem somos</Text>
            <TouchableOpacity onPress={abrirEdit} activeOpacity={0.8}>
              <Text style={styles.editBtn}>Editar</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.bodyText}>{dna?.descricao ?? 'Nenhuma descrição cadastrada.'}</Text>
          {dna?.diferencial && (
            <>
              <Text style={styles.subLabel}>Diferencial</Text>
              <Text style={styles.bodyText}>{dna.diferencial}</Text>
            </>
          )}
        </Card>

        {/* Tom de voz */}
        {dna?.tom_de_voz && dna.tom_de_voz.length > 0 && (
          <Card>
            <Text style={styles.cardTitle}>Tom de voz</Text>
            <View style={styles.chips}>
              {dna.tom_de_voz.map((t) => (
                <Badge key={t} label={t} variant="gold" />
              ))}
            </View>
            {dna.exemplo_copy && (
              <Text style={styles.exCopy}>"{dna.exemplo_copy}"</Text>
            )}
          </Card>
        )}

        {/* Público-alvo */}
        {dna?.persona_descricao && (
          <Card>
            <Text style={styles.cardTitle}>Público-alvo</Text>
            <Text style={styles.bodyText}>{dna.persona_descricao}</Text>
            {dna.persona_interesses.length > 0 && (
              <View style={styles.chips}>
                {dna.persona_interesses.map((i) => (
                  <Badge key={i} label={i} variant="info" />
                ))}
              </View>
            )}
          </Card>
        )}

        {/* Ativos da marca */}
        <Card>
          <Text style={styles.cardTitle}>Ativos da marca</Text>
          <View style={styles.ativosGrid}>
            {TIPOS_ATIVO.map((tipo) => {
              const ativo = ativos.find((a) => a.tipo === tipo);
              return (
                <TouchableOpacity key={tipo} style={styles.ativoCell} activeOpacity={0.8}>
                  <Text style={styles.ativoIcon}>{TIPO_ICONS[tipo]}</Text>
                  <Text style={styles.ativoLabel}>{tipo.charAt(0).toUpperCase() + tipo.slice(1)}</Text>
                  {ativo ? (
                    <Badge label="Salvo" variant="success" />
                  ) : (
                    <Text style={styles.ativoAdd}>+ Adicionar</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>
      </ScrollView>

      <Modal visible={editModal} transparent animationType="slide" onRequestClose={() => setEditModal(false)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.modalTitle}>Editar informações</Text>
            <Text style={styles.inputLabel}>Descrição</Text>
            <TextInput
              style={styles.textInput}
              value={form.descricao}
              onChangeText={(v) => setForm((f) => ({ ...f, descricao: v }))}
              placeholder="Quem é sua empresa..."
              placeholderTextColor={COLORS.text3}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            <Text style={styles.inputLabel}>Diferencial</Text>
            <TextInput
              style={styles.textInput}
              value={form.diferencial}
              onChangeText={(v) => setForm((f) => ({ ...f, diferencial: v }))}
              placeholder="O que te diferencia..."
              placeholderTextColor={COLORS.text3}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            <View style={styles.modalActions}>
              <GoldButton label="Cancelar" onPress={() => setEditModal(false)} variant="ghost" style={styles.flex} />
              <GoldButton label="Salvar" onPress={salvarEdit} loading={saving} style={styles.flex} />
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
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.sm },
  cardTitle: { color: COLORS.text, fontSize: 15, ...FONT.bold },
  editBtn: { color: COLORS.gold, fontSize: 13 },
  subLabel: { color: COLORS.text3, fontSize: 11, marginTop: SPACING.sm, marginBottom: 2, textTransform: 'uppercase' },
  bodyText: { color: COLORS.text2, fontSize: 14, lineHeight: 20 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs, marginTop: SPACING.sm },
  exCopy: { color: COLORS.gold, fontSize: 13, fontStyle: 'italic', marginTop: SPACING.sm },
  ativosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginTop: SPACING.sm },
  ativoCell: { width: '47%', backgroundColor: COLORS.surface2, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.borderWeak, padding: SPACING.md, alignItems: 'center', gap: SPACING.xs },
  ativoIcon: { fontSize: 28 },
  ativoLabel: { color: COLORS.text, fontSize: 13, ...FONT.medium },
  ativoAdd: { color: COLORS.gold, fontSize: 11 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: COLORS.surface2, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: SPACING.xxl, gap: SPACING.md },
  modalTitle: { color: COLORS.text, fontSize: 18, ...FONT.bold },
  inputLabel: { color: COLORS.text3, fontSize: 12 },
  textInput: { backgroundColor: COLORS.surface3, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.borderWeak, padding: SPACING.md, color: COLORS.text, fontSize: 14, minHeight: 80 },
  modalActions: { flexDirection: 'row', gap: SPACING.sm },
  flex: { flex: 1 },
});
