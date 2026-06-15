import React, { useState, useEffect, useCallback } from 'react';
import {
  ScrollView, View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Modal, TextInput, Linking, RefreshControl, Alert,
} from 'react-native';
import { COLORS, SPACING, FONT, RADIUS } from '../../src/constants/theme';
import { supabase } from '../../src/lib/supabase';
import { useAuthStore } from '../../src/stores/authStore';
import { GoldButton } from '../../src/components/ui/GoldButton';
import { Icon, IconText, type IconName } from '../../src/components/ui/Icon';
import { Database } from '../../src/types/database';

type Aprovacao = Database['public']['Tables']['aprovacoes']['Row'];

const STATUS_INFO = {
  aguardando_aprovacao: { label: 'Aguardando',  icon: 'aguardando' as IconName, color: COLORS.warning },
  aprovado:             { label: 'Aprovado',    icon: 'aprovado'   as IconName, color: COLORS.success },
  reprovado:            { label: 'Reprovado',   icon: 'reprovado'  as IconName, color: COLORS.danger },
  revisao:              { label: 'Revisão',     icon: 'revisao'    as IconName, color: '#8b5cf6' },
};

const PLATAFORMA_ICON: Record<string, IconName> = {
  instagram: 'instagram', facebook: 'facebook', linkedin: 'linkedin', tiktok: 'tiktok', youtube: 'youtube',
};

const SUPABASE_FUNCTIONS_URL = 'https://ieekdxxmhkbslskgxbdg.supabase.co/functions/v1';

