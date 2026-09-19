// ─── Client app · Account ────────────────────────────────────────────────────
// Profile, terms, and the cylinder balance. Cylinder deposits are real money in
// this industry — showing the customer their own held/returned position is the
// value-add the paper book never gave them.
//
// Plain build: white ground, hairline rules, no shadows, no icon tiles and no
// tinted meters. The credit and return figures are label/value lines with one
// plain grey track each; they are flex rows, so they mirror without a transform.

import { useMemo } from 'react';
import { useStore, select } from '../../core/store';
import { EmptyState } from '../../ui/primitives';
import { useT } from '../../i18n';
import { PKR, N } from './OrderTracking';

export interface AccountProps {
  clientId: number;
}

export default function Account({ clientId }: AccountProps) {
  const t = useT();
  const me = useStore((s) => s.users.find((u) => u.id === s.currentUserId)!);
  const client = useStore((s) => select.client(s, clientId));
  const products = useStore((s) => s.products);
  const orders = useStore((s) => select.ordersForClient(s, clientId));
  const route = useStore((s) =>
    client?.defaultRouteId ? select.route(s, client.defaultRouteId) : undefined,
  );
  const location = useStore((s) =>
    route ? select.location(s, route.locationId) : select.location(s, 1),
  );

  // Cylinder balance: delivered − returned, per product.
  const balance = useMemo(() => {
    const byProduct = new Map<number, { delivered: number; returned: number }>();
    for (const o of orders) {
      for (const l of o.lines) {
        const entry = byProduct.get(l.productId) ?? { delivered: 0, returned: 0 };
        entry.delivered += l.qtyDelivered ?? 0;
        entry.returned += l.qtyReturned ?? 0;
        byProduct.set(l.productId, entry);
      }
    }
    const rows = [...byProduct.entries()]
      .map(([productId, v]) => {
        const p = products.find((x) => x.id === productId);
        return {
          productId,
          name: p?.name ?? t('Product {id}', { id: productId }),
          size: p?.size ?? '',
          deposit: p?.depositPerCylinder ?? 0,
          delivered: v.delivered,
          returned: v.returned,
          held: v.delivered - v.returned,
        };
      })
      .filter((r) => r.delivered > 0 || r.returned > 0)
      .sort((a, b) => b.held - a.held);

    const inTransit = orders
      .filter((o) => ['ASSIGNED', 'DISPATCHED'].includes(o.status))
      .reduce((s, o) => s + o.lines.reduce((x, l) => x + (l.qtyLoaded ?? l.qtyOrdered), 0), 0);

    return {
      rows,
      inTransit,
      delivered: rows.reduce((s, r) => s + r.delivered, 0),
      returned: rows.reduce((s, r) => s + r.returned, 0),
      held: rows.reduce((s, r) => s + r.held, 0),
      depositValue: rows.reduce((s, r) => s + r.held * r.deposit, 0),
    };
  }, [orders, products, t]);

  if (!client) {
    return (
      <div className="px-5 py-10">
        <EmptyState
          title={t('No account')}
          description={t('This user is not linked to a customer account.')}
        />
      </div>
    );
  }

  const credit =
    client.paymentTerms === 'credit' && client.creditLimit
      ? {
          limit: client.creditLimit,
          outstanding: client.outstanding ?? 0,
          pct: Math.min(100, Math.round(((client.outstanding ?? 0) / client.creditLimit) * 100)),
        }
      : null;

  const returnRate = balance.delivered
    ? Math.round((balance.returned / balance.delivered) * 100)
    : 0;

  return (
    <div className="flex flex-col gap-7 px-4 pb-10 pt-4">
      {/* Identity */}
      <header>
        <h1 className="text-2xl font-bold text-fg">{client.name}</h1>
        <p className="mt-1 text-md text-fg-muted">
          {me.name} ·{' '}
          <span data-num dir="ltr">
            {client.oracleCustomerCode}
          </span>
        </p>
      </header>

      {/* Cylinder balance — the commercial headline */}
      <section>
        <h2 className="text-lg font-bold text-fg">{t('Cylinders with you')}</h2>
        <p className="mt-1 text-3xl font-bold text-fg">
          <N v={balance.held} />
        </p>
        <p className="mt-1 text-md text-fg-muted">
          {t('{d} delivered · {r} empties returned', {
            d: balance.delivered,
            r: balance.returned,
          })}
        </p>
        {balance.inTransit > 0 && (
          <p className="mt-1 text-md text-fg">
            {t('{n} more on the way to you', { n: balance.inTransit })}
          </p>
        )}

        {balance.delivered > 0 && (
          <div className="mt-3">
            {/* Plain grey track, one solid fill. No tint, no gradient. */}
            <div
              className="h-3 w-full overflow-hidden rounded-full bg-line"
              role="meter"
              aria-valuenow={returnRate}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={t('Empties returned against cylinders delivered')}
            >
              <div className="h-full bg-fg" style={{ width: `${Math.max(2, returnRate)}%` }} />
            </div>
            <p className="mt-2 text-md text-fg-muted">
              {t('{n}% of delivered cylinders returned', { n: returnRate })}
            </p>
          </div>
        )}

        {balance.rows.length === 0 && (
          <p className="mt-3 text-md ltr:leading-relaxed text-fg-muted">
            {t(
              'No cylinders are on your account yet. Every delivery and every empty the driver collects is posted here against your deposit — so the balance is always the same number MCL holds.',
            )}
          </p>
        )}

        {balance.rows.length > 0 && (
          <ul className="-mx-4 mt-4 divide-y divide-line border-y border-line">
            {balance.rows.map((r) => (
              <li key={r.productId} className="flex min-h-[56px] items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-md text-fg">{r.name}</p>
                  <p className="text-base text-fg-muted">{r.size}</p>
                </div>
                <div className="text-end">
                  <p className="text-md font-bold text-fg">
                    <N v={r.held} />{' '}
                    <span className="font-normal text-fg-muted">{t('held')}</span>
                  </p>
                  <p className="text-base text-fg-muted">
                    {t('{d} delivered · {r} returned', { d: r.delivered, r: r.returned })}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="flex items-baseline justify-between gap-3 border-b border-line py-3">
          <span className="text-md text-fg-muted">{t('Deposit value held')}</span>
          <PKR v={balance.depositValue} className="text-lg font-bold text-fg" />
        </div>
      </section>

      {/* Terms */}
      <section>
        <h2 className="text-lg font-bold text-fg">{t('Payment terms')}</h2>
        <p className="mt-1 text-md text-fg">
          {client.paymentTerms === 'credit' ? t('Credit account') : t('Cash on delivery')} ·{' '}
          {client.paymentTerms === 'credit' ? t('Invoiced') : t('Pay the driver')}
        </p>

        {credit ? (
          <div className="mt-3">
            <dl className="divide-y divide-line border-y border-line">
              <div className="flex items-baseline justify-between gap-3 py-3">
                <dt className="text-md text-fg-muted">{t('Outstanding')}</dt>
                <dd>
                  <PKR v={credit.outstanding} className="text-lg font-bold text-fg" />
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3 py-3">
                <dt className="text-md text-fg-muted">{t('Available')}</dt>
                <dd>
                  <PKR v={credit.limit - credit.outstanding} className="text-md text-fg" />
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3 py-3">
                <dt className="text-md text-fg-muted">{t('Credit limit')}</dt>
                <dd>
                  <PKR v={credit.limit} className="text-md text-fg" />
                </dd>
              </div>
            </dl>
            {/* Plain grey track, one solid fill. */}
            <div
              className="mt-3 h-3 w-full overflow-hidden rounded-full bg-line"
              role="meter"
              aria-valuenow={credit.pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={t('Credit used')}
            >
              <div className="h-full bg-fg" style={{ width: `${Math.max(3, credit.pct)}%` }} />
            </div>
            <p className="mt-2 text-md text-fg-muted" data-num>
              {t('{n}% used', { n: credit.pct })}
            </p>
          </div>
        ) : (
          <p className="mt-2 text-md ltr:leading-relaxed text-fg-muted">
            {t(
              'The driver collects cash on delivery. The amount is reconciled at the gate the same day and only a matched reconciliation is posted to MCL’s accounts.',
            )}
          </p>
        )}
      </section>

      {/* Delivery profile */}
      <section>
        <h2 className="text-lg font-bold text-fg">{t('Delivery profile')}</h2>
        <dl className="-mx-4 mt-2 divide-y divide-line border-y border-line">
          <Row label={t('Default route')}>
            {route ? `${route.name} (${route.code})` : t('Not set')}
          </Row>
          <Row label={t('Served from')}>{location?.name ?? '—'}</Row>
          <Row label={t('Delivery address')}>{client.address}</Row>
          <Row label={t('Contact')}>
            <span data-num dir="ltr">
              {client.contactNumber}
            </span>
          </Row>
          <Row label={t('Delivery confirmation')}>
            {client.confirmMethod === 'otp'
              ? t('One-time code to your phone')
              : t('Signature on the driver’s tab')}
          </Row>
        </dl>
      </section>

      <p className="text-md ltr:leading-relaxed text-fg-muted">
        {t(
          'Signed in as {user}. You only ever see orders belonging to {client} — that rule is enforced by MCL’s server, not by this app.',
          { user: me.name, client: client.name },
        )}
      </p>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-[56px] items-center gap-4 px-4 py-3">
      <dt className="shrink-0 text-md text-fg-muted">{label}</dt>
      <dd className="ms-auto min-w-0 truncate text-end text-md text-fg">{children}</dd>
    </div>
  );
}
