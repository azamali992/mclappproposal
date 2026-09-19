// ─── Seeded demo data ────────────────────────────────────────────────────────
// Master data + one day's trading, shaped exactly like the production schema so
// swapping it for a real import is a one-file change. Product and client lists
// are distilled from MCL's real Peshawar sales report (see docs/data-profile.md)
// where `realData.ts` provides them. Money is PKR.

import type {
  AppUser, BookType, CashReconciliation, Client, ConfirmationEvent, DeliveryEvent,
  ErpPostLog, Location, Order, OrderLine, Product, Route, RouteStop, ServiceCharge,
  TabDevice, Vehicle, VehicleClass,
} from './types';
import { financialYear } from './ecr';
import { realClients, realProducts } from './realData';

const YY = financialYear();
export const TODAY = new Date();

/** ISO timestamp, N days from today at h:m. */
export function isoAt(dayOffset: number, h = 9, m = 0): string {
  const d = new Date(TODAY);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}
const iso = isoAt;

// ── Master data ─────────────────────────────────────────────────────────────

export const locations: Location[] = [
  { id: 1, code: '01', name: 'Peshawar Warehouse', type: 'warehouse' },
  { id: 2, code: '02', name: 'Multan Plant', type: 'plant' },
  { id: 3, code: '03', name: 'Lahore Warehouse', type: 'warehouse' },
];

export const bookTypes: BookType[] = [
  { id: 1, code: '01', name: 'Industrial Gases' },
  { id: 2, code: '02', name: 'Medical Gases' },
  { id: 3, code: '03', name: 'Welding Gases' },
  { id: 4, code: '04', name: 'Specialty / Calibration' },
  { id: 5, code: '05', name: 'Bulk & Cryogenic' },
];

/**
 * COLLECTION_RATE_NOTE
 * --------------------
 * MCL's current rate card is a single delivered price — transport is bundled in
 * and never shown separately, so the source report cannot tell us what the
 * ex-delivery rate should be. The real collection rate card has to come from
 * finance before this goes live.
 *
 * For the demo the collection price is the delivered price less a transport
 * component of 8%, capped at Rs 350 per cylinder — transport in cylinder
 * distribution is a per-trip cost, not a share of product value, so the cap
 * stops a high-value item like liquid oxygen carrying an absurd delivery
 * element. The number is a placeholder; the mechanism is the point.
 */
export const DELIVERY_COMPONENT_CAP = 350;

function collectionRate(delivered: number): number {
  const transport = Math.min(DELIVERY_COMPONENT_CAP, Math.round(delivered * 0.08));
  return Math.max(0, delivered - transport);
}

/** Real item list from the Peshawar report — see docs/data-profile.md. */
export const products: Product[] = realProducts.map((p) => ({
  ...p,
  collectionPrice: collectionRate(p.unitPrice),
}));

/**
 * Cylinder management charges. Fixed-price work defined in Oracle; the platform
 * clerk picks from this list and it lands on the client's bill. Item codes map
 * to Oracle's service item master.
 */
export const serviceCharges: ServiceCharge[] = [
  { id: 1, code: 'NOZ', name: 'Nozzle / valve change', description: 'Replace a damaged or leaking cylinder valve', oracleItemCode: 'SRV-NOZ-001', amount: 2800, unit: 'per_cylinder' },
  { id: 2, code: 'RPT', name: 'Repaint cylinder', description: 'Strip, prime and repaint to gas-code colour', oracleItemCode: 'SRV-RPT-001', amount: 1950, unit: 'per_cylinder' },
  { id: 3, code: 'HYD', name: 'Hydrostatic test', description: 'Five-yearly pressure test and re-stamp', oracleItemCode: 'SRV-HYD-001', amount: 3500, unit: 'per_cylinder' },
  { id: 4, code: 'REP', name: 'Valve / thread repair', description: 'Re-thread neck ring or rebuild valve seat', oracleItemCode: 'SRV-REP-001', amount: 4200, unit: 'per_cylinder' },
  { id: 5, code: 'CAP', name: 'Cap / neck ring replacement', description: 'Replace a missing or damaged protective cap', oracleItemCode: 'SRV-CAP-001', amount: 850, unit: 'per_cylinder' },
  { id: 6, code: 'ORG', name: 'O-ring and washer set', description: 'Replace outlet seals', oracleItemCode: 'SRV-ORG-001', amount: 300, unit: 'per_cylinder' },
  { id: 7, code: 'CLN', name: 'Internal cleaning / purge', description: 'Purge and vacuum before a gas change', oracleItemCode: 'SRV-CLN-001', amount: 2200, unit: 'per_cylinder' },
  { id: 8, code: 'DEM', name: 'Demurrage — cylinder held over', description: 'Rental for cylinders retained beyond the free period', oracleItemCode: 'SRV-DEM-001', amount: 120, unit: 'per_cylinder' },
  { id: 9, code: 'HND', name: 'Handling / loading charge', description: 'Plant handling on a self-collection', oracleItemCode: 'SRV-HND-001', amount: 500, unit: 'per_job' },
];

