import type {
  CardRow,
  LocationRow,
  MemberRow,
  NotificationRow,
  OrganizationRow,
  PassRow,
  ProfileRow,
  ProgramRow,
  RedemptionRow,
  StampRow,
} from '@/data/database';
import type {
  AppNotification,
  Card,
  Location,
  Organization,
  Profile,
  Program,
  Redemption,
  StampEvent,
  WalletPass,
} from '@/domain/types';

export function mapOrganization(row: OrganizationRow): Organization {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    city: row.city,
    brandColor: row.brand_color,
    timezone: row.timezone,
    plan: row.plan,
  };
}

export function mapProfile(row: ProfileRow): Profile {
  return { id: row.id, email: row.email, fullName: row.full_name, userToken: row.user_token };
}

export function mapProgram(row: ProgramRow): Program {
  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    description: row.description,
    stampsRequired: row.stamps_required,
    rewardName: row.reward_name,
    rewardDescription: row.reward_description,
    cooldownMinutes: row.cooldown_minutes,
    maxStampsPerDay: row.max_stamps_per_day,
    active: row.active,
    accent: row.accent,
  };
}

export function mapLocation(row: LocationRow): Location {
  return { id: row.id, organizationId: row.organization_id, name: row.name };
}

export function mapCard(row: CardRow): Card {
  return {
    id: row.id,
    organizationId: row.organization_id,
    programId: row.program_id,
    customerId: row.customer_id,
    stamps: row.stamps,
    lifetimeStamps: row.lifetime_stamps,
    rewardsAvailable: row.rewards_available,
    rewardsRedeemed: row.rewards_redeemed,
    qrToken: row.qr_token,
  };
}

export function mapStamp(row: StampRow): StampEvent {
  return {
    id: row.id,
    organizationId: row.organization_id,
    cardId: row.card_id,
    programId: row.program_id,
    customerId: row.customer_id,
    staffId: row.staff_id,
    createdAt: row.created_at,
    unlockedReward: row.unlocked_reward,
  };
}

export function mapRedemption(row: RedemptionRow): Redemption {
  return {
    id: row.id,
    organizationId: row.organization_id,
    cardId: row.card_id,
    programId: row.program_id,
    customerId: row.customer_id,
    staffId: row.staff_id,
    rewardName: row.reward_name,
    createdAt: row.created_at,
  };
}

export function mapNotification(row: NotificationRow): AppNotification {
  return {
    id: row.id,
    userId: row.user_id,
    organizationId: row.organization_id,
    title: row.title,
    body: row.body,
    read: row.read,
    createdAt: row.created_at,
    href: row.href,
  };
}

export function mapPass(row: PassRow): WalletPass {
  return {
    id: row.id,
    cardId: row.card_id,
    userId: row.user_id,
    platform: row.platform,
    status: 'mocked',
    serial: row.serial,
    createdAt: row.created_at,
  };
}

export function mapMemberOrg(row: MemberRow, organization: OrganizationRow) {
  return {
    id: row.id,
    organizationId: row.organization_id,
    userId: row.user_id,
    role: row.role,
    displayName: row.display_name,
    hasPin: row.role === 'owner' || row.role === 'admin' || row.role === 'staff',
    organization: mapOrganization(organization),
  };
}
