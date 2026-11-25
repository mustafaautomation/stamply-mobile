export interface OrganizationRow {
  id: string;
  name: string;
  slug: string;
  city: string;
  brand_color: string;
  timezone: string;
  plan: 'trial' | 'counter' | 'house';
}

export interface ProfileRow {
  id: string;
  email: string;
  full_name: string;
  user_token: string;
}

export interface MemberRow {
  id: string;
  organization_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'staff' | 'customer';
  display_name: string;
  created_at: string;
}

export interface ProgramRow {
  id: string;
  organization_id: string;
  name: string;
  description: string;
  stamps_required: number;
  reward_name: string;
  reward_description: string;
  cooldown_minutes: number;
  max_stamps_per_day: number;
  active: boolean;
  accent: string;
}

export interface LocationRow {
  id: string;
  organization_id: string;
  name: string;
}

export interface CardRow {
  id: string;
  organization_id: string;
  program_id: string;
  customer_id: string;
  stamps: number;
  lifetime_stamps: number;
  rewards_available: number;
  rewards_redeemed: number;
  qr_token: string;
}

export interface StampRow {
  id: string;
  organization_id: string;
  card_id: string;
  program_id: string;
  customer_id: string;
  staff_id: string;
  created_at: string;
  unlocked_reward: boolean;
}

export interface RedemptionRow {
  id: string;
  organization_id: string;
  card_id: string;
  program_id: string;
  customer_id: string;
  staff_id: string;
  reward_name: string;
  created_at: string;
}

export interface NotificationRow {
  id: string;
  user_id: string;
  organization_id: string | null;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
  href: string | null;
}

export interface PassRow {
  id: string;
  card_id: string;
  user_id: string;
  platform: 'apple' | 'google';
  status: 'mocked';
  serial: string;
  created_at: string;
}

export interface RpcPayload {
  ok: boolean;
  code?: string;
  message: string;
  retry_at?: string;
  card_id?: string;
  unlocked_reward?: boolean;
}
