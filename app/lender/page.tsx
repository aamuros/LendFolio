import Link from "next/link";
import type { ReactNode } from "react";
import { redirect, RedirectType } from "next/navigation";
import {
  ArrowRight,
  Banknote,
  ClipboardList,
  FileText,
  HandCoins,
  MapPin,
} from "lucide-react";
import { LenderBottomTabs } from "@/components/lender-bottom-tabs";
import { LenderPageHeader } from "@/components/lender-page-header";
import {
  LenderApplicationsList,
  LenderApplicationsStatus,
} from "@/components/lender-applications-list";
import { LenderAccessPanel } from "@/components/lender/lender-access-panel";
import {
  buildConsentStatus,
} from "@/lib/consents";
import { loadUserConsents } from "@/lib/user-consents";
import { requirePrimaryRole } from "@/lib/access-control";
import { LenderToast } from "@/app/lender/lender-toast";
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
import { ToneBadge } from "@/components/borrower-status-badge";
import {
  BorrowerCard,
  PageHeader,
  borrowerPageBottomPadding,
} from "@/components/borrower/ui";
import { cn } from "@/lib/utils";
import { formatDateOnly } from "@/lib/manager-date-format";
import { formatCurrency, formatDate } from "@/lib/lender-format";
import { LenderAccountTabWrapper } from "@/components/lender/profile/lender-account-tab-wrapper";
import { LenderOffersHighlighter } from "@/components/lender/lender-offers-highlighter";
import {
  getOfferContext,
  LoanStatusBadge,
  MiniMetric,
} from "@/components/lender-loan-details";

export const dynamic = "force-dynamic";

type LenderPageProps = {
  searchParams: Promise<{
    message?: string;
    tab?: string;
    offerStatus?: string;
    offerId?: string;
    proofId?: string;
  }>;
};

type OfferStatusFilter = "pending" | "accepted" | "declined" | "expired" | "other";

