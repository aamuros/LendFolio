import Link from "next/link";
import { redirect } from "next/navigation";
import { signOutAction } from "@/app/login/actions";
import { LenderBottomTabs, LenderHeader } from "@/components/lender-bottom-tabs";
import {
  formatCurrency,
  formatDate,
  LenderApplicationsStatus,
} from "@/components/lender-applications-list";
import { ConsentAcceptancePanel } from "@/components/consent-acceptance-panel";
import { getCurrentUserProfile } from "@/lib/access-control";
import {
  buildConsentStatus,
  type UserConsentRecord,
} from "@/lib/consents";
import type { createSupabaseServerClient } from "@/lib/supabase/server";
import { LenderRepaymentProofActions } from "@/components/lender-repayment-proof-actions";
import {
  loadLenderOffers,
  loadOpenLenderApplications,
  type LenderApplicationReview,
  type LenderOfferReview,
} from "@/lib/lender-applications";
import { isApprovedLender } from "@/lib/role-rules";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ToneBadge } from "@/components/borrower-status-badge";
import { CollapsibleSection } from "@/components/lender-collapsible-section";
import { SummaryRow } from "@/components/borrower/ui/summary-row";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type LenderPageProps = {
  searchParams: Promise<{ message?: string; tab?: string }>;
};

export default async function LenderPage({ searchParams }: LenderPageProps) {
  const { message, tab } = await searchParams;

  if (message === "signed-in") {
    redirect("/lender");
  }

  const activeTab = tab === "offers" || tab === "account" ? tab : "home";
  const access = await getCurrentUserProfile();

  if (!access.ok) {
    return (
      <main className="min-h-svh px-5 pt-4 pb-32 sm:px-8 sm:pt-6 sm:pb-8">
        <div className="mx-auto grid max-w-4xl gap-5">
          <LenderHeader activeTab={activeTab} showAccountLink={false} showNotifications={false} />
          <LenderApplicationsStatus message={access.message} tone="error" />
          <LenderBottomTabs activeTab={activeTab} />
        </div>
      </main>
    );
  }

  if (!isApprovedLender(access.profile)) {
    const lenderConsentStatus = buildConsentStatus(
      "lender_review",
      await loadUserConsents(access.supabase, access.profile.id),
    );
    const message =
      access.profile.role === "lender" &&
      access.profile.lenderProfile?.verification_status === "pending"
        ? "Your lender access is pending review. You will be able to continue when your account is approved."
        : access.profile.role === "lender" &&
            access.profile.lenderProfile?.verification_status === "rejected"
          ? "Your lender access was not approved."
          : "Your account does not have access to this workspace.";

    return (
      <main className="min-h-svh px-5 pt-4 pb-32 sm:px-8 sm:pt-6 sm:pb-8">
        <div className="mx-auto grid max-w-4xl gap-5">
          <LenderHeader activeTab={activeTab} showAccountLink={false} showNotifications={false} />
          <LenderApplicationsStatus message={message} tone="error" />
          {access.profile.role === "lender" ? (
            <ConsentAcceptancePanel
              scope="lender_review"
              status={lenderConsentStatus}
            />
          ) : null}
          <LenderBottomTabs activeTab={activeTab} />
        </div>
      </main>
    );
  }

  const [
    applicationsResult,
    offersResult,
    {
      data: { user },
    },
  ] = await Promise.all([
    loadOpenLenderApplications(access),
    loadLenderOffers(access),
    access.supabase.auth.getUser(),
  ]);
  const applications = applicationsResult.ok ? applicationsResult.applications : [];
  const offers = offersResult.ok ? offersResult.offers : [];

  return (
    <main className="min-h-svh px-5 pt-4 pb-32 sm:px-8 sm:pt-6 sm:pb-8">
      <div className="mx-auto grid max-w-4xl gap-5">
        <LenderHeader activeTab={activeTab} showAccountLink={activeTab !== "account"} />

        {activeTab === "home" ? (
          <HomeTab
            applications={applications}
            offers={offers}
            applicationsError={!applicationsResult.ok ? applicationsResult.message : ""}
            offersError={!offersResult.ok ? offersResult.message : ""}
          />
        ) : null}

        {activeTab === "offers" ? (
          <OffersTab offers={offers} error={!offersResult.ok ? offersResult.message : ""} />
        ) : null}

        {activeTab === "account" ? (
          <AccountTab email={user?.email ?? ""} access={access.profile} />
        ) : null}

        <LenderBottomTabs activeTab={activeTab} />
      </div>
    </main>
  );
}

