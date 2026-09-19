// ─── Driver Tab ──────────────────────────────────────────────────────────────
// The offline-first delivery app that runs on a shared company tablet.
//
// Layout contract: the shell hands us a landscape content area (~1024×768)
// inside a TabletFrame. We render no device chrome of our own.
//
// This file also hosts the small shared layer used by the sibling screens:
//   • short aliases for the design-system primitives this folder uses
//   • the toast/rule-error helper every api.* call funnels through
//   • direction helpers (mirrored chevrons)
//   • pure read helpers (no business logic — every mutation goes through api.*)
//
// Sibling screens import those from './index'. The resulting import cycle is
// safe: nothing here is referenced at module-evaluation time, only inside
// component bodies.
//
// Theme note: this folder consumes SEMANTIC tokens only (bg-surface, text-fg,
// border-line, warn/success/danger/info). The palette behind those names is
// light; the names and roles are unchanged, so nothing here encodes a
// background brightness. The one deliberate exception is ReceiptPreview, which
// is literal white paper with black ink because it is paper, not a surface.
//
// Plain-UI rule for this folder: white surfaces, one hairline border for
// separation, whitespace for grouping. No shadows, gradients, stripes, blur,
// decorative rings or stacked surface tints. Colour appears only where it
// carries state a driver must act on — offline vs online, not sent vs sent,
// short delivery, dispute — and it is always paired with a word, never a dot
// or a tint on its own. Text is sized to be read outdoors at arm's length:
// nothing below `text-base`, and numbers the driver acts on are larger again.

import { useCallback, useMemo, useState } from 'react';
import type { Order, OrderLine } from '../../core/types';
import {
  useStore,
  api,
  select,
  RuleError,
  orderCylinders,
  type State,
} from '../../core/store';
import {
  Button,
  Badge,
  NumberStepper,
  Select,
  Textarea,
  Modal,
  Drawer,
  useToast,
  EmptyState,
  SignaturePad,
  Money,
  Qty,
  EcrTag,
} from '../../ui/primitives';
import { WifiOff, Wifi, Sync, Logout, ChevronLeft, ChevronRight } from '../../ui/icons';
import { useI18n, useT } from '../../i18n';

import TabLogin from './TabLogin';
import ManifestList from './Manifest';
import StopDetail from './StopDetail';
import SyncStatus from './SyncStatus';

// ─── Design-system aliases ───────────────────────────────────────────────────
// Short local names for the primitives this folder leans on, bound to the real
// components in `src/ui/primitives.tsx`. Two are genuine wrappers (`Ecr`,
// `Pick`) because they adapt a call shape; the rest are plain aliases so the
// whole folder reconciles from one import list.

export const Btn = Button;
export const Chip = Badge;
export const Sheet = Modal;
export const SidePanel = Drawer;
export const Blank = EmptyState;
export const TextArea = Textarea;
export const Stepper = NumberStepper;
export const Sig = SignaturePad;
/** PKR display. The contract pins this shape: `<Money value={n} />`. */
export const PKR = Money;
export const QtyN = Qty;

/** ECR tag with an explicit "not allocated yet" state — orders carry no ECR
 *  until the clerk dispatches, and the tab must never imply otherwise.
 *  The ECR value itself is never translated: it is an Oracle document number. */
export function Ecr({ value }: { value: string | null | undefined }) {
  const t = useT();
  if (!value) return <span className="font-mono text-fg-dim">{t('not allocated')}</span>;
  return <EcrTag ecr={value} />;
}

/** Select that hands back the value, sized for a gloved thumb. */
export function Pick(props: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <Select
      size="lg"
      value={props.value}
      disabled={props.disabled}
      className={props.className}
      onChange={(e) => props.onChange(e.target.value)}
    >
      {props.children}
    </Select>
  );
}

// ─── Direction ───────────────────────────────────────────────────────────────

/**
 * Chevrons that point the way the reader is going.
 *
 * `Back` points at the edge the reader came from and `Forward` at the edge they
 * are heading to, which is the opposite pair under RTL. Everything else in this
 * folder mirrors through logical properties (ms-/me-/ps-/pe-/start-/end-), so
 * glyphs are the only thing needing an explicit swap.
 */
export function useDirIcons() {
  const { dir } = useI18n();
  return dir === 'rtl'
    ? { Back: ChevronRight, Forward: ChevronLeft }
    : { Back: ChevronLeft, Forward: ChevronRight };
}

// The offline state used to be painted with a diagonal hazard-stripe overlay.
// It is now a plain bordered bar that says "Offline" in words, at the top of
// the screen and again on the sync panel. A driver should not have to decode a
// texture; a stripe pattern also carries no meaning to a screen reader, and it
// was the first thing to disappear on a sunlit screen.

