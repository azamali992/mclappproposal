# MCL Cylinder Delivery App — Build Plan

**Project:** Cylinder delivery mobile app + unique ECR digitization for Multan Chemicals Ltd
**Team:** 3 (you + 2 developers), building with Claude Code
**Status:** pre-build. Some decisions still open — see §2 before writing code.

> **How to use this file.** Drop it at the repo root. It is the working spec: what we're
> building, the rules that must not be broken, and the order to build in. The CEO-facing
> proposal and the architecture document are companions — this one is for the people typing.
> Keep it updated as decisions close; it is the input Claude Code should be pointed at.

---

## 1. What we're building, in one paragraph

MCL dispatches gas cylinders against hand-written paper bills identified by an ECR number.
A driver carries the ECR and the cylinders, the client signs a paper DC, and a data-entry
team later re-keys everything into MCL's Oracle system. We are replacing that with a
connected app across five roles — client/dealer, sales, warehouse/platform clerk, driver,
gate cashier — so that a delivery is recorded once, at the point it happens, and posts
itself into Oracle when the cash is reconciled at the gate. Alongside it we are replacing
the ECR numbering scheme, which currently repeats across warehouses and book types and
therefore can't be used as a transaction key.

---

## 2. Decisions still open — close these before or during Phase 0

These block real work. Ordered by how much they'd cost to get wrong.

| # | Decision | Why it blocks | Who answers |
|---|---|---|---|
| 1 | **Does the cashier's cash confirmation really gate the Oracle post?** Or does the client's signature/OTP post immediately, with cash reconciled separately? | This is the central backend rule. Changing it later means reworking the order state machine and the integration trigger. | Your team / CEO |
| 2 | **Do the ORDS REST endpoints exist yet, or must Oracle's dev build them?** | If they must be built, that's a scoped work item on someone else's timeline and it becomes the critical path. | Oracle/APEX developer |
| 3 | **Does a REST insert replicate what the APEX form does?** Existing form page-processes and DB triggers may do GL posting, stock updates, numbering. An API that just INSERTs could silently skip them. | Highest-risk integration question in the project. Could corrupt the books. | Oracle/APEX developer |
| 4 | **Hosting** — OCI (same tenancy as APEX), another cloud, or MCL's on-prem server. Previously settled as on-prem, but that was before dealer-facing and field-syncing apps existed. | Determines environment setup, networking, TLS, cost. | You + MCL IT |
| 5 | **Cash mismatch scope** — does a discrepancy hold the whole route, or only the mismatched order(s)? | Changes the reconciliation data model and the hold logic. | Your team / finance |
| 6 | **Are all clients cash-on-delivery, or are some on credit?** | If credit exists, the app branches and the Oracle payload differs (no cash receipt). | Sales / finance |
| 7 | **Route master data delivery date** | Phase 1 pilot depends on at least one real route existing. | Planning team |
| 8 | **Printer model and protocol** | Build the integration against real hardware, not an assumed SDK. | You — pick and buy early |
| 9 | **When is the ECR generated?** Assumed: at dispatch confirmation. | Determines whether an abandoned order burns a number. | Your team |

---

## 3. The workflow (ground truth)

Two entry paths, one fulfillment pipeline.

```
Path A: Client/Dealer places order in their app  ─┐
                                                  ├─→ Order lands in warehouse/platform queue
Path B: Sales team places order on client's behalf ┘
                                   │
                                   ▼
        Warehouse/Platform Clerk reviews order
                                   │
                                   ▼
                          Completes FILLING
                                   │
                                   ▼
         Assigns VEHICLE + pre-defined ROUTE, sets loaded quantity
                                   │
                                   ▼
              CONFIRM DISPATCH  →  ECR number issued
                                   │
                                   ▼
         Driver collects TAB from Gate Team (shared device)
         Tab shows: route stops + load carried
                                   │
                                   ▼
     ┌─────────── AT EACH STOP ───────────┐
     │  Driver records:                    │
     │   • cylinders dropped               │
     │   • empty cylinders picked up       │
     │   • cash received                   │
     │  Prints receipt → client signs      │
     │  (or client confirms via OTP)       │──→ dispute branch: flagged, not confirmed
     └─────────────────────────────────────┘
                                   │
                                   ▼
        Route complete → driver returns TAB + CASH to gate
                                   │
                                   ▼
        GATE CASHIER reviews app, counts cash, confirms sale
                                   │            └─→ mismatch: HELD for investigation
                                   ▼
        INTEGRATION SERVICE posts to Oracle (ORDS/REST)
                                   │            └─→ failure: retry queue
                                   ▼
                          Order marked POSTED
```

