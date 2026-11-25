import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { HeaderBar } from '@/components/HeaderBar';
import { Button, ErrorState, LoadingState, Screen, T } from '@/components/ui';
import { progressLabel } from '@/domain/stampRules';
import type { WalletPass } from '@/domain/types';
import { useApp } from '@/state/AppProvider';
import { useCachedQuery } from '@/state/useCachedQuery';
import { useTheme } from '@/theme/theme';

export default function PassScreen() {
  const { id, platform } = useLocalSearchParams<{ id: string; platform?: string }>();
  const wallet = platform === 'google' ? 'google' : 'apple';
  const { repo } = useApp();
  const { colors } = useTheme();
  const [pass, setPass] = useState<WalletPass | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const cardQuery = useCachedQuery(`pass-card:${id}`, () => {
    if (!repo || !id) return Promise.reject(new Error('Missing card'));
    return repo.getCard(id);
  });
  const existing = useCachedQuery(`passes:${id}`, () => (repo && id ? repo.listWalletPasses(id) : Promise.resolve([])));
  const saved = pass ?? existing.data?.find((item) => item.platform === wallet) ?? null;
  const card = cardQuery.data;

  return (
    <Screen testID="pass-screen">
      <HeaderBar back title="Wallet pass" />
      {cardQuery.status === 'loading' ? <LoadingState label="Preparing the pass" /> : null}
      {cardQuery.status === 'error' ? <ErrorState message={cardQuery.error ?? 'Could not build the pass.'} onRetry={() => void cardQuery.reload()} /> : null}
      {card ? (
        <View style={{ gap: 16 }}>
          <View style={{ backgroundColor: card.program.accent, borderRadius: 24, padding: 20, gap: 8 }}>
            <T color="#FFF7F2" variant="kicker">
              {wallet === 'apple' ? 'Apple Wallet preview' : 'Google Wallet preview'}
            </T>
            <T color="#FFF7F2" variant="display">
              {card.organization.name}
            </T>
            <T color="#FFF7F2" variant="title">
              {card.program.name}
            </T>
            <T color="#FFF7F2">{progressLabel(card.stamps, card.stampsRequired)}</T>
            <T color="#FFF7F2">{card.rewardsAvailable > 0 ? card.program.rewardName : `${card.stampsRequired - card.stamps} to go`}</T>
          </View>
          <T variant="muted">
            Apple and Google pass signing needs the merchant’s certificates. This preview uses the same card, reward, and progress the live pass will carry. Nothing is sent to Apple or Google.
          </T>
          {saved ? (
            <View style={{ gap: 6 }} testID="pass-saved">
              <T variant="title">Saved in the demo wallet</T>
              <T variant="muted">Serial {saved.serial}</T>
            </View>
          ) : (
            <Button
              testID="save-pass"
              label={busy ? 'Saving…' : wallet === 'apple' ? 'Save Apple pass preview' : 'Save Google pass preview'}
              disabled={busy}
              onPress={() => {
                if (!repo || !id) return;
                setBusy(true);
                setError(null);
                void repo
                  .issueWalletPass(id, wallet)
                  .then((issued) => {
                    setPass(issued);
                    void existing.reload();
                  })
                  .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not save the pass.'))
                  .finally(() => setBusy(false));
              }}
            />
          )}
          {error ? <T color={colors.danger}>{error}</T> : null}
        </View>
      ) : null}
    </Screen>
  );
}
