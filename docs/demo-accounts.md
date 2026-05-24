# Demo Accounts Plan

Sprint 0 uses mocked role links instead of real authentication. These accounts are placeholders for Supabase Auth setup and must not use real passwords in documentation.

| Role | Placeholder Email | Password |
| --- | --- | --- |
| Borrower | `borrower.demo@example.com` | Set manually in Supabase dashboard |
| Lender | `lender.demo@example.com` | Set manually in Supabase dashboard |
| Manager | `manager.demo@example.com` | Set manually in Supabase dashboard |

## Intended Redirects

After Supabase Auth and role assignment are implemented:

- Borrower accounts should redirect to `/borrower`.
- Lender accounts should redirect to `/lender`.
- Manager accounts should redirect to `/manager`.

## Sprint Mapping

- ADI-8 creates the mocked role selection and dashboard shells.
- A later auth task should replace mocked role links with Supabase session checks.
- Sprint 1 should add borrower portfolio and loan application functionality.
- Sprint 1 or Sprint 2 should add lender review and offer functionality.
- Later sprints should add repayment proof verification, monitoring, and audit logs.

## Security Notes

- Do not commit demo passwords.
- Do not store role authorization in user-editable metadata.
- Use database-backed roles or trusted app metadata when role redirects are implemented.
