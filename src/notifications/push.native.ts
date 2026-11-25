import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { StamplyRepository } from '@/data/repository';
import type { PushSetup } from '@/notifications/types';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function enablePush(repo: StamplyRepository): Promise<PushSetup> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('stamps', {
      name: 'Stamps and rewards',
      // DEFAULT importance. The namespace enum is present at runtime; the lint resolver misses it.
      importance: 3,
    });
  }
  const existing = await Notifications.getPermissionsAsync();
  let granted = existing.granted;
  if (!granted) {
    const requested = await Notifications.requestPermissionsAsync();
    granted = requested.granted;
  }
  if (!granted) {
    const token = `mock-denied-${Platform.OS}`;
    await repo.registerPushToken({ token, platform: Platform.OS, mocked: true });
    return { status: 'denied', token, detail: 'Notifications are off. Stamply still keeps an inbox in the app.' };
  }
  try {
    const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
    if (!projectId) throw new Error('No Expo project id');
    const expoToken = await Notifications.getExpoPushTokenAsync({ projectId });
    await repo.registerPushToken({ token: expoToken.data, platform: Platform.OS, mocked: false });
    return { status: 'granted', token: expoToken.data, detail: 'This device can receive Expo push notifications.' };
  } catch {
    const token = `mock-${Platform.OS}-${Date.now().toString(36)}`;
    await repo.registerPushToken({ token, platform: Platform.OS, mocked: true });
    return {
      status: 'mocked',
      token,
      detail: 'Permission is on. A real Expo push token needs an EAS project id, so this device is using a local token.',
    };
  }
}

export function startNotificationRouting(navigate: (url: string) => void): () => void {
  const response = Notifications.getLastNotificationResponse();
  const initial = response?.notification.request.content.data?.url;
  if (typeof initial === 'string') navigate(initial);
  const subscription = Notifications.addNotificationResponseReceivedListener((event) => {
    const url = event.notification.request.content.data?.url;
    if (typeof url === 'string') navigate(url);
  });
  return () => subscription.remove();
}

export async function presentLocal(title: string, body: string, url: string): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: { title, body, data: { url } },
    trigger: null,
  });
}
