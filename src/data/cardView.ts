import { customerQrUrl } from '@/domain/tokens';
import { countStampsOnLocalDay } from '@/domain/time';
import type { Card, CardView, Location, Organization, Profile, Program, StampEvent } from '@/domain/types';

export function compareCards(a: CardView, b: CardView): number {
  if (a.program.active !== b.program.active) return a.program.active ? -1 : 1;
  if (a.rewardsAvailable !== b.rewardsAvailable) return b.rewardsAvailable - a.rewardsAvailable;
  const org = a.organization.name.localeCompare(b.organization.name);
  return org || a.program.name.localeCompare(b.program.name);
}

export function buildCardView(input: {
  card: Card;
  program: Program;
  organization: Organization;
  customer: Profile;
  events: StampEvent[];
  staffNames: Record<string, string>;
  locations: Location[];
  now: Date;
}): CardView {
  const events = input.events
    .filter((event) => event.cardId === input.card.id)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const times = events.map((event) => event.createdAt);
  return {
    id: input.card.id,
    qrToken: input.card.qrToken,
    qrUrl: customerQrUrl(input.card.qrToken),
    stamps: input.card.stamps,
    stampsRequired: input.program.stampsRequired,
    lifetimeStamps: input.card.lifetimeStamps,
    rewardsAvailable: input.card.rewardsAvailable,
    rewardsRedeemed: input.card.rewardsRedeemed,
    lastStampAt: events[0]?.createdAt ?? null,
    stampsToday: countStampsOnLocalDay(times, input.now, input.organization.timezone),
    program: input.program,
    organization: input.organization,
    customer: {
      id: input.customer.id,
      fullName: input.customer.fullName,
      email: input.customer.email,
    },
    recentStamps: events.slice(0, 5).map((event) => ({
      id: event.id,
      at: event.createdAt,
      staffName: input.staffNames[event.staffId] ?? 'Staff',
      unlockedReward: event.unlockedReward,
    })),
    locations: input.locations
      .filter((location) => location.organizationId === input.organization.id)
      .map((location) => location.name),
  };
}