export const vehicleClasses: VehicleClass[] = [
  { id: 1, code: 'SHEHZORE', name: 'Shehzore 1-Ton', maxCylinders: 40, maxWeightKg: 1200 },
  { id: 2, code: 'MAZDA', name: 'Mazda 5-Ton', maxCylinders: 120, maxWeightKg: 5000 },
  { id: 3, code: 'HINO', name: 'Hino 10-Ton', maxCylinders: 220, maxWeightKg: 10000 },
];

export const vehicles: Vehicle[] = [
  { id: 1, registration: 'LES-4471', classId: 2, active: true },
  { id: 2, registration: 'LES-8820', classId: 1, active: true },
  { id: 3, registration: 'LES-3096', classId: 3, active: true },
  { id: 4, registration: 'LES-1133', classId: 2, active: true },
];

export const routes: Route[] = [
  { id: 1, code: 'PES-CANTT', name: 'Peshawar Cantt & Hospitals', active: true, locationId: 1 },
  { id: 2, code: 'PES-CITY', name: 'City & Warsak Road', active: true, locationId: 1 },
  { id: 3, code: 'PES-HYTBD', name: 'Hayatabad Industrial Estate', active: true, locationId: 1 },
  { id: 4, code: 'MUL-IND', name: 'Multan Industrial Estate', active: true, locationId: 2 },
];

/** Real party list from the Peshawar report, carrying their Oracle codes. */
// Demo adjustment: the source report does not record payment terms, so the
// generator marked nearly every party 'credit'. Real gas dealers and retail
// counters pay cash on delivery while institutions run on credit -- that split
// is exactly what the gate reconciliation exists to control, so it is set here.
const CASH_CLIENT_IDS = new Set([2, 4, 7, 8]);
const OTP_CLIENT_IDS = new Set([2, 3, 5, 6, 8]);
export const clients: Client[] = realClients.map((c) => ({
  ...c,
  paymentTerms: CASH_CLIENT_IDS.has(c.id) ? 'cash' : 'credit',
  confirmMethod: OTP_CLIENT_IDS.has(c.id) ? 'otp' : 'signature',
}));

export const routeStops: RouteStop[] = [
  { id: 1, routeId: 1, clientId: 1, sequenceNo: 1 },   // CMH Peshawar        - credit
  { id: 2, routeId: 1, clientId: 2, sequenceNo: 2 },   // Jameel Gases        - cash
  { id: 3, routeId: 1, clientId: 3, sequenceNo: 3 },   // Qazi Hussain Ahmad  - credit
  { id: 4, routeId: 2, clientId: 8, sequenceNo: 1 },   // Irfan General Hosp. - cash
  { id: 5, routeId: 2, clientId: 5, sequenceNo: 2 },   // Maqsood Medical     - credit
  { id: 6, routeId: 2, clientId: 7, sequenceNo: 3 },   // New Malik Hardware  - cash
  { id: 7, routeId: 3, clientId: 4, sequenceNo: 1 },   // Fine Gases          - cash
  { id: 8, routeId: 3, clientId: 6, sequenceNo: 2 },   // Prime Hospital      - credit
];

