// ─── TabLogin ────────────────────────────────────────────────────────────────
// Tabs are shared company property; accountability is not shared. Nobody gets a
// manifest until a named driver has claimed a named device, and that claim is
// written to the audit trail (api.checkOutTab).

import { useMemo, useState } from 'react';
import { api, select } from '../../core/store';
import { Check, Lock, Truck, Clipboard, Alert } from '../../ui/icons';
import { useT } from '../../i18n';
import {
  Btn,
  Chip,
  Sheet,
  useAll,
  useGuard,
  useNotify,
  type Session,
} from './index';

export default function TabLogin({ onSession }: { onSession: (s: Session) => void }) {
  const s = useAll();
  const t = useT();
  const guard = useGuard();
  const notify = useNotify();

  const drivers = s.users.filter((u) => u.role === 'driver');

  /** Live stops per driver — so the gate can see who actually has a load today. */
  const loadFor = useMemo(() => {
    const m = new Map<number, { stops: number; cylinders: number; route?: string }>();
    for (const d of drivers) {
      const stops = select.driverManifest(s, d.id);
      m.set(d.id, {
        stops: stops.length,
        cylinders: stops.reduce(
          (x, o) => x + o.lines.reduce((y, l) => y + (l.qtyLoaded ?? l.qtyOrdered), 0),
          0,
        ),
        route: select.route(s, stops[0]?.routeId)?.code,
      });
    }
    return m;
  }, [s, drivers]);

  // Open on the driver who actually has a manifest waiting — never an empty screen.
  const defaultDriver =
    drivers.find((d) => (loadFor.get(d.id)?.stops ?? 0) > 0)?.id ?? drivers[0]?.id ?? null;

  const [driverId, setDriverId] = useState<number | null>(defaultDriver);
  const [deviceId, setDeviceId] = useState<number | null>(
    s.tabDevices.find((d) => d.active && !d.checkedOutBy)?.id ?? null,
  );
  const [confirmOpen, setConfirmOpen] = useState(false);

  const driver = drivers.find((d) => d.id === driverId);
  const device = s.tabDevices.find((d) => d.id === deviceId);
  const summary = driverId != null ? loadFor.get(driverId) : undefined;

  function startShift() {
    if (driverId == null || deviceId == null) return;

    // "Logging in" on a shared tab IS switching the acting user: every
    // subsequent api.* call is authorised and audited as this driver.
    const ok = guard(() => {
      api.switchUser(driverId);
      api.checkOutTab(deviceId, driverId);
      return true;
    });
    if (!ok) return;

    setConfirmOpen(false);
    notify(
      'success',
      t('{driver} signed in on {device}', { driver: driver?.name ?? '', device: device?.label ?? '' }),
      t('Check-out logged. Every drop recorded on this tab now carries this driver and this device.'),
    );
    onSession({ driverId, deviceId, startedAt: new Date().toISOString() });
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto bg-app">
      <div className="mx-auto w-full max-w-[920px] px-8 py-7">
        <div className="mb-6 flex items-end justify-between gap-4 border-b border-line pb-5">
          <div>
            <div className="text-md font-semibold text-fg-muted">
              {t('MCL Delivery')} · {t('Driver Tab')}
            </div>
            <h1 className="mt-1 text-3xl font-semibold text-fg">{t('Start of shift')}</h1>
            <p className="mt-2 max-w-[600px] text-md text-fg-muted">
              {t('This tablet is shared. Sign in against your own name and take one device — the check-out is written to the audit trail, so every cylinder and every rupee captured today traces back to a person.')}
            </p>
          </div>
          <div className="hidden shrink-0 items-center gap-2 rounded-md border border-line bg-surface px-3 py-2 text-md text-fg-muted sm:flex">
            <Lock className="h-5 w-5 text-fg-dim" />
            {t('Gate handover')}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* ── Who ──────────────────────────────────────────────────────── */}
          <section>
            <SectionLabel n={1} title={t('Who is driving')} />
            <div className="space-y-2.5">
              {drivers.map((d) => {
                const info = loadFor.get(d.id);
                const active = d.id === driverId;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setDriverId(d.id)}
                    className={
                      // Selected = black border and a black initials box.
                      // No orange fill: the accent belongs to the one button
                      // that starts the shift.
                      'flex w-full items-center gap-4 rounded-md border bg-surface px-4 py-4 text-start ' +
                      (active ? 'border-fg' : 'border-line')
                    }
                  >
                    <div
                      className={
                        'flex h-14 w-14 shrink-0 items-center justify-center rounded-md border text-md font-semibold ' +
                        (active ? 'border-fg bg-fg text-fg-inverse' : 'border-line text-fg-muted')
                      }
                    >
                      {d.avatarInitials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-lg font-semibold text-fg">{d.name}</div>
                      <div className="mt-0.5 flex items-center gap-2 text-md text-fg-muted">
                        {info && info.stops > 0 ? (
                          <>
                            <Truck className="h-4 w-4 text-fg-dim" />
                            <span className="tabular-nums">
                              {t('{stops} stops · {cylinders} cylinders', {
                                stops: info.stops,
                                cylinders: info.cylinders,
                              })}
                            </span>
                            {/* Route code: an operational identifier, left Latin. */}
                            {info.route && <span className="font-mono text-fg-dim">{info.route}</span>}
                          </>
                        ) : (
                          <span className="text-fg-dim">{t('No live manifest today')}</span>
                        )}
                      </div>
                    </div>
                    {active && <Check className="h-6 w-6 shrink-0 text-fg" />}
                  </button>
                );
              })}
            </div>
          </section>

          {/* ── Which device ─────────────────────────────────────────────── */}
          <section>
            <SectionLabel n={2} title={t('Which tab')} />
            <div className="space-y-2.5">
              {s.tabDevices.map((d) => {
                const holder = d.checkedOutBy ? select.user(s, d.checkedOutBy) : undefined;
                const heldByOther = !!d.checkedOutBy && d.checkedOutBy !== driverId;
                const blocked = !d.active || heldByOther;
                const active = d.id === deviceId;
                return (
                  <button
                    key={d.id}
                    type="button"
                    disabled={blocked}
                    onClick={() => setDeviceId(d.id)}
                    className={
                      'flex w-full items-center gap-4 rounded-md border bg-surface px-4 py-4 text-start ' +
                      (blocked
                        ? 'cursor-not-allowed border-line text-fg-dim'
                        : active
                          ? 'border-fg'
                          : 'border-line')
                    }
                  >
                    <div
                      className={
                        'flex h-14 w-14 shrink-0 items-center justify-center rounded-md border ' +
                        (active ? 'border-fg bg-fg text-fg-inverse' : 'border-line text-fg-dim')
                      }
                    >
                      <Clipboard className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      {/* Device label + hardware id: asset tags, never translated. */}
                      <div className="truncate text-lg font-semibold text-fg">{d.label}</div>
                      <div className="mt-0.5 font-mono text-md text-fg-dim">{d.deviceId}</div>
                    </div>
                    {!d.active ? (
                      <Chip tone="danger">{t('Out of service')}</Chip>
                    ) : heldByOther ? (
                      <Chip tone="warn">{t('Held by {name}', { name: holder?.name ?? '' })}</Chip>
                    ) : d.checkedOutBy ? (
                      <Chip tone="info">{t('Yours')}</Chip>
                    ) : (
                      <Chip tone="success">{t('Available')}</Chip>
                    )}
                  </button>
                );
              })}
            </div>

            <p className="mt-4 flex items-start gap-2 text-base text-fg-dim">
              <Alert className="mt-0.5 h-5 w-5 shrink-0" />
              {t('A tab already checked out to someone else is refused at the API, not hidden in the UI — try it and the rule speaks for itself.')}
            </p>
          </section>
        </div>

        {/* ── Go ─────────────────────────────────────────────────────────── */}
        <div className="mt-7 flex flex-wrap items-center justify-between gap-4 rounded-md border border-line bg-surface p-5">
          <div className="text-md text-fg-muted">
            {driver && device ? (
              summary && summary.stops > 0 ? (
                t('{driver} takes {device} — {stops} stops on {route}, {cylinders} cylinders on board.', {
                  driver: driver.name,
                  device: device.label,
                  stops: summary.stops,
                  route: summary.route ?? '—',
                  cylinders: summary.cylinders,
                })
              ) : (
                t('{driver} takes {device} — no stops assigned yet today.', {
                  driver: driver.name,
                  device: device.label,
                })
              )
            ) : (
              t('Pick a driver and a tab to begin.')
            )}
          </div>
          <Btn
            variant="primary"
            size="lg"
            disabled={driverId == null || deviceId == null}
            onClick={() => setConfirmOpen(true)}
            className="min-h-[60px] px-8 text-lg"
          >
            {t('Check out tab & start shift')}
          </Btn>
        </div>
      </div>

      <Sheet
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={t('Check out this tab?')}
        footer={
          <div className="flex justify-end gap-2">
            <Btn variant="ghost" size="lg" onClick={() => setConfirmOpen(false)}>
              {t('Cancel')}
            </Btn>
            <Btn variant="primary" size="lg" onClick={startShift}>
              {t('Confirm check-out')}
            </Btn>
          </div>
        }
      >
        <div className="space-y-4 text-md text-fg-muted">
          <p>
            {t('The system will bind {device} to {driver} until it is checked back in, block anyone else from claiming it, and stamp this driver onto every delivery captured on the device.', {
              device: device?.label ?? '—',
              driver: driver?.name ?? '—',
            })}
          </p>
          <p className="rounded-md border border-line bg-surface p-4 text-base">
            {t('This is the accountability link the paper ECR book never had: device → driver → drop → cash.')}
          </p>
        </div>
      </Sheet>
    </div>
  );
}

function SectionLabel({ n, title }: { n: number; title: string }) {
  return (
    <div className="mb-3 flex items-center gap-2.5">
      <span className="flex h-7 w-7 items-center justify-center rounded-full border border-line text-base font-semibold text-fg-muted">
        {n}
      </span>
      <h2 className="text-lg font-semibold text-fg">{title}</h2>
    </div>
  );
}
