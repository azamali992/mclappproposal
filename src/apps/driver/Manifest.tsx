// ─── Manifest ────────────────────────────────────────────────────────────────
// The driver's whole day in one rail: route, vehicle, load, and the stops in
// route-stop order. Sequence number first — that is how the run is actually
// driven. Everything else is secondary to "which gate am I at next".
//
// Under RTL the rail sits on the right: it is the first child of the flex row
// in index.tsx, so the browser places it at the inline start. Its divider is
// border-e, which keeps the rule on the inner edge in both directions.

import type { Order, Route, Vehicle } from '../../core/types';
import { select, orderCylinders } from '../../core/store';
import { Check, Cylinder, Truck, Alert, Sync, WifiOff } from '../../ui/icons';
import { useT } from '../../i18n';
import {
  Blank,
  Chip,
  PKR,
  cashDue,
  clock,
  loadOf,
  stopSeq,
  syncStateOf,
  useAll,
  useDirIcons,
} from './index';

interface Props {
  stops: Order[];
  openOrderId: number | null;
  onOpen: (id: number) => void;
  route?: Route;
  vehicle?: Vehicle;
  totalLoad: number;
}

export default function ManifestList({ stops, openOrderId, onOpen, route, vehicle, totalLoad }: Props) {
  const s = useAll();
  const t = useT();

  const remaining = stops.filter((o) => o.status === 'DISPATCHED').length;
  const finished = stops.length - remaining;

  return (
    <aside className="flex w-[360px] shrink-0 flex-col border-e border-line bg-surface">
      {/* ── Run header ────────────────────────────────────────────────────── */}
      {/* The progress bar is gone. "3/7 done" is the same fact in words, reads
          at a glance in sun, and needs no colour to be understood. */}
      <div className="shrink-0 border-b border-line px-4 py-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-base text-fg-dim">{t('Today’s run')}</div>
            {/* Route code — an operational identifier, left Latin. */}
            <div className="mt-0.5 font-mono text-xl font-semibold text-fg">
              {route?.code ?? '—'}
            </div>
            <div className="truncate text-base text-fg-muted">{route?.name ?? t('No route assigned')}</div>
          </div>
          <div className="text-end">
            <div className="flex items-center justify-end gap-1.5 text-base text-fg-dim">
              <Truck className="h-4 w-4" /> {t('Vehicle')}
            </div>
            {/* Registration plate — never translated, never transliterated. */}
            <div className="mt-0.5 font-mono text-md font-semibold tabular-nums text-fg">
              {vehicle?.registration ?? '—'}
            </div>
            <div className="flex items-center justify-end gap-1.5 text-base text-fg-muted">
              <Cylinder className="h-4 w-4 text-fg-dim" />
              <span className="tabular-nums">{t('{n} on board', { n: totalLoad })}</span>
            </div>
          </div>
        </div>

        <div className="mt-3 text-md font-semibold tabular-nums text-fg">
          {t('{done}/{total} done', { done: finished, total: stops.length })}
        </div>
      </div>

      {/* ── Stops ─────────────────────────────────────────────────────────── */}
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {stops.length === 0 ? (
          <div className="pt-8">
            <Blank
              title={t('No stops on this manifest')}
              description={t('Nothing has been dispatched to this driver yet. The warehouse clerk allocates an ECR at dispatch — until then the load is not on the road.')}
            />
          </div>
        ) : (
          <ul className="space-y-3">
            {stops.map((o) => (
              <StopCard
                key={o.id}
                order={o}
                seq={stopSeq(s, o)}
                open={o.id === openOrderId}
                onOpen={() => onOpen(o.id)}
              />
            ))}
          </ul>
        )}
      </div>

      {/* ── Cash tally for the gate ───────────────────────────────────────── */}
      <div className="shrink-0 border-t border-line bg-surface px-4 py-4">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-md text-fg-muted">{t('Cash to hand to the gate')}</span>
          <span className="text-xl font-semibold text-fg">
            <PKR
              value={stops.reduce((acc, o) => {
                const anyDelivered = o.lines.some((l) => l.qtyDelivered != null);
                return acc + (anyDelivered ? cashDue(s, o, mapDelivered(o)).amount : 0);
              }, 0)}
            />
          </span>
        </div>
        <p className="mt-1.5 text-base leading-snug text-fg-dim">
          {/* expectedCash() is a function name — kept Latin monospace on purpose. */}
          {t('Credit clients contribute nothing here —')}{' '}
          <span className="font-mono" dir="ltr">expectedCash()</span> {t('returns 0 for them.')}
        </p>
      </div>
    </aside>
  );
}

function mapDelivered(o: Order): Record<number, number> {
  const m: Record<number, number> = {};
  for (const l of o.lines) m[l.id] = l.qtyDelivered ?? 0;
  return m;
}

