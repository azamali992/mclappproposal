# Connected Delivery and Unique ECR — Multan Chemicals Ltd

**For the CEO and finance leadership. Three minutes.**

---

## The problem, in your terms

One delivery is recorded three times by three people: the warehouse writes a paper ECR,
the driver carries it and collects a signed paper DC at the client, and a data-entry team
re-keys both into Oracle days later. Nothing connects the three copies.

Four consequences follow from that, and all four are structural, not effort problems:

1. **The ECR number cannot identify a transaction.** Each warehouse keeps roughly five
   parallel books by product type, and every book restarts at 1 each financial year. The
   same number exists many times over across the company. Nothing can key off it — not a
   query, not an audit, not a dispute.
2. **Cash is reconciled at month-end, not at the gate.** The driver returns cash; nothing
   checks it against what was actually delivered until the books close. By then the trip,
   the driver and the client conversation are weeks old.
3. **Oracle learns about a delivery days after it happened.** Between dispatch and posting,
   stock and receivables are estimates.
4. **Every re-key is a chance to introduce an error with no trail back to the original.**

---

## What your own data already says

From twelve months of Peshawar branch records produced by MCL's own ERP
(01-Jul-2025 to 29-Jun-2026):

- **6,888 sale documents in one year at the Peshawar branch alone**, peaking at 650 in
  October 2025 — 9,328 individual product lines, PKR 263.4 million of outbound value
  across 145 customers. Peshawar is not MCL's largest branch.
- **The ECR field is free text, not a number.** 2,146 of those 9,328 lines carry values
  like `FILLING`, `GAIN`, `LOSS`, `STOCK ADJUSTMENT 31-08-2025`, `1671 AND 1672`,
  `315-316` — 54 distinct non-numeric values in a field the business treats as a bill
  number. `FILLING` alone appears 1,802 times, and also as `FILING`, `FILLIGN`,
  `JAR FILLING`, `XL-FILLING`.
- Of the entries that *are* numeric, the highest reached in a single year is 8,498 — 85%
  of a four-digit book consumed at one branch.

This is a finding from MCL's own export, not an assessment of how the team works. The
number the company uses to identify a delivery is not, today, capable of identifying one.

---

## What changes

| Today | After |
|---|---|
| Recorded three times, by three people, over several days | Recorded **once**, at the point it happens, by the person it happens to |
| ECR repeats across warehouses and restarts yearly | A **unique 10-digit ECR** (`YYLLBBNNNN`), allocated server-side, immutable once issued |
| Cash variance surfaces at month-end | Cash counted and reconciled **at the gate, the same day**, against what the app says was delivered |
| Data-entry team re-keys into Oracle days later | The delivery **posts itself into Oracle** once the cashier confirms |

The design keeps three different people on dispatch, delivery, and sale confirmation.
Separation of duties is enforced by the system, not by procedure.

---

## Business outcomes

| Measure | Target |
|---|---|
| Manual ERP data entry for deliveries | Zero |
| Delivery traceable to a unique ECR, end to end | Every delivery |
| Cash variance detection | Same day, not month-end |
| Delivery completed to posted in Oracle | Hours to minutes |
| Failed Oracle posts | Visible and retryable — never silently lost |

---

## What we are showing today

A working walkthrough of the full chain on MCL's own product, customer and volume data:
order placed, filled, dispatched with a unique ECR issued, delivered and captured on a
tablet **with the network switched off**, receipt printed, cash counted at the gate, and
the posting queued to Oracle.

**What it proves:** the workflow is understood end to end; the new numbering scheme fits
MCL's real volumes; a delivery can be captured and receipted with no coverage at the gate;
the cash gate is a real control, not a screen.

**What it does not prove, and we will not claim it does:** nothing has been written into
MCL's live Oracle books. Whether a REST call replicates everything the existing APEX form
does — GL posting, stock movement, numbering — is the single question that must be
answered with MCL's Oracle team before a line of integration code is trusted. We have
identified it; we have not answered it.

---

## Timeline, honestly

| Phase | Duration |
|---|---|
| Foundations — close open decisions, Oracle contract, environments, schema | 3–4 weeks |
| MVP build — all three apps, offline capture, cash gate, Oracle posting | 18–26 weeks |
| UAT and parallel run alongside paper | 4–5 weeks |
| Rollout, per site batch | 4–6 weeks each |

**Roughly six to eight months to a live pilot.** The range is real: the low end assumes
the Oracle endpoints exist or are committed quickly, and that one route's master data is
ready. We would rather show you the range than a date we would have to revise.

---

## The pilot we propose

**One warehouse. One route. Running alongside paper, not replacing it.**

Nothing is switched off. For the duration of the parallel run, every delivery on that
route is recorded both ways, and the two are compared daily. If cash reconciliation on
that one route is not trustworthy, the pilot has done its job cheaply and we stop.

That is the decision in front of the room: not whether to replace the paper system
company-wide, but whether one route is worth proving it on.
