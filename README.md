# LendFolio

LendFolio is a mobile-first responsive web application that connects Filipino micro-entrepreneurs with verified lenders through a structured, auditable loan workflow. A platform manager oversees borrower verification, lender approval, and day-to-day operations.

## Problem Statement

Many Filipino micro-entrepreneurs — such as sari-sari store owners, food stall operators, market vendors, and online sellers — lack access to formal lending channels. Existing options often involve lengthy paperwork, opaque approval criteria, and limited visibility into loan status. At the same time, small-scale lenders need a structured way to review borrower profiles, assess risk, and manage repayment collection without dedicated infrastructure.

LendFolio addresses this gap by providing a self-serve digital platform where borrowers present their business profiles, lenders review and offer financing, and both parties track loan lifecycle events through a shared, auditable workflow.

## Target Users

| Role | Description |
| --- | --- |
| **Borrower** | Filipino micro-entrepreneurs who maintain a business profile, complete identity verification, and apply for loans. |
| **Lender** | Verified lending entities that review open loan applications, send structured offers, and verify repayment proofs. |
| **Manager** | Platform administrators who verify borrowers, approve lenders, monitor loan activity, and oversee audit trails. |

## Key Features

### Borrower
- Self-serve account creation with role selection
- Business profile management (business type, location, revenue, expenses, debt)
- Identity verification with document upload (valid ID, business proof)
- Credit readiness evaluation and credit limit tracking
- Loan application submission with preferred term selection (1, 3, 6, or 12 installments)
- Offer comparison, decline, and acceptance
- Active loan tracking with repayment schedule
- Repayment proof upload for due installments
- In-app notification system

### Lender
- Self-serve registration with onboarding profile
- Manager-gated approval with required verification documents
- Open application review with borrower financial context and credit profile grade
- Offer creation with principal, interest, fees, repayment channel, and due date
- Active loan and repayment schedule visibility
- Repayment proof verification and rejection

### Manager
- Operations dashboard with KPIs, charts, and pending action counts
- Borrower verification queue with document review and approval/rejection
- Lender review queue with document review, profile inspection, and approval/rejection
- Application, loan, and repayment monitoring with filters and detail views
- Audit log viewer for all major workflow events
- User directory with search and role filtering

### Cross-Cutting
- Row Level Security (RLS) on all tables enforcing role-based data access
- Consent management for Terms of Service, Privacy Notice, and workflow-specific disclosures
- Audit logging for accountability and traceability
- In-app notifications triggered by workflow state transitions
- Structured failure codes for blocked workflow actions

## Technology Stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 16 App Router |
| Language | TypeScript 5.9 |
| Styling | Tailwind CSS 4 |
| Component Library | shadcn/ui (30 primitives) with Radix UI, class-variance-authority, tailwind-merge, lucide-react |
| Authentication | Supabase Auth (email/password) |
| Database | Supabase Postgres with Row Level Security |
| File Storage | Supabase Storage (private buckets) |
| Form Handling | React Hook Form 7 + Zod 4 |
| Unit / Integration Testing | Vitest 4 |
| End-to-End Testing | Playwright (configured, not yet active) |
| CI | GitHub Actions |
| Hosting Target | Vercel |
| Charts | Recharts 3.8 |

## System Workflow

```
Borrower signup ──> Business profile ──> Verification upload
                                              │
                                         Manager review
                                              │
                                         Approved ──> Loan application
                                              │
                            Lender reviews ──> Offer sent
                                              │
                         Borrower accepts ──> Active loan + repayment schedule
                                              │
                     Borrower uploads proof ──> Lender verifies
                                              │
                                         Balance reduced
```

1. **Borrower onboarding**: A borrower creates an account, fills in a business profile, and uploads identity verification documents (valid ID and business proof).
2. **Verification**: A manager reviews the documents and approves or rejects the borrower's verification. Only approved borrowers can submit loan applications.
3. **Loan application**: The borrower submits a loan application specifying the requested amount, purpose, and preferred repayment term. The system evaluates credit readiness and enforces a credit limit based on the borrower's financial profile.
4. **Offer**: An approved lender reviews open applications, views the borrower's financial context and credit profile grade, and sends an offer with approved amount, interest, fees, repayment channel, and due date.
5. **Acceptance**: The borrower reviews pending offers, accepts one, and the system atomically declines all other pending offers for that application. An active loan and repayment schedule are created.
6. **Repayment**: The borrower uploads a repayment proof file (image or PDF) for each due installment. The lender reviews the proof and verifies or rejects it. Verification reduces the outstanding balance.

