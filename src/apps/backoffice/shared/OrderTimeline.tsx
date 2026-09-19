// ─── OrderTimeline — the audit + event trail for one order ───────────────────
// Merges four append-only sources into one chronological list:
//   1. the order's own lifecycle timestamps (seeded history)
//   2. delivery_event   (offline capture, with its client_ref idempotency key)
//   3. confirmation_event (signature / OTP receipt)
//   4. the live audit trail written by every api.* call this session
//
// Live audit entries win: if the audit already records a transition, the
// synthesised entry for that same status is suppressed so nothing appears twice.
// Read-only — imported by the clerk drawer and by the admin surface.

import { useMemo } from 'react';
import type { Order } from '../../../core/types';
import { useStore, select, orderCylinders } from '../../../core/store';
import { formatEcr } from '../../../core/ecr';
import { Money } from '../../../ui/primitives';
import { TONE_CLASS, fmtDateTime, roleLabel } from './OrderTable';
import type { Tone } from './OrderTable';

interface Entry {
  key: string;
  at: string;
  title: string;
  detail?: string;
  actor?: string;
  tone: Tone;
  /** Rendered to the right of the title — ECR, receipt ref, doc no. */
  tag?: string;
  /** Extra emphasis for the ECR allocation and the Oracle post. */
  strong?: boolean;
  amount?: number;
}

export interface OrderTimelineProps {
  orderId: number;
  /** Tighter spacing for the drawer. */
  dense?: boolean;
  /** Cap the number of rows; the rest collapse into a count. */
  limit?: number;
  title?: string;
  className?: string;
}