export const users: AppUser[] = [
  { id: 1, name: 'Bilal Ahmed', role: 'client', clientId: 2, avatarInitials: 'BA' }, // Jameel Gases — cash dealer
  { id: 2, name: 'Usman Tariq', role: 'sales', locationId: 1, avatarInitials: 'UT' },
  { id: 3, name: 'Zafar Iqbal', role: 'clerk', locationId: 1, avatarInitials: 'ZI' },
  { id: 4, name: 'Ramzan Ali', role: 'driver', avatarInitials: 'RA' },
  { id: 5, name: 'Nadeem Shah', role: 'gate', locationId: 1, avatarInitials: 'NS' },
  { id: 6, name: 'Imran Butt', role: 'cashier', locationId: 1, avatarInitials: 'IB' },
  { id: 7, name: 'Ayesha Malik', role: 'admin', avatarInitials: 'AM' },
  { id: 8, name: 'Shahid Mehmood', role: 'driver', avatarInitials: 'SM' },
];

export const tabDevices: TabDevice[] = [
  { id: 1, deviceId: 'TAB-PES-001', label: 'Tab 1 — Peshawar Gate', active: true },
  { id: 2, deviceId: 'TAB-PES-002', label: 'Tab 2 — Peshawar Gate', active: true },
  { id: 3, deviceId: 'TAB-PES-003', label: 'Tab 3 — Peshawar Gate', active: false },
];

// ── Opening ECR sequence table ──────────────────────────────────────────────
// Books already part-used this financial year, consistent with the history below.

export const ecrSequences: Record<string, number> = {
  [`${YY}|01|01`]: 348,
  [`${YY}|01|02`]: 121,
  [`${YY}|01|03`]: 96,
  [`${YY}|01|04`]: 12,
  [`${YY}|01|05`]: 4,
  [`${YY}|02|01`]: 210,
  [`${YY}|03|01`]: 88,
};

/** Build an ECR string for seeded history without touching the live allocator. */
function ecrOf(loc: string, book: string, seq: number): string {
  return `${YY}${loc}${book}${String(seq).padStart(4, '0')}`;
}

// ── Transactional history ───────────────────────────────────────────────────
// A believable trading day: orders sitting at every stage of the pipeline, so
// the demo opens with real work in each role's queue instead of empty screens.

/** An order literal before the delivery-mode defaults are filled in. */
type SeedOrder = Omit<Order, 'fulfilment' | 'serviceCharges'> &
  Partial<Pick<Order, 'fulfilment' | 'serviceCharges'>>;

let lineId = 0;
function L(orderId: number, productId: number, qtyOrdered: number, extra: Partial<OrderLine> = {}): OrderLine {
  const p = products.find((x) => x.id === productId)!;
  return { id: ++lineId, orderId, productId, qtyOrdered, unitPrice: p.unitPrice, ...extra };
}

