// ─── The store ───────────────────────────────────────────────────────────────
// This module stands in for the whole backend: persistence, RBAC, the order
// state machine, ECR allocation, the offline sync endpoint and the Oracle
// integration service. Every rule in §14 of the build plan is enforced HERE,
// never in a screen. UI code calls `api.*` and reads state through `useStore`.
//
// When this becomes a real service, each `api.*` function maps 1:1 onto the
// REST route named in its comment. The screens should not need to change.

import { useSyncExternalStore } from 'react';
import type {
  AppUser, AuditEntry, CashReconciliation, Client, ConfirmationEvent, DeliveryEvent,
  ErpPostLog, Order, OrderLine, OrderStatus, OtpChallenge, Product, QueuedAction, Role,
} from './types';
import { allocateEcr, financialYear, type EcrSequenceTable } from './ecr';
import { assertRole, assertTransition } from './stateMachine';
import * as seed from './seed';

// ─── Errors ──────────────────────────────────────────────────────────────────

export class RuleError extends Error {
  /** Which invariant was violated — shown in the demo's rule-trace panel. */
  rule: string;
  constructor(rule: string, message: string) {
    super(message);
    this.name = 'RuleError';
    this.rule = rule;
  }
}

// ─── State ───────────────────────────────────────────────────────────────────

export interface State {
  users: AppUser[];
  clients: Client[];
  products: typeof seed.products;
  locations: typeof seed.locations;
  bookTypes: typeof seed.bookTypes;
  vehicles: typeof seed.vehicles;
  vehicleClasses: typeof seed.vehicleClasses;
  routes: typeof seed.routes;
  routeStops: typeof seed.routeStops;
  serviceCharges: typeof seed.serviceCharges;
  tabDevices: typeof seed.tabDevices;

  orders: Order[];
  deliveryEvents: DeliveryEvent[];
  confirmationEvents: ConfirmationEvent[];
  reconciliations: CashReconciliation[];
  erpPostLogs: ErpPostLog[];
  audit: AuditEntry[];
  otpChallenges: OtpChallenge[];

  ecrSequences: EcrSequenceTable;
  nextIds: typeof seed.nextIds;

  /** Who is acting. Switching this is the demo's role switcher. */
  currentUserId: number;

  /** Driver tab simulation. */
  online: boolean;
  queue: QueuedAction[];
  syncing: boolean;

  /** Integration service simulation. */
  oracleUp: boolean;
  postingOrderIds: number[];
}

function initialState(): State {
  return {
    users: clone(seed.users),
    clients: clone(seed.clients),
    products: clone(seed.products),
    locations: clone(seed.locations),
    bookTypes: clone(seed.bookTypes),
    vehicles: clone(seed.vehicles),
    vehicleClasses: clone(seed.vehicleClasses),
    routes: clone(seed.routes),
    routeStops: clone(seed.routeStops),
    serviceCharges: clone(seed.serviceCharges),
    tabDevices: clone(seed.tabDevices),

    orders: clone(seed.orders),
    deliveryEvents: clone(seed.deliveryEvents),
    confirmationEvents: clone(seed.confirmationEvents),
    reconciliations: clone(seed.cashReconciliations),
    erpPostLogs: clone(seed.erpPostLogs),
    audit: [],
    otpChallenges: [],

    ecrSequences: { ...seed.ecrSequences },
    nextIds: { ...seed.nextIds },

    currentUserId: 3, // open on the warehouse clerk — the busiest screen
    online: true,
    queue: [],
    syncing: false,
    oracleUp: true,
    postingOrderIds: [],
  };
}

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

// ─── Subscription plumbing ───────────────────────────────────────────────────

let state: State = initialState();
const listeners = new Set<() => void>();

/**
 * Bumped by every mutation. This, not the shape of the data, is what components
 * subscribe to — see `useStore`.
 */
let version = 0;

