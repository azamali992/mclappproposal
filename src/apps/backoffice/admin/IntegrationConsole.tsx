// ─── Oracle integration console ──────────────────────────────────────────────
// Every attempt to post a sale to Oracle ORDS, with the exact request and
// response bodies. Includes the demo fault-injection switch: take Oracle down,
// reconcile a route, watch the post fail into the retry queue, bring Oracle
// back, retry, watch it succeed under the same ECR.

import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { api, useStore, useCurrentUser, select, RuleError } from '../../../core/store';
import type { ErpPostLog } from '../../../core/types';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Badge,
  StatusPill,
  Table,
  THead,
  TBody,
  TR,
  TH,
  TD,
  Toggle,
  CodeBlock,
  SectionTitle,
  StatTile,
  Spinner,
  EmptyState,
  EcrTag,
  Timestamp,
  Money,
  useToast,
} from '../../../ui/primitives';
import * as Icons from '../../../ui/icons';
import { useT } from '../../../i18n';

export default function IntegrationConsole() {
  const s = useStore((x) => x);
  const me = useCurrentUser();
  const toast = useToast();

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const t = useT();
  const [retrying, setRetrying] = useState<number[]>([]);

  const logs = s.erpPostLogs;
  const selected = useMemo(
    () => logs.find((l) => l.id === selectedId) ?? logs[0],
    [logs, selectedId],
  );

  const succeeded = logs.filter((l) => l.status === 'success');
  const failed = logs.filter((l) => l.status === 'failed');
  const inFlight = logs.filter((l) => l.status === 'pending');
  const failedOrderIds = useMemo(
    () => [...new Set(s.orders.filter((o) => o.status === 'POST_FAILED').map((o) => o.id))],
    [s.orders],
  );

  async function retry(orderId: number) {
    setRetrying((x) => [...x, orderId]);
    try {
      await api.retryPost(orderId);
      const order = select.order(s, orderId);
      const done = order?.oracleDocNo;
      toast.success('Retry complete', done ? `Oracle document ${done}.` : 'See the attempt log.');
    } catch (e) {
      if (e instanceof RuleError) toast.error(`Rejected — ${e.rule}`, e.message);
      else toast.error('Retry failed', e instanceof Error ? e.message : String(e));
    } finally {
      setRetrying((x) => x.filter((id) => id !== orderId));
    }
  }

  function toggleOracle(up: boolean) {
    try {
      api.setOracleUp(up);
      if (up) toast.success('Oracle endpoint restored', 'Retries will now succeed.');
      else toast.warn('Oracle endpoint marked down', 'New posts will fail into the retry queue.');
    } catch (e) {
      if (e instanceof RuleError) toast.error(`Rejected — ${e.rule}`, e.message);
      else toast.error('Rejected', e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="mx-auto max-w-[1500px] px-6 py-6">
      <header className="mb-5">
        <h1 className="text-xl font-semibold tracking-tight text-fg">{t('Integration console')}</h1>
        <p className="mt-2 text-base text-fg-muted">
          {t('Oracle ORDS posting — every attempt, its payload, its response, and its retry. The ECR is the idempotency key, so a document can never be raised twice.')}
        </p>
      </header>

      {/* ── Demo control ───────────────────────────────────────────────── */}
      <Card className="mb-5">
        <CardBody className="flex flex-wrap items-center justify-between gap-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Badge tone="warn">{t('Demo control')}</Badge>
              <span className="text-xl font-semibold text-fg">{t('Oracle ORDS endpoint')}</span>
              <Badge tone={s.oracleUp ? 'success' : 'danger'} dot>
                {s.oracleUp ? 'reachable' : 'unreachable'}
              </Badge>
            </div>
            <p className="mt-2 max-w-2xl text-base leading-relaxed text-fg-muted">
              Fault injection for the stage: flip Oracle down, reconcile a route in the cashier
              screen, and the post fails into the queue below with the cash still reconciled and the
              ECR unchanged. Flip it back, press Retry, and the same ECR posts once and returns a
              document number. This is the outage story the operations team lives with today.
            </p>
          </div>
          <Toggle
            checked={s.oracleUp}
            onChange={toggleOracle}
            size="lg"
            label={s.oracleUp ? t('Oracle up') : t('Oracle down')}
            hint="simulated ORDS availability"
          />
        </CardBody>
      </Card>

      {/* ── Counters ───────────────────────────────────────────────────── */}
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Attempts logged" value={logs.length} icon={Icons.Database} hint="append-only" />
        <StatTile label="Succeeded" value={succeeded.length} icon={Icons.CheckCircle} />
        <StatTile
          label="Failed"
          value={failed.length}
          icon={Icons.XCircle}
          hint={`${failedOrderIds.length} order(s) awaiting retry`}
        />
        <StatTile
          label="In flight"
          value={inFlight.length}
          icon={Icons.Sync}
          hint={s.postingOrderIds.length ? 'posting now' : 'idle'}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        {/* ── Attempt log ─────────────────────────────────────────────── */}
        <div className="xl:col-span-3">
          <Card>
            <CardHeader
              title={t('Post attempts')}
              subtitle="Newest first · click a row to inspect the payload"
            />
            <CardBody className="p-0">
              {logs.length === 0 ? (
                <EmptyState title="No posts yet" description="Reconcile a route to raise one." />
              ) : (
                <Table scrollHeight="30rem">
                  <THead sticky>
                    <TR>
                      <TH>ECR</TH>
                      <TH>Order</TH>
                      <TH numeric>Attempt</TH>
                      <TH numeric>HTTP</TH>
                      <TH>Result</TH>
                      <TH>When</TH>
                      <TH>Oracle document</TH>
                      <TH />
                    </TR>
                  </THead>
                  <TBody>
                    {logs.map((l) => {
                      const order = select.order(s, l.orderId);
                      const busy = retrying.includes(l.orderId) || s.postingOrderIds.includes(l.orderId);
                      return (
                        <TR
                          key={l.id}
                          interactive
                          active={selected?.id === l.id}
                          onClick={() => setSelectedId(l.id)}
                        >
                          <TD>
                            <EcrTag value={l.ecr} />
                          </TD>
                          <TD muted>
                            #{l.orderId}
                            {order && (
                              <span className="ms-2 text-base text-fg-muted">
                                {select.clientName(s, order.clientId)}
                              </span>
                            )}
                          </TD>
                          <TD numeric>{l.attemptNo}</TD>
                          <TD numeric>
                            <span
                              className={
                                l.httpStatus && l.httpStatus < 300 ? 'text-success-fg' : 'text-danger-fg'
                              }
                            >
                              {l.httpStatus ?? '—'}
                            </span>
                          </TD>
                          <TD>
                            <ResultBadge log={l} />
                          </TD>
                          <TD muted>
                            <Timestamp value={l.createdAt} />
                          </TD>
                          <TD>
                            {l.oracleDocNo ? (
                              <span className="font-mono text-base text-success-fg">{l.oracleDocNo}</span>
                            ) : (
                              <span className="text-base text-fg-muted">—</span>
                            )}
                          </TD>
                          <TD align="right">
                            {l.status === 'failed' ? (
                              <Button
                                size="sm"
                                variant="secondary"
                                loading={busy}
                                disabled={busy}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void retry(l.orderId);
                                }}
                              >
                                Retry
                              </Button>
                            ) : l.status === 'success' ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                loading={busy}
                                disabled={busy}
                                title="Replays the post — the ECR is the idempotency key, so Oracle returns the existing document"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void retry(l.orderId);
                                }}
                              >
                                Replay
                              </Button>
                            ) : (
                              <span className="inline-flex items-center gap-2 text-base text-info-fg">
                                <Spinner /> posting
                              </span>
                            )}
                          </TD>
                        </TR>
                      );
                    })}
                  </TBody>
                </Table>
              )}
            </CardBody>
          </Card>

          <p className="mt-4 border border-line bg-surface px-4 py-4 text-base leading-relaxed text-fg-muted">
            <span className="font-semibold text-fg">Idempotency.</span> Every request carries{' '}
            <span className="font-mono">idempotency_key = ecr</span>. Replaying an ECR that already
            succeeded returns the existing document number instead of raising a second sales order —
            press <span className="font-medium text-fg">Replay</span> on a green row and watch the
            document number stay the same. Acting as {me.name} ({me.role}); retries are restricted to
            admin and cashier.
          </p>
        </div>

        {/* ── Inspector ───────────────────────────────────────────────── */}
        <div className="xl:col-span-2">
          {selected ? (
            <Inspector log={selected} retrying={retrying.includes(selected.orderId)} onRetry={retry} />
          ) : (
            <Card>
              <CardBody>
                <EmptyState title="Select an attempt" description="Its request and response appear here." />
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Result badge ────────────────────────────────────────────────────────────

function ResultBadge({ log }: { log: ErpPostLog }) {
  if (log.status === 'success') return <Badge tone="success" dot>posted</Badge>;
  if (log.status === 'pending')
    return (
      <Badge tone="info" dot>
        in flight
      </Badge>
    );
  return (
    <Badge tone="danger" dot>
      {log.errorClass === 'terminal' ? 'terminal' : 'retryable'}
    </Badge>
  );
}

// ─── Payload inspector ───────────────────────────────────────────────────────

function Inspector({
  log,
  retrying,
  onRetry,
}: {
  log: ErpPostLog;
  retrying: boolean;
  onRetry: (orderId: number) => void;
}) {
  const s = useStore((x) => x);
  const order = select.order(s, log.orderId);
  const posting = s.postingOrderIds.includes(log.orderId);

  // What the service would send if it posted this order right now.
  let livePayload: unknown;
  let payloadError: string | null = null;
  try {
    livePayload = api.buildOraclePayload(log.orderId);
  } catch (e) {
    payloadError = e instanceof Error ? e.message : String(e);
  }

  return (
    <Card className="sticky top-4">
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <EcrTag value={log.ecr} />
            <span className="text-base text-fg-muted">attempt {log.attemptNo}</span>
          </span>
        }
        subtitle={
          order ? (
            <span className="flex items-center gap-2">
              {select.clientName(s, order.clientId)} · <StatusPill status={order.status} />
            </span>
          ) : undefined
        }
        action={
          log.status === 'failed' ? (
            <Button
              size="sm"
              variant="primary"
              loading={retrying || posting}
              disabled={retrying || posting}
              icon={Icons.Refresh}
              onClick={() => onRetry(log.orderId)}
            >
              Retry post
            </Button>
          ) : log.oracleDocNo ? (
            <Badge tone="success">{log.oracleDocNo}</Badge>
          ) : undefined
        }
      />
      <CardBody className="space-y-4">
        {order && (
          <div className="grid grid-cols-2 gap-3 text-base">
            <Kv label="Order value">
              <Money value={order.lines.reduce((n, l) => n + (l.qtyDelivered ?? 0) * l.unitPrice, 0)} />
            </Kv>
            <Kv label="Posted at">
              {order.postedAt ? <Timestamp value={order.postedAt} /> : '—'}
            </Kv>
            <Kv label="Reconciled by">{select.user(s, order.reconciledBy)?.name ?? '—'}</Kv>
            <Kv label="Idempotency key">
              <span className="font-mono">{log.ecr}</span>
            </Kv>
          </div>
        )}

        <CodeBlock
          title="Request — POST /ords/mcl/sales/orders"
          code={log.requestPayload}
          maxHeight="16rem"
        />

        <CodeBlock
          title={`Response — HTTP ${log.httpStatus ?? '…'}`}
          code={log.responseBody ?? { status: 'awaiting response' }}
          maxHeight="12rem"
          action={
            <Badge tone={log.status === 'success' ? 'success' : log.status === 'pending' ? 'info' : 'danger'}>
              {log.status}
            </Badge>
          }
        />

        {log.status === 'failed' && (
          <p className="border border-warn px-4 py-3 text-base leading-relaxed text-warn-fg">
            {log.errorClass === 'terminal'
              ? 'Terminal error — Oracle rejected the document itself (closed period, unknown customer). Retrying the same payload will fail again; the data or the period has to change first.'
              : 'Retryable error — the endpoint was unreachable. The payload is valid and the retry is safe: the ECR guarantees it cannot post twice.'}
          </p>
        )}

        <div>
          <SectionTitle subtitle="api.buildOraclePayload — what the service would send for this order right now.">
            Live payload
          </SectionTitle>
          <div className="mt-2">
            {payloadError ? (
              <p className="border border-danger px-4 py-3 text-base text-danger-fg">
                {payloadError}
              </p>
            ) : (
              <CodeBlock code={livePayload} maxHeight="16rem" />
            )}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

function Kv({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="border border-line bg-surface px-3 py-2.5">
      <div className="text-base text-fg-muted">{label}</div>
      <div className="mt-1 text-fg">{children}</div>
    </div>
  );
}
