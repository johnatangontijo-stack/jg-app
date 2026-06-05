import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { Database } from '../types/database';

type Cliente = Database['public']['Tables']['clientes']['Row'];

interface ClienteState {
  cliente: Cliente | null;
  loading: boolean;
  error: string | null;
  load: (clienteId: string) => Promise<void>;
}

export const useClienteStore = create<ClienteState>((set) => ({
  cliente: null,
  loading: false,
  error: null,

  load: async (clienteId) => {
    set({ loading: true, error: null });
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .eq('id', clienteId)
      .single();

    if (error) {
      set({ error: error.message, loading: false });
      return;
    }
    set({ cliente: data, loading: false });
  },
}));
