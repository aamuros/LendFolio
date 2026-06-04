"use client";

import { useActionState, useState } from "react";
import {
  lenderOnboardingAction,
  type LenderOnboardingState,
} from "@/app/lender/onboarding/actions";
import type { LenderVerificationStatus } from "@/lib/supabase/types";
import { philippineOperatingAreas, typicalRepaymentTermOptions } from "@/lib/lender-onboarding";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const initialState: LenderOnboardingState = {
  message: "",
  status: "idle",
};

type LenderOnboardingFormProps = {
  verificationStatus: LenderVerificationStatus;
  rejectionReason: string | null;
  managerReviewNotes: string | null;
  defaultValues: {
    organizationName: string;
    contactPerson: string;
    phoneNumber: string;
    businessAddress: string;
    operatingArea: string;
    businessRegistrationNumber: string;
    minLoanAmount: string;
    maxLoanAmount: string;
    typicalRepaymentTerms: string;
    lenderDescription: string;
  };
};

export function LenderOnboardingForm({
  verificationStatus,
  rejectionReason,
  managerReviewNotes,
  defaultValues,
}: LenderOnboardingFormProps) {
  const [state, formAction, isPending] = useActionState(
    lenderOnboardingAction,
    initialState,
  );
  const isSuccess = state.status === "success";
  const isRejected = verificationStatus === "rejected";
  const [repaymentTerms, setRepaymentTerms] = useState(
    defaultValues.typicalRepaymentTerms,
  );
  const [operatingArea, setOperatingArea] = useState(
    defaultValues.operatingArea,
  );

  return (
    <Card className="rounded-2xl">
      <CardHeader className="text-center">
        <CardTitle className="text-xl">
          {isRejected ? "Update your lender profile" : "Complete your lender profile"}
        </CardTitle>
        <CardDescription>
          {isRejected
            ? "Review the manager notes, make changes, and resubmit for approval."
            : "Add your business details so a manager can review your lender access."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isRejected && (rejectionReason || managerReviewNotes) ? (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle />
            <AlertDescription>
              {rejectionReason ? (
                <>
                  <span className="font-medium">Rejection reason:</span>{" "}
                  {rejectionReason}
                </>
              ) : null}
              {rejectionReason && managerReviewNotes ? <br /> : null}
              {managerReviewNotes ? (
                <>
                  <span className="font-medium">Manager note:</span>{" "}
                  {managerReviewNotes}
                </>
              ) : null}
            </AlertDescription>
          </Alert>
        ) : null}

        <form action={formAction}>
          <FieldGroup className="gap-5">
            <fieldset className="grid gap-4">
              <legend className="text-sm font-semibold text-foreground">
                Organization details
              </legend>

              <Field>
                <FieldLabel htmlFor="organizationName">
                  Company / Organization name <span className="text-destructive">*</span>
                </FieldLabel>
                <Input
                  id="organizationName"
                  name="organizationName"
                  defaultValue={defaultValues.organizationName}
                  placeholder="Acme Lending Corp"
                  className="h-12 rounded-xl bg-background"
                  required
                />
                <FieldErrorHelper
                  messages={state.fieldErrors?.organizationName}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="contactPerson">Contact person <span className="text-destructive">*</span></FieldLabel>
                <Input
                  id="contactPerson"
                  name="contactPerson"
                  defaultValue={defaultValues.contactPerson}
                  placeholder="Juan dela Cruz"
                  autoComplete="name"
                  className="h-12 rounded-xl bg-background"
                  required
                />
                <FieldErrorHelper
                  messages={state.fieldErrors?.contactPerson}
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="phoneNumber">Phone number <span className="text-destructive">*</span></FieldLabel>
                  <Input
                    id="phoneNumber"
                    name="phoneNumber"
                    type="tel"
                    defaultValue={defaultValues.phoneNumber}
                    placeholder="+63 900 000 0000"
                    autoComplete="tel"
                    className="h-12 rounded-xl bg-background"
                    required
                  />
                  <FieldErrorHelper
                    messages={state.fieldErrors?.phoneNumber}
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="operatingArea">Operating area <span className="text-destructive">*</span></FieldLabel>
                  <input
                    type="hidden"
                    name="operatingArea"
                    value={operatingArea}
                  />
                  <Select
                    value={operatingArea}
                    onValueChange={setOperatingArea}
                  >
                    <SelectTrigger
                      id="operatingArea"
                      className="data-[size=default]:h-12 rounded-xl bg-background"
                    >
                      <SelectValue placeholder="Select operating area" />
                    </SelectTrigger>
                    <SelectContent>
                      {philippineOperatingAreas.map((area) => (
                        <SelectItem key={area} value={area}>
                          {area}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldErrorHelper
                    messages={state.fieldErrors?.operatingArea}
                  />
                </Field>
              </div>

              <Field>
                <FieldLabel htmlFor="businessAddress">
                  Business address <span className="text-destructive">*</span>
                </FieldLabel>
                <Input
                  id="businessAddress"
                  name="businessAddress"
                  defaultValue={defaultValues.businessAddress}
                  placeholder="123 Main St, Quezon City"
                  className="h-12 rounded-xl bg-background"
                  required
                />
                <FieldErrorHelper
                  messages={state.fieldErrors?.businessAddress}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="businessRegistrationNumber">
                  Business registration number
                </FieldLabel>
                <Input
                  id="businessRegistrationNumber"
                  name="businessRegistrationNumber"
                  defaultValue={defaultValues.businessRegistrationNumber}
                  placeholder="Optional"
                  className="h-12 rounded-xl bg-background"
                />
                <FieldDescription>
                  SEC, DTI, or CDA registration number if applicable.
                </FieldDescription>
                <FieldErrorHelper
                  messages={state.fieldErrors?.businessRegistrationNumber}
                />
              </Field>
            </fieldset>

            <fieldset className="grid gap-4">
              <legend className="text-sm font-semibold text-foreground">
                Lending details
              </legend>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="minLoanAmount">
                    Minimum loan amount (PHP) <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Input
                    id="minLoanAmount"
                    name="minLoanAmount"
                    type="number"
                    inputMode="decimal"
                    defaultValue={defaultValues.minLoanAmount}
                    placeholder="5000"
                    min="1"
                    step="1"
                    className="h-12 rounded-xl bg-background"
                    required
                  />
                  <FieldErrorHelper
                    messages={state.fieldErrors?.minLoanAmount}
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="maxLoanAmount">
                    Maximum loan amount (PHP) <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Input
                    id="maxLoanAmount"
                    name="maxLoanAmount"
                    type="number"
                    inputMode="decimal"
                    defaultValue={defaultValues.maxLoanAmount}
                    placeholder="50000"
                    min="1"
                    step="1"
                    className="h-12 rounded-xl bg-background"
                    required
                  />
                  <FieldErrorHelper
                    messages={state.fieldErrors?.maxLoanAmount}
                  />
                </Field>
              </div>

              <Field>
                <FieldLabel htmlFor="typicalRepaymentTerms">
                  Typical repayment terms <span className="text-destructive">*</span>
                </FieldLabel>
                <input
                  type="hidden"
                  name="typicalRepaymentTerms"
                  value={repaymentTerms}
                />
                <Select
                  value={repaymentTerms}
                  onValueChange={setRepaymentTerms}
                >
                  <SelectTrigger
                    id="typicalRepaymentTerms"
                    className="data-[size=default]:h-12 rounded-xl bg-background"
                  >
                    <SelectValue placeholder="Select typical repayment terms" />
                  </SelectTrigger>
                  <SelectContent>
                    {typicalRepaymentTermOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldErrorHelper
                  messages={state.fieldErrors?.typicalRepaymentTerms}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="lenderDescription">
                  Lender description <span className="text-destructive">*</span>
                </FieldLabel>
                <Textarea
                  id="lenderDescription"
                  name="lenderDescription"
                  defaultValue={defaultValues.lenderDescription}
                  placeholder="Describe your lending organization, focus areas, and approach to micro-business lending."
                  rows={4}
                  className="rounded-xl bg-background"
                  required
                />
                <FieldDescription>
                  At least 20 characters. This helps managers understand your lending focus.
                </FieldDescription>
                <FieldErrorHelper
                  messages={state.fieldErrors?.lenderDescription}
                />
              </Field>
            </fieldset>

            {!state.fieldErrors && state.message ? (
              <Alert variant={isSuccess ? "default" : "destructive"}>
                {isSuccess ? <CheckCircle2 /> : <AlertCircle />}
                <AlertDescription>{state.message}</AlertDescription>
              </Alert>
            ) : null}

            <fieldset className="grid gap-3">
              <legend className="text-sm font-semibold text-foreground">
                Required disclosures
              </legend>
              <div className="flex items-start gap-3">
                <Checkbox
                  id="lenderReviewConsentAccepted"
                  name="lenderReviewConsentAccepted"
                  className="mt-0.5"
                />
                <Label
                  htmlFor="lenderReviewConsentAccepted"
                  className="text-sm font-semibold leading-snug cursor-pointer"
                >
                  I accept the required lender-review disclosures for manager review.
                </Label>
              </div>
              <FieldErrorHelper
                messages={state.fieldErrors?.lenderReviewConsentAccepted}
              />
            </fieldset>

            <Field>
              <Button
                type="submit"
                disabled={isPending}
                className="h-12 w-full rounded-xl"
              >
                {isPending
                  ? "Submitting..."
                  : isRejected
                    ? "Resubmit for review"
                    : "Submit for review"}
              </Button>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}

function FieldErrorHelper({ messages }: { messages?: string[] }) {
  if (!messages?.length) {
    return null;
  }

  return <FieldError>{messages[0]}</FieldError>;
}
