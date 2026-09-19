// One order, placed by a dealer, followed all the way to POSTED in Oracle —
// the exact path the demo takes on stage, in order, with the role switch at each
// step. If this passes, the whole story can be told without a dead end.
// Run: npm run flow
import { api, getState, select, expectedCash, orderCylinders, quoteCash, serviceChargeTotal, RuleError } from '../src/core/store.ts';

const U = { dealer: 1, sales: 2, clerk: 3, driver: 4, gate: 5, cashier: 6, admin: 7 };

let step = 0;
let failures = 0;

function beat(role: string, what: string) {
  step++;
  console.log(`\n── ${step}. [${role}] ${what}`);
}
function ok(label: string, cond: boolean, extra = '') {
  console.log(`   ${cond ? '✓' : '✗'} ${label}${extra ? ' — ' + extra : ''}`);
  if (!cond) failures++;
}
const s = () => getState();
const money = (n: number) => 'Rs ' + n.toLocaleString('en-PK');

// ─────────────────────────────────────────────────────────────────────────────
beat('Dealer', 'places an order from their own phone');
api.switchUser(U.dealer);
const me = s().users.find((u) => u.id === U.dealer)!;
const client = select.client(s(), me.clientId!)!;
// A single cylinder is the real median order in the Peshawar data.
const product = s().products.find((p) => p.bookTypeId === 2)!;
const order = api.placeOrder({
  clientId: client.id,
  locationId: 1,
  bookTypeId: product.bookTypeId,
  requestedDate: new Date().toISOString(),
  lines: [{ productId: product.id, qtyOrdered: 2 }],
});
ok(`order #${order.id} created for ${client.name}`, order.status === 'PLACED');
ok('no ECR burned at order time', order.ecr === null);
ok('payment terms visible', !!client.paymentTerms, client.paymentTerms);

// ─────────────────────────────────────────────────────────────────────────────
beat('Clerk', 'sees it in the warehouse queue and fills it');
api.switchUser(U.clerk);
ok('order is in the clerk queue', select.clerkQueue(s(), 1).some((o) => o.id === order.id));
api.fillOrder(order.id);
ok('status advanced', s().orders.find((o) => o.id === order.id)!.status === 'FILLED');

// ─────────────────────────────────────────────────────────────────────────────
beat('Clerk', 'tries an over-capacity vehicle, then assigns properly');
try {
  const o = s().orders.find((x) => x.id === order.id)!;
  const keep = o.lines[0].qtyLoaded;
  o.lines[0].qtyLoaded = 999;
  api.assignOrder(order.id, { vehicleId: 2, routeId: 1, driverId: U.driver });
  o.lines[0].qtyLoaded = keep;
  ok('over-capacity was rejected', false, 'it went through — capacity rule not firing');
} catch (e) {
  const o = s().orders.find((x) => x.id === order.id)!;
  o.lines[0].qtyLoaded = 2;
  ok('over-capacity rejected', e instanceof RuleError, (e as Error).message);
}
api.assignOrder(order.id, { vehicleId: 1, routeId: 1, driverId: U.driver });
const assigned = s().orders.find((o) => o.id === order.id)!;
ok('vehicle, route and driver set', assigned.status === 'ASSIGNED');

// ─────────────────────────────────────────────────────────────────────────────
beat('Clerk', 'confirms dispatch — the ECR is allocated');
const preview = select.nextEcrPreview(s(), 1, product.bookTypeId);
const ecr = api.dispatchOrder(order.id);
ok('ECR matches what was previewed', ecr === preview, ecr);
ok('ECR is 10 digits', /^\d{10}$/.test(ecr), `${ecr.slice(0,2)}|${ecr.slice(2,4)}|${ecr.slice(4,6)}|${ecr.slice(6)}`);
ok('it can never be reissued', (() => { try { api.dispatchOrder(order.id); return false; } catch { return true; } })());

