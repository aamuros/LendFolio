# Demo Accounts

ADI-14 uses real Supabase Auth sessions for the Sprint 1 happy-path test flow.
Create these users manually in Supabase Auth. Do not commit passwords.

| Role | Placeholder Email | Password |
| --- | --- | --- |
| Borrower | `borrower.demo@example.com` | Set manually in Supabase dashboard |
| Lender | `lender.demo@example.com` | Set manually in Supabase dashboard |
| Manager | `manager.demo@example.com` | Set manually in Supabase dashboard |

## Sign-In Routes

- Borrower: `/login?role=borrower`
- Lender: `/login?role=lender`
- Manager: `/login?role=manager`

The login page pre-fills the selected demo email only. Passwords must be entered
from the manually configured Supabase Auth users.

## Temporary Redirects

- Borrower accounts should redirect to `/borrower`.
- Lender accounts should redirect to `/lender`.
- Manager accounts should redirect to `/manager`.
- Unknown emails redirect to `/` with a generic signed-in message.

This is a temporary ADI-14 email mapping for testing. Replace it with trusted
role authorization when role management is in scope.

## Sprint Mapping

- ADI-8 creates the mocked role selection and dashboard shells.
- Sprint 1 should add borrower portfolio and loan application functionality.
- Sprint 1 or Sprint 2 should add lender review and offer functionality.
- ADI-14 replaces mocked homepage role links with a minimal Supabase Auth bridge.
- Later sprints should add repayment proof verification, monitoring, and audit logs.

## Manual Verification Checklist

- [ ] Created demo users manually in Supabase Auth.
- [ ] Applied migrations with `supabase migration up`.
- [ ] Borrower can sign in.
- [ ] Borrower can save portfolio to Supabase.
- [ ] Borrower can submit loan application to Supabase.
- [ ] Lender can sign in.
- [ ] Lender can see submitted/open applications.
- [ ] Lender can open application detail.
- [ ] Lender can send pending offer.
- [ ] Borrower can see offer.
- [ ] Borrower can accept offer.
- [ ] Other pending offers are declined.
- [ ] Sign-out works.
- [ ] No passwords or service role keys committed.

## Security Notes

- Do not commit demo passwords.
- Do not store role authorization in user-editable metadata.
- Use database-backed roles or trusted app metadata when role redirects are implemented.
