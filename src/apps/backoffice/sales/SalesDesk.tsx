// ─── SalesDesk — Path B, the order desk ──────────────────────────────────────
// One job at a time. The screen rests on the list of orders this salesperson
// has taken; pressing New order replaces it with the form, because taking an
// order and reviewing yesterday's are not the same job and do not belong side
// by side. One store, so an order placed here is in the warehouse queue before
// the handset is back on the cradle.

import { useMemo, useState } from 'react';
import type { Order } from '../../../core/types';
import { useStore, useCurrentUser } from '../../../core/store';
import { Plus } from '../../../ui/icons';
import { useT } from '../../../i18n';
import OrderTable from '../shared/OrderTable';
import OrderDetail from '../clerk/OrderDetail';
import NewOrderForm from './NewOrderForm';

export function SalesDesk() {
  const t = useT();
  const s = useStore((st) => st);
  const me = useCurrentUser();

  const [formOpen, setFormOpen] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);

  const mine = useMemo(
    () =>
      s.orders
        .filter((o) => o.createdBy === me.id || o.origin === 'sales')
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [s.orders, me.id],
  );

  return (
    <div className="flex h-full min-h-0 flex-col bg-surface">
      {/* ── Title, one sentence, one button ──────────────────────────────── */}
      <header className="flex-none border-b border-line bg-surface px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold leading-tight text-fg">{t('Sales desk')}</h1>
            <p className="text-base text-fg-muted">
              {t('Orders taken by phone on a client’s behalf — same route into the warehouse as the client app.')}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setFormOpen((v) => !v)}
            className={`ms-auto inline-flex items-center gap-2 px-4 py-2 text-base font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
              formOpen
                ? 'border border-line bg-surface text-fg hover:bg-surface-high'
                : 'bg-accent text-accent-fg hover:bg-accent-hover'
            }`}
          >
            <Plus className="h-4 w-4" /> {formOpen ? t('Hide form') : t('New order')}
          </button>
        </div>
      </header>

      {/* ── Body: the form, or the list. Never both. ─────────────────────── */}
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {formOpen ? (
          <NewOrderForm
            onPlaced={(o: Order) => {
              setDetailId(o.id);
              setFormOpen(false);
            }}
            onCancel={() => setFormOpen(false)}
          />
        ) : (
          <OrderTable
            orders={mine}
            dense
            selectedId={detailId}
            onSelect={(o) => setDetailId(o.id)}
            empty={t('Nothing in the queue.')}
          />
        )}
      </div>

      {detailId != null && <OrderDetail orderId={detailId} onClose={() => setDetailId(null)} />}
    </div>
  );
}

export default SalesDesk;
