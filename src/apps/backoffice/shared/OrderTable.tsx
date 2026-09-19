// ─── OrderTable — the shared dense order grid ────────────────────────────────
// Used by the clerk queue, the sales desk, and (by import) the cashier and
// admin surfaces. Props are deliberately general: pass any Order[], choose the
// columns, choose the density. No business logic lives here — it renders and it
// raises onSelect. Nothing else.
//
// Keyboard: rows are focusable. ↑/↓ move, Enter/Space select, Home/End jump.

import { useCallback, useRef } from 'react';
import type { ReactNode, KeyboardEvent as ReactKeyboardEvent } from 'react';
import type { Order, OrderStatus, Role } from '../../../core/types';
import type { State } from '../../../core/store';
import { useStore, select, orderValue, orderCylinders, serviceChargeTotal } from '../../../core/store';
import { formatEcr } from '../../../core/ecr';
import { Money, StatusPill, useToast } from '../../../ui/primitives';

// ─── Tone helpers ────────────────────────────────────────────────────────────

export type Tone = 'neutral' | 'info' | 'warn' | 'danger' | 'success';

/**
 * Meaning-carrying colour, rendered plainly: white ground, a 1px border and
 * coloured text. No tinted fills — the colour still says short / held /
 * rejected / posted, it just no longer decorates the screen.
 */
export const TONE_CLASS: Record<Tone, string> = {
  neutral: 'bg-surface text-fg-muted border-line',
  info: 'bg-surface text-info-fg border-info',
  warn: 'bg-surface text-warn-fg border-warn',
  danger: 'bg-surface text-danger-fg border-danger',
  success: 'bg-surface text-success-fg border-success',
};

/**
 * Toast wrapper used by every screen in the back office.
 *
 * One call signature for the whole folder: `toast(message, tone, title)`.
 * Rejections are given a long dwell — a RuleError is the demo's evidence that
 * the rules are enforced in the API, so it must be readable, not a flash.
 */
export function useRuleToast() {
  const { push } = useToast();
  return useCallback(
    (message: string, tone: Tone = 'info', title?: string) => {
      const heading =
        title ??
        (tone === 'danger' ? 'Rejected by the rules engine' : tone === 'success' ? 'Done' : 'Notice');
      push({
        title: heading,
        description: message,
        tone,
        duration: tone === 'danger' ? 9000 : tone === 'warn' ? 6000 : 4500,
      });
    },
    [push],
  );
}

// ─── Display atoms reused across the back office ─────────────────────────────

/** Thin alias over the design system's pill so every surface reads identically. */
export function OrderStatusPill({
  status,
  className = '',
}: {
  status: OrderStatus;
  className?: string;
}) {
  return <StatusPill status={status} className={className} />;
}

/** ECR display: the four segments spaced out, or a plain statement it has none. */
export function EcrText({ ecr, size = 'sm' }: { ecr?: string | null; size?: 'sm' | 'base' | 'lg' }) {
  if (!ecr) {
    return <span className="text-base text-fg-muted">No ECR number yet</span>;
  }
  const cls = size === 'lg' ? 'text-xl' : 'text-base';
  return <span className={`font-mono tabular-nums text-fg ${cls}`}>{formatEcr(ecr)}</span>;
}

/**
 * Delivery or self-collection. A collection has no vehicle, no route and no
 * driver, and it is priced off the ex-delivery card — so it is marked wherever
 * an order is listed, not just on the clerk's board.
 */
export function FulfilmentTag({ fulfilment }: { fulfilment: Order['fulfilment'] }) {
  const collects = fulfilment === 'collection';
  return (
    <span
      className={`inline-flex whitespace-nowrap border px-2 py-0.5 text-base ${
        collects ? TONE_CLASS.info : TONE_CLASS.neutral
      }`}
    >
      {collects ? 'Client collects' : 'Delivery'}
    </span>
  );
}

export function OriginTag({ origin }: { origin: Order['origin'] }) {
  const fromClient = origin === 'client_app';
  return (
    <span className="inline-flex whitespace-nowrap border border-line px-2 py-0.5 text-base text-fg-muted">
      {fromClient ? 'Client app' : 'Sales desk'}
    </span>
  );
}

// ─── Formatting ──────────────────────────────────────────────────────────────

export const fmtTime = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—';

export const fmtDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—';

export const fmtDateTime = (iso?: string | null) => (iso ? `${fmtDate(iso)} ${fmtTime(iso)}` : '—');

