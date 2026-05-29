# LendFolio Performance Testing Plan

## Purpose

Establish a repeatable performance testing and profiling setup that identifies
what is slowing the LendFolio app, especially the manager dashboard and
manager list/detail pages. This is a measurement-first approach: instrument,
benchmark, identify bottlenecks, then propose targeted fixes.

## Architecture Overview

### Application Stack
- **Framework:** Next.js 16 App Router (React 19)
- **Backend:** Supabase Postgres with RLS, Supabase Auth, Supabase Storage
- **Styling:** Tailwind CSS 4, shadcn/ui, Recharts
- **Deployment target:** Vercel

### Suspected Performance Areas

| Area | Risk | Reason |
|------|------|--------|
| `/manager` dashboard | High | 13 parallel Supabase queries loading up to 1000-2000 rows each, in-memory aggregation |
| `/manager/applications` | High | Main query + mapping helpers that issue additional Supabase calls per batch |
| `/manager/loans` | High | Same pattern as applications: load + map with N+1 profile/schedule lookups |
| `/manager/repayments` | High | Proof list + schedule + profile lookups per proof batch |
| `/manager/audit-logs` | Medium | Log list + profile lookup per batch |
| Manager detail pages | Medium | Single record + related lookups |
| Dashboard chart components | Low-Medium | Recharts client rendering, `use client` hydration |
| Auth/access checks | Low | `requireManager()` via `getCurrentUserProfile()` issues 2 Supabase queries |

## Measured Metrics

### Browser-Side (Playwright)
- **Navigation duration** — full page load time via `PerformanceObserver`
- **TTFB** (Time to First Byte) — server response time
- **FCP** (First Contentful Paint) — first visible content
- **LCP** (Largest Contentful Paint) — largest visible content element
- **Long task count** — tasks exceeding 50ms blocking the main thread
- **Total Blocking Time (TBT)** — sum of long-task durations over 50ms
- **Network request count** — total HTTP requests per navigation
- **Transferred bytes** — total network payload
- **DOM node count** — total DOM elements rendered

### Server-Side (Instrumentation)
- **Data loader duration** — wall-clock time per loader function
- **Supabase query count** — number of PostgREST calls per page request
- **Supabase query duration** — per-query wall-clock time
- **Slowest queries** — top queries by duration

## Routes Under Test

| Route | Auth Required | Priority |
|-------|--------------|----------|
| `/` | No | Baseline |
| `/login` | No | Baseline |
| `/borrower` | Borrower | Medium |
| `/manager` | Manager | Critical |
| `/manager/applications` | Manager | Critical |
| `/manager/loans` | Manager | Critical |
| `/manager/repayments` | Manager | High |
| `/manager/audit-logs` | Manager | High |
| `/manager/applications/[id]` | Manager | Medium |
| `/manager/loans/[id]` | Manager | Medium |

## Test Accounts

All seeded accounts use password `LendFolio123!`.

| Role | Email | Purpose |
|------|-------|---------|
| Borrower | `borrower@lendfolio.local` | Borrower pages |
| Manager | `manager@lendfolio.local` | All manager pages |
| Lender | `lender@lendfolio.local` | Lender pages |

Credentials are read from environment variables (`PERF_BORROWER_EMAIL`, etc.)
with fallback to the seeded defaults. No real credentials are committed.

## Dataset Sizes

| Size | Borrowers | Lenders | Applications | Offers | Proofs | Schedules |
|------|-----------|---------|-------------|--------|--------|-----------|
| Small (existing seed) | 2 | 3 | 0-2 | 0-2 | 0-2 | 0-4 |
| Medium | 100 | 25 | 500 | 1,000 | 1,000 | 1,000 |
| Large | 1,000 | 100 | 5,000 | 10,000 | 10,000 | 10,000 |

Synthetic data generators are in `scripts/perf/`.

## Test Procedure

### Setup
1. Start local Supabase: `supabase start`
2. Apply seed data: `supabase db reset` (small) or `npx tsx scripts/perf/seed-medium.ts` / `seed-large.ts`
3. Build the app: `npm run build`
4. Start the production server: `PORT=3099 npm run start`
5. Install Playwright browsers: `npx playwright install chromium`

### Execution
1. Run `npm run perf:test`
2. Each route is navigated 5 times (1 warm-up + 4 measured)
3. Median, p95, min, max are computed per metric
4. Results written to `.perf/metrics.json`
5. Report generated at `.perf/report.md`

