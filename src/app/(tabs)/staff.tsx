import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { HeaderBar } from '@/components/HeaderBar';
import { Banner, Button, EmptyState, Screen, T } from '@/components/ui';
import { staffMemberships } from '@/domain/roles';
import { formatWhen } from '@/domain/time';
import { useApp } from '@/state/AppProvider';
import { useCachedQuery } from '@/state/useCachedQuery';
import { useTheme } from '@/theme/theme';

export default function StaffScreen() {
  const { repo, memberships, activeOrgId, refreshKey, session } = useApp();
  const { colors } = useTheme();
  const router = useRouter();
  const staff = staffMemberships(memberships);
  const counterOrg =
    activeOrgId !== 'all' && staff.some((item) => item.organizationId === activeOrgId)
      ? activeOrgId
      : staff[0]?.organizationId;
  const org = staff.find((item) => item.organizationId === counterOrg)?.organization;
  const summary = useCachedQuery(`counter:${session?.userId}:${counterOrg}:${refreshKey}`, () =>
    repo && counterOrg ? repo.counterSummary(counterOrg) : Promise.resolve(null),
  );
  const pin = useCachedQuery(`pin:${counterOrg}:${refreshKey}`, () => (repo && counterOrg ? repo.staffDemoPin(counterOrg) : Promise.resolve(null)));

  if (!counterOrg || !org) {
    return (
      <Screen tabbed testID="staff-screen">
        <HeaderBar />
        <EmptyState title="Counter is for staff" body="This account does not have a staff, admin, or owner seat. Switch merchant if you work at one of them." />
      </Screen>
    );
  }

  return (
    <Screen tabbed testID="staff-screen" onRefresh={() => void summary.reload()} refreshing={summary.refreshing}>
      <HeaderBar />
      <T variant="kicker">{org.city}</T>
      <T variant="display">{org.name}</T>
      <T variant="muted">Scan a customer code, confirm the PIN, then stamp or redeem. Cooldown and the daily cap are enforced before the card changes.</T>
      {pin.data ? <Banner tone="warn">Demo PIN {pin.data}. It is shown only in the local demo.</Banner> : null}
      <Button testID="open-scanner" label="Scan a customer" onPress={() => router.push('/scan')} />
      {summary.data ? (
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Stat label="Stamps today" value={String(summary.data.stampsToday)} />
          <Stat label="Redeemed" value={String(summary.data.redemptionsToday)} />
          <Stat label="Rewards waiting" value={String(summary.data.rewardsWaiting)} />
        </View>
      ) : null}
      <T variant="title">Latest at the counter</T>
      {summary.data?.recent.length === 0 ? <T variant="muted">No stamps yet today.</T> : null}
      {summary.data?.recent.map((item) => (
        <View key={item.id} style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.line }}>
          <T variant="label">{item.title}</T>
          <T variant="muted">
            {item.body} · {formatWhen(item.at, new Date())}
          </T>
        </View>
      ))}
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.line, padding: 12, gap: 4 }}>
      <T variant="display" style={{ fontSize: 28 }}>
        {value}
      </T>
      <T variant="muted">{label}</T>
    </View>
  );
}
