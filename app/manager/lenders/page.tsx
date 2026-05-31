import Link from "next/link";
import { Suspense } from "react";
import { getManagerAccess } from "../manager-access";
import { consentTypeLabels, type ConsentStatus } from "@/lib/consents";
import {
  getShortId,
  loadManagerLenders,
  type ManagerLenderRow,
} from "@/lib/manager-operations";
import {
  AccessDenied,
  EmptyState,
  FilterForm,
  ManagerShell,
  PersonLabel,
  SelectFilter,
  StatusBadge,
  StatusMessage,
  TextFilter,
  formatCurrency,
  formatDateTime,
} from "../manager-ui";
import { LenderToast } from "@/app/manager/lenders/lender-toast";
import { LenderDecisionForm } from "@/app/manager/lenders/lender-decision-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertCircleIcon,
  Building2Icon,
  BanknoteIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  ChevronLeftIcon,
  MessageSquareTextIcon,
  ShieldCheckIcon,
  XCircleIcon,
  CircleDotIcon,
} from "lucide-react";
import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";

type PageProps = {
  searchParams: Promise<{
    review?: string;
    status?: string;
    q?: string;
    selected?: string;
  }>;
};

export default async function ManagerLendersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const access = await getManagerAccess();

  if (!access.ok) {
    return (
      <ManagerShell
        title="Lender review"
        description="Review submitted lender applications before approving access."
      >
        <AccessDenied message={access.message} />
      </ManagerShell>
    );
  }

  if (params.selected) {
    const lenderResults = await loadManagerLenders(access.supabase, {
      verificationStatus: params.status,
    });

    const filteredResults = params.q
      ? lenderResults.lenders.filter((l) => {
          const q = params.q!.toLowerCase();
          return (
            l.organizationName.toLowerCase().includes(q) ||
            l.contactPerson.toLowerCase().includes(q) ||
            l.profile.displayName.toLowerCase().includes(q)
          );
        })
      : lenderResults.lenders;

    const selectedLender = filteredResults.find(
      (l) => l.id === params.selected,
    );

    const filterParams = new URLSearchParams();
    if (params.status) filterParams.set("status", params.status);
    if (params.q) filterParams.set("q", params.q);
    const filterQueryString = filterParams.toString();
    const backHref = filterQueryString
      ? `/manager/lenders?${filterQueryString}`
      : "/manager/lenders";

    return (
      <ManagerShell
        title="Lender review"
        description="Review submitted lender applications before approving access."
        showHeading={false}
      >
        <div className="space-y-4">
          <Suspense>
            <LenderToast />
          </Suspense>

          {!selectedLender ? (
            <div className="space-y-3">
              <StatusMessage
                message="Lender not found."
                tone="error"
              />
              <Button variant="outline" size="sm" asChild>
                <Link href={backHref}>
                  <ChevronLeftIcon className="size-4" />
                  Back to queue
                </Link>
              </Button>
            </div>
          ) : (
            <SelectedLenderDetail
              lender={selectedLender}
              backHref={backHref}
              selected={params.selected}
            />
          )}
        </div>
      </ManagerShell>
    );
  }

  const result = await loadManagerLenders(access.supabase, {
    verificationStatus: params.status,
  });

  const lenderResults = params.q
    ? result.lenders.filter((l) => {
        const q = params.q!.toLowerCase();
        return (
          l.organizationName.toLowerCase().includes(q) ||
          l.contactPerson.toLowerCase().includes(q) ||
          l.profile.displayName.toLowerCase().includes(q)
        );
      })
    : result.lenders;

  const incompleteCount = lenderResults.filter(
    (l) => l.verificationStatus === "incomplete",
  ).length;
  const pendingCount = lenderResults.filter(
    (l) => l.verificationStatus === "pending",
  ).length;
  const approvedCount = lenderResults.filter(
    (l) => l.verificationStatus === "approved",
  ).length;
  const rejectedCount = lenderResults.filter(
    (l) => l.verificationStatus === "rejected",
  ).length;

  return (
    <ManagerShell
      title="Lender review"
      description="Review submitted lender applications before approving access."
      showHeading={false}
    >
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Lender review
            </h1>
            <p className="text-sm text-muted-foreground">
              Review submitted lender applications before approving access.
            </p>
          </div>
          {lenderResults.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              {incompleteCount > 0 ? (
                <Badge variant="outline" className="gap-1">
                  <CircleDotIcon className="size-3" />
                  {incompleteCount} incomplete
                </Badge>
              ) : null}
              {pendingCount > 0 ? (
                <Badge variant="secondary" className="gap-1">
                  <CircleDotIcon className="size-3" />
                  {pendingCount} pending
                </Badge>
              ) : null}
              {approvedCount > 0 ? (
                <Badge
                  variant="default"
                  className="gap-1 border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50"
                >
                  <CheckCircle2Icon className="size-3" />
                  {approvedCount} approved
                </Badge>
              ) : null}
              {rejectedCount > 0 ? (
                <Badge variant="destructive" className="gap-1">
                  <XCircleIcon className="size-3" />
                  {rejectedCount} rejected
                </Badge>
              ) : null}
            </div>
          ) : null}
        </div>

        <Suspense>
          <LenderToast />
        </Suspense>

        {!result.ok ? (
          <StatusMessage message={result.message} tone="error" />
        ) : null}

        <LenderFilters status={params.status} q={params.q} />

        <section className="space-y-4">
          {lenderResults.length === 0 ? (
            <EmptyState
              title="No lenders found"
              description="Lender signup requests will appear here."
            />
          ) : (
            <LenderQueueTable
              lenders={lenderResults}
              filterQueryString={buildFilterQueryString(params)}
            />
          )}
        </section>
      </div>
    </ManagerShell>
  );
}