export default function AprovacoesClienteScreen() {
  const { profile } = useAuthStore();
  const [aprovacoes, setAprovacoes] = useState<Aprovacao[]>([]);
  const [clienteId, setClienteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Aprovacao | null>(null);
  const [comentario, setComentario] = useState('');
  const [sending, setSending] = useState(false);
  const [filtro, setFiltro] = useState<'todas' | 'aguardando_aprovacao' | 'respondidas'>('todas');

  const load = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);

    // Descobre o cliente_id deste usuário
    const { data: cu } = await supabase
      .from('cliente_usuarios')
      .select('cliente_id')
      .eq('profile_id', profile.id)
      .maybeSingle();

    if (!cu) { setLoading(false); return; }
    setClienteId(cu.cliente_id);

    const { data } = await supabase
      .from('aprovacoes')
      .select('*')
      .eq('cliente_id', cu.cliente_id)
      .order('created_at', { ascending: false });

    setAprovacoes((data ?? []) as Aprovacao[]);
    setLoading(false);
  }, [profile?.id]);

  useEffect(() => { load(); }, [load]);

  // Realtime: nova aprovação chega em tempo real
  useEffect(() => {
    if (!clienteId) return;
    const channel = supabase
      .channel(`aprovacoes-cliente-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'aprovacoes',
        filter: `cliente_id=eq.${clienteId}`,
      }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [clienteId, load]);

  const responder = async (resposta: 'aprovado' | 'reprovado' | 'revisao') => {
    if (!selected || !profile) return;
    if ((resposta === 'reprovado' || resposta === 'revisao') && !comentario.trim()) {
      Alert.alert('Comentário obrigatório', 'Por favor informe o motivo para reprovação ou revisão.');
      return;
    }

    setSending(true);
    try {
      const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/aprovacoes-responder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aprovacao_id: selected.aprovacao_id,
          profile_id:   profile.id,
          resposta,
          comentario:   comentario.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.erro ?? 'Erro ao responder');

      setSelected(null);
      setComentario('');
      await load();
    } catch (e: any) {
      Alert.alert('Erro', e.message);
    } finally {
      setSending(false);
    }
  };

  const pendentes = aprovacoes.filter(a => a.status === 'aguardando_aprovacao').length;

  const listaFiltrada = aprovacoes.filter(a => {
    if (filtro === 'aguardando_aprovacao') return a.status === 'aguardando_aprovacao';
    if (filtro === 'respondidas') return a.status !== 'aguardando_aprovacao';
    return true;
  });

  if (loading) return <View style={s.center}><ActivityIndicator color={COLORS.gold} /></View>;

  if (!clienteId) {
    return (
      <View style={s.center}>
        <Icon name="list" size={40} color={COLORS.text3} />
        <Text style={s.emptyText}>Nenhum cliente associado ao seu perfil.</Text>
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
        <View style={s.pageHeader}>
          <View>
            <Text style={s.pageTitle}>Aprovações</Text>
            {pendentes > 0 && (
              <IconText name="aguardando" size={13} color={COLORS.warning} textStyle={s.pendenteBadge}>
                {pendentes} aguardando sua resposta
              </IconText>
            )}
          </View>
        </View>

        {/* Filtros */}
        <View style={s.filtros}>
          {([
            { k: 'todas',                l: 'Todas' },
            { k: 'aguardando_aprovacao', l: `Pendentes (${pendentes})` },
            { k: 'respondidas',          l: 'Respondidas' },
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

        {listaFiltrada.length === 0 && (
          <View style={s.emptyState}>
            <Icon name="aprovacoes" size={40} color={COLORS.text3} />
            <Text style={s.emptyText}>Nenhuma aprovação {filtro === 'respondidas' ? 'respondida' : 'pendente'} ainda.</Text>
          </View>
        )}

        {listaFiltrada.map(apr => {
          const info = STATUS_INFO[apr.status] ?? STATUS_INFO.aguardando_aprovacao;
          const prazoExpired = apr.prazo_resposta && new Date(apr.prazo_resposta) < new Date() && apr.status === 'aguardando_aprovacao';
          const conteudo = apr.conteudo as any;

          return (
            <TouchableOpacity
              key={apr.id}
              style={[s.card, { borderLeftColor: info.color }, prazoExpired && s.cardUrgente]}
              onPress={() => { setSelected(apr); setComentario(''); }}
              activeOpacity={0.85}
            >
              {/* Urgente */}
              {prazoExpired && (
                <IconText name="alerta" size={12} color={COLORS.danger} textStyle={s.urgente}>
                  Prazo expirado!
                </IconText>
              )}

              {/* Topo */}
              <View style={s.cardTop}>
                <IconText name={PLATAFORMA_ICON[apr.plataforma] ?? 'tecnologia'} size={15}
                  color={COLORS.text} textStyle={s.plataforma}>
                  {apr.plataforma}
                </IconText>
                <View style={[s.statusChip, { backgroundColor: info.color + '22', borderColor: info.color }]}>
                  <Icon name={info.icon} size={11} color={info.color} />
                  <Text style={[s.statusText, { color: info.color }]}>{info.label}</Text>
                </View>
              </View>

              {/* Tipo + responsável */}
              <View style={s.cardMeta}>
                <IconText name={apr.tipo_conteudo === 'video' ? 'video' : 'imagem'} size={12}
                  color={COLORS.text2} textStyle={s.tipoText}>
                  {apr.tipo_conteudo === 'video' ? 'Vídeo' : 'Estático'}
                </IconText>
                {apr.social_media_responsavel && (
                  <IconText name="usuario" size={12} color={COLORS.text3} textStyle={s.respText}>
                    {apr.social_media_responsavel}
                  </IconText>
                )}
              </View>

              {/* Descrição */}
              {apr.descricao_post && (
                <Text style={s.descricao} numberOfLines={2}>{apr.descricao_post}</Text>
              )}

              {/* Prazo */}
              {apr.prazo_resposta && (
                <IconText name="prazo" size={11} color={prazoExpired ? COLORS.danger : COLORS.text3}
                  textStyle={[s.prazo, prazoExpired && { color: COLORS.danger }]}>
                  Responder até: {new Date(apr.prazo_resposta).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </IconText>
              )}

              {/* Arquivo */}
              {conteudo?.url && (
                <IconText name="arquivo" size={12} color={COLORS.gold} textStyle={s.arquivo}>
                  {conteudo.nome_arquivo ?? 'Ver arquivo'}
                </IconText>
              )}

              {/* Resposta dada */}
              {apr.resposta_comentario && (
                <View style={s.respostaBox}>
                  <Text style={s.respostaLabel}>Seu comentário:</Text>
                  <Text style={s.respostaText}>{apr.resposta_comentario}</Text>
                </View>
              )}

              {apr.status === 'aguardando_aprovacao' && (
                <Text style={s.tapHint}>Toque para ver e responder</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Modal de detalhe + resposta */}
      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        {selected && (
          <View style={s.overlay}>
            <ScrollView
              style={s.sheet}
              contentContainerStyle={s.sheetContent}
              keyboardShouldPersistTaps="handled"
            >
              {/* Cabeçalho */}
              <View style={s.sheetHeader}>
                <IconText name={PLATAFORMA_ICON[selected.plataforma] ?? 'tecnologia'} size={16}
                  color={COLORS.text} textStyle={s.sheetTitle} style={{ flex: 1 }}>
                  {selected.plataforma} · {selected.tipo_conteudo === 'video' ? 'Vídeo' : 'Estático'}
                </IconText>
                <TouchableOpacity onPress={() => setSelected(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Icon name="close" size={22} color={COLORS.text3} />
                </TouchableOpacity>
              </View>

              {/* Responsável */}
              {selected.social_media_responsavel && (
                <IconText name="usuario" size={13} color={COLORS.text3} textStyle={s.sheetResp}>
                  Criado por {selected.social_media_responsavel}
                </IconText>
              )}

              {/* Arquivo / Link */}
              {(selected.conteudo as any)?.url && (
                <TouchableOpacity
                  style={s.linkBtn}
                  onPress={() => Linking.openURL((selected.conteudo as any).url)}
                >
                  <IconText name={selected.tipo_conteudo === 'video' ? 'video' : 'imagem'} size={15}
                    color={COLORS.gold} textStyle={s.linkBtnText}>
                    Abrir {(selected.conteudo as any).nome_arquivo ?? 'arquivo'}
                  </IconText>
                  <Text style={s.linkBtnHint}>Toque para visualizar a peça</Text>
                </TouchableOpacity>
              )}

              {/* Descrição */}
              {selected.descricao_post && (
                <View style={s.infoBlock}>
                  <Text style={s.infoLabel}>Descrição</Text>
                  <Text style={s.infoText}>{selected.descricao_post}</Text>
                </View>
              )}

              {/* Legenda sugerida */}
              {selected.legenda_sugerida && (
                <View style={s.infoBlock}>
                  <Text style={s.infoLabel}>Legenda sugerida</Text>
                  <View style={s.legendaBox}>
                    <Text style={s.legendaText}>{selected.legenda_sugerida}</Text>
                  </View>
                </View>
              )}

              {/* Data publicação */}
              {selected.data_publicacao_prevista && (
                <View style={s.infoBlock}>
                  <Text style={s.infoLabel}>Publicação prevista</Text>
                  <IconText name="publicar" size={14} color={COLORS.text} textStyle={s.infoText}>
                    {new Date(selected.data_publicacao_prevista).toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short' })}
                  </IconText>
                </View>
              )}

              {/* Prazo de resposta */}
              {selected.prazo_resposta && (
                <View style={s.infoBlock}>
                  <Text style={s.infoLabel}>Prazo para resposta</Text>
                  <IconText name="prazo" size={14}
                    color={new Date(selected.prazo_resposta) < new Date() ? COLORS.danger : COLORS.text}
                    textStyle={[s.infoText, new Date(selected.prazo_resposta) < new Date() && { color: COLORS.danger }]}>
                    {new Date(selected.prazo_resposta).toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short' })}
                  </IconText>
                </View>
              )}

              {/* Se já respondeu */}
              {selected.status !== 'aguardando_aprovacao' ? (
                <View style={[s.jaRespondido, { borderColor: STATUS_INFO[selected.status]?.color ?? COLORS.border }]}>
                  <IconText name={STATUS_INFO[selected.status]?.icon ?? 'aguardando'} size={16}
                    color={STATUS_INFO[selected.status]?.color ?? COLORS.text}
                    textStyle={[s.jaRespondidoTitle, { color: STATUS_INFO[selected.status]?.color ?? COLORS.text }]}>
                    Você {selected.status === 'aprovado' ? 'aprovou' : selected.status === 'reprovado' ? 'reprovou' : 'pediu revisão'} esta peça
                  </IconText>
                  {selected.resposta_comentario && (
                    <Text style={s.jaRespondidoComentario}>"{selected.resposta_comentario}"</Text>
                  )}
                  {selected.respondido_em && (
                    <Text style={s.jaRespondidoData}>
                      {new Date(selected.respondido_em).toLocaleString('pt-BR', { dateStyle: 'medium', timeStyle: 'short' })}
                    </Text>
                  )}
                </View>
              ) : (
                <>
                  {/* Campo comentário */}
                  <View style={s.infoBlock}>
                    <Text style={s.infoLabel}>Comentário (obrigatório para reprovar ou pedir revisão)</Text>
                    <TextInput
                      style={s.comentarioInput}
                      value={comentario}
                      onChangeText={setComentario}
                      placeholder="Digite seus comentários, sugestões ou motivo..."
                      placeholderTextColor={COLORS.text3}
                      multiline
                      numberOfLines={4}
                      textAlignVertical="top"
                    />
                  </View>

                  {/* Botões de resposta */}
                  <View style={s.acoes}>
                    <TouchableOpacity
                      style={[s.acaoBtn, s.acaoBtnRevisao]}
                      onPress={() => responder('revisao')}
                      disabled={sending}
                    >
                      {sending ? <Text style={s.acaoBtnTextRevisao}>...</Text> : (
                        <IconText name="revisao" size={15} color="#8b5cf6" textStyle={s.acaoBtnTextRevisao}>
                          Pedir Revisão
                        </IconText>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[s.acaoBtn, s.acaoBtnReprovar]}
                      onPress={() => responder('reprovado')}
                      disabled={sending}
                    >
                      {sending ? <Text style={s.acaoBtnTextReprovar}>...</Text> : (
                        <IconText name="reprovado" size={15} color={COLORS.danger} textStyle={s.acaoBtnTextReprovar}>
                          Reprovar
                        </IconText>
                      )}
                    </TouchableOpacity>

                    <GoldButton
                      label={sending ? 'Enviando...' : 'Aprovar'}
                      onPress={() => responder('aprovado')}
                      loading={sending}
                      style={s.acaoBtnAprovar}
                    />
                  </View>
                </>
              )}

              <TouchableOpacity style={s.cancelarBtn} onPress={() => setSelected(null)}>
                <Text style={s.cancelarText}>Fechar</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.black },
  content: { padding: SPACING.lg, gap: SPACING.md, paddingBottom: 48 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.black, gap: SPACING.md },

  pageHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  pageTitle: { color: COLORS.text, fontSize: 22, ...FONT.bold },
  pendenteBadge: { color: COLORS.warning, fontSize: 13, marginTop: 2 },

  filtros: { flexDirection: 'row', gap: SPACING.sm, flexWrap: 'wrap' },
  filtroBtn: { paddingHorizontal: SPACING.md, paddingVertical: 6, borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.border },
  filtroBtnActive: { borderColor: COLORS.gold, backgroundColor: 'rgba(201,168,76,0.12)' },
  filtroText: { color: COLORS.text3, fontSize: 12 },
  filtroTextActive: { color: COLORS.gold, ...FONT.medium },

  emptyState: { alignItems: 'center', paddingVertical: 48, gap: SPACING.sm },
  emptyText: { color: COLORS.text3, fontSize: 13, textAlign: 'center' },

  card: {
    backgroundColor: COLORS.surface2, borderRadius: RADIUS.lg,
    borderLeftWidth: 4, padding: SPACING.lg, gap: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.borderWeak,
  },
  cardUrgente: { borderColor: COLORS.danger },
  urgente: { color: COLORS.danger, fontSize: 12, ...FONT.bold },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  plataforma: { color: COLORS.text, fontSize: 14, ...FONT.bold, textTransform: 'capitalize' },
  statusChip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: RADIUS.full, borderWidth: 1, paddingHorizontal: SPACING.sm, paddingVertical: 3 },
  statusText: { fontSize: 11, ...FONT.medium },
  cardMeta: { flexDirection: 'row', gap: SPACING.md },
  tipoText: { color: COLORS.text2, fontSize: 12 },
  respText: { color: COLORS.text3, fontSize: 12 },
  descricao: { color: COLORS.text2, fontSize: 13, lineHeight: 18 },
  prazo: { color: COLORS.text3, fontSize: 11 },
  arquivo: { color: COLORS.gold, fontSize: 12 },
  respostaBox: { backgroundColor: COLORS.surface3, borderRadius: RADIUS.sm, padding: SPACING.sm, gap: 2 },
  respostaLabel: { color: COLORS.text3, fontSize: 11 },
  respostaText: { color: COLORS.text2, fontSize: 12, fontStyle: 'italic' },
  tapHint: { color: COLORS.gold, fontSize: 11, textAlign: 'right' },

  // Modal / Sheet
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: COLORS.surface1, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, maxHeight: '92%' },
  sheetContent: { padding: SPACING.xl, gap: SPACING.lg, paddingBottom: 48 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetTitle: { color: COLORS.text, fontSize: 16, ...FONT.bold, textTransform: 'capitalize', flex: 1 },
  closeBtn: { color: COLORS.text3, fontSize: 18, padding: 4 },
  sheetResp: { color: COLORS.text3, fontSize: 13 },

  linkBtn: {
    backgroundColor: 'rgba(201,168,76,0.12)', borderRadius: RADIUS.lg,
    padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.gold,
    alignItems: 'center', gap: 4,
  },
  linkBtnText: { color: COLORS.gold, fontSize: 15, ...FONT.bold },
  linkBtnHint: { color: COLORS.text3, fontSize: 11 },

  infoBlock: { gap: SPACING.xs },
  infoLabel: { color: COLORS.text3, fontSize: 12, ...FONT.medium },
  infoText: { color: COLORS.text, fontSize: 14 },
  legendaBox: { backgroundColor: COLORS.surface2, borderRadius: RADIUS.md, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.borderWeak },
  legendaText: { color: COLORS.text2, fontSize: 13, lineHeight: 20 },

  comentarioInput: {
    backgroundColor: COLORS.surface2, borderRadius: RADIUS.md, borderWidth: 1,
    borderColor: COLORS.border, padding: SPACING.md, color: COLORS.text,
    fontSize: 14, minHeight: 100,
  },

  acoes: { gap: SPACING.sm },
  acaoBtn: { borderRadius: RADIUS.md, padding: SPACING.md, alignItems: 'center', borderWidth: 1 },
  acaoBtnRevisao: { borderColor: '#8b5cf6', backgroundColor: 'rgba(139,92,246,0.1)' },
  acaoBtnTextRevisao: { color: '#8b5cf6', fontSize: 14, ...FONT.medium },
  acaoBtnReprovar: { borderColor: COLORS.danger, backgroundColor: 'rgba(231,76,60,0.1)' },
  acaoBtnTextReprovar: { color: COLORS.danger, fontSize: 14, ...FONT.medium },
  acaoBtnAprovar: { marginTop: 0 },

  jaRespondido: {
    borderRadius: RADIUS.lg, borderWidth: 2, padding: SPACING.lg,
    alignItems: 'center', gap: SPACING.sm,
  },
  jaRespondidoTitle: { fontSize: 16, ...FONT.bold },
  jaRespondidoComentario: { color: COLORS.text2, fontSize: 13, fontStyle: 'italic', textAlign: 'center' },
  jaRespondidoData: { color: COLORS.text3, fontSize: 11 },

  cancelarBtn: { alignItems: 'center', paddingVertical: SPACING.md },
  cancelarText: { color: COLORS.text3, fontSize: 14 },
});
