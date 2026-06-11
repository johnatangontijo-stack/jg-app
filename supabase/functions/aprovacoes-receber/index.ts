// Supabase Edge Function — POST /functions/v1/aprovacoes-receber
// Recebe peças para aprovação enviadas pelo sistema JG Interno
// Deploy: supabase functions deploy aprovacoes-receber

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, x-client-id',
  'Content-Type': 'application/json',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ erro: 'Método não permitido' }), { status: 405, headers: CORS });
  }

  // ── Validação do Bearer token ──────────────────────────────────────────────
  const apiSecret = Deno.env.get('APROVACOES_API_SECRET') ?? '';
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!apiSecret || authHeader !== `Bearer ${apiSecret}`) {
    return new Response(JSON.stringify({ erro: 'Não autorizado' }), { status: 401, headers: CORS });
  }

  // ── Validação do X-Client-ID ───────────────────────────────────────────────
  const xClientId = req.headers.get('X-Client-ID');
  if (!xClientId) {
    return new Response(JSON.stringify({ erro: 'Header X-Client-ID obrigatório' }), { status: 400, headers: CORS });
  }

  // ── Parse do body ──────────────────────────────────────────────────────────
  let body: any;
  try { body = await req.json(); }
  catch { return new Response(JSON.stringify({ erro: 'JSON inválido' }), { status: 400, headers: CORS }); }

  const { evento, aprovacao, callback } = body;
  if (!aprovacao?.id) {
    return new Response(JSON.stringify({ erro: 'aprovacao.id é obrigatório' }), { status: 400, headers: CORS });
  }

  // ── Supabase client (service role) ────────────────────────────────────────
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  // Resolve cliente_id pelo ID externo ou nome
  const { data: cliente } = await supabase
    .from('clientes')
    .select('id')
    .or(`id.eq.${aprovacao.cliente_id},nome_fantasia.ilike.%${aprovacao.cliente_nome ?? ''}%`)
    .maybeSingle();

  // ── Insere aprovação ──────────────────────────────────────────────────────
  const { error: insertErr } = await supabase.from('aprovacoes').insert({
    aprovacao_id:             aprovacao.id,
    cliente_id:               cliente?.id ?? null,
    cliente_nome:             aprovacao.cliente_nome,
    social_media_responsavel: aprovacao.social_media_responsavel,
    tipo_conteudo:            aprovacao.tipo_conteudo,
    plataforma:               aprovacao.plataforma,
    data_publicacao_prevista: aprovacao.data_publicacao_prevista,
    descricao_post:           aprovacao.descricao_post,
    conteudo:                 aprovacao.conteudo,
    legenda_sugerida:         aprovacao.legenda_sugerida,
    observacoes_internas:     aprovacao.observacoes_internas,
    prazo_resposta:           aprovacao.prazo_resposta,
    callback_url:             callback?.url_resposta,
    callback_token:           callback?.token,
    status:                   'aguardando_aprovacao',
  });

  if (insertErr) {
    return new Response(JSON.stringify({ erro: insertErr.message }), { status: 500, headers: CORS });
  }

  // ── Notifica os usuários do cliente ───────────────────────────────────────
  if (cliente?.id) {
    const { data: cu } = await supabase
      .from('cliente_usuarios')
      .select('profile_id')
      .eq('cliente_id', cliente.id);

    for (const u of cu ?? []) {
      await supabase.from('notificacoes').insert({
        profile_id: u.profile_id,
        tipo:       'aprovacao',
        titulo:     '🎨 Nova peça para aprovar!',
        mensagem:   (aprovacao.descricao_post ?? 'Conteúdo aguardando sua aprovação').substring(0, 80),
      });
    }
  }

  // ── Notifica equipe interna (social_media / head / admin) ─────────────────
  const { data: equipe } = await supabase
    .from('profiles')
    .select('id')
    .in('role', ['admin', 'gerencia', 'head', 'social_media'])
    .eq('ativo', true);

  for (const m of equipe ?? []) {
    await supabase.from('notificacoes').insert({
      profile_id: m.id,
      tipo:       'aprovacao',
      titulo:     `📤 Aprovação enviada — ${aprovacao.cliente_nome ?? 'Cliente'}`,
      mensagem:   `${aprovacao.tipo_conteudo} · ${aprovacao.plataforma} · aguardando resposta`,
    });
  }

  return new Response(
    JSON.stringify({
      recebido:    true,
      aprovacao_id: aprovacao.id,
      status:      'aguardando_aprovacao',
    }),
    { status: 200, headers: CORS },
  );
});
