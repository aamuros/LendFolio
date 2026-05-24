# Supabase Setup Plan

Sprint 0 prepares the app to connect to Supabase but does not implement full auth flows, role redirects, loan workflows, or production RLS policies.

## Dashboard Setup

1. Create a Supabase project from the Supabase dashboard.
2. Open **Authentication > Providers** and enable Email.
3. Keep email/password sign-in enabled for Sprint 0 demo account planning.
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

## App Client Structure

- `lib/supabase/client.ts` creates a browser client for future client components.
- `lib/supabase/server.ts` creates a per-request server client for Server Components, Route Handlers, and Server Actions.
- `lib/supabase/types.ts` is a placeholder until generated database types are available.

When auth routes are implemented later, add middleware for session refresh before relying on server-rendered authenticated state.

## Sprint Boundaries

ADI-6 does not create users, sign-in pages, sign-out actions, role redirects, or protected dashboards. Those belong to later Sprint 0 or Sprint 1 tasks.
