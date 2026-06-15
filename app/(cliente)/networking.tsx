import React, { useState, useEffect, useCallback } from 'react';
import {
  ScrollView, View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, TextInput, Modal,
} from 'react-native';
import { COLORS, SPACING, FONT, RADIUS } from '../../src/constants/theme';
import { supabase } from '../../src/lib/supabase';
import { useAuthStore } from '../../src/stores/authStore';
import { Icon, IconText, type IconName } from '../../src/components/ui/Icon';
import { setorIcon } from '../../src/constants/setores';

type Interesse = {
  id: string;
  setor: string;
  descricao: string | null;
  status: 'pendente' | 'em_contato' | 'conectado' | 'cancelado';
  created_at: string;
};

const STATUS_INFO = {
  pendente:    { label: 'Aguardando JG', color: COLORS.warning,  icon: 'aguardando' as IconName },
  em_contato:  { label: 'Em contato',    color: '#8b5cf6',        icon: 'emContato'  as IconName },
  conectado:   { label: 'Conectado!',    color: COLORS.success,   icon: 'conectado'  as IconName },
  cancelado:   { label: 'Cancelado',     color: COLORS.text3,     icon: 'close'      as IconName },
};

export default function NetworkingClienteScreen() {
  const { profile } = useAuthStore();
  const [clienteId, setClienteId] = useState<string | null>(null);
  const [setores, setSetores] = useState<string[]>([]);
  const [meuNicho, setMeuNicho] = useState<string | null>(null);
  const [interesses, setInteresses] = useState<Interesse[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal interesse
  const [modalSetor, setModalSetor] = useState<string | null>(null);
  const [descricao, setDescricao] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);

    // Pegar cliente_id
    const { data: cu } = await supabase
      .from('cliente_usuarios')
      .select('cliente_id')
      .eq('profile_id', profile.id)
      .maybeSingle();

    const cid = cu?.cliente_id ?? null;
    setClienteId(cid);

    if (!cid) { setLoading(false); return; }

    // Pegar nicho do próprio cliente
    const { data: meCliente } = await supabase
      .from('clientes')
      .select('nicho')
      .eq('id', cid)
      .maybeSingle();
    setMeuNicho(meCliente?.nicho ?? null);

    // Setores disponíveis via view pública (não expõe nomes de clientes)
    const { data: setoresData } = await supabase
      .from('networking_setores_disponiveis')
      .select('nicho');

    // Excluir o próprio nicho do cliente
    const nichos = (setoresData ?? [])
      .map((r: any) => r.nicho)
      .filter((n: string) => n && n !== meCliente?.nicho) as string[];
    setSetores(nichos);

    // Meus interesses
    const { data: intData } = await supabase
      .from('networking_interesses')
      .select('*')
      .eq('cliente_id', cid)
      .order('created_at', { ascending: false });
    setInteresses((intData ?? []) as Interesse[]);

    setLoading(false);
  }, [profile]);

  useEffect(() => { load(); }, [load]);

  const solicitar = async () => {
    if (!clienteId || !modalSetor) return;
    setSaving(true);
    await supabase.from('networking_interesses').upsert({
      cliente_id: clienteId,
      setor: modalSetor,
      descricao: descricao.trim() || null,
      status: 'pendente',
    }, { onConflict: 'cliente_id,setor' });
    setSaving(false);
    setModalSetor(null);
    setDescricao('');
    load();
  };

  const interesseDoSetor = (setor: string) => interesses.find(i => i.setor === setor);

  if (loading) {
    return <View style={s.center}><ActivityIndicator color={COLORS.gold} /></View>;
  }

  if (!clienteId) {
    return (
      <View style={s.center}>
        <Text style={s.emptyText}>Perfil não vinculado a nenhum cliente.</Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={s.container}
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={COLORS.gold} />}
      >
        {/* Header */}
        <View style={s.headerBox}>
          <IconText name="networking" size={18} color={COLORS.gold} textStyle={s.headerTitle}>
            Networking JG
          </IconText>
          <Text style={s.headerSub}>
            Conheça os setores que atendemos e solicite uma conexão estratégica. Nossa equipe fará a ponte com discrição.
          </Text>
        </View>

        {/* Meu nicho */}
        {meuNicho && (
          <View style={s.meuNichoBox}>
            <Text style={s.meuNichoLabel}>Seu setor na rede JG</Text>
            <IconText name={setorIcon(meuNicho)} size={15} color={COLORS.gold} textStyle={s.meuNichoVal}>
              {meuNicho}
            </IconText>
          </View>
        )}

        {/* Setores disponíveis */}
        <Text style={s.sectionTitle}>Setores disponíveis para conexão</Text>

        {setores.length === 0 && (
          <View style={s.emptyBox}>
            <Text style={s.emptyText}>Nenhum setor disponível no momento.</Text>
          </View>
        )}

        {setores.map(setor => {
          const interesse = interesseDoSetor(setor);
          const info = interesse ? STATUS_INFO[interesse.status] : null;

          return (
            <View key={setor} style={[s.card, interesse && { borderLeftColor: info!.color, borderLeftWidth: 4 }]}>
              <View style={s.cardLeft}>
                <View style={s.cardEmoji}>
                  <Icon name={setorIcon(setor)} size={22} color={COLORS.gold} />
                </View>
                <View>
                  <Text style={s.cardSetor}>{setor}</Text>
                  {interesse && (
                    <IconText name={info!.icon} size={12} color={info!.color} textStyle={[s.cardStatus, { color: info!.color }]}>
                      {info!.label}
                    </IconText>
                  )}
                  {interesse?.descricao && (
                    <Text style={s.cardDesc} numberOfLines={1}>"{interesse.descricao}"</Text>
                  )}
                </View>
              </View>

              {!interesse || interesse.status === 'cancelado' ? (
                <TouchableOpacity
                  style={s.solicitarBtn}
                  onPress={() => { setModalSetor(setor); setDescricao(''); }}
                  activeOpacity={0.8}
                >
                  <Text style={s.solicitarBtnText}>Solicitar</Text>
                </TouchableOpacity>
              ) : (
                <View style={[s.statusBadge, { backgroundColor: info!.color + '22' }]}>
                  <Icon name={info!.icon} size={16} color={info!.color} />
                </View>
              )}
            </View>
          );
        })}

        {/* Minhas solicitações */}
        {interesses.filter(i => i.status !== 'cancelado').length > 0 && (
          <>
            <Text style={[s.sectionTitle, { marginTop: SPACING.md }]}>Minhas solicitações</Text>
            {interesses.filter(i => i.status !== 'cancelado').map(i => {
              const info = STATUS_INFO[i.status];
              return (
                <View key={i.id} style={s.minhaRow}>
                  <View style={s.minhaEmoji}>
                    <Icon name={setorIcon(i.setor)} size={18} color={COLORS.gold} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.minhaSetor}>{i.setor}</Text>
                    <IconText name={info.icon} size={12} color={info.color} textStyle={[s.minhaStatus, { color: info.color }]}>
                      {info.label}
                    </IconText>
                  </View>
                  <Text style={s.minhaData}>
                    {new Date(i.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                  </Text>
                </View>
              );
            })}
          </>
        )}

        <View style={s.footer}>
          <IconText name="lock" size={13} color={COLORS.text3} textStyle={s.footerText} style={{ alignItems: 'flex-start' }}>
            Sua identidade e a dos outros clientes são preservadas. A JG Gontijo cuida de cada conexão com responsabilidade.
          </IconText>
        </View>
      </ScrollView>

      {/* Modal solicitar */}
      <Modal visible={!!modalSetor} transparent animationType="fade" onRequestClose={() => setModalSetor(null)}>
        <View style={s.overlay}>
          <View style={s.modal}>
            <IconText name={setorIcon(modalSetor)} size={18} color={COLORS.gold} textStyle={s.modalTitle}>
              {modalSetor}
            </IconText>
            <Text style={s.modalSub}>
              Você está solicitando uma conexão com uma empresa do setor <Text style={{ color: COLORS.gold }}>{modalSetor}</Text>. Nossa equipe entrará em contato para fazer a ponte.
            </Text>
            <Text style={s.modalLabel}>O que você precisa? (opcional)</Text>
            <TextInput
              style={s.modalInput}
              value={descricao}
              onChangeText={setDescricao}
              placeholder="Ex: Preciso de um fornecedor de peças automotivas..."
              placeholderTextColor={COLORS.text3}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            <TouchableOpacity
              style={[s.confirmarBtn, saving && { opacity: 0.6 }]}
              onPress={solicitar}
              disabled={saving}
              activeOpacity={0.8}
            >
              {saving
                ? <ActivityIndicator color={COLORS.black} size="small" />
                : <IconText name="conectado" size={15} color={COLORS.black} textStyle={s.confirmarBtnText}>
                    Enviar Solicitação
                  </IconText>
              }
            </TouchableOpacity>
            <TouchableOpacity style={s.cancelBtn} onPress={() => setModalSetor(null)}>
              <Text style={s.cancelText}>Cancelar</Text>
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
  headerBox: { backgroundColor: COLORS.surface2, borderRadius: RADIUS.lg, padding: SPACING.lg, gap: SPACING.sm, borderWidth: 1, borderColor: COLORS.border },
  headerTitle: { color: COLORS.text, fontSize: 18, ...FONT.bold },
  headerSub: { color: COLORS.text2, fontSize: 13, lineHeight: 19 },
  meuNichoBox: { backgroundColor: 'rgba(201,168,76,0.08)', borderRadius: RADIUS.md, padding: SPACING.md, borderWidth: 1, borderColor: 'rgba(201,168,76,0.25)' },
  meuNichoLabel: { color: COLORS.text3, fontSize: 11 },
  meuNichoVal: { color: COLORS.gold, fontSize: 15, ...FONT.bold, marginTop: 2 },
  sectionTitle: { color: COLORS.text2, fontSize: 12, ...FONT.medium, textTransform: 'uppercase', letterSpacing: 0.5 },
  emptyBox: { padding: SPACING.xl, alignItems: 'center' },
  emptyText: { color: COLORS.text3, fontSize: 13 },
  card: { backgroundColor: COLORS.surface2, borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.borderWeak, flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  cardLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  cardEmoji: { width: 42, height: 42, borderRadius: RADIUS.full, backgroundColor: 'rgba(201,168,76,0.10)', borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  cardSetor: { color: COLORS.text, fontSize: 14, ...FONT.bold },
  cardStatus: { fontSize: 12, marginTop: 2 },
  cardDesc: { color: COLORS.text3, fontSize: 11, fontStyle: 'italic', marginTop: 2 },
  solicitarBtn: { backgroundColor: 'rgba(201,168,76,0.12)', borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderWidth: 1, borderColor: COLORS.gold },
  solicitarBtnText: { color: COLORS.gold, fontSize: 12, ...FONT.medium },
  statusBadge: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  minhaRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, backgroundColor: COLORS.surface1, borderRadius: RADIUS.md, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border },
  minhaEmoji: { width: 36, height: 36, borderRadius: RADIUS.full, backgroundColor: 'rgba(201,168,76,0.10)', borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  minhaSetor: { color: COLORS.text, fontSize: 13, ...FONT.medium },
  minhaStatus: { fontSize: 12, marginTop: 2 },
  minhaData: { color: COLORS.text3, fontSize: 11 },
  footer: { backgroundColor: COLORS.surface1, borderRadius: RADIUS.md, padding: SPACING.md, marginTop: SPACING.sm },
  footerText: { color: COLORS.text3, fontSize: 12, lineHeight: 17, flex: 1 },
  // Modal
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: SPACING.lg },
  modal: { backgroundColor: COLORS.surface1, borderRadius: RADIUS.lg, padding: SPACING.lg, width: '100%', maxWidth: 420, gap: SPACING.sm, borderWidth: 1, borderColor: COLORS.border },
  modalTitle: { color: COLORS.text, fontSize: 18, ...FONT.bold },
  modalSub: { color: COLORS.text2, fontSize: 13, lineHeight: 18 },
  modalLabel: { color: COLORS.text2, fontSize: 12, ...FONT.medium, marginTop: SPACING.xs },
  modalInput: { backgroundColor: COLORS.surface2, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: SPACING.md, color: COLORS.text, fontSize: 14, minHeight: 80 },
  confirmarBtn: { backgroundColor: COLORS.gold, borderRadius: RADIUS.md, padding: SPACING.md, alignItems: 'center', marginTop: SPACING.sm },
  confirmarBtnText: { color: COLORS.black, fontSize: 14, ...FONT.bold },
  cancelBtn: { padding: SPACING.md, alignItems: 'center' },
  cancelText: { color: COLORS.text3, fontSize: 14 },
});
