// ─── DeliveryCapture ─────────────────────────────────────────────────────────
// One job: record what was dropped.
//
// Last year's sales say the median order is ONE cylinder (p90 = 7, max = 92),
// and the overwhelmingly common case is that the whole load goes off the
// vehicle and the exact money comes back. So the screen the driver meets is
// three things: what is being dropped, one number to change if it is not the
// whole load, and one button that states the cash it is about to record.
//
// Everything that only matters when the common case fails — empties, reason
// codes, a cash amount that is not the expected one — lives behind a single
// "Something is wrong" toggle, and that toggle opens itself the moment a short
// line makes a reason code mandatory. The happy path is two taps: the button,
// then the confirmation. The confirmation stays; it is a safety step, not
// decoration.
//
// Targets are 56–76px because this is used one-handed, at a gate, in the sun.

import { useMemo, useState } from 'react';
import type { Order } from '../../core/types';
import { api, select } from '../../core/store';
import { Banknote, Alert } from '../../ui/icons';
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
  const [moreOpen, setMoreOpen] = useState(false);

  const totalLoaded = order.lines.reduce((acc, l) => acc + loadedOf(l), 0);
  const totalDelivered = order.lines.reduce((acc, l) => acc + (delivered[l.id] ?? 0), 0);
  const totalReturned = order.lines.reduce((acc, l) => acc + (returned[l.id] ?? 0), 0);

  // Credit clients never see a cash field — expectedCash() returns 0 for them.
  const autoCash = credit ? 0 : valueOf(order, delivered);
  const cash = credit ? 0 : cashTouched ? Number(cashRaw.replace(/[^0-9.]/g, '')) || 0 : autoCash;

  const shortLines = order.lines.filter((l) => (delivered[l.id] ?? 0) < loadedOf(l));
  const missingReason = shortLines.filter((l) => !reasons[l.id]);
  const canSubmit = totalDelivered > 0 && missingReason.length === 0;

  // A short line makes a reason code mandatory, so the panel that holds the
  // reason code opens itself. The driver never has to go looking for it.
  const needMore = shortLines.length > 0;
  const showMore = moreOpen || needMore;

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
    <div className="mx-auto max-w-[560px] space-y-4">
      {/* ── What is being dropped, and the one number ─────────────────────── */}
      {order.lines.map((l) => {
        const product = select.product(s, l.productId);
        const loaded = loadedOf(l);
        return (
          <div key={l.id} className="rounded-md border border-line bg-surface p-4">
            <div className="truncate text-2xl font-semibold leading-tight text-fg">
              {product?.name}
              <span className="ms-2 text-lg font-normal text-fg-muted">{product?.size}</span>
            </div>

            {/* The minus/plus pair keeps its LTR meaning in both languages:
                minus always removes and plus always adds. Mirroring them would
                be a real safety bug at a gate. */}
            <div className="mt-3">
              <Stepper
                value={delivered[l.id] ?? 0}
                onChange={(n) => setDelivered((d) => ({ ...d, [l.id]: n }))}
                min={0}
                max={loaded}
                size="lg"
                className="w-full"
                aria-label={t('Cylinders dropped')}
              />
            </div>
          </div>
        );
      })}

      {/* ── Everything that only matters when it goes wrong ───────────────── */}
      <div className="rounded-md border border-line bg-surface">
        <button
          type="button"
          aria-expanded={showMore}
          onClick={() => setMoreOpen((v) => !v)}
          disabled={needMore}
          className="flex min-h-[56px] w-full items-center justify-between gap-3 px-4 text-start text-md font-semibold text-fg disabled:text-fg-muted"
        >
          {t('Something is wrong')}
          <span className="text-base font-normal text-fg-muted">
            {showMore ? t('Hide') : t('Show')}
          </span>
        </button>

        {showMore && (
          <div className="space-y-4 border-t border-line p-4">
            {/* Empties */}
            <div>
              <div className="mb-2 text-md font-semibold text-fg">{t('Empties picked up')}</div>
              {order.lines.map((l) => (
                <Stepper
                  key={l.id}
                  value={returned[l.id] ?? 0}
                  onChange={(n) => setReturned((r) => ({ ...r, [l.id]: n }))}
                  min={0}
                  size="lg"
                  className="w-full"
                  aria-label={t('Empties picked up')}
                />
              ))}
            </div>

            {/* Reason codes — one per short line, and required */}
            {shortLines.map((l) => (
              <div key={l.id} className="rounded-md border border-warn bg-warn-soft p-4">
                <div className="mb-2.5 flex items-center gap-2 text-md font-semibold text-warn-fg">
                  <Alert className="h-5 w-5 shrink-0" />
                  {t('{n} cylinders not dropped — reason required', {
                    n: loadedOf(l) - (delivered[l.id] ?? 0),
                  })}
                </div>
                <Pick
                  value={reasons[l.id] ?? ''}
                  onChange={(v) => setReasons((r) => ({ ...r, [l.id]: v }))}
                >
                  <option value="">{t('Select a reason code…')}</option>
                  {REASON_CODES.map((rc) => (
                    // rc.value is the wire symbol and is never translated;
                    // rc.label is the English source string used as the key.
                    <option key={rc.value} value={rc.value}>
                      {t(rc.label)}
                    </option>
                  ))}
                </Pick>
              </div>
            ))}

            {/* Cash. Credit clients have no cash field because there is no
                cash — the screen says so rather than quietly hiding it. */}
            {credit ? (
              <div className="flex items-start gap-3 text-md font-semibold text-info-fg">
                <Banknote className="mt-0.5 h-6 w-6 shrink-0" />
                {t('No cash at this stop — {name} is on credit', { name: client?.name ?? '' })}
              </div>
            ) : (
              <div>
                <div className="mb-2 text-md font-semibold text-fg">{t('Cash received')}</div>
                {/* Forced LTR — an amount is Latin digits in both languages and
                    the Rs affix belongs on its left even when the page is RTL.
                    The 2px border and focus ring are an input boundary and a
                    keyboard-focus indicator, not decoration. */}
                <div
                  dir="ltr"
                  className="flex min-h-[72px] items-center gap-2 rounded-md border-2 border-line-strong bg-surface px-4 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent"
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
                <div className="mt-2 flex gap-2">
                  <Btn
                    variant="secondary"
                    size="lg"
                    className="min-h-[48px] flex-1"
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
                    className="min-h-[48px] flex-1"
                    onClick={() => {
                      setCashTouched(true);
                      setCashRaw('0');
                    }}
                  >
                    {t('Took no cash')}
                  </Btn>
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
          </div>
        )}
      </div>

      {/* ── The one button ────────────────────────────────────────────────── */}
      <div className="sticky bottom-0 -mx-1 rounded-md border border-line bg-surface p-4">
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
          {credit
            ? t('Record {n} dropped', { n: totalDelivered })
            : t('Record {n} dropped · Rs {cash}', {
                n: totalDelivered,
                cash: cash.toLocaleString('en-PK'),
              })}
        </Btn>
      </div>

      {/* Confirmation before anything is recorded. This step stays — it is the
          last chance to catch a wrong number before an append-only write. */}
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
        <div className="text-md text-fg-muted">
          <div className="flex justify-between py-1.5">
            <span>{t('Cylinders dropped')}</span>
            <span className="font-semibold tabular-nums text-fg">
              {t('{n} of {total}', { n: totalDelivered, total: totalLoaded })}
            </span>
          </div>
          <div className="flex justify-between py-1.5">
            <span>{t('Empties collected')}</span>
            <span className="font-semibold tabular-nums text-fg">{totalReturned}</span>
          </div>
          <div className="flex justify-between py-1.5">
            <span>{t('Cash')}</span>
            <span className="font-semibold tabular-nums text-fg">
              {credit ? t('On account — no cash') : <PKR value={cash} />}
            </span>
          </div>
        </div>
      </Sheet>
    </div>
  );
}