export default async function LenderPage({ searchParams }: LenderPageProps) {
  const { message, tab, offerStatus, offerId, proofId } = await searchParams;

  if (message === "signed-in") {
    redirect("/lender", RedirectType.replace);
  }

  const activeTab =
    tab === "applications"
      ? "applications"
      : tab === "offers"
        ? "offers"
        : tab === "loans"
          ? "loans"
          : tab === "account" || tab === "profile"
            ? "profile"
            : "home";
  const selectedOfferStatus = parseOfferStatusFilter(offerStatus);
  const access = await requirePrimaryRole("lender");

  if (!access.ok) {
    return (
      <main className="theme-lendfolio min-h-svh bg-background text-foreground">
        <LenderToast />
        <LenderPageHeader activeTab={activeTab} />
        <div
          className={cn(
            "mx-auto w-full",
            activeTab === "applications" ? "max-w-[1700px]" : "max-w-7xl",
          )}
        >
          <div className={cn("px-4 pt-3 sm:px-6 sm:pt-5", borrowerPageBottomPadding)}>
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
      redirect("/lender/onboarding", RedirectType.replace);
    }

    let lenderConsentStatus = buildConsentStatus("lender_review", []);
    let pendingDocuments: Awaited<ReturnType<typeof getLenderVerificationDocuments>> = [];
    let pendingDocumentPolicy = calculateLenderVerificationDocumentPolicy([]);
    let user: { email?: string } | null = null;

    try {
      lenderConsentStatus = buildConsentStatus(
        "lender_review",
        await loadUserConsents(access.supabase, access.profile.id),
      );
      const { data } = await access.supabase.auth.getUser();
      user = data.user ?? null;

      const pendingLenderProfileId = access.profile.lenderProfile?.id;
      if (pendingLenderProfileId) {
        pendingDocuments = await getLenderVerificationDocuments(
          access.supabase,
          pendingLenderProfileId,
          access.profile.id,
          { includeSignedUrls: true },
        );
        pendingDocumentPolicy =
          calculateLenderVerificationDocumentPolicy(pendingDocuments);
      }
    } catch {
      // Data loading failed; render with empty defaults so the page
      // still shows the pending-review panel instead of crashing.
    }

    return (
      <main className="theme-lendfolio min-h-svh bg-background text-foreground">
        <LenderPageHeader activeTab={activeTab} />
        <div
          className={cn(
            "mx-auto w-full",
            activeTab === "applications" ? "max-w-[1700px]" : "max-w-7xl",
          )}
        >
          <div className={cn("px-4 pt-3 sm:px-6 sm:pt-5", borrowerPageBottomPadding)}>
            {activeTab === "home" ? (
              <LenderAccessPanel
                profile={access.profile}
                consentStatus={lenderConsentStatus}
                documents={pendingDocuments}
                documentPolicy={pendingDocumentPolicy}
              />
            ) : null}

            {activeTab === "applications" ? (
              <ApplicationsTab
                applications={[]}
                error=""
                emptyDescription="Borrower applications will appear here once your lender account is approved."
              />
            ) : null}

            {activeTab === "offers" ? (
              <OffersTab
                offers={[]}
                error=""
                selectedStatus={selectedOfferStatus}
                highlightOfferId={null}
                highlightProofId={null}
              />
            ) : null}

            {activeTab === "loans" ? (
              <LoansTab offers={[]} error="" />
            ) : null}

            {activeTab === "profile" ? (
              <LenderAccountTabWrapper
                email={user?.email ?? ""}
                lenderProfile={access.profile.lenderProfile}
                documents={pendingDocuments}
                documentPolicy={pendingDocumentPolicy}
                consentStatus={lenderConsentStatus}
                changeRequests={[]}
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
  } else if (activeTab === "applications") {
    const applicationsResult = await loadOpenLenderApplications(access);
    applications = applicationsResult.ok ? applicationsResult.applications : [];
    applicationsError = !applicationsResult.ok ? applicationsResult.message : "";
  } else if (activeTab === "offers" || activeTab === "loans") {
    const offersResult = await loadLenderOffers(access);
    offers = offersResult.ok ? offersResult.offers : [];
    offersError = !offersResult.ok ? offersResult.message : "";
  } else if (activeTab === "profile") {
    const { data } = await access.supabase.auth.getUser();
    user = data.user ?? null;

    const lenderProfileId = access.profile.lenderProfile?.id;
    if (lenderProfileId) {
      const [docs, changeReqResult] = await Promise.all([
        getLenderVerificationDocuments(access.supabase, lenderProfileId, access.profile.id, {
          includeSignedUrls: true,
        }),
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
    <main className="theme-lendfolio min-h-svh bg-background text-foreground">
      <LenderToast />
      <LenderPageHeader activeTab={activeTab} />
      <div
        className={cn(
          "mx-auto w-full",
          activeTab === "applications" ? "max-w-[1700px]" : "max-w-7xl",
        )}
      >
        <div className={cn("px-4 pt-3 sm:px-6 sm:pt-5", borrowerPageBottomPadding)}>
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
              selectedStatus={selectedOfferStatus}
              highlightOfferId={offerId ?? null}
              highlightProofId={proofId ?? null}
            />
          ) : null}

          {activeTab === "loans" ? (
            <LoansTab offers={offers} error={offersError} />
          ) : null}

          {activeTab === "applications" ? (
            <ApplicationsTab
              applications={applications}
              error={applicationsError}
            />
          ) : null}

          {activeTab === "profile" ? (
            <LenderAccountTabWrapper
              email={user?.email ?? ""}
              lenderProfile={access.profile.lenderProfile}
              documents={lenderDocuments}
              documentPolicy={lenderDocumentPolicy}
              consentStatus={buildConsentStatus(
                "lender_review",
                await loadUserConsents(access.supabase, access.profile.id),
              )}
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

function ApplicationsTab({
  applications,
  error,
  emptyDescription = "Borrower applications will appear here once your lender account is approved.",
}: {
  applications: LenderApplicationReview[];
  error: string;
  emptyDescription?: string;
}) {
  return (
    <section className="grid min-w-0 gap-4 sm:gap-5">
      <PageHeader
        title="Open applications"
        description="Review borrower context and send terms when there is a fit."
      />

      {error ? <LenderApplicationsStatus message={error} tone="error" /> : null}
      <LenderApplicationsList
        applications={applications}
        emptyTitle="No applications yet"
        emptyDescription={emptyDescription}
      />
    </section>
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
            href: "/lender?tab=loans" as const,
          count: repaymentProofsNeedingReview,
        }
      : needsReviewCount > 0
        ? {
            title: "Review applications",
            description: `${needsReviewCount} borrower ${needsReviewCount === 1 ? "request needs" : "requests need"} your review before sending terms.`,
            href: "/lender?tab=applications" as const,
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
                href: "/lender?tab=loans" as const,
                count: activeLoans,
              }
            : null;

  const topApplications = actionableApplications.slice(0, 3);

  return (
    <section className="grid gap-5">
      <PageHeader
        title="Lender home"
        description="Review borrower requests, sent offers, and repayment activity."
      />

      {applicationsError ? (
        <LenderApplicationsStatus message={applicationsError} tone="error" />
      ) : null}
      {offersError ? <LenderApplicationsStatus message={offersError} tone="error" /> : null}

      <div className="grid min-w-0 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)] xl:grid-cols-[minmax(0,1fr)_minmax(20rem,23rem)]">
        <div className="grid min-w-0 gap-4">
          <BorrowerCard className="min-w-0 overflow-hidden">
            <CardContent className="grid gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-5">
              <div className="grid min-w-0 gap-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Lender home
                </p>
                <h2 className="text-xl font-semibold leading-tight sm:text-2xl">
                  Keep borrower reviews and loan activity moving.
                </h2>
                <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                  Start with applications ready for review, then track sent offers and accepted loans from the same workspace.
                </p>
              </div>
              <Button
                asChild
                variant="outline"
                className="h-10 w-full rounded-xl font-semibold sm:w-auto sm:justify-self-end"
              >
                <Link href="/lender?tab=applications">
                  Review queue
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </CardContent>
          </BorrowerCard>

          <div className="grid min-w-0 gap-3 sm:grid-cols-3">
            <DashboardMetric
              label="Applications"
              value={needsReviewCount}
              description="Ready to review"
              icon={<ClipboardList className="size-4" />}
              href="/lender?tab=applications"
            />
            <DashboardMetric
              label="Offers sent"
              value={pendingOffers}
              description={`${pendingOffers} pending response${pendingOffers === 1 ? "" : "s"}`}
              icon={<HandCoins className="size-4" />}
              href="/lender?tab=offers"
            />
            <DashboardMetric
              label="Active loans"
              value={activeLoans}
              description="Accepted offers"
              icon={<Banknote className="size-4" />}
              href="/lender?tab=loans"
            />
          </div>

          <BorrowerCard className="min-w-0 overflow-hidden">
            <CardContent className="flex min-w-0 flex-1 flex-col gap-3 p-4 sm:p-5">
              <div className="flex min-w-0 items-center justify-between gap-2">
                <div className="grid min-w-0 gap-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Applications needing review
                  </p>
                  <p className="min-w-0 text-sm text-muted-foreground">
                    A compact view of borrower requests you can act on now.
                  </p>
                </div>
                {needsReviewCount > 0 ? (
                  <Badge variant="secondary" className="shrink-0 text-[10px] font-semibold">
                    {needsReviewCount}
                  </Badge>
                ) : null}
              </div>
              {topApplications.length > 0 ? (
                <div className="grid min-w-0 overflow-hidden rounded-xl border border-border/80 bg-background/60">
                  {topApplications.map((application) => (
                    <ApplicationReviewRow
                      key={application.id}
                      application={application}
                    />
                  ))}
                </div>
              ) : (
                <div className="grid gap-2 rounded-xl border border-dashed border-border/90 bg-muted/35 p-4">
                  <p className="text-sm font-semibold">No applications awaiting review</p>
                  <p className="text-sm leading-6 text-muted-foreground">
                    New borrower requests will appear here when they are ready for lenders.
                  </p>
                </div>
              )}
              {needsReviewCount > 3 ? (
                <Button asChild variant="ghost" size="sm" className="h-auto justify-between rounded-lg px-3 py-2 text-xs font-semibold">
                  <Link href="/lender?tab=applications">
                    View all {needsReviewCount} applications
                    <ArrowRight className="size-3.5" />
                  </Link>
                </Button>
              ) : null}
            </CardContent>
          </BorrowerCard>
        </div>

        <div className="grid min-w-0 content-start gap-4">
          <BorrowerCard className="min-w-0 overflow-hidden border-primary/20 bg-[linear-gradient(135deg,rgba(51,66,60,0.08),rgba(255,255,252,0.9)_42%,rgba(246,245,242,0.95))]">
            <CardContent className="grid min-w-0 gap-4 p-4 sm:p-5">
              <div className="flex min-w-0 items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Next action
                </p>
                {primaryAction?.count ? (
                  <Badge variant="secondary" className="text-[10px] font-semibold">
                    {primaryAction.count}
                  </Badge>
                ) : null}
              </div>
              {primaryAction ? (
                <Link
                  href={primaryAction.href}
                  className="group flex w-full min-w-0 items-center justify-between gap-3 rounded-xl border border-border/80 bg-background/80 px-3 py-3 text-left shadow-sm transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <span className="grid min-w-0 flex-1 gap-0.5">
                    <span className="truncate text-sm font-semibold">
                      {primaryAction.title}
                    </span>
                    <span className="line-clamp-2 text-xs leading-5 text-muted-foreground">
                      {primaryAction.description}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2 text-xs font-semibold text-accent-foreground">
                    <span className="hidden sm:inline">Review</span>
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              ) : (
                <div className="grid min-w-0 gap-3 rounded-xl border border-border/80 bg-background/70 p-3">
                  <p className="text-sm font-semibold">No open applications</p>
                  <p className="text-xs text-muted-foreground">
                    New borrower requests will appear in your review queue.
                  </p>
                  <Button
                    asChild
                    variant="ghost"
                    className="h-auto w-full justify-between gap-3 rounded-xl px-3 py-2.5"
                  >
                    <Link href="/lender?tab=applications">
                      Open applications
                      <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                    </Link>
                  </Button>
                </div>
              )}
              {repaymentProofsNeedingReview > 0 ? (
                <p className="rounded-xl border border-border/80 bg-background/55 px-3 py-2 text-xs text-muted-foreground">
                  {repaymentProofsNeedingReview} repayment proof
                  {repaymentProofsNeedingReview === 1 ? "" : "s"} also need
                  review.
                </p>
              ) : null}
            </CardContent>
          </BorrowerCard>

          <BorrowerCard className="min-w-0 overflow-hidden">
            <CardContent className="flex min-w-0 flex-1 flex-col gap-3 p-4 sm:p-5">
              <div className="flex min-w-0 items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Offers &amp; loans
                </p>
                <FileText className="size-4 text-muted-foreground" />
              </div>
              {offers.length > 0 ? (
                <div className="grid min-w-0 gap-2">
                  <OfferSummaryRow label="Pending" value={pendingOffers} href="/lender?tab=offers" />
                  <OfferSummaryRow label="Accepted" value={acceptedOffers} href="/lender?tab=offers&offerStatus=accepted" />
                  <OfferSummaryRow label="Declined" value={declinedOffers} href="/lender?tab=offers&offerStatus=declined" />
                  <OfferSummaryRow label="Expired" value={expiredOffers} href="/lender?tab=offers&offerStatus=expired" />
                </div>
              ) : (
                <div className="grid gap-2 rounded-xl border border-dashed border-border/90 bg-muted/35 p-3">
                  <p className="text-sm font-semibold">No offers sent yet</p>
                  <p className="text-xs leading-5 text-muted-foreground">
                    Sent offers and active loan tracking will appear here.
                  </p>
                </div>
              )}
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="mt-auto h-auto justify-between rounded-lg px-3 py-2 text-xs font-semibold"
              >
                <Link href="/lender?tab=offers">
                  View all offers
                  <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            </CardContent>
          </BorrowerCard>
        </div>
      </div>
    </section>
  );
}

function DashboardMetric({
  description,
  href,
  icon,
  label,
  value,
}: {
  description: string;
  href: string;
  icon: ReactNode;
  label: string;
  value: number;
}) {
  return (
    <BorrowerCard className="overflow-hidden transition hover:border-primary/30 hover:bg-muted/30 hover:shadow-sm">
      <Link
        href={href}
        aria-label={`Open ${label.toLowerCase()}`}
        className="block cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <CardContent className="flex items-center gap-3 p-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-border/80 bg-muted/60 text-accent-foreground">
            {icon}
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {label}
            </p>
            <div className="mt-1 flex min-w-0 items-baseline gap-2">
              <p className="text-2xl font-semibold leading-none">{value}</p>
              <p className="truncate text-xs text-muted-foreground">{description}</p>
            </div>
          </div>
        </CardContent>
      </Link>
    </BorrowerCard>
  );
}

function ApplicationReviewRow({
  application,
}: {
  application: LenderApplicationReview;
}) {
  const context = application.portfolio
    ? application.portfolio.businessTypeLabel
    : "Borrower application";
  const location = application.portfolio?.location;

  return (
    <Link
      href={`/lender/applications/${application.id}`}
      className="group grid min-w-0 gap-3 border-b border-border/70 px-3 py-3 transition last:border-b-0 hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
    >
      <span className="grid min-w-0 gap-1">
        <span className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="min-w-0 truncate text-sm font-semibold">{context}</span>
          <ToneBadge tone="attention">Review</ToneBadge>
        </span>
        <span className="line-clamp-2 text-sm leading-5 text-muted-foreground">
          {application.purpose ?? "No purpose stated"}
        </span>
        {location ? (
          <span className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="size-3.5 shrink-0" />
            <span className="min-w-0 truncate">{location}</span>
          </span>
        ) : null}
      </span>
      <span className="flex items-center justify-between gap-3 text-xs font-semibold text-accent-foreground sm:justify-end">
        <span>Review</span>
        <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}

function OfferSummaryRow({
  href,
  label,
  value,
}: {
  href?: string;
  label: string;
  value: number;
}) {
  const content = (
    <>
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-background/60 px-3 py-2 text-sm transition hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {content}
      </Link>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-background/60 px-3 py-2 text-sm">
      {content}
    </div>
  );
}

function OffersTab({
  offers,
  error,
  selectedStatus,
  highlightOfferId,
  highlightProofId,
}: {
  offers: LenderOfferReview[];
  error: string;
  selectedStatus: OfferStatusFilter;
  highlightOfferId: string | null;
  highlightProofId: string | null;
}) {
  const knownStatuses = new Set(["pending", "accepted", "declined", "expired"]);
  const visibleOffers = offers.filter((offer) =>
    selectedStatus === "other"
      ? !knownStatuses.has(offer.status)
      : offer.status === selectedStatus,
  );
  const hasOtherOffers = offers.some((offer) => !knownStatuses.has(offer.status));
  const statusLinks: Array<{
    status: OfferStatusFilter;
    label: string;
    href: string;
    count: number;
  }> = [
    {
      status: "pending",
      label: "Pending",
      href: "/lender?tab=offers",
      count: offers.filter((offer) => offer.status === "pending").length,
    },
    {
      status: "accepted",
      label: "Accepted offers",
      href: "/lender?tab=offers&offerStatus=accepted",
      count: offers.filter((offer) => offer.status === "accepted").length,
    },
    {
      status: "declined",
      label: "Declined offers",
      href: "/lender?tab=offers&offerStatus=declined",
      count: offers.filter((offer) => offer.status === "declined").length,
    },
    {
      status: "expired",
      label: "Expired",
      href: "/lender?tab=offers&offerStatus=expired",
      count: offers.filter((offer) => offer.status === "expired").length,
    },
    ...(hasOtherOffers
      ? [
          {
            status: "other" as const,
            label: "Other",
            href: "/lender?tab=offers&offerStatus=other",
            count: offers.filter((offer) => !knownStatuses.has(offer.status)).length,
          },
        ]
      : []),
  ];
  const subtitle =
    selectedStatus === "accepted"
      ? "Offers accepted by borrowers. Active loans are managed in Loans."
      : selectedStatus === "declined"
        ? "Offers declined by borrowers."
        : selectedStatus === "expired"
          ? "Expired offers."
          : selectedStatus === "other"
            ? "Offers with other statuses."
            : "Offers awaiting borrower response.";

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
          {subtitle}
        </p>
      </div>

      {error ? <LenderApplicationsStatus message={error} tone="error" /> : null}

      {offers.length === 0 && !error ? (
        <Card className="rounded-2xl border-dashed border-border/50">
          <CardContent className="grid gap-2 p-5 text-center">
            <p className="text-lg font-semibold">No offers yet</p>
            <p className="text-sm text-muted-foreground">
              Your submitted or available funding offers will appear here.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {offers.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {statusLinks.map((item) => (
            <Button
              key={item.status}
              asChild
              variant={selectedStatus === item.status ? "default" : "outline"}
              size="sm"
              className="h-9 shrink-0 rounded-full px-3 text-xs font-semibold"
            >
              <Link href={item.href}>
                {item.label}
                <Badge
                  variant={selectedStatus === item.status ? "secondary" : "outline"}
                  className="ml-1.5 h-5 rounded-full px-1.5 text-[10px]"
                >
                  {item.count}
                </Badge>
              </Link>
            </Button>
          ))}
        </div>
      ) : null}

      {visibleOffers.length > 0 ? (
        <div className="grid gap-3">
          {visibleOffers.map((offer) => (
            <div key={offer.id} id={`offer-${offer.id}`}>
              <OfferCard
                offer={offer}
                isHighlighted={offer.id === resolvedHighlightOfferId}
              />
            </div>
          ))}
        </div>
      ) : offers.length > 0 && !error ? (
        <Card className="rounded-2xl border-dashed border-border/50">
          <CardContent className="grid gap-2 p-5 text-center">
            <p className="text-lg font-semibold">No offers in this view</p>
            <p className="text-sm text-muted-foreground">
              Choose another offer status to review more history.
            </p>
          </CardContent>
        </Card>
      ) : null}

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

function LoansTab({
  offers,
  error,
}: {
  offers: LenderOfferReview[];
  error: string;
}) {
  const activeLoanOffers = offers.filter((offer) => offer.activeLoan);

  return (
    <section className="grid gap-5">
      <PageHeader
        title="Loans"
        description="Track active loans and review repayment activity."
      />

      {error ? <LenderApplicationsStatus message={error} tone="error" /> : null}

      {activeLoanOffers.length > 0 ? (
        <div className="grid gap-3">
          {activeLoanOffers.map((offer) => (
            <LoanListCard key={offer.id} offer={offer} />
          ))}
        </div>
      ) : !error ? (
        <Card className="rounded-2xl border-dashed border-border/50">
          <CardContent className="grid gap-2 p-5 text-center">
            <p className="text-lg font-semibold">No active loans yet</p>
            <p className="text-sm text-muted-foreground">
              Accepted offers will appear here once they become active loans.
            </p>
          </CardContent>
        </Card>
      ) : null}
    </section>
  );
}

function LoanListCard({ offer }: { offer: LenderOfferReview }) {
  const activeLoan = offer.activeLoan;

  if (!activeLoan) {
    return null;
  }

  const context = getOfferContext(offer);
  const proofReviewCount = activeLoan.schedule.filter(
    (repayment) => repayment.latestProof?.status === "submitted",
  ).length;

  return (
    <Card className="rounded-2xl border-border/60 shadow-sm transition hover:border-primary/30 hover:bg-muted/20 hover:shadow-md">
      <CardContent className="grid gap-3 p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="min-w-0 font-semibold">{context}</h3>
              <LoanStatusBadge status={activeLoan.status} />
              {proofReviewCount > 0 ? (
                <Badge variant="secondary" className="rounded-full text-[10px] font-semibold">
                  {proofReviewCount} proof{proofReviewCount === 1 ? "" : "s"} to review
                </Badge>
              ) : null}
            </div>
            <p className="mt-0.5 text-sm leading-5 text-muted-foreground">
              {offer.application?.purpose ?? "Active loan"}
            </p>
          </div>
          <Button asChild className="h-10 rounded-xl font-semibold">
            <Link href={`/lender/loans/${activeLoan.id}`}>
              View
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
        <dl className="grid gap-2 rounded-xl border border-border/60 bg-muted/20 p-3 text-sm sm:grid-cols-2 lg:grid-cols-5">
          <MiniMetric
            label="Principal"
            value={`PHP ${formatCurrency(activeLoan.principalAmount)}`}
            compact
          />
          <MiniMetric
            label="Outstanding"
            value={`PHP ${formatCurrency(activeLoan.outstandingBalance)}`}
            compact
          />
          <MiniMetric
            label="Due"
            value={formatDateOnly(activeLoan.dueDate)}
            compact
          />
          <MiniMetric
            label="Total repayment"
            value={`PHP ${formatCurrency(activeLoan.totalRepaymentAmount)}`}
            compact
          />
          <MiniMetric
            label="Proofs needing review"
            value={String(proofReviewCount)}
            compact
          />
        </dl>
      </CardContent>
    </Card>
  );
}

function OfferCard({ offer, isHighlighted = false }: { offer: LenderOfferReview; isHighlighted?: boolean }) {
  const activeLoan = offer.activeLoan;
  const isQuiet = offer.status !== "pending" && !isHighlighted;
  const href =
    offer.status === "accepted" && activeLoan
      ? `/lender/loans/${activeLoan.id}`
      : `/lender/applications/${offer.application?.id ?? offer.applicationId}`;
  const context = getOfferContext(offer);

  return (
    <Card
      className={cn(
        "group relative rounded-2xl border-border/50 shadow-sm transition hover:border-primary/30 hover:bg-muted/20 hover:shadow-md focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
        isHighlighted && "ring-2 ring-primary/30",
        isQuiet && "opacity-75",
      )}
    >
      <Link
        href={href}
        aria-label={`Open offer for ${context}`}
        className="absolute inset-0 z-10 rounded-2xl focus-visible:outline-none"
      />
      <CardContent className="pointer-events-none relative z-20 grid gap-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold">{context}</h3>
              {offer.status === "accepted" && activeLoan ? (
                <Badge variant="secondary" className="rounded-full text-[10px] font-semibold">
                  Active loan created
                </Badge>
              ) : null}
            </div>
            <p className="mt-0.5 text-sm leading-5 text-muted-foreground">
              {offer.application?.purpose ?? "Offer sent"}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <ToneBadge tone={offerStatusTone(offer.status)}>
              {offer.status}
            </ToneBadge>
            <span className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-primary px-3 text-sm font-semibold text-primary-foreground shadow-sm transition group-hover:bg-primary/90">
              View
              <ArrowRight className="size-4" />
            </span>
          </div>
        </div>
        <div className="grid gap-3 rounded-xl border border-border/60 bg-muted/20 p-3 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,4fr)] sm:items-start">
          <div>
            <p className="text-xs font-semibold text-muted-foreground">
              Total repayment
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
              PHP {formatCurrency(offer.totalRepaymentAmount)}
            </p>
            {offer.application ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Requested PHP {formatCurrency(offer.application.requestedAmount)}
              </p>
            ) : null}
          </div>
          <dl className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-6">
            <MiniMetric
              label="Approved"
              value={`PHP ${formatCurrency(offer.approvedAmount)}`}
              compact
            />
            <MiniMetric
              label="Interest/service charge"
              value={`PHP ${formatCurrency(offer.interestAmount)}`}
              compact
            />
            <MiniMetric
              label="Fees"
              value={`PHP ${formatCurrency(offer.fees)}`}
              compact
            />
            <MiniMetric label="Due" value={formatDateOnly(offer.dueDate)} compact />
            <MiniMetric label="Sent" value={formatDate(offer.sentAt)} compact />
            {offer.application ? (
              <MiniMetric label="Submitted" value={formatDate(offer.application.submittedAt)} compact />
            ) : null}
          </dl>
        </div>
      </CardContent>
    </Card>
  );
}

function parseOfferStatusFilter(status: string | undefined): OfferStatusFilter {
  if (
    status === "accepted" ||
    status === "declined" ||
    status === "expired" ||
    status === "other"
  ) {
    return status;
  }

  return "pending";
}
