import type { StamplyRepository } from '@/data/repository';
import type { PushSetup } from '@/notifications/types';

export type { PushSetup };

export async function enablePush(repo: StamplyRepository): Promise<PushSetup> {
  const token = `mock-web-${repo.mode}`;
  await repo.registerPushToken({ token, platform: 'web', mocked: true });
  return {
    status: 'mocked',
    token,
    detail: 'This browser preview stores a local token. A development build registers with Expo push.',
  };
}

export function startNotificationRouting(_navigate: (url: string) => void): () => void {
  return () => undefined;
}

export async function presentLocal(_title: string, _body: string, _url: string): Promise<void> {
  // The in-app inbox is updated by the repository. Web has no notification tray.
}
