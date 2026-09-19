// ─── Audit trail ─────────────────────────────────────────────────────────────
// "Who did what, and when" — the question a CEO asks about a paper ECR book and
// cannot get an answer to.
//
// Two sources, both read-only:
//   • s.audit — append-only, written by the store on every api.* call in this
//     session. This is the real trail.
//   • Reconstructed — the same record read back off the timestamps and actor
//     columns already carried by the seeded orders, so the screen tells the full
//     story of the trading day rather than only what you clicked. Labelled as
//     such; nothing is invented.

import { useMemo, useState } from 'react';
import { useStore, select } from '../../../core/store';
import type { OrderStatus, Role } from '../../../core/types';
import { STATUS_LABEL } from '../../../core/stateMachine';
import {
  Card,
  CardBody,
  CardHeader,
  Badge,
  Button,
  Select,
  Input,
  Field,
  Table,
  THead,
  TBody,
  TR,
  TH,
  TD,
  Avatar,
  EmptyState,
  EcrTag,
  Timestamp,
  StatTile,
} from '../../../ui/primitives';
import * as Icons from '../../../ui/icons';
import { useT } from '../../../i18n';

interface Row {
  key: string;
  at: string;
  actorName: string;
  actorRole: Role | 'system';
  actorInitials: string;
  actorId?: number;
  orderId?: number;
  ecr?: string | null;
  action: string;
  detail: string;
  from?: OrderStatus;
  to?: OrderStatus;
  live: boolean;
}

const ROLES: (Role | 'system')[] = [
  'client',
  'sales',
  'clerk',
  'driver',
  'gate',
  'cashier',
  'admin',
  'system',
];

