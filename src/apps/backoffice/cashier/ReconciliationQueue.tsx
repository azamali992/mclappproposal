// ─── Cash reconciliation queue ───────────────────────────────────────────────
// The gate cashier's screen, and the conceptual centre of the system: a route
// comes back, its cash is counted here, and ONLY a matched count releases the
// sale to Oracle. Everything else is held.
//
// No business logic lives here. Totals shown are presentation sums of state;
// every mutation goes through `api.*` (in ReconcileDrawer).

import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  useStore,
  useCurrentUser,
  select,
  expectedCash,
  orderCylinders,
} from '../../../core/store';
import type { Order, CashReconciliation } from '../../../core/types';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Badge,
  StatusPill,
  EmptyState,
  SectionTitle,
  Money,
  Qty,
  EcrTag,
  Timestamp,
  Spinner,
} from '../../../ui/primitives';
import * as Icons from '../../../ui/icons';
import { useT } from '../../../i18n';
import ReconcileDrawer, { type ReconcileTarget } from './ReconcileDrawer';

export default function ReconciliationQueue() {
  const s = useStore((x) => x);
  const me = useCurrentUser();
  const [target, setTarget] = useState<ReconcileTarget | null>(null);
  const t = useT();

  const groups = useMemo(() => select.pendingReconciliation(s), [s]);
  const held = useMemo(
    () => s.reconciliations.filter((r) => r.status === 'mismatch_held'),
    [s.reconciliations],
  );
  const posting = useMemo(
    () =>
      s.orders
        .filter((o) => ['RECONCILED', 'POST_FAILED', 'POSTED'].includes(o.status) && o.reconciledAt)
        .sort((a, b) => (b.reconciledAt ?? '').localeCompare(a.reconciledAt ?? ''))
        .slice(0, 8),
    [s.orders],
  );

  const canReconcile = me.role === 'cashier' || me.role === 'admin';

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-6">
      {/* ── The invariant, stated on the screen itself ──────────────────── */}
      <header className="mb-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-fg">{t('Cash reconciliation')}</h1>
            <p className="mt-2 text-base text-fg-muted">
              {t('Count the cash a returning route brought back, against what the delivered cylinders should have yielded.')}
            </p>
          </div>
          <div className="flex items-center gap-2 text-base text-fg-muted">
            <Icons.User className="h-4 w-4 text-fg-muted" />
            Counting as <span className="font-medium text-fg">{me.name}</span>
            <span className="capitalize text-fg-dim">({me.role})</span>
          </div>
        </div>

        <div className="mt-4 flex items-start gap-3 border border-line bg-surface px-4 py-4">
          <Icons.Lock className="mt-0.5 h-5 w-5 shrink-0 text-fg-muted" />
          <div className="text-base leading-relaxed text-fg">
            <span className="font-semibold">{t('This is the only path to Oracle.')}</span>{' '}
            A sale posts to the ERP if and only if a cashier confirms a matched cash count here.
            A mismatch is held for investigation and <span className="font-semibold">nothing is sent</span>.
            Separation of duties is enforced server-side: the cashier may not be the clerk who
            dispatched the order, nor the driver who delivered it.
          </div>
        </div>
      </header>

      {!canReconcile && (
        <div className="mb-5 border border-warn px-4 py-3 text-base text-warn-fg">
          {me.name} is {me.role} — counting cash requires the cashier role. You can read this
          queue, but the API will reject a confirmation.
        </div>
      )}

      {/* ── Returning routes ───────────────────────────────────────────── */}
      <SectionTitle>{t('Routes back at the gate')} ({groups.length})</SectionTitle>

      {groups.length === 0 ? (
        <EmptyState
          title="No cash waiting"
          description="Every confirmed delivery has been counted. New routes appear here as drivers confirm deliveries."
        />
      ) : (
        <div className="mt-3 grid grid-cols-1 gap-4 xl:grid-cols-2">
          {groups.map((g) => (
            <RouteCard
              key={`${g.routeId}-${g.vehicleId}-${g.driverId}`}
              group={g}
              onCount={() =>
                setTarget({
                  kind: 'route',
                  routeId: g.routeId,
                  vehicleId: g.vehicleId,
                  driverId: g.driverId,
                  orderIds: g.orders.map((o) => o.id),
                })
              }
            />
          ))}
        </div>
      )}

      {/* ── Held mismatches ────────────────────────────────────────────── */}
      {held.length > 0 && (
        <div className="mt-8">
          <SectionTitle>{t('Held — cash mismatch under investigation')} ({held.length})</SectionTitle>
          <div className="mt-3 space-y-3">
            {held.map((r) => (
              <HeldCard
                key={r.id}
                rec={r}
                onOpen={() =>
                  setTarget({
                    kind: 'hold',
                    routeId: r.routeId,
                    vehicleId: r.vehicleId,
                    driverId: r.driverId,
                    orderIds: r.orderIds,
                    reconciliationId: r.id,
                  })
                }
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Posting ledger ─────────────────────────────────────────────── */}
      <div className="mt-8">
        <SectionTitle>{t('Reconciled — Oracle posting')}</SectionTitle>
        <Card className="mt-3">
          <CardBody className="p-0">
            <ul className="divide-y divide-line">
              {posting.map((o) => (
                <PostingRow key={o.id} order={o} posting={s.postingOrderIds.includes(o.id)} />
              ))}
            </ul>
          </CardBody>
        </Card>
      </div>

      <ReconcileDrawer open={target != null} target={target} onClose={() => setTarget(null)} />
    </div>
  );
}

// ─── A returning route ───────────────────────────────────────────────────────

interface Group {
  routeId: number;
  vehicleId: number;
  driverId: number;
  orders: Order[];
}

function RouteCard({ group, onCount }: { group: Group; onCount: () => void }) {
  const s = useStore((x) => x);
  const route = select.route(s, group.routeId);
  const vehicle = select.vehicle(s, group.vehicleId);
  const driver = select.user(s, group.driverId);

  const delivered = group.orders.reduce((n, o) => n + orderCylinders(o, 'qtyDelivered'), 0);
  const empties = group.orders.reduce((n, o) => n + orderCylinders(o, 'qtyReturned'), 0);
  const expected = group.orders.reduce((n, o) => n + expectedCash(o), 0);
  const creditOrders = group.orders.filter(
    (o) => select.client(s, o.clientId)?.paymentTerms === 'credit',
  );
  const driverCash = group.orders.reduce(
    (n, o) => n + (s.deliveryEvents.find((d) => d.orderId === o.id)?.cashCollected ?? 0),
    0,
  );

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex w-full items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Icons.Route className="h-5 w-5 text-fg-muted" />
              <span className="text-xl font-semibold text-fg">{route?.code ?? `Route ${group.routeId}`}</span>
              <span className="truncate text-base text-fg-muted">{route?.name}</span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-base text-fg-muted">
              <span className="inline-flex items-center gap-1.5">
                <Icons.Truck className="h-3.5 w-3.5 text-fg-dim" />
                <span className="font-mono text-fg">{vehicle?.registration}</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Icons.User className="h-3.5 w-3.5 text-fg-dim" />
                {driver?.name}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Icons.Clipboard className="h-3.5 w-3.5 text-fg-dim" />
                {group.orders.length} order{group.orders.length === 1 ? '' : 's'}
              </span>
            </div>
          </div>
          <Badge tone="warn">Cash uncounted</Badge>
        </div>
      </CardHeader>

      <CardBody>
        <dl className="grid grid-cols-3 gap-3">
          <Metric label="Cylinders delivered" value={<Qty value={delivered} />} />
          <Metric label="Empties returned" value={<Qty value={empties} />} />
          <Metric label="Cash that should come back" value={<Money value={expected} />} />
        </dl>

        <div className="mt-4 border border-line bg-surface px-4 py-3 text-base text-fg-muted">
          Driver recorded <span className="font-medium text-fg"><Money value={driverCash} /></span> on the tab.
          {creditOrders.length > 0 && (
            <>
              {' '}
              {creditOrders.length} of these {group.orders.length} orders{' '}
              {creditOrders.length === 1 ? 'is' : 'are'} on <span className="text-info-fg">credit terms</span> and
              contribute <span className="font-medium text-fg">Rs 0</span> to the expected cash — they invoice
              against the customer account.
            </>
          )}
        </div>

        <ul className="mt-3 space-y-1.5">
          {group.orders.map((o) => {
            const client = select.client(s, o.clientId);
            return (
              <li key={o.id} className="flex items-center justify-between gap-3 py-1 text-base">
                <span className="flex min-w-0 items-center gap-2">
                  <EcrTag value={o.ecr ?? '—'} />
                  <span className="truncate text-fg-muted">{client?.name}</span>
                  <Badge tone={client?.paymentTerms === 'credit' ? 'info' : 'neutral'}>
                    {client?.paymentTerms ?? '—'}
                  </Badge>
                </span>
                <span className="shrink-0 tabular-nums text-fg">
                  <Money value={expectedCash(o)} />
                </span>
              </li>
            );
          })}
        </ul>

        <Button className="mt-5 w-full" variant="primary" size="lg" onClick={onCount}>
          <Icons.Banknote className="me-2 h-5 w-5" /> Count the cash for this route
        </Button>
      </CardBody>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="border border-line bg-surface px-4 py-3">
      <dt className="text-base text-fg-muted">{label}</dt>
      <dd className="mt-1 text-xl font-semibold tabular-nums text-fg">{value}</dd>
    </div>
  );
}

// ─── A held mismatch ─────────────────────────────────────────────────────────

function HeldCard({ rec, onOpen }: { rec: CashReconciliation; onOpen: () => void }) {
  const s = useStore((x) => x);
  const route = select.route(s, rec.routeId);
  const driver = select.user(s, rec.driverId);
  const short = rec.totalCashExpected - rec.totalCashReceived;

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border border-danger bg-surface px-4 py-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <Icons.Alert className="h-5 w-5 text-danger" />
          <span className="text-lg font-semibold text-fg">
            {route?.code} · {driver?.name} · {rec.orderIds.length} order
            {rec.orderIds.length === 1 ? '' : 's'}
          </span>
          <StatusPill status="MISMATCH_HELD" />
        </div>
        <div className="mt-2 text-base text-fg-muted">
          Expected <Money value={rec.totalCashExpected} />, counted{' '}
          <Money value={rec.totalCashReceived} /> —{' '}
          <span className="font-semibold text-danger-fg">
            {short > 0 ? 'short' : 'over'} by <Money value={Math.abs(short)} />
          </span>
          . Nothing has been sent to Oracle.
        </div>
      </div>
      <Button variant="secondary" size="lg" onClick={onOpen}>
        Look into it and release
      </Button>
    </div>
  );
}

// ─── Posting ledger row ──────────────────────────────────────────────────────

function PostingRow({ order, posting }: { order: Order; posting: boolean }) {
  const s = useStore((x) => x);
  const client = select.client(s, order.clientId);
  return (
    <li className="flex flex-wrap items-center gap-3 px-4 py-4 text-base">
      <EcrTag value={order.ecr ?? '—'} />
      <span className="min-w-0 flex-1 truncate text-fg-muted">{client?.name}</span>
      <StatusPill status={order.status} />
      {posting ? (
        <span className="inline-flex items-center gap-2 text-base text-info-fg">
          <Spinner /> posting to Oracle…
        </span>
      ) : order.oracleDocNo ? (
        <span className="inline-flex items-center gap-2 font-mono text-base text-success-fg">
          <Icons.CheckCircle className="h-4 w-4" /> {order.oracleDocNo}
        </span>
      ) : order.status === 'POST_FAILED' ? (
        <span className="inline-flex items-center gap-2 text-base text-danger-fg">
          <Icons.XCircle className="h-4 w-4" /> waiting to be sent again
        </span>
      ) : (
        <span className="text-base text-fg-muted">queued</span>
      )}
      {order.reconciledAt && (
        <span className="text-base text-fg-muted">
          <Timestamp value={order.reconciledAt} />
        </span>
      )}
    </li>
  );
}