function emit() {
  version++;
  state = { ...state };
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function getState(): State {
  return state;
}

/**
 * Read state in a component. Pass any selector — the shape does not matter.
 *
 * Components subscribe to the mutation counter, not to the selected value, and
 * the selector runs during render. That sidesteps both traps in a store that
 * mutates records in place:
 *
 *  - A selector returning a fresh array each call (`select.ordersForClient`)
 *    would spin forever if the snapshot itself were the subscription value,
 *    because `useSyncExternalStore` reads it more than once per render.
 *  - A selector returning a stable reference (`s => s.orders`) would never
 *    re-render after a fill or a dispatch, because those mutate the order
 *    objects in place and leave the array identity untouched.
 *
 * A counter is immune to both: every mutation bumps it, so every subscriber
 * re-renders and recomputes. At this data volume the cost is irrelevant, and
 * correctness here is worth far more than a narrowed render.
 */
export function useStore<T>(selector: (s: State) => T): T {
  useSyncExternalStore(subscribe, () => version, () => version);
  return selector(state);
}

export function useCurrentUser(): AppUser {
  return useStore((s) => s.users.find((u) => u.id === s.currentUserId)!);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const now = () => new Date().toISOString();

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function actor(): AppUser {
  return state.users.find((u) => u.id === state.currentUserId)!;
}

function requireRole(...roles: Role[]): AppUser {
  const u = actor();
  if (!roles.includes(u.role) && u.role !== 'admin') {
    throw new RuleError(
      'RBAC',
      `${u.name} is ${u.role} — this action requires ${roles.join(' or ')}.`,
    );
  }
  return u;
}

function findOrder(id: number): Order {
  const o = state.orders.find((x) => x.id === id);
  if (!o) throw new RuleError('NOT_FOUND', `Order ${id} not found.`);
  return o;
}

function log(entry: Omit<AuditEntry, 'id' | 'at' | 'actorId' | 'actorName' | 'actorRole'>) {
  const u = actor();
  state.audit.unshift({
    id: state.nextIds.audit++,
    at: now(),
    actorId: u.id,
    actorName: u.name,
    actorRole: u.role,
    ...entry,
  });
}

/**
 * True while the integration service is acting. The service is a system actor,
 * not the user who happened to trigger it — a cashier confirming cash causes
 * the Oracle post, but it is the service that performs RECONCILED → POSTED.
 * The state machine still applies; only the role check is bypassed.
 */
let systemContext = false;

async function asSystem<T>(fn: () => Promise<T>): Promise<T> {
  systemContext = true;
  try {
    return await fn();
  } finally {
    systemContext = false;
  }
}

/**
 * Guard a transition without performing it. Call this before any work that must
 * not happen if the transition will be rejected — allocating an ECR, for one.
 */
function guardTransition(from: OrderStatus, to: OrderStatus) {
  try {
    assertTransition(from, to);
    if (!systemContext) assertRole(from, to, actor().role);
  } catch (e) {
    // Surface as a RuleError so every screen's single catch handles it.
    throw new RuleError('STATE_MACHINE', (e as Error).message);
  }
}

/** The only place an order's status changes. Validates transition + role. */
function transition(order: Order, to: OrderStatus, detail: string) {
  const from = order.status;
  guardTransition(from, to);
  order.status = to;
  log({ orderId: order.id, ecr: order.ecr, action: `${from} → ${to}`, detail, from, to });
}

/** The rate that applies to a product under a given fulfilment mode. */
export function rateFor(product: Product, fulfilment: 'delivery' | 'collection'): number {
  return fulfilment === 'collection' ? product.collectionPrice : product.unitPrice;
}

/** Cylinder management work billed on an order. */
export function serviceChargeTotal(order: Order): number {
  return (order.serviceCharges ?? []).reduce((t, c) => t + c.qty * c.unitAmount, 0);
}

export function orderValue(order: Order, opts: { delivered?: boolean } = {}): number {
  return order.lines.reduce((sum, l) => {
    const qty = opts.delivered ? (l.qtyDelivered ?? 0) : (l.qtyLoaded ?? l.qtyOrdered);
    return sum + qty * l.unitPrice;
  }, serviceChargeTotal(order));
}

export function orderCylinders(order: Order, field: keyof OrderLine = 'qtyOrdered'): number {
  return order.lines.reduce((s, l) => s + (Number(l[field]) || 0), 0);
}

/**
 * Cash the counter should take for a collection that has not happened yet.
 *
 * `expectedCash` reads `qtyDelivered`, which is zero until the handover is
 * recorded — so it cannot quote a collection in advance. This quotes from what
 * is about to be handed over, plus any service work already on the bill.
 */
export function quoteCash(
  order: Order,
  handingOver?: { lineId: number; qtyDelivered: number }[],
): number {
  const client = state.clients.find((c) => c.id === order.clientId);
  if (client?.paymentTerms === 'credit') return 0;
  const goods = order.lines.reduce((sum, l) => {
    const qty = handingOver?.find((x) => x.lineId === l.id)?.qtyDelivered ?? l.qtyLoaded ?? l.qtyOrdered;
    return sum + qty * l.unitPrice;
  }, 0);
  return goods + serviceChargeTotal(order);
}

/** Cash a cash-terms order is expected to yield once delivered. */
export function expectedCash(order: Order): number {
  const client = state.clients.find((c) => c.id === order.clientId);
  if (client?.paymentTerms === 'credit') return 0;
  return orderValue(order, { delivered: true });
}

// ─── Selectors ───────────────────────────────────────────────────────────────

export const select = {
  client: (s: State, id: number) => s.clients.find((c) => c.id === id),
  clientName: (s: State, id: number) => s.clients.find((c) => c.id === id)?.name ?? `Client ${id}`,
  product: (s: State, id: number) => s.products.find((p) => p.id === id),
  route: (s: State, id?: number) => s.routes.find((r) => r.id === id),
  vehicle: (s: State, id?: number) => s.vehicles.find((v) => v.id === id),
  vehicleClass: (s: State, vehicleId?: number) => {
    const v = s.vehicles.find((x) => x.id === vehicleId);
    return v && s.vehicleClasses.find((c) => c.id === v.classId);
  },
  user: (s: State, id?: number) => s.users.find((u) => u.id === id),
  location: (s: State, id: number) => s.locations.find((l) => l.id === id),
  bookType: (s: State, id: number) => s.bookTypes.find((b) => b.id === id),
  serviceCharge: (s: State, id: number) => s.serviceCharges.find((c) => c.id === id),
  /** Released, ECR issued, waiting for the client's van to turn up. */
  awaitingCollection: (s: State, locationId?: number) =>
    s.orders.filter(
      (o) =>
        o.fulfilment === 'collection' &&
        o.status === 'DISPATCHED' &&
        (locationId == null || o.locationId === locationId),
    ),

  /** Orders waiting for the client to come and collect them. */
  collectionQueue: (s: State, locationId?: number) =>
    s.orders.filter(
      (o) =>
        o.fulfilment === 'collection' &&
        ['PLACED', 'FILLED', 'DISPATCHED'].includes(o.status) &&
        (locationId == null || o.locationId === locationId),
    ),
  order: (s: State, id: number) => s.orders.find((o) => o.id === id),

  /** Clerk queue: everything not yet dispatched at a location. */
  clerkQueue: (s: State, locationId?: number) =>
    s.orders.filter(
      (o) =>
        ['PLACED', 'FILLED', 'ASSIGNED'].includes(o.status) &&
        (locationId == null || o.locationId === locationId),
    ),

  /** Orders a driver is carrying right now, in route-stop order. */
  driverManifest: (s: State, driverId: number) => {
    const live = s.orders.filter(
      (o) => o.driverId === driverId && ['DISPATCHED', 'DELIVERED', 'DISPUTED'].includes(o.status),
    );
    const seq = (o: Order) =>
      s.routeStops.find((rs) => rs.routeId === o.routeId && rs.clientId === o.clientId)?.sequenceNo ?? 99;
    return live.sort((a, b) => seq(a) - seq(b));
  },

  /** Routes with confirmed deliveries whose cash has not yet been reconciled. */
  pendingReconciliation: (s: State) => {
    const confirmed = s.orders.filter((o) => o.status === 'CONFIRMED');
    const groups = new Map<string, { routeId: number; vehicleId: number; driverId: number; orders: Order[] }>();
    for (const o of confirmed) {
      if (o.routeId == null || o.vehicleId == null || o.driverId == null) continue;
      const k = `${o.routeId}|${o.vehicleId}|${o.driverId}`;
      if (!groups.has(k)) groups.set(k, { routeId: o.routeId, vehicleId: o.vehicleId, driverId: o.driverId, orders: [] });
      groups.get(k)!.orders.push(o);
    }
    return [...groups.values()];
  },

  ordersForClient: (s: State, clientId: number) =>
    s.orders.filter((o) => o.clientId === clientId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),

  failedPosts: (s: State) => s.erpPostLogs.filter((l) => l.status === 'failed'),

  auditForOrder: (s: State, orderId: number) => s.audit.filter((a) => a.orderId === orderId),

  /** Live ECR counter for a (year, location, book) — shown on the dispatch screen. */
  nextEcrPreview: (s: State, locationId: number, bookTypeId: number) => {
    const loc = s.locations.find((l) => l.id === locationId);
    const book = s.bookTypes.find((b) => b.id === bookTypeId);
    if (!loc || !book) return null;
    const yy = financialYear();
    const k = `${yy}|${loc.code}|${book.code}`;
    const next = s.ecrSequences[k] ?? 1;
    return `${yy}${loc.code}${book.code}${String(next).padStart(4, '0')}`;
  },
};

// ─── The Oracle integration service (simulated) ──────────────────────────────
// Only this code path talks to "Oracle". It is reached only from
// `confirmReconciliation`. Idempotent on the ECR, logs every attempt, and
// distinguishes retryable from terminal errors.

function buildOraclePayload(order: Order) {
  const s = state;
  const client = s.clients.find((c) => c.id === order.clientId)!;
  const delivery = s.deliveryEvents.find((d) => d.orderId === order.id);
  const confirmation = s.confirmationEvents.find((c) => c.orderId === order.id);
  return {
    ecr: order.ecr,
    idempotency_key: order.ecr,
    customer_code: client.oracleCustomerCode,
    location_code: s.locations.find((l) => l.id === order.locationId)!.code,
    doc_date: order.deliveredAt ?? order.dispatchedAt,
    payment_terms: client.paymentTerms,
    lines: order.lines.map((l) => {
      const p = s.products.find((x) => x.id === l.productId)!;
      return {
        item_code: p.oracleItemCode,
        qty_delivered: l.qtyDelivered ?? 0,
        empties_returned: l.qtyReturned ?? 0,
        unit_price: l.unitPrice,
        reason_code: l.reasonCode ?? null,
      };
    }),
    fulfilment: order.fulfilment,
    collected_by: order.fulfilment === 'collection' ? (order.collectedBy ?? null) : null,
    rate_card: order.fulfilment === 'collection' ? 'EX_DELIVERY' : 'DELIVERED',
    service_charges: (order.serviceCharges ?? []).map((c) => {
      const def = s.serviceCharges.find((x) => x.id === c.chargeId);
      return {
        item_code: def?.oracleItemCode ?? null,
        code: def?.code ?? null,
        description: def?.name ?? null,
        qty: c.qty,
        unit_amount: c.unitAmount,
        amount: c.qty * c.unitAmount,
        note: c.note ?? null,
      };
    }),
    cash_receipt:
      client.paymentTerms === 'cash'
        ? { amount: delivery?.cashCollected ?? 0, currency: 'PKR' }
        : null,
    confirmation: { method: confirmation?.method, ref: confirmation?.receiptRef },
  };
}

async function postToOracle(orderId: number): Promise<void> {
  return asSystem(() => postToOracleInner(orderId));
}

async function postToOracleInner(orderId: number): Promise<void> {
  const order = findOrder(orderId);
  if (!order.ecr) throw new RuleError('ECR_REQUIRED', 'Cannot post an order with no ECR.');

  // Idempotency: if this ECR already succeeded, return the existing doc number.
  const existing = state.erpPostLogs.find((l) => l.ecr === order.ecr && l.status === 'success');
  if (existing) {
    order.oracleDocNo = existing.oracleDocNo;
    if (order.status !== 'POSTED') transition(order, 'POSTED', `Already posted as ${existing.oracleDocNo} — idempotent no-op.`);
    emit();
    return;
  }

  const attemptNo = state.erpPostLogs.filter((l) => l.orderId === orderId).length + 1;
  const payload = buildOraclePayload(order);

  state.postingOrderIds = [...state.postingOrderIds, orderId];
  const pendingLog: ErpPostLog = {
    id: state.nextIds.erpLog++,
    orderId,
    ecr: order.ecr,
    attemptNo,
    requestPayload: payload,
    status: 'pending',
    createdAt: now(),
  };
  state.erpPostLogs = [pendingLog, ...state.erpPostLogs];
  emit();

  await sleep(1400);

  const up = state.oracleUp;
  const entry = state.erpPostLogs.find((l) => l.id === pendingLog.id)!;

  if (up) {
    const docNo = `SO-${new Date().getFullYear()}-${String(4470 + orderId).padStart(6, '0')}`;
    entry.status = 'success';
    entry.httpStatus = 201;
    entry.oracleDocNo = docNo;
    entry.responseBody = { status: 'OK', doc_no: docNo, gl_batch: `GL-${88000 + orderId}` };
    order.oracleDocNo = docNo;
    order.postedAt = now();
    if (order.status === 'POST_FAILED') {
      order.status = 'POSTED';
      log({ orderId, ecr: order.ecr, action: 'POST_FAILED → POSTED', detail: `Retry succeeded. Oracle doc ${docNo}.`, from: 'POST_FAILED', to: 'POSTED' });
    } else {
      transition(order, 'POSTED', `Posted to Oracle as ${docNo}.`);
    }
  } else {
    entry.status = 'failed';
    entry.httpStatus = 503;
    entry.errorClass = 'retryable';
    entry.responseBody = { error: 'ORDS endpoint unreachable — connection timed out', error_class: 'retryable' };
    if (order.status === 'RECONCILED') {
      transition(order, 'POST_FAILED', 'Oracle unreachable. Queued for retry.');
    } else {
      log({ orderId, ecr: order.ecr, action: 'POST retry failed', detail: 'Oracle still unreachable.' });
    }
  }

  state.postingOrderIds = state.postingOrderIds.filter((id) => id !== orderId);
  emit();
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ─── API ─────────────────────────────────────────────────────────────────────
// Each function corresponds to a REST route in §10 of the build plan.

export const api = {
  // ── Session ──────────────────────────────────────────────────────────────
  /** Demo role switcher — stands in for POST /auth/login. */
  switchUser(userId: number) {
    state.currentUserId = userId;
    emit();
  },

  reset() {
    state = initialState();
    emit();
  },

  // ── Orders ───────────────────────────────────────────────────────────────
  /** POST /orders — Path A (client) and Path B (sales) share this route. */
  placeOrder(input: {
    clientId: number;
    locationId: number;
    bookTypeId: number;
    requestedDate: string;
    notes?: string;
    /** Defaults to a delivery. 'collection' prices off the ex-delivery card. */
    fulfilment?: 'delivery' | 'collection';
    lines: { productId: number; qtyOrdered: number }[];
  }): Order {
    const u = requireRole('client', 'sales');
    if (u.role === 'client' && u.clientId !== input.clientId) {
      throw new RuleError('RBAC', 'A client may only place orders for themselves.');
    }
    if (!input.lines.length) throw new RuleError('VALIDATION', 'An order needs at least one line.');
    if (input.lines.some((l) => l.qtyOrdered <= 0)) {
      throw new RuleError('VALIDATION', 'Every line needs a quantity above zero.');
    }

    const id = state.nextIds.order++;
    const order: Order = {
      id,
      ecr: null, // no ECR until dispatch — an abandoned order must not burn a number
      status: 'PLACED',
      origin: u.role === 'client' ? 'client_app' : 'sales',
      fulfilment: input.fulfilment ?? 'delivery',
      clientId: input.clientId,
      locationId: input.locationId,
      bookTypeId: input.bookTypeId,
      requestedDate: input.requestedDate,
      createdBy: u.id,
      createdAt: now(),
      notes: input.notes,
      lines: input.lines.map((l) => ({
        id: state.nextIds.line++,
        orderId: id,
        productId: l.productId,
        qtyOrdered: l.qtyOrdered,
        // The rate card is chosen once, at order time, and snapshotted on the
        // line — so a later switch between delivery and collection cannot
        // silently restate a bill that has already been quoted.
        unitPrice: rateFor(
          state.products.find((p) => p.id === l.productId)!,
          input.fulfilment ?? 'delivery',
        ),
      })),
      serviceCharges: [],
    };
    state.orders = [order, ...state.orders];
    log({
      orderId: id,
      ecr: null,
      action: 'Order placed',
      detail: `${order.origin === 'client_app' ? 'Client app' : 'Sales desk'} — ${order.lines.length} line(s), ${orderCylinders(order)} cylinders.`,
      to: 'PLACED',
    });
    emit();
    return order;
  },

  /** POST /orders/:id/fill */
  fillOrder(orderId: number, loaded?: { lineId: number; qtyLoaded: number }[]) {
    requireRole('clerk');
    const o = findOrder(orderId);
    for (const l of o.lines) {
      const hit = loaded?.find((x) => x.lineId === l.id);
      l.qtyLoaded = hit ? hit.qtyLoaded : l.qtyOrdered;
    }
    o.filledAt = now();
    transition(o, 'FILLED', `Filling complete — ${orderCylinders(o, 'qtyLoaded')} cylinders staged.`);
    emit();
  },

  /** POST /orders/:id/assign — validates load against vehicle class capacity. */
  assignOrder(orderId: number, input: { vehicleId: number; routeId: number; driverId: number; lines?: { lineId: number; qtyLoaded: number }[] }) {
    requireRole('clerk');
    const o = findOrder(orderId);
    if (o.fulfilment === 'collection') {
      throw new RuleError('FULFILMENT', 'This order is collected by the client — release it at the counter instead of assigning a vehicle.');
    }

    if (input.lines) {
      for (const upd of input.lines) {
        const line = o.lines.find((l) => l.id === upd.lineId);
        if (line) line.qtyLoaded = upd.qtyLoaded;
      }
    }

    const vehicle = state.vehicles.find((v) => v.id === input.vehicleId);
    if (!vehicle) throw new RuleError('VALIDATION', 'Unknown vehicle.');
    const vclass = state.vehicleClasses.find((c) => c.id === vehicle.classId)!;

    // Capacity check counts everything already assigned to this vehicle today.
    const alreadyOn = state.orders
      .filter((x) => x.id !== o.id && x.vehicleId === input.vehicleId && ['ASSIGNED', 'DISPATCHED'].includes(x.status))
      .reduce((s, x) => s + orderCylinders(x, 'qtyLoaded'), 0);
    const thisLoad = orderCylinders(o, 'qtyLoaded');
    if (alreadyOn + thisLoad > vclass.maxCylinders) {
      throw new RuleError(
        'CAPACITY',
        `${vehicle.registration} (${vclass.name}) holds ${vclass.maxCylinders}. Already loaded ${alreadyOn}, this order adds ${thisLoad}.`,
      );
    }

    const driver = state.users.find((u) => u.id === input.driverId);
    if (!driver || driver.role !== 'driver') throw new RuleError('VALIDATION', 'Assigned user is not a driver.');

    o.vehicleId = input.vehicleId;
    o.routeId = input.routeId;
    o.driverId = input.driverId;
    o.assignedAt = now();
    const route = state.routes.find((r) => r.id === input.routeId)!;
    transition(o, 'ASSIGNED', `${vehicle.registration} on ${route.code}, driver ${driver.name}. Load ${thisLoad}/${vclass.maxCylinders}.`);
    emit();
  },

  /**
   * POST /orders/:id/dispatch — allocates the ECR.
   * Allocation and persistence happen in this one synchronous mutation, so two
   * dispatches can never observe the same counter value.
   */
  dispatchOrder(orderId: number): string {
    const u = requireRole('clerk');
    const o = findOrder(orderId);
    if (o.ecr) throw new RuleError('ECR_IMMUTABLE', `Order already carries ECR ${o.ecr}. An ECR is never reissued.`);

    // Validate the transition BEFORE allocating. A rejected dispatch must never
    // burn a sequence number — that is the whole point of allocating at dispatch
    // rather than at order entry.
    guardTransition(o.status, 'DISPATCHED');

    const loc = state.locations.find((l) => l.id === o.locationId)!;
    const book = state.bookTypes.find((b) => b.id === o.bookTypeId)!;
    const ecr = allocateEcr(state.ecrSequences, {
      yy: financialYear(),
      locationCode: loc.code,
      bookCode: book.code,
    });

    o.ecr = ecr;
    o.dispatchedAt = now();
    o.dispatchedBy = u.id;
    transition(o, 'DISPATCHED', `ECR ${ecr} allocated (${loc.name} / ${book.name}).`);
    emit();
    return ecr;
  },

  // ── Self-collection ──────────────────────────────────────────────────────
  /**
   * POST /orders/:id/release — the collection equivalent of dispatch.
   *
   * The client's own vehicle is at the gate, so there is no route, no vehicle
   * and no driver. The ECR is still allocated here, for the same reason it is
   * allocated at dispatch: the number is burned when the goods actually leave.
   */
  releaseForCollection(orderId: number): string {
    const u = requireRole('clerk');
    const o = findOrder(orderId);
    if (o.fulfilment !== 'collection') {
      throw new RuleError('FULFILMENT', 'This is a delivery order — assign a vehicle and dispatch it instead.');
    }
    if (o.ecr) throw new RuleError('ECR_IMMUTABLE', `Order already carries ECR ${o.ecr}. An ECR is never reissued.`);

    guardTransition(o.status, 'DISPATCHED');

    const loc = state.locations.find((l) => l.id === o.locationId)!;
    const book = state.bookTypes.find((b) => b.id === o.bookTypeId)!;
    const ecr = allocateEcr(state.ecrSequences, {
      yy: financialYear(),
      locationCode: loc.code,
      bookCode: book.code,
    });

    o.ecr = ecr;
    o.dispatchedAt = now();
    o.dispatchedBy = u.id;
    transition(o, 'DISPATCHED', `Released for collection. ECR ${ecr} allocated (${loc.name} / ${book.name}).`);
    emit();
    return ecr;
  },

  /**
   * POST /orders/:id/collect — handover over the counter.
   *
   * Recorded by the clerk or the gate, not a driver. There is no offline queue
   * here: a collection happens at the plant, on the network.
   */
  recordCollection(input: {
    orderId: number;
    collectedBy: string;
    cashCollected: number;
    lines?: { lineId: number; qtyDelivered: number; qtyReturned: number; reasonCode?: string }[];
  }) {
    const u = requireRole('clerk', 'gate');
    const o = findOrder(input.orderId);
    if (o.fulfilment !== 'collection') {
      throw new RuleError('FULFILMENT', 'This order is going out on a vehicle — the driver records it.');
    }
    if (!input.collectedBy.trim()) {
      throw new RuleError('VALIDATION', 'Record who collected the cylinders — it is the counter’s audit trail.');
    }

    for (const l of o.lines) {
      const upd = input.lines?.find((x) => x.lineId === l.id);
      if (upd) {
        l.qtyDelivered = upd.qtyDelivered;
        l.qtyReturned = upd.qtyReturned;
        l.reasonCode = upd.reasonCode;
      } else {
        l.qtyDelivered = l.qtyLoaded ?? l.qtyOrdered;
        l.qtyReturned = 0;
      }
    }

    state.deliveryEvents = [
      {
        id: state.nextIds.delivery++,
        orderId: o.id,
        driverId: u.id, // the counter staffer who handed over
        cylindersDelivered: orderCylinders(o, 'qtyDelivered'),
        emptiesCollected: orderCylinders(o, 'qtyReturned'),
        cashCollected: input.cashCollected,
        clientRef: uuid(),
        occurredAt: now(),
        recordedAt: now(),
      },
      ...state.deliveryEvents,
    ];

    o.collectedBy = input.collectedBy.trim();
    o.collectedAt = now();
    o.deliveredAt = o.collectedAt;
    o.deliveredBy = u.id;
    transition(o, 'DELIVERED', `Collected at the counter by ${o.collectedBy}. Rs ${input.cashCollected.toLocaleString()} taken.`);
    emit();
  },

  // ── Cylinder management charges ──────────────────────────────────────────
  /**
   * POST /orders/:id/service-charges — fixed-price work from Oracle's service
   * item master. The rate is snapshotted on the order so a later rate change
   * cannot restate a bill that has already gone out.
   */
  addServiceCharge(orderId: number, chargeId: number, qty = 1, note?: string) {
    requireRole('clerk');
    const o = findOrder(orderId);
    if (['POSTED', 'CANCELLED'].includes(o.status)) {
      throw new RuleError('STATE_MACHINE', `Order is ${o.status}. Charges cannot be added to a closed bill.`);
    }
    const charge = state.serviceCharges.find((c) => c.id === chargeId);
    if (!charge) throw new RuleError('NOT_FOUND', 'Unknown service charge.');
    if (qty <= 0) throw new RuleError('VALIDATION', 'Quantity must be above zero.');

    o.serviceCharges = [
      ...(o.serviceCharges ?? []),
      { id: state.nextIds.serviceCharge++, orderId: o.id, chargeId, qty, unitAmount: charge.amount, note },
    ];
    log({
      orderId: o.id,
      ecr: o.ecr,
      action: 'Service charge added',
      detail: `${charge.name} x${qty} — Rs ${(charge.amount * qty).toLocaleString()} (${charge.oracleItemCode}).`,
    });
    emit();
  },

  removeServiceCharge(orderId: number, serviceChargeId: number) {
    requireRole('clerk');
    const o = findOrder(orderId);
    if (['POSTED', 'CANCELLED'].includes(o.status)) {
      throw new RuleError('STATE_MACHINE', `Order is ${o.status}. Its bill is closed.`);
    }
    const row = (o.serviceCharges ?? []).find((c) => c.id === serviceChargeId);
    if (!row) throw new RuleError('NOT_FOUND', 'Charge not on this order.');
    const charge = state.serviceCharges.find((c) => c.id === row.chargeId);
    o.serviceCharges = o.serviceCharges.filter((c) => c.id !== serviceChargeId);
    log({ orderId: o.id, ecr: o.ecr, action: 'Service charge removed', detail: `${charge?.name ?? 'Charge'} x${row.qty}.` });
    emit();
  },

  cancelOrder(orderId: number, reason: string) {
    requireRole('clerk', 'sales', 'admin');
    const o = findOrder(orderId);
    transition(o, 'CANCELLED', reason || 'Cancelled.');
    emit();
  },

  // ── Tab check-out ────────────────────────────────────────────────────────
  checkOutTab(deviceId: number, driverId: number) {
    requireRole('gate', 'driver');
    const d = state.tabDevices.find((t) => t.id === deviceId);
    if (!d) throw new RuleError('NOT_FOUND', 'Unknown tab.');
    if (!d.active) throw new RuleError('VALIDATION', `${d.label} is out of service.`);
    if (d.checkedOutBy && d.checkedOutBy !== driverId) {
      throw new RuleError('VALIDATION', `${d.label} is already checked out.`);
    }
    d.checkedOutBy = driverId;
    d.checkedOutAt = now();
    log({ action: 'Tab checked out', detail: `${d.label} → ${state.users.find((u) => u.id === driverId)?.name}.` });
    emit();
  },

  checkInTab(deviceId: number) {
    requireRole('gate', 'driver');
    const d = state.tabDevices.find((t) => t.id === deviceId)!;
    d.checkedOutBy = undefined;
    d.checkedOutAt = undefined;
    log({ action: 'Tab checked in', detail: `${d.label} returned to the gate.` });
    emit();
  },

  // ── Driver: offline-first delivery capture ───────────────────────────────
  setOnline(online: boolean) {
    state.online = online;
    emit();
    if (online) void api.syncNow();
  },

  /**
   * POST /deliveries — writes locally first and returns immediately.
   * Never blocks the UI on the network. The clientRef is generated here, on the
   * device, and is what makes replay idempotent.
   */
  recordDelivery(input: {
    orderId: number;
    cylindersDelivered: number;
    emptiesCollected: number;
    cashCollected: number;
    gpsLat?: number;
    gpsLng?: number;
    lines?: { lineId: number; qtyDelivered: number; qtyReturned: number; reasonCode?: string }[];
  }): string {
    const u = requireRole('driver');
    const o = findOrder(input.orderId);
    if (o.fulfilment === 'collection') {
      throw new RuleError('FULFILMENT', 'This order is collected by the client at the plant — it is not on any manifest.');
    }
    if (o.driverId !== u.id) throw new RuleError('RBAC', 'This order is not on your manifest.');

    const clientRef = uuid();
    const action: QueuedAction = {
      clientRef,
      kind: 'delivery',
      orderId: input.orderId,
      payload: { ...input, driverId: u.id },
      occurredAt: now(),
      state: 'pending',
      attempts: 0,
    };
    state.queue = [...state.queue, action];

    // Optimistic local write — the driver sees the result instantly.
    for (const l of o.lines) {
      const upd = input.lines?.find((x) => x.lineId === l.id);
      if (upd) {
        l.qtyDelivered = upd.qtyDelivered;
        l.qtyReturned = upd.qtyReturned;
        l.reasonCode = upd.reasonCode;
      } else {
        l.qtyDelivered = l.qtyLoaded ?? l.qtyOrdered;
        l.qtyReturned = 0;
      }
    }
    o.deliveredAt = action.occurredAt;
    o.deliveredBy = u.id;
    transition(o, 'DELIVERED', `${input.cylindersDelivered} delivered, ${input.emptiesCollected} empties, Rs ${input.cashCollected.toLocaleString()} cash. Queued offline (${clientRef.slice(0, 8)}).`);
    emit();

    if (state.online) void api.syncNow();
    return clientRef;
  },

  /** POST /orders/:id/confirm — signature or OTP. */
  confirmDelivery(input: {
    orderId: number;
    method: 'signature' | 'otp';
    signatureDataUrl?: string;
    otpCode?: string;
    receiptRef?: string;
    notes?: string;
  }) {
    const u = requireRole('driver', 'client');
    const o = findOrder(input.orderId);

    if (input.method === 'otp') {
      const ch = state.otpChallenges.find((c) => c.orderId === o.id && !c.consumed);
      if (!ch) throw new RuleError('OTP', 'No OTP has been issued for this delivery.');
      if (ch.code !== (input.otpCode ?? '').trim()) throw new RuleError('OTP', 'Incorrect OTP.');
      ch.consumed = true;
    } else if (!input.signatureDataUrl) {
      throw new RuleError('VALIDATION', 'A signature is required to confirm.');
    }

    const ev: ConfirmationEvent = {
      id: state.nextIds.confirmation++,
      orderId: o.id,
      method: input.method,
      receiptRef: input.receiptRef ?? `RCP-${String(state.nextIds.confirmation + 340).padStart(6, '0')}`,
      status: 'confirmed',
      notes: input.notes,
      signatureDataUrl: input.signatureDataUrl,
      occurredAt: now(),
    };
    state.confirmationEvents = [ev, ...state.confirmationEvents];
    o.confirmedAt = ev.occurredAt;
    transition(o, 'CONFIRMED', `Confirmed by ${input.method === 'otp' ? 'OTP' : 'signature'} (${ev.receiptRef}), captured by ${u.name}.`);
    emit();
  },

  /** Issues a 6-digit OTP. In production this is an SMS to the client. */
  requestOtp(orderId: number): string {
    const o = findOrder(orderId);
    const code = String(Math.floor(100000 + Math.random() * 900000));
    state.otpChallenges = [
      { orderId: o.id, code, issuedAt: now(), consumed: false },
      ...state.otpChallenges.filter((c) => c.orderId !== o.id),
    ];
    const client = state.clients.find((c) => c.id === o.clientId)!;
    log({ orderId: o.id, ecr: o.ecr, action: 'OTP issued', detail: `Sent to ${client.contactNumber}.` });
    emit();
    return code;
  },

  disputeDelivery(orderId: number, notes: string) {
    requireRole('driver', 'client');
    const o = findOrder(orderId);
    const ev: ConfirmationEvent = {
      id: state.nextIds.confirmation++,
      orderId: o.id,
      method: 'signature',
      status: 'disputed',
      notes,
      occurredAt: now(),
    };
    state.confirmationEvents = [ev, ...state.confirmationEvents];
    transition(o, 'DISPUTED', notes || 'Client disputed the delivery.');
    emit();
  },

  /** POST /sync/batch — idempotent on clientRef. */
  async syncNow() {
    if (state.syncing || !state.online) return;
    const pending = state.queue.filter((q) => q.state === 'pending' || q.state === 'failed');
    if (!pending.length) return;

    state.syncing = true;
    state.queue = state.queue.map((q) => (pending.includes(q) ? { ...q, state: 'syncing' as const } : q));
    emit();

    await sleep(900);

    const seen = new Set<string>();
    state.queue = state.queue.map((q) => {
      if (q.state !== 'syncing') return q;
      if (seen.has(q.clientRef)) return { ...q, state: 'synced' as const }; // replay — deduped
      seen.add(q.clientRef);

      const already = state.deliveryEvents.some((d) => d.clientRef === q.clientRef);
      if (!already && q.kind === 'delivery') {
        const p = q.payload as any;
        state.deliveryEvents = [
          {
            id: state.nextIds.delivery++,
            orderId: q.orderId,
            driverId: p.driverId,
            tabDeviceId: state.tabDevices.find((t) => t.checkedOutBy === p.driverId)?.id,
            cylindersDelivered: p.cylindersDelivered,
            emptiesCollected: p.emptiesCollected,
            cashCollected: p.cashCollected,
            gpsLat: p.gpsLat,
            gpsLng: p.gpsLng,
            clientRef: q.clientRef,
            occurredAt: q.occurredAt,
            recordedAt: now(),
          },
          ...state.deliveryEvents,
        ];
      }
      return { ...q, state: 'synced' as const, attempts: q.attempts + 1 };
    });

    state.syncing = false;
    log({ action: 'Offline queue synced', detail: `${pending.length} action(s) replayed, deduped on client_ref.` });
    emit();
  },

  // ── Gate cashier ─────────────────────────────────────────────────────────
  /**
   * POST /reconciliations/:id/confirm — the ONLY path that enqueues the Oracle
   * post. Enforces separation of duties: the cashier must not be the clerk who
   * dispatched, nor the driver who delivered.
   */
  async reconcile(input: { routeId: number; vehicleId: number; driverId: number; orderIds: number[]; totalCashReceived: number; notes?: string }) {
    const cashier = requireRole('cashier');

    const orders = input.orderIds.map(findOrder);
    for (const o of orders) {
      if (o.dispatchedBy === cashier.id) {
        throw new RuleError('SOD', `Separation of duties: ${cashier.name} dispatched ECR ${o.ecr} and cannot also confirm the sale.`);
      }
      if (o.deliveredBy === cashier.id) {
        throw new RuleError('SOD', `Separation of duties: ${cashier.name} delivered ECR ${o.ecr} and cannot also confirm the sale.`);
      }
    }

    const expected = orders.reduce((s, o) => s + expectedCash(o), 0);
    const matched = Math.abs(expected - input.totalCashReceived) < 0.5;

    const rec: CashReconciliation = {
      id: state.nextIds.reconciliation++,
      routeId: input.routeId,
      vehicleId: input.vehicleId,
      driverId: input.driverId,
      cashierId: cashier.id,
      orderIds: input.orderIds,
      totalCashExpected: expected,
      totalCashReceived: input.totalCashReceived,
      status: matched ? 'matched' : 'mismatch_held',
      resolutionNotes: input.notes,
      confirmedAt: matched ? now() : undefined,
    };
    state.reconciliations = [rec, ...state.reconciliations];

    for (const o of orders) {
      o.reconciledBy = cashier.id;
      if (matched) {
        o.reconciledAt = now();
        transition(o, 'RECONCILED', `Cash reconciled by ${cashier.name}: Rs ${input.totalCashReceived.toLocaleString()} against Rs ${expected.toLocaleString()} expected.`);
      } else {
        transition(o, 'MISMATCH_HELD', `Cash mismatch — expected Rs ${expected.toLocaleString()}, received Rs ${input.totalCashReceived.toLocaleString()}. Held, nothing posts.`);
      }
    }
    emit();

    if (matched) {
      for (const o of orders) await postToOracle(o.id);
    }
    return rec;
  },

  /** Resolve a held mismatch, then let the post proceed. */
  async resolveHold(reconciliationId: number, notes: string) {
    requireRole('cashier', 'admin');
    const rec = state.reconciliations.find((r) => r.id === reconciliationId);
    if (!rec) throw new RuleError('NOT_FOUND', 'Reconciliation not found.');
    rec.status = 'resolved';
    rec.resolutionNotes = notes;
    rec.confirmedAt = now();

    const orders = rec.orderIds.map(findOrder);
    for (const o of orders) {
      o.reconciledAt = now();
      transition(o, 'RECONCILED', `Mismatch resolved: ${notes}`);
    }
    emit();
    for (const o of orders) await postToOracle(o.id);
  },

  // ── Admin / integration ──────────────────────────────────────────────────
  setOracleUp(up: boolean) {
    state.oracleUp = up;
    log({ action: 'Oracle endpoint toggled', detail: up ? 'ORDS reachable.' : 'ORDS marked unreachable (demo fault injection).' });
    emit();
  },

  /** POST /erp-posts/:id/retry */
  async retryPost(orderId: number) {
    requireRole('admin', 'cashier');
    await postToOracle(orderId);
  },

  buildOraclePayload(orderId: number) {
    return buildOraclePayload(findOrder(orderId));
  },
};

// Expose for console poking during the demo.
if (typeof window !== 'undefined') (window as any).mcl = { api, getState, select };
