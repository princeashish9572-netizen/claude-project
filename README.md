# Institute Fee Manager

A production-ready student fee reminder and management system for a coaching
institute. It runs on **Next.js 16 (TypeScript)**, **Tailwind CSS v4** and **Supabase**
(Postgres + Auth), is deployed on **Vercel**, and sends a **daily 8:00 AM IST
Telegram digest** to the admin.

All calculations use the **Asia/Kolkata** timezone.

## Features

- **Admin login.** Supabase Auth, no public sign-up, and only accounts listed in `admins` can enter.
- **Dashboard.** Total students, fees due today, overdue, collected this month, upcoming (7 days), and recent payments.
- **Students.** Add, edit, view, archive and restore. Each student has a name, phone, course, admission date, fee amount, billing cycle and payment due date.
- **Fee tracking**
  - Monthly, quarterly, half-yearly, yearly, custom (every N months) and one-time schedules
  - Partial and advance payments, allocated to the oldest dues first (or to a due you choose)
  - Pending balance, overdue amount, full due schedule and payment history
  - Printable receipts (amount in words), and voiding a payment with a reason
  - One-off fees (exam fee, material, …)
- **Search and filters.** Search by name or phone. Filter by course, paid, pending, overdue, due today, due-date range, or archived.
- **Reports.** Daily, monthly and date-range collections, broken down by method, course and day. Export to **Excel (.xlsx)** or **CSV**. You can also export the outstanding-balances list.
- **Daily Telegram reminder.** Due today plus overdue (name, course, amount, due date, phone) and the total expected collection. It is never sent twice on the same day, and a failed attempt is retried automatically.
- **Responsive, mobile-first UI.** Sidebar on desktop, drawer on mobile, card lists on small screens.

See [`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md) for the architecture, data model, rules and security design.

## Project structure

```
supabase/
  migrations/20261126000000_init.sql   schema, RLS, grants, functions, views
  tests/schema_test.sql                SQL behaviour + security tests
  config.jsonc                         local Supabase config (sign-up disabled)
scripts/
  create-admin.mjs                     create / promote an admin account
  test-db.sh                           run SQL tests on a local PostgreSQL
src/
  proxy.ts                             session refresh + route protection
  app/
    login/                             sign-in page + actions
    (app)/                             authenticated area (sidebar layout)
      dashboard/  students/  payments/  reports/  reminders/
    api/cron/daily-reminders/route.ts  Vercel Cron endpoint
    api/reports/export/route.ts        CSV / Excel export
  components/                          UI building blocks and forms
  lib/
    supabase/{server,admin,proxy}.ts   Supabase clients (server-only)
    auth.ts  env.ts  date.ts  format.ts  validation.ts  export.ts  telegram.ts
    reminders/{digest,run}.ts          digest builder + send-once orchestration
    data/                              queries (students, reports)
vercel.json                            cron schedule (02:30 UTC = 08:00 IST, retry 03:30 UTC)
```

## Setup

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Apply the migration, using either:
   - the SQL editor: paste and run `supabase/migrations/20261126000000_init.sql`, or
   - the CLI: `npx supabase link --project-ref <ref>` then `npx supabase db push`.
3. In **Authentication → Sign In / Providers**, turn **off** "Allow new users to sign up".
   Admins are created only with the script below.

### 2. Telegram bot

1. Message **@BotFather** → `/newbot` → copy the token.
2. Send any message to your new bot, then open
   `https://api.telegram.org/bot<TOKEN>/getUpdates` and copy `message.chat.id`.
   (A group chat id works too; add the bot to the group first.)

### 3. Environment variables

Copy `.env.example` to `.env.local` for development, and add the same variables
in **Vercel → Project → Settings → Environment Variables**:

| Variable | Notes |
|---|---|
| `SUPABASE_URL` | Project URL |
| `SUPABASE_ANON_KEY` | anon / publishable key (RLS applies) |
| `SUPABASE_SERVICE_ROLE_KEY` | service-role / secret key. Used **only** by the cron route |
| `CRON_SECRET` | ≥ 16 random chars (`openssl rand -hex 32`). Vercel sends it to the cron route automatically |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | from step 2 |
| `INSTITUTE_NAME`, `INSTITUTE_ADDRESS`, `INSTITUTE_PHONE` | shown on receipts and messages |
| `APP_URL` | optional; adds a dashboard link to the Telegram message |

None of these are exposed to the browser (no `NEXT_PUBLIC_` variables).

### 4. Create the first admin

```bash
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
  node scripts/create-admin.mjs owner@institute.com "Owner Name"
# password is prompted (or pass ADMIN_PASSWORD=...)
```

Running it for an existing user grants that user admin access.

### 5. Run and deploy

```bash
npm install
npm run dev          # http://localhost:3000
```

To deploy, import the repo into Vercel and set the env vars. `vercel.json` registers the cron jobs.
Open **Reminders → Send test message** to confirm Telegram works.

> **Vercel plan note:** on the Hobby plan, Vercel runs a daily cron at some point
> within the scheduled hour, so it may arrive any time between 08:00 and 08:59 IST.
> Pro runs it on time. In both cases the database guarantees only one digest per day.

## Testing

```bash
npm run typecheck && npm run lint
npm test             # unit tests: IST dates, digest, exports, validation
npm run test:db      # SQL tests on a local PostgreSQL (uses a stub auth schema)
npm run build
```

The SQL suite covers RLS (anon and non-admin denied), protected columns,
generating dues (month-end anchoring, custom and one-time cycles, end date),
partial/FIFO/advance payments, overpayment guard, void, reschedule,
archive/restore, dashboard figures and reminder de-duplication. It has also been
run against the official `supabase/postgres` 17 image.

The app was also tested end to end with Playwright against a local Supabase
stack (Postgres + Auth + PostgREST). That run covered login and authorisation,
the dashboard figures, search and filters, creating and editing students,
payments, receipts, voiding, archive/restore, reports and exports, cron →
Telegram with dedupe, and mobile layouts.

## Operations

- **Change a fee:** edit the student, change the amount/cycle and the "next payment due date".
  Unpaid dues from that date onwards are recreated. Paid history is kept.
- **Waive a due:** use the bin icon on an unpaid due in the student's fee schedule.
- **Wrong payment:** use **Void** (with a reason) and record it again. Receipts are never deleted.
- **Resend today's digest:** Reminders → *Send again* (asks for confirmation).
