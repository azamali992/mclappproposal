// ─── Client app · Home ───────────────────────────────────────────────────────
// The reorder-first home screen. Real sales history says the median order is a
// single cylinder, so "same as last time" is one tap, not a checkout flow.
//
// Plain build: white ground, hairline rules, no cards-on-cards, no shadows, no
// watermark. The one accent-filled control on the screen is the primary button;
// everything else is dark text on white. Reading order is priority order:
// what is happening now → the one action → the figures → the history.

import { useState } from 'react';
import { useStore, select, api } from '../../core/store';
import type { Order } from '../../core/types';
import { Button, Modal } from '../../ui/primitives';
import { ChevronRight } from '../../ui/icons';
import { useT } from '../../i18n';
import type { TFn } from '../../i18n';
import {
  PKR,
  N,
  Ecr,
  useNotify,
  headline,
  isLive,
  fmtRelDay,
  fmtTime,
  toDateInput,
} from './OrderTracking';

export interface HomeProps {
  clientId: number;
  onTrack: (orderId: number) => void;
  onConfirm: (orderId: number) => void;
  onReceipt: (orderId: number) => void;
  onPlaceOrder: () => void;
  onSeeAll: () => void;
}

function lineSummary(
  order: Order,
  products: { id: number; name: string; size: string }[],
  t: TFn,
): string {
  if (order.lines.length === 1) {
    const l = order.lines[0];
    const p = products.find((x) => x.id === l.productId);
    return `${l.qtyOrdered} × ${p?.name ?? t('Cylinder')} · ${p?.size ?? ''}`;
  }
  const total = order.lines.reduce((s, l) => s + l.qtyOrdered, 0);
  return t('{p} products · {c} cylinders', { p: order.lines.length, c: total });
}

