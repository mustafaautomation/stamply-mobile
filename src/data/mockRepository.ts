import { buildCardView, compareCards } from '@/data/cardView';
import { createId, nameFromEmail, userIdFromEmail } from '@/data/ids';
import { createSeed, DEMO_PERSONAS, MOCK_MAGIC_CODE, type MockState, type StaffMember } from '@/data/seed';
import { isStaffRole } from '@/domain/roles';
import { evaluateStamp, nextPunch } from '@/domain/stampRules';
import { isEmail, isUserToken, parseCustomerCode } from '@/domain/tokens';
import type { StamplyRepository } from '@/data/repository';
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
  Profile,
  Program,
  PushRegistration,
  Session,
  WalletPass,
} from '@/domain/types';
import { RepositoryError } from '@/domain/types';

export interface KeyValueStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export const MOCK_STORAGE_KEY = 'stamply.mock.v1';

export class MockRepository implements StamplyRepository {
  readonly mode = 'mock' as const;

  constructor(
    private state: MockState,
    private readonly clock: () => Date = () => new Date(),
    private readonly storage?: KeyValueStore,
  ) {}

  static async hydrate(storage: KeyValueStore, clock: () => Date = () => new Date()): Promise<MockRepository> {
    const raw = await storage.getItem(MOCK_STORAGE_KEY);
    if (raw) {
      try {
        return new MockRepository(JSON.parse(raw) as MockState, clock, storage);
      } catch {
        // Replace a corrupt cache with a fresh demo workspace.
      }
    }
    const repo = new MockRepository(createSeed(clock()), clock, storage);
    await repo.save();
    return repo;
  }

  async getSession(): Promise<Session | null> {
    const profile = this.profile(this.state.sessionUserId);
    return profile ? this.sessionFor(profile) : null;
  }

  async enterDemo(persona: DemoPersona): Promise<Session> {
    const profile = this.profile(DEMO_PERSONAS[persona]);
    if (!profile) throw new RepositoryError('UNAVAILABLE', 'That demo persona is missing.');
    this.state.sessionUserId = profile.id;
    await this.save();
    return this.sessionFor(profile);
  }

  async requestMagicLink(email: string): Promise<{ devCode: string | null }> {
    const normalized = email.trim().toLowerCase();
    if (!isEmail(normalized)) throw new RepositoryError('INVALID_EMAIL', 'Enter a valid email.');
    this.state.magicCodes[normalized] = MOCK_MAGIC_CODE;
    await this.save();
    return { devCode: MOCK_MAGIC_CODE };
  }

  async verifyMagicLink(email: string, code: string): Promise<Session> {
    const normalized = email.trim().toLowerCase();
    const expected = this.state.magicCodes[normalized];
    if (!expected || expected !== code.trim()) {
      throw new RepositoryError('BAD_CODE', 'That code is not valid.');
    }
    let profile = this.state.profiles.find((item) => item.email === normalized);
    if (!profile) {
      const id = userIdFromEmail(normalized);
      profile = {
        id,
        email: normalized,
        fullName: nameFromEmail(normalized),
        userToken: `stmp_user_${id.replace(/^user_/, '')}`,
      };
      this.state.profiles.push(profile);
    }
    delete this.state.magicCodes[normalized];
    this.state.sessionUserId = profile.id;
    await this.save();
    return this.sessionFor(profile);
  }

  async signOut(): Promise<void> {
    this.state.sessionUserId = null;
    await this.save();
  }

  async listMemberships(): Promise<MembershipView[]> {
    const session = this.requireSession();
    return this.state.members
      .filter((member) => member.userId === session.userId)
      .map((member) => this.toMembership(member))
      .filter((member): member is MembershipView => member !== null);
  }

  async listCards(orgId?: string): Promise<CardView[]> {
    const session = this.requireSession();
    return this.state.cards
      .filter((card) => card.customerId === session.userId && (!orgId || card.organizationId === orgId))
      .map((card) => this.view(card.id))
      .filter((card): card is CardView => card !== null)
      .sort(compareCards);
  }

  async getCard(cardId: string): Promise<CardView> {
    const card = this.view(cardId);
    if (!card) throw new RepositoryError('UNKNOWN_CARD', 'That card is no longer on file.');
    this.assertCanSeeCard(card);
    return card;
  }

