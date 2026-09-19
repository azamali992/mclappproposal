// ─── NewOrderForm — Path B, an order taken at the sales desk ─────────────────
// The salesperson is on the phone with the client, so the client's commercial
// position is shown before anything else: cash or credit, what they already owe,
// how much headroom is left. Credit changes what Oracle receives at the end of
// the chain, so it is stated here at the start of it.
//
// Submits through api.placeOrder. Validation lives in the store; this form makes
// the rules visible but never enforces them privately.

import { useMemo, useState } from 'react';
import type { Order } from '../../../core/types';
import { api, useStore, useCurrentUser, select, rateFor, RuleError } from '../../../core/store';
import { Money, NumberStepper } from '../../../ui/primitives';
import { Plus, X, Alert, Clipboard, Cylinder, Truck, Box } from '../../../ui/icons';
import { useT } from '../../../i18n';
import { TONE_CLASS, useRuleToast } from '../shared/OrderTable';

const asNumber = (v: any): number => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  const n = Number(v?.target?.value ?? v);
  return Number.isFinite(n) ? n : 0;
};

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

interface DraftLine {
  key: number;
  productId: number;
  qty: number;
}

export interface NewOrderFormProps {
  /** Fired with the Order the store returned. */
  onPlaced?: (order: Order) => void;
  onCancel?: () => void;
  defaultClientId?: number;
  className?: string;
}

