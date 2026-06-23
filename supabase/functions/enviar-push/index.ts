// Supabase Edge Function — POST /functions/v1/enviar-push
// Envia push para o usuário em DOIS canais ao mesmo tempo:
//   1) Expo Push API   (app nativo — push_tokens)
//   2) Web Push VAPID  (PWA iOS/Android/desktop — web_push_subscriptions)
// Disparada pelo trigger `trg_notificacoes_push` (pg_net) no INSERT de `notificacoes`,
// ou chamada direta com { profile_id, titulo, mensagem, tipo }.
// Deploy: supabase functions deploy enviar-push
//
// Inscrições/tokens inválidos são removidos automaticamente.
// Secrets web push (setar uma vez):
//   supabase secrets set VAPID_PUBLIC=... VAPID_PRIVATE=... VAPID_SUBJECT=mailto:yurilinsofc@gmail.com

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, x-hook-secret',
  'Content-Type': 'application/json',
};

const EXPO_PUSH = 'https://exp.host/--/api/v2/push/send';

// notificacoes.tipo não tem coluna url → deep-link derivado do tipo.
// O sw.js (v3) abre data.url no notificationclick.
const ROTA_POR_TIPO: Record<string, string> = {
  aprovacao: '/(cliente)/aprovacoes',
  producao_status: '/(cliente)/producoes',
  meta_update: '/(cliente)/metas',
  campanha_alerta: '/(cliente)/trafego',
  feedback_novo: '/(cliente)/feedback',
  pagamento: '/(cliente)',
  geral: '/(cliente)',
};

// Configura VAPID uma vez por cold start (se os secrets existirem).
const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC') ?? '';
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE') ?? '';
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:yurilinsofc@gmail.com';
let vapidOk = false;
try {
  if (VAPID_PUBLIC && VAPID_PRIVATE) {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
    vapidOk = true;
  }
} catch (e) {
  console.error('VAPID setup falhou:', e);
}

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

  const url = ROTA_POR_TIPO[tipo] ?? '/(cliente)';

  // ── Canal 1: Expo (app nativo) ──────────────────────────────────────────────
  const expo = await enviarExpo(supabase, profile_id, titulo, mensagem, tipo);

  // ── Canal 2: Web Push VAPID (PWA) ───────────────────────────────────────────
  const web = await enviarWebPush(supabase, profile_id, titulo, mensagem, url);

  return new Response(
    JSON.stringify({ sucesso: true, expo, web }),
    { status: 200, headers: CORS },
  );
});

// ── Expo Push (push_tokens) ───────────────────────────────────────────────────
async function enviarExpo(
  supabase: any, profile_id: string, titulo: string, mensagem: string, tipo: string,
): Promise<{ enviados: number; removidos: number; motivo?: string }> {
  const { data: tokens, error } = await supabase
    .from('push_tokens').select('token').eq('profile_id', profile_id);
  if (error) return { enviados: 0, removidos: 0, motivo: error.message };

  const validos = (tokens ?? [])
    .map((t: { token: string }) => t.token)
    .filter((t: string) => typeof t === 'string' && t.startsWith('ExponentPushToken'));
  if (validos.length === 0) return { enviados: 0, removidos: 0, motivo: 'sem tokens Expo' };

  const messages: ExpoMessage[] = validos.map((to: string) => ({
    to, sound: 'default', title: titulo, body: mensagem,
    data: { tipo, profile_id }, priority: 'high', channelId: 'default',
  }));

  const tickets: any[] = [];
  for (let i = 0; i < messages.length; i += 100) {
    try {
      const res = await fetch(EXPO_PUSH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(messages.slice(i, i + 100)),
      });
      const json = await res.json();
      if (Array.isArray(json.data)) tickets.push(...json.data);
    } catch (e) {
      console.error('Falha ao enviar lote Expo:', e);
    }
  }

  const mortos: string[] = [];
  tickets.forEach((t, idx) => {
    if (t?.status === 'error' && t?.details?.error === 'DeviceNotRegistered') mortos.push(validos[idx]);
  });
  if (mortos.length > 0) await supabase.from('push_tokens').delete().in('token', mortos);

  return { enviados: validos.length - mortos.length, removidos: mortos.length };
}

// ── Web Push VAPID (web_push_subscriptions) ───────────────────────────────────
async function enviarWebPush(
  supabase: any, profile_id: string, titulo: string, mensagem: string, url: string,
): Promise<{ enviados: number; removidos: number; motivo?: string }> {
  if (!vapidOk) return { enviados: 0, removidos: 0, motivo: 'VAPID não configurado' };

  const { data: subs, error } = await supabase
    .from('web_push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('profile_id', profile_id);
  if (error) return { enviados: 0, removidos: 0, motivo: error.message };
  if (!subs || subs.length === 0) return { enviados: 0, removidos: 0, motivo: 'sem inscrições' };

  const payload = JSON.stringify({ title: titulo, body: mensagem, url });
  const mortos: string[] = [];
  let enviados = 0;

  await Promise.all(subs.map(async (s: { endpoint: string; p256dh: string; auth: string }) => {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload,
      );
      enviados++;
    } catch (e: any) {
      const code = e?.statusCode;
      if (code === 404 || code === 410) mortos.push(s.endpoint); // inscrição morta
      else console.error('Falha web push:', code, e?.body ?? e?.message);
    }
  }));

  if (mortos.length > 0) {
    await supabase.from('web_push_subscriptions').delete().in('endpoint', mortos);
  }

  return { enviados, removidos: mortos.length };
}
