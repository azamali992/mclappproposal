// ─── App shell ───────────────────────────────────────────────────────────────
// Owns the demo chrome only: who is acting, which surface that role sees, and
// the live demo controls. All business behaviour lives in src/core/store.ts.
//
// Three surfaces, one store — switching role mid-flow shows the same order
// moving between them, which is the whole point of the demonstration.

import { useEffect, useState } from 'react';
import { api, useCurrentUser, useStore } from './core/store';
import type { Role } from './core/types';
import { ToastProvider, PhoneFrame, TabletFrame } from './ui/primitives';
import BackOffice from './apps/backoffice';
import DriverTab from './apps/driver';
import ClientApp from './apps/client';
import DemoGuide from './DemoGuide';
import { LanguageProvider, useI18n } from './i18n';

function roleBlurbs(t: (s: string) => string): Record<Role, string> {
  return {
    client: t('Dealer app — places orders, tracks delivery, confirms by OTP'),
    sales: t('Sales desk — places orders on a client’s behalf'),
    clerk: t('Warehouse — fills, assigns a vehicle, allocates the ECR at dispatch'),
    driver: t('Driver tab — offline-first delivery capture and receipt printing'),
    gate: t('Gate — issues and checks in the shared driver tablets'),
    cashier: t('Gate cashier — counts the cash. The only path to Oracle.'),
    admin: t('Back office — audit trail, Oracle integration, dashboards'),
  };
}

/** Which device frame each role's surface belongs in. */
function surfaceFor(role: Role) {
  if (role === 'driver') return 'tablet' as const;
  if (role === 'client') return 'phone' as const;
  return 'desktop' as const;
}

/**
 * True on an actual phone or small tablet.
 *
 * The device frames are a presentation device: on a projector they say "this is
 * a mobile app" far better than a full-bleed browser window does. On a real
 * handset they are absurd — a 380px mockup inside a 390px screen. So when the
 * viewport is genuinely small we drop the bezel and hand the surface the whole
 * screen, which is what the production app would do anyway.
 */
function useIsHandset() {
  const [narrow, setNarrow] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 760,
  );
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(max-width: 759px)');
    const sync = () => setNarrow(mq.matches);
    sync();
    mq.addEventListener?.('change', sync);
    return () => mq.removeEventListener?.('change', sync);
  }, []);
  return narrow;
}

export default function App() {
  return (
    <LanguageProvider>
      <Shell />
    </LanguageProvider>
  );
}

