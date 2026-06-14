# LendFolio — User Guide

This guide explains how to use LendFolio from the perspective of each user role: borrower, lender, and manager.

## 1. Borrower Workflow

### 1.1 Creating an Account

1. Navigate to the landing page and click **Sign Up**.
2. Select **Borrower** as your role.
3. Enter your display name, email address, and password.
4. Read and accept the **Terms of Service** and **Privacy Notice** by clicking the linked text and checking the consent boxes.
5. Click **Create Account**.
6. You will be redirected to the borrower workspace.

### 1.2 Setting Up Your Business Profile

1. In the borrower workspace, navigate to the **Profile** tab.
2. Fill in your business details:
   - **Business name** and **business type** (sari-sari store, food stall, online seller, market vendor, service provider, or other)
   - **Business address**, barangay, city/municipality, and province
   - **Monthly gross revenue** and **monthly expenses**
   - **Existing loan payments** (if any)
   - **Years in operation** and **date started operating**
   - **Operating model** (sole proprietor, partnership, etc.)
   - **Primary sales channel** (physical store, online, both)
   - **Loan purpose context** (minimum 40 characters explaining how you plan to use the loan)
3. Review your profile summary and confirm the information is current.
4. Click **Save Profile**.

The system evaluates your credit readiness based on the information provided. You can view your readiness status and any required actions on the Profile tab.

### 1.3 Completing Verification

Before you can submit a loan application, you must complete identity verification:

1. Navigate to the **Profile** tab and find the verification section.
2. Accept the **Document Processing Consent** when prompted.
3. Upload a **valid government-issued ID** (JPG, PNG, WebP, or PDF, max 5 MB).
4. Upload **business proof** (e.g., business permit, receipt book photo, or similar evidence; same file type/size limits).
5. Your verification status will show as **Submitted** while awaiting manager review.
6. Once a manager approves your verification, your status changes to **Approved** and you can proceed to loan application.

If your verification is rejected, the manager will provide a reason. You may need to re-upload corrected documents.

### 1.4 Submitting a Loan Application

1. Accept the **Credit Review Authorization** consent when prompted.
2. Navigate to the **Apply** tab.
3. Enter the **requested amount** (between 1,000 and 1,000,000 PHP).
4. Describe the **purpose** of the loan (10–160 characters).
5. Select a **preferred repayment term**: 1 month, 3 months, 6 months, or 12 months.
6. Optionally add remarks (up to 500 characters).
7. Click **Submit Application**.

The system validates your credit readiness, credit limit, and verification status. If all gates pass, your application enters **open** status and becomes visible to approved lenders.

**Note**: You may only have one open loan application at a time. You can edit or withdraw your application while it is in submitted or open status and no offer has been accepted.

### 1.5 Reviewing and Accepting Offers

1. Navigate to the **Offers** tab to see offers from lenders.
2. Each offer shows: approved amount, total repayment amount (principal + interest + fees), due date, repayment channel, and lender remarks.
3. You can **decline** individual offers or **accept** one offer.
4. When you accept an offer:
   - All other pending offers for that application are automatically declined.
   - An active loan is created with a repayment schedule based on your preferred term.
   - You and the lender receive notifications.

### 1.6 Managing Your Active Loan

1. Navigate to the **Loans** tab to view your active loan(s).
2. Each loan shows: principal amount, total repayment amount, outstanding balance, due date, and repayment schedule.
3. The repayment schedule lists each installment with its due amount, due date, and status (due, submitted, verified, rejected, or late).

### 1.7 Uploading Repayment Proof

1. For each due installment, click the upload action.
2. Accept any required consents if prompted.
3. Upload a repayment proof file (JPG, PNG, WebP, HEIC, HEIF, or PDF, max 5 MB).
4. The installment status changes to **Submitted**.
5. The lender will review your proof and verify or reject it.
6. If verified, the installment status changes to **Verified** and your outstanding balance is reduced.
7. If rejected, you can re-upload a corrected proof.

**Important**: LendFolio does not process real payments. Repayment proof upload is an evidence-based workflow. Actual payment should be made through the repayment channel specified by the lender in their offer (e.g., bank transfer, GCash, etc.), and the uploaded proof serves as evidence of that payment.

## 2. Lender Workflow

### 2.1 Registering

1. Navigate to `/lender/register`.
2. Enter your display name, organization name, email, and password.
3. Read and accept the **Terms of Service** and **Privacy Notice**.
4. Click **Create Account**.
5. You will be redirected to the lender onboarding form.

### 2.2 Completing Onboarding

1. Fill in the onboarding form with:
   - **Organization name** and **contact person**
   - **Phone number** and **business address**
   - **Operating area** (Philippine region)
   - **Business registration number**
   - **Minimum and maximum loan amounts**
   - **Typical repayment terms**
   - **Lender description**
2. Accept the **Authorization for Lender Verification**.
3. Click **Submit Onboarding**.

