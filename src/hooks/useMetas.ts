import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { Database } from '../types/database';

type Meta = Database['public']['Tables']['metas']['Row'];
type MetaItem = Database['public']['Tables']['meta_itens']['Row'];

export function useMetas() {
  const { clienteId } = useAuthStore();
  const [meta, setMeta] = useState<Meta | null>(null);
  const [itens, setItens] = useState<MetaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mesAtual = new Date().toISOString().slice(0, 7);

  const load = useCallback(async () => {
    if (!clienteId) return;
    setLoading(true);
    setError(null);

    const { data: metaData, error: metaErr } = await supabase
      .from('metas')
      .select('*')
      .eq('cliente_id', clienteId)
      .eq('mes', mesAtual)
      .maybeSingle();

    if (metaErr) { setError(metaErr.message); setLoading(false); return; }
    setMeta(metaData);

    if (metaData) {
      const { data: itensData } = await supabase
        .from('meta_itens')
        .select('*')
        .eq('meta_id', metaData.id)
        .order('created_at');
      setItens(itensData ?? []);
    }
    setLoading(false);
  }, [clienteId, mesAtual]);

  useEffect(() => { load(); }, [load]);

  const toggleItem = async (item: MetaItem) => {
    const { error: err } = await supabase
      .from('meta_itens')
      .update({
        concluido: !item.concluido,
        concluido_em: !item.concluido ? new Date().toISOString() : null,
      })
      .eq('id', item.id);
    if (err) throw err;
    await load();
  };

  const itensJG = itens.filter((i) => i.responsavel === 'jg');
  const itensCliente = itens.filter((i) => i.responsavel === 'cliente');
  const pctJG = itensJG.length > 0 ? Math.round((itensJG.filter((i) => i.concluido).length / itensJG.length) * 100) : 0;
  const pctCliente = itensCliente.length > 0 ? Math.round((itensCliente.filter((i) => i.concluido).length / itensCliente.length) * 100) : 0;
  const pctGeral = itens.length > 0 ? Math.round((itens.filter((i) => i.concluido).length / itens.length) * 100) : 0;
  const pctMeta = meta ? Math.min(100, Math.round(((meta.valor_atual ?? 0) / meta.valor_meta) * 100)) : 0;

  return { meta, itens, itensJG, itensCliente, pctJG, pctCliente, pctGeral, pctMeta, loading, error, toggleItem, reload: load };
}
