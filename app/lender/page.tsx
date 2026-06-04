import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { LenderBottomTabs } from "@/components/lender-bottom-tabs";
import { LenderPageHeader } from "@/components/lender-page-header";
import {
  formatCurrency,
  formatDate,
  LenderApplicationsStatus,
} from "@/components/lender-applications-list";
import { LenderAccessPanel } from "@/components/lender/lender-access-panel";
import {
  buildConsentStatus,
} from "@/lib/consents";
import { loadUserConsents } from "@/lib/user-consents";
import { LenderRepaymentProofActions } from "@/components/lender-repayment-proof-actions";
import { ProofPreviewButton } from "@/app/lender/proof-preview-button";
import {
  isApplicationActionableForOffer,
  loadLenderOffers,
  loadOpenLenderApplications,
  type LenderApplicationReview,
  type LenderOfferReview,
} from "@/lib/lender-applications";
import { isApprovedLender } from "@/lib/role-rules";
import {
  getLenderVerificationDocuments,
  calculateLenderVerificationDocumentPolicy,
} from "@/lib/lender-verification";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ToneBadge } from "@/components/borrower-status-badge";
import { CollapsibleSection } from "@/components/lender-collapsible-section";
import { cn } from "@/lib/utils";
import { formatDateOnly } from "@/lib/manager-date-format";
import { LenderAccountTabWrapper } from "@/components/lender/profile/lender-account-tab-wrapper";
import { LenderOffersHighlighter } from "@/components/lender/lender-offers-highlighter";
import { getLenderAccess } from "@/lib/lender-access";

export const dynamic = "force-dynamic";

type LenderPageProps = {
  searchParams: Promise<{
    message?: string;
    tab?: string;
    offerId?: string;
    proofId?: string;
  }>;
};

