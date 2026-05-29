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
    <main className="min-h-svh overflow-x-hidden bg-[#F6F5F2] text-[#161616]">
      <Header />

      <section className="hero-depth-scene relative isolate flex min-h-[calc(100svh-4rem)] items-center overflow-hidden border-b border-[#D9D7D1] px-5 py-10 sm:px-8 sm:py-14 lg:px-10 lg:py-16">
        <div className="absolute inset-0 -z-20 bg-[linear-gradient(to_right,rgba(22,22,22,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(22,22,22,0.03)_1px,transparent_1px)] bg-[size:5rem_5rem]" />
        <div className="absolute inset-x-0 top-0 -z-10 h-64 bg-[radial-gradient(circle_at_50%_0%,rgba(51,66,60,0.12),transparent_64%)]" />
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_44%,rgba(255,255,252,0.76),transparent_32%),radial-gradient(circle_at_18%_70%,rgba(51,66,60,0.08),transparent_28%),radial-gradient(circle_at_82%_70%,rgba(226,218,198,0.36),transparent_30%)]" />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_bottom,rgba(246,245,242,0)_0%,rgba(246,245,242,0.72)_82%,rgba(246,245,242,0.98)_100%)]" />

        <div className="mx-auto grid w-full max-w-7xl gap-12">
          {authMessage ? (
            <p
              className="mx-auto max-w-2xl border border-[#D9D7D1] bg-[#FFFFFC]/85 px-4 py-3 text-center text-sm leading-6 text-[#4F4F4B] shadow-[0_18px_50px_rgba(14,26,18,0.08)]"
              role="status"
            >
              {authMessage}
            </p>
          ) : null}

          <div className="relative mx-auto grid w-full max-w-6xl place-items-center gap-7 py-4 text-center sm:py-6">
            <LandingMesh />
            <FloatingFinanceCards />
            <div className="relative z-20 grid max-w-5xl gap-5">
              <p className="text-xs font-semibold tracking-[0.2em] text-[#6A6863] uppercase">
                Structured microfinance operations
              </p>
              <h1 className="text-balance text-[clamp(3rem,7vw,6.25rem)] leading-[0.98] font-semibold tracking-[-0.02em] text-[#161616]">
                Data-driven lending workflows for modern microfinance
              </h1>
              <p className="mx-auto max-w-3xl text-balance text-base leading-7 text-[#55534F] sm:text-lg sm:leading-8">
                LendFolio helps borrowers prepare profiles, lenders review
                applications, and managers oversee approvals, offers, proofs,
                and repayments.
              </p>
            </div>

            <div className="relative z-20 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="inline-flex min-h-12 items-center justify-center border border-[#161616] bg-[#161616] px-6 text-sm font-semibold !text-white transition-colors hover:bg-[#0E1A12] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#161616]"
              >
                Create account
              </Link>
              <Link
                href="/login"
                className="inline-flex min-h-12 items-center justify-center border border-[#C7C4BC] bg-[#FFFFFC]/80 px-6 text-sm font-semibold text-[#161616] transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#161616]"
              >
                Sign in
              </Link>
            </div>

            <div className="relative z-20 w-full">
              <HeroFinanceGrid />
            </div>
          </div>
        </div>
      </section>

      <WorkflowStrip />
      <DarkIntelligenceSection />
      <ProductWorkflowSections />
      <LayerSection />
      <MetricsSection />
      <FinalCta />
      <Footer />
    </main>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-[#D9D7D1] bg-[#F6F5F2]/90 px-5 backdrop-blur sm:px-8 lg:px-10">
      <nav
        className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4"
        aria-label="Main navigation"
      >
        <Link
          href="/"
          className="text-sm font-semibold tracking-[0.18em] uppercase focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#161616]"
        >
          LendFolio
        </Link>
        <div className="hidden items-center gap-7 text-sm text-[#55534F] lg:flex">
          {navLinks.map((link) => (
            <a
              key={link}
              href={`#${link.toLowerCase()}`}
              className="transition-colors hover:text-[#161616] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#161616]"
            >
              {link}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/login"
            className="hidden px-2 py-2 text-sm font-medium text-[#1F1F1F] transition-colors hover:text-[#5F5F5F] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#161616] sm:inline-flex"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="inline-flex min-h-10 items-center justify-center border border-[#161616] bg-[#161616] px-4 text-sm font-semibold !text-white transition-colors hover:bg-[#0E1A12] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#161616]"
          >
            Create account
          </Link>
        </div>
      </nav>
    </header>
  );
}

function LandingMesh() {
  return (
    <div
      className="pointer-events-none absolute top-1/2 left-1/2 z-0 h-[22rem] w-[22rem] -translate-x-1/2 -translate-y-1/2 opacity-55 sm:h-[32rem] sm:w-[32rem]"
      aria-hidden="true"
    >
      <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(255,255,252,0.86)_0%,rgba(226,218,198,0.2)_36%,rgba(51,66,60,0.1)_58%,transparent_72%)]" />
      <div className="hero-engine absolute inset-0">
        <div className="hero-orbit absolute inset-12 rounded-full border border-[#33423C]/16" />
        <div className="hero-orbit hero-orbit-reverse absolute inset-20 rounded-full border border-[#33423C]/14" />
        <div className="absolute inset-28 rounded-full border border-[#161616]/10 bg-[#FFFFFC]/20 shadow-[inset_0_0_55px_rgba(51,66,60,0.08)]" />
        <div className="absolute top-1/2 left-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#33423C]/22 bg-[#FFFFFC]/40 shadow-[0_20px_70px_rgba(14,26,18,0.12)]" />
        <div className="hero-flow-line absolute top-1/2 left-[21%] h-px w-[58%] origin-center bg-gradient-to-r from-transparent via-[#33423C]/34 to-transparent" />
        <div className="hero-flow-line absolute top-[40%] left-[29%] h-px w-[42%] origin-center rotate-[34deg] bg-gradient-to-r from-transparent via-[#33423C]/24 to-transparent" />
        <div className="hero-flow-line absolute top-[60%] left-[29%] h-px w-[42%] origin-center -rotate-[34deg] bg-gradient-to-r from-transparent via-[#33423C]/24 to-transparent" />
        {workflowNodes.map((node) => (
          <div
            key={node.label}
            className={`hero-node absolute h-2.5 w-2.5 rounded-full border border-[#33423C]/30 bg-[#FFFFFC] shadow-[0_0_18px_rgba(51,66,60,0.26)] ${node.position}`}
          />
        ))}
      </div>
    </div>
  );
}

function FloatingFinanceCards() {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 hidden xl:block" aria-hidden="true">
      {heroCards.map((card) => (
        <HeroFinanceCard
          key={card.label}
          className={`absolute w-52 ${card.position} ${card.depth}`}
          label={card.label}
          value={card.value}
          status={card.status}
        />
      ))}
    </div>
  );
}

