// ─── SalesDesk — Path B, the order desk ──────────────────────────────────────
// Left: everything this salesperson has taken, filterable. Right: the form for
// the call that is happening right now. One store, so an order placed here is
// in the warehouse queue before the handset is back on the cradle — the banner
// under the form says so, and the clerk's lane count moves in real time.

import { useMemo, useState } from 'react';
import type { Order, OrderStatus } from '../../../core/types';
import {
  useStore,
  useCurrentUser,
  select,
  orderValue,
  orderCylinders,
  serviceChargeTotal,
} from '../../../core/store';
import { STATUS_LABEL, PIPELINE } from '../../../core/stateMachine';
import { Money } from '../../../ui/primitives';
import { Clipboard, Plus, Warehouse, CheckCircle } from '../../../ui/icons';
import { useT } from '../../../i18n';
import OrderTable from '../shared/OrderTable';
import {
  FulfilmentTag,
  OrderStatusPill,
  TONE_CLASS,
  cylindersOf,
  fmtDateTime,
} from '../shared/OrderTable';
import OrderDetail from '../clerk/OrderDetail';
import NewOrderForm from './NewOrderForm';

function Tile({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="min-w-0 flex-1 border border-line bg-surface px-4 py-3">
      <div className="text-base text-fg-muted">{label}</div>
      <div className="mt-1 font-mono text-xl tabular-nums leading-tight text-fg">{value}</div>
      {sub && <div className="truncate text-base text-fg-muted">{sub}</div>}
    </div>
  );
}

