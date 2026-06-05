import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { Database } from '../types/database';

type Notificacao = Database['public']['Tables']['notificacoes']['Row'];

interface NotificacoesState {
  notificacoes: Notificacao[];
  naoLidas: number;
  loading: boolean;
  load: (profileId: string) => Promise<void>;
  marcarLida: (id: string) => Promise<void>;
  marcarTodasLidas: (profileId: string) => Promise<void>;
  subscribeRealtime: (profileId: string) => () => void;
}

export const useNotificacoesStore = create<NotificacoesState>((set, get) => ({
  notificacoes: [],
  naoLidas: 0,
  loading: false,

  load: async (profileId) => {
    set({ loading: true });
    const { data } = await supabase
      .from('notificacoes')
      .select('*')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false })
      .limit(50);

    const list = data ?? [];
    set({
      notificacoes: list,
      naoLidas: list.filter((n) => !n.lida).length,
      loading: false,
    });
  },

  marcarLida: async (id) => {
    await supabase.from('notificacoes').update({ lida: true }).eq('id', id);
    set((s) => ({
      notificacoes: s.notificacoes.map((n) => (n.id === id ? { ...n, lida: true } : n)),
      naoLidas: Math.max(0, s.naoLidas - 1),
    }));
  },

  marcarTodasLidas: async (profileId) => {
    await supabase
      .from('notificacoes')
      .update({ lida: true })
      .eq('profile_id', profileId)
      .eq('lida', false);
    set((s) => ({
      notificacoes: s.notificacoes.map((n) => ({ ...n, lida: true })),
      naoLidas: 0,
    }));
  },

  subscribeRealtime: (profileId) => {
    const channel = supabase
      .channel('notificacoes-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notificacoes',
          filter: `profile_id=eq.${profileId}`,
        },
        (payload) => {
          const nova = payload.new as Notificacao;
          set((s) => ({
            notificacoes: [nova, ...s.notificacoes],
            naoLidas: s.naoLidas + 1,
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
}));
