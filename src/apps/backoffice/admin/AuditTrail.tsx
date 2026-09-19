// ─── Audit trail ─────────────────────────────────────────────────────────────
// "Who did what, and when" — the question a CEO asks about a paper ECR book and
// cannot get an answer to.
//
// One job: read the trail. So it is a plain reverse-chronological list — time,
// who, what — and one search box. The four counter tiles, the four-way filter
// row and the order / ECR / transition / detail columns all said the same thing
// the list already says, and are gone. Search still matches on the detail text
// behind each row, so nothing became unfindable.
//
// Two sources, both read-only:
//   • s.audit — append-only, written by the store on every api.* call in this
//     session. This is the real trail.
//   • Reconstructed — the same record read back off the timestamps and actor
//     columns already carried by the seeded orders, so the screen tells the full
//     story of the trading day rather than only what you clicked. Nothing is
//     invented.

import { useMemo, useState } from 'react';
import { useStore, select } from '../../../core/store';
import type { OrderStatus, Role } from '../../../core/types';
import { Input, Timestamp } from '../../../ui/primitives';
import * as Icons from '../../../ui/icons';
import { useT } from '../../../i18n';

interface Row {
  key: string;
  at: string;
  actorName: string;
  actorRole: Role | 'system';
  orderId?: number;
  ecr?: string | null;
  action: string;
  detail: string;
  from?: OrderStatus;
  to?: OrderStatus;
  live: boolean;
}

