import { Redirect, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';

import { LoadingState, Screen } from '@/components/ui';
import { isUserToken } from '@/domain/tokens';
import { useApp } from '@/state/AppProvider';

export default function DeepLinkScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const { session, setPendingPath } = useApp();
  const path = token ? (isUserToken(token) ? `/enroll/${token}` : `/stamp/${token}`) : '/';

  useEffect(() => {
    if (!session && token) setPendingPath(`/c/${token}`);
  }, [session, token, setPendingPath]);

  if (!session) return <Redirect href="/sign-in" />;
  if (!token) return <Redirect href="/(tabs)" />;
  return (
    <Screen>
      <LoadingState label="Opening the code" />
      <Redirect href={path as never} />
    </Screen>
  );
}
