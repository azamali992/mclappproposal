// ─── SyncStatus ──────────────────────────────────────────────────────────────
// The device outbox, made legible from the back of a room.
//
// Two things have to be obvious here:
//   1. Going offline costs the driver nothing — captures still land instantly.
//   2. Coming back online costs the office nothing — every queued action is
//      matched on its device-generated client_ref and applied exactly once.
//
// The "applied once" claim is not asserted in prose; it is counted, live, from
// the queue and the server-side delivery_event ledger.
//
// Plain-UI pass: the hazard stripes, the pulsing status dots and the progress
// bar are gone. Every state is now a word on a white card with one hairline
// border — "Pending", "Synced", "Offline" — with colour as a second signal
// rather than the only one. The audit detail (client_ref, distinct refs,
// server rows) stays in full, because this panel IS the audit story; it is
// just no longer shouting at 11px.

import { useState } from 'react';
import { select } from '../../core/store';
import { Wifi, WifiOff, Sync, Check, Database, Clock, Alert } from '../../ui/icons';
import { useT } from '../../i18n';
import { Btn, clock, shortRef, useAll } from './index';

interface Props {
  variant: 'panel' | 'drawer';
  onToggleOnline: (next: boolean) => void;
  onSyncNow: () => void;
  driverId: number;
}

