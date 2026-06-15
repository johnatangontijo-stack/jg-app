import React, { useState, useCallback, useEffect } from 'react';
import {
  ScrollView, View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, TextInput, Modal,
} from 'react-native';
import { COLORS, SPACING, FONT, RADIUS } from '../../src/constants/theme';
import { supabase } from '../../src/lib/supabase';
import { ProgressBar } from '../../src/components/ui/ProgressBar';
import { GoldButton } from '../../src/components/ui/GoldButton';
import { Icon, IconText } from '../../src/components/ui/Icon';

type Cliente = { id: string; nome_fantasia: string };
type Meta = {
  id: string; cliente_id: string; mes: string;
  valor_meta: number; valor_atual: number; descricao: string | null;
};
type MetaItem = {
  id: string; meta_id: string; descricao: string;
  responsavel: 'jg' | 'cliente'; categoria: string | null;
  concluido: boolean; prazo: string | null;
};

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

export default function MetasInternoScreen() {
  const now = new Date();
  const [mesSel, setMesSel] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteSel, setClienteSel] = useState<Cliente | null>(null);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [itens, setItens] = useState<MetaItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Modal nova meta
  const [modalMeta, setModalMeta] = useState(false);
  const [formMeta, setFormMeta] = useState({ valor_meta: '', valor_atual: '', descricao: '' });
  const [savingMeta, setSavingMeta] = useState(false);

  // Modal novo item
  const [modalItem, setModalItem] = useState(false);
  const [formItem, setFormItem] = useState({ descricao: '', responsavel: 'jg' as 'jg' | 'cliente', categoria: '', prazo: '' });
  const [savingItem, setSavingItem] = useState(false);

  useEffect(() => {
    supabase.from('clientes').select('id, nome_fantasia').eq('status', 'ativo').order('nome_fantasia')
      .then(({ data }) => setClientes(data ?? []));
  }, []);

  const load = useCallback(async () => {
    if (!clienteSel) return;
    setLoading(true);
    const { data: metaData } = await supabase
      .from('metas').select('*').eq('cliente_id', clienteSel.id).eq('mes', mesSel).maybeSingle();
    setMeta(metaData as Meta | null);
    if (metaData) {
      const { data: itensData } = await supabase
        .from('meta_itens').select('*').eq('meta_id', metaData.id).order('created_at');
      setItens((itensData ?? []) as MetaItem[]);
    } else {
      setItens([]);
    }
    setLoading(false);
  }, [clienteSel, mesSel]);

  useEffect(() => { load(); }, [load]);

  const salvarMeta = async () => {
    if (!clienteSel || !formMeta.valor_meta) return;
    setSavingMeta(true);
    await supabase.from('metas').upsert({
      cliente_id: clienteSel.id,
      mes: mesSel,
      valor_meta: parseFloat(formMeta.valor_meta.replace(',', '.')),
      valor_atual: parseFloat(formMeta.valor_atual.replace(',', '.') || '0'),
      descricao: formMeta.descricao || null,
    }, { onConflict: 'cliente_id,mes' });
    setSavingMeta(false);
    setModalMeta(false);
    setFormMeta({ valor_meta: '', valor_atual: '', descricao: '' });
    load();
  };

  const salvarItem = async () => {
    if (!meta || !formItem.descricao.trim()) return;
    setSavingItem(true);
    await supabase.from('meta_itens').insert({
      meta_id: meta.id,
      descricao: formItem.descricao.trim(),
      responsavel: formItem.responsavel,
      categoria: formItem.categoria || null,
      prazo: formItem.prazo || null,
    });
    setSavingItem(false);
    setModalItem(false);
    setFormItem({ descricao: '', responsavel: 'jg', categoria: '', prazo: '' });
    load();
  };

  const toggleItem = async (item: MetaItem) => {
    await supabase.from('meta_itens').update({
      concluido: !item.concluido,
      concluido_em: !item.concluido ? new Date().toISOString() : null,
    }).eq('id', item.id);
    load();
  };

  const deleteItem = async (id: string) => {
    await supabase.from('meta_itens').delete().eq('id', id);
    load();
  };

  const itensJG = itens.filter(i => i.responsavel === 'jg');
  const itensCliente = itens.filter(i => i.responsavel === 'cliente');
  const pct = meta ? Math.min(100, Math.round(((meta.valor_atual) / meta.valor_meta) * 100)) : 0;
  const pctJG = itensJG.length > 0 ? Math.round((itensJG.filter(i => i.concluido).length / itensJG.length) * 100) : 0;
  const pctCli = itensCliente.length > 0 ? Math.round((itensCliente.filter(i => i.concluido).length / itensCliente.length) * 100) : 0;

  return (
    <>
      <ScrollView style={s.container} contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={COLORS.gold} />}>

        <Text style={s.title}>Metas</Text>

        {/* Seletor de mês */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={s.mesRow}>
            {Array.from({ length: 12 }, (_, i) => {
              const val = `${now.getFullYear()}-${String(i + 1).padStart(2, '0')}`;
              const ativo = mesSel === val;
              return (
                <TouchableOpacity key={val} style={[s.mesBtn, ativo && s.mesBtnActive]} onPress={() => setMesSel(val)}>
                  <Text style={[s.mesText, ativo && s.mesTextActive]}>{MESES[i]}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* Seletor de cliente */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>Cliente</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
              {clientes.map(c => (
                <TouchableOpacity key={c.id}
                  style={[s.clienteChip, clienteSel?.id === c.id && s.clienteChipActive]}
                  onPress={() => setClienteSel(c)}>
                  <Text style={[s.clienteChipText, clienteSel?.id === c.id && s.clienteChipTextActive]}>
                    {c.nome_fantasia}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {!clienteSel && (
          <View style={s.emptyBox}><Text style={s.emptyText}>Selecione um cliente acima.</Text></View>
        )}

        {clienteSel && loading && <ActivityIndicator color={COLORS.gold} style={{ marginTop: 20 }} />}

        {clienteSel && !loading && !meta && (
          <View style={s.semMeta}>
            <Text style={s.semMetaText}>Nenhuma meta definida para {clienteSel.nome_fantasia} em {mesSel}.</Text>
            <TouchableOpacity style={s.criarBtn} onPress={() => { setFormMeta({ valor_meta: '', valor_atual: '', descricao: '' }); setModalMeta(true); }}>
              <Text style={s.criarBtnText}>+ Criar meta para este mês</Text>
            </TouchableOpacity>
          </View>
        )}

        {meta && (
          <>
            {/* Card objetivo */}
            <View style={s.metaCard}>
              <View style={s.metaHeaderRow}>
                <View>
                  <Text style={s.metaLabel}>Meta — {clienteSel?.nome_fantasia}</Text>
                  <Text style={s.metaValor}>{fmt(meta.valor_meta)}</Text>
                </View>
                <TouchableOpacity style={s.editBtn} onPress={() => {
                  setFormMeta({
                    valor_meta: String(meta.valor_meta),
                    valor_atual: String(meta.valor_atual),
                    descricao: meta.descricao ?? '',
                  });
                  setModalMeta(true);
                }}>
                  <Text style={s.editBtnText}>Editar</Text>
                </TouchableOpacity>
              </View>
              <View style={s.metaAtualRow}>
                <Text style={s.metaAtualLabel}>Realizado:</Text>
                <Text style={s.metaAtualVal}>{fmt(meta.valor_atual)}</Text>
                <Text style={s.metaPct}>{pct}%</Text>
              </View>
              <ProgressBar value={pct} showLabel={false} />
              {meta.descricao && <Text style={s.metaDesc}>{meta.descricao}</Text>}
            </View>

            {/* Progresso check items */}
            <View style={s.pctRow}>
              <View style={s.pctCard}>
                <Text style={s.pctVal}>{pctJG}%</Text>
                <Text style={s.pctLabel}>JG concluiu</Text>
              </View>
              <View style={s.pctCard}>
                <Text style={s.pctVal}>{pctCli}%</Text>
                <Text style={s.pctLabel}>Cliente concluiu</Text>
              </View>
            </View>

            {/* Itens JG */}
            <View style={s.section}>
              <View style={s.sectionHeaderRow}>
                <View style={[s.dot, { backgroundColor: COLORS.gold }]} />
                <Text style={s.sectionTitle}>O que a JG vai entregar ({itensJG.length})</Text>
                <TouchableOpacity onPress={() => { setFormItem({ descricao: '', responsavel: 'jg', categoria: '', prazo: '' }); setModalItem(true); }}>
                  <Text style={s.addItemText}>+ add</Text>
                </TouchableOpacity>
              </View>
              {itensJG.map(item => <ItemRow key={item.id} item={item} onToggle={() => toggleItem(item)} onDelete={() => deleteItem(item.id)} />)}
              {itensJG.length === 0 && <Text style={s.emptyText}>Nenhum item ainda.</Text>}
            </View>

            {/* Itens cliente */}
            <View style={s.section}>
              <View style={s.sectionHeaderRow}>
                <View style={[s.dot, { backgroundColor: COLORS.info }]} />
                <Text style={s.sectionTitle}>O que o cliente precisa fazer ({itensCliente.length})</Text>
                <TouchableOpacity onPress={() => { setFormItem({ descricao: '', responsavel: 'cliente', categoria: '', prazo: '' }); setModalItem(true); }}>
                  <Text style={s.addItemText}>+ add</Text>
                </TouchableOpacity>
              </View>
              {itensCliente.map(item => <ItemRow key={item.id} item={item} onToggle={() => toggleItem(item)} onDelete={() => deleteItem(item.id)} />)}
              {itensCliente.length === 0 && <Text style={s.emptyText}>Nenhum item ainda.</Text>}
            </View>
          </>
        )}
      </ScrollView>

      {/* Modal — Meta */}
      <Modal visible={modalMeta} transparent animationType="fade" onRequestClose={() => setModalMeta(false)}>
        <View style={s.overlay}>
          <View style={s.modal}>
            <IconText name="metas" size={16} color={COLORS.gold} textStyle={s.modalTitle}>Meta — {mesSel}</IconText>
            <Text style={s.modalLabel}>Valor da meta (R$) *</Text>
            <TextInput style={s.modalInput} value={formMeta.valor_meta} onChangeText={v => setFormMeta(f => ({ ...f, valor_meta: v }))}
              placeholder="Ex: 50000" placeholderTextColor={COLORS.text3} keyboardType="decimal-pad" />
            <Text style={s.modalLabel}>Valor realizado até agora (R$)</Text>
            <TextInput style={s.modalInput} value={formMeta.valor_atual} onChangeText={v => setFormMeta(f => ({ ...f, valor_atual: v }))}
              placeholder="0" placeholderTextColor={COLORS.text3} keyboardType="decimal-pad" />
            <Text style={s.modalLabel}>Descrição / observação</Text>
            <TextInput style={[s.modalInput, { height: 70, textAlignVertical: 'top' }]} value={formMeta.descricao}
              onChangeText={v => setFormMeta(f => ({ ...f, descricao: v }))} placeholder="Objetivo estratégico do mês..."
              placeholderTextColor={COLORS.text3} multiline />
            <GoldButton label="Salvar Meta" onPress={salvarMeta} loading={savingMeta} style={{ marginTop: SPACING.md }} />
            <TouchableOpacity style={s.cancelBtn} onPress={() => setModalMeta(false)}>
              <Text style={s.cancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal — Item */}
      <Modal visible={modalItem} transparent animationType="fade" onRequestClose={() => setModalItem(false)}>
        <View style={s.overlay}>
          <View style={s.modal}>
            <IconText name="list" size={16} color={COLORS.gold} textStyle={s.modalTitle}>Novo Item</IconText>
            <Text style={s.modalLabel}>Descrição *</Text>
            <TextInput style={s.modalInput} value={formItem.descricao} onChangeText={v => setFormItem(f => ({ ...f, descricao: v }))}
              placeholder="Ex: Criar 8 posts para Instagram..." placeholderTextColor={COLORS.text3} />
            <Text style={s.modalLabel}>Responsável</Text>
            <View style={{ flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm }}>
              {(['jg', 'cliente'] as const).map(r => (
                <TouchableOpacity key={r} style={[s.respBtn, formItem.responsavel === r && s.respBtnActive]}
                  onPress={() => setFormItem(f => ({ ...f, responsavel: r }))}>
                  <IconText name={r === 'jg' ? 'empresa' : 'usuario'} size={13}
                    color={formItem.responsavel === r ? COLORS.gold : COLORS.text2}
                    textStyle={[s.respBtnText, formItem.responsavel === r && { color: COLORS.gold }]}>
                    {r === 'jg' ? 'JG Gontijo' : 'Cliente'}
                  </IconText>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={s.modalLabel}>Categoria (opcional)</Text>
            <TextInput style={s.modalInput} value={formItem.categoria} onChangeText={v => setFormItem(f => ({ ...f, categoria: v }))}
              placeholder="Ex: Social Media, Tráfego..." placeholderTextColor={COLORS.text3} />
            <Text style={s.modalLabel}>Prazo (opcional)</Text>
            <TextInput style={s.modalInput} value={formItem.prazo} onChangeText={v => setFormItem(f => ({ ...f, prazo: v }))}
              placeholder="AAAA-MM-DD" placeholderTextColor={COLORS.text3} />
            <GoldButton label="Adicionar Item" onPress={salvarItem} loading={savingItem} style={{ marginTop: SPACING.md }} />
            <TouchableOpacity style={s.cancelBtn} onPress={() => setModalItem(false)}>
              <Text style={s.cancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

function ItemRow({ item, onToggle, onDelete }: { item: MetaItem; onToggle: () => void; onDelete: () => void }) {
  return (
    <View style={[s.itemRow, item.concluido && s.itemRowDone]}>
      <TouchableOpacity onPress={onToggle} style={[s.checkBox, item.concluido && s.checkBoxDone]} activeOpacity={0.7}>
        {item.concluido && <Text style={s.checkMark}>✓</Text>}
      </TouchableOpacity>
      <View style={{ flex: 1 }}>
        <Text style={[s.itemDesc, item.concluido && s.itemDescDone]}>{item.descricao}</Text>
        {item.categoria && <Text style={s.itemCat}>{item.categoria}</Text>}
        {item.prazo && <IconText name="agenda" size={11} color={COLORS.text3} textStyle={s.itemPrazo}>{new Date(item.prazo + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</IconText>}
      </View>
      <TouchableOpacity onPress={onDelete} style={s.deleteBtn}>
        <Icon name="close" size={16} color={COLORS.text3} />
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.black },
  content: { padding: SPACING.lg, gap: SPACING.md, paddingBottom: 48 },
  title: { color: COLORS.text, fontSize: 22, ...FONT.bold },
  mesRow: { flexDirection: 'row', gap: SPACING.sm, paddingVertical: SPACING.xs },
  mesBtn: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.border },
  mesBtnActive: { borderColor: COLORS.gold, backgroundColor: 'rgba(201,168,76,0.15)' },
  mesText: { color: COLORS.text3, fontSize: 12 },
  mesTextActive: { color: COLORS.gold, ...FONT.medium },
  section: { gap: SPACING.sm },
  sectionLabel: { color: COLORS.text2, fontSize: 12, ...FONT.medium },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  sectionTitle: { flex: 1, color: COLORS.text, fontSize: 13, ...FONT.bold },
  dot: { width: 8, height: 8, borderRadius: 4 },
  addItemText: { color: COLORS.gold, fontSize: 12, ...FONT.medium },
  clienteChip: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.border },
  clienteChipActive: { borderColor: COLORS.gold, backgroundColor: 'rgba(201,168,76,0.15)' },
  clienteChipText: { color: COLORS.text3, fontSize: 12 },
  clienteChipTextActive: { color: COLORS.gold, ...FONT.medium },
  emptyBox: { padding: SPACING.xl, alignItems: 'center' },
  emptyText: { color: COLORS.text3, fontSize: 13 },
  semMeta: { backgroundColor: COLORS.surface1, borderRadius: RADIUS.lg, padding: SPACING.lg, gap: SPACING.md, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  semMetaText: { color: COLORS.text2, fontSize: 13, textAlign: 'center' },
  criarBtn: { backgroundColor: 'rgba(201,168,76,0.12)', borderRadius: RADIUS.md, padding: SPACING.md, alignItems: 'center', borderWidth: 1, borderColor: COLORS.gold },
  criarBtnText: { color: COLORS.gold, ...FONT.medium },
  metaCard: { backgroundColor: COLORS.surface1, borderRadius: RADIUS.lg, padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.border, gap: SPACING.sm },
  metaHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  metaLabel: { color: COLORS.text3, fontSize: 11 },
  metaValor: { color: COLORS.gold, fontSize: 28, ...FONT.bold },
  metaAtualRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  metaAtualLabel: { color: COLORS.text3, fontSize: 12 },
  metaAtualVal: { color: COLORS.text, fontSize: 14, ...FONT.bold },
  metaPct: { color: COLORS.gold, fontSize: 12, ...FONT.medium, marginLeft: 'auto' },
  metaDesc: { color: COLORS.text3, fontSize: 12, fontStyle: 'italic', marginTop: SPACING.xs },
  editBtn: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.border },
  editBtnText: { color: COLORS.text3, fontSize: 12 },
  pctRow: { flexDirection: 'row', gap: SPACING.sm },
  pctCard: { flex: 1, backgroundColor: COLORS.surface1, borderRadius: RADIUS.md, padding: SPACING.md, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: COLORS.border },
  pctVal: { color: COLORS.text, fontSize: 20, ...FONT.bold },
  pctLabel: { color: COLORS.text3, fontSize: 10 },
  itemRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm, backgroundColor: COLORS.surface1, borderRadius: RADIUS.md, padding: SPACING.sm, borderWidth: 1, borderColor: COLORS.border },
  itemRowDone: { opacity: 0.65 },
  checkBox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: COLORS.border, backgroundColor: COLORS.surface2, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  checkBoxDone: { backgroundColor: COLORS.gold, borderColor: COLORS.gold },
  checkMark: { color: COLORS.black, fontSize: 13, fontWeight: '700' },
  itemDesc: { color: COLORS.text, fontSize: 13 },
  itemDescDone: { color: COLORS.text3, textDecorationLine: 'line-through' },
  itemCat: { color: COLORS.text3, fontSize: 11, marginTop: 2 },
  itemPrazo: { color: COLORS.text3, fontSize: 11 },
  deleteBtn: { padding: 4 },
  deleteBtnText: { color: COLORS.text3, fontSize: 12 },
  // Modal
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: SPACING.lg },
  modal: { backgroundColor: COLORS.surface1, borderRadius: RADIUS.lg, padding: SPACING.lg, width: '100%', maxWidth: 420, gap: SPACING.sm, borderWidth: 1, borderColor: COLORS.border },
  modalTitle: { color: COLORS.text, fontSize: 16, ...FONT.bold, marginBottom: SPACING.xs },
  modalLabel: { color: COLORS.text2, fontSize: 12, ...FONT.medium },
  modalInput: { backgroundColor: COLORS.surface2, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: SPACING.md, color: COLORS.text, fontSize: 14, height: 48 },
  respBtn: { flex: 1, padding: SPACING.sm, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  respBtnActive: { borderColor: COLORS.gold, backgroundColor: 'rgba(201,168,76,0.1)' },
  respBtnText: { color: COLORS.text3, fontSize: 12 },
  cancelBtn: { padding: SPACING.md, alignItems: 'center' },
  cancelText: { color: COLORS.text3, fontSize: 14 },
});