async function loadUserConsents(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
): Promise<UserConsentRecord[]> {
  const { data, error } = await supabase
    .from("user_consents")
    .select("consent_type, version, accepted_at")
    .eq("user_id", userId)
    .order("accepted_at", { ascending: false });

  if (error) {
    return [];
  }

  return data.map((consent) => ({
    consentType: consent.consent_type,
    version: consent.version,
    acceptedAt: consent.accepted_at,
  }));
}

function HomeTab({
  applications,
  offers,
  applicationsError,
  offersError,
}: {
  applications: LenderApplicationReview[];
  offers: LenderOfferReview[];
  applicationsError: string;
  offersError: string;
}) {
  const needsReviewCount = applications.filter(
    (application) => application.currentLenderOfferState === "not_offered",
  ).length;
  const pendingOffers = offers.filter((offer) => offer.status === "pending").length;
  const acceptedOffers = offers.filter((offer) => offer.status === "accepted").length;
  const activeLoans = offers.filter((offer) => offer.activeLoan).length;
  const repaymentProofsNeedingReview = offers.reduce(
    (count, offer) =>
      count +
      (offer.activeLoan?.schedule.filter(
        (repayment) => repayment.latestProof?.status === "submitted",
      ).length ?? 0),
    0,
  );
  const nextAction =
    repaymentProofsNeedingReview > 0
      ? {
          title: `${repaymentProofsNeedingReview} repayment proof ${
            repaymentProofsNeedingReview === 1 ? "needs" : "need"
          } review`,
          description: "Review submitted proof before updating repayment status.",
          href: "/lender?tab=offers",
          label: "Review proof",
        }
      : needsReviewCount > 0
      ? {
          title: `${needsReviewCount} ${needsReviewCount === 1 ? "application needs" : "applications need"} review`,
          description: "Open the queue and review borrower context before sending terms.",
          href: "/lender/applications",
          label: "Review applications",
        }
      : pendingOffers > 0
        ? {
            title: "Offer sent",
            description: "Track pending borrower responses from your offers list.",
            href: "/lender?tab=offers",
            label: "View offers",
          }
        : acceptedOffers > 0
          ? {
              title: activeLoans > 0 ? "Active loan" : "Offer accepted",
              description:
                activeLoans > 0
                  ? "Accepted offers with active loans are ready to track."
                  : "Your accepted offers stay available for reference.",
              href: "/lender?tab=offers",
              label: activeLoans > 0 ? "View loans" : "View offers",
            }
          : {
              title: "No open applications",
              description: "New borrower requests will appear in your review queue.",
              href: "/lender/applications",
              label: "Open applications",
            };

  return (
    <section className="grid gap-4">
      <Card className="rounded-2xl border-border/50 shadow-sm">
        <CardContent className="grid gap-3 p-5">
          <p className="text-sm font-semibold text-muted-foreground">Today</p>
          <h1 className="text-3xl leading-tight font-semibold">
            {nextAction.title}
          </h1>
          <p className="text-sm leading-6 text-muted-foreground">
            {nextAction.description}
          </p>
          <Button asChild className="mt-1 h-11 w-full rounded-full font-semibold sm:w-fit">
            <Link href={nextAction.href}>{nextAction.label}</Link>
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-3">
        <SummaryCard label="New" value={needsReviewCount.toString()} />
        <SummaryCard label="Proofs" value={repaymentProofsNeedingReview.toString()} />
        <SummaryCard label="Active" value={activeLoans.toString()} />
      </div>

      {applicationsError ? (
        <LenderApplicationsStatus message={applicationsError} tone="error" />
      ) : null}
      {offersError ? <LenderApplicationsStatus message={offersError} tone="error" /> : null}
    </section>
  );
}

