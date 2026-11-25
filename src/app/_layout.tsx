import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { startNotificationRouting } from '@/notifications/push';
import { AppProvider, useApp } from '@/state/AppProvider';
import { ThemeProvider, useTheme } from '@/theme/theme';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

function RootNavigator() {
  const { ready } = useApp();
  const { scheme, colors } = useTheme();
  const router = useRouter();

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);

  useEffect(() => startNotificationRouting((url) => router.push(url as never)), [router]);

  if (!ready) return null;

  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="sign-in" />
        <Stack.Screen name="c/[token]" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="card/[id]" />
        <Stack.Screen name="scan" />
        <Stack.Screen name="stamp/[token]" />
        <Stack.Screen name="enroll/[token]" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="pass/[id]" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <AppProvider>
          <RootNavigator />
        </AppProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
