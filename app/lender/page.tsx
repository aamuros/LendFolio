import Link from "next/link";
import { redirect } from "next/navigation";
import { signOutAction } from "@/app/login/actions";
import { LenderBottomTabs, LenderHeader } from "@/components/lender-bottom-tabs";
import {
  formatCurrency,
  formatDate,
  LenderApplicationsStatus,
} from "@/components/lender-applications-list";
import { requireApprovedLender } from "@/lib/access-control";
import {
  loadLenderOffers,
  loadOpenLenderApplications,
  type LenderApplicationReview,
  type LenderOfferReview,
} from "@/lib/lender-applications";

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
  const [applicationsResult, offersResult, access] = await Promise.all([
    loadOpenLenderApplications(),
    loadLenderOffers(),
    requireApprovedLender(),
  ]);

  if (!access.ok) {
    return (
      <main className="min-h-svh px-5 pt-4 pb-28 sm:px-8 sm:pt-6">
        <div className="mx-auto grid max-w-4xl gap-5">
          <LenderHeader showAccountLink={false} />
          <LenderApplicationsStatus message={access.message} tone="error" />
          <LenderBottomTabs activeTab={activeTab} />
        </div>
      </main>
    );
  }

  const {
    data: { user },
  } = await access.supabase.auth.getUser();
  const applications = applicationsResult.ok ? applicationsResult.applications : [];
  const offers = offersResult.ok ? offersResult.offers : [];

  return (
    <main className="min-h-svh px-5 pt-4 pb-28 sm:px-8 sm:pt-6">
      <div className="mx-auto grid max-w-4xl gap-5">
        <LenderHeader showAccountLink={activeTab !== "account"} />

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
  const nextAction =
    needsReviewCount > 0
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
      <div className="rounded-3xl border border-[var(--border)] bg-white px-5 py-5 shadow-sm">
        <div className="grid gap-3">
          <p className="text-sm font-semibold text-[var(--muted-foreground)]">
            Today
          </p>
          <h1 className="text-3xl leading-tight font-semibold">
            {nextAction.title}
          </h1>
          <p className="text-sm leading-6 text-[var(--muted-foreground)]">
            {nextAction.description}
          </p>
          <Link
            href={nextAction.href}
            className="mt-1 inline-flex h-11 items-center justify-center rounded-full bg-[var(--primary)] px-5 text-sm font-semibold !text-white transition hover:bg-[#0b5f59] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)]"
          >
            {nextAction.label}
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <SummaryCard label="New" value={needsReviewCount.toString()} />
        <SummaryCard label="Pending" value={pendingOffers.toString()} />
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
        <p className="text-sm leading-6 text-[var(--muted-foreground)]">
          Sent offers grouped by borrower response.
        </p>
      </div>

      {error ? <LenderApplicationsStatus message={error} tone="error" /> : null}

      {offers.length === 0 && !error ? (
        <div className="rounded-3xl border border-dashed border-[var(--border)] bg-white px-5 py-8 text-center shadow-sm">
          <h2 className="text-xl font-semibold">No sent offers</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
            Sent offers will appear here.
          </p>
        </div>
      ) : null}

      {groups.map((group) =>
        group.offers.length > 0 ? (
          <div key={group.label} className="grid gap-3">
            <h2 className="text-sm font-semibold text-[var(--muted-foreground)]">
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
      organization_name: string;
      verification_status: string;
    } | null;
  };
}) {
  return (
    <section className="grid gap-4">
      <div className="grid gap-1">
        <h1 className="text-2xl leading-tight font-semibold">Account</h1>
        <p className="break-words text-sm leading-6 text-[var(--muted-foreground)]">
          {email || "Signed in"}
        </p>
      </div>

      <div className="grid gap-3 rounded-3xl border border-[var(--border)] bg-white px-5 py-5 shadow-sm">
        <AccountRow label="Role" value={access.role} />
        <AccountRow label="Account status" value={access.status} />
        <AccountRow
          label="Organization"
          value={access.lenderProfile?.organization_name ?? "Not provided"}
        />
        <AccountRow
          label="Verification"
          value={access.lenderProfile?.verification_status ?? "Pending"}
        />
      </div>

      <form action={signOutAction}>
        <button
          type="submit"
          className="inline-flex h-11 items-center justify-center rounded-full border border-[var(--border)] bg-white px-5 text-sm font-semibold text-[var(--muted-foreground)] shadow-sm transition hover:border-[var(--primary)] hover:text-[var(--primary)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)]"
        >
          Sign out
        </button>
      </form>
    </section>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-white px-3 py-4 text-center shadow-sm">
      <p className="text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-xs font-semibold text-[var(--muted-foreground)]">
        {label}
      </p>
    </div>
  );
}

function OfferCard({ offer }: { offer: LenderOfferReview }) {
  const isQuiet = offer.status !== "pending";
  const activeLoan = offer.activeLoan;
  const context = offer.application?.portfolio
    ? `${offer.application.portfolio.businessTypeLabel} in ${offer.application.portfolio.location}`
    : "Application context unavailable";

  return (
    <article
      className={`rounded-3xl border border-[var(--border)] bg-white px-4 py-4 shadow-sm ${
        isQuiet ? "opacity-75" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="grid gap-1">
          <h3 className="font-semibold">{context}</h3>
          <p className="text-sm leading-6 text-[var(--muted-foreground)]">
            {offer.application?.purpose ?? "Offer sent"}
          </p>
        </div>
        <span className="rounded-full bg-[var(--muted)] px-3 py-1 text-xs font-semibold capitalize text-[var(--muted-foreground)]">
          {offer.status}
        </span>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
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
        <div className="mt-4 grid gap-3 border-t border-[var(--border)] pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-[var(--accent)]">
              Active loan
            </p>
            <span className="rounded-full bg-[#e1f5ee] px-3 py-1 text-xs font-semibold capitalize text-[#0f5f45]">
              {activeLoan.status}
            </span>
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
        </div>
      ) : null}
    </article>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-[var(--muted-foreground)]">
        {label}
      </dt>
      <dd className="mt-1 break-words font-semibold">{value}</dd>
    </div>
  );
}

function AccountRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[var(--border)] py-2 last:border-0">
      <p className="text-sm font-semibold text-[var(--muted-foreground)]">
        {label}
      </p>
      <p className="break-words text-right text-sm font-semibold capitalize">
        {value}
      </p>
    </div>
  );
}

function formatDateOnly(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
  }).format(new Date(`${value}T00:00:00`));
}
