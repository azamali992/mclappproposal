// ─── Manifest ────────────────────────────────────────────────────────────────
// The list of gates still to be driven, and nothing else.
//
// One job: pick the next stop. So a row carries the three facts that choose it —
// sequence, who, how many cylinders — and the row itself is the button. The run
// header is one line. The cash tally, the load counter, the done/total progress
// and the per-line SKU codes are gone: none of them is needed to do the next
// thing, and every one of them was a number the driver had to read past.
//
// Under RTL the rail sits on the right: it is the first child of the flex row
// in index.tsx, so the browser places it at the inline start. Its divider is
// border-e, which keeps the rule on the inner edge in both directions.

import type { Order, Route, Vehicle } from '../../core/types';
import { select, orderCylinders } from '../../core/store';
import { Check, Alert, WifiOff } from '../../ui/icons';
import { useT } from '../../i18n';
import { Blank, Chip, loadOf, stopSeq, syncStateOf, useAll, useDirIcons } from './index';

interface Props {
  stops: Order[];
  openOrderId: number | null;
  onOpen: (id: number) => void;
  route?: Route;
  vehicle?: Vehicle;
}

export default function ManifestList({ stops, openOrderId, onOpen, route, vehicle }: Props) {
  const s = useAll();
  const t = useT();

  return (
    <aside className="flex w-[360px] shrink-0 flex-col border-e border-line bg-surface">
      {/* ── Run header — one line ─────────────────────────────────────────── */}
      {/* Route code and registration plate: operational identifiers, never
          translated, never transliterated. */}
      <div className="shrink-0 truncate border-b border-line px-4 py-4 font-mono text-lg font-semibold text-fg">
        <span dir="ltr">
          {route?.code ?? '—'} · {vehicle?.registration ?? '—'}
        </span>
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
    </aside>
  );
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
  const done = order.status === 'CONFIRMED';
  const disputed = order.status === 'DISPUTED';
  const awaiting = order.status === 'DELIVERED';

  // Only "not sent yet" earns a label. A green Synced chip on every finished row
  // is a word the driver has to read to learn that nothing is wrong.
  const unsent = syncStateOf(s, order.id) === 'pending';

  // Delivered stops collapse to a quiet done row — the eye goes to what is left.
  if (done || disputed) {
    return (
      <li>
        <button
          type="button"
          onClick={onOpen}
          className={
            'flex min-h-[64px] w-full items-center gap-3 rounded-md border px-3 py-3 text-start ' +
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
              {disputed
                ? t('Disputed — flagged for the office')
                : t('{n} dropped', { n: orderCylinders(order, 'qtyDelivered') })}
            </span>
          </span>
          {unsent && <Unsent />}
        </button>
      </li>
    );
  }

  return (
    <li>
      {/* Selection is a near-black border, not a fill: the accent is reserved
          for the one primary button per screen. */}
      <button
        type="button"
        onClick={onOpen}
        className={
          'flex w-full items-center gap-3 rounded-md border bg-surface px-4 py-4 text-start ' +
          (open ? 'border-fg' : awaiting ? 'border-warn bg-warn-soft' : 'border-line')
        }
      >
        <span
          className={
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-md border text-xl font-semibold tabular-nums ' +
            (open ? 'border-fg bg-fg text-fg-inverse' : 'border-line text-fg')
          }
        >
          {seq}
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate text-lg font-semibold leading-tight text-fg">
            {client?.name}
          </span>
          <span className="mt-1 block truncate text-md text-fg-muted">
            {awaiting ? t('Needs confirmation') : t('{n} to drop', { n: loadOf(order) })}
          </span>
        </span>

        {unsent && <Unsent />}
        {/* Mirrors under RTL — it points at the pane the tap opens. */}
        <Forward className="h-5 w-5 shrink-0 text-fg-dim" />
      </button>
    </li>
  );
}

/**
 * "Not sent yet", in a word.
 *
 * The wording is the existing translated vocabulary (Pending) rather than a
 * plainer "Not sent": that string has no Urdu entry and this folder cannot add
 * one, and swapping the wording without the dictionary entry would drop an Urdu
 * driver back into English on the one label that says whether their day's work
 * has left the tablet.
 */
function Unsent() {
  const t = useT();
  return (
    <span className="flex shrink-0 items-center gap-1.5 rounded-md border border-warn px-2 py-0.5 text-base font-semibold text-warn-fg">
      <WifiOff className="h-4 w-4" /> {t('Pending')}
    </span>
  );
}
