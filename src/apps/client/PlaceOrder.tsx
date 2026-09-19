// ─── Client app · Place order ────────────────────────────────────────────────
// Single-product, single-quantity by design: the median real order is ONE
// cylinder (p90 is 7). This is a two-tap flow, not a supermarket basket.
//
// Plain build: white ground, hairline rules, no shadows or tinted plates. The
// chosen product is marked by a tick AND bold text, never by a tint alone.
// Direction: logical utilities throughout.

import { useMemo, useState } from 'react';
import { useStore, select, api } from '../../core/store';
import type { Order } from '../../core/types';
import { Button, Input, Textarea, Field, NumberStepper, Modal } from '../../ui/primitives';
import { Check } from '../../ui/icons';
import { useT } from '../../i18n';
import { PKR, N, useNotify, toDateInput, fmtRelDay } from './OrderTracking';

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
  const bookTypes = useStore((s) => s.bookTypes);
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
  const [date, setDate] = useState<string>(toDateInput(new Date()));
  const [notes, setNotes] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [placed, setPlaced] = useState<Order | null>(null);

  const product = products.find((p) => p.id === productId);
  const total = useMemo(() => (product ? product.unitPrice * qty : 0), [product, qty]);
  const bookType = bookTypes.find((b) => b.id === product?.bookTypeId);

  function submit() {
    if (!product) return;
    setBusy(true);
    try {
      const order = api.placeOrder({
        clientId,
        locationId,
        bookTypeId: product.bookTypeId,
        requestedDate: date,
        notes: notes.trim() || undefined,
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
    const p = products.find((x) => x.id === placed.lines[0].productId);
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
            <dt className="text-md text-fg-muted">{t('Product')}</dt>
            <dd className="text-end text-md text-fg">
              {p?.name} · {p?.size}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-3 py-3">
            <dt className="text-md text-fg-muted">{t('Quantity')}</dt>
            <dd className="text-end text-md text-fg">
              {t('{n} cylinders', { n: placed.lines[0].qtyOrdered })}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-3 py-3">
            <dt className="text-md text-fg-muted">{t('Requested for')}</dt>
            <dd className="text-end text-md text-fg">{fmtRelDay(placed.requestedDate, t)}</dd>
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

        {/* The paper-process detail that proves the system is honest */}
        <div>
          <h2 className="text-lg font-bold text-fg">{t('No ECR number yet')}</h2>
          <p className="mt-1 text-md text-fg">
            {t('An ECR bill number is allocated only at dispatch, at the gate.')}
          </p>
          <p className="mt-1 text-md ltr:leading-relaxed text-fg-muted">
            {t(
              'Until your cylinders physically leave {place} this order carries no bill number — so an order that is never dispatched can never burn one. You will see the ECR on the tracking screen the moment the vehicle leaves.',
              { place: locationName },
            )}
          </p>
        </div>

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
      <header>
        <h1 className="text-2xl font-bold text-fg">{t('New order')}</h1>
        <p className="mt-1 text-md ltr:leading-relaxed text-fg-muted">
          {t('Delivered to {address} from {place}.', {
            address: client?.address ?? '',
            place: locationName,
          })}
        </p>
      </header>

      {lastLine && (
        <button
          type="button"
          onClick={() => {
            setProductId(lastLine.productId);
            setQty(lastLine.qtyOrdered);
          }}
          className="flex min-h-[56px] w-full items-center justify-between gap-3 rounded-md border border-line-strong px-4 py-3 text-start hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <span>
            <span className="block text-base text-fg-muted">{t('Same as last time')}</span>
            <span className="block text-md font-bold text-fg">
              {lastLine.qtyOrdered} × {products.find((p) => p.id === lastLine.productId)?.name}
            </span>
          </span>
        </button>
      )}

      {/* Product picker */}
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
                      className={[
                        'block truncate text-md',
                        selected ? 'font-bold text-fg' : 'text-fg',
                      ].join(' ')}
                    >
                      {p.name}
                    </span>
                    <span className="block text-base text-fg-muted">
                      {p.size} · <span dir="ltr">{p.sku}</span>
                    </span>
                  </span>
                  <span className="shrink-0 text-end">
                    <PKR v={p.unitPrice} className="block text-md font-bold text-fg" />
                    <span className="text-base text-fg-muted">{t('per cylinder')}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        {bookType && (
          <p className="mt-2 text-md ltr:leading-relaxed text-fg-muted">
            {t(
              'Billed against the {book} book — the book decides which ECR series your bill number comes from.',
              { book: bookType.name },
            )}
          </p>
        )}
      </section>

      {/* Quantity */}
      <section>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-fg">{t('Quantity')}</h2>
            <p className="mt-1 text-md text-fg-muted">{t('Most of your orders are one cylinder.')}</p>
          </div>
          <NumberStepper
            value={qty}
            onChange={setQty}
            min={1}
            max={60}
            size="lg"
            unit={t('cyl')}
            aria-label={t('Number of cylinders')}
          />
        </div>
      </section>

      {/* Date + note */}
      <section className="flex flex-col gap-4">
        <Field label={t('Requested delivery date')}>
          <Input
            type="date"
            size="lg"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            min={toDateInput(new Date())}
          />
        </Field>
        <Field label={t('Note for the driver (optional)')}>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder={t('Gate 2 after 10am, ask for the shift engineer…')}
          />
        </Field>
      </section>

      {/* Sticky total + submit */}
      <div className="sticky bottom-0 z-20 -mx-4 border-t border-line bg-app px-4 pb-3 pt-3">
        <div>
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-md text-fg-muted">{t('Total, ex-tax')}</p>
              <p className="text-xl font-bold text-fg">
                <PKR v={total} />
              </p>
            </div>
            <p className="text-md text-fg-muted">
              {qty} × {product?.size ?? ''}
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
      </div>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={t('Place this order?')}
      >
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
          <div>
            <p className="text-md font-bold text-fg">{t('What the system will do')}</p>
            <p className="mt-1 text-md ltr:leading-relaxed text-fg-muted">
              {t(
                'The order goes to the {place} filling queue. No ECR bill number is allocated now — it is issued at dispatch and can never be reissued. You can cancel through MCL before the vehicle leaves.',
                { place: locationName },
              )}
            </p>
          </div>
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
