import Link from "next/link";
import { demoRoles } from "@/lib/demo-roles";

export default function Home() {
  return (
    <main className="min-h-svh">
      <section className="flex min-h-svh flex-col justify-between px-5 py-6 sm:px-8 lg:px-12">
        <header className="flex items-center justify-between gap-4">
          <p className="text-sm font-semibold tracking-[0.18em] text-[var(--primary)] uppercase">
            LendFolio
          </p>
          <p className="text-xs font-medium text-[var(--muted-foreground)]">
            Sprint 0
          </p>
        </header>

        <div className="mx-auto grid w-full max-w-6xl gap-10 py-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
          <div className="max-w-2xl">
            <p className="mb-4 text-sm font-semibold text-[var(--accent)]">
              Agile MVP Build
            </p>
            <h1 className="text-5xl leading-[0.95] font-semibold text-balance sm:text-6xl lg:text-7xl">
              LendFolio
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-[var(--muted-foreground)]">
              A mobile-first foundation for Filipino micro-entrepreneurs,
              verified lenders, and platform managers.
            </p>
          </div>

          <nav
            aria-label="Mocked demo role selection"
            className="grid gap-3 border-y border-[var(--border)] py-4"
          >
            <p className="text-xs font-semibold tracking-[0.16em] text-[var(--muted-foreground)] uppercase">
              Mock demo login
            </p>
            {demoRoles.map((area) => (
              <Link
                key={area.route}
                href={area.route}
                className="group grid gap-2 py-4 transition-colors hover:text-[var(--primary)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)]"
              >
                <span className="flex items-center justify-between gap-4 text-2xl font-semibold">
                  Continue as {area.title}
                  <span
                    aria-hidden="true"
                    className="transition-transform group-hover:translate-x-1"
                  >
                    -&gt;
                  </span>
                </span>
                <span className="max-w-md text-sm leading-6 text-[var(--muted-foreground)]">
                  {area.state}. {area.nextAction}
                </span>
              </Link>
            ))}
          </nav>
        </div>

        <footer className="grid gap-2 border-t border-[var(--border)] pt-5 text-sm text-[var(--muted-foreground)] sm:grid-cols-3">
          <p>Next.js App Router</p>
          <p>TypeScript + Tailwind CSS</p>
          <p>shadcn/ui ready</p>
        </footer>
      </section>
    </main>
  );
}
