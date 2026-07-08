import React, { useState, useEffect, useCallback } from 'react';
import {
  ScrollView, View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl, Modal,
} from 'react-native';
import { Redirect } from 'expo-router';
import { COLORS, SPACING, FONT, RADIUS } from '../../src/constants/theme';
import { supabase } from '../../src/lib/supabase';
import { useAuthStore } from '../../src/stores/authStore';
import { Badge } from '../../src/components/ui/Badge';
import { Icon, IconText } from '../../src/components/ui/Icon';

type Membro = { id: string; nome: string; role: string };
type ClienteRow = { id: string; nome_fantasia: string; gestor_id: string | null };
type VotoRow = { funcionario_id: string | null; nota: number };

const ROLES_ACESSO = ['admin', 'gerencia'];

const notaColor = (nota: number) =>
  nota >= 9 ? COLORS.success : nota >= 7 ? COLORS.warning : COLORS.danger;

export default function GestaoScreen() {
  const { profile } = useAuthStore();
  if (profile && !ROLES_ACESSO.includes(profile.role)) return <Redirect href="/(interno)/dashboard" />;

  const [equipe, setEquipe] = useState<Membro[]>([]);
  const [clientes, setClientes] = useState<ClienteRow[]>([]);
  const [votos, setVotos] = useState<VotoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [reatribuindo, setReatribuindo] = useState<ClienteRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [eqRes, clRes, vtRes] = await Promise.all([
      supabase.from('profiles').select('id, nome, role').eq('ativo', true).neq('role', 'cliente').order('nome'),
      supabase.from('clientes').select('id, nome_fantasia, gestor_id').order('nome_fantasia'),
      supabase.from('nps_votos').select('funcionario_id, nota'),
    ]);
    setEquipe((eqRes.data ?? []) as Membro[]);
    setClientes((clRes.data ?? []) as ClienteRow[]);
    setVotos((vtRes.data ?? []) as VotoRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const atribuirGestor = async (clienteId: string, gestorId: string) => {
    await supabase.from('clientes').update({ gestor_id: gestorId || null }).eq('id', clienteId);
    setReatribuindo(null);
    await load();
  };

  const gestorPorId = Object.fromEntries(equipe.map((m) => [m.id, m.nome]));

  const statsPorGestor = equipe
    .map((m) => {
      const votosDele = votos.filter((v) => v.funcionario_id === m.id);
      const avg = votosDele.length ? votosDele.reduce((s, v) => s + v.nota, 0) / votosDele.length : null;
      const qtdClientes = clientes.filter((c) => c.gestor_id === m.id).length;
      return { ...m, avg, qtdVotos: votosDele.length, qtdClientes };
    })
    .sort((a, b) => (b.avg ?? -1) - (a.avg ?? -1));

  const semGestor = clientes.filter((c) => !c.gestor_id).length;

  const clientesFiltrados = clientes.filter((c) =>
    c.nome_fantasia.toLowerCase().includes(busca.toLowerCase())
  );

  if (loading) return <View style={s.center}><ActivityIndicator color={COLORS.gold} /></View>;

  return (
    <>
      <ScrollView
        style={s.container}
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={COLORS.gold} />}
      >
        <Text style={s.title}>Gestão de Clientes</Text>
        <Text style={s.subtitle}>
          Vincule cada cliente ao gestor responsável para acompanhar o NPS por gestor.
          {semGestor > 0 && ` ${semGestor} cliente${semGestor !== 1 ? 's' : ''} sem gestor definido.`}
        </Text>

        <Text style={s.sectionTitle}>NPS por gestor</Text>
        {statsPorGestor.length === 0 && (
          <View style={s.emptyBox}><Text style={s.emptyText}>Nenhum membro de equipe ativo.</Text></View>
        )}
        <View style={s.gestorGrid}>
          {statsPorGestor.map((g) => (
            <View key={g.id} style={s.gestorCard}>
              <Text style={s.gestorNome} numberOfLines={1}>{g.nome}</Text>
              <Text style={[s.gestorNps, { color: g.avg != null ? notaColor(g.avg) : COLORS.text3 }]}>
                {g.avg != null ? g.avg.toFixed(1) : '—'}
              </Text>
              <Text style={s.gestorMeta}>
                {g.qtdVotos} voto{g.qtdVotos !== 1 ? 's' : ''} · {g.qtdClientes} cliente{g.qtdClientes !== 1 ? 's' : ''}
              </Text>
            </View>
          ))}
        </View>

        <Text style={s.sectionTitle}>Clientes ({clientesFiltrados.length})</Text>
        <TextInput
          style={s.searchInput}
          value={busca}
          onChangeText={setBusca}
          placeholder="Buscar cliente..."
          placeholderTextColor={COLORS.text3}
        />

        {clientesFiltrados.map((c) => (
          <View key={c.id} style={s.clienteRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.clienteNome} numberOfLines={1}>{c.nome_fantasia}</Text>
              {c.gestor_id && gestorPorId[c.gestor_id] ? (
                <IconText name="usuario" size={11} color={COLORS.text3} textStyle={s.clienteGestor}>
                  {gestorPorId[c.gestor_id]}
                </IconText>
              ) : (
                <Badge label="sem gestor" variant="warning" />
              )}
            </View>
            <TouchableOpacity style={s.trocarBtn} onPress={() => setReatribuindo(c)}>
              <Icon name="send" size={14} color={COLORS.gold} />
              <Text style={s.trocarBtnText}>Trocar</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      <Modal visible={!!reatribuindo} transparent animationType="fade" onRequestClose={() => setReatribuindo(null)}>
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>Atribuir gestor</Text>
            <Text style={s.modalSub} numberOfLines={1}>{reatribuindo?.nome_fantasia}</Text>
            <ScrollView style={{ maxHeight: 320 }}>
              <TouchableOpacity style={s.membroBtn} onPress={() => atribuirGestor(reatribuindo!.id, '')}>
                <Text style={s.membroBtnText}>— Nenhum (remover gestor)</Text>
              </TouchableOpacity>
              {equipe.map((m) => (
                <TouchableOpacity
                  key={m.id}
                  style={[s.membroBtn, reatribuindo?.gestor_id === m.id && s.membroBtnActive]}
                  onPress={() => atribuirGestor(reatribuindo!.id, m.id)}
                >
                  <Text style={[s.membroBtnText, reatribuindo?.gestor_id === m.id && { color: COLORS.gold }]}>
                    {m.nome}
                  </Text>
                  <Text style={s.membroRole}>{m.role}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={s.modalCancel} onPress={() => setReatribuindo(null)}>
              <Text style={s.modalCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.black },
  content: { padding: SPACING.lg, gap: SPACING.md, paddingBottom: 48 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.black },
  title: { color: COLORS.text, fontSize: 22, ...FONT.bold },
  subtitle: { color: COLORS.text3, fontSize: 12 },
  sectionTitle: { color: COLORS.text, fontSize: 16, ...FONT.bold, marginTop: SPACING.sm },
  emptyBox: { padding: SPACING.lg, alignItems: 'center' },
  emptyText: { color: COLORS.text3, fontSize: 13 },
  gestorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  gestorCard: { width: '48%', backgroundColor: COLORS.surface1, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, gap: 4 },
  gestorNome: { color: COLORS.text2, fontSize: 12, ...FONT.medium },
  gestorNps: { fontSize: 24, ...FONT.bold },
  gestorMeta: { color: COLORS.text3, fontSize: 11 },
  searchInput: { backgroundColor: COLORS.surface2, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.borderWeak, paddingHorizontal: SPACING.md, height: 44, color: COLORS.text, fontSize: 14 },
  clienteRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: COLORS.surface2, borderRadius: RADIUS.md, padding: SPACING.md },
  clienteNome: { color: COLORS.text, fontSize: 13, ...FONT.medium },
  clienteGestor: { color: COLORS.text3, fontSize: 11 },
  trocarBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: SPACING.sm, paddingVertical: 6, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.gold },
  trocarBtnText: { color: COLORS.gold, fontSize: 12, ...FONT.medium },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: SPACING.lg },
  modalBox: { backgroundColor: COLORS.surface1, borderRadius: RADIUS.lg, padding: SPACING.lg, width: '100%', maxWidth: 400, gap: SPACING.md, borderWidth: 1, borderColor: COLORS.border },
  modalTitle: { color: COLORS.text, fontSize: 16, ...FONT.bold },
  modalSub: { color: COLORS.text3, fontSize: 12 },
  membroBtn: { paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  membroBtnActive: { backgroundColor: 'rgba(201,168,76,0.08)', borderRadius: RADIUS.sm, paddingHorizontal: SPACING.sm },
  membroBtnText: { color: COLORS.text2, fontSize: 13 },
  membroRole: { color: COLORS.text3, fontSize: 11 },
  modalCancel: { alignItems: 'center', paddingTop: SPACING.sm },
  modalCancelText: { color: COLORS.text3, fontSize: 14 },
});
