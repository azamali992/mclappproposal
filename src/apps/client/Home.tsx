// ─── Client app · Home ───────────────────────────────────────────────────────
// Two things: the order that is happening now, and a button to order again.
//
// Gone: the greeting, the credit ledger, the cylinders-with-you tile, the
// recent-orders list and the second and third buttons under each of them. Every
// one of those facts is still in the app — credit and cylinders on Account,
// past orders on History — and none of them is why a dealer opens the phone.
// They open it to see whether the gas is coming, or to ask for more.
//
// Plain build: white ground, hairline rules, no cards-on-cards, no shadows, no
// watermark. The one accent-filled control on the screen is the primary button.

import { useState } from 'react';
import { useStore, select, api } from '../../core/store';
import type { Order } from '../../core/types';
import { Button, Modal } from '../../ui/primitives';
import { useT } from '../../i18n';
import type { TFn } from '../../i18n';
import { PKR, Ecr, useNotify, headline, isLive, fmtRelDay, fmtTime, toDateInput } from './OrderTracking';

export interface HomeProps {
  clientId: number;
  onTrack: (orderId: number) => void;
  onConfirm: (orderId: number) => void;
  onPlaceOrder: () => void;
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

export default function Home({ clientId, onTrack, onConfirm, onPlaceOrder }: HomeProps) {
  const t = useT();
  const notify = useNotify();
  const client = useStore((s) => select.client(s, clientId));
  const products = useStore((s) => s.products);
  const orders = useStore((s) => select.ordersForClient(s, clientId));

  const [reorderOpen, setReorderOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const active = orders.find((o) => isLive(o.status));
  const last = orders.find((o) => o.status !== 'CANCELLED');

  // Only ever one accent-filled button on screen: if a delivery is waiting to
  // be confirmed, that is the primary and reorder steps down to secondary.
  const awaitingConfirm = active?.status === 'DELIVERED';

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

  return (
    <div className="flex flex-col gap-7 px-4 pb-10 pt-6">
      {/* ── What is happening now ──────────────────────────────────────── */}
      {active ? (
        <section className="rounded-lg border border-line p-4" aria-label={t('Active order')}>
          <p className="text-xl font-bold text-fg">{headline(active, t).title}</p>
          <p className="mt-1 text-md text-fg">{lineSummary(active, products, t)}</p>
          <p className="mt-1 text-md text-fg-muted">
            {active.status === 'DISPATCHED'
              ? t('On the vehicle since {time}', { time: fmtTime(active.dispatchedAt, t) })
              : t('For {day}', { day: fmtRelDay(active.requestedDate, t) })}
          </p>

          {active.ecr && (
            <p className="mt-3 flex flex-wrap items-center gap-2 text-md text-fg-muted">
              {t('ECR')} <Ecr v={active.ecr} />
            </p>
          )}

          <div className="mt-4">
            {awaitingConfirm ? (
              <Button variant="primary" size="lg" block onClick={() => onConfirm(active.id)}>
                {t('Confirm')}
              </Button>
            ) : (
              <Button variant="secondary" size="lg" block onClick={() => onTrack(active.id)}>
                {t('Track order')}
              </Button>
            )}
          </div>
        </section>
      ) : (
        <section className="rounded-lg border border-line p-4">
          <p className="text-xl font-bold text-fg">{t('No order in progress')}</p>
        </section>
      )}

      {/* ── Order again. The one big action on this screen. ─────────────── */}
      {last ? (
        <section>
          <h2 className="text-md text-fg-muted">{t('Same as last time')}</h2>
          <p className="mt-1 text-xl font-bold text-fg">
            {t('Reorder {what}', { what: lineSummary(last, products, t) })}
          </p>
          <Button
            variant={awaitingConfirm ? 'secondary' : 'primary'}
            size="lg"
            block
            className="mt-4"
            onClick={() => setReorderOpen(true)}
          >
            {t('Place order')}
          </Button>
        </section>
      ) : (
        <Button variant="primary" size="lg" block onClick={onPlaceOrder}>
          {t('New order')}
        </Button>
      )}

      {/* Reorder confirmation — one sentence, the value, and the button. */}
      <Modal open={reorderOpen} onClose={() => setReorderOpen(false)} title={t('Repeat your last order?')}>
        {last && (
          <div className="space-y-4">
            <p className="text-md ltr:leading-relaxed text-fg">
              {t('This places a new order for {what} at {where}, requested for today.', {
                what: lineSummary(last, products, t),
                where: client?.name ?? '',
              })}
            </p>
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
