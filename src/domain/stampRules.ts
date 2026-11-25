import { isStaffRole } from '@/domain/roles';
import type { FraudCode, Role } from '@/domain/types';

export interface StampDecisionInput {
  now: Date;
  lastStampAt: string | null;
  stampsToday: number;
  cooldownMinutes: number;
  maxStampsPerDay: number;
  programActive: boolean;
  role: Role | null;
  pinOk: boolean;
}

export type StampDecision =
  | { ok: true }
  | { ok: false; code: FraudCode; message: string; retryAt?: string };

export function evaluateStamp(input: StampDecisionInput): StampDecision {
  if (!isStaffRole(input.role)) {
    return {
      ok: false,
      code: 'NOT_STAFF',
      message: 'Only staff at this merchant can stamp or redeem.',
    };
  }
  if (!input.pinOk) {
    return { ok: false, code: 'INVALID_PIN', message: 'That PIN does not match.' };
  }
  if (!input.programActive) {
    return {
      ok: false,
      code: 'INACTIVE_PROGRAM',
      message: 'This card is paused by the merchant.',
    };
  }
  if (input.lastStampAt) {
    const retry = new Date(input.lastStampAt).getTime() + input.cooldownMinutes * 60_000;
    if (input.now.getTime() < retry) {
      return {
        ok: false,
        code: 'COOLDOWN',
        message: 'This card is still in its cooldown window.',
        retryAt: new Date(retry).toISOString(),
      };
    }
  }
  if (input.stampsToday >= input.maxStampsPerDay) {
    return {
      ok: false,
      code: 'DAILY_CAP',
      message: 'This card has reached its daily stamp limit.',
    };
  }
  return { ok: true };
}

export function nextPunch(stamps: number, required: number): { stamps: number; unlocked: boolean } {
  if (required < 1) return { stamps, unlocked: false };
  if (stamps + 1 >= required) return { stamps: 0, unlocked: true };
  return { stamps: stamps + 1, unlocked: false };
}

export function progressLabel(stamps: number, total: number): string {
  return `${stamps} of ${total}`;
}
