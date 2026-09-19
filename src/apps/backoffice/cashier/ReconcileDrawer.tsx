// ─── Reconcile drawer ────────────────────────────────────────────────────────
// Where the cash is actually counted. Three outcomes, all demoable:
//
//   matched   → api.reconcile → orders RECONCILED → the store posts to Oracle
//   mismatch  → api.reconcile → orders MISMATCH_HELD → NOTHING is sent
//   SOD       → api.reconcile throws RuleError('SOD') → shown, loudly
//
// The view is driven by order status read back from the store, not by local
// flags, so the posting spinners and document numbers are live.

import { useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import {
  api,
  useStore,
  useCurrentUser,
  select,
  expectedCash,
  orderCylinders,
  RuleError,
} from '../../../core/store';
import type { Order } from '../../../core/types';
import {
  Button,
  Badge,
  StatusPill,
  Drawer,
  Modal,
  Input,
  Textarea,
  Field,
  Spinner,
  Money,
  Qty,
  EcrTag,
  Timestamp,
  useToast,
} from '../../../ui/primitives';
import * as Icons from '../../../ui/icons';
import { useT } from '../../../i18n';

export interface ReconcileTarget {
  kind: 'route' | 'hold';
  routeId: number;
  vehicleId: number;
  driverId: number;
  orderIds: number[];
  /** Set when re-opening an existing held reconciliation. */
  reconciliationId?: number;
}

export default function ReconcileDrawer({
  open,
  target,
  onClose,
}: {
  open: boolean;
  target: ReconcileTarget | null;
  onClose: () => void;
}) {
  const t = useT();
  return (
    <Drawer open={open} onClose={onClose} title={t('Cash reconciliation')} width="46rem">
      {target && <Body key={target.orderIds.join('-')} target={target} onClose={onClose} />}
    </Drawer>
  );
}

// ─── Body ────────────────────────────────────────────────────────────────────

function Body({ target, onClose }: { target: ReconcileTarget; onClose: () => void }) {
  const s = useStore((x) => x);
  const t = useT();
  const me = useCurrentUser();
  const toast = useToast();

  const [countStr, setCountStr] = useState('');
  const [notes, setNotes] = useState('');
  const [resolveNotes, setResolveNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [ruleError, setRuleError] = useState<{ rule: string; message: string } | null>(null);

  const orders = useMemo(
    () => target.orderIds.map((id) => select.order(s, id)).filter((o): o is Order => !!o),
    [s.orders, target.orderIds],
  );

  const route = select.route(s, target.routeId);
  const vehicle = select.vehicle(s, target.vehicleId);
  const driver = select.user(s, target.driverId);

  const rec = useMemo(() => {
    if (target.reconciliationId != null) {
      const byId = s.reconciliations.find((r) => r.id === target.reconciliationId);
      if (byId) return byId;
    }
    // `reconciliations` is prepended, so the first hit is the latest.
    return s.reconciliations.find((r) => r.orderIds.some((id) => target.orderIds.includes(id)));
  }, [s.reconciliations, target]);

  const expected = orders.reduce((n, o) => n + expectedCash(o), 0);
  const driverCash = orders.reduce(
    (n, o) => n + (s.deliveryEvents.find((d) => d.orderId === o.id)?.cashCollected ?? 0),
    0,
  );
  const counted = Number(countStr.replace(/[,\s]/g, '')) || 0;
  const variance = counted - expected;
  const balanced = Math.abs(variance) < 0.5 && countStr.trim() !== '';

  // Phase is read from the orders themselves — the store is the source of truth.
  const held = orders.some((o) => o.status === 'MISMATCH_HELD');
  const settled = orders.every((o) =>
    ['RECONCILED', 'POST_FAILED', 'POSTED'].includes(o.status),
  );
  const phase: 'count' | 'held' | 'posting' = held ? 'held' : settled ? 'posting' : 'count';

  const postingNow = orders.filter((o) => s.postingOrderIds.includes(o.id)).length;
  const postedCount = orders.filter((o) => o.status === 'POSTED').length;

  // Separation of duties: predicted client-side purely as a warning. The
  // rejection itself comes from the API — we never gate on it here.
  const sodConflicts = orders.filter((o) => o.dispatchedBy === me.id || o.deliveredBy === me.id);

  function shout(e: unknown) {
    if (e instanceof RuleError) {
      setRuleError({ rule: e.rule, message: e.message });
      toast.error(`Rejected — ${e.rule}`, e.message);
    } else {
      const msg = e instanceof Error ? e.message : String(e);
      setRuleError({ rule: 'ERROR', message: msg });
      toast.error('Rejected', msg);
    }
  }

  async function submitCount() {
    setConfirmOpen(false);
    setRuleError(null);
    setBusy(true);
    try {
      const result = await api.reconcile({
        routeId: target.routeId,
        vehicleId: target.vehicleId,
        driverId: target.driverId,
        orderIds: target.orderIds,
        totalCashReceived: counted,
        notes: notes.trim() || undefined,
      });
      if (result.status === 'matched') {
        toast.success('Cash matched', `${orders.length} order(s) released to Oracle.`);
      } else {
        toast.warn(
          'Cash mismatch — held',
          'Nothing has been sent to Oracle. Investigate, then release.',
        );
      }
    } catch (e) {
      shout(e);
    } finally {
      setBusy(false);
    }
  }

  async function release() {
    if (!rec) return;
    setRuleError(null);
    setBusy(true);
    try {
      await api.resolveHold(rec.id, resolveNotes.trim());
      toast.success('Hold released', 'Orders reconciled and posting to Oracle.');
    } catch (e) {
      shout(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="border-b border-line bg-surface px-5 py-4">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
          <span className="inline-flex items-center gap-2 text-xl font-semibold text-fg">
            <Icons.Route className="h-5 w-5 text-fg-muted" />
            {route?.code} · {route?.name}
          </span>
          <span className="inline-flex items-center gap-2 text-base text-fg-muted">
            <Icons.Truck className="h-4 w-4 text-fg-muted" />
            <span className="font-mono text-fg">{vehicle?.registration}</span>
          </span>
          <span className="inline-flex items-center gap-2 text-base text-fg-muted">
            <Icons.User className="h-4 w-4 text-fg-muted" />
            {driver?.name}
          </span>
        </div>
        <p className="mt-2 text-base text-fg-muted">
          Counted by {me.name} ({me.role}). This is the only path to Oracle.
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        {/* ── Rule rejection ───────────────────────────────────────────── */}
        {ruleError && (
          <div className="mb-5 border border-danger bg-surface px-4 py-4">
            <div className="flex items-center gap-2">
              <Icons.XCircle className="h-5 w-5 text-danger" />
              <span className="text-lg font-semibold text-danger-fg">
                {t('Rejected by the server — rule')} {ruleError.rule}
              </span>
            </div>
            <p className="mt-2 text-base text-fg">{ruleError.message}</p>
            {ruleError.rule === 'SOD' && (
              <p className="mt-3 border-t border-line pt-3 text-base text-fg-muted">
                {t('Separation of duties. The person who dispatched or delivered an order can never be the person who confirms its cash — that is what stops a single employee from creating and closing a sale. The rule is enforced in the API, not in this screen.')}
              </p>
            )}
          </div>
        )}

        {sodConflicts.length > 0 && phase === 'count' && !ruleError && (
          <div className="mb-5 border border-warn bg-surface px-4 py-4 text-base text-warn-fg">
            <span className="font-semibold">Heads up:</span> you dispatched or delivered{' '}
            {sodConflicts.length} of these orders. The API will reject this confirmation under
            separation of duties — try it, the rejection is the point.
          </div>
        )}

        {/* ── Per-order breakdown ──────────────────────────────────────── */}
        <div className="border border-line">
          <table className="w-full text-base">
            <thead className="border-b border-line bg-surface text-base text-fg">
              <tr>
                <th className="px-3 py-3 text-left font-semibold">ECR / client</th>
                <th className="px-3 py-3 text-left font-semibold">Terms</th>
                <th className="px-3 py-3 text-right font-semibold">Delivered</th>
                <th className="px-3 py-3 text-right font-semibold">Empties</th>
                <th className="px-3 py-3 text-right font-semibold">Driver cash</th>
                <th className="px-3 py-3 text-right font-semibold">Expected</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {orders.map((o) => {
                const client = select.client(s, o.clientId);
                const ev = s.deliveryEvents.find((d) => d.orderId === o.id);
                const exp = expectedCash(o);
                const credit = client?.paymentTerms === 'credit';
                return (
                  <tr key={o.id} className="bg-surface">
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <EcrTag value={o.ecr ?? '—'} />
                        <StatusPill status={o.status} />
                      </div>
                      <div className="mt-1 truncate text-base text-fg-muted">{client?.name}</div>
                    </td>
                    <td className="px-3 py-3">
                      <Badge tone={credit ? 'info' : 'neutral'}>{client?.paymentTerms ?? '—'}</Badge>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-fg">
                      <Qty value={orderCylinders(o, 'qtyDelivered')} />
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-fg-muted">
                      <Qty value={orderCylinders(o, 'qtyReturned')} />
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-fg-muted">
                      <Money value={ev?.cashCollected ?? 0} />
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums font-medium text-fg">
                      {credit ? (
                        <span className="text-info-fg" title="Credit client — invoiced, no cash at the gate">
                          <Money value={0} />
                        </span>
                      ) : (
                        <Money value={exp} />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-line bg-surface">
                <td className="px-3 py-3 text-base text-fg-muted" colSpan={4}>
                  Credit clients contribute Rs 0 — their cylinders invoice against the account.
                </td>
                <td className="px-3 py-3 text-right tabular-nums text-fg-muted">
                  <Money value={driverCash} />
                </td>
                <td className="px-3 py-3 text-right text-lg tabular-nums font-semibold text-fg">
                  <Money value={expected} />
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* ── Phase: count ─────────────────────────────────────────────── */}
        {phase === 'count' && (
          <div className="mt-6 border border-line bg-surface p-5">
            <Field label={t('Cash physically counted at the gate (PKR)')}>
              <Input
                autoFocus
                size="lg"
                numeric
                inputMode="numeric"
                prefix="Rs"
                value={countStr}
                placeholder="0"
                onChange={(e: ChangeEvent<HTMLInputElement>) => setCountStr(e.target.value)}
              />
            </Field>

            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="ghost" onClick={() => setCountStr(String(expected))}>
                Exact ({expected.toLocaleString()})
              </Button>
              <Button variant="ghost" onClick={() => setCountStr(String(driverCash))}>
                Driver's figure ({driverCash.toLocaleString()})
              </Button>
              <Button
                variant="ghost"
                onClick={() => setCountStr(String(Math.max(0, expected - 5000)))}
              >
                Short by 5,000
              </Button>
            </div>

            <div
              className={[
                'mt-5 flex items-center justify-between gap-3 border bg-surface px-4 py-4',
                countStr.trim() === '' ? 'border-line' : balanced ? 'border-success' : 'border-danger',
              ].join(' ')}
            >
              <div>
                <div className="text-base text-fg-muted">{t('Variance')}</div>
                <div
                  className={[
                    'text-3xl font-semibold tabular-nums',
                    countStr.trim() === ''
                      ? 'text-fg-dim'
                      : balanced
                        ? 'text-success-fg'
                        : 'text-danger-fg',
                  ].join(' ')}
                >
                  {countStr.trim() === '' ? (
                    '—'
                  ) : (
                    <>
                      {variance > 0 ? '+' : ''}
                      <Money value={variance} />
                    </>
                  )}
                </div>
              </div>
              <div className="text-right text-base">
                {countStr.trim() === '' ? (
                  <span className="text-fg-muted">{t('Enter the counted cash to see the variance.')}</span>
                ) : balanced ? (
                  <span className="inline-flex items-center gap-2 font-medium text-success-fg">
                    <Icons.CheckCircle className="h-5 w-5" /> {t('Balanced — this will post to Oracle')}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2 font-medium text-danger-fg">
                    <Icons.Alert className="h-5 w-5" />
                    {variance < 0 ? t('Short by') : t('Over by')} <Money value={Math.abs(variance)} />{' '}
                    {t('— this will be held, nothing posts')}
                  </span>
                )}
              </div>
            </div>

            <Field label="Notes (optional)" className="mt-5">
              <Textarea
                rows={2}
                value={notes}
                placeholder="e.g. driver reports customer paid Rs 5,000 short, will settle tomorrow"
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
              />
            </Field>

            <div className="mt-5 flex items-center justify-end gap-3">
              <Button variant="ghost" size="lg" onClick={onClose} disabled={busy}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="lg"
                disabled={busy || countStr.trim() === ''}
                onClick={() => setConfirmOpen(true)}
              >
                {busy ? (
                  <span className="inline-flex items-center gap-2">
                    <Spinner /> {t('Confirming…')}
                  </span>
                ) : (
                  t('Confirm cash count')
                )}
              </Button>
            </div>
          </div>
        )}

        {/* ── Phase: held ──────────────────────────────────────────────── */}
        {phase === 'held' && (
          <div className="mt-6 border border-danger bg-surface p-5">
            <div className="flex items-center gap-2">
              <Icons.Lock className="h-5 w-5 text-danger" />
              <span className="text-xl font-semibold text-danger-fg">
                {t('Held — cash mismatch under investigation')}
              </span>
            </div>
            <p className="mt-3 text-base text-fg">
              Expected <Money value={rec?.totalCashExpected ?? expected} />, counted{' '}
              <Money value={rec?.totalCashReceived ?? counted} />.{' '}
              <span className="font-semibold text-danger-fg">
                {t('Nothing has been sent to Oracle.')}
              </span>{' '}
              These {orders.length} order(s) sit in MISMATCH_HELD and no ERP document exists for
              them. The sale cannot be recognised until a human resolves the difference.
            </p>
            {rec?.resolutionNotes && (
              <p className="mt-3 text-base text-fg-muted">Cashier note: {rec.resolutionNotes}</p>
            )}

            <Field label={t('Investigation outcome — required to release')} className="mt-4">
              <Textarea
                rows={3}
                value={resolveNotes}
                placeholder="e.g. Rs 5,000 recovered from the driver's float and re-counted with the gate supervisor present."
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                  setResolveNotes(e.target.value)
                }
              />
            </Field>

            <div className="mt-4 flex items-center justify-between gap-4">
              <p className="text-base text-fg-muted">
                Releasing moves the orders to RECONCILED and lets the Oracle post proceed. The note
                is written to the audit trail against your name.
              </p>
              <Button
                variant="primary"
                size="lg"
                disabled={busy || resolveNotes.trim().length < 4}
                onClick={release}
              >
                {busy ? (
                  <span className="inline-flex items-center gap-2">
                    <Spinner /> {t('Releasing…')}
                  </span>
                ) : (
                  t('Release hold & post')
                )}
              </Button>
            </div>
          </div>
        )}

        {/* ── Phase: posting ───────────────────────────────────────────── */}
        {phase === 'posting' && (
          <div className="mt-6 border border-line bg-surface p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Icons.Database className="h-5 w-5 text-fg-muted" />
                <span className="text-xl font-semibold text-fg">{t('Posting to Oracle')}</span>
              </div>
              <span className="text-base text-fg-muted tabular-nums">
                {postedCount} of {orders.length} posted
                {postingNow > 0 ? ` · ${postingNow} in flight` : ''}
              </span>
            </div>

            <ul className="mt-4 divide-y divide-line border border-line">
              {orders.map((o) => {
                const inFlight = s.postingOrderIds.includes(o.id);
                return (
                  <li key={o.id} className="flex items-center gap-3 bg-surface px-4 py-3">
                    <EcrTag value={o.ecr ?? '—'} />
                    <span className="min-w-0 flex-1 truncate text-base text-fg-muted">
                      {select.clientName(s, o.clientId)}
                    </span>
                    {inFlight ? (
                      <span className="inline-flex items-center gap-2 text-base text-info-fg">
                        <Spinner /> sending to Oracle…
                      </span>
                    ) : o.status === 'POSTED' ? (
                      <span className="inline-flex items-center gap-2 font-mono text-base text-success-fg">
                        <Icons.CheckCircle className="h-4 w-4" /> {o.oracleDocNo}
                      </span>
                    ) : o.status === 'POST_FAILED' ? (
                      <span className="inline-flex items-center gap-2 text-base text-danger-fg">
                        <Icons.XCircle className="h-4 w-4" /> failed — retry in the integration
                        console
                      </span>
                    ) : (
                      <span className="text-base text-fg-muted">queued</span>
                    )}
                  </li>
                );
              })}
            </ul>

            {orders.some((o) => o.status === 'POST_FAILED') && (
              <p className="mt-4 border border-warn px-4 py-3 text-base text-warn-fg">
                Oracle was unreachable. The cash is still reconciled and the ECR is unchanged — the
                post is queued for retry in the integration console. No data is lost and nothing is
                double-counted: the ECR is the idempotency key.
              </p>
            )}

            <div className="mt-5 flex items-center justify-between gap-3">
              <p className="text-base text-fg-muted">
                Reconciled{' '}
                {orders[0]?.reconciledAt && <Timestamp value={orders[0].reconciledAt} />} by{' '}
                {select.user(s, orders[0]?.reconciledBy)?.name ?? me.name}.
              </p>
              <Button variant="secondary" size="lg" onClick={onClose}>
                Done
              </Button>
            </div>
          </div>
        )}

        <p className="mt-6 border-t border-line pt-4 text-base leading-relaxed text-fg-muted">
          <span className="font-semibold text-fg">In short:</span> a matched cash
          reconciliation is the only event that enqueues an Oracle post. Dispatch allocates the ECR;
          delivery and confirmation capture the evidence; this screen releases the money. Nothing
          else in the system can create an ERP document.
        </p>
      </div>

      {/* ── Confirmation modal: says what happens next ─────────────────── */}
      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={balanced ? t('Confirm a matched cash count') : t('Confirm a cash mismatch')}
      >
        <div className="space-y-4 text-base text-fg">
          <p>
            You counted <span className="font-semibold tabular-nums"><Money value={counted} /></span>{' '}
            against <span className="font-semibold tabular-nums"><Money value={expected} /></span>{' '}
            expected for {orders.length} order(s) on {route?.code}.
          </p>
          {balanced ? (
            <p className="border border-success px-4 py-3 text-success-fg">
              The count balances. Confirming moves these orders to RECONCILED and immediately posts
              each one to Oracle under its ECR. An Oracle document number is returned per order and
              cannot be reissued.
            </p>
          ) : (
            <p className="border border-danger px-4 py-3 text-danger-fg">
              The count does not balance ({variance < 0 ? 'short' : 'over'} by{' '}
              <Money value={Math.abs(variance)} />). Confirming moves these orders to MISMATCH_HELD
              and <span className="font-semibold">nothing will be sent to Oracle</span> until the
              difference is investigated and released.
            </p>
          )}
          <p className="text-base text-fg-muted">
            This action is recorded in the audit trail against {me.name} ({me.role}).
          </p>
        </div>
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="ghost" size="lg" onClick={() => setConfirmOpen(false)}>
            Back
          </Button>
          <Button
            variant={balanced ? 'primary' : 'danger'}
            size="lg"
            onClick={submitCount}
            disabled={busy}
          >
            {balanced ? 'Confirm & post to Oracle' : 'Confirm mismatch & hold'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