export function NewOrderForm({ onPlaced, onCancel, defaultClientId, className = '' }: NewOrderFormProps) {
  const t = useT();
  const s = useStore((st) => st);
  const me = useCurrentUser();
  const toast = useRuleToast();

  const [fulfilment, setFulfilment] = useState<'delivery' | 'collection'>('delivery');
  const [clientId, setClientId] = useState<number>(defaultClientId ?? s.clients[0]?.id ?? 0);
  const [locationId, setLocationId] = useState<number>(me.locationId ?? s.locations[0]?.id ?? 1);
  const [bookTypeId, setBookTypeId] = useState<number>(s.bookTypes[0]?.id ?? 1);
  const [requestedDate, setRequestedDate] = useState<string>(todayISO());
  const [notes, setNotes] = useState('');
  // Opens ready to take an order: first product of the default book, qty 6.
  const [lines, setLines] = useState<DraftLine[]>(() => [
    { key: 1, productId: s.products.find((p) => p.bookTypeId === (s.bookTypes[0]?.id ?? 1))?.id ?? 0, qty: 6 },
  ]);
  const [nextKey, setNextKey] = useState(2);
  const [busy, setBusy] = useState(false);

  const client = select.client(s, clientId);
  const bookProducts = useMemo(
    () => s.products.filter((p) => p.bookTypeId === bookTypeId),
    [s.products, bookTypeId],
  );

  // Prices follow the chosen rate card. `rateFor` is the store's own function,
  // the same one `api.placeOrder` uses to snapshot the line at order time — so
  // what the client is quoted here is exactly what lands on the order.
  const collecting = fulfilment === 'collection';

  const totals = useMemo(() => {
    let value = 0;
    let deliveredValue = 0;
    let cylinders = 0;
    let deposits = 0;
    for (const l of lines) {
      const p = s.products.find((x) => x.id === l.productId);
      if (!p || l.qty <= 0) continue;
      value += rateFor(p, fulfilment) * l.qty;
      deliveredValue += p.unitPrice * l.qty;
      cylinders += l.qty;
      deposits += p.depositPerCylinder * l.qty;
    }
    return { value, deliveredValue, saving: deliveredValue - value, cylinders, deposits };
  }, [lines, s.products, fulfilment]);

  const headroom = (client?.creditLimit ?? 0) - (client?.outstanding ?? 0);
  const overLimit = client?.paymentTerms === 'credit' && totals.value > headroom;
  const canPlace = me.role === 'sales' || me.role === 'admin' || me.role === 'client';

  const setLine = (key: number, patch: Partial<DraftLine>) =>
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const addLine = () => {
    setLines((prev) => [...prev, { key: nextKey, productId: bookProducts[0]?.id ?? 0, qty: 1 }]);
    setNextKey((k) => k + 1);
  };

  const submit = () => {
    setBusy(true);
    try {
      const order = api.placeOrder({
        clientId,
        locationId,
        bookTypeId,
        fulfilment,
        requestedDate: new Date(`${requestedDate}T09:00:00`).toISOString(),
        notes: notes.trim() || undefined,
        lines: lines
          .filter((l) => l.productId > 0)
          .map((l) => ({ productId: l.productId, qtyOrdered: l.qty })),
      });
      toast(
        collecting
          ? t(
              'Order #{id} placed for {client} — {n} cylinders to collect from the plant, priced off the ex-delivery card ({saving} less than delivered).',
              {
                id: order.id,
                client: client?.name ?? '',
                n: totals.cylinders,
                saving: `Rs ${totals.saving.toLocaleString('en-PK')}`,
              },
            )
          : t('Order #{id} placed for {client} — {n} cylinders. It is now at the top of the warehouse queue.', {
              id: order.id,
              client: client?.name ?? '',
              n: totals.cylinders,
            }),
        'success',
        t('Order placed'),
      );
      setLines([{ key: nextKey, productId: bookProducts[0]?.id ?? 0, qty: 6 }]);
      setNextKey((k) => k + 1);
      setNotes('');
      onPlaced?.(order);
    } catch (err) {
      const msg = err instanceof RuleError ? err.message : (err as Error).message;
      const rule = err instanceof RuleError ? err.rule : 'ERROR';
      toast(msg, 'danger', `Order refused — ${rule}`);
    } finally {
      setBusy(false);
    }
  };

  const fieldCls =
    'w-full border border-line bg-surface px-3 py-2.5 text-base text-fg placeholder:text-fg-muted focus:border-fg focus:outline-none focus-visible:ring-1 focus-visible:ring-accent';
  const labelCls = 'mb-1.5 block text-base font-medium text-fg';

  return (
    <div className={`flex h-full min-h-0 flex-col overflow-hidden border border-line bg-surface ${className}`}>
      <header className="flex-none border-b border-line bg-surface px-4 py-4">
        <div className="flex items-center gap-2">
          <Clipboard className="h-5 w-5 text-fg-muted" />
          <h2 className="text-xl font-semibold text-fg">{t('New order')}</h2>
          <span className="ms-auto text-base text-fg-muted">
            Taken by {me.name} · origin <span className="text-fg-muted">sales desk</span>
          </span>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3.5">
        {!canPlace && (
          <div className={`mb-4 flex gap-2 border px-3 py-3 text-base ${TONE_CLASS.danger}`}>
            <Alert className="mt-0.5 h-4 w-4 flex-none" />
            <span>
              You are acting as {me.name} ({me.role}). Only sales or the client themselves may place an
              order — submit it anyway and the API will say so.
            </span>
          </div>
        )}

        {/* ── Client ──────────────────────────────────────────────────────── */}
        <label className="block">
          <span className={labelCls}>Client</span>
          <select className={fieldCls} value={clientId} onChange={(e) => setClientId(Number(e.target.value))}>
            {s.clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — {c.area} ({c.paymentTerms})
              </option>
            ))}
          </select>
        </label>

        {client && (
          <div className="mt-3 border border-line bg-surface p-4">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span
                className={`border px-2 py-0.5 text-base font-semibold ${
                  client.paymentTerms === 'credit' ? TONE_CLASS.warn : TONE_CLASS.success
                }`}
              >
                {client.paymentTerms === 'credit' ? 'Credit terms' : 'Cash on delivery'}
              </span>
              <span className="text-base font-medium text-fg">{client.name}</span>
              <span className="font-mono text-base text-fg-muted">{client.oracleCustomerCode}</span>
              <span className="ms-auto text-base text-fg-muted">
                confirms by {client.confirmMethod === 'otp' ? 'OTP' : 'signature'} · {client.contactNumber}
              </span>
            </div>

            {client.paymentTerms === 'credit' ? (
              <>
                <dl className="mt-3 grid grid-cols-3 gap-4 text-base">
                  <div>
                    <dt className="text-base text-fg-muted">Already owed</dt>
                    <dd className="font-mono tabular-nums text-warn-fg">
                      <Money value={client.outstanding ?? 0} />
                    </dd>
                  </div>
                  <div>
                    <dt className="text-base text-fg-muted">Credit limit</dt>
                    <dd className="font-mono tabular-nums text-fg">
                      <Money value={client.creditLimit ?? 0} />
                    </dd>
                  </div>
                  <div>
                    <dt className="text-base text-fg-muted">Room left</dt>
                    <dd className={`font-mono tabular-nums ${overLimit ? 'text-danger-fg' : 'text-fg'}`}>
                      <Money value={headroom} />
                    </dd>
                  </div>
                </dl>
                <p className="mt-3 text-base leading-relaxed text-fg-muted">
                  Credit client — no cash is collected at the door. The delivery posts to Oracle as an
                  invoice against {client.oracleCustomerCode} with{' '}
                  <span className="font-mono">cash_receipt: null</span>, and the gate cashier expects nothing
                  back for it.
                </p>
                {overLimit && (
                  <p className="mt-2 text-base font-semibold text-danger-fg">
                    This order would take the account past its limit by{' '}
                    <Money value={totals.value - headroom} />. Credit control is out of scope for the demo —
                    flagged here, not blocked.
                  </p>
                )}
              </>
            ) : (
              <p className="mt-3 text-base leading-relaxed text-fg-muted">
                {collecting ? 'Cash client — the counter takes ' : 'Cash client — the driver collects '}
                <span className="font-mono tabular-nums text-fg">
                  <Money value={totals.value} />
                </span>{' '}
                {collecting
                  ? 'when their van arrives, and it goes to the gate cashier with the rest of the day’s cash.'
                  : 'at the door and hands it to the gate cashier.'}{' '}
                The Oracle payload carries a matching
                <span className="font-mono"> cash_receipt</span>, and only a matched count posts.
              </p>
            )}
          </div>
        )}

        {/* ── Delivery or collection ──────────────────────────────────────── */}
        <fieldset className="mt-5">
          <legend className={labelCls}>{t('How does the client get the cylinders?')}</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {([
              {
                key: 'delivery' as const,
                icon: <Truck className="h-5 w-5 text-fg-muted" />,
                title: t('Deliver to client'),
                body: t('MCL loads a vehicle and runs it out on a route. Delivered rate — transport included.'),
              },
              {
                key: 'collection' as const,
                icon: <Box className="h-5 w-5 text-fg-muted" />,
                title: t('Client collects from plant'),
                body: t('The client sends their own van. No vehicle, no route, no driver — and the ex-delivery rate applies.'),
              },
            ]).map((opt) => {
              const on = fulfilment === opt.key;
              return (
                <label
                  key={opt.key}
                  className={`flex min-h-12 cursor-pointer gap-3 border px-4 py-3 ${
                    on ? 'border-line bg-surface-high' : 'border-line bg-surface hover:bg-surface-high'
                  }`}
                >
                  <input
                    type="radio"
                    name="fulfilment"
                    className="mt-1 h-4 w-4 flex-none accent-accent"
                    checked={on}
                    onChange={() => setFulfilment(opt.key)}
                  />
                  <span className="min-w-0">
                    <span className="flex items-center gap-2">
                      {opt.icon}
                      <span className={`text-base ${on ? 'font-semibold text-fg' : 'text-fg'}`}>
                        {opt.title}
                      </span>
                    </span>
                    <span className="mt-1 block text-base leading-relaxed text-fg-muted">{opt.body}</span>
                  </span>
                </label>
              );
            })}
          </div>
          {collecting && (
            <div className={`mt-3 flex gap-2 border px-3 py-3 text-base ${TONE_CLASS.info}`}>
              <Box className="mt-0.5 h-4 w-4 flex-none" />
              <span className="leading-relaxed">
                <span className="font-semibold">{t('Collection rate — transport not included')}.</span>{' '}
                {t(
                  'Every line below is priced off the separate ex-delivery rate card, and the prices are copied onto the order when it is placed. No vehicle, route or driver is assigned; the clerk releases the cylinders at the counter.',
                )}
              </span>
            </div>
          )}
        </fieldset>

        {/* ── Fulfilment ──────────────────────────────────────────────────── */}
        <div className="mt-5 grid grid-cols-3 gap-4">
          <label className="block">
            <span className={labelCls}>Fulfil from</span>
            <select className={fieldCls} value={locationId} onChange={(e) => setLocationId(Number(e.target.value))}>
              {s.locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} ({l.code})
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={labelCls}>Book type</span>
            <select
              className={fieldCls}
              value={bookTypeId}
              onChange={(e) => {
                const id = Number(e.target.value);
                setBookTypeId(id);
                setLines((prev) =>
                  prev.map((l) =>
                    s.products.find((p) => p.id === l.productId)?.bookTypeId === id ? l : { ...l, productId: 0 },
                  ),
                );
              }}
            >
              {s.bookTypes.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.code} — {b.name}
                </option>
              ))}
            </select>
            <span className="mt-1.5 block text-base text-fg-muted">
              Decides the BB segment of the ECR at dispatch.
            </span>
          </label>
          <label className="block">
            <span className={labelCls}>Requested date</span>
            <input
              type="date"
              className={fieldCls}
              value={requestedDate}
              onChange={(e) => setRequestedDate(e.target.value)}
            />
          </label>
        </div>

        {/* ── Lines ───────────────────────────────────────────────────────── */}
        <div className="mt-6">
          <div className="mb-2 flex items-baseline justify-between">
            <h3 className="text-lg font-semibold text-fg">{t('What they are ordering')}</h3>
            <span className="text-base text-fg-muted">
              {collecting
                ? t('Collection rate — transport not included')
                : t('Delivered rate — transport included')}
            </span>
          </div>

          <div className="border border-line">
            <table className="w-full border-collapse text-base">
              <thead>
                <tr className="border-b border-line bg-surface text-base text-fg">
                  <th className="px-3 py-3 text-left font-semibold">{t('Product')}</th>
                  <th className="px-3 py-3 text-right font-semibold">
                    {collecting ? t('Collection rate') : t('Unit price')}
                  </th>
                  {collecting && (
                    <th className="px-3 py-3 text-right font-semibold">{t('Saving on this line')}</th>
                  )}
                  <th className="px-3 py-3 text-center font-semibold">{t('How many')}</th>
                  <th className="px-3 py-3 text-right font-semibold">{t('Line total')}</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {lines.map((l) => {
                  const p = s.products.find((x) => x.id === l.productId);
                  const rate = p ? rateFor(p, fulfilment) : 0;
                  const perCylSaving = p ? p.unitPrice - rate : 0;
                  return (
                    <tr key={l.key} className="border-t border-line">
                      <td className="px-3 py-3">
                        <select
                          className={fieldCls}
                          value={l.productId}
                          onChange={(e) => setLine(l.key, { productId: Number(e.target.value) })}
                        >
                          <option value={0}>Choose a product…</option>
                          {bookProducts.map((op) => (
                            <option key={op.id} value={op.id}>
                              {op.name} — {op.size} ({op.sku})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-3 text-right font-mono tabular-nums text-fg">
                        {p ? <Money value={rate} /> : '—'}
                        {p && collecting && (
                          <span className="block text-base text-fg-muted line-through">
                            <Money value={p.unitPrice} />
                          </span>
                        )}
                      </td>
                      {collecting && (
                        <td className="px-3 py-3 text-right font-mono tabular-nums text-success-fg">
                          {p ? (
                            <>
                              <Money value={perCylSaving * l.qty} />
                              <span className="block text-base text-fg-muted">
                                <Money value={perCylSaving} /> {t('per cylinder')}
                              </span>
                            </>
                          ) : (
                            '—'
                          )}
                        </td>
                      )}
                      <td className="px-3 py-3">
                        <div className="flex justify-center">
                          <NumberStepper
                            value={l.qty}
                            min={1}
                            max={999}
                            onChange={(v: any) => setLine(l.key, { qty: Math.max(0, asNumber(v)) })}
                          />
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right font-mono tabular-nums text-fg">
                        {p ? <Money value={rate * l.qty} /> : '—'}
                      </td>
                      <td className="px-2 py-3 text-right">
                        <button
                          type="button"
                          aria-label="Remove line"
                          disabled={lines.length === 1}
                          onClick={() => setLines((prev) => prev.filter((x) => x.key !== l.key))}
                          className="p-2 text-fg-muted hover:bg-surface-high hover:text-danger-fg disabled:opacity-30 focus:outline-none focus-visible:ring-1 focus-visible:ring-accent"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            onClick={addLine}
            className="mt-3 inline-flex items-center gap-2 border border-line px-4 py-2 text-base font-medium text-fg hover:bg-surface-high focus:outline-none focus-visible:ring-1 focus-visible:ring-accent"
          >
            <Plus className="h-4 w-4" /> {t('Add another product')}
          </button>
        </div>

        <label className="mt-6 block">
          <span className={labelCls}>{t('Notes for the warehouse')}</span>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. customer asked for a morning slot"
            className={fieldCls}
          />
        </label>
      </div>

      {/* ── Running total + submit ───────────────────────────────────────── */}
      <footer className="flex-none border-t border-line bg-surface px-4 py-4">
        <div className="flex flex-wrap items-end gap-6">
          <div>
            <div className="text-base text-fg-muted">Cylinders</div>
            <div className="flex items-baseline gap-2 font-mono text-xl tabular-nums text-fg">
              <Cylinder className="h-5 w-5 text-fg-muted" />
              {totals.cylinders}
            </div>
          </div>
          <div>
            <div className="text-base text-fg-muted">
              {collecting ? t('Order value at the collection rate') : t('Order value')}
            </div>
            <div className="font-mono text-xl tabular-nums text-fg">
              <Money value={totals.value} />
            </div>
            {collecting && (
              <div className="text-base text-fg-muted line-through">
                <Money value={totals.deliveredValue} />
              </div>
            )}
          </div>
          {collecting && (
            <div>
              <div className="text-base text-fg-muted">{t('Saving — transport not charged')}</div>
              <div className="font-mono text-xl tabular-nums text-success-fg">
                <Money value={totals.saving} />
              </div>
            </div>
          )}
          <div>
            <div className="text-base text-fg-muted">{t('Deposit held on cylinders')}</div>
            <div className="font-mono text-xl tabular-nums text-fg-muted">
              <Money value={totals.deposits} />
            </div>
          </div>

          <div className="ms-auto flex items-center gap-2">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="border border-line px-4 py-2 text-base font-medium text-fg hover:bg-surface-high focus:outline-none focus-visible:ring-1 focus-visible:ring-accent"
              >
                Discard
              </button>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={submit}
              className="inline-flex items-center gap-2 bg-accent px-5 py-2.5 text-base font-semibold text-accent-fg hover:bg-accent-hover active:bg-accent-press disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <Plus className="h-5 w-5" /> {t('Place order')}
            </button>
          </div>
        </div>
        <p className="mt-3 text-base text-fg-muted">
          {collecting
            ? t(
                'Placing creates the order at Placed and drops it into the warehouse queue as a collection. No vehicle is assigned and no ECR is issued until the clerk releases it at the counter.',
              )
            : t(
                'Placing creates the order at Placed and drops it straight into the warehouse queue. No ECR is issued until the clerk confirms dispatch.',
              )}
        </p>
      </footer>
    </div>
  );
}

export default NewOrderForm;
