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
5. When Vercel is connected, add the Vercel preview and production URLs to the
   redirect allow list.

## Environment Variables

Local `.env.local` should use values from the Supabase dashboard:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-public-anon-key
```

Vercel should define the same variables under the project environment settings
for Preview and Production.

Only public browser-safe values belong in `NEXT_PUBLIC_*`. Do not add a service
role key to browser code or commit it to the repository.

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

### Signup Troubleshooting

If signup works for new emails but fails for emails that were already tried,
check for an Auth user that was created before trusted profile provisioning
completed. Run the latest migrations against production Supabase before testing
Vercel again; the current provisioning migration repairs orphaned self-service
signup users and prevents future orphaned inserts.

Inspect one email with:

```sql
select
  users.id,
  users.email,
  users.created_at,
  users.confirmation_sent_at,
  users.email_confirmed_at,
  users.raw_user_meta_data ->> 'lendfolio_role' as requested_role,
  profiles.id is not null as has_profile,
  profiles.role,
  lender_profiles.id is not null as has_lender_profile,
  lender_profiles.verification_status as lender_verification_status
from auth.users users
left join public.profiles profiles
  on profiles.id = users.id
left join public.lender_profiles lender_profiles
  on lender_profiles.user_id = users.id
where lower(users.email) = lower('person@example.com');
```

For a compact signup-status view during deployment debugging:

```sql
select
  users.email,
  users.confirmation_sent_at,
  users.email_confirmed_at,
  profiles.role,
  lender_profiles.verification_status
from auth.users users
left join public.profiles profiles
  on profiles.id = users.id
left join public.lender_profiles lender_profiles
  on lender_profiles.user_id = users.id
where lower(users.email) = lower('person@example.com');
```

Interpretation:

- If `auth.users` exists and `email_confirmed_at` is null, the user has a
  pending Auth account. Use the app's resend confirmation flow instead of
  signing up again with the same email.
- If `auth.users` exists but `profiles.role` is null, run the latest
  provisioning repair migration/function, then inspect
  `public.provisioning_events` for the user.
- If `confirmation_sent_at` is null or no emails arrive, check Supabase
  **Authentication > Providers > Email**, custom SMTP settings, the Confirm
  signup email template, and **Authentication > URL Configuration** Site URL
  and Redirect URLs.

## Email Confirmation

Production Supabase should keep **Confirm Email** enabled. Configure the
Confirm signup template to send users through the app confirmation route:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next={{ .RedirectTo }}">
  Confirm email address
</a>
```

The route verifies the token server-side, rejects cross-origin redirects, and
then sends confirmed users back to the login confirmation notice. Keep Supabase
Site URL and Redirect URLs aligned with the deployed app origin.

Local Supabase may keep email confirmations disabled for faster seeded-account
testing. If local confirmations are enabled, use the local email testing inbox
and keep `http://localhost:3000/**` in the redirect allow list.

Baseline Terms and Privacy consent is attempted immediately when signup returns
an active session. If email confirmation prevents that write, the app retries
the same append-only RPC on the first authenticated login or protected-route
session.

## Brevo via Supabase Custom SMTP

LendFolio uses [Brevo](https://www.brevo.com) as the email delivery provider for
Supabase Auth transactional emails (signup confirmation, password reset). Brevo
is configured as a custom SMTP server inside the Supabase dashboard; the app
does not call the Brevo API directly.

### Why custom SMTP

Supabase's built-in email sender has restrictive rate limits and is intended for
testing. Brevo's free SMTP relay supports transactional delivery through a
verified sender email without requiring application-level email credentials.

### Setup steps

1. **Create a Brevo account** at [brevo.com](https://www.brevo.com) and add a
   sender under **Settings > Senders, domains, IPs**. Verify the sender email
   using the code Brevo sends to that address.

2. **Generate an SMTP key** under **Settings > SMTP & API > SMTP**. Copy the
   complete key when it is displayed; Brevo only displays it once. Use the SMTP
   login shown on that page as the username.

3. **Open the Supabase dashboard** and go to **Authentication > Email
   Templates** (or **Project Settings > Auth > SMTP** depending on the Supabase
   version).

4. **Enable custom SMTP** and enter:

   | Field | Value |
   | --- | --- |
   | Sender email | Your verified Brevo sender email |
   | Sender name | `LendFolio` |
   | Host | `smtp-relay.brevo.com` |
   | Port number | `587` |
   | Minimum interval between emails | `0` (LendFolio handles its own cooldown) |
   | Username | Your Brevo SMTP login (not your account email unless Brevo shows it) |
   | Password | Your complete Brevo SMTP key (not your account password) |

5. **Test** by signing up with a real email. Confirmation emails should arrive
   from your verified sender email. Check **Transactional > Logs** in Brevo if
   delivery fails.

### What Supabase still handles

Brevo only provides the transport layer. Supabase Auth remains responsible for:

- User creation and storage
- Session and JWT management
- Email confirmation token generation
- Password reset token generation
- Rate limiting per email address
- RLS-compatible `auth.uid()` / `auth.jwt()`

### Environment variables

No additional environment variables are needed for SMTP delivery. Brevo
credentials live in the Supabase dashboard, not in the app's `.env` file.

### Local development

Local Supabase (via `supabase start`) uses its built-in email testing inbox by
default. Custom SMTP is only needed for the hosted Supabase project used in
staging and production. Keep email confirmations disabled locally for
seeded-account testing unless testing the confirmation flow specifically.

## App Client Structure

| File | Purpose |
| --- | --- |
| `lib/supabase/client.ts` | Browser client for client components |
| `lib/supabase/server.ts` | Per-request server client for Server Components, Route Handlers, and Server Actions |
| `lib/supabase/types.ts` | Checked-in database types for the current schema |
| `lib/supabase/env.ts` | Environment variable access |
