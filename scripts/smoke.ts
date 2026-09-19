// Headless walk-through of the whole pipeline, run against the real store.
// Verifies the invariants the demo claims. Run: npm run smoke
import { api, getState, select, RuleError, expectedCash } from '../src/core/store.ts';

let failures = 0;
function check(label: string, cond: boolean, extra = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}${extra ? ' — ' + extra : ''}`);
  if (!cond) failures++;
}
function expectReject(label: string, fn: () => unknown) {
  try {
    fn();
    check(label, false, 'expected a RuleError, none thrown');
  } catch (e) {
    const ok = e instanceof RuleError;
    check(label, ok, ok ? `[${(e as RuleError).rule}] ${(e as Error).message}` : String(e));
  }
}

const USER = { client: 1, sales: 2, clerk: 3, driver: 4, gate: 5, cashier: 6, admin: 7, driver2: 8 };

console.log('\n=== 1. Seeded state ===');
{
  const s = getState();
  check('products loaded from the real report', s.products.length >= 14, `${s.products.length} items`);
  check('clients loaded from the real report', s.clients.length >= 16, `${s.clients.length} parties`);
  check('orders sit at every pipeline stage', new Set(s.orders.map((o) => o.status)).size >= 6);
  const cashPending = select.pendingReconciliation(s);
  check('a route is waiting at the gate', cashPending.length > 0, `${cashPending.length} route(s)`);
}

console.log('\n=== 2. RBAC ===');
api.switchUser(USER.sales);
expectReject('sales cannot dispatch', () => api.dispatchOrder(105));
api.switchUser(USER.client);
expectReject('a client cannot order for someone else', () =>
  api.placeOrder({ clientId: 3, locationId: 1, bookTypeId: 2, requestedDate: new Date().toISOString(), lines: [{ productId: 2, qtyOrdered: 1 }] }),
);

console.log('\n=== 3. Path A — client places an order ===');
api.switchUser(USER.client);
// Derive the dealer's own client rather than hardcoding it — the seed moves.
const myClientId = getState().users.find((u) => u.id === USER.client)!.clientId!;
const order = api.placeOrder({
  clientId: myClientId,
  locationId: 1,
  bookTypeId: 2,
  requestedDate: new Date().toISOString(),
  lines: [{ productId: 2, qtyOrdered: 2 }],
});
check('order created in PLACED', order.status === 'PLACED', `#${order.id}`);
check('no ECR is burned before dispatch', order.ecr === null);

console.log('\n=== 4. State machine ===');
api.switchUser(USER.clerk);
expectReject('cannot dispatch straight from PLACED', () => api.dispatchOrder(order.id));

console.log('\n=== 5. Clerk: fill → assign → dispatch ===');
api.fillOrder(order.id);
check('order is FILLED', getState().orders.find((o) => o.id === order.id)!.status === 'FILLED');

expectReject('over-capacity assignment is refused', () => {
  // Shehzore holds 40; ask it to carry an absurd load.
  const o = getState().orders.find((x) => x.id === order.id)!;
  o.lines[0].qtyLoaded = 500;
  api.assignOrder(order.id, { vehicleId: 2, routeId: 1, driverId: USER.driver });
});
{
  const o = getState().orders.find((x) => x.id === order.id)!;
  o.lines[0].qtyLoaded = 2; // restore
}
api.assignOrder(order.id, { vehicleId: 1, routeId: 1, driverId: USER.driver });
check('order is ASSIGNED', getState().orders.find((o) => o.id === order.id)!.status === 'ASSIGNED');

const before = select.nextEcrPreview(getState(), 1, 2);
const ecr = api.dispatchOrder(order.id);
check('ECR matches the previewed next value', ecr === before, `${ecr} (preview ${before})`);
check('ECR is 10 digits', /^[0-9]{10}$/.test(ecr), ecr);
check('ECR segments are right', ecr.slice(2, 4) === '01' && ecr.slice(4, 6) === '02', `LL=${ecr.slice(2, 4)} BB=${ecr.slice(4, 6)}`);
expectReject('an ECR is never reissued', () => api.dispatchOrder(order.id));

const allEcrs = getState().orders.map((o) => o.ecr).filter(Boolean);
check('all ECRs unique', new Set(allEcrs).size === allEcrs.length, `${allEcrs.length} allocated`);

console.log('\n=== 6. Driver: offline capture ===');
api.switchUser(USER.driver);
api.setOnline(false);
const manifest = select.driverManifest(getState(), USER.driver);
check('manifest includes the new drop', manifest.some((o) => o.id === order.id), `${manifest.length} stops`);