// ─────────────────────────────────────────────────────────────────────────────
beat('Driver', 'takes a shared tab and goes out of coverage');
api.switchUser(U.driver);
api.checkOutTab(1, U.driver);
ok('tab checked out and logged', s().tabDevices.find((t) => t.id === 1)!.checkedOutBy === U.driver);
const manifest = select.driverManifest(s(), U.driver);
ok('order is on the manifest', manifest.some((o) => o.id === order.id), `${manifest.length} stops`);
api.setOnline(false);
ok('device is offline', s().online === false);

// ─────────────────────────────────────────────────────────────────────────────
beat('Driver', 'records the delivery with no network');
const due = assigned.lines.reduce((t, l) => t + (l.qtyLoaded ?? 0) * l.unitPrice, 0);
const cash = client.paymentTerms === 'cash' ? due : 0;
const ref = api.recordDelivery({
  orderId: order.id,
  cylindersDelivered: 2,
  emptiesCollected: 2,
  cashCollected: cash,
});
ok('write returned instantly and locally', s().orders.find((o) => o.id === order.id)!.status === 'DELIVERED');
ok('queued, not yet on the server', s().queue.some((q) => q.clientRef === ref && q.state === 'pending'));
ok('nothing reached the server', !s().deliveryEvents.some((d) => d.clientRef === ref));
ok(client.paymentTerms === 'credit' ? 'credit client — no cash asked for' : 'cash collected', true, money(cash));

// ─────────────────────────────────────────────────────────────────────────────
beat('Driver', 'the customer confirms');
const code = api.requestOtp(order.id);
try {
  api.confirmDelivery({ orderId: order.id, method: 'otp', otpCode: '000000' });
  ok('a wrong OTP is rejected', false);
} catch (e) {
  ok('a wrong OTP is rejected', e instanceof RuleError, (e as Error).message);
}
api.confirmDelivery({ orderId: order.id, method: 'otp', otpCode: code });
ok('confirmed against the ECR', s().orders.find((o) => o.id === order.id)!.status === 'CONFIRMED');

// ─────────────────────────────────────────────────────────────────────────────
beat('Driver', 'comes back into coverage — the queue drains');
api.setOnline(true);
await new Promise((r) => setTimeout(r, 1600));
ok('queue drained', s().queue.every((q) => q.state === 'synced'));
ok('written to the server exactly once', s().deliveryEvents.filter((d) => d.clientRef === ref).length === 1);
await api.syncNow();
await new Promise((r) => setTimeout(r, 1200));
ok('replaying does not duplicate it', s().deliveryEvents.filter((d) => d.clientRef === ref).length === 1);

// ─────────────────────────────────────────────────────────────────────────────
beat('Cashier', 'counts the cash at the gate — first a mismatch');
api.switchUser(U.cashier);
const group = select.pendingReconciliation(s()).find((g) => g.orders.some((o) => o.id === order.id));
ok('the returning route is in the queue', !!group);
if (!group) {
  console.log('\nFLOW BROKEN: the order never reached the cashier queue.\n');
  process.exit(1);
}
const expected = group.orders.reduce((t, o) => t + expectedCash(o), 0);
console.log(`   route ${select.route(s(), group.routeId)?.code} · ${group.orders.length} order(s) · expected ${money(expected)}`);
await api.reconcile({
  routeId: group.routeId, vehicleId: group.vehicleId, driverId: group.driverId,
  orderIds: group.orders.map((o) => o.id),
  totalCashReceived: expected + 1000, // deliberately wrong
});
ok('mismatch holds the route', s().orders.find((o) => o.id === order.id)!.status === 'MISMATCH_HELD');
ok('nothing was sent to Oracle', !s().orders.find((o) => o.id === order.id)!.oracleDocNo);

// ─────────────────────────────────────────────────────────────────────────────
beat('Cashier', 'resolves the hold — the Oracle post fires');
const rec = s().reconciliations.find((r) => r.status === 'mismatch_held')!;
await api.resolveHold(rec.id, 'Extra Rs 1,000 was a previous-day balance. Counted twice; corrected.');
await new Promise((r) => setTimeout(r, 2200));
const done = s().orders.find((o) => o.id === order.id)!;
ok('order is POSTED', done.status === 'POSTED');
ok('Oracle document number stored', !!done.oracleDocNo, done.oracleDocNo);

