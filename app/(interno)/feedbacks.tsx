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
import { GoldButton } from '../../src/components/ui/GoldButton';
import { Icon, IconText } from '../../src/components/ui/Icon';

type Feedback = {
  id: string;
  cliente_id: string;
  tipo: 'elogio' | 'sugestao' | 'reclamacao';
  mensagem: string;
  respondido: boolean;
  resposta: string | null;
  respondido_em: string | null;
  designado_para_id: string | null;
  created_at: string;
  clientes: { nome_fantasia: string } | null;
  designado_para: { nome: string } | null;
};

type Membro = { id: string; nome: string; role: string };

const TIPO_COLOR: Record<string, string> = {
  elogio: COLORS.success,
  sugestao: COLORS.warning,
  reclamacao: COLORS.danger,
};

// Alinhado ao RLS is_gerencia() (admin/gerencia veem feedbacks). head/financeiro
// abriam a tela mas o RLS retornava vazio — removidos p/ não confundir.
const ROLES_ACESSO = ['admin', 'gerencia'];

export default function FeedbacksScreen() {
  const { profile } = useAuthStore();
  if (profile && !ROLES_ACESSO.includes(profile.role)) return <Redirect href="/(interno)/dashboard" />;

  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [equipe, setEquipe] = useState<Membro[]>([]);
  const [loading, setLoading] = useState(true);
  const [respostasMap, setRespostasMap] = useState<Record<string, string>>({});
  const [sendingId, setSendingId] = useState<string | null>(null);
  // Modal de designação
  const [designandoFb, setDesignandoFb] = useState<Feedback | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [fbRes, eqRes] = await Promise.all([
      supabase.from('feedbacks')
        .select('*, clientes!cliente_id(nome_fantasia), designado_para:profiles!designado_para_id(nome)')
        .order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, nome, role').eq('ativo', true).neq('role', 'cliente').order('nome'),
    ]);
    setFeedbacks((fbRes.data as unknown as Feedback[]) ?? []);
    setEquipe((eqRes.data ?? []) as Membro[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const responder = async (fb: Feedback) => {
    const resposta = respostasMap[fb.id];
    if (!resposta?.trim()) return;
    setSendingId(fb.id);
    try {
      await supabase.from('feedbacks').update({
        respondido: true,
        resposta: resposta.trim(),
        respondido_em: new Date().toISOString(),
      }).eq('id', fb.id);
      const { data: cu } = await supabase.from('cliente_usuarios').select('profile_id').eq('cliente_id', fb.cliente_id);
      for (const u of cu ?? []) {
        await supabase.from('notificacoes').insert({
          profile_id: u.profile_id,
          tipo: 'geral',
          titulo: 'Joni respondeu seu feedback',
          mensagem: resposta.trim().substring(0, 80),
        });
      }
      setRespostasMap(m => { const n = { ...m }; delete n[fb.id]; return n; });
      await load();
    } finally { setSendingId(null); }
  };

  const designar = async (fb: Feedback, membroId: string) => {
    await supabase.from('feedbacks').update({ designado_para_id: membroId || null }).eq('id', fb.id);
    if (membroId) {
      await supabase.from('notificacoes').insert({
        profile_id: membroId,
        tipo: 'geral',
        titulo: 'Feedback designado para você',
        mensagem: `${fb.clientes?.nome_fantasia ?? 'Cliente'}: ${fb.mensagem.substring(0, 60)}`,
      });
    }
    setDesignandoFb(null);
    await load();
  };

  const naoRespondidos = feedbacks.filter(f => !f.respondido);
  const respondidos = feedbacks.filter(f => f.respondido);

  return (
    <>
      <ScrollView
        style={s.container}
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={COLORS.gold} />}
      >
        <View style={s.pageHeader}>
          <Text style={s.pageTitle}>Feedbacks</Text>
          {loading && <ActivityIndicator color={COLORS.gold} size="small" />}
        </View>

        {!loading && feedbacks.length === 0 && (
          <View style={s.emptyBox}><Text style={s.emptyText}>Nenhum feedback recebido ainda.</Text></View>
        )}

        {naoRespondidos.length > 0 && (
          <>
            <Text style={s.sectionTitle}>Não respondidos ({naoRespondidos.length})</Text>
            {naoRespondidos.map(fb => (
              <FbCard
                key={fb.id}
                fb={fb}
                resposta={respostasMap[fb.id] ?? ''}
                onRespostaChange={v => setRespostasMap(m => ({ ...m, [fb.id]: v }))}
                onResponder={() => responder(fb)}
                onDesignar={() => setDesignandoFb(fb)}
                sending={sendingId === fb.id}
              />
            ))}
          </>
        )}

        {respondidos.length > 0 && (
          <>
            <Text style={s.sectionTitle}>Respondidos ({respondidos.length})</Text>
            {respondidos.map(fb => (
              <FbCard key={fb.id} fb={fb} onDesignar={() => setDesignandoFb(fb)} readonly />
            ))}
          </>
        )}
      </ScrollView>

      {/* Modal de designação */}
      <Modal visible={!!designandoFb} transparent animationType="fade" onRequestClose={() => setDesignandoFb(null)}>
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <IconText name="send" size={16} color={COLORS.gold} textStyle={s.modalTitle}>Designar para</IconText>
            <Text style={s.modalSub} numberOfLines={2}>
              {designandoFb?.clientes?.nome_fantasia}: {designandoFb?.mensagem.substring(0, 60)}...
            </Text>
            <ScrollView style={{ maxHeight: 300 }}>
              <TouchableOpacity style={s.membroBtn} onPress={() => designar(designandoFb!, '')}>
                <Text style={s.membroBtnText}>— Nenhum (remover designação)</Text>
              </TouchableOpacity>
              {equipe.map(m => (
                <TouchableOpacity
                  key={m.id}
                  style={[s.membroBtn, designandoFb?.designado_para_id === m.id && s.membroBtnActive]}
                  onPress={() => designar(designandoFb!, m.id)}
                >
                  <Text style={[s.membroBtnText, designandoFb?.designado_para_id === m.id && { color: COLORS.gold }]}>
                    {m.nome}
                  </Text>
                  <Text style={s.membroRole}>{m.role}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={s.modalCancel} onPress={() => setDesignandoFb(null)}>
              <Text style={s.modalCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

function FbCard({ fb, resposta, onRespostaChange, onResponder, onDesignar, sending, readonly }: {
  fb: Feedback;
  resposta?: string;
  onRespostaChange?: (v: string) => void;
  onResponder?: () => void;
  onDesignar?: () => void;
  sending?: boolean;
  readonly?: boolean;
}) {
  const cor = TIPO_COLOR[fb.tipo] ?? COLORS.text2;
  return (
    <View style={[s.fbCard, { borderLeftColor: cor }]}>
      <View style={s.fbHeader}>
        <Text style={s.fbCliente}>{fb.clientes?.nome_fantasia ?? '—'}</Text>
        <Text style={s.fbData}>{new Date(fb.created_at).toLocaleDateString('pt-BR')}</Text>
        <Badge label={fb.tipo} variant={fb.tipo === 'elogio' ? 'success' : fb.tipo === 'sugestao' ? 'warning' : 'danger'} />
        <TouchableOpacity onPress={onDesignar} style={s.aviaoBtn}>
          <Icon name="send" size={16} color={COLORS.gold} />
        </TouchableOpacity>
      </View>

      {fb.designado_para && (
        <IconText name="usuario" size={12} color={COLORS.text2} textStyle={s.designadoPara}>Designado: {(fb.designado_para as any).nome}</IconText>
      )}

      <Text style={s.fbMsg}>{fb.mensagem}</Text>

      {!readonly && !fb.respondido && (
        <>
          <TextInput
            style={s.respostaInput}
            value={resposta}
            onChangeText={onRespostaChange}
            placeholder="Escreva sua resposta..."
            placeholderTextColor={COLORS.text3}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
          <GoldButton label="Responder" onPress={onResponder!} loading={!!sending} disabled={!resposta?.trim()} />
        </>
      )}
      {fb.respondido && fb.resposta && (
        <View style={s.respostaBox}>
          <Text style={s.respostaLabel}>Resposta enviada:</Text>
          <Text style={s.respostaText}>{fb.resposta}</Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.black },
  content: { padding: SPACING.lg, gap: SPACING.lg, paddingBottom: 48 },
  pageHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pageTitle: { color: COLORS.text, fontSize: 22, ...FONT.bold },
  emptyBox: { padding: SPACING.xl, alignItems: 'center' },
  emptyText: { color: COLORS.text3, fontSize: 13 },
  sectionTitle: { color: COLORS.text, fontSize: 16, ...FONT.bold },
  fbCard: { backgroundColor: COLORS.surface2, borderRadius: RADIUS.md, borderLeftWidth: 3, padding: SPACING.md, gap: SPACING.sm },
  fbHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  fbCliente: { flex: 1, color: COLORS.text, fontSize: 13, ...FONT.medium },
  fbData: { color: COLORS.text3, fontSize: 12 },
  aviaoBtn: { padding: 4 },
  aviaoText: { fontSize: 16 },
  designadoPara: { color: COLORS.gold, fontSize: 11, ...FONT.medium },
  fbMsg: { color: COLORS.text2, fontSize: 13 },
  respostaInput: { backgroundColor: COLORS.surface3, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, color: COLORS.text, fontSize: 13, minHeight: 70 },
  respostaBox: { backgroundColor: COLORS.surface3, borderRadius: RADIUS.sm, padding: SPACING.sm, gap: 4 },
  respostaLabel: { color: COLORS.gold, fontSize: 11, ...FONT.medium },
  respostaText: { color: COLORS.text2, fontSize: 13 },
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