export function OrderTimeline({
  orderId,
  dense = false,
  limit,
  title = 'Audit & event trail',
  className = '',
}: OrderTimelineProps) {
  const s = useStore((st) => st);

  const entries = useMemo<Entry[]>(() => {
    const order: Order | undefined = select.order(s, orderId);
    if (!order) return [];

    const audit = select.auditForOrder(s, orderId);
    const covered = new Set(audit.map((a) => a.to).filter(Boolean) as string[]);
    const out: Entry[] = [];
    const userName = (id?: number) => select.user(s, id)?.name;

    // 1 — lifecycle timestamps seeded before this session began.
    const add = (
      status: string,
      at: string | undefined,
      e: Omit<Entry, 'key' | 'at' | 'tone'> & { tone?: Tone },
    ) => {
      if (!at || covered.has(status)) return;
      out.push({ key: `${status}-${at}`, at, tone: e.tone ?? 'neutral', ...e } as Entry);
    };

    add('PLACED', order.createdAt, {
      title: 'Order placed',
      tone: 'neutral',
      actor: userName(order.createdBy),
      detail: `${order.origin === 'client_app' ? 'Client app' : 'Sales desk'} — ${
        order.lines.length
      } line(s), ${orderCylinders(order, 'qtyOrdered')} cylinders requested for ${new Date(
        order.requestedDate,
      ).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}.`,
    });

    if (order.filledAt) {
      const short = order.lines.filter((l) => (l.qtyLoaded ?? l.qtyOrdered) < l.qtyOrdered);
      add('FILLED', order.filledAt, {
        title: 'Filled in the warehouse',
        tone: 'info',
        detail:
          `${orderCylinders(order, 'qtyLoaded')} cylinders staged against ${orderCylinders(
            order,
            'qtyOrdered',
          )} ordered.` + (short.length ? ` ${short.length} line(s) short-filled.` : ''),
      });
    }

    if (order.assignedAt) {
      const v = select.vehicle(s, order.vehicleId);
      const r = select.route(s, order.routeId);
      add('ASSIGNED', order.assignedAt, {
        title: 'Assigned to a vehicle',
        tone: 'info',
        detail: `${v?.registration ?? 'vehicle'} on ${r?.code ?? 'route'} — driver ${
          userName(order.driverId) ?? 'unassigned'
        }. Capacity checked at assignment.`,
      });
    }

    if (order.dispatchedAt) {
      add('DISPATCHED', order.dispatchedAt, {
        title: 'Dispatched — ECR allocated',
        tone: 'warn',
        strong: true,
        tag: order.ecr ? formatEcr(order.ecr) : undefined,
        actor: userName(order.dispatchedBy),
        detail: 'Number issued server-side at confirmation. It can never be reissued.',
      });
    }

    // 2 — delivery events (append-only, arrive via the offline queue).
    for (const d of s.deliveryEvents.filter((x) => x.orderId === orderId)) {
      out.push({
        key: `delivery-${d.id}`,
        at: d.occurredAt,
        title: 'Delivery captured on the tab',
        tone: 'warn',
        actor: userName(d.driverId),
        amount: d.cashCollected,
        detail: `${d.cylindersDelivered} delivered, ${d.emptiesCollected} empties collected. Recorded offline at ${fmtDateTime(
          d.occurredAt,
        )}, received by the server ${fmtDateTime(d.recordedAt)} · client_ref ${d.clientRef.slice(0, 8)}…`,
      });
    }

    // 3 — confirmation events (signature / OTP).
    for (const c of s.confirmationEvents.filter((x) => x.orderId === orderId)) {
      out.push({
        key: `confirm-${c.id}`,
        at: c.occurredAt,
        title: c.status === 'disputed' ? 'Delivery disputed by the client' : `Confirmed by ${c.method === 'otp' ? 'OTP' : 'signature'}`,
        tone: c.status === 'disputed' ? 'danger' : 'success',
        tag: c.receiptRef,
        detail: c.notes,
      });
    }

    if (order.reconciledAt && !covered.has('RECONCILED')) {
      const rec = s.reconciliations.find((r) => r.orderIds.includes(orderId));
      out.push({
        key: `reconciled-${order.reconciledAt}`,
        at: order.reconciledAt,
        title: 'Cash reconciled at the gate',
        tone: 'success',
        actor: userName(order.reconciledBy),
        detail: rec
          ? `Reconciliation #${rec.id} — Rs ${rec.totalCashReceived.toLocaleString()} received against Rs ${rec.totalCashExpected.toLocaleString()} expected (${rec.status}).`
          : 'Counted and matched.',
      });
    }

    // 4 — every Oracle post attempt, successful or not.
    for (const l of s.erpPostLogs.filter((x) => x.orderId === orderId)) {
      const ok = l.status === 'success';
      out.push({
        key: `erp-${l.id}`,
        at: l.createdAt,
        title: ok ? 'Posted to Oracle' : `Oracle post attempt ${l.attemptNo} failed`,
        tone: ok ? 'success' : 'danger',
        strong: ok,
        tag: ok ? l.oracleDocNo : `HTTP ${l.httpStatus ?? '—'}`,
        detail: ok
          ? `Idempotency key ${l.ecr}. Posting is keyed on the ECR, so a replay cannot double-post.`
          : `${(l.responseBody as any)?.error ?? 'Post failed.'} (${l.errorClass ?? 'unknown'})`,
      });
    }

    // 5 — live audit written this session. Always authoritative.
    for (const a of audit) {
      out.push({
        key: `audit-${a.id}`,
        at: a.at,
        title: a.action,
        detail: a.detail,
        actor: `${a.actorName} · ${roleLabel(a.actorRole)}`,
        tag: a.ecr ? formatEcr(a.ecr) : undefined,
        strong: a.to === 'DISPATCHED' || a.to === 'POSTED',
        tone:
          a.to === 'CANCELLED' || a.to === 'DISPUTED' || a.to === 'MISMATCH_HELD' || a.to === 'POST_FAILED'
            ? 'danger'
            : a.to === 'POSTED' || a.to === 'CONFIRMED' || a.to === 'RECONCILED'
              ? 'success'
              : a.to === 'DISPATCHED'
                ? 'warn'
                : 'info',
      });
    }

    return out.sort((x, y) => y.at.localeCompare(x.at));
  }, [s, orderId]);

  const shown = limit ? entries.slice(0, limit) : entries;
  // The old vertical rail with coloured dots is gone. Entries are now separated
  // by a plain 1px rule and whitespace; colour survives only on the tag, where
  // it still says posted / held / disputed.
  const gap = dense ? 'py-3' : 'py-4';

  return (
    <section className={className}>
      <header className="mb-3">
        <h3 className="text-lg font-semibold text-fg">{title}</h3>
        <p className="text-base text-fg-muted">
          {entries.length} event{entries.length === 1 ? '' : 's'}, newest first. Nothing here can be
          edited or deleted.
        </p>
      </header>

      {!shown.length ? (
        <div className="border border-line px-3 py-6 text-center text-base text-fg-muted">
          Nothing recorded against this order yet.
        </div>
      ) : (
        <ol className="border-t border-line">
          {shown.map((e) => (
            <li key={e.key} className={`${gap} border-b border-line`}>
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className={`text-base ${e.strong ? 'font-semibold text-fg' : 'text-fg'}`}>
                  {e.title}
                </span>
                {e.tag && (
                  <span
                    className={`border px-2 py-0.5 font-mono text-base tabular-nums ${TONE_CLASS[e.tone]}`}
                  >
                    {e.tag}
                  </span>
                )}
                {e.amount != null && e.amount > 0 && (
                  <span className="font-mono text-base tabular-nums text-success-fg">
                    <Money value={e.amount} />
                  </span>
                )}
                <span className="ms-auto whitespace-nowrap font-mono text-base tabular-nums text-fg-muted">
                  {fmtDateTime(e.at)}
                </span>
              </div>
              {e.detail && <p className="mt-1 text-base leading-relaxed text-fg-muted">{e.detail}</p>}
              {e.actor && <p className="mt-1 text-base text-fg-muted">by {e.actor}</p>}
            </li>
          ))}
        </ol>
      )}

      {limit && entries.length > limit && (
        <p className="mt-2 text-base text-fg-muted">+ {entries.length - limit} earlier event(s)</p>
      )}
    </section>
  );
}

export default OrderTimeline;
