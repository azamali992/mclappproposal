// ─── Oracle integration console ──────────────────────────────────────────────
// One job: the posts that failed, and the button that sends them again.
//
// Everything else — the full attempt history, the request/response JSON and the
// live payload — is real and still here, but it is evidence rather than work,
// so it sits behind one "Show the detail" toggle. The Oracle up/down switch
// stays in the open: it is driven live on stage.
//
// The demo: flip Oracle down, reconcile a route in the cashier screen, watch
// the post drop into the list below, flip Oracle back, press Retry, and the
// same ECR posts once and returns a document number.

import { useMemo, useState } from 'react';
import { api, useStore, select, RuleError } from '../../../core/store';
import type { ErpPostLog } from '../../../core/types';
import {
  Button,
  Table,
  THead,
  TBody,
  TR,
  TH,
  TD,
  Toggle,
  CodeBlock,
  Spinner,
  EcrTag,
  Timestamp,
  useToast,
} from '../../../ui/primitives';
import { useT } from '../../../i18n';

export default function IntegrationConsole() {
  const s = useStore((x) => x);
  const toast = useToast();

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const t = useT();
  const [retrying, setRetrying] = useState<number[]>([]);

  const logs = s.erpPostLogs;
  const selected = useMemo(
    () => logs.find((l) => l.id === selectedId) ?? logs[0],
    [logs, selectedId],
  );

  // The work: one row an order that is actually waiting to be sent again, with
  // its most recent failed attempt for the error class.
  const failedPosts = useMemo(
    () =>
      s.orders
        .filter((o) => o.status === 'POST_FAILED')
        .map((o) => ({
          order: o,
          log: [...logs].reverse().find((l) => l.orderId === o.id && l.status === 'failed'),
        })),
    [s.orders, logs],
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
    <div className="mx-auto max-w-[1100px] px-6 py-6">
      <header className="mb-4">
        <h1 className="text-xl font-semibold leading-tight text-fg">{t('Integration console')}</h1>
        <p className="mt-1 text-base text-fg-muted">
          {failedPosts.length === 1
            ? t('One post waiting to be sent again. The ECR is the idempotency key, so nothing can post twice.')
            : t('{n} posts waiting to be sent again. The ECR is the idempotency key, so nothing can post twice.', {
                n: failedPosts.length,
              })}
        </p>
      </header>

      {/* ── Demo control — stays visible, it is used live on stage ───────── */}
      <div className="mb-4 border border-line px-4 py-3">
        <Toggle
          checked={s.oracleUp}
          onChange={toggleOracle}
          size="lg"
          label={s.oracleUp ? t('Oracle up') : t('Oracle down')}
        />
      </div>

      {/* ── The job: failed posts, one row, one button ───────────────────── */}
      {failedPosts.length === 0 ? (
        <p className="border border-line px-4 py-4 text-base text-fg-muted">
          {t('Nothing failed. Every reconciled sale has reached Oracle.')}
        </p>
      ) : (
        <ul className="border border-danger">
          {failedPosts.map(({ order, log }) => {
            const busy = retrying.includes(order.id) || s.postingOrderIds.includes(order.id);
            const terminal = log?.errorClass === 'terminal';
            return (
              <li
                key={order.id}
                className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3 last:border-b-0"
              >
                <span className="min-w-0 flex-1 text-base text-fg">
                  {t('{ecr} · {client}', {
                    ecr: order.ecr ?? `#${order.id}`,
                    client: select.clientName(s, order.clientId),
                  })}
                </span>
                <span className="whitespace-nowrap border border-danger px-2 py-0.5 text-base text-danger-fg">
                  {terminal ? t('Will not work again') : t('Safe to send again')}
                </span>
                <Button
                  size="lg"
                  variant="primary"
                  loading={busy}
                  disabled={busy}
                  onClick={() => void retry(order.id)}
                >
                  {t('Send it again')}
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      {/* ── Evidence, on request ─────────────────────────────────────────── */}
      <div className="mt-4">
        <Button size="lg" variant="ghost" onClick={() => setShowDetail((v) => !v)}>
          {showDetail ? t('Hide the detail') : t('Show the detail')}
        </Button>
      </div>

      {showDetail && (
        <div className="mt-3 space-y-4">
          <p className="text-base text-fg-muted">
            {t('Every attempt is kept. Every request carries idempotency_key = ecr, so replaying an ECR that already posted returns the same document number instead of raising a second sales order.')}
          </p>

          {logs.length === 0 ? (
            <p className="border border-line px-4 py-4 text-base text-fg-muted">
              {t('No posts yet.')}
            </p>
          ) : (
            <Table scrollHeight="24rem">
              <THead sticky>
                <TR>
                  <TH>ECR</TH>
                  <TH numeric>Attempt</TH>
                  <TH numeric>HTTP</TH>
                  <TH>When</TH>
                  <TH>Oracle document</TH>
                  <TH />
                </TR>
              </THead>
              <TBody>
                {logs.map((l) => {
                  const busy =
                    retrying.includes(l.orderId) || s.postingOrderIds.includes(l.orderId);
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
                      <TD numeric>{l.attemptNo}</TD>
                      <TD numeric>
                        <span
                          className={
                            l.httpStatus && l.httpStatus < 300
                              ? 'text-success-fg'
                              : 'text-danger-fg'
                          }
                        >
                          {l.httpStatus ?? '—'}
                        </span>
                      </TD>
                      <TD muted>
                        <Timestamp value={l.createdAt} />
                      </TD>
                      <TD>
                        {l.oracleDocNo ? (
                          <span className="font-mono text-base text-success-fg">
                            {l.oracleDocNo}
                          </span>
                        ) : (
                          <span className="text-base text-fg-muted">—</span>
                        )}
                      </TD>
                      <TD align="right">
                        {l.status === 'pending' ? (
                          <Spinner />
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            loading={busy}
                            disabled={busy}
                            onClick={(e) => {
                              e.stopPropagation();
                              void retry(l.orderId);
                            }}
                          >
                            {l.status === 'failed' ? t('Send it again') : t('Replay')}
                          </Button>
                        )}
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          )}

          {selected && <Payload log={selected} />}
        </div>
      )}
    </div>
  );
}

// ─── Raw request and response for the selected attempt ───────────────────────

function Payload({ log }: { log: ErpPostLog }) {
  let livePayload: unknown;
  let payloadError: string | null = null;
  try {
    livePayload = api.buildOraclePayload(log.orderId);
  } catch (e) {
    payloadError = e instanceof Error ? e.message : String(e);
  }

  return (
    <div className="space-y-3">
      <CodeBlock
        title="Request — POST /ords/mcl/sales/orders"
        code={log.requestPayload}
        maxHeight="14rem"
      />
      <CodeBlock
        title={`Response — HTTP ${log.httpStatus ?? '…'}`}
        code={log.responseBody ?? { status: 'awaiting response' }}
        maxHeight="12rem"
      />
      {payloadError ? (
        <p className="border border-danger px-4 py-3 text-base text-danger-fg">{payloadError}</p>
      ) : (
        <CodeBlock title="api.buildOraclePayload" code={livePayload} maxHeight="14rem" />
      )}
    </div>
  );
}