## Project Structure

```text
├── app/                             # Next.js App Router pages and server actions
│   ├── page.tsx                     # Landing page
│   ├── layout.tsx                   # Root layout
│   ├── globals.css                  # Global styles and Tailwind theme
│   ├── signup/                      # Self-serve borrower and lender registration
│   ├── login/                       # Email/password sign-in
│   ├── forgot-password/             # Password reset request
│   ├── reset-password/              # Password reset confirmation
│   ├── terms/                       # Terms of Service page
│   ├── privacy/                     # Privacy Notice page
│   ├── consents/                    # Consent recording server actions
│   ├── notifications/               # Notification server actions and page
│   ├── borrower/                    # Borrower workspace (profile, applications, offers, loans)
│   ├── lender/                      # Lender workspace
│   │   ├── onboarding/              # Lender profile onboarding form
│   │   ├── register/                # Lender registration
│   │   └── applications/            # Application list and detail with offer form
│   │       └── [id]/
│   └── manager/                     # Manager operations dashboard
│       ├── applications/            # Application monitoring
│       ├── audit-logs/              # Audit event log
│       ├── borrower-verifications/  # Borrower verification queue
│       ├── lenders/                 # Lender review queue
│       ├── loans/                   # Active loan monitoring
│       ├── lookup/                  # Borrower record search
│       ├── repayments/              # Repayment proof monitoring
│       ├── notifications/           # Manager notifications
│       └── users/                   # User detail
│
├── components/                      # Shared UI components
│   ├── ui/                          # 30 shadcn/ui primitives (button, card, dialog, table, etc.)
│   ├── layout/                      # Dashboard shell, sidebar, navigation, user menu
│   ├── borrower/                    # Borrower-specific components
│   ├── lender/                      # Lender-specific components
│   ├── manager/                     # Manager dashboard, filters, tables, charts
│   ├── notifications/               # Notification display components
│   └── legal/                       # Terms of Service and Privacy Notice display
│
├── lib/                             # Business logic, Supabase clients, and validation
│   ├── supabase/
│   │   ├── client.ts                # Browser Supabase client
│   │   ├── server.ts                # Server-side Supabase client
│   │   ├── env.ts                   # Environment variable validation
│   │   └── types.ts                 # Checked-in database types (auto-generated)
│   ├── access-control.ts            # Role-based access helpers (requireBorrower, requireManager, etc.)
│   ├── borrower-portfolio.ts        # Business profile schema and mapping
│   ├── borrower-readiness.ts        # Credit readiness evaluation logic
│   ├── borrower-credit-profile-grade.ts  # Explainable credit profile grade
│   ├── borrower-verification.ts     # Verification document helpers
│   ├── credit-limit.ts              # Credit limit calculation and enforcement
│   ├── loan-application.ts          # Loan application schema and mapping
│   ├── loan-offer.ts                # Loan offer schema and mapping
│   ├── active-loans.ts              # Active loan loading for borrower/lender/manager
│   ├── lender-applications.ts       # Lender application review helpers
│   ├── lender-verification.ts       # Lender verification document helpers
│   ├── manager-operations.ts        # Manager data loading (applications, loans, audit, etc.)
│   ├── manager-dashboard.ts         # Dashboard KPI and chart data loading
│   ├── notifications.ts             # Notification mapping and utilities
│   ├── consents.ts                  # Consent version management
│   ├── workflow-rules.ts            # Workflow state transition helpers
│   └── utils.ts                     # cn() utility for Tailwind class merging
│
├── docs/                            # Design and setup documentation
├── tests/                           # Vitest test suite (unit + database integration)
├── e2e/                             # Playwright E2E tests (performance benchmarks)
├── supabase/
│   ├── migrations/                  # 54 SQL migrations
│   ├── seed.sql                     # Local demo data
│   └── config.toml                  # Supabase local configuration
├── hooks/                           # React hooks
├── scripts/                         # Build and performance scripts
└── .github/workflows/ci.yml        # CI pipeline
```

## Local Setup

### Prerequisites

