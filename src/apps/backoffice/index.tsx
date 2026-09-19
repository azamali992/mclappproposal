// ─── Back-office shell ───────────────────────────────────────────────────────
// Left nav + content area for the four desk-bound roles (sales, clerk, cashier,
// gate) plus admin, who sees everything. The role switcher lives in the OUTER
// app shell (src/App.tsx) — this component only reads `useCurrentUser()` and
// renders the nav that role is entitled to.

import { useState } from 'react';
import type { ComponentType } from 'react';
import { useCurrentUser, useStore, select } from '../../core/store';
import { useT } from '../../i18n';
import type { Role } from '../../core/types';
import * as Icons from '../../ui/icons';
import { Spinner } from '../../ui/primitives';

import ReconciliationQueue from './cashier/ReconciliationQueue';
import Dashboard from './admin/Dashboard';
import IntegrationConsole from './admin/IntegrationConsole';
import AuditTrail from './admin/AuditTrail';
import TabDesk from './gate/TabDesk';

import ClerkQueue from './clerk/ClerkQueue';
import SalesDesk from './sales/SalesDesk';

// ─── Nav model ───────────────────────────────────────────────────────────────

type NavId = 'dashboard' | 'sales' | 'clerk' | 'reconcile' | 'oracle' | 'audit' | 'gate';

interface NavItem {
  id: NavId;
  label: string;
  hint: string;
  group: string;
  icon: Icons.Icon;
  render: () => JSX.Element;
}

const ALL_ITEMS: Record<NavId, NavItem> = {
  dashboard: {
    id: 'dashboard',
    label: 'Dashboard',
    hint: 'Today at a glance',
    group: 'Overview',
    icon: Icons.Database,
    render: () => <Dashboard />,
  },
  sales: {
    id: 'sales',
    label: 'Sales desk',
    hint: 'Take an order by phone',
    group: 'Operations',
    icon: Icons.Clipboard,
    render: () => <SalesDesk />,
  },
  clerk: {
    id: 'clerk',
    label: 'Dispatch queue',
    hint: 'Fill, assign, dispatch',
    group: 'Operations',
    icon: Icons.Warehouse,
    render: () => <ClerkQueue />,
  },
  gate: {
    id: 'gate',
    label: 'Tab desk',
    hint: 'Issue and return driver tabs',
    group: 'Operations',
    icon: Icons.Lock,
    render: () => <TabDesk />,
  },
  reconcile: {
    id: 'reconcile',
    label: 'Cash reconciliation',
    hint: 'The only path to Oracle',
    group: 'Cash & posting',
    icon: Icons.Banknote,
    render: () => <ReconciliationQueue />,
  },
  oracle: {
    id: 'oracle',
    label: 'Integration console',
    hint: 'Oracle ORDS posts & retries',
    group: 'Cash & posting',
    icon: Icons.Sync,
    render: () => <IntegrationConsole />,
  },
  audit: {
    id: 'audit',
    label: 'Audit trail',
    hint: 'Who did what, and when',
    group: 'Governance',
    icon: Icons.Users,
    render: () => <AuditTrail />,
  },
};

/**
 * What each role opens every day, and nothing else. Admin used to carry all
 * seven screens; the three operational ones belong to the people who actually
 * work them, and an admin who needs the dispatch queue can act as the clerk.
 */
const NAV_BY_ROLE: Record<Role, NavId[]> = {
  admin: ['dashboard', 'reconcile', 'oracle', 'audit'],
  cashier: ['reconcile', 'oracle', 'audit'],
  clerk: ['clerk', 'gate', 'audit'],
  sales: ['sales', 'audit'],
  gate: ['gate', 'audit'],
  driver: [],
  client: [],
};

// ─── Shell ───────────────────────────────────────────────────────────────────

