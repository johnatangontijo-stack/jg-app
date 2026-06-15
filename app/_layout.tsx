import { useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { useAuthStore } from '../src/stores/authStore';
import { supabase } from '../src/lib/supabase';
import { registerForPushNotificationsAsync } from '../src/lib/notifications';

/** PWA web-only: injeta manifest/theme-color/ícone Apple + registra service worker. */
function setupPWA() {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  const head = document.head;
  const ensure = (sel: string, tag: string, attrs: Record<string, string>) => {
    if (document.querySelector(sel)) return;
    const el = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    head.appendChild(el);
  };
  ensure('link[rel="manifest"]', 'link', { rel: 'manifest', href: '/manifest.json' });
  ensure('meta[name="theme-color"]', 'meta', { name: 'theme-color', content: '#0f0f0f' });
  ensure('link[rel="apple-touch-icon"]', 'link', { rel: 'apple-touch-icon', href: '/icon-192.png' });
  ensure('meta[name="apple-mobile-web-app-capable"]', 'meta', { name: 'apple-mobile-web-app-capable', content: 'yes' });
  ensure('meta[name="apple-mobile-web-app-title"]', 'meta', { name: 'apple-mobile-web-app-title', content: 'JG App' });
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch((e) => console.warn('SW falhou:', e));
  }
}

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

  // PWA (web): manifest + service worker.
  useEffect(() => { setupPWA(); }, []);

  // Tap numa notificação push → abre a lista de notificações.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(() => {
      router.push('/notificacoes');
    });
    return () => sub.remove();
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
