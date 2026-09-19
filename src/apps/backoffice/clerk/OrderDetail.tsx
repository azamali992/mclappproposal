// ─── OrderDetail — one order, opened short ───────────────────────────────────
// Shared by the clerk queue (as a right-hand drawer) and the sales desk (as an
// inline panel). It renders state and hosts an `actions` slot; the caller owns
// the verbs that move the order along the pipeline.
//
// It opens on the essentials only: who it is for, what they want, where it has
// got to, the ECR, and the money. Everything else — fulfilment paperwork, the
// service charges, the delivery evidence, the full audit trail — sits behind
// two collapsed toggles, because none of it is why the screen was opened.
//
// One exception, deliberate: the cylinder management charges are edited here,
// because the bill is the only place they make sense. That editing lives in
// ServiceChargePanel and goes through api.addServiceCharge /
// api.removeServiceCharge like everything else — no rule is applied locally.

import { useEffect, useMemo, useState } from 'react';
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
import { Money } from '../../../ui/primitives';
import { X, Box, ChevronDown } from '../../../ui/icons';
import { useT } from '../../../i18n';
import OrderTimeline from '../shared/OrderTimeline';
import ServiceChargePanel from './ServiceChargePanel';
import {
  CollectionTag,
  EcrText,
  OrderStatusPill,
  TONE_CLASS,
  fmtDate,
  fmtDateTime,
  roleLabel,
} from '../shared/OrderTable';

// ─── Small layout atoms ──────────────────────────────────────────────────────

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

/**
 * A closed drawer inside the drawer. Nothing in here is why anyone opened the
 * order, so nothing in here is on screen until it is asked for.
 */
