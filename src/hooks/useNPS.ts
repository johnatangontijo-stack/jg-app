import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { Database } from '../types/database';

type NPSPesquisa = Database['public']['Tables']['nps_pesquisas']['Row'];
type NPSVoto = Database['public']['Tables']['nps_votos']['Row'];

export function useNPS() {
  const { clienteId } = useAuthStore();
  const [pesquisa, setPesquisa] = useState<NPSPesquisa | null>(null);
  const [votos, setVotos] = useState<NPSVoto[]>([]);
  const [meuVoto, setMeuVoto] = useState<NPSVoto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!clienteId) return;
    setLoading(true);
    setError(null);

    const { data: pesquisaData } = await supabase
      .from('nps_pesquisas')
      .select('*')
      .eq('ativo', true)
      .maybeSingle();

    setPesquisa(pesquisaData);

    if (pesquisaData) {
      const [votosRes, meuVotoRes] = await Promise.all([
        supabase.from('nps_votos').select('*').eq('pesquisa_id', pesquisaData.id),
        supabase
          .from('nps_votos')
          .select('*')
          .eq('pesquisa_id', pesquisaData.id)
          .eq('cliente_id', clienteId)
          .maybeSingle(),
      ]);

      setVotos(votosRes.data ?? []);
      setMeuVoto(meuVotoRes.data);
    }
    setLoading(false);
  }, [clienteId]);

  useEffect(() => { load(); }, [load]);

  const votar = async (nota: number, comentario: string) => {
    if (!pesquisa || !clienteId) return;
    const { error: err } = await supabase.from('nps_votos').insert({
      pesquisa_id: pesquisa.id,
      cliente_id: clienteId,
      nota,
      comentario: comentario || null,
    });
    if (err) throw err;
    await load();
  };

  const promotores = votos.filter((v) => v.nota >= 9).length;
  const detratores = votos.filter((v) => v.nota <= 6).length;
  const neutros = votos.filter((v) => v.nota >= 7 && v.nota <= 8).length;
  const total = votos.length;
  const score = total > 0 ? Math.round(((promotores - detratores) / total) * 100) : 0;

  return {
    pesquisa,
    votos,
    meuVoto,
    score,
    promotores,
    detratores,
    neutros,
    total,
    loading,
    error,
    votar,
    reload: load,
  };
}
