import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Modal, Pressable, View } from 'react-native';

import { Pill, T } from '@/components/ui';
import { roleLabel } from '@/domain/roles';
import { useApp } from '@/state/AppProvider';
import { useTheme } from '@/theme/theme';

export function HeaderBar({ title, back = false }: { title?: string; back?: boolean }) {
  const { colors } = useTheme();
  const router = useRouter();
  const { memberships, activeOrgId, setActiveOrgId, repo, refreshKey, session } = useApp();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!repo || !session) return;
    let cancelled = false;
    void repo.listNotifications().then((notes) => {
      if (!cancelled) setUnread(notes.filter((note) => !note.read).length);
    });
    return () => {
      cancelled = true;
    };
  }, [repo, session, refreshKey]);

  const label = activeOrgId === 'all' ? 'All merchants' : memberships.find((item) => item.organizationId === activeOrgId)?.organization.name ?? 'Merchants';

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      {back ? (
        <Pressable
          testID="back-button"
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        >
          <T variant="label">Back</T>
        </Pressable>
      ) : (
        <T variant="title" style={{ fontSize: 28 }}>
          Stamply
        </T>
      )}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {title ? <T variant="label">{title}</T> : null}
        <Pressable
          testID="open-notifications"
          accessibilityRole="button"
          accessibilityLabel="Notifications"
          onPress={() => router.push('/notifications')}
        >
          <Ionicons name="notifications-outline" size={22} color={colors.ink} />
          {unread > 0 ? (
            <View style={{ position: 'absolute', top: -4, right: -6, backgroundColor: colors.stamp, borderRadius: 8, minWidth: 16, alignItems: 'center' }}>
              <T variant="label" color={colors.stampInk} style={{ fontSize: 10 }}>
                {unread}
              </T>
            </View>
          ) : null}
        </Pressable>
        <Pressable testID="org-switcher" accessibilityRole="button" accessibilityLabel={`Merchant, ${label}`} onPress={() => setOpen(true)}>
          <T variant="label">{label}</T>
        </Pressable>
      </View>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable accessibilityLabel="Close merchant switcher" style={{ flex: 1, backgroundColor: 'rgba(18,17,14,0.45)', justifyContent: 'flex-end' }} onPress={() => setOpen(false)}>
          <Pressable onPress={() => undefined} style={{ backgroundColor: colors.card, padding: 20, borderTopLeftRadius: 24, borderTopRightRadius: 24, gap: 10 }}>
            <T variant="title">Merchants</T>
            <Pressable
              testID="org-all"
              accessibilityRole="button"
              accessibilityLabel="All merchants"
              onPress={() => {
                setActiveOrgId('all');
                setOpen(false);
              }}
              style={{ paddingVertical: 12 }}
            >
              <T>All merchants</T>
            </Pressable>
            {memberships.map((membership) => (
              <Pressable
                key={membership.id}
                testID={`org-${membership.organization.slug}`}
                accessibilityRole="button"
                accessibilityLabel={`${membership.organization.name}, ${roleLabel(membership.role)}`}
                onPress={() => {
                  setActiveOrgId(membership.organizationId);
                  setOpen(false);
                }}
                style={{ paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <View>
                  <T variant="label">{membership.organization.name}</T>
                  <T variant="muted">{membership.organization.city}</T>
                </View>
                <Pill label={roleLabel(membership.role)} tone="role" />
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
