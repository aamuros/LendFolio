import Link from "next/link";
import { redirect, RedirectType } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { getCurrentUserProfile } from "@/lib/access-control";
import { getRouteForRole } from "@/lib/app-roles";
import { isApprovedLender } from "@/lib/role-rules";

type HomeProps = {
  searchParams?: Promise<{
    auth?: string;
  }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;

  const access = await getCurrentUserProfile();
  if (access.ok && access.profile.status === "active") {
    redirect(getRouteForRole(access.profile.role), RedirectType.replace);
  }

  const authMessage = getAuthMessage(params?.auth);

  let lenderPendingMessage = "";
  if (
    access.ok &&
    access.profile.role === "lender" &&
    !isApprovedLender(access.profile) &&
    access.profile.lenderProfile?.verification_status === "pending"
  ) {
    lenderPendingMessage =
      "Your lender profile is under review. Upload the required verification documents so a manager can complete approval.";
  }

  const statusMessage = lenderPendingMessage || authMessage;

  return (
    <main className="min-h-svh bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="text-xs font-semibold tracking-[0.18em] uppercase"
          >
            LENDFOLIO
          </Link>
          <nav className="flex items-center gap-2">
            <Link
              href="/signup"
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
            >
              Create account
            </Link>
            <Link
              href="/login"
              className={cn(buttonVariants({ size: "sm" }))}
            >
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      <section>
        <div className="mx-auto max-w-3xl px-4 pt-16 pb-12 text-center sm:px-6 sm:pt-20 sm:pb-14 lg:px-8 lg:pt-24 lg:pb-16">
          {statusMessage ? (
            <p
              className="mx-auto max-w-xl border-l-2 border-foreground bg-muted/50 px-4 py-3 text-left text-sm leading-6 text-muted-foreground"
              role="status"
            >
              {statusMessage}
              {lenderPendingMessage ? (
                <>
                  {" "}
                  <Link
                    href="/lender"
                    className="font-medium text-foreground underline underline-offset-2"
                  >
                    Go to lender workspace
                  </Link>
                </>
              ) : null}
            </p>
          ) : null}
          <Badge
            variant="outline"
            className="mx-auto mt-4 w-fit text-xs font-medium"
          >
            Borrower · Lender · Manager workflows
          </Badge>
          <h1 className="mt-5 text-3xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-4xl lg:text-5xl">
            Lending workflows for borrowers, lenders, and managers.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
            LendFolio keeps borrower profiles, verification documents, lender
            offers, approvals, and repayment proof organized in one traceable
            workflow.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link
              href="/signup"
              className={cn(buttonVariants({ size: "lg" }))}
            >
              Create account
            </Link>
            <Link
              href="/login"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" })
              )}
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
          <p className="mb-6 text-center text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase sm:text-left">
            How it works
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:gap-0">
            {workflowSteps.map((step, index) => (
              <div
                key={step.title}
                className="relative flex-1 sm:pr-5"
              >
                <div className="grid gap-1">
                  <span className="text-xs font-medium tabular-nums text-muted-foreground/60">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <p className="text-sm font-medium">{step.title}</p>
                  <p className="text-sm leading-5 text-muted-foreground">
                    {step.description}
                  </p>
                </div>
                {index < workflowSteps.length - 1 && (
                  <>
                    <div className="mt-3 block border-t border-border/60 sm:hidden" />
                    <div
                      aria-hidden
                      className="absolute right-0 top-1.5 hidden h-px w-5 bg-border/60 sm:block"
                    />
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
          <p className="mb-6 text-center text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase sm:text-left">
            Built for every role
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {audiences.map((audience) => (
              <Card key={audience.title}>
                <CardContent className="grid gap-3 p-5 sm:p-6">
                  <div className="grid gap-1">
                    <p className="text-sm font-medium">{audience.title}</p>
                    <p className="text-sm leading-5 text-muted-foreground">
                      {audience.description}
                    </p>
                  </div>
                  <ul className="grid gap-1.5">
                    {audience.capabilities.map((cap) => (
                      <li
                        key={cap.label}
                        className="flex items-center gap-2 text-sm text-muted-foreground"
                      >
                        <span className="inline-block h-1 w-1 shrink-0 rounded-full bg-muted-foreground/40" />
                        {cap.label}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-border/60">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-3">
              <p className="text-xs font-semibold tracking-[0.18em] uppercase">
                LENDFOLIO
              </p>
              <Separator orientation="vertical" className="hidden h-4 sm:block" />
              <p className="text-xs text-muted-foreground">
                Verified lending workflows for borrowers, lenders, and managers.
              </p>
            </div>
            <nav className="flex items-center gap-4">
              <Link
                href="/terms?from=home"
                className="text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                Terms
              </Link>
              <Link
                href="/privacy?from=home"
                className="text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                Privacy
              </Link>
              <Link
                href="/signup"
                className="text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                Create account
              </Link>
              <Link
                href="/login"
                className="text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                Sign in
              </Link>
            </nav>
          </div>
          <p className="mt-6 text-center text-[11px] text-muted-foreground sm:text-left">
            &copy; 2026 LendFolio. All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  );
}

const workflowSteps = [
  {
    title: "Verify profile",
    description: "Verify identity and business documents.",
  },
  {
    title: "Request financing",
    description: "Submit a financing request.",
  },
  {
    title: "Review offers",
    description: "Compare lender terms.",
  },
  {
    title: "Approve terms",
    description: "Accept one offer to proceed.",
  },
  {
    title: "Track repayment",
    description: "Upload proof and monitor status.",
  },
];

const audiences = [
  {
    title: "Borrowers",
    description:
      "Create a verified profile, upload required documents, and submit financing requests.",
    capabilities: [
      { label: "Business profile" },
      { label: "Document checklist" },
      { label: "Financing requests" },
    ],
  },
  {
    title: "Lenders",
    description:
      "Review borrower requests, submit offers, and monitor repayment evidence.",
    capabilities: [
      { label: "Request review" },
      { label: "Offer terms" },
      { label: "Repayment proof" },
    ],
  },
  {
    title: "Managers",
    description:
      "Review approvals, handle exceptions, and keep the lending process traceable.",
    capabilities: [
      { label: "Approval gates" },
      { label: "Review status" },
      { label: "Audit trail" },
    ],
  },
];

function getAuthMessage(auth?: string) {
  if (auth === "unknown") {
    return "Your account is signed in, but it does not have access to a workspace yet.";
  }

  if (auth === "lender-pending") {
    return "Your lender profile is under review. Upload the required verification documents so a manager can complete approval.";
  }

  if (auth === "access") {
    return "Your account does not have access to this workspace.";
  }

  return "";
}
