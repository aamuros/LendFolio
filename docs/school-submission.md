# LendFolio — School Submission Document

## 1. Project Overview

LendFolio is a mobile-first web application designed to connect Filipino micro-entrepreneurs with verified lenders through a structured, auditable loan workflow. The platform enables borrowers to present their business profiles, apply for financing, and manage repayment evidence, while lenders review applications, send offers, and verify repayment proofs. A platform manager role oversees the entire ecosystem through an operations dashboard.

The system is built as a full-stack Next.js application with Supabase providing authentication, database, row-level security, and file storage. All sensitive workflow transitions are enforced server-side through database functions (RPCs) and RLS policies, ensuring that client-side UI checks are advisory only.

## 2. Objectives

1. **Digitize the lending workflow**: Replace paper-based or informal lending processes with a structured, web-based platform accessible from mobile and desktop browsers.
2. **Enable borrower self-service**: Allow borrowers to independently create business profiles, upload verification documents, and submit loan applications without visiting a physical branch.
3. **Provide lender decision support**: Give lenders access to borrower financial context, credit profile grades, and application details to make informed lending decisions.
4. **Ensure auditability**: Record all major workflow events (application submissions, offer decisions, verification reviews, repayment proofs) in an append-only audit log.
5. **Enforce data security**: Use Supabase Row Level Security to ensure borrowers, lenders, and managers can only access data appropriate to their role.
6. **Maintain consent compliance**: Capture and record user consent for Terms of Service, Privacy Notice, and workflow-specific disclosures at each stage of the lending process.

## 3. Scope and Limitations

### In Scope

- Borrower registration, profile management, and identity verification
- Lender registration, onboarding, and manager-gated approval
- Loan application submission with credit readiness evaluation
- Offer creation, comparison, and atomic acceptance
- Active loan and repayment schedule management
- Repayment proof upload and lender verification
- Manager operations dashboard with monitoring and review tools
- Audit logging and in-app notifications

### Out of Scope (Current Version)

- Real payment processing (no money is transferred through the platform)
- E-wallet or bank API integration (GCash, Maya, bank transfers)
- Automated reconciliation of payments
- Credit-limit restoration after loan payoff
- Dispute resolution workflows
- Production e-KYC or automated identity verification
- Formal credit bureau scoring
- Email notification delivery (Resend dependency exists but is not wired)
- Playwright end-to-end test scenarios
- Production deployment to Vercel
- Mobile native application

## 4. User Roles

### Borrower

Borrowers are Filipino micro-entrepreneurs who use the platform to apply for financing. Their workflow involves:

- Creating and maintaining a detailed business profile (business type, location, revenue, expenses, operational history)
- Uploading identity verification documents (valid ID and business proof)
- Accepting required legal consents (Terms of Service, Privacy Notice, Document Processing Consent, Credit Review Authorization)
- Submitting loan applications with a requested amount, purpose, and preferred repayment term
- Reviewing, comparing, and accepting or declining offers from lenders
- Tracking active loans and uploading repayment proof for each installment

### Lender

Lenders are verified lending entities that review borrower applications and provide financing offers. Their workflow involves:

- Registering and completing a detailed onboarding profile (organization, contact details, operating area, loan range, repayment terms)
- Uploading required verification documents (business registration, authorized representative ID, authorization letter, lending license, proof of address)
- Waiting for manager approval before accessing application review features
- Reviewing open loan applications with borrower financial context and credit profile grades
- Creating offers with approved amount, interest, fees, repayment channel, and due date
- Monitoring active loans and verifying or rejecting repayment proofs

### Manager

Managers are platform administrators who oversee the lending ecosystem. Their workflow involves:

- Reviewing and approving/rejecting borrower verifications and lender applications
- Monitoring all platform activity through an operations dashboard
- Viewing KPIs (active loans, total lenders, total borrowers, applications), pending action counts, monthly activity charts, and status distributions
- Inspecting individual applications, loans, repayments, audit events, and user records
- Filtering and searching across all platform data
- Triggering overdue repayment status refreshes

## 5. Core Workflows

### 5.1 Borrower Verification Workflow

```
Borrower signs up ──> Fills business profile ──> Accepts Document Processing Consent
    ──> Uploads valid ID and business proof ──> Manager reviews documents
    ──> Manager approves verification ──> Borrower becomes application-ready
```

### 5.2 Loan Application Workflow

```
Borrower accepts Credit Review Authorization ──> Submits loan application
    ──> System evaluates credit readiness and enforces credit limit
    ──> Application enters "open" status ──> Lenders can view the application
```

### 5.3 Offer Workflow

```
Lender reviews application ──> Creates offer (amount, interest, fees, terms)
    ──> Borrower receives notification ──> Borrower reviews offers
    ──> Borrower accepts one offer ──> System atomically declines competing offers
    ──> Active loan and repayment schedule created
```

### 5.4 Repayment Workflow

```
Borrower uploads proof for due installment ──> Lender receives notification
    ──> Lender reviews proof ──> Lender verifies or rejects
    ──> If verified: installment marked verified, outstanding balance reduced
    ──> If rejected: borrower is notified and can re-upload
```

