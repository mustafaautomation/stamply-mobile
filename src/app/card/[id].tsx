import { useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';

import { QrMark } from '@/components/QrMark';
import { StampGrid } from '@/components/StampGrid';
import { Banner, Button, ErrorState, LoadingState, Screen, T } from '@/components/ui';
import { HeaderBar } from '@/components/HeaderBar';
import { progressLabel } from '@/domain/stampRules';
import { formatWhen } from '@/domain/time';
import { useApp } from '@/state/AppProvider';
import { useCachedQuery } from '@/state/useCachedQuery';
import { useTheme } from '@/theme/theme';

export default function CardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { repo, refreshKey, session } = useApp();
  const { colors } = useTheme();
  const router = useRouter();
  const query = useCachedQuery(`card:${id}:${refreshKey}`, () => {
    if (!repo || !id) return Promise.reject(new Error('Missing card'));
    return repo.getCard(id);
  });
  const card = query.data;

  return (
    <Screen testID="card-screen" onRefresh={() => void query.reload()} refreshing={query.refreshing}>
      <HeaderBar back />
      {query.status === 'loading' ? <LoadingState label="Opening the card" /> : null}
      {query.status === 'error' ? <ErrorState message={query.error ?? 'Could not open the card.'} onRetry={() => void query.reload()} /> : null}
      {card ? (
        <View style={{ gap: 16 }}>
          <T variant="kicker">{card.organization.name}</T>
          <T variant="display">{card.program.name}</T>
          <T variant="muted">{card.program.description}</T>
          <T testID="stamp-progress" variant="title">
            {progressLabel(card.stamps, card.stampsRequired)}
          </T>
          <StampGrid filled={card.stamps} total={card.stampsRequired} accent={card.program.accent} />
          {!card.program.active ? <Banner>This card is paused by the merchant. Stamps wait until it opens again.</Banner> : null}
          {card.rewardsAvailable > 0 ? (
            <Banner tone="good">
              {card.program.rewardName} is ready. Show this card at {card.organization.name} and ask them to redeem it.
            </Banner>
          ) : (
            <T variant="muted">
              Reward: {card.program.rewardName}. {card.program.rewardDescription}
            </T>
          )}
          <QrMark value={card.qrUrl} />
          <T variant="muted" style={{ textAlign: 'center' }}>
            Show this code at the counter. Staff scan it to add a stamp.
          </T>
          {session?.userId === card.customer.id ? (
            <View style={{ gap: 10 }}>
              <Button testID="apple-wallet" label="Add to Apple Wallet" onPress={() => router.push(`/pass/${card.id}?platform=apple` as never)} />
              <Button testID="google-wallet" label="Add to Google Wallet" variant="secondary" onPress={() => router.push(`/pass/${card.id}?platform=google` as never)} />
            </View>
          ) : null}
          <T variant="label">Accepted at</T>
          <T variant="muted">{card.locations.join(' · ') || card.organization.city}</T>
          <T variant="label">{card.lifetimeStamps} lifetime stamps · {card.rewardsRedeemed} redeemed</T>
          <T variant="title">Recent stamps</T>
          {card.recentStamps.length === 0 ? <T variant="muted">No stamps yet.</T> : null}
          {card.recentStamps.map((stamp) => (
            <View key={stamp.id} style={{ paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.line }}>
              <T variant="label">{stamp.unlockedReward ? 'Completed the card' : 'Stamp'}</T>
              <T variant="muted">
                {stamp.staffName} · {formatWhen(stamp.at, new Date())}
              </T>
            </View>
          ))}
        </View>
      ) : null}
    </Screen>
  );
}
