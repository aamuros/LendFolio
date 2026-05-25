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
- The database trigger on `auth.users` creates trusted `public.profiles` rows.
- Borrower profiles are created with `role = 'borrower'` and `status = 'active'`.
- Lender profiles are created with `role = 'lender'`, `status = 'active'`, and
  `public.lender_profiles.verification_status = 'pending'`.
- Manager accounts are not self-serve. Seed or provision them manually.
- Manager lender review happens at `/manager/lenders`.

Authorization must continue to read from database rows, not from mutable Auth
user metadata.

## Email Confirmation

Local Supabase currently has email confirmations disabled, so signup can return
an active session immediately. Hosted projects often require email confirmation.
If confirmations are enabled, keep Supabase redirect URLs aligned with the app
origin and direct users back to sign in after confirmation.

## App Client Structure

- `lib/supabase/client.ts` creates a browser client for client components.
- `lib/supabase/server.ts` creates a per-request server client for Server
  Components, Route Handlers, and Server Actions.
- `lib/supabase/types.ts` contains checked-in database types for the MVP schema.
