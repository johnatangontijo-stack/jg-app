import React, { useState, useCallback, useEffect } from 'react';
import {
  ScrollView, View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, Modal, TextInput,
} from 'react-native';
import { COLORS, SPACING, FONT, RADIUS } from '../../src/constants/theme';
import { supabase } from '../../src/lib/supabase';
import { Badge } from '../../src/components/ui/Badge';
import { Icon, IconText } from '../../src/components/ui/Icon';
import { setorIcon } from '../../src/constants/setores';

type Interesse = {
  id: string;
  cliente_id: string;
  setor: string;
  descricao: string | null;
  status: 'pendente' | 'em_contato' | 'conectado' | 'cancelado';
  created_at: string;
  atualizado_em: string | null;
  clientes: { nome_fantasia: string; nicho: string | null; ramo: string | null } | null;
};

const STATUS_BADGE = {
  pendente:   { label: 'Pendente',    variant: 'warning' as const },
  em_contato: { label: 'Em contato',  variant: 'gray'    as const },
  conectado:  { label: 'Conectado',   variant: 'success' as const },
  cancelado:  { label: 'Cancelado',   variant: 'danger'  as const },
};

type Filtro = 'todos' | 'pendente' | 'em_contato' | 'conectado';

export default function NetworkingInternoScreen() {
  const [interesses, setInteresses] = useState<Interesse[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [selected, setSelected] = useState<Interesse | null>(null);
  const [obs, setObs] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('networking_interesses')
      .select('*, clientes!cliente_id(nome_fantasia, nicho, ramo)')
      .order('created_at', { ascending: false });
    setInteresses((data ?? []) as unknown as Interesse[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const ch = supabase.channel(`networking-interno-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'networking_interesses' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  const updateStatus = async (id: string, status: Interesse['status']) => {
    setSaving(true);
    await supabase.from('networking_interesses').update({ status, atualizado_em: new Date().toISOString() }).eq('id', id);
    setSaving(false);
    setSelected(null);
    load();
  };

  const pendentes = interesses.filter(i => i.status === 'pendente').length;
  const lista = filtro === 'todos' ? interesses : interesses.filter(i => i.status === filtro);

  return (
    <>
      <ScrollView
        style={s.container}
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={COLORS.gold} />}
      >
        <View style={s.pageHeader}>
          <Text style={s.pageTitle}>Networking</Text>
          {pendentes > 0 && (
            <View style={s.badge}>
              <Text style={s.badgeText}>{pendentes} pendente{pendentes > 1 ? 's' : ''}</Text>
            </View>
          )}
          {loading && <ActivityIndicator color={COLORS.gold} size="small" />}
        </View>

        <Text style={s.pageDesc}>
          Gerencie as solicitações de conexão dos clientes. Eles não se veem — você faz a ponte.
        </Text>

        {/* Filtros */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={s.filtros}>
            {([
              { k: 'todos',      l: `Todos (${interesses.length})` },
              { k: 'pendente',   l: `Pendentes (${interesses.filter(i=>i.status==='pendente').length})` },
              { k: 'em_contato', l: `Em contato (${interesses.filter(i=>i.status==='em_contato').length})` },
              { k: 'conectado',  l: `Conectados (${interesses.filter(i=>i.status==='conectado').length})` },
            ] as const).map(f => (
              <TouchableOpacity
                key={f.k}
                style={[s.filtroBtn, filtro === f.k && s.filtroBtnActive]}
                onPress={() => setFiltro(f.k)}
              >
                <Text style={[s.filtroText, filtro === f.k && s.filtroTextActive]}>{f.l}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {lista.length === 0 && !loading && (
          <View style={s.emptyBox}>
            <Icon name="networking" size={36} color={COLORS.text3} />
            <Text style={s.emptyText}>Nenhuma solicitação nesta categoria.</Text>
          </View>
        )}

        {lista.map(item => {
          const info = STATUS_BADGE[item.status];
          return (
            <TouchableOpacity
              key={item.id}
              style={[s.card, item.status === 'pendente' && s.cardPendente]}
              onPress={() => { setSelected(item); setObs(''); }}
              activeOpacity={0.8}
            >
              <View style={s.cardTop}>
                <View style={s.cardEmoji}>
                  <Icon name={setorIcon(item.setor)} size={22} color={COLORS.gold} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.cardSetor}>{item.setor}</Text>
                  <IconText name="empresa" size={12} color={COLORS.text2} textStyle={s.cardCliente}>
                    {item.clientes?.nome_fantasia ?? '—'}{item.clientes?.ramo ? ` · ${item.clientes.ramo}` : ''}
                  </IconText>
                  {item.descricao && (
                    <Text style={s.cardDesc} numberOfLines={2}>"{item.descricao}"</Text>
                  )}
                </View>
                <Badge label={info.label} variant={info.variant} />
              </View>
              <Text style={s.cardData}>
                {new Date(item.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Modal ação */}
      <Modal visible={!!selected} transparent animationType="fade" onRequestClose={() => setSelected(null)}>
        <View style={s.overlay}>
          <View style={s.modal}>
            {selected && (
              <>
                <IconText name={setorIcon(selected.setor)} size={18} color={COLORS.gold} textStyle={s.modalTitle}>
                  {selected.setor}
                </IconText>
                <View style={s.modalInfo}>
                  <Text style={s.modalInfoLabel}>Cliente solicitante</Text>
                  <Text style={s.modalInfoVal}>{selected.clientes?.nome_fantasia}</Text>
                  {selected.clientes?.ramo && <Text style={s.modalInfoSub}>{selected.clientes.ramo}</Text>}
                </View>
                {selected.descricao && (
                  <View style={s.modalDescBox}>
                    <Text style={s.modalDescLabel}>O que precisam:</Text>
                    <Text style={s.modalDesc}>"{selected.descricao}"</Text>
                  </View>
                )}

                <Text style={s.modalActLabel}>Atualizar status:</Text>
                <View style={s.acoesGrid}>
                  {selected.status !== 'em_contato' && (
                    <TouchableOpacity
                      style={[s.acaoBtn, { borderColor: '#8b5cf6' }]}
                      onPress={() => updateStatus(selected.id, 'em_contato')}
                      disabled={saving}
                    >
                      <IconText name="emContato" size={14} color="#8b5cf6" textStyle={[s.acaoBtnText, { color: '#8b5cf6' }]}>
                        Em contato
                      </IconText>
                    </TouchableOpacity>
                  )}
                  {selected.status !== 'conectado' && (
                    <TouchableOpacity
                      style={[s.acaoBtn, { borderColor: COLORS.success }]}
                      onPress={() => updateStatus(selected.id, 'conectado')}
                      disabled={saving}
                    >
                      <IconText name="conectado" size={14} color={COLORS.success} textStyle={[s.acaoBtnText, { color: COLORS.success }]}>
                        Conectado
                      </IconText>
                    </TouchableOpacity>
                  )}
                  {selected.status !== 'cancelado' && (
                    <TouchableOpacity
                      style={[s.acaoBtn, { borderColor: COLORS.danger }]}
                      onPress={() => updateStatus(selected.id, 'cancelado')}
                      disabled={saving}
                    >
                      <IconText name="close" size={14} color={COLORS.danger} textStyle={[s.acaoBtnText, { color: COLORS.danger }]}>
                        Cancelar
                      </IconText>
                    </TouchableOpacity>
                  )}
                </View>

                <TouchableOpacity style={s.fecharBtn} onPress={() => setSelected(null)}>
                  <Text style={s.fecharText}>Fechar</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.black },
  content: { padding: SPACING.lg, gap: SPACING.md, paddingBottom: 48 },
  pageHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  pageTitle: { color: COLORS.text, fontSize: 22, ...FONT.bold, flex: 1 },
  badge: { backgroundColor: COLORS.warning, borderRadius: RADIUS.full, paddingHorizontal: SPACING.sm, paddingVertical: 3 },
  badgeText: { color: COLORS.black, fontSize: 11, ...FONT.bold },
  pageDesc: { color: COLORS.text3, fontSize: 13, lineHeight: 18 },
  filtros: { flexDirection: 'row', gap: SPACING.sm, paddingRight: SPACING.lg },
  filtroBtn: { paddingHorizontal: SPACING.md, paddingVertical: 6, borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.border },
  filtroBtnActive: { borderColor: COLORS.gold, backgroundColor: 'rgba(201,168,76,0.12)' },
  filtroText: { color: COLORS.text3, fontSize: 12 },
  filtroTextActive: { color: COLORS.gold, ...FONT.medium },
  emptyBox: { alignItems: 'center', paddingVertical: 48, gap: SPACING.sm },
  emptyText: { color: COLORS.text3, fontSize: 13 },
  card: { backgroundColor: COLORS.surface2, borderRadius: RADIUS.lg, padding: SPACING.md, gap: SPACING.xs, borderWidth: 1, borderColor: COLORS.borderWeak },
  cardPendente: { borderLeftWidth: 4, borderLeftColor: COLORS.warning },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm },
  cardEmoji: { width: 40, height: 40, borderRadius: RADIUS.full, backgroundColor: 'rgba(201,168,76,0.10)', borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  cardSetor: { color: COLORS.text, fontSize: 14, ...FONT.bold },
  cardCliente: { color: COLORS.text2, fontSize: 12, marginTop: 2 },
  cardDesc: { color: COLORS.text3, fontSize: 12, fontStyle: 'italic', marginTop: 2 },
  cardData: { color: COLORS.text3, fontSize: 10, marginLeft: 38 },
  // Modal
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: SPACING.lg },
  modal: { backgroundColor: COLORS.surface1, borderRadius: RADIUS.xl, padding: SPACING.lg, width: '100%', maxWidth: 420, gap: SPACING.md, borderWidth: 1, borderColor: COLORS.border },
  modalTitle: { color: COLORS.text, fontSize: 18, ...FONT.bold },
  modalInfo: { backgroundColor: COLORS.surface2, borderRadius: RADIUS.md, padding: SPACING.md, gap: 2 },
  modalInfoLabel: { color: COLORS.text3, fontSize: 11 },
  modalInfoVal: { color: COLORS.text, fontSize: 14, ...FONT.bold },
  modalInfoSub: { color: COLORS.text3, fontSize: 12 },
  modalDescBox: { backgroundColor: 'rgba(201,168,76,0.08)', borderRadius: RADIUS.md, padding: SPACING.md, borderWidth: 1, borderColor: 'rgba(201,168,76,0.2)', gap: 4 },
  modalDescLabel: { color: COLORS.text3, fontSize: 11 },
  modalDesc: { color: COLORS.text2, fontSize: 13, fontStyle: 'italic' },
  modalActLabel: { color: COLORS.text2, fontSize: 12, ...FONT.medium },
  acoesGrid: { gap: SPACING.sm },
  acaoBtn: { borderRadius: RADIUS.md, padding: SPACING.md, borderWidth: 1, alignItems: 'center' },
  acaoBtnText: { fontSize: 13, ...FONT.medium },
  fecharBtn: { padding: SPACING.md, alignItems: 'center' },
  fecharText: { color: COLORS.text3, fontSize: 14 },
});
