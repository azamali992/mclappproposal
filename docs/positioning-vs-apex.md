# Positioning: our proposal alongside MCL's Oracle/APEX team

**For the presenter, before the room. Also readable by a technical evaluator afterwards.**

The Oracle/APEX team is not an obstacle to route around. They are correct about the most
important thing in this project, and the argument only works if we say so first and mean
it. An overstated case loses to an Oracle developer who can spot the exaggeration — and
they will.

---

## 1. Where the Oracle/APEX team is genuinely right

Say this first, unprompted, before any pitch.

**Oracle is the system of record and must remain so.** Nothing we propose changes that.
The ledger, the stock position, the receivables and the audited books stay where they are.

**They own the logic behind the forms, and that logic is not visible from outside.** In a
home-grown APEX application, a large share of the business rules lives in page processes,
dynamic actions, and database triggers behind the data-entry forms — GL posting, stock
movements, tax computation, document numbering. None of that is discoverable from a table
definition or an API response.

**A REST endpoint that does a raw `INSERT` can create the row and silently skip all of it.**
That is a real way to corrupt the books: the document exists, the ledger never moved, and
nothing errors. This is open decision #3 in the build plan and it is the highest-risk item
in the project. Our position is therefore the same as theirs would be: the integration must
**wrap the same procedure the form calls**, not reimplement the insert. We want to read the
form's page-process source, not work around it.

**APEX is also the right tool for a class of work here.** The back-office screens — clerk
queue, fill, assign, cashier reconciliation — are online, internal, form-heavy, and sit on
the office network. That is APEX's strongest ground. If the only thing being built were
those screens, the honest recommendation would be to build them in APEX.

If we do not concede these four points clearly, nothing after them will be believed.

---

## 2. What APEX cannot do well here, and why

These are architectural constraints, not opinions about the tool's quality. Each has a
technical reason.

### 2.1 Delivery capture at the gate — the offline boundary

APEX is server-rendered. Page rendering and page processing execute as PL/SQL inside the
database; session state lives in the database; **every page submit is an HTTP round trip
through ORDS to the database.** There is no client-side execution model that survives a
lost connection.

A driver at an industrial estate gate has no coverage. That is the fact the architecture
has to answer to. Three things follow, and none of them can live in an APEX page:

- **The local write.** Every driver action must write to local storage and return
  immediately, before any network exists. An APEX page process cannot run without the
  server.
- **The replay queue.** Queued actions drain when connectivity returns, with a per-stop
  synced/pending indicator. APEX has no queue-and-replay framework for page submits.
- **The device-level idempotency key.** `client_ref` is a UUID generated *on the device at
  the moment of the action*, never server-assigned — it is what makes replay safe after a
  network failure. It requires device-side generation and persistence that precedes any
  contact with the server.

**Be precise here, because they will be.** APEX does support PWAs — installable app,
service worker, an offline notice page, and push notifications in recent releases. That is
installability and asset caching. It is not offline transaction capture and replay. The
distinction is the whole argument; do not blur it, and do not claim APEX "cannot do PWA".

### 2.2 The receipt printer is a native peripheral

Field receipt printers in this class ship Android/native SDKs over Bluetooth. Web Bluetooth
is absent on iOS entirely and, where it exists, requires a secure context and a user gesture
per connection — not a workable model for a driver printing at every stop. Printing must
also work with zero network, which puts it firmly on the device side. This is why
build-plan decision #8 says to buy the hardware early and build against the real SDK rather
than an assumed one.

### 2.3 A dealer app on a customer's phone is a different security boundary

An APEX application lives in a workspace mapped to database schemas, fronted by the same
ORDS instance as the ERP. A dealer-facing app on customers' own phones needs a different
auth realm, different token lifetimes, different rate limiting, and a blast radius on
credential compromise that stops at a service account rather than reaching an ERP session.
Serving external customers from the same front door as the internal ERP puts the ERP's
attack surface on the public internet in order to take orders. That can be mitigated in
APEX — it is a design decision, not an impossibility — but the mitigation is most of the
work, and the separation is cleaner if it is structural.

This is also why the build plan's hard rule is that **no client app ever calls Oracle**.
Only the integration service holds Oracle credentials, and only after the cashier confirms.

### 2.4 Shared tablets and per-device audit are not an APEX pattern

The tabs are shared company devices checked out from, and back in to, the gate team. The
requirement is driver login per session, tab check-out/check-in logged for the audit trail,
and `tab_device_id` recorded on every delivery event. APEX's session model is a
per-browser-session cookie; device identity is not a first-class concept in it. All of this
would be built from scratch on top of the framework, with no support from it.

---

## 3. The proposed split

| Oracle/APEX team owns | We own |
|---|---|
| Oracle as the system of record — GL, stock, tax, ERP numbering | Field capture and the offline queue |
| The ORDS endpoint and the PL/SQL behind it, wrapping the same procedure the form calls | The cash reconciliation gate |
| Server-side idempotency on the ECR (check-before-insert, return the existing doc number) | The three client apps and the order state machine |
| Explicit retryable-vs-terminal error classification in the response | The integration service, retry queue and post log |
| Master data: customer codes with cash/credit flag, item, location, price and tax codes | Postgres workflow state — never accounting state |