- Node.js 18 or later
- npm
- [Supabase CLI](https://supabase.com/docs/guides/cli) (for local database)

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd LendFolio
```

2. Install dependencies:

```bash
npm install
```

3. Create a local environment file:

```bash
cp .env.example .env.local
```

4. Update `.env.local` with your Supabase project URL and anon key. For local development, start a local Supabase instance:

```bash
supabase start
```

This will output the local Supabase URL and anon key. Copy these into `.env.local`.

5. Optional: add a server-only Gemini key if you want the borrower assistant to polish LendFolio answers and classify fallback prompts:

```env
GEMINI_API_KEY=your-google-ai-studio-key
```

`GOOGLE_API_KEY` is also supported if that is the variable name you already use. Do not use `NEXT_PUBLIC_GEMINI_API_KEY`, because that would expose the key to the browser and the server action does not read it.

6. Apply database migrations:

```bash
supabase db reset
```

7. Start the development server:

```bash
npm run dev
```

After editing `.env.local`, restart the dev server with `npm run dev` so Next.js picks up the new environment variable.

8. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Environment Variables

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (local or hosted) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous/public API key |
| `GEMINI_API_KEY` | Optional server-only Google AI Studio key for borrower assistant polishing and scoped fallback |
| `GOOGLE_API_KEY` | Optional fallback variable name for the same Gemini server key |

> **Security note**: Never commit real credentials. Never expose Supabase service role keys or Gemini keys through `NEXT_PUBLIC_*` variables. The `.env.example` file contains placeholder values only.

### Borrower Assistant Gemini Check

With `GEMINI_API_KEY` or `GOOGLE_API_KEY` configured, local development logs include safe `[BorrowerAssistant/Gemini]` messages when Gemini is attempted, missing, fails, or returns an unusable response. The borrower UI still receives only the final assistant text.

Manual prompts to verify:

- `Best offer` should use the deterministic offer answer, then Gemini polish if configured.
- `How do I complete my profile?` should use the workflow answer, then Gemini polish if configured.
- `What is the weather?` should return the exact LendFolio-only fallback.

## Database Setup

LendFolio uses Supabase Postgres with 54 migration files covering all tables, enums, functions, triggers, and RLS policies.

### Commands

```bash
# Start local Supabase (requires Docker)
supabase start

# Reset database and apply all migrations + seed data
supabase db reset

# Apply pending migrations only
supabase migration up
```

### Key Database Objects

| Object Type | Examples |
| --- | --- |
| Tables | `profiles`, `lender_profiles`, `borrower_portfolios`, `loan_applications`, `loan_offers`, `active_loans`, `loan_repayment_schedules`, `repayment_proofs`, `borrower_verifications`, `lender_verification_documents`, `notifications`, `user_consents`, `audit_logs` |
| Enums | `app_role`, `application_status`, `offer_status`, `active_loan_status`, `repayment_status`, `borrower_verification_status`, `lender_verification_status` |
| RPCs | `submit_loan_application`, `accept_loan_offer`, `create_loan_offer`, `submit_repayment_proof`, `review_repayment_proof`, `review_borrower_verification`, `review_lender_verification`, `accept_user_consents`, `refresh_overdue_repayment_statuses` |
| Storage Buckets | `borrower-verification-documents`, `repayment-proofs`, `lender-verification-documents` (all private) |

### Seeded Demo Accounts

After running `supabase db reset`, the following accounts are available (password: `LendFolio123!`):

| Email | Role | Display Name |
| --- | --- | --- |
| `borrower@lendfolio.local` | Borrower | Borrower One |
| `lender@lendfolio.local` | Lender | Approved Capital |
| `manager@lendfolio.local` | Manager | Platform Manager |

Additional seeded accounts are documented in [docs/demo-accounts.md](docs/demo-accounts.md).

## Running Tests

### Unit and Integration Tests

```bash
# Run all tests (unit tests only, no local Supabase required)
npm run test
```

### Database Integration Tests

Database integration tests require a running local Supabase instance:

```bash
# Start Supabase and reset the database
supabase start
supabase db reset

# Export test environment variables
export SUPABASE_TEST_URL=http://127.0.0.1:54321
export SUPABASE_TEST_ANON_KEY=<from supabase start output>
export SUPABASE_TEST_SERVICE_ROLE_KEY=<from supabase start output>

# Run tests (integration tests will activate automatically)
npm run test
```

See [docs/foundation-verification.md](docs/foundation-verification.md) for detailed setup instructions.

### Linting and Type Checking

```bash
npm run lint       # ESLint
npm run typecheck  # TypeScript type checking
npm run build      # Next.js production build
```

## Demo / QA Instructions

A full manual test flow is documented in the [Manual Test Flow](#manual-test-flow) section below. For a quick demo:

1. Run `supabase db reset` to seed demo data.
2. Start the dev server with `npm run dev`.
3. Sign in as `borrower@lendfolio.local` to explore the borrower workspace.
4. Sign in as `lender@lendfolio.local` to explore the lender workspace.
5. Sign in as `manager@lendfolio.local` to explore the manager dashboard.

All demo accounts use password `LendFolio123!`.

## Deployment

LendFolio is ready for deployment to Vercel with Supabase as the production backend.

### Quick Checklist

1. Create a Supabase project and apply all 54 migrations (`supabase db push`).
2. Configure Supabase Auth: enable Email provider, set Site URL and Redirect URLs.
3. Provision a manager account manually in the production database.
4. Create a Vercel project, import the repository, and set environment variables.
5. Deploy from `main`.

### Required Environment Variables

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous/public API key |
| `NEXT_PUBLIC_SITE_URL` | (Optional) Production URL override for auth redirects |

> **Security note**: Never commit real credentials. Never expose Supabase service role keys through `NEXT_PUBLIC_*` variables.

For the complete deployment guide, see [docs/vercel-deployment.md](docs/vercel-deployment.md).

## Current Limitations

The following features are **not implemented** in the current version:

- **Real payment processing**: Repayment proof upload is a document-based evidence workflow; no actual payment is processed.
- **E-wallet or bank integration**: No connection to GCash, Maya, bank APIs, or other payment channels.
- **Automated reconciliation**: Balance updates require manual lender verification of uploaded proof.
- **Credit-limit restoration after loan payoff**: Credit limits are not automatically restored when a loan is fully paid.
- **Dispute workflows**: No mechanism for borrowers or lenders to raise disputes.
- **Production e-KYC**: Identity verification is document-based; no automated OCR or government database lookup.
- **Formal credit bureau scoring**: An explainable internal credit profile grade is computed from business data, but it is not a formal credit score from a credit bureau.
- **Email notifications**: Resend is approved as a dependency but not yet wired; all notifications are in-app only.
- **Playwright end-to-end tests**: Playwright is configured but no E2E test scenarios are implemented.
- **Vercel production deployment**: The application has not been deployed to Vercel production.
- **Manager analytics and reports**: The dashboard shows KPIs and charts, but no exportable reports or advanced analytics exist.
- **Multi-language support**: The interface is English-only.
- **Mobile native application**: LendFolio is a responsive web application, not a native mobile app.

Application deletion is intentionally excluded from the borrower workflow. Closed or withdrawn applications are preserved for audit history.

## Future Improvements

- Integration with real payment gateways (GCash, Maya, bank transfers)
- Automated reconciliation and credit-limit restoration on loan payoff
- Production e-KYC with government ID verification APIs
- Email notification delivery via Resend
- Credit bureau integration for formal credit scoring
- Dispute resolution workflow
- Playwright end-to-end test coverage
- Vercel production deployment with CI/CD
- Manager exportable reports and analytics
- Multi-language support (Filipino, English)
- Mobile-responsive refinements and progressive web app (PWA) features

## Documentation

| Document | Purpose |
| --- | --- |
| [School Submission](docs/school-submission.md) | Project overview, objectives, scope, and demo guide for academic evaluation |
| [Technical Architecture](docs/technical-architecture.md) | System architecture, module design, and security model |
| [User Guide](docs/user-guide.md) | Step-by-step workflows for borrowers, lenders, and managers |
| [Demo Script](docs/demo-script.md) | Presentation script for live demonstrations |
| [Application and Offer State Machine](docs/application-offer-state-machine.md) | State transition diagrams for applications, offers, loans, and repayments |
| [Borrower Credit Readiness](docs/borrower-credit-readiness.md) | Credit readiness evaluation formula and grade computation |
| [RLS Plan](docs/rls-plan.md) | Row Level Security policy design and access matrix |
| [Storage Buckets Plan](docs/storage-buckets-plan.md) | Supabase Storage bucket structure and access policies |
| [Supabase Setup](docs/supabase-setup.md) | Supabase project and auth configuration guide |
| [Demo Accounts](docs/demo-accounts.md) | Seeded local test accounts and QA flow |
| [Foundation Verification](docs/foundation-verification.md) | Local database integration test setup |
| [Sprint 1 Validation](docs/sprint-1-validation.md) | Manual QA checklist |
| [Vercel Deployment](docs/vercel-deployment.md) | Complete Vercel + Supabase deployment guide with checklists |

## CI Pipeline

The GitHub Actions workflow (`.github/workflows/ci.yml`) runs on every push and pull request:

1. Checkout and install dependencies (`npm ci`)
2. Start local Supabase and reset the database
3. Export Supabase test environment variables
4. Lint (`npm run lint`)
5. Typecheck (`npm run typecheck`)
6. Test (`npm run test`)
7. Build (`npm run build`)

## License

This project is a school/academic submission.