### 5.5 Lender Approval Workflow

```
Lender registers ──> Completes onboarding profile ──> Uploads 5 required documents
    ──> Manager reviews profile and documents ──> Manager approves or rejects
    ──> If approved: lender gains access to application review and offer creation
```

## 6. Major Modules

### 6.1 Authentication and Access Control

- Supabase Auth with email/password authentication
- Role-based access control via `profiles` table (`app_role`: borrower, lender, manager)
- Lender approval gating via `lender_profiles.verification_status`
- Server-side role checks through `requireBorrower()`, `requireApprovedLender()`, `requireManager()` helpers
- Row Level Security policies on all database tables

### 6.2 Borrower Profile and Credit Evaluation

- Business profile storage with 20+ fields covering identity, operations, finances, and risk factors
- Credit readiness evaluation returning structured statuses (incomplete, complete, needs_review, not_eligible, eligible_to_apply)
- Credit limit calculation: `min((monthly_net_cash_flow × 0.30) × 3, repayment_history_cap, 100,000)`
- Explainable credit profile grade (A/B/C/review_needed/not_eligible/incomplete) for lender and manager review
- Profile snapshots captured at loan application submission time for immutability

### 6.3 Loan Application and Offer Management

- Loan application submission with server-side validation via `submit_loan_application` RPC
- Multi-gate enforcement: profile completeness, verification status, consent status, credit limit
- Offer creation with lender range validation and duplicate offer prevention
- Atomic offer acceptance with advisory locking (one accepted offer per application)
- Active loan and repayment schedule creation on acceptance

### 6.4 Repayment and Proof Management

- Repayment schedule generation based on preferred term (1, 3, 6, or 12 installments)
- Proof upload to private Supabase Storage (JPG, PNG, WebP, HEIC, HEIF, PDF, max 5 MB)
- Lender verification/rejection with audit trail
- Outstanding balance reduction on proof verification
- Overdue repayment detection and status refresh

### 6.5 Verification Management

- Borrower verification with document upload and manager review
- Lender verification with 5 required document types and manager approval
- Consent management across 5 consent types and 4 scopes
- Sensitive borrower profile change detection with automatic verification needs-resubmission

### 6.6 Notification System

- Database-triggered notifications for all major workflow events
- In-app notification display with unread count, mark-as-read, and type-specific badges
- Notification routing with deep links to relevant workspace tabs

### 6.7 Manager Operations Dashboard

- KPI cards, monthly activity charts, status distribution, and pending action counts
- Filterable tables for applications, loans, repayments, audit logs, and user records
- Detail views for individual records with full context and action panels
- Borrower readiness and lender performance panels

## 7. Database Summary

### Tables (15)

| Table | Purpose |
| --- | --- |
| `profiles` | User accounts with role and status |
| `lender_profiles` | Lender organization details and verification status |
| `borrower_portfolios` | Borrower business profiles with financial data |
| `loan_applications` | Loan requests with credit snapshots |
| `loan_offers` | Lender offers with repayment channel details |
| `active_loans` | Accepted loans with outstanding balance |
| `loan_repayment_schedules` | Installment schedules for active loans |
| `repayment_proofs` | Uploaded proof files with review status |
| `borrower_verifications` | Borrower verification lifecycle records |
| `borrower_verification_documents` | Individual verification documents |
| `lender_verification_documents` | Lender verification documents |
| `lender_profile_change_requests` | Lender profile modification requests |
| `notifications` | In-app notifications |
| `user_consents` | Consent records with versioning |
| `audit_logs` | Append-only audit trail |

### Key Enums

- `app_role`: borrower, lender, manager
- `application_status`: submitted, open, accepted, declined, withdrawn
- `offer_status`: pending, accepted, declined, expired
- `active_loan_status`: active, paid, overdue, defaulted, closed
- `repayment_status`: due, submitted, verified, rejected, late
- `borrower_verification_status`: not_started, pending_documents, submitted, under_review, approved, rejected, needs_resubmission
- `lender_verification_status`: incomplete, pending, approved, rejected

### Storage Buckets

| Bucket | Access | Purpose |
| --- | --- | --- |
| `borrower-verification-documents` | Private | Borrower ID and business proof uploads |
| `repayment-proofs` | Private | Repayment evidence files |
| `lender-verification-documents` | Private | Lender business and licensing documents |

## 8. Security Considerations

### Row Level Security (RLS)

Every table has RLS enabled. Policies enforce:

- **Borrowers** can only read and write their own portfolio, applications, offers, loans, and verification records.
- **Approved lenders** can read open/closed applications they have context for, insert offers, and manage their own offers and active loans.
- **Managers** can read all records and perform review actions through protected RPCs.
- **Pending (unapproved) lenders** are blocked from accessing application review and offer creation.

### Server-Side Enforcement

- All workflow state transitions go through database RPCs (e.g., `submit_loan_application`, `accept_loan_offer`, `review_repayment_proof`).
- UI-level checks are advisory; the database is the source of truth for authorization.
- Advisory locking prevents race conditions in offer acceptance.

