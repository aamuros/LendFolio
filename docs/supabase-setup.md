# Supabase Setup

LendFolio uses Supabase Auth for email/password accounts and Postgres/RLS for
trusted role and workflow authorization.

## Dashboard Setup

1. Create a Supabase project from the Supabase dashboard.
2. Open **Authentication > Providers** and enable Email.
3. Keep email/password sign-in enabled.
4. Add local development URLs in **Authentication > URL Configuration**:
   - Site URL: `http://localhost:3000`
   - Redirect URL allow list: `http://localhost:3000/**`
5. When Vercel is connected, add the Vercel preview and production URLs to the redirect allow list.

## Environment Variables

Local `.env.local` should use values from the Supabase dashboard:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-public-anon-key
```

Vercel should define the same variables under the project environment settings for Preview and Production.

Only public browser-safe values belong in `NEXT_PUBLIC_*`. Do not add a service role key to browser code or commit it to the repository.

## Account Provisioning

- Borrower and lender accounts are created from `/signup`.
- Signup calls Supabase Auth `signUp` with initial provisioning metadata.
- The database trigger on `auth.users` attempts trusted account provisioning and
  writes `public.provisioning_events` rows for attempted, succeeded, and failed
  provisioning outcomes.
- Borrower profiles are created with `role = 'borrower'` and `status = 'active'`.
- Lender profiles are created with `role = 'lender'`, `status = 'active'`, and
  `public.lender_profiles.verification_status = 'pending'`.
- Lender signup also stores the submitted manual-review profile details:
  organization, contact, phone, business address, operating area, optional
  registration number, loan range, repayment terms, and description.
- Signup requires Terms of Service and Privacy Notice acceptance. The app
  records those accepted versions in `public.user_consents` through
  `accept_user_consents`; Auth metadata is not legal consent evidence.
- Manager accounts are not self-serve. Signup metadata requesting a manager role
  is recorded as a failed provisioning event and does not create a trusted
  manager profile. Seed or provision manager profiles manually.
- Managers can inspect provisioning events and run
  `repair_user_provisioning(user_id)` for Auth users whose trusted borrower or
  lender rows were not created. Repair uses the same metadata validation as the
  signup trigger and is idempotent.
- `public.account_onboarding_states` provides a read-only borrower/lender state
  summary for provisioned accounts. It derives readiness from trusted profile,
  borrower verification, and lender verification rows.
- Manager lender review happens at `/manager/lenders` and the manager-only
  lender detail page. Approval and rejection are manual decisions; this is not
  automated identity verification, KYB, or credit scoring.
- Email notifications for lender review are not implemented.

Authorization must continue to read from database rows, not from mutable Auth
user metadata.

## Email Confirmation

Local Supabase currently has email confirmations disabled, so signup can return
an active session immediately. Hosted projects often require email confirmation.
If confirmations are enabled, keep Supabase redirect URLs aligned with the app
origin and direct users back to sign in after confirmation.
Baseline Terms and Privacy consent is attempted immediately when signup returns
an active session. If email confirmation prevents that write, the app retries
the same append-only RPC on the first authenticated login or protected-route
session.

## App Client Structure

- `lib/supabase/client.ts` creates a browser client for client components.
- `lib/supabase/server.ts` creates a per-request server client for Server
  Components, Route Handlers, and Server Actions.
- `lib/supabase/types.ts` contains checked-in database types for the MVP schema.