export function SalesDesk() {
  const t = useT();
  const s = useStore((st) => st);
  const me = useCurrentUser();

  const [scope, setScope] = useState<'mine' | 'all'>('mine');
  const [status, setStatus] = useState<'ALL' | OrderStatus>('ALL');
  const [clientId, setClientId] = useState<'ALL' | number>('ALL');
  const [formOpen, setFormOpen] = useState(true);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [justPlaced, setJustPlaced] = useState<Order | null>(null);

  const mine = useMemo(
    () =>
      s.orders
        .filter((o) => (scope === 'mine' ? o.createdBy === me.id : o.origin === 'sales'))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [s.orders, scope, me.id],
  );

  const filtered = useMemo(
    () =>
      mine.filter(
        (o) => (status === 'ALL' || o.status === status) && (clientId === 'ALL' || o.clientId === clientId),
      ),
    [mine, status, clientId],
  );

  const totals = useMemo(() => {
    const open = mine.filter((o) => !['POSTED', 'CANCELLED'].includes(o.status));
    return {
      count: mine.length,
      open: open.length,
      cylinders: mine.reduce((t, o) => t + cylindersOf(o), 0),
      value: mine.reduce((t, o) => t + orderValue(o), 0),
      service: mine.reduce((t, o) => t + serviceChargeTotal(o), 0),
      collections: mine.filter((o) => o.fulfilment === 'collection').length,
      awaitingClerk: mine.filter((o) => ['PLACED', 'FILLED', 'ASSIGNED'].includes(o.status)).length,
    };
  }, [mine]);

  const clerkQueueDepth = select.clerkQueue(s, me.locationId ?? undefined).length;
  const clientsWithOrders = useMemo(() => {
    const ids = new Set(mine.map((o) => o.clientId));
    return s.clients.filter((c) => ids.has(c.id));
  }, [mine, s.clients]);

  const fieldCls =
    'border border-line bg-surface px-3 py-2 text-base text-fg focus:border-fg focus:outline-none focus-visible:ring-1 focus-visible:ring-accent';

  return (
    <div className="flex h-full min-h-0 flex-col bg-surface">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <header className="flex-none border-b border-line bg-surface px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <Clipboard className="h-5 w-5 text-fg-muted" />
          <div>
            <h1 className="text-xl font-semibold leading-tight text-fg">{t('Sales desk')}</h1>
            <p className="text-base text-fg-muted">
              {t('Orders taken by phone on a client’s behalf — same route into the warehouse as the client app.')}
            </p>
          </div>

          <div className="ms-auto flex flex-wrap items-center gap-2">
            <div className="flex divide-x divide-line border border-line">
              {(['mine', 'all'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setScope(v)}
                  aria-pressed={scope === v}
                  className={`px-4 py-2 text-base ${
                    scope === v
                      ? 'bg-surface-high font-semibold text-fg'
                      : 'bg-surface text-fg hover:bg-surface-high'
                  }`}
                >
                  {v === 'mine' ? t('My orders') : t('All sales orders')}
                </button>
              ))}
            </div>

            <select
              aria-label="Filter by status"
              className={fieldCls}
              value={status}
              onChange={(e) => setStatus(e.target.value as 'ALL' | OrderStatus)}
            >
              <option value="ALL">All statuses</option>
              {PIPELINE.concat(['CANCELLED', 'DISPUTED', 'MISMATCH_HELD', 'POST_FAILED'] as OrderStatus[]).map(
                (st) => (
                  <option key={st} value={st}>
                    {STATUS_LABEL[st]}
                  </option>
                ),
              )}
            </select>

            <select
              aria-label="Filter by client"
              className={fieldCls}
              value={String(clientId)}
              onChange={(e) => setClientId(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
            >
              <option value="ALL">All clients</option>
              {clientsWithOrders.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setFormOpen((v) => !v)}
              className={`inline-flex items-center gap-2 px-4 py-2 text-base font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                formOpen
                  ? 'border border-line bg-surface text-fg hover:bg-surface-high'
                  : 'bg-accent text-accent-fg hover:bg-accent-hover'
              }`}
            >
              <Plus className="h-4 w-4" /> {formOpen ? t('Hide form') : t('New order')}
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Tile label={t('Orders taken')} value={totals.count} sub={`${totals.open} still open`} />
          <Tile label={t('Cylinders sold')} value={totals.cylinders} sub="across every status" />
          <Tile
            label={t('Order value')}
            value={<Money value={totals.value} />}
            sub={
              totals.service > 0
                ? `includes Rs ${totals.service.toLocaleString('en-PK')} of service work`
                : 'at loaded quantities'
            }
          />
          <Tile
            label={t('Client collects')}
            value={totals.collections}
            sub="priced off the ex-delivery card"
          />
          <Tile label={t('Waiting on the warehouse')} value={totals.awaitingClerk} sub="placed · filled · assigned" />
          <Tile
            label={t('Dispatch queue depth')}
            value={clerkQueueDepth}
            sub="live count from the same store"
          />
        </div>
      </header>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div className="flex min-h-0 flex-1 gap-3 overflow-hidden p-3">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 overflow-y-auto">
          {justPlaced && (
            <div className={`flex items-start gap-3 border px-4 py-3 ${TONE_CLASS.success}`}>
              <CheckCircle className="mt-0.5 h-5 w-5 flex-none" />
              <div className="min-w-0 flex-1 text-base leading-relaxed">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">
                    Order #{justPlaced.id} placed for {select.clientName(s, justPlaced.clientId)}
                  </span>
                  <FulfilmentTag fulfilment={justPlaced.fulfilment} />
                  <OrderStatusPill status={select.order(s, justPlaced.id)?.status ?? justPlaced.status} />
                  <span className="font-mono text-base tabular-nums text-fg-muted">
                    {orderCylinders(select.order(s, justPlaced.id) ?? justPlaced, 'qtyOrdered')} cylinders ·{' '}
                    <Money value={orderValue(select.order(s, justPlaced.id) ?? justPlaced)} />
                  </span>
                  <span className="ms-auto text-base text-fg-muted">{fmtDateTime(justPlaced.createdAt)}</span>
                </div>
                <p className="mt-2 flex items-center gap-2 text-fg-muted">
                  <Warehouse className="h-4 w-4" />
                  {justPlaced.fulfilment === 'collection' ? (
                    <>
                      It is on the warehouse&rsquo;s self-collection counter — priced off the ex-delivery
                      card, with no vehicle, route or driver. The clerk releases it when the
                      client&rsquo;s van arrives; no ECR has been issued yet.
                    </>
                  ) : (
                    <>
                      It is already in the warehouse Placed lane — the dispatch queue now holds{' '}
                      <span className="font-mono tabular-nums">{clerkQueueDepth}</span> orders. Nothing was
                      re-keyed, and no ECR has been issued yet.
                    </>
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetailId(justPlaced.id)}
                className="border border-line bg-surface px-3 py-2 text-base font-medium text-fg hover:bg-surface-high"
              >
                Open this order
              </button>
            </div>
          )}

          <OrderTable
            orders={filtered}
            dense
            selectedId={detailId}
            onSelect={(o) => setDetailId(o.id)}
            columns={[
              'status',
              'fulfilment',
              'ecr',
              'client',
              'lines',
              'cylinders',
              'value',
              'requested',
            ]}
            empty={
              scope === 'mine'
                ? 'No orders of yours match these filters.'
                : 'No sales-desk orders match these filters.'
            }
          />
        </div>

        {formOpen && (
          <div className="min-h-0 w-[38rem] max-w-[46%] flex-none">
            <NewOrderForm
              onPlaced={(o) => {
                setJustPlaced(o);
                setDetailId(o.id);
              }}
              onCancel={() => setFormOpen(false)}
            />
          </div>
        )}
      </div>

      {detailId != null && <OrderDetail orderId={detailId} onClose={() => setDetailId(null)} />}
    </div>
  );
}

export default SalesDesk;