function Shell() {
  const me = useCurrentUser();
  const users = useStore((s) => s.users);
  const online = useStore((s) => s.online);
  const oracleUp = useStore((s) => s.oracleUp);
  const queueDepth = useStore((s) => s.queue.filter((q) => q.state !== 'synced').length);
  const [guideOpen, setGuideOpen] = useState(false);

  // "?" opens the presenter's script — handy mid-demo without leaving the app.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
      if (e.key === '?') setGuideOpen((v) => !v);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const surface = surfaceFor(me.role);
  const handset = useIsHandset();
  const { t, lang, setLang, isUrdu } = useI18n();
  const ROLE_BLURB = roleBlurbs(t);

  return (
    <ToastProvider>
      <div className={['min-h-screen bg-app text-fg flex flex-col', isUrdu ? 'font-urdu' : ''].join(' ')}>
        {/* ── Demo chrome ─────────────────────────────────────────────── */}
        <header className="flex-none border-b border-line bg-surface">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2 sm:px-5 sm:py-0 sm:h-14 sm:flex-nowrap">
            <div className="pe-4 border-e border-line">
              <div className="font-semibold">{t('MCL Delivery')}</div>
              <div className="text-sm text-fg-muted">{t('Multan Chemicals Ltd')}</div>
            </div>

            {/* Role switcher — the spine of the demo. On a handset the eight
                buttons will not fit, so it collapses to a single select. */}
            {handset ? (
              <select
                aria-label={t('Acting as')}
                value={me.id}
                onChange={(e) => api.switchUser(Number(e.target.value))}
                className="ms-auto min-w-0 rounded border border-line-strong bg-surface px-2 py-2 text-sm text-fg"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.role.toUpperCase()} · {u.name}
                  </option>
                ))}
              </select>
            ) : (
            <nav className="flex items-center gap-1 overflow-x-auto" aria-label="Acting as">
              {users.map((u) => {
                const active = u.id === me.id;
                return (
                  <button
                    key={u.id}
                    onClick={() => api.switchUser(u.id)}
                    title={ROLE_BLURB[u.role]}
                    className={[
                      'px-3 py-2 rounded border text-sm whitespace-nowrap',
                      active
                        ? 'border-line-strong bg-surface-raised font-semibold text-fg'
                        : 'border-transparent text-fg-muted hover:text-fg hover:bg-surface-raised',
                    ].join(' ')}
                  >
                    <span className="capitalize">{u.role}</span>
                    <span className={active ? 'opacity-70' : 'opacity-50'}> · {u.name.split(' ')[0]}</span>
                  </button>
                );
              })}
            </nav>
            )}

            <div className="ml-auto flex items-center gap-2">
              {/* Live demo controls — fault injection the presenter can reach */}
              <DemoToggle
                on={online}
                onLabel={t('Online')}
                offLabel={t('Offline')}
                onToggle={() => api.setOnline(!online)}
                tone="info"
                badge={queueDepth > 0 ? String(queueDepth) : undefined}
              />
              <DemoToggle
                on={oracleUp}
                onLabel={t('Oracle up')}
                offLabel={t('Oracle down')}
                onToggle={() => api.setOracleUp(!oracleUp)}
                tone="success"
              />
              <button
                onClick={() => setLang(lang === 'en' ? 'ur' : 'en')}
                title="Switch language / زبان تبدیل کریں"
                className="rounded border border-line px-3 py-2 text-sm text-fg-muted hover:bg-surface-raised hover:text-fg"
              >
                {lang === 'en' ? 'اردو' : 'English'}
              </button>
              <button
                onClick={() => setGuideOpen(true)}
                className="rounded border border-line px-3 py-2 text-sm text-fg-muted hover:bg-surface-raised hover:text-fg"
              >
                {t('Script')} <kbd className="ms-1 text-sm text-fg-muted">?</kbd>
              </button>
              <button
                onClick={() => {
                  if (confirm('Reset the demo to its opening state? All actions taken will be discarded.')) api.reset();
                }}
                className="rounded border border-line px-3 py-2 text-sm text-fg-muted hover:bg-surface-raised hover:text-fg"
              >
                {t('Reset')}
              </button>
            </div>
          </div>

          {/* Role context strip — tells the room what they're looking at */}
          <div className="px-5 pb-2 -mt-0.5">
            <p className="text-xs text-fg-dim">
              <span className="text-fg-muted font-medium">{me.name}</span>
              <span className="mx-1.5 text-line-strong">·</span>
              {ROLE_BLURB[me.role]}
            </p>
          </div>
        </header>

        {/* ── The active surface ──────────────────────────────────────── */}
        <main className="flex-1 min-h-0 overflow-hidden">
          {surface === 'desktop' && (
            <div className="h-full overflow-auto">
              <BackOffice />
            </div>
          )}

          {/* On a real handset the bezel is dropped and the surface gets the
              whole screen — see useIsHandset. */}
          {surface === 'tablet' &&
            (handset ? (
              <div className="h-full overflow-auto">
                <DriverTab />
              </div>
            ) : (
              <DeviceStage caption={t('Shared company tablet — Android, Bluetooth receipt printer, works with no signal')}>
                <TabletFrame online={online}>
                  <DriverTab />
                </TabletFrame>
              </DeviceStage>
            ))}

          {surface === 'phone' &&
            (handset ? (
              <div className="h-full overflow-auto">
                <ClientApp />
              </div>
            ) : (
              <DeviceStage caption={t('Dealer’s own phone — online only, sees nothing but their own orders')}>
                <PhoneFrame online={online}>
                  <ClientApp />
                </PhoneFrame>
              </DeviceStage>
            ))}
        </main>

        <DemoGuide open={guideOpen} onClose={() => setGuideOpen(false)} />
      </div>
    </ToastProvider>
  );
}

/** Centres a device frame on a stage with a caption, for the mobile surfaces. */
function DeviceStage({ caption, children }: { caption: string; children: React.ReactNode }) {
  return (
    <div className="h-full overflow-auto grid place-items-center py-8 px-4 bg-app">
      <div className="flex flex-col items-center gap-4">
        {children}
        <p className="text-sm text-fg-muted max-w-md text-center">{caption}</p>
      </div>
    </div>
  );
}

function DemoToggle({
  on, onLabel, offLabel, onToggle, tone, badge,
}: {
  on: boolean;
  onLabel: string;
  offLabel: string;
  onToggle: () => void;
  tone: 'info' | 'success';
  badge?: string;
}) {
  void tone;
  return (
    <button
      onClick={onToggle}
      className={[
        'flex items-center gap-2 rounded border px-3 py-2 text-sm',
        on
          ? 'border-line-strong bg-surface text-fg'
          : 'border-danger bg-danger-soft font-semibold text-danger-fg',
      ].join(' ')}
    >
      {on ? onLabel : offLabel}
      {badge && (
        <span className="rounded bg-surface-raised px-1.5 text-sm tabular-nums">{badge}</span>
      )}
    </button>
  );
}
