# LendFolio — Technical Architecture

## 1. High-Level Architecture

LendFolio follows a full-stack architecture using Next.js App Router with Supabase as the backend-as-a-service layer.

```
┌─────────────────────────────────────────────────────┐
│                    Client Browser                    │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐  │
│  │   Borrower   │  │    Lender    │  │   Manager  │  │
│  │  Workspace   │  │   Workspace  │  │ Dashboard  │  │
│  └──────┬───────┘  └──────┬───────┘  └─────┬──────┘  │
│         └─────────────────┼────────────────┘         │
│                    React Components                   │
│                  (Client + Server)                    │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────┼──────────────────────────────┐
│              Next.js App Router (Server)             │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │ Server       │  │ Server       │  │ Middleware  │ │
│  │ Components   │  │ Actions      │  │ (none)     │ │
│  └──────┬───────┘  └──────┬───────┘  └────────────┘ │
│         └─────────────────┼───────────────────────── │
│                    lib/ (Business Logic)              │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────┼──────────────────────────────┐
│                  Supabase Backend                    │
│  ┌──────────┐  ┌───────────┐  ┌──────────────────┐  │
│  │   Auth   │  │  Postgres │  │     Storage      │  │
│  │          │  │  (RLS +   │  │  (Private        │  │
│  │  Email/  │  │  RPCs +   │  │   Buckets)       │  │
│  │ Password │  │  Triggers)│  │                  │  │
│  └──────────┘  └───────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### Key Architectural Decisions

- **Server components by default**: Pages and layouts use React Server Components; client components are used only where interactivity is required (forms, dialogs, tabs).
- **Server actions for mutations**: All data mutations go through Next.js server actions that call Supabase RPCs or directly mutate tables via the server-side Supabase client.
- **No API routes for business logic**: The only API route is `/api/perf/timings` for performance instrumentation. All business logic flows through server actions.
- **Database as source of truth**: Workflow state transitions, authorization checks, and business rules are enforced by database RPCs and RLS policies, not by client-side or server-action logic alone.

## 2. Frontend Structure

### Routing (Next.js App Router)

The application uses file-based routing with the following route groups:

| Route Group | Purpose | Auth Requirement |
| --- | --- | --- |
| `/` | Landing page | Public |
| `/login`, `/signup`, `/forgot-password`, `/reset-password` | Authentication flows | Public |
| `/terms`, `/privacy` | Legal pages | Public |
| `/borrower` | Borrower workspace | Authenticated (borrower role) |
| `/lender` | Lender workspace | Authenticated (lender role) |
| `/lender/onboarding` | Lender onboarding | Authenticated (lender role) |
| `/lender/register` | Lender registration | Public |
| `/lender/applications/[id]` | Application detail + offer form | Authenticated (approved lender) |
| `/manager` | Manager dashboard | Authenticated (manager role) |
| `/manager/*` | Manager sub-pages | Authenticated (manager role) |
| `/notifications` | Notification actions | Authenticated |
| `/consents` | Consent server actions | Server only |

### Component Organization

```
components/
├── ui/                    # 30 shadcn/ui primitives (shared, not feature-specific)
├── layout/                # Dashboard shell, sidebar, nav config, user menu
├── borrower/              # Borrower profile, workspace, status badges
│   ├── profile/           # Profile hub, detail cards, status banners
│   └── ui/                # Borrower-specific UI primitives
├── lender/                # Lender access panel, offer form, repayment actions
│   └── profile/           # Lender profile components
├── manager/               # Dashboard, metric cards, tables, filters, charts
│   ├── applications/      # Application filters, summary cards, table
│   ├── loans/             # Loan filters, summary cards, table
│   └── repayments/        # Repayment filters, summary cards, table
├── notifications/         # Notification list, items, badges, empty states
└── legal/                 # Terms/Privacy content, dialog, page shell
```

### Styling

- **Tailwind CSS 4**: CSS-based configuration via `@import "tailwindcss"` and `@theme` blocks in `globals.css`.
- **shadcn/ui**: 30 primitive components in `components/ui/` using `class-variance-authority` for variants.
- **`cn()` utility**: Conditional class composition via `clsx` + `tailwind-merge`.
- **Mobile-first**: All layouts are designed for small screens first, with responsive breakpoints for tablet and desktop.
- **No `tailwind.config` file**: Tailwind CSS 4 uses CSS-based configuration exclusively.

## 3. Backend / Server Actions

Server actions are the exclusive mutation path. Each action:

1. Validates the authenticated user's session and role
2. Validates input using Zod schemas
3. Calls a Supabase RPC or performs a direct table mutation
4. Returns success/error or triggers `revalidatePath()` for cache invalidation

### Action Files

| File | Actions |
| --- | --- |
| `app/borrower/actions.ts` | `loadBorrowerPortfolio`, `saveBorrowerPortfolio`, `submitLoanApplication`, `updateLoanApplication`, `withdrawLoanApplication`, `acceptLoanOffer`, `declineLoanOffer`, `submitRepaymentProof`, `submitBorrowerVerificationDocument` |
| `app/lender/actions.ts` | `verifyRepaymentProof`, `rejectRepaymentProof`, `submitLenderVerificationDocument`, `submitLenderProfileChangeRequest`, `cancelLenderProfileChangeRequest` |
| `app/lender/applications/[id]/actions.ts` | `createLoanOffer` |
| `app/lender/onboarding/actions.ts` | `lenderOnboardingAction` |
| `app/lender/register/actions.ts` | `lenderRegisterAction` |
| `app/manager/actions.ts` | `refreshOverdueStatusesAction`, `reviewLenderAction`, `reviewBorrowerVerificationAction`, `reviewBorrowerVerificationDocumentAction`, `reviewLenderVerificationDocumentAction`, `reviewLenderProfileChangeRequestAction` |
| `app/login/actions.ts` | `loginAction`, `signOutAction` |
| `app/signup/actions.ts` | `signupAction` |
| `app/forgot-password/actions.ts` | `forgotPasswordAction` |
| `app/reset-password/actions.ts` | `exchangeResetCodeAction`, `updatePasswordAction` |
| `app/consents/actions.ts` | `acceptUserConsentsAction` |
| `app/notifications/actions.ts` | `loadNotificationsAction`, `getUnreadNotificationsCountAction`, `markNotificationReadAction`, `markAllNotificationsReadAction` |

## 4. Supabase Auth Usage

### Client Setup

- **Browser client** (`lib/supabase/client.ts`): `createSupabaseBrowserClient()` using `@supabase/ssr` with cookie-based session management.
- **Server client** (`lib/supabase/server.ts`): `createSupabaseServerClient()` using `@supabase/ssr` with per-request cookie handling.

### Authentication Flows

| Flow | Implementation |
| --- | --- |
| Signup | `supabase.auth.signUp()` with email/password + user metadata (role, display name) |
| Login | `supabase.auth.signInWithPassword()` with email/password |
| Logout | `supabase.auth.signOut()` |
| Password reset | `supabase.auth.resetPasswordForEmail()` + code exchange + `supabase.auth.updateUser()` |
| Session refresh | Automatic via `@supabase/ssr` cookie management |

### Account Provisioning

A database trigger (`provision_new_auth_user`) fires on `auth.users` insert to:

- Create a `profiles` record with the appropriate role
- For lenders: create a `lender_profiles` record
- Record provisioning events for observability
- Manager repair available via `repair_user_provisioning` RPC

## 5. Supabase Postgres Usage

### Schema Design

- **15 tables** across the `public` and `app_private` schemas
- **`public` schema**: All user-facing tables with RLS enabled
- **`app_private` schema**: Internal functions (e.g., `accept_loan_offer`) that bypass RLS for atomic operations

### Key RPCs (Remote Procedure Calls)

| RPC | Purpose |
| --- | --- |
| `submit_loan_application` | Validates readiness gates and inserts application with credit snapshot |
| `update_loan_application` | Updates application while in submitted/open status |
| `withdraw_loan_application` | Withdraws application and declines pending offers |
| `accept_loan_offer` | Atomically accepts one offer, declines others, creates active loan and repayment schedule |
| `decline_loan_offer` | Declines a single pending offer |
| `create_loan_offer` | Creates offer with lender validation and duplicate prevention |
| `submit_repayment_proof` | Records repayment proof with file path and amount |
| `review_repayment_proof` | Verifies or rejects proof, updates balance if verified |
| `submit_borrower_verification_document` | Uploads verification document with consent check |
| `review_borrower_verification` | Approves, rejects, or returns verification for resubmission |
| `review_borrower_verification_document` | Accepts or rejects individual verification documents |
| `submit_lender_onboarding` | Submits lender onboarding profile with consents |
| `review_lender_verification` | Approves, rejects, or returns lender verification |
| `submit_lender_verification_document` | Uploads lender verification document |
| `review_lender_verification_document` | Accepts or rejects individual lender documents |
| `submit_lender_profile_change_request` | Submits lender profile modification request |
| `review_lender_profile_change_request` | Approves or rejects lender profile changes |
| `accept_user_consents` | Records consent with version, IP, and user agent |
| `refresh_overdue_repayment_statuses` | Detects overdue repayments and updates loan statuses |

### Triggers

| Trigger | Purpose |
| --- | --- |
| `provision_new_auth_user` | Creates profile and lender_profile on auth user creation |
| `snapshot_credit_on_application_insert` | Captures credit data at application submission |
| `enforce_loan_application_credit_limit` | Blocks applications exceeding credit limit |

### Credit Limit Formula

```
credit_limit = min(
  (monthly_net_cash_flow × 0.30) × 3,
  repayment_history_cap,
  100,000
)
```

Repayment history caps start at PHP 10,000 for new borrowers and increase after clean completed loans. Late repayments reduce the effective history tier; defaulted repayment history blocks available credit.

## 6. Storage Bucket Usage

All buckets are private (no public access). Files are accessed via signed URLs generated on-demand for authorized users.

### `borrower-verification-documents`

- **Path pattern**: `borrowers/{borrower_id}/verification/{verification_id}/{safe_file_name}`
- **Allowed types**: JPG, PNG, WebP, PDF
- **Max size**: 5 MB
- **Access**: Borrower (own uploads), Manager (all)

### `repayment-proofs`

- **Path pattern**: `borrowers/{borrower_id}/loans/{active_loan_id}/repayments/{repayment_schedule_id}/{safe_file_name}`
- **Allowed types**: JPG, PNG, WebP, HEIC, HEIF, PDF
- **Max size**: 5 MB
- **Access**: Borrower (own uploads), Lender (related loans), Manager (all)

### `lender-verification-documents`

- **Path pattern**: `lenders/{lender_user_id}/verification/{lender_profile_id}/{safe_file_name}`
- **Allowed types**: JPG, PNG, WebP, PDF
- **Max size**: 5 MB
- **Access**: Lender (own uploads), Manager (all)

## 7. RLS / Security Model Summary

### Role Source

Roles are stored in `public.profiles.role` (enum: borrower, lender, manager), not in Supabase user metadata. This ensures consistent, queryable role checks.

### Access Control Matrix

| Table | Borrower | Approved Lender | Manager |
| --- | --- | --- | --- |
| `profiles` | Own row | Own row | All rows |
| `lender_profiles` | No access | Own row | All rows |
| `borrower_portfolios` | Own rows | Read (via open/accepted applications) | All rows |
| `loan_applications` | Own rows | Read (open/submitted + closed with context) | All rows |
| `loan_offers` | Read (own applications) | Read (own), Insert (pending) | All rows |
| `active_loans` | Own rows | Own rows | All rows |
| `loan_repayment_schedules` | Own rows | Own rows | All rows |
| `repayment_proofs` | Own rows | Read (own loans) | All rows |
| `borrower_verifications` | Own row | No access | All rows |
| `borrower_verification_documents` | Own rows | No access | All rows |
| `lender_verification_documents` | No access | Own rows | All rows |
| `notifications` | Own rows | Own rows | All rows |
| `user_consents` | Own rows | Own rows | All rows |
| `audit_logs` | No access | No access | All rows |

### Security Principles

1. **RLS enabled before data**: All tables have RLS enabled from creation.
2. **UPDATE needs matching SELECT**: Update policies require the same conditions as select policies.
3. **No broad authenticated policies**: No table grants blanket access to all authenticated users.
4. **Business transitions server-side**: Workflow state changes are protected by RPCs, not client-side logic.
5. **Advisory locking**: Offer acceptance uses `pg_advisory_xact_lock` to prevent race conditions.

## 8. Notification System Summary

### Trigger Events

Notifications are created by database triggers attached to workflow RPCs:

| Event | Recipient |
| --- | --- |
| Loan application submitted | Manager |
| Loan application withdrawn | Manager |
| Loan offer created | Borrower |
| Loan offer accepted | Lender, Manager |
| Loan offer declined | Lender |
| Repayment proof submitted | Lender |
| Repayment proof verified | Borrower |
| Repayment proof rejected | Borrower |
| Loan fully paid | Borrower, Lender |
| Loan restored to active (overdue resolved) | Borrower, Lender |
| Borrower verification submitted | Manager |
| Borrower verification approved | Borrower |
| Borrower verification rejected | Borrower |
| Borrower verification needs resubmission | Borrower |
| Borrower verification document reviewed | Borrower |
| Lender onboarding submitted | Manager |
| Lender verification approved | Lender |
| Lender verification rejected | Lender |

### Notification Data Model

```sql
notifications (
  id uuid,
  user_id uuid,       -- recipient
  type text,           -- event type identifier
  title text,          -- short heading
  message text,        -- description
  href text,           -- deep link to relevant workspace tab
  read_at timestamptz, -- null if unread
  created_at timestamptz
)
```

### Client-Side Handling

- `loadNotificationsAction()` fetches the user's notifications
- `getUnreadNotificationsCountAction()` returns the unread count (displayed in header badge)
- `markNotificationReadAction(id)` marks a single notification as read
- `markAllNotificationsReadAction()` marks all as read
- Notification hrefs are normalized to prevent open-redirect vulnerabilities

## 9. Key Workflow Lifecycles

### 9.1 Loan Application Lifecycle

```
submitted ──> open (after initial review)
submitted/open ──> accepted (when offer is accepted)
submitted/open ──> declined (when all offers are declined)
submitted/open ──> withdrawn (by borrower)
```

### 9.2 Loan Offer Lifecycle

```
pending ──> accepted (by borrower, via atomic RPC)
pending ──> declined (by borrower or by system when another offer is accepted)
pending ──> expired (by system, if applicable)
```

### 9.3 Active Loan Lifecycle

```
active ──> overdue (when repayment due date passes without verification)
active ──> paid (when all installments are verified)
overdue ──> active (when overdue repayment is verified)
overdue ──> defaulted (system-defined threshold)
```

### 9.4 Repayment Proof Lifecycle

```
submitted ──> verified (by lender, triggers balance reduction)
submitted ──> rejected (by lender, borrower can re-upload)
```

### 9.5 Borrower Verification Lifecycle

```
not_started ──> pending_documents ──> submitted ──> under_review
under_review ──> approved
under_review ──> rejected
under_review ──> needs_resubmission ──> submitted (re-upload cycle)
```

## 10. Key Files and Directories

### Configuration

| File | Purpose |
| --- | --- |
| `package.json` | Dependencies and scripts |
| `tsconfig.json` | TypeScript configuration |
| `components.json` | shadcn/ui configuration |
| `postcss.config.mjs` | PostCSS configuration for Tailwind CSS 4 |
| `vitest.config.ts` | Vitest test configuration |
| `playwright.config.ts` | Playwright E2E configuration |
| `.env.example` | Environment variable template |
| `supabase/config.toml` | Supabase local configuration |

### Core Application Files

| File | Purpose |
| --- | --- |
| `app/layout.tsx` | Root layout with Supabase session provider |
| `app/page.tsx` | Landing page |
| `app/globals.css` | Tailwind CSS theme and global styles |
| `lib/supabase/client.ts` | Browser Supabase client factory |
| `lib/supabase/server.ts` | Server Supabase client factory |
| `lib/supabase/types.ts` | Auto-generated database types (1,247 lines) |
| `lib/access-control.ts` | Role-based access helpers |
| `lib/workflow-rules.ts` | Workflow state transition helpers |

### Business Logic

| File | Purpose |
| --- | --- |
| `lib/borrower-portfolio.ts` | Business profile schema and validation |
| `lib/borrower-readiness.ts` | Credit readiness evaluation |
| `lib/borrower-credit-profile-grade.ts` | Credit profile grade computation |
| `lib/credit-limit.ts` | Credit limit calculation |
| `lib/loan-application.ts` | Loan application schema |
| `lib/loan-offer.ts` | Loan offer schema and computation |
| `lib/active-loans.ts` | Active loan data loading |
| `lib/borrower-verification.ts` | Verification document helpers |
| `lib/lender-verification.ts` | Lender verification helpers |
| `lib/manager-operations.ts` | Manager data loading (2,423 lines) |
| `lib/manager-dashboard.ts` | Dashboard KPI and chart data |
| `lib/notifications.ts` | Notification mapping and utilities |
| `lib/consents.ts` | Consent version management |

### Database

| Path | Purpose |
| --- | --- |
| `supabase/migrations/` | 54 SQL migration files |
| `supabase/seed.sql` | Local demo data |
| `docs/application-offer-state-machine.md` | State transition documentation |
| `docs/rls-plan.md` | RLS policy design |
| `docs/storage-buckets-plan.md` | Storage bucket design |
