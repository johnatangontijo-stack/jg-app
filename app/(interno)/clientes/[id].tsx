import React, { useState, useEffect, useCallback } from 'react';
import {
  ScrollView, View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { COLORS, SPACING, FONT, RADIUS } from '../../../src/constants/theme';
import { supabase } from '../../../src/lib/supabase';
import { Badge } from '../../../src/components/ui/Badge';
import { ProgressBar } from '../../../src/components/ui/ProgressBar';
import { Avatar } from '../../../src/components/ui/Avatar';
import { Icon, type IconName } from '../../../src/components/ui/Icon';
import { Database } from '../../../src/types/database';

type Cliente = Database['public']['Tables']['clientes']['Row'];
type Producao = Database['public']['Tables']['producoes']['Row'];
type Pagamento = Database['public']['Tables']['pagamentos']['Row'];
type MetaItem = Database['public']['Tables']['meta_itens']['Row'];
type Meta = Database['public']['Tables']['metas']['Row'] & { itens: MetaItem[] };

type Aba = 'visao' | 'producoes' | 'metas' | 'trafego' | 'financeiro';

const ABAS: { key: Aba; label: string; icon: IconName }[] = [
  { key: 'visao',     label: 'Visão Geral', icon: 'dashboard' },
  { key: 'producoes', label: 'Produções',   icon: 'producoes' },
  { key: 'metas',     label: 'Metas',       icon: 'metas' },
  { key: 'trafego',   label: 'Tráfego',     icon: 'trafego' },
  { key: 'financeiro',label: 'Financeiro',  icon: 'financeiro' },
];

function healthColor(score: number) {
  if (score >= 70) return COLORS.success;
  if (score >= 50) return COLORS.warning;
  return COLORS.danger;
}

const STATUS_PROD_LABEL: Record<string, string> = {
  rascunho: 'Rascunho', editando: 'Editando', aguardando_aprovacao: 'Aguardando',
  aprovada: 'Aprovada', reprovada: 'Reprovada', agendada: 'Agendada', publicada: 'Publicada',
};
const STATUS_PROD_VARIANT: Record<string, 'success'|'warning'|'danger'|'gray'> = {
  rascunho: 'gray', editando: 'warning', aguardando_aprovacao: 'warning',
  aprovada: 'success', reprovada: 'danger', agendada: 'success', publicada: 'success',
};

export default function ClientePerfilScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [aba, setAba] = useState<Aba>('visao');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Dados das abas
  const [producoes, setProducoes] = useState<Producao[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [verbas, setVerbas] = useState<Database['public']['Tables']['verbas']['Row'] | null>(null);
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);

  const load = useCallback(async () => {
    if (!id) return;
    const [cRes, pRes, mRes, vRes, pgRes] = await Promise.all([
      supabase.from('clientes').select('*').eq('id', id).single(),
      supabase.from('producoes').select('*').eq('cliente_id', id).order('created_at', { ascending: false }).limit(20),
      supabase.from('metas').select('*, itens:meta_itens(*)').eq('cliente_id', id)
        .eq('mes', new Date().toISOString().slice(0, 7)).maybeSingle(),
      supabase.from('verbas').select('*').eq('cliente_id', id)
        .eq('mes', new Date().toISOString().slice(0, 7)).maybeSingle(),
      supabase.from('pagamentos').select('*').eq('cliente_id', id).order('data_vencimento', { ascending: false }).limit(12),
    ]);
    setCliente(cRes.data);
    setProducoes((pRes.data ?? []) as Producao[]);
    setMeta((mRes.data as unknown as Meta) ?? null);
    setVerbas(vRes.data ?? null);
    setPagamentos((pgRes.data ?? []) as Pagamento[]);
    setLoading(false);
    setRefreshing(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  if (loading || !cliente) {
    return <View style={s.center}><ActivityIndicator color={COLORS.gold} /></View>;
  }

  const hColor = healthColor(cliente.health_score);

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Icon name="back" size={24} color={COLORS.gold} />
        </TouchableOpacity>
        <Avatar name={cliente.nome_fantasia} size={44} />
        <View style={s.headerInfo}>
          <Text style={s.nome} numberOfLines={1}>{cliente.nome_fantasia}</Text>
          <Badge
            label={cliente.status}
            variant={cliente.status === 'ativo' ? 'success' : cliente.status === 'inadimplente' ? 'danger' : 'warning'}
          />
        </View>
        <View style={s.scoreWrap}>
          <Text style={[s.score, { color: hColor }]}>{cliente.health_score}</Text>
          <Text style={s.scoreLabel}>health</Text>
        </View>
      </View>

      {/* Barra de saúde */}
      <View style={s.healthBarWrap}>
        <ProgressBar value={cliente.health_score} color={hColor} height={4} />
      </View>

      {/* Abas */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.abasScroll} contentContainerStyle={s.abasRow}>
        {ABAS.map(a => (
          <TouchableOpacity
            key={a.key}
            style={[s.abaChip, aba === a.key && s.abaActive]}
            onPress={() => setAba(a.key)}
          >
            <Icon name={a.icon} size={13} color={aba === a.key ? COLORS.black : COLORS.text2} />
            <Text style={[s.abaText, aba === a.key && s.abaTextActive]}>{a.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Conteúdo */}
      <ScrollView
        contentContainerStyle={s.abaContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.gold} />}
      >
        {aba === 'visao'     && <AbaVisao cliente={cliente} />}
        {aba === 'producoes' && <AbaProducoes producoes={producoes} />}
        {aba === 'metas'     && <AbaMetas meta={meta} />}
        {aba === 'trafego'   && <AbaTrafego cliente={cliente} verbas={verbas} />}
        {aba === 'financeiro'&& <AbaFinanceiro pagamentos={pagamentos} />}
      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────
// Aba: Visão Geral
// ─────────────────────────────────────────
function AbaVisao({ cliente }: { cliente: Cliente }) {
  return (
    <>
      <Section title="Dados Gerais">
        <InfoRow label="Razão social"   value={cliente.razao_social ?? '—'} />
        <InfoRow label="CNPJ"           value={cliente.cnpj ?? '—'} />
        <InfoRow label="Segmento"       value={cliente.segmento ?? '—'} />
        <InfoRow label="Início contrato"value={new Date(cliente.data_inicio).toLocaleDateString('pt-BR')} />
        <InfoRow label="Renovação"      value={new Date(cliente.data_renovacao).toLocaleDateString('pt-BR')} />
        <InfoRow label="Mensalidade"    value={cliente.mensalidade.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} />
      </Section>

      <Section title="Campanha">
        <InfoRow label="Status campanha" value={cliente.campanha_status === 'ativa' ? 'Ativa' : 'Pausada'} />
        {cliente.whatsapp_grupo && (
          <InfoRow label="Grupo WhatsApp" value={cliente.whatsapp_grupo} />
        )}
      </Section>
    </>
  );
}

// ─────────────────────────────────────────
// Aba: Produções
// ─────────────────────────────────────────
function AbaProducoes({ producoes }: { producoes: Producao[] }) {
  if (producoes.length === 0) {
    return <EmptyState icon="producoes" text="Nenhuma produção cadastrada ainda." />;
  }

  const porStatus = producoes.reduce<Record<string, number>>((acc, p) => {
    acc[p.status] = (acc[p.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <>
      {/* Resumo */}
      <View style={s.resumoRow}>
        {Object.entries(porStatus).map(([st, qt]) => (
          <View key={st} style={s.resumoChip}>
            <Text style={s.resumoNum}>{qt}</Text>
            <Text style={s.resumoLabel}>{STATUS_PROD_LABEL[st] ?? st}</Text>
          </View>
        ))}
      </View>

      {producoes.map(p => (
        <View key={p.id} style={s.prodCard}>
          <View style={s.prodRow}>
            <View style={s.tipoBadge}>
              <Text style={s.tipoText}>{p.tipo.toUpperCase()}</Text>
            </View>
            <Text style={s.prodTitulo} numberOfLines={2}>{p.titulo}</Text>
            <Badge label={STATUS_PROD_LABEL[p.status] ?? p.status} variant={STATUS_PROD_VARIANT[p.status] ?? 'gray'} />
          </View>
          {p.data_publicacao && (
            <Text style={s.prodData}>
              Publicação: {new Date(p.data_publicacao).toLocaleDateString('pt-BR')}
            </Text>
          )}
        </View>
      ))}
    </>
  );
}

// ─────────────────────────────────────────
// Aba: Metas
// ─────────────────────────────────────────
function AbaMetas({ meta }: { meta: Meta | null }) {
  const mes = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  if (!meta) {
    return <EmptyState icon="metas" text={`Nenhuma meta cadastrada para ${mes}.`} />;
  }

  const pct = meta.valor_meta > 0 ? Math.min(100, Math.round((meta.valor_atual / meta.valor_meta) * 100)) : 0;
  const hColor = pct >= 70 ? COLORS.success : pct >= 40 ? COLORS.warning : COLORS.danger;

  const itensJG      = meta.itens.filter(i => i.responsavel === 'jg');
  const itensCliente = meta.itens.filter(i => i.responsavel === 'cliente');
  const pctJG        = itensJG.length      ? Math.round((itensJG.filter(i => i.concluido).length      / itensJG.length)      * 100) : 0;
  const pctCliente   = itensCliente.length ? Math.round((itensCliente.filter(i => i.concluido).length / itensCliente.length) * 100) : 0;

  return (
    <>
      {/* Resumo financeiro da meta */}
      <Section title={`Meta de ${mes}`}>
        <View style={s.metaResumo}>
          <View style={s.metaCircle}>
            <Text style={[s.metaPct, { color: hColor }]}>{pct}%</Text>
            <Text style={s.metaPctLabel}>atingido</Text>
          </View>
          <View style={s.metaInfo}>
            <InfoRow label="Meta"    value={meta.valor_meta.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} />
            <InfoRow label="Atual"   value={meta.valor_atual.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} />
            {meta.descricao && <Text style={s.metaDesc}>{meta.descricao}</Text>}
          </View>
        </View>
        <View style={{ marginTop: SPACING.sm }}>
          <ProgressBar value={pct} color={hColor} height={8} />
        </View>
      </Section>

      {/* Metas JG */}
      <Section title={`Metas JG — ${pctJG}% concluído`}>
        {itensJG.length === 0
          ? <Text style={s.semItens}>Nenhum item</Text>
          : itensJG.map(item => <ItemRow key={item.id} item={item} />)
        }
      </Section>

      {/* Metas Cliente */}
      <Section title={`Metas do Cliente — ${pctCliente}% concluído`}>
        {itensCliente.length === 0
          ? <Text style={s.semItens}>Nenhum item</Text>
          : itensCliente.map(item => <ItemRow key={item.id} item={item} />)
        }
      </Section>
    </>
  );
}

function ItemRow({ item }: { item: MetaItem }) {
  return (
    <View style={s.itemRow}>
      <Icon name={item.concluido ? 'aprovado' : 'circle'} size={18}
        color={item.concluido ? COLORS.success : COLORS.text3} />
      <View style={s.itemBody}>
        <Text style={[s.itemDesc, item.concluido && s.itemDescDone]}>{item.descricao}</Text>
        {item.categoria && <Text style={s.itemCat}>{item.categoria}</Text>}
        {item.prazo && <Text style={s.itemPrazo}>Prazo: {new Date(item.prazo).toLocaleDateString('pt-BR')}</Text>}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────
// Aba: Tráfego
// ─────────────────────────────────────────
function AbaTrafego({ cliente, verbas }: {
  cliente: Cliente;
  verbas: Database['public']['Tables']['verbas']['Row'] | null;
}) {
  return (
    <>
      <Section title="Campanha">
        <InfoRow
          label="Status"
          value={cliente.campanha_status === 'ativa' ? 'Campanha ativa' : 'Campanha pausada'}
        />
      </Section>

      {verbas ? (
        <Section title={`Verbas — ${verbas.mes}`}>
          <InfoRow label="Verba total"  value={verbas.verba_total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} />
          {verbas.verba_meta != null && (
            <InfoRow label="Meta Ads"   value={verbas.verba_meta.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} />
          )}
          {verbas.verba_google != null && (
            <InfoRow label="Google Ads" value={verbas.verba_google.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} />
          )}
        </Section>
      ) : (
        <EmptyState icon="trafego" text="Nenhuma verba cadastrada para este mês." />
      )}
    </>
  );
}

// ─────────────────────────────────────────
// Aba: Financeiro
// ─────────────────────────────────────────
const STATUS_PAG_COLOR: Record<string, string> = {
  pago: COLORS.success, pendente: COLORS.warning, atrasado: COLORS.danger, cancelado: COLORS.text3,
};

function AbaFinanceiro({ pagamentos }: { pagamentos: Pagamento[] }) {
  if (pagamentos.length === 0) {
    return <EmptyState icon="financeiro" text="Nenhum pagamento registrado ainda." />;
  }

  const totalPago  = pagamentos.filter(p => p.status === 'pago').reduce((s, p) => s + p.valor, 0);
  const totalPend  = pagamentos.filter(p => p.status !== 'pago' && p.status !== 'cancelado').reduce((s, p) => s + p.valor, 0);

  return (
    <>
      {/* Resumo */}
      <View style={s.finResumo}>
        <View style={[s.finCard, { borderColor: COLORS.success }]}>
          <Text style={s.finLabel}>Recebido</Text>
          <Text style={[s.finValor, { color: COLORS.success }]}>
            {totalPago.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </Text>
        </View>
        <View style={[s.finCard, { borderColor: COLORS.warning }]}>
          <Text style={s.finLabel}>Pendente</Text>
          <Text style={[s.finValor, { color: COLORS.warning }]}>
            {totalPend.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </Text>
        </View>
      </View>

      {pagamentos.map(p => (
        <View key={p.id} style={[s.pagCard, { borderLeftColor: STATUS_PAG_COLOR[p.status] ?? COLORS.border }]}>
          <View style={s.pagRow}>
            <View>
              <Text style={s.pagComp}>{p.competencia}</Text>
              <Text style={s.pagVenc}>Venc: {new Date(p.data_vencimento).toLocaleDateString('pt-BR')}</Text>
            </View>
            <Text style={[s.pagValor, { color: STATUS_PAG_COLOR[p.status] ?? COLORS.text }]}>
              {p.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </Text>
            <Badge
              label={p.status}
              variant={p.status === 'pago' ? 'success' : p.status === 'atrasado' ? 'danger' : p.status === 'pendente' ? 'warning' : 'gray'}
            />
          </View>
          {p.tipo_status && p.tipo_status !== 'normal' && (
            <Text style={s.pagTipo}>{p.tipo_status}</Text>
          )}
        </View>
      ))}
    </>
  );
}

// ─────────────────────────────────────────
// Componentes auxiliares
// ─────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      <View style={s.sectionBody}>{children}</View>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.infoRow}>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={s.infoValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

function EmptyState({ icon, text }: { icon: IconName; text: string }) {
  return (
    <View style={s.emptyState}>
      <Icon name={icon} size={36} color={COLORS.text3} />
      <Text style={s.emptyText}>{text}</Text>
    </View>
  );
}

// ─────────────────────────────────────────
// Estilos
// ─────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.black },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.black },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, padding: SPACING.lg, paddingBottom: SPACING.sm },
  back: { color: COLORS.gold, fontSize: 22, ...FONT.bold, paddingRight: 4 },
  headerInfo: { flex: 1, gap: 4 },
  nome: { color: COLORS.text, fontSize: 15, ...FONT.bold },
  scoreWrap: { alignItems: 'center', minWidth: 44 },
  score: { fontSize: 22, ...FONT.bold },
  scoreLabel: { color: COLORS.text3, fontSize: 10 },
  healthBarWrap: { paddingHorizontal: SPACING.lg, marginBottom: SPACING.sm },

  // Abas
  abasScroll: { borderBottomWidth: 1, borderBottomColor: COLORS.borderWeak, flexGrow: 0 },
  abasRow: { flexDirection: 'row', gap: SPACING.xs, paddingHorizontal: SPACING.lg, paddingVertical: 8 },
  abaChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.borderWeak },
  abaActive: { backgroundColor: COLORS.gold, borderColor: COLORS.gold },
  abaText: { color: COLORS.text2, fontSize: 11, ...FONT.medium },
  abaTextActive: { color: COLORS.black, ...FONT.bold },

  // Conteúdo
  abaContent: { padding: SPACING.lg, gap: SPACING.lg, paddingBottom: 48 },

  // Section
  section: { gap: SPACING.sm },
  sectionTitle: { color: COLORS.text, fontSize: 13, ...FONT.bold, paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: COLORS.borderWeak },
  sectionBody: { gap: 2 },

  // InfoRow
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  infoLabel: { color: COLORS.text3, fontSize: 13, flex: 1 },
  infoValue: { color: COLORS.text, fontSize: 13, ...FONT.medium, flex: 1, textAlign: 'right' },

  // Produções
  resumoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.sm },
  resumoChip: { backgroundColor: COLORS.surface2, borderRadius: RADIUS.md, padding: SPACING.sm, alignItems: 'center', minWidth: 70 },
  resumoNum: { color: COLORS.text, fontSize: 18, ...FONT.bold },
  resumoLabel: { color: COLORS.text3, fontSize: 10 },
  prodCard: { backgroundColor: COLORS.surface2, borderRadius: RADIUS.md, padding: SPACING.md, gap: SPACING.xs, borderWidth: 1, borderColor: COLORS.borderWeak },
  prodRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  tipoBadge: { backgroundColor: COLORS.surface3, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  tipoText: { color: COLORS.text3, fontSize: 9, ...FONT.bold },
  prodTitulo: { flex: 1, color: COLORS.text, fontSize: 12, ...FONT.medium },
  prodData: { color: COLORS.text3, fontSize: 11 },

  // Metas
  metaResumo: { flexDirection: 'row', gap: SPACING.md, alignItems: 'center' },
  metaCircle: { width: 72, height: 72, borderRadius: 36, borderWidth: 3, borderColor: COLORS.gold, alignItems: 'center', justifyContent: 'center' },
  metaPct: { fontSize: 20, ...FONT.bold },
  metaPctLabel: { color: COLORS.text3, fontSize: 9 },
  metaInfo: { flex: 1 },
  metaDesc: { color: COLORS.text3, fontSize: 11, marginTop: 4, fontStyle: 'italic' },
  itemRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  itemCheck: { fontSize: 16, marginTop: 1 },
  itemCheckDone: {},
  itemBody: { flex: 1, gap: 2 },
  itemDesc: { color: COLORS.text, fontSize: 13 },
  itemDescDone: { color: COLORS.text3, textDecorationLine: 'line-through' },
  itemCat: { color: COLORS.gold, fontSize: 10 },
  itemPrazo: { color: COLORS.text3, fontSize: 11 },
  semItens: { color: COLORS.text3, fontSize: 12, fontStyle: 'italic' },

  // Financeiro
  finResumo: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.sm },
  finCard: { flex: 1, backgroundColor: COLORS.surface2, borderRadius: RADIUS.md, padding: SPACING.md, borderWidth: 1, gap: 4 },
  finLabel: { color: COLORS.text3, fontSize: 11 },
  finValor: { fontSize: 16, ...FONT.bold },
  pagCard: { backgroundColor: COLORS.surface2, borderRadius: RADIUS.md, padding: SPACING.md, borderLeftWidth: 3, borderWidth: 1, borderColor: COLORS.borderWeak, gap: 4 },
  pagRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  pagComp: { color: COLORS.text, fontSize: 13, ...FONT.medium },
  pagVenc: { color: COLORS.text3, fontSize: 11 },
  pagValor: { flex: 1, fontSize: 14, ...FONT.bold, textAlign: 'right' },
  pagTipo: { color: COLORS.gold, fontSize: 10, textTransform: 'uppercase' },

  // Empty
  emptyState: { alignItems: 'center', paddingVertical: SPACING.xxl, gap: SPACING.sm },
  emptyIcon: { fontSize: 36 },
  emptyText: { color: COLORS.text3, fontSize: 13, textAlign: 'center' },
});
