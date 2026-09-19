# Data profile — Peshawar Sale & Purchase Report (Jul 2025 – Jun 2026)

Source: `Peshawar Sale & Purchase Report June 25 to July 26.xlsx` (2.4 MB, xlsx).
Producer: Multan Chemicals Limited ERP (Oracle-backed), Peshawar branch.
Read-only profiling via SheetJS; no writes to the workbook.

## Workbook inventory

| Sheet | Used range | Data rows | Header row | Merged cells |
|---|---|---|---|---|
| `supply and sale` | A2:AF9340 | 9,328 (after banner/section rows) | row 6 (1-based) | 2 |
| `PURCHASE AND RECEIPT DETAIL` | A2:AF6921 | 6,898 | row 6 (1-based) | 3 |

Both sheets carry a 5-row report banner (company name, print date/time, `Branch: Peshawar`,
`From: 2025-07-01`, `To: 2026-06-29`) before the header. Section-break rows appear inside the
data (a single cell containing `SALE`, `Return`, `Delivery`, `Internal Location Transfer`,
`Inter Branch Transfer`, `Purchase`) — 5 in sale, 22 in purchase. These must be filtered
(`Branch === 'Peshawar'`) or they become phantom transactions.

### `supply and sale` — outbound movements
Columns: Date of Transfer, Scheduled Date, Branch, Nature of Dispatch, Sale Doc, Deliver Doc,
Ecr. #, D.O #, Vehicle #, Source Location, Destination Location, Customer Code, Party Name,
Cylinder Name, Size, Mcl, Cp, Product Category, Product Group, Product Name, Cal. Unit, Rate,
Uom, QTY, Excluding Value, GST Tax, GST Tax%, F.Tax Value, F.Tax%, Including Tax Value,
Advance Tax, Inc.Adv Tax.

This is the delivery ledger the app replaces. One row = one product line on a document.
Nature of Dispatch: Sale 6,026 · Filling 2,000 · Inter Transfer (Out) 685 · Delivery 225 ·
Internal Transfers 217 · Return 116 · Sale Return 57 · Decanting 2.

### `PURCHASE AND RECEIPT DETAIL` — inbound movements
Same shape plus P.O. #, GRN. #, G. P. #, Party Code, Party Name(Vendor name).
Type of Receipt: Delivery In 5,539 · Inter Branch Transfer 1,139 · Decanting 116 ·
Return 100 · Purchase 4. 128 distinct vendors. This sheet is overwhelmingly **empty-cylinder
returns coming back in**, not procurement — it is the mirror image of the sale sheet.

## Date range and volume

Period 01-Jul-2025 → 29-Jun-2026 (12 full months). No gaps, no future dates, no nulls in
Date of Transfer. Format is a consistent `DD-Mon-YYYY` **string**, not an Excel date serial.

| Month | Sale docs | Distinct ECRs | Lines | Est. cylinders | Value (PKR) |
|---|---|---|---|---|---|
| 2025-07 | 527 | 346 | 723 | 1,896 | 19,622,704 |
| 2025-08 | 555 | 401 | 782 | 2,013 | 21,017,419 |
| 2025-09 | 612 | 446 | 792 | 2,005 | 19,159,085 |
| **2025-10** | **650** | 511 | 884 | 1,884 | 25,542,812 |
| 2025-11 | 538 | 402 | 723 | 1,459 | 20,940,764 |
| 2025-12 | 648 | 495 | 894 | 3,079 | 24,462,417 |
| 2026-01 | 641 | 492 | 892 | 2,358 | 24,637,589 |
| 2026-02 | 515 | 400 | 712 | 1,666 | 19,345,042 |
| 2026-03 | 518 | 410 | 673 | 1,974 | 21,587,562 |
| 2026-04 | 560 | 452 | 758 | 1,977 | 21,057,631 |
| 2026-05 | 546 | 430 | 726 | 1,703 | 24,000,756 |
| 2026-06 | 578 | 463 | 769 | 1,949 | 22,002,355 |
| **Total** | **6,888** | — | 9,328 | 23,963 | **263,376,135** |

Purchase side runs at the same rate (6,898 rows; peak 716 in 2026-01), confirming a
roughly 1:1 out/in cylinder cycle.

## PEAK TRANSACTIONS — is a 4-digit ECR sequence enough?

