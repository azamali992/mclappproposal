// ─── DeliveryCapture ─────────────────────────────────────────────────────────
// Optimised for the real order profile, not for a spreadsheet.
//
// Last year's sales say the median order is ONE cylinder (p90 = 7, max = 92).
// So the single-line order gets a dedicated fast lane: quantities arrive
// pre-filled from the load, and the common case is literally one tap on the
// submit button. Multi-line orders fall back to a per-line list — still quick,
// but never at the cost of the case that happens every day.
//
// Targets are 56–72px because this is used one-handed, at a gate, in the sun.

import { useMemo, useState } from 'react';
import type { Order } from '../../core/types';
import { api, select } from '../../core/store';
import { Cylinder, Banknote, Alert, Check, Map as MapIcon, WifiOff } from '../../ui/icons';
import { useT } from '../../i18n';
import {
  Btn,
  PKR,
  Pick,
  Sheet,
  Stepper,
  REASON_CODES,
  loadedOf,
  useAll,
  useGuard,
  useNotify,
  valueOf,
  type Session,
} from './index';

export default function DeliveryCapture({ order, session }: { order: Order; session: Session }) {
  const s = useAll();
  const t = useT();
  const guard = useGuard();
  const notify = useNotify();

  const client = select.client(s, order.clientId);
  const credit = client?.paymentTerms === 'credit';
  const single = order.lines.length === 1;

  const [delivered, setDelivered] = useState<Record<number, number>>(() =>
    Object.fromEntries(order.lines.map((l) => [l.id, loadedOf(l)])),
  );
  const [returned, setReturned] = useState<Record<number, number>>(() =>
    Object.fromEntries(order.lines.map((l) => [l.id, 0])),
  );
  const [reasons, setReasons] = useState<Record<number, string>>({});
  const [cashTouched, setCashTouched] = useState(false);
  const [cashRaw, setCashRaw] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  const totalLoaded = order.lines.reduce((acc, l) => acc + loadedOf(l), 0);
  const totalDelivered = order.lines.reduce((acc, l) => acc + (delivered[l.id] ?? 0), 0);
  const totalReturned = order.lines.reduce((acc, l) => acc + (returned[l.id] ?? 0), 0);

  // Credit clients never see a cash field — expectedCash() returns 0 for them
  // and the screen says so out loud rather than quietly hiding the control.
  const autoCash = credit ? 0 : valueOf(order, delivered);
  const cash = credit ? 0 : cashTouched ? Number(cashRaw.replace(/[^0-9.]/g, '')) || 0 : autoCash;

  const shortLines = order.lines.filter((l) => (delivered[l.id] ?? 0) < loadedOf(l));
  const missingReason = shortLines.filter((l) => !reasons[l.id]);
  const canSubmit = totalDelivered > 0 && missingReason.length === 0;

  // Deterministic jitter around the Multan depot so the stamp looks plausible
  // without asking a browser for a permission prompt mid-demo.
  const gps = useMemo(() => {
    const j = (n: number) => ((order.id * n) % 97) / 10000;
    return { lat: 30.1968 + j(31), lng: 71.4782 + j(17) };
  }, [order.id]);

  function submit() {
    const ref = guard(() =>
      api.recordDelivery({
        orderId: order.id,
        cylindersDelivered: totalDelivered,
        emptiesCollected: totalReturned,
        cashCollected: cash,
        gpsLat: gps.lat,
        gpsLng: gps.lng,
        lines: order.lines.map((l) => ({
          lineId: l.id,
          qtyDelivered: delivered[l.id] ?? 0,
          qtyReturned: returned[l.id] ?? 0,
          reasonCode: reasons[l.id],
        })),
      }),
    );
    if (!ref) return;

    setConfirmOpen(false);
    notify(
      s.online ? 'success' : 'warn',
      // The client_ref fragment is a UUID — never translated.
      t('Saved on this tab · {ref}', { ref: ref.slice(0, 8) }),
      s.online
        ? t('Written locally first, then queued. The server acknowledges it against this client_ref.')
        : t('No signal — the write already completed on the device. It syncs itself when you reconnect.'),
    );
  }

  return (
    <div className="mx-auto max-w-[760px] space-y-4">
      {/* ── What is on board for this client ────────────────────────────── */}
      <div className="rounded-md border border-line bg-surface">
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <h2 className="flex items-center gap-2 text-md font-semibold text-fg">
            <Cylinder className="h-5 w-5 text-fg-dim" />
            {single ? t('Drop') : t('Drop — {n} lines', { n: order.lines.length })}
          </h2>
          <span className="text-md text-fg-muted">
            {t('Loaded at the plant:')}{' '}
            <span className="font-semibold tabular-nums text-fg">{totalLoaded}</span>
          </span>
        </div>

        <div className={single ? 'p-4' : 'divide-y divide-line'}>
          {order.lines.map((l) => {
            const product = select.product(s, l.productId);
            const loaded = loadedOf(l);
            const short = (delivered[l.id] ?? 0) < loaded;
            return (
              <div key={l.id} className={single ? '' : 'p-4'}>
                <div className="flex items-baseline justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-xl font-semibold leading-tight text-fg">
                      {product?.name}
                      <span className="ms-2 text-md font-normal text-fg-muted">{product?.size}</span>
                    </div>
                    {/* SKU code: an item code, left Latin and LTR. */}
                    <div className="mt-1 font-mono text-base text-fg-dim">
                      <span dir="ltr">{product?.sku}</span> · <PKR value={l.unitPrice} /> {t('each')}
                    </div>
                  </div>
                  <span className="shrink-0 text-md font-semibold tabular-nums text-fg">
                    {t('{n} loaded', { n: loaded })}
                  </span>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <QtyBlock
                    label={t('Cylinders dropped')}
                    hint={
                      short
                        ? t('{n} short of the load', { n: loaded - (delivered[l.id] ?? 0) })
                        : t('Full load — ready to submit')
                    }
                    tone={short ? 'warn' : 'ok'}
                    value={delivered[l.id] ?? 0}
                    max={loaded}
                    onChange={(n) => setDelivered((d) => ({ ...d, [l.id]: n }))}
                    quick={[
                      { label: t('All {n}', { n: loaded }), value: loaded },
                      { label: t('None'), value: 0 },
                    ]}
                  />
                  <QtyBlock
                    label={t('Empties picked up')}
                    hint={t('Cylinders coming back on the vehicle')}
                    tone="plain"
                    value={returned[l.id] ?? 0}
                    onChange={(n) => setReturned((r) => ({ ...r, [l.id]: n }))}
                    quick={[
                      { label: t('Same ({n})', { n: delivered[l.id] ?? 0 }), value: delivered[l.id] ?? 0 },
                      { label: t('None'), value: 0 },
                    ]}
                  />
                </div>

                {/* Short delivery is normal here — ask why, once, in plain words. */}
                {short && (
                  <div className="mt-4 rounded-md border border-warn bg-warn-soft p-4">
                    <div className="mb-2.5 flex items-center gap-2 text-md font-semibold text-warn-fg">
                      <Alert className="h-5 w-5 shrink-0" />
                      {t('{n} cylinders not dropped — reason required', { n: loaded - (delivered[l.id] ?? 0) })}
                    </div>
                    <Pick value={reasons[l.id] ?? ''} onChange={(v) => setReasons((r) => ({ ...r, [l.id]: v }))}>
                      <option value="">{t('Select a reason code…')}</option>
                      {REASON_CODES.map((rc) => (
                        // rc.value is the wire symbol and is never translated;
                        // rc.label is the English source string used as the key.
                        <option key={rc.value} value={rc.value}>
                          {t(rc.label)}
                        </option>
                      ))}
                    </Pick>
                    <p className="mt-2.5 text-base text-fg-dim">
                      {t('The code travels with the line to Oracle, so short deliveries stop being an argument three weeks later.')}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Cash ────────────────────────────────────────────────────────── */}
      {credit ? (
        <div className="flex items-start gap-3 rounded-md border border-line bg-surface p-4">
          <Banknote className="mt-0.5 h-6 w-6 shrink-0 text-info-fg" />
          <div>
            <div className="text-lg font-semibold text-info-fg">
              {t('No cash at this stop — {name} is on credit', { name: client?.name ?? '' })}
            </div>
            <p className="mt-1.5 text-md text-fg-muted">
              {t('There is no cash field because there is no cash. expectedCash() returns Rs 0 for credit accounts, the Oracle payload carries a null cash receipt, and the gate cashier is never asked to count money that was never collected.')}
            </p>
            <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-base text-fg-dim">
              <span className="font-mono">
                {t('terms: credit · limit Rs {n}', { n: (client?.creditLimit ?? 0).toLocaleString('en-PK') })}
              </span>
              <span className="font-mono">
                {t('outstanding Rs {n}', { n: (client?.outstanding ?? 0).toLocaleString('en-PK') })}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-md border border-line bg-surface p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-md font-semibold text-fg">
              <Banknote className="h-5 w-5 text-fg-dim" />
              {t('Cash received')}
            </h2>
            <span className="text-md text-fg-muted">
              {t('Expected for what is being dropped:')}{' '}
              <span className="font-semibold text-fg"><PKR value={autoCash} /></span>
            </span>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            {/* Native field: needs a big numeral and a permanent Rs affix.
                Forced LTR — an amount is Latin digits in both languages, and
                the Rs affix belongs on its left even when the page is RTL.
                The 2px border and the focus ring are kept: this is an input
                boundary and a keyboard-focus indicator, not decoration. */}
            <div
              dir="ltr"
              className="flex min-h-[72px] flex-1 items-center gap-2 rounded-md border-2 border-line-strong bg-surface px-4 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent"
            >
              <span className="text-xl font-medium text-fg-dim">Rs</span>
              <input
                inputMode="decimal"
                aria-label={t('Cash received')}
                value={cashTouched ? cashRaw : String(autoCash)}
                onChange={(e) => {
                  setCashTouched(true);
                  setCashRaw(e.target.value);
                }}
                className="w-full bg-transparent text-4xl font-semibold tabular-nums text-fg outline-none"
              />
            </div>
            {/* Both shortcuts are now full-height targets, not 34px slivers. */}
            <div className="flex flex-col gap-2">
              <Btn
                variant="secondary"
                size="lg"
                className="min-h-[48px]"
                onClick={() => {
                  setCashTouched(false);
                  setCashRaw('');
                }}
              >
                {t('Exact amount')}
              </Btn>
              <Btn
                variant="secondary"
                size="lg"
                className="min-h-[48px]"
                onClick={() => {
                  setCashTouched(true);
                  setCashRaw('0');
                }}
              >
                {t('Took no cash')}
              </Btn>
            </div>
          </div>

          {cash !== autoCash && (
            <p className="mt-3 flex items-start gap-2 text-md font-medium text-warn-fg">
              <Alert className="mt-0.5 h-5 w-5 shrink-0" />
              {cash < autoCash
                ? t('Rs {n} short of the expected amount. This will not block you here — it surfaces at the gate, where the cashier holds the whole route and nothing posts to Oracle until it is resolved.', {
                    n: Math.abs(autoCash - cash).toLocaleString('en-PK'),
                  })
                : t('Rs {n} over the expected amount. This will not block you here — it surfaces at the gate, where the cashier holds the whole route and nothing posts to Oracle until it is resolved.', {
                    n: Math.abs(autoCash - cash).toLocaleString('en-PK'),
                  })}
            </p>
          )}
        </div>
      )}

      {/* ── Submit ──────────────────────────────────────────────────────── */}
      {/* Sticky action bar. A plain white bar with one hairline rule along the
          top — no shadow, no raised tint. The button inside it is the only
          accent-coloured thing on the screen, which is what makes it findable
          one-handed without anything else having to compete. */}
      <div className="sticky bottom-0 -mx-1 rounded-md border border-line bg-surface p-4">
        <div className="mb-3 flex flex-wrap items-center gap-x-6 gap-y-1.5 text-md text-fg-muted">
          <Summary label={t('Dropped')} value={`${totalDelivered} / ${totalLoaded}`} />
          <Summary label={t('Empties in')} value={String(totalReturned)} />
          <Summary
            label={t('Cash')}
            value={credit ? t('On account') : `Rs ${cash.toLocaleString('en-PK')}`}
          />
          <span className="ms-auto flex items-center gap-1.5 text-base text-fg-dim">
            <MapIcon className="h-4 w-4" />
            {/* Coordinates: Latin digits, forced LTR. */}
            <span dir="ltr">GPS {gps.lat.toFixed(4)}, {gps.lng.toFixed(4)}</span>
          </span>
        </div>

        {missingReason.length > 0 && (
          <p className="mb-3 flex items-center gap-2 text-md font-medium text-warn-fg">
            <Alert className="h-5 w-5 shrink-0" />
            {t('Pick a reason code for the short line before you can record this drop.')}
          </p>
        )}

        <Btn
          variant="primary"
          size="lg"
          disabled={!canSubmit}
          onClick={() => setConfirmOpen(true)}
          className="min-h-[76px] w-full text-xl"
        >
          {single && totalDelivered === totalLoaded
            ? credit
              ? t('Record {n} dropped', { n: totalDelivered })
              : t('Record {n} dropped · Rs {cash}', {
                  n: totalDelivered,
                  cash: cash.toLocaleString('en-PK'),
                })
            : t('Record delivery · {n} cylinders', { n: totalDelivered })}
        </Btn>
        <p className="mt-2.5 flex items-center justify-center gap-2 text-base text-fg-dim">
          {s.online ? <Check className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
          {t('Writes to this tab first. It never waits for a network.')}
        </p>
      </div>

      <Sheet
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={t('Record this delivery?')}
        footer={
          <div className="flex justify-end gap-2">
            <Btn variant="ghost" size="lg" onClick={() => setConfirmOpen(false)}>
              {t('Keep editing')}
            </Btn>
            <Btn variant="primary" size="lg" onClick={submit}>
              {t('Record delivery')}
            </Btn>
          </div>
        }
      >
        <div className="space-y-4 text-md text-fg-muted">
          <p>{t('The system will, in this order:')}</p>
          <ol className="space-y-2.5">
            <Point n={1}>
              {t('Write delivery_event to this tab’s local store and return immediately — no network call, no spinner.')}
            </Point>
            <Point n={2}>
              {t('Stamp it with a device-generated client_ref UUID. That key is what makes a replay safe: the same action can be sent ten times and applies exactly once.')}
            </Point>
            <Point n={3}>
              {/* The ECR number itself is an Oracle document number — untranslated. */}
              {t('Move ECR {ecr} from DISPATCHED to DELIVERED and queue the action for sync.', {
                ecr: order.ecr ?? '—',
              })}{' '}
              {s.online
                ? t('You are online, so it goes up now.')
                : t('You are offline, so it waits on the device.')}
            </Point>
          </ol>
          <div className="rounded-md border border-line bg-surface p-4 text-md">
            <div className="flex justify-between py-1">
              <span>{t('Cylinders dropped')}</span>
              <span className="font-semibold tabular-nums text-fg">
                {t('{n} of {total}', { n: totalDelivered, total: totalLoaded })}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span>{t('Empties collected')}</span>
              <span className="font-semibold tabular-nums text-fg">{totalReturned}</span>
            </div>
            <div className="flex justify-between py-1">
              <span>{t('Cash')}</span>
              <span className="font-semibold tabular-nums text-fg">
                {credit ? t('On account — no cash') : `Rs ${cash.toLocaleString('en-PK')}`}
              </span>
            </div>
          </div>
          <p className="text-base text-fg-dim">
            {t('The sale is not final here. The client still confirms, and the gate cashier still has to match the cash before anything reaches Oracle.')}
          </p>
        </div>
      </Sheet>
    </div>
  );
}

// ─── Pieces ──────────────────────────────────────────────────────────────────

/**
 * Quantity block. The − / + stepper inside keeps its LTR meaning in both
 * languages: minus always removes and plus always adds, and the pair is not
 * reordered. Mirroring them would be a genuine safety bug at a gate — a driver
 * reaching for the button on the familiar side must not get the opposite sign.
 */
function QtyBlock({
  label,
  hint,
  tone,
  value,
  max,
  onChange,
  quick,
}: {
  label: string;
  hint: string;
  tone: 'ok' | 'warn' | 'plain';
  value: number;
  max?: number;
  onChange: (n: number) => void;
  quick: { label: string; value: number }[];
}) {
  const t = useT();
  return (
    <div
      className={
        'rounded-md border p-4 ' +
        (tone === 'warn' ? 'border-warn bg-warn-soft' : 'border-line bg-surface')
      }
    >
      <div className="mb-2.5 flex items-baseline justify-between gap-2">
        <span className="text-md font-semibold text-fg">{label}</span>
        {max != null && (
          <span className="text-base tabular-nums text-fg-dim">{t('max {n}', { n: max })}</span>
        )}
      </div>
      <Stepper value={value} onChange={onChange} min={0} max={max} size="lg" className="w-full" />
      {/* The quick-set buttons are the actual fast path — on a full-load drop
          the driver never touches the − / + at all. They are now full 48px
          targets with readable labels instead of 34px chips. */}
      <div className="mt-2.5 flex flex-wrap gap-2">
        {quick.map((q) => (
          <button
            key={q.label}
            type="button"
            onClick={() => onChange(q.value)}
            className="min-h-[48px] flex-1 rounded-md border border-line-strong bg-surface px-3 text-md font-medium text-fg"
          >
            {q.label}
          </button>
        ))}
      </div>
      <p className={'mt-2.5 text-base ' + (tone === 'warn' ? 'font-medium text-warn-fg' : 'text-fg-dim')}>{hint}</p>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex items-baseline gap-2">
      <span className="text-base text-fg-dim">{label}</span>
      <span className="text-lg font-semibold tabular-nums text-fg">{value}</span>
    </span>
  );
}

function Point({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-line text-base font-bold text-fg-muted">
        {n}
      </span>
      <span className="flex-1">{children}</span>
    </li>
  );
}
