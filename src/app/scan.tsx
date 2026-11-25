import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { HeaderBar } from '@/components/HeaderBar';
import { ScanCamera } from '@/components/ScanCamera';
import { Button, Field, Screen, T } from '@/components/ui';
import { isUserToken, parseCustomerCode } from '@/domain/tokens';
import { useApp } from '@/state/AppProvider';
import { useCachedQuery } from '@/state/useCachedQuery';
import { useTheme } from '@/theme/theme';

export default function ScanScreen() {
  const router = useRouter();
  const { repo, session } = useApp();
  const { colors } = useTheme();
  const [raw, setRaw] = useState('');
  const [error, setError] = useState<string | null>(null);
  const chips = useCachedQuery(`chips:${session?.userId}`, () => (repo ? repo.demoScanChips() : Promise.resolve([])));

  const go = async (value: string) => {
    if (!repo) return;
    setError(null);
    const token = parseCustomerCode(value);
    if (!token) {
      setError('That is not a Stamply code.');
      return;
    }
    const result = await repo.lookup(value);
    if (result.kind === 'card') {
      router.push(`/stamp/${result.card.qrToken}` as never);
      return;
    }
    if (result.kind === 'customer') {
      router.push(`/enroll/${result.profile.userToken}` as never);
      return;
    }
    setError(result.message);
  };

  return (
    <Screen testID="scan-screen">
      <HeaderBar back title="Scan" />
      <T variant="display">Find the card</T>
      <ScanCamera onScan={(data) => void go(data)} />
      <Field label="Customer code" value={raw} onChangeText={setRaw} placeholder="stmp_… or a Stamply link" testID="token-input" />
      {error ? <T color={colors.danger}>{error}</T> : null}
      <Button testID="lookup-token" label="Look up" onPress={() => void go(raw)} />
      {chips.data && chips.data.length > 0 ? (
        <View style={{ gap: 8 }}>
          <T variant="kicker">Demo cards</T>
          {chips.data.map((chip) => (
            <Pressable
              key={chip.id}
              testID={`chip-${chip.id}`}
              accessibilityRole="button"
              accessibilityLabel={chip.label}
              onPress={() => {
                setRaw(chip.token);
                void go(chip.token);
              }}
              style={{ paddingVertical: 10 }}
            >
              <T variant="label">{chip.label}</T>
              <T variant="muted">{isUserToken(chip.token) ? 'Join code' : chip.token}</T>
            </Pressable>
          ))}
        </View>
      ) : null}
    </Screen>
  );
}