**Master data owned elsewhere:** routes and vehicle capacity classes are defined by the
planning team. The app consumes them; it does not invent them.

---

## 4. ECR numbering scheme

Current ECRs are not unique: each warehouse keeps ~5 parallel books by product type, and
each book restarts at 1 every financial year. Nothing can key off that.

**New format — 10 digits, `YYLLBBNNNN`:**

| Segment | Digits | Meaning | Example |
|---|---|---|---|
| `YY` | 2 | Financial year | `26` |
| `LL` | 2 | Location (warehouse / plant) | `01` |
| `BB` | 2 | Book type (product category) | `01` |
| `NNNN` | 4 | Sequence, restarts per year+location+book | `0001` |

Example: `2601010001`

**Rules:**
- Uniqueness constraint is on the whole 10-digit string.
- The sequence counter is per `(YY, LL, BB)` — allocate it server-side inside a transaction,
  never client-side, never on the tab.
- 4 digits caps a book at 9,999/year per location. **Verify against actual volumes** before
  locking; if any book exceeds this, widen to 5 and make it an 11-digit format from day one.
- The ECR is the idempotency key for the Oracle post. Treat it as immutable once issued.

---

## 5. Roles and permissions

| Role | Can do | Must not do |
|---|---|---|
| Client / Dealer | Place order (Path A), view own order history, confirm delivery (sign/OTP) | See other clients, see routes or driver data |
| Sales | Place order on client's behalf (Path B), view own orders | Fill, dispatch, or confirm sale |
| Warehouse/Platform Clerk | Review order, mark filled, assign vehicle + route, set load, confirm dispatch | Confirm delivery, confirm sale |
| Driver | See assigned route + load, record drops/empties/cash, print receipt | Edit order contents, confirm sale |
| Gate Team | Issue/check-in tabs | Any order or cash action |
| Gate Cashier | Review route, reconcile cash, confirm sale | Place, fill, or dispatch orders |
| Back office / Admin | Master data, reporting, audit trail | Bypass the reconciliation gate |

**Separation of duties is the point.** The person who dispatches, the person who delivers,
and the person who confirms the sale must be three different people. Enforce this
server-side — never in the UI only.

---

## 6. Apps to build (consolidated — three, not five)

| App | Platform | Roles served | Notes |
|---|---|---|---|
| **Back-office web app** | React (desktop/tablet) | Sales, Clerk, Gate Cashier, Admin | The cashier folds in here — the gate is on the office network, so no offline logic needed. Saves a codebase. |
| **Client/Dealer app** | React Native or Flutter | Client/Dealer | External-facing, online-only, light. |
| **Driver Tab app** | React Native or Flutter, offline-first | Driver | Shared company tablets. Bluetooth printer. The complex one. |

**Client/Dealer and Driver Tab share one codebase but ship as separate build variants.**
Shared components and API client; separate entry points and feature sets. A customer's phone
must not carry route, load, or pricing code, and the customer app must not carry the
offline-sync and printer complexity.

Screen size is not the reason for the split — audience and connectivity are. Responsive
layout across phone and tablet is a solved problem in both frameworks; design with
breakpoints from day one and it's a non-issue.

---

## 7. Architecture

```
┌─────────────────┐  ┌──────────────────┐  ┌─────────────────────┐
│ Back-office web │  │ Client/Dealer    │  │ Driver Tab          │
│ (Sales, Clerk,  │  │ app (mobile)     │  │ (offline-first,     │
│  Cashier, Admin)│  │                  │  │  BT printer)        │
└────────┬────────┘  └────────┬─────────┘  └──────────┬──────────┘
         └────────────────────┼───────────────────────┘
                              ▼
              ┌───────────────────────────────┐
              │  BACKEND API (REST)           │
              │  Auth (JWT + RBAC)            │
              │  Order · Delivery · Cash/Recon│
              │  Notification                 │
              └───────────────┬───────────────┘
                              │
      ┌──────────┬────────────┼───────────┬──────────────┐
      ▼          ▼            ▼           ▼              ▼
  PostgreSQL  Object      Push (FCM)   SMS (OTP)   App distribution
              storage                                (Firebase / APK)
      │
      ▼
  ┌──────────────────────────────────────────┐
  │ INTEGRATION SERVICE                       │
  │ retry queue · idempotency (ECR) · logging │
  └──────────────────┬───────────────────────┘
                     ▼
        ┌────────────────────────────┐
        │ ORACLE APEX / ORDS         │
        │ REST endpoints (JSON)      │
        └────────────────────────────┘
```

