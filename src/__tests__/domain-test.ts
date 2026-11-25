import { describe, expect, it } from '@jest/globals';

import { countStampsOnLocalDay, formatWait, formatWhen, zonedDayKey } from '@/domain/time';
import { isEmail, parseCustomerCode } from '@/domain/tokens';
import { showStaffTab } from '@/domain/roles';
import { evaluateStamp, nextPunch, progressLabel } from '@/domain/stampRules';

describe('stamp rules', () => {
  const base = {
    now: new Date('2026-11-25T20:00:00.000Z'),
    lastStampAt: null,
    stampsToday: 0,
    cooldownMinutes: 20,
    maxStampsPerDay: 4,
    programActive: true,
    role: 'staff' as const,
    pinOk: true,
  };

  it('rejects customers before it checks the PIN', () => {
    const decision = evaluateStamp({ ...base, role: 'customer', pinOk: false });
    expect(decision.ok).toBe(false);
    if (!decision.ok) expect(decision.code).toBe('NOT_STAFF');
  });

  it('rejects a bad PIN for staff', () => {
    const decision = evaluateStamp({ ...base, pinOk: false });
    expect(decision.ok).toBe(false);
    if (!decision.ok) expect(decision.code).toBe('INVALID_PIN');
  });

  it('blocks a paused program after the PIN matches', () => {
    const decision = evaluateStamp({ ...base, programActive: false });
    expect(decision.ok).toBe(false);
    if (!decision.ok) expect(decision.code).toBe('INACTIVE_PROGRAM');
  });

  it('enforces cooldown and names the retry time', () => {
    const last = new Date('2026-11-25T19:50:00.000Z').toISOString();
    const decision = evaluateStamp({ ...base, lastStampAt: last });
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.code).toBe('COOLDOWN');
      expect(decision.retryAt).toBe(new Date('2026-11-25T20:10:00.000Z').toISOString());
    }
  });

  it('enforces the daily cap', () => {
    const decision = evaluateStamp({ ...base, stampsToday: 4 });
    expect(decision.ok).toBe(false);
    if (!decision.ok) expect(decision.code).toBe('DAILY_CAP');
  });

  it('allows a stamp when the window is clear', () => {
    expect(evaluateStamp(base)).toEqual({ ok: true });
  });

  it('resets the card when the last punch earns a reward', () => {
    expect(nextPunch(7, 8)).toEqual({ stamps: 0, unlocked: true });
    expect(nextPunch(2, 8)).toEqual({ stamps: 3, unlocked: false });
    expect(progressLabel(5, 8)).toBe('5 of 8');
  });
});

describe('local days', () => {
  it('counts stamps on the merchant local day, not UTC', () => {
    const now = new Date('2026-11-25T07:30:00.000Z');
    expect(zonedDayKey(now, 'America/Los_Angeles')).toBe('2026-11-24');
    const times = ['2026-11-25T07:30:00.000Z', '2026-11-25T18:00:00.000Z'];
    expect(countStampsOnLocalDay(times, new Date('2026-11-25T20:00:00.000Z'), 'America/Los_Angeles')).toBe(1);
  });

  it('formats recent times', () => {
    const now = new Date('2026-11-25T20:00:00.000Z');
    expect(formatWhen(new Date(now.getTime() - 5 * 60_000).toISOString(), now)).toBe('5 min ago');
    expect(formatWhen(new Date(now.getTime() - 26 * 60 * 60_000).toISOString(), now)).toBe('Yesterday');
    expect(formatWait(new Date(now.getTime() + 90_000).toISOString(), now)).toBe('2 minutes');
  });
});

describe('codes', () => {
  it('parses raw tokens, app links, and https links', () => {
    expect(parseCustomerCode('stmp_lina_espresso')).toBe('stmp_lina_espresso');
    expect(parseCustomerCode('https://stamply-app.quvantic.com/c/stmp_lina_espresso')).toBe('stmp_lina_espresso');
    expect(parseCustomerCode('stamply://c/stmp_user_lina')).toBe('stmp_user_lina');
    expect(parseCustomerCode('not a code')).toBeNull();
    expect(isEmail('lina@demo.stamply.app')).toBe(true);
    expect(isEmail('lina')).toBe(false);
  });

  it('shows the counter only to staff seats', () => {
    expect(showStaffTab([{ role: 'customer' }])).toBe(false);
    expect(showStaffTab([{ role: 'customer' }, { role: 'staff' }])).toBe(true);
    expect(showStaffTab([{ role: 'owner' }])).toBe(true);
  });
});