export default async function LenderPage({ searchParams }: LenderPageProps) {
  const { message, tab, offerId, proofId } = await searchParams;

  if (message === "signed-in") {
    redirect("/lender");
  }

  const activeTab = tab === "offers" || tab === "account" ? tab : "home";
  const access = await getLenderAccess();

  if (!access.ok) {
    return (
      <main className="min-h-svh bg-background">
        <div className="mx-auto max-w-7xl">
          <LenderPageHeader activeTab={activeTab} showNotifications={false} />
        <div className="px-5 pt-6 pb-36 sm:px-8 sm:pt-10">
          <LenderApplicationsStatus message={access.message} tone="error" />
          </div>
          <div className="sm:hidden">
            <LenderBottomTabs activeTab={activeTab} />
          </div>
        </div>
      </main>
    );
  }

  if (!isApprovedLender(access.profile)) {
    if (
      access.profile.role === "lender" &&
      (access.profile.lenderProfile?.verification_status === "incomplete" ||
        !access.profile.lenderProfile)
    ) {
      redirect("/lender/onboarding");
    }

    let lenderConsentStatus = buildConsentStatus("lender_review", []);
    let pendingDocuments: Awaited<ReturnType<typeof getLenderVerificationDocuments>> = [];
    let pendingDocumentPolicy = calculateLenderVerificationDocumentPolicy([]);

    try {
      lenderConsentStatus = buildConsentStatus(
        "lender_review",
        await loadUserConsents(access.supabase, access.profile.id),
      );

      const pendingLenderProfileId = access.profile.lenderProfile?.id;
      if (pendingLenderProfileId) {
        pendingDocuments = await getLenderVerificationDocuments(
          access.supabase,
          pendingLenderProfileId,
          access.profile.id,
        );
        pendingDocumentPolicy =
          calculateLenderVerificationDocumentPolicy(pendingDocuments);
      }
    } catch {
      // Data loading failed; render with empty defaults so the page
      // still shows the pending-review panel instead of crashing.
    }

    return (
      <main className="min-h-svh bg-background">
        <div className="mx-auto max-w-7xl">
          <LenderPageHeader activeTab={activeTab} showNotifications={false} />
          <div className="px-5 pt-6 pb-36 sm:px-8 sm:pt-10">
            <LenderAccessPanel
              profile={access.profile}
              consentStatus={lenderConsentStatus}
              documents={pendingDocuments}
              documentPolicy={pendingDocumentPolicy}
            />
          </div>
          <div className="sm:hidden">
            <LenderBottomTabs activeTab={activeTab} />
          </div>
        </div>
      </main>
    );
  }

  let applications: LenderApplicationReview[] = [];
  let offers: LenderOfferReview[] = [];
  let applicationsError = "";
  let offersError = "";
  let user: { email?: string } | null = null;
  let lenderDocuments: Awaited<ReturnType<typeof getLenderVerificationDocuments>> = [];
  let lenderDocumentPolicy = calculateLenderVerificationDocumentPolicy([]);
  let lenderChangeRequests: Array<{
    id: string;
    proposedOrganizationName: string | null;
    proposedContactPerson: string | null;
    proposedBusinessAddress: string | null;
    proposedOperatingArea: string | null;
    proposedBusinessRegistrationNumber: string | null;
    proposedMinLoanAmount: number | null;
    proposedMaxLoanAmount: number | null;
    proposedTypicalRepaymentTerms: string | null;
    proposedLenderDescription: string | null;
    status: string;
    submittedAt: string;
    reviewedAt: string | null;
    managerReviewNotes: string | null;
    rejectionReason: string | null;
  }> = [];

  if (activeTab === "home") {
    const [applicationsResult, offersResult] = await Promise.all([
      loadOpenLenderApplications(access),
      loadLenderOffers(access),
    ]);
    applications = applicationsResult.ok ? applicationsResult.applications : [];
    offers = offersResult.ok ? offersResult.offers : [];
    applicationsError = !applicationsResult.ok ? applicationsResult.message : "";
    offersError = !offersResult.ok ? offersResult.message : "";
  } else if (activeTab === "offers") {
    const offersResult = await loadLenderOffers(access);
    offers = offersResult.ok ? offersResult.offers : [];
    offersError = !offersResult.ok ? offersResult.message : "";
  } else if (activeTab === "account") {
    const { data } = await access.supabase.auth.getUser();
    user = data.user;

    const lenderProfileId = access.profile.lenderProfile?.id;
    if (lenderProfileId) {
      const [docs, changeReqResult] = await Promise.all([
        getLenderVerificationDocuments(access.supabase, lenderProfileId, access.profile.id),
        access.supabase
          .from("lender_profile_change_requests")
          .select("id, proposed_organization_name, proposed_contact_person, proposed_business_address, proposed_operating_area, proposed_business_registration_number, proposed_min_loan_amount, proposed_max_loan_amount, proposed_typical_repayment_terms, proposed_lender_description, status, submitted_at, reviewed_at, manager_review_notes, rejection_reason")
          .eq("lender_profile_id", lenderProfileId)
          .order("submitted_at", { ascending: false }),
      ]);
      lenderDocuments = docs;
      lenderDocumentPolicy = calculateLenderVerificationDocumentPolicy(docs);
      lenderChangeRequests = (changeReqResult.data ?? []).map((r) => ({
        id: r.id,
        proposedOrganizationName: r.proposed_organization_name,
        proposedContactPerson: r.proposed_contact_person,
        proposedBusinessAddress: r.proposed_business_address,
        proposedOperatingArea: r.proposed_operating_area,
        proposedBusinessRegistrationNumber: r.proposed_business_registration_number,
        proposedMinLoanAmount: r.proposed_min_loan_amount,
        proposedMaxLoanAmount: r.proposed_max_loan_amount,
        proposedTypicalRepaymentTerms: r.proposed_typical_repayment_terms,
        proposedLenderDescription: r.proposed_lender_description,
        status: r.status,
        submittedAt: r.submitted_at,
        reviewedAt: r.reviewed_at,
        managerReviewNotes: r.manager_review_notes,
        rejectionReason: r.rejection_reason,
      }));
    }
  }

  return (
    <main className="min-h-svh bg-background">
      <div className="mx-auto max-w-7xl">
        <LenderPageHeader activeTab={activeTab} />

        <div className="px-5 pt-6 pb-36 sm:px-8 sm:pt-10">
          {activeTab === "home" ? (
            <HomeTab
              applications={applications}
              offers={offers}
              applicationsError={applicationsError}
              offersError={offersError}
            />
          ) : null}

          {activeTab === "offers" ? (
            <OffersTab
              offers={offers}
              error={offersError}
              highlightOfferId={offerId ?? null}
              highlightProofId={proofId ?? null}
            />
          ) : null}

          {activeTab === "account" ? (
            <LenderAccountTabWrapper
              email={user?.email ?? ""}
              lenderProfile={access.profile.lenderProfile}
              documents={lenderDocuments}
              documentPolicy={lenderDocumentPolicy}
              changeRequests={lenderChangeRequests}
            />
          ) : null}
        </div>

        <div className="sm:hidden">
          <LenderBottomTabs activeTab={activeTab} />
        </div>
      </div>
    </main>
  );
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
  const actionableApplications = applications.filter(
    isApplicationActionableForOffer,
  );
  const needsReviewCount = actionableApplications.length;
  const pendingOffers = offers.filter((offer) => offer.status === "pending").length;
  const acceptedOffers = offers.filter((offer) => offer.status === "accepted").length;
  const declinedOffers = offers.filter((offer) => offer.status === "declined").length;
  const expiredOffers = offers.filter((offer) => offer.status === "expired").length;
  const activeLoans = offers.filter((offer) => offer.activeLoan).length;
  const repaymentProofsNeedingReview = offers.reduce(
    (count, offer) =>
      count +
      (offer.activeLoan?.schedule.filter(
        (repayment) => repayment.latestProof?.status === "submitted",
      ).length ?? 0),
    0,
  );

  const primaryAction =
    repaymentProofsNeedingReview > 0
      ? {
          title: "Review repayment proofs",
          description: `${repaymentProofsNeedingReview} submitted proof${repaymentProofsNeedingReview === 1 ? "" : "s"} awaiting your review.`,
          href: "/lender?tab=offers" as const,
          count: repaymentProofsNeedingReview,
        }
      : needsReviewCount > 0
        ? {
            title: "Review applications",
            description: `${needsReviewCount} borrower ${needsReviewCount === 1 ? "request needs" : "requests need"} your review before sending terms.`,
            href: "/lender/applications" as const,
            count: needsReviewCount,
          }
        : pendingOffers > 0
          ? {
              title: "Awaiting borrower response",
              description: `${pendingOffers} pending offer${pendingOffers === 1 ? "" : "s"} sent. Track responses from your offers list.`,
              href: "/lender?tab=offers" as const,
              count: pendingOffers,
            }
          : activeLoans > 0
            ? {
                title: "Active loans",
                description: "Accepted offers with active loans are ready to track.",
                href: "/lender?tab=offers" as const,
                count: activeLoans,
              }
            : null;

  const topApplications = actionableApplications.slice(0, 3);

  return (
    <section className="grid gap-5">
      <div className="grid gap-1">
        <h1 className="text-xl leading-tight font-semibold sm:text-2xl">Home</h1>
        <p className="text-sm text-muted-foreground">
          Review queue and portfolio overview.
        </p>
      </div>

      {applicationsError ? (
        <LenderApplicationsStatus message={applicationsError} tone="error" />
      ) : null}
      {offersError ? <LenderApplicationsStatus message={offersError} tone="error" /> : null}

      <div className="grid gap-4 lg:grid-cols-12">
        <Card className="col-span-12 rounded-2xl border-border/50 shadow-sm lg:col-span-8">
          <CardContent className="flex flex-1 flex-col gap-1 p-4 sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Next action
            </p>
            {primaryAction ? (
              <Button asChild variant="ghost" className="h-auto justify-between gap-3 rounded-xl px-3 py-3">
                <Link href={primaryAction.href}>
                  <span className="grid gap-0.5 text-left">
                    <span className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{primaryAction.title}</span>
                      {primaryAction.count > 0 ? (
                        <Badge variant="secondary" className="text-[10px] font-semibold">
                          {primaryAction.count}
                        </Badge>
                      ) : null}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {primaryAction.description}
                    </span>
                  </span>
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              </Button>
            ) : (
              <div className="grid gap-2 py-2">
                <p className="text-sm font-semibold">No open applications</p>
                <p className="text-xs text-muted-foreground">
                  New borrower requests will appear in your review queue.
                </p>
                <Button asChild variant="ghost" className="h-auto w-full justify-between gap-3 rounded-xl px-3 py-2.5 sm:w-fit">
                  <Link href="/lender/applications">
                    Open applications
                    <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-12 rounded-2xl border-border/50 shadow-sm lg:col-span-4">
          <CardContent className="flex flex-1 flex-col gap-2 p-4 sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Overview
            </p>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Applications</span>
                <span className="font-semibold">{needsReviewCount}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Offers sent</span>
                <span className="font-semibold">{offers.length}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Active loans</span>
                <span className="font-semibold">{activeLoans}</span>
              </div>
              {repaymentProofsNeedingReview > 0 ? (
                <>
                  <Separator />
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Proofs to review</span>
                    <span className="font-semibold">{repaymentProofsNeedingReview}</span>
                  </div>
                </>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-12 rounded-2xl border-border/50 shadow-sm lg:col-span-8">
          <CardContent className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Applications needing review
              </p>
              {needsReviewCount > 0 ? (
                <Badge variant="secondary" className="text-[10px] font-semibold">
                  {needsReviewCount}
                </Badge>
              ) : null}
            </div>
            {topApplications.length > 0 ? (
              <div className="flex flex-1 flex-col gap-0">
                {topApplications.map((app, index) => {
                  const context = app.portfolio
                    ? `${app.portfolio.businessTypeLabel} in ${app.portfolio.location}`
                    : "Application";
                  return (
                    <div key={app.id}>
                      {index > 0 ? <Separator /> : null}
                      <Button
                        asChild
                        variant="ghost"
                        className="h-auto w-full justify-between gap-3 rounded-none px-1 py-3"
                      >
                        <Link href={`/lender/applications/${app.id}`}>
                          <span className="grid min-w-0 gap-0.5 text-left">
                            <span className="text-sm font-semibold">{context}</span>
                            <span className="text-xs text-muted-foreground line-clamp-1">
                              {app.purpose ?? "No purpose stated"}
                            </span>
                          </span>
                          <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                        </Link>
                      </Button>
                    </div>
                  );
                })}
                {needsReviewCount > 3 ? (
                  <Button asChild variant="ghost" size="sm" className="mt-auto h-auto justify-between rounded-lg px-3 py-2 text-xs font-semibold">
                    <Link href="/lender/applications">
                      View all {needsReviewCount} applications
                      <ArrowRight className="size-3.5" />
                    </Link>
                  </Button>
                ) : null}
              </div>
            ) : (
              <div className="flex flex-1 items-center">
                <p className="text-xs text-muted-foreground">
                  No applications currently awaiting your review.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-12 rounded-2xl border-border/50 shadow-sm lg:col-span-4">
          <CardContent className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Offers &amp; loans
            </p>
            {offers.length > 0 ? (
              <div className="flex flex-col gap-1.5">
                {pendingOffers > 0 ? (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Pending</span>
                    <span className="font-semibold">{pendingOffers}</span>
                  </div>
                ) : null}
                {acceptedOffers > 0 ? (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Accepted</span>
                    <span className="font-semibold">{acceptedOffers}</span>
                  </div>
                ) : null}
                {declinedOffers > 0 ? (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Declined</span>
                    <span className="font-semibold">{declinedOffers}</span>
                  </div>
                ) : null}
                {expiredOffers > 0 ? (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Expired</span>
                    <span className="font-semibold">{expiredOffers}</span>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No offers sent yet.</p>
            )}
            <Button asChild variant="ghost" size="sm" className="mt-auto h-auto justify-between rounded-lg px-3 py-2 text-xs font-semibold">
              <Link href="/lender?tab=offers">
                View all offers
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function OffersTab({
  offers,
  error,
  highlightOfferId,
  highlightProofId,
}: {
  offers: LenderOfferReview[];
  error: string;
  highlightOfferId: string | null;
  highlightProofId: string | null;
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

  let resolvedHighlightOfferId = highlightOfferId;

  if (highlightProofId && !resolvedHighlightOfferId) {
    for (const offer of offers) {
      const schedule = offer.activeLoan?.schedule;
      if (schedule?.some((repayment) => repayment.proofs.some((proof) => proof.id === highlightProofId))) {
        resolvedHighlightOfferId = offer.id;
        break;
      }
    }
  }

  return (
    <section className="grid gap-5">
      <div className="grid gap-1">
        <h1 className="text-xl font-semibold sm:text-2xl">Offers</h1>
        <p className="text-sm text-muted-foreground">
          Sent offers grouped by borrower response.
        </p>
      </div>

      {error ? <LenderApplicationsStatus message={error} tone="error" /> : null}

      {offers.length === 0 && !error ? (
        <Card className="rounded-2xl border-dashed border-border/50">
          <CardContent className="grid gap-2 p-5 text-center">
            <p className="text-lg font-semibold">No sent offers</p>
            <p className="text-sm text-muted-foreground">
              Sent offers will appear here.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {groups.map((group) =>
        group.offers.length > 0 ? (
          <div key={group.label} className="grid gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {group.label}
            </h2>
            {group.offers.map((offer) => (
              <div key={offer.id} id={`offer-${offer.id}`}>
                <OfferCard
                  offer={offer}
                  isHighlighted={offer.id === resolvedHighlightOfferId}
                />
              </div>
            ))}
          </div>
        ) : null,
      )}

      {resolvedHighlightOfferId ? (
        <LenderOffersHighlighter highlightOfferId={resolvedHighlightOfferId} />
      ) : null}
    </section>
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

function OfferCard({ offer, isHighlighted = false }: { offer: LenderOfferReview; isHighlighted?: boolean }) {
  const activeLoan = offer.activeLoan;
  const hasActionableProofs = activeLoan?.schedule.some(
    (r) => r.latestProof?.status === "submitted",
  );
  const isQuiet = offer.status !== "pending" && !isHighlighted && !hasActionableProofs;
  const context = offer.application?.portfolio
    ? `${offer.application.portfolio.businessTypeLabel} in ${offer.application.portfolio.location}`
    : "Application context unavailable";

  return (
    <Card
      className={cn(
        "rounded-2xl border-border/50 shadow-sm transition",
        isHighlighted && "ring-2 ring-primary/30",
        isQuiet && "opacity-75",
      )}
    >
      <CardContent className="grid gap-3 p-4 sm:p-5">
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
            label="Interest/service charge"
            value={`PHP ${formatCurrency(offer.interestAmount)}`}
          />
          <MiniMetric
            label="Borrower-paid fees"
            value={`PHP ${formatCurrency(offer.fees)}`}
          />
          <MiniMetric
            label="Total repayment"
            value={`PHP ${formatCurrency(offer.totalRepaymentAmount)}`}
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
                label="Interest/service charge"
                value={`PHP ${formatCurrency(activeLoan.interestAmount)}`}
              />
              <MiniMetric
                label="Borrower-paid fees"
                value={`PHP ${formatCurrency(activeLoan.fees)}`}
              />
              <MiniMetric
                label="Total repayment"
                value={`PHP ${formatCurrency(activeLoan.totalRepaymentAmount)}`}
              />
              <MiniMetric
                label="Outstanding"
                value={`PHP ${formatCurrency(activeLoan.outstandingBalance)}`}
              />
              <MiniMetric label="Due" value={formatDateOnly(activeLoan.dueDate)} />
            </dl>
            {activeLoan.schedule.length > 0 ? (
              <CollapsibleSection
                triggerLabel="Repayment schedule"
                defaultOpen={activeLoan.schedule.some((r) => r.latestProof?.status === "submitted")}
              >
                <div className="divide-y divide-border/60">
                  {activeLoan.schedule.map((repayment) => {
                    const latestProof = repayment.latestProof;
                    const needsReview = latestProof?.status === "submitted";

                    return (
                      <div
                        key={repayment.id}
                        className="py-2.5 first:pt-0 last:pb-0"
                      >
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="text-sm font-medium">
                            #{repayment.installmentNumber}
                          </span>
                          <span className="text-sm font-semibold tabular-nums">
                            PHP {formatCurrency(repayment.amountDue)}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Due {formatDateOnly(repayment.dueDate)}
                          {needsReview ? (
                            <span className="font-medium text-foreground">
                              {" · "}Needs review
                            </span>
                          ) : latestProof ? (
                            ` · ${formatRepaymentStatus(repayment.status)}`
                          ) : (
                            " · Awaiting borrower proof"
                          )}
                        </p>

                        {needsReview && latestProof ? (
                          <div className="mt-2">
                            <LenderRepaymentProofActions
                              proofId={latestProof.id}
                              proofStatus={latestProof.status}
                              proofUrl={latestProof.viewUrl}
                              proofFileName={latestProof.fileName}
                              proofFileSize={latestProof.fileSize}
                              proofFileType={latestProof.fileType}
                            />
                          </div>
                        ) : !needsReview && repayment.proofs.length > 0 ? (
                          <div className="mt-1.5">
                            <CollapsibleSection triggerLabel="Proof history">
                              <LenderProofHistory
                                currentSubmittedProofId={null}
                                proofs={repayment.proofs}
                              />
                            </CollapsibleSection>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
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
            <p className="text-xs text-muted-foreground">
              Note: {proof.reviewNotes}
            </p>
          ) : null}
          {proof.id === currentSubmittedProofId ? (
            <LenderRepaymentProofActions
              proofId={proof.id}
              proofStatus={proof.status}
              proofUrl={proof.viewUrl}
              proofFileName={proof.fileName}
              proofFileSize={proof.fileSize}
              proofFileType={proof.fileType}
            />
          ) : proof.viewUrl ? (
            <ProofPreviewButton
              fileName={proof.fileName}
              fileSize={proof.fileSize}
              fileType={proof.fileType}
              viewUrl={proof.viewUrl}
            />
          ) : null}
        </div>
      ))}
    </div>
  );
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
