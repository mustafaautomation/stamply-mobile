import { useRouter } from 'expo-router';
import { useWindowDimensions, View } from 'react-native';

import { CardTicket } from '@/components/CardTicket';
import { QrMark } from '@/components/QrMark';
import { HeaderBar } from '@/components/HeaderBar';
import { Banner, EmptyState, ErrorState, LoadingState, Screen, T } from '@/components/ui';
import { customerQrUrl } from '@/domain/tokens';
import { useApp } from '@/state/AppProvider';
import { useCachedQuery } from '@/state/useCachedQuery';

export default function WalletScreen() {
  const { repo, session, activeOrgId, offline, refreshKey } = useApp();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const orgFilter = activeOrgId === 'all' ? undefined : activeOrgId;
  const query = useCachedQuery(`cards:${session?.userId}:${orgFilter ?? 'all'}:${refreshKey}`, () => {
    if (!repo || !session) return Promise.resolve([]);
    return repo.listCards(orgFilter);
  });
  const identity = useCachedQuery(`identity:${session?.userId}`, async () => (repo ? repo.identityToken() : null));

  return (
    <Screen testID="wallet-screen" tabbed onRefresh={() => void query.reload()} refreshing={query.refreshing}>
      <HeaderBar />
      <View>
        <T testID="wallet-title" variant="display">
          Your cards
        </T>
        <T variant="muted">{activeOrgId === 'all' ? 'Every merchant you visit.' : 'Filtered to one counter.'}</T>
      </View>
      {offline || query.fromCache ? (
        <Banner>{repo?.mode === 'mock' ? 'You are offline. Demo cards stay on this device.' : 'You are offline. Showing the last cards saved on this device.'}</Banner>
      ) : null}
      {query.status === 'loading' ? <LoadingState /> : null}
      {query.status === 'error' ? <ErrorState message={query.error ?? 'Could not load cards.'} onRetry={() => void query.reload()} /> : null}
      {query.status === 'ready' && query.data && query.data.length === 0 ? (
        <View style={{ gap: 16 }} testID="empty-wallet">
          <EmptyState
            title="No stamp cards yet"
            body="Show your join code at a Stamply counter. Staff can start a card without taking your phone."
          />
          {identity.data ? <QrMark value={customerQrUrl(identity.data)} testID="join-qr" /> : null}
        </View>
      ) : null}
      {query.status === 'ready' && query.data && query.data.length > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {query.data.map((card) => (
            <View key={card.id} style={{ width: width >= 860 ? '48%' : '100%' }}>
              <CardTicket card={card} onPress={() => router.push(`/card/${card.id}` as never)} />
            </View>
          ))}
        </View>
      ) : null}
    </Screen>
  );
}