export default function AuditTrail() {
  const t = useT();
  const s = useStore((x) => x);

  const [q, setQ] = useState('');

  const rows = useMemo<Row[]>(() => {
    const live: Row[] = s.audit.map((a) => ({
      key: `a${a.id}`,
      at: a.at,
      actorName: a.actorName,
      actorRole: a.actorRole,
      orderId: a.orderId,
      ecr: a.ecr,
      action: a.action,
      detail: a.detail,
      from: a.from,
      to: a.to,
      live: true,
    }));

    const seen = new Set(s.audit.map((a) => `${a.orderId}|${a.action}`));
    const history: Row[] = [];

    const who = (id?: number) => s.users.find((u) => u.id === id);
    const push = (
      at: string | undefined,
      userId: number | undefined,
      partial: Omit<Row, 'key' | 'at' | 'actorName' | 'actorRole' | 'live'>,
    ) => {
      if (!at) return;
      if (seen.has(`${partial.orderId}|${partial.action}`)) return;
      const u = who(userId);
      history.push({
        key: `h${partial.orderId}-${partial.action}-${at}`,
        at,
        actorName: u?.name ?? 'Integration service',
        actorRole: u?.role ?? 'system',
        live: false,
        ...partial,
      });
    };

    for (const o of s.orders) {
      const clerk = s.users.find((u) => u.role === 'clerk' && u.locationId === o.locationId);
      const delivery = s.deliveryEvents.find((d) => d.orderId === o.id);
      const confirmation = s.confirmationEvents.find((c) => c.orderId === o.id);
      const rec = s.reconciliations.find((r) => r.orderIds.includes(o.id));

      push(o.createdAt, o.createdBy, {
        orderId: o.id,
        ecr: null,
        action: 'Order placed',
        detail: `${o.origin === 'client_app' ? 'Client app' : 'Sales desk'} — ${o.lines.length} line(s).`,
        to: 'PLACED',
      });
      push(o.filledAt, clerk?.id, {
        orderId: o.id,
        ecr: null,
        action: 'PLACED → FILLED',
        detail: 'Cylinders staged against the order.',
        from: 'PLACED',
        to: 'FILLED',
      });
      push(o.assignedAt, clerk?.id, {
        orderId: o.id,
        ecr: null,
        action: 'FILLED → ASSIGNED',
        detail: `${select.vehicle(s, o.vehicleId)?.registration ?? 'vehicle'} on ${
          select.route(s, o.routeId)?.code ?? 'route'
        }, driver ${select.user(s, o.driverId)?.name ?? '—'}.`,
        from: 'FILLED',
        to: 'ASSIGNED',
      });
      push(o.dispatchedAt, o.dispatchedBy ?? clerk?.id, {
        orderId: o.id,
        ecr: o.ecr,
        action: 'ASSIGNED → DISPATCHED',
        detail: `ECR ${o.ecr} allocated at dispatch — it can never be reissued.`,
        from: 'ASSIGNED',
        to: 'DISPATCHED',
      });
      push(o.deliveredAt, o.deliveredBy ?? o.driverId, {
        orderId: o.id,
        ecr: o.ecr,
        action: 'DISPATCHED → DELIVERED',
        detail: delivery
          ? `${delivery.cylindersDelivered} delivered, ${delivery.emptiesCollected} empties, Rs ${delivery.cashCollected.toLocaleString()} cash. Captured on tab, client_ref ${delivery.clientRef.slice(0, 8)}.`
          : 'Delivery captured on the driver tab.',
        from: 'DISPATCHED',
        to: 'DELIVERED',
      });
      push(o.confirmedAt, o.deliveredBy ?? o.driverId, {
        orderId: o.id,
        ecr: o.ecr,
        action: 'DELIVERED → CONFIRMED',
        detail: confirmation
          ? `Confirmed by ${confirmation.method} (${confirmation.receiptRef ?? 'no ref'}).`
          : 'Customer confirmed receipt.',
        from: 'DELIVERED',
        to: 'CONFIRMED',
      });
      push(o.reconciledAt, o.reconciledBy ?? rec?.cashierId, {
        orderId: o.id,
        ecr: o.ecr,
        action: 'CONFIRMED → RECONCILED',
        detail: rec
          ? `Cash counted: Rs ${rec.totalCashReceived.toLocaleString()} against Rs ${rec.totalCashExpected.toLocaleString()} expected.`
          : 'Cash reconciled at the gate.',
        from: 'CONFIRMED',
        to: 'RECONCILED',
      });
      push(o.postedAt, undefined, {
        orderId: o.id,
        ecr: o.ecr,
        action: 'RECONCILED → POSTED',
        detail: `Oracle document ${o.oracleDocNo} raised under idempotency key ${o.ecr}.`,
        from: 'RECONCILED',
        to: 'POSTED',
      });
    }

    for (const l of s.erpPostLogs) {
      if (l.status !== 'failed') continue;
      history.push({
        key: `e${l.id}`,
        at: l.createdAt,
        actorName: 'Integration service',
        actorRole: 'system',
        orderId: l.orderId,
        ecr: l.ecr,
        action: `Oracle post attempt ${l.attemptNo} failed`,
        detail: `HTTP ${l.httpStatus ?? '—'} · ${l.errorClass ?? 'error'} — ${
          typeof l.responseBody === 'object' && l.responseBody && 'error' in (l.responseBody as any)
            ? String((l.responseBody as any).error)
            : 'no response body'
        }`,
        live: false,
      });
    }

    return [...live, ...history].sort((a, b) => b.at.localeCompare(a.at));
  }, [s.audit, s.orders, s.users, s.deliveryEvents, s.confirmationEvents, s.reconciliations, s.erpPostLogs]);

  // One filter. It matches the detail text behind each row as well as the words
  // on it, so a search by ECR or by a vehicle registration still finds the row.
  const filtered = rows.filter((r) => {
    if (!q.trim()) return true;
    const hay = `${r.action} ${r.detail} ${r.ecr ?? ''} ${r.actorName} ${r.actorRole}`.toLowerCase();
    return hay.includes(q.trim().toLowerCase());
  });

  return (
    <div className="mx-auto max-w-[1100px] px-6 py-6">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold leading-tight text-fg">{t('Audit trail')}</h1>
          <p className="mt-1 text-base text-fg-muted">
            {filtered.length === 1
              ? t('One entry. Nothing here is ever edited or deleted.')
              : t('{n} entries, newest first. Nothing here is ever edited or deleted.', {
                  n: filtered.length,
                })}
          </p>
        </div>
        <div className="w-72">
          <Input
            value={q}
            placeholder={t('Search')}
            aria-label={t('Search')}
            prefix={<Icons.Search className="h-4 w-4" />}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </header>

      {filtered.length === 0 ? (
        <p className="border border-line px-4 py-4 text-base text-fg-muted">
          {t('Nothing matches that search.')}
        </p>
      ) : (
        <ul className="max-h-[38rem] overflow-y-auto border border-line">
          {filtered.map((r) => (
            <li
              key={r.key}
              className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-line px-4 py-2.5 text-base last:border-b-0"
            >
              <span className="w-28 shrink-0 text-fg-muted">
                <Timestamp value={r.at} />
              </span>
              <span className="w-40 shrink-0 truncate text-fg">{r.actorName}</span>
              <span className="min-w-0 flex-1 text-fg-muted">{r.action}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
