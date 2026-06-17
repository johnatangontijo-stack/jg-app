// Supabase Edge Function — POST /functions/v1/eventos-receber
// ============================================================
// Receptor GENÉRICO de eventos do JG Interno → grava dado de negócio
// na tabela da tela do cliente + insere notificacao (sino + push).
// Substitui o aprovacoes-receber específico (aprovacao vira 1 case).
//
// Contrato: docs EVENTOS_INTEGRACAO_APP.md (no repo JG-Interno).
// Deploy: supabase functions deploy eventos-receber --no-verify-jwt
//
// Auth:  Authorization: Bearer <EVENTOS_API_SECRET>   (= valor do APROVACOES_API_SECRET)
//        X-Client-ID: <id externo do cliente no JG Interno>
//
// Body (envelope v1.0):
// {
//   "evento": "producao.criada",
//   "versao": "1.0",
//   "data": { ...campos do evento... },
//   "notificacao": { "titulo": "...", "mensagem": "..." }   // opcional; sobrescreve default
// }
// ============================================================
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, x-client-id',
  'Content-Type': 'application/json',
};

const j = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: CORS });

// notificacoes.tipo é um ENUM fixo no banco — mapear evento→tipo válido.
type NotifTipo =
  | 'campanha_alerta' | 'producao_status' | 'meta_update'
  | 'pagamento' | 'feedback_novo' | 'aprovacao' | 'geral';

interface Ctx {
  db: SupabaseClient;
  clienteId: string;          // resolvido (clientes.id)
  clienteNome: string | null;
  data: Record<string, any>;  // payload.data do evento
}

interface Handler {
  /** grava o dado de negócio. Retorna null se for só-notificação. */
  persist: (c: Ctx) => Promise<{ error?: string } | null>;
  tipo: NotifTipo;
  // notificação default (envelope.notificacao sobrescreve)
  titulo: (c: Ctx) => string;
  mensagem: (c: Ctx) => string;
  /** se false, não insere notificacao (só grava dado). default true */
  notifica?: boolean;
}

const str = (v: unknown) => (v == null ? null : String(v));
const cut = (s: string, n = 80) => (s.length > n ? s.slice(0, n) : s);

