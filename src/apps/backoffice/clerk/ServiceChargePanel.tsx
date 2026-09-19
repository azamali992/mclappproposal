// ─── ServiceChargePanel — cylinder management work on the bill ───────────────
// Fixed-price work defined in Oracle: nozzle changes, repaints, hydrostatic
// tests, repairs. A picker, nothing more: one quantity, then a name, a price
// and an Add button per row. The description of each job is a tooltip, not a
// second line of text on the screen.
//
// The rate is snapshotted by the store when the charge is added, so a later
// price change cannot restate a bill that has already gone out. Nothing is
// calculated here that the store does not already calculate — the running total
// is `serviceChargeTotal`, and the bill total is `orderValue`.

import { useState } from 'react';
import {
  api,
  useStore,
  useCurrentUser,
  select,
  RuleError,
  orderValue,
  serviceChargeTotal,
} from '../../../core/store';
import { Money, NumberStepper } from '../../../ui/primitives';
import { Plus, X, Alert } from '../../../ui/icons';
import { useT } from '../../../i18n';
import { TONE_CLASS, useRuleToast } from '../shared/OrderTable';

const asNumber = (v: any): number => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  const n = Number(v?.target?.value ?? v);
  return Number.isFinite(n) ? n : 0;
};

export interface ServiceChargePanelProps {
  orderId: number;
  className?: string;
}

export function ServiceChargePanel({ orderId, className = '' }: ServiceChargePanelProps) {
  const t = useT();
  const s = useStore((st) => st);
  const me = useCurrentUser();
  const toast = useRuleToast();

  const [pickerOpen, setPickerOpen] = useState(false);
  const [qty, setQty] = useState(1);

  const order = select.order(s, orderId);
  if (!order) return null;

  const applied = order.serviceCharges ?? [];
  const serviceTotal = serviceChargeTotal(order);
  const billTotal = orderValue(order);

  // The store refuses either verb on a closed bill — say so before they click.
  const closed = ['POSTED', 'CANCELLED'].includes(order.status);
  const mayEdit = (me.role === 'clerk' || me.role === 'admin') && !closed;

  const add = (id: number) => {
    try {
      api.addServiceCharge(order.id, id, qty);
      const c = select.serviceCharge(s, id);
      toast(
        t('{name} ×{qty} added — the client’s bill is now {total}.', {
          name: c?.name ?? 'Charge',
          qty,
          total: `Rs ${(billTotal + (c?.amount ?? 0) * qty).toLocaleString('en-PK')}`,
        }),
        'success',
        t('Charge added to the bill'),
      );
      setPickerOpen(false);
      setQty(1);
    } catch (err) {
      const msg = err instanceof RuleError ? err.message : (err as Error).message;
      const rule = err instanceof RuleError ? err.rule : 'ERROR';
      toast(msg, 'danger', `${t('Charge refused')} — ${rule}`);
    }
  };

  const remove = (rowId: number, name: string) => {
    try {
      api.removeServiceCharge(order.id, rowId);
      toast(t('{name} taken off the bill.', { name }), 'success', t('Charge removed'));
    } catch (err) {
      const msg = err instanceof RuleError ? err.message : (err as Error).message;
      const rule = err instanceof RuleError ? err.rule : 'ERROR';
      toast(msg, 'danger', `${t('Removal refused')} — ${rule}`);
    }
  };

  return (
    <div className={className}>
      <h3 className="mb-3 text-lg font-semibold text-fg">{t('Cylinder management charges')}</h3>

      {/* ── What is already on the order ──────────────────────────────────── */}
      {applied.length === 0 ? (
        <p className="border border-line px-3 py-4 text-base text-fg-muted">
          {t('No cylinder management work on this order yet.')}
        </p>
      ) : (
        <ul className="border border-line">
          {applied.map((row) => {
            const c = select.serviceCharge(s, row.chargeId);
            return (
              <li
                key={row.id}
                className="flex items-center gap-3 border-b border-line px-3 py-3 last:border-b-0"
              >
                <span className="min-w-0 flex-1 truncate text-base text-fg">
                  {c?.name ?? `Charge ${row.chargeId}`}
                  <span className="ms-2 font-mono tabular-nums text-fg-muted">×{row.qty}</span>
                </span>
                <span className="font-mono text-base tabular-nums text-fg">
                  <Money value={row.qty * row.unitAmount} />
                </span>
                <button
                  type="button"
                  aria-label={`Remove ${c?.name ?? 'charge'}`}
                  title={t('Take this charge off the bill')}
                  disabled={!mayEdit}
                  onClick={() => remove(row.id, c?.name ?? 'Charge')}
                  className="p-2 text-fg-muted hover:bg-surface-high hover:text-danger-fg disabled:opacity-30 focus:outline-none focus-visible:ring-1 focus-visible:ring-accent"
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            );
          })}
          <li className="flex items-center justify-between gap-3 border-t border-line bg-surface px-3 py-3">
            <span className="text-base font-semibold text-fg">{t('Service work')}</span>
            <span className="font-mono text-base tabular-nums text-fg">
              <Money value={serviceTotal} />
            </span>
          </li>
        </ul>
      )}

      {/* ── Picker: one quantity, then name · price · Add ─────────────────── */}
      {closed ? (
        <div className={`mt-3 flex gap-2 border px-3 py-3 text-base ${TONE_CLASS.warn}`}>
          <Alert className="mt-0.5 h-4 w-4 flex-none" />
          <span>
            {t(
              'This bill is closed — charges can no longer be added or removed. A correction is a new document, never an edit.',
            )}
          </span>
        </div>
      ) : !mayEdit ? (
        <p className="mt-3 text-base text-fg-muted">
          {t('Only the platform clerk adds cylinder management work.')}
        </p>
      ) : !pickerOpen ? (
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="mt-3 inline-flex min-h-12 items-center gap-2 border border-line px-4 py-2 text-base font-medium text-fg hover:bg-surface-high focus:outline-none focus-visible:ring-1 focus-visible:ring-accent"
        >
          <Plus className="h-4 w-4" /> {t('Add cylinder management work')}
        </button>
      ) : (
        <div className="mt-3 border border-line">
          <div className="flex items-center gap-3 border-b border-line px-3 py-3">
            <span className="text-base font-medium text-fg">{t('How many')}</span>
            <NumberStepper
              value={qty}
              min={1}
              max={999}
              aria-label={t('How many')}
              onChange={(v: any) => setQty(Math.max(1, asNumber(v)))}
            />
            <button
              type="button"
              onClick={() => {
                setPickerOpen(false);
                setQty(1);
              }}
              className="ms-auto p-2 text-fg-muted hover:bg-surface-high hover:text-fg focus:outline-none focus-visible:ring-1 focus-visible:ring-accent"
              aria-label={t('Close')}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <ul>
            {s.serviceCharges.map((c) => (
              <li
                key={c.id}
                className="flex items-center gap-3 border-t border-line px-3 py-2.5 first:border-t-0"
                title={c.description}
              >
                <span className="min-w-0 flex-1 truncate text-base text-fg">{c.name}</span>
                <span className="w-28 text-right font-mono text-base tabular-nums text-fg-muted">
                  <Money value={c.amount} />
                </span>
                <button
                  type="button"
                  onClick={() => add(c.id)}
                  className="inline-flex min-h-12 items-center gap-2 border border-line px-4 py-2 text-base font-medium text-fg hover:bg-surface-high focus:outline-none focus-visible:ring-1 focus-visible:ring-accent"
                >
                  {t('Add to the bill')}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default ServiceChargePanel;