**Non-negotiable:** no client app ever calls Oracle. Only the integration service does, and
only after the cashier confirms. That is what makes retries, logging and idempotency
something you build once.

---

## 8. Data model

Postgres. Keep this schema entirely separate from the Oracle database — do **not** add tables
to Oracle "since the data's already there." Separation is what lets you change your schema
without touching the system of record.

```sql
-- ── Master data ─────────────────────────────────────────────
CREATE TABLE location (
  id            SERIAL PRIMARY KEY,
  code          CHAR(2) NOT NULL UNIQUE,      -- the LL in the ECR
  name          TEXT NOT NULL,
  type          TEXT NOT NULL                 -- 'warehouse' | 'plant'
);

CREATE TABLE book_type (
  id            SERIAL PRIMARY KEY,
  code          CHAR(2) NOT NULL UNIQUE,      -- the BB in the ECR
  name          TEXT NOT NULL
);

CREATE TABLE product (
  id            SERIAL PRIMARY KEY,
  sku           TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  size          TEXT,
  oracle_item_code TEXT NOT NULL,             -- maps to Oracle's item master
  book_type_id  INT REFERENCES book_type(id)
);

CREATE TABLE vehicle_class (
  id            SERIAL PRIMARY KEY,
  code          TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  max_cylinders INT,
  max_weight_kg NUMERIC(10,2)
);

CREATE TABLE vehicle (
  id            SERIAL PRIMARY KEY,
  registration  TEXT NOT NULL UNIQUE,
  class_id      INT NOT NULL REFERENCES vehicle_class(id),
  active        BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE route (
  id            SERIAL PRIMARY KEY,
  code          TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  active        BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE route_stop (                     -- ordered client stops on a route
  id            SERIAL PRIMARY KEY,
  route_id      INT NOT NULL REFERENCES route(id),
  client_id     INT NOT NULL REFERENCES client(id),
  sequence_no   INT NOT NULL,
  UNIQUE (route_id, sequence_no)
);

CREATE TABLE client (
  id                SERIAL PRIMARY KEY,
  name              TEXT NOT NULL,
  address           TEXT,
  contact_number    TEXT,
  oracle_customer_code TEXT NOT NULL UNIQUE,
  payment_terms     TEXT NOT NULL DEFAULT 'cash',  -- 'cash' | 'credit'  (see open decision 6)
  confirm_method    TEXT NOT NULL DEFAULT 'signature', -- 'signature' | 'otp'
  default_route_id  INT REFERENCES route(id)
);

CREATE TABLE tab_device (
  id            SERIAL PRIMARY KEY,
  device_id     TEXT NOT NULL UNIQUE,
  label         TEXT,
  active        BOOLEAN NOT NULL DEFAULT TRUE
);

-- ── Transactional ───────────────────────────────────────────
CREATE TABLE "order" (
  id              BIGSERIAL PRIMARY KEY,
  ecr             CHAR(10) UNIQUE,            -- NULL until dispatch confirmation
  status          TEXT NOT NULL,              -- see state machine, §9
  origin          TEXT NOT NULL,              -- 'client_app' | 'sales'
  client_id       INT NOT NULL REFERENCES client(id),
  location_id     INT NOT NULL REFERENCES location(id),
  book_type_id    INT NOT NULL REFERENCES book_type(id),
  route_id        INT REFERENCES route(id),
  vehicle_id      INT REFERENCES vehicle(id),
  driver_id       INT REFERENCES app_user(id),
  requested_date  DATE,
  created_by      INT NOT NULL REFERENCES app_user(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  dispatched_at   TIMESTAMPTZ,
  CONSTRAINT ecr_format CHECK (ecr IS NULL OR ecr ~ '^[0-9]{10}$')
);

CREATE TABLE order_line (
  id            BIGSERIAL PRIMARY KEY,
  order_id      BIGINT NOT NULL REFERENCES "order"(id) ON DELETE CASCADE,
  product_id    INT NOT NULL REFERENCES product(id),
  qty_ordered   INT NOT NULL,
  qty_loaded    INT,
  qty_delivered INT,
  qty_returned  INT,                          -- empties collected
  reason_code   TEXT
);

CREATE TABLE delivery_event (                 -- append-only
  id              BIGSERIAL PRIMARY KEY,
  order_id        BIGINT NOT NULL REFERENCES "order"(id),
  driver_id       INT NOT NULL REFERENCES app_user(id),
  tab_device_id   INT REFERENCES tab_device(id),
  cylinders_delivered INT NOT NULL,
  empties_collected   INT NOT NULL DEFAULT 0,
  cash_collected      NUMERIC(12,2) NOT NULL DEFAULT 0,
  gps_lat         NUMERIC(9,6),
  gps_lng         NUMERIC(9,6),
  photo_url       TEXT,
  client_ref      UUID NOT NULL UNIQUE,       -- idempotency key from the offline queue
  occurred_at     TIMESTAMPTZ NOT NULL,       -- when it happened on the tab
  recorded_at     TIMESTAMPTZ NOT NULL DEFAULT now()  -- when the server received it
);

CREATE TABLE confirmation_event (             -- append-only
  id            BIGSERIAL PRIMARY KEY,
  order_id      BIGINT NOT NULL REFERENCES "order"(id),
  method        TEXT NOT NULL,                -- 'signature' | 'otp'
  receipt_ref   TEXT,
  status        TEXT NOT NULL,                -- 'confirmed' | 'disputed'
  notes         TEXT,
  occurred_at   TIMESTAMPTZ NOT NULL
);

CREATE TABLE cash_reconciliation (            -- the record that gates the Oracle post
  id                  BIGSERIAL PRIMARY KEY,
  route_id            INT NOT NULL REFERENCES route(id),
  vehicle_id          INT NOT NULL REFERENCES vehicle(id),
  driver_id           INT NOT NULL REFERENCES app_user(id),
  cashier_id          INT NOT NULL REFERENCES app_user(id),
  total_cash_expected NUMERIC(12,2) NOT NULL,
  total_cash_received NUMERIC(12,2) NOT NULL,
  status              TEXT NOT NULL,          -- 'matched' | 'mismatch_held' | 'resolved'
  resolution_notes    TEXT,
  confirmed_at        TIMESTAMPTZ
);

CREATE TABLE erp_post_log (                   -- append-only, never updated in place
  id              BIGSERIAL PRIMARY KEY,
  order_id        BIGINT NOT NULL REFERENCES "order"(id),
  attempt_no      INT NOT NULL,
  request_payload JSONB NOT NULL,
  response_body   JSONB,
  http_status     INT,
  status          TEXT NOT NULL,              -- 'success' | 'retryable' | 'failed'
  oracle_doc_no   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE ecr_sequence (                   -- allocate inside a transaction
  year_yy       CHAR(2) NOT NULL,
  location_code CHAR(2) NOT NULL,
  book_code     CHAR(2) NOT NULL,
  next_value    INT NOT NULL DEFAULT 1,
  PRIMARY KEY (year_yy, location_code, book_code)
);
```

