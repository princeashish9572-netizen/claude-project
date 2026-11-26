# Implementation plan & architecture

## 1. Goals

A single-institute admin panel to track student fees, record payments, produce
reports, and send the admin a daily Telegram digest at 08:00 IST. All dates are
calendar dates in **Asia/Kolkata**.

## 2. Architecture

```
Browser ──HTTPS──▶ Next.js on Vercel (App Router, server components + server actions)
                     │  proxy.ts           refresh session cookie, block anonymous requests
                     │  requireAdmin()     verify JWT with Supabase Auth + admins table
                     │  anon key + user JWT ─▶ Supabase PostgREST ─▶ Postgres (RLS enforced)
                     │
Vercel Cron ─Bearer CRON_SECRET─▶ /api/cron/daily-reminders
                     │  service-role key ─▶ generate_all_dues(), claim_daily_reminder()
                     └──────────────▶ Telegram Bot API (sendMessage, HTML)
```

* **No Supabase client runs in the browser.** Login, reads and writes all run on
  the server, so the browser never receives any Supabase key. No variable uses
  the `NEXT_PUBLIC_` prefix.
* The **service-role key is used only by the cron route** (`src/lib/supabase/admin.ts`,
  guarded by `import "server-only"`). Admin pages use the admin's own session,
  so RLS applies.
* Business rules that must stay consistent (generating dues, allocating payments,
  voiding, de-duplicating reminders) live in **Postgres functions**, so one
  transaction does all the work, with row locks.

## 3. Data model

| Table | Purpose |
|---|---|
| `admins` | `auth.users` ids allowed into the app. RLS helper `is_admin()`. |
| `students` | Profile + billing schedule: `fee_amount`, `billing_cycle` (monthly / quarterly / half_yearly / yearly / custom N months / one_time), `schedule_start_date` (first/next due date), optional `end_date`, `status` (active/archived). |
| `fee_dues` | One row per billable period (`source = auto`) or one-off charge (`manual`). `amount`, `amount_paid`, generated `balance`. |
| `payments` | Immutable money received; `receipt_no` from a sequence (`RCP-YYYYMM-000123`); can be **voided** (with reason), never deleted. |
| `payment_allocations` | Which dues each payment paid (supports partial and multi-due payments). |
| `reminder_logs` | One row per `(reminder_date, kind)`: status, counts, message, error. Unique key prevents duplicates. |

Views (`security_invoker`, so RLS applies): `student_fee_summary` (pending,
overdue, due-today and upcoming amounts, next due date, status) and `due_details`.

### Fee schedule rules

* Due *n* falls on `schedule_start_date + n × cycle months`, always counted from
  the anchor date, so month ends don't drift (31 Jan → 28 Feb → 31 Mar).
* Dues are generated up to 45 days ahead, and one future due always exists. This
  happens on insert/update (trigger) and in the daily cron.
* **Pending balance** = unpaid dues with `due_date ≤ today`. **Overdue** = `< today`.
  **Due today** = `= today`. **Upcoming** = `> today`.
* **Payments** go to the selected due first (optional), then to the oldest unpaid
  dues. Any extra bills the next cycles early (advance payment). Paying more than
  can ever be owed (e.g. a one-time fee) is rejected.
* **Changing the fee terms** (amount / cycle / next due date) replaces *unpaid*
  auto dues from the new due date onwards. Paid or partly paid dues are kept.
  Editing only contact details never touches dues.
* **Archiving** stops billing (future unpaid dues are removed; outstanding
  balance stays). **Restoring** resumes at the next cycle on or after today,
  without charging for the archived period.

## 4. Security

| Concern | Control |
|---|---|
| Authentication | Supabase Auth email/password; public sign-up disabled; admins created with `scripts/create-admin.mjs`. |
| Authorisation | `requireAdmin()` on every page, action and API route; RLS on every table (`is_admin()`). |
| Least privilege | Column-level grants: clients cannot write `amount_paid`, `cycles_generated`, payments or allocations directly. Money moves only through `record_payment` / `void_payment`. |
| Secrets | Server-only env; `server-only` import guard; build output checked to contain no keys. |
| Cron | `Authorization: Bearer CRON_SECRET`, timing-safe compare, refuses to run if the secret is shorter than 16 characters. |
| Input | zod validation on the server, DB CHECK constraints, search text stripped of PostgREST filter syntax, same-site-only `next` redirects. |
| Output | Telegram HTML escaped; CSV/Excel formula-injection neutralised. |
| Headers | CSP `frame-ancestors 'none'`, HSTS, nosniff, referrer policy, `no-store` on authenticated responses. |

## 5. Daily reminder

1. Vercel Cron calls `/api/cron/daily-reminders` at `30 2 * * *` UTC (08:00 IST),
   and again at 09:00 IST as a retry.
2. `generate_all_dues(45)` makes sure today's dues exist.
3. `claim_daily_reminder(today)` inserts the `(date, 'daily_digest')` row. If a
   row already exists and is `sent` or `sending`, nothing happens, so a second
   cron call, a retry or a manual click cannot send a duplicate. A `failed`
   attempt can be claimed again.
4. Open dues for active students (`due_date ≤ today`) are grouped by student
   into *Due today* and *Overdue*, with subtotals and **total expected collection**.
   The message is split into chunks under Telegram's 4096-character limit.
5. The result is recorded (`sent` / `failed` with error) and shown under **Reminders**.

## 6. Build order (as implemented)

1. Schema, RLS, functions + SQL tests (`supabase/`, `scripts/test-db.sh`)
2. Supabase SSR auth, proxy, admin guard, login
3. Layout shell (sidebar / mobile drawer), dashboard
4. Students: list + search/filters, create, edit, archive, detail
5. Fee tracking: schedule, one-off dues, payments (partial/advance), void, receipts
6. Payments history, reports (daily / monthly / range) + CSV/Excel export
7. Telegram digest, cron route, reminders page
8. Tests: unit (vitest), SQL, end-to-end against a local Supabase stack

## 7. Possible extensions

* SMS/WhatsApp reminders to students (e.g. a WhatsApp Business API), using the same claim pattern per due.
* Late fees / discounts as manual dues or negative adjustments.
* Multiple branches: add `branch_id` to tables and branch-scoped admin policies.
* Audit log table populated by triggers.
