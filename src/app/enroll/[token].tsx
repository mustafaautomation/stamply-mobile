import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { HeaderBar } from '@/components/HeaderBar';
import { PinPad } from '@/components/PinPad';
import { Button, ErrorState, LoadingState, Screen, T } from '@/components/ui';
import type { LookupResult } from '@/domain/types';
import { useApp } from '@/state/AppProvider';
import { useCachedQuery } from '@/state/useCachedQuery';
import { useTheme } from '@/theme/theme';

function lookupFailure(result: LookupResult | null | undefined): string {
  if (result && result.kind !== 'card' && result.kind !== 'customer') return result.message;
  return 'Could not enroll.';
}

export default function EnrollScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const { repo, bump } = useApp();
  const { colors } = useTheme();
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [programId, setProgramId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const query = useCachedQuery(`enroll:${token}`, async () => (repo && token ? repo.lookup(token) : null));
  const result = query.data?.kind === 'customer' ? query.data : null;

  return (
    <Screen testID="enroll-screen">
      <HeaderBar back title="Enroll" />
      {query.status === 'loading' ? <LoadingState label="Finding the customer" /> : null}
      {query.status === 'error' || (query.data && query.data.kind !== 'customer') ? (
        <ErrorState message={query.error ?? lookupFailure(query.data)} onRetry={() => void query.reload()} />
      ) : null}
      {result ? (
        <View style={{ gap: 12 }}>
          <T variant="display">{result.profile.fullName}</T>
          <T variant="muted">Choose a live program. The PIN confirms you work this counter.</T>
          {result.cards.map((card) => (
            <Pressable key={card.id} accessibilityRole="button" accessibilityLabel={`Open ${card.program.name}`} onPress={() => router.push(`/stamp/${card.qrToken}` as never)}>
              <T variant="label">{card.program.name} is already open</T>
              <T variant="muted">Tap to stamp it.</T>
            </Pressable>
          ))}
          {result.programs.map((program) => (
            <Pressable
              key={program.id}
              accessibilityRole="button"
              accessibilityState={{ selected: programId === program.id }}
              accessibilityLabel={program.name}
              onPress={() => setProgramId(program.id)}
              style={{ padding: 12, borderRadius: 16, borderWidth: 1, borderColor: programId === program.id ? colors.stamp : colors.line, backgroundColor: colors.card }}
            >
              <T variant="label">{program.name}</T>
              <T variant="muted">{program.stampsRequired} stamps · {program.rewardName}</T>
            </Pressable>
          ))}
          <PinPad value={pin} onChange={setPin} />
          {error ? <T color={colors.danger}>{error}</T> : null}
          <Button
            testID="enroll-submit"
            label={busy ? 'Starting…' : 'Start card'}
            disabled={busy || !programId || pin.length < 4}
            onPress={() => {
              if (!repo || !programId || !token) return;
              setBusy(true);
              setError(null);
              void repo
                .enroll(token, programId, pin)
                .then((action) => {
                  if (!action.ok) {
                    setError(action.message);
                    return;
                  }
                  bump();
                  router.replace(`/stamp/${action.card.qrToken}` as never);
                })
                .finally(() => setBusy(false));
            }}
          />
        </View>
      ) : null}
    </Screen>
  );
}