---

## 9. Order state machine

Implement this as an explicit, enforced transition table in the Order service. Do not let
any endpoint set `status` freely.

```
PLACED ──→ FILLED ──→ ASSIGNED ──→ DISPATCHED ──→ DELIVERED ──→ CONFIRMED
                                                       │              │
                                                       │              ▼
                                                       │        RECONCILED ──→ POSTED
                                                       │              │
                                                       ▼              ▼
                                                   DISPUTED      MISMATCH_HELD
                                                                      │
                                                                      ▼
                                                                 (resolved) ──→ POSTED

Any state before DISPATCHED ──→ CANCELLED
POSTED is terminal. POST_FAILED is a retry sub-state of RECONCILED, not a terminal state.
```

| Transition | Triggered by | Side effect |
|---|---|---|
| `PLACED → FILLED` | Clerk | — |
| `FILLED → ASSIGNED` | Clerk | vehicle + route + load quantities set; validate load ≤ vehicle class capacity |
| `ASSIGNED → DISPATCHED` | Clerk | **ECR allocated** (transactional) |
| `DISPATCHED → DELIVERED` | Driver (tab, possibly offline) | delivery_event row |
| `DELIVERED → CONFIRMED` | Client signature or OTP | confirmation_event row |
| `CONFIRMED → RECONCILED` | Gate cashier | cash_reconciliation row |
| `RECONCILED → POSTED` | Integration service | erp_post_log row, Oracle doc no stored |

