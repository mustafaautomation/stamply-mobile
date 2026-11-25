import type { Card, Location, Organization, Profile, Program, Redemption, StampEvent } from '@/domain/types';

export interface StaffMember {
  id: string;
  organizationId: string;
  userId: string;
  role: 'owner' | 'admin' | 'staff' | 'customer';
  displayName: string;
  pin: string | null;
}

export interface MockState {
  sessionUserId: string | null;
  profiles: Profile[];
  organizations: Organization[];
  members: StaffMember[];
  programs: Program[];
  locations: Location[];
  cards: Card[];
  stamps: StampEvent[];
  redemptions: Redemption[];
  notifications: import('@/domain/types').AppNotification[];
  passes: import('@/domain/types').WalletPass[];
  pushTokens: { userId: string; token: string; platform: string; mocked: boolean }[];
  magicCodes: Record<string, string>;
}

const hour = 60 * 60 * 1000;
const day = 24 * hour;

function iso(now: Date, offsetMs: number): string {
  return new Date(now.getTime() - offsetMs).toISOString();
}

export const MOCK_MAGIC_CODE = '000000';

export const DEMO_PERSONAS = {
  lina: 'user_lina',
  omar: 'user_omar',
  elena: 'user_elena',
} as const;

export function createSeed(now: Date): MockState {
  const organizations: Organization[] = [
    {
      id: 'org_harbor',
      name: 'Harbor & Rye',
      slug: 'harbor-rye',
      city: 'Seattle',
      brandColor: '#C4452D',
      timezone: 'America/Los_Angeles',
      plan: 'house',
    },
    {
      id: 'org_northline',
      name: 'Northline Bakery',
      slug: 'northline',
      city: 'Portland',
      brandColor: '#2C5C4E',
      timezone: 'America/Los_Angeles',
      plan: 'counter',
    },
  ];

  const profiles: Profile[] = [
    { id: 'user_lina', email: 'lina@demo.stamply.app', fullName: 'Lina Chen', userToken: 'stmp_user_lina' },
    { id: 'user_jonah', email: 'jonah@demo.stamply.app', fullName: 'Jonah Adeyemi', userToken: 'stmp_user_jonah' },
    { id: 'user_omar', email: 'omar@demo.stamply.app', fullName: 'Omar Haddad', userToken: 'stmp_user_omar' },
    { id: 'user_ruth', email: 'ruth@demo.stamply.app', fullName: 'Ruth Okonkwo', userToken: 'stmp_user_ruth' },
    { id: 'user_elena', email: 'elena@demo.stamply.app', fullName: 'Elena Voss', userToken: 'stmp_user_elena' },
  ];

  const members: StaffMember[] = [
    { id: 'mem_lina_h', organizationId: 'org_harbor', userId: 'user_lina', role: 'customer', displayName: 'Lina Chen', pin: null },
    { id: 'mem_lina_n', organizationId: 'org_northline', userId: 'user_lina', role: 'customer', displayName: 'Lina Chen', pin: null },
    { id: 'mem_jonah', organizationId: 'org_harbor', userId: 'user_jonah', role: 'customer', displayName: 'Jonah Adeyemi', pin: null },
    { id: 'mem_omar', organizationId: 'org_harbor', userId: 'user_omar', role: 'staff', displayName: 'Omar Haddad', pin: '2468' },
    { id: 'mem_ruth', organizationId: 'org_harbor', userId: 'user_ruth', role: 'owner', displayName: 'Ruth Okonkwo', pin: '1357' },
    { id: 'mem_elena', organizationId: 'org_northline', userId: 'user_elena', role: 'owner', displayName: 'Elena Voss', pin: '8021' },
  ];

  const programs: Program[] = [
    {
      id: 'prg_espresso',
      organizationId: 'org_harbor',
      name: 'House espresso',
      description: 'One stamp for every espresso drink. Eight visits, and the next one is on the house.',
      stampsRequired: 8,
      rewardName: 'Free espresso',
      rewardDescription: 'Any size, any milk.',
      cooldownMinutes: 20,
      maxStampsPerDay: 4,
      active: true,
      accent: '#C4452D',
    },
    {
      id: 'prg_pastry',
      organizationId: 'org_harbor',
      name: 'Morning pastry',
      description: 'A stamp with any pastry before noon.',
      stampsRequired: 6,
      rewardName: 'Free pastry',
      rewardDescription: 'One item from the morning case.',
      cooldownMinutes: 45,
      maxStampsPerDay: 3,
      active: true,
      accent: '#A6843D',
    },
    {
      id: 'prg_cocoa',
      organizationId: 'org_harbor',
      name: 'Fireside chocolate',
      description: 'Seasonal mocha card. Paused until the next cold snap.',
      stampsRequired: 8,
      rewardName: 'Free mocha',
      rewardDescription: 'A fireside mocha, whipped cream included.',
      cooldownMinutes: 30,
      maxStampsPerDay: 2,
      active: false,
      accent: '#6E4A3A',
    },
    {
      id: 'prg_loaf',
      organizationId: 'org_northline',
      name: 'Country loaf',
      description: 'Ten bakery visits. The eleventh loaf is a gift.',
      stampsRequired: 10,
      rewardName: 'Free country loaf',
      rewardDescription: 'Baked before dawn, still warm if you are early.',
      cooldownMinutes: 120,
      maxStampsPerDay: 2,
      active: true,
      accent: '#2C5C4E',
    },
  ];

  const locations: Location[] = [
    { id: 'loc_pike', organizationId: 'org_harbor', name: 'Pike Place counter' },
    { id: 'loc_ballard', organizationId: 'org_harbor', name: 'Ballard window' },
    { id: 'loc_division', organizationId: 'org_northline', name: 'Division Street' },
  ];

  const cards: Card[] = [
    { id: 'card_lina_espresso', organizationId: 'org_harbor', programId: 'prg_espresso', customerId: 'user_lina', stamps: 5, lifetimeStamps: 5, rewardsAvailable: 0, rewardsRedeemed: 0, qrToken: 'stmp_lina_espresso' },
    { id: 'card_lina_pastry', organizationId: 'org_harbor', programId: 'prg_pastry', customerId: 'user_lina', stamps: 2, lifetimeStamps: 8, rewardsAvailable: 0, rewardsRedeemed: 1, qrToken: 'stmp_lina_pastry' },
    { id: 'card_lina_cocoa', organizationId: 'org_harbor', programId: 'prg_cocoa', customerId: 'user_lina', stamps: 1, lifetimeStamps: 1, rewardsAvailable: 0, rewardsRedeemed: 0, qrToken: 'stmp_lina_cocoa' },
    { id: 'card_lina_loaf', organizationId: 'org_northline', programId: 'prg_loaf', customerId: 'user_lina', stamps: 7, lifetimeStamps: 7, rewardsAvailable: 0, rewardsRedeemed: 0, qrToken: 'stmp_lina_loaf' },
    { id: 'card_jonah_espresso', organizationId: 'org_harbor', programId: 'prg_espresso', customerId: 'user_jonah', stamps: 0, lifetimeStamps: 8, rewardsAvailable: 1, rewardsRedeemed: 0, qrToken: 'stmp_jonah_espresso' },
    { id: 'card_omar_pastry', organizationId: 'org_harbor', programId: 'prg_pastry', customerId: 'user_omar', stamps: 2, lifetimeStamps: 2, rewardsAvailable: 0, rewardsRedeemed: 0, qrToken: 'stmp_omar_pastry' },
  ];

  const stamps: StampEvent[] = [
    event('st_lina_e1', 'card_lina_espresso', 'prg_espresso', 'user_lina', iso(now, 6 * day), false),
    event('st_lina_e2', 'card_lina_espresso', 'prg_espresso', 'user_lina', iso(now, 4 * day), false),
    event('st_lina_e3', 'card_lina_espresso', 'prg_espresso', 'user_lina', iso(now, 3 * day), false),
    event('st_lina_e4', 'card_lina_espresso', 'prg_espresso', 'user_lina', iso(now, 2 * day), false),
    event('st_lina_e5', 'card_lina_espresso', 'prg_espresso', 'user_lina', iso(now, 3 * hour), false),
    event('st_lina_p1', 'card_lina_pastry', 'prg_pastry', 'user_lina', iso(now, 5 * day), false),
    event('st_lina_p2', 'card_lina_pastry', 'prg_pastry', 'user_lina', iso(now, day), false),
    event('st_lina_c1', 'card_lina_cocoa', 'prg_cocoa', 'user_lina', iso(now, 10 * day), false),
    event('st_lina_l1', 'card_lina_loaf', 'prg_loaf', 'user_elena', iso(now, 9 * day), false),
    event('st_lina_l2', 'card_lina_loaf', 'prg_loaf', 'user_elena', iso(now, 2 * day), false),
    event('st_jonah_unlock', 'card_jonah_espresso', 'prg_espresso', 'user_jonah', iso(now, 5 * 60 * 1000), true),
    event('st_omar_p1', 'card_omar_pastry', 'prg_pastry', 'user_omar', iso(now, 4 * hour), false),
    event('st_omar_p2', 'card_omar_pastry', 'prg_pastry', 'user_omar', iso(now, 2 * hour), false),
  ];

  const redemptions: Redemption[] = [
    {
      id: 'red_lina_pastry',
      organizationId: 'org_harbor',
      cardId: 'card_lina_pastry',
      programId: 'prg_pastry',
      customerId: 'user_lina',
      staffId: 'user_omar',
      rewardName: 'Free pastry',
      createdAt: iso(now, 20 * day),
    },
  ];

  return {
    sessionUserId: null,
    profiles,
    organizations,
    members,
    programs,
    locations,
    cards,
    stamps,
    redemptions,
    notifications: [
      {
        id: 'nt_lina_espresso',
        userId: 'user_lina',
        organizationId: 'org_harbor',
        title: 'Three stamps from a free espresso',
        body: 'Harbor & Rye kept your House espresso card at 5 of 8.',
        read: false,
        createdAt: iso(now, 3 * hour),
        href: '/card/card_lina_espresso',
      },
      {
        id: 'nt_lina_loaf',
        userId: 'user_lina',
        organizationId: 'org_northline',
        title: 'The country loaf is close',
        body: 'Three more visits at Northline Bakery and the next loaf is yours.',
        read: false,
        createdAt: iso(now, 2 * day),
        href: '/card/card_lina_loaf',
      },
      {
        id: 'nt_lina_pastry',
        userId: 'user_lina',
        organizationId: 'org_harbor',
        title: 'Pastry card stamped',
        body: 'Omar added a stamp to your Morning pastry card.',
        read: true,
        createdAt: iso(now, day),
        href: '/card/card_lina_pastry',
      },
      {
        id: 'nt_omar_jonah',
        userId: 'user_omar',
        organizationId: 'org_harbor',
        title: 'Jonah unlocked a free espresso',
        body: 'His House espresso card reset. The reward is ready to redeem.',
        read: false,
        createdAt: iso(now, 5 * 60 * 1000),
        href: '/stamp/stmp_jonah_espresso',
      },
      {
        id: 'nt_elena_loaf',
        userId: 'user_elena',
        organizationId: 'org_northline',
        title: 'Lina is three visits from a loaf',
        body: 'Country loaf is at 7 of 10.',
        read: false,
        createdAt: iso(now, 2 * day),
        href: '/stamp/stmp_lina_loaf',
      },
    ],
    passes: [],
    pushTokens: [],
    magicCodes: {},
  };
}

function event(
  id: string,
  cardId: string,
  programId: string,
  customerId: string,
  createdAt: string,
  unlockedReward: boolean,
): StampEvent {
  const organizationId = cardId.includes('loaf') ? 'org_northline' : 'org_harbor';
  const staffId = organizationId === 'org_northline' ? 'user_elena' : 'user_omar';
  return { id, organizationId, cardId, programId, customerId, staffId, createdAt, unlockedReward };
}
