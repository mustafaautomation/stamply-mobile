import { Pressable, Text, TextInput, View } from 'react-native';

import { useTheme } from '@/theme/theme';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'] as const;

export function PinPad({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  const { colors } = useTheme();
  const push = (digit: string) => onChange(`${value}${digit}`.replace(/\D/g, '').slice(0, 4));
  return (
    <View style={{ gap: 12 }}>
      <TextInput
        testID="pin-input"
        accessibilityLabel="Staff PIN"
        value={value}
        onChangeText={(next) => onChange(next.replace(/\D/g, '').slice(0, 4))}
        keyboardType="number-pad"
        maxLength={4}
        secureTextEntry
        style={{
          minHeight: 52,
          borderWidth: 1,
          borderColor: colors.line,
          borderRadius: 16,
          textAlign: 'center',
          letterSpacing: 8,
          fontSize: 22,
          color: colors.ink,
          backgroundColor: colors.card,
        }}
      />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
        {KEYS.map((key) => {
          if (!key) return <View key="gap" style={{ width: 72, height: 52 }} />;
          const label = key === 'del' ? 'Delete digit' : `Digit ${key}`;
          return (
            <Pressable
              key={key}
              accessibilityRole="button"
              accessibilityLabel={label}
              onPress={() => (key === 'del' ? onChange(value.slice(0, -1)) : push(key))}
              style={{
                width: 72,
                height: 52,
                borderRadius: 14,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.card,
                borderWidth: 1,
                borderColor: colors.line,
              }}
            >
              <Text style={{ color: colors.ink, fontSize: 18, fontWeight: '600' }}>{key === 'del' ? '⌫' : key}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
