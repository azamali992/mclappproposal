// ─── DispatchModal — the ECR allocation moment ───────────────────────────────
// The single most consequential click in the system. Before confirming, the
// clerk sees exactly which number they are about to burn, broken into its four
// segments, and is told plainly that it is permanent. On confirm the store
// allocates it transactionally (api.dispatchOrder) and we reveal the result.
//
// A self-collection burns a number for exactly the same reason — the goods are
// leaving — so it runs through this same screen rather than a second one. Only
// the verb changes: `api.releaseForCollection` instead of `api.dispatchOrder`,
// and there is no vehicle, route or driver to show. The explanation of what an
// ECR is and why it is permanent is the same text for both.
//
// Nothing here computes an ECR. The preview is `select.nextEcrPreview`; the
// real number comes back from the API. If the two ever disagree, the API wins.

import { useEffect, useRef, useState } from 'react';
import { api, useStore, useCurrentUser, select, RuleError, orderCylinders, orderValue, serviceChargeTotal } from '../../../core/store';
import { canTransition } from '../../../core/stateMachine';
import { financialYear } from '../../../core/ecr';
import { Money } from '../../../ui/primitives';
import { CheckCircle, Alert, Lock, Truck, Box } from '../../../ui/icons';
import { useT } from '../../../i18n';
import { useRuleToast, fmtDate, fmtTime, TONE_CLASS } from '../shared/OrderTable';

type Phase = 'confirm' | 'allocating' | 'done';

const SEGMENTS: { key: 'yy' | 'll' | 'bb' | 'nnnn'; code: string; label: string; hint: string }[] = [
  { key: 'yy', code: 'YY', label: 'Financial year', hint: 'Restarts every July' },
  { key: 'll', code: 'LL', label: 'Location', hint: 'Plant or warehouse' },
  { key: 'bb', code: 'BB', label: 'Book type', hint: 'Product category book' },
  { key: 'nnnn', code: 'NNNN', label: 'Sequence', hint: 'Per year · location · book' },
];

function splitEcr(ecr: string) {
  return {
    yy: ecr.slice(0, 2),
    ll: ecr.slice(2, 4),
    bb: ecr.slice(4, 6),
    nnnn: ecr.slice(6, 10),
  };
}

/** The four-segment ECR display. `state` drives the colour treatment. */
function EcrSegments({
  ecr,
  state,
}: {
  ecr: string;
  state: 'preview' | 'allocated';
}) {
  const parts = splitEcr(ecr);
  const allocated = state === 'allocated';
  return (
    <div className="flex items-stretch justify-center gap-3">
      {SEGMENTS.map((seg) => (
        <div key={seg.key} className="flex-1 text-center">
          <div
            className={`border px-2 py-4 font-mono text-3xl tabular-nums ${
              // Once allocated the number goes bold on a light grey ground.
              // No glow, no tint, no ring.
              allocated ? 'border-line bg-surface-high font-bold text-fg' : 'border-line bg-surface text-fg'
            }`}
          >
            {parts[seg.key]}
          </div>
          <div className="mt-2 font-mono text-base text-fg-muted">{seg.code}</div>
          <div className="text-base font-medium leading-tight text-fg">{seg.label}</div>
          <div className="text-base leading-tight text-fg-muted">{seg.hint}</div>
        </div>
      ))}
    </div>
  );
}

export interface DispatchModalProps {
  /** Null keeps the modal closed. */
  orderId: number | null;
  onClose: () => void;
  /** Fired once the store has allocated the number. */
  onDispatched?: (ecr: string, orderId: number) => void;
}

