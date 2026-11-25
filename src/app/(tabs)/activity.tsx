import { HeaderBar } from '@/components/HeaderBar';
import { EmptyState, ErrorState, LoadingState, Screen, T } from '@/components/ui';
import { formatWhen } from '@/domain/time';
import { useApp } from '@/state/AppProvider';
import { useCachedQuery } from '@/state/useCachedQuery';
import { useTheme } from '@/theme/theme';
import { View } from 'react-native';

export default function ActivityScreen() {
  const { repo, session, refreshKey } = useApp();
  const { colors } = useTheme();
  const query = useCachedQuery(`activity:${session?.userId}:${refreshKey}`, () => (repo && session ? repo.listActivity() : Promise.resolve([])));
  const now = new Date();

  return (
    <Screen tabbed onRefresh={() => void query.reload()} refreshing={query.refreshing} testID="activity-screen">
      <HeaderBar />
      <T variant="display">Activity</T>
      <T variant="muted">Stamps and rewards on your own cards.</T>
      {query.status === 'loading' ? <LoadingState label="Loading activity" /> : null}
      {query.status === 'error' ? <ErrorState message={query.error ?? 'Could not load activity.'} onRetry={() => void query.reload()} /> : null}
      {query.status === 'ready' && query.data?.length === 0 ? (
        <EmptyState title="No visits yet" body="When a counter stamps your card, the visit shows up here." />
      ) : null}
      {query.data?.map((item) => (
        <View key={item.id} style={{ backgroundColor: colors.card, borderRadius: 18, borderWidth: 1, borderColor: colors.line, padding: 14, gap: 4 }}>
          <T variant="kicker">{item.orgName}</T>
          <T variant="label">{item.title}</T>
          <T variant="muted">{item.body}</T>
          <T variant="muted">{formatWhen(item.at, now)}</T>
        </View>
      ))}
    </Screen>
  );
}
