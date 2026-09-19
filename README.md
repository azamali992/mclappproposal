# MCL Delivery — working demo

A runnable demonstration of the cylinder delivery system for Multan Chemicals Ltd: the
full workflow from a dealer placing an order through to the sale posting into Oracle,
with every business rule enforced in code rather than narrated over slides.

**This is a demo, not the product.** It is one React application. There is no server, no
database, no Oracle connection. What that means precisely — which parts are real working
logic and which parts are simulated — is spelled out in [What is real](#what-is-real-and-genuinely-proven)
and [What is simulated](#what-is-simulated) below. Please read both sections before
drawing conclusions from anything on screen.

---

## Run it

```bash
npm install
npm run dev
```

Then open **http://localhost:5173**.

Node 18+. No other dependencies, no environment variables, no database to provision.
Press **`?`** at any time for the presenter's script.

---

## The five roles

The role switcher in the top bar changes who is acting. The store re-evaluates permissions
on every call, so switching role mid-flow shows the *same* order through different eyes —
and blocks actions the new role is not allowed to perform.

| Role | Surface | What they do |
|---|---|---|
| **Client / Dealer** | Phone frame | Places an order for their own account, tracks it, confirms delivery by OTP. Sees nothing but their own orders — no routes, no driver, no other customers. |
| **Sales** | Desktop | Places an order on a client's behalf (the same endpoint; only `origin` differs). Cannot fill, dispatch, or confirm a sale. |
| **Warehouse / Platform Clerk** | Desktop | Reviews the queue, marks filling complete, assigns vehicle + route + driver against capacity, and confirms dispatch — **the moment the ECR is allocated**. |
| **Driver** | Tablet frame | Works the route manifest offline: cylinders dropped, empties collected, cash taken, receipt printed, signature or OTP captured. |
| **Gate Cashier** | Desktop | Counts the cash against what the route should have produced. A match posts to Oracle; a mismatch holds everything. This is the only path to the ERP. |

The switcher also carries two supporting roles used by the workflow — **Gate** (issues and
checks in the shared driver tablets) and **Back office / Admin** (audit trail, failed-post
queue, dashboards) — plus a second driver, so separation-of-duties rejections can be
demonstrated with real distinct users.

---

## Demo controls

All in the top bar, all live:

| Control | What it does |
|---|---|
| **Online / Offline** | Cuts the driver tablet's connectivity. Deliveries recorded while offline are written locally and queued; the badge shows queue depth. Going back online drains the queue through the sync endpoint. |
| **Oracle up / down** | Fault injection on the integration service. With Oracle down, a matched reconciliation still reconciles but the post fails with a `503` classified *retryable*, and the order lands in the failed-post queue for an admin retry. |
| **Reset** | Returns the demo to its opening seeded state. Confirms first — everything done in the session is discarded. |
| **`?`** | Opens the presenter's script: the running order for the walkthrough and the rules to point at. |

---

## What is real, and genuinely proven

Every item below is executed logic in `src/core/`, not a mock, a screenshot, or a
conditional that always succeeds. Each one can be made to fail on stage.

- **ECR allocation is transactional and server-side.** The number is allocated only at
  dispatch confirmation, inside the same synchronous mutation that persists the order, so
  two dispatches cannot observe the same counter value. No device ever computes one. An
  order that is cancelled before dispatch burns no number, and an ECR is never reissued —
  re-dispatching a dispatched order is rejected.
- **The order state machine rejects illegal transitions.** Status is never assigned
  directly anywhere in the codebase; every change goes through one transition function
  that checks an explicit table for both the transition *and* the role driving it. Try to
  confirm a delivery that was never dispatched and you get a specific refusal naming the
  legal next states.
- **Vehicle capacity is validated.** Assignment sums the load already on that vehicle plus
  this order's load against the vehicle class limit, and refuses the assignment with the
  actual numbers when it would overflow.
- **Separation of duties is enforced at the API.** A cashier who dispatched or delivered
  an order cannot also confirm its sale. The rejection names the user, the ECR, and which
  of the two conflicts applies. This is server-side, not a hidden button.
- **The offline queue dedupes on a device-generated `client_ref`.** Every driver action
  gets a UUID created on the device at the moment it happens. Replaying the same action —
  which is exactly what a flaky network causes — produces one delivery record, not two.
- **Only a matched cash reconciliation posts to Oracle.** No other code path reaches the
  integration service. A cash mismatch moves the orders to a held state and nothing posts
  until a cashier or admin resolves it, on the record.
- **ERP posts are idempotent on the ECR.** Before any call, the integration service checks
  whether that ECR already succeeded; if it has, it returns the existing Oracle document
  number and does nothing else. Retry a successful post as many times as you like.

The audit trail behind all of this is append-only: deliveries, confirmations and post
attempts are new rows with reason codes, never updates.

---

## What is simulated

These are stubs. They behave convincingly and are shaped like the real thing, but they are
not connected to anything, and each one is real work in the production build.

| Simulated | What the demo does instead | What production needs |
|---|---|---|
| **Oracle ORDS endpoint** | An in-process function with ~1.4 s latency, a success response carrying a document number and GL batch, and a failure path returning `503` with an explicit `retryable` error class. | The actual ORDS REST contract, agreed with MCL's APEX developer, wrapping the same PL/SQL procedure the data-entry form calls — not a raw INSERT. |
| **SMS / OTP delivery** | A six-digit code is generated and shown on screen. | An SMS gateway, delivery receipts, expiry and rate limiting. |
| **Bluetooth receipt printer** | A receipt reference is generated and rendered on screen. | The printer's own SDK, against hardware chosen and bought first. |
| **Authentication** | The role switcher. No password, no token, no session. | JWT with refresh, RBAC checked on every route, per-session driver login on shared tablets. |
| **Persistence** | All state is in memory. **A browser reload resets everything to the seeded opening state.** | PostgreSQL, migrations, backups. |
| **Push notifications** | Not present. | FCM or equivalent. |

The seeded master data — locations, book types, products, prices, clients, routes,
vehicle classes — is modelled on MCL's real Peshawar ledger (see `docs/data-profile.md`),
but the transactions in the demo are fabricated. No customer's real order is shown.

---

## Verifying it

Four checks, all runnable before you present. They exist because a demo that
breaks live is worse than no demo.

```bash
npm run typecheck   # whole project, zero errors
npm run flow        # ONE order from dealer placement to Oracle posting
npm run smoke       # 36 assertions across the whole pipeline, headless
npm run urdu        # mounts in Urdu: RTL, Nastaliq, no missing keys
npm run render      # server-renders every surface for every role
npm run mount       # mounts the real app in a DOM, drives a live mutation
npm run build       # production bundle
```

`npm run flow` is the one to run before presenting — it follows a single order
through every stage in the order you will click them, and prints the journey
with the actor at each step. If it passes, the story has no dead end.

`npm run smoke` is the important one: it places an order, fills, assigns,
dispatches and checks the allocated ECR against the previewed value, records a
delivery offline, replays the queue twice to prove idempotency, forces a cash
mismatch, resolves it, and drives an Oracle outage and retry — asserting at each
step. **36 checks.** It found two real bugs during the build:

- `dispatchOrder` allocated the ECR *before* validating the transition, so a
  rejected dispatch permanently burned a sequence number.
- The Oracle post ran as whichever user triggered it, so a cashier's own
  reconciliation was rejected for lacking admin rights. The integration service
  is now a system actor.

## Repo layout

```
src/
├── core/                 the "backend" — every business rule lives here, none in a screen
│   ├── store.ts          API surface, RBAC, state machine driver, sync endpoint,
│   │                     Oracle integration service. Stands in for the whole server.
│   ├── types.ts          domain types — single source of truth, mirrors the Postgres schema
│   ├── stateMachine.ts   the explicit transition table + which role may drive each edge
│   ├── ecr.ts            ECR format, financial-year logic, transactional allocator
│   ├── seed.ts           the "database" — master data and opening transactions
│   └── realData.ts       product, client and price data derived from the Peshawar ledger
├── apps/
│   ├── backoffice/       Sales, Clerk, Cashier, Admin — one desktop app, four workspaces
│   ├── driver/           the offline-first driver tablet
│   ├── client/           the dealer's phone app
│   └── shell/            shared app-level pieces
├── ui/                   design system: primitives, icons, charts, tokens. No component library.
├── App.tsx               demo chrome only — role switcher, device frames, fault injection
└── DemoGuide.tsx         the `?` presenter script
docs/
├── build-plan.md         the production specification this demo is built against
├── demo-architecture.md  how the demo maps onto that architecture — read this second
├── data-profile.md       profiling of MCL's real Peshawar ledger (12 months, 9,328 lines)
└── AGENT_CONTRACT.md     the shared contract the build agents worked to
```

---

## What it took to build this

This demo was assembled in under an hour by parallel AI agents working against a shared
written contract — one owning the core rules engine, others the design system and each
client surface, coordinating only through `docs/AGENT_CONTRACT.md`. The production system
is a different order of work, scoped in `docs/build-plan.md`. But the speed at which a
correct, rule-enforcing prototype can now be put in front of a decision-maker is itself
part of the case being made here.
