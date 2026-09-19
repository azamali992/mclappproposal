// ─── CollectionModal — the counter handover ──────────────────────────────────
// The client's own van is at the gate. This is the collection equivalent of the
// driver's delivery capture: confirm what physically goes out, record WHO took
// it (the counter's only audit trail — there is no driver, no signature pad and
// no GPS), take the cash if they are a cash account, and hand over.
//
// Everything is enforced in the store: `api.recordCollection` refuses a delivery
// order and refuses an empty collector name. Both rejections are shown verbatim.

import { useEffect, useMemo, useState } from 'react';
import {
  api,
  useStore,
  useCurrentUser,
  select,
  RuleError,
  serviceChargeTotal,
} from '../../../core/store';
import { Money, NumberStepper } from '../../../ui/primitives';
import { X, Alert, CheckCircle, Box, Banknote } from '../../../ui/icons';
import { useT } from '../../../i18n';
import { EcrText, TONE_CLASS, useRuleToast } from '../shared/OrderTable';

const asNumber = (v: any): number => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  const n = Number(v?.target?.value ?? v);
  return Number.isFinite(n) ? n : 0;
};

export interface CollectionModalProps {
  /** Null keeps the modal closed. */
  orderId: number | null;
  onClose: () => void;
  onCollected?: (orderId: number) => void;
}