  async lookup(raw: string): Promise<LookupResult> {
    const session = this.requireSession();
    const token = parseCustomerCode(raw);
    if (!token) return { kind: 'unknown', message: 'That code is not a Stamply card.' };
    if (isUserToken(token)) {
      const profile = this.state.profiles.find((item) => item.userToken === token);
      if (!profile) return { kind: 'unknown', message: 'No customer matches that code.' };
      const staffOrg = this.staffOrgForScan();
      if (!staffOrg && profile.id !== session.userId) {
        return { kind: 'forbidden', message: 'Only staff can open another customer.' };
      }
      const programs = staffOrg
        ? this.state.programs.filter((program) => program.organizationId === staffOrg && program.active)
        : [];
      const cards = this.state.cards
        .filter((card) => card.customerId === profile.id && (!staffOrg || card.organizationId === staffOrg))
        .map((card) => this.view(card.id))
        .filter((card): card is CardView => card !== null);
      return { kind: 'customer', profile, programs, cards };
    }
    const card = this.state.cards.find((item) => item.qrToken === token);
    if (!card) return { kind: 'unknown', message: 'No card matches that code.' };
    const view = this.view(card.id);
    if (!view) return { kind: 'unknown', message: 'No card matches that code.' };
    if (!this.canSeeCard(view)) {
      return { kind: 'forbidden', message: 'That card belongs to another merchant.' };
    }
    return { kind: 'card', card: view };
  }

  async addStamp(token: string, pin: string): Promise<ActionResult> {
    return this.mutateCard(token, pin, 'stamp');
  }

  async redeem(token: string, pin: string): Promise<ActionResult> {
    return this.mutateCard(token, pin, 'redeem');
  }

  async listStaffPrograms(orgId: string): Promise<Program[]> {
    this.requireStaff(orgId);
    return this.state.programs.filter((program) => program.organizationId === orgId && program.active);
  }

  async enroll(userToken: string, programId: string, pin: string): Promise<ActionResult> {
    const session = this.requireSession();
    const program = this.state.programs.find((item) => item.id === programId);
    if (!program) return { ok: false, code: 'UNKNOWN_CARD', message: 'That program is not available.' };
    const member = this.memberAt(session.userId, program.organizationId);
    if (!member || !isStaffRole(member.role)) {
      return { ok: false, code: 'NOT_STAFF', message: 'Only staff at this merchant can enroll customers.' };
    }
    if (member.pin !== pin.trim()) {
      return { ok: false, code: 'INVALID_PIN', message: 'That PIN does not match.' };
    }
    if (!program.active) {
      return { ok: false, code: 'INACTIVE_PROGRAM', message: 'This card is paused by the merchant.' };
    }
    const profile = this.state.profiles.find((item) => item.userToken === userToken);
    if (!profile) return { ok: false, code: 'UNKNOWN_CUSTOMER', message: 'No customer matches that code.' };
    const existing = this.state.cards.find((card) => card.customerId === profile.id && card.programId === program.id);
    if (existing) {
      const card = this.view(existing.id);
      return card
        ? { ok: false, code: 'ALREADY_ENROLLED', message: 'This customer already has that card.' }
        : { ok: false, code: 'ALREADY_ENROLLED', message: 'This customer already has that card.' };
    }
    if (!this.state.members.some((item) => item.userId === profile.id && item.organizationId === program.organizationId)) {
      this.state.members.push({
        id: createId('mem'),
        organizationId: program.organizationId,
        userId: profile.id,
        role: 'customer',
        displayName: profile.fullName,
        pin: null,
      });
    }
    const cardId = createId('card');
    this.state.cards.push({
      id: cardId,
      organizationId: program.organizationId,
      programId: program.id,
      customerId: profile.id,
      stamps: 0,
      lifetimeStamps: 0,
      rewardsAvailable: 0,
      rewardsRedeemed: 0,
      qrToken: `stmp_${cardId}`,
    });
    this.notify(profile.id, program.organizationId, `Joined ${program.name}`, `${this.orgName(program.organizationId)} started a card for you.`, `/card/${cardId}`);
    await this.save();
    const card = this.view(cardId);
    if (!card) throw new RepositoryError('UNKNOWN_CARD', 'The new card could not be opened.');
    return { ok: true, card, unlockedReward: false, message: `${profile.fullName} is on ${program.name}.` };
  }

