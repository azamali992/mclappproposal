// Urdu — driver app strings. Owned by the driver agent; nobody else edits this file.
// Key is the exact English source string as it appears in the JSX.
// Shared domain terms belong in ur.common.ts instead.
//
// Register: this is read one-handed, at a gate, by a working driver. It uses
// the transliterations the trade actually speaks — سلنڈر، آرڈر، ڈیلیوری،
// او ٹی پی، رسید، ٹیبلٹ، سِنک، سرور — rather than pure-Urdu coinages nobody
// would recognise on a tablet screen.
//
// Deliberately NOT translated anywhere below:
//   • ECR numbers, client_ref UUIDs, Oracle document and customer codes
//   • SKU / item codes, registration plates, device ids, route codes
//   • field and function names quoted from the contract (client_ref,
//     delivery_event, confirmation_event, expectedCash(), receipt_ref)
//   • order statuses shouted in caps (DISPATCHED, DELIVERED, CONFIRMED,
//     DISPUTED) — these are the symbols the office quotes back on the phone
//   • all digits, which stay Latin
import type { Dict } from './index';

export const urDriver: Dict = {
  // ── Shift start (TabLogin) ───────────────────────────────────────────────
  'Driver Tab': 'ڈرائیور ٹیبلٹ',
  'Start of shift': 'شفٹ کا آغاز',
  'This tablet is shared. Sign in against your own name and take one device — the check-out is written to the audit trail, so every cylinder and every rupee captured today traces back to a person.':
    'یہ ٹیبلٹ مشترکہ ہے۔ اپنے نام سے سائن اِن کریں اور ایک ڈیوائس لیں — اجرا آڈٹ ریکارڈ میں درج ہوتا ہے، اس لیے آج کا ہر سلنڈر اور ہر روپیہ کسی ایک شخص تک پہنچتا ہے۔',
  'Gate handover': 'گیٹ پر حوالگی',
  'Who is driving': 'ڈرائیور کون ہے',
  'Which tab': 'کون سا ٹیبلٹ',
  '{stops} stops · {cylinders} cylinders': '{stops} اسٹاپ · {cylinders} سلنڈر',
  'No live manifest today': 'آج کوئی مینی فیسٹ نہیں ہے',
  'Out of service': 'خراب ہے',
  'Held by {name}': '{name} کے پاس ہے',
  Yours: 'آپ کا',
  Available: 'دستیاب',
  'A tab already checked out to someone else is refused at the API, not hidden in the UI — try it and the rule speaks for itself.':
    'جو ٹیبلٹ پہلے سے کسی اور کے نام جاری ہو، اسے سسٹم خود روکتا ہے — اسکرین پر چھپایا نہیں جاتا۔ آزما کر دیکھیں، اصول خود بول پڑے گا۔',
  'Pick a driver and a tab to begin.': 'شروع کرنے کے لیے ڈرائیور اور ٹیبلٹ منتخب کریں۔',
  '{driver} takes {device} — {stops} stops on {route}, {cylinders} cylinders on board.':
    '{driver} کو {device} دیا جا رہا ہے — روٹ {route} پر {stops} اسٹاپ، گاڑی میں {cylinders} سلنڈر۔',
  '{driver} takes {device} — no stops assigned yet today.':
    '{driver} کو {device} دیا جا رہا ہے — آج ابھی کوئی اسٹاپ مقرر نہیں ہوا۔',
  'Check out tab & start shift': 'ٹیبلٹ لیں اور شفٹ شروع کریں',
  'Check out this tab?': 'یہ ٹیبلٹ جاری کریں؟',
  'Confirm check-out': 'اجرا کی تصدیق کریں',
  'The system will bind {device} to {driver} until it is checked back in, block anyone else from claiming it, and stamp this driver onto every delivery captured on the device.':
    'سسٹم {device} کو {driver} کے نام کر دے گا جب تک یہ واپس جمع نہ ہو، کسی اور کو لینے نہیں دے گا، اور اس ڈیوائس پر ہونے والی ہر ڈیلیوری پر اسی ڈرائیور کا نام لگا دے گا۔',
  'This is the accountability link the paper ECR book never had: device → driver → drop → cash.':
    'جوابدہی کی یہ کڑی کاغذی ای سی آر بک میں کبھی نہیں تھی: ڈیوائس ← ڈرائیور ← ڈیلیوری ← نقد۔',
  '{driver} signed in on {device}': '{driver} نے {device} پر سائن اِن کر لیا',
  'Check-out logged. Every drop recorded on this tab now carries this driver and this device.':
    'اجرا درج ہو گیا۔ اب اس ٹیبلٹ پر ہونے والی ہر ڈیلیوری پر یہی ڈرائیور اور یہی ڈیوائس درج ہوگی۔',

  // ── Header / shell (index) ───────────────────────────────────────────────
  'On board': 'گاڑی میں',
  'Tap to go offline': 'آف لائن ہونے کے لیے دبائیں',
  'Tap to reconnect': 'دوبارہ جڑنے کے لیے دبائیں',
  queued: 'قطار میں',
  'End shift': 'شفٹ ختم کریں',
  'End shift and check the tab in?': 'شفٹ ختم کر کے ٹیبلٹ جمع کرا دیں؟',
  'Keep working': 'کام جاری رکھیں',
  'Check tab in': 'ٹیبلٹ جمع کرائیں',
  'The system will release {device} back to the gate pool and write a check-in line to the audit trail against {driver}.':
    'سسٹم {device} کو واپس گیٹ کے حوالے کر دے گا اور {driver} کے نام آڈٹ ریکارڈ میں واپسی کا اندراج کر دے گا۔',
  '{n} actions are still queued on this tab. They stay on the device and replay on the next sync — but the gate cashier cannot reconcile your cash until they land.':
    '{n} اندراجات ابھی اس ٹیبلٹ کی قطار میں ہیں۔ یہ ڈیوائس پر محفوظ رہیں گے اور اگلے سِنک پر خود چلے جائیں گے — لیکن جب تک یہ سرور تک نہیں پہنچتے، گیٹ کیشیئر آپ کے نقد کا ملان نہیں کر سکتا۔',
  'Outbox is empty. Everything captured on this tab is on the server.':
    'آؤٹ باکس خالی ہے۔ اس ٹیبلٹ پر جو کچھ درج ہوا، سب سرور پر پہنچ چکا ہے۔',
  'Tab checked in': 'ٹیبلٹ جمع ہو گیا',
  'The device is back at the gate. The audit trail keeps your name on every drop.':
    'ڈیوائس واپس گیٹ پر پہنچ گئی۔ آڈٹ ریکارڈ میں ہر ڈیلیوری پر آپ کا نام محفوظ ہے۔',
  'Back online — replaying the outbox': 'دوبارہ آن لائن — آؤٹ باکس بھیجا جا رہا ہے',
  'Each action is matched on its client_ref, so nothing applies twice.':
    'ہر اندراج اپنے client_ref سے ملایا جاتا ہے، اس لیے کوئی چیز دو بار درج نہیں ہوتی۔',
  'Offline mode': 'آف لائن موڈ',
  'Deliveries still record instantly. They queue on this tab until signal returns.':
    'ڈیلیوری پھر بھی فوراً درج ہوتی رہے گی۔ سگنل آنے تک یہ اسی ٹیبلٹ کی قطار میں رہے گی۔',
  'Still offline': 'ابھی تک آف لائن',
  'Nothing can leave the tab until you are back on a network.':
    'جب تک نیٹ ورک نہیں آتا، ٹیبلٹ سے کچھ باہر نہیں جا سکتا۔',
  'Rejected by rule: {rule}': 'اصول نے روک دیا: {rule}',
  'Unexpected error.': 'غیر متوقع خرابی۔',
  'not allocated': 'ابھی جاری نہیں ہوا',

  // ── Manifest rail ────────────────────────────────────────────────────────
  'Today’s run': 'آج کا روٹ',
  'No route assigned': 'کوئی روٹ مقرر نہیں',
  '{n} on board': 'گاڑی میں {n}',
  '{done}/{total} done': '{done}/{total} مکمل',
  'No stops on this manifest': 'اس مینی فیسٹ پر کوئی اسٹاپ نہیں',
  'Nothing has been dispatched to this driver yet. The warehouse clerk allocates an ECR at dispatch — until then the load is not on the road.':
    'اس ڈرائیور کے نام ابھی کچھ روانہ نہیں ہوا۔ گودام کا کلرک روانگی کے وقت ای سی آر جاری کرتا ہے — اس سے پہلے مال سڑک پر نہیں ہوتا۔',
  'Cash to hand to the gate': 'گیٹ پر جمع کرانے والا نقد',
  'Credit clients contribute nothing here —': 'ادھار والے گاہک اس میں شامل نہیں —',
  'returns 0 for them.': 'ان کے لیے 0 دیتا ہے۔',
  'Disputed — flagged for the office': 'اختلاف — دفتر کو بھیج دیا گیا',
  'Confirmed {time}': '{time} پر تصدیق ہوئی',
  '{n} dropped': '{n} اتارے گئے',
  Payment: 'ادائیگی',
  'Cash taken': 'وصول شدہ نقد',
  'Cash expected': 'متوقع نقد',
  'On account': 'کھاتے میں',
  'Needs confirmation': 'تصدیق باقی ہے',
  '{n} to drop': '{n} اتارنے ہیں',

  // ── Stop detail ──────────────────────────────────────────────────────────
  Manifest: 'مینی فیسٹ',
  ECR: 'ای سی آر',
  'Credit account': 'ادھار کھاتہ',
  'Cash on delivery': 'ڈیلیوری پر نقد',
  'Capture drop': 'ڈیلیوری درج کریں',
  'Client confirms': 'گاہک کی تصدیق',
  'Captured. Now the client confirms.': 'درج ہو گیا۔ اب گاہک تصدیق کرے گا۔',
  '{out} cylinders dropped, {back} empties on board. The delivery is already saved on this tab — confirmation is a separate, append-only event.':
    '{out} سلنڈر اتارے گئے، {back} خالی سلنڈر گاڑی میں۔ ڈیلیوری اس ٹیبلٹ پر محفوظ ہو چکی ہے — تصدیق ایک الگ اندراج ہے جو صرف شامل ہوتا ہے، مٹتا نہیں۔',
  Dropped: 'اتارے گئے',
  'Empties in': 'واپس آئے خالی',
  'Hand the tablet over — get confirmation': 'ٹیبلٹ گاہک کو دیں — تصدیق لیں',
  'Stop complete. Confirmed {time} — the receipt below is what the client keeps.':
    'اسٹاپ مکمل۔ {time} پر تصدیق ہوئی — نیچے والی رسید گاہک اپنے پاس رکھے گا۔',
  'Next stop': 'اگلا اسٹاپ',
  'Saved on this tab — queued for sync': 'اس ٹیبلٹ پر محفوظ — سِنک کی قطار میں',
  'Saved and synced to the server': 'محفوظ اور سرور تک پہنچ گیا',
  'The write completed locally at {time} with no network round trip. {tail} Nothing is re-keyed and nothing can be entered twice.':
    'اندراج {time} پر ڈیوائس پر ہی مکمل ہو گیا، نیٹ ورک کا انتظار کیے بغیر۔ {tail} نہ کچھ دوبارہ ٹائپ ہوتا ہے، نہ دو بار درج ہو سکتا ہے۔',
  'It is going up now.': 'یہ ابھی جا رہا ہے۔',
  'It leaves the device the moment signal returns.': 'سگنل آتے ہی یہ ڈیوائس سے چلا جائے گا۔',
  'Recorded at {time} and acknowledged by the server against its client_ref.':
    '{time} پر درج ہوا اور سرور نے اسے اس کے client_ref کے ساتھ قبول کر لیا۔',
  'device-generated · the idempotency key': 'ڈیوائس نے بنایا · یہی دہرائے جانے سے بچاتا ہے',
  Outbox: 'آؤٹ باکس',
  'Client disputed this delivery': 'گاہک نے اس ڈیلیوری پر اختلاف کیا',
  'The drop stays on record — delivery_event is append-only and is never deleted. The dispute is a second, separate event on top of it. Nothing about this order posts to Oracle until the office resolves it.':
    'ڈیلیوری ریکارڈ میں رہے گی — delivery_event صرف شامل ہوتا ہے، کبھی مٹایا نہیں جاتا۔ اختلاف اس کے اوپر ایک دوسرا، الگ اندراج ہے۔ جب تک دفتر فیصلہ نہ کرے، اس آرڈر کا کچھ بھی اوریکل میں نہیں جائے گا۔',
  'Raised {time}': '{time} پر درج ہوا',
  'Back to manifest': 'مینی فیسٹ پر واپس',

  // ── Delivery capture ─────────────────────────────────────────────────────
  Drop: 'ڈیلیوری',
  'Drop — {n} lines': 'ڈیلیوری — {n} آئٹم',
  'Loaded at the plant:': 'پلانٹ سے لوڈ ہوا:',
  each: 'فی عدد',
  '{n} loaded': '{n} لوڈ ہوئے',
  'Cylinders dropped': 'اتارے گئے سلنڈر',
  '{n} short of the load': 'لوڈ سے {n} کم',
  'Full load — ready to submit': 'پورا لوڈ — درج کرنے کے لیے تیار',
  'All {n}': 'سارے {n}',
  None: 'کوئی نہیں',
  'Empties picked up': 'اٹھائے گئے خالی سلنڈر',
  'Cylinders coming back on the vehicle': 'جو سلنڈر گاڑی پر واپس جا رہے ہیں',
  'Same ({n})': 'اتنے ہی ({n})',
  'max {n}': 'زیادہ سے زیادہ {n}',
  '{n} cylinders not dropped — reason required': '{n} سلنڈر نہیں اتارے گئے — وجہ لکھنا ضروری ہے',
  'Select a reason code…': 'وجہ منتخب کریں…',
  'The code travels with the line to Oracle, so short deliveries stop being an argument three weeks later.':
    'یہ وجہ آئٹم کے ساتھ اوریکل تک جاتی ہے، تاکہ کم ڈیلیوری پر تین ہفتے بعد جھگڑا نہ ہو۔',

  // Reason codes — the `value` (SHORT_DELIVERY etc.) is the wire symbol and is
  // never translated; only these operator-facing labels are.
  'Short delivery — stock ran out on the vehicle': 'کم ڈیلیوری — گاڑی میں مال ختم ہو گیا',
  'Client refused part of the load': 'گاہک نے کچھ مال لینے سے انکار کیا',
  'Cylinder damaged / valve leaking': 'سلنڈر خراب / والو لیک کر رہا ہے',
  'Client not ready to receive': 'گاہک مال لینے کے لیے تیار نہیں تھا',
  'No site access at the gate': 'گیٹ سے اندر جانے کی اجازت نہیں ملی',
  'Wrong product loaded at the plant': 'پلانٹ سے غلط پروڈکٹ لوڈ ہو گیا',

  'No cash at this stop — {name} is on credit': 'اس اسٹاپ پر نقد نہیں — {name} ادھار پر ہے',
  'There is no cash field because there is no cash. expectedCash() returns Rs 0 for credit accounts, the Oracle payload carries a null cash receipt, and the gate cashier is never asked to count money that was never collected.':
    'نقد کا خانہ اس لیے نہیں کہ نقد ہے ہی نہیں۔ ادھار کھاتوں کے لیے expectedCash() صفر دیتا ہے، اوریکل کو بھیجی جانے والی رسید خالی جاتی ہے، اور گیٹ کیشیئر سے وہ رقم گننے کو کبھی نہیں کہا جاتا جو وصول ہی نہیں ہوئی۔',
  'terms: credit · limit Rs {n}': 'شرائط: ادھار · حد Rs {n}',
  'outstanding Rs {n}': 'واجب الادا Rs {n}',
  'Cash received': 'وصول شدہ نقد',
  'Expected for what is being dropped:': 'جو مال اتر رہا ہے اس کا متوقع نقد:',
  'Exact amount': 'پوری رقم',
  'Took no cash': 'نقد نہیں لیا',
  'Rs {n} short of the expected amount. This will not block you here — it surfaces at the gate, where the cashier holds the whole route and nothing posts to Oracle until it is resolved.':
    'متوقع رقم سے Rs {n} کم ہیں۔ یہاں آپ کو نہیں روکا جائے گا — یہ گیٹ پر سامنے آئے گا، جہاں کیشیئر پورا روٹ روک لیتا ہے اور معاملہ حل ہونے تک کچھ بھی اوریکل میں نہیں جاتا۔',
  'Rs {n} over the expected amount. This will not block you here — it surfaces at the gate, where the cashier holds the whole route and nothing posts to Oracle until it is resolved.':
    'متوقع رقم سے Rs {n} زیادہ ہیں۔ یہاں آپ کو نہیں روکا جائے گا — یہ گیٹ پر سامنے آئے گا، جہاں کیشیئر پورا روٹ روک لیتا ہے اور معاملہ حل ہونے تک کچھ بھی اوریکل میں نہیں جاتا۔',
  'Pick a reason code for the short line before you can record this drop.':
    'یہ ڈیلیوری درج کرنے سے پہلے کم آئٹم کی وجہ منتخب کریں۔',
  'Record {n} dropped': '{n} اتارنا درج کریں',
  'Record {n} dropped · Rs {cash}': '{n} اتارنا درج کریں · Rs {cash}',
  'Record delivery · {n} cylinders': 'ڈیلیوری درج کریں · {n} سلنڈر',
  'Record delivery': 'ڈیلیوری درج کریں',
  'Writes to this tab first. It never waits for a network.':
    'پہلے اسی ٹیبلٹ پر لکھا جاتا ہے۔ یہ نیٹ ورک کا انتظار کبھی نہیں کرتا۔',
  'Record this delivery?': 'یہ ڈیلیوری درج کریں؟',
  'Keep editing': 'ترمیم جاری رکھیں',
  'The system will, in this order:': 'سسٹم یہ کام اسی ترتیب سے کرے گا:',
  'Write delivery_event to this tab’s local store and return immediately — no network call, no spinner.':
    'delivery_event اسی ٹیبلٹ کے مقامی ریکارڈ میں لکھے گا اور فوراً واپس آ جائے گا — نہ نیٹ ورک، نہ انتظار۔',
  'Stamp it with a device-generated client_ref UUID. That key is what makes a replay safe: the same action can be sent ten times and applies exactly once.':
    'اس پر ڈیوائس کا بنایا ہوا client_ref لگائے گا۔ یہی کلید دوبارہ بھیجنے کو محفوظ بناتی ہے: ایک ہی اندراج دس بار بھیجیں، درج صرف ایک بار ہوگا۔',
  'Move ECR {ecr} from DISPATCHED to DELIVERED and queue the action for sync.':
    'ای سی آر {ecr} کو DISPATCHED سے DELIVERED پر لے جائے گا اور اندراج سِنک کی قطار میں ڈال دے گا۔',
  'You are online, so it goes up now.': 'آپ آن لائن ہیں، اس لیے یہ ابھی چلا جائے گا۔',
  'You are offline, so it waits on the device.':
    'آپ آف لائن ہیں، اس لیے یہ ڈیوائس پر ہی انتظار کرے گا۔',
  '{n} of {total}': '{total} میں سے {n}',
  'Empties collected': 'وصول کیے گئے خالی سلنڈر',
  'On account — no cash': 'کھاتے میں — نقد نہیں',
  'The sale is not final here. The client still confirms, and the gate cashier still has to match the cash before anything reaches Oracle.':
    'سودا یہاں مکمل نہیں ہوتا۔ گاہک نے ابھی تصدیق کرنی ہے، اور اوریکل تک کچھ پہنچنے سے پہلے گیٹ کیشیئر نے نقد کا ملان بھی کرنا ہے۔',
  'Saved on this tab · {ref}': 'اس ٹیبلٹ پر محفوظ · {ref}',
  'Written locally first, then queued. The server acknowledges it against this client_ref.':
    'پہلے ڈیوائس پر لکھا گیا، پھر قطار میں ڈالا گیا۔ سرور اسے اسی client_ref کے ساتھ قبول کرے گا۔',
  'No signal — the write already completed on the device. It syncs itself when you reconnect.':
    'سگنل نہیں ہے — اندراج ڈیوائس پر مکمل ہو چکا ہے۔ دوبارہ جڑتے ہی یہ خود سِنک ہو جائے گا۔',

  // ── Confirmation sheet ───────────────────────────────────────────────────
  'Client confirmation': 'گاہک کی تصدیق',
  'Client disputes this delivery': 'گاہک اس ڈیلیوری پر اختلاف کر رہا ہے',
  'A dispute is an event on top of the delivery, not a deletion. Both stay in the record.':
    'اختلاف ڈیلیوری کے اوپر ایک اندراج ہے، اسے مٹانا نہیں۔ دونوں ریکارڈ میں رہتے ہیں۔',
  'Confirmation moves ECR {ecr} to CONFIRMED and unlocks the gate cashier. It does not post to Oracle — only matched cash does that.':
    'تصدیق سے ای سی آر {ecr} کی حالت CONFIRMED ہو جاتی ہے اور گیٹ کیشیئر کا مرحلہ کھل جاتا ہے۔ یہ اوریکل میں اندراج نہیں کرتی — یہ کام صرف ملان شدہ نقد کرتا ہے۔',
  'Not now': 'ابھی نہیں',
  'Confirm delivery': 'ڈیلیوری کی تصدیق کریں',
  'Verify code': 'کوڈ کی تصدیق کریں',
  'Record dispute': 'اختلاف درج کریں',
  'Client default: {method}': 'گاہک کا طے شدہ طریقہ: {method}',
  OTP: 'او ٹی پی',
  'Sign on the glass': 'اسکرین پر دستخط',
  'Code to their phone': 'کوڈ ان کے فون پر',
  Dispute: 'اختلاف',
  'Something is wrong': 'کوئی گڑبڑ ہے',
  'Ask the client to sign below to confirm the cylinders and the cash.':
    'گاہک سے کہیں کہ سلنڈر اور نقد کی تصدیق کے لیے نیچے دستخط کر دے۔',
  Clear: 'مٹائیں',
  'Received by {name}': 'وصول کنندہ: {name}',
  'Signed at the gate · {date}': 'گیٹ پر دستخط · {date}',
  'Signature captured': 'دستخط محفوظ ہو گئے',
  'Waiting for a signature…': 'دستخط کا انتظار ہے…',
  'A single-use 6-digit code goes to the number on the client’s account. They read it out; you type it in. No paper, no forged signature.':
    'گاہک کے کھاتے والے نمبر پر ایک بار استعمال ہونے والا 6 ہندسوں کا کوڈ جاتا ہے۔ وہ پڑھ کر بتاتے ہیں، آپ ٹائپ کرتے ہیں۔ نہ کاغذ، نہ جعلی دستخط۔',
  'Send code to {phone}': '{phone} پر کوڈ بھیجیں',
  'Demo only — the SMS would say': 'صرف ڈیمو کے لیے — ایس ایم ایس میں یہ لکھا ہوگا',
  Hide: 'چھپائیں',
  Show: 'دکھائیں',
  'In the field this pane does not exist — the code only ever reaches the client’s handset. Type a wrong code to watch the backend reject it.':
    'اصل میدان میں یہ خانہ ہوتا ہی نہیں — کوڈ صرف گاہک کے فون پر جاتا ہے۔ غلط کوڈ ٹائپ کر کے دیکھیں، سسٹم خود روک دے گا۔',
  'Resend a new code': 'نیا کوڈ دوبارہ بھیجیں',
  'Enter the code': 'کوڈ درج کریں',
  Backspace: 'ایک ہندسہ مٹائیں',
  'Code sent to {phone}': '{phone} پر کوڈ بھیج دیا گیا',
  'Six digits, single use. It is consumed the moment it verifies.':
    'چھ ہندسے، صرف ایک بار۔ تصدیق ہوتے ہی یہ ختم ہو جاتا ہے۔',
  'Delivery confirmed by signature': 'ڈیلیوری کی تصدیق دستخط سے ہو گئی',
  'Written to confirmation_event — append-only, never edited.':
    'confirmation_event میں درج ہو گیا — صرف شامل ہوتا ہے، کبھی بدلا نہیں جاتا۔',
  'Delivery confirmed by OTP': 'ڈیلیوری کی تصدیق او ٹی پی سے ہو گئی',
  'The code is now consumed — it cannot be replayed.':
    'کوڈ استعمال ہو چکا ہے — اسے دوبارہ نہیں چلایا جا سکتا۔',
  'Record what the client is disputing in their words. This is the entry the office reads tomorrow morning, so be specific — quantity, condition, or price.':
    'گاہک کو جس بات پر اختلاف ہے وہ اسی کے الفاظ میں لکھیں۔ یہی اندراج کل صبح دفتر پڑھے گا، اس لیے واضح لکھیں — تعداد، حالت، یا قیمت۔',
  'e.g. Client counted 4 cylinders, not 6. Refused to sign until the office calls.':
    'مثلاً: گاہک نے 4 سلنڈر گنے، 6 نہیں۔ دفتر سے بات ہونے تک دستخط سے انکار کیا۔',
  'I understand this flags ECR {ecr} as DISPUTED, blocks it from cash reconciliation, and stops it reaching Oracle until the office resolves it. The delivery record itself is kept, not deleted.':
    'مجھے معلوم ہے کہ اس سے ای سی آر {ecr} پر DISPUTED لگ جائے گا، یہ نقد کے ملان سے نکل جائے گا، اور دفتر کے فیصلے تک اوریکل نہیں پہنچے گا۔ ڈیلیوری کا ریکارڈ خود محفوظ رہتا ہے، مٹتا نہیں۔',
  'Dispute recorded': 'اختلاف درج ہو گیا',
  'The drop stays on record. Nothing about this order posts to Oracle until the office resolves it.':
    'ڈیلیوری ریکارڈ میں رہے گی۔ دفتر کے فیصلے تک اس آرڈر کا کچھ بھی اوریکل میں نہیں جائے گا۔',
  'Note on the confirmation (optional)': 'تصدیق پر نوٹ (اختیاری)',
  'e.g. 2 cylinders short — customer accepted, will collect next run.':
    'مثلاً: 2 سلنڈر کم — گاہک نے مان لیا، اگلے چکر میں لے گا۔',

  // ── Sync / outbox ────────────────────────────────────────────────────────
  'Device outbox': 'ڈیوائس کا آؤٹ باکس',
  'Everything captured on this tab, and what the server has acknowledged':
    'اس ٹیبلٹ پر درج ہونے والی ہر چیز، اور سرور نے کیا کیا قبول کیا',
  'Online — outbox draining automatically': 'آن لائن — آؤٹ باکس خود بخود خالی ہو رہا ہے',
  'Offline — capturing to this tab': 'آف لائن — اندراج اسی ٹیبلٹ پر ہو رہا ہے',
  'Every action recorded on this device is replayed against its client_ref. The server accepts each one exactly once, in the order it happened.':
    'اس ڈیوائس پر درج ہر اندراج اپنے client_ref کے ساتھ دوبارہ بھیجا جاتا ہے۔ سرور ہر ایک کو بالکل ایک بار قبول کرتا ہے، اسی ترتیب سے جس ترتیب سے ہوا۔',
  'Carry on working. Deliveries, signatures and receipts all complete locally with no network. Nothing is lost and nothing needs re-keying at the office.':
    'کام جاری رکھیں۔ ڈیلیوری، دستخط اور رسیدیں سب نیٹ ورک کے بغیر ڈیوائس پر ہی مکمل ہو جاتی ہیں۔ نہ کچھ ضائع ہوتا ہے، نہ دفتر میں دوبارہ ٹائپ کرنا پڑتا ہے۔',
  'Go offline': 'آف لائن ہو جائیں',
  'Come back online': 'دوبارہ آن لائن ہوں',
  'Syncing…': 'سِنک ہو رہا ہے…',
  'Manual sync is disabled while offline — there is genuinely nowhere for the data to go. It is not a queue that can silently drop.':
    'آف لائن میں ہاتھ سے سِنک بند رہتا ہے — واقعی ڈیٹا کے جانے کی کوئی جگہ نہیں ہوتی۔ یہ ایسی قطار نہیں جو چپکے سے ضائع ہو جائے۔',
  'Queued on device': 'ڈیوائس پر قطار میں',
  'Synced this session': 'اس شفٹ میں سِنک ہوئے',
  'Duplicates applied': 'دو بار درج ہوئے',
  'queued in the order they happened': 'اسی ترتیب سے قطار میں جس ترتیب سے ہوئے',
  'Outbox empty': 'آؤٹ باکس خالی ہے',
  'Nothing is waiting on this tab. Record a delivery with the radio off and it appears here in under a second, with its client_ref, and stays until signal returns.':
    'اس ٹیبلٹ پر کچھ باقی نہیں۔ سگنل بند کر کے ڈیلیوری درج کریں، ایک سیکنڈ سے بھی کم میں یہ اپنے client_ref کے ساتھ یہاں آ جائے گی اور سگنل آنے تک یہیں رہے گی۔',
  'Order {id}': 'آرڈر {id}',
  'no ECR': 'ای سی آر نہیں',
  '{n} attempts': '{n} کوششیں',
  'server row written': 'سرور پر اندراج ہو گیا',
  Failed: 'ناکام',
  '{done}/{total} acknowledged': '{done}/{total} قبول ہوئے',
  'Server ledger': 'سرور کا کھاتہ',
  'No double-entry': 'کوئی دوہرا اندراج نہیں',
  '{n} duplicates': '{n} دوہرے اندراج',
  'actions queued': 'قطار میں اندراج',
  'distinct client_refs': 'الگ الگ client_ref',
  'server rows written': 'سرور پر لکھی گئی سطریں',
  'manual replays fired': 'ہاتھ سے بھیجے گئے',
  'Press Sync now as many times as you like. The replay count climbs; the server row count does not. That is the whole idempotency argument, and it is why a driver going through a tunnel mid-upload cannot bill a customer twice.':
    'جتنی بار چاہیں «ابھی سِنک کریں» دبائیں۔ بھیجنے کی گنتی بڑھتی جائے گی، سرور پر سطروں کی گنتی نہیں بڑھے گی۔ یہی پوری بات ہے کہ کوئی چیز دو بار درج نہیں ہوتی — اور یہی وجہ ہے کہ اپ لوڈ کے دوران سرنگ سے گزرنے والا ڈرائیور گاہک سے دو بار پیسے نہیں مانگ سکتا۔',
  'No server-side deliveries for this driver yet.':
    'اس ڈرائیور کی ابھی کوئی ڈیلیوری سرور پر نہیں پہنچی۔',
  'happened {a} · recorded {b}': '{a} پر ہوا · {b} پر درج ہوا',
  '{out} out / {in} in': '{out} گئے / {in} آئے',

  // ── Receipt ──────────────────────────────────────────────────────────────
  // The receipt prints bilingually: Latin line items and totals stay, and these
  // Urdu labels sit alongside the lines a customer actually reads. Whether the
  // thermal printer can render them is an open hardware question — see the
  // header comment in ReceiptPreview.tsx.
  'Delivery receipt': 'ڈیلیوری کی رسید',
  'Cylinders delivered': 'دیے گئے سلنڈر',
  'Balance on loan': 'ادھار پر باقی',
  'Charged to account': 'کھاتے میں ڈالا گیا',
  Difference: 'فرق',
  'Credit account — no cash collected': 'ادھار کھاتہ — نقد وصول نہیں ہوا',
  'Received by (customer) — signature': 'وصول کنندہ (گاہک) — دستخط',
  'Client signature': 'گاہک کے دستخط',
  'Goods received in good order and condition. Empty cylinders remain the property of MCL.':
    'مال درست حالت میں وصول ہوا۔ خالی سلنڈر ایم سی ایل کی ملکیت رہیں گے۔',
  'Thermal printer': 'تھرمل پرنٹر',
  'Paired over Bluetooth to the tab. Printing is a local peripheral call — it has nothing to do with the network, so a client still walks away with paper in a dead zone.':
    'ٹیبلٹ سے بلوٹوتھ پر جڑا ہوا ہے۔ پرنٹنگ ڈیوائس کا اپنا کام ہے — اس کا نیٹ ورک سے کوئی تعلق نہیں، اس لیے سگنل نہ ہونے پر بھی گاہک کاغذ لے کر جاتا ہے۔',
  '{n} printed': '{n} پرنٹ ہوئیں',
  'Print receipt': 'رسید پرنٹ کریں',
  'Print another copy': 'ایک اور کاپی پرنٹ کریں',
  'Printing…': 'پرنٹ ہو رہی ہے…',
  'Receipt printed': 'رسید پرنٹ ہو گئی',
  'Sent to the paired thermal printer over Bluetooth. No network involved — this works with the radio off.':
    'بلوٹوتھ کے ذریعے جڑے ہوئے تھرمل پرنٹر کو بھیج دی گئی۔ نیٹ ورک کی ضرورت نہیں — یہ سگنل بند ہونے پر بھی چلتا ہے۔',
  'Receipt {ref} printed. The client copy is signed paper; the server copy is the confirmation_event. Neither can be quietly edited afterwards.':
    'رسید {ref} پرنٹ ہو گئی۔ گاہک کی کاپی دستخط شدہ کاغذ ہے؛ سرور کی کاپی confirmation_event ہے۔ بعد میں چپکے سے کوئی بھی نہیں بدلی جا سکتی۔',
  'Integration point': 'انٹیگریشن کا مرحلہ',
  'In the shipped build this button hands the payload above to an ESC/POS driver over Bluetooth RFCOMM (58mm, 32 columns). The layout you are looking at is that byte stream rendered to screen, so what prints in Multan is what you approve here.':
    'اصل ورژن میں یہ بٹن اوپر والا ڈیٹا بلوٹوتھ RFCOMM کے ذریعے ESC/POS ڈرائیور کو دے گا (58 ملی میٹر، 32 کالم)۔ آپ جو خاکہ دیکھ رہے ہیں وہ اسی ڈیٹا کی اسکرین پر شکل ہے، یعنی ملتان میں جو پرنٹ ہوگا وہی ہے جس کی آپ یہاں منظوری دے رہے ہیں۔',
  'Printer model and SDK still to be chosen — the one hardware decision left open.':
    'پرنٹر کا ماڈل اور ایس ڈی کے ابھی منتخب ہونا باقی ہے — ہارڈویئر کا یہی ایک فیصلہ باقی ہے۔',
  'Reprints are logged; the receipt_ref never changes.':
    'دوبارہ پرنٹ کرنا ریکارڈ ہوتا ہے؛ receipt_ref کبھی نہیں بدلتا۔',
  'Urdu on paper is unconfirmed. Nastaliq is not in a standard ESC/POS code page, so printing it needs either a printer with an Urdu font ROM or the receipt rasterised to a bitmap. The Urdu on this preview is screen-only until that is tested on real hardware.':
    'کاغذ پر اردو ابھی طے نہیں ہوئی۔ نستعلیق عام ESC/POS کوڈ پیج میں شامل نہیں، اس لیے اسے پرنٹ کرنے کے لیے یا تو ایسا پرنٹر چاہیے جس میں اردو فونٹ موجود ہو، یا پوری رسید تصویر بنا کر بھیجنی ہوگی۔ جب تک اصل ہارڈویئر پر آزمایا نہیں جاتا، اس نمونے کی اردو صرف اسکرین کے لیے ہے۔',
  'This receipt was produced with the delivery still queued on the tab. The client has their paper; the server catches up on its own.':
    'یہ رسید اس وقت بنی جب ڈیلیوری ابھی ٹیبلٹ کی قطار میں تھی۔ گاہک کو کاغذ مل گیا؛ سرور خود بعد میں پہنچ جائے گا۔',
  'No confirmation event yet — the signature block prints blank for a wet signature on paper.':
    'ابھی تصدیق کا کوئی اندراج نہیں — دستخط کا خانہ خالی پرنٹ ہوگا تاکہ کاغذ پر قلم سے دستخط ہو سکیں۔',
};
