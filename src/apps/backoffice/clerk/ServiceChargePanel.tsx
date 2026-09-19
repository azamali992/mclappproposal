// ─── ServiceChargePanel — cylinder management work on the bill ───────────────
// Fixed-price work defined in Oracle: nozzle changes, repaints, hydrostatic
// tests, repairs. The clerk picks from the list, gives a quantity and (if it is
// worth saying) a reason, and it lands on the client's bill immediately.
//
// The rate is snapshotted by the store when the charge is added, so a later
// price change cannot restate a bill that has already gone out. Nothing is
// calculated here that the store does not already calculate — the running total
// is `serviceChargeTotal`, and the bill total is `orderValue`.

import { useState } from 'react';
import type { ServiceCharge } from '../../../core/types';
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
import { Plus, X, Alert, Box } from '../../../ui/icons';
import { useT } from '../../../i18n';
import { TONE_CLASS, useRuleToast } from '../shared/OrderTable';

const asNumber = (v: any): number => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  const n = Number(v?.target?.value ?? v);
  return Number.isFinite(n) ? n : 0;
};

export function unitLabel(unit: ServiceCharge['unit']): string {
  return unit === 'per_cylinder' ? 'Per cylinder' : 'Per job';
}

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
  const [chargeId, setChargeId] = useState<number | null>(null);
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState('');

  const order = select.order(s, orderId);
  if (!order) return null;

  const applied = order.serviceCharges ?? [];
  const serviceTotal = serviceChargeTotal(order);
  const billTotal = orderValue(order);
  const goods = billTotal - serviceTotal;

  // The store refuses either verb on a closed bill — say so before they click.
  const closed = ['POSTED', 'CANCELLED'].includes(order.status);
  const mayEdit = (me.role === 'clerk' || me.role === 'admin') && !closed;

  const reset = () => {
    setPickerOpen(false);
    setChargeId(null);
    setQty(1);
    setNote('');
  };

  const add = (id: number) => {
    try {
      api.addServiceCharge(order.id, id, qty, note.trim() || undefined);
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
      reset();
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

  const inputCls =
    'w-full border border-line bg-surface px-3 py-2.5 text-base text-fg placeholder:text-fg-muted focus:border-fg focus:outline-none focus-visible:ring-1 focus-visible:ring-accent';

  return (
    <div className={className}>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-lg font-semibold text-fg">{t('Cylinder management charges')}</h3>
        <span className="text-base text-fg-muted">
          {t('Fixed prices from Oracle — pick the work, it goes on the bill')}
        </span>
      </div>

      {/* ── What is already on the order ──────────────────────────────────── */}
      {applied.length === 0 ? (
        <p className="border border-line px-3 py-4 text-base text-fg-muted">
          {t('No cylinder management work on this order yet.')}
        </p>
      ) : (
        <div className="border border-line">
          <table className="w-full border-collapse text-base">
            <thead>
              <tr className="border-b border-line bg-surface text-base text-fg">
                <th className="px-3 py-3 text-left font-semibold">{t('Work done')}</th>
                <th className="px-3 py-3 text-right font-semibold">{t('Fixed price')}</th>
                <th className="px-3 py-3 text-right font-semibold">{t('How many')}</th>
                <th className="px-3 py-3 text-right font-semibold">{t('On the bill')}</th>
                <th className="w-12" />
              </tr>
            </thead>
            <tbody>
              {applied.map((row) => {
                const c = select.serviceCharge(s, row.chargeId);
                return (
                  <tr key={row.id} className="border-t border-line">
                    <td className="px-3 py-3">
                      <div className="font-medium text-fg">{c?.name ?? `Charge ${row.chargeId}`}</div>
                      <div className="text-base text-fg-muted">
                        <span className="font-mono">{c?.oracleItemCode}</span>
                        {c ? ` · ${t(unitLabel(c.unit))}` : ''}
                      </div>
                      {row.note && <div className="mt-1 text-base text-fg">{row.note}</div>}
                    </td>
                    <td className="px-3 py-3 text-right font-mono tabular-nums text-fg-muted">
                      <Money value={row.unitAmount} />
                    </td>
                    <td className="px-3 py-3 text-right font-mono tabular-nums text-fg">{row.qty}</td>
                    <td className="px-3 py-3 text-right font-mono tabular-nums text-fg">
                      <Money value={row.qty * row.unitAmount} />
                    </td>
                    <td className="px-2 py-3 text-right">
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
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-line bg-surface">
                <td className="px-3 py-3 text-base font-semibold text-fg" colSpan={3}>
                  {t('Service work on this order')}
                </td>
                <td className="px-3 py-3 text-right font-mono tabular-nums text-fg">
                  <Money value={serviceTotal} />
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* ── The effect on the bill ────────────────────────────────────────── */}
      <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1 border border-line px-3 py-3 text-base">
        <span className="text-fg-muted">{t('Goods')}</span>
        <span className="font-mono tabular-nums text-fg">
          <Money value={goods} />
        </span>
        <span className="text-fg-muted">+</span>
        <span className="text-fg-muted">{t('Service work')}</span>
        <span className="font-mono tabular-nums text-fg">
          <Money value={serviceTotal} />
        </span>
        <span className="text-fg-muted">=</span>
        <span className="font-semibold text-fg">{t('Client’s bill')}</span>
        <span className="font-mono text-lg tabular-nums font-semibold text-fg">
          <Money value={billTotal} />
        </span>
      </div>

      {/* ── Picker ────────────────────────────────────────────────────────── */}
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
          <div className="flex items-baseline gap-2 border-b border-line px-3 py-3">
            <Box className="h-4 w-4 text-fg-muted" />
            <h4 className="text-base font-semibold text-fg">{t('Choose the work')}</h4>
            <span className="text-base text-fg-muted">
              {t('{n} fixed-price items in Oracle', { n: s.serviceCharges.length })}
            </span>
            <button
              type="button"
              onClick={reset}
              className="ms-auto p-2 text-fg-muted hover:bg-surface-high hover:text-fg focus:outline-none focus-visible:ring-1 focus-visible:ring-accent"
              aria-label="Close the charge list"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <ul>
            {s.serviceCharges.map((c) => {
              const open = chargeId === c.id;
              return (
                <li key={c.id} className="border-t border-line first:border-t-0">
                  <button
                    type="button"
                    onClick={() => {
                      setChargeId(open ? null : c.id);
                      setQty(1);
                      setNote('');
                    }}
                    aria-expanded={open}
                    className={`flex min-h-12 w-full items-center gap-3 px-3 py-3 text-left focus:outline-none focus-visible:ring-1 focus-visible:ring-accent ${
                      open ? 'bg-surface-high' : 'bg-surface hover:bg-surface-high'
                    }`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className={`block text-base ${open ? 'font-semibold text-fg' : 'text-fg'}`}>
                        {c.name}
                      </span>
                      <span className="block truncate text-base text-fg-muted">{c.description}</span>
                    </span>
                    <span className="whitespace-nowrap text-base text-fg-muted">{t(unitLabel(c.unit))}</span>
                    <span className="w-28 text-right font-mono text-base tabular-nums text-fg">
                      <Money value={c.amount} />
                    </span>
                  </button>

                  {open && (
                    <div className="border-t border-line bg-surface px-3 py-3">
                      <div className="flex flex-wrap items-end gap-4">
                        <div>
                          <span className="mb-1.5 block text-base font-medium text-fg">
                            {c.unit === 'per_cylinder' ? t('How many cylinders') : t('How many jobs')}
                          </span>
                          <NumberStepper
                            value={qty}
                            min={1}
                            max={999}
                            aria-label="Quantity"
                            onChange={(v: any) => setQty(Math.max(1, asNumber(v)))}
                          />
                        </div>
                        <div className="min-w-[16rem] flex-1">
                          <span className="mb-1.5 block text-base font-medium text-fg">
                            {t('Why the work was needed (optional)')}
                          </span>
                          <input
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder={t('e.g. both valves leaking on return')}
                            className={inputCls}
                          />
                        </div>
                        <div className="text-base">
                          <span className="block text-fg-muted">{t('Goes on the bill')}</span>
                          <span className="font-mono text-lg tabular-nums text-fg">
                            <Money value={c.amount * qty} />
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => add(c.id)}
                          className="inline-flex min-h-12 items-center gap-2 bg-accent px-5 py-2.5 text-base font-semibold text-accent-fg hover:bg-accent-hover active:bg-accent-press focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                        >
                          <Plus className="h-5 w-5" /> {t('Add to the bill')}
                        </button>
                      </div>
                      <p className="mt-2 text-base text-fg-muted">
                        {t('Oracle item')} <span className="font-mono">{c.oracleItemCode}</span> ·{' '}
                        {t(
                          'the price is copied onto the order now, so a later rate change cannot restate this bill.',
                        )}
                      </p>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

export default ServiceChargePanel;