export function ageLabel(iso?: string | null): string {
  if (!iso) return '—';
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export function roleLabel(role?: Role) {
  return role ? role.charAt(0).toUpperCase() + role.slice(1) : '—';
}

/** Cylinders actually staged if the order has been filled, else the ordered count. */
export function cylindersOf(o: Order): number {
  const loaded = orderCylinders(o, 'qtyLoaded');
  return loaded > 0 ? loaded : orderCylinders(o, 'qtyOrdered');
}

// ─── Columns ─────────────────────────────────────────────────────────────────

export type OrderColumn =
  | 'status'
  | 'fulfilment'
  | 'ecr'
  | 'client'
  | 'origin'
  | 'location'
  | 'book'
  | 'lines'
  | 'cylinders'
  | 'value'
  | 'requested'
  | 'created'
  | 'age'
  | 'route'
  | 'vehicle'
  | 'driver'
  | 'oracle';

interface ColumnDef {
  label: string;
  align?: 'left' | 'right';
  className?: string;
  render: (o: Order, s: State) => ReactNode;
}

const COLUMN_DEFS: Record<OrderColumn, ColumnDef> = {
  status: {
    label: 'Status',
    className: 'w-32',
    render: (o) => <OrderStatusPill status={o.status} />,
  },
  ecr: {
    label: 'ECR number',
    className: 'w-40',
    render: (o) => <EcrText ecr={o.ecr} />,
  },
  client: {
    label: 'Client',
    render: (o, s) => {
      const c = select.client(s, o.clientId);
      return (
        <div className="min-w-0">
          <div className="truncate font-medium text-fg">{c?.name ?? `Client ${o.clientId}`}</div>
          <div className="truncate text-base text-fg-muted">
            {c?.area ? `${c.area} · ` : ''}
            <span className={c?.paymentTerms === 'credit' ? 'text-warn-fg' : 'text-success-fg'}>
              {c?.paymentTerms === 'credit' ? 'Credit' : 'Cash'}
            </span>
          </div>
        </div>
      );
    },
  },
  fulfilment: {
    label: 'How it goes out',
    className: 'w-36',
    render: (o) => <FulfilmentTag fulfilment={o.fulfilment} />,
  },
  origin: { label: 'Taken from', className: 'w-28', render: (o) => <OriginTag origin={o.origin} /> },
  location: {
    label: 'Location',
    render: (o, s) => (
      <span className="whitespace-nowrap text-fg-muted">
        {select.location(s, o.locationId)?.name ?? '—'}
      </span>
    ),
  },
  book: {
    label: 'Book type',
    render: (o, s) => {
      const b = select.bookType(s, o.bookTypeId);
      return (
        <span className="whitespace-nowrap text-fg-muted">
          <span className="font-mono tabular-nums text-fg-muted">{b?.code}</span> {b?.name}
        </span>
      );
    },
  },
  lines: {
    label: 'What was ordered',
    render: (o, s) => (
      <div className="min-w-0 truncate text-fg-muted">
        {o.lines
          .map((l) => {
            const p = select.product(s, l.productId);
            return `${p?.name ?? 'Item'} ${p?.size ?? ''} ×${l.qtyLoaded ?? l.qtyOrdered}`;
          })
          .join(' · ')}
      </div>
    ),
  },
  cylinders: {
    label: 'Cylinders',
    align: 'right',
    className: 'w-24',
    render: (o) => <span className="font-mono tabular-nums text-fg">{cylindersOf(o)}</span>,
  },
  value: {
    label: 'Value',
    align: 'right',
    className: 'w-36',
    render: (o) => {
      const total = orderValue(o);
      const service = serviceChargeTotal(o);
      return (
        <span className="font-mono tabular-nums text-fg">
          <Money value={total} />
          {service > 0 && (
            <span className="block text-base text-fg-muted">
              <Money value={total - service} bare /> + <Money value={service} bare /> service
            </span>
          )}
        </span>
      );
    },
  },
  requested: {
    label: 'Requested for',
    className: 'w-28',
    render: (o) => (
      <span className="whitespace-nowrap text-fg-muted">{fmtDate(o.requestedDate)}</span>
    ),
  },
  created: {
    label: 'Created',
    className: 'w-28',
    render: (o) => <span className="whitespace-nowrap text-fg-muted">{fmtDateTime(o.createdAt)}</span>,
  },
  age: {
    label: 'Waiting',
    align: 'right',
    className: 'w-20',
    render: (o) => <span className="font-mono tabular-nums text-fg">{ageLabel(o.createdAt)}</span>,
  },
  route: {
    label: 'Route',
    render: (o, s) => (
      <span className="whitespace-nowrap text-fg-muted">{select.route(s, o.routeId)?.code ?? '—'}</span>
    ),
  },
  vehicle: {
    label: 'Vehicle',
    render: (o, s) => (
      <span className="whitespace-nowrap font-mono text-fg-muted">
        {select.vehicle(s, o.vehicleId)?.registration ?? '—'}
      </span>
    ),
  },
  driver: {
    label: 'Driver',
    render: (o, s) => (
      <span className="whitespace-nowrap text-fg-muted">{select.user(s, o.driverId)?.name ?? '—'}</span>
    ),
  },
  oracle: {
    label: 'Oracle document',
    render: (o) =>
      o.oracleDocNo ? (
        <span className="font-mono text-success-fg">{o.oracleDocNo}</span>
      ) : (
        <span className="text-fg-muted">Not posted yet</span>
      ),
  },
};

export const DEFAULT_COLUMNS: OrderColumn[] = [
  'status',
  'ecr',
  'client',
  'lines',
  'cylinders',
  'value',
  'requested',
  'age',
];

// ─── The table ───────────────────────────────────────────────────────────────

export interface OrderTableProps {
  orders: Order[];
  onSelect?: (order: Order) => void;
  columns?: OrderColumn[];
  dense?: boolean;
  /** Highlights the current row — pass the id of whatever the drawer is showing. */
  selectedId?: number | null;
  /** Shown when `orders` is empty. A filtered view only — never on first load. */
  empty?: ReactNode;
  /** Optional trailing cell, e.g. per-row action buttons. */
  rowActions?: (order: Order) => ReactNode;
  stickyHeader?: boolean;
  className?: string;
}

export function OrderTable({
  orders,
  onSelect,
  columns = DEFAULT_COLUMNS,
  dense = false,
  selectedId = null,
  empty,
  rowActions,
  stickyHeader = true,
  className = '',
}: OrderTableProps) {
  const s = useStore((st) => st);
  const rowRefs = useRef<(HTMLTableRowElement | null)[]>([]);

  const onKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLTableRowElement>, index: number, order: Order) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSelect?.(order);
        return;
      }
      let next = -1;
      if (e.key === 'ArrowDown') next = index + 1;
      else if (e.key === 'ArrowUp') next = index - 1;
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = orders.length - 1;
      if (next >= 0 && next < orders.length) {
        e.preventDefault();
        rowRefs.current[next]?.focus();
      }
    },
    [onSelect, orders.length],
  );

  // Roomier than before in both modes: `dense` now means "a normal table row",
  // not "as many rows as will physically fit".
  const pad = dense ? 'px-3 py-3' : 'px-4 py-4';

  if (!orders.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-1 border border-line bg-surface px-6 py-10 text-center">
        <div className="text-base font-medium text-fg">{empty ?? 'No orders match this filter'}</div>
        <div className="text-base text-fg-muted">Clear the filters to see the full list.</div>
      </div>
    );
  }

  return (
    <div className={`overflow-auto border border-line bg-surface ${className}`}>
      <table className="w-full border-collapse text-left text-base">
        <thead className={stickyHeader ? 'sticky top-0 z-10' : undefined}>
          <tr className="bg-surface">
            {columns.map((c) => (
              <th
                key={c}
                scope="col"
                className={`${pad} border-b border-line text-base font-semibold text-fg ${
                  COLUMN_DEFS[c].align === 'right' ? 'text-right' : 'text-left'
                } ${COLUMN_DEFS[c].className ?? ''}`}
              >
                {COLUMN_DEFS[c].label}
              </th>
            ))}
            {rowActions && (
              <th
                scope="col"
                className={`${pad} border-b border-line text-right text-base font-semibold text-fg`}
              >
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {orders.map((o, i) => {
            const selected = selectedId === o.id;
            return (
              <tr
                key={o.id}
                ref={(el) => {
                  rowRefs.current[i] = el;
                }}
                tabIndex={onSelect ? 0 : -1}
                aria-selected={selected}
                onClick={() => onSelect?.(o)}
                onKeyDown={(e) => onKeyDown(e, i, o)}
                className={`border-b border-line outline-none ${
                  onSelect ? 'cursor-pointer' : ''
                } ${
                  // Selection is a light grey fill and bold text — no tint, no
                  // rail, no ring.
                  selected
                    ? 'bg-surface-high font-semibold'
                    : 'hover:bg-surface-high focus:bg-surface-high'
                }`}
              >
                {columns.map((c) => (
                  <td
                    key={c}
                    className={`${pad} align-middle ${
                      COLUMN_DEFS[c].align === 'right' ? 'text-right' : ''
                    } ${COLUMN_DEFS[c].className ?? ''}`}
                  >
                    {COLUMN_DEFS[c].render(o, s)}
                  </td>
                ))}
                {rowActions && (
                  <td className={`${pad} text-right`} onClick={(e) => e.stopPropagation()}>
                    {rowActions(o)}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default OrderTable;
