// ─── NewOrderForm — Path B, an order taken at the sales desk ─────────────────
// Five things and a button: who it is for, how it leaves the plant, what they
// want, how many, place it. Everything the form used to ask for that the
// salesperson never changes is now derived — the warehouse is their own, the
// date is today, and the book type follows the product they picked, which is
// what decides the BB segment of the ECR at dispatch.
//
// Submits through api.placeOrder. Validation lives in the store; this form makes
// the rules visible but never enforces them privately.

import { useMemo, useState } from 'react';
import type { Order } from '../../../core/types';
import { api, useStore, useCurrentUser, select, rateFor, RuleError } from '../../../core/store';
import { Money, NumberStepper } from '../../../ui/primitives';
import { Plus, X, Alert } from '../../../ui/icons';
import { useT } from '../../../i18n';
import { TONE_CLASS, useRuleToast } from '../shared/OrderTable';

const asNumber = (v: any): number => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  const n = Number(v?.target?.value ?? v);
  return Number.isFinite(n) ? n : 0;
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
  // Opens ready to take an order: the first product on the card, qty 6.
  const [lines, setLines] = useState<DraftLine[]>(() => [
    { key: 1, productId: s.products[0]?.id ?? 0, qty: 6 },
  ]);
  const [nextKey, setNextKey] = useState(2);
  const [busy, setBusy] = useState(false);

  const client = select.client(s, clientId);
  const collecting = fulfilment === 'collection';

  // Not asked for: this salesperson's own warehouse, today, and the book the
  // first product belongs to. All three were fields nobody ever changed.
  const locationId = me.locationId ?? s.locations[0]?.id ?? 1;
  const bookTypeId =
    s.products.find((p) => p.id === lines[0]?.productId)?.bookTypeId ?? s.bookTypes[0]?.id ?? 1;

  const totals = useMemo(() => {
    let value = 0;
    let deliveredValue = 0;
    let cylinders = 0;
    for (const l of lines) {
      const p = s.products.find((x) => x.id === l.productId);
      if (!p || l.qty <= 0) continue;
      value += rateFor(p, fulfilment) * l.qty;
      deliveredValue += p.unitPrice * l.qty;
      cylinders += l.qty;
    }
    return { value, cylinders, saving: deliveredValue - value };
  }, [lines, s.products, fulfilment]);

  const headroom = (client?.creditLimit ?? 0) - (client?.outstanding ?? 0);
  const overLimit = client?.paymentTerms === 'credit' && totals.value > headroom;
  const canPlace = me.role === 'sales' || me.role === 'admin' || me.role === 'client';

  const setLine = (key: number, patch: Partial<DraftLine>) =>
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const addLine = () => {
    setLines((prev) => [...prev, { key: nextKey, productId: s.products[0]?.id ?? 0, qty: 1 }]);
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
        requestedDate: new Date().toISOString(),
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
      setLines([{ key: nextKey, productId: s.products[0]?.id ?? 0, qty: 6 }]);
      setNextKey((k) => k + 1);
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
    <div className={`border border-line bg-surface ${className}`}>
      <header className="border-b border-line bg-surface px-4 py-4">
        <h2 className="text-xl font-semibold text-fg">{t('New order')}</h2>
      </header>

      <div className="px-4 py-4">
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
          <span className={labelCls}>{t('Client')}</span>
          <select className={fieldCls} value={clientId} onChange={(e) => setClientId(Number(e.target.value))}>
            {s.clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — {c.area} ({c.paymentTerms})
              </option>
            ))}
          </select>
        </label>

        {/* Credit is the only thing about the client that changes what Oracle
            receives, so it is the only thing still said out loud. */}
        {client?.paymentTerms === 'credit' && (
          <p className={`mt-2 text-base ${overLimit ? 'text-danger-fg' : 'text-warn-fg'}`}>
            {t('Credit')} — <Money value={Math.max(0, headroom)} />{' '}
            {overLimit ? 'left; this order goes past the limit.' : 'left on the account.'}
          </p>
        )}

        {/* ── Delivery or collection ──────────────────────────────────────── */}
        <fieldset className="mt-5">
          <legend className={labelCls}>{t('How does the client get the cylinders?')}</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                { key: 'delivery' as const, title: t('Deliver to client') },
                { key: 'collection' as const, title: t('Client collects from plant') },
              ]
            ).map((opt) => {
              const on = fulfilment === opt.key;
              return (
                <label
                  key={opt.key}
                  className={`flex min-h-12 cursor-pointer items-center gap-3 border px-4 py-3 ${
                    on ? 'border-line bg-surface-high' : 'border-line bg-surface hover:bg-surface-high'
                  }`}
                >
                  <input
                    type="radio"
                    name="fulfilment"
                    className="h-4 w-4 flex-none accent-accent"
                    checked={on}
                    onChange={() => setFulfilment(opt.key)}
                  />
                  <span className={`text-base ${on ? 'font-semibold text-fg' : 'text-fg'}`}>
                    {opt.title}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        {/* ── Lines ───────────────────────────────────────────────────────── */}
        <div className="mt-5">
          <span className={labelCls}>{t('What they are ordering')}</span>
          <ul className="space-y-2">
            {lines.map((l) => {
              const p = s.products.find((x) => x.id === l.productId);
              const rate = p ? rateFor(p, fulfilment) : 0;
              return (
                <li key={l.key} className="flex flex-wrap items-center gap-3">
                  <select
                    className={`${fieldCls} min-w-[16rem] flex-1`}
                    value={l.productId}
                    onChange={(e) => setLine(l.key, { productId: Number(e.target.value) })}
                  >
                    <option value={0}>Choose a product…</option>
                    {s.bookTypes.map((b) => (
                      <optgroup key={b.id} label={b.name}>
                        {s.products
                          .filter((op) => op.bookTypeId === b.id)
                          .map((op) => (
                            <option key={op.id} value={op.id}>
                              {op.name} — {op.size}
                            </option>
                          ))}
                      </optgroup>
                    ))}
                  </select>
                  <NumberStepper
                    value={l.qty}
                    min={1}
                    max={999}
                    aria-label={t('How many')}
                    onChange={(v: any) => setLine(l.key, { qty: Math.max(0, asNumber(v)) })}
                  />
                  <span className="w-28 text-end font-mono text-base tabular-nums text-fg">
                    {p ? <Money value={rate * l.qty} /> : '—'}
                  </span>
                  <button
                    type="button"
                    aria-label="Remove line"
                    disabled={lines.length === 1}
                    onClick={() => setLines((prev) => prev.filter((x) => x.key !== l.key))}
                    className="p-2 text-fg-muted hover:bg-surface-high hover:text-danger-fg disabled:opacity-30 focus:outline-none focus-visible:ring-1 focus-visible:ring-accent"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              );
            })}
          </ul>

          <button
            type="button"
            onClick={addLine}
            className="mt-3 inline-flex items-center gap-2 border border-line px-4 py-2 text-base font-medium text-fg hover:bg-surface-high focus:outline-none focus-visible:ring-1 focus-visible:ring-accent"
          >
            <Plus className="h-4 w-4" /> {t('Add another product')}
          </button>
        </div>
      </div>

      {/* ── Running total + submit ───────────────────────────────────────── */}
      <footer className="flex flex-wrap items-center gap-4 border-t border-line bg-surface px-4 py-4">
        <div>
          <div className="text-base text-fg-muted">{t('Cylinders')}</div>
          <div className="font-mono text-xl tabular-nums text-fg">{totals.cylinders}</div>
        </div>
        <div>
          <div className="text-base text-fg-muted">
            {collecting ? t('Order value at the collection rate') : t('Order value')}
          </div>
          <div className="font-mono text-xl tabular-nums text-fg">
            <Money value={totals.value} />
          </div>
        </div>

        <div className="ms-auto flex items-center gap-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="border border-line px-4 py-2 text-base font-medium text-fg hover:bg-surface-high focus:outline-none focus-visible:ring-1 focus-visible:ring-accent"
            >
              {t('Cancel')}
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
      </footer>
    </div>
  );
}

export default NewOrderForm;
