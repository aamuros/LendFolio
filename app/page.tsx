import Link from "next/link";
import { portalConfigs } from "@/lib/app-roles";

type HomeProps = {
  searchParams?: Promise<{
    auth?: string;
  }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;

  return (
    <main className="min-h-svh bg-[var(--background)]">
      <section className="flex min-h-svh flex-col justify-between px-5 py-6 sm:px-8 lg:px-12">
        <header className="flex items-center justify-between gap-4">
          <p className="text-sm font-semibold tracking-[0.18em] text-[var(--primary)] uppercase">
            LendFolio
          </p>
          <Link
            href="/login"
            className="text-sm font-semibold text-[var(--primary)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)]"
          >
            Log in
          </Link>
        </header>

        <div className="mx-auto grid w-full max-w-6xl gap-10 py-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
          <div className="max-w-2xl">
            <h1 className="text-5xl leading-[0.95] font-semibold text-balance sm:text-6xl lg:text-7xl">
              LendFolio
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-[var(--muted-foreground)]">
              Simple financing workflows for micro-businesses and verified
              lenders.
            </p>
          </div>

          <nav aria-label="LendFolio portals" className="grid gap-3">
            {params?.auth === "unknown" ? (
              <p
                className="rounded-md border border-[var(--border)] bg-white px-4 py-3 text-sm leading-6 text-[var(--muted-foreground)]"
                role="status"
              >
                Sign in to continue.
              </p>
            ) : null}
            {portalConfigs.map((area) => (
              <Link
                key={area.route}
                href={area.route}
                className="group grid gap-2 border-t border-[var(--border)] py-5 transition-colors hover:text-[var(--primary)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)]"
              >
                <span className="flex items-center justify-between gap-4 text-2xl font-semibold">
                  {area.title}
                  <span
                    aria-hidden="true"
                    className="transition-transform group-hover:translate-x-1"
                  >
                    -&gt;
                  </span>
                </span>
                <span className="max-w-md text-sm leading-6 text-[var(--muted-foreground)]">
                  {area.description}
                </span>
              </Link>
            ))}
          </nav>
        </div>

        <footer className="grid gap-2 border-t border-[var(--border)] pt-5 text-sm text-[var(--muted-foreground)] sm:grid-cols-3">
          <p>Business profiles</p>
          <p>Loan applications</p>
          <p>Lender offers</p>
        </footer>
      </section>
    </main>
  );
}