### Thresholds (Configurable)

Thresholds are defined in `perf.config.ts`. Default values:

| Metric | Warning | Critical |
|--------|---------|----------|
| `/manager` TTFB | 500ms | 2000ms |
| `/manager` full navigation | 3000ms | 8000ms |
| Manager list page navigation | 2000ms | 5000ms |
| Supabase query count per page | 20 | 50 |
| Long task count | 5 | 15 |

All thresholds operate in **warning mode** initially — they log warnings but
do not fail the test suite. Once thresholds are calibrated with real data,
they can be switched to hard failures.

## Instrumentation Approach

### Server-Side

A `lib/perf.ts` module provides:
- `recordServerTiming(key, durationMs)` — stores a timing entry in a
  request-scoped global store
- `flushServerTimings()` — returns and clears accumulated timings

Each manager page component wraps its data loader calls with
`performance.now()` measurements and records them. Timings are exposed via
a `/api/perf/timings` endpoint that Playwright queries after each navigation.

### Browser-Side

Playwright tests use:
- `page.evaluate()` to read `PerformanceObserver` entries (LCP, long tasks)
- `performance.getEntriesByType('navigation')` for TTFB and navigation timing
- `page.on('response')` to count network requests and bytes
- CDP `Performance.getMetrics()` for JS heap and DOM stats

## Output Artifacts

All artifacts are written to `.perf/` (gitignored):

| File | Content |
|------|---------|
| `metrics.json` | Raw per-route, per-run metric arrays |
| `report.md` | Human-readable summary with tables and recommendations |
| `traces/*.zip` | Playwright traces (only on threshold exceed or failure) |
| `screenshots/*.png` | Failure screenshots |

## Code Inspection Findings

### `lib/manager-dashboard.ts`
- **13 parallel queries** in `loadManagerDashboardOverview()` — 4 count queries
  + 7 full-table loads capped at 1000-2000 rows
- All aggregation (monthly headcount, status distribution, lender/borrower
  performance) happens in JavaScript after loading full datasets
- **Recommendation:** Replace with SQL aggregate views or RPC functions that
  compute KPIs, monthly headcounts, and status distributions server-side

### `lib/manager-operations.ts`
- **N+1 pattern in mapping functions:**
  - `mapManagerApplications()` calls `loadProfilesByIds()` +
    `loadOffersByApplicationIds()` after loading applications
  - `mapManagerLoans()` calls `loadProfilesByIds()` +
    `loadSchedulesByLoanIds()` after loading loans
  - `loadManagerRepayments()` calls `loadSchedulesByIds()` +
    `loadProfilesByIds()` sequentially after loading proofs
- Each mapping step issues 2-3 additional Supabase queries
- For a page loading 100 applications, this means the main query + 2 more
  queries = 3 round trips minimum
- **Recommendation:** Batch all related data in a single query using joins,
  or use Supabase RPC functions that return denormalized results

### Manager UI Components
- `ManagerActivityChart` — `"use client"` component using Recharts with
  static chart data (39 data points). Hydration cost is low for current data.
- `DashboardCharts` — `"use client"` with BarChart and PieChart. Data is
  passed as props from server component.
- `AutoFilterForm` — `"use client"` with debounce logic. Lightweight.
- No unnecessary client components found in the manager pages — all list
  pages are server components that compose server-rendered tables.
- **No immediate UI concerns** at current dataset sizes.

### `force-dynamic` Analysis
- All manager pages use `force-dynamic` implicitly via `getManagerAccess()`
  which calls `requireManager()` which calls `createSupabaseServerClient()`
  which reads cookies.
- This is correct for authenticated pages — caching is not safe for
  role-gated content.
- However, the activity chart data is static and could be cached separately.

## Reproduction Commands

```bash
# Small dataset (existing seed)
supabase start && supabase db reset
npm run build && PORT=3099 npm run start &
npm run perf:test

# Medium dataset
supabase start && supabase db reset
npx tsx scripts/perf/seed-medium.ts
npm run build && PORT=3099 npm run start &
PERF_DATASET=medium npm run perf:test

# Large dataset
supabase start && supabase db reset
npx tsx scripts/perf/seed-large.ts
npm run build && PORT=3099 npm run start &
PERF_DATASET=large npm run perf:test
```
