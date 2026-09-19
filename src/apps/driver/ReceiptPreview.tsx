// ─── ReceiptPreview ──────────────────────────────────────────────────────────
// A faithful mock of what the 58mm Bluetooth thermal printer emits: monospace,
// 32 columns, dashed rules, no colour. What you see here is the same payload
// the ESC/POS driver will render — the "Print" button is the integration point.
//
// Printing is a local peripheral operation. It works with the radio off, which
// is exactly why the paper receipt survives in the field.
//
// ── Colour ──────────────────────────────────────────────────────────────────
// The paper is literal `bg-white` / `text-black`, not a surface token, and that
// is deliberate rather than an oversight. Thermal paper is white and the print
// head burns black; the receipt must look like paper under any theme, so it
// opts out of the palette entirely. It previously faked this by painting
// `bg-fg` with `text-fg-inverse` — an inversion that produced a black receipt
// the moment the palette went light. Every rule and hairline inside the paper
// is therefore black at an alpha, which is the one place in this folder where
// a literal colour is the correct answer.
//
// ── Urdu on the printer: OPEN HARDWARE QUESTION ─────────────────────────────
// The receipt renders BILINGUALLY on screen, but the two halves are not equal.
// The English/Latin line items, quantities and totals are what the current
// ESC/POS byte stream actually emits and what the office reconciles against, so
// they are always present and never translated. Urdu labels are added alongside
// the handful of lines a customer needs to read (customer, cylinders out,
// empties in, cash received, signature).
//
// Whether those Urdu labels can be PRINTED is unresolved. A 58mm ESC/POS head
// prints from the printer's own resident font ROM; Nastaliq is not in any
// standard code page, so Urdu will either need a printer with a Urdu/Arabic
// code page, or the whole receipt rendered client-side to a raster bitmap and
// sent as a graphics command (slower, and it changes the paper-feed maths).
// That decision is not made. Until the printer model is chosen and its font
// support confirmed on real hardware, treat the Urdu on this preview as
// screen-only. Do not let a demo imply the paper will come out in Urdu.
// See also the "Integration point" panel below — same open decision.

import { useEffect, useRef, useState } from 'react';
import type { Order } from '../../core/types';
import { select } from '../../core/store';
import { Printer, Check, WifiOff } from '../../ui/icons';
import { useI18n, useT } from '../../i18n';
import { Btn, clock, shortRef, syncStateOf, useAll, useNotify, type Session } from './index';

/** Printer output is ASCII in fixed columns — formatted here, not with <Money>. */
const rs = (n: number) => n.toLocaleString('en-PK', { maximumFractionDigits: 0 });

/** Paper white, for the torn edges. Not a token: see the colour note above. */
const PAPER = '#FFFFFF';

type PrintState = 'idle' | 'printing' | 'printed';

