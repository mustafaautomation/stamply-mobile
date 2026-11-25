import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { HeaderBar } from '@/components/HeaderBar';
import { PinPad } from '@/components/PinPad';
import { StampGrid } from '@/components/StampGrid';
import { Banner, Button, ErrorState, LoadingState, Screen, T } from '@/components/ui';
import { evaluateStamp, nextPunch, progressLabel } from '@/domain/stampRules';
import { formatWait } from '@/domain/time';
import { isStaffRole } from '@/domain/roles';
import { presentLocal } from '@/notifications/push';
import { useApp } from '@/state/AppProvider';
import { useCachedQuery } from '@/state/useCachedQuery';
import { useTheme } from '@/theme/theme';

export default function StampScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const { repo, memberships, bump } = useApp();
  const { colors } = useTheme();
  const [pin, setPin] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const query = useCachedQuery(`lookup:${token}`, async () => {
    if (!repo || !token) return null;
    return repo.lookup(token);
  });
  const result = query.data;
  const card = result?.kind === 'card' ? result.card : null;
  const membership = card ? memberships.find((item) => item.organizationId === card.organization.id) : undefined;
  const decision = card
    ? evaluateStamp({
        now: new Date(),
        lastStampAt: card.lastStampAt,
        stampsToday: card.stampsToday,
        cooldownMinutes: card.program.cooldownMinutes,
        maxStampsPerDay: card.program.maxStampsPerDay,
        programActive: card.program.active,
        role: membership?.role ?? null,
        pinOk: true,
      })
    : null;
  const preview = card ? nextPunch(card.stamps, card.stampsRequired) : null;

  const run = (kind: 'stamp' | 'redeem') => {
    if (!repo || !card) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    const action = kind === 'stamp' ? repo.addStamp(card.qrToken, pin) : repo.redeem(card.qrToken, pin);
    void action
      .then(async (actionResult) => {
        if (!actionResult.ok) {
          setError(actionResult.retryAt ? `${actionResult.message} Try again in ${formatWait(actionResult.retryAt, new Date())}.` : actionResult.message);
          return;
        }
        setMessage(actionResult.message);
        bump();
        await query.reload();
        await presentLocal(actionResult.unlockedReward ? 'Reward unlocked' : kind === 'stamp' ? 'Stamp added' : 'Reward redeemed', actionResult.message, `/card/${actionResult.card.id}`);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'The counter could not finish.'))
      .finally(() => setBusy(false));
  };

  return (
    <Screen testID="stamp-screen">
      <HeaderBar back title="Counter" />
      {query.status === 'loading' ? <LoadingState label="Looking up the card" /> : null}
      {query.status === 'error' ? <ErrorState message={query.error ?? 'Lookup failed.'} onRetry={() => void query.reload()} /> : null}
      {result && result.kind !== 'card' ? <ErrorState message={result.kind === 'customer' ? 'That is a join code. Enroll them from the scan screen.' : result.message} onRetry={() => void query.reload()} /> : null}
      {card && decision && preview ? (
        <View style={{ gap: 14 }}>
          <T variant="kicker">{card.organization.name}</T>
          <T variant="display">{card.customer.fullName}</T>
          <T variant="title">{card.program.name}</T>
          <T testID="stamp-progress">{progressLabel(card.stamps, card.stampsRequired)}</T>
          <StampGrid filled={card.stamps} total={card.stampsRequired} accent={card.program.accent} />
          {card.rewardsAvailable > 0 ? <Banner tone="good">{card.rewardsAvailable} {card.program.rewardName} waiting.</Banner> : null}
          {!decision.ok ? (
            <Banner tone="warn">{decision.retryAt ? `${decision.message} Try again in ${formatWait(decision.retryAt, new Date())}.` : decision.message}</Banner>
          ) : (
            <T variant="muted">
              {preview.unlocked
                ? `The next stamp unlocks ${card.program.rewardName}.`
                : `The next stamp makes it ${preview.stamps} of ${card.stampsRequired}. Cooldown is ${card.program.cooldownMinutes} minutes, with ${card.program.maxStampsPerDay} stamps a day.`}
            </T>
          )}
          {!isStaffRole(membership?.role) ? <T color={colors.danger}>You need a staff seat at this merchant.</T> : <PinPad value={pin} onChange={setPin} />}
          {error ? <T color={colors.danger}>{error}</T> : null}
          {message ? (
            <T testID="stamp-result" variant="title">
              {message}
            </T>
          ) : null}
          {decision.ok ? (
            <Button testID="add-stamp" label={busy ? 'Saving…' : 'Add stamp'} disabled={busy || pin.length < 4} onPress={() => run('stamp')} />
          ) : null}
          {card.rewardsAvailable > 0 ? (
            <Button testID="redeem" label={busy ? 'Saving…' : `Redeem ${card.program.rewardName}`} variant="secondary" disabled={busy || pin.length < 4} onPress={() => run('redeem')} />
          ) : null}
        </View>
      ) : null}
    </Screen>
  );
}
