// Supabase Edge Function — POST /functions/v1/aprovacoes-responder
// Recebe a resposta do cliente, atualiza o DB e dispara o callback para JG Interno
// Deploy: supabase functions deploy aprovacoes-responder

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Content-Type': 'application/json',
};

// Payload esperado do app cliente:
// { aprovacao_id: "apr_...", profile_id: "uuid", resposta: "aprovado"|"reprovado"|"revisao", comentario?: string }

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ erro: 'Método não permitido' }), { status: 405, headers: CORS });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  let body: any;
  try { body = await req.json(); }
  catch { return new Response(JSON.stringify({ erro: 'JSON inválido' }), { status: 400, headers: CORS }); }

  const { aprovacao_id, profile_id, resposta, comentario } = body;

  if (!aprovacao_id || !profile_id || !resposta) {
    return new Response(JSON.stringify({ erro: 'aprovacao_id, profile_id e resposta são obrigatórios' }), { status: 400, headers: CORS });
  }

  const statusValidos = ['aprovado', 'reprovado', 'revisao'];
  if (!statusValidos.includes(resposta)) {
    return new Response(JSON.stringify({ erro: `resposta deve ser um de: ${statusValidos.join(', ')}` }), { status: 400, headers: CORS });
  }

  // Busca a aprovação atual
  const { data: apr, error: findErr } = await supabase
    .from('aprovacoes')
    .select('*')
    .eq('aprovacao_id', aprovacao_id)
    .single();

  if (findErr || !apr) {
    return new Response(JSON.stringify({ erro: 'Aprovação não encontrada' }), { status: 404, headers: CORS });
  }

  if (apr.status !== 'aguardando_aprovacao') {
    return new Response(JSON.stringify({ erro: 'Esta aprovação já foi respondida', status_atual: apr.status }), { status: 409, headers: CORS });
  }

  // Atualiza a aprovação
  await supabase.from('aprovacoes').update({
    status:             resposta,
    resposta_comentario: comentario ?? null,
    respondido_em:      new Date().toISOString(),
    respondido_por:     profile_id,
  }).eq('aprovacao_id', aprovacao_id);

  // Notifica equipe interna
  const emoji = resposta === 'aprovado' ? '✅' : resposta === 'reprovado' ? '❌' : '🔄';
  const { data: equipe } = await supabase
    .from('profiles')
    .select('id')
    .in('role', ['admin', 'gerencia', 'head', 'social_media'])
    .eq('ativo', true);

  for (const m of equipe ?? []) {
    await supabase.from('notificacoes').insert({
      profile_id: m.id,
      tipo:       'aprovacao',
      titulo:     `${emoji} ${apr.cliente_nome ?? 'Cliente'} ${resposta === 'aprovado' ? 'aprovou' : resposta === 'reprovado' ? 'reprovou' : 'pediu revisão'}`,
      mensagem:   comentario ? comentario.substring(0, 80) : `Peça: ${apr.descricao_post?.substring(0, 60) ?? '—'}`,
    });
  }

  // Dispara callback para JG Interno (se configurado)
  if (apr.callback_url) {
    try {
      await fetch(apr.callback_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apr.callback_token ?? ''}`,
        },
        body: JSON.stringify({
          evento:       'resposta_aprovacao',
          aprovacao_id: aprovacao_id,
          status:       resposta,
          comentario:   comentario ?? null,
          respondido_em: new Date().toISOString(),
          cliente_nome:  apr.cliente_nome,
        }),
      });
    } catch (e) {
      console.error('Callback falhou:', e);
      // Não falha a resposta por causa do callback
    }
  }

  return new Response(
    JSON.stringify({ sucesso: true, aprovacao_id, status: resposta }),
    { status: 200, headers: CORS },
  );
});
