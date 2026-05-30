import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ToneBadge } from "@/components/borrower-status-badge";
import { CollapsibleSection } from "@/components/lender-collapsible-section";
import { cn } from "@/lib/utils";
import { formatDateOnly } from "@/lib/manager-date-format";
import { LenderAccountTabWrapper } from "@/components/lender/profile/lender-account-tab-wrapper";

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
      <main className="min-h-svh bg-background">
        <div className="mx-auto max-w-7xl">
          <LenderHeader activeTab={activeTab} showNotifications={false} />
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
    const lenderConsentStatus = buildConsentStatus(
      "lender_review",
      await loadUserConsents(access.supabase, access.profile.id),
    );

    if (
      access.profile.role === "lender" &&
      (access.profile.lenderProfile?.verification_status === "incomplete" ||
        !access.profile.lenderProfile)
    ) {
      redirect("/lender/onboarding");
    }

    const message =
      access.profile.role === "lender" &&
      access.profile.lenderProfile?.verification_status === "pending"
        ? "Your lender access is pending review. Accept the required disclosures below so a manager can complete your approval."
        : access.profile.role === "lender" &&
            access.profile.lenderProfile?.verification_status === "rejected"
          ? "Your lender access was not approved. Update your lender profile to resubmit."
          : "Your account does not have access to this workspace.";

    return (
      <main className="min-h-svh bg-background">
        <div className="mx-auto max-w-7xl">
          <LenderHeader activeTab={activeTab} showNotifications={false} />
          <div className="px-5 pt-6 pb-36 sm:px-8 sm:pt-10">
            <div className="grid gap-5">
              <LenderApplicationsStatus message={message} tone="error" />
              {access.profile.role === "lender" &&
              access.profile.lenderProfile?.verification_status === "rejected" ? (
                <Button asChild className="h-11 w-full rounded-full font-semibold sm:w-fit">
                  <Link href="/lender/onboarding">Update lender profile</Link>
                </Button>
              ) : null}
              {access.profile.role === "lender" ? (
                <ConsentAcceptancePanel
                  scope="lender_review"
                  status={lenderConsentStatus}
                />
              ) : null}
            </div>
          </div>
          <div className="sm:hidden">
            <LenderBottomTabs activeTab={activeTab} />
          </div>
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
    <main className="min-h-svh bg-background">
      <div className="mx-auto max-w-7xl">
        <LenderHeader activeTab={activeTab} accountEmail={user?.email} />

        <div className="px-5 pt-6 pb-36 sm:px-8 sm:pt-10">
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
            <LenderAccountTabWrapper
              email={user?.email ?? ""}
              lenderProfile={access.profile.lenderProfile}
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

  const secondaryActions: { title: string; description: string; href: string; count: number }[] = [];

  if (primaryAction?.href !== "/lender/applications" && needsReviewCount > 0) {
    secondaryActions.push({
      title: "Review applications",
      description: `${needsReviewCount} awaiting review`,
      href: "/lender/applications",
      count: needsReviewCount,
    });
  }
  if (primaryAction?.href !== "/lender?tab=offers" && (pendingOffers > 0 || activeLoans > 0)) {
    secondaryActions.push({
      title: "View offers",
      description: pendingOffers > 0 ? `${pendingOffers} pending` : `${activeLoans} active loan${activeLoans === 1 ? "" : "s"}`,
      href: "/lender?tab=offers",
      count: pendingOffers > 0 ? pendingOffers : activeLoans,
    });
  }

  const topApplications = applications
    .filter((app) => app.currentLenderOfferState === "not_offered")
    .slice(0, 3);

  const offersByStatus = {
    pending: offers.filter((o) => o.status === "pending").length,
    accepted: offers.filter((o) => o.status === "accepted").length,
    declined: offers.filter((o) => o.status === "declined").length,
    expired: offers.filter((o) => o.status === "expired").length,
  };

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
              <>
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
                {secondaryActions.length > 0 ? (
                  <>
                    <Separator className="my-1" />
                    {secondaryActions.map((action) => (
                      <Button
                        key={action.href}
                        asChild
                        variant="ghost"
                        className="h-auto justify-between gap-3 rounded-xl px-3 py-2.5"
                      >
                        <Link href={action.href}>
                          <span className="grid gap-0.5 text-left">
                            <span className="flex items-center gap-2">
                              <span className="text-sm font-semibold">{action.title}</span>
                              {action.count > 0 ? (
                                <Badge variant="secondary" className="text-[10px] font-semibold">
                                  {action.count}
                                </Badge>
                              ) : null}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {action.description}
                            </span>
                          </span>
                          <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                        </Link>
                      </Button>
                    ))}
                  </>
                ) : null}
              </>
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
            <p className="text-2xl font-semibold">
              {offers.length}
            </p>
            <p className="text-xs text-muted-foreground">
              total offer{offers.length === 1 ? "" : "s"} sent
            </p>
            <Separator className="my-1" />
            <div className="flex flex-1 flex-col gap-2">
              {offersByStatus.pending > 0 ? (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Pending</span>
                  <span className="font-semibold">{offersByStatus.pending}</span>
                </div>
              ) : null}
              {offersByStatus.accepted > 0 ? (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Accepted</span>
                  <span className="font-semibold">{offersByStatus.accepted}</span>
                </div>
              ) : null}
              {offersByStatus.declined > 0 ? (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Declined</span>
                  <span className="font-semibold">{offersByStatus.declined}</span>
                </div>
              ) : null}
              {offersByStatus.expired > 0 ? (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Expired</span>
                  <span className="font-semibold">{offersByStatus.expired}</span>
                </div>
              ) : null}
              {offers.length === 0 ? (
                <p className="text-xs text-muted-foreground">No offers sent yet.</p>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-12 rounded-2xl border-border/50 shadow-sm lg:col-span-4">
          <CardContent className="flex flex-1 flex-col gap-2 p-4 sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Applications to review
            </p>
            <p className="text-2xl font-semibold">{needsReviewCount}</p>
            <p className="text-xs text-muted-foreground">
              {needsReviewCount === 1 ? "application" : "applications"} awaiting your review
            </p>
            <Button asChild variant="ghost" size="sm" className="mt-auto h-auto w-full justify-between rounded-lg px-3 py-2 text-xs font-semibold">
              <Link href="/lender/applications">
                View applications
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="col-span-12 rounded-2xl border-border/50 shadow-sm lg:col-span-4">
          <CardContent className="flex flex-1 flex-col gap-2 p-4 sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Proofs to review
            </p>
            <p className="text-2xl font-semibold">{repaymentProofsNeedingReview}</p>
            <p className="text-xs text-muted-foreground">
              submitted proof{repaymentProofsNeedingReview === 1 ? "" : "s"} awaiting verification
            </p>
            <Button asChild variant="ghost" size="sm" className="mt-auto h-auto w-full justify-between rounded-lg px-3 py-2 text-xs font-semibold">
              <Link href="/lender?tab=offers">
                View offers
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="col-span-12 rounded-2xl border-border/50 shadow-sm lg:col-span-4">
          <CardContent className="flex flex-1 flex-col gap-2 p-4 sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Active loans
            </p>
            <p className="text-2xl font-semibold">{activeLoans}</p>
            <p className="text-xs text-muted-foreground">
              accepted offer{activeLoans === 1 ? "" : "s"} with active loans
            </p>
            <Button asChild variant="ghost" size="sm" className="mt-auto h-auto w-full justify-between rounded-lg px-3 py-2 text-xs font-semibold">
              <Link href="/lender?tab=offers">
                View offers
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
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
              <div className="flex flex-1 flex-col gap-2">
                {topApplications.map((app) => {
                  const context = app.portfolio
                    ? `${app.portfolio.businessTypeLabel} in ${app.portfolio.location}`
                    : "Application";
                  return (
                    <Button
                      key={app.id}
                      asChild
                      variant="ghost"
                      className="h-auto justify-between gap-3 rounded-xl px-3 py-2.5"
                    >
                      <Link href={`/lender/applications/${app.id}`}>
                        <span className="grid gap-0.5 text-left">
                          <span className="text-sm font-semibold">{context}</span>
                          <span className="text-xs text-muted-foreground">
                            {app.purpose ?? "No purpose stated"}
                          </span>
                        </span>
                        <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                      </Link>
                    </Button>
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
              Offers by status
            </p>
            {offers.length > 0 ? (
              <div className="flex flex-1 flex-col gap-2">
                {offersByStatus.pending > 0 ? (
                  <div className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2">
                    <span className="text-sm">Pending</span>
                    <span className="text-sm font-semibold">{offersByStatus.pending}</span>
                  </div>
                ) : null}
                {offersByStatus.accepted > 0 ? (
                  <div className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2">
                    <span className="text-sm">Accepted</span>
                    <span className="text-sm font-semibold">{offersByStatus.accepted}</span>
                  </div>
                ) : null}
                {offersByStatus.declined > 0 ? (
                  <div className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2">
                    <span className="text-sm">Declined</span>
                    <span className="text-sm font-semibold">{offersByStatus.declined}</span>
                  </div>
                ) : null}
                {offersByStatus.expired > 0 ? (
                  <div className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2">
                    <span className="text-sm">Expired</span>
                    <span className="text-sm font-semibold">{offersByStatus.expired}</span>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="flex flex-1 items-center">
                <p className="text-xs text-muted-foreground">No offers sent yet.</p>
              </div>
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
              <OfferCard key={offer.id} offer={offer} />
            ))}
          </div>
        ) : null,
      )}
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
