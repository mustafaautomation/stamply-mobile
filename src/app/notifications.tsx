import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { HeaderBar } from '@/components/HeaderBar';
import { Button, EmptyState, Screen, T } from '@/components/ui';
import { formatWhen } from '@/domain/time';
import { useApp } from '@/state/AppProvider';
import { useCachedQuery } from '@/state/useCachedQuery';
import { useTheme } from '@/theme/theme';

export default function NotificationsScreen() {
  const { repo, session, refreshKey, bump } = useApp();
  const { colors } = useTheme();
  const router = useRouter();
  const query = useCachedQuery(`notes:${session?.userId}:${refreshKey}`, () => (repo && session ? repo.listNotifications() : Promise.resolve([])));

  return (
    <Screen testID="notifications-screen" onRefresh={() => void query.reload()} refreshing={query.refreshing}>
      <HeaderBar back title="Inbox" />
      <T variant="display">Inbox</T>
      <Button
        label="Mark all read"
        variant="secondary"
        onPress={() => {
          if (!repo) return;
          void repo.markAllNotificationsRead().then(() => {
            bump();
            void query.reload();
          });
        }}
      />
      {query.data?.length === 0 ? <EmptyState title="Inbox is clear" body="Stamps, rewards, and enrollments land here." /> : null}
      {query.data?.map((note) => (
        <Pressable
          key={note.id}
          accessibilityRole="button"
          accessibilityLabel={note.title}
          onPress={() => {
            if (!repo) return;
            void repo.markNotificationRead(note.id).then(() => bump());
            if (note.href) router.push(note.href as never);
          }}
          style={{ backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.line, padding: 14, gap: 4, opacity: note.read ? 0.7 : 1 }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <T variant="label">{note.title}</T>
            {!note.read ? <T color={colors.stamp}>New</T> : null}
          </View>
          <T variant="muted">{note.body}</T>
          <T variant="muted">{formatWhen(note.createdAt, new Date())}</T>
        </Pressable>
      ))}
    </Screen>
  );
}
