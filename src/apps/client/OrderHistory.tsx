// ─── Client app · Order history & receipts ───────────────────────────────────
// Every past delivery, with the receipt attached. The paper process could not
// do this at all: the customer's copy was a carbon slip in a drawer.
//
// Plain build: white ground, hairline rules. The receipt is no longer dressed
// as a paper slip — the perforated tear edge, the dashed rules and the card
// shadow are gone. It is a plain list of labelled facts, which is what a dealer
// actually reads off it.

import { useMemo, useState } from 'react';
import { useStore, select } from '../../core/store';
import type { Order } from '../../core/types';
import { EmptyState, PipelineTracker } from '../../ui/primitives';
import { ChevronRight } from '../../ui/icons';
import { useT } from '../../i18n';
import type { TFn } from '../../i18n';
import {
  PKR,
  N,
  Ecr,
  headline,
  isLive,
  isClosed,
  fmtDate,
  fmtDateTime,
  fmtRelDay,
} from './OrderTracking';
import type { Tone } from './OrderTracking';

/** Status text colour — only where the status carries a consequence. */
const TONE_TEXT: Record<Tone, string> = {
  neutral: 'text-fg-muted',
  info: 'text-fg-muted',
  warn: 'font-bold text-warn-fg',
  success: 'font-bold text-success-fg',
  danger: 'font-bold text-danger-fg',
};

type Filter = 'all' | 'live' | 'done' | 'issues';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'live', label: 'In progress' },
  { key: 'done', label: 'Completed' },
  { key: 'issues', label: 'Issues' },
];

export interface OrderHistoryProps {
  clientId: number;
  onOpen: (orderId: number) => void;
}

