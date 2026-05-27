# Database Schema Plan

This document tracks the MVP schema direction and the implemented vertical
slice. Active loans and preferred-term repayment schedules are part of the MVP
workflow. Repayment proof upload, lender review, borrower verification, credit
readiness, and consent tracking are implemented.

## Core Entities

| Entity | Purpose | Key Relationships |
| --- | --- | --- |
| `profiles` | One application profile per `auth.users` account, including role and status | `id` references `auth.users.id` |
| `borrower_portfolios` | Borrower business profile with business type, location, cash-flow inputs, expense and debt breakdowns, and loan purpose context | `borrower_id` references `auth.users.id`; one active portfolio per borrower |
| `lender_profiles` | Manual lender verification profile with organization, contact, operating area, loan range, repayment terms, description, manager notes, and approval/rejection fields | `user_id` references `profiles.id`; review actors reference `profiles.id` |
| `borrower_verifications` | Borrower identity verification lifecycle | Borrower profile; reviewed by manager |
| `borrower_verification_documents` | Uploaded verification documents with acceptance tracking | `verification_id` references `borrower_verifications.id` |
| `loan_applications` | Borrower request for financing with profile and credit snapshots | Borrower profile and portfolio |
| `loan_offers` | Official lender offer on an application | Loan application, borrower, and lender |
| `active_loans` | Accepted offer converted to loan | Accepted offer and application |
| `loan_repayment_schedules` | Deterministic repayment installments | Active loan |
| `repayment_proofs` | Uploaded evidence for a repayment installment | Repayment schedule and Storage file path |
| `legal_documents` | Versioned legal document registry | Used by `user_consents` |
| `user_consents` | Append-only accepted consent versions | User profile and legal document |
| `provisioning_events` | Account provisioning audit trail | `auth.users.id` |
| `account_onboarding_states` | Read-only account readiness summary | Derived from profiles, verifications, and lender profiles |
| `notifications` | In-app notification records | Actor and target user profiles |
| `audit_logs` | Immutable operational history | Actor profile and target record |

## Enum Types

| Enum | Values |
| --- | --- |
| `app_role` | `borrower`, `lender`, `manager` |
| `business_type` | `sari_sari_store`, `food_stall`, `online_seller`, `market_vendor`, `service_provider`, `other` |
| `application_status` | `submitted`, `open`, `accepted`, `declined`, `withdrawn` |
| `preferred_term` | `1_month`, `3_months`, `6_months`, `12_months` |
| `offer_status` | `pending`, `accepted`, `declined`, `expired` |
| `active_loan_status` | `active`, `paid`, `overdue`, `defaulted`, `closed` |
| `repayment_status` | `due`, `submitted`, `verified`, `rejected`, `late` |
| `repayment_proof_status` | `submitted`, `verified`, `rejected` |

## Migrations

The repository contains 31 applied migrations in `supabase/migrations/`. They
are applied in timestamp order by `supabase migration up` or `supabase db reset`.

### Migration Index

| Migration | Scope |
| --- | --- |
| `20260524032832_add_borrower_portfolios` | Borrower business profile table and RLS |
| `20260524041000_add_loan_applications` | Loan application table and RLS |
| `20260524042000_add_lender_portfolio_review_policy` | Lender portfolio access policy |
| `20260524043000_add_loan_offers` | Loan offer table and RLS |
| `20260524044000_add_offer_acceptance` | Initial offer acceptance |
| `20260524073652_harden_foundation_profiles_rls_workflow` | Profile RLS hardening |
| `20260524073721_add_atomic_offer_acceptance_rpc` | Atomic `accept_loan_offer` RPC |
| `20260524080712_fix_foundation_rls_recursion` | RLS recursion fix |
| `20260524083815_borrower_application_controls` | Application edit and withdrawal |
| `20260524090000_lender_offer_context_access` | Lender closed-context access |
| `20260524142104_add_active_loans` | Active loans, repayment schedules, statuses |
| `20260524145301_add_repayment_proofs` | Repayment proofs, Storage bucket, RPCs |
| `20260525013039_harden_offer_workflow_and_repayment_schedules` | Offer and repayment workflow hardening |
| `20260525014423_harden_repayment_proof_lifecycle_v2` | Repayment proof lifecycle hardening |
| `20260525063547_borrower_credit_limit_enforcement` | Credit limit calculation and enforcement |
| `20260525080000_add_application_credit_snapshot_offer_validation` | Application credit snapshots and offer validation |
| `20260525083512_add_overdue_repayment_refresh` | Overdue repayment detection and refresh |
| `20260525090048_add_notifications_foundation` | Notification table and RLS |
| `20260525091146_wire_workflow_notifications` | Workflow-triggered notifications |
| `20260525110149_add_account_onboarding` | Account onboarding and provisioning events |
| `20260525115311_lender_verification_profile_depth` | Lender review profile depth |
| `20260526003447_add_borrower_verification_gate` | Borrower verification lifecycle |
| `20260526004411_add_borrower_verification_documents` | Verification document upload and review |
| `20260526005823_add_user_consents` | Legal documents and consent registry |
| `20260526050823_consent_signup_baseline` | Signup consent baseline |
| `20260526051837_provisioning_lifecycle` | Provisioning events and repair RPC |
| `20260526053953_harden_workflow_consent_enforcement` | Consent enforcement for workflows |
| `20260526054915_production_borrower_verification_readiness` | Production verification readiness |
| `20260526055837_borrower_verification_readiness_enforcement` | Verification readiness enforcement |
| `20260526060958_borrower_profile_credit_readiness` | Profile-based credit readiness |
| `20260526070000_simplify_borrower_profile_readiness` | Simplified profile readiness |

## Constraints

- One active portfolio per borrower.
- One active loan per application.
- One active loan per accepted offer.
- One accepted offer per application (partial unique index).
- One pending offer per lender per application.
- Unique installment numbers per active loan.
- Positive principal and repayment amounts.
- Non-negative fees.
- Non-negative outstanding balance.
- One active submitted proof per repayment schedule.
- One verified proof per repayment schedule.
- Repayment proof files limited to JPG, PNG, WebP, or PDF up to 5 MB.

## Draft SQL

See `docs/schema-draft.sql`. It is a review draft, not an applied migration.
