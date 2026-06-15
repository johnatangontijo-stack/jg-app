// Web Push (PWA) — funciona no iOS 16.4+ (PWA instalado na tela de início),
// Android e desktop. Independente do push nativo (Expo/APNs/FCM).
// A chave VAPID pública é segura no cliente.
import { Platform } from 'react-native';
import { supabase } from './supabase';

export const VAPID_PUBLIC =
  'BOhwV5HamISl9cViGMZc2vDOXCoSCyl2_7_tic2G9ST2gLZYQ22eEuF2Arbh7kj1a184NNUpkBYl3q-rnYhHLWw';

function urlB64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

/** Push web disponível neste ambiente? */
export function webPushSupported(): boolean {
  return (
    Platform.OS === 'web' &&
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/** PWA está instalado (tela de início)? No iOS, push só funciona instalado. */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const mm = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
  const iosStandalone = (window.navigator as any).standalone === true;
  return Boolean(mm || iosStandalone);
}

/** iOS (Safari/PWA)? */
export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

/** Já existe inscrição ativa? */
export async function isSubscribed(): Promise<boolean> {
  if (!webPushSupported()) return false;
  const reg = await navigator.serviceWorker.ready;
  return Boolean(await reg.pushManager.getSubscription());
}

/** Salva/atualiza a inscrição no Supabase (lança em erro). */
async function saveSub(json: PushSubscriptionJSON, profileId?: string | null) {
  const { error } = await (supabase as any).from('web_push_subscriptions').upsert(
    {
      profile_id: profileId ?? null,
      endpoint: json.endpoint,
      p256dh: json.keys?.p256dh,
      auth: json.keys?.auth,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 200) : null,
    },
    { onConflict: 'endpoint' }
  );
  if (error) throw new Error(error.message ?? 'Falha ao salvar inscrição.');
}

/** Re-salva a inscrição já existente (idempotente, sem pedir permissão). */
export async function syncWebPush(profileId?: string | null): Promise<boolean> {
  if (!webPushSupported()) return false;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return false;
  try { await saveSub(sub.toJSON(), profileId); return true; } catch { return false; }
}

/**
 * Pede permissão + assina + salva a inscrição no Supabase.
 * Deve ser chamado a partir de um toque do usuário (gesto).
 */
export async function subscribeWebPush(profileId?: string | null): Promise<PushSubscriptionJSON> {
  if (!webPushSupported()) throw new Error('Notificações não suportadas neste navegador.');

  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error('Permissão de notificação negada.');

  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlB64ToUint8Array(VAPID_PUBLIC) as unknown as BufferSource,
    });
  }

  const json = sub.toJSON();
  await saveSub(json, profileId);
  return json;
}
