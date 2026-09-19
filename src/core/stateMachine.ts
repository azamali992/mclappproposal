// ─── Order state machine ─────────────────────────────────────────────────────
// Explicit, enforced transition table. Nothing in the app sets `status`
// directly — every change goes through `assertTransition`.

import type { OrderStatus, Role } from './types';

export const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PLACED: ['FILLED', 'CANCELLED'],
  FILLED: ['ASSIGNED', 'DISPATCHED', 'CANCELLED'],
  ASSIGNED: ['DISPATCHED', 'CANCELLED'],
  DISPATCHED: ['DELIVERED', 'DISPUTED'],
  DELIVERED: ['CONFIRMED', 'DISPUTED'],
  CONFIRMED: ['RECONCILED', 'MISMATCH_HELD'],
  DISPUTED: ['DELIVERED', 'CANCELLED'],
  RECONCILED: ['POSTED', 'POST_FAILED'],
  MISMATCH_HELD: ['RECONCILED', 'CANCELLED'],
  POST_FAILED: ['POSTED', 'POST_FAILED'],
  POSTED: [], // terminal
  CANCELLED: [],
};

/** Which role is permitted to drive each transition. Enforced server-side. */
export const TRANSITION_ROLES: Record<string, Role[]> = {
  'PLACED->FILLED': ['clerk'],
  'FILLED->ASSIGNED': ['clerk'],
  'FILLED->DISPATCHED': ['clerk'], // collection only — enforced in the API
  'ASSIGNED->DISPATCHED': ['clerk'],
  'DISPATCHED->DELIVERED': ['driver', 'clerk', 'gate'],
  'DELIVERED->CONFIRMED': ['driver', 'client', 'clerk', 'gate'],
  'DELIVERED->DISPUTED': ['driver', 'client'],
  'CONFIRMED->RECONCILED': ['cashier'],
  'CONFIRMED->MISMATCH_HELD': ['cashier'],
  'MISMATCH_HELD->RECONCILED': ['cashier', 'admin'],
  'RECONCILED->POSTED': ['admin'], // integration service acts as system/admin
  'RECONCILED->POST_FAILED': ['admin'],
  'POST_FAILED->POSTED': ['admin'],
};

export class TransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TransitionError';
  }
}

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return (TRANSITIONS[from] ?? []).includes(to);
}

export function assertTransition(from: OrderStatus, to: OrderStatus): void {
  if (!canTransition(from, to)) {
    throw new TransitionError(
      `Illegal transition ${from} → ${to}. Allowed from ${from}: ${
        (TRANSITIONS[from] ?? []).join(', ') || '(terminal)'
      }`,
    );
  }
}

export function assertRole(from: OrderStatus, to: OrderStatus, role: Role): void {
  const allowed = TRANSITION_ROLES[`${from}->${to}`];
  if (allowed && !allowed.includes(role) && role !== 'admin') {
    throw new TransitionError(
      `Role "${role}" may not perform ${from} → ${to}. Allowed: ${allowed.join(', ')}`,
    );
  }
}

// ─── Presentation helpers ────────────────────────────────────────────────────

export const STATUS_LABEL: Record<OrderStatus, string> = {
  PLACED: 'Placed',
  FILLED: 'Filled',
  ASSIGNED: 'Assigned',
  DISPATCHED: 'Dispatched',
  DELIVERED: 'Delivered',
  CONFIRMED: 'Confirmed',
  DISPUTED: 'Disputed',
  RECONCILED: 'Reconciled',
  MISMATCH_HELD: 'Cash held',
  POST_FAILED: 'Post failed',
  POSTED: 'Posted to Oracle',
  CANCELLED: 'Cancelled',
};

/** Semantic tone used by the Badge primitive. */
export const STATUS_TONE: Record<OrderStatus, 'neutral' | 'info' | 'warn' | 'danger' | 'success'> = {
  PLACED: 'neutral',
  FILLED: 'info',
  ASSIGNED: 'info',
  DISPATCHED: 'info',
  DELIVERED: 'warn',
  CONFIRMED: 'warn',
  DISPUTED: 'danger',
  RECONCILED: 'warn',
  MISMATCH_HELD: 'danger',
  POST_FAILED: 'danger',
  POSTED: 'success',
  CANCELLED: 'neutral',
};

/** Ordered pipeline used by progress trackers. */
export const PIPELINE: OrderStatus[] = [
  'PLACED',
  'FILLED',
  'ASSIGNED',
  'DISPATCHED',
  'DELIVERED',
  'CONFIRMED',
  'RECONCILED',
  'POSTED',
];