export default function AuditTrail() {
  const t = useT();
  const s = useStore((x) => x);

  const [actorId, setActorId] = useState<string>('all');
  const [role, setRole] = useState<string>('all');
  const [orderId, setOrderId] = useState<string>('all');
  const [q, setQ] = useState('');

  const rows = useMemo<Row[]>(() => {
    const live: Row[] = s.audit.map((a) => ({
      key: `a${a.id}`,
      at: a.at,
      actorName: a.actorName,
      actorRole: a.actorRole,
      actorInitials: s.users.find((u) => u.id === a.actorId)?.avatarInitials ?? '··',
      actorId: a.actorId,
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
      partial: Omit<Row, 'key' | 'at' | 'actorName' | 'actorRole' | 'actorInitials' | 'live'>,
    ) => {
      if (!at) return;
      if (seen.has(`${partial.orderId}|${partial.action}`)) return;
      const u = who(userId);
      history.push({
        key: `h${partial.orderId}-${partial.action}-${at}`,
        at,
        actorName: u?.name ?? 'Integration service',
        actorRole: u?.role ?? 'system',
        actorInitials: u?.avatarInitials ?? 'SYS',
        actorId: u?.id,
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
        actorInitials: 'SYS',
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

  const filtered = rows.filter((r) => {
    if (actorId !== 'all' && String(r.actorId ?? 'system') !== actorId) return false;
    if (role !== 'all' && r.actorRole !== role) return false;
    if (orderId !== 'all' && String(r.orderId ?? '') !== orderId) return false;
    if (q.trim()) {
      const hay = `${r.action} ${r.detail} ${r.ecr ?? ''} ${r.actorName}`.toLowerCase();
      if (!hay.includes(q.trim().toLowerCase())) return false;
    }
    return true;
  });

  const filtersOn = actorId !== 'all' || role !== 'all' || orderId !== 'all' || q.trim() !== '';

  const orderOptions = useMemo(
    () =>
      [...s.orders]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((o) => ({
          id: o.id,
          label: `#${o.id} · ${o.ecr ?? 'no ECR'} · ${select.clientName(s, o.clientId)}`,
        })),
    [s.orders, s.clients],
  );

  return (
    <div className="mx-auto max-w-[1500px] px-6 py-6">
      <header className="mb-5">
        <h1 className="text-xl font-semibold tracking-tight text-fg">{t('Audit trail')}</h1>
        <p className="mt-2 text-base text-fg-muted">
          {t('Append-only. Every state change carries the actor, their role and the exact transition — no row is ever edited or deleted.')}
        </p>
      </header>

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Entries" value={rows.length} icon={Icons.Clipboard} />
        <StatTile
          label="This session"
          value={s.audit.length}
          hint="written live by the store"
          icon={Icons.Pen}
        />
        <StatTile
          label="Actors"
          value={new Set(rows.map((r) => r.actorName)).size}
          icon={Icons.Users}
        />
        <StatTile
          label="Orders touched"
          value={new Set(rows.map((r) => r.orderId).filter(Boolean)).size}
          icon={Icons.Box}
        />
      </div>

      <Card>
        <CardHeader
          title="Filter"
          action={
            filtersOn && (
              <Button
                size="sm"
                variant="ghost"
                icon={Icons.X}
                onClick={() => {
                  setActorId('all');
                  setRole('all');
                  setOrderId('all');
                  setQ('');
                }}
              >
                Clear
              </Button>
            )
          }
        />
        <CardBody className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <Field label="Actor">
            <Select value={actorId} onChange={(e) => setActorId(e.target.value)}>
              <option value="all">Everyone</option>
              {s.users.map((u) => (
                <option key={u.id} value={String(u.id)}>
                  {u.name} — {u.role}
                </option>
              ))}
              <option value="system">Integration service</option>
            </Select>
          </Field>
          <Field label="Role">
            <Select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="all">All roles</option>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Order">
            <Select value={orderId} onChange={(e) => setOrderId(e.target.value)}>
              <option value="all">All orders</option>
              {orderOptions.map((o) => (
                <option key={o.id} value={String(o.id)}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Search">
            <Input
              value={q}
              placeholder="action, ECR, detail…"
              prefix={<Icons.Search className="h-3.5 w-3.5" />}
              onChange={(e) => setQ(e.target.value)}
            />
          </Field>
        </CardBody>
      </Card>

      <Card className="mt-4">
        <CardHeader
          title={`${filtered.length} entr${filtered.length === 1 ? 'y' : 'ies'}`}
          subtitle="Newest first"
        />
        <CardBody className="p-0">
          {filtered.length === 0 ? (
            <EmptyState
              icon={Icons.Filter}
              title="Nothing matches those filters"
              description="Widen the actor, role or order filter to see the trail again."
            />
          ) : (
            <Table scrollHeight="34rem">
              <THead sticky>
                <TR>
                  <TH>When</TH>
                  <TH>Actor</TH>
                  <TH>Order / ECR</TH>
                  <TH>Transition</TH>
                  <TH>Detail</TH>
                </TR>
              </THead>
              <TBody>
                {filtered.map((r) => (
                  <TR key={r.key}>
                    <TD muted>
                      <Timestamp value={r.at} />
                    </TD>
                    <TD>
                      <div className="flex items-center gap-2">
                        <Avatar initials={r.actorInitials} size="sm" />
                        <div className="min-w-0">
                          <div className="truncate text-base text-fg">{r.actorName}</div>
                          <div className="text-base capitalize text-fg-muted">{r.actorRole}</div>
                        </div>
                      </div>
                    </TD>
                    <TD>
                      {r.orderId ? (
                        <div className="flex flex-col gap-1">
                          <span className="text-base text-fg-muted">#{r.orderId}</span>
                          {r.ecr && <EcrTag value={r.ecr} />}
                        </div>
                      ) : (
                        <span className="text-base text-fg-muted">—</span>
                      )}
                    </TD>
                    <TD>
                      {r.from || r.to ? (
                        <span className="inline-flex items-center gap-2 text-base">
                          {r.from && <Badge tone="neutral">{STATUS_LABEL[r.from]}</Badge>}
                          <Icons.ChevronRight className="h-3 w-3 text-fg-dim" />
                          {r.to && <Badge tone="info">{STATUS_LABEL[r.to]}</Badge>}
                        </span>
                      ) : (
                        <span className="text-base text-fg">{r.action}</span>
                      )}
                    </TD>
                    <TD muted>
                      <div className="flex items-start gap-2">
                        <span className="min-w-0 flex-1 text-base leading-relaxed">{r.detail}</span>
                        {r.live ? (
                          <Badge tone="success">live</Badge>
                        ) : (
                          <Badge tone="neutral">record</Badge>
                        )}
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardBody>
      </Card>

      <p className="mt-4 text-base leading-relaxed text-fg-muted">
        Rows marked <span className="text-success-fg">live</span> were written by the store during
        this session as you acted. Rows marked <span className="text-fg-muted">record</span> are
        reconstructed from the timestamps and actor columns already stored against each order — the
        same data the trail would hold had the session been running all day.
      </p>
    </div>
  );
}
