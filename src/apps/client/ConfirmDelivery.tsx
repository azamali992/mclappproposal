// ─── Client app · Confirm delivery ───────────────────────────────────────────
// The customer closes their own receipt from their own phone. On paper this was
// a signature on a carbon copy that nobody could later find.
//
// Plain build: white ground, hairline rules, no tinted panels or status discs.
// Direction: logical utilities; the OTP field is pinned dir="ltr" because a
// one-time code is a Latin-digit sequence.

import { useState } from 'react';
import { useStore, select, api } from '../../core/store';
import { Button, Input, Textarea, Modal, EmptyState } from '../../ui/primitives';
import { useT } from '../../i18n';
import { PKR, N, Ecr, useNotify, fmtTime, headline } from './OrderTracking';

export interface ConfirmDeliveryProps {
  orderId: number;
  clientId: number;
  onDone: () => void;
  onViewReceipt: (orderId: number) => void;
}

export default function ConfirmDelivery({
  orderId,
  clientId,
  onDone,
  onViewReceipt,
}: ConfirmDeliveryProps) {
  const t = useT();
  const notify = useNotify();
  const order = useStore((s) => s.orders.find((o) => o.id === orderId));
  const client = useStore((s) => select.client(s, clientId));
  const products = useStore((s) => s.products);
  const delivery = useStore((s) => s.deliveryEvents.find((d) => d.orderId === orderId));
  const driver = useStore((s) => (order?.driverId ? select.user(s, order.driverId) : undefined));
  const vehicle = useStore((s) => (order?.vehicleId ? select.vehicle(s, order.vehicleId) : undefined));

  const [demoCode, setDemoCode] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeNote, setDisputeNote] = useState('');

  if (!order || order.clientId !== clientId) {
    return (
      <div className="px-5 py-10">
        <EmptyState
          title={t('Not available')}
          description={t('This delivery does not belong to your account.')}
        />
      </div>
    );
  }

  const h = headline(order, t);
  const delivered = order.lines.reduce((s, l) => s + (l.qtyDelivered ?? 0), 0);
  const ordered = order.lines.reduce((s, l) => s + l.qtyOrdered, 0);
  const empties = order.lines.reduce((s, l) => s + (l.qtyReturned ?? 0), 0);
  const cash = delivery?.cashCollected ?? 0;
  const short = delivered < ordered;

  function sendOtp() {
    setBusy(true);
    try {
      const issued = api.requestOtp(order!.id);
      setDemoCode(issued);
      setCode('');
      notify.ok(t('Code sent to {number}.', { number: client?.contactNumber ?? t('your number') }));
    } catch (err) {
      notify.fail(err);
    } finally {
      setBusy(false);
    }
  }

  function confirm() {
    setBusy(true);
    try {
      api.confirmDelivery({ orderId: order!.id, method: 'otp', otpCode: code.trim() });
      notify.ok(t('Delivery confirmed. Thank you.'));
    } catch (err) {
      notify.fail(err);
    } finally {
      setBusy(false);
    }
  }

  function dispute() {
    setBusy(true);
    try {
      api.disputeDelivery(
        order!.id,
        disputeNote.trim() || t('Client raised an issue with this delivery.'),
      );
      setDisputeOpen(false);
      notify.ok(t('Issue raised — MCL has been notified.'));
    } catch (err) {
      notify.fail(err);
    } finally {
      setBusy(false);
    }
  }

  // ── Already closed ─────────────────────────────────────────────────────────
  if (order.status !== 'DELIVERED') {
    const disputed = order.status === 'DISPUTED';
    return (
      <div className="flex flex-col gap-6 px-4 pb-10 pt-6">
        <div>
          <h1
            className={[
              'text-2xl font-bold',
              disputed ? 'text-danger-fg' : 'text-fg',
            ].join(' ')}
          >
            {h.title}
          </h1>
          <p className="mt-1 text-md ltr:leading-relaxed text-fg-muted">{h.sub}</p>
        </div>

        <div>
          <p className="flex flex-wrap items-center justify-between gap-3 border-y border-line py-3">
            <span className="text-md text-fg-muted">{t('ECR')}</span>
            {order.ecr ? <Ecr v={order.ecr} /> : <span className="text-md text-fg-muted">—</span>}
          </p>
          {order.confirmedAt && (
            <p className="mt-3 text-md text-fg">
              {t('Closed at {time} from your phone.', { time: fmtTime(order.confirmedAt, t) })}
            </p>
          )}
          <p className="mt-2 text-md ltr:leading-relaxed text-fg-muted">
            {t(
              'Cash reconciliation and the Oracle posting happen at MCL’s end. Nothing further is needed from you.',
            )}
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Button variant="primary" size="lg" block onClick={() => onViewReceipt(order.id)}>
            {t('View receipt')}
          </Button>
          <Button variant="secondary" size="lg" block onClick={onDone}>
            {t('Done')}
          </Button>
        </div>
      </div>
    );
  }

  // ── Confirm flow ───────────────────────────────────────────────────────────
  const driverName = driver?.name ?? t('The driver');
  const deliveredAtTime = fmtTime(order.deliveredAt, t);

  return (
    <div className="flex flex-col gap-6 px-4 pb-10 pt-4">
      <header>
        <p className="text-md font-bold text-warn-fg">{t('Awaiting your confirmation')}</p>
        <h1 className="mt-1 text-2xl font-bold text-fg">{t('Confirm your delivery')}</h1>
        <p className="mt-1 text-md ltr:leading-relaxed text-fg-muted">
          {vehicle
            ? t('{driver} delivered at {time} on {vehicle}. Check the numbers before you confirm.', {
                driver: driverName,
                time: deliveredAtTime,
                vehicle: vehicle.registration,
              })
            : t('{driver} delivered at {time}. Check the numbers before you confirm.', {
                driver: driverName,
                time: deliveredAtTime,
              })}
        </p>
      </header>

      {/* What was handed over */}
      <section>
        {order.ecr && (
          <p className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
            <span className="text-md text-fg-muted">{t('ECR bill number')}</span>
            <Ecr v={order.ecr} />
          </p>
        )}
        <ul className="divide-y divide-line border-b border-line">
          {order.lines.map((l) => {
            const p = products.find((x) => x.id === l.productId);
            return (
              <li key={l.id} className="flex min-h-[56px] items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-md text-fg">{p?.name}</p>
                  <p className="text-base text-fg-muted">{p?.size}</p>
                </div>
                <div className="text-end">
                  <p className="text-md font-bold text-fg" data-num>
                    {t('{a} of {b}', { a: l.qtyDelivered ?? 0, b: l.qtyOrdered })}
                  </p>
                  {l.reasonCode && <p className="text-base text-warn-fg">{l.reasonCode}</p>}
                </div>
              </li>
            );
          })}
        </ul>
        <dl className="divide-y divide-line">
          <div className="flex items-baseline justify-between gap-3 py-3">
            <dt className="text-md text-fg-muted">{t('Delivered')}</dt>
            <dd
              className={['text-md font-bold', short ? 'text-warn-fg' : 'text-fg'].join(' ')}
            >
              <N v={delivered} />
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-3 py-3">
            <dt className="text-md text-fg-muted">{t('Empties taken')}</dt>
            <dd className="text-md font-bold text-fg">
              <N v={empties} />
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-3 py-3">
            <dt className="text-md text-fg-muted">{t('Cash')}</dt>
            <dd className="text-md font-bold text-fg">
              <PKR v={cash} />
            </dd>
          </div>
        </dl>
      </section>

      {short && (
        <p className="text-md ltr:leading-relaxed text-warn-fg">
          {t(
            '{n} cylinder(s) short of what you ordered. Confirming accepts the delivered quantity — raise an issue instead if that is wrong.',
            { n: ordered - delivered },
          )}
        </p>
      )}

      {/* OTP */}
      <section>
        <h2 className="text-lg font-bold text-fg">{t('Confirm by one-time code')}</h2>
        <p className="mt-1 text-md ltr:leading-relaxed text-fg-muted">
          {t(
            'We send a 6-digit code to {number}. Entering it here is your signature — it is recorded against this ECR and cannot be edited afterwards.',
            { number: client?.contactNumber ?? '' },
          )}
          {client?.confirmMethod === 'signature' && (
            <>
              {' '}
              {t(
                'Your account is normally confirmed by signature on the driver’s tab; confirming here from your own phone works the same way.',
              )}
            </>
          )}
        </p>

        {!demoCode ? (
          <Button variant="primary" size="lg" block className="mt-4" loading={busy} onClick={sendOtp}>
            {t('Send me the code')}
          </Button>
        ) : (
          <div className="mt-4 space-y-4">
            {/* Demo aid — clearly labelled, never present in production */}
            <div className="rounded-md border border-line-strong p-3">
              <p className="text-md font-bold text-fg">{t('Demo only · SMS not sent')}</p>
              <p className="mt-1 flex flex-wrap items-baseline gap-2 text-md text-fg-muted">
                {t('Code for this delivery:')}
                <span
                  className="font-mono text-lg font-bold ltr:tracking-[0.2em] text-fg"
                  data-num
                  dir="ltr"
                >
                  {demoCode}
                </span>
              </p>
            </div>
            <Input
              size="lg"
              numeric
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              aria-label={t('One-time code')}
              dir="ltr"
              className="text-center font-mono text-xl tracking-[0.35em]"
            />
            <Button
              variant="primary"
              size="lg"
              block
              loading={busy}
              disabled={code.length !== 6}
              onClick={confirm}
            >
              {t('Confirm delivery')}
            </Button>
            <button
              type="button"
              onClick={sendOtp}
              className="min-h-[48px] w-full text-md text-fg underline underline-offset-4 hover:bg-surface-high focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {t('Send a new code')}
            </button>
          </div>
        )}
      </section>

      {/* Dispute */}
      <section className="border-t border-line pt-5">
        <h2 className="text-lg font-bold text-fg">{t('Something not right?')}</h2>
        <p className="mt-1 text-md ltr:leading-relaxed text-fg-muted">
          {t(
            'Raising an issue holds this delivery open. The cash for it cannot be reconciled and nothing is posted to MCL’s accounts until it is settled.',
          )}
        </p>
        <Button
          variant="secondary"
          size="lg"
          block
          className="mt-4"
          onClick={() => setDisputeOpen(true)}
        >
          {t('Raise an issue')}
        </Button>
      </section>

      <Modal open={disputeOpen} onClose={() => setDisputeOpen(false)} title={t('Raise an issue')}>
        <div className="space-y-4">
          <p className="text-md ltr:leading-relaxed text-fg-muted">
            {t(
              'Tell MCL what is wrong with this delivery. This moves the order to “{status}”, blocks cash reconciliation and stops any Oracle posting until it is resolved.',
              { status: t('Disputed') },
            )}
          </p>
          <Textarea
            value={disputeNote}
            onChange={(e) => setDisputeNote(e.target.value)}
            rows={4}
            placeholder={t('Two cylinders were short, and one valve was leaking…')}
            aria-label={t('What is wrong')}
          />
          <div className="flex flex-col gap-3 pt-1">
            <Button variant="danger" size="lg" block loading={busy} onClick={dispute}>
              {t('Raise issue')}
            </Button>
            <Button variant="secondary" size="lg" block onClick={() => setDisputeOpen(false)}>
              {t('Cancel')}
            </Button>
          </div>
        </div>
      </Modal>

      <p className="text-md text-fg-muted">
        {t('Delivered by {who} · order #{n}', { who: driver?.name ?? 'MCL', n: order.id })}
      </p>
    </div>
  );
}
