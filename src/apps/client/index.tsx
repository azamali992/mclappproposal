// ─── Client app ──────────────────────────────────────────────────────────────
// The customer-facing surface: a dealer's own phone. Four tabs, one push stack.
// The shell owns the device frame and the role switcher — this fills the screen
// it is handed (≈390×844) and nothing more.
//
// Plain build: white ground, hairline rules, no shadows, no blur, no tinted
// plates. The tab bar marks the active tab with bold weight AND the accent
// colour — weight carries it if colour cannot.
//
// Direction: the push stack slides in from the inline end (index.css swaps the
// keyframe under [dir='rtl']) and the back chevron mirrors, so the gesture
// model reads the same in Urdu.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useStore, useCurrentUser, select } from '../../core/store';
import { Cylinder, Plus, Clipboard, User, ChevronLeft } from '../../ui/icons';
import type { IconProps } from '../../ui/icons';
import { useT } from '../../i18n';
import Home from './Home';
import PlaceOrder from './PlaceOrder';
import OrderTracking, { isLive } from './OrderTracking';
import OrderHistory, { OrderReceipt } from './OrderHistory';
import ConfirmDelivery from './ConfirmDelivery';
import Account from './Account';

type Tab = 'home' | 'order' | 'history' | 'account';
type Push = { kind: 'track' | 'confirm' | 'receipt'; orderId: number } | null;

// `label` is the English source string — the translation key.
const TABS: { key: Tab; label: string; Icon: (p: IconProps) => JSX.Element }[] = [
  { key: 'home', label: 'Home', Icon: Cylinder },
  { key: 'order', label: 'Order', Icon: Plus },
  { key: 'history', label: 'History', Icon: Clipboard },
  { key: 'account', label: 'Account', Icon: User },
];

export default function ClientApp() {
  const t = useT();
  const me = useCurrentUser();
  const clientId = me.clientId ?? 1;
  const orders = useStore((s) => select.ordersForClient(s, clientId));

  const [tab, setTab] = useState<Tab>('home');
  const [push, setPush] = useState<Push>(null);
  const [orderKey, setOrderKey] = useState(0); // remounts PlaceOrder for a fresh form

  // Switching customer identity resets navigation — never show another client's view.
  useEffect(() => {
    setPush(null);
    setTab('home');
  }, [clientId]);

  const needsAction = useMemo(() => orders.some((o) => o.status === 'DELIVERED'), [orders]);

  const goTrack = useCallback((orderId: number) => setPush({ kind: 'track', orderId }), []);
  const goConfirm = useCallback((orderId: number) => setPush({ kind: 'confirm', orderId }), []);
  const goReceipt = useCallback((orderId: number) => setPush({ kind: 'receipt', orderId }), []);
  const back = useCallback(() => setPush(null), []);

  const goPlaceOrder = useCallback(() => {
    setOrderKey((k) => k + 1);
    setPush(null);
    setTab('order');
  }, []);

  const pushTitle =
    push?.kind === 'track'
      ? t('Order #{n}', { n: push.orderId })
      : push?.kind === 'confirm'
        ? t('Confirm delivery')
        : push?.kind === 'receipt'
          ? t('Receipt')
          : '';

  return (
    <div className="flex h-full flex-col overflow-hidden bg-app text-fg">
      <div className="relative flex-1 overflow-hidden">
        {/* ── Tab content ─────────────────────────────────────────────────── */}
        <main className="h-full overflow-y-auto overscroll-contain">
          <div key={tab}>
            {tab === 'home' && (
              <Home
                clientId={clientId}
                onTrack={goTrack}
                onConfirm={goConfirm}
                onReceipt={goReceipt}
                onPlaceOrder={goPlaceOrder}
                onSeeAll={() => setTab('history')}
              />
            )}
            {tab === 'order' && (
              <PlaceOrder
                key={orderKey}
                clientId={clientId}
                onTrack={(id) => {
                  setTab('home');
                  goTrack(id);
                }}
                onDone={() => setTab('home')}
              />
            )}
            {tab === 'history' && (
              <OrderHistory
                clientId={clientId}
                onOpen={(id) => {
                  const o = orders.find((x) => x.id === id);
                  if (o && isLive(o.status)) goTrack(id);
                  else goReceipt(id);
                }}
              />
            )}
            {tab === 'account' && <Account clientId={clientId} />}
          </div>
        </main>

        {/* ── Push stack ──────────────────────────────────────────────────── */}
        {push && (
          <div className="absolute inset-0 z-30 flex flex-col bg-app motion-safe:animate-slide-left">
            <div className="flex shrink-0 items-center gap-1 border-b border-line bg-app px-1 py-1">
              <button
                type="button"
                onClick={back}
                aria-label={t('Back')}
                className="flex h-12 w-12 shrink-0 items-center justify-center text-fg hover:bg-surface-high focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                {/* Direction-bearing glyph: mirrors under RTL. */}
                <ChevronLeft className="h-6 w-6 rtl:-scale-x-100" />
              </button>
              <span className="truncate text-md font-bold text-fg">{pushTitle}</span>
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain">
              {push.kind === 'track' && (
                <OrderTracking
                  orderId={push.orderId}
                  clientId={clientId}
                  onConfirm={goConfirm}
                  onViewReceipt={goReceipt}
                />
              )}
              {push.kind === 'confirm' && (
                <ConfirmDelivery
                  orderId={push.orderId}
                  clientId={clientId}
                  onDone={back}
                  onViewReceipt={goReceipt}
                />
              )}
              {push.kind === 'receipt' && (
                <OrderReceipt orderId={push.orderId} clientId={clientId} />
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom tab bar ──────────────────────────────────────────────── */}
      <nav
        aria-label={t('Primary navigation')}
        className="relative z-40 flex shrink-0 items-stretch border-t border-line bg-surface pb-5 pt-1"
      >
        {TABS.map(({ key, label, Icon }) => {
          const on = tab === key && !push;
          return (
            <button
              key={key}
              type="button"
              aria-current={on ? 'page' : undefined}
              onClick={() => {
                setPush(null);
                if (key === 'order' && tab !== 'order') setOrderKey((k) => k + 1);
                setTab(key);
              }}
              className={[
                'flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 px-1',
                'hover:bg-surface-high focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent',
                // Active is bold weight AND the accent colour — never colour alone.
                on ? 'font-bold text-accent' : 'font-normal text-fg-muted',
              ].join(' ')}
            >
              <span className="relative">
                <Icon className="h-6 w-6" />
                {key === 'home' && needsAction && (
                  <span
                    aria-hidden
                    className="absolute -end-1.5 -top-1 h-2.5 w-2.5 rounded-full bg-accent"
                  />
                )}
              </span>
              <span className="text-base">{t(label)}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
