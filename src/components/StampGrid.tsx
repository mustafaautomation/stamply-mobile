import { View } from 'react-native';

import { progressLabel } from '@/domain/stampRules';
import { useTheme } from '@/theme/theme';

export function StampGrid({
  filled,
  total,
  accent,
  testID = 'stamp-grid',
}: {
  filled: number;
  total: number;
  accent?: string;
  testID?: string;
}) {
  const { colors } = useTheme();
  const ink = accent ?? colors.stamp;
  const marks = Array.from({ length: total }, (_, index) => index < filled);
  return (
    <View
      testID={testID}
      accessibilityLabel={`${progressLabel(filled, total)} stamps`}
      style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}
    >
      {marks.map((on, index) => (
        <View
          key={index}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            borderWidth: 1.5,
            borderColor: ink,
            backgroundColor: on ? ink : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {on ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.card }} /> : null}
        </View>
      ))}
    </View>
  );
}
