// ─── Gate tab desk ───────────────────────────────────────────────────────────
// Drivers do not own tablets — they draw one from the gate each morning and
// return it at night. Every delivery captured on a tab carries its device id,
// so "which device recorded this delivery, in whose hands" is answerable.
//
// One job: hand a tab out, take a tab back. One list, one button a row. The
// three counter tiles and the second "device custody" list both restated what
// the list itself already says, so they are gone; the only number that mattered
// is the sentence under the title.

import { useMemo, useState } from 'react';
import { api, useStore, useCurrentUser, select, RuleError } from '../../../core/store';
import type { TabDevice } from '../../../core/types';
import { Button, Select, Modal, useToast } from '../../../ui/primitives';
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
      <header className="mb-4">
        <h1 className="text-xl font-semibold leading-tight text-fg">{t('Tab desk')}</h1>
        <p className="mt-1 text-base text-fg-muted">
          {t('Out with drivers: {out} of {total}.', { out: out.length, total: devices.length })}
        </p>
      </header>

      {devices.length === 0 ? (
        <p className="border border-line px-4 py-4 text-base text-fg-muted">
          {t('No tablets registered.')}
        </p>
      ) : (
        <ul className="border border-line">
          {devices.map((d) => {
            const holder = select.user(s, d.checkedOutBy);
            const chosen = draftDriver[d.id] ?? drivers[0]?.id ?? 0;
            return (
              <li
                key={d.id}
                className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3 last:border-b-0"
              >
                <span className="min-w-0 flex-1 text-base text-fg">
                  {holder
                    ? t('{tab} · with {driver}', { tab: d.label, driver: holder.name })
                    : t('{tab} · on the rack', { tab: d.label })}
                </span>

                {d.checkedOutBy ? (
                  <Button
                    size="lg"
                    variant="secondary"
                    onClick={() => setPending({ kind: 'in', device: d })}
                  >
                    {t('Check tab back in')}
                  </Button>
                ) : d.active ? (
                  <>
                    <div className="w-56 shrink-0">
                      <Select
                        aria-label={t('Which driver is taking it')}
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
                    </div>
                    <Button
                      size="lg"
                      variant="primary"
                      disabled={!chosen}
                      onClick={() => setPending({ kind: 'out', device: d, driverId: chosen })}
                    >
                      {t('Check tab out')}
                    </Button>
                  </>
                ) : (
                  <span className="whitespace-nowrap text-base text-fg-muted">
                    {t('Out of service')}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* ── Confirmation ───────────────────────────────────────────────── */}
      <Modal
        open={pending != null}
        onClose={() => setPending(null)}
        title={pending?.kind === 'in' ? t('Check tab back in') : t('Check tab out')}
        size="sm"
      >
        {pending && (
          <p className="text-base text-fg">
            {pending.kind === 'out'
              ? t('{tab} goes to {driver}. Everything captured on it records this device id.', {
                  tab: pending.device.label,
                  driver: select.user(s, pending.driverId)?.name ?? '—',
                })
              : t('{tab} returns to the rack. Records already captured keep their device id.', {
                  tab: pending.device.label,
                })}
          </p>
        )}
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="ghost" size="lg" onClick={() => setPending(null)}>
            {t('Not yet')}
          </Button>
          <Button
            variant="primary"
            size="lg"
            icon={Icons.Check}
            onClick={() => {
              if (!pending) return;
              if (pending.kind === 'out') {
                const name = select.user(s, pending.driverId)?.name ?? 'driver';
                run(
                  () => api.checkOutTab(pending.device.id, pending.driverId),
                  'Tab issued',
                  `${pending.device.label} → ${name}. Recorded against ${me.name}.`,
                );
              } else {
                run(
                  () => api.checkInTab(pending.device.id),
                  'Tab returned',
                  `${pending.device.label} is back on the rack. Recorded against ${me.name}.`,
                );
              }
            }}
          >
            {t('Confirm')}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
