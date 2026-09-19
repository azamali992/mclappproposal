// ─── StopDetail ──────────────────────────────────────────────────────────────
// One gate, one order. The step the driver is on is derived from the order's
// status, not from local UI state — reopening a stop always lands on the truth.
//
//   DISPATCHED → capture   DELIVERED → confirm   CONFIRMED → receipt
//
// The three-step tracker that used to sit under the header is gone. The driver
// cannot navigate it, the body already shows which of the three things they are
// doing, and it cost three labels and three numbers at the top of every stop.
// The phone number and the ECR have gone with it: the phone is on the client
// record and the ECR is on the receipt and the confirmation sheet. What is left
// in the header is who this is, whether they pay cash, and where they are.

import { useState } from 'react';
import type { Order } from '../../core/types';
import { select } from '../../core/store';
import { Check, Alert, WifiOff, Sync } from '../../ui/icons';
import { useT } from '../../i18n';
import DeliveryCapture from './DeliveryCapture';
import ConfirmSheet from './ConfirmSheet';
import ReceiptPreview from './ReceiptPreview';
import {
  Btn,
  Chip,
  Ecr,
  clock,
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

export default function StopDetail({ order, session, onBack, onDone, onOpenSync }: Props) {
  const s = useAll();
  const t = useT();
  const { Back } = useDirIcons();
  const client = select.client(s, order.clientId);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const step = order.status === 'DISPATCHED' ? 1 : order.status === 'DELIVERED' ? 2 : 3;
  const disputed = order.status === 'DISPUTED';
  const sync = syncStateOf(s, order.id);

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
              <h1 className="truncate text-2xl font-semibold text-fg">{client?.name}</h1>
              {client?.paymentTerms === 'credit' ? (
                <Chip tone="info">{t('Credit account')}</Chip>
              ) : (
                <Chip tone="warn">{t('Cash on delivery')}</Chip>
              )}
              {disputed && <Chip tone="danger">{t('Disputed')}</Chip>}
            </div>
            <div className="mt-1 truncate text-md text-fg-muted">{client?.address}</div>
          </div>
        </div>
      </div>

      {/* ── Body ──────────────────────────────────────────────────────────── */}
      <div className="flex-1 p-5">
        {disputed ? (
          <DisputedPanel order={order} onBack={onBack} />
        ) : step === 1 ? (
          <DeliveryCapture order={order} session={session} />
        ) : step === 2 ? (
          <div className="mx-auto max-w-[560px] space-y-4">
            {/* Whether the drop has left the tablet, in one line. The full
                story — client_ref, attempts, server rows — is in the outbox. */}
            <SavedLine sync={sync} at={order.deliveredAt} onOpenSync={onOpenSync} />

            <div className="rounded-md border border-line bg-surface p-5">
              <h2 className="text-xl font-semibold text-fg">
                {t('Captured. Now the client confirms.')}
              </h2>
              {/* The one primary action on this screen. */}
              <Btn
                variant="primary"
                size="lg"
                className="mt-4 min-h-[64px] w-full text-lg"
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
              <div className="flex-1 text-md font-semibold text-success-fg">
                {t('Confirmed {time}', { time: clock(order.confirmedAt) })}
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
 * Saved / not-yet-sent, in one line plus a way through to the outbox.
 *
 * This replaces a four-line banner that repeated the offline story the header
 * bar and the sync panel already tell. The state word and its colour stay —
 * whether the day's work has left the tablet is the driver's accountability,
 * not a detail.
 */
function SavedLine({
  sync,
  at,
  onOpenSync,
}: {
  sync: ReturnType<typeof syncStateOf>;
  at?: string;
  onOpenSync: () => void;
}) {
  const t = useT();
  const pending = sync === 'pending' || sync === 'syncing';
  return (
    <div
      className={
        'flex items-center gap-3 rounded-md border px-4 py-3 ' +
        (pending ? 'border-warn bg-warn-soft' : 'border-success bg-success-soft')
      }
    >
      <span className="shrink-0">
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
      <div className={'min-w-0 flex-1 text-md font-semibold ' + (pending ? 'text-warn-fg' : 'text-success-fg')}>
        {pending ? t('Saved on this tab — queued for sync') : t('Saved and synced to the server')}
        <span className="ms-2 font-normal text-fg-muted">{clock(at)}</span>
      </div>
      <Btn variant="secondary" size="md" onClick={onOpenSync} className="min-h-[44px] shrink-0">
        {t('Outbox')}
      </Btn>
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
          {ev?.notes && (
            // border-s-4 is a logical property — it stays on the reader's start
            // edge under RTL. Kept because a quote needs a quote mark.
            <blockquote className="mt-3 rounded-md border border-s-4 border-danger bg-surface px-4 py-3 text-md text-fg">
              “{ev.notes}”
            </blockquote>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2 text-base text-fg-dim">
            {t('ECR')} <Ecr value={order.ecr} />
          </div>
          <Btn variant="primary" size="lg" className="mt-4 min-h-[52px]" onClick={onBack}>
            {t('Back to manifest')}
          </Btn>
        </div>
      </div>
    </div>
  );
}
