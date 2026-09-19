# MCL Cylinder Delivery App

Cylinder delivery operations for Multan Chemicals Ltd. This repo currently holds
the **working demo** — one React app whose `src/core/store.ts` simulates the
backend. `docs/build-plan.md` is the production spec; `docs/demo-architecture.md`
maps the demo onto it.

## Non-negotiable rules

These are the invariants the whole design rests on. They are enforced in the
service layer, never in the UI, and they survive the move to a real backend.

- Only a confirmed `cash_reconciliation` triggers the Oracle post. Nothing else posts.
- Only the integration service calls Oracle. Never from api, web, or mobile.
- ECR format is `YYLLBBNNNN` (10 digits), allocated server-side in a transaction,
  only at dispatch confirmation. Never generated on a device.
- The ECR is the idempotency key for every Oracle call, end to end.
- Dispatcher, driver, and sale-confirming cashier must be three different users.
  Enforce server-side and reject at the API layer.
- `delivery_event`, `confirmation_event` and `erp_post_log` are append-only.
  Corrections are new rows with reason codes, never updates.
- Offline sync dedupes on `client_ref`, a UUID generated on the device at the
  moment of the action — never server-assigned.
- Secrets come from the secrets manager by name. Never in the repo, never in a
  prompt, never in a chat log.

## Conventions

- Shared types live in `src/core/types.ts` and are the single source of truth.
- Order status changes go through the transition table in
  `src/core/stateMachine.ts`. Never set `status` directly.
- Every mutation goes through an `api.*` function in `src/core/store.ts`. Screens
  contain no business logic. If a rule seems missing, it belongs in the store.
- Every API function declares its allowed roles explicitly via `requireRole`.
- `RuleError` carries a `rule` tag. Surface `err.message` to the user — the
  rejections are the product, not an inconvenience.
- UI uses semantic design tokens from `src/ui/` only. Never raw hex, never
  Tailwind stock palettes (`slate-`, `gray-`, `blue-`).
- Money is PKR and always renders through `<Money>`. Quantities and ECRs use
  tabular numerals via `<Qty>` and `<EcrTag>`.

## Layout

```
src/core/     the backend — types, state machine, ECR allocator, store, seed data
src/ui/       design system — tokens, primitives, icons, charts
src/apps/     the three client surfaces — backoffice, driver, client
docs/         build plan, data profile, architecture, pitch materials
```

## Known gaps (demo, not production)

- State is in memory; a browser reload resets everything.
- The Oracle ORDS endpoint is stubbed. Live fault injection emits only
  *retryable* failures — the terminal branch appears in seeded history only.
- `allocateEcr` throws at >9,999 with no rollover alarm. The real Peshawar data
  reached 8,498 in one book in one year, so an alarm at 9,000 is needed before
  production.
- No real auth, no persistence, no migrations, no printer SDK, no SMS gateway.