function StopCard({
  order,
  seq,
  open,
  onOpen,
}: {
  order: Order;
  seq: number;
  open: boolean;
  onOpen: () => void;
}) {
  const s = useAll();
  const t = useT();
  const { Forward } = useDirIcons();
  const client = select.client(s, order.clientId);
  const sync = syncStateOf(s, order.id);
  const done = order.status === 'CONFIRMED';
  const disputed = order.status === 'DISPUTED';
  const awaiting = order.status === 'DELIVERED';

  const cash = order.lines.some((l) => l.qtyDelivered != null)
    ? cashDue(s, order, mapDelivered(order))
    : cashDue(s, order);

  // SKU codes and quantities — item codes stay Latin in both languages.
  const lineSummary = order.lines
    .map((l) => `${select.product(s, l.productId)?.sku ?? '?'} ×${l.qtyLoaded ?? l.qtyOrdered}`)
    .join(' · ');

  // Delivered stops collapse to a quiet done row — the eye goes to what is
  // left. Quiet now means a plain border and grey text, not a grey fill and a
  // strike-through: struck-out text is hard to read and this row is still
  // tappable. The sync state is spelled out here too, because "done" and
  // "sent" are different facts and the driver is accountable for both.
  if (done || disputed) {
    return (
      <li>
        <button
          type="button"
          onClick={onOpen}
          className={
            'flex w-full items-center gap-3 rounded-md border px-3 py-3 text-start ' +
            (open ? 'border-fg bg-surface' : 'border-line bg-surface')
          }
        >
          <span className={'shrink-0 ' + (disputed ? 'text-danger-fg' : 'text-success-fg')}>
            {disputed ? <Alert className="h-6 w-6" /> : <Check className="h-6 w-6" />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-md font-medium text-fg-muted">
              {seq}. {client?.name}
            </span>
            <span className="block truncate text-base text-fg-dim">
              {disputed ? t('Disputed — flagged for the office') : t('Confirmed {time}', { time: clock(order.confirmedAt) })}
              {' · '}
              {t('{n} dropped', { n: orderCylinders(order, 'qtyDelivered') })}
            </span>
          </span>
          <SyncLabel state={sync} />
        </button>
      </li>
    );
  }

  return (
    <li>
      {/* Selection is a near-black border, not an orange fill: the accent is
          reserved for the one primary button per screen, and black-on-white is
          the most legible "this one" marker there is. */}
      <button
        type="button"
        onClick={onOpen}
        className={
          'w-full rounded-md border bg-surface px-4 py-3.5 text-start ' +
          (open ? 'border-fg' : awaiting ? 'border-warn bg-warn-soft' : 'border-line')
        }
      >
        <div className="flex items-start gap-3">
          <span
            className={
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-md border text-xl font-semibold tabular-nums ' +
              (open ? 'border-fg bg-fg text-fg-inverse' : 'border-line text-fg')
            }
          >
            {seq}
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate text-lg font-semibold leading-tight text-fg">{client?.name}</div>
                <div className="truncate text-md text-fg-muted">{client?.area}</div>
              </div>
              {/* Mirrors under RTL — it points at the pane the tap opens. */}
              <Forward className="mt-1 h-5 w-5 shrink-0 text-fg-dim" />
            </div>

            <div className="mt-2 flex items-center gap-2 text-base text-fg-muted">
              <Cylinder className="h-4 w-4 shrink-0 text-fg-dim" />
              <span className="truncate font-mono" dir="ltr">{lineSummary}</span>
            </div>

            <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-3">
              <div>
                <div className="text-base text-fg-dim">
                  {cash.credit ? t('Payment') : awaiting ? t('Cash taken') : t('Cash expected')}
                </div>
                <div className="text-lg font-semibold text-fg">
                  {cash.credit ? (
                    <span className="text-info-fg">{t('On account')}</span>
                  ) : (
                    <PKR value={cash.amount} />
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                {awaiting ? (
                  <Chip tone="warn">{t('Needs confirmation')}</Chip>
                ) : (
                  <span className="text-md font-semibold text-fg">{t('{n} to drop', { n: loadOf(order) })}</span>
                )}
                <SyncLabel state={sync} />
              </div>
            </div>
          </div>
        </div>
      </button>
    </li>
  );
}

/**
 * Per-stop sync state, in words.
 *
 * The coloured dot is gone. A dot asks the driver to remember what amber means
 * while standing in the sun; a word does not, and it reaches a screen reader.
 * Colour is still there — amber for not-yet-sent, green for sent — but it is
 * now the second signal, not the only one.
 *
 * The wording is deliberately the existing translated vocabulary (Pending /
 * Syncing / Synced) rather than a plainer "Not sent" / "Sent": those two
 * strings have no Urdu entry, and this folder cannot add one (src/i18n is
 * owned elsewhere). Swapping the wording without the dictionary entry would
 * silently drop an Urdu driver back into English on the one label that says
 * whether their day's work has left the tablet. See the handoff note.
 */
function SyncLabel({ state }: { state: ReturnType<typeof syncStateOf> }) {
  const t = useT();
  if (state === 'none') return null;
  if (state === 'synced') {
    return (
      <span className="flex shrink-0 items-center gap-1.5 text-base font-semibold text-success-fg">
        <Check className="h-4 w-4" /> {t('Synced')}
      </span>
    );
  }
  if (state === 'syncing') {
    return (
      <span className="flex shrink-0 items-center gap-1.5 text-base font-semibold text-info-fg">
        <Sync className="h-4 w-4" /> {t('Syncing')}
      </span>
    );
  }
  return (
    <span className="flex shrink-0 items-center gap-1.5 rounded-md border border-warn px-2 py-0.5 text-base font-semibold text-warn-fg">
      <WifiOff className="h-4 w-4" /> {t('Pending')}
    </span>
  );
}
