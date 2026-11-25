import { Pressable, View } from 'react-native';

import { StampGrid } from '@/components/StampGrid';
import { Pill, T, useCardShadow } from '@/components/ui';
import { progressLabel } from '@/domain/stampRules';
import type { CardView } from '@/domain/types';
import { useTheme } from '@/theme/theme';

export function CardTicket({ card, onPress }: { card: CardView; onPress: () => void }) {
  const { colors } = useTheme();
  const shadow = useCardShadow();
  return (
    <Pressable
      testID={card.id}
      accessibilityRole="button"
      accessibilityLabel={`${card.organization.name}, ${card.program.name}, ${progressLabel(card.stamps, card.stampsRequired)}`}
      onPress={onPress}
      style={({ pressed }) => [
        shadow,
        {
          backgroundColor: colors.card,
          borderRadius: 22,
          borderWidth: 1,
          borderColor: colors.line,
          overflow: 'hidden',
          opacity: pressed ? 0.92 : 1,
          flexGrow: 1,
          flexBasis: 280,
        },
      ]}
    >
      <View style={{ flexDirection: 'row' }}>
        <View style={{ width: 8, backgroundColor: card.program.accent }} />
        <View style={{ flex: 1, padding: 16, gap: 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
            <T variant="kicker">{card.organization.name}</T>
            <T variant="label">{progressLabel(card.stamps, card.stampsRequired)}</T>
          </View>
          <T variant="title">{card.program.name}</T>
          <StampGrid filled={card.stamps} total={card.stampsRequired} accent={card.program.accent} />
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {card.rewardsAvailable > 0 ? <Pill label={`${card.program.rewardName} ready`} tone="reward" /> : null}
            {!card.program.active ? <Pill label="Paused" tone="paused" /> : null}
            {card.rewardsAvailable === 0 && card.program.active ? <Pill label={card.program.rewardName} /> : null}
          </View>
        </View>
      </View>
    </Pressable>
  );
}
