import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { Database } from '../types/database';

type Snapshot = Database['public']['Tables']['trafego_snapshots']['Row'];
type Criativo = Database['public']['Tables']['criativos']['Row'];

export function useTrafego() {
  const { clienteId } = useAuthStore();
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [criativos, setCriativos] = useState<Criativo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const mesAtual = new Date().toISOString().slice(0, 7);

  const load = useCallback(async () => {
    if (!clienteId) { setLoading(false); return; }
    setLoading(true);
    setError(null);

    const [snapshotsRes, criativosRes] = await Promise.all([
      supabase
        .from('trafego_snapshots')
        .select('*')
        .eq('cliente_id', clienteId)
        .eq('mes', mesAtual),
      supabase
        .from('criativos')
        .select('*')
        .eq('cliente_id', clienteId)
        .eq('status', 'ativo'),
    ]);

    if (snapshotsRes.error) setError(snapshotsRes.error.message);
    else setSnapshots(snapshotsRes.data ?? []);

    if (criativosRes.data) setCriativos(criativosRes.data);
    setUpdatedAt(new Date());
    setLoading(false);
  }, [clienteId, mesAtual]);

  useEffect(() => {
    load();
  }, [load]);

  const metaSnap = snapshots.find((s) => s.plataforma === 'meta');
  const googleSnap = snapshots.find((s) => s.plataforma === 'google');

  const totalInvestido = snapshots.reduce((acc, s) => acc + (s.investido ?? 0), 0);
  const totalAlcance = snapshots.reduce((acc, s) => acc + (s.alcance ?? 0), 0);
  const totalCliques = snapshots.reduce((acc, s) => acc + (s.cliques ?? 0), 0);
  const totalLeads = snapshots.reduce((acc, s) => acc + (s.leads ?? 0), 0);
  const roasMedio =
    snapshots.length > 0
      ? snapshots.reduce((acc, s) => acc + (s.roas ?? 0), 0) / snapshots.length
      : 0;
  const cplMedio = totalLeads > 0 ? totalInvestido / totalLeads : 0;

  return {
    snapshots,
    criativos,
    metaSnap,
    googleSnap,
    loading,
    error,
    updatedAt,
    metricas: { totalInvestido, totalAlcance, totalCliques, totalLeads, roasMedio, cplMedio },
    reload: load,
  };
}
