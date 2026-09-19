// ─── Admin dashboard ─────────────────────────────────────────────────────────
// The CEO's screen: four numbers and one chart. The pipeline funnel that used
// to sit underneath said the same thing the dispatch queue says, one click
// away, so it is gone rather than restated here.
//
// Everything here is read-only: sums and counts over store state. No mutations.

import { useMemo } from 'react';
import { useStore, orderCylinders } from '../../../core/store';
import { monthlyVolume, dataProvenance } from '../../../core/realData';
import { Card, CardBody, CardHeader, StatTile, Money, Timestamp } from '../../../ui/primitives';
import { BarChart } from '../../../ui/charts';
import * as Icons from '../../../ui/icons';
import { useT } from '../../../i18n';

const MONTH_LABEL = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function Dashboard() {
  const s = useStore((x) => x);
  const t = useT();

  const today = new Date().toISOString().slice(0, 10);

  const stats = useMemo(() => {
    const ordersToday = s.orders.filter((o) => o.createdAt.startsWith(today));
    const onRoad = s.orders.filter((o) => o.status === 'DISPATCHED');
    return {
      ordersToday,
      cylindersOut: onRoad.reduce((n, o) => n + orderCylinders(o, 'qtyLoaded'), 0),
      cashCollected: s.deliveryEvents.reduce((n, d) => n + d.cashCollected, 0),
      failed: s.orders.filter((o) => o.status === 'POST_FAILED'),
    };
  }, [s.orders, s.deliveryEvents, today]);

  const chartData = monthlyVolume.map((m) => {
    const monthIdx = Number(m.month.slice(5, 7)) - 1;
    return {
      label: MONTH_LABEL[monthIdx],
      value: m.cylinders,
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

      {/* ── Four numbers ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label={t('Orders today')}
          value={stats.ordersToday.length}
          icon={Icons.Clipboard}
        />
        <StatTile label={t('Cylinders out')} value={stats.cylindersOut} icon={Icons.Cylinder} />
        <StatTile
          label={t('Cash collected')}
          value={<Money value={stats.cashCollected} />}
          icon={Icons.Banknote}
        />
        <StatTile
          label={t('Failed posts')}
          value={stats.failed.length}
          icon={Icons.Alert}
          deltaTone={stats.failed.length ? 'danger' : 'success'}
        />
      </div>

      {/* ── One chart ──────────────────────────────────────────────────── */}
      <div className="mt-6">
        <Card>
          <CardHeader
            title={t('Monthly volume — real historical data')}
            subtitle={`Peshawar warehouse · ${dataProvenance.periodFrom} → ${dataProvenance.periodTo}`}
          />
          <CardBody>
            <BarChart
              data={chartData}
              height={210}
              grid
              unit="cyl"
              ariaLabel="Monthly volume, Peshawar warehouse"
            />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
