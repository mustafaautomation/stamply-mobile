import { describe, expect, it } from '@jest/globals';

import { MockRepository, type KeyValueStore } from '@/data/mockRepository';
import { readPublicEnv } from '@/data/supabaseRepository';
import { createSeed } from '@/data/seed';

function repoAt(start: Date) {
  let now = start;
  const repository = new MockRepository(createSeed(start), () => now);
  return {
    repository,
    advance(minutes: number) {
      now = new Date(now.getTime() + minutes * 60_000);
    },
  };
}

describe('mock repository', () => {
  const start = new Date('2026-11-25T20:00:00.000Z');

  it('signs demo staff in and refuses a customer stamp', async () => {
    const { repository } = repoAt(start);
    await repository.enterDemo('lina');
    const denied = await repository.addStamp('stmp_lina_espresso', '2468');
    expect(denied.ok).toBe(false);
    if (!denied.ok) expect(denied.code).toBe('NOT_STAFF');
  });

  it('stamps through a reward, then blocks the daily cap', async () => {
    const { repository, advance } = repoAt(start);
    await repository.enterDemo('omar');
    let unlocked = false;
    for (let index = 0; index < 3; index += 1) {
      const result = await repository.addStamp('stmp_lina_espresso', '2468');
      expect(result.ok).toBe(true);
      if (result.ok) unlocked = result.unlockedReward;
      advance(21);
    }
    expect(unlocked).toBe(true);
    const card = await repository.getCard('card_lina_espresso');
    expect(card.stamps).toBe(0);
    expect(card.rewardsAvailable).toBe(1);
    const capped = await repository.addStamp('stmp_lina_espresso', '2468');
    expect(capped.ok).toBe(false);
    if (!capped.ok) expect(capped.code).toBe('DAILY_CAP');
  });

  it('holds a cooldown and still redeems a waiting reward', async () => {
    const { repository } = repoAt(start);
    await repository.enterDemo('omar');
    const cooled = await repository.addStamp('stmp_jonah_espresso', '0000');
    expect(cooled.ok).toBe(false);
    if (!cooled.ok) expect(cooled.code).toBe('INVALID_PIN');
    const blocked = await repository.addStamp('stmp_jonah_espresso', '2468');
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.code).toBe('COOLDOWN');
    const redeemed = await repository.redeem('stmp_jonah_espresso', '2468');
    expect(redeemed.ok).toBe(true);
    if (redeemed.ok) expect(redeemed.card.rewardsAvailable).toBe(0);
  });

  it('stops staff from another merchant and a paused card', async () => {
    const { repository } = repoAt(start);
    await repository.enterDemo('omar');
    const other = await repository.addStamp('stmp_lina_loaf', '2468');
    expect(other.ok).toBe(false);
    if (!other.ok) expect(other.code).toBe('NOT_STAFF');
    const paused = await repository.addStamp('stmp_lina_cocoa', '2468');
    expect(paused.ok).toBe(false);
    if (!paused.ok) expect(paused.code).toBe('INACTIVE_PROGRAM');
  });

  it('creates a wallet from a magic code and lets staff enroll it', async () => {
    const { repository } = repoAt(start);
    await repository.requestMagicLink('new.guest@example.com');
    await expect(repository.verifyMagicLink('new.guest@example.com', '111111')).rejects.toThrow('not valid');
    await repository.verifyMagicLink('new.guest@example.com', '000000');
    expect(await repository.listCards()).toEqual([]);
    const token = await repository.identityToken();
    expect(token).toMatch(/^stmp_user_/);
    await repository.enterDemo('omar');
    const enrolled = await repository.enroll(token ?? '', 'prg_pastry', '2468');
    expect(enrolled.ok).toBe(true);
  });

  it('persists stamps across a reload', async () => {
    const memory = new Map<string, string>();
    const storage: KeyValueStore = {
      getItem: async (key) => memory.get(key) ?? null,
      setItem: async (key, value) => {
        memory.set(key, value);
      },
      removeItem: async (key) => {
        memory.delete(key);
      },
    };
    const first = await MockRepository.hydrate(storage, () => start);
    await first.enterDemo('omar');
    const stamped = await first.addStamp('stmp_lina_pastry', '2468');
    expect(stamped.ok).toBe(true);
    const second = await MockRepository.hydrate(storage, () => new Date(start.getTime() + 60 * 60_000));
    const session = await second.getSession();
    expect(session?.fullName).toBe('Omar Haddad');
    const card = await second.getCard('card_lina_pastry');
    expect(card.stamps).toBe(3);
  });
});

describe('public env', () => {
  it('stays in mock mode until both Supabase values are set', () => {
    expect(readPublicEnv({})).toBeNull();
    expect(readPublicEnv({ EXPO_PUBLIC_SUPABASE_URL: ' https://demo.supabase.co ', EXPO_PUBLIC_SUPABASE_ANON_KEY: 'anon-key' })).toEqual({
      url: 'https://demo.supabase.co',
      anonKey: 'anon-key',
    });
  });
});
