// ─── ConfirmSheet ────────────────────────────────────────────────────────────
// The moment the tablet changes hands. Two confirmation methods, both real:
//
//   signature — captured to a data URL and stored on the confirmation_event
//   OTP       — a 6-digit code the store issues; in production an SMS.
//
// The client's `confirmMethod` chooses the default, but the driver can always
// override: the person standing at the gate is not always the person whose
// phone the code went to.
//
// The rejection path is deliberately reachable. A wrong OTP throws a RuleError
// and we show it — that is the proof the rule lives in the backend, not here.

import { useState } from 'react';
import type { Order } from '../../core/types';
import { api, select } from '../../core/store';
import { Signature, Lock, Alert, Check, X, Bell } from '../../ui/icons';
import { useT } from '../../i18n';
import { Btn, Chip, Sheet, Sig, TextArea, useAll, useGuard, useNotify } from './index';

type Mode = 'signature' | 'otp' | 'dispute';

interface Props {
  open: boolean;
  order: Order;
  onClose: () => void;
  onSettled: () => void;
}

export default function ConfirmSheet({ open, order, onClose, onSettled }: Props) {
  const s = useAll();
  const t = useT();
  const guard = useGuard();
  const notify = useNotify();

  const client = select.client(s, order.clientId);
  const preferred: Mode = client?.confirmMethod === 'otp' ? 'otp' : 'signature';

  const [mode, setMode] = useState<Mode>(preferred);
  const [signature, setSignature] = useState<string | null>(null);
  const [padKey, setPadKey] = useState(0);
  const [issuedCode, setIssuedCode] = useState<string | null>(null);
  const [showCode, setShowCode] = useState(true);
  const [entry, setEntry] = useState('');
  const [notes, setNotes] = useState('');
  const [disputeArmed, setDisputeArmed] = useState(false);

  function reset() {
    setMode(preferred);
    setSignature(null);
    setIssuedCode(null);
    setEntry('');
    setNotes('');
    setDisputeArmed(false);
  }

  function close() {
    reset();
    onClose();
  }

  function sendOtp() {
    const code = guard(() => api.requestOtp(order.id));
    if (!code) return;
    setIssuedCode(code);
    setShowCode(true);
    setEntry('');
    notify(
      'info',
      t('Code sent to {phone}', { phone: client?.contactNumber ?? '' }),
      t('Six digits, single use. It is consumed the moment it verifies.'),
    );
  }

  function confirmSignature() {
    if (!signature) return;
    const ok = guard(() => {
      api.confirmDelivery({ orderId: order.id, method: 'signature', signatureDataUrl: signature, notes: notes || undefined });
      return true;
    });
    if (!ok) return;
    notify(
      'success',
      t('Delivery confirmed by signature'),
      t('Written to confirmation_event — append-only, never edited.'),
    );
    reset();
    onSettled();
  }

  function confirmOtp() {
    const ok = guard(() => {
      api.confirmDelivery({ orderId: order.id, method: 'otp', otpCode: entry, notes: notes || undefined });
      return true;
    });
    if (!ok) {
      setEntry('');
      return;
    }
    notify('success', t('Delivery confirmed by OTP'), t('The code is now consumed — it cannot be replayed.'));
    reset();
    onSettled();
  }

  function dispute() {
    const ok = guard(() => {
      api.disputeDelivery(order.id, notes);
      return true;
    });
    if (!ok) return;
    notify(
      'warn',
      t('Dispute recorded'),
      t('The drop stays on record. Nothing about this order posts to Oracle until the office resolves it.'),
    );
    reset();
    onSettled();
  }

  return (
    <Sheet
      open={open}
      onClose={close}
      size="lg"
      title={mode === 'dispute' ? t('Client disputes this delivery') : t('Client confirmation')}
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <p className="max-w-[420px] text-base leading-snug text-fg-dim">
            {mode === 'dispute'
              ? t('A dispute is an event on top of the delivery, not a deletion. Both stay in the record.')
              : t('Confirmation moves ECR {ecr} to CONFIRMED and unlocks the gate cashier. It does not post to Oracle — only matched cash does that.', { ecr: order.ecr ?? '' })}
          </p>
          <div className="flex shrink-0 gap-2">
            <Btn variant="ghost" size="lg" onClick={close}>
              {t('Not now')}
            </Btn>
            {mode === 'signature' && (
              <Btn variant="primary" size="lg" disabled={!signature} onClick={confirmSignature}>
                {t('Confirm delivery')}
              </Btn>
            )}
            {mode === 'otp' && (
              <Btn variant="primary" size="lg" disabled={entry.length !== 6} onClick={confirmOtp}>
                {t('Verify code')}
              </Btn>
            )}
            {mode === 'dispute' && (
              <Btn variant="danger" size="lg" disabled={!disputeArmed || notes.trim().length < 4} onClick={dispute}>
                {t('Record dispute')}
              </Btn>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* ── Who is confirming ─────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-line bg-surface px-4 py-3">
          <div>
            <div className="text-lg font-semibold text-fg">{client?.name}</div>
            <div className="text-md text-fg-muted">
              {client?.address} ·{' '}
              {/* Phone number: Latin digits, forced LTR. */}
              <span className="font-mono" dir="ltr">{client?.contactNumber}</span>
            </div>
          </div>
          <Chip tone="neutral">
            {t('Client default: {method}', {
              method: client?.confirmMethod === 'otp' ? t('OTP') : t('Signature'),
            })}
          </Chip>
        </div>

        {/* ── Method switch ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-2">
          <MethodTab
            active={mode === 'signature'}
            onClick={() => setMode('signature')}
            icon={<Signature className="h-5 w-5" />}
            label={t('Signature')}
            sub={t('Sign on the glass')}
          />
          <MethodTab
            active={mode === 'otp'}
            onClick={() => setMode('otp')}
            icon={<Lock className="h-5 w-5" />}
            label={t('OTP')}
            sub={t('Code to their phone')}
          />
          <MethodTab
            active={mode === 'dispute'}
            onClick={() => setMode('dispute')}
            icon={<Alert className="h-5 w-5" />}
            label={t('Dispute')}
            sub={t('Something is wrong')}
            danger
          />
        </div>

        {/* ── Signature ─────────────────────────────────────────────────── */}
        {mode === 'signature' && (
          <div className="rounded-md border border-line bg-surface p-4">
            <div className="mb-2.5 flex items-center justify-between gap-3">
              <p className="text-md text-fg-muted">
                {t('Ask the client to sign below to confirm the cylinders and the cash.')}
              </p>
              <Btn
                variant="secondary"
                size="md"
                className="min-h-[44px] shrink-0"
                onClick={() => {
                  setSignature(null);
                  setPadKey((k) => k + 1);
                }}
              >
                {t('Clear')}
              </Btn>
            </div>
            {/* The pad keeps a 2px boundary: it is a writing surface the client
                has to find on a white screen, not a decorative frame. */}
            <div className="overflow-hidden rounded-md border-2 border-line-strong bg-surface">
              <Sig
                key={padKey}
                label={t('Received by {name}', { name: client?.name ?? t('Customer') })}
                onChange={(d) => setSignature(d)}
                height={190}
              />
            </div>
            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
              <span className="text-base text-fg-dim">
                {t('Signed at the gate · {date}', { date: new Date().toLocaleDateString('en-GB') })}
              </span>
              {signature ? (
                <span className="flex items-center gap-1.5 text-md font-semibold text-success-fg">
                  <Check className="h-5 w-5" /> {t('Signature captured')}
                </span>
              ) : (
                <span className="text-md text-fg-dim">{t('Waiting for a signature…')}</span>
              )}
            </div>
          </div>
        )}

        {/* ── OTP ───────────────────────────────────────────────────────── */}
        {mode === 'otp' && (
          <div className="rounded-md border border-line bg-surface p-4">
            {!issuedCode ? (
              <div className="py-3 text-center">
                <Lock className="mx-auto h-9 w-9 text-fg-dim" />
                <p className="mx-auto mt-2.5 max-w-[440px] text-md text-fg-muted">
                  {t('A single-use 6-digit code goes to the number on the client’s account. They read it out; you type it in. No paper, no forged signature.')}
                </p>
                <Btn variant="primary" size="lg" className="mt-4 min-h-[56px] px-6" onClick={sendOtp}>
                  {t('Send code to {phone}', { phone: client?.contactNumber ?? '' })}
                </Btn>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Demo affordance — in production this pane does not exist. */}
                <div className="rounded-md border border-line bg-surface p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-base font-semibold text-info-fg">
                      <Bell className="h-4 w-4" /> {t('Demo only — the SMS would say')}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowCode((v) => !v)}
                      className="min-h-[44px] px-2 text-base text-fg-muted underline"
                    >
                      {showCode ? t('Hide') : t('Show')}
                    </button>
                  </div>
                  <div className="mt-2 rounded-md border border-line p-3">
                    <p className="text-md leading-relaxed text-fg-muted">
                      {/* The SMS body is what the handset actually receives. It is
                          sent in English by the gateway today, so it is shown as
                          sent rather than translated — the ECR and the code are
                          identifiers in any case. */}
                      <span dir="ltr" className="inline-block">
                        MCL: your delivery code for ECR {order.ecr} is{' '}
                        <span className="font-mono text-xl font-bold tracking-[0.25em] text-fg">
                          {showCode ? issuedCode : '••••••'}
                        </span>
                        . Do not share.
                      </span>
                    </p>
                  </div>
                  <p className="mt-2.5 text-base leading-snug text-fg-dim">
                    {t('In the field this pane does not exist — the code only ever reaches the client’s handset. Type a wrong code to watch the backend reject it.')}
                  </p>
                  <Btn variant="secondary" size="md" className="mt-2 min-h-[44px]" onClick={sendOtp}>
                    {t('Resend a new code')}
                  </Btn>
                </div>

                <div>
                  <div className="text-md font-semibold text-fg">{t('Enter the code')}</div>
                  {/* The six boxes fill left-to-right in both languages: the code
                      is a Latin numeral string read out over a phone. */}
                  <div className="mt-2 flex gap-2" dir="ltr">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div
                        key={i}
                        className={
                          'flex h-16 flex-1 items-center justify-center rounded-md border text-3xl font-bold tabular-nums ' +
                          (entry[i] ? 'border-fg text-fg' : 'border-line-strong text-fg-dim')
                        }
                      >
                        {entry[i] ?? ''}
                      </div>
                    ))}
                  </div>
                  <Keypad
                    onDigit={(d) => setEntry((e) => (e.length < 6 ? e + d : e))}
                    onBack={() => setEntry((e) => e.slice(0, -1))}
                    onClear={() => setEntry('')}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Dispute ───────────────────────────────────────────────────── */}
        {mode === 'dispute' && (
          <div className="rounded-md border border-danger bg-danger-soft p-4">
            <p className="text-md text-fg-muted">
              {t('Record what the client is disputing in their words. This is the entry the office reads tomorrow morning, so be specific — quantity, condition, or price.')}
            </p>
            <div className="mt-3">
              <TextArea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder={t('e.g. Client counted 4 cylinders, not 6. Refused to sign until the office calls.')}
              />
            </div>
            <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-md border border-line bg-surface p-4">
              <input
                type="checkbox"
                checked={disputeArmed}
                onChange={(e) => setDisputeArmed(e.target.checked)}
                className="mt-0.5 h-6 w-6 shrink-0 accent-danger"
              />
              <span className="text-md text-fg-muted">
                {t('I understand this flags ECR {ecr} as DISPUTED, blocks it from cash reconciliation, and stops it reaching Oracle until the office resolves it. The delivery record itself is kept, not deleted.', { ecr: order.ecr ?? '—' })}
              </span>
            </label>
          </div>
        )}

        {/* ── Optional note on the confirmation ─────────────────────────── */}
        {mode !== 'dispute' && (
          <div>
            <div className="mb-2 text-md text-fg-muted">
              {t('Note on the confirmation (optional)')}
            </div>
            <TextArea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder={t('e.g. 2 cylinders short — customer accepted, will collect next run.')}
            />
          </div>
        )}
      </div>
    </Sheet>
  );
}