const seedOrders: SeedOrder[] = [
  // - Closed last week: gives the dealer app a history and a cylinder balance -
  { id: 100, ecr: ecrOf('01', '02', 117), status: 'POSTED', origin: 'client_app', clientId: 2, locationId: 1, bookTypeId: 2, routeId: 1, vehicleId: 1, driverId: 4, requestedDate: iso(-6), createdBy: 1, createdAt: iso(-6, 8, 10), filledAt: iso(-6, 9, 5), assignedAt: iso(-6, 9, 25), dispatchedAt: iso(-6, 9, 40), dispatchedBy: 3, deliveredAt: iso(-6, 12, 15), deliveredBy: 4, confirmedAt: iso(-6, 12, 18), reconciledAt: iso(-6, 17, 10), reconciledBy: 6, postedAt: iso(-6, 17, 11), oracleDocNo: 'SO-2026-004402', lines: [L(100, 2, 6, { qtyLoaded: 6, qtyDelivered: 6, qtyReturned: 5 }), L(100, 3, 4, { qtyLoaded: 4, qtyDelivered: 4, qtyReturned: 4 })] },
  // - Awaiting the clerk -
  { id: 101, ecr: null, status: 'PLACED', origin: 'client_app', clientId: 1, locationId: 1, bookTypeId: 2, requestedDate: iso(0), createdBy: 1, createdAt: iso(0, 7, 42), lines: [L(101, 2, 4), L(101, 3, 2)] },
  { id: 102, ecr: null, status: 'PLACED', origin: 'sales', clientId: 5, locationId: 1, bookTypeId: 2, requestedDate: iso(0), createdBy: 2, createdAt: iso(0, 8, 5), notes: 'Ward asked for a morning slot', lines: [L(102, 4, 3), L(102, 14, 1)] },
  { id: 103, ecr: null, status: 'PLACED', origin: 'client_app', clientId: 4, locationId: 1, bookTypeId: 1, requestedDate: iso(0), createdBy: 1, createdAt: iso(0, 8, 21), lines: [L(103, 1, 6), L(103, 6, 2)] },

  // - Filled, awaiting vehicle + route -
  { id: 104, ecr: null, status: 'FILLED', origin: 'sales', clientId: 6, locationId: 1, bookTypeId: 2, requestedDate: iso(0), createdBy: 2, createdAt: iso(0, 7, 15), filledAt: iso(0, 8, 40), lines: [L(104, 3, 5, { qtyLoaded: 5 })] },

  // - Assigned, awaiting dispatch confirmation - no ECR yet, by design -
  { id: 105, ecr: null, status: 'ASSIGNED', origin: 'client_app', clientId: 3, locationId: 1, bookTypeId: 2, routeId: 1, vehicleId: 1, driverId: 4, requestedDate: iso(0), createdBy: 1, createdAt: iso(0, 6, 55), filledAt: iso(0, 8, 10), assignedAt: iso(0, 8, 55), lines: [L(105, 2, 3, { qtyLoaded: 3 })] },

  // - On the road right now: driver Ramzan Ali on PES-CANTT -
  { id: 106, ecr: ecrOf('01', '05', 3), status: 'DISPATCHED', origin: 'sales', clientId: 2, locationId: 1, bookTypeId: 5, routeId: 1, vehicleId: 1, driverId: 4, requestedDate: iso(0), createdBy: 2, createdAt: iso(-1, 16, 20), filledAt: iso(0, 6, 30), assignedAt: iso(0, 6, 50), dispatchedAt: iso(0, 7, 5), dispatchedBy: 3, lines: [L(106, 7, 8, { qtyLoaded: 8 })] },
  { id: 107, ecr: ecrOf('01', '02', 118), status: 'DISPATCHED', origin: 'client_app', clientId: 1, locationId: 1, bookTypeId: 2, routeId: 1, vehicleId: 1, driverId: 4, requestedDate: iso(0), createdBy: 1, createdAt: iso(-1, 17, 2), filledAt: iso(0, 6, 35), assignedAt: iso(0, 6, 50), dispatchedAt: iso(0, 7, 5), dispatchedBy: 3, lines: [L(107, 2, 4, { qtyLoaded: 4 }), L(107, 3, 2, { qtyLoaded: 2 })] },

  // - Delivered and confirmed: cash waiting at the gate for the cashier -
  { id: 108, ecr: ecrOf('01', '02', 119), status: 'CONFIRMED', origin: 'sales', clientId: 8, locationId: 1, bookTypeId: 2, routeId: 2, vehicleId: 4, driverId: 8, requestedDate: iso(-1), createdBy: 2, createdAt: iso(-1, 9, 0), filledAt: iso(-1, 10, 0), assignedAt: iso(-1, 10, 20), dispatchedAt: iso(-1, 10, 45), dispatchedBy: 3, deliveredAt: iso(-1, 13, 10), deliveredBy: 8, confirmedAt: iso(-1, 13, 12), lines: [L(108, 2, 5, { qtyLoaded: 5, qtyDelivered: 5, qtyReturned: 4 })] },
  { id: 109, ecr: ecrOf('01', '03', 94), status: 'CONFIRMED', origin: 'client_app', clientId: 7, locationId: 1, bookTypeId: 3, routeId: 2, vehicleId: 4, driverId: 8, requestedDate: iso(-1), createdBy: 1, createdAt: iso(-1, 9, 30), filledAt: iso(-1, 10, 5), assignedAt: iso(-1, 10, 20), dispatchedAt: iso(-1, 10, 45), dispatchedBy: 3, deliveredAt: iso(-1, 14, 25), deliveredBy: 8, confirmedAt: iso(-1, 14, 27), lines: [L(109, 9, 2, { qtyLoaded: 2, qtyDelivered: 1, qtyReturned: 1, reasonCode: 'SHORT_DELIVERY' })] },

  // - Posted to Oracle two days ago: the happy path, already closed -
  { id: 110, ecr: ecrOf('01', '05', 2), status: 'POSTED', origin: 'sales', clientId: 4, locationId: 1, bookTypeId: 5, routeId: 3, vehicleId: 2, driverId: 8, requestedDate: iso(-2), createdBy: 2, createdAt: iso(-2, 9, 0), filledAt: iso(-2, 10, 0), assignedAt: iso(-2, 10, 15), dispatchedAt: iso(-2, 10, 30), dispatchedBy: 3, deliveredAt: iso(-2, 12, 40), deliveredBy: 8, confirmedAt: iso(-2, 12, 42), reconciledAt: iso(-2, 17, 5), reconciledBy: 6, postedAt: iso(-2, 17, 6), oracleDocNo: 'SO-2026-004471', lines: [L(110, 7, 6, { qtyLoaded: 6, qtyDelivered: 6, qtyReturned: 5 })] },

  // - A terminal Oracle failure sitting in the admin retry queue -
  { id: 111, ecr: ecrOf('01', '01', 346), status: 'POST_FAILED', origin: 'sales', clientId: 4, locationId: 1, bookTypeId: 1, routeId: 3, vehicleId: 2, driverId: 8, requestedDate: iso(-2), createdBy: 2, createdAt: iso(-2, 9, 20), filledAt: iso(-2, 10, 0), assignedAt: iso(-2, 10, 15), dispatchedAt: iso(-2, 10, 30), dispatchedBy: 3, deliveredAt: iso(-2, 15, 5), deliveredBy: 8, confirmedAt: iso(-2, 15, 7), reconciledAt: iso(-2, 17, 5), reconciledBy: 6, lines: [L(111, 1, 4, { qtyLoaded: 4, qtyDelivered: 4, qtyReturned: 3 })] },

  // - A self-collection sitting in the clerk's queue. No vehicle, no route: the
  //   client's own van is at the gate. Priced off the ex-delivery rate card,
  //   with plant handling and two nozzle changes billed as service work. -
  { id: 112, ecr: null, status: 'FILLED', origin: 'sales', fulfilment: 'collection', clientId: 4, locationId: 1, bookTypeId: 1, requestedDate: iso(0), createdBy: 2, createdAt: iso(0, 8, 50), filledAt: iso(0, 9, 10), notes: 'Client sending their own pickup at midday', lines: [L(112, 1, 5, { qtyLoaded: 5 })], serviceCharges: [
    { id: 1, orderId: 112, chargeId: 1, qty: 2, unitAmount: 2800, note: 'Both valves leaking on return' },
    { id: 2, orderId: 112, chargeId: 9, qty: 1, unitAmount: 500 },
  ] },
];

