// ─── ClerkQueue — the warehouse dispatch desk ────────────────────────────────
// One list, one button per row. The row shows who it is for, what they want and
// where the order has got to; the button is the single next step — fill, then
// assign, then dispatch, then it is done. Every mutation goes through api.*;
// every rejection is shown verbatim, because the rejections are the point.
//
// Self-collections sit in the same list under a plain Collection tag. The
// client's own van is coming, so there is no vehicle, route or driver: their
// two steps are release (where the ECR is burned) and record the handover.
//
// Keyboard, kept but no longer advertised (the clerk does this 200 times a day):
//   /  search      ↑ ↓ / j k  move       Enter open       Esc close
//   F  fill        A  assign             D  dispatch      C  cancel
//   R  release for collection            H  record the handover

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Order, OrderStatus } from '../../../core/types';
import {
  api,
  useStore,
  useCurrentUser,
  select,
  RuleError,
  orderCylinders,
} from '../../../core/store';
import { canTransition, STATUS_LABEL } from '../../../core/stateMachine';
import { Button, Money, NumberStepper } from '../../../ui/primitives';
import { Search, Truck, X, Alert, Box } from '../../../ui/icons';
import { useT } from '../../../i18n';
import OrderTable from '../shared/OrderTable';
import { TONE_CLASS, fmtDate, useRuleToast } from '../shared/OrderTable';
import OrderDetail from './OrderDetail';
import DispatchModal from './DispatchModal';
import CollectionModal from './CollectionModal';

// Tolerates either `onChange(n)` or `onChange(event)` from the shared stepper.
const asNumber = (v: any): number => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  const raw = v?.target?.value ?? v;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
};

// ─── Buttons (local, so the screen never waits on the design agent) ──────────

/**
 * Thin alias over the design system's Button, so this screen has one verb style.
 * There is no small variant any more — every button on this screen is the same
 * full-size target, because the clerk is clicking them all day.
 */