export function DispatchModal({ orderId, onClose, onDispatched }: DispatchModalProps) {
  const t = useT();
  const s = useStore((st) => st);
  const me = useCurrentUser();
  const toast = useRuleToast();
  const [phase, setPhase] = useState<Phase>('confirm');
  const [allocated, setAllocated] = useState<string | null>(null);
  const confirmRef = useRef<HTMLButtonElement | null>(null);
  const timer = useRef<number | null>(null);

  const order = orderId == null ? undefined : select.order(s, orderId);

  useEffect(() => {
    setPhase('confirm');
    setAllocated(null);
  }, [orderId]);

  useEffect(() => {
    if (orderId == null) return;
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [orderId, onClose]);

  if (orderId == null || !order) return null;

  const location = select.location(s, order.locationId);
  const book = select.bookType(s, order.bookTypeId);
  const client = select.client(s, order.clientId);
  const vehicle = select.vehicle(s, order.vehicleId);
  const driver = select.user(s, order.driverId);
  const route = select.route(s, order.routeId);

  const preview = select.nextEcrPreview(s, order.locationId, order.bookTypeId);
  const shown = allocated ?? preview;
  const seqKey = `${financialYear()}|${location?.code}|${book?.code}`;
  const counterNow = s.ecrSequences[seqKey] ?? 1;

  /** A self-collection releases over the counter; a delivery goes on a vehicle. */
  const isCollection = order.fulfilment === 'collection';
  const service = serviceChargeTotal(order);

  const confirm = () => {
    if (phase !== 'confirm') return;
    setPhase('allocating');
    timer.current = window.setTimeout(() => {
      try {
        const ecr = isCollection ? api.releaseForCollection(order.id) : api.dispatchOrder(order.id);
        setAllocated(ecr);
        setPhase('done');
        toast(
          isCollection
            ? t('ECR {ecr} allocated. {client}’s cylinders are set aside at the counter — record the collection when their van arrives.', {
                ecr,
                client: client?.name ?? 'The client',
              })
            : t('ECR {ecr} allocated to {client} and locked to this order.', {
                ecr,
                client: client?.name ?? 'client',
              }),
          'success',
          isCollection ? t('Released for collection') : t('Dispatched'),
        );
        onDispatched?.(ecr, order.id);
      } catch (err) {
        setPhase('confirm');
        const msg = err instanceof RuleError ? err.message : (err as Error).message;
        const rule = err instanceof RuleError ? err.rule : 'ERROR';
        toast(`${msg}`, 'danger', `${isCollection ? t('Release blocked') : t('Dispatch blocked')} — ${rule}`);
      }
    }, 420);
  };

  // A collection never passes through ASSIGNED — it is released straight from
  // Filled, which is exactly the FILLED → DISPATCHED step the state machine
  // already allows for it.
  const canDispatch = isCollection ? canTransition(order.status, 'DISPATCHED') : order.status === 'ASSIGNED';

  return (
    <div
      className="fixed inset-0 z-modal flex items-center justify-center p-6"
      role="dialog"
      aria-modal="true"
      aria-label={isCollection ? t('Release for collection') : t('Confirm dispatch')}
    >
      <div className="absolute inset-0 bg-scrim" onClick={onClose} aria-hidden="true" />

      <div className="relative w-[46rem] max-w-full overflow-hidden border border-line bg-surface">
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <header className="flex items-start gap-3 border-b border-line bg-surface px-5 py-4">
          <span className={`mt-1 border p-2 ${phase === 'done' ? TONE_CLASS.success : TONE_CLASS.warn}`}>
            {phase === 'done' ? <CheckCircle className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-semibold text-fg">
              {phase === 'done'
                ? isCollection
                  ? t('Released — ECR allocated')
                  : t('Dispatched — ECR allocated')
                : isCollection
                  ? t('Release for collection')
                  : t('Confirm dispatch')}
            </h2>
            <p className="mt-1 text-base text-fg-muted">
              {phase === 'done'
                ? isCollection
                  ? t('The number below is now permanently bound to this collection.')
                  : t('The number below is now permanently bound to this delivery.')
                : t('Confirming issues the next number from this book. Review it first.')}
            </p>
          </div>
          <span className="whitespace-nowrap font-mono text-base tabular-nums text-fg-muted">
            Order #{order.id}
          </span>
        </header>

        {/* ── What is leaving the plant ──────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 border-b border-line px-5 py-4 text-base sm:grid-cols-4">
          <div>
            <div className="text-base text-fg-muted">{t('Client')}</div>
            <div className="truncate font-medium text-fg">{client?.name}</div>
          </div>
          {isCollection ? (
            <>
              <div>
                <div className="text-base text-fg-muted">{t('How it goes out')}</div>
                <div className="flex items-center gap-2 truncate text-fg">
                  <Box className="h-4 w-4 flex-none text-fg-muted" />
                  {t('Client collects')}
                </div>
              </div>
              <div>
                <div className="text-base text-fg-muted">{t('Vehicle, route and driver')}</div>
                <div className="truncate text-fg-muted">{t('None — the client’s own van')}</div>
              </div>
            </>
          ) : (
            <>
              <div>
                <div className="text-base text-fg-muted">{t('Vehicle and driver')}</div>
                <div className="truncate text-fg">
                  <span className="font-mono">{vehicle?.registration ?? '—'}</span> · {driver?.name ?? '—'}
                </div>
              </div>
              <div>
                <div className="text-base text-fg-muted">{t('Route')}</div>
                <div className="truncate text-fg">{route?.code ?? '—'}</div>
              </div>
            </>
          )}
          <div>
            <div className="text-base text-fg-muted">{t('Cylinders and value')}</div>
            <div className="truncate font-mono tabular-nums text-fg">
              {orderCylinders(order, 'qtyLoaded')} {t('cylinders')} · <Money value={orderValue(order)} />
            </div>
            {service > 0 && (
              <div className="truncate text-base text-fg-muted">
                {t('includes')} <Money value={service} /> {t('service work')}
              </div>
            )}
          </div>
        </div>

        {isCollection && (
          <div className="border-b border-line px-5 py-3 text-base text-fg-muted">
            {t(
              'Priced off the ex-delivery rate card — transport is not included, because MCL is not moving it. Wanted {date}.',
              { date: fmtDate(order.requestedDate) },
            )}
          </div>
        )}

        {/* ── The number ─────────────────────────────────────────────────── */}
        <div className="px-5 py-6">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-lg font-semibold text-fg">
              {phase === 'done'
                ? isCollection
                  ? t('The number now on this collection')
                  : t('The number now on this delivery')
                : t('The next number in this book')}
            </h3>
            <span className="text-base text-fg-muted">
              {location?.name} · {book?.name} · FY {financialYear()}
            </span>
          </div>

          {shown ? (
            <div className="border border-line bg-surface p-5">
              <EcrSegments ecr={shown} state={phase === 'done' ? 'allocated' : 'preview'} />

              <div className="mt-5 flex items-center justify-center gap-3 border-t border-line pt-4">
                <span className="text-base text-fg-muted">Stored as</span>
                <span className="font-mono text-lg tabular-nums text-fg">{shown}</span>
                {phase === 'allocating' && (
                  <span className="ms-2 text-base text-fg-muted">allocating…</span>
                )}
              </div>
            </div>
          ) : (
            <div className={`border px-4 py-6 text-center text-base ${TONE_CLASS.danger}`}>
              No book is configured for this location and book type — dispatch cannot allocate a number.
            </div>
          )}

          {/* ── The plain statement of consequence ───────────────────────── */}
          {phase !== 'done' ? (
            <div className={`mt-5 flex gap-3 border px-4 py-3 ${TONE_CLASS.warn}`}>
              <Alert className="mt-0.5 h-5 w-5 flex-none" />
              <div className="text-base leading-relaxed">
                <p className="font-semibold">Confirming allocates this number permanently.</p>
                <p className="mt-1 text-fg-muted">
                  The ECR is issued server-side inside the same transaction that records the dispatch, so
                  two clerks can never be handed the same number. Once issued it is{' '}
                  <span className="font-semibold text-warn-fg">never reissued</span> — not if the order is
                  cancelled, not if the truck turns back, not if the paperwork is lost. Counter{' '}
                  <span className="font-mono tabular-nums">
                    {location?.code}/{book?.code}
                  </span>{' '}
                  moves {String(counterNow).padStart(4, '0')} → {String(counterNow + 1).padStart(4, '0')}.
                </p>
              </div>
            </div>
          ) : (
            <div className={`mt-5 flex gap-3 border px-4 py-3 ${TONE_CLASS.success}`}>
              <CheckCircle className="mt-0.5 h-5 w-5 flex-none" />
              <div className="text-base leading-relaxed">
                <p className="font-semibold">
                  Allocated {fmtTime(order.dispatchedAt)} by {me.name}.
                </p>
                <p className="mt-1 text-fg-muted">
                  The next number in book{' '}
                  <span className="font-mono tabular-nums">
                    {location?.code}/{book?.code}
                  </span>{' '}
                  is now{' '}
                  <span className="font-mono tabular-nums">{String(counterNow).padStart(4, '0')}</span>.{' '}
                  {isCollection ? (
                    <>
                      This ECR sits on the counter&rsquo;s collection list, it is what the person who turns
                      up signs for, and it is the idempotency key for the Oracle post — the same number end
                      to end, with no re-keying.
                    </>
                  ) : (
                    <>
                      This ECR is on {driver?.name ?? 'the driver'}&rsquo;s manifest, it is what the client
                      signs against, and it is the idempotency key for the Oracle post — the same number end
                      to end, with no re-keying.
                    </>
                  )}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <footer className="flex items-center justify-between gap-3 border-t border-line bg-surface px-5 py-4">
          <p className="text-base text-fg-muted">
            {phase === 'done' ? (
              isCollection ? (
                <>
                  {t(
                    'The order is now waiting at the counter. Record the collection when the client’s van arrives.',
                  )}
                </>
              ) : (
                <>The order has moved to Dispatched and left the warehouse queue.</>
              )
            ) : (
              <>
                <kbd className="border border-line px-1.5 font-mono">Esc</kbd> cancel ·{' '}
                <kbd className="border border-line px-1.5 font-mono">Enter</kbd> confirm
              </>
            )}
          </p>
          <div className="flex gap-2">
            {phase !== 'done' && (
              <button
                type="button"
                onClick={onClose}
                className="border border-line px-4 py-2 text-base font-medium text-fg hover:bg-surface-high focus:outline-none focus-visible:ring-1 focus-visible:ring-accent"
              >
                Not yet
              </button>
            )}
            <button
              ref={confirmRef}
              type="button"
              disabled={phase === 'allocating' || (!canDispatch && phase !== 'done')}
              onClick={phase === 'done' ? onClose : confirm}
              className={`inline-flex items-center gap-2 px-5 py-2.5 text-base font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50 ${
                phase === 'done'
                  ? 'border border-line bg-surface text-fg hover:bg-surface-high'
                  : 'bg-accent text-accent-fg hover:bg-accent-hover active:bg-accent-press'
              }`}
            >
              {phase === 'done' ? (
                <>
                  <CheckCircle className="h-5 w-5" /> Done
                </>
              ) : phase === 'allocating' ? (
                <>{t('Allocating…')}</>
              ) : isCollection ? (
                <>
                  <Box className="h-5 w-5" /> {t('Release for collection and allocate the ECR')}
                </>
              ) : (
                <>
                  <Truck className="h-5 w-5" /> Confirm dispatch and allocate the ECR
                </>
              )}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default DispatchModal;