function buildFilterQueryString(params: {
  status?: string;
  q?: string;
}) {
  const filterParams = new URLSearchParams();
  if (params.status) filterParams.set("status", params.status);
  if (params.q) filterParams.set("q", params.q);
  return filterParams.toString();
}

function LenderFilters({
  status,
  q,
}: {
  status?: string;
  q?: string;
}) {
  const hasFilters = Boolean(status || q);

  return (
    <Card>
      <CardContent>
        <FilterForm className="flex flex-wrap items-end gap-3">
          <div className="min-w-[140px] flex-1">
            <SelectFilter
              label="Status"
              name="status"
              defaultValue={status}
              options={[
                { value: "incomplete", label: "Incomplete" },
                { value: "pending", label: "Pending" },
                { value: "approved", label: "Approved" },
                { value: "rejected", label: "Rejected" },
              ]}
            />
          </div>
          <div className="min-w-[140px] flex-1">
            <TextFilter label="Lender" name="q" defaultValue={q} />
          </div>
          <div className="flex items-end gap-2">
            <Button type="submit">Apply</Button>
            {hasFilters ? (
              <Button type="button" variant="outline" asChild>
                <Link href="?">Clear</Link>
              </Button>
            ) : null}
          </div>
        </FilterForm>
      </CardContent>
    </Card>
  );
}

function getDisclosureProgress(lender: ManagerLenderRow) {
  const acceptedCount = lender.consentStatus.required.filter((req) =>
    lender.consentStatus.accepted.some(
      (a) => a.consentType === req.consentType && a.version === req.version,
    ),
  ).length;
  const totalCount = lender.consentStatus.required.length;
  return { acceptedCount, totalCount };
}

function buildQueueHref(
  filterQueryString: string,
  lenderId: string,
) {
  const params = new URLSearchParams(filterQueryString);
  params.set("selected", lenderId);
  return `?${params.toString()}`;
}

