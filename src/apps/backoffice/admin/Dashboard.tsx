// ─── Admin dashboard ─────────────────────────────────────────────────────────
// The CEO's screen. Today's operation on the left of the eye, the twelve-month
// history from the real Peshawar report underneath it, and the pipeline funnel
// so nothing can hide between stages.
//
// Everything here is read-only: sums and counts over store state. No mutations.

import { useMemo, useState } from 'react';
import { useStore, select, orderValue, orderCylinders } from '../../../core/store';
import type { OrderStatus } from '../../../core/types';
import { STATUS_LABEL, STATUS_TONE, PIPELINE } from '../../../core/stateMachine';
import { monthlyVolume, dataProvenance } from '../../../core/realData';
import {
  Card,
  CardBody,
  CardHeader,
  StatTile,
  Badge,
  SectionTitle,
  Tabs,
  Money,
  Timestamp,
} from '../../../ui/primitives';
import { BarChart, DonutStat } from '../../../ui/charts';
import * as Icons from '../../../ui/icons';
import { useT } from '../../../i18n';

const MONTH_LABEL = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function Dashboard() {
  const s = useStore((x) => x);
  const [metric, setMetric] = useState<'cylinders' | 'orders' | 'valuePkr'>('cylinders');
  const t = useT();

  const today = new Date().toISOString().slice(0, 10);

  const stats = useMemo(() => {
    const ordersToday = s.orders.filter((o) => o.createdAt.startsWith(today));
    const onRoad = s.orders.filter((o) => o.status === 'DISPATCHED');
    const cylindersOut = onRoad.reduce((n, o) => n + orderCylinders(o, 'qtyLoaded'), 0);
    const cashCollected = s.deliveryEvents.reduce((n, d) => n + d.cashCollected, 0);
    const posted = s.orders.filter((o) => o.status === 'POSTED');
    const postedValue = posted.reduce((n, o) => n + orderValue(o, { delivered: true }), 0);
    const failed = s.orders.filter((o) => o.status === 'POST_FAILED');
    const held = s.orders.filter((o) => o.status === 'MISMATCH_HELD');

    const lags = s.orders
      .filter((o) => o.deliveredAt && o.postedAt)
      .map((o) => new Date(o.postedAt!).getTime() - new Date(o.deliveredAt!).getTime())
      .filter((ms) => ms > 0);
    const avgLagMs = lags.length ? lags.reduce((a, b) => a + b, 0) / lags.length : 0;

    return {
      ordersToday,
      cylindersOut,
      onRoad,
      cashCollected,
      posted,
      postedValue,
      failed,
      held,
      avgLagMs,
      lagSample: lags.length,
    };
  }, [s.orders, s.deliveryEvents, today]);

  const funnel = useMemo(() => {
    const counts = new Map<OrderStatus, number>();
    for (const o of s.orders) counts.set(o.status, (counts.get(o.status) ?? 0) + 1);
    return counts;
  }, [s.orders]);

  const termsMix = useMemo(() => {
    let cash = 0;
    let credit = 0;
    for (const o of s.orders) {
      if (select.client(s, o.clientId)?.paymentTerms === 'credit') credit += 1;
      else cash += 1;
    }
    return { cash, credit };
  }, [s.orders, s.clients]);

  const chartData = monthlyVolume.map((m) => {
    const monthIdx = Number(m.month.slice(5, 7)) - 1;
    return {
      label: MONTH_LABEL[monthIdx],
      value: metric === 'valuePkr' ? Math.round(m[metric] / 1000) : m[metric],
      tone: 'accent' as const,
    };
  });

  const lastPost = s.orders
    .filter((o) => o.postedAt)
    .sort((a, b) => (b.postedAt ?? '').localeCompare(a.postedAt ?? ''))[0];

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-6">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-fg">{t('Operations dashboard')}</h1>
          <p className="mt-2 text-base text-fg-muted">
            {t('Multan warehouse, live. Historical volume is the real Peshawar branch record.')}
          </p>
        </div>
        {lastPost?.postedAt && (
          <div className="text-base text-fg-muted">
            {t('Last Oracle post')} <Timestamp value={lastPost.postedAt} /> ·{' '}
            <span className="font-mono text-success-fg">{lastPost.oracleDocNo}</span>
          </div>
        )}
      </header>

      {/* ── Stat tiles ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <StatTile
          label={t('Orders today')}
          value={stats.ordersToday.length}
          hint={`${s.orders.length} open in the system`}
          icon={Icons.Clipboard}
        />
        <StatTile
          label={t('Cylinders out')}
          value={stats.cylindersOut}
          hint={`${stats.onRoad.length} route load(s) on the road`}
          icon={Icons.Cylinder}
        />
        <StatTile
          label={t('Cash collected')}
          value={<Money value={stats.cashCollected} />}
          hint="captured on driver tabs"
          icon={Icons.Banknote}
        />
        <StatTile
          label={t('Posted to Oracle')}
          value={stats.posted.length}
          hint={<Money value={stats.postedValue} />}
          icon={Icons.Database}
        />
        <StatTile
          label={t('Failed posts')}
          value={stats.failed.length}
          hint={stats.failed.length ? 'awaiting retry in the console' : 'queue clear'}
          icon={Icons.Alert}
          deltaTone={stats.failed.length ? 'danger' : 'success'}
        />
        <StatTile
          label={t('Delivery → posting')}
          value={formatLag(stats.avgLagMs)}
          hint={`mean over ${stats.lagSample} posted order(s)`}
          icon={Icons.Clock}
        />
      </div>

      {/* ── Volume + mix ───────────────────────────────────────────────── */}
      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title={t('Monthly volume — real historical data')}
            subtitle={`Peshawar warehouse · ${dataProvenance.periodFrom} → ${dataProvenance.periodTo}`}
            action={
              <Tabs
                size="md"
                value={metric}
                onChange={(id) => setMetric(id as typeof metric)}
                tabs={[
                  { id: 'cylinders', label: 'Cylinders' },
                  { id: 'orders', label: 'Documents' },
                  { id: 'valuePkr', label: 'Value (Rs 000)' },
                ]}
              />
            }
          />
          <CardBody>
            <BarChart
              data={chartData}
              height={210}
              grid
              unit={metric === 'cylinders' ? 'cyl' : metric === 'orders' ? 'docs' : 'Rs 000'}
              ariaLabel="Monthly volume, Peshawar warehouse"
            />
            <p className="mt-4 border-t border-line pt-4 text-base leading-relaxed text-fg-muted">
              <Badge tone="info">Real data</Badge>{' '}
              {dataProvenance.totalTransactions.toLocaleString()} sale documents,{' '}
              {dataProvenance.totalCylinders.toLocaleString()} cylinders and{' '}
              <Money value={dataProvenance.totalValuePkr} /> of trade, taken from{' '}
              <span className="font-mono">{dataProvenance.sourceFile}</span>. Peak month{' '}
              {dataProvenance.peakMonthTransactions} documents — that is the load this system has to
              absorb without a re-keying team.
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title={t('Payment terms mix')} subtitle={t('Drives what the cashier expects to count')} />
          <CardBody className="flex flex-col items-center gap-4">
            <DonutStat
              segments={[
                { label: 'Cash at the gate', value: termsMix.cash, tone: 'accent' },
                { label: 'Credit — invoiced', value: termsMix.credit, tone: 'info' },
              ]}
              size={150}
              centerValue={s.orders.length}
              centerLabel="orders"
            />
            <p className="text-base leading-relaxed text-fg-muted">
              Credit orders contribute <span className="font-medium text-fg">Rs 0</span> to the cash
              count at reconciliation — they post to Oracle as an invoice against the customer
              account instead. Mixing the two is the classic source of a false shortfall.
            </p>
          </CardBody>
        </Card>
      </div>

      {/* ── Pipeline funnel ────────────────────────────────────────────── */}
      <div className="mt-6">
        <SectionTitle subtitle="Every order in the system, by state. Exceptions are broken out — they cannot hide inside a stage.">
          {t('Pipeline')}
        </SectionTitle>
        <Card className="mt-3">
          <CardBody>
            <ul className="space-y-2">
              {PIPELINE.map((st) => (
                <FunnelRow
                  key={st}
                  status={st}
                  count={funnel.get(st) ?? 0}
                  total={Math.max(1, s.orders.length)}
                />
              ))}
            </ul>

            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4 sm:grid-cols-4">
              {(['DISPUTED', 'MISMATCH_HELD', 'POST_FAILED', 'CANCELLED'] as OrderStatus[]).map(
                (st) => (
                  <div key={st} className="border border-line bg-surface px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-base text-fg">{STATUS_LABEL[st]}</span>
                      <Badge tone={STATUS_TONE[st]}>{funnel.get(st) ?? 0}</Badge>
                    </div>
                  </div>
                ),
              )}
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function FunnelRow({
  status,
  count,
  total,
}: {
  status: OrderStatus;
  count: number;
  total: number;
}) {
  const pct = Math.round((count / total) * 100);
  return (
    <li className="flex items-center gap-4 py-1">
      <span className="w-44 shrink-0 text-base text-fg">{STATUS_LABEL[status]}</span>
      <div className="h-7 min-w-0 flex-1 overflow-hidden border border-line bg-surface">
        <div
          className={status === 'POSTED' ? 'h-full bg-success' : 'h-full bg-fg-muted'}
          style={{ width: `${Math.max(count > 0 ? 4 : 0, pct)}%` }}
        />
      </div>
      <span className="w-12 shrink-0 text-right text-lg font-semibold tabular-nums text-fg">
        {count}
      </span>
    </li>
  );
}

function formatLag(ms: number): string {
  if (!ms) return '—';
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}
