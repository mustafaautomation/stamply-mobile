export type Role = 'owner' | 'admin' | 'staff' | 'customer';

export type Plan = 'trial' | 'counter' | 'house';

export type FraudCode =
  | 'NOT_STAFF'
  | 'INVALID_PIN'
  | 'INACTIVE_PROGRAM'
  | 'COOLDOWN'
  | 'DAILY_CAP'
  | 'NO_REWARD'
  | 'UNKNOWN_CARD'
  | 'UNKNOWN_CUSTOMER'
  | 'WRONG_ORG'
  | 'ALREADY_ENROLLED'
  | 'BAD_CODE'
  | 'NOT_SIGNED_IN'
  | 'UNAVAILABLE';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  city: string;
  brandColor: string;
  timezone: string;
  plan: Plan;
}

export interface Profile {
  id: string;
  email: string;
  fullName: string;
  userToken: string;
}

export interface MembershipView {
  id: string;
  organizationId: string;
  userId: string;
  role: Role;
  displayName: string;
  hasPin: boolean;
  organization: Organization;
}

export interface Program {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  stampsRequired: number;
  rewardName: string;
  rewardDescription: string;
  cooldownMinutes: number;
  maxStampsPerDay: number;
  active: boolean;
  accent: string;
}

export interface Location {
  id: string;
  organizationId: string;
  name: string;
}

export interface Card {
  id: string;
  organizationId: string;
  programId: string;
  customerId: string;
  stamps: number;
  lifetimeStamps: number;
  rewardsAvailable: number;
  rewardsRedeemed: number;
  qrToken: string;
}

export interface StampEvent {
  id: string;
  organizationId: string;
  cardId: string;
  programId: string;
  customerId: string;
  staffId: string;
  createdAt: string;
  unlockedReward: boolean;
}

export interface Redemption {
  id: string;
  organizationId: string;
  cardId: string;
  programId: string;
  customerId: string;
  staffId: string;
  rewardName: string;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  organizationId: string | null;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  href: string | null;
}

export interface WalletPass {
  id: string;
  cardId: string;
  userId: string;
  platform: 'apple' | 'google';
  status: 'mocked';
  serial: string;
  createdAt: string;
}

export interface Session {
  userId: string;
  email: string;
  fullName: string;
  mode: 'mock' | 'supabase';
}

export interface CardView {
  id: string;
  qrToken: string;
  qrUrl: string;
  stamps: number;
  stampsRequired: number;
  lifetimeStamps: number;
  rewardsAvailable: number;
  rewardsRedeemed: number;
  lastStampAt: string | null;
  stampsToday: number;
  program: Program;
  organization: Organization;
  customer: Pick<Profile, 'id' | 'fullName' | 'email'>;
  recentStamps: {
    id: string;
    at: string;
    staffName: string;
    unlockedReward: boolean;
  }[];
  locations: string[];
}

export interface ActivityItem {
  id: string;
  kind: 'stamp' | 'redemption';
  title: string;
  body: string;
  at: string;
  orgName: string;
}

export interface CounterSummary {
  stampsToday: number;
  redemptionsToday: number;
  rewardsWaiting: number;
  recent: ActivityItem[];
}

export type LookupResult =
  | { kind: 'card'; card: CardView }
  | { kind: 'customer'; profile: Profile; programs: Program[]; cards: CardView[] }
  | { kind: 'unknown'; message: string }
  | { kind: 'forbidden'; message: string };

export type ActionResult =
  | { ok: true; card: CardView; unlockedReward: boolean; message: string }
  | { ok: false; code: FraudCode; message: string; retryAt?: string };

export interface PushRegistration {
  token: string;
  platform: string;
  mocked: boolean;
}

export type DemoPersona = 'lina' | 'omar' | 'elena';

export interface DemoChip {
  id: string;
  label: string;
  token: string;
}

export class RepositoryError extends Error {
  readonly code: FraudCode | 'INVALID_EMAIL';

  constructor(code: RepositoryError['code'], message: string) {
    super(message);
    this.name = 'RepositoryError';
    this.code = code;
  }
}