export default function Home({
  clientId,
  onTrack,
  onConfirm,
  onReceipt,
  onPlaceOrder,
  onSeeAll,
}: HomeProps) {
  const t = useT();
  const notify = useNotify();
  const me = useStore((s) => s.users.find((u) => u.id === s.currentUserId)!);
  const client = useStore((s) => select.client(s, clientId));
  const products = useStore((s) => s.products);
  const orders = useStore((s) => select.ordersForClient(s, clientId));

  const [reorderOpen, setReorderOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const active = orders.find((o) => isLive(o.status));
  const last = orders.find((o) => o.status !== 'CANCELLED');
  const recent = orders.filter((o) => o.id !== active?.id).slice(0, 4);

  // Only ever one accent-filled button on screen: if a delivery is waiting to
  // be confirmed, that is the primary and reorder steps down to secondary.
  const awaitingConfirm = active?.status === 'DELIVERED';

  const heldCylinders = orders.reduce(
    (sum, o) => sum + o.lines.reduce((s, l) => s + ((l.qtyDelivered ?? 0) - (l.qtyReturned ?? 0)), 0),
    0,
  );
  const arriving = orders
    .filter((o) => ['ASSIGNED', 'DISPATCHED'].includes(o.status))
    .reduce((sum, o) => sum + o.lines.reduce((s, l) => s + (l.qtyLoaded ?? l.qtyOrdered), 0), 0);

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? t('Good morning') : hour < 17 ? t('Good afternoon') : t('Good evening');
  const firstName = me.name.split(' ')[0];

  async function doReorder() {
    if (!last) return;
    setBusy(true);
    try {
      const created = api.placeOrder({
        clientId,
        locationId: last.locationId,
        bookTypeId: last.bookTypeId,
        requestedDate: toDateInput(new Date()),
        notes: t('Repeat of order #{n}', { n: last.id }),
        lines: last.lines.map((l) => ({ productId: l.productId, qtyOrdered: l.qtyOrdered })),
      });
      setReorderOpen(false);
      notify.ok(t('Order #{n} placed — no ECR until it is dispatched.', { n: created.id }));
      onTrack(created.id);
    } catch (err) {
      notify.fail(err);
    } finally {
      setBusy(false);
    }
  }

  const credit =
    client?.paymentTerms === 'credit' && client.creditLimit
      ? {
          limit: client.creditLimit,
          outstanding: client.outstanding ?? 0,
          pct: Math.min(100, Math.round(((client.outstanding ?? 0) / client.creditLimit) * 100)),
        }
      : null;

  return (
    <div className="flex flex-col gap-7 px-4 pb-10 pt-4">
      {/* Greeting */}
      <header>
        <p className="text-md text-fg-muted">{greeting},</p>
        <h1 className="text-2xl font-bold text-fg">{firstName}</h1>
        <p className="mt-1 text-md text-fg-muted">
          {client?.name}
          <span> · {client?.area}</span>
        </p>
      </header>

      {/* Active order — status in words, one action per line */}
      {active ? (
        <section className="rounded-lg border border-line p-4" aria-label={t('Active order')}>
          <p className="text-lg font-bold text-fg">{headline(active, t).title}</p>
          <p className="mt-1 text-md text-fg">{lineSummary(active, products, t)}</p>
          <p className="mt-1 text-md text-fg-muted">
            {active.status === 'DISPATCHED'
              ? t('On the vehicle since {time}', { time: fmtTime(active.dispatchedAt, t) })
              : t('For {day}', { day: fmtRelDay(active.requestedDate, t) })}
          </p>
          <p className="mt-1 text-md text-fg-muted" data-num dir="ltr">
            #{active.id}
          </p>

          {active.ecr && (
            <p className="mt-3 flex flex-wrap items-center gap-2 text-md text-fg-muted">
              {t('ECR')} <Ecr v={active.ecr} />
            </p>
          )}

          <div className="mt-4 flex flex-col gap-3">
            {awaitingConfirm && (
              <Button variant="primary" size="lg" block onClick={() => onConfirm(active.id)}>
                {t('Confirm')}
              </Button>
            )}
            <Button variant="secondary" size="lg" block onClick={() => onTrack(active.id)}>
              {t('Track order')}
            </Button>
            {!awaitingConfirm && (
              <Button variant="secondary" size="lg" block onClick={onPlaceOrder}>
                {t('New order')}
              </Button>
            )}
          </div>
        </section>
      ) : (
        <section className="rounded-lg border border-line p-4">
          <p className="text-lg font-bold text-fg">{t('No order in progress')}</p>
          <p className="mt-1 text-md ltr:leading-relaxed text-fg-muted">
            {t('Your last delivery is closed. Reorder below when you need cylinders.')}
          </p>
        </section>
      )}

      {/* Reorder — the one big action on this screen. No fill behind it, no
          cylinder watermark, no scale-on-press: the words carry it. */}
      {last && (
        <section>
          <h2 className="text-md text-fg-muted">{t('Same as last time')}</h2>
          <p className="mt-1 text-xl font-bold text-fg">
            {t('Reorder {what}', { what: lineSummary(last, products, t) })}
          </p>
          <p className="mt-1 text-md text-fg-muted">
            {t('One tap · delivered to {area}', { area: client?.area ?? '' })}
          </p>
          <div className="mt-4 flex flex-col gap-3">
            <Button
              variant={awaitingConfirm ? 'secondary' : 'primary'}
              size="lg"
              block
              onClick={() => setReorderOpen(true)}
            >
              {t('Place order')}
            </Button>
            <Button variant="secondary" size="lg" block onClick={onPlaceOrder}>
              {t('Order something else')}
            </Button>
          </div>
        </section>
      )}

      {/* Account figures — plain label / value lines. No meters, no tints. */}
      <section className="rounded-lg border border-line p-4">
        {credit ? (
          <>
            <h2 className="text-lg font-bold text-fg">{t('Credit account')}</h2>
            <dl className="mt-2 divide-y divide-line">
              <div className="flex items-baseline justify-between gap-3 py-3">
                <dt className="text-md text-fg-muted">{t('Outstanding')}</dt>
                <dd>
                  <PKR v={credit.outstanding} className="text-lg font-bold text-fg" />
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3 py-3">
                <dt className="text-md text-fg-muted">{t('Available')}</dt>
                <dd>
                  <PKR v={credit.limit - credit.outstanding} className="text-md text-fg" />
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3 py-3">
                <dt className="text-md text-fg-muted">{t('Credit limit')}</dt>
                <dd>
                  <PKR v={credit.limit} className="text-md text-fg" />
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3 py-3">
                <dt className="text-md text-fg-muted">{t('Credit used')}</dt>
                <dd className="text-md text-fg" data-num>
                  {t('{n}% used', { n: credit.pct })}
                </dd>
              </div>
            </dl>
          </>
        ) : (
          <>
            <h2 className="text-lg font-bold text-fg">{t('Payment terms')}</h2>
            <p className="mt-2 text-md text-fg">{t('Cash on delivery')}</p>
            <p className="mt-1 text-md ltr:leading-relaxed text-fg-muted">
              {t(
                'The driver collects payment when your cylinders arrive. Your receipt is closed on this phone.',
              )}
            </p>
          </>
        )}
      </section>

      <section className="rounded-lg border border-line p-4">
        <h2 className="text-lg font-bold text-fg">{t('Cylinders with you')}</h2>
        <p className="mt-2 text-2xl font-bold text-fg">
          <N v={heldCylinders} />
        </p>
        <p className="mt-1 text-md text-fg-muted">{t('delivered minus empties returned')}</p>
        {arriving > 0 && (
          <p className="mt-1 text-md text-fg">
            {t('{n} arriving on today’s vehicle', { n: arriving })}
          </p>
        )}
      </section>

      {/* Recent orders */}
      <section>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-fg">{t('Recent orders')}</h2>
          <button
            type="button"
            onClick={onSeeAll}
            className="-me-2 min-h-[48px] px-2 text-md font-bold text-accent underline underline-offset-4 hover:bg-surface-high focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {t('See all')}
          </button>
        </div>
        {recent.length === 0 ? (
          <p className="mt-2 text-md text-fg-muted">
            {t('No earlier orders on this account yet.')}
          </p>
        ) : (
          <ul className="-mx-4 mt-2 divide-y divide-line border-y border-line">
            {recent.map((o) => (
              <li key={o.id}>
                <button
                  type="button"
                  onClick={() => (isLive(o.status) ? onTrack(o.id) : onReceipt(o.id))}
                  className="flex min-h-[72px] w-full items-center gap-3 px-4 py-3 text-start hover:bg-surface-high focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-md font-bold text-fg">
                      {lineSummary(o, products, t)}
                    </span>
                    <span className="block text-base text-fg-muted">
                      {fmtRelDay(o.createdAt, t)} ·{' '}
                      {o.ecr ? (
                        <span data-num dir="ltr">
                          {t('ECR')} {o.ecr}
                        </span>
                      ) : (
                        t('No ECR yet')
                      )}
                    </span>
                    <span
                      className={[
                        'block text-base',
                        o.status === 'DISPUTED' ? 'font-bold text-danger-fg' : 'text-fg-muted',
                      ].join(' ')}
                    >
                      {headline(o, t).title}
                    </span>
                  </span>
                  <span className="shrink-0 text-end">
                    <PKR
                      v={o.lines.reduce((s, l) => s + (l.qtyDelivered ?? l.qtyOrdered) * l.unitPrice, 0)}
                      className="block text-md font-bold text-fg"
                    />
                  </span>
                  <ChevronRight className="h-5 w-5 shrink-0 text-fg-muted rtl:-scale-x-100" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Reorder confirmation — states what the system will do next */}
      <Modal
        open={reorderOpen}
        onClose={() => setReorderOpen(false)}
        title={t('Repeat your last order?')}
      >
        {last && (
          <div className="space-y-4">
            <p className="text-md ltr:leading-relaxed text-fg">
              {t('This places a new order for {what} at {where}, requested for today.', {
                what: lineSummary(last, products, t),
                where: client?.name ?? '',
              })}
            </p>
            <div>
              <p className="text-md font-bold text-fg">{t('What happens next')}</p>
              <p className="mt-1 text-md ltr:leading-relaxed text-fg-muted">
                {t(
                  'The plant fills and loads it. No ECR bill number exists yet — one is allocated at the gate when your vehicle is dispatched, and it can never be reissued.',
                )}
              </p>
            </div>
            <div className="flex items-baseline justify-between gap-3 border-t border-line pt-3">
              <span className="text-md text-fg-muted">{t('Estimated value')}</span>
              <PKR
                v={last.lines.reduce((s, l) => s + l.qtyOrdered * l.unitPrice, 0)}
                className="text-lg font-bold text-fg"
              />
            </div>
            <div className="flex flex-col gap-3 pt-1">
              <Button variant="primary" size="lg" block loading={busy} onClick={doReorder}>
                {t('Place order')}
              </Button>
              <Button variant="secondary" size="lg" block onClick={() => setReorderOpen(false)}>
                {t('Cancel')}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
