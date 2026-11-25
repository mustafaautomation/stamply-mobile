import type { MembershipView, Role } from '@/domain/types';

export function isStaffRole(role: Role | null | undefined): boolean {
  return role === 'owner' || role === 'admin' || role === 'staff';
}

export function showStaffTab(memberships: Pick<MembershipView, 'role'>[]): boolean {
  return memberships.some((membership) => isStaffRole(membership.role));
}

export function staffMemberships<T extends Pick<MembershipView, 'role'>>(memberships: T[]): T[] {
  return memberships.filter((membership) => isStaffRole(membership.role));
}

export function roleLabel(role: Role): string {
  switch (role) {
    case 'owner':
      return 'Owner';
    case 'admin':
      return 'Admin';
    case 'staff':
      return 'Staff';
    case 'customer':
      return 'Customer';
  }
}

export function planLabel(plan: 'trial' | 'counter' | 'house'): string {
  switch (plan) {
    case 'trial':
      return 'Trial';
    case 'counter':
      return 'Counter';
    case 'house':
      return 'House';
  }
}
