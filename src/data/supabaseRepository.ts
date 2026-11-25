import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

import { buildCardView, compareCards } from '@/data/cardView';
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
  RpcPayload,
  StampRow,
} from '@/data/database';
import {
  mapCard,
  mapLocation,
  mapMemberOrg,
  mapNotification,
  mapOrganization,
  mapPass,
  mapProfile,
  mapProgram,
  mapRedemption,
  mapStamp,
} from '@/data/mapRows';
import type { StamplyRepository } from '@/data/repository';
import { isStaffRole } from '@/domain/roles';
import { isEmail, isUserToken, parseCustomerCode } from '@/domain/tokens';
import type {
  ActionResult,
  ActivityItem,
  AppNotification,
  CardView,
  CounterSummary,
  DemoChip,
  DemoPersona,
  FraudCode,
  LookupResult,
  MembershipView,
  Profile,
  Program,
  PushRegistration,
  Session,
  WalletPass,
} from '@/domain/types';
import { RepositoryError } from '@/domain/types';

type UntypedClient = SupabaseClient;

export function readPublicEnv(env: Record<string, string | undefined> = process.env): { url: string; anonKey: string } | null {
  const url = env.EXPO_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

export class SupabaseRepository implements StamplyRepository {
  readonly mode = 'supabase' as const;
  private readonly client: UntypedClient;

  constructor(url: string, anonKey: string, client?: UntypedClient) {
    this.client =
      client ??
      createClient(url, anonKey, {
        auth: {
          storage: AsyncStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: Platform.OS === 'web',
        },
      });
  }

  async getSession(): Promise<Session | null> {
    const { data, error } = await this.client.auth.getSession();
    if (error || !data.session?.user) return null;
    const profile = await this.profileById(data.session.user.id);
    return profile ? { userId: profile.id, email: profile.email, fullName: profile.fullName, mode: 'supabase' } : null;
  }

  async enterDemo(_persona: DemoPersona): Promise<Session> {
    throw new RepositoryError('UNAVAILABLE', 'Demo personas are only available when Supabase is not configured.');
  }

  async requestMagicLink(email: string): Promise<{ devCode: string | null }> {
    const normalized = email.trim().toLowerCase();
    if (!isEmail(normalized)) throw new RepositoryError('INVALID_EMAIL', 'Enter a valid email.');
    const { error } = await this.client.auth.signInWithOtp({
      email: normalized,
      options: { emailRedirectTo: 'stamply://' },
    });
    if (error) throw new RepositoryError('UNAVAILABLE', error.message);
    return { devCode: null };
  }

  async verifyMagicLink(email: string, code: string): Promise<Session> {
    const { data, error } = await this.client.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: code.trim(),
      type: 'email',
    });
    if (error || !data.user) throw new RepositoryError('BAD_CODE', error?.message ?? 'That code is not valid.');
    const profile = await this.profileById(data.user.id);
    if (!profile) {
      throw new RepositoryError('UNAVAILABLE', 'Your account has no Stamply profile yet. The shared database trigger should create one on sign-up.');
    }
    return { userId: profile.id, email: profile.email, fullName: profile.fullName, mode: 'supabase' };
  }

  async signOut(): Promise<void> {
    const { error } = await this.client.auth.signOut();
    if (error) throw new RepositoryError('UNAVAILABLE', error.message);
  }

  async listMemberships(): Promise<MembershipView[]> {
    const session = await this.requireSession();
    const { data, error } = await this.client
      .from('members')
      .select('id, organization_id, user_id, role, display_name, created_at, organizations(*)')
      .eq('user_id', session.userId);
    if (error) throw new RepositoryError('UNAVAILABLE', error.message);
    return asRows<{ organizations: OrganizationRow } & MemberRow>(data).flatMap((row) => {
      const organization = row.organizations;
      if (!organization) return [];
      return [mapMemberOrg(row, organization)];
    });
  }

  async listCards(orgId?: string): Promise<CardView[]> {
    const session = await this.requireSession();
    let query = this.client.from('cards').select('*').eq('customer_id', session.userId);
    if (orgId) query = query.eq('organization_id', orgId);
    const { data, error } = await query;
    if (error) throw new RepositoryError('UNAVAILABLE', error.message);
    return (await this.hydrateCards(asRows<CardRow>(data))).sort(compareCards);
  }

  async getCard(cardId: string): Promise<CardView> {
    const { data, error } = await this.client.from('cards').select('*').eq('id', cardId).maybeSingle();
    if (error) throw new RepositoryError('UNAVAILABLE', error.message);
    if (!data) throw new RepositoryError('UNKNOWN_CARD', 'That card is no longer on file.');
    const [card] = await this.hydrateCards([data as CardRow]);
    if (!card) throw new RepositoryError('UNKNOWN_CARD', 'That card is no longer on file.');
    return card;
  }

  async lookup(raw: string): Promise<LookupResult> {
    const token = parseCustomerCode(raw);
    if (!token) return { kind: 'unknown', message: 'That code is not a Stamply card.' };
    if (isUserToken(token)) {
      const { data, error } = await this.client.from('profiles').select('*').eq('user_token', token).maybeSingle();
      if (error) return { kind: 'unknown', message: error.message };
      if (!data) return { kind: 'unknown', message: 'No customer matches that code.' };
      const profile = mapProfile(data as ProfileRow);
      const memberships = await this.listMemberships();
      const staff = memberships.find((member) => isStaffRole(member.role));
      const programs = staff ? await this.listStaffPrograms(staff.organizationId) : [];
      const { data: cardRows, error: cardError } = await this.client.from('cards').select('*').eq('customer_id', profile.id);
      if (cardError) return { kind: 'unknown', message: cardError.message };
      const cards = await this.hydrateCards(asRows<CardRow>(cardRows).filter((card) => !staff || card.organization_id === staff.organizationId));
      return { kind: 'customer', profile, programs, cards };
    }
    const { data, error } = await this.client.from('cards').select('*').eq('qr_token', token).maybeSingle();
    if (error) return { kind: 'forbidden', message: 'That card belongs to another merchant.' };
    if (!data) return { kind: 'unknown', message: 'No card matches that code.' };
    const [card] = await this.hydrateCards([data as CardRow]);
    if (!card) return { kind: 'unknown', message: 'No card matches that code.' };
    return { kind: 'card', card };
  }

  async addStamp(token: string, pin: string): Promise<ActionResult> {
    return this.rpcCard('add_stamp', token, pin);
  }

  async redeem(token: string, pin: string): Promise<ActionResult> {
    return this.rpcCard('redeem_reward', token, pin);
  }

  async listStaffPrograms(orgId: string): Promise<Program[]> {
    const { data, error } = await this.client.from('programs').select('*').eq('organization_id', orgId).eq('active', true);
    if (error) throw new RepositoryError('UNAVAILABLE', error.message);
    return asRows<ProgramRow>(data).map(mapProgram);
  }

  async enroll(userToken: string, programId: string, pin: string): Promise<ActionResult> {
    const { data, error } = await this.client.rpc('enroll_customer', {
      p_user_token: userToken,
      p_program_id: programId,
      p_pin: pin,
    });
    if (error) return { ok: false, code: 'UNAVAILABLE' as FraudCode, message: error.message };
    return this.payloadToResult(data as RpcPayload);
  }

  async listActivity(): Promise<ActivityItem[]> {
    const session = await this.requireSession();
    const cards = await this.listCards();
    const ids = cards.map((card) => card.id);
    if (ids.length === 0) return [];
    const [stamps, redemptions] = await Promise.all([
      this.client.from('stamp_events').select('*').in('card_id', ids),
      this.client.from('redemptions').select('*').eq('customer_id', session.userId),
    ]);
    if (stamps.error) throw new RepositoryError('UNAVAILABLE', stamps.error.message);
    if (redemptions.error) throw new RepositoryError('UNAVAILABLE', redemptions.error.message);
    return this.toActivity(asRows<StampRow>(stamps.data).map(mapStamp), asRows<RedemptionRow>(redemptions.data).map(mapRedemption), cards);
  }

  async counterSummary(orgId: string): Promise<CounterSummary> {
    const memberships = await this.listMemberships();
    const membership = memberships.find((item) => item.organizationId === orgId);
    if (!membership || !isStaffRole(membership.role)) {
      throw new RepositoryError('NOT_STAFF', 'Counter tools are for staff at this merchant.');
    }
    const { data: stampData, error } = await this.client.from('stamp_events').select('*').eq('organization_id', orgId);
    if (error) throw new RepositoryError('UNAVAILABLE', error.message);
    const { data: redemptionData, error: redemptionError } = await this.client.from('redemptions').select('*').eq('organization_id', orgId);
    if (redemptionError) throw new RepositoryError('UNAVAILABLE', redemptionError.message);
    const { data: cardData, error: cardError } = await this.client.from('cards').select('rewards_available').eq('organization_id', orgId);
    if (cardError) throw new RepositoryError('UNAVAILABLE', cardError.message);
    const stamps = asRows<StampRow>(stampData);
    const redemptions = asRows<RedemptionRow>(redemptionData);
    const now = new Date();
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: membership.organization.timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now);
    const onDay = (iso: string) =>
      new Intl.DateTimeFormat('en-CA', {
        timeZone: membership.organization.timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date(iso)) === today;
    const cards = await this.hydrateCards(
      asRows<CardRow>(
        (await this.client.from('cards').select('*').eq('organization_id', orgId)).data,
      ),
    );
    return {
      stampsToday: stamps.filter((stamp) => onDay(stamp.created_at)).length,
      redemptionsToday: redemptions.filter((item) => onDay(item.created_at)).length,
      rewardsWaiting: asRows<{ rewards_available: number }>(cardData).reduce((sum, card) => sum + card.rewards_available, 0),
      recent: this.toActivity(stamps.map(mapStamp), redemptions.map(mapRedemption), cards).slice(0, 8),
    };
  }

  async listNotifications(): Promise<AppNotification[]> {
    const session = await this.requireSession();
    const { data, error } = await this.client.from('notifications').select('*').eq('user_id', session.userId).order('created_at', { ascending: false });
    if (error) throw new RepositoryError('UNAVAILABLE', error.message);
    return asRows<NotificationRow>(data).map(mapNotification);
  }

  async markNotificationRead(id: string): Promise<void> {
    const { error } = await this.client.from('notifications').update({ read: true }).eq('id', id);
    if (error) throw new RepositoryError('UNAVAILABLE', error.message);
  }

  async markAllNotificationsRead(): Promise<void> {
    const session = await this.requireSession();
    const { error } = await this.client.from('notifications').update({ read: true }).eq('user_id', session.userId);
    if (error) throw new RepositoryError('UNAVAILABLE', error.message);
  }

  async issueWalletPass(cardId: string, platform: 'apple' | 'google'): Promise<WalletPass> {
    const session = await this.requireSession();
    const existing = (await this.listWalletPasses(cardId)).find((pass) => pass.platform === platform);
    if (existing) return existing;
    const serial = `STMP-${platform === 'apple' ? 'A' : 'G'}-${cardId.slice(0, 8).toUpperCase()}`;
    const { data, error } = await this.client
      .from('wallet_passes')
      .insert({ card_id: cardId, user_id: session.userId, platform, status: 'mocked', serial })
      .select('*')
      .single();
    if (error) throw new RepositoryError('UNAVAILABLE', error.message);
    return mapPass(data as PassRow);
  }

  async listWalletPasses(cardId: string): Promise<WalletPass[]> {
    const { data, error } = await this.client.from('wallet_passes').select('*').eq('card_id', cardId);
    if (error) throw new RepositoryError('UNAVAILABLE', error.message);
    return asRows<PassRow>(data).map(mapPass);
  }

  async registerPushToken(input: { token: string; platform: string; mocked: boolean }): Promise<void> {
    const session = await this.requireSession();
    const { error } = await this.client.from('push_tokens').upsert(
      { user_id: session.userId, token: input.token, platform: input.platform, mocked: input.mocked },
      { onConflict: 'user_id,platform' },
    );
    if (error) throw new RepositoryError('UNAVAILABLE', error.message);
  }

  async getPushRegistration(): Promise<PushRegistration | null> {
    const session = await this.requireSession();
    const { data, error } = await this.client.from('push_tokens').select('token, platform, mocked').eq('user_id', session.userId).limit(1);
    if (error) throw new RepositoryError('UNAVAILABLE', error.message);
    const row = asRows<PushRegistration>(data)[0];
    return row ?? null;
  }

  async staffDemoPin(): Promise<string | null> {
    return null;
  }

  async demoScanChips(): Promise<DemoChip[]> {
    return [];
  }

  async resetDemo(): Promise<void> {
    throw new RepositoryError('UNAVAILABLE', 'Reset is only available in the demo workspace.');
  }

  async identityToken(): Promise<string | null> {
    const session = await this.getSession();
    if (!session) return null;
    return (await this.profileById(session.userId))?.userToken ?? null;
  }

  private async rpcCard(fn: 'add_stamp' | 'redeem_reward', token: string, pin: string): Promise<ActionResult> {
    const parsed = parseCustomerCode(token) ?? token;
    const { data, error } = await this.client.rpc(fn, { p_token: parsed, p_pin: pin });
    if (error) return { ok: false, code: 'UNAVAILABLE' as FraudCode, message: error.message };
    return this.payloadToResult(data as RpcPayload);
  }

  private async payloadToResult(payload: RpcPayload): Promise<ActionResult> {
    if (!payload?.ok) {
      return {
        ok: false,
        code: (payload?.code as FraudCode) ?? 'UNKNOWN_CARD',
        message: payload?.message ?? 'The counter could not complete that.',
        retryAt: payload?.retry_at,
      };
    }
    if (!payload.card_id) return { ok: false, code: 'UNKNOWN_CARD', message: payload.message };
    const card = await this.getCard(payload.card_id);
    return { ok: true, card, unlockedReward: Boolean(payload.unlocked_reward), message: payload.message };
  }

  private async hydrateCards(rows: CardRow[]): Promise<CardView[]> {
    if (rows.length === 0) return [];
    const programIds = [...new Set(rows.map((row) => row.program_id))];
    const orgIds = [...new Set(rows.map((row) => row.organization_id))];
    const customerIds = [...new Set(rows.map((row) => row.customer_id))];
    const cardIds = rows.map((row) => row.id);
    const [programs, orgs, profiles, stamps, locations, members] = await Promise.all([
      this.client.from('programs').select('*').in('id', programIds),
      this.client.from('organizations').select('*').in('id', orgIds),
      this.client.from('profiles').select('*').in('id', customerIds),
      this.client.from('stamp_events').select('*').in('card_id', cardIds),
      this.client.from('locations').select('*').in('organization_id', orgIds),
      this.client.from('members').select('user_id, display_name').in('organization_id', orgIds),
    ]);
    const programById = new Map(asRows<ProgramRow>(programs.data).map((row) => [row.id, mapProgram(row)]));
    const orgById = new Map(asRows<OrganizationRow>(orgs.data).map((row) => [row.id, mapOrganization(row)]));
    const profileById = new Map(asRows<ProfileRow>(profiles.data).map((row) => [row.id, mapProfile(row)]));
    const stampEvents = asRows<StampRow>(stamps.data).map(mapStamp);
    const locationRows = asRows<LocationRow>(locations.data).map(mapLocation);
    const staffNames: Record<string, string> = {};
    for (const member of asRows<{ user_id: string; display_name: string }>(members.data)) {
      staffNames[member.user_id] = member.display_name;
    }
    const now = new Date();
    return rows.flatMap((row) => {
      const program = programById.get(row.program_id);
      const organization = orgById.get(row.organization_id);
      const customer = profileById.get(row.customer_id);
      if (!program || !organization || !customer) return [];
      return [buildCardView({ card: mapCard(row), program, organization, customer, events: stampEvents, staffNames, locations: locationRows, now })];
    });
  }

  private toActivity(
    stamps: ReturnType<typeof mapStamp>[],
    redemptions: ReturnType<typeof mapRedemption>[],
    cards: CardView[],
  ): ActivityItem[] {
    const byId = new Map(cards.map((card) => [card.id, card]));
    const stampItems: ActivityItem[] = stamps.map((stamp) => {
      const card = byId.get(stamp.cardId);
      return {
        id: stamp.id,
        kind: 'stamp',
        title: stamp.unlockedReward ? 'Reward unlocked' : 'Stamp added',
        body: card ? `${card.customer.fullName} · ${card.program.name}` : 'Stamp',
        at: stamp.createdAt,
        orgName: card?.organization.name ?? 'Merchant',
      };
    });
    const redemptionItems: ActivityItem[] = redemptions.map((item) => ({
      id: item.id,
      kind: 'redemption',
      title: `${item.rewardName} redeemed`,
      body: byId.get(item.cardId)?.customer.fullName ?? 'Customer',
      at: item.createdAt,
      orgName: byId.get(item.cardId)?.organization.name ?? 'Merchant',
    }));
    return [...stampItems, ...redemptionItems].sort((a, b) => (a.at < b.at ? 1 : -1));
  }

  private async profileById(id: string): Promise<Profile | null> {
    const { data, error } = await this.client.from('profiles').select('*').eq('id', id).maybeSingle();
    if (error || !data) return null;
    return mapProfile(data as ProfileRow);
  }

  private async requireSession(): Promise<Session> {
    const session = await this.getSession();
    if (!session) throw new RepositoryError('NOT_SIGNED_IN', 'Sign in to open Stamply.');
    return session;
  }
}

function asRows<T>(data: unknown): T[] {
  return Array.isArray(data) ? (data as T[]) : [];
}