- **Peak month at Peshawar: 650 documents (Oct 2025).**
- **Annualised: 6,888 documents/year at this one location, across all books.**
- Highest observed numeric ECR in the sheet: **8,498** (2026) and **16,595** (24-Dec-2025).
  The 16,595 is a single row against Jameel Gases and is almost certainly a keying error —
  only 1 row of 7,182 numeric ECRs exceeds 9,999, and 84 rows sit in 5,000–9,999.

**Answer: 4 digits (9,999 per year / location / book) is sufficient, but the margin is
thinner than it looks.** At 6,888 docs/year Peshawar uses ~69% of a single 4-digit book if
all books shared one counter; real ECRs already reach 8,498 in a year, i.e. **85% consumed**.
Peshawar is not MCL's largest branch. Recommendation: keep 4 digits **only if the sequence is
genuinely partitioned per book type** (5 books → ~1,400/book/year, comfortable). If the app
ever collapses to one book per location, go to 5 digits. Add a rollover alarm at 9,000.

## Product / item list

70+ distinct `Product Name` values, but the tail is store consumables (stationery, filters,
gloves, teflon tape) posted through the same ledger. Real gas business is 10 items:

| Item code | Product | Cylinder sizes seen | Lines | Qty | Value PKR | Median rate |
|---|---|---|---|---|---|---|
| [10102] | OXYGEN | 0.85 / 1.70 / 3.40 / 6.80 / 9.90 M3 | 3,020 | 1,193,353 M3 | 194,510,330 | 1,400 /M3 |
| [10504a] | NITROGEN (gas + LN2 liquid) | 6.80 / 9.90 M3, 47 L jar, XL-60 | 2,948 | 563,259 | 36,824,609 | 90 /M3, 105 /L |
| [10203] | ARGON | 1.70 / 6.80 M3 | 228 | 14,377 M3 | 10,913,040 | 5,500 /M3 |
| [37C/37A/37] | CALCIUM CARBIDE | bags | 107 | 615 | 10,277,500 | 33,500–35,000 |
| [11001b] | HELIUM 99.999 | M3 | 8 | 181 | 2,969,000 | high, volatile |
| [10701] | LPG | 11.80 / 45.4 KG | 200 | 10,159 kg | 2,466,516 | ~243 /kg |
| [10601a] | DISSOLVED ACETYLENE 98 | D/A cylinder | 78 | 608 kg | 1,650,350 | 2,300 /kg |
| [11105a] | CO2 | 5 KG / 20 KG | 187 | 7,092 kg | 1,378,814 | ~194 /kg |
| [10401] | AIR | 6.80 / 10 M3 | 62 | 534 M3 | 259,820 | 2,500 /M3 |
| [1712a] | NITROUS OXIDE | 0.85 M3 / 30 KG | 16 | — | 217,860 | 5,500 |

Distinct physical cylinders (`Cylinder Name`): 40+, top: `[4504] LN2 JAR-47 LTR` (2,817 lines),
`[170105] CYLINDER-OXYGEN 99.6 (6.80M3)` (1,718), `[170118] CYLINDER-LOX CRYOGENIC XL-60` (641),
`[170110] CYLINDER-OXYGEN 99.6 (1.70M3)` (532), `[170204] CYLINDER-ARGON 99.99 (6.80M3)` (333).

## Party list

**145 distinct customers** with real Oracle `Customer Code` (6-digit, 119xxx–144xxx).
Mix of hospitals (CMH, Qazi Hussain Ahmad Medical Complex, Prime, Irfan General, Health Net,
Al Khidmat), gas distributors (Jameel Gases, Fine Gases, New Khyber Oxygen), livestock/AI
breeding centres (LN2 buyers), and named individuals (Dr. Saqib, Fazal-e-Rehman, Shahzad LN2).
Top account: CMH Peshawar, PKR 47.1M/yr over 213 documents. Top 10 accounts = ~75% of value.

## Order size

Per document: median **1 line**, p90 2 lines, max 34. Median **1 cylinder**, p90 7, max 92.
Median value **PKR 6,930**, p90 57,982, max 2,124,000.
**The typical order is one cylinder.** Bulk hospital drops are the exception, not the rule.

## Quality defects

