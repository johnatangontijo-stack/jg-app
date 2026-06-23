// Supabase Edge Function (JG App) — POST /functions/v1/provisionar-cliente
// ============================================================
// Cria/garante a conta do cliente no app a partir do JG Interno.
// Idempotente: reusa profile (por email) e cliente (por nome_fantasia) se já existirem.
// Chamada pela edge `ativar-app` do JG Interno (que guarda o cliente_id retornado).
//
// Deploy: supabase functions deploy provisionar-cliente --no-verify-jwt
// Auth: Authorization: Bearer <EVENTOS_API_SECRET>  (mesmo segredo da integração)
//
// Body: { nome, email, whatsapp?, senha? }
// Retorna: { cliente_id, profile_id, criou_login, senha_temporaria? }
// ============================================================
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Content-Type': 'application/json',
};
const j = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: CORS });

function senhaForte(): string {
  // 12 chars: maiúscula, minúscula, dígito e símbolo garantidos.
  const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ', b = 'abcdefghijkmnpqrstuvwxyz', n = '23456789', s = '!@#$%&*';
  const all = a + b + n + s;
  const pick = (set: string) => set[Math.floor(Math.random() * set.length)];
  let p = pick(a) + pick(b) + pick(n) + pick(s);
  for (let i = 0; i < 8; i++) p += pick(all);
  return p.split('').sort(() => Math.random() - 0.5).join('');
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return j({ erro: 'Método não permitido' }, 405);

  const secret = Deno.env.get('EVENTOS_API_SECRET') ?? Deno.env.get('APROVACOES_API_SECRET') ?? '';
  if (!secret || (req.headers.get('Authorization') ?? '') !== `Bearer ${secret}`) {
    return j({ erro: 'Não autorizado' }, 401);
  }

  let body: any;
  try { body = await req.json(); } catch { return j({ erro: 'JSON inválido' }, 400); }

  const nome = String(body.nome ?? '').trim();
  const email = String(body.email ?? '').trim().toLowerCase();
  const whatsapp = body.whatsapp ? String(body.whatsapp) : null;
  if (!nome) return j({ erro: 'nome obrigatório' }, 400);
  if (!email || !email.includes('@')) return j({ erro: 'email válido obrigatório' }, 400);

  const db = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  // ── 1) Login (auth user → profile via trigger handle_new_user) ──────────────
  let profile_id: string | null = null;
  let criou_login = false;
  let senha_temporaria: string | undefined;

  const { data: existente } = await db.from('profiles').select('id').eq('email', email).maybeSingle();
  if (existente?.id) {
    profile_id = existente.id;
  } else {
    senha_temporaria = body.senha ? String(body.senha) : senhaForte();
    const { data: novo, error: authErr } = await db.auth.admin.createUser({
      email,
      password: senha_temporaria,
      email_confirm: true,
      user_metadata: { nome, role: 'cliente' },
    });
    if (authErr || !novo?.user?.id) return j({ erro: `falha ao criar login: ${authErr?.message}` }, 500);
    profile_id = novo.user.id;
    criou_login = true;
    // garante role cliente (caso o trigger tenha caído em default diferente)
    await db.from('profiles').update({ role: 'cliente', nome }).eq('id', profile_id);
  }

  // ── 2) Cliente (reusa por nome_fantasia, senão cria) ────────────────────────
  let cliente_id: string;
  const { data: cli } = await db.from('clientes').select('id').ilike('nome_fantasia', nome).limit(1).maybeSingle();
  if (cli?.id) {
    cliente_id = cli.id;
    if (whatsapp) await db.from('clientes').update({ whatsapp_grupo: whatsapp }).eq('id', cliente_id);
  } else {
    const { data: novoCli, error: cliErr } = await db.from('clientes')
      .insert({ nome_fantasia: nome, whatsapp_grupo: whatsapp })
      .select('id').single();
    if (cliErr || !novoCli) return j({ erro: `falha ao criar cliente: ${cliErr?.message}` }, 500);
    cliente_id = novoCli.id;
  }

  // ── 3) Liga cliente ↔ login (idempotente) ───────────────────────────────────
  const { error: linkErr } = await db.from('cliente_usuarios')
    .upsert({ cliente_id, profile_id }, { onConflict: 'cliente_id,profile_id' });
  if (linkErr) return j({ erro: `falha ao vincular: ${linkErr.message}` }, 500);

  return j({ cliente_id, profile_id, criou_login, ...(senha_temporaria ? { senha_temporaria } : {}) });
});