// ── Registro de eventos ─────────────────────────────────────
const HANDLERS: Record<string, Handler> = {
  // ----- APROVAÇÃO (porta o antigo aprovacoes-receber) -----
  'aprovacao.criada': {
    tipo: 'aprovacao',
    titulo: () => '🎨 Nova peça para aprovar!',
    mensagem: (c) => cut(c.data.descricao_post ?? 'Conteúdo aguardando sua aprovação'),
    persist: async ({ db, clienteId, clienteNome, data }) => {
      const { error } = await db.from('aprovacoes').upsert({
        aprovacao_id: data.id,
        cliente_id: clienteId,
        cliente_nome: clienteNome,
        social_media_responsavel: data.social_media_responsavel ?? null,
        tipo_conteudo: data.tipo_conteudo ?? data.tipo ?? 'post',
        plataforma: data.plataforma ?? null,
        data_publicacao_prevista: data.data_publicacao_prevista ?? null,
        descricao_post: data.descricao_post ?? data.titulo ?? null,
        conteudo: data.conteudo ?? data.piece_url ?? null,
        legenda_sugerida: data.legenda_sugerida ?? null,
        observacoes_internas: data.observacoes_internas ?? null,
        prazo_resposta: data.prazo_resposta ?? null,
        callback_url: data.callback?.url_resposta ?? data.callback_url ?? null,
        callback_token: data.callback?.token ?? data.callback_token ?? null,
        status: 'aguardando_aprovacao',
      }, { onConflict: 'aprovacao_id' });
      return error ? { error: error.message } : null;
    },
  },

  // ----- PRODUÇÃO -----
  'producao.criada': {
    tipo: 'producao_status',
    titulo: () => '🎬 Nova produção disponível',
    mensagem: (c) => cut(`"${c.data.titulo ?? 'Produção'}" pronta para você acompanhar`),
    persist: async ({ db, clienteId, data }) => {
      const { error } = await db.from('producoes').upsert({
        id: data.id, // id externo = id interno (idempotência)
        cliente_id: clienteId,
        titulo: data.titulo,
        tipo: data.tipo,
        status: data.status ?? 'aguardando_aprovacao',
        responsavel_id: data.responsavel_id ?? null,
        preview_url: data.preview_url ?? null,
        duracao_segundos: data.duracao_segundos ?? null,
        data_publicacao: data.data_publicacao ?? null,
      }, { onConflict: 'id' });
      return error ? { error: error.message } : null;
    },
  },
  'producao.status': {
    tipo: 'producao_status',
    titulo: () => '🎬 Produção atualizada',
    mensagem: (c) => cut(`"${c.data.titulo ?? 'Produção'}" — ${c.data.status}`),
    persist: async ({ db, data }) => {
      const { error } = await db.from('producoes')
        .update({ status: data.status, updated_at: new Date().toISOString() })
        .eq('id', data.id);
      return error ? { error: error.message } : null;
    },
  },

  // ----- TRÁFEGO -----
  'trafego.atualizado': {
    tipo: 'campanha_alerta',
    notifica: false, // atualização de números; não toca o celular por padrão
    titulo: () => '📊 Tráfego atualizado',
    mensagem: (c) => cut(`Resultados de ${c.data.plataforma} atualizados`),
    persist: async ({ db, clienteId, data }) => {
      const { error } = await db.from('trafego_snapshots').upsert({
        cliente_id: clienteId,
        plataforma: data.plataforma,
        mes: data.mes,
        investido: data.investido ?? 0,
        alcance: data.alcance ?? null,
        impressoes: data.impressoes ?? null,
        cliques: data.cliques ?? null,
        leads: data.leads ?? null,
        conversoes: data.conversoes ?? null,
        roas: data.roas ?? null,
        cpc: data.cpc ?? null,
        cpl: data.cpl ?? null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'cliente_id,plataforma,mes' });
      return error ? { error: error.message } : null;
    },
  },
  'trafego.criativo': {
    tipo: 'campanha_alerta',
    notifica: false,
    titulo: () => '🆕 Novo criativo no ar',
    mensagem: (c) => cut(`${c.data.nome ?? 'Criativo'} em ${c.data.plataforma}`),
    persist: async ({ db, clienteId, data }) => {
      const { error } = await db.from('criativos').insert({
        cliente_id: clienteId,
        nome: data.nome,
        plataforma: data.plataforma,
        status: data.status ?? 'ativo',
        thumbnail_url: data.thumbnail_url ?? null,
      });
      return error ? { error: error.message } : null;
    },
  },

  // ----- AGENDA -----
  'agenda.evento': {
    tipo: 'geral',
    titulo: () => '📅 Novo agendamento',
    mensagem: (c) => cut(c.data.descricao ?? 'Você tem um novo evento na agenda'),
    persist: async ({ db, clienteId, data }) => {
      const { error } = await db.from('agenda_otimizacao').insert({
        cliente_id: clienteId,
        funcionario_id: data.funcionario_id,
        data_hora: data.data_hora,
        descricao: data.descricao,
        plataformas: data.plataformas ?? [],
        status: data.status ?? 'agendado',
      });
      return error ? { error: error.message } : null;
    },
  },

  // ----- METAS -----
  'meta.definida': {
    tipo: 'meta_update',
    titulo: () => '🎯 Nova meta definida',
    mensagem: (c) => cut(c.data.descricao ?? `Meta do mês ${c.data.mes}`),
    persist: async ({ db, clienteId, data }) => {
      const { error } = await db.from('metas').upsert({
        cliente_id: clienteId,
        mes: data.mes,
        valor_meta: data.valor_meta,
        valor_atual: data.valor_atual ?? 0,
        descricao: data.descricao ?? null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'cliente_id,mes' });
      return error ? { error: error.message } : null;
    },
  },
  'meta.atingida': {
    tipo: 'meta_update',
    titulo: () => '🏆 Meta atingida!',
    mensagem: (c) => cut(c.data.descricao ?? 'Parabéns, a meta do mês foi batida!'),
    persist: async ({ db, clienteId, data }) => {
      if (data.valor_atual == null) return null; // só notifica
      const { error } = await db.from('metas')
        .update({ valor_atual: data.valor_atual, updated_at: new Date().toISOString() })
        .eq('cliente_id', clienteId).eq('mes', data.mes);
      return error ? { error: error.message } : null;
    },
  },

  // ----- NPS (pesquisa é global por mês; voto é por cliente) -----
  'nps.solicitado': {
    tipo: 'geral',
    titulo: () => '⭐ Pesquisa de satisfação',
    mensagem: () => 'Conta pra gente: como estamos indo? Leva 1 minuto.',
    persist: async ({ db, data }) => {
      const { error } = await db.from('nps_pesquisas')
        .upsert({ mes: data.mes, ativo: true }, { onConflict: 'mes' });
      return error ? { error: error.message } : null;
    },
  },

  // ----- MARCA / DNA -----
  'marca.atualizada': {
    tipo: 'geral',
    notifica: false,
    titulo: () => '🎨 Identidade da marca atualizada',
    mensagem: () => 'O DNA da sua marca foi atualizado no app',
    persist: async ({ db, clienteId, data }) => {
      const { error } = await db.from('cliente_dna').upsert({
        cliente_id: clienteId,
        descricao: data.descricao ?? null,
        diferencial: data.diferencial ?? null,
        persona_descricao: data.persona_descricao ?? null,
        persona_interesses: data.persona_interesses ?? [],
        tom_de_voz: data.tom_de_voz ?? [],
        exemplo_copy: data.exemplo_copy ?? null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'cliente_id' });
      return error ? { error: error.message } : null;
    },
  },

  // ----- NETWORKING -----
  'networking.novo': {
    tipo: 'geral',
    titulo: () => '🤝 Nova oportunidade de networking',
    mensagem: (c) => cut(c.data.descricao ?? `Conexão no setor ${c.data.setor ?? ''}`),
    persist: async ({ db, clienteId, data }) => {
      const { error } = await db.from('networking_interesses').insert({
        cliente_id: clienteId,
        setor: data.setor,
        descricao: data.descricao ?? null,
        status: data.status ?? 'pendente',
      });
      return error ? { error: error.message } : null;
    },
  },

  // ----- FEEDBACK / RELATÓRIO -----
  'feedback.novo': {
    tipo: 'feedback_novo',
    titulo: () => '💬 Novo feedback',
    mensagem: (c) => cut(c.data.mensagem ?? 'Você recebeu um novo feedback'),
    persist: async ({ db, clienteId, data }) => {
      const { error } = await db.from('feedbacks').insert({
        cliente_id: clienteId,
        tipo: data.tipo ?? 'sugestao',
        mensagem: data.mensagem,
        respondido: false,
        designado_para_id: data.designado_para_id ?? null,
      });
      return error ? { error: error.message } : null;
    },
  },

  // ----- ONBOARDING (sem tabela na visão cliente → só notifica) -----
  'onboarding.etapa': {
    tipo: 'geral',
    titulo: () => '🚀 Onboarding',
    mensagem: (c) => cut(c.data.mensagem ?? `Etapa: ${c.data.etapa ?? 'atualizada'}`),
    persist: async () => null,
  },
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return j({ erro: 'Método não permitido' }, 405);

  // ── Auth ──────────────────────────────────────────────────
  const secret = Deno.env.get('EVENTOS_API_SECRET') ?? Deno.env.get('APROVACOES_API_SECRET') ?? '';
  if (!secret || (req.headers.get('Authorization') ?? '') !== `Bearer ${secret}`) {
    return j({ erro: 'Não autorizado' }, 401);
  }
  const xClientId = req.headers.get('X-Client-ID');
  if (!xClientId) return j({ erro: 'Header X-Client-ID obrigatório' }, 400);

  // ── Body ──────────────────────────────────────────────────
  let body: any;
  try { body = await req.json(); }
  catch { return j({ erro: 'JSON inválido' }, 400); }

  const evento = str(body.evento);
  if (!evento) return j({ erro: 'evento é obrigatório' }, 400);
  const handler = HANDLERS[evento];
  if (!handler) return j({ erro: `evento desconhecido: ${evento}` }, 422);

  const data = body.data ?? body.aprovacao ?? {};

  // ── Supabase service role ─────────────────────────────────
  const db = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  // ── Resolve cliente pelo X-Client-ID ──────────────────────
  // UUID → casa por clientes.id; senão por nome_fantasia (ilike).
  // (id.eq com valor não-UUID lança erro no Postgres e quebra a resolução.)
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(xClientId);
  const base = db.from('clientes').select('id, nome_fantasia');
  const { data: cliente } = isUuid
    ? await base.eq('id', xClientId).maybeSingle()
    : await base.ilike('nome_fantasia', `%${xClientId}%`).limit(1).maybeSingle();
  if (!cliente?.id) return j({ erro: 'cliente não encontrado', x_client_id: xClientId }, 404);

  const ctx: Ctx = { db, clienteId: cliente.id, clienteNome: cliente.nome_fantasia, data };

  // ── 1) Grava dado de negócio ──────────────────────────────
  const res = await handler.persist(ctx);
  if (res?.error) return j({ erro: res.error, evento }, 500);

  // ── 2) Notifica usuários do cliente ───────────────────────
  let notificados = 0;
  const deveNotificar = handler.notifica !== false;
  if (deveNotificar) {
    const titulo = body.notificacao?.titulo ?? handler.titulo(ctx);
    const mensagem = body.notificacao?.mensagem ?? handler.mensagem(ctx);

    const { data: usuarios } = await db
      .from('cliente_usuarios')
      .select('profile_id')
      .eq('cliente_id', cliente.id);

    for (const u of usuarios ?? []) {
      const { error } = await db.from('notificacoes').insert({
        profile_id: u.profile_id,
        tipo: handler.tipo,
        titulo,
        mensagem,
      });
      if (!error) notificados++;
    }
  }

  return j({ recebido: true, evento, cliente_id: cliente.id, notificados });
});
