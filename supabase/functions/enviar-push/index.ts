// Supabase Edge Function — POST /functions/v1/enviar-push
// Envia push via Expo Push API quando uma notificação é criada.
// Disparada pelo trigger `trg_notificacoes_push` (pg_net) no INSERT de `notificacoes`,
// ou chamada direta com { profile_id, titulo, mensagem, tipo }.
// Deploy: supabase functions deploy enviar-push
//
// Tokens inválidos (DeviceNotRegistered) são removidos automaticamente.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, x-hook-secret',
  'Content-Type': 'application/json',
};

const EXPO_PUSH = 'https://exp.host/--/api/v2/push/send';

interface ExpoMessage {
  to: string;
  sound: 'default';
  title: string;
  body: string;
  data?: Record<string, unknown>;
  priority: 'high';
  channelId: 'default';
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ erro: 'Método não permitido' }), { status: 405, headers: CORS });
  }

  // Guard opcional: se PUSH_HOOK_SECRET estiver setado, exige o header.
  const secret = Deno.env.get('PUSH_HOOK_SECRET');
  if (secret && req.headers.get('x-hook-secret') !== secret) {
    return new Response(JSON.stringify({ erro: 'Não autorizado' }), { status: 401, headers: CORS });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  let body: any;
  try { body = await req.json(); }
  catch { return new Response(JSON.stringify({ erro: 'JSON inválido' }), { status: 400, headers: CORS }); }

  // Aceita payload de DB webhook ({ record: {...} }) ou chamada direta.
  const n = body.record ?? body;
  const profile_id: string | undefined = n.profile_id;
  const titulo: string = n.titulo ?? 'JG App';
  const mensagem: string = n.mensagem ?? '';
  const tipo: string = n.tipo ?? 'geral';

  if (!profile_id) {
    return new Response(JSON.stringify({ erro: 'profile_id obrigatório' }), { status: 400, headers: CORS });
  }

  // Busca tokens push do usuário
  const { data: tokens, error: tokErr } = await supabase
    .from('push_tokens')
    .select('token')
    .eq('profile_id', profile_id);

  if (tokErr) {
    return new Response(JSON.stringify({ erro: tokErr.message }), { status: 500, headers: CORS });
  }
  if (!tokens || tokens.length === 0) {
    return new Response(JSON.stringify({ sucesso: true, enviados: 0, motivo: 'sem tokens' }), { status: 200, headers: CORS });
  }

  // Só tokens Expo válidos
  const validos = tokens
    .map((t: { token: string }) => t.token)
    .filter((t: string) => typeof t === 'string' && t.startsWith('ExponentPushToken'));

  if (validos.length === 0) {
    return new Response(JSON.stringify({ sucesso: true, enviados: 0, motivo: 'sem tokens Expo' }), { status: 200, headers: CORS });
  }

  const messages: ExpoMessage[] = validos.map((to: string) => ({
    to,
    sound: 'default',
    title: titulo,
    body: mensagem,
    data: { tipo, profile_id },
    priority: 'high',
    channelId: 'default',
  }));

  // Envia em lotes de 100 (limite Expo)
  const tickets: any[] = [];
  for (let i = 0; i < messages.length; i += 100) {
    const lote = messages.slice(i, i + 100);
    try {
      const res = await fetch(EXPO_PUSH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(lote),
      });
      const json = await res.json();
      if (Array.isArray(json.data)) tickets.push(...json.data);
    } catch (e) {
      console.error('Falha ao enviar lote Expo:', e);
    }
  }

  // Remove tokens mortos (DeviceNotRegistered)
  const mortos: string[] = [];
  tickets.forEach((t, idx) => {
    if (t?.status === 'error' && t?.details?.error === 'DeviceNotRegistered') {
      mortos.push(validos[idx]);
    }
  });
  if (mortos.length > 0) {
    await supabase.from('push_tokens').delete().in('token', mortos);
  }

  return new Response(
    JSON.stringify({ sucesso: true, enviados: validos.length - mortos.length, removidos: mortos.length }),
    { status: 200, headers: CORS },
  );
});
