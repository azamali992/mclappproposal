// ─── Presenter's script ──────────────────────────────────────────────────────
// A slide-over the presenter can open with "?" mid-demo. Written to be read
// aloud — each beat names the role to switch to, what to click, and the one
// sentence that lands the point.

import { useEffect } from 'react';
import { api, useStore } from './core/store';

interface Beat {
  role: string;
  title: string;
  clicks: string[];
  point: string;
  userId?: number;
}

const BEATS: Beat[] = [
  {
    role: 'Dealer',
    userId: 1,
    title: 'The customer orders from their own phone',
    clicks: [
      'Place Order → pick Oxygen 99.6% Medical 6.80 M3, quantity 2',
      'Submit',
    ],
    point:
      'Today this is a phone call to the sales desk. There is no order until someone writes it down. Note there is no ECR yet — the number is not issued until the goods actually leave.',
  },
  {
    role: 'Warehouse clerk',
    userId: 3,
    title: 'The order appears in the warehouse queue',
    clicks: [
      'The new order is already at the top of the dispatch queue — nobody re-keyed it',
      'Mark filled → Assign vehicle + route + driver',
      'Try assigning more than the vehicle holds — the system refuses',
    ],
    point:
      'Capacity is checked at the point of assignment, not discovered at the gate. And the rejection comes from the server, not the screen.',
  },
  {
    role: 'Warehouse clerk',
    userId: 3,
    title: 'Confirm dispatch — the ECR is allocated',
    clicks: ['Confirm dispatch → read the four segments → Confirm'],
    point:
      'This is the fix for the numbering problem. Year, location, book type, sequence — ten digits, unique across every warehouse and every book, allocated by the server inside a transaction. It can never be issued twice and it never restarts into a collision. From here on this number is the key to the entire transaction, all the way into Oracle.',
  },
  {
    role: 'Driver',
    userId: 4,
    title: 'The driver takes a shared tablet and goes out of coverage',
    clicks: [
      'Check out a tab — the device is shared, the accountability is not',
      'Toggle "Offline" in the top bar',
      'Record a delivery: cylinders dropped, empties collected, cash taken',
    ],
    point:
      'There is no signal at an industrial estate gate. The write lands on the device immediately — the driver never waits for a network. Each action carries a device-generated reference so a replay can never double-count it.',
  },
  {
    role: 'Driver',
    userId: 4,
    title: 'The customer signs, the receipt prints',
    clicks: ['Capture a signature (or send an OTP) → Print receipt'],
    point:
      'The signature is captured against the ECR at the moment of handover, not re-keyed from a paper DC three days later. The printer is a local Bluetooth peripheral — it works with the network completely down.',
  },
  {
    role: 'Driver',
    userId: 4,
    title: 'Back in coverage — the queue drains',
    clicks: ['Toggle "Online" → watch the pending badges flip to synced'],
    point:
      'Nothing was lost while offline and nothing is entered twice. This is the part that decides whether a field app survives contact with reality.',
  },
  {
    role: 'Gate cashier',
    userId: 6,
    title: 'The cash gate — deliberately the narrowest point in the system',
    clicks: [
      'Open the returning route',
      'Enter a cash figure that does NOT match → confirm',
    ],
    point:
      'A mismatch holds the route and nothing reaches Oracle. This is the control the finance team actually cares about: a discrepancy is caught the same day, at the gate, by the person counting the money — not at month-end reconciliation.',
  },
  {
    role: 'Gate cashier',
    userId: 6,
    title: 'Resolve, and the posting fires',
    clicks: ['Resolve the hold with a note → watch the Oracle post go out'],
    point:
      'A confirmed cash reconciliation is the only path that posts to Oracle. There is no other code path — that is enforced in the service layer, not hoped for in the UI.',
  },
  {
    role: 'Admin',
    userId: 7,
    title: 'When Oracle is unavailable',
    clicks: [
      'Toggle "Oracle down" in the top bar',
      'Reconcile another route → the post fails and queues',
      'Toggle Oracle back up → Retry → it succeeds',
    ],
    point:
      'Failures are visible and retryable, never silently lost. And because the ECR is the idempotency key, retrying a post that already succeeded returns the existing document number instead of creating a duplicate invoice.',
  },
  {
    role: 'Admin',
    userId: 7,
    title: 'The audit trail answers "who did what"',
    clicks: ['Audit trail → filter by order', 'Integration console → open a payload'],
    point:
      'Every state change is an append-only record with an actor, a role and a timestamp. Nothing here was re-keyed by anyone, so there is no gap between what happened and what the books say.',
  },
  {
    role: 'Admin',
    userId: 7,
    title: 'Optional: prove separation of duties by trying to break it',
    clicks: [
      'As Ayesha (admin), dispatch an order from the dispatch queue',
      'Switch to the driver, deliver and confirm it',
      'Switch back to Ayesha and try to count the cash for that route',
    ],
    point:
      'The API refuses: the same person cannot dispatch, deliver and then confirm the sale. The drawer warns you before you try, and the rejection names the rule. This is the control that makes the cash figure worth trusting — and it is enforced server-side, so it cannot be clicked around.',
  },
];