// ─── Pieces ──────────────────────────────────────────────────────────────────

function MethodTab({
  active,
  onClick,
  icon,
  label,
  sub,
  danger,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  sub: string;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'flex min-h-[68px] items-center gap-3 rounded-md border bg-surface px-4 py-3 text-start ' +
        (active
          ? danger
            ? 'border-danger text-danger-fg'
            : 'border-fg text-fg'
          : 'border-line text-fg-muted')
      }
    >
      <span className="shrink-0">{icon}</span>
      <span className="min-w-0 leading-tight">
        <span className={'block text-md ' + (active ? 'font-semibold' : 'font-normal')}>{label}</span>
        <span className="block truncate text-base">{sub}</span>
      </span>
    </button>
  );
}

/**
 * Numeric keypad. Kept in LTR digit order in both languages — a phone keypad
 * does not mirror, and the OTP is read out as a Latin numeral string. Only the
 * two edit keys carry meaning, and backspace uses a glyph that already reads
 * correctly in an RTL run.
 */
function Keypad({
  onDigit,
  onBack,
  onClear,
}: {
  onDigit: (d: string) => void;
  onBack: () => void;
  onClear: () => void;
}) {
  const t = useT();
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
  // 64px keys, plain white, one hairline border. No scale bounce, no hover
  // tint shift — a keypad on a tablet at a gate needs size, not feedback
  // animation.
  const cls =
    'flex h-16 items-center justify-center rounded-md border border-line-strong bg-surface text-2xl font-semibold tabular-nums text-fg active:bg-line-soft';
  return (
    <div className="mt-3 grid grid-cols-3 gap-2" dir="ltr">
      {keys.map((k) => (
        <button key={k} type="button" className={cls} onClick={() => onDigit(k)}>
          {k}
        </button>
      ))}
      <button type="button" className={cls + ' text-fg-dim'} onClick={onClear} aria-label={t('Clear')}>
        <X className="h-6 w-6" />
      </button>
      <button type="button" className={cls} onClick={() => onDigit('0')}>
        0
      </button>
      <button type="button" className={cls + ' text-fg-dim'} onClick={onBack} aria-label={t('Backspace')}>
        ⌫
      </button>
    </div>
  );
}