// ─────────────────────────────────────────────────────────────────────────────
beat('Admin', 'the trail is complete');
api.switchUser(U.admin);
const logs = s().erpPostLogs.filter((l) => l.orderId === order.id);
ok('every Oracle attempt logged', logs.length >= 1, `${logs.length} attempt(s)`);
ok('exactly one success for this ECR', logs.filter((l) => l.status === 'success').length === 1);
const trail = select.auditForOrder(s(), order.id);
ok('append-only audit covers the journey', trail.length >= 7, `${trail.length} entries`);
const actors = new Set(trail.map((a) => a.actorId));
ok('more than one person is accountable', actors.size >= 3, `${actors.size} distinct actors`);

console.log('\n── Journey of ECR ' + ecr);
for (const a of [...trail].reverse()) {
  console.log(`   ${new Date(a.at).toLocaleTimeString('en-GB')}  ${a.actorRole.padEnd(8)} ${a.action}`);
}
console.log(`\n   ${orderCylinders(s().orders.find(o=>o.id===order.id)!, 'qtyDelivered')} cylinders delivered · ${money(cash)} cash · Oracle ${done.oracleDocNo}`);

// ─────────────────────────────────────────────────────────────────────────────
// Self-collection: the client's own van. No vehicle, no route, the ex-delivery
// rate card, plus cylinder management work billed on the same document.
beat('Clerk', 'a self-collection, priced off the ex-delivery rate card');
api.switchUser(U.clerk);
{
  const coll = s().orders.find((o) => o.fulfilment === 'collection' && o.status === 'FILLED');
  if (!coll) {
    ok('a collection order is seeded', false);
  } else {
    const p0 = select.product(s(), coll.lines[0].productId)!;
    ok('priced off the collection rate', coll.lines[0].unitPrice === p0.collectionPrice,
      `${money(p0.collectionPrice)} vs ${money(p0.unitPrice)} delivered`);

    try {
      api.assignOrder(coll.id, { vehicleId: 1, routeId: 1, driverId: U.driver });
      ok('a collection cannot be given a vehicle', false, 'the API accepted it');
    } catch (e) {
      ok('a collection cannot be given a vehicle', e instanceof RuleError, (e as Error).message);
    }

    const before = serviceChargeTotal(coll);
    api.addServiceCharge(coll.id, 2, 1, 'Returned with flaking paint');
    const after = serviceChargeTotal(s().orders.find((o) => o.id === coll.id)!);
    ok('a service charge lands on the bill', after - before === 1950, `+${money(after - before)} repaint`);

    const cEcr = api.releaseForCollection(coll.id);
    ok('a collection still burns an ECR at release', /^[0-9]{10}$/.test(cEcr), cEcr);

    const quoted = quoteCash(s().orders.find((o) => o.id === coll.id)!);
    api.recordCollection({ orderId: coll.id, collectedBy: 'Shahid — pickup LES-2291', cashCollected: quoted });
    const handed = s().orders.find((o) => o.id === coll.id)!;
    ok('handover recorded at the counter', handed.status === 'DELIVERED', handed.collectedBy);
    ok('bill covers goods and service work', quoted > 0, money(quoted));

    const payload = api.buildOraclePayload(coll.id) as Record<string, unknown>;
    ok('Oracle payload names the rate card', payload.rate_card === 'EX_DELIVERY');
    const charges = payload.service_charges as unknown[];
    ok('Oracle payload carries the service work', Array.isArray(charges) && charges.length > 0,
      `${charges.length} charge line(s)`);
  }
}

console.log(`\n${failures === 0 ? 'FULL FLOW WORKS END TO END' : failures + ' STEP(S) FAILED'}\n`);
process.exit(failures === 0 ? 0 : 1);
