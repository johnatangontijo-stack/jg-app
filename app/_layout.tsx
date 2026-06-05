import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '../src/stores/authStore';
import { supabase } from '../src/lib/supabase';
import { registerForPushNotificationsAsync } from '../src/lib/notifications';

export default function RootLayout() {
  const { profile, loading, loadProfile } = useAuthStore();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    loadProfile();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadProfile();
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (loading) return;
    const inAuth = segments[0] === '(auth)';

    if (!profile && !inAuth) {
      router.replace('/(auth)/login');
      return;
    }

    if (profile) {
      const isCliente = profile.role === 'cliente';
      const inCliente = segments[0] === '(cliente)';
      const inInterno = segments[0] === '(interno)';

      if (isCliente && !inCliente) {
        router.replace('/(cliente)');
      } else if (!isCliente && !inInterno) {
        router.replace('/(interno)/dashboard');
      }

      registerForPushNotificationsAsync(profile.id);
    }
  }, [profile, loading]);

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}
