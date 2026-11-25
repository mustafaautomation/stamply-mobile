import { Redirect } from 'expo-router';

import { useApp } from '@/state/AppProvider';

export default function Index() {
  const { session } = useApp();
  if (!session) return <Redirect href="/sign-in" />;
  return <Redirect href="/(tabs)" />;
}