export function CollectionModal({ orderId, onClose, onCollected }: CollectionModalProps) {
  const t = useT();
  const s = useStore((st) => st);
  const me = useCurrentUser();
  const toast = useRuleToast();

  const order = orderId == null ? undefined : select.order(s, orderId);
  const client = order ? select.client(s, order.clientId) : undefined;

  const [collectedBy, setCollectedBy] = useState('');
  const [handed, setHanded] = useState<Record<number, number>>({});
  const [empties, setEmpties] = useState<Record<number, number>>({});
  const [cash, setCash] = useState<number | null>(null);

  // Reset whenever a different order is opened.
  useEffect(() => {
    setCollectedBy('');
    setCash(null);
    setHanded(
      Object.fromEntries((order?.lines ?? []).map((l) => [l.id, l.qtyLoaded ?? l.qtyOrdered])),
    );
    setEmpties(Object.fromEntries((order?.lines ?? []).map((l) => [l.id, 0])));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  useEffect(() => {
    if (orderId == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [orderId, onClose]);

  const bill = useMemo(() => {
    if (!order) return { goods: 0, service: 0, total: 0 };
    const goods = order.lines.reduce((sum, l) => sum + (handed[l.id] ?? 0) * l.unitPrice, 0);
    const service = serviceChargeTotal(order);
    return { goods, service, total: goods + service };
  }, [order, handed]);

  if (orderId == null || !order) return null;

  // Credit clients pay nothing at the counter — `expectedCash` returns 0 for
  // them once this is recorded, so no cash field is shown at all.
  const isCash = client?.paymentTerms !== 'credit';
  const due = isCash ? bill.total : 0;
  const taken = cash ?? due;
  const variance = taken - due;

  const released = order.lines.reduce((n, l) => n + (l.qtyLoaded ?? l.qtyOrdered), 0);
  const going = order.lines.reduce((n, l) => n + (handed[l.id] ?? 0), 0);
  const back = order.lines.reduce((n, l) => n + (empties[l.id] ?? 0), 0);
  const short = going < released;
  const nameOk = collectedBy.trim().length > 0;
  const ready = order.status === 'DISPATCHED';

  const submit = () => {
    try {
      api.recordCollection({
        orderId: order.id,
        collectedBy: collectedBy.trim(),
        cashCollected: isCash ? taken : 0,
        lines: order.lines.map((l) => ({
          lineId: l.id,
          qtyDelivered: handed[l.id] ?? 0,
          qtyReturned: empties[l.id] ?? 0,
        })),
      });
      toast(
        isCash
          ? t('Order #{id} collected by {who}. Rs {cash} taken at the counter — it now goes to the gate cashier.', {
              id: order.id,
              who: collectedBy.trim(),
              cash: taken.toLocaleString('en-PK'),
            })
          : t('Order #{id} collected by {who}. It posts against {code} — nothing to collect at the counter.', {
              id: order.id,
              who: collectedBy.trim(),
              code: client?.oracleCustomerCode ?? 'the account',
            }),
        'success',
        t('Collection recorded'),
      );
      onCollected?.(order.id);
      onClose();
    } catch (err) {
      const msg = err instanceof RuleError ? err.message : (err as Error).message;
      const rule = err instanceof RuleError ? err.rule : 'ERROR';
      toast(msg, 'danger', `${t('Collection refused')} — ${rule}`);
    }
  };

  const inputCls =
    'w-full border border-line bg-surface px-3 py-2.5 text-base text-fg placeholder:text-fg-muted focus:border-fg focus:outline-none focus-visible:ring-1 focus-visible:ring-accent';

  return (
    <div
      className="fixed inset-0 z-modal flex items-center justify-center p-6"
      role="dialog"
      aria-modal="true"
      aria-label={t('Record collection')}
    >
      <div className="absolute inset-0 bg-scrim" onClick={onClose} aria-hidden="true" />

      <div className="relative w-[46rem] max-w-full overflow-hidden border border-line bg-surface">
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <header className="flex items-start gap-3 border-b border-line bg-surface px-5 py-4">
          <span className={`mt-1 border p-2 ${TONE_CLASS.info}`}>
            <Box className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-semibold text-fg">
              {t('Record collection')} — {client?.name}
            </h2>
            <p className="mt-1 text-base text-fg-muted">
              {t('The client’s own vehicle is at the counter. Record what goes out and who takes it.')}
            </p>
          </div>
          <div className="text-end">
            <div className="whitespace-nowrap font-mono text-base tabular-nums text-fg-muted">
              {t('Order')} #{order.id}
            </div>
            <div className="mt-1">
              <EcrText ecr={order.ecr} />
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-2 text-fg-muted hover:bg-surface-high hover:text-fg focus:outline-none focus-visible:ring-1 focus-visible:ring-accent"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="max-h-[62vh] overflow-y-auto px-5 py-5">
          {!ready && (
            <div className={`mb-4 flex gap-2 border px-3 py-3 text-base ${TONE_CLASS.warn}`}>
              <Alert className="mt-0.5 h-4 w-4 flex-none" />
              <span>
                {t(
                  'This order has not been released yet. Release it for collection first — that is where the ECR is allocated.',
                )}
              </span>
            </div>
          )}

          {/* ── Quantities ───────────────────────────────────────────────── */}
          <h3 className="mb-2 text-lg font-semibold text-fg">{t('What leaves the plant')}</h3>
          <table className="w-full border-collapse border border-line text-base">
            <thead>
              <tr className="border-b border-line bg-surface text-base text-fg">
                <th className="px-3 py-3 text-left font-semibold">{t('Product')}</th>
                <th className="px-3 py-3 text-right font-semibold">{t('Released')}</th>
                <th className="px-3 py-3 text-center font-semibold">{t('Handed over')}</th>
                <th className="px-3 py-3 text-center font-semibold">{t('Empties brought back')}</th>
                <th className="px-3 py-3 text-right font-semibold">{t('Value')}</th>
              </tr>
            </thead>
            <tbody>
              {order.lines.map((l) => {
                const p = select.product(s, l.productId);
                const rel = l.qtyLoaded ?? l.qtyOrdered;
                return (
                  <tr key={l.id} className="border-t border-line">
                    <td className="px-3 py-3">
                      <div className="font-medium text-fg">{p?.name}</div>
                      <div className="text-base text-fg-muted">
                        <span className="font-mono">{p?.sku}</span> · {p?.size} ·{' '}
                        <Money value={l.unitPrice} /> {t('each')}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right font-mono tabular-nums text-fg-muted">{rel}</td>
                    <td className="px-3 py-3">
                      <div className="flex justify-center">
                        <NumberStepper
                          value={handed[l.id] ?? 0}
                          min={0}
                          max={rel}
                          aria-label="Handed over"
                          onChange={(v: any) =>
                            setHanded((prev) => ({ ...prev, [l.id]: Math.max(0, Math.min(rel, asNumber(v))) }))
                          }
                        />
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex justify-center">
                        <NumberStepper
                          value={empties[l.id] ?? 0}
                          min={0}
                          max={999}
                          aria-label="Empties brought back"
                          onChange={(v: any) =>
                            setEmpties((prev) => ({ ...prev, [l.id]: Math.max(0, asNumber(v)) }))
                          }
                        />
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right font-mono tabular-nums text-fg">
                      <Money value={(handed[l.id] ?? 0) * l.unitPrice} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-line bg-surface">
                <td className="px-3 py-3 text-base font-semibold text-fg">{t('Totals')}</td>
                <td className="px-3 py-3 text-right font-mono tabular-nums text-fg-muted">{released}</td>
                <td className={`px-3 py-3 text-center font-mono tabular-nums ${short ? 'text-warn-fg' : 'text-fg'}`}>
                  {going}
                </td>
                <td className="px-3 py-3 text-center font-mono tabular-nums text-fg">{back}</td>
                <td className="px-3 py-3 text-right font-mono tabular-nums text-fg">
                  <Money value={bill.goods} />
                </td>
              </tr>
            </tfoot>
          </table>

          {/* ── The bill ─────────────────────────────────────────────────── */}
          <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1 border border-line px-3 py-3 text-base">
            <span className="text-fg-muted">{t('Goods')}</span>
            <span className="font-mono tabular-nums text-fg">
              <Money value={bill.goods} />
            </span>
            <span className="text-fg-muted">+</span>
            <span className="text-fg-muted">{t('Service work')}</span>
            <span className="font-mono tabular-nums text-fg">
              <Money value={bill.service} />
            </span>
            <span className="text-fg-muted">=</span>
            <span className="font-semibold text-fg">{t('Client’s bill')}</span>
            <span className="font-mono text-lg font-semibold tabular-nums text-fg">
              <Money value={bill.total} />
            </span>
            <span className="ms-auto text-base text-fg-muted">
              {t('Collection rate — transport not included')}
            </span>
          </div>

          {/* ── Who took it ──────────────────────────────────────────────── */}
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-base font-medium text-fg">
                {t('Who collected — name, CNIC or vehicle number')}{' '}
                <span className="text-danger-fg">*</span>
              </span>
              <input
                autoFocus
                value={collectedBy}
                onChange={(e) => setCollectedBy(e.target.value)}
                placeholder={t('e.g. Imran Shah, CNIC 17301-…, van LES-2290')}
                className={inputCls}
              />
              <span className="mt-1.5 block text-base text-fg-muted">
                {t('There is no driver and no signature on a collection — this line is the audit trail.')}
              </span>
            </label>

            {isCash ? (
              <label className="block">
                <span className="mb-1.5 block text-base font-medium text-fg">
                  {t('Cash taken at the counter (PKR)')}
                </span>
                <input
                  type="number"
                  inputMode="numeric"
                  value={taken}
                  onChange={(e) => setCash(asNumber(e.target.value))}
                  className={`${inputCls} font-mono tabular-nums`}
                />
                <span className="mt-1.5 block text-base text-fg-muted">
                  {t('Expected')}{' '}
                  <span className="font-mono tabular-nums text-fg">
                    <Money value={due} />
                  </span>
                  {variance !== 0 && (
                    <span className="ms-2 text-warn-fg">
                      {variance < 0 ? t('Short by') : t('Over by')}{' '}
                      <span className="font-mono tabular-nums">
                        <Money value={Math.abs(variance)} />
                      </span>
                    </span>
                  )}
                </span>
              </label>
            ) : (
              <div className="border border-line px-3 py-3">
                <div className="flex items-center gap-2 text-base font-medium text-fg">
                  <Banknote className="h-4 w-4 text-fg-muted" /> {t('Credit account — no cash at the counter')}
                </div>
                <p className="mt-1 text-base text-fg-muted">
                  {t('The bill posts against {code}. The counter takes nothing.', {
                    code: client?.oracleCustomerCode ?? '—',
                  })}
                </p>
              </div>
            )}
          </div>

          {/* ── What happens next ────────────────────────────────────────── */}
          <div className={`mt-5 flex gap-3 border px-4 py-3 ${TONE_CLASS.info}`}>
            <CheckCircle className="mt-0.5 h-5 w-5 flex-none" />
            <div className="text-base leading-relaxed">
              <p className="font-semibold text-fg">{t('What happens when you confirm')}</p>
              <p className="mt-1 text-fg-muted">
                {isCash
                  ? t(
                      'The order moves to Delivered against ECR {ecr}, recorded by {me} at the counter. The cash joins the gate cashier’s count — and only a confirmed cash reconciliation posts anything to Oracle.',
                      { ecr: order.ecr ?? '—', me: me.name },
                    )
                  : t(
                      'The order moves to Delivered against ECR {ecr}, recorded by {me} at the counter. Nothing is collected now; the bill posts to Oracle against the client’s account after reconciliation.',
                      { ecr: order.ecr ?? '—', me: me.name },
                    )}
              </p>
              {short && (
                <p className="mt-1 text-warn-fg">
                  {t('{n} cylinder(s) fewer than were released — the bill follows what actually went out.', {
                    n: released - going,
                  })}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── Footer ───────────────────────────────────────────────────────── */}
        <footer className="flex items-center justify-between gap-3 border-t border-line bg-surface px-5 py-4">
          <p className="text-base text-fg-muted">
            {nameOk
              ? t('{n} cylinders out · {b} on the bill', {
                  n: going,
                  b: `Rs ${bill.total.toLocaleString('en-PK')}`,
                })
              : t('Record who is taking the cylinders before you confirm.')}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-12 border border-line px-4 py-2 text-base font-medium text-fg hover:bg-surface-high focus:outline-none focus-visible:ring-1 focus-visible:ring-accent"
            >
              {t('Not yet')}
            </button>
            <button
              type="button"
              disabled={!nameOk}
              onClick={submit}
              className="inline-flex min-h-12 items-center gap-2 bg-accent px-5 py-2.5 text-base font-semibold text-accent-fg hover:bg-accent-hover active:bg-accent-press disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <CheckCircle className="h-5 w-5" /> {t('Confirm handover')}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default CollectionModal;
