// ─── OrderDetail — one order, everything about it ────────────────────────────
// Shared by the clerk queue (as a right-hand drawer) and the sales desk (as an
// inline panel). It renders state and hosts an `actions` slot; the caller owns
// the verbs that move the order along the pipeline.
//
// One exception, deliberate: the cylinder management charges are edited here,
// because the bill is the only place they make sense. That editing lives in
// ServiceChargePanel and goes through api.addServiceCharge /
// api.removeServiceCharge like everything else — no rule is applied locally.

import { useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { Order } from '../../../core/types';
import {
  useStore,
  select,
  orderValue,
  orderCylinders,
  expectedCash,
  serviceChargeTotal,
} from '../../../core/store';
import { Money, PipelineTracker } from '../../../ui/primitives';
import { X, Box } from '../../../ui/icons';
import OrderTimeline from '../shared/OrderTimeline';
import ServiceChargePanel from './ServiceChargePanel';
import {
  EcrText,
  FulfilmentTag,
  OrderStatusPill,
  OriginTag,
  TONE_CLASS,
  fmtDate,
  fmtDateTime,
  roleLabel,
} from '../shared/OrderTable';

// ─── Small layout atoms ──────────────────────────────────────────────────────

function Section({ title, children, right }: { title: string; children: ReactNode; right?: ReactNode }) {
  return (
    <section className="border-t border-line px-5 py-5">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-lg font-semibold text-fg">{title}</h3>
        {right}
      </div>
      {children}
    </section>
  );
}

function KV({ label, children, tone }: { label: string; children: ReactNode; tone?: 'warn' | 'success' }) {
  return (
    <div className="min-w-0">
      <dt className="text-base text-fg-muted">{label}</dt>
      <dd
        className={`truncate text-base ${
          tone === 'warn' ? 'text-warn-fg' : tone === 'success' ? 'text-success-fg' : 'text-fg'
        }`}
      >
        {children}
      </dd>
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export interface OrderDetailProps {
  /** Null renders the resting state (drawer closed / panel placeholder). */
  orderId: number | null;
  onClose?: () => void;
  /** 'drawer' overlays from the right and traps Escape; 'panel' renders inline. */
  variant?: 'drawer' | 'panel';
  /** Footer verb bar. The clerk passes Fill / Assign / Dispatch / Cancel here. */
  actions?: ReactNode;
  className?: string;
}

export function OrderDetail({
  orderId,
  onClose,
  variant = 'drawer',
  actions,
  className = '',
}: OrderDetailProps) {
  const s = useStore((st) => st);
  const order: Order | undefined = orderId == null ? undefined : select.order(s, orderId);

  useEffect(() => {
    if (variant !== 'drawer' || !onClose || orderId == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [variant, onClose, orderId]);

  const totals = useMemo(() => {
    if (!order) return null;
    return {
      ordered: orderCylinders(order, 'qtyOrdered'),
      loaded: orderCylinders(order, 'qtyLoaded'),
      delivered: orderCylinders(order, 'qtyDelivered'),
      returned: orderCylinders(order, 'qtyReturned'),
      value: orderValue(order),
      service: serviceChargeTotal(order),
      goods: orderValue(order) - serviceChargeTotal(order),
      cash: expectedCash(order),
    };
  }, [order]);

  if (!order || !totals) {
    if (variant === 'drawer') return null;
    return (
      <div
        className={`flex h-full flex-col items-center justify-center border border-line bg-surface p-8 text-center ${className}`}
      >
        <div className="text-lg font-medium text-fg">Select an order</div>
        <p className="mt-1 max-w-xs text-base text-fg-muted">
          Its client, lines, capacity and full audit trail appear here.
        </p>
      </div>
    );
  }

  const client = select.client(s, order.clientId);
  const location = select.location(s, order.locationId);
  const book = select.bookType(s, order.bookTypeId);
  const route = select.route(s, order.routeId);
  const vehicle = select.vehicle(s, order.vehicleId);
  const vclass = select.vehicleClass(s, order.vehicleId);
  const driver = select.user(s, order.driverId);
  const creator = select.user(s, order.createdBy);
  const collecting = order.fulfilment === 'collection';
  const delivery = s.deliveryEvents.find((d) => d.orderId === order.id);
  const confirmation = s.confirmationEvents.find((c) => c.orderId === order.id);

  const body = (
    <div className="flex h-full min-h-0 flex-col bg-surface">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <header className="flex-none border-b border-line bg-surface px-5 py-4">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-base text-fg-muted">Order</span>
              <span className="font-mono text-base tabular-nums text-fg">#{order.id}</span>
              <OriginTag origin={order.origin} />
              <FulfilmentTag fulfilment={order.fulfilment} />
              <OrderStatusPill status={order.status} />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              {order.ecr ? (
                <EcrText ecr={order.ecr} size="lg" />
              ) : (
                <span className="text-lg font-medium text-fg-muted">No ECR number yet</span>
              )}
            </div>
            <p className="mt-1 text-base text-fg-muted">
              {order.ecr
                ? `Allocated at dispatch by ${select.user(s, order.dispatchedBy)?.name ?? 'the warehouse'} · ${fmtDateTime(order.dispatchedAt)}`
                : 'An ECR is issued only when dispatch is confirmed, so an abandoned order never burns a number.'}
            </p>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close order detail"
              className="p-2 text-fg-muted hover:bg-surface-high hover:text-fg focus:outline-none focus-visible:ring-1 focus-visible:ring-accent"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
        <div className="mt-3">
          <PipelineTracker current={order.status} />
        </div>
      </header>

      {/* ── Scrolling body ───────────────────────────────────────────────── */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <Section
          title="Client"
          right={
            <span
              className={`border px-2 py-0.5 text-base font-semibold ${
                client?.paymentTerms === 'credit' ? TONE_CLASS.warn : TONE_CLASS.success
              }`}
            >
              {client?.paymentTerms === 'credit' ? 'Credit terms' : 'Cash on delivery'}
            </span>
          }
        >
          <div className="text-lg font-medium text-fg">{client?.name}</div>
          <div className="text-base text-fg-muted">{client?.address}</div>
          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
            <KV label="Oracle customer">
              <span className="font-mono text-base">{client?.oracleCustomerCode}</span>
            </KV>
            <KV label="Phone number">
              <span className="font-mono text-base">{client?.contactNumber}</span>
            </KV>
            <KV label="Confirms by">{client?.confirmMethod === 'otp' ? 'OTP to client' : 'Signature'}</KV>
            {client?.paymentTerms === 'credit' && (
              <>
                <KV label="Credit limit">
                  <Money value={client.creditLimit ?? 0} />
                </KV>
                <KV label="Already owed" tone="warn">
                  <Money value={client.outstanding ?? 0} />
                </KV>
                <KV label="Room left">
                  <Money value={Math.max(0, (client.creditLimit ?? 0) - (client.outstanding ?? 0))} />
                </KV>
              </>
            )}
          </dl>
        </Section>

        <Section title="Fulfilment">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
            <KV label="Location">
              {location?.name} <span className="font-mono text-base text-fg-muted">{location?.code}</span>
            </KV>
            <KV label="Book type">
              {book?.name} <span className="font-mono text-base text-fg-muted">{book?.code}</span>
            </KV>
            <KV label="Requested">{fmtDate(order.requestedDate)}</KV>
            <KV label="How it goes out">
              {collecting ? 'Client collects from the plant' : 'Delivered on an MCL vehicle'}
            </KV>
            {collecting ? (
              <>
                <KV label="Vehicle, route and driver">None — the client’s own van</KV>
                <KV label="Collected by" tone={order.collectedBy ? undefined : 'warn'}>
                  {order.collectedBy ?? 'Not collected yet'}
                </KV>
                <KV label="Collected at">
                  {order.collectedAt ? fmtDateTime(order.collectedAt) : '—'}
                </KV>
              </>
            ) : (
              <>
                <KV label="Route">{route ? `${route.code} — ${route.name}` : 'Not assigned'}</KV>
                <KV label="Vehicle">
                  {vehicle ? (
                    <span className="font-mono">
                      {vehicle.registration}
                      <span className="ms-2 font-sans text-base text-fg-muted">
                        {vclass?.name}, holds {vclass?.maxCylinders} cylinders
                      </span>
                    </span>
                  ) : (
                    'Not assigned'
                  )}
                </KV>
                <KV label="Driver">{driver?.name ?? 'Not assigned'}</KV>
              </>
            )}
            <KV label="Taken by">
              {creator?.name} <span className="text-base text-fg-muted">({roleLabel(creator?.role)})</span>
            </KV>
            <KV label="Placed">{fmtDateTime(order.createdAt)}</KV>
            <KV label="Filled">{order.filledAt ? fmtDateTime(order.filledAt) : '—'}</KV>
          </dl>
          {order.notes && (
            <p className="mt-4 border border-line px-3 py-2 text-base text-fg">
              <span className="font-semibold">Note:</span> {order.notes}
            </p>
          )}
        </Section>

        <Section
          title="What was ordered"
          right={
            <span className="text-base text-fg-muted">
              {collecting
                ? 'Collection rate — transport not included'
                : 'Delivered rate — transport included'}
            </span>
          }
        >
          <div className="border border-line">
            <table className="w-full border-collapse text-base">
              <thead>
                <tr className="border-b border-line bg-surface text-base text-fg">
                  <th className="px-3 py-3 text-left font-semibold">Product</th>
                  <th className="px-3 py-3 text-right font-semibold">Unit price</th>
                  <th className="px-3 py-3 text-right font-semibold">Ordered</th>
                  <th className="px-3 py-3 text-right font-semibold">Loaded</th>
                  <th className="px-3 py-3 text-right font-semibold">Delivered</th>
                  <th className="px-3 py-3 text-right font-semibold">Empties back</th>
                  <th className="px-3 py-3 text-right font-semibold">Value</th>
                </tr>
              </thead>
              <tbody>
                {order.lines.map((l) => {
                  const p = select.product(s, l.productId);
                  const qty = l.qtyLoaded ?? l.qtyOrdered;
                  const short = (l.qtyLoaded ?? l.qtyOrdered) < l.qtyOrdered;
                  return (
                    <tr key={l.id} className="border-t border-line">
                      <td className="px-3 py-3">
                        <div className="font-medium text-fg">{p?.name}</div>
                        <div className="text-base text-fg-muted">
                          <span className="font-mono">{p?.sku}</span> · {p?.size}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right font-mono tabular-nums text-fg-muted">
                        <Money value={l.unitPrice} />
                      </td>
                      <td className="px-3 py-3 text-right font-mono tabular-nums text-fg-muted">
                        {l.qtyOrdered}
                      </td>
                      <td
                        className={`px-3 py-3 text-right font-mono tabular-nums ${
                          short ? 'font-semibold text-warn-fg' : 'text-fg'
                        }`}
                      >
                        {l.qtyLoaded ?? '—'}
                      </td>
                      <td className="px-3 py-3 text-right font-mono tabular-nums text-fg">
                        {l.qtyDelivered ?? '—'}
                      </td>
                      <td className="px-3 py-3 text-right font-mono tabular-nums text-fg-muted">
                        {l.qtyReturned ?? '—'}
                      </td>
                      <td className="px-3 py-3 text-right font-mono tabular-nums text-fg">
                        <Money value={qty * l.unitPrice} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-line bg-surface font-medium">
                  <td className="px-3 py-3 text-base font-semibold text-fg">Totals</td>
                  <td />
                  <td className="px-3 py-3 text-right font-mono tabular-nums text-fg-muted">
                    {totals.ordered}
                  </td>
                  <td className="px-3 py-3 text-right font-mono tabular-nums text-fg">
                    {totals.loaded || '—'}
                  </td>
                  <td className="px-3 py-3 text-right font-mono tabular-nums text-fg">
                    {totals.delivered || '—'}
                  </td>
                  <td className="px-3 py-3 text-right font-mono tabular-nums text-fg-muted">
                    {totals.returned || '—'}
                  </td>
                  <td className="px-3 py-3 text-right font-mono tabular-nums text-fg">
                    <Money value={totals.goods} />
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* ── The bill: goods + service work = total ────────────────── */}
          <div className="mt-3 border border-line">
            <dl className="divide-y divide-line">
              <div className="flex items-baseline justify-between gap-3 px-3 py-2.5">
                <dt className="text-base text-fg-muted">Goods</dt>
                <dd className="font-mono text-base tabular-nums text-fg">
                  <Money value={totals.goods} />
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3 px-3 py-2.5">
                <dt className="flex items-center gap-2 text-base text-fg-muted">
                  <Box className="h-4 w-4" /> Cylinder management work
                  {order.serviceCharges.length > 0 && (
                    <span className="font-mono tabular-nums">({order.serviceCharges.length})</span>
                  )}
                </dt>
                <dd className="font-mono text-base tabular-nums text-fg">
                  <Money value={totals.service} />
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3 bg-surface px-3 py-3">
                <dt className="text-base font-semibold text-fg">The client’s bill</dt>
                <dd className="font-mono text-xl font-semibold tabular-nums text-fg">
                  <Money value={totals.value} />
                </dd>
              </div>
            </dl>
          </div>
          <p className="mt-3 text-base text-fg-muted">
            {client?.paymentTerms === 'credit' ? (
              <>Credit client — no cash is expected at the door; the value posts against their account.</>
            ) : (
              <>
                {collecting ? 'Cash on collection — the counter takes ' : 'Cash on delivery — the driver must return '}
                <span className="font-mono tabular-nums text-fg-muted">
                  <Money value={totals.cash || totals.value} />
                </span>{' '}
                {collecting
                  ? 'when the client’s van arrives, and it goes to the gate cashier with the rest of the day’s cash.'
                  : 'to the gate cashier.'}
              </>
            )}
          </p>
        </Section>

        <section className="border-t border-line px-5 py-5">
          <ServiceChargePanel orderId={order.id} />
        </section>

        {(delivery || confirmation) && (
          <Section title="Delivery and confirmation">
            <div className="grid gap-4 sm:grid-cols-2">
              {delivery && (
                <div className="border border-line bg-surface p-4">
                  <div className="text-lg font-semibold text-fg">What the driver recorded</div>
                  <dl className="mt-2 space-y-2 text-base">
                    <div className="flex justify-between gap-2">
                      <dt className="text-fg-muted">Cylinders delivered</dt>
                      <dd className="font-mono tabular-nums text-fg">{delivery.cylindersDelivered}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-fg-muted">Empties collected</dt>
                      <dd className="font-mono tabular-nums text-fg">{delivery.emptiesCollected}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-fg-muted">Cash collected</dt>
                      <dd className="font-mono tabular-nums text-success-fg">
                        <Money value={delivery.cashCollected} />
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-fg-muted">Where it was captured</dt>
                      <dd className="font-mono tabular-nums text-fg-muted">
                        {delivery.gpsLat?.toFixed(4)}, {delivery.gpsLng?.toFixed(4)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-fg-muted">client_ref</dt>
                      <dd className="font-mono text-fg-muted">{delivery.clientRef.slice(0, 13)}…</dd>
                    </div>
                  </dl>
                </div>
              )}
              {confirmation && (
                <div className="border border-line bg-surface p-4">
                  <div className="text-lg font-semibold text-fg">How the customer confirmed</div>
                  <dl className="mt-2 space-y-2 text-base">
                    <div className="flex justify-between gap-2">
                      <dt className="text-fg-muted">Method</dt>
                      <dd className="text-fg">{confirmation.method === 'otp' ? 'OTP' : 'Signature'}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-fg-muted">Receipt</dt>
                      <dd className="font-mono text-fg">{confirmation.receiptRef}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-fg-muted">Status</dt>
                      <dd
                        className={confirmation.status === 'disputed' ? 'text-danger-fg' : 'text-success-fg'}
                      >
                        {confirmation.status}
                      </dd>
                    </div>
                    {confirmation.notes && <p className="pt-1 text-fg-muted">{confirmation.notes}</p>}
                  </dl>
                </div>
              )}
            </div>
          </Section>
        )}

        <Section title="Everything that happened to this order">
          <OrderTimeline orderId={order.id} dense title="Audit & event trail" />
        </Section>
      </div>

      {/* ── Action bar ───────────────────────────────────────────────────── */}
      {actions && (
        <footer className="flex-none border-t border-line bg-surface px-5 py-4">{actions}</footer>
      )}
    </div>
  );

  if (variant === 'panel') {
    return (
      <div className={`overflow-hidden border border-line ${className}`}>{body}</div>
    );
  }

  return (
    <div className="fixed inset-0 z-drawer flex justify-end" role="dialog" aria-modal="true" aria-label={`Order ${order.id}`}>
      <div
        className="absolute inset-0 bg-scrim"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={`relative flex h-full w-[46rem] max-w-full flex-col border-s border-line ${className}`}
      >
        {body}
      </aside>
    </div>
  );
}

export default OrderDetail;
