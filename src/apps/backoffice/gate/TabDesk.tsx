// ─── Gate tab desk ───────────────────────────────────────────────────────────
// Drivers do not own tablets — they draw one from the gate each morning and
// return it at night. Every delivery captured on a tab carries its device id,
// so "which device recorded this delivery, in whose hands" is answerable.

import { useMemo, useState } from 'react';
import { api, useStore, useCurrentUser, select, RuleError } from '../../../core/store';
import type { TabDevice } from '../../../core/types';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Badge,
  Select,
  Field,
  Modal,
  Avatar,
  SectionTitle,
  Timestamp,
  EmptyState,
  useToast,
} from '../../../ui/primitives';
import * as Icons from '../../../ui/icons';
import { useT } from '../../../i18n';

export default function TabDesk() {
  const s = useStore((x) => x);
  const me = useCurrentUser();
  const toast = useToast();

  const t = useT();

  const [pending, setPending] = useState<
    { kind: 'out'; device: TabDevice; driverId: number } | { kind: 'in'; device: TabDevice } | null
  >(null);
  const [draftDriver, setDraftDriver] = useState<Record<number, number>>({});

  const drivers = useMemo(() => s.users.filter((u) => u.role === 'driver'), [s.users]);
  const devices = s.tabDevices;
  const out = devices.filter((d) => d.checkedOutBy);
  const idle = devices.filter((d) => !d.checkedOutBy && d.active);

  function run(fn: () => void, okTitle: string, okBody: string) {
    try {
      fn();
      toast.success(okTitle, okBody);
    } catch (e) {
      if (e instanceof RuleError) toast.error(`Rejected — ${e.rule}`, e.message);
      else toast.error('Rejected', e instanceof Error ? e.message : String(e));
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="mx-auto max-w-[1100px] px-6 py-6">
      <header className="mb-5">
        <h1 className="text-xl font-semibold tracking-tight text-fg">{t('Tab desk')}</h1>
        <p className="mt-1 text-base text-fg-muted">
          Issue and return the shared driver tablets. {out.length} of {devices.length} are out with
          drivers right now.
        </p>
      </header>

      <div className="mb-5 grid grid-cols-3 gap-3">
        <Counter label={t('Out with drivers')} value={out.length} tone="warn" />
        <Counter label={t('On the rack')} value={idle.length} tone="success" />
        <Counter label={t('Out of service')} value={devices.filter((d) => !d.active).length} tone="neutral" />
      </div>

      <SectionTitle subtitle="Every check-out is written to the audit trail against your name.">
        {t('Devices')}
      </SectionTitle>

      {devices.length === 0 ? (
        <EmptyState title="No tablets registered" description="Add devices in the admin console." />
      ) : (
        <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {devices.map((d) => {
            const holder = select.user(s, d.checkedOutBy);
            const chosen = draftDriver[d.id] ?? drivers[0]?.id ?? 0;
            return (
              <Card key={d.id}>
                <CardHeader
                  title={d.label}
                  subtitle={<span className="font-mono text-base">{d.deviceId}</span>}
                  action={
                    !d.active ? (
                      <Badge tone="neutral">Out of service</Badge>
                    ) : d.checkedOutBy ? (
                      <Badge tone="warn" dot>
                        Checked out
                      </Badge>
                    ) : (
                      <Badge tone="success" dot>
                        Available
                      </Badge>
                    )
                  }
                />
                <CardBody>
                  {d.checkedOutBy ? (
                    <>
                      <div className="flex items-center gap-3 border border-line bg-surface px-4 py-3">
                        <Avatar initials={holder?.avatarInitials ?? '??'} />
                        <div className="min-w-0">
                          <div className="truncate text-base font-medium text-fg">{holder?.name}</div>
                          <div className="text-base text-fg-muted">
                            since{' '}
                            {d.checkedOutAt ? <Timestamp value={d.checkedOutAt} /> : 'earlier today'}
                          </div>
                        </div>
                      </div>
                      <Button
                        className="mt-4"
                        block
                        size="lg"
                        variant="secondary"
                        icon={Icons.Check}
                        onClick={() => setPending({ kind: 'in', device: d })}
                      >
                        {t('Check tab back in')}
                      </Button>
                    </>
                  ) : d.active ? (
                    <>
                      <Field label="Which driver is taking it">
                        <Select
                          value={String(chosen)}
                          onChange={(e) =>
                            setDraftDriver((m) => ({ ...m, [d.id]: Number(e.target.value) }))
                          }
                        >
                          {drivers.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name}
                            </option>
                          ))}
                        </Select>
                      </Field>
                      <Button
                        className="mt-4"
                        block
                        size="lg"
                        variant="primary"
                        icon={Icons.Truck}
                        disabled={!chosen}
                        onClick={() => setPending({ kind: 'out', device: d, driverId: chosen })}
                      >
                        {t('Check tab out')}
                      </Button>
                    </>
                  ) : (
                    <p className="text-base text-fg-muted">
                      This tablet is flagged out of service and cannot be issued. The API rejects a
                      check-out attempt — the rule lives in the store, not this screen.
                    </p>
                  )}
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Who holds what ─────────────────────────────────────────────── */}
      <div className="mt-8">
        <SectionTitle subtitle="Links a delivery record to the physical device that captured it.">
          Device custody
        </SectionTitle>
        <Card className="mt-3">
          <CardBody className="p-0">
            <ul className="divide-y divide-line">
              {devices.map((d) => {
                const holder = select.user(s, d.checkedOutBy);
                const captured = s.deliveryEvents.filter((ev) => ev.tabDeviceId === d.id).length;
                return (
                  <li key={d.id} className="flex flex-wrap items-center gap-3 px-4 py-4 text-base">
                    <span className="font-mono text-base text-fg-muted">{d.deviceId}</span>
                    <span className="min-w-0 flex-1 truncate text-fg">
                      {holder ? (
                        <>
                          held by <span className="font-medium">{holder.name}</span>
                          {d.checkedOutAt && (
                            <span className="text-fg-muted">
                              {' '}
                              since <Timestamp value={d.checkedOutAt} />
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-fg-muted">on the rack at the gate</span>
                      )}
                    </span>
                    <span className="text-base text-fg-muted">
                      {captured} delivery record{captured === 1 ? '' : 's'} captured
                    </span>
                  </li>
                );
              })}
            </ul>
          </CardBody>
        </Card>
      </div>

      {/* ── Confirmation ───────────────────────────────────────────────── */}
      <Modal
        open={pending != null}
        onClose={() => setPending(null)}
        title={pending?.kind === 'in' ? 'Check this tab back in' : 'Issue this tab to a driver'}
        size="sm"
      >
        {pending && (
          <div className="space-y-4 text-base text-fg">
            <p>
              <span className="font-semibold">{pending.device.label}</span> (
              <span className="font-mono text-base">{pending.device.deviceId}</span>)
            </p>
            {pending.kind === 'out' ? (
              <p className="text-fg-muted">
                The tab will be bound to{' '}
                <span className="font-medium text-fg">{select.user(s, pending.driverId)?.name}</span>{' '}
                until it is returned. Every delivery captured on it from now on records this device
                id alongside the driver — that is the shared-device audit trail.
              </p>
            ) : (
              <p className="text-fg-muted">
                The tab returns to the rack and is free for another driver. Delivery records already
                captured keep their device id; nothing is rewritten.
              </p>
            )}
            <p className="text-base text-fg-muted">
              Recorded against {me.name} ({me.role}).
            </p>
          </div>
        )}
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="ghost" size="lg" onClick={() => setPending(null)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="lg"
            onClick={() => {
              if (!pending) return;
              if (pending.kind === 'out') {
                const name = select.user(s, pending.driverId)?.name ?? 'driver';
                run(
                  () => api.checkOutTab(pending.device.id, pending.driverId),
                  'Tab issued',
                  `${pending.device.label} → ${name}.`,
                );
              } else {
                run(
                  () => api.checkInTab(pending.device.id),
                  'Tab returned',
                  `${pending.device.label} is back on the rack.`,
                );
              }
            }}
          >
            {pending?.kind === 'in' ? 'Check in' : 'Check out'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function Counter({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'warn' | 'success' | 'neutral';
}) {
  const ink =
    tone === 'warn' ? 'text-warn-fg' : tone === 'success' ? 'text-success-fg' : 'text-fg';
  return (
    <div className="border border-line bg-surface px-4 py-4">
      <div className="text-base text-fg-muted">{label}</div>
      <div className={`mt-1 text-3xl font-semibold tabular-nums ${ink}`}>{value}</div>
    </div>
  );
}
