import type {
  ActionResult,
  ActivityItem,
  AppNotification,
  CardView,
  CounterSummary,
  DemoChip,
  DemoPersona,
  LookupResult,
  MembershipView,
  Program,
  PushRegistration,
  Session,
  WalletPass,
} from '@/domain/types';

/**
 * Tenant-scoped data access shared by mock mode and Supabase.
 * Callers never send a service-role key. Postgres RLS is the real boundary.
 */
export interface StamplyRepository {
  readonly mode: 'mock' | 'supabase';
  getSession(): Promise<Session | null>;
  enterDemo(persona: DemoPersona): Promise<Session>;
  requestMagicLink(email: string): Promise<{ devCode: string | null }>;
  verifyMagicLink(email: string, code: string): Promise<Session>;
  signOut(): Promise<void>;
  listMemberships(): Promise<MembershipView[]>;
  listCards(orgId?: string): Promise<CardView[]>;
  getCard(cardId: string): Promise<CardView>;
  lookup(raw: string): Promise<LookupResult>;
  addStamp(token: string, pin: string): Promise<ActionResult>;
  redeem(token: string, pin: string): Promise<ActionResult>;
  listStaffPrograms(orgId: string): Promise<Program[]>;
  enroll(userToken: string, programId: string, pin: string): Promise<ActionResult>;
  listActivity(): Promise<ActivityItem[]>;
  counterSummary(orgId: string): Promise<CounterSummary>;
  listNotifications(): Promise<AppNotification[]>;
  markNotificationRead(id: string): Promise<void>;
  markAllNotificationsRead(): Promise<void>;
  issueWalletPass(cardId: string, platform: 'apple' | 'google'): Promise<WalletPass>;
  listWalletPasses(cardId: string): Promise<WalletPass[]>;
  registerPushToken(input: { token: string; platform: string; mocked: boolean }): Promise<void>;
  getPushRegistration(): Promise<PushRegistration | null>;
  staffDemoPin(orgId: string): Promise<string | null>;
  demoScanChips(): Promise<DemoChip[]>;
  resetDemo(): Promise<void>;
  identityToken(): Promise<string | null>;
}