const clientRef = api.recordDelivery({
  orderId: order.id,
  cylindersDelivered: 2,
  emptiesCollected: 2,
  cashCollected: 0, // this leg is reconciled separately; see scripts/flow.ts for the cash path
});
check('delivery recorded instantly while offline', getState().orders.find((o) => o.id === order.id)!.status === 'DELIVERED');
check('action is queued, not yet synced', getState().queue.some((q) => q.clientRef === clientRef && q.state === 'pending'));
check('nothing reached the server yet', !getState().deliveryEvents.some((d) => d.clientRef === clientRef));

console.log('\n=== 7. Confirmation ===');
expectReject('wrong OTP is rejected', () => {
  api.requestOtp(order.id);
  api.confirmDelivery({ orderId: order.id, method: 'otp', otpCode: '000000' });
});
const code = api.requestOtp(order.id);
api.confirmDelivery({ orderId: order.id, method: 'otp', otpCode: code });
check('order is CONFIRMED', getState().orders.find((o) => o.id === order.id)!.status === 'CONFIRMED');

console.log('\n=== 8. Sync ===');
api.setOnline(true);
await new Promise((r) => setTimeout(r, 1600));
check('queue drained', getState().queue.every((q) => q.state === 'synced'));
check('delivery_event written once', getState().deliveryEvents.filter((d) => d.clientRef === clientRef).length === 1);
await api.syncNow();
await new Promise((r) => setTimeout(r, 1200));
check('replay is idempotent', getState().deliveryEvents.filter((d) => d.clientRef === clientRef).length === 1);

console.log('\n=== 9. Cash gate ===');
api.switchUser(USER.cashier);
{
  const s = getState();
  const group = select.pendingReconciliation(s).find((g) => g.orders.some((o) => o.driverId === USER.driver2));
  if (!group) {
    check('found the route waiting at the gate', false);
  } else {
    const expected = group.orders.reduce((t, o) => t + expectedCash(o), 0);
    check('expected cash computed', expected > 0, `Rs ${expected.toLocaleString()}`);

    // Mismatch first — nothing may post.
    await api.reconcile({
      routeId: group.routeId, vehicleId: group.vehicleId, driverId: group.driverId,
      orderIds: group.orders.map((o) => o.id), totalCashReceived: expected - 5000,
    });
    const held = getState().orders.filter((o) => group.orders.some((g) => g.id === o.id));
    check('mismatch holds every order', held.every((o) => o.status === 'MISMATCH_HELD'));
    check('nothing posted on a mismatch', held.every((o) => !o.oracleDocNo));

    const rec = getState().reconciliations[0];
    await api.resolveHold(rec.id, 'Driver had handed Rs 5,000 to the fuel pump; receipt produced.');
    await new Promise((r) => setTimeout(r, 2200));
    const posted = getState().orders.filter((o) => group.orders.some((g) => g.id === o.id));
    check('resolving the hold posts to Oracle', posted.every((o) => o.status === 'POSTED'), posted.map((o) => o.oracleDocNo).join(', '));
  }
}

console.log('\n=== 10. Oracle failure and retry ===');
api.switchUser(USER.admin);
api.setOracleUp(false);
{
  const target = getState().orders.find((o) => o.status === 'POST_FAILED');
  if (target) {
    await api.retryPost(target.id);
    await new Promise((r) => setTimeout(r, 1800));
    check('retry while down stays failed', getState().orders.find((o) => o.id === target.id)!.status === 'POST_FAILED');
    api.setOracleUp(true);
    await api.retryPost(target.id);
    await new Promise((r) => setTimeout(r, 1800));
    const after = getState().orders.find((o) => o.id === target.id)!;
    check('retry succeeds once Oracle is back', after.status === 'POSTED', after.oracleDocNo);

    const logs = getState().erpPostLogs.filter((l) => l.orderId === target.id);
    check('every attempt is logged', logs.length >= 3, `${logs.length} attempts`);
    check('exactly one success per ECR', logs.filter((l) => l.status === 'success').length === 1);
  } else {
    check('found a failed post to retry', false);
  }
}

console.log('\n=== 11. Audit ===');
{
  const s = getState();
  check('audit trail is populated', s.audit.length > 10, `${s.audit.length} entries`);
  check('every entry names an actor and role', s.audit.every((a) => a.actorName && a.actorRole));
}

console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECK(S) FAILED'}\n`);
process.exit(failures === 0 ? 0 : 1);