---

## 10. API surface (first pass)

All under `/api/v1`. JWT bearer auth, role checked server-side on every route.

```
POST   /auth/login
POST   /auth/refresh

# Client/Dealer
POST   /orders                          # Path A — client places own order
GET    /orders/mine
POST   /orders/:id/confirm              # signature payload or OTP code

# Sales
POST   /orders                          # Path B — same endpoint, origin differs by role
GET    /orders?status=&client=

# Clerk
GET    /orders/queue?location=
POST   /orders/:id/fill
POST   /orders/:id/assign               # { vehicle_id, route_id, lines:[{line_id, qty_loaded}] }
POST   /orders/:id/dispatch             # allocates ECR, returns it

# Driver tab
GET    /routes/:id/manifest             # stops + load, cached offline
POST   /deliveries                      # { client_ref (UUID), order_id, cylinders_delivered,
                                        #   empties_collected, cash_collected, gps, occurred_at }
POST   /deliveries/:id/receipt          # receipt metadata after printing
POST   /sync/batch                      # replay queued offline actions, idempotent on client_ref

# Gate cashier
GET    /reconciliations/pending?route=
POST   /reconciliations                 # { route_id, total_cash_received, ... }
POST   /reconciliations/:id/confirm     # ← the only path that enqueues the Oracle post
POST   /reconciliations/:id/hold

# Admin
GET    /audit/orders/:id                # full event trail
GET    /erp-posts?status=failed
POST   /erp-posts/:id/retry
```

**`POST /sync/batch` must be idempotent.** The tab may replay the same action after a network
failure. Dedupe on `client_ref` — a UUID generated on the device at the moment of the action,
never server-assigned.

---

## 11. Oracle integration (APEX / ORDS)

MCL's ERP is a custom Oracle APEX application, so the integration is ORDS REST endpoints
(JSON over HTTPS) backed by PL/SQL — not a packaged ERP API.

**What that changes, in your favour:** the contract is negotiable. Because Oracle's developer
writes the PL/SQL, you can ask for exactly what you need rather than conforming to a fixed
schema. Specifically, ask for:

- **One combined endpoint** accepting order + delivery + cash receipt in a single payload,
  rather than three sequential calls you must orchestrate and partially roll back.
- **Server-side idempotency**: the handler checks the ECR against a unique column before
  inserting, and returns the existing Oracle document number if it's already there. This
  makes retries safe and is trivial in PL/SQL.
- **Explicit error classification** in the response — a field that tells you retryable
  (lock, timeout) vs terminal (bad customer code, closed period). Your retry queue needs
  this distinction or it will spin forever on data errors.

