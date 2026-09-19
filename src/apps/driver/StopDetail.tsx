// ─── StopDetail ──────────────────────────────────────────────────────────────
// One gate, one order. The step the driver is on is derived from the order's
// status, not from local UI state — reopening a stop always lands on the truth.
//
//   DISPATCHED → capture   DELIVERED → confirm   CONFIRMED → receipt

import { useState } from 'react';
import type { Order } from '../../core/types';
import { select, orderCylinders } from '../../core/store';
import {
  Check,
  Alert,
  Signature,
  Map as MapIcon,
  User,
  Clock,
  WifiOff,
  Sync,
} from '../../ui/icons';
import { useT } from '../../i18n';
import DeliveryCapture from './DeliveryCapture';
import ConfirmSheet from './ConfirmSheet';
import ReceiptPreview from './ReceiptPreview';
import {
  Btn,
  Chip,
  Ecr,
  PKR,
  clock,
  shortRef,
  stopSeq,
  syncStateOf,
  useAll,
  useDirIcons,
  type Session,
} from './index';

interface Props {
  order: Order;
  session: Session;
  onBack: () => void;
  onDone: (orderId: number) => void;
  onOpenSync: () => void;
}

type Step = 1 | 2 | 3;

export default function StopDetail({ order, session, onBack, onDone, onOpenSync }: Props) {
  const s = useAll();
  const t = useT();
  const { Back } = useDirIcons();
  const client = select.client(s, order.clientId);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const step: Step = order.status === 'DISPATCHED' ? 1 : order.status === 'DELIVERED' ? 2 : 3;
  const disputed = order.status === 'DISPUTED';
  const sync = syncStateOf(s, order.id);
  const queued = s.queue.find((q) => q.orderId === order.id);

  return (
    <div className="flex min-h-full flex-col">
      {/* ── Stop header ───────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 border-b border-line bg-surface px-5 py-4">
        <div className="flex items-start gap-3">
          <Btn variant="secondary" size="lg" onClick={onBack} className="min-h-[48px] shrink-0">
            <span className="flex items-center gap-1.5">
              {/* Mirrors under RTL — it points back at the rail. */}
              <Back className="h-5 w-5" /> {t('Manifest')}
            </span>
          </Btn>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-md border border-line text-md font-bold tabular-nums text-fg">
                {stopSeq(s, order)}
              </span>
              <h1 className="truncate text-2xl font-semibold text-fg">{client?.name}</h1>
              {client?.paymentTerms === 'credit' ? (
                <Chip tone="info">{t('Credit account')}</Chip>
              ) : (
                <Chip tone="warn">{t('Cash on delivery')}</Chip>
              )}
              {disputed && <Chip tone="danger">{t('Disputed')}</Chip>}
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-md text-fg-muted">
              <span className="flex items-center gap-1.5">
                <MapIcon className="h-4 w-4 text-fg-dim" />
                {client?.address}
              </span>
              <span className="flex items-center gap-1.5">
                <User className="h-4 w-4 text-fg-dim" />
                {/* Phone number: Latin digits, forced LTR so it never reorders. */}
                <span className="font-mono" dir="ltr">{client?.contactNumber}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-fg-dim">{t('ECR')}</span>
                <Ecr value={order.ecr} />
              </span>
            </div>
          </div>
        </div>

        <StepTrack step={step} disputed={disputed} />
      </div>

      {/* ── Body ──────────────────────────────────────────────────────────── */}
      <div className="flex-1 p-5">
        {disputed ? (
          <DisputedPanel order={order} onBack={onBack} />
        ) : step === 1 ? (
          <DeliveryCapture order={order} session={session} />
        ) : step === 2 ? (
          <div className="mx-auto max-w-[720px] space-y-4">
            <LocalWriteBanner
              clientRef={queued?.clientRef}
              sync={sync}
              online={s.online}
              at={order.deliveredAt}
              onOpenSync={onOpenSync}
            />

            <div className="rounded-md border border-line bg-surface p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-fg">{t('Captured. Now the client confirms.')}</h2>
                  <p className="mt-1.5 max-w-[460px] text-md text-fg-muted">
                    {t('{out} cylinders dropped, {back} empties on board. The delivery is already saved on this tab — confirmation is a separate, append-only event.', {
                      out: orderCylinders(order, 'qtyDelivered'),
                      back: orderCylinders(order, 'qtyReturned'),
                    })}
                  </p>
                </div>
                <Signature className="h-10 w-10 shrink-0 text-fg-dim" />
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3 border-t border-line pt-4">
                <Figure label={t('Dropped')} value={String(orderCylinders(order, 'qtyDelivered'))} />
                <Figure label={t('Empties in')} value={String(orderCylinders(order, 'qtyReturned'))} />
                <Figure
                  label={client?.paymentTerms === 'credit' ? t('Cash') : t('Cash taken')}
                  value={
                    client?.paymentTerms === 'credit' ? (
                      <span className="text-info-fg">{t('On account')}</span>
                    ) : (
                      <PKR value={s.queue.find((q) => q.orderId === order.id)
                        ? ((s.queue.find((q) => q.orderId === order.id)!.payload as { cashCollected?: number }).cashCollected ?? 0)
                        : (s.deliveryEvents.find((d) => d.orderId === order.id)?.cashCollected ?? 0)} />
                    )
                  }
                />
              </div>

              {/* The one primary action on this screen. */}
              <Btn
                variant="primary"
                size="lg"
                className="mt-5 min-h-[64px] w-full text-lg"
                onClick={() => setConfirmOpen(true)}
              >
                {t('Hand the tablet over — get confirmation')}
              </Btn>
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-[760px] space-y-4">
            <div className="flex items-center gap-3 rounded-md border border-success bg-success-soft px-4 py-4">
              <Check className="h-6 w-6 shrink-0 text-success-fg" />
              <div className="flex-1 text-md text-success-fg">
                {t('Stop complete. Confirmed {time} — the receipt below is what the client keeps.', {
                  time: clock(order.confirmedAt),
                })}
              </div>
              {/* The only thing left to do here is drive on. */}
              <Btn variant="primary" size="lg" onClick={onBack} className="min-h-[52px] shrink-0">
                {t('Next stop')}
              </Btn>
            </div>
            <ReceiptPreview order={order} session={session} />
          </div>
        )}
      </div>

      <ConfirmSheet
        open={confirmOpen}
        order={order}
        onClose={() => setConfirmOpen(false)}
        onSettled={() => {
          setConfirmOpen(false);
          onDone(order.id);
        }}
      />
    </div>
  );
}

