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
  // Arrow points leftward: under RTL that is the "forward" direction.
  'Delivery → posting': 'ڈیلیوری ← پوسٹنگ',
  'Monthly volume — real historical data': 'ماہانہ حجم — اصل تاریخی ڈیٹا',
  'Payment terms mix': 'ادائیگی کی شرائط کا تناسب',
  'Drives what the cashier expects to count': 'اسی سے طے ہوتا ہے کہ کیشیئر کتنی نقدی گنے گا',
  Pipeline: 'مراحل',

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
  'Confirm a matched cash count': 'برابر نقد گنتی کی تصدیق',
  'Confirm a cash mismatch': 'نقد کے فرق کی تصدیق',

  // ── Dispatch queue (clerk) ───────────────────────────────────────────────
  'Fill, assign, dispatch — the ECR is issued at the last step, never before.':
    'بھرائی، تفویض، روانگی — ای سی آر آخری مرحلے پر جاری ہوتا ہے، اس سے پہلے کبھی نہیں۔',
  // Lane hints (lane titles themselves are order statuses — see ur.common.ts)
  'Awaiting warehouse review': 'گودام کے جائزے کا منتظر',
  'Staged — needs a vehicle': 'تیار — گاڑی درکار',
  'Loaded — no ECR yet': 'لوڈ شدہ — ابھی ای سی آر نہیں',
  'ECR allocated · on the road': 'ای سی آر جاری · راستے میں',

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
  'My orders': 'میرے آرڈرز',
  'All sales orders': 'تمام سیلز آرڈرز',
  'Hide form': 'فارم چھپائیں',
  'New order': 'نیا آرڈر',
  'Orders taken': 'لیے گئے آرڈرز',
  'Cylinders sold': 'فروخت شدہ سلنڈر',
  'Order value': 'آرڈر کی مالیت',
  'Waiting on the warehouse': 'گودام کے منتظر',
  'Dispatch queue depth': 'روانگی قطار کی لمبائی',

  // ── Audit trail ──────────────────────────────────────────────────────────
  'Append-only. Every state change carries the actor, their role and the exact transition — no row is ever edited or deleted.':
    'صرف اضافہ۔ ہر تبدیلی کے ساتھ کارکن، اس کا عہدہ اور عین مرحلہ درج ہوتا ہے — کوئی سطر نہ بدلی جاتی ہے نہ حذف کی جاتی ہے۔',
};
