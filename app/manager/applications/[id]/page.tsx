import { getManagerAccess } from "../../manager-access";
import {
  getShortId,
  loadManagerApplicationDetail,
  managerPreferredTermLabels,
} from "@/lib/manager-operations";
import {
  AccessDenied,
  DetailItem,
  DetailSection,
  EmptyState,
  ManagerDetailsLink,
  ManagerShell,
  PersonLabel,
  StatusBadge,
  formatCurrency,
  formatDateOnly,
  formatDateTime,
  BackLink,
} from "../../manager-ui";



type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ManagerApplicationDetailPage({
  params,
}: PageProps) {
  const { id } = await params;
  const access = await getManagerAccess();

  if (!access.ok) {
    return (
      <ManagerShell
        title="Application detail"
        description="Read-only application record."
        
      >
        <AccessDenied message={access.message} />
      </ManagerShell>
    );
  }

  const result = await loadManagerApplicationDetail(access.supabase, id);

  if (result.mode === "invalid-id") {
    return (
      <ManagerShell
        title="Invalid application link"
        description="This application link is not valid."
        
        showHeading={false}
      >
        <ManagerApplicationErrorState
          title="Invalid application link"
          message={`This application link is not valid. Received ID: ${id}. Return to applications and try again.`}
        />
      </ManagerShell>
    );
  }

  if (result.mode === "not-found") {
    return (
      <ManagerShell
        title="Application not found"
        description="This application record could not be found."
        
        showHeading={false}
      >
        <ManagerApplicationErrorState
          title="Application not found"
          message="This application record could not be found. Return to applications and try again."
        />
      </ManagerShell>
    );
  }

  if (result.mode === "supabase") {
    return (
      <ManagerShell
        title="Could not load application"
        description="This application record could not be loaded."
        
        showHeading={false}
      >
        <ManagerApplicationErrorState
          title="Could not load application"
          message={result.message}
        />
      </ManagerShell>
    );
  }

  if (!result.application) {
    return (
      <ManagerShell
        title="Could not load application"
        description="This application record could not be loaded."
        
        showHeading={false}
      >
        <ManagerApplicationErrorState
          title="Could not load application"
          message="This application record could not be loaded. Return to applications and try again."
        />
      </ManagerShell>
    );
  }

  const application = result.application;
  const acceptedOffer = application.offers.find(
    (offer) => offer.status === "accepted",
  );

  return (
    <ManagerShell
      title={`Application ${getShortId(application.id)}`}
      description="Read-only manager view of this application."
      
      showHeading={false}
    >
      <section className="grid gap-3">
        <BackLink href="/manager/applications" label="Back to applications" />

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-2xl leading-tight font-semibold">
              Application {getShortId(application.id)}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {application.borrower.displayName} ·{" "}
              {formatDateTime(application.submittedAt)}
            </p>
          </div>
          <StatusBadge status={application.status} />
        </div>
      </section>

      <section className="grid gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-2">
          <DetailSection title="Overview">
            <DetailItem label="Application ID" value={application.id} />
            <DetailItem
              label="Status"
              value={<StatusBadge status={application.status} />}
            />
            <DetailItem
              label="Submitted"
              value={formatDateTime(application.submittedAt)}
            />
            <DetailItem label="Purpose" value={application.purpose} />
          </DetailSection>

          <DetailSection title="Borrower">
            <DetailItem
              label="Borrower name"
              value={<PersonLabel person={application.borrower} />}
            />
            <DetailItem label="Borrower ID" value={application.borrower.id} />
          </DetailSection>

          <DetailSection title="Request">
            <DetailItem
              label="Requested amount"
              value={formatCurrency(application.requestedAmount)}
            />
            <DetailItem
              label="Preferred term"
              value={managerPreferredTermLabels[application.preferredTerm]}
            />
            <DetailItem label="Purpose" value={application.purpose} />
          </DetailSection>

          <DetailSection title="Offer activity">
            <DetailItem label="Pending offers" value={application.offerCounts.pending} />
            <DetailItem
              label="Accepted offers"
              value={application.offerCounts.accepted}
            />
            <DetailItem
              label="Declined offers"
              value={application.offerCounts.declined}
            />
            <DetailItem label="Expired offers" value={application.offerCounts.expired} />
          </DetailSection>

          <DetailSection title="Accepted offer">
            {acceptedOffer ? (
              <>
                <DetailItem label="Lender name" value={acceptedOffer.lender_name} />
                <DetailItem
                  label="Approved amount"
                  value={formatCurrency(acceptedOffer.approved_amount)}
                />
                <DetailItem
                  label="Interest/service charge"
                  value={formatCurrency(
                    Math.max(
                      0,
                      acceptedOffer.repayment_amount -
                        acceptedOffer.approved_amount -
                        acceptedOffer.fees -
                        (acceptedOffer.processing_fee_amount ?? 0),
                    ),
                  )}
                />
                <DetailItem
                  label="Fees"
                  value={formatCurrency(acceptedOffer.fees)}
                />
                <DetailItem
                  label="System processing fee"
                  value={formatCurrency(acceptedOffer.processing_fee_amount ?? 0)}
                />
                <DetailItem
                  label="Total repayment"
                  value={formatCurrency(acceptedOffer.repayment_amount)}
                />
                <DetailItem
                  label="Due date"
                  value={formatDateOnly(acceptedOffer.due_date)}
                />
              </>
            ) : (
              <DetailItem label="Accepted offer" value="None" />
            )}
          </DetailSection>

          <DetailSection title="Active loan">
            {application.activeLoan ? (
              <>
                <DetailItem
                  label="Loan"
                  value={`Loan ${getShortId(application.activeLoan.id)}`}
                />
                <DetailItem
                  label="Principal"
                  value={formatCurrency(application.activeLoan.principalAmount)}
                />
                <DetailItem
                  label="Due date"
                  value={formatDateOnly(application.activeLoan.dueDate)}
                />
                <DetailItem
                  label="Status"
                  value={<StatusBadge status={application.activeLoan.status} />}
                />
                <DetailItem
                  label="Details"
                  value={
                    <ManagerDetailsLink
                      href={`/manager/loans/${application.activeLoan.id}`}
                    />
                  }
                />
              </>
            ) : (
              <DetailItem label="Active loan" value="No active loan" />
            )}
          </DetailSection>
        </div>

        <section className="grid gap-3">
          <h2 className="text-sm font-semibold">Offers</h2>
          {application.offers.length === 0 ? (
            <EmptyState
              title="No offers found"
              description="Offers for this application will appear here."
            />
          ) : (
            <div className="grid gap-2">
              {application.offers.map((offer) => (
                <article
                  key={offer.id}
                  className="grid gap-2 rounded-xl border border-border/60 bg-muted/20 px-3 py-2 sm:grid-cols-[minmax(0,1.3fr)_0.9fr_0.9fr_0.9fr_0.7fr] sm:items-center sm:gap-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {offer.lender_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Offer {getShortId(offer.id)}
                    </p>
                  </div>
                  <p className="text-sm">{formatCurrency(offer.approved_amount)}</p>
                  <p className="text-sm">
                    {formatCurrency(offer.repayment_amount)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatDateOnly(offer.due_date)}
                  </p>
                  <StatusBadge status={offer.status} />
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </ManagerShell>
  );
}

function ManagerApplicationErrorState({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <section
      className="grid gap-3 rounded-3xl border border-border bg-card px-5 py-5 shadow-sm"
      role="alert"
    >
      <BackLink href="/manager/applications" label="Back to applications" />
      <div className="grid gap-1">
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="text-sm leading-6 text-muted-foreground">
          {message}
        </p>
      </div>
    </section>
  );
}
