// Urdu — client app strings. Owned by the client agent; nobody else edits this file.
// Key is the exact English source string as it appears in the JSX.
// Shared domain terms belong in ur.common.ts instead.
//
// House style for this dictionary:
//   · Trade vocabulary a Peshawar dealer actually says is transliterated —
//     سلنڈر، آرڈر، ڈیلیوری، ای سی آر، اوریکل، ٹریک — not replaced with
//     obscure pure-Urdu coinages nobody uses on the phone.
//   · Digits stay Latin. ECR numbers, Oracle doc numbers, SKUs, customer
//     codes and registration plates are never translated.
//   · Sentences are re-written to read naturally in Urdu, not glossed word by
//     word from the English. Placeholders may move within the sentence.
import type { Dict } from './index';

export const urClient: Dict = {
  // ── Calendar ──────────────────────────────────────────────────────────────
  // Day and month names translate; the date number stays Latin.
  Sun: 'اتوار',
  Mon: 'پیر',
  Tue: 'منگل',
  Wed: 'بدھ',
  Thu: 'جمعرات',
  Fri: 'جمعہ',
  Sat: 'ہفتہ',
  Jan: 'جنوری',
  Feb: 'فروری',
  Mar: 'مارچ',
  Apr: 'اپریل',
  May: 'مئی',
  Jun: 'جون',
  Jul: 'جولائی',
  Aug: 'اگست',
  Sep: 'ستمبر',
  Oct: 'اکتوبر',
  Nov: 'نومبر',
  Dec: 'دسمبر',
  // "کل" is both yesterday and tomorrow in Urdu — the past one is
  // disambiguated so a delivery date is never read a day out.
  Today: 'آج',
  Yesterday: 'گزشتہ روز',
  Tomorrow: 'کل',
  am: 'صبح',
  pm: 'شام',

  // ── Shell ─────────────────────────────────────────────────────────────────
  'Order #{n}': 'آرڈر #{n}',
  'Confirm delivery': 'ڈیلیوری کی تصدیق',
  'Primary navigation': 'مرکزی مینیو',

  // ── Home ──────────────────────────────────────────────────────────────────
  // Urdu has no habitual afternoon greeting; the midday slot uses the salaam
  // a Pakistani trader would actually be greeted with.
  'Good morning': 'صبح بخیر',
  'Good afternoon': 'السلام علیکم',
  'Good evening': 'شام بخیر',
  '{p} products · {c} cylinders': '{p} پروڈکٹس · {c} سلنڈر',
  'Active order': 'موجودہ آرڈر',
  'On the vehicle since {time}': '{time} سے گاڑی پر ہے',
  'For {day}': '{day} کے لیے',
  ECR: 'ای سی آر',
  'Track order': 'آرڈر ٹریک کریں',
  'New order': 'نیا آرڈر',
  'No order in progress': 'کوئی آرڈر زیرِ عمل نہیں',
  'Your last delivery is closed. Reorder below when you need cylinders.':
    'آپ کی پچھلی ڈیلیوری مکمل ہو چکی ہے۔ سلنڈر درکار ہوں تو نیچے سے دوبارہ آرڈر کر دیں۔',
  'Same as last time': 'پچھلی بار جیسا',
  'Reorder {what}': '{what} دوبارہ منگوائیں',
  'One tap · delivered to {area}': 'ایک ٹیپ · {area} میں ڈیلیوری',
  'Order something else': 'کچھ اور آرڈر کریں',
  'Recent orders': 'حالیہ آرڈرز',
  'See all': 'سب دیکھیں',
  'No earlier orders on this account yet.': 'اس اکاؤنٹ پر ابھی کوئی پرانا آرڈر نہیں۔',
  'Repeat your last order?': 'پچھلا آرڈر دوبارہ دیں؟',
  'This places a new order for {what} at {where}, requested for today.':
    'اس سے {where} کے لیے {what} کا نیا آرڈر آج کی تاریخ پر درج ہو جائے گا۔',
  'What happens next': 'اس کے بعد کیا ہوگا',
  'The plant fills and loads it. No ECR bill number exists yet — one is allocated at the gate when your vehicle is dispatched, and it can never be reissued.':
    'پلانٹ سلنڈر بھر کر گاڑی پر لوڈ کرے گا۔ ابھی کوئی ای سی آر بل نمبر موجود نہیں — یہ گیٹ پر اُسی وقت جاری ہوتا ہے جب آپ کی گاڑی روانہ ہوتی ہے، اور دوبارہ کبھی جاری نہیں ہو سکتا۔',
  'Estimated value': 'تخمینی مالیت',
  'Place order': 'آرڈر دیں',
  'Repeat of order #{n}': 'پچھلے آرڈر #{n} جیسا',
  'Order #{n} placed — no ECR until it is dispatched.':
    'آرڈر #{n} درج ہو گیا — روانگی تک ای سی آر جاری نہیں ہوگا۔',

  // ── Account meters (Home + Account) ───────────────────────────────────────
  'Credit account': 'ادھار اکاؤنٹ',
  '{n}% used': '{n}% استعمال شدہ',
  Outstanding: 'واجب الادا',
  'Credit used': 'استعمال شدہ ادھار',
  Available: 'دستیاب',
  'Credit limit': 'ادھار کی حد',
  'Payment terms': 'ادائیگی کی شرائط',
  'Cash on delivery': 'ڈیلیوری پر نقد',
  'The driver collects payment when your cylinders arrive. Your receipt is closed on this phone.':
    'سلنڈر پہنچنے پر ڈرائیور ادائیگی وصول کرتا ہے۔ رسید اسی فون سے بند ہوتی ہے۔',
  'Cylinders with you': 'آپ کے پاس موجود سلنڈر',
  'delivered minus empties returned': 'ڈیلیور شدہ، منہا واپس کیے گئے خالی سلنڈر',
  '{n} arriving on today’s vehicle': '{n} آج کی گاڑی پر آ رہے ہیں',

  // ── Place order ───────────────────────────────────────────────────────────
  'Order #{n} placed.': 'آرڈر #{n} درج ہو گیا۔',
  'Order placed': 'آرڈر درج ہو گیا',
  '{place} has your request for {when}.':
    '{place} کو {when} کے لیے آپ کی درخواست موصول ہو گئی ہے۔',
  'Your reference': 'آپ کا حوالہ نمبر',
  '{n} cylinders': '{n} سلنڈر',
  'Requested for': 'کس تاریخ کے لیے',
  Value: 'مالیت',
  'No ECR number yet': 'ابھی ای سی آر نمبر نہیں',
  'An ECR bill number is allocated only at dispatch, at the gate.':
    'ای سی آر بل نمبر صرف روانگی کے وقت، گیٹ پر جاری ہوتا ہے۔',
  'Until your cylinders physically leave {place} this order carries no bill number — so an order that is never dispatched can never burn one. You will see the ECR on the tracking screen the moment the vehicle leaves.':
    'جب تک آپ کے سلنڈر {place} سے باہر نہیں نکلتے، اس آرڈر پر کوئی بل نمبر نہیں ہوتا — یعنی جو آرڈر کبھی روانہ ہی نہ ہو، وہ کوئی بل نمبر ضائع نہیں کرتا۔ گاڑی نکلتے ہی ای سی آر ٹریکنگ اسکرین پر نظر آ جائے گا۔',
  'Delivered to {address} from {place}.': '{place} سے {address} پر ڈیلیوری۔',
  'per cylinder': 'فی سلنڈر',
  'Billed against the {book} book — the book decides which ECR series your bill number comes from.':
    'بل {book} بک پر بنے گا — بک ہی طے کرتی ہے کہ آپ کا بل نمبر کس ای سی آر سیریز سے آئے گا۔',
  'Most of your orders are one cylinder.': 'آپ کے زیادہ تر آرڈر ایک ہی سلنڈر کے ہوتے ہیں۔',
  cyl: 'سلنڈر',
  'Number of cylinders': 'سلنڈروں کی تعداد',
  'Requested delivery date': 'ڈیلیوری کی مطلوبہ تاریخ',
  'Note for the driver (optional)': 'ڈرائیور کے لیے نوٹ (اختیاری)',
  'Gate 2 after 10am, ask for the shift engineer…':
    'گیٹ 2، صبح 10 بجے کے بعد، شفٹ انجینئر سے رابطہ کریں…',
  'Total, ex-tax': 'کل، ٹیکس کے بغیر',
  'Review & place order': 'جائزہ لے کر آرڈر دیں',
  'Place this order?': 'یہ آرڈر درج کریں؟',
  'What the system will do': 'سسٹم کیا کرے گا',
  'The order goes to the {place} filling queue. No ECR bill number is allocated now — it is issued at dispatch and can never be reissued. You can cancel through MCL before the vehicle leaves.':
    'یہ آرڈر {place} کی بھرائی قطار میں چلا جائے گا۔ ابھی کوئی ای سی آر بل نمبر جاری نہیں ہوتا — یہ روانگی کے وقت جاری ہوتا ہے اور دوبارہ کبھی جاری نہیں ہو سکتا۔ گاڑی نکلنے سے پہلے آپ ایم سی ایل کے ذریعے آرڈر منسوخ کرا سکتے ہیں۔',
  'Confirm order': 'آرڈر کی تصدیق کریں',

  // ── Tracking: headlines ───────────────────────────────────────────────────
  'Order received': 'آرڈر موصول ہو گیا',
  'Waiting for the plant to fill your cylinders': 'پلانٹ آپ کے سلنڈر بھرنے کا منتظر ہے',
  'Cylinders filled': 'سلنڈر بھر دیے گئے',
  'Waiting for a vehicle and a route': 'گاڑی اور روٹ کا انتظار ہے',
  'Loaded for delivery': 'ڈیلیوری کے لیے لوڈ ہو گیا',
  'Leaving the plant shortly': 'تھوڑی دیر میں پلانٹ سے روانہ ہوگا',
  'On the way to you': 'آپ کی طرف روانہ ہے',
  'Left the plant — ECR issued': 'پلانٹ سے نکل چکا ہے — ای سی آر جاری ہو گیا',
  'Delivered — please confirm': 'پہنچا دیا گیا — براہِ کرم تصدیق کریں',
  'Confirm from your phone to close the receipt':
    'رسید بند کرنے کے لیے اپنے فون سے تصدیق کریں',
  'Under review': 'زیرِ جائزہ',
  'You raised an issue — MCL is looking at it':
    'آپ نے مسئلہ درج کرایا — ایم سی ایل اسے دیکھ رہا ہے',
  'This order was cancelled': 'یہ آرڈر منسوخ کر دیا گیا تھا',
  'Completed & invoiced': 'مکمل اور انوائس شدہ',
  'Posted to MCL accounts': 'ایم سی ایل کے اکاؤنٹس میں درج ہو گیا',
  'Thank you — your receipt is closed': 'شکریہ — آپ کی رسید بند ہو چکی ہے',

  // ── Tracking: the seven customer-facing steps ─────────────────────────────
  'We have your request at the plant': 'آپ کی درخواست پلانٹ پر موجود ہے',
  'Your cylinders are filled and staged': 'آپ کے سلنڈر بھر کر رکھ دیے گئے ہیں',
  'Loaded & scheduled': 'لوڈ اور شیڈول',
  'On a vehicle, on a route': 'گاڑی پر، روٹ پر',
  'ECR bill number issued at the gate': 'گیٹ پر ای سی آر بل نمبر جاری ہوا',
  'Out for delivery': 'ڈیلیوری کے لیے روانہ',
  'On its way to your address': 'آپ کے پتے کی طرف رواں دواں',
  'Cylinders handed over, empties collected': 'سلنڈر حوالے کیے، خالی سلنڈر اٹھا لیے',
  'Confirmed by you': 'آپ کی تصدیق ہو گئی',
  'Receipt closed — nothing left to sign': 'رسید بند — اب دستخط کرنے کو کچھ باقی نہیں',
  'We are reviewing the issue you raised.': 'آپ کا درج کردہ مسئلہ زیرِ جائزہ ہے۔',

  // ── Tracking: screen ──────────────────────────────────────────────────────
  'Order not available': 'آرڈر دستیاب نہیں',
  'This order does not belong to your account.': 'یہ آرڈر آپ کے اکاؤنٹ کا نہیں ہے۔',
  Live: 'لائیو',
  'ECR bill number': 'ای سی آر بل نمبر',
  'Left {place} at {time}': '{time} پر {place} سے روانہ ہوا',
  'the plant': 'پلانٹ',
  'Your ECR bill number is allocated at the gate the moment the vehicle is dispatched — never before. An order waiting at the plant does not burn a bill number.':
    'آپ کا ای سی آر بل نمبر عین اُسی لمحے گیٹ پر جاری ہوتا ہے جب گاڑی روانہ ہوتی ہے — اس سے پہلے کبھی نہیں۔ پلانٹ پر کھڑا آرڈر کوئی بل نمبر ضائع نہیں کرتا۔',
  Progress: 'پیش رفت',
  Requested: 'درخواست شدہ',
  'ordered {n}': 'آرڈر {n}',
  'Order value': 'آرڈر کی مالیت',
  'Your note': 'آپ کا نوٹ',
  'Confirm this delivery': 'اس ڈیلیوری کی تصدیق کریں',
  'View receipt': 'رسید دیکھیں',
  'Rejected by MCL · rule {rule}': 'ایم سی ایل نے مسترد کیا · رول {rule}',
  'That could not be completed': 'یہ کام مکمل نہیں ہو سکا',

  // ── History ───────────────────────────────────────────────────────────────
  'Your orders': 'آپ کے آرڈرز',
  '{n} orders': '{n} آرڈرز',
  'Delivered to date': 'اب تک کی ڈیلیوری',
  'In progress': 'زیرِ عمل',
  Completed: 'مکمل',
  Issues: 'مسائل',
  'Nothing here yet': 'یہاں ابھی کچھ نہیں',
  'No disputed or cancelled orders — good news.':
    'کوئی متنازع یا منسوخ آرڈر نہیں — اچھی خبر ہے۔',
  'No orders match this filter.': 'اس فلٹر پر کوئی آرڈر نہیں۔',
  invoiced: 'انوائس شدہ',

  // ── Receipt ───────────────────────────────────────────────────────────────
  'Receipt not available': 'رسید دستیاب نہیں',
  'This order is not on your account.': 'یہ آرڈر آپ کے اکاؤنٹ پر نہیں ہے۔',
  'Empty Cylinder Return / delivery receipt': 'خالی سلنڈر واپسی / ڈیلیوری رسید',
  'ECR not issued — allocated at dispatch': 'ای سی آر جاری نہیں — روانگی پر جاری ہوگا',
  'Due {day}': '{day} کو متوقع',
  'Vehicle / driver': 'گاڑی / ڈرائیور',
  'Not yet assigned': 'ابھی تفویض نہیں ہوا',
  Item: 'آئٹم',
  Ord: 'آرڈر',
  Del: 'ڈیلیور',
  Empt: 'خالی',
  each: 'فی عدد',
  'Cylinders ordered / delivered': 'آرڈر شدہ / ڈیلیور شدہ سلنڈر',
  'Empties returned': 'واپس کیے گئے خالی سلنڈر',
  'Charged to credit': 'ادھار میں ڈالا گیا',
  'Cash paid to driver': 'ڈرائیور کو ادا کی گئی نقدی',
  'MCL processing': 'ایم سی ایل کی کارروائی',
  'Confirmed by one-time code': 'او ٹی پی سے تصدیق شدہ',
  'Confirmed by signature': 'دستخط سے تصدیق شدہ',
  'Not yet confirmed.': 'ابھی تصدیق نہیں ہوئی۔',
  'Invoiced in Oracle as': 'اوریکل میں انوائس نمبر',
  'Not yet posted to Oracle — posting follows cash reconciliation.':
    'ابھی اوریکل میں درج نہیں — اندراج نقدی کے ملان کے بعد ہوتا ہے۔',
  Note: 'نوٹ',

  // ── Confirm delivery ──────────────────────────────────────────────────────
  'Not available': 'دستیاب نہیں',
  'This delivery does not belong to your account.': 'یہ ڈیلیوری آپ کے اکاؤنٹ کی نہیں ہے۔',
  'Code sent to {number}.': 'کوڈ {number} پر بھیج دیا گیا۔',
  'your number': 'آپ کے نمبر',
  'Delivery confirmed. Thank you.': 'ڈیلیوری کی تصدیق ہو گئی۔ شکریہ۔',
  'Client raised an issue with this delivery.':
    'گاہک نے اس ڈیلیوری پر اعتراض درج کرایا ہے۔',
  'Issue raised — MCL has been notified.': 'مسئلہ درج ہو گیا — ایم سی ایل کو اطلاع دے دی گئی ہے۔',
  'Closed at {time} from your phone.': 'آپ کے فون سے {time} پر بند ہوئی۔',
  'Cash reconciliation and the Oracle posting happen at MCL’s end. Nothing further is needed from you.':
    'نقدی کا ملان اور اوریکل میں اندراج ایم سی ایل کی طرف سے ہوتا ہے۔ آپ کو مزید کچھ نہیں کرنا۔',
  'The driver': 'ڈرائیور',
  'Awaiting your confirmation': 'آپ کی تصدیق کا منتظر',
  'Confirm your delivery': 'اپنی ڈیلیوری کی تصدیق کریں',
  '{driver} delivered at {time} on {vehicle}. Check the numbers before you confirm.':
    '{driver} نے {vehicle} پر {time} ڈیلیوری دی۔ تصدیق سے پہلے تعداد ضرور دیکھ لیں۔',
  '{driver} delivered at {time}. Check the numbers before you confirm.':
    '{driver} نے {time} ڈیلیوری دی۔ تصدیق سے پہلے تعداد ضرور دیکھ لیں۔',
  '{a} of {b}': '{b} میں سے {a}',
  'Empties taken': 'اٹھائے گئے خالی',
  '{n} cylinder(s) short of what you ordered. Confirming accepts the delivered quantity — raise an issue instead if that is wrong.':
    'آپ کے آرڈر سے {n} سلنڈر کم ہیں۔ تصدیق کرنے کا مطلب ہے کہ آپ ڈیلیور شدہ تعداد قبول کر رہے ہیں — اگر یہ درست نہیں تو اس کے بجائے مسئلہ درج کرائیں۔',
  'Confirm by one-time code': 'او ٹی پی سے تصدیق',
  'We send a 6-digit code to {number}. Entering it here is your signature — it is recorded against this ECR and cannot be edited afterwards.':
    'ہم {number} پر 6 ہندسوں کا کوڈ بھیجتے ہیں۔ یہاں وہ کوڈ درج کرنا ہی آپ کے دستخط ہیں — یہ اسی ای سی آر کے ساتھ ریکارڈ ہو جاتا ہے اور بعد میں تبدیل نہیں ہو سکتا۔',
  'Your account is normally confirmed by signature on the driver’s tab; confirming here from your own phone works the same way.':
    'عام طور پر آپ کے اکاؤنٹ کی تصدیق ڈرائیور کے ٹیبلٹ پر دستخط سے ہوتی ہے؛ اپنے فون سے یہاں تصدیق کرنا بھی بالکل ویسا ہی ہے۔',
  'Send me the code': 'مجھے کوڈ بھیجیں',
  'Demo only · SMS not sent': 'صرف ڈیمو · ایس ایم ایس نہیں بھیجا گیا',
  'Code for this delivery:': 'اس ڈیلیوری کا کوڈ:',
  'One-time code': 'او ٹی پی کوڈ',
  'Send a new code': 'نیا کوڈ بھیجیں',
  'Something not right?': 'کچھ ٹھیک نہیں؟',
  'Raising an issue holds this delivery open. The cash for it cannot be reconciled and nothing is posted to MCL’s accounts until it is settled.':
    'مسئلہ درج کرنے سے یہ ڈیلیوری کھلی رہے گی۔ اس کی نقدی کا ملان نہیں ہو سکے گا اور معاملہ طے ہونے تک ایم سی ایل کے اکاؤنٹس میں کچھ درج نہیں ہوگا۔',
  'Raise an issue': 'مسئلہ درج کریں',
  'Tell MCL what is wrong with this delivery. This moves the order to “{status}”, blocks cash reconciliation and stops any Oracle posting until it is resolved.':
    'ایم سی ایل کو بتائیں کہ اس ڈیلیوری میں کیا خرابی ہے۔ اس سے آرڈر «{status}» ہو جائے گا، نقدی کا ملان رک جائے گا اور معاملہ حل ہونے تک اوریکل میں کوئی اندراج نہیں ہوگا۔',
  'Two cylinders were short, and one valve was leaking…':
    'دو سلنڈر کم تھے، اور ایک والو لیک کر رہا تھا…',
  'What is wrong': 'کیا خرابی ہے',
  'Raise issue': 'مسئلہ درج کریں',
  'Delivered by {who} · order #{n}': 'ڈیلیوری: {who} · آرڈر #{n}',

  // ── Account ───────────────────────────────────────────────────────────────
  'Product {id}': 'پروڈکٹ {id}',
  'No account': 'کوئی اکاؤنٹ نہیں',
  'This user is not linked to a customer account.':
    'یہ صارف کسی گاہک اکاؤنٹ سے منسلک نہیں ہے۔',
  '{d} delivered · {r} empties returned': '{d} ڈیلیور شدہ · {r} خالی واپس',
  '{n} more on the way to you': '{n} مزید آپ کی طرف آ رہے ہیں',
  'Empties returned against cylinders delivered':
    'ڈیلیور شدہ سلنڈروں کے مقابلے میں واپس کیے گئے خالی سلنڈر',
  '{n}% of delivered cylinders returned': 'ڈیلیور شدہ سلنڈروں میں سے {n}% واپس ہوئے',
  'No cylinders are on your account yet. Every delivery and every empty the driver collects is posted here against your deposit — so the balance is always the same number MCL holds.':
    'آپ کے اکاؤنٹ پر ابھی کوئی سلنڈر نہیں۔ ہر ڈیلیوری اور ڈرائیور کا اٹھایا ہوا ہر خالی سلنڈر یہاں آپ کی سیکیورٹی کے مقابل درج ہوتا ہے — اس لیے یہ بیلنس ہمیشہ وہی رہتا ہے جو ایم سی ایل کے پاس ہے۔',
  held: 'موجود',
  '{d} delivered · {r} returned': '{d} ڈیلیور · {r} واپس',
  'Deposit value held': 'روکی گئی سیکیورٹی کی مالیت',
  Invoiced: 'انوائس شدہ',
  'Pay the driver': 'ڈرائیور کو ادائیگی',
  'The driver collects cash on delivery. The amount is reconciled at the gate the same day and only a matched reconciliation is posted to MCL’s accounts.':
    'ڈرائیور ڈیلیوری پر نقد وصول کرتا ہے۔ رقم اسی دن گیٹ پر ملائی جاتی ہے، اور ایم سی ایل کے اکاؤنٹس میں صرف وہی ملان درج ہوتا ہے جو پورا مل جائے۔',
  'Delivery profile': 'ڈیلیوری پروفائل',
  'Default route': 'مقررہ روٹ',
  'Not set': 'مقرر نہیں',
  'Served from': 'سپلائی کہاں سے',
  'Delivery address': 'ڈیلیوری کا پتہ',
  Contact: 'رابطہ',
  'Delivery confirmation': 'ڈیلیوری کی تصدیق',
  'One-time code to your phone': 'آپ کے فون پر او ٹی پی',
  'Signature on the driver’s tab': 'ڈرائیور کے ٹیبلٹ پر دستخط',
  'Signed in as {user}. You only ever see orders belonging to {client} — that rule is enforced by MCL’s server, not by this app.':
    '{user} کے طور پر سائن اِن ہیں۔ آپ کو صرف {client} کے آرڈرز نظر آتے ہیں — یہ پابندی ایم سی ایل کے سرور پر نافذ ہے، اس ایپ میں نہیں۔',
};
