"use client";

import { useState } from "react";
import {
  submitLenderProfileChangeRequest,
  cancelLenderProfileChangeRequest,
} from "@/app/lender/actions";
import { lenderProfileChangeRequestStatusLabels } from "@/lib/lender-verification";
import type { LenderProfileChangeRequestStatus } from "@/lib/lender-verification";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Edit3Icon,
  ChevronDownIcon,
  CheckCircle2Icon,
  XCircleIcon,
  ClockIcon,
  XIcon,
} from "lucide-react";
import { formatDateTime } from "@/lib/manager-date-format";

type LenderProfileChangeRequest = {
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
  status: LenderProfileChangeRequestStatus;
  submittedAt: string;
  reviewedAt: string | null;
  managerReviewNotes: string | null;
  rejectionReason: string | null;
};

type LenderProfileChangeRequestFormProps = {
  lenderProfileId: string;
  currentProfile: {
    organization_name: string | null;
    contact_person: string | null;
    business_address: string | null;
    operating_area: string | null;
    business_registration_number: string | null;
    min_loan_amount: number | null;
    max_loan_amount: number | null;
    typical_repayment_terms: string | null;
    lender_description: string | null;
  };
  changeRequests: LenderProfileChangeRequest[];
};

export function LenderProfileChangeRequestForm({
  lenderProfileId,
  currentProfile,
  changeRequests,
}: LenderProfileChangeRequestFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCancelling, setIsCancelling] = useState<string | null>(null);

  const pendingRequest = changeRequests.find((r) => r.status === "pending");

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true);
    setMessage("");

    const result = await submitLenderProfileChangeRequest(formData);
    setMessage(result.message);

    if (result.ok) {
      setIsOpen(false);
    }

    setIsSubmitting(false);
  }

  async function handleCancel(requestId: string) {
    setIsCancelling(requestId);
    setMessage("");

    const result = await cancelLenderProfileChangeRequest(requestId);
    setMessage(result.message);

    setIsCancelling(null);
  }

  return (
    <div className="grid gap-5">
      {changeRequests.length > 0 ? (
        <Card className="gap-2">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">
              Profile change requests
            </CardTitle>
            <CardDescription className="text-xs">
              Track your submitted profile change requests.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {changeRequests.map((request, index) => (
              <div key={request.id}>
                {index > 0 ? <Separator /> : null}
                <div className="grid gap-3 px-5 py-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <ChangeRequestStatusIcon status={request.status} />
                      <span className="text-sm font-medium">
                        {lenderProfileChangeRequestStatusLabels[request.status]}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(request.submittedAt)}
                      </span>
                      {request.status === "pending" ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1 text-xs text-destructive hover:text-destructive"
                          disabled={isCancelling === request.id}
                          onClick={() => handleCancel(request.id)}
                        >
                          <XIcon className="size-3" />
                          {isCancelling === request.id ? "Cancelling..." : "Cancel"}
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  {request.rejectionReason ? (
                    <Alert variant="destructive">
                      <AlertDescription className="text-xs">
                        <span className="font-medium">Rejection reason:</span>{" "}
                        {request.rejectionReason}
                      </AlertDescription>
                    </Alert>
                  ) : null}
                  {request.managerReviewNotes ? (
                    <Alert>
                      <AlertDescription className="text-xs">
                        <span className="font-medium">Manager note:</span>{" "}
                        {request.managerReviewNotes}
                      </AlertDescription>
                    </Alert>
                  ) : null}

                  <ChangeRequestDiff
                    currentProfile={currentProfile}
                    request={request}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {!pendingRequest ? (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full gap-2">
              <Edit3Icon className="size-4" />
              Request profile changes
              <ChevronDownIcon className="size-4 ml-auto transition-transform [[data-state=open]_&]:rotate-180" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <Card className="mt-3">
              <CardContent>
                <form action={handleSubmit} className="grid gap-4">
                  <p className="text-xs text-muted-foreground">
                    Only fill in fields you want to change. Leave empty to keep current values.
                  </p>

                  <div className="grid gap-1.5">
                    <Label htmlFor="cr-org" className="text-xs font-medium">
                      Organization name
                    </Label>
                    <Input
                      id="cr-org"
                      name="organizationName"
                      placeholder={currentProfile.organization_name ?? ""}
                      maxLength={160}
                    />
                  </div>

                  <div className="grid gap-1.5">
                    <Label htmlFor="cr-contact" className="text-xs font-medium">
                      Contact person
                    </Label>
                    <Input
                      id="cr-contact"
                      name="contactPerson"
                      placeholder={currentProfile.contact_person ?? ""}
                      maxLength={120}
                    />
                  </div>

                  <div className="grid gap-1.5">
                    <Label htmlFor="cr-address" className="text-xs font-medium">
                      Business address
                    </Label>
                    <Input
                      id="cr-address"
                      name="businessAddress"
                      placeholder={currentProfile.business_address ?? ""}
                      maxLength={240}
                    />
                  </div>

                  <div className="grid gap-1.5">
                    <Label htmlFor="cr-area" className="text-xs font-medium">
                      Operating area
                    </Label>
                    <Input
                      id="cr-area"
                      name="operatingArea"
                      placeholder={currentProfile.operating_area ?? ""}
                      maxLength={160}
                    />
                  </div>

                  <div className="grid gap-1.5">
                    <Label htmlFor="cr-reg" className="text-xs font-medium">
                      Business registration number
                    </Label>
                    <Input
                      id="cr-reg"
                      name="businessRegistrationNumber"
                      placeholder={currentProfile.business_registration_number ?? ""}
                      maxLength={80}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-1.5">
                      <Label htmlFor="cr-min" className="text-xs font-medium">
                        Min loan amount
                      </Label>
                      <Input
                        id="cr-min"
                        name="minLoanAmount"
                        type="number"
                        min={0}
                        step={100}
                        placeholder={currentProfile.min_loan_amount?.toString() ?? ""}
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="cr-max" className="text-xs font-medium">
                        Max loan amount
                      </Label>
                      <Input
                        id="cr-max"
                        name="maxLoanAmount"
                        type="number"
                        min={0}
                        step={100}
                        placeholder={currentProfile.max_loan_amount?.toString() ?? ""}
                      />
                    </div>
                  </div>

                  <div className="grid gap-1.5">
                    <Label htmlFor="cr-terms" className="text-xs font-medium">
                      Typical repayment terms
                    </Label>
                    <Input
                      id="cr-terms"
                      name="typicalRepaymentTerms"
                      placeholder={currentProfile.typical_repayment_terms ?? ""}
                      maxLength={240}
                    />
                  </div>

                  <div className="grid gap-1.5">
                    <Label htmlFor="cr-desc" className="text-xs font-medium">
                      Lender description
                    </Label>
                    <Textarea
                      id="cr-desc"
                      name="lenderDescription"
                      rows={3}
                      maxLength={800}
                      placeholder={currentProfile.lender_description ?? ""}
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full"
                  >
                    {isSubmitting ? "Submitting..." : "Submit change request"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>
      ) : (
        <div className="flex items-center gap-2 rounded-lg bg-amber-50/70 px-3.5 py-2.5 text-xs text-amber-700">
          <ClockIcon className="size-3.5 shrink-0" />
          You have a pending change request. Wait for manager review or cancel it to submit a new one.
        </div>
      )}

      {message ? (
        <p className="text-xs text-muted-foreground" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}

function ChangeRequestStatusIcon({
  status,
}: {
  status: LenderProfileChangeRequestStatus;
}) {
  switch (status) {
    case "approved":
      return <CheckCircle2Icon className="size-4 text-emerald-600" />;
    case "rejected":
      return <XCircleIcon className="size-4 text-destructive" />;
    case "cancelled":
      return <XCircleIcon className="size-4 text-muted-foreground" />;
    default:
      return <ClockIcon className="size-4 text-amber-600" />;
  }
}

function ChangeRequestDiff({
  currentProfile,
  request,
}: {
  currentProfile: LenderProfileChangeRequestFormProps["currentProfile"];
  request: LenderProfileChangeRequest;
}) {
  const fields = [
    {
      label: "Organization name",
      current: currentProfile.organization_name,
      proposed: request.proposedOrganizationName,
    },
    {
      label: "Contact person",
      current: currentProfile.contact_person,
      proposed: request.proposedContactPerson,
    },
    {
      label: "Business address",
      current: currentProfile.business_address,
      proposed: request.proposedBusinessAddress,
    },
    {
      label: "Operating area",
      current: currentProfile.operating_area,
      proposed: request.proposedOperatingArea,
    },
    {
      label: "Registration number",
      current: currentProfile.business_registration_number,
      proposed: request.proposedBusinessRegistrationNumber,
    },
    {
      label: "Min loan amount",
      current: currentProfile.min_loan_amount?.toString() ?? null,
      proposed: request.proposedMinLoanAmount?.toString() ?? null,
    },
    {
      label: "Max loan amount",
      current: currentProfile.max_loan_amount?.toString() ?? null,
      proposed: request.proposedMaxLoanAmount?.toString() ?? null,
    },
    {
      label: "Repayment terms",
      current: currentProfile.typical_repayment_terms,
      proposed: request.proposedTypicalRepaymentTerms,
    },
    {
      label: "Description",
      current: currentProfile.lender_description,
      proposed: request.proposedLenderDescription,
    },
  ];

  const changedFields = fields.filter(
    (f) => f.proposed !== null && f.proposed !== f.current,
  );

  if (changedFields.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Proposed changes
      </p>
      {changedFields.map((field) => (
        <div
          key={field.label}
          className="grid grid-cols-[1fr_1fr] gap-2 text-xs"
        >
          <div>
            <p className="text-muted-foreground">{field.label}</p>
            <p className="text-muted-foreground line-through">
              {field.current || "\u2014"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Proposed</p>
            <p className="font-medium text-foreground">{field.proposed}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
