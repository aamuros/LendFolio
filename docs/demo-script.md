# LendFolio — Demo Script

This script provides a step-by-step flow for presenting LendFolio in a school or academic setting. It covers the full lending lifecycle from borrower signup through repayment verification.

**Estimated duration**: 10–15 minutes

**Pre-demo setup**:

```bash
# Reset database to ensure clean seeded data
supabase db reset

# Start development server
npm run dev
```

**Demo accounts** (password for all: `LendFolio123!`):

| Email | Role |
| --- | --- |
| `borrower@lendfolio.local` | Borrower |
| `lender@lendfolio.local` | Approved Lender |
| `manager@lendfolio.local` | Manager |

---

## Part 1: Borrower Experience (3–4 minutes)

### Step 1: Landing Page

1. Open [http://localhost:3000](http://localhost:3000).
2. Point out the landing page: project description, "How it works" steps, and role-based feature cards for borrowers, lenders, and managers.
3. Mention that the interface is mobile-first and responsive.

### Step 2: Borrower Sign-In

1. Click **Sign In** or navigate to `/login`.
2. Sign in as `borrower@lendfolio.local` with password `LendFolio123!`.
3. You are redirected to the borrower workspace.

### Step 3: Business Profile

1. Navigate to the **Profile** tab.
2. Show the pre-seeded business profile with business type (sari-sari store), location, revenue, expenses, and operational history.
3. Point out the **Credit Limit** and **Borrowing Power** section, which shows the calculated credit limit based on the financial profile.
4. Explain the readiness evaluation: the system checks profile completeness, verification status, and consent status to determine if the borrower can apply.

### Step 4: Verification Documents

1. Show the verification section on the Profile tab.
2. Point out the verification status (should be **Approved** for the seeded borrower).
3. Explain that the borrower uploaded a valid ID and business proof, which were reviewed and approved by a manager.
4. Mention the Document Processing Consent requirement before upload.

### Step 5: Loan Application

1. Navigate to the **Apply** tab.
2. Show an existing loan application (from seed data) or submit a new one:
   - Requested amount: 25,000 PHP
   - Purpose: "Working capital for inventory restocking"
   - Preferred term: 3 months
3. Explain the credit readiness gate: the system verifies profile completeness, approved verification, accepted consents, and credit limit before allowing submission.
4. Point out the **Credit Profile Grade** shown on the application (e.g., Grade A, B, or C).

---

## Part 2: Lender Experience (3–4 minutes)

### Step 6: Sign In as Lender

1. Sign out from the borrower account.
2. Sign in as `lender@lendfolio.local` with password `LendFolio123!`.
3. You are redirected to the lender workspace.

### Step 7: Review Application

1. Navigate to the **Applications** tab.
2. Show the list of open loan applications with borrower context (business type, location, financials).
3. Click the borrower's application to view the full detail:
   - Business profile summary
   - Financial indicators (revenue, expenses, cash flow)
   - Credit profile grade
   - Credit at submission snapshot
4. Explain that lenders see this information to make informed lending decisions.

### Step 8: Send Offer

1. On the application detail page, fill in the offer form:
   - Approved amount: 25,000 PHP
   - Interest/Service charge: 2,500 PHP
   - Fees: 500 PHP
   - Total repayment: 28,000 PHP (auto-calculated)
   - Due date: Select a date 3 months from now
   - Repayment channel: "GCash"
   - Repayment account name: "Approved Capital Lending"
   - Repayment account number: "09171234567"
   - Repayment instructions: "Send payment to the GCash number above and upload proof of transaction."
   - Remarks: "Please ensure timely repayment."
2. Click **Send Offer**.
3. Point out the notification that was created for the borrower.

---

## Part 3: Borrower Acceptance (2–3 minutes)

### Step 9: Sign In as Borrower

1. Sign out from the lender account.
2. Sign in as `borrower@lendfolio.local` with password `LendFolio123!`.

### Step 10: Accept Offer

1. Navigate to the **Offers** tab.
2. Show the pending offer from the lender with all details (amount, repayment, due date, repayment channel).
3. Click **Accept Offer**.
4. Explain the atomic acceptance: the system accepts this offer and automatically declines any other pending offers for the same application.
5. Show the notification sent to the lender.

### Step 11: View Active Loan

1. Navigate to the **Loans** tab.
2. Show the active loan with:
   - Principal amount: 25,000 PHP
   - Total repayment: 28,000 PHP
   - Outstanding balance: 28,000 PHP
   - Due date
   - Repayment schedule with installment details
3. Point out the repayment destination information from the lender's offer (GCash details).

---

## Part 4: Repayment Workflow (2–3 minutes)

### Step 12: Upload Repayment Proof

1. On the active loan detail, find the first due installment.
2. Click the upload action for that installment.
3. Upload a sample image or PDF file as repayment proof.
4. Point out the file type and size validation (JPG/PNG/WebP/HEIC/PDF, max 5 MB).
5. The installment status changes to **Submitted**.

### Step 13: Sign In as Lender

1. Sign out from the borrower account.
2. Sign in as `lender@lendfolio.local` with password `LendFolio123!`.

### Step 14: Verify Repayment Proof

1. Navigate to the **Offers** tab and find the active loan.
2. Show the submitted repayment proof with the uploaded file preview.
3. Click **Verify** to accept the proof.
4. Explain that verification reduces the outstanding balance.
5. Show the updated installment status (Verified) and the reduced outstanding balance.
6. Alternatively, demonstrate the **Reject** flow with a reason note.

---

## Part 5: Manager Dashboard (2–3 minutes)

### Step 15: Sign In as Manager

1. Sign out from the lender account.
2. Sign in as `manager@lendfolio.local` with password `LendFolio123!`.
3. You are redirected to the manager dashboard.

### Step 16: Dashboard Overview

1. Show the KPI cards: active loans, lenders, borrowers, applications.
2. Point out the pending action counts (verifications, lenders, proofs awaiting review).
3. Show the monthly activity chart and status distribution.
4. Briefly mention the lender performance and borrower readiness panels.

### Step 17: Borrower Verifications

1. Navigate to **Reviews > Borrower Verifications**.
2. Show the verification queue with status filters.
3. Click a verification record to show the document review interface.
4. Demonstrate accepting/rejecting individual documents and approving/rejecting verifications.

### Step 18: Lender Review

1. Navigate to **Reviews > Lenders**.
2. Show the lender queue with verification status filters.
3. Click a lender record to show the readiness summary, documents, and decision panel.

### Step 19: Audit Logs

1. Navigate to **Operations > Audit Logs**.
2. Show the append-only log with color-coded category badges.
3. Filter by action type (e.g., `loan_offer_accepted`, `repayment_proof_verified`).
4. Click a log entry to show the full JSON metadata.

### Step 20: Wrap-Up

1. Navigate back to the dashboard overview.
2. Summarize the full lifecycle demonstrated:
   - Borrower onboarding and verification
   - Loan application with credit readiness evaluation
   - Lender offer creation with borrower financial context
   - Atomic offer acceptance with active loan creation
   - Repayment proof upload and lender verification
   - Manager oversight through dashboard, queues, and audit logs
3. Mention current limitations:
   - No real payment processing (proof-based evidence workflow only)
   - No e-wallet or bank integration
   - No email notifications (in-app only)
   - No production e-KYC
   - No formal credit bureau scoring
4. Mention future improvements:
   - Payment gateway integration
   - Email notifications via Resend
   - Credit bureau integration
   - Playwright E2E test coverage

---

## Quick Reference: Key Points to Highlight

### Security
- All data access controlled by Row Level Security (RLS) policies
- Workflow transitions enforced by database RPCs, not client-side checks
- File uploads validated for type and size server-side
- Consent records tracked with IP address and user agent

### Architecture
- Next.js App Router with server components by default
- Server actions for all mutations
- Supabase for auth, database, storage, and row-level security
- shadcn/ui for consistent, accessible component library

### Credit Evaluation
- Deterministic, explainable credit profile grade (not a formal credit score)
- Credit limit based on net cash flow, years in operation, and revenue
- Credit snapshots captured at application submission for immutability

### Auditability
- Append-only audit log for all major workflow events
- Notification system for real-time workflow awareness
- Immutable evidence history for verification documents and repayment proofs
