// Urdu — shared vocabulary. Owned by the lead.
// Domain terms live here so every app area renders them identically. If a term
// appears in more than one app, it belongs in this file, not in an area file.
import type { Dict } from './index';

export const urCommon: Dict = {
  // ── Product and company ──────────────────────────────────────────────────
  'MCL Delivery': 'ایم سی ایل ڈیلیوری',
  'Multan Chemicals Ltd': 'ملتان کیمیکلز لمیٹڈ',

  // ── Core domain nouns ────────────────────────────────────────────────────
  Order: 'آرڈر',
  Orders: 'آرڈرز',
  Delivery: 'ڈیلیوری',
  Deliveries: 'ڈیلیوریاں',
  Cylinder: 'سلنڈر',
  Cylinders: 'سلنڈر',
  'Empty cylinders': 'خالی سلنڈر',
  Empties: 'خالی سلنڈر',
  Customer: 'گاہک',
  Client: 'گاہک',
  Dealer: 'ڈیلر',
  Driver: 'ڈرائیور',
  Vehicle: 'گاڑی',
  Route: 'روٹ',
  Warehouse: 'گودام',
  Product: 'پروڈکٹ',
  Products: 'پروڈکٹس',
  Receipt: 'رسید',
  Signature: 'دستخط',
  Cash: 'نقد',
  Credit: 'ادھار',
  Invoice: 'انوائس',
  Quantity: 'مقدار',
  Price: 'قیمت',
  Total: 'کل',
  Date: 'تاریخ',
  Time: 'وقت',
  Status: 'حالت',
  Notes: 'نوٹس',
  Reason: 'وجہ',
  Address: 'پتہ',
  Phone: 'فون',
  Account: 'اکاؤنٹ',
  History: 'ریکارڈ',
  Home: 'ہوم',
  Language: 'زبان',
  English: 'English',
  Urdu: 'اردو',

  // ── Order statuses (must match stateMachine STATUS_LABEL) ────────────────
  Placed: 'درج شدہ',
  Filled: 'بھرا گیا',
  Assigned: 'تفویض شدہ',
  Dispatched: 'روانہ',
  Delivered: 'پہنچا دیا',
  Confirmed: 'تصدیق شدہ',
  Disputed: 'اختلاف',
  Reconciled: 'ملان مکمل',
  'Cash held': 'نقد روکا گیا',
  'Post failed': 'پوسٹنگ ناکام',
  'Posted to Oracle': 'اوریکل میں درج',
  Posted: 'درج شدہ',
  Cancelled: 'منسوخ',

  // ── Roles ────────────────────────────────────────────────────────────────
  Sales: 'سیلز',
  Clerk: 'کلرک',
  Cashier: 'کیشیئر',
  Gate: 'گیٹ',
  Admin: 'ایڈمن',

  // ── Common actions ───────────────────────────────────────────────────────
  Confirm: 'تصدیق کریں',
  Cancel: 'منسوخ کریں',
  Save: 'محفوظ کریں',
  Submit: 'جمع کرائیں',
  Close: 'بند کریں',
  Back: 'واپس',
  Next: 'اگلا',
  Search: 'تلاش',
  Filter: 'فلٹر',
  Retry: 'دوبارہ کوشش',
  Print: 'پرنٹ کریں',
  Reset: 'ری سیٹ',
  Continue: 'جاری رکھیں',
  Done: 'مکمل',
  All: 'تمام',
  View: 'دیکھیں',
  Details: 'تفصیلات',

  // ── Connectivity ─────────────────────────────────────────────────────────
  Online: 'آن لائن',
  Offline: 'آف لائن',
  Pending: 'زیر التوا',
  Synced: 'سِنک ہو گیا',
  Syncing: 'سِنک ہو رہا ہے',
  'Sync now': 'ابھی سِنک کریں',

  // ── Demo shell ───────────────────────────────────────────────────────────
  'Acting as': 'بطور',
  Script: 'اسکرپٹ',
  'Oracle up': 'اوریکل چالو',
  'Oracle down': 'اوریکل بند',
  'Dealer app — places orders, tracks delivery, confirms by OTP':
    'ڈیلر ایپ — آرڈر دیں، ڈیلیوری دیکھیں، او ٹی پی سے تصدیق کریں',
  'Sales desk — places orders on a client’s behalf':
    'سیلز ڈیسک — گاہک کی طرف سے آرڈر درج کرتا ہے',
  'Warehouse — fills, assigns a vehicle, allocates the ECR at dispatch':
    'گودام — بھرائی، گاڑی کی تفویض، اور روانگی پر ای سی آر جاری کرنا',
  'Driver tab — offline-first delivery capture and receipt printing':
    'ڈرائیور ٹیب — آف لائن ڈیلیوری کا اندراج اور رسید کی پرنٹنگ',
  'Gate — issues and checks in the shared driver tablets':
    'گیٹ — مشترکہ ٹیبلٹ جاری اور واپس وصول کرتا ہے',
  'Gate cashier — counts the cash. The only path to Oracle.':
    'گیٹ کیشیئر — نقد گنتا ہے۔ اوریکل تک پہنچنے کا واحد راستہ۔',
  'Back office — audit trail, Oracle integration, dashboards':
    'بیک آفس — آڈٹ ریکارڈ، اوریکل انٹیگریشن، ڈیش بورڈ',
  'Shared company tablet — Android, Bluetooth receipt printer, works with no signal':
    'کمپنی کا مشترکہ ٹیبلٹ — اینڈرائیڈ، بلوٹوتھ رسید پرنٹر، سگنل کے بغیر بھی کام کرتا ہے',
  'Dealer’s own phone — online only, sees nothing but their own orders':
    'ڈیلر کا اپنا فون — صرف آن لائن، اسے اپنے آرڈرز کے علاوہ کچھ نظر نہیں آتا',

  // ── ECR ──────────────────────────────────────────────────────────────────
  ECR: 'ای سی آر',
  'ECR number': 'ای سی آر نمبر',
  'ECR pending': 'ای سی آر زیر التوا',
  'No ECR yet': 'ابھی ای سی آر جاری نہیں ہوا',
  'Financial year': 'مالی سال',
  Location: 'مقام',
  'Book type': 'بک کی قسم',
  Sequence: 'سلسلہ نمبر',
};