This is a collaboration boundary, not a turf claim. **The ORDS contract is the part of this
project their team is uniquely qualified to do.** Nobody else can safely write the PL/SQL
that wraps the form's logic, and nobody outside their team knows what that logic contains.
Ask them to co-design the JSON payload rather than hand us a fixed one — the build plan asks
for a single combined endpoint (order + delivery + cash receipt) precisely so the
orchestration and partial-rollback burden sits where the transaction already is, not in our
retry loop.

---

## 4. Risk framing — use this if the room turns into a contest

The highest-risk item in the entire project is decision #3: **does a REST insert replicate
what the APEX form does?** Everything else is schedule risk. This one is correctness risk
against the general ledger.

Two things follow, and both are worth saying out loud:

1. **Whoever builds the front end, that question has the same answer and the same owner.**
   It is an Oracle-side question. It does not move if the front end is APEX, React Native,
   or anything else. Choosing an in-house build retires none of this risk.
2. **Being the team that identified it is the signal.** A vendor who arrives with a demo and
   no view on GL integrity has not read the problem. We arrived with the risk register
   before the code.

The honest closing line: we are not asking to be trusted with the books. We are asking to
build the part that happens outside the building, and to hand it to their endpoint.

---

## 5. Anticipated objections, with honest answers

**"We already have all this data in Oracle."**
True, and complete for accounting purposes — concede that immediately. The gap is not
storage, it is *latency and key integrity*. The data arrives days after the cash did, so it
cannot reconcile anything at the gate. And the field that is supposed to identify a
transaction does not: in their own twelve-month Peshawar export, 2,146 of 9,328 sale lines
carry non-numeric ECR values across 54 distinct strings — `FILLING` (1,802 occurrences, and
also `FILING`, `FILLIGN`, `JAR FILLING`), `GAIN`, `LOSS`, `STOCK ADJUSTMENT 31-08-2025`,
`1671 AND 1672`, `315-316`. That is their export, not our judgement. A fair question back:
what query joins on that column today?

**"Why a second database? Just add tables to Oracle."**
This one has the crispest technical answer, so use it. What we store is **workflow state,
not accounting state**: offline queue idempotency keys, per-device audit rows,
reconciliation holds, the ERP post log. It changes shape every sprint during the build.
Putting mutable workflow state into the ERP schema makes every iteration a change to the
system of record — change control, DBA involvement, regression against the GL, and
migrations that have to protect audited data. Separation is what lets our schema change
without touching theirs (build-plan §8). Nothing in Postgres is authoritative; Oracle needs
nothing from it. If our database were lost tomorrow, the books are unaffected.

**"Our team knows the business."**
They do, and we need it — this is a requirement, not a rebuttal. That knowledge is exactly
what the ORDS contract and the master-data mapping need, and it is the reason the endpoint
should be theirs. It is not an argument about where an offline sync queue and a Bluetooth
printer driver should live. We claim no domain expertise; what we did was profile a year of
their own data and come back with findings they can check line by line — that nitrogen is a
47-litre liquid-jar business rather than a cylinder business, that `Rate` mixes
per-cylinder and per-M3 bases in a single column, and that the median order is one cylinder.

**"It is cheaper to build in-house."**
Partly true, and say so. For the back-office screens it probably is. Three qualifiers: the
ORDS work costs the same under either plan; offline-first mobile, Bluetooth peripheral
integration and external app distribution are a different skill set that would be learned on
the critical path; and their team's capacity is the ERP's capacity — every week spent here
is a week not spent on Oracle. The expensive outcome is not a higher invoice. It is a
half-built offline sync that loses a delivery and is only discovered at month-end.

**"What happens when you leave?"**
A monorepo with shared types as the single source of truth; `CLAUDE.md` carrying the
invariants where any future developer or tool reads them every session; the ORDS contract
documented as a negotiated artefact rather than tribal knowledge; Docker-first with nothing
vendor-proprietary — a Postgres connection string, an S3-compatible bucket, our own job
table instead of a managed queue — so it can be rehosted in a day; and a scheduled handover
with their team present *through* UAT, not after it. Offer to name the handover as a
milestone in the pilot scope. If they ask for source ownership from day one, agree.

---

## 6. What to concede in the room

Conceding these early is what makes everything else credible. Say them before being pushed.

1. **Oracle stays the system of record.** We will never write to it except through their
   PL/SQL, and we would refuse to build it any other way.
2. **The back-office web app is the piece APEX could build well.** If they want it, the
   conversation is about having one state machine rather than two, not about capability.
3. **The ORDS endpoint is theirs to build and theirs to own** — and it is on the critical
   path (decision #2). Our timeline depends on their timeline, and we will not pretend
   otherwise.
4. **We do not know their GL and stock logic. They do.** We are not qualified to judge
   whether a REST insert is safe; only they are.
5. **The four-digit ECR sequence is an assumption, not a conclusion.** It holds only if the
   counter is genuinely partitioned per book type — Peshawar alone already reached 8,498 in
   one year, 85% of a four-digit book, and it is not MCL's largest branch. They should check
   it against the other branches, and we widen the format to 11 digits if they say so.
6. **Six to eight months to a pilot, not weeks.** Do not let enthusiasm in the room compress
   this.
7. **If they want to own the whole thing, the pilot is the cheap way to find out.** One
   warehouse, one route, paper still running.

---

## 7. The question the room should actually decide

Not "in-house or vendor". The decision is **where the offline boundary sits** — what has to
work at a gate with no coverage, and who builds that. Everything else follows from it, and
that framing keeps the Oracle team on the same side of the table as us rather than opposite.
