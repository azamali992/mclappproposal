// ─── MCL Cylinder Delivery — domain types ────────────────────────────────────
// Single source of truth. Every app module imports from here. Do not redefine
// these shapes locally.

export type Role =
  | 'client'
  | 'sales'
  | 'clerk'
  | 'driver'
  | 'gate'
  | 'cashier'
  | 'admin';

export type OrderStatus =
  | 'PLACED'
  | 'FILLED'
  | 'ASSIGNED'
  | 'DISPATCHED'
  | 'DELIVERED'
  | 'CONFIRMED'
  | 'DISPUTED'
  | 'RECONCILED'
  | 'MISMATCH_HELD'
  | 'POST_FAILED'
  | 'POSTED'
  | 'CANCELLED';

export interface AppUser {
  id: number;
  name: string;
  role: Role;
  /** clerk/cashier are bound to a location; drivers are not */
  locationId?: number;
  /** clients log in as themselves */
  clientId?: number;
  avatarInitials: string;
}

export interface Location {
  id: number;
  code: string; // the LL in the ECR
  name: string;
  type: 'warehouse' | 'plant';
}

export interface BookType {
  id: number;
  code: string; // the BB in the ECR
  name: string;
}

export interface Product {
  id: number;
  sku: string;
  name: string;
  size: string;
  oracleItemCode: string;
  bookTypeId: number;
  /** PKR, ex-tax. DELIVERED rate — includes the transport component. */
  unitPrice: number;
  /**
   * PKR, ex-tax. EX-DELIVERY rate, charged when the client collects from the
   * plant themselves. MCL's current rate card bundles delivery into one price,
   * so a separate collection rate card has to come from finance — see
   * `COLLECTION_RATE_NOTE` in seed.ts for how these demo values are derived.
   */
  collectionPrice: number;
  depositPerCylinder: number;
}

/**
 * Cylinder management work billed alongside a dispatch — nozzle changes,
 * repaints, repairs. Fixed-price, defined in Oracle; the clerk picks from the
 * list and it lands on the client's bill.
 */
export interface ServiceCharge {
  id: number;
  code: string;
  name: string;
  description: string;
  oracleItemCode: string;
  amount: number; // PKR, ex-tax, per unit
  unit: 'per_cylinder' | 'per_job';
}

/** A service charge applied to one order. */
export interface OrderServiceCharge {
  id: number;
  orderId: number;
  chargeId: number;
  qty: number;
  /** Snapshotted at the time it was added, so a later rate change cannot
   *  silently restate an already-dispatched bill. */
  unitAmount: number;
  note?: string;
}

export interface VehicleClass {
  id: number;
  code: string;
  name: string;
  maxCylinders: number;
  maxWeightKg: number;
}

export interface Vehicle {
  id: number;
  registration: string;
  classId: number;
  active: boolean;
}

export interface Route {
  id: number;
  code: string;
  name: string;
  active: boolean;
  locationId: number;
}

export interface RouteStop {
  id: number;
  routeId: number;
  clientId: number;
  sequenceNo: number;
}

export interface Client {
  id: number;
  name: string;
  address: string;
  area: string;
  contactNumber: string;
  oracleCustomerCode: string;
  paymentTerms: 'cash' | 'credit';
  confirmMethod: 'signature' | 'otp';
  defaultRouteId?: number;
  creditLimit?: number;
  outstanding?: number;
}

export interface TabDevice {
  id: number;
  deviceId: string;
  label: string;
  active: boolean;
  checkedOutBy?: number; // driver user id
  checkedOutAt?: string;
}

export interface OrderLine {
  id: number;
  orderId: number;
  productId: number;
  qtyOrdered: number;
  qtyLoaded?: number;
  qtyDelivered?: number;
  qtyReturned?: number; // empties collected
  reasonCode?: string;
  unitPrice: number;
}

export interface Order {
  id: number;
  ecr: string | null; // NULL until dispatch confirmation
  status: OrderStatus;
  origin: 'client_app' | 'sales';
  /**
   * 'delivery'   — goes out on a vehicle against a route.
   * 'collection' — the client collects from the plant. No vehicle, no route,
   *                no driver, and the ex-delivery rate card applies.
   */
  fulfilment: 'delivery' | 'collection';
  /** Who physically took the goods at the counter, for a collection. */
  collectedBy?: string;
  collectedAt?: string;
  clientId: number;
  locationId: number;
  bookTypeId: number;
  routeId?: number;
  vehicleId?: number;
  driverId?: number;
  requestedDate: string;
  createdBy: number;
  /** Separation of duties: these three must be distinct users. */
  dispatchedBy?: number;
  deliveredBy?: number;
  reconciledBy?: number;
  createdAt: string;
  filledAt?: string;
  assignedAt?: string;
  dispatchedAt?: string;
  deliveredAt?: string;
  confirmedAt?: string;
  reconciledAt?: string;
  postedAt?: string;
  oracleDocNo?: string;
  notes?: string;
  lines: OrderLine[];
  serviceCharges: OrderServiceCharge[];
}

export interface DeliveryEvent {
  id: number;
  orderId: number;
  driverId: number;
  tabDeviceId?: number;
  cylindersDelivered: number;
  emptiesCollected: number;
  cashCollected: number;
  gpsLat?: number;
  gpsLng?: number;
  photoUrl?: string;
  clientRef: string; // idempotency key from the offline queue
  occurredAt: string; // when it happened on the tab
  recordedAt: string; // when the server received it
}

export interface ConfirmationEvent {
  id: number;
  orderId: number;
  method: 'signature' | 'otp';
  receiptRef?: string;
  status: 'confirmed' | 'disputed';
  notes?: string;
  signatureDataUrl?: string;
  occurredAt: string;
}

export interface CashReconciliation {
  id: number;
  routeId: number;
  vehicleId: number;
  driverId: number;
  cashierId: number;
  orderIds: number[];
  totalCashExpected: number;
  totalCashReceived: number;
  status: 'matched' | 'mismatch_held' | 'resolved';
  resolutionNotes?: string;
  confirmedAt?: string;
}

export interface ErpPostLog {
  id: number;
  orderId: number;
  ecr: string;
  attemptNo: number;
  requestPayload: unknown;
  responseBody?: unknown;
  httpStatus?: number;
  status: 'success' | 'retryable' | 'failed' | 'pending';
  errorClass?: 'retryable' | 'terminal';
  oracleDocNo?: string;
  createdAt: string;
}

/** An action captured on the driver tab, queued locally until sync. */
export interface QueuedAction {
  clientRef: string; // device-generated UUID — the dedupe key
  kind: 'delivery' | 'confirmation';
  orderId: number;
  payload: unknown;
  occurredAt: string;
  state: 'pending' | 'syncing' | 'synced' | 'failed';
  attempts: number;
  error?: string;
}

/** Append-only audit trail entry. */
export interface AuditEntry {
  id: number;
  at: string;
  actorId: number;
  actorName: string;
  actorRole: Role;
  orderId?: number;
  ecr?: string | null;
  action: string;
  detail: string;
  from?: OrderStatus;
  to?: OrderStatus;
}

export interface OtpChallenge {
  orderId: number;
  code: string;
  issuedAt: string;
  consumed: boolean;
}
