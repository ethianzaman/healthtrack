# HealthTrack

A SaaS app for tracking **blood pressure** (morning / evening) and **blood glucose** (fasting, before and after meals, morning / evening). It turns the readings into doctor-ready **PDF**, **Word** and **CSV** reports.

## Features

| Area | What it does |
| --- | --- |
| Blood pressure log | Systolic, diastolic, pulse, arm and note. Morning, afternoon, evening or night is picked from the time automatically. Each reading is classified live using ACC/AHA 2017. |
| Glucose log | Value in mg/dL or mmol/L (always stored as mg/dL), meal timing (fasting, before meal, after meal, bedtime, random). Each reading is checked against the profile's targets. |
| Dashboard | Averages, BP on-target %, glucose time in range, estimated A1C, morning vs evening BP, glucose before vs after meals, trend charts. |
| Smart insights | Flags hypertensive crisis readings, a morning/evening BP gap, high after-meal glucose, low episodes and time in range. |
| Reports | PDF (one-page summary for the doctor plus a readings appendix), DOCX (editable) and CSV (one tidy row per reading, opens in Excel). Any date range up to one year. |
| Family profiles | One account can track parents or other family members, each with their own targets and unit. |
| Doctor sharing | A secure, read-only link that expires and can be revoked. The doctor needs no account. Only a SHA-256 hash of the token is stored, and the page is `noindex`. |
| Medications | List of active medicines, included in reports. |
| SaaS plans | Free and Pro limits live in [src/config/plans.ts](src/config/plans.ts). Billing only needs to change `user.plan`. |

**Why PDF is the default:** doctors read it, it prints the same everywhere and it can't be edited. CSV is for data and spreadsheets. DOCX is for people who want to add their own notes.

## Tech stack

Next.js 16 (App Router, Server Actions), TypeScript (strict), Prisma 7 with libSQL/SQLite (Postgres or Turso in production), Tailwind CSS 4, Zod 4 (the same schema validates on the client and the server), react-hook-form, Recharts, @react-pdf/renderer, docx, jose (JWT sessions), bcrypt and Vitest.

## Getting started

```bash
cp .env.example .env          # then set AUTH_SECRET (32+ chars)
npm install
npm run db:migrate            # creates dev.db and the tables
npm run db:seed               # optional: demo@healthtrack.app / Demo1234 (60 days of data, Pro plan)
npm run dev                   # http://localhost:3000
```

Quality gate: `npm run check` (typecheck, lint and unit tests). Production build: `npm run build && npm start`.

## Architecture

Dependencies only point downward:

```
app/  (routes, thin)  ->  features/  (UI + server actions + Zod schemas)
                      ->  server/services  (business rules, plan limits)
                      ->  server/repositories  (Prisma, always scoped to the tenant)
                      ->  domain/  (pure medical logic, no framework, unit-tested)
```

```
prisma/
  schema.prisma            data model (User -> Profile -> readings / medications / share links)
  seed.ts                  demo data
src/
  app/
    (auth)/login, register
    (app)/                 protected shell: dashboard, blood-pressure, glucose,
                           medications, reports, sharing, settings
    share/[token]/         public read-only page for doctors
    api/reports            authenticated report download
    api/share/[token]/report   doctor PDF download
    api/health             liveness probe
  domain/                  classification (BP, glucose), units, stats, summaries, insights
  features/<feature>/
    schemas.ts             Zod schema shared by the form and the action
    actions.ts             "use server" actions, one line each via protectedAction()
    components/            feature UI
  server/
    actions/safe-action.ts validation, auth, error mapping and revalidation for every action
    auth/                  JWT session cookie, password hashing, request context
    repositories/          data access (every query filtered by profileId/userId)
    services/              auth, profiles, sharing, health-data aggregation
    reports/               view-model + generator strategy (pdf / docx / csv)
    security/              rate limiting, token hashing
  components/ui/           design-system primitives (Button, Field, Card, DataTable, ...)
  hooks/use-action-form.ts one hook that runs every form
  config/                  env (validated), plans, site
```

### Reuse (DRY) in practice
- **One schema per entity.** The Zod schema in `features/*/schemas.ts` drives the client-side form validation and the server-side check.
- **One action wrapper.** `protectedAction(schema, handler)` handles auth, validation, field errors, safe error messages and cache revalidation.
- **One form hook.** `useActionForm` runs every form: submit, server field errors, status message and refresh.
- **One aggregation.** `loadHealthData()` feeds the dashboard, the reports and the doctor page.
- **One report model.** `buildReportModel()` defines labels and rows once. The PDF, DOCX and CSV generators only render them, so adding a format means implementing `ReportGenerator`.
- **Generic UI.** `DataTable`, `TrendChart`, `ActionButton`, `Field` and `HealthOverview` (used by both the dashboard and the share page).

### Security
- HttpOnly, SameSite JWT session cookie and bcrypt (12 rounds).
- Login rate limit, and the same error message for an unknown email or a wrong password.
- Every query is scoped to the tenant. Cookies such as the active profile are always re-verified against the owner.
- Share tokens are 256-bit random values stored hashed. They expire and can be revoked.
- Security headers (HSTS, X-Frame-Options DENY, nosniff, and more), `poweredByHeader` off.
- Env vars validated with Zod. Internal errors are logged and never sent to the user.

## Production

- **Database:** set `DATABASE_URL=libsql://...` and `DATABASE_AUTH_TOKEN` to use Turso with no code change. For PostgreSQL, set `provider = "postgresql"` in the schema and swap the adapter in [src/server/db/client-factory.ts](src/server/db/client-factory.ts) (`@prisma/adapter-pg`).
- **Deploy:** the `Dockerfile` builds a standalone image (non-root, with a healthcheck). Run `npm run db:deploy` (prisma migrate deploy) as a release step.
- **CI:** [.github/workflows/ci.yml](.github/workflows/ci.yml) runs typecheck, lint, tests, migrations and the build.
- **Scaling:** the in-memory rate limiter is per instance. Use Redis/Upstash with more than one replica.

## Roadmap (to stay ahead of competitors)

1. **Reminders**: push, email or SMS at the user's morning and evening times (web push plus a cron job).
2. **Bangla UI (i18n)** and Bangla PDFs (embed a Bangla font in react-pdf).
3. **Billing**: Stripe, SSLCommerz or bKash checkout that sets `user.plan`.
4. **PWA and offline entry**, so readings can be logged without a connection and sync later.
5. **Device import**: Bluetooth BP monitors and glucometers, Apple Health or Google Fit, CSV import.
6. **Edit readings** and an audit log.
7. **Doctor portal**: a clinic account that sees many consenting patients and their alerts.
8. **Caregiver alerts**: notify a family member when a crisis or low reading is logged.
9. **Meal, weight, HbA1c lab and activity logs** to correlate with readings.
10. **AI summary**: a plain-language monthly summary for the patient, plus a short clinical summary for the doctor.
11. **2FA, account deletion and data export** (privacy compliance).
12. **Observability**: Sentry, structured logs to a log store, uptime monitoring on `/api/health`.

> HealthTrack is a self-monitoring tool and does not provide medical advice.
