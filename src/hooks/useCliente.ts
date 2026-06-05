import { useEffect } from 'react';
import { useClienteStore } from '../stores/clienteStore';
import { useAuthStore } from '../stores/authStore';

export function useCliente() {
  const { clienteId } = useAuthStore();
  const { cliente, loading, error, load } = useClienteStore();

  useEffect(() => {
    if (clienteId) load(clienteId);
  }, [clienteId]);

  return { cliente, loading, error };
}
