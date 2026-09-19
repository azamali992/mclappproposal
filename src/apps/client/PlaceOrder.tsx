// ─── Client app · Place order ────────────────────────────────────────────────
// Product, quantity, one button.
//
// Single-product, single-quantity by design: the median real order is ONE
// cylinder (p90 is 7). This is a two-tap flow, not a supermarket basket.
//
// Deleted, because none of it is required to place an order: the "delivered to"
// preamble, the same-as-last-time shortcut (that is the whole point of the Home
// screen), the SKU codes, the "per cylinder" sub-labels, the book-type
// explanation, the requested-date picker and the note-for-the-driver box. The
// date defaults to today, which is what it defaulted to before and what almost
// every order asks for.
//
// Plain build: white ground, hairline rules, no shadows or tinted plates. The
// chosen product is marked by a tick AND bold text, never by a tint alone.
// Direction: logical utilities throughout.

import { useMemo, useState } from 'react';
import { useStore, select, api } from '../../core/store';
import type { Order } from '../../core/types';
import { Button, NumberStepper, Modal } from '../../ui/primitives';
import { Check } from '../../ui/icons';
import { useT } from '../../i18n';
import { PKR, useNotify, toDateInput, fmtRelDay } from './OrderTracking';

export interface PlaceOrderProps {
  clientId: number;
  onTrack: (orderId: number) => void;
  onDone: () => void;
}

export default function PlaceOrder({ clientId, onTrack, onDone }: PlaceOrderProps) {
  const t = useT();
  const notify = useNotify();
  const client = useStore((s) => select.client(s, clientId));
  const products = useStore((s) => s.products);
  const orders = useStore((s) => select.ordersForClient(s, clientId));
  const defaultRoute = useStore((s) =>
    client?.defaultRouteId ? select.route(s, client.defaultRouteId) : undefined,
  );
  const locationName = useStore((s) => {
    const locId = defaultRoute?.locationId ?? 1;
    return select.location(s, locId)?.name ?? 'Multan Plant';
  });
  const locationId = defaultRoute?.locationId ?? 1;

  const lastOrder: Order | undefined = orders.find((o) => o.status !== 'CANCELLED');
  const lastLine = lastOrder?.lines[0];

  const [productId, setProductId] = useState<number>(lastLine?.productId ?? products[0]?.id ?? 1);
  const [qty, setQty] = useState<number>(lastLine?.qtyOrdered ?? 1);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [placed, setPlaced] = useState<Order | null>(null);

  // The date field is gone; today is what it always defaulted to.
  const date = toDateInput(new Date());

  const product = products.find((p) => p.id === productId);
  const total = useMemo(() => (product ? product.unitPrice * qty : 0), [product, qty]);

  function submit() {
    if (!product) return;
    setBusy(true);
    try {
      const order = api.placeOrder({
        clientId,
        locationId,
        bookTypeId: product.bookTypeId,
        requestedDate: date,
        lines: [{ productId: product.id, qtyOrdered: qty }],
      });
      setConfirmOpen(false);
      setPlaced(order);
      notify.ok(t('Order #{n} placed.', { n: order.id }));
    } catch (err) {
      setConfirmOpen(false);
      notify.fail(err);
    } finally {
      setBusy(false);
    }
  }

  // ── Success state ──────────────────────────────────────────────────────────
  if (placed) {
    return (
      <div className="flex flex-col gap-6 px-4 pb-10 pt-6">
        <div>
          <h1 className="text-2xl font-bold text-fg">{t('Order placed')}</h1>
          <p className="mt-1 text-md ltr:leading-relaxed text-fg-muted">
            {t('{place} has your request for {when}.', {
              place: locationName,
              when: fmtRelDay(placed.requestedDate, t).toLowerCase(),
            })}
          </p>
        </div>

        <dl className="divide-y divide-line border-y border-line">
          <div className="flex items-baseline justify-between gap-3 py-3">
            <dt className="text-md text-fg-muted">{t('Your reference')}</dt>
            <dd className="font-mono text-md font-bold text-fg" data-num dir="ltr">
              ORD-{placed.id}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-3 py-3">
            <dt className="text-md text-fg-muted">{t('Value')}</dt>
            <dd>
              <PKR
                v={placed.lines.reduce((s, l) => s + l.qtyOrdered * l.unitPrice, 0)}
                className="text-lg font-bold text-fg"
              />
            </dd>
          </div>
        </dl>

        <div className="flex flex-col gap-3">
          <Button variant="primary" size="lg" block onClick={() => onTrack(placed.id)}>
            {t('Track order')}
          </Button>
          <Button variant="secondary" size="lg" block onClick={onDone}>
            {t('Done')}
          </Button>
        </div>
      </div>
    );
  }

  // ── Form ───────────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-full flex-col gap-6 px-4 pb-2 pt-4">
      {/* Product */}
      <section>
        <h2 className="text-lg font-bold text-fg">{t('Product')}</h2>
        <ul
          role="radiogroup"
          aria-label={t('Product')}
          className="-mx-4 mt-2 divide-y divide-line border-y border-line"
        >
          {products.map((p) => {
            const selected = p.id === productId;
            return (
              <li key={p.id}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setProductId(p.id)}
                  className={[
                    'flex min-h-[64px] w-full items-center gap-3 px-4 py-3 text-start',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent',
                    selected ? '' : 'hover:bg-surface-high',
                  ].join(' ')}
                >
                  {/* Chosen is a tick AND bold text — never a tint alone. */}
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center" aria-hidden>
                    {selected && <Check className="h-6 w-6 text-fg" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={['block truncate text-md', selected ? 'font-bold text-fg' : 'text-fg'].join(' ')}
                    >
                      {p.name}
                    </span>
                    <span className="block text-base text-fg-muted">{p.size}</span>
                  </span>
                  <PKR v={p.unitPrice} className="shrink-0 text-md font-bold text-fg" />
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Quantity */}
      <section className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-bold text-fg">{t('Quantity')}</h2>
        <NumberStepper
          value={qty}
          onChange={setQty}
          min={1}
          max={60}
          size="lg"
          unit={t('cyl')}
          aria-label={t('Number of cylinders')}
        />
      </section>

      {/* Total + the one button */}
      <div className="sticky bottom-0 z-20 -mx-4 border-t border-line bg-app px-4 pb-3 pt-3">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <p className="text-md text-fg-muted">{t('Total, ex-tax')}</p>
          <p className="text-xl font-bold text-fg">
            <PKR v={total} />
          </p>
        </div>
        <Button
          variant="primary"
          size="lg"
          block
          disabled={!product || qty < 1}
          onClick={() => setConfirmOpen(true)}
        >
          {t('Review & place order')}
        </Button>
      </div>

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title={t('Place this order?')}>
        <div className="space-y-4">
          <div className="flex items-baseline justify-between gap-3 border-b border-line pb-3">
            <span className="text-md text-fg">
              {qty} × {product?.name}
            </span>
            <PKR v={total} className="text-lg font-bold text-fg" />
          </div>
          <p className="text-md text-fg-muted">
            {product?.size} · {t('For {day}', { day: fmtRelDay(date, t) })} · {locationName}
          </p>
          <div className="flex flex-col gap-3 pt-1">
            <Button variant="primary" size="lg" block loading={busy} onClick={submit}>
              {t('Confirm order')}
            </Button>
            <Button variant="secondary" size="lg" block onClick={() => setConfirmOpen(false)}>
              {t('Back')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