export default function SyncStatus({ variant, onToggleOnline, onSyncNow, driverId }: Props) {
  const s = useAll();
  const t = useT();
  const [replays, setReplays] = useState(0);

  const queue = s.queue;
  const pending = queue.filter((q) => q.state === 'pending' || q.state === 'failed');
  const inFlight = queue.filter((q) => q.state === 'syncing');
  const synced = queue.filter((q) => q.state === 'synced');

  // ── The dedupe proof, computed rather than claimed ──────────────────────
  const refs = Array.from(new Set(queue.map((q) => q.clientRef)));
  const serverRows = s.deliveryEvents.filter((d) => refs.includes(d.clientRef));
  const refsLanded = refs.filter((r) => s.deliveryEvents.some((d) => d.clientRef === r)).length;
  const duplicates = serverRows.length - refsLanded;

  const ledger = s.deliveryEvents.filter((d) => d.driverId === driverId).slice(0, 6);

  return (
    <div className={variant === 'panel' ? 'mx-auto max-w-[760px] space-y-4' : 'space-y-4'}>
      {/* ── Network state ─────────────────────────────────────────────────── */}
      <div
        className={
          'rounded-md border p-5 ' +
          (s.online ? 'border-line bg-surface' : 'border-warn bg-warn-soft')
        }
      >
        <div className="flex items-start gap-4">
          <span className={'shrink-0 ' + (s.online ? 'text-success-fg' : 'text-warn-fg')}>
            {s.online ? <Wifi className="h-8 w-8" /> : <WifiOff className="h-8 w-8" />}
          </span>

          <div className="min-w-0 flex-1">
            <h2 className={'text-xl font-semibold ' + (s.online ? 'text-success-fg' : 'text-warn-fg')}>
              {s.online
                ? t('Online — outbox draining automatically')
                : t('Offline — capturing to this tab')}
            </h2>
            <p className="mt-1.5 text-md text-fg-muted">
              {s.online
                ? t('Every action recorded on this device is replayed against its client_ref. The server accepts each one exactly once, in the order it happened.')
                : t('Carry on working. Deliveries, signatures and receipts all complete locally with no network. Nothing is lost and nothing needs re-keying at the office.')}
            </p>
          </div>
        </div>

        {/* Two buttons, both plain and both tall. Sync now is the primary one
            when there is anything to send; otherwise nothing here shouts. */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => onToggleOnline(!s.online)}
            className="flex min-h-[56px] flex-1 items-center justify-center gap-2.5 rounded-md border border-line bg-surface px-5 text-md font-semibold text-fg"
          >
            {s.online ? <WifiOff className="h-5 w-5" /> : <Wifi className="h-5 w-5" />}
            {s.online ? t('Go offline') : t('Come back online')}
          </button>

          <Btn
            variant={pending.length > 0 ? 'primary' : 'secondary'}
            size="lg"
            className="min-h-[56px] px-5"
            disabled={!s.online || s.syncing}
            onClick={() => {
              setReplays((r) => r + 1);
              onSyncNow();
            }}
          >
            <span className="flex items-center gap-2">
              <Sync className="h-5 w-5" />
              {s.syncing ? t('Syncing…') : t('Sync now')}
            </span>
          </Btn>
        </div>

        {!s.online && (
          <p className="mt-3 flex items-start gap-2 text-md font-medium text-warn-fg">
            <Alert className="mt-0.5 h-5 w-5 shrink-0" />
            {t('Manual sync is disabled while offline — there is genuinely nowhere for the data to go. It is not a queue that can silently drop.')}
          </p>
        )}
      </div>

      {/* ── Counters ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        <Counter
          label={t('Queued on device')}
          value={pending.length + inFlight.length}
          tone={pending.length ? 'warn' : 'plain'}
        />
        <Counter label={t('Synced this session')} value={synced.length} tone={synced.length ? 'success' : 'plain'} />
        <Counter label={t('Duplicates applied')} value={duplicates} tone={duplicates === 0 ? 'success' : 'danger'} />
      </div>

      {/* ── Outbox ────────────────────────────────────────────────────────── */}
      <section className="rounded-md border border-line bg-surface">
        <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <h3 className="flex items-center gap-2 text-md font-semibold text-fg">
            <Sync className="h-5 w-5 text-fg-dim" />
            {t('Device outbox')}
          </h3>
          <span className="text-base text-fg-dim">
            {t('queued in the order they happened')}
          </span>
        </header>

        {queue.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <Check className="mx-auto h-8 w-8 text-success-fg" />
            <p className="mt-2 text-md font-medium text-fg">{t('Outbox empty')}</p>
            <p className="mx-auto mt-1 max-w-[460px] text-base text-fg-muted">
              {t('Nothing is waiting on this tab. Record a delivery with the radio off and it appears here in under a second, with its client_ref, and stays until signal returns.')}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-line-soft">
            {queue
              .slice()
              .reverse()
              .map((q) => {
                const order = select.order(s, q.orderId);
                const clientName = order
                  ? select.clientName(s, order.clientId)
                  : t('Order {id}', { id: q.orderId });
                const landed = s.deliveryEvents.some((d) => d.clientRef === q.clientRef);
                return (
                  <li key={q.clientRef} className="flex items-center gap-3 px-4 py-3.5">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="truncate text-md font-medium text-fg">{clientName}</span>
                        {/* ECR number: an Oracle document number, never translated. */}
                        <span className="shrink-0 font-mono text-base text-fg-dim" dir="ltr">
                          {order?.ecr ?? t('no ECR')}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-base text-fg-dim">
                        {/* q.kind is a wire symbol from the queue — left as-is. */}
                        <span dir="ltr">{q.kind}</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {clock(q.occurredAt)}
                        </span>
                        <span>
                          {/* client_ref stays — it is the audit story — but it
                              no longer shouts in caps at 11px. */}
                          <span dir="ltr">client_ref</span>{' '}
                          <code className="font-mono text-fg-muted" dir="ltr">
                            {shortRef(q.clientRef)}
                          </code>
                        </span>
                        {q.attempts > 0 && <span>{t('{n} attempts', { n: q.attempts })}</span>}
                        {landed && (
                          <span className="font-medium text-success-fg">· {t('server row written')}</span>
                        )}
                      </div>
                    </div>

                    <StateChip state={q.state} />
                  </li>
                );
              })}
          </ul>
        )}

        {queue.length > 0 && (
          <footer className="border-t border-line px-4 py-3">
            <span className="text-md tabular-nums text-fg">
              {t('{done}/{total} acknowledged', { done: synced.length, total: queue.length })}
            </span>
          </footer>
        )}
      </section>

      {/* ── Idempotency ledger ────────────────────────────────────────────── */}
      <section className="rounded-md border border-line bg-surface">
        <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <h3 className="flex items-center gap-2 text-md font-semibold text-fg">
            <Database className="h-5 w-5 text-fg-dim" />
            {t('Server ledger')} · <span className="font-mono" dir="ltr">delivery_event</span>
          </h3>
          <span
            className={
              'shrink-0 rounded-md border px-2.5 py-1 text-base font-semibold ' +
              (duplicates === 0
                ? 'border-success text-success-fg'
                : 'border-danger text-danger-fg')
            }
          >
            {duplicates === 0 ? t('No double-entry') : t('{n} duplicates', { n: duplicates })}
          </span>
        </header>

        <div className="border-b border-line px-4 py-3">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-base text-fg-muted">
            <span>
              {t('actions queued')} <b className="font-mono tabular-nums text-fg">{queue.length}</b>
            </span>
            <span>
              {t('distinct client_refs')} <b className="font-mono tabular-nums text-fg">{refs.length}</b>
            </span>
            <span>
              {t('server rows written')} <b className="font-mono tabular-nums text-fg">{serverRows.length}</b>
            </span>
            <span>
              {t('manual replays fired')} <b className="font-mono tabular-nums text-fg">{replays}</b>
            </span>
          </div>
          <p className="mt-2 text-base leading-snug text-fg-dim">
            {t('Press Sync now as many times as you like. The replay count climbs; the server row count does not. That is the whole idempotency argument, and it is why a driver going through a tunnel mid-upload cannot bill a customer twice.')}
          </p>
        </div>

        {ledger.length === 0 ? (
          <p className="px-4 py-6 text-center text-base text-fg-muted">
            {t('No server-side deliveries for this driver yet.')}
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {ledger.map((d) => {
              const order = select.order(s, d.orderId);
              return (
                <li key={d.id} className="flex items-center gap-3 px-4 py-3">
                  <Check className="h-5 w-5 shrink-0 text-success-fg" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-md text-fg">
                      {order ? select.clientName(s, order.clientId) : t('Order {id}', { id: d.orderId })}
                      <span className="ms-2 font-mono text-base text-fg-dim" dir="ltr">{order?.ecr}</span>
                    </div>
                    <div className="text-base text-fg-dim">
                      <span className="font-mono" dir="ltr">{shortRef(d.clientRef)}</span> ·{' '}
                      {t('happened {a} · recorded {b}', {
                        a: clock(d.occurredAt),
                        b: clock(d.recordedAt),
                      })}
                    </div>
                  </div>
                  <span className="shrink-0 text-base tabular-nums text-fg-muted">
                    {t('{out} out / {in} in', { out: d.cylindersDelivered, in: d.emptiesCollected })}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

// ─── Pieces ──────────────────────────────────────────────────────────────────

type QState = 'pending' | 'syncing' | 'synced' | 'failed';

/**
 * Outbox state, in words on a plain bordered label.
 *
 * The pulsing dot that used to sit at the start of each row is gone: it said
 * nothing a screen reader could hear and nothing a driver could name. The word
 * is the signal; the border colour is the confirmation. Pending and failed are
 * the two that matter — they are the rows whose work has not left the tablet —
 * so those are the ones that carry colour.
 */
function StateChip({ state }: { state: QState }) {
  const t = useT();
  const style: Record<QState, string> = {
    pending: 'border-warn text-warn-fg',
    syncing: 'border-info text-info-fg',
    synced: 'border-success text-success-fg',
    failed: 'border-danger text-danger-fg',
  };
  const label: Record<QState, string> = {
    pending: t('Pending'),
    syncing: t('Syncing'),
    synced: t('Synced'),
    failed: t('Failed'),
  };
  return (
    <span className={'shrink-0 rounded-md border px-2.5 py-1 text-base font-semibold ' + style[state]}>
      {label[state]}
    </span>
  );
}

function Counter({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'plain' | 'warn' | 'success' | 'danger';
}) {
  // Only "not yet sent" and "a duplicate got through" are worth colour here.
  // A green box around a green number is decoration; an amber box around a
  // count of unsent work is information.
  const box =
    tone === 'warn'
      ? 'border-warn text-warn-fg'
      : tone === 'danger'
        ? 'border-danger text-danger-fg'
        : 'border-line text-fg';
  return (
    <div className={'rounded-md border bg-surface px-4 py-4 ' + box}>
      {/* Latin digits in both languages. */}
      <div className="text-4xl font-semibold tabular-nums leading-none">{value}</div>
      <div className="mt-2 text-base font-medium">{label}</div>
    </div>
  );
}