function LenderQueueTable({
  lenders,
  filterQueryString,
}: {
  lenders: ManagerLenderRow[];
  filterQueryString: string;
}) {
  return (
    <>
      <div className="hidden sm:block">
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lender</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Disclosures</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lenders.map((lender) => (
                <LenderQueueRow
                  key={lender.id}
                  lender={lender}
                  filterQueryString={filterQueryString}
                />
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>

      <div className="space-y-3 sm:hidden">
        {lenders.map((lender) => (
          <LenderQueueMobileCard
            key={lender.id}
            lender={lender}
            filterQueryString={filterQueryString}
          />
        ))}
      </div>
    </>
  );
}

function LenderQueueRow({
  lender,
  filterQueryString,
}: {
  lender: ManagerLenderRow;
  filterQueryString: string;
}) {
  const { acceptedCount, totalCount } = getDisclosureProgress(lender);

  return (
    <TableRow>
      <TableCell>
        <PersonLabel person={{ id: lender.userId, displayName: lender.organizationName || lender.profile.displayName }} />
      </TableCell>
      <TableCell>
        <StatusBadge status={lender.verificationStatus} />
      </TableCell>
      <TableCell>
        {lender.consentStatus.isCurrent ? (
          <Badge
            variant="default"
            className="gap-1 border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50"
          >
            <CheckCircle2Icon className="size-3" />
            Complete
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">
            {acceptedCount}/{totalCount}
          </span>
        )}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {formatDateTime(lender.createdAt)}
      </TableCell>
      <TableCell className="text-right">
        <Button variant="outline" size="sm" asChild>
          <Link href={buildQueueHref(filterQueryString, lender.id)}>
            Review
          </Link>
        </Button>
      </TableCell>
    </TableRow>
  );
}

function LenderQueueMobileCard({
  lender,
  filterQueryString,
}: {
  lender: ManagerLenderRow;
  filterQueryString: string;
}) {
  const { acceptedCount, totalCount } = getDisclosureProgress(lender);

  return (
    <Card size="sm">
      <CardContent className="grid gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <PersonLabel person={{ id: lender.userId, displayName: lender.organizationName || lender.profile.displayName }} />
          </div>
          <StatusBadge status={lender.verificationStatus} />
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>
            Disclosures:{" "}
            {lender.consentStatus.isCurrent ? (
              <span className="font-medium text-emerald-700">Complete</span>
            ) : (
              <span className="font-medium text-muted-foreground">
                {acceptedCount}/{totalCount}
              </span>
            )}
          </span>
          <span>Created: {formatDateTime(lender.createdAt)}</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          asChild
        >
          <Link href={buildQueueHref(filterQueryString, lender.id)}>
            Review
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function SelectedLenderDetail({
  lender,
  backHref,
  selected,
}: {
  lender: ManagerLenderRow;
  backHref: string;
  selected: string;
}) {
  const hasAction =
    lender.verificationStatus === "pending" ||
    lender.verificationStatus === "rejected";

  const hasNotes = lender.rejectionReason || lender.managerReviewNotes;
  const missingFields = getMissingProfileFields(lender);

  const mainContent = (
    <div className="min-w-0 space-y-6">
      <LenderProfileSection lender={lender} />

      <LenderDetailsSection lender={lender} />

      <Collapsible defaultOpen={true}>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ShieldCheckIcon className="size-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">
                Disclosures &amp; consents
              </h3>
            </div>
            <CollapsibleTrigger className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              Show
              <ChevronDownIcon className="size-3 transition-transform [[data-state=open]_&]:rotate-180" />
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent>
            <DisclosureSection status={lender.consentStatus} />
          </CollapsibleContent>
        </div>
      </Collapsible>

      {hasNotes ? (
        <ExistingNotesSection
          rejectionReason={lender.rejectionReason}
          managerReviewNotes={lender.managerReviewNotes}
        />
      ) : null}

      {missingFields.length > 0 ? (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertDescription>
            <span className="font-medium">Missing profile details:</span>{" "}
            {missingFields.join(", ")}
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <Button
              variant="ghost"
              size="sm"
              className="mb-2 -ml-2 gap-1"
              asChild
            >
              <Link href={backHref}>
                <ChevronLeftIcon className="size-4" />
                Back to queue
              </Link>
            </Button>
            <CardTitle className="text-base">
              {lender.organizationName || lender.profile.displayName}
            </CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Lender ID: {getShortId(lender.userId)}
            </p>
          </div>
          <StatusBadge status={lender.verificationStatus} />
        </div>
        <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-4">
          <MetaField
            label="Organization"
            value={lender.organizationName || "Not provided"}
          />
          <MetaField
            label="Contact"
            value={lender.contactPerson || "Not provided"}
          />
          <MetaField
            label="Area"
            value={lender.operatingArea || "Not provided"}
          />
          <MetaField
            label="Created"
            value={formatDateTime(lender.createdAt)}
          />
          {lender.approvedAt ? (
            <MetaField
              label="Approved"
              value={`${formatDateTime(lender.approvedAt)}${lender.approvedBy ? ` by ${lender.approvedBy.displayName}` : ""}`}
            />
          ) : null}
          {lender.rejectedAt ? (
            <MetaField
              label="Rejected"
              value={`${formatDateTime(lender.rejectedAt)}${lender.rejectedBy ? ` by ${lender.rejectedBy.displayName}` : ""}`}
            />
          ) : null}
        </dl>
      </CardHeader>

      <CardContent>
        {hasAction ? (
          <div className="grid gap-6 lg:grid-cols-[1fr_300px] xl:grid-cols-[1fr_340px]">
            {mainContent}
            <div className="space-y-4 lg:sticky lg:top-16 lg:self-start lg:mt-7">
              <ManagerDecisionPanel
                lender={lender}
                selected={selected}
              />
            </div>
          </div>
        ) : (
          <div className="grid gap-6">{mainContent}</div>
        )}
      </CardContent>
    </Card>
  );
}

function MetaField({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-0.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-foreground">{value}</dd>
    </div>
  );
}

function getMissingProfileFields(lender: ManagerLenderRow): string[] {
  const fields: string[] = [];
  if (!lender.contactPerson) fields.push("contact");
  if (!lender.operatingArea) fields.push("area");
  if (lender.minLoanAmount === 0 && lender.maxLoanAmount === 0)
    fields.push("loan range");
  return fields;
}

function LenderProfileSection({ lender }: { lender: ManagerLenderRow }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Building2Icon className="size-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Profile summary</h3>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <MetaCard label="Contact person" value={lender.contactPerson} />
        <MetaCard label="Phone" value={lender.phoneNumber} />
        <MetaCard label="Business address" value={lender.businessAddress} />
        <MetaCard
          label="Registration number"
          value={lender.businessRegistrationNumber}
          fallback="Not provided"
        />
        <MetaCard label="Operating area" value={lender.operatingArea} />
      </div>
      {lender.lenderDescription ? (
        <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
          <p className="text-xs font-medium text-muted-foreground">
            Description
          </p>
          <p className="mt-1 text-sm">{lender.lenderDescription}</p>
        </div>
      ) : null}
    </div>
  );
}

function MetaCard({
  label,
  value,
  fallback = "\u2014",
}: {
  label: string;
  value: string | null;
  fallback?: string;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm font-medium break-words">
        {value || fallback}
      </dd>
    </div>
  );
}

function LenderDetailsSection({ lender }: { lender: ManagerLenderRow }) {
  const loanRange =
    lender.minLoanAmount === 0 && lender.maxLoanAmount === 0
      ? null
      : `${formatCurrency(lender.minLoanAmount)} \u2013 ${formatCurrency(lender.maxLoanAmount)}`;

  if (!loanRange && !lender.typicalRepaymentTerms) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <BanknoteIcon className="size-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Lending details</h3>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {loanRange ? (
          <MetaCard label="Loan range" value={loanRange} />
        ) : null}
        {lender.typicalRepaymentTerms ? (
          <MetaCard
            label="Repayment terms"
            value={lender.typicalRepaymentTerms}
          />
        ) : null}
      </div>
    </div>
  );
}

function DisclosureSection({ status }: { status: ConsentStatus }) {
  return (
    <div className="grid gap-3 sm:grid-cols-1">
      <DisclosureCard title="Lender disclosures" status={status} />
    </div>
  );
}

function DisclosureCard({
  title,
  status,
}: {
  title: string;
  status: ConsentStatus;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-sm font-medium">{title}</p>
        <Badge
          variant={status.isCurrent ? "default" : "destructive"}
          className={
            status.isCurrent
              ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50"
              : undefined
          }
        >
          {status.isCurrent ? "Current" : "Missing"}
        </Badge>
      </div>
      <div className="grid gap-1 text-xs text-muted-foreground">
        {status.required.map((consent) => {
          const accepted = status.accepted.find(
            (item) =>
              item.consentType === consent.consentType &&
              item.version === consent.version,
          );

          return (
            <div
              key={`${consent.consentType}-${consent.version}`}
              className="flex items-start gap-1.5"
            >
              {accepted ? (
                <CheckCircle2Icon className="mt-0.5 size-3 shrink-0 text-emerald-600" />
              ) : (
                <XCircleIcon className="mt-0.5 size-3 shrink-0 text-destructive" />
              )}
              <span>
                <span className="font-medium text-foreground">
                  {consentTypeLabels[consent.consentType]}
                </span>
                {accepted
                  ? ` \u00b7 ${consent.version}, ${formatDateTime(accepted.acceptedAt)}`
                  : " \u00b7 Missing current version"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ExistingNotesSection({
  rejectionReason,
  managerReviewNotes,
}: {
  rejectionReason: string | null;
  managerReviewNotes: string | null;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <MessageSquareTextIcon className="size-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Previous notes</h3>
      </div>
      <div className="grid gap-2">
        {rejectionReason ? (
          <Alert variant="destructive">
            <AlertCircleIcon />
            <AlertDescription>
              <span className="font-medium">Rejection reason:</span>{" "}
              {rejectionReason}
            </AlertDescription>
          </Alert>
        ) : null}
        {managerReviewNotes ? (
          <Alert>
            <MessageSquareTextIcon />
            <AlertDescription>
              <span className="font-medium">Manager note:</span>{" "}
              {managerReviewNotes}
            </AlertDescription>
          </Alert>
        ) : null}
      </div>
    </div>
  );
}

function ManagerDecisionPanel({
  lender,
  selected,
}: {
  lender: ManagerLenderRow;
  selected: string;
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-sm">Manager decision</CardTitle>
      </CardHeader>
      <CardContent>
        <LenderDecisionForm
          lenderId={lender.id}
          selected={selected}
          disclosuresCurrent={lender.consentStatus.isCurrent}
        />
      </CardContent>
    </Card>
  );
}
