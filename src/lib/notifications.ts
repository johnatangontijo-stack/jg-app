import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/** Canal Android obrigatório p/ push aparecer (heads-up). Casa com channelId da Edge Function. */
async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('default', {
    name: 'Geral',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#C9A84C',
  });
}

export async function registerForPushNotificationsAsync(profileId: string) {
  // Web não gera Expo push token; push é mobile-only.
  if (Platform.OS === 'web') return;

  await ensureAndroidChannel();

  // Push real só em device físico (simulador não recebe).
  if (!Device.isDevice) return;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return;

  // projectId vem do EAS (app.json extra.eas.projectId) — necessário no SDK 56.
  const projectId =
    Constants?.expoConfig?.extra?.eas?.projectId ??
    (Constants as any)?.easConfig?.projectId;

  try {
    const token = (
      await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)
    ).data;

    await supabase.from('push_tokens').upsert(
      { profile_id: profileId, token, plataforma: Platform.OS as 'ios' | 'android' },
      { onConflict: 'token' }
    );
  } catch (e) {
    // Sem projectId (EAS não configurado) ou simulador: registra falha silenciosa.
    console.warn('[push] registro falhou:', e);
  }
}