Your profile enters **pending** status. You will see a message indicating that your account is under review.

### 2.3 Uploading Verification Documents

While your profile is pending, you can upload the required verification documents:

1. Navigate to the **Account** tab.
2. Upload the following required documents (JPG, PNG, WebP, or PDF, max 5 MB each):
   - **Business registration** (SEC/DTI certificate or equivalent)
   - **Authorized representative ID** (government-issued ID)
   - **Authorization letter** (if applicable)
   - **Lending license** (if applicable, or affidavit of exemption)
   - **Proof of address** (utility bill, lease, or similar)
3. Optional documents: collection policy, sample loan terms, or other supporting files.

A manager will review your profile and documents before approving your lender status.

### 2.4 Getting Approved

Once a manager approves your lender verification:

- Your verification status changes to **Approved**.
- You gain access to the application review and offer creation features.
- You can now browse open loan applications from the **Applications** tab.

### 2.5 Reviewing Applications

1. Navigate to the **Applications** tab to see all open loan applications.
2. Each application shows: borrower business type, location, requested amount, purpose, preferred term, and financial indicators.
3. Click an application to view the full detail, including:
   - Borrower business profile summary
   - Financial indicators (revenue, expenses, cash flow, debt)
   - Credit profile grade (A, B, C, review_needed, not_eligible, or incomplete)
   - Credit at submission snapshot
   - Any existing offers you have sent

### 2.6 Creating an Offer

