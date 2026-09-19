# Agent contract — read this before writing a line

Several agents are building this demo **concurrently**. This file is the shared
contract. Follow it exactly; you cannot ask the other agents questions.

## The product

"MCL Delivery" — cylinder delivery operations for Multan Chemicals Ltd, a
Pakistani industrial & medical gas company. It replaces hand-written ECR paper
bills and a re-keying data-entry team with one connected app. The demo is being
shown to a CEO in under an hour to win the project. Visual quality and a
convincing end-to-end story matter as much as correctness.

## Stack

Vite + React 18 + TypeScript + Tailwind v3. No router, no state library, no
component library, no icon package. **Do not install anything.** Everything you
need already exists in `src/core` and `src/ui`.

## Absolute rules

1. **Only edit the files you were told you own.** Creating or rewriting another
   agent's file will destroy their work.
2. **No business logic in screens.** Every mutation goes through `api.*` from
   `src/core/store.ts`. Never set `order.status` yourself, never compute an ECR,
   never write to arrays in state. If a rule seems missing, it belongs in the
   store — flag it in your report instead of working around it.
3. Read state with `useStore(selector)`. Never import `getState()` into a render.
4. Catch `RuleError` from every `api.*` call and surface `err.message` in a
   toast. **The rejections are a demo feature** — they prove the rules are
   enforced server-side, so make them visible and legible, not swallowed.
5. Run `npx tsc --noEmit` before you finish and fix every error **in your own
   files**. Errors in other agents' files are expected while they work — ignore
   those.
6. Everything must render with real seeded data on first load. No screen may be
   empty on arrival.

## `src/core/store.ts` — the backend

```ts
import { useStore, useCurrentUser, api, select, RuleError,
         orderValue, orderCylinders, expectedCash } from '../../core/store';
```

### Reading

```ts
const orders  = useStore(s => s.orders);
const me      = useCurrentUser();                    // AppUser
const queue   = useStore(s => select.clerkQueue(s, 1));
const client  = useStore(s => select.client(s, order.clientId));
```

`select` helpers (all take `state` first):
`client, clientName, product, route, vehicle, vehicleClass, user, location,
bookType, order, clerkQueue(s, locationId?), driverManifest(s, driverId),
pendingReconciliation(s), ordersForClient(s, clientId), failedPosts(s),
auditForOrder(s, orderId), nextEcrPreview(s, locationId, bookTypeId)`

Top-level state fields: `users, clients, products, locations, bookTypes,
vehicles, vehicleClasses, routes, routeStops, tabDevices, orders,
deliveryEvents, confirmationEvents, reconciliations, erpPostLogs, audit,
otpChallenges, ecrSequences, currentUserId, online, queue, syncing, oracleUp,
postingOrderIds`.

Money helpers: `orderValue(order, {delivered?})`, `orderCylinders(order, field?)`,
`expectedCash(order)` — returns 0 for credit clients.

### Writing — every one of these can throw `RuleError`

```ts
api.switchUser(userId)
api.reset()

api.placeOrder({ clientId, locationId, bookTypeId, requestedDate, notes?,
                 lines: [{ productId, qtyOrdered }] })       // → Order
api.fillOrder(orderId, loaded?: [{ lineId, qtyLoaded }])
api.assignOrder(orderId, { vehicleId, routeId, driverId,
                           lines?: [{ lineId, qtyLoaded }] })  // capacity-checked
api.dispatchOrder(orderId)                                    // → ECR string
api.cancelOrder(orderId, reason)

api.checkOutTab(deviceId, driverId)
api.checkInTab(deviceId)

api.setOnline(bool)
api.recordDelivery({ orderId, cylindersDelivered, emptiesCollected,
                     cashCollected, gpsLat?, gpsLng?,
                     lines?: [{ lineId, qtyDelivered, qtyReturned, reasonCode? }] })  // → clientRef
api.requestOtp(orderId)                                       // → 6-digit code
api.confirmDelivery({ orderId, method:'signature'|'otp',
                      signatureDataUrl?, otpCode?, receiptRef?, notes? })
api.disputeDelivery(orderId, notes)
await api.syncNow()

await api.reconcile({ routeId, vehicleId, driverId, orderIds,
                      totalCashReceived, notes? })            // async — posts to Oracle
await api.resolveHold(reconciliationId, notes)

api.setOracleUp(bool)
await api.retryPost(orderId)
api.buildOraclePayload(orderId)                               // → the JSON sent to ORDS
```

### Invariants the store enforces (do not duplicate, do demonstrate)

- ECR `YYLLBBNNNN` allocated **only** at dispatch, server-side, transactionally.
- Only a **matched** cash reconciliation posts to Oracle. Nothing else.
- Separation of duties — dispatcher ≠ driver ≠ cashier, rejected at the API.
- Vehicle capacity validated on assign.
- Offline queue deduped on a device-generated `client_ref` UUID.
- `delivery_event`, `confirmation_event`, `erp_post_log` are append-only.

## `src/ui` — design system

Import from `../../ui/primitives`, `../../ui/icons`, `../../ui/charts`.
A design agent is building these in parallel. Available components include:

`Button, IconButton, Card, CardHeader, CardBody, CardFooter, Badge, StatusPill,
StatTile, Table, THead, TR, TH, TD, Input, NumberStepper, Select, Textarea,
Field, Checkbox, Toggle, Modal, Drawer, Toast, ToastProvider, useToast, Tabs,
EmptyState, Spinner, ProgressBar, Skeleton, PipelineTracker, PhoneFrame,
TabletFrame, SignaturePad, KeyValue, DefinitionList, Money, Qty, Timestamp,
EcrTag, Avatar, SectionTitle, Divider, CodeBlock`

Charts: `BarChart, Sparkline, DonutStat`.

**If `src/ui/primitives.tsx` does not exist yet when you start, wait by building
your screens against these names anyway** — they will exist by integration time.
Read the file if it is present; its header comment documents the palette and
variants. Never edit it.

## Screen conventions

- Currency is PKR — always via `<Money value={n} />`, never raw.
- Quantities and ECRs use tabular numerals — use `<Qty>` and `<EcrTag>`.
- Every destructive or state-advancing action confirms in a `Modal` first, and
  the modal states **what the system will do next** (e.g. "this allocates an ECR
  and it can never be reissued").
- Show the rule, not just the result: where an action is gated, say why.
- Empty states never appear on first load, but write one anyway for filtered views.

## Your export

Each app folder exports a single default component from its `index.tsx`:

```
src/apps/backoffice/index.tsx   → export default function BackOffice()
src/apps/driver/index.tsx       → export default function DriverTab()
src/apps/client/index.tsx       → export default function ClientApp()
```

The shell (`src/App.tsx`, owned by the lead) renders exactly one of these based
on the current user's role, inside the appropriate device frame. Do not render
your own frame, header chrome, or role switcher — the shell provides those.
Assume you are handed a content area and fill it.