function Btn({
  children,
  onClick,
  kind = 'ghost',
  disabled,
  title,
  full,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  kind?: 'primary' | 'secondary' | 'ghost' | 'danger';
  disabled?: boolean;
  title?: string;
  full?: boolean;
}) {
  return (
    <Button
      type="button"
      variant={kind}
      size="md"
      block={full}
      title={title}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

// ─── Modal frame ─────────────────────────────────────────────────────────────

function ModalFrame({
  title,
  subtitle,
  onClose,
  children,
  footer,
  width = 'w-[40rem]',
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer: React.ReactNode;
  width?: string;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center p-6" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-scrim" onClick={onClose} aria-hidden="true" />
      <div className={`relative ${width} max-w-full overflow-hidden border border-line bg-surface`}>
        <header className="flex items-start gap-3 border-b border-line bg-surface px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-semibold text-fg">{title}</h2>
            {subtitle && <p className="mt-1 text-base text-fg-muted">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-2 text-fg-muted hover:bg-surface-high hover:text-fg focus:outline-none focus-visible:ring-1 focus-visible:ring-accent"
          >
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="max-h-[62vh] overflow-y-auto px-5 py-5">{children}</div>
        <footer className="flex items-center justify-end gap-3 border-t border-line bg-surface px-5 py-4">
          {footer}
        </footer>
      </div>
    </div>
  );
}

// ─── Fill modal ──────────────────────────────────────────────────────────────

function FillModal({ orderId, onClose }: { orderId: number; onClose: () => void }) {
  const s = useStore((st) => st);
  const toast = useRuleToast();
  const order = select.order(s, orderId);
  const [loaded, setLoaded] = useState<Record<number, number>>(() =>
    Object.fromEntries((order?.lines ?? []).map((l) => [l.id, l.qtyLoaded ?? l.qtyOrdered])),
  );

  if (!order) return null;
  const client = select.client(s, order.clientId);
  const staged = order.lines.reduce((t, l) => t + (loaded[l.id] ?? 0), 0);
  const ordered = orderCylinders(order, 'qtyOrdered');
  const short = staged < ordered;

  const submit = () => {
    try {
      api.fillOrder(
        order.id,
        order.lines.map((l) => ({ lineId: l.id, qtyLoaded: loaded[l.id] ?? 0 })),
      );
      toast(
        `Order #${order.id} filled — ${staged} cylinders staged${short ? ` (${ordered - staged} short)` : ''}.`,
        'success',
        'Filled',
      );
      onClose();
    } catch (err) {
      const msg = err instanceof RuleError ? err.message : (err as Error).message;
      const rule = err instanceof RuleError ? err.rule : 'ERROR';
      toast(msg, 'danger', `Fill blocked — ${rule}`);
    }
  };

  return (
    <ModalFrame
      title={`Review & fill — ${client?.name ?? 'order'}`}
      subtitle={`Order #${order.id} · ${order.origin === 'client_app' ? 'placed in the client app' : 'taken at the sales desk'} · requested ${fmtDate(order.requestedDate)}`}
      onClose={onClose}
      footer={
        <>
          <span className="me-auto text-base text-fg-muted">
            Filling moves the order to <span className="text-fg">Filled</span>. No ECR is issued yet.
          </span>
          <Btn kind="ghost" onClick={onClose}>
            Cancel
          </Btn>
          <Btn kind="primary" onClick={submit}>
            <Box className="h-4 w-4" /> Confirm fill — {staged} cylinders
          </Btn>
        </>
      }
    >
      {order.notes && (
        <p className="mb-4 border border-line px-3 py-2 text-base text-fg">
          <span className="font-semibold">Order note:</span> {order.notes}
        </p>
      )}

      <div className="mb-4 grid grid-cols-3 gap-3 text-base">
        <div className="border border-line bg-surface px-3 py-2.5">
          <div className="text-base text-fg-muted">Client</div>
          <div className="truncate text-fg">{client?.name}</div>
          <div className="truncate text-base text-fg-muted">{client?.area}</div>
        </div>
        <div className="border border-line bg-surface px-3 py-2.5">
          <div className="text-base text-fg-muted">Book type and location</div>
          <div className="truncate text-fg">{select.bookType(s, order.bookTypeId)?.name}</div>
          <div className="truncate text-base text-fg-muted">{select.location(s, order.locationId)?.name}</div>
        </div>
        <div className="border border-line bg-surface px-3 py-2.5">
          <div className="text-base text-fg-muted">Payment</div>
          <div className={client?.paymentTerms === 'credit' ? 'text-warn-fg' : 'text-success-fg'}>
            {client?.paymentTerms === 'credit' ? 'Credit' : 'Cash on delivery'}
          </div>
          <div className="truncate text-base text-fg-muted">
            confirms by {client?.confirmMethod === 'otp' ? 'OTP' : 'signature'}
          </div>
        </div>
      </div>

      <table className="w-full border-collapse border border-line text-base">
        <thead>
          <tr className="border-b border-line bg-surface text-base text-fg">
            <th className="px-3 py-3 text-left font-semibold">Product</th>
            <th className="px-3 py-3 text-right font-semibold">Ordered</th>
            <th className="px-3 py-3 text-center font-semibold">Put on the truck</th>
            <th className="px-3 py-3 text-right font-semibold">Difference</th>
            <th className="px-3 py-3 text-right font-semibold">Value</th>
          </tr>
        </thead>
        <tbody>
          {order.lines.map((l) => {
            const p = select.product(s, l.productId);
            const v = (loaded[l.id] ?? 0) - l.qtyOrdered;
            return (
              <tr key={l.id} className="border-t border-line">
                <td className="px-3 py-3">
                  <div className="font-medium text-fg">{p?.name}</div>
                  <div className="text-base text-fg-muted">
                    <span className="font-mono">{p?.sku}</span> · {p?.size}
                  </div>
                </td>
                <td className="px-3 py-3 text-right font-mono tabular-nums text-fg-muted">{l.qtyOrdered}</td>
                <td className="px-3 py-3">
                  <div className="flex justify-center">
                    <NumberStepper
                      value={loaded[l.id] ?? 0}
                      min={0}
                      max={l.qtyOrdered}
                      onChange={(v2: any) =>
                        setLoaded((prev) => ({ ...prev, [l.id]: Math.max(0, Math.min(l.qtyOrdered, asNumber(v2))) }))
                      }
                    />
                  </div>
                </td>
                <td
                  className={`px-3 py-3 text-right font-mono tabular-nums ${
                    v < 0 ? 'text-warn-fg' : 'text-fg-muted'
                  }`}
                >
                  {v === 0 ? '—' : v}
                </td>
                <td className="px-3 py-3 text-right font-mono tabular-nums text-fg">
                  <Money value={(loaded[l.id] ?? 0) * l.unitPrice} />
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t border-line bg-surface">
            <td className="px-3 py-3 text-base font-semibold text-fg">Totals</td>
            <td className="px-3 py-3 text-right font-mono tabular-nums text-fg-muted">{ordered}</td>
            <td className="px-3 py-3 text-center font-mono tabular-nums text-fg">{staged}</td>
            <td className={`px-3 py-3 text-right font-mono tabular-nums ${short ? 'text-warn-fg' : 'text-fg-muted'}`}>
              {staged - ordered === 0 ? '—' : staged - ordered}
            </td>
            <td className="px-3 py-3 text-right font-mono tabular-nums text-fg">
              <Money value={order.lines.reduce((t, l) => t + (loaded[l.id] ?? 0) * l.unitPrice, 0)} />
            </td>
          </tr>
        </tfoot>
      </table>

      {short && (
        <div className={`mt-4 flex gap-2 border px-3 py-3 text-base ${TONE_CLASS.warn}`}>
          <Alert className="mt-0.5 h-4 w-4 flex-none" />
          <span>
            Short fill — {ordered - staged} cylinder(s) below the order. That is normal here; the loaded
            quantity, not the ordered one, is what the driver carries, what the client signs for and what
            reaches Oracle.
          </span>
        </div>
      )}
    </ModalFrame>
  );
}

// ─── Assign modal ────────────────────────────────────────────────────────────

function AssignModal({ orderId, onClose }: { orderId: number; onClose: () => void }) {
  const s = useStore((st) => st);
  const toast = useRuleToast();
  const order = select.order(s, orderId);
  const client = order ? select.client(s, order.clientId) : undefined;

  const [vehicleId, setVehicleId] = useState<number>(() => order?.vehicleId ?? s.vehicles.find((v) => v.active)?.id ?? 0);
  const [routeId, setRouteId] = useState<number>(
    () => order?.routeId ?? client?.defaultRouteId ?? s.routes.find((r) => r.active)?.id ?? 0,
  );
  const [driverId, setDriverId] = useState<number>(
    () => order?.driverId ?? s.users.find((u) => u.role === 'driver')?.id ?? 0,
  );
  const [loaded, setLoaded] = useState<Record<number, number>>(() =>
    Object.fromEntries((order?.lines ?? []).map((l) => [l.id, l.qtyLoaded ?? l.qtyOrdered])),
  );

  if (!order) return null;

  const vehicle = s.vehicles.find((v) => v.id === vehicleId);
  const vclass = s.vehicleClasses.find((c) => c.id === vehicle?.classId);
  const max = vclass?.maxCylinders ?? 0;

  const alreadyOn = s.orders
    .filter((x) => x.id !== order.id && x.vehicleId === vehicleId && ['ASSIGNED', 'DISPATCHED'].includes(x.status))
    .reduce((t, x) => t + orderCylinders(x, 'qtyLoaded'), 0);
  const thisLoad = order.lines.reduce((t, l) => t + (loaded[l.id] ?? 0), 0);
  const total = alreadyOn + thisLoad;
  const pct = max ? (total / max) * 100 : 0;
  const over = total > max;

  const alreadyPct = max ? Math.min(100, (alreadyOn / max) * 100) : 0;
  const thisPct = max ? Math.min(100 - alreadyPct, (thisLoad / max) * 100) : 0;

  const submit = () => {
    try {
      api.assignOrder(order.id, {
        vehicleId,
        routeId,
        driverId,
        lines: order.lines.map((l) => ({ lineId: l.id, qtyLoaded: loaded[l.id] ?? 0 })),
      });
      toast(
        `Order #${order.id} assigned to ${vehicle?.registration} on ${s.routes.find((r) => r.id === routeId)?.code}.`,
        'success',
        'Assigned',
      );
      onClose();
    } catch (err) {
      const msg = err instanceof RuleError ? err.message : (err as Error).message;
      const rule = err instanceof RuleError ? err.rule : 'ERROR';
      toast(msg, 'danger', `Assignment refused — ${rule}`);
    }
  };

  const selectCls =
    'w-full border border-line bg-surface px-3 py-2.5 text-base text-fg focus:border-fg focus:outline-none focus-visible:ring-1 focus-visible:ring-accent';

  return (
    <ModalFrame
      title={`Assign vehicle — ${client?.name ?? 'order'}`}
      subtitle={`Order #${order.id} · ${thisLoad} cylinders staged · capacity is checked by the server, not this screen`}
      onClose={onClose}
      width="w-[44rem]"
      footer={
        <>
          <span className="me-auto text-base text-fg-muted">
            {over
              ? 'This load exceeds the vehicle class. Submit it — the rule engine will refuse it.'
              : 'Assigning moves the order to Assigned. Still no ECR.'}
          </span>
          <Btn kind="ghost" onClick={onClose}>
            Cancel
          </Btn>
          <Btn kind="primary" onClick={submit}>
            <Truck className="h-3.5 w-3.5" /> Assign
          </Btn>
        </>
      }
    >
      <div className="grid grid-cols-3 gap-4">
        <label className="block">
          <span className="mb-1.5 block text-base font-medium text-fg">Vehicle</span>
          <select className={selectCls} value={vehicleId} onChange={(e) => setVehicleId(Number(e.target.value))}>
            {s.vehicles
              .filter((v) => v.active)
              .map((v) => {
                const c = s.vehicleClasses.find((x) => x.id === v.classId);
                return (
                  <option key={v.id} value={v.id}>
                    {v.registration} — {c?.name}, holds {c?.maxCylinders} cylinders
                  </option>
                );
              })}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-base font-medium text-fg">Route</span>
          <select className={selectCls} value={routeId} onChange={(e) => setRouteId(Number(e.target.value))}>
            {s.routes
              .filter((r) => r.active)
              .map((r) => (
                <option key={r.id} value={r.id}>
                  {r.code} — {r.name}
                </option>
              ))}
          </select>
          {client?.defaultRouteId && client.defaultRouteId !== routeId && (
            <span className="mt-1.5 block text-base text-warn-fg">
              Client&rsquo;s usual route is {s.routes.find((r) => r.id === client.defaultRouteId)?.code}.
            </span>
          )}
        </label>
        <label className="block">
          <span className="mb-1.5 block text-base font-medium text-fg">Driver</span>
          <select className={selectCls} value={driverId} onChange={(e) => setDriverId(Number(e.target.value))}>
            {s.users
              .filter((u) => u.role === 'driver')
              .map((u) => {
                const load = s.orders.filter(
                  (o) => o.driverId === u.id && ['ASSIGNED', 'DISPATCHED'].includes(o.status),
                ).length;
                return (
                  <option key={u.id} value={u.id}>
                    {u.name} — {load} order(s) on hand
                  </option>
                );
              })}
          </select>
        </label>
      </div>

      {/* ── Live capacity ────────────────────────────────────────────────── */}
      <div className="mt-5 border border-line bg-surface p-4">
        <div className="mb-2 flex items-baseline justify-between">
          <h3 className="text-lg font-semibold text-fg">
            How full {vehicle?.registration ?? 'the vehicle'} is today
          </h3>
          <span className={`font-mono text-lg tabular-nums ${over ? 'text-danger-fg' : 'text-fg'}`}>
            {total} of {max} cylinders · {Math.round(pct)}%
          </span>
        </div>

        <div className="h-4 w-full overflow-hidden border border-line bg-surface">
          <div className="flex h-full w-full">
            <div
              className="h-full bg-info"
              style={{ width: `${alreadyPct}%` }}
              title={`Already loaded: ${alreadyOn}`}
            />
            <div
              className={`h-full ${over ? 'bg-danger' : 'bg-fg-muted'}`}
              style={{ width: `${thisPct}%` }}
              title={`This order: ${thisLoad}`}
            />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-base">
          <span className="flex items-center gap-2 text-fg-muted">
            <span className="h-3 w-3 bg-info" /> Already loaded{' '}
            <span className="font-mono tabular-nums text-fg">{alreadyOn}</span>
          </span>
          <span className="flex items-center gap-2 text-fg-muted">
            <span className={`h-3 w-3 ${over ? 'bg-danger' : 'bg-fg-muted'}`} /> This order{' '}
            <span className="font-mono tabular-nums text-fg">{thisLoad}</span>
          </span>
          <span className="flex items-center gap-2 text-fg-muted">
            <span className="h-3 w-3 border border-line" /> Most this vehicle may carry{' '}
            <span className="font-mono tabular-nums text-fg">{max}</span> ({vclass?.name})
          </span>
        </div>

        {over && (
          <div className={`mt-3 flex gap-2 border px-3 py-3 text-base ${TONE_CLASS.danger}`}>
            <Alert className="mt-0.5 h-4 w-4 flex-none" />
            <span>
              {total - max} cylinder(s) over the {vclass?.name} limit. The server will reject this
              assignment — capacity is enforced in the API, not in the browser, so it holds however the
              request arrives.
            </span>
          </div>
        )}
      </div>

      {/* ── Load adjustment ──────────────────────────────────────────────── */}
      <div className="mt-5">
        <h3 className="mb-2 text-lg font-semibold text-fg">What goes on the truck</h3>
        <table className="w-full border-collapse border border-line text-base">
          <thead>
            <tr className="border-b border-line bg-surface text-base text-fg">
              <th className="px-3 py-3 text-left font-semibold">Product</th>
              <th className="px-3 py-3 text-right font-semibold">Ordered</th>
              <th className="px-3 py-3 text-center font-semibold">On the truck</th>
            </tr>
          </thead>
          <tbody>
            {order.lines.map((l) => {
              const p = select.product(s, l.productId);
              return (
                <tr key={l.id} className="border-t border-line">
                  <td className="px-3 py-3">
                    <span className="font-medium text-fg">{p?.name}</span>{' '}
                    <span className="text-base text-fg-muted">{p?.size}</span>
                  </td>
                  <td className="px-3 py-3 text-right font-mono tabular-nums text-fg-muted">{l.qtyOrdered}</td>
                  <td className="px-3 py-3">
                    <div className="flex justify-center">
                      <NumberStepper
                        value={loaded[l.id] ?? 0}
                        min={0}
                        max={l.qtyOrdered}
                        onChange={(v: any) =>
                          setLoaded((prev) => ({ ...prev, [l.id]: Math.max(0, asNumber(v)) }))
                        }
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </ModalFrame>
  );
}

// ─── Cancel modal ────────────────────────────────────────────────────────────

const CANCEL_REASONS = [
  'Client cancelled by phone',
  'Stock not available at this location',
  'Duplicate order',
  'Credit hold — account over limit',
  'Vehicle breakdown, rebooking',
];

function CancelModal({ orderId, onClose }: { orderId: number; onClose: () => void }) {
  const s = useStore((st) => st);
  const toast = useRuleToast();
  const order = select.order(s, orderId);
  const [reason, setReason] = useState('');

  if (!order) return null;
  const allowed = canTransition(order.status, 'CANCELLED');

  const submit = () => {
    try {
      api.cancelOrder(order.id, reason.trim());
      toast(`Order #${order.id} cancelled — ${reason.trim()}`, 'success', 'Cancelled');
      onClose();
    } catch (err) {
      const msg = err instanceof RuleError ? err.message : (err as Error).message;
      toast(msg, 'danger', 'Cancellation blocked');
    }
  };

  return (
    <ModalFrame
      title={`Cancel order #${order.id}`}
      subtitle={`${select.clientName(s, order.clientId)} · currently ${STATUS_LABEL[order.status]}`}
      onClose={onClose}
      width="w-[34rem]"
      footer={
        <>
          <Btn kind="ghost" onClick={onClose}>
            Keep the order
          </Btn>
          <Btn kind="danger" onClick={submit} disabled={!allowed || reason.trim().length < 3}>
            Cancel the order
          </Btn>
        </>
      }
    >
      {!allowed ? (
        <div className={`flex gap-2 border px-4 py-3 text-base ${TONE_CLASS.danger}`}>
          <Alert className="mt-0.5 h-5 w-5 flex-none" />
          <span>
            An order at {STATUS_LABEL[order.status]} cannot be cancelled. Once the ECR is allocated the
            document exists and must be closed out through delivery or dispute, never deleted.
          </span>
        </div>
      ) : (
        <>
          <p className="text-base text-fg-muted">
            The order will move to Cancelled and leave the queue. The reason is written to the audit trail
            against your name.
            {order.ecr ? '' : ' No ECR has been issued, so no number is wasted.'}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {CANCEL_REASONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setReason(r)}
                className={`border px-3 py-2 text-base ${
                  reason === r
                    ? 'border-line bg-surface-high font-semibold text-fg'
                    : 'border-line bg-surface text-fg hover:bg-surface-high'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          <textarea
            value={reason}
            autoFocus
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Reason for cancellation (required)"
            className="mt-4 w-full border border-line bg-surface px-3 py-2.5 text-base text-fg placeholder:text-fg-muted focus:border-fg focus:outline-none"
          />
        </>
      )}
    </ModalFrame>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

type Verb = 'fill' | 'assign' | 'dispatch' | 'release' | 'collect';

/** Everything the clerk still has work in front of them for, at one location. */
const QUEUE_STATUSES: OrderStatus[] = ['PLACED', 'FILLED', 'ASSIGNED', 'DISPATCHED'];

/**
 * The one next step for an order — the only button its row ever shows.
 * A delivery walks fill → assign → dispatch. A collection has no vehicle, so it
 * walks fill → release (where the ECR is burned) → record the handover.
 * `null` means there is nothing left for the clerk to do.
 */
function nextAction(order: Order): { verb: Verb; label: string } | null {
  const collects = order.fulfilment === 'collection';
  switch (order.status) {
    case 'PLACED':
      return { verb: 'fill', label: 'Fill' };
    case 'FILLED':
      return collects ? { verb: 'release', label: 'Release' } : { verb: 'assign', label: 'Assign' };
    case 'ASSIGNED':
      return collects ? null : { verb: 'dispatch', label: 'Dispatch' };
    case 'DISPATCHED':
      return collects ? { verb: 'collect', label: 'Record collection' } : null;
    default:
      return null;
  }
}

export function ClerkQueue() {
  const t = useT();
  const s = useStore((st) => st);
  const me = useCurrentUser();
  const toast = useRuleToast();

  // Every order in the demo sits at one location, so the picker was a control
  // that could only ever be set one way. The filter stays, the widget does not.
  const locationId = me.locationId ?? 1;

  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [fillFor, setFillFor] = useState<number | null>(null);
  const [assignFor, setAssignFor] = useState<number | null>(null);
  const [cancelFor, setCancelFor] = useState<number | null>(null);
  const [dispatchFor, setDispatchFor] = useState<number | null>(null);
  const [collectFor, setCollectFor] = useState<number | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);

  const modalOpen =
    fillFor != null || assignFor != null || cancelFor != null || dispatchFor != null || collectFor != null;

  // ── Data ────────────────────────────────────────────────────────────────
  const matches = useCallback(
    (o: Order) => {
      const q = query.trim().toLowerCase();
      if (!q) return true;
      const client = select.client(s, o.clientId);
      const hay = [
        String(o.id),
        o.ecr ?? '',
        client?.name ?? '',
        client?.area ?? '',
        select.route(s, o.routeId)?.code ?? '',
        select.vehicle(s, o.vehicleId)?.registration ?? '',
        ...o.lines.map((l) => select.product(s, l.productId)?.name ?? ''),
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    },
    [query, s],
  );

  /** Deliveries and collections in one list: work first, then oldest first. */
  const atLocation = useMemo(
    () => s.orders.filter((o) => o.locationId === locationId && QUEUE_STATUSES.includes(o.status)),
    [s.orders, locationId],
  );

  const list = useMemo(
    () =>
      atLocation
        .filter(matches)
        .slice()
        .sort(
          (a, b) =>
            (nextAction(a) ? 0 : 1) - (nextAction(b) ? 0 : 1) ||
            a.createdAt.localeCompare(b.createdAt),
        ),
    [atLocation, matches],
  );

  const waiting = useMemo(() => atLocation.filter((o) => nextAction(o)).length, [atLocation]);
  const selected = selectedId == null ? undefined : select.order(s, selectedId);

  // ── Verbs ───────────────────────────────────────────────────────────────
  const openVerb = useCallback(
    (order: Order | undefined, verb: Verb | 'cancel' | undefined) => {
      if (!order) return;
      if (verb === 'fill') {
        if (order.status !== 'PLACED') {
          toast(`Order #${order.id} is ${STATUS_LABEL[order.status]} — only a Placed order can be filled.`, 'warn');
          return;
        }
        setFillFor(order.id);
      } else if (verb === 'assign') {
        // A collection has nothing to assign. Say so here rather than letting a
        // clerk put a client's own pickup on an MCL truck.
        if (order.fulfilment === 'collection') {
          toast(
            `Order #${order.id} is a self-collection — the client's own van is coming for it. There is no vehicle, route or driver to assign; release it for collection instead.`,
            'warn',
            'No vehicle needed',
          );
          return;
        }
        // ASSIGNED → ASSIGNED is not a legal transition, so re-assignment is not
        // offered. Say why rather than letting the state machine throw.
        if (order.status === 'ASSIGNED') {
          toast(
            `Order #${order.id} is already assigned. The state machine has no ASSIGNED → ASSIGNED step — cancel and re-raise it to move the load to another vehicle.`,
            'warn',
            'Re-assignment not permitted',
          );
          return;
        }
        if (order.status !== 'FILLED') {
          toast(`Fill order #${order.id} before assigning a vehicle.`, 'warn');
          return;
        }
        setAssignFor(order.id);
      } else if (verb === 'dispatch') {
        if (order.status !== 'ASSIGNED') {
          toast(`Order #${order.id} must be Assigned before dispatch can allocate an ECR.`, 'warn');
          return;
        }
        setDispatchFor(order.id);
      } else if (verb === 'release') {
        // Releasing a delivery is refused by the store, and the refusal is
        // worth reading — so call it and show what comes back.
        if (order.fulfilment !== 'collection') {
          try {
            api.releaseForCollection(order.id);
          } catch (err) {
            const msg = err instanceof RuleError ? err.message : (err as Error).message;
            const rule = err instanceof RuleError ? err.rule : 'ERROR';
            toast(msg, 'danger', `Release refused — ${rule}`);
          }
          return;
        }
        if (order.ecr) {
          toast(
            `Order #${order.id} already carries ECR ${order.ecr} — it is released and waiting for the client's van. Record the collection when they arrive.`,
            'warn',
            'Already released',
          );
          return;
        }
        if (order.status === 'PLACED') {
          toast(`Fill order #${order.id} before releasing it — the counter has to know what goes out.`, 'warn');
          return;
        }
        setDispatchFor(order.id);
      } else if (verb === 'collect') {
        if (order.fulfilment !== 'collection') {
          toast(
            `Order #${order.id} is going out on a vehicle — the driver records that delivery on the tab, not the counter.`,
            'warn',
            'Not a collection',
          );
          return;
        }
        if (order.status !== 'DISPATCHED') {
          toast(
            `Order #${order.id} has not been released yet. Release it for collection first — that is where the ECR is allocated.`,
            'warn',
          );
          return;
        }
        setCollectFor(order.id);
      } else if (verb === 'cancel') {
        setCancelFor(order.id);
      }
    },
    [toast],
  );

  // ── Keyboard ────────────────────────────────────────────────────────────
  // Unchanged. The legend that used to advertise it at the bottom is gone.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing = !!el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName);
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === '/' && !typing) {
        e.preventDefault();
        searchRef.current?.focus();
        return;
      }
      if (e.key === 'Escape' && typing) {
        (el as HTMLInputElement).blur();
        return;
      }
      if (typing || modalOpen) return;

      if (e.key === 'Escape') {
        setDetailOpen(false);
        return;
      }
      if (e.key === 'ArrowDown' || e.key === 'j' || e.key === 'ArrowUp' || e.key === 'k') {
        if (!list.length) return;
        e.preventDefault();
        const dir = e.key === 'ArrowDown' || e.key === 'j' ? 1 : -1;
        const i = list.findIndex((o) => o.id === selectedId);
        const next = i === -1 ? 0 : Math.min(list.length - 1, Math.max(0, i + dir));
        setSelectedId(list[next].id);
        return;
      }
      if (e.key === 'Enter') {
        if (selectedId != null) {
          e.preventDefault();
          setDetailOpen(true);
        }
        return;
      }
      const k = e.key.toLowerCase();
      if (k === 'f') openVerb(selected, 'fill');
      else if (k === 'a') openVerb(selected, 'assign');
      else if (k === 'd') openVerb(selected, 'dispatch');
      else if (k === 'r') openVerb(selected, 'release');
      else if (k === 'h') openVerb(selected, 'collect');
      else if (k === 'c') openVerb(selected, 'cancel');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [list, selectedId, selected, openVerb, modalOpen]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-surface">
      {/* ── Title, one sentence, one search box ──────────────────────────── */}
      <header className="flex-none border-b border-line bg-surface px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold leading-tight text-fg">{t('Dispatch queue')}</h1>
            <p className="text-base text-fg-muted">{waiting === 1 ? t('One order waiting') : t('{n} orders waiting', { n: waiting })}</p>
          </div>

          <div className="relative ms-auto">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('Search')}
              aria-label={t('Search')}
              className="w-72 border border-line bg-surface px-3 py-2 ps-10 text-base text-fg placeholder:text-fg-muted focus:border-fg focus:outline-none"
            />
          </div>
        </div>
      </header>

      {/* ── One list. One button per row. ────────────────────────────────── */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        <OrderTable
          orders={list}
          dense
          selectedId={selectedId}
          onSelect={(o) => {
            setSelectedId(o.id);
            setDetailOpen(true);
          }}
          columns={['client', 'lines', 'status', 'value']}
          empty={t('Nothing in the queue.')}
          rowActions={(o) => {
            const next = nextAction(o);
            if (!next) return null;
            return (
              <Btn
                kind="secondary"
                onClick={() => {
                  setSelectedId(o.id);
                  openVerb(o, next.verb);
                }}
              >
                {t(next.label)}
              </Btn>
            );
          }}
        />
      </div>

      {/* ── Overlays ─────────────────────────────────────────────────────── */}
      {detailOpen && selected && (
        <OrderDetail
          orderId={selected.id}
          onClose={() => setDetailOpen(false)}
          actions={
            <div className="flex items-center justify-end gap-2">
              {canTransition(selected.status, 'CANCELLED') && (
                <Btn kind="ghost" onClick={() => openVerb(selected, 'cancel')}>
                  {t('Cancel')}
                </Btn>
              )}
              {(() => {
                const next = nextAction(selected);
                if (!next) return null;
                return (
                  <Btn kind="primary" onClick={() => openVerb(selected, next.verb)}>
                    {t(next.label)}
                  </Btn>
                );
              })()}
            </div>
          }
        />
      )}

      {fillFor != null && <FillModal key={`fill-${fillFor}`} orderId={fillFor} onClose={() => setFillFor(null)} />}
      {assignFor != null && (
        <AssignModal key={`assign-${assignFor}`} orderId={assignFor} onClose={() => setAssignFor(null)} />
      )}
      {cancelFor != null && (
        <CancelModal key={`cancel-${cancelFor}`} orderId={cancelFor} onClose={() => setCancelFor(null)} />
      )}
      <DispatchModal
        orderId={dispatchFor}
        onClose={() => setDispatchFor(null)}
        onDispatched={(_ecr, id) => setSelectedId(id)}
      />
      <CollectionModal
        orderId={collectFor}
        onClose={() => setCollectFor(null)}
        onCollected={(id) => setSelectedId(id)}
      />
    </div>
  );
}

export default ClerkQueue;