export default function BackOffice() {
  const t = useT();
  const me = useCurrentUser();
  const [chosen, setChosen] = useState<NavId | null>(null);

  const ids = NAV_BY_ROLE[me.role] ?? [];
  const items = ids.map((id) => ALL_ITEMS[id]);
  // Derive rather than effect: when the outer shell switches role, a nav item
  // the new role cannot see falls back to their first entitled screen.
  const activeId: NavId | undefined = chosen && ids.includes(chosen) ? chosen : ids[0];
  const active = activeId ? ALL_ITEMS[activeId] : undefined;

  const groups: { name: string; items: NavItem[] }[] = [];
  for (const item of items) {
    const g = groups.find((x) => x.name === item.group);
    if (g) g.items.push(item);
    else groups.push({ name: item.group, items: [item] });
  }

  const location = useStore((s) => (me.locationId ? select.location(s, me.locationId) : undefined));
  const pendingCash = useStore((s) => select.pendingReconciliation(s).length);
  const heldCash = useStore((s) => s.reconciliations.filter((r) => r.status === 'mismatch_held').length);
  const failed = useStore((s) => select.failedPosts(s).length);
  const clerkCount = useStore((s) => select.clerkQueue(s).length);

  const badgeFor = (id: NavId): number | undefined => {
    if (id === 'reconcile') return pendingCash + heldCash || undefined;
    if (id === 'oracle') return failed || undefined;
    if (id === 'clerk') return clerkCount || undefined;
    return undefined;
  };

  if (!active) {
    return (
      <div className="flex h-full items-center justify-center bg-surface p-10 text-base text-fg-muted">
        {me.name} is a {me.role} — the back office has no screen for that role.
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 bg-surface text-fg">
      {/* ── Left nav ─────────────────────────────────────────────────────── */}
      {/* A plain white list. One hairline down the inside edge, and nothing
          else: no fill, no card, no shadow. The current screen is marked by
          bold text on a light grey fill — two cues, both readable in a
          photograph of a projector.
          Logical `border-e` so the edge lands on the right under RTL (Urdu). */}
      <nav className="flex w-68 shrink-0 flex-col border-e border-line bg-surface">
        <div className="border-b border-line px-4 py-4">
          <div className="text-base text-fg-muted">{t('Back office')}</div>
          <div className="mt-1 text-lg font-semibold leading-tight text-fg">{me.name}</div>
          <div className="mt-0.5 text-base capitalize text-fg-muted">
            {t(me.role.charAt(0).toUpperCase() + me.role.slice(1))}
            {location ? ` · ${location.name}` : ''}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-3">
          {groups.map((g) => (
            <div key={g.name} className="mb-5">
              <h2 className="px-4 pb-1.5 text-base font-semibold text-fg-muted">{t(g.name)}</h2>
              <ul>
                {g.items.map((item) => {
                  const on = item.id === activeId;
                  const count = badgeFor(item.id);
                  const Ico = item.icon;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => setChosen(item.id)}
                        aria-current={on ? 'page' : undefined}
                        className={[
                          'flex w-full items-center gap-3 px-4 py-3 text-start',
                          on ? 'bg-surface-high font-semibold text-fg' : 'text-fg hover:bg-surface-high',
                        ].join(' ')}
                      >
                        <Ico className="h-5 w-5 shrink-0 text-fg-muted" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-base">{t(item.label)}</span>
                          <span className="block truncate text-base font-normal text-fg-muted">
                            {t(item.hint)}
                          </span>
                        </span>
                        {count != null && (
                          <span className="shrink-0 border border-line px-2 py-0.5 text-base font-semibold tabular-nums text-fg">
                            {count}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-line px-4 py-3 text-base leading-relaxed text-fg-muted">
          {t('Every action here is written to the audit trail with your name and role.')}
        </div>
      </nav>

      {/* ── Content ──────────────────────────────────────────────────────── */}
      <main className="min-w-0 flex-1 overflow-y-auto">
        {active.render()}
      </main>
    </div>
  );
}