export default function DemoGuide({ open, onClose }: { open: boolean; onClose: () => void }) {
  const currentUserId = useStore((s) => s.currentUserId);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-scrim" onClick={onClose} />
      <aside className="relative w-full max-w-lg h-full overflow-y-auto bg-surface border-s border-line">
        <div className="sticky top-0 bg-surface border-b border-line px-6 py-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-fg">Demo script</h2>
            <p className="text-sm text-fg-muted mt-1">
              Eleven beats, about seven minutes. Click a step to jump to that role.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-fg-dim hover:text-fg text-sm px-2 py-1 rounded hover:bg-surface-high"
          >
            Close
          </button>
        </div>

        <ol className="p-6 space-y-5">
          {BEATS.map((b, i) => {
            const isCurrent = b.userId === currentUserId;
            return (
              <li key={i} className="relative pl-9">
                <button
                  onClick={() => b.userId && api.switchUser(b.userId)}
                  className={[
                    'absolute left-0 top-0 w-6 h-6 rounded-full text-xs font-semibold grid place-items-center transition-colors',
                    isCurrent
                      ? 'bg-surface-raised border border-line-strong text-fg'
                      : 'bg-surface-high text-fg-muted hover:bg-line hover:text-fg',
                  ].join(' ')}
                  title={`Switch to ${b.role}`}
                >
                  {i + 1}
                </button>

                <div className="text-sm font-semibold text-fg-muted">
                  {b.role}
                </div>
                <h3 className="font-semibold text-fg mt-0.5">{b.title}</h3>

                <ul className="mt-2 space-y-1">
                  {b.clicks.map((c, j) => (
                    <li key={j} className="text-sm text-fg-muted flex gap-2">
                      <span className="text-fg-dim select-none">→</span>
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>

                <p className="mt-2.5 text-sm leading-relaxed text-fg-muted border-l-2 border-line-strong ps-3">
                  {b.point}
                </p>
              </li>
            );
          })}
        </ol>

        <div className="px-6 pb-8">
          <div className="rounded-lg bg-surface-raised border border-line p-4">
            <h4 className="font-semibold text-fg">
              If you are asked one question, expect this one
            </h4>
            <p className="mt-2 text-sm leading-relaxed text-fg-muted">
              <span className="text-fg">“Why not just build it in Oracle APEX?”</span> — Because
              none of this happens at a desk. The driver is out of coverage at a gate; APEX is a
              server-rendered web form that needs a connection for every page submit. The offline
              queue, the device-level idempotency, the Bluetooth printer and the dealer's own phone
              are the requirement, not the decoration. Oracle stays the system of record — this posts
              into it, through one service, keyed on the ECR.
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}
