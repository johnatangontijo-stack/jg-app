import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { Database } from '../types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface AuthState {
  profile: Profile | null;
  clienteId: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  loadProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  profile: null,
  clienteId: null,
  loading: true,

  signIn: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ profile: null, clienteId: null });
  },

  loadProfile: async () => {
    set({ loading: true });
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      set({ loading: false });
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    let clienteId: string | null = null;
    if (profile?.role === 'cliente') {
      const { data: cu } = await supabase
        .from('cliente_usuarios')
        .select('cliente_id')
        .eq('profile_id', user.id)
        .single();
      clienteId = cu?.cliente_id ?? null;
    }

    set({ profile: profile ?? null, clienteId, loading: false });
  },
}));