// ─── Toast / rule-error plumbing ─────────────────────────────────────────────

export type Tone = 'success' | 'danger' | 'info' | 'warn';

/**
 * One funnel for every api.* result. Rejections are a demo feature: a RuleError
 * surfaces its message *and* the invariant that produced it.
 */
export function useNotify() {
  const toast = useToast();
  return useCallback(
    (tone: Tone, title: string, description?: string) => {
      if (tone === 'danger') return void toast.error(title, description);
      if (tone === 'warn') return void toast.warn(title, description);
      if (tone === 'success') return void toast.success(title, description);
      return void toast.info(title, description);
    },
    [toast],
  );
}

/** Wrap any api.* call. Returns the value, or undefined if a rule rejected it. */
export function useGuard() {
  const notify = useNotify();
  const t = useT();
  return useCallback(
    <T,>(fn: () => T, onOk?: (v: T) => void): T | undefined => {
      try {
        const v = fn();
        onOk?.(v);
        return v;
      } catch (err) {
        // The message and the rule name come from core/store in English and are
        // not ours to translate — the rule identifier especially is a symbol the
        // office quotes verbatim. Only the framing label is localised.
        if (err instanceof RuleError) notify('danger', err.message, t('Rejected by rule: {rule}', { rule: err.rule }));
        else notify('danger', err instanceof Error ? err.message : t('Unexpected error.'));
        return undefined;
      }
    },
    [notify, t],
  );
}

// ─── Read helpers (pure — no state writes live here) ─────────────────────────

/**
 * Subscribe to the whole store.
 *
 * Deliberate: `emit()` replaces the state object on every change but mutates
 * nested records in place, so a narrow selector such as `s => s.orders` returns
 * a stable reference and would miss status changes. Selectors that build a new
 * array (`select.driverManifest`) break `useSyncExternalStore`'s snapshot
 * caching instead. Subscribing to the root object is the one shape that is both
 * correct and loop-free; derived lists are computed in render.
 */
export function useAll(): State {
  return useStore((s) => s);
}

export const loadedOf = (l: OrderLine) => l.qtyLoaded ?? l.qtyOrdered;
export const loadOf = (o: Order) => o.lines.reduce((s, l) => s + loadedOf(l), 0);

/** Value of what is actually being dropped, by line. */
export function valueOf(order: Order, delivered: Record<number, number>): number {
  return order.lines.reduce((s, l) => s + (delivered[l.id] ?? 0) * l.unitPrice, 0);
}

/** Cash the driver should collect at this stop. Credit clients: always zero. */
export function cashDue(
  s: State,
  order: Order,
  delivered?: Record<number, number>,
): { amount: number; credit: boolean } {
  const client = select.client(s, order.clientId);
  const credit = client?.paymentTerms === 'credit';
  if (credit) return { amount: 0, credit: true };
  const amount = delivered
    ? valueOf(order, delivered)
    : order.lines.reduce((t, l) => t + loadedOf(l) * l.unitPrice, 0);
  return { amount, credit: false };
}

export const shortRef = (ref: string) => ref.slice(0, 8);

/** Clock stays en-GB: the tab shows Latin digits in both languages, because the
 *  office reconciles against these times and drivers read plate-style numerals. */