| # | Defect | Rows | Severity | Impact |
|---|---|---|---|---|
| 1 | Section-break rows embedded in data (single-cell `SALE`, `Return`, …) | 27 | High | Phantom transactions if not filtered |
| 2 | `Ecr. #` is free text, not a number. 54 distinct non-numeric values: `FILLING` (1,802), `GAIN`, `LOSS`, `STOCK ADJUSTMENT 31-08-2025`, `1671 AND 1672`, `315-316` | 2,146 | High | ECR cannot be treated as an integer key today; app must enforce format |
| 3 | Same concept spelled many ways: `FILLING` / `filling` / `FILING` / `FILLIGN` / `JAR FILLING` / `XL-FILLING`; `STOCK ADJUSTM,ENT 31/8` vs `STOCK ADJUSTMENT 31-08-2025` | ~1,900 | Medium | Free-text discipline is absent; app must use enum reason codes |
| 4 | `Party Name` null on internal/stock-adjustment rows | 2,277 | Medium | Cannot attribute movement to a customer |
| 5 | `Product Name` null on 2,215 rows (pure cylinder movements, category `Cylinders`) | 2,215 | Medium | Value sums to **−939,158** on these rows — negative revenue |
| 6 | Sentinel price `Rate = 1` used as "free/no charge" (oxygen min rate 1, argon min 1, LPG min 1) | ~30 | Medium | Any average-price calculation is corrupted |
| 7 | `QTY = 0` or null | 2,422 | Medium | Zero-quantity lines inflate line counts |
| 8 | Rate outliers 100x median (oxygen max 36,050 vs median 1,400; helium 20,000–275,000) — per-cylinder rates mixed with per-M3 rates in one column | ~100 | High | UoM and rate basis are not consistent; never average `Rate` |
| 9 | Mixed UoM for the same item: nitrogen billed in `M3 NIT`, `LITER NIT`, `KG NIT`; oxygen in `M3. OX` and `KG OX` | — | High | Cylinder counts must be derived per-UoM, not summed |
| 10 | `Size` column is numeric-as-text with 23 distinct values including `16200`, `13500` (litres, not cylinder size) | 1,841 null | Medium | Size cannot be the sole cylinder-type key |
| 11 | One ECR = 16,595, 2x the next highest | 1 | Low | Almost certainly a typo; do not size the sequence on it |
| 12 | `Vehicle #` largely null on sale sheet | most | Low | Vehicle assignment is not currently captured at line level |

No trailing-whitespace or case duplicates were found in party names (144 raw strings →
144 normalised). Customer codes are clean 6-digit integers — a usable join key.

## PII register

| Column | Sheet | Type | Note |
|---|---|---|---|
| `Party Name` | sale | Business + personal names | Some parties are individuals (doctors, named traders). Treated as B2B trading names; no ID numbers, addresses or phones present in the file. |
| `Party Name(Vendor name)` | purchase | Business + personal names | Same. |
| `Customer Code` / `Party Code` | both | Oracle account ID | Pseudonymous business identifier, not personal. |

No national ID, phone, email, address or payment instrument appears anywhere in the workbook.
No raw personal values were copied into `src/core/realData.ts` beyond the trading names the
task explicitly requested.

## What this changes about the app

1. **The median order is one cylinder.** Optimise the driver UI for 1–2 line orders; multi-line
   is the rare case.
2. **Nitrogen is a liquid-jar business, not a cylinder business** (LN2 jar 47 L is the single
   most frequent item). The app needs a litre-based product with its own return cycle.
3. **`Rate` is not price-per-cylinder.** Pricing must be modelled per UoM with an explicit
   cylinder-size multiplier, or invoices will be wrong by 1–2 orders of magnitude.
4. **Filling/adjustment traffic (2,000 rows, 22%) shares the ECR field with sales.** If the app
   issues ECRs only on customer dispatch, the sequence burn rate is ~30% lower than raw row
   counts suggest — which is what makes 4 digits comfortable.
5. **Empties come back on a separate document series** (purchase sheet, `Delivery In`, 5,539
   rows). The app must reconcile out-document to in-document, not assume same-trip returns.

## Cost note

Profiling cost: 2 full reads of a 2.4 MB local xlsx in Node (SheetJS), ~4 s wall clock each,
~180 MB peak RSS. No database touched. Fully repeatable; scripts in the session scratchpad.
