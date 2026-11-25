import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect, Tabs } from 'expo-router';

import { showStaffTab } from '@/domain/roles';
import { useApp } from '@/state/AppProvider';
import { useTheme } from '@/theme/theme';

function iconColor(color: unknown): string {
  return typeof color === 'string' ? color : '#1C1915';
}

export default function TabLayout() {
  const { session, memberships } = useApp();
  const { colors } = useTheme();
  if (!session) return <Redirect href="/sign-in" />;
  const staff = showStaffTab(memberships);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.stamp,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.tab, borderTopColor: colors.line },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Wallet',
          tabBarAccessibilityLabel: 'Wallet',
          tabBarIcon: ({ color, size }) => <Ionicons name="wallet-outline" color={iconColor(color)} size={size} />,
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: 'Activity',
          tabBarAccessibilityLabel: 'Activity',
          tabBarIcon: ({ color, size }) => <Ionicons name="time-outline" color={iconColor(color)} size={size} />,
        }}
      />
      <Tabs.Screen
        name="staff"
        options={{
          title: 'Counter',
          href: staff ? '/staff' : null,
          tabBarAccessibilityLabel: 'Counter',
          tabBarIcon: ({ color, size }) => <Ionicons name="qr-code-outline" color={iconColor(color)} size={size} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Account',
          tabBarAccessibilityLabel: 'Account',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" color={iconColor(color)} size={size} />,
        }}
      />
    </Tabs>
  );
}
