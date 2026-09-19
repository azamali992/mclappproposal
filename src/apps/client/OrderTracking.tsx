// ─── Client app · Order tracking ─────────────────────────────────────────────
// "Where is my gas?" — the single biggest customer-experience win over the
// paper ECR book. Also the base module for the client app: the shared
// formatting adapters and the pipeline model live here so every other client
// screen speaks the same language.
//
// Plain build: white ground, hairline rules, no tinted nodes, no rails and no
// pulsing "live" ring. The step the order is at is bold text plus a filled dot.
// Direction: logical properties only (ms/me/ps/pe/start/end); directional
// glyphs mirror with `rtl:-scale-x-100`.

import { useMemo } from 'react';
import { useStore, select, RuleError } from '../../core/store';
import type { Order, OrderStatus } from '../../core/types';
import { Money, Qty, EcrTag, useToast, Button, EmptyState } from '../../ui/primitives';
import { Check } from '../../ui/icons';
import { useT } from '../../i18n';
import type { TFn } from '../../i18n';

/** Identity translator — lets the pure formatters below run outside a provider. */
const raw: TFn = (en) => en;

// ── Primitive adapters ───────────────────────────────────────────────────────
// Every money / quantity / ECR render in the client app funnels through these,
// so the design-system surface is reconciled in exactly one place.

export function PKR({ v, className }: { v: number; className?: string }) {
  return (
    <span className={className} data-num>
      <Money value={v} />
    </span>
  );
}

export function N({ v }: { v: number }) {
  return <Qty value={v} />;
}

export function Ecr({ v }: { v: string }) {
  return <EcrTag value={v} />;
}

/**
 * Toast adapter. `fail` is the only error path in the client app: a RuleError
 * is shown verbatim with its rule tag, because the rejection IS the product —
 * it proves the rule lives on MCL's server and not in this phone.
 */
export function useNotify() {
  const toast = useToast();
  const t = useT();
  return useMemo(
    () => ({
      ok: (title: string, description?: string) => toast.success(title, description),
      info: (title: string, description?: string) => toast.info(title, description),
      fail: (err: unknown) => {
        if (err instanceof RuleError) {
          toast.error(err.message, t('Rejected by MCL · rule {rule}', { rule: err.rule }));
        } else {
          toast.error(
            t('That could not be completed'),
            err instanceof Error ? err.message : String(err),
          );
        }
      },
    }),
    [toast, t],
  );
}

// ── Formatting ───────────────────────────────────────────────────────────────
// Every formatter takes an optional translator. Digits always stay Latin —
// that is what Pakistani business paperwork uses — only the words translate.

const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function fmtTime(iso?: string, t: TFn = raw): string {
  if (!iso) return '';
  const d = new Date(iso);
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const ampm = h < 12 ? t('am') : t('pm');
  return `${((h + 11) % 12) + 1}:${m} ${ampm}`;
}

export function fmtDate(iso?: string, t: TFn = raw): string {
  if (!iso) return '';
  const d = new Date(iso);
  return `${t(DAY[d.getDay()])} ${d.getDate()} ${t(MON[d.getMonth()])}`;
}

export function fmtDateTime(iso?: string, t: TFn = raw): string {
  if (!iso) return '';
  return `${fmtDate(iso, t)} · ${fmtTime(iso, t)}`;
}

/** "Today" / "Yesterday" / "Tue 16 Sep" — customer language, not timestamps. */
export function fmtRelDay(iso?: string, t: TFn = raw): string {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const days = Math.round(
    (new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() -
      new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) /
      86400000,
  );
  if (days === 0) return t('Today');
  if (days === -1) return t('Yesterday');
  if (days === 1) return t('Tomorrow');
  return fmtDate(iso, t);
}

