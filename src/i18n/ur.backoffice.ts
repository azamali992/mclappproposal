// Urdu — backoffice app strings. Owned by the backoffice agent; nobody else edits this file.
// Key is the exact English source string as it appears in the JSX.
// Shared domain terms belong in ur.common.ts instead.
//
// SCOPE — deliberately partial. The back office is operated by office staff
// against an Oracle ERP whose own UI is English, so English is the sensible
// default here. What is translated: nav, screen titles, section headings,
// primary buttons, and the status/confirmation copy a demo audience reads.
// What is NOT translated, on purpose:
//   • dense table column headers (ECR, Terms, Delivered, Empties, HTTP, Att.)
//   • JSON payload/response viewers and Oracle error strings
//   • audit-trail action codes (`ASSIGNED → DISPATCHED`) and order-state codes
//     (MISMATCH_HELD, POST_FAILED) — these are literal system values
//   • ECR / document / item / customer codes
// Those are English because that is what the operator types into Oracle.
import type { Dict } from './index';

export const urBackoffice: Dict = {
  // ── Shell / left nav ─────────────────────────────────────────────────────
  'Back office': 'بیک آفس',
  'Every action here is written to the audit trail with your name and role.':
    'یہاں ہر کارروائی آپ کے نام اور عہدے کے ساتھ آڈٹ ریکارڈ میں درج ہوتی ہے۔',

  // Nav groups
  Overview: 'مجموعی جائزہ',
  Operations: 'آپریشنز',
  'Cash & posting': 'نقد اور پوسٹنگ',
  Governance: 'نگرانی',

  // Nav items + their hints
  Dashboard: 'ڈیش بورڈ',
  'Today at a glance': 'آج کی صورتحال ایک نظر میں',
  'Sales desk': 'سیلز ڈیسک',
  'Take an order by phone': 'فون پر آرڈر لیں',
  'Dispatch queue': 'روانگی کی قطار',
  'Fill, assign, dispatch': 'بھرائی، تفویض، روانگی',
  'Tab desk': 'ٹیب ڈیسک',
  'Issue and return driver tabs': 'ڈرائیور ٹیبلٹ جاری اور واپس کریں',
  'Cash reconciliation': 'نقد کا ملان',
  'The only path to Oracle': 'اوریکل تک واحد راستہ',
  'Integration console': 'انٹیگریشن کنسول',
  'Oracle ORDS posts & retries': 'اوریکل ORDS پوسٹنگ اور دوبارہ کوشش',
  'Audit trail': 'آڈٹ ریکارڈ',
  'Who did what, and when': 'کس نے کیا کیا، اور کب',

  // ── Dashboard ────────────────────────────────────────────────────────────
  'Operations dashboard': 'آپریشنز ڈیش بورڈ',
  'Multan warehouse, live. Historical volume is the real Peshawar branch record.':
    'ملتان گودام، لائیو۔ ماضی کے اعداد و شمار پشاور برانچ کا اصل ریکارڈ ہیں۔',
  'Last Oracle post': 'آخری اوریکل پوسٹ',
  'Orders today': 'آج کے آرڈرز',
  'Cylinders out': 'باہر گئے سلنڈر',
  'Cash collected': 'وصول شدہ نقد',
  'Failed posts': 'ناکام پوسٹنگ',
  'Monthly volume — real historical data': 'ماہانہ حجم — اصل تاریخی ڈیٹا',

  // ── Integration console ──────────────────────────────────────────────────
  'Oracle ORDS posting — every attempt, its payload, its response, and its retry. The ECR is the idempotency key, so a document can never be raised twice.':
    'اوریکل ORDS پوسٹنگ — ہر کوشش، اس کا پے لوڈ، جواب اور دوبارہ کوشش۔ ای سی آر ہی idempotency key ہے، اس لیے کوئی دستاویز دو بار جاری نہیں ہو سکتی۔',
  'Demo control': 'ڈیمو کنٹرول',
  'Oracle ORDS endpoint': 'اوریکل ORDS اینڈ پوائنٹ',
  'Post attempts': 'پوسٹنگ کی کوششیں',

  // ── Cash reconciliation queue ────────────────────────────────────────────
  'Count the cash a returning route brought back, against what the delivered cylinders should have yielded.':
    'واپس آنے والے روٹ کی لائی ہوئی نقدی گنیں اور موازنہ کریں کہ پہنچائے گئے سلنڈروں سے کتنی رقم بننی چاہیے تھی۔',
  'This is the only path to Oracle.': 'اوریکل تک پہنچنے کا یہی واحد راستہ ہے۔',
  'Routes back at the gate': 'گیٹ پر واپس آئے روٹ',
  'Held — cash mismatch under investigation': 'روکا گیا — نقد میں فرق زیرِ تفتیش',
  'Reconciled — Oracle posting': 'ملان مکمل — اوریکل پوسٹنگ',

  // ── Reconcile drawer — the demo's centrepiece ────────────────────────────
  'Rejected by the server — rule': 'سرور نے مسترد کر دیا — قاعدہ',
  'Separation of duties. The person who dispatched or delivered an order can never be the person who confirms its cash — that is what stops a single employee from creating and closing a sale. The rule is enforced in the API, not in this screen.':
    'فرائض کی علیحدگی۔ جس شخص نے آرڈر روانہ کیا یا پہنچایا، وہی اس کی نقدی کی تصدیق نہیں کر سکتا — یہی چیز ایک ہی ملازم کو سودا بنانے اور خود ہی بند کرنے سے روکتی ہے۔ یہ قاعدہ اس اسکرین میں نہیں، API میں نافذ ہے۔',
  'Cash physically counted at the gate (PKR)': 'گیٹ پر عملاً گنی گئی نقدی (روپے)',
  Variance: 'فرق',
  'Enter the counted cash to see the variance.': 'فرق دیکھنے کے لیے گنی گئی نقدی درج کریں۔',
  'Balanced — this will post to Oracle': 'حساب برابر — یہ اوریکل میں درج ہو جائے گا',
  // Used as a label immediately before the amount, so a noun reads better in
  // Urdu than a preposition: "کمی: 5,000".
  'Short by': 'کمی:',
  'Over by': 'زیادتی:',
  '— this will be held, nothing posts': '— یہ روک لیا جائے گا، کچھ بھی پوسٹ نہیں ہوگا',
  'Confirming…': 'تصدیق ہو رہی ہے…',
  'Confirm cash count': 'نقد کی گنتی کی تصدیق کریں',
  'Nothing has been sent to Oracle.': 'اوریکل کو کچھ نہیں بھیجا گیا۔',
  'Investigation outcome — required to release': 'تفتیش کا نتیجہ — اجرا کے لیے لازمی',
  'Releasing…': 'اجرا ہو رہا ہے…',
  'Release hold & post': 'روک ہٹائیں اور پوسٹ کریں',
  'Posting to Oracle': 'اوریکل میں پوسٹ ہو رہا ہے',
  'Show the detail': 'تفصیل دکھائیں',
  'Confirm a matched cash count': 'برابر نقد گنتی کی تصدیق',
  'Confirm a cash mismatch': 'نقد کے فرق کی تصدیق',

  // ── Dispatch queue (clerk) ───────────────────────────────────────────────
  // One list, one button a row. The sentence under the title carries the only
  // number that mattered out of the five tiles that used to sit here.
  '{n} orders waiting': '{n} آرڈرز منتظر ہیں',
  'Nothing in the queue.': 'قطار میں کچھ نہیں۔',
  // The one next step a row ever offers.
  Fill: 'بھریں',
  Assign: 'تفویض کریں',
  Dispatch: 'روانہ کریں',
  Release: 'جاری کریں',

  // ── Shared order list — column headings ──────────────────────────────────
  'What was ordered': 'کیا آرڈر ہوا',
  'Requested for': 'مطلوبہ تاریخ',
  Waiting: 'انتظار',
  'Taken from': 'کہاں سے لیا گیا',
  'Oracle document': 'اوریکل دستاویز',
  Created: 'بنایا گیا',

  // ── Tab desk (gate) ──────────────────────────────────────────────────────
  'Out with drivers': 'ڈرائیوروں کے پاس',
  'On the rack': 'ریک پر موجود',
  'Out of service': 'ناکارہ',
  Devices: 'ڈیوائسز',
  'Check tab back in': 'ٹیب واپس جمع کریں',
  'Check tab out': 'ٹیب جاری کریں',

  // ── Sales desk ───────────────────────────────────────────────────────────
  'Orders taken by phone on a client’s behalf — same route into the warehouse as the client app.':
    'گاہک کی طرف سے فون پر لیے گئے آرڈرز — گودام تک وہی راستہ جو گاہک ایپ کا ہے۔',
  'Hide form': 'فارم چھپائیں',
  'New order': 'نیا آرڈر',
  'Order value': 'آرڈر کی مالیت',

  // ── Audit trail ──────────────────────────────────────────────────────────
  'Append-only. Every state change carries the actor, their role and the exact transition — no row is ever edited or deleted.':
    'صرف اضافہ۔ ہر تبدیلی کے ساتھ کارکن، اس کا عہدہ اور عین مرحلہ درج ہوتا ہے — کوئی سطر نہ بدلی جاتی ہے نہ حذف کی جاتی ہے۔',

  // ── Self-collection (clerk + sales) ──────────────────────────────────────
  // "Collection" here always means the client's own van coming to the plant,
  // never a cash collection — hence خود اٹھانا rather than وصولی.
  'How does the client get the cylinders?': 'گاہک سلنڈر کیسے حاصل کرے گا؟',
  'Deliver to client': 'گاہک تک پہنچائیں',
  'Client collects from plant': 'گاہک پلانٹ سے خود لے جائے گا',
  'Client collects': 'گاہک خود لے جائے گا',
  'Collection rate': 'خود اٹھانے کا ریٹ',
  'Collection rate — transport not included': 'خود اٹھانے کا ریٹ — ٹرانسپورٹ شامل نہیں',
  'Order value at the collection rate': 'خود اٹھانے کے ریٹ پر آرڈر کی مالیت',
  'Order #{id} placed for {client} — {n} cylinders to collect from the plant, priced off the ex-delivery card ({saving} less than delivered).':
    'آرڈر #{id} برائے {client} درج ہو گیا — {n} سلنڈر پلانٹ سے خود اٹھائے جائیں گے، ایکس ڈیلیوری ریٹ پر (ڈیلیوری کے مقابلے میں {saving} کم)۔',
  'Order #{id} placed for {client} — {n} cylinders. It is now at the top of the warehouse queue.':
    'آرڈر #{id} برائے {client} درج ہو گیا — {n} سلنڈر۔ یہ اب گودام کی قطار میں سب سے اوپر ہے۔',

  // ── Self-collections in the shared list ──────────────────────────────────
  // They no longer get a lane of their own; this tag is the whole marking.
  Collection: 'خود اٹھانا',
  'How it goes out': 'کیسے باہر جائے گا',

  // ── Release for collection (the ECR moment, shared with dispatch) ────────
  'Release for collection': 'اٹھانے کے لیے جاری کریں',
  'Release for collection and allocate the ECR': 'اٹھانے کے لیے جاری کریں اور ای سی آر جاری کریں',
  'Released for collection': 'اٹھانے کے لیے جاری کر دیا گیا',
  'Released — ECR allocated': 'جاری کر دیا گیا — ای سی آر مختص',
  Released: 'جاری شدہ',
  'Release blocked': 'اجرا روک دیا گیا',
  'Dispatch blocked': 'روانگی روک دی گئی',
  'Confirm dispatch': 'روانگی کی تصدیق کریں',
  'Dispatched — ECR allocated': 'روانہ — ای سی آر مختص',
  'Confirming issues the next number from this book. Review it first.':
    'تصدیق کرنے پر اس بک کا اگلا نمبر جاری ہو جائے گا۔ پہلے اسے دیکھ لیں۔',
  'The next number in this book': 'اس بک کا اگلا نمبر',
  'The number now on this delivery': 'اس ڈیلیوری پر موجود نمبر',
  'The number now on this collection': 'اس خود اٹھانے والے آرڈر پر موجود نمبر',
  'The number below is now permanently bound to this delivery.':
    'نیچے دیا گیا نمبر اب مستقل طور پر اس ڈیلیوری سے منسلک ہے۔',
  'The number below is now permanently bound to this collection.':
    'نیچے دیا گیا نمبر اب مستقل طور پر اس خود اٹھانے والے آرڈر سے منسلک ہے۔',
  'The order is now waiting at the counter. Record the collection when the client’s van arrives.':
    'آرڈر اب کاؤنٹر پر منتظر ہے۔ گاہک کی گاڑی آنے پر وصولی درج کریں۔',
  'Priced off the ex-delivery rate card — transport is not included, because MCL is not moving it. Wanted {date}.':
    'قیمت ایکس ڈیلیوری ریٹ لسٹ سے لی گئی ہے — ٹرانسپورٹ شامل نہیں، کیونکہ ایم سی ایل اسے نہیں لے جا رہی۔ مطلوبہ تاریخ {date}۔',
  'ECR {ecr} allocated to {client} and locked to this order.':
    'ای سی آر {ecr} {client} کے لیے مختص اور اسی آرڈر سے منسلک کر دیا گیا۔',
  'ECR {ecr} allocated. {client}’s cylinders are set aside at the counter — record the collection when their van arrives.':
    'ای سی آر {ecr} مختص ہو گیا۔ {client} کے سلنڈر کاؤنٹر پر الگ رکھ دیے گئے ہیں — ان کی گاڑی آنے پر وصولی درج کریں۔',
  'None — the client’s own van': 'کوئی نہیں — گاہک کی اپنی گاڑی',
  'Vehicle, route and driver': 'گاڑی، روٹ اور ڈرائیور',
  'Vehicle and driver': 'گاڑی اور ڈرائیور',
  'Cylinders and value': 'سلنڈر اور مالیت',
  'Allocating…': 'مختص کیا جا رہا ہے…',

  // ── Recording the handover at the counter ───────────────────────────────
  'Record collection': 'وصولی درج کریں',
  'Collection recorded': 'وصولی درج ہو گئی',
  'Collection refused': 'وصولی مسترد',
  'The client’s own vehicle is at the counter. Record what goes out and who takes it.':
    'گاہک کی اپنی گاڑی کاؤنٹر پر موجود ہے۔ درج کریں کہ کیا باہر جا رہا ہے اور کون لے جا رہا ہے۔',
  'What leaves the plant': 'پلانٹ سے کیا جا رہا ہے',
  'Handed over': 'حوالے کیے گئے',
  'Empties brought back': 'واپس لائے گئے خالی سلنڈر',
  'Who collected — name, CNIC or vehicle number': 'کس نے وصول کیا — نام، شناختی کارڈ نمبر یا گاڑی نمبر',
  'e.g. Imran Shah, CNIC 17301-…, van LES-2290': 'مثلاً عمران شاہ، شناختی کارڈ 17301-…، گاڑی LES-2290',
  'There is no driver and no signature on a collection — this line is the audit trail.':
    'خود اٹھانے پر نہ ڈرائیور ہوتا ہے نہ دستخط — یہی سطر آڈٹ ریکارڈ ہے۔',
  'Cash taken at the counter (PKR)': 'کاؤنٹر پر وصول کی گئی نقدی (روپے)',
  Expected: 'متوقع',
  'Credit account — no cash at the counter': 'ادھار اکاؤنٹ — کاؤنٹر پر نقدی نہیں',
  'The bill posts against {code}. The counter takes nothing.':
    'بل {code} کے کھاتے میں درج ہوگا۔ کاؤنٹر کچھ وصول نہیں کرتا۔',
  'What happens when you confirm': 'تصدیق کرنے پر کیا ہوگا',
  'The order moves to Delivered against ECR {ecr}, recorded by {me} at the counter. The cash joins the gate cashier’s count — and only a confirmed cash reconciliation posts anything to Oracle.':
    'آرڈر ای سی آر {ecr} کے تحت پہنچا دیا گیا کی حالت میں چلا جاتا ہے، جسے کاؤنٹر پر {me} نے درج کیا۔ نقدی گیٹ کیشیئر کی گنتی میں شامل ہو جاتی ہے — اور اوریکل میں صرف تصدیق شدہ نقد ملان کے بعد ہی کچھ درج ہوتا ہے۔',
  'The order moves to Delivered against ECR {ecr}, recorded by {me} at the counter. Nothing is collected now; the bill posts to Oracle against the client’s account after reconciliation.':
    'آرڈر ای سی آر {ecr} کے تحت پہنچا دیا گیا کی حالت میں چلا جاتا ہے، جسے کاؤنٹر پر {me} نے درج کیا۔ ابھی کچھ وصول نہیں ہوتا؛ ملان کے بعد بل گاہک کے کھاتے میں اوریکل میں درج ہو جاتا ہے۔',
  '{n} cylinder(s) fewer than were released — the bill follows what actually went out.':
    'جاری کیے گئے سلنڈروں سے {n} کم — بل اسی کے مطابق بنے گا جو واقعی باہر گیا۔',
  '{n} cylinders out · {b} on the bill': '{n} سلنڈر باہر · بل {b}',
  'Record who is taking the cylinders before you confirm.':
    'تصدیق سے پہلے درج کریں کہ سلنڈر کون لے جا رہا ہے۔',
  'This order has not been released yet. Release it for collection first — that is where the ECR is allocated.':
    'یہ آرڈر ابھی جاری نہیں ہوا۔ پہلے اسے اٹھانے کے لیے جاری کریں — ای سی آر وہیں مختص ہوتا ہے۔',
  'Confirm handover': 'حوالگی کی تصدیق کریں',
  'Not yet': 'ابھی نہیں',
  'Order #{id} collected by {who}. Rs {cash} taken at the counter — it now goes to the gate cashier.':
    'آرڈر #{id} {who} نے وصول کر لیا۔ کاؤنٹر پر {cash} روپے وصول ہوئے — یہ اب گیٹ کیشیئر کے پاس جائیں گے۔',
  'Order #{id} collected by {who}. It posts against {code} — nothing to collect at the counter.':
    'آرڈر #{id} {who} نے وصول کر لیا۔ یہ {code} کے کھاتے میں درج ہوگا — کاؤنٹر پر کچھ وصول نہیں کرنا۔',

  // ── Cylinder management charges ─────────────────────────────────────────
  'Cylinder management charges': 'سلنڈر مینجمنٹ چارجز',
  'No cylinder management work on this order yet.': 'اس آرڈر پر ابھی کوئی سلنڈر مینجمنٹ کام نہیں۔',
  'Add cylinder management work': 'سلنڈر مینجمنٹ کا کام شامل کریں',
  'Add to the bill': 'بل میں شامل کریں',
  'Service work': 'سروس کا کام',
  Goods: 'مال',
  'Client’s bill': 'گاہک کا بل',
  'per cylinder': 'فی سلنڈر',
  'Take this charge off the bill': 'یہ چارج بل سے ہٹا دیں',
  'Charge added to the bill': 'چارج بل میں شامل ہو گیا',
  '{name} ×{qty} added — the client’s bill is now {total}.':
    '{name} ×{qty} شامل — گاہک کا بل اب {total} ہے۔',
  'Charge removed': 'چارج ہٹا دیا گیا',
  '{name} taken off the bill.': '{name} بل سے ہٹا دیا گیا۔',
  'Charge refused': 'چارج مسترد',
  'Removal refused': 'ہٹانا مسترد',
  'This bill is closed — charges can no longer be added or removed. A correction is a new document, never an edit.':
    'یہ بل بند ہو چکا ہے — اب چارج نہ شامل ہو سکتے ہیں نہ ہٹ سکتے ہیں۔ درستگی ہمیشہ نئی دستاویز ہوتی ہے، ترمیم کبھی نہیں۔',
  'Only the platform clerk adds cylinder management work.':
    'سلنڈر مینجمنٹ کا کام صرف پلیٹ فارم کلرک شامل کرتا ہے۔',

  // ── Order form / bill wording shared by both features ───────────────────
  'What they are ordering': 'وہ کیا آرڈر کر رہے ہیں',
  'Unit price': 'فی یونٹ قیمت',
  'How many': 'کتنے',
  'Add another product': 'ایک اور پروڈکٹ شامل کریں',
  'Place order': 'آرڈر درج کریں',
  'Order placed': 'آرڈر درج ہو گیا',
  Totals: 'کل میزان',
  Value: 'مالیت',
  cylinders: 'سلنڈر',
  each: 'فی عدد',
  includes: 'اس میں شامل',
  'service work': 'سروس کا کام',
};