/**
 * Everything seeded above predates the collection feature, so anything that
 * does not say otherwise is a delivery with no service work on it.
 */
export const orders: Order[] = seedOrders.map((o) => ({
  ...o,
  fulfilment: o.fulfilment ?? 'delivery',
  serviceCharges: o.serviceCharges ?? [],
}));

export const deliveryEvents: DeliveryEvent[] = [
  { id: 5, orderId: 100, driverId: 4, tabDeviceId: 1, cylindersDelivered: 10, emptiesCollected: 9, cashCollected: 0, gpsLat: 33.9942, gpsLng: 71.5361, clientRef: 'd1f2a3b4-0005-4aaa-8bbb-000000000100', occurredAt: iso(-6, 12, 15), recordedAt: iso(-6, 12, 16) },
  { id: 1, orderId: 108, driverId: 8, tabDeviceId: 2, cylindersDelivered: 5, emptiesCollected: 4, cashCollected: 49000, gpsLat: 33.9994, gpsLng: 71.5403, clientRef: 'd1f2a3b4-0001-4aaa-8bbb-000000000108', occurredAt: iso(-1, 13, 10), recordedAt: iso(-1, 13, 44) },
  { id: 2, orderId: 109, driverId: 8, tabDeviceId: 2, cylindersDelivered: 1, emptiesCollected: 1, cashCollected: 37400, gpsLat: 34.0081, gpsLng: 71.5619, clientRef: 'd1f2a3b4-0002-4aaa-8bbb-000000000109', occurredAt: iso(-1, 14, 25), recordedAt: iso(-1, 15, 2) },
  { id: 3, orderId: 110, driverId: 8, tabDeviceId: 2, cylindersDelivered: 6, emptiesCollected: 5, cashCollected: 29610, gpsLat: 33.9820, gpsLng: 71.4600, clientRef: 'd1f2a3b4-0003-4aaa-8bbb-000000000110', occurredAt: iso(-2, 12, 40), recordedAt: iso(-2, 12, 41) },
  { id: 4, orderId: 111, driverId: 8, tabDeviceId: 2, cylindersDelivered: 4, emptiesCollected: 3, cashCollected: 38080, gpsLat: 33.9834, gpsLng: 71.4612, clientRef: 'd1f2a3b4-0004-4aaa-8bbb-000000000111', occurredAt: iso(-2, 15, 5), recordedAt: iso(-2, 15, 6) },
];