export default function OrderHistory({ clientId, onOpen }: OrderHistoryProps) {
  const t = useT();
  const orders = useStore((s) => select.ordersForClient(s, clientId));
  const products = useStore((s) => s.products);
  const [filter, setFilter] = useState<Filter>('all');

  const shown = useMemo(
    () =>
      orders.filter((o) => {
        if (filter === 'live') return isLive(o.status) && o.status !== 'DISPUTED';
        if (filter === 'done') return isClosed(o.status);
        if (filter === 'issues') return o.status === 'DISPUTED' || o.status === 'CANCELLED';
        return true;
      }),
    [orders, filter],
  );

  const totalSpend = orders
    .filter((o) => isClosed(o.status))
    .reduce(
      (s, o) => s + o.lines.reduce((t2, l) => t2 + (l.qtyDelivered ?? l.qtyOrdered) * l.unitPrice, 0),
      0,
    );

  function summary(o: Order): string {
    if (o.lines.length === 1) {
      const p = products.find((x) => x.id === o.lines[0].productId);
      return `${o.lines[0].qtyOrdered} × ${p?.name ?? t('Cylinder')} · ${p?.size ?? ''}`;
    }
    return t('{p} products · {c} cylinders', {
      p: o.lines.length,
      c: o.lines.reduce((s, l) => s + l.qtyOrdered, 0),
    });
  }

  return (
    <div className="flex flex-col gap-5 px-4 pb-10 pt-4">
      <header>
        <h1 className="text-2xl font-bold text-fg">{t('Your orders')}</h1>
        <p className="mt-1 text-md text-fg-muted">{t('{n} orders', { n: orders.length })}</p>
        <p className="mt-1 flex flex-wrap items-baseline gap-x-2 text-md text-fg-muted">
          {t('Delivered to date')}
          <PKR v={totalSpend} className="font-bold text-fg" />
        </p>
      </header>

      {/* Filters — plain buttons; the chosen one is bold with a dark border */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {FILTERS.map((f) => {
          const on = filter === f.key;
          return (
            <button
              key={f.key}
              type="button"
              aria-pressed={on}
              onClick={() => setFilter(f.key)}
              className={[
                'min-h-[48px] shrink-0 rounded-md border px-4 text-md',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                on
                  ? 'border-fg font-bold text-fg'
                  : 'border-line-strong font-normal text-fg-muted hover:text-fg hover:underline',
              ].join(' ')}
            >
              {t(f.label)}
            </button>
          );
        })}
      </div>

      {shown.length === 0 ? (
        <EmptyState
          title={t('Nothing here yet')}
          description={
            filter === 'issues'
              ? t('No disputed or cancelled orders — good news.')
              : t('No orders match this filter.')
          }
        />
      ) : (
        <ul className="-mx-4 divide-y divide-line border-y border-line">
          {shown.map((o) => (
            <li key={o.id}>
              <button
                type="button"
                onClick={() => onOpen(o.id)}
                className="flex min-h-[80px] w-full items-center gap-3 px-4 py-3 text-start hover:bg-surface-high focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-md font-bold text-fg">{summary(o)}</span>
                  <span className="mt-0.5 block text-base text-fg-muted">
                    {fmtDate(o.createdAt, t)} ·{' '}
                    {o.ecr ? (
                      <span data-num dir="ltr">
                        {t('ECR')} {o.ecr}
                      </span>
                    ) : (
                      t('No ECR yet')
                    )}
                  </span>
                  <span className={['mt-0.5 block text-base', TONE_TEXT[headline(o, t).tone]].join(' ')}>
                    {headline(o, t).title}
                  </span>
                </span>
                <span className="shrink-0 text-end">
                  <PKR
                    v={o.lines.reduce((s, l) => s + (l.qtyDelivered ?? l.qtyOrdered) * l.unitPrice, 0)}
                    className="block text-md font-bold text-fg"
                  />
                  {o.oracleDocNo && (
                    <span className="text-base text-success-fg">{t('invoiced')}</span>
                  )}
                </span>
                <ChevronRight className="h-5 w-5 shrink-0 text-fg-muted rtl:-scale-x-100" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Receipt ──────────────────────────────────────────────────────────────────

function confirmedBy(method: string | undefined, t: TFn): string {
  return method === 'otp' ? t('Confirmed by one-time code') : t('Confirmed by signature');
}

export function OrderReceipt({ orderId, clientId }: { orderId: number; clientId: number }) {
  const t = useT();
  const order = useStore((s) => s.orders.find((o) => o.id === orderId));
  const client = useStore((s) => select.client(s, clientId));
  const products = useStore((s) => s.products);
  const delivery = useStore((s) => s.deliveryEvents.find((d) => d.orderId === orderId));
  const confirmation = useStore((s) =>
    s.confirmationEvents.find((c) => c.orderId === orderId && c.status === 'confirmed'),
  );
  const driver = useStore((s) => (order?.driverId ? select.user(s, order.driverId) : undefined));
  const vehicle = useStore((s) => (order?.vehicleId ? select.vehicle(s, order.vehicleId) : undefined));

  if (!order || order.clientId !== clientId) {
    return (
      <div className="px-5 py-10">
        <EmptyState
          title={t('Receipt not available')}
          description={t('This order is not on your account.')}
        />
      </div>
    );
  }

  const ordered = order.lines.reduce((s, l) => s + l.qtyOrdered, 0);
  const delivered = order.lines.reduce((s, l) => s + (l.qtyDelivered ?? 0), 0);
  const empties = order.lines.reduce((s, l) => s + (l.qtyReturned ?? 0), 0);
  const value = order.lines.reduce((s, l) => s + (l.qtyDelivered ?? l.qtyOrdered) * l.unitPrice, 0);
  const h = headline(order, t);

  return (
    <div className="px-4 pb-10 pt-4">
      {/* Receipt — a plain document: headings, rules, facts. No paper mimicry. */}
      <article className="flex flex-col gap-6">
        <header>
          <p className="text-md text-fg-muted">{t('Multan Chemicals Ltd')}</p>
          <h1 className="mt-1 text-xl font-bold text-fg">
            {t('Empty Cylinder Return / delivery receipt')}
          </h1>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-md text-fg-muted">
            {order.ecr ? (
              <Ecr v={order.ecr} />
            ) : (
              <span>{t('ECR not issued — allocated at dispatch')}</span>
            )}
          </p>
          <p className={['mt-2 text-md', TONE_TEXT[h.tone]].join(' ')}>{h.title}</p>
        </header>

        <dl className="divide-y divide-line border-y border-line">
          <div className="flex items-baseline justify-between gap-3 py-3">
            <dt className="shrink-0 text-md text-fg-muted">{t('Customer')}</dt>
            <dd className="min-w-0 text-end">
              <span className="block text-md text-fg">{client?.name}</span>
              <span className="block text-base text-fg-muted" data-num dir="ltr">
                {client?.oracleCustomerCode}
              </span>
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-3 py-3">
            <dt className="shrink-0 text-md text-fg-muted">{t('Order')}</dt>
            <dd className="min-w-0 text-end">
              <span className="block text-md text-fg" data-num dir="ltr">
                ORD-{order.id}
              </span>
              <span className="block text-base text-fg-muted">{fmtDate(order.createdAt, t)}</span>
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-3 py-3">
            <dt className="shrink-0 text-md text-fg-muted">{t('Delivered')}</dt>
            <dd className="min-w-0 text-end text-md text-fg">
              {order.deliveredAt
                ? fmtDateTime(order.deliveredAt, t)
                : t('Due {day}', { day: fmtRelDay(order.requestedDate, t) })}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-3 py-3">
            <dt className="shrink-0 text-md text-fg-muted">{t('Vehicle / driver')}</dt>
            <dd className="min-w-0 text-end">
              <span className="block text-md text-fg" data-num dir="ltr">
                {vehicle?.registration ?? '—'}
              </span>
              <span className="block text-base text-fg-muted">
                {driver?.name ?? t('Not yet assigned')}
              </span>
            </dd>
          </div>
        </dl>

        {/* Lines */}
        <div>
          <h2 className="text-lg font-bold text-fg">{t('Item')}</h2>
          <div className="mt-2 grid grid-cols-[1fr_auto_auto_auto] items-baseline gap-x-4 border-b border-line pb-2 text-base text-fg-muted">
            <span />
            <span className="text-end">{t('Ord')}</span>
            <span className="text-end">{t('Del')}</span>
            <span className="text-end">{t('Empt')}</span>
          </div>
          <ul className="divide-y divide-line border-b border-line">
            {order.lines.map((l) => {
              const p = products.find((x) => x.id === l.productId);
              const shortLine = l.qtyDelivered != null && l.qtyDelivered < l.qtyOrdered;
              return (
                <li
                  key={l.id}
                  className="grid grid-cols-[1fr_auto_auto_auto] items-baseline gap-x-4 py-3"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-md text-fg">{p?.name}</span>
                    <span className="block text-base text-fg-muted">
                      {p?.size} · <PKR v={l.unitPrice} /> {t('each')}
                    </span>
                    {l.reasonCode && (
                      <span className="mt-0.5 block text-base text-warn-fg">{l.reasonCode}</span>
                    )}
                  </span>
                  <span className="text-end text-md text-fg-muted">
                    <N v={l.qtyOrdered} />
                  </span>
                  <span
                    className={[
                      'text-end text-md font-bold',
                      shortLine ? 'text-warn-fg' : 'text-fg',
                    ].join(' ')}
                  >
                    {l.qtyDelivered != null ? <N v={l.qtyDelivered} /> : '—'}
                  </span>
                  <span className="text-end text-md text-fg-muted">
                    {l.qtyReturned != null ? <N v={l.qtyReturned} /> : '—'}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Totals */}
        <dl className="divide-y divide-line border-y border-line">
          <div className="flex items-baseline justify-between gap-3 py-3">
            <dt className="text-md text-fg-muted">{t('Cylinders ordered / delivered')}</dt>
            <dd className="text-md text-fg">
              <N v={ordered} /> / <N v={delivered} />
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-3 py-3">
            <dt className="text-md text-fg-muted">{t('Empties returned')}</dt>
            <dd className="text-md text-fg">
              <N v={empties} />
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-3 py-3">
            <dt className="text-md text-fg-muted">
              {client?.paymentTerms === 'credit' ? t('Charged to credit') : t('Value')}
            </dt>
            <dd>
              <PKR v={value} className="text-lg font-bold text-fg" />
            </dd>
          </div>
          {delivery && (
            <div className="flex items-baseline justify-between gap-3 py-3">
              <dt className="text-md text-fg-muted">{t('Cash paid to driver')}</dt>
              <dd>
                <PKR v={delivery.cashCollected} className="text-lg font-bold text-fg" />
              </dd>
            </div>
          )}
        </dl>

        {/* MCL's own processing stages, in MCL's vocabulary */}
        <div>
          <h2 className="text-lg font-bold text-fg">{t('MCL processing')}</h2>
          <div className="mt-2">
            <PipelineTracker current={order.status} compact />
          </div>
        </div>

        {/* Confirmation + Oracle */}
        <footer className="border-t border-line pt-4">
          {confirmation ? (
            <p className="flex flex-wrap items-center gap-x-2 text-md text-fg-muted">
              {confirmedBy(confirmation.method, t)} ·{' '}
              <span data-num dir="ltr">
                {confirmation.receiptRef}
              </span>
            </p>
          ) : (
            <p className="text-md text-fg-muted">{t('Not yet confirmed.')}</p>
          )}
          <p className="mt-2 flex flex-wrap items-center gap-x-2 text-md">
            {order.oracleDocNo ? (
              <>
                <span className="text-fg-muted">{t('Invoiced in Oracle as')}</span>
                <span className="font-mono text-fg" data-num dir="ltr">
                  {order.oracleDocNo}
                </span>
              </>
            ) : (
              <span className="text-fg-muted">
                {t('Not yet posted to Oracle — posting follows cash reconciliation.')}
              </span>
            )}
          </p>
          {order.notes && (
            <p className="mt-2 text-md ltr:leading-relaxed text-fg-muted">
              {t('Note')}: <span className="text-fg">{order.notes}</span>
            </p>
          )}
        </footer>
      </article>
    </div>
  );
}
