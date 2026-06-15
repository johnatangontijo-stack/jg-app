import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { Database } from '../types/database';

type Producao = Database['public']['Tables']['producoes']['Row'];

export function useProducoes() {
  const { clienteId, profile } = useAuthStore();
  const [producoes, setProducoes] = useState<Producao[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!clienteId) return;
    setLoading(true);
    setError(null);

    const { data, error: err } = await supabase
      .from('producoes')
      .select('*')
      .eq('cliente_id', clienteId)
      .order('created_at', { ascending: false });

    if (err) setError(err.message);
    else setProducoes(data ?? []);
    setLoading(false);
  }, [clienteId]);

  useEffect(() => {
    load();

    if (!clienteId) return;
    const channel = supabase
      .channel(`producoes-rt-${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'producoes',
          filter: `cliente_id=eq.${clienteId}`,
        },
        () => load()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clienteId, load]);

  const aprovar = async (id: string) => {
    const { error: err } = await supabase
      .from('producoes')
      .update({
        status: 'aprovada',
        aprovado_em: new Date().toISOString(),
        aprovado_por: profile?.id,
      })
      .eq('id', id);
    if (err) throw err;

    const producao = producoes.find((p) => p.id === id);
    if (producao?.responsavel_id) {
      await supabase.from('notificacoes').insert({
        profile_id: producao.responsavel_id,
        tipo: 'producao_status',
        titulo: 'Produção aprovada!',
        mensagem: `Produção "${producao.titulo}" foi aprovada.`,
      });
    }
    await load();
  };

  const reprovar = async (id: string, motivo: string) => {
    const { error: err } = await supabase
      .from('producoes')
      .update({ status: 'reprovada', reprovado_motivo: motivo })
      .eq('id', id);
    if (err) throw err;
    await load();
  };

  const aguardando = producoes.filter((p) => p.status === 'aguardando_aprovacao');
  const recentes = producoes.slice(0, 4);

  return { producoes, aguardando, recentes, loading, error, aprovar, reprovar, reload: load };
}