function Disclosure({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="border-t border-line">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-5 py-4 text-start text-lg font-semibold text-fg hover:bg-surface-high focus:outline-none focus-visible:ring-1 focus-visible:ring-accent"
      >
        <ChevronDown className={`h-4 w-4 text-fg-muted ${open ? 'rotate-180' : ''}`} />
        {label}
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </section>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export interface OrderDetailProps {
  /** Null renders the resting state (drawer closed / panel placeholder). */
  orderId: number | null;
  onClose?: () => void;
  /** 'drawer' overlays from the right and traps Escape; 'panel' renders inline. */
  variant?: 'drawer' | 'panel';
  /** Footer verb bar. The clerk passes the single next step here. */
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
  const t = useT();
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
      {/* ── Header: what it is, where it has got to, its number ──────────── */}
      <header className="flex-none border-b border-line bg-surface px-5 py-4">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono text-base tabular-nums text-fg-muted">#{order.id}</span>
              <OrderStatusPill status={order.status} />
              {collecting && <CollectionTag />}
            </div>
            <div className="mt-2 truncate text-xl font-semibold text-fg">{client?.name}</div>
            <div className="mt-1">
              {order.ecr ? (
                <EcrText ecr={order.ecr} size="lg" />
              ) : (
                <span className="text-base text-fg-muted">No ECR number yet</span>
              )}
            </div>
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
      </header>

      {/* ── Scrolling body ───────────────────────────────────────────────── */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {/* ── What they are getting, and what it costs ──────────────────── */}
        <section className="px-5 py-5">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-lg font-semibold text-fg">{t('What was ordered')}</h3>
            <span
              className={`border px-2 py-0.5 text-base font-semibold ${
                client?.paymentTerms === 'credit' ? TONE_CLASS.warn : TONE_CLASS.success
              }`}
            >
              {client?.paymentTerms === 'credit' ? 'Credit terms' : 'Cash on delivery'}
            </span>
          </div>

          <div className="border border-line">
            <table className="w-full border-collapse text-base">
              <thead>
                <tr className="border-b border-line bg-surface text-base text-fg">
                  <th className="px-3 py-3 text-left font-semibold">{t('Product')}</th>
                  <th className="px-3 py-3 text-right font-semibold">{t('Unit price')}</th>
                  <th className="px-3 py-3 text-right font-semibold">{t('Quantity')}</th>
                  <th className="px-3 py-3 text-right font-semibold">{t('Value')}</th>
                </tr>
              </thead>
              <tbody>
                {order.lines.map((l) => {
                  const p = select.product(s, l.productId);
                  const qty = l.qtyLoaded ?? l.qtyOrdered;
                  const short = qty < l.qtyOrdered;
                  return (
                    <tr key={l.id} className="border-t border-line">
                      <td className="px-3 py-3">
                        <div className="font-medium text-fg">{p?.name}</div>
                        <div className="text-base text-fg-muted">{p?.size}</div>
                      </td>
                      <td className="px-3 py-3 text-right font-mono tabular-nums text-fg-muted">
                        <Money value={l.unitPrice} />
                      </td>
                      <td
                        className={`px-3 py-3 text-right font-mono tabular-nums ${
                          short ? 'font-semibold text-warn-fg' : 'text-fg'
                        }`}
                      >
                        {qty}
                        {short && <span className="text-fg-muted">/{l.qtyOrdered}</span>}
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
                  <td className="px-3 py-3 text-base font-semibold text-fg">{t('Totals')}</td>
                  <td />
                  <td className="px-3 py-3 text-right font-mono tabular-nums text-fg">
                    {totals.loaded || totals.ordered}
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
                <dt className="text-base text-fg-muted">{t('Goods')}</dt>
                <dd className="font-mono text-base tabular-nums text-fg">
                  <Money value={totals.goods} />
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3 px-3 py-2.5">
                <dt className="flex items-center gap-2 text-base text-fg-muted">
                  <Box className="h-4 w-4" /> {t('Service work')}
                  {order.serviceCharges.length > 0 && (
                    <span className="font-mono tabular-nums">({order.serviceCharges.length})</span>
                  )}
                </dt>
                <dd className="font-mono text-base tabular-nums text-fg">
                  <Money value={totals.service} />
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3 bg-surface px-3 py-3">
                <dt className="text-base font-semibold text-fg">{t('Client’s bill')}</dt>
                <dd className="font-mono text-xl font-semibold tabular-nums text-fg">
                  <Money value={totals.value} />
                </dd>
              </div>
            </dl>
          </div>

          <p className="mt-3 text-base text-fg-muted">
            {client?.paymentTerms === 'credit' ? (
              <>Credit client — the value posts against their account, no cash changes hands.</>
            ) : (
              <>
                {collecting ? 'Cash on collection — the counter takes ' : 'Cash on delivery — the driver returns '}
                <span className="font-mono tabular-nums text-fg">
                  <Money value={totals.cash || totals.value} />
                </span>{' '}
                to the gate cashier.
              </>
            )}
          </p>
        </section>

        {/* ── Everything that is not why this was opened ────────────────── */}
        <Disclosure label={t('Details')}>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
            <KV label={t('Location')}>
              {location?.name} <span className="font-mono text-base text-fg-muted">{location?.code}</span>
            </KV>
            <KV label={t('Book type')}>
              {book?.name} <span className="font-mono text-base text-fg-muted">{book?.code}</span>
            </KV>
            <KV label={t('Requested for')}>{fmtDate(order.requestedDate)}</KV>
            {collecting ? (
              <>
                <KV label={t('Vehicle, route and driver')}>{t('None — the client’s own van')}</KV>
                <KV label="Collected by" tone={order.collectedBy ? undefined : 'warn'}>
                  {order.collectedBy ?? 'Not collected yet'}
                </KV>
                <KV label="Collected at">
                  {order.collectedAt ? fmtDateTime(order.collectedAt) : '—'}
                </KV>
              </>
            ) : (
              <>
                <KV label={t('Route')}>{route ? `${route.code} — ${route.name}` : 'Not assigned'}</KV>
                <KV label={t('Vehicle')}>
                  {vehicle ? (
                    <span className="font-mono">
                      {vehicle.registration}
                      <span className="ms-2 font-sans text-base text-fg-muted">
                        {vclass?.name}, holds {vclass?.maxCylinders}
                      </span>
                    </span>
                  ) : (
                    'Not assigned'
                  )}
                </KV>
                <KV label={t('Driver')}>{driver?.name ?? 'Not assigned'}</KV>
              </>
            )}
            <KV label="Taken by">
              {creator?.name} <span className="text-base text-fg-muted">({roleLabel(creator?.role)})</span>
            </KV>
            <KV label="Placed">{fmtDateTime(order.createdAt)}</KV>
            <KV label="Filled">{order.filledAt ? fmtDateTime(order.filledAt) : '—'}</KV>
            <KV label="Oracle customer">
              <span className="font-mono text-base">{client?.oracleCustomerCode}</span>
            </KV>
            <KV label={t('Phone')}>
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

          {order.notes && (
            <p className="mt-4 border border-line px-3 py-2 text-base text-fg">
              <span className="font-semibold">{t('Notes')}:</span> {order.notes}
            </p>
          )}

          {(delivery || confirmation) && (
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {delivery && (
                <div className="border border-line bg-surface p-4">
                  <div className="text-base font-semibold text-fg">What the driver recorded</div>
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
                      <dt className="text-fg-muted">client_ref</dt>
                      <dd className="font-mono text-fg-muted">{delivery.clientRef.slice(0, 13)}…</dd>
                    </div>
                  </dl>
                </div>
              )}
              {confirmation && (
                <div className="border border-line bg-surface p-4">
                  <div className="text-base font-semibold text-fg">How the customer confirmed</div>
                  <dl className="mt-2 space-y-2 text-base">
                    <div className="flex justify-between gap-2">
                      <dt className="text-fg-muted">Method</dt>
                      <dd className="text-fg">{confirmation.method === 'otp' ? 'OTP' : 'Signature'}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-fg-muted">{t('Receipt')}</dt>
                      <dd className="font-mono text-fg">{confirmation.receiptRef}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-fg-muted">{t('Status')}</dt>
                      <dd className={confirmation.status === 'disputed' ? 'text-danger-fg' : 'text-success-fg'}>
                        {confirmation.status}
                      </dd>
                    </div>
                    {confirmation.notes && <p className="pt-1 text-fg-muted">{confirmation.notes}</p>}
                  </dl>
                </div>
              )}
            </div>
          )}

          <div className="mt-5 border-t border-line pt-5">
            <ServiceChargePanel orderId={order.id} />
          </div>
        </Disclosure>

        <Disclosure label={t('History')}>
          <OrderTimeline orderId={order.id} dense title={t('History')} />
        </Disclosure>
      </div>

      {/* ── Action bar ───────────────────────────────────────────────────── */}
      {actions && (
        <footer className="flex-none border-t border-line bg-surface px-5 py-4">{actions}</footer>
      )}
    </div>
  );

  if (variant === 'panel') {
    return <div className={`overflow-hidden border border-line ${className}`}>{body}</div>;
  }

  return (
    <div className="fixed inset-0 z-drawer flex justify-end" role="dialog" aria-modal="true" aria-label={`Order ${order.id}`}>
      <div className="absolute inset-0 bg-scrim" onClick={onClose} aria-hidden="true" />
      <aside
        className={`relative flex h-full w-[46rem] max-w-full flex-col border-s border-line ${className}`}
      >
        {body}
      </aside>
    </div>
  );
}

export default OrderDetail;
