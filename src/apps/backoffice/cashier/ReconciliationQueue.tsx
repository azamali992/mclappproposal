// ─── Cash reconciliation queue ───────────────────────────────────────────────
// The gate cashier's screen, and the conceptual centre of the system: a route
// comes back, its cash is counted here, and ONLY a matched count releases the
// sale to Oracle.
//
// One job: count the cash on a returning route. So the screen is one list, one
// row a route, one button. Held mismatches sit in the same list under a Held
// tag — they are the same job, interrupted. The Oracle invariant is one
// sentence under the title; the detail of it lives in the drawer, where the
// count actually happens.
//
// No business logic lives here. Totals shown are presentation sums of state;
// every mutation goes through `api.*` (in ReconcileDrawer).

import { useMemo, useState } from 'react';
import { useStore, useCurrentUser, select, expectedCash } from '../../../core/store';
import { Button, Money } from '../../../ui/primitives';
import { useT } from '../../../i18n';
import ReconcileDrawer, { type ReconcileTarget } from './ReconcileDrawer';

/** One line in the queue: a route to count, or a held count to resolve. */
interface Row {
  key: string;
  held: boolean;
  routeId: number;
  vehicleId: number;
  driverId: number;
  orderIds: number[];
  expected: number;
  reconciliationId?: number;
}

export default function ReconciliationQueue() {
  const s = useStore((x) => x);
  const me = useCurrentUser();
  const [target, setTarget] = useState<ReconcileTarget | null>(null);
  const t = useT();

  const rows = useMemo<Row[]>(() => {
    const waiting: Row[] = select.pendingReconciliation(s).map((g) => ({
      key: `r${g.routeId}-${g.vehicleId}-${g.driverId}`,
      held: false,
      routeId: g.routeId,
      vehicleId: g.vehicleId,
      driverId: g.driverId,
      orderIds: g.orders.map((o) => o.id),
      expected: g.orders.reduce((n, o) => n + expectedCash(o), 0),
    }));

    const held: Row[] = s.reconciliations
      .filter((r) => r.status === 'mismatch_held')
      .map((r) => ({
        key: `h${r.id}`,
        held: true,
        routeId: r.routeId,
        vehicleId: r.vehicleId,
        driverId: r.driverId,
        orderIds: r.orderIds,
        expected: r.totalCashExpected,
        reconciliationId: r.id,
      }));

    return [...waiting, ...held];
  }, [s]);

  const canReconcile = me.role === 'cashier' || me.role === 'admin';

  return (
    <div className="mx-auto max-w-[1100px] px-6 py-6">
      {/* ── Title, and the invariant in one sentence ─────────────────────── */}
      <header className="mb-4">
        <h1 className="text-xl font-semibold leading-tight text-fg">{t('Cash reconciliation')}</h1>
        <p className="mt-1 text-base text-fg-muted">
          {rows.length === 1
            ? t('One route waiting to be counted — nothing reaches Oracle until the count is confirmed here.')
            : t('{n} routes waiting to be counted — nothing reaches Oracle until the count is confirmed here.', {
                n: rows.length,
              })}
        </p>
      </header>

      {!canReconcile && (
        <p className="mb-4 border border-warn px-4 py-3 text-base text-warn-fg">
          {t('Counting cash needs the cashier role — the API will refuse a confirmation from you.')}
        </p>
      )}

      {/* ── One list. One button a row. ──────────────────────────────────── */}
      {rows.length === 0 ? (
        <p className="border border-line px-4 py-4 text-base text-fg-muted">
          {t('No cash waiting to be counted.')}
        </p>
      ) : (
        <ul className="border border-line">
          {rows.map((r) => (
            <QueueRow
              key={r.key}
              row={r}
              onOpen={() =>
                setTarget({
                  kind: r.held ? 'hold' : 'route',
                  routeId: r.routeId,
                  vehicleId: r.vehicleId,
                  driverId: r.driverId,
                  orderIds: r.orderIds,
                  reconciliationId: r.reconciliationId,
                })
              }
            />
          ))}
        </ul>
      )}

      <ReconcileDrawer open={target != null} target={target} onClose={() => setTarget(null)} />
    </div>
  );
}

// ─── A row: route, driver, how many orders, cash expected ────────────────────

function QueueRow({ row, onOpen }: { row: Row; onOpen: () => void }) {
  const s = useStore((x) => x);
  const t = useT();
  const route = select.route(s, row.routeId);
  const driver = select.user(s, row.driverId);

  return (
    <li className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3 last:border-b-0">
      <span className="min-w-0 flex-1 text-base text-fg">
        {t(row.orderIds.length === 1 ? '{route} · {driver} · 1 order' : '{route} · {driver} · {n} orders', {
          route: route?.code ?? `#${row.routeId}`,
          driver: driver?.name ?? '—',
          n: row.orderIds.length,
        })}
      </span>

      {/* Held cash keeps its colour — it is the one thing on this screen that
          is not simply waiting. */}
      {row.held && (
        <span className="whitespace-nowrap border border-danger px-2 py-0.5 text-base text-danger-fg">
          {t('Held')}
        </span>
      )}

      <Money value={row.expected} className="shrink-0 text-base text-fg" />

      <Button variant={row.held ? 'secondary' : 'primary'} size="lg" onClick={onOpen}>
        {row.held ? t('Resolve') : t('Count the cash')}
      </Button>
    </li>
  );
}