### Consent Management

- Five consent types: Terms of Service, Privacy Notice, Credit Review Authorization, Document Processing Consent, Authorization for Lender Verification.
- Four consent scopes: signup baseline, borrower document upload, borrower loan application, lender review.
- Versioned consent records with IP address and user agent metadata.
- Current consent versions are enforced before any gated workflow action.

### File Upload Security

- File type validation server-side (JPG, PNG, WebP, HEIC, HEIF, PDF only).
- File size limit of 5 MB enforced server-side.
- Private storage buckets with scoped paths (user ID embedded in path).
- Signed URLs generated on-demand for authorized access only.

### Credential Security

- No hardcoded credentials in the codebase.
- `.env.example` contains placeholder values only.
- Supabase service role keys are not exposed through `NEXT_PUBLIC_*` variables.
- Environment variables are validated at startup via `lib/supabase/env.ts`.

## 9. Testing Approach

### Unit Tests (Vitest)

The test suite includes 15 test files covering:

- **Smoke tests**: Product foundation, readiness evaluation, credit limits, workflow rules, money parsing, UUID validation, role rules, legal content
- **Schema validation**: Signup, lender register, lender onboarding, loan application, and loan offer schemas
- **Action tests**: Login routing, consent actions, borrower loan application actions, borrower/lender verification document actions, lender offer actions, lender onboarding actions
- **Component tests**: Legal dialog structure validation
- **Credit profile grade tests**: Grade computation for various borrower profiles

### Database Integration Tests

Integration tests run against a local Supabase instance and verify:

- RLS isolation (borrower data isolation, lender access boundaries, pending lender blocks)
- Atomic offer acceptance with competing offer decline
- Verification lifecycle transitions
- Consent enforcement in submission workflows
- Credit readiness evaluation
- Application credit snapshots
- Active loan and repayment proof workflows
- Balance updates after proof verification
- Notification creation for workflow events

### Performance Tests (Playwright)

Performance benchmark tests measure:

- Time to First Byte (TTFB), Largest Contentful Paint (LCP), and long tasks per route
- Navigation duration across borrower and manager routes
- Supabase query counts and timing per route

### CI Pipeline

GitHub Actions runs on every push and pull request:

1. Lint (ESLint)
2. Type check (TypeScript)
3. Unit and integration tests (Vitest)
4. Production build (Next.js)

## 10. Deployment / Readiness Notes

- The application targets Vercel for hosting, using Next.js App Router with server components and server actions.
- A Vercel deployment readiness checklist is documented in [vercel-deployment.md](vercel-deployment.md).
- Environment variables for production deployment: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- The application has not been deployed to Vercel production as of this submission.
- Supabase hosted project setup is documented in [supabase-setup.md](supabase-setup.md).

## 11. Known Limitations

1. **No real payment processing**: The repayment workflow is evidence-based (file upload + lender verification). No actual money transfer occurs.
2. **No e-wallet or bank integration**: The platform does not connect to GCash, Maya, or bank APIs.
3. **No automated reconciliation**: Balance updates require manual lender verification.
4. **No credit-limit restoration**: When a loan is fully paid, the borrower's credit limit is not automatically restored.
5. **No dispute workflows**: Borrowers and lenders cannot raise formal disputes through the platform.
6. **No production e-KYC**: Identity verification relies on document upload and manager review.
7. **No formal credit scoring**: The internal credit profile grade is deterministic and explainable but is not a credit bureau score.
8. **No email notifications**: The Resend dependency exists but is not wired; all notifications are in-app only.
9. **No E2E tests**: Playwright is configured but no test scenarios are implemented.
10. **No production deployment**: The application runs locally or in preview environments only.
11. **English-only interface**: No multi-language support.
12. **Manager accounts must be manually provisioned**: There is no self-serve manager signup.

## 12. Future Enhancements

- Integration with payment gateways (GCash, Maya, bank transfers) for real payment processing
- Automated reconciliation and credit-limit restoration on loan payoff
- Production e-KYC with government ID verification APIs
- Email notification delivery via Resend for workflow events
- Credit bureau integration for formal credit scoring
- Dispute resolution workflow
- Playwright end-to-end test coverage for all critical paths
- Vercel production deployment with CI/CD pipeline
- Manager exportable reports and analytics dashboards
- Multi-language support (Filipino, English)
- Progressive Web App (PWA) features for mobile access
- Automated lender approval workflows with identity verification

## 13. Suggested Demo Script

See [demo-script.md](demo-script.md) for a complete step-by-step presentation flow covering:

1. Borrower signup and profile creation
2. Document upload and manager verification
3. Loan application submission
4. Lender review and offer creation
5. Borrower offer acceptance
6. Active loan and repayment proof upload
7. Lender proof verification
8. Manager dashboard walkthrough

**Estimated demo duration**: 10–15 minutes

**Pre-demo setup**: Run `supabase db reset` to ensure clean seeded data, then `npm run dev` to start the development server.
