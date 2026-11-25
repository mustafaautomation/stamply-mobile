import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { HeaderBar } from '@/components/HeaderBar';
import { Button, Screen, T } from '@/components/ui';
import { planLabel, roleLabel } from '@/domain/roles';
import { enablePush } from '@/notifications/push';
import type { PushSetup } from '@/notifications/types';
import { useApp } from '@/state/AppProvider';
import { useTheme, type Preference } from '@/theme/theme';

const PREFERENCES: Preference[] = ['system', 'light', 'dark'];

export default function AccountScreen() {
  const { session, memberships, repo, signOut, resetDemo } = useApp();
  const { colors, preference, setPreference } = useTheme();
  const [push, setPush] = useState<PushSetup | null>(null);
  const [pushError, setPushError] = useState<string | null>(null);

  return (
    <Screen tabbed testID="account-screen">
      <HeaderBar />
      <T variant="display">{session?.fullName}</T>
      <T variant="muted">{session?.email}</T>
      <T variant="label">{repo?.mode === 'mock' ? 'Demo data on this device' : 'Connected to Supabase'}</T>

      <T variant="title">Appearance</T>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {PREFERENCES.map((item) => (
          <Pressable
            key={item}
            testID={`theme-${item}`}
            accessibilityRole="button"
            accessibilityLabel={`${item} appearance`}
            accessibilityState={{ selected: preference === item }}
            onPress={() => setPreference(item)}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: preference === item ? colors.stamp : colors.line,
              backgroundColor: preference === item ? colors.stamp : colors.card,
            }}
          >
            <T color={preference === item ? colors.stampInk : colors.ink}>{item}</T>
          </Pressable>
        ))}
      </View>

      <T variant="title">Notifications</T>
      <T variant="muted">Stamply asks for permission and stores a push token on your account. Without an Expo project id the token stays local.</T>
      <Button
        testID="enable-push"
        label="Enable notifications"
        variant="secondary"
        onPress={() => {
          if (!repo) return;
          setPushError(null);
          void enablePush(repo)
            .then(setPush)
            .catch((err: unknown) => setPushError(err instanceof Error ? err.message : 'Notifications could not be enabled.'));
        }}
      />
      {push ? (
        <T testID="push-status">
          {push.status === 'granted' ? 'Push is on.' : push.status === 'denied' ? 'Notifications are off.' : 'Using a local demo token.'} {push.detail}
        </T>
      ) : null}
      {pushError ? <T color={colors.danger}>{pushError}</T> : null}

      <T variant="title">Seats</T>
      {memberships.map((membership) => (
        <View key={membership.id} style={{ backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.line, padding: 14, gap: 4 }}>
          <T variant="label">{membership.organization.name}</T>
          <T variant="muted">
            {roleLabel(membership.role)} · {planLabel(membership.organization.plan)} plan · {membership.organization.city}
          </T>
        </View>
      ))}
      {memberships.length === 0 ? <T variant="muted">You are not on a merchant roster yet. A counter can enroll you from your join code.</T> : null}

      <T variant="muted">Billing is managed on the Stamply web app. This phone does not start a checkout.</T>
      {repo?.mode === 'mock' ? <Button label="Reset demo data" variant="secondary" onPress={() => void resetDemo()} /> : null}
      <Button testID="sign-out" label="Sign out" variant="danger" onPress={() => void signOut()} />
    </Screen>
  );
}