export const confirmationEvents: ConfirmationEvent[] = [
  { id: 5, orderId: 100, method: 'signature', receiptRef: 'RCP-000327', status: 'confirmed', occurredAt: iso(-6, 12, 18) },
  { id: 1, orderId: 108, method: 'otp', receiptRef: 'RCP-000341', status: 'confirmed', occurredAt: iso(-1, 13, 12) },
  { id: 2, orderId: 109, method: 'signature', receiptRef: 'RCP-000342', status: 'confirmed', notes: '1 cylinder short - customer accepted', occurredAt: iso(-1, 14, 27) },
  { id: 3, orderId: 110, method: 'signature', receiptRef: 'RCP-000338', status: 'confirmed', occurredAt: iso(-2, 12, 42) },
  { id: 4, orderId: 111, method: 'signature', receiptRef: 'RCP-000339', status: 'confirmed', occurredAt: iso(-2, 15, 7) },
];

export const cashReconciliations: CashReconciliation[] = [
  { id: 1, routeId: 3, vehicleId: 2, driverId: 8, cashierId: 6, orderIds: [110, 111], totalCashExpected: 67690, totalCashReceived: 67690, status: 'matched', confirmedAt: iso(-2, 17, 5) },
];

const ECR_110 = ecrOf('01', '05', 2);
const ECR_111 = ecrOf('01', '01', 346);

export const erpPostLogs: ErpPostLog[] = [
  { id: 1, orderId: 110, ecr: ECR_110, attemptNo: 1, requestPayload: { ecr: ECR_110, customer_code: 'CUST-121573', doc_date: iso(-2, 12, 40), lines: [{ item: 'ITM-LN2-JAR-47', qty: 6 }], cash_receipt: { amount: 29610, currency: 'PKR' } }, responseBody: { status: 'OK', doc_no: 'SO-2026-004471', gl_batch: 'GL-88213' }, httpStatus: 201, status: 'success', oracleDocNo: 'SO-2026-004471', createdAt: iso(-2, 17, 6) },
  { id: 2, orderId: 111, ecr: ECR_111, attemptNo: 1, requestPayload: { ecr: ECR_111, customer_code: 'CUST-121573', doc_date: iso(-2, 15, 5), lines: [{ item: 'ITM-OXY-68-IND', qty: 4 }], cash_receipt: { amount: 38080, currency: 'PKR' } }, responseBody: { error: 'ORA-20031: Accounting period CLOSED for this document date', error_class: 'terminal' }, httpStatus: 422, status: 'failed', errorClass: 'terminal', createdAt: iso(-2, 17, 7) },
  { id: 3, orderId: 111, ecr: ECR_111, attemptNo: 2, requestPayload: { ecr: ECR_111, customer_code: 'CUST-121573', doc_date: iso(-2, 15, 5), lines: [{ item: 'ITM-OXY-68-IND', qty: 4 }], cash_receipt: { amount: 38080, currency: 'PKR' } }, responseBody: { error: 'ORA-20031: Accounting period CLOSED for this document date', error_class: 'terminal' }, httpStatus: 422, status: 'failed', errorClass: 'terminal', createdAt: iso(-1, 9, 15) },
];

export const nextIds = {
  order: 113,
  line: lineId + 1,
  delivery: 6,
  confirmation: 6,
  reconciliation: 2,
  erpLog: 4,
  audit: 1,
  routeStop: 9,
  serviceCharge: 3,
};