**What to watch out for (decision #3):** in a home-grown APEX app, a lot of business logic
lives in page processes, dynamic actions and DB triggers behind the data-entry forms — GL
posting, stock movements, tax, numbering. A REST endpoint that does a raw INSERT can create
the row while silently skipping all of it. Insist that the new service **wraps the same
procedure the form calls**, rather than reimplementing an insert. Ask to see the form's
page-process source.

**Also get from them:** ORDS base URLs for a test workspace and production; auth method
(push for OAuth2 client credentials over Basic Auth); read access to master data — customer
codes with their cash/credit flag, item codes, location codes, price/tax codes; and whether
the APEX app already has separate dev/test/prod workspaces you can build against.

**Integration service rules:**
- Only this service holds Oracle credentials.
- Every attempt writes an `erp_post_log` row before and after the call.
- Retry with exponential backoff on retryable errors only; terminal errors raise to an admin
  queue, they do not retry.
- The ECR is the idempotency key, end to end.

---

## 12. Hosting and environments

**Status: re-opened** (decision #4). The earlier "MCL on-prem server" call was made when this
was a mostly-internal app. It now has a dealer-facing app on customers' own phones and driver
tabs syncing from the field, which means the server must be reachable from the public internet
— static IP or DDNS, port forwarding, TLS renewal, and an office connection whose outage stops
dealers ordering and drivers syncing. Plus backups, UPS, patching, on three people.

| Option | For | Against |
|---|---|---|
| **OCI**, same tenancy as APEX | Private networking to ORDS (sidesteps IP whitelisting); likely no new procurement; managed PostgreSQL available; S3-compatible object storage | Smaller ecosystem; thinner documentation, which matters when leaning on AI-assisted coding |
| Another cloud (AWS/Azure) | Mature managed services; team familiarity; densest documentation | New account + procurement; cross-cloud to Oracle (fine at this volume) |
| MCL on-prem | No recurring cost; data physically at MCL | Public exposure required; single point of failure; ops burden on you |

**Recommendation:** default to OCI *if* MCL IT will give you your own compartment with deploy
access. If every deploy means filing a ticket through someone else, that friction costs more
than co-location saves — take a plain VM somewhere you control instead.

Note: "our data must stay on-premises" is already moot — MCL's ERP data lives in Oracle's
cloud today. That decision has been made by the company.

**Make the choice cheap.** Build Docker-first with nothing vendor-proprietary: a Postgres
connection string, an S3-compatible bucket, your own job table instead of a managed queue.
Then hosting is a deployment target you can change in a day, not an architecture commitment.

**Three environments:** Dev, UAT (pointed at Oracle's test workspace), Production. Never let
a pilot post test deliveries into MCL's live books.

---

## 13. Offline-first spec for the driver tab

The tab will be out of coverage. Assume no connection at the moment of delivery.

- Download the route manifest (stops + load) once, when connectivity is available; cache locally.
- **Every driver action writes to local storage first and returns immediately.** Never block the
  UI on a network call.
- Each queued action carries a client-generated UUID (`client_ref`). The server dedupes on it.
- Background sync drains the queue when connectivity returns.
- Show a per-stop indicator: synced / pending. Nothing may fail silently.
- The receipt printer is a local Bluetooth/USB peripheral — printing works with zero network.
- Tabs are **shared devices**. Require driver login per session; log tab check-out/check-in
  against the gate team for the audit trail.

---

## 14. Hard backend rules

Enforce these in the service layer, not the UI. They are the invariants the whole design rests on.

1. **Only a confirmed `cash_reconciliation` enqueues the Oracle post.** No other code path posts.
   (Pending decision #1 — but until it changes, this is the rule.)
2. **Only the integration service calls Oracle.** No client app holds credentials or an endpoint.
3. **ECR allocation is transactional and server-side.** Never generated on a device.
4. **Separation of duties:** the users who dispatch, deliver, and confirm the sale must be
   distinct. Reject at the API layer if they aren't.
5. **`delivery_event`, `confirmation_event` and `erp_post_log` are append-only.** Corrections
   are new rows with reason codes, never updates.
6. **Offline replay is idempotent** on `client_ref`.
7. **Secrets** — Oracle credentials, SMS/push keys — come from a secrets manager by name.
   Never in the repo, never in a prompt, never in a chat log.

---

## 15. Repo structure and Claude Code setup

Monorepo. One place to look, shared types, and Claude Code sees the whole contract at once.

```
mcl-delivery/
├── CLAUDE.md                  ← project memory, see below
├── docs/
│   └── build-plan.md          ← this file
├── packages/
│   ├── shared/                ← types, validation schemas, ECR utils (single source of truth)
│   ├── api/                   ← backend REST API (NestJS or .NET)
│   ├── integration/           ← Oracle/ORDS service, retry queue
│   ├── web/                   ← back-office React app (Sales, Clerk, Cashier, Admin)
│   └── mobile/                ← RN/Flutter — shared code, two build variants
│       ├── client/            ← Client/Dealer entry point
│       └── driver/            ← Driver Tab entry point
├── db/
│   └── migrations/
└── docker-compose.yml
```

**`CLAUDE.md` seed** — put the invariants where the tool will read them every session:

```markdown
# MCL Cylinder Delivery App

## Non-negotiable rules
- Only a confirmed cash_reconciliation triggers the Oracle post. Nothing else posts.
- Only packages/integration calls Oracle. Never from api, web, or mobile.
- ECR format is YYLLBBNNNN (10 digits), allocated server-side in a transaction.
- The ECR is the idempotency key for every Oracle call.
- Dispatcher, driver, and sale-confirming cashier must be three different users.
  Enforce server-side.
- delivery_event, confirmation_event, erp_post_log are append-only.
- Offline sync dedupes on client_ref (device-generated UUID).
- Secrets come from the secrets manager by name. Never inline.

## Conventions
- Shared types live in packages/shared and are the single source of truth.
- Order status changes go through the state machine in packages/api/src/orders/state.ts.
  Never set status directly.
- Every API route declares its allowed roles explicitly.
```

**Where Claude Code earns its keep:** scaffolding, the repetitive CRUD screens across four
back-office roles, migrations, tests, documentation. That's the volume work that used to
justify a bigger team.

**Where it doesn't replace your judgment:** the ECR uniqueness constraint, Oracle POST
idempotency, the cash-reconciliation gating rule, and the RBAC boundaries. Those are the
places where a subtle mistake is expensive and easy to miss later. Review them line by line
regardless of who or what wrote the first draft.

---

## 16. Build phases

### Phase 0 — Foundations (3–4 weeks)
- [ ] Close decisions 1–4 (§2). Nothing below is safe until #1 and #3 are answered.
- [ ] Oracle developer meeting; get the ORDS contract or a commitment to build it
- [ ] Pick and buy the receipt printer; confirm its SDK works on your target Android version
- [ ] Hosting decision + Dev environment stood up
- [ ] Monorepo scaffold, CLAUDE.md, CI, migrations tooling
- [ ] Schema v1 + seed master data (locations, book types, products, vehicle classes)
- [ ] Auth + RBAC skeleton with all six roles

### Phase 1 — MVP build (18–26 weeks)
Backend/integration (Dev A) and back-office web (Dev B) run in parallel; the two mobile apps
realistically follow.

- [ ] Order service + state machine + ECR allocation
- [ ] Path B (sales order entry) end to end
- [ ] Clerk flow: queue → fill → assign vehicle/route → dispatch
- [ ] Driver tab: manifest download, offline queue, delivery capture, printer integration
- [ ] Confirmation: printed signature **and** OTP (ship both — they're simple relative to the
      reconciliation logic, little reason to phase them)
- [ ] Cashier reconciliation + hold flow
- [ ] Integration service + retry queue + Oracle post
- [ ] Path A (client/dealer app)
- [ ] Admin: audit trail, failed-post queue

**Trim aggressively to stay near the short end.** Pilot one warehouse and one route only.
If the planning team's route network isn't ready, start with a small manually-entered set —
the Route model doesn't care how the first batch was authored. Defer handover photo capture.
Skip iOS entirely.

### Phase 2 — UAT and parallel run (4–5 weeks)
Run alongside paper. Prove cash reconciliation is trustworthy before anyone relies on it.

### Phase 3 — Rollout (4–6 weeks per site batch)
Gated on route master data existing for each new site.

### Phase 4 — Enhancements (backlog)
QR cylinder tagging, route optimization, analytics.

---

## 17. What to request from other teams

**From the Oracle/APEX developer:**
- Do the ORDS endpoints exist, or must they be built? On what timeline?
- Does a REST insert replicate the form's page-process logic? Can we see that source?
- ORDS base URLs — test workspace and production
- Auth method and credentials (prefer OAuth2 client credentials)
- Proposed JSON request/response shape (co-design it — don't accept a fixed one blindly)
- Idempotency on ECR: will the handler check-before-insert and return the existing doc number?
- Error classification: retryable vs terminal, as an explicit response field
- Master data read access: customer codes + cash/credit flag, item codes, location codes,
  price and tax codes
- How partial delivery is represented (fewer cylinders delivered than ordered is normal here)
- How the cash receipt is recorded, and whether it must follow the invoice
- Whether credit clients skip the cash receipt entirely
- Cancellation/amendment endpoint for an order changed after ECR issue but before dispatch

**From the planning team:**
- Route definitions: code, name, ordered client stops — and a realistic delivery date
- Vehicle capacity classes with actual cylinder/weight limits
- Which warehouse and route for the pilot

**From sales/finance:**
- Cash vs credit client split
- Whether a cash mismatch holds the route or only the order
- Peak annual ECR volume per location per book type (validates the 4-digit sequence)

---

## 18. Success metrics

- Manual ERP data-entry effort for deliveries → zero
- Every delivery traceable to a unique ECR, end to end
- Cash reconciliation accuracy: variance detected same-day, not at month-end
- Time from delivery completion to ERP posting: hours → minutes
- Failed Oracle posts visible and retryable, never silently lost
```
