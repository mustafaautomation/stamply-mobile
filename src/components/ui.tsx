import { useMemo, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/theme';

export function T({
  children,
  variant = 'body',
  color,
  style,
  testID,
}: {
  children: ReactNode;
  variant?: 'display' | 'title' | 'body' | 'label' | 'muted' | 'kicker';
  color?: string;
  style?: StyleProp<TextStyle>;
  testID?: string;
}) {
  const { colors } = useTheme();
  const variantStyle = {
    display: { fontFamily: colors.display, fontSize: 34, lineHeight: 38, color: colors.ink },
    title: { fontFamily: colors.display, fontSize: 24, lineHeight: 28, color: colors.ink },
    body: { fontFamily: colors.body, fontSize: 16, lineHeight: 22, color: colors.ink },
    label: { fontFamily: colors.body, fontSize: 14, lineHeight: 18, fontWeight: '600' as const, color: colors.ink },
    muted: { fontFamily: colors.body, fontSize: 14, lineHeight: 20, color: colors.muted },
    kicker: {
      fontFamily: colors.body,
      fontSize: 12,
      lineHeight: 16,
      letterSpacing: 1.2,
      textTransform: 'uppercase' as const,
      color: colors.muted,
      fontWeight: '600' as const,
    },
  }[variant];
  return (
    <Text testID={testID} style={[variantStyle, color ? { color } : null, style]}>
      {children}
    </Text>
  );
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  testID,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  disabled?: boolean;
  testID?: string;
  accessibilityLabel?: string;
}) {
  const { colors } = useTheme();
  const palette = {
    primary: { backgroundColor: colors.stamp, color: colors.stampInk, borderColor: colors.stamp },
    secondary: { backgroundColor: 'transparent', color: colors.ink, borderColor: colors.line },
    ghost: { backgroundColor: 'transparent', color: colors.ink, borderColor: 'transparent' },
    danger: { backgroundColor: 'transparent', color: colors.danger, borderColor: colors.danger },
  }[variant];
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: palette.backgroundColor, borderColor: palette.borderColor, opacity: disabled ? 0.45 : pressed ? 0.82 : 1 },
      ]}
    >
      <Text style={{ color: palette.color, fontFamily: colors.body, fontSize: 16, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  testID,
  keyboardType = 'default',
  autoCapitalize = 'none',
  secure = false,
  maxLength,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  testID?: string;
  keyboardType?: 'default' | 'email-address' | 'number-pad';
  autoCapitalize?: 'none' | 'words';
  secure?: boolean;
  maxLength?: number;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <T variant="label">{label}</T>
      <TextInput
        testID={testID}
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        secureTextEntry={secure}
        maxLength={maxLength}
        style={[styles.input, { color: colors.ink, borderColor: colors.line, backgroundColor: colors.card, fontFamily: colors.body }]}
      />
    </View>
  );
}

export function Screen({
  children,
  testID,
  onRefresh,
  refreshing = false,
  tabbed = false,
  scroll = true,
}: {
  children: ReactNode;
  testID?: string;
  onRefresh?: () => void;
  refreshing?: boolean;
  tabbed?: boolean;
  scroll?: boolean;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const top = Platform.OS === 'web' ? 18 : insets.top + 8;
  const bottom = (tabbed ? 108 : 28) + (Platform.OS === 'web' ? 12 : insets.bottom);
  const content = (
    <View style={[styles.column, { paddingTop: top, paddingBottom: bottom }]} testID={testID}>
      {children}
    </View>
  );
  if (!scroll) {
    return <View style={{ flex: 1, backgroundColor: colors.bg }}>{content}</View>;
  }
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ flexGrow: 1 }}
      refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.stamp} /> : undefined}
    >
      {content}
    </ScrollView>
  );
}

export function Banner({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'good' | 'warn' }) {
  const { colors } = useTheme();
  const background = tone === 'good' ? colors.pine : tone === 'warn' ? colors.gold : colors.ink;
  return (
    <View style={[styles.banner, { backgroundColor: background }]}>
      <Text style={{ color: tone === 'warn' ? '#1C1915' : '#F4EFE6', fontFamily: colors.body, lineHeight: 20 }}>{children}</Text>
    </View>
  );
}

export function Pill({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'reward' | 'paused' | 'role' }) {
  const { colors } = useTheme();
  const map = {
    neutral: { bg: colors.bg, fg: colors.ink },
    reward: { bg: '#F3E2B3', fg: '#5C4312' },
    paused: { bg: colors.line, fg: colors.muted },
    role: { bg: colors.stamp, fg: colors.stampInk },
  }[tone];
  return (
    <View style={[styles.pill, { backgroundColor: map.bg }]}>
      <Text style={{ color: map.fg, fontSize: 12, fontWeight: '700', fontFamily: colors.body }}>{label}</Text>
    </View>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <View style={styles.state} accessibilityRole="text">
      <T variant="title">{title}</T>
      <T variant="muted" style={{ textAlign: 'center' }}>
        {body}
      </T>
      {action}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={styles.state}>
      <T variant="title">Something stalled</T>
      <T variant="muted" style={{ textAlign: 'center' }}>
        {message}
      </T>
      <Button label="Try again" onPress={onRetry} />
    </View>
  );
}

export function LoadingState({ label = 'Loading your cards' }: { label?: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.state} accessibilityRole="progressbar" accessibilityLabel={label}>
      <ActivityIndicator color={colors.stamp} />
      <T variant="muted">{label}</T>
    </View>
  );
}

export function useCardShadow(): ViewStyle {
  const { scheme } = useTheme();
  return useMemo(
    () =>
      ({
        shadowColor: '#1C1915',
        shadowOpacity: scheme === 'dark' ? 0.35 : 0.08,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
        elevation: 2,
      }) as ViewStyle,
    [scheme],
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  column: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    paddingHorizontal: 20,
    gap: 16,
  },
  banner: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  pill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  state: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 28,
  },
});