// ─── Pieces ──────────────────────────────────────────────────────────────────

/**
 * Three-step tracker. It is a reading order, not a control: the row simply
 * reverses under RTL so step 1 starts at the right, which is correct. The
 * numerals stay Latin and are never mirrored.
 *
 * Plain version: three words in a row, the current one in black on white with
 * a border, the rest grey. No connector rules, no tinted fills, no uppercase
 * micro-type. The driver needs to know which of three things they are doing.
 */
function StepTrack({ step, disputed }: { step: Step; disputed: boolean }) {
  const t = useT();
  const steps: { n: Step; label: string }[] = [
    { n: 1, label: t('Capture drop') },
    { n: 2, label: t('Client confirms') },
    { n: 3, label: t('Receipt') },
  ];
  return (
    <div className="mt-4 flex items-center gap-2">
      {steps.map((st) => {
        const state = disputed ? 'idle' : st.n < step ? 'done' : st.n === step ? 'now' : 'idle';
        return (
          <div
            key={st.n}
            className={
              'flex min-h-[44px] flex-1 items-center gap-2 rounded-md border px-3 py-1.5 ' +
              (state === 'now'
                ? 'border-fg text-fg'
                : state === 'done'
                  ? 'border-line text-success-fg'
                  : 'border-line text-fg-dim')
            }
          >
            <span className="shrink-0 text-md font-bold tabular-nums">
              {state === 'done' ? '✓' : st.n}
            </span>
            <span
              className={'truncate text-md ' + (state === 'now' ? 'font-semibold' : 'font-normal')}
            >
              {st.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function LocalWriteBanner({
  clientRef,
  sync,
  online,
  at,
  onOpenSync,
}: {
  clientRef?: string;
  sync: ReturnType<typeof syncStateOf>;
  online: boolean;
  at?: string;
  onOpenSync: () => void;
}) {
  const t = useT();
  const pending = sync === 'pending' || sync === 'syncing';
  return (
    <div
      className={
        'rounded-md border p-4 ' +
        (pending ? 'border-warn bg-warn-soft' : 'border-success bg-success-soft')
      }
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0">
          {pending ? (
            sync === 'syncing' ? (
              <Sync className="h-6 w-6 text-info-fg" />
            ) : (
              <WifiOff className="h-6 w-6 text-warn-fg" />
            )
          ) : (
            <Check className="h-6 w-6 text-success-fg" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className={'text-lg font-semibold ' + (pending ? 'text-warn-fg' : 'text-success-fg')}>
            {pending ? t('Saved on this tab — queued for sync') : t('Saved and synced to the server')}
          </div>
          <p className="mt-1.5 text-md text-fg-muted">
            {pending
              ? t('The write completed locally at {time} with no network round trip. {tail} Nothing is re-keyed and nothing can be entered twice.', {
                  time: clock(at),
                  tail: online ? t('It is going up now.') : t('It leaves the device the moment signal returns.'),
                })
              : t('Recorded at {time} and acknowledged by the server against its client_ref.', { time: clock(at) })}
          </p>
          {clientRef && (
            <div className="mt-2.5 flex flex-wrap items-center gap-2 text-base text-fg-dim">
              {/* client_ref is a UUID and the field name is part of the contract —
                  both stay Latin, forced LTR so the hex never reorders. It is
                  kept because it is the audit story, but it is reference
                  material for the office, not something the driver must read:
                  plain grey, normal case, no box. */}
              <span dir="ltr">client_ref</span>
              <code className="font-mono tabular-nums text-fg-muted" dir="ltr">
                {shortRef(clientRef)}
              </code>
              <span>{t('device-generated · the idempotency key')}</span>
            </div>
          )}
        </div>
        <Btn variant="secondary" size="md" onClick={onOpenSync} className="min-h-[44px] shrink-0">
          {t('Outbox')}
        </Btn>
      </div>
    </div>
  );
}

function Figure({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md border border-line bg-surface px-4 py-3">
      <div className="text-base text-fg-dim">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums text-fg">{value}</div>
    </div>
  );
}

function DisputedPanel({ order, onBack }: { order: Order; onBack: () => void }) {
  const s = useAll();
  const t = useT();
  const ev = s.confirmationEvents.find((c) => c.orderId === order.id && c.status === 'disputed');
  return (
    <div className="mx-auto max-w-[680px] rounded-md border border-danger bg-danger-soft p-5">
      <div className="flex items-start gap-3">
        <Alert className="mt-0.5 h-7 w-7 shrink-0 text-danger-fg" />
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-danger-fg">{t('Client disputed this delivery')}</h2>
          <p className="mt-2 text-md text-fg-muted">
            {t('The drop stays on record — delivery_event is append-only and is never deleted. The dispute is a second, separate event on top of it. Nothing about this order posts to Oracle until the office resolves it.')}
          </p>
          {ev?.notes && (
            // border-s-4 is a logical property — it stays on the reader's
            // start edge under RTL. Kept because a quote needs a quote mark.
            <blockquote className="mt-3 rounded-md border border-s-4 border-danger bg-surface px-4 py-3 text-md text-fg">
              “{ev.notes}”
            </blockquote>
          )}
          <div className="mt-3 flex items-center gap-2 text-base text-fg-dim">
            <Clock className="h-4 w-4" />
            {t('Raised {time}', { time: clock(ev?.occurredAt) })} · {t('ECR')} <Ecr value={order.ecr} />
          </div>
          <Btn variant="primary" size="lg" className="mt-4 min-h-[52px]" onClick={onBack}>
            {t('Back to manifest')}
          </Btn>
        </div>
      </div>
    </div>
  );
}