1. On the application detail page, fill in the offer form:
   - **Approved amount** (must not exceed the borrower's requested amount)
   - **Interest / service charge**
   - **Fees** (0–500,000 PHP)
   - **Total repayment** (auto-calculated: approved amount + interest + fees)
   - **Due date** (must be in the future)
   - **Repayment channel** (e.g., bank transfer, GCash, Maya)
   - **Repayment account name** and **account number**
   - **Repayment instructions** (additional details for the borrower)
   - **Remarks** (optional)
2. Click **Send Offer**.

The offer enters **pending** status and the borrower is notified.

### 2.7 Monitoring Active Loans

1. Navigate to the **Offers** tab to see all offers you have sent, grouped by status.
2. Accepted offers show the associated active loan with repayment schedule and outstanding balance.
3. You receive notifications when borrowers submit repayment proofs.

### 2.8 Verifying Repayment Proofs

1. When a borrower uploads repayment proof, you receive a notification.
2. Navigate to the relevant active loan to see the submitted proof.
3. Review the uploaded file (image or PDF).
4. Click **Verify** to accept the proof or **Reject** to decline it with a reason.
5. If verified, the installment status changes to **Verified** and the outstanding balance is reduced.
6. If rejected, the borrower is notified and can re-upload.

### 2.9 Requesting Profile Changes

If you need to update your lender profile details:

1. Navigate to the **Account** tab.
2. Submit a profile change request with the proposed changes.
3. A manager will review and approve or reject the request.
4. You can cancel a pending request before a manager reviews it.

## 3. Manager Workflow

Manager accounts are manually provisioned (not self-serve). After receiving credentials:

### 3.1 Dashboard Overview

1. Sign in and navigate to `/manager`.
2. The dashboard shows:
   - **KPI cards**: Active loans, total lenders, total borrowers, total applications
   - **Pending actions**: Verifications awaiting review, lenders awaiting approval, proofs awaiting review
   - **Monthly activity chart**: User signups and application volume over time
   - **Status distributions**: Application, offer, and loan status breakdowns
   - **Lender performance**: Activity by business type
   - **Borrower readiness**: Readiness score distribution

### 3.2 Reviewing Borrower Verifications

1. Navigate to **Reviews > Borrower Verifications**.
2. Filter by verification status, document status, or borrower name.
3. Click a verification record to view:
   - Required documents (valid ID, business proof) with individual review status
   - Consent status (Document Processing Consent)
   - Evidence history (all uploaded documents with timestamps)
4. **Accept** or **reject** individual documents.
5. Once all required documents are accepted, **approve** the verification.
6. Alternatively, **reject** with a reason or mark as **needs resubmission**.

### 3.3 Reviewing Lenders

1. Navigate to **Reviews > Lenders**.
2. Filter by verification status or lender name.
3. Click a lender record to view:
   - Readiness summary (profile completeness, documents, disclosures)
   - Lending details (organization, operating area, loan range, terms)
   - Required documents (5 types) with individual review status
   - Disclosure details (authorization for lender verification)
   - Evidence history
   - Profile change requests (pending, approved, rejected)
4. **Accept** or **reject** individual documents.
5. **Approve** or **reject** the lender (approval requires all 5 required documents to be accepted).

### 3.4 Monitoring Applications

1. Navigate to **Platform > Applications**.
2. Filter by status, borrower, preferred term, or date range.
3. View summary cards (total, by status).
4. Click an application for full detail: overview, borrower info, request details, offer activity, accepted offer, and active loan link.

### 3.5 Monitoring Loans

1. Navigate to **Platform > Loans**.
2. Filter by status, lender, borrower, or due date range.
3. View summary cards (total, by status).
4. Click a loan for full detail: overview, parties, amounts, repayment progress, schedule, and proofs.

### 3.6 Monitoring Repayments

1. Navigate to **Platform > Repayments**.
2. Filter by proof status, repayment status, lender, borrower, or date range.
3. Click a repayment proof for detail: file info, parties, repayment info, and review metadata.
4. Use the **Refresh Overdue** button to trigger overdue repayment status detection.

### 3.7 Viewing Audit Logs

1. Navigate to **Operations > Audit Logs**.
2. Filter by action type, target table, actor, or date range.
3. Logs are color-coded by category (Profile, Borrower, Lender, Application, Loan, Repayment, Consent, System).
4. Click a log entry for full detail including JSON metadata.

### 3.8 Looking Up Users

1. Navigate to **Operations > Users**.
2. Search by name, filter by role or status.
3. View user count cards (total, borrowers, lenders, managers).
4. Click a user for detail: account info, activity summary, and role-specific details (portfolio, applications, loans for borrowers; organization, offers, loans for lenders).

### 3.9 Notifications

1. Navigate to **Notifications** from the sidebar.
2. View all notifications with unread indicators.
3. Mark individual or all notifications as read.
4. Click a notification to navigate to the relevant workspace page.

## 4. Notification Workflow

Notifications are created automatically by the system when workflow events occur. All users receive in-app notifications for events relevant to their role.

### How Notifications Work

1. A workflow event occurs (e.g., a borrower submits a loan application).
2. A database trigger creates a notification record for the relevant user(s).
3. The notification includes a title, message, type identifier, and a deep link to the relevant page.
4. Users see an unread count badge on the notification bell icon in the header.
5. Clicking a notification navigates to the relevant workspace tab.

### Notification Types by Role

**Borrower receives notifications for:**
- Offer received
- Offer accepted (confirmation)
- Offer declined
- Repayment proof verified
- Repayment proof rejected
- Verification approved
- Verification rejected
- Verification needs resubmission
- Verification document reviewed

**Lender receives notifications for:**
- Offer accepted (by borrower)
- Offer declined (by borrower)
- Repayment proof submitted
- Loan fully paid
- Loan restored to active
- Lender verification approved
- Lender verification rejected

**Manager receives notifications for:**
- Loan application submitted
- Loan application withdrawn
- Loan offer accepted
- Borrower verification submitted
- Lender onboarding submitted

## 5. Repayment Proof Workflow

The repayment proof workflow is the primary mechanism for tracking loan repayments:

```
Borrower makes payment (outside the platform)
    ──> Borrower uploads proof (image or PDF)
    ──> Lender receives notification
    ──> Lender reviews proof file
    ──> Lender verifies (accepts) or rejects
    ──> If verified: balance reduced, borrower notified
    ──> If rejected: borrower notified, can re-upload
```

### File Requirements

- **Accepted formats**: JPG, PNG, WebP, HEIC, HEIF, PDF
- **Maximum size**: 5 MB
- **Storage**: Private Supabase Storage bucket with borrower-scoped paths
- **Access**: Signed URLs generated on-demand for authorized users only

### Important Notes

- LendFolio does not process real payments. The proof upload is an evidence workflow.
- Actual payment should be made through the repayment channel specified by the lender (e.g., bank transfer, GCash, Maya).
- The uploaded proof serves as evidence that the payment was made.
- Lenders are responsible for verifying the authenticity of the proof.
- Verified proofs are immutable; newer uploads create additional history records.

## 6. What to Expect During a Demo

If you are viewing a LendFolio demo, here is what each role's workspace looks like:

### Borrower Workspace (`/borrower`)

- **Home tab**: Summary of verification status, credit readiness, and recent activity
- **Apply tab**: Loan application form (if eligible) or status of existing application
- **Offers tab**: List of offers from lenders with accept/decline actions
- **Loans tab**: Active loans with repayment schedules and proof upload actions
- **Profile tab**: Business profile form, verification documents, credit limit, and borrowing power

### Lender Workspace (`/lender`)

- **Home tab**: Review queue, overview stats, applications needing attention
- **Applications tab**: Open loan applications available for review
- **Offers tab**: All sent offers grouped by status, with active loan details
- **Account tab**: Lender profile, verification documents, and change request form

### Manager Dashboard (`/manager`)

- **Overview**: KPIs, charts, pending actions, lender performance, borrower readiness
- **Applications**: Filterable application list with detail views
- **Loans**: Active loan monitoring with repayment progress
- **Repayments**: Proof monitoring with overdue refresh
- **Borrower Verifications**: Verification queue with document review
- **Lenders**: Lender review queue with approval tools
- **Users**: User directory with search and detail views
- **Audit Logs**: Append-only audit trail with filters
