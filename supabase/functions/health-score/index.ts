import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { data: clientes, error } = await supabase.from('clientes').select('id').eq('status', 'ativo');

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  let updated = 0;
  for (const cliente of clientes ?? []) {
    const { data: score } = await supabase.rpc('calcular_health_score', { p_cliente_id: cliente.id });

    if (score !== null) {
      await supabase.from('clientes').update({ health_score: score }).eq('id', cliente.id);
      updated++;
    }
  }

  return new Response(JSON.stringify({ ok: true, updated }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
