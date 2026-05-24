import { AuthStatus } from "@/components/auth-status";
import { requireManager } from "@/lib/access-control";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ManagerPage() {
  const access = await requireManager();

  return (
    <main className="min-h-svh px-5 py-6 sm:px-8">
      <div className="mx-auto grid min-h-[calc(100svh-3rem)] max-w-4xl content-center gap-8">
        <header className="flex items-center justify-between gap-4">
          <Link
            href="/"
            className="text-sm font-medium text-[var(--primary)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)]"
          >
            &lt;- LendFolio
          </Link>
          <p className="text-xs font-semibold tracking-[0.16em] text-[var(--muted-foreground)] uppercase">
            Manager
          </p>
        </header>

        <section className="grid gap-5">
          <p className="text-sm font-semibold text-[var(--accent)]">
            Manager portal
          </p>
          <div className="grid gap-4">
            <h1 className="text-4xl leading-tight font-semibold text-balance sm:text-5xl">
              Manager dashboard
            </h1>
            {access.ok ? (
              <p className="max-w-2xl text-base leading-7 text-[var(--muted-foreground)]">
                Platform oversight tools will appear here as they are released.
              </p>
            ) : (
              <p className="max-w-2xl text-base leading-7 text-[var(--muted-foreground)]">
                {access.message}
              </p>
            )}
          </div>
        </section>

        <AuthStatus role="manager" />
      </div>
    </main>
  );
}
