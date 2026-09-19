// ─── ECR allocation ──────────────────────────────────────────────────────────
// Format: YYLLBBNNNN (10 digits)
//   YY   financial year
//   LL   location  (warehouse / plant)
//   BB   book type (product category)
//   NNNN sequence, restarts per (YY, LL, BB)
//
// The allocator is server-side and transactional. In this demo the "server" is
// the single store module — allocation happens inside one synchronous mutation
// so two dispatches can never observe the same counter value.

export interface EcrKey {
  yy: string;
  locationCode: string;
  bookCode: string;
}

export type EcrSequenceTable = Record<string, number>; // "YY|LL|BB" -> next value

export const ECR_PATTERN = /^[0-9]{10}$/;

export function seqKey(k: EcrKey): string {
  return `${k.yy}|${k.locationCode}|${k.bookCode}`;
}

/** Financial year segment for a date (MCL's FY starts in July). */
export function financialYear(d: Date = new Date()): string {
  const y = d.getMonth() + 1 >= 7 ? d.getFullYear() + 1 : d.getFullYear();
  return String(y % 100).padStart(2, '0');
}

export class EcrError extends Error {}

/**
 * Allocate the next ECR for a key, mutating the sequence table.
 * Caller must run this inside the same mutation that persists the order.
 */
export function allocateEcr(table: EcrSequenceTable, key: EcrKey): string {
  const k = seqKey(key);
  const next = table[k] ?? 1;
  if (next > 9999) {
    throw new EcrError(
      `Sequence exhausted for ${k} — 4-digit book caps at 9,999/year. Widen the format.`,
    );
  }
  table[k] = next + 1;
  const ecr = `${key.yy}${key.locationCode}${key.bookCode}${String(next).padStart(4, '0')}`;
  if (!ECR_PATTERN.test(ecr)) throw new EcrError(`Malformed ECR produced: ${ecr}`);
  return ecr;
}

export function parseEcr(ecr: string) {
  if (!ECR_PATTERN.test(ecr)) return null;
  return {
    yy: ecr.slice(0, 2),
    locationCode: ecr.slice(2, 4),
    bookCode: ecr.slice(4, 6),
    sequence: ecr.slice(6, 10),
  };
}

/** Render "26 01 01 0001" for display without changing the stored value. */
export function formatEcr(ecr: string | null): string {
  const p = ecr && parseEcr(ecr);
  return p ? `${p.yy} ${p.locationCode} ${p.bookCode} ${p.sequence}` : '—';
}