export function toDateInput(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ── The customer-facing pipeline ─────────────────────────────────────────────
// Seven steps in the customer's words. The store's state machine is the truth;
// this is only its presentation. Labels are English source strings — the key.

export interface ClientStep {
  key: string;
  label: string;
  hint: string;
}

export const CLIENT_STEPS: ClientStep[] = [
  { key: 'placed', label: 'Order received', hint: 'We have your request at the plant' },
  { key: 'filled', label: 'Cylinders filled', hint: 'Your cylinders are filled and staged' },
  { key: 'assigned', label: 'Loaded & scheduled', hint: 'On a vehicle, on a route' },
  { key: 'dispatched', label: 'Dispatched', hint: 'ECR bill number issued at the gate' },
  { key: 'enroute', label: 'Out for delivery', hint: 'On its way to your address' },
  { key: 'delivered', label: 'Delivered', hint: 'Cylinders handed over, empties collected' },
  { key: 'confirmed', label: 'Confirmed by you', hint: 'Receipt closed — nothing left to sign' },
];

/** Index of the step the order is *currently* at. */
export function stepIndexFor(status: OrderStatus): number {
  switch (status) {
    case 'PLACED':
      return 0;
    case 'FILLED':
      return 1;
    case 'ASSIGNED':
      return 2;
    case 'DISPATCHED':
      return 4; // dispatched is done; "out for delivery" is live
    case 'DELIVERED':
    case 'DISPUTED':
      return 5;
    default:
      return 6; // CONFIRMED, RECONCILED, MISMATCH_HELD, POST_FAILED, POSTED
  }
}

export function isLive(status: OrderStatus): boolean {
  return ['PLACED', 'FILLED', 'ASSIGNED', 'DISPATCHED', 'DELIVERED', 'DISPUTED'].includes(status);
}

export function isClosed(status: OrderStatus): boolean {
  return ['CONFIRMED', 'RECONCILED', 'MISMATCH_HELD', 'POST_FAILED', 'POSTED'].includes(status);
}

/** Timestamp shown against each completed step. */
function stepTime(order: Order, key: string): string | undefined {
  switch (key) {
    case 'placed':
      return order.createdAt;
    case 'filled':
      return order.filledAt;
    case 'assigned':
      return order.assignedAt;
    case 'dispatched':
    case 'enroute':
      return order.dispatchedAt;
    case 'delivered':
      return order.deliveredAt;
    case 'confirmed':
      return order.confirmedAt;
    default:
      return undefined;
  }
}

export type Tone = 'neutral' | 'info' | 'warn' | 'success' | 'danger';

/** One-line headline for the top of any card showing this order. */
export function headline(order: Order, t: TFn = raw): { title: string; sub: string; tone: Tone } {
  switch (order.status) {
    case 'PLACED':
      return {
        title: t('Order received'),
        sub: t('Waiting for the plant to fill your cylinders'),
        tone: 'neutral',
      };
    case 'FILLED':
      return {
        title: t('Cylinders filled'),
        sub: t('Waiting for a vehicle and a route'),
        tone: 'info',
      };
    case 'ASSIGNED':
      return {
        title: t('Loaded for delivery'),
        sub: t('Leaving the plant shortly'),
        tone: 'info',
      };
    case 'DISPATCHED':
      return {
        title: t('On the way to you'),
        sub: t('Left the plant — ECR issued'),
        tone: 'info',
      };
    case 'DELIVERED':
      return {
        title: t('Delivered — please confirm'),
        sub: t('Confirm from your phone to close the receipt'),
        tone: 'warn',
      };
    case 'DISPUTED':
      return {
        title: t('Under review'),
        sub: t('You raised an issue — MCL is looking at it'),
        tone: 'danger',
      };
    case 'CANCELLED':
      return { title: t('Cancelled'), sub: t('This order was cancelled'), tone: 'neutral' };
    case 'POSTED':
      return {
        title: t('Completed & invoiced'),
        sub: t('Posted to MCL accounts'),
        tone: 'success',
      };
    default:
      return {
        title: t('Confirmed'),
        sub: t('Thank you — your receipt is closed'),
        tone: 'success',
      };
  }
}

// ── The vertical tracker ─────────────────────────────────────────────────────

/**
 * Plain step list. No rail, no tinted nodes, no pulse: a done step gets a tick,
 * the step the order is at now gets a filled dot AND a bold label, and steps
 * still to come are plain grey text. "Here" is said by weight, not by motion.
 */
export function ClientPipeline({ order, dense = false }: { order: Order; dense?: boolean }) {
  const t = useT();
  const current = stepIndexFor(order.status);
  const disputed = order.status === 'DISPUTED';

  return (
    <ol className="divide-y divide-line">
      {CLIENT_STEPS.map((step, i) => {
        const done = i < current;
        const live = i === current;
        const at = stepTime(order, step.key);
        return (
          <li key={step.key} className={['flex gap-3', dense ? 'py-2.5' : 'py-3'].join(' ')}>
            <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center" aria-hidden>
              {done ? (
                <Check className="h-5 w-5 text-fg-muted" />
              ) : live ? (
                <span
                  className={[
                    'h-3 w-3 rounded-full',
                    disputed ? 'bg-danger-fg' : 'bg-fg',
                  ].join(' ')}
                />
              ) : (
                <span className="h-1.5 w-1.5 rounded-full bg-line-strong" />
              )}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span
                  className={[
                    'text-md ltr:leading-7',
                    live ? 'font-bold text-fg' : done ? 'text-fg' : 'text-fg-muted',
                  ].join(' ')}
                >
                  {t(step.label)}
                </span>
                {at && (done || live) && (
                  <span className="text-base text-fg-muted" data-num>
                    {fmtTime(at, t)}
                  </span>
                )}
              </div>
              {(live || !dense) && (
                <p className="text-base ltr:leading-relaxed text-fg-muted">
                  {live && disputed ? t('We are reviewing the issue you raised.') : t(step.hint)}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

// ── Screen ───────────────────────────────────────────────────────────────────

export interface OrderTrackingProps {
  orderId: number;
  clientId: number;
  onConfirm: (orderId: number) => void;
  onViewReceipt: (orderId: number) => void;
}

export default function OrderTracking({
  orderId,
  clientId,
  onConfirm,
  onViewReceipt,
}: OrderTrackingProps) {
  const t = useT();
  const order = useStore((s) => s.orders.find((o) => o.id === orderId));
  const products = useStore((s) => s.products);
  const vehicle = useStore((s) => (order?.vehicleId ? select.vehicle(s, order.vehicleId) : undefined));
  const driver = useStore((s) => (order?.driverId ? select.user(s, order.driverId) : undefined));
  const route = useStore((s) => (order?.routeId ? select.route(s, order.routeId) : undefined));
  const location = useStore((s) => (order ? select.location(s, order.locationId) : undefined));

  // A client may only ever see their own order — enforced in the API, mirrored here.
  if (!order || order.clientId !== clientId) {
    return (
      <div className="px-5 py-10">
        <EmptyState
          title={t('Order not available')}
          description={t('This order does not belong to your account.')}
        />
      </div>
    );
  }

  const h = headline(order, t);
  const dispatched = !!order.ecr;
  const value = order.lines.reduce((s, l) => s + (l.qtyDelivered ?? l.qtyOrdered) * l.unitPrice, 0);

  return (
    <div className="flex flex-col gap-7 px-4 pb-10 pt-4">
      {/* Heading */}
      <section>
        <p className="text-md text-fg-muted" data-num>
          {t('Order #{n}', { n: order.id })}
        </p>
        <h1 className="mt-1 text-2xl font-bold text-fg">
          {order.status === 'DISPATCHED' ? t('Live') : h.title}
        </h1>
        <p className="mt-1 text-md ltr:leading-relaxed text-fg-muted">{h.sub}</p>
      </section>

      {/* Vehicle — only real once dispatched */}
      {dispatched ? (
        <section className="rounded-lg border border-line p-4">
          <p className="flex flex-wrap items-center gap-2 text-md text-fg-muted">
            {t('ECR bill number')} <Ecr v={order.ecr!} />
          </p>
          <dl className="mt-2 divide-y divide-line">
            <div className="flex items-baseline justify-between gap-3 py-3">
              <dt className="text-md text-fg-muted">{t('Vehicle')}</dt>
              <dd className="text-md font-bold text-fg" data-num dir="ltr">
                {vehicle?.registration ?? '—'}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-3 py-3">
              <dt className="text-md text-fg-muted">{t('Driver')}</dt>
              <dd className="text-md font-bold text-fg">{driver?.name ?? '—'}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-3 py-3">
              <dt className="text-md text-fg-muted">{t('Route')}</dt>
              <dd className="text-end text-md text-fg">
                {route ? `${route.name} (${route.code})` : '—'}
              </dd>
            </div>
          </dl>
          <p className="mt-2 text-md text-fg-muted">
            {t('Left {place} at {time}', {
              place: location?.name ?? t('the plant'),
              time: fmtTime(order.dispatchedAt, t),
            })}
          </p>
        </section>
      ) : (
        <section className="rounded-lg border border-line p-4">
          <p className="text-md font-bold text-fg">{t('No ECR yet')}</p>
          <p className="mt-1 text-md ltr:leading-relaxed text-fg-muted">
            {t(
              'Your ECR bill number is allocated at the gate the moment the vehicle is dispatched — never before. An order waiting at the plant does not burn a bill number.',
            )}
          </p>
        </section>
      )}

      {/* Progress */}
      <section>
        <h2 className="text-lg font-bold text-fg">{t('Progress')}</h2>
        <div className="mt-2">
          <ClientPipeline order={order} />
        </div>
      </section>

      {/* What was ordered */}
      <section>
        <h2 className="text-lg font-bold text-fg">
          {order.deliveredAt ? t('Delivered') : t('Requested')}
        </h2>
        <p className="mt-1 text-md text-fg-muted">
          {t('For {day}', { day: fmtRelDay(order.requestedDate, t) })}
        </p>
        <ul className="mt-2 divide-y divide-line border-y border-line">
          {order.lines.map((l) => {
            const p = products.find((x) => x.id === l.productId);
            const qty = l.qtyDelivered ?? l.qtyOrdered;
            return (
              <li key={l.id} className="flex min-h-[56px] items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-md text-fg">{p?.name}</p>
                  <p className="text-base text-fg-muted">{p?.size}</p>
                </div>
                <div className="text-end">
                  <p className="text-md font-bold text-fg">
                    <N v={qty} /> <span className="font-normal text-fg-muted">{t('cyl')}</span>
                  </p>
                  {l.qtyDelivered != null && l.qtyDelivered !== l.qtyOrdered && (
                    <p className="text-base text-warn-fg">
                      {t('ordered {n}', { n: l.qtyOrdered })}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        <div className="flex items-baseline justify-between gap-3 py-3">
          <span className="text-md text-fg-muted">{t('Order value')}</span>
          <PKR v={value} className="text-lg font-bold text-fg" />
        </div>
        {order.notes && (
          <p className="text-md ltr:leading-relaxed text-fg-muted">
            <span>{t('Your note')}: </span>
            {order.notes}
          </p>
        )}
      </section>

      {/* Action */}
      {order.status === 'DELIVERED' && (
        <Button variant="primary" size="lg" block onClick={() => onConfirm(order.id)}>
          {t('Confirm this delivery')}
        </Button>
      )}
      {isClosed(order.status) && (
        <Button variant="secondary" size="lg" block onClick={() => onViewReceipt(order.id)}>
          {t('View receipt')}
        </Button>
      )}
    </div>
  );
}