export default function ReceiptPreview({ order, session }: { order: Order; session: Session }) {
  const s = useAll();
  const t = useT();
  const { isUrdu } = useI18n();
  const notify = useNotify();
  const [state, setState] = useState<PrintState>('idle');
  const [copies, setCopies] = useState(0);
  const timer = useRef<number | null>(null);

  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);

  const client = select.client(s, order.clientId);
  const route = select.route(s, order.routeId);
  const vehicle = select.vehicle(s, order.vehicleId);
  const driver = select.user(s, order.driverId);
  const location = select.location(s, order.locationId);
  const device = s.tabDevices.find((d) => d.id === session.deviceId);
  const confirmation = s.confirmationEvents.find((c) => c.orderId === order.id && c.status === 'confirmed');
  const queued = s.queue.find((q) => q.orderId === order.id);
  const sync = syncStateOf(s, order.id);

  const cash =
    (queued?.payload as { cashCollected?: number } | undefined)?.cashCollected ??
    s.deliveryEvents.find((d) => d.orderId === order.id)?.cashCollected ??
    0;

  const out = order.lines.reduce((acc, l) => acc + (l.qtyDelivered ?? 0), 0);
  const empties = order.lines.reduce((acc, l) => acc + (l.qtyReturned ?? 0), 0);
  const total = order.lines.reduce((acc, l) => acc + (l.qtyDelivered ?? 0) * l.unitPrice, 0);

  function print() {
    setState('printing');
    timer.current = window.setTimeout(() => {
      setState('printed');
      setCopies((c) => c + 1);
      notify(
        'success',
        t('Receipt printed'),
        t('Sent to the paired thermal printer over Bluetooth. No network involved — this works with the radio off.'),
      );
    }, 1700);
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
      {/* ── The paper ─────────────────────────────────────────────────────── */}
      <div className="shrink-0">
        <div
          className={
            'w-[300px] transition-transform duration-slow ease-entrance ' +
            (state === 'printing' ? 'translate-y-1 opacity-90' : '')
          }
          // A soft contact shadow so white paper still separates from a white
          // page. Far lighter than the dark-theme original, which was a 60%
          // black bloom and reads as dirt on a light background.
          style={{ filter: 'drop-shadow(0 8px 16px rgba(16,24,32,0.22))' }}
        >
          {/* torn top edge */}
          <div
            className="h-2.5 w-full"
            style={{
              background: `repeating-conic-gradient(from -45deg at 50% 100%, ${PAPER} 0% 25%, transparent 0% 50%) 0 0/12px 10px`,
            }}
            aria-hidden="true"
          />

          {/* The paper itself is always LTR: it is a 32-column ASCII column
              layout, and mirroring it would misalign every total. Urdu labels
              inside carry their own dir="rtl". */}
          <div
            dir="ltr"
            className="bg-white px-4 py-4 font-mono text-[11px] leading-[1.5] text-black"
          >
            {/* header */}
            <div className="text-center">
              <div className="text-[15px] font-bold tracking-[0.12em]">MULTAN CHEMICALS LTD</div>
              <div className="tracking-wide">INDUSTRIAL &amp; MEDICAL GASES</div>
              {isUrdu && <UrLine>{t('Multan Chemicals Ltd')}</UrLine>}
              <div className="mt-0.5">{location?.name} · TEL 061-9200000</div>
              <div>NTN 1234567-8</div>
            </div>

            <Dash />
            <div className="text-center text-[13px] font-bold tracking-[0.1em]">DELIVERY RECEIPT</div>
            {isUrdu && <UrLine center>{t('Delivery receipt')}</UrLine>}
            <Dash />

            {/* Identifiers: ECR, plates, device ids and dates are never
                translated and never transliterated. */}
            <Row k="ECR" v={order.ecr ?? '—'} bold />
            <Row k="DATE" v={new Date(order.deliveredAt ?? Date.now()).toLocaleDateString('en-GB')} />
            <Row k="TIME" v={clock(order.deliveredAt)} />
            <Row k="ROUTE" v={route?.code ?? '—'} />
            <Row k="VEHICLE" v={vehicle?.registration ?? '—'} />
            <Row k="DRIVER" v={driver?.name ?? '—'} ur={isUrdu ? t('Driver') : undefined} />
            <Row k="TAB" v={device?.deviceId ?? '—'} />

            <Dash />
            {/* Key line — carries an Urdu label. */}
            <Row k="CLIENT" v={client?.name ?? '—'} bold ur={isUrdu ? t('Customer') : undefined} />
            <Row k="CODE" v={client?.oracleCustomerCode ?? '—'} />
            <Row k="TERMS" v={(client?.paymentTerms ?? '').toUpperCase()} />
            <div className="mt-0.5 opacity-80">{client?.address}</div>

            <Dash />
            {/* Line items stay entirely Latin: SKU, qty, rate, amount are what
                the office reconciles against, column for column. */}
            <div className="flex font-bold">
              <span className="flex-1">ITEM</span>
              <span className="w-8 text-end">QTY</span>
              <span className="w-12 text-end">RATE</span>
              <span className="w-14 text-end">AMOUNT</span>
            </div>
            <div className="my-1 border-t border-dotted border-black/50" />
            {order.lines.map((l) => {
              const p = select.product(s, l.productId);
              const q = l.qtyDelivered ?? 0;
              return (
                <div key={l.id}>
                  <div className="flex">
                    <span className="flex-1 truncate">{p?.sku}</span>
                    <span className="w-8 text-end tabular-nums">{q}</span>
                    <span className="w-12 text-end tabular-nums">{rs(l.unitPrice)}</span>
                    <span className="w-14 text-end tabular-nums">{rs(q * l.unitPrice)}</span>
                  </div>
                  <div className="truncate ps-1 text-[10px] opacity-80">
                    {p?.name} {p?.size}
                    {l.reasonCode ? ` · ${l.reasonCode}` : ''}
                  </div>
                </div>
              );
            })}

            <Dash />
            {/* Key lines — cylinder counts carry Urdu labels. */}
            <Row k="CYLINDERS OUT" v={String(out)} ur={isUrdu ? t('Cylinders delivered') : undefined} />
            <Row k="EMPTIES IN" v={String(empties)} ur={isUrdu ? t('Empty cylinders') : undefined} />
            <Row k="NET ON LOAN" v={String(out - empties)} ur={isUrdu ? t('Balance on loan') : undefined} />

            <Dash />
            <Row k="TOTAL" v={`Rs ${rs(total)}`} bold ur={isUrdu ? t('Total') : undefined} />
            {client?.paymentTerms === 'credit' ? (
              <>
                <Row k="CASH RECEIVED" v="Rs 0" ur={isUrdu ? t('Cash received') : undefined} />
                <Row k="CHARGED TO A/C" v={`Rs ${rs(total)}`} bold ur={isUrdu ? t('Charged to account') : undefined} />
                <div className="mt-1 text-center text-[10px] tracking-wide">
                  *** CREDIT ACCOUNT — NO CASH COLLECTED ***
                </div>
                {isUrdu && <UrLine center>{t('Credit account — no cash collected')}</UrLine>}
              </>
            ) : (
              <>
                <Row k="CASH RECEIVED" v={`Rs ${rs(cash)}`} bold ur={isUrdu ? t('Cash received') : undefined} />
                {cash !== total && (
                  <Row k="DIFFERENCE" v={`Rs ${rs(total - cash)}`} ur={isUrdu ? t('Difference') : undefined} />
                )}
              </>
            )}

            <Dash />
            <div className="text-[10px] tracking-wide">
              CONFIRMED BY {confirmation?.method === 'otp' ? 'OTP VERIFICATION' : 'SIGNATURE'}
            </div>

            {confirmation?.method === 'signature' && confirmation.signatureDataUrl ? (
              <div className="mt-1 border-b border-black/60 pb-1">
                <img
                  src={confirmation.signatureDataUrl}
                  alt={t('Client signature')}
                  className="h-16 w-full object-contain"
                  // Force the captured ink to black whatever colour the signature
                  // pad drew it in. `brightness(0)` blackens every opaque pixel
                  // and leaves transparency alone, so this holds whether the pad
                  // strokes light (dark theme) or dark (light theme) — it does
                  // not depend on the palette the way invert(1) did.
                  style={{ filter: 'brightness(0)' }}
                />
              </div>
            ) : confirmation?.method === 'otp' ? (
              <div className="mt-1 border-b border-black/60 pb-2 text-center text-[11px]">
                OTP VERIFIED — CODE CONSUMED
                <br />
                <span className="opacity-80">{client?.contactNumber}</span>
              </div>
            ) : (
              <div className="mt-6 border-b border-black/60" />
            )}
            {/* Key line — the customer signs against this label. */}
            <div className="text-[10px]">RECEIVED BY (CLIENT)</div>
            {isUrdu && <UrLine>{t('Received by (customer) — signature')}</UrLine>}

            <Dash />
            <Row k="RECEIPT" v={confirmation?.receiptRef ?? '—'} />
            <Row
              k="SYNC"
              v={
                sync === 'synced'
                  ? 'SERVER ACK'
                  : sync === 'syncing'
                    ? 'IN FLIGHT'
                    : queued
                      ? `QUEUED ${shortRef(queued.clientRef).toUpperCase()}`
                      : 'LOCAL'
              }
            />

            <Dash />
            <div className="text-center text-[10px] leading-snug">
              Goods received in good order and condition.
              <br />
              Empties remain the property of MCL.
              <br />
              <span className="font-bold tracking-wider">*** CUSTOMER COPY ***</span>
            </div>
            {isUrdu && (
              <UrLine center>
                {t('Goods received in good order and condition. Empty cylinders remain the property of MCL.')}
              </UrLine>
            )}
            <div className="mt-2 text-center text-[9px] opacity-70">
              Replaces the hand-written ECR book. Retain for your records.
            </div>
          </div>

          {/* torn bottom edge */}
          <div
            className="h-2.5 w-full"
            style={{
              background: `repeating-conic-gradient(from 135deg at 50% 0%, ${PAPER} 0% 25%, transparent 0% 50%) 0 0/12px 10px`,
            }}
            aria-hidden="true"
          />
        </div>
      </div>

      {/* ── Printer controls ─────────────────────────────────────────────── */}
      {/* The paper above is untouched. What surrounded it was not: a printer
          card with a paragraph, an "Integration point" box with three bullets,
          and two more advisory notes. The driver's job here is to press Print
          and hand over paper. The integration and hardware notes are project
          documentation, not a screen. */}
      <div className="min-w-0 flex-1 space-y-3">
        <Btn
          variant="primary"
          size="lg"
          disabled={state === 'printing'}
          onClick={print}
          className="min-h-[64px] w-full text-md"
        >
          <span className="flex items-center justify-center gap-2">
            <Printer className="h-6 w-6 shrink-0" />
            {state === 'printing'
              ? t('Printing…')
              : state === 'printed'
                ? t('Print another copy')
                : t('Print receipt')}
          </span>
        </Btn>

        {state === 'printed' && (
          <p className="flex items-center justify-center gap-2 text-md font-semibold text-success-fg">
            <Check className="h-5 w-5 shrink-0" />
            {t('{n} printed', { n: copies })}
          </p>
        )}

        {/* Meaning-bearing state: the client has paper the server has not seen
            yet. That is a fact the driver is accountable for, so it stays. */}
        {sync !== 'synced' && (
          <p className="flex items-center gap-2 text-md font-semibold text-warn-fg">
            <WifiOff className="h-5 w-5 shrink-0" />
            {t('Saved on this tab — queued for sync')}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Paper pieces ────────────────────────────────────────────────────────────

function Dash() {
  return <div className="my-1.5 border-t border-dashed border-black/60" aria-hidden="true" />;
}

/**
 * An Urdu line on the paper. Carries its own dir and the Nastaliq stack, with
 * room to breathe — Nastaliq needs the extra leading, so this deliberately does
 * not inherit the receipt's tight monospace line-height.
 */
function UrLine({ children, center }: { children: React.ReactNode; center?: boolean }) {
  return (
    <div
      dir="rtl"
      lang="ur"
      className={'font-urdu text-[11px] leading-relaxed ' + (center ? 'text-center' : 'text-start')}
    >
      {children}
    </div>
  );
}

/**
 * One printed row: Latin key on the left, value right-aligned in the column.
 * `ur` adds the Urdu label underneath the key without disturbing the column
 * maths, so the reconciliation columns stay exactly where the office expects.
 */
function Row({ k, v, bold, ur }: { k: string; v: string; bold?: boolean; ur?: string }) {
  return (
    <div className={bold ? 'font-bold' : ''}>
      <div className="flex justify-between gap-3">
        <span className="shrink-0">{k}</span>
        <span className="truncate text-end tabular-nums">{v}</span>
      </div>
      {ur && <UrLine>{ur}</UrLine>}
    </div>
  );
}