function OffersTab({
  offers,
  error,
}: {
  offers: LenderOfferReview[];
  error: string;
}) {
  const knownStatuses = new Set(["pending", "accepted", "declined", "expired"]);
  const groups = [
    { label: "Pending", offers: offers.filter((offer) => offer.status === "pending") },
    { label: "Accepted", offers: offers.filter((offer) => offer.status === "accepted") },
    { label: "Declined", offers: offers.filter((offer) => offer.status === "declined") },
    { label: "Expired", offers: offers.filter((offer) => offer.status === "expired") },
    {
      label: "Other",
      offers: offers.filter((offer) => !knownStatuses.has(offer.status)),
    },
  ];

  return (
    <section className="grid gap-4">
      <div className="grid gap-1">
        <h1 className="text-2xl leading-tight font-semibold">Offers</h1>
        <p className="text-sm leading-6 text-muted-foreground">
          Sent offers grouped by borrower response.
        </p>
      </div>

      {error ? <LenderApplicationsStatus message={error} tone="error" /> : null}

      {offers.length === 0 && !error ? (
        <Card className="rounded-2xl border-dashed border-border/50">
          <CardContent className="grid gap-2 p-5 text-center">
            <p className="text-lg font-semibold">No sent offers</p>
            <p className="text-sm leading-6 text-muted-foreground">
              Sent offers will appear here.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {groups.map((group) =>
        group.offers.length > 0 ? (
          <div key={group.label} className="grid gap-3">
            <h2 className="text-sm font-semibold text-muted-foreground">
              {group.label}
            </h2>
            {group.offers.map((offer) => (
              <OfferCard key={offer.id} offer={offer} />
            ))}
          </div>
        ) : null,
      )}
    </section>
  );
}

function AccountTab({
  email,
  access,
}: {
  email: string;
  access: {
    role: string;
    status: string;
    lenderProfile: {
      organization_name: string | null;
      verification_status: string;
    } | null;
  };
}) {
  const verificationStatus = access.lenderProfile?.verification_status ?? "pending";
  const verificationTone =
    verificationStatus === "approved"
      ? "success"
      : verificationStatus === "rejected"
        ? "danger"
        : "attention";

  return (
    <section className="grid gap-4">
      <div className="grid gap-1">
        <h1 className="text-2xl leading-tight font-semibold">Account</h1>
        <p className="break-words text-sm leading-6 text-muted-foreground">
          {email || "Signed in"}
        </p>
      </div>

      <Card className="rounded-2xl border-border/50 shadow-sm">
        <CardContent className="grid gap-0 p-4">
          <SummaryRow label="Role" value={access.role} />
          <SummaryRow label="Account status" value={access.status} />
          <SummaryRow
            label="Organization"
            value={access.lenderProfile?.organization_name ?? "Not provided"}
          />
          <div className="flex items-center justify-between gap-4 border-b border-border/40 py-3">
            <p className="shrink-0 text-sm text-muted-foreground">Verification</p>
            <ToneBadge tone={verificationTone}>{verificationStatus}</ToneBadge>
          </div>
        </CardContent>
      </Card>

      <form action={signOutAction}>
        <Button
          type="submit"
          variant="outline"
          className="h-11 w-full rounded-full font-semibold sm:w-fit"
        >
          Sign out
        </Button>
      </form>
    </section>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="rounded-2xl border-border/50 shadow-sm">
      <CardContent className="p-4 text-center">
        <p className="text-2xl font-semibold">{value}</p>
        <p className="mt-1 text-xs font-semibold text-muted-foreground">
          {label}
        </p>
      </CardContent>
    </Card>
  );
}

function offerStatusTone(status: string) {
  switch (status) {
    case "pending":
      return "attention" as const;
    case "accepted":
      return "success" as const;
    case "declined":
      return "danger" as const;
    case "expired":
      return "neutral" as const;
    default:
      return "neutral" as const;
  }
}

function OfferCard({ offer }: { offer: LenderOfferReview }) {
  const isQuiet = offer.status !== "pending";
  const activeLoan = offer.activeLoan;
  const context = offer.application?.portfolio
    ? `${offer.application.portfolio.businessTypeLabel} in ${offer.application.portfolio.location}`
    : "Application context unavailable";

  return (
    <Card
      className={cn(
        "rounded-2xl border-border/50 shadow-sm",
        isQuiet && "opacity-75",
      )}
    >
      <CardContent className="grid gap-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="grid gap-1">
            <h3 className="font-semibold">{context}</h3>
            <p className="text-sm leading-6 text-muted-foreground">
              {offer.application?.purpose ?? "Offer sent"}
            </p>
          </div>
          <ToneBadge tone={offerStatusTone(offer.status)}>
            {offer.status}
          </ToneBadge>
        </div>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          {offer.application ? (
            <MiniMetric
              label="Requested"
              value={`PHP ${formatCurrency(offer.application.requestedAmount)}`}
            />
          ) : null}
          <MiniMetric
            label="Approved"
            value={`PHP ${formatCurrency(offer.approvedAmount)}`}
          />
          <MiniMetric
            label="Repayment"
            value={`PHP ${formatCurrency(offer.repaymentAmount)}`}
          />
          {offer.application ? (
            <MiniMetric label="Submitted" value={formatDate(offer.application.submittedAt)} />
          ) : null}
          <MiniMetric label="Due" value={formatDateOnly(offer.dueDate)} />
          <MiniMetric label="Sent" value={formatDate(offer.sentAt)} />
        </dl>
        {activeLoan ? (
          <div className="grid gap-3">
            <Separator />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-foreground">
                Active loan
              </p>
              <LoanStatusBadge status={activeLoan.status} />
            </div>
            <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <MiniMetric
                label="Principal"
                value={`PHP ${formatCurrency(activeLoan.principalAmount)}`}
              />
              <MiniMetric
                label="Repayment"
                value={`PHP ${formatCurrency(activeLoan.repaymentAmount)}`}
              />
              <MiniMetric
                label="Outstanding"
                value={`PHP ${formatCurrency(activeLoan.outstandingBalance)}`}
              />
              <MiniMetric label="Due" value={formatDateOnly(activeLoan.dueDate)} />
            </dl>
            {activeLoan.schedule.length > 0 ? (
              <CollapsibleSection triggerLabel="Repayment schedule">
                <Card className="rounded-xl bg-muted/30">
                  <CardContent className="grid gap-3 p-4">
                    {activeLoan.schedule.map((repayment) => {
                      const latestProof = repayment.latestProof;
                      const currentSubmittedProof =
                        latestProof?.status === "submitted" ? latestProof : null;

                      return (
                        <div
                          key={repayment.id}
                          className="grid gap-3 border-t border-border pt-3 first:border-t-0 first:pt-0"
                        >
                          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                            <MiniMetric
                              label="Installment"
                              value={`#${repayment.installmentNumber}`}
                            />
                            <MiniMetric
                              label="Amount due"
                              value={`PHP ${formatCurrency(repayment.amountDue)}`}
                            />
                            <MiniMetric
                              label="Due"
                              value={formatDateOnly(repayment.dueDate)}
                            />
                            <MiniMetric
                              label="Repayment"
                              value={formatRepaymentStatus(repayment.status)}
                            />
                            <MiniMetric
                              label="Proof"
                              value={
                                latestProof
                                  ? formatProofStatus(latestProof.status)
                                  : "Not submitted"
                              }
                            />
                          </dl>
                          {latestProof ? (
                            <ProofReviewState
                              proofStatus={latestProof.status}
                              reviewNotes={latestProof.reviewNotes}
                            />
                          ) : (
                            <p className="rounded-xl border border-border bg-card px-3 py-2 text-sm leading-6 text-muted-foreground">
                              Waiting for the borrower to upload proof for this installment.
                            </p>
                          )}
                          {repayment.proofs.length > 0 ? (
                            <CollapsibleSection triggerLabel="Proof attempts">
                              <LenderProofHistory
                                currentSubmittedProofId={currentSubmittedProof?.id ?? null}
                                proofs={repayment.proofs}
                              />
                            </CollapsibleSection>
                          ) : null}
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </CollapsibleSection>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function LoanStatusBadge({ status }: { status: string }) {
  const tone = status === "overdue" ? "danger" : "success";
  return <ToneBadge tone={tone}>{status}</ToneBadge>;
}

function LenderProofHistory({
  currentSubmittedProofId,
  proofs,
}: {
  currentSubmittedProofId: string | null;
  proofs: NonNullable<LenderOfferReview["activeLoan"]>["schedule"][number]["proofs"];
}) {
  return (
    <div className="grid gap-2">
      {proofs.map((proof) => (
        <div
          key={proof.id}
          className="grid gap-2 border-t border-border pt-3 first:border-t-0 first:pt-0"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="grid gap-1">
              <p className="break-words text-sm font-semibold">{proof.fileName}</p>
              <p className="text-xs leading-5 text-muted-foreground">
                Submitted {formatDate(proof.submittedAt)}
                {proof.reviewedAt ? ` · Reviewed ${formatDate(proof.reviewedAt)}` : ""}
              </p>
            </div>
            <ProofStatusBadge status={proof.status} />
          </div>
          {proof.reviewNotes ? (
            <p className="rounded-xl bg-muted/50 px-3 py-2 text-sm leading-6 text-muted-foreground">
              {proof.reviewNotes}
            </p>
          ) : null}
          {proof.id === currentSubmittedProofId ? (
            <LenderRepaymentProofActions
              proofId={proof.id}
              proofStatus={proof.status}
              proofUrl={proof.viewUrl}
            />
          ) : proof.viewUrl ? (
            <Button variant="outline" asChild className="h-10 w-full rounded-full font-semibold sm:w-fit">
              <a href={proof.viewUrl} target="_blank" rel="noreferrer">
                View proof
              </a>
            </Button>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function ProofReviewState({
  proofStatus,
  reviewNotes,
}: {
  proofStatus: string;
  reviewNotes: string | null;
}) {
  if (proofStatus === "submitted") {
    return (
      <p className="rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm leading-6 text-foreground">
        Review the submitted proof, then verify the repayment or reject it with a note.
      </p>
    );
  }

  if (proofStatus === "verified") {
    return (
      <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm leading-6 text-emerald-700">
        Proof verified. This installment is marked paid.
      </p>
    );
  }

  if (proofStatus === "rejected") {
    return (
      <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm leading-6 text-destructive">
        Proof rejected. The borrower can upload a corrected proof.
        {reviewNotes ? ` Note: ${reviewNotes}` : ""}
      </p>
    );
  }

  return null;
}

function ProofStatusBadge({ status }: { status: string }) {
  const tone =
    status === "rejected"
      ? "danger"
      : status === "verified"
        ? "success"
        : "neutral";

  return <ToneBadge tone={tone}>{formatProofStatus(status)}</ToneBadge>;
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 break-words font-semibold">{value}</dd>
    </div>
  );
}

function formatDateOnly(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
  }).format(new Date(`${value}T00:00:00`));
}

function formatProofStatus(status: string) {
  if (status === "submitted") {
    return "Waiting for review";
  }

  if (status === "verified") {
    return "Verified";
  }

  if (status === "rejected") {
    return "Rejected";
  }

  return status;
}

function formatRepaymentStatus(status: string) {
  if (status === "due") {
    return "Payment due";
  }

  if (status === "submitted") {
    return "Proof under review";
  }

  if (status === "verified") {
    return "Payment verified";
  }

  if (status === "rejected") {
    return "Needs corrected proof";
  }

  if (status === "late") {
    return "Payment overdue";
  }

  return status;
}