function HeroFinanceGrid() {
  return (
    <div className="grid w-full max-w-xl grid-cols-2 gap-3 xl:hidden">
      {heroCards.map((card) => (
        <HeroFinanceCard
          key={card.label}
          label={card.label}
          value={card.value}
          status={card.status}
        />
      ))}
    </div>
  );
}

function HeroFinanceCard({
  label,
  value,
  status,
  className = "",
}: {
  label: string;
  value: string;
  status: string;
  className?: string;
}) {
  return (
    <div
      className={`hero-card-3d relative overflow-hidden border border-[#FFFFFC]/75 bg-[#FFFFFC]/88 p-3 text-left shadow-[0_18px_45px_rgba(14,26,18,0.12),inset_0_1px_0_rgba(255,255,255,0.82)] backdrop-blur-md ${className}`}
    >
      <div className="relative flex items-start justify-between gap-3">
        <p className="text-[0.63rem] font-semibold tracking-[0.14em] text-[#77736A] uppercase">
          {label}
        </p>
        <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-[#33423C] shadow-[0_0_12px_rgba(51,66,60,0.38)]" />
      </div>
      <p className="relative mt-2 text-sm font-semibold text-[#161616]">{value}</p>
      <div className="relative mt-3 h-1 overflow-hidden rounded-full bg-[#E7E4DE]">
        <div className="h-full w-2/3 rounded-full bg-[#33423C]" />
      </div>
      <p className="relative mt-2 text-[0.68rem] font-medium text-[#77736A]">
        {status}
      </p>
    </div>
  );
}

function WorkflowStrip() {
  return (
    <section
      className="border-b border-[#D9D7D1] bg-[#EFEDE7] px-5 py-5 sm:px-8 lg:px-10"
      aria-label="Lending workflow"
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-8 gap-y-3 text-center text-xs font-semibold tracking-[0.16em] text-[#68645E] uppercase">
        {workflowLabels.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
    </section>
  );
}

function DarkIntelligenceSection() {
  return (
    <section
      id="product"
      className="scroll-mt-20 relative overflow-hidden bg-[#0E1A12] px-5 py-20 text-white sm:px-8 sm:py-24 lg:px-10"
    >
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(246,245,242,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(246,245,242,0.08)_1px,transparent_1px)] bg-[size:5rem_5rem] opacity-35" />
      <div className="absolute inset-x-0 top-0 h-80 bg-[radial-gradient(circle_at_50%_0%,rgba(226,218,198,0.2),transparent_58%)]" />
      <div className="relative mx-auto grid max-w-7xl gap-12">
        <div className="mx-auto grid max-w-3xl gap-5 text-center">
          <p className="text-xs font-semibold tracking-[0.2em] text-[#C6BFAF] uppercase">
            Decision intelligence
          </p>
          <h2 className="text-balance text-4xl leading-tight font-semibold tracking-[-0.02em] sm:text-6xl">
            Bring structure to every lending decision
          </h2>
          <p className="text-balance text-base leading-7 text-[#CFC8B9] sm:text-lg">
            Turn borrower profiles, application data, lender offers, approvals,
            and repayment proofs into a clear workflow your team can review.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="border border-white/15 bg-white/[0.04] p-4 shadow-[0_28px_90px_rgba(0,0,0,0.24)] sm:p-6">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs tracking-[0.18em] text-[#AFA794] uppercase">
                  Review queue
                </p>
                <h3 className="mt-2 text-xl font-semibold">
                  Applications by stage
                </h3>
              </div>
              <span className="border border-[#C6BFAF]/30 px-3 py-1 text-xs text-[#E6DDCB]">
                Live workflow
              </span>
            </div>
            <div className="grid gap-3">
              {decisionRows.map((row) => (
                <div
                  key={row.name}
                  className="grid gap-3 border border-white/10 bg-[#142218]/80 p-4 sm:grid-cols-[1fr_auto_auto] sm:items-center"
                >
                  <div>
                    <p className="font-medium text-white">{row.name}</p>
                    <p className="mt-1 text-sm text-[#AFA794]">{row.detail}</p>
                  </div>
                  <span className="w-fit border border-[#E6DDCB]/20 px-3 py-1 text-xs text-[#E6DDCB]">
                    {row.status}
                  </span>
                  <p className="text-sm font-semibold text-[#F6F0DF]">
                    {row.amount}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4">
            {intelligenceCards.map((card) => (
              <DataCard key={card.title} {...card} dark />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ProductWorkflowSections() {
  return (
    <>
      <BorrowerDossierSection />
      <LenderCockpitSection />
      <RepaymentTimelineSection />
    </>
  );
}

function BorrowerDossierSection() {
  return (
    <section
      id="borrowers"
      className="scroll-mt-20 bg-[#F6F5F2] px-5 py-20 sm:px-8 sm:py-24 lg:px-10"
    >
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
        <SectionIntro
          eyebrow="Borrower profile dossier"
          title="A complete borrower file before review begins"
          description="Business context, documents, credit readiness, verification notes, and application status sit together like a prepared lending file."
        />
        <div className="border border-[#D9D7D1] bg-[#FFFFFC]/78 p-4 shadow-[0_28px_90px_rgba(14,26,18,0.08)] sm:p-6">
          <div className="flex flex-col gap-4 border-b border-[#D9D7D1] pb-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold tracking-[0.18em] text-[#77736A] uppercase">
                Business profile
              </p>
              <h3 className="mt-3 text-2xl font-semibold text-[#161616]">
                Sari-sari store expansion
              </h3>
              <p className="mt-2 text-sm leading-6 text-[#5F5F5F]">
                Quezon City · Retail · 4 years operating
              </p>
            </div>
            <div className="border border-[#C7C4BC] bg-[#F6F5F2] px-4 py-3">
              <p className="text-xs text-[#77736A]">Profile completion</p>
              <p className="mt-1 text-3xl font-semibold tracking-[-0.04em] text-[#161616]">
                92%
              </p>
            </div>
          </div>
          <div className="grid gap-3 py-5 sm:grid-cols-2">
            {dossierRows.map((row) => (
              <div key={row.label} className="border border-[#E2DFD7] bg-[#F6F5F2]/70 p-4">
                <p className="text-xs font-semibold tracking-[0.15em] text-[#77736A] uppercase">
                  {row.label}
                </p>
                <p className="mt-2 text-sm font-semibold text-[#161616]">{row.value}</p>
                <p className="mt-1 text-sm leading-6 text-[#5F5F5F]">{row.detail}</p>
              </div>
            ))}
          </div>
          <div className="grid gap-3 border-t border-[#D9D7D1] pt-5">
            {documentChecklist.map((item) => (
              <div key={item} className="flex items-center justify-between gap-4 text-sm">
                <span className="text-[#4F4F4B]">{item}</span>
                <span className="border border-[#33423C]/20 bg-[#E7E4DE] px-2 py-1 text-xs font-medium text-[#33423C]">
                  Attached
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function LenderCockpitSection() {
  return (
    <section
      id="lenders"
      className="scroll-mt-20 bg-[#111612] px-5 py-20 text-white sm:px-8 sm:py-24 lg:px-10"
    >
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <SectionIntro
          eyebrow="Lender review cockpit"
          title="Turn each request into a clear lending decision"
          description="Approved lenders see the request, borrower readiness, notes, and offer terms in a single review surface."
          dark
        />
        <div className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="border border-white/15 bg-white/[0.04] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.24)]">
            <div className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs tracking-[0.18em] text-[#AFA794] uppercase">
                  Application review
                </p>
                <h3 className="mt-3 text-2xl font-semibold text-white">PHP 40,000</h3>
                <p className="mt-2 text-sm leading-6 text-[#CFC8B9]">
                  Inventory expansion · Preferred term: 6 months
                </p>
              </div>
              <span className="w-fit border border-[#E6DDCB]/25 px-3 py-1 text-xs text-[#E6DDCB]">
                Profile verified
              </span>
            </div>
            <div className="mt-5 grid gap-3">
              {reviewRows.map((row) => (
                <div key={row.label} className="grid gap-2 border border-white/10 bg-[#16231A] p-4 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div>
                    <p className="text-sm font-semibold text-white">{row.label}</p>
                    <p className="mt-1 text-sm text-[#AFA794]">{row.detail}</p>
                  </div>
                  <p className="text-sm font-semibold text-[#F6F0DF]">{row.value}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              {["Review", "Offer", "Decline"].map((action, index) => (
                <span
                  key={action}
                  className={`border px-4 py-2 text-sm font-semibold ${
                    index === 1
                      ? "border-[#E6DDCB] bg-[#E6DDCB] text-[#0E1A12]"
                      : "border-white/15 text-[#E6DDCB]"
                  }`}
                >
                  {action}
                </span>
              ))}
            </div>
          </div>
          <div className="grid gap-4">
            <div className="border border-white/15 bg-[#17231A] p-5">
              <p className="text-xs tracking-[0.18em] text-[#AFA794] uppercase">
                Offer terms
              </p>
              <p className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-white">
                3.2%
              </p>
              <p className="mt-2 text-sm leading-6 text-[#CFC8B9]">
                Monthly rate proposal with clear borrower response state.
              </p>
            </div>
            <div className="border border-white/15 bg-white/[0.04] p-5">
              <p className="text-xs tracking-[0.18em] text-[#AFA794] uppercase">
                Decision notes
              </p>
              <div className="mt-4 grid gap-3 text-sm text-[#CFC8B9]">
                <p>Profile complete before submission.</p>
                <p>Documents attached for manager review.</p>
                <p>Offer remains pending borrower decision.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function RepaymentTimelineSection() {
  return (
    <section
      id="security"
      className="scroll-mt-20 bg-[#F6F5F2] px-5 py-20 sm:px-8 sm:py-24 lg:px-10"
    >
      <div className="mx-auto grid max-w-7xl gap-10">
        <div className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:items-end">
          <SectionIntro
            eyebrow="Repayment operations timeline"
            title="Track due dates, proof review, and remaining balance"
            description="Repayment work becomes a ledger of due amounts, uploaded proofs, manager review, lender confirmation, and balance movement."
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <SummaryTile label="Amount due" value="PHP 6,800" detail="Next scheduled payment" />
            <SummaryTile label="Remaining balance" value="PHP 27,200" detail="After confirmed repayment" />
          </div>
        </div>
        <div className="grid gap-5 lg:grid-cols-[1fr_0.42fr]">
          <div className="border border-[#D9D7D1] bg-[#FFFFFC]/78 p-5 shadow-[0_24px_80px_rgba(14,26,18,0.07)]">
            <div className="grid gap-4">
              {repaymentTimeline.map((item, index) => (
                <div key={item.label} className="grid gap-3 border-b border-[#E2DFD7] pb-4 last:border-b-0 last:pb-0 sm:grid-cols-[auto_1fr_auto] sm:items-center">
                  <span className="flex h-8 w-8 items-center justify-center border border-[#33423C]/20 bg-[#E7E4DE] text-sm font-semibold text-[#33423C]">
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-semibold text-[#161616]">{item.label}</p>
                    <p className="mt-1 text-sm text-[#5F5F5F]">{item.detail}</p>
                  </div>
                  <span className="w-fit border border-[#C7C4BC] px-3 py-1 text-xs font-medium text-[#55534F]">
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="grid gap-4">
            <div className="border border-[#D9D7D1] bg-[#111612] p-5 text-white">
              <p className="text-xs tracking-[0.18em] text-[#AFA794] uppercase">
                Proof review
              </p>
              <p className="mt-4 text-xl font-semibold">Receipt uploaded</p>
              <p className="mt-2 text-sm leading-6 text-[#CFC8B9]">
                Awaiting manager review before lender confirmation.
              </p>
            </div>
            <div className="border border-[#D9D7D1] bg-[#FFFFFC]/80 p-5">
              <p className="text-xs tracking-[0.18em] text-[#77736A] uppercase">
                Ledger state
              </p>
              <div className="mt-4 grid gap-3 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-[#5F5F5F]">Due date</span>
                  <span className="font-semibold text-[#161616]">Jun 15</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-[#5F5F5F]">Manager review</span>
                  <span className="font-semibold text-[#161616]">Queued</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-[#5F5F5F]">Lender confirmation</span>
                  <span className="font-semibold text-[#161616]">Pending</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function LayerSection() {
  return (
    <section
      id="managers"
      className="scroll-mt-20 border-y border-[#D9D7D1] bg-[#EFEDE7] px-5 py-20 sm:px-8 sm:py-24 lg:px-10"
    >
      <div className="mx-auto grid max-w-7xl gap-12">
        <div className="mx-auto grid max-w-3xl gap-4 text-center">
          <p className="text-xs font-semibold tracking-[0.2em] text-[#77736A] uppercase">
            Manager operations
          </p>
          <h2 className="text-balance text-4xl leading-tight font-semibold tracking-[-0.02em] sm:text-5xl">
            Coordinate users, approvals, offers, loans, proofs, and logs
          </h2>
          <p className="text-base leading-7 text-[#5F5F5F]">
            Manager views stay minimal, but the operating model connects each
            role to a trackable review path.
          </p>
        </div>
        <div className="grid gap-5 lg:grid-cols-[0.85fr_1.3fr_0.85fr] lg:items-center">
          <div className="grid gap-4">
            {layerCards.slice(0, 2).map((card, index) => (
              <RolePanel key={card.title} {...card} step={index + 1} />
            ))}
          </div>
          <div className="relative border border-[#D9D7D1] bg-[#FFFFFC]/82 p-5 shadow-[0_28px_90px_rgba(14,26,18,0.08)]">
            <div className="absolute top-1/2 left-[-2rem] hidden h-px w-8 bg-[#C7C4BC] lg:block" />
            <div className="absolute top-1/2 right-[-2rem] hidden h-px w-8 bg-[#C7C4BC] lg:block" />
            <div className="flex flex-col gap-4 border-b border-[#D9D7D1] pb-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold tracking-[0.18em] text-[#77736A] uppercase">
                  Operations board
                </p>
                <h3 className="mt-2 text-2xl font-semibold text-[#161616]">
                  Platform manager overview
                </h3>
              </div>
              <span className="w-fit border border-[#33423C]/20 bg-[#E7E4DE] px-3 py-1 text-xs font-semibold text-[#33423C]">
                Review queue
              </span>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {managerBoardItems.map((item) => (
                <div key={item.label} className="border border-[#E2DFD7] bg-[#F6F5F2]/75 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold text-[#161616]">{item.label}</p>
                    <span className="text-lg font-semibold tracking-[-0.03em] text-[#33423C]">
                      {item.count}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-[#5F5F5F]">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="grid gap-4">
            {layerCards.slice(2).map((card, index) => (
              <RolePanel key={card.title} {...card} step={index + 3} />
            ))}
            <div className="border border-[#D9D7D1] bg-[#111612] p-5 text-white">
              <p className="text-xs tracking-[0.18em] text-[#AFA794] uppercase">
                Audit trail
              </p>
              <p className="mt-3 text-sm leading-6 text-[#CFC8B9]">
                Workflow decisions remain attached to applications, offers,
                proofs, and user records.
              </p>
            </div>
          </div>
        </div>
        <div className="hidden grid-cols-6 border border-[#D9D7D1] bg-[#FFFFFC]/60 text-center text-xs font-semibold tracking-[0.14em] text-[#77736A] uppercase md:grid">
          {managerStages.map((stage) => (
            <span key={stage} className="border-r border-[#D9D7D1] px-3 py-4 last:border-r-0">
              {stage}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function RolePanel({
  label,
  title,
  description,
  step,
}: {
  label: string;
  title: string;
  description: string;
  step: number;
}) {
  return (
    <article className="border border-[#D9D7D1] bg-[#FFFFFC]/78 p-5 shadow-[0_18px_50px_rgba(14,26,18,0.05)]">
      <div className="flex items-center gap-3">
        <span className="flex h-8 w-8 items-center justify-center border border-[#33423C]/20 bg-[#E7E4DE] text-sm font-semibold text-[#33423C]">
          {step}
        </span>
        <p className="text-xs font-semibold tracking-[0.18em] text-[#77736A] uppercase">
          {label}
        </p>
      </div>
      <h3 className="mt-5 text-2xl font-semibold text-[#161616]">{title}</h3>
      <p className="mt-4 text-sm leading-6 text-[#5F5F5F]">{description}</p>
    </article>
  );
}

function SectionIntro({
  eyebrow,
  title,
  description,
  dark = false,
}: {
  eyebrow: string;
  title: string;
  description: string;
  dark?: boolean;
}) {
  return (
    <div className="grid gap-5">
      <p
        className={`text-xs font-semibold tracking-[0.2em] uppercase ${
          dark ? "text-[#C6BFAF]" : "text-[#77736A]"
        }`}
      >
        {eyebrow}
      </p>
      <h2
        className={`text-balance text-4xl leading-tight font-semibold tracking-[-0.02em] sm:text-5xl ${
          dark ? "text-white" : "text-[#161616]"
        }`}
      >
        {title}
      </h2>
      <p
        className={`max-w-xl text-base leading-7 ${
          dark ? "text-[#CFC8B9]" : "text-[#5F5F5F]"
        }`}
      >
        {description}
      </p>
    </div>
  );
}

function SummaryTile({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="border border-[#D9D7D1] bg-[#FFFFFC]/78 p-5 shadow-[0_18px_50px_rgba(14,26,18,0.05)]">
      <p className="text-xs font-semibold tracking-[0.16em] text-[#77736A] uppercase">
        {label}
      </p>
      <p className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-[#161616]">
        {value}
      </p>
      <p className="mt-2 text-sm text-[#5F5F5F]">{detail}</p>
    </article>
  );
}

function MetricsSection() {
  return (
    <section className="bg-[#F6F5F2] px-5 py-18 sm:px-8 sm:py-22 lg:px-10">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-center">
        <div className="grid gap-6">
          <div className="grid gap-4">
            <p className="text-xs font-semibold tracking-[0.2em] text-[#77736A] uppercase">
              Operating layer
            </p>
            <h2 className="max-w-3xl text-balance text-4xl leading-tight font-semibold tracking-[-0.02em] sm:text-5xl">
              One operating layer for borrower, lender, and manager workflows
            </h2>
            <p className="max-w-xl text-base leading-7 text-[#5F5F5F]">
              LendFolio keeps borrower profiles, lender decisions, manager
              approvals, repayment proofs, and audit logs connected in one
              structured operating layer.
            </p>
          </div>
          <div className="hidden border border-[#D9D7D1] bg-[#FFFFFC]/72 p-5 shadow-[0_18px_60px_rgba(14,26,18,0.05)] lg:block">
            <p className="text-xs font-semibold tracking-[0.16em] text-[#77736A] uppercase">
              Connected records
            </p>
            <div className="mt-5 grid gap-3">
              {["Profile", "Application", "Offer", "Proof", "Audit log"].map((item, index) => (
                <div key={item} className="flex items-center gap-3 text-sm">
                  <span className="flex h-7 w-7 items-center justify-center border border-[#33423C]/20 bg-[#E7E4DE] text-xs font-semibold text-[#33423C]">
                    {index + 1}
                  </span>
                  <span className="text-[#4F4F4B]">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="relative overflow-hidden border border-[#D9D7D1] bg-[#111612] p-4 text-white shadow-[0_30px_100px_rgba(14,26,18,0.18)] sm:p-6">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(246,245,242,0.07)_1px,transparent_1px),linear-gradient(to_bottom,rgba(246,245,242,0.07)_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-25" />
          <div className="relative grid gap-5">
            <div className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold tracking-[0.18em] text-[#AFA794] uppercase">
                  Workflow map
                </p>
                <h3 className="mt-2 text-2xl font-semibold text-white">
                  Role lanes stay connected
                </h3>
              </div>
              <span className="w-fit border border-[#E6DDCB]/25 bg-white/[0.04] px-3 py-1 text-xs font-semibold text-[#E6DDCB]">
                Structured flow
              </span>
            </div>

            <div className="relative grid gap-4">
              <div className="absolute top-[4.35rem] right-6 left-6 hidden h-px bg-[#E6DDCB]/20 md:block" />
              <div className="absolute top-[10.35rem] right-6 left-6 hidden h-px bg-[#E6DDCB]/14 md:block" />
              {operatingLanes.map((lane) => (
                <div
                  key={lane.role}
                  className="relative grid gap-3 border border-white/10 bg-[#17231A]/86 p-4 md:grid-cols-[8rem_1fr] md:items-center"
                >
                  <div>
                    <p className="text-xs font-semibold tracking-[0.16em] text-[#AFA794] uppercase">
                      {lane.role}
                    </p>
                    <p className="mt-2 text-sm text-[#CFC8B9]">{lane.summary}</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {lane.steps.map((step, index) => (
                      <div
                        key={step}
                        className="relative border border-[#E6DDCB]/18 bg-white/[0.045] p-3"
                      >
                        <span className="mb-3 flex h-7 w-7 items-center justify-center border border-[#E6DDCB]/24 bg-[#E6DDCB]/10 text-xs font-semibold text-[#F6F0DF]">
                          {index + 1}
                        </span>
                        <p className="text-sm font-semibold text-white">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {metrics.map((metric) => (
                <article
                  key={metric.value}
                  className="border border-[#E6DDCB]/16 bg-[#0E1A12]/76 p-4"
                >
                  <p className="text-4xl font-semibold tracking-[-0.05em] text-[#F6F0DF]">
                    {metric.value}
                  </p>
                  <p className="mt-3 text-[0.68rem] font-semibold tracking-[0.16em] text-[#AFA794] uppercase">
                    {metric.label}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="bg-[#0E1A12] px-5 py-20 text-white sm:px-8 sm:py-24 lg:px-10">
      <div className="mx-auto grid max-w-5xl place-items-center gap-7 text-center">
        <h2 className="text-balance text-4xl leading-tight font-semibold tracking-[-0.02em] sm:text-6xl">
          Add intelligence to every layer of your lending workflow
        </h2>
        <p className="max-w-2xl text-balance text-base leading-7 text-[#CFC8B9]">
          Start with borrower profiles, lender review, offers, and the manager
          oversight your team needs to keep decisions structured.
        </p>
        <Link
          href="/signup"
          className="inline-flex min-h-12 items-center justify-center border border-[#E6DDCB] bg-[#E6DDCB] px-6 text-sm font-semibold !text-[#0E1A12] transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E6DDCB]"
        >
          Create account
        </Link>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-[#D9D7D1] bg-[#F6F5F2] px-5 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 text-sm text-[#5F5F5F] sm:flex-row sm:items-center sm:justify-between">
        <p className="font-semibold tracking-[0.18em] text-[#161616] uppercase">
          LendFolio
        </p>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {navLinks.map((link) => (
            <a
              key={link}
              href={`#${link.toLowerCase()}`}
              className="transition-colors hover:text-[#161616] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#161616]"
            >
              {link}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}

type DataCardProps = {
  title: string;
  value: string;
  detail: string;
  status?: string;
  dark?: boolean;
};

function DataCard({ title, value, detail, status, dark = false }: DataCardProps) {
  return (
    <article
      className={`border p-5 ${
        dark
          ? "border-white/15 bg-white/[0.04] text-white"
          : "border-[#D9D7D1] bg-[#FFFFFC]/70 text-[#161616] shadow-[0_18px_60px_rgba(14,26,18,0.06)]"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <p
          className={`text-xs font-semibold tracking-[0.16em] uppercase ${
            dark ? "text-[#AFA794]" : "text-[#77736A]"
          }`}
        >
          {title}
        </p>
        {status ? (
          <span
            className={`shrink-0 border px-2 py-1 text-[0.68rem] font-medium ${
              dark
                ? "border-[#E6DDCB]/20 text-[#E6DDCB]"
                : "border-[#C7C4BC] text-[#55534F]"
            }`}
          >
            {status}
          </span>
        ) : null}
      </div>
      <p className="mt-5 text-3xl font-semibold tracking-[-0.03em]">{value}</p>
      <p
        className={`mt-4 text-sm leading-6 ${
          dark ? "text-[#CFC8B9]" : "text-[#5F5F5F]"
        }`}
      >
        {detail}
      </p>
      <div
        className={`mt-5 h-2 overflow-hidden border ${
          dark ? "border-white/10 bg-white/5" : "border-[#D9D7D1] bg-[#E7E4DE]"
        }`}
      >
        <div
          className={`h-full w-2/3 ${dark ? "bg-[#E6DDCB]" : "bg-[#33423C]"}`}
        />
      </div>
    </article>
  );
}

const navLinks = ["Product", "Borrowers", "Lenders", "Managers", "Security"];

const heroCards = [
  {
    label: "Application status",
    value: "Ready",
    position: "top-12 left-0",
    depth: "hero-card-1",
    status: "Profile locked",
  },
  {
    label: "Credit limit",
    value: "PHP 40,000",
    position: "top-14 right-0",
    depth: "hero-card-2",
    status: "Capacity checked",
  },
  {
    label: "Repayment proof",
    value: "Pending review",
    position: "bottom-20 left-8",
    depth: "hero-card-3",
    status: "Manager queue",
  },
  {
    label: "Risk notes",
    value: "Verified profile",
    position: "right-8 bottom-22",
    depth: "hero-card-4",
    status: "Lender ready",
  },
];

const workflowNodes = [
  { label: "Borrower", position: "top-[48%] left-[22%]" },
  { label: "Lender", position: "top-[26%] left-[50%]" },
  { label: "Manager", position: "top-[48%] right-[22%]" },
  { label: "Proof", position: "bottom-[24%] left-[50%]" },
];

const workflowLabels = [
  "Borrower profiles",
  "Lender review",
  "Manager approvals",
  "Offers",
  "Repayments",
  "Proofs",
];

const decisionRows = [
  {
    name: "Sari-sari store expansion",
    detail: "Profile complete, documents attached",
    status: "Under review",
    amount: "PHP 40,000",
  },
  {
    name: "Food cart inventory",
    detail: "Offer terms awaiting borrower response",
    status: "Offer sent",
    amount: "PHP 28,000",
  },
  {
    name: "Market stall repairs",
    detail: "Manager verification required",
    status: "Approval",
    amount: "PHP 18,500",
  },
];

const intelligenceCards = [
  {
    title: "Offer quality",
    value: "1 accepted",
    detail: "One borrower decision closes competing pending offers.",
    status: "Atomic",
  },
  {
    title: "Proof review",
    value: "4 types",
    detail: "Repayment records can move through manager and lender checks.",
    status: "Tracked",
  },
];

const dossierRows = [
  {
    label: "Credit readiness",
    value: "Prepared",
    detail: "Limit context and cash flow notes are available before review.",
  },
  {
    label: "Application ready",
    value: "Submitted",
    detail: "Requested amount, purpose, and term are linked to the profile.",
  },
  {
    label: "Verification notes",
    value: "Reviewable",
    detail: "Manager and lender checks can stay attached to the file.",
  },
  {
    label: "Documents attached",
    value: "Complete",
    detail: "Proof files remain connected to the borrower record.",
  },
];

const documentChecklist = [
  "Business permit",
  "Valid ID",
  "Proof of revenue",
  "Application remarks",
];

const reviewRows = [
  {
    label: "Borrower profile",
    detail: "Business profile saved before submission",
    value: "Complete",
  },
  {
    label: "Requested purpose",
    detail: "Additional sari-sari store inventory",
    value: "Expansion",
  },
  {
    label: "Offer status",
    detail: "Borrower can accept one pending offer",
    value: "Pending",
  },
];

const repaymentTimeline = [
  {
    label: "Due date",
    detail: "Payment scheduled against the active loan record.",
    status: "Jun 15",
  },
  {
    label: "Amount due",
    detail: "Borrower sees the next repayment amount clearly.",
    status: "PHP 6,800",
  },
  {
    label: "Proof uploaded",
    detail: "Receipt is attached for manager and lender review.",
    status: "Uploaded",
  },
  {
    label: "Manager review",
    detail: "Operations can verify proof before confirmation.",
    status: "Queued",
  },
  {
    label: "Lender confirmation",
    detail: "Confirmation closes the repayment checkpoint.",
    status: "Pending",
  },
];

const managerBoardItems = [
  {
    label: "Lender submissions",
    count: "3",
    detail: "Organizations waiting for approval or verification.",
  },
  {
    label: "Borrower applications",
    count: "8",
    detail: "Submitted requests moving through review.",
  },
  {
    label: "Offers",
    count: "5",
    detail: "Pending, accepted, and closed offer records.",
  },
  {
    label: "Loans",
    count: "2",
    detail: "Accepted offers ready for servicing workflows.",
  },
  {
    label: "Repayment proofs",
    count: "4",
    detail: "Uploads queued for manager and lender checks.",
  },
  {
    label: "Logs",
    count: "12",
    detail: "Workflow transitions kept in the audit trail.",
  },
];

const managerStages = [
  "Users",
  "Lenders",
  "Applications",
  "Offers",
  "Proofs",
  "Logs",
];

const operatingLanes = [
  {
    role: "Borrower",
    summary: "Preparation",
    steps: ["Profile", "Application", "Proof"],
  },
  {
    role: "Lender",
    summary: "Decision",
    steps: ["Review", "Offer", "Confirm"],
  },
  {
    role: "Manager",
    summary: "Oversight",
    steps: ["Approve", "Monitor", "Audit"],
  },
];

const layerCards = [
  {
    label: "Borrowers",
    title: "Prepare and respond",
    description:
      "Prepare profile, submit applications, review offers, and upload repayment proof from one borrower workspace.",
  },
  {
    label: "Lenders",
    title: "Review and offer",
    description:
      "Complete onboarding, review verified requests, and send structured offers with clear borrower context.",
  },
  {
    label: "Managers",
    title: "Oversee the flow",
    description:
      "Approve lenders, review users, monitor applications, offers, loans, logs, and proofs across the platform.",
  },
];

const metrics = [
  { value: "3", label: "workspaces" },
  { value: "6", label: "review stages" },
  { value: "4", label: "proof types" },
  { value: "1", label: "structured lending flow" },
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