  async listActivity(): Promise<ActivityItem[]> {
    const session = this.requireSession();
    const mine = new Set(this.state.cards.filter((card) => card.customerId === session.userId).map((card) => card.id));
    return this.activityFor((item) => mine.has(item.cardId));
  }

  async counterSummary(orgId: string): Promise<CounterSummary> {
    this.requireStaff(orgId);
    const now = this.clock();
    const org = this.state.organizations.find((item) => item.id === orgId);
    const timeZone = org?.timezone ?? 'UTC';
    const today = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
    const onDay = (iso: string) =>
      new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso)) === today;
    const stampsToday = this.state.stamps.filter((stamp) => stamp.organizationId === orgId && onDay(stamp.createdAt)).length;
    const redemptionsToday = this.state.redemptions.filter((item) => item.organizationId === orgId && onDay(item.createdAt)).length;
    const rewardsWaiting = this.state.cards
      .filter((card) => card.organizationId === orgId)
      .reduce((sum, card) => sum + card.rewardsAvailable, 0);
    const recent = this.activityFor((item) => item.organizationId === orgId).slice(0, 8);
    return { stampsToday, redemptionsToday, rewardsWaiting, recent };
  }

  async listNotifications(): Promise<AppNotification[]> {
    const session = this.requireSession();
    return this.state.notifications
      .filter((item) => item.userId === session.userId)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }

  async markNotificationRead(id: string): Promise<void> {
    const session = this.requireSession();
    const note = this.state.notifications.find((item) => item.id === id && item.userId === session.userId);
    if (note) note.read = true;
    await this.save();
  }

  async markAllNotificationsRead(): Promise<void> {
    const session = this.requireSession();
    for (const note of this.state.notifications) {
      if (note.userId === session.userId) note.read = true;
    }
    await this.save();
  }

  async issueWalletPass(cardId: string, platform: 'apple' | 'google'): Promise<WalletPass> {
    const card = await this.getCard(cardId);
    const session = this.requireSession();
    if (card.customer.id !== session.userId) {
      throw new RepositoryError('NOT_STAFF', 'Only the customer can add this card to a wallet.');
    }
    const existing = this.state.passes.find((pass) => pass.cardId === cardId && pass.platform === platform);
    if (existing) return existing;
    const pass: WalletPass = {
      id: createId('pass'),
      cardId,
      userId: session.userId,
      platform,
      status: 'mocked',
      serial: `STMP-${platform === 'apple' ? 'A' : 'G'}-${cardId.replace('card_', '').slice(0, 12).toUpperCase()}`,
      createdAt: this.clock().toISOString(),
    };
    this.state.passes.push(pass);
    await this.save();
    return pass;
  }

  async listWalletPasses(cardId: string): Promise<WalletPass[]> {
    const session = this.requireSession();
    return this.state.passes.filter((pass) => pass.cardId === cardId && pass.userId === session.userId);
  }

  async registerPushToken(input: { token: string; platform: string; mocked: boolean }): Promise<void> {
    const session = this.requireSession();
    this.state.pushTokens = this.state.pushTokens.filter((item) => item.userId !== session.userId || item.platform !== input.platform);
    this.state.pushTokens.push({ userId: session.userId, ...input });
    await this.save();
  }

  async getPushRegistration(): Promise<PushRegistration | null> {
    const session = this.requireSession();
    const token = [...this.state.pushTokens].reverse().find((item) => item.userId === session.userId);
    return token ? { token: token.token, platform: token.platform, mocked: token.mocked } : null;
  }

  async staffDemoPin(orgId: string): Promise<string | null> {
    const session = await this.getSession();
    if (!session) return null;
    const member = this.memberAt(session.userId, orgId);
    if (!member || !isStaffRole(member.role)) return null;
    return member.pin;
  }

  async demoScanChips(): Promise<DemoChip[]> {
    const orgId = this.staffOrgForScan();
    if (!orgId) return [];
    return this.state.cards
      .filter((card) => card.organizationId === orgId)
      .map((card) => {
        const program = this.state.programs.find((item) => item.id === card.programId);
        const profile = this.profile(card.customerId);
        return {
          id: card.id,
          label: `${profile?.fullName.split(' ')[0] ?? 'Guest'} · ${program?.name ?? 'Card'}`,
          token: card.qrToken,
        };
      });
  }

  async resetDemo(): Promise<void> {
    const current = this.state.sessionUserId;
    const fresh = createSeed(this.clock());
    if (current && fresh.profiles.some((profile) => profile.id === current)) fresh.sessionUserId = current;
    this.state = fresh;
    await this.save();
  }

  async identityToken(): Promise<string | null> {
    return this.profile(this.state.sessionUserId)?.userToken ?? null;
  }

  private async mutateCard(rawToken: string, pin: string, kind: 'stamp' | 'redeem'): Promise<ActionResult> {
    const session = this.requireSession();
    const token = parseCustomerCode(rawToken);
    const record = token ? this.state.cards.find((card) => card.qrToken === token) : undefined;
    if (!record) return { ok: false, code: 'UNKNOWN_CARD', message: 'No card matches that code.' };
    const member = this.memberAt(session.userId, record.organizationId);
    if (!member || !isStaffRole(member.role)) {
      return { ok: false, code: 'NOT_STAFF', message: 'Only staff at this merchant can stamp or redeem.' };
    }
    const program = this.state.programs.find((item) => item.id === record.programId);
    if (!program) return { ok: false, code: 'UNKNOWN_CARD', message: 'That program is missing.' };
    const view = this.view(record.id);
    if (!view) return { ok: false, code: 'UNKNOWN_CARD', message: 'No card matches that code.' };
    const pinOk = member.pin === pin.trim();
    if (kind === 'redeem') {
      if (!pinOk) return { ok: false, code: 'INVALID_PIN', message: 'That PIN does not match.' };
      if (record.rewardsAvailable < 1) {
        return { ok: false, code: 'NO_REWARD', message: 'There is no reward waiting on this card.' };
      }
      record.rewardsAvailable -= 1;
      record.rewardsRedeemed += 1;
      this.state.redemptions.push({
        id: createId('red'),
        organizationId: record.organizationId,
        cardId: record.id,
        programId: record.programId,
        customerId: record.customerId,
        staffId: session.userId,
        rewardName: program.rewardName,
        createdAt: this.clock().toISOString(),
      });
      this.notify(record.customerId, record.organizationId, `${program.rewardName} redeemed`, `${this.orgName(record.organizationId)} marked your reward as used.`, `/card/${record.id}`);
      await this.save();
      const next = this.view(record.id);
      if (!next) throw new RepositoryError('UNKNOWN_CARD', 'The card disappeared after redeem.');
      return { ok: true, card: next, unlockedReward: false, message: `${program.rewardName} redeemed for ${next.customer.fullName}.` };
    }

    const decision = evaluateStamp({
      now: this.clock(),
      lastStampAt: view.lastStampAt,
      stampsToday: view.stampsToday,
      cooldownMinutes: program.cooldownMinutes,
      maxStampsPerDay: program.maxStampsPerDay,
      programActive: program.active,
      role: member.role,
      pinOk,
    });
    if (!decision.ok) return decision;
    const punch = nextPunch(record.stamps, program.stampsRequired);
    record.stamps = punch.stamps;
    record.lifetimeStamps += 1;
    if (punch.unlocked) record.rewardsAvailable += 1;
    this.state.stamps.push({
      id: createId('st'),
      organizationId: record.organizationId,
      cardId: record.id,
      programId: record.programId,
      customerId: record.customerId,
      staffId: session.userId,
      createdAt: this.clock().toISOString(),
      unlockedReward: punch.unlocked,
    });
    const message = punch.unlocked
      ? `${program.rewardName} is unlocked.`
      : `Stamp added. ${record.stamps} of ${program.stampsRequired}.`;
    this.notify(
      record.customerId,
      record.organizationId,
      punch.unlocked ? `${program.rewardName} is ready` : `Stamp added at ${this.orgName(record.organizationId)}`,
      message,
      `/card/${record.id}`,
    );
    await this.save();
    const next = this.view(record.id);
    if (!next) throw new RepositoryError('UNKNOWN_CARD', 'The card disappeared after the stamp.');
    return { ok: true, card: next, unlockedReward: punch.unlocked, message };
  }

  private activityFor(match: (item: { cardId: string; organizationId: string }) => boolean): ActivityItem[] {
    const stamps: ActivityItem[] = this.state.stamps.filter(match).map((stamp) => {
      const card = this.view(stamp.cardId);
      return {
        id: stamp.id,
        kind: 'stamp' as const,
        title: stamp.unlockedReward ? 'Reward unlocked' : 'Stamp added',
        body: card
          ? `${card.customer.fullName} · ${card.program.name}`
          : 'Stamp',
        at: stamp.createdAt,
        orgName: this.orgName(stamp.organizationId),
      };
    });
    const redemptions: ActivityItem[] = this.state.redemptions.filter(match).map((item) => {
      const profile = this.profile(item.customerId);
      return {
        id: item.id,
        kind: 'redemption' as const,
        title: `${item.rewardName} redeemed`,
        body: profile?.fullName ?? 'Customer',
        at: item.createdAt,
        orgName: this.orgName(item.organizationId),
      };
    });
    return [...stamps, ...redemptions].sort((a, b) => (a.at < b.at ? 1 : -1));
  }

  private notify(userId: string, organizationId: string, title: string, body: string, href: string): void {
    this.state.notifications.unshift({
      id: createId('nt'),
      userId,
      organizationId,
      title,
      body,
      read: false,
      createdAt: this.clock().toISOString(),
      href,
    });
  }

  private view(cardId: string): CardView | null {
    const card = this.state.cards.find((item) => item.id === cardId);
    if (!card) return null;
    const program = this.state.programs.find((item) => item.id === card.programId);
    const organization = this.state.organizations.find((item) => item.id === card.organizationId);
    const customer = this.profile(card.customerId);
    if (!program || !organization || !customer) return null;
    const staffNames: Record<string, string> = {};
    for (const member of this.state.members) staffNames[member.userId] = member.displayName;
    return buildCardView({
      card,
      program,
      organization,
      customer,
      events: this.state.stamps,
      staffNames,
      locations: this.state.locations,
      now: this.clock(),
    });
  }

  private canSeeCard(card: CardView): boolean {
    const session = this.profile(this.state.sessionUserId);
    if (!session) return false;
    if (card.customer.id === session.id) return true;
    const member = this.memberAt(session.id, card.organization.id);
    return Boolean(member && isStaffRole(member.role));
  }

  private assertCanSeeCard(card: CardView): void {
    if (!this.canSeeCard(card)) {
      throw new RepositoryError('WRONG_ORG', 'That card belongs to another merchant.');
    }
  }

  private staffOrgForScan(): string | null {
    const session = this.profile(this.state.sessionUserId);
    if (!session) return null;
    const staff = this.state.members.find((member) => member.userId === session.id && isStaffRole(member.role));
    return staff?.organizationId ?? null;
  }

  private requireStaff(orgId: string): StaffMember {
    const session = this.requireSession();
    const member = this.memberAt(session.userId, orgId);
    if (!member || !isStaffRole(member.role)) {
      throw new RepositoryError('NOT_STAFF', 'Counter tools are for staff at this merchant.');
    }
    return member;
  }

  private requireSession(): Session {
    const profile = this.profile(this.state.sessionUserId);
    if (!profile) throw new RepositoryError('NOT_SIGNED_IN', 'Sign in to open Stamply.');
    return this.sessionFor(profile);
  }

  private memberAt(userId: string, orgId: string): StaffMember | undefined {
    return this.state.members.find((member) => member.userId === userId && member.organizationId === orgId);
  }

  private toMembership(member: StaffMember): MembershipView | null {
    const organization = this.state.organizations.find((item) => item.id === member.organizationId);
    if (!organization) return null;
    return {
      id: member.id,
      organizationId: member.organizationId,
      userId: member.userId,
      role: member.role,
      displayName: member.displayName,
      hasPin: Boolean(member.pin),
      organization,
    };
  }

  private profile(id: string | null): Profile | undefined {
    if (!id) return undefined;
    return this.state.profiles.find((item) => item.id === id);
  }

  private sessionFor(profile: Profile): Session {
    return { userId: profile.id, email: profile.email, fullName: profile.fullName, mode: 'mock' };
  }

  private orgName(orgId: string): string {
    return this.state.organizations.find((item) => item.id === orgId)?.name ?? 'Merchant';
  }

  private async save(): Promise<void> {
    if (!this.storage) return;
    await this.storage.setItem(MOCK_STORAGE_KEY, JSON.stringify(this.state));
  }
}