export function clock(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export function stopSeq(s: State, o: Order): number {
  return s.routeStops.find((rs) => rs.routeId === o.routeId && rs.clientId === o.clientId)?.sequenceNo ?? 99;
}

/** Sync state of a stop, derived from the device outbox. */
export type StopSync = 'none' | 'pending' | 'syncing' | 'synced';
export function syncStateOf(s: State, orderId: number): StopSync {
  const mine = s.queue.filter((q) => q.orderId === orderId);
  if (!mine.length) {
    return s.deliveryEvents.some((d) => d.orderId === orderId) ? 'synced' : 'none';
  }
  if (mine.some((q) => q.state === 'pending' || q.state === 'failed')) return 'pending';
  if (mine.some((q) => q.state === 'syncing')) return 'syncing';
  return 'synced';
}

/** Reason codes. `value` is the wire symbol and never translates; `label` is an
 *  English source string used as the translation key at the point of render. */
export const REASON_CODES: { value: string; label: string }[] = [
  { value: 'SHORT_DELIVERY', label: 'Short delivery — stock ran out on the vehicle' },
  { value: 'CLIENT_REFUSED', label: 'Client refused part of the load' },
  { value: 'DAMAGED_CYLINDER', label: 'Cylinder damaged / valve leaking' },
  { value: 'CLIENT_NOT_READY', label: 'Client not ready to receive' },
  { value: 'ACCESS_DENIED', label: 'No site access at the gate' },
  { value: 'WRONG_PRODUCT', label: 'Wrong product loaded at the plant' },
];

export interface Session {
  driverId: number;
  deviceId: number;
  startedAt: string;
}

// ─── The tab ─────────────────────────────────────────────────────────────────

export default function DriverTab() {
  const s = useAll();
  const t = useT();
  const notify = useNotify();
  const guard = useGuard();

  const [session, setSession] = useState<Session | null>(null);
  const [openOrderId, setOpenOrderId] = useState<number | null>(null);
  /** Stops finished in this session — they leave driverManifest() on CONFIRMED. */
  const [done, setDone] = useState<number[]>([]);
  const [syncOpen, setSyncOpen] = useState(false);
  const [endShiftOpen, setEndShiftOpen] = useState(false);

  const driverId = session?.driverId ?? null;

  const stops = useMemo(() => {
    if (driverId == null) return [];
    const base = select.driverManifest(s, driverId);
    const carried = s.orders.filter(
      (o) => o.driverId === driverId && done.includes(o.id) && !base.some((b) => b.id === o.id),
    );
    return [...base, ...carried].sort((a, b) => stopSeq(s, a) - stopSeq(s, b));
  }, [s, driverId, done]);

  // Fall back to the raw order so the detail pane can never blink away in the
  // one frame between a confirmation landing and `done` catching up.
  const openOrder =
    stops.find((o) => o.id === openOrderId) ??
    s.orders.find((o) => o.id === openOrderId && o.driverId === driverId) ??
    null;
  const route = openOrder ? select.route(s, openOrder.routeId) : select.route(s, stops[0]?.routeId);
  const vehicle = openOrder ? select.vehicle(s, openOrder.vehicleId) : select.vehicle(s, stops[0]?.vehicleId);
  const device = s.tabDevices.find((t2) => t2.id === session?.deviceId);
  const driver = select.user(s, driverId ?? undefined);

  const pendingCount = s.queue.filter((q) => q.state === 'pending' || q.state === 'failed').length;
  const markDone = useCallback((orderId: number) => {
    setDone((d) => (d.includes(orderId) ? d : [...d, orderId]));
  }, []);

  function toggleOnline(next: boolean) {
    guard(() => api.setOnline(next));
    if (next) {
      notify(
        'info',
        t('Back online — replaying the outbox'),
        t('Each action is matched on its client_ref, so nothing applies twice.'),
      );
    } else {
      notify(
        'warn',
        t('Offline mode'),
        t('Deliveries still record instantly. They queue on this tab until signal returns.'),
      );
    }
  }

  function syncNow() {
    if (!s.online) {
      notify('warn', t('Still offline'), t('Nothing can leave the tab until you are back on a network.'));
      return;
    }
    void api.syncNow();
  }

  function endShift() {
    if (!session) return;
    const ok = guard(() => {
      api.checkInTab(session.deviceId);
      return true;
    });
    if (!ok) return;
    setEndShiftOpen(false);
    setSession(null);
    setOpenOrderId(null);
    setDone([]);
    notify(
      'success',
      t('Tab checked in'),
      t('The device is back at the gate. The audit trail keeps your name on every drop.'),
    );
  }

  // ── Not logged in: shared device, so identity comes first ────────────────
  if (!session) {
    return (
      <div className="flex h-full min-h-[600px] flex-col bg-app text-fg">
        <TabLogin onSession={setSession} />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-[600px] flex-col bg-app text-fg">
      {/* Offline bar. A full-width strip that says the word, plus how many
          actions are waiting. No stripes, no texture — a driver glancing at
          the top of the screen reads "Offline" and a number. */}
      {!s.online && (
        <div className="flex w-full shrink-0 items-center gap-3 border-b border-warn bg-warn-soft px-4 py-3 text-warn-fg">
          <WifiOff className="h-6 w-6 shrink-0" />
          <span className="text-md font-semibold">{t('Offline — capturing to this tab')}</span>
          {pendingCount > 0 && (
            <span className="ms-auto text-md tabular-nums">
              {pendingCount} {t('queued')}
            </span>
          )}
        </div>
      )}

      {/* ── Header: who, and what network ─────────────────────────────────
          The route / vehicle / on-board trio that used to sit here said the
          same three things as the manifest header two centimetres below it,
          and the device asset tag under the driver's name said nothing a
          driver needs mid-run. Both are gone. */}
      <header className="flex shrink-0 items-center gap-4 border-b border-line bg-surface px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-line text-md font-semibold text-fg">
            {driver?.avatarInitials}
          </div>
          <div className="min-w-0 truncate text-md font-semibold leading-tight">{driver?.name}</div>
        </div>

        <div className="ms-auto flex items-center gap-2">
          {/* Network switch. One word. The "tap to go offline" instruction
              under it is gone — a bordered button with a radio icon does not
              need to be told it is tappable. Colour is the state, the word
              carries it. */}
          <button
            type="button"
            onClick={() => toggleOnline(!s.online)}
            className={
              'flex min-h-[52px] items-center gap-3 rounded-md border px-4 text-start ' +
              (s.online
                ? 'border-line bg-surface text-fg'
                : 'border-warn bg-warn-soft text-warn-fg')
            }
          >
            {s.online ? <Wifi className="h-6 w-6 shrink-0" /> : <WifiOff className="h-6 w-6 shrink-0" />}
            <span className="text-md font-semibold">{s.online ? t('Online') : t('Offline')}</span>
          </button>

          <button
            type="button"
            onClick={() => setSyncOpen(true)}
            className={
              'flex min-h-[52px] items-center gap-3 rounded-md border px-4 ' +
              (pendingCount > 0 ? 'border-warn bg-warn-soft text-warn-fg' : 'border-line bg-surface text-fg')
            }
          >
            <Sync className="h-6 w-6 shrink-0" />
            <span className="leading-tight">
              {/* Latin digits in both languages — see clock(). */}
              <span className="block text-xl font-semibold tabular-nums">{pendingCount}</span>
              <span className="block text-base">{t('queued')}</span>
            </span>
          </button>

          <Btn variant="secondary" size="lg" onClick={() => setEndShiftOpen(true)} className="min-h-[52px]">
            <span className="flex items-center gap-2">
              <Logout className="h-5 w-5" /> {t('End shift')}
            </span>
          </Btn>
        </div>
      </header>

      {/* ── Body: manifest rail + working pane ─────────────────────────────
          Plain flex row with no explicit side: under RTL the rail lands on the
          right because it is first in the DOM, which is exactly where an Urdu
          reader starts. The rail's own divider uses border-e, so it stays on
          the inner edge either way. */}
      <main className="flex min-h-0 flex-1">
        <ManifestList
          stops={stops}
          openOrderId={openOrderId}
          onOpen={setOpenOrderId}
          route={route}
          vehicle={vehicle}
        />

        <section className="min-w-0 flex-1 overflow-y-auto bg-app">
          {openOrder ? (
            <StopDetail
              key={openOrder.id}
              order={openOrder}
              session={session}
              onBack={() => setOpenOrderId(null)}
              onDone={markDone}
              onOpenSync={() => setSyncOpen(true)}
            />
          ) : (
            <div className="p-5">
              <SyncStatus
                variant="panel"
                onToggleOnline={toggleOnline}
                onSyncNow={syncNow}
                driverId={session.driverId}
              />
            </div>
          )}
        </section>
      </main>

      {/* ── Outbox drawer — reachable from anywhere ──────────────────────── */}
      <SidePanel
        open={syncOpen}
        onClose={() => setSyncOpen(false)}
        title={t('Device outbox')}
        subtitle={t('Everything captured on this tab, and what the server has acknowledged')}
        width="32rem"
      >
        <div className="p-4">
          <SyncStatus
            variant="drawer"
            onToggleOnline={toggleOnline}
            onSyncNow={syncNow}
            driverId={session.driverId}
          />
        </div>
      </SidePanel>

      <Sheet
        open={endShiftOpen}
        onClose={() => setEndShiftOpen(false)}
        title={t('End shift and check the tab in?')}
        footer={
          <div className="flex justify-end gap-2">
            <Btn variant="ghost" size="lg" onClick={() => setEndShiftOpen(false)}>
              {t('Keep working')}
            </Btn>
            <Btn variant="primary" size="lg" onClick={endShift}>
              {t('Check tab in')}
            </Btn>
          </div>
        }
      >
        <div className="space-y-4 text-md text-fg-muted">
          <p>
            {t('The system will release {device} back to the gate pool and write a check-in line to the audit trail against {driver}.', {
              device: device?.label ?? '—',
              driver: driver?.name ?? '—',
            })}
          </p>
          {pendingCount > 0 ? (
            <p className="rounded-md border border-danger bg-danger-soft p-4 text-danger-fg">
              {t('{n} actions are still queued on this tab. They stay on the device and replay on the next sync — but the gate cashier cannot reconcile your cash until they land.', { n: pendingCount })}
            </p>
          ) : (
            <p className="rounded-md border border-success bg-success-soft p-4 text-success-fg">
              {t('Outbox is empty. Everything captured on this tab is on the server.')}
            </p>
          )}
        </div>
      </Sheet>
    </div>
  );
}
