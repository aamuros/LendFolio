import Link from "next/link";
import { SignupForm } from "@/app/signup/signup-form";

export default function SignupPage() {
  return (
    <main className="grid min-h-svh bg-[var(--background)] px-5 py-6 sm:px-8">
      <div className="mx-auto grid w-full max-w-[36rem] content-center gap-7">
        <header className="grid text-center">
          <Link
            href="/"
            className="justify-self-center rounded-sm px-1 py-1 text-sm font-semibold tracking-[0.18em] text-[var(--foreground)] uppercase transition-colors hover:text-[var(--muted-foreground)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)]"
          >
            LendFolio
          </Link>
        </header>

        <SignupForm />

        <div className="flex justify-center gap-4 text-sm">
          <Link
            href="/login"
            className="rounded-sm px-1 py-1 font-medium text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)] hover:underline hover:underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)]"
          >
            Sign in
          </Link>
          <Link
            href="/"
            className="rounded-sm px-1 py-1 font-medium text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)] hover:underline hover:underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)]"
          >
            Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
