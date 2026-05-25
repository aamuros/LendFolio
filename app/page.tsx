import Link from "next/link";

type HomeProps = {
  searchParams?: Promise<{
    auth?: string;
  }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const authMessage = getAuthMessage(params?.auth);

  return (
    <main className="min-h-svh bg-[#F6F5F2] text-[#161616]">
      <section className="mx-auto flex min-h-svh w-full max-w-6xl flex-col px-5 py-5 sm:px-8 lg:px-10">
        <header className="flex min-h-12 items-center justify-between gap-4 border-b border-[#D9D7D1]">
          <p className="text-xs font-semibold tracking-[0.18em] text-[#1F1F1F] uppercase">
            LENDFOLIO
          </p>
          <div className="flex items-center gap-4">
            <Link
              href="/signup"
              className="rounded-sm px-1 py-1 text-sm font-medium text-[#1F1F1F] underline-offset-4 transition-colors hover:text-[#5F5F5F] hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1F1F1F]"
            >
              Create account
            </Link>
            <Link
              href="/login"
              className="rounded-sm px-1 py-1 text-sm font-medium text-[#1F1F1F] underline-offset-4 transition-colors hover:text-[#5F5F5F] hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1F1F1F]"
            >
              Sign in
            </Link>
          </div>
        </header>

        <div className="flex flex-1 flex-col justify-center gap-10 py-10 sm:py-12 lg:gap-12 lg:py-14">
          <div className="grid max-w-4xl gap-8 lg:pt-4">
            {authMessage ? (
              <p
                className="max-w-xl border-l-2 border-[#1F1F1F] bg-white/70 px-4 py-3 text-sm leading-6 text-[#5F5F5F]"
                role="status"
              >
                {authMessage}
              </p>
            ) : null}
            <div className="grid gap-5">
              <p className="text-xs font-semibold tracking-[0.16em] text-[#6A6863] uppercase">
                MICRO-BUSINESS LENDING
              </p>
              <h1 className="max-w-4xl text-4xl leading-[1.04] font-semibold tracking-[-0.01em] text-balance text-[#161616] sm:text-5xl lg:text-6xl">
                Simple financing workflows for micro-business lending.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-[#55534F] sm:text-lg sm:leading-8">
                LendFolio helps borrowers submit business profiles, lenders
                review applications, and teams manage offer decisions.
              </p>
            </div>
            <div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/signup"
                  className="inline-flex min-h-12 items-center justify-center rounded-md bg-[#1F1F1F] px-6 text-sm font-semibold !text-white shadow-[0_1px_0_rgba(255,255,255,0.18)_inset] transition-colors hover:bg-[#0F0F0F] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1F1F1F]"
                >
                  Create account
                </Link>
                <Link
                  href="/login"
                  className="inline-flex min-h-12 items-center justify-center rounded-md border border-[#D9D7D1] bg-white/70 px-6 text-sm font-semibold text-[#1F1F1F] transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1F1F1F]"
                >
                  Sign in
                </Link>
              </div>
            </div>
          </div>

          <section
            aria-label="Core workflow"
            className="grid overflow-hidden rounded-lg border border-[#D9D7D1] bg-white/45 sm:grid-cols-3 sm:divide-x sm:divide-[#D9D7D1]"
          >
            {features.map((feature) => (
              <article
                key={feature.title}
                className="grid gap-3 border-b border-[#D9D7D1] p-5 last:border-b-0 sm:border-b-0 sm:p-6"
              >
                <h2 className="text-sm font-semibold text-[#1F1F1F]">
                  {feature.title}
                </h2>
                <p className="max-w-xs text-sm leading-6 text-[#5F5F5F]">
                  {feature.description}
                </p>
              </article>
            ))}
          </section>
        </div>
      </section>
    </main>
  );
}

const features = [
  {
    title: "Business profiles",
    description: "Keep borrower details ready for review.",
  },
  {
    title: "Loan applications",
    description: "Submit and review financing requests.",
  },
  {
    title: "Lender offers",
    description: "Compare, decline, or accept structured offers.",
  },
];

function getAuthMessage(auth?: string) {
  if (auth === "unknown") {
    return "Your account is signed in, but it does not have access to a workspace yet.";
  }

  if (auth === "lender-pending") {
    return "Your lender access is pending review. You will be able to continue when your account is approved.";
  }

  if (auth === "access") {
    return "Your account does not have access to this workspace.";
  }

  return "";
}
